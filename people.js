/* ════════════════════════════════════════════════════════════════════════════
   WFR_PEOPLE — the villagers, kids and fish as CC0 rigged models (board 618, Oct 11 2026).

   Marth, Oct 10: "use other ppls knowledge" — the people were hand-built in humans.js and he called them toyish. This
   loads the models Marth approved (Quaternius Man/Steve, Kenney Mini Characters, Quaternius Fish; licences in
   LICENSES.md) from models.js (base64 GLBs packed by tools/make-models.js) through the vendored r128 GLTFLoader, and
   hands the game a body with real animation clips.

   WFR_PEOPLE.make(THREE, name, opts, cb) → cb({ g, body, mixer, clips, play(clip, fade), tick(dt), height }) or cb(null)
     name  = 'man' | 'steve' | 'girl' | 'boy' | 'fish' (whatever models.js carries)
     opts  = { height = 3 (game units, feet to crown), lambert = true, shadow = true }
     clips = the model's clip names, lower-case, armature prefixes stripped ('idle', 'walk', 'sitting', 'wave', ...)
     play  = cross-fades to a clip by name (a name the model lacks is ignored: the last clip keeps playing)

   WHY LAMBERT: the whole island is MeshLambertMaterial under one sun and one hemisphere light. GLTFLoader gives
   MeshStandardMaterial (a heavier shader on a phone, and lit differently). Each mesh's material is rebuilt as Lambert
   with the same colour and map, skinning on (r128 needs it on the material). The renderer outputs linear, so the
   GLB's linear colours are converted to sRGB so they show as the artist drew them (humans.js does the same).

   Nothing here is called until the game asks; a missing models.js, loader or model answers cb(null) and the game's
   own humans.js villagers stand as before.
   ════════════════════════════════════════════════════════════════════════════ */
window.WFR_PEOPLE = (function () {
  'use strict';
  const cache = {}, waiting = {};
  let loader = null;

  function bytes(b64) {   // base64 → ArrayBuffer (GLTFLoader.parse wants the binary)
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  function clipName(c) {   // 'HumanArmature|Man_Idle' → 'idle'; 'CharacterArmature|...|Idle_Hold' → 'idle_hold'; 'emote-yes' → 'emote_yes'
    return c.name.split('|').pop().replace(/^(Man|Character)_/, '').toLowerCase().replace(/-/g, '_');
  }
  function toLambert(THREE, m) {
    const o = { color: m.color ? m.color.clone().convertLinearToSRGB() : new THREE.Color(0xffffff), skinning: true, side: m.side };
    if (m.map) { o.map = m.map; o.map.encoding = THREE.LinearEncoding; o.map.needsUpdate = true; }
    if (m.vertexColors) o.vertexColors = true;
    if (m.transparent) { o.transparent = true; o.opacity = m.opacity; }
    const l = new THREE.MeshLambertMaterial(o); l.name = m.name; return l;
  }
  function load(THREE, name, cb) {
    if (cache[name]) return cb(cache[name]);
    if (!window.WFR_MODELS || !WFR_MODELS[name] || !THREE.GLTFLoader) return cb(null);
    if (waiting[name]) return waiting[name].push(cb);
    waiting[name] = [cb];
    if (!loader) { loader = new THREE.GLTFLoader(); if (window.MeshoptDecoder && loader.setMeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder); }   // the modular people are meshopt-compressed (meshopt-decoder.js, MIT)
    const done = (m) => { cache[name] = m; const w = waiting[name]; delete waiting[name]; w.forEach((f) => f(m)); };
    try {
      loader.parse(bytes(WFR_MODELS[name]), '', (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        done({ scene: gltf.scene, clips: gltf.animations || [], height: box.max.y - box.min.y, minY: box.min.y, width: box.max.x - box.min.x });
      }, () => done(null));
    } catch (e) { done(null); }
  }
  function make(THREE, name, opts, cb) {
    opts = opts || {};
    if (opts.clips && opts.clips !== name && !cache[opts.clips]) return load(THREE, opts.clips, () => make(THREE, name, opts, cb));   // the donor's clips first (the modular people share one armature: one body carries the 24 clips for all)
    load(THREE, name, (m) => {
      if (!m || !THREE.SkeletonUtils) return cb(null);
      if (opts.clips && opts.clips !== name && cache[opts.clips]) m = Object.assign({}, m, { clips: cache[opts.clips].clips });   // tracks bind by bone NAME, so the donor's clips drive this body
      const g = new THREE.Group(), body = THREE.SkeletonUtils.clone(m.scene), s = (opts.height || 3) / m.height;
      body.scale.setScalar(s); body.position.y = -m.minY * s; g.add(body);
      body.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;   // a skinned mesh's bounds are its bind pose; walking out of them would blink it off
        if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();   // normals are not shipped (the points are welded, a third of the bytes); smooth normals suit these bodies (⚠ never toNonIndexed() a skinned mesh here: in r128 that shattered every body, Oct 11)
        if (opts.shadow !== false) { o.castShadow = true; o.receiveShadow = true; }
        if (opts.lambert !== false) o.material = Array.isArray(o.material) ? o.material.map((x) => toLambert(THREE, x)) : toLambert(THREE, o.material);
      });
      const mixer = new THREE.AnimationMixer(body), actions = {}, clips = [];
      for (const c of m.clips) { const n = clipName(c); clips.push(n); actions[n] = mixer.clipAction(c); }
      let now = null;
      function play(n, fade) {
        const a = actions[n]; if (!a || a === now) return !!a;
        a.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade === undefined ? 0.25 : fade).play();
        if (now) now.fadeOut(fade === undefined ? 0.25 : fade);
        now = a; return true;
      }
      cb({ g, body, mixer, clips, actions, play, tick: (dt) => mixer.update(dt), height: opts.height || 3, name, playing: () => (now ? now.getClip().name : null) });
    });
  }
  /* a model as ONE plain geometry with vertex colours baked from its materials (618, the fish): no bones, no materials, so it
     can be swapped into the game's own meshes or instanced. opts: { length (its size along Z after scaling), forward ('+z'
     default, '-z', '+x', '-x': which way the model's nose points, so forward ends up +Z as the game's fish expect) } */
  function geometry(THREE, name, opts, cb) {
    opts = opts || {};
    load(THREE, name, (m) => {
      if (!m) return cb(null);
      m.scene.updateMatrixWorld(true);
      const meshes = []; m.scene.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) meshes.push(o); });   // every piece (a fish is body, fins and eyes)
      if (!meshes.length) return cb(null);
      const P = [], C = [];
      for (const mesh of meshes) {
        const q = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone(); q.applyMatrix4(mesh.matrixWorld);
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material], n = q.attributes.position.count, col = new Float32Array(n * 3);
        const groups = q.groups && q.groups.length ? q.groups : [{ start: 0, count: n, materialIndex: 0 }];
        for (const gr of groups) { const c = (mats[gr.materialIndex] && mats[gr.materialIndex].color ? mats[gr.materialIndex].color.clone() : new THREE.Color(0xffffff)).convertLinearToSRGB();
          for (let i = gr.start; i < Math.min(n, gr.start + gr.count); i++) { col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b; } }
        P.push(q.attributes.position.array); C.push(col);
      }
      const total = P.reduce((s, a) => s + a.length, 0), pos = new Float32Array(total), col = new Float32Array(total); let at = 0;
      for (let i = 0; i < P.length; i++) { pos.set(P[i], at); col.set(C[i], at); at += P[i].length; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const fwd = opts.forward || '+z', ry = { '+z': 0, '-z': Math.PI, '+x': -Math.PI / 2, '-x': Math.PI / 2 }[fwd] || 0; if (ry) g.rotateY(ry);
      g.computeBoundingBox(); const b = g.boundingBox, c = b.getCenter(new THREE.Vector3()); g.translate(-c.x, -c.y, -c.z);
      const len = b.max.z - b.min.z, s = opts.length ? opts.length / len : 1; if (s !== 1) g.scale(s, s, s);
      g.computeBoundingBox(); g.computeVertexNormals();
      cb({ geo: g, size: g.boundingBox.getSize(new THREE.Vector3()), name });
    });
  }
  function splitZ(THREE, g, z) {   // a non-indexed geometry cut in two by the z of each triangle's middle: { front (z >= cut), back }; the back keeps its place
    const p = g.attributes.position, tri = p.count / 3, front = [], back = [];
    for (let t = 0; t < tri; t++) { const mz = (p.getZ(3 * t) + p.getZ(3 * t + 1) + p.getZ(3 * t + 2)) / 3; (mz >= z ? front : back).push(t); }
    const take = (list) => { const o = new THREE.BufferGeometry();
      for (const k of Object.keys(g.attributes)) { const a = g.attributes[k], sz = a.itemSize, out = new Float32Array(list.length * 3 * sz);
        list.forEach((t, i) => { for (let v = 0; v < 3; v++) for (let j = 0; j < sz; j++) out[(i * 3 + v) * sz + j] = a.array[(t * 3 + v) * sz + j]; });
        o.setAttribute(k, new THREE.BufferAttribute(out, sz)); }
      o.computeBoundingBox(); return o; };
    return { front: take(front), back: take(back) };
  }
  return { make, load, clipName, geometry, splitZ };
})();
