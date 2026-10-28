/* WINGS FOR ROUGE · board 703, ship 7 · THE FIGHT IN THE WAKE (Trunks, Oct 28 2026). Pure logic: no THREE, no DOM.
   Marth, verbatim (Oct 23): "lets do odd numbers, what u suggested sounds too perfect... like the meta. lets do 5 hits in the chase. 3 in second wind." / "we also need a sidestep button now, to dodge he he, yes i like the parry /perfect stun idea."
   Earlier: "once he's injured enough and his health is below 34% he kinda slows down but then starts tailing me, then i gotta dodge his 'zooms' - which indicate he's coming like a sonic homing attack, and i have to dodge him, or parry him to stun him to finish him off."
   Shape: create(o) -> fight; fight.start(); fight.step(dt, { sidestep, attack, tapLag, offset, progress }) once a frame while the ride runs; it returns ONE shared state (copy it, never keep it).
   ONE mode machine decides what Attack means: stunned = a hit; a swoop incoming = a parry, judged like a song note; otherwise a whiff. Never a wound: a hit on her puffs feathers, a hit on him spins him.
   Death ('down') is the html's to stage: his rule, "if u die you restart back on your island and it says you think you had a bad dream. (its raining again and the cutscene just re begins)". */
window.WFR_HAWKFIGHT = (function () {
  'use strict';
  /* design numbers: every one a DRAFT, his thumb decides */
  var FEATHERS = 3;                         /* her feathers; a hit costs one; none left = 'down' */
  var HP0 = 100, SECOND = 34;               /* his health; below 34% the second wind (his number) */
  var DMG_A = [17, 9, 21, 13, 7];           /* the chase's 5 hits, uneven (odd, not the meta): 67, so 33% is left */
  var DMG_B = [11, 13, 9];                  /* the second wind's 3 hits: 33, so 0% (the last hit always takes what is left) */
  var FIRST_T = 2.0;                        /* s from start() to his first warning */
  var WARN_T = 1.2;                         /* s of warning (screech, flare, red streak, edge marker) before he dives; with FLY_T, 1.8 s before contact */
  var FLY_T = 0.6;                          /* s: his dive or zoom, from the end of the warning to her */
  var GAP_A = [2.0, 4.5], GAP_B = [1.6, 3.6];   /* s between swoops in the chase, and between zooms in the second wind */
  var LOCK_A = 0.6, LOCK_B = 0.35;          /* s before contact his aim stops following her lane (the zoom homes longer) */
  var GOOD = 0.2, PERFECT = 0.1, LOOK = 0.5;   /* the parry, like a song note: +-0.2 s good, +-0.1 s perfect; taps earlier than 0.5 s are whiffs */
  var STUN_T = 3.5, STUN_PERFECT = 4.5, STUN_DODGE = 3.5;   /* s dizzy after a good parry, a perfect one, a dodge */
  var RECOVER_T = 1.2;                      /* s he takes to climb back after a hit, a miss or her lost feather */
  var DROP_T = 2.0;                         /* s he takes to slow and drop behind her at the second wind */
  var RAIL_W = 2.5;                         /* her lane, 2.5 m either side (hawkwake.js) */
  var SIDE_D = 3.0, SIDE_T = 0.35, SIDE_CD = 0.9;   /* the sidestep: 3 m (under the 5 m lane), held 0.35 s, 0.9 s to recharge */
  var SIDE_WIN = 0.6, DODGE_CLEAR = 1.6;    /* a dodge: she sidestepped in the last 0.6 s and is 1.6 m or more off his line at contact */
  var AHEAD = 30, BEHIND = -16, STUN_REL = 2;   /* m along the line from her: where he waits (chase / second wind), where he tumbles when stunned */
  var LAG_MAX = 0.3;                        /* s: the most tap latency (the song's rhLat/rhLag) the judge will take off */
  var API = null;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function num(x, lo, hi) { x = +x; return x === x && x !== Infinity && x !== -Infinity ? clamp(x, lo, hi) : 0; }

  function create(o) {   /* never throws into the game */
    try { var f = build(o || {}); API.last = f; return f; } catch (err) { API.error = String(err && err.message || err); return deadFight(); }
  }
  function deadFight() { var no = function () { return null; }; return { dead: true, _plant: null, start: function () { return false; }, step: no, stop: no, on: function () { return false; }, peek: function () { return { ready: false, dead: true }; } }; }

  function build(o) {
    var rand = typeof o.rand === 'function' ? o.rand : Math.random;
    var R = { on: false, dead: false, plant: null, t: 0, modeT: 0, mode: 'idle', phase: 'chase', hp: HP0, hits: 0, hitsA: 0, hitsB: 0, feathers: FEATHERS,
      nextT: 0, warnStart: 0, arrive: 0, aim: 0, side: 1, tapped: false, arrived: false, offAt: 0, sideT: 0, sideCd: 0, sideTarget: 0, lastSide: -99,
      stunT: 0, stunLen: 0, stunHit: false, rel: AHEAD, lat: 0, dropFrom: AHEAD, lag: 0, off: 0, prog: 0,
      swoops: 0, zooms: 0, parG: 0, parP: 0, dodges: 0, misses: 0, hurts: 0, whiffs: 0, lastJudge: '', dmgN: 0 };
    var DMG_LOG = [0, 0, 0, 0, 0, 0, 0, 0], EV = [];
    var ST = { mode: 'idle', phase: 'chase', rel: AHEAD, lat: 0, aim: 0, side: 1, warn: false, arriveIn: 0, sideOn: false, sideTarget: 0, stunT: 0, hp: HP0, feathers: FEATHERS, events: EV };

    /* FIGHT-TICK BEGIN: nothing between these markers allocates (tests/hawkfight-unit.js reads this text) */
    function warnLen() { return R.plant === 'nowarn' ? 0.2 : WARN_T; }   /* plant 'nowarn': the control for claim 2 */
    function good() { return R.plant === 'lateok' ? 0.4 : GOOD; }       /* plant 'lateok': the control for claim 3 */
    function dmgAt(i) { return R.plant === 'even' ? 13 : DMG_A[i]; }    /* plant 'even': the control for claim 5 */
    function base() { return R.phase === 'second' && R.plant !== 'ahead' ? BEHIND : AHEAD; }   /* plant 'ahead': the control for claim 4 */
    function gap() { var g = R.phase === 'second' ? GAP_B : GAP_A, r = num(rand(), 0, 1); return g[0] + r * (g[1] - g[0]); }
    function setMode(m) { R.mode = m; R.modeT = 0; }
    function ev(name) { EV.push(name); }
    function incoming() { return R.mode === 'warn' || R.mode === 'fly'; }
    function stun(len, name) { R.stunT = len; R.stunLen = len; R.stunHit = false; setMode('stun'); ev(name); }
    function recover() { setMode('recover'); }
    function hit() {   /* a hit on him: one per stun, uneven damage; then he is knocked away */
      var d;
      if (R.phase === 'chase') { d = dmgAt(R.hitsA); R.hitsA++; } else { d = R.hitsB >= DMG_B.length - 1 ? R.hp : DMG_B[R.hitsB]; R.hitsB++; }
      R.hp = Math.max(0, R.hp - d); R.hits++; if (R.dmgN < DMG_LOG.length) { DMG_LOG[R.dmgN] = d; R.dmgN++; }
      R.stunHit = true; R.stunT = 0; ev('struck');
      if (R.phase === 'chase' && (R.hp < SECOND || R.hitsA >= DMG_A.length)) { R.phase = 'second'; R.dropFrom = R.rel; setMode('drop'); ev('secondwind'); return; }
      if (R.phase === 'second' && (R.hp <= 0 || R.hitsB >= DMG_B.length)) { R.hp = 0; setMode('won'); ev('won'); return; }
      recover();
    }
    function judgeTap() {   /* the parry, like a song note: the tap's true time is now minus her latency */
      var d = (R.t - R.lag) - R.arrive, a = d < 0 ? -d : d;
      if (d < -LOOK) { R.whiffs++; ev('whiff'); return; }
      R.tapped = true;
      if (a <= PERFECT) { R.parP++; R.lastJudge = 'perfect'; stun(STUN_PERFECT, 'parry'); }
      else if (a <= good()) { R.parG++; R.lastJudge = 'good'; stun(STUN_T, 'parry'); }
      else { R.lastJudge = d < 0 ? 'early' : 'late'; ev('parrymiss'); }
    }
    function resolve() {   /* contact, once the parry window has closed: a dodge, a miss, or a feather lost */
      var dd = R.offAt - R.aim, clear = (dd < 0 ? -dd : dd) >= DODGE_CLEAR, stepped = R.lastSide >= R.arrive - SIDE_WIN && R.lastSide <= R.arrive;
      if (clear && stepped) { R.dodges++; R.lastJudge = 'dodge'; stun(STUN_DODGE, 'dodge'); return; }
      if (clear) { R.misses++; ev('miss'); recover(); return; }
      R.feathers--; R.hurts++; ev('hurt');   /* feathers puff, he spins past: never a wound */
      if (R.feathers <= 0) { R.feathers = 0; setMode('down'); ev('down'); return; }
      recover();
    }
    function tick(dt, inp) {
      dt = dt > 0 ? (dt < 0.25 ? dt : 0.25) : 0;
      EV.length = 0;
      var side = !!(inp && inp.sidestep), atk = !!(inp && inp.attack);
      R.lag = num(inp && inp.tapLag, 0, LAG_MAX); R.off = num(inp && inp.offset, -2 * RAIL_W, 2 * RAIL_W); R.prog = num(inp && inp.progress, -1e7, 1e7);
      R.t += dt; R.modeT += dt; R.sideT = Math.max(0, R.sideT - dt); R.sideCd = Math.max(0, R.sideCd - dt);
      var over = R.mode === 'won' || R.mode === 'down';
      if (side && R.sideCd <= 0 && !over) {   /* the sidestep: away from his line (toward the roomier side when he is not coming) */
        var dir = incoming() ? (R.off >= R.aim ? 1 : -1) : (R.off > 0 ? -1 : 1), tg = clamp(R.off + dir * SIDE_D, -RAIL_W, RAIL_W);
        if ((tg - R.off < 0 ? R.off - tg : tg - R.off) < SIDE_D * 0.5) tg = clamp(R.off - dir * SIDE_D, -RAIL_W, RAIL_W);
        R.sideTarget = tg; R.sideT = SIDE_T; R.sideCd = SIDE_CD; R.lastSide = R.t; ev('sidestep');
      }
      if (atk && !over) {   /* what Attack means is decided here, by the mode, and nowhere else */
        if ((R.mode === 'stun' && !R.stunHit) || (R.plant === 'anyhit' && R.mode !== 'drop')) hit();   /* plant 'anyhit': the control for claim 1 */
        else if (incoming() && !R.tapped) judgeTap();
        else { R.whiffs++; ev('whiff'); }
      }
      var b = base(), k;
      if (R.mode === 'wait') {
        R.rel += (b - R.rel) * Math.min(1, dt * 2); R.lat = 1.5 * Math.sin(R.t * 0.9);
        if (R.t >= R.nextT) { setMode('warn'); R.warnStart = R.t; R.arrive = R.t + warnLen() + FLY_T; R.aim = R.off; R.side = num(rand(), 0, 1) < 0.5 ? -1 : 1; R.tapped = false; R.arrived = false;
          R.swoops++; if (R.phase === 'second') R.zooms++; ev(R.phase === 'second' ? 'zoomwarn' : 'warn'); }
      }
      if (incoming()) {
        var lock = R.phase === 'second' ? LOCK_B : LOCK_A;
        if (R.arrive - R.t > lock) R.aim += (R.off - R.aim) * Math.min(1, dt * 8);   /* he aims at her lane until he commits */
        if (R.t >= R.arrive - FLY_T) { if (R.mode === 'warn') setMode('fly'); k = clamp((R.t - (R.arrive - FLY_T)) / FLY_T, 0, 1); R.rel = b * (1 - k); R.lat += (R.aim - R.lat) * Math.min(1, dt * 10); }
        else { R.rel += (b - R.rel) * Math.min(1, dt * 2); R.lat += (R.aim - R.lat) * Math.min(1, dt * 3); }
        if (!R.arrived && R.t >= R.arrive) { R.arrived = true; R.offAt = R.off; ev('arrive');
          var d0 = R.offAt - R.aim; if ((d0 < 0 ? -d0 : d0) >= DODGE_CLEAR && R.lastSide >= R.arrive - SIDE_WIN) resolve(); }   /* a clean dodge needs no window */
        if (incoming() && R.arrived && R.t - R.lag >= R.arrive + good()) resolve();
      } else if (R.mode === 'stun') {
        R.stunT = Math.max(0, R.stunT - dt); R.rel += ((R.phase === 'second' && R.plant !== 'ahead' ? -STUN_REL : STUN_REL) - R.rel) * Math.min(1, dt * 4); R.lat += (R.aim - R.lat) * Math.min(1, dt * 4);
        if (R.stunT <= 0) { ev('shakeoff'); recover(); }
      } else if (R.mode === 'recover') {
        R.rel += (b - R.rel) * Math.min(1, dt * 2);
        if (R.modeT >= RECOVER_T) { setMode('wait'); R.nextT = R.t + gap(); }
      } else if (R.mode === 'drop') {   /* the second wind: he slows and falls behind her, then tails her */
        k = clamp(R.modeT / DROP_T, 0, 1); k = k * k * (3 - 2 * k); R.rel = R.dropFrom + (b - R.dropFrom) * k;
        if (R.modeT >= DROP_T) { setMode('wait'); R.nextT = R.t + gap(); }
      }
      ST.mode = R.mode; ST.phase = R.phase; ST.rel = R.rel; ST.lat = R.lat; ST.aim = R.aim; ST.side = R.side; ST.warn = incoming(); ST.arriveIn = incoming() ? R.arrive - R.t : 0;
      ST.sideOn = R.sideT > 0; ST.sideTarget = R.sideTarget; ST.stunT = R.stunT; ST.hp = R.hp; ST.feathers = R.feathers;
      return ST;
    }
    /* FIGHT-TICK END */

    function kill(err) { R.dead = true; R.on = false; F.dead = true; API.error = String(err && err.message || err); try { if (o.warn) o.warn('hawkfight stopped: ' + API.error); } catch (e) { /* fine */ } }
    function start() {
      if (R.dead) return false;
      R.on = true; R.t = 0; R.phase = 'chase'; R.hp = HP0; R.hits = 0; R.hitsA = 0; R.hitsB = 0; R.feathers = FEATHERS; R.nextT = FIRST_T; R.rel = AHEAD; R.lat = 0; R.aim = 0;
      R.tapped = false; R.arrived = false; R.sideT = 0; R.sideCd = 0; R.lastSide = -99; R.stunT = 0; R.stunHit = false; R.swoops = 0; R.zooms = 0; R.parG = 0; R.parP = 0;
      R.dodges = 0; R.misses = 0; R.hurts = 0; R.whiffs = 0; R.lastJudge = ''; R.dmgN = 0; setMode('wait'); return true;
    }
    function step(dt, input) {   /* a fault stops the fight, never the game */
      if (!R.on || R.dead) return null;
      try { R.plant = F._plant || null; if (R.plant === 'throw') R.no.such = 1; return tick(dt, input); } catch (err) { kill(err); return null; }
    }
    function peek() {
      return { ready: true, on: R.on, dead: R.dead, error: API.error, phase: R.phase, mode: R.mode, hp: R.hp, hits: R.hits, hitsChase: R.hitsA, hitsSecond: R.hitsB,
        stunT: +R.stunT.toFixed(3), stunLen: R.stunLen, warnT: incoming() ? +(R.t - R.warnStart).toFixed(3) : 0, arriveIn: incoming() ? +(R.arrive - R.t).toFixed(3) : null,
        feathers: R.feathers, swoops: R.swoops, zooms: R.zooms, parries: { good: R.parG, perfect: R.parP }, dodges: R.dodges, misses: R.misses, hurts: R.hurts, whiffs: R.whiffs,
        lastJudge: R.lastJudge, rel: +R.rel.toFixed(3), lat: +R.lat.toFixed(3), aim: +R.aim.toFixed(3), side: R.side, t: +R.t.toFixed(3), dmg: DMG_LOG.slice(0, R.dmgN), plant: R.plant };
    }
    var F = { dead: false, _plant: null, start: start, stop: function () { R.on = false; }, on: function () { return R.on && !R.dead; }, step: step, peek: peek };
    return F;
  }

  API = { create: create, last: null, error: null, WARN_T: WARN_T, FLY_T: FLY_T, GOOD: GOOD, PERFECT: PERFECT, STUN_T: STUN_T, STUN_PERFECT: STUN_PERFECT, STUN_DODGE: STUN_DODGE,
    SIDE_D: SIDE_D, DODGE_CLEAR: DODGE_CLEAR, SECOND: SECOND, FEATHERS: FEATHERS, RAIL_W: RAIL_W };
  return API;
}());
