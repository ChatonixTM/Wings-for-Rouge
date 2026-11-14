/* hud795.js - 795 THE PLAY SCREEN, REBUILT (board 795; with 793's buttons and 792's hold). Standard only: Classic is frozen (board 645).
   Marth, Nov 13 2026, verbatim: "Everything is higher standard. Writing. Fonts animations, effects, transitions. Loading screens, game play" /
   "Whole UI needs improvement ... add everything that's missing and do it better than him, if needed." / "You should be able to tap the map from now on and forever more".
   793, his drawing (refs-1111/buttons-moved-793.jpg): Zoom to the LEFT edge, Land to the LEFT, Attack UP beside Flap, Flutter up and RIGHT, Flap stays bottom right.
   Study, never copy (COO, coo.mx; refs-1111/coo-site/COO_STUDY_795.md): we take the craft (a compass strip, a job card, a framed round map with its place
   tab, buttons that say their cost, a pause page that teaches every mark, settings as tiles); never its art, words or fonts. THE LOOK is the house's
   (Marth, Nov 13: 'Take from bait and nuke or The face as inspiration'; refs-1111/coo-site/OUR_LOOK_THE_STORYBOOK_795.md): night glass, a 1 px glow, Rouge red, signal mint, gold, Space Grotesk + Mono.

   WHAT IT DOES (all of it on the game's own elements, so every tap, id and word the game and its guards know stays where it was):
     1 THE COMPASS STRIP   a paper ribbon across the top: the letters turn with her view, a gold diamond on her goal, a red pin on the mark she placed
     2 THE JOB CARD        the level card as paper: the level a red stamp, the job in the card's words, the XP an inked bar along its foot
     3 THE ROUND MAP       the radar in a paper frame: the real island under the dots (the chart's own pixels, turned with her view), the place
                           name on a tab over the frame (735b's words, moved, not copied), the distance on an ink tag
     4 THE BUTTONS         793's layout; each a painted disc with an ink ring and a paper tag; Flutter and Attack show their rest as a wedge and seconds
     5 THE CARDS           toasts, the hint, the XP pop and the reason line (789's pace) as paper that slams in and settles
     6 THE PAUSE PAGE      where she is (place, part of day, weather), the job, numbered cards, the settings as drawn tiles, and every mark taught
     7 THE MAPS            the island chart and the world map framed as paper, with a legend under the chart
   The page creates it once (WFR_HUD795.create(api)); it runs its own animation frame (the strip and the round map), its own 10 Hz tick (the rests) and
   reads the rest from the DOM. Every word on screen here is a DRAFT for Marth's pen. */
(function () {
  'use strict';
  if (window.WFR_HUD795) return;
  var NS = 'http://www.w3.org/2000/svg', PI = Math.PI, D2R = PI / 180;
  var KEY = 'wfr.hud795';   /* this module's own settings: { size: 's'|'m'|'l', hand: 'r'|'l' } (never wfr.save) */

  function $(id) { return document.getElementById(id); }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function svgUrl(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }
  function vis(e) { return !!(e && !e.hidden && e.isConnected && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'); }
  function load() { var o = {}; try { o = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { o = {}; }
    return { size: /^[sml]$/.test(o.size) ? o.size : 'm', hand: o.hand === 'l' ? 'l' : 'r', tod: typeof o.tod === 'string' ? o.tod : 'nat', wx: typeof o.wx === 'string' ? o.wx : 'nat', pass: o.pass !== false, month: +o.month || 0 }; }
  /* the sky picker's tiles: [key, word, icon, clock] (S.clock runs 0-2700: dawn to 150, day to 1800, dusk to 2100, then night); weather [key, word, icon, force, level] */
  var TOD = [['nat', 'Natural', 'partsun'], ['dawn', 'Dawn', 'sun', 70], ['morning', 'Morning', 'sun', 450], ['midday', 'Midday', 'sun', 950], ['afternoon', 'Afternoon', 'partsun', 1450], ['dusk', 'Dusk', 'partsun', 1950], ['night', 'Night', 'night', 2350]];
  var WXK = [['nat', 'Natural', 'partsun'], ['clear', 'Clear', 'sun', 'clear', null], ['drizzle', 'Drizzle', 'cloud', 'rain', 'drizzle'], ['rain', 'Rain', 'rain', 'rain', 'rain'], ['pour', 'Downpour', 'rain', 'rain', 'pour'], ['storm', 'Storm', 'storm', 'storm', null]];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var SEASON_C = { winter: '#e8f1f7', spring: '#9fdc8a', summer: '#4b8f3b', autumn: '#e8613a' };
  function seasonOf(m) { return m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn'; }
  function store(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode: this visit only */ } }

  /* ---------------- 4: where each button sits, portrait (793). b = px from the bottom, capped at a share of the height (k, in vh) so a short phone
     keeps them clear of the top row; s = the button's side. 'r' sits from the right edge, 'l' from the left; the left hand mirrors them all. ---------------- */
  var LAY = {
    flap:     { side: 'r', x: 14, b: 24,  k: 2.8,  s: 90 },
    atkBtn:   { side: 'r', x: 74, b: 146, k: 17.3, s: 56 },
    flutter:  { side: 'r', x: 14, b: 254, k: 30,   s: 56 },
    jump:     { side: 'r', x: 14, b: 254, k: 30,   s: 56 },
    nightBtn: { side: 'r', x: 14, b: 352, k: 41.7, s: 52 },
    land:     { side: 'l', x: 14, b: 254, k: 30,   s: 56 },
    read:     { side: 'l', x: 14, b: 254, k: 30,   s: 56 },
    home:     { side: 'l', x: 14, b: 330, k: 39,   s: 54 },
    thBtn:    { side: 'l', x: 14, b: 330, k: 39,   s: 54 },
    sing:     { side: 'l', x: 14, b: 330, k: 39,   s: 54 },
    zoom:     { side: 'l', x: 14, b: 404, k: 47.4, s: 52 }
  };
  var SIZE = { s: 0.86, m: 1, l: 1.14 };
  /* the disc's paint per button: [lit, mid, deep] */
  var PAINT = {
    flap: ['#ff8a8f', '#d8394f', '#7d1029'], atkBtn: ['#ffb27a', '#dd6a33', '#86300f'], flutter: ['#8fe0e6', '#25a0ad', '#0f5560'], jump: ['#8fe0e6', '#25a0ad', '#0f5560'],
    land: ['#ffe08a', '#e9a92e', '#8c5a08'], read: ['#ffe08a', '#e9a92e', '#8c5a08'], zoom: ['#b6e88e', '#4f9e3e', '#1f5418'], nightBtn: ['#8f94e8', '#43479e', '#1b1d52'],
    home: ['#f6b9d8', '#c2558f', '#62173f'], thBtn: ['#f6c79a', '#c47a3c', '#653310'], sing: ['#f6b9d8', '#c2558f', '#62173f']
  };
  /* what each one costs or asks, in a word or two, under its name (the rest's seconds replace it while it rests) */
  var COST = { flap: '', flutter: '4 s', jump: '', atkBtn: '', land: '', read: '', zoom: 'burst', nightBtn: '', home: '', thBtn: '', sing: '' };

  function layoutCss(hand, size) {
    var sc = SIZE[size] || 1, out = '', sel = 'html.ui716.hud795:not(.c712b) body:not(:has(#hit703:not([hidden]))) #ui ';
    Object.keys(LAY).forEach(function (id) {
      var L = LAY[id], side = hand === 'l' ? (L.side === 'r' ? 'left' : 'right') : (L.side === 'r' ? 'right' : 'left'), other = side === 'right' ? 'left' : 'right', s = Math.round(L.s * sc);
      out += sel + '#' + id + '{' + side + ':calc(env(safe-area-inset-' + side + ',0px) + ' + L.x + 'px)!important;' + other + ':auto!important;top:auto!important;' +
        'bottom:calc(env(safe-area-inset-bottom,0px) + min(' + L.b + 'px,' + L.k + 'vh))!important;width:' + s + 'px!important;height:' + s + 'px!important}';
    });
    return '@media (orientation:portrait){' + out + '}';
  }

  /* ---------------- the stylesheet (one; the layout's part is swapped when a setting changes) ---------------- */
  var P = 'html.ui716.hud795 ';   /* every rule is scoped to Standard with this module on */
  function sheet() {
    /* THE HOUSE STYLE (Marth, Nov 13: "Take from bait and nuke or The face as inspiration"): night glass, a 1 px glowing line, Rouge red the hero,
       signal mint for go / ready / your path, gold for rewards; Space Grotesk headlines, Space Mono data, letter-spaced caps eyebrows, the Face's outlined pills. */
    var glass = 'background:var(--h7-glass)!important;background-image:radial-gradient(120% 80% at 20% 0%,rgba(110,168,255,.08),rgba(110,168,255,0) 60%)!important;' +
      'border:1px solid var(--h7-line)!important;box-shadow:0 0 0 1px rgba(0,0,0,.35),0 0 22px -8px var(--h7-glow),inset 0 0 22px rgba(110,168,255,.05),0 10px 24px rgba(0,0,0,.38)!important;' +
      '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:var(--h7-ink)!important;text-shadow:none!important;';
    var eyebrow = 'font:700 10px/1.2 var(--h7-mono)!important;letter-spacing:.22em!important;text-transform:uppercase;color:var(--h7-mint)!important;';
    var pill = 'border:1px solid var(--h7-line2)!important;border-radius:999px!important;background:rgba(10,13,24,.72)!important;color:var(--h7-ink)!important;text-shadow:none!important;';
    return '' +
    ':root{--h7-glass:rgba(12,16,28,.82);--h7-glass2:rgba(8,11,20,.9);--h7-line:rgba(120,150,220,.26);--h7-line2:rgba(150,170,230,.34);--h7-glow:rgba(77,232,201,.45);' +
      '--h7-ink:#e9edf8;--h7-dim:#95a0bd;--h7-muted:#5f6a86;--h7-red:#ff3b42;--h7-red2:#c8314a;--h7-mint:#4de8c9;--h7-gold:#ffd45c;--h7-amber:#ffb454;--h7-blue:#6ea8ff;--h7-violet:#b48cff;' +
      '--h7-head:var(--u7-head,"Space Grotesk","U795 Head",system-ui,-apple-system,"Segoe UI",sans-serif);--h7-mono:var(--u7-mono,"Space Mono","U795 Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace);' +
      '--h7-body:var(--u7-body,"Space Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif);--h7-top:max(env(safe-area-inset-top,0px),4px)}' +
    '@keyframes up795{0%{opacity:0;translate:0 8px;filter:drop-shadow(0 0 0 rgba(77,232,201,0))}55%{opacity:1;filter:drop-shadow(0 0 10px rgba(77,232,201,.55))}100%{opacity:1;translate:none;filter:none}}' +
    '@keyframes pulse795{0%{box-shadow:0 0 0 0 rgba(255,212,92,.6)}100%{box-shadow:0 0 0 14px rgba(255,212,92,0)}}' +

    /* ===== 1 THE COMPASS STRIP ===== */
    '#cmp795{position:fixed;left:50%;top:calc(var(--h7-top) + 2px);width:min(214px,calc(100vw - 150px));height:24px;margin-left:calc(min(214px,calc(100vw - 150px)) / -2);z-index:3;pointer-events:none;box-sizing:border-box;' +
      'border-radius:12px;' + glass + 'background-image:linear-gradient(90deg,rgba(8,11,20,.9),rgba(8,11,20,0) 22%,rgba(8,11,20,0) 78%,rgba(8,11,20,.9))!important;overflow:hidden}' +
    '#cmp795 .tape{position:absolute;left:0;top:1px;height:100%;will-change:transform}' +
    '#cmp795 .tape svg{display:block;height:20px}' +
    '#cmp795 i{position:absolute;top:3px;width:12px;height:12px;margin-left:-6px;will-change:transform;transition:opacity .25s}' +
    '#cmp795 i.goal{background:var(--h7-gold);box-sizing:border-box;border:1px solid #fff3c4;transform:rotate(45deg) scale(.8);top:5px;box-shadow:0 0 8px rgba(255,212,92,.9)}' +
    '#cmp795 i.goal.edge{opacity:.5}' +
    '#cmp795 i.pin{width:10px;height:10px;top:6px;margin-left:-5px;border-radius:50%;background:var(--h7-red);box-shadow:0 0 0 2px rgba(255,59,66,.35),0 0 8px rgba(255,59,66,.9)}' +
    '#cmp795 i.way{width:10px;height:10px;top:6px;margin-left:-5px;border-radius:50%;background:transparent;border:2px solid var(--h7-mint);box-sizing:border-box;box-shadow:0 0 8px var(--h7-glow)}' +
    '#cmp795 s{position:absolute;left:50%;bottom:0;margin-left:-6px;width:12px;height:2px;border-radius:2px;background:var(--h7-mint);box-shadow:0 0 6px var(--h7-glow)}' +
    'html.talk782 #cmp795,html.c712 #cmp795{opacity:0}' +

    /* ===== 2 THE JOB CARD ===== */
    P + '#ui #lvPill{position:fixed!important;left:calc(env(safe-area-inset-left,0px) + 12px)!important;top:calc(var(--h7-top) + 36px)!important;margin:0!important;' +
      'width:min(270px,calc(100vw - 136px))!important;min-height:66px;box-sizing:border-box;padding:18px 10px 12px 56px!important;border-radius:14px!important;' + glass + '}' +
    P + '#ui #lvPill::before{content:var(--tab795,"Up next");position:absolute;left:56px;right:10px;top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' + eyebrow + 'font-size:9px!important;letter-spacing:.2em!important}' +
    P + '#ui #lvText{left:7px!important;top:50%!important;width:42px!important;height:42px!important;margin-top:-21px!important;padding:8px 0 0!important;box-sizing:border-box;' +
      'border:1.5px solid var(--h7-gold)!important;border-radius:50%!important;font:700 17px/.95 var(--h7-head)!important;color:#fff!important;text-shadow:none!important;' +
      'background:radial-gradient(circle at 50% 35%,rgba(255,59,66,.45),rgba(10,13,24,.92) 72%)!important;box-shadow:0 0 12px rgba(255,212,92,.45),inset 0 0 8px rgba(255,212,92,.25)!important}' +
    P + '#ui #lvText::first-line{font:700 8px/1 var(--h7-mono)!important;letter-spacing:.2em;color:var(--h7-gold)}' +
    P + '#ui #lvPill .bar{position:absolute!important;left:56px;right:12px;bottom:6px;height:3px!important;margin:0!important;border-radius:2px!important;background:rgba(255,255,255,.1)!important;box-shadow:none!important;overflow:hidden}' +
    P + '#ui #lvPill .bar i{border-radius:2px!important;background:linear-gradient(90deg,var(--h7-mint),#b9fff0)!important;box-shadow:0 0 8px var(--h7-glow)!important}' +
    P + '#ui #lvPill .bar::after{display:none!important}' +
    P + '#ui #quest{font:600 14px/1.22 var(--h7-head)!important;color:var(--h7-ink)!important;text-shadow:none!important;letter-spacing:0;-webkit-line-clamp:3!important;line-clamp:3}' +
    P + '#ui #quest::after{color:var(--h7-mint)!important}' +
    P + '#ui #navHud{margin-top:4px;font:400 11px/1.25 var(--h7-mono)!important;color:var(--h7-dim)!important;text-shadow:none!important;letter-spacing:.02em}' +

    /* ===== 3 THE ROUND MAP: a glowing ring, the island under the dots, the place on a pill ===== */
    P + '#ui #mapBtn705{position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 12px)!important;top:calc(var(--h7-top) + 40px)!important;left:auto!important;margin:0!important;' +
      'width:104px!important;height:104px!important;padding:0!important;display:block!important;box-sizing:border-box;border-radius:50%!important;border:1.5px solid var(--h7-mint)!important;' +
      'background:repeating-conic-gradient(from -1deg,rgba(77,232,201,.55) 0 2deg,transparent 2deg 30deg) center/100% 100%,radial-gradient(circle,rgba(10,13,24,.6) 60%,rgba(10,13,24,.92) 100%)!important;' +
      'box-shadow:0 0 0 3px rgba(10,13,24,.75),0 0 18px rgba(77,232,201,.45),inset 0 0 14px rgba(77,232,201,.25)!important;filter:none!important;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    P + '#ui #mapBtn705::before,' + P + '#ui #mapBtn705::after{display:none!important}' +
    P + '#ui #mapBtn705 .arrow{position:absolute!important;left:50%!important;top:50%!important;width:86px!important;height:86px!important;margin:-43px 0 0 -43px!important;border-radius:50%;overflow:hidden;' +
      'background:#0b1a24!important;box-shadow:inset 0 0 0 1px rgba(77,232,201,.35),inset 0 0 12px rgba(0,0,0,.6)!important;border:0!important;padding:0!important}' +
    P + '#ui #mapBtn705 #mm795,' + P + '#ui #mapBtn705 #radar{position:absolute!important;left:0!important;top:0!important;width:86px!important;height:86px!important;margin:0!important;border-radius:50%}' +
    P + '#ui #mapBtn705 #radar{background:none!important;box-shadow:none!important}' +
    P + '#ui #mapBtn705 #arrowSvg{position:absolute!important;left:50%!important;top:50%!important;width:24px!important;height:24px!important;margin:-12px 0 0 -12px!important;filter:drop-shadow(0 0 4px rgba(255,59,66,.9))}' +
    P + '#ui #mapBtn705 #arrowSvg path{stroke:#fff;stroke-width:1.2px;stroke-linejoin:round;fill:var(--h7-red)}' +
    P + '#ui #mapBtn705 #dist{position:absolute!important;left:50%!important;bottom:-11px!important;top:auto!important;transform:translateX(-50%);margin:0!important;white-space:nowrap;' +
      'padding:1px 9px!important;min-width:0!important;' + pill + 'font:700 11px/16px var(--h7-mono)!important;letter-spacing:.04em;box-shadow:0 0 10px -2px var(--h7-glow)!important}' +
    P + '#ui #mapBtn705 #dist::before{display:none!important}' +
    P + '#ui #wordsTop735{position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 4px)!important;left:auto!important;top:calc(var(--h7-top) + 29px)!important;width:auto!important;max-width:124px!important;height:auto!important;' +
      'max-height:30px;box-sizing:border-box;padding:2px 9px!important;overflow:hidden!important;white-space:normal!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;' +
      'text-align:center!important;' + pill + 'font:700 9px/12px var(--h7-mono)!important;letter-spacing:.12em!important;text-transform:uppercase;box-shadow:0 0 10px -3px var(--h7-glow);z-index:4;pointer-events:none}' +
    P + '#ui #wordsTop735:empty,' + P + '#ui #wordsTop735[hidden]{display:none!important}' +

    /* the round buttons under the map: dark glass discs with a glowing rim (the game's own white glyphs) */
    P + '#ui .hud .side{position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 12px)!important;top:calc(var(--h7-top) + 160px)!important;left:auto!important;margin:0!important;' +
      'display:flex!important;flex-direction:column!important;gap:9px!important;width:auto!important}' +
    P + '#ui .hud .side .round,' + P + '#questsBtn720{width:44px!important;height:44px!important;border:1.5px solid var(--h7-line2)!important;border-radius:50%!important;' +
      'background:var(--u-g,none) center/20px 20px no-repeat,radial-gradient(circle at 50% 30%,rgba(110,168,255,.22),rgba(10,13,24,.9) 70%)!important;box-shadow:0 0 12px -3px rgba(110,168,255,.6),inset 0 0 8px rgba(110,168,255,.15)!important;filter:none!important}' +
    P + '#ui .hud .side .round{position:static!important}' +
    P + '#ui .hud .side #birdsBtn{border-color:rgba(255,59,66,.7)!important;box-shadow:0 0 12px -2px rgba(255,59,66,.7),inset 0 0 8px rgba(255,59,66,.2)!important}' +
    P + '#questsBtn720{border-color:rgba(255,212,92,.6)!important}' +

    /* ===== 4 THE BUTTONS: dark glass discs, a glowing rim in the action's colour, the label on an outlined pill, the rest as a ring ===== */
    P + '#ui :is(#flap,#flutter,#jump,#atkBtn,#land,#read,#home,#thBtn,#sing,#zoom,#nightBtn){border:1.5px solid var(--acc,var(--h7-mint))!important;' +
      'background:var(--u-g,none) center var(--u-gy,44%)/var(--u-gs,52%) auto no-repeat padding-box,radial-gradient(circle at 50% 28%,var(--accg,rgba(77,232,201,.28)),rgba(10,13,24,.88) 68%) padding-box!important;' +
      'box-shadow:0 0 16px -2px var(--accg,rgba(77,232,201,.5)),inset 0 0 12px var(--accg,rgba(77,232,201,.2)),0 6px 14px rgba(0,0,0,.45)!important;filter:none!important;opacity:1!important;transition:transform .12s ease,box-shadow .2s}' +
    P + '#ui :is(#flap,#flutter,#jump,#atkBtn,#land,#read,#home,#thBtn,#sing,#zoom,#nightBtn):active{transform:scale(.94);box-shadow:0 0 26px 2px var(--accg,rgba(77,232,201,.6))!important}' +
    P + '#ui #flap{--acc:var(--h7-red);--accg:rgba(255,59,66,.5)}' + P + '#ui :is(#flutter,#jump){--acc:var(--h7-mint);--accg:rgba(77,232,201,.45)}' +
    P + '#ui #atkBtn{--acc:var(--h7-amber);--accg:rgba(255,180,84,.45)}' + P + '#ui :is(#land,#read){--acc:var(--h7-gold);--accg:rgba(255,212,92,.42)}' +
    P + '#ui #zoom{--acc:var(--h7-blue);--accg:rgba(110,168,255,.45)}' + P + '#ui #nightBtn{--acc:var(--h7-violet);--accg:rgba(180,140,255,.45)}' + P + '#ui :is(#home,#thBtn,#sing){--acc:var(--h7-violet);--accg:rgba(180,140,255,.42)}' +
    P + '#ui :is(#flap,#flutter,#jump,#atkBtn,#land,#read,#home,#thBtn,#sing,#zoom)[data-l]::after,' + P + '#ui #nightBtn .u716rb{bottom:-12px!important;padding:2px 9px!important;min-width:0!important;' +
      'font:700 9.5px/1.2 var(--h7-head)!important;letter-spacing:.16em!important;text-transform:uppercase;' + pill + 'box-shadow:0 0 8px -2px var(--accg,rgba(77,232,201,.5))!important;clip-path:none!important;transform:translateX(-50%)!important}' +
    P + '#ui #flap[data-l]::after{font-size:10.5px!important;padding:2px 12px!important;bottom:-12px!important}' +
    P + '#ui :is(#flap,#flutter,#atkBtn,#zoom,#jump,#land)[data-l]::after{content:attr(data-l) var(--k795,"")!important;white-space:nowrap!important;text-align:center;line-height:1.2!important}' +
    'html.ui716.hud795:not(.lh795) #ui :is(#flutter,#jump,#nightBtn)[data-l]::after,html.ui716.hud795.lh795 #ui :is(#land,#read,#zoom,#home,#thBtn,#sing)[data-l]::after{left:auto!important;right:-6px!important;transform:none!important}' +
    'html.ui716.hud795:not(.lh795) #ui :is(#land,#read,#zoom,#home,#thBtn,#sing)[data-l]::after,html.ui716.hud795.lh795 #ui :is(#flutter,#jump,#nightBtn)[data-l]::after{left:-6px!important;right:auto!important;transform:none!important}' +
    /* the rest: a ring that empties round the disc, its seconds in mono */
    P + '#ui :is(#flutter,#atkBtn,#zoom)::before{content:var(--n795,"")!important;position:absolute!important;inset:-5px!important;z-index:1;border-radius:50%!important;pointer-events:none;display:grid!important;place-items:center;' +
      'background:conic-gradient(rgba(255,255,255,.12) calc(var(--f795,0) * 1turn),var(--acc,var(--h7-mint)) 0)!important;' +
      '-webkit-mask:radial-gradient(circle,transparent calc(50% - 4px),#000 calc(50% - 3.5px));mask:radial-gradient(circle,transparent calc(50% - 4px),#000 calc(50% - 3.5px));' +
      'opacity:var(--o795,0)!important;font:700 0px/1 var(--h7-mono)!important;width:auto!important;height:auto!important;margin:0!important;transform:none!important;border:0!important;box-shadow:none!important}' +
    P + '#ui :is(#flutter,#atkBtn,#zoom)[style*="--f795: 0."]::before{--o795:1}' +
    '.n795c{position:absolute;inset:0;display:grid;place-items:center;font:700 16px/1 var(--h7-mono);color:#fff;text-shadow:0 0 8px var(--accg,rgba(77,232,201,.8));pointer-events:none;z-index:2}' +
    P + '#ui #breath{height:6px!important;border:1px solid var(--h7-line2)!important;border-radius:4px!important;background:rgba(10,13,24,.8)!important;box-shadow:0 0 10px -2px rgba(110,168,255,.6)!important;overflow:hidden}' +
    P + '#ui #breathFill{background:linear-gradient(90deg,var(--h7-blue),var(--h7-mint))!important;border-radius:0!important;box-shadow:0 0 8px var(--h7-glow)}' +

    /* ===== 5 TOASTS, THE HINT, THE XP POP, THE REASON, THE LEVEL-UP ===== */
    P + '#ui #toast{top:calc(var(--h7-top) + 122px)!important;max-width:min(262px,calc(100% - 128px))!important;font:500 13.5px/1.35 var(--h7-body)!important;text-align:left;border-radius:14px!important;padding:10px 14px!important;' + glass +
      'background:rgba(36,10,18,.84)!important;border-color:rgba(255,59,66,.4)!important;box-shadow:0 0 22px -8px rgba(255,59,66,.6),inset 0 0 18px rgba(255,59,66,.08),0 10px 24px rgba(0,0,0,.38)!important;animation:up795 .45s ease-out both}' +
    'html.hud795 body:has(#ui .missions:not([hidden]),#new786:not([hidden])) #toast{opacity:0!important;pointer-events:none}' +
    P + '#ui #hint{font:italic 500 13.5px/1.3 var(--h7-body)!important;color:var(--h7-ink)!important;text-shadow:none!important;' + glass + 'border-radius:12px!important;padding:6px 12px!important}' +
    P + '#ui #hint:empty{display:none!important}' +
    P + '#ui #xpPop:not([hidden]){font:700 12px/1.2 var(--h7-mono)!important;color:var(--h7-gold)!important;text-shadow:0 0 8px rgba(255,212,92,.6)!important;' + pill + 'padding:3px 10px!important;border-color:rgba(255,212,92,.5)!important;animation:up795 .4s ease-out both}' +
    P + '#pace789{top:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 16px)!important;max-width:calc(100vw - 200px);white-space:nowrap;font:500 11.5px/1.2 var(--h7-body)!important;' + pill +
      'padding:3px 11px 3px 22px!important;background-image:radial-gradient(circle at 11px 50%,var(--h7-mint) 3.5px,transparent 4.5px)!important;box-shadow:0 0 10px -3px var(--h7-glow)!important;backdrop-filter:blur(4px)}' +
    P + '#ui #lvCard{gap:8px!important;padding:16px 24px 18px!important;min-width:min(250px,calc(100vw - 60px));box-sizing:border-box;border-radius:16px!important;' + glass +
      'border-color:rgba(255,59,66,.55)!important;box-shadow:0 0 0 100vmax rgba(5,6,12,.42),0 0 40px -6px rgba(255,59,66,.7),inset 0 0 26px rgba(255,59,66,.12)!important}' +
    P + '#ui #lvCard::before{content:"Level up";' + eyebrow + 'font-size:10.5px!important}' +
    P + '#ui #lvCard b{font:700 clamp(46px,14vw,80px)/.95 var(--h7-head)!important;color:var(--h7-gold)!important;text-shadow:0 0 22px rgba(255,212,92,.7)!important;letter-spacing:-.01em!important}' +
    P + '#ui #lvCard span{color:var(--h7-ink)!important;text-shadow:none!important;font:500 15.5px/1.35 var(--h7-body)!important}' +
    P + '#ui #lvCard em{font:700 11.5px/1.35 var(--h7-mono)!important;color:var(--h7-gold)!important;text-shadow:none!important;' + pill + 'border-color:rgba(255,212,92,.5)!important;padding:4px 12px!important}' +
    /* every card that holds her opens under the round map (his order: "tap the map from now on and forever more") */
    '@media (orientation:portrait){' + P + '#ui .missions{top:calc(var(--h7-top) + 166px)!important;bottom:auto!important;max-height:calc(100% - var(--h7-top) - 180px)!important;overflow-y:auto!important}' +
      P + '#new786{top:calc(var(--h7-top) + 166px)!important;max-height:calc(100% - var(--h7-top) - 180px)!important}}' +
    '.wcap795{position:absolute;left:50%;bottom:10px;translate:-50% 0;z-index:3;pointer-events:none;padding:3px 11px;' + pill + 'font:700 9.5px/1.3 var(--h7-mono);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}' +

    /* ===== 6 THE PAUSE PAGE: night glass, an eyebrow, the job, rows with a chevron, the Face's pills for every setting, the key ===== */
    'html.pz795 #start{padding:8px!important;place-items:start center!important;background:radial-gradient(120% 70% at 50% 0%,rgba(255,59,66,.16),rgba(5,6,12,0) 60%),rgba(5,6,12,.72)!important;backdrop-filter:blur(4px);overflow-y:auto!important;-webkit-overflow-scrolling:touch}' +
    'html.pz795 #start .sheet{box-sizing:border-box!important;width:min(440px,calc(100vw - 16px))!important;min-width:0!important;max-width:none!important;margin:calc(var(--h7-top) + 56px) auto 28px!important;max-height:none!important;padding:16px 14px 18px!important;border-radius:18px!important;' + glass + 'animation:up795 .45s ease-out both}' +
    'html.pz795 #start .sheet .brand,html.pz795 #start .sheet .how{display:none!important}' +
    'html.pz795 #start .sheet .kicker{display:block!important;align-self:flex-start;margin:0 0 6px!important;padding:0!important;background:none!important;border:0!important;' + eyebrow + '}' +
    'html.pz795 #start .sheet .kicker::before{content:"";display:inline-block!important;width:7px;height:7px;margin:0 8px 1px 0;border-radius:50%;background:var(--h7-red);box-shadow:0 0 8px var(--h7-red);vertical-align:middle;position:static!important;flex:none!important}' +
    'html.pz795 #start .sheet .kicker::after{display:none!important}' +
    '#pzHead795{margin:0 0 12px;text-align:left}' +
    '#pzHead795 .where{' + eyebrow + 'color:var(--h7-dim)!important;letter-spacing:.14em!important}' +
    '#pzHead795 h2{margin:8px 0 6px!important;font:700 26px/1.08 var(--h7-head)!important;color:var(--h7-ink)!important;-webkit-text-fill-color:currentColor!important;background:none!important;text-shadow:none!important;letter-spacing:-.01em!important;text-transform:none!important;text-wrap:balance}' +
    '#pzHead795 .stats{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '#pzHead795 .stats b{font:700 10.5px/1 var(--h7-mono);letter-spacing:.06em;padding:5px 10px;' + pill + '}' +
    '#pzHead795 .said{display:grid;gap:8px;margin-top:12px}' +
    '#pzHead795 .said:empty{display:none}' +
    '#pzHead795 .pan{position:relative;padding:9px 12px 10px 48px;border-radius:12px;background:rgba(40,12,18,.7);border:1px solid rgba(255,59,66,.32);min-height:40px}' +
    '#pzHead795 .pan q{display:block;quotes:none;font:italic 500 13px/1.35 var(--h7-body);color:var(--h7-ink);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}' +
    '#pzHead795 .pan b{display:block;margin-bottom:3px;' + eyebrow + 'font-size:9px!important;color:#ff8f94!important}' +
    '#pzHead795 .pan svg{position:absolute;left:8px;top:9px;width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,59,66,.6);box-shadow:0 0 8px rgba(255,59,66,.5);background:rgba(10,13,24,.8)}' +
    'html.pz795 #start .birds{order:30!important;margin:12px 0 0!important}' +
    'html.pz795 #start .bird b{color:var(--h7-ink)!important;' + pill + 'font:600 12px/1.2 var(--h7-head)!important}' +
    'html.pz795 #start .bird[aria-pressed="true"] b{border-color:var(--h7-red)!important;box-shadow:0 0 10px -2px var(--h7-red)!important}' +
    'html.pz795 #start #go{display:block!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;min-height:52px!important;margin:2px 0 10px!important;padding:8px 14px!important;' +
      'text-align:center!important;font:700 17px/1 var(--h7-head)!important;letter-spacing:.18em!important;text-transform:uppercase!important;color:#fff!important;text-shadow:none!important;' +
      'background:linear-gradient(180deg,#ff5a60,var(--h7-red2))!important;border:1px solid rgba(255,140,145,.7)!important;border-radius:999px!important;box-shadow:0 0 22px -4px rgba(255,59,66,.85),inset 0 1px 0 rgba(255,255,255,.3)!important;transform:none!important}' +
    'html.pz795 #start #go::before,html.pz795 #start #go::after{display:none!important}' +
    'html.pz795 #start #pauseRow > *{min-width:0!important;max-width:100%!important;box-sizing:border-box!important;white-space:normal!important}' +
    'html.pz795 #start #pauseRow{width:100%!important;box-sizing:border-box;display:flex!important;flex-wrap:wrap!important;gap:8px!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;margin:0!important}' +
    /* the rows: glass, a 1 px line, the name in Grotesk, its line in mono, a mint chevron */
    'html.pz795 #start #pauseRow > button[data-n795]{flex:1 1 100%;display:block!important;position:relative;min-height:50px!important;padding:8px 36px 8px 14px!important;margin:0!important;width:100%!important;' +
      'text-align:left!important;font:600 16px/1.15 var(--h7-head)!important;letter-spacing:0!important;color:var(--h7-ink)!important;text-shadow:none!important;' +
      'background:rgba(16,21,36,.78)!important;background-image:none!important;border:1px solid var(--h7-line)!important;border-radius:14px!important;box-shadow:inset 0 0 16px rgba(110,168,255,.05)!important;transform:none!important}' +
    'html.pz795 #start #pauseRow > button[data-n795]:active{border-color:var(--h7-mint)!important;box-shadow:0 0 16px -4px var(--h7-glow)!important}' +
    'html.pz795 #start #pauseRow > button[data-n795]::before{content:""!important;position:absolute!important;right:14px!important;left:auto!important;top:50%!important;width:8px!important;height:8px!important;margin:-5px 0 0!important;' +
      'border:solid var(--h7-mint)!important;border-width:2px 2px 0 0!important;transform:rotate(45deg)!important;background:none!important;box-shadow:none!important;opacity:1!important;filter:drop-shadow(0 0 3px var(--h7-glow))}' +
    'html.pz795 #start #pauseRow > button[data-n795]::after{display:none!important}' +
    'html.pz795 #start #pauseRow > button[data-n795] small{display:block;margin-top:4px;font:400 10.5px/1.25 var(--h7-mono);letter-spacing:.04em;text-transform:none;color:var(--h7-dim)}' +
    'html.pz795 #start #pauseRow > button[data-n795] .n678s{display:none!important}' +
    'html.pz795 #start #pauseRow > button[data-n795] .n678l{display:inline!important}' +
    'html.pz795 #start #pauseRow .h795{flex:1 1 100%;margin:14px 2px 0;' + eyebrow + 'font-size:10.5px!important}' +
    'html.pz795 #start #pauseRow .h795 small{display:block;margin-top:4px;font:italic 500 12px/1.3 var(--h7-body);letter-spacing:0;text-transform:none;color:var(--h7-dim)}' +
    /* the Face's pills: every setting a thin outlined pill with a small icon; on is mint */
    'html.pz795 #start #pauseRow > :is(#lookBtn,#windBtn683,.tile795){flex:0 1 auto;display:inline-flex!important;align-items:center;gap:6px;width:auto!important;margin:0!important;min-height:44px!important;padding:6px 14px 6px 34px!important;position:relative;' +
      'text-align:left!important;font:500 13px/1.15 var(--h7-body)!important;letter-spacing:0!important;text-transform:none;' + pill + 'background:rgba(10,13,24,.72)!important;background-image:none!important;box-shadow:none!important}' +
    'html.pz795 #start #pauseRow > :is(#lookBtn,#windBtn683,.tile795)::before{content:""!important;display:block!important;position:absolute!important;left:11px!important;top:50%!important;width:16px!important;height:16px!important;margin:-8px 0 0!important;' +
      'background:var(--ic795) center/contain no-repeat!important;opacity:1!important;border:0!important;box-shadow:none!important;transform:none!important;filter:invert(.92)}' +
    'html.pz795 #start #pauseRow > :is(#lookBtn,#windBtn683,.tile795)::after{content:var(--v795,"")!important;position:static!important;display:inline!important;font:400 11px/1.2 var(--h7-mono)!important;' +
      'letter-spacing:.02em!important;text-transform:none;color:var(--h7-dim)!important;background:none!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;transform:none!important;white-space:nowrap!important}' +
    'html.pz795 #start #pauseRow > :is(#lookBtn,#windBtn683,.tile795)[aria-pressed="true"]{border-color:var(--h7-mint)!important;box-shadow:0 0 12px -4px var(--h7-glow)!important}' +
    'html.pz795 #start #pauseRow > :is(#lookBtn,#windBtn683){font-size:0!important}' +
    'html.pz795 #start #pauseRow > :is(#lookBtn,#windBtn683) .lbl795{font:500 13px/1.15 var(--h7-body)}' +
    'html.pz795 #start #pauseRow .seg795{flex:1 1 100%;display:flex;flex-wrap:wrap;gap:6px;align-items:center;' + eyebrow + 'font-size:9.5px!important;color:var(--h7-dim)!important}' +
    'html.pz795 #start #pauseRow .seg795 > span{margin-right:4px}' +
    'html.pz795 #start #pauseRow .seg795 button,html.pz795 #start #pauseRow .sky795 button{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:4px 13px;font:500 12.5px/1 var(--h7-body);letter-spacing:0;text-transform:none;' + pill + 'background:rgba(10,13,24,.72)!important}' +
    'html.pz795 #start #pauseRow :is(.seg795,.sky795) button[aria-pressed="true"]{border-color:var(--h7-mint)!important;color:#fff!important;box-shadow:0 0 12px -3px var(--h7-glow)!important;background:rgba(77,232,201,.12)!important}' +
    'html.pz795 #start #pauseRow .sky795{flex:1 1 100%;display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}' +
    'html.pz795 #start #pauseRow .sky795 .lb{flex:1 1 100%;margin:10px 2px 0;' + eyebrow + 'font-size:9.5px!important}' +
    'html.pz795 #start #pauseRow .sky795 .nt{flex:1 1 100%;margin:0 2px;font:italic 500 11.5px/1.3 var(--h7-body);color:var(--h7-dim)}' +
    'html.pz795 #start #pauseRow .sky795 button svg{width:16px;height:16px;filter:invert(.92)}' +
    'html.pz795 #start #pauseRow .sky795 .mo i{display:block;width:9px;height:9px;border-radius:50%;background:var(--mc);box-shadow:0 0 6px var(--mc)}' +
    /* the key: the marks taught, in the house's glass */
    '#pzLegend795{order:25;margin-top:14px!important;padding:14px!important;border-radius:16px!important;' + glass + 'transform:none!important;text-align:left}' +
    '#pzLegend795 h5{margin:0 0 4px!important;' + eyebrow + 'font-size:10.5px!important}' +
    '#pzLegend795 ul{display:grid!important;gap:9px!important;margin:6px 0 0!important;padding:0!important;list-style:none}' +
    '#pzLegend795 li{display:grid!important;grid-template-columns:28px 1fr!important;gap:10px!important;align-items:start}' +
    '#pzLegend795 li svg{width:26px!important;height:26px!important}' +
    '#pzLegend795 li b{display:block;font:600 13px/1.2 var(--h7-head)!important;letter-spacing:0!important;text-transform:none!important;color:var(--h7-ink)!important}' +
    '#pzLegend795 li span span{display:block;font:400 12px/1.35 var(--h7-body)!important;color:var(--h7-dim)!important}' +
    'html.pz795 #start .title-links{order:40!important;margin-top:14px!important;display:flex!important;flex-wrap:wrap;gap:6px!important;justify-content:center}' +
    'html.pz795 #start .title-links .linkish{' + pill + 'font:500 12px/1 var(--h7-body)!important;padding:0 13px!important;text-decoration:none!important;box-shadow:none!important}' +

    /* ===== 7 THE MAPS ===== */
    P + '.m705win{border-radius:18px!important;' + glass + '}' +
    P + '.m705win h3{font:700 22px/1 var(--h7-head)!important;letter-spacing:.02em!important;text-transform:none!important;color:var(--h7-ink)!important;text-shadow:none!important}' +
    P + '.m705win h3::before,' + P + '.m705win h3::after{background:var(--h7-line2)!important;opacity:1}' +
    P + '.m705foot{color:var(--h7-ink)!important;font:400 12px/1.35 var(--h7-mono)!important;text-shadow:none!important}' +
    P + '.m705foot b{color:var(--h7-mint)!important;text-shadow:none!important}' +
    P + '.m705win canvas{border:1px solid var(--h7-line2)!important;border-radius:10px;box-shadow:0 0 16px -4px var(--h7-glow)}' +
    P + '#map705Close{color:var(--h7-ink)!important;' + pill + 'font:600 18px/1 var(--h7-body)!important;box-shadow:0 0 10px -3px rgba(110,168,255,.6)!important}' +
    '.m705win{position:relative}' +
    '.nx795{position:absolute;pointer-events:none;z-index:2}' +
    '.ctl795{margin:6px 6px 0;text-align:center;font:italic 500 11.5px/1.3 var(--h7-body);color:var(--h7-dim)}' +
    '.leg795{display:flex;flex-wrap:wrap;justify-content:center;gap:5px 6px;margin:8px 4px 0}' +
    '.leg795 span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;padding:3px 9px;font:500 11px/1.2 var(--h7-body);' + pill + '}' +
    '.leg795 i{display:inline-block;width:9px;height:9px;border-radius:50%;box-sizing:border-box}' +
    '.pc795{position:absolute;left:0;right:0;top:auto;bottom:14px;margin:0 auto;height:max-content;z-index:5;width:min(280px,calc(100% - 30px));box-sizing:border-box;padding:14px 14px 12px;border-radius:16px;' + glass +
      'border-color:rgba(255,59,66,.55)!important;box-shadow:0 0 30px -6px rgba(255,59,66,.6),inset 0 0 22px rgba(255,59,66,.08),0 12px 26px rgba(0,0,0,.5)!important;animation:up795 .4s ease-out both}' +
    '.pc795 .k{' + eyebrow + 'font-size:9.5px!important}' +
    '.pc795 h4{margin:6px 0 4px;font:700 26px/1.05 var(--h7-head);color:var(--h7-ink)}' +
    '.pc795 p{margin:0 0 6px;font:italic 500 13.5px/1.38 var(--h7-body);color:var(--h7-ink)}' +
    '.pc795 .d{font:700 10.5px/1.2 var(--h7-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--h7-gold);margin-bottom:12px}' +
    P + '.pc795 .go{display:block!important;width:100%!important;min-height:50px!important;font:700 15px/1 var(--h7-head)!important;letter-spacing:.2em!important;text-transform:uppercase!important;color:#04221c!important;text-shadow:none!important;' +
      'border:1px solid #b9fff0!important;border-radius:999px!important;background:linear-gradient(180deg,#7ff3dc,var(--h7-mint))!important;box-shadow:0 0 22px -4px var(--h7-glow)!important}' +
    P + '.pc795 .go:active{transform:scale(.98)}' +
    P + '.pc795 .no{display:block;margin:8px auto 0;min-height:36px;padding:0 16px;font:500 12.5px/1 var(--h7-body)!important;' + pill + 'background:transparent!important}' +
    P + '#wmap712 .wcap795{color:var(--h7-ink)}' +
    '';
  }

  /* ---------------- 1 THE COMPASS STRIP: three turns of ticks and letters drawn once; each frame only moves it ---------------- */
  var K = 1.42, SPAN = 75;   /* px per degree, and how far either side of ahead the strip shows */
  function stripSvg() {
    var w = Math.round(1080 * K), s = "<svg xmlns='" + NS + "' width='" + w + "' height='20' viewBox='0 0 " + w + " 20'>", L = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (var d = 0; d <= 1080; d += 15) {
      var x = (d * K).toFixed(1), m = d % 360, big = m % 45 === 0;
      if (big) { var t = L[m / 45], n = t === 'N'; s += "<text x='" + x + "' y='14' text-anchor='middle' font-family='Space Mono, ui-monospace, Menlo, Consolas, monospace' font-weight='700' font-size='" + (t.length === 1 ? 11.5 : 9.5) + "' fill='" + (n ? '#ff3b42' : '#c9d2ea') + "'>" + t + '</text>'; }
      else s += "<line x1='" + x + "' x2='" + x + "' y1='" + (m % 15 === 0 && m % 45 ? 4 : 6) + "' y2='14' stroke='#95a0bd' stroke-width='1.2' stroke-linecap='round' opacity='.7'/>";
    }
    return s + '</svg>';
  }

  function create(api) {
    var H = { api: api, on: true, frames: 0, mm: 0, t0: 0, set: load(), cool: {}, legend: false, pz: false, errors: 0, last: {}, terrC: null, tapeX: 0, heading: 0 };
    var root = document.documentElement;
    if (window.UI795 && UI795.css) UI795.css(sheet()); else { var st0 = document.createElement('style'); st0.id = 'hud795css'; st0.textContent = sheet(); document.head.appendChild(st0); }
    var lay = document.createElement('style'); lay.id = 'hud795lay'; document.head.appendChild(lay);
    function applySet() { lay.textContent = layoutCss(H.set.hand, H.set.size); root.classList.toggle('lh795', H.set.hand === 'l'); }
    applySet(); root.classList.add('hud795');
    /* the last two lines said (for the pause page's panels): read off the game's own talk card as it types */
    var TALK = [];
    (function () { var tw = $('talkWho'), tt = $('talkText'); if (!tt) return;
      var rec = function () { var who = tw ? tw.textContent.trim() : '', text = tt.textContent.trim(); if (!text || /grandma|shirley/i.test(who)) return; var l = TALK[TALK.length - 1];
        if (l && l.who === who && (text.indexOf(l.text) === 0 || l.text.indexOf(text) === 0)) { if (text.length > l.text.length) l.text = text; return; }
        TALK.push({ who: who, text: text }); if (TALK.length > 2) TALK.shift(); };
      new MutationObserver(rec).observe(tt, { childList: true, characterData: true, subtree: true }); })();
    /* the sky picks kept from the last flight (only the weather and the clock's running need putting back; the clock itself is in her save) */
    try { if (api.sky && api.sky.pass && H.set.pass === false) api.sky.pass(false); applyWx(); } catch (e) { /* the clock runs */ }
    function nowWords() {   /* 'Morning · rain': the part of the day and the weather, named all the time (on the job card's tab and the pause page) */
      var S = api.S || {}, nav = $('navHud'), aria = nav ? nav.getAttribute('aria-label') || '' : '', wm = /weather today ([a-z ]+)/i.exec(aria), p = partOfDay(S.clock);
      var fx = api.sky && api.sky.forced ? api.sky.forced() : null, wx = fx || (wm ? wm[1].trim() : '');
      return [p ? p.charAt(0).toUpperCase() + p.slice(1) : '', wx === 'clear' ? 'clear sky' : wx].filter(Boolean).join(' · ');
    }

    /* the paint of each disc */
    Object.keys(PAINT).forEach(function (id) { var e = $(id); if (e) { e.style.setProperty('--c1', PAINT[id][0]); e.style.setProperty('--c2', PAINT[id][1]); e.style.setProperty('--c3', PAINT[id][2]); } });
    var paintLate = function () { Object.keys(PAINT).forEach(function (id) { var e = $(id); if (e && !e.style.getPropertyValue('--c1')) { e.style.setProperty('--c1', PAINT[id][0]); e.style.setProperty('--c2', PAINT[id][1]); e.style.setProperty('--c3', PAINT[id][2]); } }); };

    /* 1 the strip */
    var hud = document.querySelector('#ui .hud') || $('ui'), cmp = document.createElement('div'); cmp.id = 'cmp795'; cmp.setAttribute('aria-hidden', 'true');
    cmp.innerHTML = "<div class='tape'>" + stripSvg() + "</div><i class='goal'></i><i class='pin' hidden></i><i class='way' hidden></i><s></s>"; hud.appendChild(cmp);
    var tape = cmp.querySelector('.tape'), gEl = cmp.querySelector('.goal'), pEl = cmp.querySelector('.pin'), wEl = cmp.querySelector('.way');

    /* 3 the round map: the island under the radar's dots (the radar's own glass made clear) */
    var mb = $('mapBtn705'), arrow = mb && mb.querySelector('.arrow'), mm = document.createElement('canvas'); mm.id = 'mm795'; mm.width = 136; mm.height = 136; mm.setAttribute('aria-hidden', 'true');
    if (arrow) arrow.insertBefore(mm, arrow.firstChild);
    try { if (api.glass) api.glass('rgba(0,0,0,0)'); } catch (e) { /* the radar keeps its glass */ }
    var mg = mm.getContext('2d');

    /* 4 the costs and the rests */
    var rest = {};   /* the last value written per button, so the 10 Hz tick writes only on change */

    /* ---------------- per frame: the strip and the round map ---------------- */
    function headingDeg(view) { var d = (PI - view) / D2R; d %= 360; return d < 0 ? d + 360 : d; }
    function place(el, rel, w) { var on = Math.abs(rel) <= SPAN, x = w / 2 + Math.max(-SPAN, Math.min(SPAN, rel)) * K * (on ? 1 : 0.98); el.style.transform = 'translateX(' + (x - w / 2).toFixed(1) + 'px)' + (el === gEl ? ' rotate(45deg) scale(.86)' : ''); el.style.left = '50%'; el.classList.toggle('edge', !on); }
    function frame() {
      requestAnimationFrame(frame); if (!H.on || document.hidden) return; var ui = $('ui'); if (!ui || ui.hidden) return; H.frames++;
      try {
        var S = api.S, view = api.view(), h = headingDeg(view), w = cmp.clientWidth || 210; H.heading = h;
        H.tapeX = -((h + 360) * K) + w / 2; tape.style.transform = 'translateX(' + H.tapeX.toFixed(1) + 'px)';
        var g = api.goal ? api.goal() : null;
        if (g && S && S.pos) { var b = Math.atan2(g[0] - S.pos.x, g[1] - S.pos.z), gd = (PI - b) / D2R, rel = ((gd - h) % 360 + 540) % 360 - 180; gEl.hidden = false; place(gEl, rel, w); H.last.goalRel = rel; } else { gEl.hidden = true; H.last.goalRel = null; }
        var pb = api.pinBearing ? api.pinBearing() : null;
        if (pb != null && isFinite(pb)) { var pr = ((pb - h) % 360 + 540) % 360 - 180; pEl.hidden = false; place(pEl, pr, w); H.last.pinRel = pr; } else { pEl.hidden = true; H.last.pinRel = null; }
        if (H.way && S && S.pos && !(api.away && api.away())) {   /* the place she chose on the chart: a teal flag, gone when she gets there */
          var wd = Math.hypot(H.way.x - S.pos.x, H.way.z - S.pos.z);
          if (wd < 22) { var nm = H.way.name; H.way = null; wEl.hidden = true; if (window.UI795 && UI795.toast) UI795.toast(nm + '.', { kicker: 'You are here', icon: 'pin', ms: 2600 }); }
          else { var wb = Math.atan2(H.way.x - S.pos.x, H.way.z - S.pos.z), wr = (((PI - wb) / D2R - h) % 360 + 540) % 360 - 180; wEl.hidden = false; place(wEl, wr, w); H.last.wayRel = wr; }
        } else if (!wEl.hidden) wEl.hidden = true;
        var t = performance.now(); if (t - H.mm > 33) { H.mm = t; drawMap(S, view); }
      } catch (e) { if (++H.errors < 4) console.warn('hud795: ' + (e && e.message)); }
    }
    function terrCanvas() {
      if (H.terrC) return H.terrC; var T = api.terr ? api.terr() : null; if (!T || !T.px) return null;
      var c = document.createElement('canvas'); c.width = T.N; c.height = T.N; var x = c.getContext('2d'), im = x.createImageData(T.N, T.N); im.data.set(T.px); x.putImageData(im, 0, 0);
      H.terrC = { c: c, N: T.N, HALF: T.HALF }; return H.terrC;
    }
    function drawMap(S, view) {
      var W = 136, cx = 68, R = 66, k = (R - 9) / 140;   /* the radar's own scale: 140 m to its rim */
      mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, W, W);
      var away = api.away ? api.away() : false, T = away ? null : terrCanvas();
      mg.fillStyle = away ? '#efe0c2' : '#9fcfd0'; mg.fillRect(0, 0, W, W);
      if (T && S && S.pos) {
        var st = 2 * T.HALF / T.N; mg.save(); mg.translate(cx, cx); mg.rotate(view - PI); mg.scale(st * k, st * k); mg.imageSmoothingEnabled = true;
        mg.drawImage(T.c, -(S.pos.x + T.HALF) / st, -(S.pos.z + T.HALF) / st); mg.restore();
      } else {   /* out in the world: paper and a faint rose, turned with her view */
        mg.save(); mg.translate(cx, cx); mg.rotate(view - PI); mg.strokeStyle = 'rgba(43,27,23,.18)'; mg.lineWidth = 1.2;
        for (var r = 18; r < R; r += 16) { mg.beginPath(); mg.arc(0, 0, r, 0, 6.2832); mg.stroke(); }
        for (var a = 0; a < 8; a++) { mg.beginPath(); mg.moveTo(0, 0); mg.lineTo(Math.sin(a * PI / 4) * R, -Math.cos(a * PI / 4) * R); mg.stroke(); } mg.restore();
      }
      /* the paper's wash over the land, so the dots read; her range ring */
      var gr = mg.createRadialGradient(cx, cx, R * 0.2, cx, cx, R); gr.addColorStop(0, 'rgba(248,239,220,0)'); gr.addColorStop(0.7, 'rgba(248,239,220,.06)'); gr.addColorStop(1, 'rgba(248,239,220,.3)'); mg.fillStyle = gr; mg.fillRect(0, 0, W, W);
      mg.strokeStyle = 'rgba(43,27,23,.35)'; mg.lineWidth = 1; mg.setLineDash([3, 4]); mg.beginPath(); mg.arc(cx, cx, R * 0.5, 0, 6.2832); mg.stroke(); mg.setLineDash([]);
    }
    requestAnimationFrame(frame);

    /* ---------------- 10 Hz: the rests, the costs, the pause page, late elements ---------------- */
    function tick() {
      if (!H.on) return; var ui = $('ui'); paintLate(); pauseSync(); mapLegend();
      if (!ui || ui.hidden) return;
      var lv = $('lvPill'), nw = nowWords(), tab = JSON.stringify(nw || 'Up next'); if (lv && H.tab !== tab) { H.tab = tab; lv.style.setProperty('--tab795', tab); }
      var cd = {}; try { cd = api.cd ? api.cd() : {}; } catch (e) { cd = {}; }
      ['flap', 'flutter', 'jump', 'land', 'atkBtn', 'zoom'].forEach(function (id) {
        var b = $(id); if (!b || b.hidden) return;
        var c = cd[id] || 0, top = H.cool[id] || 0; if (c > top) top = c; if (c <= 0) top = 0; H.cool[id] = top;
        var txt = c > 0 ? 'rest ' + Math.ceil(c) + ' s' : COST[id], k = txt ? '" · ' + txt + '"' : '""', n = c > 0 ? '"' + Math.ceil(c) + '"' : '""', f = c > 0 && top > 0 ? (c / top).toFixed(2) : '0';
        var key = k + n + f; if (rest[id] === key) return; rest[id] = key;
        b.style.setProperty('--k795', k); b.style.setProperty('--n795', '""'); b.style.setProperty('--f795', f); b.style.setProperty('--o795', c > 0 ? '1' : '0');
      });
    }
    setInterval(tick, 100);

    /* ---------------- 6 THE PAUSE PAGE ---------------- */
    var CARDS = [['mapBtn705p', 'Map', 'the island and the world'], ['journalBtn', 'Journal', 'what she has done'], ['saveBtn', 'Save', 'keep this flight'],
      ['netBtn678', 'Fly together', 'a friend, a code'], ['toTitle', 'Main menu', 'files, birds, the story']];
    var ICON = {
      sound: "<svg xmlns='" + NS + "' viewBox='0 0 30 30'><path d='M5 11h5l7-6v20l-7-6H5z' fill='%23f4b23c' stroke='%232b1b17' stroke-width='2' stroke-linejoin='round'/><path d='M20.5 10.5q3 4.5 0 9M23.5 7.5q5.4 7.5 0 15' fill='none' stroke='%232b1b17' stroke-width='2' stroke-linecap='round'/></svg>",
      quiet: "<svg xmlns='" + NS + "' viewBox='0 0 30 30'><path d='M5 11h5l7-6v20l-7-6H5z' fill='%23efe0c2' stroke='%232b1b17' stroke-width='2' stroke-linejoin='round'/><path d='M20 11l7 8M27 11l-7 8' stroke='%23c8314a' stroke-width='2.4' stroke-linecap='round'/></svg>",
      wind: "<svg xmlns='" + NS + "' viewBox='0 0 30 30'><path d='M3 11h14a3.5 3.5 0 1 0-3.5-3.5M3 16h19a3.5 3.5 0 1 1-3.5 3.5M3 21h9' fill='none' stroke='%232b1b17' stroke-width='2.4' stroke-linecap='round'/><circle cx='24' cy='8' r='2.4' fill='%231d8b8f'/></svg>",
      look: "<svg xmlns='" + NS + "' viewBox='0 0 30 30'><rect x='3' y='5' width='24' height='18' rx='3' fill='%239bd5e6' stroke='%232b1b17' stroke-width='2'/><path d='M3 19l7-7 5 5 4-3 8 6' fill='%234b8f3b' stroke='%232b1b17' stroke-width='1.6' stroke-linejoin='round'/><circle cx='21' cy='10' r='2.4' fill='%23f4b23c' stroke='%232b1b17' stroke-width='1.2'/></svg>",
      hand: "<svg xmlns='" + NS + "' viewBox='0 0 30 30'><rect x='7' y='2' width='16' height='26' rx='3.5' fill='%23f8efdc' stroke='%232b1b17' stroke-width='2'/><circle cx='18' cy='22' r='3.2' fill='%23c8314a' stroke='%232b1b17' stroke-width='1.5'/><circle cx='12' cy='18' r='2.2' fill='%23f4b23c' stroke='%232b1b17' stroke-width='1.3'/></svg>",
      size: "<svg xmlns='" + NS + "' viewBox='0 0 30 30'><circle cx='9' cy='19' r='4' fill='%23f4b23c' stroke='%232b1b17' stroke-width='1.8'/><circle cx='20' cy='14' r='7.5' fill='%23c8314a' stroke='%232b1b17' stroke-width='2'/></svg>"
    };
    function icoUrl(s) { return 'url("data:image/svg+xml,' + s.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23').replace(/%2523/g, '%23') + '")'; }
    var built = false, head = null, legend = null;
    function buildPause() {
      var sheetEl = document.querySelector('#start .sheet'), row = $('pauseRow'); if (!sheetEl || !row) return; built = true;
      head = document.createElement('div'); head.id = 'pzHead795'; head.innerHTML = "<div class='where'></div><h2></h2><div class='stats'></div><div class='said'></div>";
      var kick = $('kicker'); if (kick && kick.nextSibling) sheetEl.insertBefore(head, kick.nextSibling); else sheetEl.insertBefore(head, sheetEl.firstChild);
      CARDS.forEach(function (c, i) { var b = $(c[0]); if (!b) return; b.setAttribute('data-n795', String(i + 2).padStart(2, '0')); b.style.setProperty('--t795', (i % 2 ? 0.5 : -0.4) + 'deg'); b.style.order = String(i + 1);
        if (!b.querySelector('.n795')) { b.dataset.w795 = '1'; } });
      /* the settings: a heading, then the tiles (Look and Wind are the game's own buttons, drawn as tiles; Sound, Hand and Size are this module's) */
      var sb = document.createElement('button'); sb.type = 'button'; sb.id = 'set795Btn'; sb.setAttribute('data-n795', '08'); sb.style.order = '7';   /* 07 is THE SHOW's Photo (show795.js) */ sb.style.setProperty('--t795', '-.3deg'); sb.textContent = 'Settings';
      var sm = document.createElement('small'); sm.textContent = 'sound, thumbs, the sky'; sm.setAttribute('aria-hidden', 'true'); sb.appendChild(sm); row.appendChild(sb);
      sb.addEventListener('click', function () { var h = row.querySelector('.h795'); if (h) h.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      var hset = document.createElement('div'); hset.className = 'h795'; hset.style.order = '10'; hset.innerHTML = 'Settings<small>Saved on this phone.</small>'; row.appendChild(hset);
      var snd = document.createElement('button'); snd.type = 'button'; snd.className = 'tile795'; snd.id = 'snd795'; snd.style.order = '11'; row.appendChild(snd);
      snd.addEventListener('click', function () { var m = $('mute'); if (m) m.click(); setTimeout(pauseSync, 30); });
      var lk = $('lookBtn'), wd = $('windBtn683'); if (wd) wd.style.order = '12'; if (lk) lk.style.order = '13';
      var hand = document.createElement('button'); hand.type = 'button'; hand.className = 'tile795'; hand.id = 'hand795'; hand.style.order = '14'; row.appendChild(hand);
      hand.addEventListener('click', function () { H.set.hand = H.set.hand === 'l' ? 'r' : 'l'; store(H.set); applySet(); pauseSync(); });
      var seg = document.createElement('div'); seg.className = 'seg795'; seg.id = 'size795'; seg.style.order = '15'; seg.innerHTML = '<span>Buttons</span>' + ['s', 'm', 'l'].map(function (k) { return "<button type='button' data-s='" + k + "'>" + { s: 'Small', m: 'Medium', l: 'Large' }[k] + '</button>'; }).join('');
      row.appendChild(seg); seg.addEventListener('click', function (e) { var b = e.target.closest('button[data-s]'); if (!b) return; H.set.size = b.dataset.s; store(H.set); applySet(); pauseSync(); });
      /* the free-flight sky: time of day, weather, the clock running or not, and the month (the season loads with the island) */
      var sky = document.createElement('div'); sky.className = 'sky795'; sky.id = 'sky795'; sky.style.order = '16';
      var ic = function (n) { return window.UI795 && UI795.icon ? UI795.icon(n) : ''; };
      sky.innerHTML = "<div class='lb'>The sky, in free flight</div><div class='nt'>Your pick holds until you choose Natural. The story still brings its own storms.</div>" +
        TOD.map(function (t) { return "<button type='button' data-tod='" + t[0] + "'" + (t[0] === 'nat' ? " class='wide'" : '') + '>' + ic(t[2]) + '<span>' + t[1] + '</span></button>'; }).join('') +
        "<button type='button' class='wide' id='pass795' data-pass='1'>" + ic('calm') + '<span>Time passes</span></button>' +
        "<div class='lb'>Weather</div>" + WXK.map(function (t) { return "<button type='button' data-wx='" + t[0] + "'" + (t[0] === 'nat' ? " class='wide'" : '') + '>' + ic(t[2]) + '<span>' + t[1] + '</span></button>'; }).join('') +
        "<div class='lb'>Month</div><div class='nt' id='monthNt795'>The island wears its season the next time it loads.</div>" +
        "<button type='button' class='wide mo' data-mo='0'><span>Today's month</span></button>" +
        MONTHS.map(function (m, i) { return "<button type='button' class='mo' data-mo='" + (i + 1) + "' style='--mc:" + SEASON_C[seasonOf(i + 1)] + "'><i></i><span>" + m + '</span></button>'; }).join('') +
        "<button type='button' class='wide' id='reload795' hidden><span>Load it now</span></button>";
      row.appendChild(sky);
      sky.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return; var sk = api.sky || {};
        if (b.dataset.tod) { H.set.tod = b.dataset.tod; if (b.dataset.tod === 'nat') { if (sk.pass) sk.pass(true); H.set.pass = true; } if (b.dataset.tod !== 'nat' && sk.clock) { var t = TOD.filter(function (x) { return x[0] === b.dataset.tod; })[0]; sk.clock(t[3]); if (sk.pass) sk.pass(false); H.set.pass = false; } }
        else if (b.id === 'pass795') { H.set.pass = !(sk.pass ? sk.pass() : true); if (sk.pass) sk.pass(H.set.pass); if (H.set.pass) H.set.tod = 'nat'; }
        else if (b.dataset.wx) { H.set.wx = b.dataset.wx; applyWx(); }
        else if (b.dataset.mo) { H.set.month = +b.dataset.mo; try { if (H.set.month) localStorage.setItem('wfr.season', seasonOf(H.set.month)); else localStorage.removeItem('wfr.season'); } catch (x) { /* private mode */ } H.moved = true; }
        else if (b.id === 'reload795') { try { if (api.save) api.save(); sessionStorage.setItem('wfr.toStart', '0'); } catch (x) { /* fine */ } setTimeout(function () { location.reload(); }, 150); return; }
        store(H.set); pauseSync();
      });
      /* the marks, taught */
      var items = [
        { mark: dot('#c8314a', 'arrow'), name: 'The red arrow', line: 'In the round map: the way to your next job. The map turns with you; up is ahead.' },
        { mark: dot('#f4b23c', 'diamond'), name: 'The gold diamond', line: 'On the strip at the top: your next job. Fly until it sits over the red notch.' },
        { mark: dot('#c8314a', 'pin'), name: 'Your pin', line: 'A mark you placed: hold a spot on the big map. Its ring turns gold when you follow it.' },
        { mark: dot('#c8314a', 'n'), name: 'N', line: 'North, going round the rim.' },
        { mark: dot('#e0a868'), name: 'Tan dots', line: 'Twigs, and things lying about to gather.' },
        { mark: dot('#ffd25e'), name: 'Gold dots', line: "A villager's lost tool. Blue: a metal one." },
        { mark: dot('#7ed66a'), name: 'Green dots', line: 'Building stuff for the village.' },
        { mark: dot('#ff8fa8'), name: 'Pink dots', line: 'Fruit trees. The chick says thank you.' },
        { mark: dot('#c9a0ff'), name: 'The violet dot', line: 'Your nest, even from far off.' },
        { mark: dot('#4de8c9', 'up'), name: '\u2B06 and metres', line: 'Your job is above you: a roof, a branch, a ledge.' }
      ];
      if (window.UI795 && UI795.legend) { legend = UI795.legend({ title: 'The key', items: items }); legend.id = 'pzLegend795'; }
      else { legend = document.createElement('div'); legend.id = 'pzLegend795'; legend.className = 'u7-legend'; legend.innerHTML = '<h5>The key</h5><ul>' + items.map(function (it) { return '<li>' + it.mark + '<span><b>' + it.name + '</b><span>' + it.line + '</span></span></li>'; }).join('') + '</ul>'; }
      legend.style.order = '25'; var links = sheetEl.querySelector('.title-links'); if (links) sheetEl.insertBefore(legend, links); else sheetEl.appendChild(legend);
      sheetEl.style.display = 'flex'; sheetEl.style.flexDirection = 'column';
    }
    function dot(c, kind) {
      var s = "<svg viewBox='0 0 28 28' xmlns='" + NS + "' aria-hidden='true'><circle cx='14' cy='14' r='12.5' fill='#0a0d18' stroke='rgba(120,150,220,.55)' stroke-width='1.2'/>";
      if (kind === 'arrow') s += "<path d='M14 5 L20.5 20.5 L14 16.6 L7.5 20.5 Z' fill='" + c + "' stroke='#fff' stroke-width='1.2' stroke-linejoin='round'/>";
      else if (kind === 'diamond') s += "<rect x='8.5' y='8.5' width='11' height='11' transform='rotate(45 14 14)' fill='" + c + "' stroke='#fff3c4' stroke-width='1.2'/>";
      else if (kind === 'pin') s += "<path d='M14 23C10.5 18 7.6 15 7.6 11.4a6.4 6.4 0 0 1 12.8 0C20.4 15 17.5 18 14 23z' fill='" + c + "' stroke='#fff' stroke-width='1.1'/><circle cx='14' cy='11.2' r='2.2' fill='#0a0d18'/>";
      else if (kind === 'n') s += "<circle cx='14' cy='14' r='8' fill='" + c + "' stroke='#fff' stroke-width='1.6'/><text x='14' y='18' text-anchor='middle' font-size='11' font-weight='700' fill='#fff8ea' font-family='system-ui,sans-serif'>N</text>";
      else if (kind === 'up') s += "<path d='M14 6l6 7h-4v8h-4v-8H8z' fill='" + c + "'/>";
      else s += "<circle cx='14' cy='14' r='6.5' fill='" + c + "' stroke='#05061a' stroke-width='2.6'/>";
      return s + '</svg>';
    }
    function partOfDay(c) { if (c == null) return ''; return c < 150 ? 'dawn' : c < 700 ? 'morning' : c < 1200 ? 'midday' : c < 1800 ? 'afternoon' : c < 2100 ? 'dusk' : 'night'; }
    function pauseSync() {
      var st = $('start'), row = $('pauseRow'), on = !!(st && !st.hidden && row && !row.hidden);
      if (on !== H.pz) { H.pz = on; root.classList.toggle('pz795', on); if (on && !built) buildPause(); }
      if (!on || !built) return;
      var S = api.S || {}, nav = $('navHud'), aria = nav ? nav.getAttribute('aria-label') || '' : '', wm = /weather today ([a-z ]+)/i.exec(aria), w = $('wordsTop735'), q = $('quest');
      var where = (w && w.textContent) || 'Out of doors', bits = [where.split(' \u00b7 ')[0], nowWords()].filter(Boolean).join(' \u00b7 ');
      var we = head.querySelector('.where'); if (we.textContent !== bits) we.textContent = bits;
      var qt = q ? q.textContent : ''; var h2 = head.querySelector('h2'); if (h2.textContent !== qt) h2.textContent = qt;
      var stats = 'Level ' + (S.level || 1) + '|' + (S.coins || 0) + ' coins' + (nav && /\d+:\d\d:\d\d/.test(nav.textContent) ? '|' + /\d+:\d\d:\d\d/.exec(nav.textContent)[0] + ' flown' : '');
      var se = head.querySelector('.stats'); if (se.dataset.v !== stats) { se.dataset.v = stats; se.innerHTML = stats.split('|').map(function (x) { return '<b>' + x + '</b>'; }).join(''); }
      var m = $('mute'), sOn = !m || m.getAttribute('aria-label') !== 'Sound off', snd = $('snd795');
      if (snd) { snd.setAttribute('aria-pressed', sOn ? 'true' : 'false'); snd.textContent = 'Sound'; snd.style.setProperty('--ic795', icoUrl(sOn ? ICON.sound : ICON.quiet)); snd.style.setProperty('--v795', JSON.stringify(sOn ? 'On: songs and birds' : 'Off: a quiet island')); }
      var wd = $('windBtn683'); if (wd) { var won = wd.getAttribute('aria-pressed') !== 'false'; wd.style.setProperty('--ic795', icoUrl(ICON.wind)); wd.style.setProperty('--v795', JSON.stringify(won ? 'On: a rush in a dive' : 'Off: quiet dives')); lbl(wd, 'Wind sound'); }
      var lk = $('lookBtn'); if (lk) { var std = /Standard/.test(lk.textContent); lk.style.setProperty('--ic795', icoUrl(ICON.look)); lk.style.setProperty('--v795', JSON.stringify(std ? 'Standard · tap: Classic' : 'Classic · tap: Standard')); lbl(lk, 'Look'); }
      var hd = $('hand795'); if (hd) { hd.textContent = 'Thumbs'; hd.setAttribute('aria-pressed', H.set.hand === 'l' ? 'true' : 'false'); hd.style.setProperty('--ic795', icoUrl(ICON.hand)); hd.style.setProperty('--v795', JSON.stringify(H.set.hand === 'l' ? 'Left: Flap on the left' : 'Right: Flap on the right')); }
      var sz = $('size795'); if (sz) [].forEach.call(sz.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.dataset.s === H.set.size ? 'true' : 'false'); });
      CARDS.forEach(function (c) { var b = $(c[0]); if (b && !b.querySelector('small')) { var s = document.createElement('small'); s.textContent = c[2]; s.setAttribute('aria-hidden', 'true'); b.appendChild(s); } });
      /* the sky's tiles */
      var sk = api.sky || {}, pass = sk.pass ? sk.pass() : true, fx = sk.forced ? sk.forced() : null, skyEl = $('sky795');
      if (skyEl) [].forEach.call(skyEl.querySelectorAll('button'), function (b) {
        var on = b.dataset.tod ? (b.dataset.tod === (H.set.tod || 'nat')) : b.id === 'pass795' ? !!pass : b.dataset.wx ? (b.dataset.wx === (fx ? (H.set.wx && H.set.wx !== 'nat' ? H.set.wx : fx) : 'nat')) : b.dataset.mo != null ? (+b.dataset.mo === (H.set.month || 0)) : false;
        var v = on ? 'true' : 'false'; if (b.getAttribute('aria-pressed') !== v) b.setAttribute('aria-pressed', v);
      });
      var rl = $('reload795'); if (rl) rl.hidden = !H.moved;
      /* the last two lines said, as panels (Grandma's words are never replayed here) */
      var sd = head.querySelector('.said'), key = TALK.map(function (t) { return t.who + ':' + t.text; }).join('|');
      if (sd.dataset.v !== key) { sd.dataset.v = key; sd.innerHTML = TALK.map(function (t) { var who = /eagle|crow|owl|rouge/i.exec(t.who), face = window.UI795 && UI795.portrait ? UI795.portrait(who ? who[0].toLowerCase() : 'villager') : '';
        return "<div class='pan'><q></q>" + face + '<b></b></div>'; }).join('');
        [].forEach.call(sd.querySelectorAll('.pan'), function (p, i) { p.querySelector('q').textContent = TALK[i].text; p.querySelector('b').textContent = TALK[i].who || 'Someone'; }); }
    }
    function applyWx() { var sk = api.sky || {}; if (!sk.weather) return; var k = H.set.wx || 'nat'; if (k === 'nat') { if (H.wxSet) sk.weather(null, null); H.wxSet = false; return; } var t = WXK.filter(function (x) { return x[0] === k; })[0]; if (t) { sk.weather(t[3], t[4]); H.wxSet = true; } }
    function lbl(b, t) { var s = b.querySelector('.lbl795'); if (!s) { s = document.createElement('span'); s.className = 'lbl795'; s.setAttribute('aria-hidden', 'true'); b.insertBefore(s, b.firstChild); } if (s.textContent !== t) s.textContent = t; }

    /* ---------------- 7 THE MAPS: a legend under the island chart ---------------- */
    /* one true line for each place the chart names (DRAFTS for his pen) */
    var PLACE_LINE = { house: 'Six homes round a green, and a well. Somebody here always needs a hand.', lake: 'Fresh water in the middle of the island. Hal fishes from the far bank.',
      peak: 'The highest rock on the island. The Eagle keeps to the top.', light: "The Peregrine's perch. The fastest thing alive, and he will tell you so.",
      tree: 'The big tree in the middle of it all. Your nest goes at the very top.', nest: 'Your nest, at the top of the big tree. Home.' };
    var WAYS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
    function chartGeo() { var cv = $('map705cv'); if (!cv) return null; var r = cv.getBoundingClientRect(), Wd = r.width, Hd = r.height, HALF = 360, S0 = Math.min(Wd, Hd) - 18;
      return { r: r, HALF: HALF, ox: 14 + (Wd - 18 - S0) / 2, oy: 14 + (Hd - 18 - S0) / 2, sc: S0 / (2 * HALF) }; }
    function mapLegend() {
      var win = document.querySelector('.m705win'); if (!win) return;
      if (!win.querySelector('.leg795')) {
        var l = document.createElement('div'); l.className = 'leg795'; l.setAttribute('aria-label', 'Map key');
        l.innerHTML = [['#c8314a', 'you'], ['ring', 'your job'], ['#b07a3c', 'twigs'], ['#e0a82e', 'tools'], ['#4f86c8', 'metal tools'], ['#4f9c40', 'building stuff']].map(function (k) { return "<span><i style='" + (k[0] === 'ring' ? 'background:transparent;border:3px solid #f2b134;box-shadow:0 0 0 1px #17457a' : 'background:' + k[0]) + "'></i>" + k[1] + '</span>'; }).join('');
        var foot = win.querySelector('.m705foot'); if (foot && foot.parentNode) foot.parentNode.insertBefore(l, foot.nextSibling); else win.appendChild(l);
        var ctl = document.createElement('p'); ctl.className = 'ctl795'; ctl.textContent = 'Tap a place for its card. On the World tab, hold a spot to drop a pin.'; l.parentNode.insertBefore(ctl, l.nextSibling);
        var sb = document.createElement('div'); sb.className = 'nx795'; sb.id = 'scale795'; win.appendChild(sb);
        var cv = $('map705cv'); if (cv) cv.addEventListener('click', chartTap);
      }
      var wm = $('wmap712'); if (wm && !wm.querySelector('.wcap795')) { var cp = document.createElement('div'); cp.className = 'wcap795'; cp.textContent = 'The paper fills in wherever you fly.'; wm.appendChild(cp); }
      var g = chartGeo(), sb2 = $('scale795'), m = $('map705'); if (!g || !sb2 || !m || m.hidden || g.r.width < 40) return;
      var wr = win.getBoundingClientRect(), len = 100 * g.sc, k = g.r.left - wr.left + g.ox + 6, t = g.r.top - wr.top + g.oy + (g.r.height - 18) - 22;
      var key = [k, t, len].map(Math.round).join(','); if (sb2.dataset.k === key) return; sb2.dataset.k = key; sb2.style.left = Math.round(k) + 'px'; sb2.style.top = Math.round(t) + 'px';
      sb2.innerHTML = "<svg width='" + Math.round(len * 2 + 40) + "' height='20' xmlns='" + NS + "'><rect x='0.5' y='9' width='" + len.toFixed(1) + "' height='5' fill='#2b1b17'/><rect x='" + len.toFixed(1) + "' y='9' width='" + len.toFixed(1) + "' height='5' fill='#f8efdc' stroke='#2b1b17' stroke-width='1'/>" +
        "<text x='0' y='7' font-size='9' font-weight='800' font-family='system-ui,sans-serif' fill='#2b1b17'>0</text><text x='" + (len * 2 + 3).toFixed(1) + "' y='14' font-size='9.5' font-weight='800' font-family='system-ui,sans-serif' fill='#2b1b17'>200 m</text></svg>";
    }
    function chartTap(e) {
      var g = chartGeo(), P = api.places ? api.places() : null; if (!g || !P || !P.length) return;
      var px = e.clientX - g.r.left, py = e.clientY - g.r.top, best = null, bd = 30;
      P.forEach(function (p) { var d = Math.hypot(g.ox + (p[0] + g.HALF) * g.sc - px, g.oy + (p[1] + g.HALF) * g.sc - py); if (d < bd) { bd = d; best = p; } });
      var old = document.querySelector('.pc795'); if (old) old.remove(); if (!best) return;
      var S = api.S || {}, away = api.away ? api.away() : false, c = document.createElement('div'); c.className = 'pc795'; c.setAttribute('role', 'dialog');
      var dx = best[0] - (S.pos ? S.pos.x : 0), dz = best[1] - (S.pos ? S.pos.z : 0), dist = Math.hypot(dx, dz), deg = ((PI - Math.atan2(dx, dz)) / D2R + 360) % 360, way = WAYS[Math.round(deg / 45) % 8];
      var kind = best[3] === 'tree' && /nest/i.test(best[2]) ? 'nest' : best[3];
      c.innerHTML = "<div class='k'>On the island</div><h4></h4><p></p><div class='d'></div>" + (away ? '' : "<button type='button' class='go'>Fly there</button>") + "<button type='button' class='no'>Not now</button>";
      c.querySelector('h4').textContent = best[2]; c.querySelector('p').textContent = PLACE_LINE[kind] || '';
      c.querySelector('.d').textContent = away ? 'Across the sea from you' : dist < 25 ? 'You are here' : (dist < 1000 ? Math.round(dist / 10) * 10 + ' m ' : (dist / 1000).toFixed(1) + ' km ') + way + ' of you';
      c.querySelector('.no').addEventListener('click', function () { c.remove(); });
      var go = c.querySelector('.go'); if (go) go.addEventListener('click', function () { H.way = { x: best[0], z: best[1], name: best[2] }; c.remove(); var x = $('map705Close'); if (x) x.click();
        if (window.UI795 && UI795.toast) UI795.toast('Follow the teal flag on the strip.', { kicker: best[2], icon: 'pin', ms: 3000 }); });
      document.querySelector('.m705win').appendChild(c); e.stopPropagation();
    }

    var me = {
      peek: function () {
        return { on: H.on, frames: H.frames, heading: +H.heading.toFixed(1), tapeX: +H.tapeX.toFixed(1), goalRel: H.last.goalRel == null ? null : +H.last.goalRel.toFixed(1), pinRel: H.last.pinRel == null ? null : +H.last.pinRel.toFixed(1),
          set: JSON.parse(JSON.stringify(H.set)), pz: H.pz, built: built, errors: H.errors, map: !!H.terrC, legend: !!(legend && legend.isConnected),
          way: H.way ? H.way.name : null, wayRel: H.way && H.last.wayRel != null ? +H.last.wayRel.toFixed(1) : null, talk: TALK.slice(), tab: H.tab || null, now: nowWords() };
      },
      set: function (o) { if (o && o.size && SIZE[o.size]) H.set.size = o.size; if (o && (o.hand === 'l' || o.hand === 'r')) H.set.hand = o.hand; store(H.set); applySet(); },
      places: function () { return api.places ? api.places() : []; }, chartTap: function (x, y) { chartTap({ clientX: x, clientY: y, stopPropagation: function () {} }); },
      LAY: LAY, K: K, SPAN: SPAN
    };
    return me;
  }

  window.WFR_HUD795 = { create: create, LAY: LAY, version: '795.1' };
})();
