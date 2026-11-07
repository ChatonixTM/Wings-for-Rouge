/* birds758.js - BOARD 758 (the chick's wings must grow) + 761's first step (Rouge, remade through Blender). Trunks, Nov 7 2026.
   Marth, verbatim: "the chic’s wings need to grow dammnit" / "when they get the names they need to not have those toilet roll looking wings lol" / "Use blender too but I’m not doing tripo rn".
   BORROWED: Quaternius "Bird", Public Domain (CC0), poly.pizza/m/gYYC0gYMnw: the head and crest, reshaped in Blender 5.2 by models-src/blender/make_bird758.py. models758.js carries the GLB.
   GLUE ONLY. Nothing here poses a bird: birds.js keeps its rig, flap and landings, and this swaps the geometry on the rig's own meshes, so every pose reads as before.
     dress(THREE, r, k, lin)   the end of WFR_BIRDS.build: the cardinal wears the model. Classic, or a model that fails, keeps the code bird, untouched.
     chick(THREE, U, stage, form)   the end of evoParts: feathered wings on the companion from stage 1 up, one set per coloured stage and per form. The baby keeps its own.
   The old wing mesh stays in place, hidden: every line that writes its scale keeps writing. Materials are changed in place (the holders keep their references) and land on the beak's
   program (Standard, vertex colours, no map, front side): no new shader (trap 651). */
window.WFR_BIRD758 = (function () {
  'use strict';
  var parts = null, failed = false, busy = false, waiting = [], LIN = false;
  var WANT = { body: 0.34, headball: 0.36, beak: 0.26, arm: 0.42, hand: 0.42, tailfan: 0.42 };
  var ARM = { fledgling: 0.62, young: 0.8, fly: 1.14, run: 0.72, str: 1.0, sta: 1.0, swim: 0.9, cre: 0.98 };   // make_bird758.py's SETS: where the hand sits on each arm
  var REST = { fly: 0.5 };   // the Swiftwing stands with its long wings held half out: its silhouette at rest (forms740 F5, F6)
  var api = { state: function () { return { ready: !!parts, failed: failed, names: parts ? Object.keys(parts).length : 0 }; } };
  function classic() { try { return localStorage.getItem('wfr.look') === 'classic'; } catch (e) { return false; } }
  function bytes(b64) { var s = atob(b64), n = s.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = s.charCodeAt(i); return u.buffer; }
  function rgb3(THREE, g) {   // the exporter's four-channel colour to three plain ones: the beak's program has no alpha colour
    var c = g.attributes.color; if (!c) return g; var n = c.count, a = new Float32Array(n * 3), k = !c.normalized ? 1 : c.array instanceof Uint16Array ? 1 / 65535 : c.array instanceof Uint8Array ? 1 / 255 : 1;   // r128 getX does not undo a normalized attribute
    for (var i = 0; i < n; i++) { var r = c.getX(i) * k, q = c.getY(i) * k, b = c.getZ(i) * k; a[i * 3] = LIN ? Math.pow(r, 2.2) : r; a[i * 3 + 1] = LIN ? Math.pow(q, 2.2) : q; a[i * 3 + 2] = LIN ? Math.pow(b, 2.2) : b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
  }
  function mirrored(THREE, g) {   // the right wing: x flipped, its triangles turned so the front stays the front
    var m = g.clone(), p = m.attributes.position, n = m.attributes.normal, ix = m.index, i, t;
    for (i = 0; i < p.count; i++) { p.setX(i, -p.getX(i)); n.setX(i, -n.getX(i)); }
    for (i = 0; i < ix.count; i += 3) { t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); }
    m.computeBoundingSphere(); return m;
  }
  function when(THREE, fn) {
    if (parts) return fn();
    if (failed || !window.WFR_MODELS || !WFR_MODELS.bird758 || !THREE.GLTFLoader) return;
    waiting.push(fn); if (busy) return; busy = true;
    try {
      new THREE.GLTFLoader().parse(bytes(WFR_MODELS.bird758), '', function (gltf) {
        var P = {};
        gltf.scene.traverse(function (o) { if (o.isMesh) P[o.name] = rgb3(THREE, o.geometry); });
        Object.keys(P).forEach(function (n) { if (/_(arm|hand)$/.test(n) || n === 'card_arm' || n === 'card_hand') P[n + '_m'] = mirrored(THREE, P[n]); });
        parts = P; var w = waiting; waiting = []; w.forEach(function (f) { try { f(); } catch (e) { console.warn('birds758: ' + ((e && e.message) || e)); } });
      }, function (e) { failed = true; waiting = []; console.warn('birds758: the model did not load, the code bird stays: ' + ((e && e.message) || e)); });
    } catch (e) { failed = true; waiting = []; console.warn('birds758: ' + ((e && e.message) || e)); }
  }
  function wear(THREE, mesh, geo, rough) {
    if (!mesh || !geo) return; var m = mesh.material; mesh.geometry = geo;
    m.map = null; m.bumpMap = null; m.normalMap = null; m.roughnessMap = null; m.vertexColors = true; m.side = THREE.FrontSide; m.color.set(0xffffff); m.metalness = 0; if (rough != null) m.roughness = rough; m.needsUpdate = true;
  }
  api.dress = function (THREE, r, k, lin) {
    if (k !== 'cardinal' || classic()) return; LIN = !!lin;
    when(THREE, function () {
      var byName = {}; r.g.traverse(function (o) { if (o.isMesh && !byName[o.name]) byName[o.name] = o; });
      wear(THREE, byName.body, parts.card_body, WANT.body); wear(THREE, byName.headball, parts.card_head, WANT.headball); wear(THREE, byName.tailfan, parts.card_tail, WANT.tailfan);
      wear(THREE, byName.beak, parts.card_beak, WANT.beak); if (byName.beak) { byName.beak.position.set(0, 0, 0); byName.beak.rotation.set(0, 0, 0); }
      if (byName.crest) byName.crest.visible = false;   // the crest is the borrowed bird's own now, on card_head
      if (byName.eye) byName.eye.geometry = parts.card_eye; if (byName.catchlight) byName.catchlight.geometry = parts.card_hi;
      [r.wingL, r.wingR].forEach(function (w, i) { var u = w.userData, sfx = i ? '_m' : ''; wear(THREE, u.arm, parts['card_arm' + sfx], WANT.arm); wear(THREE, u.hand, parts['card_hand' + sfx], WANT.hand); });
      r.g.traverse(function (o) { if (o.isMesh && o.name === 'thigh') { o.material.color.set(0xd8202e); o.scale.setScalar(0.72); } });
      r.g.userData.bird758 = true;
    });
  };
  /* the companion's wing: folded along its flank at rest, opening as the flap lifts it. birds.js's own fold, on the same numbers */
  function pose(U, i, piv) {
    var D = U.w758, W = D && D.wings[i]; if (!W) return; var s = W.s, z = Math.abs(piv.rotation.z), t = Math.min(1, Math.max(0, (z - 0.12) / 0.58)), open = Math.max(REST[D.set] || 0, t * t * (3 - 2 * t)), fold = 1 - open;
    W.g.rotation.set(-0.95 * fold + 0.62 * open, s * 1.5 * fold, 0); W.arm.scale.z = 1 - 0.35 * fold; W.hand.rotation.z = s * 0.14 * fold; W.hand.scale.x = 1 - 0.3 * fold;
    W.g.position.x = s * (0.015 + Math.max(0, (U.core ? U.core.scale.x : 1) * 0.42 - 0.38)); W.g.position.y = 0.08 + 0.2 * fold; if (i === 0) D.mat.color.copy(U.mat.color).multiplyScalar(1.18);
  }
  api.chick = function (THREE, U, stage, form) {
    if (classic()) return;
    var set = stage < 1 ? null : stage === 1 ? 'fledgling' : stage === 2 ? 'young' : (ARM[form] ? form : 'young');
    if (U.w758 && U.w758.set === set) { if (set) hideOld(U); return; }
    U.w758want = set;
    when(THREE, function () { if (U.w758want === set) build(THREE, U, set); });
  };
  function hideOld(U) { U.w758.wings.forEach(function (W, i) { U.wings[i].children.forEach(function (c) { if (c !== W.g) c.visible = false; }); }); }
  function build(THREE, U, set) {
    var D = U.w758, name = set || 'young';
    if (!D) {   // once per chick, baby included (hidden): a growth then only changes geometry, and adds nothing to the scene (evo636 V5)
      D = U.w758 = { set: undefined, wings: [], mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 }) };
      U.wings.forEach(function (piv, i) {
        var s = i === 0 ? -1 : 1, g = new THREE.Group(), arm = new THREE.Mesh(new THREE.BufferGeometry(), D.mat), hand = new THREE.Mesh(new THREE.BufferGeometry(), D.mat);
        g.name = 'wing758'; g.rotation.order = 'YXZ'; g.scale.setScalar(0.46); arm.name = 'wingarm758'; hand.name = 'winghand758'; arm.add(hand); g.add(arm); piv.add(g); D.wings[i] = { s: s, g: g, arm: arm, hand: hand };
        var base = piv.updateMatrixWorld; piv.updateMatrixWorld = function (force) { pose(U, i, piv); base.call(this, force); };
      });
    }
    D.set = set;
    D.wings.forEach(function (W, i) { var sfx = W.s < 0 ? '_m' : ''; W.arm.geometry = parts['w_' + name + '_arm' + sfx]; W.hand.geometry = parts['w_' + name + '_hand' + sfx]; W.hand.position.x = ARM[name] * W.s; W.g.visible = !!set; if (!set && U.wings[i].children[0]) U.wings[i].children[0].visible = true; });   // the geometry is shared, never disposed
    if (set) hideOld(U);
  }
  return api;
})();
