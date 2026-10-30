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
  /* 703p CATCHABLE (Trunks, Oct 29). Marth's field verdict: "you literally can NOT catch up to the hawk in the initial first phase ... I can't attack the hawk or reach him in either phases".
     His design, verbatim: "The speed of the hawk needs to deteriorate or slow down just like final chase where u chase shadow or vice versa so u can land a hit. Or they (the hawk) slows to try and hit you and you can dodge and hit him or just dodge and hit him when he's returning to his position".
     Only with create({ reach: true }); without it not one number above changes (the unit's runs stay frame-identical). Three hit windows, each opened by HIS rhythm, each struck by the dash (⚔️ in range):
       TIRED  his speed comes in waves: a burst (he pulls away, never past REL_MAX: the rubber band), then he tires and slows so she closes in (the chase only)
       STUN   he slows to strike; she dodges (↔️) or parries (⚔️ on the beat), and counters while he is committed (both phases)
       RETURN after a dodge or a miss he flies back to his place; on the way back he is in reach (both phases; in the second wind he overshoots ahead of her first) */
  var RV0 = 18;                             /* her cruise on the ride, m/s (hawkwake.js V0) */
  var WAVE_B = [2.6, 3.6], WAVE_T = [3.2, 4.2];   /* s: a burst, then a tired spell (DRAFT) */
  var V_BURST = 1.3, V_TIRED = 0.62;        /* his speed, x her cruise: bursting he outruns even her stick held up (1.35 caps at the band); tired he is slower than her cruise */
  var REL_MAX = 24, REL_MIN = 2.5;          /* m: the rubber band: never more than 24 m ahead of her; never lets her pass him */
  var REACH = 10;                           /* m: in range for the dash */
  var DASH_W = 0.22, DASH_T = 0.26;         /* s: the windup (she draws back), then the dash to him; the hit lands at its end */
  var STRIKE_REL = 7;                       /* m: he slows to strike: back to 7 m ahead before he dives (he comes TO her) */
  var RETURN_T = 1.8, RET_HOME = 18, RET_OVER = 5, STUN_FWD = 3.5, KNOCK = 16;   /* the return: 1.8 s back to 18 m ahead (second wind: past her to 5 m ahead first, then back behind); a stunned zoom tumbles 3.5 m AHEAD of her; a hit knocks him 16 m ahead */
  var R_DODGE = 1.4, GAP_AR = [3.5, 6.5], GAP_BR = [2.5, 4.5], V_NOBAND = 1.8;   /* a dodge: he is committed 1.4 s (then the return); fewer strikes between his waves; the plant noband: his speed ignores hers */
  var STUN_BACK = 4;                        /* m: a stunned zoom can tumble just behind her; still in reach */
  var R_SIDE_OFF = 2.6;                     /* m: a sidestep lands this far off his committed line */
  var R_SIDE_T = 0.75;                      /* s: on the rail the sidestep holds her out until he has passed (a dodge started 0.6-0.15 s before contact clears him: a window a thumb can hit) */
  var R_DUE0 = 4.5, R_TIRED_DUE = 7.4;   /* an untaken tired spell holds his strike to 7.4 s (a dash in flight: <= 7.9 s, inside his 8) */
  var R_FORCE = 6.4;                        /* 703r: HIS REAL SECONDS (Marth's ruling: "every 0.8 seconds - 8 seconds" is real time): 6.4 s after his last warning he strikes (a dash in flight finishes first: <= 6.9 s) */
  var NOW_T = 0.7;                          /* s before contact the game says '↔️ NOW' (a thumb 0.25 s late still slides 2.3 m+ on the rail before he lands) */
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
    var ST = { mode: 'idle', phase: 'chase', rel: AHEAD, lat: 0, aim: 0, side: 1, warn: false, arriveIn: 0, sideOn: false, sideTarget: 0, stunT: 0, hp: HP0, feathers: FEATHERS, events: EV,
      reach: false, wave: '', win: '', inRange: false, far: 0, dashWind: false, dashLeft: 0, now: '', hitsLeft: 0 };   /* 703p: what the screen shows (win: 'tired'|'stun'|'return'|''; now: 'side'|'atk'|'') */
    var RCH = !!o.reach;   /* 703p: the catchable fight (off: the fight exactly as before) */
    var RP = { wave: 'burst', waveEnd: 0, hv: 0, lastProg: -1e9, rr: AHEAD, flyFrom: AHEAD, dashT: -1, dashWin: '', tiredHit: false, retOpen: false, retFrom: 0, retHit: false,
      dashes: 0, due: 6.4, lastWarnT: -1, gMin: 1e9, gMax: 0, forced: 0, far: 0, byTired: 0, byStun: 0, byReturn: 0, dashMiss: 0, tiredWaves: 0, bursts: 0, maxRel: -1e9, nearest: 1e9 };

    /* FIGHT-TICK BEGIN: nothing between these markers allocates (tests/hawkfight-unit.js reads this text) */
    function warnLen() { return R.plant === 'nowarn' ? 0.2 : WARN_T; }   /* plant 'nowarn': the control for claim 2 */
    function good() { return R.plant === 'lateok' ? 0.4 : GOOD; }       /* plant 'lateok': the control for claim 3 */
    function dmgAt(i) { return R.plant === 'even' ? 13 : DMG_A[i]; }    /* plant 'even': the control for claim 5 */
    function base() { return R.phase === 'second' && R.plant !== 'ahead' ? BEHIND : AHEAD; }   /* plant 'ahead': the control for claim 4 */
    function gap() { var g = R.phase === 'second' ? (RCH ? GAP_BR : GAP_B) : (RCH ? GAP_AR : GAP_A), r = num(rand(), 0, 1); return g[0] + r * (g[1] - g[0]); }
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
      if (clear && stepped) { R.dodges++; R.lastJudge = 'dodge'; stun(RCH ? R_DODGE : STUN_DODGE, 'dodge'); return; }
      if (clear) { R.misses++; ev('miss'); recover(); return; }
      R.feathers--; R.hurts++; ev('hurt');   /* feathers puff, he spins past: never a wound */
      if (R.feathers <= 0) { R.feathers = 0; setMode('down'); ev('down'); return; }
      recover();
    }
    /* 703p REACH: the catchable fight (only when RCH; nothing here allocates) */
    function rWave() {   /* his speed in waves: a burst, then a tired spell (plants 'noslow' and 'noband': he never tires, the controls) */
      if (R.t < RP.waveEnd) return; var r = num(rand(), 0, 1);
      if (RP.wave === 'burst' && R.plant !== 'noslow') { RP.wave = 'tired'; RP.tiredHit = false; RP.tiredWaves++; RP.waveEnd = R.t + WAVE_T[0] + r * (WAVE_T[1] - WAVE_T[0]); ev('tired'); }
      else { RP.wave = 'burst'; RP.bursts++; RP.waveEnd = R.t + WAVE_B[0] + r * (WAVE_B[1] - WAVE_B[0]); ev('burst'); }
    }
    function rWin() {   /* which hit window is open: his own rhythm opens each one */
      if (R.mode === 'stun' && !R.stunHit) return 'stun';
      if (R.mode === 'recover' && RP.retOpen && !RP.retHit && R.plant !== 'noreturn') return 'return';   /* plant 'noreturn': the way back is no window, the control */
      if (R.mode === 'wait' && R.phase === 'chase' && RP.wave === 'tired' && !RP.tiredHit) return 'tired';
      return '';
    }
    function rSide() {   /* where a sidestep goes while he strikes: R_SIDE_OFF off his committed line, on the side that is clear and nearer her (the 5 m lane always has one) */
      var a = clamp(R.aim + R_SIDE_OFF, -RAIL_W, RAIL_W), b = clamp(R.aim - R_SIDE_OFF, -RAIL_W, RAIL_W), da = a - R.aim, db = R.aim - b, ca = da >= DODGE_CLEAR + 0.2, cb = db >= DODGE_CLEAR + 0.2;
      if (ca && cb) return (a - R.off < 0 ? R.off - a : a - R.off) <= (b - R.off < 0 ? R.off - b : b - R.off) ? a : b;
      return ca ? a : b; }
    function rDue() { return RCH && R.plant !== 'nocap8' && RP.lastWarnT >= 0 && R.t - RP.lastWarnT >= (rTired() ? R_TIRED_DUE : RP.due) && R.mode !== 'won' && R.mode !== 'down'; }   /* plant 'nocap8': no deadline, the control */
    function rTired() { return R.phase === 'chase' && RP.wave === 'tired' && !RP.tiredHit; }   /* tired, he holds his swoop: a clear window (Marth: "deteriorate or slow down ... so u can land a hit") */
    function rIn(w) { return RP.rr >= -STUN_BACK && RP.rr <= (w === 'stun' ? REL_MAX : REACH); }   /* in reach: beside her or ahead; a dizzy Hawk anywhere inside the band (he is helpless), else within REACH */
    function rAtk() {   /* ⚔️: a parry while he strikes; the dash when a window is open and he is in reach; else a whiff ('far': a window, but out of reach) */
      if (RP.dashT >= 0) return;
      if (incoming() && !R.tapped) { judgeTap(); return; }
      var w = rWin();
      if (w && rIn(w)) { RP.dashT = 0; RP.dashWin = w; RP.dashes++; RP.hv = RV0; ev('dash'); return; }
      R.whiffs++; if (w) { RP.far++; ev('far'); } else ev('whiff');
    }
    function rDash(dt) {   /* true while her dash runs (his own machine holds); at its end the hit lands (plant 'nodash': it never does, the control) */
      if (RP.dashT < 0) return false;
      RP.dashT += dt; if (RP.dashT < DASH_W + DASH_T) return true;
      RP.dashT = -1;
      if (R.plant === 'nodash') { RP.dashMiss++; ev('dashmiss'); return true; }
      if (RP.dashWin === 'tired') { RP.tiredHit = true; RP.byTired++; } else if (RP.dashWin === 'return') { RP.retHit = true; RP.byReturn++; } else RP.byStun++;
      RP.retOpen = false; hit();
      if (R.phase === 'chase' && R.mode !== 'won') { RP.wave = 'burst'; RP.bursts++; RP.waveEnd = R.t + WAVE_B[1]; }   /* struck, he bolts: a fresh burst */
      return true;
    }
    function rMove(dt, hd) {   /* where he is, m ahead of her along the line (negative: behind) */
      var m = R.mode, ch = R.phase === 'chase', k;
      if (m === 'wait' && ch) { RP.hv = RV0 * (R.plant === 'noband' ? V_NOBAND : RP.wave !== 'tired' ? V_BURST : V_TIRED); RP.rr += RP.hv * dt - hd; if (R.plant !== 'noband' && RP.rr > REL_MAX) RP.rr = REL_MAX; }   /* THE RUBBER BAND (plant 'noband' lifts it) */
      else if (m === 'warn') { RP.rr += ((ch ? Math.min(RP.rr, STRIKE_REL) : BEHIND) - RP.rr) * Math.min(1, dt * 1.6); RP.flyFrom = RP.rr; }   /* he slows to strike */
      else if (m === 'fly') { k = clamp((R.t - (R.arrive - FLY_T)) / FLY_T, 0, 1); RP.rr = RP.flyFrom * (1 - k); }   /* he comes TO her */
      else if (m === 'stun') RP.rr += ((ch ? STUN_REL : STUN_FWD) - RP.rr) * Math.min(1, dt * 4);
      else if (m === 'recover' && RP.retOpen) { k = clamp(R.modeT / RETURN_T, 0, 1);   /* the way back to his place */
        if (ch) RP.rr = RP.retFrom + (RET_HOME - RP.retFrom) * k * k * (3 - 2 * k);
        else if (k < 0.35) { k = k / 0.35; RP.rr = RP.retFrom + (RET_OVER - RP.retFrom) * k * (2 - k); } else { k = (k - 0.35) / 0.65; RP.rr = RET_OVER + (BEHIND - RET_OVER) * k * k * (3 - 2 * k); } }
      else if (m === 'recover') RP.rr += ((ch ? KNOCK : BEHIND) - RP.rr) * Math.min(1, dt * 3);
      else RP.rr = R.rel;   /* the drop to the second wind, his tail behind her, the end: as before */
      if (ch && RP.rr < REL_MIN && (m === 'wait' || m === 'recover')) RP.rr = REL_MIN;   /* he never lets her pass */
    }
    function rPost(dt, hd, held) {   /* after his machine: the return window, his place, what the screen shows */
      for (var i = 0; i < EV.length; i++) { var e = EV[i];
        if (e === 'struck') RP.struck = true;
        if (e === 'shakeoff' || e === 'miss') { RP.retOpen = true; RP.retHit = false; RP.retFrom = RP.rr; } else if (e === 'hurt' || e === 'struck' || e === 'secondwind') RP.retOpen = false;
        if (e === 'warn' || e === 'zoomwarn') { if (RP.lastWarnT >= 0) { var gg = R.t - RP.lastWarnT; if (gg < RP.gMin) RP.gMin = gg; if (gg > RP.gMax) RP.gMax = gg; } RP.lastWarnT = R.t; RP.due = R_DUE0 + num(rand(), 0, 1) * (R_FORCE - R_DUE0); } }   /* each strike draws its own deadline, 4.5-6.4 s: never a metronome */
      if (rDue() && RP.dashT < 0 && (R.mode === 'stun' || R.mode === 'recover' || R.mode === 'drop')) { RP.retOpen = false; setMode('wait'); R.nextT = R.t; }   /* his real seconds outrank a dizzy spell, his way back, the drop */
      if (R.mode !== 'recover') RP.retOpen = false;
      if (RP.pm !== R.mode) { if (R.mode === 'wait' && RP.pm === 'recover' && R.phase === 'chase' && !RP.struck && R.plant !== 'noslow' && RP.wave !== 'tired') { RP.wave = 'tired'; RP.tiredHit = false; RP.tiredWaves++; RP.waveEnd = R.t + WAVE_T[1]; ev('tired'); } if (R.mode === 'wait') RP.struck = false; RP.pm = R.mode; }   /* 703r: in the chase he tires after striking (a window his own rhythm opens, every cycle) */
      if (R.phase === 'chase' && !held) rWave();
      if (held) { RP.rr += RP.hv * dt - hd; if (RP.rr < 1.2) RP.rr = 1.2; } else rMove(dt, hd);
      R.rel = RP.rr; if (RP.rr > RP.maxRel) RP.maxRel = RP.rr; if (RP.rr >= 0 && RP.rr < RP.nearest) RP.nearest = RP.rr;
      var w = rWin(), inc = incoming(), ai = inc ? R.arrive - R.t : 9;
      ST.reach = true; ST.wave = R.phase === 'chase' ? RP.wave : 'tail'; ST.win = w; ST.inRange = rIn(w); ST.far = RP.rr;
      ST.dashWind = RP.dashT >= 0 && RP.dashT < DASH_W; ST.dashLeft = RP.dashT >= DASH_W ? DASH_W + DASH_T - RP.dashT : 0;
      ST.now = inc && !R.tapped && ai <= NOW_T && ai > -good() ? 'side' : w && rIn(w) && RP.dashT < 0 ? 'atk' : '';
      ST.hitsLeft = R.phase === 'chase' ? DMG_A.length - R.hitsA + DMG_B.length : DMG_B.length - R.hitsB;
    }
    function tick(dt, inp) {
      dt = dt > 0 ? (dt < 0.25 ? dt : 0.25) : 0;
      EV.length = 0;
      var side = !!(inp && inp.sidestep), atk = !!(inp && inp.attack);
      R.lag = num(inp && inp.tapLag, 0, LAG_MAX); R.off = num(inp && inp.offset, -2 * RAIL_W, 2 * RAIL_W); R.prog = num(inp && inp.progress, -1e7, 1e7);
      R.t += dt; R.modeT += dt; R.sideT = Math.max(0, R.sideT - dt); R.sideCd = Math.max(0, R.sideCd - dt);
      var hd = 0; if (RCH) { hd = R.prog - RP.lastProg; if (!(hd >= 0 && hd < 40)) hd = RV0 * dt; RP.lastProg = R.prog; }   /* 703p: how far she came this frame (a restart at a gate or a new lap reads as her cruise) */
      var over = R.mode === 'won' || R.mode === 'down';
      if (side && R.sideCd <= 0 && !over) {   /* the sidestep: away from his line (toward the roomier side when he is not coming) */
        var dir = incoming() ? (R.off >= R.aim ? 1 : -1) : (R.off > 0 ? -1 : 1), tg = clamp(R.off + dir * SIDE_D, -RAIL_W, RAIL_W);
        if ((tg - R.off < 0 ? R.off - tg : tg - R.off) < SIDE_D * 0.5) tg = clamp(R.off - dir * SIDE_D, -RAIL_W, RAIL_W);
        if (RCH && incoming()) tg = rSide();   /* 703p: away from his LINE, never across it */
        R.sideTarget = tg; R.sideT = RCH ? R_SIDE_T : SIDE_T; R.sideCd = SIDE_CD; R.lastSide = R.t; ev('sidestep');
      }
      if (atk && !over && RCH) rAtk();   /* 703p: the catchable fight's ⚔️ */
      else if (atk && !over) {   /* what Attack means is decided here, by the mode, and nowhere else */
        if ((R.mode === 'stun' && !R.stunHit) || (R.plant === 'anyhit' && R.mode !== 'drop')) hit();   /* plant 'anyhit': the control for claim 1 */
        else if (incoming() && !R.tapped) judgeTap();
        else { R.whiffs++; ev('whiff'); }
      }
      var b = base(), k, held = RCH && rDash(dt);   /* 703p: while her dash runs his machine holds */
      if (held) R.rel = RP.rr;
      else if (R.mode === 'wait') {
        R.rel += (b - R.rel) * Math.min(1, dt * 2); R.lat = 1.5 * Math.sin(R.t * 0.9);
        if ((R.t >= R.nextT && !(RCH && rTired())) || rDue()) { if (rDue()) RP.forced++; setMode('warn'); R.warnStart = R.t; R.arrive = R.t + warnLen() + FLY_T; R.aim = R.off; R.side = num(rand(), 0, 1) < 0.5 ? -1 : 1; R.tapped = false; R.arrived = false;
          R.swoops++; if (R.phase === 'second') R.zooms++; ev(R.phase === 'second' ? 'zoomwarn' : 'warn'); }
      }
      if (held) R.rel = RP.rr;   /* 703p: held */
      else if (incoming()) {
        var lock = R.phase === 'second' && !RCH ? LOCK_B : LOCK_A;   /* 703p: his zoom commits as early as his swoop (a telegraphed windup) */
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
        if (R.modeT >= (RCH && RP.retOpen ? RETURN_T : RECOVER_T)) { setMode('wait'); R.nextT = R.t + gap(); }
      } else if (R.mode === 'drop') {   /* the second wind: he slows and falls behind her, then tails her */
        k = clamp(R.modeT / DROP_T, 0, 1); k = k * k * (3 - 2 * k); R.rel = R.dropFrom + (b - R.dropFrom) * k;
        if (R.modeT >= DROP_T) { setMode('wait'); R.nextT = R.t + gap(); }
      }
      if (RCH) rPost(dt, hd, held);   /* 703p */
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
      R.dodges = 0; R.misses = 0; R.hurts = 0; R.whiffs = 0; R.lastJudge = ''; R.dmgN = 0; setMode('wait');
      RP.wave = 'burst'; RP.waveEnd = R.t + WAVE_B[0]; RP.hv = RV0 * V_BURST; RP.lastProg = -1e9; RP.rr = AHEAD; RP.flyFrom = AHEAD; RP.dashT = -1; RP.dashWin = ''; RP.tiredHit = false; RP.retOpen = false; RP.retHit = false;   /* 703p */
      RP.dashes = 0; RP.lastWarnT = -1; RP.gMin = 1e9; RP.gMax = 0; RP.forced = 0; RP.far = 0; RP.pm = 'wait'; RP.struck = false; RP.byTired = 0; RP.byStun = 0; RP.byReturn = 0; RP.dashMiss = 0; RP.tiredWaves = 0; RP.bursts = 0; RP.maxRel = -1e9; RP.nearest = 1e9; if (RCH) R.rel = REL_MAX * 0.75; RP.rr = R.rel; return true;
    }
    function step(dt, input) {   /* a fault stops the fight, never the game */
      if (!R.on || R.dead) return null;
      try { R.plant = F._plant || null; if (R.plant === 'throw') R.no.such = 1; return tick(dt, input); } catch (err) { kill(err); return null; }
    }
    function peek() {
      return { ready: true, on: R.on, dead: R.dead, error: API.error, phase: R.phase, mode: R.mode, hp: R.hp, hits: R.hits, hitsChase: R.hitsA, hitsSecond: R.hitsB,
        stunT: +R.stunT.toFixed(3), stunLen: R.stunLen, warnT: incoming() ? +(R.t - R.warnStart).toFixed(3) : 0, arriveIn: incoming() ? +(R.arrive - R.t).toFixed(3) : null,
        feathers: R.feathers, swoops: R.swoops, zooms: R.zooms, parries: { good: R.parG, perfect: R.parP }, dodges: R.dodges, misses: R.misses, hurts: R.hurts, whiffs: R.whiffs,
        lastJudge: R.lastJudge, rel: +R.rel.toFixed(3), lat: +R.lat.toFixed(3), aim: +R.aim.toFixed(3), side: R.side, t: +R.t.toFixed(3), dmg: DMG_LOG.slice(0, R.dmgN), plant: R.plant,
        reach: RCH ? { wave: RP.wave, win: rWin(), inRange: rIn(rWin()), rel: +RP.rr.toFixed(3), hv: +RP.hv.toFixed(3), dashing: RP.dashT >= 0, dashes: RP.dashes, far: RP.far, dashMiss: RP.dashMiss, forced: RP.forced, realGap: [RP.gMin === 1e9 ? null : +RP.gMin.toFixed(3), +RP.gMax.toFixed(3)], by: { tired: RP.byTired, stun: RP.byStun, ret: RP.byReturn },
          tiredWaves: RP.tiredWaves, bursts: RP.bursts, maxRel: +RP.maxRel.toFixed(2), nearest: +RP.nearest.toFixed(2), retOpen: RP.retOpen } : null };
    }
    var F = { dead: false, _plant: null, start: start, stop: function () { R.on = false; }, on: function () { return R.on && !R.dead; }, step: step, peek: peek };
    return F;
  }

  API = { create: create, last: null, error: null, WARN_T: WARN_T, FLY_T: FLY_T, GOOD: GOOD, PERFECT: PERFECT, STUN_T: STUN_T, STUN_PERFECT: STUN_PERFECT, STUN_DODGE: STUN_DODGE,
    SIDE_D: SIDE_D, DODGE_CLEAR: DODGE_CLEAR, SECOND: SECOND, FEATHERS: FEATHERS, RAIL_W: RAIL_W, REACH: REACH, NOW_T: NOW_T };   /* 703p: REACH, NOW_T */
  return API;
}());
