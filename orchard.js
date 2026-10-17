/* ════════════════════════════════════════════════════════════════════════════════════════════════════
   WFR_ORCHARD - BOARD 637 V2a, OUR FRUITS (Wings for Rouge).

   Marth, row 637 (Oct 15 ~04:4x): Itachi names the fruits ("RIGHT up my alley"); ~13:45: "stop being a wimp. i want
   these big orders to start getting done". Spec: BRIEF_621_WATCHING_2026-10-15.md §3 (V2) and §4 (the names, places
   and card lines), with Itachi's assay correction (ASSAY_2026-10-15/01-itachi-orders.md §3E): V2a is the SIX STAT
   FRUITS ONLY, each in ONE named place, ripening once a day, drawn (never emoji). Growth, Mood and the Rare fruit
   (Fledge Fig, Snugberry, Comet Pear) are V2b: not here.

   What this file owns: the six fruits' table, ONE texture atlas (drawn once on a canvas), one shared SpriteMaterial
   (the same parameters as the game's emojiSprite, so the same shader program: no compile at a pick), six small
   quad geometries that each read their own cell of the atlas, the placement probe (the game's own H / groundAt /
   trees / cave / dunes / builds, never a hand-typed coordinate), the card icons, the sway and the first-find word.
   What the game owns (tools/wiring/wire-637-fruits.js): the fruitTrees loop that shows and picks them, Feed (which
   reads type.gives), the save key S.orchard, and the cold cure (which still counts ONLY apples and blueberries).

   Ripening: an entry's when() is  S.orchard[id] !== S.dawns  (S.dawns, the saved dawn count; never dayCount).
   Picking writes S.orchard[id] = S.dawns, so a fruit is gone until the next dawn and survives a reload.

   ── THE API ──────────────────────────────────────────────────────────────────────────────────────────
   WFR_ORCHARD.TYPES                       the six, in atlas order (DRAFT names and lines are Itachi's; Marth rules)
   WFR_ORCHARD.places(api)                 pure: { id: { x, y, z, place, tree } } from the game's own functions
   WFR_ORCHARD.create(THREE, api)          { types, entries, sprite(type, size), icon(type), card(el), tick(t), peek() }
     api = { S, H, groundAt, WATER, trees, isFruitTree(t), PEAKS, DUNES, CAVE, HS, LIGHT, VILLAGE, buildAt(i),
             built(), CSTATS, toast(text, ms), free(), save() }
   ════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const GAIN = 8;      // DRAFT: a stat fruit's own stat (today's fruits give FRUIT_GAIN = 4 after 621; Itachi's assay §3E: "about +8")
  const SIZE = 1.15;   // DRAFT: the sprite's size in the world (the tree fruit are 1.5 high in a crown; these hang low)
  const CELL = 128, COLS = 4, ROWS = 2;   // the atlas: 512 x 256, one 128 px cell per fruit, drawn inside a 12 px margin (no bleed at a mip)
  const TYPES = [   // DRAFT (Itachi's §4 names and card lines; Marth keeps or strikes)
    { id: 'gustberry', stat: 'fly', title: 'Gustberry', name: 'gustberries', place: 'the windiest ridge tree below the peak', line: 'Pale blue berries that bob in the wind. Flight grows.', sway: 0.14 },
    { id: 'scamperpear', stat: 'run', title: 'Scamper Pear', name: 'a scamper pear', place: 'the edge of the hedgehogs\' dunes', line: 'A lean gold pear. Eat it and your feet want to go. Run grows.', sway: 0.05 },
    { id: 'boulderplum', stat: 'str', title: 'Boulder Plum', name: 'a boulder plum', place: 'the rocks by the cave mouth', line: 'Heavy as a pebble and twice as dark. Strength grows.', sway: 0.02 },
    { id: 'dawnmelon', stat: 'sta', title: 'Dawn Melon', name: 'a dawn melon', place: 'the village garden', line: 'Ripens only at first light. Slow and filling. Stamina grows.', sway: 0.02, needs: 1 },
    { id: 'tidepearl', stat: 'swim', title: 'Tidepearl', name: 'a tidepearl', place: 'the rock pools under the lighthouse', line: 'A shiny round berry the tide leaves behind. Swim grows.', sway: 0.04 },
    { id: 'chimepod', stat: 'cre', title: 'Chime Pod', name: 'a chime pod', place: 'the bell tower\'s vine, once it stands', line: 'It rattles like a little shaker when it falls. Creativity grows.', sway: 0.08, needs: 6 },
  ];
  // needs: the builds that must stand first (S.built): the garden is BUILDS[0] (1), the bell tower BUILDS[5] (6)

  /* ── the drawing: one canvas, six fruits, each in its own cell (a dark outline so it reads like a sticker at any size) ── */
  function paint(g) {
    const ball = (x, y, r, inner, outer, hl) => {
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(30,24,40,.85)'; g.stroke();
      if (hl) { g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.42, r * 0.28, r * 0.17, -0.6, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill(); }
    };
    const leaf = (x, y, len, ang, col) => {
      g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0); g.quadraticCurveTo(len * 0.5, len * 0.45, 0, 0);
      g.fillStyle = col || '#5fae4a'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(30,24,40,.85)'; g.stroke(); g.beginPath(); g.moveTo(2, 0); g.lineTo(len * 0.8, 0); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.stroke(); g.restore();
    };
    const stem = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2, x1, y1); g.lineWidth = 6; g.lineCap = 'round'; g.strokeStyle = '#3d2a1c'; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = '#7a5233'; g.stroke(); };
    const cell = (i, fn) => { g.save(); g.translate((i % COLS) * CELL, Math.floor(i / COLS) * CELL); g.beginPath(); g.rect(10, 10, CELL - 20, CELL - 20); g.clip(); fn(); g.restore(); };
    // 0 Gustberry: three pale blue berries on a twig, two wind strokes
    cell(0, () => { stem(64, 20, 62, 46); leaf(64, 30, 30, -0.5, '#6cbf8a');
      g.lineCap = 'round'; g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.9)'; for (const [y, w] of [[50, 22], [62, 14]]) { g.beginPath(); g.moveTo(16, y); g.quadraticCurveTo(16 + w * 0.6, y - 6, 16 + w, y); g.stroke(); }
      ball(48, 76, 21, '#e6f6ff', '#5aa6d8', true); ball(80, 72, 19, '#e8f7ff', '#4f98cf', true); ball(64, 98, 18, '#dff2ff', '#5d9fd2', true); });
    // 1 Scamper Pear: a lean gold pear, a quick motion tick
    cell(1, () => { g.beginPath(); g.moveTo(64, 26); g.bezierCurveTo(78, 26, 76, 52, 86, 70); g.bezierCurveTo(98, 92, 86, 112, 64, 112); g.bezierCurveTo(42, 112, 30, 92, 42, 70); g.bezierCurveTo(52, 52, 50, 26, 64, 26); g.closePath();
      const gr = g.createLinearGradient(40, 30, 90, 110); gr.addColorStop(0, '#fff2a8'); gr.addColorStop(0.45, '#f2c232'); gr.addColorStop(1, '#c8861a'); g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(30,24,40,.85)'; g.stroke();
      g.beginPath(); g.ellipse(54, 80, 6, 14, 0.2, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.6)'; g.fill();
      stem(64, 28, 70, 14); leaf(70, 20, 26, -0.3, '#7cc35a');
      g.lineCap = 'round'; g.lineWidth = 4; g.strokeStyle = 'rgba(200,134,26,.7)'; for (const y of [72, 88]) { g.beginPath(); g.moveTo(98, y); g.lineTo(112, y); g.stroke(); } });
    // 2 Boulder Plum: heavy and dark, a dusty bloom, a pebble at its foot
    cell(2, () => { g.beginPath(); g.ellipse(96, 104, 12, 7, 0, 0, Math.PI * 2); g.fillStyle = '#8f8a80'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(30,24,40,.8)'; g.stroke();
      ball(62, 72, 36, '#8a4a9c', '#2a0f36', false);
      g.beginPath(); g.moveTo(62, 40); g.quadraticCurveTo(52, 72, 62, 106); g.lineWidth = 3; g.strokeStyle = 'rgba(20,6,30,.55)'; g.stroke();
      g.beginPath(); g.ellipse(48, 58, 10, 6, -0.6, 0, Math.PI * 2); g.fillStyle = 'rgba(210,190,230,.45)'; g.fill();
      stem(62, 38, 66, 20); leaf(66, 26, 28, -0.2, '#4f9a44'); });
    // 3 Dawn Melon: round and striped, blushed with first light
    cell(3, () => { ball(64, 70, 40, '#c8ec8a', '#4f8f2e', false);
      g.save(); g.beginPath(); g.arc(64, 70, 38, 0, Math.PI * 2); g.clip(); g.lineWidth = 5; g.strokeStyle = 'rgba(46,96,30,.7)';
      for (const k of [-24, -8, 8, 24]) { g.beginPath(); g.moveTo(64 + k, 30); g.quadraticCurveTo(64 + k * 1.6, 70, 64 + k, 110); g.stroke(); }
      const dawn = g.createRadialGradient(92, 46, 2, 92, 46, 40); dawn.addColorStop(0, 'rgba(255,176,96,.85)'); dawn.addColorStop(1, 'rgba(255,176,96,0)'); g.fillStyle = dawn; g.fillRect(24, 26, 90, 90); g.restore();
      g.beginPath(); g.arc(64, 70, 40, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = 'rgba(30,24,40,.85)'; g.stroke();
      stem(64, 32, 58, 18); leaf(58, 22, 26, -2.6, '#6cb84a'); });
    // 4 Tidepearl: a shiny round berry, pearl to sea-teal, a star of light
    cell(4, () => { g.beginPath(); g.ellipse(64, 108, 30, 6, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(63,191,176,.45)'; g.fill();
      ball(64, 66, 34, '#ffffff', '#3fbfb0', true);
      const sh = g.createLinearGradient(30, 40, 98, 100); sh.addColorStop(0, 'rgba(255,190,240,.0)'); sh.addColorStop(0.5, 'rgba(255,190,240,.35)'); sh.addColorStop(1, 'rgba(150,220,255,.0)');
      g.beginPath(); g.arc(64, 66, 32, 0, Math.PI * 2); g.fillStyle = sh; g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? 3 : 10; g.lineTo(88 + Math.cos(a) * r, 42 + Math.sin(a) * r); } g.closePath(); g.fill(); });
    // 5 Chime Pod: a curved pod with its seeds showing, a little shaker's ring lines
    cell(5, () => { stem(64, 16, 60, 34); leaf(64, 24, 26, 0.4, '#5fae4a');
      g.beginPath(); g.moveTo(60, 32); g.bezierCurveTo(92, 40, 96, 84, 70, 112); g.bezierCurveTo(44, 96, 36, 52, 60, 32); g.closePath();
      const gr = g.createLinearGradient(40, 40, 96, 110); gr.addColorStop(0, '#ffd1dc'); gr.addColorStop(0.5, '#ff8fa3'); gr.addColorStop(1, '#c8506e'); g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(30,24,40,.85)'; g.stroke();
      g.fillStyle = '#fff3c4'; for (const [x, y] of [[64, 54], [68, 70], [66, 86], [62, 100]]) { g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill(); }
      g.lineCap = 'round'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(200,80,110,.75)'; for (const r of [10, 18]) { g.beginPath(); g.arc(92, 96, r, -0.9, 0.5); g.stroke(); } });
  }
  let ATLAS = null;   // { cv, url }: built ONCE per page
  function atlas() {
    if (ATLAS) return ATLAS;
    const cv = document.createElement('canvas'); cv.width = CELL * COLS; cv.height = CELL * ROWS; paint(cv.getContext('2d'));
    let url = ''; try { url = cv.toDataURL('image/png'); } catch (e) { url = ''; }
    return (ATLAS = { cv, url });
  }

  /* ── the placement probe: the game's own height, ground and landmarks; every spot is checked walkable ── */
  function places(api) {
    const { H, groundAt, WATER } = api;
    const bare = (x, z) => { const h = H(x, z); return h >= WATER + 0.35 && Math.abs(groundAt(x, z) - h) < 0.05; };   // dry land, nothing built or grown on it
    const walkIn = (x, z) => {   // some straight line of 12 m leads in on foot (the walk's own rule is a 1.2 m step; this asks 0.8 per 0.4 m)
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; let prev = groundAt(x, z), clear = true;
        for (let s = 0.4; s <= 12 + 1e-9 && clear; s += 0.4) { const px = x + Math.sin(a) * s, pz = z + Math.cos(a) * s, gd = groundAt(px, pz); if (Math.abs(gd - prev) > 0.8 || H(px, pz) < WATER + 0.3) clear = false; prev = gd; }
        if (clear) return true; }
      return false;
    };
    const first = (cands, lift) => { for (const c of cands) if (bare(c.x, c.z) && walkIn(c.x, c.z)) return { x: c.x, y: (c.y != null ? c.y : groundAt(c.x, c.z)) + lift, z: c.z, tree: c.tree || null }; return null; };
    const around = (cx, cz, r, a0, n) => { const out = []; for (let k = 0; k < n; k++) { const j = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2), a = a0 + j * (Math.PI * 2 / n); out.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r }); } return out; };   // a0 first, then either side of it
    const out = {};
    { // Gustberry: the windiest ridge trees below the peak = the trees standing highest on the mountain (trees grow up to 24 m)
      const near = api.trees.filter((t) => !t.hidden && !api.isFruitTree(t) && Math.hypot(t.x - api.PEAKS.x, t.z - api.PEAKS.z) < 140 && !(api.DUNES && api.DUNES.inside && api.DUNES.inside(t.x, t.z)))
        .sort((a, b) => H(b.x, b.z) - H(a.x, a.z)).slice(0, 12);
      const cands = [];
      for (const t of near) { const hb = H(t.x, t.z), side = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => ({ x: t.x + dx * (t.r + 0.9), z: t.z + dz * (t.r + 0.9), tree: t, y: hb }));   // just outside the trunk's square (a tree top is ground only inside it)
        for (const c of side.filter((c) => Math.abs(H(c.x, c.z) - hb) < 1.0).sort((p, q) => Math.abs(H(p.x, p.z) - hb) - Math.abs(H(q.x, q.z) - hb))) cands.push(c); }   // the side as high as the trunk's foot: a low branch she can reach on foot
      const p = first(cands, 1.4); if (p) out.gustberry = p;
    }
    if (api.DUNES) { // Scamper Pear: the dunes' rim, on the side that faces the island's heart
      const D = api.DUNES, a0 = Math.atan2(-D.at.z, -D.at.x);
      const p = first(around(D.at.x, D.at.z, D.r - 3, a0, 24), 0.7); if (p) out.scamperpear = p;
    }
    if (api.CAVE) { // Boulder Plum: beside the portal's foot, just past the ledge (the cave's own frame: +z is out of the mouth)
      const C = api.CAVE, c = Math.cos(C.rot), s = Math.sin(C.rot), HS = api.HS || 1.6, zF = C.d / 2;
      const toW = (lx, lz) => ({ x: C.x + (lx * c + lz * s) * HS, z: C.z + (-lx * s + lz * c) * HS });   // the game's toWorld
      const cands = []; for (const lz of [zF + 0.9, zF + 1.6, zF + 2.4]) for (const lx of [2.4, -2.4, 3.0, -3.0]) cands.push(toW(lx, lz));
      const p = first(cands, 0.55); if (p) out.boulderplum = p;
    }
    { // Dawn Melon: on the ground at the flower garden's rim (BUILDS[0], where construct() puts it), the village side first
      const G = api.buildAt(0), a0 = Math.atan2(api.VILLAGE.z - G.z, api.VILLAGE.x - G.x);
      const p = first(around(G.x, G.z, 4.3, a0, 12), 0.45); if (p) out.dawnmelon = p;
    }
    { // Tidepearl: the rock pools under the lighthouse = the nearest dry stone just above the sea, outside the tower's foot
      const L = api.LIGHT, cands = [];
      for (let r = 4; r <= 40; r += 1) for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2, x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r, h = H(x, z); if (h >= WATER + 0.35 && h <= WATER + 1.6) cands.push({ x, z }); }
      let p = first(cands, 0.5);
      if (!p) { const any = []; for (let r = 4; r <= 40; r += 1) for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2; any.push({ x: L.x + Math.cos(a) * r, z: L.z + Math.sin(a) * r }); } p = first(any, 0.5); }   // no pool-high stone: the nearest dry ground
      if (p) out.tidepearl = p;
    }
    { // Chime Pod: on the bell tower's face toward the village (BUILDS[5]; the tower is 3 m square, its face 1.5 m out), vine-high
      const T = api.buildAt(5), dx = api.VILLAGE.x - T.x, dz = api.VILLAGE.z - T.z, d = Math.hypot(dx, dz) || 1, x = T.x + dx / d * 2.1, z = T.z + dz / d * 2.1;
      if (bare(x, z) && walkIn(x, z)) out.chimepod = { x, y: H(T.x, T.z) + 2.2, z, tree: null };
      else { const p = first(around(T.x, T.z, 2.1, Math.atan2(dz, dx), 12), 2.2); if (p) out.chimepod = p; }
    }
    for (const ty of TYPES) if (out[ty.id]) out[ty.id].place = ty.place;
    return out;
  }

  /* ── the game side ── */
  function create(THREE, api) {
    const S = api.S, A = atlas();
    const tex = new THREE.CanvasTexture(A.cv);   // ONE texture for all six (and every sprite in her beak)
    const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false });   // the emojiSprite's parameters: the same program
    const pos = new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3);
    const geo = TYPES.map((ty, i) => {   // a quad per fruit that reads its own cell (flipY: v 1 is the canvas's top)
      const u0 = (i % COLS) / COLS, u1 = u0 + 1 / COLS, v1 = 1 - Math.floor(i / COLS) / ROWS, v0 = v1 - 1 / ROWS, g = new THREE.BufferGeometry();
      g.setIndex([0, 1, 2, 0, 2, 3]); g.setAttribute('position', pos); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([u0, v0, u1, v0, u1, v1, u0, v1]), 2)); return g;
    });
    const types = TYPES.map((ty, i) => ({ id: ty.id, emoji: '', drawn: true, cell: i, stat: ty.stat, name: ty.name, title: ty.title, line: ty.line, place: ty.place, gives: { [ty.stat]: GAIN } }));
    const byId = {}; types.forEach((t) => { byId[t.id] = t; });
    const sprite = (type, size) => { const s = new THREE.Sprite(mat); s.geometry = geo[type.cell]; s.scale.set(size, size, 1); s.name = 'fruit637:' + type.id; return s; };
    if (A.url && typeof document !== 'undefined' && !document.getElementById('fi637css')) {   // the card's icons read the same drawing (one image, six positions)
      const st = document.createElement('style'); st.id = 'fi637css'; st.textContent = '.fi637{background-image:url(' + A.url + ')}'; document.head.appendChild(st);
    }
    const icon = (type) => { const el = document.createElement('i'); el.className = 'fi637'; el.dataset.f = type.id; el.setAttribute('role', 'img'); el.setAttribute('aria-label', type.title);
      el.style.backgroundPosition = ((type.cell % COLS) / (COLS - 1) * 100) + '% ' + (Math.floor(type.cell / COLS) / (ROWS - 1) * 100) + '%'; return el; };
    const P = places(api), queue = [], entries = [];
    const orchard = () => (S.orchard = S.orchard || {});
    const seen = () => (S.seen = S.seen || {});
    TYPES.forEach((ty, i) => {
      const at = P[ty.id]; if (!at) return;   // no place found (no dunes, no cave): that fruit waits; peek() says so
      const type = types[i], s = sprite(type, SIZE); s.position.set(at.x, at.y, at.z);
      const e = { t: at.tree, type, s, back: 0, src: 'orchard', base: at.y, phase: i * 1.7, sway: ty.sway, place: ty.place,
        when: () => (!ty.needs || api.built() >= ty.needs) && orchard()[ty.id] !== (S.dawns || 0),   // ripe once a day; the garden and the tower must stand
        pick: () => { orchard()[ty.id] = S.dawns || 0; if (!seen()['f637:' + ty.id] && !queue.includes(type)) queue.push(type); } };   // the game saves right after
      entries.push(e);
    });
    function card(el) {   // each fruit's icon beside the stat it grows (the label cell keeps its text: 619's lookup reads textContent)
      if (!el) return;
      for (const t of types) { const c = (api.CSTATS || []).find((x) => x[0] === t.stat); if (!c) continue; const cell = [...el.children].find((x) => x.textContent === c[1]); if (cell && !cell.querySelector('[data-f="' + t.id + '"]')) cell.appendChild(icon(t)); }
    }
    let swayT = 0;
    function tick(t) {
      if (Math.abs(t - swayT) > 1 / 40) { swayT = t; for (const e of entries) if (e.s.visible) e.s.position.y = e.base + Math.sin(t * 1.6 + e.phase) * e.sway; }   // the wind (DRAFT amounts)
      if (queue.length && api.free()) { const ty = queue.shift(); seen()['f637:' + ty.id] = true; api.save(); api.toast(ty.title + '! ' + ty.line, 4600); }   // DRAFT: the first find's word, when the slot is free (one toast slot)
    }
    const peek = () => ({ gain: GAIN, dawns: S.dawns || 0, orchard: Object.assign({}, S.orchard || {}), queue: queue.map((t) => t.id), beak: S.fruit ? S.fruit.type.id : null,
      seen: types.filter((t) => (S.seen || {})['f637:' + t.id]).map((t) => t.id), missing: TYPES.filter((ty) => !P[ty.id]).map((ty) => ty.id),
      fruits: entries.map((e) => ({ id: e.type.id, stat: e.type.stat, place: e.place, at: e.s.position.toArray().map((v) => +v.toFixed(2)), base: +e.base.toFixed(2), visible: e.s.visible, ripe: e.when(), back: e.back, tree: e.t ? [+e.t.x.toFixed(2), +e.t.z.toFixed(2)] : null })),
      atlas: { w: A.cv.width, h: A.cv.height, url: A.url.length } });
    return { types, byId, entries, sprite, icon, card, tick, peek, places: P };
  }

  const WFR_ORCHARD = { TYPES, GAIN, SIZE, places, create };
  root.WFR_ORCHARD = WFR_ORCHARD;
  if (typeof module !== 'undefined' && module.exports) module.exports = WFR_ORCHARD;
}(typeof window !== 'undefined' ? window : globalThis));
