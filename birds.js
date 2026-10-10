/* ═══════════════════════════════════════════════════════════════════════════
   WFR_BIRDS — the six birds of "Wings for Rouge", built to read as the real
   species at game distance, and the way each one comes down out of the sky.

   Marth, Oct 8 2026: the birds must look much better, "nostalgic but polished";
   and "when you reach a certain point the bird should flap its wings and
   dismount from the sky … all the birds land differently".

   API
     WFR_BIRDS.build(THREE, k, def, opts) → { g, wingL, wingR, tail, legs:[L,R], head }
       k    'cardinal' | 'bluejay' | 'crow' | 'falcon' | 'owl' | 'eagle'
       def  the game's BIRDS[k] row (body/wing/head/beak/legs/chest colours,
            legLen, size, crest, mask, owl). Unknown keys fall back to cardinal.
       opts { renderer, linear, folded }
            renderer  — used for WFR_TEX textures and to detect sRGB output
            linear    — force colour conversion sRGB→linear (default: true
                        when renderer.outputEncoding === THREE.sRGBEncoding)
            folded    — pre-fold the wings (rotation 0, ±1.3, ∓0.18), as mentors
     The SAME CONTRACT as the old buildBird: body centred at the origin, forward
     +z, up +y, wingL on +x. wingL/wingR are pivots at (±0.55, 0.2, 0.05):
     rotation.z = flap/flare (+ is up for wingL, − for wingR), rotation.y =
     fold back (wingL +1.3, wingR −1.3). Feet at local y = −(0.58 + legLen).
     g.scale = def.size, g.rotation.order = 'YXZ'. Every mesh owns its material.
     The hand (outer wing) follows the pivot by itself: it lags a beat behind
     the flap (the tip whips like feathers do), and when the pivot folds it
     tucks back over the tail and the primaries slide together.

     WFR_BIRDS.landing[k](t, rig)   t ∈ [0,1] landing progress, rig =
       { wingL, wingR, tail, legs, body: g }. Poses wings, tail, legs, and
       writes rig.offset = { pitch, y }: pitch is the FULL bird.rotation.x to
       use (negative = nose up), y is extra height in body units (× size).
       landing[k].dur       suggested seconds for the whole landing
       landing[k].descent(t) fraction 0..1 of the altitude lost by t (1 at t=1)
       landing[k].flare     the t where the flare (the braking) begins
     WFR_BIRDS.tuck(rig, a)  legs tucked back for flight (a = 0 standing … 1)
     WFR_BIRDS.now()         clock the hand-lag uses (overridable for tests)

     Board 611 (Oct 10; Marth: "the birds too, if u can squeeze in their walking + flying"), ADDITIVE:
     WFR_BIRDS.walk(rig, dt, o) → { y, pitch, roll, yaw }   the gait, called every frame on foot.
       o { speed (m/s along her facing, − backward), turn (−1..1), air, rest, still, shake (0..1) }
       The small birds HOP (both feet together, a little flight between), the bigger ones STRIDE (feet in turn,
       each planted while it carries her, the body riding lowest between steps); the head holds and thrusts,
       the tail balances, and standing still the head glances about. y is extra height in body units (× size),
       pitch / roll the FULL bird.rotation.x / .z, yaw is added to her heading. State lives on rig.gs.
     WFR_BIRDS.fly(rig, dt, o) → { y, pitch }   the wings in flight, called every frame in the air.
       o { flap, hover (0..1), long (0..1), flutter, dive, speed, turn (−1..1, + = to her right), legsDown, body, roll }
       A flap cycle with a quick, strong downstroke and a soft, folded upstroke; between bouts the species' own
       glide (the cardinal bounds with its wings shut, the eagle soars); the inner wing tucks and the tail twists
       into a turn; the tail fans when she slows; a fresh start in the air is a takeoff burst with the legs
       trailing up. Writes wing rotation x/y/z (y is the sweep: the game keeps it while unfolded), the hand's
       bend, the tail, the legs and the head (held level). State lives on rig.fs.
     WFR_BIRDS.rest(rig, dt)  eases the head, the legs' length and the tail's twist back to rest (other modes), for
       SETTLE (1.5) s after the last walk / fly / landing pose; after that it leaves the rig alone, so a mode that
       poses the bird itself (a swim stroke, a dance) is never pulled back.
     WFR_BIRDS.GAIT / FLY     the per-species numbers.
   ═══════════════════════════════════════════════════════════════════════════ */
window.WFR_BIRDS = (function () {
  'use strict';
  var API = { version: 1 };
  API.now = function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()); };

  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var bump = function (a, b, x) { if (x <= a || x >= b) return 0; return Math.sin(Math.PI * (x - a) / (b - a)); };

  /* ── the species: shapes the game's colour table does not carry ── */
  var SPEC = {
    cardinal: { body: [0.8, 0.9, 0.94], head: 0.42, headAt: [0, 0.44, 0.96],
      beak: { len: 0.32, rad: 0.17, hook: 0.06, squash: 0.85, seed: true }, eye: 'song',
      wing: { arm: 1.08, hand: 0.5, prim: 0.98, sec: 0.74, n: 6, aOut: 0.02, aIn: 1.25, w: 0.27, shape: 'round' },
      tail: { len: 1.2, n: 7, spread: 0.3, w: 0.26 }, crest: 1, mask: true, rough: 0.78 },
    bluejay: { body: [0.8, 0.88, 1.0], head: 0.43, headAt: [0, 0.44, 0.98],
      beak: { len: 0.4, rad: 0.13, hook: 0.05, squash: 0.85 }, eye: 'song',
      wing: { arm: 1.1, hand: 0.5, prim: 1.02, sec: 0.76, n: 6, aOut: 0.02, aIn: 1.25, w: 0.27, shape: 'round', bars: true },
      tail: { len: 1.35, n: 7, spread: 0.26, w: 0.25, bars: true }, crest: 1.05, necklace: true, face: true, rough: 0.78 },
    crow: { body: [0.82, 0.88, 1.12], head: 0.42, headAt: [0, 0.4, 1.12],
      beak: { len: 0.58, rad: 0.15, hook: 0.09, squash: 0.8 }, eye: 'dark',
      wing: { arm: 1.18, hand: 0.55, prim: 1.15, sec: 0.8, n: 5, aOut: -0.24, aIn: 0.95, w: 0.24, shape: 'finger' },
      tail: { len: 1.1, n: 7, spread: 0.32, w: 0.27 }, rough: 0.42, metal: 0.08 },
    falcon: { body: [0.86, 0.92, 1.02], head: 0.43, headAt: [0, 0.42, 1.04],
      beak: { len: 0.3, rad: 0.15, hook: 0.3, squash: 0.72, tip: true }, eye: 'falcon',
      wing: { arm: 1.12, hand: 0.66, prim: 1.28, sec: 0.64, n: 6, aOut: 0.32, aIn: 1.05, w: 0.24, shape: 'point' },
      tail: { len: 1.05, n: 7, spread: 0.2, w: 0.22, bars: true }, hood: true, rough: 0.8, trousers: 1.6 },
    owl: { body: [1.0, 1.08, 0.86], head: 0.56, headAt: [0, 0.6, 0.7],
      beak: { len: 0.26, rad: 0.1, hook: 0.22, squash: 0.75, down: 0.55 }, eye: 'owl',
      wing: { arm: 1.18, hand: 0.5, prim: 1.08, sec: 0.86, n: 6, aOut: -0.06, aIn: 1.25, w: 0.33, shape: 'round', bars: true },
      tail: { len: 0.7, n: 7, spread: 0.32, w: 0.27, bars: true }, disc: true, tufts: true, rough: 0.92, trousers: 1.4 },
    eagle: { body: [0.9, 0.95, 1.15], head: 0.45, headAt: [0, 0.44, 1.2],
      beak: { len: 0.46, rad: 0.2, hook: 0.3, squash: 0.7 }, eye: 'eagle',
      wing: { arm: 1.24, hand: 0.5, prim: 1.26, sec: 0.92, n: 6, aOut: -0.32, aIn: 0.88, w: 0.25, shape: 'finger' },
      tail: { len: 0.95, n: 8, spread: 0.3, w: 0.27, white: true }, collar: true, rough: 0.8, trousers: 2.4 }
  };
  API.SPEC = SPEC;
  /* which WFR_TEX surfaces the birds wear (null = plain colour); tintable near-white maps, multiplied into the colour */
  API.TEX = { body: 'down', head: 'down', wing: 'featherWing' };
  var DEF = {   // the game's table, for when def is not given (the preview)
    cardinal: { body: 0xc8202f, wing: 0xa8182a, head: 0xd02a35, beak: 0xf28c28, legs: 0x8a5a3a, legLen: 0.35, size: 0.42, crest: true, mask: true },
    bluejay: { body: 0x3f7fd0, wing: 0x2f5fb0, head: 0x4a8ae0, beak: 0x2a2a2a, legs: 0x3b3b3b, legLen: 0.35, size: 0.44, crest: true, chest: 0xf2f4f6 },
    crow: { body: 0x1f1f26, wing: 0x18181e, head: 0x24242c, beak: 0x2c2c2c, legs: 0x2c2c2c, legLen: 0.45, size: 0.5 },
    falcon: { body: 0x5d6b78, wing: 0x4b5763, head: 0x3a4550, beak: 0xf2c230, legs: 0xf2c230, legLen: 0.45, size: 0.5, chest: 0xf0ece4 },
    owl: { body: 0x9a7a55, wing: 0x86683f, head: 0x9a7a55, beak: 0xe0a83a, legs: 0x9a7a55, legLen: 0.3, size: 0.55, owl: true },
    eagle: { body: 0x6b4426, wing: 0x5a3820, head: 0xf5f1e6, beak: 0xf2b134, legs: 0xf2b134, legLen: 1.35, size: 0.6 }
  };
  API.DEF = DEF;

  /* ── geometry accumulator: many small parts → one BufferGeometry ── */
  function Acc() { this.P = []; this.N = []; this.U = []; this.C = []; this.I = []; }
  /* add a THREE geometry through matrix m; mul = number | fn(lx,ly,lz,u,v) → colour multiplier */
  Acc.prototype.add = function (THREE, geo, m, mul, warp) {
    var pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
    var base = this.P.length / 3, nm = new THREE.Matrix3().getNormalMatrix(m);
    var v = new THREE.Vector3(), n = new THREE.Vector3(), flip = m.determinant() < 0;
    for (var i = 0; i < pos.count; i++) {
      var lx = pos.getX(i), ly = pos.getY(i), lz = pos.getZ(i), u = uv ? uv.getX(i) : 0, w = uv ? uv.getY(i) : 0;
      v.set(lx, ly, lz).applyMatrix4(m); if (warp) warp(v);
      this.P.push(v.x, v.y, v.z);
      if (nor) n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); else n.set(0, 1, 0);
      this.N.push(n.x, n.y, n.z); this.U.push(u, w);
      var c = typeof mul === 'function' ? mul(lx, ly, lz, u, w) : (mul == null ? 1 : mul);
      if (typeof c === 'number') this.C.push(c, c, c); else this.C.push(c[0], c[1], c[2]);
    }
    var idx = geo.index, cnt = idx ? idx.count : pos.count;
    for (var j = 0; j < cnt; j += 3) {
      var a = idx ? idx.getX(j) : j, b = idx ? idx.getX(j + 1) : j + 1, c2 = idx ? idx.getX(j + 2) : j + 2;
      if (flip) this.I.push(base + a, base + c2, base + b); else this.I.push(base + a, base + b, base + c2);
    }
    return this;
  };
  Acc.prototype.geo = function (THREE, lin, renormal) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2));
    var C = lin ? this.C.map(function (x) { return Math.pow(Math.max(0, x), 2.2); }) : this.C;
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    g.setIndex(this.I);
    if (renormal) g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  };

  /* a single feather lying along +x, its upper face +y: narrow quill, broad vane, rounded tip.
     finger: the outer 40% narrows (an eagle's or a crow's slotted primaries). */
  var FW = [[0, 0.3], [0.1, 0.75], [0.3, 1], [0.55, 1], [0.75, 0.9], [0.88, 0.68], [0.96, 0.38], [1, 0.06]];
  function featherGeo(THREE, len, wid, finger) {
    var P = [], U = [], I = [];
    for (var i = 0; i < FW.length; i++) {
      var t = FW[i][0], w = FW[i][1] * wid * 0.5;
      if (finger && t > 0.5) w *= lerp(1, 0.55, smooth(0.5, 0.8, t));
      var x = t * len, ridge = 0.018 * wid + 0.01, droop = -0.012 * wid;
      P.push(x, droop, w, x, ridge, 0, x, droop, -w); U.push(t, 0, t, 0.5, t, 1);
      if (i) { var a = (i - 1) * 3, b = i * 3;
        I.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2); }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setIndex(I); g.computeVertexNormals(); return g;
  }
  /* a cambered panel (the coverts): f(u) → [x, zLead, zTrail], rows across the chord */
  function panelGeo(THREE, n, m, f, camber) {
    var P = [], U = [], I = [];
    for (var i = 0; i <= n; i++) { var u = i / n, r = f(u);
      for (var j = 0; j <= m; j++) { var v = j / m; P.push(r[0], camber * Math.sin(Math.PI * Math.pow(v, 0.7)) * (1 - 0.5 * u), lerp(r[1], r[2], v)); U.push(u, v); } }
    for (var i2 = 0; i2 < n; i2++) for (var j2 = 0; j2 < m; j2++) {
      var a = i2 * (m + 1) + j2, b = (i2 + 1) * (m + 1) + j2;
      I.push(a, b, a + 1, a + 1, b, b + 1);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setIndex(I); g.computeVertexNormals(); return g;
  }

  var M4 = function (THREE, px, py, pz, rx, ry, rz, sx, sy, sz, order) {
    var m = new THREE.Matrix4(), e = new THREE.Euler(rx || 0, ry || 0, rz || 0, order || 'XYZ');
    return m.compose(new THREE.Vector3(px || 0, py || 0, pz || 0), new THREE.Quaternion().setFromEuler(e),
      new THREE.Vector3(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz));
  };
  /* matrix that lays a +y-axis primitive (cylinder, cone) along a direction from a point */
  function along(THREE, from, dir, len) {
    var d = dir.clone().normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    var p = from.clone().addScaledVector(d, len / 2);
    return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
  }

  var cache = {};
  function cached(key, fn) { return cache[key] || (cache[key] = fn()); }

  /* striped canvas maps (made once): the Peregrine's barred belly, the owl's streaked breast */
  var maps = {};
  function stripeMap(THREE, kind, lin) {
    var key = kind + lin; if (maps[key]) return maps[key];
    if (typeof document === 'undefined') return null;
    var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
    if (kind === 'bars') {   // sphere v runs pole→pole: bars across the belly, the upper breast left plain
      x.fillStyle = 'rgba(40,46,58,0.78)';
      for (var y = 46; y < 124; y += 9) for (var i = 0; i < 128; i += 8) x.fillRect(i + ((y / 9) % 2) * 4, y, 6, 3);
      x.fillStyle = 'rgba(40,46,58,0.5)'; for (var k = 0; k < 40; k++) x.fillRect((k * 37) % 128, 30 + (k * 13) % 16, 2, 4);
    } else {   // streaks: short vertical dashes
      x.fillStyle = 'rgba(90,60,30,0.45)';
      for (var y2 = 4; y2 < 128; y2 += 9) for (var i2 = 0; i2 < 128; i2 += 7) { var jx = (i2 * 13 + y2 * 7) % 5; x.beginPath(); x.ellipse(i2 + jx + (y2 % 18 ? 3 : 0), y2, 1.2, 3.2, 0, 0, Math.PI * 2); x.fill(); }
    }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (lin) t.encoding = THREE.sRGBEncoding;
    maps[key] = t; return t;
  }

  /* ════════════════════════════ build ════════════════════════════ */
  API.build = function (THREE, k, def, opts) {
    opts = opts || {};
    var S = SPEC[k] || SPEC.cardinal, D = def || DEF[k] || DEF.cardinal;
    var R = opts.renderer, lin = opts.linear != null ? !!opts.linear : !!(R && R.outputEncoding === THREE.sRGBEncoding);
    var K = k + (lin ? ':L' : ':S');
    var g = new THREE.Group(), meshes = [];
    var col = function (hex) { var c = new THREE.Color(hex); if (lin) c.convertSRGBToLinear(); return c; };
    var mat = function (hex, o) { o = o || {};
      return new THREE.MeshStandardMaterial({ color: col(hex), roughness: o.rough != null ? o.rough : S.rough, metalness: o.metal != null ? o.metal : (S.metal || 0),
        vertexColors: !!o.vc, side: o.side || THREE.FrontSide, map: o.map || null }); };
    var texOn = function (mesh, name, rx, ry) {
      var T = typeof window !== 'undefined' && window.WFR_TEX;
      if (!T || !T.names || T.names.indexOf(name) < 0 || typeof T.apply !== 'function') return;
      try { T.apply(mesh, name, rx, ry, R); } catch (e) { /* plain colour it is */ }
    };
    var add = function (parent, geo, material, name) { var m = new THREE.Mesh(geo, material); m.name = name || ''; parent.add(m); meshes.push(m); return m; };
    var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
    var bx = S.body[0], by = S.body[1], bz = S.body[2];
    var chestHex = D.chest != null ? D.chest : (k === 'owl' ? 0xd2b88e : null);
    var wingHex = D.wing, tailHex = S.tail.white ? D.head : D.wing;
    /* painting by vertex colour: a per-channel ratio target/base, so material.color × colour = the target */
    var rgb = function (hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; };
    var ratio = function (to, base) { var t = rgb(to), b = rgb(base); return [t[0] / Math.max(0.03, b[0]), t[1] / Math.max(0.03, b[1]), t[2] / Math.max(0.03, b[2])]; };
    var mix = function (a, b, t) { if (typeof a === 'number') a = [a, a, a]; if (typeof b === 'number') b = [b, b, b]; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
    var near = function (n, c, r, soft) { var l = Math.hypot(c[0], c[1], c[2]); var d = Math.acos(clamp((n.x * c[0] + n.y * c[1] + n.z * c[2]) / l, -1, 1)); return 1 - smooth(r - (soft || 0.12), r + (soft || 0.12), d); };

    /* ── body: a lathe teardrop, breast forward, tapering to the tail; painted per species ── */
    var bodyPaint = function (x, y, z) {   // unscaled body coordinates: z −1.22 (tail) … 1.06 (neck), radius ≤ 0.7
      var m = 1 - 0.12 * smooth(0.1, 0.6, y) + 0.06 * smooth(0, -0.5, y);   // a darker back, a lighter belly
      if (k === 'bluejay') {
        var wb = smooth(0.05, -0.25, y - 0.35 * smooth(0.2, 0.8, z)) * smooth(-1.0, -0.5, z);
        m = mix(m, ratio(chestHex || 0xf2f4f6, D.body), wb);
        var band = 1 - smooth(0.05, 0.11, Math.abs(z - (0.66 - 0.28 * y)));
        if (y < 0.42) m = mix(m, ratio(0x15171c, D.body), band * smooth(0.42, 0.25, y));
      }
      if (k === 'owl') m = mix(m, ratio(chestHex, D.body), smooth(0.05, -0.3, y) * smooth(-0.8, -0.3, z));
      if (k === 'eagle') m = mix(m, 0.8, smooth(-0.6, -1.1, z));
      return m;
    };
    var bodyGeo = cached('body:' + K, function () {
      var pr = [[0.0, -1.22], [0.12, -1.18], [0.22, -1.08], [0.33, -0.94], [0.45, -0.74], [0.56, -0.5], [0.64, -0.24], [0.69, 0.04], [0.7, 0.26], [0.67, 0.46], [0.61, 0.63], [0.52, 0.79], [0.4, 0.92], [0.26, 0.99], [0.12, 1.03], [0.0, 1.04]]
        .map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      var lg = new THREE.LatheGeometry(pr, 22); lg.rotateX(Math.PI / 2); lg.rotateZ(Math.PI);   // seam under the belly
      var bg = new Acc().add(THREE, lg, M4(THREE, 0, 0, 0, 0, 0, 0, bx, by, bz), bodyPaint).geo(THREE, lin);
      var nn = bg.attributes.normal.array; for (var q = 0; q < nn.length; q++) if (!isFinite(nn[q])) nn[q] = 0;   // the lathe's poles
      return bg;
    });
    var body = add(g, bodyGeo, mat(D.body, { vc: true }), 'body'); texOn(body, API.TEX.body, 4, 2.5);
    if (k === 'falcon') {   // the Peregrine's pale, barred breast and belly
      var ch = add(g, cached('chest', function () { return new THREE.SphereGeometry(1, 18, 14); }), mat(chestHex || 0xf0ece4, { map: stripeMap(THREE, 'bars', lin) }), 'chest');
      ch.scale.set(0.6 * bx, 0.56 * by, 0.86 * bz); ch.position.set(0, -0.14 * by, 0.22 * bz);
    }

    /* ── head: painted too (the cardinal's mask, the jay's face and necklace, the Peregrine's hood and moustache) ── */
    var headPaint = function (lx, ly, lz) {
      var n = V(lx, ly, lz).normalize(), ax = Math.abs(n.x), na = V(ax, n.y, n.z), m = 1;
      if (k === 'cardinal') {
        var mk = Math.max(near(n, [0, -0.15, 1], 0.55), near(na, [0.62, 0.18, 0.72], 0.22, 0.08), near(n, [0, -0.7, 0.7], 0.45));
        m = mix(m, ratio(0x141012, D.head), mk);
      }
      if (k === 'bluejay') {
        var fc = Math.max(near(n, [0, -0.6, 0.8], 0.55), near(na, [0.75, -0.25, 0.55], 0.4));
        m = mix(m, ratio(chestHex || 0xf2f4f6, D.head), fc);
        var ln = near(na, [0.5, 0.05, 0.86], 0.16, 0.06) + near(na, [0.62, 0.18, 0.72], 0.17, 0.06);   // the black line through the eye
        var nk = (1 - smooth(0.06, 0.12, Math.abs(n.y + 0.62 - 0.25 * n.z + 0.15 * ax))) * smooth(-0.5, -0.1, n.z);
        m = mix(m, ratio(0x15171c, D.head), clamp(Math.max(ln, nk), 0, 1));
      }
      if (k === 'falcon') {
        var pl = Math.max(near(n, [0, -0.75, 0.6], 0.55), near(na, [0.85, -0.35, 0.05], 0.38));
        var ms = near(na, [0.55, -0.32, 0.72], 0.24, 0.07);   // the moustache stays dark
        m = mix(m, ratio(chestHex || 0xf0ece4, D.head), pl * (1 - ms));
      }
      if (k === 'crow' || k === 'eagle') m = 1 + 0.04 * n.y;
      return m;
    };
    var hr = S.head, head = new THREE.Group(); head.position.set(S.headAt[0], S.headAt[1], S.headAt[2]); head.name = 'head'; g.add(head);
    head.userData.rest = head.position.clone();   // 611: where the head sits at rest (the walk's bob and the flight's levelling return here)
    var headGeo = cached('head:' + K, function () {
      var a = new Acc(), sp = new THREE.SphereGeometry(hr, 26, 18);
      a.add(THREE, sp, M4(THREE, 0, 0, 0, 0, 0, 0, 1, k === 'crow' ? 0.9 : 1, k === 'owl' ? 0.9 : 1.06), headPaint);
      if (S.collar) a.add(THREE, new THREE.SphereGeometry(hr, 14, 10), M4(THREE, 0, -0.42 * hr, -0.4 * hr, 0.5, 0, 0, 1.0, 1.1, 1.0), 1);   // the eagle's white hackles down the neck
      return a.geo(THREE, lin);
    });
    var headM = add(head, headGeo, mat(D.head, { vc: true }), 'headball'); texOn(headM, API.TEX.head, 2, 2);
    if (S.disc) {   // the owl's facial disc: two dished rounds with a dark rim
      add(head, cached('disc', function () {
        var a = new Acc(), sp = new THREE.SphereGeometry(1, 16, 10);
        [-1, 1].forEach(function (s) {
          a.add(THREE, sp, M4(THREE, s * 0.3 * hr, 0.0, 0.8 * hr, 0, s * 0.42, 0, 0.42 * hr, 0.5 * hr, 0.13 * hr),
            function (lx, ly) { var r = Math.hypot(lx, ly); return r > 0.86 ? 0.45 : 1.08 - 0.2 * r; });
        });
        return a.geo(THREE, lin);
      }), mat(0xe2cfa8, { vc: true, rough: 0.95 }), 'disc');
    }
    if (S.crest || S.tufts) {
      add(head, cached('crest:' + k, function () {
        var a = new Acc();
        if (S.tufts) [-1, 1].forEach(function (s) { a.add(THREE, new THREE.ConeGeometry(0.2 * hr, 0.7 * hr, 6), M4(THREE, s * 0.52 * hr, 0.8 * hr, 0.22 * hr, -0.25, 0, -s * 0.45, 1, 1, 0.45), function (lx, ly) { return ly > 0.1 * hr ? 0.55 : 0.9; }); });
        else {
          var c = S.crest;
          a.add(THREE, new THREE.ConeGeometry(0.34 * hr, 1.25 * hr * c, 10), M4(THREE, 0, 1.0 * hr, -0.32 * hr, -0.85, 0, 0, 0.5, 1, 1), 1);
          a.add(THREE, new THREE.ConeGeometry(0.3 * hr, 0.95 * hr * c, 8), M4(THREE, 0, 0.95 * hr, 0.02 * hr, -0.5, 0, 0, 0.55, 1, 1), 1);
        }
        return a.geo(THREE, lin);
      }), mat(S.tufts ? D.head : D.head, { vc: true }), 'crest');
    }

    /* the beak: a lathe cone bent downward; hooked for the raptors and the owl */
    var B = S.beak;
    add(head, cached('beak:' + k, function () {
      var a = new Acc(), L = B.len, r = B.rad;
      var pr = [[0.001, 0], [r, 0.0], [r * 0.95, L * 0.15], [r * 0.7, L * 0.45], [r * 0.38, L * 0.75], [r * 0.12, L * 0.95], [0.001, L]].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      var lg = new THREE.LatheGeometry(pr, 10);
      var tipMul = function (lx, ly) { var t = ly / L; return B.tip ? lerp(1, 0.3, smooth(0.3, 0.65, t)) : (B.seed ? lerp(1, 1.08, t) : lerp(1, 0.92, t)); };
      a.add(THREE, lg, M4(THREE, 0, 0, 0, Math.PI / 2, 0, 0, B.squash, 1, 1), tipMul, function (v) {
        var t = clamp(v.z / L, 0, 1); v.y -= B.hook * L * (Math.pow(t, 4) * 1.5 + 0.3 * t * t); if (B.hook > 0.15 && t > 0.7) v.z -= (t - 0.7) * B.hook * L * 0.8; });
      return a.geo(THREE, lin, true);
    }), mat(D.beak, { vc: true, rough: 0.55 }), 'beak').position.set(0, -0.1 * hr, (S.disc ? 0.86 : 0.82) * hr);
    if (B.down) meshes[meshes.length - 1].rotation.x = B.down;

    /* eyes: eyeball, pupil, a catch-light (merged per kind) */
    var E = { song: { at: [0.6, 0.2, 0.64], ball: 0.16, iris: null, pup: 0.16 }, dark: { at: [0.6, 0.22, 0.62], ball: 0.14, iris: null, pup: 0.12 },
      falcon: { at: [0.55, 0.18, 0.7], ball: 0.16, iris: 0xf2c230, pup: 0.125 }, eagle: { at: [0.56, 0.18, 0.66], ball: 0.13, iris: 0xf2e6a0, pup: 0.075 },
      owl: { at: [0.3, 0.05, 0.9], ball: 0.15, iris: 0xffc21a, pup: 0.1 } }[S.eye];
    var eyeGeo = function (part) { return cached('eye' + part + ':' + k, function () {
      var a = new Acc();
      [-1, 1].forEach(function (s) {
        var c = V(s * E.at[0] * hr, E.at[1] * hr, E.at[2] * hr), out = c.clone().setY(0).normalize();
        if (S.eye === 'owl') out.set(0, 0, 1);
        if (part === 'ball') a.add(THREE, new THREE.SphereGeometry(E.ball * hr, 12, 10), M4(THREE, c.x, c.y, c.z), 1);
        if (part === 'pup') { var p = c.clone().addScaledVector(out, (E.ball - E.pup * 0.55) * hr); a.add(THREE, new THREE.SphereGeometry(E.pup * hr, 10, 8), M4(THREE, p.x, p.y, p.z), 1); }
        if (part === 'hi') { var h = c.clone().addScaledVector(out, E.ball * hr * 0.92).add(V(0, E.ball * hr * 0.38, E.ball * hr * 0.3)); a.add(THREE, new THREE.SphereGeometry(E.ball * hr * 0.22, 6, 5), M4(THREE, h.x, h.y, h.z), 1); }
      });
      return a.geo(THREE, lin);
    }); };
    if (E.iris) add(head, eyeGeo('ball'), mat(E.iris, { rough: 0.35 }), 'iris').userData.keepColor = true;
    add(head, E.iris ? eyeGeo('pup') : eyeGeo('ball'), mat(0x0c0a0a, { rough: 0.25 }), 'eye').userData.keepColor = true;
    var hi = add(head, eyeGeo('hi'), new THREE.MeshBasicMaterial({ color: 0xffffff }), 'catchlight'); hi.userData.keepColor = true;

    /* ── wings ── */
    var W = S.wing;
    var wingPaint = function (part, j, n) {   // colour multipliers along a feather: u 0 (root) → 1 (tip)
      return function (lx, ly, lz, u, v) {
        var m = part === 'prim' ? lerp(0.86, 0.58, smooth(0.35, 1, u)) - 0.04 * j : part === 'sec' ? lerp(0.95, 0.78, smooth(0.5, 1, u)) : 1.0;
        if (k === 'crow') m = part === 'cov' ? 1.05 : 0.95;
        if (W.bars && part !== 'cov') { var f = (u * (part === 'prim' ? 5 : 4) + 0.3) % 1; if (f < (k === 'owl' ? 0.35 : 0.22)) m *= k === 'owl' ? 0.62 : 0.18; }
        if (k === 'bluejay' && part === 'prim') m *= lerp(1, 0.55, u);
        if (k === 'falcon' && part !== 'cov') { var f2 = (u * 6) % 1; if (f2 < 0.3) m *= 0.78; }
        if (part === 'cov' && v > 0.75) m *= 0.9;   // a soft shadow where the coverts lie over the flight feathers
        return m;
      };
    };
    var armGeo = function (s) { return cached('arm' + s + ':' + K, function () {
      var a = new Acc(), A = W.arm, mir = M4(THREE, 0, 0, 0, 0, 0, 0, s, 1, 1);
      var add2 = function (geo, m, mul) { a.add(THREE, geo, mir.clone().multiply(m), mul); };
      // the secondaries (and the long tertials by the body), pointing back, fanning a little outward toward the wrist
      var ns = 7;
      for (var i = 0; i < ns; i++) { var u = i / (ns - 1), L = W.sec * (i < 1 ? 1.12 : 1 - 0.08 * u), ang = Math.PI / 2 - 0.3 * u;
        add2(featherGeo(THREE, L, 0.3, false), M4(THREE, 0.06 + (A - 0.02) * u, 0.004 * i, 0.02, 0, ang, 0), wingPaint('sec', i, ns)); }
      // the coverts: a cambered panel over the front of the arm
      add2(panelGeo(THREE, 6, 4, function (u) { return [u * (A + 0.08), 0.3 + 0.05 * Math.sin(Math.PI * u) - 0.04 * u, -0.34 + 0.1 * u]; }, 0.07), M4(THREE, 0, 0.03, 0), wingPaint('cov', 0, 1));
      // the leading edge: a little roll of bone and muscle so the wing has a body edge-on
      add2(new THREE.CylinderGeometry(0.035, 0.06, A + 0.1, 8), M4(THREE, (A + 0.1) / 2, 0.03, 0.27, 0, 0, -Math.PI / 2, 1, 0.7, 1), 1.0);
      return a.geo(THREE, lin);
    }); };
    var handGeo = function (s) { return cached('hand' + s + ':' + K, function () {
      var a = new Acc(), H = W.hand, n = W.n, mir = M4(THREE, 0, 0, 0, 0, 0, 0, s, 1, 1);
      var add2 = function (geo, m, mul) { a.add(THREE, geo, mir.clone().multiply(m), mul); };
      for (var j = n - 1; j >= 0; j--) {   // j = 0 is the outermost primary; drawn outer-on-top
        var u = j / (n - 1), ang = lerp(W.aOut, W.aIn, u), L;
        if (W.shape === 'point') L = W.prim * (1 - 0.1 * j);
        else if (W.shape === 'finger') L = W.prim * (0.93 + 0.07 * Math.sin(Math.PI * (j + 0.6) / n));
        else L = W.prim * (0.8 + 0.2 * Math.sin(Math.PI * (j + 0.9) / (n + 0.6)));
        add2(featherGeo(THREE, L, W.w, W.shape === 'finger'), M4(THREE, H * lerp(0.92, 0.12, u), 0.006 * (n - j), lerp(0.04, -0.06, u), 0, ang, 0), wingPaint('prim', j, n));
      }
      add2(panelGeo(THREE, 4, 3, function (u) { return [-0.06 + u * (H + 0.16), lerp(0.26, 0.09, u), lerp(-0.26, -0.1, u)]; }, 0.05), M4(THREE, 0, 0.04, 0), wingPaint('cov', 0, 1));
      add2(new THREE.CylinderGeometry(0.018, 0.036, H + 0.12, 7), M4(THREE, (H + 0.12) / 2 - 0.04, 0.035, 0.2, 0, 0, -Math.PI / 2, 1, 0.7, 1), 1.0);
      return a.geo(THREE, lin);
    }); };
    var jayBarGeo = function (s) { return cached('jaybar' + s + ':' + K, function () {   // white tips on the secondaries + a white covert bar
      var a = new Acc(), A = W.arm, mir = M4(THREE, 0, 0, 0, 0, 0, 0, s, 1, 1);
      for (var i = 1; i < 7; i++) { var u = i / 6, L = W.sec * (1 - 0.08 * u), ang = Math.PI / 2 - 0.3 * u;
        var tip = new THREE.Vector3(0.06 + (A - 0.02) * u + Math.cos(ang) * L * 0.78, 0.035, 0.02 - Math.sin(ang) * L * 0.78);
        a.add(THREE, featherGeo(THREE, L * 0.24, 0.27, false), mir.clone().multiply(M4(THREE, tip.x, tip.y, tip.z, 0, ang, 0)), 1); }
      a.add(THREE, panelGeo(THREE, 5, 1, function (u) { return [0.15 + u * (A - 0.2), -0.16, -0.27]; }, 0.0), mir.clone().multiply(M4(THREE, 0, 0.1, 0)), 1);
      return a.geo(THREE, lin);
    }); };
    var mkWing = function (s) {
      var pivot = new THREE.Group(); pivot.position.set(0.55 * s, 0.2, 0.05); pivot.name = s > 0 ? 'wingL' : 'wingR';
      var arm = add(pivot, armGeo(s), mat(wingHex, { vc: true, side: THREE.DoubleSide }), 'arm'); texOn(arm, API.TEX.wing, 1, 1);
      if (W.bars && k === 'bluejay') add(arm, jayBarGeo(s), mat(0xf4f6f8, { side: THREE.DoubleSide }), 'wingbar');
      var hand = add(arm, handGeo(s), mat(wingHex, { vc: true, side: THREE.DoubleSide }), 'hand'); texOn(hand, API.TEX.wing, 1, 1);
      hand.position.x = W.arm * s;
      pivot.userData.arm = arm; pivot.userData.hand = hand;
      /* the hand follows the pivot by itself — the game drives only pivot.rotation */
      var lag = null, last = -1, base = pivot.updateMatrixWorld, flank = Math.max(0.0, 0.7 * bx - 0.56);
      arm.rotation.order = 'YXZ';
      pivot.updateMatrixWorld = function (force) {
        var now = API.now(), dt = last < 0 ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
        var z = pivot.rotation.z * s;
        if (lag == null) lag = z; else lag += (z - lag) * Math.min(1, dt * 11);
        var fold = clamp(pivot.rotation.y * s / 1.3, 0, 1), ud = pivot.userData;
        var extra = ud.bendAt != null && now - ud.bendAt < 300 ? (ud.bend || 0) : 0;
        var whip = clamp((lag - z) * 0.85, -0.6, 0.6) * (1 - fold), live = ud.bendAt != null && now - ud.bendAt < 300;
        /* folded: the arm rolls its trailing edge down so the wing lies against the flank, the hand tucks in over the tail */
        arm.rotation.set(-1.35 * fold, s * 0.17 * fold, 0);
        arm.position.set(s * flank * fold, 0.08 * fold, -0.04 * fold); arm.scale.set(1, 1, 1 - 0.45 * fold);   // the flight feathers slide under the coverts
        hand.rotation.set(0, live ? s * (ud.handSweep || 0) : 0, s * (whip + (live ? ud.bend || 0 : 0) + 0.14 * fold));
        hand.scale.x = 1 - 0.38 * fold;
        base.call(this, force);
      };
      g.add(pivot); return pivot;
    };
    var wingL = mkWing(1), wingR = mkWing(-1);
    if (opts.folded) { wingL.rotation.set(0, 1.3, -0.18); wingR.rotation.set(0, -1.3, 0.18); }

    /* ── tail: a fan of feathers on a pivot under the rump ── */
    var T = S.tail, tail = new THREE.Group(); tail.position.set(0, 0.12 * by, -0.86 * bz); tail.name = 'tail'; g.add(tail);
    var tailM = add(tail, cached('tail:' + K, function () {
      var a = new Acc(), n = T.n;
      var order = []; for (var j = 0; j < n; j++) order.push(j); order.sort(function (p, q) { return Math.abs(q - (n - 1) / 2) - Math.abs(p - (n - 1) / 2); });   // outer first, centre on top
      order.forEach(function (j, idx) {
        var u = n > 1 ? j / (n - 1) * 2 - 1 : 0;
        var L = T.len * (k === 'crow' || k === 'owl' ? 1 - 0.1 * Math.abs(u) : k === 'bluejay' ? 1 - 0.12 * Math.abs(u) : 1 - 0.04 * Math.abs(u));
        a.add(THREE, featherGeo(THREE, L, T.w, false), M4(THREE, u * 0.08, 0.005 * idx, 0, 0, Math.PI / 2 - T.spread * u, 0), function (lx, ly, lz, uu) {
          var m = lerp(1, 0.85, uu);
          if (T.bars) { var f = (uu * (k === 'owl' ? 4 : 6) + 0.2) % 1; if (f < 0.25) m *= k === 'bluejay' ? 0.2 : 0.62; }
          if (k === 'bluejay' && uu > 0.88 && Math.abs(u) > 0.5) m = 2.6;   // white tail corners
          return m;
        });
      });
      return a.geo(THREE, lin);
    }), mat(tailHex, { vc: true, side: THREE.DoubleSide }), 'tailfan');
    texOn(tailM, API.TEX.wing, 1, 1);
    tail.rotation.x = 0.08;   // a touch above the line of the back

    /* ── legs: hip pivot → (trousers) tarsus → foot pivot with toes and claws ── */
    var hipY = -0.32 * by, footY = -(0.58 + D.legLen), ankleY = footY + 0.05 - hipY, raptor = k === 'falcon' || k === 'eagle' || k === 'owl';
    var legs = [-1, 1].map(function (s) {
      var leg = new THREE.Group(); leg.position.set(s * 0.27 * bx, hipY, 0.12); leg.name = s > 0 ? 'legL' : 'legR'; g.add(leg);
      var tr = S.trousers || 1;
      add(leg, cached('thigh:' + k, function () { var gg = new THREE.SphereGeometry(0.2, 10, 8); gg.scale(1, tr, 1.05); gg.translate(0, -0.06 - 0.12 * (tr - 1), 0); return gg; }), mat(D.body), 'thigh');
      var tw = raptor ? (k === 'eagle' ? 0.075 : 0.06) : 0.045;
      add(leg, cached('tarsus:' + k + D.legLen, function () { var gg = new THREE.CylinderGeometry(tw * 0.9, tw, -ankleY, 7); gg.translate(0, ankleY / 2, 0); return gg; }), mat(D.legs, { rough: 0.6 }), 'tarsus');
      var foot = new THREE.Group(); foot.position.set(0, ankleY, 0); leg.add(foot); leg.userData.foot = foot;
      add(foot, cached('toes:' + K, function () {
        var a = new Acc(), tl = raptor ? (k === 'eagle' ? 0.42 : 0.34) : 0.3, r0 = raptor ? 0.05 : 0.035;
        var claw = function (L) { return function (lx, ly) { return ly > L * 0.32 ? (raptor ? 0.12 : 0.45) : 1; }; };
        [-0.42, 0, 0.42].forEach(function (ya) {
          var d = V(Math.sin(ya), -0.12, Math.cos(ya)), L = ya ? tl * 0.85 : tl;
          a.add(THREE, new THREE.CylinderGeometry(r0 * 0.25, r0, L, 6), along(THREE, V(0, 0, 0), d, L), claw(L));
        });
        var Lb = tl * 0.62; a.add(THREE, new THREE.CylinderGeometry(r0 * 0.25, r0, Lb, 6), along(THREE, V(0, 0, 0), V(0, -0.15, -1), Lb), claw(Lb));
        a.add(THREE, new THREE.SphereGeometry(r0 * 1.15, 8, 6), new THREE.Matrix4(), 1);
        return a.geo(THREE, lin);
      }), mat(D.legs, { vc: true, rough: 0.6 }), 'toes');
      return leg;
    });

    g.scale.setScalar(D.size || 0.5); g.rotation.order = 'YXZ';
    g.userData.wfr = { kind: k, wingL: wingL, wingR: wingR, tail: tail, legs: legs, head: head, meshes: meshes.length };
    if (opts.folded) g.userData.wings = [wingL, wingR];
    return { g: g, wingL: wingL, wingR: wingR, tail: tail, legs: legs, head: head };
  };

  /* ═══════════════════════════ poses ═══════════════════════════ */
  /* P: z elevation (+ up), y sweep (+ back, − forward), x tilt (+ tips forward), bend (hand cup, − tip down),
        hs hand sweep, tail (tail pitch, − down), fan (tail spread ×), leg (hip swing, − forward), foot (ankle),
        tuck (0..1 legs folded back for flight), pitch (bird.rotation.x), y0 (extra height, body units) */
  function apply(rig, P) {
    var now = API.now();
    [rig.wingL, rig.wingR].forEach(function (w, i) {
      if (!w) return; var s = i ? -1 : 1;
      w.rotation.x = P.x || 0; w.rotation.y = s * (P.y || 0); w.rotation.z = s * (P.z || 0);
      w.userData.bend = P.bend || 0; w.userData.handSweep = P.hs || 0; w.userData.bendAt = now;
    });
    if (rig.tail) { rig.tail.rotation.x = 0.08 + (P.tail || 0); rig.tail.scale.x = P.fan || 1; rig.tail.rotation.y = 0; rig.tail.rotation.z = 0; }   // (611: the flight's tail twist never outlives it)
    var tk = P.tuck || 0;
    (rig.legs || []).forEach(function (l) {
      l.rotation.x = lerp(P.leg || 0, 1.25, tk); l.scale.y = 1; l.rotation.z = 0;   // (611: a stride's lifted leg never outlives it)
      if (l.userData.foot) l.userData.foot.rotation.x = lerp(P.foot || 0, 1.3, tk);
    });
    headHome(rig, 0.25); if (rig.gs) rig.gs.g = 0;   // (611: the walk after this landing starts from standing)
    rig.offset = { pitch: P.pitch || 0, y: P.y0 || 0 }; rig.settle = SETTLE;
    return rig;
  }
  /* 611: the head back toward its rest, by a fraction k (1 = at once) */
  var SETTLE = 1.5;   // 611: seconds rest() keeps easing after the last walk / fly / landing pose
  function headHome(rig, k) {
    var h = rig && rig.head; if (!h) return;
    var r = h.userData.rest; if (r) h.position.lerp(r, k);
    h.rotation.x -= h.rotation.x * k; h.rotation.y -= h.rotation.y * k; h.rotation.z -= h.rotation.z * k;
  }
  API.pose = apply;
  API.tuck = function (rig, a) {
    (rig.legs || []).forEach(function (l) { l.rotation.x = 1.25 * a; l.scale.y = 1; l.rotation.z = 0; if (l.userData.foot) l.userData.foot.rotation.x = 1.3 * a; });
  };
  var beat = function (u, n) { return Math.sin(u * Math.PI * 2 * n); };   // n beats across u ∈ [0,1], starts going up

  /* the landing gear common to all: flare-in amount f, legs reach r (0 tucked … 1 forward), settle at the end */
  var landing = {};
  function style(dur, flare, descent, fn) { fn.dur = dur; fn.flare = flare; fn.descent = descent; return fn; }
  var easeIO = function (t) { return t * t * (3 - 2 * t); };

  /* Cardinal — bounding approach (flap-flap-glide), then a quick flutter-brake and a little hop. */
  landing.cardinal = style(1.3, 0.5, function (t) { return smooth(0, 0.92, t) * 0.97 + 0.03 * smooth(0.92, 1, t); }, function (t, rig) {
    var a = 0.5, P = {};
    if (t < a) { var u = t / a, burst = u < 0.45 ? 1 : 0.1;
      P.z = 0.15 + 0.6 * beat(u, 3) * burst; P.y = burst < 1 ? 0.25 : 0; P.tuck = 1; P.pitch = 0.08; P.bend = -0.1; }
    else { var v = (t - a) / (1 - a), f = smooth(0, 0.18, v), end = smooth(0.82, 1, v), fl = beat(v, 4);
      P.z = lerp(0.2, 0.75 + 0.6 * fl, f) * (1 - end) + 0.15 * end; P.y = -0.5 * f * (1 - end); P.x = 0.35 * f * (1 - end); P.bend = 0.25 * fl * f;
      P.pitch = -0.7 * f * (1 - end); P.tail = -0.45 * f * (1 - end); P.fan = 1 + 0.6 * f * (1 - end);
      P.tuck = 1 - smooth(0.05, 0.45, v); P.leg = -0.55 * smooth(0.3, 0.6, v) * (1 - end); P.foot = 0.5 * smooth(0.3, 0.6, v) * (1 - end);
      P.y0 = 0.35 * bump(0.8, 1, v); }
    return apply(rig, P);
  });
  /* Blue Jay — glides in on flat open wings and a long fanned tail, three flutters, a bob of the tail as it lands. */
  landing.bluejay = style(1.5, 0.62, function (t) { return easeIO(smooth(0, 0.95, t)); }, function (t, rig) {
    var a = 0.62, P = {};
    if (t < a) { var u = t / a; P.z = 0.06 + 0.05 * Math.sin(u * 6); P.y = -0.05; P.tuck = 1; P.pitch = 0.02 - 0.15 * u; P.fan = 1 + 0.4 * u; P.tail = -0.1 * u; }
    else { var v = (t - a) / (1 - a), f = smooth(0, 0.2, v), end = smooth(0.8, 1, v), fl = beat(v, 3);
      P.z = lerp(0.1, 0.85 + 0.55 * fl, f) * (1 - end) + 0.12 * end; P.y = -0.6 * f * (1 - end); P.x = 0.3 * f * (1 - end); P.bend = 0.2 * fl * f;
      P.pitch = -0.6 * f * (1 - end); P.fan = 1.4 + 0.4 * f - 0.8 * end; P.tail = (-0.5 * f + 0.25 * bump(0.85, 1, v)) * (1 - end * 0.6);
      P.tuck = 1 - smooth(0, 0.4, v); P.leg = -0.45 * smooth(0.25, 0.55, v) * (1 - end); P.foot = 0.4 * smooth(0.25, 0.55, v) * (1 - end);
      P.y0 = 0.18 * bump(0.84, 1, v); }
    return apply(rig, P);
  });
  /* Crow — a steady glide with the fingers spread, then two heavy, deliberate beats and a stiff-legged hop. */
  landing.crow = style(1.8, 0.55, function (t) { return easeIO(t) * 0.94 + 0.06 * smooth(0.85, 1, t); }, function (t, rig) {
    var a = 0.55, P = {};
    if (t < a) { var u = t / a; P.z = 0.12 + 0.06 * Math.sin(u * 4); P.y = 0.05; P.tuck = 1; P.pitch = 0.05; P.bend = 0.12; }
    else { var v = (t - a) / (1 - a), f = smooth(0, 0.15, v), end = smooth(0.85, 1, v), fl = beat(v * 0.95, 2);
      P.z = lerp(0.12, 0.55 + 0.8 * fl, f) * (1 - end) + 0.1 * end; P.y = -0.45 * f * (1 - end); P.x = 0.2 * f * (1 - end); P.bend = 0.35 * fl * f;
      P.pitch = -0.55 * f * (1 - end); P.tail = -0.35 * f * (1 - end); P.fan = 1 + 0.45 * f * (1 - end);
      P.tuck = 1 - smooth(0.1, 0.35, v); P.leg = -0.75 * smooth(0.35, 0.55, v) * (1 - end); P.foot = 0.75 * smooth(0.35, 0.55, v) * (1 - end);   // stiff: hip swings, ankle holds the foot level
      P.y0 = 0.3 * bump(0.86, 1, v); }
    return apply(rig, P);
  });
  /* Peregrine — a steep stoop on swept-back wings, then a sharp, hard flare: wings thrown forward, two snaps, talons late. */
  landing.falcon = style(1.6, 0.55, function (t) { return t < 0.55 ? 0.86 * Math.pow(t / 0.55, 1.7) : 0.86 + 0.14 * smooth(0.55, 1, t); }, function (t, rig) {
    var a = 0.55, P = {};
    if (t < a) { var u = t / a, st = smooth(0, 0.3, u);
      P.z = lerp(0.1, -0.08, st); P.y = 0.95 * st; P.hs = 0.25 * st; P.tuck = 1; P.pitch = 0.55 * st * (1 - smooth(0.8, 1, u) * 0.5); P.fan = 0.7; }
    else { var v = (t - a) / (1 - a), f = smooth(0, 0.12, v), end = smooth(0.8, 1, v), fl = beat(clamp((v - 0.1) / 0.6, 0, 1), 2) * smooth(0.1, 0.2, v);
      P.z = lerp(-0.08, 1.0 + 0.45 * fl, f) * (1 - end) + 0.12 * end; P.y = lerp(0.95, -0.7, f) * (1 - end); P.x = 0.4 * f * (1 - end); P.bend = 0.3 * f * fl;
      P.pitch = lerp(0.3, -0.95, f) * (1 - end); P.tail = -0.55 * f * (1 - end); P.fan = lerp(0.7, 1.9, f) * (1 - end) + end;
      P.tuck = 1 - smooth(0.35, 0.6, v); P.leg = -0.8 * smooth(0.45, 0.7, v) * (1 - end); P.foot = 0.3 * smooth(0.45, 0.7, v) * (1 - end); }
    return apply(rig, P);
  });
  /* Owl — a long silent glide, wings held wide and a little high; one slow lift of the wings and the talons swing forward late. */
  landing.owl = style(2.2, 0.68, function (t) { return 1 - Math.pow(1 - t, 1.5); }, function (t, rig) {
    var a = 0.68, P = {};
    if (t < a) { var u = t / a; P.z = 0.28 + 0.03 * Math.sin(u * 5); P.y = -0.1; P.bend = -0.1; P.tuck = 1 - 0.2 * u; P.pitch = -0.08 * u; P.fan = 1.3; }
    else { var v = (t - a) / (1 - a), f = smooth(0, 0.35, v), end = smooth(0.85, 1, v), fl = beat(clamp(v / 0.85, 0, 1), 1);
      P.z = lerp(0.28, 1.1 + 0.25 * fl, f) * (1 - end) + 0.15 * end; P.y = lerp(-0.1, -0.55, f) * (1 - end); P.x = 0.35 * f * (1 - end); P.bend = 0.3 * f * (1 - end);
      P.pitch = -0.7 * f * (1 - end); P.tail = -0.4 * f * (1 - end); P.fan = 1.3 + 0.4 * f - 0.7 * end;
      P.tuck = 0.8 * (1 - smooth(0.25, 0.55, v)); P.leg = -0.95 * smooth(0.4, 0.7, v) * (1 - end); P.foot = 0.2 * smooth(0.4, 0.75, v) * (1 - end) - 0.3 * bump(0.5, 0.95, v); }
    return apply(rig, P);
  });
  /* Eagle — big slow beats from far out, then a deep braking flare: legs and great yellow talons thrust far forward. */
  landing.eagle = style(2.4, 0.45, function (t) { return easeIO(smooth(0, 1, t)); }, function (t, rig) {
    var a = 0.45, P = {};
    if (t < a) { var u = t / a; P.z = 0.15 + 0.35 * beat(u, 1.5) * (u < 0.66 ? 1 : 0); P.bend = 0.2 * beat(u, 1.5); P.tuck = 1; P.pitch = 0.05; P.fan = 1.1; }
    else { var v = (t - a) / (1 - a), f = smooth(0, 0.2, v), end = smooth(0.86, 1, v), fl = beat(clamp((v - 0.1) / 0.7, 0, 1), 2) * smooth(0.05, 0.15, v);
      P.z = lerp(0.15, 0.85 + 0.6 * fl, f) * (1 - end) + 0.12 * end; P.y = -0.55 * f * (1 - end); P.x = 0.35 * f * (1 - end); P.bend = 0.35 * fl * f - 0.1 * f;
      P.pitch = -0.85 * f * (1 - end); P.tail = -0.6 * f * (1 - end); P.fan = 1.1 + 0.8 * f * (1 - end) - 0.1 * end;
      P.tuck = 1 - smooth(0.1, 0.4, v); P.leg = -1.15 * smooth(0.3, 0.65, v) * (1 - end); P.foot = -0.25 * smooth(0.3, 0.65, v) * (1 - end); }
    return apply(rig, P);
  });
  API.landing = landing;

  /* ═══════════════════ 611: THE WALK AND THE FLIGHT (Oct 10) ═══════════════════
     Marth: "the birds too, if u can squeeze in their walking + flying". Nothing here is drawn new: the same rig is posed.
     Real birds: the small songbirds HOP on the ground (both feet together); crows, raptors and owls WALK, feet in turn,
     the head holding still in the air and then thrusting forward, the tail balancing; owls and raptors waddle. In the
     air a beat has a strong, extended downstroke and a soft upstroke with the hand folded; finches and cardinals bound
     (a burst of beats, then a moment with the wings shut), the big soarers beat a few times and glide. */
  var hash = function (n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // (never the game's rnd(): its dice stay where they are)
  var frac = function (x) { return x - Math.floor(x); };
  var ease = function (cur, to, k) { return cur + (to - cur) * k; };
  var kindOf = function (rig) { var u = rig && rig.body && rig.body.userData && rig.body.userData.wfr; return (rig && rig.kind) || (u && u.kind) || 'cardinal'; };

  /* style hop | stride; f0 + fk·speed = steps a second (capped fmax); lift = a hop's height (body units); contact = the share
     of a hop on the ground; duty = the share of a stride a foot carries her; head = the head bob; tail = its balance;
     roll = the waddle; look = how far the head glances when she stands (the owl's turns far) */
  var GAIT = {
    cardinal: { style: 'hop', f0: 2.3, fk: 0.32, fmax: 4.4, lift: 0.55, contact: 0.36, head: 0.06, tail: 0.34, look: 0.65 },
    bluejay: { style: 'hop', f0: 2.1, fk: 0.3, fmax: 4.2, lift: 0.6, contact: 0.36, head: 0.06, tail: 0.4, look: 0.7 },
    crow: { style: 'stride', f0: 1.2, fk: 0.4, fmax: 3.4, duty: 0.58, head: 0.16, tail: 0.1, roll: 0.05, look: 0.6 },
    falcon: { style: 'stride', f0: 1.1, fk: 0.38, fmax: 3.2, duty: 0.6, head: 0.09, tail: 0.08, roll: 0.09, look: 0.7 },
    owl: { style: 'stride', f0: 1.0, fk: 0.36, fmax: 3.0, duty: 0.62, head: 0.035, tail: 0.06, roll: 0.14, look: 1.25 },
    eagle: { style: 'stride', f0: 0.85, fk: 0.26, fmax: 2.4, duty: 0.6, head: 0.1, tail: 0.07, roll: 0.08, look: 0.6 }
  };
  API.GAIT = GAIT;
  var THMAX = 0.62;   // the furthest a leg swings from straight down (rad); past it, at a run, a planted foot slides

  API.walk = function (rig, dt, o) {
    o = o || {}; dt = clamp(dt || 0, 0, 0.1);
    var G = GAIT[kindOf(rig)] || GAIT.cardinal, gs = rig.gs;
    if (!gs) gs = rig.gs = { t: 0, ph: 0, g: 0, air: 0, sh: 0, f: G.f0, dr: 0, look: 0.8, lookY: 0, lookX: 0, lookN: 0, hy: 0, hx: 0 };
    gs.t += dt; rig.settle = SETTLE;
    var legs = rig.legs || [], foot0 = legs[0] && legs[0].userData.foot;
    var L = foot0 ? Math.max(0.2, -foot0.position.y) : 0.6;   // hip to ankle, body units
    var size = rig.body && rig.body.scale.x ? rig.body.scale.x : 0.5;
    var v = clamp(o.speed || 0, -12, 12), turn = clamp(o.turn || 0, -1, 1), still = !!(o.rest || o.still);
    var drive = o.air || still ? 0 : Math.max(Math.abs(v), Math.abs(turn) * 0.9);   // turning on the spot shuffles the feet
    gs.g = ease(gs.g, drive > 0.15 ? 1 : 0, Math.min(1, dt * (drive > 0.15 ? 9 : 6)));
    gs.air = ease(gs.air, o.air ? 1 : 0, Math.min(1, dt * 10));
    gs.sh = ease(gs.sh, o.shake ? 1 : 0, Math.min(1, dt * 8));
    gs.f = ease(gs.f, Math.min(G.fmax, G.f0 + G.fk * drive), Math.min(1, dt * 5));
    gs.dr = ease(gs.dr, drive, Math.min(1, dt * 6));   // the stride lengthens and shortens with her speed, never in one frame (a stop once snapped the legs 0.27 rad)
    if (gs.g > 0.02) gs.ph = frac(gs.ph + gs.f * dt * (v < -0.05 ? -1 : 1));   // backing up runs the cycle backward
    var ph = gs.ph, g = gs.g, ve = gs.dr / size;   // her speed in body units a second
    var out = { y: 0, pitch: 0, roll: 0, yaw: 0 };
    var th = [0, 0], ft = [0, 0], sc = [1, 1], hz = 0, hy = 0, tp = 0, ty = 0, fan = 1;
    if (G.style === 'hop') {
      /* a hop: both feet on the ground for `contact` of the cycle, sliding back under her as she goes (planted), then a
         little flight - pushed off, the feet tuck, then reach forward for the ground. The tail flicks up as she lands. */
      var c = G.contact, x0 = Math.min(ve * c / (2 * gs.f), L * Math.sin(THMAX));
      var fwd = -Math.asin(clamp(x0 / L, -1, 1)), back = -fwd, yEnd = L * (Math.cos(fwd) - 1);
      if (ph < c) { var a = -Math.asin(clamp(lerp(x0, -x0, ph / c) / L, -1, 1)); th = [a, a]; ft = [-a, -a]; out.y = L * (Math.cos(a) - 1); }
      else {
        var w = (ph - c) / (1 - c), H = G.lift * Math.min(1, gs.dr / 2.5), tuckA = Math.max(back, 0.45);
        var a2 = w < 0.35 ? lerp(back, tuckA, smooth(0, 0.35, w)) : w < 0.9 ? lerp(tuckA, fwd - 0.06, smooth(0.35, 0.9, w)) : lerp(fwd - 0.06, fwd, smooth(0.9, 1, w));
        th = [a2, a2]; ft = [-a2 + 0.7 * bump(0.05, 0.85, w), -a2 + 0.7 * bump(0.05, 0.85, w)];
        out.y = yEnd + H * 4 * w * (1 - w);
      }
      out.pitch = 0.09 * bump(0.6 * c, c + 0.2 * (1 - c), ph) - 0.05 * bump(c + 0.25 * (1 - c), 1, ph);
      hz = -G.head * bump(0.5 * c, c + 0.45 * (1 - c), ph); hy = -0.02 * bump(0, 0.5 * c, ph);   // the head lags at the push-off
      tp = G.tail * bump(0, 0.6 * c + 0.1, ph) - 0.4 * G.tail * bump(0.8 * c, c + 0.3 * (1 - c), ph);
      fan = 1 + 0.25 * bump(0, c + 0.1, ph);
    } else {
      /* a stride: each foot carries her for `duty` of the cycle, flat and planted, sliding back under her at her own
         speed; then it lifts (the leg draws up, the toes curl) and swings forward. She rides lowest between steps, leans
         over the foot she stands on, and the head holds still in the air, then thrusts forward, once a step. */
      var d = G.duty, x1 = Math.min(ve * d / (2 * gs.f), L * Math.sin(THMAX)), lowest = null, stance = [false, false];
      for (var i = 0; i < 2; i++) {
        var p = frac(ph + i * 0.5);
        if (p < d) { var a3 = -Math.asin(clamp(lerp(x1, -x1, p / d) / L, -1, 1)); th[i] = a3; ft[i] = -a3; stance[i] = true; var hh = L * (Math.cos(a3) - 1); lowest = lowest == null ? hh : Math.min(lowest, hh); }
        else { var s2 = (p - d) / (1 - d), e2 = s2 * s2 * (3 - 2 * s2), a4 = -Math.asin(clamp(lerp(-x1, x1, e2) / L, -1, 1)); th[i] = a4; ft[i] = -a4 + 0.55 * Math.sin(Math.PI * s2); sc[i] = 1 - 0.2 * Math.sin(Math.PI * s2); }
      }
      out.y = lowest || 0;
      for (var q = 0; q < 2; q++) if (stance[q]) sc[q] = Math.min(1, (L + out.y) / (L * Math.cos(th[q])));   // both feet down at once: the more upright leg bends to meet the ground (no knee here: it shortens)
      out.roll = G.roll * Math.cos(2 * Math.PI * (ph - d / 2));   // legs[0] (her right) stands first: lean right (+)
      out.y += Math.abs(legs[0] ? legs[0].position.x : 0.25) * Math.abs(Math.sin(out.roll));   // the lean drops the hip she stands on: the body rises to keep that foot on the ground, not in it
      out.yaw = 0.35 * G.roll * Math.sin(2 * Math.PI * (ph - d / 2));
      out.pitch = 0.025 * Math.cos(4 * Math.PI * ph) + 0.05 * Math.min(1, gs.dr / 4);
      var p2 = frac(2 * ph);
      hz = p2 < 0.72 ? G.head * (1 - 2 * p2 / 0.72) : -G.head + 2 * G.head * smooth(0.72, 1, p2); hy = -0.025 * bump(0.72, 1, p2);
      ty = 1.6 * G.tail * Math.cos(2 * Math.PI * (ph - d / 2)); tp = 0.5 * G.tail * Math.cos(4 * Math.PI * ph);
    }
    /* the envelope: starting and stopping ease in and out of the gait */
    for (var j = 0; j < 2; j++) { th[j] = lerp(th[j] * g, -0.25, gs.air); ft[j] = lerp(ft[j] * g, 0.35, gs.air); sc[j] = 1 - (1 - sc[j]) * g * (1 - gs.air); }
    out.y *= g * (1 - gs.air); out.pitch *= g; out.roll *= g; out.yaw *= g; hz *= g; hy *= g; tp *= g; ty *= g; fan = 1 + (fan - 1) * g;
    var shk = gs.sh;   // the bird bath's shake (591): a wet shiver, head to tail
    out.roll += 0.25 * Math.sin(gs.t * 22) * shk; ty += 0.3 * Math.sin(gs.t * 24) * shk;
    /* the head: standing, it glances about in quick turns; walking, it looks a little into the turn */
    var idle = g < 0.3 && !o.air && !still && !o.shake;
    if (idle) { gs.look -= dt; if (gs.look <= 0) { var n = gs.lookN++; gs.lookY = (hash(n) * 2 - 1) * G.look; gs.lookX = (hash(n + 0.5) - 0.6) * 0.35; gs.look = 0.9 + 1.9 * hash(n + 0.25); if (hash(n + 0.75) < 0.3) { gs.lookY = 0; gs.lookX = 0; } } }
    else { gs.look = Math.max(gs.look, 0.6); gs.lookY = o.air || still ? 0 : turn * 0.3; gs.lookX = 0; }
    var hk = Math.min(1, dt * (idle ? 14 : 6));
    gs.hy = ease(gs.hy, gs.lookY, hk); gs.hx = ease(gs.hx, gs.lookX, hk);
    var head = rig.head;
    if (head) { var r = head.userData.rest; if (r) head.position.set(r.x, r.y + hy, r.z + hz);
      head.rotation.set(gs.hx, gs.hy + 0.35 * Math.sin(gs.t * 27) * shk, 0); }
    if (rig.tail) { rig.tail.rotation.x = 0.08 + tp; rig.tail.rotation.y = ty; rig.tail.rotation.z = 0; rig.tail.scale.x = fan; }
    /* the legs hang plumb from the hips: the body's pitch and roll are taken back out of them, so a planted foot stays put */
    for (var m = 0; m < legs.length && m < 2; m++) { legs[m].rotation.x = th[m] - out.pitch; legs[m].rotation.z = -out.roll; legs[m].scale.y = sc[m]; if (legs[m].userData.foot) legs[m].userData.foot.rotation.x = ft[m]; }
    return out;
  };

  /* f: wingbeats a second; amp / mid: the stroke (rad, + up); D: the downstroke's share of the beat (under half: it is the
     quick, strong one); bout / gap: beats, then seconds of glide, when she only cruises; glide: [z, sweep, bend] held between
     bouts (the cardinal's sweep shuts its wings: it bounds); up: how far the upstroke folds the wing; heave: the body's lift */
  var FLY = {
    cardinal: { f: 5.0, amp: 0.86, mid: 0.14, D: 0.42, bout: 3, gap: 0.5, glide: [0.0, 1.12, 0.0], up: 0.42, heave: 0.07 },
    bluejay: { f: 4.4, amp: 0.84, mid: 0.14, D: 0.43, bout: 4, gap: 0.55, glide: [0.04, 0.12, 0.05], up: 0.4, heave: 0.07 },
    crow: { f: 3.3, amp: 0.8, mid: 0.12, D: 0.43, bout: 5, gap: 0.8, glide: [0.07, 0.05, 0.12], up: 0.36, heave: 0.06 },
    falcon: { f: 4.2, amp: 0.74, mid: 0.1, D: 0.42, bout: 4, gap: 1.6, glide: [0.02, 0.28, -0.04], up: 0.34, heave: 0.05 },
    owl: { f: 2.5, amp: 0.92, mid: 0.16, D: 0.45, bout: 3, gap: 1.5, glide: [0.12, -0.04, 0.06], up: 0.4, heave: 0.08 },
    eagle: { f: 1.8, amp: 0.7, mid: 0.12, D: 0.45, bout: 2, gap: 4.5, glide: [0.13, 0.0, 0.2], up: 0.3, heave: 0.05 }
  };
  API.FLY = FLY;

  API.fly = function (rig, dt, o) {
    o = o || {}; dt = clamp(dt || 0, 0, 0.1);
    var F = FLY[kindOf(rig)] || FLY.cardinal, fs = rig.fs, now = API.now(), legs = rig.legs || [];
    var t = o.t != null ? o.t : (fs ? fs.t + dt : 0);
    if (!fs || t - fs.lastT > 0.25 || t < fs.lastT) {   // a fresh start in the air (a takeoff, out of the sea, after a pause): the burst
      fs = rig.fs = { ph: 0, f: F.f * 1.45, amp: 0.3, mid: F.mid, sw: 0, bend: 0, boutLeft: 0, gap: F.gap, burst: 0.6, tk: 0, pow: true, wraps: 0, t: t, lastT: t,
        leg0: legs.map(function (l) { return l.rotation.x; }), foot0: legs.map(function (l) { return l.userData.foot ? l.userData.foot.rotation.x : 0; }),
        v: o.speed || 0, brake: 0, fan: 1, tp: 0, tw: 0 };
    }
    fs.lastT = t; fs.t = t; rig.settle = SETTLE; if (rig.gs) rig.gs.g = 0;   // the flight owns the legs: the next walk starts from standing, never mid-stride
    var spd = o.speed || 0, turn = clamp(o.turn || 0, -1, 1), hov = clamp(o.hover || 0, 0, 1), lng = clamp(o.long || 0, 0, 1);
    fs.burst = Math.max(0, fs.burst - dt);
    var bk = fs.burst > 0 ? smooth(0, 0.25, fs.burst) : 0;
    /* the stroke this state asks for */
    var tf = F.f, ta = 0, tm = F.mid, D = F.D, bs = 0, bb = 0, powered = true;
    if (o.dive) { ta = 0; tm = 0.05; bs = 0.95; bb = -0.05; powered = false; }   // the dive bomb: wings swept back, tight
    else if (o.flutter) { tf = Math.min(9, F.f * 1.9); ta = 0.7; tm = 0.2; D = 0.5; }
    else if (hov > 0.5) { tf = F.f * 1.35; ta = 0.85; tm = 0.3; bs = -0.12; }
    else if (bk > 0) { tf = F.f * 1.45; ta = 1.12; tm = 0.2; D = 0.4; }   // the takeoff: deep, quick beats
    else if (o.flap) { tf = F.f * 1.2; ta = 1.0; }
    else if (lng > 0.5) { tf = F.f * 0.9; ta = 0.72; }
    else {   // cruising: a bout of beats, then the species' own glide
      powered = false;
      if (fs.boutLeft > 0) ta = F.amp * 0.85;
      else { tm = F.glide[0]; bs = F.glide[1] + (spd > 22 ? 0.12 : 0); bb = F.glide[2]; fs.gap -= dt; if (fs.gap <= 0) { fs.boutLeft = F.bout; if (fs.amp < 0.25) fs.ph = F.D * 0.5; } }
    }
    if (powered) { if (!fs.pow && fs.amp < 0.3) fs.ph = D * 0.5; fs.boutLeft = 0; fs.gap = F.gap; }   // a beat asked for from a glide starts at once, halfway down its downstroke (the wing level, going down)
    fs.pow = powered;
    fs.f = ease(fs.f, tf, Math.min(1, dt * 6));
    fs.ph += fs.f * dt;
    if (fs.ph >= 1) { fs.ph -= Math.floor(fs.ph); fs.wraps++; if (!powered && fs.boutLeft > 0) { fs.boutLeft--; if (!fs.boutLeft) fs.gap = F.gap; } }
    fs.amp = ease(fs.amp, ta, Math.min(1, dt * (ta > fs.amp ? 12 : 10)));
    fs.mid = ease(fs.mid, tm, Math.min(1, dt * 8));
    fs.sw = ease(fs.sw, bs, Math.min(1, dt * 9));
    fs.bend = ease(fs.bend, bb, Math.min(1, dt * 8));
    /* the beat: +1 at the top, -1 at the bottom; the downstroke takes D of it and reaches, the upstroke is slower and folds */
    var ph = fs.ph, down = ph < D, s = down ? ph / D : (ph - D) / (1 - D), sn = Math.sin(Math.PI * s);
    var wv = down ? Math.cos(Math.PI * s) : -Math.cos(Math.PI * s), A = fs.amp;
    var z = fs.mid + A * (wv > 0 ? 0.92 * wv : wv);
    var flex = hov > 0.5 ? (down ? -0.3 * sn : 0.32 * sn) : (down ? -0.1 * sn : F.up * sn);
    var sweep = fs.sw + A * flex, bend = fs.bend + A * (down ? 0.08 * sn : -0.22 * sn), hs = A * (down ? 0 : 0.45 * sn);
    /* into a turn: the inner wing tucks a little (less wing, less lift), the outer one stays long */
    [rig.wingL, rig.wingR].forEach(function (wg, i) {
      if (!wg) return; var sd = i ? -1 : 1, inner = clamp(-turn * sd, 0, 1), outer = clamp(turn * sd, 0, 1);
      wg.rotation.x = 0; wg.rotation.y = sd * (sweep + 0.22 * inner); wg.rotation.z = sd * (z - 0.08 * inner + 0.06 * outer);
      wg.userData.bend = bend - 0.12 * inner; wg.userData.handSweep = hs + 0.12 * inner; wg.userData.bendAt = now;
    });
    /* the tail: fanned and pressed down when she slows (or hovers, or bursts off), closed for speed, twisted into a turn */
    if (dt > 0) fs.brake = ease(fs.brake, clamp((fs.v - spd) / dt / 8, 0, 1), Math.min(1, dt * 5));
    fs.v = spd;
    var slow = clamp((12 - spd) / 8, 0, 1), brk = Math.max(fs.brake, hov, slow * 0.55, bk * 0.6);
    fs.fan = ease(fs.fan, (o.dive ? 0.65 : spd > 22 ? 0.85 : 0.95) + 0.85 * brk + 0.25 * Math.abs(turn), Math.min(1, dt * 6));
    fs.tp = ease(fs.tp, (o.dive ? 0.04 : 0) - 0.38 * Math.max(fs.brake, hov, slow * 0.4, bk * 0.6), Math.min(1, dt * 6));
    fs.tw = ease(fs.tw, turn, Math.min(1, dt * 5));
    if (rig.tail) { rig.tail.rotation.x = 0.08 + fs.tp + 0.05 * wv * A; rig.tail.scale.x = fs.fan; rig.tail.rotation.y = 0.15 * fs.tw; rig.tail.rotation.z = 0.28 * fs.tw; }
    /* the legs trail up after a takeoff (half down for a hover coming in) */
    fs.tk = ease(fs.tk, o.legsDown ? 0.5 : 1, Math.min(1, dt * 4.5));
    for (var m = 0; m < legs.length; m++) {
      fs.leg0[m] = ease(fs.leg0[m] || 0, 0, Math.min(1, dt * 3)); fs.foot0[m] = ease(fs.foot0[m] || 0, 0, Math.min(1, dt * 3));
      legs[m].rotation.x = lerp(fs.leg0[m], 1.25, fs.tk); legs[m].scale.y = 1; legs[m].rotation.z = 0;
      if (legs[m].userData.foot) legs[m].userData.foot.rotation.x = lerp(fs.foot0[m], 1.3, fs.tk);
    }
    /* the head stays level while the body pitches and banks (a bird's head is its steadicam) */
    var head = rig.head;
    if (head) { var hk = Math.min(1, dt * 8), r = head.userData.rest; if (r) head.position.lerp(r, Math.min(1, dt * 10));
      head.rotation.x = ease(head.rotation.x, clamp(-(o.body || 0) * 0.45, -0.5, 0.5), hk); head.rotation.y = ease(head.rotation.y, 0, hk); head.rotation.z = ease(head.rotation.z, clamp(-(o.roll || 0) * 0.5, -0.4, 0.4), hk); }
    return { y: -F.heave * A * wv * 0.5 * (1 + bk), pitch: 0, phase: ph, amp: A };
  };

  API.rest = function (rig, dt) {
    if (dt != null) { if (!(rig.settle > 0)) return; rig.settle -= dt; }   // settled: another mode's own pose is left alone
    var k = dt == null ? 1 : Math.min(1, dt * 8);
    headHome(rig, k);
    (rig.legs || []).forEach(function (l) { l.scale.y += (1 - l.scale.y) * k; l.rotation.z -= l.rotation.z * k;
      var up = l.rotation.x > 0.7, ft = l.userData.foot;   // a stride's angles ease back to standing; legs tucked for flight stay tucked
      l.rotation.x += ((up ? 1.25 : 0) - l.rotation.x) * k; if (ft) ft.rotation.x += ((up ? 1.3 : 0) - ft.rotation.x) * k; });
    if (rig.tail) { var tl = rig.tail; tl.rotation.y -= tl.rotation.y * k; tl.rotation.z -= tl.rotation.z * k; tl.rotation.x += (0.08 - tl.rotation.x) * k; tl.scale.x += (1 - tl.scale.x) * k; }
    if (rig.gs) rig.gs.g = 0;   // the next walk starts from standing
  };
  return API;
})();
