/* school782.js - BOARD 781 (plan 781 units 7 and 8) under the review's "looping integration" (board 782), THE SCHOOL AND THE RING (Wings for Rouge). Ship #132, Nov 13 2026.
   Marth, Nov 12 2026, verbatim: "the chic aspect is entirely derived from snoic adventure dx ... where the chao shop is upgraded, theres a school for the chics,
   they can fight or race etc. stuff like that i want implemented"; his pick for the gentle fight: "puff push and vine tug of war" (BOTH); his place: the Haven;
   Nov 13: "These are due and looping integration"; and "dont rush the ships" / "make a nice build". Study, never copy: our names, our shapes, our words.

   THE LOOP: the games pay coins -> Thimble's Market (fruit) and the School (lessons) -> the chick's strengths -> it wins more races and bouts.
   WHAT IS HERE.
   THE SCHOOL   (the Haven's shelter, its slate and three stools) three teachers of our own: Miss Linnet (songs), Mister Bobbin (dances), Old Smudge (drawings).
                Drop the chick off (a few coins); it sits on the middle stool and learns over a stretch of play (it is away: not with her, not in the world
                outside the Haven); then she picks it up: the LEARNED moment on cine.js (bars, a low push in, the trick shown, the card, our 'get' phrase),
                its strengths grow (a song: Creativity, which the Race's cheer and the Ring's taps use) and the trick joins its idle life (LIFE741: it
                sings, dances or draws on its own now and then). A check-up desk: its six strengths as stars (our scale: 5 stars at the top, a square root).
   THE RING     PUFF PUSH on a mossy stump in the ring: two chicks bump bellies. Strength pushes; Stamina is its puff (when hers runs out it sits and pants
                until she taps to cheer; Creativity sets how much a cheer gives back); Swim is balance at the edge; Run is a sidestep. A win: the other bumped
                off onto a pile of leaves, or more puff left at 60 s. VINE TUG-OF-WAR beside it: two chicks pull a vine across a line; Strength and Stamina
                decide it, her taps on the beat heave (Creativity sets how much); the loser tumbles softly onto the leaves on the line. No hits, no damage
                numbers, no pain sounds: both bow at the end. The rivals are the Race's: Puddle, Sorrel, Burr (known faces), one after another.
   THE PRIZES   a first win pays coins and a small ribbon (held up with the item-get); a win after pays a little; a loss pays a coin and says what to train.
   THE RULES    pure (no THREE, no page): the same step() runs the bout on screen and in sim() (the guard's proof and the numbers).
   SAVED        S.chick.school782 = { learned: { song: n }, cur: { id, left, total, practice } | null, ready }, S.chick.ring782 = { won: { 'push:0': n }, bouts, paid }.
   Standard only (never built in Classic: frozen). Every word, name and number a DRAFT for his pen and her thumb. */
window.WFR_SCHOOL782 = (function () {
  'use strict';
  var API = { error: '' };
  var K = { LESSON: 180, PRACTICE: 90, PP_T: 60, TUG_T: 45, BEAT: 0.75, BEAT_WIN: 0.17, PUFF_END: 35, RECOVER: 24, WOB: 0.25, PUSH: 2.0, PULL: 1.0, SIT_PUSH: 0.6, SIT_PULL: 0.45, TAP_MIN: 0.1,
    INTRO: 4.4, R: 0.78, SH: 0.42, SC: 0.38, TSC: 0.55, GAP: 0.43 };
  /* the lessons: what each gives (DRAFT numbers), its teacher (our own), a first-time price and a practice price */
  var LESSONS = [
    { id: 'song', emoji: '\u{1F3B5}', kind: 'A song', title: '“Dew on the Clover”', teacher: 'Miss Linnet', role: 'teaches songs', col: 0xc98a6b, gives: { cre: 40 }, again: { cre: 16 }, line: 'It will sing it on its own now.' },
    { id: 'dance', emoji: '\u{1F483}', kind: 'A dance', title: '“The Leaf Twirl”', teacher: 'Mister Bobbin', role: 'teaches dances', col: 0x8f9aa6, gives: { run: 12, sta: 12, cre: 16 }, again: { run: 6, sta: 6 }, line: 'It will dance it on its own now.' },
    { id: 'draw', emoji: '\u{1F3A8}', kind: 'A drawing', title: '“A Big Round Sun”', teacher: 'Old Smudge', role: 'teaches drawing', col: 0x5f5866, gives: { cre: 30, sta: 10 }, again: { cre: 12 }, line: 'It will draw it on its own now.' }];
  var PRICE = { lesson: 5, practice: 3 };
  /* the rivals (the Race's three): their strengths here, gentle first */
  var RIVALS = [
    { name: 'Puddle', col: 0x8fd0f2, st: { str: 14, sta: 22, swim: 40, run: 12, cre: 0 }, word: 'steady at the edge' },
    { name: 'Sorrel', col: 0xf2a65a, st: { str: 34, sta: 30, swim: 12, run: 70, cre: 0 }, word: 'quick on its feet' },
    { name: 'Burr', col: 0xc9a06a, st: { str: 80, sta: 60, swim: 24, run: 16, cre: 0 }, word: 'the strongest of the three' }];
  var GAMES = {
    push: { id: 'push', name: 'Puff Push', emoji: '\u{1FAB5}', ribbons: ['the Moss Ribbon', 'the Fern Ribbon', 'the Oak Ribbon'], win: [5, 8, 12], again: 2, secs: K.PP_T },
    tug: { id: 'tug', name: 'Vine Tug', emoji: '\u{1F33F}', ribbons: ['the Vine Ribbon', 'the Ivy Ribbon', 'the Wisteria Ribbon'], win: [5, 8, 12], again: 2, secs: K.TUG_T } };
  var PAY = { lose: 1, draw: 1 };
  var LINES = {   /* DRAFT, for his pen */
    school: 'Lessons for chicks: songs, dances, drawings. Drop your chick off; it learns while you play.',
    ring: 'Gentle games. Nobody gets hurt: a belly bump on the mossy stump, a tug on the vine. Both bow at the end.',
    howPush: 'Bellies bump on the stump. Strength pushes, Stamina is puff, Swim keeps balance at the edge, Run sidesteps. When your chick puffs out, tap to cheer.',
    howTug: 'Pull the vine over the line. Strength and Stamina decide it; tap on the beat to heave. Creativity makes each heave bigger.',
    away: 'Your chick is at school right now. Pick it up at the School in Chick Haven.',
    ready: function (l) { return 'Your chick has learned ' + l.kind.toLowerCase() + '! Pick it up at the School in Chick Haven.'; },
    dropped: function (l, m) { return 'Your chick takes its seat. ' + l.teacher + ' will teach it ' + l.kind.toLowerCase() + '. Come back in about ' + m + ' minute' + (m > 1 ? 's' : '') + '.'; },
    poor: function (p, n) { return 'That lesson is ' + p + ' coins and you have ' + n + '. The Ring and the Race pay coins.'; },
    puff: 'Puffed out! Tap, tap, tap to cheer!', calm: 'Tap to cheer when it puffs', beat: 'Tap on the beat to heave!'
  };
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function cl(v) { return Math.max(0, Math.min(1000, +v || 0)); }
  /* THE RULES (pure). mult, drainK and cheerE are the Race's own curves (race782.js), so a strength means the same everywhere */
  function mult(v) { return 0.78 + 0.62 * Math.sqrt(cl(v) / 1000); }
  function drainK(sta) { return 3.0 * (1.3 - 0.8 * Math.sqrt(cl(sta) / 1000)); }
  function cheerE(cre) { return 6 + 14 * Math.sqrt(cl(cre) / 1000); }
  function bal(swim) { return 0.2 + 0.45 * Math.sqrt(cl(swim) / 1000); }   /* at its own edge, the share of a push it shrugs off: 0.2 at 0, 0.29 at 40, 0.65 at 1000 */
  function sideRate(run) { return 0.06 + 0.3 * Math.sqrt(cl(run) / 1000); }   /* sidesteps a second: one in 17 s at 0, one in 7 s at 70 */
  function heaveK(cre) { return 0.012 + 0.05 * Math.sqrt(cl(cre) / 1000); }   /* one heave on the beat: 0.012 of the way at 0, 0.022 at 40, 0.037 at 250 */
  function stars(v) { return Math.round(10 * 5 * Math.sqrt(cl(v) / 1000)) / 10; }   /* our scale: 5 stars at 1000; 16 -> 0.6, 100 -> 1.6, 250 -> 2.5 */
  function statsOf(a) { a = a || {}; return { str: cl(a.str), sta: cl(a.sta), swim: cl(a.swim), run: cl(a.run), cre: cl(a.cre), fly: cl(a.fly) }; }
  function rnd(seed) { var s = (seed * 2654435761) >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function fighter(st, r, mine) { return { st: statsOf(st), E: 100, puff: false, puffs: 0, sitT: 0, side: 0, sides: 0, cheers: 0, ph: r() * 6.283, ph2: r() * 6.283, f1: 1.4 + r() * 0.8, f2: 2.6 + r() * 0.9, form: 0.92 + r() * 0.16, mine: !!mine, tap: -9 }; }   /* form: a chick's day, a little better or worse */
  function wob(f, t) { return Math.sin(t * f.f1 + f.ph) * 0.6 + Math.sin(t * f.f2 + f.ph2) * 0.4; }
  function bout(game, me, rv, seed) { var r = rnd((seed || 0) + 7); return { game: game, me: fighter(me, r, true), rv: fighter(rv, r, false), x: 0, t: 0, done: false, win: null, how: null, lastBeat: -1, heaves: 0, misses: 0, ev: null, seed: seed || 0 }; }
  function breath(f, dt, rate) {   /* hers sits until she cheers; a rival gets its breath back by itself */
    if (f.puff) { f.sitT += dt; if (!f.mine) { f.E += dt * K.RECOVER; if (f.E >= K.PUFF_END) f.puff = false; } return; }
    f.E -= dt * drainK(f.st.sta) * rate; if (f.E <= 0) { f.E = 0; f.puff = true; f.puffs++; }
  }
  function left(f, dt) { f.Ek = f.Ek == null ? f.E : f.Ek + (f.E - f.Ek) * Math.min(1, dt / 6); }   /* 'puff left': its breath over the last few seconds (one breath's dip is not the whole story) */
  function end(B, win, how) { B.done = true; B.win = win; B.how = how; }
  function step(B, dt) {
    if (B.done) return; var a = B.me, b = B.rv; B.t += dt;
    if (B.game === 'push') {
      breath(a, dt, 1.5); breath(b, dt, 1.5); left(a, dt); left(b, dt);
      var fa = mult(a.st.str) * a.form * (a.puff ? K.SIT_PUSH : 1) * (1 + K.WOB * wob(a, B.t)), fb = mult(b.st.str) * b.form * (b.puff ? K.SIT_PUSH : 1) * (1 + K.WOB * wob(b, B.t)), net = (fa - fb) * K.PUSH;   /* +: toward the rival's edge */
      if (net > 0 && B.x > 0.45) net *= 1 - bal(b.st.swim) * (B.x - 0.45) / 0.55;   /* balance: at its own edge a chick shrugs off part of a push */
      if (net < 0 && B.x < -0.45) net *= 1 - bal(a.st.swim) * (-B.x - 0.45) / 0.55;
      B.x += net * dt; B.v = net;
      a.side = Math.min(1, a.side + dt * sideRate(a.st.run)); b.side = Math.min(1, b.side + dt * sideRate(b.st.run));
      if (B.x < -0.62 && net < 0 && a.side >= 1 && !a.puff) { B.x += 0.4; a.side = 0; a.sides++; B.ev = { k: 'side', who: 'me', t: B.t }; }   /* a sidestep: the pusher slides past */
      if (B.x > 0.62 && net > 0 && b.side >= 1 && !b.puff) { B.x -= 0.4; b.side = 0; b.sides++; B.ev = { k: 'side', who: 'rv', t: B.t }; }
      if (B.x >= 1) { B.x = 1; end(B, 'me', 'off'); } else if (B.x <= -1) { B.x = -1; end(B, 'rv', 'off'); }
      else if (B.t >= K.PP_T) { var d = a.Ek - b.Ek; end(B, Math.abs(d) < 0.5 ? (Math.abs(B.x) < 0.02 ? 'draw' : B.x > 0 ? 'me' : 'rv') : d > 0 ? 'me' : 'rv', 'time'); }
    } else {
      breath(a, dt, 1.3); breath(b, dt, 1.3);
      var pa = mult(a.st.str) * a.form * (a.puff ? K.SIT_PULL : 1) * (1 + K.WOB * wob(a, B.t)), pb = mult(b.st.str) * b.form * (b.puff ? K.SIT_PULL : 1) * (1 + K.WOB * wob(b, B.t)), v = (pa - pb) * K.PULL;   /* +: toward her */
      B.x += v * dt; B.v = v;
      if (B.x >= 1) { B.x = 1; end(B, 'me', 'over'); } else if (B.x <= -1) { B.x = -1; end(B, 'rv', 'over'); }
      else if (B.t >= K.TUG_T) end(B, Math.abs(B.x) < 0.03 ? 'draw' : B.x > 0 ? 'me' : 'rv', 'time');
    }
  }
  /* her tap: while her chick sits puffed, a cheer (breath back, by Creativity); in the tug, on the beat, a heave (by Creativity); else nothing (a heart) */
  function tap(B) {
    if (B.done) return 'done'; var a = B.me;
    if (a.puff) { a.E += cheerE(a.st.cre); a.cheers++; if (a.E >= K.PUFF_END) a.puff = false; return 'cheer'; }
    if (B.game !== 'tug') return 'calm';
    var k = Math.round(B.t / K.BEAT), off = Math.abs(B.t - k * K.BEAT);
    if (off <= K.BEAT_WIN && k !== B.lastBeat && k > 0) { B.lastBeat = k; B.x = Math.min(1, B.x + heaveK(a.st.cre)); B.heaves++; B.ev = { k: 'heave', t: B.t }; if (B.x >= 1) end(B, 'me', 'over'); return 'heave'; }
    B.misses++; return 'miss';
  }
  /* sim(game, me, rival, { seed, cheerEvery, beat }): the same step() as on screen (dt 1/30); cheerEvery: a tap so often while hers sits; beat: a tap on every beat */
  function sim(game, me, rv, o) {
    o = o || {}; var B = bout(game, me, rv, o.seed), dt = 1 / 30, next = 0;
    while (!B.done && B.t < 200) {
      step(B, dt);
      if (o.cheerEvery && B.me.puff && B.t >= next) { tap(B); next = B.t + o.cheerEvery; }
      if (game === 'tug' && o.beat && !B.me.puff) { var k = Math.round(B.t / K.BEAT); if (k !== B.lastBeat && Math.abs(B.t - k * K.BEAT) < dt * 0.6) tap(B); }
    }
    return { win: B.win, how: B.how, t: +B.t.toFixed(2), x: +B.x.toFixed(3), puffs: B.me.puffs, sitT: +B.me.sitT.toFixed(2), rvPuffs: B.rv.puffs, cheers: B.me.cheers, heaves: B.heaves, sides: [B.me.sides, B.rv.sides], E: [+B.me.E.toFixed(1), +B.rv.E.toFixed(1)] };
  }
  function rate(game, me, rv, n, o) { var w = 0, l = 0, d = 0; for (var i = 0; i < (n || 100); i++) { var r = sim(game, me, rv, Object.assign({}, o || {}, { seed: i + 1 })); if (r.win === 'me') w++; else if (r.win === 'rv') l++; else d++; } return { win: w / (n || 100), lose: l / (n || 100), draw: d / (n || 100) }; }

  function create(o) {
    var THREE = o.THREE, HV = o.haven, cine = o.cine, Lt = o.late, P = HV.P, Y = HV.y;
    var R = { panel: null, tab: 'lessons', bout: null, ph: null, fast: 1, hud: null, result: null, last: null, scenes: 0, learned: 0, drops: 0, bows: [0, 0], aborts: 0, ignored: 0, hearts: 0, readyT: 0, tricks: {}, trickShown: 0 };
    var root = new THREE.Group(); root.name = 'school782'; HV.root.add(root);
    var lam = function (c, x) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, x || {})); };
    function shade(m, cast) { m.traverse(function (q) { if (q.isMesh) { q.castShadow = !!cast; q.receiveShadow = true; } }); return m; }
    function W(x, y, z) { var w = HV.toW(x, z); return new THREE.Vector3(w.x, Y + (y || 0), w.z); }   /* the Haven's frame (metres from its middle, its floor at 0) to the world */
    /* THE SCHOOL'S FRAME: the shelter faces the garden's middle */
    var SX = P.school[0], SZ = P.school[1], face = Math.atan2(-SX, -SZ), fx = Math.sin(face), fz = Math.cos(face), lx = Math.cos(face), lz = -Math.sin(face);
    function sch(f, l) { return { x: SX + fx * f + lx * l, z: SZ + fz * f + lz * l }; }   /* f: toward the garden, l: to its side */
    var STOOL = sch(0.7, 0), FRONT = sch(2.05, 0), STOOL_Y = 0.32;
    /* the shared shapes of every small bird here (makeChick's, fewer parts) */
    var GEO = { body: new THREE.SphereGeometry(0.42, 14, 10), head: new THREE.SphereGeometry(0.29, 14, 10), beak: new THREE.ConeGeometry(0.08, 0.22, 8), eye: new THREE.SphereGeometry(0.06, 8, 6), wing: new THREE.SphereGeometry(0.2, 10, 8), tail: new THREE.ConeGeometry(0.12, 0.42, 6) }, MAT = { beak: lam(0xf28c28), eye: new THREE.MeshBasicMaterial({ color: 0x111111 }) };
    function birdMesh(col, sc, tail) {
      var g = new THREE.Group(), body = new THREE.Group(), m = lam(col); g.add(body);
      var b = new THREE.Mesh(GEO.body, m); b.scale.set(1, 0.95, 1.05); body.add(b); var h = new THREE.Mesh(GEO.head, m); h.position.set(0, 0.45, 0.14); body.add(h);
      var bk = new THREE.Mesh(GEO.beak, MAT.beak); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.42, 0.45); body.add(bk);
      [-1, 1].forEach(function (s) { var e = new THREE.Mesh(GEO.eye, MAT.eye); e.position.set(0.12 * s, 0.53, 0.38); body.add(e); });
      var wings = [-1, 1].map(function (s) { var piv = new THREE.Group(); piv.position.set(0.38 * s, 0.05, 0); var w = new THREE.Mesh(GEO.wing, m); w.scale.set(0.5, 1, 1.3); w.position.x = 0.06 * s; piv.add(w); body.add(piv); return piv; });
      if (tail) { var tl = new THREE.Mesh(GEO.tail, m); tl.rotation.x = -Math.PI / 2 - 0.5; tl.position.set(0, 0.05, -0.5); body.add(tl); body.userData.tail = tl; }
      body.scale.setScalar(sc); shade(g, true); return { g: g, body: body, wings: wings, sc: sc, mat: m };
    }
    function place(m, x, y, z, yaw) { m.g.position.set(x, y + 0.4, z); m.g.rotation.y = yaw || 0; m.body.position.y = -0.4 * (1 - m.sc); }   /* feet on y (haven frame) */
    function face1(text, w, h, op) {   /* a painted board face (the Race's, borrowed in shape) */
      op = op || {}; var cv = document.createElement('canvas'), Wd = 512, Hd = Math.round(512 * h / w); cv.width = Wd; cv.height = Hd; var g = cv.getContext('2d');
      g.fillStyle = op.bg || '#7a5432'; g.fillRect(0, 0, Wd, Hd); g.strokeStyle = 'rgba(40,24,10,.6)'; g.lineWidth = 10; g.strokeRect(5, 5, Wd - 10, Hd - 10);
      g.fillStyle = op.ink || '#fff3d6'; g.textAlign = 'center'; g.textBaseline = 'middle'; var fs = Math.min(Hd / 1.6, op.size || 100); g.font = '600 ' + fs + 'px Georgia, "Times New Roman", serif'; g.fillText(String(text), Wd / 2, Hd / 2, Wd - 30);
      var tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tx }));
    }
    function board(text, w, h, op) { var g = new THREE.Group(), f = face1(text, w, h, op), b = face1(text, w, h, op); b.rotation.y = Math.PI; g.add(f); g.add(b); g.userData.faces = [text, text]; return g; }
    /* THE TEACHERS: three of our own, before the slate */
    var TEACH = LESSONS.map(function (l, i) { var m = birdMesh(l.col, K.TSC, true), q = sch(0.12, (i - 1) * 0.72); place(m, q.x, 0, q.z, face); root.add(m.g); var sp = o.sprite(l.emoji, 0.3); sp.position.set(0, 1.08, 0); m.g.add(sp); m.sp = sp; m.lesson = l.id; return m; });
    /* THE DESK: a little table at the shelter's side, a clipboard on it, its sign */
    (function desk() {
      var q = sch(0.6, 2.25), g = new THREE.Group(); g.position.set(q.x, 0, q.z); g.rotation.y = face; root.add(g);
      var top = shade(o.tex(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.55), lam(0x8b5e34)), 'planks', 1, 1), true); top.position.y = 0.62; g.add(top);
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.4), lam(0x6e4a2a)); leg.position.y = 0.3; shade(leg, true); g.add(leg);
      var clip = o.sprite('\u{1F4CB}', 0.34); clip.position.set(0, 0.86, 0); g.add(clip);
      var sg = board('Check-up', 0.8, 0.26, { bg: '#2f3a33', ink: '#eef4e6', size: 80 }); sg.position.set(0, 1.12, -0.12); g.add(sg); R.desk = { x: q.x, z: q.z };
    })();
    var readyStar = o.sprite('⭐', 0.32); readyStar.visible = false; root.add(readyStar);
    /* THE RING: a big mossy stump in its middle, leaves at both ends of the push; the vine and its line beside it */
    var PS = { x: P.ring[0], z: P.ring[1] }, TG = { x: -4.2, z: -11.6 }, AX = { x: 0, z: 1 };   /* the tug: her chick toward the garden (+z), the rival toward the far wall */
    (function ring() {
      var st = shade(o.tex(new THREE.Mesh(new THREE.CylinderGeometry(K.R, K.R * 1.08, K.SH, 18), lam(0x8b6a44)), 'bark', 2, 1), true); st.position.set(PS.x, K.SH / 2, PS.z); root.add(st);
      var moss = shade(o.tex(new THREE.Mesh(new THREE.CylinderGeometry(K.R * 0.98, K.R * 0.98, 0.04, 18), lam(0x5d8f3c)), 'grass', 1, 1), false); moss.position.set(PS.x, K.SH + 0.015, PS.z); root.add(moss);
      /* the leaves: one instanced mesh for all four piles (two by the stump, the bed on the tug's line) */
      var lg = new THREE.DodecahedronGeometry(0.11, 0); lg.scale(1, 0.32, 1.3); var piles = [[PS.x - K.R - 0.55, PS.z, 0.42], [PS.x + K.R + 0.55, PS.z, 0.42], [TG.x, TG.z, 0.36]], n = 0, M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S3 = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3(), C = new THREE.Color(), CL = [0xd8873a, 0xc8562f, 0xe0b04a, 0x9a6a2e, 0xb8442a];
      var im = new THREE.InstancedMesh(lg, lam(0xffffff), 3 * 38), r = rnd(5);
      piles.forEach(function (p) { for (var i = 0; i < 38; i++) { var a = r() * 6.283, d = Math.sqrt(r()) * p[2]; E.set(r() * 0.6 - 0.3, r() * 6.283, r() * 0.6 - 0.3); Q.setFromEuler(E); V.set(p[0] + Math.cos(a) * d * (p === piles[2] ? 0.55 : 1), 0.02 + (1 - d / p[2]) * 0.1 + r() * 0.04, p[1] + Math.sin(a) * d * (p === piles[2] ? 1.3 : 1)); M.compose(V, Q, S3); im.setMatrixAt(n, M); im.setColorAt(n, C.setHex(CL[n % CL.length])); n++; } });
      im.count = n; im.instanceColor.needsUpdate = true; im.receiveShadow = true; root.add(im);
      /* the tug's line: a strip of pale petals across, and the vine (a tube) lying along its axis */
      var ln = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.08), lam(0xf4efe0, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); ln.rotation.x = -Math.PI / 2; ln.position.set(TG.x, 0.022, TG.z); root.add(ln);
      var pts = []; for (var k = 0; k <= 12; k++) { var u = k / 12 - 0.5; pts.push(new THREE.Vector3(Math.sin(u * 9) * 0.03, 0, u * 5.0)); }
      var vine = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.028, 6, false), lam(0x4f7d2c)); shade(vine, true);
      var bud = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lam(0xd8504a)); var vg = new THREE.Group(); vg.add(vine); vg.add(bud); vg.position.set(TG.x, 0.05, TG.z); root.add(vg); R.vine = vg; R.bud = bud;
      var sign = board('Vine Tug', 0.9, 0.3, { size: 84 }); sign.position.set(TG.x - 1.2, 0.95, TG.z + 0.2); sign.rotation.y = Math.atan2(-(TG.x - 1.2), -(TG.z + 0.2)); root.add(sign);
      var post = o.tex(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 6), lam(0x7a5432)), 'wood', 1, 1); post.position.set(TG.x - 1.2, 0.4, TG.z + 0.2); root.add(post);
    })();
    /* THE RIVAL: one chick at a time (the next one she has not beaten waits by the ring); built like the Race's, recoloured */
    var RV = birdMesh(RIVALS[0].col, K.SC, false); root.add(RV.g); RV.g.visible = false;
    function rivalIdx(game) { var w = ring().won; for (var i = 0; i < RIVALS.length; i++) if (!w[game + ':' + i]) return i; return RIVALS.length - 1; }
    function idleRival() { var i = rivalIdx('push'); RV.mat.color.setHex(RIVALS[i].col); RV.i = i; var q = { x: PS.x - 1.6, z: PS.z + 2.4 }; place(RV, q.x, 0, q.z, Math.atan2(-q.x, -q.z)); RV.g.visible = true; }
    var sweat = [o.sprite('\u{1F4A6}', 0.2), o.sprite('\u{1F4A6}', 0.2)]; sweat.forEach(function (s) { s.visible = false; root.add(s); });
    /* THE TRICKS IN ITS IDLE LIFE: a note over its head, a drawing on the ground (one each, shown only while it does them) */
    var note = o.sprite('\u{1F3B6}', 0.26); note.visible = false; o.scene.add(note);
    var drawTex = (function () { var cv = document.createElement('canvas'); cv.width = cv.height = 128; var g = cv.getContext('2d'); g.fillStyle = '#fbf6e8'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#e3a51c'; g.lineWidth = 5; g.lineCap = 'round';
      for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 30, 60 + Math.sin(a) * 30); g.lineTo(64 + Math.cos(a) * (44 + (i % 2) * 6), 60 + Math.sin(a) * (44 + (i % 2) * 6)); g.stroke(); }
      g.fillStyle = '#f6c431'; g.beginPath(); g.arc(64, 60, 24, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5a3a1a'; g.beginPath(); g.arc(56, 55, 3, 0, 7); g.arc(72, 55, 3, 0, 7); g.fill(); g.strokeStyle = '#5a3a1a'; g.lineWidth = 3; g.beginPath(); g.arc(64, 62, 10, 0.3, Math.PI - 0.3); g.stroke();
      g.strokeStyle = '#7fb54a'; g.lineWidth = 6; g.beginPath(); g.moveTo(6, 120); g.quadraticCurveTo(64, 104, 122, 120); g.stroke(); return new THREE.CanvasTexture(cv); })();
    var doodle = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: drawTex, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); doodle.rotation.x = -Math.PI / 2; doodle.visible = false; o.scene.add(doodle);
    /* SAVED STATE (on her chick) */
    function school() { var c = Lt().S.chick; c.school782 = c.school782 || { learned: {}, cur: null, ready: false }; c.school782.learned = c.school782.learned || {}; return c.school782; }
    function ring() { var c = Lt().S.chick; c.ring782 = c.ring782 || { won: {}, bouts: 0, paid: 0 }; c.ring782.won = c.ring782.won || {}; return c.ring782; }
    function lessonOf(id) { return LESSONS.find(function (l) { return l.id === id; }); }
    function away() { try { var s = Lt().S; return !!(s.nestDone && s.chick && s.chick.school782 && s.chick.school782.cur); } catch (e) { return false; } }
    function tricks() { try { var s = Lt().S, L = s.chick && s.chick.school782 && s.chick.school782.learned; return L ? LESSONS.filter(function (l) { return L[l.id]; }).map(function (l) { return l.id === 'song' ? 'sing' : l.id; }) : []; } catch (e) { return []; } }
    /* THE PANELS */
    function css() {
      if (document.getElementById('school782css')) return; var s = document.createElement('style'); s.id = 'school782css';
      s.textContent = ':is(#school782p,#ring782p){position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);transform:translateX(-50%);width:min(440px,calc(100vw - 24px));max-height:min(80vh,660px);box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;z-index:44;background:#fff8ea;color:#3b2a1a;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.35);padding:14px 14px 10px;font-family:var(--body,system-ui)}' +
        ':is(#school782p,#ring782p) h3{margin:0 0 2px;font:600 22px Georgia,serif;display:flex;justify-content:space-between;align-items:center}:is(#school782p,#ring782p) h3 span{font:800 16px var(--body,system-ui);color:#8a5a12}:is(#school782p,#ring782p) .how{font:600 12.5px/1.35 var(--body,system-ui);color:#6b4a14;background:#fbeccb;border-radius:10px;padding:6px 8px;margin:4px 0 8px}' +
        ':is(#school782p,#ring782p) .tabs{display:flex;gap:6px;margin-bottom:6px}:is(#school782p,#ring782p) .tabs button{flex:1;min-height:40px;border-radius:12px;border:2px solid rgba(60,40,20,.15);background:#fff;font:800 13px var(--body,system-ui);color:#5a4026}:is(#school782p,#ring782p) .tabs button.on{background:#3b2a1a;color:#fff8ea;border-color:#3b2a1a}' +
        ':is(#school782p,#ring782p) .rows{flex:1 1 auto;min-height:0;overflow:auto}:is(#school782p,#ring782p) .row{display:flex;align-items:center;gap:10px;padding:8px 4px;border-top:1px solid rgba(60,40,20,.1)}:is(#school782p,#ring782p) .row .e{font-size:28px;width:38px;text-align:center}:is(#school782p,#ring782p) .row .t{flex:1;min-width:0}:is(#school782p,#ring782p) .row b{display:block;font:700 15px var(--body,system-ui)}:is(#school782p,#ring782p) .row small{display:block;font:600 12px/1.3 var(--body,system-ui);color:#7a5a3a}' +
        ':is(#school782p,#ring782p) .row button{min-width:88px;min-height:44px;border-radius:14px;border:0;background:#4f7d2c;color:#fff;font:800 13.5px var(--body,system-ui)}:is(#school782p,#ring782p) .row button[disabled]{background:#cbbfa8;color:#fff8ea}:is(#school782p,#ring782p) .sec{font:800 12px var(--body,system-ui);letter-spacing:.12em;text-transform:uppercase;color:#8a6a46;margin:8px 4px 0}' +
        ':is(#school782p,#ring782p) .close{display:block;width:100%;margin-top:8px;min-height:44px;border-radius:14px;border:2px solid rgba(60,40,20,.2);background:#fff;font:800 14px var(--body,system-ui);color:#3b2a1a}:is(#school782p,#ring782p) .go2{display:block;width:100%;margin-top:8px;min-height:48px;border-radius:14px;border:0;background:#4f7d2c;color:#fff;font:800 15px var(--body,system-ui)}' +
        ':is(#school782p,#ring782p) .away{background:#eef6e6;border-radius:12px;padding:10px;margin:2px 0 6px;font:700 14px/1.35 var(--body,system-ui)}:is(#school782p,#ring782p) .away u{display:block;height:7px;border-radius:4px;background:rgba(60,40,20,.12);margin-top:6px;overflow:hidden;text-decoration:none}:is(#school782p,#ring782p) .away u i{display:block;height:100%;background:#4f7d2c}' +
        ':is(#school782p,#ring782p) .st{display:grid;grid-template-columns:96px 1fr 44px;align-items:center;gap:6px;padding:7px 4px;border-top:1px solid rgba(60,40,20,.1);font:700 14px var(--body,system-ui)}:is(#school782p,#ring782p) .st .s{font-size:19px;letter-spacing:2px;color:#e3a51c;white-space:nowrap}:is(#school782p,#ring782p) .st .s q{quotes:none;color:rgba(60,40,20,.18)}:is(#school782p,#ring782p) .st small{font:600 12px var(--body,system-ui);color:#8a6a46;text-align:right}:is(#school782p,#ring782p) .note{font:600 13px/1.4 var(--body,system-ui);background:#eef6e6;border-radius:10px;padding:8px;margin-top:8px}' +
        ':is(#school782p,#ring782p) .place{font:600 30px/1.1 Georgia,serif;text-align:center;margin:4px 0 2px}:is(#school782p,#ring782p) .pay{text-align:center;font:800 16px var(--body,system-ui);color:#8a5a12;margin-bottom:6px}:is(#school782p,#ring782p) table{width:100%;border-collapse:collapse;font:600 13px var(--body,system-ui)}:is(#school782p,#ring782p) td{padding:5px 4px;border-top:1px solid rgba(60,40,20,.1)}:is(#school782p,#ring782p) td.n{text-align:right;font-variant-numeric:tabular-nums}' +
        '#ring782h{position:fixed;inset:0;z-index:46;pointer-events:none;font-family:var(--body,system-ui);color:#fff}#ring782h .top{position:absolute;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);display:flex;justify-content:space-between;align-items:flex-start;text-shadow:0 1px 3px rgba(0,8,24,.9)}' +
        '#ring782h .g{font:700 12px var(--body,system-ui);letter-spacing:.14em;text-transform:uppercase;opacity:.9}#ring782h .vs{font:600 15px Georgia,serif;margin-top:2px}#ring782h .clock{font:600 38px/1 Georgia,serif;text-align:right;font-variant-numeric:tabular-nums}#ring782h .clock small{display:block;font:700 11px var(--body,system-ui);letter-spacing:.1em;opacity:.85}' +
        '#ring782h .pbars{position:absolute;left:14px;right:14px;top:calc(env(safe-area-inset-top,0px) + 70px);display:flex;gap:14px}#ring782h .pf{flex:1;font:700 11px var(--body,system-ui);letter-spacing:.08em;text-shadow:0 1px 3px rgba(0,8,24,.9)}#ring782h .pf.rv{text-align:right}#ring782h .pf .pb{width:100%;box-sizing:border-box;height:9px;border-radius:5px;background:rgba(0,0,0,.35);overflow:hidden;margin-top:3px;border:1px solid rgba(255,255,255,.6)}#ring782h .pf .pb i{display:block;height:100%;background:#7ed37a}#ring782h .pf.rv .pb i{margin-left:auto}#ring782h .pf.low .pb i{background:#f2b134}#ring782h .pf.out .pb i{background:#e0533c}' +
        '#ring782h .meter{position:absolute;left:30px;right:30px;top:calc(env(safe-area-inset-top,0px) + 112px);height:22px}#ring782h .meter .ln{position:absolute;left:0;right:0;top:9px;height:4px;border-radius:2px;background:rgba(255,255,255,.55)}#ring782h .meter .c{position:absolute;left:50%;top:3px;width:2px;height:16px;margin-left:-1px;background:rgba(255,255,255,.85)}#ring782h .meter .mk{position:absolute;top:1px;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:#ffd94a;border:2px solid #fff;box-sizing:border-box;box-shadow:0 0 0 2px #4f7d2c}#ring782h .meter .end{position:absolute;top:-1px;font-size:16px}' +
        '#ring782h .cheer{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 16vh);transform:translateX(-50%);padding:10px 18px;border-radius:999px;background:rgba(20,24,40,.55);font:800 15px var(--body,system-ui);white-space:nowrap}#ring782h .cheer.now{background:#c8314a;font-size:18px;animation:ring782p .5s ease-in-out infinite alternate}' +
        '@keyframes ring782p{from{transform:translateX(-50%) scale(1)}to{transform:translateX(-50%) scale(1.08)}}#ring782h .count{position:absolute;left:0;right:0;top:34%;text-align:center;font:600 86px/1 Georgia,serif;text-shadow:0 4px 18px rgba(0,8,24,.7);opacity:0;transition:opacity .2s}#ring782h .count.on{opacity:1}' +
        '#ring782h .beat{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 23vh);width:64px;height:64px;margin-left:-32px;border-radius:50%;border:4px solid rgba(255,255,255,.85);box-sizing:border-box;display:none}#ring782h .beat i{position:absolute;inset:14px;border-radius:50%;background:#7ed37a}' +
        '#ring782h .quit{position:absolute;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);pointer-events:auto;min-width:44px;min-height:44px;border-radius:999px;border:0;background:rgba(20,24,40,.5);color:#fff;font:700 12px var(--body,system-ui);padding:0 14px}#ring782h .pop{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 32vh);transform:translateX(-50%);font:800 18px var(--body,system-ui);opacity:0;transition:opacity .25s,transform .4s;text-shadow:0 1px 3px rgba(0,8,24,.9);white-space:nowrap}#ring782h .pop.on{opacity:1;transform:translateX(-50%) translateY(-8px)}';
      document.head.appendChild(s);
    }
    function panelEl(id) {
      css(); var el = document.getElementById(id); if (!el) { el = document.createElement('div'); el.id = id; el.className = 'p782s'; document.body.appendChild(el); el.addEventListener('pointerdown', function (e) { e.stopPropagation(); }, true); el.addEventListener('click', onPanel); }
      return el;
    }
    function closePanel() { ['school782p', 'ring782p'].forEach(function (id) { var el = document.getElementById(id); if (el) el.remove(); }); if (R.panel) { R.panel = null; var S = Lt().S; S.talking = false; } }
    var STATW = [['str', 'Strength'], ['sta', 'Stamina'], ['swim', 'Swim'], ['run', 'Run'], ['fly', 'Flight'], ['cre', 'Creativity']];
    function starRow(v) { var n = stars(v), h = ''; for (var i = 1; i <= 5; i++) h += n >= i - 0.25 ? '★' : n >= i - 0.75 ? '⯪' : '<q>★</q>'; return h; }
    function mm(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
    function openSchool(tab) {
      var lt = Lt(), S = lt.S; if (!lt.chick() || !S.nestDone) return false; var sc = school(), el = panelEl('school782p'); R.panel = 'school'; R.tab = tab || R.tab || 'lessons'; S.talking = true; R.opens = (R.opens || 0) + 1;
      var st = S.chick.stats || {}, n = S.coins || 0, h = '<h3>The School<span>\u{1FA99} ' + n + '</span></h3><div class="how">' + LINES.school + '</div><div class="tabs"><button type="button" data-tab="lessons"' + (R.tab === 'lessons' ? ' class="on"' : '') + '>Lessons</button><button type="button" data-tab="check"' + (R.tab === 'check' ? ' class="on"' : '') + '>Check-up</button></div><div class="rows">';
      if (R.tab === 'check') {
        var best = STATW.slice().sort(function (a, b) { return cl(st[b[0]]) - cl(st[a[0]]); })[0], low = STATW.slice(0, 4).sort(function (a, b) { return cl(st[a[0]]) - cl(st[b[0]]); })[0], fr = (window.WFR_HAVEN781 && WFR_HAVEN781.FRUIT || []).find(function (f) { return f.stat === low[0]; });
        STATW.forEach(function (q) { var v = cl(st[q[0]]); h += '<div class="st" data-stat="' + q[0] + '"><span>' + q[1] + '</span><span class="s" aria-label="' + stars(v) + ' stars">' + starRow(v) + '</span><small>' + v + '</small></div>'; });
        h += '<div class="note">Strongest at ' + best[1] + '. ' + (fr ? 'For ' + low[1] + ', ' + fr.emoji + ' ' + fr.name + ' at Thimble\'s Market.' : '') + ' Five stars is as strong as a chick can grow.</div>';
      } else if (sc.cur) {
        var L = lessonOf(sc.cur.id), done = sc.cur.left <= 0, pc = Math.round(100 * (1 - Math.max(0, sc.cur.left) / sc.cur.total));
        h += '<div class="away">' + L.emoji + ' Your chick is ' + (sc.cur.practice ? 'practising ' : 'learning ') + L.kind.toLowerCase() + ' with ' + L.teacher + '. ' + (done ? 'It is ready!' : 'About ' + mm(sc.cur.left) + ' to go: play a while, then come back.') + '<u><i style="width:' + pc + '%"></i></u></div>';
        h += '<button type="button" class="go2" data-pick="1"' + (done ? '' : ' disabled style="background:#cbbfa8"') + '>' + (done ? 'Pick up your chick' : 'Still learning…') + '</button>';
      } else {
        LESSONS.forEach(function (l) { var got = sc.learned[l.id] || 0, p = got ? PRICE.practice : PRICE.lesson, g = got ? l.again : l.gives, gw = Object.keys(g).map(function (k) { return (STATW.find(function (q) { return q[0] === k; }) || [k, k])[1] + ' +' + g[k]; }).join(' · ');
          h += '<div class="row"><div class="e">' + l.emoji + '</div><div class="t"><b>' + l.kind + ': ' + l.title + (got ? ' ✓' : '') + '</b><small>' + l.teacher + ' · ' + (got ? 'practise: ' : '') + gw + ' · ' + Math.round((got ? K.PRACTICE : K.LESSON) / 60 * 10) / 10 + ' min</small></div><button type="button" data-drop="' + l.id + '">' + (got ? 'Practise' : 'Drop off') + ' \u{1FA99}' + p + '</button></div>'; });
      }
      h += '</div><button type="button" class="close" data-close="1">Not now</button>'; el.innerHTML = h; return true;
    }
    function openRing() {
      var lt = Lt(), S = lt.S; if (!lt.chick() || !S.nestDone) return false; if (away()) { lt.toast(LINES.away, 3400); return true; }
      var rg = ring(), el = panelEl('ring782p'), st = S.chick.stats || {}; R.panel = 'ring'; S.talking = true; R.opens = (R.opens || 0) + 1;
      var h = '<h3>The Ring<span>\u{1FA99} ' + (S.coins || 0) + '</span></h3><div class="how">' + LINES.ring + ' Rivals from the Race: ' + RIVALS.map(function (r) { return r.name; }).join(', ') + '.</div><div class="rows">';
      ['push', 'tug'].forEach(function (gid) { var G = GAMES[gid]; h += '<div class="sec">' + G.emoji + ' ' + G.name + ' · ' + (gid === 'push' ? 'Strength · Stamina · Swim · Run' : 'Strength · Stamina · taps') + '</div>';
        RIVALS.forEach(function (r, i) { var won = rg.won[gid + ':' + i] || 0, open = i === 0 || rg.won[gid + ':' + (i - 1)];
          h += '<div class="row"><div class="e" style="color:#' + r.col.toString(16).padStart(6, '0') + '">●</div><div class="t"><b>vs ' + r.name + (won ? ' ✓' : '') + '</b><small>' + (open ? r.word + ' · ' + (won ? 'a win pays \u{1FA99} ' + G.again : 'win: \u{1FA99} ' + G.win[i] + ' and ' + G.ribbons[i]) : 'Beat ' + RIVALS[i - 1].name + ' first') + '</small></div><button type="button" data-bout="' + gid + ':' + i + '"' + (open ? '' : ' disabled') + '>' + (open ? 'Bout' : '\u{1F512}') + '</button></div>'; }); });
      h += '</div><button type="button" class="close" data-close="1">Not now</button>'; el.innerHTML = h; return true;
    }
    function onPanel(e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.close) { closePanel(); return; }
      if (b.dataset.tab) { openSchool(b.dataset.tab); return; }
      if (b.dataset.drop) { drop(b.dataset.drop); return; }
      if (b.dataset.pick) { closePanel(); pickup(); return; }
      if (b.dataset.bout) { var q = b.dataset.bout.split(':'); closePanel(); start(q[0], +q[1]); return; }
      if (b.dataset.again) { var last = R.result; closePanel(); if (last) start(last.game, last.i); return; }
    }
    /* THE SCHOOL: drop off, the stretch of play, the pick up */
    var hold = { was: null };
    function drop(id) {
      var lt = Lt(), S = lt.S, sc = school(), L = lessonOf(id), chick = lt.chick(); if (!L || sc.cur || !chick || !S.nestDone) return false;
      var got = sc.learned[id] || 0, p = got ? PRICE.practice : PRICE.lesson, n = S.coins || 0;
      if (n < p) { lt.toast(LINES.poor(p, n), 4200); return false; }
      S.coins = n - p; var secs = got ? K.PRACTICE : K.LESSON; sc.cur = { id: id, left: secs, total: secs, practice: !!got }; sc.ready = false; R.drops++;
      hold.was = !!(lt.FOLLOW && lt.FOLLOW.with); if (lt.FOLLOW) { lt.FOLLOW.with = false; if (lt.FOLLOW.ring) lt.FOLLOW.ring.length = 0; }
      var U = chick.userData; U.life = null; if (U.mind) U.mind.s.visible = false; hold.from = chick.position.clone(); hold.t = 0;
      closePanel(); lt.save(); lt.hud();
      var met = (sc.met = sc.met || {}); if (!met[L.teacher] && cine && cine.nameCard) { met[L.teacher] = 1; try { cine.nameCard(L.teacher, L.role, 3800); } catch (e) { /* fine */ } }
      try { lt.chirp(); } catch (e) { /* fine */ } lt.toast(LINES.dropped(L, Math.round(secs / 60 * 10) / 10), 4600); return true;
    }
    function seatAt(chick, t, real) {   /* at school: on the middle stool facing the slate, its lesson in its body; hidden outside the Haven */
      var U = chick.userData, sc = school(), L = lessonOf(sc.cur.id), sc0 = U.body.scale.x || 0.3, inH = HV.on();
      if (chick.visible !== inH) chick.visible = inH; if (U.mind && U.mind.s.visible) U.mind.s.visible = false;
      var st = W(STOOL.x, STOOL_Y, STOOL.z), k = sm((hold.t || 0) / 0.9); hold.t = (hold.t || 0) + real;
      if (hold.from && k < 1 && inH) { chick.position.lerpVectors(hold.from, new THREE.Vector3(st.x, st.y + 0.4, st.z), k); chick.position.y += Math.sin(k * Math.PI) * 0.5; } else { chick.position.set(st.x, st.y + 0.4, st.z); hold.from = null; }
      chick.rotation.y = face + Math.PI; U.body.position.y = -0.4 * (1 - sc0); U.body.rotation.set(0, 0, 0); var eyes = U.body.userData.eyes || []; eyes.forEach(function (e) { e.scale.y = 1; });
      var done = sc.cur.left <= 0;
      if (!done) { if (L.id === 'song') { U.body.rotation.z = Math.sin(t * 3) * 0.12; U.body.rotation.x = -0.15; } else if (L.id === 'dance') { U.body.rotation.z = Math.sin(t * 4) * 0.2; U.body.position.y += Math.abs(Math.sin(t * 4)) * 0.04; } else { U.body.rotation.x = Math.max(0, Math.sin(t * 7)) * 0.3; } }
      var w = done ? Math.sin(t * 9) * 0.5 : Math.sin(t * 2) * 0.1; U.wings[0].rotation.z = w; U.wings[1].rotation.z = -w;
      readyStar.visible = done && inH; if (done) readyStar.position.set(STOOL.x, STOOL_Y + 0.62 + Math.sin(t * 3) * 0.04, STOOL.z);
    }
    function release(at, yaw) {   /* back to its own life, in the Haven, where it stands (the Haven's own rule for its home spot) */
      var lt = Lt(), chick = lt.chick(); if (!chick) return; var U = chick.userData; chick.visible = true; readyStar.visible = false;
      if (at) chick.position.copy(at); if (yaw != null) chick.rotation.y = yaw; U.body.position.y = 0; U.body.rotation.set(0, 0, 0); U.life = null; U.where = HV.on() ? 'haven' : U.where; U.home = chick.position.clone(); U.lastBird = null;
      if (!HV.on()) { var h = lt.chickSpot(); chick.position.copy(h); U.home = h.clone(); U.where = 'home'; }
    }
    function pickup() {
      var lt = Lt(), S = lt.S, sc = school(), chick = lt.chick(); if (!sc.cur || sc.cur.left > 0 || !chick || !cine || cine.on() || !HV.on()) return false;
      var L = lessonOf(sc.cur.id), practice = sc.cur.practice, first = !practice && !sc.learned[L.id], g = practice ? L.again : L.gives;
      var st0 = W(STOOL.x, STOOL_Y, STOOL.z), fr = W(FRONT.x, 0, FRONT.z), U = chick.userData, sc0 = U.body.scale.x || 0.3, played = false, burst = false, said = false, yaw = face;
      var her = S.pos; var side = (function () { var a = Math.atan2(her.x - fr.x, her.z - fr.z) - face; return Math.sin(a) >= 0 ? 1 : -1; })();
      var notes = [0, 1, 2].map(function (i) { var s = o.sprite(i % 2 ? '\u{1F3B6}' : '\u{1F3B5}', 0.3); s.visible = false; o.scene.add(s); return s; }), pic = null;
      if (L.id === 'draw') { pic = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: drawTex, transparent: true, opacity: 0, side: THREE.DoubleSide })); o.scene.add(pic); }
      S.talking = true; R.scenes++;
      var hs0 = sch(2.35, side * 1.45), hw = W(hs0.x, 0, hs0.z); S.mode = 'walk'; S.speed = 0; S.pos.x = hw.x; S.pos.z = hw.z; S.yaw = Math.atan2(fr.x - hw.x, fr.z - hw.z); S.camYaw = S.yaw;   /* she steps to its side to watch */
      var ok = cine.play({ name: 'learn782', dur: 5.2, skip: 1.5, freeze: true,
        tick: function (t) {
          if (!played && t >= 0.9) { played = true; try { if (o.sound) o.sound('get'); } catch (e) { /* fine */ } }
          if (!burst && t >= 1.6) { burst = true; try { if (o.burst) o.burst(chick.position.clone().add(new THREE.Vector3(0, 0.3, 0))); } catch (e) { /* fine */ } }
          if (!said && t >= 1.7) { said = true; if (cine.card) cine.card(practice ? 'Your chick practised' : 'Your chick learned', L.kind + ': ' + L.title, (practice ? 'Better at it every time. ' : L.line + ' ') + Object.keys(g).map(function (k) { return (STATW.find(function (q) { return q[0] === k; }) || [k, k])[1] + ' +' + g[k]; }).join(' · ')); }
        },
        pose: function (on, t) {
          if (!on) return; var k = sm((t - 0.3) / 0.7); chick.visible = true; readyStar.visible = false;
          chick.position.lerpVectors(new THREE.Vector3(st0.x, st0.y + 0.4, st0.z), new THREE.Vector3(fr.x, fr.y + 0.4, fr.z), k); chick.position.y += Math.sin(k * Math.PI) * 0.45;
          var tt = Math.max(0, t - 1.1), sh = t < 1.1 ? 0 : Math.min(1, tt / 0.3); chick.rotation.y = yaw; U.body.position.y = -0.4 * (1 - sc0); U.body.rotation.set(0, 0, 0);
          if (L.id === 'song') { U.body.rotation.x = -0.25 * sh; U.body.rotation.z = Math.sin(tt * 4) * 0.14 * sh; notes.forEach(function (n, i) { var u = ((tt * 0.55 + i / 3) % 1); n.visible = sh > 0; n.position.set(chick.position.x + Math.sin(u * 6 + i) * 0.22, chick.position.y + 0.2 + u * 0.8, chick.position.z); n.material.opacity = Math.sin(u * Math.PI); }); }
          else if (L.id === 'dance') { chick.rotation.y = yaw + sh * tt * 5.5; U.body.position.y += Math.abs(Math.sin(tt * 7)) * 0.08 * sh; }
          else { U.body.rotation.x = Math.max(0, Math.sin(tt * 8)) * 0.35 * sh; if (pic) { var up = sm((t - 1.2) / 1.4); pic.position.set(fr.x - fx * 0.05, fr.y + 0.35 + 0.35 * up, fr.z - fz * 0.05); pic.lookAt(fr.x + fx * 3 + lx * side * 2.2, fr.y + 0.6, fr.z + fz * 3 + lz * side * 2.2); pic.material.opacity = up; } }
          var wv = t > 1.1 ? Math.sin(t * (L.id === 'dance' ? 14 : 6)) * 0.6 : Math.sin(t * 16) * 0.8 * (k > 0 && k < 1 ? 1 : 0); U.wings[0].rotation.z = wv; U.wings[1].rotation.z = -wv;
        },
        shot: function (t, u, Pp, Lk) {   /* low, three-quarters to its front on her side, pushing in */
          var d = 2.45 - 0.45 * sm(u), a = -side * 0.42; Pp.set(fr.x + (fx * Math.cos(a) + lx * Math.sin(a)) * d, fr.y + 0.85 - 0.12 * sm(u), fr.z + (fz * Math.cos(a) + lz * Math.sin(a)) * d); Lk.set(fr.x, fr.y + 0.32 + (L.id === 'draw' ? 0.2 * sm((t - 1.2) / 1.4) : L.id === 'song' ? 0.12 : 0), fr.z); return 42;
        },
        end: function (how) {
          notes.forEach(function (n) { o.scene.remove(n); if (n.material && n.material.dispose) n.material.dispose(); }); if (pic) { o.scene.remove(pic); pic.geometry.dispose(); pic.material.dispose(); }
          Object.keys(g).forEach(function (k) { try { lt.addStat(k, g[k]); var Lg = S.chick.log; if (Lg && Lg[0] && Lg[0][1] === k) Lg[0][0] = L.emoji + ' ' + L.kind.toLowerCase() + ' at school'; } catch (e) { S.chick.stats[k] = cl((S.chick.stats[k] || 0) + g[k]); } });
          sc.learned[L.id] = (sc.learned[L.id] || 0) + 1; sc.cur = null; sc.ready = false; R.learned++; R.lastLearn = { id: L.id, practice: practice, first: first, gives: g, how: how };
          release(new THREE.Vector3(fr.x, fr.y + 0.4, fr.z), Math.atan2(her.x - fr.x, her.z - fr.z));
          if (hold.was && lt.FOLLOW) { /* it walks with her again by its own rule (followTick) */ } hold.was = null;
          S.talking = false; lt.save(); lt.hud();
        } });
      if (!ok) { S.talking = false; notes.forEach(function (n) { o.scene.remove(n); }); if (pic) o.scene.remove(pic); }
      return ok;
    }
    /* THE TRICK IN ITS IDLE LIFE (from chickTick, after its own pose): the act LIFE741 chose */
    function trick(chick, U, act, dt, t) {
      var on = !!(chick && U && (act === 'sing' || act === 'dance' || act === 'draw') && chick.visible);
      if (!on) { if (note.visible) note.visible = false; if (doodle.visible) { doodle.material.opacity = Math.max(0, doodle.material.opacity - dt * 0.6); if (doodle.material.opacity <= 0) doodle.visible = false; } R.trickNow = null; return; }
      if (R.trickNow !== act) { R.trickNow = act; R.tricks[act] = (R.tricks[act] || 0) + 1; R.trickShown++; R.trickT = 0; if (act === 'sing') try { Lt().chirp(); } catch (e) { /* fine */ } }
      R.trickT += dt; var p = chick.position, k = Math.min(1, R.trickT / 0.4);
      if (act === 'sing') { U.body.rotation.x = -0.22 * k; U.body.rotation.z = Math.sin(t * 4) * 0.13 * k; var u = (R.trickT * 0.6) % 1; note.visible = true; note.position.set(p.x + Math.sin(u * 6) * 0.1, p.y + 0.15 + u * 0.55, p.z); note.material.opacity = Math.sin(u * Math.PI); }
      else if (act === 'dance') { chick.rotation.y += dt * 5.5 * k; U.body.position.y += Math.abs(Math.sin(t * 7)) * 0.05 * k; var w = Math.sin(t * 14) * 0.6; U.wings[0].rotation.z = w; U.wings[1].rotation.z = -w; note.visible = false; }
      else { U.body.rotation.x += Math.max(0, Math.sin(t * 8)) * 0.35 * k; note.visible = false; if (!doodle.visible || R.trickT < dt * 1.5) { var f = chick.rotation.y; doodle.position.set(p.x + Math.sin(f) * 0.28, (o.ground ? o.ground(p.x + Math.sin(f) * 0.28, p.z + Math.cos(f) * 0.28) : p.y - 0.4) + 0.03, p.z + Math.cos(f) * 0.28); doodle.rotation.z = -f; doodle.visible = true; }
        doodle.material.opacity = Math.min(0.95, R.trickT / 3); }
    }
    /* THE RING: a bout on the kit, like the Race (one long scene, its own taps) */
    var B = null, camP = new THREE.Vector3(), camL = new THREE.Vector3(), camInit = false, keep = null;
    function hudEl(G, rv) {
      css(); var el = document.createElement('div'); el.id = 'ring782h';
      el.innerHTML = '<div class="top"><div><div class="g">' + G.name + '</div><div class="vs">Your chick · ' + rv.name + '</div></div><div class="clock"></div></div><div class="pbars"><div class="pf me"><span>YOUR CHICK</span><div class="pb"><i style="width:100%"></i></div></div><div class="pf rv"><span>' + rv.name.toUpperCase() + '</span><div class="pb"><i style="width:100%"></i></div></div></div>' +
        '<div class="meter"><div class="ln"></div><div class="c"></div><span class="end" style="left:-22px">\u{1F343}</span><span class="end" style="right:-22px">\u{1F343}</span><div class="mk" style="left:50%"></div></div><div class="beat"><i></i></div><div class="cheer"></div><div class="pop"></div><div class="count"></div><button type="button" class="quit">Leave</button>';
      document.body.appendChild(el); el.querySelector('.quit').addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); abort(); });
      return { el: el, clock: el.querySelector('.clock'), pm: el.querySelector('.pf.me'), pr: el.querySelector('.pf.rv'), bm: el.querySelector('.pf.me i'), br: el.querySelector('.pf.rv i'), mk: el.querySelector('.mk'), beat: el.querySelector('.beat'), bi: el.querySelector('.beat i'), cheer: el.querySelector('.cheer'), pop: el.querySelector('.pop'), count: el.querySelector('.count'), last: {} };
    }
    function hs(H, k, v, f) { if (H.last[k] !== v) { H.last[k] = v; f(v); } }
    function pop(txt) { var H = R.hud; if (!H) return; H.pop.textContent = txt; H.pop.classList.remove('on'); void H.pop.offsetWidth; H.pop.classList.add('on'); clearTimeout(R.popT); R.popT = setTimeout(function () { if (H.pop) H.pop.classList.remove('on'); }, 650); }
    function start(game, i) {
      var lt = Lt(), S = lt.S, chick = lt.chick(), G = GAMES[game], rv = RIVALS[i], rg = ring();
      if (!G || !rv || !chick || !S.nestDone || !cine || cine.on() || R.ph || !HV.on() || away() || (i > 0 && !rg.won[game + ':' + (i - 1)])) { S.talking = false; return false; }
      R.game = game; R.i = i; R.ph = 'intro'; R.result = null; R.bows = [0, 0]; R.ignored = 0; R.hearts = 0; camInit = false; R.bouts = (R.bouts || 0) + 1;
      B = bout(game, S.chick.stats || {}, rv.st, (R.bouts * 7919 + (rg.bouts || 0) * 31) % 100000); R.B = B;
      var U = chick.userData; keep = { p: chick.position.clone(), r: chick.rotation.y, mind: U.mind ? U.mind.s.visible : false, follow: !!(lt.FOLLOW && lt.FOLLOW.with) }; if (U.mind) U.mind.s.visible = false; (U.body.userData.eyes || []).forEach(function (e) { e.scale.y = 1; }); U.sleepK = 0;
      if (lt.FOLLOW) lt.FOLLOW.with = false;
      RV.mat.color.setHex(rv.col); RV.g.visible = true; RV.i = i;
      var spot = game === 'push' ? { x: PS.x - 3.2, z: PS.z + 1.6 } : { x: TG.x + 1.9, z: TG.z + 4.6 }, look = game === 'push' ? PS : TG, w = W(spot.x, 0, spot.z), wl = W(look.x, 0, look.z);
      S.mode = 'walk'; S.speed = 0; S.vy = 0; S.pos.set(w.x, Y + lt.standOf(), w.z); S.yaw = Math.atan2(wl.x - w.x, wl.z - w.z); S.camYaw = S.yaw; S.camCut = true; S.talking = true; R.her = { x: w.x, z: w.z };
      var H = hudEl(G, rv); R.hud = H; H.el.style.opacity = '0'; H.beat.style.display = game === 'tug' ? 'block' : 'none';
      var said = false, cnt = -1;
      var ok = cine.play({ name: 'ring782', dur: 1e6, skip: false, freeze: false,
        onTap: function () { if (R.ph !== 'run') return null; var now = performance.now() / 1000; if (now - B.me.tap < K.TAP_MIN) return null; B.me.tap = now; var r = tap(B);
          if (r === 'cheer') { pop('\u{1F4E3} +' + Math.round(cheerE(B.me.st.cre)) + ' puff'); try { lt.chirp(); } catch (e) { /* fine */ } } else if (r === 'heave') { pop('\u{1F33F} Heave!'); try { lt.chirp(); } catch (e) { /* fine */ } } else if (r === 'miss') { pop('…'); } else { R.ignored++; R.hearts++; pop('❤️'); } return null; },
        tick: function (t, real) {
          var S2 = lt.S; S2.speed = 0; S2.vy = 0; S2.pos.x = R.her.x; S2.pos.z = R.her.z;
          if (R.ph === 'intro') {
            if (!said && t > 0.5) { said = true; try { o.title(G.name, 'vs ' + rv.name, game === 'push' ? 'Bump bellies on the mossy stump' : 'Pull the vine over the line', 'found'); } catch (e) { /* fine */ } }
            var c = t < K.INTRO - 3 ? -1 : t < K.INTRO - 2 ? 3 : t < K.INTRO - 1 ? 2 : t < K.INTRO ? 1 : 0;
            if (c !== cnt && c >= 0) { cnt = c; H.el.style.opacity = '1'; if (o.titleHide) try { o.titleHide(); } catch (e) { /* fine */ } H.count.textContent = c ? String(c) : (game === 'push' ? 'Bump!' : 'Pull!'); H.count.classList.add('on'); try { if (o.sound) o.sound(c ? 'count' : 'go'); } catch (e) { /* fine */ } }
            if (t >= K.INTRO) { R.ph = 'run'; R.t0 = t; cine.bars(false); setTimeout(function () { if (H.count) H.count.classList.remove('on'); }, 600); }
          } else if (R.ph === 'run') {
            var d = Math.min(0.05, real) * R.fast, n = Math.max(1, Math.ceil(d / 0.034)); for (var k = 0; k < n && !B.done; k++) step(B, d / n);
            if (B.ev && B.ev.k === 'side' && B.ev.t !== R.evT) { R.evT = B.ev.t; pop(B.ev.who === 'me' ? '\u{1F4A8} Sidestep!' : '\u{1F4A8} ' + rv.name + ' sidesteps!'); }
            if (B.done) { R.ph = 'fin'; R.finT = t; cine.bars(true); try { if (o.sound) o.sound(B.win === 'me' ? 'win' : 'land'); } catch (e) { /* fine */ } if (B.win !== 'draw') { var lw = loserAt(); try { if (o.burst) o.burst(lw.clone().add(new THREE.Vector3(0, 0.05, 0)), [0xd8873a, 0xc8562f, 0xe0b04a, 0x9a6a2e], 22, 0.06, 1.1, 1.0); } catch (e) { /* fine */ } } }
          } else if (R.ph === 'fin') {
            var ft = t - R.finT; if (ft > 1.3 && !R.bowA) { R.bowA = true; } if (ft >= 4.2) { var sc = cine.current(); if (sc && sc.dur > 1e5) sc.dur = t + 0.5; }
          }
          bodies(t); hud(H, t);
        },
        shot: function (t, u, Pp, Lk) { return shot(t, Pp, Lk); },
        end: function (how) { finish(how); } });
      if (!ok) { R.ph = null; S.talking = false; H.el.remove(); R.hud = null; restore(); return false; }
      R.bowA = false; return true;
    }
    function hud(H, t) {
      var left = Math.max(0, (B.game === 'push' ? K.PP_T : K.TUG_T) - B.t);
      hs(H, 'clock', R.ph === 'intro' ? '' : String(Math.ceil(left)), function (v) { H.clock.innerHTML = v ? v + '<small>SECONDS</small>' : ''; });
      hs(H, 'Em', Math.round(Math.max(0, Math.min(100, B.me.E))), function (v) { H.bm.style.width = v + '%'; }); hs(H, 'Er', Math.round(Math.max(0, Math.min(100, B.rv.E))), function (v) { H.br.style.width = v + '%'; });
      hs(H, 'cm', B.me.puff ? 'out' : B.me.E < 30 ? 'low' : '', function (v) { H.pm.className = 'pf me' + (v ? ' ' + v : ''); }); hs(H, 'cr', B.rv.puff ? 'out' : B.rv.E < 30 ? 'low' : '', function (v) { H.pr.className = 'pf rv' + (v ? ' ' + v : ''); });
      var mx = B.game === 'push' ? 50 + B.x * 50 : 50 - B.x * 50; hs(H, 'mk', Math.round(mx * 10) / 10, function (v) { H.mk.style.left = v + '%'; });
      hs(H, 'ch', R.ph !== 'run' ? '' : B.me.puff ? 'now' : B.game === 'tug' ? 'beat' : 'calm', function (v) { H.cheer.textContent = v === 'now' ? LINES.puff : v === 'beat' ? LINES.beat : v === 'calm' ? LINES.calm : ''; H.cheer.className = 'cheer' + (v === 'now' ? ' now' : ''); H.cheer.style.display = v ? '' : 'none'; });
      hs(H, 'bt', B.game === 'tug' && R.ph === 'run' ? 'block' : 'none', function (v) { H.beat.style.display = v; });   /* the beat's ring only while they pull */
      if (B.game === 'tug' && R.ph === 'run') { var ph = (B.t / K.BEAT) % 1, near = Math.min(ph, 1 - ph) * K.BEAT, s = near < K.BEAT_WIN ? 1 - near / K.BEAT_WIN : 0; H.bi.style.transform = 'scale(' + (0.35 + 0.65 * s).toFixed(2) + ')'; H.bi.style.background = s > 0 ? '#7ed37a' : 'rgba(255,255,255,.35)'; }
    }
    /* THE BODIES: hers and the rival's, from the bout's numbers (lean in, sit and pant, tumble softly, bow) */
    function chickParts() { var lt = Lt(), c = lt.chick(); return c ? { g: c, body: c.userData.body, wings: c.userData.wings, sc: c.userData.body.scale.x || 0.3 } : null; }
    function loserAt() { var me = B.win === 'rv'; if (B.game === 'push') { var s = me ? -1 : 1; return W(PS.x + s * (K.R + 0.55), 0.1, PS.z); } var q = W(TG.x, 0.1, TG.z); return q; }
    function bodies(t) {   /* every position here is in the Haven's frame (its floor at 0); hers is put into the world at the end */
      var mc = chickParts(); if (!mc || !B) return; var fin = R.ph === 'fin', ft = fin ? t - R.finT : 0, lose = !fin ? null : B.win === 'me' ? 'rv' : B.win === 'rv' ? 'me' : null, bowT = fin ? ft - 1.6 : -1, l0 = HV.toW(0, 0);
      var to = lose ? loserAt() : null, tx = to ? to.x - l0.x : 0, tz = to ? to.z - l0.z : 0, Q = [];
      [[mc, B.me, 'me'], [RV, B.rv, 'rv']].forEach(function (q, idx) {
        var m = q[0], f = q[1], who = q[2], sc = m.sc, isMe = who === 'me', x, z, y, yaw, lean = 0, roll = 0, hop = 0, wz = Math.sin(t * 2) * 0.1;
        if (B.game === 'push') {
          var c = B.x * K.R * 0.8, gap = K.GAP * sc + 0.04; x = PS.x + (isMe ? c - gap : c + gap); z = PS.z; y = K.SH; yaw = isMe ? Math.PI / 2 : -Math.PI / 2;
          lean = f.puff ? 0 : 0.28 + 0.06 * Math.sin(t * 9 + idx); wz = f.puff ? -0.3 : 0.5 + Math.sin(t * 11 + idx * 2) * 0.35;
        } else {
          var s = isMe ? 1.0 + B.x : -1.0 + B.x; x = TG.x + AX.x * s; z = TG.z + AX.z * s; y = 0; yaw = isMe ? Math.atan2(-AX.x, -AX.z) : Math.atan2(AX.x, AX.z);
          lean = f.puff ? 0 : -0.32 - 0.05 * Math.sin(t * 10 + idx); wz = f.puff ? -0.3 : 0.7 + Math.sin(t * 13 + idx * 2) * 0.4; hop = f.puff ? 0 : Math.abs(Math.sin(t * 12 + idx * 1.3)) * 0.02;
        }
        if (f.puff && !fin) { hop = Math.sin(t * 10) * 0.012; roll = Math.sin(t * 20) * 0.04; }
        if (fin && lose === who) {   /* a soft tumble: off the stump (or over the line) onto the leaves, a roll, then up */
          var u = sm(ft / 0.9); x = x + (tx - x) * u; z = z + (tz - z) * u; y = y * (1 - u) + 0.06 * u + Math.sin(u * Math.PI) * 0.25;
          if (B.game === 'tug') { lean = ft < 1.3 ? 0.9 * Math.sin(sm(ft / 1.3) * Math.PI) : 0; roll = 0; } else roll = ft < 1.2 ? Math.sin(sm(ft / 1.2) * Math.PI) * 1.6 * (isMe ? -1 : 1) : 0;
        }
        Q.push({ m: m, f: f, who: who, isMe: isMe, x: x, y: y, z: z, yaw: yaw, lean: lean, roll: roll, hop: hop, wz: wz, sc: sc, idx: idx });
      });
      Q.forEach(function (q) {
        if (fin) {   /* both face each other and bow, twice */
          var o2 = Q[1 - q.idx]; if (bowT > -0.3) q.yaw = Math.atan2(o2.x - q.x, o2.z - q.z);
          var bw = bowT < 0 ? 0 : bowT < 0.7 ? Math.sin(bowT / 0.7 * Math.PI) : bowT > 0.9 && bowT < 1.6 ? Math.sin((bowT - 0.9) / 0.7 * Math.PI) : 0;
          if (bowT >= 0.35 && R.bows[q.idx] === 0) R.bows[q.idx] = 1; if (bowT >= 1.25 && R.bows[q.idx] === 1) R.bows[q.idx] = 2;
          if (bowT >= 0) { q.lean = 0.65 * bw; q.roll = 0; q.hop = 0; q.wz = 0.15; } else if (lose !== q.who) { q.lean = 0; q.roll = 0; q.hop = B.win === q.who ? Math.abs(Math.sin(t * 8)) * 0.05 : 0; q.wz = 0.9 + Math.sin(t * 12) * 0.5; }
        }
        var m = q.m; if (q.isMe) m.g.position.set(l0.x + q.x, Y + q.y + 0.4, l0.z + q.z); else m.g.position.set(q.x, q.y + 0.4, q.z);
        m.g.rotation.y = q.yaw; m.body.position.y = -0.4 * (1 - q.sc) + q.hop; m.body.rotation.set(q.lean, 0, q.roll); m.wings[0].rotation.z = q.wz; m.wings[1].rotation.z = -q.wz;
        if (q.isMe) (m.body.userData.eyes || []).forEach(function (e) { e.scale.y = q.f.puff && !fin ? 0.45 : 1; });
        var sw = sweat[q.idx]; sw.visible = !!(q.f.puff && !fin); if (sw.visible) sw.position.set(q.x + 0.12, q.y + 0.6 + Math.sin(t * 8) * 0.03, q.z);
      });
      if (B.game === 'tug') R.vine.position.set(TG.x + AX.x * B.x, 0.24, TG.z + AX.z * B.x); else R.vine.position.set(TG.x, 0.05, TG.z);
    }
    /* THE CAMERA: the intro swings round the stump (or along the vine); the bout from the side, low; the finish on the leaves, then the bow */
    function shot(t, Pp, Lk) {   /* a phone held upright sees little across: the line runs INTO the picture, from over her chick's shoulder; the intro swings round to it */
      var real = Math.max(0.001, t - (R.lastT || t)), tP = new THREE.Vector3(), tL = new THREE.Vector3(), fov = 50; R.lastT = t;
      var push = B.game === 'push', O = push ? PS : TG, ax = push ? { x: 1, z: 0 } : { x: -AX.x, z: -AX.z }, sd = push ? { x: 0, z: 1 } : { x: 1, z: 0 }, base = push ? K.SH : 0;   /* ax: from her side toward the rival's; sd: the side the camera stands on */
      var c = push ? B.x * K.R * 0.8 : -B.x * 0.9, ctr = function (k) { return W(O.x + ax.x * k, base + 0.16, O.z + ax.z * k); };
      function from(back, side, up, at) { var w = W(O.x + ax.x * (at - back) + sd.x * side, 0, O.z + ax.z * (at - back) + sd.z * side); tP.set(w.x, Y + base + up, w.z); }
      if (R.ph === 'intro') { var k = sm(t / K.INTRO), an = 1.9 * (1 - k), r0 = 2.9 + 0.8 * (1 - k), cx = Math.cos(an), sx = Math.sin(an), bk = 2.6 * cx + 0.0 * sx, sdk = 1.45 * cx + r0 * sx;
        from(bk, sdk, 1.25 + 0.5 * (1 - k), 0.3); tL.copy(ctr(0.3)); P0(tP, tL, Pp, Lk); camInit = false; return 50; }
      if (R.ph === 'fin') { var ft = t - R.finT, k2 = sm((ft - 1.4) / 1.2), lw = B.win === 'draw' ? ctr(0) : loserAt(), mid = ctr(c);
        from((push ? 2.6 : 3.8) + 0.5 * k2, (push ? 1.4 : 0.8) + 0.3 * k2, (push ? 1.7 : 1.45) + 0.2 * k2, push ? c * 0.5 : c * 0.3);   /* higher: the leaves behind the stump's edge are in the picture */ tL.copy(lw).lerp(mid, 0.35 + 0.4 * k2); tL.y = Y + base * (1 - k2) + 0.2 + 0.08 * k2; fov = 50; }
      else if (push) { from(2.6, 1.45, 1.25, c * 0.6 + 0.3); tL.copy(ctr(c * 0.8 + 0.3)); fov = 50; }
      else { from(3.5, 0.7, 1.15, c * 0.6 + 0.2); tL.copy(ctr(c * 0.8 + 0.2)); fov = 50; }
      if (!camInit) { camP.copy(tP); camL.copy(tL); camInit = true; } else { var a2 = 1 - Math.exp(-real * 3.0); camP.lerp(tP, a2); camL.lerp(tL, Math.min(1, a2 * 1.5)); }
      Pp.copy(camP); Lk.copy(camL); R.cam = { P: Pp.toArray(), L: Lk.toArray(), ph: R.ph }; return fov;
    }
    function P0(tP, tL, Pp, Lk) { Pp.copy(tP); Lk.copy(tL); camP.copy(tP); camL.copy(tL); R.cam = { P: Pp.toArray(), L: Lk.toArray(), ph: R.ph }; }
    function restore() {
      var lt = Lt(), chick = lt.chick(); if (chick && keep) { var U = chick.userData; var l0 = HV.toW(0, 0), at = W(PS.x - 2.9, 0, PS.z + 1.6); if (R.game === 'tug') at = W(TG.x + 1.6, 0, TG.z + 3.2);
        release(new THREE.Vector3(at.x, Y + 0.4, at.z), Math.atan2(lt.S.pos.x - at.x, lt.S.pos.z - at.z)); if (U.mind) U.mind.s.visible = false; (U.body.userData.eyes || []).forEach(function (e) { e.scale.y = 1; }); }
      sweat.forEach(function (s) { s.visible = false; }); R.vine.position.set(TG.x, 0.05, TG.z); idleRival(); keep = null;
    }
    function finish(how) {
      var lt = Lt(), S = lt.S; if (R.hud) { R.hud.el.remove(); R.hud = null; }
      var b = B, G = GAMES[R.game], rv = RIVALS[R.i], rg = ring(); R.ph = null; restore();
      if (!b || !b.done || how === 'abort' || how === 'replaced') { R.aborts++; S.talking = false; R.last = { game: R.game, i: R.i, how: how || 'abort', paid: 0 }; return; }
      var key = R.game + ':' + R.i, won = b.win === 'me', first = won && !rg.won[key], pay = won ? (first ? G.win[R.i] : G.again) : b.win === 'draw' ? PAY.draw : PAY.lose;
      rg.bouts = (rg.bouts || 0) + 1; if (won) rg.won[key] = (rg.won[key] || 0) + 1; rg.paid = (rg.paid || 0) + pay; S.coins = (S.coins || 0) + pay; lt.save(); lt.hud();
      var res = R.result = { game: R.game, i: R.i, rival: rv.name, win: b.win, how: b.how, pay: pay, first: first, t: +b.t.toFixed(1), x: +b.x.toFixed(3), puffs: b.me.puffs, sitT: +b.me.sitT.toFixed(1), cheers: b.me.cheers, heaves: b.heaves, misses: b.misses, sides: [b.me.sides, b.rv.sides], E: [Math.round(b.me.E), Math.round(b.rv.E)], coins: S.coins, bows: R.bows.slice(), advice: advise(b, rv) };
      R.last = { game: R.game, i: R.i, how: how, paid: pay, win: b.win };
      var next = RIVALS[R.i + 1];
      if (first && cine) { var ok = cine.itemGet({ back: true, emoji: '\u{1F380}', name: G.ribbons[R.i], over: 'You won', line: (next ? next.name + ' will ' + (R.game === 'push' ? 'push' : 'pull') + ' next. ' : 'You beat all three! ') + '\u{1FA99} +' + pay, done: function () { result(); } }); if (ok) { S.talking = true; return; } }
      result();
    }
    function advise(b, rv) {   /* what decided it, in plain words, and the fruit that helps (the Market's) */
      var me = b.me.st, them = rv.st, fr = (window.WFR_HAVEN781 && WFR_HAVEN781.FRUIT) || [], f = function (k) { return fr.find(function (q) { return q.stat === k; }) || { emoji: '', name: 'fruit' }; };
      if (b.me.sitT > 4 && b.me.puffs) return { stat: 'sta', word: 'Stamina', why: 'Your chick sat puffed out for ' + Math.round(b.me.sitT) + ' s. Cheer sooner (tap, tap, tap), and a long banana makes its puff last.', fruit: f('sta') };
      if (b.game === 'push' && b.how === 'off' && b.win === 'rv' && b.me.st.swim < them.swim && me.str >= them.str - 6) return { stat: 'swim', word: 'Swim', why: 'Your chick lost its balance at the edge. Swim keeps a chick steady there.', fruit: f('swim') };
      if (b.how === 'time') return { stat: 'sta', word: 'Stamina', why: rv.name + ' had more puff left at the end. Stamina makes it last.', fruit: f('sta') };
      return { stat: 'str', word: 'Strength', why: rv.name + (b.game === 'push' ? ' pushed' : ' pulled') + ' harder: Strength ' + them.str + ' to your chick\'s ' + Math.round(me.str) + '.', fruit: f('str') };
    }
    function result() {
      var lt = Lt(), S = lt.S, r = R.result; if (!r) return; var el = panelEl('ring782p'); R.panel = 'result'; S.talking = true; var G = GAMES[r.game];
      var head = r.win === 'me' ? (r.first ? 'You beat ' + r.rival + '!' : 'A win against ' + r.rival + '!') : r.win === 'draw' ? 'A draw!' : r.rival + ' won this time';
      var a = r.advice, tip = r.win === 'me' ? 'Both chicks bowed. ' + (RIVALS[r.i + 1] && !ring().won[r.game + ':' + (r.i + 1)] ? RIVALS[r.i + 1].name + ' is next: ' + RIVALS[r.i + 1].word + '.' : 'Every fruit at Thimble\'s Market and every lesson at the School makes your chick stronger.') :
        'Both chicks bowed. ' + a.why + ' ' + (a.fruit.emoji ? a.fruit.emoji + ' ' : '') + a.fruit.name.replace(/^an? /, 'A ') + ' at Thimble\'s Market (' + a.word + ' +16, \u{1FA99} 3) would help. Then try again!';
      var h = '<div class="place">' + head + '</div><div class="pay">\u{1FA99} +' + r.pay + ' · you have ' + r.coins + '</div><table>';
      h += '<tr><td>' + G.name + (r.how === 'off' ? ' · bumped off the stump' : r.how === 'over' ? ' · pulled over the line' : ' · the time ran out') + '</td><td class="n">' + r.t.toFixed(0) + ' s</td></tr>';
      h += '<tr><td>Puff left · yours / ' + r.rival + '\'s</td><td class="n">' + r.E[0] + ' / ' + r.E[1] + '</td></tr><tr><td>' + (r.game === 'tug' ? 'Heaves on the beat' : 'Sidesteps · yours / ' + r.rival + '\'s') + '</td><td class="n">' + (r.game === 'tug' ? r.heaves : r.sides[0] + ' / ' + r.sides[1]) + '</td></tr><tr><td>Cheers</td><td class="n">' + r.cheers + (r.puffs ? ' (puffed ' + r.puffs + '×)' : '') + '</td></tr></table><div class="note">' + tip + '</div>';
      h += '<button type="button" class="go2" data-again="1">Again</button><button type="button" class="close" data-close="1">Done</button>'; el.innerHTML = h;
    }
    function abort() { if (!R.ph || !cine) return; var sc = cine.current(); if (sc && sc.name === 'ring782') cine.end('abort'); }
    /* EACH FRAME (from the game's loop): the lesson's clock, the chick at school, the teachers' life, the rival waiting */
    var saveT = 0;
    function tick(dt, real) {
      var lt = Lt(), S = lt.S, chick = lt.chick(), inH = HV.on(), t = S.t || 0;
      if (o.classic && o.classic()) return;
      var sc = S.chick && S.chick.school782;
      if (sc && sc.cur && chick && S.nestDone) {
        if (sc.cur.left > 0) { sc.cur.left = Math.max(0, sc.cur.left - (real || dt)); saveT += real || dt; if (saveT > 10) { saveT = 0; lt.save(); } }
        if (sc.cur.left <= 0 && !sc.ready) { sc.ready = true; R.readyT++; lt.save(); lt.toast(LINES.ready(lessonOf(sc.cur.id)), 5200); }
        seatAt(chick, t, real || dt);
      } else readyStar.visible = false;
      if (!inH) return;
      TEACH.forEach(function (m, i) { var act = sc && sc.cur && sc.cur.left > 0 && sc.cur.id === m.lesson; var hop = act ? Math.abs(Math.sin(t * 3 + i)) * 0.05 : Math.max(0, Math.sin(t * 1.3 + i * 2) - 0.92) * 0.6; m.body.position.y = -0.4 * (1 - m.sc) + hop;
        var w = act ? Math.sin(t * 5 + i) * 0.5 : Math.sin(t * 1.1 + i) * 0.06; m.wings[0].rotation.z = w; m.wings[1].rotation.z = -w; if (m.body.userData.tail) m.body.userData.tail.rotation.x = -Math.PI / 2 - 0.5 + (i === 1 ? Math.sin(t * 6) * 0.25 : 0); m.sp.visible = !!act || (Math.sin(t * 0.7 + i * 2.1) > 0.3); });
      if (!R.ph) { if (!RV.g.visible) idleRival(); var hp = Math.max(0, Math.sin(t * 2.2)); RV.body.position.y = -0.4 * (1 - RV.sc) + (hp > 0.9 ? (hp - 0.9) * 2.4 : 0) * RV.sc; var wz = Math.sin(t * 1.7) * 0.1; RV.wings[0].rotation.z = wz; RV.wings[1].rotation.z = -wz; }
    }
    /* THE HAVEN'S BUTTON: the School and the Ring (haven781 asks; its own labels) */
    function press(where) {
      var lt = Lt(); if (o.classic && o.classic()) return false; if (R.ph || R.panel || (cine && cine.on())) return false;
      if (where === 'school') { var sc = school(); if (sc.cur && sc.cur.left <= 0) return pickup() || openSchool('lessons'); return openSchool('lessons'); }
      if (where === 'ring') return openRing();
      return false;
    }
    idleRival();
    var api = {
      root: root, tick: tick, trick: trick, tricks: tricks, press: press, away: away, holds: function () { return !!(R.ph || away()); }, on: function () { return !!R.ph; },
      openSchool: openSchool, openRing: openRing, closePanel: closePanel, drop: drop, pickup: pickup, start: start, abort: abort,
      fast: function (k) { R.fast = Math.max(1, +k || 1); return R.fast; }, tap: function () { if (!B || R.ph !== 'run') return null; return tap(B); },
      skip: function (s) { var sc = school(); if (!sc.cur) return null; sc.cur.left = Math.max(0, sc.cur.left - (+s || 0)); return sc.cur.left; },
      peek: function () { var sc = (function () { try { return JSON.parse(JSON.stringify(school())); } catch (e) { return null; } })(), rg = (function () { try { return JSON.parse(JSON.stringify(ring())); } catch (e) { return null; } })();
        return { ph: R.ph, game: R.game, i: R.i, panel: R.panel, tab: R.tab, scenes: R.scenes, learned: R.learned, drops: R.drops, lastLearn: R.lastLearn || null, readyT: R.readyT, school: sc, ring: rg, away: away(), tricks: tricks(), trickNow: R.trickNow || null, trickCount: R.tricks, trickShown: R.trickShown, note: note.visible, doodle: doodle.visible,
          B: B ? { t: +B.t.toFixed(2), x: +B.x.toFixed(3), done: B.done, win: B.win, how: B.how, me: { E: +B.me.E.toFixed(1), puff: B.me.puff, puffs: B.me.puffs, cheers: B.me.cheers, sitT: +B.me.sitT.toFixed(2) }, rv: { E: +B.rv.E.toFixed(1), puff: B.rv.puff }, heaves: B.heaves, misses: B.misses, beat: K.BEAT, lastBeat: B.lastBeat } : null,
          result: R.result, last: R.last, bows: R.bows.slice(), aborts: R.aborts, hearts: R.hearts, cam: R.cam || null, hud: !!document.getElementById('ring782h'), rival: { vis: RV.g.visible, i: RV.i, at: RV.g.position.toArray() }, star: readyStar.visible, error: API.error }; }
    };
    API.inst = api; return api;
  }
  API.create = create; API.sim = sim; API.rate = rate; API.step = step; API.bout = bout; API.tap = tap; API.stars = stars; API.mult = mult; API.cheerE = cheerE; API.heaveK = heaveK; API.bal = bal; API.sideRate = sideRate;
  API.LESSONS = LESSONS; API.RIVALS = RIVALS; API.GAMES = GAMES; API.PRICE = PRICE; API.PAY = PAY; API.LINES = LINES; API.K = K;
  return API;
})();
