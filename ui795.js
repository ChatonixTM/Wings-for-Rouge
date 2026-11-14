/* ui795.js - THE PRESENTATION KIT (board 795, part 1), IN THE HOUSE STYLE. One type system, one card, one colour set and the motion every screen shares.
   Marth, Nov 13 2026, verbatim: "Everything is higher standard. Writing. Fonts animations, effects, transitions. Loading screens, game play"; then, on the
   first pictures: "lol you did NOT have to copy their UI" / "Yes keep all functions of the Ui but u copied it down to the yellow and beige diagonal lines is
   what I mean. Take from bait and nuke or The face as inspiration. Just make sure the functions of the game are fire".
   So: every FUNCTION kept; the LOOK is his own two apps (refs-1111/coo-site/OUR_LOOK_THE_STORYBOOK_795.md): night glass panels with a 1 px glowing line,
   Rouge's red as the hero, signal mint for go / ready / your path, gold for rewards, violet and blue for magic and night, letter-spaced mono eyebrows
   ("HOME ISLAND // MORNING"), the Face's outlined pill chips, glow-in motion, faint radar rings. No paper, no stripes, no stamps.

   FONTS (SIL OFL 1.1, bundled in assets/fonts795/, licences beside them, rows in face/sources-ledger.json and LICENSES.md):
     display  'U795 Display' = Space Grotesk 600-700 (headlines, names, buttons)
     body     'U795 Body'    = Space Grotesk 400-500 (reading text)
     mono     'U795 Mono'    = Space Mono 400/700 (eyebrows, numbers, place · time · weather lines)

   ===== THE API (STABLE: hud795.js, show795.js and others build on it; add, never rename) =====
   window.UI795
     .version                      '795.2' (the house style; every 795.1 name kept)
     .C                            the colour set { paper (the panel), paper2, ink (the text and its line), ink2 (dim), rouge, flame, sun (gold), sea (signal mint),
                                   deep, leaf, sky (blue), sand (amber), dusk (violet), night (the void), line }
     tokens (CSS)                  --u7-head / --u7-display (Space Grotesk), --u7-body, --u7-mono (Space Mono), --u7-mint, --u7-gold, --u7-line, --u7-glow, --u7-rings ...
     .css(text)                    inject one more <style> (once per text); the kit's own CSS is injected on load
     .layer()                      the fixed overlay root (#u795, above the game, pointer-events only on its cards)
     .fontsReady                   Promise: the faces loaded (or failed quietly)
     .reduced                      true when the device asks for reduced motion (every animation below shortens to a fade)
     .el(tag, cls, html)           tiny DOM helper
   MOTION (each returns a Promise that resolves when the motion ends)
     .slam(el, {from, delay, dur})           a panel arrives: it glows in, rising 8 px, with one short pulse of light (the old name kept; no throw, no tilt)
     .leave(el, {to, dur})                   the reverse; removes el at the end unless {keep:true}
     .transition(fn, {kind, colour, dur})    cover the screen (kind: 'wipe' a sweep of night with a mint edge | 'fade' | 'bloom' a ring of light), run fn, uncover
     .type(el, text, {cps, onChar})          types text out (longer pauses at . , ! ? :); returns {done: Promise, skip()}
     .countUp(el, from, to, {dur, fmt})      a number that rolls
   PIECES (each returns an HTMLElement unless said)
     .card({kicker, title, body, tone, cls})                the one panel: night glass, a 1 px glowing line (tone: 'paper' | 'sun' | 'sea' | 'night' | 'rouge')
     .stamp(text, {colour, big})                            an outlined PILL chip with a glowing dot (the old name kept; .stampIn or el.classList.add('u7-in') glows it in)
     .badge(n, {tone})                                      a mono number in a glowing ring '01'
     .checklist(items[{id, label}])                         -> {el, active(id), tick(id), all()}: glowing pills that light up
     .icon(name, 'light')                                   SVG string ('light': white lines + glow, for dark glass): sun, partsun, cloud, rain, storm, night, wind, calm, pin, nest, star, heart, shop, hawk, next, lock, tap, feather
     .portrait(who)                                         SVG string: eagle, rouge, grandma, villager, crow, owl (sits in a glowing ring badge)
     .radar(el)                                             adds the faint breathing radar rings behind el's content
   COMPONENTS
     .speech({who, name, text, side, parent, cps})          -> {el, say(text) -> Promise, close()}  ring portrait + glass bubble, typed
     .placeCard({kicker, place, area, day, time, weather, icon, stamp, parent, hold})  -> {el, done: Promise, close()}  the arrival card (red edge)
     .menu({items[{title, sub, onPick, locked, badge}], parent, keys, title})          -> {el, select(i), destroy()}  glass rows, mono index
     .missionCard({n, pic, place, time, title, line, locked, lockedLine, next, stamp, onPick})  -> el   (pic: SVG string, element or URL)
     .vignette(kind)                                        SVG string, a small line-light picture for a card: coast, village, hills, night, lake, peak
     .whatsNew({items, max, title})                         -> el   (items default to UI795.SHIPS, newest first)
     .toast(text, {kicker, icon, ms, tone})                 -> el   (two at most on screen; the older one leaves)
     .legend({title, items[{mark, name, line}]})            -> el   (mark: an icon name or an SVG string)
     .dressTalk({box, who, text})                           the game's own talk box (#talk) dressed in the kit: the speaker's ring portrait, the glass panel,
                                                            the words typed out OVER the real text (the text node itself always holds the whole line, so
                                                            every guard that reads #talkText still reads it); a tap on the panel finishes the typing.
                                                            Scripture lines (they carry a <small> reference) and the Dove are never typed or dressed.
   DATA
     .SHIPS                         the ship log, newest first: {n, title, line}; each number a real "Ship #n" on the site (tests/ui795.js checks)
   Every word on screen here is a DRAFT for Marth's pen. */
(function () {
  'use strict';
  if (window.UI795) return;
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.slice(0, s.lastIndexOf('/') + 1) : ''; })();
  /* Bait & Nuke and the Face, in Wings for Rouge's words: paper = the glass panel, ink = the text and its line */
  var C = { paper: '#0e121e', paper2: '#121820', ink: '#e9edf8', ink2: '#95a0bd', rouge: '#ff3b42', flame: '#ff6b6b', sun: '#ffd45c', sea: '#4de8c9',
    deep: '#235952', leaf: '#49d6a0', sky: '#6ea8ff', sand: '#ffb454', dusk: '#b48cff', night: '#05060c', line: 'rgba(120,140,210,.22)' };
  var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var injected = {};
  function css(text) { if (injected[text]) return; injected[text] = 1; var s = document.createElement('style'); s.setAttribute('data-ui795', ''); s.textContent = text; (document.head || document.documentElement).appendChild(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- the type system, the panel, the colours ---------- */
  var F_DISPLAY = "'U795 Display', 'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif";
  var F_BODY = "'U795 Body', 'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif";
  var F_MONO = "'U795 Mono', 'Space Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  var RINGS = 'repeating-radial-gradient(circle at 50% 50%,rgba(77,232,201,0) 0 58px,rgba(77,232,201,.10) 58px 59.5px)';
  css(
    "@font-face{font-family:'U795 Display';src:url('" + BASE + "assets/fonts795/spacegrotesk-latin.woff2') format('woff2');font-weight:300 700;font-style:normal;font-display:swap}" +
    "@font-face{font-family:'U795 Body';src:url('" + BASE + "assets/fonts795/spacegrotesk-latin.woff2') format('woff2');font-weight:300 700;font-style:normal;font-display:swap}" +
    "@font-face{font-family:'U795 Mono';src:url('" + BASE + "assets/fonts795/spacemono-400-latin.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap}" +
    "@font-face{font-family:'U795 Mono';src:url('" + BASE + "assets/fonts795/spacemono-700-latin.woff2') format('woff2');font-weight:700;font-style:normal;font-display:swap}" +
    ':root{--u7-paper:rgba(14,18,30,.86);--u7-paper2:' + C.paper2 + ';--u7-ink:' + C.ink + ';--u7-ink2:' + C.ink2 + ';--u7-rouge:' + C.rouge + ';--u7-flame:' + C.flame +
      ';--u7-sun:' + C.sun + ';--u7-sea:' + C.sea + ';--u7-deep:' + C.deep + ';--u7-leaf:' + C.leaf + ';--u7-sky:' + C.sky + ';--u7-sand:' + C.sand + ';--u7-dusk:' + C.dusk + ';--u7-night:' + C.night +
      ';--u7-line:' + C.line + ';--u7-mint:' + C.sea + ';--u7-gold:' + C.sun + ';--u7-violet:' + C.dusk + ';--u7-blue:' + C.sky +
      ';--u7-display:' + F_DISPLAY + ';--u7-head:' + F_DISPLAY + ';--u7-body:' + F_BODY + ';--u7-mono:' + F_MONO + ';--u7-grain:none;--u7-fibre:none;--u7-rings:' + RINGS +
      ';--u7-edge:1px solid var(--u7-line);--u7-radius:16px;--u7-shadow:0 14px 34px -10px rgba(0,0,0,.6),0 0 0 1px rgba(120,140,210,.06);' +
      '--u7-glow:0 0 0 1px rgba(77,232,201,.35),0 0 18px -2px rgba(77,232,201,.35);--u7-glow-red:0 0 0 1px rgba(255,59,66,.5),0 0 20px -2px rgba(255,59,66,.45);' +
      '--u7-safe-t:env(safe-area-inset-top,0px);--u7-safe-b:env(safe-area-inset-bottom,0px);--u7-safe-l:env(safe-area-inset-left,0px);--u7-safe-r:env(safe-area-inset-right,0px)}' +
    '#u795{position:fixed;inset:0;z-index:60;pointer-events:none;font-family:var(--u7-body);color:var(--u7-ink)}' +
    ':where(#u795)>*{pointer-events:auto}' +   /* zero specificity: a module's own pointer-events:none (a ring, a glow) always wins over this */
    '.u7-display{font-family:var(--u7-display);font-weight:700;letter-spacing:-.015em;line-height:1.02}' +
    '.u7-kicker{display:flex;align-items:center;gap:8px;font-family:var(--u7-mono);font-weight:400;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--u7-mint)}' +
    '.u7-kicker:before{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}' +
    '.u7-body{font-family:var(--u7-body);font-weight:400;font-size:14.5px;line-height:1.45;color:var(--u7-ink)}' +
    /* THE PANEL: night glass over the world, a 1 px line, a soft inner glow */
    '.u7-card{position:relative;box-sizing:border-box;background:var(--u7-paper);-webkit-backdrop-filter:blur(12px) saturate(1.2);backdrop-filter:blur(12px) saturate(1.2);' +
      'border:var(--u7-edge);border-radius:var(--u7-radius);box-shadow:var(--u7-shadow),inset 0 1px 0 rgba(255,255,255,.06),inset 0 0 40px rgba(77,232,201,.035);' +
      'padding:14px 16px;color:var(--u7-ink);font-family:var(--u7-body)}' +
    '.u7-card.t-sun{border-color:rgba(255,212,92,.45);box-shadow:var(--u7-shadow),0 0 22px -6px rgba(255,212,92,.4)}' +
    '.u7-card.t-sea{border-color:rgba(77,232,201,.45);box-shadow:var(--u7-shadow),var(--u7-glow)}' +
    '.u7-card.t-rouge{background:linear-gradient(180deg,rgba(64,14,22,.82),rgba(30,8,14,.86));border-color:rgba(255,59,66,.38)}' +
    '.u7-card.t-night{background:rgba(5,6,12,.9)}' +
    '.u7-card .u7-title{font-family:var(--u7-display);font-weight:700;font-size:24px;line-height:1.05;letter-spacing:-.015em;margin:6px 0 6px}' +
    '.u7-card .u7-band{position:absolute;left:16px;right:16px;top:-1px;height:2px;border-radius:2px;background:var(--u7-rouge);box-shadow:0 0 12px var(--u7-rouge)}' +
    /* the pill (the old stamp): the Face's outlined chip with a glowing dot */
    '.u7-stamp{display:inline-flex;align-items:center;gap:7px;font-family:var(--u7-mono);font-weight:700;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--st,' + C.sea + ');' +
      'border:1px solid currentColor;border-radius:999px;padding:4px 11px 4px 9px;background:rgba(5,6,12,.72);white-space:nowrap;opacity:0;box-shadow:0 0 14px -4px currentColor}' +
    '.u7-stamp:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}' +
    '.u7-stamp.big{font-size:13px;padding:6px 14px 6px 11px}' +
    '.u7-stamp.u7-in{animation:u7pill .55s ease-out both}' +
    '@keyframes u7pill{0%{opacity:0;transform:translateY(6px);filter:brightness(2.2)}60%{opacity:1;filter:brightness(1.6)}100%{opacity:1;transform:none;filter:none}}' +
    /* the number badge: mono in a glowing ring */
    '.u7-badge{display:inline-grid;place-items:center;min-width:36px;height:36px;padding:0 4px;box-sizing:border-box;font-family:var(--u7-mono);font-weight:700;font-size:13px;line-height:1;color:var(--u7-ink2);' +
      'background:rgba(5,6,12,.6);border:1px solid var(--u7-line);border-radius:999px}' +
    '.u7-badge.t-sun{color:var(--u7-sun);border-color:rgba(255,212,92,.6);box-shadow:0 0 14px -3px rgba(255,212,92,.6)}.u7-badge.t-rouge{color:var(--u7-rouge);border-color:rgba(255,59,66,.6);box-shadow:var(--u7-glow-red)}.u7-badge.t-sea{color:var(--u7-mint);border-color:rgba(77,232,201,.6);box-shadow:var(--u7-glow)}' +
    /* the checklist: glowing pills */
    '.u7-checks{display:flex;flex-wrap:wrap;gap:6px}' +
    '.u7-chip{display:inline-flex;align-items:center;gap:6px;min-width:0;padding:5px 10px 5px 8px;border:1px solid var(--u7-line);border-radius:999px;font-family:var(--u7-mono);font-weight:400;font-size:10px;' +
      'letter-spacing:.14em;text-transform:uppercase;color:#5f6a86;background:rgba(5,6,12,.45);transition:color .3s,border-color .3s,box-shadow .3s}' +
    '.u7-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.u7-chip i{flex:none;width:7px;height:7px;border-radius:50%;background:currentColor;position:relative}' +
    '.u7-chip svg{display:none}' +
    '.u7-chip.doing{color:var(--u7-sun);border-color:rgba(255,212,92,.55);box-shadow:0 0 14px -4px rgba(255,212,92,.7)}' +
    '.u7-chip.doing i{animation:u7pulse 1s ease-in-out infinite;box-shadow:0 0 8px currentColor}' +
    '.u7-chip.done{color:var(--u7-mint);border-color:rgba(77,232,201,.45)}' +
    '.u7-chip.done i{box-shadow:0 0 8px currentColor}' +
    '@keyframes u7pulse{50%{opacity:.35;transform:scale(.7)}}' +
    /* the speech: a portrait in a glowing ring, a glass bubble */
    '.u7-speech{display:flex;align-items:flex-start;gap:12px;max-width:440px}' +
    '.u7-speech.right{flex-direction:row-reverse}' +
    '.u7-face{flex:none;display:grid;justify-items:center;gap:6px}' +
    '.u7-face .u7-disc{width:60px;height:60px;border-radius:50%;border:1.5px solid rgba(255,59,66,.75);background:radial-gradient(circle at 50% 40%,#1b2140,#0a0d18 72%);box-shadow:0 0 0 4px rgba(255,59,66,.10),0 0 22px -2px rgba(255,59,66,.55);overflow:hidden}' +
    '.u7-speech.right .u7-face .u7-disc{border-color:rgba(77,232,201,.75);box-shadow:0 0 0 4px rgba(77,232,201,.10),0 0 22px -2px rgba(77,232,201,.5)}' +
    '.u7-face .u7-disc svg{width:100%;height:100%;display:block}' +
    '.u7-face b{font-family:var(--u7-mono);font-weight:700;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--u7-ink2);white-space:nowrap}' +
    '.u7-bubble{position:relative;flex:1;min-width:0;padding:11px 14px 12px;font-size:15px;font-weight:400;line-height:1.45;min-height:46px}' +
    '.u7-bubble .u7-caret{display:inline-block;width:7px;height:14px;margin-left:4px;border-radius:1px;background:var(--u7-mint);vertical-align:-2px;box-shadow:0 0 8px var(--u7-mint);animation:u7blink 1s steps(2) infinite}' +
    '.u7-bubble.typing .u7-caret{animation:none;opacity:.5}' +
    '@keyframes u7blink{50%{opacity:0}}' +
    /* the arrival card: glass, a red edge, an eyebrow, the name big, a mono line */
    '.u7-place{position:absolute;left:calc(16px + var(--u7-safe-l));right:calc(16px + var(--u7-safe-r));bottom:calc(84px + var(--u7-safe-b));max-width:560px;padding:16px 18px 16px 20px;border-left:3px solid var(--u7-rouge);box-shadow:var(--u7-shadow),-8px 0 24px -12px var(--u7-rouge)}' +
    '.u7-place .u7-kick{display:flex;align-items:center;gap:8px;font-family:var(--u7-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--u7-mint)}' +
    '.u7-place .u7-kick:before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}' +
    '.u7-place h2{margin:8px 0 4px;font-family:var(--u7-display);font-weight:700;font-size:clamp(36px,11vw,60px);line-height:.98;letter-spacing:-.03em;color:var(--u7-ink);text-wrap:balance}' +
    '.u7-place .u7-area{font-family:var(--u7-body);font-weight:500;font-size:14px;color:var(--u7-ink2);margin-bottom:12px}' +
    '.u7-place .u7-when{display:flex;align-items:center;gap:9px;padding-top:10px;border-top:1px solid var(--u7-line);font-family:var(--u7-mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;line-height:1.45;color:var(--u7-ink)}' +
    '.u7-place .u7-when svg{flex:none;width:22px;height:22px}' +
    '.u7-place .u7-stamp{position:absolute;right:14px;top:14px}' +
    /* the menu: glass rows, a mono index, a true line under each */
    '.u7-menu{display:grid;gap:8px;width:min(100%,420px)}' +
    '.u7-menu h3{margin:0 0 4px 2px;font-family:var(--u7-mono);font-weight:400;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--u7-mint)}' +
    '.u7-item{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;width:100%;text-align:left;cursor:pointer;padding:12px 14px;font:inherit;color:var(--u7-ink);' +
      '-webkit-tap-highlight-color:transparent;transition:border-color .2s,box-shadow .25s,transform .2s}' +
    '.u7-item .u7-badge{min-width:30px;height:30px;font-size:11px}' +
    '.u7-item .u7-t{display:block;font-family:var(--u7-display);font-weight:600;font-size:20px;line-height:1.1;letter-spacing:-.01em}' +
    '.u7-item .u7-s{display:block;margin-top:4px;font-family:var(--u7-mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--u7-ink2);line-height:1.35}' +
    '.u7-item .u7-go{width:20px;height:20px;opacity:.35;transition:opacity .2s,transform .2s}' +
    '.u7-item.sel{border-color:rgba(255,59,66,.6);box-shadow:var(--u7-shadow),var(--u7-glow-red);transform:translateX(3px)}' +
    '.u7-item.sel .u7-t{color:#fff;text-shadow:0 0 14px rgba(255,59,66,.5)}.u7-item.sel .u7-badge{color:var(--u7-rouge);border-color:rgba(255,59,66,.6)}.u7-item.sel .u7-go{opacity:1;transform:translateX(2px)}' +
    '.u7-item.locked{opacity:.55}' +
    '.u7-item:active{transform:scale(.985)}' +
    /* the mission card: a line-light picture, a mono place · time, the title, one sentence, a status pill */
    '.u7-mission{display:grid;grid-template-rows:auto 1fr;padding:0;overflow:hidden;cursor:pointer;min-width:0}' +
    '.u7-mission .u7-pic{position:relative;height:118px;border-bottom:1px solid var(--u7-line);overflow:hidden;background:#05060c}' +
    '.u7-mission .u7-pic>svg,.u7-mission .u7-pic>img{width:100%;height:100%;display:block;object-fit:cover}' +
    '.u7-mission>.u7-badge{position:absolute;left:10px;top:10px;z-index:2;background:rgba(5,6,12,.75)}' +
    '.u7-mission .u7-next{position:absolute;right:10px;top:10px;z-index:2;display:inline-flex;align-items:center;gap:6px;font-family:var(--u7-mono);font-weight:700;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--u7-mint);border:1px solid rgba(77,232,201,.6);border-radius:999px;padding:3px 9px;background:rgba(5,6,12,.75);box-shadow:var(--u7-glow)}' +
    '.u7-mission .u7-next:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}' +
    '.u7-mission .u7-txt{padding:11px 14px 14px}' +
    '.u7-mission .u7-where{font-family:var(--u7-mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--u7-ink2)}' +
    '.u7-mission h4{margin:5px 0 4px;font-family:var(--u7-display);font-weight:700;font-size:20px;line-height:1.1;letter-spacing:-.01em}' +
    '.u7-mission p{margin:0;font-weight:400;font-size:13.5px;line-height:1.45;color:var(--u7-ink)}' +
    '.u7-mission.locked .u7-pic>*{filter:grayscale(.7) brightness(.55)}' +
    '.u7-mission.locked .u7-stamp{position:absolute;right:10px;top:10px;z-index:3;opacity:1}' +
    '.u7-mission.locked p{color:var(--u7-ink2)}' +
    /* since you last flew */
    '.u7-new{margin:0;padding:0;list-style:none;display:grid;gap:9px}' +
    '.u7-new li{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:baseline;font-size:13px;line-height:1.4}' +
    '.u7-new li em{font-style:normal;font-family:var(--u7-mono);font-size:10px;letter-spacing:.06em;color:var(--u7-sun);border:1px solid rgba(255,212,92,.4);border-radius:999px;padding:1px 7px}' +
    '.u7-new li b{font-family:var(--u7-display);font-weight:600;color:var(--u7-ink)}' +
    '.u7-new li span{color:var(--u7-ink2);font-weight:400}' +
    '.u7-newcard h5{margin:0 0 10px;display:flex;align-items:center;gap:8px;font-family:var(--u7-mono);font-weight:400;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--u7-sun)}' +
    '.u7-newcard h5:before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}' +
    '.u7-newcard h5:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(255,212,92,.4),transparent)}' +
    /* the toast */
    '.u7-toasts{position:absolute;left:0;right:0;top:calc(12px + var(--u7-safe-t));display:grid;justify-items:center;gap:8px;pointer-events:none}' +
    '.u7-toast{display:flex;align-items:center;gap:11px;max-width:min(92vw,420px);padding:9px 16px 10px 10px;pointer-events:auto;border-radius:999px}' +
    '.u7-toast svg{flex:none;width:28px;height:28px;padding:5px;border-radius:50%;border:1px solid var(--u7-line);background:rgba(5,6,12,.6)}' +
    '.u7-toast .u7-kicker{font-size:9.5px;margin-bottom:2px}' +
    '.u7-toast .u7-tx{display:block;font-weight:500;font-size:14px;line-height:1.35}' +
    /* the legend: the key */
    '.u7-legend ul{margin:10px 0 0;padding:0;list-style:none;display:grid;gap:10px}' +
    '.u7-legend li{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:start}' +
    '.u7-legend li svg{width:34px;height:34px;padding:6px;box-sizing:border-box;border-radius:50%;border:1px solid var(--u7-line);background:rgba(5,6,12,.55)}' +
    '.u7-legend li b{display:block;font-family:var(--u7-display);font-weight:600;font-size:14px}' +
    '.u7-legend li span{display:block;font-weight:400;font-size:12.5px;line-height:1.4;color:var(--u7-ink2)}' +
    '.u7-legend h5{margin:0;display:flex;align-items:center;gap:8px;font-family:var(--u7-mono);font-weight:400;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--u7-mint)}' +
    '.u7-legend h5:before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}' +
    /* the radar rings */
    '.u7-radar{position:relative;isolation:isolate}' +
    '.u7-radar:before{content:"";position:absolute;left:50%;top:50%;width:620px;height:620px;margin:-310px 0 0 -310px;border-radius:50%;background:var(--u7-rings);z-index:-1;pointer-events:none;' +
      '-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%);animation:u7breathe 6s ease-in-out infinite}' +
    '@keyframes u7breathe{50%{transform:scale(1.06);opacity:.6}}' +
    /* the scene cover */
    '.u7-cover{position:fixed;inset:0;z-index:90;pointer-events:all}' +
    '.u7-cover.wipe{background:var(--cv,' + C.night + ');box-shadow:24px 0 0 -20px ' + C.sea + ',0 0 60px 10px rgba(77,232,201,.35)}' +
    '.u7-cover.fade{background:var(--cv,' + C.night + ')}' +
    '.u7-cover.bloom{background:radial-gradient(circle at 50% 50%,rgba(5,6,12,0) 0,rgba(5,6,12,0) 20%,rgba(77,232,201,.5) 23%,rgba(5,6,12,.95) 30%)}' +
    '@media (prefers-reduced-motion:reduce){.u7-chip.doing i,.u7-bubble .u7-caret,.u7-radar:before{animation:none}}'
  );
  function layer() { var L = document.getElementById('u795'); if (!L) { L = el('div'); L.id = 'u795'; (document.body || document.documentElement).appendChild(L); } return L; }
  var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load("700 40px 'U795 Display'"), document.fonts.load("400 14px 'U795 Body'"), document.fonts.load("400 12px 'U795 Mono'")]).catch(function () {}) : Promise.resolve();

  /* ---------- motion: glow-in, never thrown ---------- */
  function anim(e, frames, o) { if (!e.animate) return Promise.resolve(); var a = e.animate(frames, o); return a.finished ? a.finished.catch(function () {}) : new Promise(function (r) { a.onfinish = r; }); }
  function slam(e, o) {
    o = o || {}; var d = o.dur || 520, dl = o.delay || 0;
    if (reduced) return anim(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: dl, fill: 'both' });
    var from = { up: 'translateY(-8px)', down: 'translateY(8px)', left: 'translateX(-10px)', right: 'translateX(10px)' }[o.from || 'down'] || 'translateY(8px)';
    return anim(e, [
      { opacity: 0, transform: from, filter: 'brightness(1.9) saturate(1.3)', offset: 0 },
      { opacity: 1, transform: 'none', filter: 'brightness(1.35)', offset: 0.55 },
      { opacity: 1, transform: 'none', filter: 'none', offset: 1 }
    ], { duration: d, delay: dl, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }).then(function () { if (e.getAnimations) e.getAnimations().forEach(function (a) { try { a.cancel(); } catch (x) {} }); e.style.opacity = ''; });
  }
  function leave(e, o) {
    o = o || {}; var to = { up: 'translateY(-8px)', down: 'translateY(10px)', left: 'translateX(-14px)', right: 'translateX(14px)' }[o.to || 'down'];
    return anim(e, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: to }], { duration: reduced ? 150 : (o.dur || 280), easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' })
      .then(function () { if (!o.keep && e.parentNode) e.parentNode.removeChild(e); });
  }
  function transition(fn, o) {
    o = o || {}; var kind = reduced ? 'fade' : (o.kind || 'wipe'), d = o.dur || (kind === 'wipe' ? 460 : 400);
    var cv = el('div', 'u7-cover ' + kind); if (o.colour) cv.style.setProperty('--cv', o.colour); document.body.appendChild(cv);
    var inF = kind === 'wipe' ? [{ transform: 'translateX(-105%)' }, { transform: 'translateX(0)' }] : kind === 'bloom' ? [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(3)' }] : [{ opacity: 0 }, { opacity: 1 }];
    var outF = kind === 'wipe' ? [{ transform: 'translateX(0)' }, { transform: 'translateX(105%)' }] : kind === 'bloom' ? [{ opacity: 1, transform: 'scale(3)' }, { opacity: 0, transform: 'scale(4)' }] : [{ opacity: 1 }, { opacity: 0 }];
    return anim(cv, inF, { duration: d, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'both' })
      .then(function () { return fn ? fn() : null; })
      .then(function () { return anim(cv, outF, { duration: d, delay: o.hold || 60, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'both' }); })
      .then(function () { cv.remove(); });
  }
  function type(e, text, o) {
    o = o || {}; var cps = o.cps || 38, i = 0, timer = null, done, stop = false;
    text = String(text); e.textContent = '';
    var p = new Promise(function (r) { done = r; });
    function finish() { if (stop) return; stop = true; clearTimeout(timer); e.textContent = text; done(); }
    function step() {
      if (stop) return; i++; e.textContent = text.slice(0, i); if (o.onChar) try { o.onChar(text[i - 1], i); } catch (x) {}
      if (i >= text.length) { finish(); return; }
      var c = text[i - 1], w = 1000 / cps; if (/[.!?]/.test(c)) w *= 7; else if (/[,;:]/.test(c)) w *= 3.5;
      timer = setTimeout(step, w);
    }
    if (reduced || !text.length) finish(); else timer = setTimeout(step, o.delay || 80);
    return { done: p, skip: finish };
  }
  function countUp(e, a, b, o) {
    o = o || {}; var d = reduced ? 0 : (o.dur || 600), t0 = performance.now(), fmt = o.fmt || function (v) { return String(Math.round(v)); };
    return new Promise(function (r) { (function f(now) { var k = d ? Math.min(1, (now - t0) / d) : 1, q = 1 - Math.pow(1 - k, 3); e.textContent = fmt(a + (b - a) * q); if (k < 1) requestAnimationFrame(f); else r(); })(t0); });
  }
  function radar(e) { if (e && e.classList) e.classList.add('u7-radar'); return e; }

  /* ---------- icons, portraits, small paintings (all drawn in code) ---------- */
  var INK = C.ink;
  var ICONS = {
    sun: "<circle cx='16' cy='16' r='6.5' fill='" + C.sun + "' stroke='" + INK + "' stroke-width='2'/><g stroke='" + INK + "' stroke-width='2' stroke-linecap='round'><path d='M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8'/></g>",
    partsun: "<circle cx='12' cy='12' r='5.5' fill='" + C.sun + "' stroke='" + INK + "' stroke-width='2'/><g stroke='" + INK + "' stroke-width='2' stroke-linecap='round'><path d='M12 2.5v2.5M2.5 12H5M5.3 5.3l1.8 1.8M18.7 5.3l-1.8 1.8'/></g><path d='M9 26h15a5 5 0 0 0 0-10 7 7 0 0 0-13 2 4 4 0 0 0-2 8z' fill='#fffaf0' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/>",
    cloud: "<path d='M7 25h17a6 6 0 0 0 0-12 8 8 0 0 0-15 2.5A5 5 0 0 0 7 25z' fill='#fffaf0' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/><path d='M10 22h12' stroke='#c9d6dc' stroke-width='2.5' stroke-linecap='round'/>",
    rain: "<path d='M7 19h17a6 6 0 0 0 0-12 8 8 0 0 0-15 2.5A5 5 0 0 0 7 19z' fill='#e9eef2' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/><g stroke='" + C.sea + "' stroke-width='2.4' stroke-linecap='round'><path d='M10 23l-1.5 4M16 23l-1.5 4M22 23l-1.5 4'/></g>",
    storm: "<path d='M7 18h17a6 6 0 0 0 0-12 8 8 0 0 0-15 2.5A5 5 0 0 0 7 18z' fill='#c9cfd8' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/><path d='M17 18l-4 6h4l-2 6 6-8h-4l2-4z' fill='" + C.sun + "' stroke='" + INK + "' stroke-width='1.6' stroke-linejoin='round'/>",
    night: "<path d='M20 4a11 11 0 1 0 8 17A10 10 0 0 1 20 4z' fill='#f6e7b0' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/><circle cx='9' cy='8' r='1.3' fill='" + INK + "'/><circle cx='26' cy='9' r='1' fill='" + INK + "'/>",
    wind: "<g fill='none' stroke='" + INK + "' stroke-width='2.4' stroke-linecap='round'><path d='M4 12h15a4 4 0 1 0-4-4'/><path d='M4 18h20a4 4 0 1 1-4 4'/><path d='M4 24h9'/></g>",
    calm: "<path d='M3 22q4-3 8 0t8 0 8 0' fill='none' stroke='" + C.sea + "' stroke-width='2.4' stroke-linecap='round'/><circle cx='16' cy='12' r='5' fill='" + C.sun + "' stroke='" + INK + "' stroke-width='2'/>",
    pin: "<path d='M16 29s9-9 9-16a9 9 0 0 0-18 0c0 7 9 16 9 16z' fill='" + C.rouge + "' stroke='" + INK + "' stroke-width='2'/><circle cx='16' cy='13' r='3.4' fill='#fff6e8' stroke='" + INK + "' stroke-width='1.6'/>",
    nest: "<path d='M4 16h24q-2 9-12 9T4 16z' fill='#b98a4e' stroke='" + INK + "' stroke-width='2'/><path d='M6 18q10 3 20 0M8 21q8 2 16 0' stroke='" + INK + "' stroke-width='1.2' fill='none'/><ellipse cx='13' cy='14' rx='3.2' ry='3.8' fill='#e9f4f5' stroke='" + INK + "' stroke-width='1.6'/><ellipse cx='19' cy='14' rx='3.2' ry='3.8' fill='#e9f4f5' stroke='" + INK + "' stroke-width='1.6'/>",
    star: "<path d='M16 3l3.8 8 8.7 1-6.4 6 1.7 8.6L16 22.4 8.2 26.6 9.9 18 3.5 12l8.7-1z' fill='" + C.sun + "' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/>",
    heart: "<path d='M16 27S4 19.5 4 11.5A6 6 0 0 1 16 9a6 6 0 0 1 12 2.5C28 19.5 16 27 16 27z' fill='" + C.rouge + "' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/>",
    shop: "<path d='M5 13h22v14H5z' fill='#fff6e8' stroke='" + INK + "' stroke-width='2'/><path d='M3 13l3-7h20l3 7q-2 3-4.4 0-2.2 3-4.4 0-2.2 3-4.4 0-2.2 3-4.4 0-2.2 3-4.4 0Q5 16 3 13z' fill='" + C.flame + "' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/><path d='M13 27v-7h6v7' fill='" + C.sea + "' stroke='" + INK + "' stroke-width='2'/>",
    hawk: "<path d='M2 14q7-5 14 1 7-6 14-1-6 1-10 5l-4 5-4-5q-4-4-10-5z' fill='#6a4a33' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/><circle cx='16' cy='13' r='2.4' fill='#f2b134' stroke='" + INK + "' stroke-width='1.4'/>",
    next: "<path d='M16 3l13 13-13 13L3 16z' fill='" + C.sun + "' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/><path d='M13 10l6 6-6 6' fill='none' stroke='" + INK + "' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/>",
    lock: "<rect x='7' y='14' width='18' height='14' rx='3' fill='" + C.paper2 + "' stroke='" + INK + "' stroke-width='2'/><path d='M11 14v-4a5 5 0 0 1 10 0v4' fill='none' stroke='" + INK + "' stroke-width='2.4'/><circle cx='16' cy='21' r='2' fill='" + INK + "'/>",
    tap: "<circle cx='16' cy='16' r='12' fill='none' stroke='" + C.rouge + "' stroke-width='2' stroke-dasharray='3 3'/><circle cx='16' cy='16' r='5' fill='" + C.rouge + "' stroke='" + INK + "' stroke-width='2'/>",
    feather: "<path d='M27 4C15 5 7 13 6 24l-2 4 3-2c11-1 19-9 20-22z' fill='" + C.rouge + "' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/><path d='M7 25L22 9' stroke='#fff6e8' stroke-width='1.6' stroke-linecap='round'/>"
  };
  function icon(n, o) {   /* o: 'light' (or {light:true}) = the variant for dark glass: white lines a little heavier, a soft glow */
    var b = ICONS[n] || ICONS.star, light = o === 'light' || (o && o.light);
    if (light) b = b.split("stroke='" + INK + "'").join("stroke='#ffffff'").replace(/stroke-width='(\d+(?:\.\d+)?)'/g, function (m, w) { return "stroke-width='" + (+w + 0.6) + "'"; });
    return "<svg viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'" + (light ? " style='filter:drop-shadow(0 0 3px rgba(233,237,248,.55))'" : '') + '>' + b + '</svg>'; }
  var PORTRAITS = {
    /* the Eagle: white head, a heavy brow, gold eye, a hooked beak; the brown of his shoulders (the game's own colours) */
    eagle: "<path d='M-4 74C2 52 14 46 30 46s30 6 38 28z' fill='#6b4426' stroke='" + INK + "' stroke-width='2.2'/><path d='M14 60q8-8 16-6M38 58q10-4 18 4' stroke='#4a2e18' stroke-width='2' fill='none' stroke-linecap='round'/>" +
      "<path d='M12 44c-4-14 4-28 20-30 13-2 22 6 23 16 1 7-2 12-6 16-8 7-30 8-37-2z' fill='#f5f1e6' stroke='" + INK + "' stroke-width='2.2'/>" +
      "<path d='M16 30q4-3 9-2M20 40q4 2 8 1' stroke='#cfc6b2' stroke-width='1.6' fill='none' stroke-linecap='round'/>" +
      "<path d='M44 27c8-1 15 3 16 9 1 4-1 8-4 9 0-4-3-6-7-6-3 0-6 1-8 0z' fill='#f2b134' stroke='" + INK + "' stroke-width='2.2' stroke-linejoin='round'/><path d='M45 34q6-1 11 2' stroke='" + INK + "' stroke-width='1.4' fill='none'/>" +
      "<circle cx='39' cy='27' r='4.2' fill='#f2c230' stroke='" + INK + "' stroke-width='1.8'/><circle cx='40' cy='27.4' r='2' fill='" + INK + "'/><circle cx='40.7' cy='26.4' r='.7' fill='#fff'/>" +
      "<path d='M32 21.5q7-3.5 13 .5' stroke='" + INK + "' stroke-width='3' fill='none' stroke-linecap='round'/>",
    /* Rouge: a small red cardinal, her crest up, the black mask, the orange beak */
    rouge: "<path d='M-2 76C4 56 16 50 32 50s28 8 34 26z' fill='#b81e30' stroke='" + INK + "' stroke-width='2.2'/>" +
      "<path d='M16 50c-6-10-3-22 6-27-1-6 0-12 4-16 1 5 4 8 8 9 2-4 6-6 10-6-2 4-3 7-2 10 8 4 12 12 10 21-2 8-9 13-18 13-8 0-14-1-18-4z' fill='#d8283a' stroke='" + INK + "' stroke-width='2.2' stroke-linejoin='round'/>" +
      "<path d='M33 30c6-2 13 0 17 4 2 3 2 7 0 10-4 3-12 3-17-1-3-3-3-10 0-13z' fill='#1a0a10'/>" +
      "<path d='M46 33l12 4-12 5z' fill='#f28c28' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/>" +
      "<circle cx='40' cy='34' r='3' fill='#fff'/><circle cx='40.6' cy='34.4' r='1.6' fill='" + INK + "'/>" +
      "<path d='M22 34q2 6 8 8' stroke='#ef6a76' stroke-width='2' fill='none' stroke-linecap='round' opacity='.7'/>",
    /* Grandma: soft and quiet: a pale rose bird, eyes closed in a smile, a hibiscus behind her ear (handled gently) */
    grandma: "<path d='M-2 76C4 56 16 50 32 50s28 8 34 26z' fill='#d9b8b2' stroke='" + INK + "' stroke-width='2'/>" +
      "<path d='M15 50c-5-12 0-26 15-28 12-2 21 6 22 17 1 9-6 15-16 16-10 1-17-1-21-5z' fill='#f1dcd4' stroke='" + INK + "' stroke-width='2'/>" +
      "<path d='M49 34l9 3-9 4z' fill='#e9b26b' stroke='" + INK + "' stroke-width='1.8' stroke-linejoin='round'/>" +
      "<path d='M36 33q3 3 6 0' stroke='" + INK + "' stroke-width='2' fill='none' stroke-linecap='round'/><circle cx='31' cy='40' r='3' fill='#f3a9a4' opacity='.6'/>" +
      "<g transform='translate(20 22)'><circle r='3' fill='#f6d36a'/><path d='M0-3c-4-6-10-4-9 0 1 3 6 3 9 0zM3 0c6-4 10 1 7 4-3 2-7 0-7-4zM0 3c3 6-1 10-4 8-3-2-1-6 4-8zM-3 0c-6 2-8-3-5-5 3-2 6 1 5 5z' fill='" + C.rouge + "' stroke='" + INK + "' stroke-width='1.2'/></g>",
    /* a villager: a neighbour in a straw hat */
    villager: "<path d='M-2 76C4 58 16 54 32 54s28 6 34 22z' fill='" + C.sea + "' stroke='" + INK + "' stroke-width='2.2'/>" +
      "<path d='M20 40c0-10 5-16 12-16s12 6 12 16-5 16-12 16-12-6-12-16z' fill='#8a5634' stroke='" + INK + "' stroke-width='2.2'/>" +
      "<path d='M8 28q24-8 48 0-4 3-12 2-12-12-24 0-8 1-12-2z' fill='#e9c46a' stroke='" + INK + "' stroke-width='2.2' stroke-linejoin='round'/><path d='M20 28q12-4 24 0' stroke='" + C.rouge + "' stroke-width='3' fill='none'/>" +
      "<circle cx='27' cy='40' r='1.8' fill='" + INK + "'/><circle cx='37' cy='40' r='1.8' fill='" + INK + "'/><path d='M27 47q5 4 10 0' stroke='" + INK + "' stroke-width='2' fill='none' stroke-linecap='round'/>",
    crow: "<path d='M-2 76C4 56 16 50 32 50s28 8 34 26z' fill='#25252d' stroke='" + INK + "' stroke-width='2.2'/><path d='M14 50c-4-14 4-26 18-27 12-1 20 7 20 17 0 9-7 14-17 15-10 1-17-1-21-5z' fill='#2a2a33' stroke='" + INK + "' stroke-width='2.2'/>" +
      "<path d='M46 30l16 6-16 6z' fill='#4a4a52' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/><circle cx='39' cy='33' r='3.2' fill='#d8d8e0'/><circle cx='40' cy='33.4' r='1.6' fill='" + INK + "'/><path d='M34 28q5-3 10 0' stroke='#d8d8e0' stroke-width='1.6' fill='none'/>",
    owl: "<path d='M-2 76C4 54 16 48 32 48s28 6 34 28z' fill='#8a6a4a' stroke='" + INK + "' stroke-width='2.2'/><path d='M12 50c-4-16 4-30 20-30s24 14 20 30c-4 6-36 6-40 0z' fill='#a9845e' stroke='" + INK + "' stroke-width='2.2'/>" +
      "<path d='M16 22l4-8 6 7M48 22l-4-8-6 7' fill='#a9845e' stroke='" + INK + "' stroke-width='2' stroke-linejoin='round'/><circle cx='24' cy='35' r='7' fill='#f6ead0' stroke='" + INK + "' stroke-width='1.8'/><circle cx='40' cy='35' r='7' fill='#f6ead0' stroke='" + INK + "' stroke-width='1.8'/>" +
      "<path d='M20 35q4 3 8 0M36 35q4 3 8 0' stroke='" + INK + "' stroke-width='2' fill='none' stroke-linecap='round'/><path d='M32 40l-3 5h6z' fill='#e9b26b' stroke='" + INK + "' stroke-width='1.4'/>"
  };
  function portrait(w) { return "<svg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" + (PORTRAITS[w] || PORTRAITS.eagle) + '</svg>'; }
  /* a small line-light picture for a card: the shapes drawn as glowing lines on the night, a little colour inside. Kinds: coast, village, hills, night, lake, peak */
  var VG = 0;
  function vignette(kind) {
    var k = kind || 'coast', id = 'u7v' + (++VG), M = C.sea, B = C.sky, G = C.sun, R = C.rouge;
    var s = "<svg viewBox='0 0 300 160' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'><defs><radialGradient id='" + id + "s' cx='.5' cy='.9' r='.9'><stop offset='0' stop-color='" + (k === 'night' ? '#141a3a' : k === 'peak' ? '#3a2240' : '#1a1838') + "'/><stop offset='1' stop-color='#05060c'/></radialGradient>" +
      "<filter id='" + id + "g' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='1.6' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter></defs>" +
      "<rect width='300' height='160' fill='url(#" + id + "s)'/><g fill='#e9edf8' opacity='.7'><circle cx='30' cy='22' r='.9'/><circle cx='82' cy='40' r='.7'/><circle cx='140' cy='14' r='.9'/><circle cx='196' cy='34' r='.6'/><circle cx='262' cy='18' r='.8'/><circle cx='118' cy='52' r='.6'/></g>" +
      "<g fill='none' stroke='" + M + "' stroke-opacity='.10'><circle cx='150' cy='120' r='40'/><circle cx='150' cy='120' r='80'/><circle cx='150' cy='120' r='120'/></g><g filter='url(#" + id + "g)' fill='none' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>";
    s += k === 'night' ? "<circle cx='232' cy='38' r='14' stroke='" + G + "' fill='rgba(255,212,92,.18)'/>" : "<circle cx='" + (k === 'peak' ? 150 : 228) + "' cy='" + (k === 'peak' ? 70 : 52) + "' r='" + (k === 'peak' ? 26 : 16) + "' stroke='" + G + "' fill='rgba(255,212,92,.22)'/>";
    if (k === 'peak') s += "<path d='M0 160L60 92 100 112 150 40 200 104 240 84 300 128V160z' stroke='" + B + "' fill='rgba(110,168,255,.10)'/><path d='M150 40l-14 26 10-4 6 8 8-8 8 4z' stroke='#e9edf8'/>";
    else s += "<path d='M0 104Q50 70 100 92T200 80T300 96' stroke='" + B + "'/><path d='M0 104Q50 70 100 92T200 80T300 96V160H0z' fill='rgba(110,168,255,.08)' stroke='none'/>";
    if (k === 'coast' || k === 'lake' || k === 'night') s += "<path d='M0 112H300' stroke='" + B + "' stroke-opacity='.6'/><path d='M20 126h40M120 136h60M210 122h50M60 148h50' stroke='" + M + "' stroke-opacity='.75'/>";
    if (k === 'village' || k === 'hills') s += "<path d='M0 120Q70 96 150 112T300 108' stroke='" + M + "'/><path d='M0 120Q70 96 150 112T300 108V160H0z' fill='rgba(73,214,160,.10)' stroke='none'/>";
    if (k === 'village') s += "<g stroke='" + M + "'><path d='M70 120h26v18H70z'/><path d='M66 121l17-13 17 13z' stroke='" + R + "'/><path d='M150 114h30v22h-30z'/><path d='M146 115l19-14 19 14z' stroke='" + R + "'/></g><rect x='75' y='124' width='5' height='5' fill='" + G + "'/><rect x='156' y='119' width='5' height='5' fill='" + G + "'/>";
    if (k === 'coast' || k === 'lake') s += "<path d='M0 130Q60 118 110 130T190 140 300 132' stroke='" + G + "' stroke-opacity='.8'/>";
    if (k === 'coast' || k === 'village' || k === 'hills') s += "<g stroke='" + M + "'><path d='M248 160q4-40 18-62'/><path d='M266 98q-26-6-40 10M266 98q24-10 34 6M266 98q-6-22 10-28M266 98q20 4 22 24M266 98q-24 6-26 26'/></g>";
    if (k === 'night') s += "<path d='M0 134Q80 120 160 136T300 130' stroke='" + M + "'/><rect x='60' y='122' width='6' height='5' fill='" + G + "'/><rect x='120' y='126' width='5' height='4' fill='" + G + "'/>";
    if (k !== 'night') s += "<path d='M118 64q5 -5 10 0q5 -5 10 0' stroke='#e9edf8' stroke-opacity='.8'/>";
    return s + '</g></svg>';
  }

  /* ---------- pieces ---------- */
  function card(o) {
    o = o || {}; var c = el('div', 'u7-card' + (o.tone && o.tone !== 'paper' ? ' t-' + o.tone : '') + (o.cls ? ' ' + o.cls : ''));
    var h = ''; if (o.band) h += "<i class='u7-band' style='background:" + o.band + ';box-shadow:0 0 12px ' + o.band + "'></i>";
    if (o.kicker) h += "<div class='u7-kicker'>" + esc(o.kicker) + '</div>';
    if (o.title) h += "<div class='u7-title'>" + esc(o.title) + '</div>';
    if (o.body) h += "<div class='u7-body'>" + esc(o.body) + '</div>';
    c.innerHTML = h; return c;
  }
  function stamp(text, o) { o = o || {}; var s = el('span', 'u7-stamp' + (o.big ? ' big' : ''), esc(text)); if (o.colour) s.style.setProperty('--st', o.colour); return s; }
  function stampIn(s, delay) { setTimeout(function () { s.classList.add('u7-in'); }, delay || 0); return s; }
  function badge(n, o) { o = o || {}; return el('span', 'u7-badge' + (o.tone ? ' t-' + o.tone : ''), esc(typeof n === 'number' ? (n < 10 ? '0' + n : String(n)) : n)); }
  function checklist(items) {
    var wrap = el('div', 'u7-checks'), map = {};
    items.forEach(function (it) { var c = el('div', 'u7-chip', '<i></i><span>' + esc(it.label) + '</span>'); c.dataset.id = it.id; map[it.id] = c; wrap.appendChild(c); });
    return { el: wrap,
      active: function (id) { var c = map[id]; if (c && !c.classList.contains('done')) c.classList.add('doing'); },
      tick: function (id) { var c = map[id]; if (c) { c.classList.remove('doing'); c.classList.add('done'); } },
      all: function () { Object.keys(map).forEach(function (k) { map[k].classList.remove('doing'); map[k].classList.add('done'); }); } };
  }

  /* ---------- components ---------- */
  var NAMES = { eagle: 'The Eagle', rouge: 'Rouge', grandma: 'Grandma', villager: 'Neighbour', crow: 'The Crow', owl: 'The Owl' };
  function speech(o) {
    o = o || {}; var w = el('div', 'u7-speech' + (o.side === 'right' ? ' right' : ''));
    w.innerHTML = "<div class='u7-face'><div class='u7-disc'>" + portrait(o.who || 'eagle') + '</div><b>' + esc(o.name || NAMES[o.who] || 'The Eagle') + "</b></div><div class='u7-card u7-bubble'><span class='u7-say'></span><i class='u7-caret'></i></div>";
    var bub = w.querySelector('.u7-bubble'), say = w.querySelector('.u7-say'), cur = null;
    bub.addEventListener('click', function () { if (cur) cur.skip(); });
    if (o.parent !== false) (o.parent || layer()).appendChild(w);
    function sayIt(t) { if (cur) cur.skip(); bub.classList.add('typing'); cur = type(say, t, { cps: o.cps || 34 }); return cur.done.then(function () { bub.classList.remove('typing'); }); }
    var api = { el: w, say: sayIt, close: function () { return leave(w); } };
    if (o.text) { slam(w, { from: o.side === 'right' ? 'right' : 'left', dur: 460 }); sayIt(o.text); }
    return api;
  }
  function placeCard(o) {
    o = o || {}; var c = card({ cls: 'u7-place' });
    var when = [o.day, o.time, o.weather].filter(Boolean).map(esc).join(' &middot; ');
    c.innerHTML = (o.kicker ? "<span class='u7-kick'>" + esc(o.kicker) + '</span>' : '') + '<h2>' + esc(o.place || '') + '</h2>' +
      (o.area ? "<div class='u7-area'>" + esc(o.area) + '</div>' : '') + (when ? "<div class='u7-when'>" + icon(o.icon || 'partsun') + '<span>' + when + '</span></div>' : '');
    var st = o.stamp ? stamp(o.stamp, { colour: C.rouge }) : null; if (st) c.appendChild(st);
    (o.parent || layer()).appendChild(c);
    var closed = false, api = { el: c, close: function () { if (closed) return Promise.resolve(); closed = true; return leave(c, { to: 'down' }); } };
    api.done = slam(c, { from: 'left' }).then(function () { if (st) stampIn(st, 120); });
    if (o.hold) setTimeout(api.close, o.hold);
    return api;
  }
  function menu(o) {
    o = o || {}; var w = el('div', 'u7-menu'), items = o.items || [], sel = -1, btns = [];
    if (o.title) w.appendChild(el('h3', '', esc(o.title)));
    items.forEach(function (it, i) {
      var b = el('button', 'u7-card u7-item' + (it.locked ? ' locked' : ''));
      b.type = 'button';
      b.innerHTML = badge(it.badge != null ? it.badge : i + 1).outerHTML + "<span><span class='u7-t'>" + esc(it.title) + "</span><span class='u7-s'>" + esc(it.sub || '') + "</span></span><span class='u7-go'>" + icon(it.locked ? 'lock' : 'next') + '</span>';
      b.addEventListener('pointerenter', function () { select(i); });
      b.addEventListener('focus', function () { select(i); });
      b.addEventListener('click', function () { select(i); if (!it.locked && it.onPick) it.onPick(it, i); });
      btns.push(b); w.appendChild(b);
    });
    function select(i) { if (i === sel || !btns[i]) return; if (btns[sel]) btns[sel].classList.remove('sel'); sel = i; btns[i].classList.add('sel'); }
    function key(e) { if (!w.isConnected) return; if (e.key === 'ArrowDown') { select((sel + 1) % btns.length); e.preventDefault(); } else if (e.key === 'ArrowUp') { select((sel - 1 + btns.length) % btns.length); e.preventDefault(); } else if (e.key === 'Enter' && sel >= 0) { btns[sel].click(); e.preventDefault(); } }
    if (o.keys) addEventListener('keydown', key);
    if (o.parent !== false) (o.parent || layer()).appendChild(w);
    btns.forEach(function (b, i) { slam(b, { from: 'left', delay: 60 * i, dur: 460 }); });
    select(o.selected || 0);
    return { el: w, select: select, destroy: function () { removeEventListener('keydown', key); w.remove(); } };
  }
  function missionCard(o) {
    o = o || {}; var c = card({ cls: 'u7-mission' + (o.locked ? ' locked' : '') }), pic = el('div', 'u7-pic');
    if (typeof o.pic === 'string' && /^\s*</.test(o.pic)) pic.innerHTML = o.pic; else if (typeof o.pic === 'string' && o.pic) { var im = el('img'); im.src = o.pic; im.alt = ''; pic.appendChild(im); } else if (o.pic && o.pic.nodeType) pic.appendChild(o.pic); else pic.innerHTML = vignette('coast');
    c.appendChild(pic); c.appendChild(badge(o.n != null ? o.n : 1, { tone: o.next && !o.locked ? 'sea' : '' }));
    if (o.next && !o.locked) c.appendChild(el('span', 'u7-next', esc(o.next === true ? 'Next' : o.next)));
    var tx = el('div', 'u7-txt', "<div class='u7-where'>" + esc([o.place, o.time].filter(Boolean).join(' · ')) + '</div><h4>' + esc(o.title || '') + '</h4><p>' + esc(o.locked ? (o.lockedLine || 'Not yet.') : (o.line || '')) + '</p>');
    c.appendChild(tx);
    if (o.locked) { var s = stamp(o.stamp || 'Locked', { colour: C.flame }); s.classList.add('u7-in'); c.appendChild(s); }
    else if (o.stamp) { var s2 = stamp(o.stamp, { colour: C.sun }); s2.classList.add('u7-in'); s2.style.cssText += ';position:absolute;right:10px;top:10px;z-index:3'; c.appendChild(s2); }
    if (o.onPick) c.addEventListener('click', function () { if (!o.locked) o.onPick(o); });
    return c;
  }
  function whatsNew(o) {
    o = o || {}; var items = (o.items || SHIPS).slice(0, o.max || 4), c = card({ cls: 'u7-newcard' + (o.cls ? ' ' + o.cls : '') });
    c.innerHTML = '<h5>' + esc(o.title || 'Since you last flew') + "</h5><ul class='u7-new'>" + items.map(function (s) { return '<li><em>#' + esc(s.n) + '</em><span><b>' + esc(s.title) + '.</b> <span>' + esc(s.line) + '</span></span></li>'; }).join('') + '</ul>';
    return c;
  }
  function toast(text, o) {
    o = o || {}; var L = layer(), box = L.querySelector('.u7-toasts'); if (!box) { box = el('div', 'u7-toasts'); L.appendChild(box); }
    while (box.children.length >= 2) box.removeChild(box.firstChild);
    var t = card({ cls: 'u7-toast', tone: o.tone }); t.innerHTML = (o.icon !== false ? icon(o.icon || 'feather') : '') + '<span>' + (o.kicker ? "<span class='u7-kicker'>" + esc(o.kicker) + '</span>' : '') + "<span class='u7-tx'>" + esc(text) + '</span></span>';
    box.appendChild(t); slam(t, { from: 'up', dur: 420 });
    setTimeout(function () { if (t.isConnected) leave(t, { to: 'up' }); }, o.ms || 2800);
    return t;
  }
  var MARKS = { next: 'next', quest: 'star', home: 'nest', friend: 'heart', shop: 'shop', danger: 'hawk', here: 'pin' };
  function legend(o) {
    o = o || {}; var c = card({ cls: 'u7-legend' });
    c.innerHTML = '<h5>' + esc(o.title || 'The key') + '</h5><ul>' + (o.items || []).map(function (it) { var m = it.mark || 'star'; return '<li>' + (/^\s*</.test(m) ? m : icon(MARKS[m] || m)) + '<span><b>' + esc(it.name) + '</b><span>' + esc(it.line || '') + '</span></span></li>'; }).join('') + '</ul>';
    return c;
  }

  /* ---------- the game's talk box, dressed (board 795 item 29) ---------- */
  var FACES = [[/eagle/i, 'eagle'], [/crow/i, 'crow'], [/owl/i, 'owl'], [/^\s*rouge\b/i, 'rouge'], [/shirley|grandma/i, 'grandma']];
  css('#talk.u7-talkbox{background:rgba(14,18,30,.9)!important;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
      'border:1px solid ' + C.line + '!important;border-radius:16px!important;box-shadow:0 14px 34px -10px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06)!important;padding-left:90px!important;min-height:92px;box-sizing:border-box;overflow:visible}' +
    '#talk.u7-talkbox.u7-noface{padding-left:18px!important}' +
    '#talk.u7-talkbox>b{font-family:var(--u7-mono)!important;font-weight:700!important;font-size:10.5px!important;letter-spacing:.22em!important;text-transform:uppercase!important;color:' + C.rouge + '!important;text-shadow:0 0 10px rgba(255,59,66,.5)}' +
    '#talk.u7-talkbox>p{font-family:var(--u7-body)!important;font-weight:400;font-size:16px!important;line-height:1.48!important;color:' + C.ink + '!important}' +
    '#talk.u7-talkbox>p strong{color:#fff!important}' +
    '#talk.u7-talkbox>p.u7-typing{color:transparent!important}' +
    '#talk.u7-talkbox>p.u7-typing *{visibility:hidden}' +
    '#talk.u7-talkbox>button{font-family:var(--u7-display)!important;font-weight:600!important;border:1px solid rgba(77,232,201,.6)!important;border-radius:999px!important;background:rgba(5,6,12,.6)!important;color:' + C.sea + '!important;box-shadow:0 0 0 1px rgba(77,232,201,.15),0 0 18px -4px rgba(77,232,201,.6)!important;filter:none!important;letter-spacing:.02em}' +
    '#talk.u7-talkbox .u7-talkface{position:absolute;left:14px;top:14px;width:60px;height:60px;border-radius:50%;border:1.5px solid rgba(255,59,66,.75);background:radial-gradient(circle at 50% 40%,#1b2140,#0a0d18 72%);box-shadow:0 0 0 4px rgba(255,59,66,.10),0 0 22px -2px rgba(255,59,66,.55);overflow:hidden;pointer-events:none}' +
    '#talk.u7-talkbox .u7-talkface svg{width:100%;height:100%;display:block}' +
    '#talk.u7-talkbox .u7-talkface.letter{display:grid;place-items:center;font-family:var(--u7-display);font-weight:700;font-size:26px;color:' + C.ink + ';border-color:rgba(77,232,201,.7);box-shadow:0 0 0 4px rgba(77,232,201,.08),0 0 20px -2px rgba(77,232,201,.5)}' +
    '#talk.u7-talkbox .u7-typed{position:absolute;margin:0;pointer-events:none;font-family:var(--u7-body);font-weight:400;font-size:16px;line-height:1.48;color:' + C.ink + ';white-space:pre-wrap}');
  function dressTalk(o) {
    o = o || {}; var box = typeof o.box === 'string' ? document.querySelector(o.box) : o.box, who = typeof o.who === 'string' ? document.querySelector(o.who) : o.who, txt = typeof o.text === 'string' ? document.querySelector(o.text) : o.text;
    if (!box || !who || !txt || box.__u795) return null; box.__u795 = true;
    box.classList.add('u7-talkbox'); if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    var face = el('div', 'u7-talkface'), typed = el('p', 'u7-typed'), cur = null, busy = false; box.insertBefore(face, box.firstChild); box.appendChild(typed);
    function stopType() { if (cur) { cur.skip(); cur = null; } txt.classList.remove('u7-typing'); typed.textContent = ''; }
    function update() {
      if (busy) return; busy = true;
      try {
        var name = (who.textContent || '').replace(/[^\p{L}\p{N}' .-]/gu, '').trim(), key = null, i;
        var dove = /\bdove\b/i.test(name);
        for (i = 0; i < FACES.length; i++) if (FACES[i][0].test(name)) { key = FACES[i][1]; break; }
        box.classList.toggle('u7-noface', !name || dove);
        if (dove || !name) { face.innerHTML = ''; face.className = 'u7-talkface'; face.style.display = 'none'; }
        else if (key) { face.style.display = ''; face.className = 'u7-talkface'; face.innerHTML = portrait(key); }
        else { face.style.display = ''; face.className = 'u7-talkface letter'; face.textContent = name.charAt(0).toUpperCase(); }
        stopType();
        var holy = !!txt.querySelector('small') || dove, line = txt.textContent || '';
        if (holy || reduced || !line || box.hidden) return;
        typed.style.left = txt.offsetLeft + 'px'; typed.style.top = txt.offsetTop + 'px'; typed.style.width = txt.offsetWidth + 'px';
        txt.classList.add('u7-typing');
        cur = type(typed, line, { cps: key === 'grandma' ? 24 : 42 }); var mine = cur;
        cur.done.then(function () { if (cur === mine) { cur = null; txt.classList.remove('u7-typing'); typed.textContent = ''; } });
      } finally { busy = false; }
    }
    var mo = new MutationObserver(update); mo.observe(txt, { childList: true, characterData: true, subtree: true }); mo.observe(who, { childList: true, characterData: true, subtree: true });
    new MutationObserver(function () { if (box.hidden) stopType(); }).observe(box, { attributes: true, attributeFilter: ['hidden'] });
    box.addEventListener('pointerdown', function (e) { if (cur && e.target !== box.querySelector('button')) { stopType(); } }, true);
    update();
    return { box: box, peek: function () { return { typing: !!cur, typed: typed.textContent, face: face.className + ':' + (face.querySelector('svg') ? 'svg' : face.textContent) }; } };
  }

  /* ---------- the ship log, newest first: a bold title and one plain sentence a player cares about (DRAFTS for Marth's pen) ---------- */
  var SHIPS = [
    { n: 142, title: 'One sea, one sky', line: 'The sea stays one calm colour from the shore to the deep, the clouds near and far are painted alike, and the world map opens straight away.' },
    { n: 141, title: 'Down to earth', line: 'Roads lie on the ground, trees have real trunks, the leaves hold you until you land, and Zoom works on foot out in the world.' },
    { n: 140, title: 'A whole new look', line: 'Craft gear from what you win, take on missions in every place, and learn true facts about the places you fly past.' },
    { n: 139, title: 'Every door, framed', line: 'Walk up to a door and the camera finds it with you, then follows you in.' },
    { n: 138, title: 'Life everywhere', line: 'People, cars, streetcars, trains, boats and flocks now fill the real world.' },
    { n: 137, title: 'The city look', line: 'Pitched roofs, lit windows, painted streets and autumn trees in every town.' },
    { n: 136, title: 'Speed by place', line: 'You slow down over busy streets and open up over the sea.' },
    { n: 135, title: 'Seas with colour', line: 'Each sea has its own blue now, and new shores wait past the horizon.' },
    { n: 134, title: 'After the Hawk', line: 'Beat the Hawk and the island has more to say, and he races you.' },
    { n: 133, title: 'First meetings', line: 'Every first arrival and every new friend gets its own small scene.' },
    { n: 132, title: "The Haven's School", line: 'Your chick can learn, play Puff Push and pull the vine tug-of-war.' },
    { n: 131, title: 'Homes with people in', line: 'The villagers live in their houses now, and the houses are bigger inside.' },
    { n: 130, title: 'Arriving in Jamaica', line: 'Fly into Jamaica and the island greets you properly.' }
  ];

  window.UI795 = { version: '795.2', C: C, css: css, layer: layer, fontsReady: fontsReady, reduced: reduced, el: el, esc: esc,
    slam: slam, leave: leave, transition: transition, type: type, countUp: countUp, radar: radar,
    card: card, stamp: stamp, stampIn: stampIn, badge: badge, checklist: checklist, icon: icon, portrait: portrait, vignette: vignette,
    speech: speech, placeCard: placeCard, menu: menu, missionCard: missionCard, whatsNew: whatsNew, toast: toast, legend: legend, dressTalk: dressTalk,
    SHIPS: SHIPS, BASE: BASE, FONTS: { display: F_DISPLAY, body: F_BODY, mono: F_MONO } };
})();
