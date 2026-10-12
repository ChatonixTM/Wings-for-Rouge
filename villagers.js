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
  const SIT = { 'UpperLeg.L': [-1.45, 0, 0], 'UpperLeg.R': [-1.45, 0, 0], 'LowerLeg.L': [1.5, 0, 0], 'LowerLeg.R': [1.5, 0, 0] };   // a sit by hand: hips bent, knees bent

  function paint(THREE, body, name, pal) {
    const P = PAINT[name]; if (!P || !pal) return;
    const want = {}; for (const k of Object.keys(P)) for (const m of P[k]) want[m] = pal[k];
    if (window.WFR_PEOPLE && WFR_PEOPLE.paint) WFR_PEOPLE.paint(THREE, body, want);   // the merged body: colours live in the vertices, by the former material's name
    body.traverse((o) => { if (!o.isMesh || o.userData.ranges) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m && want[m.name] !== undefined && want[m.name] !== null) m.color.set(want[m.name]); });   // an unmerged body: by material
  }
  function swap(THREE, n, i, api) {   // api: { WFR_PEOPLE, height, pal, scene }
    if (n.model || !api.WFR_PEOPLE) return false;
    const name = api.body || BODY[i % BODY.length];
    const gs = n.g.getWorldScale(new THREE.Vector3()).y || 1;   // the villager's group already scales its body (1.35): size the model INSIDE that, or it stands a third too tall (ship #13 on his phone, Oct 11)
    api.WFR_PEOPLE.make(THREE, name, { height: api.height / gs, clips: name }, (p) => {   // each body's OWN clips: the women's skeleton rests differently, and the man's numbers put their hands behind their backs (his phone, Oct 11)
      if (!p || n.model) return;
      paint(THREE, p.body, name, api.pal);
      if (api.headScale && api.headScale !== 1) { const hd = p.body.getObjectByName('Head'); if (hd) hd.scale.setScalar(api.headScale); }   // the children: a bigger head on a short body (folk.js's K_HEAD)
      const s = p.body.scale.x, wrist = p.body.getObjectByName('Wrist.R') || p.body.getObjectByName('LowerArm.R');
      const hand = new THREE.Object3D(); hand.position.set(0, -0.72 / s, 0); hand.rotation.x = Math.PI; hand.scale.setScalar(1 / s);   // the old rig's armR frame: (0, -0.72, 0) lands on the wrist
      if (wrist) wrist.add(hand);
      n.classic = { body: n.body, legL: n.legL, legR: n.legR, armL: n.armL, armR: n.armR, head: n.head, waist: n.waist, props: n.props, broom: n.broom };
      n.g.remove(n.body); n.g.add(p.g);
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
  function pose(n, kind, dt, walkAmt, bt) {
    const p = n.model; if (!p) return;
    const clip = walkAmt > 0.15 ? 'walk' : (CLIP[kind] || (kind ? 'idle' : 'idle'));
    if (kind === 'receive' && bt > 1.6) p.play('interact'); else p.play(clip);
    if (p.actions.walk) p.actions.walk.setEffectiveTimeScale(walkAmt > 0.15 ? Math.max(0.6, Math.min(1.6, walkAmt)) : 1);
    p.tick(dt);
    const sitting = kind === 'sit' || kind === 'listenSit', s = p.body.scale.x;
    if (sitting) { for (const b in SIT) { const bone = p.body.getObjectByName(b); if (bone) bone.rotation.set(SIT[b][0], SIT[b][1], SIT[b][2]); } }
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
