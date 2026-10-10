/* ═══════════════════════════════════════════════════════════════════════════
   WFR_HOGS — the hedgehogs of the dunes (boards 529 + 542; Oct 9 2026).

   Marth (Oct 8): "We should also make hedgehogs on a sandy / rocky area (probably have to create that) and by either
   'helping them find their sons lost history book - (it'll have a cross on it) ... They'll teach you zoom - where you can
   run really fast". Itachi's BRIEF_528_530 section C, the "529-lite": the dunes, the family, the book, Zoom.
   (Air tricks and "lead them home" are post-birthday: NOT built here.)

   WHAT IS HERE
     THE DUNES   a sandy and rocky patch at DUNES (x 40, z -215, r 45): sand and rock painted into the island's own
                 vertex colours, low dunes added to H() (never across a line the tree filter reads - see guard()),
                 a sand skin with wind ripples, 14 rocks, and the family's burrow in the knoll. The forest's trees
                 inside the radius are HIDDEN by a post-pass (their instances zeroed), never removed from the loop, so
                 the island's dice (rnd) never move.
     THE FAMILY  NAMES.father, NAMES.mother, NAMES.son (Bramble, Moss, Pip - Marth may rename them HERE, in one place).
                 Real hedgehogs: brown spines with pale tips (an instanced spine shell), sleepy by day (the joke: a slow
                 waddle and a sleepy cloud by day, brisk at night), a waddle round a loop by the burrow, and they CURL
                 INTO A BALL when the bird lands within 3 m.
     THE BOOK    Pip's history book: brown, a gold cross on the cover, no title, no words. An items[] entry owned by Pip
                 (it rides the game's own pickup), spawned when she has met the family. Returning it brings ZOOM.
     ZOOM        hold the stick fully forward 0.6 s while walking (Shift on a keyboard, or the Zoom button): x3.5 for
                 3 s, then 2.5 s to cool down (Marth, Oct 9: "a tad longer", the cooldown "a TAD shorter"; was 2.5 and 3). The legs a blur with a ghost pair half a phase behind, streaks, dust,
                 the field of view 62 -> 72.
     THE PAGES   WFR_PICTO (pictograms.js): after she returns the book Pip opens it once; "Read the book" (in the pause
                 sheet) opens it again. Pictures and the chapter REFERENCE under each page only - no verse text.
                 Everything about the pages sits behind ONE flag, BOOK_PAGES_OK: Marth sees the drawings first.

   HOUSE LAW kept here: no Math.random (a seeded hash instead), no Scripture text and no quotation, nothing in this file
   rewrites a divine name, every control a thumb can reach is >= 44 px and listens on pointerdown.

   API
     WFR_HOGS.makeDunes(THREE) -> { H(x, z, h), paint(x, z, y, colour), inside(x, z), at, r }   (wired into H() and terrain)
     WFR_HOGS.init(THREE, api)  -> { pre(dt), tick(dt), deliver(item), openBook(), state() }
     WFR_HOGS.NAMES, BOOK_PAGES_OK, DUNES, ZOOM
     WFR_HOGS.dbg               the bench's door, only when localStorage 'wfr.debug' is '1' (as window.__wfr)
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* ── the names (Marth may rename them: change them here and nowhere else) ── */
  const NAMES = { father: 'Bramble', mother: 'Moss', son: 'Pip' };
  /* ── board 542: the book's pages open ONLY once Marth has seen the drawings. Flip to true when he says so. ── */
  const BOOK_PAGES_OK = false;

  const DUNES = { x: 40, z: -215, r: 45 };          // BRIEF_528_530 section C; checked against the island (H 8.7 at the centre)
  const WATER = 1.2;                                // the game's sea level (the bench checks it against landmarks().WATER)
  const ZOOM = { hold: 0.6, full: 0.97, mult: 3.5, dur: 3.0, cd: 2.5, fov0: 62, fov1: 72, legRate: 60 };
  const CURL_R = 3, TALK_R = 3.2, GIVE_R = 4.5;
  const SAND = 0xe3cf9a, ROCK = 0x8a8f78;

  /* the family's places (measured on the island, Oct 9: the knoll south of the centre rises to ~13 m) */
  const BURROW = { x: 41, z: -229.5 };               // dug into the knoll's north face, its mouth toward the loop
  const LOOP = { x: 39, z: -217, rx: 6.5, rz: 4.2 };  // the waddle, round the patch in front of the burrow
  const BOOK_AT = { x: 13.5, z: -199.5 };            // where Pip put it down (by the beetles' rock, at the edge of the sand)
  /* 14 rocks: [dx, dz, size, flatness] from the centre - the knoll's top is rock, the rest scattered in the sand */
  const ROCKS = [[-3, -24, 3.0, 0.7], [6, -27, 2.3, 0.75], [-9, -21, 1.7, 0.65], [12, -22, 2.6, 0.6], [1, -31, 2.0, 0.7],
    [-15, -29, 1.5, 0.7], [-24, 17, 2.1, 0.62], [-19, 10, 1.0, 0.7], [17, 6, 1.4, 0.6], [24, -8, 1.8, 0.55],
    [-30, -6, 1.1, 0.7], [9, 21, 1.0, 0.65], [30, 14, 1.5, 0.6], [-34, 12, 0.9, 0.7]];

  /* ── a seeded dice: the island's rnd() is never touched, and nothing here is random from run to run ── */
  function dice(seed) {
    let s = seed >>> 0;
    return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  /* ═══════════════════════ THE DUNES ═══════════════════════ */
  const DUNE_MAX = 0.8 * 1.22 / 1.1;                 // the largest the undulation can be (0.887 m)
  function duneAt(x, z) {   // low dunes across the wind (crests NW-SE), ~36 m apart, a gentle windward face and a steeper lee
    const dx = x - DUNES.x, dz = z - DUNES.z, u = dx * 0.8 + dz * 0.6, v = -dx * 0.6 + dz * 0.8;
    const ph = u * (Math.PI * 2 / 36) + 0.9 * Math.sin(v * Math.PI * 2 / 70);
    return 0.8 * (Math.sin(ph) + 0.22 * Math.sin(2 * ph + 0.6)) / 1.1;
  }
  function weight(x, z) { const d = Math.hypot(x - DUNES.x, z - DUNES.z); return d >= DUNES.r ? 0 : 1 - sm(DUNES.r * 0.55, DUNES.r, d); }
  /* ⚠ THE H() TRAP (BRIEF_528_530): H() feeds the tree filter (y < WATER + 1.5 || y > 24) BEFORE rnd() is consumed, so a
     height carried across either line drops or adds a tree and moves every tree, house and cloud after it. The guard fades
     the dunes to nothing as a height nears either line (and below the shore, so the sea stays sea). With |dune| <= 0.887 it
     can never carry a height across: for a gap g = |h - line| the most it can add is 0.887 * smooth(0, 1.2, g) < g. */
  function guard(h) { return sm(0, 1.2, Math.abs(h - (WATER + 1.5))) * sm(0, 1.2, Math.abs(h - 24)) * sm(WATER + 0.2, WATER + 1.4, h); }
  function makeDunes(THREE) {
    const ca = new THREE.Color(), cb = new THREE.Color();
    return {
      at: { x: DUNES.x, z: DUNES.z }, r: DUNES.r,
      inside: (x, z) => Math.hypot(x - DUNES.x, z - DUNES.z) < DUNES.r,
      H(x, z, h) {
        const dx = x - DUNES.x, dz = z - DUNES.z; if (dx * dx + dz * dz >= DUNES.r * DUNES.r) return h;
        return h + duneAt(x, z) * weight(x, z) * guard(h);
      },
      paint(x, z, y, c) {   // the terrain pass's colour, lerped to sand and rock (colour only: no height, no dice)
        const d = Math.hypot(x - DUNES.x, z - DUNES.z); if (d > DUNES.r * 1.05 || y < WATER + 0.3) return;
        const w = 1 - sm(DUNES.r * 0.72, DUNES.r * 1.05, d);
        sandOrRock(ca, cb, x, z, y); c.lerp(ca, w);
      },
      colour: (out, x, z, y) => sandOrRock(out, cb, x, z, y),
      dune: duneAt, guard, weight, MAX: DUNE_MAX,
    };
  }
  function sandOrRock(out, tmp, x, z, y) {
    const n = Math.sin(x * 0.13 + Math.cos(z * 0.09) * 1.7) * Math.cos(z * 0.11 + Math.sin(x * 0.07) * 1.3);
    const rock = clamp01(clamp01((n - 0.35) * 2.4) + clamp01((y - 9.8) / 2.0));   // patches, and the knoll's top
    out.setHex(SAND).lerp(tmp.setHex(ROCK).multiplyScalar(0.86), rock);   // a shade under the brief's rock: the noon sun lifts it
    out.offsetHSL(0, 0, 0.035 * duneAt(x, z) / DUNE_MAX);   // crests a shade lighter, hollows a shade darker
    return out;
  }

  /* ═══════════════════════ GEOMETRY HELPERS ═══════════════════════ */
  /* several coloured parts -> one BufferGeometry with a colour per vertex (one draw) */
  function merge(THREE, parts) {
    const pos = [], nor = [], col = [], c = new THREE.Color();
    for (const p of parts) {
      let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
      if (p.m) g.applyMatrix4(p.m);
      if (!g.attributes.normal) g.computeVertexNormals();
      const P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color;
      c.setHex(p.c);
      for (let i = 0; i < P.count; i++) {
        pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i));
        if (C && p.keepColour) col.push(C.getX(i), C.getY(i), C.getZ(i)); else col.push(c.r, c.g, c.b);
      }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  }
  const M4 = (THREE, x, y, z, sx, sy, sz, rx, ry, rz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx, sy == null ? sx : sy, sz == null ? sx : sz));

  /* the terrain's DRAWN height: the island mesh is a 4.8 m grid, so between its vertices the ground you see is a pair of flat
     triangles, not H(). Things that sit on the sand (the skin, rocks, the burrow, the family) sit on what is drawn. */
  function meshHeight(ground) {
    const P = ground.geometry.parameters, W = P.width, N = P.widthSegments, step = W / N, half = W / 2, pos = ground.geometry.attributes.position, gx = N + 1;
    const vy = (ix, iz) => pos.getY(ix + gx * iz);
    return (x, z) => {
      const fx = (x + half) / step, fz = (z + half) / step, ix = Math.min(N - 1, Math.max(0, Math.floor(fx))), iz = Math.min(N - 1, Math.max(0, Math.floor(fz)));
      const u = fx - ix, v = fz - iz, a = vy(ix, iz), b = vy(ix, iz + 1), c = vy(ix + 1, iz + 1), d = vy(ix + 1, iz);
      return u + v <= 1 ? a + (d - a) * u + (b - a) * v : c + (b - c) * (1 - u) + (d - c) * (1 - v);
    };
  }

  /* the sand's ripples: one 512 canvas over the whole patch - wind ripples, a scatter of grains, and a soft ragged edge */
  function rippleTexture(THREE) {
    const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), r = dice(529);
    g.fillStyle = 'rgb(232,230,226)'; g.fillRect(0, 0, S, S);
    g.save(); g.translate(S / 2, S / 2); g.rotate(-Math.atan2(0.6, 0.8));
    for (let k = -60; k <= 60; k++) {   // a ripple every ~6 px (~1 m), each a light crest with its shadow just behind
      const y0 = k * 6.2 + r() * 1.5;
      for (const [dy, colr, w] of [[0, 'rgba(255,255,255,0.9)', 1.6], [1.8, 'rgba(176,164,146,0.55)', 1.2]]) {
        g.beginPath(); for (let x = -380; x <= 380; x += 8) { const y = y0 + dy + Math.sin(x * 0.045 + k * 0.9) * 1.6 + Math.sin(x * 0.013 + k * 0.37) * 2.4; if (x === -380) g.moveTo(x, y); else g.lineTo(x, y); }
        g.strokeStyle = colr; g.lineWidth = w; g.stroke();
      }
    }
    g.restore();
    for (let i = 0; i < 2600; i++) { const v = 150 + Math.floor(r() * 90); g.fillStyle = 'rgba(' + v + ',' + (v - 8) + ',' + (v - 22) + ',0.5)'; g.fillRect(r() * S, r() * S, 1, 1); }
    /* the edge: alpha falls away from 80 % of the radius, a little ragged */
    g.globalCompositeOperation = 'destination-in';
    const grd = g.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S * 0.495);
    grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
  }

  /* ═══════════════════════ A HEDGEHOG ═══════════════════════ */
  const N_SPINES = 150, PHI = Math.PI * (3 - Math.sqrt(5));
  let spineGeo = null, footGeo = null;
  function sharedGeo(THREE) {
    if (spineGeo) return;
    /* one spine: a thin four-sided cone, its base at the origin, pointing +y. Brown at the root, a pale tip (Wikipedia, Hedgehog) */
    spineGeo = new THREE.ConeGeometry(0.03, 0.2, 4, 2); spineGeo.translate(0, 0.1, 0);
    const P = spineGeo.attributes.position, col = [], base = new THREE.Color(0x3a2818), mid = new THREE.Color(0x684a2c), tip = new THREE.Color(0xf1e7cf), c = new THREE.Color();
    for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > 0.19) c.copy(tip); else if (y > 0.05) c.copy(mid); else c.copy(base); col.push(c.r, c.g, c.b); }
    spineGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    footGeo = new THREE.SphereGeometry(0.06, 8, 6); footGeo.scale(1, 0.6, 1.45);
  }
  /* each spine's two poses: OPEN (lying back over the dome of the back, clear of the face) and CURLED (all round a ball) */
  function spinePoses(THREE) {
    const open = [], curl = [], up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < N_SPINES; i++) {
      const y = 1 - 2 * (i + 0.5) / N_SPINES, rr = Math.sqrt(1 - y * y), a = i * PHI;
      const p = new THREE.Vector3(rr * Math.cos(a), y, rr * Math.sin(a));
      const front = Math.max(0, Math.sin(a)), th = Math.acos(y) * 0.62 * (1 - 0.5 * front);   // the front of the dome stops at the brow
      v.set(Math.sin(th) * Math.cos(a), Math.cos(th), Math.sin(th) * Math.sin(a));
      const pos = new THREE.Vector3(0.33 * v.x, 0.27 + 0.25 * v.y, -0.08 + 0.46 * v.z);
      d.set(v.x, v.y + 0.25, v.z - 1.1).normalize();   // they lie back, as a calm hedgehog's do
      open.push({ p: pos, q: new THREE.Quaternion().setFromUnitVectors(up, d.clone()) });
      curl.push({ p: new THREE.Vector3(0, 0.36, 0).addScaledVector(p, 0.31), q: new THREE.Quaternion().setFromUnitVectors(up, p) });   // bristling, all round
    }
    return { open, curl };
  }
  function buildHog(THREE, role, scale, fur, poses) {
    sharedGeo(THREE);
    const g = new THREE.Group(); g.name = 'hog:' + role;
    const lam = (o) => new THREE.MeshLambertMaterial(o);
    const sph = (r, w, h) => new THREE.SphereGeometry(r, w || 12, h || 9);
    const parts = [
      { geo: sph(1, 16, 11), m: M4(THREE, 0, 0.27, -0.02, 0.34, 0.24, 0.46), c: fur },                 // the body (the fur under the spines)
      { geo: sph(1, 14, 10), m: M4(THREE, 0, 0.25, 0.36, 0.16, 0.14, 0.22), c: 0xd9c19c },            // the face
      { geo: new THREE.ConeGeometry(0.075, 0.2, 12), m: M4(THREE, 0, 0.22, 0.6, 1, 1, 1, Math.PI / 2), c: 0xd3b58e },   // the snout
      { geo: sph(0.045, 10, 8), m: M4(THREE, 0, 0.22, 0.71, 1), c: 0x1a1410 },                         // the nose
      { geo: sph(0.034, 10, 8), m: M4(THREE, 0.088, 0.31, 0.45, 1), c: 0x120d0a },                    // the eyes
      { geo: sph(0.034, 10, 8), m: M4(THREE, -0.088, 0.31, 0.45, 1), c: 0x120d0a },
      { geo: sph(0.056, 10, 8), m: M4(THREE, 0.14, 0.38, 0.3, 1, 0.8, 0.5), c: 0xb59474 },            // the ears
      { geo: sph(0.056, 10, 8), m: M4(THREE, -0.14, 0.38, 0.3, 1, 0.8, 0.5), c: 0xb59474 },
    ];
    const body = new THREE.Mesh(merge(THREE, parts), lam({ vertexColors: true })); body.castShadow = true; body.receiveShadow = true; g.add(body);
    const spines = new THREE.InstancedMesh(spineGeo, lam({ vertexColors: true }), N_SPINES);
    const r = dice(role.length * 977 + 31), col = new THREE.Color();
    for (let i = 0; i < N_SPINES; i++) spines.setColorAt(i, col.setScalar(0.82 + r() * 0.34));
    spines.instanceColor.needsUpdate = true; spines.frustumCulled = false; spines.castShadow = true; g.add(spines);
    g.scale.setScalar(scale);
    const hog = { role, g, body, spines, scale, curl: 0, curlTo: 0, curlT: 0, drawn: -1, stride: 0, yaw: 0, poses };
    setCurl(THREE, hog, 0);
    return hog;
  }
  const _m = [], _p = [], _q = [];
  function setCurl(THREE, hog, c) {   // re-pose the spine shell only when the curl changes (a transition, never every frame)
    if (Math.abs(c - hog.drawn) < 1e-3) return;
    if (!_m.length) { _m.push(new THREE.Matrix4()); _p.push(new THREE.Vector3()); _q.push(new THREE.Quaternion()); }
    const m = _m[0], p = _p[0], q = _q[0], one = new THREE.Vector3(1, 1, 1), e = c * c * (3 - 2 * c);
    for (let i = 0; i < N_SPINES; i++) {
      const o = hog.poses.open[i], k = hog.poses.curl[i];
      p.copy(o.p).lerp(k.p, e); q.copy(o.q).slerp(k.q, e);
      hog.spines.setMatrixAt(i, m.compose(p, q, one));
    }
    hog.spines.instanceMatrix.needsUpdate = true; hog.drawn = c;
    /* the face and the soft belly tuck in under the ball */
    hog.body.scale.setScalar(1 - 0.28 * e); hog.body.position.set(0, 0.1 * e, -0.03 * e); hog.body.rotation.x = 0.9 * e;
  }

  /* ═══════════════════════ THE BOOK (Pip's) ═══════════════════════ */
  function buildBook(THREE) {
    /* a brown cover, cream pages, a gold cross on the front - NO title and no words (BRIEF_528_530 C; BRIEF_542 Q8).
       Its longest side is 1.6 units, the size of a tool's sprite, so the game's own beak-hold sizes it like a tool. */
    const parts = [
      { geo: new THREE.BoxGeometry(1.1, 0.24, 1.5), c: 0x6b4428 },                                       // the cover
      { geo: new THREE.BoxGeometry(1.04, 0.18, 1.42), m: M4(THREE, 0.04, 0, 0, 1), c: 0xefe3c4 },        // the pages' edge
      { geo: new THREE.BoxGeometry(0.16, 0.03, 0.72), m: M4(THREE, 0, 0.13, 0.02, 1), c: 0xd4a73c },     // the cross: upright
      { geo: new THREE.BoxGeometry(0.5, 0.03, 0.15), m: M4(THREE, 0, 0.13, 0.17, 1), c: 0xd4a73c },      //            and beam
      { geo: new THREE.BoxGeometry(0.1, 0.25, 1.52), m: M4(THREE, -0.52, 0, 0, 1), c: 0x4f311c },       // the spine of the book
    ];
    const book = new THREE.Mesh(merge(THREE, parts), new THREE.MeshLambertMaterial({ vertexColors: true })); book.castShadow = true;
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.22, depthWrite: false }));
    const g = new THREE.Group(); g.add(book); g.add(halo);   // children[1] must be the halo: the game's carry hides it by index
    book.rotation.y = 0.5;
    return g;
  }

  /* ═══════════════════════ INIT ═══════════════════════ */
  function init(THREE, api) {
    const S = api.S, scene = api.scene, $ = (id) => document.getElementById(id);
    const debugOn = (() => { try { return localStorage.getItem('wfr.debug') === '1'; } catch (e) { return false; } })();
    let listeners = 0;
    const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); listeners++; };
    const ground = scene.children.find((o) => o.userData && o.userData.ground);
    const meshH = ground ? meshHeight(ground) : (x, z) => api.H(x, z);
    const r = dice(5290);

    /* ── the dunes' things: one group, shown while the camera is within reach ── */
    const site = new THREE.Group(); site.name = 'dunes'; scene.add(site);
    // the sand skin: a finer grid laid 5 cm over what the island draws, coloured as the island is, rippled, fading at the edge
    const N = 72, skinGeo = new THREE.PlaneGeometry(DUNES.r * 2, DUNES.r * 2, N, N); skinGeo.rotateX(-Math.PI / 2); skinGeo.translate(DUNES.x, 0, DUNES.z);
    { const P = skinGeo.attributes.position, col = [], c = new THREE.Color(); for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), y = meshH(x, z); P.setY(i, y + 0.05); api.dunes.colour(c, x, z, y); col.push(c.r, c.g, c.b); }
      skinGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); skinGeo.computeVertexNormals(); skinGeo.computeBoundingSphere(); }
    const skin = new THREE.Mesh(skinGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: rippleTexture(THREE), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    skin.receiveShadow = true; skin.name = 'dunes:skin'; site.add(skin);
    // the rocks: one instanced draw
    const rockGeo = new THREE.DodecahedronGeometry(1, 0), rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), ROCKS.length);
    const ROCKCOL = [0x8a8f78, 0x7d7a6a, 0x9a9484, 0x6f7466, 0x8e8370], rockList = [];
    ROCKS.forEach(([dx, dz, s, fl], i) => {
      const x = DUNES.x + dx, z = DUNES.z + dz, y = meshH(x, z), sx = s * (1 + r() * 0.35), sz = s * (0.8 + r() * 0.35), sy = s * fl;
      rocks.setMatrixAt(i, M4(THREE, x, y + sy * 0.32, z, sx, sy, sz, (r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.3));
      rocks.setColorAt(i, new THREE.Color(ROCKCOL[i % ROCKCOL.length]).multiplyScalar(0.92 + r() * 0.16));
      rockList.push({ x, z, r: Math.max(sx, sz) * 0.85, top: y + sy });
    });
    rocks.instanceMatrix.needsUpdate = true; rocks.instanceColor.needsUpdate = true; rocks.frustumCulled = false; rocks.castShadow = true; rocks.receiveShadow = true; rocks.name = 'dunes:rocks'; site.add(rocks);
    // the burrow: a sandy mound in the knoll, a dark mouth turned to the loop, a few pebbles
    const by = meshH(BURROW.x, BURROW.z), face = Math.atan2(LOOP.x - BURROW.x, LOOP.z - BURROW.z);
    const burrowGeo = merge(THREE, [
      { geo: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m: M4(THREE, 0, -0.35, 0, 2.2, 1.25, 1.9), c: 0xcbb07c },
      { geo: new THREE.CircleGeometry(0.55, 18), m: M4(THREE, 0, 0.28, 1.78, 1, 0.78, 1, -0.55), c: 0x1c130b },
      { geo: new THREE.TorusGeometry(0.6, 0.1, 6, 18, Math.PI), m: M4(THREE, 0, 0.28, 1.76, 1, 0.82, 1, -0.55), c: 0xa98d5f },
      { geo: new THREE.DodecahedronGeometry(0.16, 0), m: M4(THREE, 0.9, 0.02, 1.9, 1, 0.6, 1), c: 0x857d6c },
      { geo: new THREE.DodecahedronGeometry(0.12, 0), m: M4(THREE, -0.8, 0.0, 2.1, 1, 0.6, 1), c: 0x9a9484 },
    ]);
    const burrow = new THREE.Mesh(burrowGeo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    burrow.position.set(BURROW.x, by, BURROW.z); burrow.rotation.y = face; burrow.castShadow = true; burrow.receiveShadow = true; burrow.name = 'dunes:burrow'; site.add(burrow);
    rockList.push({ x: BURROW.x, z: BURROW.z, r: 1.9, top: by + 0.9, burrow: true });
    // the beetle that started it all, by the book's rock
    const beetle = api.emojiSprite('\u{1FAB2}', 0.42); beetle.position.set(BOOK_AT.x - 1.3, meshH(BOOK_AT.x - 1.3, BOOK_AT.z - 0.7) + 0.2, BOOK_AT.z - 0.7); site.add(beetle);

    /* ── the post-pass: the forest's trees inside the dunes are hidden (instances zeroed), never removed from the loop ── */
    const hidden = { trees: [], instances: 0, fruit: [] }, zero = new THREE.Matrix4().makeScale(0, 0, 0), mm = new THREE.Matrix4();
    const inR = (x, z) => Math.hypot(x - DUNES.x, z - DUNES.z) < DUNES.r;
    scene.traverse((o) => {
      if (!o.isInstancedMesh || !/^trees:/.test(o.name)) return;
      let n = 0; for (let j = 0; j < o.count; j++) { o.getMatrixAt(j, mm); if (inR(mm.elements[12], mm.elements[14])) { o.setMatrixAt(j, zero); n++; } }
      if (n) { o.instanceMatrix.needsUpdate = true; hidden.instances += n; }
    });
    api.trees.forEach((t, i) => { if (inR(t.x, t.z)) { t.hidden = true; t.r = 0; hidden.trees.push(i); } });   // no perch, no bump, no landing spot
    api.fruitTrees.forEach((f, i) => { if (f.t && f.t.hidden) { f.when = () => false; f.s.visible = false; hidden.fruit.push(i); } });

    /* ── the family ── */
    const poses = spinePoses(THREE);
    const fam = [buildHog(THREE, 'mother', 1.0, 0xa88a68, poses), buildHog(THREE, 'son', 0.68, 0xb49676, poses), buildHog(THREE, 'father', 1.12, 0x9c7f5f, poses)];   // in file order: she leads, Pip, his father at the back
    fam.forEach((h) => { h.name = NAMES[h.role]; site.add(h.g); });
    const pip = fam[1];
    const feet = new THREE.InstancedMesh(footGeo, new THREE.MeshLambertMaterial({ color: 0x5a4030 }), fam.length * 4); feet.frustumCulled = false; feet.castShadow = true; feet.name = 'hog:feet'; site.add(feet);
    const zzz = fam.map((h) => { const s = api.emojiSprite('\u{1F4A4}', 0.55); s.position.set(0.15, 0.95, -0.05); s.visible = false; h.g.add(s); return s; });
    const OWNER = { name: NAMES.son, g: pip.g, hog: true, need: null };   // Pip, as the game's items[] reads an owner

    /* ── the loop ── */
    let loopS = 0;
    const LOOP_LEN = 2 * Math.PI * Math.sqrt((LOOP.rx * LOOP.rx + LOOP.rz * LOOP.rz) / 2);
    const pathAt = (s, out) => { const a = s * Math.PI * 2; out.x = LOOP.x + LOOP.rx * Math.cos(a) + 0.6 * Math.sin(3 * a); out.z = LOOP.z + LOOP.rz * Math.sin(a) + 0.4 * Math.cos(2 * a); return out; };
    const pa = { x: 0, z: 0 }, pb = { x: 0, z: 0 };
    const GAP = 1.5 / LOOP_LEN;

    /* ── the book, the quest ── */
    let book = null;   // the items[] entry
    S.seen = S.seen || {};
    function spawnBook() {
      if (book || S.seen.hogsBook) return;
      const g = buildBook(THREE), y = meshH(BOOK_AT.x, BOOK_AT.z) + 0.35;
      g.scale.setScalar(0.42); g.position.set(BOOK_AT.x, y, BOOK_AT.z); scene.add(g);
      book = { type: { id: 'book', emoji: '\u{1F4D6}', name: 'history book', metal: false }, spot: { x: BOOK_AT.x, z: BOOK_AT.z, zone: '\u{1F3DC}️' }, g, owner: OWNER, held: false, done: false };
      api.items.push(book); OWNER.need = book;
    }
    if (S.seen.hogsMet && !S.seen.hogsBook) spawnBook();
    const L = {   // the words (the names come from NAMES; nothing here is Scripture)
      meet: () => [[NAMES.father, night() ? 'Evening, little bird. This is our busy time. Hedgehogs are night folk.' : 'Mm? (a big yawn) A bird, at this hour? Hedgehogs sleep in the daytime, you know.'],
        [NAMES.mother, 'Don\'t mind him. ' + NAMES.son + ' is the only one of us properly awake, and he is upset.'],
        [NAMES.son, 'I lost my history book.'],
        [NAMES.son, 'It had a cross on the front. Dad said it was Grandad\'s. I put it down to look at a beetle.'],
        [NAMES.mother, 'The beetles live by the rocks at the edge of the sand.'],
        ['', 'Find ' + NAMES.son + '\'s history book: brown, with a gold cross on the front.']],
      remind: () => [[NAMES.son, 'Did you find my book? It is brown, with a gold cross on the front.']],
      thanks: () => [[NAMES.son, 'My book! You found it! Thank you, thank you!'],
        [NAMES.father, 'You have a good heart, little bird. We have nothing to give you. But we can teach you something.'],
        [NAMES.mother, 'Watch our feet. When a hedgehog has to hurry, its little legs go so fast you can hardly see them.'],
        [NAMES.father, 'Birds can do it too. On the ground, push forward hard and hold it, and your feet will blur. That is a Zoom.'],
        ['', api.touchy ? 'You learned Zoom! Walking, hold the stick all the way forward, or tap Zoom.' : 'You learned Zoom! Walking, press Shift.']],
      after: () => [[NAMES.son, 'I keep my book right beside me now.']],
      show: () => [[NAMES.son, 'Do you want to see inside? It is all pictures.']],
    };
    let talkingHogs = false, nearOnce = false;
    const hogSay = (lines, done) => { talkingHogs = true; api.say(lines, () => { talkingHogs = false; if (done) done(); }); };
    function deliver(it) {
      if (it !== book || !S.carry.includes(it)) return false;
      if (S.mode !== 'walk' || S.talking || !site.visible || pip.curl > 0.05 || pip.g.position.distanceTo(S.pos) > GIVE_R) return false;
      S.carry.splice(S.carry.indexOf(it), 1); it.done = true; OWNER.need = null;
      if (it.g.parent) it.g.parent.remove(it.g); it.g.children[1].visible = false; it.g.userData.slot = undefined;
      pip.g.add(it.g); it.g.position.set(0.42, 0.06, 0.1); it.g.rotation.set(0, 0.3, 0); it.g.scale.setScalar(0.24);   // beside Pip, his own again
      S.seen.hogsBook = true; api.save(); api.ding(); api.hud();
      hogSay(L.thanks(), () => {
        S.lessons.zoom = true; api.save(); api.ding(); api.gainXP(30); api.hud();
        if (BOOK_PAGES_OK && !S.seen.bookSeen) hogSay(L.show(), () => openBook());
      });
      return true;
    }
    /* a hedgehog that is back with its book keeps it: on a reload the book is beside Pip again */
    if (S.seen.hogsBook) { const g = buildBook(THREE); g.children[1].visible = false; pip.g.add(g); g.position.set(0.42, 0.06, 0.1); g.rotation.set(0, 0.3, 0); g.scale.setScalar(0.24); }

    /* ═══════════ THE PAGES (board 542) - only behind BOOK_PAGES_OK ═══════════ */
    const story = $('story'), panel = $('panel'), nextBtn = $('next');
    const back = document.createElement('button'); back.className = 'ghost'; back.id = 'back'; back.type = 'button'; back.textContent = 'Back'; back.hidden = true; back.style.minHeight = '44px';
    if (nextBtn && nextBtn.parentNode) nextBtn.parentNode.insertBefore(back, nextBtn);
    const bookRow = document.createElement('div'); bookRow.className = 'row'; bookRow.id = 'bookRow'; bookRow.hidden = true;
    const readBook = document.createElement('button'); readBook.className = 'ghost'; readBook.id = 'readBook'; readBook.type = 'button'; readBook.textContent = '\u{1F4D6} Read the book'; readBook.style.minHeight = '44px';
    bookRow.appendChild(readBook); const pauseRow = $('pauseRow'); if (pauseRow && pauseRow.parentNode) pauseRow.parentNode.insertBefore(bookRow, pauseRow.nextSibling);
    let bookOpen = false, opens = 0;
    function openBook() {
      if (!BOOK_PAGES_OK || !root.WFR_PICTO || bookOpen || !story.hidden) return false;
      const pages = root.WFR_PICTO.pages.map((p) => ({ cap: p.ref || '', svg: p.svg }));   // the reference only, under each page
      const was = S.mode, inGame = was !== 'paused';
      if (inGame) { S.mode = 'event'; api.ui(false); }
      bookOpen = true; opens++;
      api.panels.play(pages, () => { bookOpen = false; back.hidden = true; if (inGame) { api.ui(true); S.mode = was; } S.seen.bookSeen = true; api.save(); });
      return true;
    }
    const page = (k) => { if (!bookOpen) return; const n = api.panels.count(); api.panels.go(Math.max(0, Math.min(n - 1, k))); };
    on(back, 'pointerdown', (e) => { e.preventDefault(); if (bookOpen) page(api.panels.at() - 1); });
    on(readBook, 'pointerdown', (e) => { e.preventDefault(); openBook(); });
    let sw = null;   // a swipe on the page: left for the next page, right for the one before
    on(panel, 'pointerdown', (e) => { if (bookOpen) sw = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
    on(panel, 'pointerup', (e) => { if (!sw || e.pointerId !== sw.id) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
      if (!bookOpen || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return; const k = api.panels.at(); if (dx < 0) { if (k < api.panels.count() - 1) page(k + 1); } else page(k - 1); });
    on(panel, 'pointercancel', () => { sw = null; });

    /* ═══════════ ZOOM ═══════════ */
    const Z = { t: 0, cd: 0, hold: 0, k: 0, legsDirty: false, ghostRig: null, ghosts: [], dustT: 0, by: null, starts: 0 };
    const zoomBtn = document.createElement('button'); zoomBtn.className = 'act'; zoomBtn.id = 'zoom'; zoomBtn.type = 'button'; zoomBtn.hidden = true; zoomBtn.textContent = 'Zoom \u{1F4A8}';
    zoomBtn.style.cssText = 'right:calc(env(safe-area-inset-right,0px) + 132px);bottom:calc(env(safe-area-inset-bottom,0px) + 176px);background:#fff6df;color:#8b5e34';
    const ui = $('ui'); if (ui) ui.appendChild(zoomBtn);
    const zoomable = () => (S.mode === 'walk' || S.mode === 'fly') && !S.talking && !S.inside && !S.insideTH && !S.climb && S.tut === 0 && !S.noWalk && !S.resting && !S.morph && !S.inSky && !S.inEagle;   // 592: in the air too (a flight burst)
    function startZoom(by) {
      if (!S.lessons.zoom || !zoomable() || Z.t > 0 || Z.cd > 0) return false;
      Z.t = ZOOM.dur; Z.hold = 0; Z.by = by; Z.starts++; api.chirp(); return true;
    }
    function endZoom() { Z.t = 0; Z.cd = ZOOM.cd; }
    on(zoomBtn, 'pointerdown', (e) => { e.preventDefault(); startZoom('button'); });
    on(window, 'keydown', (e) => { if (e.key === 'Shift' && !e.repeat) startZoom('shift'); });
    // the look: a ghost pair of legs, streaks, dust
    const SN = 12, streakPos = new Float32Array(SN * 6), streakGeo = new THREE.BufferGeometry(); streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
    const streaks = new THREE.LineSegments(streakGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); streaks.frustumCulled = false; streaks.visible = false; streaks.name = 'zoom:streaks'; scene.add(streaks);
    const sd = dice(4242), streakLane = Array.from({ length: SN }, () => ({ x: (sd() - 0.5) * 2.4, y: 0.15 + sd() * 1.1, z: sd() * 5, len: 1.0 + sd() * 1.2 }));
    const dust = Array.from({ length: 5 }, () => { const s = api.emojiSprite('\u{1F4A8}', 0.6); s.visible = false; s.userData.t = 9; scene.add(s); return s; });
    function ghostOf(o) {   // a see-through copy of a leg (shared geometry, its own faint material)
      const c = o.isMesh ? new THREE.Mesh(o.geometry, (() => { const m = o.material.clone(); m.transparent = true; m.opacity = 0.35; m.depthWrite = false; return m; })()) : new THREE.Group();
      c.position.copy(o.position); c.rotation.copy(o.rotation); c.scale.copy(o.scale);
      for (const ch of o.children) c.add(ghostOf(ch));
      return c;
    }
    function ghosts(rig) {
      if (Z.ghostRig === rig) return Z.ghosts;
      Z.ghostRig = rig; Z.ghosts = (rig && rig.legs ? rig.legs : []).map((l) => { const gl = ghostOf(l); gl.visible = false; l.parent.add(gl); return gl; });
      return Z.ghosts;
    }
    const v1 = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), QI = new THREE.Quaternion(), SC = new THREE.Vector3();
    const night = () => S.clock >= 1950 || S.clock < 120;   // dusk to dawn: the hedgehogs' busy time
    function zoomLook(dt) {
      const want = Z.t > 0 ? 1 : 0; Z.k += (want - Z.k) * Math.min(1, dt * 6); if (!want && Z.k < 0.01) Z.k = 0;
      const cam = api.camera, fov = ZOOM.fov0 + (ZOOM.fov1 - ZOOM.fov0) * Z.k;
      if (cam.fov !== fov) { cam.fov = Z.k === 0 ? ZOOM.fov0 : fov; cam.updateProjectionMatrix(); }   // exactly 62 again after
      const rig = api.rig(), legs = rig && rig.legs, gh = ghosts(rig);
      if (Z.t > 0 && legs && S.mode === 'walk') {   // ~60 rad/s: too fast to follow, with a faint pair half a phase behind (on the ground)
        const ph = S.t * ZOOM.legRate;
        legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + i * Math.PI) * 0.95; if (gh[i]) { gh[i].visible = true; gh[i].rotation.x = Math.sin(ph + i * Math.PI - Math.PI) * 0.95; } });
        Z.legsDirty = true;
      } else if (Z.legsDirty) { if (legs) legs.forEach((l) => { l.rotation.x = 0; }); gh.forEach((g) => { g.visible = false; }); Z.legsDirty = false; }   // the residue law
      const bird = api.bird();
      streaks.visible = Z.k > 0.02 && !!bird;
      if (streaks.visible) {
        fwd.set(Math.sin(S.yaw), 0, Math.cos(S.yaw)); right.set(fwd.z, 0, -fwd.x);
        streakLane.forEach((l, i) => { l.z = (l.z + dt * 9) % 5; const b = S.pos;
          v1.copy(b).addScaledVector(right, l.x).addScaledVector(fwd, -0.6 - l.z); v1.y = b.y - 0.3 + l.y;
          streakPos[i * 6] = v1.x; streakPos[i * 6 + 1] = v1.y; streakPos[i * 6 + 2] = v1.z;
          v1.addScaledVector(fwd, -l.len); streakPos[i * 6 + 3] = v1.x; streakPos[i * 6 + 4] = v1.y; streakPos[i * 6 + 5] = v1.z; });
        streakGeo.attributes.position.needsUpdate = true; streaks.material.opacity = 0.55 * Z.k;
      }
      Z.dustT -= dt;
      if (Z.t > 0 && Z.dustT <= 0 && bird) { Z.dustT = 0.13; const s = dust.find((d) => d.userData.t >= 0.6) || dust[0];
        s.userData.t = 0; s.position.set(S.pos.x - Math.sin(S.yaw) * 0.6, api.ground(S.pos.x, S.pos.z) + 0.25, S.pos.z - Math.cos(S.yaw) * 0.6); }
      for (const s of dust) { s.userData.t += dt; const u = s.userData.t / 0.6; s.visible = u < 1; if (u < 1) { s.scale.setScalar(0.5 + u * 0.9); s.material.opacity = 0.9 * (1 - u); s.position.y += dt * 0.4; } }
    }

    /* ═══════════ EACH FRAME ═══════════ */
    let prevMode = S.mode, stillT = 0, benchHide = false; const lastPos = S.pos.clone();   // benchHide: only the bench's door sets it (draw-cost on/off)
    function pre(dt) {   // before the frame's walk: the extra stride of a Zoom, and the rocks underfoot
      if (Z.t > 0) { Z.t -= dt; if (Z.t <= 0 || !zoomable()) endZoom(); }
      else if (Z.cd > 0) Z.cd = Math.max(0, Z.cd - dt);
      const inp = api.input;   // the stick held fully forward (a thumb; the keyboard has Shift)
      if (S.lessons.zoom && zoomable() && S.mode === 'walk' && Z.t <= 0 && Z.cd <= 0 && inp.sy >= ZOOM.full && Math.abs(inp.sx) < 0.3) { Z.hold += dt; if (Z.hold >= ZOOM.hold) startZoom('stick'); } else Z.hold = 0;
      if (Z.t > 0 && S.mode === 'walk') { const st = api.steer(); if (st.sy > 0.05) api.walkStep(0, st.sy, dt * (ZOOM.mult - 1)); }   // the extra stride is a ground thing; in the air the html adds the burst (592)
      if (S.mode === 'walk' && !S.inside && site.visible) for (const k of rockList) {   // she walks round a rock, never through it
        const dx = S.pos.x - k.x, dz = S.pos.z - k.z, d = Math.hypot(dx, dz), rr = k.r + 0.2;
        if (d < rr && d > 1e-4 && S.pos.y - api.standOf() < k.top - 0.3) { S.pos.x = k.x + dx / d * rr; S.pos.z = k.z + dz / d * rr; }
      }
    }
    function family(dt) {
      const isNight = night(), anyCurl = fam.some((h) => h.curl > 0.02 || h.curlTo > 0);
      if (!anyCurl && !talkingHogs) loopS = (loopS + (isNight ? 0.85 : 0.32) * dt / LOOP_LEN) % 1;
      const birdNear = S.pos.distanceTo(pip.g.position) < 40;
      fam.forEach((h, k) => {
        const s = ((loopS - k * GAP) % 1 + 1) % 1; pathAt(s, pa); pathAt(s + 0.004, pb);
        const y = meshH(pa.x, pa.z); h.g.position.set(pa.x, y, pa.z);
        let want = Math.atan2(pb.x - pa.x, pb.z - pa.z);
        if (talkingHogs || h.curl > 0.02) want = Math.atan2(S.pos.x - pa.x, S.pos.z - pa.z);   // they look at her while she is here
        let d = want - h.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); h.yaw += d * Math.min(1, dt * 3); h.g.rotation.y = h.yaw;
        // the curl: quick in, slow out; out once she has gone, or once she has kept still a while
        if (h.curlTo > 0) { h.curlT += dt; const dist = h.g.position.distanceTo(S.pos); if (h.curlT > 2.5 && (dist > CURL_R || stillT > 3)) { h.curlTo = 0; } }
        h.curl += (h.curlTo - h.curl) * Math.min(1, dt * (h.curlTo > h.curl ? 9 : 2.2)); if (Math.abs(h.curl - h.curlTo) < 0.004) h.curl = h.curlTo;
        setCurl(THREE, h, h.curl);
        const moving = !anyCurl && !talkingHogs; if (moving) h.stride += dt * (isNight ? 13 : 6);
        const w = moving ? Math.sin(h.stride) : 0;
        h.g.rotation.z = w * 0.07 * (1 - h.curl); h.g.position.y += Math.abs(w) * 0.02 * h.scale;
        // the feet (world space, one draw for all three)
        for (let f = 0; f < 4; f++) {
          const sx = f % 2 ? -1 : 1, sz = f < 2 ? 1 : -1, ph = h.stride + (f === 0 || f === 3 ? 0 : Math.PI), lift = moving ? Math.max(0, Math.sin(ph)) * 0.05 : 0;
          mm.compose(v1.set(0.17 * sx, 0.04 + lift, 0.2 * sz + (moving ? Math.cos(ph) * 0.05 : 0)), QI, SC.setScalar(h.curl > 0.4 ? 0 : 1));
          h.g.updateMatrix(); mm.premultiply(h.g.matrix); feet.setMatrixAt(k * 4 + f, mm);
        }
        zzz[k].visible = !isNight && birdNear && h.curl < 0.05 && (h.role !== 'son' || !!S.seen.hogsBook);   // the joke: sleepy by day (Pip too, once his book is home)
        if (zzz[k].visible) zzz[k].position.y = 0.95 + Math.sin(S.t * 1.6 + k) * 0.06;
      });
      feet.instanceMatrix.needsUpdate = true;
    }
    function tick(dt) {
      const camD = Math.hypot(api.camera.position.x - DUNES.x, api.camera.position.z - DUNES.z);
      const show = camD < 330 && !benchHide; if (site.visible !== show) site.visible = show;
      const moved = S.pos.distanceTo(lastPos); lastPos.copy(S.pos); stillT = moved < 0.01 ? stillT + dt : 0;
      if (site.visible && camD < 220) family(dt);
      // she lands within 3 m: the hedgehogs nearest her curl up tight
      if (prevMode === 'landing' && S.mode === 'walk') for (const h of fam) if (h.g.position.distanceTo(S.pos) < CURL_R) { h.curlTo = 1; h.curlT = 0; }
      // walking up to Pip: the meeting, a reminder, a word after
      const dp = pip.g.position.distanceTo(S.pos), carrying = !!book && S.carry.includes(book);
      if (dp > 8) nearOnce = false;
      if (S.mode === 'walk' && !S.talking && S.tut === 0 && site.visible && dp < TALK_R && pip.curlTo === 0 && pip.curl < 0.05 && !carrying && !nearOnce) {
        nearOnce = true;
        if (!S.seen.hogsMet) hogSay(L.meet(), () => { S.seen.hogsMet = true; spawnBook(); api.save(); api.hud(); });
        else if (!S.seen.hogsBook) hogSay(L.remind());
        else hogSay(L.after());
      }
      zoomLook(dt);
      const zOn = !!S.lessons.zoom && zoomable() && !(ui && ui.hidden);
      if (zoomBtn.hidden === zOn) zoomBtn.hidden = !zOn;
      if (zOn) { const o = Z.t > 0 || Z.cd > 0 ? '0.5' : '1'; if (zoomBtn.style.opacity !== o) zoomBtn.style.opacity = o; }
      const rb = BOOK_PAGES_OK && !!root.WFR_PICTO && !!S.seen.hogsBook && !!pauseRow && !pauseRow.hidden;
      if (bookRow.hidden === rb) bookRow.hidden = !rb;
      const bk = bookOpen && api.panels.at() > 0; if (back.hidden === bk) back.hidden = !bk;
      prevMode = S.mode;
    }

    const API = { air: () => (Z.t > 0 && S.mode === 'fly' ? 1 : 0), pre, tick, deliver, openBook, state: () => ({ met: !!S.seen.hogsMet, returned: !!S.seen.hogsBook, bookSeen: !!S.seen.bookSeen, zoom: !!S.lessons.zoom }) };
    if (debugOn) root.WFR_HOGS.dbg = {
      state: () => ({ met: !!S.seen.hogsMet, returned: !!S.seen.hogsBook, bookSeen: !!S.seen.bookSeen, lesson: !!S.lessons.zoom, mode: S.mode, talking: !!S.talking, talkingHogs,
        zoom: { t: Z.t, cd: Z.cd, k: Z.k, hold: Z.hold, by: Z.by, starts: Z.starts, fov: api.camera.fov }, bookOpen, story: !story.hidden, at: api.panels.at(), count: api.panels.count(),
        caption: ($('caption') || {}).textContent, back: !back.hidden, readRow: !bookRow.hidden, zoomBtn: !zoomBtn.hidden, carry: S.carry.map((c) => c.type.id), opens, listeners, flag: BOOK_PAGES_OK }),
      hogs: () => fam.map((h) => ({ role: h.role, name: h.name, at: h.g.position.toArray(), curl: h.curl, curlTo: h.curlTo, scale: h.scale, visible: (() => { let o = h.g; while (o) { if (!o.visible) return false; if (o === scene) return true; o = o.parent; } return false; })(), spines: h.spines.count, drawn: h.drawn })),
      book: () => (book ? { at: book.g.getWorldPosition(new THREE.Vector3()).toArray(), held: book.held, done: book.done, inItems: api.items.includes(book), owner: book.owner.name, hog: !!book.owner.hog } : null),
      layout: () => ({ DUNES, BURROW, LOOP, BOOK_AT, rocks: rockList.filter((k) => !k.burrow).map((k) => [k.x, k.z, k.r]), names: Object.assign({}, NAMES), flag: BOOK_PAGES_OK }),
      hidden: () => JSON.parse(JSON.stringify(hidden)),
      site: () => ({ visible: site.visible, children: site.children.length, skin: !!skin.parent, rocks: rocks.count, burrow: !!burrow.parent }),
      meshH: (x, z) => meshH(x, z), dunesTerm: (x, z, h) => api.dunes.H(x, z, h),
      groundColour: (x, z) => { if (!ground) return null; const P = ground.geometry.parameters, step = P.width / P.widthSegments, ix = Math.round((x + P.width / 2) / step), iz = Math.round((z + P.width / 2) / step), i = ix + (P.widthSegments + 1) * iz, C = ground.geometry.attributes.color; return [C.getX(i), C.getY(i), C.getZ(i)]; },
      walkTo: (x, z, yaw) => { S.mode = 'walk'; S.pos.set(x, api.ground(x, z) + api.standOf(), z); if (yaw != null) S.yaw = yaw; },
      landNow: (x, z, h, yaw) => { S.mode = 'fly'; S.pos.set(x, api.ground(x, z) + (h || 3), z); S.speed = 0; S.pitch = 0; if (yaw != null) { S.yaw = yaw; S.camYaw = yaw; } $('land').hidden = false; api.doLand(); },
      zoom: () => startZoom('dbg'), ghosts: () => { const rig = api.rig(); return { legs: rig && rig.legs ? rig.legs.map((l) => l.rotation.x) : null, ghosts: Z.ghosts.filter((g) => g.visible).length, streaks: streaks.visible, dust: dust.filter((d) => d.visible).length }; },
      openBook: () => openBook(), page: (k) => page(k), show: (v) => { benchHide = !v; site.visible = !!v; },
      talkHogs: () => talkingHogs,
    };
    return API;
  }

  const WFR_HOGS = { NAMES, BOOK_PAGES_OK, DUNES, ZOOM, CURL_R, makeDunes, init, _guardOf: guard, _duneAt: duneAt };
  root.WFR_HOGS = WFR_HOGS;
  if (typeof module !== 'undefined' && module.exports) module.exports = WFR_HOGS;
}(typeof window !== 'undefined' ? window : globalThis));
