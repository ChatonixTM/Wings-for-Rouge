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
  const WALK = 1.6;                                        // m per clock unit: the villagers' pace
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
    tick(0);
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
  function tick(dt, ctx) {
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
    } else step = dc > 1e-6 ? dc : dt;                      // a frozen clock (the tutorial's 1799): life goes on in real time
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

  return { create, tick, trade, tug, state, get hal() { return hal; }, SAY: { trade: SAY_TRADE, tug: SAY_TUG } };
})();
