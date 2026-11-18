/* reef837.js - BOARD 837, UNDER THE WATER AND ALL MARINE LIFE (Wings for Rouge). Trunks, Nov 18 2026.
   Marth, Nov 18 2026, verbatim: "Further additions to the video base. Look at what one made using the Same tools. Water. Clouds. All marine life. I'm sure
   if there was land animals and grass it'd be to the same standard . Learn and adapt please"
   THE BAR (his clip refs-1118-su40/09, studied, never copied: none of its look, species designs or art): teal water that fogs with distance, light shafts
   from the surface, caustics dancing on the sand, floating specks, the surface seen from below as a bright moving ceiling; reefs of mixed colourful coral
   and sea grass; many kinds of fish at once, schools turning together, rays gliding, each with its own gait.

   WHAT ROUGE SEES, wherever she is under the water (home, the Blue Hole, out in the world):
     THE LIGHT   the surface from below (a bright, rippling ceiling, brightest in the round window straight above her), shafts of light slanting down from
                 it, caustics wavering on the floor, specks drifting in the water. Dimmer at night and in rain, fading as she goes deep.
     THE REEF    where real reefs grow: on the home island's shelf (round its patch reef and round the Blue Hole, never in the hole's mouth nor on its bells)
                 and, out in the world, on the tropical shelves (under 32 deg of latitude, 1-25 m of water: the Caribbean round Jamaica first). Coral
                 heads standing as pillars, patch reefs (the kit's own brain coral, elkhorn, sea fans, tube sponges, staghorn), branching thickets, and
                 beds of turtle grass that sway. Out in the world, where the drawn ground stops at the sea's level, a sandy bed at the sea's real depth.
     THE FISH   Caribbean kinds, each with its own gait: a school of blue chromis that turns as one (each fish follows the school's heading a beat apart,
                 so a turn ripples through it), queen angelfish gliding slow circles, stoplight parrotfish that swim, stop and nibble the coral, French
                 grunts hovering in small groups, foureye butterflyfish flitting in pairs, yellowtail snappers cruising wider loops, and spotted eagle
                 rays gliding (a few wing beats, then a long glide). Small fish dart away from her when she comes close.
   The fish, sharks and barracuda that were already here (animals714, world-animals) keep their own fights and drops: nothing of theirs is touched.

   BORROWED, NOT BUILT (MBAEEMP, the Borrow Law): every body and coral is drawn with animals714.js's kit (WFR_ANIMALS.kit.prim: loft, ell, tube, fin3, eye;
   the patch reef is the kit's own reef() builder, instanced); the hash and rng are world-people.js's; the water's fog is the page's own linear WATERFOG;
   the true sea floor out in the world is world-animals.js's rawAt829. New here is only the glue: instanced pools re-anchored round her, one vertex swim
   (one program for every fish, ray, coral and blade), and one light shader (one program for the ceiling, the caustics, the shafts and the specks; its
   caustic pattern is our own warped sine bands). No download, no licence beyond our own code.
   PHONE: everything is made at load and compiled there (N1: no program is made under the water); under the water it costs about 16 draws; above it, nothing.

   THE PAGE HANDS IT (wings-for-rouge.html): WFR_REEF837.create(ctx) once at load; tick(dt) before each render; bedAt(x, z, def) to the world swim.
   Standard only (Classic is frozen: nothing here is built). Every number and every name a DRAFT for Marth's pen. */
window.WFR_REEF837 = (function () {
  'use strict';
  var CLASSIC = (function () { try { return localStorage.getItem('wfr.look') === 'classic'; } catch (e) { return false; } })();
  var TAU = Math.PI * 2, D2R = Math.PI / 180;
  var C = { CELL: 14, WIN: 2, GRID: 25, GSTEP: 3, GSNAP: 6, CAP: { pillar: 28, patch: 20, branch: 32, grass: 340 }, LAT: 32, DEEP: 25, HOLE_R: 18, BELL_R: 2.6, REEF714_R: 4.5,
    LAKE_R: 200, EDGE_OUT: 390, FLEE: 2.4, SHAFTS: 26, SNOW: 700, SNOW_BOX: 22, SHAFT_BOX: 56, SHAFT_LEN: 22, VIEW: 32, FAR: 45 };   /* DRAFT */
  /* the Caribbean's own fish (real kinds, our own low-poly drawings): n each, f the tail beat (rad/s), v the cruise (m/s), loop the swim round its coral */
  var SP = [
    { id: 'chromis', name: 'Blue chromis', n: 140, f: 15, v: 0.9, school: true, orbit: 4.5, lift: 1.4, flee: 3.5, rad: 2.9, ry: 1.2 },
    { id: 'herring', name: 'Dwarf herring', n: 220, f: 18, v: 1.4, school: true, orbit: 3.4, lift: 2.4, flee: 4.5, rad: 2.0, ry: 0.8, long: 1.7 },   /* 837 v2: a second, bigger school of small silver fish, higher in the water */
    { id: 'angel', name: 'Queen angelfish', n: 6, f: 4.5, v: 0.32, loop: 1.8, hy: [0.5, 1.8], gait: 'glide' },
    { id: 'parrot', name: 'Stoplight parrotfish', n: 8, f: 6, v: 0.55, loop: 2.4, hy: [0.25, 1.2], gait: 'graze' },
    { id: 'grunt', name: 'French grunt', n: 12, f: 7.5, v: 0.22, loop: 0.9, hy: [0.3, 1.0], gait: 'hover', group: 4 },
    { id: 'butterfly', name: 'Foureye butterflyfish', n: 8, f: 11, v: 0.6, loop: 1.4, hy: [0.3, 1.4], gait: 'flit', group: 2 },
    { id: 'snapper', name: 'Yellowtail snapper', n: 10, f: 8, v: 1.0, loop: 5, hy: [1.0, 2.8], gait: 'cruise', group: 5 },
    { id: 'ray', name: 'Spotted eagle ray', n: 2, f: 1.5, v: 0.95, loop: 13, hy: [2.2, 4.5], gait: 'ray' }
  ];

  /* ---------- seeds: world-people.js's, line for line (the same place, the same reef, on every visit and every phone) ---------- */
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function wrapA(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

  /* ---------- the shaders: one swim (Lambert + a vertex wave), one light ---------- */
  var SWIM_VS = 'float ph837 = uT837 * aPh.y + aPh.x;\n' +
    '  transformed.x += aPh.z * aSw.x * sin(ph837 - aSw.w);\n' +   // the body's wave (a fish's tail beat runs nose to tail)
    '  transformed.y += aPh.z * aSw.y * sin(ph837 - aSw.w);\n' +   // a ray's wings
    '#ifdef USE_INSTANCING\n  vec2 wp837 = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);\n#else\n  vec2 wp837 = vec2(0.0);\n#endif\n' +
    '  transformed.x += aSw.z * sin(uT837 * 1.3 + wp837.x * 0.37 + wp837.y * 0.21 + position.y * 2.0);\n' +   // the grass in the swell
    '  transformed.z += aSw.z * 0.7 * sin(uT837 * 0.9 + wp837.y * 0.31 - wp837.x * 0.17);\n' +
    '  vTex837 = aTex; vO837 = position * 3.1 + vec3(fract(wp837.x * 0.131) * 9.0, 0.0, fract(wp837.y * 0.173) * 9.0);\n';   // the coral's own surface, in its own small numbers (a phone's float stays exact)
  /* the coral's surface, in the fragment (no texture file): lumps and polyps from a value noise, and small bright colonies of colour; no shine on coral */
  var SWIM_FS_HEAD = 'varying float vTex837; varying vec3 vO837;\n' +
    'float h837(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\n' +
    'float vn837(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);\n' +
    '  return mix(mix(mix(h837(i), h837(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h837(i + vec3(0.0, 1.0, 0.0)), h837(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),\n' +
    '             mix(mix(h837(i + vec3(0.0, 0.0, 1.0)), h837(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h837(i + vec3(0.0, 1.0, 1.0)), h837(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }\n';
  var SWIM_FS = '#include <color_fragment>\n' +
    '  if (vTex837 > 0.0) { float n1 = vn837(vO837 * 2.0), n2 = vn837(vO837 * 5.5 + 3.1), n3 = vn837(vO837 * 0.45 + 7.7);\n' +
    '    diffuseColor.rgb *= mix(1.0, 0.7 + 0.5 * n1 * (0.55 + 0.45 * n2), vTex837);\n' +
    '    vec3 pop = n3 < 0.3 ? vec3(0.93, 0.47, 0.62) : n3 < 0.45 ? vec3(0.97, 0.63, 0.3) : n3 < 0.6 ? vec3(0.58, 0.4, 0.82) : n3 < 0.75 ? vec3(0.93, 0.84, 0.4) : vec3(0.36, 0.74, 0.8);\n' +
    '    diffuseColor.rgb = mix(diffuseColor.rgb, pop, vTex837 * smoothstep(0.66, 0.78, n2) * smoothstep(0.35, 0.6, n1) * 0.8); }\n';
  var LIGHT_VS = [
    'uniform float uMode; uniform float uT; uniform vec3 uCam; uniform vec3 uSun; uniform vec4 uBox; uniform mat4 uInv;',
    'attribute vec4 aQ;',
    'varying vec3 vW; varying vec2 vQ; varying float vP;',
    'void main() {',
    '  vP = 0.0; vQ = position.xy;',
    '  if (uMode > 3.5) { vec4 w = uInv * vec4(position.xy, 1.0, 1.0); vW = w.xyz / w.w; gl_Position = vec4(position.xy, 0.99999, 1.0); return; }',   // 837 v2: the water itself, one pass over the whole picture (behind everything)
    '  if (uMode < 1.5) { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; return; }',
    '  if (uMode < 2.5) {',   // a shaft: world-anchored, wrapped in a box round the eye, slanted down the light, turned to face the eye about its own axis
    '    float B = uBox.x; vec2 c = uCam.xz + mod(aQ.xy - uCam.xz + 0.5 * B, B) - 0.5 * B;',
    '    vec3 dir = normalize(vec3(-uSun.x * 0.32, -1.0, -uSun.z * 0.32));',
    '    float len = uBox.z * (0.7 + 0.6 * fract(aQ.w * 7.13));',
    '    vec3 a = vec3(c.x, uBox.y, c.y) + dir * (position.y * len);',
    '    vec3 sd = cross(dir, uCam - a); sd = sd / max(length(sd), 0.001);',
    '    vec3 w = a + sd * position.x * aQ.z * (1.0 + 1.2 * position.y);',
    '    vW = w; vP = aQ.w; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); return;',
    '  }',
    '  float S = uBox.x;',   // a speck: wrapped in a box round the eye, drifting, a tiny quad facing the eye
    '  vec3 o = aQ.xyz + vec3(sin(uT * 0.11 + aQ.w * 6.0) * 0.4, -uT * 0.06, cos(uT * 0.09 + aQ.w * 4.0) * 0.4);',
    '  vec3 w = uCam + mod(o - uCam + 0.5 * S, S) - 0.5 * S;',
    '  vW = w; vP = aQ.w; vec4 mv = viewMatrix * vec4(w, 1.0); mv.xy += position.xy * (0.012 + 0.03 * fract(aQ.w * 13.7)); gl_Position = projectionMatrix * mv;',
    '}'].join('\n');
  var LIGHT_FS = [
    'uniform float uMode; uniform float uT; uniform float uI; uniform vec3 uCol; uniform vec3 uCam; uniform vec3 uSun; uniform vec2 uFog; uniform vec4 uBox; uniform vec3 uFogCol;',
    'varying vec3 vW; varying vec2 vQ; varying float vP;',
    'float caus(vec2 p, float t) {',   // our own caustic: two warped layers of sine bands; bright where a band crosses zero
    '  vec2 q = p + 0.55 * vec2(sin(p.y * 1.27 + t * 0.83), sin(p.x * 1.13 - t * 0.71));',
    '  float a = abs(sin(q.x * 2.07 + t * 0.61) + sin(q.y * 2.31 - t * 0.47) + 0.4 * sin((q.x + q.y) * 1.3 + t * 0.9));',
    '  vec2 r = p * 1.37 + 0.5 * vec2(sin(p.y * 0.93 - t * 0.77), sin(p.x * 1.21 + t * 0.59));',
    '  float b = abs(sin(r.x * 1.71 - t * 0.43) + sin(r.y * 1.93 + t * 0.67));',
    '  float c = (1.0 - smoothstep(0.0, 0.42, a)) + 0.8 * (1.0 - smoothstep(0.0, 0.42, b));',
    '  return c * c * 0.5;',
    '}',
    'void main() {',
    '  if (uMode > 3.5) {',   // the water seen in every direction: the haze colour at eye level, paler toward the surface, deep and dark below; a glow toward the sun
    '    vec3 v = normalize(vW - uCam); float y = v.y, sunG = pow(max(0.0, dot(v, normalize(vec3(uSun.x * 0.32, 1.0, uSun.z * 0.32)))), 6.0);',
    '    vec3 top = mix(uFogCol, vec3(0.78, 0.96, 0.93), 0.55), deep = uFogCol * vec3(0.32, 0.42, 0.48);',
    '    vec3 col = y < 0.0 ? mix(uFogCol, deep, smoothstep(0.0, -0.75, y)) : mix(uFogCol, top, smoothstep(0.0, 0.9, y));',
    '    gl_FragColor = vec4((col + vec3(0.25, 0.32, 0.3) * sunG * uI) * mix(0.3, 1.0, uI), 1.0); return;',
    '  }',
    '  float d = distance(vW, uCam), fade = 1.0 - smoothstep(uFog.x, uFog.y, d), k = 0.0;',
    '  if (uMode < 0.5) {',   // the surface from below: the round window above her, the sun in it, the ripples everywhere
    '    float h = max(0.3, vW.y - uCam.y), r = length(vW.xz - uCam.xz) / h, win = 1.0 - smoothstep(0.95, 1.3, r);',
    '    float rip = caus(vW.xz * 0.42, uT * 1.25);',
    '    float sunS = pow(max(0.0, dot(normalize(vW - uCam), normalize(vec3(uSun.x * 0.32, 1.0, uSun.z * 0.32)))), 24.0);',
    '    k = (0.18 + 0.55 * win + 0.9 * sunS * win) * (0.55 + 0.45 * rip) * (0.35 + 0.65 * fade);',
    '  } else if (uMode < 1.5) {',   // the caustics on the floor, fading with depth
    '    k = caus(vW.xz * 0.6, uT) * exp(-max(0.0, uBox.y - vW.y) / 16.0) * fade * 0.9;',
    '  } else if (uMode < 2.5) {',   // a shaft: soft edges, bright at the top, breathing
    '    float u = vQ.x, v = vQ.y; k = pow(1.0 - u * u, 2.0) * pow(1.0 - v, 1.6) * (0.55 + 0.45 * sin(uT * 0.6 + vP * 6.28)) * fade * 0.55;',
    '  } else {',
    '    k = (1.0 - smoothstep(0.15, 1.0, dot(vQ, vQ))) * fade * 0.55;',
    '  }',
    '  gl_FragColor = vec4(uCol * k * uI, 1.0);',
    '}'].join('\n');

  function create(ctx) {
    if (CLASSIC || !ctx || !ctx.THREE) return null;
    var THREE = ctx.THREE, KIT = window.WFR_ANIMALS && WFR_ANIMALS.kit, PR = KIT && KIT.prim;
    if (!PR) throw new Error('reef837: no kit (animals714.js)');
    var st = { fault: null, t: 0, on: false, where: '', key: '', f: null, pend: false, fillT: -9, fills: 0, anchors: [], wc: { x: 0, z: 0, y: 0 }, gc: { x: 1e9, z: 1e9, where: '' }, gPend: false,
      grid: 0, gT: 0, school: null, fish: [], tris: {}, bed: false, flees: 0, lastI: 0, ms: [], msMax: 0 };
    var G = new THREE.Group(); G.name = 'reef837'; ctx.scene.add(G);
    var LAYER = ctx.layer;
    function lift(o) { if (LAYER != null) o.layers.enable(LAYER); o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; return o; }

    /* ---------- one swim material for everything instanced (its program made at load) ---------- */
    var U = { t: { value: 0 } };
    var MAT = new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, shininess: 34, specular: 0x262a2a });   /* 837 v2: per-pixel light and a wet sheen on the fish (Lambert lit only the corners: it read faceted) */
    MAT.onBeforeCompile = function (sh) { sh.uniforms.uT837 = U.t; sh.vertexShader = 'uniform float uT837;\nattribute vec4 aSw;\nattribute vec3 aPh;\nattribute float aTex;\nvarying float vTex837; varying vec3 vO837;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  ' + SWIM_VS);
      sh.fragmentShader = SWIM_FS_HEAD + sh.fragmentShader.replace('#include <color_fragment>', SWIM_FS).replace('#include <specularmap_fragment>', '#include <specularmap_fragment>\n  specularStrength *= 1.0 - 0.85 * vTex837;'); };
    MAT.customProgramCacheKey = function () { return 'reef837swim'; };
    MAT.name = 'reef837:swim';

    /* 837 v2: SMOOTH. The kit's soup is flat (one normal and one colour per face: it read faceted, "juvenile"). Where faces meet at the same corner and
       bend less than the crease, their normals and colours are averaged: rounded bodies and soft colour gradients; fin edges and sharp rims stay crisp */
    function smoothSoup(p, n, c, creaseDeg, colToo) {
      var N = p.length / 3, cosC = Math.cos(creaseDeg * D2R), map = new Map(), i, j, k, on = new Float32Array(n), oc = new Float32Array(c), nn = new Float32Array(N * 3), nc = colToo ? new Float32Array(N * 3) : c;
      for (i = 0; i < N; i++) { k = Math.round(p[i * 3] * 2e4) + ',' + Math.round(p[i * 3 + 1] * 2e4) + ',' + Math.round(p[i * 3 + 2] * 2e4); var L = map.get(k); if (L) L.push(i); else map.set(k, [i]); }
      map.forEach(function (L) { for (var a = 0; a < L.length; a++) { var ia = L[a] * 3, sx = 0, sy = 0, sz = 0, cr = 0, cg = 0, cb = 0, m = 0;
        for (var b = 0; b < L.length; b++) { var ib = L[b] * 3; if (on[ia] * on[ib] + on[ia + 1] * on[ib + 1] + on[ia + 2] * on[ib + 2] < cosC) continue; sx += on[ib]; sy += on[ib + 1]; sz += on[ib + 2]; cr += oc[ib]; cg += oc[ib + 1]; cb += oc[ib + 2]; m++; }
        var l = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1; nn[ia] = sx / l; nn[ia + 1] = sy / l; nn[ia + 2] = sz / l; if (colToo) { nc[ia] = cr / m; nc[ia + 1] = cg / m; nc[ia + 2] = cb / m; } } });
      for (j = 0; j < N * 3; j++) n[j] = nn[j]; if (colToo) for (j = 0; j < N * 3; j++) c[j] = nc[j];
    }
    function flatNormals(p, n) { for (var i = 0; i < p.length; i += 9) { var ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2], vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1, ox = n[i], oy = n[i + 1], oz = n[i + 2], sg = nx * ox + ny * oy + nz * oz < 0 ? -1 : 1;
      for (var k = 0; k < 3; k++) { n[i + k * 3] = sg * nx / l; n[i + k * 3 + 1] = sg * ny / l; n[i + k * 3 + 2] = sg * nz / l; } } }   // after a displacement: each face's own normal again, on the side it faced before
    /* a small value noise for the lumps (the same position: the same lump, so shared corners never crack) */
    function vh(x, y, z) { var h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
    function vn(x, y, z) { var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
      var l = function (a, b, t) { return a + (b - a) * t; };
      return l(l(l(vh(ix, iy, iz), vh(ix + 1, iy, iz), fx), l(vh(ix, iy + 1, iz), vh(ix + 1, iy + 1, iz), fx), fy), l(l(vh(ix, iy, iz + 1), vh(ix + 1, iy, iz + 1), fx), l(vh(ix, iy + 1, iz + 1), vh(ix + 1, iy + 1, iz + 1), fx), fy), fz); }
    function geoOf(p, n, c, sw, cap, tex) {   // the kit's triangle soup to a BufferGeometry: position, normal, colour, the swim weights, a phase per instance; tex 1: the coral's surface
      var g = new THREE.BufferGeometry(), N = p.length / 3, S = new Float32Array(N * 4), i;
      g.setAttribute('aTex', new THREE.BufferAttribute(new Float32Array(N).fill(tex || 0), 1));
      if (sw) for (i = 0; i < N; i++) { var r = sw(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); if (r) { S[i * 4] = r[0]; S[i * 4 + 1] = r[1]; S[i * 4 + 2] = r[2]; S[i * 4 + 3] = r[3]; } }
      g.setAttribute('position', new THREE.BufferAttribute(p instanceof Float32Array ? p : new Float32Array(p), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(n instanceof Float32Array ? n : new Float32Array(n), 3));
      g.setAttribute('color', new THREE.BufferAttribute(c instanceof Float32Array ? c : new Float32Array(c), 3));
      g.setAttribute('aSw', new THREE.BufferAttribute(S, 4));
      var ph = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); ph.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aPh', ph);
      g.computeBoundingSphere(); return g;
    }
    var WHITE = new THREE.Color(1, 1, 1);
    function pool(name, g, cap) {   // an InstancedMesh, its colours laid at load (instanceColor is part of the program: it must exist before the compile)
      var im = new THREE.InstancedMesh(g, MAT, cap); im.name = 'reef837:' + name; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (var i = 0; i < cap; i++) im.setColorAt(i, WHITE); im.count = 0; im.visible = false; lift(im); G.add(im);
      st.tris[name] = Math.round(g.attributes.position.count / 3); return im;
    }

    /* ---------- the coral: pillars, the kit's patch reef, branching thickets; and the grass ---------- */
    var hex = PR.hex, mixc = PR.mixc;
    var PAL = [0xe86f9a, 0xf08a3c, 0x8a4fc0, 0xe8c840, 0x6fbf5a, 0x3fb0a0, 0xd8505a, 0xf2a0c8].map(hex);
    function pillarG() {   // 837 v2: a coral head standing as a pillar: ONE lumpy column (no stacked blobs), a broad mushroom cap, boulder brain coral on its flanks,
      // a sea fan and sponges on top; natural tones (olive, ochre, grey-green, a little mauve), the colour colonies laid by the shader (~2.3 m)
      var Gk = PR.G0(), olive = hex(0x6d7350), ochre = hex(0x8a7650), grey = hex(0x5d6b60), mauve = hex(0x7a6070), dark = hex(0x3e463c);
      var tone = function (c, nx, ny, nz, x, y, z) { var v = vn(x * 2.1 + 3, y * 1.7, z * 2.1 - 2); return v < 0.3 ? mixc(c, grey, 0.6) : v > 0.72 ? mixc(c, mauve, 0.45) : v > 0.55 ? mixc(c, ochre, 0.5) : c; };
      PR.ell(Gk, { c: [0, 0.75, 0], r: [0.62, 0.95, 0.58], seg: 16, ring: 12, top: olive, belly: dark, bone: 0, pat: tone });   // the column
      PR.ell(Gk, { c: [0.05, 1.82, 0.02], r: [0.9, 0.42, 0.82], seg: 16, ring: 10, squash: 0.55, top: olive, belly: dark, bone: 0, pat: tone });   // the cap
      var start = Gk.p.length;
      for (var k = 0; k < 5; k++) { var a = k / 5 * TAU + 0.4, y = 0.35 + (k % 3) * 0.45, rr = 0.55 - 0.05 * (k % 2); PR.ell(Gk, { c: [Math.cos(a) * rr, y, Math.sin(a) * rr], r: [0.24, 0.19, 0.24], seg: 10, ring: 7, top: hex(k % 2 ? 0xb9a96a : 0xa49a68), belly: hex(0x6e6a48), bone: 0,
        pat: function (c, nx, ny, nz, x, y2, z) { return Math.sin(x * 38 + Math.sin(z * 31) * 2.2 + y2 * 11) > 0.45 ? mixc(c, hex(0x5a5436), 0.55) : c; } }); }   // brain coral boulders, their grooves
      var gEnd = Gk.p.length;
      for (k = 0; k < 2; k++) { var b = k * 2.6 + 0.9, bx = Math.cos(b) * 0.4, bz = Math.sin(b) * 0.35, cx = Math.cos(b + 1.57), cz = Math.sin(b + 1.57), P = [[bx, 2.1, bz]];
        for (var i = 0; i <= 6; i++) { var an = -1.1 + i * 0.37, rr2 = 0.5 * (0.85 + 0.15 * Math.cos(an * 2)); P.push([bx + cx * Math.sin(an) * rr2, 2.1 + Math.cos(an) * rr2, bz + cz * Math.sin(an) * rr2]); }
        PR.fin3(Gk, P, 0.02, hex(k ? 0x8a4f8e : 0x9a5a7a), 0, [cz, 0, -cx]); }   // sea fans on the cap
      for (k = 0; k < 4; k++) { var s = k / 4 * TAU + 0.2, sx = Math.cos(s) * 0.32, sz = Math.sin(s) * 0.3, h = 0.22 + (k % 2) * 0.18;
        PR.tube(Gk, { a: [sx, 1.98, sz], b: [sx * 1.15, 2.05 + h, sz * 1.15], ra: 0.06, rb: 0.075, sides: 8, col: hex([0xc0703c, 0xb89a3e, 0x7a5a8a, 0xb0603a][k]), bone: 0 }); }   // tube sponges
      for (var q = 0; q < start; q += 3) { var x = Gk.p[q], y3 = Gk.p[q + 1], z = Gk.p[q + 2], rl = Math.hypot(x, z) || 1, d = (vn(x * 2.6, y3 * 2.6, z * 2.6) - 0.5) * 0.34 + (vn(x * 6.1 + 5, y3 * 6.1, z * 6.1) - 0.5) * 0.1;
        Gk.p[q] = x + x / rl * d; Gk.p[q + 1] = y3 + d * 0.35; Gk.p[q + 2] = z + z / rl * d; }   // the lumps (column and cap only): a function of the place, so shared corners never crack
      for (q = start; q < gEnd; q += 3) { var x2 = Gk.p[q], y4 = Gk.p[q + 1], z2 = Gk.p[q + 2], d2 = (vn(x2 * 9, y4 * 9, z2 * 9) - 0.5) * 0.05; Gk.p[q] += d2; Gk.p[q + 1] += d2; Gk.p[q + 2] += d2; }
      flatNormals(Gk.p, Gk.n);
      return Gk;
    }
    function branchG() {   // an elkhorn and staghorn thicket (~1.1 m), pale tips
      var Gk = PR.G0(), R = rng(8371), base = hex(0xc58f55), tipC = hex(0xeed9b0);
      PR.ell(Gk, { c: [0, 0.08, 0], r: [0.38, 0.2, 0.36], seg: 7, ring: 4, top: hex(0x8a7a52), belly: hex(0x5a5040), bone: 0 });
      for (var k = 0; k < 9; k++) { var a = k / 9 * TAU + R() * 0.5, L = 0.45 + R() * 0.35, o = [Math.cos(a) * 0.15, 0.15, Math.sin(a) * 0.15], t1 = [o[0] + Math.cos(a) * L * 0.6, 0.15 + L * (0.6 + R() * 0.4), o[2] + Math.sin(a) * L * 0.6];
        var col = k % 3 === 0 ? hex(0xd8b07a) : k % 3 === 1 ? base : hex(0xd99a6a);
        PR.tube(Gk, { a: o, b: t1, ra: 0.055, rb: 0.035, sides: 6, col: col, bone: 0 });
        for (var j = 0; j < 2; j++) { var b2 = a + (j ? 0.6 : -0.6), L2 = 0.2 + R() * 0.2, t2 = [t1[0] + Math.cos(b2) * L2, t1[1] + L2 * 0.8, t1[2] + Math.sin(b2) * L2];
          PR.tube(Gk, { a: t1, b: t2, ra: 0.035, rb: 0.022, sides: 6, col: col, bone: 0 }); PR.ell(Gk, { c: t2, r: [0.03, 0.03, 0.03], seg: 5, ring: 3, col: tipC, bone: 0 }); } }
      return Gk;
    }
    function grassG() {   // a tuft of turtle grass: 9 ribbon blades, 3 segments each, dark at the root, light at the tip; aSw.z bends the tips
      var Gk = { p: [], n: [], c: [], b: [], s: [] }, R = rng(8372);
      for (var k = 0; k < 9; k++) { var a = R() * TAU, r0 = R() * 0.16, x0 = Math.cos(a) * r0, z0 = Math.sin(a) * r0, h = 0.5 + R() * 0.35, w = 0.035 + R() * 0.015, yw = R() * Math.PI, ux = Math.cos(yw) * w, uz = Math.sin(yw) * w, lean = (R() - 0.5) * 0.12;
        for (var s = 0; s < 3; s++) { var y0 = s / 3 * h, y1 = (s + 1) / 3 * h, k0 = 1 - s / 3 * 0.7, k1 = 1 - (s + 1) / 3 * 0.7, l0 = lean * (s / 3) * (s / 3), l1 = lean * ((s + 1) / 3) * ((s + 1) / 3);
          var A = [x0 - ux * k0 + l0, y0, z0 - uz * k0], B = [x0 + ux * k0 + l0, y0, z0 + uz * k0], Cq = [x0 + ux * k1 + l1, y1, z0 + uz * k1], D = [x0 - ux * k1 + l1, y1, z0 - uz * k1];
          var col = mixc(hex(0x2f5a28), hex(0x8fc060), (s + 0.5) / 3), nx = Math.sin(yw), nz = -Math.cos(yw);
          [A, B, Cq, A, Cq, D].forEach(function (P) { Gk.p.push(P[0], P[1], P[2]); Gk.n.push(nx, 0, nz); Gk.c.push(col[0], col[1], col[2]); }); } }
      return Gk;
    }
    function soup(Gk, crease, colToo) { var o = { p: new Float32Array(Gk.p), n: new Float32Array(Gk.n), c: new Float32Array(Gk.c) }; if (crease) smoothSoup(o.p, o.n, o.c, crease, colToo); return o; }
    var sp0 = soup(pillarG(), 62, true), sb0 = soup(branchG(), 60, false), sg0 = soup(grassG()), rf = KIT.reef({ seed: 837, w: 1.5, d: 1.1, floor: function () { return 0; } });
    smoothSoup(rf.pos, rf.nrm, rf.color, 55, false);   // the kit's patch reef, rounded (its own colours kept: the grooves and the sponge mouths)
    var POOL = {
      pillar: pool('pillar', geoOf(sp0.p, sp0.n, sp0.c, null, C.CAP.pillar, 1), C.CAP.pillar),
      patch: pool('patch', geoOf(rf.pos, rf.nrm, rf.color, null, C.CAP.patch, 0.7), C.CAP.patch),
      branch: pool('branch', geoOf(sb0.p, sb0.n, sb0.c, null, C.CAP.branch, 0.35), C.CAP.branch),
      grass: pool('grass', geoOf(sg0.p, sg0.n, sg0.c, function (x, y) { var h = y / 0.85; return [0, 0, 0.12 * h * h, 0]; }, C.CAP.grass), C.CAP.grass)
    };
    var HGT = { pillar: 2.35, patch: 0.95, branch: 1.15, grass: 0.85 };

    /* ---------- the fish: the kit's loft and fins, our own Caribbean colours; each built facing +z, the nose at z0 ---------- */
    function body(Gk, o) {   // o: L, rx, ry, col(u, up, side), rings, sides; returns hz
      var L = o.L, hz = L / 2;
      PR.loft(Gk, { L: L * 0.84, z0: hz * 0.84, rings: o.rings || 8, sides: o.sides || 8, nose: o.nose || 0.004, tailX: 0.002,
        prof: o.prof || function (u) { var e = Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.04)); return [o.rx * (0.25 + 0.75 * e), o.ry * (0.25 + 0.75 * e), 0]; }, col: o.col });
      return hz;
    }
    function eyes(Gk, rx, ry, hz, r) { [1, -1].forEach(function (sd) { PR.ell(Gk, { c: [sd * rx * 0.8, ry * 0.25, hz * 0.55], r: [r * 0.6, r, r], seg: 4, ring: 2, col: hex(0x0a0a0c), bone: 0 }); }); }
    function forked(Gk, ry, hz, col, k) { k = k || 1; PR.fin3(Gk, [[0, 0, -hz * 0.78], [0, ry * 0.95 * k, -hz * 1.3], [0, 0, -hz * 1.05], [0, -ry * 0.95 * k, -hz * 1.3]], 0.004, col, 1, [1, 0, 0]); }
    var FISHG = {
      chromis: function () { var Gk = PR.G0(), L = 0.12, rx = 0.016, ry = 0.034, top = hex(0x1d5ec6), mid = hex(0x2f86e6), bel = hex(0x6fb2f0);
        var hz = body(Gk, { L: L, rx: rx, ry: ry, rings: 6, sides: 6, col: function (u, up) { return up > 0.35 ? top : up < -0.45 ? bel : mid; } });
        PR.fin3(Gk, [[0, ry * 0.8, hz * 0.3], [0, ry * 1.4, -hz * 0.2], [0, ry * 0.8, -hz * 0.6]], 0.003, top, 0, [1, 0, 0]); forked(Gk, ry, hz, hex(0x2a70d8), 1.1); eyes(Gk, rx, ry, hz, 0.006); return { G: Gk, L: L, rx: rx }; },
      angel: function () { var Gk = PR.G0(), L = 0.34, rx = 0.032, ry = 0.12, bg = hex(0x3a9fb8), yel = hex(0xe8c838), crown = hex(0x1a3fa0), dot = hex(0x5fc0d8);
        var hz = body(Gk, { L: L, rx: rx, ry: ry, rings: 8, sides: 8, col: function (u, up, sd) { if (u < 0.2 && up > 0.55) return crown; var c = mixc(bg, yel, smooth(0.35, 1, u) * 0.6); return (Math.floor(u * 9) + Math.floor(up * 3)) % 3 === 0 ? mixc(c, dot, 0.35) : c; } });
        PR.fin3(Gk, [[0, ry * 0.8, hz * 0.3], [0, ry * 1.65, -hz * 0.35], [0, ry * 1.25, -hz * 1.45], [0, ry * 0.6, -hz * 0.75]], 0.005, hex(0x3a8fd0), 0, [1, 0, 0]);   // the long dorsal, swept back
        PR.fin3(Gk, [[0, -ry * 0.8, hz * 0.1], [0, -ry * 1.55, -hz * 0.45], [0, -ry * 1.2, -hz * 1.45], [0, -ry * 0.6, -hz * 0.75]], 0.005, hex(0x3a8fd0), 0, [1, 0, 0]);
        PR.fin3(Gk, [[0, 0, -hz * 0.8], [0, ry * 0.7, -hz * 1.2], [0, 0.0, -hz * 1.32], [0, -ry * 0.7, -hz * 1.2]], 0.005, hex(0xf2d22a), 1, [1, 0, 0]);   // the round yellow tail
        [1, -1].forEach(function (sd) { PR.fin3(Gk, [[sd * rx, 0, hz * 0.35], [sd * rx * 3, -ry * 0.1, hz * 0.05], [sd * rx, -ry * 0.25, hz * 0.15]], 0.003, hex(0xf2d22a), 0, [0, 1, 0]); });
        eyes(Gk, rx, ry, hz, 0.012); return { G: Gk, L: L, rx: rx }; },
      parrot: function () { var Gk = PR.G0(), L = 0.42, rx = 0.055, ry = 0.085, g1 = hex(0x26a57a), g2 = hex(0x34c08e), back = hex(0x1d8a64), bel = hex(0x7fd0a8), org = hex(0xe8803a), beak = hex(0xbfe8d0), spot = hex(0xf0d040);
        var hz = body(Gk, { L: L, rx: rx, ry: ry, rings: 9, sides: 8, col: function (u, up, sd) { if (u < 0.07) return beak; if (u > 0.2 && u < 0.28 && Math.abs(sd) > 0.6 && up > 0) return spot; if (u > 0.88) return org; if (up > 0.5) return back; if (up < -0.5) return bel; return (Math.floor(u * 12) + Math.floor(sd * 2 + 2)) % 2 ? g1 : g2; } });
        PR.fin3(Gk, [[0, ry * 0.85, hz * 0.45], [0, ry * 1.25, hz * 0.1], [0, ry * 1.2, -hz * 0.55], [0, ry * 0.8, -hz * 0.7]], 0.004, hex(0xd86a7a), 0, [1, 0, 0]);
        PR.fin3(Gk, [[0, 0, -hz * 0.8], [0, ry * 1.0, -hz * 1.28], [0, 0, -hz * 1.12], [0, -ry * 1.0, -hz * 1.28]], 0.004, hex(0x3fbf8f), 1, [1, 0, 0]);
        [1, -1].forEach(function (sd) { PR.fin3(Gk, [[sd * rx, -ry * 0.1, hz * 0.4], [sd * rx * 2.6, -ry * 0.3, hz * 0.1], [sd * rx, -ry * 0.35, hz * 0.2]], 0.003, hex(0x5fd0a0), 0, [0, 1, 0]); });
        eyes(Gk, rx, ry, hz, 0.012); return { G: Gk, L: L, rx: rx }; },
      grunt: function () { var Gk = PR.G0(), L = 0.24, rx = 0.035, ry = 0.06, base = hex(0x8fa8c8), stripe = hex(0xf2c43a), bel = hex(0xd6dbe0);
        var hz = body(Gk, { L: L, rx: rx, ry: ry, rings: 8, sides: 7, col: function (u, up) { if (up < -0.6) return bel; return Math.sin(u * 30 + up * 5) > 0.3 ? stripe : base; } });
        PR.fin3(Gk, [[0, ry * 0.85, hz * 0.4], [0, ry * 1.4, hz * 0.0], [0, ry * 1.1, -hz * 0.6], [0, ry * 0.8, -hz * 0.65]], 0.003, stripe, 0, [1, 0, 0]); forked(Gk, ry, hz, stripe); eyes(Gk, rx, ry, hz, 0.009); return { G: Gk, L: L, rx: rx }; },
      butterfly: function () { var Gk = PR.G0(), L = 0.12, rx = 0.016, ry = 0.06, base = hex(0xe6e2d4), line = hex(0x6f6a60), blk = hex(0x111111), ring = hex(0xf8f8f0), bar = hex(0x2a2622);
        var hz = body(Gk, { L: L, rx: rx, ry: ry, rings: 7, sides: 7, col: function (u, up, sd) { if (u > 0.68 && u < 0.86 && up > -0.1 && up < 0.6 && Math.abs(sd) > 0.35) return (u > 0.72 && u < 0.82 && up > 0.05 && up < 0.45) ? blk : ring; if (u > 0.1 && u < 0.18) return bar; return Math.sin(u * 60 + up * 18) > 0.7 ? line : base; } });
        PR.fin3(Gk, [[0, ry * 0.8, hz * 0.3], [0, ry * 1.25, -hz * 0.3], [0, ry * 0.95, -hz * 0.8], [0, ry * 0.6, -hz * 0.7]], 0.003, hex(0xe8d890), 0, [1, 0, 0]);
        PR.fin3(Gk, [[0, -ry * 0.8, hz * 0.0], [0, -ry * 1.2, -hz * 0.4], [0, -ry * 0.9, -hz * 0.8], [0, -ry * 0.6, -hz * 0.7]], 0.003, hex(0xe8d890), 0, [1, 0, 0]);
        PR.fin3(Gk, [[0, 0, -hz * 0.8], [0, ry * 0.6, -hz * 1.15], [0, 0, -hz * 1.22], [0, -ry * 0.6, -hz * 1.15]], 0.003, hex(0xe8e0c0), 1, [1, 0, 0]); eyes(Gk, rx, ry, hz, 0.006); return { G: Gk, L: L, rx: rx }; },
      snapper: function () { var Gk = PR.G0(), L = 0.42, rx = 0.045, ry = 0.075, back = hex(0x6c7fa0), yel = hex(0xf2d23a), bel = hex(0xd8d4d8), spot = hex(0xe8d050);
        var hz = body(Gk, { L: L, rx: rx, ry: ry, rings: 9, sides: 8, col: function (u, up, sd) { if (Math.abs(up) < 0.22) return yel; if (up > 0.22) return Math.sin(u * 40) * Math.sin(sd * 12) > 0.5 ? spot : back; return bel; } });
        PR.fin3(Gk, [[0, ry * 0.85, hz * 0.3], [0, ry * 1.3, -hz * 0.1], [0, ry * 0.9, -hz * 0.6]], 0.003, hex(0xe8d070), 0, [1, 0, 0]); forked(Gk, ry, hz, yel, 1.35); eyes(Gk, rx, ry, hz, 0.012); return { G: Gk, L: L, rx: rx }; },
      herring: function () { var Gk = PR.G0(), L = 0.07, rx = 0.008, ry = 0.014, back = hex(0x4f7f92), side = hex(0xcfdde4), bel = hex(0xf0f4f4), line = hex(0x9fb8c6);   /* 837 v2: Jenkinsia, the dwarf herring: tiny, silver, a blue-green back */
        var hz = body(Gk, { L: L, rx: rx, ry: ry, rings: 5, sides: 6, col: function (u, up) { return up > 0.45 ? back : up < -0.5 ? bel : Math.abs(up - 0.1) < 0.18 ? line : side; } });
        forked(Gk, ry, hz, hex(0x9fb4be), 1.2); return { G: Gk, L: L, rx: rx }; },
      ray: function () {   // a spotted eagle ray: a diamond disc (wings out along x), its raised body, the duck-bill head, the whip tail; navy with white spots above, white below
        var Gk = { p: [], n: [], c: [], b: [], s: [] }, navy = hex(0x1c2638), spot = hex(0xe8eef2), wht = hex(0xeef0f0), NZ = 10, NX = 12;
        var hw = function (z) { return z > -0.1 ? 0.9 * Math.max(0.03, 1 - Math.pow((z + 0.1) / 0.62, 1.3)) : 0.9 * Math.max(0.03, 1 - Math.pow((-0.1 - z) / 0.36, 0.8)); };
        var pt = function (i, j, top) { var z = -0.45 + i / NZ * 0.97, w = hw(z), x = (j / NX * 2 - 1) * w, t = 1 - Math.abs(x) / 0.9; return [x, top ? 0.05 * t * t + 0.004 : -0.012 * t, z]; };
        var push = function (A, B, Cq, col) { var ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Cq[0] - A[0], vy = Cq[1] - A[1], vz = Cq[2] - A[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          [A, B, Cq].forEach(function (P) { Gk.p.push(P[0], P[1], P[2]); Gk.n.push(nx / l, ny / l, nz / l); Gk.c.push(col[0], col[1], col[2]); }); };
        for (var i = 0; i < NZ; i++) for (var j = 0; j < NX; j++) { var hsh = hash(i + ':' + j) % 100, colT = hsh > 78 ? spot : navy;
          push(pt(i, j, 1), pt(i + 1, j + 1, 1), pt(i + 1, j, 1), colT); push(pt(i, j, 1), pt(i, j + 1, 1), pt(i + 1, j + 1, 1), colT);
          push(pt(i, j, 0), pt(i + 1, j, 0), pt(i + 1, j + 1, 0), wht); push(pt(i, j, 0), pt(i + 1, j + 1, 0), pt(i, j + 1, 0), wht); }
        PR.ell(Gk, { c: [0, 0.03, 0.02], r: [0.17, 0.07, 0.42], seg: 8, ring: 4, top: navy, belly: wht, bone: 0 });
        PR.ell(Gk, { c: [0, 0.01, 0.52], r: [0.09, 0.05, 0.12], seg: 6, ring: 3, top: hex(0x26324a), belly: wht, bone: 0 });
        [1, -1].forEach(function (sd) { PR.ell(Gk, { c: [sd * 0.085, 0.03, 0.47], r: [0.015, 0.015, 0.015], seg: 4, ring: 2, col: hex(0x0a0a0c), bone: 0 }); });
        PR.tube(Gk, { a: [0, 0.01, -0.42], b: [0, 0.01, -1.9], ra: 0.02, rb: 0.004, sides: 4, col: hex(0x161c28), bone: 0 });
        return { G: Gk, L: 1.0, ray: true };
      }
    };
    var FM = {};   // the fish pools: one InstancedMesh per kind
    SP.forEach(function (s) {
      var b = FISHG[s.id](), Gk = b.G, L = b.L, z0 = L / 2 * 0.84, sw, rx = b.rx || 0, o = soup(Gk, b.ray ? 50 : 58, true);   // 837 v2: smooth bodies, soft colour gradients
      if (!b.ray) { var y0 = 1e9, y1 = -1e9, q; for (q = 1; q < o.p.length; q += 3) { if (o.p[q] < y0) y0 = o.p[q]; if (o.p[q] > y1) y1 = o.p[q]; }
        for (q = 0; q < o.p.length; q += 3) { var tY = (o.p[q + 1] - y0) / ((y1 - y0) || 1), mY = 1.16 - 0.34 * tY; o.c[q] = Math.min(1, o.c[q] * mY); o.c[q + 1] = Math.min(1, o.c[q + 1] * mY); o.c[q + 2] = Math.min(1, o.c[q + 2] * mY); } }   // countershading: a darker back, a paler belly
      if (b.ray) sw = function (x, y, z) { var a = Math.abs(x) / 0.9; return [z < -0.42 ? 0.05 * clamp((-0.42 - z) / 1.5, 0, 1) : 0, 0.22 * Math.pow(a, 1.6), 0, a * 1.4 + (z < -0.42 ? (-0.42 - z) * 2 : 0)]; };
      else sw = function (x, y, z) { var u = clamp((z0 - z) / L, 0, 1.25), ax = Math.abs(x), fl = rx && ax > rx * 1.25 && u < 0.6 ? (ax - rx) * 0.9 : 0; return [0.11 * L * u * u, fl, 0, u * 2.4 + (fl ? 1.2 : 0)]; };   // the body's wave; the pectoral fins beat
      var g = geoOf(o.p, o.n, o.c, sw, s.n, 0), im = pool(s.id, g, s.n), ph = g.attributes.aPh, R = rng(hash('ph' + s.id));
      for (var i = 0; i < s.n; i++) { ph.array[i * 3] = R() * TAU; ph.array[i * 3 + 1] = s.f * (0.85 + R() * 0.3); ph.array[i * 3 + 2] = 1; }
      FM[s.id] = { im: im, ph: ph, s: s, L: L };
    });
    ['pillar', 'patch', 'branch', 'grass'].forEach(function (k) { var ph = POOL[k].geometry.attributes.aPh; for (var i = 0; i < C.CAP[k]; i++) { ph.array[i * 3] = i * 1.7; ph.array[i * 3 + 1] = 1; ph.array[i * 3 + 2] = k === 'grass' ? 1 : 0; } });

    /* ---------- the light: one shader, four meshes (the ceiling, the caustics, the shafts, the specks) ---------- */
    var LU = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uSun: { value: new THREE.Vector3(0.5, 0.8, 0.3) }, uFog: { value: new THREE.Vector2(6, 62) }, uI: { value: 1 }, uInv: { value: new THREE.Matrix4() }, uFogCol: { value: new THREE.Color(0x3aa6a2) } };
    function lightMat(mode, col, box, po) {
      var m = new THREE.ShaderMaterial({ uniforms: { uMode: { value: mode }, uT: LU.uT, uCam: LU.uCam, uSun: LU.uSun, uFog: LU.uFog, uInv: LU.uInv, uFogCol: LU.uFogCol, uI: { value: 1 }, uCol: { value: new THREE.Color(col) }, uBox: { value: new THREE.Vector4(box[0], box[1], box[2], 0) } },
        vertexShader: LIGHT_VS, fragmentShader: LIGHT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      if (po) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; } m.name = 'reef837:light' + mode; return m;
    }
    function waterQuad() { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)); g.setAttribute('aQ', new THREE.BufferAttribute(new Float32Array(16), 4)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; }   // the whole picture, in clip space
    function quads(n, fill) {   // n quads: corners in position.xy, the per-quad data in aQ
      var P = new Float32Array(n * 12), Q = new Float32Array(n * 16), I = [], R = rng(hash('q' + n));
      for (var i = 0; i < n; i++) { var q = fill(R), cs = [[-1, 0], [1, 0], [1, 1], [-1, 1]];
        for (var k = 0; k < 4; k++) { P[i * 12 + k * 3] = cs[k][0]; P[i * 12 + k * 3 + 1] = cs[k][1]; Q[i * 16 + k * 4] = q[0]; Q[i * 16 + k * 4 + 1] = q[1]; Q[i * 16 + k * 4 + 2] = q[2]; Q[i * 16 + k * 4 + 3] = q[3]; }
        I.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aQ', new THREE.BufferAttribute(Q, 4)); g.setIndex(I); return g;
    }
    var gs = quads(C.SHAFTS, function (R) { return [R() * C.SHAFT_BOX, R() * C.SHAFT_BOX, 0.7 + R() * 1.8, R()]; });
    var gn = quads(C.SNOW, function (R) { return [R() * C.SNOW_BOX, R() * C.SNOW_BOX, R() * C.SNOW_BOX, R()]; });
    for (var q = 0; q < C.SNOW * 4; q++) gn.attributes.position.array[q * 3 + 1] = gn.attributes.position.array[q * 3 + 1] * 2 - 1;   // a speck's corners run -1..1 both ways
    var gc = new THREE.PlaneGeometry(260, 260, 1, 1); gc.rotateX(Math.PI / 2); gc.setAttribute('aQ', new THREE.BufferAttribute(new Float32Array(4 * 4), 4));
    var NG = C.GRID, gridP = new Float32Array(NG * NG * 3), bedP = new Float32Array(NG * NG * 3), gridI = [];
    for (var gj = 0; gj < NG - 1; gj++) for (var gi = 0; gi < NG - 1; gi++) { var a0 = gj * NG + gi; gridI.push(a0, a0 + NG, a0 + 1, a0 + 1, a0 + NG, a0 + NG + 1); }
    var gg = new THREE.BufferGeometry(), gPos = new THREE.BufferAttribute(gridP, 3); gPos.setUsage(THREE.DynamicDrawUsage); gg.setAttribute('position', gPos); gg.setAttribute('aQ', new THREE.BufferAttribute(new Float32Array(NG * NG * 4), 4)); gg.setIndex(gridI);
    var LM = {
      ceiling: lift(new THREE.Mesh(gc, lightMat(0, 0xbfeef0, [0, 0, 0]))),
      caustics: lift(new THREE.Mesh(gg, lightMat(1, 0xd8fff4, [0, 0, 0], true))),
      shafts: lift(new THREE.Mesh(gs, lightMat(2, 0xd8fbff, [C.SHAFT_BOX, 0, C.SHAFT_LEN]))),
      snow: lift(new THREE.Mesh(gn, lightMat(3, 0xcfe8e4, [C.SNOW_BOX, 0, 0]))),
      water: lift(new THREE.Mesh(waterQuad(), lightMat(4, 0xffffff, [0, 0, 0])))   /* 837 v2: the water's own depth and haze, behind everything */
    };
    LM.water.material.blending = THREE.NormalBlending; LM.water.material.transparent = false;   // the same program (blending is not in its key); drawn first, opaque
    Object.keys(LM).forEach(function (k) { LM[k].name = 'reef837:' + k; LM[k].visible = false; LM[k].renderOrder = k === 'water' ? -100 : k === 'ceiling' ? 2 : 3; G.add(LM[k]); });
    LM.ceiling.position.set(0, -200, 0);
    /* the sea's bed out in the world (the drawn ground stops at the sea's level there): sand at the true depth; one instance of the swim program */
    var bg = new THREE.BufferGeometry(), bPos = new THREE.BufferAttribute(bedP, 3), bNrm = new THREE.BufferAttribute(new Float32Array(NG * NG * 3), 3), bCol = new Float32Array(NG * NG * 3);
    bPos.setUsage(THREE.DynamicDrawUsage); bNrm.setUsage(THREE.DynamicDrawUsage); bg.setAttribute('position', bPos); bg.setAttribute('normal', bNrm); bg.setAttribute('color', new THREE.BufferAttribute(bCol, 3)); bg.setAttribute('aSw', new THREE.BufferAttribute(new Float32Array(NG * NG * 4), 4));
    bg.setAttribute('aPh', new THREE.InstancedBufferAttribute(new Float32Array(3), 3)); bg.setAttribute('aTex', new THREE.BufferAttribute(new Float32Array(NG * NG), 1)); bg.setIndex(gridI);
    var BED = new THREE.InstancedMesh(bg, MAT, 1); BED.name = 'reef837:bed'; BED.setColorAt(0, WHITE); BED.setMatrixAt(0, new THREE.Matrix4()); BED.visible = false; lift(BED); G.add(BED);

    /* ---------- where she is: the floor, the reef's rule, the cells round her ---------- */
    function travel() { return !!(ctx.travel && ctx.travel()); }
    function surf() { return travel() ? 0 : ctx.water; }
    function rawT(x, z) { var r = ctx.raw ? ctx.raw(x, z) : null; return typeof r === 'number' && isFinite(r) ? r : null; }
    function floorAt(x, z) { if (!travel()) return ctx.H(x, z); var h = ctx.tH ? ctx.tH(x, z) : 0; if (h > 0.01) return h; var r = rawT(x, z); return r == null ? null : Math.min(h, r); }
    function homeOk(x, z) {   // the home island's shelf: out of the lake, short of the wind wall's far side, never in the Blue Hole's mouth, on its bells, or on the patch reef
      var r = Math.hypot(x, z); if (r < C.LAKE_R || r > C.EDGE_OUT) return false;
      var X0 = st.ex, hl = X0.hole; if (hl && Math.hypot(x - hl.x, z - hl.z) < C.HOLE_R) return false;   // st.ex: read once per refill (they never move)
      var bl = X0.bells; if (bl) for (var i = 0; i < bl.length; i++) if (Math.hypot(x - bl[i].x, z - bl[i].z) < C.BELL_R) return false;
      var rf0 = X0.reef; if (rf0 && Math.hypot(x - rf0.x, z - rf0.z) < C.REEF714_R) return false;
      return true;
    }
    function coralW(d) { return d < 1.2 ? 0 : d < 7 ? 1 : d < 20 ? (20 - d) / 13 : 0; }
    function grassW(d) { return d < 0.6 ? 0 : d < 6 ? 1 : d < 9 ? (9 - d) / 3 : 0; }
    function cellsAround(x, z) {   // the cells round her, nearest first: { key, xz(u, v) }; at home in metres, out in the world by latitude and longitude (stable across re-centres)
      var out = [], W = C.WIN, i, j;
      if (!travel()) { var ix = Math.floor(x / C.CELL), iz = Math.floor(z / C.CELL);
        for (i = -W; i <= W; i++) for (j = -W; j <= W; j++) (function (a, b) { out.push({ key: 'h' + a + ',' + b, d: Math.abs(a - ix) + Math.abs(b - iz), xz: function (u, v) { return { x: (a + u) * C.CELL, z: (b + v) * C.CELL }; } }); }(ix + i, iz + j)); }
      else { var ll = ctx.toLatLon(x, z); if (!ll || Math.abs(ll.lat) > C.LAT + 1) return out; var dLat = C.CELL / 111320, ci = Math.floor(ll.lat / dLat);
        for (i = -W; i <= W; i++) { var row = ci + i, latc = (row + 0.5) * dLat, dLon = dLat / Math.max(0.2, Math.cos(latc * D2R)), cj = Math.floor((ll.lon + 180) / dLon);
          for (j = -W; j <= W; j++) (function (a, b, dl) { out.push({ key: 't' + a + ',' + b, d: Math.abs(a - ci) + Math.abs(j), xz: function (u, v) { return ctx.toLocal((a + u) * dLat, (b + v) * dl - 180); } }); }(row, cj + j, dLon)); } }
      out.sort(function (p, q) { return p.d - q.d; }); return out;
    }
    var DUM = new THREE.Object3D(), TINT = [[1, 1, 1], [1, 0.82, 0.92], [0.9, 0.86, 1], [1, 0.95, 0.78], [0.86, 1, 0.9], [1, 0.78, 0.74]], TC = new THREE.Color();
    function fill(x, z) {   // every cell round her, from its own seed: its coral and its grass, laid on the floor (nothing allocated in the scene; only instance slots)
      var cells = cellsAround(x, z), n = { pillar: 0, patch: 0, branch: 0, grass: 0 }, anchors = [], pend = false, sea = surf(), tr = travel();
      st.ex = tr ? {} : { hole: ctx.hole && ctx.hole(), bells: ctx.bells ? ctx.bells() : null, reef: ctx.homeReef && ctx.homeReef() };
      for (var c = 0; c < cells.length; c++) { var cl = cells[c], R = rng(hash('reef837:' + cl.key));
        for (var k = 0; k < 6; k++) { var u = R(), v = R(), ty = R(), yw = R() * TAU, sR = R(), tR = R(), keep = R();
          var p = cl.xz(u, v); if (!p) continue; if (!tr && !homeOk(p.x, p.z)) continue; if (tr && ctx.tH && ctx.tH(p.x, p.z) > 0.01) continue;
          var fl = floorAt(p.x, p.z); if (fl == null) { pend = true; continue; } var d = sea - fl; if (keep > 0.78 * coralW(d)) continue;
          var kind = ty < 0.3 ? 'pillar' : ty < 0.62 ? 'patch' : 'branch', s = kind === 'pillar' ? 0.7 + sR * 0.9 : 0.8 + sR * 0.6, room = (d - 0.7) / HGT[kind];
          if (s > room) { if (kind === 'pillar') { kind = 'patch'; s = Math.min(0.8 + sR * 0.6, (d - 0.5) / HGT.patch); } else s = room; }
          if (s < 0.35 || n[kind] >= C.CAP[kind]) continue;
          DUM.position.set(p.x, fl - 0.12, p.z); DUM.rotation.set(0, yw, 0); DUM.scale.setScalar(s); DUM.updateMatrix(); POOL[kind].setMatrixAt(n[kind], DUM.matrix);
          var tc = TINT[Math.floor(tR * TINT.length)]; TC.setRGB(tc[0], tc[1], tc[2]); POOL[kind].setColorAt(n[kind], TC); n[kind]++;
          anchors.push({ key: cl.key + ':' + k, x: p.x, z: p.z, y: fl, top: fl + s * HGT[kind] * 0.9, d: d }); }
        for (k = 0; k < 18; k++) { var gu = R(), gv = R(), gyw = R() * TAU, gsR = R(), gk = R(); var q2 = cl.xz(gu, gv); if (!q2) continue; if (n.grass >= C.CAP.grass) break;
          if (!tr && !homeOk(q2.x, q2.z)) continue; if (tr && ctx.tH && ctx.tH(q2.x, q2.z) > 0.01) continue;
          var gf = floorAt(q2.x, q2.z); if (gf == null) { pend = true; continue; } var gd = sea - gf; if (gk > 0.75 * grassW(gd)) continue;
          var gs2 = Math.min(0.7 + gsR * 0.7, (gd - 0.25) / HGT.grass); if (gs2 < 0.3) continue;
          DUM.position.set(q2.x, gf - 0.03, q2.z); DUM.rotation.set(0, gyw, 0); DUM.scale.setScalar(gs2); DUM.updateMatrix(); POOL.grass.setMatrixAt(n.grass, DUM.matrix); n.grass++; } }
      Object.keys(POOL).forEach(function (k) { var im = POOL[k]; im.count = n[k]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
      st.anchors = anchors; st.n = n; st.pend = pend; st.fills++; st.fillT = st.t;
      st.wc.x = x; st.wc.z = z; var wf = floorAt(x, z); st.wc.y = wf == null ? sea - 8 : wf;
      assign();
    }

    /* ---------- the fish's lives ---------- */
    (function makeFish() { var R = rng(83700);
      SP.forEach(function (s) { if (s.school) return; var gsz = s.group || 1;
        for (var i = 0; i < s.n; i++) st.fish.push({ s: s, m: FM[s.id], i: i, g: Math.floor(i / gsz), lead: i % gsz === 0, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, yaw: R() * TAU, pitch: 0, roll: 0, sc: 0.85 + R() * 0.3,
          a: null, th: R() * TAU, dir: R() < 0.5 ? -1 : 1, tt: R() * 3, mode: 0, tx: 0, ty: 0, tz: 0, ox: (R() - 0.5) * 0.7, oy: (R() - 0.5) * 0.3, oz: (R() - 0.5) * 0.7, amp: 1, ampT: 1, flee: 0 }); } );
      st.schools = SP.filter(function (s) { return s.school; }).map(function (sc) { var n = sc.n, O = [];   // 837 v2: two schools (the chromis over the reef, the dwarf herring higher in the water)
        for (var k = 0; k < n; k++) { var a = R() * TAU, r = Math.sqrt(R()); O.push({ x: Math.cos(a) * r * sc.rad, y: (R() - 0.5) * sc.ry, z: Math.sin(a) * r * sc.rad * (sc.long || 1), h: 0, k: 1.5 + R() * 2.5, sc: 0.85 + R() * 0.3 }); }
        return { s: sc, m: FM[sc.id], n: n, O: O, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, a: null, th: R() * TAU, dir: R() < 0.5 ? -1 : 1, tt: 6 + R() * 4, spread: 1, turns: 0, lastYaw: 0, flee: 0 }; });
      st.school = st.schools[0];   // the chromis (the bench's read)
    }());
    function pickAnchor(mode) {   // a coral to live by. 'near': within 14 m of her (a first dive, the school); 'edge': 10-24 m out, ahead of her if it can (a fish whose coral fell behind)
      var A = st.anchors; if (!A.length) return null; var P = ctx.S.pos, fx = Math.sin(ctx.S.yaw || 0), fz = Math.cos(ctx.S.yaw || 0), near = [], edge = [], ahead = [];
      for (var i = 0; i < A.length; i++) { var a = A[i], dx = a.x - P.x, dz = a.z - P.z, d = Math.hypot(dx, dz); if (d < 14) near.push(a); if (d >= 10 && d < 24) { edge.push(a); if (dx * fx + dz * fz > 0) ahead.push(a); } }
      if (mode === 'spawn') { var sp = A.filter(function (a) { var dx = a.x - P.x, dz = a.z - P.z, d = Math.hypot(dx, dz) || 1; return d >= 16 && d < 30 && (dx * fx + dz * fz) / d > 0.3; }); if (sp.length) return sp[Math.floor(Math.random() * sp.length)]; mode = 'edge'; }   // ahead of her, out in the fog (where a group she left behind comes back)
      if (mode === 'view') { var view = near.filter(function (a) { var dx = a.x - P.x, dz = a.z - P.z, d = Math.hypot(dx, dz) || 1; return (dx * fx + dz * fz) / d > 0.45; }); if (view.length) return view[Math.floor(Math.random() * view.length)]; mode = 'near'; }   // ahead of her, in the picture
      var L = mode === 'near' ? (near.length ? near : A) : (ahead.length ? ahead : edge.length ? edge : near.length ? near : A);
      return L[Math.floor(Math.random() * L.length)];
    }
    function unseen(f) { if (f.y < -900) return true; var dx = f.x - her.x, dz = f.z - her.z, d = Math.hypot(dx, dz) || 1; return d > 20 || (dx * Math.sin(ctx.S.yaw || 0) + dz * Math.cos(ctx.S.yaw || 0)) / d < -0.2; }   // out of her sight: behind her, or 20 m+ off in the fog
    function deepest() { var P = ctx.S.pos, best = null; st.anchors.forEach(function (a) { if (Math.hypot(a.x - P.x, a.z - P.z) < 30 && (!best || a.d > best.d)) best = a; }); return best; }
    function assign() {   // after a fill: every fish whose coral is gone (out of the cells round her) gets another; a group keeps one coral between them
      var keys = {}; st.anchors.forEach(function (a) { keys[a.key] = a; }); var lead = {}, ray = deepest();
      st.fish.forEach(function (f) { var gid = f.s.id + f.g;
        if (f.s.gait === 'ray') { f.a = ray && ray.d >= 2 ? ray : null; return; }   // the rays keep to the deepest water near her
        if (f.a && keys[f.a.key]) { if (f.lead) lead[gid] = f.a; return; }
        var nA0 = lead[gid] || pickAnchor(f.a ? (unseen(f) ? 'spawn' : 'edge') : 'view'); if (f.a && nA0 && unseen(f)) f.jump = true; f.a = nA0; if (f.lead && f.a) lead[gid] = f.a; });
      st.fish.forEach(function (f) { var gid = f.s.id + f.g; if (!f.lead && lead[gid] && f.s.gait !== 'ray') { f.a = lead[gid]; if (unseen(f)) f.jump = true; } });
      var P = ctx.S.pos; st.schools.forEach(function (SC) { if (!SC.a || !keys[SC.a.key] || Math.hypot(SC.a.x - P.x, SC.a.z - P.z) > 30) SC.a = pickAnchor('near'); });
    }
    var her = { x: 0, y: 0, z: 0 };
    function steer(f, tx, ty, tz, vmax, acc, dt) {
      var dx = tx - f.x, dy = ty - f.y, dz = tz - f.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      if (d > C.FAR + 10 || f.y < -900 || f.jump) { f.jump = false; f.fl = null; f.ft = 0; f.x = tx; f.y = ty; f.z = tz; f.vx = f.vy = f.vz = 0; return; }
      var sp = Math.min(vmax, d * 1.2), hx = f.x - her.x, hy = f.y - her.y, hz = f.z - her.z, hd = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1e-6, fl = 0;
      var wx = dx / d * sp, wy = dy / d * sp, wz = dz / d * sp;
      if (hd < C.FLEE && f.s.gait !== 'ray') { fl = (C.FLEE - hd) / C.FLEE; wx += hx / hd * fl * 2.6; wy += hy / hd * fl * 1.2; wz += hz / hd * fl * 2.6; if (!f.flee) st.flees++; }
      f.flee = fl; var k = Math.min(1, dt * (fl ? 5 : acc)); f.vx += (wx - f.vx) * k; f.vy += (wy - f.vy) * k; f.vz += (wz - f.vz) * k;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
    }
    function face(f, dt, rate) { var hs = Math.hypot(f.vx, f.vz); if (hs > 0.04) { var e = wrapA(Math.atan2(f.vx, f.vz) - f.yaw); f.yaw += e * Math.min(1, dt * rate); f.roll = clamp(-e * 0.5, -0.5, 0.5); } f.pitch = clamp(Math.atan2(-f.vy, Math.max(0.05, hs)), -0.5, 0.5); }
    function stepFish(dt) {
      var sea = surf(), byLead = {};
      for (var i = 0; i < st.fish.length; i++) { var f = st.fish[i], s = f.s, A = f.a; if (!A) continue; f.th += dt * s.v / (s.loop || 1) * f.dir; f.tt -= dt;
        if (f.lead && s.gait !== 'ray' && (f.re = (f.re == null ? 1 + (i % 5) * 0.6 : f.re) - dt) <= 0) { f.re = 4 + Math.random() * 4; var hx0 = A.x - her.x, hz0 = A.z - her.z, hd0 = Math.hypot(hx0, hz0) || 1; if ((hx0 * Math.sin(ctx.S.yaw || 0) + hz0 * Math.cos(ctx.S.yaw || 0)) / hd0 < 0.2 || hd0 > 16) { var nv = pickAnchor('view'); var gone = unseen(f); if (gone) nv = pickAnchor('spawn') || nv; if (nv) { A = f.a = nv; for (var gq = 0; gq < st.fish.length; gq++) if (st.fish[gq].s === s && st.fish[gq].g === f.g) { st.fish[gq].a = nv; if (gone) st.fish[gq].jump = true; } } } }   // a group whose coral fell behind her: if she can see it, it swims to coral ahead of her; if not, it is found again ahead, out in the fog
        if ((f.ft = (f.ft || 0) - dt) <= 0 && f.y > -900) { f.ft = 0.6 + (i % 5) * 0.03; var fl0 = floorAt(f.x, f.z); f.fl = fl0 == null ? null : fl0; }   // the floor under it now (twice a second, staggered)
        var base = f.fl != null && f.y > -900 ? f.fl : A.y, col = Math.max(0.6, sea - base), hk = clamp((col - 0.6) / (s.hy[1] + 0.3), 0.2, 1), hyM = (s.hy[0] + s.hy[1]) / 2 * hk, tx, ty, tz, vmax = s.v * 1.4, acc = 1.6, gid = s.id + f.g;   // heights fit the water over it
        if (s.gait === 'glide') { tx = A.x + Math.cos(f.th) * s.loop; tz = A.z + Math.sin(f.th) * s.loop; ty = base + hyM + 0.35 * Math.sin(f.th * 0.7); }
        else if (s.gait === 'graze') { if (f.tt <= 0) { f.mode = f.mode ? 0 : 1; f.tt = f.mode ? 1.6 : 4 + Math.random() * 4; if (!f.mode) { var a2 = Math.random() * TAU; f.tx = A.x + Math.cos(a2) * s.loop; f.tz = A.z + Math.sin(a2) * s.loop; f.ty = base + (s.hy[0] + Math.random() * (s.hy[1] - s.hy[0])) * hk; } else { f.tx = A.x + (Math.random() - 0.5) * 0.6; f.tz = A.z + (Math.random() - 0.5) * 0.6; f.ty = A.top + 0.12; } }
          tx = f.tx; ty = f.ty; tz = f.tz; if (f.mode) vmax = 0.25; }   // a parrotfish swims, then stops nose-down at the coral to nibble
        else if (s.gait === 'flit' || s.gait === 'hover' || s.gait === 'cruise') {
          var L = byLead[gid];
          if (f.lead || !L) { if (s.gait === 'flit') { if (f.tt <= 0) { f.tt = 1.2 + Math.random() * 1.4; var a3 = Math.random() * TAU, r3 = Math.random() * s.loop; f.tx = A.x + Math.cos(a3) * r3; f.tz = A.z + Math.sin(a3) * r3; f.ty = base + (s.hy[0] + Math.random() * (s.hy[1] - s.hy[0])) * hk; } tx = f.tx; ty = f.ty; tz = f.tz; acc = 3; }
            else if (s.gait === 'hover') { tx = A.x + Math.cos(f.th) * s.loop; tz = A.z + Math.sin(f.th) * s.loop; ty = base + hyM; }
            else { tx = A.x + Math.cos(f.th) * s.loop; tz = A.z + Math.sin(f.th) * s.loop; ty = base + hyM + 0.5 * Math.sin(f.th * 1.3); }
            byLead[gid] = f; }
          else { var cy = Math.cos(L.yaw), sy = Math.sin(L.yaw); tx = L.x + f.ox * cy + f.oz * sy; ty = L.y + f.oy; tz = L.z - f.ox * sy + f.oz * cy; vmax = s.v * 2.2; acc = 2.5; } }
        else { var R2 = (f.i ? 9 : 7); tx = A.x + Math.cos(f.th) * R2; tz = A.z + Math.sin(f.th) * R2; ty = Math.min(sea - 1.2, base + hyM + 0.6 * Math.sin(f.th * 2.1)); acc = 0.8;   // a ray: a big slow circle; a few beats, then a long glide
          if (f.tt <= 0) { f.mode = f.mode ? 0 : 1; f.tt = f.mode ? 3.2 : 4.5; } f.ampT = f.mode ? 1 : 0.12; }
        steer(f, tx, ty, tz, vmax, acc, dt); f.y = clamp(f.y, base + 0.15, sea - 0.3);
        face(f, dt, s.gait === 'ray' ? 1.2 : s.gait === 'flit' ? 7 : 4);
        if (s.gait === 'graze' && f.mode && Math.hypot(f.vx, f.vz) < 0.12) f.pitch = 0.55;
        if (s.gait === 'hover' && Math.hypot(f.vx, f.vz) < 0.06 && byLead[gid] && byLead[gid] !== f) f.yaw += wrapA(byLead[gid].yaw - f.yaw) * Math.min(1, dt * 3);
        f.ampT = s.gait === 'ray' ? f.ampT : 1 + f.flee * 1.5; f.amp += (f.ampT - f.amp) * Math.min(1, dt * 2); }
      st.schools.forEach(function (SC) { var sA = SC.a, S0 = SC.s;   // THE SCHOOLS: each centre swims round its coral; every fish follows its school's heading a beat apart, so a turn ripples through it
      if (sA) { SC.tt -= dt; if (SC.tt <= 0) { SC.tt = 6 + Math.random() * 5; SC.dir = -SC.dir; if (Math.random() < 0.5) { var nA = pickAnchor('view'); if (nA && Math.hypot(nA.x - sA.x, nA.z - sA.z) < 25) SC.a = sA = nA; } }
        if ((SC.re = (SC.re == null ? 2 : SC.re) - dt) <= 0) { SC.re = 3; var ax = sA.x - her.x, az = sA.z - her.z, ad = Math.hypot(ax, az) || 1; if (((ax * Math.sin(ctx.S.yaw || 0) + az * Math.cos(ctx.S.yaw || 0)) / ad < 0.2 && ad > 10) || ad > 24) {   // its coral fell behind her (or far off): seen it swims, unseen it is found again ahead; in front of her it stays and circles
          var seen = !unseen(SC), nS = seen ? pickAnchor('view') : (pickAnchor('spawn') || pickAnchor('view')); if (nS) { SC.a = sA = nS; if (!seen) { SC.x = nS.x; SC.z = nS.z; SC.y = nS.top + S0.lift; SC.fl = null; SC.ft = 0; } } } }
        SC.th += dt * 0.16 * SC.dir * (S0.v / 0.9); var stx = sA.x + Math.cos(SC.th) * S0.orbit, stz = sA.z + Math.sin(SC.th) * S0.orbit, sty = Math.min(sea - 1.0, sA.top + S0.lift + 0.5 * Math.sin(SC.th * 1.7));
        if ((SC.ft = (SC.ft || 0) - dt) <= 0 && SC.y > -900) { SC.ft = 0.5; var sf0 = floorAt(SC.x, SC.z); SC.fl = sf0 == null ? null : sf0; } var sBase = SC.fl != null && SC.y > -900 ? SC.fl : sA.y;
        sty = Math.max(sBase + 0.8, Math.min(sty, sea - 0.9));
        var hdx = SC.x - her.x, hdz = SC.z - her.z, hdd = Math.hypot(hdx, hdz) || 1e-6; SC.flee = hdd < S0.flee ? (S0.flee - hdd) / S0.flee : 0;
        if (SC.flee) { stx += hdx / hdd * 4; stz += hdz / hdd * 4; }
        var pseudo = { s: { gait: 'ray' }, x: SC.x, y: SC.y, z: SC.z, vx: SC.vx, vy: SC.vy, vz: SC.vz, flee: 0 }; steer(pseudo, stx, sty, stz, SC.flee ? 2.6 * S0.v / 0.9 : S0.v, SC.flee ? 3 : 1.2, dt);
        SC.x = pseudo.x; SC.y = clamp(pseudo.y, sBase + 0.5, sea - 0.6); SC.z = pseudo.z; SC.vx = pseudo.vx; SC.vy = pseudo.vy; SC.vz = pseudo.vz;
        if (Math.hypot(SC.vx, SC.vz) > 0.05) { var e = wrapA(Math.atan2(SC.vx, SC.vz) - SC.yaw); SC.yaw += e * Math.min(1, dt * 1.8); }
        SC.spread += ((1 + SC.flee * 0.8) - SC.spread) * Math.min(1, dt * 3); } });
    }
    function pose() {   // the instance matrices (and the tail beat's strength) of every fish, once a frame
      var cnt = {}, i, f;
      SP.forEach(function (s) { cnt[s.id] = 0; });
      for (i = 0; i < st.fish.length; i++) { f = st.fish[i]; if (!f.a || f.y < -900) continue; var m = f.m, k = cnt[f.s.id]++;
        DUM.position.set(f.x, f.y, f.z); DUM.rotation.set(f.pitch, f.yaw, f.roll, 'YXZ'); DUM.scale.setScalar(f.sc); DUM.updateMatrix(); m.im.setMatrixAt(k, DUM.matrix); m.ph.array[k * 3 + 2] = f.amp; }
      st.schools.forEach(function (SC) { var O = SC.O, i;
      if (SC.a && SC.y > -900) { var cy0 = SC.y; for (i = 0; i < SC.n; i++) { var o = O[i]; o.h += wrapA(SC.yaw - o.h) * Math.min(1, st.dt * o.k); var ch = Math.cos(o.h), sh = Math.sin(o.h), sp = SC.spread;
          DUM.position.set(SC.x + (o.x * ch + o.z * sh) * sp, cy0 + o.y * sp + 0.08 * Math.sin(st.t * 1.3 + i), SC.z + (-o.x * sh + o.z * ch) * sp); DUM.rotation.set(0, o.h, 0, 'YXZ'); DUM.scale.setScalar(o.sc); DUM.updateMatrix();
          SC.m.im.setMatrixAt(i, DUM.matrix); SC.m.ph.array[i * 3 + 2] = 1 + SC.flee * 1.5; } cnt[SC.s.id] = SC.n; } });
      SP.forEach(function (s) { var m = FM[s.id]; m.im.count = cnt[s.id]; m.im.instanceMatrix.needsUpdate = true; m.ph.needsUpdate = true; });
    }

    /* ---------- the floor grid: the caustics' sheet everywhere, and the sand's bed out in the world ---------- */
    function gridFill(cx, cz) {
      var tr = travel(), half = (NG - 1) / 2, pend = false, last = null, sea = surf(), bcol = BED.geometry.attributes.color.array;
      for (var j = 0; j < NG; j++) for (var i = 0; i < NG; i++) { var x = cx + (i - half) * C.GSTEP, z = cz + (j - half) * C.GSTEP, k = (j * NG + i) * 3, y;
        if (!tr) y = ctx.H(x, z) + 0.12; else { var r = floorAt(x, z); if (r == null) { pend = true; r = last != null ? last : sea - 10; } last = r; y = r; }
        gridP[k] = x; gridP[k + 1] = tr ? y + 0.05 : y; gridP[k + 2] = z; bedP[k] = x; bedP[k + 1] = y; bedP[k + 2] = z;
        if (tr) { var nn = (hash(Math.round(x / 3) + ',' + Math.round(z / 3)) % 1000) / 1000, s0 = 0.78 + nn * 0.14; bcol[k] = 0.86 * s0; bcol[k + 1] = 0.79 * s0; bcol[k + 2] = 0.6 * s0; } }
      gPos.needsUpdate = true;
      if (tr) { var N = bNrm.array; for (j = 0; j < NG; j++) for (i = 0; i < NG; i++) { var k2 = (j * NG + i) * 3, xl = bedP[(j * NG + Math.max(0, i - 1)) * 3 + 1], xr = bedP[(j * NG + Math.min(NG - 1, i + 1)) * 3 + 1], zd = bedP[(Math.max(0, j - 1) * NG + i) * 3 + 1], zu = bedP[(Math.min(NG - 1, j + 1) * NG + i) * 3 + 1];
          var nx = -(xr - xl) / (2 * C.GSTEP), nz = -(zu - zd) / (2 * C.GSTEP), l = Math.sqrt(nx * nx + 1 + nz * nz); N[k2] = nx / l; N[k2 + 1] = 1 / l; N[k2 + 2] = nz / l; }
        bPos.needsUpdate = true; bNrm.needsUpdate = true; BED.geometry.attributes.color.needsUpdate = true; }
      st.gc.x = cx; st.gc.z = cz; st.gc.where = tr ? 'travel' : 'home'; st.gPend = pend; st.grid++; st.bed = tr && !pend;
    }

    /* ---------- the frame ---------- */
    function show(on) {
      if (on === st.on) return; st.on = on; st.ft = 0;
      Object.keys(LM).forEach(function (k) { LM[k].visible = on; }); if (!on) { LM.ceiling.position.set(0, -200, 0); BED.visible = false; }
      Object.keys(POOL).forEach(function (k) { POOL[k].visible = on; }); SP.forEach(function (s) { FM[s.id].im.visible = on; });
    }
    function tick(dt) {
      var t0 = performance.now();
      try {
        dt = Math.min(0.05, Math.max(0, dt || 0)); st.t += dt; st.dt = dt; U.t.value = st.t; LU.uT.value = st.t;
        var under = !!(ctx.under && ctx.under()); if (!under) { show(false); return; }
        show(true); var cam = ctx.camera.position, P = ctx.S.pos, tr = travel(), where = tr ? 'travel' : 'home', sea = surf();
        her.x = P.x; her.y = P.y; her.z = P.z;
        var f = tr && ctx.frame ? ctx.frame() : null;
        /* the light */
        LU.uCam.value.copy(cam); var sd = ctx.sun ? ctx.sun() : null; if (sd) LU.uSun.value.copy(sd);
        var fg = ctx.fog ? ctx.fog() : null;
        if (fg && tr) worldFog(fg, P, dt);   // out in the world the island's fog zones never run: the water's colour is the sea she is in (the same linear Fog: nothing recompiled)
        if (fg) { LU.uFog.value.set(fg.near, fg.far); LU.uFogCol.value.copy(fg.color); }
        ctx.camera.updateMatrixWorld(); LU.uInv.value.multiplyMatrices(ctx.camera.matrixWorld, ctx.camera.projectionMatrixInverse);   // the backdrop's view of every direction
        var day = ctx.day ? clamp(ctx.day(), 0, 1) : 1, wet = ctx.wet ? clamp(ctx.wet(), 0, 1) : 0, deep = Math.max(0, sea - cam.y);
        var I = (0.12 + 0.88 * day) * (1 - 0.5 * wet); st.lastI = I;
        LM.ceiling.material.uniforms.uI.value = I * Math.exp(-deep / 30); LM.caustics.material.uniforms.uI.value = I; LM.shafts.material.uniforms.uI.value = I * Math.exp(-deep / 22); LM.snow.material.uniforms.uI.value = 0.5 + 0.5 * I; LM.water.material.uniforms.uI.value = I;   // the light fades as she goes deep; the specks stay (they catch any light)
        LM.ceiling.position.set(cam.x, sea - 0.15, cam.z); LM.ceiling.material.uniforms.uBox.value.y = sea;
        LM.caustics.material.uniforms.uBox.value.y = sea; LM.shafts.material.uniforms.uBox.value.y = sea;
        LM.shafts.visible = deep < 40;
        /* the floor grid */
        var gx = Math.round(P.x / C.GSNAP) * C.GSNAP, gz = Math.round(P.z / C.GSNAP) * C.GSNAP;
        if (gx !== st.gc.x || gz !== st.gc.z || st.gc.where !== where || f !== st.f || (st.gPend && st.t - st.gT > 1)) { gridFill(gx, gz); st.gT = st.t; }
        BED.visible = st.bed;
        /* the reef round her */
        var key = (tr ? 't' : 'h') + Math.floor(P.x / C.CELL) + ',' + Math.floor(P.z / C.CELL);
        if (key !== st.key || f !== st.f || where !== st.where || (st.pend && st.t - st.fillT > 1)) { st.key = key; st.f = f; st.where = where; fill(P.x, P.z); }
        var has = st.anchors.length > 0; SP.forEach(function (s) { FM[s.id].im.visible = has; });
        if (has) { stepFish(dt); pose(); }
      } catch (e) { st.fault = String(e && e.message || e); show(false); }
      finally { var ms = performance.now() - t0; if (st.on) { st.ms.push(ms); if (st.ms.length > 600) st.ms.shift(); if (ms > st.msMax) st.msMax = ms; } }
    }
    var WF = { reef: [0x3aa6a2, 4, 50], deep: [0x17597a, 3, 44], cold: [0x2c6670, 3, 40] }, FT = new THREE.Color();   // reef and deep: the island's own (ANI714C_FOG); cold: a greener grey for the high latitudes. DRAFT
    function worldFog(fg, P, dt) {
      var ll = ctx.toLatLon(P.x, P.z), r = rawT(P.x, P.z), z = !ll ? 'deep' : Math.abs(ll.lat) > 45 ? 'cold' : (r != null && r > -C.DEEP && Math.abs(ll.lat) < C.LAT) ? 'reef' : 'deep', Z = WF[z];
      var n = ctx.night ? clamp(ctx.night(), 0, 1) : 0; FT.setHex(Z[0]); if (n > 0) FT.lerp(NIGHT, 0.65 * n);
      var k = st.fz === z && st.ft > 0 ? Math.min(1, dt * 1.6) : 1; st.fz = z; st.ft = 1;
      fg.color.lerp(FT, k); fg.near += (Z[1] * (1 - 0.3 * n) - fg.near) * k; fg.far += (Z[2] * (1 - 0.3 * n) - fg.far) * k; if (ctx.bg) ctx.bg().copy(fg.color); st.fogZone = z;
    }
    var NIGHT = new THREE.Color(0x061626);   // the island's night water (ANI714C_NIGHT)
    function bedAt(x, z, def) { if (!st.on || !st.bed || !travel()) return def; var r = floorAt(x, z); return r == null ? def : Math.max(def, r + 0.35); }

    /* ---------- the bench's read (window.__wfr.reef837), never the player's ---------- */
    var FR = new THREE.Frustum(), PM = new THREE.Matrix4(), V3 = new THREE.Vector3();
    function inView() {   // per kind, how many fish are in the picture within VIEW metres
      var cam = ctx.camera; cam.updateMatrixWorld(); PM.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); FR.setFromProjectionMatrix(PM);
      var out = {}, M4 = new THREE.Matrix4();
      SP.forEach(function (s) { var im = FM[s.id].im, n = 0; if (im.visible) for (var i = 0; i < im.count; i++) { im.getMatrixAt(i, M4); V3.setFromMatrixPosition(M4); if (V3.distanceTo(cam.position) < C.VIEW && FR.containsPoint(V3)) n++; } out[s.id] = n; });
      return out;
    }
    function schoolRead() { var SC = st.school, O = SC.O, sx = 0, sy = 0; for (var i = 0; i < SC.n; i++) { sx += Math.cos(O[i].h); sy += Math.sin(O[i].h); } var R = Math.hypot(sx, sy) / SC.n;
      return { x: +SC.x.toFixed(2), y: +SC.y.toFixed(2), z: +SC.z.toFixed(2), yaw: +SC.yaw.toFixed(3), mean: +Math.atan2(sy, sx).toFixed(3), spreadDeg: +(Math.sqrt(-2 * Math.log(Math.max(1e-9, R))) * 180 / Math.PI).toFixed(2), n: SC.n, anchored: !!SC.a, flee: +SC.flee.toFixed(2) }; }
    function peek() {
      var ms = st.ms.slice().sort(function (a, b) { return a - b; }), counts = {}; Object.keys(POOL).forEach(function (k) { counts[k] = POOL[k].count; });
      var fishN = {}; SP.forEach(function (s) { fishN[s.id] = FM[s.id].im.visible ? FM[s.id].im.count : 0; });
      var rays = st.fish.filter(function (f) { return f.s.gait === 'ray' && f.a; }).map(function (f) { return { x: +f.x.toFixed(2), y: +f.y.toFixed(2), z: +f.z.toFixed(2), v: +Math.hypot(f.vx, f.vy, f.vz).toFixed(2), amp: +f.amp.toFixed(2), yaw: +f.yaw.toFixed(3) }; });
      return { on: st.on, where: st.where, fault: st.fault, anchors: st.anchors.length, coral: counts, fish: fishN, kinds: SP.map(function (s) { return { id: s.id, name: s.name, n: s.n, beat: s.f, v: s.v, gait: s.gait || 'school' }; }),
        school: schoolRead(), rays: rays, fogZone: st.fogZone || null, light: { ceiling: LM.ceiling.visible, caustics: LM.caustics.visible, shafts: LM.shafts.visible, snow: LM.snow.visible, I: +st.lastI.toFixed(3) }, bed: BED.visible, fills: st.fills, grids: st.grid, flees: st.flees,
        pend: st.pend, gPend: st.gPend, tris: st.tris, msP95: ms.length ? +ms[Math.floor(ms.length * 0.95)].toFixed(3) : null, msMax: +st.msMax.toFixed(3), group: G.children.length };
    }
    function px(hide) {   // the picture with everything, then with the named parts hidden: how much each region changed (the witness reads the pixels that ship)
      var R = ctx.renderer, gl = R.getContext(), W = gl.drawingBufferWidth, Hh = gl.drawingBufferHeight, a = new Uint8Array(W * Hh * 4), b = new Uint8Array(W * Hh * 4);
      R.render(ctx.scene, ctx.camera); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, a);
      var hid = []; (hide || []).forEach(function (k) { var m = LM[k] || POOL[k] || (FM[k] && FM[k].im) || (k === 'bed' ? BED : null); if (m && m.visible) { m.visible = false; hid.push(m); } });
      R.render(ctx.scene, ctx.camera); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, b); hid.forEach(function (m) { m.visible = true; });
      var reg = [[0, 0], [0, 0], [0, 0]], col = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], cnt = [0, 0, 0], GR = new Float64Array(64), GN = new Float64Array(64);
      for (var y = 0; y < Hh; y += 2) { var r = y < Hh / 3 ? 0 : y < Hh * 2 / 3 ? 1 : 2;   /* readPixels row 0 is the BOTTOM of the screen */ for (var x = 0; x < W; x += 2) { var q = (y * W + x) * 4, la = 0.299 * a[q] + 0.587 * a[q + 1] + 0.114 * a[q + 2], lb = 0.299 * b[q] + 0.587 * b[q + 1] + 0.114 * b[q + 2], d = Math.abs(la - lb);
          reg[r][0] += d; if (d > 6) reg[r][1]++; cnt[r]++; var gk = Math.min(7, Math.floor(y / Hh * 8)) * 8 + Math.min(7, Math.floor(x / W * 8)); GR[gk] += la - lb; GN[gk]++; col[r][0] += a[q]; col[r][1] += a[q + 1]; col[r][2] += a[q + 2]; } }
      var name = ['bottom', 'middle', 'top'], out = {}; for (var i = 0; i < 3; i++) out[name[i]] = { meanDiff: +(reg[i][0] / cnt[i]).toFixed(2), changed: +(reg[i][1] / cnt[i]).toFixed(4), rgb: col[i].map(function (v) { return Math.round(v / cnt[i]); }) };
      out.on = st.on; out.grid = Array.prototype.map.call(GR, function (v, i) { return +(v / Math.max(1, GN[i])).toFixed(2); });   // the hidden parts' share of each 8 x 8 cell of the picture (bottom row first)
      return out;
    }
    function cost(n) {   // what the reef layer costs this frame: its draws and triangles (shown against hidden), and the render's time both ways (gl.finish)
      var R = ctx.renderer, gl = R.getContext(), out = {}; n = n || 20;
      [true, false].forEach(function (on) { var v = G.visible; G.visible = on; R.render(ctx.scene, ctx.camera); gl.finish(); var calls = R.info.render.calls, tris = R.info.render.triangles, t0 = performance.now();
        for (var i = 0; i < n; i++) R.render(ctx.scene, ctx.camera); gl.finish(); out[on ? 'on' : 'off'] = { calls: calls, tris: tris, ms: +((performance.now() - t0) / n).toFixed(3) }; G.visible = v; });
      out.calls = out.on.calls - out.off.calls; out.tris = out.on.tris - out.off.tris; out.ms = +(out.on.ms - out.off.ms).toFixed(3); return out;
    }
    var API = { tick: tick, bedAt: bedAt, peek: peek, group: G, C: C, SP: SP, bench: { px: px, inView: inView, cost: cost, anchors: function () { return st.anchors.map(function (a) { return [+a.x.toFixed(2), +a.z.toFixed(2), +a.d.toFixed(2)]; }); }, refill: function () { st.key = ''; }, meshes: function () { var o = {}; Object.keys(LM).forEach(function (k) { o[k] = LM[k].visible; }); Object.keys(POOL).forEach(function (k) { o[k] = POOL[k].visible; }); return o; } } };
    return API;
  }
  return { create: create, classic: CLASSIC, C: C, SP: SP };
})();
