/* seasons.js - BOARD 777a, THE SEASON SHOWS, AND LEAVES FALL (Wings for Rouge). Trunks, Nov 11 2026. Wired by tools/wiring/wire-777a-seasons.js; guard tests/seasons777.js.
   Marth, verbatim, with a clip of a painted autumn wood: "Okay make the game like this"; "I want it to feel like the last clip i just sent you. Falling leaves, attention to season."
   WHAT IS HERE, on the home island, in the Standard look only:
     THE SEASON  the real calendar, northern (Sep-Nov autumn, Dec-Feb winter, Mar-May spring, Jun-Aug summer). localStorage 'wfr.season' = 'summer' | 'autumn' | 'winter' | 'spring'
                 overrides it; 'off' is the game before this unit. AUTUMN is built. Summer is the game's own look. Winter and spring are NOT built yet: they show the game's own look.
     THE CROWNS  each oak and birch its own shade of gold, amber, orange or rust, a few still green, picked by a hash of where the tree stands (the same tree, the same colour, every visit);
                 the big tree at the nest goes amber; the bushes, the ferns, the grass blades and the green of the meadow lean toward gold. Pines and firs stay green.
     THE LEAVES  one mesh of small leaf cards let go from the broadleaf crowns near her, swaying and tumbling down, carried a little by the wind, lying a few seconds, then gone.
     THE LITTER  one mesh of fallen leaves lying under every broadleaf tree, on the island's own ground, never on water nor in a house.
     THE LIGHT   by day the sun, the sky fill and the ground bounce lean warm (the sky clock's own colours, tinted; no new light; night stays night).
   HOW THE CROWNS ARE RECOLOURED: at run time, after trees.js has planted. The forest is one InstancedMesh per species ('trees:oak', 'trees:birch', 'trees:bush', 'trees:fern'), and each
     tree's colour is one entry of that mesh's instanceColor. This file rewrites those entries (and keeps the old ones, to put them back). trees.js and world-vegetation.js are not touched.
   BORROWED: nothing. The leaf is drawn on a 64 px canvas, the way the game's own glowTex draws the sun. THE GAME'S OWN: three.js r128, the forest, H(), the sky clock.
   COST: ONE shader program (both meshes share one material), in the scene from load; two draw calls; no object made while playing; no light, no shadow, no blending.
   A fault in here switches the unit off and puts the crowns back; it never stops the game. Every number a DRAFT. */
window.WFR_SEASONS = (function () {
  'use strict';
  /* N: leaves in the air or lying at once. R: let go from crowns within this of the camera (m). RATE: leaves a second in clear weather with FULL or more trees near. RAIN: the share fewer in rain.
     FALL: m/s. SWAY: m/s sideways. SIZE: m. LIE, FADE: seconds on the ground, then shrinking away. CLOSE: the share let go just ahead of the camera, when a broadleaf is within CLOSE_R.
     PER: litter cards per square metre of crown radius squared; LIT: least and most per tree. FAR: the litter shrinks away between these distances (m). LIFT: above the ground (m).
     NIGHT: the cards' light at night, as a share of day. GAIN: their light by day. GREEN: the share of broadleaves still green. The last row: the warm lean of the sun, sky fill and ground bounce by day. */
  var C = { N: 420, R: 40, RATE: 30, FULL: 6, RAIN: 0.5, FALL: [0.9, 1.7], SWAY: [0.35, 1.1], SIZE: [0.3, 0.5], LIE: 5, FADE: 1.6, CLOSE: 0.16, CLOSE_R: 18,
    PER: 0.55, LIT: [8, 72], LSIZE: [0.34, 0.62], FAR: [90, 135], LIFT: 0.08, NIGHT: 0.3, GAIN: 0.9, GREEN: 0.1, WIND: [0.8, 0.6], DRIFT: 0.35, GUST: 1.6,
    SUN: 0xffc27a, SUNK: 0.5, SKY: 0xffdfae, SKYK: 0.45, GND: 0x8a6a30, GNDK: 0.5 };
  /* THE PALETTES (sRGB): gold, amber, orange, rust for the oaks; the birches go yellow. KEPT: the leaf a still-green tree drops. */
  var PAL = { oak: [0xe3b63a, 0xe8c04a, 0xd9a02f, 0xd8892c, 0xdb7a2a, 0xd0642e, 0xc4552c, 0xb8452e, 0xa8402a], birch: [0xe6c444, 0xf0d15a, 0xd9b23a, 0xe3b63a, 0xdba832], big: 0xd9952e,
    kept: 0xa9ad3c, bush: 0xc9a23a, fern: 0xb8963a, brown: 0x8a5a2a, grass: [1.25, 1.02, 0.7], meadow: [0.3, 0.24] };
  var TAU = Math.PI * 2, ST = 14, TS = 8;
  var X = null, fault = null, why = null, held = false, name = null;
  var stat = { born: 0, landed: 0, wet: 0, full: 0, ticks: 0, tickMs: 0, tickMax: 0, lights: 0, day: 0, buildMs: 0, cuts: 0 };
  var seed = 777;
  function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function rng(a, b) { return a + (b - a) * rnd(); }
  function hash(x, z, k) { var s = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }
  function pick(a, u) { return a[Math.min(a.length - 1, Math.floor(u * a.length))]; }

  /* ---------- THE SEASON ---------- */
  function ofMonth(m) { return m >= 8 && m <= 10 ? 'autumn' : (m === 11 || m <= 1) ? 'winter' : m <= 4 ? 'spring' : 'summer'; }   /* m: 0 January .. 11 December */
  function season() {
    var v = null; try { v = localStorage.getItem('wfr.season'); } catch (e) { v = null; }
    if (v === 'off' || v === 'summer' || v === 'autumn' || v === 'winter' || v === 'spring') return v;
    return ofMonth(new Date().getMonth());
  }
  function leavesIn(s) { return s === 'autumn'; }   /* the one question every part asks: does this season shed? (winter and spring: a later unit) */

  /* ---------- THE LEAF: drawn once, the game's own canvas-texture way ---------- */
  function leafTex(THREE) {
    var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), i;
    g.translate(32, 33);
    g.beginPath(); g.moveTo(0, -30); g.bezierCurveTo(21, -17, 23, 10, 0, 24); g.bezierCurveTo(-23, 10, -21, -17, 0, -30); g.closePath();
    var gr = g.createLinearGradient(-20, 0, 20, 0); gr.addColorStop(0, '#d6cec0'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#ebe5d8');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(96,60,28,0.6)'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 30); g.stroke();
    g.lineWidth = 1.1; for (i = -2; i <= 2; i++) { var y = i * 8, w = 13 - Math.abs(i) * 2.5; g.beginPath(); g.moveTo(0, y + 4); g.lineTo(w, y - 4); g.moveTo(0, y + 4); g.lineTo(-w, y - 4); g.stroke(); }
    return new THREE.CanvasTexture(c);
  }

  /* ---------- THE ONE PROGRAM: a flat card, turned three ways, lit by one colour; no blending (a card leaves by shrinking) ---------- */
  var VS = 'attribute vec4 iA;attribute vec4 iB;attribute vec3 iC;uniform vec3 uLight;uniform vec2 uFade;varying vec2 vUv;varying vec3 vC;\n' +
    'void main(){vec3 p=position*iA.w*(1.-smoothstep(uFade.x,uFade.y,distance(cameraPosition,iA.xyz)));\n' +
    'float cx=cos(iB.x),sx=sin(iB.x),cy=cos(iB.y),sy=sin(iB.y),cz=cos(iB.z),sz=sin(iB.z);\n' +
    'p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);p=vec3(p.x*cz-p.y*sz,p.x*sz+p.y*cz,p.z);\n' +
    'vC=iC*uLight*(.72+.28*abs(cx*cz))*iB.w;vUv=uv;gl_Position=projectionMatrix*viewMatrix*vec4(iA.xyz+p,1.);}';
  var FS = 'uniform sampler2D uMap;varying vec2 vUv;varying vec3 vC;\nvoid main(){vec4 t=texture2D(uMap,vUv);if(t.a<.4)discard;gl_FragColor=vec4(t.rgb*vC,1.);}';

  function find(scene, n) { for (var i = 0; i < scene.children.length; i++) if (scene.children[i].name === n) return scene.children[i]; return null; }
  function cards(THREE, base, n, dyn) {
    var g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', base.p); g.setAttribute('uv', base.u); g.setIndex(base.i);
    var A = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4), B = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4), K = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    if (dyn) { A.setUsage(THREE.DynamicDrawUsage); B.setUsage(THREE.DynamicDrawUsage); K.setUsage(THREE.DynamicDrawUsage); }
    g.setAttribute('iA', A); g.setAttribute('iB', B); g.setAttribute('iC', K); g.instanceCount = n; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    return { g: g, A: A, B: B, K: K };
  }

  /* ---------- CREATE: the season read, the crowns turned, the litter laid, the two meshes in the scene (so the one program compiles at load) ---------- */
  function create(io) {
    if (X || fault) return X;
    name = season(); if (!leavesIn(name)) { why = name === 'off' ? 'off' : 'no leaves fall in ' + name; return null; }
    try { var t0 = performance.now(); X = build(io); stat.buildMs = +(performance.now() - t0).toFixed(1); } catch (e) { fail('create', e); }
    return X;
  }
  function build(io) {
    var THREE = io.THREE, scene = io.scene, lin = !!(io.renderer && io.renderer.outputEncoding === THREE.sRGBEncoding), col = new THREE.Color(), c2 = new THREE.Color(), i, j, k;
    var Z = { on: true, THREE: THREE, cam: io.camera, H: io.H, water: io.water, night: io.night || null, rain: io.rain || null, inside: io.inside || null, classic: io.classic || null, away: io.away || null,
      undo: [], cSun: new THREE.Color(C.SUN), cSky: new THREE.Color(C.SKY), cGnd: new THREE.Color(C.GND), dir: new THREE.Vector3() };
    /* the broadleaves, read from the forest's own instances: x, crown middle y, z, crown radius, its leaf colour (r, g, b), the crown's height as a share of its radius */
    var list = [], src = [], kinds = { oak: 0, birch: 0, big: 0 };
    [['oak', 2.9, 5.0, 0.9, PAL.oak], ['birch', 1.5, 5.0, 2.2, PAL.birch]].forEach(function (sp) {
      var m = find(scene, 'trees:' + sp[0]); if (!m || !m.instanceColor) return;
      var e = m.instanceMatrix.array, a = m.instanceColor.array; Z.undo.push({ a: m.instanceColor, old: a.slice() }); if (!Z.oak) Z.oak = m;
      for (i = 0; i < m.count; i++) {
        var o = i * 16, x = e[o + 12], y = e[o + 13], z = e[o + 14], sx = Math.sqrt(e[o] * e[o] + e[o + 1] * e[o + 1] + e[o + 2] * e[o + 2]), sy = Math.sqrt(e[o + 4] * e[o + 4] + e[o + 5] * e[o + 5] + e[o + 6] * e[o + 6]);
        var keep = hash(x, z, 1) < C.GREEN;
        if (keep) col.setHex(PAL.kept); else { col.setHex(pick(sp[4], hash(x, z, 2))).multiplyScalar(0.9 + 0.2 * hash(x, z, 3)); c2.copy(col); if (lin) c2.convertSRGBToLinear(); a[i * 3] = c2.r; a[i * 3 + 1] = c2.g; a[i * 3 + 2] = c2.b; }
        list.push([x, y + sp[2] * sy, z, sp[1] * sx, col.r, col.g, col.b, sp[3]]); src.push([m.instanceMatrix, o]); kinds[sp[0]]++;
      }
      m.instanceColor.needsUpdate = true;
    });
    /* the bushes and the ferns lean toward gold, each by its own share */
    [['bush', PAL.bush, 0.3, 0.3], ['fern', PAL.fern, 0.25, 0.25]].forEach(function (sp) {
      var m = find(scene, 'trees:' + sp[0]); if (!m || !m.instanceColor) return;
      var e = m.instanceMatrix.array, a = m.instanceColor.array; Z.undo.push({ a: m.instanceColor, old: a.slice() }); c2.setHex(sp[1]);
      for (i = 0; i < m.count; i++) { col.fromArray(a, i * 3); if (lin) col.convertLinearToSRGB(); col.lerp(c2, sp[2] + sp[3] * hash(e[i * 16 + 12], e[i * 16 + 14], 4)); if (lin) col.convertSRGBToLinear(); col.toArray(a, i * 3); }
      m.instanceColor.needsUpdate = true;
    });
    /* the big tree at the nest: its crown is one colour on its own material */
    var big = find(scene, 'bigTree');
    if (big) for (i = 0; i < big.children.length; i++) {
      var bm = big.children[i].material; if (!bm || !bm.color || !bm.vertexColors || !(bm.color.g > bm.color.r && bm.color.g > bm.color.b)) continue;
      Z.mats = [{ c: bm.color, old: bm.color.clone() }]; col.setHex(PAL.big); c2.copy(col); if (lin) c2.convertSRGBToLinear(); bm.color.copy(c2);
      list.push([big.position.x, big.position.y + 13.2 * big.scale.y, big.position.z, 7 * big.scale.x, col.r, col.g, col.b, 0.6]); src.push([null, 0]); kinds.big++; break;
    }
    Z.mats = Z.mats || [];
    /* the island's grass blades (world-vegetation.js keeps the island's field on its own material): warmed by that material's colour */
    var gr = scene.getObjectByName('veg:grass:island');
    if (gr && gr.material && gr.material.color) { Z.mats.push({ c: gr.material.color, old: gr.material.color.clone() }); gr.material.color.setRGB(gr.material.color.r * PAL.grass[0], gr.material.color.g * PAL.grass[1], gr.material.color.b * PAL.grass[2]); }
    /* the meadow itself: the island's ground carries its colours on its corners; only the green ones (never sand, rock or snow) lean toward gold, by how green they are */
    var gm = null; for (i = 0; i < scene.children.length; i++) if (scene.children[i].userData && scene.children[i].userData.ground) { gm = scene.children[i]; break; }
    var gc = gm && gm.geometry && gm.geometry.attributes.color;
    if (gc) { var ga = gc.array, gs = gc.itemSize; Z.undo.push({ a: gc, old: ga.slice() }); for (i = 0; i < gc.count; i++) { var r0 = ga[i * gs], g0 = ga[i * gs + 1], b0 = ga[i * gs + 2], gk = g0 > 0 ? Math.max(0, Math.min(1, (g0 - Math.max(r0, b0)) / g0 * 3)) : 0; ga[i * gs] = r0 * (1 + PAL.meadow[0] * gk); ga[i * gs + 2] = b0 * (1 - PAL.meadow[1] * gk); } gc.needsUpdate = true; Z.meadow = gc.count; }
    var nT = list.length, T = new Float32Array(Math.max(1, nT) * TS); for (i = 0; i < nT; i++) T.set(list[i], i * TS);
    Z.T = T; Z.nT = nT; Z.kinds = kinds; Z.NEAR = new Int16Array(Math.max(1, nT)); Z.nNear = 0; Z.nearT = 0; Z.closeI = -1; Z.closeD = 1e9;
    Z.srcA = src.map(function (q) { return q[0]; }); Z.srcO = new Int32Array(Math.max(1, nT)); for (i = 0; i < nT; i++) Z.srcO[i] = src[i][1];   /* each tree's own crown in the forest's instances: a tree the village cut has its crown scaled to nothing */
    Z.l0 = new Int32Array(Math.max(1, nT)); Z.ln = new Int32Array(Math.max(1, nT)); Z.cut = new Uint8Array(Math.max(1, nT));
    /* the houses: no leaf is let go over one, no litter lies in one (their own footprints, a little wide) */
    var hs = io.houses || [], HS = io.HS || 1.6, HC = new Float32Array(Math.max(1, hs.length) * 3), nH = 0;
    for (i = 0; i < hs.length; i++) { var h = hs[i]; if (!h || typeof h.x !== 'number' || typeof h.z !== 'number') continue; var hr = Math.sqrt((h.w || 6) * (h.w || 6) + (h.d || 6) * (h.d || 6)) / 2 * HS + 2.5; HC[nH * 3] = h.x; HC[nH * 3 + 1] = h.z; HC[nH * 3 + 2] = hr * hr; nH++; }
    Z.HC = HC; Z.nH = nH;
    /* the one material, the two meshes */
    var base = { p: new THREE.BufferAttribute(new Float32Array([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5]), 3), u: new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2), i: new THREE.BufferAttribute(new Uint16Array([0, 2, 1, 0, 3, 2]), 1) };
    Z.U = { uMap: { value: leafTex(THREE) }, uLight: { value: new THREE.Vector3(C.GAIN, C.GAIN, C.GAIN) }, uFade: { value: new THREE.Vector2(C.FAR[0], C.FAR[1]) } };
    var mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: Z.U, side: THREE.DoubleSide, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); mat.name = 'seasons777';
    /* the litter: laid once, from each tree's own hash */
    var lit = [], H = io.H, water = io.water;
    for (i = 0; i < nT; i++) {
      var tx = T[i * TS], tz = T[i * TS + 2], tr = T[i * TS + 3], n = Math.max(C.LIT[0], Math.min(C.LIT[1], Math.round(tr * tr * C.PER)));
      Z.l0[i] = lit.length;
      for (j = 0; j < n; j++) {
        var a2 = hash(tx + j * 1.37, tz - j * 2.11, 5) * TAU, rad = tr * 1.3 * Math.sqrt(hash(tx - j * 0.73, tz + j * 1.91, 6)), lx = tx + Math.cos(a2) * rad, lz = tz + Math.sin(a2) * rad, gy = H(lx, lz), inH = false;
        if (!(gy > water + 0.35)) continue;
        for (k = 0; k < nH; k++) { var hx = lx - HC[k * 3], hz = lz - HC[k * 3 + 1]; if (hx * hx + hz * hz < HC[k * 3 + 2]) { inH = true; break; } }
        if (inH) continue;
        var nx = H(lx - 0.5, lz) - H(lx + 0.5, lz), nz = H(lx, lz - 0.5) - H(lx, lz + 0.5), u1 = hash(lx, lz, 7), u2 = hash(lx, lz, 8), u3 = hash(lx, lz, 9);
        col.setRGB(T[i * TS + 4], T[i * TS + 5], T[i * TS + 6]).lerp(c2.setHex(PAL.brown), u1 * 0.55).multiplyScalar(0.8 + 0.3 * u2);
        lit.push([lx, gy + C.LIFT, lz, C.LSIZE[0] + (C.LSIZE[1] - C.LSIZE[0]) * u3, Math.atan2(nz, 1) + (u2 - 0.5) * 0.3, u1 * TAU, -Math.atan2(nx, 1) + (u3 - 0.5) * 0.3, 0.86, col.r, col.g, col.b]);
      }
      Z.ln[i] = lit.length - Z.l0[i];
    }
    var L = cards(THREE, base, Math.max(1, lit.length), false);
    for (i = 0; i < lit.length; i++) { var q = lit[i]; L.A.setXYZW(i, q[0], q[1], q[2], q[3]); L.B.setXYZW(i, q[4], q[5], q[6], q[7]); L.K.setXYZ(i, q[8], q[9], q[10]); }
    L.g.instanceCount = lit.length; Z.nLit = lit.length; Z.LS = new Float32Array(Math.max(1, lit.length)); for (i = 0; i < lit.length; i++) Z.LS[i] = lit[i][3];
    var F = cards(THREE, base, C.N, true);
    Z.P = new Float32Array(C.N * ST); Z.F = F; Z.cur = 0; Z.acc = 0; Z.serial = 0; Z.clock = 0; Z.frame = 0;
    var grp = new THREE.Group(); grp.name = 'seasons777';
    Z.lit = new THREE.Mesh(L.g, mat); Z.lit.name = 'seasons777:litter'; Z.fall = new THREE.Mesh(F.g, mat); Z.fall.name = 'seasons777:leaves';
    [Z.lit, Z.fall].forEach(function (m) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.matrixAutoUpdate = false; grp.add(m); });
    scene.add(grp); Z.grp = grp; Z.Lg = L;
    return Z;
  }

  /* ---------- OFF: everything put back (a fault, or the Classic look switched on) ---------- */
  function off(w) {
    why = w || why; if (!X) return; X.on = false;
    try { X.grp.visible = false; for (var i = 0; i < X.undo.length; i++) { X.undo[i].a.array.set(X.undo[i].old); X.undo[i].a.needsUpdate = true; } for (i = 0; i < X.mats.length; i++) X.mats[i].c.copy(X.mats[i].old); } catch (e) { /* what could be put back, was */ }
  }
  function fail(where, e) { fault = where + ': ' + (e && e.message || e); try { console.warn('[seasons777] switched off, ' + fault); } catch (e2) { /* no console */ } off('fault'); }

  /* a tree cut (or grown back): its litter goes (or returns) with its crown */
  function litterOf(i, on) { X.cut[i] = on ? 0 : 1; var A = X.Lg.A, a = A.array, k; for (k = X.l0[i]; k < X.l0[i] + X.ln[i]; k++) a[k * 4 + 3] = on ? X.LS[k] : 0; A.needsUpdate = true; stat.cuts += on ? -1 : 1; }

  /* ---------- ONE LEAF LET GO. a slot's numbers: 0 x 1 y 2 z 3 fall 4 phase 5 sway 6 sway rate 7 the ground under it 8 state (0 none, 1 falling, 2 lying) 9 seconds in that state 10 size 11 tumble 12 roll 13 its number ---------- */
  function letGo() {
    var P = X.P, T = X.T, cam = X.cam.position, k, q, x, y, z, ti;
    for (k = 0; k < C.N; k++) { X.cur = (X.cur + 1) % C.N; if (!P[X.cur * ST + 8]) break; }
    if (k === C.N) { stat.full++; return; }
    if (X.closeI >= 0 && X.closeD < C.CLOSE_R && rnd() < C.CLOSE) {   /* one that passes close: just ahead of the camera, a little above it */
      ti = X.closeI; var d = X.cam.getWorldDirection(X.dir), f = rng(3, 9), s = rng(-3.5, 3.5); x = cam.x + d.x * f - d.z * s; z = cam.z + d.z * f + d.x * s; y = cam.y + rng(2.5, 6.5);
    } else {
      ti = X.NEAR[Math.floor(rnd() * X.nNear)]; var tj = X.NEAR[Math.floor(rnd() * X.nNear)], ax = T[ti * TS] - cam.x, az = T[ti * TS + 2] - cam.z, bx = T[tj * TS] - cam.x, bz = T[tj * TS + 2] - cam.z; if (bx * bx + bz * bz < ax * ax + az * az) ti = tj;   /* of two near trees, the nearer: more of the fall is where she can see it */
      var r = T[ti * TS + 3], a = rnd() * TAU, rad = r * (0.5 + 0.5 * Math.sqrt(rnd()));
      x = T[ti * TS] + Math.cos(a) * rad; z = T[ti * TS + 2] + Math.sin(a) * rad; y = T[ti * TS + 1] + (rnd() - 0.5) * r * T[ti * TS + 7];
    }
    for (k = 0; k < X.nH; k++) { var hx = x - X.HC[k * 3], hz = z - X.HC[k * 3 + 1]; if (hx * hx + hz * hz < X.HC[k * 3 + 2]) return; }
    var g = X.H(x, z); if (!(y > Math.max(g, X.water) + 0.6)) return;
    q = X.cur * ST; P[q] = x; P[q + 1] = y; P[q + 2] = z; P[q + 3] = rng(C.FALL[0], C.FALL[1]); P[q + 4] = rnd() * TAU; P[q + 5] = rng(C.SWAY[0], C.SWAY[1]); P[q + 6] = rng(1.3, 2.6); P[q + 7] = g; P[q + 8] = 1; P[q + 9] = 0;
    P[q + 10] = rng(C.SIZE[0], C.SIZE[1]); var tum = rnd() < 0.4; P[q + 11] = tum ? rng(-3.5, 3.5) : 0; P[q + 12] = tum ? rng(-2, 2) : 0; P[q + 13] = ++X.serial;
    var m = rng(0.82, 1.14), K = X.F.K.array, B = X.F.B.array, w = X.cur * 3; K[w] = T[ti * TS + 4] * m; K[w + 1] = T[ti * TS + 5] * m; K[w + 2] = T[ti * TS + 6] * m; X.F.K.needsUpdate = true;
    B[X.cur * 4 + 1] = rnd() * TAU; B[X.cur * 4 + 3] = rng(0.9, 1.08); stat.born++;
  }

  /* ---------- THE CLOCK: each island frame ---------- */
  function tick(dt) {
    if (!X || !X.on || held) return;
    try { step(dt); } catch (e) { fail('tick', e); }
  }
  function step(dt) {
    var t0 = performance.now(), cam = X.cam.position, P = X.P, T = X.T, Ad = X.F.A.array, Bd = X.F.B.array, i, q, w;
    if (X.classic && X.classic()) { off('classic'); return; }
    var show = X.oak ? X.oak.visible : true, ins = X.inside ? !!X.inside() : false, na = X.night ? +X.night() || 0 : 0, rk = X.rain ? +X.rain() || 0 : 0, day = 1 - na;
    X.lit.visible = show; X.fall.visible = show && !ins;
    var Lk = (C.NIGHT + (1 - C.NIGHT) * day) * (1 - 0.25 * rk) * C.GAIN; X.U.uLight.value.set(Lk * (0.74 + 0.26 * day), Lk * (0.84 + 0.12 * day), Lk * (1 - 0.14 * day));   /* follow the light: warm by day, dim and cool at night */
    X.clock += dt; X.frame++;
    X.nearT -= dt;
    if (X.nearT <= 0) {   /* which broadleaves are near her: twice a second */
      X.nearT = 0.5; X.nNear = 0; X.closeD = 1e9; X.closeI = -1;
      for (i = 0; i < X.nT; i++) { var sa = X.srcA[i], gone = 0; if (sa) { var so = X.srcO[i], se = sa.array; gone = se[so] * se[so] + se[so + 1] * se[so + 1] + se[so + 2] * se[so + 2] < 1e-6 ? 1 : 0; } if (gone !== X.cut[i]) litterOf(i, !gone); if (gone) continue;
        var dx = T[i * TS] - cam.x, dz = T[i * TS + 2] - cam.z, d = Math.sqrt(dx * dx + dz * dz) - T[i * TS + 3]; if (d < C.R && Math.abs(T[i * TS + 1] - cam.y) < 70) X.NEAR[X.nNear++] = i; if (d < X.closeD) { X.closeD = d; X.closeI = i; } }
    }
    if (show && !ins && X.nNear) { X.acc += C.RATE * Math.min(1, X.nNear / C.FULL) * (1 - C.RAIN * rk) * dt; if (X.acc > 10) X.acc = 10; while (X.acc >= 1) { X.acc -= 1; letGo(); } }
    var gust = C.DRIFT * (1 + 0.5 * Math.sin(X.clock * 0.37)) + C.GUST * rk, wx = C.WIND[0] * gust, wz = C.WIND[1] * gust, water = X.water, fr = X.frame;
    for (i = 0; i < C.N; i++) {
      q = i * ST; var s = P[q + 8]; if (!s) continue;
      w = i * 4; var age = P[q + 9] + dt, sz = P[q + 10]; P[q + 9] = age;
      if (s === 1) {
        var ph = P[q + 4] + age * P[q + 6], sn = Math.sin(ph), cs = Math.cos(ph);
        P[q] += (wx + cs * P[q + 5]) * dt; P[q + 2] += (wz + Math.sin(ph * 0.7 + 1.3) * P[q + 5] * 0.7) * dt; P[q + 1] -= P[q + 3] * (0.75 + 0.5 * sn * sn) * dt;
        Bd[w] = P[q + 11] * age + 0.8 * sn; Bd[w + 2] = P[q + 12] * age + 0.5 * Math.cos(ph * 0.7); Bd[w + 1] += 0.5 * dt;
        if (age < 0.4) sz *= age * 2.5;
        if (((fr + i) & 7) === 0) P[q + 7] = X.H(P[q], P[q + 2]);
        var g = P[q + 7] > water ? P[q + 7] : water;
        if (P[q + 1] <= g + C.LIFT) {   /* at the ground it knew: ask again where it is now, and land there */
          var g0 = X.H(P[q], P[q + 2]); P[q + 7] = g0; g = g0 > water ? g0 : water;
          if (P[q + 1] <= g + C.LIFT) { P[q + 1] = g + C.LIFT; P[q + 8] = 2; Bd[w] = 0.16 * sn; Bd[w + 2] = 0.16 * cs; if (g0 <= water) { P[q + 9] = C.LIE; stat.wet++; } else { P[q + 9] = 0; stat.landed++; } }
        } else if (age > 60) { P[q + 8] = 0; sz = 0; }
      } else if (age >= C.LIE) { var u = (age - C.LIE) / C.FADE; if (u >= 1) { P[q + 8] = 0; sz = 0; } else sz *= 1 - u; }   /* lying: a few seconds, then it shrinks away (on water: at once) */
      Ad[w] = P[q]; Ad[w + 1] = P[q + 1]; Ad[w + 2] = P[q + 2]; Ad[w + 3] = sz;
    }
    X.F.A.needsUpdate = true; X.F.B.needsUpdate = true;
    var ms = performance.now() - t0; stat.ticks++; stat.tickMs += ms; if (ms > stat.tickMax) stat.tickMax = ms;
  }

  /* ---------- THE LIGHT: called where the game sets its lights' colours: by the sky clock when it repaints (before the realism pass reads the fill), and each frame after the air's own grade
     (atmo.js sets the sun and the fill every frame). A colour this file has already leaned, and nobody has set since, is left alone: asked twice, it leans once. ---------- */
  var WROTE = new Float64Array(9);
  function lean(c, to, k, w) { if (c.r === WROTE[w] && c.g === WROTE[w + 1] && c.b === WROTE[w + 2]) return 0; c.lerp(to, k); WROTE[w] = c.r; WROTE[w + 1] = c.g; WROTE[w + 2] = c.b; return 1; }
  function light(sun, hemi, na, k) {
    if (!X || !X.on || held) return;
    try {
      if (X.away && X.away()) return;
      var day = (1 - (na || 0)) * (1 - 0.6 * (k || 0)); stat.day = +day.toFixed(3); if (!(day > 0)) return;
      if (lean(sun.color, X.cSun, C.SUNK * day, 0) | lean(hemi.color, X.cSky, C.SKYK * day, 3) | lean(hemi.groundColor, X.cGnd, C.GNDK * day, 6)) stat.lights++;
    } catch (e) { fail('light', e); }
  }

  /* ---------- THE BENCH'S (never the player's) ---------- */
  function hold(b) { held = !!b; if (X && X.on) X.grp.visible = !held; return held; }   /* the leaves and the litter out of the picture and off the clock: the frame cost is measured against this */
  function peek(o) {
    var out = { season: name || season(), on: !!(X && X.on), fault: fault, why: why, held: held, n: C.N, stat: Object.assign({}, stat) };
    if (!X) return out;
    var P = X.P, i, fall = 0, lie = 0, list = [];
    for (i = 0; i < C.N; i++) { var s = P[i * ST + 8]; if (s === 1) fall++; else if (s === 2) lie++; if (s && o && o.leaves) list.push([i, P[i * ST + 13], +P[i * ST + 1].toFixed(3), s, +P[i * ST].toFixed(2), +P[i * ST + 2].toFixed(2)]); }
    Object.assign(out, { trees: X.nT, kinds: X.kinds, near: X.nNear, falling: fall, lying: lie, alive: fall + lie, litter: X.nLit, inScene: X.grp.parent != null, shown: { group: X.grp.visible, leaves: X.fall.visible, litter: X.lit.visible },
      light: X.U.uLight.value.toArray().map(function (v) { return +v.toFixed(3); }), tickMean: stat.ticks ? +(stat.tickMs / stat.ticks).toFixed(4) : null });
    if (o && o.leaves) out.leaves = list;
    return out;
  }
  function meshes() { return X ? { leaves: X.fall, litter: X.lit } : null; }
  return { C: C, PAL: PAL, season: season, ofMonth: ofMonth, leavesIn: leavesIn, create: create, tick: tick, light: light, off: off, hold: hold, peek: peek, meshes: meshes };
})();
