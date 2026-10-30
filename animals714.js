/* WINGS FOR ROUGE · board 714 · THE ANIMAL CORE and the first island animals (Trunks, Oct 28 2026). Pure logic + pure geometry: no THREE, no DOM.
   Marth, verbatim (Oct 28): "were gonna involve / include animals on land, air, and water, some that are nice, and  passive, some that investigate you,
   sometimes attack, some are mostly malicious. we need to ave the foundation from the hawk battle tho"
   and: "i like the boa / snake idea more... make it slither slow and when ur close it gets a '!' and slitehrs quick and can snap at you if you get within
   ditsnace, make EACH enemy have at least 1 attack patern (simple and advanced /heavy attack) especially for the bigger world bosses or mini bosses .
   theyll all have at LEAST 2 move variants"
   Design: PLAN_714_ANIMALS_AND_RIDES_2026-10-28.md §1 (Itachi), with his words above: the boa replaces the feral cat; every enemy has a simple AND a heavy attack.
   Shape: create(o) -> world; world.add(species, x, z) once per animal at boot; world.step(dt, input) once a frame (it returns ONE shared state: copy it, never
   keep it); world.hit(i) when her peck or sweep reaches animal i. ONE state machine for every animal:
     idle -> notice -> (flee | approach | stalk) -> warn -> strike -> recover -> idle      (plus 'asleep' beyond 80 m, or past the six nearest)
   Temperaments are numbers (T): passive 0 never strikes; curious 1 comes to 3-5 m and follows <= 12 s; sometimes 2 is curious, and 25% of approaches turn
   mean; malicious 3 stalks and strikes. The fairness is 703's (hawkfight.js): every strike warned >= 0.6 s (the heavy longer), the parry judged like a
   song note (+-0.2 s, perfect +-0.1, her tap latency taken off), a sidestep is clear when she is out of the strike's hit radius at contact; across ALL
   animals at most 3 strikes in any 5 s and one attacker at a time. Never hunting within 15 m of the nest, under cover, in a tutorial or a talk (input.safe).
   The chick is never a target and never in the hit test. KIT: each species' low-poly model as plain arrays (built once at boot) and its pose, written
   into the same arrays every frame (the html hands them to THREE as one mesh: one draw per animal). Every number is a DRAFT for Marth. */
window.WFR_ANIMALS = (function () {
  'use strict';
  var T = { passive: 0, curious: 1, sometimes: 2, malicious: 3 };
  var FAIR = { WARN_MIN: 0.6, CAP_N: 3, CAP_T: 5, GOOD: 0.2, PERFECT: 0.1, LOOK: 0.5, LAG_MAX: 0.3, NEST_R: 15, WAKE: 60, SLEEP: 80, MAX_AWAKE: 6,
    DULL: 0.6, GRACE: 3, XP: 5, UP_MAX: 1.2, DRIVEN_CD: 25, DIZZY: 0.6, LOW: 12 };   /* LOW (714c): "low over the sea" is within 12 m of the water */   /* DRAFT: sense x0.6 at night; she must be within 1.2 m of the ground for a land strike */
  /* the roster's numbers. moves: [slow, quick]; attacks: [simple, heavy]: warn s, fly s (the strike itself), from m (it starts its warning this close),
     reach m (how far the strike travels), hitR m (her distance from where it lands that still counts as a hit), lock s (before contact its aim stops following her) */
  var SP = {
    boa: { name: 'Jamaican boa', temper: T.malicious, realm: 'land', act: 'night', sense: 9, turn: 2.4, acc: 9, noticeT: 0.6, recover: 1.6, cd: 4, neck: 0.75, wander: 9, heavyP: 0.4, bang: true,
      moves: [{ id: 'slither', v: 0.55 }, { id: 'dart', v: 3.4 }], stalkMv: 1,
      attacks: [{ id: 'snap', warn: 0.7, fly: 0.16, from: 1.3, reach: 1.45, hitR: 0.8, lock: 0.3 }, { id: 'lunge', heavy: true, warn: 1.15, fly: 0.3, from: 2.2, reach: 2.5, hitR: 1.0, lock: 0.35 }] },
    crab: { name: 'Land crab', temper: T.sometimes, realm: 'land', act: 'night', rainOut: true, hide: true, sense: 5, turn: 7, acc: 12, noticeT: 0.45, recover: 1.2, cd: 3, neck: 0.06, wander: 4, heavyP: 0.6, meanP: 0.25, side: true,
      moves: [{ id: 'scuttle', v: 0.9 }, { id: 'dash', v: 2.0 }], stalkMv: 0,   /* Gecarcinus: a ~10 cm shell, quick when it runs */
      attacks: [{ id: 'pinch', warn: 0.7, fly: 0.14, from: 0.3, reach: 0.38, hitR: 0.45, lock: 0.3 }, { id: 'grab', heavy: true, warn: 1.0, fly: 0.22, from: 0.34, reach: 0.44, hitR: 0.5, lock: 0.3, fruit: true }] },
    mongoose: { name: 'Mongoose', temper: T.curious, realm: 'land', act: 'day', sense: 13, turn: 8, acc: 14, noticeT: 1.3, near: [3, 5], follow: 12, wander: 12,
      moves: [{ id: 'trot', v: 2.0 }, { id: 'dart', v: 5.5 }] },
    turtle: { name: 'Sea turtle', temper: T.passive, realm: 'water', sense: 8, turn: 1.4, acc: 3, noticeT: 0.35, wander: 14, depth: 2.2,
      moves: [{ id: 'paddle', v: 0.7 }, { id: 'dive', v: 2.3 }] },
    pelican: { name: 'Brown pelican', temper: T.passive, realm: 'air', sense: 10, turn: 0.9, acc: 4, noticeT: 0.3, alt: 15, ring: 22, wander: 22, fleeMv: 0,
      moves: [{ id: 'soar', v: 6.5 }, { id: 'plunge', v: 9 }] },
    gull: { name: 'Laughing gull', temper: T.sometimes, realm: 'air', sense: 13, turn: 1.8, acc: 6, noticeT: 0.5, recover: 1.6, cd: 4, neck: 0, alt: 10, ring: 14, wander: 14, heavyP: 0.4, meanP: 0.25,
      moves: [{ id: 'glide', v: 6 }, { id: 'beat', v: 9.5 }], stalkMv: 1,
      attacks: [{ id: 'swoop', warn: 0.8, fly: 0.42, from: 5.5, reach: 7, hitR: 1.0, lock: 0.35, air: true }, { id: 'divepeck', heavy: true, warn: 1.2, fly: 0.5, from: 7, reach: 9, hitR: 1.2, lock: 0.4, air: true }] },
  };
  var SEA = {   /* 714c: the sea's three, kept apart from SPECIES (714a's six: its unit guard reads that list as its whole roster); API.SEA */
    /* 714c THE SEA (Trunks, Oct 28; PLAN_714's water row). sea3d: they swim in three dimensions (her depth, not the ground's); the html's ok() keeps each
       in its own water (the dolphins in open water round the boats, the barracuda over the reef's shelf, the shark in the deep by the wind wall: never
       the shallows, never the lake). Under the water her attack button is gone (atkShown), so the defence is SWIMMING: a sea strike leads her (it aims
       where she will be at contact), its aim locks with a flash, and a Stroke or a hard turn after the flash takes her out of its hit radius (the one
       judge, clearOf). give: after that many clean dodges in a row the animal gives up (driven off: a threat's +5 XP, once a day per animal). */
    dolphin: { name: 'Bottlenose dolphin', temper: T.curious, realm: 'water', sea3d: true, low: 12, escort: true, pods: [3, 2], sense: 24, turn: 2.2, acc: 7, noticeT: 0.5, follow: 12, wander: 30, rad: 0.3, cruiseD: 1.3, leapL: 7, leapH: 1.1,
      moves: [{ id: 'cruise', v: 2.6 }, { id: 'leap', v: 9.5 }, { id: 'bowride', v: 8.5 }] },   /* Tursiops truncatus, 2.6 m: cruises, PORPOISES (its leaps) when it hurries, BOW-RIDES under a boat's bow wave (a rare leap), leaps beside her */
    barracuda: { name: 'Great barracuda', temper: T.sometimes, realm: 'water', sea3d: true, onlyDive: true, hang: true, sense: 11, turn: 3.4, acc: 40, noticeT: 0.8, recover: 1.4, cd: 4, wander: 6, heavyP: 0.4, meanP: 0.25, near: [3, 5], follow: 12, rad: 0.09, give: 2,
      moves: [{ id: 'hang', v: 0.3 }, { id: 'dart', v: 10 }], stalkMv: 1, strikeMv: 1,   /* Sphyraena barracuda, 1.3 m: hangs still over the reef, then darts; it shadows a swimmer */
      attacks: [{ id: 'snap', warn: 0.7, fly: 0.22, from: 1.9, reach: 3.4, hitR: 0.75, lock: 0.6, sea: true, lead: true }, { id: 'lunge', heavy: true, warn: 1.1, fly: 0.4, from: 3.6, reach: 6.4, hitR: 0.95, lock: 0.65, sea: true, lead: true }] },   /* reach: its keeping distance plus her own cruise (8 m/s) over the strike */
    shark: { name: 'Caribbean reef shark', temper: T.malicious, realm: 'water', sea3d: true, act: 'night', sense: 18,   /* act: keenest by night (by day its sense x0.6), as real reef sharks hunt */ turn: 1.5, acc: 5, noticeT: 0.9, recover: 1.8, cd: 4.5, wander: 22, heavyP: 0.4, rad: 0.2, ringR: 6.5, give: 3, bed: 1.1,
      moves: [{ id: 'cruise', v: 1.3 }, { id: 'surge', v: 10 }], stalkMv: 0, strikeMv: 1,   /* Carcharhinus perezi, 2.2 m (its burst 10 m/s: she cruises at 8, a Stroke takes her to 13): patrols the drop-off, circles, hunches (its warning), then bumps or runs in to bite */
      attacks: [{ id: 'bump', warn: 0.85, fly: 0.3, from: 2.5, reach: 4.6, hitR: 0.85, lock: 0.62, sea: true, lead: true }, { id: 'biterun', heavy: true, warn: 1.35, fly: 0.6, from: 6.0, reach: 9.8, hitR: 1.05, lock: 0.7, sea: true, lead: true }] },
  };
  var TRIES = [0, 0.7, -0.7, 1.5, -1.5];   /* a blocked step tries these turns, in order */
  var BUMP = { id: 'bump', warn: 0.7, fly: 0.2, from: 1.0, reach: 1.2, hitR: 0.8, lock: 0.3 };   /* no gentle animal has an attack: this exists only so plant 'warn' can show one striking */
  var API = null, TAU = Math.PI * 2;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function num(x, lo, hi) { x = +x; return x === x && x !== Infinity && x !== -Infinity ? clamp(x, lo, hi) : 0; }
  function wrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  function create(o) {   /* never throws into the game */
    try { var w = build(o || {}); API.last = w; return w; } catch (err) { API.error = String(err && err.message || err); return deadWorld(); }
  }
  function deadWorld() { var no = function () { return null; }; return { dead: true, _plant: null, A: [], add: function () { return -1; }, step: no, hit: function () { return 0; }, put: no, peek: function () { return { dead: true }; } }; }

  function build(o) {
    var rand = typeof o.rand === 'function' ? o.rand : Math.random;
    var ground = typeof o.ground === 'function' ? o.ground : function () { return 0; };
    var okAt = typeof o.ok === 'function' ? o.ok : function () { return true; };
    var WATER = typeof o.water === 'number' ? o.water : 0;
    var NEST = o.nest ? [+o.nest[0] || 0, +o.nest[1] || 0] : [1e9, 1e9];
    var A = [];
    var R = { outside: false, grace: 0, t: 0, plant: null, dead: false, attacker: -1, log: new Float64Array(8), logN: 0, mean: false,
      awake: 0, strikes: 0, warns: 0, hurts: 0, steals: 0, parries: 0, perfect: 0, dodges: 0, driven: 0, whiffs: 0, early: 0, cancels: 0, xp: 0, notices: 0 };
    var EVP = [], EV = [], k;
    for (k = 0; k < 32; k++) EVP.push({ type: '', i: -1, heavy: false, atk: '', xp: 0, tgt: '', d: 0 });
    var PEND = [], pendN = 0; for (k = 0; k < 8; k++) PEND.push({ type: '', i: -1, heavy: false, atk: '', xp: 0, tgt: '', d: 0 });   /* events raised between steps (her peck: hit()) wait here for the next step */
    var IN = { hx: 0, hy: 0, hz: 0, up: 0, chick: false, cx: 0, cy: 0, cz: 0, safe: true, night: false, rain: false, attack: false, lag: 0, fruit: false,
      swim: false, vx: 0, vy: 0, vz: 0, lowSea: false };   /* 714c: she swims (under the water); her velocity (a sea strike leads her); she is in the sea or low over it */
    var BT = []; for (k = 0; k < 3; k++) BT.push({ on: false, x: 0, z: 0, yaw: 0, v: 0, bow: 4 });   /* 714c: the boats the dolphins ride (0 the circling boat, 1 the pirate ship), copied in each step */
    var ST = { events: EV, awake: 0, attacker: -1, t: 0 };

    /* WORLD-TICK BEGIN: nothing between these markers allocates (tests/animals714-unit.js reads this text) */
    function ev(type, a, x) { var e; if (R.outside) { if (pendN >= PEND.length) return null; e = PEND[pendN++]; } else { if (EV.length >= EVP.length) return null; e = EVP[EV.length]; EV.push(e); } e.type = type; e.i = a ? a.i : -1; e.heavy = !!(a && a.atk >= 0 && atkOf(a).heavy);
      e.atk = a && a.atk >= 0 ? atkOf(a).id : ''; e.xp = 0; e.tgt = a && a.tgtChick ? 'chick' : 'her'; e.d = x || 0; return e; }
    function warnLen(at) { return R.plant === 'nowarn' ? 0.2 : at.warn; }   /* plant 'nowarn': the control for the warning claim */
    function hd(a, x, z) { var dx = x - a.x, dz = z - a.z; return Math.sqrt(dx * dx + dz * dz); }
    function nestD(x, z) { var dx = x - NEST[0], dz = z - NEST[1]; return Math.sqrt(dx * dx + dz * dz); }
    function hunts(a) { return a.temper >= T.sometimes || (R.plant === 'warn' && a.temper === T.passive); }   /* plant 'warn': a passive one may hunt (the control for "passive never strikes") */
    function allowed(a) {   /* hunting: never in a talk, a tutorial, under cover (input.safe), nor within 15 m of the nest (her or it) */
      if (IN.safe) return false;
      if (R.plant === 'nesthunt') return true;   /* plant 'nesthunt': the control for the nest claim */
      return nestD(IN.hx, IN.hz) > FAIR.NEST_R && nestD(a.x, a.z) > FAIR.NEST_R;
    }
    function reachable(a) { if (IN.swim) return !!a.S.sea3d; if (a.S.sea3d) return false; return a.S.realm === 'air' || IN.up <= FAIR.UP_MAX || R.plant === 'airreach'; }   /* plant 'airreach': a land animal reaches her in the air (the control for 714a U17) */   /* a land or sea animal cannot strike her in the air; under the water only a sea animal can (714c), and a sea animal only there */
    function capOK(arrive) {   /* <= 3 strikes in any 5 s across ALL animals, one attacker at a time */
      if (R.plant === 'nocap') return true;   /* plant 'nocap': the control for the cap */
      var n = 0, j; for (j = 0; j < R.logN; j++) if (R.log[j] > arrive - FAIR.CAP_T - 0.1) n++;   /* 0.1 s spare: a strike lands on the first frame at or after its time */
      return n < FAIR.CAP_N;
    }
    function logStrike(arrive) { var j; if (R.logN < R.log.length) { R.log[R.logN++] = arrive; return; } for (j = 1; j < R.log.length; j++) R.log[j - 1] = R.log[j]; R.log[R.log.length - 1] = arrive; }
    function tokenFree(a) { return R.plant === 'nocap' || R.attacker === -1 || R.attacker === a.i; }
    function release(a) { if (R.attacker === a.i) R.attacker = -1; }
    function setState(a, s) { a.state = s; a.st = 0; }
    function targetX(a) { return a.tgtChick ? IN.cx : IN.hx; }
    function targetZ(a) { return a.tgtChick ? IN.cz : IN.hz; }
    function targetY(a) { return a.tgtChick ? IN.cy : IN.hy; }
    function chooseTarget(a) {   /* her, always: the chick is never a target */
      a.tgtChick = false;
      if (R.plant === 'chickTarget' && IN.chick) { var dc = hd(a, IN.cx, IN.cz), dh = hd(a, IN.hx, IN.hz); if (dc < dh) a.tgtChick = true; }   /* plant 'chickTarget': the control for the chick claim */
    }
    function toIdle(a, cd) { release(a); a.atk = -1; a.cd = Math.max(a.cd, cd || 0); a.mean = false; a.driven = false; a.locked = false; a.mark = 0; a.wT = 0; a.dodged = 0; a.show = false; setState(a, 'idle'); }
    function cancel(a) { if (a.state === 'warn' || a.state === 'strike') { R.cancels++; ev('cancel', a); } release(a); a.locked = false; a.mark = 0; setState(a, 'recover'); }
    function face(a, x, z, dt, rate) { var want = Math.atan2(x - a.x, z - a.z), df = wrap(want - a.dir); a.dir = wrap(a.dir + clamp(df, -rate * dt, rate * dt)); }
    function stepMove(a, dt, mv) {   /* along a.dir at a.vT (smoothed), the boa weaving, every step tested by the html's ok() and the nest line */
      var S0 = a.S, dv = a.vT - a.v, acc = S0.acc * dt; a.v += dv > acc ? acc : dv < -acc ? -acc : dv;
      if (a.v < 0.01) { a.v = 0; return; }
      var w = a.sp === 'boa' ? 0.55 * Math.sin(a.weave) * (a.mv === 0 ? 1 : 0.6) : 0, h = a.dir + w, dist = a.v * dt, tries = TRIES, j, nx = a.x, nz = a.z, moved = false;
      for (j = 0; j < tries.length; j++) {
        var hh = h + tries[j]; nx = a.x + Math.sin(hh) * dist; nz = a.z + Math.cos(hh) * dist;
        var inNest = nestD(nx, nz) < FAIR.NEST_R + 1 && nestD(nx, nz) < nestD(a.x, a.z);
        if (!inNest && (S0.realm === 'air' || okAt(a.sp, nx, nz))) { moved = true; if (j > 0) a.dir = wrap(a.dir + tries[j] * 0.5); h = hh; break; }
      }
      if (!moved) { a.v = 0; a.blocked++; a.wT = 0; return; }
      a.x = nx; a.z = nz; a.head = h; a.k += dist; a.used.mv[mv] += dt; a.mv = mv;
      if (a.sp === 'boa') { a.weave += dist * TAU / 1.4; trail(a); }
    }
    function trail(a) { var tr = a.tr, n = tr.length / 3, i0 = a.tH * 3, dx = a.x - tr[i0], dz = a.z - tr[i0 + 2];
      if (dx * dx + dz * dz < 0.0081) return;
      a.tH = (a.tH + 1) % n; var i = a.tH * 3; tr[i] = a.x; tr[i + 1] = a.y; tr[i + 2] = a.z; if (a.tN < n) a.tN++; }
    function setY(a, dt) {
      var S0 = a.S, g = ground(a.x, a.z);
      if (S0.realm === 'land') a.y = g;
      else if (S0.realm === 'water') { var want = WATER - 0.1 - a.dive * S0.depth; a.y = Math.max(g + 0.3, want); }
      else { a.y += clamp(a.ty - a.y, -9 * dt, 4 * dt); a.y = Math.max(a.y, g + 0.6); }
    }
    function go(a, x, z, v, mv, dt, away) {   /* toward (or away from) a point */
      var tx = away ? a.x - (x - a.x) : x, tz = away ? a.z - (z - a.z) : z;
      if (R.plant === 'onemove') { v = a.S.moves[0].v; mv = 0; }   /* plant 'onemove': the control for both moves */
      face(a, tx, tz, dt, a.S.turn); a.vT = v; stepMove(a, dt, mv);
    }
    function wanderTo(a) { var r = a.S.wander * Math.sqrt(rand()), th = rand() * TAU; a.wx = a.hx + Math.sin(th) * r; a.wz = a.hz + Math.cos(th) * r; }
    function idle(a, dt) {
      var S0 = a.S;
      if (S0.realm === 'air') {   /* circling its home; the pelican now and then plunges for a fish (its second move) */
        a.ring += dt * S0.moves[0].v / S0.ring; var cx = a.hx + Math.sin(a.ring) * S0.ring, cz = a.hz + Math.cos(a.ring) * S0.ring;
        if (a.sp === 'pelican') {
          a.plT -= dt;
          if (a.plT <= 0 && a.pl === 0) { a.pl = 1; a.plS = 0; }
          if (a.pl > 0) { a.plS += dt; var u = a.plS;
            if (u < 1.4) { a.ty = WATER + 0.5; a.fold = ease(u / 0.5); } else if (u < 1.9) { a.ty = WATER + 0.4; a.fold = 1; if (a.pl === 1) { a.pl = 2; ev('splash', a); } } else { a.ty = WATER + S0.alt; a.fold = Math.max(0, 1 - (u - 1.9) * 2); }
            if (u > 4.5) { a.pl = 0; a.plT = 14 + rand() * 14; }
            go(a, cx, cz, S0.moves[1].v, 1, dt); return; }
        }
        if (a.sp === 'gull') { a.plT -= dt; if (a.plT <= 0) { a.pl = a.pl ? 0 : 1; a.plT = a.pl ? 2 + rand() * 2 : 9 + rand() * 12; } if (a.pl) { a.ty = WATER + S0.alt + 5; go(a, cx, cz, S0.moves[1].v, 1, dt); return; } }   /* a gull beats its wings to climb, then glides */
        a.ty = WATER + S0.alt + 2 * Math.sin(a.ring * 2); go(a, cx, cz, S0.moves[0].v, 0, dt); return;
      }
      if (a.doze) { a.vT = 0; a.standT = 0; stepMove(a, dt, 0); return; }   /* asleep in its hours off */
      if (a.wT <= 0) { wanderTo(a); a.wT = (a.sp === 'boa' ? 5 : 2.5) + rand() * (a.sp === 'boa' ? 7 : 4); a.rest = rand() < (a.sp === 'boa' ? (active(a) ? 0.45 : 0.8) : 0.35); a.zip = a.sp === 'mongoose' && !a.rest && rand() < 0.3; }   /* a mongoose zips from cover to cover */
      a.wT -= dt;
      if (IN.rain && a.temper === T.passive) { a.vT = 0; stepMove(a, dt, 0); return; }   /* rain: the gentle ones keep still (their cover) */
      if (a.sp === 'mongoose') a.standT = a.rest && a.wT < 1.6 ? 1 : 0;   /* it stands up to look about */
      if (a.rest || hd(a, a.wx, a.wz) < 0.4) { a.vT = 0; stepMove(a, dt, 0); return; }
      go(a, a.wx, a.wz, S0.moves[a.zip ? 1 : 0].v, a.zip ? 1 : 0, dt);
    }
    function notice(a) { R.notices++; a.atk = -1; a.mean = false; setState(a, 'notice'); ev('notice', a); if (a.S.bang && hunts(a) && allowed(a) && R.plant !== 'nobang') { a.mark = 1; ev('bang', a); } }   /* plant 'nobang': the control for the boa's ! */
    function decide(a) {
      var S0 = a.S;
      if (a.temper === T.passive && !hunts(a)) { setState(a, 'flee'); ev('flee', a); return; }
      if (a.temper === T.curious) { a.followT = 0; setState(a, 'approach'); return; }
      if (a.temper === T.sometimes || a.temper === T.passive) a.mean = R.mean || R.plant === 'warn' || rand() < (S0.meanP || 0.25);   /* 25% of approaches turn mean (R.mean: the bench's lever) */
      else a.mean = true;
      if (a.mean && allowed(a)) { pickAttack(a); setState(a, 'stalk'); return; }
      if (a.sp === 'crab' || a.temper === T.passive) { setState(a, 'flee'); ev('flee', a); return; }
      if (a.temper === T.malicious) { toIdle(a, 3); return; }
      a.followT = 0; setState(a, 'approach');
    }
    function pickAttack(a) {   /* the pattern: after two simple strikes the heavy is due; otherwise the coin (the crab's grab only with fruit in her beak). Plant 'oneatk': the control for both attacks */
      var L = a.S.attacks; if (!L) { a.atk = 0; return; } var hv = L[1], can = !hv.fruit || IN.fruit;
      if (a.force >= 0 && R.plant !== 'oneatk' && (a.force === 0 || can)) { a.atk = a.force; return; }   /* the bench's lever (W.force): this attack until it reaches contact; never past plant 'oneatk' */
      a.atk = R.plant !== 'oneatk' && can && (a.since >= 2 || rand() < a.S.heavyP) ? 1 : 0; if (a.atk === 1) a.since = 0; else a.since++; }
    function flee(a, dt) {
      var S0 = a.S, d = hd(a, IN.hx, IN.hz);
      if (a.dizzy > 0) { a.dizzy -= dt; a.vT = 0; stepMove(a, dt, 0); return; }
      if (S0.realm === 'water') a.dive = Math.min(1, a.dive + dt * 1.5);
      if (S0.sea3d) a.ty = ground(a.x, a.z) + 0.5;   /* 714c: away, and down toward the bottom */
      if (S0.realm === 'air') { a.ty = WATER + S0.alt + 6; a.fold = 0; }
      var fm = S0.fleeMv == null ? 1 : S0.fleeMv; go(a, IN.hx, IN.hz, S0.moves[fm].v * (fm === 0 ? 1.4 : 1), fm, dt, true);   /* a pelican escapes soaring, never plunging */
      if ((a.st > 2.5 && d > S0.sense * 1.4) || a.st > 7) toIdle(a, a.driven ? FAIR.DRIVEN_CD : a.sp === 'crab' ? 3 : 8);   /* a cheeky crab is soon back */
    }
    function approach(a, dt) {   /* curious: to 3-5 m, following her <= 12 s (a gull that is not mean circles over her a while) */
      var S0 = a.S, d = hd(a, IN.hx, IN.hz); a.followT += dt;
      if (S0.sea3d) { seaApproach(a, dt, d); return; }   /* 714c */
      if (S0.realm === 'air') { var far = d > 10; a.ring += dt * 0.6; a.ty = IN.hy + 5; go(a, IN.hx + Math.sin(a.ring) * 6, IN.hz + Math.cos(a.ring) * 6, S0.moves[far ? 1 : 0].v, far ? 1 : 0, dt); if (a.followT > 6) toIdle(a, 15); return; }   /* it beats over to her, then circles */
      var nr = S0.near || [3, 5];
      a.standT = 0;
      if (d < nr[0] - 0.5) go(a, IN.hx, IN.hz, S0.moves[1].v, 1, dt, true);
      else if (d > nr[1]) go(a, IN.hx, IN.hz, S0.moves[0].v, 0, dt);
      else { face(a, IN.hx, IN.hz, dt, S0.turn); a.vT = 0; stepMove(a, dt, 0); a.standT = d > 3.6 ? 1 : 0; }
      if (a.followT > (S0.follow || 12) || d > S0.sense * 2) toIdle(a, 20);
    }
    function stalk(a, dt) {
      var S0 = a.S, at = atkOf(a), d = hd(a, IN.hx, IN.hz), smv = S0.stalkMv || 0;
      if (!allowed(a)) { toIdle(a, 2); R.cancels++; return; }
      if (S0.sea3d) { seaStalk(a, dt, at, d); return; }   /* 714c */
      if (d > S0.sense * 2.2 || a.st > 16) { toIdle(a, 6); return; }
      if (at.fruit && !IN.fruit) { a.atk = 0; at = atkOf(a); }   /* nothing in her beak: the simple attack */
      if (S0.realm === 'air') {   /* the gull: to a point above and behind her, then it waits its turn circling */
        var ux = (a.x - IN.hx) / (d || 1), uz = (a.z - IN.hz) / (d || 1), hx2 = IN.hx + ux * at.from * 0.7, hz2 = IN.hz + uz * at.from * 0.7;
        a.ty = IN.hy + at.from * 0.7;
        var d3 = Math.sqrt(d * d + (a.y - IN.hy) * (a.y - IN.hy));
        if (d3 > at.from) { go(a, hx2, hz2, S0.moves[1].v, 1, dt); return; }
        if (canWarn(a, at)) { startWarn(a); return; }
        a.ring += dt * 0.8; go(a, IN.hx + Math.sin(a.ring) * at.from * 0.7, IN.hz + Math.cos(a.ring) * at.from * 0.7, S0.moves[0].v, 0, dt); return;
      }
      if (!reachable(a)) { face(a, IN.hx, IN.hz, dt, S0.turn); a.vT = 0; stepMove(a, dt, 0); a.rear = Math.min(0.4, a.rear + dt); return; }
      if (d > at.from) { go(a, IN.hx, IN.hz, S0.moves[smv].v, smv, dt); a.rear = Math.max(0, a.rear - dt * 2); return; }
      face(a, IN.hx, IN.hz, dt, S0.turn * 2); a.vT = 0; stepMove(a, dt, 0);
      if (canWarn(a, at)) startWarn(a);
      else a.rear = Math.min(0.4, a.rear + dt);   /* in reach, waiting its turn: coiled */
    }
    function canWarn(a, at) { return reachable(a) && a.atkCd <= 0 && tokenFree(a) && capOK(R.t + warnLen(at) + at.fly) && (R.plant === 'nograce' || R.t >= R.grace); }   /* plant 'nograce': the control for the grace after a hurt */
    function active(a) {   /* real habits: boas and land crabs by night (crabs in the rain too), mongooses by day; the rest both. Plant 'nohabit': all, always */
      var h = a.S.act; if (R.plant === 'nohabit' || !h || h === 'both') return true; if (a.S.rainOut && IN.rain) return true; return h === 'night' ? IN.night : !IN.night;
    }
    function startWarn(a) {
      var at = atkOf(a); chooseTarget(a);
      R.attacker = a.i; a.warnLen = warnLen(at); a.arrive = R.t + a.warnLen + at.fly; a.locked = false; a.arrived = false; a.tapped = false;
      a.aim[0] = targetX(a); a.aim[1] = targetY(a); a.aim[2] = targetZ(a); a.mark = 2; logStrike(a.arrive); R.warns++; a.used.atk[a.atk]++;
      setState(a, 'warn'); ev('warn', a, a.warnLen);
    }
    function atkOf(a) { return a.S.attacks ? a.S.attacks[a.atk < 0 ? 0 : a.atk] : BUMP; }   /* BUMP: only a planted passive one ever uses it */
    function lockNow(a) {   /* the aim stops following her: the strike's landing point is fixed (never further than its reach) */
      var at = atkOf(a), lt = leadT(a, at); a.locked = true; a.aim[0] = targetX(a) + IN.vx * lt; a.aim[1] = targetY(a) + IN.vy * lt; a.aim[2] = targetZ(a) + IN.vz * lt;
      var d3 = at.air || at.sea, dx = a.aim[0] - a.x, dy = d3 ? a.aim[1] - a.y : 0, dz = a.aim[2] - a.z, L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, r = at.sea ? L : Math.min(at.reach, L);   /* 714c: a sea lock fixes her lead point; its reach applies at the strike's start (seaRebase) */
      if (at.sea && R.plant !== 'noclamp') { var q; for (q = 0; q < 6 && r > 0.2 && !okAt(a.sp, a.x + dx / L * r, a.z + dz / L * r); q++) r *= 0.75; }   /* 714c: a sea strike ends in its own water (the shark never runs into the shallows; plant 'noclamp': it may) */
      a.cpt[0] = a.x + dx / L * r; a.cpt[1] = d3 ? a.y + dy / L * r : ground(a.x + dx / L * r, a.z + dz / L * r); a.cpt[2] = a.z + dz / L * r;
      if (at.sea) a.cpt[1] = clamp(a.cpt[1], ground(a.cpt[0], a.cpt[2]) + 0.2, WATER - 0.15);
      a.from[0] = a.x; a.from[1] = a.y; a.from[2] = a.z; a.dir = Math.atan2(dx, dz); a.reachL = at.sea ? Math.sqrt((a.cpt[0] - a.x) * (a.cpt[0] - a.x) + (a.cpt[1] - a.y) * (a.cpt[1] - a.y) + (a.cpt[2] - a.z) * (a.cpt[2] - a.z)) : r;
      if (at.sea) ev('lock', a, r);   /* 714c: the flash: its aim is fixed now (a Stroke from here takes her clear) */
    }
    function leadT(a, at) { return at.lead && R.plant !== 'nolead' ? Math.max(0, a.arrive - R.t) : 0; }   /* 714c: a sea strike aims where she will be at contact if she holds her course (plant 'nolead': it aims where she is) */
    function track(a, dt) {   /* the aim follows her until it locks */
      var at = atkOf(a), lt = leadT(a, at);
      if (a.locked) return;
      a.aim[0] += (targetX(a) + IN.vx * lt - a.aim[0]) * Math.min(1, dt * 10); a.aim[1] += (targetY(a) + IN.vy * lt - a.aim[1]) * Math.min(1, dt * 10); a.aim[2] += (targetZ(a) + IN.vz * lt - a.aim[2]) * Math.min(1, dt * 10);
      if (R.t >= a.arrive - at.lock) lockNow(a);
    }
    function warn(a, dt) {
      if (!allowed(a)) { cancel(a); return; }   /* she may hop in its warning: a land strike then lands under her (clearOf) */
      if (a.S.sea3d && !IN.swim) { cancel(a); return; }   /* 714c: she left the water in its warning */
      track(a, dt); if (!a.locked) face(a, a.aim[0], a.aim[2], dt, a.S.turn * 3);
      a.rear = Math.min(1, a.rear + dt / Math.max(0.2, a.warnLen * 0.6));
      if (a.S.sea3d) seaKeep(a, dt); else { a.vT = 0; stepMove(a, dt, 0); }   /* 714c: a sea animal keeps its distance from her as she swims (else every swimmer outruns every warning) */
      if (a.S.realm === 'air') a.ty = a.y;   /* the gull hangs, screaming */
      if (a.st >= a.warnLen) { if (!a.locked) lockNow(a); if (a.S.sea3d) seaRebase(a); setState(a, 'strike'); ev('strike', a); a.ext = 0; R.strikes++; }
    }
    function clearOf(a) {   /* the one judge of a dodge: her distance from where the strike lands (a land strike also misses her in the air) */
      var at = atkOf(a), dx = IN.hx - a.cpt[0], dz = IN.hz - a.cpt[2], dy = at.air || at.sea ? IN.hy - a.cpt[1] : 0;
      if (R.plant === 'nododge') return false;   /* plant 'nododge': the control for the sidestep */
      if (!reachable(a)) return true;   /* out of its element: a land strike misses her in the air, any strike but a sea one misses her under the water, a sea one misses her out of it */
      if (!at.air && IN.up > FAIR.UP_MAX) return true;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) >= at.hitR;
    }
    function strike(a, dt) {
      var S0 = a.S, at = atkOf(a);
      if (!allowed(a)) { cancel(a); return; }
      track(a, dt); if (!a.locked) lockNow(a);
      var u = clamp(a.st / at.fly, 0, 1), e = u * u, neck = S0.neck || 0, body = Math.max(0, a.reachL - neck), kN = neck > 0 ? Math.min(1, a.reachL / neck) : 0;
      if (a.locked) {   /* the body travels its share; the boa's neck (the kit) the rest */
        var L = a.reachL || 1, ux = (a.cpt[0] - a.from[0]) / L, uy = (a.cpt[1] - a.from[1]) / L, uz = (a.cpt[2] - a.from[2]) / L;
        var nx0 = a.from[0] + ux * body * e, nz0 = a.from[2] + uz * body * e; if (!S0.sea3d || R.plant === 'noclamp' || okAt(a.sp, nx0, nz0)) { a.x = nx0; a.z = nz0; }   /* 714c: a sea strike's path stays in its own water (else it stops at its edge; plant 'noclamp': it may leave) */
        if (S0.realm === 'air' || S0.sea3d) { a.y = a.from[1] + uy * body * e; a.ty = a.y; } else a.y = ground(a.x, a.z);
        var smv = S0.strikeMv != null ? S0.strikeMv : S0.stalkMv || 0; a.ext = kN * e; a.used.mv[smv] += dt; a.mv = smv;   /* 714c: a sea strike is its quick move (the dart, the surge) */
        if (a.sp === 'boa') trail(a);
      }
      if (!a.arrived && R.t >= a.arrive) { a.arrived = true; ev('contact', a); if (a.force === a.atk) a.force = -1;
        if (clearOf(a)) { R.dodges++; ev('dodge', a); dodged(a); return; }   /* a clean sidestep needs no window */
        if (at.sea) { R.hurts++; R.grace = R.t + FAIR.GRACE; a.dodged = 0; ev('hurt', a); after(a); return; } }   /* 714c: under the water there is no parry (her attack button is gone), so a sea strike is judged at its contact */
      if (a.arrived && R.t - IN.lag >= a.arrive + FAIR.GOOD) {
        if (clearOf(a)) { R.dodges++; ev('dodge', a); dodged(a); return; }
        if (at.fruit && IN.fruit) { R.steals++; R.grace = R.t + FAIR.GRACE; a.carry = true; ev('steal', a); release(a); a.mark = 0; a.driven = false; setState(a, 'flee'); ev('flee', a); return; }
        R.hurts++; R.grace = R.t + FAIR.GRACE; a.dodged = 0; ev('hurt', a); after(a);
      }
    }
    function dodged(a) {   /* 714c: give = clean dodges in a row before it gives up (driven off: drive() pays a threat's XP); every other animal just recovers */
      a.dodged++; if (a.S.give && a.dodged >= a.S.give && R.plant !== 'nogive') { a.dodged = 0; drive(a); return; }
      after(a);
    }
    function seaRebase(a) {   /* 714c: the strike starts where it is now (it kept pace with her after the lock), toward the point fixed at the lock */
      a.from[0] = a.x; a.from[1] = a.y; a.from[2] = a.z; var dx = a.cpt[0] - a.x, dy = a.cpt[1] - a.y, dz = a.cpt[2] - a.z, L = Math.sqrt(dx * dx + dy * dy + dz * dz), rc = atkOf(a).reach;
      if (L > rc && L > 0) { a.cpt[0] = a.x + dx / L * rc; a.cpt[1] = a.y + dy / L * rc; a.cpt[2] = a.z + dz / L * rc; L = rc; }   /* out of its reach now: the strike falls short */
      a.reachL = L; if (dx || dz) a.dir = Math.atan2(dx, dz);
    }
    function seaKeep(a, dt) {   /* 714c: in its warning a sea animal holds its distance (its attack's from x 0.8) as she swims, facing her, its depth hers */
      var S0 = a.S, at = atkOf(a), d = hd(a, IN.hx, IN.hz), sp = Math.sqrt(IN.vx * IN.vx + IN.vz * IN.vz), k = at.from * 0.8;
      a.ty = IN.hy; a.vT = d > k ? clamp(sp + (d - k) * 2.5, 0, S0.moves[1].v) : 0; stepMove(a, dt, a.vT > S0.moves[0].v * 1.5 ? 1 : 0);
    }
    function after(a) { release(a); a.atkCd = (a.S.cd || 3) + (a.S.recover || 1.2); a.locked = false; a.mark = 0; setState(a, 'recover'); }
    function recover(a, dt) {
      var S0 = a.S;
      a.ext = Math.max(0, a.ext - dt * 2.5); a.rear = Math.max(0, a.rear - dt * 1.5);
      if (S0.realm === 'air') { a.ty = WATER + S0.alt; go(a, a.hx, a.hz, S0.moves[1].v, 1, dt); }
      else { face(a, IN.hx, IN.hz, dt, S0.turn); a.vT = 0; stepMove(a, dt, 0); }
      if (a.st < (S0.recover || 1.2)) return;
      if (a.sp === 'crab') { a.mean = false; a.driven = false; setState(a, 'flee'); ev('flee', a); return; }   /* a crab pinches and runs */
      var d = hd(a, IN.hx, IN.hz);
      if (a.mean && allowed(a) && d < S0.sense * 1.6) { pickAttack(a); setState(a, 'stalk'); return; }
      toIdle(a, 4);
    }
    function think(a, dt) {
      var S0 = a.S, d = hd(a, IN.hx, IN.hz), on = active(a), sense = on ? S0.sense : S0.act === 'day' ? 0 : S0.sense * FAIR.DULL;   /* a day animal sleeps at night; a night one is dull by day */
      a.doze = !on && S0.act === 'day'; a.curl += ((a.doze && a.state === 'idle' ? 1 : 0) - a.curl) * Math.min(1, dt * 2);
      a.st += dt; a.cd = Math.max(0, a.cd - dt); a.atkCd = Math.max(0, a.atkCd - dt);
      a.stand += ((a.state === 'notice' && a.sp === 'mongoose' ? 1 : a.standT) - a.stand) * Math.min(1, dt * 6);
      if (a.state !== 'flee' && S0.realm === 'water') a.dive = Math.max(0, a.dive - dt * 0.5);
      if (a.state !== 'warn' && a.state !== 'strike' && a.state !== 'recover' && a.state !== 'stalk') a.rear = Math.max(0, a.rear - dt * 2);
      if (a.state !== 'strike' && a.state !== 'recover') a.ext = Math.max(0, a.ext - dt * 3);
      switch (a.state) {
        case 'idle': if (S0.sea3d) seaIdle(a, dt); else idle(a, dt);
          if (a.cd <= 0 && d < sense && (S0.sea3d ? (S0.low ? IN.lowSea : IN.swim) : (a.temper < T.sometimes || reachable(a) || a.S.realm === 'air'))) notice(a); break;   /* 714c: a dolphin notices her in the sea or low over it; a sea hunter only while she swims */
        case 'notice': if (!S0.escort) face(a, IN.hx, IN.hz, dt, S0.turn * 2); if (S0.sea3d) stepMove(a, dt, a.mv);   /* 714c: a dolphin riding a bow keeps its heading as it notices her */ else { a.vT = 0; stepMove(a, dt, 0); } if (S0.realm === 'air') { a.ty = a.y; go(a, IN.hx, IN.hz, S0.moves[0].v, 0, dt); }
          if (a.sp === 'crab') a.rear = Math.min(1, a.rear + dt * 3);
          if (a.st >= S0.noticeT) { a.mark = 0; decide(a); } break;
        case 'flee': flee(a, dt); break;
        case 'approach': approach(a, dt); break;
        case 'stalk': stalk(a, dt); break;
        case 'warn': warn(a, dt); break;
        case 'strike': strike(a, dt); break;
        case 'recover': recover(a, dt); break;
        default: toIdle(a, 0);
      }
      if (S0.sea3d) seaY(a, dt); else setY(a, dt);
      if (a.sp === 'crab') a.yaw = a.state === 'warn' || a.state === 'strike' || a.v < 0.05 && (a.state === 'stalk' || a.state === 'recover') ? a.dir : wrap(a.dir + (a.side > 0 ? 1 : -1) * Math.PI / 2);   /* a crab always moves sideways; it turns its claws to her only standing to strike */
      else a.yaw = a.sp === 'boa' ? (a.head == null ? a.dir : a.head) : a.dir;
    }
    function wake() {   /* awake within 60 m, asleep past 80 m, and never more than the six nearest */
      var n = A.length, j, m, best, bd, want = 0;
      for (j = 0; j < n; j++) if (!A[j].awake && A[j].S.escort) escortSleep(A[j]);   /* 714c: a sleeping pod keeps up with its boat, unseen */
      for (j = 0; j < n; j++) { var a = A[j], d = hd(a, IN.hx, IN.hz); a.dist = d; a.want = (d < FAIR.WAKE || (a.awake && d < FAIR.SLEEP)) && !(a.S.hide && !active(a))
          && !(a.S.onlyDive && !IN.swim && R.plant !== 'nodiveonly'); a.pick = false;   /* 714c: the barracuda is there only while she dives (plant 'nodiveonly': always) */   /* a crab out of its hours is down its burrow */ if (a.want) want++; }
      if (R.plant === 'nosleep') { for (j = 0; j < n; j++) A[j].pick = true; }   /* plant 'nosleep': the control for the six */
      else for (m = 0; m < FAIR.MAX_AWAKE && m < want; m++) { best = -1; bd = 1e18; for (j = 0; j < n; j++) if (A[j].want && !A[j].pick && A[j].dist < bd) { bd = A[j].dist; best = j; } if (best >= 0) A[best].pick = true; }
      var c = 0;
      for (j = 0; j < n; j++) { var b = A[j];
        if (b.pick && !b.awake) { b.awake = true; toIdle(b, 1); ev('wake', b); }
        else if (!b.pick && b.awake) { if (b.state === 'warn' || b.state === 'strike') R.cancels++; release(b); b.awake = false; b.state = 'asleep'; b.st = 0; b.v = 0; b.mark = 0; ev('sleep', b); }
        if (b.awake) c++; }
      R.awake = c;
    }
    function judgeTap() {   /* the parry, like a song note: the tap's true time is now minus her latency; it answers the strike nearest its contact */
      var j, a = null, bd = 1e9;
      for (j = 0; j < A.length; j++) { var b = A[j]; if (b.awake && (b.state === 'warn' || b.state === 'strike') && !b.tapped) { var q = Math.abs(b.arrive - R.t); if (q < bd) { bd = q; a = b; } } }
      if (!a) return;
      var d = (R.t - IN.lag) - a.arrive, ad = d < 0 ? -d : d;
      if (d < -FAIR.LOOK) { R.whiffs++; ev('whiff', a); return; }
      a.tapped = true;
      if (ad <= FAIR.PERFECT) { R.perfect++; R.parries++; ev('parry', a, 1); drive(a); }
      else if (ad <= (R.plant === 'lateok' ? 0.4 : FAIR.GOOD)) { R.parries++;   /* plant 'lateok': the control for the parry window */
        ev('parry', a, 0); drive(a); }
      else { R.early++; ev(d < 0 ? 'early' : 'late', a); }
    }
    function threat(a) { return a.temper >= T.sometimes && a.mean && (a.state === 'stalk' || a.state === 'warn' || a.state === 'strike' || a.state === 'recover' || a.state === 'notice'); }
    function drive(a) {   /* driven off by a parry or a peck: dizzy, then away; XP only for a threat */
      var xp = threat(a) || (a.temper === T.malicious && a.state !== 'flee' && a.state !== 'idle') ? FAIR.XP : 0;
      if (a.state === 'warn' || a.state === 'strike') R.cancels++;
      release(a); a.locked = false; a.mark = 0; a.driven = true; a.mean = false; a.dizzy = xp ? FAIR.DIZZY : 0; a.cd = FAIR.DRIVEN_CD; setState(a, 'flee');
      R.driven++; R.xp += xp; var e = ev('driven', a); if (e) e.xp = xp; return xp;
    }
    /* ---- 714c THE SEA: the dolphins' boats, the sea's idle, its approach, its hunt, its depth (nothing here allocates) ---- */
    function boatOf(a) {   /* its pod's boat while shown (pods: the first three ride boat 0, the next two boat 1). Plant 'noescort': none */
      if (R.plant === 'noescort' || a.boat < 0 || a.boat >= BT.length) return null; var b = BT[a.boat]; return b.on ? b : null; }
    function station(a, b) {   /* where it rides: in the bow wave while the boat sails (staggered ahead and to each side); a slow ring round it while it waits */
      var fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), k3 = a.slot % 3, sd = a.slot % 2 ? 1 : -1;
      if (b.v > 0.8) { var al = b.bow + 1.2 + k3 * 1.6, lat = sd * (1.1 + k3 * 0.8); a.sx = b.x + fx * al + fz * lat; a.sz = b.z + fz * al - fx * lat; return; }
      var rr = 9 + k3 * 2.5, th = R.t * 0.12 * sd + a.slot * 2.1; a.sx = b.x + Math.sin(th) * rr; a.sz = b.z + Math.cos(th) * rr;
    }
    function escortSleep(a) {   /* asleep (hidden) and far from her: it is where its pod would be, so a boat she meets has its dolphins */
      var b = boatOf(a); if (!b || hd(a, IN.hx, IN.hz) <= FAIR.SLEEP) return;
      station(a, b); if (!okAt(a.sp, a.sx, a.sz)) return;
      a.x = a.sx; a.z = a.sz; a.hx = a.sx; a.hz = a.sz; a.y = WATER - a.S.cruiseD; a.ty = a.y; a.dir = b.yaw; a.air = false; a.lp = 0;
    }
    function escort(a, b, dt) {   /* awake: it rides its boat; it porpoises (its leap) when it must hurry, cruises round it while it waits */
      var S0 = a.S, fx = Math.sin(b.yaw), fz = Math.cos(b.yaw); station(a, b);
      var ex = a.sx - a.x, ez = a.sz - a.z, e = ex * fx + ez * fz, lat = Math.abs(ex * fz - ez * fx), v, mv;
      a.hx = b.x; a.hz = b.z;
      if (b.v > 0.8) { v = clamp(b.v + e * 0.9 + lat * 0.3, 0.5, S0.moves[1].v * 1.15); mv = Math.abs(e) < 3 && lat < 3 ? 2 : v > S0.moves[0].v * 1.4 ? 1 : 0; go(a, a.sx + fx * 3, a.sz + fz * 3, v, mv, dt); }   /* on its station: the bow-ride; behind it: it porpoises to catch up */
      else { var dd = Math.sqrt(ex * ex + ez * ez); v = clamp(dd * 0.6, S0.moves[0].v * 0.6, S0.moves[1].v); mv = v > S0.moves[0].v * 1.4 ? 1 : 0; go(a, a.sx, a.sz, v, mv, dt); }
      a.hurry = Math.abs(e) > 3 || lat > 3;
      if (!a.air) a.ty = WATER - (mv === 1 ? 0.7 : S0.cruiseD);
    }
    function seaIdle(a, dt) {
      var S0 = a.S;
      if (S0.escort) { var b = boatOf(a); if (b) { escort(a, b, dt); return; } }
      if (a.wT <= 0) { wanderTo(a); a.wT = S0.hang ? 5 + rand() * 7 : 6 + rand() * 8; a.zip = !!S0.hang && rand() < 0.45; a.rest = false; }   /* the barracuda: now and then a dart to its next hanging place */
      a.wT -= dt;
      var dw = hd(a, a.wx, a.wz);
      if (S0.hang) {   /* it hangs still over the reef (a slow scull of its fins), then darts */
        if (a.zip && dw > 0.6) { go(a, a.wx, a.wz, S0.moves[1].v * 0.6, 1, dt); if (dw < 1.5) a.zip = false; }
        else { face(a, a.wx, a.wz, dt, 0.4); a.vT = dw > 0.4 ? S0.moves[0].v : 0; stepMove(a, dt, 0); }
        a.ty = WATER - 1.3 - 0.5 * Math.sin(a.i * 1.7); return; }
      if (S0.bed) a.ty = ground(a.x, a.z) + S0.bed;   /* the shark patrols low over the bottom */
      else { a.plT -= dt; if (a.plT < 0) a.plT = 20 + rand() * 15; a.ty = a.plT < 3 ? WATER - 0.35 : WATER - S0.cruiseD; }   /* a lone dolphin cruises, and comes up to breathe */
      if (dw < 1) a.wT = Math.min(a.wT, 0.3);
      go(a, a.wx, a.wz, S0.moves[0].v, 0, dt);
    }
    function seaApproach(a, dt, d) {   /* curious: the dolphin swims alongside her (it leaps when she flies low); the barracuda shadows a swimmer at 3-5 m */
      var S0 = a.S, sp = Math.sqrt(IN.vx * IN.vx + IN.vz * IN.vz);
      if (S0.escort) {
        var fx = sp > 1 ? IN.vx / sp : (IN.hx - a.x) / (d || 1), fz = sp > 1 ? IN.vz / sp : (IN.hz - a.z) / (d || 1), sd = a.slot % 2 ? 1 : -1, lat = sd * (2.6 + (a.slot % 3) * 1.1);
        var tx = IN.hx + fx * 1.2 + fz * lat, tz = IN.hz + fz * 1.2 - fx * lat, e = (tx - a.x) * fx + (tz - a.z) * fz, dd = hd(a, tx, tz);
        var v = clamp(sp + e * 1.0 + dd * 0.3, S0.moves[0].v * 0.5, S0.moves[1].v * 1.15);
        a.show = !IN.swim && IN.up > 0.5 && d < 10 && R.plant !== 'noleap';   /* beside her as she FLIES low over the sea (never for her on a deck): it leaps (plant 'noleap': never) */
        go(a, tx + fx * 3, tz + fz * 3, v, a.show ? 1 : v > S0.moves[0].v * 1.4 ? 2 : 0, dt);   /* alongside her it swims fast under the surface; it leaps only for the show */
        if (!a.air) a.ty = IN.swim ? clamp(IN.hy, ground(a.x, a.z) + 0.6, WATER - 0.6) : WATER - 0.8;
        if (a.followT > (S0.follow || 12) || d > S0.sense * 2 || (!IN.lowSea && a.followT > 1.5)) toIdle(a, 20);
        return; }
      var dy = IN.hy - a.y, d3 = Math.sqrt(d * d + dy * dy), nr = S0.near;
      a.ty = IN.hy;
      if (d3 > nr[1] + 2) go(a, IN.hx, IN.hz, S0.moves[1].v, 1, dt);   /* left behind: a dart to catch up */
      else if (d3 < nr[0]) go(a, IN.hx, IN.hz, S0.moves[0].v * 3, 0, dt, true);   /* too near: it backs off */
      else { face(a, IN.hx, IN.hz, dt, S0.turn); a.vT = clamp(sp, 0, S0.moves[1].v); stepMove(a, dt, a.vT > S0.moves[0].v * 1.5 ? 1 : 0); }   /* at her side, keeping her pace */
      if (a.followT > (S0.follow || 12) || !IN.swim || d > S0.sense * 2) toIdle(a, 20);
    }
    function seaStalk(a, dt, at, d) {   /* the hunt under the water: the shark circles her, closing (its heavy holds wide, then runs in); the barracuda darts to its range */
      var S0 = a.S, dy = IN.hy - a.y, d3 = Math.sqrt(d * d + dy * dy), sp = Math.sqrt(IN.vx * IN.vx + IN.vz * IN.vz);
      if (!IN.swim) { toIdle(a, 3); return; }   /* she left the water */
      if (d > S0.sense * 2.2 || a.st > 20) { toIdle(a, 6); return; }
      a.ty = IN.hy;
      if (S0.ringR) {
        if (a.st <= dt + 1e-9) a.ring = Math.atan2(a.x - IN.hx, a.z - IN.hz);   /* the circle starts where it is */
        var want = at.heavy ? at.from * 0.9 : Math.max(at.from * 0.85, S0.ringR - a.st * 1.5), circ = 2.4 + sp;
        a.ring += dt * circ / Math.max(2, want) * a.side;
        var cx = IN.hx + Math.sin(a.ring) * want, cz = IN.hz + Math.cos(a.ring) * want, far = d3 > want + 3;
        if (sp > 4 && far) go(a, IN.hx + IN.vx * 0.5, IN.hz + IN.vz * 0.5, S0.moves[1].v, 1, dt);   /* she swims away fast: it chases from behind (a real shark's run), never orbiting a moving swimmer */
        else go(a, cx, cz, far ? S0.moves[1].v : Math.min(S0.moves[1].v, circ), far ? 1 : 0, dt);
        if (a.st > 2.0 && d3 <= at.from + 0.4 && canWarn(a, at)) startWarn(a);
        return; }
      if (d3 > at.from) { go(a, IN.hx, IN.hz, clamp(sp + 4, 0, S0.moves[1].v), 1, dt); return; }   /* the barracuda darts in */
      face(a, IN.hx, IN.hz, dt, S0.turn * 2); a.vT = clamp(sp, 0, S0.moves[1].v); stepMove(a, dt, a.vT > S0.moves[0].v * 1.5 ? 1 : 0);
      if (canWarn(a, at)) startWarn(a);
    }
    function seaY(a, dt) {   /* its depth: toward a.ty between its bed and the surface; a dolphin's leaps (porpoising when it hurries, a show beside her) */
      var S0 = a.S, g = ground(a.x, a.z), rad = S0.rad || 0.2, lo = g + rad + 0.25, hi = Math.max(lo, WATER - 0.3 - rad), y0 = a.y;
      if (S0.escort) {
        var leaping = (a.mv === 1 || a.mv === 2) && a.v > S0.moves[0].v * 1.2 && R.plant !== 'noleap';
        if (leaping || a.air || a.lp > 0) {
          a.lp += a.v * dt / (a.show ? S0.leapL * 0.8 : S0.leapL);
          if (a.lp >= 1) { a.lp = leaping ? a.lp - 1 : 0; a.lpOn = a.show || R.plant === 'leapall' || rand() < (a.mv === 1 ? 0.6 : 0.4); }   /* each cycle a leap or a surf just under the surface: porpoising 60%, bow-riding 40% (airborne ~20% of the time) (plant 'leapall': every cycle) */
          var f = a.lp, H0 = a.show ? S0.leapH * 1.7 : S0.leapH;
          if (f < 0.55 || !a.lpOn) { if (a.air) { a.air = false; ev('splash', a, 1); } a.y = Math.max(lo, WATER - 0.25 - 0.65 * Math.sin(Math.PI * Math.min(1, f / 0.55))); }
          else { var u = (f - 0.55) / 0.45; if (!a.air) { a.air = true; ev('splash', a, 0); } a.y = WATER - 0.25 + (H0 + 0.25) * 4 * u * (1 - u); }
          if (a.lp > 0) { var vy0 = dt > 0 ? (a.y - y0) / dt : 0; a.pitch3 += (-Math.atan2(vy0, Math.max(0.8, a.v)) - a.pitch3) * Math.min(1, dt * 10); return; }
        }
      }
      a.y += clamp(a.ty - a.y, -2.5 * dt, 2.5 * dt); a.y = clamp(a.y, lo, hi);
      var vy = dt > 0 ? (a.y - y0) / dt : 0; a.pitch3 += (-Math.atan2(vy, Math.max(0.8, a.v)) - a.pitch3) * Math.min(1, dt * 8);
    }
    function tick(dt, inp) {
      dt = dt > 0 ? (dt < 0.1 ? dt : 0.1) : 0;
      EV.length = 0;
      var q; for (q = 0; q < pendN && q < EVP.length; q++) { var src = PEND[q], dst = EVP[q]; dst.type = src.type; dst.i = src.i; dst.heavy = src.heavy; dst.atk = src.atk; dst.xp = src.xp; dst.tgt = src.tgt; dst.d = src.d; EV.push(dst); } pendN = 0;
      IN.hx = num(inp.hx, -1e6, 1e6); IN.hy = num(inp.hy, -1e6, 1e6); IN.hz = num(inp.hz, -1e6, 1e6); IN.up = num(inp.up, 0, 1e6);
      IN.chick = !!inp.chick; IN.cx = num(inp.cx, -1e6, 1e6); IN.cy = num(inp.cy, -1e6, 1e6); IN.cz = num(inp.cz, -1e6, 1e6);
      IN.safe = inp.safe !== false; IN.night = !!inp.night; IN.rain = !!inp.rain; IN.attack = !!inp.attack; IN.lag = num(inp.lag, 0, FAIR.LAG_MAX); IN.fruit = !!inp.fruit;
      IN.swim = !!inp.swim; IN.vx = num(inp.vx, -60, 60); IN.vy = num(inp.vy, -60, 60); IN.vz = num(inp.vz, -60, 60);   /* 714c */
      var nb = inp.boats && inp.boats.length > 0 ? Math.min(inp.boats.length, BT.length) : 0, q2;
      for (q2 = 0; q2 < BT.length; q2++) { var bi = q2 < nb ? inp.boats[q2] : null, bo = BT[q2]; bo.on = !!(bi && bi.on);
        if (bo.on) { bo.x = num(bi.x, -1e6, 1e6); bo.z = num(bi.z, -1e6, 1e6); bo.yaw = num(bi.yaw, -1e3, 1e3); bo.v = num(bi.v, 0, 60); bo.bow = num(bi.bow, 0, 40); } }
      IN.lowSea = IN.swim || (IN.hy - WATER < FAIR.LOW && ground(IN.hx, IN.hz) < WATER - 1);
      R.t += dt;
      wake();
      if (IN.attack) judgeTap();
      var j; for (j = 0; j < A.length; j++) if (A[j].awake) think(A[j], dt);
      var att = 0; for (j = 0; j < A.length; j++) if (A[j].awake && (A[j].state === 'warn' || A[j].state === 'strike')) att++;
      ST.awake = R.awake; ST.attacker = R.attacker; ST.attackers = att; ST.t = R.t;
      return ST;
    }
    /* WORLD-TICK END */

    function newAnimal(sp, x, z) {
      var S0 = SP[sp] || SEA[sp]; if (!S0) throw new Error('no species ' + sp);
      var a = { i: A.length, sp: sp, S: S0, temper: S0.temper, realm: S0.realm, hx: x, hz: z, x: x, y: 0, z: z, ty: 0, dir: rand() * TAU, head: null, yaw: 0, v: 0, vT: 0, mv: 0, k: 0, weave: rand() * TAU,
        state: 'asleep', st: 0, cd: 1, atkCd: 0, atk: -1, warnLen: 0, arrive: 0, locked: false, arrived: false, tapped: false, aim: [0, 0, 0], cpt: [0, 0, 0], from: [0, 0, 0], reachL: 0, tgtChick: false,
        ext: 0, rear: 0, stand: 0, standT: 0, dive: 0, fold: 0, ring: rand() * TAU, pl: 0, plS: 0, plT: 6 + rand() * 10, mark: 0, awake: false, pick: false, want: false, dist: 1e9, wx: x, wz: z, wT: 0, rest: false,
        mean: false, driven: false, dizzy: 0, carry: false, zip: false, since: 0, doze: false, curl: 0, jaw: 0, followT: 0, blocked: 0, side: rand() < 0.5 ? 1 : -1, used: { mv: [0, 0, 0], atk: [0, 0] }, tr: null, tH: 0, tN: 0 };
      if (sp === 'boa') { a.tr = new Float32Array(48 * 3); }
      a.y = S0.realm === 'land' ? ground(x, z) : S0.realm === 'water' ? WATER - 0.1 : WATER + S0.alt; a.ty = a.y;
      a.dodged = 0; a.show = false; a.hurry = false; a.force = -1;
      if (S0.sea3d) {   /* 714c: its slot among its kind (the pod's places round the bow), its pod's boat, its depth */
        var nS = 0, j3, acc = 0; for (j3 = 0; j3 < A.length; j3++) if (A[j3].sp === sp) nS++;
        a.slot = nS; a.boat = -1; if (S0.pods) for (j3 = 0; j3 < S0.pods.length; j3++) { acc += S0.pods[j3]; if (nS < acc) { a.boat = j3; break; } }
        a.pitch3 = 0; a.air = false; a.lp = 0; a.lpOn = false; a.sx = x; a.sz = z; a.y = Math.max(ground(x, z) + (S0.rad || 0.2) + 0.25, WATER - (S0.cruiseD || 1.3)); a.ty = a.y; }
      if (a.tr) { var j, bx = -Math.sin(a.dir), bz = -Math.cos(a.dir); for (j = 0; j < 40; j++) { var px = x + bx * j * 0.1 + Math.sin(j * 0.35) * 0.18 * Math.cos(a.dir), pz = z + bz * j * 0.1 - Math.sin(j * 0.35) * 0.18 * Math.sin(a.dir);
        var q = ((40 - j) % 48) * 3; a.tr[q] = px; a.tr[q + 1] = ground(px, pz); a.tr[q + 2] = pz; } a.tH = 40 % 48; a.tN = 41; a.tr[a.tH * 3] = x; a.tr[a.tH * 3 + 1] = a.y; a.tr[a.tH * 3 + 2] = z; }   /* a resting S behind the head */
      A.push(a); return a.i;
    }
    function kill(err) { R.dead = true; W.dead = true; API.error = String(err && err.message || err); try { if (o.warn) o.warn('animals714 stopped: ' + API.error); } catch (e) { /* fine */ } }
    function step(dt, input) {   /* a fault stops the animals, never the game */
      if (R.dead) return null;
      try { R.plant = W._plant || null; if (R.plant === 'throw') R.no.such = 1; return tick(dt, input || {}); } catch (err) { kill(err); return null; }
    }
    function hit(i, how) {   /* her peck or sweep reached animal i: a threat is driven off (XP), a gentle one just runs */
      var a = A[i]; if (!a || !a.awake || R.dead) return 0;
      if (a.state === 'flee' && a.driven) return 1;
      R.outside = true;
      try { if (a.temper >= T.sometimes || (a.state === 'warn' || a.state === 'strike')) drive(a); else { a.cd = 30; setState(a, 'flee'); ev('flee', a); } } finally { R.outside = false; }
      void how; return 1;
    }
    function put(i, x, z, home) { var a = A[i]; if (!a) return false; if (a.awake) toIdle(a, 0); a.cd = 0; a.atkCd = 0; a.x = x; a.z = z;   /* the bench's placement: a fresh animal */ if (home !== false) { a.hx = x; a.hz = z; } a.wT = 0; a.y = a.S.realm === 'land' ? ground(x, z) : a.y; if (a.S.sea3d) { a.air = false; a.lp = 0; a.y = clamp(a.y, ground(x, z) + 0.45, WATER - 0.5); a.ty = a.y; }
      if (a.tr) { for (var j = 0; j < a.tr.length; j += 3) { a.tr[j] = x; a.tr[j + 1] = a.y; a.tr[j + 2] = z; } a.tN = 1; } return true; }
    function peekA(a) { return { i: a.i, sp: a.sp, temper: a.temper, state: a.state, awake: a.awake, x: +a.x.toFixed(3), y: +a.y.toFixed(3), z: +a.z.toFixed(3), home: [a.hx, a.hz], v: +a.v.toFixed(3), mv: a.mv, move: a.S.moves[a.mv].id,
      atk: a.atk >= 0 ? atkOf(a).id : null, heavy: a.atk >= 0 ? !!atkOf(a).heavy : false, mark: a.mark, warnT: a.state === 'warn' ? +a.st.toFixed(3) : 0, warnLen: a.warnLen,
      arriveIn: a.state === 'warn' || a.state === 'strike' ? +(a.arrive - R.t).toFixed(3) : null, aim: a.aim.slice(), cpt: a.cpt.slice(), tgt: a.tgtChick ? 'chick' : 'her', mean: a.mean, driven: a.driven, dist: +a.dist.toFixed(2),
      used: { mv: [+a.used.mv[0].toFixed(2), +a.used.mv[1].toFixed(2)], atk: a.used.atk.slice() }, rear: +a.rear.toFixed(3), ext: +a.ext.toFixed(3), stand: +a.stand.toFixed(3), dive: +a.dive.toFixed(3), carry: a.carry, active: activeP(a), doze: a.doze, curl: +a.curl.toFixed(3),
      sea: a.S.sea3d ? { air: a.air, boat: a.boat, slot: a.slot, dodged: a.dodged, show: a.show, pitch: +a.pitch3.toFixed(3), ty: +a.ty.toFixed(3) } : null }; }   /* 714c */
    function activeP(a) { var h = a.S.act; if (R.plant === 'nohabit' || !h || h === 'both') return true; if (a.S.rainOut && IN.rain) return true; return h === 'night' ? IN.night : !IN.night; }
    function peek() {
      var L = []; for (var j = 0; j < A.length; j++) L.push(peekA(A[j]));
      return { ready: true, dead: R.dead, error: API.error, t: +R.t.toFixed(3), plant: R.plant, awake: R.awake, attacker: R.attacker, strikes: R.strikes, warns: R.warns, hurts: R.hurts, steals: R.steals, parries: R.parries,
        perfect: R.perfect, dodges: R.dodges, driven: R.driven, whiffs: R.whiffs, early: R.early, cancels: R.cancels, xp: R.xp, notices: R.notices, mean: R.mean, animals: L };
    }
    var W = { dead: false, _plant: null, A: A, now: function () { return R.t; }, add: function (sp, x, z) { return newAnimal(sp, x, z); }, step: step, hit: hit, put: put, peek: peek, mean: function (on) { R.mean = !!on; }, force: function (i, k) { var a = A[i]; if (!a || !a.S.attacks) return false; a.force = k === 1 ? 1 : k === 0 ? 0 : -1; return true; },   /* the bench: animal i's next attack is k (0 simple, 1 heavy) until it lands (-1: the coin again) */ water: WATER, boats: BT };   /* boats (714c): what the dolphins were told this step */
    return W;
  }

  /* ---------------- THE KIT: each species as plain arrays, built once; posed into the same arrays every frame ----------------
     FLAT-SHADED, the Quaternius way (Obito's review, Oct 28; Marth: "don't cut any corners ... graphics"): every triangle has its own face normal and
     ONE solid colour, so a model reads as clean facets, never a smooth blob. Same material, same program (the normal is an attribute, not a define). */
  var KIT = (function () {
    function hex(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; }
    function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    function G0() { return { p: [], n: [], c: [], b: [], s: [] }; }
    function shade(o, nx, ny, nz, x, y, z) {   /* countershading (a darker back, a paler belly), stepped per face, then the part's own pattern */
      var t = clamp(0.5 - ny * 0.9, 0, 1), c = mixc(o.top, o.belly || o.top, t * t * (3 - 2 * t));
      return o.pat ? o.pat(c, nx, ny, nz, x, y, z) : c;
    }
    function rotP(v, pitch, yaw, roll) {
      var x = v[0], y = v[1], z = v[2], c, s, t;
      if (roll) { c = Math.cos(roll); s = Math.sin(roll); t = x * c - y * s; y = x * s + y * c; x = t; }
      if (pitch) { c = Math.cos(pitch); s = Math.sin(pitch); t = y * c - z * s; z = y * s + z * c; y = t; }
      if (yaw) { c = Math.cos(yaw); s = Math.sin(yaw); t = x * c + z * s; z = -x * s + z * c; x = t; }
      return [x, y, z];
    }
    function fnorm(a, b, c) { var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; return [nx / l, ny / l, nz / l]; }
    /* one triangle, flat: its own normal, one colour (o: a part for shade, or col: a fixed colour); hint: flip it to face that way */
    function tri(G, A, B, C, o, bone, sA, sB, sC, hint) {
      var n = fnorm(A, B, C);
      if (hint && n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { var q = B; B = C; C = q; var qs = sB; sB = sC; sC = qs; n = [-n[0], -n[1], -n[2]]; }
      var cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3, cz = (A[2] + B[2] + C[2]) / 3, col = o.col || shade(o, n[0], n[1], n[2], cx, cy, cz), P = [A, B, C], S = [sA || 0, sB || 0, sC || 0];
      for (var k = 0; k < 3; k++) { G.p.push(P[k][0], P[k][1], P[k][2]); G.n.push(n[0], n[1], n[2]); G.c.push(col[0], col[1], col[2]); G.b.push(bone || 0); G.s.push(S[k]); }
    }
    function quad(G, V, i00, i01, i10, i11, o, bone) { tri(G, V[i00].p, V[i11].p, V[i10].p, o, bone, V[i00].s, V[i11].s, V[i10].s); tri(G, V[i00].p, V[i01].p, V[i11].p, o, bone, V[i00].s, V[i01].s, V[i11].s); }
    function ell(G, o) {   /* a faceted ellipsoid: c centre, r radii, seg around, ring pole to pole */
      var seg = o.seg || 8, ring = o.ring || 6, V = [], i, j;
      for (i = 0; i <= ring; i++) { var th = -Math.PI / 2 + Math.PI * i / ring; for (j = 0; j <= seg; j++) { var ph = TAU * j / seg;
        var lp = [Math.cos(th) * Math.sin(ph) * o.r[0], Math.sin(th) * o.r[1], Math.cos(th) * Math.cos(ph) * o.r[2]];
        if (o.squash && lp[1] < 0) lp[1] *= o.squash;
        var p = rotP(lp, o.pitch || 0, o.yaw || 0, o.roll || 0); p[0] += o.c[0]; p[1] += o.c[1]; p[2] += o.c[2];
        V.push({ p: p, s: o.sOf ? o.sOf(p) : 0 }); } }
      for (i = 0; i < ring; i++) for (j = 0; j < seg; j++) { var a = i * (seg + 1) + j; if (i === 0) tri(G, V[a].p, V[a + seg + 2].p, V[a + seg + 1].p, o, o.bone, V[a].s, V[a + seg + 2].s, V[a + seg + 1].s);
        else if (i === ring - 1) tri(G, V[a].p, V[a + 1].p, V[a + seg + 1].p, o, o.bone, V[a].s, V[a + 1].s, V[a + seg + 1].s); else quad(G, V, a, a + 1, a + seg + 1, a + seg + 2, o, o.bone); }
    }
    function tube(G, o) {   /* a tapered limb from a to b, a faceted cap at b */
      var sides = o.sides || 6, ax = o.b[0] - o.a[0], ay = o.b[1] - o.a[1], az = o.b[2] - o.a[2], L = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
      ax /= L; ay /= L; az /= L;
      var ux = 0, uy = 1, uz = 0; if (Math.abs(ay) > 0.9) { ux = 1; uy = 0; }
      var vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux, vl = Math.sqrt(vx * vx + vy * vy + vz * vz); vx /= vl; vy /= vl; vz /= vl;
      ux = vy * az - vz * ay; uy = vz * ax - vx * az; uz = vx * ay - vy * ax;
      var V = [], i, j, rs = [o.ra, o.rb];
      for (i = 0; i < 2; i++) for (j = 0; j <= sides; j++) { var ph = TAU * j / sides, cs = Math.cos(ph), sn = Math.sin(ph), nx = ux * cs + vx * sn, ny = uy * cs + vy * sn, nz = uz * cs + vz * sn;
        V.push({ p: [o.a[0] + ax * L * i + nx * rs[i], o.a[1] + ay * L * i + ny * rs[i], o.a[2] + az * L * i + nz * rs[i]], s: 0 }); }
      for (j = 0; j < sides; j++) quad(G, V, j, j + 1, sides + 1 + j, sides + 2 + j, o, o.bone);
      var tip = [o.b[0] + ax * o.rb * 0.8, o.b[1] + ay * o.rb * 0.8, o.b[2] + az * o.rb * 0.8];
      for (j = 0; j < sides; j++) tri(G, V[sides + 1 + j].p, V[sides + 2 + j].p, tip, o, o.bone);
    }
    function plank(G, o) {   /* a flat shape (a wing panel, a feather): a convex outline in x-z at height y, t thick, top and bottom and its edge */
      var P = o.pts, n = P.length, h = (o.t || 0.01) / 2, y = o.y || 0, cx = 0, cz = 0, k;
      for (k = 0; k < n; k++) { cx += P[k][0] / n; cz += P[k][1] / n; }
      var top = { col: o.top }, bot = { col: o.under || o.top }, edge = { col: o.edge || o.under || o.top };
      for (k = 1; k < n - 1; k++) { tri(G, [P[0][0], y + h, P[0][1]], [P[k][0], y + h, P[k][1]], [P[k + 1][0], y + h, P[k + 1][1]], top, o.bone, 0, 0, 0, [0, 1, 0]);
        tri(G, [P[0][0], y - h, P[0][1]], [P[k][0], y - h, P[k][1]], [P[k + 1][0], y - h, P[k + 1][1]], bot, o.bone, 0, 0, 0, [0, -1, 0]); }
      for (k = 0; k < n; k++) { var a = P[k], b = P[(k + 1) % n], out = [(a[0] + b[0]) / 2 - cx, 0, (a[1] + b[1]) / 2 - cz];
        tri(G, [a[0], y + h, a[1]], [b[0], y + h, b[1]], [b[0], y - h, b[1]], edge, o.bone, 0, 0, 0, out); tri(G, [a[0], y + h, a[1]], [b[0], y - h, b[1]], [a[0], y - h, a[1]], edge, o.bone, 0, 0, 0, out); }
    }
    function eye(G, c, r, bone, fwd, sOf) {   /* a real eye: a dark iris, a black pupil toward the front, one small catchlight */
      ell(G, { c: c, r: [r, r, r], seg: 6, ring: 4, col: hex(0x2b1d12), bone: bone, sOf: sOf });
      ell(G, { c: [c[0] + fwd[0] * r * 0.55, c[1] + fwd[1] * r * 0.55, c[2] + fwd[2] * r * 0.55], r: [r * 0.55, r * 0.55, r * 0.55], seg: 5, ring: 3, col: hex(0x080606), bone: bone, sOf: sOf });
      ell(G, { c: [c[0] + fwd[0] * r * 0.75, c[1] + r * 0.45, c[2] + fwd[2] * r * 0.75], r: [r * 0.22, r * 0.22, r * 0.22], seg: 4, ring: 2, col: hex(0xffffff), bone: bone, sOf: sOf });
    }
    function finish(G, bones, kind) {
      var n = G.p.length / 3;
      return { kind: kind, count: n, rest: new Float32Array(G.p), nrest: new Float32Array(G.n), color: new Float32Array(G.c), bone: new Uint8Array(G.b), s: new Float32Array(G.s),
        pos: new Float32Array(G.p), nrm: new Float32Array(G.n), bones: bones, M: new Float64Array(bones.length * 12), rot: new Float64Array(bones.length * 6), origin: [0, 0, 0], ph: 0, ph2: 0, radius: 2 };
    }
    function flat(m) {   /* after a free deformation (the boa): every triangle's normal again from its own corners */
      var P = m.pos, N = m.nrm, i;
      for (i = 0; i < m.count; i += 3) { var k = i * 3, ux = P[k + 3] - P[k], uy = P[k + 4] - P[k + 1], uz = P[k + 5] - P[k + 2], vx = P[k + 6] - P[k], vy = P[k + 7] - P[k + 1], vz = P[k + 8] - P[k + 2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
        N[k] = N[k + 3] = N[k + 6] = nx; N[k + 1] = N[k + 4] = N[k + 7] = ny; N[k + 2] = N[k + 5] = N[k + 8] = nz; }
    }
    /* bone b's matrix = parent's . T(pivot + offset) . R(yaw . pitch . roll) . T(-pivot); rows [r00 r01 r02 tx, r10 r11 r12 ty, r20 r21 r22 tz]; a part never spans two bones, so its faces stay flat */
    function bonesPose(m) {
      var B = m.bones, M = m.M, R = m.rot, b;
      for (b = 0; b < B.length; b++) {
        var rx = R[b * 6], ry = R[b * 6 + 1], rz = R[b * 6 + 2], cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
        var r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx, r10 = cx * sz, r11 = cx * cz, r12 = -sx, r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
        var p = B[b].p, px = p[0], py = p[1], pz = p[2], ox = px + R[b * 6 + 3], oy = py + R[b * 6 + 4], oz = pz + R[b * 6 + 5];
        var t0 = ox - (r00 * px + r01 * py + r02 * pz), t1 = oy - (r10 * px + r11 * py + r12 * pz), t2 = oz - (r20 * px + r21 * py + r22 * pz), q = b * 12, par = B[b].parent;
        if (par == null || par < 0) { M[q] = r00; M[q + 1] = r01; M[q + 2] = r02; M[q + 3] = t0; M[q + 4] = r10; M[q + 5] = r11; M[q + 6] = r12; M[q + 7] = t1; M[q + 8] = r20; M[q + 9] = r21; M[q + 10] = r22; M[q + 11] = t2; }
        else { var P = par * 12, a00 = M[P], a01 = M[P + 1], a02 = M[P + 2], a03 = M[P + 3], a10 = M[P + 4], a11 = M[P + 5], a12 = M[P + 6], a13 = M[P + 7], a20 = M[P + 8], a21 = M[P + 9], a22 = M[P + 10], a23 = M[P + 11];
          M[q] = a00 * r00 + a01 * r10 + a02 * r20; M[q + 1] = a00 * r01 + a01 * r11 + a02 * r21; M[q + 2] = a00 * r02 + a01 * r12 + a02 * r22; M[q + 3] = a00 * t0 + a01 * t1 + a02 * t2 + a03;
          M[q + 4] = a10 * r00 + a11 * r10 + a12 * r20; M[q + 5] = a10 * r01 + a11 * r11 + a12 * r21; M[q + 6] = a10 * r02 + a11 * r12 + a12 * r22; M[q + 7] = a10 * t0 + a11 * t1 + a12 * t2 + a13;
          M[q + 8] = a20 * r00 + a21 * r10 + a22 * r20; M[q + 9] = a20 * r01 + a21 * r11 + a22 * r21; M[q + 10] = a20 * r02 + a21 * r12 + a22 * r22; M[q + 11] = a20 * t0 + a21 * t1 + a22 * t2 + a23; }
      }
      var P0 = m.rest, N0 = m.nrest, PO = m.pos, NO = m.nrm, BI = m.bone, i;
      for (i = 0; i < m.count; i++) { var k = i * 3, q2 = BI[i] * 12, x = P0[k], y = P0[k + 1], z = P0[k + 2], nx = N0[k], ny = N0[k + 1], nz = N0[k + 2];
        PO[k] = M[q2] * x + M[q2 + 1] * y + M[q2 + 2] * z + M[q2 + 3]; PO[k + 1] = M[q2 + 4] * x + M[q2 + 5] * y + M[q2 + 6] * z + M[q2 + 7]; PO[k + 2] = M[q2 + 8] * x + M[q2 + 9] * y + M[q2 + 10] * z + M[q2 + 11];
        NO[k] = M[q2] * nx + M[q2 + 1] * ny + M[q2 + 2] * nz; NO[k + 1] = M[q2 + 4] * nx + M[q2 + 5] * ny + M[q2 + 6] * nz; NO[k + 2] = M[q2 + 8] * nx + M[q2 + 9] * ny + M[q2 + 10] * nz; }
    }
    function setR(m, b, rx, ry, rz, tx, ty, tz) { var q = b * 6, R = m.rot; R[q] = rx || 0; R[q + 1] = ry || 0; R[q + 2] = rz || 0; R[q + 3] = tx || 0; R[q + 4] = ty || 0; R[q + 5] = tz || 0; }

    /* THE BOA: the JAMAICAN YELLOW BOA (Chilabothrus subflavus): yellow-olive in front crossed by black bands, the bands widening down the body, the
       back third almost black; a pale yellow belly darkening behind. 2.0 m (adults 1.5-2.5 m). Colour is laid by WHOLE RINGS (a ring is ~6 cm: a band
       the eye can read on a phone). A lower JAW (bone 2) hinged under the eyes opens on the snap and gapes in a heavy warning; the forked tongue
       (bone 1) flicks. Built straight along -z (the snout at z = 0); a vertex keeps its arc length s; the pose lays it along the spine. */
    var BOA_L = 2.0, BOA_N = 26;
    function boaR(s) { if (s < 0.04) return 0.017 + s * 0.35; if (s < 0.1) return 0.031; if (s < 0.16) return 0.031 - (s - 0.1) * 0.15; if (s < 0.8) return 0.022 + (s - 0.16) / 0.64 * 0.02; return 0.042 * Math.pow(Math.max(0, (BOA_L - s) / (BOA_L - 0.8)), 0.7) + 0.004; }
    function boaBand(i, s) {   /* 0 light, 1 dark, 2 the back's dim olive ring: front 2 light : 1 dark, middle 1 : 1, the back third almost all dark */
      if (s < 0.17) return -1;
      if (s < 0.75) return i % 3 === 2 ? 1 : 0;
      if (s < BOA_L * 0.66) return i % 2;
      return i % 5 === 0 ? 2 : 1;
    }
    function buildBoa() {
      var G = G0(), light = hex(0xc7b44a), olive = hex(0x9a9038), dark = hex(0x1b1a14), dim = hex(0x4a4626), belly = hex(0xe3d58a), bellyB = hex(0x4a4630), headC = hex(0xb09c44), headD = hex(0x3a3420);
      var rings = 34, sides = 8, V = [], i, j;
      for (i = 0; i <= rings; i++) { var s = BOA_L * Math.pow(i / rings, 1.12), r = boaR(s);
        for (j = 0; j <= sides; j++) { var ph = TAU * j / sides; V.push({ p: [Math.sin(ph) * r * 1.12, Math.cos(ph) * r * 0.82 + r * 0.82, -s], s: s, cy: Math.cos((TAU * (j + 0.5)) / sides) }); } }
      for (i = 0; i < rings; i++) { var sm = (V[i * (sides + 1)].s + V[(i + 1) * (sides + 1)].s) / 2, band = boaBand(i, sm), back = clamp((sm - 0.75) / (BOA_L * 0.66 - 0.75), 0, 1);
        for (j = 0; j < sides; j++) { var a = i * (sides + 1) + j, cy = V[a].cy, c;
          if (cy < -0.55) c = mixc(belly, bellyB, clamp((sm - 0.5) / 1.0, 0, 1));
          else if (band === -1) c = cy > 0.4 ? (j % 3 === 0 ? headD : headC) : mixc(headC, belly, 0.4);
          else c = band === 1 ? dark : band === 2 ? dim : mixc(light, olive, back);
          quad(G, V, a, a + 1, a + sides + 1, a + sides + 2, { col: c }, 0); } }
      var snout = [0, 0.017, 0.01];
      for (j = 0; j < sides; j++) tri(G, V[j + 1].p, V[j].p, snout, { col: headC }, 0, 0, 0, 0);
      var sOf = function (p) { return -p[2]; };
      eye(G, [0.022, 0.042, -0.06], 0.008, 0, [0.6, 0, 0.8], sOf); eye(G, [-0.022, 0.042, -0.06], 0.008, 0, [-0.6, 0, 0.8], sOf);
      tube(G, { a: [0.023, 0.036, -0.02], b: [0.03, 0.036, -0.11], ra: 0.006, rb: 0.004, sides: 4, col: headD, bone: 0, sOf: sOf });   /* the dark eye stripe (it rides at s 0: a short head piece) */
      ell(G, { c: [0, 0.008, -0.04], r: [0.02, 0.004, 0.045], seg: 6, ring: 3, col: hex(0xd25d6e), bone: 0 });   /* the mouth's inside, hidden by the jaw until it opens */
      ell(G, { c: [0, 0.009, -0.045], r: [0.024, 0.009, 0.05], seg: 7, ring: 4, top: hex(0xd8627a), belly: hex(0xdccb7c), bone: 2 });   /* the lower jaw (pink on top) */
      var red = hex(0xbf2438);
      tube(G, { a: [0, 0.018, -0.005], b: [0.008, 0.018, 0.06], ra: 0.003, rb: 0.0015, sides: 3, col: red, bone: 1 });
      tube(G, { a: [0, 0.018, -0.005], b: [-0.008, 0.018, 0.06], ra: 0.003, rb: 0.0015, sides: 3, col: red, bone: 1 });
      var m = finish(G, [{ name: 'spine', p: [0, 0, 0] }, { name: 'tongue', p: [0, 0, 0] }, { name: 'jaw', p: [0, 0.012, -0.09] }], 'boa');
      m.nodes = new Float64Array(BOA_N * 9); m.radius = BOA_L * 0.6 + 1.2; m.jaw = 0; return m;
    }
    function poseBoa(m, a, dt) {   /* the spine from the trail behind its head, the front raised into an S when it warns, straightened when it strikes */
      var N = BOA_N, ds = BOA_L / (N - 1), nd = m.nodes, tr = a.tr, n = tr.length / 3, i, j;
      var hx = a.x, hy = a.y, hz = a.z, k = a.tH, px = hx, py = hy, pz = hz, acc = 0, cnt = 0;
      nd[0] = hx; nd[1] = hy; nd[2] = hz;
      for (i = 1; i < N; i++) {
        var want = i * ds;
        while (acc < want && cnt < a.tN - 1) { var q = k * 3, qx = tr[q], qy = tr[q + 1], qz = tr[q + 2], L = Math.sqrt((qx - px) * (qx - px) + (qz - pz) * (qz - pz));
          if (acc + L >= want && L > 1e-6) { var u = (want - acc) / L; nd[i * 9] = px + (qx - px) * u; nd[i * 9 + 1] = py + (qy - py) * u; nd[i * 9 + 2] = pz + (qz - pz) * u; break; }
          acc += L; px = qx; py = qy; pz = qz; k = (k - 1 + n) % n; cnt++; }
        if (acc < want && !(cnt < a.tN - 1)) { var bx = i > 1 ? nd[(i - 1) * 9] - nd[(i - 2) * 9] : -Math.sin(a.dir) * ds, bz = i > 1 ? nd[(i - 1) * 9 + 2] - nd[(i - 2) * 9 + 2] : -Math.cos(a.dir) * ds, bl = Math.sqrt(bx * bx + bz * bz) || 1;
          nd[i * 9] = nd[(i - 1) * 9] + bx / bl * ds; nd[i * 9 + 1] = nd[(i - 1) * 9 + 1]; nd[i * 9 + 2] = nd[(i - 1) * 9 + 2] + bz / bl * ds; }
      }
      var fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), sx = fz, sz = -fx, FRONT = 0.8, rear = ease(a.rear), ext = ease(a.ext);
      for (i = 0; i < N; i++) { var s = i * ds; if (s >= FRONT) break; var w = 1 - s / FRONT, w2 = w * w;
        var up = rear * 0.3 * Math.pow(w, 1.3) + ext * 0.1 * w2, back = -rear * 0.36 * w2 + ext * (a.S.neck || 0.75) * w2, lat = rear * 0.13 * Math.sin(Math.PI * 2 * s / FRONT) * w;
        nd[i * 9] += fx * back + sx * lat; nd[i * 9 + 1] += up; nd[i * 9 + 2] += fz * back + sz * lat; }
      var ox = nd[(N >> 1) * 9], oy = nd[(N >> 1) * 9 + 1], oz = nd[(N >> 1) * 9 + 2]; m.origin[0] = ox; m.origin[1] = oy; m.origin[2] = oz;
      for (i = 0; i < N; i++) { var i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1), tx = nd[i0 * 9] - nd[i1 * 9], ty = nd[i0 * 9 + 1] - nd[i1 * 9 + 1], tz = nd[i0 * 9 + 2] - nd[i1 * 9 + 2], tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
        nd[i * 9 + 3] = tx / tl; nd[i * 9 + 4] = ty / tl; nd[i * 9 + 5] = tz / tl; }
      var tng = clamp(m.tng || 0, 0, 1), jw = clamp(m.jaw || 0, 0, 1) * 0.85, jc = Math.cos(jw), js = Math.sin(jw), P0 = m.rest, PO = m.pos, S = m.s, BI = m.bone;
      for (j = 0; j < m.count; j++) {
        var kk = j * 3, sv = S[j], f = clamp(sv / ds, 0, N - 1.001), i2 = Math.floor(f), uu = f - i2, A0 = i2 * 9, A1 = (i2 + 1) * 9;
        var cx = nd[A0] + (nd[A1] - nd[A0]) * uu, cy = nd[A0 + 1] + (nd[A1 + 1] - nd[A0 + 1]) * uu, cz = nd[A0 + 2] + (nd[A1 + 2] - nd[A0 + 2]) * uu;
        var Tx = nd[A0 + 3] + (nd[A1 + 3] - nd[A0 + 3]) * uu, Ty = nd[A0 + 4] + (nd[A1 + 4] - nd[A0 + 4]) * uu, Tz = nd[A0 + 5] + (nd[A1 + 5] - nd[A0 + 5]) * uu, Tl = Math.sqrt(Tx * Tx + Ty * Ty + Tz * Tz) || 1; Tx /= Tl; Ty /= Tl; Tz /= Tl;
        var Xx = Tz, Xz = -Tx, Xl = Math.sqrt(Xx * Xx + Xz * Xz) || 1; Xx /= Xl; Xz /= Xl;
        var Yx = Ty * Xz, Yy = Tz * Xx - Tx * Xz, Yz = -Ty * Xx;   /* up = tangent x side */
        var lx = P0[kk], ly = P0[kk + 1], lz = sv === 0 ? P0[kk + 2] : 0;
        if (BI[j] === 1) lz = P0[kk + 2] * tng - 0.03 * (1 - tng);
        else if (BI[j] === 2) { var dy = ly - 0.012, dz = lz + 0.09; ly = 0.012 + dy * jc - dz * js; lz = -0.09 + dy * js + dz * jc; }   /* the jaw drops about its hinge under the eyes */
        PO[kk] = cx + Xx * lx + Yx * ly + Tx * lz - ox; PO[kk + 1] = cy + Yy * ly + Ty * lz - oy; PO[kk + 2] = cz + Xz * lx + Yz * ly + Tz * lz - oz; }
      flat(m); void dt;
    }

    /* THE LAND CRAB: Gecarcinus at its true size (a ~10 cm shell): a purple-black shell with the two orange spots behind the eyes, orange-red legs
       with a knee each (two bones), purple claws (the right one bigger) whose fingers open and snap shut; it always runs sideways */
    var CK = 0.37;   /* the old 27 cm model, brought to 10 cm */
    function buildCrab() {
      var G = G0(), shell = hex(0x2f1f3d), spot = hex(0xe08a2a), under = hex(0xc96a35), leg = hex(0xd4502a), legD = hex(0x8f2f1c), claw = hex(0x6e2245), tip = hex(0xf0cfa8);
      var k = CK, P = function (x, y, z) { return [x * k, y * k, z * k]; };
      var bones = [{ name: 'root', p: [0, 0, 0] }, { name: 'body', p: P(0, 0.1, 0), parent: 0 }, { name: 'clawL', p: P(0.07, 0.1, 0.07), parent: 1 }, { name: 'clawR', p: P(-0.07, 0.1, 0.07), parent: 1 },
        { name: 'fingerL', p: P(0.13, 0.11, 0.2), parent: 2 }, { name: 'fingerR', p: P(-0.13, 0.11, 0.2), parent: 3 }];
      ell(G, { c: P(0, 0.105, 0), r: [0.135 * k, 0.062 * k, 0.1 * k], seg: 10, ring: 5, top: shell, belly: under, bone: 1, squash: 0.6,
        pat: function (c, nx, ny, nz, x, y, z) { return ny > 0.3 && nz > 0.35 && Math.abs(Math.abs(x) - 0.05 * k) < 0.03 * k ? spot : ny > 0.7 ? mixc(c, hex(0x4a3460), 0.5) : c; } });
      [1, -1].forEach(function (sd) {
        tube(G, { a: P(0.035 * sd, 0.14, 0.075), b: P(0.05 * sd, 0.19, 0.095), ra: 0.008 * k, rb: 0.007 * k, sides: 4, col: shell, bone: 1 });
        eye(G, P(0.05 * sd, 0.197, 0.097), 0.014 * k, 1, [0, 0.3, 1]);
        var cb = sd > 0 ? 2 : 3, fb = sd > 0 ? 4 : 5, big = sd > 0 ? 1 : 1.35;
        tube(G, { a: P(0.07 * sd, 0.1, 0.07), b: P(0.12 * sd, 0.11, 0.14), ra: 0.02 * big * k, rb: 0.017 * big * k, sides: 5, top: claw, belly: leg, bone: cb });
        ell(G, { c: P(0.13 * sd, 0.115, 0.18), r: [0.032 * big * k, 0.026 * big * k, 0.048 * big * k], seg: 7, ring: 4, top: claw, belly: hex(0xb85466), bone: cb });
        tube(G, { a: P(0.133 * sd, 0.1, 0.21), b: P(0.128 * sd, 0.092, 0.26 * (big > 1 ? 1.08 : 1)), ra: 0.012 * big * k, rb: 0.004 * k, sides: 4, col: tip, bone: cb });   /* the fixed finger */
        tube(G, { a: P(0.13 * sd, 0.122, 0.205), b: P(0.126 * sd, 0.118, 0.255 * (big > 1 ? 1.08 : 1)), ra: 0.01 * big * k, rb: 0.003 * k, sides: 4, col: tip, bone: fb });   /* the moving finger (its own bone) */
        for (var li = 0; li < 4; li++) { var z0 = 0.045 - li * 0.035, hb = bones.length, kb = hb + 1, kx = 0.2 * sd, ky = 0.15, kz = z0 * 1.4 - 0.01, fx = 0.27 * sd, fz = z0 * 1.7 - 0.02;
          bones.push({ name: 'hip' + li + (sd > 0 ? 'L' : 'R'), p: P(0.11 * sd, 0.1, z0), parent: 1 }, { name: 'knee' + li + (sd > 0 ? 'L' : 'R'), p: P(kx, ky, kz), parent: hb });
          tube(G, { a: P(0.11 * sd, 0.1, z0), b: P(kx, ky, kz), ra: 0.016 * k, rb: 0.013 * k, sides: 5, top: leg, belly: under, bone: hb });
          tube(G, { a: P(kx, ky, kz), b: P(fx, 0.008, fz), ra: 0.013 * k, rb: 0.005 * k, sides: 5, top: leg, belly: legD, bone: kb }); }
      });
      var m = finish(G, bones, 'crab'); m.radius = 0.25; return m;
    }
    function poseCrab(m, a, dt) {
      var mvK = a.v > 0.03 ? 1 : 0, ph = a.k * (a.mv === 1 ? 40 : 55), bob = 0.003 * Math.sin(ph * 2) * mvK, rear = ease(a.rear), ext = ease(a.ext), t = m.ph += dt;
      setR(m, 0, 0, 0, 0); setR(m, 1, 0, 0, 0.04 * Math.sin(ph) * mvK, 0, bob + rear * 0.01, 0);
      var pinch = a.state === 'strike' ? ext : 0, sway = 0.08 * Math.sin(t * 2.3), open = a.state === 'warn' ? 0.5 + 0.2 * Math.sin(t * 14) : a.state === 'strike' ? 0.5 * (1 - ext) : 0.08 + 0.06 * Math.sin(t * 1.7);
      setR(m, 2, -0.9 * rear + 0.5 * pinch + sway, 0.2 * rear, -0.3 * rear); setR(m, 3, -0.9 * rear + 0.5 * pinch - sway, -0.2 * rear, 0.3 * rear);
      setR(m, 4, -open, 0, 0); setR(m, 5, -open, 0, 0);   /* the moving fingers open, and snap shut on the strike */
      for (var L = 0; L < 8; L++) { var li = L % 4, sd = L < 4 ? 1 : -1, b = 6 + L * 2, off = (li % 2) * Math.PI + (sd > 0 ? 0 : Math.PI);
        var sw = Math.sin(ph + off) * 0.3 * mvK, lift = Math.max(0, Math.cos(ph + off)) * 0.4 * mvK;
        setR(m, b, 0, sw * 0.5, lift * sd); setR(m, b + 1, 0, 0, -sd * (0.15 + 0.35 * lift - 0.1 * rear)); }   /* the knee bends as the leg lifts */
      bonesPose(m);
    }

    /* THE MONGOOSE: the small Indian mongoose of the islands, grizzled tawny, a long low body, a pointed face, a long tapering tail; it trots, it
       BOUNDS when it darts (front feet together, hind feet together, the back flexing), it stands up to look, and it sleeps curled at night */
    function buildMongoose() {
      var G = G0(), fur = hex(0x8c6a3e), pale = hex(0xc4a676), dark = hex(0x4a3420), nose = hex(0x241812);
      var grizzle = function (c, nx, ny, nz, x, y, z) { var g = 0.5 + 0.5 * Math.sin(x * 97 + z * 61 + y * 43); return mixc(c, dark, 0.16 * g); };
      var bones = [{ name: 'root', p: [0, 0, 0] }, { name: 'body', p: [0, 0.1, -0.13], parent: 0 }, { name: 'head', p: [0, 0.15, 0.15], parent: 1 }, { name: 'tail', p: [0, 0.12, -0.18], parent: 1 },
        { name: 'legFL', p: [0.035, 0.09, 0.1], parent: 1 }, { name: 'legFR', p: [-0.035, 0.09, 0.1], parent: 1 }, { name: 'legHL', p: [0.035, 0.09, -0.11], parent: 0 }, { name: 'legHR', p: [-0.035, 0.09, -0.11], parent: 0 }];
      ell(G, { c: [0, 0.12, 0], r: [0.058, 0.06, 0.2], seg: 9, ring: 6, top: fur, belly: pale, bone: 1, pat: grizzle });
      ell(G, { c: [0, 0.165, 0.19], r: [0.046, 0.044, 0.062], seg: 8, ring: 5, top: fur, belly: pale, bone: 2, pat: grizzle });
      tube(G, { a: [0, 0.16, 0.23], b: [0, 0.148, 0.3], ra: 0.03, rb: 0.012, sides: 6, top: fur, belly: pale, bone: 2 });
      ell(G, { c: [0, 0.149, 0.305], r: [0.011, 0.01, 0.009], seg: 5, ring: 3, col: nose, bone: 2 });
      [1, -1].forEach(function (sd) { eye(G, [0.026 * sd, 0.182, 0.235], 0.0085, 2, [0.4 * sd, 0, 0.9]);
        ell(G, { c: [0.03 * sd, 0.2, 0.17], r: [0.014, 0.011, 0.007], seg: 5, ring: 3, col: dark, bone: 2 }); });
      tube(G, { a: [0, 0.12, -0.17], b: [0, 0.1, -0.36], ra: 0.038, rb: 0.026, sides: 7, top: fur, belly: pale, bone: 3, pat: grizzle });
      tube(G, { a: [0, 0.1, -0.36], b: [0, 0.075, -0.56], ra: 0.026, rb: 0.008, sides: 7, top: fur, belly: dark, bone: 3, pat: grizzle });
      [[0.035, 0.1, 4], [-0.035, 0.1, 5], [0.035, -0.11, 6], [-0.035, -0.11, 7]].forEach(function (L) {
        tube(G, { a: [L[0], 0.1, L[1]], b: [L[0] * 1.1, 0.012, L[1] + 0.01], ra: 0.019, rb: 0.012, sides: 5, top: fur, belly: dark, bone: L[2] });
        ell(G, { c: [L[0] * 1.1, 0.01, L[1] + 0.02], r: [0.013, 0.008, 0.02], seg: 5, ring: 3, col: dark, bone: L[2] }); });
      var m = finish(G, bones, 'mongoose'); m.radius = 0.8; return m;
    }
    function poseMongoose(m, a, dt) {
      var mv = a.v > 0.05 ? Math.min(1, a.v / 2) : 0, bound = a.mv === 1 && mv > 0, ph = a.k * (bound ? 5.5 : 10), st = ease(a.stand), cu = ease(a.curl || 0), t = m.ph += dt, sw = 0.7 * mv;
      if (bound) {   /* the bound: both front feet, then both hind feet; the back arches and stretches; the whole body lifts off */
        var c = Math.sin(ph);
        setR(m, 0, 0, 0, 0, 0, 0.05 * Math.max(0, Math.sin(ph + 0.6)), 0); setR(m, 1, 0.2 * c, 0, 0);
        setR(m, 2, -0.18 * c, 0, 0); setR(m, 3, -0.35 + 0.3 * c, 0, 0);
        setR(m, 4, 0.9 * c, 0, 0); setR(m, 5, 0.9 * c, 0, 0); setR(m, 6, -0.9 * c, 0, 0); setR(m, 7, -0.9 * c, 0, 0);
      } else {
        setR(m, 0, 0, 0, 0, 0, 0.012 * Math.abs(Math.sin(ph)) * mv - 0.05 * cu, 0);
        setR(m, 1, -1.15 * st + 0.12 * cu, 0.5 * cu, 0);
        setR(m, 2, 0.95 * st + 0.5 * cu + 0.1 * Math.sin(t * 1.3) * (1 - mv) * (1 - cu), (0.5 * Math.sin(t * 0.7) * (1 - mv) * (a.state === 'idle' ? 1 : 0.3)) * (1 - cu) + 0.9 * cu, 0);
        setR(m, 3, -0.25 + 0.5 * st + 0.12 * Math.sin(ph * 0.5 + t) * (1 - cu), 0.25 * Math.sin(t * 1.7 + ph * 0.3) * (1 - cu) + 1.3 * cu, 0);
        setR(m, 4, Math.sin(ph) * sw + 0.6 * st - 1.2 * cu, 0, 0); setR(m, 5, Math.sin(ph + Math.PI) * sw + 0.6 * st - 1.2 * cu, 0, 0);
        setR(m, 6, Math.sin(ph + Math.PI) * sw + 1.2 * cu, 0, 0); setR(m, 7, Math.sin(ph) * sw + 1.2 * cu, 0, 0);
      }
      bonesPose(m);
    }

    /* THE SEA TURTLE: a green turtle (~1 m shell), olive with darker scutes, a pale plastron, wide front flippers that fly through the water */
    function buildTurtle() {
      var G = G0(), shell = hex(0x5e5530), scute = hex(0x3a3420), plast = hex(0xd9c98e), skin = hex(0x6f7a4a), skinB = hex(0xc8c08a);
      var bones = [{ name: 'root', p: [0, 0, 0] }, { name: 'head', p: [0, 0.01, 0.42] }, { name: 'fFL', p: [0.26, 0, 0.22] }, { name: 'fFR', p: [-0.26, 0, 0.22] }, { name: 'fHL', p: [0.18, -0.01, -0.36] }, { name: 'fHR', p: [-0.18, -0.01, -0.36] }];
      ell(G, { c: [0, 0, 0], r: [0.34, 0.13, 0.46], seg: 12, ring: 6, top: shell, belly: plast, bone: 0, squash: 0.45,
        pat: function (c, nx, ny, nz, x, y, z) { if (ny < 0.15) return c; var a = Math.atan2(x, z), r = Math.sqrt(x * x + z * z), e = Math.abs(Math.sin(a * 2.5)) < 0.16 || Math.abs(r - 0.2) < 0.04; return e ? mixc(c, scute, 0.75) : mixc(c, hex(0x7a6a3a), 0.25 * (0.5 + 0.5 * Math.sin(a * 5))); } });
      ell(G, { c: [0, 0.02, 0.53], r: [0.08, 0.07, 0.11], seg: 8, ring: 5, top: skin, belly: skinB, bone: 1, pat: function (c, nx, ny) { return ny > 0.4 ? mixc(c, hex(0x8a8a50), 0.4) : c; } });
      [1, -1].forEach(function (sd) { eye(G, [0.05 * sd, 0.05, 0.6], 0.012, 1, [0.5 * sd, 0, 0.85]);
        ell(G, { c: [0.45 * sd, -0.01, 0.12], r: [0.25, 0.025, 0.085], yaw: 0.55 * sd, seg: 8, ring: 4, top: skin, belly: skinB, bone: sd > 0 ? 2 : 3, pat: function (c, nx, ny, nz, x) { return Math.sin(x * 60) > 0.6 ? mixc(c, scute, 0.4) : c; } });
        ell(G, { c: [0.25 * sd, -0.02, -0.46], r: [0.11, 0.02, 0.065], yaw: -0.5 * sd, seg: 7, ring: 4, top: skin, belly: skinB, bone: sd > 0 ? 4 : 5 }); });
      var m = finish(G, bones, 'turtle'); m.radius = 1.0; return m;
    }
    function poseTurtle(m, a, dt) {
      var sp = Math.min(1, 0.35 + a.v / 1.5), t = m.ph += dt * (0.9 + a.v * 1.1), f = Math.sin(t * 2.2);
      setR(m, 0, 0, 0, 0); setR(m, 1, 0.12 * Math.sin(t * 1.1), 0.1 * Math.sin(t * 0.6), 0);
      setR(m, 2, 0.35 * Math.cos(t * 2.2) * sp, 0.25 * f * sp, 0.55 * f * sp); setR(m, 3, 0.35 * Math.cos(t * 2.2) * sp, -0.25 * f * sp, -0.55 * f * sp);
      setR(m, 4, 0, 0.3 * Math.sin(t * 2.2 + 1) * sp, 0); setR(m, 5, 0, -0.3 * Math.sin(t * 2.2 + 1) * sp, 0);
      bonesPose(m);
    }

    /* THE BIRDS, at their real spans: the BROWN PELICAN (2.0 m; grey-brown, silvery coverts, a white-yellow head, a chestnut neck, the long bill and
       its pouch, broad wings with five splayed dark primaries) and the LAUGHING GULL (1.0 m; a black hood, white eye crescents, a red bill, a dark
       grey back over white, a white trailing edge, black pointed wingtips). Each wing: an arm panel (bone wL), a hand panel and its primaries (wL2). */
    function wing(G, P, sd, A) {   /* A: the wing's numbers (half-span parts in metres) */
      var x = function (v) { return v * sd; }, arm = [], hand = [], i;
      arm.push([x(A.sh), A.le], [x(A.wr), A.le - 0.01], [x(A.wr), A.le - A.chW], [x(A.sh), A.le - A.chA]);
      hand.push([x(A.wr), A.le - 0.01], [x(A.hd), A.le - 0.04], [x(A.hd), A.le - 0.04 - A.chH], [x(A.wr), A.le - A.chW]);
      plank(G, { pts: arm, t: A.t, y: A.y, top: A.top, under: A.under, edge: A.under, bone: sd > 0 ? 2 : 3 });
      plank(G, { pts: hand, t: A.t * 0.8, y: A.y, top: A.top2 || A.top, under: A.under, edge: A.under, bone: sd > 0 ? 4 : 5 });
      if (A.trail) plank(G, { pts: [[x(A.sh + 0.02), A.le - A.chA - 0.002], [x(A.wr), A.le - A.chW - 0.002], [x(A.wr), A.le - A.chW + A.trail], [x(A.sh + 0.02), A.le - A.chA + A.trail]], t: A.t * 1.1, y: A.y, top: A.trailC, bone: sd > 0 ? 2 : 3 });
      for (i = 0; i < A.n; i++) {   /* the primaries, fanned from the hand's tip and back edge */
        var u = A.n > 1 ? i / (A.n - 1) : 0, ang = (A.fan0 + (A.fan1 - A.fan0) * u), bx = A.hd - 0.01, bz = A.le - 0.04 - A.chH * u * 0.9, L = A.pl * (1 - 0.25 * Math.abs(u - 0.3)), w = A.pw;
        var dx = Math.cos(ang), dz = Math.sin(ang), nx = -dz, nz = dx;
        var pts = [[bx - nx * w, bz - nz * w], [bx + dx * L * 0.7 - nx * w, bz + dz * L * 0.7 - nz * w], [bx + dx * L, bz + dz * L], [bx + dx * L * 0.7 + nx * w, bz + dz * L * 0.7 + nz * w], [bx + nx * w, bz + nz * w]];
        plank(G, { pts: pts.map(function (q) { return [x(q[0]), q[1]]; }), t: A.t * 0.5, y: A.y - 0.002 * i, top: A.prim, under: A.prim, bone: sd > 0 ? 4 : 5 }); }
    }
    function buildBird(kind) {
      var Pel = kind === 'pelican', G = G0(), k = Pel ? 1 : 0.42;
      var back = hex(Pel ? 0x6b625a : 0x5f666f), belly = hex(Pel ? 0x8e8574 : 0xf6f6f2), head = hex(Pel ? 0xf1e9cc : 0x1f1f24), bill = hex(Pel ? 0xc9a35a : 0xb3262c);
      var bones = [{ name: 'root', p: [0, 0, 0] }, { name: 'head', p: [0, 0.1 * k, 0.32 * k] }, { name: 'wL', p: [0.1 * k, 0.05 * k, 0.04 * k] }, { name: 'wR', p: [-0.1 * k, 0.05 * k, 0.04 * k] },
        { name: 'wL2', p: [Pel ? 0.55 : 0.27, 0.05 * k, 0], parent: 2 }, { name: 'wR2', p: [Pel ? -0.55 : -0.27, 0.05 * k, 0], parent: 3 }, { name: 'tail', p: [0, 0.02 * k, -0.36 * k] }];
      ell(G, { c: [0, 0, 0], r: [0.17 * k, 0.16 * k, 0.42 * k], seg: 10, ring: 6, top: back, belly: belly, bone: 0 });
      if (Pel) tube(G, { a: [0, 0.06, 0.28], b: [0, 0.22, 0.44], ra: 0.065, rb: 0.05, sides: 7, top: hex(0x5a3a28), belly: hex(0xe8e0c8), bone: 1 });
      var hc = Pel ? [0, 0.26, 0.5] : [0, 0.1 * k * 1.0 + 0.02, 0.44 * k], hr = Pel ? [0.062, 0.066, 0.09] : [0.045, 0.046, 0.058];
      ell(G, { c: hc, r: hr, seg: 8, ring: 5, top: head, belly: Pel ? head : hex(0x2a2a30), bone: 1 });
      [1, -1].forEach(function (sd) { var ec = [hc[0] + sd * hr[0] * 0.72, hc[1] + hr[1] * 0.25, hc[2] + hr[2] * 0.35], er = Pel ? 0.011 : 0.0075; eye(G, ec, er, 1, [0.6 * sd, 0, 0.8]);
        if (!Pel) { ell(G, { c: [ec[0] + sd * 0.002, ec[1] + er * 1.5, ec[2] - 0.002], r: [er * 0.5, er * 0.35, er * 1.1], seg: 4, ring: 2, col: hex(0xffffff), bone: 1 });
          ell(G, { c: [ec[0] + sd * 0.002, ec[1] - er * 1.5, ec[2] - 0.002], r: [er * 0.5, er * 0.35, er * 1.1], seg: 4, ring: 2, col: hex(0xffffff), bone: 1 }); } });   /* a laughing gull's white eye crescents */
      if (Pel) { tube(G, { a: [0, 0.245, 0.56], b: [0, 0.12, 0.98], ra: 0.035, rb: 0.014, sides: 6, top: bill, belly: hex(0xa07a40), bone: 1 });
        ell(G, { c: [0, 0.165, 0.74], r: [0.032, 0.05, 0.19], pitch: 0.22, seg: 7, ring: 4, top: hex(0x7a5a3e), belly: hex(0x5a4030), bone: 1 }); }
      else tube(G, { a: [0, hc[1] - 0.005, hc[2] + hr[2] * 0.8], b: [0, hc[1] - 0.015, hc[2] + hr[2] * 0.8 + 0.05], ra: 0.011, rb: 0.003, sides: 5, col: bill, bone: 1 });
      tube(G, { a: [0, 0.02 * k, -0.34 * k], b: [0, 0.03 * k, -0.62 * k], ra: 0.11 * k, rb: 0.05 * k, sides: 6, top: Pel ? back : belly, belly: belly, bone: 6 });
      var Wd = Pel ? { sh: 0.1, wr: 0.55, hd: 0.78, le: 0.1, chA: 0.34, chW: 0.3, chH: 0.24, t: 0.03, y: 0.05, n: 5, pl: 0.24, pw: 0.028, fan0: -0.15, fan1: -1.25, top: hex(0x6b625a), top2: hex(0x858076), under: hex(0x7a7268), prim: hex(0x231f1c) }
        : { sh: 0.04, wr: 0.27, hd: 0.4, le: 0.045, chA: 0.15, chW: 0.13, chH: 0.09, t: 0.014, y: 0.022, n: 4, pl: 0.12, pw: 0.012, fan0: -0.2, fan1: -0.8, top: hex(0x5d646d), under: hex(0xeeeeea), prim: hex(0x141416), trail: 0.022, trailC: hex(0xf4f4f2) };
      wing(G, null, 1, Wd); wing(G, null, -1, Wd);
      var m = finish(G, bones, kind); m.radius = Pel ? 1.4 : 0.7; return m;
    }
    function poseBird(m, a, dt) {
      var quick = a.mv === 1 || a.state === 'flee' || a.state === 'stalk', hang = a.state === 'warn', glide = !quick && !hang;
      var rate = hang ? 9 : quick ? (a.sp === 'pelican' ? 4.5 : 7.5) : (a.sp === 'pelican' ? 2.6 : 4.2), env = glide ? Math.max(0, Math.sin((m.ph2 += dt * 0.35) * TAU)) : 1;
      m.ph += dt * rate; var f = Math.sin(m.ph), fold = ease(a.fold + (a.state === 'strike' ? 0.8 : 0));
      var amp = (glide ? 0.55 * env : hang ? 0.85 : 0.75) * (1 - fold), dih = glide ? 0.08 : 0;
      setR(m, 0, 0, 0, 0);
      setR(m, 1, (a.state === 'warn' ? -0.4 : 0) + 0.06 * Math.sin(m.ph * 0.5), 0, 0);
      setR(m, 2, 0, 1.1 * fold, f * amp + dih - 0.3 * fold); setR(m, 3, 0, -1.1 * fold, -(f * amp + dih) + 0.3 * fold);
      var f2 = Math.sin(m.ph - 0.8); setR(m, 4, 0, 0.9 * fold, f2 * amp * 0.6); setR(m, 5, 0, -0.9 * fold, -f2 * amp * 0.6);
      setR(m, 6, 0.15 * Math.sin(m.ph * 0.5) - 0.2 * fold, 0, 0);
      bonesPose(m);
    }
    /* ---------------- 714c THE SEA'S KIT (Trunks, Oct 28): the same flat faces, the same one material ----------------
       fin3: a flat fin of any outline in any plane (P: corners star-shaped from P[0]; t thick; hint: the side its top faces).
       loft: a body of revolution along -z from the snout (z0): prof(u) -> [rx, ry, cy] at u = s / L, col(u, up, side) one colour per face. */
    function fin3(G, P, t, col, bone, hint, col2) {
      var n = fnorm(P[0], P[1], P[2]), np = P.length, h = (t || 0.008) / 2, cx = 0, cy = 0, cz = 0, T0 = [], B0 = [], k;
      if (hint && n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) n = [-n[0], -n[1], -n[2]];
      var oT = { col: col }, oB = { col: col2 || col }, nb = [-n[0], -n[1], -n[2]];
      for (k = 0; k < np; k++) { T0.push([P[k][0] + n[0] * h, P[k][1] + n[1] * h, P[k][2] + n[2] * h]); B0.push([P[k][0] - n[0] * h, P[k][1] - n[1] * h, P[k][2] - n[2] * h]); cx += P[k][0] / np; cy += P[k][1] / np; cz += P[k][2] / np; }
      for (k = 1; k < np - 1; k++) { tri(G, T0[0], T0[k], T0[k + 1], oT, bone, 0, 0, 0, n); tri(G, B0[0], B0[k], B0[k + 1], oB, bone, 0, 0, 0, nb); }
      for (k = 0; k < np; k++) { var a = k, b = (k + 1) % np, out = [(P[a][0] + P[b][0]) / 2 - cx, (P[a][1] + P[b][1]) / 2 - cy, (P[a][2] + P[b][2]) / 2 - cz];
        tri(G, T0[a], T0[b], B0[b], oB, bone, 0, 0, 0, out); tri(G, T0[a], B0[b], B0[a], oB, bone, 0, 0, 0, out); }
    }
    function loft(G, o) {
      var n = o.rings, sd = o.sides, V = [], i, j, L = o.L;
      for (i = 0; i <= n; i++) { var u = Math.pow(i / n, o.pw || 1), Pr = o.prof(u);
        for (j = 0; j <= sd; j++) { var ph = TAU * j / sd; V.push({ p: [Math.sin(ph) * Pr[0], Pr[2] + Math.cos(ph) * Pr[1], o.z0 - u * L], s: u * L }); } }
      for (i = 0; i < n; i++) { var um = (V[i * (sd + 1)].s + V[(i + 1) * (sd + 1)].s) / 2 / L;
        for (j = 0; j < sd; j++) { var a = i * (sd + 1) + j, pm = TAU * (j + 0.5) / sd; quad(G, V, a, a + 1, a + sd + 1, a + sd + 2, { col: o.col(um, Math.cos(pm), Math.sin(pm)) }, 0); } }
      var P0 = o.prof(0), P1 = o.prof(1), tipF = [0, P0[2], o.z0 + (o.nose || 0)], tipB = [0, P1[2], o.z0 - L - (o.tailX || 0)];
      for (j = 0; j < sd; j++) { var pj = TAU * (j + 0.5) / sd, b0 = n * (sd + 1) + j;
        tri(G, V[j + 1].p, V[j].p, tipF, { col: o.col(0, Math.cos(pj), Math.sin(pj)) }, 0); tri(G, V[b0].p, V[b0 + 1].p, tipB, { col: o.col(1, Math.cos(pj), Math.sin(pj)) }, 0); }
    }
    function swimDone(G, kind, sw, radius) {   /* every vertex keeps its distance from the snout (s): the swim pose bends the body along it */
      var m = finish(G, [{ name: 'body', p: [0, 0, 0] }, { name: 'tail', p: [0, 0, 0] }, { name: 'jaw', p: [0, 0, 0] }, { name: 'finL', p: [0, 0, 0] }, { name: 'finR', p: [0, 0, 0] }], kind), i;
      for (i = 0; i < m.count; i++) m.s[i] = sw.z0 - m.rest[i * 3 + 2];
      m.sw = sw; m.radius = radius; m.curl = 0; m.jaw = 0; return m;
    }
    /* THE BOTTLENOSE DOLPHIN (Tursiops truncatus) at 2.6 m: a short beak, the melon (its rounded forehead), a darker cape down the back, grey flanks, a
       pale belly, the "smile", a falcate dorsal fin, paddle flippers and wide flukes; it swims by beating its flukes UP AND DOWN (a mammal, never side
       to side), and it breathes through the blowhole on its head */
    function buildDolphin() {
      var G = G0(), L = 2.6, z0 = 1.15, top = hex(0x66737f), cape = hex(0x4e5a65), flank = hex(0x8b97a2), belly = hex(0xdce1e5), beakC = hex(0x5a6672), dark = hex(0x343c44);
      loft(G, { L: L, z0: z0, rings: 22, sides: 10, nose: 0.012, tailX: 0.02,
        prof: function (u) { var t, e;
          if (u < 0.065) { t = u / 0.065; return [0.028 + 0.03 * t, (0.028 + 0.03 * t) * 0.8, -0.04]; }
          if (u < 0.17) { t = (u - 0.065) / 0.105; e = t * t * (3 - 2 * t); return [0.058 + 0.15 * e, 0.05 + 0.18 * e, -0.04 + 0.05 * e]; }   /* the melon */
          if (u < 0.42) { e = Math.sin((u - 0.17) / 0.25 * Math.PI / 2); return [0.208 + 0.052 * e, 0.23 + 0.06 * e, 0.01]; }
          t = (u - 0.42) / 0.58; return [0.24 * Math.pow(Math.max(0, 1 - t), 1.25) + 0.02, 0.26 * Math.pow(Math.max(0, 1 - t), 0.95) + 0.03, 0.01 + 0.02 * t]; },   /* meets the body's 0.26 / 0.29 without a ridge */
        col: function (u, up) { if (u < 0.065) return up < -0.3 ? belly : beakC; return up > 0.5 ? (u > 0.14 && u < 0.62 ? cape : top) : up > 0.05 ? mixc(top, flank, 0.6) : up > -0.45 ? flank : belly; } });
      fin3(G, [[0, 0.27, 0.2], [0, 0.45, 0.02], [0, 0.56, -0.12], [0, 0.42, -0.12], [0, 0.27, -0.18]], 0.03, cape, 0, [1, 0, 0]);   /* the dorsal fin, swept back */
      [1, -1].forEach(function (sd) { fin3(G, [[0.17 * sd, -0.1, 0.66], [0.38 * sd, -0.22, 0.48], [0.42 * sd, -0.26, 0.36], [0.17 * sd, -0.13, 0.48]], 0.025, top, sd > 0 ? 3 : 4, [0, 1, 0], flank);   /* a flipper */
        fin3(G, [[0, 0.04, -1.36], [0.1 * sd, 0.04, -1.4], [0.33 * sd, 0.04, -1.55], [0.29 * sd, 0.04, -1.61], [0.1 * sd, 0.04, -1.52], [0, 0.04, -1.5]], 0.022, top, 0, [0, 1, 0], flank);   /* a fluke */
        eye(G, [0.152 * sd, -0.02, 0.8], 0.016, 0, [0.5 * sd, 0, 0.85]);
        tube(G, { a: [0.026 * sd, -0.058, 1.12], b: [0.12 * sd, -0.052, 0.86], ra: 0.006, rb: 0.005, sides: 3, col: dark, bone: 0 }); });   /* the smile */
      ell(G, { c: [0, 0.22, 0.65], r: [0.02, 0.008, 0.013], seg: 5, ring: 3, col: dark, bone: 0 });   /* the blowhole, on top of the head behind the melon */
      return swimDone(G, 'dolphin', { L: L, z0: z0, vert: true, amp: 0.07, kw: 4.2, f0: 0.35, f1: 0.17, vRef: 6, finX: 0.17, finY: -0.11, jawMax: 0 }, 1.95);
    }
    /* THE CARIBBEAN REEF SHARK (Carcharhinus perezi) at 2.2 m: grey above with a clean line to a white belly, five gill slits, a rounded snout over an
       underslung mouth (its jaw drops on the bite), a tall first dorsal fin, long falcate pectorals (they drop in its hunched warning, a real shark's
       display), and the heterocercal tail (the upper lobe longer); it swims by sweeping SIDE TO SIDE */
    function buildShark() {
      var G = G0(), L = 2.2, z0 = 0.95, grey = hex(0x5d6064), greyD = hex(0x4a4c50), white = hex(0xecebe6), gill = hex(0x34363a), mouth = hex(0x2a2626), dusk = hex(0x3c3e42);
      loft(G, { L: L, z0: z0, rings: 20, sides: 10, nose: 0.01, tailX: 0.02,
        prof: function (u) { var t, e;
          if (u < 0.12) { e = Math.sqrt(u / 0.12); return [0.02 + 0.11 * e, 0.015 + 0.085 * e, 0]; }
          if (u < 0.4) { e = Math.sin((u - 0.12) / 0.28 * Math.PI / 2); return [0.13 + 0.06 * e, 0.1 + 0.1 * e, 0.01]; }
          if (u < 0.85) { t = (u - 0.4) / 0.45; return [0.155 * Math.pow(Math.max(0, 1 - t), 1.3) + 0.035, 0.16 * Math.pow(Math.max(0, 1 - t), 1.1) + 0.04, 0.01 + 0.01 * t]; }   /* meets 0.19 / 0.2 without a bulge */
          t = (u - 0.85) / 0.15; return [0.035 - 0.015 * t, 0.04 - 0.01 * t, 0.02 + 0.015 * t]; },
        col: function (u, up, side) { if (u > 0.055 && u < 0.1 && up < -0.6) return mouth;
          return up > 0.55 ? greyD : up > -0.2 ? grey : white; } });
      fin3(G, [[0, 0.19, 0.24], [0, 0.36, 0.08], [0, 0.48, -0.03], [0, 0.4, -0.05], [0, 0.2, -0.08]], 0.025, greyD, 0, [1, 0, 0]);   /* the first dorsal */
      fin3(G, [[0, 0.07, -0.67], [0, 0.13, -0.72], [0, 0.12, -0.76], [0, 0.065, -0.77]], 0.012, greyD, 0, [1, 0, 0]);   /* the second dorsal */
      fin3(G, [[0, -0.05, -0.66], [0, -0.11, -0.71], [0, -0.1, -0.75], [0, -0.045, -0.76]], 0.012, grey, 0, [1, 0, 0]);   /* the anal fin */
      fin3(G, [[0, 0.03, -1.14], [0, 0.38, -1.42], [0, 0.33, -1.48], [0, 0.06, -1.33]], 0.02, greyD, 0, [1, 0, 0]);   /* the tail's upper lobe */
      fin3(G, [[0, 0.0, -1.16], [0, -0.22, -1.3], [0, -0.18, -1.34], [0, 0.0, -1.27]], 0.02, grey, 0, [1, 0, 0]);   /* its lower lobe */
      [1, -1].forEach(function (sd) {
        fin3(G, [[0.15 * sd, -0.08, 0.4], [0.48 * sd, -0.22, 0.18], [0.55 * sd, -0.26, 0.06], [0.15 * sd, -0.09, 0.26]], 0.02, grey, sd > 0 ? 3 : 4, [0, 1, 0], dusk);   /* a pectoral (dusky beneath) */
        fin3(G, [[0.07 * sd, -0.1, -0.37], [0.18 * sd, -0.16, -0.48], [0.07 * sd, -0.1, -0.45]], 0.012, grey, 0, [0, 1, 0], dusk);   /* a pelvic */
        eye(G, [0.105 * sd, 0.03, 0.75], 0.012, 0, [0.6 * sd, 0, 0.8]);
        for (var gi = 0; gi < 5; gi++) { var gz = 0.5 - gi * 0.03, gx = (0.155 + gi * 0.006) * sd; fin3(G, [[gx, -0.045, gz], [gx, 0.055 - gi * 0.004, gz], [gx, 0.055 - gi * 0.004, gz - 0.007], [gx, -0.045, gz - 0.007]], 0.004, gill, 0, [sd, 0, 0]); } });   /* the five gill slits, thin dark strips */
      ell(G, { c: [0, -0.052, 0.77], r: [0.058, 0.011, 0.058], seg: 6, ring: 3, col: hex(0xb4545e), bone: 0 });   /* the mouth's inside */
      ell(G, { c: [0, -0.047, 0.8], r: [0.064, 0.006, 0.046], seg: 6, ring: 2, col: hex(0xf4f1ea), bone: 0 });   /* the teeth's row */
      ell(G, { c: [0, -0.066, 0.78], r: [0.07, 0.014, 0.068], seg: 6, ring: 3, top: hex(0xd9d5ce), belly: white, bone: 2 });   /* the lower jaw */
      return swimDone(G, 'shark', { L: L, z0: z0, vert: false, amp: 0.085, kw: 5.0, f0: 0.4, f1: 0.25, vRef: 4, finX: 0.15, finY: -0.085, jawMax: 0.55, hy: -0.055, hz: 0.7, hunch: true }, 1.8);
    }
    /* THE GREAT BARRACUDA (Sphyraena barracuda) at 1.3 m: long and slim, a pointed head with the lower jaw jutting past the upper and its fangs, dark
       grey-green above, silver sides crossed by dark diagonal bars, black blotches near the tail, two dorsal fins far apart, a forked dark tail */
    function buildBarracuda() {
      var G = G0(), L = 1.3, z0 = 0.6, back = hex(0x3e4d49), silver = hex(0xc3cacd), white = hex(0xeef1f2), bar = hex(0x2f3a37), spot = hex(0x17191a), finC = hex(0x343c3c), fang = hex(0xf6f4ee);
      loft(G, { L: L, z0: z0, rings: 22, sides: 8, nose: 0.004, tailX: 0.01,
        prof: function (u) { var t, e;
          if (u < 0.17) { e = Math.sqrt(u / 0.17); return [0.008 + 0.052 * e, 0.01 + 0.062 * e, 0.004]; }
          if (u < 0.62) { e = Math.sin((u - 0.17) / 0.45 * Math.PI); return [0.06 + 0.006 * e, 0.072 + 0.013 * e, 0.004]; }
          t = (u - 0.62) / 0.38; return [0.048 * Math.pow(Math.max(0, 1 - t), 1.1) + 0.012, 0.056 * Math.pow(Math.max(0, 1 - t), 1.0) + 0.016, 0.004]; },   /* meets 0.06 / 0.072 without a bulge */
        col: function (u, up, side) { if (up > 0.6) return back;
          var ri = Math.floor(u * 22 + 1e-6); if (up > 0.1 && ri >= 4 && ri <= 16 && ri % 2 === 0) return bar;   /* a dark bar on every other ring: seven along the body */
          if (u > 0.6 && up < -0.05 && up > -0.65 && Math.sin(u * 97 + side * 5) > 0.72) return spot;
          return up > 0.1 ? mixc(back, silver, 0.55) : up > -0.55 ? silver : white; } });
      fin3(G, [[0, 0.075, 0.2], [0, 0.14, 0.17], [0, 0.12, 0.12], [0, 0.07, 0.1]], 0.008, finC, 0, [1, 0, 0]);   /* the first dorsal (spiny) */
      fin3(G, [[0, 0.055, -0.28], [0, 0.1, -0.31], [0, 0.09, -0.36], [0, 0.05, -0.37]], 0.008, finC, 0, [1, 0, 0]);   /* the second dorsal */
      fin3(G, [[0, -0.055, -0.29], [0, -0.095, -0.32], [0, -0.085, -0.37], [0, -0.05, -0.37]], 0.008, silver, 0, [1, 0, 0]);   /* the anal fin */
      fin3(G, [[0, 0.0, -0.67], [0, 0.03, -0.7], [0, 0.15, -0.82], [0, 0.05, -0.79]], 0.008, finC, 0, [1, 0, 0]);   /* the tail's upper fork */
      fin3(G, [[0, 0.0, -0.67], [0, -0.03, -0.7], [0, -0.15, -0.82], [0, -0.05, -0.79]], 0.008, finC, 0, [1, 0, 0]);   /* its lower fork */
      fin3(G, [[0, 0.115, -0.79], [0, 0.152, -0.823], [0, 0.135, -0.81]], 0.009, white, 0, [1, 0, 0]); fin3(G, [[0, -0.115, -0.79], [0, -0.152, -0.823], [0, -0.135, -0.81]], 0.009, white, 0, [1, 0, 0]);   /* its white lobe tips */
      [1, -1].forEach(function (sd) {
        fin3(G, [[0.05 * sd, -0.02, 0.36], [0.11 * sd, -0.05, 0.3], [0.05 * sd, -0.03, 0.3]], 0.006, silver, sd > 0 ? 3 : 4, [0, 1, 0]);   /* a pectoral */
        fin3(G, [[0.04 * sd, -0.07, 0.07], [0.09 * sd, -0.1, 0.02], [0.04 * sd, -0.07, 0.01]], 0.006, silver, 0, [0, 1, 0]);   /* a pelvic */
        eye(G, [0.04 * sd, 0.022, 0.46], 0.011, 0, [0.6 * sd, 0, 0.8]);
        tube(G, { a: [0.006 * sd, 0.0, 0.58], b: [0.006 * sd, -0.022, 0.585], ra: 0.003, rb: 0.001, sides: 3, col: fang, bone: 0 }); });   /* the upper fangs */
      tube(G, { a: [0, -0.028, 0.46], b: [0, -0.03, 0.635], ra: 0.024, rb: 0.006, sides: 5, top: silver, belly: white, bone: 2 });   /* the jutting lower jaw */
      tube(G, { a: [0.008, -0.022, 0.6], b: [0.008, -0.004, 0.603], ra: 0.003, rb: 0.001, sides: 3, col: fang, bone: 2 }); tube(G, { a: [-0.008, -0.022, 0.6], b: [-0.008, -0.004, 0.603], ra: 0.003, rb: 0.001, sides: 3, col: fang, bone: 2 });   /* its fangs */
      return swimDone(G, 'barracuda', { L: L, z0: z0, vert: false, amp: 0.05, kw: 4.0, f0: 0.3, f1: 0.3, vRef: 6, finX: 0.05, finY: -0.025, jawMax: 0.5, hy: -0.025, hz: 0.46 }, 1.0);
    }
    function poseSwim(m, a, dt) {   /* the body bends along s: a travelling wave (tail-heavy), the body curling into its turns; the jaw, the fins; then flat faces again */
      var W = m.sw, L = W.L, sp = a.v || 0, P0 = m.rest, PO = m.pos, S = m.s, BI = m.bone, j;
      var hunch = W.hunch && a.state === 'warn' ? ease(a.rear) : 0;   /* the shark's hunch: back arched, pectorals down */
      m.ph += (dt || 0) * TAU * (W.f0 + sp * W.f1) * (a.state === 'strike' ? 1.6 : 1);
      var A0 = W.amp * L * (0.3 + 0.7 * Math.min(1, sp / W.vRef)) * (a.air ? 0.25 : 1) * (1 - 0.6 * hunch);
      var dyaw = dt > 0 && m.yaw0 != null ? wrap(a.yaw - m.yaw0) / dt : 0; m.yaw0 = a.yaw;
      m.curl += (clamp(-dyaw * 0.05, -0.12, 0.12) * L - m.curl) * Math.min(1, (dt || 0) * 4);
      var C = W.vert ? 0 : m.curl, jw = clamp(m.jaw || 0, 0, 1) * (W.jawMax || 0), jc = Math.cos(jw), js = Math.sin(jw);
      var fl = W.vert ? 0.18 * Math.sin(m.ph * 0.5) : -0.55 * hunch, fcL = Math.cos(fl), fsL = Math.sin(fl), arch = hunch * 0.05 * L;
      for (j = 0; j < m.count; j++) {
        var k = j * 3, x = P0[k], y = P0[k + 1], z = P0[k + 2], b = BI[j], dx, dy, dz;
        if (b === 2) { dy = y - W.hy; dz = z - W.hz; y = W.hy + dy * jc - dz * js; z = W.hz + dy * js + dz * jc; }   /* the jaw drops about its hinge */
        else if (b === 3 || b === 4) { var fx = b === 3 ? W.finX : -W.finX, sn2 = b === 3 ? fsL : -fsL; dx = x - fx; dy = y - W.finY; x = fx + dx * fcL - dy * sn2; y = W.finY + dx * sn2 + dy * fcL; }
        var u = clamp(S[j] / L, 0, 1.12), q = u - 0.2, w = q > 0 ? q * q / 0.64 : 0, wd = q > 0 ? 2 * q / 0.64 : 0, an = m.ph - W.kw * u, sn = Math.sin(an), cs = Math.cos(an);
        var off = A0 * w * sn + C * u * u, dd = (A0 * (wd * sn - w * W.kw * cs) + 2 * C * u) / L, cth = 1 / Math.sqrt(1 + dd * dd), sth = dd * cth;
        if (arch) y += arch * Math.sin(Math.PI * Math.min(1, u));
        if (W.vert) { PO[k] = x; PO[k + 1] = y * cth + off; PO[k + 2] = z - y * sth; }
        else { PO[k] = x * cth + off; PO[k + 1] = y; PO[k + 2] = z - x * sth; }
      }
      flat(m);
    }
    /* THE REEF FISH: ONE batch for the whole school, posed here each frame (the html hands it to THREE as one mesh: one draw). SERGEANT MAJORS
       (Abudefduf saxatilis, ~17 cm: a yellow back, five black bars, a silver-white belly) and BLUE TANGS (Acanthurus coeruleus, ~24 cm: royal blue,
       darker lines). A flat-shaded body, a dorsal fin, a forked tail that beats (its own part); they school round the reef by Reynolds' three rules (as
       the island's silverlings do: keep apart, swim alike, stay together), each kind as its own shoal, and they scatter from her and from a hunter */
    function fishInto(G, kind) {
      var SM = kind === 0, len = SM ? 0.17 : 0.24, hz = len / 2, rx = SM ? 0.022 : 0.02, ry = SM ? 0.05 : 0.075;
      var yel = hex(0xf0cd2a), sil = hex(0xe4e8ea), bar = hex(0x16181b), blu = hex(0x1a5fe0), bluD = hex(0x1546b0), bluL = hex(0x3d7cf0), eyeC = hex(0x0a0a0c);
      loft(G, { L: len * 0.84, z0: hz * 0.84, rings: 10, sides: 12, nose: 0.004, tailX: 0.002,   /* a deep, flat reef-fish body: rings run nose to tail */
        prof: function (u) { var e = Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.04)); return [rx * (0.25 + 0.75 * e), ry * (0.25 + 0.75 * e), 0]; },
        col: function (u, up) { var ri = Math.floor(u * 10 + 1e-6);
          if (SM) return up < -0.5 ? sil : (ri % 2 === 1 && ri <= 9 ? bar : up > 0.2 ? yel : mixc(yel, sil, 0.5));   /* five black bars, one on every other ring */
          return up > 0.6 ? bluD : up < -0.6 ? bluD : (ri % 3 === 1 ? bluL : blu); } });
      fin3(G, [[0, ry * 0.85, hz * 0.35], [0, ry * 1.35, -hz * 0.1], [0, ry * 1.1, -hz * 0.55], [0, ry * 0.7, -hz * 0.6]], 0.004, SM ? hex(0xd2b42c) : bluD, 0, [1, 0, 0]);   /* the dorsal fin */
      fin3(G, [[0, 0, -hz * 0.78], [0, ry * 0.95, -hz * 1.25], [0, 0, -hz * 1.05], [0, -ry * 0.95, -hz * 1.25]], 0.004, SM ? hex(0xc9b040) : bluD, 1, [1, 0, 0]);   /* the forked tail (its own part) */
      ell(G, { c: [rx * 0.8, ry * 0.25, hz * 0.55], r: [0.004, 0.006, 0.006], seg: 4, ring: 2, col: eyeC, bone: 0 }); ell(G, { c: [-rx * 0.8, ry * 0.25, hz * 0.55], r: [0.004, 0.006, 0.006], seg: 4, ring: 2, col: eyeC, bone: 0 });
    }
    function buildSchool(n, nA) {
      var G = G0(), FI = [], i, v, v0;
      for (i = 0; i < n; i++) { v0 = G.p.length / 3; fishInto(G, i < nA ? 0 : 1); for (v = v0; v < G.p.length / 3; v++) FI.push(i); }
      var m = finish(G, [{ name: 'body', p: [0, 0, 0] }, { name: 'tail', p: [0, 0, 0] }], 'school');
      m.fi = new Uint16Array(FI); m.n = n; m.nA = nA; m.P = new Float64Array(n * 3); m.V = new Float64Array(n * 3); m.fph = new Float64Array(n); m.yaw = new Float64Array(n); m.pit = new Float64Array(n);
      m.t = 0; m.tailZ = [-0.085 * 0.78, -0.12 * 0.78]; m.fled = 0; m.c = [0, 0, 0]; return m;
    }
    function placeSchool(m, cx, cy, cz, rnd) { var i; for (i = 0; i < m.n; i++) { var a = rnd() * TAU, r = 0.5 + rnd() * 2.5; m.P[i * 3] = cx + Math.sin(a) * r; m.P[i * 3 + 1] = cy + (rnd() - 0.5) * 0.8; m.P[i * 3 + 2] = cz + Math.cos(a) * r; m.V[i * 3] = Math.cos(a) * 0.5; m.V[i * 3 + 2] = -Math.sin(a) * 0.5; m.fph[i] = rnd() * TAU; } }
    function stepSchool(m, dt, o) {   /* o: cx, cy, cz (the reef), R (the shoals' ring), water, ground(x, z), T (threats, x y z each), nT. Allocates nothing */
      var n = m.n, Pp = m.P, V = m.V, i, j, fled = 0; m.t += dt; m.c[0] = 0; m.c[1] = 0; m.c[2] = 0;
      for (i = 0; i < n; i++) {
        var g = i < m.nA ? 0 : 1, th = m.t * (g ? -0.16 : 0.21) + g * 2.4, rg = o.R * (g ? 0.7 : 1), gx = o.cx + Math.sin(th) * rg, gz = o.cz + Math.cos(th) * rg, gy = o.cy + (g ? -0.4 : 0.3);
        var k = i * 3, px = Pp[k], py = Pp[k + 1], pz = Pp[k + 2], ax = (gx - px) * 0.5, ay = (gy - py) * 0.8, az = (gz - pz) * 0.5, mx = 0, mz = 0, cnt = 0, fl = 0;
        for (j = 0; j < n; j++) { if (j === i || (j < m.nA) !== (i < m.nA)) continue; var q = j * 3, ddx = px - Pp[q], ddy = py - Pp[q + 1], ddz = pz - Pp[q + 2], d2 = ddx * ddx + ddy * ddy + ddz * ddz;
          if (d2 < 0.09 && d2 > 1e-8) { ax += ddx / d2 * 0.06; ay += ddy / d2 * 0.03; az += ddz / d2 * 0.06; }   /* keep apart */
          if (d2 < 1.5) { mx += V[q]; mz += V[q + 2]; cnt++; } }   /* swim alike */
        if (cnt) { ax += (mx / cnt - V[k]) * 0.8; az += (mz / cnt - V[k + 2]) * 0.8; }
        for (j = 0; j < o.nT; j++) { var t3 = j * 3, ex = px - o.T[t3], ey = py - o.T[t3 + 1], ez = pz - o.T[t3 + 2], e2 = ex * ex + ey * ey + ez * ez;
          if (e2 < 20.25) { var e1 = Math.sqrt(e2) || 0.1, f = (4.5 - e1) * 3; ax += ex / e1 * f; ay += ey / e1 * f * 0.4; az += ez / e1 * f; fl = 1; } }   /* they scatter */
        V[k] += ax * dt; V[k + 1] += ay * dt; V[k + 2] += az * dt;
        var spd = Math.sqrt(V[k] * V[k] + V[k + 1] * V[k + 1] + V[k + 2] * V[k + 2]) || 1e-6, s2 = clamp(spd, 0.25, fl ? 3.2 : 1.1) / spd; V[k] *= s2; V[k + 1] *= s2 * 0.6; V[k + 2] *= s2;
        Pp[k] += V[k] * dt; Pp[k + 1] += V[k + 1] * dt; Pp[k + 2] += V[k + 2] * dt;
        var bed = o.ground(Pp[k], Pp[k + 2]); Pp[k + 1] = clamp(Pp[k + 1], bed + 0.3, o.water - 0.35); fled += fl;
        var hs = Math.sqrt(V[k] * V[k] + V[k + 2] * V[k + 2]); m.yaw[i] = Math.atan2(V[k], V[k + 2]); m.pit[i] = -Math.atan2(V[k + 1], Math.max(0.05, hs)); m.fph[i] += dt * (7 + hs * 9);
        m.c[0] += Pp[k] / n; m.c[1] += Pp[k + 1] / n; m.c[2] += Pp[k + 2] / n;
      }
      m.fled = fled;
      var PO = m.pos, NO = m.nrm, R0 = m.rest, N0 = m.nrest, FI = m.fi, BI = m.bone, vv;
      for (vv = 0; vv < m.count; vv++) { var fi = FI[vv], k3 = vv * 3, f3 = fi * 3, x = R0[k3], y = R0[k3 + 1], z = R0[k3 + 2], nx = N0[k3], ny = N0[k3 + 1], nz = N0[k3 + 2];
        if (BI[vv] === 1) { var tz = fi < m.nA ? m.tailZ[0] : m.tailZ[1], wg = 0.5 * Math.sin(m.fph[fi]), cw = Math.cos(wg), sw = Math.sin(wg), dz0 = z - tz, x2 = x * cw + dz0 * sw; z = tz - x * sw + dz0 * cw; x = x2; var nx2 = nx * cw + nz * sw; nz = -nx * sw + nz * cw; nx = nx2; }   /* the tail beats */
        var cp = Math.cos(m.pit[fi]), sp2 = Math.sin(m.pit[fi]), y2 = y * cp - z * sp2; z = y * sp2 + z * cp; y = y2; var ny2 = ny * cp - nz * sp2; nz = ny * sp2 + nz * cp; ny = ny2;
        var cy2 = Math.cos(m.yaw[fi]), sy2 = Math.sin(m.yaw[fi]);
        PO[k3] = Pp[f3] + x * cy2 + z * sy2; PO[k3 + 1] = Pp[f3 + 1] + y; PO[k3 + 2] = Pp[f3 + 2] - x * sy2 + z * cy2;
        NO[k3] = nx * cy2 + nz * sy2; NO[k3 + 1] = ny; NO[k3 + 2] = -nx * sy2 + nz * cy2; }
    }
    /* THE REEF: a Caribbean patch reef on the shelf, in its own frame (o.floor(x, z): the sea floor's height there, relative to its middle): BRAIN CORAL
       domes (Diploria, their grooves), ELKHORN coral (Acropora palmata, antler branches with pale tips), purple SEA FANS (Gorgonia), TUBE SPONGES with
       their dark mouths, and STAGHORN thickets. Static: built once, one draw, the same material */
    function rngK(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function buildReef(o) {
      var G = G0(), R1 = rngK(o.seed || 714), fl = o.floor, k, i, W0 = o.w || 7, D0 = o.d || 4;
      var spot = function (rMin) { var a = R1() * TAU, r = rMin + R1() * (1 - rMin); return [Math.sin(a) * r * W0, Math.cos(a) * r * D0]; };
      for (k = 0; k < 7; k++) { var p = spot(0.05), s = 0.35 + R1() * 0.5, y = fl(p[0], p[1]), dk = hex(0x6f6438);
        ell(G, { c: [p[0], y + s * 0.2, p[1]], r: [s, s * 0.62, s * (0.8 + R1() * 0.3)], seg: 9, ring: 5, squash: 0.25, top: hex(k % 2 ? 0xbfae62 : 0xa89f5a), belly: hex(0x7d7344), bone: 0,
          pat: function (c, nx, ny, nz, px, py, pz) { return Math.sin(px * 31 + Math.sin(pz * 23) * 2) > 0.55 ? mixc(c, dk, 0.55) : c; } }); }   /* the brain corals */
      for (k = 0; k < 4; k++) { var p2 = spot(0.2), y2 = fl(p2[0], p2[1]), s2 = 0.7 + R1() * 0.6, top = [p2[0], y2 + 0.35 * s2, p2[1]], a0 = R1() * TAU;
        tube(G, { a: [p2[0], y2 - 0.05, p2[1]], b: top, ra: 0.1 * s2, rb: 0.07 * s2, sides: 5, top: hex(0xc58f55), belly: hex(0x9c6a3a), bone: 0 });
        for (i = 0; i < 5; i++) { var b2 = a0 + i * TAU / 5 + R1() * 0.5, L2 = (0.45 + R1() * 0.35) * s2, tip = [top[0] + Math.sin(b2) * L2, top[1] + (0.25 + R1() * 0.35) * s2, top[2] + Math.cos(b2) * L2];
          tube(G, { a: top, b: tip, ra: 0.06 * s2, rb: 0.035 * s2, sides: 4, top: hex(0xcf9a60), belly: hex(0xa8743f), bone: 0 });
          ell(G, { c: tip, r: [0.045 * s2, 0.03 * s2, 0.045 * s2], seg: 4, ring: 2, col: hex(0xe9d3a6), bone: 0 }); } }   /* elkhorn */
      for (k = 0; k < 5; k++) { var p3 = spot(0.1), y3 = fl(p3[0], p3[1]), s3 = 0.5 + R1() * 0.45, yw = R1() * Math.PI, cx = Math.cos(yw), cz = -Math.sin(yw), Pf = [[p3[0], y3 + 0.08, p3[1]]];
        for (i = 0; i <= 5; i++) { var an = -1.1 + i * 0.44, rr = s3 * (0.85 + 0.15 * Math.cos(an * 2)); Pf.push([p3[0] + cx * Math.sin(an) * rr, y3 + 0.08 + Math.cos(an) * rr, p3[1] + cz * Math.sin(an) * rr]); }
        fin3(G, Pf, 0.02, hex(k % 2 ? 0x8b3fa6 : 0x9d4b7c), 0, [cz, 0, -cx]);
        tube(G, { a: [p3[0], y3 - 0.05, p3[1]], b: [p3[0], y3 + 0.12, p3[1]], ra: 0.03, rb: 0.025, sides: 3, col: hex(0x5b2a66), bone: 0 }); }   /* sea fans */
      var SPC = [0xd9b23a, 0x7b3f8e, 0xd2783a, 0x6b8f3a];
      for (k = 0; k < 4; k++) { var p4 = spot(0.25);
        for (i = 0; i < 3; i++) { var ox = p4[0] + (R1() - 0.5) * 0.35, oz = p4[1] + (R1() - 0.5) * 0.35, h = 0.35 + R1() * 0.5, y4 = fl(ox, oz), tp = [ox + (R1() - 0.5) * 0.1, y4 + h, oz + (R1() - 0.5) * 0.1];
          tube(G, { a: [ox, y4 - 0.05, oz], b: tp, ra: 0.065, rb: 0.08, sides: 6, top: hex(SPC[k]), belly: mixc(hex(SPC[k]), [0, 0, 0], 0.3), bone: 0 });
          ell(G, { c: [tp[0], tp[1] + 0.05, tp[2]], r: [0.06, 0.012, 0.06], seg: 6, ring: 2, col: hex(0x2a1d14), bone: 0 }); } }   /* tube sponges */
      for (k = 0; k < 3; k++) { var p5 = spot(0.3), y5 = fl(p5[0], p5[1]);
        for (i = 0; i < 6; i++) { var b5 = R1() * TAU, L5 = 0.3 + R1() * 0.35, base = [p5[0] + Math.sin(b5) * 0.15, y5 - 0.03, p5[1] + Math.cos(b5) * 0.15], t5 = [base[0] + Math.sin(b5) * L5 * 0.6, y5 + L5, base[2] + Math.cos(b5) * L5 * 0.6];
          tube(G, { a: base, b: t5, ra: 0.03, rb: 0.016, sides: 4, top: hex(0xd6b07a), belly: hex(0xa88a5a), bone: 0 }); } }   /* staghorn */
      var m = finish(G, [{ name: 'reef', p: [0, 0, 0] }], 'reef'); m.radius = Math.max(W0, D0) + 1.5; return m;
    }
    var B = { boa: buildBoa, crab: buildCrab, mongoose: buildMongoose, turtle: buildTurtle, pelican: function () { return buildBird('pelican'); }, gull: function () { return buildBird('gull'); },
      dolphin: buildDolphin, shark: buildShark, barracuda: buildBarracuda };
    var P = { boa: poseBoa, crab: poseCrab, mongoose: poseMongoose, turtle: poseTurtle, pelican: poseBird, gull: poseBird, dolphin: poseSwim, shark: poseSwim, barracuda: poseSwim };
    return {
      build: function (sp) { if (!B[sp]) throw new Error('no model ' + sp); return B[sp](); },
      pose: function (m, a, dt) {   /* the boa's tongue flicks when it notices or warns (now and then otherwise); its jaw gapes in a heavy warning and opens wide on the strike */
        if (a.sp === 'boa') { var on = a.state === 'notice' || a.state === 'warn' || a.state === 'stalk' ? 1 : ((m.tt = (m.tt || 0) + (dt || 0)) % 3.2 < 0.5 ? 1 : 0); m.tng = on ? Math.max(0, Math.sin((m.ph += (dt || 0) * 16))) : Math.max(0, (m.tng || 0) - (dt || 0) * 6);
          var jw = a.state === 'strike' ? 1 : a.state === 'warn' && a.atk === 1 ? 0.3 : 0; m.jaw += (jw - m.jaw) * Math.min(1, (dt || 0) * 14); }
        if (m.sw && m.sw.jawMax) { var jt = a.state === 'strike' ? 1 : a.state === 'warn' ? (a.atk === 1 ? 0.45 : 0.2) : 0; m.jaw += (jt - m.jaw) * Math.min(1, (dt || 0) * 12); }   /* 714c: the barracuda's and the shark's jaws */
        P[a.sp](m, a, dt || 0); },
      flat: flat,
      school: { build: buildSchool, place: placeSchool, step: stepSchool },   /* 714c: the reef fish, one batch */
      reef: buildReef,   /* 714c: the patch reef, static */
    };
  }());

  API = { create: create, last: null, error: null, T: T, FAIR: FAIR, SPECIES: SP, SEA: SEA, kit: KIT };
  return API;
}());
