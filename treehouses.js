/* ═══════════════════════════════════════════════════════════════════════════
   WFR_TREEHOUSES — the villagers' little tree houses (Oct 9 2026).

   Marth: "we're gonna make the under 10 bird have to go inside one of the
   villagers little tree houses (every villager will have a slightly differently
   designed variant of the same tree house - wood . we will later make this the
   level 4 tree house but made out of twigs and stone."

   ONE design — a round plank cabin on a deck in the fork of a sturdy tree, a
   round-topped bird-sized door with a perch, a window, a little roof, a ladder
   or branch-steps — in SIX variants, one per villager (Ada, Bo, Cyril, Dina,
   Eli, Faye): roof (tiles · thatch · witch's hat · mushroom · octagon shingle ·
   pagoda), window shape, door colour, balcony rail, lantern, flag, wind chime.
   And a seventh: the same house of woven twigs and stone (style 'twigstone'),
   the LEVEL 4 nest, built to sit on the big tree's trunk top.

   API
     WFR_TREEHOUSES.build(THREE, i, opts) → { g, door, inside, platformTop, entry }
       i      villager 0–5 (wraps)
       opts   { renderer,          for WFR_TEX textures + colour space (sRGB output → colours linearised)
                style: 'wood' | 'twigstone',
                tree:  true/false  (default: true for wood, FALSE for twigstone — it sits on the big tree) }
       g            THREE.Group, origin = the tree's foot on the ground (or, tree:false, the platform's
                    underside). Door faces local +z. Unscaled game units: place it, don't scale it.
       door         the door's hinge pivot (THREE.Group): rotation.y 0 = shut, ~1.4 = open (swings inward)
       inside       THREE.Vector3, local: where the bird stands inside the room (on the floor)
       platformTop  number, local y of the deck / room floor
       entry        THREE.Vector3, local: on the deck in front of the door (where she lands)
     g.userData:
       setLit(k)    0..1 — window, lantern and the little lamp glow (emissive only; no lights added)
       update(t)    seconds — crown sway, lantern swing, flag flutter, chime (cheap; optional)
       step(x0, z0, x1, z1, inRoom, doorOpen) → { x, z, inRoom, through: 'in'|'out'|null, blocked, edge, shut }
                    local-space walking rule for the deck and the room (see the bottom of this file)
       dims         { PT, platR, cabR, doorW, doorH, wallH }
       variant      { name, roof, ... }
       stats        { meshes, triangles }
     WFR_TREEHOUSES.VARIANTS, WFR_TREEHOUSES.names, WFR_TREEHOUSES.dims (wood, with tree)

   Phone-light: ≤ 30 meshes, ≤ 6k triangles each; every geometry is built once and shared by
   all seven; materials are shared where the colour is shared.
   ═══════════════════════════════════════════════════════════════════════════ */
window.WFR_TREEHOUSES = (function () {
  'use strict';

  /* ── the one design's measurements (game units; the bird is ~0.6–0.8 tall) ── */
  const D = {
    PT: 4.6,        // deck top above the tree's foot
    platR: 3.1,     // deck radius
    platH: 0.32,    // deck thickness
    cabR: 1.95,     // cabin wall radius
    wallH: 2.5,     // wall height
    doorW: 1.34,    // door width (≥ 1.2)
    doorH: 1.87,    // door height at the arch top (≥ 1.6)
    gapTop: 1.9,    // the wall's door gap height
    eave: 2.5,      // roof base above the floor
  };
  const GAP = Math.asin(0.72 / D.cabR);             // half-angle of the door gap in the wall
  const HINGE_Z = 1.8;                              // the door leaf sits in the frame's opening
  const NAMES = ['Ada', 'Bo', 'Cyril', 'Dina', 'Eli', 'Faye'];

  /* six villagers, one house: what differs */
  const VARIANTS = [
    { name: 'Ada',   roof: 'cone',    roofCol: 0xc8413a, wall: 0xf0d2a4, door: 0x3f7d4a, trim: 0x6b4428, win: 'round',  win2: false, climb: 'ladder', rail: false, lantern: true,  flag: 0xf2c230, chime: false, leaf: 0 },
    { name: 'Bo',    roof: 'thatch',  roofCol: 0xd9b45a, wall: 0xe2bd8c, door: 0x2f5f8f, trim: 0x5a3a22, win: 'square', win2: true,  climb: 'steps',  rail: true,  lantern: false, flag: 0,        chime: true,  leaf: 1 },
    { name: 'Cyril', roof: 'witch',   roofCol: 0x3f5f9c, wall: 0xf3dcb8, door: 0xb83a3a, trim: 0x4a3426, win: 'hex',    win2: false, climb: 'ladder', rail: false, lantern: true,  flag: 0x7ec8f0, chime: false, leaf: 2 },
    { name: 'Dina',  roof: 'dome',    roofCol: 0xd23a3a, wall: 0xf6e6c8, door: 0xe0a030, trim: 0x7a5232, win: 'round',  win2: true,  climb: 'steps',  rail: false, lantern: false, flag: 0,        chime: true,  leaf: 0 },
    { name: 'Eli',   roof: 'shingle', roofCol: 0x4f8a4a, wall: 0xd9b089, door: 0x8a4fa0, trim: 0x553824, win: 'cross',  win2: false, climb: 'ladder', rail: true,  lantern: true,  flag: 0,        chime: false, leaf: 1 },
    { name: 'Faye',  roof: 'pagoda',  roofCol: 0x9c4a6a, wall: 0xf0d8b0, door: 0x2f8f86, trim: 0x5e3b26, win: 'roundx', win2: false, climb: 'steps',  rail: true,  lantern: false, flag: 0xff8fb8, chime: true,  leaf: 2 },
  ];
  const TWIG = { name: 'Rouge', roof: 'twigs', roofCol: 0x8a6a48, wall: 0xa07a52, door: 0x7a5232, trim: 0x9a948a, win: 'round', win2: true, climb: 'rope', rail: false, lantern: true, flag: 0, chime: true, leaf: 0 };
  const LEAVES = [0x56994a, 0x4f9142, 0x68a84a];

  let T = null, LIN = false;
  const GEO = {}, MAT = {};
  const once = (k, f) => GEO[k] || (GEO[k] = f());

  /* ═════════ geometry helpers ═════════ */
  const _o = () => new T.Object3D();
  function M(px, py, pz, rx, ry, rz, sx, sy, sz) {
    const o = _o(); o.position.set(px || 0, py || 0, pz || 0); o.rotation.set(rx || 0, ry || 0, rz || 0);
    o.scale.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz); o.updateMatrix(); return o.matrix;
  }
  /* a rod from A to B (radius r0 at A, r1 at B) */
  function rod(A, B, r0, r1, seg) {
    const a = new T.Vector3().fromArray(A), b = new T.Vector3().fromArray(B), d = b.clone().sub(a), len = d.length();
    const g = new T.CylinderGeometry(r1, r0, len, seg || 6, 1); g.translate(0, len / 2, 0);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return { g, m: new T.Matrix4().compose(a, q, new T.Vector3(1, 1, 1)) };
  }
  /* merge parts [{ g, m?, col?: [r,g,b] | fn(x,y,z) → [r,g,b], uv?: [su, sv] }] into one non-indexed geometry */
  function merge(parts) {
    const P = [], N = [], U = [], C = [];
    const anyC = parts.some((p) => p.col);
    for (const p of parts) {
      const g = p.g.index ? p.g.toNonIndexed() : p.g.clone();
      if (p.m) g.applyMatrix4(p.m);
      if (!g.attributes.normal) g.computeVertexNormals();
      const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
      const su = p.uv ? p.uv[0] : 1, sv = p.uv ? p.uv[1] : 1;
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
        P.push(x, y, z); N.push(na.getX(i), na.getY(i), na.getZ(i));
        U.push(ua ? ua.getX(i) * su : 0, ua ? ua.getY(i) * sv : 0);
        if (anyC) { const c = typeof p.col === 'function' ? p.col(x, y, z) : (p.col || [1, 1, 1]); C.push(c[0], c[1], c[2]); }
      }
      g.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    out.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
    out.setAttribute('uv', new T.Float32BufferAttribute(U, 2));
    if (anyC) out.setAttribute('color', new T.Float32BufferAttribute(C, 3));
    out.computeBoundingSphere();
    return out;
  }
  /* smooth position noise: the same point always moves the same way (no cracks in non-indexed meshes) */
  const nz = (x, y, z, k) => Math.sin(x * 1.7 + y * 2.3 + k) * Math.cos(z * 1.9 - y * 1.1 + k * 0.7) + 0.5 * Math.sin(x * 3.9 - z * 3.1 + y * 2.7 + k * 1.3);
  function lumpy(g, amt, k) {
    const P = g.attributes.position, v = new T.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); const x = +v.x.toFixed(3), y = +v.y.toFixed(3), z = +v.z.toFixed(3);
      const s = 1 + amt * nz(x, y, z, k); P.setXYZ(i, x * s, y * s, z * s);
    }
    g.computeVertexNormals(); return g;
  }
  /* a round-topped arch shape (door / frame / hole), bottom at y 0, centred on x 0 */
  function archPath(p, w, h, cw) {
    const r = w / 2, hr = h - r;
    if (cw) { p.moveTo(-r, 0); p.lineTo(-r, hr); p.absarc(0, hr, r, Math.PI, 0, true); p.lineTo(r, 0); p.lineTo(-r, 0); }
    else { p.moveTo(-r, 0); p.lineTo(r, 0); p.lineTo(r, hr); p.absarc(0, hr, r, 0, Math.PI, false); p.lineTo(-r, 0); }
    return p;
  }
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ═════════ the shared geometries ═════════ */
  const G = {
    /* the tree: a trunk to the deck, three limbs forking up round the cabin, roots */
    wood: (PT) => once('wood' + PT, () => {
      const parts = [], up = (a, r, y) => [Math.sin(a) * r, y, Math.cos(a) * r];
      const th = PT - D.platH * 0.5, tr = new T.CylinderGeometry(0.55, 0.82, th, 10, 3); tr.translate(0, th / 2, 0); parts.push({ g: tr, uv: [2, 2] });   // ends inside the deck: never pokes through the floor
      for (const a of [-1.15, 2.3, 3.9]) {
        const A = up(a, 0.25, PT - 1.6), B = up(a, 2.72, PT + 0.15), C = up(a, 2.9, PT + 3.0), E = up(a, 2.05, PT + 5.1);
        for (const [p, q, r0, r1] of [[A, B, 0.36, 0.27], [B, C, 0.27, 0.21], [C, E, 0.21, 0.13]]) { const R = rod(p, q, r0, r1, 6); parts.push({ g: R.g, m: R.m, uv: [1, 1.5] }); }
        const tw = rod(C, up(a + 0.45, 3.6, PT + 4.3), 0.12, 0.05, 5); parts.push({ g: tw.g, m: tw.m });
      }
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.5, R = rod(up(a, 0.45, 0.9), up(a, 1.7, -0.25), 0.4, 0.12, 5); parts.push({ g: R.g, m: R.m }); }
      return merge(parts);
    }),
    /* the crown: a ring of lumpy clumps above the roof, an opening over it; darker beneath */
    crown: (PT) => once('crown' + PT, () => {
      const parts = [], spots = [[-1.15, 2.3, 5.4, 1.75], [2.3, 2.3, 5.6, 1.8], [3.9, 2.2, 5.3, 1.7], [0.6, 2.6, 6.0, 1.45], [-2.5, 2.5, 6.2, 1.4], [3.1, 1.2, 6.9, 1.35], [1.5, 2.9, 4.9, 1.2]];
      spots.forEach(([a, r, y, s], k) => {
        const g = lumpy(new T.IcosahedronGeometry(s, 1), 0.16, k * 3.1);
        const cx = Math.sin(a) * r, cy = PT + y, cz = Math.cos(a) * r, j = 0.92 + 0.08 * Math.sin(k * 2.7);
        parts.push({ g, m: M(cx, cy, cz, 0, k, 0, 1, 0.8, 1), col: (x, yy) => { const s2 = (0.68 + 0.42 * smooth(cy - s * 0.9, cy + s * 0.8, yy)) * j; return [s2, s2, s2 * 0.96]; } });
      });
      return merge(parts);
    }),
    deck: () => once('deck', () => merge([{ g: new T.CylinderGeometry(D.platR, D.platR * 0.96, D.platH, 18), m: M(0, -D.platH / 2, 0), uv: [1, 1] }])),
    /* braces under the deck, from the trunk out to the rim */
    braces: (PT) => once('braces' + PT, () => {
      const parts = [];
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.78, R = rod([Math.sin(a) * 0.5, PT - 1.7, Math.cos(a) * 0.5], [Math.sin(a) * 2.6, PT - D.platH, Math.cos(a) * 2.6], 0.13, 0.11, 5); parts.push({ g: R.g, m: R.m }); }
      const rim = new T.TorusGeometry(D.platR - 0.02, 0.09, 5, 30); parts.push({ g: rim, m: M(0, PT - D.platH * 0.55, 0, Math.PI / 2) });
      return merge(parts);
    }),
    /* the round wall with its door gap, and the band over the door */
    wall: (y0, h) => once('wall' + y0 + ':' + h, () => {
      const w = new T.CylinderGeometry(D.cabR, D.cabR, h, 18, 1, true, GAP, Math.PI * 2 - GAP * 2); w.translate(0, y0 + h / 2, 0);
      const parts = [{ g: w, uv: [5 * (1 - GAP / Math.PI), h / D.wallH] }];
      const top = Math.max(y0, D.gapTop), lh = y0 + h - top;
      if (lh > 0.01) { const l = new T.CylinderGeometry(D.cabR, D.cabR, lh, 3, 1, true, -GAP, GAP * 2); l.translate(0, top + lh / 2, 0); parts.push({ g: l, uv: [5 * GAP / Math.PI, lh / D.wallH] }); }
      return merge(parts);
    }),
    /* the chunky arched door frame, with the perch beside the door */
    frame: () => once('frame', () => {
      const s = archPath(new T.Shape(), 1.84, 2.32), hole = archPath(new T.Path(), D.doorW, D.doorH, true); s.holes.push(hole);
      const f = new T.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: false, curveSegments: 8 }); f.translate(0, 0, 1.72);
      const perch = rod([0.98, 0.62, 1.72], [0.98, 0.62, 2.45], 0.05, 0.045, 6), knob = new T.SphereGeometry(0.075, 6, 4);
      return merge([{ g: f, uv: [0.8, 0.8] }, { g: perch.g, m: perch.m }, { g: knob, m: M(0.98, 0.62, 2.45) }]);
    }),
    /* the door leaf: hinge at x 0, opens with the pivot's rotation.y */
    door: () => once('door', () => {
      const s = archPath(new T.Shape(), D.doorW - 0.04, D.doorH - 0.02), f = new T.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false, curveSegments: 10 });
      f.translate((D.doorW - 0.04) / 2, 0, -0.04);
      const knob = new T.SphereGeometry(0.07, 6, 4), plate = new T.TorusGeometry(0.34, 0.035, 4, 16);
      return merge([{ g: f, uv: [0.9, 0.9] }, { g: knob, m: M(D.doorW - 0.24, 0.85, 0.06) }, { g: plate, m: M(D.doorW / 2, D.doorH - 0.72, 0.045) }]);
    }),
    /* windows: glass outside AND inside the wall, a frame; shape = segments (+ mullions) */
    glass: (seg) => once('glass' + seg, () => {
      const out = new T.CircleGeometry(0.36, seg), inn = new T.CircleGeometry(0.36, seg), rz = seg === 4 ? Math.PI / 4 : seg === 6 ? Math.PI / 6 : 0;
      return merge([{ g: out, m: M(0, 0, 0.035, 0, 0, rz) }, { g: inn, m: M(0, 0, -0.035, 0, Math.PI, rz) }]);
    }),
    winFrame: (seg, cross) => once('wf' + seg + cross, () => {
      const rz = seg === 4 ? Math.PI / 4 : seg === 6 ? Math.PI / 6 : 0, parts = [{ g: new T.TorusGeometry(seg === 4 ? 0.39 : 0.37, 0.065, 4, seg), m: M(0, 0, 0.05, 0, 0, rz) }];
      if (cross) { parts.push({ g: new T.BoxGeometry(0.05, 0.66, 0.05), m: M(0, 0, 0.06) }, { g: new T.BoxGeometry(0.66, 0.05, 0.05), m: M(0, 0, 0.06) }); }
      parts.push({ g: new T.BoxGeometry(0.8, 0.07, 0.18), m: M(0, -0.42, 0.1) });   // a sill
      return merge(parts);
    }),
    /* roofs (base at y 0 = the eave) */
    roof: (kind) => once('roof' + kind, () => {
      if (kind === 'cone') { const g = new T.ConeGeometry(2.45, 2.0, 16, 2); g.translate(0, 1.0, 0); return merge([{ g, uv: [6, 2] }]); }
      if (kind === 'shingle') {
        const g = new T.ConeGeometry(2.55, 1.75, 8, 1); g.translate(0, 0.875, 0);
        const cap = new T.CylinderGeometry(0.12, 0.16, 0.5, 6); return merge([{ g, uv: [4, 1.6] }, { g: cap, m: M(0, 1.85, 0) }]);
      }
      if (kind === 'witch') {
        const g = new T.ConeGeometry(2.3, 3.1, 14, 6), P = g.attributes.position;
        for (let i = 0; i < P.count; i++) { const y = P.getY(i) + 1.55, t = y / 3.1; P.setX(i, P.getX(i) - 0.85 * t * t * t); P.setY(i, y - 0.25 * t * t * t); }
        g.computeVertexNormals();
        const brim = new T.CylinderGeometry(2.45, 2.55, 0.12, 16); return merge([{ g, uv: [5, 3] }, { g: brim, m: M(0, 0.02, 0), uv: [5, 0.2] }]);
      }
      if (kind === 'dome' || kind === 'twigs') {
        if (kind === 'twigs') {
          const g = lumpy(new T.ConeGeometry(2.6, 2.1, 14, 3), 0.06, 5); g.translate(0, 1.05, 0);
          const parts = [{ g, uv: [6, 2] }];
          for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2 + 0.2, R = rod([Math.sin(a) * 0.4, 1.95, Math.cos(a) * 0.4], [Math.sin(a + 0.25) * 2.85, -0.15, Math.cos(a + 0.25) * 2.85], 0.05, 0.04, 4); parts.push({ g: R.g, m: R.m }); }
          for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, R = rod([0, 1.9, 0], [Math.sin(a) * 0.5, 2.6 + (k % 2) * 0.3, Math.cos(a) * 0.5], 0.05, 0.02, 4); parts.push({ g: R.g, m: R.m }); }
          return merge(parts);
        }
        const A = 2.55, B = A * 0.72, g = new T.SphereGeometry(A, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.72, 1);
        const parts = [{ g, col: [0.82, 0.23, 0.23] }, { g: new T.CircleGeometry(A, 16), m: M(0, 0.01, 0, Math.PI / 2), col: [0.95, 0.88, 0.75] }];
        /* white spots: flattened discs sitting on the cap, each turned to the surface normal */
        for (let k = 0; k < 8; k++) {
          const el = k ? 0.35 + 0.28 * (k % 3) : 1.45, az = k * 2.4, d = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
          const p = new T.Vector3(A * d[0], B * d[1], A * d[2]), n = new T.Vector3(p.x / (A * A), p.y / (B * B), p.z / (A * A)).normalize();
          const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), n), s0 = k ? 0.32 + 0.1 * (k % 2) : 0.5;
          parts.push({ g: new T.SphereGeometry(s0, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2), m: new T.Matrix4().compose(p.addScaledVector(n, -0.04), q, new T.Vector3(1, 0.22, 1)), col: [1, 0.97, 0.92] });
        }
        return merge(parts);
      }
      if (kind === 'thatch') {
        const a = lumpy(new T.ConeGeometry(2.7, 1.5, 16, 2, true), 0.05, 2); a.translate(0, 0.65, 0);
        const b = lumpy(new T.ConeGeometry(1.75, 1.35, 14, 2), 0.05, 7); b.translate(0, 1.75, 0);
        const ceil = new T.CircleGeometry(2.2, 14);
        const straw = (k) => (x, y, z) => { const v = (0.86 + 0.14 * Math.sin(Math.atan2(x, z) * 22 + y * 3)) * k * (0.82 + 0.18 * smooth(-0.1, 0.6, y - (k < 1 ? 0 : 1.1))); return [v, v * 0.97, v * 0.9]; };   // bundles and a shaded lip
        return merge([{ g: a, col: straw(0.95) }, { g: b, col: straw(1.05) }, { g: ceil, m: M(0, 0.05, 0, Math.PI / 2), col: [0.8, 0.75, 0.62] }]);
      }
      /* pagoda: two flared tiers */
      const a = new T.CylinderGeometry(1.45, 2.65, 0.85, 12, 1), b = new T.ConeGeometry(1.75, 1.5, 12), c = new T.SphereGeometry(0.2, 6, 4);
      return merge([{ g: a, m: M(0, 0.42, 0), uv: [5, 0.6] }, { g: b, m: M(0, 0.85 + 0.75, 0), uv: [4, 1.2] }, { g: c, m: M(0, 2.45, 0) }]);
    }),
    /* climbing: a ladder down the side, branch-steps up the trunk, or a rope ladder (no tree) */
    ladder: (PT) => once('ladder' + PT, () => {
      const parts = [], a = 1.75, ox = Math.sin(a), oz = Math.cos(a), tx = -oz, tz = ox, top = D.platR - 0.05, bot = D.platR + 0.9;
      for (const s of [-0.36, 0.36]) { const R = rod([ox * bot + tx * s, 0, oz * bot + tz * s], [ox * top + tx * s, PT + 0.5, oz * top + tz * s], 0.06, 0.06, 5); parts.push({ g: R.g, m: R.m }); }
      for (let y = 0.45; y < PT; y += 0.5) { const r = bot + (top - bot) * (y / (PT + 0.5)); const R = rod([ox * r - tx * 0.38, y, oz * r - tz * 0.38], [ox * r + tx * 0.38, y, oz * r + tz * 0.38], 0.045, 0.045, 5); parts.push({ g: R.g, m: R.m }); }
      return merge(parts);
    }),
    steps: (PT) => once('steps' + PT, () => {
      const parts = [];
      for (let k = 0; k < 9; k++) { const a = 1.75 - k * 0.8, y = PT - 0.55 - k * 0.48, r0 = 0.6 + k * 0.025, R = rod([Math.sin(a) * 0.3, y, Math.cos(a) * 0.3], [Math.sin(a) * (r0 + 0.75), y + 0.04, Math.cos(a) * (r0 + 0.75)], 0.12, 0.09, 5); parts.push({ g: R.g, m: R.m }); }
      return merge(parts);
    }),
    rope: (L) => once('rope' + L, () => {
      const parts = [], a = 1.75, ox = Math.sin(a), oz = Math.cos(a), tx = -oz, tz = ox, r = D.platR + 0.05;
      for (const s of [-0.3, 0.3]) { const R = rod([ox * r + tx * s, -L, oz * r + tz * s], [ox * r + tx * s, 0.1, oz * r + tz * s], 0.03, 0.03, 4); parts.push({ g: R.g, m: R.m }); }
      for (let y = -L + 0.3; y < 0; y += 0.45) parts.push({ g: new T.BoxGeometry(0.7, 0.06, 0.12), m: M(ox * r, y, oz * r, 0, a, 0) });
      return merge(parts);
    }),
    /* a balcony rail round the deck, open at the front (landing) and at the ladder */
    rail: () => once('rail', () => {
      const parts = [], r = D.platR - 0.12, h = 0.6, arcs = [[0.7, 1.45], [2.05, Math.PI * 2 - 0.7]];
      for (const [a0, a1] of arcs) {
        const n = Math.max(2, Math.round((a1 - a0) / 0.42));
        for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; parts.push({ g: new T.BoxGeometry(0.09, h, 0.09), m: M(Math.sin(a) * r, h / 2, Math.cos(a) * r, 0, a) }); }
        /* the rail: a torus arc u ∈ [0, arc] laid flat by rx −π/2 lands at θ = π/2 + u + rz, so rz = a0 − π/2 */
        const tor = new T.TorusGeometry(r, 0.05, 4, Math.max(4, n * 2), a1 - a0);
        parts.push({ g: tor, m: M(0, h, 0, -Math.PI / 2, 0, a0 - Math.PI / 2) });
      }
      return merge(parts);
    }),
    bed: () => once('bed', () => merge([
      { g: lumpy(new T.TorusGeometry(0.58, 0.22, 6, 14), 0.08, 3), m: M(0, 0.16, 0, Math.PI / 2, 0, 0, 1, 1, 0.8) },
      { g: new T.CylinderGeometry(0.6, 0.5, 0.14, 12), m: M(0, 0.08, 0) },
    ])),
    /* the little lamp: a brass saucer with a ring handle; the candle and its flame are the glowing part */
    lampBody: () => once('lampBody', () => merge([
      { g: new T.CylinderGeometry(0.2, 0.17, 0.05, 10), m: M(0, 0.025, 0) },
      { g: new T.TorusGeometry(0.07, 0.018, 4, 8), m: M(0.24, 0.05, 0, Math.PI / 2) },
    ])),
    bulb: () => once('bulb', () => merge([
      { g: new T.CylinderGeometry(0.065, 0.07, 0.26, 8), m: M(0, 0.18, 0) },
      { g: new T.SphereGeometry(0.06, 6, 5), m: M(0, 0.37, 0, 0, 0, 0, 1, 1.7, 1) },
    ])),
    /* the lantern by the door: bracket from the wall; cage on the swinging pivot */
    bracket: () => once('bracket', () => { const R = rod([1.15, 2.2, 1.58], [1.15, 2.2, 2.2], 0.035, 0.03, 5); return merge([{ g: R.g, m: R.m }, { g: new T.BoxGeometry(0.16, 0.22, 0.05), m: M(1.15, 2.2, 1.6) }]); }),
    cage: () => once('cage', () => merge([
      { g: new T.CylinderGeometry(0.012, 0.012, 0.3, 4), m: M(0, -0.15, 0) },
      { g: new T.ConeGeometry(0.17, 0.1, 6), m: M(0, -0.33, 0) },
      { g: new T.CylinderGeometry(0.15, 0.13, 0.04, 6), m: M(0, -0.63, 0) },
      ...[0, 1, 2, 3].map((k) => ({ g: new T.BoxGeometry(0.025, 0.26, 0.025), m: M(Math.sin(k * Math.PI / 2 + 0.78) * 0.12, -0.5, Math.cos(k * Math.PI / 2 + 0.78) * 0.12) })),
    ])),
    flame: () => once('flame', () => new T.CylinderGeometry(0.1, 0.1, 0.24, 6).translate(0, -0.5, 0)),
    pole: () => once('pole', () => merge([{ g: new T.CylinderGeometry(0.04, 0.05, 2.9, 5), m: M(0, 1.45, 0) }, { g: new T.SphereGeometry(0.08, 6, 4), m: M(0, 2.93, 0) }])),
    pennant: () => once('pennant', () => {
      const g = new T.BufferGeometry(), P = [], U = [];
      const pts = (u, v) => [u * 1.0, -v * 0.55 * (1 - u * 0.95), Math.sin(u * 3) * 0.08];
      for (let i = 0; i < 4; i++) { const u0 = i / 4, u1 = (i + 1) / 4; const A = pts(u0, 0), B = pts(u1, 0), C = pts(u1, 1), Dd = pts(u0, 1); P.push(...A, ...Dd, ...B, ...B, ...Dd, ...C); U.push(u0, 1, u0, 0, u1, 1, u1, 1, u0, 0, u1, 0); }
      g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.computeVertexNormals(); return g;
    }),
    chime: () => once('chime', () => {
      const parts = [{ g: new T.CylinderGeometry(0.004, 0.004, 0.25, 3), m: M(0, -0.12, 0) }, { g: new T.CylinderGeometry(0.17, 0.17, 0.03, 10), m: M(0, -0.26, 0) }];
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, L = 0.3 + (k % 3) * 0.1; parts.push({ g: new T.CylinderGeometry(0.025, 0.025, L, 5), m: M(Math.sin(a) * 0.12, -0.32 - L / 2, Math.cos(a) * 0.12) }); }
      parts.push({ g: new T.CircleGeometry(0.06, 6), m: M(0, -0.85, 0.01) });
      return merge(parts);
    }),
    /* twigstone: woven bands round the wall, stakes, a stone chimney */
    weave: () => once('weave', () => {
      const parts = [], arc = Math.PI * 2 - GAP * 2 - 0.12;
      for (const y of [1.0, 1.35, 1.7, 2.05, 2.4]) { const tor = new T.TorusGeometry(D.cabR + 0.05, 0.055, 4, 30, arc); parts.push({ g: tor, m: M(0, y, 0, -Math.PI / 2, 0, GAP + 0.06 - Math.PI / 2), uv: [8, 1] }); }
      for (let k = 0; k < 16; k++) { const a = GAP + 0.1 + k / 15 * (Math.PI * 2 - GAP * 2 - 0.2); parts.push({ g: new T.CylinderGeometry(0.05, 0.06, 2.0, 4), m: M(Math.sin(a) * (D.cabR + 0.09), 1.65, Math.cos(a) * (D.cabR + 0.09), 0, 0, 0.04 * Math.sin(k * 3)) }); }
      return merge(parts);
    }),
    chimney: () => once('chimney', () => merge([
      { g: new T.BoxGeometry(0.62, 2.6, 0.62), m: M(0, 1.3, 0), uv: [0.6, 1.5] },
      { g: new T.BoxGeometry(0.78, 0.18, 0.78), m: M(0, 2.66, 0), uv: [0.6, 0.15] },
    ])),
    stoneRim: () => once('stoneRim', () => { const g = lumpy(new T.TorusGeometry(D.platR - 0.05, 0.2, 5, 22), 0.08, 4); return merge([{ g, m: M(0, 0.05, 0, Math.PI / 2, 0, 0, 1, 1, 0.7), uv: [10, 1] }]); }),
  };

  /* ═════════ materials (shared by key) ═════════ */
  function col(hex) { const c = new T.Color(hex); if (LIN) c.convertSRGBToLinear(); return c; }
  function mat(key, hex, o, texName, rx, ry, renderer) {
    const k = key + ':' + hex + ':' + (texName || '') + rx + ':' + ry + (LIN ? 'L' : '');
    if (MAT[k]) return MAT[k];
    const m = new T.MeshStandardMaterial(Object.assign({ color: col(hex), roughness: 0.9, metalness: 0 }, o || {}));
    if (texName && window.WFR_TEX && WFR_TEX.names && WFR_TEX.names.indexOf(texName) >= 0) { try { WFR_TEX.apply({ material: m }, texName, rx, ry, renderer); } catch (e) { /* plain colour */ } }
    return (MAT[k] = m);
  }

  let built = 0;
  function build(THREE, i, opts) {
    T = THREE; opts = opts || {};
    const R = opts.renderer || null; LIN = !!(R && R.outputEncoding === T.sRGBEncoding);
    const twig = opts.style === 'twigstone', V = twig ? TWIG : VARIANTS[((i | 0) % 6 + 6) % 6];
    const withTree = opts.tree != null ? !!opts.tree : !twig;
    const PT = withTree ? D.PT : D.platH;
    const g = new T.Group(); g.name = 'treehouse:' + V.name;
    const meshes = [], add = (geo, m, parent, shadow) => { const o = new T.Mesh(geo, m); o.castShadow = shadow !== false; o.receiveShadow = true; (parent || g).add(o); meshes.push(o); return o; };

    /* materials */
    const mBark = mat('bark', 0x7a5638, null, 'bark', 1, 1, R);
    const mLeaf = mat('leaf', LEAVES[V.leaf], { vertexColors: true, flatShading: true, roughness: 0.95 }, null, 1, 1, R);
    const mDeck = twig ? mat('twigdeck', 0x9a7a55, null, 'bark', 3, 3, R) : mat('deck', 0xc89a62, null, 'planks', 2.5, 2.5, R);
    const mWall = twig ? mat('twigwall', 0xa88a62, { side: T.DoubleSide }, 'bark', 6, 2, R) : mat('wall', V.wall, { side: T.DoubleSide }, 'planks', 1, 1, R);
    const mStone = mat('stone', 0xb8b2a6, null, 'stone', 1, 1, R);
    const mTrim = twig ? mStone : mat('trim', V.trim, null, 'wood', 1, 1, R);
    const mDoor = mat('door', V.door, null, 'wood', 1, 1, R);
    const mMetal = mat('metal', 0x3a3530, { roughness: 0.6, metalness: 0.3 });
    const mStraw = mat('straw', 0xf2d27a, { flatShading: true }, null, 1, 1, R);
    const lit = {
      glass: new T.MeshStandardMaterial({ color: col(0x9fc8e0), roughness: 0.25, metalness: 0, emissive: col(0xffb24a), emissiveIntensity: 0 }),
      flame: new T.MeshStandardMaterial({ color: col(0xffe2a0), roughness: 0.5, emissive: col(0xffa53a), emissiveIntensity: 0.25 }),
    };
    let mRoof;
    if (V.roof === 'cone' || V.roof === 'shingle' || V.roof === 'witch' || V.roof === 'pagoda') mRoof = mat('roof', V.roofCol, { flatShading: V.roof === 'shingle' }, 'roofTiles', 1, 1, R);
    else if (V.roof === 'thatch') mRoof = mat('thatch', V.roofCol, { vertexColors: true, flatShading: true, roughness: 1 }, null, 1, 1, R);
    else if (V.roof === 'dome') mRoof = mat('dome', 0xffffff, { vertexColors: true, roughness: 0.85 }, null, 1, 1, R);
    else mRoof = mat('twigroof', 0x8a6a48, { flatShading: true }, 'bark', 1, 1, R);

    /* the tree */
    let crown = null;
    if (withTree) { add(G.wood(PT), mBark); crown = add(G.crown(PT), mLeaf); add(G.braces(PT), mBark); }

    /* deck */
    const deck = add(G.deck(), mDeck); deck.position.y = PT;
    if (twig) { const rim = add(G.stoneRim(), mStone); rim.position.y = PT; }

    /* the cabin */
    const cab = new T.Group(); cab.position.y = PT; g.add(cab);
    if (twig) { add(G.wall(0, 0.85), mStone, cab); add(G.wall(0.85, D.wallH - 0.85), mWall, cab); add(G.weave(), mBark, cab); }
    else add(G.wall(0, D.wallH), mWall, cab);
    add(G.frame(), mTrim, cab);
    const pivot = new T.Group(); pivot.position.set(-D.doorW / 2 + 0.02, PT, HINGE_Z); g.add(pivot);
    add(G.door(), mDoor, pivot);
    const roof = add(G.roof(V.roof), mRoof, cab); roof.position.y = D.eave;
    if (twig) { const ch = add(G.chimney(), mStone, cab); ch.position.set(-0.95, 2.4, -1.1); }

    /* windows */
    const seg = V.win === 'square' || V.win === 'cross' ? 4 : V.win === 'hex' ? 6 : 14, cross = V.win === 'cross' || V.win === 'roundx' || V.win === 'square';
    const wins = [[0.95, 1.45]].concat(V.win2 ? [[-2.0, 1.45]] : []);
    for (const [a, y] of wins) {
      const p = new T.Vector3(Math.sin(a) * D.cabR, y, Math.cos(a) * D.cabR);
      const gl = add(G.glass(seg), lit.glass, cab, false); gl.position.copy(p); gl.rotation.y = a;
      const fr = add(G.winFrame(seg, cross), mTrim, cab); fr.position.copy(p); fr.rotation.y = a;
    }

    /* inside: a nest-bed of straw at the back, a little lamp by the wall */
    const bed = add(G.bed(), mStraw, cab); bed.position.set(0.15, 0, -1.05);
    const lampAt = new T.Vector3(-1.2, 0, -0.55), lb = add(G.lampBody(), mat('brass', 0xc9a24e, { roughness: 0.45, metalness: 0.5 }), cab); lb.position.copy(lampAt);
    const bulb = add(G.bulb(), lit.flame, cab, false); bulb.position.copy(lampAt);

    /* climbing */
    if (V.climb === 'ladder' && withTree) add(G.ladder(PT), mTrim);
    else if (V.climb === 'steps' && withTree) add(G.steps(PT), mBark);
    else if (V.climb === 'rope' || !withTree) { const rp = add(G.rope(withTree ? PT - 0.2 : 3.2), twig ? mBark : mTrim); rp.position.y = PT; }
    if (V.rail) { const rl = add(G.rail(), mTrim); rl.position.y = PT; }

    /* the lantern */
    let swing = null;
    if (V.lantern) {
      add(G.bracket(), mMetal, cab);
      swing = new T.Group(); swing.position.set(1.15, 2.2, 2.2); cab.add(swing);
      add(G.cage(), mMetal, swing); add(G.flame(), lit.flame, swing, false);
    }
    /* the flag on a pole at the deck's edge */
    let flag = null;
    if (V.flag) {
      const a = -0.5, pl = add(G.pole(), mMetal); pl.position.set(Math.sin(a) * (D.platR - 0.2), PT, Math.cos(a) * (D.platR - 0.2));
      flag = new T.Group(); flag.position.set(pl.position.x, PT + 2.85, pl.position.z); flag.rotation.y = 2.4; g.add(flag);
      add(G.pennant(), mat('flag', V.flag, { side: T.DoubleSide, roughness: 1 }, null, 1, 1, R), flag);
    }
    /* the wind chime under the eave */
    let chime = null;
    if (V.chime) {
      const a = -0.55; chime = new T.Group(); chime.position.set(Math.sin(a) * 2.1, D.eave - 0.02, Math.cos(a) * 2.1); cab.add(chime);
      add(G.chime(), mat('chime', twig ? 0xd8c8a0 : 0xc9d6dc, { roughness: 0.35, metalness: 0.5 }, null, 1, 1, R), chime);
    }

    /* ── the game's handles ── */
    const inside = new T.Vector3(0, PT, 0.3), entry = new T.Vector3(0, PT, D.platR - 0.55);
    const seed = built++ * 1.7 + (i | 0);
    let tris = 0; for (const o of meshes) tris += o.geometry.attributes.position.count / 3;
    g.userData = {
      variant: V, dims: Object.assign({}, D, { PT }), inside, entry, platformTop: PT, door: pivot,
      stats: { meshes: meshes.length, triangles: Math.round(tris) },
      setLit(k) { k = Math.max(0, Math.min(1, +k || 0)); lit.glass.emissiveIntensity = 1.5 * k; lit.flame.emissiveIntensity = 0.25 + 1.75 * k; },
      update(t) {
        if (crown) { crown.rotation.z = Math.sin(t * 1.1 + seed) * 0.008; crown.rotation.x = Math.cos(t * 0.9 + seed) * 0.006; }
        if (swing) { swing.rotation.x = Math.sin(t * 1.7 + seed) * 0.12; swing.rotation.z = Math.sin(t * 1.3 + seed) * 0.06; }
        if (flag) flag.rotation.y = 2.4 + Math.sin(t * 3.1 + seed) * 0.22;
        if (chime) chime.rotation.z = Math.sin(t * 2.2 + seed) * 0.15;
      },
      /* walking on the deck and in the room, in LOCAL x/z (convert with g.worldToLocal). Returns where she ends up. */
      step(x0, z0, x1, z1, inRoom, doorOpen) {
        const r1 = Math.hypot(x1, z1), atDoor = Math.abs(x1) < D.doorW / 2 - 0.1 && z1 > 0;
        if (inRoom) {
          if (r1 < D.cabR - 0.35) return { x: x1, z: z1, inRoom: true, through: null };
          if (atDoor && z1 > z0) return doorOpen ? { x: entry.x, z: entry.z, inRoom: false, through: 'out' } : { x: x0, z: z0, inRoom: true, through: null, blocked: true, shut: true };
          return { x: x0, z: z0, inRoom: true, through: null, blocked: true };
        }
        if (r1 > D.platR - 0.15) return { x: x0, z: z0, inRoom: false, through: null, blocked: true, edge: true };
        if (r1 < D.cabR + 0.25) {
          if (atDoor && z1 < z0) return doorOpen ? { x: inside.x, z: inside.z, inRoom: true, through: 'in' } : { x: x0, z: z0, inRoom: false, through: null, blocked: true, shut: true };
          return { x: x0, z: z0, inRoom: false, through: null, blocked: true };
        }
        return { x: x1, z: z1, inRoom: false, through: null };
      },
    };
    g.userData.setLit(0);
    return { g, door: pivot, inside, platformTop: PT, entry };
  }

  return { build, VARIANTS, names: NAMES, dims: Object.assign({}, D) };
})();
