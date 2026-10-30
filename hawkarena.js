/* WINGS FOR ROUGE · board 703, ship 9 · THE ARENA on Damned (Trunks, Oct 28 2026). Pure logic: no THREE, no DOM. Free flight inside a ring.
   Marth, verbatim: "the friend birds perch on some of the branches and some of the dead trees to help assist you. (the friend birds and the hawks will try and swoop in to hit each of you) think of the arena fight like jump force or naruto storm"
   and (Oct 23 night): "the arena where the crow and i are in (think the chunin exams) an area where the fighting is bordered by a n invisible cirle of sorts in the shubbery and trees. then we can have the hawk attack every 0.8 seconds - 8 seconds, the max attacks he can do in 5 seconds is 3 attacks tho. so in 10 seconds if he's lucky he can maybe squeeze 6-7. yes my friends and his helpers attacking every 5-10 secinds is good, we also need a sidestep button now, to dodge he he, yes i like the parry /perfect stun idea. if u die you restart back on your island and it says you think you had a bad dream."
   PLAN_703 Ship 9 (HIS, Oct 16): her friends land 18% of the time. The chick cheers from its branch and is never in the fight (switch: o.chickSwoops, default false; Marth decides).
   The fight model is hawkfight.js's (warn, dive, sidestep or parry judged like a song note, a hit only while he is stunned); hawkfight.js is never edited.
   Shape: create(o) -> arena; arena.start(); arena.step(dt, { me, sidestep, attack, tapLag }) once a frame; it returns ONE shared state (copy it, never keep it). 'down' and 'won' are the html's to stage.
   THE THREE PHASES (Oct 28, Marth: "the hawk battle has to be tremendous", his pick "Phases"). Events stay plain strings (nothing allocates per frame); their payload is on the state in the same frame:
     'phase' (s.phase = 2 or 3, then 1.6 s with no Hawk attack: the roar and the storm are the game's) · 'warn' a strike's warning (s.kind 'single'|'double'|'feint', s.strike 1) · 'warn2' a double's second warning (s.strike 2 once the first is judged)
     'feintwarn' a feint's fake warning (s.feint true; it can never land) · 'feint' he pulls away; the same frame brings the fresh 'warn' from another side (s.warnDir turns). s.phase / s.kind / s.strike / s.feint and peek().phase etc. carry the same. */
window.WFR_HAWKARENA = (function () {
  'use strict';
  /* design numbers: every one a DRAFT, his thumb decides */
  var FEATHERS = 3;                         /* her feathers; a hit costs one; none left = 'down' */
  var HP0 = 100, DMG = [13, 7, 19, 11, 17, 9, 24];   /* 7 hits on him (an odd count, not the meta), uneven; six odd hits leave an even 24, and the 7th always takes whatever is left */
  var GAP_MIN = 0.8, GAP_MAX = 8;           /* s between the Hawk's attacks (his numbers), on his own clock: it stops while he is stunned or climbing back, so real gaps can run longer */
  var CAP_N = 3, CAP_T = 5;                 /* never more than 3 attacks in any 5 s (his numbers): the 4th waits until 5 s after the 1st */
  var FIRST_T = 2.0;                        /* s from start() to his first attack */
  var WARN_A = 0.6, FLY_A = 0.2;            /* the Hawk: 0.6 s of warning, then a 0.2 s homing dash (0.8 s from warning to contact, so it fits his 0.8 s gap) */
  var LOCK_A = 0.15;                        /* s before contact his homing locks */
  var HAWK_R = 14, HAWK_UP = 3, HAWK_W = 0.7;   /* he circles her 14 m out, 3 m up, at 0.7 rad/s */
  var GOOD = 0.2, PERFECT = 0.1, LOOK = 0.5, LAG_MAX = 0.3;   /* the parry, like a song note */
  var STUN_T = 3.5, STUN_PERFECT = 4.5, STUN_DODGE = 3.5, STAGGER_T = 1.5, STUN_REL = 3;   /* s dizzy; a friend's stagger is a short opening; he tumbles 3 m from her */
  var RECOVER_T = 1.2;                      /* s he takes to climb back after a hit or a stun */
  var SIDE_D = 3.0, SIDE_T = 0.35, SIDE_CD = 0.9, SIDE_WIN = 0.6, DODGE_CLEAR = 1.6;   /* the sidestep (hawkfight.js's numbers) */
  var FRIENDS = ['crow', 'bluejay', 'owl', 'eagle', 'falcon'];   /* her friends who swoop; the chick perches apart and cheers */
  var HELPERS = 4;                          /* his helpers, crows of Damned (3-5, DRAFT) */
  var HELPER_HP = 2;                        /* a helper is chased off after 2 landed friend swoops, or at once by her parry (never killed) */
  var SWOOP_MIN = 5, SWOOP_MAX = 10;        /* s between one bird's swoops (his numbers) */
  var SWOOP_FIRST = [2, 7];                 /* s to each bird's first swoop (plant 'perbird' only: the old per-bird clocks) */
  var FRIEND_FIRST = [2, 7], HELPER_FIRST = [5, 10];   /* GROUP CADENCE (Oct 28, the browser guard's thumb): each SIDE swoops one bird at a time, taking turns; its next swoop comes 5-10 s after the last one ENDS; its first at 2-7 s (friends), 5-10 s (helpers) */
  var HAWK_SPACE = 1.5;                     /* s: no helper arrives within 1.5 s of a Hawk arrival: a warning crow waits; if a crow is already diving, the Hawk holds (his clock holds with him) */
  var FRIEND_LAND = 0.18;                   /* a friend's swoop lands 18% of the time (HIS, PLAN_703) */
  var HELPER_TARGET = 0.5;                  /* a friend picks a helper over the Hawk half the time while any helper is left */
  var HELPER_WARN = 0.8, HELPER_FLY = 0.8, HELPER_LOCK = 0.3, FRIEND_FLY = 1.0, BACK_T = 1.2;   /* a helper caws and hops 0.8 s, then dives 0.8 s; a friend flies 1 s; 1.2 s home */
  var SOFT = 4, EDGE_WARN = 6;              /* m: the ring's soft wall starts 4 m inside its edge; the edge warning at 6 m */
  /* THE THREE PHASES (Marth, Oct 28: "the hawk battle has to be tremendous"; his pick "Phases"). Phase 1 above 2/3 hp is the fight above, unchanged. His 0.8 s floor, 3-in-5 s budget, sidestep and parry hold in every phase. */
  var ROAR_T = 1.6;                         /* s: at 2/3 and 1/3 hp he roars ('phase'); no Hawk attack for 1.6 s (the game plays the roar and the storm); the birds keep his 5-10 s, a roar never stretches it */
  var GAP2_MAX = 5, GAP3_MAX = 3.5;         /* s: the top of his gap in phase 2 and 3 (DRAFT); the floor stays his 0.8 */
  var DBL_T = 0.55;                         /* s between the two strikes of a 'double' (phase 2+); each has its own 0.6 s warning and is judged on its own; it costs 2 of the 3-in-5 s budget */
  var FEINT_T = 0.45;                       /* s of a feint's fake warning (phase 3); shorter than WARN_A, so he never dashes on a fake; then a fresh 0.6 s warning from another side */
  var DBL2 = 0.45, DBL3 = 0.35, FEINT3 = 0.35;   /* DRAFT odds: phase 2 doubles 45%; phase 3 doubles 35%, feints 35%, the rest single strikes */
  /* THE SWITCH (Marth, Oct 28: "rememebr the fight on damned is where the switcharoo to being able to use the chic comes in"). create({ segment: { t, hits, hawkAt, bench } }) is the CHICK'S turn:
     the Hawk is HELD (the Eagle has him: mode 'held', he never attacks); only his helpers come, with the same warnings, sidestep and parry; a hit STAGGERS the chick ('hurt' + 'chickhit'),
     its feathers are never spent and it is never 'down'; the turn ENDS ('segend', s.segWhy 'time' | 'hits' | 'helpers') at t s, at the hits-th hit, or when no helper is left. bench: friend
     indices that never swoop (the partner beside her, the Eagle on the Hawk); friends swoop only at helpers. Without o.segment nothing above changes (not one extra roll of the dice). */
  var SEG_T = 40, SEG_HITS = 3, SEG_FIRST0 = 2, SEG_FIRST1 = 4, SEG_GAP0 = 3, SEG_GAP1 = 6;   /* DRAFT: a 40 s turn, 3 hits end it early (never a loss); the helpers' first swoop at 2-4 s, then 3-6 s after the last one ends */
  /* 703p CATCHABLE (Trunks, Oct 29). Marth's field verdict: "even so I can't attack the hawk or reach him in either phases". His design, verbatim: "The speed of the hawk needs to deteriorate or slow down
     just like final chase where u chase shadow or vice versa so u can land a hit. Or they (the hawk) slows to try and hit you and you can dodge and hit him or just dodge and hit him when he's returning to his position".
     Only with create({ reach: true }); without it not one number changes. He no longer circles HER at a fixed 14 m (flying at him moved his circle with her): his pace comes in WAVES, a burst (he keeps
     away, 17 m out, eased fast) then a tired spell (13 m out, eased slowly, circling slower: flying at him closes in); never more than 24 m from her (the rubber band). Three windows, each struck by the
     DASH (⚔️ within 9 m): TIRED, STUN (he slows to strike, a longer telegraph; a dodge commits him 1.4 s, a parry stuns as ever) and RETURN (after a dodge or a miss he flies back out; in reach on the way).
     His 0.8-8 s gaps, 3 in any 5 s, the phases and the birds are untouched. */
  var RA_B = [2.6, 3.6], RA_T = [3.2, 4.2];   /* s: a burst, then a tired spell (DRAFT) */
  var RA_RB = 17, RA_EB = 3, RA_RT = 13, RA_ET = 0.45, RA_WT = 0.35;   /* bursting: 17 m out, eased at 3/s; tired: 13 m out, eased at 0.45/s, circling at 35% */
  var RA_BAND = 24, RA_REACH = 9, RA_DASH_W = 0.22, RA_DASH_T = 0.26;   /* the band; the dash's reach, windup and dash */
  var RA_WARN = 0.9, RA_LOCK = 0.35, RA_DODGE = 1.4, RA_RETURN = 1.8, RA_RET_E = 0.9, RA_NOW = 0.6;   /* he slows to strike (0.9 s telegraph, his aim set 0.35 s out); committed 1.4 s after a dodge; 1.8 s back out at 0.9/s; '↔️ NOW' 0.6 s before contact */
  var RA_FORCE = 6.4;                        /* s of real time after his last warning: he strikes (his 8 real seconds, with room for a dash, a feint and slow-mo) */
  var RA_NB_R = 22, RA_NB_E = 3;              /* plant 'noband': 22 m out, eased fast, whatever his wave (the control) */
  var API = null;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function num(x, lo, hi) { x = +x; return x === x && x !== Infinity && x !== -Infinity ? clamp(x, lo, hi) : 0; }
  function tanh(x) { var e = Math.exp(-2 * Math.abs(x)), v = (1 - e) / (1 + e); return x < 0 ? -v : v; }

  function create(o) {   /* never throws into the game */
    try { var a = build(o || {}); API.last = a; return a; } catch (err) { API.error = String(err && err.message || err); return deadArena(); }
  }
  function deadArena() { var no = function () { return null; }; return { dead: true, _plant: null, start: function () { return false; }, step: no, stop: no, on: function () { return false; }, birds: [], peek: function () { return { ready: false, dead: true }; } }; }

  function build(o) {
    var rand = typeof o.rand === 'function' ? o.rand : Math.random;
    var rg = o.ring || {}, RING = { cx: +rg.cx || 0, cz: +rg.cz || 0, r: +rg.r > 2 * SOFT ? +rg.r : 40, floor: rg.floor != null ? +rg.floor : 0, ceil: rg.ceil != null ? +rg.ceil : 40 };
    if (!(RING.ceil - RING.floor > 2 * SOFT)) RING.ceil = RING.floor + 40;
    var chickSwoops = !!o.chickSwoops, pp = o.perches || {}, PH0 = o.phase === 2 || o.phase === 3 ? o.phase : 1;   /* o.phase: start a fight in phase 2 or 3 (the guard, or a rematch); hp starts at the top of that phase */
    function perchAt(list, i, ang) { var q = list && list[i]; return q ? { x: +q.x || 0, y: +q.y || 0, z: +q.z || 0 } : { x: RING.cx + Math.sin(ang) * RING.r * 0.95, y: RING.floor + 6 + 4 * ((i * 0.37) % 1), z: RING.cz + Math.cos(ang) * RING.r * 0.95 }; }   /* the dead trees on the ring's edge, unless the html gives them */
    var B = [];
    function bird(kind, name, perch) { var b = { kind: kind, name: name, perch: perch, pos: { x: perch.x, y: perch.y, z: perch.z }, from: { x: 0, y: 0, z: 0 }, aim: { x: 0, y: 0, z: 0 },
      state: 'perched', st: 0, next: 0, target: -1, hp: HELPER_HP, alive: true, arrive: 0, arrived: false, tapped: false, last: -99, swoops: 0, landed: 0 }; B.push(b); return b; }
    FRIENDS.forEach(function (n, i) { bird('friend', n, perchAt(pp.friends, i, -0.9 + i * 0.45)); });
    var chick = bird('chick', 'chick', perchAt(pp.chick ? [pp.chick] : null, 0, -1.6));
    if (chickSwoops) chick.kind = 'friend';
    var NH = o.helperN != null ? Math.round(clamp(+o.helperN || 0, 0, HELPERS)) : HELPERS;   /* o.helperN: fewer of his crows (the switch: only those still in the fight); default all */
    for (var hi = 0; hi < NH; hi++) bird('helper', 'crow of Damned ' + (hi + 1), perchAt(pp.helpers, hi, Math.PI - 0.7 + hi * 0.45));
    var NB = B.length;
    var sg = o.segment && typeof o.segment === 'object' ? o.segment : null, SEG = null;   /* THE SWITCH: the chick's turn (null: the fight exactly as before) */
    if (sg) { var ha = sg.hawkAt || {}; SEG = { t: num(sg.t, 5, 300) || SEG_T, hits: Math.round(num(sg.hits, 1, 9)) || SEG_HITS, hawk: { x: ha.x != null ? +ha.x || 0 : RING.cx, y: ha.y != null ? +ha.y || 0 : RING.ceil - SOFT, z: ha.z != null ? +ha.z || 0 : RING.cz + RING.r } };
      (Array.isArray(sg.bench) ? sg.bench : []).forEach(function (k) { var fb = B[k | 0]; if (fb && fb.kind === 'friend') fb.bench = true; }); }

    var R = { on: false, dead: false, plant: null, t: 0, act: 0, mode: 'idle', mt: 0, hp: HP0, hits: 0, feathers: FEATHERS, lag: 0, hold: false, hAct: -1, fAct: -1, hRot: -1, fRot: -1, hNext: 0, fNext: 0,
      nextAct: 0, lastWarnAct: -1, warnStart: 0, arrive: 0, tapped: false, arrived: false, stunT: 0, stunKind: '', stunHit: false, ang: 0, atkAng: 0,
      attacks: 0, cap5Max: 0, gapMin: 1e9, gapMax: 0, parG: 0, parP: 0, dodges: 0, misses: 0, hurts: 0, whiffs: 0, staggers: 0, lastJudge: '',
      sideT: 0, sideCd: 0, lastSide: -99, sdx: 0, sdz: 0, friendSwoops: 0, friendLanded: 0, helperSwoops: 0, helpersOff: 0, inRing: true, edge: 0, dmgN: 0,
      phase: 1, phaseN: 0, kind: '', nextKind: 'single', strike: 0, dbl: false, arr2: 0, w2Done: false, fake: false, fakeEnd: 0, doubles: 0, feints: 0, segHits: 0, segWhy: '' };
    var W8 = [-99, -99, -99, -99, -99, -99, -99, -99], W8i = 0, DMG_LOG = [0, 0, 0, 0, 0, 0, 0, 0];
    var ME = { x: 0, y: 0, z: 0 }, HK = { x: 0, y: 0, z: 0 }, AIM = { x: 0, y: 0, z: 0 }, EV = [];
    var ST = { mode: 'idle', hp: HP0, feathers: FEATHERS, me: ME, hawk: HK, warn: false, warnDir: 0, arriveIn: 0, stunT: 0, side: { on: false, x: 0, z: 0, d: SIDE_D, t: SIDE_T }, edge: 0, edgeWarn: false, inRing: true, helperIncoming: false, helperArriveIn: 0, hold: false, events: EV, birds: B,
      phase: 1, kind: '', strike: 0, feint: false, segment: !!SEG, segHits: 0, segWhy: '',
      reach: false, wave: '', win: '', inRange: false, far: 0, dashWind: false, dashLeft: 0, now: '', hitsLeft: 0 };   /* 703p: what the screen shows */
    var RCH = !!o.reach && !SEG;   /* 703p: the catchable arena (never in the chick's turn) */
    var RAP = { pm: 'idle', struckNow: false, lastWarnT: -1, minArr: 0, forced: 0, gMin: 1e9, gMax: 0, wave: 'burst', waveEnd: 0, dashT: -1, dashWin: '', tiredHit: false, retOpen: false, retHit: false, dashes: 0, far: 0, byTired: 0, byStun: 0, byReturn: 0, dashMiss: 0, tiredWaves: 0, nearest: 1e9, maxD: 0 };

    /* ARENA-TICK BEGIN: nothing between these markers allocates (tests/hawkarena-unit.js reads this text) */
    function rnd() { return num(rand(), 0, 0.999999); }
    function warnA() { return R.plant === 'nowarn' ? 0 : RCH ? RA_WARN : WARN_A; }   /* 703p: he slows to strike */       /* plant 'nowarn': the control for claim (c) */
    function warnH() { return R.plant === 'nowarn' ? 0 : HELPER_WARN; }
    function swoopGap(h) { return SEG && h ? SEG_GAP0 + rnd() * (SEG_GAP1 - SEG_GAP0) : SWOOP_MIN + rnd() * (SWOOP_MAX - SWOOP_MIN); }   /* h: the helpers' side (the switch draws its own gap; one roll either way) */
    function done() { return R.mode === 'won' || R.mode === 'down' || R.mode === 'segend'; }   /* the fight (or the chick's turn) is over */
    function helpersLeft() { var n = 0; for (var i = 0; i < NB; i++) if (B[i].kind === 'helper' && B[i].alive) n++; return n; }
    function segEnd(why) { if (!SEG || R.plant === 'segstuck' || R.mode === 'segend') return; R.segWhy = why; setMode('segend'); ev('segend'); }   /* plant 'segstuck': the turn never ends, the control */
    function active(b) { return b.alive && (b.state === 'warn' || b.state === 'swooping' || b.state === 'returning'); }
    function pickNext(kind, from) { for (var k = 1; k <= NB; k++) { var j = (from + k + NB) % NB; if (B[j].kind === kind && B[j].alive && B[j].state === 'perched' && !B[j].bench) return j; } return -1; }   /* the next bird of that side, in turn */
    function groupStep() {   /* each side's ONE clock (plant 'perbird': every bird on its own clock again, the control for claim (d)) */
      if (R.plant === 'perbird' || done()) return;
      if (R.hAct >= 0 && !active(B[R.hAct])) { R.hAct = -1; R.hNext = R.t + swoopGap(true); }
      if (R.fAct >= 0 && !active(B[R.fAct])) { R.fAct = -1; R.fNext = R.t + swoopGap(); }
      var j;
      if (R.hAct < 0 && R.t >= R.hNext) { j = pickNext('helper', R.hRot); if (j >= 0) { R.hRot = j; R.hAct = j; launch(B[j]); } }
      if (R.fAct < 0 && R.t >= R.fNext && (!SEG || helpersLeft() > 0)) { j = pickNext('friend', R.fRot); if (j >= 0) { R.fRot = j; R.fAct = j; launch(B[j]); } }
    }
    function spaced(arr) {   /* a helper waits for the Hawk's strike (both strikes of a double) to pass (plant 'nospace': the control for the fair-thumb claim) */
      if (R.plant === 'nospace' || !hawkIncoming()) return arr; var a2 = R.dbl ? R.arr2 : R.arrive;
      return Math.abs(arr - R.arrive) < HAWK_SPACE || Math.abs(arr - a2) < HAWK_SPACE ? a2 + HAWK_SPACE : arr;
    }
    function helperBlocks() {   /* a crow already diving (or just struck) is too close to where the Hawk would land (either strike of a double; a feint's real strike): he holds */
      if (R.plant === 'nospace') return false; var k = R.nextKind, arr = R.t + (k === 'feint' ? FEINT_T : 0) + warnA() + FLY_A, arr2 = k === 'double' ? arr + DBL_T : arr;
      for (var i = 0; i < NB; i++) { var b = B[i]; if (b.kind === 'helper' && b.swoops > 0 && b.state !== 'warn' && (Math.abs(b.arrive - arr) < HAWK_SPACE || Math.abs(b.arrive - arr2) < HAWK_SPACE)) return true; }
      return false;
    }
    function gapTop() { return R.phase === 3 ? GAP3_MAX : R.phase === 2 ? GAP2_MAX : GAP_MAX; }
    function gapDraw() { return GAP_MIN + rnd() * (gapTop() - GAP_MIN); }
    function rollKind() {   /* phase 1 rolls nothing (its dice stay as they were) */
      if (R.phase < 2) return 'single'; var r = rnd();
      if (R.phase === 2) return r < DBL2 ? 'double' : 'single';
      return r < DBL3 ? 'double' : r < DBL3 + FEINT3 ? 'feint' : 'single';
    }
    function launch(b) {
      b.last = R.t; b.swoops++; copy3(b.from, b.pos); b.st = 0; b.arrived = false; b.tapped = false;
      if (b.kind === 'helper') { R.helperSwoops++; b.state = 'warn'; b.arrive = spaced(R.t + warnH() + HELPER_FLY); copy3(b.aim, ME); ev('helperwarn'); return; }
      R.friendSwoops++; b.state = 'swooping'; b.target = -1;
      if (SEG || rnd() < HELPER_TARGET) { var alive = 0, j; for (j = 0; j < NB; j++) if (B[j].kind === 'helper' && B[j].alive) alive++;
        if (alive > 0) { var pick = Math.floor(rnd() * alive); for (j = 0; j < NB; j++) if (B[j].kind === 'helper' && B[j].alive) { if (pick === 0) { b.target = j; break; } pick--; } } }
      ev('friendswoop');
    }
    function ev(n) { EV.push(n); }
    function setMode(m) { R.mode = m; R.mt = 0; R.hold = false; }
    function ring(p) {   /* the invisible ring: a soft wall, so she is eased back and can never cross it (plant 'nowall': the control for claim (e)) */
      var dx = p.x - RING.cx, dz = p.z - RING.cz, d = Math.sqrt(dx * dx + dz * dz), inner = RING.r - SOFT;
      R.edge = clamp((d - (RING.r - EDGE_WARN)) / EDGE_WARN, 0, 1);
      if (R.plant === 'nowall') return;
      if (d > inner) { var nd = inner + SOFT * tanh((d - inner) / SOFT) * 0.98; p.x = RING.cx + dx / d * nd; p.z = RING.cz + dz / d * nd; }
      var lo = RING.floor + SOFT, hi2 = RING.ceil - SOFT;
      if (p.y < lo) p.y = lo - SOFT * tanh((lo - p.y) / SOFT) * 0.98; else if (p.y > hi2) p.y = hi2 + SOFT * tanh((p.y - hi2) / SOFT) * 0.98;
    }
    function inside(p) { var dx = p.x - RING.cx, dz = p.z - RING.cz; return dx * dx + dz * dz < RING.r * RING.r && p.y > RING.floor && p.y < RING.ceil; }
    function dist(a, x, y, z) { var dx = a.x - x, dy = a.y - y, dz = a.z - z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
    function lerp3(out, a, b, k) { out.x = a.x + (b.x - a.x) * k; out.y = a.y + (b.y - a.y) * k; out.z = a.z + (b.z - a.z) * k; }
    function copy3(out, a) { out.x = a.x; out.y = a.y; out.z = a.z; }
    function stunHawk(len, kind, name) { R.stunT = len; R.stunKind = kind; R.stunHit = false; R.dbl = false; R.fake = false; setMode('stun'); ev(name); }   /* a stun ends the whole attack: a double's second strike, a feint's real strike, never come */
    function stunned() { return R.mode === 'stun' && R.stunT > 0; }
    function hurt() { if (R.plant === 'nohurt') return; if (SEG && R.plant !== 'chickdown') { R.segHits++; R.hurts++; ev('hurt'); ev('chickhit'); if (R.segHits >= SEG.hits) segEnd('hits'); return; }   /* the switch: a stagger, never a feather (plant 'chickdown': the control) */
      R.feathers--; R.hurts++; ev('hurt'); if (R.feathers <= 0) { R.feathers = 0; setMode('down'); ev('down'); } }   /* feathers puff: never a wound; plant 'nohurt': the control for claim (f) */
    function teamHp(hp) {   /* board 721 (co-op, his ruling "all boss fights will be 2 players"): another player's hits on the ONE Hawk; this engine keeps attacking its own bird on its own clock */
      hp = num(hp, 0, HP0); if (!(hp < R.hp)) return; R.hp = hp; R.team++; ev('teamhit');
      if (R.hp <= 0) { setMode('won'); ev('won'); return; }
      var np = R.hp * 3 <= HP0 ? 3 : R.hp * 3 <= HP0 * 2 ? 2 : 1;
      if (np > R.phase) { while (R.phase < np) { R.phase++; R.phaseN++; ev('phase'); } if (R.mode !== 'stun') { setMode('roar'); var g = gapDraw(); R.nextAct = R.lastWarnAct >= 0 ? Math.max(R.act, R.lastWarnAct + g) : R.act + g; R.nextKind = rollKind(); } }
    }
    function hitHawk() {
      var d = R.hits >= DMG.length - 1 ? R.hp : DMG[R.hits]; R.hp = Math.max(0, R.hp - d); R.hits++; if (R.dmgN < DMG_LOG.length) { DMG_LOG[R.dmgN] = d; R.dmgN++; }
      R.stunHit = true; R.stunT = 0; ev('struck');
      if (R.hp <= 0) { setMode('won'); ev('won'); return; }
      var np = R.hp * 3 <= HP0 ? 3 : R.hp * 3 <= HP0 * 2 ? 2 : 1;
      if (np > R.phase || (R.plant === 'phasetwice' && R.phase > 1)) {   /* at 2/3 and 1/3 he changes, once each (plant 'phasetwice': the control) */
        if (np <= R.phase) { R.phaseN++; ev('phase'); }
        while (R.phase < np) { R.phase++; R.phaseN++; ev('phase'); }
        setMode('roar'); var g = gapDraw(); R.nextAct = R.lastWarnAct >= 0 ? Math.max(R.act, R.lastWarnAct + g) : R.act + g; R.nextKind = rollKind();   /* faster from his very next attack; still >= 0.8 s after his last */
      } else setMode('recover');
    }
    function judge(arrive) { var d = (R.t - R.lag) - arrive; return d < -LOOK ? 9 : d; }   /* the tap's true time minus the contact; 9 = too early to judge */
    function hawkIncoming() { return R.mode === 'warn' || R.mode === 'dive'; }
    function helperIncoming(b) { return b.kind === 'helper' && b.alive && (b.state === 'warn' || b.state === 'swooping'); }
    function capFits(k) {   /* the 3-in-5 s budget counts STRIKES: a double spends 2, a feint only its real strike (in phase 1 this is the old test: the 3rd last strike inside 5 s refuses) */
      var n = k === 'double' ? 2 : 1, t0 = k === 'feint' ? R.t + FEINT_T : R.t, lim = R.plant === 'cap4' || R.plant === 'cap4noslow' ? CAP_N + 1 : CAP_N, j, i, c, tj;   /* plant 'cap4': a 4-in-5 s budget, the control */
      for (j = 0; j < n; j++) { tj = t0 + j * DBL_T; c = j + 1; for (i = 0; i < 8; i++) if (tj - W8[i] <= CAP_T + 0.001) c++; if (c > lim) return false; }
      return true;
    }
    function spend() { W8[W8i] = R.t; W8i = (W8i + 1) % 8; var c = 0; for (var i = 0; i < 8; i++) if (W8[i] > R.t - CAP_T) c++; if (c > R.cap5Max) R.cap5Max = c; }   /* one strike, into the budget */
    function realWarn() {   /* a strike's warning ('warn'): his gap counts from here; then 0.6 s, then the 0.2 s dash */
      if (R.lastWarnAct >= 0) { var g = R.act - R.lastWarnAct; if (g < R.gapMin) R.gapMin = g; if (g > R.gapMax) R.gapMax = g; }
      R.lastWarnAct = R.act; spend();
      R.attacks++; R.nextAct = R.act + gapDraw(); R.nextKind = rollKind(); R.strike = 1;
      R.warnStart = R.t; R.arrive = Math.max(R.arrive, R.t + warnA() + FLY_A); R.tapped = false; R.arrived = false; copy3(AIM, ME); setMode('warn'); ev('warn');
    }
    function startAttack() {   /* the gap on his clock (0.8-8 s, 5 s, 3.5 s by phase) AND the 3-in-5 s cap in real time */
      var k = R.nextKind;
      if (R.plant !== 'nocap' && !capFits(k)) return false;   /* plant 'nocap': the control for claim (a) */
      R.kind = k; R.dbl = false; R.fake = false; R.arrive = RCH ? RAP.minArr : 0; R.atkAng = R.ang;
      if (k === 'feint') { R.feints++; R.fake = true; R.strike = 0; R.fakeEnd = R.t + FEINT_T; R.arrive = R.fakeEnd + warnA() + FLY_A; R.warnStart = R.t; R.tapped = false; R.arrived = false; copy3(AIM, ME); setMode('warn'); ev('feintwarn'); return true; }   /* the fake: it spends nothing and can never land */
      realWarn();
      if (k === 'double') { R.doubles++; R.dbl = true; R.w2Done = false; R.arr2 = R.arrive + DBL_T; }
      return true;
    }
    function warn2() { R.w2Done = true; R.arr2 = Math.max(R.arr2, R.t + warnA() + FLY_A); spend(); ev('warn2'); }   /* a double's second warning, its own full 0.6 s */
    function next2() { if (!R.w2Done) warn2(); R.dbl = false; R.strike = 2; R.arrive = R.arr2; R.tapped = false; R.arrived = false; R.attacks++; }   /* the first strike is judged; the second comes on */
    function endFake() {   /* he pulls away ('feint') and comes from another side with a fresh warning */
      R.fake = false; ev('feint');
      if (R.plant === 'feinthit') { hurt(); if (R.mode === 'down') return; }   /* plant 'feinthit': the fake lands, the control */
      R.atkAng = R.atkAng + Math.PI * (0.6 + 0.8 * rnd()); realWarn();
    }
    function resolveHawk() {
      var clear = dist(ME, AIM.x, AIM.y, AIM.z) >= DODGE_CLEAR, stepped = R.lastSide >= R.arrive - SIDE_WIN && R.lastSide <= R.arrive, first = R.dbl;   /* first: a double's first strike, judged on its own */
      if (clear && stepped) { R.dodges++; R.lastJudge = 'dodge'; if (first) { ev('dodge'); next2(); } else stunHawk(RCH ? RA_DODGE : STUN_DODGE, 'dodge', 'dodge'); return; }
      if (clear) { R.misses++; ev('miss'); if (first) next2(); else setMode(RCH ? 'recover' : 'circle'); return; }   /* 703p: a miss sends him back out (the return) */
      hurt(); if (R.mode !== 'down') { if (first) next2(); else setMode('circle'); }
    }
    function birdStep(b, dt) {
      b.st += dt;
      if (!b.alive) { if (b.state === 'out') { b.pos.y += 6 * dt; b.pos.x += (b.pos.x - RING.cx) * 0.2 * dt; b.pos.z += (b.pos.z - RING.cz) * 0.2 * dt; } return; }   /* chased off: it flies away, never killed */
      if (b.kind === 'chick') { b.pos.y = b.perch.y + (R.mode === 'won' ? 0.4 : 0.15) * Math.abs(Math.sin(R.t * 6)); return; }   /* the chick cheers */
      if (done() && b.state !== 'perched' && b.state !== 'returning') { b.state = 'returning'; b.st = 0; copy3(b.from, b.pos); }   /* the fight is over: everyone flies home */
      if (b.state === 'perched') {
        copy3(b.pos, b.perch);
        if (R.plant === 'perbird' && R.mode !== 'won' && R.mode !== 'down' && R.t >= b.next) { b.next = R.t + swoopGap(); launch(b); }
        return;
      }
      if (b.state === 'warn') { b.arrive = spaced(b.arrive); b.pos.y = b.perch.y + 0.5 * Math.abs(Math.sin(R.t * 10)); if (b.arrive - R.t > HELPER_LOCK) copy3(b.aim, ME); if (R.t >= b.arrive - HELPER_FLY) { b.state = 'swooping'; b.st = 0; } return; }
      if (b.state === 'swooping' && b.kind === 'helper') {
        if (b.arrive - R.t > HELPER_LOCK) copy3(b.aim, ME);
        lerp3(b.pos, b.from, b.aim, clamp(1 - (b.arrive - R.t) / HELPER_FLY, 0, 1));
        if (!b.arrived && R.t >= b.arrive) { b.arrived = true; ev('helperarrive');
          var clr = dist(ME, b.aim.x, b.aim.y, b.aim.z) >= DODGE_CLEAR, stp = R.lastSide >= b.arrive - SIDE_WIN && R.lastSide <= b.arrive;
          if (clr && stp) { R.dodges++; ev('helperdodge'); b.state = 'returning'; b.st = 0; copy3(b.from, b.pos); return; } }
        if (b.arrived && R.t - R.lag >= b.arrive + GOOD) {
          if (dist(ME, b.aim.x, b.aim.y, b.aim.z) >= DODGE_CLEAR) ev('helpermiss'); else if (!done()) hurt();
          b.state = 'returning'; b.st = 0; copy3(b.from, b.pos);
        }
        return;
      }
      if (b.state === 'swooping') {   /* a friend's swoop: at the Hawk, or at one of his helpers */
        var tg = b.target >= 0 ? B[b.target] : null, tp = tg ? tg.pos : HK, k = clamp(b.st / FRIEND_FLY, 0, 1); lerp3(b.pos, b.from, tp, k);
        if (k >= 1) {
          var land = rnd() < (R.plant === 'land50' ? 0.5 : FRIEND_LAND); if (land) { b.landed++; R.friendLanded++; }
          if (land && tg && tg.alive) { tg.hp--; ev('chip'); if (tg.hp <= 0) { tg.alive = false; tg.state = 'out'; R.helpersOff++; ev('helperoff'); } }
          else if (land && !tg && (R.mode === 'circle' || R.mode === 'warn')) { R.staggers++; stunHawk(STAGGER_T, 'stagger', 'stagger'); }   /* an opening for her */
          else if (land) ev('friendglance'); else ev('friendmiss');   /* plant 'land50': the control for claim (g) */
          b.state = 'returning'; b.st = 0; copy3(b.from, b.pos);
        }
        return;
      }
      if (b.state === 'returning') { var kb = clamp(b.st / BACK_T, 0, 1); lerp3(b.pos, b.from, b.perch, kb * kb * (3 - 2 * kb)); if (kb >= 1) b.state = 'perched'; }
    }
    /* 703p REACH: the catchable arena (only when RCH; nothing here allocates) */
    function raWave() { if (R.t < RAP.waveEnd) return; var r = rnd();   /* plant 'noslow': he never tires, the control */
      if (RAP.wave === 'burst' && R.plant !== 'noslow' && R.plant !== 'cap4noslow') { RAP.wave = 'tired'; RAP.tiredHit = false; RAP.tiredWaves++; RAP.waveEnd = R.t + RA_T[0] + r * (RA_T[1] - RA_T[0]); ev('tired'); }
      else { RAP.wave = 'burst'; RAP.waveEnd = R.t + RA_B[0] + r * (RA_B[1] - RA_B[0]); ev('burst'); } }
    function raWin() {
      if (stunned() && !R.stunHit) return 'stun';
      if (R.mode === 'recover' && RAP.retOpen && !RAP.retHit && R.plant !== 'noreturn') return 'return';   /* plant 'noreturn': the control */
      if (R.mode === 'circle' && RAP.wave === 'tired' && !RAP.tiredHit) return 'tired';
      return ''; }
    function raD() { return dist(ME, HK.x, HK.y, HK.z); }
    function raIn(w) { return raD() <= (w === 'stun' ? RA_BAND : RA_REACH); }   /* a dizzy Hawk anywhere inside the band (he is helpless), else within RA_REACH */
    function raAtk() {   /* true: the tap is the reach mode's (a dash, or 'far'); false: as ever (a parry, a crow's parry, a whiff) */
      if (RAP.dashT >= 0) return false;   /* mid-dash a tap is still hers: a crow's parry, as ever (the Hawk's hit is already committed, never twice) */
      if (hawkIncoming()) return false;
      var w = raWin(); if (!w) return false;
      if (w !== 'stun') for (var i = 0; i < NB; i++) { var hb = B[i]; if (helperIncoming(hb) && !hb.tapped && judge(hb.arrive) !== 9) return false; }   /* a crow on the beat is parried first, as ever: only a stun hit outranks a parry */
      if (raIn(w)) { RAP.dashT = 0; RAP.dashWin = w; RAP.dashes++; ev('dash'); return true; }
      R.whiffs++; RAP.far++; ev('far'); return true; }
    function raDash(dt) {   /* true while her dash runs (his machine holds, he stays where he is: the game flies her to him); then the hit lands (plant 'nodash': never) */
      if (RAP.dashT < 0) return false;
      RAP.dashT += dt; if (RAP.dashT < RA_DASH_W + RA_DASH_T) return true;
      RAP.dashT = -1;
      if (R.plant === 'nodash' || done()) { RAP.dashMiss++; ev('dashmiss'); return true; }
      if (RAP.dashWin === 'tired') { RAP.tiredHit = true; RAP.byTired++; } else if (RAP.dashWin === 'return') { RAP.retHit = true; RAP.byReturn++; } else RAP.byStun++;
      RAP.retOpen = false; hitHawk(); RAP.wave = 'burst'; RAP.waveEnd = R.t + RA_B[1];   /* struck, he bolts */
      return true; }
    function raDue() { return RCH && R.plant !== 'nocap8' && RAP.lastWarnT >= 0 && R.t - RAP.lastWarnT >= RA_FORCE && !done(); }   /* his 8 real seconds are nearly up */
    function raCrowArr() { var m = 0; for (var i = 0; i < NB; i++) { var b = B[i]; if (b.kind === 'helper' && b.swoops > 0 && b.state === 'swooping' && b.arrive > m) m = b.arrive; } return m > 0 ? m + HAWK_SPACE : 0; }   /* a forced strike lands 1.5 s clear of any crow already diving */
    function raBand() { var dx = HK.x - ME.x, dy = HK.y - ME.y, dz = HK.z - ME.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d > RA_BAND) { var k = RA_BAND / d; HK.x = ME.x + dx * k; HK.y = ME.y + dy * k; HK.z = ME.z + dz * k; } }
    function raReturn(dt) { var e = Math.min(1, dt * RA_RET_E); HK.x += (ME.x + Math.sin(R.ang) * RA_RB - HK.x) * e; HK.y += (ME.y + HAWK_UP - HK.y) * e; HK.z += (ME.z + Math.cos(R.ang) * RA_RB - HK.z) * e; }
    function raPost() {
      for (var i = 0; i < EV.length; i++) { var e = EV[i]; if (e === 'shakeoff' || e === 'miss') { RAP.retOpen = true; RAP.retHit = false; } else if (e === 'struck') { RAP.retOpen = false; RAP.struckNow = true; }
        else if (e === 'warn') { if (RAP.lastWarnT >= 0) { var gg = R.t - RAP.lastWarnT; if (gg < RAP.gMin) RAP.gMin = gg; if (gg > RAP.gMax) RAP.gMax = gg; } RAP.lastWarnT = R.t; } }
      if (raDue() && RAP.dashT < 0 && (R.mode === 'stun' || R.mode === 'recover' || R.mode === 'roar')) { RAP.retOpen = false; setMode('circle'); }   /* his 8 real seconds outrank a dizzy spell, the way back, a roar */
      if (R.mode !== 'recover') RAP.retOpen = false;
      if (RAP.pm !== R.mode) { if (R.mode === 'circle' && (RAP.pm === 'dive' || RAP.pm === 'warn' || RAP.pm === 'recover') && R.plant !== 'noslow' && R.plant !== 'cap4noslow' && !RAP.struckNow && !done()) { RAP.wave = 'tired'; RAP.tiredHit = false; RAP.tiredWaves++; RAP.waveEnd = R.t + RA_T[1]; ev('tired'); } RAP.pm = R.mode; }   /* 703r: he tires after striking (a window his own rhythm opens, whatever the frame time) */
      RAP.struckNow = false;
      var w = raWin(), d = raD(), inc = hawkIncoming(), ai = inc ? R.arrive - R.t : 9, hs = 9;
      for (i = 0; i < NB; i++) { var b = B[i]; if (helperIncoming(b) && b.arrive - R.t < hs) hs = b.arrive - R.t; }
      if (d < RAP.nearest) RAP.nearest = d; if (d > RAP.maxD) RAP.maxD = d;
      ST.reach = true; ST.wave = RAP.wave; ST.win = w; ST.inRange = raIn(w); ST.far = d;
      ST.dashWind = RAP.dashT >= 0 && RAP.dashT < RA_DASH_W; ST.dashLeft = RAP.dashT >= RA_DASH_W ? RA_DASH_W + RA_DASH_T - RAP.dashT : 0;
      ST.now = (inc && !R.tapped && !R.fake && ai <= RA_NOW && ai > -GOOD) || (hs <= RA_NOW && hs > -GOOD) ? 'side' : w && raIn(w) && RAP.dashT < 0 && !inc ? 'atk' : '';
      var hl = R.hp, hi = R.hits, hn = 0; while (hl > 0 && hn < 20) { hl -= hi >= DMG.length - 1 ? hl : DMG[hi]; hi++; hn++; } ST.hitsLeft = hn; }   /* her hits still to land, from his hp (a co-op partner's hits count: board 721) */
    function tick(dt, inp) {
      dt = dt > 0 ? (dt < 0.25 ? dt : 0.25) : 0;
      EV.length = 0;
      if (inp && inp.shared != null && !done()) teamHp(inp.shared);   /* board 721: null or absent = alone, nothing changes */
      var m = inp && inp.me, side = !!(inp && inp.sidestep), atk = !!(inp && inp.attack), i, b;
      ME.x = num(m && m.x, -1e6, 1e6); ME.y = num(m && m.y, -1e6, 1e6); ME.z = num(m && m.z, -1e6, 1e6); ring(ME); R.inRing = inside(ME);
      R.lag = num(inp && inp.tapLag, 0, LAG_MAX); R.t += dt; R.mt += dt; if ((R.mode === 'circle' && !R.hold) || R.mode === 'warn' || R.mode === 'dive') R.act += dt;   /* his clock runs only while he is in the fight (not stunned, not climbing back, not holding for a crow) */
      R.sideT = Math.max(0, R.sideT - dt); R.sideCd = Math.max(0, R.sideCd - dt);
      var over = done();
      if (side && R.sideCd <= 0 && !over) {   /* the sidestep: across the soonest attacker's line, toward the ring's middle */
        var sx = HK.x, sz = HK.z, soon = hawkIncoming() ? R.arrive : 1e9;
        for (i = 0; i < NB; i++) { b = B[i]; if (helperIncoming(b) && b.arrive < soon) { soon = b.arrive; sx = b.pos.x; sz = b.pos.z; } }
        var ax = ME.x - sx, az = ME.z - sz, al = Math.sqrt(ax * ax + az * az) || 1, px = -az / al, pz = ax / al;
        if (px * (RING.cx - ME.x) + pz * (RING.cz - ME.z) < 0) { px = -px; pz = -pz; }
        R.sdx = px; R.sdz = pz; R.sideT = SIDE_T; R.sideCd = SIDE_CD; R.lastSide = R.t; ev('sidestep');
      }
      if (atk && !over && RCH && raAtk()) { /* 703p: the dash (or 'far'); every other tap below, as ever */ }
      else if (atk && !over) {   /* what Attack means is decided here, by the state, and nowhere else */
        if ((stunned() && !R.stunHit && !(RCH && RAP.dashT >= 0)) || (R.plant === 'anyhit' && R.mode !== 'recover')) hitHawk();   /* plant 'anyhit': the control for claim (b) */
        else {
          var best = -1, bd = 9, d0;
          if (hawkIncoming() && !R.tapped) { d0 = judge(R.arrive); if (d0 !== 9) { best = NB; bd = d0; } }
          for (i = 0; i < NB; i++) { b = B[i]; if (helperIncoming(b) && !b.tapped) { d0 = judge(b.arrive); if (d0 !== 9 && Math.abs(d0) < Math.abs(bd)) { best = i; bd = d0; } } }
          if (best < 0) { R.whiffs++; ev('whiff'); }
          else {
            var ad = Math.abs(bd), jg = ad <= PERFECT ? 'perfect' : ad <= GOOD ? 'good' : bd < 0 ? 'early' : 'late'; R.lastJudge = jg;
            if (best === NB) { R.tapped = true;
              if (jg === 'perfect' || jg === 'good') { if (jg === 'perfect') R.parP++; else R.parG++; if (R.dbl) { ev('parry'); next2(); } else stunHawk(jg === 'perfect' ? STUN_PERFECT : STUN_T, 'parry', 'parry'); }   /* a double's first strike parried: no stun yet, the second comes on */
              else ev('parrymiss'); }
            else { b = B[best]; b.tapped = true; if (jg === 'perfect' || jg === 'good') { if (jg === 'perfect') R.parP++; else R.parG++; b.alive = false; b.state = 'out'; R.helpersOff++; ev('helperparry'); ev('helperoff'); } else ev('parrymiss'); }
          }
        }
      }
      /* the Hawk */
      var held = RCH && raDash(dt), cw = HAWK_W, cr = HAWK_R, ce = 3;   /* 703p: while her dash runs his machine holds */
      if (RCH && R.mode === 'circle') { raWave(); if (R.plant === 'noband') { cr = RA_NB_R; ce = RA_NB_E; } else if (RAP.wave === 'tired') { cw = HAWK_W * RA_WT; cr = RA_RT; ce = RA_ET; } else { cr = RA_RB; ce = RA_EB; } }   /* 703p: his waves */
      if (held) { /* 703p: held */ }
      else if (R.mode === 'circle') {
        R.ang += cw * dt; HK.x += (ME.x + Math.sin(R.ang) * cr - HK.x) * Math.min(1, dt * ce); HK.y += (ME.y + HAWK_UP - HK.y) * Math.min(1, dt * ce); HK.z += (ME.z + Math.cos(R.ang) * cr - HK.z) * Math.min(1, dt * ce);
        if (RCH && R.plant !== 'noband') raBand();   /* 703p: THE RUBBER BAND */
        R.hold = false; if (R.act >= R.nextAct || raDue()) { if (!raDue() && (helperBlocks() || (RCH && RAP.wave === 'tired' && !RAP.tiredHit))) R.hold = true; else { if (raDue()) { RAP.minArr = raCrowArr(); RAP.forced++; } startAttack(); RAP.minArr = 0; } }   /* 703p: tired, he holds his strike (his clock holds with him): a clear window */
      }
      if (hawkIncoming() && R.fake && R.t >= R.fakeEnd) endFake();
      if (hawkIncoming() && R.dbl && !R.w2Done && R.t >= R.arr2 - warnA() - FLY_A) warn2();
      if (held) { /* 703p: held */ }
      else if (hawkIncoming()) {
        if (R.arrive - R.t > (RCH ? RA_LOCK : LOCK_A)) copy3(AIM, ME);
        if (R.t < R.arrive - FLY_A) { HK.x += (ME.x + Math.sin(R.atkAng) * HAWK_R - HK.x) * Math.min(1, dt * 4); HK.y += (ME.y + HAWK_UP + 1.5 - HK.y) * Math.min(1, dt * 4); HK.z += (ME.z + Math.cos(R.atkAng) * HAWK_R - HK.z) * Math.min(1, dt * 4); }   /* he flares, wings high */
        else { if (R.mode === 'warn') setMode('dive'); var kk = clamp(1 - (R.arrive - R.t) / FLY_A, 0, 1); HK.x += (AIM.x - HK.x) * kk; HK.y += (AIM.y - HK.y) * kk; HK.z += (AIM.z - HK.z) * kk; }
        if (!R.arrived && R.t >= R.arrive) { R.arrived = true; ev('arrive'); if (dist(ME, AIM.x, AIM.y, AIM.z) >= DODGE_CLEAR && R.lastSide >= R.arrive - SIDE_WIN) resolveHawk(); }
        if (hawkIncoming() && R.arrived && R.t - R.lag >= R.arrive + GOOD) resolveHawk();
      } else if (R.mode === 'stun') {
        R.stunT = Math.max(0, R.stunT - dt); HK.x += (ME.x + Math.sin(R.atkAng) * STUN_REL - HK.x) * Math.min(1, dt * 4); HK.y += (ME.y - HK.y) * Math.min(1, dt * 4); HK.z += (ME.z + Math.cos(R.atkAng) * STUN_REL - HK.z) * Math.min(1, dt * 4);
        if (R.stunT <= 0) { ev('shakeoff'); setMode('recover'); }
      } else if (R.mode === 'recover') { if (RCH && RAP.retOpen) raReturn(dt); else HK.y += 4 * dt; if (R.mt >= (RCH && RAP.retOpen ? RA_RETURN : RECOVER_T)) setMode('circle'); }   /* 703p: the return, in reach on the way out */
      else if (R.mode === 'roar') { HK.y += 2.5 * dt; if (R.mt >= ROAR_T) setMode('circle'); }   /* he rises and roars; the storm thickens (the game's) */
      for (i = 0; i < NB; i++) birdStep(B[i], dt);
      groupStep();
      if (SEG && !done()) { if (R.t >= SEG.t) segEnd('time'); else if (helpersLeft() === 0) segEnd('helpers'); }   /* the chick's turn ends on time, or when his helpers are gone */
      var hs = 1e9; for (i = 0; i < NB; i++) { b = B[i]; if (helperIncoming(b) && b.arrive < hs) hs = b.arrive; }
      if (RCH) raPost();   /* 703p */
      ST.helperIncoming = hs < 1e9; ST.helperArriveIn = hs < 1e9 ? hs - R.t : 0; ST.hold = R.hold;
      ST.mode = R.mode; ST.hp = R.hp; ST.feathers = R.feathers; ST.warn = hawkIncoming(); ST.warnDir = R.atkAng; ST.arriveIn = hawkIncoming() ? R.arrive - R.t : 0; ST.stunT = R.stunT;
      ST.side.on = R.sideT > 0; ST.side.x = R.sdx; ST.side.z = R.sdz; ST.edge = R.edge; ST.edgeWarn = R.edge > 0; ST.inRing = R.inRing;
      var inc = hawkIncoming(); ST.phase = R.phase; ST.kind = R.kind; ST.strike = inc ? R.strike : 0; ST.feint = inc && R.fake; ST.segHits = R.segHits; ST.segWhy = R.segWhy;   /* kind: his current (or last) attack's, so a strike's events always carry it; strike: 1 or 2 while one comes, else 0 */
      return ST;
    }
    /* ARENA-TICK END */

    function kill(err) { R.dead = true; R.on = false; A.dead = true; API.error = String(err && err.message || err); try { if (o.warn) o.warn('hawkarena stopped: ' + API.error); } catch (e) { /* fine */ } }
    function start() {
      if (R.dead) return false;
      R.on = true; R.t = 0; R.act = 0; R.hp = HP0; R.hits = 0; R.feathers = FEATHERS; R.nextAct = FIRST_T; R.lastWarnAct = -1; R.stunT = 0; R.stunHit = false; R.tapped = false; R.arrived = false;
      R.attacks = 0; R.cap5Max = 0; R.gapMin = 1e9; R.gapMax = 0; R.parG = 0; R.parP = 0; R.dodges = 0; R.misses = 0; R.hurts = 0; R.whiffs = 0; R.staggers = 0; R.lastJudge = '';
      R.sideT = 0; R.sideCd = 0; R.lastSide = -99; R.friendSwoops = 0; R.friendLanded = 0; R.helperSwoops = 0; R.helpersOff = 0; R.dmgN = 0; R.ang = 0; R.hold = false;
      R.hAct = -1; R.fAct = -1; R.hRot = -1; R.fRot = -1; R.hNext = HELPER_FIRST[0] + rnd() * (HELPER_FIRST[1] - HELPER_FIRST[0]); R.fNext = FRIEND_FIRST[0] + rnd() * (FRIEND_FIRST[1] - FRIEND_FIRST[0]);
      for (var i = 0; i < 8; i++) W8[i] = -99; W8i = 0;
      for (i = 0; i < NB; i++) { var b = B[i]; b.alive = true; b.hp = HELPER_HP; b.state = 'perched'; b.st = 0; b.swoops = 0; b.landed = 0; b.last = -99; copy3(b.pos, b.perch); b.next = SWOOP_FIRST[0] + rnd() * (SWOOP_FIRST[1] - SWOOP_FIRST[0]); }
      R.segHits = 0; R.segWhy = ''; if (SEG) R.hNext = SEG_FIRST0 + rnd() * (SEG_FIRST1 - SEG_FIRST0);   /* the switch: his helpers come sooner (an extra roll only with o.segment) */
      RAP.wave = 'burst'; RAP.waveEnd = R.t + RA_B[0]; RAP.dashT = -1; RAP.dashWin = ''; RAP.tiredHit = false; RAP.retOpen = false; RAP.retHit = false; RAP.dashes = 0; RAP.far = 0;   /* 703p */
      RAP.lastWarnT = -1; RAP.minArr = 0; RAP.forced = 0; RAP.gMin = 1e9; RAP.gMax = 0; RAP.byTired = 0; RAP.byStun = 0; RAP.byReturn = 0; RAP.dashMiss = 0; RAP.tiredWaves = 0; RAP.nearest = 1e9; RAP.maxD = 0;
      R.phase = PH0; R.phaseN = 0; R.team = 0; R.kind = ''; R.strike = 0; R.dbl = false; R.w2Done = false; R.fake = false; R.doubles = 0; R.feints = 0;
      if (PH0 > 1) { R.hp = Math.floor(HP0 * (PH0 === 2 ? 2 : 1) / 3); R.hits = PH0 === 2 ? 3 : 5; }   /* the top of that phase; his hit count where the damage table would have him */
      R.nextKind = rollKind();   /* last, so phase 1's dice stay exactly as they were */
      HK.x = RING.cx; HK.y = RING.floor + RING.r * 0.3; HK.z = RING.cz + HAWK_R; setMode('circle');
      if (SEG) { copy3(HK, SEG.hawk); if (A._plant !== 'hawkfree') setMode('held'); }   /* the switch: the Eagle holds him where the game says (plant 'hawkfree': he fights the chick, the control) */
      return true;
    }
    function step(dt, input) {   /* a fault stops the arena, never the game */
      if (!R.on || R.dead) return null;
      try { R.plant = A._plant || null; if (R.plant === 'throw') R.no.such = 1; return tick(dt, input); } catch (err) { kill(err); return null; }
    }
    function peek() {
      var alive = 0, i; for (i = 0; i < NB; i++) if (B[i].kind === 'helper' && B[i].alive) alive++;
      return { ready: true, on: R.on, dead: R.dead, error: API.error, mode: R.mode, hp: R.hp, hits: R.hits, feathers: R.feathers, attacks: R.attacks, attacksIn5sMax: R.cap5Max,
        gaps: { min: R.gapMin === 1e9 ? null : +R.gapMin.toFixed(3), max: +R.gapMax.toFixed(3) }, stunT: +R.stunT.toFixed(3), stunKind: R.stunKind, parries: { good: R.parG, perfect: R.parP },
        dodges: R.dodges, misses: R.misses, hurts: R.hurts, whiffs: R.whiffs, staggers: R.staggers, helpersAlive: alive, helpersOff: R.helpersOff, friendSwoops: R.friendSwoops, friendLanded: R.friendLanded,
        helperSwoops: R.helperSwoops, helperIncoming: ST.helperIncoming, helperArriveIn: ST.helperIncoming ? +ST.helperArriveIn.toFixed(3) : null, hold: R.hold, helperNext: +R.hNext.toFixed(3), friendNext: +R.fNext.toFixed(3), lastJudge: R.lastJudge, inRing: R.inRing, edge: +R.edge.toFixed(3), t: +R.t.toFixed(3), dmg: DMG_LOG.slice(0, R.dmgN), ring: Object.assign({}, RING), chickSwoops: chickSwoops,
        segment: !!SEG, segHits: R.segHits, segWhy: R.segWhy,
        reach: RCH ? { wave: RAP.wave, win: raWin(), inRange: raIn(raWin()), d: +raD().toFixed(2), dashing: RAP.dashT >= 0, dashes: RAP.dashes, far: RAP.far, dashMiss: RAP.dashMiss, forced: RAP.forced, realGap: [RAP.gMin === 1e9 ? null : +RAP.gMin.toFixed(3), +RAP.gMax.toFixed(3)], by: { tired: RAP.byTired, stun: RAP.byStun, ret: RAP.byReturn }, tiredWaves: RAP.tiredWaves, nearest: +RAP.nearest.toFixed(2), maxD: +RAP.maxD.toFixed(2), retOpen: RAP.retOpen } : null, segT: SEG ? SEG.t : null, segMaxHits: SEG ? SEG.hits : null, helpersLeft: alive,
        phase: R.phase, phases: R.phaseN, team: R.team || 0, kind: ST.kind, strike: ST.strike, feint: ST.feint, nextKind: R.nextKind, doubles: R.doubles, feints: R.feints,
        birds: B.map(function (b) { return { kind: b.kind, name: b.name, state: b.state, target: b.kind === 'friend' && b.state === 'swooping' ? (b.target >= 0 ? B[b.target].name : 'hawk') : b.kind === 'helper' && b.state !== 'perched' && b.alive ? 'rouge' : null, alive: b.alive, swoops: b.swoops, hp: b.hp }; }), plant: R.plant };
    }
    var A = { dead: false, _plant: null, start: start, stop: function () { R.on = false; }, on: function () { return R.on && !R.dead; }, step: step, peek: peek, birds: B };
    return A;
  }

  API = { create: create, last: null, error: null, GAP_MIN: GAP_MIN, GAP_MAX: GAP_MAX, CAP_N: CAP_N, CAP_T: CAP_T, WARN_A: WARN_A, FLY_A: FLY_A, HELPER_WARN: HELPER_WARN, HELPER_FLY: HELPER_FLY,
    SWOOP_MIN: SWOOP_MIN, SWOOP_MAX: SWOOP_MAX, FRIEND_LAND: FRIEND_LAND, FEATHERS: FEATHERS, SIDE_D: SIDE_D, SIDE_T: SIDE_T, STUN_T: STUN_T, STUN_PERFECT: STUN_PERFECT,
    ROAR_T: ROAR_T, GAP2_MAX: GAP2_MAX, GAP3_MAX: GAP3_MAX, DBL_T: DBL_T, FEINT_T: FEINT_T, HP0: HP0, SEG_T: SEG_T, SEG_HITS: SEG_HITS, RA_REACH: RA_REACH, RA_WARN: RA_WARN, RA_NOW: RA_NOW };   /* 703p */
  return API;
}());
