/* up829.js - BOARD 829 LINK 1, HER DROPS BUY HER OWN WINGS (Wings for Rouge). Nov 15 2026. Guard: tests/up829.js.
   LOOP_MAP_829.md, the links redrawn from COO: "The skins, shells, scales and teeth from every beaten animal become the price of upgrades to what she already
   does: longer Flutter, a faster Zoom burst, a wider glimmer that finds things, steadier wings in the wind ... They're sold by Beandie". COO's lesson: every
   reward buys a better version of the thing she just did; nothing is paid "into a bag".
   WHAT SHE SEES (Standard only; Classic is frozen and never makes it):
     - at Beandie's counter (the hermits' hall, his shop: hermits.js) the game's own Talk button says "🪽 Upgrades"; a thumb opens one sheet: her bag (the drops
       of craft787: snake skins, crab shells, long feathers, silver scales, shark teeth) and her upgrade tokens (the Doctor Bird pays the first, 766), and five
       rows, each a thing she already does, its level as pips, what the next level does in play, its price, and Make. A drop a recipe of her Craft still needs
       (the cloak, the spur, the fins) is kept for it and never spent here (the Blue Hole first).
     - Make: the sheet closes and a small framed moment (cine.js's item-get) holds the upgrade up with one line: what it does now and what feeds the next.
   THE FIVE (three levels each; every number and name a DRAFT for his pen):
     flutter  Longer Flutter       Quick Flutter lasts a quarter longer a level (1.8 s -> 2.25, 2.7, 3.15)
     zoom     Faster Zoom          Zoom's burst a tenth faster a level
     glimmer  Wider glimmer        out in the world the fruit glimmers are found a third farther a level, and shine bigger (stamina832)
     steady   Steadier wings       a hit's knock-back a quarter shorter a level (and the storm's: the same push)
     stamina  Bigger wings         her stamina bar 20 more a level (832: 100 -> 120, 140, 160)
   SAVED in S.up829 (additive, the key 766 opened for the tokens): { tokens, from, lv: { id: n }, spent: { drop: n } }, written only when she buys.
   COST: DOM only (the sheet is built here at load, hidden); the moment is cine.js's own. Nothing in the scene, no shader. */
window.WFR_UP829 = (function () {
  'use strict';
  var MAX_LV = 3;
  var UP = [
    { id: 'flutter', e: '\u{1FAB6}', name: 'Longer Flutter', does: function (n) { return 'Quick Flutter lasts ' + Math.round(25 * n) + '% longer'; }, feeds: 'More burst to reach a far glimmer or slip a hit.',
      cost: [{ feather: 2, scale: 1 }, { feather: 3, scale: 2 }, { feather: 4, scale: 3 }] },
    { id: 'zoom', e: '\u{1F4A8}', name: 'Faster Zoom', does: function (n) { return 'Zoom bursts ' + Math.round(10 * n) + '% faster'; }, feeds: 'Faster home with your drops, faster out again.',
      cost: [{ tooth: 1, scale: 2 }, { tooth: 2, scale: 3 }, { tooth: 3, scale: 4 }] },
    { id: 'glimmer', e: '\u{2728}', name: 'Wider glimmer', does: function (n) { return 'Fruit glimmers found ' + Math.round(33 * n) + '% farther, and brighter'; }, feeds: 'More fruit on long trips: more stamina, farther flights.',
      cost: [{ shell: 2, feather: 1 }, { shell: 3, feather: 2 }, { shell: 4, feather: 3 }] },
    { id: 'steady', e: '\u{1F343}', name: 'Steadier wings', does: function (n) { return 'Hits knock you back ' + Math.round(25 * n) + '% less'; }, feeds: 'Stand your ground against the strong ones out there.',
      cost: [{ snakeskin: 2, shell: 1 }, { snakeskin: 3, shell: 2 }, { snakeskin: 4, shell: 3 }] },
    { id: 'stamina', e: '\u{1FABD}', name: 'Bigger wings', does: function (n) { return 'Stamina bar ' + (100 + 20 * n) + ' (from 100)'; }, feeds: 'Longer flights between perches and fruit.',
      cost: [{ token: 1 }, { snakeskin: 2, tooth: 1 }, { snakeskin: 3, tooth: 2 }] }
  ];
  var MATS = { snakeskin: ['\u{1F40D}', 'snake skin', 'snake skins'], shell: ['\u{1F980}', 'crab shell', 'crab shells'], feather: ['\u{1FAB6}', 'long feather', 'long feathers'],
    scale: ['\u{1F41F}', 'silver scale', 'silver scales'], tooth: ['\u{1F988}', 'shark tooth', 'shark teeth'], token: ['\u{1F3C5}', 'upgrade token', 'upgrade tokens'] };
  var W = { title: 'Beandie\'s upgrades', sub: 'What the animals leave, made into better wings. Beat animals out in the world for more.', kept: ' kept for your Craft', max: 'Top level', make: 'Make', close: 'Close',
    poor: 'Still to find: ', over: 'Beandie made it', label: '\u{1FAB6} Upgrades', none: 'Bring me what the animals leave: skins, shells, feathers, scales, teeth.' };
  function upOf(id) { for (var i = 0; i < UP.length; i++) if (UP[i].id === id) return UP[i]; return null; }
  function rec(S, make) { var u = S.up829; if (!u || typeof u !== 'object') { if (!make) return null; u = S.up829 = {}; } if (make) { u.lv = u.lv && typeof u.lv === 'object' ? u.lv : {}; u.spent = u.spent && typeof u.spent === 'object' ? u.spent : {}; } return u; }
  function level(S, id) { var u = rec(S, false); return u && u.lv ? Math.max(0, Math.min(MAX_LV, u.lv[id] | 0)) : 0; }
  /* what each upgrade does, as a factor the game reads (pure) */
  function k(S, id) { var n = level(S, id); return id === 'flutter' ? 1 + 0.25 * n : id === 'zoom' ? 1 + 0.1 * n : id === 'glimmer' ? 1 + 0.33 * n : id === 'steady' ? 1 - 0.25 * n : id === 'stamina' ? 1 + 0.2 * n : 1; }
  function bagOf(S) { var c = S.seen && S.seen.craft787; return c && c.bag && typeof c.bag === 'object' ? c.bag : {}; }
  /* a drop a recipe of the Craft still needs is kept for it (craft787's RECIPES, by what she has made) */
  function keptOf(S) { var out = {}, C = window.WFR_CRAFT787, made = (S.seen && S.seen.craft787 && S.seen.craft787.made) || {}; if (!C || !C.RECIPES) return out;
    C.RECIPES.forEach(function (r) { if (made[r.id] || (C.shown && !C.shown(r, S.seen && S.seen.craft787))) return; for (var m in r.need) out[m] = (out[m] || 0) + r.need[m]; }); return out; }   /* 829 link 3: a recipe not yet shown (the Scute shield, before her first scute) keeps nothing */
  function spare(S, m) { if (m === 'token') { var u = rec(S, false); return u ? Math.max(0, u.tokens | 0) : 0; } return Math.max(0, (bagOf(S)[m] | 0) - (keptOf(S)[m] | 0)); }
  function priceOf(S, id) { var U = upOf(id), n = level(S, id); return U && n < MAX_LV ? U.cost[n] : null; }
  function lacks(S, id) { var p = priceOf(S, id), out = []; if (!p) return out; for (var m in p) if (spare(S, m) < p[m]) out.push({ m: m, more: p[m] - spare(S, m) }); return out; }
  function buy(S, id) {
    var U = upOf(id), p = priceOf(S, id); if (!U || !p || lacks(S, id).length) return false;
    var u = rec(S, true), bag = bagOf(S);
    for (var m in p) { if (m === 'token') u.tokens = (u.tokens | 0) - p[m]; else bag[m] = (bag[m] | 0) - p[m]; u.spent[m] = (u.spent[m] | 0) + p[m]; }
    u.lv[id] = (u.lv[id] | 0) + 1; return u.lv[id];
  }

  function create(io) {
    if (!io || io.classic()) return null;
    var err = null, stat = { opens: 0, buys: 0, refused: 0, moments: 0 };
    function S() { return io.S(); }
    var css = document.createElement('style'); css.id = 'up829css';
    css.textContent = '#up829{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);transform:translateX(-50%);width:min(440px,calc(100vw - 24px));max-height:min(78vh,660px);box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;z-index:44;background:#fff8ea;color:#3b2a1a;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.35);padding:14px 14px 10px;font-family:var(--body,system-ui)}' +
      '#up829[hidden]{display:none}#up829 h3{margin:0;font:600 22px Georgia,serif}#up829 .sub{margin:2px 0 8px;font:600 12.5px/1.3 var(--body,system-ui);color:#7a5a3a}#up829 .bag{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}#up829 .bag span{font:700 12.5px var(--body,system-ui);background:#fbeccb;border-radius:10px;padding:4px 8px}#up829 .bag span.dim{opacity:.45}' +
      '#up829 .rows{flex:1 1 auto;min-height:0;overflow:auto}#up829 .row{display:flex;align-items:flex-start;gap:10px;padding:9px 4px;border-top:1px solid rgba(60,40,20,.1)}#up829 .row .e{font-size:28px;width:38px;text-align:center}#up829 .row .t{flex:1;min-width:0}' +
      '#up829 .row b{display:block;font:700 15px var(--body,system-ui)}#up829 .pips{color:#c8314a;letter-spacing:2px;font-size:12px}#up829 .row small{display:block;font:600 12px/1.3 var(--body,system-ui);color:#7a5a3a;margin-top:2px}#up829 .cost{font:700 12px var(--body,system-ui);color:#3f6b4a;margin-top:3px}#up829 .cost.no{color:#a0522d}' +
      '#up829 .row button{min-width:78px;min-height:44px;border-radius:14px;border:0;background:#3f8f5a;color:#fff;font:800 14px var(--body,system-ui);align-self:center}#up829 .row button[disabled]{background:#cbbfa8;color:#fff8ea}' +
      '#up829 .close{display:block;width:100%;margin-top:8px;min-height:44px;border-radius:14px;border:2px solid rgba(60,40,20,.2);background:#fff;font:800 14px var(--body,system-ui);color:#3b2a1a}';
    document.head.appendChild(css);
    var el = document.createElement('div'); el.id = 'up829'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', W.title); document.body.appendChild(el);   /* built at load */
    function pips(n) { var s = ''; for (var i = 0; i < MAX_LV; i++) s += i < n ? '●' : '○'; return s; }
    function matTxt(m, n) { var M = MATS[m]; return M[0] + ' ' + n + ' ' + (n === 1 ? M[1] : M[2]); }
    function html() {
      var s = S(), kept = keptOf(s), bag = ['snakeskin', 'shell', 'feather', 'scale', 'tooth', 'token'].map(function (m) { var n = spare(s, m), kp = m === 'token' ? 0 : Math.min(bagOf(s)[m] | 0, kept[m] | 0);
        return '<span class="' + (n ? '' : 'dim') + '" data-m="' + m + '">' + matTxt(m, n) + (kp ? ' <i>(+' + kp + W.kept + ')</i>' : '') + '</span>'; }).join('');
      var rows = UP.map(function (U) { var n = level(s, U.id), p = priceOf(s, U.id), lk = lacks(s, U.id);
        var cost = p ? Object.keys(p).map(function (m) { return MATS[m][0] + ' ' + Math.min(spare(s, m), p[m]) + '/' + p[m]; }).join(' · ') : '';
        return '<div class="row" data-up="' + U.id + '"><div class="e">' + U.e + '</div><div class="t"><b>' + U.name + ' <span class="pips">' + pips(n) + '</span></b><small>' + (p ? 'Next: ' + U.does(n + 1) + '. ' + U.feeds : 'Now: ' + U.does(n) + '.') + '</small>' +
          (p ? '<div class="cost' + (lk.length ? ' no' : '') + '">' + cost + (lk.length ? '<br>' + W.poor + lk.map(function (q) { return matTxt(q.m, q.more); }).join(', ') : '') + '</div>' : '<div class="cost">' + W.max + '</div>') + '</div>' +
          '<button type="button" data-up829="make" data-id="' + U.id + '"' + (!p || lk.length ? ' disabled' : '') + '>' + (p ? W.make : '✓') + '</button></div>'; }).join('');
      return '<h3>' + W.title + '</h3><p class="sub">' + W.sub + '</p><div class="bag">' + bag + '</div><div class="rows">' + rows + '</div><button type="button" class="close" data-up829="close">' + W.close + '</button>';
    }
    function open() { try { if (S().talking) return false; el.innerHTML = html(); el.hidden = false; stat.opens++; return true; } catch (e) { err = 'open: ' + (e && e.message || e); return false; } }
    function close() { el.hidden = true; }
    function isOpen() { return !el.hidden; }
    function make(id) {
      var s = S(), U = upOf(id), n = buy(s, id); if (!n) { stat.refused++; if (isOpen()) el.innerHTML = html(); return false; }
      stat.buys++; try { io.save(); io.hud(); } catch (e) { /* fine */ } close();
      var line = U.does(n) + '. ' + U.feeds + (n < MAX_LV ? '' : ' (its top level)');
      try { if (io.moment(U.e, U.name + ' ' + ['', 'I', 'II', 'III'][n], line, W.over)) stat.moments++; else io.toast(U.e + ' ' + U.name + ': ' + line, 4200); } catch (e) { err = 'moment: ' + (e && e.message || e); }
      try { io.changed(id); } catch (e) { /* fine */ }
      return n;
    }
    el.addEventListener('click', function (e) { var t = e.target && e.target.closest ? e.target.closest('[data-up829]') : null; if (!t) return; e.preventDefault(); e.stopPropagation();
      var w = t.getAttribute('data-up829'); if (w === 'close') close(); else if (w === 'make') make(t.getAttribute('data-id')); });
    function peek() { var s = S(), u = rec(s, false); return { err: err, open: isOpen(), text: isOpen() ? el.textContent : '', up: u ? JSON.parse(JSON.stringify(u)) : null, lv: UP.reduce(function (o, U) { o[U.id] = level(s, U.id); return o; }, {}),
      k: UP.reduce(function (o, U) { o[U.id] = +k(s, U.id).toFixed(3); return o; }, {}), spare: ['snakeskin', 'shell', 'feather', 'scale', 'tooth', 'token'].reduce(function (o, m) { o[m] = spare(s, m); return o; }, {}), kept: keptOf(s), stat: Object.assign({}, stat) }; }
    return { open: open, close: close, isOpen: isOpen, make: make, peek: peek, k: function (id) { return k(S(), id); }, label: W.label };
  }
  return { UP: UP, MATS: MATS, W: W, MAX_LV: MAX_LV, k: k, level: level, spare: spare, keptOf: keptOf, priceOf: priceOf, lacks: lacks, buy: buy, create: create };
}());
