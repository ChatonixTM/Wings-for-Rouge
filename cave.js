/* ═══════════════════════════════════════════════════════════════════════════
   WFR_CAVE — the cave on the far side of the mountain, and the old nests (board 528).

   Marth, Oct 8: "make there a cave on the other side of the mountain", and these
   places hold "OLD NESTS (where rare items are found)".

   THE CAVE: a rock room under a dome, in a crag at the mountain's north-east
   foot (154, 218), where the slope runs down to the sea. Its mouth (2.4 m wide,
   2.5 m tall, a rock portal round it) faces UP the flank, toward the peak, so a
   bird coming down over the mountain sees it, and its stone ledge sits on the
   ground: she can walk in. The room is dim (dark stone, baked into the colours);
   it is lit by glowing mushrooms and crystals and by one soft shaft of daylight
   from a crack in the roof. NO PointLight (phone budget). In the back corner, on
   a low stone, an old nest holds KEEPSAKE #1, a grey feather.

   THE OLD NESTS outdoors: an old nest on the broken top of a dead tree far in the
   south-east (KEEPSAKE #6, a red thread), and an old nest on the lighthouse's cap
   (KEEPSAKE #7, white down - it is there only after the Eagle). Both are reached
   by landing: the tree top and the lighthouse are already the game's landing spots.

   ⚠ NO H() CHANGE. The far side of the mountain is a sea cliff (the brief's
   (88, 258) varies 16 m across a 14 m circle); a room dug into it would need the
   island's height function cut, and H() feeds the tree filter before rnd() is
   drawn. So the cave is a crag that stands ON the hill: its floor is set above the
   highest ground under the room, the tunnel and the ledge (the island's 4.8 m mesh
   triangles included), and its stone skirt reaches down past the lowest. Nothing
   of the hill stands inside the room. The site was fitted in the game's own
   numbers (tools/fit.js; re-measured in the game by tools/test.js): the ledge
   stands 0.26 m over the ground at its outer edge, the hill beyond is 0.10 m
   above its top (she walks straight on), the stone skirt is 3.7 m on the sea
   side, the nearest tree crown is 17 m off the crag, the nearest 552-list thing 64 m.

   ⚠ BINDING: no Math.random, never the game's rnd(). Every choice is a constant or
   a fixed function of position.

   ── THE API ───────────────────────────────────────────────────────────────
   WFR_CAVE.place(THREE, ctx) → record                one houses[] record, placed and scaled
     ctx     { H, HS, renderer, first,          first = houses.length (the record's i, its index)
               day: () → 0..1,                  daylight (the roof shaft fades at night)
               grid: { size: 720, seg: 150 } }  the island mesh (the floor clears its triangles too)
     record  { i, g, x, z, y, rot, w, d, ht, pivot, openT: Infinity, treat, treatTaken: false,
               cabin: true, cave: true, id: 'cave', name: 'the cave', who: null, keepsake, reach,
               roofAt(lx, lz), solid(lx, lz), lookUp, cam: {x, y, z} (local), windowMats: [],
               ledgeAt(x, z) → world y | -Infinity, spot: {x, z, name: 'cave'}, lo, hi, stats, dims }
             cabin: true puts it through the cabins' wiring (the visit filter, the keepsake treat test,
             the HUD's 'Inside ' + name, no treat bob). The door test's |L.x| < 0.6 sits inside the mouth.
   WFR_CAVE.nests(THREE, ctx) → [nest]             the two old nests outdoors
     ctx     { trees, lightTop: {x, y, z}, renderer, HS, eagle: () → bool }
     nest    { id, name, keepsake, x, y, z, g, treat, taken: false, after, tree, treeOff }
             y = the perch's top (the game's groundAt there); g is placed: scene.add(nest.g)
   WFR_CAVE.KEEPSAKES, .keepsake(id), .register(), .SITE, .OLD, .dims, .TOTAL (7)
             register() adds #1, #6, #7 to WFR_CABINS.KEEPSAKES (if cabins.js is loaded), so the
             cabins' keepsake(id) (restoreBeak) knows them too.
   ═══════════════════════════════════════════════════════════════════════════ */
window.WFR_CAVE = (function () {
  'use strict';

  /* ── the one design (local units; the game scales a house by HS = 1.6) ── */
  const D = {
    IW: 2.2, ID: 2.0,          // the room's half-width (x) and half-depth (z) at the floor
    n: 3,                       // plan: a superellipse (rounded, not a box)
    m: 5,                       // profile: steep stone walls under a flat-topped dome
    HC: 2.5,                    // the dome's height above the floor top
    T: 0.6,                     // the wall's thickness
    FT: 0.1 / 1.6,              // the floor top: the game stands her at h.y + 0.1 WORLD inside (0.1 local would sink her 6 cm)
    MW: 0.75, MJ: 0.85, MA: 0.7, // the mouth: half-width 0.75 (2.4 m), jambs to 0.85 above the floor, an arch 0.7 high (2.5 m in all)
    LED: 2.0, LW: 1.6,          // the ledge in front: 2.0 deep, 1.6 half-wide
  };
  D.OW = D.IW + D.T; D.OD = D.ID + D.T;
  D.mo = 2.6;                  // the crag's outer profile: rounder shoulders than the room inside
  D.HCo = D.HC + D.T + 0.4;    // the crag's height above the floor top
  D.LIP = 0.12;                // the portal's skin stands this far proud of both shells round the mouth (no z-fight)
  D.zF = D.OD + D.LIP;         // the portal's front at the floor (the record's front edge)
  D.zB = 1.2;                  // where the tunnel's floor strip may start, inside the room
  D.PW = D.MW + 0.65;          // the portal's half-width
  D.PH = 2.45;                 // the portal's top
  D.w = 2 * (D.OW * 1.07 + 0.1); D.d = 2 * D.zF;   // the record's rectangle: the crag's whole outline (groundAt, houseAt)
  D.ledgeZ0 = D.zF - 0.2; D.ledgeZ1 = D.zF + D.LED;
  const SITE = { id: 'cave', name: 'the cave', x: 154, z: 218, rot: -2.09 };   // mouth toward world (-0.87, -0.50): up the flank, toward the peak
  const NEAR = 60;   // world metres: the cave's small things (glow, nest, keepsake, shaft) are drawn within this
  const NEST_FAR = 160, KEEP_NEAR = 70;   // an outdoor nest is drawn within 160 m, its keepsake and glint within 70

  /* ── the keepsakes (528 §B items 1, 6, 7): they ride the fruit pipeline, and Feed reads Give ── */
  const KEEPSAKES = {
    feather: { id: 'feather', emoji: '\u{1FAB6}', name: 'a grey feather', gives: { fly: 3 }, keepsake: true, mark: 'a crest' },
    thread:  { id: 'thread',  emoji: '\u{1F9F5}', name: 'a red thread',   gives: {}, happy: 25, keepsake: true, mark: 'a thread on one leg' },
    down:    { id: 'down',    emoji: '⚪',    name: 'a tuft of white down', gives: { fly: 2, sta: 2 }, keepsake: true, mark: 'a white brow' },
  };
  const keepsake = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(KEEPSAKES, id) ? KEEPSAKES[id] : null);
  function register() { if (window.WFR_CABINS && WFR_CABINS.KEEPSAKES) for (const k in KEEPSAKES) if (!WFR_CABINS.KEEPSAKES[k]) WFR_CABINS.KEEPSAKES[k] = KEEPSAKES[k]; }
  register();   // cabins.js loads first; the cabins' keepsake(id) then knows all seven

  /* the old nests outdoors */
  const OLD = [
    { id: 'snag', name: 'the old nest on the dead tree', keepsake: 'thread', on: 'tree', near: { x: 130.5, z: -128.5 } },   // the island's far dead snag (top 24.4 m, 250 m from home)
    { id: 'light', name: 'the old nest on the lighthouse', keepsake: 'down', on: 'light', after: 'eagle' },
  ];

  /* deterministic variety: fixed functions of position, never a random draw */
  const frac = (x) => x - Math.floor(x);
  const nz = (x, y, z) => Math.sin(x * 1.7 + Math.sin(z * 1.3) * 1.1) * Math.cos(z * 1.9 + Math.sin(y * 2.1)) * 0.5
    + Math.sin(x * 4.1 + z * 3.7 + y * 2.9) * 0.25 + Math.sin(x * 9.3 - z * 7.1 + y * 5.3) * 0.12;
  const hash = (a, b) => frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const planR = (th, rx, rz, n) => { const s = Math.abs(Math.sin(th)), c = Math.abs(Math.cos(th)); return 1 / Math.pow(Math.pow(s / rx, n) + Math.pow(c / rz, n), 1 / n); };
  const superQ = (lx, lz, rx, rz, n) => Math.pow(Math.abs(lx) / rx, n) + Math.pow(Math.abs(lz) / rz, n);   // < 1 inside

  let T = null;
  const MAT = {};

  /* ═════════ geometry helpers ═════════ */
  function M(px, py, pz, rx, ry, rz, sx, sy, sz) {
    const o = new T.Object3D(); o.position.set(px || 0, py || 0, pz || 0); o.rotation.set(rx || 0, ry || 0, rz || 0);
    o.scale.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz); o.updateMatrix(); return o.matrix;
  }
  const rgb = (hex, k) => { const c = new T.Color(hex), s = k == null ? 1 : k; return [c.r * s, c.g * s, c.b * s]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  /* a builder for an indexed surface: vertices with colour and uv; every face is turned to face `want` (so a winding
     mistake cannot make a wall invisible from the side that matters) */
  function Builder() {
    const P = [], C = [], U = [], I = [];
    const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
    return {
      v(x, y, z, col, u, w) { P.push(x, y, z); C.push(col[0], col[1], col[2]); U.push(u || 0, w || 0); return P.length / 3 - 1; },
      pos(i) { return [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]; },
      setCol(i, col) { C[i * 3] = col[0]; C[i * 3 + 1] = col[1]; C[i * 3 + 2] = col[2]; },
      f(i0, i1, i2, want) {   // want: [x, y, z] the side this face must show to
        a.fromArray(P, i0 * 3); b.fromArray(P, i1 * 3); c.fromArray(P, i2 * 3);
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
        if (n.lengthSq() < 1e-14) return;   // a degenerate sliver (the dome's apex): skip
        if (n.x * want[0] + n.y * want[1] + n.z * want[2] < 0) I.push(i0, i2, i1); else I.push(i0, i1, i2);
      },
      count() { return I.length / 3; },
      geometry() {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3));
        g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
      },
    };
  }
  /* merge parts [{ g, m?, col?: [r,g,b] | fn(x,y,z,nx,ny,nz) }] into one non-indexed geometry (a part's own colour
     attribute wins when it has one and no col is given) */
  function merge(parts) {
    const P = [], N = [], U = [], C = [];
    const nm = new T.Matrix3();
    for (const p of parts) {
      const g = p.g.index ? p.g.toNonIndexed() : p.g.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      if (p.m) { g.applyMatrix4(p.m); }
      const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, ca = g.attributes.color;
      const su = p.uv ? p.uv[0] : 1, sv = p.uv ? p.uv[1] : 1;
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), nx = na.getX(i), ny = na.getY(i), nz2 = na.getZ(i);
        P.push(x, y, z); N.push(nx, ny, nz2); U.push((ua ? ua.getX(i) : 0) * su, (ua ? ua.getY(i) : 0) * sv);
        let c;
        if (p.col) c = typeof p.col === 'function' ? p.col(x, y, z, nx, ny, nz2) : p.col;
        else if (ca) c = [ca.getX(i), ca.getY(i), ca.getZ(i)];
        else c = [1, 1, 1];
        C.push(c[0], c[1], c[2]);
      }
      g.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    out.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
    out.setAttribute('uv', new T.Float32BufferAttribute(U, 2));
    out.setAttribute('color', new T.Float32BufferAttribute(C, 3));
    out.computeBoundingSphere();
    return out;
  }
  function rod(A, B, r0, r1, seg) {
    const a = new T.Vector3().fromArray(A), b = new T.Vector3().fromArray(B), dir = b.clone().sub(a), len = dir.length();
    const g = new T.CylinderGeometry(r1, r0, len, seg || 5, 1, true); g.translate(0, len / 2, 0);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    return { g, m: new T.Matrix4().compose(a, q, new T.Vector3(1, 1, 1)) };
  }
  /* equal arc-length rows along the profile rho^m + yy^m = 1 (scaled R across, h up): base (1, 0) to apex (0, 1) */
  function profileRows(R, h, m, rows) {
    const N = 600, pts = [], acc = []; let L = 0, prev = null;
    for (let k = 0; k <= N; k++) { const a = k / N * Math.PI / 2, rho = Math.pow(Math.cos(a), 2 / m), yy = Math.pow(Math.sin(a), 2 / m);
      if (prev) L += Math.hypot((rho - prev[0]) * R, (yy - prev[1]) * h); pts.push([rho, yy]); acc.push(L); prev = [rho, yy]; }
    const out = []; let j = 0;
    for (let i = 0; i <= rows; i++) { const t = L * i / rows; while (j < N - 1 && acc[j + 1] < t) j++; const f = acc[j + 1] > acc[j] ? Math.min(1, Math.max(0, (t - acc[j]) / (acc[j + 1] - acc[j]))) : 0;
      out.push({ rho: pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, yy: pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f }); }
    out[0] = { rho: 1, yy: 0 }; out[rows] = { rho: 0, yy: 1 };
    return out;
  }
  /* the crag's outline wanders (it is a rock, not a hut) - but not round the mouth, where the portal hugs it */
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const outerK = (th) => 1 + sstep(0.55, 0.95, Math.abs(wrapA(th))) * (0.045 * Math.sin(3 * th + 1) + 0.03 * Math.sin(5 * th + 2));
  /* the dome's height at a local plan point (no lumps): rx, rz the base half-extents, h the height above the floor top, m its profile */
  function domeY(lx, lz, rx, rz, h, m) {
    const q = superQ(lx, lz, rx, rz, D.n); if (q >= 1) return -Infinity;
    const rho = Math.pow(q, 1 / D.n); return D.FT + h * Math.pow(Math.max(0, 1 - Math.pow(rho, m || D.m)), 1 / (m || D.m));
  }
  const outerY = (lx, lz) => { const k = outerK(Math.atan2(lx, lz)); return domeY(lx / k, lz / k, D.OW, D.OD, D.HCo, D.mo); };
  const innerY = (lx, lz) => domeY(lx, lz, D.IW, D.ID, D.HC, D.m);
  /* a shell's front surface: its z at (x, y) on the +z side (k = 1 there), or -1 where the shell does not reach */
  function frontZ(x, y, rx, rz, h, m) {
    const yy = Math.max(0, Math.min(1, (y - D.FT) / h)), rho = Math.pow(Math.max(0, 1 - Math.pow(yy, m)), 1 / m);
    const a = Math.abs(x) / (rx * rho); if (!(a < 1)) return -1;
    return rz * rho * Math.pow(1 - Math.pow(a, D.n), 1 / D.n);
  }
  const outerZ = (x, y) => frontZ(x, y, D.OW, D.OD, D.HCo, D.mo), innerZ = (x, y) => frontZ(x, y, D.IW, D.ID, D.HC, D.m);
  /* the mouth's outline (local x, y) and the portal's top, as functions of x */
  const archTop = (x) => (Math.abs(x) >= D.MW ? -Infinity : D.FT + D.MJ + D.MA * Math.sqrt(Math.max(0, 1 - (x / D.MW) * (x / D.MW))));
  const portalTop = (x) => (Math.abs(x) > D.PW ? -Infinity : D.PH - 0.55 + 0.55 * Math.sqrt(Math.max(0, 1 - (x / D.PW) * (x / D.PW))));
  /* inside the mouth's window, where both shells are cut away (the portal's skin covers it); a face goes only when ALL its
     corners are inside, so the cut never reaches past the skin */
  const inWindow = (x, y, z) => z > 0 && Math.abs(x) < D.PW - 0.12 && y < portalTop(x) - 0.12 && y > D.FT - 0.2;
  const inPortalZone = (x, y, z) => z > 0 && Math.abs(x) < D.PW + 0.45 && y < Math.max(D.FT, portalTop(Math.max(-D.PW, Math.min(D.PW, x)))) + 0.45 && y > D.FT - 0.5;
  const inLedge = (lx, lz) => superQ(lx, lz - (D.ledgeZ0 + D.ledgeZ1) / 2, D.LW, (D.ledgeZ1 - D.ledgeZ0) / 2, 2.6) < 1;

  /* ═════════ textures (canvas, painted once, no randomness) ═════════ */
  let SPARK = null;
  function sparkTex() {
    if (SPARK) return SPARK;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), S = 64, h = S / 2;
    const rg = g.createRadialGradient(h, h, 0, h, h, h);
    rg.addColorStop(0, 'rgba(255,250,225,0.9)'); rg.addColorStop(0.18, 'rgba(255,236,180,0.35)'); rg.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = rg; g.fillRect(0, 0, S, S); g.fillStyle = 'rgba(255,252,236,0.95)';
    for (const [w, hh] of [[2.2, h * 0.95], [h * 0.95, 2.2]]) { g.beginPath(); g.moveTo(h - w, h); g.lineTo(h, h - hh); g.lineTo(h + w, h); g.lineTo(h, h + hh); g.closePath(); g.fill(); }
    SPARK = new T.CanvasTexture(c); return SPARK;
  }
  function mat(key, make, texName, renderer, rep) {
    if (MAT[key]) return MAT[key];
    const m = make();
    if (texName && window.WFR_TEX && WFR_TEX.names && WFR_TEX.names.indexOf(texName) >= 0) { try { WFR_TEX.apply({ material: m }, texName, rep || 1, rep || 1, renderer); } catch (e) { /* plain colour */ } }
    return (MAT[key] = m);
  }
  /* the small things cast no shadow (the game's one-time traverse sets castShadow on every mesh: held false here) */
  const noShadow = (o) => { if (o.isMesh || o.isSprite) Object.defineProperty(o, 'castShadow', { get: () => false, set: () => {}, configurable: true }); };

  /* ═════════ an old nest (local units): weathered twigs, a faded straw pad, the bowl ═════════ */
  function nestParts(NX, NY, NZ, k) {   // an OLD nest: grey-brown twigs woven round, a faded straw lining, a few strays
    const parts = [], s = k || 1, TW = [0x7a6a58, 0x8d7d68, 0x6b5e50, 0x9a8a72, 0x5e5246], st = rgb(0xbcae8a);
    parts.push({ g: new T.CylinderGeometry(0.28 * s, 0.2 * s, 0.1 * s, 10), m: M(NX, NY - 0.03 * s, NZ), col: st.map((v) => v * 0.78) });
    parts.push({ g: new T.TorusGeometry(0.34 * s, 0.11 * s, 6, 18), m: M(NX, NY + 0.08 * s, NZ, Math.PI / 2, 0, 0, 1, 1, 0.75), col: (x, y, z) => rgb(0x6f6252, 0.8 + 0.3 * frac(Math.sin(x * 41 + z * 37) * 91.3)) });
    parts.push({ g: new T.SphereGeometry(0.3 * s, 10, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m: M(NX, NY + 0.13 * s, NZ, 0, 0, 0, 1, 0.42, 1), col: (x, y, z) => mix(rgb(0x5a4e40), st, 0.35 * frac(Math.sin(x * 61 + z * 53) * 71.9)) });
    for (let i = 0; i < 40; i++) {   // woven round the rim: each twig a chord of the ring, tilted, some longer and sticking out
      const a = i * 2.39996, ring = (0.3 + 0.08 * hash(i, 1)) * s, sweep = 0.7 + 0.6 * hash(i, 2), y0 = (0.02 + 0.16 * hash(i, 3)) * s, y1 = (0.02 + 0.16 * hash(i, 5)) * s;
      const out = i % 5 === 0 ? 1.35 : 1;
      const A = [NX + Math.cos(a) * ring, NY + y0, NZ + Math.sin(a) * ring], B = [NX + Math.cos(a + sweep) * ring * out, NY + y1, NZ + Math.sin(a + sweep) * ring * out];
      const t = rod(A, B, (0.016 + 0.01 * hash(i, 4)) * s, 0.007 * s, 4); parts.push({ g: t.g, m: t.m, col: i % 7 === 0 ? st : rgb(TW[i % TW.length], 0.9 + 0.2 * hash(i, 6)) }); }
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, r0 = 0.06 * s, r1 = (0.22 + 0.06 * hash(i, 8)) * s;   // straw in the bowl
      const t = rod([NX + Math.cos(a) * r0, NY + 0.09 * s, NZ + Math.sin(a) * r0], [NX + Math.cos(a + 0.4) * r1, NY + 0.12 * s, NZ + Math.sin(a + 0.4) * r1], 0.006 * s, 0.004 * s, 3); parts.push({ g: t.g, m: t.m, col: st }); }
    return parts;
  }

  /* ═════════ the keepsakes, modelled (local units; the bird is ~0.3 tall in here) ═════════ */
  function keepsakeModel(id) {
    const g = new T.Group(); g.name = 'keepsake:' + id;
    let mesh;
    if (id === 'feather') {   // a grey flight feather: a curved vane with dark bars, a pale quill, lying tip-up across the nest
      const L = 0.42, W = 0.075, sh = new T.Shape(); const N = 14;
      sh.moveTo(0, 0);
      for (let k = 1; k <= N; k++) { const t = k / N; sh.lineTo(W * Math.sin(Math.PI * Math.pow(t, 0.75)) * (1 - 0.2 * t), t * L); }
      for (let k = N - 1; k >= 0; k--) { const t = k / N; sh.lineTo(-0.7 * W * Math.sin(Math.PI * Math.pow(t, 0.75)) * (1 - 0.2 * t), t * L); }
      const vane = new T.ShapeGeometry(sh, 2); const p = vane.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i); p.setZ(i, 0.035 * Math.sin(Math.PI * y / L) + 0.25 * x * x); }
      vane.computeVertexNormals();
      const quill = new T.CylinderGeometry(0.006, 0.011, L + 0.05, 5); quill.translate(0, (L + 0.05) / 2 - 0.05, 0.035 * 0.5);
      const geo = merge([{ g: vane, col: (x, y) => { const t = y / L, bar = 0.5 + 0.5 * Math.sin(t * 38); return t < 0.12 ? rgb(0xeceae6) : rgb(0xa9aeb6, 0.84 + 0.2 * bar * (t > 0.85 ? 0.4 : 1)); } },
        { g: quill, col: rgb(0xeeebe4) }]);
      mesh = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide, emissive: new T.Color(0x24262a) }));
      mesh.rotation.set(-Math.PI / 2 + 0.55, 0.7, 0); mesh.position.set(-0.1, 0.05, 0.12);
    } else if (id === 'thread') {   // a loose skein of red thread, its tail over the nest's rim
      const pts = [];
      for (let k = 0; k <= 30; k++) { const a = k / 30 * Math.PI * 5.2, r = 0.075 + 0.018 * Math.sin(k * 1.7); pts.push(new T.Vector3(Math.cos(a) * r, 0.03 + 0.012 * Math.sin(a * 1.3) + k * 0.0012, Math.sin(a) * r * 0.85)); }
      pts.push(new T.Vector3(0.2, 0.08, 0.06), new T.Vector3(0.33, 0.02, 0.1), new T.Vector3(0.4, -0.12, 0.14));
      const tube = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 90, 0.011, 4, false);
      mesh = new T.Mesh(tube, new T.MeshLambertMaterial({ color: 0xc4243a, emissive: new T.Color(0x3a0a10) }));
    } else {   // down: a soft white tuft
      const parts = [];
      [[0, 0.05, 0, 0.06], [0.05, 0.06, 0.02, 0.045], [-0.04, 0.055, 0.03, 0.05], [0.01, 0.09, -0.03, 0.04], [-0.02, 0.05, -0.05, 0.042], [0.045, 0.045, -0.04, 0.035]]
        .forEach(([x, y, z, r]) => parts.push({ g: new T.IcosahedronGeometry(r, 1), m: M(x, y, z), col: rgb(0xf6f4ef) }));
      for (let i = 0; i < 7; i++) { const a = i * 0.9, t = rod([0, 0.06, 0], [Math.cos(a) * 0.13, 0.07 + 0.03 * Math.sin(a * 2), Math.sin(a) * 0.13], 0.006, 0.002, 3); parts.push({ g: t.g, m: t.m, col: rgb(0xffffff) }); }
      mesh = new T.Mesh(merge(parts), new T.MeshLambertMaterial({ vertexColors: true, emissive: new T.Color(0x3a3a3a) }));
    }
    mesh.name = 'keepsake:' + id + ':mesh'; g.add(mesh);
    const spark = new T.Sprite(new T.SpriteMaterial({ map: sparkTex(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.8 }));
    spark.scale.setScalar(0.3); spark.position.set(0.05, 0.3, 0.02); spark.name = 'glint';
    spark.onBeforeRender = function () { const t = (window.performance ? performance.now() : Date.now()) / 1000, k = 0.5 + 0.5 * Math.sin(t * 2.6 + id.length);
      this.material.opacity = 0.2 + 0.55 * k * k; this.scale.setScalar(0.22 + 0.16 * k); };
    g.add(spark);
    g.traverse(noShadow);
    return g;
  }

  /* ═════════ build the cave (local units, UNSCALED; origin = the floor base) ═════════ */
  function build(THREE, opts) {
    T = THREE; opts = opts || {};
    const R = opts.renderer || null, ground = typeof opts.ground === 'function' ? opts.ground : () => -1;
    const B = Math.min(-0.6, opts.bottom != null ? opts.bottom : -2);   // the skirt's foot, below the lowest ground
    const { IW, ID, n, m, HC, T: TW, FT, MW, MJ, MA } = D;
    const COLS = 64, ROWS = 16;
    const rock = [];   // parts of the one stone mesh
    const quadIn = (bd, q) => q.every((i) => { const p = bd.pos(i); return inWindow(p[0], p[1], p[2]); });   // the cut: whole faces only

    /* ── the inner shell: the room's walls and ceiling, facing in; dark, darker up high and at the back ── */
    { const bd = Builder(), rows = profileRows((IW + ID) / 2, HC, m, ROWS), idx = [];
      for (let i = 0; i <= ROWS; i++) { idx.push([]); for (let j = 0; j <= COLS; j++) {
        const th = j / COLS * Math.PI * 2, r = planR(th, IW, ID, n), { rho, yy } = rows[i];
        let x = r * rho * Math.sin(th), z = r * rho * Math.cos(th), y = FT + HC * yy;
        const lump = (inPortalZone(x, y, z) ? 0 : 0.07) * nz(x * 1.3, y * 1.3, z * 1.3) * sstep(0, 0.12, yy);   // none at the floor line, none round the mouth
        x += Math.sin(th) * rho * lump; z += Math.cos(th) * rho * lump; y += lump * 0.4 * yy;
        const toMouth = sstep(-ID, ID, z), dark = (0.5 + 0.38 * toMouth) * (1 - 0.32 * yy) * (0.86 + 0.2 * (0.5 + 0.5 * nz(x * 3, y * 3, z * 3)));
        const col = mix(rgb(0x6a6158, dark), rgb(0x58604c, dark), 0.25 * sstep(0.2, 0.9, 0.5 + 0.5 * nz(x * 0.9, y * 2, z * 0.9)));   // a little green damp
        idx[i].push(bd.v(x, y, z, col, j / COLS * 9, y / 1.4));
      } }
      for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) {
        const a = idx[i][j], b = idx[i][j + 1], c = idx[i + 1][j + 1], d = idx[i + 1][j];
        if (quadIn(bd, [a, b, c, d])) continue;
        const pa = bd.pos(a), pc = bd.pos(c), cx = (pa[0] + pc[0]) / 2, cy = (pa[1] + pc[1]) / 2, cz = (pa[2] + pc[2]) / 2;
        const want = [-cx, -(cy - FT - HC * 0.3), -cz];   // toward the room's middle
        bd.f(a, b, c, want); bd.f(a, c, d, want);
      }
      rock.push({ g: bd.geometry() }); }

    /* ── the outer shell: a rounder, wandering crag of lumpy stone, moss on top, a skirt down past the lowest ground ── */
    const skirtRows = Math.max(2, Math.ceil((FT - B) / 0.6));
    { const bd = Builder(), rows = profileRows((IW + ID) / 2 + TW, D.HCo, D.mo, ROWS), idx = [];
      const ringAll = [];
      for (let k = skirtRows; k >= 1; k--) ringAll.push({ skirt: true, y: FT - (FT - B) * k / skirtRows, flare: 0.07 * k / skirtRows * (FT - B) });
      for (let i = 0; i <= ROWS; i++) ringAll.push({ skirt: false, rho: rows[i].rho, yy: rows[i].yy });
      for (let i = 0; i < ringAll.length; i++) { const rr = ringAll[i]; idx.push([]); for (let j = 0; j <= COLS; j++) {
        const th = j / COLS * Math.PI * 2, r = planR(th, D.OW, D.OD, n) * outerK(th);
        let x, y, z, yy;
        if (rr.skirt) { x = (r + rr.flare) * Math.sin(th); z = (r + rr.flare) * Math.cos(th); y = rr.y; yy = 0; }
        else { x = r * rr.rho * Math.sin(th); z = r * rr.rho * Math.cos(th); y = FT + D.HCo * rr.yy; yy = rr.yy; }
        const zone = inPortalZone(x, y, z), amp = (rr.skirt ? 0.32 : 0.3) * (zone ? 0 : 1) * (yy > 0.8 ? 0.4 : 1);
        const lump = amp * nz(x * 0.7, y * 0.8, z * 0.7) + amp * 0.45 * nz(x * 2.1 + 5, y * 2.1, z * 2.1);
        const rh = rr.skirt ? 1 : rr.rho;
        x += Math.sin(th) * lump * Math.max(0.3, rh); z += Math.cos(th) * lump * Math.max(0.3, rh); y += rr.skirt ? 0 : lump * 0.5 * yy;
        idx[i].push(bd.v(x, y, z, [1, 1, 1], j / COLS * 11, y / 1.4));
      } }
      for (let i = 0; i < ringAll.length - 1; i++) for (let j = 0; j < COLS; j++) {
        const a = idx[i][j], b = idx[i][j + 1], c = idx[i + 1][j + 1], d = idx[i + 1][j];
        if (quadIn(bd, [a, b, c, d])) continue;
        const pa = bd.pos(a), pc = bd.pos(c), cx = (pa[0] + pc[0]) / 2, cy = (pa[1] + pc[1]) / 2, cz = (pa[2] + pc[2]) / 2;
        const want = [cx, cy - FT + (ringAll[i].skirt ? 0 : 0.6), cz];   // outward
        bd.f(a, b, c, want); bd.f(a, c, d, want);
      }
      const g = bd.geometry(), pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color;
      for (let i = 0; i < pa.count; i++) {   // colour after the normals: moss where it faces the sky, dark and wet low down
        const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), ny = na.getY(i), v = 0.5 + 0.5 * nz(x * 2.1, y * 2.1, z * 2.1);
        let c = rgb(0xa49c8e, 0.86 + 0.22 * v);
        c = mix(c, rgb(0x6b7a5c, 0.9), 0.3 * sstep(0.35, 0.8, 0.5 + 0.5 * nz(x * 0.7 + 3, y * 0.7, z * 0.7)));   // lichen
        c = mix(c, rgb(0x6f8d48, 0.85 + 0.25 * v), sstep(0.5, 0.85, ny) * (0.65 + 0.35 * v));   // moss on top
        c = mix(c, rgb(0x5e574e), 0.45 * (1 - sstep(B, FT + 0.4, y)));   // the foot, darker
        ca.setXYZ(i, c[0], c[1], c[2]);
      }
      rock.push({ g }); }

    /* ── the floor: dark earth and grit inside the base ring; a strip through the mouth's tunnel ── */
    { const bd = Builder(), RINGS = 4, idx = [];
      const fc = (x, z) => { const v = 0.5 + 0.5 * nz(x * 3.3, 0, z * 3.3), shaft = Math.exp(-((x - 0.55) * (x - 0.55) + (z + 0.25) * (z + 0.25)) / 0.5);
        return mix(rgb(0x5a5047, 0.8 + 0.3 * v), rgb(0x8a7c66), 0.35 * shaft); };
      const c0 = bd.v(0, FT - 0.003, 0, fc(0, 0), 0, 0);
      for (let k = 1; k <= RINGS; k++) { idx.push([]); for (let j = 0; j <= COLS; j++) {
        const th = j / COLS * Math.PI * 2, r = planR(th, IW, ID, n) * k / RINGS * (k === RINGS ? 1.04 : 1), x = r * Math.sin(th), z = r * Math.cos(th);   // the last ring runs under the wall: no seam of sky
        idx[k - 1].push(bd.v(x, FT - 0.003, z, fc(x, z), x / 1.4, z / 1.4)); } }
      for (let j = 0; j < COLS; j++) bd.f(c0, idx[0][j], idx[0][j + 1], [0, 1, 0]);
      for (let k = 0; k < RINGS - 1; k++) for (let j = 0; j < COLS; j++) { bd.f(idx[k][j], idx[k][j + 1], idx[k + 1][j + 1], [0, 1, 0]); bd.f(idx[k][j], idx[k + 1][j + 1], idx[k + 1][j], [0, 1, 0]); }
      const sx = MW + 0.04, z0 = ID - 0.15, z1 = D.ledgeZ0 + 0.25, sc = rgb(0x6e655a), sy = FT + 0.002;   // (2 mm over the ledge's top where they overlap)
      const s0 = bd.v(-sx, sy, z0, sc, -sx, z0), s1 = bd.v(sx, sy, z0, sc, sx, z0), s2 = bd.v(sx, sy, z1, rgb(0x857c6e), sx, z1), s3 = bd.v(-sx, sy, z1, rgb(0x857c6e), -sx, z1);
      bd.f(s0, s1, s2, [0, 1, 0]); bd.f(s0, s2, s3, [0, 1, 0]);
      rock.push({ g: bd.geometry() }); }

    /* ── the portal: a stone skin round the mouth that HUGS both shells (LIP proud of each, so no z-fight) and covers their
       cut edges; the arch through it is the tunnel. Its front follows the crag's outer face, its back the room's wall. ── */
    { const sh = new T.Shape(), N = 28;
      const outline = []; outline.push([-D.PW, -0.4], [D.PW, -0.4]);
      for (let k = 0; k <= N; k++) { const a = k / N * Math.PI, x = Math.cos(a) * D.PW, y = portalTop(x); outline.push([x, y + 0.05 * nz(x * 2.7, y * 2.2, 2)]); }
      sh.moveTo(outline[0][0], outline[0][1]); for (let k = 1; k < outline.length; k++) sh.lineTo(outline[k][0], outline[k][1]); sh.closePath();
      const hole = new T.Path(); hole.moveTo(-MW, FT - 0.02); hole.lineTo(MW, FT - 0.02); hole.lineTo(MW, FT + MJ);
      for (let k = 1; k < N; k++) { const a = k / N * Math.PI, x = Math.cos(a) * MW; hole.lineTo(x, FT + MJ + MA * Math.sin(a)); }
      hole.lineTo(-MW, FT + MJ); hole.closePath(); sh.holes.push(hole);
      const g = new T.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false, curveSegments: 4, steps: 3 });   // z 0 (back) .. 1 (front), remapped below
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), t = p.getZ(i), yc = Math.max(FT, y);
        const zo = outerZ(x, yc), zi = innerZ(x, yc);
        const front = (zo > 0 ? zo : D.OD * 0.5) + D.LIP, back = Math.min(front - 0.3, (zi > 0 ? zi : 0.8) - D.LIP);
        const edge = Math.abs(x) < MW + 0.2 && y < FT + MJ + MA + 0.2;   // the tunnel's rim stays true; the rest of the face is rough
        const rough = t > 0.99 && !edge ? 0.05 * nz(x * 2.6, y * 2.6, 3) : 0;
        p.setZ(i, back + (front - back) * t + rough);
      }
      g.computeVertexNormals();
      rock.push({ g, uv: [1 / 1.3, 1 / 1.3], col: (x, y, z, nx, ny, nz2) => { const inTun = Math.abs(nz2) < 0.5 && Math.abs(x) <= MW + 0.02 && y < FT + MJ + MA + 0.02;
        const v = 0.5 + 0.5 * nz(x * 2.5, y * 2.5, z * 2.5); let c = rgb(0x8c8579, 0.84 + 0.24 * v);
        if (inTun) c = rgb(0x6a6158, 0.7 + 0.25 * sstep(D.zB, D.zF, z));   // the tunnel: darker going in
        if (ny > 0.6 && !inTun) c = mix(c, rgb(0x6f8d48), 0.6 * sstep(0.6, 0.9, ny));
        return c; } }); }

    /* ── the ledge: a flat stone apron at the floor's height in front of the mouth, its sides down to the skirt's foot ── */
    { const bd = Builder(), NP = 40, zc = (D.ledgeZ0 + D.ledgeZ1) / 2, hz = (D.ledgeZ1 - D.ledgeZ0) / 2, idx = [];
      const lv = [{ y: B, out: 0.4 }, { y: B + (FT - B) * 0.45, out: 0.28 }, { y: FT - 0.3, out: 0.16 }, { y: FT - 0.07, out: 0.07 }, { y: FT, out: 0 }];
      const RINGS = 3, top = [];   // the flat top: rings in, with planar uvs (no swirl)
      for (let k = 0; k < lv.length; k++) { idx.push([]); for (let j = 0; j <= NP; j++) {
        const ph = j / NP * Math.PI * 2, r = planR(ph, D.LW, hz, 2.6), last = k === lv.length - 1;
        const lump = last ? 0 : (0.16 + 0.05 * k) * nz(Math.sin(ph) * 2.4 + k, lv[k].y * 1.6, Math.cos(ph) * 2.4);
        const x = (r + lv[k].out + lump) * Math.sin(ph), z = zc + (r + lv[k].out + lump) * Math.cos(ph);
        const v = 0.5 + 0.5 * nz(x * 2, lv[k].y * 2, z * 2);
        idx[k].push(bd.v(x, lv[k].y, z, last ? mix(rgb(0x938c7f, 0.9 + 0.15 * v), rgb(0x6f8d48), 0.4 * v) : mix(rgb(0x8a8377, 0.78 + 0.22 * v), rgb(0x6f8d48), k >= 2 ? 0.25 * v : 0), last ? x / 1.4 : j / NP * 8, last ? z / 1.4 : lv[k].y / 1.3));
      } }
      for (let k = 0; k < lv.length - 1; k++) for (let j = 0; j < NP; j++) { const want = [Math.sin(j / NP * Math.PI * 2), 0.2, Math.cos(j / NP * Math.PI * 2)];
        bd.f(idx[k][j], idx[k][j + 1], idx[k + 1][j + 1], want); bd.f(idx[k][j], idx[k + 1][j + 1], idx[k + 1][j], want); }
      top.push(idx[lv.length - 1]);
      for (let k = RINGS - 1; k >= 1; k--) { const ring = []; for (let j = 0; j <= NP; j++) { const ph = j / NP * Math.PI * 2, r = planR(ph, D.LW, hz, 2.6) * k / RINGS, x = r * Math.sin(ph), z = zc + r * Math.cos(ph), v = 0.5 + 0.5 * nz(x * 2.3, 0, z * 2.3);
        ring.push(bd.v(x, FT, z, mix(rgb(0x928b7e, 0.88 + 0.16 * v), rgb(0x7f8a62), 0.25 * sstep(0.6, 0.9, v)), x / 1.4, z / 1.4)); } top.push(ring); }
      for (let k = 0; k < top.length - 1; k++) for (let j = 0; j < NP; j++) { bd.f(top[k][j], top[k][j + 1], top[k + 1][j + 1], [0, 1, 0]); bd.f(top[k][j], top[k + 1][j + 1], top[k + 1][j], [0, 1, 0]); }
      const c0 = bd.v(0, FT, zc, rgb(0x8c8577), 0, zc / 1.4), inner = top[top.length - 1];
      for (let j = 0; j < NP; j++) bd.f(c0, inner[j], inner[j + 1], [0, 1, 0]);
      rock.push({ g: bd.geometry() }); }

    /* ── inside: the nest's low stone, pebbles, and a few stalactites ── */
    const NEST = { x: 1.3, z: -1.2, r: 0.55, top: 0.46 };   // the back-right corner (the mouth is +z)
    const stoneBlob = (x, y, z, r, sy, k, base) => { const g = new T.IcosahedronGeometry(r, 2), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), f = 1 + 0.16 * nz(px * 4 + k, py * 4, pz * 4 - k); p.setXYZ(i, px * f, py * f * sy, pz * f); }
      g.computeVertexNormals(); return { g, m: M(x, y, z), col: (X, Y, Z, nx, ny) => { const v = 0.5 + 0.5 * nz(X * 4, Y * 4, Z * 4); return mix(rgb(base || 0x7a7268, 0.75 + 0.25 * v), rgb(0x6f8d48), ny > 0.75 && !base ? 0 : 0); } }; };
    rock.push(stoneBlob(NEST.x, NEST.top - 0.55 * 0.62 + 0.02, NEST.z, NEST.r, 0.62, 1, 0x6d665d));
    [[-1.55, -0.6, 0.13], [-0.4, -1.65, 0.1], [1.75, 0.55, 0.11], [-1.7, 0.9, 0.09], [0.9, -1.55, 0.08], [1.55, -0.2, 0.07]].forEach(([x, z, r], k) => rock.push(stoneBlob(x, FT + r * 0.25, z, r, 0.55, k + 3, 0x6a6259)));
    for (const [x, z, len, r] of [[-0.9, -0.8, 0.45, 0.09], [0.95, 0.35, 0.35, 0.08], [-0.25, 0.75, 0.25, 0.06], [-1.35, -0.15, 0.3, 0.07], [1.15, -0.5, 0.22, 0.06], [-0.05, -1.25, 0.4, 0.08], [0.45, 0.95, 0.18, 0.05]]) {
      const top = domeY(x, z, IW, ID, HC) + 0.04, cone = new T.ConeGeometry(r, len, 6, 2); cone.rotateX(Math.PI); cone.translate(0, -len / 2, 0);
      rock.push({ g: cone, m: M(x, top, z), col: (X, Y) => rgb(0x6c645b, 0.7 + 0.25 * sstep(top - len, top, Y)) }); }

    /* ── outside: boulders round the crag's foot, on the real ground ── */
    for (const [x, z, r, k] of [[D.OW + 0.45, -0.7, 0.75, 11], [-D.OW - 0.35, -1.3, 0.6, 12], [1.1, -D.OD - 0.55, 0.85, 13], [-2.15, D.ledgeZ0 + 0.3, 0.5, 14], [2.05, D.ledgeZ0 + 0.9, 0.42, 15], [-1.2, -D.OD - 0.4, 0.55, 16]]) {
      const gy = Math.max(B + r * 0.4, ground(x, z)); const blob = stoneBlob(x, gy + r * 0.15, z, r, 0.7, k);
      blob.col = (X, Y, Z, nx, ny) => { const v = 0.5 + 0.5 * nz(X * 3, Y * 3, Z * 3); return mix(rgb(0x938c80, 0.82 + 0.22 * v), rgb(0x6f8d48), sstep(0.55, 0.9, ny) * 0.7); };
      rock.push(blob); }

    /* ── assemble the stone: ONE mesh, one material (the game's stone grain over the vertex colours) ── */
    const g = new T.Group(); g.name = 'cave';
    const rockMat = mat('rock', () => new T.MeshLambertMaterial({ vertexColors: true }), 'rock', R, 1);
    const rockMesh = new T.Mesh(merge(rock), rockMat); rockMesh.name = 'cave:rock'; g.add(rockMesh);

    /* ── the near things (drawn within NEAR metres): glow, pools of light, the shaft, the nest, the keepsake ── */
    const near = new T.Group(); near.name = 'cave:near';
    /* glowing mushrooms and crystals (unlit colour: they glow by day and by night) */
    const glow = [], pools = [];
    const CLUSTERS = [
      { th: 1.2, n: 5, cap: 0x7dffd6, k: 1 }, { th: 1.95, n: 4, cap: 0x8fd6ff, k: 2 }, { th: 3.2, n: 6, cap: 0x7dffd6, k: 3 },
      { th: 4.3, n: 4, cap: 0xa8ffb0, k: 4 }, { th: 2.55, n: 3, cap: 0x8fd6ff, k: 5, at: [NEST.x - 0.52, NEST.z + 0.3] },
    ];
    const solids = [];   // [x, z, r] the bird walks round
    for (const cl of CLUSTERS) {
      const r0 = planR(cl.th, IW, ID, n) * 0.86, cx = cl.at ? cl.at[0] : r0 * Math.sin(cl.th), cz = cl.at ? cl.at[1] : r0 * Math.cos(cl.th);
      for (let i = 0; i < cl.n; i++) {
        const a = i * 2.39996 + cl.k, rr = 0.06 + 0.17 * hash(i, cl.k), x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
        const h = 0.09 + 0.2 * hash(i + 7, cl.k), rc = 0.045 + 0.07 * hash(i + 3, cl.k), lean = (hash(i, cl.k + 9) - 0.5) * 0.5;
        const stem = new T.CylinderGeometry(rc * 0.28, rc * 0.36, h, 6); stem.translate(0, h / 2, 0);
        glow.push({ g: stem, m: M(x, FT, z, lean * 0.4, 0, lean), col: rgb(0xbfeee0, 0.62) });
        const cap = new T.SphereGeometry(rc, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, 0.58, 1);
        const tip = new T.Vector3(0, h, 0).applyEuler(new T.Euler(lean * 0.4, 0, lean));
        glow.push({ g: cap, m: M(x + tip.x, FT + tip.y - 0.005, z + tip.z, lean * 0.4, 0, lean), col: (X, Y) => rgb(cl.cap, 0.75 + 0.35 * sstep(FT + tip.y, FT + tip.y + rc * 0.55, Y)) });
      }
      pools.push({ x: cx, z: cz, r: 0.75, c: rgb(cl.cap, 0.32) });
      solids.push([cx, cz, 0.3]);
    }
    /* a cluster of crystals at the back left */
    { const th = 3.85, r0 = planR(th, IW, ID, n) * 0.84, cx = r0 * Math.sin(th), cz = r0 * Math.cos(th);
      [[0, 0, 0.42, 0, 0.1], [0.12, 0.05, 0.3, 0.35, 0.08], [-0.1, 0.08, 0.26, -0.4, 0.07], [0.05, -0.11, 0.22, 0.2, 0.06], [-0.13, -0.06, 0.18, -0.3, 0.05]].forEach(([dx, dz, L, tilt, r], i) => {
        const o = new T.OctahedronGeometry(1, 0); o.scale(r, L / 2, r); o.translate(0, L / 2 - 0.03, 0);
        glow.push({ g: o, m: M(cx + dx, FT, cz + dz, tilt * 0.6, i * 0.7, tilt), col: (X, Y) => mix(rgb(0xb79cff), rgb(0x9fe4ff), sstep(FT, FT + L, Y)) }); });
      pools.push({ x: cx, z: cz, r: 0.85, c: rgb(0xa58cff, 0.3) }); solids.push([cx, cz, 0.32]); }
    const glowMesh = new T.Mesh(merge(glow), mat('glow', () => new T.MeshBasicMaterial({ vertexColors: true }))); glowMesh.name = 'cave:glow'; near.add(glowMesh);
    /* the pools of glow on the floor round each cluster (additive, constant) */
    { const parts = [];
      for (const p of pools) { const disc = new T.CircleGeometry(p.r, 18); disc.rotateX(-Math.PI / 2);
        parts.push({ g: disc, m: M(p.x, FT + 0.012, p.z), col: (X, Y, Z) => { const t = 1 - Math.min(1, Math.hypot(X - p.x, Z - p.z) / p.r); return p.c.map((v) => v * t * t); } }); }
      const pm = new T.Mesh(merge(parts), mat('pools', () => new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
      pm.name = 'cave:pools'; pm.renderOrder = 2; near.add(pm); }
    near.userData.pools = pools.map((p) => ({ x: p.x, z: p.z }));   // 643 worlds: where the glow-caps grow (local units; the game places them with toWorld)
    /* the shaft: daylight from a crack in the roof - three crossed soft planes, a pool where it lands, the crack's glow */
    let shaftMesh;
    { const top = new T.Vector3(0.35, domeY(0.35, -0.45, IW, ID, HC) - 0.02, -0.45), foot = new T.Vector3(0.6, FT + 0.02, -0.2), parts = [];
      const up = top.clone().sub(foot), len = up.length(), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), up.clone().normalize());
      for (let k = 0; k < 3; k++) {
        const pl = new T.PlaneGeometry(1, len, 2, 1), p = pl.attributes.position, cols = [];
        for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i) / len + 0.5; p.setX(i, u * (0.95 - 0.55 * v)); const c = (Math.abs(u) > 0.25 ? 0 : 1) * (0.1 + 0.32 * v); cols.push(c, c * 0.95, c * 0.78); }   // soft at both edges, brighter up at the crack
        pl.setAttribute('color', new T.Float32BufferAttribute(cols, 3));   // per vertex BEFORE the merge (toNonIndexed reorders vertices)
        pl.translate(0, len / 2, 0); pl.rotateY(k * Math.PI / 3);
        parts.push({ g: pl, m: new T.Matrix4().compose(foot, q, new T.Vector3(1, 1, 1)) });
      }
      const pool = new T.CircleGeometry(0.8, 20); pool.rotateX(-Math.PI / 2);
      parts.push({ g: pool, m: M(foot.x, FT + 0.015, foot.z), col: (X, Y, Z) => { const t = 1 - Math.min(1, Math.hypot(X - foot.x, Z - foot.z) / 0.8); return [0.5 * t * t, 0.47 * t * t, 0.36 * t * t]; } });
      const crack = new T.CircleGeometry(0.26, 12); crack.rotateX(Math.PI / 2);
      parts.push({ g: crack, m: M(top.x, top.y - 0.01, top.z, 0, 0, 0, 1, 1, 0.55), col: (X, Y, Z) => { const t = 1 - Math.min(1, Math.hypot(X - top.x, (Z - top.z) / 0.55) / 0.26); return [0.95 * t, 0.92 * t, 0.8 * t]; } });
      shaftMesh = new T.Mesh(merge(parts), new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
      shaftMesh.name = 'cave:shaft'; shaftMesh.renderOrder = 3;
      const day = typeof opts.day === 'function' ? opts.day : () => 1;
      shaftMesh.onBeforeRender = function () { let d = 1; try { d = day(); } catch (e) { d = 1; } const k = 0.12 + 0.88 * Math.max(0, Math.min(1, d)); this.material.color.setScalar(k); };
      near.add(shaftMesh); }
    /* the old nest on its stone, and the feather in it */
    const nestMesh = new T.Mesh(merge(nestParts(NEST.x, NEST.top + 0.04, NEST.z, 1)), mat('nest', () => new T.MeshLambertMaterial({ vertexColors: true })));
    nestMesh.name = 'cave:nest'; near.add(nestMesh);
    const treat = keepsakeModel('feather'); treat.position.set(NEST.x, NEST.top + 0.12, NEST.z); near.add(treat);
    solids.push([NEST.x, NEST.z, NEST.r + 0.05]);
    near.traverse(noShadow);
    /* NEAR: a LOD switches the small things off past NEAR metres (the renderer updates it each frame) */
    const lod = new T.LOD(); lod.name = 'cave:lod'; lod.addLevel(near, 0); lod.addLevel(new T.Object3D(), NEAR); g.add(lod);   // world metres from the LOD's world position (g's HS scale does not touch it)

    /* ── the walkable top (the html's groundAt, inside the record's rectangle): the dome, the portal's top ── */
    const roofAt = (lx, lz) => {
      let top = outerY(lx, lz);
      /* over the mouth's front, up to the record's edge: the rock over the arch (so a step from the ledge into the mouth is a
         tall step, which is the game's door test - the cabins' |L.x| < 0.6 sits inside the 0.75 mouth) */
      if (Math.abs(lx) <= D.PW && lz > 0 && lz <= D.zF + 0.1) top = Math.max(top, Math.min(portalTop(lx), FT + MJ + MA + 0.45));
      return top;
    };
    /* where the bird may NOT stand inside: outside the floor (but in the tunnel), the clusters, the nest's stone */
    const solid = (lx, lz) => {
      if (Math.abs(lx) < MW - 0.22 && lz > D.zB) return lz > D.zF + 0.6;   // the tunnel, out to the ledge
      if (superQ(lx, lz, IW - 0.32, ID - 0.32, n) > 1) return true;
      for (const [x, z, r] of solids) if (Math.hypot(lx - x, lz - z) < r + 0.18) return true;
      return false;
    };
    const reach = { x: NEST.x - 0.62, z: NEST.z + 0.55 };   // in front of the nest's stone, toward the room's middle
    let tris = 0, meshes = 0; g.traverse((o) => { if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } if (o.isSprite) meshes++; });
    return {
      g, rockMesh, near, lod, shaft: shaftMesh, nestMesh, keepsake: { g: treat, reach, type: KEEPSAKES.feather }, roofAt, solid, solids,
      cam: { x: -1.35, y: 1.85, z: 1.0 }, nestAt: { x: NEST.x, y: NEST.top + 0.1, z: NEST.z },
      stats: { meshes, triangles: Math.round(tris), drawCallsNear: meshes, drawCallsFar: 1 },
    };
  }

  /* ═════════ place it: the game's houses[] record ═════════ */
  function gridSampler(H, grid) {   // the island mesh's own height: PlaneGeometry(size, size, seg, seg), faces (a,b,d) (b,c,d)
    const size = grid && grid.size || 720, seg = grid && grid.seg || 150, CELL = size / seg, half = size / 2;
    return (x, z) => {
      const fx = (x + half) / CELL, fz = (z + half) / CELL, ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
      const x0 = -half + ix * CELL, z0 = -half + iz * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
      const ha = H(x0, z0), hb = H(x0, z1), hc = H(x1, z1), hd = H(x1, z0);
      return u + v <= 1 ? ha + (hd - ha) * u + (hb - ha) * v : hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
    };
  }
  function place(THREE, ctx) {
    T = THREE; ctx = ctx || {};
    const H = ctx.H, HS = ctx.HS || 1.6, s0 = SITE;
    if (typeof H !== 'function') throw new Error('WFR_CAVE.place: ctx.H (the terrain height) is required');
    const c = Math.cos(s0.rot), sn = Math.sin(s0.rot);
    const toW = (lx, lz) => ({ x: s0.x + (lx * c + lz * sn) * HS, z: s0.z + (-lx * sn + lz * c) * HS });   // the game's toWorld
    const mesh = gridSampler(H, ctx.grid), gr = (x, z) => Math.max(H(x, z), mesh(x, z));
    let hi = -1e9, lo = 1e9;
    for (let lx = -D.OW; lx <= D.OW + 1e-9; lx += 0.2) for (let lz = -D.OD; lz <= D.ledgeZ1 + 1e-9; lz += 0.2) {
      const room = superQ(lx, lz, D.IW + 0.1, D.ID + 0.1, D.n) <= 1 || (Math.abs(lx) <= D.PW && lz >= 0 && lz <= D.zF) || inLedge(lx, lz);
      const p = toW(lx, lz), g = gr(p.x, p.z);
      if (room) hi = Math.max(hi, g);   // nothing of the hill above the floor in the room, the tunnel or on the ledge
      if (room || superQ(lx, lz, D.OW + 0.3, D.OD + 0.3, D.n) <= 1) lo = Math.min(lo, Math.min(g, H(p.x, p.z)));
    }
    const y = hi + 0.05;
    const ground = (lx, lz) => { const p = toW(lx, lz); return (gr(p.x, p.z) - y) / HS; };
    const cave = build(THREE, { renderer: ctx.renderer, ground, bottom: (lo - y) / HS - 0.4, day: ctx.day, HS });
    cave.g.scale.setScalar(HS); cave.g.position.set(s0.x, y, s0.z); cave.g.rotation.y = s0.rot;
    const ledgeTop = y + D.FT * HS;
    const ledgeAt = (x, z) => { const dx = x - s0.x, dz = z - s0.z, lx = (dx * c - dz * sn) / HS, lz = (dx * sn + dz * c) / HS; return inLedge(lx, lz) ? ledgeTop : -Infinity; };
    const sp = toW(0, D.zF + 1.2);
    return {
      i: ctx.first == null ? 16 : ctx.first, g: cave.g, x: s0.x, z: s0.z, y, rot: s0.rot, w: D.w, d: D.d, ht: D.FT + D.HC,
      pivot: new T.Object3D(), openT: Infinity, treat: cave.keepsake.g, treatTaken: false, cabin: true, cave: true,
      id: s0.id, name: s0.name, who: null, keepsake: cave.keepsake.type, reach: cave.keepsake.reach, roofAt: cave.roofAt, solid: cave.solid,
      lookUp: 0.35 /* world metres */, cam: cave.cam, windowMats: [], windows: [], ledgeAt, ledgeTop, spot: { x: sp.x, z: sp.z, name: 'cave' },
      lo, hi, stats: cave.stats, nestAt: cave.nestAt, parts: { rock: cave.rockMesh, near: cave.near, lod: cave.lod, shaft: cave.shaft, nest: cave.nestMesh }, dims: Object.assign({}, D),
    };
  }

  /* ═════════ the old nests outdoors ═════════ */
  function nests(THREE, ctx) {
    T = THREE; ctx = ctx || {};
    const HS = ctx.HS || 1.6, out = [], eagle = typeof ctx.eagle === 'function' ? ctx.eagle : () => true;
    for (const N of OLD) {
      let x, y, z, tree = null, off = null;
      if (N.on === 'tree') {
        const trees = ctx.trees || []; let bd = 1e9;
        trees.forEach((t, i) => { const d = Math.hypot(t.x - N.near.x, t.z - N.near.z); if (d < bd) { bd = d; tree = i; } });
        if (tree == null) continue;
        const t = trees[tree]; x = t.x; z = t.z; y = t.top; off = bd;
      } else { if (!ctx.lightTop) continue; x = ctx.lightTop.x; y = ctx.lightTop.y; z = ctx.lightTop.z; }
      const g = new T.Group(); g.name = 'oldnest:' + N.id; g.position.set(x, y - 0.06, z); g.scale.setScalar(HS);
      const near = new T.Group(); near.name = 'oldnest:' + N.id + ':near';
      const nestMesh = new T.Mesh(merge(nestParts(0, 0, 0, 1)), mat('nest', () => new T.MeshLambertMaterial({ vertexColors: true })));
      nestMesh.name = 'oldnest:' + N.id + ':twigs'; near.add(nestMesh);
      const gate = new T.Group(); gate.name = 'oldnest:' + N.id + ':gate'; near.add(gate);   // the keepsake's switch: near enough, and (the down) after the Eagle
      const treat = keepsakeModel(N.keepsake); treat.position.set(0, 0.1, 0); gate.add(treat);
      const at = new T.Vector3(); let wasNear = true;
      gate.visible = !N.after;   // the game's state is not up yet at build time (S is declared later): the first draw decides
      nestMesh.onBeforeRender = function (r, sc, cam) {   // the nest is drawn: decide the keepsake (one frame late at most)
        if (!cam || !cam.isPerspectiveCamera) return;
        at.setFromMatrixPosition(g.matrixWorld); const nearNow = cam.position.distanceTo(at) < KEEP_NEAR;
        let ok = nearNow; if (N.after === 'eagle') { let e = false; try { e = !!eagle(); } catch (x) { e = false; } ok = ok && e; }
        if (gate.visible !== ok) gate.visible = ok; wasNear = nearNow;
      };
      near.traverse(noShadow);
      const lod = new T.LOD(); lod.addLevel(near, 0); lod.addLevel(new T.Object3D(), NEST_FAR); g.add(lod);
      out.push({ id: N.id, name: N.name, keepsake: KEEPSAKES[N.keepsake], x, y, z, g, treat, gate, taken: false, after: N.after || null, tree, treeOff: off });
    }
    return out;
  }

  return { place, build, nests, KEEPSAKES, keepsake, register, SITE, OLD, TOTAL: 7, dims: D, NEAR };
})();
