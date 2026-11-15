/* doctor766.js - BOARD 766, THE DOCTOR BIRD RACE IN JAMAICA (Wings for Rouge). Su, Nov 14 2026. Every word, number and colour a DRAFT for his pen and her thumb.
   Marth, Nov 8 2026, verbatim: "for the first free 3 times untill u go to jamaica and beat the speedy bird". His pick: build the race; beating it teaches
   fast forward for good. LOOP_MAP_829 link 5 (COO, replayed): "A race like the Hawk's at Dunn's River that teaches fast forward for good, and pays her
   first upgrade token." And of the Hawk's race (Nov 14): "better than most other mini games and boss battles so far", so this is THAT race, borrowed:
   after786.js's rules (the countdown's words, a pace that is a share of her own cruise, the pay table's first tier, the losing pay, the ask card's look),
   birds.js's rig (WFR_BIRDS.build, the long-billed shape with OUR palette and two tail streamers). No new race engine.

   WHAT ROUGE SEES. Jamaica's national bird, the red-billed streamertail (the Doctor Bird): emerald body, black cap, red bill, two long black streamers.
   He hovers over the beach at the foot of Dunn's River Falls. The first time she flies up to him, a small framed scene (cine.js: the bars, a low shot
   pushing in on him with the falls behind, his name card), then his words, then the ask card. Yes: the title card, 3-2-1-Go, and he is off: UP THE
   FALLS (the falls' top is a gate she must pass), out over the beach and ALONG THE COAST to Dolphin Cove. First there wins. Win: he teaches her the
   fast flight: S.ff.taught = true (the ⏩ button's pips go; "A bird out there can teach it" gets its answer), her first upgrade token (S.up829, kept for
   829's link 1 to spend), and the Hawk's first-tier pay. Lose: the Hawk's losing pay, and he flies home to the falls: come back and try again.
   The fast-forward toast after the 3rd free use now names him and the place, so the loop sends her there (the page's ff757End).

   THE COST LAW: his whole body (rig, streamers) is made at load and joins the scene hidden, on the travel layer, BEFORE play; nothing joins the scene
   later; its materials are the rig's own MeshStandardMaterial (the same program as every bird of the game's), so nothing compiles when he first shows.
   THE PAGE HANDS IT (create, at the end of the script): see the o.* names below. Standard only: Classic is frozen (create refuses). */
window.WFR_DOC766 = (function () {
  'use strict';
  var API = { error: '' };
  var K = { MEET: 55, MEET_UP: 30, AWAY: 160, SHOW: 1600, COUNT: 3, PACE: 0.96, GATE_R: 40, GATE_UP: 80, FIN_R: 45, FIN_UP: 70, LOSE_WAIT: 25, HOME_K: 1.6,
    SCALE: 0.5, HOVER: 2.0, STREAM: [3, 0.8], PITCH: -0.75, SCENE: 4.2, SKIP: 1.2, SEG: 14 };
  /* the course, lat/lon (OSM, as place-dunns797.js reads them): his perch over the beach at the falls' foot, up the falls' line to its top (the gate),
     back out over the beach, then along the coast east to Dolphin Cove's piers (the finish). up = metres over the ground under it (the sea is 0) */
  var COURSE = [
    { id: 'start', lat: 18.41831, lon: -77.13908, up: 2.4 },
    { id: 'falls', lat: 18.41752, lon: -77.13948, up: 9 },
    { id: 'top', lat: 18.41676, lon: -77.13992, up: 12, gate: 1 },
    { id: 'out', lat: 18.41895, lon: -77.13840, up: 20 },
    { id: 'coast', lat: 18.41930, lon: -77.13500, up: 16 },
    { id: 'cove0', lat: 18.41870, lon: -77.13250, up: 12 },
    { id: 'cove', lat: 18.41775, lon: -77.13100, up: 8, fin: 1 }];
  /* the streamertail, OUR design, on birds.js's own builder: a hummingbird's shape added to its species table at load (WFR_BIRDS.SPEC is the table
     build() reads: nothing in birds.js changes): a slim body, a small head with a black cap and crest, a LONG straight thin red bill darkening to its
     tip (the spec's own 'tip'), narrow pointed wings, a short tail; half her size; a little sheen (roughness and metalness: the same program as every
     bird). Two long black streamers, three links each, ripple behind him (well over his body's length). */
  var SHAPE = 'doctor766', PAL = { body: 0x1fc95a, wing: 0x176b3b, head: 0x0b0f0c, beak: 0xe0262c, legs: 0x141414, legLen: 0.16, size: 0.3 };
  var SPEC766 = { body: [0.46, 0.5, 0.95], head: 0.25, headAt: [0, 0.28, 0.86],
    beak: { len: 1.2, rad: 0.055, hook: 0, squash: 1, tip: true }, eye: 'song',
    wing: { arm: 0.62, hand: 0.42, prim: 1.0, sec: 0.42, n: 6, aOut: 0.25, aIn: 1.05, w: 0.2, shape: 'point' },
    tail: { len: 0.55, n: 5, spread: 0.12, w: 0.14 }, crest: 0.55, rough: 0.34, metal: 0.28 };
  var W = {   /* DRAFT, for his pen */
    name: 'Doctor Bird', role: 'Dunn\'s River Falls, Jamaica',
    meet: [['Doctor Bird', 'Bzzt! A bird from over the sea? I am the Doctor Bird. Nobody in Jamaica flies faster than me.'],
      ['Doctor Bird', 'You have been borrowing the fast flight, eh? Three goes, and then it is gone.'],
      ['Doctor Bird', 'Race me. Up the falls, then along the coast to Dolphin Cove. Beat me, and I will teach it to you for good.']],
    again: [['Doctor Bird', 'Back for another go? Up the falls, then Dolphin Cove.']],
    fun: [['Doctor Bird', 'The fast one is back! One more, for fun? Up the falls, then Dolphin Cove.']],
    q: 'Race the Doctor Bird to Dolphin Cove?', yes: 'Race him', no: 'Not now', noSay: 'He hums. "I will be right here."',
    title: ['The Doctor Bird\'s race', 'Dunn\'s River to Dolphin Cove', 'Up the falls first, then along the coast · get there first'],
    gate: 'The top of the falls! Now along the coast to Dolphin Cove.', gateFirst: 'Up the falls first! The top of the falls, then here.',
    first: 'First to Dolphin Cove! The Doctor Bird is still coming.',
    winFirst: [['Doctor Bird', 'Well! You beat me, fair and square.'], ['Doctor Bird', 'Here is the trick: tuck your wings, lean into the wind, and let it carry you. The fast flight is yours now, for good.']],
    winAgain: [['Doctor Bird', 'Beaten again! You really are the fast one.']],
    taught: '⏩ Fast forward is yours for good · and your first upgrade token', paid: 'You beat the Doctor Bird again',
    lose: [['Doctor Bird', 'Too slow! Come back to the falls when you want another go.']],
    farToast: 'The Doctor Bird got to Dolphin Cove first. He is back at the falls when you want another go.',
    hud: function (gate, m) { return gate ? 'Doctor Bird race · to Dolphin Cove · ' + m + ' m' : 'Doctor Bird race · up the falls · ' + m + ' m'; } };
  /* THE RULES (pure): the Hawk's own where they exist (after786.js), these numbers where they do not */
  var A786 = function () { return typeof window !== 'undefined' && window.WFR_AFTER786 ? window.WFR_AFTER786 : null; };
  function paceOf(cruise) { var A = A786(), k = A && A.TIERS && A.TIERS[0] ? A.TIERS[0].k : K.PACE; return k * cruise; }   /* the Hawk's first tier: his pace is that share of her own cruise */
  function payOf(first) { var A = A786(); if (A && A.payOf) return A.payOf(0, first); return first ? { coins: 10, runes: 12, xp: 60 } : { coins: 4, runes: 4, xp: 25 }; }
  function losePay() { var A = A786(); return A && A.LOSE ? A.LOSE : { coins: 1, xp: 10 }; }
  function count() { var A = A786(); return A && A.W && A.W.count ? A.W.count : ['3', '2', '1', 'Go!']; }
  function rec(S) { S.seen = S.seen || {}; var r = S.seen.doctor766; if (!r || typeof r !== 'object') r = S.seen.doctor766 = { met: 0, tries: 0, won: 0, lost: 0 }; return r; }
  function teach(S, ff) {   /* the win's lesson and token: once each; an old file keeps all it had */
    var first = !(rec(S).won > 0); if (ff) ff.taught = true;
    if (first) { var u = S.up829 && typeof S.up829 === 'object' ? S.up829 : (S.up829 = {}); u.tokens = (u.tokens || 0) + 1; u.from = Array.isArray(u.from) ? u.from : []; if (u.from.indexOf('doctor766') < 0) u.from.push('doctor766'); }
    return first; }
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

  function create(o) {
    var THREE = o.THREE, S = o.S, A = { ph: null, cool: false, t: 0, s: 0, L: 0, path: null, f: null, gate: false, myT: 0, cn: -1, said: 0, scenes: 0, asks: 0, races: 0, wins: 0, loses: 0, res: null, err: '', hz: 0, firstGate: 0 };
    var rig = null, g = null, streams = [], V = new THREE.Vector3(), V2 = new THREE.Vector3();
    /* ---------- his body, made now (load), joined hidden ---------- */
    try {
      if (o.birds.SPEC && !o.birds.SPEC[SHAPE]) o.birds.SPEC[SHAPE] = SPEC766;
      rig = o.birds.build(THREE, SHAPE, PAL, { renderer: o.renderer }); g = rig.g; g.name = 'doctor766'; g.visible = false; g.rotation.order = 'YXZ';
      var tm = null; g.traverse(function (m) { if (!tm && m.isMesh && m.material && m.material.isMeshStandardMaterial) tm = m.material; });
      if (rig.tail && tm) { var n = K.STREAM[0], seg = K.STREAM[1], sg = new THREE.BoxGeometry(0.135, 0.012, seg);   /* ribbons, not hairlines, at her usual distance */ sg.translate(0, 0, -seg / 2); var smat = tm.clone(); smat.map = tm.map; smat.color.setHex(0x0d0d0d); if (o.linear) smat.color.convertSRGBToLinear();
        for (var i = 0; i < 2; i++) { var par = rig.tail, links = []; for (var j = 0; j < n; j++) { var st = new THREE.Mesh(sg, smat); st.name = 'doctor766:streamer'; if (j) st.position.set(0, 0, -seg); else { st.position.set(i ? 0.07 : -0.07, -0.02, -0.3); st.rotation.y = i ? 0.05 : -0.05; } par.add(st); links.push(st); par = st; } streams.push(links); } }
      g.traverse(function (m) { m.layers.set(o.L); if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
      o.holder.add(g);
      /* 828 follow-up (the cost law): the streamers' material is a clone of the rig's on a plain mesh, its own program (a MeshStandardMaterial no other
         bird draws with); it compiled the first time he showed, 12 km out. Now one invisible keeper of it is drawn a few frames at load (on the island's
         layer and the travel layer), then taken out: the program stays, so nothing compiles when he shows */
      if (streams.length && o.renderer) { var wk = new THREE.Mesh(sg, streams[0][0].material), nf = 0, w0 = performance.now(); wk.name = 'doctor766:warm'; wk.frustumCulled = false; wk.position.set(0, -900, 0); wk.layers.enable(o.L);
        wk.onAfterRender = function () { nf++; }; o.holder.add(wk); A.warm = { frames: 0, done: false };
        (function chk() { A.warm.frames = nf; if (nf >= 3 || performance.now() - w0 > 20000) { o.holder.remove(wk); A.warm.done = true; } else requestAnimationFrame(chk); })(); }
    } catch (e) { A.err = 'build: ' + (e && e.message); g = null; }
    /* ---------- the frame: the travel zone recentres every 10 km; our points are kept in the frame they were made in and carried over ---------- */
    function here(p, out) { var q = o.at(p.lat, p.lon); out = out || new THREE.Vector3(); out.set(q.x, 0, q.z); out.y = o.ground(q.x, q.z) + p.up; return out; }
    function carry() { var f = o.frame(); if (!A.path || A.f === f || !f) return; var f0 = A.f; A.path.concat([A.gatePt, A.finPt]).forEach(function (p) { if (!p) return; var ll = o.toLL(f0, p.x, p.z), q = o.at(ll.lat, ll.lon); p.x = q.x; p.z = q.z; }); A.f = f; }
    function perch(out) { return here(COURSE[0], out); }
    function built() {   /* Catmull-Rom through the course, K.SEG samples a leg, each sample at least its up over the ground */
      var C = COURSE.map(function (p) { return here(p); }), pts = [], L = 0, prev = null;
      for (var i = 0; i < C.length - 1; i++) { var p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(C.length - 1, i + 2)], u0 = COURSE[i].up, u1 = COURSE[i + 1].up;
        for (var j = i ? 1 : 0; j <= K.SEG; j++) { var t = j / K.SEG, t2 = t * t, t3 = t2 * t, q = new THREE.Vector3();
          q.x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
          q.z = 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
          q.y = Math.max(o.ground(q.x, q.z) + u0 + (u1 - u0) * t, p1.y + (p2.y - p1.y) * t);
          if (prev) L += q.distanceTo(prev); q.d = L; pts.push(q); prev = q; } }
      return { pts: pts, L: L, gate: C[2], fin: C[C.length - 1] }; }
    function at(s) { var P = A.path, i = 1; while (i < P.length - 1 && P[i].d < s) i++; var a = P[i - 1], b = P[i], f = b.d > a.d ? (s - a.d) / (b.d - a.d) : 1; f = Math.max(0, Math.min(1, f)); V.copy(a).lerp(b, f); V2.copy(b).sub(a); return V; }
    function near(P, R, up) { var dy = S.pos.y - P.y; return Math.hypot(S.pos.x - P.x, S.pos.z - P.z) < R && dy > -12 && dy < up; }
    /* ---------- his wings: a hummingbird's blur hovering, a strong beat racing ---------- */
    var hzT = 0;
    function wings(dt, fast) {   /* hovering: body tipped up, the wings sweeping fore and aft in a figure eight too fast to follow (a jitter on each beat reads as the blur); racing: level, a hard beat */
      if (!rig) return; hzT += dt; var f = fast ? 42 : 66, j = 0.82 + Math.random() * 0.36;
      [rig.wingL, rig.wingR].forEach(function (wg, i) { if (!wg) return; var s = i ? -1 : 1;
        if (fast) { wg.rotation.z = s * Math.sin(hzT * f) * 0.9 * j; wg.rotation.y = s * 0.2; }
        else { wg.rotation.y = s * (-0.15 + Math.sin(hzT * f) * 0.95 * j); wg.rotation.z = s * (0.2 + 0.18 * Math.sin(hzT * f * 2)); } });
      streams.forEach(function (links, i) { links.forEach(function (st, k) { var ph = hzT * (fast ? 9 : 4.5) - k * 1.1 + i * 0.6, a = (fast ? 0.1 : 0.2) * (k + 1) / links.length;
        st.rotation.x = (k ? 0 : (fast ? 0.05 : 0.55)) + Math.sin(ph) * a; st.rotation.y = (k ? 0 : (i ? 0.05 : -0.05)) + Math.sin(ph * 0.7 + 1.3) * a * 0.6; }); });   /* hovering, the streamers hang below the tipped-up body and ripple */
      if (g) g.rotation.x = fast ? 0.05 : K.PITCH; A.hz = f; }
    function show(on) { if (g && g.visible !== on) g.visible = on; }
    function place(P, face, dt, fast) { if (!g) return; g.position.copy(P); if (face) g.rotation.y = Math.atan2(face.x, face.z); var k = (o.herScale ? o.herScale() : 1) * K.SCALE; if (Math.abs(g.scale.x - k) > 1e-3) g.scale.setScalar(k); wings(dt, fast); }
    /* ---------- the meeting: the framed scene, his words, the ask ---------- */
    function meet() {
      var r = rec(S); A.ph = 'scene'; A.asks++;
      var lines = !r.met ? W.meet : r.won ? W.fun : W.again; r.met = (r.met || 0) + 1;
      var talk = function () { if (A.ph !== 'scene') return; A.ph = 'talk'; o.say(lines, function () { if (A.ph !== 'talk') return; A.ph = 'ask'; card(true); S.talking = true; }); };
      if (r.met > 1 || !o.cine) { talk(); return; }
      var P0 = perch(), B0 = S.pos.clone(), side = new THREE.Vector3(B0.z - P0.z, 0, -(B0.x - P0.x)).normalize();
      var ok = o.cine.play({ name: 'doctor766', dur: K.SCENE, skip: K.SKIP, freeze: true, bars: true,
        start: function () { A.scenes++; try { o.cine.nameCard(W.name, W.role, 3600); } catch (e) { /* the card is a nicety */ } },
        shot: function (t, u, Pp, L) {   /* three-quarter from his side (he faces her), close and low, pushing in: the bill, the cap and the streamers in one frame. The travel camera's near plane is 1 m */
          var P = perch(), k = sm(t / K.SCENE), d = 4.6 - 1.0 * k, dir = new THREE.Vector3(B0.x - P.x, 0, B0.z - P.z).normalize(), a = 1.15 - 0.15 * k, c = Math.cos(a), sn = Math.sin(a), s = (o.herScale ? o.herScale() : 1) * K.SCALE;
          var vx = dir.x * c + side.x * sn, vz = dir.z * c + side.z * sn; Pp.set(P.x + vx * d, P.y + 0.15 + 0.25 * (1 - k), P.z + vz * d); Pp.y = Math.max(Pp.y, o.ground(Pp.x, Pp.z) + 0.4);
          L.set(P.x - dir.x * 0.6 * s, P.y - 0.35 * s, P.z - dir.z * 0.6 * s); return 34 - 4 * k; },
        end: function () { talk(); } });
      if (!ok) talk();
    }
    function css() {
      if (document.getElementById('doc766css')) return; var s = document.createElement('style'); s.id = 'doc766css';   /* the Hawk's ask card's look (after786.js #hawk786), its own id */
      s.textContent = '#doc766{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 14px);width:min(440px,calc(100vw - 24px));box-sizing:border-box;z-index:44;background:#fff8ea;color:#3b2a1a;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.35);padding:12px 14px;display:flex;flex-wrap:wrap;gap:10px}' +
        '#doc766 .q{flex:1 0 100%;margin:0;text-align:center;font:600 17px/1.3 Georgia,serif}#doc766 button{flex:1;min-height:48px;border-radius:14px;border:0;background:#1f9d4f;color:#fff;font:800 15px var(--body,system-ui)}#doc766 button.no{background:#e9dcc4;color:#3b2a1a}';
      document.head.appendChild(s); }
    function card(on) {
      var el = document.getElementById('doc766'); if (!on) { if (el) el.remove(); return; } css();
      if (!el) { el = document.createElement('div'); el.id = 'doc766'; el.setAttribute('role', 'dialog'); el.innerHTML = '<p class="q"></p><button type="button" class="yes"></button><button type="button" class="no"></button>'; document.body.appendChild(el);
        el.addEventListener('pointerdown', function (e) { e.stopPropagation(); }, true);
        el.querySelector('.yes').addEventListener('click', function (e) { e.stopPropagation(); answer(true); });
        el.querySelector('.no').addEventListener('click', function (e) { e.stopPropagation(); answer(false); }); }
      el.querySelector('.q').textContent = W.q; el.querySelector('.yes').textContent = W.yes; el.querySelector('.no').textContent = W.no; }
    function answer(yes) { if (A.ph !== 'ask') return false; card(false); S.talking = false; if (S.mode === 'hover') S.mode = 'fly'; if (!yes) { A.ph = null; A.cool = true; o.toast(W.noSay, 2400); return true; } return go(); }
    /* ---------- the race ---------- */
    function go() {
      var c = built(); A.path = c.pts; A.L = c.L; A.f = o.frame(); A.gatePt = c.gate; A.finPt = c.fin; A.s = 0; A.t = 0; A.cn = -1; A.gate = false; A.myT = 0; A.firstGate = 0; A.res = null; A.ph = 'count'; A.races++;
      var r = rec(S); r.tries = (r.tries || 0) + 1; if (o.ffOff) o.ffOff();
      S.mode = 'hover'; S.yaw = Math.atan2(c.gate.x - S.pos.x, c.gate.z - S.pos.z); o.save();
      try { o.title(W.title[0], W.title[1], W.title[2], 'found'); } catch (e) { /* the card is a nicety */ }
      A.last = { L: +c.L.toFixed(1), v: +paceOf(o.cruise()).toFixed(2), n: c.pts.length }; return true; }
    function run(dt, real) {
      carry(); var v = paceOf(o.cruise()), P;
      if (A.ph === 'count') { A.t += real; var n = Math.min(3, Math.floor(A.t)); if (n !== A.cn) { A.cn = n; o.toast(count()[n], n === 3 ? 900 : 800); } P = A.path[0]; place(P, V2.set(A.gatePt.x - P.x, 0, A.gatePt.z - P.z), real, false);
        if (A.t >= K.COUNT) { A.ph = 'run'; A.t = 0; if (S.mode === 'hover') S.mode = 'fly'; } return; }
      A.myT += dt;
      if (A.ph === 'run' || A.ph === 'after') { A.s = Math.min(A.L, A.s + v * dt); P = at(A.s); place(P, V2, dt, true); }
      if (!A.gate && near(A.gatePt, K.GATE_R, K.GATE_UP)) { A.gate = true; o.toast(W.gate, 2400); }
      var fin = near(A.finPt, K.FIN_R, K.FIN_UP);
      if (fin && !A.gate && !A.firstGate) { A.firstGate = 1; o.toast(W.gateFirst, 2600); }
      if (A.ph === 'run') { if (fin && A.gate) { A.ph = 'after'; A.t = 0; A.mine = +A.myT.toFixed(1); A.hisAt = +A.s.toFixed(1); o.toast(W.first, 2600); return; }
        if (A.s >= A.L) { A.ph = 'wait'; A.t = 0; } return; }
      if (A.ph === 'after') { A.t += dt; if (A.s >= A.L || A.t > 8) finish(true); return; }
      if (A.ph === 'wait') { A.t += dt; P = A.path[A.path.length - 1]; place(P, V2.set(S.pos.x - P.x, 0, S.pos.z - P.z), dt, false); if (fin && A.gate) finish(false); else if (A.t > K.LOSE_WAIT) finish(false, true); }
    }
    function finish(won, far) {
      var r = rec(S); A.ph = 'home'; A.t = 0;
      if (won) { A.wins++; var first = teach(S, o.ff()), pay = payOf(first); r.won = (r.won || 0) + 1; S.runes = (S.runes || 0) + pay.runes; o.save(); if (o.ffDraw) o.ffDraw();
        A.res = { won: true, first: first, me: A.mine, hisAt: A.hisAt, L: +A.L.toFixed(1), pay: pay };
        o.say(first ? W.winFirst : W.winAgain, function () { o.coin(pay.coins, 'the Doctor Bird\'s race', S.pos); o.xp(pay.xp, 'the Doctor Bird\'s race'); o.toast(first ? W.taught : W.paid, 4200); o.hud(); o.save(); }); }
      else { A.loses++; r.lost = (r.lost || 0) + 1; o.save(); A.res = { won: false, me: +A.myT.toFixed(1), L: +A.L.toFixed(1), far: !!far };
        var lp = losePay(), paid = function () { o.coin(lp.coins, 'the Doctor Bird\'s race', S.pos); o.xp(lp.xp, 'the Doctor Bird\'s race'); o.hud(); };
        if (far) { o.toast(W.farToast, 4200); paid(); } else o.say(W.lose, paid); }
    }
    function home(dt) {   /* he flies back along the course to the falls, a little faster than he raced */
      carry(); A.s = Math.max(0, A.s - paceOf(o.cruise()) * K.HOME_K * dt); var P = at(A.s); place(P, V2.multiplyScalar(-1), dt, true);
      if (A.s <= 0) { A.ph = null; A.cool = true; A.path = null; } }
    /* ---------- the frame ---------- */
    function tick(dt, real) {
      try {
        if (!g) return; if (!o.on()) { show(false); if (A.ph && A.ph !== 'home') { card(false); A.ph = null; } return; }
        var P = perch(), d = Math.hypot(S.pos.x - P.x, S.pos.z - P.z);
        if (A.ph === 'count' || A.ph === 'run' || A.ph === 'after' || A.ph === 'wait') { show(true); run(dt, real); return; }
        if (A.ph === 'home') { show(true); home(dt); return; }
        if (A.ph === 'ask' && !document.getElementById('doc766')) A.ph = null;
        if (d > K.SHOW) { show(false); if (A.cool && d > K.AWAY) A.cool = false; return; }
        show(true); P.y += Math.sin((S.t || 0) * 2.1) * 0.12; place(P, V2.set(S.pos.x - P.x, 0, S.pos.z - P.z), real || dt, false);
        if (A.cool && d > K.AWAY) A.cool = false;
        if (!A.ph && !A.cool && d < K.MEET && S.pos.y - P.y < K.MEET_UP && S.mode === 'fly' && !o.busy()) meet();
      } catch (e) { A.err = String(e && e.message || e); }
    }
    function racing() { return A.ph === 'count' || A.ph === 'run' || A.ph === 'wait'; }
    function pill() { if (!racing() || !A.path) return ''; var T = A.gate ? A.finPt : A.gatePt; return W.hud(A.gate, Math.round(Math.hypot(S.pos.x - T.x, S.pos.z - T.z))); }
    function goal() { if (!racing() || !A.path) return null; return A.gate ? A.finPt : A.gatePt; }
    function peek() { var P = g ? g.position : null; return { ph: A.ph, cool: A.cool, s: +A.s.toFixed(1), L: +A.L.toFixed(1), v: o.cruise ? +paceOf(o.cruise()).toFixed(2) : null, gate: A.gate, myT: +A.myT.toFixed(2), scenes: A.scenes, asks: A.asks, races: A.races, wins: A.wins, loses: A.loses, res: A.res, last: A.last || null, err: A.err || API.error,
      built: !!g, visible: !!(g && g.visible), inScene: !!(g && g.parent), at: P ? [+P.x.toFixed(1), +P.y.toFixed(1), +P.z.toFixed(1)] : null, perch: (function () { try { var q = perch(); return [+q.x.toFixed(1), +q.y.toFixed(1), +q.z.toFixed(1)]; } catch (e) { return null; } })(),
      gatePt: A.gatePt ? [+A.gatePt.x.toFixed(1), +A.gatePt.y.toFixed(1), +A.gatePt.z.toFixed(1)] : null, finPt: A.finPt ? [+A.finPt.x.toFixed(1), +A.finPt.y.toFixed(1), +A.finPt.z.toFixed(1)] : null, hz: A.hz, streamers: streams.length, rec: JSON.parse(JSON.stringify(rec(S))), card: !!document.getElementById('doc766') }; }
    return { tick: tick, racing: racing, busy: function () { return !!A.ph && A.ph !== 'home'; }, pill: pill, goal: goal, answer: answer, peek: peek, group: function () { return g; },
      course: function () { var c = built(); return { L: +c.L.toFixed(1), gate: [c.gate.x, c.gate.y, c.gate.z], fin: [c.fin.x, c.fin.y, c.fin.z], pts: c.pts.map(function (p) { return [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]; }) }; } };
  }
  API.create = function (o) { if (o.classic && o.classic()) { API.error = 'classic'; return null; } try { return create(o); } catch (e) { API.error = String(e && e.message || e); return null; } };
  API.K = K; API.COURSE = COURSE; API.PAL = PAL; API.SHAPE = SHAPE; API.SPEC = SPEC766; API.W = W; API.paceOf = paceOf; API.payOf = payOf; API.teach = teach; API.rec = rec;
  return API;
})();
