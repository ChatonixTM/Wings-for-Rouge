/* ════════════════════════════════════════════════════════════════════════════
   WFR_WEAR — what the chick holds and wears (board 624, Oct 11 2026).

   Marth: "we should make about 6 items the chick can hold - as a 'weapon per say' and about 10 costumes/items the chic can wear.
   or can just the attack button once its made be the default if no weapon is attributed to the chic". So: six held things and ten
   wearables, all from the game's own shapes (no files), hung on the chick's body group so the stage's scale carries them.
   Four of the held things ARE the keepsakes she already finds (shell, bead, pine cone, river stone): holding one needs its mark in
   S.chick.marks (Itachi: the keepsake ones earned by finding them; the twig and the feather are free, as are all the wearables).
   Nothing held = the bare beak (614's attack button, when it comes).

   WFR_WEAR.HELD / WFR_WEAR.WEAR      the catalogues: { id, name, emoji, needs? (a keepsake id) }
   WFR_WEAR.apply(THREE, chick, c)   builds/removes the meshes to match c.held (one id or null) and c.wear (an array of ids)
   WFR_WEAR.can(c, id)               true when the chick may hold/wear it (a keepsake item needs its mark)
   ════════════════════════════════════════════════════════════════════════════ */
window.WFR_WEAR = (function () {
  'use strict';
  const HELD = [
    { id: 'twig', name: 'a twig', emoji: '\u{1FAB5}' },
    { id: 'feather', name: 'a feather wand', emoji: '\u{1FAB6}' },
    { id: 'shell', name: 'the sea shell', emoji: '\u{1F41A}', needs: 'shell' },
    { id: 'bead', name: 'the blue bead', emoji: '\u{1F535}', needs: 'bead' },
    { id: 'pinecone', name: 'the pine cone', emoji: '\u{1F330}', needs: 'pinecone' },
    { id: 'riverstone', name: 'the river stone', emoji: '\u{1FAA8}', needs: 'riverstone' },
  ];
  const WEAR = [
    { id: 'hat', name: 'a cone hat', emoji: '\u{1F389}' }, { id: 'crown', name: 'a little crown', emoji: '\u{1F451}' }, { id: 'bow', name: 'a bow', emoji: '\u{1F380}' },
    { id: 'scarf', name: 'a scarf', emoji: '\u{1F9E3}' }, { id: 'glasses', name: 'round glasses', emoji: '\u{1F453}' }, { id: 'cape', name: 'a cape', emoji: '\u{1F9E5}' },
    { id: 'flower', name: 'a flower', emoji: '\u{1F33C}' }, { id: 'bandana', name: 'a bandana', emoji: '\u{1F3F4}' }, { id: 'bell', name: 'a bell', emoji: '\u{1F514}' }, { id: 'thread', name: 'the red thread', emoji: '\u{1F9F5}' },
  ];
  const SLOT = { hat: 'head', crown: 'head', bow: 'head', flower: 'head', bandana: 'head', glasses: 'face', scarf: 'neck', thread: 'neck', bell: 'neck', cape: 'back' };
  function can(c, id) { const it = HELD.concat(WEAR).find((x) => x.id === id); if (!it) return false; return !it.needs || !!(c && c.marks && c.marks[it.needs]); }
  function lam(THREE, color, extra) { return new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {})); }
  function basic(THREE, color) { return new THREE.MeshBasicMaterial({ color }); }
  /* every piece is built in the chick body's own space: head centre (0, 0.45, 0.14) r 0.29, beak tip (0, 0.42, 0.56), body r 0.42 */
  const BUILD = {
    twig: (T) => { const g = new T.Group(); const s = new T.Mesh(new T.CylinderGeometry(0.025, 0.03, 0.7, 6), lam(T, 0x8b5e34)); s.rotation.z = Math.PI / 2; g.add(s); return g; },
    feather: (T) => { const g = new T.Group(); const q = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.6, 5), lam(T, 0xe8dcc6)); q.rotation.z = Math.PI / 2; g.add(q); const v = new T.Mesh(new T.SphereGeometry(0.1, 8, 6), lam(T, 0xff8fa3)); v.scale.set(2.2, 0.5, 0.15); v.position.x = 0.12; g.add(v); return g; },
    shell: (T) => { const m = new T.Mesh(new T.SphereGeometry(0.13, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(T, 0xf3e3d0, { side: T.DoubleSide })); m.rotation.x = -Math.PI / 2; return m; },
    bead: (T) => new T.Mesh(new T.SphereGeometry(0.1, 10, 8), lam(T, 0x3f7fd0)),
    pinecone: (T) => new T.Mesh(new T.ConeGeometry(0.11, 0.26, 7), lam(T, 0x6e4529, { flatShading: true })),
    riverstone: (T) => { const m = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), lam(T, 0x4a4a52)); m.scale.set(1, 0.6, 0.8); return m; },
    hat: (T) => { const m = new T.Mesh(new T.ConeGeometry(0.2, 0.42, 10), lam(T, 0xc8314a)); m.position.set(0, 0.45 + 0.29 + 0.18, 0.12); return m; },
    crown: (T) => { const m = new T.Mesh(new T.TorusGeometry(0.17, 0.035, 6, 10), lam(T, 0xf2b134)); m.rotation.x = Math.PI / 2; m.position.set(0, 0.45 + 0.27, 0.12); return m; },
    bow: (T) => { const g = new T.Group(); for (const s of [-1, 1]) { const w = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), lam(T, 0xff8fa3)); w.scale.set(1.4, 0.8, 0.6); w.position.set(0.09 * s, 0.45 + 0.3, 0.1); g.add(w); } const k = new T.Mesh(new T.SphereGeometry(0.035, 6, 4), lam(T, 0xc8314a)); k.position.set(0, 0.45 + 0.3, 0.1); g.add(k); return g; },
    flower: (T) => { const g = new T.Group(); for (let i = 0; i < 5; i++) { const p = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), lam(T, 0xfff2a8)); const a = i / 5 * Math.PI * 2; p.position.set(Math.cos(a) * 0.07 + 0.16, 0.45 + 0.25, Math.sin(a) * 0.07 + 0.1); g.add(p); } const c = new T.Mesh(new T.SphereGeometry(0.04, 6, 4), lam(T, 0xf28c28)); c.position.set(0.16, 0.45 + 0.25, 0.1); g.add(c); return g; },
    bandana: (T) => { const m = new T.Mesh(new T.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), lam(T, 0x2e8b8b)); m.position.set(0, 0.45, 0.14); m.scale.set(1.03, 1.03, 1.03); return m; },
    glasses: (T) => { const g = new T.Group(); for (const s of [-1, 1]) { const r = new T.Mesh(new T.TorusGeometry(0.075, 0.012, 6, 12), basic(T, 0x222222)); r.position.set(0.12 * s, 0.53, 0.4); g.add(r); } const b = new T.Mesh(new T.BoxGeometry(0.1, 0.012, 0.012), basic(T, 0x222222)); b.position.set(0, 0.53, 0.4); g.add(b); return g; },
    scarf: (T) => { const m = new T.Mesh(new T.TorusGeometry(0.3, 0.07, 8, 14), lam(T, 0xc8574b)); m.rotation.x = Math.PI / 2; m.position.set(0, 0.22, 0.08); return m; },
    thread: (T) => { const m = new T.Mesh(new T.TorusGeometry(0.31, 0.02, 6, 14), lam(T, 0xc8314a)); m.rotation.x = Math.PI / 2; m.position.set(0, 0.2, 0.08); return m; },
    bell: (T) => { const g = new T.Group(); const r = new T.Mesh(new T.TorusGeometry(0.3, 0.015, 6, 14), lam(T, 0x8b5e34)); r.rotation.x = Math.PI / 2; r.position.set(0, 0.2, 0.08); g.add(r); const b = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), lam(T, 0xf2b134)); b.position.set(0, 0.14, 0.4); g.add(b); return g; },
    cape: (T) => { const m = new T.Mesh(new T.PlaneGeometry(0.6, 0.62), lam(T, 0x8a5a9c, { side: T.DoubleSide })); m.position.set(0, 0.05, -0.42); m.rotation.x = 0.25; return m; },
  };
  function apply(THREE, chick, c) {
    if (!chick || !chick.userData || !chick.userData.body) return { held: null, wear: [] };
    const body = chick.userData.body, keep = (body.userData.wear = body.userData.wear || {});
    const want = {}; if (c.held && can(c, c.held) && BUILD[c.held]) want['held:' + c.held] = c.held; for (const id of c.wear || []) if (can(c, id) && BUILD[id]) want['wear:' + id] = id;
    for (const key in keep) if (!want[key]) { body.remove(keep[key]); delete keep[key]; }
    for (const key in want) if (!keep[key]) { const m = BUILD[want[key]](THREE); m.name = 'wear:' + want[key]; if (key.startsWith('held:')) { m.position.set(0.3, 0.1, 0.38); m.rotation.z = -0.5; } m.traverse((o) => { if (o.isMesh) o.castShadow = true; }); body.add(m); keep[key] = m; }
    return { held: Object.keys(keep).filter((k) => k.startsWith('held:')).map((k) => k.slice(5))[0] || null, wear: Object.keys(keep).filter((k) => k.startsWith('wear:')).map((k) => k.slice(5)) };
  }
  return { HELD, WEAR, SLOT, can, apply };
})();
