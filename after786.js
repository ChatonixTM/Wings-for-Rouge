/* after786.js - BOARD 786, THE GAME AFTER THE HAWK (Wings for Rouge). Ship #134, Nov 13 2026.
   Marth, Nov 13 2026, verbatim: "Crazy thing is a lot of the game implementations are really good but rouge may never see them again cuz she's way passed
   th start of the story ( I think she beat the hawk two days ago) I'm like level 45 and she's like 37" / "the eagle also STILL says train little one he will
   return when the hawk is chilling on my island lol. This is what I mean by we need to fix things and add more looping in future game". And "dont rush the
   ships" / "make a nice build"; "These are due and looping integration" (every system feeds the next).

   WHAT IS HERE (the page wires it: wings-for-rouge.html, "786").
   WHAT'S NEW  a file already past the start when it loads (Lv 15+, or the sky seen, or the Hawk beaten; never a new file: a file still building its nest
               is marked 'new' at load and never asked) gets ONE letter from the village, once, when she is free: what was built for the start that she
               has not yet seen (the Chick Haven, the Race, the School, the Ring, the villagers' homes, her chick's hatch on its card) and, past the story,
               what is new for her now (the Hawk's race, the daily errands, the world beyond). One card; then the arrow points at the first place she has
               not been (the Haven's door, the Race's start line, a villager's open door), each place at most once and for 6 minutes of play at most.
   THE HAWK'S RACE  (his lore, memory marth-rulings-oct-14-the-hawks-origin: the Eagle raised the Hawk; he was never the Eagle's equal; beaten, not
               killed; the Dove calls him to turn). Befriended, he visits her island; from Lv 30, once he has said his piece, he asks her to race him
               to the old one's peak (the Eagle's). Five tiers, each opened by her level (30, 40, 50, 65, 80) and the tier before; his pace is a share of
               her own cruise at that tier's level, so her levels are what win it. A first win at a tier: coins, runes, XP, and he shows her chick how to
               hold the wind (Flight +16: the Race's glide). One race a day; after it he sits by the Eagle on the peak for the rest of the day.
   THE RULES   pure (no THREE, no page): tierOf, paceOf, pay, and the letter's items, so the guard and the numbers read the same code.
   Standard only (Classic is frozen: nothing here is built or said there). Every word, name and number a DRAFT for his pen and her thumb. */
window.WFR_AFTER786 = (function () {
  'use strict';
  var API = { error: '' };
  var K = { LATE_LV: 15, CALM: 5, ARROW_T: 360, NEAR: 7.5, FIN: 10, LOSE_WAIT: 25, ASK_GAP: 40, COUNT: 3 };
  /* the Hawk's tiers: the level that opens each, his pace as a share of her cruise AT that level, and what a win pays (first / again) */
  var TIERS = [
    { lv: 30, k: 0.96, coins: [10, 4], runes: [12, 4], xp: [60, 25] },
    { lv: 40, k: 1.03, coins: [12, 5], runes: [16, 5], xp: [80, 30] },
    { lv: 50, k: 1.10, coins: [15, 6], runes: [20, 6], xp: [100, 35] },
    { lv: 65, k: 1.17, coins: [18, 7], runes: [26, 8], xp: [120, 40] },
    { lv: 80, k: 1.22, coins: [24, 8], runes: [32, 10], xp: [150, 50] }];
  /* MEASURED (RTX, a Cardinal at Lv 37 flapping straight at the peak from his perch, 195 m out and 50 m up): she got there in 10.2 s (her flaps carry her
     at up to 28 m/s). His line is ~209 m: tier 1 (15.9 m/s) takes him ~13 s, tier 3 ~11 s, tier 5 (22.3 m/s) ~9.4 s, which a plain flap race at Lv 80
     (wings x1.2) only just ties: the top tiers want her dive and flutter. */
  var LOSE = { coins: 1, xp: 10 };
  var GIFT = { stat: 'fly', n: 16 };
  /* the letter's rows, in order: [id, emoji, name, line]; 'place' rows get the arrow (DRAFT words, his pen) */
  var ROWS = [
    ['haven', '\u{1F6AA}', 'Chick Haven', 'A garden for your chick, through the little round door under your nest tree.', 1],
    ['race', '\u{1F3C1}', 'The Race', 'Chicks race round the meadow west of the big tree. Four cups; the last is for champions.', 1],
    ['school', '\u{1F3B5}', 'The School', 'In the Haven: songs, dances and drawings for your chick.', 0],
    ['ring', '\u{1FAB5}', 'The Ring', 'In the Haven: Puff Push and the Vine Tug. Gentle games; both chicks bow.', 0],
    ['homes', '\u{1F3E0}', 'Our homes', 'Come in and see us. By day our doors are open; at night we are home.', 1],
    ['hatch', '\u{1F423}', 'Its hatch', 'Open your chick\'s card and tap Its hatch to see the day it hatched.', 0]];
  var LATE_ROWS = {   /* past the story: what is new for her now */
    hawk: ['\u{1F985}', 'The Hawk', 'When he visits, he may ask you to race him to the Eagle\'s peak. The stronger you get, the harder he flies.'],
    hawkR: ['\u{1F985}', 'The Hawk', 'He waits on Damned across the sea. Every time you beat him there, it pays.'],
    errands: ['\u{1F9FA}', 'Errands', 'Some of us have a small errand most days, for coins and runes. Look for the ❗ over our heads.'],
    world: ['\u{1F30D}', 'The world', 'Past the sea the world is open. Fly north over the water: Jamaica is about 170 km away.']
  };
  var W = {   /* DRAFT, for his pen */
    from: 'A letter from the village', title: 'While you were away', hello: function (n) { return 'Dear ' + n + ', while you were off facing the Hawk, the island kept busy. Come and see:'; },
    sign: '— Ada, for all of us', go: 'Off I go', pill: { haven: 'New: Chick Haven, the round door under your nest', race: 'New: the Race, out by the meadow', homes: 'New: come into a villager\'s home' },
    ask1: [['Hawk', '...When I was small, the old one raced me up to his peak. I never won. Not once.'], ['Hawk', 'Race me there. Now. He will judge.']],
    ask: [['Hawk', 'The old one\'s peak. Again?']],
    yes: 'Race him', no: 'Not today', q: function (n) { return 'Race the Hawk to the Eagle\'s peak? (race ' + n + ' of 5)'; }, noSay: 'Tomorrow, then.',
    count: ['3', '2', '1', 'Go!'], hud: function (m) { return 'Race the Hawk to the peak! · ' + m + ' m'; },
    win: [['Eagle', 'Hm. She was here first.'], ['Hawk', '...She was. Tomorrow, little one. I will be faster.']],
    winTop: [['Eagle', 'Hm. She was here first again.'], ['Hawk', '...There is no shame in losing to her. I am learning that.']],
    gift: [['Hawk', 'Your chick watched the whole way. Here: tuck the wings, ride the wind, let it carry you. Like that.']],
    giftToast: 'The Hawk showed your chick how to ride the wind · Flight +16',
    lose: [['Hawk', 'I won this one. Do not let me win the next.'], ['Eagle', 'Again tomorrow, both of you.']],
    loseToast: 'The Hawk reached the peak first.', first: 'You reached the peak first!', farToast: 'The Hawk waited on the peak, then settled down by the Eagle. Again tomorrow.',
    tierUp: function (t) { return 'The Hawk will fly harder now (race ' + t + ' of 5).'; }
  };
  /* THE RULES (pure) */
  function hr(h) { var r = h && h.race786; if (!r || typeof r !== 'object') return { won: [0, 0, 0, 0, 0], runs: 0, day: -1, paid: 0 }; if (!Array.isArray(r.won)) r.won = [0, 0, 0, 0, 0]; return r; }
  function openTier(lv, r, i) { return i >= 0 && i < TIERS.length && lv >= TIERS[i].lv && (i === 0 || (r.won[i - 1] || 0) > 0); }
  function tierOf(lv, r) { var best = -1; for (var i = 0; i < TIERS.length; i++) if (openTier(lv, r, i)) best = i; for (var j = 0; j <= best; j++) if (!(r.won[j] || 0)) return j; return best; }
  function paceOf(i, cruiseAt) { var T = TIERS[i]; return T ? T.k * cruiseAt(T.lv) : 0; }
  function payOf(i, first) { var T = TIERS[i], n = first ? 0 : 1; return { coins: T.coins[n], runes: T.runes[n], xp: T.xp[n] }; }

  function create(o) {
    var Lt = o.late;
    var A = { shown: 0, letter: null, rows: [], calm: 0, asks: 0, races: 0, wins: 0, loses: 0, ph: null, t: 0, tier: -1, path: null, s: 0, L: 0, v: 0, held: false, last: null, day: -1, said: 0, err: '', arrows: 0 };
    function st() { var S = Lt().S; S.seen = S.seen || {}; return S.seen; }
    function rec() { var n = st().new786; return n && typeof n === 'object' ? n : null; }
    /* ---------- WHAT'S NEW ---------- */
    function lateFile() {   /* read once at load (the page calls init) */
      var lt = Lt(), S = lt.S; if (lt.classic()) return false;
      var sn = st(); if (sn.new786 != null) return false;
      if (!S.nestDone) { sn.new786 = -1; return false; }   /* a new file: never asked */
      var late = (S.level || 1) >= K.LATE_LV || !!(S.sky && S.sky.seen) || lt.won();
      if (!late) { sn.new786 = -1; return false; }
      return !!lt.chick();
    }
    function done(id) {
      var lt = Lt(), S = lt.S, c = S.chick || {}, r = rec(); if (r && r.done && r.done[id]) return true;
      if (id === 'haven') return !!(c.haven781 && c.haven781.visits);
      if (id === 'race') return !!(S.race782 && S.race782.runs);
      if (id === 'school') { var sc = c.school782; return !!(sc && ((sc.learned && Object.keys(sc.learned).length) || sc.cur)); }
      if (id === 'ring') { var rg = c.ring782; return !!(rg && rg.bouts); }
      if (id === 'homes') return !!(S.seen && S.seen.home784 && Object.keys(S.seen.home784).length);
      if (id === 'world') return !!(S.seen && S.seen.arrive783);
      return false;
    }
    function rowsNow() {
      var lt = Lt(), S = lt.S, out = [];
      ROWS.forEach(function (q) { if (!done(q[0])) out.push({ id: q[0], e: q[1], name: q[2], line: q[3], place: !!q[4] }); });
      var h = (S.world && S.world.hawk) || null;
      if (lt.won() && h) { var L = h.friend === -1 ? LATE_ROWS.hawkR : LATE_ROWS.hawk; out.push({ id: 'hawk', e: L[0], name: L[1], line: L[2] }); }
      if (lt.loopOn()) out.push({ id: 'errands', e: LATE_ROWS.errands[0], name: LATE_ROWS.errands[1], line: LATE_ROWS.errands[2] });
      if (lt.won() && lt.worldOpen() && !done('world')) out.push({ id: 'world', e: LATE_ROWS.world[0], name: LATE_ROWS.world[1], line: LATE_ROWS.world[2] });
      return out;
    }
    function css() {
      if (document.getElementById('after786css')) return; var s = document.createElement('style'); s.id = 'after786css';
      s.textContent = '#new786,#hawk786{position:fixed;left:50%;transform:translateX(-50%);width:min(440px,calc(100vw - 24px));box-sizing:border-box;z-index:44;background:#fff8ea;color:#3b2a1a;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.35);font-family:var(--body,system-ui)}' +
        '#new786{top:calc(env(safe-area-inset-top,0px) + 70px);max-height:calc(100vh - 110px);display:flex;flex-direction:column;overflow:hidden;padding:14px 14px 10px}' +
        '#new786 .k{font:800 11px var(--body,system-ui);letter-spacing:.12em;text-transform:uppercase;color:#a0742a}#new786 h3{margin:2px 0 4px;font:600 24px Georgia,serif}' +
        '#new786 .hi{font:italic 600 14px/1.4 Georgia,serif;color:#5a4026;margin:0 0 6px}#new786 .rows{flex:1 1 auto;min-height:0;overflow:auto}' +
        '#new786 .r786{display:flex!important;flex-direction:row!important;align-items:flex-start;gap:10px;padding:6px 2px;border-top:1px solid rgba(60,40,20,.1)}#new786 .r786 .e{flex:0 0 32px;font-size:22px;text-align:center;line-height:1.15}#new786 .r786 .t{flex:1;min-width:0}' +
        '#new786 .r786 b{display:block;font:700 15px var(--body,system-ui)}#new786 .r786 small{display:block;font:600 12.5px/1.32 var(--body,system-ui);color:#7a5a3a}#new786 .r786.first b:after{content:"  ➤ the arrow";font:800 11px var(--body,system-ui);color:#c8314a}' +
        '#new786 .sg{font:italic 600 13px Georgia,serif;color:#7a5a3a;text-align:right;margin:4px 2px 0}' +
        '#new786 .go,#hawk786 button{display:block;width:100%;margin-top:8px;min-height:48px;border-radius:14px!important;border:0;background:#c8314a!important;color:#fff!important;font:800 15px var(--body,system-ui)!important;box-shadow:0 3px 8px rgba(0,0,0,.25)!important;filter:none!important}' +
        '#hawk786{bottom:calc(env(safe-area-inset-bottom,0px) + 14px);padding:12px 14px;display:flex;flex-wrap:wrap;gap:10px}#hawk786 .q{flex:1 0 100%;margin:0;text-align:center;font:600 17px/1.3 Georgia,serif}#hawk786 button{margin:0;flex:1}#hawk786 button.alt{background:#fff!important;color:#3b2a1a!important;border:2px solid rgba(60,40,20,.2)}';
      document.head.appendChild(s);
    }
    function showLetter() {
      var lt = Lt(), S = lt.S, rows = rowsNow(); if (!rows.length) { st().new786 = { at: Math.round(S.played || 0), rows: [], done: {}, tk: {}, closed: 1 }; lt.save(); return false; }
      css(); var first = rows.find(function (q) { return q.place; });
      var el = document.createElement('div'); el.id = 'new786'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', W.title);
      var h = '<div class="k">' + W.from + '</div><h3>' + W.title + '</h3><p class="hi"></p><div class="rows">';
      rows.forEach(function (q) { h += '<div class="r786' + (first && q.id === first.id ? ' first' : '') + '" data-id="' + q.id + '"><div class="e">' + q.e + '</div><div class="t"><b></b><small></small></div></div>'; });
      h += '</div><div class="sg">' + W.sign + '</div><button type="button" class="go">' + W.go + '</button>'; el.innerHTML = h;
      el.querySelector('.hi').textContent = W.hello(lt.NAME);
      rows.forEach(function (q) { var r = el.querySelector('.r786[data-id="' + q.id + '"]'); r.querySelector('b').textContent = q.name; r.querySelector('small').textContent = q.line; });
      el.addEventListener('pointerdown', function (e) { e.stopPropagation(); }, true);
      el.querySelector('.go').addEventListener('click', function (e) { e.stopPropagation(); closeLetter(); });
      document.body.appendChild(el); A.letter = el; A.rows = rows.map(function (q) { return q.id; }); A.shown++;
      st().new786 = { at: Math.round(S.played || 0), rows: A.rows.slice(), done: {}, tk: {}, closed: 0 }; S.talking = true; lt.save();
      try { if (window.WFR_SOUND && WFR_SOUND.phrase) WFR_SOUND.phrase('found', { vol: 0.45 }); } catch (e) { /* the card shows without its music */ }
      return true;
    }
    function closeLetter() { var lt = Lt(); if (A.letter) { A.letter.remove(); A.letter = null; } var r = rec(); if (r) r.closed = 1; lt.S.talking = false; lt.save(); lt.hud(); }
    function arrowRow() {   /* the place row the arrow is on: the first not done, not timed out */
      var r = rec(); if (!r || !r.closed || !Array.isArray(r.rows)) return null; var lt = Lt(), P = lt.S.played || 0;
      for (var i = 0; i < r.rows.length; i++) { var id = r.rows[i], q = ROWS.find(function (x) { return x[0] === id; }); if (!q || !q[4] || done(id)) continue;
        var t0 = r.tk[id]; if (t0 == null) { r.tk[id] = Math.round(P); A.arrows++; return id; } if (P - t0 < K.ARROW_T) return id; }
      return null;
    }
    function goal() {
      try { if (Lt().classic()) return null; if (A.ph === 'run' || A.ph === 'wait') return Lt().eagleSpot(); var id = arrowRow(); if (!id) return null; var lt = Lt();
        if (id === 'haven' || id === 'school' || id === 'ring') return lt.havenOn() ? null : lt.havenDoor();
        if (id === 'race') return lt.raceSpot(); if (id === 'homes') return lt.homeDoor(); return null; } catch (e) { A.err = String(e && e.message || e); return null; }
    }
    function pill() {
      if (A.ph === 'run' || A.ph === 'wait') { var lt = Lt(), E = lt.eagleSpot(), S = lt.S; return W.hud(Math.round(Math.hypot(E.x - S.pos.x, E.z - S.pos.z))); }
      var id = arrowRow(); return id && W.pill[id] ? W.pill[id] : '';
    }
    function mark(id) { var r = rec(); if (!r) return; r.done = r.done || {}; if (!r.done[id]) { r.done[id] = 1; Lt().save(); } }
    function letterTick(real) {
      var lt = Lt(), S = lt.S; if (A.letter || lt.classic()) return;
      if (A.late && !rec()) { A.calm = lt.busy() === '' && !lt.havenOn() && !S.talking ? A.calm + real : 0; if (A.calm >= K.CALM) { A.late = false; showLetter(); } }
      if (S.inside && S.inside.home784) mark('homes');
      var R2 = lt.raceSpot(); if (R2 && Math.hypot(R2.x - S.pos.x, R2.z - S.pos.z) < 14) mark('race');
    }
    /* ---------- THE HAWK'S RACE ---------- */
    function hawk() { var S = Lt().S; return S.world && S.world.hawk ? S.world.hawk : null; }
    function canAsk() {
      var lt = Lt(), S = lt.S, h = hawk(), V = lt.visit(); if (!h || h.friend !== 1 || !V.on || !V.landed || V.said < 0 || A.ph || S.talking) return false;
      var r = hr(h); if (r.day === lt.day() || A.day === lt.day() || tierOf(S.level || 1, r) < 0) return false;
      var hk = lt.hawkMesh(); if (!hk || !hk.visible || lt.busy() !== '') return false;
      return hk.position.distanceTo(S.pos) < K.NEAR;
    }
    function askCard(on) {
      var el = document.getElementById('hawk786'); if (!on) { if (el) el.remove(); return; } css();
      if (!el) { el = document.createElement('div'); el.id = 'hawk786'; el.setAttribute('role', 'dialog'); el.innerHTML = '<p class="q"></p><button type="button" class="yes"></button><button type="button" class="alt no"></button>'; document.body.appendChild(el);
        el.addEventListener('pointerdown', function (e) { e.stopPropagation(); }, true);
        el.querySelector('.yes').addEventListener('click', function (e) { e.stopPropagation(); answer(true); });
        el.querySelector('.no').addEventListener('click', function (e) { e.stopPropagation(); answer(false); }); }
      el.querySelector('.q').textContent = W.q(tierOf(Lt().S.level || 1, hr(hawk())) + 1); el.querySelector('.yes').textContent = W.yes; el.querySelector('.no').textContent = W.no;
    }
    function ask() {
      var lt = Lt(), h = hawk(), r = hr(h); A.asks++; A.day = lt.day(); A.ph = 'ask';
      lt.say(r.runs ? W.ask : W.ask1, function () { if (A.ph !== 'ask') return; askCard(true); Lt().S.talking = true; });
    }
    function answer(yes) {
      var lt = Lt(); askCard(false); lt.S.talking = false;
      if (!yes) { A.ph = null; lt.toast(W.noSay, 2200); return; }
      go();
    }
    function go() {
      var lt = Lt(), S = lt.S, h = hawk(), r = hr(h), hk = lt.hawkMesh(); h.race786 = r;
      var t = tierOf(S.level || 1, r); if (t < 0 || !hk) { A.ph = null; return false; }
      var E = lt.eagleSpot(), P0 = hk.position.clone(), P2 = E.clone(); P2.x += 2.6; P2.z += 1.4; P2.y = lt.ground(P2.x, P2.z) + lt.hawkFoot();
      var mid = P0.clone().lerp(P2, 0.5); mid.y = Math.max(P0.y, P2.y) + 14;
      var pts = [], L = 0, prev = null; for (var i = 0; i <= 64; i++) { var u = i / 64, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; var p = P0.clone().multiplyScalar(a).add(mid.clone().multiplyScalar(b)).add(P2.clone().multiplyScalar(c)); if (prev) L += p.distanceTo(prev); p.d = L; pts.push(p); prev = p; }
      A.path = pts; A.L = L; A.s = 0; A.sitAt = null; A.mine = null; A.hawkAt = null; A.tier = t; A.v = paceOf(t, lt.cruiseAt); A.t = 0; A.cn = -1; A.ph = 'count'; A.held = true; A.races++; A.myT = 0;
      r.day = lt.day(); r.runs = (r.runs || 0) + 1; h.nextVisit = lt.day() + 1; lt.save();
      A.last = { tier: t, v: +A.v.toFixed(2), L: +L.toFixed(1), from: P0.toArray().map(function (x) { return +x.toFixed(1); }), to: P2.toArray().map(function (x) { return +x.toFixed(1); }) };
      lt.title('The Hawk\'s race', 'To the Eagle\'s peak', 'Race ' + (t + 1) + ' of 5 · get there first', 'found');
      return true;
    }
    function flap(t, k) { var Wg = Lt().hawkWings(); if (Wg) Wg.forEach(function (w, i) { var s = i % 2 ? -1 : 1; w.rotation.y = s * 1.3 * (1 - k); w.rotation.z = s * Math.sin(t * 8.5) * 0.85 * k - s * 0.18 * (1 - k); }); }
    function at(s) { var P = A.path, i = 1; while (i < P.length - 1 && P[i].d < s) i++; var a = P[i - 1], b = P[i], f = b.d > a.d ? (s - a.d) / (b.d - a.d) : 1; return { p: a.clone().lerp(b, Math.max(0, Math.min(1, f))), dir: b.clone().sub(a) }; }
    function hawkTick(real) {
      var lt = Lt(), S = lt.S, hk = lt.hawkMesh();
      if (A.ph === 'ask' && !S.talking && !document.getElementById('hawk786')) A.ph = null;   /* the talk ended some other way */
      if (!A.ph && canAsk()) { ask(); return; }
      if (!hk) return;
      if (A.ph === 'count') { A.t += real; var n = Math.min(3, Math.floor(A.t)); if (n !== A.cn) { A.cn = n; lt.toast(W.count[n], n === 3 ? 900 : 800); } if (A.t >= K.COUNT) { A.ph = 'run'; A.t = 0; } return; }
      if (A.ph === 'run' || A.ph === 'wait' || A.ph === 'after') {
        var E = lt.eagleSpot(), dy = S.pos.y - E.y, here = Math.hypot(S.pos.x - E.x, S.pos.z - E.z) < K.FIN && dy > -4 && dy < 16; A.myT += real;   /* at the peak: within 10 m round it, up to 16 m over it */
        if (A.ph === 'run' || A.ph === 'after') { A.s = Math.min(A.L, A.s + A.v * real); var q = at(A.s); hk.position.copy(q.p); hk.rotation.set(0, Math.atan2(q.dir.x, q.dir.z), 0); flap(A.myT, 1 - Math.max(0, (A.s - A.L + 6) / 6)); }
        if (A.ph === 'run') {
          if (here) { A.ph = 'after'; A.t = 0; A.mine = +A.myT.toFixed(1); A.hawkAt = +A.s.toFixed(1); standHer(); lt.toast(W.first, 2600); return; }   /* she is there first: she lands by the Eagle; he flies in after her */
          if (A.s >= A.L) { A.ph = 'wait'; A.t = 0; sitHawk(); lt.toast(W.loseToast, 3000); } return; }
        if (A.ph === 'after') { A.t += real; if (A.s >= A.L || A.t > 8) { sitHawk(); finish(true); } return; }
        A.t += real; if (here) { standHer(); finish(false); } else if (A.t > K.LOSE_WAIT) finish(false, true); return; }
      if (A.ph === 'sit') { var E2 = lt.eagleSpot(); hk.visible = true; hk.position.copy(A.sitAt); hk.rotation.set(0, Math.atan2(E2.x - hk.position.x, E2.z - hk.position.z), 0); if (lt.day() !== A.sitDay) { A.ph = null; A.held = false; hk.visible = false; } }
    }
    function sitHawk() { var lt = Lt(), hk = lt.hawkMesh(), E = lt.eagleSpot(), land = A.path[A.path.length - 1]; A.sitAt = land.clone(); A.sitDay = lt.day(); hk.position.copy(land); hk.rotation.set(0, Math.atan2(E.x - land.x, E.z - land.z), 0); flap(0, 0); }
    function standHer() {   /* she sets down on the peak, on the Eagle's other side from where the Hawk lands, facing the Eagle */
      var lt = Lt(), E = lt.eagleSpot(), land = A.path[A.path.length - 1], a = Math.atan2(land.x - E.x, land.z - E.z) + Math.PI * 0.75; lt.standAt(E.x + Math.sin(a) * 3.2, E.z + Math.cos(a) * 3.2, E); lt.quietEagle(); }
    function finish(won, far) {
      var lt = Lt(), S = lt.S, h = hawk(), r = hr(h), t = A.tier, first = won && !(r.won[t] || 0);
      A.ph = 'sit'; if (!A.sitAt) sitHawk(); lt.quietEagle();
      if (won) { A.wins++; r.won[t] = (r.won[t] || 0) + 1; var pay = payOf(t, first); r.paid = (r.paid || 0) + pay.coins; S.runes = (S.runes || 0) + pay.runes; lt.save();
        A.res = { won: true, first: first, tier: t, pay: pay, me: A.mine, hawkAt: A.hawkAt, L: +A.L.toFixed(1) };
        var lines = (t === TIERS.length - 1 && !first ? W.winTop : W.win).slice(); if (first && S.chick && S.chick.stats) lines = lines.concat(W.gift);
        lt.say(lines, function () {
          lt.coin(pay.coins, 'the Hawk\'s race', S.pos); lt.xp(pay.xp, 'the Hawk\'s race');
          if (first && S.chick && S.chick.stats) { var w = lt.addStat(GIFT.stat, GIFT.n); lt.toast(W.giftToast + (w ? ' \u00b7 ' + w : ''), 4200); A.gifts = (A.gifts || 0) + 1; }
          if (first && t + 1 < TIERS.length) setTimeout(function () { lt.toast(W.tierUp(t + 2) + ((S.level || 1) < TIERS[t + 1].lv ? ' From level ' + TIERS[t + 1].lv + '.' : ''), 3600); }, 4600);
          lt.hud(); });
      } else { A.loses++; A.res = { won: false, tier: t, me: +A.myT.toFixed(1), L: +A.L.toFixed(1), far: !!far };
        var paid = function () { lt.coin(LOSE.coins, 'the Hawk\'s race', S.pos); lt.xp(LOSE.xp, 'the Hawk\'s race'); lt.hud(); };
        if (far) { lt.toast(W.farToast, 4200); paid(); } else lt.say(W.lose, paid); }
    }
    function tick(dt, real) {
      try { if (Lt().classic()) return; letterTick(real || dt); hawkTick(real || dt); } catch (e) { A.err = String(e && e.message || e); }
    }
    A.late = (function () { try { return lateFile(); } catch (e) { A.err = String(e && e.message || e); return false; } })();
    (function () { var r0 = rec(); if (r0 && !r0.closed) r0.closed = 1; })();   /* a reload with the letter open: it was read; the arrow goes on */
    return {
      tick: tick, goal: goal, pill: pill, mark: mark, late: function () { return A.late; },
      holdsHawk: function () { return !!(A.ph === 'count' || A.ph === 'run' || A.ph === 'wait' || A.ph === 'after' || A.ph === 'sit'); },
      busy: function () { return !!(A.ph === 'count' || A.ph === 'run' || A.ph === 'wait' || A.ph === 'after' || A.ph === 'ask' || (A.ph === 'sit' && Lt().S.talking)); },
      racing: function () { return A.ph === 'run' || A.ph === 'wait' || A.ph === 'count'; },
      letterOpen: function () { return !!A.letter; },
      show: function () { return showLetter(); }, close: closeLetter, ask: function () { if (A.ph) return false; ask(); return true; }, answer: answer,
      rows: rowsNow, tierNow: function () { var lt = Lt(); return tierOf(lt.S.level || 1, hr(hawk())); },
      peek: function () { var r = rec(), h = hawk(); return { late: A.late, shown: A.shown, letter: !!A.letter, rows: A.rows.slice(), rec: r ? JSON.parse(JSON.stringify(r)) : null, arrow: arrowRow(), pill: pill(), ph: A.ph, t: A.t, s: +A.s.toFixed(1), L: +A.L.toFixed(1), v: +A.v.toFixed(2), tier: A.tier, asks: A.asks, races: A.races, wins: A.wins, loses: A.loses, res: A.res || null, last: A.last, race786: h ? hr(h) : null, gifts: A.gifts || 0, arrows: A.arrows, err: A.err, ask: !!document.getElementById('hawk786') }; }
    };
  }
  API.create = create; API.TIERS = TIERS; API.ROWS = ROWS; API.LATE_ROWS = LATE_ROWS; API.W = W; API.K = K; API.tierOf = tierOf; API.paceOf = paceOf; API.payOf = payOf; API.hr = hr; API.LOSE = LOSE; API.GIFT = GIFT;
  return API;
})();
