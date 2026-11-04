/* world-people.js - BOARD 724a + 724g, THE PEOPLE OF THE WORLD (Wings for Rouge). Trunks, Nov 4 2026.
   Marth, Nov 4 2026, verbatim: "ADD ALL THE NPCS" / "ADD THE BUILDINGS" / "ITS BEEN ALMOST A MONTH IVE BEEN WORKING ON THIS AND VISUALLY NOTHING CHANGED" /
   "Speed tf up". Plan: PLAN_724_PEOPLE_WHO_REMEMBER_HER_2026-11-04.md (units 724a "talk to anyone" and 724g "a town is data").

   WHAT ROUGE SEES: townsfolk in the real places she flies to. At Dunn's River: guides leading hand-in-hand chains up the falls, bathers in the pools,
   people on the beach (sitting, standing, wading), vendors at the foot, walkers on every street and path, small crowds at the hotels and piers.
   The same people every visit: everything is generated from the place's id (724g), so a place is DATA, never hand-placed.
   Land within 2.5 m of anyone and the button she uses for signs becomes 💬; one tap and they turn, wave and say one line (724a, DRAFT words).

   REUSED, NOT REWRITTEN (MBAEEMP): the CC0 Quaternius people already in models.js (LICENSES.md), loaded by people.js's own loader and clips;
   WFR_WORLD (world712-frame.js) for every lat/lon; the Dunn's patch's own ground (dunns712G) and its baked roads, falls terraces and POIs
   (world712-dunns.js, OSM, ODbL, credited on screen by the patch); the game's say() for the line and nearPeople676 for the island's own people.
   NEW, because nothing like it existed: a crowd that costs a few draws. Each model's clips are baked ONCE into a vertex-animation texture
   (half floats: every vertex's position and normal, every frame) and drawn as ONE InstancedMesh per model and distance band; the far band shares
   the same vertices with a clustered index (a third of the triangles). One material program for all of it, compiled on the island at load
   (the people root sits in the scene from the start with nothing to draw), so no new program ever compiles at a crossing (dunns712 C5).

   THE PAGE HANDS IT (tools/wiring/wire-724-people.js): WFR_PEOPLE724.init(ctx) once, tick(dt) each frame (above the travel zone's branch, so it runs
   in both), near(S) inside signTick (priority: hermits, signs, mentors, THEN people; on the ground only), talk(target) on the button's press.
   ctx = { THREE, scene, renderer, camera, S, say, near676, H, groundAt, D: DUNNS712, dG: dunns712G, dData: dunns712Data, WATER, TR: TRAVEL712,
           classic: () => bool }

   PLACES ARE DATA: addPlace({ id, name, lat, lon, r, host?, ground?, spots?, build?, lines? }). host() returns an Object3D whose matrixWorld maps
   the place's own metres (WFR_WORLD.frame(place): x east, z south) into the world, and ground(lx, lz) the ground's y in that space (Dunn's).
   With no host the place is put by lat/lon through the travel frame (TRAVEL712.f) and stands on H() (Antigua, Tahoe, any streamed tile).
   spots: [{ kind: 'square' | 'street' | 'beach', lat, lon, r, n, to: [lat, lon] }] (a street runs from lat/lon to `to`).

   THE WORLD FEATURES HOOK (written against its spec, the module is not landed yet): if window.WFR_FEATURES.onTile(cb) exists (now or later), each
   tile cb(tile) with tile.buildings = [{ lat, lon } | { ll: [lat, lon] } | { x, z } (with tile.frame, a WFR_WORLD frame)], optional w, d or r (m),
   tile.landuse = [{ kind, lat, lon }] and tile.key (or z, x, y) gets townsfolk by its doors, seeded by the tile key; WFR_FEATURES.onDrop(cb), if
   present, takes them away. featureTile(tile) / featureDrop(key) are the same doors for a caller that prefers to push.

   Every number and every word is DRAFT for Marth's pen. */
window.WFR_PEOPLE724 = (function () {
  'use strict';
  var C = { MODELS: ['man1', 'man2', 'woman1', 'woman2'], HEIGHT: 1.9, VIEW: 170, NEAR: 26, CAP_NEAR: 4, CAP_FAR: 18, MAX_NEAR: 8, MAX_ALL: 48, REFRESH: 0.25,
    CELL: 64, SHOW: 2.5, HIDE: 4, TEX_W: 2048, LOD_CELL: 0.085, LAYER: 7, GROW: 0.6, BAKE_DELAY: 1500, BAKE_GAP: 250 };
  var CLIPS = [['idle', 12], ['walk', 16], ['wave', 16], ['interact', 16]];   // baked frames per clip; the sit pose is one more frame, posed from the bones
  var X = null;
  var st = { inited: false, enabled: true, ready: false, baking: false, bakeErr: null, bakeMs: 0, models: [], root: null, meshes: [], uTime: { value: 0 }, places: [], byId: {},
    set: [], setById: new Map(), born: new Map(), rt: new Map(), refreshT: 0, ms: [], msMax: 0, programsInit: null, programsAfter: null, fault: null, talks: 0, target: null,
    featHooked: false, featPoll: 0, featTiles: 0, featFault: null, activeIds: [], lastActive: '', mats: [] };

  /* ---------- seeds: the same place id gives the same people, on every visit and every phone ---------- */
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(r, a) { return a[Math.floor(r() * a.length) % a.length]; }
  function rgb(hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; }

  /* ---------- who they are (DRAFT, Marth's pen): skin tones, clothes, names, lines ---------- */
  var SKIN_LOCAL = [0x2e1a12, 0x3b2219, 0x4a2c1e, 0x5a3624, 0x6b412b, 0x7d4e33, 0x8f5d3d];
  var SKIN_ALL = [0x3b2219, 0x5a3624, 0x7d4e33, 0x9a6a48, 0xb5835e, 0xcf9f7a, 0xe2b996, 0xf0cfb2];
  var TOPS = [0xf2c94c, 0x2d9cdb, 0xeb5757, 0x27ae60, 0xf7f7f2, 0xf2994a, 0x9b51e0, 0x56ccf2, 0x1d1d1f, 0xff8fab, 0x00a86b, 0xffd23f];
  var BOTS = [0x34508a, 0x2a3f6b, 0xc2b280, 0x222225, 0xeeeeea, 0x6b4f3a, 0x37474f, 0x8d6e63];
  var SWIM = [0x0077b6, 0xe63946, 0xffb703, 0x2a9d8f, 0x1d1d1f, 0xf72585];
  var GUIDE_TOP = 0x0fa3a3, GUIDE_BOT = 0x1d3557;   // DRAFT: the guides wear one colour so she can tell them apart
  var NAMES_JM = ['Andre', 'Marcia', 'Devon', 'Kerry-Ann', 'Omar', 'Shanice', 'Winston', 'Claudette', 'Delroy', 'Tanisha', 'Ricardo', 'Simone', 'Garfield', 'Nadine', 'Lloyd', 'Camille', 'Kemar', 'Petal', 'Junior', 'Annette'];
  var NAMES_VISIT = ['Sam', 'Maria', 'Tom', 'Aiko', 'Lucas', 'Priya', 'Hannah', 'Diego', 'Emma', 'Noah', 'Chloe', 'Kwame', 'Ines', 'Ben'];
  var NAMES_GT = ['Ana', 'José', 'María', 'Luis', 'Carmen', 'Diego', 'Rosa', 'Miguel', 'Lucía', 'Pedro'];
  var NAMES_US = ['Jake', 'Megan', 'Tyler', 'Ashley', 'Ryan', 'Lauren', 'Kevin', 'Brooke'];
  var ROLE = {   // title, emoji (before the Crow's lesson the line is music, as the island's bubbles are), lines (DRAFT)
    guide: ['a guide', '🧗', ['Hold the hand in front of you. We climb together.', 'Slow is fast on these rocks. Step where the water is white.', 'A cardinal at the falls! You must have flown a long way.']],
    climber: ['a climber', '💦', ['Don\'t let go! Well... you can let go. You have wings.', 'It\'s colder than it looks!', 'Halfway up, I think. Maybe a third.']],
    bather: ['a bather', '💦', ['The water comes down from the hills, cool and clear.', 'Sit on the warm rocks with me a while.', 'Oh! Did I splash you? Sorry, little one.']],
    vendor: ['a vendor', '🥥', ['Coconut water, fresh today! You would need a very small straw.', 'Everything on this table was made by hand.', 'Morning, little bird. You are my first customer.']],
    beach: ['on the beach', '☀️', ['Listen. You can hear the falls from the sand.', 'I watched you fly in from the sea.', 'Best spot on the whole beach, right here.']],
    swimmer: ['a swimmer', '🌊', ['The sea is warm today!', 'Mind the waves, they come in threes.', 'I can see fish down there. Can you?']],
    walker: ['out walking', '👋', ['Good day! Lovely day for flying.', 'I walk this way every morning. I have never met a bird who talks back.', 'Mind the cars on the main road.']],
    local: ['who lives here', '👋', ['Welcome! First time here?', 'You look like you are looking for someone.', 'The falls are just down the road.']]
  };
  var LINES_GT = ['¡Buenos días, pajarito! Welcome to Antigua.', 'The volcano is quiet today. It is watching the market.', 'Come back when the bells ring.'];
  var LINES_US = ['The lake is so clear you can see the bottom.', 'Careful, the air is thin up here.', 'Are you lost? Tahoe is a long way from the sea.'];

  /* ---------- 1. the bake: a model's clips into a vertex-animation texture ---------- */
  var HF = (function () { var f = new Float32Array(1), u = new Int32Array(f.buffer); return function (v) {   // three's DataUtils.toHalfFloat (MIT), line for line
    f[0] = v; var x = u[0], bits = (x >> 16) & 0x8000, m = (x >> 12) & 0x07ff, e = (x >> 23) & 0xff;
    if (e < 103) return bits; if (e > 142) { bits |= 0x7c00; bits |= ((e === 255) ? 0 : 1) && (x & 0x007fffff); return bits; }
    if (e < 113) { m |= 0x0800; bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1); return bits; }
    bits |= ((e - 112) << 10) | (m >> 1); bits += m & 1; return bits; }; })();

  function bakeBody(THREE, m, name) {
    var g = m.g, meshes = []; g.updateMatrixWorld(true);
    m.body.traverse(function (o) { if (o.isSkinnedMesh && o.geometry && o.geometry.attributes.position && o.geometry.attributes.skinIndex) meshes.push(o); });
    if (!meshes.length) throw new Error('no skinned mesh in ' + name);
    var V = 0, I = 0, k, i; for (k = 0; k < meshes.length; k++) { var G0 = meshes[k].geometry; V += G0.attributes.position.count; I += G0.index ? G0.index.count : G0.attributes.position.count; }
    var rest = new Float32Array(V * 3), col = new Float32Array(V * 3), aV = new Float32Array(V * 2), idx = new (V > 65535 ? Uint32Array : Uint16Array)(I), names = new Array(V), v3 = new THREE.Vector3(), parts = [], vo = 0, io = 0, y0 = 1e9, y1 = -1e9;
    for (k = 0; k < meshes.length; k++) {
      var s = meshes[k], G = s.geometry, P = G.attributes.position, n = P.count, CA = G.attributes.color, R = s.userData.ranges || {};
      for (i = 0; i < n; i++) { v3.fromBufferAttribute(P, i).applyMatrix4(s.matrixWorld); rest[(vo + i) * 3] = v3.x; rest[(vo + i) * 3 + 1] = v3.y; rest[(vo + i) * 3 + 2] = v3.z; if (v3.y < y0) y0 = v3.y; if (v3.y > y1) y1 = v3.y;
        col[(vo + i) * 3] = CA ? CA.getX(i) : 1; col[(vo + i) * 3 + 1] = CA ? CA.getY(i) : 1; col[(vo + i) * 3 + 2] = CA ? CA.getZ(i) : 1; aV[(vo + i) * 2] = vo + i; names[vo + i] = ''; }
      for (var nm in R) for (var q = 0; q < R[nm].length; q++) for (i = R[nm][q][0]; i < R[nm][q][0] + R[nm][q][1]; i++) names[vo + i] = nm;
      if (G.index) for (i = 0; i < G.index.count; i++) idx[io + i] = G.index.getX(i) + vo; else for (i = 0; i < n; i++) idx[io + i] = vo + i;
      parts.push({ s: s, vo: vo, n: n, A: new Float32Array(s.skeleton.bones.length * 16) }); vo += n; io += G.index ? G.index.count : n;
    }
    for (i = 0; i < V; i++) {   // the class each vertex is painted by: 1 skin, 5 skin (darker), 2 top, 3 bottom, 4 hair (kept), 0 kept (eyes, shoes, the head's small parts)
      var lo = (names[i] || '').toLowerCase(), yN = (rest[i * 3 + 1] - y0) / Math.max(1e-6, y1 - y0);
      aV[i * 2 + 1] = /skin.?dark/.test(lo) ? 5 : /skin/.test(lo) ? 1 : /hair|brow|moustache|beard/.test(lo) ? 4 : /eye/.test(lo) ? 0 : yN > 0.83 || yN < 0.06 ? 0 : yN > 0.5 ? 2 : 3; }
    /* the frames: every clip sampled through the model's own mixer, skinned on the CPU exactly as r128's shader skins (bindMatrixInverse . sum(w . bone . boneInverse) . bindMatrix) */
    var acts = m.actions || {}, list = CLIPS.filter(function (c) { return !!acts[c[0]]; }), F = 1, clips = {};
    list.forEach(function (c) { F += c[1]; });
    var texels = F * 2 * V, W = C.TEX_W, rows = Math.ceil(texels / W), out = new Float32Array(rows * W * 4), M1 = new THREE.Matrix4(), M2 = new THREE.Matrix4(), frame = 0;
    function capture(f) {
      g.updateMatrixWorld(true); var base = f * 2 * V;
      for (var p = 0; p < parts.length; p++) {
        var pt = parts[p], s = pt.s, sk = s.skeleton, A = pt.A, b;
        for (b = 0; b < sk.bones.length; b++) { M1.multiplyMatrices(sk.bones[b].matrixWorld, sk.boneInverses[b]); M2.multiplyMatrices(s.matrixWorld, s.bindMatrixInverse).multiply(M1).multiply(s.bindMatrix); A.set(M2.elements, b * 16); }
        var Gp = s.geometry.attributes, PP = Gp.position, NN = Gp.normal, SI = Gp.skinIndex, SW = Gp.skinWeight;
        for (var j = 0; j < pt.n; j++) {
          var px = PP.getX(j), py = PP.getY(j), pz = PP.getZ(j), nx = NN ? NN.getX(j) : 0, ny = NN ? NN.getY(j) : 1, nz = NN ? NN.getZ(j) : 0, ox = 0, oy = 0, oz = 0, qx = 0, qy = 0, qz = 0;
          var ws = [SW.getX(j), SW.getY(j), SW.getZ(j), SW.getW(j)], bs = [SI.getX(j), SI.getY(j), SI.getZ(j), SI.getW(j)];
          for (var c = 0; c < 4; c++) { var w = ws[c]; if (!w) continue; var o = bs[c] * 16;
            ox += w * (A[o] * px + A[o + 4] * py + A[o + 8] * pz + A[o + 12]); oy += w * (A[o + 1] * px + A[o + 5] * py + A[o + 9] * pz + A[o + 13]); oz += w * (A[o + 2] * px + A[o + 6] * py + A[o + 10] * pz + A[o + 14]);
            qx += w * (A[o] * nx + A[o + 4] * ny + A[o + 8] * nz); qy += w * (A[o + 1] * nx + A[o + 5] * ny + A[o + 9] * nz); qz += w * (A[o + 2] * nx + A[o + 6] * ny + A[o + 10] * nz); }
          var ql = Math.hypot(qx, qy, qz) || 1, t = (base + pt.vo + j) * 4, tn = (base + V + pt.vo + j) * 4;
          out[t] = ox; out[t + 1] = oy; out[t + 2] = oz; out[t + 3] = 1; out[tn] = qx / ql; out[tn + 1] = qy / ql; out[tn + 2] = qz / ql; out[tn + 3] = 0; }
      }
    }
    function minYOf(f) { var base = f * 2 * V, mn = 1e9; for (var j = 0; j < V; j++) mn = Math.min(mn, out[(base + j) * 4 + 1]); return mn; }
    var bones = []; m.body.traverse(function (o) { if (o.isBone) bones.push(o); });
    var findB = function (re) { return bones.filter(function (b) { return re.test(b.name); }); }, wp = function (b) { return new THREE.Vector3().setFromMatrixPosition(b.matrixWorld); };
    var foot = findB(/foot|ankle/i)[0] || null, stride = 0, minStand = 1e9, maxStand = -1e9;
    for (var ci = 0; ci < list.length; ci++) {
      var nmC = list[ci][0], nf = list[ci][1], a = acts[nmC], dur = a.getClip().duration || 1, zs = [];
      m.mixer.stopAllAction(); a.reset(); a.setEffectiveWeight(1); a.play();
      clips[nmC] = { f0: frame, n: nf, fps: nf / dur, dur: dur };
      for (i = 0; i < nf; i++) { a.time = i * dur / nf; m.mixer.update(0); capture(frame); var mn = minYOf(frame); minStand = Math.min(minStand, mn); maxStand = Math.max(maxStand, mn); if (foot) zs.push(wp(foot).z); frame++; }
      if (nmC === 'walk' && zs.length) stride = Math.max.apply(null, zs) - Math.min.apply(null, zs);
      if (nmC === 'idle') clips.idle0 = clips.idle;
    }
    /* the sit pose (no clip has one): idle's first frame, each thigh swung forward and each knee bent about the BODY's side axis (never a guessed
       bone axis: that split the legs, Nov 4 frames); the whole frame then set down so its lowest point is on the ground (they sit on the sand) */
    var sat = false, ia = acts.idle;
    if (ia) { m.mixer.stopAllAction(); ia.reset(); ia.play(); ia.time = 0; m.mixer.update(0); }
    var ups = findB(/upper.?leg|thigh/i), qa = new THREE.Quaternion(), qp = new THREE.Quaternion(), SIDE = new THREE.Vector3(1, 0, 0);
    function swing(bone, ang) {   // turn a bone about the BODY's side axis (the model faces +z): world turn = parent^-1 . R . parent . local, so every rig's own bone axes are irrelevant
      bone.parent.getWorldQuaternion(qp); qa.setFromAxisAngle(SIDE, ang); var inv = qp.clone(); if (inv.invert) inv.invert(); else inv.inverse();
      bone.quaternion.premultiply(qp).premultiply(qa).premultiply(inv); g.updateMatrixWorld(true); }
    for (k = 0; k < ups.length; k++) {
      var desc = []; ups[k].traverse(function (o) { if (o.isBone && o !== ups[k]) desc.push(o); });
      var low = desc.filter(function (b) { return /lower.?leg|shin|calf|knee/i.test(b.name); })[0] || ups[k].children.filter(function (o) { return o.isBone; })[0];
      if (!low) continue; swing(ups[k], -1.45); swing(low, 1.15); sat = true; }   // the thigh forward (a leg pointing down turns to +z), then the knee bent (the shin turns down toward the ground)
    capture(frame); var sitMin = minYOf(frame), sb = frame * 2 * V; for (i = 0; i < V; i++) out[(sb + i) * 4 + 1] -= sitMin; clips.sit = { f0: frame, n: 1, fps: 0, dur: 1 }; frame++;
    if (ia) { m.mixer.stopAllAction(); ia.reset(); ia.play(); m.mixer.update(0); }
    var half = new Uint16Array(out.length); for (i = 0; i < out.length; i++) half[i] = HF(out[i]);
    var tex = new THREE.DataTexture(half, W, rows, THREE.RGBAFormat, THREE.HalfFloatType); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false; tex.needsUpdate = true;
    /* the far band: the same vertices, clustered in the bind pose (where a hand is never near a hip) by cell and class; a third of the triangles */
    var rep = new Int32Array(V), map = new Map(), cs = C.LOD_CELL, far = [];
    for (i = 0; i < V; i++) { var key = Math.floor(rest[i * 3] / cs) + ',' + Math.floor(rest[i * 3 + 1] / cs) + ',' + Math.floor(rest[i * 3 + 2] / cs) + ',' + aV[i * 2 + 1]; var r0 = map.get(key); if (r0 === undefined) { r0 = i; map.set(key, i); } rep[i] = r0; }
    for (i = 0; i < I; i += 3) { var a0 = rep[idx[i]], b0 = rep[idx[i + 1]], c0 = rep[idx[i + 2]]; if (a0 === b0 || b0 === c0 || a0 === c0) continue; far.push(a0, b0, c0); }
    var vWalk = clips.walk ? Math.max(0.3, 2 * stride / clips.walk.dur) : 1.2;
    return { name: name, V: V, tex: tex, W: W, rows: rows, rest: rest, col: col, aV: aV, idxNear: idx, idxFar: new (V > 65535 ? Uint32Array : Uint16Array)(far), trisNear: I / 3, trisFar: far.length / 3,
      clips: clips, frames: frame, vWalk: vWalk, sat: sat, standMinY: [+minStand.toFixed(3), +maxStand.toFixed(3)], texBytes: half.byteLength };
  }

  /* ---------- 2. one material program for every person: Lambert, its vertex read from the animation texture ---------- */
  var PARS = ['uniform sampler2D uVat724; uniform vec3 uVat724I; uniform float uTime724;', 'attribute vec2 aV724; attribute vec4 aAnim724; attribute vec3 aSkin724; attribute vec3 aTop724; attribute vec3 aBot724;',
    'vec4 vat724(float k) { float y = floor((k + 0.5) / uVat724I.x); float x = k - y * uVat724I.x; return texture2D(uVat724, vec2((x + 0.5) / uVat724I.x, (y + 0.5) / uVat724I.y)); }'].join('\n');
  var COLOR = ['#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )', 'vColor = vec3( 1.0 );', '#endif', '#ifdef USE_COLOR', 'vColor.xyz *= color.xyz;',
    'if (aV724.y > 0.5 && aV724.y < 1.5) vColor.xyz = aSkin724; else if (aV724.y > 4.5) vColor.xyz = aSkin724 * 0.8;',
    'else if (aV724.y > 1.5 && aV724.y < 2.5 && aTop724.r >= 0.0) vColor.xyz = aTop724; else if (aV724.y > 2.5 && aV724.y < 3.5 && aBot724.r >= 0.0) vColor.xyz = aBot724;', '#endif'].join('\n');
  var BEGINN = ['float n724 = max(aAnim724.y, 1.0); float f724 = max(0.0, (uTime724 - aAnim724.w) * aAnim724.z);', 'float i0724 = mod(floor(f724), n724); float i1724 = aAnim724.y > 1.5 ? mod(i0724 + 1.0, n724) : i0724; float t724 = fract(f724);',
    'float k0724 = (aAnim724.x + i0724) * 2.0 * uVat724I.z + aV724.x; float k1724 = (aAnim724.x + i1724) * 2.0 * uVat724I.z + aV724.x;',
    'vec3 p724 = mix(vat724(k0724).xyz, vat724(k1724).xyz, t724);', 'vec3 objectNormal = normalize(mix(vat724(k0724 + uVat724I.z).xyz, vat724(k1724 + uVat724I.z).xyz, t724));'].join('\n');
  function OBC(shader) {   // one function for every people material: r128 keys the program by this function's text, so all of them share ONE program
    var u = this.userData.u724; for (var k in u) shader.uniforms[k] = u[k];
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + PARS).replace('#include <color_vertex>', COLOR)
      .replace('#include <beginnormal_vertex>', BEGINN).replace('#include <begin_vertex>', 'vec3 transformed = p724;');
  }
  function placeholderGeo(THREE, cap) {
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3));
    g.setAttribute('aV724', new THREE.BufferAttribute(new Float32Array(6), 2)); addInst(THREE, g, cap); return g; }
  function addInst(THREE, g, cap, from) {   // the per-person attributes (shared with the placeholder they replace)
    var mk = function (n, sz) { var a = from ? from.getAttribute(n) : new THREE.InstancedBufferAttribute(new Float32Array(cap * sz), sz); if (!from) a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(n, a); };
    mk('aAnim724', 4); mk('aSkin724', 3); mk('aTop724', 3); mk('aBot724', 3); }

  function init(ctx) {
    if (st.inited) return true; X = ctx || {};
    try {
      if (!X.THREE || !X.scene || !window.WFR_WORLD) { st.fault = 'init: no THREE, scene or WFR_WORLD'; return false; }
      if (X.classic && X.classic()) { st.fault = 'classic look: the people are Standard only (board 645)'; return false; }
      var THREE = X.THREE, root = new THREE.Group(); root.name = 'people724'; root.matrixAutoUpdate = false; root.layers.enable(C.LAYER);
      var ph = new THREE.DataTexture(new Uint16Array(4), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType); ph.magFilter = ph.minFilter = THREE.NearestFilter; ph.generateMipmaps = false; ph.needsUpdate = true;
      for (var m = 0; m < C.MODELS.length; m++) {
        var mat = new THREE.MeshLambertMaterial({ vertexColors: true }); mat.name = 'people724:' + C.MODELS[m];
        mat.userData.u724 = { uVat724: { value: ph }, uVat724I: { value: new THREE.Vector3(1, 1, 1) }, uTime724: st.uTime }; mat.onBeforeCompile = OBC; st.mats.push(mat);
        for (var l = 0; l < 2; l++) { var cap = l ? C.CAP_FAR : C.CAP_NEAR, im = new THREE.InstancedMesh(placeholderGeo(THREE, cap), mat, cap);
          im.count = 0; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.matrixAutoUpdate = false; im.layers.enable(C.LAYER); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          im.name = 'people724:' + C.MODELS[m] + (l ? ':far' : ':near'); im.userData.m = m; im.userData.lod = l; im.userData.ids = []; root.add(im); st.meshes.push(im); } }
      X.scene.add(root); root.updateMatrixWorld(true); st.root = root; st.inited = true;
      st.programsInit = X.renderer && X.renderer.info ? X.renderer.info.programs.length : null;
      registerBuiltins(); hookFeatures();
      setTimeout(bakeAll, C.BAKE_DELAY);   // after the first frames: one model per step, never in a frame she is flying
      return true;
    } catch (e) { st.fault = 'init: ' + (e && e.message || e); return false; }
  }
  function bakeAll() {
    if (st.baking || st.ready || !window.WFR_PEOPLE) { if (!window.WFR_PEOPLE) st.bakeErr = 'people.js did not load'; return; }
    st.baking = true; var i = 0, THREE = X.THREE;
    var next = function () {
      if (i >= C.MODELS.length) { st.baking = false; st.ready = st.models.filter(Boolean).length > 0; return; }
      var name = C.MODELS[i], at = i; i++;
      WFR_PEOPLE.make(THREE, name, { height: C.HEIGHT, shadow: false }, function (m) {
        var t0 = performance.now();
        try { if (!m) throw new Error('no model ' + name); var b = bakeBody(THREE, m, name); st.models[at] = b; mount(at, b); } catch (e) { st.bakeErr = (st.bakeErr ? st.bakeErr + '; ' : '') + name + ': ' + (e && e.message || e); }
        st.bakeMs += performance.now() - t0; setTimeout(next, C.BAKE_GAP); });
    };
    next();
  }
  function mount(m, b) {   // the baked model into its two meshes: the same vertices, the near index and the clustered far one
    var THREE = X.THREE, pos = new THREE.BufferAttribute(b.rest, 3), col = new THREE.BufferAttribute(b.col, 3), av = new THREE.BufferAttribute(b.aV, 2);
    var u = st.mats[m].userData.u724; u.uVat724.value = b.tex; u.uVat724I.value.set(b.W, b.rows, b.V);
    for (var l = 0; l < 2; l++) { var im = st.meshes[m * 2 + l], g = new THREE.BufferGeometry(), old = im.geometry;
      g.setAttribute('position', pos); g.setAttribute('color', col); g.setAttribute('aV724', av); addInst(THREE, g, 0, old); g.setIndex(new THREE.BufferAttribute(l ? b.idxFar : b.idxNear, 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 1e7); im.geometry = g; old.dispose(); }
  }

  /* ---------- 3. places: data in, people out ---------- */
  function addPlace(p) {
    if (!p || !p.id) return null; if (st.byId[p.id]) dropPlace(p.id);
    p.f = p.world ? null : WFR_WORLD.frame({ lat: p.lat, lon: p.lon }); p.r = p.r || 300; p.spawns = null; p.grid = null; st.places.push(p); st.byId[p.id] = p; return p; }
  function dropPlace(id) { var p = st.byId[id]; if (!p) return; delete st.byId[id]; st.places = st.places.filter(function (q) { return q !== p; }); st.refreshT = 0; }
  function LL(p, lat, lon) { return WFR_WORLD.toLocal(p.f, lat, lon); }
  function polyLen(P) { var cum = new Float32Array(P.length / 2), s = 0; for (var i = 1; i < P.length / 2; i++) { s += Math.hypot(P[i * 2] - P[i * 2 - 2], P[i * 2 + 1] - P[i * 2 - 1]); cum[i] = s; } return cum; }
  function person(p, r, o) {   // one townsperson, all of it from r (the place's seeded stream): never Math.random
    var role = o.role || 'local', loc = p.folk || 'jm', visitor = loc === 'jm' && r() < (role === 'walker' || role === 'local' || role === 'vendor' || role === 'guide' ? 0.12 : 0.45);
    var model = Math.floor(r() * C.MODELS.length) % C.MODELS.length, fem = model >= 2;
    var skin = rgb(pick(r, loc === 'jm' && !visitor ? SKIN_LOCAL : SKIN_ALL)), top = null, bot = null;
    if (role === 'guide') { top = rgb(GUIDE_TOP); bot = rgb(GUIDE_BOT); }
    else if (role === 'bather' || role === 'swimmer' || role === 'climber' || (role === 'beach' && r() < 0.5)) { top = fem ? rgb(pick(r, SWIM)) : (r() < 0.7 ? skin.slice() : rgb(pick(r, TOPS))); bot = rgb(pick(r, SWIM)); }
    else { top = r() < 0.15 ? null : rgb(pick(r, TOPS)); bot = r() < 0.15 ? null : rgb(pick(r, BOTS)); }
    var names = loc === 'gt' ? NAMES_GT : loc === 'us' ? NAMES_US : visitor ? NAMES_VISIT : NAMES_JM, R0 = ROLE[role] || ROLE.local, lines = p.lines || (loc === 'gt' ? LINES_GT : loc === 'us' ? LINES_US : R0[2]);
    var sp = { id: p.id + ':' + p.spawns.length, place: p.id, role: role, model: model, scale: (0.92 + r() * 0.16) * (o.child ? 0.72 : 1), skin: skin, top: top, bot: bot,
      kind: o.kind || 'stand', clip: o.clip || 'idle', x: o.x || 0, z: o.z || 0, yaw: o.yaw != null ? o.yaw : r() * Math.PI * 2, phase: r() * 8, name: pick(r, names), line: pick(r, lines), emoji: R0[1], title: R0[0] };
    if (o.path) { sp.kind = 'walk'; sp.clip = 'walk'; sp.path = o.path; sp.cum = polyLen(o.path); sp.L = sp.cum[sp.cum.length - 1]; sp.v = o.v || (0.95 + r() * 0.45); sp.s0 = r() * sp.L * 2; sp.side = o.side || 0;
      var mid = at(sp, sp.L / 2); sp.x = mid[0]; sp.z = mid[1]; }
    if (sp.kind === 'walk' && !(sp.L > 2)) { sp.kind = 'stand'; sp.clip = 'idle'; sp.path = null; }
    p.spawns.push(sp); return sp;
  }
  function at(sp, s) {   // the point s metres along a walker's path (and its heading), its side offset applied
    var P = sp.path, cum = sp.cum, n = cum.length, lo = 0, hi = n - 1; s = Math.max(0, Math.min(sp.L, s));
    while (hi - lo > 1) { var md = (lo + hi) >> 1; if (cum[md] <= s) lo = md; else hi = md; }
    var seg = Math.max(1e-6, cum[hi] - cum[lo]), t = (s - cum[lo]) / seg, x0 = P[lo * 2], z0 = P[lo * 2 + 1], dx = P[hi * 2] - x0, dz = P[hi * 2 + 1] - z0, l = Math.hypot(dx, dz) || 1;
    return [x0 + dx * t + (dz / l) * sp.side, z0 + dz * t - (dx / l) * sp.side, Math.atan2(dx, dz)];
  }
  function spotsBuild(p, r) {   // generic data spots (lat/lon): squares, streets, beaches
    (p.spots || []).forEach(function (s, si) {
      var rr = rng(hash(p.id + ':spot' + si)), c = LL(p, s.lat, s.lon), n = s.n || 10, rad = s.r || 20;
      if (s.kind === 'street' && s.to) { var e = LL(p, s.to[0], s.to[1]), path = new Float32Array([c.x, c.z, e.x, e.z]);
        for (var i = 0; i < n; i++) person(p, rr, { role: 'walker', path: path, side: (rr() < 0.5 ? -1 : 1) * (2 + rr() * 2) }); return; }
      for (var j = 0; j < n; j++) { var a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * rad, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d, u = rr();
        if (u < 0.3) { var a2 = rr() * Math.PI * 2, L = 15 + rr() * 30; person(p, rr, { role: 'walker', path: new Float32Array([x, z, x + Math.cos(a2) * L, z + Math.sin(a2) * L]) }); }
        else person(p, rr, { role: s.kind === 'beach' ? 'beach' : 'local', x: x, z: z, kind: u < 0.5 ? 'sit' : 'stand', clip: u < 0.5 ? 'sit' : u < 0.7 ? 'interact' : u < 0.8 ? 'wave' : 'idle' }); }
    });
  }
  function ensureSpawns(p) {
    if (p.spawns) return; p.spawns = []; var r = rng(hash(p.id));
    try { if (p.build) p.build(p, r); spotsBuild(p, r); } catch (e) { st.fault = 'build ' + p.id + ': ' + (e && e.message || e); }
    var grid = new Map(); p.spawns.forEach(function (sp, i) { var k = Math.floor(sp.x / C.CELL) + ',' + Math.floor(sp.z / C.CELL); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); }); p.grid = grid;
    var sig = 2166136261 >>> 0; p.spawns.forEach(function (sp) { sig = hash(sig + '|' + sp.id + sp.model + sp.kind + sp.x.toFixed(2) + sp.z.toFixed(2) + sp.skin.join() + (sp.top || '') + (sp.bot || '') + (sp.L || 0).toFixed(1)); }); p.sig = sig;
  }

  /* DUNN'S RIVER, from its own baked data (world712-dunns.js: OSM roads, the falls' terraces, the beach classes, POIs) */
  function dunnsBuild(p, r) {
    var P = window.WFR_DUNNS712, d = X.dData ? X.dData() : null; if (!P || !d) return;
    var T = d.terr, i, j, k, rr;
    var fall = []; for (i = 0; i < T.length; i += 7) { if (!fall.length || Math.hypot(fall[fall.length - 2] - T[i], fall[fall.length - 1] - T[i + 1]) > 0.5) fall.push(T[i], T[i + 1]); fall.push(T[i + 3], T[i + 4]); }
    var up = new Float32Array(fall.length); for (i = 0; i < fall.length; i += 2) { up[i] = fall[fall.length - 2 - i]; up[i + 1] = fall[fall.length - 1 - i]; }   // foot to top
    rr = rng(hash(p.id + ':chains'));
    for (var ch = 0; ch < 3; ch++) { var s0 = rr() * 200; for (k = 0; k < 8; k++) { var sp = person(p, rr, { role: k === 0 ? 'guide' : 'climber', path: up, v: 0.32, side: (k % 2 ? 0.35 : -0.35) + (ch - 1) * 2.4 }); sp.s0 = s0 - k * 1.1; } }   // a guide leads, seven follow a pace behind, hand to hand
    rr = rng(hash(p.id + ':bathers'));
    for (i = 0; i < T.length; i += 7) { var pool = Math.abs(T[i + 2] - T[i + 5]) < 2, n = pool ? 5 : 1; for (k = 0; k < n; k++) { var t = rr(), x = T[i] + (T[i + 3] - T[i]) * t, z = T[i + 1] + (T[i + 4] - T[i + 1]) * t, dx = T[i + 3] - T[i], dz = T[i + 4] - T[i + 1], l = Math.hypot(dx, dz) || 1, off = (rr() * 2 - 1) * T[i + 6] * 0.75, u = rr();
      person(p, rr, { role: 'bather', x: x + dz / l * off, z: z - dx / l * off, kind: u < 0.25 ? 'sit' : 'stand', clip: u < 0.25 ? 'sit' : u < 0.45 ? 'wave' : u < 0.6 ? 'interact' : 'idle' }); } }
    var foot = P.dunns ? P.dunns.bottom : [fall[fall.length - 2], fall[fall.length - 1]];
    rr = rng(hash(p.id + ':foot'));
    for (k = 0; k < 6; k++) { var a = rr() * Math.PI * 2, dd = 14 + rr() * 10; person(p, rr, { role: k < 2 ? 'guide' : 'vendor', x: foot[0] + Math.cos(a) * dd, z: foot[1] + Math.sin(a) * dd, clip: k < 2 ? 'wave' : 'interact', yaw: Math.atan2(foot[0] - (foot[0] + Math.cos(a) * dd), foot[1] - (foot[1] + Math.sin(a) * dd)) }); }
    /* the beach: sand cells near the falls' mouth; waders in the shallows in front of it */
    rr = rng(hash(p.id + ':beach')); var N = d.n, H0 = d.half, CE = d.cell, sand = [], shallow = [];
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) { var cx = -H0 + i * CE, cz = -H0 + j * CE; if (Math.hypot(cx - foot[0], cz - foot[1]) > 900) continue; var c = d.cls[j * N + i];
      if (c === 1) sand.push([cx, cz]); else if (c === 9 && X.dG) { var gy = X.dG(cx, cz); if (gy > -1.1 && gy < -0.25) shallow.push([cx, cz]); } }
    sand.forEach(function (s) { for (var q = 0; q < 4; q++) { var x = s[0] + (rr() - 0.5) * CE, z = s[1] + (rr() - 0.5) * CE, u = rr();
      if (u < 0.2) { var a2 = rr() * Math.PI * 2; person(p, rr, { role: 'beach', path: new Float32Array([x, z, x + Math.cos(a2) * 22, z + Math.sin(a2) * 22]), v: 0.8 }); }
      else person(p, rr, { role: 'beach', x: x, z: z, kind: u < 0.6 ? 'sit' : 'stand', clip: u < 0.6 ? 'sit' : u < 0.8 ? 'idle' : 'wave' }); } });
    shallow.slice(0, 40).forEach(function (s) { if (rr() < 0.5) person(p, rr, { role: 'swimmer', x: s[0] + (rr() - 0.5) * CE, z: s[1] + (rr() - 0.5) * CE, clip: rr() < 0.4 ? 'wave' : 'idle' }); });
    /* the streets and paths (OSM): walkers on the pavement, both ways, a run of at most 140 m each */
    rr = rng(hash(p.id + ':roads')); var Ld = d.roads, every = { 3: 160, 4: 110, 5: 90, 6: 55 };
    for (var w = 0; w < Ld.n; w++) { var kk = Ld.k[w], gap = every[kk]; if (!gap) continue; var pts = []; for (i = Ld.off[w]; i < Ld.off[w + 1]; i++) pts.push(Ld.P[i * 3] * Ld.q[0], Ld.P[i * 3 + 1] * Ld.q[0]);
      if (pts.length < 4) continue; var full = new Float32Array(pts), cum = polyLen(full), L = cum[cum.length - 1], cnt = Math.floor(L / gap + rr()), wd = Ld.w[w] ? Ld.w[w] / 20 : 2.5;
      for (k = 0; k < cnt; k++) { var a0 = rr() * Math.max(0, L - 140), seg = []; for (i = 0; i < cum.length; i++) if (cum[i] >= a0 && cum[i] <= a0 + 140) seg.push(full[i * 2], full[i * 2 + 1]);
        if (seg.length < 4) { var mi = Math.min(cum.length - 2, Math.max(0, cum.findIndex(function (v) { return v >= a0; }))); seg = [full[mi * 2], full[mi * 2 + 1], full[mi * 2 + 2], full[mi * 2 + 3]]; }
        person(p, rr, { role: 'walker', path: new Float32Array(seg), side: (rr() < 0.5 ? -1 : 1) * (kk === 6 ? rr() * 0.6 : wd + 0.8) }); } }
    /* the named places (OSM POIs: hotels, piers, the park): a small crowd at each */
    rr = rng(hash(p.id + ':pois'));
    (P.pois || []).forEach(function (q) { if (/falls/i.test(q.n) && q.e === '💦') return; var n = /pier|hotel|club|jewel/i.test(q.n) ? 10 : 6;
      for (k = 0; k < n; k++) { var a = rr() * Math.PI * 2, dd = 4 + Math.sqrt(rr()) * 16, x = q.x + Math.cos(a) * dd, z = q.z + Math.sin(a) * dd, u = rr();
        if (u < 0.25) { var a2 = rr() * Math.PI * 2; person(p, rr, { role: 'local', path: new Float32Array([x, z, x + Math.cos(a2) * 30, z + Math.sin(a2) * 30]) }); }
        else person(p, rr, { role: 'local', x: x, z: z, kind: u < 0.4 ? 'sit' : 'stand', clip: u < 0.4 ? 'sit' : u < 0.6 ? 'interact' : u < 0.7 ? 'wave' : 'idle' }); } });
    /* nobody in the sea or under it: a person whose ground is under the water (the falls apart) waits ashore */
    p.spawns = p.spawns.filter(function (sp) { if (sp.role === 'swimmer') return true; if (sp.kind === 'walk') { var m0 = at(sp, 0), m1 = at(sp, sp.L); return X.dG(m0[0], m0[1]) > 0.15 && X.dG(m1[0], m1[1]) > 0.15; } return X.dG(sp.x, sp.z) > 0.15; });
    p.spawns.forEach(function (sp, i2) { sp.id = p.id + ':' + i2; });
  }
  function registerBuiltins() {
    var P = window.WFR_DUNNS712 && WFR_DUNNS712.place;
    if (P) addPlace({ id: 'dunns', name: P.name, lat: P.lat, lon: P.lon, r: 3600, folk: 'jm', build: dunnsBuild,
      host: function () { var D = X.D; return D && D.group && D.group.parent === X.scene && D.d ? D.group : null; },
      ground: function (lx, lz) { return (X.WATER || 0) + X.dG(lx, lz); } });
    /* Antigua and Tahoe stand on the streamed ground (H) in the travel zone until their own builders hand a host and a ground (addPlace again, same id).
       Coordinates DRAFT from memory, for Izumi to check on a chart before they ship. */
    addPlace({ id: 'antigua', name: 'Antigua Guatemala', lat: 14.5574, lon: -90.7335, r: 500, folk: 'gt',
      spots: [{ kind: 'square', lat: 14.5574, lon: -90.7335, r: 45, n: 34 }, { kind: 'street', lat: 14.5585, lon: -90.7339, to: [14.5603, -90.7342], n: 14 }, { kind: 'street', lat: 14.5574, lon: -90.7320, to: [14.5574, -90.7352], n: 10 }] });
    addPlace({ id: 'tahoe', name: 'Lake Tahoe (Heavenly Village)', lat: 38.9558, lon: -119.9426, r: 500, folk: 'us',
      spots: [{ kind: 'square', lat: 38.9558, lon: -119.9426, r: 35, n: 24 }, { kind: 'street', lat: 38.9549, lon: -119.9440, to: [38.9568, -119.9412], n: 12 }] });
  }

  /* ---------- 4. the world features hook (buildings anywhere she lands): spec in the header; a stub until the module lands ---------- */
  function hookFeatures() {
    var F = window.WFR_FEATURES; if (st.featHooked || !F || typeof F.onTile !== 'function') return; st.featHooked = true;
    try { F.onTile(function (tile) { featureTile(tile); }); if (typeof F.onDrop === 'function') F.onDrop(function (tile) { featureDrop(tile && (tile.key || [tile.z, tile.x, tile.y].join('/'))); }); } catch (e) { st.featFault = String(e && e.message || e); }
  }
  function featureTile(tile) {
    try {
      if (!tile) return null; var key = tile.key || [tile.z, tile.x, tile.y].join('/'), B = tile.buildings || [], lls = [];
      B.forEach(function (b) { var ll = b.lat != null ? { lat: b.lat, lon: b.lon } : b.ll ? { lat: b.ll[0], lon: b.ll[1] } : (b.x != null && tile.frame) ? WFR_WORLD.toLatLon(tile.frame, b.x, b.z) : null; if (ll && isFinite(ll.lat) && isFinite(ll.lon)) lls.push({ ll: ll, b: b }); });
      var lu = (tile.landuse || []).filter(function (u) { return u && isFinite(u.lat) && isFinite(u.lon); });
      if (!lls.length && !lu.length) return null;
      var la = 0, lo = 0, all = lls.map(function (q) { return q.ll; }).concat(lu); all.forEach(function (q) { la += q.lat; lo += q.lon; }); la /= all.length; lo /= all.length;
      st.featTiles++;
      return addPlace({ id: 'f:' + key, name: 'tile ' + key, lat: la, lon: lo, r: 2000, folk: tile.folk || 'jm', build: function (p, r) {
        var rr = rng(hash(p.id + ':doors')), doors = [], n = 0;
        lls.forEach(function (q) { if (n >= 40 || rr() > 0.35) return; var c = LL(p, q.ll.lat, q.ll.lon), half = q.b.r || (q.b.w && q.b.d ? Math.max(q.b.w, q.b.d) / 2 : 6), a = rr() * Math.PI * 2, x = c.x + Math.cos(a) * (half + 1.5), z = c.z + Math.sin(a) * (half + 1.5), u = rr(); n++;
          doors.push([x, z]); person(p, rr, { role: 'local', x: x, z: z, kind: u < 0.2 ? 'sit' : 'stand', clip: u < 0.2 ? 'sit' : u < 0.45 ? 'interact' : u < 0.55 ? 'wave' : 'idle', yaw: Math.atan2(c.x - x, c.z - z) + Math.PI }); });
        for (var i = 1; i < doors.length; i++) if (rr() < 0.4 && Math.hypot(doors[i][0] - doors[i - 1][0], doors[i][1] - doors[i - 1][1]) < 120) person(p, rr, { role: 'walker', path: new Float32Array([doors[i - 1][0], doors[i - 1][1], doors[i][0], doors[i][1]]) });
        lu.forEach(function (u, ui) { if (!/park|grass|retail|commercial|square|beach/.test(u.kind || '')) return; var c = LL(p, u.lat, u.lon), m = /park|grass|beach/.test(u.kind) ? 5 : 7;
          for (var k = 0; k < m; k++) { var a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * 18, w = rr(); person(p, rr, { role: /beach/.test(u.kind) ? 'beach' : 'local', x: c.x + Math.cos(a) * d, z: c.z + Math.sin(a) * d, kind: w < 0.4 ? 'sit' : 'stand', clip: w < 0.4 ? 'sit' : 'idle' }); } });
      } });
    } catch (e) { st.featFault = String(e && e.message || e); return null; }
  }
  function featureDrop(key) { if (key) dropPlace('f:' + key); }

  /* ---------- 5. each frame: which places are here, who is near her, and where each one stands ---------- */
  function originOf(p) {   // the place's own (0, 0) in the world, or null if she is not near it: a host's matrix, else lat/lon through the travel frame
    if (p.world) return (X.TR && X.TR.on) ? null : { host: null, x: 0, z: 0 };
    if (p.host) { var h = p.host(); if (!h) return null; h.updateMatrixWorld(); return { host: h }; }
    var TR = X.TR; if (!TR || !TR.on || !TR.f) return null; var o = WFR_WORLD.toLocal(TR.f, p.lat, p.lon), S = X.S;
    if (Math.hypot(S.pos.x - o.x, S.pos.z - o.z) > p.r + C.VIEW) return null; return { host: null, x: o.x, z: o.z };
  }
  function toWorld(o, lx, ly, lz, out) {
    if (o.host) { var e = o.host.matrixWorld.elements; out[0] = e[0] * lx + e[4] * ly + e[8] * lz + e[12]; out[1] = e[1] * lx + e[5] * ly + e[9] * lz + e[13]; out[2] = e[2] * lx + e[6] * ly + e[10] * lz + e[14]; out[3] = Math.atan2(e[8], e[10]); }
    else { out[0] = o.x + lx; out[1] = ly; out[2] = o.z + lz; out[3] = 0; } return out; }
  function herLocal(o) { var S = X.S; if (o.host) { var e = o.host.matrixWorld.elements; return [S.pos.x - e[12], S.pos.z - e[14]]; } return [S.pos.x - o.x, S.pos.z - o.z]; }
  function groundL(p, o, lx, lz) { if (o.host && p.ground) return p.ground(lx, lz); var w = (X.H || X.groundAt)(o.x + lx, o.z + lz); if (p.world && X.groundAt) w = X.groundAt(o.x + lx, o.z + lz); return w; }
  function rtOf(id) { var r = st.rt.get(id); if (!r) { r = { paused: 0, hold: false, holdT: 0, release: 0 }; st.rt.set(id, r); } return r; }
  function posNow(sp, out) {   // where a townsperson is at the clock now (walkers: back and forth along their run; a held one keeps its spot)
    if (sp.kind !== 'walk') { out[0] = sp.x; out[1] = sp.z; out[2] = sp.yaw; return out; }
    var r = st.rt.get(sp.id), t = st.uTime.value - (r ? r.paused : 0), u = ((sp.s0 + sp.v * t) % (2 * sp.L) + 2 * sp.L) % (2 * sp.L), fwd = u < sp.L, q = at(sp, fwd ? u : 2 * sp.L - u);
    out[0] = q[0]; out[1] = q[1]; out[2] = fwd ? q[2] : q[2] + Math.PI; return out; }

  var TMP = [0, 0, 0], W4 = [0, 0, 0, 0];
  function refresh(acts) {
    var cand = [];
    for (var a = 0; a < acts.length; a++) { var p = acts[a].p, o = acts[a].o; ensureSpawns(p); var h = herLocal(o), R = C.VIEW + 80, i0 = Math.floor((h[0] - R) / C.CELL), i1 = Math.floor((h[0] + R) / C.CELL), j0 = Math.floor((h[1] - R) / C.CELL), j1 = Math.floor((h[1] + R) / C.CELL);
      for (var i = i0; i <= i1; i++) for (var j = j0; j <= j1; j++) { var L = p.grid.get(i + ',' + j); if (!L) continue;
        for (var k = 0; k < L.length; k++) { var sp = p.spawns[L[k]]; posNow(sp, TMP); var d = Math.hypot(TMP[0] - h[0], TMP[1] - h[1]); if (d < C.VIEW) cand.push({ sp: sp, p: p, o: o, d: d }); } } }
    cand.sort(function (x, y) { return x.d - y.d; });
    var used = st.meshes.map(function () { return 0; }), nNear = 0, set = [], byId = new Map();
    for (var c = 0; c < cand.length && set.length < C.MAX_ALL; c++) { var e = cand[c], m = e.sp.model, wantNear = e.d < C.NEAR && nNear < C.MAX_NEAR, mi = m * 2 + (wantNear ? 0 : 1);
      if (wantNear && used[mi] >= C.CAP_NEAR) mi = m * 2 + 1; if (used[mi] >= (mi % 2 ? C.CAP_FAR : C.CAP_NEAR)) continue; if (mi % 2 === 0) nNear++;
      e.mi = mi; e.slot = used[mi]++; e.anim = null; e.gy = null; set.push(e); byId.set(e.sp.id, e); if (!st.born.has(e.sp.id)) st.born.set(e.sp.id, e.d > 60 ? st.uTime.value : -99); }
    for (var id of st.born.keys()) if (!byId.has(id)) st.born.delete(id);
    st.meshes.forEach(function (im, mi) { im.count = used[mi]; im.userData.ids = []; });
    for (var s = 0; s < set.length; s++) { var E = set[s], im2 = st.meshes[E.mi], g = im2.geometry, sp2 = E.sp; im2.userData.ids[E.slot] = sp2.id;
      var S3 = g.getAttribute('aSkin724'), T3 = g.getAttribute('aTop724'), B3 = g.getAttribute('aBot724');
      S3.setXYZ(E.slot, sp2.skin[0], sp2.skin[1], sp2.skin[2]); if (sp2.top) T3.setXYZ(E.slot, sp2.top[0], sp2.top[1], sp2.top[2]); else T3.setXYZ(E.slot, -1, -1, -1); if (sp2.bot) B3.setXYZ(E.slot, sp2.bot[0], sp2.bot[1], sp2.bot[2]); else B3.setXYZ(E.slot, -1, -1, -1);
      if (sp2.kind !== 'walk') E.gy = groundL(E.p, E.o, sp2.x, sp2.z); animOf(E); }
    st.meshes.forEach(function (im) { var g = im.geometry; ['aSkin724', 'aTop724', 'aBot724', 'aAnim724'].forEach(function (n) { g.getAttribute(n).needsUpdate = true; }); });
    st.set = set; st.setById = byId;
  }
  function animOf(E) {   // the clip a townsperson plays now: its own, or (held by her) a wave then stillness
    var sp = E.sp, M = st.models[sp.model]; if (!M) return; var r = st.rt.get(sp.id), clip = sp.clip, w = -sp.phase, rate = 1;
    if (r && r.hold) { var since = st.uTime.value - r.holdT, wv = M.clips.wave; if (wv && since < wv.dur) { clip = 'wave'; w = r.holdT; } else { clip = sp.kind === 'sit' ? 'sit' : 'idle'; w = r.holdT; } }
    else if (sp.kind === 'walk') rate = sp.v / (M.vWalk * sp.scale);
    var cl = M.clips[clip] || M.clips.idle; if (!cl) return; var key = clip + w + rate; if (E.anim === key) return; E.anim = key;
    var A = st.meshes[E.mi].geometry.getAttribute('aAnim724'); A.setXYZW(E.slot, cl.f0, cl.n, cl.fps * rate, w); A.needsUpdate = true;
  }
  function draw(dt) {
    var S = X.S, t = st.uTime.value;
    for (var s = 0; s < st.set.length; s++) { var E = st.set[s], sp = E.sp, r = st.rt.get(sp.id);
      if (r && r.hold && r.release && t > r.release) { r.hold = false; r.release = 0; }
      if (r && r.hold && sp.kind === 'walk') r.paused += dt;
      posNow(sp, TMP); var gy = E.gy != null ? E.gy : groundL(E.p, E.o, TMP[0], TMP[1]); toWorld(E.o, TMP[0], gy, TMP[1], W4);
      var yaw = TMP[2] + W4[3];
      if (r && r.hold) { var want = Math.atan2(S.pos.x - W4[0], S.pos.z - W4[2]); r.yaw = r.yaw == null ? yaw : r.yaw + Math.atan2(Math.sin(want - r.yaw), Math.cos(want - r.yaw)) * Math.min(1, dt * 6); yaw = r.yaw; } else if (r) r.yaw = null;
      animOf(E);
      var b = st.born.get(sp.id), gr = b > 0 ? Math.min(1, (t - b) / C.GROW) : 1, sc = sp.scale * (gr * gr * (3 - 2 * gr)), cy = Math.cos(yaw) * sc, sy = Math.sin(yaw) * sc;
      var A = st.meshes[E.mi].instanceMatrix.array, o = E.slot * 16;
      A[o] = cy; A[o + 1] = 0; A[o + 2] = -sy; A[o + 3] = 0; A[o + 4] = 0; A[o + 5] = sc; A[o + 6] = 0; A[o + 7] = 0; A[o + 8] = sy; A[o + 9] = 0; A[o + 10] = cy; A[o + 11] = 0; A[o + 12] = W4[0]; A[o + 13] = W4[1]; A[o + 14] = W4[2]; A[o + 15] = 1;
      E.wx = W4[0]; E.wy = W4[1]; E.wz = W4[2]; }
    for (var i = 0; i < st.meshes.length; i++) if (st.meshes[i].count) st.meshes[i].instanceMatrix.needsUpdate = true;
  }
  function tick(dt) {
    if (!st.inited || !st.enabled) return; var t0 = performance.now();
    try {
      st.uTime.value += dt || 0;
      if (!st.featHooked && (st.featPoll -= dt) <= 0) { st.featPoll = 2; hookFeatures(); }
      var acts = []; if (st.ready && X.S && X.S.pos) for (var i = 0; i < st.places.length; i++) { var p = st.places[i], o = originOf(p); if (o) acts.push({ p: p, o: o }); }
      var ids = acts.map(function (a) { return a.p.id; }).join(',');
      if (!acts.length) { if (st.set.length) { st.set = []; st.setById = new Map(); st.meshes.forEach(function (im) { im.count = 0; }); } st.activeIds = []; st.lastActive = ''; }
      else {
        st.root.layers.enable(0); for (var m = 0; m < st.meshes.length; m++) { st.meshes[m].layers.enable(0); st.meshes[m].layers.enable(C.LAYER); }   // a far place's visit turns layer 0 off on whatever is far from her at its entry; the people are where she is
        if (ids !== st.lastActive) { st.lastActive = ids; st.refreshT = 0; } st.activeIds = acts.map(function (a) { return a.p.id; });
        if ((st.refreshT -= dt) <= 0) { st.refreshT = C.REFRESH; refresh(acts); }
        draw(dt || 0);
      }
    } catch (e) { st.fault = 'tick: ' + (e && e.message || e); st.enabled = false; st.meshes.forEach(function (im) { im.count = 0; }); }   // a fault takes the people away, never the game
    var ms = performance.now() - t0; st.ms.push(ms); if (st.ms.length > 600) st.ms.shift(); if (ms > st.msMax) st.msMax = ms;
    if (st.programsAfter == null && st.ready && X.renderer) st.programsAfter = X.renderer.info.programs.length;
  }

  /* ---------- 6. 724a: the 💬 near anyone (after hermits, signs and mentors: the page asks only when none of those has the button) ---------- */
  function distTo(tg) { var S = X.S;
    if (tg.kind === 'town') { var e = st.setById.get(tg.id); if (!e || e.wx == null) return 1e9; return Math.abs(S.pos.y - e.wy) > 4 ? 1e9 : Math.hypot(S.pos.x - e.wx, S.pos.z - e.wz); }
    var v = tg.g.getWorldPosition(new X.THREE.Vector3()); return Math.hypot(S.pos.x - v.x, S.pos.z - v.z); }
  function near(S) {
    if (!st.inited || !S || S.mode !== 'walk' || S.talking || S.inside) { st.target = null; return null; }
    if (st.target && distTo(st.target) < C.HIDE) return st.target;
    var best = null, bd = C.SHOW;
    for (var s = 0; s < st.set.length; s++) { var e = st.set[s]; if (e.wx == null) continue; var d = Math.hypot(S.pos.x - e.wx, S.pos.z - e.wz); if (d < bd && Math.abs(S.pos.y - e.wy) < 4) { bd = d; best = { kind: 'town', id: e.sp.id }; } }
    if (X.near676) { var L = X.near676(C.SHOW) || []; for (var k = 0; k < L.length; k++) { var tg = { kind: 'island', g: L[k].g }, dd = distTo(tg); if (dd < bd) { bd = dd; best = tg; } } }
    st.target = best; return best;
  }
  function islandName(g) { var n = (g.userData && (g.userData.name || g.userData.who)) || g.name || ''; n = String(n).split(':').pop(); return n && !/^(group|object3d|mesh)$/i.test(n) ? n.charAt(0).toUpperCase() + n.slice(1) : 'A villager'; }
  var ISLAND_LINES = ['Oh! Hello, little one.', 'You fly so well these days.', 'The nest is looking strong.'];   // DRAFT (724b will say the last thing she did for them)
  function talk(tg) {
    if (!st.inited || !tg || !X.say) return false; var S = X.S, crow = !!(S.lessons && S.lessons.crow), who, text;
    if (tg.kind === 'town') { var e = st.setById.get(tg.id); if (!e) return false; var sp = e.sp, r = rtOf(sp.id); r.hold = true; r.holdT = st.uTime.value; r.release = 0;
      who = crow ? '💬 ' + sp.name + ', ' + sp.title : '💬'; text = crow ? sp.line : sp.emoji + ' ♪';
      st.talks++; st.lastTalk = { id: sp.id, who: who, text: text };
      X.say([[who, text]], function () { r.release = st.uTime.value + 2.5; }); return true; }
    var g = tg.g, v = g.getWorldPosition(new X.THREE.Vector3()); if (g.parent === X.scene) g.rotation.y = Math.atan2(S.pos.x - v.x, S.pos.z - v.z);
    var nm = islandName(g); who = crow ? '💬 ' + nm : '💬'; text = crow ? ISLAND_LINES[hash(nm) % ISLAND_LINES.length] : '👋 ♪'; st.talks++; st.lastTalk = { island: nm, who: who, text: text };
    X.say([[who, text]]); return true;
  }

  /* ---------- 7. the bench's reads (guards only) ---------- */
  function drawn() {   // what SHIPS: every drawn person read back from the instance buffers
    var out = []; st.meshes.forEach(function (im) { var A = im.instanceMatrix.array, g = im.geometry, S3 = g.getAttribute('aSkin724'), T3 = g.getAttribute('aTop724'), N3 = g.getAttribute('aAnim724');
      for (var i = 0; i < im.count; i++) { var o = i * 16, sc = Math.hypot(A[o], A[o + 1], A[o + 2]); out.push({ id: im.userData.ids[i], mesh: im.name, x: A[o + 12], y: A[o + 13], z: A[o + 14], yaw: Math.atan2(A[o + 8], A[o + 10]), s: sc,
        skin: [S3.getX(i), S3.getY(i), S3.getZ(i)].map(function (v) { return +v.toFixed(3); }), top: [T3.getX(i), T3.getY(i), T3.getZ(i)].map(function (v) { return +v.toFixed(3); }), f0: N3.getX(i) }); } });
    return out; }
  function peek() {
    var draws = 0, tris = 0; st.meshes.forEach(function (im) { if (im.count && im.visible) { draws++; tris += im.count * (im.geometry.index ? im.geometry.index.count / 3 : 0); } });
    var ms = st.ms.slice().sort(function (a, b) { return a - b; });
    return { inited: st.inited, ready: st.ready, enabled: st.enabled, fault: st.fault, bakeErr: st.bakeErr, bakeMs: Math.round(st.bakeMs), active: st.activeIds.slice(), set: st.set.length,
      near: st.meshes.filter(function (im) { return im.userData.lod === 0; }).reduce(function (s, im) { return s + im.count; }, 0), draws: draws, tris: tris,
      programsInit: st.programsInit, programsAfter: st.programsAfter, programs: X && X.renderer ? X.renderer.info.programs.length : null, vatPrograms: X && X.renderer ? X.renderer.info.programs.filter(function (q) { return /userData.u724/.test(q.cacheKey || ''); }).length : null,
      ms: { n: ms.length, med: ms.length ? +ms[ms.length >> 1].toFixed(3) : null, p95: ms.length ? +ms[Math.floor(ms.length * 0.95)].toFixed(3) : null, max: +st.msMax.toFixed(3) },
      talks: st.talks, lastTalk: st.lastTalk || null, target: st.target ? (st.target.kind === 'town' ? st.target.id : 'island:' + islandName(st.target.g)) : null,
      places: st.places.map(function (p) { return { id: p.id, n: p.spawns ? p.spawns.length : null, sig: p.sig || null }; }), featHooked: st.featHooked, featTiles: st.featTiles, featFault: st.featFault,
      models: st.models.map(function (b) { return b ? { name: b.name, V: b.V, trisNear: b.trisNear, trisFar: b.trisFar, frames: b.frames, tex: [b.W, b.rows], texKB: Math.round(b.texBytes / 1024), vWalk: +b.vWalk.toFixed(3), sat: b.sat, standMinY: b.standMinY } : null; }),
      root: st.root ? { inScene: st.root.parent === X.scene, index: X.scene.children.indexOf(st.root), layers: st.meshes.map(function (im) { return im.layers.mask; }) } : null };
  }
  function testPerson(x, z, yaw) {   // a SETUP door for the guard: one townsperson standing at world x, z on the island (null clears it)
    dropPlace('guard724'); if (x == null) return null;
    return addPlace({ id: 'guard724', name: 'guard', world: true, lat: 0, lon: 0, build: function (p, r) { person(p, r, { role: 'local', x: x, z: z, yaw: yaw || 0, clip: 'idle' }); } });
  }
  function rebuild(id) { var p = st.byId[id]; if (p) { p.spawns = null; p.grid = null; st.refreshT = 0; } }   // the bench's revisit: generate the place again from its id

  return { C: C, init: init, tick: tick, near: near, talk: talk, addPlace: addPlace, dropPlace: dropPlace, featureTile: featureTile, featureDrop: featureDrop,
    peek: peek, drawn: drawn, resetMs: function () { st.ms = []; st.msMax = 0; }, testPerson: testPerson, rebuild: rebuild, roster: function (id) { var p = st.byId[id]; if (!p) return null; ensureSpawns(p); return { n: p.spawns.length, sig: p.sig }; },
    set enabled(v) { st.enabled = !!v; if (!v) st.meshes.forEach(function (im) { im.count = 0; }); st.refreshT = 0; }, get enabled() { return st.enabled; } };
})();
