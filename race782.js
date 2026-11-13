/* race782.js - BOARD 782 REVIEW TOP-10 ITEM 10 (plan 781 unit 6), THE RACE (Wings for Rouge). Ship #129, Nov 13 2026.
   Marth, Nov 12 2026, verbatim: "the chic aspect is entirely derived from snoic adventure dx ... where the chao shop is upgraded, theres a school for the
   chics, they can fight or race etc. stuff like that i want implemented"; his pick "Haven, race outside"; Nov 13 on the review's top 10: "These are due and
   looping integration"; and "dont rush the ships" / "make a nice build". Study, never copy: our names, our shapes, our words, our tunes.

   THE LOOP (the point of it): the race pays coins -> Thimble's Market sells the stat fruit -> feeding raises the chick's strengths -> the chick races better.
   WHAT IS HERE.
   THE COURSE  outdoors on the home island, a loop (a Catmull-Rom curve round an oval, runes.js's pattern) on a measured clear meadow: one stretch per strength,
               the grass (Run), the pond (Swim), three big stumps up onto a grassy bank (Strength), a glide off the bank to the line (Flight). A start arch, a
               sign, six flags. Built once at load; shown only when she is near; about 12 draws, plus 3 rivals of 7 parts each.
   THE RACERS  her own chick and three rival chicks (built like makeChick, fewer parts, shared shapes). Each one's pace on a stretch comes from that stretch's
               strength (mult()); Stamina sets how fast it tires (drainK()); a tired chick PUFFS (slows to a quarter) until it has its breath back; her tap
               while it puffs is a cheer that gives breath back, and Creativity sets how much (cheerE()). Rivals are never cheered. The same step() runs the race
               on screen and in sim() (the guard's proof and the numbers below).
   THE CUPS    Acorn Cup, Willow Cup, Old Oak Cup (our names; the harder ones open by winning the one before). A first win pays the cup's prize and a ribbon
               (held up with cine.js's item-get); a win after pays a little; 2nd pays 2, 3rd and 4th pay 1, and the card says what to train.
   ENTERED     from the Chick Haven (a board by the home door: her chick goes out with her) and from the start line outdoors (the game's own action button).
   THE MOWER   mown(x, z): the island's grass (world-vegetation.js) asks it; none on the track, the pond, the bank and round the line (the chicks stood hidden).
   SAVED       S.race782 = { won: { cup: n }, runs, best: { cup: secs }, paid } (saved and loaded with her file).
   Standard only (never built in Classic: frozen). Every word and number a DRAFT for his pen and her thumb. */
window.WFR_RACE782 = (function () {
  'use strict';
  var API = { error: '' };
  var K = { NEAR: 3.0, SHOW: 115, LIVE: 70, CH_S: 2.6, CH_L: -4.4, A: 13.5, B: 17, PUFF_END: 35, RECOVER: 7, PUFF_V: 0.25, TAP_MIN: 0.12, INTRO: 7.0, FIN_HOLD: 6.0, SC: 0.38 };
  /* the four stretches, in order; frac: where each ends along the loop (the loop is ~98 m: grass ~50, pond ~16, climb ~9, glide ~21) */
  var STRETCH = [
    { id: 'grass', stat: 'run', word: 'Run', name: 'the grass', base: 4.6, drain: 1.0, frac: 0.515 },
    { id: 'pond', stat: 'swim', word: 'Swim', name: 'the pond', base: 2.0, drain: 1.25, frac: 0.68 },
    { id: 'climb', stat: 'str', word: 'Strength', name: 'the stump climb', base: 1.5, drain: 1.4, frac: 0.78 },
    { id: 'glide', stat: 'fly', word: 'Flight', name: 'the glide', base: 5.2, drain: 0.3, frac: 1 }];
  /* rivals: [fly, run, str, sta, swim]; our own names (DRAFT) */
  var RIVALS = [{ name: 'Puddle', col: 0x8fd0f2 }, { name: 'Sorrel', col: 0xf2a65a }, { name: 'Burr', col: 0xc9a06a }];
  var CUPS = [
    { id: 'acorn', name: 'Acorn Cup', ribbon: 'the Acorn Ribbon', win: 6, again: 2, rivals: [[14, 18, 10, 18, 32], [10, 35, 14, 14, 7], [18, 14, 32, 21, 10]] },   /* ~37.5 s on the course: a plain chick cheered well comes in about a second behind; ten points a strength and her cheers win by about one */
    { id: 'willow', name: 'Willow Cup', ribbon: 'the Willow Ribbon', win: 10, again: 3, need: 'acorn', rivals: [[110, 120, 90, 140, 220], [100, 230, 110, 120, 90], [120, 110, 220, 160, 100]] },
    { id: 'oak', name: 'Old Oak Cup', ribbon: 'the Old Oak Ribbon', win: 16, again: 5, need: 'willow', rivals: [[380, 420, 360, 450, 600], [360, 620, 400, 420, 340], [420, 380, 600, 500, 360]] }];
  var PAY = { second: 2, other: 1 };
  var LINES = {   /* DRAFT, for his pen */
    nochick: 'The start line. Chicks race here, round the meadow. You need a chick of your own first.',
    sign: 'THE RACE\nRun · Swim · Climb · Glide',
    board: 'THE RACE\nout by the meadow',
    how: 'Grass for Run, the pond for Swim, the stumps for Strength, a glide off the bank for Flight. When your chick puffs out, tap and tap to cheer it on.',
    puff: 'Puffed out! Tap, tap, tap to cheer!',
    calm: 'Tap to cheer when it puffs',
    notTired: 'It is not tired yet. Save your cheers for when it puffs.'
  };
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function cl(v) { return Math.max(0, Math.min(1000, +v || 0)); }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  /* THE RULES (pure: no THREE, no page) */
  function mult(v) { return 0.78 + 0.62 * Math.sqrt(cl(v) / 1000); }   /* 0 -> x0.78, 16 -> x0.86, 100 -> x0.98, 250 -> x1.09, 1000 -> x1.40 */
  function drainK(sta) { return 3.0 * (1.3 - 0.8 * Math.sqrt(cl(sta) / 1000)); }   /* breath lost a second on the grass: 3.9 at 0, 2.5 at 250 */
  function cheerE(cre) { return 6 + 14 * Math.sqrt(cl(cre) / 1000); }   /* breath back a cheer: 6 at 0, 13 at 250, 20 at 1000 */
  function statsOf(a) { return Array.isArray(a) ? { fly: a[0], run: a[1], str: a[2], sta: a[3], swim: a[4], cre: 0 } : { fly: cl(a.fly), run: cl(a.run), str: cl(a.str), sta: cl(a.sta), swim: cl(a.swim), cre: cl(a.cre) }; }
  function bounds(L) { var B = [0]; STRETCH.forEach(function (x) { B.push(L * x.frac); }); return B; }
  function racer(st, seed) { return { st: statsOf(st), s: 0, E: 100, puff: false, t: 0, at: [0], done: false, fin: null, seed: seed || 0, cheers: 0, puffs: 0, puffT: 0, v: 0, k: 0, tap: -9, spark: 0 }; }
  function stretchAt(s, B) { return s < B[1] ? 0 : s < B[2] ? 1 : s < B[3] ? 2 : 3; }
  function step(r, dt, B) {
    if (r.done) return;
    var i = stretchAt(r.s, B), X = STRETCH[i];
    var v = X.base * mult(r.st[X.stat]) * (1 + 0.03 * Math.sin(r.s * 0.31 + r.seed * 2.1));   /* a little sway in its pace, by place along the line (so one strength never moves another stretch's time) */
    if (r.puff) { v *= K.PUFF_V; r.E += dt * K.RECOVER; r.puffT += dt; if (r.E >= K.PUFF_END) r.puff = false; }
    else { r.E -= dt * drainK(r.st.sta) * X.drain; if (r.E <= 0) { r.E = 0; r.puff = true; r.puffs++; } }
    r.k = i; r.v = v; r.s += v * dt; r.t += dt;
    while (r.at.length < 5 && r.s >= B[r.at.length]) r.at.push(r.t - (r.s - B[r.at.length]) / Math.max(0.01, v));   /* the moment it crossed (back-solved inside the step) */
    if (r.s >= B[4]) { r.done = true; r.fin = r.at[4]; r.s = B[4]; }
  }
  function cheer(r, cre) { if (!r.puff || r.done) return false; r.E += cheerE(cre); r.cheers++; if (r.E >= K.PUFF_END) r.puff = false; return true; }
  /* sim(stats, { L, cheerEvery, max }): one chick alone, the same step() as on screen (dt 1/30); cheerEvery: a tap every so many seconds while it puffs */
  function sim(st, o) {
    o = o || {}; var B = bounds(o.L || 98), r = racer(st, o.seed || 0), dt = 1 / 30, next = 0;
    while (!r.done && r.t < (o.max || 300)) { step(r, dt, B); if (o.cheerEvery && r.puff && r.t >= next) { cheer(r, r.st.cre); next = r.t + o.cheerEvery; } }
    return { time: +r.fin.toFixed(3), splits: [1, 2, 3, 4].map(function (k) { return +(r.at[k] - r.at[k - 1]).toFixed(3); }), puffs: r.puffs, puffT: +r.puffT.toFixed(2), cheers: r.cheers };
  }

  function create(o) {
    var THREE = o.THREE, scene = o.scene, Lt = o.late, cine = o.cine;
    var R = { on: false, ph: null, cup: null, runs: 0, panel: null, hud: null, near: null, fast: 1, held: false, result: null, last: null, aborts: 0, cheersIgnored: 0 };
    var root = new THREE.Group(); root.name = 'race782'; root.position.set(o.at.x, 0, o.at.z); root.rotation.y = o.at.yaw; scene.add(root); root.updateMatrixWorld(true);
    var lam = function (c, x) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, x || {})); };
    var cy = Math.cos(o.at.yaw), sy = Math.sin(o.at.yaw);
    function W(lx, lz) { return { x: o.at.x + lx * cy + lz * sy, z: o.at.z - lx * sy + lz * cy }; }   /* local to world (root.rotation.y = yaw) */
    function gl(lx, lz) { var w = W(lx, lz); return o.ground(w.x, w.z); }
    function shade(m, cast, recv) { m.traverse(function (q) { if (q.isMesh) { q.castShadow = !!cast; q.receiveShadow = recv !== false; } }); return m; }
    /* THE LINE: a closed curve round an oval; P(phi) = (-A cos phi, B sin phi): the start at the left, heading +z; +lateral is inward */
    var pts = []; for (var i = 0; i < 28; i++) { var ph = i / 28 * Math.PI * 2; pts.push(new THREE.Vector3(-K.A * Math.cos(ph), 0, K.B * Math.sin(ph))); }
    var curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal'); curve.arcLengthDivisions = 600;
    var L = curve.getLength(), Bd = bounds(L), N = 480, PX = [], PZ = [], TX = [], TZ = [];
    for (var j = 0; j <= N; j++) { var u = (j % N) / N, p = curve.getPointAt(u), t = curve.getTangentAt(u); PX.push(p.x); PZ.push(p.z); var tl = Math.hypot(t.x, t.z) || 1; TX.push(t.x / tl); TZ.push(t.z / tl); }
    function at(s, lat, out) { s = ((s % L) + L) % L; var f = s / L * N, a = Math.floor(f), b = Math.min(N, a + 1), k = f - a; var tx = TX[a] + (TX[b] - TX[a]) * k, tz = TZ[a] + (TZ[b] - TZ[a]) * k, tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      out = out || {}; out.x = PX[a] + (PX[b] - PX[a]) * k + tz * (lat || 0); out.z = PZ[a] + (PZ[b] - PZ[a]) * k - tx * (lat || 0); out.tx = tx; out.tz = tz; return out; }   /* +lat: (tz, -tx), inward */
    /* THE POND: over the Swim stretch, an ellipse along its chord */
    var pond = (function () {
      var a = at(Bd[1]), b = at(Bd[2]), cx = 0, cz = 0, n = 0, q = {}; for (var s = Bd[1]; s <= Bd[2]; s += 0.5) { at(s, 0, q); cx += q.x; cz += q.z; n++; } cx /= n; cz /= n;
      var len = Math.hypot(b.x - a.x, b.z - a.z), yaw = Math.atan2(b.x - a.x, b.z - a.z), mid = at((Bd[1] + Bd[2]) / 2), sag = Math.hypot(mid.x - cx, mid.z - cz);
      var ra = len / 2 + 0.9, rb = sag + 2.6, top = -1e9;
      for (var k = 0; k < 40; k++) { var an = k / 40 * Math.PI * 2, rr = k % 2 ? 1 : 0.55; var lx = cx + Math.sin(yaw) * Math.cos(an) * ra * rr + Math.cos(yaw) * Math.sin(an) * rb * rr, lz = cz + Math.cos(yaw) * Math.cos(an) * ra * rr - Math.sin(yaw) * Math.sin(an) * rb * rr; top = Math.max(top, gl(lx, lz)); }
      return { x: cx, z: cz, yaw: yaw, ra: ra, rb: rb, y: top + 0.08 };
    })();
    /* THE CLIMB: three big stumps, then the bank's flat top; the glide leaves its far edge */
    var climbLen = Bd[3] - Bd[2], SC = [Bd[2] + climbLen * 0.14, Bd[2] + climbLen * 0.38, Bd[2] + climbLen * 0.62], SB0 = Bd[2] + climbLen * 0.8;
    var bank = (function () {   /* its flat top runs from just before SB0 to the glide's edge (Bd[3]); its sides slope out past both ends */
      var s0 = SB0 - 0.4, s1 = Bd[3] + 0.3, a = at(s0), b = at(s1), mid = at((s0 + s1) / 2), top = Math.hypot(b.x - a.x, b.z - a.z), bot = top / 0.62, g = -1e9, lo = 1e9, q = {};
      for (var s = s0 - bot * 0.2; s <= s1 + bot * 0.2; s += 0.4) for (var d = -2.5; d <= 2.5; d += 1.25) { at(s, d, q); var h = gl(q.x, q.z); if (s >= s0 && s <= s1) g = Math.max(g, h); lo = Math.min(lo, h); }
      return { x: mid.x, z: mid.z, yaw: Math.atan2(b.x - a.x, b.z - a.z), len: bot, top: top, w: 5.0, y: g + 2.9, low: lo - 0.6 };
    })();
    var STEPS = SC.map(function (s, i) { var q = at(s); return { s: s, x: q.x, z: q.z, top: bank.y - [2.1, 1.35, 0.6][i] }; }).concat([{ s: SB0, top: bank.y }]);
    var gEnd = gl(at(0).x, at(0).z);
    function feetY(s, lat) {   /* the height of a racer's feet at s (world y) */
      var q = at(s, lat), g = gl(q.x, q.z);
      if (s < Bd[1]) return g;
      if (s < Bd[2]) { var e = Math.min(1, (s - Bd[1]) / 1.2, (Bd[2] - s) / 1.2); return g + (pond.y - 0.24 - g) * sm(e); }   /* wading in and out */
      if (s < Bd[3]) { var y = g; for (var k = 0; k < STEPS.length; k++) { var st = STEPS[k], prev = k ? STEPS[k - 1].top : g, a0 = st.s - 0.9; if (s >= st.s) y = st.top; else if (s > a0) { var h = (s - a0) / 0.9; y = prev + (st.top - prev) * sm(h) + Math.sin(h * Math.PI) * 0.35; break; } else break; } return Math.max(g, y); }
      var u = (s - Bd[3]) / (L - Bd[3]); return Math.max(g, bank.y + (gEnd - bank.y) * Math.pow(u, 1.25) + Math.sin(u * Math.PI) * 0.4);
    }
    /* THE BUILDING (once) */
    (function ribbon() {   /* a sandy track, skipping the pond and the bank */
      var pos = [], uv = [], idx = [], q = {}, n = 0, W2 = 1.7;
      function strip(s0, s1) { var first = n, m = Math.max(1, Math.ceil(s1 - s0)); for (var i = 0; i <= m; i++) { var s = s0 + (s1 - s0) * i / m; at(s, 0, q); for (var sd = -1; sd <= 1; sd += 2) { var lx = q.x + q.tz * W2 * sd, lz = q.z - q.tx * W2 * sd; pos.push(lx, gl(lx, lz) + 0.13, lz);   /* over the island's own ground mesh (it rides above H() between its vertices) */ uv.push(sd < 0 ? 0 : 1, s / 3); } if (n > first) { var b0 = n * 2; idx.push(b0 - 2, b0, b0 - 1, b0 - 1, b0, b0 + 1);   /* wound to face up (the first take faced down and was culled) */ } n++; } }
      strip(0, Bd[1] + 0.6); strip(Bd[2] - 0.6, SC[0] - 1.6); strip(Bd[3] + 2.2, L);
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      var m = o.tex(new THREE.Mesh(g, lam(0xd8c293, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })), 'sand', 1, 1); m.receiveShadow = true; root.add(m); R.track = m;
    })();
    (function pondMesh() {
      var w = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshPhongMaterial({ color: 0x3f8fae, shininess: 90, specular: 0x9fd8ff, transparent: true, opacity: 0.92 }));
      w.rotation.x = -Math.PI / 2; w.rotation.z = pond.yaw; w.scale.set(pond.rb, pond.ra, 1); w.position.set(pond.x, pond.y, pond.z); root.add(w); R.water = w;
      var g = new THREE.DodecahedronGeometry(0.42, 0), im = o.tex(new THREE.InstancedMesh(g, lam(0x9a9286), 34), 'stone', 1, 1), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), V = new THREE.Vector3(), c = 0;
      for (var i = 0; i < 34; i++) { var an = i / 34 * Math.PI * 2, ex = Math.sin(an) * pond.rb, ez = Math.cos(an) * pond.ra, lx = pond.x + ex * Math.cos(pond.yaw) + ez * Math.sin(pond.yaw), lz = pond.z - ex * Math.sin(pond.yaw) + ez * Math.cos(pond.yaw);
        var onLine = (function () { var best = 9; for (var s = Bd[1] - 1; s <= Bd[2] + 1; s += 0.5) { var q = at(s); best = Math.min(best, Math.hypot(q.x - lx, q.z - lz)); } return best < 1.9; })(); if (onLine) continue;   /* the racers' way in and out stays open */
        E.set(hash(i) * 3, hash(i * 2) * 3, 0); Q.setFromEuler(E); S.set(1 + hash(i * 3) * 0.7, Math.max(0.6, (pond.y - gl(lx, lz)) / 0.42 + 0.5), 1 + hash(i * 5) * 0.5); V.set(lx, Math.min(gl(lx, lz), pond.y) + 0.1, lz); M.compose(V, Q, S); im.setMatrixAt(c++, M); }
      im.count = c; shade(im, true, true); root.add(im);
    })();
    (function climb() {
      /* a square frustum (four sides, turned 45 degrees in its own shape so its faces sit on the axes), scaled to the bank: a grassy bank with sloping sides */
      var fg = new THREE.CylinderGeometry(0.62, 1, 1, 4, 1); fg.rotateY(Math.PI / 4); var hgt = bank.y - bank.low, k = 1 / (2 * Math.SQRT1_2);
      var bk = shade(o.tex(new THREE.Mesh(fg, lam(0x8fb563)), 'grass', 3, 2), true, true); bk.scale.set(bank.w * k, hgt, bank.len * k); bk.position.set(0, bank.low + hgt / 2, 0);
      var hold = new THREE.Group(); hold.rotation.y = bank.yaw; hold.position.set(bank.x, 0, bank.z); root.add(hold); hold.add(bk); R.bank = bk;
      var cg = new THREE.CylinderGeometry(1.0, 1.12, 1, 14), bark = o.tex(new THREE.InstancedMesh(cg, lam(0x8b6a44), 3), 'bark', 2, 1), tops = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.0, 1.0, 0.05, 14), lam(0xd9b98a), 3), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3();
      STEPS.slice(0, 3).forEach(function (st, i) { var g = gl(st.x, st.z) - 0.4, h = st.top - g; Q.identity(); S.set(1.65, h, 1.65); V.set(st.x, g + h / 2, st.z); M.compose(V, Q, S); bark.setMatrixAt(i, M); S.set(1.6, 1, 1.6); V.set(st.x, st.top + 0.01, st.z); M.compose(V, Q, S); tops.setMatrixAt(i, M); });
      shade(bark, true, true); shade(tops, false, true); root.add(bark); root.add(tops);
    })();
    function face(text, w, h, opts) {   /* a painted board face (haven781's sign, borrowed in shape) */
      opts = opts || {}; var cv = document.createElement('canvas'), Wd = 512, Hd = Math.round(512 * h / w); cv.width = Wd; cv.height = Hd; var g = cv.getContext('2d');
      g.fillStyle = opts.bg || '#7a5432'; g.fillRect(0, 0, Wd, Hd); g.strokeStyle = 'rgba(40,24,10,.6)'; g.lineWidth = 10; g.strokeRect(5, 5, Wd - 10, Hd - 10);
      g.fillStyle = opts.ink || '#fff3d6'; g.textAlign = 'center'; g.textBaseline = 'middle'; var lines = String(text).split('\n'), fs = Math.min(Hd / (lines.length + 0.6), opts.size || 110);
      lines.forEach(function (l, k) { g.font = (k ? '600 ' + Math.round(fs * 0.62) : '700 ' + fs) + 'px Georgia, "Times New Roman", serif'; g.fillText(l, Wd / 2, Hd / 2 + (k - (lines.length - 1) / 2) * fs * 1.05, Wd - 30); });
      var tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tx }));
    }
    function board(text, w, h, opts) { var g = new THREE.Group(), f = face(text, w, h, opts), b = face(text, w, h, opts); b.rotation.y = Math.PI; g.add(f); g.add(b); g.userData.faces = [text, text]; return g; }
    var S0 = at(0), sx = S0.tz, sz = -S0.tx;   /* the start line's inward side */
    (function arch() {
      var g0 = gEnd, postG = new THREE.CylinderGeometry(0.09, 0.11, 4.2, 7), postM = lam(0x7a5432);
      [-2.3, 2.3].forEach(function (d) { var p = shade(o.tex(new THREE.Mesh(postG, postM), 'wood', 1, 2), true); p.position.set(S0.x + sx * d, gl(S0.x + sx * d, S0.z + sz * d) + 2.1, S0.z + sz * d); root.add(p); });
      var cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; var c = cv.getContext('2d'); for (var i = 0; i < 32; i++) for (var r = 0; r < 4; r++) { c.fillStyle = (i + r) % 2 ? '#1d1d1d' : '#f7f2e6'; c.fillRect(i * 16, r * 16, 16, 16); }
      c.fillStyle = '#c8314a'; c.fillRect(150, 8, 212, 48); c.fillStyle = '#fff6dc'; c.font = '700 30px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('START · FINISH', 256, 33);
      var ban = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.58), lam(0xffffff, { map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })); ban.position.set(S0.x, g0 + 3.9, S0.z); ban.rotation.y = Math.atan2(S0.tx, S0.tz); root.add(ban); R.banner = ban;
      var line = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.22), lam(0xf7f2e6, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); line.rotation.x = -Math.PI / 2; line.rotation.z = Math.atan2(S0.tx, S0.tz); line.position.set(S0.x, g0 + 0.17, S0.z); root.add(line);
    })();
    var SIGN = { lat: -4.2, s: -3.4 };   /* the sign stands outside the line, before it; she cheers from just past the line (K.CH_S, K.CH_L), clear of its posts */
    (function sign() {
      var q = at(SIGN.s, SIGN.lat), g = gl(q.x, q.z), b = board(LINES.sign, 1.7, 0.85, { size: 96 }); b.position.set(q.x, g + 1.55, q.z); b.rotation.y = Math.atan2(sx, sz) + Math.PI; root.add(b); R.sign = b;
      [-0.92, 0.92].forEach(function (d) { var p = shade(o.tex(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.0, 6), lam(0x7a5432)), 'wood', 1, 2), true); p.position.set(q.x + q.tx * d, g + 1.0, q.z + q.tz * d); root.add(p); });
      R.signAt = { x: q.x, z: q.z };
    })();
    (function flags() {   /* six little flags round the loop: two instanced meshes */
      var poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.04, 1.6, 5), lam(0xefe6d2), 6), fl = new THREE.InstancedMesh(new THREE.CircleGeometry(0.32, 3), lam(0xffffff, { side: THREE.DoubleSide }), 6), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3(), C = new THREE.Color(), CL = [0xd8504a, 0xf2b134, 0x3f8fd0, 0x5aa04a, 0xb59cf0, 0xff8fa3];
      [0.12, 0.3, 0.45, 0.6, 0.86, 0.95].forEach(function (f, i) { var q = at(L * f, -2.6), g = gl(q.x, q.z); Q.identity(); V.set(q.x, g + 0.8, q.z); M.compose(V, Q, S); poles.setMatrixAt(i, M); E.set(0, Math.atan2(q.tx, q.tz) + Math.PI / 2, Math.PI / 2); Q.setFromEuler(E); V.set(q.x + q.tx * 0.25, g + 1.38, q.z + q.tz * 0.25); M.compose(V, Q, S); fl.setMatrixAt(i, M); fl.setColorAt(i, C.setHex(CL[i])); });
      fl.instanceColor.needsUpdate = true; shade(poles, true); root.add(poles); root.add(fl);
    })();
    /* THE RIVALS: makeChick's shape with fewer parts (body, head, beak, two eyes, two wings), the shapes shared */
    var GEO = { body: new THREE.SphereGeometry(0.42, 14, 10), head: new THREE.SphereGeometry(0.29, 14, 10), beak: new THREE.ConeGeometry(0.08, 0.22, 8), eye: new THREE.SphereGeometry(0.06, 8, 6), wing: new THREE.SphereGeometry(0.2, 10, 8) }, MAT = { beak: lam(0xf28c28), eye: new THREE.MeshBasicMaterial({ color: 0x111111 }) };
    function rivalMesh(col) {
      var g = new THREE.Group(), body = new THREE.Group(), m = lam(col); g.add(body);
      var b = new THREE.Mesh(GEO.body, m); b.scale.set(1, 0.95, 1.05); body.add(b); var h = new THREE.Mesh(GEO.head, m); h.position.set(0, 0.45, 0.14); body.add(h);
      var bk = new THREE.Mesh(GEO.beak, MAT.beak); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.42, 0.45); body.add(bk);
      [-1, 1].forEach(function (s) { var e = new THREE.Mesh(GEO.eye, MAT.eye); e.position.set(0.12 * s, 0.53, 0.38); body.add(e); });
      var wings = [-1, 1].map(function (s) { var piv = new THREE.Group(); piv.position.set(0.38 * s, 0.05, 0); var w = new THREE.Mesh(GEO.wing, m); w.scale.set(0.5, 1, 1.3); w.position.x = 0.06 * s; piv.add(w); body.add(piv); return piv; });
      body.scale.setScalar(K.SC); shade(g, true, false); return { g: g, body: body, wings: wings, sc: K.SC };
    }
    var RV = RIVALS.map(function (r, i) { var m = rivalMesh(r.col); root.add(m.g); m.name = r.name; m.col = r.col; m.lane = [-1.2, 0.4, 1.2][i]; return m; });
    var LANE_ME = -0.4;
    var sweat = []; for (var w = 0; w < 4; w++) { var sp = o.sprite('\u{1F4A6}', 0.42); sp.visible = false; scene.add(sp); sweat.push(sp); }
    function idlePlace() { RV.forEach(function (m, i) { var q = at(-1.6 - i * 0.0, m.lane), g = gl(q.x, q.z); m.g.position.set(q.x, g + 0.4, q.z); m.g.rotation.y = Math.atan2(q.tx, q.tz); }); }
    idlePlace();
    /* THE MOWER: the island's grass asks (world-vegetation.js islandDens): none on the track, the pond, the bank and round the start; thin at the track's shoulders */
    var MOW = (function () { var q = at(0, -2.6); return { sx: q.x, sz: q.z }; })();
    function mown(x, z) {
      var dx = x - o.at.x, dz = z - o.at.z; if (dx * dx + dz * dz > 34 * 34) return 1; var lx = dx * cy - dz * sy, lz = dx * sy + dz * cy;
      if (Math.hypot(lx - MOW.sx, lz - MOW.sz) < 5.2) return 0;
      var px = lx - pond.x, pz = lz - pond.z, pa = px * Math.sin(pond.yaw) + pz * Math.cos(pond.yaw), pb = px * Math.cos(pond.yaw) - pz * Math.sin(pond.yaw); if (Math.hypot(pa / (pond.ra + 0.8), pb / (pond.rb + 0.8)) < 1) return 0;
      var e = Math.hypot(lx / K.A, lz / K.B); if (e < 1e-3) return 1; var r = Math.hypot(lx, lz), d = Math.abs(r - r / e);
      return d < 2.1 ? 0 : d < 3.6 ? (d - 2.1) / 1.5 * 0.7 : 1;
    }
    /* where she stands to cheer (beside the line, outside it), facing in */
    function faceIn() { var q = at(K.CH_S, K.CH_L), c = at(K.CH_S, 4), a = W(q.x, q.z), b = W(c.x, c.z); return Math.atan2(b.x - a.x, b.z - a.z); }
    function state() { var S = Lt().S; S.race782 = S.race782 || { won: {}, runs: 0, best: {}, paid: 0 }; var r = S.race782; r.won = r.won || {}; r.best = r.best || {}; return r; }
    function open(cup) { var c = CUPS.find(function (q) { return q.id === cup; }); if (!c) return false; return !c.need || !!(state().won[c.need]); }
    /* THE ACTION BUTTON at the start line */
    var LABEL = '\u{1F3C1} Race';
    function nearOf(S) { if (!S || S.mode !== 'walk' || S.talking || S.inside || R.on || R.panel || (o.haven && o.haven())) return false; var w = W(R.signAt.x, R.signAt.z); return Math.hypot(S.pos.x - w.x, S.pos.z - w.z) < K.NEAR + 0.6 && Math.abs(S.pos.y - o.ground(S.pos.x, S.pos.z)) < 2.5; }
    function button(el) { if (o.classic && o.classic()) return false; var S = Lt().S, n = nearOf(S); R.near = n; if (!n) return false; if (el.textContent !== LABEL) el.textContent = LABEL; if (el.hidden) el.hidden = false; return true; }
    function press() { if (!R.near || R.on || R.panel || (cine && cine.on())) return false; var lt = Lt(); if (!lt.chick() || !lt.S.nestDone) { lt.toast(LINES.nochick, 3800); return true; } openPanel(); return true; }
    /* THE PANEL: three cups, her chick's strengths */
    function css() {
      if (document.getElementById('race782css')) return; var s = document.createElement('style'); s.id = 'race782css';
      s.textContent = '#race782p{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);transform:translateX(-50%);width:min(440px,calc(100vw - 24px));max-height:min(78vh,640px);box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;z-index:44;background:#fff8ea;color:#3b2a1a;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.35);padding:14px 14px 10px;font-family:var(--body,system-ui)}' +
        '#race782p h3{margin:0 0 2px;font:600 22px Georgia,serif;display:flex;justify-content:space-between;align-items:center}#race782p h3 span{font:800 16px var(--body,system-ui);color:#8a5a12}#race782p .how{font:600 12.5px/1.35 var(--body,system-ui);color:#6b4a14;background:#fbeccb;border-radius:10px;padding:6px 8px;margin:4px 0 8px}' +
        '#race782p .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 10px;font:700 12px var(--body,system-ui);color:#5a4026;margin-bottom:8px}#race782p .stats i{font-style:normal;color:#8a6a46;font-weight:600}#race782p .stats u{display:block;height:4px;border-radius:2px;background:rgba(60,40,20,.12);margin-top:2px;overflow:hidden}#race782p .stats u b{display:block;height:100%;background:#c8314a}' +
        '#race782p .rows{flex:1 1 auto;min-height:0;overflow:auto}#race782p .row{display:flex;align-items:center;gap:10px;padding:8px 4px;border-top:1px solid rgba(60,40,20,.1)}#race782p .row .e{font-size:28px;width:38px;text-align:center}#race782p .row .t{flex:1;min-width:0}#race782p .row b{display:block;font:700 15px var(--body,system-ui)}#race782p .row small{display:block;font:600 12px/1.3 var(--body,system-ui);color:#7a5a3a}' +
        '#race782p .row button{min-width:84px;min-height:44px;border-radius:14px;border:0;background:#c8314a;color:#fff;font:800 14px var(--body,system-ui)}#race782p .row button[disabled]{background:#cbbfa8;color:#fff8ea}' +
        '#race782p .close{display:block;width:100%;margin-top:8px;min-height:44px;border-radius:14px;border:2px solid rgba(60,40,20,.2);background:#fff;font:800 14px var(--body,system-ui);color:#3b2a1a}#race782p .go2{display:block;width:100%;margin-top:8px;min-height:48px;border-radius:14px;border:0;background:#c8314a;color:#fff;font:800 15px var(--body,system-ui)}' +
        '#race782p .place{font:600 30px/1.1 Georgia,serif;text-align:center;margin:4px 0 2px}#race782p .pay{text-align:center;font:800 16px var(--body,system-ui);color:#8a5a12;margin-bottom:6px}#race782p table{width:100%;border-collapse:collapse;font:600 13px var(--body,system-ui)}#race782p td{padding:5px 4px;border-top:1px solid rgba(60,40,20,.1)}#race782p td.n{text-align:right;font-variant-numeric:tabular-nums}#race782p tr.lost td{background:#fdeedd}' +
        '#race782p .tip{font:600 13px/1.4 var(--body,system-ui);color:#3b2a1a;background:#eef6e6;border-radius:10px;padding:8px;margin-top:8px}' +
        '#race782h{position:fixed;inset:0;z-index:46;pointer-events:none;font-family:var(--body,system-ui);color:#fff}#race782h .top{position:absolute;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);display:flex;justify-content:space-between;align-items:flex-start;text-shadow:0 1px 3px rgba(0,8,24,.9)}' +
        '#race782h .cup{font:700 12px var(--body,system-ui);letter-spacing:.14em;text-transform:uppercase;opacity:.9}#race782h .leg{font:600 15px Georgia,serif;margin-top:2px}#race782h .rank{font:600 40px/1 Georgia,serif;text-align:right}#race782h .rank small{display:block;font:700 11px var(--body,system-ui);letter-spacing:.1em;opacity:.85}' +
        '#race782h .track{position:absolute;left:16px;right:16px;top:calc(env(safe-area-inset-top,0px) + 74px);height:18px}#race782h .track .ln{position:absolute;left:0;right:0;top:8px;height:3px;border-radius:2px;background:rgba(255,255,255,.55)}#race782h .track .tk{position:absolute;top:4px;width:2px;height:11px;background:rgba(255,255,255,.8)}#race782h .track .d{position:absolute;top:2px;width:14px;height:14px;margin-left:-7px;border-radius:50%;border:2px solid #fff;box-sizing:border-box;transition:left .1s linear}#race782h .track .d.me{width:18px;height:18px;margin-left:-9px;top:0;box-shadow:0 0 0 2px #c8314a}' +
        '#race782h .puff{position:absolute;left:16px;top:calc(env(safe-area-inset-top,0px) + 100px);width:150px;font:700 11px var(--body,system-ui);letter-spacing:.08em;text-shadow:0 1px 3px rgba(0,8,24,.9)}#race782h .puff .bar{height:9px;border-radius:5px;background:rgba(0,0,0,.35);overflow:hidden;margin-top:3px;border:1px solid rgba(255,255,255,.6)}#race782h .puff .bar i{display:block;height:100%;background:#7ed37a;transition:width .1s linear}#race782h .puff.low .bar i{background:#f2b134}#race782h .puff.out .bar i{background:#e0533c}' +
        '#race782h .cheer{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 16vh);transform:translateX(-50%);padding:10px 18px;border-radius:999px;background:rgba(20,24,40,.55);font:800 15px var(--body,system-ui);white-space:nowrap;transition:transform .15s}#race782h .cheer.now{background:#c8314a;font-size:18px;animation:race782p .5s ease-in-out infinite alternate}' +
        '@keyframes race782p{from{transform:translateX(-50%) scale(1)}to{transform:translateX(-50%) scale(1.08)}}#race782h .count{position:absolute;left:0;right:0;top:34%;text-align:center;font:600 96px/1 Georgia,serif;text-shadow:0 4px 18px rgba(0,8,24,.7);opacity:0;transition:opacity .2s}#race782h .count.on{opacity:1}' +
        '#race782h .quit{position:absolute;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);pointer-events:auto;min-width:44px;min-height:44px;border-radius:999px;border:0;background:rgba(20,24,40,.5);color:#fff;font:700 12px var(--body,system-ui);padding:0 14px}#race782h .pop{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 23vh);transform:translateX(-50%);font:800 18px var(--body,system-ui);opacity:0;transition:opacity .25s,transform .4s}#race782h .pop.on{opacity:1;transform:translateX(-50%) translateY(-8px)}';
      document.head.appendChild(s);
    }
    var STATW = [['run', 'Run'], ['swim', 'Swim'], ['str', 'Strength'], ['fly', 'Flight'], ['sta', 'Stamina'], ['cre', 'Creativity']];
    function lvl(v) { return Math.floor(cl(v) / 50); }
    function panelEl() { css(); var el = document.getElementById('race782p'); if (!el) { el = document.createElement('div'); el.id = 'race782p'; document.body.appendChild(el); el.addEventListener('pointerdown', function (e) { e.stopPropagation(); }, true); el.addEventListener('click', onPanel); } return el; }
    function closePanel() { var el = document.getElementById('race782p'); if (el) el.remove(); if (R.panel) { R.panel = null; var lt = Lt(); lt.S.talking = false; release(); } }
    function openPanel() {
      var lt = Lt(), S = lt.S, st = S.chick.stats || {}, rs = state(), el = panelEl(); R.panel = 'cups'; S.talking = true; R.held = true; R.opens = (R.opens || 0) + 1;
      var h = '<h3>The Race<span>\u{1FA99} ' + (S.coins || 0) + '</span></h3><div class="how">' + LINES.how + '</div><div class="stats">' + STATW.map(function (q) { var v = cl(st[q[0]]); return '<span>' + q[1] + ' <i>Lv ' + lvl(v) + '</i><u><b style="width:' + Math.round((v % 50) / 50 * 100) + '%"></b></u></span>'; }).join('') + '</div><div class="rows">';
      CUPS.forEach(function (c, i) { var on = open(c.id), won = rs.won[c.id] || 0;
        h += '<div class="row"><div class="e">' + ['\u{1F330}', '\u{1F33F}', '\u{1F333}'][i] + '</div><div class="t"><b>' + c.name + (won ? ' ✓' : '') + '</b><small>' + (on ? (won ? 'Won ' + won + (won > 1 ? ' times' : ' time') + ' · a win pays \u{1FA99} ' + c.again : 'Win: \u{1FA99} ' + c.win + ' and ' + c.ribbon) + ' · vs ' + RIVALS.map(function (r) { return r.name; }).join(', ') : 'Win the ' + CUPS[i - 1].name + ' to open it') + '</small></div><button type="button" data-cup="' + c.id + '"' + (on ? '' : ' disabled') + '>' + (on ? 'Race' : '\u{1F512}') + '</button></div>'; });
      h += '</div><button type="button" class="close" data-close="1">Not now</button>'; el.innerHTML = h;
    }
    function onPanel(e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.close) { closePanel(); return; } if (b.dataset.cup) { var c = b.dataset.cup; var el = document.getElementById('race782p'); if (el) el.remove(); R.panel = null; start(c); return; } if (b.dataset.again) { var cc = R.cup ? R.cup.id : 'acorn'; var el2 = document.getElementById('race782p'); if (el2) el2.remove(); R.panel = null; openPanel(); return; } }
    /* HOLDING HER CHICK: the race moves it; the game's own chick rules wait (chickTick asks holds()) */
    function release() {
      if (!R.held || R.on || R.panel) return; R.held = false; var lt = Lt(), chick = lt.chick(); if (!chick) return; var U = chick.userData;
      U.body.position.y = 0; U.body.rotation.set(0, 0, 0); U.life = null;
      if (lt.FOLLOW && lt.FOLLOW.with) { var S = lt.S; chick.position.set(S.pos.x + Math.sin(S.yaw + 2.2) * 0.9, o.ground(S.pos.x + Math.sin(S.yaw + 2.2) * 0.9, S.pos.z + Math.cos(S.yaw + 2.2) * 0.9) + 0.4, S.pos.z + Math.cos(S.yaw + 2.2) * 0.9); if (lt.FOLLOW.ring) lt.FOLLOW.ring.length = 0; lt.FOLLOW.last = null; }
      else if (R.ran) { var h = lt.chickSpot(); chick.position.copy(h); U.home = h.clone(); U.where = 'home'; lt.toast('Your chick hops back to its nest for a rest.', 2800); }
      R.ran = false;
    }
    /* THE RACE ITSELF: one long scene on the kit */
    var Q = {}, V3 = new THREE.Vector3(), camP = new THREE.Vector3(), camL = new THREE.Vector3(), camInit = false, me = null, rv = [];
    function hudEl() {
      css(); var el = document.createElement('div'); el.id = 'race782h';
      el.innerHTML = '<div class="top"><div><div class="cup"></div><div class="leg"></div></div><div class="rank"></div></div><div class="track"><div class="ln"></div></div><div class="puff"><span>BREATH</span><div class="bar"><i style="width:100%"></i></div></div><div class="cheer"></div><div class="pop"></div><div class="count"></div><button type="button" class="quit">Leave race</button>';
      document.body.appendChild(el);
      var tr = el.querySelector('.track'); [Bd[1], Bd[2], Bd[3]].forEach(function (b) { var t = document.createElement('div'); t.className = 'tk'; t.style.left = (b / L * 100) + '%'; tr.appendChild(t); });
      var dots = []; for (var i = 0; i < 4; i++) { var d = document.createElement('div'); d.className = 'd' + (i === 0 ? ' me' : ''); d.style.background = i === 0 ? '#ffd94a' : '#' + RIVALS[i - 1].col.toString(16).padStart(6, '0'); tr.appendChild(d); dots.push(d); }
      el.querySelector('.quit').addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); abort(); });
      return { el: el, cup: el.querySelector('.cup'), leg: el.querySelector('.leg'), rank: el.querySelector('.rank'), dots: dots, puff: el.querySelector('.puff'), bar: el.querySelector('.puff i'), cheer: el.querySelector('.cheer'), pop: el.querySelector('.pop'), count: el.querySelector('.count'), last: {} };
    }
    function hudSet(H, k, v, f) { if (H.last[k] !== v) { H.last[k] = v; f(v); } }
    function ord(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }
    function rankOf() { var all = [me].concat(rv); var mine = me.done ? me.fin : null; var ahead = 0; all.forEach(function (r) { if (r === me) return; if (me.done) { if (r.done && r.fin < me.fin) ahead++; } else if (r.done || r.s > me.s) ahead++; }); return ahead + 1; }
    function start(cupId) {
      var lt = Lt(), S = lt.S, chick = lt.chick(), cup = CUPS.find(function (q) { return q.id === cupId; });
      if (!cup || !open(cupId) || !chick || !S.nestDone || !cine || R.on || cine.on()) { S.talking = false; R.held = true; R.panel = null; release(); return false; }
      R.cup = cup; R.on = true; R.held = true; R.ran = true; R.ph = 'intro'; R.runs++; R.result = null; R.cheersIgnored = 0; S.talking = true; camInit = false;
      var cs = W(at(K.CH_S, K.CH_L).x, at(K.CH_S, K.CH_L).z); S.mode = 'walk'; S.speed = 0; S.vy = 0; S.pos.set(cs.x, o.ground(cs.x, cs.z) + lt.standOf(), cs.z); S.yaw = faceIn(); S.camYaw = S.yaw; S.camCut = true;
      me = racer(S.chick.stats || {}, 0); me.lane = LANE_ME; me.cre = cl((S.chick.stats || {}).cre);
      rv = cup.rivals.map(function (st, i) { var r = racer(st, i + 1); r.lane = RV[i].lane; r.m = RV[i]; return r; });
      var H = hudEl(); R.hud = H; H.cup.textContent = cup.name; H.el.style.opacity = '0';
      var said = false, cnt = -1, H0 = H;
      var ok = cine.play({ name: 'race782', dur: 1e6, skip: false, freeze: false,
        onTap: function () { if (R.ph !== 'run') return null; var t = performance.now() / 1000; if (t - me.tap < K.TAP_MIN) return null; me.tap = t; if (cheer(me, me.cre)) { pop('\u{1F4E3} +' + Math.round(cheerE(me.cre)) + ' breath'); try { lt.chirp(); } catch (e) { /* fine */ } } else { R.cheersIgnored++; pop('❤️'); } return null; },
        tick: function (t, real) {
          var sc = cine.current(); if (!sc) return; var S2 = lt.S; S2.speed = 0; S2.vy = 0; S2.pos.x = cs.x; S2.pos.z = cs.z;
          if (R.ph === 'intro') {
            if (!said && t > 0.6) { said = true; try { o.title('The Race', cup.name, 'Run · Swim · Climb · Glide', 'found'); } catch (e) { /* fine */ } }
            var c = t < 4 ? -1 : t < 5 ? 3 : t < 6 ? 2 : t < 7 ? 1 : 0;
            if (c !== cnt && c >= 0) { cnt = c; H0.el.style.opacity = '1'; if (o.titleHide) try { o.titleHide(); } catch (e) { /* fine */ } H0.count.textContent = c ? String(c) : 'Go!'; H0.count.classList.add('on'); try { if (o.sound) o.sound(c ? 'count' : 'go'); } catch (e) { /* fine */ } }
            if (t >= K.INTRO) { R.ph = 'run'; R.t0 = t; cine.bars(false); setTimeout(function () { if (H0.count) H0.count.classList.remove('on'); }, 600); }
          } else if (R.ph === 'run' || R.ph === 'fin') {
            var d = Math.min(0.05, real) * R.fast, n = Math.max(1, Math.ceil(d / 0.034)); for (var k = 0; k < n; k++) { step(me, d / n, Bd); rv.forEach(function (r) { step(r, d / n, Bd); }); }
            if (R.ph === 'run' && me.done) { R.ph = 'fin'; R.finT = t; cine.bars(true); try { if (o.sound) o.sound(rankOf() === 1 ? 'win' : 'land'); } catch (e) { /* fine */ } }
            if (R.ph === 'fin' && (rv.every(function (r) { return r.done; }) || t - R.finT > K.FIN_HOLD / Math.max(1, R.fast)) && sc.dur > 1e5) { sc.dur = t + 0.6; }
          }
          hudTick(H0, t);
        },
        shot: function (t, u, P, Lk) { return shot(t, P, Lk, lt); },
        pose: function (on) { pose(on, lt); },
        end: function (how) { finish(how); } });
      if (!ok) { R.on = false; R.ran = false; S.talking = false; if (R.hud) { R.hud.el.remove(); R.hud = null; } release(); return false; }
      return true;
    }
    function pop(txt) { var H = R.hud; if (!H) return; H.pop.textContent = txt; H.pop.classList.remove('on'); void H.pop.offsetWidth; H.pop.classList.add('on'); clearTimeout(R.popT); R.popT = setTimeout(function () { if (H.pop) H.pop.classList.remove('on'); }, 700); }
    function hudTick(H, t) {
      var X = STRETCH[me.k || 0];
      hudSet(H, 'leg', R.ph === 'intro' ? 'On your marks' : me.done ? 'Finished!' : X.name.replace(/^./, function (c) { return c.toUpperCase(); }) + ' · ' + X.word, function (v) { H.leg.textContent = v; });
      hudSet(H, 'rank', R.ph === 'intro' ? '' : ord(rankOf()), function (v) { H.rank.innerHTML = v ? v + '<small>PLACE</small>' : ''; });
      var all = [me].concat(rv); all.forEach(function (r, i) { var f = Math.round(Math.min(1, r.s / L) * 1000) / 10; hudSet(H, 'd' + i, f, function (v) { H.dots[i].style.left = v + '%'; }); });
      var e = Math.round(Math.max(0, Math.min(100, me.E))); hudSet(H, 'E', e, function (v) { H.bar.style.width = v + '%'; });
      hudSet(H, 'pc', me.puff ? 'out' : me.E < 30 ? 'low' : '', function (v) { H.puff.className = 'puff' + (v ? ' ' + v : ''); });
      hudSet(H, 'ch', R.ph !== 'run' ? '' : me.puff ? 'now' : 'calm', function (v) { H.cheer.textContent = v === 'now' ? LINES.puff : v === 'calm' ? LINES.calm : ''; H.cheer.className = 'cheer' + (v === 'now' ? ' now' : ''); H.cheer.style.display = v ? '' : 'none'; });
    }
    /* THE CAMERA: the start (a low dolly along the four), the count (behind the line), the run (behind her chick; the climb from the side; the glide met head-on), the finish (held at the line) */
    function shot(t, P, Lk, lt) {
      var real = Math.max(0.001, t - (R.lastT || t)); R.lastT = t;
      if (R.ph === 'intro') {
        var q = at(0), wd = W(q.x, q.z), g = gl(q.x, q.z);
        if (t < 4) { var k = sm(t / 4), a = at(3.6, 2.6 - 5.2 * k), wa = W(a.x, a.z); P.set(wa.x, g + 0.75 + 0.25 * k, wa.z); Lk.set(wd.x, g + 0.45, wd.z); return 46; }
        var b = at(-7.4, 0), wb = W(b.x, b.z), f = at(5, 0), wf = W(f.x, f.z); P.set(wb.x, g + 2.6, wb.z); Lk.set(wf.x, g + 0.2, wf.z); camInit = false; return 50;   /* far enough back that all four lanes fit a phone held upright */
      }
      var lt2 = lt, chick = lt2.chick(), cp = chick ? chick.position : V3.set(0, 0, 0), s = me.s, X = me.k, tp = at(s, me.lane), fx = tp.tx * cy + tp.tz * sy, fz = -tp.tx * sy + tp.tz * cy, nx = tp.tz * cy + (-tp.tx) * sy, nz = -tp.tz * sy + (-tp.tx) * cy;   /* world forward and inward */
      var tP = new THREE.Vector3(), tL = new THREE.Vector3(), fov = 52;
      if (R.ph === 'fin') { var q2 = at(5.2, -1.2), w2 = W(q2.x, q2.z), q3 = at(-5, 0.2), w3 = W(q3.x, q3.z), g2 = gl(q2.x, q2.z); tP.set(w2.x, g2 + 1.5, w2.z); tL.set(w3.x, gl(q3.x, q3.z) + 0.9, w3.z); fov = 52; }
      else if (X === 3) { var e = at(L - 0.5, -4.0), we = W(e.x, e.z); tP.set(we.x, gl(e.x, e.z) + 1.3, we.z); tL.copy(cp); tL.y += 0.1; fov = 44 - 10 * sm((s - Bd[3]) / (L - Bd[3])); }
      else if (X === 2) { tP.set(cp.x - fx * 2.6 - nx * 5.2, cp.y + 1.8, cp.z - fz * 2.6 - nz * 5.2); tL.set(cp.x + fx * 1.4, cp.y + 0.3, cp.z + fz * 1.4); fov = 50; }
      else { var hgt = X === 1 ? 1.3 : 1.9; tP.set(cp.x - fx * 4.6 - nx * 1.5, cp.y + hgt, cp.z - fz * 4.6 - nz * 1.5); tL.set(cp.x + fx * 2.6, cp.y + 0.25, cp.z + fz * 2.6); }
      var gp = o.ground(tP.x, tP.z); if (tP.y < gp + 0.7) tP.y = gp + 0.7;
      var bl = (function () { var dx = tP.x - (o.at.x + bank.x * cy + bank.z * sy), dz = tP.z - (o.at.z - bank.x * sy + bank.z * cy); return Math.hypot(dx, dz) < bank.len * 0.6 + 1; })(); if (bl && tP.y < bank.y + 1.2) tP.y = bank.y + 1.2;
      if (!camInit) { camP.copy(tP); camL.copy(tL); camInit = true; } else { var a2 = 1 - Math.exp(-real * 3.2); camP.lerp(tP, a2); camL.lerp(tL, Math.min(1, a2 * 1.6)); }
      P.copy(camP); Lk.copy(camL); R.cam = { P: P.toArray(), L: Lk.toArray(), ph: R.ph, k: X }; return fov;
    }
    /* THE BODIES: each racer placed from its distance along the line, with its stretch's look (hop, swim, hop up, wings out to glide, a puff) */
    function placeBody(m, r, t, wings, body, sc, world) {
      var s = r.s, q = at(s, r.lane), y = feetY(s, r.lane), k = r.k, ph = t * 12 + r.seed * 1.7, hop = 0, wz = Math.sin(t * 2) * 0.08, rx = 0;
      if (r.puff && !r.done) { hop = 0; wz = 0.15; body.rotation.z = Math.sin(t * 22) * 0.06; }
      else if (k === 0 || r.done) { hop = r.done ? Math.abs(Math.sin(t * 6)) * 0.1 : Math.abs(Math.sin(ph)) * 0.16; wz = Math.sin(ph * 2) * 0.5; body.rotation.z = 0; }
      else if (k === 1) { hop = Math.sin(t * 3 + r.seed) * 0.03; wz = 0.4 + Math.sin(t * 6 + r.seed) * 0.4; body.rotation.z = Math.sin(t * 2.4 + r.seed) * 0.08; }
      else if (k === 2) { wz = Math.sin(t * 20) * 0.9; body.rotation.z = 0; }
      else { wz = 1.25 + Math.sin(t * 3 + r.seed) * 0.08; rx = 0.25; body.rotation.z = Math.sin(t * 1.6 + r.seed) * 0.12; }
      var lx = q.x, lz = q.z, yaw = Math.atan2(q.tx, q.tz);
      if (world) { var w = W(lx, lz); m.position.set(w.x, y + 0.4, w.z); m.rotation.y = yaw + o.at.yaw; } else { m.position.set(lx, y + 0.4, lz); m.rotation.y = yaw; }
      body.position.y = -0.4 * (1 - sc) + hop * sc * 2.4; body.rotation.x = rx; if (wings) { wings[0].rotation.z = wz; wings[1].rotation.z = -wz; }
      return m.position;
    }
    var SV = { p: new THREE.Vector3(), r: 0, by: 0, bx: 0, bz: 0, w0: 0, w1: 0, sc: 1 };
    function pose(on, lt) {
      var chick = lt.chick(); if (!chick || !me) return; var U = chick.userData, t = (cine.t ? cine.t() : 0);
      if (on) { SV.p.copy(chick.position); SV.r = chick.rotation.y; SV.by = U.body.position.y; SV.bx = U.body.rotation.x; SV.bz = U.body.rotation.z; SV.w0 = U.wings[0].rotation.z; SV.w1 = U.wings[1].rotation.z; SV.mind = U.mind && U.mind.s.visible;
        var sc = U.body.scale.x || 0.3; placeBody(chick, me, t, U.wings, U.body, sc, true); if (U.mind) U.mind.s.visible = false;
        sweatAt(0, me, chick.position, sc); }
      else { chick.position.copy(SV.p); chick.rotation.y = SV.r; U.body.position.y = SV.by; U.body.rotation.x = SV.bx; U.body.rotation.z = SV.bz; U.wings[0].rotation.z = SV.w0; U.wings[1].rotation.z = SV.w1; if (U.mind) U.mind.s.visible = SV.mind; }
    }
    function sweatAt(i, r, p, sc) { var sp = sweat[i]; if (!sp) return; var on = !!(r && r.puff && !r.done && R.on); sp.visible = on; if (on) { sp.position.set(p.x + 0.2, p.y + 0.55 + Math.sin((cine.t ? cine.t() : 0) * 8) * 0.05, p.z); } }
    function tick(dt, real) {   /* every frame: show the course near her; the rivals' racing or their waiting at the line */
      var lt = Lt(), S = lt.S, w = W(0, 0), d = Math.hypot(S.pos.x - w.x, S.pos.z - w.z), vis = d < K.SHOW && !(o.haven && o.haven()) && !(o.away && o.away());
      if (root.visible !== vis) root.visible = vis; if (!vis) { for (var i = 0; i < 4; i++) sweat[i].visible = false; return; }
      var rvis = R.on || d < K.LIVE; if (RV[0].g.visible !== rvis) RV.forEach(function (m) { m.g.visible = rvis; });   /* the rivals (21 parts) only near her */
      var t = (R.on && cine.t) ? cine.t() : (S.t || 0);
      if (R.on && me && R.ph !== 'intro') { rv.forEach(function (r, i) { placeBody(r.m.g, r, t, r.m.wings, r.m.body, r.m.sc, false); var wp = new THREE.Vector3(); r.m.g.getWorldPosition(wp); sweatAt(i + 1, r, wp, r.m.sc); }); }
      else if (R.on && me) { rv.forEach(function (r) { placeBody(r.m.g, r, t, r.m.wings, r.m.body, r.m.sc, false); }); }
      else if (d < K.LIVE) { RV.forEach(function (m, i) { var hop = Math.max(0, Math.sin(t * 2.2 + i * 2.1)); m.body.position.y = -0.4 * (1 - m.sc) + (hop > 0.9 ? (hop - 0.9) * 2.4 : 0) * m.sc; var wz = Math.sin(t * 1.7 + i) * 0.1; m.wings[0].rotation.z = wz; m.wings[1].rotation.z = -wz; }); for (var j = 1; j < 4; j++) sweat[j].visible = false; }
    }
    function finish(how) {
      var lt = Lt(), S = lt.S, H = R.hud; if (H) { H.el.remove(); R.hud = null; }
      for (var i = 0; i < 4; i++) sweat[i].visible = false; idlePlace(); RV.forEach(function (m) { m.body.rotation.set(0, 0, 0); });
      R.on = false; R.ph = null;
      var chick = lt.chick(); if (chick) { var cs = W(at(K.CH_S, K.CH_L + 1.1).x, at(K.CH_S, K.CH_L + 1.1).z); chick.position.set(cs.x, o.ground(cs.x, cs.z) + 0.4, cs.z); chick.rotation.y = Math.atan2(S.pos.x - cs.x, S.pos.z - cs.z); }
      if (how === 'abort' || how === 'replaced' || !me || !me.done) { R.aborts++; S.talking = false; R.held = true; R.panel = null; release(); R.last = { cup: R.cup && R.cup.id, how: how || 'abort', paid: 0 }; return; }
      rv.forEach(function (r) { if (!r.done) { var left = L - r.s; r.fin = r.t + left / Math.max(0.5, r.v / (r.puff ? K.PUFF_V : 1)); r.done = true; } });   /* still running when the camera left: its time from its pace */
      var place = 1 + rv.filter(function (r) { return r.fin < me.fin; }).length, rs = state(), cup = R.cup, first = place === 1 && !rs.won[cup.id];
      var pay = place === 1 ? (first ? cup.win : cup.again) : place === 2 ? PAY.second : PAY.other;
      rs.runs = (rs.runs || 0) + 1; if (place === 1) rs.won[cup.id] = (rs.won[cup.id] || 0) + 1; if (!rs.best[cup.id] || me.fin < rs.best[cup.id]) rs.best[cup.id] = +me.fin.toFixed(2); rs.paid = (rs.paid || 0) + pay;
      S.coins = (S.coins || 0) + pay; lt.save(); lt.hud();
      var res = R.result = { cup: cup.id, place: place, pay: pay, first: first, time: +me.fin.toFixed(2), me: splits(me), rivals: rv.map(function (r) { return { name: r.m.name, time: +r.fin.toFixed(2), splits: splits(r) }; }), puffs: me.puffs, puffT: +me.puffT.toFixed(2), cheers: me.cheers, coins: S.coins, advice: advise() };
      R.last = { cup: cup.id, how: how, paid: pay, place: place };
      var next = CUPS[CUPS.indexOf(cup) + 1];
      if (first && cine) { var ok = cine.itemGet({ emoji: '\u{1F3F5}️', name: cup.ribbon, over: 'You won', line: (next ? 'The ' + next.name + ' is open now. ' : 'All three cups are yours! ') + '\u{1FA99} +' + pay, done: function () { result(); } }); if (ok) { S.talking = true; return; } }
      result();
    }
    function splits(r) { return [1, 2, 3, 4].map(function (k) { return +((r.at[k] != null ? r.at[k] : r.fin) - (r.at[k - 1] != null ? r.at[k - 1] : 0)).toFixed(2); }); }
    function advise() {   /* where her chick lost the most time against the best rival on each stretch, as a share; or its breath */
      var worst = -1, wi = 0, myS = splits(me); STRETCH.forEach(function (x, i) { var best = Math.min.apply(null, rv.map(function (r) { return splits(r)[i]; })); var loss = (myS[i] - best) / Math.max(0.5, best); if (loss > worst) { worst = loss; wi = i; } });
      var fr = (window.WFR_HAVEN781 && WFR_HAVEN781.FRUIT) || [], X = STRETCH[wi];
      if (me.puffT > 2.5 && me.puffT / me.fin > Math.max(0.06, worst * 0.5)) { var f1 = fr.find(function (f) { return f.stat === 'sta'; }); return { stat: 'sta', word: 'Stamina', where: 'puffed out for ' + Math.round(me.puffT) + ' s', fruit: f1 ? f1.name : 'a long banana', emoji: f1 ? f1.emoji : '' }; }
      var f2 = fr.find(function (f) { return f.stat === X.stat; }); return { stat: X.stat, word: X.word, where: X.name, fruit: f2 ? f2.name : 'fruit', emoji: f2 ? f2.emoji : '', loss: +worst.toFixed(3) };
    }
    function result() {
      var lt = Lt(), S = lt.S, r = R.result; if (!r) return; var el = panelEl(); R.panel = 'result'; S.talking = true; R.held = true;
      var cup = CUPS.find(function (q) { return q.id === r.cup; }), a = r.advice, win = r.place === 1;
      var head = win ? (r.first ? 'You won the ' + cup.name + '!' : 'A win! The ' + cup.name + ' again') : ord(r.place) + ' place';
      var tip = win ? 'Every fruit at Thimble\'s Market makes one strength grow: ' + a.emoji + ' ' + a.fruit + ' for ' + a.word + ' (\u{1FA99} 3) would help most on ' + a.where + '.' :
        (a.stat === 'sta' ? 'Your chick ' + a.where + '. ' : 'Your chick lost the most time on ' + a.where + '. ') + 'A ' + (a.emoji ? a.emoji + ' ' : '') + a.fruit.replace(/^an? /, '') + ' at Thimble\'s Market (' + a.word + ' +16, \u{1FA99} 3) would help. Then race again!';
      var h = '<div class="place">' + head + '</div><div class="pay">\u{1FA99} +' + r.pay + ' · you have ' + r.coins + '</div><table>';
      var best = STRETCH.map(function (x, i) { return Math.min.apply(null, r.rivals.map(function (q) { return q.splits[i]; })); });
      STRETCH.forEach(function (x, i) { h += '<tr class="' + (x.stat === a.stat && !win ? 'lost' : '') + '"><td>' + x.name.replace(/^./, function (c) { return c.toUpperCase(); }) + ' · ' + x.word + '</td><td class="n">' + r.me[i].toFixed(1) + ' s</td><td class="n" style="color:#8a6a46">best ' + best[i].toFixed(1) + ' s</td></tr>'; });
      h += '<tr><td><b>Time</b></td><td class="n"><b>' + r.time.toFixed(1) + ' s</b></td><td class="n" style="color:#8a6a46">' + (r.puffs ? 'puffed ' + r.puffs + '×' : 'never puffed') + '</td></tr></table><div class="tip">' + tip + '</div>';
      h += '<button type="button" class="go2" data-again="1">Race again</button><button type="button" class="close" data-close="1">Done</button>'; el.innerHTML = h;
    }
    function abort() { if (!R.on || !cine) return; var sc = cine.current(); R.aborting = true; if (sc && sc.name === 'race782') cine.end('abort'); R.aborting = false; }
    function fromHaven() { if (!o.leaveHaven) return false; return o.leaveHaven({ x: W(at(K.CH_S, K.CH_L).x, at(K.CH_S, K.CH_L).z).x, z: W(at(K.CH_S, K.CH_L).x, at(K.CH_S, K.CH_L).z).z, yaw: faceIn(), title: 'The Race', then: function () { var lt = Lt(); if (lt.chick() && lt.S.nestDone) openPanel(); } }); }
    var api = {
      root: root, tick: tick, mown: mown, button: button, press: press, fromHaven: fromHaven, openPanel: openPanel, closePanel: closePanel, start: start, abort: abort,
      on: function () { return R.on; }, holds: function () { return !!(R.on || R.held); }, near: function () { return R.near; },
      fast: function (k) { R.fast = Math.max(1, +k || 1); return R.fast; },
      cheer: function () { if (!R.on || R.ph !== 'run' || !me) return false; return cheer(me, me.cre); },
      course: function () { var w = W(0, 0), ws = W(R.signAt.x, R.signAt.z), pts = []; for (var s = 0; s < L; s += 2) { var q = at(s); var p = W(q.x, q.z); pts.push([+p.x.toFixed(2), +p.z.toFixed(2)]); } return { L: +L.toFixed(2), bounds: Bd.map(function (b) { return +b.toFixed(2); }), center: [w.x, w.z], sign: [ws.x, ws.z], pond: { y: pond.y, ra: pond.ra, rb: pond.rb }, bank: { y: bank.y, len: bank.len }, steps: STEPS.map(function (q) { return +q.top.toFixed(2); }), pts: pts, visible: root.visible, cheer: (function () { var c = at(K.CH_S, K.CH_L), wc = W(c.x, c.z); return [wc.x, wc.z]; })() }; },
      peek: function () { return { on: R.on, ph: R.ph, cup: R.cup && R.cup.id, runs: R.runs, panel: R.panel, held: R.held, near: R.near, fast: R.fast, me: me ? { s: +me.s.toFixed(2), E: +me.E.toFixed(1), puff: me.puff, puffs: me.puffs, cheers: me.cheers, done: me.done, k: me.k, fin: me.fin } : null, rivals: rv.map(function (r) { return { s: +r.s.toFixed(2), done: r.done, fin: r.fin, puff: r.puff }; }), result: R.result, last: R.last, aborts: R.aborts, ignored: R.cheersIgnored, cam: R.cam || null, state: (function () { try { return JSON.parse(JSON.stringify(state())); } catch (e) { return null; } })(), hud: !!document.getElementById('race782h'), panelEl: !!document.getElementById('race782p'), error: API.error }; }
    };
    API.inst = api; return api;
  }
  API.create = create; API.sim = sim; API.mult = mult; API.drainK = drainK; API.cheerE = cheerE; API.CUPS = CUPS; API.STRETCH = STRETCH; API.RIVALS = RIVALS; API.PAY = PAY; API.LINES = LINES; API.K = K;
  return API;
})();
