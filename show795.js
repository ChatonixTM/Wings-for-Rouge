/* show795.js - 795 THE SHOW: the title over the live world, the drop-in, the missions as a show, the photo, the sound words (Wings for Rouge, board 795).
   Marth, Nov 13 2026, verbatim: "Everything is higher standard. Writing. Fonts animations, effects, transitions. Loading screens, game play" /
   "add everything that's missing and do it better than him, if needed." / "Make sure everything you noted and didnt say is implemented."
   Study, never copy (COO, coo.mx; refs-1111/coo-site/COO_STUDY_795.md): we take the CRAFT (a menu over the live world, a fall from the sky onto the bird,
   an operations board, a comic briefing, a case card, a photo as a panel or a cover, comic words over the action), never its art, words or city.
   Ours: Jamaica and her island, a small red bird, warm painted light; the Eagle watches from above; her grandma is never a menu line.
   THE LOOK (Marth, Nov 13 2026: "Yes keep all functions of the Ui but u copied it down to the yellow and beige diagonal lines is what I mean. Take from bait and nuke
   or The face as inspiration. Just make sure the functions of the game are fire"): his own two apps' house style (refs-1111/coo-site/OUR_LOOK_THE_STORYBOOK_795.md):
   night glass with a 1 px glow, Rouge red the hero, signal mint for go, gold for rewards, Space Grotesk + Space Mono, letter-spaced eyebrows, outlined pills,
   ringed badges, the Face's glowing rings, glow-in motion. No paper, stripes, stamps, polaroids, folders, halftone or comic panels.

   WHAT IS HERE (EVERYTHING_NOTED_795 items 2, 4, 7, 11, 13, 28, 30; Standard only, Classic is frozen: create() refuses there)
     2  THE TITLE      over the live island: Rouge perched on a real spot (a different one each load: the big tree, the lighthouse rail, a village roof,
                       the Owl's treetop, the Eagle's peak once she has met him), "Meanwhile, at <place>", four big numbered cards with true subtitles
                       (her level and the next gift, the missions and her best, flying together, what is new); the old sheet one tap away (files, birds, credits).
     4  THE DROP-IN    every travel arrival (woken where she left off, a Fly there arriving, a map drop if he ever turns it on): the dusk veil becomes the
                       Eagle's eye (a painted scanner, the reticle on her, the height counting down) while the ground streams; then the camera falls from
                       high above onto her (height counting), a soft-focus close-up, the arrival card (place huge, area, day · time · weather, a stamp).
                       A tap goes to the next step; SKIP ends it. Built on the cinematic kit (cine.js play()), so it holds her still and never stacks.
     7  MISSIONS       on top of missions788.js: its list card is replaced by a grid of mission cards (a live picture of the place, a number, place · time
                       of day, a title, ONE sentence, her best, the locked one stamped with what opens it); a comic briefing that draws itself (Rouge and
                       the place's own voice); a job card (the place, a status pill, the job, three tips, the controls, a big GO and a quiet Not now). The title's
                       card 02 opens the board of all nine places.
     11 PHOTO          from Pause: the moment frozen (the world is already held), framed as a painted PANEL or a magazine COVER with her caption, saved
                       to her Photos through the share sheet (a download where there is none). Never while a scene, a card or the drop-in is up.
     13 SOUND WORDS    short painted words over the action (a splash, a peck landing, a sweep, a dive, a catch), our own words, on by default; a Pause
                       tile switches them (and the captions lane) off.
     28 ONE TITLE LANE the game's place and move titles (title39) and the cinematic kit's card become paper cards in one lane at the top; while the
                       arrival card is up they wait their turn (the page asks lane() first).
     30 QUEST ORDER    the missions board lists the home island first and the wide world only after the climb (see WIRING_795_SHOW.md for the quest board).
   THE PAGE HANDS IT (create(o), once; wiring: tools/wiring/wire-795-show.js): THREE, scene, camera, renderer, S, the cinematic kit, the bird, the
   perches, the clock and weather, the travel zone and its doors, missions788, and a few of the page's own functions. It never moves her itself.
   Builds on ui795.js (the kit: fonts, card, motion, components). Every word on screen is a DRAFT for Marth's pen. */
window.WFR_SHOW795 = (function () {
  'use strict';
  var API = { error: '' };
  var KEY = 'wfr.show795';   /* this module's own settings and its title counter (never wfr.save) */

  /* ---------- THE WORDS (all DRAFT, for his pen) ---------- */
  var WORDS = {
    meanwhile: 'Rouge is at',
    fly: 'Fly', keepFly: 'Keep flying', begin: 'Begin',
    missions: 'Missions', together: 'Fly with someone', news: "What's new", files: 'Files & birds', credits: 'Data & credits', back: 'Back',
    togetherSub: 'a friend, a code, one sky',
    eagleEye: "The Eagle's eye", looking: 'Looking for Rouge', found: 'Found her', up: ' m up', skip: 'Skip',
    stamp: 'Rouge · on the wing', woke: 'Back where you left off', flew: 'You flew here', dropped: 'Dropped in', arrived: 'Arrived',
    board: 'Missions', ranked: 'ranked A', star: 'stars', allPlaces: 'All places', here: "You're here", notHere: 'Fly there to play',
    climb: 'After the climb', wide: 'The wide world', wideLine: 'Paris, New York, the falls: they wait past the climb, over the sea.',
    wideOpen: 'The world is open. The map has every place; fly to one and its missions wait there.',
    job: 'The job', tips: 'Three tips', controls: 'What you need', go: 'Fly it', notNow: 'Not now', toFile: 'The job', best: 'Best', newRun: 'New',
    gradeLine: 'Beat the clock for an A. Beat it well for a star.',
    photo: 'Photo', photoSub: 'a panel or a cover', panel: 'Panel', cover: 'Cover', save: 'Save to Photos', saved: 'Saved.', share: 'Share',
    words: 'Sound words', wordsSub: 'painted words over the action', on: 'On', off: 'Off', capPh: 'Write a caption',
    coverMast: 'WINGS', coverSub: 'for ROUGE'
  };
  /* the sound words (13): ours, short, painted. Each kind picks one of its words in turn */
  var LETTERS = { splash: ['SPLOOSH!', 'SPLASH!', 'PLOOP!'], hit: ['TOK!', 'PEK!', 'TAK!'], burst: ['FWUMP!', 'WHAP!'], blast: ['KA-BOOM!', 'BOOM!'],
    dive: ['WHOOOSH!', 'SWOOP!'], catch: ['GOT IT!', 'SNAP!'], hatch: ['CRACK!'] };
  var LCOL = { splash: ['#4de8c9'], hit: ['#ffd45c'], burst: ['#ffd45c'], blast: ['#ff3b42'], dive: ['#ff3b42'], catch: ['#4de8c9'], hatch: ['#ffd45c'] };   /* the glow under each word: mint, gold, Rouge red */
  /* who speaks at each place's briefing (the place's own voice; the kit's portraits) and what Rouge says first */
  var VOICE = {
    village: ['villager', 'Ada', 'Oh good, wings. I could use wings today.'],
    lighthouse: ['villager', 'The keeper', 'You came up the easy way. Show-off.'],
    lake: ['villager', 'Hal', 'Hey. Little one.'],
    peak: ['eagle', 'The Eagle', 'Little one. The wind is honest up here.'],
    dunes: ['villager', 'Pip', 'Sand in everything. Even my book.'],
    cave: ['owl', 'The Owl', 'Hoo. The dark is smaller than it looks.'],
    hermits: ['villager', 'The hermits', 'We do not get many visitors. That is the point.'],
    race: ['crow', 'The Crow', 'Caw. Fast is a habit. Let us see yours.'],
    jamaica: ['villager', 'A woman by the falls', 'Mind the rocks, sweetness. The river is cold.']
  };
  var ROUGE_ASKS = { collect: 'Sparks? Where?', clock: 'Rings. In order, right?', hidden: 'Lost something?', clean: 'No landing at all?', hard: 'The hard one. Okay.' };
  var JOB = {   /* the speaker's line for each kind (the place's own lost thing comes from missions788) */
    collect: 'Eight sparks hang round here. All of them, before the time runs out.',
    clock: 'Seven rings. The lit one counts, then the next. Go.',
    hidden: null,
    clean: 'Six sparks and your feet never touch the ground. Not once.',
    hard: 'Twelve sparks, wide and high, and less time. You earned this one.'
  };
  var TIPS = {
    collect: ['The sparks hang at different heights: climb for the high ones first.', 'Take the near ones on the way; the clock does not wait.', 'A dive is faster than flapping down.'],
    clock: ['Only the lit ring counts. The next one glows faint behind it.', 'Turn early: a wide turn costs seconds.', 'Aim for the middle of each ring.'],
    hidden: ['No arrow for this one. The words say Cold, Warm, Hot.', 'Once it says Warm, fly low and slow.', 'Think where a person would drop it.'],
    clean: ['Take off first: the clock starts once you are up.', 'Touch the ground once and the run is over.', 'Glide between sparks; there is no need to land.'],
    hard: ['Height is speed: dive from the high sparks to the low ones.', 'Plan a loop before you start; twelve is a lot.', 'Your A on Gather the sparks opened this. Show it why.']
  };
  var KEYS_TOUCH = { collect: [['Drag', 'steer'], ['Flap', 'climb'], ['Tilt down', 'dive']], clock: [['Drag', 'steer'], ['Flap', 'climb'], ['Fly through', 'the lit ring']],
    hidden: [['Drag', 'steer'], ['Land', 'look on foot'], ['Read', 'Cold to Hot']], clean: [['Flap', 'take off'], ['Drag', 'steer'], ['Never', 'Land']], hard: [['Drag', 'steer'], ['Flap', 'climb'], ['Dive', 'for speed']] };

  /* ---------- THE RULES (pure: the guard reads the same code) ---------- */
  function clock(c) {   /* the game's clock (0..2700, 4.5x) to a time on the island: day 0..2100 = 6:00 to 20:00, night 2100..2700 = 20:00 to 6:00 */
    c = ((+c || 0) % 2700 + 2700) % 2700; var h = c < 2100 ? 6 + c / 2100 * 14 : 20 + (c - 2100) / 600 * 10; h %= 24;
    var H = Math.floor(h), M = Math.floor((h - H) * 60 / 5) * 5, h12 = H % 12 === 0 ? 12 : H % 12;
    var part = h < 5 ? 'night' : h < 8 ? 'early morning' : h < 11 ? 'morning' : h < 13 ? 'noon' : h < 17 ? 'afternoon' : h < 19 ? 'late afternoon' : h < 20.5 ? 'dusk' : h < 23 ? 'evening' : 'night';
    return { h: h, text: h12 + ':' + (M < 10 ? '0' : '') + M + (H < 12 ? ' a.m.' : ' p.m.'), part: part, night: h < 5.5 || h >= 20.2 };
  }
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function dayName(d) { return DAYS[(((d | 0) + 5) % 7 + 7) % 7]; }   /* her day 1 is a Saturday, like her birthday (Oct 10 2026) */
  function weather(k, night) {
    if (k === 'storm') return { text: 'a storm overhead, hold on', icon: 'storm' };
    if (k === 'rain') return { text: 'rain in off the sea', icon: 'rain' };
    return night ? { text: 'clear and still, the stars out', icon: 'night' } : { text: 'clear skies, a warm trade wind', icon: 'sun' };
  }
  function fmtLL(lat, lon) { return Math.abs(lat).toFixed(4) + '° ' + (lat >= 0 ? 'N' : 'S') + '  ' + Math.abs(lon).toFixed(4) + '° ' + (lon >= 0 ? 'E' : 'W'); }
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pick(list, n) { return list[((n | 0) % list.length + list.length) % list.length]; }
  function loadSet() { try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return { words: o.words !== false, n: o.n | 0 }; } catch (e) { return { words: true, n: 0 }; } }
  function storeSet(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode: this visit only */ } }
  /* the missions' order (30): the home island first, the wide world after the climb; inside each, the place she is at first, then the most to do */
  function boardOrder(places, here, open) {
    return places.map(function (P, i) { return { P: P, i: i, lock: !!P.world && !open }; })
      .sort(function (a, b) { return (a.P.world ? 1 : 0) - (b.P.world ? 1 : 0) || (b.P.id === here) - (a.P.id === here) || a.i - b.i; });
  }

  /* ---------- THE LOOK: the house style (Bait & Nuke and the Face, his own two apps): night glass with a 1 px glow, Rouge red the hero, signal mint for go,
     gold for rewards; Space Grotesk headlines, Space Mono data lines, letter-spaced eyebrows, outlined pills, ringed badges, glow-in motion. No paper, no stripes. ---------- */
  var G_SANS = "'U795 Display','Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif", G_MONO = "'U795 Mono','Space Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";
  var CSS =
    ':root{--g-void:#05060c;--g-panel:rgba(12,16,26,.84);--g-panel2:rgba(16,21,34,.9);--g-line:rgba(120,140,210,.2);--g-ink:#e9edf8;--g-dim:#95a0bd;--g-muted:#5f6a86;' +
      '--g-red:#ff3b42;--g-rouge:#e2384d;--g-mint:#4de8c9;--g-mint2:#235952;--g-gold:#ffd45c;--g-violet:#b48cff;--g-sans:var(--u7-head,' + G_SANS + ');--g-mono:var(--u7-mono,' + G_MONO + ');' +
      '--g-glass:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,0) 40%),var(--g-panel);--g-glow:0 0 0 1px var(--g-line),0 10px 30px -10px rgba(0,0,0,.7),inset 0 0 22px rgba(110,168,255,.05);' +
      '--g-glowR:0 0 0 1px rgba(255,59,66,.55),0 0 18px -2px rgba(255,59,66,.45),0 10px 30px -10px rgba(0,0,0,.7);--g-glowM:0 0 0 1px rgba(77,232,201,.5),0 0 16px -3px rgba(77,232,201,.45)}' +
    '.s7-glass{background:var(--g-glass);border-radius:16px;box-shadow:var(--g-glow);-webkit-backdrop-filter:blur(10px) saturate(1.1);backdrop-filter:blur(10px) saturate(1.1);color:var(--g-ink);font-family:var(--g-sans)}' +
    '.s7-eye-b{font:700 10.5px/1.2 var(--g-mono);letter-spacing:.22em;text-transform:uppercase;color:var(--g-mint)}' +
    '.s7-pill{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 11px;border-radius:999px;font:600 11.5px/1 var(--g-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g-ink);background:rgba(10,14,22,.72);box-shadow:0 0 0 1px var(--g-line);white-space:nowrap}' +
    '.s7-pill.m{color:var(--g-mint);box-shadow:var(--g-glowM)}.s7-pill.r{color:#ffd0d3;box-shadow:var(--g-glowR)}.s7-pill.g{color:var(--g-gold);box-shadow:0 0 0 1px rgba(255,212,92,.5),0 0 14px -4px rgba(255,212,92,.5)}' +
    '.s7-pill i{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}' +
    '@keyframes s7glowin{0%{opacity:0;transform:translateY(8px);filter:brightness(1.6)}60%{opacity:1;filter:brightness(1.15)}100%{opacity:1;transform:none;filter:none}}' +
    '.s7-in{animation:s7glowin .5s cubic-bezier(.2,.7,.2,1) both}' +
    '@keyframes s7breathe{0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(1)}50%{opacity:.95;transform:translate(-50%,-50%) scale(1.04)}}' +
    '.s7-rings{position:absolute;left:50%;top:50%;width:var(--rw,520px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;' +
      'background:radial-gradient(circle,transparent 0 17%,rgba(77,232,201,.16) 17.4% 17.8%,transparent 18.2% 33%,rgba(77,232,201,.12) 33.4% 33.8%,transparent 34.2% 49%,rgba(77,232,201,.09) 49.3% 49.6%,transparent 50%);animation:s7breathe 5s ease-in-out infinite}' +
    /* 2 the title */
    'html.t795 #start{background:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;pointer-events:none}' +
    'html.t795 #start>.sheet{background:none!important;border:0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;pointer-events:none!important}' +
    /* 815 (Marth, Nov 14 2026, on #141: the cards numbered 02 and 04 with 01 and 03 missing, an empty bordered box across the middle): the emptied sheet
       kept its inner frame (ui716's .sheet::before) as a box in the middle of the screen, and on his iPhone the two game buttons laid over the menu with
       position:fixed never showed. Now the two buttons are MOVED into the menu itself (moveIn below), drawn in its flow like 02 and 04, and the emptied
       sheet is gone. If a button cannot move, the old overlay stays as the fallback, with nothing on the sheet that could hold it (no transform, no frame). */
    'html.t795 #start>.sheet::before,html.t795 #start>.sheet::after{display:none!important}' +
    'html.t795 #start>.sheet{padding:0!important;gap:0!important;min-height:0!important;transform:none!important;filter:none!important;animation:none!important;will-change:auto!important;contain:none!important}' +
    'html.t795 #start{overflow:visible!important;transform:none!important;filter:none!important;animation:none!important}' +
    'html.t795.s7mv #start>.sheet{display:none!important}' +
    '#s7title .u7-menu>#go,#s7title .u7-menu>#netBtn678t{position:relative!important;left:auto!important;top:auto!important;width:100%!important;max-width:none!important;justify-self:stretch!important;margin:0!important;height:auto!important;min-height:59px!important;z-index:auto!important;animation:s7glowin .5s cubic-bezier(.2,.7,.2,1) both}' +
    '#s7title .u7-menu>#netBtn678t{animation-delay:.12s}#s7title .u7-item.s7-slot.s7-out{display:none!important}' +
    'html.t795 #start>.sheet>*:not(#go):not(:has(#go)):not(:has(#netBtn678t)),html.t795 #start>.sheet *:has(>#go)>*:not(#go),html.t795 #start>.sheet *:has(>#netBtn678t)>*:not(#netBtn678t){display:none!important}' +
    'html.t795 #start>.sheet *:has(>#go),html.t795 #start>.sheet *:has(>#netBtn678t){background:none!important;border:0!important;box-shadow:none!important;outline:0!important}html.t795 #start>.sheet *:has(>#go)::before,html.t795 #start>.sheet *:has(>#go)::after,html.t795 #start>.sheet *:has(>#netBtn678t)::before,html.t795 #start>.sheet *:has(>#netBtn678t)::after{display:none!important}' +
    /* the game's own Fly together button (#netBtn678t) IS choice 03, drawn as a glass card the same way */
    'html.t795 #netBtn678t{position:fixed!important;left:var(--gx,16px)!important;top:var(--gy,70vh)!important;width:var(--gw,calc(100vw - 32px))!important;height:var(--gh,60px)!important;min-height:0!important;margin:0!important;z-index:61;pointer-events:auto!important;box-sizing:border-box;' +
      'display:flex!important;flex-direction:column;justify-content:center;align-items:flex-start;text-align:left;padding:8px 40px 8px 64px!important;font:700 20px/1.05 var(--g-sans)!important;letter-spacing:-.01em!important;text-transform:none!important;text-decoration:none!important;text-shadow:none!important;' +
      'color:#fff!important;background:var(--g-glass)!important;border:0!important;border-radius:16px!important;box-shadow:var(--g-glow)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transform:none!important;filter:none!important;opacity:1!important}' +
    'html.t795 #netBtn678t::before{content:"03"!important;position:absolute!important;left:14px!important;top:50%!important;width:36px!important;height:36px!important;margin:-18px 0 0!important;display:grid!important;place-items:center;box-sizing:border-box;font:700 12px/1 var(--g-mono)!important;color:var(--g-mint)!important;' +
      'background:rgba(77,232,201,.06)!important;border:1.5px solid rgba(77,232,201,.55)!important;border-radius:50%!important;box-shadow:0 0 10px -2px rgba(77,232,201,.55)!important;transform:none!important;opacity:1!important}' +
    'html.t795 #netBtn678t::after{content:var(--s7sub,"")!important;position:static!important;display:block!important;margin:5px 0 0!important;background:none!important;border:0!important;box-shadow:none!important;opacity:1!important;transform:none!important;font:400 11px/1.3 var(--g-mono)!important;letter-spacing:.06em!important;text-transform:uppercase!important;color:var(--g-dim)!important}' +
    /* the game's own Fly button (#go) IS choice 01: the same element, laid over the menu's first slot, drawn as the primary glass card */
    'html.t795 #go{position:fixed!important;left:var(--gx,16px)!important;top:var(--gy,60vh)!important;width:var(--gw,calc(100vw - 32px))!important;height:var(--gh,64px)!important;min-height:0!important;margin:0!important;z-index:61;pointer-events:auto!important;box-sizing:border-box;' +
      'display:flex!important;flex-direction:column;justify-content:center;align-items:flex-start;text-align:left;padding:8px 40px 8px 64px!important;font:700 22px/1.05 var(--g-sans)!important;letter-spacing:-.01em!important;text-transform:none!important;text-shadow:0 0 18px rgba(255,59,66,.45)!important;' +
      'color:#fff!important;background:linear-gradient(90deg,rgba(255,59,66,.22),rgba(255,59,66,.04) 60%),var(--g-panel)!important;border:0!important;border-radius:16px!important;box-shadow:var(--g-glowR)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transform:none!important;filter:none!important}' +
    'html.t795 #go:active{transform:scale(.98)!important}' +
    'html.t795 #go::before{content:"01"!important;position:absolute!important;left:14px!important;top:50%!important;right:auto!important;bottom:auto!important;width:36px!important;height:36px!important;margin:-18px 0 0!important;display:grid!important;place-items:center;box-sizing:border-box;' +
      'font:700 12px/1 var(--g-mono)!important;color:#fff!important;background:radial-gradient(circle,rgba(255,59,66,.35),rgba(255,59,66,.05) 70%)!important;border:1.5px solid var(--g-red)!important;border-radius:50%!important;box-shadow:0 0 12px rgba(255,59,66,.6)!important;transform:none!important;opacity:1!important;filter:none!important}' +
    'html.t795 #go::after{content:var(--s7sub,"")!important;position:static!important;display:block!important;width:auto!important;height:auto!important;margin:5px 0 0!important;background:none!important;border:0!important;box-shadow:none!important;opacity:1!important;transform:none!important;' +
      'font:400 11px/1.3 var(--g-mono)!important;letter-spacing:.06em!important;text-transform:uppercase!important;color:#ffc9cd!important;white-space:normal;text-shadow:none!important}' +
    '#s7title{position:absolute;inset:0;pointer-events:none}#s7title>*{pointer-events:auto}#s7title>.s7-shade,#s7title>.s7-rings,#s7title>.s7-brand,#s7title>.s7-where,#s7title>.s7-head{pointer-events:none!important}' +   /* decoration never takes a tap */
    '#s7title .s7-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(5,6,12,.72),rgba(5,6,12,0) 28%)}' +
    '#s7title .s7-rings{left:44px;top:44px;--rw:min(90vw,420px);opacity:.7}' +
    /* 815: the brand and "Rouge is at" stand in ONE column, so however the brand wraps the pill sits under it, never over it (on his phone it sat on the brand's last line) */
    '#s7title .s7-head{position:absolute;left:calc(18px + var(--u7-safe-l));right:calc(76px + var(--u7-safe-r));top:calc(18px + var(--u7-safe-t));display:flex;flex-direction:column;align-items:flex-start;gap:16px;pointer-events:none}' +
    '#s7title .s7-brand{position:relative;display:flex;align-items:center;gap:12px;pointer-events:none}' +
    '#s7title .s7-badge{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font:700 9px/1 var(--g-mono);letter-spacing:.12em;color:var(--g-red);box-shadow:0 0 0 1.5px rgba(255,59,66,.7),0 0 0 6px rgba(255,59,66,.08),0 0 22px rgba(255,59,66,.45);background:radial-gradient(circle,rgba(255,59,66,.18),rgba(5,6,12,.6) 70%)}' +
    '#s7title .s7-badge svg{width:30px;height:30px}#s7title .s7-badge{flex:none}' +
    '#s7title .s7-brand b{display:block;font:700 30px/1 var(--g-sans);letter-spacing:.2em;text-transform:uppercase;color:#fff;text-shadow:0 0 22px rgba(255,59,66,.55)}#s7title .s7-brand b em{font-style:normal;color:var(--g-red)}' +
    '#s7title .s7-brand small{display:block;margin-top:5px;font:400 11px/1.2 var(--g-mono);letter-spacing:.14em;color:var(--g-dim)}' +
    '#s7title .s7-where{position:relative;max-width:100%;pointer-events:none}' +
    '#s7title .s7-where b{display:block;margin-top:6px;font:700 26px/1.02 var(--g-sans);letter-spacing:-.01em;color:#fff;text-shadow:0 2px 14px rgba(5,6,12,.9)}' +
    '#s7title .s7-where>span:not(.s7-pill){display:block;margin-top:4px;font:400 italic 13px/1.3 var(--g-sans);color:#d6dcef;text-shadow:0 1px 6px rgba(5,6,12,.95)}' +   /* 815: was every span, the pill too: it went block-wide with its words in a corner and its dot gone */
    '#s7title .s7-where>.s7-pill{background:rgba(5,6,12,.62)}' +
    '#s7title .u7-menu{position:absolute;left:calc(14px + var(--u7-safe-l));right:calc(14px + var(--u7-safe-r));bottom:calc(52px + var(--u7-safe-b));width:auto;max-width:430px;gap:9px;pointer-events:none!important}' +
    '#s7title .u7-menu>.u7-item{pointer-events:auto}#s7title .u7-item.s7-slot{visibility:hidden;pointer-events:none!important}' +
    '#s7title .u7-item,#s7news{background:var(--g-glass)!important;background-image:none;border:0!important;border-radius:16px!important;box-shadow:var(--g-glow)!important;color:var(--g-ink)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transform:none!important}' +
    '#s7title .u7-item{padding:10px 14px!important;grid-template-columns:36px 1fr auto!important}' +
    '#s7title .u7-item .u7-badge{min-width:36px;height:36px;border-radius:50%!important;font:700 12px/1 var(--g-mono)!important;color:var(--g-mint)!important;background:rgba(77,232,201,.06)!important;border:1.5px solid rgba(77,232,201,.55)!important;box-shadow:0 0 10px -2px rgba(77,232,201,.55)!important;transform:none!important}' +
    '#s7title .u7-item .u7-t{font:700 20px/1.05 var(--g-sans)!important;letter-spacing:-.01em;color:#fff!important}' +
    '#s7title .u7-item .u7-s{font:400 11px/1.3 var(--g-mono)!important;letter-spacing:.06em!important;color:var(--g-dim)!important}' +
    '#s7title .u7-item.sel{box-shadow:var(--g-glowM)!important}#s7title .u7-item .u7-go{filter:hue-rotate(140deg) saturate(.6)}' +
    '#s7title .s7-foot{position:absolute;left:0;right:0;bottom:calc(12px + var(--u7-safe-b));display:flex;justify-content:space-between;padding:0 calc(16px + var(--u7-safe-r)) 0 calc(16px + var(--u7-safe-l))}' +
    '#s7title .s7-foot button,.s7-chip{cursor:pointer;border:0}.s7-chip{position:fixed;left:calc(12px + var(--u7-safe-l));top:calc(10px + var(--u7-safe-t));z-index:61;pointer-events:auto}' +
    '.s7-chip.s7-pill{min-height:40px;padding:0 15px;font:600 12px/1 var(--g-mono);letter-spacing:.1em;color:var(--g-ink);background:rgba(10,14,22,.82);box-shadow:var(--g-glowM);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
    /* 815: the old sheet's look (Files & birds, Data & credits, and the sheet as the page loads) lives in ui795.js (the kit), so it is drawn from the first paint */
    /* 815: the strip under the page on his iPhone's home-screen app (it lays the page out one status bar short; 722c stretches the picture, the strip stays the page's
       own floor): in Standard it is the menu's own night, never a grey band */
    'html.s795,html.s795 body{background:#05060c!important}' +
    '#s7news{position:absolute;left:16px;right:16px;top:calc(150px + var(--u7-safe-t));max-width:430px;margin:auto;padding:14px 16px}' +
    '#s7news h5{font:700 10.5px/1.2 var(--g-mono)!important;letter-spacing:.22em;text-transform:uppercase;color:var(--g-mint)!important}#s7news h5:after{background:var(--g-line)!important;opacity:1!important;height:1px!important}' +
    '#s7news li b{font-family:var(--g-sans)!important;color:#fff!important}#s7news li span{color:var(--g-dim)!important}#s7news li em{font:700 10px/1 var(--g-mono)!important;background:rgba(255,59,66,.16)!important;color:#ffc9cd!important;box-shadow:0 0 0 1px rgba(255,59,66,.5);transform:none!important}' +
    '#s7news .s7-x{position:absolute;right:8px;top:6px;border:0;background:none;font:400 20px var(--g-sans);color:var(--g-dim);min-width:40px;min-height:40px}' +
    /* 4 the drop-in: the Eagle's eye as the Face's glowing rings, the fall, soft focus, the arrival card as glass */
    '#veil725d{z-index:59!important;background:radial-gradient(60% 45% at 50% 46%,#101a33 0%,#0a0d18 55%,#05060c 100%)!important}' +
    '#s7eye{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .35s}#s7eye.on{opacity:1}' +
    '#s7eye .s7-rings,#s7fall .s7-rings{top:46%;--rw:min(118vw,560px)}' +
    '#s7eye .s7-rings.b{--rw:min(70vw,330px);animation-delay:-2.5s;filter:hue-rotate(-130deg) saturate(2.2)}' +
    '.s7-node{position:absolute;left:50%;top:46%;width:46px;height:46px;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;box-shadow:0 0 0 1.5px var(--g-red),0 0 0 7px rgba(255,59,66,.1),0 0 26px rgba(255,59,66,.6);background:radial-gradient(circle,rgba(255,59,66,.35),transparent 70%)}' +
    '.s7-node b{position:absolute;left:100%;top:50%;margin:-14px 0 0 12px}' +
    '.s7-tagL,.s7-tagR,.s7-ll{position:absolute;display:flex;gap:6px;align-items:center}' +
    '.s7-tagL{left:calc(14px + var(--u7-safe-l));top:calc(11vh + 14px)}.s7-tagR{right:calc(14px + var(--u7-safe-r));top:calc(11vh + 14px)}.s7-ll{left:calc(14px + var(--u7-safe-l));bottom:calc(11vh + 14px)}' +
    '#s7fall{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .3s}#s7fall.on{opacity:1}#s7fall .s7-rings{top:50%;opacity:var(--ro,1)}#s7fall .s7-node{top:50%}' +
    '#s7soft{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .6s;-webkit-backdrop-filter:blur(7px) saturate(1.05);backdrop-filter:blur(7px) saturate(1.05);' +
      '-webkit-mask:radial-gradient(ellipse 34% 26% at 50% 52%,transparent 35%,#000 100%);mask:radial-gradient(ellipse 34% 26% at 50% 52%,transparent 35%,#000 100%)}#s7soft.on{opacity:1}' +
    '.s7-skip{position:absolute;left:50%;bottom:calc(11vh - 42px + var(--u7-safe-b));transform:translateX(-50%);pointer-events:auto;z-index:3;cursor:pointer;border:0}' +
    '#u795 .u7-place.s7-arr{bottom:calc(11vh + 22px + var(--u7-safe-b));background:linear-gradient(90deg,rgba(255,59,66,.16),rgba(255,59,66,0) 30%),var(--g-panel)!important;background-image:none;border:0!important;border-left:3px solid var(--g-red)!important;border-radius:16px!important;' +
      'box-shadow:var(--g-glow),-6px 0 22px -10px rgba(255,59,66,.8)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:var(--g-ink)!important;transform:none!important}' +
    '#u795 .s7-arr .u7-kick{font:700 10.5px/1.2 var(--g-mono)!important;letter-spacing:.22em!important;color:var(--g-mint)!important;background:none!important;padding:0!important;transform:none!important}' +
    '#u795 .s7-arr h2{font:700 clamp(34px,10vw,54px)/1 var(--g-sans)!important;letter-spacing:-.02em!important;color:#fff!important;text-shadow:0 0 24px rgba(255,59,66,.35)}' +
    '#u795 .s7-arr .u7-area{font:400 11.5px/1.3 var(--g-mono)!important;letter-spacing:.1em!important;color:var(--g-dim)!important}' +
    '#u795 .s7-arr .u7-when{border:0!important;background:rgba(77,232,201,.06)!important;box-shadow:0 0 0 1px rgba(77,232,201,.35);border-radius:999px!important;font:400 12px/1.3 var(--g-mono)!important;color:#d6fff6!important}' +
    '#u795 .s7-arr .u7-when svg{filter:saturate(.7) brightness(1.3)}#u795 .s7-arr .s7-pill{margin-top:10px}' +
    /* 28 one title lane, under hud795's top row (its job card, round map and quests scroll end near +172 px), clear of the side buttons on the right */
    'html.s795 #title39{left:max(calc(12px + var(--u7-safe-l,0px)),calc(50% - 190px));right:auto;top:calc(var(--u7-safe-t,0px) + 182px);width:min(calc(100vw - 96px),380px);transform:translateY(8px);padding:11px 16px 13px;box-sizing:border-box;text-align:left;' +
      'background:linear-gradient(90deg,rgba(255,59,66,.14),rgba(255,59,66,0) 35%),rgba(12,16,26,.86);border:0;border-left:3px solid #ff3b42;border-radius:14px;box-shadow:0 0 0 1px rgba(120,140,210,.2),0 10px 30px -10px rgba(0,0,0,.7);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}' +
    'html.s795 #title39.on{transform:none}' +
    'html.s795 #title39 .t39s{display:block;font:700 10.5px/1.2 ' + G_MONO + ';letter-spacing:.22em;color:#4de8c9;background:none;padding:0;text-shadow:none}' +
    'html.s795 #title39 .t39n{display:block;margin:6px 0 0;padding:0;font:700 clamp(24px,7.5vw,32px)/1.02 ' + G_SANS + ';letter-spacing:-.01em;color:#fff;text-shadow:0 0 18px rgba(255,59,66,.35);background:none}' +
    'html.s795 #title39 .t39u{margin-top:6px;font:400 13px/1.4 ' + G_SANS + ';color:#95a0bd;text-shadow:none}' +
    'html.s795 #title39 button{margin-top:9px;min-height:40px;padding:0 16px;font:700 13px ' + G_SANS + ';background:rgba(255,59,66,.18);color:#fff;border:0;border-radius:999px;box-shadow:0 0 0 1px rgba(255,59,66,.6),0 0 14px -3px rgba(255,59,66,.6)}' +
    'html.s795 #cine781 .card{left:50%;right:auto;width:min(88vw,400px);transform:translate(-50%,14px);padding:12px 16px 14px;box-sizing:border-box;text-align:left;background:rgba(12,16,26,.86);border:0;border-left:3px solid #ff3b42;border-radius:14px;box-shadow:0 0 0 1px rgba(120,140,210,.2)}' +
    'html.s795 #cine781 .card.on{transform:translate(-50%,0)}' +
    'html.s795 #cine781 .over{display:block;font:700 10.5px/1.2 ' + G_MONO + ';letter-spacing:.22em;color:#4de8c9;text-shadow:none}' +
    'html.s795 #cine781 .name{display:block;margin:6px 0 0;padding:0;font:700 clamp(26px,8.5vw,36px)/1.02 ' + G_SANS + ';color:#fff;text-shadow:0 0 18px rgba(255,59,66,.35);background:none}' +
    'html.s795 #cine781 .line{margin:6px 0 0;max-width:none;font:400 13px/1.4 ' + G_SANS + ';color:#95a0bd;text-shadow:none}' +
    'html.s795 #cine781 .skip{font:400 11px ' + G_MONO + ';letter-spacing:.16em;color:#95a0bd}' +
    'html.s7drop #place790,html.s7drop #title39,html.s7drop #name781,html.s7drop #cine781 .skip,html.s7drop #m788ban{opacity:0!important;visibility:hidden!important}' +
    /* 7 missions: their list card gives way to the show; their result card and banner as glass */
    'html.s795 #m788card{display:none!important}' +
    'html.s795 #m788res,html.s795 #m788ban{background:rgba(12,16,26,.88)!important;color:#e9edf8!important;border:0!important;box-shadow:0 0 0 1px rgba(120,140,210,.22),0 0 18px -6px rgba(77,232,201,.45),0 12px 30px -10px rgba(0,0,0,.7)!important;font-family:' + G_SANS + '!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}' +
    'html.s795 #m788res h3,html.s795 #m788ban b{font-family:' + G_SANS + '!important;font-weight:700!important;color:#fff!important}html.s795 #m788res p{color:#95a0bd!important}html.s795 #m788res .pay{color:#ffd45c!important}' +
    'html.s795 #m788res .k,html.s795 #m788ban small{font-family:' + G_MONO + '!important;letter-spacing:.2em!important;color:#4de8c9!important}' +
    'html.s795 #m788res .big{font-family:' + G_SANS + '!important;box-shadow:0 0 0 1.5px currentColor,0 0 22px -4px currentColor}' +
    'html.s795 #m788res button{background:rgba(255,255,255,.04)!important;color:#e9edf8!important;border:0!important;box-shadow:0 0 0 1px rgba(120,140,210,.3)!important;border-radius:999px!important}html.s795 #m788res .row button.go{background:rgba(255,59,66,.2)!important;box-shadow:0 0 0 1px rgba(255,59,66,.6),0 0 14px -3px rgba(255,59,66,.6)!important}' +
    '#s7m{position:absolute;inset:0;pointer-events:auto;background:radial-gradient(120% 80% at 50% 0%,rgba(16,26,51,.55),rgba(5,6,12,.86));overflow:hidden}' +
    '#s7m .s7-sheet{position:absolute;inset:calc(10px + var(--u7-safe-t)) calc(10px + var(--u7-safe-r)) calc(10px + var(--u7-safe-b)) calc(10px + var(--u7-safe-l));display:flex;flex-direction:column;padding:14px 14px 10px;max-width:620px;margin:auto}' +
    '#s7m .s7-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:0 4px 10px;border-bottom:1px solid var(--g-line);margin-bottom:12px}' +
    '#s7m .s7-head h2{margin:4px 0 0;font:700 28px/1 var(--g-sans);letter-spacing:-.01em;color:#fff}' +
    '#s7m .s7-head .s7-n{text-align:right;font:700 22px/1 var(--g-mono);color:var(--g-gold);text-shadow:0 0 14px rgba(255,212,92,.4)}#s7m .s7-head .s7-n small{display:block;margin-top:4px;font:400 10px/1.2 var(--g-mono);letter-spacing:.16em;text-transform:uppercase;color:var(--g-dim);text-shadow:none}' +
    '#s7m .s7-grid{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:max-content;align-content:start;gap:12px;padding:4px 2px 10px}' +
    '#s7m .u7-mission{background:var(--g-panel2)!important;background-image:none!important;border:0!important;border-radius:14px!important;box-shadow:var(--g-glow)!important;color:var(--g-ink)!important;transform:none!important;overflow:hidden}' +
    '#s7m .u7-mission:active{box-shadow:var(--g-glowM)!important}' +
    '#s7m .u7-mission .u7-pic{height:92px;border:0!important;border-radius:14px 14px 0 0!important}' +
    '#s7m .u7-mission .u7-pic::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,6,12,0) 45%,rgba(12,16,26,.95))}' +
    '#s7m .u7-mission .u7-badge{left:8px!important;top:8px!important;min-width:30px;height:30px;border-radius:50%!important;font:700 11px/1 var(--g-mono)!important;color:var(--g-mint)!important;background:rgba(5,6,12,.7)!important;border:1.5px solid rgba(77,232,201,.6)!important;box-shadow:0 0 10px -2px rgba(77,232,201,.6)!important;transform:none!important}' +
    '#s7m .u7-mission .u7-next{font:700 9.5px/1 var(--g-mono)!important;letter-spacing:.14em!important;color:var(--g-mint)!important;background:rgba(5,6,12,.75)!important;border:0!important;border-radius:999px!important;padding:5px 8px!important;box-shadow:var(--g-glowM)}' +
    '#s7m .u7-mission .u7-txt{padding:4px 11px 11px}#s7m .u7-mission .u7-where{font:400 10px/1.3 var(--g-mono)!important;letter-spacing:.12em!important;color:var(--g-dim)!important}' +
    '#s7m .u7-mission h4{margin:4px 0 4px;font:700 17px/1.08 var(--g-sans)!important;color:#fff}#s7m .u7-mission p{font:400 12.5px/1.38 var(--g-sans)!important;color:#c3cbe0!important}' +
    '#s7m .u7-mission.locked .u7-pic>*{filter:grayscale(1) brightness(.45)!important}#s7m .u7-mission.locked p{color:var(--g-muted)!important;font-style:italic}#s7m .u7-mission .u7-stamp{display:none!important}' +
    '#s7m .u7-mission .s7-lock{position:absolute;right:8px;top:8px;z-index:3}' +
    '#s7m .s7-gr{display:flex;gap:4px;margin-top:8px}#s7m .s7-gr i{flex:1;height:20px;display:grid;place-items:center;font:700 10.5px/1 var(--g-mono);font-style:normal;border-radius:999px;color:var(--g-muted);box-shadow:0 0 0 1px var(--g-line)}' +
    '#s7m .s7-gr i.g3{color:var(--g-mint);box-shadow:var(--g-glowM)}#s7m .s7-gr i.g4{color:var(--g-gold);box-shadow:0 0 0 1px rgba(255,212,92,.6),0 0 10px -2px rgba(255,212,92,.6)}#s7m .s7-gr i.g0,#s7m .s7-gr i.g1,#s7m .s7-gr i.g2{color:var(--g-ink);box-shadow:0 0 0 1px rgba(233,237,248,.35)}' +
    '#s7m .s7-best{position:absolute;right:8px;top:62px;z-index:3}' +
    '#s7m .s7-pic{position:absolute;inset:0;background-size:cover;background-position:var(--bp,50% 50%)}' +
    '#s7m .s7-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--g-line)}' +
    '#s7m .s7-foot button,#s7m .s7-quiet{min-height:42px;padding:0 16px;font:600 12px/1 var(--g-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--g-ink);background:rgba(255,255,255,.03);border:0;border-radius:999px;box-shadow:0 0 0 1px var(--g-line);cursor:pointer}' +
    '#s7m .s7-foot .s7-note{font:400 11.5px/1.35 var(--g-sans);color:var(--g-dim);text-align:right}' +
    /* the briefing: it glows in line by line (the speaker in a ringed badge, the line in a warm note) */
    '#s7m .s7-brief{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:2px}' +
    '#s7m .s7-shot{position:relative;height:clamp(150px,30vh,240px);border-radius:16px;overflow:hidden;box-shadow:var(--g-glow)}' +
    '#s7m .s7-shot::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,6,12,.1),rgba(5,6,12,.15) 50%,rgba(5,6,12,.88))}' +
    '#s7m .s7-shot .s7-cap{position:absolute;left:12px;top:12px;z-index:2}#s7m .s7-shot .s7-ttl{position:absolute;left:14px;bottom:12px;z-index:2;font:700 clamp(26px,8vw,36px)/1 var(--g-sans);letter-spacing:-.015em;color:#fff;text-shadow:0 0 22px rgba(255,59,66,.5)}' +
    '#s7m .s7-who{display:flex;align-items:center;gap:12px}' +
    '#s7m .s7-ring{flex:none;width:58px;height:58px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 1.5px var(--g-red),0 0 0 6px rgba(255,59,66,.1),0 0 20px rgba(255,59,66,.5);background:radial-gradient(circle,#2a2140,#0a0d18)}#s7m .s7-ring svg{width:100%;height:100%}' +
    '#s7m .s7-ring.m{box-shadow:0 0 0 1.5px var(--g-mint),0 0 0 6px rgba(77,232,201,.08),0 0 18px rgba(77,232,201,.45)}' +
    '#s7m .s7-who b{display:block;font:700 10.5px/1.2 var(--g-mono);letter-spacing:.2em;text-transform:uppercase;color:var(--g-mint)}' +
    '#s7m .s7-note2{position:relative;margin:0;padding:12px 14px;border-radius:14px;font:400 15px/1.5 var(--g-sans);color:#f4e9ea;background:linear-gradient(180deg,rgba(255,59,66,.13),rgba(255,59,66,.05));box-shadow:0 0 0 1px rgba(255,59,66,.32);min-height:48px}' +
    '#s7m .s7-reply{font:400 italic 14px/1.4 var(--g-sans);color:var(--g-dim)}' +
    '#s7m .s7-step{opacity:0}#s7m .s7-step.in{animation:s7glowin .5s cubic-bezier(.2,.7,.2,1) both}' +
    '#s7m .s7-next{align-self:flex-end}' +
    '#s7m .s7-next button,#s7m .s7-go{min-height:50px;padding:0 24px;font:700 18px/1 var(--g-sans);color:#fff;background:rgba(255,59,66,.2);border:0;border-radius:999px;box-shadow:0 0 0 1px rgba(255,59,66,.65),0 0 20px -4px rgba(255,59,66,.7);cursor:pointer}' +
    '#s7m .s7-go:active,#s7m .s7-next button:active{transform:scale(.97)}' +
    /* the job card */
    '#s7m .s7-job{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:2px}' +
    '#s7m .s7-job .s7-shot{height:clamp(120px,22vh,180px)}#s7m .s7-job .s7-shot .s7-st{position:absolute;right:12px;top:12px;z-index:2}' +
    '#s7m .s7-job h5{margin:2px 0 4px}#s7m .s7-job .s7-line{font:600 15px/1.45 var(--g-sans);color:#fff}' +
    '#s7m .s7-job .s7-meta{font:400 11px/1.3 var(--g-mono);letter-spacing:.1em;color:var(--g-dim);text-transform:uppercase}' +
    '#s7m .s7-job ul{margin:0;padding:0;list-style:none;display:grid;gap:7px}#s7m .s7-job li{position:relative;padding-left:20px;font:400 13.5px/1.4 var(--g-sans);color:#c3cbe0}' +
    '#s7m .s7-job li::before{content:"";position:absolute;left:3px;top:6px;width:7px;height:7px;border-radius:50%;background:var(--g-mint);box-shadow:0 0 8px var(--g-mint)}' +
    '#s7m .s7-keys{display:flex;flex-wrap:wrap;gap:7px}#s7m .s7-keys .s7-pill b{color:#fff;font-weight:700}' +
    '#s7m .s7-gobar{display:flex;align-items:center;gap:14px;margin-top:4px}#s7m .s7-quiet{background:none;box-shadow:none;color:var(--g-dim)}' +
    /* 11 the photo */
    'html.p795 #start,html.p795 #ui,html.p795 #pauseRow{visibility:hidden!important}' +
    '#s7photo{position:absolute;inset:0;pointer-events:auto;background:radial-gradient(100% 70% at 50% 30%,#101a33,#05060c);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:calc(12px + var(--u7-safe-t)) 12px calc(12px + var(--u7-safe-b))}' +
    '#s7photo img{display:block;max-width:100%;max-height:calc(100vh - 220px);object-fit:contain;border-radius:12px;box-shadow:0 0 0 1px rgba(120,140,210,.25),0 0 40px -10px rgba(255,59,66,.45),0 18px 40px rgba(0,0,0,.6)}' +
    '#s7photo .s7-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%;max-width:430px}' +
    '#s7photo .s7-row button{flex:1;min-height:46px;font:600 12px/1 var(--g-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--g-ink);background:rgba(255,255,255,.03);border:0;border-radius:999px;box-shadow:0 0 0 1px var(--g-line);cursor:pointer}' +
    '#s7photo .s7-row button[aria-pressed="true"]{color:var(--g-mint);box-shadow:var(--g-glowM)}#s7photo .s7-row button.s7-save{color:#fff;background:rgba(255,59,66,.2);box-shadow:0 0 0 1px rgba(255,59,66,.65),0 0 18px -4px rgba(255,59,66,.7);font:700 16px/1 var(--g-sans);letter-spacing:0;text-transform:none}' +
    '#s7photo input{width:100%;max-width:430px;box-sizing:border-box;min-height:44px;padding:0 14px;font:400 15px var(--g-sans);color:#fff;background:rgba(12,16,26,.85);border:0;border-radius:12px;box-shadow:0 0 0 1px var(--g-line)}' +
    /* 13 the sound words: a short word that glows in over the action and fades */
    '.s7-fx{position:absolute;left:0;top:0;pointer-events:none;font:700 var(--fs,30px)/1 var(--g-sans);letter-spacing:.04em;white-space:nowrap;color:#fff;text-shadow:0 0 6px var(--fc),0 0 18px var(--fc),0 2px 2px rgba(5,6,12,.7);' +
      'animation:s7pop .95s cubic-bezier(.2,1.2,.4,1) both;will-change:transform,opacity}' +
    '@keyframes s7pop{0%{opacity:0;transform:translate(var(--x),var(--y)) translate(-50%,-50%) rotate(var(--r)) scale(.6);filter:brightness(2)}22%{opacity:1;transform:translate(var(--x),var(--y)) translate(-50%,-50%) rotate(var(--r)) scale(1.08)}38%{transform:translate(var(--x),var(--y)) translate(-50%,-50%) rotate(var(--r)) scale(1);filter:none}78%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) translate(-50%,-75%) rotate(var(--r)) scale(1)}}' +
    '#pauseRow #photo795 small,#pauseRow #words795 small{display:block;font-size:10.5px;opacity:.8}' +
    '@media (prefers-reduced-motion:reduce){.s7-rings{animation:none}.s7-fx{animation-duration:.01s}.s7-in,#s7m .s7-step.in{animation-duration:.01s}}';

  function create(o) {
    var U = window.UI795, THREE = o.THREE; if (!U || !THREE) { API.error = 'no kit'; return null; }
    if (o.classic && o.classic()) return null;
    U.css(CSS); document.documentElement.classList.add('s795');
    var setDirty = false; function keepSet() { if (setDirty) { setDirty = false; storeSet(set); } }   /* #140: the title counter is written as the page is left or hidden, never mid-flow */
    try { addEventListener('pagehide', keepSet); document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') keepSet(); }); } catch (e) { /* no page events: the counter stays this visit's */ }
    var S = o.S, camera = o.camera, set = loadSet(), V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
    var st = { title: null, titleT: 0, perch: null, shows: 0, drop: null, drops: 0, dropSkips: 0, laneQ: [], lanes: 0, m: null, mOpens: 0, briefs: 0, cases: 0, gos: 0,
      photo: null, photos: 0, saves: 0, fx: 0, fxLast: {}, fxN: {}, diveCd: 0, wasDive: false, fish: S.fishCaught || 0, place751: -1, arrivals: -1, reveals: -1, eyeOn: false,
      eyeH: 0, pics: {}, picQ: [], err: '', tick: 0, saved: { p: new THREE.Vector3(), q: new THREE.Quaternion(), fov: 50, on: false }, bird: null };
    function L() { return U.layer(); }
    function now() { return performance.now(); }
    function hurt(where, e) { st.err = where + ': ' + (e && e.message || e); API.error = st.err; API.stack = e && e.stack; }
    function info() {   /* place-free facts of the moment: the time, the day, the weather */
      var c = clock(S.clock), d = o.day ? o.day() : 1, w = weather(o.wx ? o.wx() : 'clear', c.night);
      return { c: c, day: dayName(d), dayN: d, w: w };
    }

    /* =================== 2 THE TITLE =================== */
    function perches() { var out = []; try { out = (o.perches ? o.perches() : []).filter(function (p) { return p && p.p && isFinite(p.p.x) && (!p.ok || p.ok()); }); } catch (e) { hurt('perches', e); } return out; }
    function choosePerch() {
      var list = perches(); if (!list.length) return null;
      var P = list[set.n % list.length]; set.n = (set.n + 1) % 997; setDirty = true;   /* the next visit's perch: kept as she leaves (below), never written while she plays (#140: Fly together's join writes only its room) */
      /* the open side: the camera looks past her over the lowest ground (a view, never a wall) */
      var best = null, bestS = -1e9, g = o.ground || function () { return 0; };
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a), s = 0, ok = true;
        for (var k = 1; k <= 8; k++) { var d = 12 + k * k * 3, h = g(P.p.x + dx * d, P.p.z + dz * d); s += (h > (o.water || 0) + 0.6 && h < P.p.y - 1.5 ? 1 : 0) + (h < P.p.y ? 0.15 : -1); }   /* the island in the view (land below her, not a wall, not only sea) */
        var cx = P.p.x - dx * 2.6, cz = P.p.z - dz * 2.6; if (g(cx, cz) > P.p.y - 0.3) ok = false;   /* the camera itself never in the ground */
        s -= clutter(P, a) * 40;   /* 815: a lamp the page names (P.avoid) never stands in the middle of the view (Marth's #141 picture: the green's lantern under her) */
        if (ok && s > bestS) { bestS = s; best = a; }
      }
      return { id: P.id, name: P.name, area: P.area, p: P.p.clone ? P.p.clone() : new THREE.Vector3(P.p.x, P.p.y, P.p.z), yaw: best == null ? 0 : best, s: P.s || 1, cam: P.cam || null, avoid: P.avoid || null };
    }
    /* 815: how many of the perch's named lamps (P.avoid, points) the title camera would hold in its picture, looking from yaw a. The camera sits behind her
       and 0.42 rad to the side (titleCam), so it looks along a + 0.42 (+ the small turn that sets her right of centre); a phone's picture is about 0.21 rad
       either side of that (and the drift turns it 0.09 more), so a lamp within 35 m counts while it is within 0.3 rad (farther, its disc is small). */
    function clutter(P, a) {
      var L = P.avoid, n = 0; if (!L || !L.length) return 0; var va = a + 0.48;
      for (var i = 0; i < L.length; i++) { var dx = L[i].x - P.p.x, dz = L[i].z - P.p.z, d = Math.hypot(dx, dz); if (d < 1 || d > 35) continue;
        var t = Math.atan2(dx, dz) - va; t = Math.atan2(Math.sin(t), Math.cos(t)); if (Math.abs(t) < 0.3) n++; }
      return n;
    }
    function subs() {
      var out = {}, lv = o.lv ? o.lv() : { level: S.level }, M = window.WFR_MISSIONS788;
      out.fly = o.away && o.away() ? 'Back to ' + o.away() + ' · Lv ' + lv.level
        : !S.storySeen ? 'Her story first, then the island'
        : 'Lv ' + lv.level + (lv.next ? ' · next gift at Lv ' + lv.next.lv + (lv.toGo != null ? ' (' + lv.toGo + ' XP)' : '') : ' · as high as a bird goes');
      try { var b = mBest(), n = M ? M.PLACES.length * M.KINDS.length : 45;
        out.mis = n + ' in ' + (M ? M.PLACES.length : 9) + ' places · ' + (b.a ? b.a + ' ' + WORDS.ranked : 'none ranked yet') + (b.next ? ' · next: ' + b.next : ''); } catch (e) { out.mis = 'five in every place'; }
      out.together = WORDS.togetherSub;
      var sh = U.SHIPS && U.SHIPS[0]; out.news = sh ? '#' + sh.n + ' · ' + sh.title : 'the ship log';
      return out;
    }
    function titleOn() { try { return !!(o.titleOn && o.titleOn()); } catch (e) { return false; } }
    function showTitle() {
      if (st.title) return; st.perch = choosePerch(); st.shows++;
      var root = U.el('div'); root.id = 's7title'; var P = st.perch, s = subs();
      root.innerHTML = "<div class='s7-shade'></div><div class='s7-rings'></div><div class='s7-head'><div class='s7-brand'><span class='s7-badge'><svg viewBox='0 0 32 32'><path d='M5 19c4-1 7-4 9-8 1 4 4 6 9 6-3 3-7 5-12 5-2 0-4-1-6-3z' fill='#ff3b42'/><path d='M14 11l3-5 1 5' fill='#ff3b42'/><circle cx='20' cy='13' r='1.3' fill='#05060c'/><path d='M23 14l4 1-4 1' fill='#ffd45c'/></svg></span><span><b>Wings for <em>Rouge</em></b><small>A BIRTHDAY ISLAND // LV " + esc(S.level || 1) + '</small></span></div>' +
        (P ? "<div class='s7-where'><span class='s7-pill m'><i></i>" + esc(WORDS.meanwhile) + '</span><b>' + esc(P.name) + '</b><span>' + esc(P.area || '') + '</span></div>' : '') + '</div>' +
        "<div class='s7-foot'><button type='button' class='s7-pill' data-a='files'>" + esc(WORDS.files) + "</button><button type='button' class='s7-pill' data-a='credits'>" + esc(WORDS.credits) + '</button></div>';
      L().appendChild(root); document.documentElement.classList.add('t795');
      var go = o.goLabel ? o.goLabel() : WORDS.fly;
      st.menu = U.menu({ parent: root, keys: true, items: [
        { title: go, sub: s.fly, onPick: function () { var g = document.getElementById('go'); if (g) g.click(); } },   /* the slot: the game's own #go takes its place (moveIn; a key's Enter on it presses Fly) */
        { title: WORDS.missions, sub: s.mis, onPick: function () { openBoard(); } },
        { title: WORDS.together, sub: s.together, onPick: function () { var g = document.getElementById('netBtn678t'); if (g) g.click(); } },   /* the slot: the game's own #netBtn678t takes its place */
        { title: WORDS.news, sub: s.news, onPick: function () { news(); } }] });
      var its = st.menu.el.querySelectorAll('.u7-item'); [0, 2].forEach(function (i) { var sl = its[i]; if (sl) { sl.classList.add('s7-slot'); sl.tabIndex = -1; sl.setAttribute('aria-hidden', 'true'); } });
      var gb = document.getElementById('go'); if (gb) gb.style.setProperty('--s7sub', '"' + String(s.fly).replace(/"/g, '') + '"');
      var nb = document.getElementById('netBtn678t'); if (nb) { nb.style.setProperty('--s7sub', '"' + String(s.together).replace(/"/g, '') + '"');
        if (!nb.dataset.s795) { nb.dataset.s795 = '1'; nb.addEventListener('click', function () { if (document.documentElement.classList.contains('t795')) classicSheet('shown'); }); } }   /* its own handler opens the sheet's Fly together panel; the title steps aside to show it */
      st.slots = [[its[0], 'go'], [its[2], 'netBtn678t']]; moveIn(); goPlace();
      root.querySelector('[data-a=files]').addEventListener('click', function () { classicSheet('files'); });
      root.querySelector('[data-a=credits]').addEventListener('click', function () { classicSheet('credits'); });
      ['.s7-brand', '.s7-where'].forEach(function (q, i) { var e = root.querySelector(q); if (e) { e.style.animationDelay = (0.1 + i * 0.15) + 's'; e.classList.add('s7-in'); } });
      st.title = root;
    }
    /* 815: the game's own Fly (#go) and Fly together (#netBtn678t) are MOVED into the menu, each just before its slot, while the title is up: drawn in the
       menu's own flow like cards 02 and 04 (on Marth's iPhone the overlay with position:fixed never showed: 01 and 03 were missing). Same elements, ids
       and taps; each goes back to its own place in the sheet (moveHome) before the sheet is shown, the title leaves, or a pause opens it. */
    function moveIn() {
      var R = document.documentElement, n = 0; st.home = st.home || {};
      (st.slots || []).forEach(function (q) { var g = document.getElementById(q[1]), sl = q[0]; if (!g || !sl || !sl.parentNode) return;
        if (g.parentNode !== sl.parentNode) { st.home[q[1]] = { p: g.parentNode, n: g.nextSibling }; sl.parentNode.insertBefore(g, sl); }
        sl.classList.add('s7-out'); n++; });
      R.classList.toggle('s7mv', n === 2);
    }
    function moveHome() {
      var H = st.home || {}; document.documentElement.classList.remove('s7mv');
      Object.keys(H).forEach(function (id) { var g = document.getElementById(id), h = H[id]; if (!g || !h || !h.p) return;
        if (h.n && h.n.parentNode === h.p) h.p.insertBefore(g, h.n); else h.p.appendChild(g); });
      st.home = {}; (st.slots || []).forEach(function (q) { if (q[0]) q[0].classList.remove('s7-out'); });
    }
    function sheetLook(on) {   /* 815: the old sheet in the title's look while the title has stepped aside for it */
      var R = document.documentElement, sh = document.querySelector('#start > .sheet'); R.classList.toggle('s7sheet', !!on); if (sh) sh.classList.toggle('u7-card', !!on);
    }
    function goPlace() {   /* the game's own buttons (#go, #netBtn678t) over their menu slots (size and place each frame while the title is up: the cards glide in) */
      (st.slots || []).forEach(function (q, i) { var g = document.getElementById(q[1]), sl = q[0]; if (!g || !sl || !sl.isConnected || (st.home && st.home[q[1]] && g.parentNode === sl.parentNode)) return; var r = sl.getBoundingClientRect(); if (!r.width) return;
        var k = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], key = 'gk' + i; if (st[key] && st[key].join() === k.join()) return; st[key] = k;
        g.style.setProperty('--gx', k[0] + 'px'); g.style.setProperty('--gy', k[1] + 'px'); g.style.setProperty('--gw', k[2] + 'px'); g.style.setProperty('--gh', k[3] + 'px'); });
    }
    function leaveTitle() {
      var r = st.title; if (!r) return; moveHome(); sheetLook(false); st.title = null; st.slots = null; st.gk0 = st.gk1 = null; ['go', 'netBtn678t'].forEach(function (id) { var g = document.getElementById(id); if (g) ['--gx', '--gy', '--gw', '--gh', '--s7sub'].forEach(function (v) { g.style.removeProperty(v); }); }); if (st.menu) { try { st.menu.destroy(); } catch (e) { /* gone */ } st.menu = null; }
      document.documentElement.classList.remove('t795'); var ch = document.getElementById('s7back'); if (ch) ch.remove(); var nw = document.getElementById('s7news'); if (nw) nw.remove();
      U.leave(r, { to: 'down', dur: 260 });
    }
    function classicSheet(what) {   /* the old sheet, one tap away: files, birds, backups, credits, flying together */
      moveHome(); document.documentElement.classList.remove('t795'); sheetLook(true); if (st.title) st.title.style.visibility = 'hidden';
      var b = document.getElementById('s7back'); if (!b) { b = U.el('button', 's7-chip s7-pill', '‹ ' + esc(WORDS.back)); b.type = 'button'; b.id = 's7back'; L().appendChild(b);
        b.addEventListener('click', function () { b.remove(); sheetLook(false); if (st.title) { st.title.style.visibility = ''; document.documentElement.classList.add('t795'); moveIn(); } }); }
      try { var t = what === 'together' ? document.getElementById('netBtn678t') : what === 'credits' ? document.getElementById('credit712') : document.getElementById('files');
        if (t && what === 'together') t.click(); if (what === 'shown') t = document.getElementById('net678'); if (t) setTimeout(function () { t.scrollIntoView({ block: 'center' }); }, 60); } catch (e) { /* the sheet is there either way */ }
    }
    function news() {
      var old = document.getElementById('s7news'); if (old) { old.remove(); return; }
      var c = U.whatsNew({ max: 5 }); c.id = 's7news'; var x = U.el('button', 's7-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); c.appendChild(x);
      (st.title || L()).appendChild(c); U.slam(c, { from: 'up', tilt: -1 }); x.addEventListener('click', function () { U.leave(c); });
    }
    /* the title's camera: low beside her on the perch, looking past her over the island; a slow breath of a drift */
    function perchBird() {   /* the title's own bird (the player's is made at Fly): the page's builder in its teacher form, so it never takes her wings */
      var k = o.kind ? o.kind() : 'cardinal'; if (st.tb && st.tbK === k) return st.tb;
      if (st.tb) { if (st.tb.parent) st.tb.parent.remove(st.tb); st.tb = null; }
      try { st.tb = o.titleBird ? o.titleBird(k) : null; } catch (e) { hurt('bird', e); st.tb = null; } st.tbK = k; if (st.tb) { var G0 = o.get ? o.get() : {}, h0 = new THREE.Box3().setFromObject(st.tb).getSize(new THREE.Vector3()).y || 1; st.tb.scale.multiplyScalar(((G0.size || 0.42) * 1.45) / h0); st.tb.visible = false; o.scene.add(st.tb); } return st.tb;
    }
    function titleCam(on) {
      var P = st.perch; if (!P) return; var G = o.get ? o.get() : {}, bird = G.bird || perchBird(), own = !G.bird;
      if (on) {
        var t = now() / 1000, yaw = P.yaw, dx = Math.sin(yaw), dz = Math.cos(yaw), sx = Math.cos(yaw), sz = -Math.sin(yaw), s = P.s, drift = Math.sin(t * 0.21) * 0.35, C = P.cam;
        st.saved.p.copy(camera.position); st.saved.q.copy(camera.quaternion); st.saved.fov = camera.fov; st.saved.on = true;
        var cd = (C && C.d || 4.2) * s, cu = (C && C.up || 1.25) * s, ca = yaw + Math.PI + 0.42 + drift * 0.25;   /* behind her and a little to the side, the view past her */
        camera.position.set(P.p.x + Math.sin(ca) * cd, P.p.y + cu, P.p.z + Math.cos(ca) * cd);
        if (o.ground) camera.position.y = Math.max(camera.position.y, o.ground(camera.position.x, camera.position.z) + 0.4);
        camera.fov = C && C.fov || 50; V.copy(P.p).sub(camera.position).normalize();
        var y0 = Math.atan2(V.x, V.z), p0 = Math.asin(Math.max(-1, Math.min(1, V.y))), th = Math.tan(camera.fov * Math.PI / 360), asp = camera.aspect || 0.46;
        var cy = y0 + Math.atan(0.3 * th * asp), cp = p0 - Math.atan(0.2 * th);   /* she sits right of centre and above the cards (NDC 0.34, 0.22) */
        V2.set(Math.sin(cy) * Math.cos(cp), Math.sin(cp), Math.cos(cy) * Math.cos(cp)).add(camera.position); camera.lookAt(V2);
        camera.updateProjectionMatrix(); camera.updateMatrixWorld(); st.camAt = camera.position.toArray();
        if (o.sunAt) try { o.sunAt(P.p); } catch (e) { /* no shadow move */ }
        if (bird) { st.bird = { own: own, p: bird.position.clone(), r: bird.rotation.clone(), v: bird.visible, wl: G.wingL ? [G.wingL.rotation.y, G.wingL.rotation.z] : null, wr: G.wingR ? [G.wingR.rotation.y, G.wingR.rotation.z] : null, h: G.rig && G.rig.head ? G.rig.head.rotation.y : null };
          bird.position.copy(P.p); bird.rotation.set(0, yaw + 0.95 + Math.sin(t * 0.5) * 0.08, 0); bird.visible = true;
          if (!own && G.wingL) { G.wingL.rotation.y = 1.3; G.wingL.rotation.z = -0.18; } if (!own && G.wingR) { G.wingR.rotation.y = -1.3; G.wingR.rotation.z = 0.18; }
          if (!own && G.rig && G.rig.head) G.rig.head.rotation.y = Math.sin(t * 0.7) * 0.35 + (Math.sin(t * 2.3) > 0.93 ? 0.4 : 0); }
      } else {
        if (st.saved.on) { camera.position.copy(st.saved.p); camera.quaternion.copy(st.saved.q); camera.fov = st.saved.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); st.saved.on = false; }
        var B = st.bird; if (bird && B && B.own) { bird.visible = false; st.bird = null; } else if (bird && B) { bird.position.copy(B.p); bird.rotation.copy(B.r); bird.visible = B.v; if (G.wingL && B.wl) { G.wingL.rotation.y = B.wl[0]; G.wingL.rotation.z = B.wl[1]; } if (G.wingR && B.wr) { G.wingR.rotation.y = B.wr[0]; G.wingR.rotation.z = B.wr[1]; } if (G.rig && G.rig.head && B.h != null) G.rig.head.rotation.y = B.h; st.bird = null; }
      }
    }

    /* =================== 4 THE DROP-IN =================== */
    function eyeEl() {
      var e = document.getElementById('s7eye'); if (e) return e;
      e = U.el('div'); e.id = 's7eye'; e.innerHTML = "<div class='s7-rings'></div><div class='s7-rings b'></div><div class='s7-node'><b class='s7-pill r'>Rouge</b></div>" +
        "<div class='s7-tagL'><span class='s7-pill m'><i></i>" + esc(WORDS.eagleEye) + "</span></div><div class='s7-tagR'><span class='s7-pill'>" + esc(WORDS.looking) + "…</span></div>" +
        "<div class='s7-ll'><span class='s7-pill s7-xy'>—</span><span class='s7-pill g s7-h'>—</span></div>";
      L().appendChild(e); return e;
    }
    function veilTick(real) {   /* 725d's dusk veil (a wake where she left off, a drop) is the Eagle's eye while the ground streams in under it */
      var v = document.getElementById('veil725d'), on = !!(v && +v.style.opacity > 0.5 && !st.drop);
      if (on !== st.eyeOn) { st.eyeOn = on; var e = eyeEl(); e.classList.toggle('on', on); if (on) { st.eyeH = 1800 + Math.random() * 400; st.eyeT = 0; } }
      if (!on) return; st.eyeT += real; st.eyeH = Math.max(420, st.eyeH - real * 160 * (1 + st.eyeT * 0.3));
      var e2 = eyeEl(), ll = o.ll ? o.ll() : null; e2.querySelector('.s7-h').textContent = Math.round(st.eyeH) + WORDS.up; if (ll) e2.querySelector('.s7-xy').textContent = fmtLL(ll.lat, ll.lon);
    }
    function nameHere(why) {   /* the place under her: the named places (790 D) first, then the country (783), then the map's own name, then the numbers */
      var ll = o.ll ? o.ll() : null, out = { place: '', area: '' };
      if (why && why.name) out.place = why.name;
      if (ll) {
        try { var N = window.WFR_PLACES790 && WFR_PLACES790.near ? WFR_PLACES790.near(ll.lat, ll.lon, 300) : []; if (N && N.length) { if (!out.place) out.place = N[0].n; var nb = N.filter(function (q) { return q.n !== out.place; })[0]; if (nb) out.area = 'near ' + nb.n; out.fact = N[0].u || ''; } } catch (e) { /* no names */ }
        try { var A = window.WFR_ARRIVE783; if (A) { var bk = 1e9, bn = ''; A.PLACES.forEach(function (P) { var r = A.nearest(P, ll.lat, ll.lon); if (r && r.km < bk) { bk = r.km; bn = P.name; } }); if (bk < 120) { var cn = bn.charAt(0) + bn.slice(1).toLowerCase(); out.area = out.area ? out.area + ' · ' + cn : cn; } } } catch (e) { /* no country */ }
        if (!out.place) out.place = fmtLL(ll.lat, ll.lon);
      }
      if (!out.place) out.place = o.where ? o.where() : 'Somewhere new';
      return out;
    }
    function dropIn(why) {
      why = why || {}; var C = o.cine; if (!C || st.drop) return false; if (C.on && C.on()) { st.dropWait = why; st.dropWaitT = 0; return false; }   /* never over another scene: it waits its turn */
      if (st.photo || st.m) return false;
      var G = o.get ? o.get() : {}, bird = G.bird; if (!bird) return false;
      var hb = 0.6; try { hb = new THREE.Box3().setFromObject(bird).getSize(V3).y || 0.6; } catch (e) { hb = 0.6; }
      var where = nameHere(why), I = info(), ll = o.ll ? o.ll() : null, s = Math.max(0.5, Math.min(6, hb / 0.6));
      var D = st.drop = { why: why.kind || 'drop', step: 0, t: 0, off: 0, H0: why.h0 || 320, card: null, where: where, ended: false, s: s };
      var B = new THREE.Vector3().copy(S.pos), yaw = S.yaw || 0, side = 1;
      if (o.sunDir) try { var sd = o.sunDir(), f = function (sg) { var an = yaw + sg * 1.2; return -(Math.sin(an) * sd.x + Math.cos(an) * sd.z); }; side = f(1) <= f(-1) ? 1 : -1; } catch (e) { /* either side */ }
      var fall = U.el('div'); fall.id = 's7fall'; fall.innerHTML = "<div class='s7-rings'></div><div class='s7-node'><b class='s7-pill r'>Rouge</b></div>" +
        "<div class='s7-tagL'><span class='s7-pill m'><i></i>" + esc(WORDS.eagleEye) + "</span><span class='s7-pill'>" + esc(WORDS.found) + "</span></div><div class='s7-ll'><span class='s7-pill'>" + esc(ll ? fmtLL(ll.lat, ll.lon) : where.place) + "</span><span class='s7-pill g s7-h'>" + D.H0 + WORDS.up + '</span></div>';
      var soft = U.el('div'); soft.id = 's7soft';
      var skip = U.el('button', 's7-skip s7-pill', 'Tap: next &nbsp;·&nbsp; ' + esc(WORDS.skip) + ' ›'); skip.type = 'button';
      L().appendChild(soft); L().appendChild(fall); L().appendChild(skip); D.els = [fall, soft, skip];
      skip.addEventListener('pointerdown', function (e) { e.stopPropagation(); }); skip.addEventListener('click', function (e) { e.stopPropagation(); st.dropSkips++; finish(); });
      requestAnimationFrame(function () { fall.classList.add('on'); }); document.documentElement.classList.add('s7drop'); { var t39 = document.getElementById('title39'); if (t39) t39.classList.remove('on'); }   /* the arrival card names the place: a title already up gives way */
      var T1 = 2.6, T2 = 4.4, T3 = 9.6;   /* the fall, the close-up, the card held */
      function to(step) { D.off += Math.max(0, [0, T1, T2, T3][step] - (D.t)); }
      function finish() { if (D.ended) return; D.ended = true; try { C.end('tap'); } catch (e) { cleanup(); } }
      function cleanup() {
        if (st.drop !== D) return; st.drop = null; document.documentElement.classList.remove('s7drop'); D.els.forEach(function (e) { if (e.isConnected) { e.classList.remove('on'); setTimeout(function () { e.remove(); }, 400); } });
        if (D.card) D.card.close(); setTimeout(flushLane, 700);
      }
      var ok = C.play({ name: 'drop795', dur: 60, skip: 0, freeze: true, bars: true,
        onTap: function () { if (D.t < T1) to(1); else if (D.t < T2) to(2); else { finish(); } return 'held'; },
        tick: function (t) {
          D.t = t + D.off; var h;
          if (D.t < T1) { var k = sm(D.t / T1), e = 1 - Math.pow(1 - D.t / T1, 3); h = D.H0 * (1 - e) + 4 * e; fall.querySelector('.s7-h').textContent = Math.max(1, Math.round(h * (1 + 0 * k))) + WORDS.up;
            fall.querySelector('.s7-rings').style.setProperty('--rw', (118 - 70 * k) + 'vw'); fall.style.setProperty('--ro', String(1 - k * 0.85)); }
          else if (D.step < 1) { D.step = 1; fall.classList.remove('on'); soft.classList.add('on'); }
          if (D.t >= T2 && D.step < 2) { D.step = 2; var tm = I.c;
            D.card = U.placeCard({ kicker: why.kind === 'woke' ? WORDS.woke : why.kind === 'flew' ? WORDS.flew : why.kind === 'drop' ? WORDS.dropped : WORDS.arrived,
              place: where.place, area: where.area, day: I.day, time: tm.text, weather: I.w.text, icon: I.w.icon });
            D.card.el.classList.add('s7-arr'); D.card.el.insertAdjacentHTML('beforeend', "<span class='s7-pill m'><i></i>" + esc(WORDS.stamp) + '</span>'); try { if (o.sound) o.sound('country'); } catch (e) { /* the card without its sound */ } }
          if (D.t >= T3 && !D.ended) finish();
        },
        shot: function (t, u, P, Lk) {
          var tt = t + D.off, s = D.s;
          if (tt < T1) { var e = 1 - Math.pow(1 - tt / T1, 3), h = D.H0 * (1 - e) + 4 * s * e, back = 0.06 * h + 3 * s * e;
            P.set(B.x - Math.sin(yaw) * back, B.y + h, B.z - Math.cos(yaw) * back); Lk.copy(B); return 56 - 14 * e; }
          var k = sm((tt - T1) / 1.2), ang = yaw + side * (1.05 - 0.15 * k), dd = (3.4 - 0.5 * sm((tt - T1) / 6)) * s;
          P.set(B.x + Math.sin(ang) * dd, B.y + (0.55 - 0.2 * k) * s, B.z + Math.cos(ang) * dd); if (o.floor) P.y = Math.max(P.y, o.floor(P.x, P.z) + 0.3);
          Lk.set(B.x, B.y + 0.18 * s, B.z); return 40;
        },
        end: function () { cleanup(); } });
      if (!ok) { cleanup(); return false; }
      st.drops++; return true;
    }
    function dropWatch(real) {   /* what counts as an arrival: a wake where she left off, a Fly there arriving, a drop revealed */
      try {
        var p = o.place751 ? o.place751() : null; if (p) { if (st.place751 < 0) st.place751 = p.backs; else if (p.backs > st.place751) { st.place751 = p.backs; dropIn({ kind: 'woke' }); } }
        var F = window.WFR_FAST725D; if (F && F.arrivals) { var a = F.arrivals(); if (st.arrivals < 0) st.arrivals = a; else if (a > st.arrivals) { st.arrivals = a; var nm = ''; try { nm = F.state().name; } catch (e) { /* no name */ } dropIn({ kind: 'flew', name: nm, h0: 260 }); } }
        if (st.dropWait) { st.dropWaitT += real; if (!(o.cine.on && o.cine.on())) { var w = st.dropWait; st.dropWait = null; dropIn(w); } else if (st.dropWaitT > 8) st.dropWait = null; }
      } catch (e) { hurt('drop', e); }
    }
    /* 28 one title lane: a title (title39) asked for while the arrival card or the drop-in is up waits, then plays (the newest wins) */
    function lane(fn) { if (!(st.drop || st.m || st.photo)) return false; st.laneQ = [fn]; st.lanes++; return true; }
    function flushLane() { if (st.drop || st.m || st.photo) return; var q = st.laneQ; st.laneQ = []; q.forEach(function (f) { try { f(); } catch (e) { hurt('lane', e); } }); }

    /* =================== 7 MISSIONS AS A SHOW =================== */
    function M() { return window.WFR_MISSIONS788; }
    function rec() { try { var r = o.mis && o.mis.peek ? o.mis.peek().rec : null; return r || { best: {} }; } catch (e) { return { best: {} }; } }
    function mBest() {
      var Mm = M(), r = rec(), a = 0, stars = 0, next = ''; if (!Mm) return { a: 0, stars: 0, next: '' };
      var order = boardOrder(Mm.PLACES, o.mis && o.mis.here ? o.mis.here() : null, travelOpen());
      order.forEach(function (x) { Mm.KINDS.forEach(function (k) { var g = r.best[x.P.id + '.' + k.id]; if (g >= 3) a++; if (g >= 4) stars++; if (!next && !x.lock && !(g >= 3) && !lockedK(x.P, k, r)) next = kName(k, x.P) + ' at ' + x.P.name.replace(/^The /, 'the '); }); });
      return { a: a, stars: stars, next: next };
    }
    function travelOpen() { try { return !!(o.travelOpen && o.travelOpen()); } catch (e) { return false; } }
    function lockedK(P, k, r) { if (!k.lock) return false; var b = (r || rec()).best[P.id + '.' + k.lock]; return !(b >= 3); }
    function kName(k, P) { return k.id === 'hidden' ? P.lost[1] : k.name; }
    function kLine(k, P) { return k.id === 'hidden' ? P.lost[2] : k.line; }
    function pic(P) { return st.pics[P.id] || null; }
    function snap(P) {   /* a live picture of the place: the island's own scene, rendered once a session from a camera over it (one a frame, never all at once) */
      if (st.pics[P.id] !== undefined || !o.renderer) return; st.pics[P.id] = null;
      var c = P.world ? null : (o.spot ? o.spot(P.id) : null); if (!c || (o.away && o.away())) return;
      try {
        var R = o.renderer, w = 360, h = 220, rt = st.rt || (st.rt = new THREE.WebGLRenderTarget(w, h)), cam = st.pcam || (st.pcam = new THREE.PerspectiveCamera(48, w / h, 0.5, 1600));
        var r = Math.max(26, (c.size || 20) * 1.6), a = 0.9 + (P.id.length % 5) * 0.7, gy = c.y != null ? c.y : 0;
        cam.position.set(c.x + Math.sin(a) * r, gy + r * 0.55 + 8, c.z + Math.cos(a) * r); if (o.ground) cam.position.y = Math.max(cam.position.y, o.ground(cam.position.x, cam.position.z) + 6);
        cam.lookAt(c.x, gy + 2, c.z); cam.layers.mask = camera.layers.mask; cam.updateMatrixWorld();
        var prev = R.getRenderTarget(); R.setRenderTarget(rt); R.render(o.scene, cam); var px = new Uint8Array(w * h * 4); R.readRenderTargetPixels(rt, 0, 0, w, h, px); R.setRenderTarget(prev);
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var g = cv.getContext('2d'), im = g.createImageData(w, h);
        for (var y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        g.putImageData(im, 0, 0); st.pics[P.id] = cv.toDataURL('image/jpeg', 0.82);
        if (st.m) { var els = st.m.root.querySelectorAll('[data-pic="' + P.id + '"]'); for (var i = 0; i < els.length; i++) els[i].style.backgroundImage = 'url(' + st.pics[P.id] + ')'; }
      } catch (e) { hurt('snap', e); }
    }
    function picEl(P, i) {   /* the picture, or the kit's painted vignette until the live one is ready */
      var d = U.el('div'); d.style.cssText = 'position:absolute;inset:0'; d.innerHTML = U.vignette(P.world ? 'coast' : P.id === 'peak' ? 'peak' : P.id === 'lake' ? 'lake' : P.id === 'cave' ? 'night' : P.id === 'dunes' || P.id === 'race' ? 'hills' : 'village');
      var p = U.el('div', 's7-pic'); p.dataset.pic = P.id; p.style.setProperty('--bp', (20 + (i || 0) * 15) % 100 + '% 50%'); if (pic(P)) p.style.backgroundImage = 'url(' + pic(P) + ')'; d.appendChild(p);
      if (st.pics[P.id] === undefined) st.picQ.push(P);
      return d;
    }
    function shell(title, nTxt, nSub) {
      var root = U.el('div'); root.id = 's7m'; var sh = U.el('div', 's7-sheet s7-glass s7-in');
      sh.innerHTML = "<div class='s7-head'><div><div class='s7-eye-b'>Wings for Rouge // " + esc(nSub || '') + '</div><h2>' + esc(title) + "</h2></div><div class='s7-n'>" + esc(nTxt || '') + '</div></div>';
      root.appendChild(sh); L().appendChild(root);
      root.addEventListener('pointerdown', function (e) { e.stopPropagation(); }); return { root: root, sh: sh };
    }
    function closeM(how) {
      var m = st.m; if (!m) return; st.m = null; U.leave(m.root, { to: 'down', dur: 280 });
      if (how !== 'go' && m.fromCard && o.mis) try { o.mis.closeCard(); } catch (e) { /* closed */ }
      if (o.held) try { o.held(false); } catch (e) { /* fine */ }
      setTimeout(flushLane, 400);
    }
    function openBoard() {   /* every place's missions (30: the home island first, the wide world after the climb) */
      var Mm = M(); if (!Mm || st.m || st.photo) return false; if (st.title) st.title.style.visibility = 'hidden';
      var r = rec(), b = mBest(), here = o.mis && o.mis.here ? o.mis.here() : null, open = travelOpen(), total = Mm.PLACES.length * Mm.KINDS.length;
      var S1 = shell(WORDS.board, b.a + ' / ' + total, WORDS.ranked), grid = U.el('div', 's7-grid'), I = info();
      boardOrder(Mm.PLACES, here, open).forEach(function (x, i) {
        var P = x.P, nk = null; Mm.KINDS.forEach(function (k) { if (!nk && !(r.best[P.id + '.' + k.id] >= 3) && !lockedK(P, k, r)) nk = k; }); nk = nk || Mm.KINDS[0];
        var nA = 0; Mm.KINDS.forEach(function (k) { if (r.best[P.id + '.' + k.id] >= 3) nA++; });
        var c = U.missionCard({ n: i + 1, pic: picEl(P, i), place: P.world ? P.country : 'Home island', time: P.world ? 'after the climb' : I.c.part, title: P.name, line: (nA === Mm.KINDS.length ? 'Every one ranked A. Go for the stars.' : 'Next: ' + kName(nk, P) + '. ' + kLine(nk, P)),
          locked: x.lock, stamp: null, lockedLine: WORDS.wideLine, next: P.id === here ? WORDS.here : null,
          onPick: function () { closeM('swap'); openPlace(P.id, false); } });
        c.querySelector('.u7-txt').appendChild(grades(P, r)); if (x.lock) c.insertAdjacentHTML('beforeend', "<span class='s7-pill r s7-lock'>" + esc(WORDS.climb) + '</span>'); grid.appendChild(c);
      });
      S1.sh.appendChild(grid);
      var foot = U.el('div', 's7-foot', "<button type='button' data-a='x'>‹ " + esc(WORDS.back) + "</button><span class='s7-note'>" + esc(open ? WORDS.wideOpen : WORDS.gradeLine) + '</span>');
      S1.sh.appendChild(foot); foot.querySelector('[data-a=x]').addEventListener('click', function () { closeM(); if (st.title) st.title.style.visibility = ''; });
      st.m = { root: S1.root, view: 'board' }; st.mOpens++; return true;
    }
    function grades(P, r) { var Mm = M(), d = U.el('div', 's7-gr'); Mm.KINDS.forEach(function (k) { var g = r.best[P.id + '.' + k.id]; var i = U.el('i', g != null && g >= 0 ? 'g' + g : '', g != null && g >= 0 ? Mm.GRADES[g] : '·'); i.title = kName(k, P); d.appendChild(i); }); return d; }
    function openPlace(pid, fromCard) {   /* the five missions of one place, as cards */
      var Mm = M(), P = Mm && Mm.place(pid); if (!P || st.m || st.photo) return false;
      var r = rec(), here = o.mis && o.mis.here ? o.mis.here() === pid : false, I = info(), done = 0, firstOpen = -1;
      Mm.KINDS.forEach(function (k) { if (r.best[pid + '.' + k.id] >= 3) done++; });
      var S1 = shell(P.name, done + ' / ' + Mm.KINDS.length, WORDS.ranked), grid = U.el('div', 's7-grid');
      Mm.KINDS.forEach(function (k, i) {
        var g = r.best[pid + '.' + k.id], lk = lockedK(P, k, r); if (firstOpen < 0 && !lk && !(g >= 3)) firstOpen = i;
        var c = U.missionCard({ n: i + 1, pic: picEl(P, i), place: P.name.replace(/^The /, ''), time: P.world ? P.country : I.c.part, title: kName(k, P), line: kLine(k, P),
          locked: lk, stamp: null, lockedLine: 'Get an A on ' + kName(Mm.KINDS[0], P) + ' and this one opens.', next: i === firstOpen ? true : null,
          onPick: function () { brief(P, k, here); } });
        var bb = U.el('span', 's7-best s7-pill ' + (g >= 4 ? 'g' : g >= 3 ? 'm' : ''), g != null && g >= 0 ? WORDS.best + ' ' + Mm.GRADES[g] : WORDS.newRun); c.appendChild(bb); if (lk) c.insertAdjacentHTML('beforeend', "<span class='s7-pill r s7-lock'>Locked</span>"); grid.appendChild(c);
      });
      S1.sh.appendChild(grid);
      var foot = U.el('div', 's7-foot', "<button type='button' data-a='x'>" + esc(WORDS.notNow) + "</button><button type='button' data-a='all'>" + esc(WORDS.allPlaces) + "</button><span class='s7-note'>" + esc(here ? WORDS.gradeLine : WORDS.notHere) + '</span>');
      S1.sh.appendChild(foot);
      foot.querySelector('[data-a=x]').addEventListener('click', function () { closeM(); if (st.title) st.title.style.visibility = ''; });
      foot.querySelector('[data-a=all]').addEventListener('click', function () { var fc = st.m && st.m.fromCard; closeM('swap'); openBoard(); if (st.m) st.m.fromCard = fc; });
      st.m = { root: S1.root, view: 'place', pid: pid, fromCard: !!fromCard }; st.mOpens++; if (o.held) try { o.held(true); } catch (e) { /* fine */ }
      return true;
    }
    function brief(P, k, here) {   /* the briefing: the place, the speaker in a ringed badge, the line typed into a warm note, her reply; each glows in, a tap hurries it */
      var fc = st.m && st.m.fromCard; closeM('swap');
      var Mm = M(), I = info(), vo = VOICE[P.id] || ['villager', 'A neighbour', 'Hello, little one.'];
      var S1 = shell(kName(k, P), I.c.text, P.name); st.m = { root: S1.root, view: 'brief', pid: P.id, kid: k.id, fromCard: fc }; st.briefs++;
      var bf = U.el('div', 's7-brief'), shot = U.el('div', 's7-shot s7-step'); shot.appendChild(picEl(P, 0));
      shot.insertAdjacentHTML('beforeend', "<span class='s7-cap s7-pill m'><i></i>" + esc(P.name + ' · ' + I.c.text) + "</span><div class='s7-ttl'>" + esc(kName(k, P)) + '</div>');
      var who = U.el('div', 's7-who s7-step', "<span class='s7-ring'>" + U.portrait(vo[0]) + '</span><span><b>' + esc(vo[1]) + "</b><span class='s7-reply'>" + esc('Rouge: ' + (ROUGE_ASKS[k.id] || 'Me?')) + '</span></span>');
      var note = U.el('p', 's7-note2 s7-step', '');
      var me = U.el('div', 's7-who s7-step', "<span class='s7-ring m'>" + U.portrait('rouge') + "</span><span><b>Rouge</b><span class='s7-reply'>" + esc(here ? 'On it.' : 'I will fly over.') + '</span></span>');
      var nx = U.el('div', 's7-next s7-step', "<button type='button'>" + esc(WORDS.toFile) + ' ›</button>');
      [shot, who, note, me, nx].forEach(function (e) { bf.appendChild(e); }); S1.sh.appendChild(bf);
      var foot = U.el('div', 's7-foot', "<button type='button' data-a='x'>" + esc(WORDS.notNow) + "</button><span class='s7-note'>Tap to hurry it along</span>"); S1.sh.appendChild(foot);
      foot.querySelector('[data-a=x]').addEventListener('click', function () { closeM(); });
      var line = (vo[2] ? vo[2] + ' ' : '') + (JOB[k.id] || (P.lost[2] + ' No arrow: warmer and colder.')), tw = null, steps = [], fast = false;
      function at(ms, f) { steps.push(setTimeout(f, fast ? 0 : ms)); }
      at(60, function () { shot.classList.add('in'); }); at(700, function () { who.classList.add('in'); });
      at(1150, function () { note.classList.add('in'); tw = U.type(note, line, { cps: 40 }); tw.done.then(function () { at(250, function () { me.classList.add('in'); }); at(700, function () { nx.classList.add('in'); }); }); });
      bf.addEventListener('click', function (e) { if (e.target.closest('.s7-next')) return; fast = true; steps.forEach(clearTimeout); [shot, who, note, me, nx].forEach(function (x) { x.classList.add('in'); }); if (tw) tw.skip(); else note.textContent = line; });
      nx.querySelector('button').addEventListener('click', function () { caseCard(P, k, here); });
    }
    function caseCard(P, k, here) {   /* the job card: the place, its status pill, the job, three tips, what she needs as pills, Fly it and a quiet Not now */
      var fc = st.m && st.m.fromCard; closeM('swap');
      var Mm = M(), I = info(), r = rec(), g = r.best[P.id + '.' + k.id], i = Mm.KINDS.indexOf(k) + 1;
      var S1 = shell(WORDS.job, (i < 10 ? '0' : '') + i, P.name); st.m = { root: S1.root, view: 'case', pid: P.id, kid: k.id, fromCard: fc }; st.cases++;
      var T = Math.round(k.T * (P.world ? 1.5 : 1)), jb = U.el('div', 's7-job'), shot = U.el('div', 's7-shot s7-in'); shot.appendChild(picEl(P, i));
      var stTxt = k.id === 'hard' ? 'Storm run' : g >= 0 ? WORDS.best + ' ' + Mm.GRADES[g] : 'First run', stCls = k.id === 'hard' ? 'r' : g >= 4 ? 'g' : 'm';
      shot.insertAdjacentHTML('beforeend', "<span class='s7-cap s7-pill'>" + esc(P.name) + "</span><span class='s7-st s7-pill " + stCls + "'><i></i>" + esc(stTxt) + "</span><div class='s7-ttl'>" + esc(kName(k, P)) + '</div>');
      var keys = (KEYS_TOUCH[k.id] || []).map(function (q) { return "<span class='s7-pill'><b>" + esc(q[0]) + '</b>&nbsp;' + esc(q[1]) + '</span>'; }).join('');
      var body = U.el('div', 's7-in', "<div class='s7-meta'>" + esc(P.name + ' · ' + I.c.text + ' · ' + Math.floor(T / 60) + ':' + ('0' + T % 60).slice(-2) + ' on the clock') + '</div>' +
        "<h5 class='s7-eye-b'>" + esc(WORDS.job) + "</h5><div class='s7-line'>" + esc(kLine(k, P)) + "</div><h5 class='s7-eye-b'>" + esc(WORDS.tips) + '</h5><ul>' + (TIPS[k.id] || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        "<h5 class='s7-eye-b'>" + esc(WORDS.controls) + "</h5><div class='s7-keys'>" + keys + "</div><div class='s7-gobar'><button type='button' class='s7-go'" + (here ? '' : ' disabled style="filter:grayscale(.8);opacity:.6"') + '>' + esc(here ? WORDS.go : WORDS.notHere) + "</button><button type='button' class='s7-quiet'>" + esc(WORDS.notNow) + '</button></div>');
      body.style.animationDelay = '.12s'; jb.appendChild(shot); jb.appendChild(body); S1.sh.appendChild(jb);
      body.querySelector('.s7-quiet').addEventListener('click', function () { closeM(); });
      body.querySelector('.s7-go').addEventListener('click', function () { if (!here) return; st.gos++; closeM('go'); try { o.mis.start(P.id, k.id); } catch (e) { hurt('go', e); } });
    }
    function cardWatch() {   /* missions788's own list card asked for: the show takes its place (its card stays hidden under html.s795) */
      if (st.m || !o.mis) return; var c = document.getElementById('m788card'); if (!c) return;
      var pid = o.mis.here ? o.mis.here() : null; if (!pid) return; if (st.mFor === c) return; st.mFor = c; openPlace(pid, true);
    }

    /* =================== 11 THE PHOTO =================== */
    function capture() {   /* this frame, as the game draws it (the HUD is DOM, so it is never in the picture) */
      var R = o.renderer, gl = R.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, s = Math.min(1, 1600 / Math.max(w, h)); w = Math.round(w * s); h = Math.round(h * s);
      var rt = new THREE.WebGLRenderTarget(w, h); var prev = R.getRenderTarget(); R.setRenderTarget(rt);
      if (o.pre) o.pre(); R.render(o.scene, camera); if (o.post) o.post();
      var px = new Uint8Array(w * h * 4); R.readRenderTargetPixels(rt, 0, 0, w, h, px); R.setRenderTarget(prev); rt.dispose();
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var g = cv.getContext('2d'), im = g.createImageData(w, h);
      for (var y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      g.putImageData(im, 0, 0); return cv;
    }
    function compose(src, kind, caption, meta) {   /* the house style: night glass, a thin glow, Rouge red, mint data lines, Space Grotesk and Mono */
      var W = src.width, H = src.height, cv = document.createElement('canvas'), g = cv.getContext('2d'), FS = G_SANS, FM = G_MONO, u = W / 390;
      function pill(x, y, text, col, font) { g.save(); g.font = font; var tw = g.measureText(text).width, h = 26 * u, pw = tw + 22 * u; g.fillStyle = 'rgba(10,14,22,.78)'; rr(x, y, pw, h, h / 2); g.fill(); g.strokeStyle = col; g.lineWidth = 1.2 * u; g.shadowColor = col; g.shadowBlur = 10 * u; rr(x, y, pw, h, h / 2); g.stroke(); g.shadowBlur = 0; g.fillStyle = col; g.textBaseline = 'middle'; g.fillText(text, x + 11 * u, y + h / 2 + 1); g.restore(); return pw; }
      function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      if (kind === 'cover') {
        cv.width = W; cv.height = H; g.drawImage(src, 0, 0);
        var gr = g.createLinearGradient(0, 0, 0, H * 0.34); gr.addColorStop(0, 'rgba(5,6,12,.78)'); gr.addColorStop(1, 'rgba(5,6,12,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.34);
        var gb = g.createLinearGradient(0, H * 0.62, 0, H); gb.addColorStop(0, 'rgba(5,6,12,0)'); gb.addColorStop(1, 'rgba(5,6,12,.88)'); g.fillStyle = gb; g.fillRect(0, H * 0.62, W, H * 0.38);
        g.save(); g.textBaseline = 'top'; g.font = '700 ' + Math.round(12 * u) + 'px ' + FM; g.fillStyle = '#4de8c9'; g.fillText(('WINGS FOR ROUGE // ' + meta.issue).toUpperCase(), 20 * u, 22 * u);
        g.font = '700 ' + Math.round(84 * u) + 'px ' + FS; g.fillStyle = '#fff'; g.shadowColor = 'rgba(255,59,66,.8)'; g.shadowBlur = 26 * u; g.fillText('ROUGE', 16 * u, 40 * u); g.restore();
        g.save(); g.font = '700 ' + Math.round(28 * u) + 'px ' + FS; g.fillStyle = '#fff'; g.shadowColor = 'rgba(5,6,12,.9)'; g.shadowBlur = 8 * u; var lines = lineSplit(g, caption || meta.place, W - 40 * u); g.shadowBlur = 0;
        var y0 = H - 40 * u - lines.length * 32 * u; pill(20 * u, y0 - 40 * u, (meta.place + ' · ' + meta.when).toUpperCase(), '#4de8c9', '700 ' + Math.round(11 * u) + 'px ' + FM);
        g.fillStyle = '#fff'; g.textBaseline = 'top'; lines.forEach(function (l, i) { g.fillText(l, 20 * u, y0 + i * 32 * u); }); g.restore();
        g.save(); var cx = W - 52 * u, cy = 78 * u; g.strokeStyle = '#ffd45c'; g.lineWidth = 2 * u; g.shadowColor = '#ffd45c'; g.shadowBlur = 16 * u; g.beginPath(); g.arc(cx, cy, 30 * u, 0, 7); g.stroke(); g.shadowBlur = 0;
        g.fillStyle = 'rgba(10,14,22,.7)'; g.beginPath(); g.arc(cx, cy, 28 * u, 0, 7); g.fill(); g.fillStyle = '#ffd45c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 ' + Math.round(16 * u) + 'px ' + FM; g.fillText('LV' + meta.level, cx, cy); g.restore();
        return cv;
      }
      var m = Math.round(W * 0.045); cv.width = W + m * 2; cv.height = H + m * 2 + Math.round(70 * u);
      var bg = g.createRadialGradient(cv.width / 2, cv.height * 0.3, 10, cv.width / 2, cv.height * 0.3, cv.height); bg.addColorStop(0, '#101a33'); bg.addColorStop(1, '#05060c'); g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
      g.save(); rr(m, m, W, H, 18 * u); g.clip(); g.drawImage(src, m, m, W, H); g.restore();
      g.save(); g.strokeStyle = 'rgba(255,59,66,.85)'; g.lineWidth = 1.5 * u; g.shadowColor = '#ff3b42'; g.shadowBlur = 18 * u; rr(m, m, W, H, 18 * u); g.stroke(); g.restore();
      pill(m + 12 * u, m + 12 * u, (meta.place + ' · ' + meta.when).toUpperCase(), '#4de8c9', '700 ' + Math.round(11 * u) + 'px ' + FM);
      g.save(); g.textBaseline = 'top'; g.fillStyle = '#e9edf8'; g.font = '700 ' + Math.round(19 * u) + 'px ' + FS; var cl = lineSplit(g, caption || '', W - 20 * u); cl.slice(0, 2).forEach(function (l, i) { g.fillText(l, m + 2 * u, m + H + 14 * u + i * 23 * u); });
      g.font = '400 ' + Math.round(10.5 * u) + 'px ' + FM; g.fillStyle = '#95a0bd'; g.textAlign = 'right'; g.fillText(('WINGS FOR ROUGE // ' + meta.issue).toUpperCase(), m + W, m + H + 18 * u); g.restore();
      return cv;
    }
    function lineSplit(g, t, w) { var words = String(t).split(/\s+/), out = [], cur = ''; words.forEach(function (x) { var n = cur ? cur + ' ' + x : x; if (g.measureText(n).width > w && cur) { out.push(cur); cur = x; } else cur = n; }); if (cur) out.push(cur); return out.slice(0, 4); }
    function wrap(g, t, x, y, w, lh, max) { lineSplit(g, t, w).slice(0, max).forEach(function (l, i) { g.fillText(l, x, y + i * lh); }); }
    function photoCan() { return !st.photo && !st.drop && !st.m && !(o.cine && o.cine.on && o.cine.on()); }
    function photo() {
      if (!photoCan()) return false; var src; try { src = capture(); } catch (e) { hurt('photo', e); return false; }
      var I = info(), where = o.where ? o.where() : 'the island', meta = { place: where, when: I.c.text, level: (o.lv ? o.lv().level : S.level) || 1, issue: I.day + ', day ' + I.dayN };
      var root = U.el('div'); root.id = 's7photo'; root.innerHTML = "<img alt='Your photo'><input type='text' maxlength='60'><div class='s7-row'><button type='button' data-k='panel' aria-pressed='true'>" + esc(WORDS.panel) +
        "</button><button type='button' data-k='cover' aria-pressed='false'>" + esc(WORDS.cover) + "</button></div><div class='s7-row'><button type='button' data-a='back'>‹ " + esc(WORDS.back) + "</button><button type='button' class='s7-save' data-a='save'>" + esc(WORDS.save) + '</button></div>';
      L().appendChild(root); document.documentElement.classList.add('p795'); root.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      var P = st.photo = { root: root, kind: 'panel', src: src, meta: meta, cv: null }, img = root.querySelector('img'), inp = root.querySelector('input');
      inp.placeholder = WORDS.capPh; inp.value = 'Rouge over ' + where.replace(/^The /, 'the ');
      function draw() { (U.fontsReady || Promise.resolve()).then(function () { if (st.photo !== P) return; P.cv = compose(src, P.kind, inp.value, meta); img.src = P.cv.toDataURL('image/jpeg', 0.9); }); }
      root.querySelectorAll('[data-k]').forEach(function (b) { b.addEventListener('click', function () { P.kind = b.dataset.k; root.querySelectorAll('[data-k]').forEach(function (q) { q.setAttribute('aria-pressed', String(q === b)); }); draw(); }); });
      var dt = 0; inp.addEventListener('input', function () { clearTimeout(dt); dt = setTimeout(draw, 250); });
      root.querySelector('[data-a=back]').addEventListener('click', closePhoto);
      root.querySelector('[data-a=save]').addEventListener('click', function () { savePhoto(P); });
      draw(); st.photos++; try { if (o.sound) o.sound('get'); } catch (e) { /* quiet */ } return true;
    }
    function savePhoto(P) {
      if (!P.cv) return; var name = 'wings-for-rouge-' + Date.now() + '.jpg';
      P.cv.toBlob(function (blob) {
        if (!blob) return; st.saves++; var f = null; try { f = new File([blob], name, { type: 'image/jpeg' }); } catch (e) { f = null; }
        if (f && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: 'Wings for Rouge' }).catch(function () { /* she closed the sheet */ }); return; }
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        U.toast(WORDS.saved, { kicker: WORDS.photo, icon: 'heart', ms: 1800 });
      }, 'image/jpeg', 0.92);
    }
    function closePhoto() { var P = st.photo; if (!P) return; st.photo = null; document.documentElement.classList.remove('p795'); P.root.remove(); setTimeout(flushLane, 300); }
    function pauseButtons() {   /* Photo and the sound-words switch go in the Pause page beside the game's own cards */
      var row = document.getElementById('pauseRow'); if (!row) return;
      if (!document.getElementById('photo795')) { var b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.id = 'photo795'; b.setAttribute('data-n795', '07'); b.style.order = '6';
        if (window.WFR_HUD795) { b.textContent = '📷 ' + WORDS.photo; var sm = document.createElement('small'); sm.textContent = WORDS.photoSub; sm.setAttribute('aria-hidden', 'true'); b.appendChild(sm); }   /* hud795's pause page: a card with its line under it */
        else b.textContent = '📷 ' + WORDS.photo + ': ' + WORDS.photoSub;   /* the old sheet reads "label: value" as a tile */ var tt = document.getElementById('toTitle'); if (tt && tt.parentNode === row) row.insertBefore(b, tt.nextSibling); else row.appendChild(b);
        b.addEventListener('click', function (e) { e.stopPropagation(); photo(); }); }
      if (!document.getElementById('words795')) { var w = document.createElement('button'); w.type = 'button'; w.className = 'ghost tile795'; w.id = 'words795'; w.style.order = '17';
        w.addEventListener('click', function (e) { e.stopPropagation(); setWords(!set.words); }); row.appendChild(w); wordsDraw(); }
    }
    function wordsDraw() { var w = document.getElementById('words795'); if (!w) return; var v = set.words ? WORDS.on : WORDS.off; w.title = WORDS.wordsSub;
      if (window.WFR_HUD795) { w.textContent = WORDS.words; w.style.order = '14'; } else w.textContent = '💥 ' + WORDS.words + ': ' + v;   /* hud795 draws a tile: its name, the value under it */ w.setAttribute('aria-pressed', String(set.words)); w.style.setProperty('--v795', '"' + v + ': ' + WORDS.wordsSub + '"'); }
    function setWords(v) { set.words = !!v; storeSet(set); wordsDraw(); }

    /* =================== 13 THE SOUND WORDS =================== */
    function fx(kind, p) {
      if (!set.words || !LETTERS[kind] || !p) return false; if (st.title || st.photo || st.m || (o.quiet && o.quiet())) return false;
      var t = now(); if (t - (st.fxLast[kind] || 0) < 650) return false; if (L().querySelectorAll('.s7-fx').length >= 3) return false;
      V3.set(p.x, p.y, p.z).project(camera); if (V3.z > 1 || Math.abs(V3.x) > 1.1 || Math.abs(V3.y) > 1.1) return false;
      st.fxLast[kind] = t; st.fxN[kind] = (st.fxN[kind] || 0) + 1; st.fx++;
      var x = (V3.x * 0.5 + 0.5) * innerWidth, y = (-V3.y * 0.5 + 0.5) * innerHeight - 30, col = LCOL[kind] || LCOL.hit, word = pick(LETTERS[kind], st.fxN[kind] - 1);
      x = Math.max(70, Math.min(innerWidth - 70, x)); y = Math.max(110, Math.min(innerHeight - 160, y));
      var e = U.el('div', 's7-fx', esc(word)); e.style.setProperty('--x', x + 'px'); e.style.setProperty('--y', y + 'px'); e.style.setProperty('--r', ((st.fx % 2 ? 1 : -1) * (4 + (st.fx * 7) % 6)) + 'deg');
      e.style.setProperty('--fc', col[0]); e.style.setProperty('--fs', (kind === 'blast' || kind === 'dive' ? 34 : 28) + 'px');
      L().appendChild(e); var hw = e.offsetWidth / 2 + 10; if (hw * 2 < innerWidth) e.style.setProperty('--x', Math.max(hw, Math.min(innerWidth - hw, x)) + 'px');
      setTimeout(function () { e.remove(); }, 1000); return true;
    }
    function fxWatch(real) {
      st.diveCd = Math.max(0, st.diveCd - real); var dv = false; try { dv = !!(o.diving && o.diving()); } catch (e) { dv = false; }
      if (dv && !st.wasDive && st.diveCd <= 0) { var G = o.get ? o.get() : {}; if (G.bird) { V2.copy(G.bird.position); if (fx('dive', V2)) st.diveCd = 5; } } st.wasDive = dv;
      var f = S.fishCaught || 0; if (f > st.fish) { var G2 = o.get ? o.get() : {}; if (G2.bird) fx('catch', G2.bird.position); } st.fish = f;
    }

    /* =================== THE PAGE'S CALLS =================== */
    function tick(dt, real) {
      try {
        real = real || dt || 0;
        var tOn = titleOn() && !st.photo; if (tOn) { st.titleT += real; if (!st.title && st.titleT > 0.25) showTitle(); if (st.title) goPlace(); } else { st.titleT = 0; if (st.title) leaveTitle(); }
        veilTick(real); dropWatch(real); cardWatch(); fxWatch(real);
        if (st.picQ.length) snap(st.picQ.shift());
        if ((st.tick += real) > 0.5) { st.tick = 0; pauseButtons(); if (st.m && st.m.view === 'place' && st.m.fromCard && !document.getElementById('m788card')) closeM('gone'); }
      } catch (e) { hurt('tick', e); }
    }
    function pre() { try { if (st.title && !st.drop) titleCam(true); } catch (e) { hurt('pre', e); } }
    function post() { try { titleCam(false); } catch (e) { hurt('post', e); } }
    function peek() {
      var tbx = null; if (st.tb) { var wasV = st.tb.visible; st.tb.visible = true; var bx = new THREE.Box3().setFromObject(st.tb); st.tb.visible = wasV; tbx = { size: bx.getSize(new THREE.Vector3()).toArray().map(function (v) { return +v.toFixed(2); }), at: st.tb.position.toArray().map(function (v) { return +v.toFixed(2); }), kids: st.tb.children.length }; }
      return { tb: tbx, camAt: st.camAt || null, stack: API.stack ? String(API.stack).slice(0, 600) : '', title: !!st.title, perch: st.perch ? { id: st.perch.id, name: st.perch.name, p: st.perch.p.toArray().map(function (v) { return +v.toFixed(2); }) } : null, shows: st.shows, n: set.n,
        titleText: st.title ? st.title.innerText.replace(/\s+/g, ' ') : '', sheetHidden: document.documentElement.classList.contains('t795'), moved: document.documentElement.classList.contains('s7mv'), yaw: st.perch ? +(+st.perch.yaw).toFixed(3) : null, avoid: st.perch && st.perch.avoid ? st.perch.avoid.map(function (v) { return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; }) : null,
        drop: st.drop ? { why: st.drop.why, step: st.drop.step, t: +st.drop.t.toFixed(2), place: st.drop.where.place, area: st.drop.where.area, card: st.drop.card ? st.drop.card.el.innerText.replace(/\s+/g, ' ') : '' } : null,
        drops: st.drops, dropSkips: st.dropSkips, eye: st.eyeOn, lanes: st.lanes, laneQ: st.laneQ.length,
        m: st.m ? { view: st.m.view, pid: st.m.pid || null, kid: st.m.kid || null, cards: st.m.root.querySelectorAll('.u7-mission').length, locked: st.m.root.querySelectorAll('.u7-mission.locked').length, text: st.m.root.innerText.replace(/\s+/g, ' ').slice(0, 2400) } : null,
        mOpens: st.mOpens, briefs: st.briefs, cases: st.cases, gos: st.gos, pics: Object.keys(st.pics).filter(function (k) { return !!st.pics[k]; }),
        photo: st.photo ? { kind: st.photo.kind, w: st.photo.cv ? st.photo.cv.width : 0, h: st.photo.cv ? st.photo.cv.height : 0 } : null, photos: st.photos, saves: st.saves,
        words: set.words, fx: st.fx, fxN: Object.assign({}, st.fxN), err: st.err };
    }
    var api = { tick: tick, pre: pre, post: post, fx: fx, lane: lane, peek: peek, dropIn: dropIn, openBoard: openBoard, openPlace: openPlace, photo: photo, closePhoto: closePhoto, setWords: setWords,
      busy: function () { return !!(st.drop || st.m || st.photo); }, titleUp: function () { return !!st.title; }, closeShow: function () { closeM(); } };
    return api;
  }
  API.create = create; API.WORDS = WORDS; API.LETTERS = LETTERS; API.VOICE = VOICE; API.TIPS = TIPS; API.clock = clock; API.dayName = dayName; API.weather = weather; API.boardOrder = boardOrder; API.fmtLL = fmtLL;
  return API;
})();
