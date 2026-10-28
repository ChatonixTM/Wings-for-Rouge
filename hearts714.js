/* hearts714.js - BOARDS 714 + 716, HEARTS AND SCATTERING RUNES (Trunks, Oct 28 2026). Pure logic: no THREE, no DOM.
   Marth, Oct 28 2026, verbatim: "a stagger the first time. second time you lose 50 rings and are staggered (a bit shorter tho) (we will add a
   little healthbar (under level 42 you have 4 hearts eaxtly like link or minecraft this is iportant for after beating the hawk and the real
   immersion begins. if ur above level 42 when u beat the hawk youll start with 5 hearts)" and "well the runes should be like Link's hahaah and
   function exactly like sonics ;)". His answers, Oct 28, verbatim: "fix; actually on the first onwards; you will lose 30 runes, (which will
   land (on ground) or float in the air (if flying battle) for a bit blinking, and then will start spinning really fast and have a similar white
   light bar - as to when the cardinal (or any other bird) levels up / when u press menu and switch birds" · "once per fight, or if you you re
   enter their presence / radius, theyll already be on hots for you heh heh" · "5 hearts" (at level 42) · "Yes, heart pieces".
   Shape: attach(S, io) once at boot (S is the game's state; io gives can(), me(), yaw(), air(), floor(x, z), push(dx, dz), onHit(res));
   sync() once a frame (hearts are made at the Hawk's win, a dawn gives one back); step(dt) once a frame (the stagger and its knock-back, the
   blink, the scattered runes: they land or float, blink, are picked up by touching her, then spin fast and leave in a white light bar);
   pose() gives the html the tumble and the blink to lay over the bird for one picture; hit({ from, fightId }) is what the animal core calls
   (from: a name, or a position { x, z } she is knocked away from; fightId: the animal's own encounter: its first hit is the free one, and it
   remembers her). addPiece() gives a heart piece. Saved: S.hearts { max, now, dawn, pieces } (clean / forSave). Never throws into the game.
   Plants (the guards' controls, never on in play): 'always' hearts before the win · 'same' 4 hearts at any level · 'first' the first hit
   costs a heart · 'none' a hit scatters nothing · 'below0' a scatter takes 30 even from fewer · 'unreachable' the runes fly out of her
   reach · 'nosave' the save forgets the hearts · 'nostag' a stagger never holds her · 'notumble' no tumble · 'noblink' no blink · 'nobusy'
   a busy game is hit anyway · 'forget' an animal forgets her after 20 s (a re-entered radius is a new first hit) · 'sink' runes fall in a
   flying fight · 'nobar' no white light bar · 'piece5' five pieces to a heart. (The html adds 'nowake', 'over', 'newprog'.) */
window.WFR_HEARTS = (function () {
  'use strict';
  /* THE RULES (Marth's words, Oct 28; change them here, nowhere else) */
  var RULE_HEARTS_LOW = 4;               /* "under level 42 you have 4 hearts" */
  var RULE_HEARTS_HIGH = 5;              /* "if ur above level 42 when u beat the hawk youll start with 5 hearts"; his answer: "5 hearts" at 42 */
  var RULE_LV_HIGH = 42;                 /* level >= 42 at the moment of the win (his answer); the cap is 60 */
  var RULE_LOSE = 30;                    /* "on the first onwards; you will lose 30 runes": every hit, never more than she has */
  var RULE_FREE_HITS = 1;                /* "once per fight": the first hit of each fight costs no heart (Su's DRAFT read: a stagger and the 30 runes) */
  var RULE_HEART_COST = 1;               /* hearts each later hit in that fight costs (Su's DRAFT read) */
  var RULE_REMEMBER = true;              /* "if you you re enter their presence / radius, theyll already be on hots for you": a fight is never forgotten (this visit) */
  var RULE_PIECES_PER_HEART = 4;         /* "Yes, heart pieces": 4 pieces make a heart (DRAFT, like Link) */
  var RULE_HEARTS_CAP = 10;              /* the most hearts she can grow to (DRAFT) */
  /* the feel (DRAFT: his thumb decides) */
  var STAG1 = 0.6, STAG2 = 0.4;          /* s: the first hit of a fight staggers; later ones "a bit shorter" (his words) */
  var BLINK_T = 1.0;                     /* s of blinking after the stagger: invulnerable, hits ignored */
  var BLINK_HZ = 12.5;                   /* the bird flickers 12.5 times a second */
  var KNOCK1 = 2.6, KNOCK2 = 1.9, KNOCK_T = 0.35;   /* m she is knocked back (the first harder), over 0.35 s, easing out */
  var HOP1 = 4.2, HOP2 = 3.0;            /* m/s: the little hop of the knock (on foot) */
  var TUMBLE1 = [1.15, 0.7], TUMBLE2 = [0.75, 0.45];   /* rad: the tumble's roll and pitch at its peak (the second tumbles less) */
  var POOL = 64, PER = 32;               /* rune pickups: 64 in the pool (two scatters at once), at most 32 a scatter (Sonic drops at most 32 rings); each carries its share */
  var LIFE = 4, BLINK = 1, NOCATCH = 0.5;   /* s: re-collectable for 4 s, blinking in the last 1 s; none caught in the first 0.5 s */
  var LEAVE_T = 0.7, SPIN0 = 4, SPIN1 = 46;   /* then 0.7 s of leaving (the morph column's own fade): spinning up from 4 to 46 rad/s, squeezing into the light */
  var PICK_R = 2.4, PICK_DY = 3;         /* m: her pickup reach (runes.js's own PICK_R), and how far above or below her a rune may be */
  var G = 18, REST = 0.45, BOUNCE = 0.45, SLIDE = 0.7, ROLL = 4;   /* on the ground: gravity, a rune sits 0.45 m over the ground, keeps 45% of its fall, 70% of its slide, and rolls to a stop */
  var RING_V = [5.5, 7.5], RING_UP = [6.5, 7.5];   /* m/s: two rings, inner and outer (Sonic's two rings): they first land about 4 and 6 m out, past her reach, and rest about 6 and 9 m out */
  var AIR_V = [12, 16], AIR_UP = 1.5, AIR_DRAG = 3, AIR_BOB = 0.25;   /* in a flying fight: a burst that slows to a hover about 4 and 5 m out, bobbing 0.25 m */
  var FIGHT_MEM = 64;                    /* fights remembered at once (the oldest is let go past 64) */
  var API = null, S = null, io = null;
  var st = { stagT: 0, stagDur: 0, tumble: TUMBLE1, invT: 0, hits: 0, costs: 0, frees: 0, ignored: 0, scatters: 0, scattered: 0, picked: 0, pickedN: 0, lost: 0, left: 0, downs: 0, fruit: 0, dawn: 0, made: 0, pieceAdds: 0, grown: 0, last: null, error: null, t: 0, anyOn: false,
    kb: { x: 0, z: 0, d: 0, t: 0, on: false }, kbDone: 0, pushed: 0, fights: {}, fightN: 0 };
  var P = [];   /* the pool: built once, never grown */
  for (var i = 0; i < POOL; i++) P.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, share: 0, shown: false, rest: false, air: false, y0: 0, leave: false, lt: 0, rot: 0, spin: 0, bar: 0, squeeze: 1, born: 0 });
  var POSE = { roll: 0, pitch: 0, hidden: false, u: 0 };   /* one shared answer (copy it, never keep it) */

  function num(x, d) { x = +x; return x === x && x !== Infinity && x !== -Infinity ? x : d; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function plant() { return API._plant || null; }
  function now() { return st.t; }   /* the module's own clock: seconds of the dt it is stepped with (game time) */
  function won() { var h = S && S.world && S.world.hawk; return !!(h && h.won === 1); }
  function maxFor(level) { return plant() === 'same' ? RULE_HEARTS_LOW : (num(level, 1) >= RULE_LV_HIGH ? RULE_HEARTS_HIGH : RULE_HEARTS_LOW); }
  function perHeart() { return plant() === 'piece5' ? 5 : RULE_PIECES_PER_HEART; }

  /* the save: a clean copy or null (a bad or missing value is no hearts, never a fault) */
  function clean(h) {
    if (!h || typeof h !== 'object') return null; var mx = Math.floor(num(h.max, 0)); if (!(mx >= 1 && mx <= RULE_HEARTS_CAP)) return null;
    var pc = mx >= RULE_HEARTS_CAP ? 0 : clamp(Math.floor(num(h.pieces, 0)), 0, RULE_PIECES_PER_HEART - 1);
    return { max: mx, now: clamp(Math.floor(num(h.now, mx)), 0, mx), dawn: Math.max(0, Math.floor(num(h.dawn, 0))), pieces: pc };
  }
  function forSave(h) { return plant() === 'nosave' ? null : clean(h); }

  function attach(state, o) { S = state; io = o || {}; return API; }
  function hearts() { return S ? (S.hearts = clean(S.hearts)) : null; }

  /* once a frame: make the hearts at the win (or for a save that won before hearts existed), and a dawn gives one back */
  function sync() {
    if (!S) return null;
    try {
      var h = hearts();
      if (!h && (won() || plant() === 'always')) { var mx = maxFor(S.level); h = S.hearts = { max: mx, now: mx, dawn: Math.max(0, Math.floor(num(S.dawns, 0))), pieces: 0 }; st.made++; return 'made'; }
      if (h) { var d = Math.max(0, Math.floor(num(S.dawns, 0))); if (d > h.dawn) { var gain = d - h.dawn; h.dawn = d; if (h.now < h.max) { h.now = Math.min(h.max, h.now + gain); st.dawn++; return 'dawn'; } } else if (d < h.dawn) h.dawn = d; }
    } catch (e) { st.error = String(e && e.message || e); }
    return null;
  }

  /* a heart piece: 4 make a new heart, which comes full (DRAFT); returns 'piece', 'heart', 'capped' or false (no hearts yet) */
  function addPiece() {
    var h = hearts(); if (!h) return false; if (h.max >= RULE_HEARTS_CAP) return 'capped';
    st.pieceAdds++; h.pieces++; if (h.pieces >= perHeart()) { h.pieces = 0; h.max = Math.min(RULE_HEARTS_CAP, h.max + 1); h.now = Math.min(h.max, h.now + 1); st.grown++; return 'heart'; }
    if (h.pieces > RULE_PIECES_PER_HEART - 1) h.pieces = RULE_PIECES_PER_HEART - 1;   /* plant piece5's fifth piece is never saved past 3 */
    return 'piece';
  }

  function busy() { if (plant() === 'nobusy') return false; try { return io && typeof io.can === 'function' ? !io.can() : false; } catch (e) { return true; } }
  function call(name) { try { return io && typeof io[name] === 'function' ? io[name]() : null; } catch (e) { return null; } }

  /* the fight this hit belongs to: the animal's own id; it remembers her for good (this visit) */
  function fight(info) {
    var id = info && info.fightId != null ? 'id:' + String(info.fightId) : info && typeof info.from === 'string' ? 'from:' + info.from : '_', f = st.fights[id], t = now();
    if (f && (plant() === 'forget' || !RULE_REMEMBER) && t - f.last > 20) { delete st.fights[id]; st.fightN--; f = null; }
    if (!f) { if (st.fightN >= FIGHT_MEM) { var old = null, k; for (k in st.fights) if (!old || st.fights[k].last < st.fights[old].last) old = k; if (old) { delete st.fights[old]; st.fightN--; } } f = st.fights[id] = { hits: 0, first: t, last: t }; st.fightN++; }
    f.hits++; f.last = t; return f;
  }

  /* the hit the animal core calls. Returns { stagger, scattered, heartsNow, first, down, ignored, knock } */
  function hit(info) {
    var res = { stagger: 0, scattered: 0, heartsNow: null, first: false, down: false, ignored: null, from: info && info.from != null ? info.from : null, fightId: info && info.fightId != null ? info.fightId : null, knock: 0, hop: 0 };
    try {
      if (!S) { res.ignored = 'unattached'; return res; }
      var h = hearts(); res.heartsNow = h ? h.now : null;
      if (busy()) { res.ignored = 'busy'; st.ignored++; return res; }
      if (st.invT > 0) { res.ignored = 'blink'; st.ignored++; return res; }
      var f = fight(info); st.hits++;
      var free = f.hits <= RULE_FREE_HITS && plant() !== 'first';
      res.first = f.hits === 1;
      if (free) { st.frees++; res.stagger = STAG1; st.tumble = TUMBLE1; knock(info, KNOCK1); res.knock = KNOCK1; res.hop = HOP1; }
      else { st.costs++; res.stagger = STAG2; st.tumble = TUMBLE2; knock(info, KNOCK2); res.knock = KNOCK2; res.hop = HOP2;
        if (h) { h.now = Math.max(0, h.now - RULE_HEART_COST); res.heartsNow = h.now; if (h.now === 0) res.down = true; } }
      var have = Math.max(0, Math.floor(num(S.runes, 0))), take = plant() === 'none' ? 0 : plant() === 'below0' ? RULE_LOSE : Math.min(RULE_LOSE, have);
      S.runes = have - take; res.scattered = take; if (take > 0) { st.scatters++; st.scattered += take; scatter(take); }
      st.stagT = res.stagger; st.stagDur = res.stagger; st.invT = res.stagger + BLINK_T; st.last = res;
      if (io && typeof io.onHit === 'function') { try { io.onHit(res); } catch (e) { st.error = String(e && e.message || e); } }
    } catch (e) { st.error = String(e && e.message || e); }
    return res;
  }

  /* the knock-back: away from where the hit came from (a position), else straight back from where she faces */
  function knock(info, d) {
    var me = call('me') || { x: 0, z: 0 }, f = info && info.from, x = 0, z = 0;
    if (f && typeof f === 'object' && isFinite(+f.x) && isFinite(+f.z)) { x = num(me.x, 0) - +f.x; z = num(me.z, 0) - +f.z; }
    var L = Math.hypot(x, z);
    if (!(L > 0.01)) { var yaw = num(call('yaw'), 0); x = -Math.sin(yaw); z = -Math.cos(yaw); L = 1; }
    st.kb.x = x / L; st.kb.z = z / L; st.kb.d = d; st.kb.t = 0; st.kb.on = true;
  }
  function knockStep(dt) {
    var k = st.kb; if (!k.on) return;
    var t0 = k.t; k.t = Math.min(KNOCK_T, k.t + dt); var e = function (t) { var u = t / KNOCK_T; return 1 - (1 - u) * (1 - u); };
    var dd = k.d * (e(k.t) - e(t0)); if (k.t >= KNOCK_T) { k.on = false; st.kbDone++; }
    if (dd > 0 && io && typeof io.push === 'function') { try { if (io.push(k.x * dd, k.z * dd) !== false) st.pushed += dd; } catch (e2) { st.error = String(e2 && e2.message || e2); } }
  }

  /* Sonic's scatter: up to 32 pickups in two rings about her, each carrying its share (the shares add up to what she lost). On the ground
     they fly, land and bounce; in a flying fight they burst and float where they burst. Free pieces first, else the oldest are let go. */
  function scatter(n) {
    var me0 = call('me') || { x: 0, y: 0, z: 0 }, kb = st.kb, kd = kb.on ? kb.d : 0, me = { x: num(me0.x, 0) + kb.x * kd, y: num(me0.y, 0), z: num(me0.z, 0) + kb.z * kd };   /* from where the knock will leave her, so none lands in her reach */
    var air = !!call('air') && plant() !== 'sink';
    var k = Math.min(PER, n), base = Math.floor(n / k), extra = n - base * k, far = plant() === 'unreachable', a0 = (st.scatters * 0.618) % 1, used = [];
    for (var i = 0; i < POOL && used.length < k; i++) if (!P[i].on) used.push(P[i]);
    if (used.length < k) { var busyP = P.filter(function (q) { return q.on && used.indexOf(q) < 0; }).sort(function (a, b) { return a.born - b.born; });
      while (used.length < k && busyP.length) { var q0 = busyP.shift(); st.lost += q0.share; used.push(q0); } }
    for (var j = 0; j < used.length; j++) {
      var p = used[j], ring = j % 2, a = (a0 + j / k) * Math.PI * 2, v = (air ? AIR_V[ring] : RING_V[ring]) * (far ? 30 : 1);
      p.on = true; p.age = 0; p.rest = false; p.air = air; p.leave = false; p.lt = 0; p.rot = a; p.spin = SPIN0; p.bar = 0; p.squeeze = 1; p.born = now() + j * 1e-6;
      p.share = base + (j < extra ? 1 : 0); p.shown = true;
      p.x = me.x; p.y = me.y + (air ? 0 : 0.6); p.z = me.z; p.y0 = p.y; p.vx = Math.sin(a) * v; p.vz = Math.cos(a) * v;
      p.vy = air ? (ring ? AIR_UP : -AIR_UP) * (far ? 20 : 1) : RING_UP[ring] * (far ? 20 : 1);
    }
  }
  function floorAt(x, z) { try { var f = io && io.floor ? +io.floor(x, z) : 0; return f === f ? f : 0; } catch (e) { return 0; } }

  /* once a frame (game time): the stagger and the knock run down, the blink, the runes move, she picks up what she touches, the rest blink,
     then spin fast and leave in a white light bar */
  function step(dt) {
    var got = 0;
    try {
      dt = clamp(num(dt, 0), 0, 0.1); st.t += dt;
      knockStep(dt);
      st.stagT = Math.max(0, st.stagT - dt); st.invT = Math.max(0, st.invT - dt);
      var me = null, any = false;
      for (var i = 0; i < POOL; i++) {
        var p = P[i]; if (!p.on) continue;
        if (!me) me = call('me');
        p.age += dt;
        if (p.leave) {   /* spinning up, squeezing into the light, the bar fading as the morph's column does */
          p.lt += dt; var u = Math.min(1, p.lt / LEAVE_T); p.spin = SPIN0 + (SPIN1 - SPIN0) * Math.min(1, u * 2.5); p.rot += p.spin * dt; p.squeeze = Math.max(0.05, 1 - 0.95 * u); p.bar = plant() === 'nobar' ? 0 : 1 - u; p.shown = true;
          if (p.lt >= LEAVE_T) { p.on = false; p.shown = false; p.bar = 0; st.lost += p.share; st.left++; continue; }
          any = true; continue;
        }
        if (p.age >= LIFE) { p.leave = true; p.lt = 0; p.bar = plant() === 'nobar' ? 0 : 1; p.shown = true; any = true; continue; }
        p.rot += p.spin * dt;
        if (p.air) {   /* floating: the burst slows to a hover, and bobs */
          var kd = Math.exp(-AIR_DRAG * dt); p.vx *= kd; p.vz *= kd; p.vy *= kd; p.x += p.vx * dt; p.z += p.vz * dt; p.y0 += p.vy * dt;
          var fl = floorAt(p.x, p.z) + REST; if (p.y0 < fl) p.y0 = fl; p.y = p.y0 + Math.sin(p.age * 3 + p.born * 7) * AIR_BOB;
        } else if (!p.rest) {
          p.vy -= G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          var f = floorAt(p.x, p.z) + REST;
          if (p.y <= f) { p.y = f; if (p.vy < -2) { p.vy = -p.vy * BOUNCE; p.vx *= SLIDE; p.vz *= SLIDE; } else { p.vy = 0; var r = Math.max(0, 1 - ROLL * dt); p.vx *= r; p.vz *= r; if (p.vx * p.vx + p.vz * p.vz < 0.04) { p.vx = 0; p.vz = 0; p.rest = true; } } }
        }   /* at rest it stays where it lay: no floor asked for again (the game's ground walks every house) */
        if (me && p.age >= NOCATCH) { var dx = p.x - me.x, dz = p.z - me.z, dy = p.y - me.y;
          if (dx * dx + dz * dz < PICK_R * PICK_R && Math.abs(dy) < PICK_DY) { p.on = false; p.shown = false; got += p.share; st.pickedN++; continue; } }
        p.shown = p.age < LIFE - BLINK || Math.floor(p.age * 10) % 2 === 0;   /* the last second blinks, five times a second */
        any = true;
      }
      if (got > 0 && S) { S.runes = Math.max(0, Math.floor(num(S.runes, 0))) + got; st.picked += got; }
      st.anyOn = any;
    } catch (e) { st.error = String(e && e.message || e); }
    return got;
  }

  /* the tumble and the blink for this picture: the html lays them over the bird just before it draws, and takes them back just after */
  function pose() {
    POSE.roll = 0; POSE.pitch = 0; POSE.hidden = false; POSE.u = 0;
    if (st.stagT > 0 && st.stagDur > 0 && plant() !== 'notumble') {
      var u = 1 - st.stagT / st.stagDur, s = Math.sin(Math.PI * u), A = st.tumble;   /* up and back down over the stagger: a roll to one side, a pitch back then forward */
      POSE.u = u; POSE.roll = A[0] * s * (1 - 0.25 * u); POSE.pitch = -A[1] * Math.sin(2 * Math.PI * u) * (1 - 0.4 * u);
    } else if (st.invT > 0 && st.stagT <= 0 && plant() !== 'noblink') POSE.hidden = Math.floor(st.invT * BLINK_HZ * 2) % 2 === 1;   /* the blink: off and on, 12.5 times a second */
    return POSE;
  }

  /* a fruit she picks gives one heart back (DRAFT); waking in her nest fills them all (DRAFT); both return whether anything changed */
  function fruit() { var h = hearts(); if (!h || h.now >= h.max) return false; h.now++; st.fruit++; return true; }
  function wake() { var h = hearts(); st.downs++; st.stagT = 0; st.kb.on = false; st.invT = BLINK_T; clear(); if (h) h.now = h.max; return !!h; }
  function clear() { for (var i = 0; i < POOL; i++) { if (P[i].on) st.lost += P[i].share; P[i].on = false; P[i].shown = false; P[i].bar = 0; } st.anyOn = false; }
  function staggered() { return plant() !== 'nostag' && st.stagT > 0; }
  function blinking() { return st.invT > 0 && st.stagT <= 0; }
  function reset(o) { st.stagT = 0; st.invT = 0; st.kb.on = false; clear(); if (o && o.fights) { st.fights = {}; st.fightN = 0; } }   /* the bench's: nothing scattered (and, asked, every fight forgotten) */

  function peek() {
    var h = S ? clean(S.hearts) : null, on = 0, shown = 0, pend = 0, air = 0, leaving = 0, bars = 0;
    for (var i = 0; i < POOL; i++) if (P[i].on) { on++; pend += P[i].share; if (P[i].shown) shown++; if (P[i].air) air++; if (P[i].leave) leaving++; if (P[i].bar > 0) bars++; }
    return { attached: !!S, hearts: h, won: won(), level: S ? S.level : null, runes: S ? S.runes : null, stagT: +st.stagT.toFixed(3), invT: +st.invT.toFixed(3), blinking: blinking(), hits: st.hits, costs: st.costs, frees: st.frees,
      ignored: st.ignored, scatters: st.scatters, scattered: st.scattered, picked: st.picked, pickedN: st.pickedN, lost: st.lost, left: st.left, downs: st.downs, fruit: st.fruit, dawnGave: st.dawn, made: st.made, pieceAdds: st.pieceAdds, grown: st.grown,
      pushed: +st.pushed.toFixed(3), knockOn: st.kb.on, fights: st.fightN, on: on, shown: shown, pending: pend, air: air, leaving: leaving, bars: bars, last: st.last, error: st.error || API.error, plant: plant(), t: +st.t.toFixed(3) };
  }

  API = { attach: attach, sync: sync, step: step, hit: hit, pose: pose, addPiece: addPiece, fruit: fruit, wake: wake, clear: clear, reset: reset, staggered: staggered, blinking: blinking, clean: clean, forSave: forSave, maxFor: maxFor, peek: peek, pieces: P, error: null, _plant: null,
    RULE_HEARTS_LOW: RULE_HEARTS_LOW, RULE_HEARTS_HIGH: RULE_HEARTS_HIGH, RULE_LV_HIGH: RULE_LV_HIGH, RULE_LOSE: RULE_LOSE, RULE_FREE_HITS: RULE_FREE_HITS, RULE_HEART_COST: RULE_HEART_COST, RULE_REMEMBER: RULE_REMEMBER,
    RULE_PIECES_PER_HEART: RULE_PIECES_PER_HEART, RULE_HEARTS_CAP: RULE_HEARTS_CAP,
    STAG1: STAG1, STAG2: STAG2, BLINK_T: BLINK_T, KNOCK1: KNOCK1, KNOCK2: KNOCK2, KNOCK_T: KNOCK_T, TUMBLE1: TUMBLE1, TUMBLE2: TUMBLE2, POOL: POOL, PER: PER, LIFE: LIFE, BLINK: BLINK, NOCATCH: NOCATCH, LEAVE_T: LEAVE_T, PICK_R: PICK_R };
  return API;
}());
