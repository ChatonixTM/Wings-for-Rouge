/* world-chicks.js - BOARD 728a, THE CHICKS PLAY EVERYWHERE, LEVELLED BY WHAT SHE FEEDS THEM (wiring: tools/wiring/wire-728-chicks.js; guard:
   tests/chicks728.js). Trunks, Nov 4 2026. Every number, stat word and card word here is a DRAFT for Marth.
   Marth, Nov 4 2026 (board 728, verbatim in part): "I want the chics to be able to, unlike SA2B, be able to do everything the starter birds can and
   the fruits and feeding to directly / individually level up and applied to the chic, with the stats being felt in flight, fighting, stamina, speed,
   creativity ** (luckier - we'll expand on that) etc so when flying from fricken far country to country or distance it's felt".
   Su 37 relaying him: "And yeah think of the chics as hidden clear better option to all birds"; and his calibration: "think of the chic getting to
   levels 2-3 in certain areas as being equal, and four is where you start to see real changes. Level 6 becomes quite strong" (equal = Rouge's
   Cardinal at player level 45, "damn near as good or better than every bird (prolly slower than the falcon)").

   WHAT THIS DOES. Each chick is a bird in the game's own BIRDS table ('chick_<id>'), so the bird picker, buildBird, the flight, the travel zone and
   the pouch treat it exactly as they treat the Cardinal. Its numbers are LIVE getters on its own fruit-fed stats (the chick's existing six:
   fly, run, str, sta, swim, cre; STAT_STEP 50 a level), so a fruit fed is felt on the next frame of flight. The starter birds' rows are never
   touched. Chick 'c1' is the chick she hatched (S.chick); any further chick lives in S.chicks[id] (S.chicks.c1 is a non-enumerable view of
   S.chick, so the hatched chick is saved once, where it always was).

   THE CURVE (per stat, its own level L = points / 50, fractional so every fruit counts): anchors at L 0, 2, 2.5, 3 (by line), 4, 6, 20.
   L 2.5 = the Cardinal at Lv 45 in that stat; L 2 is 4% under it and L 3 4% over (both inside his "2-3 ... equal"); L 4 is +12%; L 6 is
   at least +25% AND above every starter bird in that stat (the Peregrine included); past 6 it keeps growing, gently, to the cap at L 20.
   The Cardinal at Lv 45, read from the game: speed 1.0, top 30, flutter 34, dive 38 x 1.5 (673 V2's Lv 42 tier) = 57, turn 1.6, glide sink 1,
   breath 5 (+ her level's lungs, which every bird gets), peck/sweep reach x1. Stamina has no starter counterpart: the starter birds never tire
   (unchanged), so its L 2.5 anchor is a DRAFT trip length, 10 minutes of flight before the chick needs a rest.
     NEW MECHANIC (chick-only): STAMINA. Flying costs 1 second of the pool a second (a boost, a flap, a flutter or a held long flight, x2.5);
     a glide down on the island costs nothing; on the ground it comes back (30 s to full, 10 s resting). At 0 the chick is TIRED: its cruise
     eases to x0.7 until 30% is back. Felt most on long country-to-country flights in the travel zone, where she flies for minutes at a time.

   API (window.WFR_CHICKS728)
     TABLE, AT, STEP, level(v), curve(name, stats), carryOf(stats)          the pure maths (node-testable)
     early(ctx)   -> the runtime (R) ; ctx { S, BIRDS, MOVES, FEEL, FEEL0, BREATH, birds3d, raw, kind: () => kind }   (before the save's kind is read)
     R.ids(), R.rec(id), R.idOf(kind), R.selfOf(kind), R.open(id), R.curve(name, id), R.stamina(id), R.tick(dt, P), R.card(id, why), R.peek() */
(function () {
  'use strict';
  var STEP = 50, MAX = 1000, LMAX = MAX / STEP;
  var AT = [0, 2, 2.5, 4, 6, 20];
  /* THE DRAFT TABLE: one row per thing a stat moves, its values at the levels in AT. ref = the Cardinal at Lv 45 (L 2.5); best = the best starter. */
  var TABLE = {
    speed:   { stat: 'run',  v: [0.75, 0.96, 1.00, 1.12, 1.65, 2.00], ref: 1.0, best: 1.55, what: 'cruise (x15 m/s on the island; x the travel zone\'s speed out in the world)' },
    top:     { stat: 'fly',  v: [24, 28.8, 30, 33.6, 45, 52],          ref: 30, best: 42, what: 'top speed in level flight (m/s)' },
    flutter: { stat: 'fly',  v: [27, 32.64, 34, 38.08, 50, 56],        ref: 34, best: 46, what: 'top speed in a Quick Flutter (m/s)' },
    dive:    { stat: 'fly',  v: [46, 54.72, 57, 63.84, 72, 80],        ref: 57, best: 66, what: 'top speed in a dive (m/s)' },
    turn:    { stat: 'fly',  v: [1.28, 1.536, 1.6, 1.792, 2.0, 2.2],   ref: 1.6, best: 1.6, what: 'turn rate' },
    sink:    { stat: 'fly',  v: [1.2, 1.04, 1.0, 0.89, 0.45, 0.40],    ref: 1.0, best: 0.5, low: true, what: 'glide sink (lower glides further)' },
    alt:     { stat: 'fly',  v: [56, 67.2, 70, 78.4, 150, 180],        ref: 70, best: 140, what: 'highest flight before the climb opens (m)' },
    reach:   { stat: 'str',  v: [0.8, 0.96, 1.0, 1.12, 1.3, 1.6],      ref: 1.0, best: 1.0, what: 'peck and tail-sweep reach (x)' },
    endure:  { stat: 'sta',  v: [120, 576, 600, 672, 900, 2400],       ref: 600, best: null, what: 'seconds of flight before tired (starters never tire)' },
    breath:  { stat: 'swim', v: [4, 4.8, 5, 5.6, 13, 16],              ref: 5, best: 12, what: 'seconds under water (+ her level\'s lungs)' },
  };
  var CARRY = [[0, 1], [4, 2], [6, 4], [12, 5]];   // Strength level -> carry slots (crow 3 is the best starter); + her level's gifts, as every bird
  var TIRED = 0.7, BACK = 0.3, BOOST = 2.5, REST = 30, REST_SLEEP = 10;
  var CARD = [['fly', '\u{1FAB6}', 'Flight'], ['str', '⚔️', 'Fighting'], ['sta', '\u{1F50B}', 'Stamina'], ['run', '\u{1F4A8}', 'Speed'], ['cre', '\u{1F340}', 'Creativity']];   // his five, in his order; DRAFT words
  var TINT = { fly: 0x7ec8f0, run: 0xf5a623, str: 0xe0533c, sta: 0x6cc26a, swim: 0x3fbfb0, cre: 0xff8fa3 };   // CSTATS' own colours (the page's table, copied: it is declared after this runs)
  var STAGE_NAME = ['Chick', 'Fledgling', 'Young bird'];

  function level(v) { return Math.max(0, Math.min(MAX, +v || 0)) / STEP; }
  function interp(row, L) { var i = 0; L = Math.max(0, Math.min(LMAX, L)); while (i < AT.length - 2 && L > AT[i + 1]) i++; var a = AT[i], b = AT[i + 1]; return row[i] + (row[i + 1] - row[i]) * (L - a) / (b - a); }
  function curve(name, stats) { var T = TABLE[name]; return interp(T.v, level((stats || {})[T.stat])); }
  function carryOf(stats) { var L = level((stats || {}).str), n = 1; for (var i = 0; i < CARRY.length; i++) if (L >= CARRY[i][0]) n = CARRY[i][1]; return n; }
  function mixHex(a, b, t) { var r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t), l = (a & 255) + (((b & 255) - (a & 255)) * t); return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(l); }

  /* the chick's own build in birds.js: rounder, a bigger head, a short beak and tail, small wings (copied from the Cardinal's SPEC, new flair) */
  function chickSpec(base) {
    var c = JSON.parse(JSON.stringify(base));
    c.body = [0.92, 0.94, 0.86]; c.head = 0.5; c.headAt = [0, 0.48, 0.86];
    c.beak = { len: 0.2, rad: 0.13, hook: 0.02, squash: 0.9, seed: true }; c.eye = 'song';
    c.wing.arm = 0.98; c.wing.prim = 0.86; c.wing.sec = 0.66;
    c.tail = { len: 0.78, n: 5, spread: 0.34, w: 0.26 }; c.crest = 0; c.mask = false; c.rough = 0.85;
    return c;
  }

  function early(ctx) {
    var S = ctx.S, BIRDS = ctx.BIRDS, MOVES = ctx.MOVES, FEEL = ctx.FEEL, FEEL0 = ctx.FEEL0, BREATH = ctx.BREATH, B3 = ctx.birds3d, kindNow = ctx.kind;
    var raw = ctx.raw && typeof ctx.raw === 'object' ? ctx.raw : null, TK = {}, R = { fault: null, forced: undefined, hid: false, used: {}, flown: {}, cards: 0, lastCard: null };
    var extra = raw && raw.chicks && typeof raw.chicks === 'object' ? raw.chicks : {};
    S.chicks = {};
    Object.keys(extra).forEach(function (id) { var c = extra[id]; if (id === 'c1' || !c || typeof c !== 'object') return; c.stats = Object.assign({ fly: 0, run: 0, str: 0, sta: 0, swim: 0, cre: 0 }, c.stats || {}); S.chicks[id] = c; });
    Object.defineProperty(S.chicks, 'c1', { get: function () { return S.chick; }, enumerable: false, configurable: true });   // the hatched chick: saved once, in S.chick
    var rec = function (id) { return id === 'c1' ? S.chick : S.chicks[id]; };
    var ids = function () { return ['c1'].concat(Object.keys(S.chicks)); };
    var KEY = function (id) { return 'chick_' + id; };
    var idOf = function (k) { return typeof k === 'string' && k.indexOf('chick_') === 0 && rec(k.slice(6)) ? k.slice(6) : null; };
    var open = function (id) { var c = rec(id); return !!(c && c.stats && S.nestDone && S.seen && S.seen.call625 && c.hatched !== false); };   // the story's turn (625: "you played as the bird ... now ... as the chic")
    var cv = function (name, id) { var c = rec(id); return curve(name, c && c.stats); };
    var tint = function (id) { var c = rec(id); if (!c || !c.stats || !c.stage) return 0xffd94a; var top = 'fly'; for (var k in TINT) if ((c.stats[k] || 0) > (c.stats[top] || 0)) top = k; return mixHex(0xffd94a, TINT[top], c.stage === 1 ? 0.5 : 0.9); };
    var nameOf = function (id) { var c = rec(id); return id === 'c1' ? 'Your chick' : (c && c.name) || ('Chick ' + id.replace(/^c/, '')); };
    var line = function (id) { var c = rec(id) || {}; return CARD.map(function (r) { return r[1] + Math.floor(level((c.stats || {})[r[0]])); }).join(' '); };
    function register(id) {
      var k = KEY(id); if (BIRDS[k]) return;
      var row = {};
      var g = function (name, fn) { Object.defineProperty(row, name, { get: fn, enumerable: true, configurable: true }); };
      g('name', function () { return nameOf(id); }); row.icon = '\u{1F425}';
      g('unlock', function () { return open(id) ? 1 : 1e9; });
      g('note', function () { return 'Its own wings, grown by what you feed it. ' + line(id); });
      g('body', function () { return tint(id); }); g('head', function () { return mixHex(tint(id), 0xffffff, 0.12); }); g('wing', function () { return mixHex(tint(id), 0x8a6a20, 0.18); });
      row.beak = 0xf28c28; row.legs = 0xf2a03a; row.legLen = 0.3; row.chest = 0xfff2c0; row.chick728 = id;
      g('size', function () { var c = rec(id) || {}; return 0.3 + 0.04 * (c.stage || 0); });
      g('speed', function () { return cv('speed', id) * (TK[id] == null ? 1 : TK[id]); });
      g('turn', function () { return cv('turn', id); });
      g('carry', function () { var c = rec(id); return carryOf(c && c.stats); });
      BIRDS[k] = row;
      var mv = {}; ['alt', 'flutter', 'dive', 'top'].forEach(function (n) { Object.defineProperty(mv, n, { get: function () { return cv(n, id); }, enumerable: true, configurable: true }); });
      if (MOVES) MOVES[k] = mv;
      if (FEEL && FEEL0) { var fe = Object.assign({}, FEEL0); Object.defineProperty(fe, 'sinkK', { get: function () { return cv('sink', id); }, enumerable: true, configurable: true }); FEEL[k] = fe; }
      if (BREATH) Object.defineProperty(BREATH, k, { get: function () { return cv('breath', id); }, enumerable: true, configurable: true });
      if (B3 && B3.SPEC && B3.SPEC.cardinal && !B3.SPEC[k]) B3.SPEC[k] = chickSpec(B3.SPEC.cardinal);
      if (B3 && B3.landing && B3.landing.cardinal && !B3.landing[k]) B3.landing[k] = B3.landing.cardinal;   // it comes down the way her Cardinal does (DRAFT: its own landing later)
    }
    ids().forEach(register);

    /* stamina: chick-only. P = { id, mode, flapT, flutT, longK, pitch, travel, resting, ui } from the page each frame (both zones) */
    function tick(dt, P) {
      var id = P && P.id, c = id && rec(id);
      if (c) {
        if (typeof c.stam728 !== 'number') c.stam728 = 1;
        var E = Math.max(1, cv('endure', id)), air = P.mode === 'fly' || P.mode === 'hover', boost = P.flapT > 0 || P.flutT > 0 || P.longK > 0.5, glide = air && !P.travel && !boost && P.pitch < -0.15;
        var d = air ? (glide ? 0 : (boost ? BOOST : 1) / E) : P.mode === 'swim' ? 1 / E : 0;
        var up = !air && (P.mode === 'walk' || P.mode === 'landing') ? 1 / (P.resting ? REST_SLEEP : REST) : 0;
        c.stam728 = Math.max(0, Math.min(1, c.stam728 - d * dt + up * dt)); R.used[id] = (R.used[id] || 0) + d * dt; if (air) R.flown[id] = (R.flown[id] || 0) + dt;
        if (c.stam728 <= 0) c.tired728 = true; else if (c.tired728 && c.stam728 >= BACK) c.tired728 = false;
        TK[id] = (TK[id] == null ? 1 : TK[id]) + ((c.tired728 ? TIRED : 1) - (TK[id] == null ? 1 : TK[id])) * Math.min(1, dt * 1.5);
      }
      bar(c && P.ui && (P.mode === 'fly' || P.mode === 'hover' || P.mode === 'walk' || P.mode === 'swim') ? c : null);
    }

    /* the stamina bar, while she flies a chick (no control: it never takes a touch) */
    var barEl = null, barW = -1, barT = null, barN = 0;
    function barPlace() {   // under the level card, or under 720's quests button when it is there (ship #80 put it under the card): measured, never assumed
      var p = document.getElementById('lvPill'), q = document.getElementById('questsBtn720'); if (!p) return; var r = p.getBoundingClientRect(); if (!r.width) return;
      var qr = q && !q.hidden && getComputedStyle(q).display !== 'none' ? q.getBoundingClientRect() : null, bot = Math.max(r.bottom, qr && qr.height ? qr.bottom : 0);
      var L = Math.round(r.left) + 'px', T = Math.round(bot + 8) + 'px'; if (barEl.style.left !== L) barEl.style.left = L; if (barEl.style.top !== T) barEl.style.top = T;
    }
    function bar(c) {
      if (typeof document === 'undefined') return;
      if (!barEl) { css(); barEl = document.createElement('div'); barEl.id = 'sta728'; barEl.setAttribute('aria-label', 'Your chick\'s stamina'); barEl.innerHTML = '<span>\u{1F425}</span><b><i></i></b><em></em>'; barEl.hidden = true; document.body.appendChild(barEl); }
      if (!c) { if (!barEl.hidden) barEl.hidden = true; return; }
      if (barEl.hidden) { barEl.hidden = false; barN = 0; }
      if (barN++ % 15 === 0) barPlace();
      var w = Math.round(c.stam728 * 100), t = !!c.tired728;
      if (w !== barW) { barW = w; barEl.querySelector('i').style.width = w + '%'; }
      if (t !== barT) { barT = t; barEl.classList.toggle('tired', t); barEl.querySelector('em').textContent = t ? 'Tired' : ''; }   // DRAFT word
    }

    /* the stat card: his five, each bar to level 8, a mark where her Cardinal at Lv 45 stands (L 2.5) */
    var cardEl = null, cardTO = null;
    function card(id, why) {
      if (typeof document === 'undefined') return;
      var c = rec(id); if (!c) return;
      if (!cardEl) { css(); cardEl = document.createElement('div'); cardEl.id = 'card728'; cardEl.setAttribute('aria-live', 'polite'); cardEl.hidden = true; document.body.appendChild(cardEl); }
      var rows = CARD.map(function (r) { var L = level((c.stats || {})[r[0]]), lv = Math.floor(L), w = Math.min(100, L / 8 * 100), col = '#' + TINT[r[0]].toString(16).padStart(6, '0');
        return '<div class="r728" data-k="' + r[0] + '"><span>' + r[1] + ' ' + r[2] + '</span><span class="b728"><i style="width:' + w.toFixed(1) + '%;background:' + col + '"></i><u></u></span><span class="l728">Lv ' + lv + '</span></div>'; }).join('');
      cardEl.innerHTML = '<div class="t728"><b>\u{1F425} ' + nameOf(id) + '</b><span>' + (STAGE_NAME[c.stage || 0] || '') + (why === 'fed' ? ' · fed!' : '') + '</span></div>' + rows +
        '<small>│ = your Cardinal at Lv 45</small>';   // DRAFT words
      cardEl.hidden = false; R.cards++; R.lastCard = { id: id, why: why, text: cardEl.textContent };
      clearTimeout(cardTO); cardTO = setTimeout(function () { cardEl.hidden = true; }, 4500);
    }
    var cssDone = false;
    function css() {
      if (cssDone) return; cssDone = true; var s = document.createElement('style'); s.id = 'css728';
      /* upright: the open middle-left (clear of the right-hand column of buttons, the hint above it and the stick below); on its side: under the HUD, centred */
      s.textContent = '#card728{position:fixed;left:calc(env(safe-area-inset-left,0px) + 12px);right:calc(env(safe-area-inset-right,0px) + 96px);top:calc(env(safe-area-inset-top,0px) + 296px);max-width:300px;z-index:60;pointer-events:none;' +
        'background:rgba(16,22,58,.9);color:#fff8ec;border:1px solid rgba(255,233,168,.45);border-radius:16px;padding:10px 14px 8px;box-shadow:0 8px 28px rgba(0,0,0,.35);font:600 13px/1.25 var(--body,system-ui),system-ui,sans-serif}' +
        '#card728 .t728{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}#card728 .t728 b{font:700 16px/1.1 var(--display,system-ui),system-ui,sans-serif;color:#ffe9a8}#card728 .t728 span{font-size:12px;color:#c9d2ee}' +
        '#card728 .r728{display:grid;grid-template-columns:104px 1fr 40px;align-items:center;gap:8px;margin:4px 0}#card728 .l728{text-align:right;color:#ffe9a8}' +
        '#card728 .b728{position:relative;height:9px;border-radius:9px;background:rgba(255,255,255,.14);overflow:hidden}#card728 .b728 i{position:absolute;left:0;top:0;bottom:0;border-radius:9px}' +
        '#card728 .b728 u{position:absolute;left:31.25%;top:-1px;bottom:-1px;width:2px;background:#fff;opacity:.85}#card728 small{display:block;margin-top:5px;font-size:11px;color:#aab4d6;text-align:right}' +
        '#sta728{position:fixed;left:calc(env(safe-area-inset-left,0px) + 22px);top:calc(env(safe-area-inset-top,0px) + 138px);z-index:6;pointer-events:none;display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:rgba(16,22,58,.72);color:#fff8ec;font:700 12px/1 var(--body,system-ui),system-ui,sans-serif}' +
        '#sta728 b{display:block;width:96px;height:8px;border-radius:8px;background:rgba(255,255,255,.18);overflow:hidden}#sta728 i{display:block;height:100%;border-radius:8px;background:#6cc26a;transition:width .25s}' +
        '#sta728.tired i{background:#e0533c}#sta728 em{font-style:normal;color:#ffb4a8}#sta728 em:empty{display:none}' +
        'body:has(#missions:not([hidden])) #sta728,body:has(#quick:not([hidden])) #sta728,body:has(#quests720:not([hidden])) #sta728,body:has(#care:not([hidden]):not(.tucked)) #sta728{visibility:hidden}' +   /* a panel open: it steps away (720's own rule, copied) */
        '@media (orientation:landscape){#card728{left:50%;right:auto;width:300px;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 96px)}}';
      document.head.appendChild(s);
    }
    R.ids = ids; R.rec = rec; R.idOf = idOf; R.selfOf = function (k) { return idOf(k === undefined ? kindNow() : k); }; R.open = open; R.register = register; R.key = KEY;
    R.curve = cv; R.tick = tick; R.card = card; R.tk = function (id) { return TK[id] == null ? 1 : TK[id]; };
    R.stamina = function (id) { var c = rec(id); return c ? { left: typeof c.stam728 === 'number' ? c.stam728 : 1, tired: !!c.tired728, endure: cv('endure', id), used: R.used[id] || 0, flown: R.flown[id] || 0 } : null; };
    return R;
  }

  var API = { TABLE: TABLE, AT: AT, STEP: STEP, CARRY: CARRY, TIRED: TIRED, level: level, curve: curve, carryOf: carryOf, early: early };
  if (typeof window !== 'undefined') window.WFR_CHICKS728 = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
}());
