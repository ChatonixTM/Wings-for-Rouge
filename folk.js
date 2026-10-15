/* ═══════════════════════════════════════════════════════════════════════════
   WFR_FOLK — the people round the island who are not villagers (board 552 §2–3).
   The first of them: HAL THE FISHER, on the lake's south-west shore.

   Marth, Oct 9: "I think there should be humans around the island ... Don't have
   anyone fishing."  Itachi (552): the rod, its line and the bobber were already
   built in humans.js and nobody held them.

   ⚠ BINDING (552 §0): never the game's seeded generator, never a random draw — every
   choice is a fixed constant or a low-discrepancy sequence on a counter (the
   cast index, the catch index). Nothing stands inside the mountain's ellipse
   (Hal's shore is ~200 m south of it). Phone-first: one figure (~25 draws) and
   five small things; all of it hidden past 120 m from the bird.

   ── THE API ───────────────────────────────────────────────────────────────
   WFR_FOLK.create(THREE, scene, ctx) → hal   builds Hal, his line, bobber, bait tin and basket
   WFR_FOLK.tick(dt, ctx?)                    his day; call once a frame (dt = real seconds)
   WFR_FOLK.trade(birdPos, beakEmpty)         → { who, say, give: 'perch' } ONCE per catch, or null
   WFR_FOLK.tug(birdPos)                      → { who, say } once a day when she pulls the bobber, or null
   WFR_FOLK.state()                           → for the bench (see state() below)
   WFR_FOLK.createKids(THREE, scene, ctx)     the children, Pim and Tess, on the village green (THE CHILDREN, below);
                                              tick() then runs them after Hal
   WFR_FOLK.kids()                            → the children's state, for the bench

   ── THE CONTEXT (ctx) ─────────────────────────────────────────────────────
   required
     H(x, z)          the terrain height (the game's H)
     WATER            the water level (1.2)
     LAKE             { x, z } the lake's centre (48, −38)
     getClock()       the game clock, 0 ≤ c < 2700 (S.clock)
     birdPos()        her position: a THREE.Vector3 or { x, y, z } (S.pos)
   optional
     humans           the WFR_HUMANS builder (default window.WFR_HUMANS)
     renderer         handed to the builder (textures)
     landNear(x, z)   the game's walk-to-dry-ground (used on the search's start)
     ground(x, z)     groundAt: keeps his spot off a tree's top square or a roof
     onCatch(info)    called on each catch, info = { catches, at: [x,y,z] }: the html
                      thins the lake shoal (one live perch gets back = 60)
     emojiSprite(ch, size)  the game's sprite maker (else folk makes its own)
     home             { x, z } where he sleeps (default the lake-cabin site (20, −72), 552 §4)
     start            { x, z } where the shore search begins (default (30, −52))
     shadows          default true
     cull             metres; default 120

   ── HIS DAY (clock units; the game's day is 2700, 552 F5) ──────────────────
     cast 1 → hold (20–30, or less when a fish is due) → bite: three dips over
     1.2 and a ripple → reel 1.5 → (a fish: show it 2, then the basket) → the
     tin 5 (bait) → cast …  A catch lands every 70–110 (design), the interval
     for catch k fixed by a golden-ratio sequence on k. No bite: reel in empty,
     re-bait, cast again. fishReady = true after each catch.
     clock > 2040: he reels in and walks home (to ctx.home) and hides; when the
     clock comes round to the next day he steps out at home and walks back.
     A clock JUMP (sleep, setClock: > 30 units in a frame) snaps him to where
     the new hour has him: at his spot by day, hidden at home by night.
   ═══════════════════════════════════════════════════════════════════════════ */
window.WFR_FOLK = (function () {
  'use strict';

  const CYCLE = 2700, HOME_AT = 2040;                     // the game's day; villagers go in at > 2040
  const CAST = 1.0, RELEASE = 0.5, BITE = 1.2, REEL = 1.5, SHOW = 2.0, TIN = 5.0, GIVE = 2.0;
  const WALK = 1.6;                                        // m per real second (652; it was per clock unit): the villagers' pace
  const JUMP = 30;                                         // a clock step bigger than this is a jump, not time passing
  const DIP = 0.12, BOB = 0.025, REST = 0.04;              // bobber: dip depth, swell, rest height over WATER
  const CATCH_MIN = 70, CATCH_SPAN = 40;                   // a catch every 70–110 (design)
  const HOLD_MIN = 20, HOLD_SPAN = 10;                     // a hold of 20–30 (design)
  const SAY_TRADE = 'Here. For the little one.', SAY_TUG = 'Hey. That\'s no fish.';
  /* the rod as humans.js propGeo('rod') builds it: C(0.008, 0.016, 2.1) at M(0, 0.48, 0.83, 1.05), so the
     tip is (0, 0.48 + 1.05·cos 1.05, 0.83 + 1.05·sin 1.05) ≈ (0, 1.0025, 1.7408) in the prop's frame. The
     builder reads it off the geometry itself; this is the fallback and the cross-check. */
  const ROD = { cy: 0.48, cz: 0.83, half: 1.05, tilt: 1.05 };

  /* deterministic sequences: frac(salt + k·α) for an irrational α, never a random draw */
  const frac = (x) => x - Math.floor(x);
  const seq = (k, salt, a) => frac(salt + k * a);
  const PHI = 0.6180339887498949, PLASTIC = 0.7548776662466927, SILVER = 0.4142135623730951, E1 = 0.7182818284590452;
  const sstep = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  function kf(t, keys) {             // keyframes [[t, v], …], eased between
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) { const a = keys[i - 1], b = keys[i]; if (t <= b[0]) return a[1] + (b[1] - a[1]) * sstep((t - a[0]) / (b[0] - a[0])); }
    return keys[keys.length - 1][1];
  }
  const ease = (o, k, v, r) => { o[k] += (v - o[k]) * r; };
  const xyz = (p) => (Array.isArray(p) ? { x: p[0], y: p[1], z: p[2] } : p);
  const arr = (v) => [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)];

  let T = null, C = null, hal = null;
  let K = null, kid = null;          // the children's context and state (createKids, below)

  /* ── small geometry helpers: parts painted with a vertex colour and merged, so each thing is ONE draw ── */
  function part(geo, hex, px, py, pz, rx, ry, rz, sx, sy, sz) {
    const m = new T.Matrix4().compose(new T.Vector3(px || 0, py || 0, pz || 0), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)),
      new T.Vector3(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz));
    const g = geo.index ? geo.toNonIndexed() : geo; if (g !== geo) geo.dispose();
    /* the colour first, in the part's own frame (hex may be { lo, hi, at }: hi above y = at), then the placing */
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    const top = typeof hex === 'object' ? hex : null, col = new T.Color(top ? top.lo : hex), hi = top ? new T.Color(top.hi) : null;
    for (let i = 0; i < n; i++) { const k = hi && g.attributes.position.getY(i) > top.at ? hi : col; c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; }
    g.setAttribute('color', new T.BufferAttribute(c, 3));
    g.applyMatrix4(m);
    return g;
  }
  function merged(parts) {
    let n = 0; for (const p of parts) n += p.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const p of parts) {
      const k = p.attributes.position.count;
      pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); col.set(p.attributes.color.array, o * 3);
      if (p.attributes.uv) uv.set(p.attributes.uv.array, o * 2);
      o += k; p.dispose();
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.computeBoundingSphere(); return g;
  }
  const vmat = (o) => new T.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.8, metalness: 0 }, o || {}));
  function sprite(ch, size) {        // the game's emojiSprite, when it is not handed in
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    g.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 72);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), depthWrite: false })); s.scale.set(size, size, 1); return s;
  }
  /* sit a thing flush on the slope: its up turned to the ground's normal there */
  function settle(obj, x, z, yaw) {
    const e = 0.4, hx = (C.H(x + e, z) - C.H(x - e, z)) / (2 * e), hz = (C.H(x, z + e) - C.H(x, z - e)) / (2 * e);
    const n = new T.Vector3(-hx, 1, -hz).normalize();
    obj.position.set(x, C.H(x, z), z);
    obj.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), n).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw || 0));
  }

  /* ── the things he keeps by him ── */
  function baitTin() {               // a dented olive tin of dark soil, its lid off and leaning, two worms showing
    const P = [
      part(new T.CylinderGeometry(0.13, 0.135, 0.13, 16, 1, true), 0x66733a, 0, 0.065, 0),
      part(new T.CylinderGeometry(0.135, 0.135, 0.01, 16), 0x4f5a2c, 0, 0.005, 0),
      part(new T.CylinderGeometry(0.124, 0.124, 0.012, 16), 0x3e2a1c, 0, 0.11, 0),
      part(new T.TorusGeometry(0.131, 0.009, 4, 18), 0x9aa078, 0, 0.13, 0, Math.PI / 2),
      part(new T.CylinderGeometry(0.142, 0.142, 0.014, 16), 0x76824a, 0.27, 0.035, 0.03, 0.08, 0, 0.22),   // the lid, on the grass, propped on the tin's foot
      part(new T.TorusGeometry(0.035, 0.009, 4, 8, Math.PI * 1.1), 0xc77b78, 0.03, 0.118, 0.02, -Math.PI / 2, 0, 0.4),
      part(new T.TorusGeometry(0.03, 0.008, 4, 8, Math.PI * 1.2), 0xb86e6c, -0.04, 0.118, -0.03, -Math.PI / 2, 0, 2.2),
    ];
    return new T.Mesh(merged(P), vmat({ roughness: 0.6, side: T.DoubleSide }));
  }
  function basket() {                // a fisherman's creel: wicker, a rim and a handle
    const P = [
      part(new T.CylinderGeometry(0.3, 0.24, 0.34, 18, 3, true), 0xb48a52, 0, 0.17, 0, 0, 0, 0, 1, 1, 0.78),
      part(new T.CylinderGeometry(0.24, 0.24, 0.012, 18), 0x8a6a3a, 0, 0.006, 0, 0, 0, 0, 1, 1, 0.78),
      part(new T.TorusGeometry(0.3, 0.018, 5, 22), 0x7e5c30, 0, 0.34, 0, Math.PI / 2, 0, 0, 1, 0.78, 1),
      part(new T.TorusGeometry(0.24, 0.014, 4, 18), 0x7e5c30, 0, 0.12, 0, Math.PI / 2, 0, 0, 1, 0.78, 1),
      part(new T.TorusGeometry(0.29, 0.013, 4, 14, Math.PI), 0x8a6a3a, 0, 0.34, 0, 0, 0, 0),
    ];
    const m = new T.Mesh(merged(P), vmat({ roughness: 0.9, side: T.DoubleSide }));
    const X = window.WFR_TEX;
    if (X && typeof X.apply === 'function' && X.names && X.names.indexOf('wood') >= 0) { try { X.apply(m, 'wood', 4, 1, C.renderer); } catch (e) { /* plain colour */ } }
    return m;
  }
  function basketFish() {            // the day's perch, laid across the top
    const P = [];
    for (const [x, z, a] of [[-0.06, 0.02, 0.5], [0.07, -0.04, -0.35]]) {
      P.push(part(new T.SphereGeometry(1, 10, 6), { lo: 0xd7a02a, hi: 0x6f6a30, at: 0.45 }, x, 0.33, z, 0, a, 0.25, 0.07, 0.055, 0.2));
      P.push(part(new T.ConeGeometry(0.06, 0.1, 4).rotateX(Math.PI / 2), 0xc08a24, x - Math.sin(a) * 0.24, 0.33, z - Math.cos(a) * 0.24, 0, a, 0, 1, 0.35, 1));   // the tail: narrow at the body
    }
    return new T.Mesh(merged(P), vmat({ roughness: 0.45 }));
  }
  function bobberMesh() {            // r 0.12: red over white, with a little stem
    const P = [
      part(new T.SphereGeometry(0.12, 12, 8), { lo: 0xf1ede2, hi: 0xd23a2e, at: 0.0 }),
      part(new T.CylinderGeometry(0.011, 0.011, 0.11, 5), 0xd23a2e, 0, 0.16, 0),
    ];
    return new T.Mesh(merged(P), vmat({ roughness: 0.45 }));
  }

  /* ── where he stands: step from start toward the lake until the ground is wet, then back to dry ground ── */
  function findSpot() {
    const W = C.WATER, L = C.LAKE, s0 = C.start || { x: 30, z: -52 };
    const p = C.landNear ? C.landNear(s0.x, s0.z) : { x: s0.x, z: s0.z };
    const dx = L.x - p.x, dz = L.z - p.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, STEP = 0.25;
    let s = 0;
    while (s < d && C.H(p.x + ux * s, p.z + uz * s) >= W + 0.8) s += STEP;
    s = Math.max(0, s - STEP);                                             // the last dry step
    const clear = (q) => !C.ground || C.ground(p.x + ux * q, p.z + uz * q) - C.H(p.x + ux * q, p.z + uz * q) < 0.3;
    for (let k = 0; k < 40 && s > 0 && !clear(s); k++) s -= STEP;            // off a tree's top square or a roof
    return { x: p.x + ux * s, z: p.z + uz * s, ux, uz, yaw: Math.atan2(ux, uz) };
  }

  /* ── HAL ── */
  function create(THREE, scene, ctx) {
    T = THREE; C = Object.assign({}, ctx || {});
    if (hal) dispose();
    const HUM = C.humans || window.WFR_HUMANS;
    if (!HUM || typeof C.H !== 'function' || C.WATER == null || !C.LAKE) throw new Error('WFR_FOLK.create: ctx needs H, WATER, LAKE and WFR_HUMANS');
    const shadows = C.shadows !== false;
    /* Bo's look (552: cap and knit) with a grey beard, so he is not Bo; a fisherman's colours */
    const look = HUM.LOOKS ? Object.assign({}, HUM.LOOKS[1], { beard: true, cap: 0x2f3c4a, h: 1.02, w: 1.1 }) : null;
    const m = HUM.make(THREE, 1, { shirt: 0x3e5d74, pants: 0x4d4436, shoes: 0x2a2420, skin: 0xd6a07a, hair: 0x9b958d }, { renderer: C.renderer, look, shadows });
    m.g.name = 'folk:hal';
    m.g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    const rod = m.props.rod; rod.visible = true;
    if (rod.children[1]) rod.children[1].visible = false;                 // the built-in line and bobber hang in the air: the world line replaces them
    for (const k in m.props) if (k !== 'rod' && m.props[k]) m.props[k].visible = false;

    /* the rod's tip, read off its own geometry: the vertices furthest along the rod's axis (the top cap) */
    const tipLocal = new T.Vector3(0, ROD.cy + ROD.half * Math.cos(ROD.tilt), ROD.cz + ROD.half * Math.sin(ROD.tilt));
    try {
      const pa = rod.children[0].geometry.attributes.position, ax = new T.Vector3(0, Math.cos(ROD.tilt), Math.sin(ROD.tilt)), v = new T.Vector3();
      let best = -1e9; for (let i = 0; i < pa.count; i++) best = Math.max(best, v.fromBufferAttribute(pa, i).dot(ax));
      const sum = new T.Vector3(); let n = 0;
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); if (v.dot(ax) > best - 1e-4) { sum.add(v); n++; } }
      if (n && sum.divideScalar(n).distanceTo(tipLocal) < 0.05) tipLocal.copy(sum);
    } catch (e) { /* the formula stands */ }

    const spot = findSpot();
    m.g.position.set(spot.x, C.H(spot.x, spot.z), spot.z); m.g.rotation.y = spot.yaw;
    scene.add(m.g);

    /* the line: two points, rewritten each frame, in world space */
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
    const line = new T.Line(lg, new T.LineBasicMaterial({ color: 0xf3f0e6, transparent: true, opacity: 0.9 }));
    line.frustumCulled = false; line.name = 'folk:line'; scene.add(line);
    const bob = bobberMesh(); bob.name = 'folk:bobber'; scene.add(bob);
    const ripple = new T.Mesh(new T.RingGeometry(0.17, 0.22, 28), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    ripple.rotation.x = -Math.PI / 2; ripple.visible = false; ripple.name = 'folk:ripple'; scene.add(ripple);
    const fish = C.emojiSprite ? C.emojiSprite('\u{1F420}', 0.55) : sprite('\u{1F420}', 0.55); fish.visible = false; fish.name = 'folk:fish'; scene.add(fish);

    /* his tin to his left hand's side, the basket behind his rod hand: on dry ground, flush with the slope */
    const right = { x: spot.uz, z: -spot.ux };                              // the figure's +x (armR's side) in the world
    const at = (lx, lz) => ({ x: spot.x + right.x * lx + spot.ux * lz, z: spot.z + right.z * lx + spot.uz * lz });
    const tinAt = at(-0.95, -0.15), basketAt = at(0.85, -0.75);
    const tin = baitTin(); tin.name = 'folk:tin'; settle(tin, tinAt.x, tinAt.z, spot.yaw + 0.5); scene.add(tin);
    const bsk = basket(); bsk.name = 'folk:basket'; settle(bsk, basketAt.x, basketAt.z, spot.yaw - 0.3); scene.add(bsk);
    const fill = basketFish(); fill.visible = false; bsk.add(fill);
    for (const o of [tin, bsk, fill]) { o.castShadow = shadows; o.receiveShadow = true; }
    /* where the tin worm goes (552 §3: 1.2 m from the tin), on dry ground, back from the water */
    let worm = at(-1.6, -1.15); if (C.H(worm.x, worm.z) < C.WATER + 0.8) worm = at(-1.2, -1.6);

    hal = Object.assign(m, {
      name: 'Hal', scene, spot, right, tipLocal, line, bob, ripple, fish, tin, basket: bsk, fill,
      tinAt: { x: tinAt.x, y: C.H(tinAt.x, tinAt.z), z: tinAt.z }, wormAt: { x: worm.x, y: C.H(worm.x, worm.z), z: worm.z },
      home: C.home || { x: 20, z: -72 }, cull: C.cull || 120,
      act: 'tin', actT: 0, lt: 0, day: 0, lastClock: null, stride: 0, yaw: spot.yaw,
      casts: 0, nCatch: 0, catches: 0, today: 0, given: 0, kept: 0, since: 0, target: 0, holdFor: HOLD_MIN, biteNext: false, withFish: false,
      leaving: false, goal: null, fishReady: false, giveT: 0, giveTo: null, tugT: 0, tugCd: 0, tugDay: -1, culled: false,
      B: new T.Vector3(), from: new T.Vector3(), tip: new T.Vector3(), dangle: new T.Vector3(), rip: 1, dipK: -1,
    });
    hal.target = catchGap(0);
    /* the cast point: from where the tip sits in the hold, 2.5 m further out (each cast ±0.4), over water deeper than 1 m */
    poseFor('hold', 0, 1, 1); m.g.updateWorldMatrix(true, true); tipW(hal.tip);
    hal.base = findWater(hal.tip.x, hal.tip.z);
    hal.B.set(hal.base.x, C.WATER + REST, hal.base.z);
    const c0 = C.getClock ? C.getClock() : 600;
    hal.lastClock = c0;
    if (c0 > HOME_AT) goHome(true); else { hal.act = 'tin'; hal.actT = TIN * 0.6; }
    halTick(0);
    return hal;
  }
  function dispose() {
    for (const o of [hal.g, hal.line, hal.bob, hal.ripple, hal.fish, hal.tin, hal.basket]) if (o && o.parent) o.parent.remove(o);
    hal = null;
  }
  function findWater(x, z) {
    const W = C.WATER, ux = hal.spot.ux, uz = hal.spot.uz;
    for (let s = 2.5; s <= 9; s += 0.25) { const qx = x + ux * s, qz = z + uz * s; if (C.H(qx, qz) < W - 1) return { x: qx, z: qz }; }
    return { x: x + ux * 2.5, z: z + uz * 2.5 };
  }
  const catchGap = (k) => CATCH_MIN + CATCH_SPAN * seq(k, 0.37, PHI);
  function tipW(out) { return hal.props.rod.localToWorld(out.copy(hal.tipLocal)); }

  /* each cast: where it lands (a little to either side, a little nearer or further, always over deep water), how long
     he holds, and whether this one ends in a bite — the bite is placed so the catch lands on the planned interval */
  function pickCast() {
    const h = hal, k = h.casts, W = C.WATER;
    const lat = (seq(k, 0.23, SILVER) - 0.5) * 1.2, fwd = (seq(k, 0.71, E1) - 0.5) * 0.8;   // ±0.6 m aside, ±0.4 m out
    let x = h.base.x + h.right.x * lat + h.spot.ux * fwd, z = h.base.z + h.right.z * lat + h.spot.uz * fwd;
    if (!(C.H(x, z) < W - 1)) { x = h.base.x; z = h.base.z; }
    h.B.set(x, W + REST, z);
    const r = h.target - h.since, fixed = CAST + BITE + REEL;   // what is left of the interval, and a bite-cast's fixed part
    if (r <= fixed + 34) { h.biteNext = true; h.holdFor = Math.max(2, r - fixed); }
    else { h.biteNext = false; h.holdFor = Math.min(HOLD_MIN + HOLD_SPAN * seq(k, 0.11, PLASTIC), r - (CAST + REEL + TIN) - 10); }
    h.casts++;
  }

  function to(act) { hal.act = act; hal.actT = 0; }
  function goHome(snap) {
    const h = hal;
    h.leaving = false; h.goal = null;
    if (snap) { h.act = 'home'; h.actT = 0; h.g.position.set(h.home.x, C.H(h.home.x, h.home.z), h.home.z); return; }
    h.goal = h.home; to('walk');
  }
  function newDay() { hal.today = 0; hal.given = 0; hal.kept = 0; hal.since = 0; hal.target = catchGap(hal.nCatch); }
  function atSpot() {
    const h = hal; h.g.position.set(h.spot.x, C.H(h.spot.x, h.spot.z), h.spot.z); h.yaw = h.spot.yaw; h.g.rotation.y = h.yaw;
  }
  function landCatch() {
    const h = hal;
    h.catches++; h.today++; h.nCatch++; h.fishReady = true; h.since = 0; h.target = catchGap(h.nCatch);
    if (typeof C.onCatch === 'function') { try { C.onCatch({ catches: h.catches, at: arr(h.g.position) }); } catch (e) { /* the game's side */ } }
  }

  /* ── the clock: his acts run in clock units, so timeScale(8) runs his day eight times as fast ── */
  function tick(dt, ctx) { halTick(dt, ctx); if (kid) kidsTick(dt, ctx); }   // Hal first, exactly as before; then the children
  function halTick(dt, ctx) {
    if (!hal) return;
    const h = hal, getClock = (ctx && ctx.getClock) || C.getClock, getBird = (ctx && ctx.birdPos) || C.birdPos;
    dt = dt || 0;
    const clock = getClock ? getClock() : 600;
    let dc = clock - h.lastClock; const wrapped = clock < h.lastClock; if (wrapped) { dc += CYCLE; h.day++; }
    h.lastClock = clock;
    const night = clock > HOME_AT;
    let step;
    if (dc > JUMP) {                                       // slept, or the bench set the clock: be where the new hour has him
      step = 0;
      if (night) goHome(true);
      else {
        if (wrapped || h.act === 'home') newDay();          // a new morning
        if (h.act === 'home' || h.act === 'walk') { atSpot(); to('tin'); h.actT = TIN * 0.6; }
        h.leaving = false;
      }
    } else step = dc > 1e-6 ? dc / (C.pace || 1) : dt;     /* 652: the clock runs DAY_SPEED x (648); his legs and hands live in real seconds (a frozen clock: dt) */
    h.lt += dt;
    h.giveT = Math.max(0, h.giveT - step); h.tugCd = Math.max(0, h.tugCd - step);
    if (h.tugT > 0) h.tugT = Math.max(0, h.tugT - step);
    advance(step, night);

    const bp = getBird ? xyz(getBird()) : null;
    const dist = bp ? Math.hypot(bp.x - h.g.position.x, bp.z - h.g.position.z) : 0;
    h.culled = dist > h.cull;
    const out = h.act !== 'home' && !h.culled;
    h.g.visible = out; h.line.visible = out; h.bob.visible = out;
    h.tin.visible = !h.culled; h.basket.visible = !h.culled; h.fill.visible = h.kept > 0;
    if (h.culled) { h.ripple.visible = false; h.fish.visible = false; return; }
    if (!out) { h.ripple.visible = false; h.fish.visible = false; rippleTick(step); return; }
    pose(step, dt, bp);
    h.g.updateWorldMatrix(true, true);
    tipW(h.tip);
    placeBobber();
    const a = h.line.geometry.attributes.position;
    a.setXYZ(0, h.tip.x, h.tip.y, h.tip.z); a.setXYZ(1, h.bob.position.x, h.bob.position.y + 0.12, h.bob.position.z); a.needsUpdate = true;
    rippleTick(step);
    placeFish();
  }
  function advance(step, night) {
    const h = hal;
    if (!step) return;
    const fishing = h.act === 'cast' || h.act === 'hold' || h.act === 'bite' || h.act === 'reel' || h.act === 'show' || h.act === 'tin';
    if (fishing) h.since += step;
    if (night && fishing && !h.leaving) {                  // evening: finish what is in hand, then home
      h.leaving = true;
      if (h.act === 'hold') { h.withFish = false; h.from.copy(h.bob.position); to('reel'); }
      else if (h.act === 'tin') { goHome(false); return; }
    }
    h.actT += step;
    switch (h.act) {
      case 'cast':
        if (h.actT >= CAST) { to('hold'); h.rip = 0; }   // the splash
        break;
      case 'hold':
        if (h.leaving || h.actT >= h.holdFor) { if (h.biteNext && !h.leaving) { to('bite'); h.dipK = -1; } else { h.withFish = false; h.from.copy(h.bob.position); to('reel'); } }
        break;
      case 'bite':
        if (h.actT >= BITE) { h.withFish = true; h.from.copy(h.bob.position); to('reel'); }
        break;
      case 'reel':
        if (h.actT >= REEL) { if (h.withFish) { landCatch(); to('show'); } else if (h.leaving) goHome(false); else to('tin'); }
        break;
      case 'show':
        if (h.actT >= SHOW) { h.kept = h.today - h.given; if (h.leaving) goHome(false); else to('tin'); }
        break;
      case 'tin':
        if (h.actT >= TIN) { pickCast(); to('cast'); }
        break;
      case 'walk': {
        const g = h.goal || h.home, p = h.g.position, dx = g.x - p.x, dz = g.z - p.z, d = Math.hypot(dx, dz), mv = WALK * step;
        if (d <= mv + 0.05) {
          p.set(g.x, C.H(g.x, g.z), g.z);
          if (g === h.home) { to('home'); }
          else { atSpot(); to('tin'); }
        } else {
          p.x += dx / d * mv; p.z += dz / d * mv; p.y = C.H(p.x, p.z); h.stride += mv * 3.6;
          const want = Math.atan2(dx, dz); let t = want - h.yaw; t = Math.atan2(Math.sin(t), Math.cos(t)); h.yaw += t * Math.min(1, step * 6); h.g.rotation.y = h.yaw;
        }
        break;
      }
      case 'home':
        if (!night) { newDay(); h.g.position.set(h.home.x, C.H(h.home.x, h.home.z), h.home.z); h.goal = h.spot; to('walk'); }
        break;
    }
  }

  /* ── his body: the acts' poses on the rig humans.js gives (legL/legR/armL/armR rotation, body.y, head) ── */
  function poseFor(act, t, r, lt, bird) {
    const h = hal;
    let aR = -0.55, aRz = -0.2, aL = -1.0, aLz = 0.72, lL = 0, lR = 0, by = 0, hx = 0.2, tilt = 0.35;   // the hold: rod hand at the hip, the other across on the rod
    if (act === 'hold') { aR += Math.sin(lt * 1.3) * 0.03; aL += Math.sin(lt * 1.3) * 0.02; }
    else if (act === 'cast') {
      const u = t / CAST;
      /* the rod's lean from upright is 1.05 + tilt + aR: 0.85 in the hold, −0.5 back over his shoulder, 0.65 at the release */
      aR = kf(u, [[0, -0.55], [0.35, -2.3], [0.55, -1.3], [1, -0.55]]);
      tilt = kf(u, [[0, 0.35], [0.35, 0.75], [0.55, 0.9], [1, 0.35]]);
      aL = kf(u, [[0, -1.0], [0.35, -0.45], [0.55, -0.95], [1, -1.0]]); aLz = kf(u, [[0, 0.72], [0.35, 0.2], [0.6, 0.5], [1, 0.72]]);
      hx = kf(u, [[0, 0.2], [0.35, -0.08], [0.7, 0.22], [1, 0.2]]);
      lL = kf(u, [[0, 0], [0.35, 0.12], [0.6, -0.18], [1, 0]]); lR = -lL * 0.6;
    } else if (act === 'bite') {
      aR = kf(t, [[0, -0.55], [0.95, -0.6], [1.2, -0.98]]); hx = 0.32;
    } else if (act === 'reel') {
      aR = -0.98; tilt = 0.35; aL = -1.0 + Math.sin(lt * 14) * 0.13; aLz = 0.62 + Math.cos(lt * 14) * 0.1; hx = 0.18;   // cranking the reel
    } else if (act === 'show') {
      aR = -0.32; tilt = 0.15; aL = -1.35; aLz = 0.08; hx = 0.1;
    } else if (act === 'tin') {
      aR = -0.3; tilt = -0.45; aL = -1.05 + Math.sin(lt * 5) * 0.06; aLz = 0.3; hx = 0.5;
    } else if (act === 'walk') {
      const w = Math.sin(h.stride);
      lL = w * 0.6; lR = -w * 0.6; aL = -w * 0.45; aLz = 0; aR = -0.22; aRz = -0.05; tilt = -0.6; hx = 0.05; by = Math.abs(Math.cos(h.stride)) * 0.04;
    }
    /* the give: he turns to her (at most 1.2 rad off the water, so the line stays out) and holds the fish down to her */
    if (act !== 'walk' && bird !== undefined) {
      const p = h.g.position, giving = h.giveT > 0 && h.giveTo;
      let want = h.spot.yaw, rel = 0;
      if (giving) {
        const bear = Math.atan2(h.giveTo.x - p.x, h.giveTo.z - p.z); let off = Math.atan2(Math.sin(bear - h.spot.yaw), Math.cos(bear - h.spot.yaw));
        const turn = Math.max(-1.2, Math.min(1.2, off)); want = h.spot.yaw + turn; rel = off - turn;
        aL = -0.95; aLz = Math.max(-0.5, Math.min(0.9, rel * 0.9 + 0.15)); hx = 0.4;
      }
      let d = Math.atan2(Math.sin(want - h.yaw), Math.cos(want - h.yaw)); h.yaw += d * Math.min(1, r * 0.7); h.g.rotation.y = h.yaw;
    }
    ease(h.armR.rotation, 'x', aR, r); ease(h.armR.rotation, 'z', aRz, r); ease(h.armL.rotation, 'x', aL, r); ease(h.armL.rotation, 'z', aLz, r);
    ease(h.legL.rotation, 'x', lL, r); ease(h.legR.rotation, 'x', lR, r); ease(h.body.position, 'y', by, r); ease(h.head.rotation, 'x', hx, r);
    ease(h.props.rod.rotation, 'x', tilt, r);
    /* eyes on the little bird when she is near (as the villagers do), never past the shoulders */
    let look = 0;
    if (bird) {
      const p = h.g.position, d = Math.hypot(bird.x - p.x, bird.z - p.z);
      if (d < 14 || h.giveT > 0) { const b = Math.atan2(bird.x - p.x, bird.z - p.z) - h.yaw; look = Math.max(-0.8, Math.min(0.8, Math.atan2(Math.sin(b), Math.cos(b)))); }
    }
    h.head.rotation.y += (look - h.head.rotation.y) * Math.min(1, r * 0.6);
  }
  function pose(step, dt, bird) {
    const h = hal, cast = h.act === 'cast';
    const r = cast ? 1 : Math.min(1, Math.max(step, dt) * 8);
    poseFor(h.act, h.actT, r, h.lt, bird);
  }

  /* three dips over 1.2 (a bite, or her tug), the swell between */
  function dipAt(t) { if (t < 0 || t >= BITE) return 0; const s = Math.sin(Math.PI * frac(t / 0.4)); return s * s; }
  function placeBobber() {
    const h = hal, W = C.WATER, b = h.bob.position;
    h.dangle.set(h.tip.x + Math.sin(h.lt * 1.7) * 0.04, h.tip.y - 0.42, h.tip.z + Math.cos(h.lt * 1.3) * 0.04);
    const swell = (k) => W + REST + BOB * k * Math.sin(h.lt * 2.1);
    if (h.act === 'hold' || h.act === 'bite') {
      const t = h.act === 'bite' ? h.actT : (h.tugT > 0 ? BITE - h.tugT : -1), dip = dipAt(t);
      const k = Math.floor(t / 0.4); if (t >= 0 && k !== h.dipK && k < 3) { h.dipK = k; h.rip = 0; }
      if (t < 0) h.dipK = -1;
      b.set(h.B.x + Math.sin(h.lt * 0.7) * 0.03, swell(1 - dip) - DIP * dip, h.B.z + Math.cos(h.lt * 0.6) * 0.03);
    } else if (h.act === 'cast') {
      const u = h.actT / CAST;
      if (u < RELEASE) { b.copy(h.dangle); h.from.copy(h.dangle); }
      else { const v = Math.min(1, (u - RELEASE) / (1 - RELEASE)); b.lerpVectors(h.from, h.B, v); b.y += 1.4 * 4 * v * (1 - v); if (v >= 1) b.y = W + REST; }
    } else if (h.act === 'reel') {
      const u = sstep(h.actT / REEL);
      b.lerpVectors(h.from, h.dangle, u);
      b.y = h.from.y + (h.dangle.y - h.from.y) * sstep((u - 0.3) / 0.7);
    } else b.copy(h.dangle);
  }
  function rippleTick(step) {
    const h = hal, R = h.ripple;
    if (h.rip < 1 && h.act !== 'home' && !h.culled) {
      h.rip = Math.min(1, h.rip + step / 1.1);
      R.visible = h.rip < 1; R.position.set(h.B.x, C.WATER + 0.02, h.B.z); R.scale.setScalar(1 + h.rip * 5); R.material.opacity = 0.75 * (1 - h.rip);
    } else R.visible = false;
  }
  function placeFish() {
    const h = hal, F = h.fish;
    const reeling = h.act === 'reel' && h.withFish && h.actT > REEL * 0.35;
    if (reeling) { F.visible = true; F.position.set(h.bob.position.x, h.bob.position.y - 0.32, h.bob.position.z); return; }
    if (h.act === 'show' || (h.giveT > GIVE * 0.35)) {
      F.visible = true; h.armL.localToWorld(F.position.set(0, -0.82, 0.08)); return;
    }
    F.visible = false;
  }

  /* ── her side ── */
  function trade(birdPos, beakEmpty) {
    const h = hal;
    if (!h || !h.fishReady || !beakEmpty || h.act === 'home' || h.culled) return null;
    const b = xyz(birdPos || (C.birdPos && C.birdPos())); if (!b) return null;
    const p = h.g.position;
    if (Math.hypot(b.x - p.x, b.z - p.z) >= 3 || Math.abs(b.y - p.y) > 2.5) return null;
    h.fishReady = false; h.given++; h.kept = Math.max(0, h.today - h.given); h.giveT = GIVE; h.giveTo = { x: b.x, z: b.z };
    return { who: 'Hal', say: SAY_TRADE, give: 'perch' };
  }
  function tug(birdPos) {
    const h = hal;
    if (!h || h.culled || (h.act !== 'hold')) return null;
    const b = xyz(birdPos || (C.birdPos && C.birdPos())); if (!b) return null;
    const q = h.bob.position;
    if (Math.hypot(b.x - q.x, b.z - q.z) >= 1 || Math.abs(b.y - q.y) > 1.5) return null;
    if (h.tugT <= 0 && h.tugCd <= 0) { h.tugT = BITE; h.tugCd = BITE + 1.5; h.dipK = -1; }
    if (h.tugDay === h.day) return null;
    h.tugDay = h.day;
    return { who: 'Hal', say: SAY_TUG };
  }

  /* draws he costs right now: his visible meshes + the line, bobber, tin, basket, fill, ripple, fish */
  function cost() {
    const h = hal; let n = 0;
    const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    h.g.traverse((o) => { if (o.isMesh && shown(o)) n++; });
    for (const o of [h.line, h.bob, h.tin, h.basket, h.fill, h.ripple, h.fish]) if (shown(o)) n++;
    return n;
  }
  function state() {
    const h = hal; if (!h) return null;
    h.g.updateWorldMatrix(true, true);
    const tip = tipW(new T.Vector3()), a = h.line.geometry.attributes.position.array, p = h.g.position;
    return {
      act: h.act, bobber: arr(h.bob.position), lineTop: [a[0], a[1], a[2]], lineEnd: [a[3], a[4], a[5]], rodTip: arr(tip),
      fishReady: h.fishReady, catches: h.catches, today: h.today, kept: h.kept, visible: h.g.visible, out: h.act !== 'home', culled: h.culled,
      wet: h.act === 'hold' || h.act === 'bite', at: arr(p), spot: [h.spot.x, C.H(h.spot.x, h.spot.z), h.spot.z], home: [h.home.x, C.H(h.home.x, h.home.z), h.home.z],
      tin: arr(h.tinAt), wormAt: arr(h.wormAt), basket: arr(h.basket.position), cast: arr(h.B), day: h.day, since: +h.since.toFixed(2), nextCatchIn: +(h.target - h.since).toFixed(2),
      casts: h.casts, holdFor: +h.holdFor.toFixed(2), draws: cost(),
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     THE CHILDREN — PIM AND TESS (board 552 §2–3). Marth, Oct 9: "I think there should be humans around the island."

     They play TAG on the village green: one runs, the other chases along the runner's own trail, and at the touch
     the two swap (the tagged one stops to laugh, then spins and chases; the tagger dashes off the way they came,
     looking back over a shoulder). After ~10 s of it one KNEELS AND DIGS for 9 s while the other bends over to
     watch, and a worm turns up: ctx.onDig(at) hands it to the game's treat pipeline. At most 2 dug worms lie on the
     green (ctx.dugLive()); while there are 2, the dig waits and they play on. Then tag again. Pim digs first, then
     Tess, in turn. At clock > 2040 they walk home into house 0; they come out after the dawn (clock 150).

     ⚠ No random draw anywhere: every waypoint, hole, speed and length is frac(salt + k·α) on a counter. Every motion is a
     closed-form function of the time into its phase (a spline run at a known speed, a straight walk), and every
     phase's end is known when the phase starts, so a big clock step (timeScale 8, ~11 fps headless) lands exactly
     where small steps would. A clock JUMP (> 30: sleep, setClock) snaps them: on the field by day, inside by night.
     ⚠ Nothing of Hal's is shared but THREE: his tick runs first and is the same code as before.
     ⚠ PHONE-LIGHT: each child is built by WFR_HUMANS (the villagers' rig and parts, KIDS looks, a 1.15 head) and then
     each rig node's visible parts are FOLDED into one mesh (each part's colour written into its vertices, the node's
     first texture kept): 7 meshes a child (6 in a dress) instead of ~22. Hidden past 120 m from the bird.

     WFR_FOLK.createKids(THREE, scene, ctx) → kids   once; WFR_FOLK.tick(dt) then runs them after Hal
     WFR_FOLK.kids()                                  → their state, for the bench (see kidsState)
     ctx required: H, VILLAGE {x,z}, getClock(), birdPos(), door {x,z} (house 0's threshold), doorOut {x,z} (where
       they step out)
     ctx optional: humans, renderer, emojiSprite, openDoor(sec) (hold house 0's door open that long),
       onDig(at) → false when no worm could be placed (at = [x, y, z], on the ground at the hole),
       dugLive() → how many dug worms still lie on the green (called every tick), onLaugh(at, who),
       field {x, z} (the middle of their ground; default VILLAGE + 12.5 m at −0.35 rad: clear of the well, the
       green sign, the dawn worms, every build site and the lantern ring), shadows (default true), cull (120),
       fold (default true)
     ═══════════════════════════════════════════════════════════════════════════ */
  const K_SCALE = 0.72 * 1.35, K_HEAD = 1.15;               // 72% of a villager (humans.js's opts.scale is absolute: theirs is 1.35)
  const K_FIELD_D = 12.5, K_FIELD_A = -0.35, K_WAY_R = 3.4, K_DIG_R = 2.6;
  const K_CATCH = 0.6, K_PAUSE = 0.8, K_RISE = 1.0, K_TAG = 6, K_TAG_SPAN = 3, K_DIG = 9, K_FIND = 1.8, K_LAG = 0.8;
  const K_WALK = 1.5, K_JOG = 2.1, OUT_AT = 150, MAX_DUG = 2, RAMP_R = 0.35, RAMP_C = 0.3;
  const K_STEP_RUN = 3.6 * 1.35 / K_SCALE * 0.85, K_STEP_WALK = 3.6 * 1.35 / K_SCALE;   // stride phase per metre: short legs take more steps
  const R2A = 0.7548776662466927, R2B = 0.5698402909980532;   // the plastic number's 2-D low-discrepancy pair
  const ramp = (u, a) => (u <= 0 ? 0 : u < a ? u * u / (2 * a) : u - a / 2);   // distance run by time u, starting from still
  const KID_PAL = [
    { name: 'Pim', alt: 4, pal: { shirt: 0xe3a23b, pants: 0x3e5f86, shoes: 0xb8322e, skin: 0xf0c3a0, hair: 0x9a4f22 } },
    { name: 'Tess', alt: 3, pal: { shirt: 0xd9667f, pants: 0xf0e8d6, shoes: 0x4a2c1e, skin: 0xa86a44, hair: 0x231610 } },
  ];

  /* the fold: one mesh per rig node, the parts' colours in the vertices (the shared geometries are copied, never touched) */
  const FOLDMAT = {};
  function fold(m, shadows) {
    const hiddenUp = (o) => { for (let p = o.parent; p && p !== m.g; p = p.parent) if (!p.visible) return true; return false; };
    const groups = new Map();
    m.g.traverse((o) => { if (o.isMesh && o.visible && !hiddenUp(o)) { if (!groups.has(o.parent)) groups.set(o.parent, []); groups.get(o.parent).push(o); } });
    const v = new T.Vector3(), nm = new T.Matrix3();
    for (const [node, list] of groups) {
      let nv = 0, ni = 0;
      for (const o of list) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
      let vo = 0, io = 0;
      for (const o of list) {
        o.updateMatrix(); nm.getNormalMatrix(o.matrix);
        const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, c = o.material.color || new T.Color(1, 1, 1), n = P.count;
        for (let i = 0; i < n; i++) {
          const q = (vo + i) * 3;
          v.fromBufferAttribute(P, i).applyMatrix4(o.matrix); pos[q] = v.x; pos[q + 1] = v.y; pos[q + 2] = v.z;
          if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[q] = v.x; nor[q + 1] = v.y; nor[q + 2] = v.z; }
          if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
          col[q] = c.r; col[q + 1] = c.g; col[q + 2] = c.b;
        }
        if (g.index) { const a = g.index.array; for (let k = 0; k < a.length; k++) idx[io + k] = a[k] + vo; io += a.length; }
        else { for (let k = 0; k < n; k++) idx[io + k] = vo + k; io += n; }
        vo += n;
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
      geo.setIndex(new T.BufferAttribute(idx, 1)); geo.computeBoundingSphere();
      const base = list[0].material, rough = base.roughness == null ? 0.8 : base.roughness, key = [base.map ? base.map.uuid : '-', rough, base.side].join('|');
      const mat = FOLDMAT[key] || (FOLDMAT[key] = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough, metalness: 0, side: base.side, map: base.map || null }));
      for (const o of list) node.remove(o);
      const mesh = new T.Mesh(geo, mat); mesh.name = 'fold'; mesh.castShadow = !!shadows; mesh.receiveShadow = true; node.add(mesh);
    }
  }
  function dirtMesh() {             // the hole they dig: a dark scoop and the soil heaped round it (one draw for both holes)
    const P = [part(new T.CircleGeometry(0.2, 12), 0x2e2016, 0, 0.025, 0, -Math.PI / 2)];
    for (const [a, r, s] of [[0.4, 0.3, 0.16], [1.5, 0.32, 0.13], [2.6, 0.29, 0.15], [3.9, 0.31, 0.12], [5.0, 0.3, 0.14]]) P.push(part(new T.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0x6b4a2e, Math.cos(a) * r, 0, Math.sin(a) * r, 0, a, 0, s * 1.25, s * 0.8, s));
    const im = new T.InstancedMesh(merged(P), vmat({ roughness: 1 }), 2); im.frustumCulled = false; im.receiveShadow = true; im.name = 'folk:holes';
    const z = new T.Matrix4().makeScale(0, 0, 0); im.setMatrixAt(0, z); im.setMatrixAt(1, z); im.instanceMatrix.needsUpdate = true;
    return im;
  }

  function createKids(THREE, scene, ctx) {
    T = THREE; K = Object.assign({}, ctx || {});
    if (kid) disposeKids();
    const HUM = K.humans || window.WFR_HUMANS, V = K.VILLAGE;
    if (!HUM || typeof K.H !== 'function' || !V || !K.door) throw new Error('WFR_FOLK.createKids: ctx needs H, VILLAGE, door and WFR_HUMANS');
    const shadows = K.shadows !== false, F = K.field || { x: V.x + Math.cos(K_FIELD_A) * K_FIELD_D, z: V.z + Math.sin(K_FIELD_A) * K_FIELD_D };
    const list = KID_PAL.map((p, j) => {
      const look = HUM.KIDS ? HUM.KIDS[j] : null;
      const m = HUM.make(T, p.alt, p.pal, { renderer: K.renderer, look, scale: K_SCALE, headScale: look ? K_HEAD : 1, shadows });
      m.g.name = 'folk:' + p.name.toLowerCase();
      for (const k in m.props) if (m.props[k]) m.props[k].visible = false;
      if (K.fold !== false) fold(m, shadows); else m.g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
      scene.add(m.g);
      const laugh = K.emojiSprite ? K.emojiSprite('\u{1F606}', 0.6) : sprite('\u{1F606}', 0.6); laugh.visible = false; laugh.name = 'folk:laugh'; scene.add(laugh);
      return Object.assign(m, { name: p.name, j, pos: new T.Vector3(), last: new T.Vector3(), yaw: 0, stride: j * 1.3, in: false, culled: false, laughT: 0, laugh, kind: 'stand', want: 0, lookAt: null, snap: true });
    });
    const holes = dirtMesh(); scene.add(holes);
    const ud = { x: K.door.x - F.x, z: K.door.z - F.z }, ul = Math.hypot(ud.x, ud.z) || 1;
    kid = { list, scene, F, U: { x: ud.x / ul, z: ud.z / ul }, holesMesh: holes, holes: [], slots: [null, null], cull: K.cull || 120,
      ph: { k: 'inside', end: Infinity }, pt: 0, lt: 0, day: 0, lastClock: 0, wp: 0, dk: 0, rounds: 0, tags: 0, tagPhases: 0, tagT: 0, tagLen: K_TAG,
      digs: 0, found: 0, dugLive: 0, culled: false };
    const c0 = K.getClock ? K.getClock() : 600;
    kid.lastClock = c0;
    if (c0 > HOME_AT || c0 < OUT_AT) toInside(); else snapField();
    kidsTick(0);
    return kid;
  }
  function disposeKids() {
    for (const k of kid.list) { if (k.g.parent) k.g.parent.remove(k.g); if (k.laugh.parent) k.laugh.parent.remove(k.laugh); }
    if (kid.holesMesh.parent) kid.holesMesh.parent.remove(kid.holesMesh);
    kid = null;
  }

  /* ── where they go ── */
  function kField(n, rMax, salt) {  // the n-th point of a low-discrepancy fill of the disc of radius rMax round the field's middle
    const u = frac(salt + n * R2A), w = frac(salt * 1.7 + n * R2B), r = rMax * Math.sqrt(u), a = 2 * Math.PI * w;
    return { x: kid.F.x + r * Math.cos(a), z: kid.F.z + r * Math.sin(a) };
  }
  function spline(P, per) {         // a centripetal Catmull-Rom through P, sampled, with its running length
    const n = P.length, E = [{ x: 2 * P[0].x - P[1].x, z: 2 * P[0].z - P[1].z }].concat(P, [{ x: 2 * P[n - 1].x - P[n - 2].x, z: 2 * P[n - 1].z - P[n - 2].z }]);
    const xs = [], zs = [], at = [0], L = (a, b) => Math.max(1e-4, Math.sqrt(Math.hypot(b.x - a.x, b.z - a.z)));
    for (let i = 0; i < n - 1; i++) {
      const p0 = E[i], p1 = E[i + 1], p2 = E[i + 2], p3 = E[i + 3], t0 = 0, t1 = L(p0, p1), t2 = t1 + L(p1, p2), t3 = t2 + L(p2, p3);
      for (let k = i ? 1 : 0; k <= per; k++) {
        const t = t1 + (t2 - t1) * k / per, l = (a, b, ta, tb) => { const w = (t - ta) / (tb - ta); return { x: a.x + (b.x - a.x) * w, z: a.z + (b.z - a.z) * w }; };
        const A1 = l(p0, p1, t0, t1), A2 = l(p1, p2, t1, t2), A3 = l(p2, p3, t2, t3), q = l(l(A1, A2, t0, t2), l(A2, A3, t1, t3), t1, t2);
        xs.push(q.x); zs.push(q.z);
      }
      at.push(xs.length - 1);
    }
    const cum = [0]; for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]));
    return { xs, zs, cum, at, len: cum[cum.length - 1] };
  }
  function trailAt(tr, s) {         // the point s metres along, and the way it runs there
    const c = tr.cum, n = c.length, X = tr.xs, Z = tr.zs;
    if (s <= 0) return { x: X[0], z: Z[0], dx: X[1] - X[0], dz: Z[1] - Z[0] };
    if (s >= tr.len) { const dx = X[n - 1] - X[n - 2], dz = Z[n - 1] - Z[n - 2], d = Math.hypot(dx, dz) || 1, e = s - tr.len; return { x: X[n - 1] + dx / d * e, z: Z[n - 1] + dz / d * e, dx, dz }; }
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c[mid] <= s) lo = mid; else hi = mid; }
    const w = (s - c[lo]) / ((c[hi] - c[lo]) || 1);
    return { x: X[lo] + (X[hi] - X[lo]) * w, z: Z[lo] + (Z[hi] - Z[lo]) * w, dx: X[hi] - X[lo], dz: Z[hi] - Z[lo] };
  }
  function addWaypoint(P) {         // the next point of the field's sequence that makes a good leg: ≥ 2.4 m on, never back through the one behind
    const a = P[P.length - 2], b = P[P.length - 1], ll = Math.hypot(b.x - a.x, b.z - a.z) || 1, lx = (b.x - a.x) / ll, lz = (b.z - a.z) / ll;
    for (let k = 0; k < 40; k++) {
      const w = kField(kid.wp++, K_WAY_R, 0.5), dx = w.x - b.x, dz = w.z - b.z, d = Math.hypot(dx, dz);
      if (d < 2.4 || (dx * lx + dz * lz) / d < (P.length === 2 ? -0.2 : -0.35)) continue;
      P.push(w); return;
    }
    P.push(kField(kid.wp++, K_WAY_R, 0.5));
  }

  /* ── the phases: each knows its end when it starts ── */
  function startTag(runner, chaser, pause) {
    const L = kid.list, R = L[runner].pos, Cp = L[chaser].pos, j = kid.rounds++;
    const vR = 2.4 + 0.4 * seq(j, 0.13, SILVER), vC = vR + 0.45 + 0.35 * seq(j, 0.61, E1);
    const P = [{ x: Cp.x, z: Cp.z }, { x: R.x, z: R.z }];
    if (Math.hypot(R.x - Cp.x, R.z - Cp.z) < 0.3) P[1] = { x: R.x + kid.U.z * 0.3, z: R.z - kid.U.x * 0.3 };
    let tr = null, s0 = 0, u = 0;
    for (let tries = 0; tries < 16; tries++) {
      addWaypoint(P); if (P.length < 4) continue;
      tr = spline(P, 14); s0 = tr.cum[tr.at[1]];
      u = Math.max(pause + RAMP_C + 0.2, (s0 - K_CATCH + vC * (pause + RAMP_C / 2) - vR * RAMP_R / 2) / (vC - vR));   // when the chaser closes to arm's length
      if (tr.len >= s0 + vR * ramp(u, RAMP_R) + 1.5) break;
    }
    kid.ph = { k: 'tag', end: u, runner, chaser, trail: tr, s0, vR, vC, pause };
  }
  function newTagSpell() { kid.tagT = 0; kid.tagLen = K_TAG + K_TAG_SPAN * seq(kid.tagPhases++, 0.19, PHI); }
  function startDig() {
    const L = kid.list, dg = kid.digs % 2, wt = 1 - dg; kid.digs++;
    let D = null;
    for (let k = 0; k < 40 && !D; k++) { const q = kField(kid.dk++, K_DIG_R, 0.27); if (kid.holes.every((h) => Math.hypot(h.x - q.x, h.z - q.z) >= 1.8)) D = q; }
    if (!D) D = kField(kid.dk++, K_DIG_R, 0.27);
    const A = L[dg].pos, B = L[wt].pos;
    let ax = A.x - D.x, az = A.z - D.z; const al = Math.hypot(ax, az); if (al < 1e-3) { ax = kid.U.x; az = kid.U.z; } else { ax /= al; az /= al; }
    const c = Math.cos(1.9), s = Math.sin(1.9);
    const to = []; to[dg] = { x: D.x + ax * 0.55, z: D.z + az * 0.55 }; to[wt] = { x: D.x + (ax * c - az * s) * 1.15, z: D.z + (ax * s + az * c) * 1.15 };   // she kneels on the side she came from; the other a step round
    const from = [{ x: L[0].pos.x, z: L[0].pos.z }, { x: L[1].pos.x, z: L[1].pos.z }], dur = [0, 1].map((i) => Math.hypot(to[i].x - from[i].x, to[i].z - from[i].z) / K_JOG);
    kid.holes.unshift(D); if (kid.holes.length > 2) kid.holes.length = 2;
    kid.slots[(kid.digs - 1) % 2] = { x: D.x, z: D.z, grow: 0 };
    kid.ph = { k: 'goDig', end: Math.max(0.4, dur[0], dur[1]), digger: dg, watcher: wt, D, from, to, dur };
  }
  function startHome() {
    const L = kid.list, d = K.door, from = L.map((k) => ({ x: k.pos.x, z: k.pos.z })), dur = L.map((k) => (k.in ? 0 : Math.hypot(d.x - k.pos.x, d.z - k.pos.z) / K_WALK));
    kid.ph = { k: 'home', end: Math.max(dur[0], dur[1]), from, dur, opened: [false, false] };
  }
  function toInside() { kid.ph = { k: 'inside', end: Infinity }; kid.pt = 0; for (const k of kid.list) { k.in = true; k.snap = true; } }
  function startOut() {
    const o = K.doorOut || K.door, to = [{ x: kid.F.x - kid.U.x * 0.9, z: kid.F.z - kid.U.z * 0.9 }, { x: kid.F.x + kid.U.x * 0.9, z: kid.F.z + kid.U.z * 0.9 }];
    const delay = [0, K_LAG], dur = [0, 1].map((i) => delay[i] + Math.hypot(to[i].x - o.x, to[i].z - o.z) / K_JOG);
    kid.ph = { k: 'out', end: Math.max(dur[0], dur[1]), from: { x: o.x, z: o.z }, to, delay, dur };
    if (K.openDoor) K.openDoor(K_LAG + 3);
  }
  function snapField() {
    const L = kid.list, F = kid.F, U = kid.U;
    setXZ(L[0], F.x - U.x * 1.0, F.z - U.z * 1.0); setXZ(L[1], F.x + U.x * 1.0, F.z + U.z * 1.0);
    for (const k of L) { k.in = false; k.snap = true; k.yaw = Math.atan2(-U.x, -U.z); }
    newTagSpell(); startTag(0, 1, K_PAUSE); kid.pt = 0;
  }
  function setXZ(k, x, z) { k.pos.set(x, K.H(x, z), z); }
  function laughAt(k, t) { k.laughT = Math.max(k.laughT, t); if (typeof K.onLaugh === 'function') { try { K.onLaugh(arr(k.pos), k.name); } catch (e) { /* the game's side */ } } }
  function kNext() {
    const ph = kid.ph, L = kid.list;
    kPlace();                                   // where everyone is at the end of the phase
    kid.pt = 0;
    if (ph.k === 'tag') {
      kid.tags++; kid.tagT += ph.end;
      laughAt(L[ph.runner], K_PAUSE + 0.5); laughAt(L[ph.chaser], 0.8);
      if (kid.tagT >= kid.tagLen && kid.dugLive < MAX_DUG) startDig(); else startTag(ph.chaser, ph.runner, K_PAUSE);   // the tagged one is it now
    } else if (ph.k === 'goDig') kid.ph = { k: 'dig', end: K_DIG, digger: ph.digger, watcher: ph.watcher, D: ph.D, to: ph.to };
    else if (ph.k === 'dig') {
      const D = ph.D, at = [+D.x.toFixed(4), +K.H(D.x, D.z).toFixed(4), +D.z.toFixed(4)];
      let r = true; if (typeof K.onDig === 'function') { try { r = K.onDig(at); } catch (e) { r = false; } }
      const found = r !== false; if (found) { kid.found++; kid.dugLive++; }
      if (found) { laughAt(L[ph.digger], K_FIND); laughAt(L[ph.watcher], K_FIND - 0.4); }
      kid.ph = { k: 'find', end: K_FIND, digger: ph.digger, watcher: ph.watcher, D, to: ph.to, found };
    } else if (ph.k === 'find') { newTagSpell(); startTag(ph.watcher, ph.digger, K_RISE); }   // the watcher tags the finder and runs
    else if (ph.k === 'home') toInside();
    else if (ph.k === 'out') { newTagSpell(); startTag(0, 1, K_PAUSE); }
  }
  function kAdvance(step) {
    for (let guard = 0; step > 1e-9 && guard < 64; guard++) {
      const left = kid.ph.end - kid.pt;
      if (step < left) { kid.pt += step; return; }
      step -= Math.max(0, left); kid.pt = kid.ph.end; kNext();
    }
  }
  /* everyone's place, heading and act at (phase, time into it): a pure function of the two */
  function kPlace() {
    const ph = kid.ph, t = kid.pt, L = kid.list, toward = (k, p) => Math.atan2(p.x - k.pos.x, p.z - k.pos.z);
    for (const k of L) k.lookAt = null;
    if (ph.k === 'tag') {
      const R = L[ph.runner], Cc = L[ph.chaser], a = trailAt(ph.trail, ph.s0 + ph.vR * ramp(t, RAMP_R)), b = trailAt(ph.trail, t < ph.pause ? 0 : ph.vC * ramp(t - ph.pause, RAMP_C));
      setXZ(R, a.x, a.z); setXZ(Cc, b.x, b.z); R.in = Cc.in = false;
      R.kind = 'run'; R.want = Math.atan2(a.dx, a.dz); if (t < 1.1) R.lookAt = Cc;   // a look back over the shoulder as she dashes off
      if (t < ph.pause) { Cc.kind = 'laugh'; Cc.want = toward(Cc, R.pos); }
      else { Cc.kind = ph.end - t < 0.4 ? 'reach' : 'run'; Cc.want = Math.atan2(b.dx, b.dz); }
    } else if (ph.k === 'goDig' || ph.k === 'dig' || ph.k === 'find') {
      for (let i = 0; i < 2; i++) {
        const k = L[i], dig = i === ph.digger;
        if (ph.k === 'goDig') {
          const u = ph.dur[i] > 1e-6 ? Math.min(1, t / ph.dur[i]) : 1, f = ph.from[i], g = ph.to[i];
          setXZ(k, f.x + (g.x - f.x) * u, f.z + (g.z - f.z) * u);
          if (u < 1) { k.kind = 'jog'; k.want = Math.atan2(g.x - f.x, g.z - f.z); } else { k.kind = 'stand'; k.want = toward(k, ph.D); }
        } else {
          setXZ(k, ph.to[i].x, ph.to[i].z); k.want = toward(k, ph.D);
          k.kind = ph.k === 'dig' ? (dig ? 'dig' : 'watch') : ph.found ? 'cheer' : dig ? 'shrug' : 'stand';
        }
        k.in = false;
      }
    } else if (ph.k === 'home') {
      const d = K.door;
      for (let i = 0; i < 2; i++) {
        const k = L[i], f = ph.from[i], u = ph.dur[i] > 1e-6 ? Math.min(1, t / ph.dur[i]) : 1;
        if (!ph.opened[i] && t >= ph.dur[i] - 2.5 / K_WALK) { ph.opened[i] = true; if (K.openDoor) K.openDoor(3); }
        if (u >= 1) { k.in = true; setXZ(k, d.x, d.z); continue; }
        setXZ(k, f.x + (d.x - f.x) * u, f.z + (d.z - f.z) * u); k.kind = 'walk'; k.want = Math.atan2(d.x - f.x, d.z - f.z);
      }
    } else if (ph.k === 'out') {
      const o = ph.from;
      for (let i = 0; i < 2; i++) {
        const k = L[i], g = ph.to[i];
        if (t < ph.delay[i]) { k.in = true; setXZ(k, o.x, o.z); k.snap = true; continue; }
        if (k.in) { k.in = false; k.snap = true; k.yaw = Math.atan2(g.x - o.x, g.z - o.z); }
        const u = Math.min(1, (t - ph.delay[i]) / Math.max(1e-6, ph.dur[i] - ph.delay[i]));
        setXZ(k, o.x + (g.x - o.x) * u, o.z + (g.z - o.z) * u);
        if (u < 1) { k.kind = 'jog'; k.want = Math.atan2(g.x - o.x, g.z - o.z); } else { k.kind = 'stand'; k.want = toward(k, L[1 - i].pos); }
      }
    } else for (const k of L) { k.in = true; setXZ(k, K.door.x, K.door.z); }   // indoors: kept at the threshold, not drawn
  }

  /* ── their bodies: the villagers' rig (legL/legR/armL/armR .x/.z, body.y, waist .x/.z, head .x/.y) ── */
  function kPose(k, r, rf, t) {
    const m = k, w = Math.sin(k.stride), kind = k.kind;
    if (k.model && window.WFR_VILLAGERS) WFR_VILLAGERS.kidPose(k, kind);   // 618: a model child plays the kind's clip; the eases below land on loose objects
    let lL = 0, lR = 0, aL = 0, aR = 0, aLz = 0, aRz = 0, by = 0, hx = 0, wx = 0, wz = 0, fast = false;
    if (kind === 'run' || kind === 'reach') {
      lL = w * 0.95; lR = -lL; aL = -w * 0.9 - 0.3; aR = w * 0.9 - 0.3; aLz = -0.14; aRz = 0.14; by = Math.abs(Math.cos(k.stride)) * 0.12 - 0.02; wx = 0.22; hx = -0.08; fast = true;
      if (kind === 'reach') { aR = -1.55; aRz = 0.05; wx = 0.32; }       // the arm out for the touch
    } else if (kind === 'jog') { lL = w * 0.7; lR = -lL; aL = -w * 0.6 - 0.2; aR = w * 0.6 - 0.2; aLz = -0.08; aRz = 0.08; by = Math.abs(Math.cos(k.stride)) * 0.07; wx = 0.1; fast = true; }
    else if (kind === 'walk') { lL = w * 0.55; lR = -lL; aL = -w * 0.4; aR = w * 0.4; by = Math.abs(Math.cos(k.stride)) * 0.04; fast = true; }
    else if (kind === 'laugh') { const s = Math.sin(t * 17); aL = aR = -0.5; aLz = 0.5; aRz = -0.5; hx = -0.32 + s * 0.06; wx = -0.12 + s * 0.05; by = Math.abs(Math.sin(t * 8.5)) * 0.06; }   // hands to the belly, head back, shaking with it
    else if (kind === 'dig') { const s = Math.sin(t * 7.5); lL = -1.4; lR = 0.2; by = -0.42; wx = 0.6; aL = -1.15 + s * 0.38; aR = -1.15 - s * 0.38; aLz = 0.16; aRz = -0.16; hx = 0.4; wz = s * 0.05; }   // on one knee, scooping, hand over hand
    else if (kind === 'watch') { lL = -0.12; lR = 0.12; wx = 0.55; aL = aR = -0.32; aLz = 0.3; aRz = -0.3; by = -0.04; hx = -0.15 + Math.sin(t * 1.3) * 0.05; }   // bent over, hands on the knees
    else if (kind === 'cheer') { const hop = Math.abs(Math.sin(t * 6.5)); aL = aR = -2.75 + Math.sin(t * 13) * 0.12; aLz = -0.3; aRz = 0.3; by = hop * 0.28; lL = -hop * 0.25; lR = -hop * 0.15; hx = -0.3; }
    else if (kind === 'shrug') { aL = aR = -0.3; aLz = -0.55; aRz = 0.55; hx = 0.12; wz = 0.08; }
    else { aL = Math.sin(t * 1.6 + k.j) * 0.04; aR = -aL; }
    const q = fast ? rf : r;
    ease(m.legL.rotation, 'x', lL, q); ease(m.legR.rotation, 'x', lR, q); ease(m.armL.rotation, 'x', aL, q); ease(m.armR.rotation, 'x', aR, q);
    ease(m.armL.rotation, 'z', aLz, r); ease(m.armR.rotation, 'z', aRz, r); ease(m.body.position, 'y', by, q); ease(m.head.rotation, 'x', hx, r);
    if (m.waist) { ease(m.waist.rotation, 'x', wx, r); ease(m.waist.rotation, 'z', wz, r); }
  }

  function kidsTick(dt, ctx) {
    if (!kid) return;
    const getClock = (ctx && ctx.getClock) || K.getClock, getBird = (ctx && ctx.birdPos) || K.birdPos;
    dt = dt || 0;
    const clock = getClock ? getClock() : 600;
    const prev = kid.lastClock;
    let dc = clock - prev; const wrapped = clock < prev; if (wrapped) { dc += CYCLE; kid.day++; }
    kid.lastClock = clock;
    const night = clock > HOME_AT || clock < OUT_AT;
    kid.dugLive = typeof K.dugLive === 'function' ? K.dugLive() | 0 : 0;
    let step = 0, pre = 0, go = null;
    if (dc > JUMP) {                                          // slept, or the bench set the clock: where the new hour has them
      if (night) toInside(); else if (kid.ph.k === 'inside' || kid.ph.k === 'home' || kid.ph.k === 'out') snapField();
    } else {
      step = dc > 1e-6 ? dc / (K.pace || 1) : dt;             /* 652: the clock runs DAY_SPEED x (648); their legs live in real seconds (a frozen clock: dt) */
      /* the hour turns INSIDE this step: the old phase runs to the boundary, the new one from it (so any frame rate lands alike) */
      if (night && kid.ph.k !== 'home' && kid.ph.k !== 'inside') { go = startHome; if (dc > 1e-6 && !wrapped && prev <= HOME_AT) pre = Math.min(step, (HOME_AT - prev) / (K.pace || 1)); }   /* 652: the boundary in seconds too (Obito) */
      else if (!night && kid.ph.k === 'inside') { go = startOut; if (dc > 1e-6 && !wrapped && prev < OUT_AT) pre = Math.min(step, (OUT_AT - prev) / (K.pace || 1)); }
    }
    kid.lt += dt;
    for (const k of kid.list) k.laughT = Math.max(0, k.laughT - step);
    if (go) { kAdvance(pre); kPlace(); kid.pt = 0; go(); step -= pre; }
    kAdvance(step);
    kPlace();

    const bp = getBird ? xyz(getBird()) : null, F = kid.F, e = Math.max(step, dt), r = Math.min(1, e * 10), rf = Math.min(1, e * 25);
    kid.culled = bp ? Math.hypot(bp.x - F.x, bp.z - F.z) > kid.cull + 30 : false;   // the holes (the children carry their own cull)
    for (const k of kid.list) {
      k.culled = bp ? Math.hypot(bp.x - k.pos.x, bp.z - k.pos.z) > kid.cull : false;
      const show = !k.in && !k.culled;
      if (k.snap) { k.last.copy(k.pos); k.snap = false; }
      const moved = Math.hypot(k.pos.x - k.last.x, k.pos.z - k.last.z); k.last.copy(k.pos);
      if (moved < 4) k.stride += moved * (k.kind === 'walk' ? K_STEP_WALK : K_STEP_RUN);
      k.g.visible = show; k.g.position.copy(k.pos);
      if (!show) { k.laugh.visible = false; continue; }
      const d = Math.atan2(Math.sin(k.want - k.yaw), Math.cos(k.want - k.yaw)); k.yaw += d * r; k.g.rotation.y = k.yaw;
      kPose(k, r, rf, kid.lt);
      let look = 0, lim = 0.8;                                 // the head: back at the chaser, or on the little bird when she is near and they are still
      if (k.lookAt) { const b = Math.atan2(k.lookAt.pos.x - k.pos.x, k.lookAt.pos.z - k.pos.z) - k.yaw; look = Math.atan2(Math.sin(b), Math.cos(b)); lim = 1.2; }
      else if (bp && k.kind !== 'run' && k.kind !== 'jog' && k.kind !== 'walk' && Math.hypot(bp.x - k.pos.x, bp.z - k.pos.z) < 9) { const b = Math.atan2(bp.x - k.pos.x, bp.z - k.pos.z) - k.yaw; look = Math.atan2(Math.sin(b), Math.cos(b)); }
      look = Math.max(-lim, Math.min(lim, look)); k.head.rotation.y += (look - k.head.rotation.y) * Math.min(1, e * 6);
      k.laugh.visible = k.laughT > 0;
      if (k.laugh.visible) k.laugh.position.set(k.pos.x, k.pos.y + K_SCALE * 2.75 + 0.45 + Math.sin(kid.lt * 9) * 0.04, k.pos.z);
    }
    /* the holes: the one being dug grows with the digging; the last two stay */
    const ph = kid.ph, im = kid.holesMesh, mx = kid.mx || (kid.mx = new T.Matrix4());
    let any = false;
    for (let i = 0; i < 2; i++) {
      const s = kid.slots[i]; if (!s) continue; any = true;
      const cur = (ph.k === 'goDig' || ph.k === 'dig') && (kid.digs - 1) % 2 === i;
      const g = cur ? (ph.k === 'dig' ? 0.3 + 0.7 * Math.min(1, kid.pt / K_DIG) : 0) : 1;
      if (g !== s.grow || !s.set) { s.grow = g; s.set = true; mx.makeScale(g, g, g).setPosition(s.x, K.H(s.x, s.z), s.z); im.setMatrixAt(i, mx); im.instanceMatrix.needsUpdate = true; }
    }
    im.visible = any && !kid.culled;
  }
  function kidsCost() {
    let n = 0; const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    for (const k of kid.list) { k.g.traverse((o) => { if (o.isMesh && shown(o)) n++; }); if (shown(k.laugh)) n++; }
    if (shown(kid.holesMesh)) n++;
    return n;
  }
  function kidsState() {
    if (!kid) return null;
    const ph = kid.ph, V = K.VILLAGE, L = kid.list, nm = (i) => (i == null ? null : L[i].name);
    return {
      pace: K.pace || 1,   /* 652 */ phase: ph.k, t: +kid.pt.toFixed(4), end: ph.end === Infinity ? null : +ph.end.toFixed(4),
      it: ph.k === 'tag' ? nm(ph.chaser) : null, runner: ph.k === 'tag' ? nm(ph.runner) : null, digger: ph.digger != null ? nm(ph.digger) : null,
      tags: kid.tags, rounds: kid.rounds, digs: kid.digs, found: kid.found, dugLive: kid.dugLive, day: kid.day,
      holes: kid.holes.map((h) => [+h.x.toFixed(4), +K.H(h.x, h.z).toFixed(4), +h.z.toFixed(4)]),
      field: [+kid.F.x.toFixed(4), +kid.F.z.toFixed(4)], door: [K.door.x, K.door.z],
      kids: L.map((k) => ({ name: k.name, at: arr(k.pos), yaw: +k.yaw.toFixed(4), pose: k.kind, inside: k.in, visible: k.g.visible, laughing: k.laughT > 0,
        fromVillage: +Math.hypot(k.pos.x - V.x, k.pos.z - V.z).toFixed(3), pk: +Math.hypot((k.pos.x - 70) * 0.8, k.pos.z - 230).toFixed(3) })),
      draws: kidsCost(),
    };
  }

  return { create, tick, trade, tug, state, createKids, kids: kidsState, get hal() { return hal; }, get children() { return kid; }, SAY: { trade: SAY_TRADE, tug: SAY_TUG } };
})();
