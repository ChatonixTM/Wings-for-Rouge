/* ═══════════════════════════════════════════════════════════════════════════
   WFR_TREES — the forest of "Wings for Rouge" (Oct 8 2026).

   Marth: "the trees need to be more designed too please" — and the bar is
   Fly Like a Bird 3: nostalgic but polished. So the island grows an ECOLOGY
   instead of one cone-tree stamped 260 times:
     pine     layered tiers with drooping, star-tipped branch skirts (lowlands, slopes, shore)
     fir      a tall dark spire of seven narrow tiers (the higher slopes)
     krumm    small wind-bent mountain pines, all flagged the same way (near the snowline)
     oak      a round broadleaf crown of lumpy clumps on a forked trunk (meadows) — some in autumn
     birch    slim white trunks with dark marks, airy oval crowns (round the lake)
     snag     a dead silver trunk, broken top, bare limbs (here and there)
   and under them: bushes, ferns and the odd stump (decoration — not perches).

   ⭐ PERFORMANCE IS THE LAW: one InstancedMesh per species-part — 12 draw calls for
   the whole forest. All geometry is unit-sized and shared; every tree is a matrix
   (position, yaw, a small lean, scale) and a colour. Canopies carry VERTEX-COLOUR
   shading (dark beneath and inside, warm-light on top), so they read with depth
   even under flat light; the instance colour multiplies on top of it.

   API
     WFR_TREES.plant(THREE, specs, opts) → { meshes, tops, kinds, radii, fruit, update(t), stats }
       specs  the game's treeSpecs [{ x, z, s, y }]  (y = ground - 0.2, as tree() pushes it)
       opts   { renderer,            textures + sRGB detection
                linear,              convert colours sRGB→linear (default: renderer outputs sRGB)
                H(x, z),             the island height (for understory; else the tree's own y)
                water,               WATER level (default 1.2): no bushes in the sea
                lake, peaks,         {x,z} (defaults: the game's LAKE and PEAKS)
                fruitEvery, fruitMax the game's fruit rule (every 9th tree, 16 of them):
                                     those trees are always broadleaf, so apples never hang on a pine
                kindOf(spec, i)      override the species choice (the preview uses it)
                understory           false = no bushes/ferns/stumps
                wind                 sway amplitude (default 1; 0 = still) }
       meshes  [InstancedMesh] — add each to the scene (frustumCulled = false)
       tops    [number] per spec — the landable top in world y (replaces y - 0.2 + 7.2*s)
       radii   [number] per spec — a perch/collision half-width (≈ 0.9*s, as before)
       kinds   [string] per spec
       fruit   [{x,y,z}] per spec — a point just OUTSIDE the crown at mid-height
               (on +x+z, like the game's t.x+1.4, t.top-2.2, t.z+1.4) for the fruit sprite
       update(t) seconds — drives the wind sway (one uniform; free if never called)

     WFR_TREES.bigTree(THREE, opts) → THREE.Group, in the OLD UNIT SPACE: the base at
       y = 0, the nest seat on the central leader's flat top at y = 15 (unchanged), an
       open crown above it (no leaf within r 2.9 of the axis above y 14.4), so the nest,
       the gold ring, the treehouse and the nest cameras all stay where they were.
       The game still does g.scale.setScalar(BIG); g.position.set(MOUND.x, bigY - 0.3, MOUND.z).
       Its leaf material sways too: pass the same update via WFR_TREES.update(t).

     WFR_TREES.update(t) — sets the shared wind clock for everything this file built.
   ═══════════════════════════════════════════════════════════════════════════ */
window.WFR_TREES = (function () {
  'use strict';

  /* ── deterministic hash: the forest never touches the game's rnd() (every later seed stays put) ── */
  function hash(x, z, k) {
    let h = Math.imul((x * 73.13 + 0.5) | 0, 374761393) ^ Math.imul((z * 91.71 + 0.5) | 0, 668265263) ^ Math.imul(k + 1, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function rng(seed) {
    let a = seed | 0;
    return function () { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  const wind = { value: 0 };   // ONE clock for every canopy material this file makes
  const sunXZ = { value: null };   // 578: the sun's side of every crown is lit warm (a Vector2 made when the first materials are)

  /* ═════════ geometry builder: non-indexed position / normal / uv / colour ═════════ */
  function Builder(T) { this.T = T; this.p = []; this.n = []; this.uv = []; this.c = []; }
  /* add(geo, matrix, shade(x,y,z, faceIndex) → [r,g,b], flat) — the geometry is transformed, then shaded
     in its transformed (unit-tree) space. flat = recompute per-face normals (faceted canopies). */
  Builder.prototype.add = function (geo, m, shade, flat) {
    const T = this.T;
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!flat && !g.attributes.normal) g.computeVertexNormals();
    if (m) g.applyMatrix4(m);
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    const v = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3(), cr = new T.Vector3();
    for (let i = 0; i < P.count; i += 3) {
      if (flat) {
        v.fromBufferAttribute(P, i); a.fromBufferAttribute(P, i + 1); b.fromBufferAttribute(P, i + 2);
        cr.subVectors(b, a).cross(v.clone().sub(a)).normalize();
      }
      for (let j = 0; j < 3; j++) {
        const k = i + j, x = P.getX(k), y = P.getY(k), z = P.getZ(k);
        this.p.push(x, y, z);
        if (flat) this.n.push(cr.x, cr.y, cr.z); else this.n.push(N.getX(k), N.getY(k), N.getZ(k));
        this.uv.push(U ? U.getX(k) : 0, U ? U.getY(k) : 0);
        const s = shade ? shade(x, y, z, i / 3) : [1, 1, 1];
        this.c.push(s[0], s[1], s[2]);
      }
    }
    g.dispose();
    return this;
  };
  /* raw triangles (for the hand-built tiers and fronds); verts [[x,y,z,u,v],...] */
  /* up: +1 = this face must look upward, -1 = downward (the winding is fixed to match), 0/undefined = as given */
  Builder.prototype.tri = function (A, B, C, shade, up) {
    const T = this.T, a = new T.Vector3(A[0], A[1], A[2]), b = new T.Vector3(B[0], B[1], B[2]), c = new T.Vector3(C[0], C[1], C[2]);
    const n = new T.Vector3().subVectors(c, b).cross(new T.Vector3().subVectors(a, b)).normalize();
    if (up && n.y * up < 0) { const t = B; B = C; C = t; n.negate(); }
    [A, B, C].forEach((V) => {
      this.p.push(V[0], V[1], V[2]); this.n.push(n.x, n.y, n.z); this.uv.push(V[3] || 0, V[4] || 0);
      const s = shade ? shade(V[0], V[1], V[2]) : [1, 1, 1]; this.c.push(s[0], s[1], s[2]);
    });
  };
  Builder.prototype.geometry = function () {
    const T = this.T, g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    return g;
  };

  /* a tapered limb from point A to point B (radii r0 at A, r1 at B), bark UVs scaled to its length */
  function limb(T, B, A, Bp, r0, r1, seg, hseg, shade, uvk) {
    const a = new T.Vector3().fromArray(A), b = new T.Vector3().fromArray(Bp), d = new T.Vector3().subVectors(b, a), len = d.length();
    const geo = new T.CylinderGeometry(r1, r0, len, seg || 6, hseg || 1, true);
    const U = geo.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * (uvk || 1), U.getY(i) * len * 0.5 * (uvk || 1));
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    const m = new T.Matrix4().compose(a.clone().lerp(b, 0.5), q, new T.Vector3(1, 1, 1));
    B.add(geo, m, shade, false); geo.dispose();
  }
  /* a trunk with a root flare and (optional) a jagged broken top */
  function trunk(T, B, h, r0, r1, opt) {
    opt = opt || {};
    const seg = opt.seg || 7, hs = opt.hseg || 4;
    const geo = new T.CylinderGeometry(r1, r0, h + 0.6, seg, hs, true);
    const P = geo.attributes.position, U = geo.attributes.uv, R = rng(opt.seed || 7);
    const jag = []; for (let k = 0; k < seg; k++) jag.push(R());
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i) + (h + 0.6) / 2 - 0.6, z = P.getZ(i);   // base at -0.6 (sunk into slopes)
      const flare = 1 + 0.75 * Math.pow(1 - sstep(-0.6, h * 0.22, y), 2);
      const ang = Math.atan2(z, x), lob = 1 + (opt.lobes ? 0.12 * Math.sin(ang * 5) * (1 - sstep(0, h * 0.3, y)) : 0);
      let yy = y;
      if (opt.broken && y > h - 0.01) { const k = Math.round(((ang + Math.PI) / (Math.PI * 2)) * seg) % seg; yy = h - jag[k] * opt.broken; }
      const bend = opt.bend ? opt.bend * Math.pow(Math.max(0, y) / h, 2) : 0;
      P.setXYZ(i, x * flare * lob + bend, yy, z * flare * lob);
      U.setXY(i, U.getX(i) * (opt.uvx || 2), (y + 0.6) * (opt.uvy || 0.5));
    }
    geo.computeVertexNormals();
    B.add(geo, null, opt.shade, false); geo.dispose();
  }

  /* shading helpers — multiplicative factors (the instance colour carries the species colour) */
  function canopyShade(y0, y1, cx, cz, rIn) {
    return function (x, y, z) {
      const t = clamp01((y - y0) / (y1 - y0));
      const out = clamp01(Math.hypot(x - (cx || 0), z - (cz || 0)) / (rIn || 2));
      let s = 0.4 + 0.64 * Math.pow(t, 0.8);          // dark beneath, bright crown
      s *= 0.7 + 0.3 * out;                            // dark inside, lit at the rim
      s *= 0.93 + 0.14 * hash(x * 2.3, z * 2.3 + y * 1.7, 578);   // 578: a soft dapple of leaf clusters (same point, same value: no seams)
      const warm = 0.11 * sstep(0.45, 1, t) * (0.6 + 0.4 * out), cool = 0.09 * (1 - sstep(0, 0.5, t));   // gold where the sun lands, blue-green in the shade
      return [s * (1 + warm - cool * 0.6), s * (1 + warm * 0.55), s * (1 - warm * 0.9 + cool)];
    };
  }
  const woodShade = (h) => (x, y) => { const s = 0.62 + 0.38 * sstep(-0.6, h * 0.5, y), m = 1 - sstep(-0.6, h * 0.3, y); return [s * (1 - 0.3 * m), s * (1 - 0.06 * m), s * (1 - 0.46 * m)]; };   // 578: a green-moss foot

  /* one drooping conifer tier: N star tips, a convex upper skirt, a concave underside (hand-built) */
  function tier(T, B, y, r, h, N, rot, shade, opt) {
    opt = opt || {};
    const tip = [opt.ox || 0, y + h, opt.oz || 0], under = [0, y + h * 0.28, 0], spokes = N * 2;
    const rim = [], mid = [];
    for (let k = 0; k < spokes; k++) {
      const a = rot + k / spokes * Math.PI * 2, long = k % 2 === 0;
      const rr = r * (long ? 1 : 0.72) * (opt.flag ? 1 + opt.flag * Math.cos(a) : 1);
      const drop = long ? h * 0.22 : 0;
      rim.push([Math.cos(a) * rr + (opt.ox || 0) * 0.3, y - drop, Math.sin(a) * rr + (opt.oz || 0) * 0.3, k / spokes * 3, 0]);
      mid.push([Math.cos(a) * rr * 0.52 + (opt.ox || 0) * 0.6, y + h * 0.5 + (long ? 0.02 : 0.06) * h, Math.sin(a) * rr * 0.52 + (opt.oz || 0) * 0.6, k / spokes * 3, 0.5]);
    }
    const tp = tip.concat([1.5, 1]), un = under.concat([1.5, 0.2]);
    for (let k = 0; k < spokes; k++) {
      const k2 = (k + 1) % spokes;
      B.tri(tp, mid[k2], mid[k], shade, 1);
      B.tri(mid[k], mid[k2], rim[k2], shade, 1); B.tri(mid[k], rim[k2], rim[k], shade, 1);
      B.tri(un, rim[k], rim[k2], shade, -1);
    }
  }
  /* a lumpy clump: an icosahedron whose shared vertices are pushed in/out by a position hash (no cracks) */
  function clump(T, B, cx, cy, cz, r, detail, seed, shade, sq) {
    const geo = new T.IcosahedronGeometry(1, detail);
    const P = geo.attributes.position, U = geo.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const n = hash(x * 13.1, z * 17.3 + y * 7.7, seed);
      const k = r * (0.84 + 0.3 * n);
      const flat = y < -0.35 ? 0.78 : 1;                // flatter, heavier underside
      P.setXYZ(i, cx + x * k * (sq ? sq[0] : 1), cy + y * k * flat * (sq ? sq[1] : 1), cz + z * k * (sq ? sq[2] : 1));
      U.setXY(i, U.getX(i) * 2, U.getY(i) * 2);
    }
    B.add(geo, null, shade, true); geo.dispose();
  }

  /* ═════════ the species: unit geometry (s = 1 means the old 7.2-tall tree) ═════════ */
  const SPECIES = {};
  function buildSpecies(T) {
    if (SPECIES.done) return SPECIES;
    let B;

    /* PINE: 5 drooping tiers from 1.7 to a spire at 7.2 */
    B = new Builder(T);
    { const sh = canopyShade(1.2, 7.2, 0, 0, 2.2);
      const tiers = [[1.7, 2.35, 1.7], [2.75, 2.0, 1.6], [3.75, 1.62, 1.5], [4.7, 1.22, 1.4], [5.55, 0.82, 1.65]];
      tiers.forEach((t, i) => tier(T, B, t[0], t[1], t[2], 6, i * 0.45, sh)); }
    SPECIES.pine = { canopy: B.geometry(), top: 7.2, r: 0.9 };
    /* FIR: 7 narrow tiers, a long spire to 7.6 */
    B = new Builder(T);
    { const sh = canopyShade(0.9, 7.6, 0, 0, 1.6);
      for (let i = 0; i < 7; i++) { const f = i / 6; tier(T, B, 1.0 + f * 5.0, 1.75 * (1 - f) + 0.38, 1.35 - f * 0.1 + (i === 6 ? 0.9 : 0), 5, i * 0.7, sh); } }
    SPECIES.fir = { canopy: B.geometry(), top: 7.6, r: 0.85 };
    /* KRUMM: a small wind-bent pine; its tiers are flagged to leeward (+x) and the spire leans after them */
    B = new Builder(T);
    { const sh = canopyShade(1.0, 4.9, 0.5, 0, 1.6);
      [[1.1, 1.55, 1.0, 0.1], [1.9, 1.35, 0.95, 0.3], [2.7, 1.05, 0.9, 0.55], [3.5, 0.7, 1.3, 0.85]].forEach((t, i) =>
        tier(T, B, t[0], t[1], t[2], 5, i * 0.9, sh, { flag: 0.45, ox: t[3], oz: 0 })); }
    SPECIES.krumm = { canopy: B.geometry(), top: 4.8, r: 0.8 };
    /* OAK: a broad crown of lumpy clumps at different heights (never one flat slab), top ≈ 7.0 */
    B = new Builder(T);
    { const sh = canopyShade(3.3, 7.1, 0, 0, 2.6), R = rng(4401);
      clump(T, B, 0, 5.35, 0, 1.75, 1, 11, sh);
      const ring = [[0.0, 1.55, 4.85, 1.3, 1], [1.4, 1.6, 4.4, 1.1, 0], [2.6, 1.5, 5.15, 1.25, 1], [3.9, 1.65, 4.55, 1.15, 0], [5.1, 1.5, 5.25, 1.1, 0]];
      ring.forEach((c, k) => clump(T, B, Math.cos(c[0]) * c[1], c[2] + R() * 0.25, Math.sin(c[0]) * c[1], c[3] * (0.95 + R() * 0.12), c[4], 20 + k, sh));
      clump(T, B, 0.45, 6.25, -0.35, 0.95, 0, 31, sh); }
    SPECIES.oak = { canopy: B.geometry(), top: 7.0, r: 0.95 };
    /* BIRCH: an airy, taller-than-wide crown — small overlapping clumps wound up the stem, hanging a little */
    B = new Builder(T);
    { const sh = canopyShade(3.0, 7.4, 0, 0, 1.3), R = rng(5501);
      for (let k = 0; k < 9; k++) {
        const f = k / 8, a = k * 2.4, rr = 0.55 * Math.sin(Math.PI * (0.15 + f * 0.8)) + 0.12;
        clump(T, B, Math.cos(a) * rr, 3.7 + f * 2.85, Math.sin(a) * rr, (0.62 + 0.22 * Math.sin(Math.PI * (0.1 + f * 0.85))) * (0.92 + R() * 0.16), k === 2 || k === 6 ? 1 : 0, 60 + k, sh, [1, 1.18, 1]);
      } }
    SPECIES.birch = { canopy: B.geometry(), top: 7.3, r: 0.7 };

    /* WOOD (one shared bark material; instance colour gives brown / white / silver) */
    B = new Builder(T); trunk(T, B, 6.4, 0.42, 0.08, { seg: 7, hseg: 4, shade: woodShade(6.4), lobes: true });
    SPECIES.woodStraight = B.geometry();                   // pine + fir + stumps
    B = new Builder(T);
    { const ws = woodShade(4.5); trunk(T, B, 3.3, 0.5, 0.3, { seg: 8, hseg: 3, shade: ws, lobes: true });
      [[0.4, 2.6, 0.3, 1.5, 4.7, 0.9], [-0.3, 2.9, 0.35, -1.4, 4.9, 1.0], [0.1, 3.0, -0.4, 0.3, 5.0, -1.5], [0, 3.2, 0, 0.1, 5.6, 0.2]].forEach((L) =>
        limb(T, B, [L[0], L[1], L[2]], [L[3], L[4], L[5]], 0.26, 0.08, 5, 1, ws)); }
    SPECIES.woodOak = B.geometry();
    B = new Builder(T);
    { // birch: white, with dark lenticel bands painted per FACE (crisp marks), and two thin branches
      // the CylinderGeometry walks rows then columns, two triangles per quad: quad q = row * seg + col.
      // Each row may carry one band 2–3 quads wide (the horizontal lenticels); the foot is darker and rougher.
      const R = rng(808), SEG = 7, ROWS = 14, band = [];
      for (let r = 0; r < ROWS; r++) { const foot = r >= ROWS - 2; band.push(R() < (foot ? 0.9 : 0.5) ? { c0: Math.floor(R() * SEG), n: foot ? 4 + Math.floor(R() * 3) : 1 + Math.floor(R() * 3), v: 0.1 + R() * 0.12 } : null); }
      const shade = (x, y, z, f0) => {
        const q = f0 >> 1, row = Math.floor(q / SEG), col = q % SEG, b = band[row];
        const hit = b && ((col - b.c0 + SEG) % SEG) < b.n, s = hit ? b.v : 1.06 + ((q * 7919) % 13) / 130;
        return [s, s, s];
      };
      trunk(T, B, 6.6, 0.2, 0.06, { seg: SEG, hseg: ROWS, shade: shade, uvx: 1, uvy: 0.3 });
      limb(T, B, [0, 4.2, 0], [0.7, 5.4, 0.3], 0.07, 0.03, 4, 1, woodShade(6)); limb(T, B, [0, 4.8, 0], [-0.6, 5.9, -0.2], 0.06, 0.03, 4, 1, woodShade(6)); }
    SPECIES.woodBirch = B.geometry();
    B = new Builder(T);
    { const ws = woodShade(4.2); trunk(T, B, 4.3, 0.42, 0.24, { seg: 7, hseg: 3, shade: ws, broken: 0.9, seed: 13, lobes: true });
      [[0, 2.2, 0, 1.3, 3.4, 0.2, 0.12], [0, 2.9, 0, -0.9, 4.0, 0.6, 0.1], [0, 3.3, 0, 0.2, 4.1, -1.0, 0.09], [0, 1.6, 0, -0.7, 1.9, -0.5, 0.09]].forEach((L) =>
        limb(T, B, [L[0], L[1], L[2]], [L[3], L[4], L[5]], L[6], 0.025, 4, 1, ws));
      limb(T, B, [1.3, 3.4, 0.2], [1.6, 4.2, 0.1], 0.05, 0.02, 4, 1, ws); }
    SPECIES.woodSnag = B.geometry();
    B = new Builder(T);
    { const ws = woodShade(3.5); trunk(T, B, 3.6, 0.36, 0.08, { seg: 6, hseg: 4, shade: ws, bend: 0.7 }); }
    SPECIES.woodBent = B.geometry();

    /* UNDERSTORY */
    B = new Builder(T);
    { const sh = canopyShade(-0.2, 1.2, 0, 0, 1.0);
      clump(T, B, 0, 0.45, 0, 0.6, 0, 71, sh, [1.1, 0.85, 1.1]); clump(T, B, 0.5, 0.32, 0.25, 0.45, 0, 72, sh); clump(T, B, -0.4, 0.3, -0.3, 0.42, 0, 73, sh); clump(T, B, 0.05, 0.75, -0.05, 0.36, 0, 74, sh); }
    SPECIES.bush = B.geometry();
    B = new Builder(T);
    { // fern: 7 fronds that arch up and droop out, each a tapered 4-segment ribbon with a mid-rib fold
      const sh = (x, y) => { const s = 0.55 + 0.6 * clamp01(y / 0.7); return [s, s * 1.04, s * 0.9]; };
      for (let f = 0; f < 7; f++) {
        const a = f / 7 * Math.PI * 2 + (f % 2) * 0.25, len = 0.95 + (f % 3) * 0.2, ca = Math.cos(a), sa = Math.sin(a);
        let prev = null;
        for (let k = 0; k <= 3; k++) {
          const t = k / 3, d = t * len, y = 0.05 + Math.sin(t * Math.PI * 0.8) * 0.5 * len - t * t * 0.2;
          const w = 0.3 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.12)) + 0.02, px = ca * d, pz = sa * d;
          const L = [px - sa * w, y - 0.04, pz + ca * w, 0, t], M = [px, y + 0.03, pz, 0.5, t], Rr = [px + sa * w, y - 0.04, pz - ca * w, 1, t];
          if (prev) { B.tri(prev[0], prev[1], M, sh, 1); B.tri(prev[0], M, L, sh, 1); B.tri(prev[1], prev[2], Rr, sh, 1); B.tri(prev[1], Rr, M, sh, 1); }
          prev = [L, M, Rr];
        }
      }
    }
    SPECIES.fern = B.geometry();
    /* every species' landable top = its built canopy's real top (Obito: fir spires stood 1.04-1.81 above the declared
       top - the bird landed impaled; oaks 0.4-0.7 short; birches she floated over) */
    for (const k of ['pine', 'fir', 'krumm', 'oak', 'birch']) { const gm = SPECIES[k].canopy; gm.computeBoundingBox(); SPECIES[k].top = gm.boundingBox.max.y; }
    SPECIES.woodSnag.computeBoundingBox(); SPECIES.snagTop = SPECIES.woodSnag.boundingBox.max.y;
    SPECIES.done = true;
    return SPECIES;
  }

  /* ═════════ textures: WFR_TEX's if it has them, else a small leaf / needle grain painted here ═════════ */
  const own = {};
  function paintTex(T, kind, renderer) {
    if (own[kind]) return own[kind];
    /* board 578: 256 px and painted in colour (a storybook leaf, not a grey stamp). Near-white leaves over cool dark
       gaps, each leaf with a warm sunlit face, a cooler shaded half and a pale midrib; the crown's vertex colour and
       the tree's instance colour still give the green, the texture gives the light inside it. */
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), R = rng(kind === 'leaf' ? 91 : 92);
    const wrap = (x, y, r, fn) => { for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) { const px = x + ox, py = y + oy; if (px + r < 0 || px - r > S || py + r < 0 || py - r > S) continue; fn(px, py); } };
    const rgb = (r, gg, b) => 'rgb(' + Math.max(0, Math.min(255, r | 0)) + ',' + Math.max(0, Math.min(255, gg | 0)) + ',' + Math.max(0, Math.min(255, b | 0)) + ')';
    if (kind === 'leaf') {
      g.fillStyle = rgb(118, 128, 124); g.fillRect(0, 0, S, S);   // the deep, cool gaps between leaves
      for (let i = 0; i < 260; i++) {   // soft dark depth first: shadowed leaves further in
        const x = R() * S, y = R() * S, rr = 8 + R() * 10, a = R() * Math.PI, l = 140 + R() * 40;
        wrap(x, y, rr, (px, py) => { g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = rgb(l * 0.92, l, l * 0.96); g.beginPath(); g.ellipse(0, 0, rr, rr * 0.5, 0, 0, Math.PI * 2); g.fill(); g.restore(); });
      }
      for (let i = 0; i < 1250; i++) {   // the lit leaves: a shadow under each, a cool half, a warm half, a midrib
        const x = R() * S, y = R() * S, rr = 6 + R() * 8, a = R() * Math.PI, l = 205 + R() * 50, warm = R(), sz = rr * 0.52;
        const wr = 1 + 0.06 * warm, wg = 1 + 0.02 * warm, wb = 1 - 0.12 * warm;   // some leaves lean sun-yellow, some cool
        wrap(x, y, rr + 2, (px, py) => {
          g.save(); g.translate(px, py); g.rotate(a);
          g.fillStyle = rgb(l * 0.5, l * 0.56, l * 0.55); g.beginPath(); g.ellipse(1.4, 1.6, rr, sz, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = rgb(l * 0.86 * wr, l * 0.9 * wg, l * 0.88 * wb); g.beginPath(); g.ellipse(0, 0, rr, sz, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = rgb(l * wr, l * wg, l * wb); g.beginPath(); g.ellipse(0, -sz * 0.18, rr * 0.92, sz * 0.62, 0, Math.PI, Math.PI * 2); g.fill();
          g.strokeStyle = rgb(l * 1.08, l * 1.1, l * 0.98); g.lineWidth = 0.9; g.beginPath(); g.moveTo(-rr * 0.85, 0); g.lineTo(rr * 0.8, 0); g.stroke();
          g.restore();
        });
      }
      for (let i = 0; i < 90; i++) {   // a few glints where the sun strikes a leaf edge
        const x = R() * S, y = R() * S, rr = 2 + R() * 2.5;
        wrap(x, y, rr, (px, py) => { g.fillStyle = 'rgba(255,255,236,0.55)'; g.beginPath(); g.ellipse(px, py, rr, rr * 0.55, R() * Math.PI, 0, Math.PI * 2); g.fill(); });
      }
    } else {
      g.fillStyle = rgb(150, 160, 156); g.fillRect(0, 0, S, S);
      for (let i = 0; i < 2600; i++) {   // needles: short strokes mostly running down the branch, dark under, lit over
        const x = R() * S, y = R() * S, len = 8 + R() * 14, a = Math.PI / 2 + (R() - 0.5) * 1.2, dark = R() < 0.45, l = dark ? 105 + R() * 45 : 215 + R() * 40;
        const tint = dark ? [0.9, 1, 1.02] : (R() < 0.3 ? [1.04, 1.03, 0.9] : [1, 1, 0.97]);
        wrap(x, y, len + 2, (px, py) => { g.strokeStyle = rgb(l * tint[0], l * tint[1], l * tint[2]); g.lineWidth = dark ? 2.2 : 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); g.stroke(); });
      }
    }
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
    const lin = renderer && renderer.outputEncoding !== undefined && renderer.outputEncoding !== T.sRGBEncoding;
    t.encoding = lin ? T.LinearEncoding : T.sRGBEncoding;
    own[kind] = t; return t;
  }
  function texFor(T, kind, renderer) {
    const X = window.WFR_TEX, names = X && X.names ? X.names : [];
    const want = kind === 'leaf' ? ['leaves', 'leaf', 'foliage'] : kind === 'needle' ? ['needles', 'needle'] : ['barkTree', 'bark'];   // 578: the forest's own colour bark first
    for (const n of want) if (names.indexOf(n) >= 0) { try { return X.get(n, renderer); } catch (e) { /* fall through */ } }
    return kind === 'bark' ? null : paintTex(T, kind, renderer);
  }

  let blob = null;
  function blobTex(T) {
    if (blob) return blob;
    const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    blob = new T.CanvasTexture(c); return blob;
  }

  /* ═════════ materials: MeshStandard, vertex colours × instance colours, wind on the leaves ═════════ */
  function swayable(mat, amp, flut) {
    mat.onBeforeCompile = function (shader) {
      shader.uniforms.uWindT = wind; shader.uniforms.uWindA = { value: amp }; shader.uniforms.uFlut = { value: flut || 0 }; shader.uniforms.uSunXZ = sunXZ;
      shader.vertexShader = 'uniform float uWindT;\nuniform float uWindA;\nuniform float uFlut;\nuniform vec2 uSunXZ;\n' + shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        '#ifdef USE_INSTANCING\n  float wPh = instanceMatrix[3][0] * 0.13 + instanceMatrix[3][2] * 0.09;\n#else\n  float wPh = 0.0;\n#endif\n' +
        '  float wUp = max(transformed.y - 1.0, 0.0);\n' +
        '  float wK = wUp * uWindA * (1.0 + 0.3 * sin(uWindT * 0.41 + wPh * 0.5) * sin(uWindT * 0.23 + 1.7));\n' +
        '  transformed.x += (sin(uWindT * 1.35 + wPh) + 0.35 * sin(uWindT * 3.1 + wPh * 2.0 + transformed.y)) * wK;\n' +
        '  transformed.z += cos(uWindT * 1.05 + wPh * 1.4) * wK * 0.6;\n' +
        '  float wF = uWindT * 4.3 + dot(position, vec3(2.9, 3.7, 2.3)) + wPh * 3.0;\n' +
        '  transformed += vec3(sin(wF), 0.5 * sin(wF * 1.3 + 1.1), cos(wF * 0.9 + 0.4)) * uFlut * min(wUp, 3.0);\n' +
        '#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )\n' +
        '#ifdef USE_INSTANCING\n  vec3 wR = mat3(instanceMatrix) * position; float wRk = 2.6;\n#else\n  vec3 wR = position; float wRk = 7.0;\n#endif\n' +
        '  float wSun = dot(normalize(wR.xz + vec2(1e-4)), uSunXZ) * smoothstep(0.0, wRk, length(wR.xz));\n' +
        '  vColor.xyz *= vec3(1.0 + 0.16 * wSun, 1.0 + 0.11 * wSun, 1.0 + 0.02 * wSun);\n' +
        '#endif\n');
    };
    return mat;
  }
  function materials(T, renderer, amp, sunDir) {
    if (!sunXZ.value) { const sd = sunDir || { x: 60, y: 90, z: 30 }; sunXZ.value = new T.Vector2(sd.x, sd.z).normalize(); }   // the game's sun (60, 90, 30)
    const bark = texFor(T, 'bark', renderer), barkBump = bark && window.WFR_TEX ? (function () { try { return WFR_TEX.get((WFR_TEX.names.indexOf('barkTree') >= 0 ? 'barkTree' : 'bark') + 'Bump', renderer); } catch (e) { return null; } }()) : null;
    const wood = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, metalness: 0, map: bark || null });
    if (barkBump) { wood.bumpMap = barkBump; wood.bumpScale = 0.04; }
    const leaf = swayable(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9, metalness: 0, map: texFor(T, 'leaf', renderer) }), 0.014 * amp, 0.012 * amp);
    const needle = swayable(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.92, metalness: 0, map: texFor(T, 'needle', renderer) }), 0.009 * amp, 0.005 * amp);
    const fern = swayable(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.85, metalness: 0, side: T.DoubleSide, map: texFor(T, 'needle', renderer) }), 0.05 * amp, 0.01 * amp);
    return { wood, leaf, needle, fern };
  }

  /* ═════════ palettes (sRGB hex; converted to linear when the renderer outputs sRGB) ═════════ */
  const PAL = {
    pine: [0x2f6235, 0x2a5a31, 0x376c39, 0x3d733b, 0x2d5d3a, 0x44793c, 0x27543a],   // 578: from sunny pine to deep blue-green
    fir: [0x2c5e45, 0x285a40, 0x32684c, 0x2a5847, 0x234f40, 0x3a7052],
    krumm: [0x3b5f3c, 0x45683e, 0x36583a, 0x4a6e40],
    oak: [0x4f9142, 0x5a9b45, 0x68a84a, 0x478640, 0x5fa040, 0x7ab84c, 0x3e7a3a, 0x86c052],   // fresh spring lime to deep summer
    autumn: [0xd8892c, 0xd0642e, 0xe3b63a, 0xc4552c, 0xd9a02f, 0xb8452e, 0xe8c04a],   // amber, copper, russet, gold
    birch: [0x8dbb4c, 0x9cc657, 0x82b148, 0xa3c95e, 0xb3d066, 0x79a846],
    birchGold: [0xe6c444, 0xd9b23a, 0xf0d15a],
    bush: [0x58a044, 0x4f953f, 0x63aa48, 0x5a9a4c, 0x70b450, 0x47883e],
    fern: [0x6aaa40, 0x78b648, 0x5e9e3c, 0x86c050],
    bark: { pine: 0x7a5638, oak: 0x6f4c32, birch: 0xffffff, snag: 0xa79e92, krumm: 0x6a5442, stump: 0x8a6646 },
  };

  /* ═════════ the ecology: which tree grows where ═════════ */
  function chooseKind(sp, i, o) {
    const g = sp.y + 0.2, r = hash(sp.x, sp.z, 1), dl = Math.hypot(sp.x - o.lake.x, sp.z - o.lake.z), dp = Math.hypot((sp.x - o.peaks.x) * 0.8, sp.z - o.peaks.z);
    const fruit = o.fruitEvery > 0 && i % o.fruitEvery === 0 && i / o.fruitEvery < o.fruitMax;
    if (fruit) return g > 17 ? 'birch' : 'oak';                         // apples, pears, grapes hang on broadleaves
    if (g > 18.5 || (g > 15.5 && dp < 110)) return r < 0.08 ? 'snag' : r < 0.82 ? 'krumm' : 'fir';
    if (g > 12.5) return r < 0.05 ? 'snag' : r < 0.5 ? 'fir' : r < 0.82 ? 'pine' : r < 0.9 ? 'krumm' : 'birch';
    if (dl < 62) return r < 0.5 ? 'birch' : r < 0.78 ? 'oak' : r < 0.95 ? 'pine' : 'snag';
    if (g < 4.6) return r < 0.5 ? 'pine' : r < 0.9 ? 'oak' : 'snag';     // the shore: wind-shaped pines and old oaks
    return r < 0.48 ? 'oak' : r < 0.76 ? 'pine' : r < 0.86 ? 'fir' : r < 0.95 ? 'birch' : 'snag';
  }

  /* ═════════ plant ═════════ */
  function plant(T, specs, opts) {
    opts = opts || {};
    const R = opts.renderer, lin = opts.linear != null ? !!opts.linear : !!(R && R.outputEncoding === T.sRGBEncoding);
    const o = {
      lake: opts.lake || { x: 48, z: -38 }, peaks: opts.peaks || { x: 70, z: 230 }, water: opts.water != null ? opts.water : 1.2,
      fruitEvery: opts.fruitEvery != null ? opts.fruitEvery : 9, fruitMax: opts.fruitMax != null ? opts.fruitMax : 16,
    };
    const S = buildSpecies(T), M = materials(T, R, opts.wind != null ? opts.wind : 1, opts.sunDir);
    const col = new T.Color(), C = (hex, mul, jx, jz) => { col.setHex(hex);
      if (jx !== undefined) col.offsetHSL((hash(jx, jz, 51) - 0.5) * 0.024, (hash(jx, jz, 52) - 0.4) * 0.14, (hash(jx, jz, 53) - 0.5) * 0.05);   // 578: each crown its own shade
      if (mul) col.multiplyScalar(mul); if (lin) col.convertSRGBToLinear(); return col; };
    const pick = (arr, u) => arr[Math.min(arr.length - 1, Math.floor(u * arr.length))];
    const Hf = opts.H || null;

    /* lists of instances per part: { m: Matrix4, c: Color } */
    const parts = {
      woodStraight: [], woodOak: [], woodBirch: [], woodSnag: [], woodBent: [],
      pine: [], fir: [], krumm: [], oak: [], birch: [], bush: [], fern: [],
    };
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3();
    const push = (part, x, y, z, yaw, lx, lz, sx, sy, sz, c) => {
      e.set(lx, yaw, lz, 'YXZ'); q.setFromEuler(e); p.set(x, y, z); sc.set(sx, sy, sz);
      parts[part].push({ m: new T.Matrix4().compose(p, q, sc), c: c.clone() });
    };
    const tops = [], radii = [], kinds = [], fruit = [], shadows = [];
    const windYaw = Math.PI * 0.15;                       // the prevailing wind on the peaks: every krumm flags the same way

    specs.forEach((sp, i) => {
      const kind = opts.kindOf ? opts.kindOf(sp, i) : chooseKind(sp, i, o);
      const h1 = hash(sp.x, sp.z, 2), h2 = hash(sp.x, sp.z, 3), h3 = hash(sp.x, sp.z, 4), h4 = hash(sp.x, sp.z, 5);
      const s = sp.s, yaw = h1 * Math.PI * 2, lean = 0.045, lx = (h2 - 0.5) * lean, lz = (h3 - 0.5) * lean;
      const hs = 0.92 + h4 * 0.2, ws = 0.9 + h2 * 0.22;   // height and width jitter
      const y = sp.y;
      let top, rad = 0.9 * s, crownR = 2.0 * s, crownY = 0;
      if (kind === 'pine') {
        push('woodStraight', sp.x, y, sp.z, yaw, lx, lz, s * ws, s * hs, s * ws, C(PAL.bark.pine, 0.95 + h3 * 0.1));
        push('pine', sp.x, y, sp.z, yaw, lx, lz, s * ws, s * hs, s * ws, C(pick(PAL.pine, h2), 0.92 + h4 * 0.16, sp.x, sp.z));
        top = S.pine.top * s * hs; crownR = 2.2 * s * ws; crownY = 3.4 * s * hs;
      } else if (kind === 'fir') {
        const w = ws * 0.92;
        push('woodStraight', sp.x, y, sp.z, yaw, lx * 0.5, lz * 0.5, s * w, s * hs, s * w, C(PAL.bark.pine, 0.8));
        push('fir', sp.x, y, sp.z, yaw, lx * 0.5, lz * 0.5, s * w, s * hs, s * w, C(pick(PAL.fir, h2), 0.9 + h4 * 0.15, sp.x, sp.z));
        top = S.fir.top * s * hs; crownR = 1.9 * s * w; crownY = 3.2 * s * hs;
      } else if (kind === 'krumm') {
        const k = 0.78 + h4 * 0.2, kyaw = windYaw + (h1 - 0.5) * 0.5;   // smaller, and all bent by the same wind
        push('woodBent', sp.x, y, sp.z, kyaw, 0, -0.08, s * k, s * k, s * k, C(PAL.bark.krumm, 0.9 + h3 * 0.2));
        push('krumm', sp.x, y, sp.z, kyaw, 0, -0.08, s * k, s * k, s * k, C(pick(PAL.krumm, h2), 0.9 + h3 * 0.2, sp.x, sp.z));
        top = S.krumm.top * s * k; rad = 0.8 * s * k; crownR = 1.8 * s * k; crownY = 2.2 * s * k;
      } else if (kind === 'oak') {
        const autumn = hash(sp.x, sp.z, 6) < 0.16 && !(o.fruitEvery > 0 && i % o.fruitEvery === 0 && i / o.fruitEvery < o.fruitMax);
        const w = ws * 1.05, ho = 0.9 + h4 * 0.14;
        push('woodOak', sp.x, y, sp.z, yaw, lx, lz, s * w, s * ho, s * w, C(PAL.bark.oak, 0.9 + h3 * 0.2));
        push('oak', sp.x, y, sp.z, yaw, lx, lz, s * w, s * ho, s * w, C(autumn ? pick(PAL.autumn, h3) : pick(PAL.oak, hash(sp.x, sp.z, 54)), 0.9 + h4 * 0.18, sp.x, sp.z));
        top = S.oak.top * s * ho; rad = 0.95 * s; crownR = 2.9 * s * w; crownY = 5.0 * s * ho;
      } else if (kind === 'birch') {
        const w = 0.85 + h2 * 0.2, gold = hash(sp.x, sp.z, 7) < 0.12;
        push('woodBirch', sp.x, y, sp.z, yaw, lx * 1.4, lz * 1.4, s * w, s * hs, s * w, C(PAL.bark.birch, 0.95 + h3 * 0.05));
        push('birch', sp.x, y, sp.z, yaw, lx * 1.4, lz * 1.4, s * w, s * hs, s * w, C(gold ? pick(PAL.birchGold, h3) : pick(PAL.birch, h3), 0.92 + h4 * 0.14, sp.x, sp.z));
        top = S.birch.top * s * hs; rad = 0.75 * s; crownR = 1.5 * s * w; crownY = 5.0 * s * hs;
      } else {   // snag
        push('woodSnag', sp.x, y, sp.z, yaw, lx * 1.5, lz * 1.5, s, s * hs, s, C(PAL.bark.snag, 0.85 + h3 * 0.2));
        top = S.snagTop * s * hs; rad = 0.7 * s; crownR = 1.4 * s; crownY = 2.8 * s * hs;
      }
      tops.push(y + top); radii.push(rad); kinds.push(kind);
      shadows.push([sp.x, sp.z, y + 0.2, kind === 'snag' ? 1.2 * s : crownR * 1.05, top]);
      fruit.push({ x: sp.x + (crownR + 0.5) * 0.7071, y: y + crownY, z: sp.z + (crownR + 0.5) * 0.7071 });

      /* understory: 0–3 bits, kept out of the water and close enough to belong to this tree */
      if (opts.understory === false) return;
      const n = kind === 'krumm' ? (h4 < 0.5 ? 1 : 0) : 1 + Math.floor(hash(sp.x, sp.z, 8) * 1.6);
      for (let u = 0; u < n; u++) {
        const a = hash(sp.x, sp.z, 20 + u) * Math.PI * 2, d = (kind === 'oak' ? 3.0 : 2.2) * s + hash(sp.x, sp.z, 30 + u) * 3.5;
        const ux = sp.x + Math.cos(a) * d, uz = sp.z + Math.sin(a) * d, gy = Hf ? Hf(ux, uz) : y + 0.2;
        if (gy < o.water + 0.6) continue;
        const roll = hash(ux, uz, 40), us = 1.0 + hash(ux, uz, 41) * 1.0, uy = hash(ux, uz, 42) * Math.PI * 2;
        const shady = kind === 'pine' || kind === 'fir' || kind === 'birch';
        if (roll < 0.05 && kind !== 'krumm') push('woodStraight', ux, gy - 0.25, uz, uy, 0, 0, 1.5 * us, 0.12 * us, 1.5 * us, C(PAL.bark.stump, 0.9));   // a stump
        else if (shady ? roll < 0.6 : roll < 0.25) push('fern', ux, gy - 0.05, uz, uy, 0, 0, us * 1.6, us * 1.5, us * 1.6, C(pick(PAL.fern, hash(ux, uz, 43)), 0.9 + hash(ux, uz, 44) * 0.2, ux, uz));
        else push('bush', ux, gy - 0.15, uz, uy, 0, 0, us * 1.9, us * 1.6, us * 1.9, C(kind === 'krumm' ? PAL.krumm[0] : pick(PAL.bush, hash(ux, uz, 45)), 0.9 + hash(ux, uz, 46) * 0.2, ux, uz));
      }
    });

    /* one InstancedMesh per part that has any instances */
    const GEO = {
      woodStraight: [S.woodStraight, M.wood], woodOak: [S.woodOak, M.wood], woodBirch: [S.woodBirch, M.wood], woodSnag: [S.woodSnag, M.wood], woodBent: [S.woodBent, M.wood],
      pine: [S.pine.canopy, M.needle], fir: [S.fir.canopy, M.needle], krumm: [S.krumm.canopy, M.needle],
      oak: [S.oak.canopy, M.leaf], birch: [S.birch.canopy, M.leaf], bush: [S.bush, M.leaf], fern: [S.fern, M.fern],
    };
    const meshes = [], perPart = {}; let tris = 0, instances = 0;
    Object.keys(parts).forEach((k) => {
      const list = parts[k]; if (!list.length) return;
      const im = new T.InstancedMesh(GEO[k][0], GEO[k][1], list.length);
      list.forEach((it, j) => { im.setMatrixAt(j, it.m); im.setColorAt(j, it.c); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.frustumCulled = false;   // the island is small; the geometry's own sphere is one tree at the origin
      im.name = 'trees:' + k;
      meshes.push(im);
      const each = GEO[k][0].attributes.position.count / 3; perPart[k] = [list.length, each]; tris += each * list.length; instances += list.length;
    });
    /* soft contact shadows: one more draw — a dark, soft-edged disc under every crown, tilted to the slope and
       nudged away from the sun. It is what makes a tree STAND on the ground instead of floating over it. */
    if (opts.shadows !== false && shadows.length) {
      const disc = new T.CircleGeometry(1, 12); disc.rotateX(-Math.PI / 2);
      const sm = new T.MeshBasicMaterial({ map: blobTex(T), color: 0x0d1a08, transparent: true, opacity: opts.shadowOpacity != null ? opts.shadowOpacity : 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
      const im = new T.InstancedMesh(disc, sm, shadows.length), up = new T.Vector3(0, 1, 0), nrm = new T.Vector3();
      const sd = opts.sunDir || { x: 60, y: 90, z: 30 }, sl = Math.hypot(sd.x, sd.y, sd.z);
      shadows.forEach((sh, j) => {
        const lift = sh[4] * 0.12, x = sh[0] - sd.x / sl * lift, z = sh[1] - sd.z / sl * lift;
        let gy = sh[2];
        if (Hf) { gy = Hf(x, z); nrm.set(Hf(x - 1, z) - Hf(x + 1, z), 2, Hf(x, z - 1) - Hf(x, z + 1)).normalize(); } else nrm.set(0, 1, 0);
        q.setFromUnitVectors(up, nrm); p.set(x, gy + 0.07, z); sc.set(sh[3], 1, sh[3]);
        im.setMatrixAt(j, m4.compose(p, q, sc));
      });
      im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.renderOrder = 1; im.name = 'trees:shadow';
      meshes.push(im); perPart.shadow = [shadows.length, 12]; tris += 12 * shadows.length;
    }
    return { meshes, tops, radii, kinds, fruit, update: update, stats: { drawCalls: meshes.length, triangles: tris, instances: instances, parts: perPart } };
  }

  /* ═════════ the big tree at the MOUND (unit space; the game scales by BIG and sets the base) ═════════
     Kept: the central leader's flat top at y = 15 (the nest sits on it: NEST.y = base + 15*BIG + 0.4).
     Open: no leaf inside radius 2.9 of the axis above y = 14.4, so the nest, ring, treehouse (±2.1 units)
     and the nest cameras (≈ radius 4.1, y 17–18.5) keep a clear view. */
  function bigTree(T, opts) {
    opts = opts || {};
    const R = opts.renderer, lin = opts.linear != null ? !!opts.linear : !!(R && R.outputEncoding === T.sRGBEncoding);
    const M = materials(T, R, opts.wind != null ? opts.wind : 1);
    const g = new T.Group(); g.name = 'bigTree';
    let B = new Builder(T);
    const ws = (x, y) => { const s = 0.6 + 0.4 * sstep(-0.5, 9, y); return [s, s, s]; };
    trunk(T, B, 15.0, 1.9, 1.05, { seg: 12, hseg: 8, shade: ws, lobes: true, uvx: 3, uvy: 0.35 });
    /* a flat cap on the leader: the nest's seat */
    { const cap = new T.CircleGeometry(1.08, 12); cap.rotateX(-Math.PI / 2); cap.translate(0, 15.0, 0); B.add(cap, null, () => [0.7, 0.62, 0.55], false); cap.dispose(); }
    /* roots that grip the mound */
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; limb(T, B, [Math.cos(a) * 0.9, 1.2, Math.sin(a) * 0.9], [Math.cos(a) * 3.2, -0.5, Math.sin(a) * 3.2], 0.75, 0.18, 6, 1, ws); }
    /* five great limbs reaching out from the trunk, with a fork each, holding the crown in a bowl round the nest */
    const ends = [];
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + 0.25, y0 = 8.6 + (k % 2) * 1.6, r1 = 4.6 + (k % 3) * 0.5, y1 = 12.4 + (k % 2) * 0.9;
      const A = [Math.cos(a) * 0.6, y0, Math.sin(a) * 0.6], E = [Math.cos(a) * r1, y1, Math.sin(a) * r1];
      limb(T, B, A, E, 0.75, 0.32, 7, 1, ws);
      const a2 = a + 0.5, E2 = [Math.cos(a2) * (r1 + 1.8), y1 - 0.4, Math.sin(a2) * (r1 + 1.8)];
      limb(T, B, E, E2, 0.32, 0.12, 5, 1, ws);
      const a3 = a - 0.35, E3 = [Math.cos(a3) * (r1 + 0.8), y1 + 2.0, Math.sin(a3) * (r1 + 0.8)];
      limb(T, B, E, E3, 0.28, 0.1, 5, 1, ws);
      ends.push([a, r1, y1]);
    }
    const wood = new T.Mesh(B.geometry(), M.wood); g.add(wood);

    /* the crown: clumps round the limb ends, a ring of lower skirts, and no leaf over the nest */
    B = new Builder(T);
    const sh = canopyShade(9.5, 17.5, 0, 0, 7), Rr = rng(1515);
    ends.forEach((E, k) => {
      const [a, r1, y1] = E;
      clump(T, B, Math.cos(a) * (r1 + 1.4), y1 + 1.0, Math.sin(a) * (r1 + 1.4), 2.6, 1, 100 + k, sh);
      clump(T, B, Math.cos(a + 0.5) * (r1 + 2.6), y1 - 0.2, Math.sin(a + 0.5) * (r1 + 2.6), 2.2, 1, 120 + k, sh);
      clump(T, B, Math.cos(a - 0.4) * (r1 + 0.6), y1 + 2.4, Math.sin(a - 0.4) * (r1 + 0.6), 1.7, 1, 140 + k, sh);
      clump(T, B, Math.cos(a + 0.9) * 4.2, 10.4 + Rr() * 0.8, Math.sin(a + 0.9) * 4.2, 2.1, 1, 160 + k, sh);
    });
    /* a low inner ring that cradles the nest: small clumps round the leader's top, all below the nest cameras */
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + 0.2, rr = 3.7 + (k % 2) * 0.5;
      clump(T, B, Math.cos(a) * rr, 13.4 + (k % 3) * 0.35, Math.sin(a) * rr, 1.35 + (k % 2) * 0.2, 1, 180 + k, sh); }
    const leaves = new T.Mesh(B.geometry(), M.leaf);
    /* the crown's clumps never enter the nest's clear column: radius 2.9 above y 14.4 */
    { const P = leaves.geometry.attributes.position, v = new T.Vector3();
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const rr = Math.hypot(v.x, v.z); if (v.y > 14.4 && rr < 2.9) { const k = 2.9 / Math.max(rr, 0.01); P.setXYZ(i, v.x * k, v.y, v.z * k); } }
      P.needsUpdate = true; }
    leaves.material = leaves.material.clone(); leaves.material.onBeforeCompile = M.leaf.onBeforeCompile;   // sways, no instancing → phase 0
    const lc = new T.Color(0x56994a); if (lin) lc.convertSRGBToLinear(); leaves.material.color = lc;
    const wc = new T.Color(0x6e4a30); if (lin) wc.convertSRGBToLinear(); wood.material = wood.material.clone(); wood.material.color = wc;
    g.add(leaves);
    g.userData = { nestSeatY: 15.0, clearRadius: 2.9, clearAboveY: 14.4 };
    return g;
  }

  function update(t) { wind.value = t; }

  return { plant: plant, bigTree: bigTree, update: update, chooseKind: chooseKind, palettes: PAL };
})();
