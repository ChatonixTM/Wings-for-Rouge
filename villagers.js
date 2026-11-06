/* ════════════════════════════════════════════════════════════════════════════
   WFR_VILLAGERS — the villagers as CC0 model people (board 618 / 616, Oct 11 2026).

   Marth: "go with the one with more models and download the female version so you can continue with the body shrinkage +
   clothing drip" and (622) "keep our version (the one you coded by hand) as a version swap in settings ... the remodeled one
   will be the 'standard'". So: nothing here replaces humans.js. The game builds its villagers exactly as before; when the
   models decode (people.js + models.js, after the island is up) and the look is Standard, each villager's BODY is swapped
   inside its own group, and the hand-built body is kept so Classic can bring it back at once.

   WFR_VILLAGERS.swap(THREE, n, i, api) → true when the villager now wears a model; n keeps its group, state and act.
     n.model   = the people.js body (mixer, clips, play, tick)
     n.classic = { body, legL, legR, armL, armR, head, waist, props, broom } the hand-built parts, for the way back
     n.armR    = a hand socket on the model's right wrist: the game's props, broom and tools hang from it as they did
     the other limb fields point at loose Object3Ds, so pose()'s writes land on nothing
   WFR_VILLAGERS.restore(n)        the Classic body back inside the same group
   WFR_VILLAGERS.pose(n, kind, dt, walkAmt, bt)   called by the game's pose(): the clip for the act, the sit by hand

   Bodies (models.js): woman1, woman2 (Quaternius "Animated Woman" x2), man1 ("Casual Character", the clip donor), man2
   ("Worker"). Six villagers from four bodies by the game's own paints (SHIRTS/PANTS/SHOES/SKIN/HAIR by index).
   Clips kept on the donor: idle, idle_neutral, walk, run, wave, interact, hitrecieve, punch_left, punch_right.
   ════════════════════════════════════════════════════════════════════════════ */
window.WFR_VILLAGERS = (function () {
  'use strict';
  const BODY = ['woman1', 'man1', 'man2', 'woman2', 'man1', 'woman1'];   // Ada, Bo, Cyril, Go, Eli, Faye
  /* which of each model's materials take the game's paints (names from the GLBs; a name absent is skipped) */
  const PAINT = {
    man1:   { shirt: ['LightBrown'], pants: ['LightBlue'], shoes: ['White', 'Red_Dark'], skin: ['Skin', 'Skin_Darker'], hair: ['Hair', 'Eyebrows'] },
    man2:   { shirt: ['Worker_Yellow', 'Worker_Vest'], pants: ['Brown2', 'Brown'], shoes: ['Black', 'Grey'], skin: ['Skin'], hair: ['Moustache', 'Eyebrows'] },
    woman1: { shirt: ['LimeGreen'], pants: [], shoes: ['Red'], skin: ['Skin'], hair: ['Brown'] },
    woman2: { shirt: ['White'], pants: ['Orange'], shoes: ['Grey'], skin: ['Skin'], hair: ['Hair_Blond', 'Hair_Brown', 'Brown'] },
  };
  /* the game's act kinds -> the donor's clips; kinds with no clip of their own borrow the nearest gesture */
  const CLIP = { talk: 'interact', stretch: 'idle_neutral', pull: 'interact', sweep: 'interact', kneel: 'interact', shop: 'idle_neutral', look: 'idle', wave: 'wave',
    listen: 'idle_neutral', listenSit: 'idle_neutral', receive: 'wave', hammer: 'interact', paint: 'interact', turn: 'interact', sit: 'idle_neutral' };
  const bone = (root, nm) => root.getObjectByName(nm) || root.getObjectByName(nm.replace(/[\[\]\.:\/]/g, ''));   /* Su 33 (Oct 17): r128's GLTFLoader strips . : / [ ] from node names ('Wrist.R' -> 'WristR'): without this the hand socket was never attached (held things never drawn) and the sit never bent a knee */
  /* 745: a sit by hand. hip, foot: metres from the sitter's origin (the page holds it 0.25 m above the ground at the seat's middle). thigh, knee: radians about the body's side axis.
     upArm, loArm: [forward, inward]. ease: how fast they settle, per second. All DRAFT. */
  const SEAT = { hip: 0.8, foot: -0.205, thigh: -1.45, knee: 1.45, upArm: [-0.35, 0.1], loArm: [-0.85, 0.35], ease: 3 };
  let T3 = null;

  function paint(THREE, body, name, pal) {
    const P = PAINT[name]; if (!P || !pal) return;
    const want = {}; for (const k of Object.keys(P)) for (const m of P[k]) want[m] = pal[k];
    if (window.WFR_PEOPLE && WFR_PEOPLE.paint) WFR_PEOPLE.paint(THREE, body, want);   // the merged body: colours live in the vertices, by the former material's name
    body.traverse((o) => { if (!o.isMesh || o.userData.ranges) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m && want[m.name] !== undefined && want[m.name] !== null) m.color.set(want[m.name]); });   // an unmerged body: by material
  }
  /* 628 (Marth, Oct 11: "the white guys shouldn't have braids tbh. Maybe the one dude. Then give Eli dreads and model Go after Nico
     Robin"): per-villager extras on top of the paints. Bo keeps the Casual body's braids; Eli's braids are folded away (the hair's
     vertices gathered into the skull) and dreads hang from his Head bone; Go (Nico Robin): long straight black hair down her back
     and shoulders from her Head bone, black paints. Pieces are the game's own shapes, placed in the bone's space (scaled 1/s). */
  const LOOKS = {
    3: { hair: 0x0a0a0a, piece: 'longHair' },   // Go, after Nico Robin
    4: { hideHair: ['Hair'], piece: 'dreads' },  // Eli
  };
  function piece(THREE, kind, s) {
    const g = new THREE.Group(); g.name = 'look:' + kind; g.scale.setScalar(1 / s);
    const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
    if (kind === 'dreads') { for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, r = 0.16 + (k % 2) * 0.02, L = 0.42 + (k % 3) * 0.1;
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, L, 5), lam(0x1a110b)); d.position.set(Math.cos(a) * r, 0.1 - L / 2, Math.sin(a) * r - 0.02); d.rotation.z = Math.cos(a) * 0.35; d.rotation.x = -Math.sin(a) * 0.35; g.add(d); }
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), lam(0x1a110b)); cap.position.y = 0.12; g.add(cap); }
    if (kind === 'longHair') { const back = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.8, 0.12), lam(0x0a0a0a)); back.position.set(0, -0.3, -0.17); g.add(back);
      for (const sd of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.16), lam(0x0a0a0a)); f.position.set(0.2 * sd, -0.2, 0.02); g.add(f); }
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.48), lam(0x0a0a0a)); top.position.y = 0.1; g.add(top); }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  function hideRanges(THREE, body, names) {   // gather a former material's vertices to one point inside the head: the part is gone, nothing else moves
    body.traverse((o) => { if (!o.isMesh || !o.userData.ranges) return; const pos = o.geometry.attributes.position; let t = false;
      for (const nm of names) for (const [start, count] of (o.userData.ranges[nm] || [])) { let cx = 0, cy = 0, cz = 0; for (let i = start; i < start + count; i++) { cx += pos.getX(i); cy += pos.getY(i); cz += pos.getZ(i); } cx /= count; cy /= count; cz /= count;
        for (let i = start; i < start + count; i++) pos.setXYZ(i, cx, cy, cz); t = true; }
      if (t) pos.needsUpdate = true; });
  }
  function look(THREE, n, i, p) {
    const L = LOOKS[i]; if (!L) return;
    if (L.hair !== undefined && window.WFR_PEOPLE && WFR_PEOPLE.paint) { const nm = {}; for (const k of (PAINT[p.name] ? PAINT[p.name].hair : [])) nm[k] = L.hair; WFR_PEOPLE.paint(THREE, p.body, nm); }
    if (L.hideHair) hideRanges(THREE, p.body, L.hideHair);
    if (L.piece) { const head = p.body.getObjectByName('Head'); if (head) { p.g.updateMatrixWorld(true);
      /* the bone's TRUE scale in the BODY's units (p.g's), which are the group's units once the body stands inside it. Ship #19 divided by
         the villager GROUP's world scale (1.35) while the head was measured BEFORE the body had joined that group, so every piece came out
         1.35x too big and too high: Eli's dome floated over his head and his dreads hung from his brow (his shot, Oct 12 ~01:36). */
      const hs = head.getWorldScale(new THREE.Vector3()).x / (p.g.getWorldScale(new THREE.Vector3()).x || 1) || 1;
      const pc = piece(THREE, L.piece, hs); pc.position.y = 0.12 / hs; head.add(pc); } }
  }
  function swap(THREE, n, i, api) {   // api: { WFR_PEOPLE, height, pal, scene }
    T3 = THREE; if (n.model || !api.WFR_PEOPLE) return false;
    const name = api.body || BODY[i % BODY.length];
    const gs = n.g.getWorldScale(new THREE.Vector3()).y || 1;   // the villager's group already scales its body (1.35): size the model INSIDE that, or it stands a third too tall (ship #13 on his phone, Oct 11)
    api.WFR_PEOPLE.make(THREE, name, { height: api.height / gs, clips: name }, (p) => {   // each body's OWN clips: the women's skeleton rests differently, and the man's numbers put their hands behind their backs (his phone, Oct 11)
      if (!p || n.model) return;
      paint(THREE, p.body, name, api.pal);
      if (api.looks !== false && api.pal) look(THREE, n, i, p);   // 628: the villagers' own looks (the kids pass looks: false)
      if (api.headScale && api.headScale !== 1) { const hd = p.body.getObjectByName('Head'); if (hd) hd.scale.setScalar(api.headScale); }   // the children: a bigger head on a short body (folk.js's K_HEAD)
      n.classic = { body: n.body, legL: n.legL, legR: n.legR, armL: n.armL, armR: n.armR, head: n.head, waist: n.waist, props: n.props, broom: n.broom };
      n.g.remove(n.body); n.g.add(p.g); n.g.updateMatrixWorld(true);
      /* ⚠ a bone's world scale is NOT the body's scale (the armature carries its own); assume it and a prop or a hairpiece comes out
         fifty times too big (ship #15, Oct 12: Go and Eli wore a mountain). Read it. */
      const wrist = bone(p.body, 'Wrist.R') || bone(p.body, 'LowerArm.R'), ws = wrist ? wrist.getWorldScale(new THREE.Vector3()).x / (n.g.getWorldScale(new THREE.Vector3()).x || 1) : 1;
      const hand = new THREE.Object3D(); n.wristBone = wrist; n.wv = new THREE.Vector3(); void ws;   /* Su 33 (Oct 18): the bone's own frame twisted every prop (a broom's centre 2.6 m up and out from the wrist, measured); the hand now sits in the villager's frame and follows the wrist each frame (pose), 0.72 above it as the old armR pivot was, so props land at the wrist */   // the old rig's armR frame: (0, -0.72, 0) lands on the wrist, in the group's units
      n.g.add(hand);
      for (const k of ['broom']) if (n.broom) { hand.add(n.broom); }
      if (n.props) for (const k in n.props) hand.add(n.props[k]);
      if (n.tool && n.tool.g) hand.add(n.tool.g);
      n.body = p.g; n.model = p; n.hand = hand; n.armR = hand;
      n.legL = new THREE.Object3D(); n.legR = new THREE.Object3D(); n.armL = new THREE.Object3D(); n.head = new THREE.Object3D(); n.waist = new THREE.Object3D();
      p.play('idle', 0);
      if (api.onSwap) api.onSwap(n);
    });
    return true;
  }
  function restore(n) {
    if (!n.model || !n.classic) return false;
    const c = n.classic, hand = n.hand;
    n.g.remove(n.body); n.g.add(c.body);
    if (c.broom) c.armR.add(c.broom); if (c.props) for (const k in c.props) c.armR.add(c.props[k]); if (n.tool && n.tool.g) c.armR.add(n.tool.g);
    Object.assign(n, { body: c.body, legL: c.legL, legR: c.legR, armL: c.armL, armR: c.armR, head: c.head, waist: c.waist, props: c.props, broom: c.broom });
    n.model = null; n.classic = null; n.hand = null; if (hand && hand.parent) hand.parent.remove(hand);
    return true;
  }
  /* 745: world-people.js's swing: turn a bone about an axis of the villager's own frame, so the rig's bone axes never matter (the guessed ones threw the thighs back through the backrest) */
  function turn(bone, top, axis, ang, q) { top.getWorldQuaternion(q.a); bone.parent.getWorldQuaternion(q.b); q.a.invert().multiply(q.b); q.b.copy(q.a).invert(); q.c.setFromAxisAngle(axis, ang); bone.quaternion.premultiply(q.a).premultiply(q.c).premultiply(q.b); }
  function sitBones(p) {
    const legs = ['L', 'R'].map((s) => [bone(p.body, 'UpperLeg.' + s), bone(p.body, 'LowerLeg.' + s), bone(p.body, 'Foot.' + s)]), arms = ['L', 'R'].map((s, i) => [bone(p.body, 'UpperArm.' + s), bone(p.body, 'LowerArm.' + s), bone(p.body, 'Wrist.' + s), i ? 1 : -1]), body = bone(p.body, 'Body');
    const q = () => new T3.Quaternion(), all = [body].concat(...legs, ...arms.map((a) => a.slice(0, 2)));
    return { root: bone(p.body, 'Root'), body, hips: bone(p.body, 'Hips'), legs, arms, a: new T3.Vector3(), b: new T3.Vector3(), X: new T3.Vector3(1, 0, 0), Z: new T3.Vector3(0, 0, 1), q: { a: q(), b: q(), c: q() }, kept: all.map((o) => [o, q(), new T3.Vector3()]), held: false };
  }
  function sit(n, p, kind, dt) {
    const B = p.sit || (p.sit = sitBones(p)), g = n.g.position, a = B.a, b = B.b, k = n.sitK = Math.min(1, (n.sitK || 0) + dt * SEAT.ease);
    for (const s of B.kept) { s[1].copy(s[0].quaternion); s[2].copy(s[0].position); } B.held = true;   // the clip's pose, put back before the next tick: the mixer skips a channel that did not change, so nothing here may build up
    B.hips.getWorldPosition(a); b.set(g.x, g.y + SEAT.hip, g.z); B.root.worldToLocal(a); B.root.worldToLocal(b); B.body.position.addScaledVector(b.sub(a), k);   // the hips on the seat; the rig's feet hang from the Root, so they do not move with it
    for (const L of B.legs) { turn(L[0], n.g, B.X, SEAT.thigh * k, B.q); turn(L[1], n.g, B.X, SEAT.knee * k, B.q); L[1].getWorldPosition(a); a.y = g.y + SEAT.foot; B.root.worldToLocal(a); L[2].position.lerp(a, k); }   // the thigh forward, the shin down, the foot under the knee
    if (kind !== 'sit' && kind !== 'listenSit') return;   // a wave from the seat keeps the clip's arms
    for (const A of B.arms) { turn(A[0], n.g, B.X, SEAT.upArm[0] * k, B.q); turn(A[0], n.g, B.Z, SEAT.upArm[1] * A[3] * k, B.q); turn(A[1], n.g, B.X, SEAT.loArm[0] * k, B.q); turn(A[1], n.g, B.Z, SEAT.loArm[1] * A[3] * k, B.q); }   // the hands to the lap
    if (!n.hand) return;
    B.arms[0][2].getWorldPosition(a); B.arms[1][2].getWorldPosition(b); a.add(b).multiplyScalar(0.5); n.g.worldToLocal(a); const t = n.hand.rotation.x;   // the book between the hands: the socket's -0.72 hang turns with the page's arm ease, so it is undone here
    n.hand.position.set(a.x, a.y + 0.72 * Math.cos(t), a.z + 0.72 * Math.sin(t)); if (n.props && n.props.book) n.props.book.rotation.set(1.2, Math.PI / 2, 0);
  }
  function pose(n, kind, dt, walkAmt, bt) {
    const p = n.model; if (!p) return;
    if (p.sit && p.sit.held) { for (const s of p.sit.kept) { s[0].quaternion.copy(s[1]); s[0].position.copy(s[2]); } p.sit.held = false; }
    const clip = walkAmt > 0.15 ? 'walk' : (CLIP[kind] || (kind ? 'idle' : 'idle'));
    if (kind === 'receive' && bt > 1.6) p.play('interact'); else p.play(clip);
    if (p.actions.walk) p.actions.walk.setEffectiveTimeScale(walkAmt > 0.15 ? Math.max(0.6, Math.min(1.6, walkAmt)) : 1);
    p.tick(dt);
    if (n.wristBone && n.hand && n.wv) { n.wristBone.getWorldPosition(n.wv); n.g.worldToLocal(n.wv); n.hand.position.set(n.wv.x, n.wv.y + 0.72, n.wv.z); }   /* Su 33 (Oct 18): the hand follows the wrist (props hang as the old rig drew them) */
    if (kind === 'sit' || kind === 'listenSit' || n.onSeat) sit(n, p, kind, dt); else n.sitK = 0;
    /* the body's height while seated is the game's own ease of n.body.position.y (n.body is this model's root), the same path the
       hand-built body takes; writing it here too made two hands fight on one knob (the bench's "listens sitting down" caught it) */
  }
  /* the children (folk.js kPose has no dt: each kid keeps its own clock). Their kinds: run/reach/jog/walk/laugh/dig/watch/cheer/shrug/stand */
  const KID_CLIP = { run: 'run', reach: 'run', jog: 'run', walk: 'walk', laugh: 'idle_neutral', dig: 'interact', watch: 'idle_neutral', cheer: 'wave', shrug: 'idle_neutral', stand: 'idle' };
  function kidPose(k, kind) {
    const p = k.model; if (!p) return;
    const now = performance.now(), dt = Math.min(0.05, (now - (k.modelT || now)) / 1000); k.modelT = now;
    p.play(KID_CLIP[kind] || 'idle'); p.tick(dt);
  }
  return { swap, restore, pose, kidPose, BODY, PAINT, CLIP, KID_CLIP };
})();
