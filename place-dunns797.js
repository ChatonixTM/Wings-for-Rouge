/* place-dunns797.js - BOARD 797, DUNN'S RIVER FALLS LIKE THE REAL PLACE (Wings for Rouge). Nov 13 2026. Every number DRAFT (unmeasured on her phone).
   Marth, Nov 13 2026, with four pictures (refs-1111/dunns-river/: a bird's-eye of the beach under the jungle, photos of the falls, two Apple Maps views of
   Ocho Rios, Mammee Bay, the falls and Dolphin Cove). Our arrival there showed bland green hills and beige boxes for the falls.

   WHAT ROUGE SEES at Dunn's River (the 712 patch, world712-dunns.js, which the travel zone swaps in at its true spot, tf723Dunns):
     1 THE FALLS: pale travertine terraces stepping down the real line of the river (OpenStreetMap ways 118940007, 196031797, 196031798) from 55 m to the
       sea, about 30 small steps with curved lips, white water spilling over each and jade pools between, the water MOVING (faster on the lips), spray
       rising where it drops, the rock banks rounded and lumpy with moss at their edges; under the North Coast Highway's bridge (the A3 crosses the falls on
       the real road's line).
     2 THE JUNGLE: the ground every green it has (a canopy mottle, crowns lit and gaps dark, painted in the ground's own shader), and trees on it:
       broadleaf crowns on trunks thick round the falls, palms along the shore, flame trees (royal poinciana) in red; houses on the real residential
       streets of Ocho Rios, Mammee Bay and the hills between (white and pastel walls, red, teal and zinc roofs).
     3 THE BEACH at the falls' foot: umbrellas, loungers, people on the sand; the river running into the sea.
     4 THE REEF: turquoise shallows with dark coral patches, a reef edge with breakers, deep blue beyond (the satellite's look); surf at the shore.
     5 THE NEIGHBOURS at their OSM points: Dolphin Cove (its piers at 18.4177,-77.1300..-77.1324; pens, dolphins jumping), Mammee Bay (its resorts, the
       Riu and the Jewel), Ocho Rios (the Turtle Beach towers, a cruise ship at Reynolds Pier).
     6 LIFE: people climbing the falls in hand-holding chains, swimmers in the pools and the sea, cars on the highway (on the LEFT, as Jamaica drives).
     7 SOUND: the falls' roar was already the patch's (dunns712Roar); this adds the splash and hiss of the steps and the surf on the beach, made in code.
   Where the numbers come from: OSM (ODbL, credited on screen by the patch), read Nov 13 2026 through Overpass: the waterfall node 2064029671 at
   18.41676,-77.13992 (Wikipedia gives 18.4158,-77.1381, the park's own point; the patch's ground stands on OSM, so OSM wins); Dunns River Beach way
   746209307; the piers of Dolphin Cove (696284465..72, 262264783..92); Mammee Bay 4063529300 / 6983263060; Hotel Riu Ocho Rios 220476919; The Jewel
   371201896; Reynolds Pier 196032093; Turtle Beach Towers 247479392.

   THE BUDGET (first set at 16 draws and 330k triangles; measured on the RTX at 390x844 and reset to what the place needs): at most 24 draws of our own,
   under 450k triangles in all (the page drew 0.69M there before), the tick under 1 ms; the build in slices while she is still kilometres out (it is made
   when the patch is, 60 km out); programs compiled by the page's own compile at the patch, never at the falls.
   THE PAGE HANDS IT (one init line, beside WFR_PEOPLE724.init): { THREE, scene, renderer, camera, S, D: DUNNS712, dG: dunns712G, dData: dunns712Data,
   WATER, ac: () => ac, muted: () => muted, sunI: () => SKY.sunI, classic: () => classicLook }. It ticks itself (a keeper's onBeforeRender inside the
   patch), so it lives only while the patch is drawn. Classic is frozen (board 645): init refuses there and nothing is made. */
window.WFR_DUNNS797 = (function () {
  'use strict';
  var C = { LAYER: 7, SLICE_MS: 6, SLICE2: 8, R_NEAR: 380, R_FAR: 1250, SP_NEAR: 15, SP_FAR: 28, HOUSE_SP: 15, HOUSES: 2600, PALMS: 700, FLAMES: 160,
    BEACH_R: 300, UMB: 72, BEACH_PEOPLE: 260, SEA_SWIM: 90, POOL_SWIM: 22, CHAIN: [12, 10], CARS: 18, DOLPHINS: 6, REEF_CELL: 24, RASTER: 5, SOUND_R: [25, 360] };
  /* the real places, lat/lon (OSM, read Nov 13 2026); the guard checks each against its source point */
  var PLACES = {
    fallsTop: { lat: 18.41676, lon: -77.13992, src: 'OSM node 2064029671 (waterway=waterfall)' },
    beach: { lat: 18.41831, lon: -77.13908, src: 'OSM way 746209307 (Dunns River Beach)' },
    dolphinCove: { lat: 18.41775, lon: -77.13100, src: 'OSM piers 696284465..72 (Dolphin Cove)' },
    mammeeBay: { lat: 18.42642, lon: -77.15754, src: 'OSM node 6983263060 (natural=bay)' },
    riu: { lat: 18.43145, lon: -77.16635, src: 'OSM way 220476919 (Hotel Riu Ocho Rios)' },
    jewel: { lat: 18.43016, lon: -77.16431, src: 'OSM way 371201896 (The Jewel)' },
    jewel2: { lat: 18.42713, lon: -77.16487, src: 'OSM node 5157960566 (The Jewel Dunn\'s River)' },
    reynolds: { lat: 18.41050, lon: -77.11476, src: 'OSM way 196032093 (Reynolds Pier)' },
    turtleTowers: { lat: 18.40694, lon: -77.10950, src: 'OSM way 247479392 (Turtle Beach Towers)' },
    ochoBay: { lat: 18.41288, lon: -77.11211, src: 'OSM node 6982954060 (Ocho Rios Bay)' } };
  var X = null, T3 = null, st = { L: {}, warm: null, inited: false, why: null, fault: null, built: false, building: false, step: 0, buildMs: 0, sliceMax: 0, group: null, meshes: [], parts: {},
    edits: {}, t: 0, last: 0, ticks: 0, ms: [], msMax: 0, on: false, snd: null, sndOn: false, vol: [0, 0], uT: { value: 0 }, uL: { value: 1 }, uPx: { value: 400 }, anim: null, timer: null, local: {} };

  /* ---------- small tools ---------- */
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash2(x, z) { var s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, z) { var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
    var a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1); return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz; }
  function sm(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hexc(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; }
  var GLSL_NOISE = 'float h797(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n' +
    'float n797(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h797(i),h797(i+vec2(1.,0.)),f.x),mix(h797(i+vec2(0.,1.)),h797(i+vec2(1.,1.)),f.x),f.y);}\n' +
    'float f797(vec2 p){return n797(p)*.55+n797(p*2.03+7.1)*.3+n797(p*4.1+3.3)*.15;}\n';

  /* geometry: a list of parts { g: BufferGeometry, m: Matrix4, c: [r,g,b] or fn(vertex y, i) } merged into one non-indexed geometry with colours */
  function merge(parts) {
    var P = [], N = [], Cc = [], v = new T3.Vector3(), nm = new T3.Matrix3();
    parts.forEach(function (q) { var g = q.g.index ? q.g.toNonIndexed() : q.g; if (!g.attributes.normal) g.computeVertexNormals(); var p = g.attributes.position, n = g.attributes.normal; nm.getNormalMatrix(q.m || new T3.Matrix4());
      for (var i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); var y0 = v.y; if (q.m) v.applyMatrix4(q.m); P.push(v.x, v.y, v.z); v.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
        var c = typeof q.c === 'function' ? q.c(y0, i, P[P.length - 3], P[P.length - 2], P[P.length - 1]) : q.c; Cc.push(c[0], c[1], c[2]); } });
    var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T3.Float32BufferAttribute(N, 3)); g.setAttribute('color', new T3.Float32BufferAttribute(Cc, 3)); return g;
  }
  function M4(x, y, z, sx, sy, sz, ry, rx, rz) { var m = new T3.Matrix4(), q = new T3.Quaternion().setFromEuler(new T3.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')); m.compose(new T3.Vector3(x, y, z), q, new T3.Vector3(sx, sy == null ? sx : sy, sz == null ? sx : sz)); return m; }
  function box(w, h, d) { var g = new T3.BoxGeometry(w, h, d); return g; }
  function addMesh(m, name, o) { o = o || {}; m.name = 'dunns797:' + name; m.layers.enable(C.LAYER); m.castShadow = false; m.receiveShadow = false; if (o.cull === false) m.frustumCulled = false;
    st.group.add(m); st.meshes.push(m); return m; }
  function instanced(geo, mat, list, name, colorOf) {   // list: [{x,y,z,s,sy,ry,rx,rz,c}]
    if (!list.length) return null; var im = new T3.InstancedMesh(geo, mat, list.length), m = new T3.Matrix4(), col = new T3.Color(), x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9;
    list.forEach(function (o, i) { im.setMatrixAt(i, M4(o.x, o.y, o.z, o.s, o.sy == null ? o.s : o.sy, o.sz == null ? o.s : o.sz, o.ry || 0, o.rx || 0, o.rz || 0)); var c = colorOf ? colorOf(o) : o.c || [1, 1, 1]; col.setRGB(c[0], c[1], c[2]); im.setColorAt(i, col);
      x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x); y0 = Math.min(y0, o.y); y1 = Math.max(y1, o.y); z0 = Math.min(z0, o.z); z1 = Math.max(z1, o.z); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    geo.computeBoundingSphere(); var r0 = geo.boundingSphere ? geo.boundingSphere.radius : 1, sMax = 1; list.forEach(function (o) { sMax = Math.max(sMax, o.s, o.sy || 0); });
    geo.boundingSphere = new T3.Sphere(new T3.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + r0 * sMax + 2);   // the whole set's sphere (an instanced mesh is culled as one)
    return addMesh(im, name);
  }
  /* a Lambert material with our own lines (the game's own lights and fog, so day, dusk and night reach it) */
  function lambert(key, o, vHead, vBody, fHead, fBody, fEmit) {
    var m = new T3.MeshLambertMaterial(o); m.onBeforeCompile = function (sh) { sh.uniforms.uT797 = st.uT; sh.uniforms.uL797 = st.uL;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + (vHead || '')).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (vBody || ''));
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT797; uniform float uL797;\n' + GLSL_NOISE + (fHead || '')).replace('#include <color_fragment>', '#include <color_fragment>\n' + (fBody || ''));
      if (fEmit) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + fEmit); };
    m.customProgramCacheKey = function () { return 'dunns797:' + key; }; return m;
  }

  /* ---------- the patch's own data, read through the page's hands ---------- */
  var d = null, W0 = 1.2, HALF = 3500;
  function hG(x, z) { return X.dG(x, z); }   // metres above the sea (the falls line included)
  function hGrid(x, z) { var N = d.n, Cl = d.cell, u = Math.max(0, Math.min(N - 1.0001, (x + HALF) / Cl)), v = Math.max(0, Math.min(N - 1.0001, (z + HALF) / Cl)), i = Math.floor(u), j = Math.floor(v), a = u - i, c = v - j, k = j * N + i, A = d.H;
    return (A[k] * (1 - a) + A[k + 1] * a) * (1 - c) + (A[k + N] * (1 - a) + A[k + N + 1] * a) * c; }   // the ground grid alone (bilinear): the shore and the sea
  function local(p) { var Wd = window.WFR_WORLD, f = st.frame || (st.frame = Wd.M.frame(d.P.place)); var q = Wd.M.toLocal(f, p.lat, p.lon); return [q.x, q.z]; }
  function lines(L, r) { var out = []; for (var i = L.off[r]; i < L.off[r + 1]; i++) out.push([L.P[i * 3] * L.q[0], L.P[i * 3 + 1] * L.q[0], L.P[i * 3 + 2] * L.q[1]]); return out; }

  /* the occupancy raster (roads, houses, the falls' corridor): 5 m cells over the whole patch */
  var R = null, RN = 0;
  function rIdx(x, z) { var i = Math.floor((x + HALF) / C.RASTER), j = Math.floor((z + HALF) / C.RASTER); if (i < 0 || j < 0 || i >= RN || j >= RN) return -1; return j * RN + i; }
  function rGet(x, z) { var k = rIdx(x, z); return k < 0 ? 1 : R[k]; }
  function rStampSeg(ax, az, bx, bz, w, v) { var L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / (C.RASTER * 0.7))), r = Math.ceil(w / C.RASTER);
    for (var s = 0; s <= n; s++) { var x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n, i0 = Math.floor((x + HALF) / C.RASTER), j0 = Math.floor((z + HALF) / C.RASTER);
      for (var j = j0 - r; j <= j0 + r; j++) for (var i = i0 - r; i <= i0 + r; i++) { if (i < 0 || j < 0 || i >= RN || j >= RN) continue; var cx = -HALF + (i + 0.5) * C.RASTER, cz = -HALF + (j + 0.5) * C.RASTER; if (Math.hypot(cx - x, cz - z) <= w + C.RASTER * 0.5) R[j * RN + i] = Math.max(R[j * RN + i], v); } } }

  /* ---------- the materials, made once by name: built at boot by the warm-up (each program compiled while the page loads, the house's rule: no
     program ever compiles in flight), then handed to the build ---------- */
  function matL(k) {
    if (st.L[k]) return st.L[k];
    if (k === 'ground') return (st.L[k] = lambert('ground', { vertexColors: true }, 'attribute float aJ797; varying float vJ797; varying vec3 vP797;', 'vJ797 = aJ797; vP797 = position;',
        'varying float vJ797; varying vec3 vP797;',
        'float ca = f797(vP797.xz / 7.5), cb = n797(vP797.xz / 33.0 + 4.0), cr = smoothstep(0.32, 0.70, ca);\n' +
        'vec3 mm = mix(vec3(0.50, 0.58, 0.46), vec3(1.16, 1.12, 0.94), cr) * mix(vec3(0.86, 1.0, 0.84), vec3(1.12, 1.05, 0.86), cb);\n' +
        'diffuseColor.rgb *= mix(vec3(1.0), mm, vJ797);'));
    if (k === 'falls') return (st.L[k] = lambert('falls', { color: 0xffffff, transparent: true, depthWrite: true }, 'attribute vec4 aF797; varying vec4 vF797;', 'vF797 = aF797;', 'varying vec4 vF797;',
      'float sp7 = 0.45 + 3.6 * vF797.z;\n' +
      'float w1 = f797(vec2(vF797.y * 3.2, vF797.x * 0.42 - uT797 * sp7)), w2 = n797(vec2(vF797.y * 11.0, vF797.x * 1.5 - uT797 * sp7 * 1.8));\n' +
      'float foam = clamp(vF797.z * 1.6 * (0.5 + 0.7 * w2) + vF797.w * 0.55 + smoothstep(0.64, 0.88, w1) * 0.35 - (1.0 - vF797.z) * 0.16, 0.0, 1.0);\n' +
      'vec3 pool7 = mix(vec3(0.05, 0.15, 0.14), vec3(0.13, 0.27, 0.24), w1) + vec3(0.18) * pow(n797(vec2(vF797.y * 7.0 + uT797 * 0.4, vF797.x * 0.9 - uT797 * 0.3)), 6.0);\n' +
      'float n3 = n797(vec2(vF797.y * 15.0, vF797.x * 1.3 - uT797 * sp7 * 1.6)), n4 = n797(vec2(vF797.y * 7.0 + 3.0, vF797.x * 0.7 - uT797 * sp7 * 1.2));\n' +
      'vec3 white7 = vec3(0.94, 0.96, 0.98) * (0.84 + 0.16 * n3) * (0.90 + 0.10 * n4);\n' +   // 797 landing: the froth brighter (it read grey from the sea)
      'diffuseColor.rgb = mix(pool7, white7, foam);\n' +
      'diffuseColor.a = mix(0.84, 0.55 + 0.45 * smoothstep(0.25, 0.65, n3 * 0.6 + n4 * 0.4), foam) * (1.0 - smoothstep(0.86, 1.06, abs(vF797.y)));',
      'totalEmissiveRadiance += diffuseColor.rgb * (0.02 + 0.22 * foam) * uL797;'));
    if (k === 'reef') return (st.L[k] = lambert('reef', { color: 0xffffff, transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 },
      'attribute vec4 aF797; attribute float aE797; varying vec4 vF797; varying float vE797;', 'vF797 = aF797; vE797 = aE797;', 'varying vec4 vF797; varying float vE797;',
      'float dd = vF797.x; vec2 pp = vF797.yz; float reefD = 210.0 + 150.0 * n797(pp / 430.0 + 2.0);\n' +
      'vec3 cc = mix(vec3(0.70, 0.84, 0.72), vec3(0.36, 0.72, 0.70), smoothstep(4.0, 60.0, dd)); cc = mix(cc, vec3(0.20, 0.62, 0.66), smoothstep(60.0, 150.0, dd));\n' +
      'cc = mix(cc, vec3(0.10, 0.50, 0.62), smoothstep(70.0, reefD, dd) * 0.6);\n' +
      'float cor = f797(pp / 21.0) * 0.72 + n797(pp / 75.0 + 5.0) * 0.28;\n' +
      'float coral = smoothstep(0.50, 0.60, cor) * smoothstep(18.0, 60.0, dd) * (1.0 - smoothstep(reefD - 15.0, reefD + 35.0, dd));\n' +
      'cc = mix(cc, vec3(0.15, 0.26, 0.23), coral * 0.82);\n' +
      'float crest = 1.0 - smoothstep(0.0, 22.0, abs(dd - reefD));\n' +
      'cc = mix(cc, vec3(0.52, 0.80, 0.80), crest * 0.45);\n' +
      'cc = mix(cc, vec3(0.06, 0.20, 0.47), smoothstep(reefD + 5.0, reefD + 110.0, dd));\n' +
      'cc = mix(cc, vec3(0.035, 0.11, 0.32), smoothstep(reefD + 160.0, reefD + 700.0, dd));\n' +
      'float wv = n797(pp / 6.5 + vec2(uT797 * 0.35, uT797 * 0.21)) * n797(pp / 9.0 - vec2(uT797 * 0.26, -uT797 * 0.3));\n' +
      'cc += vec3(0.09) * smoothstep(0.34, 0.62, wv) * (1.0 - 0.5 * coral);\n' +
      'float wq = vF797.w + (f797(pp / 11.0) - 0.5) * 1.1;\n' +
      'float surf = (1.0 - smoothstep(0.0, 0.8, wq)) * smoothstep(-0.5, 0.0, wq) * (0.45 + 0.4 * sin(uT797 * 0.9 + wq * 6.0));\n' +
      'float brk = crest * smoothstep(0.58, 0.8, n797(vec2(pp.x / 13.0 + uT797 * 0.45, pp.y / 37.0))) * 0.85;\n' +
      'cc = mix(cc, vec3(0.97, 0.99, 0.99), clamp(surf + brk, 0.0, 1.0));\n' +
      'diffuseColor.rgb = cc; diffuseColor.a = vE797 * smoothstep(-1.4, -0.6, wq);',
      'totalEmissiveRadiance += diffuseColor.rgb * 0.12 * uL797;'));
    if (k === 'spray') return (st.L[k] = (function () {
      var spm = new T3.ShaderMaterial({ uniforms: T3.UniformsUtils.merge([T3.UniformsLib.fog, {}]), transparent: true, depthWrite: false, fog: true,
      vertexShader: 'uniform float uT; uniform float uPx; attribute vec4 aS; varying float vA;\n#include <fog_pars_vertex>\nvoid main(){ float ph = fract(uT * (0.28 + 0.2 * fract(aS.x * 7.3)) + aS.x);\n' +
        'vec3 p = position + vec3(aS.z, 0.0, aS.w) * ph * (1.0 + aS.y * 0.6) + vec3(sin(aS.x * 91.0 + uT * 0.7), 0.0, cos(aS.x * 57.0)) * ph * 1.2; p.y += ph * (0.8 + aS.y * 0.55);\n' +
        'vec4 mvPosition = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition; gl_PointSize = clamp((1.0 + 2.6 * ph) * (0.6 + aS.y * 0.08) * uPx / max(1.0, -mvPosition.z), 1.0, 220.0);\n' +
        'vA = sin(ph * 3.14159) * 0.22;\n#include <fog_vertex>\n}',
      fragmentShader: 'uniform float uL; varying float vA;\n#include <fog_pars_fragment>\nvoid main(){ vec2 q = gl_PointCoord - 0.5; float r = dot(q, q); if (r > 0.25) discard; gl_FragColor = vec4(vec3(0.94, 0.97, 1.0) * (0.45 + 0.55 * uL), vA * (1.0 - r * 4.0));\n#include <fog_fragment>\n}' });
      spm.uniforms.uT = st.uT; spm.uniforms.uPx = st.uPx; spm.uniforms.uL = st.uL; return spm; })());
    if (k === 'plain') return (st.L[k] = new T3.MeshLambertMaterial({ vertexColors: true }));   // merged meshes (blocks, bridge, the cove, the shore)
    if (k === 'plainD') return (st.L[k] = new T3.MeshLambertMaterial({ vertexColors: true, side: T3.DoubleSide }));   // the rock, the understory
    if (k === 'inst') return (st.L[k] = new T3.MeshLambertMaterial({ vertexColors: true }));   // every instanced mesh (each carries instance colours)
    if (k === 'instD') return (st.L[k] = new T3.MeshLambertMaterial({ vertexColors: true, side: T3.DoubleSide }));   // palms, umbrellas
    if (k === 'keeper') return (st.L[k] = new T3.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    throw new Error('797: no material ' + k);
  }
  /* the warm-up: one invisible keeper per material (and per kind: plain, instanced with colours, points) in the scene from boot, on the island's layer
     and the travel layer, drawn for three frames and then taken out; the materials stay, so their programs stay compiled */
  function warm() {
    var g = new T3.BufferGeometry(), P3 = [0, -900, 0, 0, -900, 0, 0, -900, 0]; g.setAttribute('position', new T3.Float32BufferAttribute(P3, 3)); g.setAttribute('normal', new T3.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3)); g.setAttribute('color', new T3.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3));
    g.setAttribute('aJ797', new T3.Float32BufferAttribute([0, 0, 0], 1)); g.setAttribute('aE797', new T3.Float32BufferAttribute([0, 0, 0], 1)); g.setAttribute('aF797', new T3.Float32BufferAttribute(new Array(12).fill(0), 4)); g.setAttribute('aS', new T3.Float32BufferAttribute(new Array(12).fill(0), 4));
    var W = new T3.Group(), n = 0, m4 = new T3.Matrix4(), white = new T3.Color(1, 1, 1); W.name = 'dunns797:warm';
    ['ground', 'falls', 'reef', 'plain', 'plainD', 'keeper'].forEach(function (k) { W.add(new T3.Mesh(g, matL(k))); });
    ['inst', 'instD'].forEach(function (k) { var im = new T3.InstancedMesh(g, matL(k), 1); im.setMatrixAt(0, m4); im.setColorAt(0, white); W.add(im); });
    W.add(new T3.Points(g, matL('spray')));
    W.children.forEach(function (o) { o.frustumCulled = false; o.layers.enable(C.LAYER); o.onAfterRender = function () { n++; }; });
    W.onBeforeRender = function () {}; X.scene.add(W); st.warm = { kids: W.children.length, frames: 0, done: false };
    var t0 = performance.now(), chk = function () { st.warm.frames = Math.floor(n / W.children.length); if (st.warm.frames >= 3 || performance.now() - t0 > 20000) { X.scene.remove(W); g.dispose(); st.warm.done = true; st.warm.programs = X.renderer ? X.renderer.info.programs.filter(function (q) { return /dunns797/.test(q.cacheKey || '') || /dunns797/.test(q.name || ''); }).length : null; } else requestAnimationFrame(chk); };
    requestAnimationFrame(chk);
  }

  /* ---------- 1 · THE FALLS' LINE AND ITS STEPS ---------- */
  var F = null;   // { pts: [[x,z]], s: [], h: [] (the stepped water level every 0.25 m), len, hw(s), steps: [{s0,s1,lip,drop}] }
  function fallsLine() {
    var fp = d.fp.map(function (Q) { return Q.map(function (p) { return [p.x, p.z, p.y]; }); }).filter(function (Q) { return Q.length > 3; });
    fp.sort(function (a, b) { return b[0][2] - a[0][2]; });   // top first
    var raw = []; fp.forEach(function (Q) { Q.forEach(function (p) { var l = raw[raw.length - 1]; if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.3) raw.push(p.slice()); }); });   // the culvert under the road is the straight gap between the two ways
    var cum = [0]; for (var i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    var len = cum[cum.length - 1], at = function (s) { var k = 1; while (k < cum.length - 1 && cum[k] < s) k++; var t = (s - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1]); t = Math.max(0, Math.min(1, t)); return [raw[k - 1][0] + (raw[k][0] - raw[k - 1][0]) * t, raw[k - 1][1] + (raw[k][1] - raw[k - 1][1]) * t, raw[k - 1][2] + (raw[k][2] - raw[k - 1][2]) * t]; };
    var n = Math.ceil(len) + 1, P = [], Y = []; for (var s = 0; s < n; s++) { var q = at(Math.min(len, s)); P.push([q[0], q[1]]); Y.push(q[2]); }
    var Ps = P.map(function (p, i) { if (i === 0 || i === n - 1) return p.slice(); var sx = 0, sz = 0, w = 0; for (var k = -9; k <= 9; k++) { var j = Math.max(0, Math.min(n - 1, i + k)), ww = 1 - Math.abs(k) / 10; sx += P[j][0] * ww; sz += P[j][1] * ww; w += ww; } return [sx / w, sz / w]; });   // the line, smoothed (the river's own bends kept)
    var Ys = Y.map(function (y, i) { var a = 0, w = 0; for (var k = -14; k <= 14; k++) { var j = Math.max(0, Math.min(n - 1, i + k)); a += Y[j]; w++; } return a / w; });
    Ys[0] = Y[0]; for (i = 1; i < n; i++) Ys[i] = Math.min(Ys[i - 1], Ys[i], (n - 1 - i < 30 ? Math.max(0.05, (n - 1 - i) * 0.18) : 1e9)); Ys[n - 1] = Math.min(Ys[n - 1], 0.05);   // never uphill; the last 30 m come down gently to the beach (the smoothing had lifted the mouth over the sand)
    /* the steps: a pool, then a rounded lip; 4.5-9 m each; each step's drop is the smoothed line's own drop over it */
    var r = rng(797), steps = [], s0 = 0; while (s0 < len - 3) { var L = 3 + r() * r() * 10; if (s0 + L > len - 2) L = len - s0; steps.push({ s0: s0, s1: s0 + L, lip: s0 + L * (0.62 + r() * 0.12) }); s0 += L; }
    var yAt = function (s) { var k = Math.max(0, Math.min(n - 1, s)), i0 = Math.floor(k), t = k - i0; return Ys[i0] + ((Ys[Math.min(n - 1, i0 + 1)] || 0) - Ys[i0]) * t; };
    var RES = 4, H = new Float32Array(Math.ceil(len * RES) + 2);
    steps.forEach(function (S) { S.y0 = yAt(S.s0); S.y1 = yAt(S.s1); S.drop = S.y0 - S.y1; });
    for (var q = 0; q < H.length; q++) { var sv = q / RES, Sx = null; for (var m = 0; m < steps.length; m++) if (sv >= steps[m].s0 && sv <= steps[m].s1 + 1e-6) { Sx = steps[m]; break; } if (!Sx) Sx = steps[steps.length - 1];
      var y; if (sv < Sx.lip) y = Sx.y0 - Sx.drop * 0.06 * (sv - Sx.s0) / Math.max(0.1, Sx.lip - Sx.s0); else { var u = (sv - Sx.lip) / Math.max(0.1, Sx.s1 - Sx.lip); y = Sx.y0 - Sx.drop * (0.06 + 0.94 * (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u))) + Sx.drop * 0.16 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u); }   // each lip a rounded bulge of stone the water rolls over
      H[q] = Math.max(-0.2, y); }
    F = { P: Ps, n: n, len: len, H: H, RES: RES, steps: steps, top: Y[0] };
    F.hAt = function (s) { var k = Math.max(0, Math.min(H.length - 1.001, s * RES)), i0 = Math.floor(k); return H[i0] + (H[i0 + 1] - H[i0]) * (k - i0); };
    F.hw = function (s) { var u = s / len; return 10.5 + 9 * Math.pow(u, 1.4) + 2.2 * Math.sin(s * 0.071 + 1.3) + 1.0 * Math.sin(s * 0.19); };   // 21-40 m across: the real falls fan wide over the stone
    F.at = function (s) { var k = Math.max(0, Math.min(n - 1.001, s)), i0 = Math.floor(k), t = k - i0, a = Ps[i0], b = Ps[Math.min(n - 1, i0 + 1)]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
    F.dir = function (s) { var a = F.at(Math.max(0, s - 1.5)), b = F.at(Math.min(len, s + 1.5)), dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    F.wob = function (s, t) { return 2.3 * Math.sin(3.4 * t + 0.11 * s) + 1.5 * Math.sin(5.6 * t + 1.3 + s * 0.21) + 1.1 * Math.sin(2.1 * t + s * 0.07); };   // the lips break into overlapping rounded lobes, 6-10 m each (never a straight weir); d/ds stays under 1, so every lobe still runs downhill
    F.surf = function (s, t) { return F.hAt(Math.max(0, Math.min(len, s + F.wob(s, t)))); };
    st.parts.steps = steps.length; st.parts.fallsLen = Math.round(len); st.parts.fallsDrop = +(Y[0] - Ys[n - 1]).toFixed(1);
  }
  /* the patch's falls line follows our steps, so her floor and the patch's people stand on the water we draw (dunns712G reads d.fp live) */
  function fallsFloor() { var moved = 0; d.fp.forEach(function (Q) { Q.forEach(function (p) { var best = 1e9, bs = 0; for (var s = 0; s < F.n; s += 1) { var q = F.P[s], e = (q[0] - p.x) * (q[0] - p.x) + (q[1] - p.z) * (q[1] - p.z); if (e < best) { best = e; bs = s; } } if (best < 64) { p.y = F.hAt(bs) + 0.4; moved++; } }); }); st.edits.fp = moved; }

  /* ---------- 2 · THE PATCH'S OWN MESHES: the jungle on the ground, the beige boxes gone, the old falls ribbon gone, the sea's colours ---------- */
  /* 797 landing: the baked ground has a few low 'islands' off the beach (1-2 m, 28 m squares: the reef flats read as land by the terrain); the real
     coast has none. Every low land patch not joined to Jamaica and not touching the patch's edge goes under the sea as a shallow flat. */
  function sinkFlats(ground) {
    var N = d.n, H = d.H, lab = new Int32Array(N * N).fill(-1), comps = [], k, q;
    for (k = 0; k < N * N; k++) { if (H[k] <= 0.25 || lab[k] >= 0) continue; var id = comps.length, cells = [], stk = [k], mx = 0, edge = false; lab[k] = id;
      while (stk.length) { q = stk.pop(); cells.push(q); mx = Math.max(mx, H[q]); var i = q % N, j = (q / N) | 0; if (i === 0 || j === 0 || i === N - 1 || j === N - 1) edge = true;
        if (i > 0 && H[q - 1] > 0.25 && lab[q - 1] < 0) { lab[q - 1] = id; stk.push(q - 1); } if (i < N - 1 && H[q + 1] > 0.25 && lab[q + 1] < 0) { lab[q + 1] = id; stk.push(q + 1); }
        if (j > 0 && H[q - N] > 0.25 && lab[q - N] < 0) { lab[q - N] = id; stk.push(q - N); } if (j < N - 1 && H[q + N] > 0.25 && lab[q + N] < 0) { lab[q + N] = id; stk.push(q + N); } }
      comps.push({ cells: cells, mx: mx, edge: edge }); }
    var big = 0; comps.forEach(function (c, i) { if (c.cells.length > comps[big].cells.length) big = i; });
    var P = ground && ground.geometry.attributes.position, Cc = ground && ground.geometry.attributes.color, sunk = 0, flats = 0;
    comps.forEach(function (c, i) { if (i === big || c.edge || c.mx > 3 || c.cells.length > 400) return; flats++;
      c.cells.forEach(function (q) { H[q] = -1.2; sunk++; if (P) P.setY(q, W0 - 1.2); if (Cc) Cc.setXYZ(q, 0.55, 0.62, 0.50); }); });
    if (P) { P.needsUpdate = true; ground.geometry.computeBoundingSphere(); } if (Cc) Cc.needsUpdate = true; st.edits.sunk = sunk; st.edits.flats = flats;
  }
  function* patchEdits() {
    var D = X.D, byName = function (n) { for (var i = 0; i < D.meshes.length; i++) if (D.meshes[i].name === 'dunns712:' + n) return D.meshes[i]; return null; };
    var ground = byName('ground'), over = byName('overlay'), water = byName('water'), sea = byName('sea'), col = new T3.Color(), tmp = new T3.Color();
    st.edits.names = D.meshes.map(function (m) { return m.name; }); sinkFlats(ground);
    if (ground) { var g = ground.geometry, P = g.attributes.position, Cc = g.attributes.color, Nn = g.attributes.normal, J = new Float32Array(P.count);
      for (var k = 0; k < P.count; k++) { if ((k & 1023) === 0 && slow797()) yield; var x = P.getX(k), z = P.getZ(k), h = d.H[k], c = d.cls[k]; if (c === 9 || h <= 0.25) continue;
        var ny = Nn.getY(k), sand = h < 2.6 && c !== 1 ? sm(2.6, 1.0, h) : (c === 1 ? 1 : 0), big = vnoise(x / 260, z / 260), mid = vnoise(x / 70 + 9, z / 70);
        col.setRGB(0.20, 0.38, 0.15).lerp(tmp.setRGB(0.30, 0.47, 0.19), big).lerp(tmp.setRGB(0.16, 0.31, 0.15), 0.45 * mid).lerp(tmp.setRGB(0.19, 0.33, 0.20), sm(150, 450, h) * 0.5);
        col.lerp(tmp.setRGB(0.56, 0.55, 0.47), 0.45 * sm(0.80, 0.55, ny));   // limestone shows on the steepest ground
        col.lerp(tmp.setRGB(0.90, 0.84, 0.66), sand);   // the shore's sand stays sand
        Cc.setXYZ(k, col.r, col.g, col.b); J[k] = (1 - sand) * (1 - 0.6 * sm(0.80, 0.55, ny)); }
      Cc.needsUpdate = true; g.setAttribute('aJ797', new T3.BufferAttribute(J, 1));
      ground.material = matL('ground');
      st.edits.ground = P.count; }
    if (over) { var og = over.geometry, oP = og.attributes.position, oC = og.attributes.color, nA = d.acls.length * 3, nT = (d.terr.length / 7 | 0) * 30, GREEN = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 7: 1 }, gone = 0;
      var collapse = function (v0) { var x = oP.getX(v0), y = oP.getY(v0) - 30, z = oP.getZ(v0); for (var q = 0; q < 3; q++) oP.setXYZ(v0 + q, x, y, z); gone++; };
      for (var t = 0; t < d.acls.length; t++) if (GREEN[d.acls[t]]) collapse(t * 3);   // the lime park and forest polygons (the jungle ground is under them) and the sand polygons (the ground is sand by its height; their corners rode up the falls line as tents)
      for (var v = oP.count - nT; v < oP.count; v += 3) collapse(v);   // the beige terrace boxes (the last of the overlay, 15 x 5 faces): our travertine replaces them
      var ROADC = [[0xf6e09a, 0x5f6062], [0xf8e7b0, 0x626365], [0xf3e9c6, 0x6c6c6e], [0xeee3c0, 0x76767a], [0xb59a52, 0xd9d6c9], [0x9c9a64, 0xc9c6b6], [0xe6d8ae, 0xa88f6a]].map(function (p) { return [hexc(p[0]), hexc(p[1])]; });
      for (v = nA; v < oP.count - nT; v++) { var r0 = oC.getX(v), g0 = oC.getY(v), b0 = oC.getZ(v), best = 1e9, to = null; ROADC.forEach(function (p) { var e = Math.abs(p[0][0] - r0) + Math.abs(p[0][1] - g0) + Math.abs(p[0][2] - b0); if (e < best) { best = e; to = p[1]; } });
        if (to && best < 0.06) oC.setXYZ(v, to[0], to[1], to[2]); }   // the roads: asphalt with pale edges, the paths earth (no more cream ribbons)
      oP.needsUpdate = true; oC.needsUpdate = true; st.edits.overlay = gone; }
    if (water && water.geometry.index) { var ix = water.geometry.index, hid = 0; (D.wRanges || []).forEach(function (wr) { if (wr.k !== 4) return; for (var i = wr.i0; i < wr.i0 + wr.ni; i++) { ix.setX(i, wr.v0); hid++; } }); ix.needsUpdate = true; st.edits.fallsRibbon = hid; }
    var air = byName('air'); if (air && air.geometry.attributes.aB) { var aB = air.geometry.attributes.aB, aP = air.geometry.attributes.position, mist = 0;   // the patch's old mist cards over the falls (white quads on the old line): our spray replaces them; the other falls keep theirs
      for (var mi = 0; mi < aB.count; mi++) { if (aB.getW(mi) !== 2) continue; var mx = aP.getX(mi), mz = aP.getZ(mi), near = false; for (var fs = 0; fs < F.n && !near; fs += 4) near = Math.hypot(F.P[fs][0] - mx, F.P[fs][1] - mz) < 40; if (near) { aB.setY(mi, 0); mist++; } }
      aB.needsUpdate = true; st.edits.mist = mist; }
    st.seaMesh = sea; if (sea) { st.edits.seaY = [sea.position.y]; sea.position.y -= 0.7; st.edits.seaY.push(sea.position.y); }   // the patch's sea plane rode over the low beach (a band of old teal at every shore): it sinks under ours, which carries the shallows
  }

  /* ---------- 3 · THE CASCADE: travertine, water, spray ---------- */
  function* cascade() {
    var TS = [-2.1, -1.75, -1.42, -1.12, -1.0].concat(Array.from({ length: 19 }, function (_, i) { return -0.9 + i * 0.1; })).concat([1.0, 1.12, 1.42, 1.75, 2.1]), NT = TS.length, DS = 0.6, ns = Math.ceil(F.len / DS) + 1;
    var rP = [], rC = [], rI = [], wP = [], wF = [], wI = [], col = new T3.Color(), tmp = new T3.Color(), TRAV = new T3.Color(0xddd6c3), WET = new T3.Color(0x9c9786), TAN = new T3.Color(0xcbbd9f), MOSS = new T3.Color(0x6b7a46), DARK = new T3.Color(0x8f8b7b), FLOOR = new T3.Color(0x34552a);
    var WTS = Array.from({ length: 37 }, function (_, i) { return -1.06 + i * 2.12 / 36; }), NW = WTS.length;   // 1-1.5 m columns: the lips curve across the falls, so the grid must be finer than a lip's bend
    for (var a = 0; a < ns; a++) { if (slow797()) yield; var s = Math.min(F.len, a * DS), c = F.at(s), dr = F.dir(s), nx = -dr[1], nz = dr[0], hw = F.hw(s);
      for (var j = 0; j < NT; j++) { var t = TS[j], at = Math.abs(t), off = at <= 1 ? t * hw : (t < 0 ? -1 : 1) * (hw + (at - 1) / 1.1 * (3.5 + 0.22 * hw)), x = c[0] + nx * off, z = c[1] + nz * off, y, lump = vnoise(x * 0.35, z * 0.35), side = t < 0 ? 0 : 1;
        var poke = at <= 0.95 ? Math.max(0, vnoise(x * 0.42 + 5, z * 0.42) - 0.56) / 0.44 : 0;   // rounded travertine heads standing out of the water (the photos' pale rocks between the white)
        if (at <= 1.0) y = F.surf(s, t) - 0.32 - 0.25 * lump + 0.8 * poke;
        else { var u = (at - 1) / 1.1, gr = hG(x, z), mound = F.surf(s, t < 0 ? -1 : 1) + 0.25 + 1.2 * Math.max(0, vnoise(x * 0.16 + 2, z * 0.16) - 0.25) + 0.5 * lump;   // low rounded travertine mounds at the edge (no walls), then the ground
          var fan = sm(1.0, 4.0, F.hAt(s) - gr);   // where the falls stand above the low ground (the mouth), the edge falls away as a long rocky fan, never a curb or a cliff
          y = at >= 2.09 ? gr - 0.6 : mound * (1 - sm(0.3 - 0.3 * fan, 1, u)) + (gr - 0.3) * sm(0.3 - 0.3 * fan, 1, u);
          var bank = sm(0.6, 3.0, mound - gr) * (at >= 2.09 ? 0 : Math.sin(Math.PI * Math.min(1, u)));   // 797 landing: a tall bank's face, lumpy (roots and boulders), never one flat plane
          y += bank * 1.1 * (vnoise(x * 0.33 + 7, z * 0.33) - 0.45); }
        rP.push(x, W0 + y, z);
        var lip = at <= 1 ? Math.min(1, Math.abs(F.surf(s + 0.6, t) - F.surf(s - 0.6, t)) / 0.9) : 0;
        col.copy(TRAV).lerp(TAN, 0.5 * vnoise(x * 0.2 + 3, z * 0.2)).lerp(DARK, 0.25 * vnoise(x * 0.9, z * 0.9));
        if (at <= 1.0) col.lerp(WET, (0.6 - 0.35 * lip) * (1 - 0.8 * Math.min(1, poke * 2.5))).lerp(DARK, 0.25 * vnoise(x * 0.5 + 11, z * 0.5) * (1 - poke)); else { var bk = sm(0.6, 3.0, F.hAt(s) - gr);   // 797 landing: the higher the falls stand over the ground beside them, the greener their outer bank (moss, ferns, earth)
          col.lerp(MOSS, Math.min(1, 0.9 * sm(1.45 - 0.35 * bk, 1.95 - 0.5 * bk, at) * (0.5 + 0.5 * vnoise(x * 0.15, z * 0.15)) + 0.35 * bk)).lerp(FLOOR, Math.max(sm(1.85, 2.1, at), 0.75 * bk * sm(1.15, 1.6, at))); }
        rC.push(col.r, col.g, col.b); }
      for (var k = 0; k < NW; k++) { var tw = WTS[k], xw = c[0] + nx * tw * hw, zw = c[1] + nz * tw * hw, yw = F.surf(s, tw), sl = Math.min(1, Math.abs(F.surf(s + 0.9, tw) - F.surf(s - 0.9, tw)) / 1.4);
        var lipK = Math.min(1, Math.max(0, (F.surf(s - 2.2, tw) - yw) / 0.8)) * (1 - sl * 0.5);   // the white sheet runs on a little past each lip's foot
        wP.push(xw, W0 + yw + 0.06 + 0.12 * sl, zw); wF.push(s, tw, sl, lipK); } }
    for (a = 0; a < ns - 1; a++) { for (j = 0; j < NT - 1; j++) { var i0 = a * NT + j; rI.push(i0, i0 + 1, i0 + NT, i0 + 1, i0 + NT + 1, i0 + NT); }
      for (k = 0; k < NW - 1; k++) { var w0 = a * NW + k; wI.push(w0, w0 + 1, w0 + NW, w0 + 1, w0 + NW + 1, w0 + NW); } }
    var rg = new T3.BufferGeometry(); rg.setAttribute('position', new T3.Float32BufferAttribute(rP, 3)); rg.setAttribute('color', new T3.Float32BufferAttribute(rC, 3)); rg.setIndex(rI); rg.computeVertexNormals();
    addMesh(new T3.Mesh(rg, matL('plainD')), 'rock');   // wound to face up; both sides lit (a bank's outer wall can face away)
    var wg = new T3.BufferGeometry(); wg.setAttribute('position', new T3.Float32BufferAttribute(wP, 3)); wg.setAttribute('aF797', new T3.Float32BufferAttribute(wF, 4)); wg.setIndex(wI); wg.computeVertexNormals();
    var wm = matL('falls');
    var wmesh = addMesh(new T3.Mesh(wg, wm), 'falls'); wmesh.renderOrder = 2;
    /* the spray: where each step drops, mist that rises and drifts and fades */
    var sP = [], sA = [], r = rng(7971);
    F.steps.forEach(function (S) { if (S.drop < 0.5) return; var nP = Math.min(26, Math.round(S.drop * 8)), sMid = (S.lip + S.s1) / 2, hw = F.hw(sMid);
      for (var q = 0; q < nP; q++) { var t = (r() * 2 - 1) * 0.95, c = F.at(S.s1 + r() * 1.5), dr = F.dir(S.s1), nx = -dr[1], nz = dr[0]; sP.push(c[0] + nx * t * hw, W0 + F.surf(S.s1 + 1, t) + 0.2, c[1] + nz * t * hw); sA.push(r(), S.drop, dr[0], dr[1]); } });
    var spg = new T3.BufferGeometry(); spg.setAttribute('position', new T3.Float32BufferAttribute(sP, 3)); spg.setAttribute('aS', new T3.Float32BufferAttribute(sA, 4));
    var spm = matL('spray');
    var spr = addMesh(new T3.Points(spg, spm), 'spray'); spr.renderOrder = 3; st.parts.spray = sP.length / 3;
    st.parts.rockTris = rI.length / 3; st.parts.waterTris = wI.length / 3; var nl = 0, nw = 0; for (var qq = 0; qq < wF.length; qq += 4) { if (wF[qq + 2] > 0.3) nl++; if (wF[qq + 3] > 0.5) nw++; } st.parts.lipFrac = +(nl / (wF.length / 4)).toFixed(2); st.parts.churnFrac = +(nw / (wF.length / 4)).toFixed(2);
    for (a = 0; a < F.n; a += 2) { var cc = F.at(a); rStampSeg(cc[0], cc[1], cc[0], cc[1], F.hw(a) * 1.25 + 1.5, 3); }   // the corridor: nothing grows or stands in the falls
  }

  /* ---------- 4 · THE REEF WATER ---------- */
  function* reef() {
    var CELL = C.REEF_CELL, X0 = -2600, X1 = 3400, Z0 = -2200, Z1 = 1300, nx = Math.round((X1 - X0) / CELL) + 1, nz = Math.round((Z1 - Z0) / CELL) + 1;
    /* the distance to the shore (a chamfer pass over the same grid): land 0, sea grows */
    var Dd = new Float32Array(nx * nz), Hh = new Float32Array(nx * nz), BIG = 1e6;
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) { if ((i & 31) === 0 && slow797()) yield; var x = X0 + i * CELL, z = Z0 + j * CELL, h = Math.abs(x) < HALF - 1 && Math.abs(z) < HALF - 1 ? hG(x, z) : hGrid(x, z); Hh[j * nx + i] = h; Dd[j * nx + i] = h > 0.2 ? 0 : BIG; }
    var a1 = CELL, a2 = CELL * Math.SQRT2;
    for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) { var k = j * nx + i, v = Dd[k]; if (i > 0) v = Math.min(v, Dd[k - 1] + a1); if (j > 0) { v = Math.min(v, Dd[k - nx] + a1); if (i > 0) v = Math.min(v, Dd[k - nx - 1] + a2); if (i < nx - 1) v = Math.min(v, Dd[k - nx + 1] + a2); } Dd[k] = v; }
    for (j = nz - 1; j >= 0; j--) for (i = nx - 1; i >= 0; i--) { k = j * nx + i; v = Dd[k]; if (i < nx - 1) v = Math.min(v, Dd[k + 1] + a1); if (j < nz - 1) { v = Math.min(v, Dd[k + nx] + a1); if (i < nx - 1) v = Math.min(v, Dd[k + nx + 1] + a2); if (i > 0) v = Math.min(v, Dd[k + nx - 1] + a2); } Dd[k] = v; }
    var P = [], Fv = [], E = [], I = [], map = new Int32Array(nx * nz).fill(-1), nv = 0;
    for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) { if ((i & 31) === 0 && slow797()) yield; k = j * nx + i; x = X0 + i * CELL; z = Z0 + j * CELL;
      var edge = Math.min(sm(0, 520, x - X0), sm(0, 520, X1 - x), sm(0, 520, z - Z0), sm(0, 320, Z1 - z)), land = Hh[k] > 0.2;   // the water runs a little under the beach (the ground hides it): no sliver of the old sea at the shore
      map[k] = nv++; P.push(x, W0 + 0.09, z); Fv.push(land ? -CELL * 0.5 : Dd[k] - CELL * 0.5, x, z, -Hh[k]); E.push(edge); }   // w: the signed depth (negative on land): the shore is cut where it crosses 0 inside each cell, never on the cells' stairs
    for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) { if ((i & 31) === 0 && slow797()) yield; k = j * nx + i; var q = [k, k + 1, k + nx, k + nx + 1]; if (q.every(function (m) { return Hh[m] > 0.6; })) continue; I.push(map[k], map[k + nx], map[k + 1], map[k + 1], map[k + nx], map[k + nx + 1]); }
    var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(P, 3)); g.setAttribute('aF797', new T3.Float32BufferAttribute(Fv, 4)); g.setAttribute('aE797', new T3.Float32BufferAttribute(E, 1)); g.setIndex(I);
    g.setAttribute('normal', new T3.Float32BufferAttribute(new Float32Array(P.length).map(function (_, n) { return n % 3 === 1 ? 1 : 0; }), 3));
    var m = matL('reef');
    var mesh = addMesh(new T3.Mesh(g, m), 'reef'); mesh.renderOrder = 1; st.parts.reefTris = I.length / 3;
    var sea = st.seaMesh; if (sea && sea.geometry.attributes.color) { var sg = sea.geometry, sp = sg.attributes.position, sc = sg.attributes.color, TQ = new T3.Color(0x3fb8b4), DEEP = new T3.Color(0x0c2a66), NAVY = new T3.Color(0x08204f), cS = new T3.Color();   // the patch's own sea under ours: turquoise inside the reef, deep blue past it (by the distance to the shore, as ours)
      for (var i2 = 0; i2 < sp.count; i2++) { var x2 = sp.getX(i2), z2 = -sp.getY(i2), i3 = Math.round((x2 - X0) / CELL), j3 = Math.round((z2 - Z0) / CELL), dS = i3 >= 0 && j3 >= 0 && i3 < nx && j3 < nz ? Dd[j3 * nx + i3] : 900;
        cS.copy(TQ).lerp(DEEP, sm(240, 420, dS)).lerp(NAVY, sm(500, 1200, dS)); sc.setXYZ(i2, cS.r, cS.g, cS.b); } sc.needsUpdate = true; st.edits.sea = sp.count; }
    st.shoreD = function (x, z) { var i = Math.round((x - X0) / CELL), j = Math.round((z - Z0) / CELL); if (i < 0 || j < 0 || i >= nx || j >= nz) return 9999; return Dd[j * nx + i]; };
  }

  /* ---------- 5 · BUILT THINGS: houses on the real streets, the resorts, the towers, the cruise ship, the bridge ---------- */
  var WALLS = [0xf4f1e8, 0xf2ead2, 0xf3e2b0, 0xf0c9c0, 0xc9e6d4, 0xbfd8ea, 0xf6efe0, 0xe8d7a6, 0xffffff].map(hexc), ROOFS = [0xa8452f, 0xb5573a, 0x3f7f72, 0x9a9fa3, 0x8d9296, 0xe9e6dc, 0x6e3b2c, 0x2f6f8a].map(hexc);
  function houseGeo() { var walls = merge([{ g: box(1, 1, 1), m: M4(0, 0.5, 0, 1), c: function (y) { return y > 0 ? [1, 1, 1] : [0.86, 0.86, 0.84]; } }]);
    var rf = new T3.ConeGeometry(0.8, 0.42, 4, 1, true); var roof = merge([{ g: rf, m: M4(0, 1.2, 0, 1, 1, 1, Math.PI / 4), c: function (y) { return y > 0 ? [1, 1, 1] : [0.8, 0.8, 0.8]; } }]); return [walls, roof]; }
  function windowed(x, z, w, dpt, h, ry, wall, glass, floorH, out) {   // a block with its floors banded (balconies and glass), merged into out
    var nF = Math.max(1, Math.round(h / floorH)); for (var f = 0; f < nF; f++) { var y0 = f * floorH; out.push({ g: box(w, floorH * 0.55, dpt), m: M4(x, y0 + floorH * 0.275, z, 1, 1, 1, ry), c: wall }); out.push({ g: box(w * 0.985, floorH * 0.45, dpt * 0.985), m: M4(x, y0 + floorH * 0.775, z, 1, 1, 1, ry), c: glass }); }
    out.push({ g: box(w * 1.02, 0.6, dpt * 1.02), m: M4(x, nF * floorH + 0.3, z, 1, 1, 1, ry), c: wall }); }
  function* roadsRaster() { var RD = d.roads; for (var q = 0; q < RD.n; q++) { if ((q & 7) === 0 && slow797()) yield; var pts = lines(RD, q), w = RD.w[q] / 10; for (var i = 1; i < pts.length; i++) rStampSeg(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w / 2 + 1.5, 1); } }   // the roads into the raster first (nothing stands or grows on a road)
  function* built() {
    var r = rng(79705), houses = [], RD = d.roads;
    var q, pts, w, i;   // the roads went into the raster one step (one frame) earlier: roadsRaster
    /* the houses along the residential and tertiary streets (Ocho Rios, Mammee Bay, the hills), both sides */
    for (q = 0; q < RD.n && houses.length < C.HOUSES; q++) { if (slow797()) yield; var k = RD.k[q]; if (k !== 4 && k !== 3 && k !== 5) continue; pts = lines(RD, q); w = RD.w[q] / 10; var acc = r() * C.HOUSE_SP;
      for (i = 1; i < pts.length && houses.length < C.HOUSES; i++) { var ax = pts[i - 1][0], az = pts[i - 1][1], bx = pts[i][0], bz = pts[i][1], L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue; var ux = (bx - ax) / L, uz = (bz - az) / L;
        for (var s = acc; s < L; s += C.HOUSE_SP * (0.8 + r() * 0.5)) { acc = 0; for (var sd = -1; sd <= 1; sd += 2) { if (r() < (k === 5 ? 0.6 : 0.22)) continue;
          var hw = 4 + r() * 3.5, hd = 4 + r() * 3, off = w / 2 + 3 + hd + r() * 3, x = ax + ux * s - uz * off * sd, z = az + uz * s + ux * off * sd, h0 = hG(x, z);
          if (h0 < 1.8 || Math.abs(x) > HALF - 60 || Math.abs(z) > HALF - 60) continue; var slope = Math.abs(hG(x + 6, z) - hG(x - 6, z)) + Math.abs(hG(x, z + 6) - hG(x, z - 6)); if (slope > 9) continue;
          if (rGet(x, z) || rGet(x + hw, z) || rGet(x - hw, z) || rGet(x, z + hd) || rGet(x, z - hd)) continue;
          var fl = r() < 0.25 ? 2 : 1, ht = fl * (2.9 + r() * 0.5); houses.push({ x: x, y: W0 + h0 - 0.6, z: z, s: hw * 2, sy: ht + 0.6, sz: hd * 2, ry: Math.atan2(ux, uz) + (r() - 0.5) * 0.1, c: WALLS[(r() * WALLS.length) | 0], rc: ROOFS[(r() * ROOFS.length) | 0] });
          rStampSeg(x, z, x, z, Math.max(hw, hd) + 1.5, 2); } } } }
    /* the shops and cafes behind the falls' beach (Marth's 01: white buildings by the shore, left of the falls) */
    var foot = F.at(F.len), sh = 0; for (var tries = 0; tries < 80 && sh < 9; tries++) { var a = Math.PI * (0.5 + r()), rr = 45 + r() * 95, x2 = foot[0] + Math.cos(a) * rr * 1.3 - 40, z2 = foot[1] + Math.sin(a) * rr * 0.5 + 30, h2 = hG(x2, z2);
      if (h2 < 2.2 || h2 > 22 || rGet(x2, z2)) continue; houses.push({ x: x2, y: W0 + h2 - 0.6, z: z2, s: 9 + r() * 6, sy: 3.4 + r() * 2.5, sz: 7 + r() * 4, ry: 0.2 + r() * 0.3, c: hexc(r() < 0.6 ? 0xffffff : 0xf3e2b0), rc: hexc(r() < 0.5 ? 0x2f6f8a : 0xa8452f) }); rStampSeg(x2, z2, x2, z2, 8, 2); sh++; }
    var HG = houseGeo(), mat = matL('inst');
    instanced(HG[0], mat, houses, 'houses'); instanced(HG[1], mat, houses.map(function (o) { return { x: o.x, y: o.y + o.sy - 1.0 * o.sy, z: o.z, s: o.s, sy: o.sy, sz: o.sz, ry: o.ry, c: o.rc }; }), 'roofs');
    st.parts.houses = houses.length;
  }
  function built2() {   /* 797 landing: its own step (one frame each half: the worst step was 54 ms on a loaded desktop) */
    var RD = d.roads, q, pts, k, i, s;
    /* the resorts, the towers and the cruise ship: one merged mesh of banded blocks */
    var B = [], WHITE = [0.96, 0.95, 0.92], CREAM = [0.95, 0.90, 0.78], GLASS = [0.36, 0.48, 0.55], SALM = [0.93, 0.80, 0.70];
    var block = function (p, dx, dz, w2, dp, h, ry, wall) { var L = local(p), x = L[0] + dx, z = L[1] + dz, y = W0 + Math.max(0.5, hG(x, z)) - 1; var out = []; windowed(0, 0, w2, dp, h, 0, wall, GLASS, 3.1, out);
      out.forEach(function (o) { o.m = M4(x, y, z, 1, 1, 1, ry).multiply(o.m); B.push(o); }); rStampSeg(x, z, x, z, Math.max(w2, dp) * 0.6 + 4, 2); };
    block(PLACES.riu, 0, 0, 90, 20, 22, 0.35, WHITE); block(PLACES.riu, -70, 40, 50, 18, 16, 0.6, CREAM);
    block(PLACES.jewel, 0, 0, 70, 18, 19, 0.15, SALM); block(PLACES.jewel2, 0, 0, 60, 16, 13, -0.2, CREAM); block(PLACES.jewel2, 50, -30, 40, 16, 13, 0.4, WHITE);
    block(PLACES.mammeeBay, -40, 120, 55, 16, 16, 0.1, WHITE);
    [[0, 0], [38, 22], [-34, 30], [8, 52]].forEach(function (o, n) { block(PLACES.turtleTowers, o[0], o[1], 20, 20, 38 + n * 4, 0.5, WHITE); });
    /* the cruise ship at Reynolds Pier: 300 m, white decks over a dark blue hull, a red-and-black funnel */
    var pier = local(PLACES.reynolds), sx = pier[0] + 10, sz = pier[1] - 70, ry = 1.05, sm4 = M4(sx, W0, sz, 1, 1, 1, ry), add = function (g, m, c) { B.push({ g: g, m: sm4.clone().multiply(m), c: c }); };
    add(box(36, 14, 290), M4(0, 3, 0, 1), [0.12, 0.18, 0.32]); add(box(34, 1.2, 270), M4(0, 10.6, 0, 1), WHITE);
    for (var dk = 0; dk < 8; dk++) { var ln = 250 - dk * 14; add(box(32 - dk * 0.6, 1.9, ln), M4(0, 12 + dk * 3, -8 + dk * 2, 1), WHITE); add(box(32.3 - dk * 0.6, 1.0, ln * 0.98), M4(0, 13.4 + dk * 3, -8 + dk * 2, 1), [0.25, 0.32, 0.42]); }
    add(new T3.CylinderGeometry(4, 5, 14, 8), M4(0, 43, 40, 1), [0.75, 0.12, 0.12]); add(new T3.CylinderGeometry(4.05, 4.05, 3, 8), M4(0, 51.5, 40, 1), [0.08, 0.08, 0.09]);
    add(box(26, 0.4, 40), M4(0, 36.5, -90, 1), [0.25, 0.62, 0.78]);   // the pool deck's blue
    B.push({ g: box(14, 2, 180), m: M4(pier[0] - 12, W0 + 0.6, pier[1] - 30, 1, 1, 1, ry), c: [0.70, 0.68, 0.62] });   // the pier itself
    instancedOnce(merge(B), 'blocks'); st.parts.blocks = B.length;
    /* the North Coast Highway's bridge over the falls: where the real road crosses the falls' line */
    var best = null; for (q = 0; q < RD.n; q++) { k = RD.k[q]; if (k > 2) continue; pts = lines(RD, q); for (i = 1; i < pts.length; i++) { if (Math.min(Math.hypot(pts[i][0] - F.P[0][0], pts[i][1] - F.P[0][1]), Math.hypot(pts[i][0] - F.P[F.n - 1][0], pts[i][1] - F.P[F.n - 1][1])) > 320) continue; for (s = 0; s < F.len; s += 1) { var c3 = F.at(s), e = segDist(c3[0], c3[1], pts[i - 1], pts[i]); if (!best || e.d < best.d) best = { d: e.d, s: s, q: q, i: i, p: e.p, w: RD.w[q] / 10, y: pts[i - 1][2] + (pts[i][2] - pts[i - 1][2]) * e.t, a: pts[i - 1], b: pts[i] }; } } }
    if (best && best.d < 12) { var dx = best.b[0] - best.a[0], dz = best.b[1] - best.a[1], l = Math.hypot(dx, dz) || 1, ryB = Math.atan2(dx / l, dz / l), yD = W0 + Math.max(best.y, F.hAt(best.s) + 5.5), span = F.hw(best.s) * 2 + 16, wB = best.w + 3, BB = [];
      var bm = M4(best.p[0], yD, best.p[1], 1, 1, 1, ryB), CON = [0.80, 0.78, 0.72], RAIL = [0.93, 0.91, 0.86];
      BB.push({ g: box(wB, 1.5, span), m: bm.clone().multiply(M4(0, -0.6, 0, 1)), c: CON }); BB.push({ g: box(wB - 0.6, 0.12, span), m: bm.clone().multiply(M4(0, 0.17, 0, 1)), c: [0.36, 0.36, 0.38] });
      [-1, 1].forEach(function (sd) { BB.push({ g: box(0.35, 1.1, span), m: bm.clone().multiply(M4(sd * (wB / 2 - 0.2), 0.75, 0, 1)), c: RAIL }); BB.push({ g: box(0.5, 0.25, span), m: bm.clone().multiply(M4(sd * (wB / 2 - 0.2), 1.35, 0, 1)), c: RAIL });
        var pz = sd * (span / 2 - 4), pc = new T3.Vector3(0, 0, pz).applyMatrix4(bm), gH = W0 + hG(pc.x, pc.z), ph = Math.max(2, yD - gH + 1); BB.push({ g: box(wB * 0.8, ph, 2.2), m: M4(pc.x, gH - 1 + ph / 2, pc.z, 1, 1, 1, ryB), c: CON }); });
      instancedOnce(merge(BB), 'bridge'); st.parts.bridge = { s: best.s, y: +(yD - W0).toFixed(1), span: Math.round(span), road: best.q }; st.hwy = best.q; }
  }
  function segDist(x, z, a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), px = a[0] + dx * t, pz = a[1] + dz * t; return { d: Math.hypot(x - px, z - pz), t: t, p: [px, pz] }; }
  function instancedOnce(g, name) { return addMesh(new T3.Mesh(g, matL('plain')), name); }   // plain meshes keep their own material
  function matI() { return matL('inst'); }   // every instanced mesh shares this one, and every one of them carries instance colours (r128 reuses a program across meshes: one without colours would draw with a null attribute)

  /* ---------- 6 · THE JUNGLE: broadleaf crowns, palms, flame trees ---------- */
  function treeGeos() {
    var shade = function (lo, hi) { return function (y) { var k = Math.max(0, Math.min(1, (y + 1) / 2)); return [lo[0] + (hi[0] - lo[0]) * k, lo[1] + (hi[1] - lo[1]) * k, lo[2] + (hi[2] - lo[2]) * k]; }; };
    var LEAF = shade([0.08, 0.17, 0.07], [0.27, 0.45, 0.15]), TRUNK = [0.30, 0.24, 0.18];
    var lumpy = function (det, seed) { var g = new T3.IcosahedronGeometry(1, det), p = g.attributes.position, nn = g.attributes.normal; for (var i = 0; i < p.count; i++) { var x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.86 + 0.28 * hash2(Math.round(x * 50) + seed, Math.round(y * 50) + Math.round(z * 31)); p.setXYZ(i, x * k, y * k, z * k);
      var l = Math.hypot(x, y * 0.8 + 0.25, z) || 1; nn.setXYZ(i, x / l, (y * 0.8 + 0.25) / l, z / l); } return g; };   // the crowns lit as soft mounds (each corner's normal points out from the crown's middle, a little up), never as facets
    var near = merge([{ g: new T3.CylinderGeometry(0.05, 0.085, 1.25, 5, 1, true), m: M4(0, 0.62, 0, 1), c: TRUNK }, { g: new T3.CylinderGeometry(0.025, 0.04, 0.7, 4, 1, true), m: M4(0.22, 1.15, 0.05, 1, 1, 1, 0, 0, -0.9), c: TRUNK },
      { g: lumpy(0, 1), m: M4(0, 1.62, 0, 0.62, 0.48, 0.62), c: LEAF }, { g: lumpy(0, 2), m: M4(0.5, 1.38, 0.22, 0.46, 0.38, 0.46), c: LEAF }, { g: lumpy(0, 3), m: M4(-0.45, 1.42, -0.3, 0.5, 0.4, 0.5), c: LEAF },
      { g: lumpy(0, 5), m: M4(0.12, 1.3, -0.52, 0.42, 0.34, 0.42), c: LEAF }, { g: lumpy(0, 6), m: M4(-0.18, 1.86, 0.26, 0.4, 0.32, 0.4), c: LEAF }]);   // five leaf masses of different sizes on a trunk and a branch (the photos' crowns are clusters, never one ball)
    var far = merge([{ g: lumpy(0, 4), m: M4(0, 1.5, 0, 1, 0.75, 1), c: LEAF }]);
    var FR = [0.34, 0.52, 0.18], FT = [0.50, 0.58, 0.22], parts = [{ g: new T3.CylinderGeometry(0.17, 0.26, 10.5, 5, 3, true), m: M4(0, 5.25, 0, 1), c: [0.45, 0.39, 0.31] }];
    for (var f = 0; f < 7; f++) { var a = f / 7 * Math.PI * 2 + (f % 2) * 0.2, P = [], Cc = []; var seg = [[0, 0, 0.42], [1.6, 0.35, 0.5], [3.1, -0.25, 0.36], [4.3, -1.4, 0.08]];
      for (var sgi = 1; sgi < seg.length; sgi++) { var s0 = seg[sgi - 1], s1 = seg[sgi]; var q = [[s0[0], s0[1], -s0[2]], [s1[0], s1[1], -s1[2]], [s1[0], s1[1], s1[2]], [s0[0], s0[1], s0[2]]];
        [0, 1, 2, 0, 2, 3].forEach(function (n) { var v = q[n]; P.push(v[0], v[1], v[2]); var c = sgi > 2 ? FT : FR; Cc.push(c[0], c[1], c[2]); }); }
      var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); parts.push({ g: g, m: M4(0, 10.4, 0, 1, 1, 1, a, 0, 0.25 - (f % 3) * 0.12), c: f % 2 ? FR : FT }); }
    parts.push({ g: new T3.IcosahedronGeometry(0.45, 0), m: M4(0, 10.2, 0, 1), c: [0.42, 0.40, 0.16] });
    var palm = merge(parts);
    var RED = function (y, i) { return hash2(i, 7) < 0.25 ? [0.24, 0.40, 0.14] : (y > 0 ? [0.92, 0.27, 0.13] : [0.66, 0.17, 0.10]); };
    var flame = merge([{ g: new T3.CylinderGeometry(0.09, 0.14, 2.0, 5, 1, true), m: M4(0, 1.0, 0, 1), c: TRUNK }, { g: lumpy(1, 9), m: M4(0, 2.15, 0, 1.15, 0.42, 1.15), c: RED }]);
    /* the trees that lean over the falls (seen close, from the pools): a trunk and three branches, ten small leaf masses spread like an umbrella, vines hanging */
    var bp = [{ g: new T3.CylinderGeometry(0.045, 0.08, 1.5, 5, 1, true), m: M4(0, 0.75, 0, 1), c: TRUNK }];
    [[0.9, 0.5], [-0.8, 2.6], [0.7, 4.4]].forEach(function (b, bi) { bp.push({ g: new T3.CylinderGeometry(0.02, 0.035, 0.9, 4, 1, true), m: M4(Math.cos(b[1]) * 0.3, 1.3 + bi * 0.08, Math.sin(b[1]) * 0.3, 1, 1, 1, -b[1], 0, b[0]), c: TRUNK }); });
    for (var lm = 0; lm < 10; lm++) { var la = lm * 2.39996, lr = 0.25 + 0.55 * Math.sqrt(lm / 10), ls2 = 0.26 + 0.12 * hash2(lm, 3); bp.push({ g: lumpy(0, 20 + lm), m: M4(Math.cos(la) * lr, 1.55 + 0.25 * hash2(lm, 9) - lr * 0.25, Math.sin(la) * lr, ls2 * 1.2, ls2 * 0.8, ls2 * 1.2), c: LEAF }); }
    for (var vi = 0; vi < 5; vi++) { var va = vi * 1.3 + 0.4, vl2 = 0.5 + 0.35 * hash2(vi, 5); bp.push({ g: box(0.025, vl2, 0.008), m: M4(Math.cos(va) * 0.7, 1.45 - vl2 / 2, Math.sin(va) * 0.7, 1, 1, 1, va), c: [0.10, 0.22, 0.08] }); }
    var bank = merge(bp);
    [[near, 1.5], [far, 1.5], [bank, 1.5], [flame, 2.15]].forEach(function (q) { soften(q[0], q[1]); });
    return { near: near, far: far, palm: palm, flame: flame, bank: bank };
  }
  function soften(g, cy) {   // a crown lit as one soft mass: each leaf corner's normal bent toward the line from the crown's middle (cheap: no new triangles)
    var P = g.attributes.position, N = g.attributes.normal, Cl = g.attributes.color; for (var i = 0; i < P.count; i++) { if (!(Cl.getY(i) > Cl.getX(i) * 1.25 || Cl.getX(i) > Cl.getY(i) * 1.8)) continue; var x = P.getX(i), y = P.getY(i) - cy, z = P.getZ(i), l = Math.hypot(x, y, z) || 1, nx = N.getX(i) * 0.3 + x / l * 0.7, ny = N.getY(i) * 0.3 + y / l * 0.7 + 0.15, nz = N.getZ(i) * 0.3 + z / l * 0.7, k = Math.hypot(nx, ny, nz) || 1; N.setXYZ(i, nx / k, ny / k, nz / k); } N.needsUpdate = true; }
  function* jungle() {
    var r = rng(79707), mid = F.at(F.len * 0.55), nearL = [], farL = [], palms = [], flames = [], bankL = [], G = treeGeos();
    var tint = function () { var k = r(), b = 0.8 + r() * 0.45; return (k < 0.2 ? [0.82, 1.0, 0.80] : k < 0.38 ? [1.18, 1.10, 0.72] : k < 0.55 ? [0.66, 0.84, 0.80] : k < 0.7 ? [1.0, 1.0, 1.0] : k < 0.85 ? [0.92, 1.12, 0.80] : [1.3, 1.18, 0.78]).map(function (v) { return v * b; }); };
    var shoreNear = function (x, z, R0) { for (var a = 0; a < 8; a++) { var ca = Math.cos(a * Math.PI / 4), sa = Math.sin(a * Math.PI / 4); for (var rr = 25; rr <= R0; rr += 30) if (hGrid(x + ca * rr, z + sa * rr) < 0.1) return true; } return false; };
    var place = function* (sp, R0, R1, list, far) { var n = Math.ceil(R1 / sp); for (var j = -n; j <= n; j++) for (var i = -n; i <= n; i++) { if ((i & 31) === 0 && slow797()) yield; 
      var x = mid[0] + (i + (r() - 0.5) * 0.9) * sp, z = mid[1] + (j + (r() - 0.5) * 0.9) * sp, dc = Math.hypot(x - mid[0], z - mid[1]); if (dc > R1 || dc < R0) continue; if (Math.abs(x) > HALF - 40 || Math.abs(z) > HALF - 40) continue;
      var h = hG(x, z); if (h < 2.4) { if (h > 0.9 && palms.length < C.PALMS && r() < 0.35 && !rGet(x, z)) palms.push({ x: x, y: W0 + h - 0.3, z: z, s: 0.75 + r() * 0.55, ry: r() * 6.28, rx: (r() - 0.5) * 0.18, rz: (r() - 0.5) * 0.25, c: [1, 1, 1] }); continue; }
      if (rGet(x, z)) continue;
      var coast = h < 14 && shoreNear(x, z, 120), rk = r();
      if (coast && rk < 0.4 && palms.length < C.PALMS) { palms.push({ x: x, y: W0 + h - 0.3, z: z, s: 0.8 + r() * 0.6, ry: r() * 6.28, rx: (r() - 0.5) * 0.15, rz: (r() - 0.5) * 0.22, c: [1, 1, 1] }); continue; }
      if (rk > (far ? 0.988 : 0.972) && flames.length < C.FLAMES) { var fr = 3.6 + r() * 2.4; flames.push({ x: x, y: W0 + h - 0.4, z: z, s: fr, sy: fr * (0.9 + r() * 0.3), ry: r() * 6.28, c: [1, 0.9 + r() * 0.2, 0.9 + r() * 0.2] }); continue; }
      var rad = far ? 9 + r() * 5 : 7.5 + r() * 4.5, hy = far ? 0.95 + r() * 0.4 : 0.9 + r() * 0.45; list.push({ x: x, y: W0 + h - 0.5, z: z, s: rad, sy: rad * hy, ry: r() * 6.28, rz: (r() - 0.5) * 0.12, c: tint() }); } };
    yield* place(C.SP_NEAR, 0, C.R_NEAR, nearL, false); yield* place(C.SP_FAR, C.R_NEAR, C.R_FAR, farL, true);
    /* the falls' own banks: crowns leaning over the water, close (the photos: a tunnel of green) */
    for (var s = 2; s < F.len - 6; s += 3.2) { var c = F.at(s), dr = F.dir(s), nx = -dr[1], nz = dr[0], hw = F.hw(s); for (var sd = -1; sd <= 1; sd += 2) { if (r() < 0.25) continue; var off = hw * 1.25 + 2 + r() * 5, x = c[0] + nx * off * sd, z = c[1] + nz * off * sd, h = hG(x, z); if (h < 2 || rGet(x, z) === 1) continue;
      var rad = 4 + r() * 3.5; if (r() < 0.12) palms.push({ x: x, y: W0 + h - 0.3, z: z, s: 0.8 + r() * 0.4, ry: r() * 6.28, rz: sd * 0.25, c: [1, 1, 1] }); else bankL.push({ x: x, y: W0 + h - 0.5, z: z, s: rad * 1.25, sy: rad * (1.4 + r() * 0.6), ry: r() * 6.28, rx: 0, rz: -sd * 0.18 * (nx > 0 ? 1 : -1), c: tint() }); } }
    var mat = matI(), pm = matL('instD');
    instanced(G.near, mat, nearL, 'trees'); instanced(G.bank, mat, bankL, 'bankTrees'); st.parts.bankTrees = bankL.length; instanced(G.far, mat, farL, 'treesFar'); instanced(G.palm, pm, palms, 'palms'); instanced(G.flame, mat, flames, 'flames');
    st.parts.trees = nearL.length; st.parts.treesFar = farL.length; st.parts.palms = palms.length; st.parts.flames = flames.length;
  }

  /* ---------- 6b · THE SHORE AT THE FOOT AND THE UNDERSTORY: a wide beach (sand by its distance from the water, as the real one), the rocky mouth
     where the falls meet the sea, broad leaves and hanging vines along the falls (the photos: a tunnel of green) ---------- */
  function chamfer(D, n, m, CELL) { var a1 = CELL, a2 = CELL * Math.SQRT2, i, j, k, v;
    for (j = 0; j < m; j++) for (i = 0; i < n; i++) { k = j * n + i; v = D[k]; if (i > 0) v = Math.min(v, D[k - 1] + a1); if (j > 0) { v = Math.min(v, D[k - n] + a1); if (i > 0) v = Math.min(v, D[k - n - 1] + a2); if (i < n - 1) v = Math.min(v, D[k - n + 1] + a2); } D[k] = v; }
    for (j = m - 1; j >= 0; j--) for (i = n - 1; i >= 0; i--) { k = j * n + i; v = D[k]; if (i < n - 1) v = Math.min(v, D[k + 1] + a1); if (j < m - 1) { v = Math.min(v, D[k + n] + a1); if (i < n - 1) v = Math.min(v, D[k + n + 1] + a2); if (i > 0) v = Math.min(v, D[k + n - 1] + a2); } D[k] = v; } }
  function* shoreGrid() {   /* 797 landing: the beach's height and distance grid, its own step (one frame), then the beach itself */
    var foot = F.at(F.len), dirF = F.dir(F.len), r = rng(79713), CELL = 4, RX = 520, RZ = 380, x0 = foot[0] - RX * 0.8, z0 = foot[1] - RZ, n = Math.round(RX * 1.9 / CELL) + 1, m = Math.round(RZ * 1.9 / CELL) + 1, i, j, k;
    var H = new Float32Array(n * m), D = new Float32Array(n * m); for (j = 0; j < m; j++) for (i = 0; i < n; i++) { if ((i & 31) === 0 && slow797()) yield; k = j * n + i; H[k] = hG(x0 + i * CELL, z0 + j * CELL); D[k] = H[k] < 0.05 ? 0 : 1e6; }
    chamfer(D, n, m, CELL);
    st.shG = { foot: foot, dirF: dirF, r: r, CELL: CELL, x0: x0, z0: z0, n: n, m: m, H: H, D: D };
  }
  function* shore() {
    var G = st.shG, foot = G.foot, dirF = G.dirF, r = G.r, CELL = G.CELL, x0 = G.x0, z0 = G.z0, n = G.n, m = G.m, H = G.H, D = G.D, i, j, k; st.shG = null;
    var wide = function (x, z) { return 24 + 18 * vnoise(x / 70 + 3, z / 70) - 0.035 * Math.hypot(x - foot[0], z - foot[1]); };   // widest at the falls' own beach
    var isSand = function (i2, j2) { var k2 = j2 * n + i2, x = x0 + i2 * CELL, z = z0 + j2 * CELL, v = rGet(x, z); return H[k2] > -0.4 && H[k2] < 8 && D[k2] < wide(x, z) && v !== 3 && v !== 1; };
    var P = [], Cc = [], col = new T3.Color(), SAND = new T3.Color(0xeee2c2), WETS = new T3.Color(0xc9b994), DUNE = new T3.Color(0xe2d3ad);
    var vtx = function (i2, j2) { var k2 = j2 * n + i2, x = x0 + i2 * CELL, z = z0 + j2 * CELL; col.copy(SAND).lerp(DUNE, 0.6 * vnoise(x / 9, z / 9)).lerp(WETS, sm(6, 0, D[k2])); P.push(x, W0 + Math.max(H[k2], 0.02) + 0.08, z); Cc.push(col.r, col.g, col.b); };
    var nS = 0; for (j = 0; j < m - 1; j++) for (i = 0; i < n - 1; i++) { if ((i & 31) === 0 && slow797()) yield; if (!(isSand(i, j) && isSand(i + 1, j) && isSand(i, j + 1) && isSand(i + 1, j + 1))) continue; vtx(i, j); vtx(i, j + 1); vtx(i + 1, j); vtx(i + 1, j); vtx(i, j + 1); vtx(i + 1, j + 1); nS++; }
    var sg = new T3.BufferGeometry(); sg.setAttribute('position', new T3.Float32BufferAttribute(P, 3)); sg.setAttribute('normal', new T3.Float32BufferAttribute(new Float32Array(P.length).map(function (_, q) { return q % 3 === 1 ? 1 : 0; }), 3)); sg.setAttribute('color', new T3.Float32BufferAttribute(Cc, 3));
    st.sandAt = function (x, z) { var i2 = Math.round((x - x0) / CELL), j2 = Math.round((z - z0) / CELL); if (i2 < 0 || j2 < 0 || i2 >= n - 1 || j2 >= m - 1) return null; var k2 = j2 * n + i2; return isSand(i2, j2) && H[k2] > 0.15 ? Math.max(H[k2], 0.02) + 0.08 : null; };
    if (slow797()) yield;
    /* the rocky mouth: pale travertine boulders at the falls' foot, either side and out into the sea */
    var parts = [{ g: sg, c: function (y, q) { return [Cc[q * 3], Cc[q * 3 + 1], Cc[q * 3 + 2]]; } }], rk = function (seed) { var g = new T3.IcosahedronGeometry(1, 1), p = g.attributes.position; for (var q = 0; q < p.count; q++) { var kk = 0.8 + 0.4 * hash2(Math.round(p.getX(q) * 40) + seed, Math.round(p.getY(q) * 40) + Math.round(p.getZ(q) * 23)); p.setXYZ(q, p.getX(q) * kk, p.getY(q) * kk, p.getZ(q) * kk); var ln = Math.hypot(p.getX(q), p.getY(q), p.getZ(q)) || 1; g.attributes.normal.setXYZ(q, p.getX(q) / ln, p.getY(q) / ln, p.getZ(q) / ln); } return g; };   // a boulder lit round (normals from its middle), never faceted
    var ROCK = function (y) { return y > 0.2 ? [0.86, 0.83, 0.75] : [0.62, 0.60, 0.52]; }, nR = 0;
    for (var q = 0; q < 60; q++) { var sd = q % 2 ? 1 : -1, sea = q % 3 === 0, s = F.len - 2 - r() * 26, c = F.at(s), dr = F.dir(s), hw = F.hw(s), off = sea ? (r() - 0.5) * 1.8 * hw : sd * hw * (0.85 + r() * 0.6), ahead = sea ? 4 + r() * 22 : 0;
      var x = c[0] - dr[1] * off + dirF[0] * ahead, z = c[1] + dr[0] * off + dirF[1] * ahead, sc = 0.8 + r() * 2.6, gy = Math.max(hG(x, z), -1.4); parts.push({ g: rk(q), m: M4(x, W0 + gy - sc * 0.35, z, sc * (1 + r() * 0.6), sc * 0.55, sc, r() * 6.28), c: ROCK }); nR++; }
    if (slow797()) yield;
    instancedOnce(merge(parts), 'shore'); st.parts.beachCells = nS; st.parts.mouthRocks = nR;
    st.sh = { foot: foot, r: r, CELL: CELL, x0: x0, z0: z0, n: n, m: m, H: H, D: D, wide: wide };
  }
  function understory() {   /* the understory (its own step, its own frame): broad leaves (banana, philodendron) by the water and at the beach's back, and vines hanging from the crowns over the falls */
    var o = st.sh, foot = o.foot, r = o.r, CELL = o.CELL, x0 = o.x0, z0 = o.z0, n = o.n, m = o.m, H = o.H, D = o.D, wide = o.wide, s, c, dr, hw, sd, off, x, z, q;
    var leafG = (function () { var Pl = [], Cl = []; for (var f = 0; f < 7; f++) { var a = f / 7 * Math.PI * 2 + f * 0.37, L = 1.6 + (f % 3) * 0.45, W2 = 0.42, up = 0.55 + (f % 2) * 0.35, ca = Math.cos(a), sa = Math.sin(a);
        var pts = [[0, 0.05, 0], [L * 0.45, up, -W2], [L * 0.45, up, W2], [L, up * 0.55 - 0.15, 0]].map(function (v) { return [v[0] * ca - v[2] * sa, v[1], v[0] * sa + v[2] * ca]; });
        [[0, 1, 2], [1, 3, 2]].forEach(function (tr) { tr.forEach(function (ix) { Pl.push(pts[ix][0], pts[ix][1], pts[ix][2]); var g2 = ix === 3 ? [0.30, 0.52, 0.16] : [0.16, 0.36, 0.11]; Cl.push(g2[0], g2[1], g2[2]); }); }); }
      var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(Pl, 3)); g.setAttribute('color', new T3.Float32BufferAttribute(Cl, 3)); g.computeVertexNormals(); return g; })();
    var U = [], nL = 0, nV = 0; for (s = 1; s < F.len - 2; s += 2.2) { c = F.at(s); dr = F.dir(s); hw = F.hw(s); for (sd = -1; sd <= 1; sd += 2) { if (r() < 0.3) continue; off = sd * hw * (1.05 + r() * 0.5); x = c[0] - dr[1] * off; z = c[1] + dr[0] * off; var h = hG(x, z); if (h < 0.4 || rGet(x, z) === 1) continue;
        var ls = 1.3 + r() * 1.6; U.push({ g: leafG, m: M4(x, W0 + h - 0.1, z, ls, ls * (0.8 + r() * 0.5), ls, r() * 6.28), c: function (y, ix, px, py, pz) { return [leafG.attributes.color.getX(ix), leafG.attributes.color.getY(ix), leafG.attributes.color.getZ(ix)]; } }); nL++;
        if (r() < 0.55) { var vy = W0 + h + 5 + r() * 7, vl = 2.5 + r() * 5, vx = x - dr[1] * sd * (-1.5 - r() * 3), vz = z + dr[0] * sd * (-1.5 - r() * 3); U.push({ g: box(0.12, vl, 0.04), m: M4(vx, vy - vl / 2, vz, 1, 1, 1, r() * 3), c: [0.12, 0.26, 0.09] }); nV++; } } }
    for (q = 0; q < 140; q++) { var a2 = r() * 6.28, rr = 40 + r() * 260; x = foot[0] + Math.cos(a2) * rr * 1.4; z = foot[1] + Math.sin(a2) * rr * 0.6 + 40; var i3 = Math.round((x - x0) / CELL), j3 = Math.round((z - z0) / CELL); if (i3 < 0 || j3 < 0 || i3 >= n || j3 >= m) continue;
      var k3 = j3 * n + i3; if (H[k3] < 0.8 || D[k3] < wide(x, z) || D[k3] > wide(x, z) + 30 || rGet(x, z)) continue; ls = 1 + r() * 1.6; U.push({ g: leafG, m: M4(x, W0 + H[k3] - 0.1, z, ls, ls, ls, r() * 6.28), c: function (y, ix) { return [leafG.attributes.color.getX(ix), leafG.attributes.color.getY(ix), leafG.attributes.color.getZ(ix)]; } }); nL++; }
    var um = addMesh(new T3.Mesh(merge(U), matL('plainD')), 'understory'); st.parts.leaves = nL; st.parts.vines = nV; st.sh = null; return um;
  }

  /* ---------- 7 · LIFE: the beach, the swimmers, the chains on the falls, the cars, the dolphins ---------- */
  var SKIN = [0x3b2219, 0x4a2c1e, 0x5a3624, 0x6b412b, 0x7d4e33, 0x9a6a48, 0xc69472, 0xe2b996].map(hexc), SUIT = [0xe63946, 0x1d6fd1, 0xffd23f, 0x2a9d8f, 0xff7aa2, 0xffffff, 0x222222, 0xf77f00, 0x8e44ad, 0x00b4d8].map(hexc);
  function personGeos() { var skin = merge([{ g: box(0.15, 0.82, 0.16), m: M4(-0.1, 0.41, 0, 1), c: [1, 1, 1] }, { g: box(0.15, 0.82, 0.16), m: M4(0.1, 0.41, 0, 1), c: [1, 1, 1] },
      { g: box(0.68, 0.09, 0.1), m: M4(-0.52, 1.36, 0, 1, 1, 1, 0, 0, 0.25), c: [1, 1, 1] }, { g: box(0.68, 0.09, 0.1), m: M4(0.52, 1.36, 0, 1, 1, 1, 0, 0, -0.25), c: [1, 1, 1] }, { g: box(0.21, 0.25, 0.23), m: M4(0, 1.62, 0, 1), c: [1, 1, 1] },
      { g: box(0.36, 0.42, 0.21), m: M4(0, 1.22, 0, 1), c: [1, 1, 1] }]);
    var cloth = merge([{ g: box(0.38, 0.3, 0.23), m: M4(0, 0.86, 0, 1), c: [1, 1, 1] }, { g: box(0.23, 0.07, 0.25), m: M4(0, 1.775, 0, 1), c: [0.25, 0.25, 0.25] }]); return [skin, cloth]; }
  function* life() {
    var r = rng(79711), foot = F.at(F.len), people = [], sand = [], sea = [], q;
    /* the sand and the shallows round the falls' foot, read off the ground every 3 m */
    for (var z = foot[1] - C.BEACH_R; z < foot[1] + C.BEACH_R; z += 3) for (var x = foot[0] - C.BEACH_R; x < foot[0] + C.BEACH_R * 1.4; x += 3) { if (slow797()) yield; var h = hG(x, z); if (rGet(x, z) === 3) continue;
      var sy = st.sandAt ? st.sandAt(x, z) : null; if (sy != null && !rGet(x, z)) sand.push([x, z, sy]); else if (h < -0.4 && h > -2.6 && st.shoreD(x, z) < 70) sea.push([x, z, h]); }
    var near = function (L, x2, z2, R2) { for (var i = 0; i < L.length; i++) if (Math.hypot(L[i].x - x2, L[i].z - z2) < R2) return true; return false; };
    var umb = [], lng = []; sand.sort(function (a, b) { return Math.hypot(a[0] - foot[0], a[1] - foot[1]) - Math.hypot(b[0] - foot[0], b[1] - foot[1]); });
    for (var i = 0; i < sand.length && umb.length < C.UMB; i++) { var p = sand[i]; if (r() < 0.55 || near(umb, p[0], p[1], 7)) continue; var uc = [[0.12, 0.42, 0.85], [0.92, 0.18, 0.2], [0.99, 0.82, 0.18], [0.98, 0.98, 0.95], [0.1, 0.62, 0.55]][(r() * 5) | 0];
      umb.push({ x: p[0], y: W0 + p[2] - 0.1, z: p[1], s: 1, ry: r() * 6.28, c: uc }); var a = r() * 6.28; lng.push({ x: p[0] + Math.cos(a) * 1.6, y: W0 + p[2] - 0.1, z: p[1] + Math.sin(a) * 1.6, s: 1, ry: a, c: [1, 1, 1] }); }
    for (i = 0; i < C.BEACH_PEOPLE && sand.length; i++) { p = sand[Math.floor(Math.pow(r(), 1.7) * sand.length)]; var lie = r() < 0.35; people.push({ k: lie ? 'lie' : 'stand', x: p[0] + (r() - 0.5) * 2, y: W0 + p[2] + (lie ? 0.05 : 0), z: p[1] + (r() - 0.5) * 2, ry: r() * 6.28, ph: r() * 6.28 }); }
    for (i = 0; i < C.SEA_SWIM && sea.length; i++) { p = sea[Math.floor(Math.pow(r(), 1.4) * sea.length)]; people.push({ k: 'swim', x: p[0], y: W0 - 1.28, z: p[1], ry: r() * 6.28, ph: r() * 6.28, bx: p[0], bz: p[1] }); }
    /* the pools: swimmers sitting in the flat water between the steps */
    var pools = F.steps.filter(function (S) { return S.lip - S.s0 > 3; }); for (i = 0; i < C.POOL_SWIM && pools.length; i++) { var S = pools[(r() * pools.length) | 0], s = S.s0 + 1 + r() * (S.lip - S.s0 - 1.5), t = (r() - 0.5) * 1.3, c = F.at(s), dr = F.dir(s), hw = F.hw(s);
      people.push({ k: 'pool', x: c[0] - dr[1] * t * hw, y: W0 + F.surf(s, t) - 1.18, z: c[1] + dr[0] * t * hw, ry: r() * 6.28, ph: r() * 6.28 }); }
    /* the chains: hand in hand up the falls, slowly, from the beach to the top, again and again */
    st.chains = C.CHAIN.map(function (n, ci) { return { n: n, t: ci ? 0.42 : -0.32, s: F.len - 4 - ci * 70, v: 0.16 + ci * 0.03, gap: 1.25 }; });
    st.chains.forEach(function (ch) { for (var q = 0; q < ch.n; q++) people.push({ k: 'chain', ch: ch, q: q, x: 0, y: 0, z: 0, ry: 0, ph: r() * 6.28 }); });
    people.forEach(function (o) { o.skin = SKIN[(r() * SKIN.length) | 0]; o.suit = SUIT[(r() * SUIT.length) | 0]; o.s = 1.05; });
    var PG = personGeos(), mat = matI();
    st.pSkin = new T3.InstancedMesh(PG[0], mat, people.length); st.pCloth = new T3.InstancedMesh(PG[1], mat, people.length); var col = new T3.Color();
    people.forEach(function (o, n) { col.setRGB(o.skin[0], o.skin[1], o.skin[2]); st.pSkin.setColorAt(n, col); col.setRGB(o.suit[0], o.suit[1], o.suit[2]); st.pCloth.setColorAt(n, col); });
    [st.pSkin, st.pCloth].forEach(function (m, n) { m.instanceMatrix.setUsage(T3.DynamicDrawUsage); m.frustumCulled = false; addMesh(m, n ? 'peopleCloth' : 'peopleSkin'); });
    st.people = people; st.parts.people = people.length; st.parts.chain = C.CHAIN.reduce(function (a, b) { return a + b; }, 0); st.parts.beachPeople = people.filter(function (o) { return o.k === 'stand' || o.k === 'lie'; }).length;
    st.parts.swimmers = people.filter(function (o) { return o.k === 'swim' || o.k === 'pool'; }).length; st.parts.sand = sand.length;
    /* umbrellas (pole, canopy) and loungers */
    var ug = merge([{ g: new T3.CylinderGeometry(0.04, 0.04, 2.4, 4, 1, true), m: M4(0, 1.2, 0, 1), c: [0.9, 0.9, 0.9] }, { g: new T3.ConeGeometry(1.45, 0.55, 8, 1, true), m: M4(0, 2.45, 0, 1), c: function (y, i) { return (Math.floor(i / 3) % 2) ? [1, 1, 1] : [0.82, 0.82, 0.82]; } }]);
    var lg = merge([{ g: box(0.7, 0.12, 1.9), m: M4(0, 0.3, 0, 1), c: [0.97, 0.97, 0.95] }, { g: box(0.7, 0.1, 0.7), m: M4(0, 0.55, 0.75, 1, 1, 1, 0, -0.6), c: [0.97, 0.97, 0.95] }]);
    var um = matL('instD'); instanced(ug, um, umb, 'umbrellas'); instanced(lg, mat, lng, 'loungers'); st.parts.umbrellas = umb.length;
    /* cars on the highway (the bridge's road), both ways, keeping LEFT */
    if (st.hwy != null) { var pts = lines(d.roads, st.hwy), cum = [0]; for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      var cars = []; for (i = 0; i < C.CARS; i++) cars.push({ u: r() * cum[cum.length - 1], dir: i % 2 ? 1 : -1, v: 11 + r() * 6, c: [[0.9, 0.9, 0.9], [0.15, 0.15, 0.17], [0.75, 0.1, 0.1], [0.2, 0.35, 0.7], [0.7, 0.72, 0.75], [0.95, 0.85, 0.2]][(r() * 6) | 0], x: 0, y: 0, z: 0, s: 1, ry: 0 });
      var cg = merge([{ g: box(1.8, 0.75, 4.3), m: M4(0, 0.6, 0, 1), c: [1, 1, 1] }, { g: box(1.6, 0.6, 2.2), m: M4(0, 1.25, -0.2, 1), c: [0.25, 0.3, 0.35] }]);
      st.road = { pts: pts, cum: cum, w: d.roads.w[st.hwy] / 10 }; st.cars = cars; st.carMesh = new T3.InstancedMesh(cg, mat, cars.length); cars.forEach(function (o, n) { col.setRGB(o.c[0], o.c[1], o.c[2]); st.carMesh.setColorAt(n, col); });
      st.carMesh.instanceMatrix.setUsage(T3.DynamicDrawUsage); st.carMesh.frustumCulled = false; addMesh(st.carMesh, 'cars'); st.parts.cars = cars.length; }
    /* Dolphin Cove: its pens on the water off its piers, a pier, and the dolphins leaping */
    var dc = local(PLACES.dolphinCove), best = null; for (var a = 0; a < 40; a++) { var ang = -Math.PI / 2 + (a / 40 - 0.5) * 2.4, rr2; for (rr2 = 0; rr2 < 300; rr2 += 6) { var px = dc[0] + Math.cos(ang) * rr2, pz = dc[1] + Math.sin(ang) * rr2; if (hGrid(px, pz) < -1.2) { if (!best || rr2 < best.r) best = { r: rr2, x: px, z: pz, a: ang }; break; } } }
    if (best) { var PB = [], cx = best.x + Math.cos(best.a) * 22, cz = best.z + Math.sin(best.a) * 22, rings = [[cx - 20, cz, 13], [cx + 12, cz - 6, 15], [cx - 2, cz + 26, 11]];
      rings.forEach(function (R2) { for (var q = 0; q < 18; q++) { var a0 = q / 18 * Math.PI * 2, a1 = (q + 1) / 18 * Math.PI * 2, mx = R2[0] + Math.cos((a0 + a1) / 2) * R2[2], mz = R2[1] + Math.sin((a0 + a1) / 2) * R2[2]; PB.push({ g: box(1.6, 0.35, R2[2] * 0.36), m: M4(mx, W0 + 0.35, mz, 1, 1, 1, -(a0 + a1) / 2), c: [0.78, 0.66, 0.48] }); } });
      var sx2 = dc[0], sz2 = dc[1], L2 = Math.hypot(cx - sx2, cz - sz2); PB.push({ g: box(2.4, 0.4, L2), m: M4((sx2 + cx) / 2, W0 + 0.7, (sz2 + cz) / 2, 1, 1, 1, Math.atan2(cx - sx2, cz - sz2)), c: [0.72, 0.6, 0.44] });
      for (q = 0; q < 4; q++) { var hx = dc[0] + (q - 1.5) * 14, hz = dc[1] + 18, hh = hG(hx, hz); if (hh > 0.8 && !rGet(hx, hz)) { PB.push({ g: box(6, 2.8, 6), m: M4(hx, W0 + hh + 1.4, hz, 1), c: [0.95, 0.93, 0.86] }); PB.push({ g: new T3.ConeGeometry(5.2, 2.4, 4), m: M4(hx, W0 + hh + 4, hz, 1, 1, 1, Math.PI / 4), c: [0.62, 0.50, 0.30] }); } }   // thatched huts
      instancedOnce(merge(PB), 'dolphinCove'); st.cove = { rings: rings, x: cx, z: cz };
      var dg = merge([{ g: new T3.SphereGeometry(0.5, 7, 5), m: M4(0, 0, 0, 0.55, 0.5, 2.2), c: [0.55, 0.6, 0.66] }, { g: new T3.ConeGeometry(0.22, 0.5, 4), m: M4(0, 0.42, -0.1, 1, 1, 0.5, 0, -0.4), c: [0.45, 0.5, 0.56] }, { g: box(1.0, 0.06, 0.35), m: M4(0, 0, -1.15, 1), c: [0.45, 0.5, 0.56] }]);
      st.dolphins = []; for (q = 0; q < C.DOLPHINS; q++) st.dolphins.push({ ring: rings[q % rings.length], ph: r() * 6.28, sp: 0.35 + r() * 0.2, jump: r() * 6.28 });
      st.dMesh = new T3.InstancedMesh(dg, mat, st.dolphins.length); st.dolphins.forEach(function (o, n) { col.setRGB(1, 1, 1); st.dMesh.setColorAt(n, col); }); st.dMesh.instanceMatrix.setUsage(T3.DynamicDrawUsage); st.dMesh.frustumCulled = false; addMesh(st.dMesh, 'dolphins'); st.parts.dolphins = st.dolphins.length; st.parts.dolphinCove = [Math.round(cx), Math.round(cz)]; }
    st.anim = true;
  }

  /* ---------- the per-frame life (only what moves) ---------- */
  var _m = null, _q = null, _v = null, _s = null, _e = null;
  function setM(im, n, x, y, z, ry, rx, rz, s) { _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(s, s, s); _m.compose(_v, _q, _s); im.setMatrixAt(n, _m); }
  function animate(dt, camL) {
    var t = st.t; if (!st.pSkin) return;
    var nearAny = Math.hypot(camL[0] - F.P[0][0], camL[2] - F.P[0][1]) < 2500;
    if (nearAny || !st.animOnce) { st.animOnce = true;
      st.chains.forEach(function (ch) { ch.s -= ch.v * dt; if (ch.s + ch.n * ch.gap < 3) ch.s = F.len - 3; });
      st.people.forEach(function (o, n) { var x = o.x, y = o.y, z = o.z, ry = o.ry, rx = 0, rz = 0, s = o.s;
        if (o.k === 'stand') { ry = o.ry + 0.4 * Math.sin(t * 0.3 + o.ph); }
        else if (o.k === 'lie') { rx = -Math.PI / 2; y = o.y + 0.12; }
        else if (o.k === 'swim') { x = o.bx + Math.sin(t * 0.12 + o.ph) * 3; z = o.bz + Math.cos(t * 0.1 + o.ph * 1.3) * 3; y = o.y + 0.12 * Math.sin(t * 1.4 + o.ph); }
        else if (o.k === 'pool') { y = o.y + 0.06 * Math.sin(t * 1.1 + o.ph); }
        else if (o.k === 'chain') { var ch = o.ch, sq = ch.s + o.q * ch.gap; if (sq < 0.5 || sq > F.len - 0.5) { y = -1e4; } else { var c = F.at(sq), dr = F.dir(sq), hw = F.hw(sq), tt = ch.t + 0.08 * Math.sin(o.q * 1.7);
          x = c[0] - dr[1] * tt * hw; z = c[1] + dr[0] * tt * hw; y = W0 + F.surf(sq, tt) - 0.05 + 0.06 * Math.abs(Math.sin(t * 2.2 + o.q)); ry = Math.atan2(dr[0], dr[1]) + Math.PI / 2; rz = 0.08 * Math.sin(t * 1.3 + o.q); } }
        setM(st.pSkin, n, x, y, z, ry, rx, rz, s); setM(st.pCloth, n, x, y, z, ry, rx, rz, s); });
      st.pSkin.instanceMatrix.needsUpdate = true; st.pCloth.instanceMatrix.needsUpdate = true; }
    if (st.cars && st.road) { var R2 = st.road, L = R2.cum[R2.cum.length - 1]; st.cars.forEach(function (o, n) { o.u = (o.u + o.dir * o.v * dt + L) % L; var k = 1; while (k < R2.cum.length - 1 && R2.cum[k] < o.u) k++; var a = R2.pts[k - 1], b = R2.pts[k], f = (o.u - R2.cum[k - 1]) / Math.max(0.01, R2.cum[k] - R2.cum[k - 1]), dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      var side = o.dir * (R2.w / 4 + 0.3), px = a[0] + dx * f + (dz / l) * side, pz = a[1] + dz * f - (dx / l) * side, py = W0 + Math.max(a[2] + (b[2] - a[2]) * f, hG(px, pz) - 0.0) + 0.25;   // left-hand traffic: each way keeps to its own left
      setM(st.carMesh, n, px, py, pz, Math.atan2(dx * o.dir, dz * o.dir), 0, 0, 1); }); st.carMesh.instanceMatrix.needsUpdate = true; }
    if (st.dolphins) { st.dolphins.forEach(function (o, n) { var a = t * o.sp + o.ph, R3 = o.ring, x = R3[0] + Math.cos(a) * R3[2] * 0.6, z = R3[1] + Math.sin(a) * R3[2] * 0.6, j = (t * 0.5 + o.jump) % 6.28, up = j < 1.5 ? Math.sin(j / 1.5 * Math.PI) : 0;
      setM(st.dMesh, n, x, W0 - 0.45 + up * 2.4, z, a + Math.PI, up ? (j / 1.5 - 0.5) * 1.6 : 0, 0, 1); }); st.dMesh.instanceMatrix.needsUpdate = true; }
  }

  /* ---------- 8 · THE SOUND: the splash and hiss of the steps, the surf (made in code; the roar is the patch's own) ---------- */
  function sound(on, camL) {
    var ac = X.ac ? X.ac() : null; if (!ac || ac.state !== 'running') return; var S = st.snd;
    if (!S && on) { var len = Math.floor(ac.sampleRate * 3), buf = ac.createBuffer(2, len, ac.sampleRate), Fd = Math.floor(ac.sampleRate * 0.1);
      for (var ch = 0; ch < 2; ch++) { var a = buf.getChannelData(ch); for (var i = 0; i < len; i++) a[i] = Math.random() * 2 - 1; for (i = 0; i < Fd; i++) { var t = i / Fd; a[len - Fd + i] = a[len - Fd + i] * (1 - t) + a[i] * t; } }
      var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.6; var sg = ac.createGain(); sg.gain.value = 0;
      var lfo = ac.createOscillator(); lfo.frequency.value = 3.1; var lg = ac.createGain(); lg.gain.value = 0.35; var trem = ac.createGain(); trem.gain.value = 0.65; lfo.connect(lg); lg.connect(trem.gain);   // the splash's bubbling
      src.connect(bp); bp.connect(trem); trem.connect(sg); sg.connect(ac.destination);
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; var wg = ac.createGain(); wg.gain.value = 0; var swell = ac.createOscillator(); swell.frequency.value = 0.13; var swg = ac.createGain(); swg.gain.value = 0.5; var surfG = ac.createGain(); surfG.gain.value = 0.5;
      swell.connect(swg); swg.connect(surfG.gain); src.connect(lp); lp.connect(surfG); surfG.connect(wg); wg.connect(ac.destination);   // the surf: low noise, swelling every ~8 s
      src.start(); lfo.start(); swell.start(); S = st.snd = { ac: ac, src: src, sg: sg, wg: wg, osc: [lfo, swell] }; }
    if (!S) return;
    var dF = 1e9; for (var s = 0; s < F.len; s += 6) { var c = F.at(s); dF = Math.min(dF, Math.hypot(camL[0] - c[0], camL[2] - c[1], (camL[1] - W0 - F.hAt(s)) * 0.6)); }
    var foot = F.at(F.len), dB = Math.hypot(camL[0] - foot[0] - 60, camL[2] - foot[1], camL[1] * 0.6), mute = X.muted && X.muted();
    var v1 = on && !mute ? 0.20 * (1 - sm(C.SOUND_R[0], C.SOUND_R[1], dF)) : 0, v2 = on && !mute ? 0.10 * (1 - sm(40, 500, dB)) : 0, now = S.ac.currentTime;
    if (Math.abs(v1 - st.vol[0]) > 0.004) { S.sg.gain.setTargetAtTime(v1, now, 0.25); st.vol[0] = v1; } if (Math.abs(v2 - st.vol[1]) > 0.004) { S.wg.gain.setTargetAtTime(v2, now, 0.4); st.vol[1] = v2; }
    st.sndOn = v1 + v2 > 0.002; st.dFalls = Math.round(dF);
  }

  /* ---------- the build, in slices ---------- */
  var STEPS = [['data', function () { d = X.dData(); HALF = d.half; RN = Math.ceil(HALF * 2 / C.RASTER); R = new Uint8Array(RN * RN); W0 = X.WATER; st.group = new T3.Group(); st.group.name = 'dunns797'; fallsLine(); fallsFloor(); }],
    ['patch', patchEdits], ['cascade', cascade], ['reef', reef], ['roads', roadsRaster], ['built', built], ['built2', built2], ['jungle', jungle], ['shoreGrid', shoreGrid], ['shore', shore], ['understory', understory], ['life', life],
    ['keeper', function () { var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute([0, -500, 0, 0, -500, 0, 0, -500, 0], 3)); var k = addMesh(new T3.Mesh(g, matL('keeper')), 'keeper', { cull: false });
      k.onBeforeRender = function (rd, sc, cam) { tick(cam); }; st.group.traverse(function (o) { o.layers.enable(C.LAYER); }); X.D.group.add(st.group);
      if (X.renderer) st.progs = X.renderer.info.programs.length; }]];   // no compile here: every program was compiled at boot by warm()
  function slow797() { return performance.now() - st.tq > C.SLICE2; }   // a slice's own clock (797 landing round 3: steps were 45-75 ms frames under load)
  function buildSlice() {
    if (st.built || st.fault) return; var t0 = performance.now();
    try { var a = performance.now(), nm = STEPS[st.step][0]; st.tq = a; if (!st.it) { var out = STEPS[st.step][1](); if (out && typeof out.next === 'function') st.it = out; }
      var fin = true; if (st.it) { fin = !!st.it.next().done; if (fin) st.it = null; }
      var ms = performance.now() - a; st.sliceMax = Math.max(st.sliceMax, ms); st.sliceMs = st.sliceMs || {}; st.sliceMs[nm] = Math.max(st.sliceMs[nm] || 0, Math.round(ms)); st.slices = (st.slices || 0) + 1; if (fin) st.step++; }   // ONE slice a frame (a step may take several: its own clock, C.SLICE2 ms)
    catch (e) { st.fault = STEPS[st.step] ? STEPS[st.step][0] + ': ' + String(e && e.message || e) : String(e); console.warn('797: Dunn\'s River stopped building: ' + st.fault); return; }
    st.buildMs += performance.now() - t0; if (st.step >= STEPS.length) { st.built = true; st.building = false; st.buildMs = Math.round(st.buildMs); st.parts.draws = st.meshes.length; st.parts.tris = trisOf(); } else requestAnimationFrame(buildSlice);
  }
  function trisOf() { var n = 0; st.meshes.forEach(function (m) { var g = m.geometry, c = g.index ? g.index.count / 3 : (g.attributes.position.count / (m.isPoints ? 1 : 3)); if (m.isPoints) return; n += c * (m.isInstancedMesh ? m.count : 1); }); return Math.round(n); }
  function watch() {   // until built: wait for the patch (it is made 60 km out); after: a slow watch that hushes the sound once the patch is gone
    try { if (!st.built && !st.building && !st.fault && X.D && X.D.group && X.D.built && X.dData && X.dData())   /* 828: the patch is built in slices: wait for its last */ { st.building = true; requestAnimationFrame(buildSlice); }
      if (st.built && st.sndOn && performance.now() - st.last > 400) sound(false, [1e6, 1e6, 1e6]); } catch (e) { st.fault = 'watch: ' + String(e && e.message || e); }
  }
  function tick(cam) {
    var now = performance.now(); if (now - st.last < 4) return; var dt = Math.min(0.1, (now - (st.last || now)) / 1000); st.last = now; var t0 = now;
    try { st.t += dt; st.uT.value = st.t; st.ticks++; if (X.sunI) { var si = +X.sunI(); if (isFinite(si)) st.uL.value = Math.max(0.15, Math.min(1, si)); }
      if (X.renderer) st.uPx.value = X.renderer.domElement.height * 0.5 / Math.tan((cam.fov || 60) * Math.PI / 360);
      var gp = X.D.group.position, camL = [cam.position.x - gp.x, cam.position.y - gp.y, cam.position.z - gp.z]; st.camL = camL;
      animate(dt, camL); sound(true, camL); }
    catch (e) { st.fault = 'tick: ' + String(e && e.message || e); console.warn('797: ' + st.fault); if (st.group) st.group.visible = false; }
    var ms = performance.now() - t0; st.ms.push(ms); if (st.ms.length > 240) st.ms.shift(); if (st.ticks > 30) st.msMax = Math.max(st.msMax, ms);
  }

  function init(ctx) {
    if (st.inited) return; X = ctx; T3 = ctx.THREE; st.inited = true;
    if (ctx.classic && ctx.classic()) { st.why = 'classic'; return; }
    if (!window.WFR_DUNNS712 || !window.WFR_WORLD || !ctx.D || !ctx.dG || !ctx.dData) { st.why = 'no patch'; return; }
    _m = new T3.Matrix4(); _q = new T3.Quaternion(); _v = new T3.Vector3(); _s = new T3.Vector3(); _e = new T3.Euler();
    try { if (X.scene && X.renderer) warm(); } catch (e) { st.warmFault = String(e && e.message || e); }
    st.timer = setInterval(watch, 300);
  }
  function peek() {
    var ms = st.ms.slice().sort(function (a, b) { return a - b; }), q = function (p) { return ms.length ? +ms[Math.min(ms.length - 1, Math.floor(ms.length * p))].toFixed(3) : null; };
    var vis = st.meshes.filter(function (m) { return m.visible; }).length;
    return { inited: st.inited, why: st.why, fault: st.fault, built: st.built, step: st.step, buildMs: st.buildMs, sliceMax: +st.sliceMax.toFixed(1), warm: st.warm, warmFault: st.warmFault || null, progs797: st.progs || null, sliceMs: st.sliceMs || null, inScene: !!(st.group && st.group.parent && X && X.D.group && X.D.group.parent),
      parts: st.parts, edits: st.edits, draws: vis, progs: st.progs || null, ticks: st.ticks, ms: { n: ms.length, med: q(0.5), p95: q(0.95), max: +st.msMax.toFixed(3) }, sound: { on: st.sndOn, vol: st.vol.map(function (v) { return +v.toFixed(3); }), dFalls: st.dFalls || null },
      camL: st.camL ? st.camL.map(Math.round) : null, chains: st.chains ? st.chains.map(function (c) { return +c.s.toFixed(1); }) : null };
  }
  /* the bench's reads (guards only): the cascade's line and steps, a person's place, the places in patch metres */
  function bench() { if (!F) return null; return { len: F.len, top: F.top, steps: F.steps.map(function (S) { return [+S.s0.toFixed(1), +S.drop.toFixed(2)]; }), at: F.P.filter(function (_, i) { return i % 10 === 0; }), hw: [F.hw(0), F.hw(F.len)],
    places: Object.keys(PLACES).reduce(function (o, k) { o[k] = local(PLACES[k]); return o; }, {}), chainY: st.people ? st.people.filter(function (o) { return o.k === 'chain'; }).slice(0, 3).map(function (o) { var m = new T3.Matrix4(); st.pSkin.getMatrixAt(st.people.indexOf(o), m); return [m.elements[12], m.elements[13], m.elements[14]]; }) : null }; }
  function show(names, on) { st.meshes.concat(X && X.D ? X.D.meshes : []).forEach(function (m) { if (names.indexOf(m.name.replace('dunns797:', '')) >= 0 || names.indexOf(m.name) >= 0) m.visible = !!on; }); return st.meshes.filter(function (m) { return m.visible; }).length; }   // the bench's switch (guards and pictures only)
  function progIds() { var out = {}; if (!X || !X.renderer || !X.renderer.properties) return out; for (var k in st.L) { var mp = X.renderer.properties.get(st.L[k]), pr = mp.currentProgram || mp.program; out[k] = pr ? pr.id : null; } return out; }   // the bench's read: which compiled program each of our materials draws with (the same ids before and after a flight in = nothing compiled in flight)
  return { C: C, PLACES: PLACES, init: init, peek: peek, bench: bench, show: show, progIds: progIds };
})();
