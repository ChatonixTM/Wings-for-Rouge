/* world-quests.js - BOARD 720 (A BETTER MISSIONS / QUESTS BOARD) + 724c (THE COURIER), Wings for Rouge. Trunks, Nov 4 2026.
   Marth, Oct 28 2026, verbatim: "yes were going to have to add / make a better missions/quests board".
   Marth, Nov 4 2026, verbatim: "focus on the world building please and the incorporation of the npc's and the quests and the animals".
   Plan: PLAN_724_PEOPLE_WHO_REMEMBER_HER_2026-11-04.md (724b help remembered, 724c the courier).

   WHAT ROUGE SEES:
     - a 📜 button under the level card. One tap opens the QUESTS board: what she is doing (Active), what she could do (Available), what she
       has done (Done), each with one short line and its reward. The pinned quest (📌) is the one on the level card and the one the arrow follows.
     - a ❗ over anyone with a favour to ask, on the island and in the real places (Dunn's River, and wherever world-people.js puts people).
       She lands by them and taps 💬: they ask, and the errand is hers. Kinds: carry a letter or fruit to a friend in the same place (724c),
       fetch something from a friend, find a lost thing (it sparkles where it fell), or fly to one of the world's landmarks for them.
       The person she is taking it to wears the thing's emoji over their head; the arrow points at them.
     - ten landmark quests across the real world (Fly to the Eiffel Tower, See Dunn's River Falls, the Empire State's top...). Each is done only
       where it really is: her own position, through WFR_WORLD, inside the landmark's radius (and at the right height for a top).
     - rewards: XP, runes, and the help tally (724b): a person she helped remembers it and greets her warmly.
   One errand at a time per person. Nothing is ever taken from anyone (pillaging waits on Marth's Q2/Q3).

   REUSED, NOT REWRITTEN (MBAEEMP): the game's own say() dialogue, toast(), gainXP(), save() and hud(); the level card's #quest line for the
   pin; goalTarget() for the arrow (the page asks goal()); the "What to do" card's .missions look for the board (so Classic and Standard both
   dress it); WFR_PEOPLE724 for every person (who / locate / peers / each / talk); the island's own villagers and their BONDS for friends;
   WFR_WORLD for every lat/lon; travel712's position and ground; 725d's tap rule (a thumb's down and up, 18 px, 800 ms).
   NEW, because nothing like it existed: the quest records in S.quests, the board, the ❗ marks. Everything drawn is DOM over the canvas:
   no mesh, no material, no shader program (the guard counts programs).

   THE PAGE HANDS IT (tools/wiring/wire-quests.js): init(ctx) once; tick(dt) each frame (both zones); draw() after the arrow on the island;
   travelHud(T, viewYaw) after 725d's in the travel zone; talk(target) on 💬 before the person's own line; goal() in goalTarget; pill() in hud();
   S.quests and S.people724 in save() and load().

   Every word, number and coordinate here is DRAFT for Marth's pen (the landmark coordinates are public record, for Izumi to check on a chart). */
window.WFR_QUESTS720 = (function () {
  'use strict';
  var C = { MARK_NEAR: 45, MARK_ISLAND: 60, MARK_TARGET: 160, POOL: 10, GIVER_MOD: 6, PER_PERSON: 3, MAX_ACTIVE: 6, TOUCH: 2.6, TOUCH_Y: 4, DONE_KEEP: 40,
    FRIEND: [30, 160], FRIEND_WIDE: [12, 420], LOST: [20, 90], LOST_OFF: 1.8, OFFER_EVERY: 0.25, SAVE_V: 1 };
  var NO_GIVE = { Go: 1, Eli: 1 };   // Go and Eli wait behind 719's gate (PLAN 724 Q4, 724h): they neither ask nor are asked for, yet
  var GIVERS_ISLAND = { Ada: 1, Bo: 1, Cyril: 1, Faye: 1 };

  /* ---------- the words (DRAFT, Marth's pen) ---------- */
  var WORDS = {
    title: 'Quests', active: 'Active', avail: 'Available', done: 'Done', none: 'Nothing yet. Look for a ❗ over someone\'s head.',
    follow: 'Follow', start: 'Start', pinned: 'Following', near: '{n} near you {have} a favour to ask. Look for the ❗.',
    far: 'Far away: the whole world opens after the climb.', mapGo: 'Open the map (tap the radar) and choose Fly there.',
    got: '📜 New quest: {t}', fin: '✓ {t}', found: 'You found {g}\'s {i}!', busy: 'Your beak is full of favours. Finish one first.',
    reward: '+{xp} XP · ✦ {r}', helped: 'helps {g}'
  };
  var ITEMS = {
    courier: [['✉️', 'letter'], ['🥭', 'mango'], ['💐', 'flowers'], ['🍌', 'bananas']],
    fetch: [['🧺', 'basket'], ['☂️', 'umbrella'], ['🥥', 'coconut'], ['🧣', 'scarf']],
    find: [['👒', 'hat'], ['🔑', 'keys'], ['🕶️', 'sunglasses'], ['🩴', 'sandal'], ['📘', 'book']]
  };
  var ASK = {
    courier: ['Would you take this {i} to {to}? {to} is just over there.', 'Could you fly this {i} over to {to} for me? Thank you, little one.'],
    fetch: ['{to} has my {i}. Could you ask for it and bring it back to me?', 'Would you fetch my {i} from {to}? My legs are tired today.'],
    find: ['I lost my {i}! I think I left it near {to}. Could you look?', 'Have you seen my {i}? It must be somewhere near {to}.'],
    lm: ['Have you ever seen {lm}? Fly there one day, and see it for me.', 'They say {lm} is a wonder. Go and see it, then you can tell me.']
  };
  var SAY = {
    give: ['From {g}? Oh, thank you! Tell {g} I said hello.', 'A {i}, from {g}! And delivered by air, no less.'],
    get: ['{g}\'s {i}? Here you are. Mind how you go.', 'Ah, {g} sent you! Here is the {i}.'],
    back: ['My {i}! Where was it? No, don\'t tell me. Thank you.', 'You found it! I knew you would.'],
    wait: ['Did you manage it? {to} is not far.', 'Take your time. I will be right here.'],
    warm: ['You came back! I still smile about that {i}.', 'There she is! Thank you again for the {i}.']
  };
  var TITLE = { courier: 'A {i} for {to}', fetch: '{g}\'s {i}, from {to}', find: '{g}\'s lost {i}', lm: '{lm}' };
  var LINE = { courier: '{g} asked you to take a {i} to {to}.', fetch: 'Ask {to} for {g}\'s {i}, then bring it back.', find: '{g} lost a {i} near {to}. It sparkles.' };
  var STEP = { give: '{e} Take it to {to}', get: '{e} Ask {to} for it', spot: '{e} Find {g}\'s {i}', back: '{e} Back to {g}', lm: '{e} {lm}' };
  var REWARD = { courier: [25, 3], fetch: [30, 4], find: [35, 5] };

  /* ---------- the world's landmark quests (starter set of ten). kind fly: within r, under aglMax over the ground; see: within r;
     top: within r and at the top's height (above: [lo, hi] metres over the ground at the landmark's point). DRAFT ---------- */
  var LANDMARKS = [
    { id: 'eiffel', e: '🗼', name: 'the Eiffel Tower', title: 'Fly to the Eiffel Tower', where: 'Paris, France', lat: 48.85837, lon: 2.29448, kind: 'fly', r: 250, aglMax: 600, xp: 120, runes: 15, line: '330 m of iron lace. Fly close, under 600 m.' },
    { id: 'dunns', e: '💦', name: 'Dunn\'s River Falls', title: 'See Dunn\'s River Falls', where: 'Ocho Rios, Jamaica', lat: 18.4116, lon: -77.1406, kind: 'see', r: 300, rPatch: 90, xp: 100, runes: 12, host: 'dunns', line: '55 m of stone terraces, the river running cold all the way into the sea.' },
    { id: 'empire', e: '🏙️', name: 'the Empire State Building', title: 'Land on the Empire State\'s top', where: 'New York, USA', lat: 40.74844, lon: -73.98566, kind: 'top', r: 60, above: [330, 470], xp: 150, runes: 20, line: 'Hover at its roof, 381 m up.' },
    { id: 'liberty', e: '🗽', name: 'the Statue of Liberty', title: 'Fly round the Statue of Liberty', where: 'New York, USA', lat: 40.68925, lon: -74.0445, kind: 'fly', r: 200, aglMax: 400, xp: 110, runes: 14, line: 'Wave to her torch.' },
    { id: 'bigben', e: '🕰️', name: 'Big Ben', title: 'Hear Big Ben', where: 'London, England', lat: 51.50073, lon: -0.12463, kind: 'fly', r: 200, aglMax: 500, xp: 110, runes: 14, line: 'The great bell in the Elizabeth Tower. It strikes the hour in E.' },
    { id: 'giza', e: '🔺', name: 'the Great Pyramid', title: 'See the Great Pyramid', where: 'Giza, Egypt', lat: 29.97917, lon: 31.13417, kind: 'fly', r: 300, aglMax: 800, xp: 130, runes: 16, line: '4,500 years old, and the tallest thing people built for most of them.' },
    { id: 'taj', e: '🕌', name: 'the Taj Mahal', title: 'See the Taj Mahal', where: 'Agra, India', lat: 27.17502, lon: 78.04216, kind: 'fly', r: 300, aglMax: 600, xp: 130, runes: 16, line: 'White marble on the bank of the Yamuna. It changes colour with the light.' },
    { id: 'everest', e: '🏔️', name: 'Mount Everest', title: 'Top of the world: Everest', where: 'Nepal and China', lat: 27.98806, lon: 86.92528, kind: 'top', r: 800, above: [-80, 700], xp: 200, runes: 30, line: 'The highest mountain on Earth: 8,849 m, and a third of the air. Reach the summit.' },
    { id: 'opera', e: '🎭', name: 'the Sydney Opera House', title: 'See the Sydney Opera House', where: 'Sydney, Australia', lat: -33.85678, lon: 151.2153, kind: 'fly', r: 250, aglMax: 500, xp: 140, runes: 18, line: 'A million white tiles in the shape of sails, out on the harbour.' },
    { id: 'tahoe', e: '🏞️', name: 'Lake Tahoe', title: 'Fly over Lake Tahoe', where: 'California and Nevada, USA', lat: 39.0968, lon: -120.0324, kind: 'see', r: 9000, aglMax: 2000, xp: 100, runes: 12, line: 'A mountain lake 500 m deep, clear enough to see twenty metres down.' },
    /* 779 #135: the places the next shores call her to (arrive783.js PLACES: a country's arrival pins its landmark; reaching it pays XP and runes). 'see': within r, under aglMax. DRAFT */
    { id: 'havana', e: '🏛️', name: 'Old Havana', title: 'See Old Havana', where: 'Havana, Cuba', lat: 23.1352, lon: -82.3596, kind: 'see', r: 1500, aglMax: 1500, xp: 110, runes: 13, line: 'A great white dome over painted streets, and the long sea wall.' },
    { id: 'citadelle', e: '🏰', name: 'the Citadelle', title: 'See the Citadelle', where: 'Milot, Haiti', lat: 19.5733, lon: -72.2436, kind: 'see', r: 1200, aglMax: 1500, xp: 120, runes: 14, line: 'A fortress on a mountain top, built by free people to keep their freedom.' },
    { id: 'stingray', e: '🌊', name: 'Stingray City', title: 'Find Stingray City', where: 'Grand Cayman', lat: 19.3743, lon: -81.3049, kind: 'see', r: 1000, aglMax: 600, xp: 100, runes: 12, line: 'A sandbar in the sound where the rays come up to meet you. Fly low.' },
    { id: 'yunque', e: '🐸', name: 'El Yunque', title: 'Find El Yunque', where: 'Puerto Rico', lat: 18.3106, lon: -65.7867, kind: 'see', r: 2500, aglMax: 1800, xp: 110, runes: 13, line: 'A rainforest on a mountain. Listen for the little frogs.' },
    { id: 'chichen', e: '☀️', name: 'Chichen Itza', title: 'See Chichen Itza', where: 'Yucatan, Mexico', lat: 20.6843, lon: -88.5678, kind: 'see', r: 800, aglMax: 800, xp: 130, runes: 16, line: 'A stepped pyramid in the forest. At the equinox the sun draws a serpent down its stairs.' }
  ];
  if (window.WFR_INTERIORS729 && WFR_INTERIORS729.LANDMARKS) LANDMARKS = LANDMARKS.concat(WFR_INTERIORS729.LANDMARKS);   /* 729: Shanghai, Beijing, Tokyo, Shibuya, Shinjuku (world-interiors.js) */
  if (window.WFR_PLACES790 && WFR_PLACES790.LANDMARKS) LANDMARKS = LANDMARKS.concat(WFR_PLACES790.LANDMARKS.filter(function (L) { return !LANDMARKS.some(function (M) { return M.id === L.id; }); }));   /* 790 D: the named places' big ones (places790.js: the CN Tower, Rouge Park, Trafalgar Square, the Pitons...); each lists itself on the board only near her (near790 m) */
  var LMB = {}; LANDMARKS.forEach(function (L) { LMB[L.id] = L; });

  var X = null, V = null, Q = null;   // the page's ctx; one reused goal vector; S.quests
  var st = { inited: false, fault: null, offerT: 0, gens: new Map(), givers: new Map(), marks: [], shown: [], el: null, btn: null, board: null, open: false, opens: 0, closes: 0,
    accepted: 0, completed: 0, lastTalk: null, lm: {}, lmLast: null, travelArrow: false, near: 0, events: [] };

  /* ---------- seeds: the same person gives the same errand on every visit ---------- */
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(r, a) { return a[Math.floor(r() * a.length) % a.length]; }
  function fill(t, o) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function $(id) { return document.getElementById(id); }

  /* ---------- the record: S.quests (saved by the page's save()), S.people724 (the help tally, 724b) ---------- */
  function clean(q) {
    q = q && typeof q === 'object' ? q : {}; var o = { v: C.SAVE_V, active: Array.isArray(q.active) ? q.active.filter(function (a) { return a && a.id && Array.isArray(a.legs); }) : [],
      done: Array.isArray(q.done) ? q.done.slice(-C.DONE_KEEP) : [], given: q.given && typeof q.given === 'object' ? q.given : {}, lm: q.lm && typeof q.lm === 'object' ? q.lm : {}, pin: q.pin || null, daily: q.daily && typeof q.daily === 'object' ? { d: +q.daily.d || 0, n: +q.daily.n || 0 } : null };   /* 786: the day's errands so far */
    if (o.pin && !o.active.some(function (a) { return a.id === o.pin; })) o.pin = o.active.length ? o.active[o.active.length - 1].id : null; return o; }
  function help(pid) { var P = X.S.people724 || (X.S.people724 = {}); return P[pid] || (P[pid] = { help: 0 }); }
  function saveNow() { try { X.save(); } catch (e) { st.fault = 'save: ' + (e && e.message || e); } }
  function hudNow() { try { X.hud(); } catch (e) { /* the pill waits for the next hud() */ } }

  /* ---------- who someone is (island villagers by name, townsfolk by their place's id) ---------- */
  function npcOfG(g) { var L = X.npcs || []; for (var i = 0; i < L.length; i++) if (L[i].g === g) return L[i]; return null; }
  function npcByName(n) { var L = X.npcs || []; for (var i = 0; i < L.length; i++) if (L[i].name === n) return L[i]; return null; }
  function idOf(tg) { if (!tg) return null; if (tg.kind === 'town') return tg.id; if (tg.kind === 'island') { var n = npcOfG(tg.g); return n ? 'v:' + n.name : null; } return null; }
  function personInfo(pid) {
    if (pid.indexOf('v:') === 0) { var n = npcByName(pid.slice(2)); return n ? { id: pid, name: n.name, island: true, label: '💬 ' + n.name, place: 'island', placeName: 'the village' } : null; }
    var w = X.P && X.P.who ? X.P.who(pid) : null; return w ? { id: pid, name: w.name, title: w.title, role: w.role, kind: w.kind, label: '💬 ' + w.name + ', ' + w.title, place: w.place, placeName: w.placeName } : null; }
  var TMPP = { x: 0, y: 0, z: 0 };
  function posOf(pid, out) {   // where the person stands now in the world, or null (their place is not where she is)
    if (pid.indexOf('v:') === 0) { var n = npcByName(pid.slice(2)); if (!n || (X.TR && X.TR.on)) return null; if (n.g.visible) { out.x = n.g.position.x; out.y = n.g.position.y; out.z = n.g.position.z; return out; }
      if (n.house && X.doorFront) { var f = X.doorFront(n.house, 1.2); out.x = f.x; out.y = X.H ? X.H(f.x, f.z) : f.y; out.z = f.z; return out; } return null; }
    return X.P && X.P.locate ? X.P.locate(pid, out) : null; }
  function spotOf(leg, out) {   // a lost thing: a still person's spot plus a small offset, seeded (they stand on walkable ground)
    var b = posOf(leg.base, out); if (!b) return null; out.x += Math.cos(leg.a) * C.LOST_OFF; out.z += Math.sin(leg.a) * C.LOST_OFF; out.y += 0.35; return out; }

  /* ---------- 724c: what a person asks (generated from their id and how many errands she has done for them) ---------- */
  function lmOpen() { for (var i = 0; i < LANDMARKS.length; i++) { var L = LANDMARKS[i]; if (!Q.lm[L.id] && !activeLm(L.id)) return L; } return null; }
  function gen(pid) {
    var n = Q.given[pid] || 0, key = pid + '#' + n; if (st.gens.has(key)) return st.gens.get(key);
    var g = null; try { g = gen1(pid, n); } catch (e) { st.fault = 'gen ' + pid + ': ' + (e && e.message || e); g = null; } st.gens.set(key, g); return g; }
  function gen1(pid, n) {
    var me = personInfo(pid); if (!me) return null; var r = rng(hash(pid + '#' + n)), kinds, friend = null, base = null;
    if (me.island) { var nn = npcByName(me.name), b = nn && nn.bond && nn.bond.to; if (!b || NO_GIVE[b.name]) return null; friend = { id: 'v:' + b.name, name: b.name }; kinds = ['courier', 'courier', 'fetch']; }
    else {
      var Lp = X.P.peers(pid, C.FRIEND[0], C.FRIEND[1]); if (!Lp.length) Lp = X.P.peers(pid, C.FRIEND_WIDE[0], C.FRIEND_WIDE[1]);
      var Ll = X.P.peers(pid, C.LOST[0], C.LOST[1]);
      if (Lp.length) friend = Lp[Math.floor(r() * Math.min(Lp.length, 12))]; if (Ll.length) base = Ll[Math.floor(r() * Math.min(Ll.length, 12))];
      kinds = []; if (friend) kinds.push('courier', 'courier', 'fetch'); if (base) kinds.push('find', 'find'); if (lmOpen()) kinds.push('lm');
      if (!kinds.length) return null; }
    var kind = pick(r, kinds), id = pid + '#' + n, g = me.name, o, it;
    if (kind === 'lm') { var L = lmOpen(); if (!L) return null; o = { lm: L.name, g: g };
      return { id: id, kind: 'lm', lm: L.id, giver: pid, gname: g, e: L.e, title: L.title, line: L.line, ask: fill(pick(r, ASK.lm), o), legs: [{ k: 'lm', lm: L.id }], xp: L.xp, runes: L.runes, place: me.place, placeName: me.placeName }; }
    it = pick(r, ITEMS[kind]);
    var to = kind === 'find' ? base : friend; o = { i: it[1], e: it[0], g: g, to: to.name };
    var legs = kind === 'courier' ? [{ k: 'give', who: to.id }] : kind === 'fetch' ? [{ k: 'get', who: to.id }, { k: 'back', who: pid }] : [{ k: 'spot', base: to.id, a: +(r() * Math.PI * 2).toFixed(3) }, { k: 'back', who: pid }];
    return { id: id, kind: kind, giver: pid, gname: g, to: to.id, toName: to.name, item: it[1], e: it[0], title: fill(TITLE[kind], o), line: fill(LINE[kind], o), ask: fill(pick(r, ASK[kind]), o),
      legs: legs, xp: REWARD[kind][0], runes: REWARD[kind][1], place: me.place, placeName: me.placeName };
  }
  function activeFrom(pid) { for (var i = 0; i < Q.active.length; i++) if (Q.active[i].giver === pid) return Q.active[i]; return null; }
  function activeLm(id) { for (var i = 0; i < Q.active.length; i++) { var a = Q.active[i]; if (a.kind === 'lm' && a.lm === id) return a; } return null; }
  function isGiver(pid) {   // the cheap test first (a sixth of the townsfolk, the four village friends), then the errand itself
    var c = st.givers.get(pid); if (c == null) { c = pid.indexOf('v:') === 0 ? !!GIVERS_ISLAND[pid.slice(2)] : hash('q720:' + pid) % C.GIVER_MOD === 0; st.givers.set(pid, c); } return c; }
  function offers(pid) {   // a ❗: a giver, after the Crow's lesson (before it, people only sing), with no errand of theirs running, under their count
    if (!X.S.lessons || !X.S.lessons.crow || !isGiver(pid)) return false; if (((Q.given[pid] || 0) >= C.PER_PERSON && !daily(pid)) || activeFrom(pid) || Q.active.length >= C.MAX_ACTIVE) return false;
    var g = gen(pid); return !!g && !(g.kind === 'lm' && (Q.lm[g.lm] || activeLm(g.lm))); }

  /* 786 #134 (the loop after the story): once a villager on her island has asked their three, they ask again most days: two errands a day across the
     island (from Lv 30 or the Hawk beaten), each paying its XP and runes and DAILY.coins coins too. DRAFT numbers. */
  var DAILY = { n: 2, coins: 3 };
  function dailyLeft() { var d = X.day ? X.day() : -1, q = Q.daily; return !q || q.d !== d ? DAILY.n : Math.max(0, DAILY.n - (q.n || 0)); }
  function daily(pid) { return pid.indexOf('v:') === 0 && !!(X.daily && X.daily()) && dailyLeft() > 0; }
  /* ---------- the errand's life: accept, a leg done, the reward ---------- */
  function accept(g) {
    var a = JSON.parse(JSON.stringify(g)); a.leg = 0; a.day = X.S.dawns || 0; delete a.ask;
    if (a.giver && (Q.given[a.giver] || 0) >= C.PER_PERSON && daily(a.giver)) { var dd = X.day ? X.day() : -1; if (!Q.daily || Q.daily.d !== dd) Q.daily = { d: dd, n: 0 }; Q.daily.n++; a.daily = 1; st.dailies = (st.dailies || 0) + 1; }   /* 786 */
    if (a.kind === 'lm') { var had = activeLm(a.lm); if (had) { had.giver = a.giver; had.gname = a.gname; } else Q.active.push(a); }
    else Q.active.push(a);
    Q.given[a.giver] = (Q.given[a.giver] || 0) + 1; Q.pin = (activeLm(a.lm) || a).id; st.accepted++; st.events.push('accept ' + a.id); saveNow(); hudNow(); refreshBoard(); return a; }
  function finish(a, how) {
    Q.active = Q.active.filter(function (q) { return q !== a; }); if (Q.pin === a.id) Q.pin = Q.active.length ? Q.active[Q.active.length - 1].id : null;
    Q.done.push({ id: a.id, kind: a.kind, title: a.title, e: a.e, xp: a.xp, runes: a.runes, giver: a.gname || null, day: X.S.dawns || 0 }); if (Q.done.length > C.DONE_KEEP) Q.done.splice(0, Q.done.length - C.DONE_KEEP);
    if (a.kind === 'lm') Q.lm[a.lm] = 1;
    if (a.kind === 'lm' && window.WFR_INTERIORS729) { var in729 = WFR_INTERIORS729.questFor(a.lm, X.S.dawns || 0); if (in729 && !Q.lm[in729.id] && !Q.active.some(function (q) { return q.id === in729.id; })) { Q.active.push(in729); Q.pin = in729.id; } }   /* 729: a landmark she can enter: going inside follows */
    if (a.giver) { var h = help(a.giver); h.help++; h.last = a.item || (LMB[a.lm] && LMB[a.lm].name) || ''; }
    if (a.to && a.kind !== 'find') { var h2 = help(a.to); h2.help++; h2.last = a.item; }
    X.S.runes = (X.S.runes || 0) + (a.runes || 0); st.completed++; st.events.push('finish ' + a.id + ' ' + how);
    if (a.daily && X.coin) { try { X.coin(DAILY.coins, a.title); } catch (e) { /* the errand is done without its coins */ } st.dailyPaid = (st.dailyPaid || 0) + DAILY.coins; }   /* 786 */
    try { X.toast(fill(WORDS.fin, { t: a.title }) + '  ' + fill(WORDS.reward, { xp: a.xp, r: a.runes }), 3400); } catch (e) { /* no toast */ }
    try { if (X.ding) X.ding(); } catch (e) { /* no sound */ }
    try { X.xp(a.xp, a.title); } catch (e) { saveNow(); }   // gainXP saves and calls hud()
    saveNow(); hudNow(); refreshBoard();
  }
  function advance(a, how) { a.leg++; st.events.push('leg ' + a.id + ' ' + how); if (a.leg >= a.legs.length) finish(a, how); else { saveNow(); hudNow(); refreshBoard(); } }

  /* ---------- 💬 (the page asks this before the person's own line; true = handled) ---------- */
  function talk(tg) {
    if (!st.inited) return false;
    try {
      var pid = idOf(tg); if (!pid) return false; var me = personInfo(pid); if (!me) return false; var who = me.label, i, a, L, lines = null, now = null, after = null;
      for (i = 0; i < Q.active.length && !lines; i++) { a = Q.active[i]; L = a.legs[a.leg]; if (!L || L.who !== pid) continue;   // a step of hers ends with this person
        lines = [[who, fill(pick(rng(hash(a.id + ':' + a.leg)), SAY[L.k] || SAY.give), { g: a.gname, i: a.item, to: a.toName })]];
        now = (function (q, k) { return function () { advance(q, 'talk ' + k); }; })(a, L.k); }
      if (!lines) { a = activeFrom(pid); if (a && a.kind !== 'lm') lines = [[who, fill(pick(rng(hash(a.id + ':w')), SAY.wait), { to: a.toName })]]; }   // theirs is running: a reminder
      if (!lines && offers(pid)) { var g = gen(pid); lines = [[who, g.ask]]; now = function () { accept(g); st.lastOffer = g.id; };   // the ❗: they ask, and it is hers
        after = function () { try { X.toast(fill(WORDS.got, { t: g.title }), 3000); } catch (e) { /* no toast */ } }; }
      if (!lines) { var h = (X.S.people724 || {})[pid], day = X.S.dawns || 0; if (h && h.help > 0 && h.day !== day) { h.day = day; lines = [[who, fill(pick(rng(hash(pid + day)), SAY.warm), { i: h.last || 'help' })]]; } }   // 724b: remembered, once a day
      if (!lines) return false;
      st.lastTalk = { id: pid, text: lines[0][1] };
      if (!(X.P && X.P.talk && X.P.talk(tg, lines, after))) X.say(lines, after);   // they turn to her (world-people.js), else the plain dialogue
      if (now) now();   // the step is hers at the tap, so a reload mid-dialogue keeps it
      return true;
    } catch (e) { st.fault = 'talk: ' + (e && e.message || e); return false; }   // a fault gives the person back their own line, never a dead button
  }

  /* ---------- the real place: landmarks (her own position through WFR_WORLD) and lost things (touch) ---------- */
  function dunnsActive() { var D = X.D; return !!(D && D.group && D.group.parent === X.scene && D.d && D.c); }
  function fallsSeg() { var P = window.WFR_DUNNS712; return P && P.dunns ? P.dunns : null; }
  function segDist(px, pz, x0, z0, x1, z1) { var dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / l2)) : 0; return Math.hypot(px - x0 - t * dx, pz - z0 - t * dz); }
  function lmHere(L) {   // { d metres, agl, ok } where she is now, or null when the landmark cannot be measured from here
    var S = X.S, W = window.WFR_WORLD;
    if (L.host === 'dunns' && dunnsActive()) { var F = fallsSeg(); if (!F) return null; var D = X.D, lx = S.pos.x - D.c[0], lz = S.pos.z - D.c[1], d0 = segDist(lx, lz, F.bottom[0], F.bottom[1], F.top[0], F.top[1]);
      return { d: d0, agl: null, ok: d0 <= L.rPatch, where: 'patch' }; }
    var T = X.TR; if (!T || !T.on || !T.ll || !W) return null;
    var d = W.distance(T.ll, L), gH = X.travelH ? Math.max(0, X.travelH(S.pos.x, S.pos.z)) : 0, agl = S.pos.y - gH, ok = d <= L.r;
    if (ok && L.kind === 'fly') ok = agl <= L.aglMax;
    else if (ok && L.kind === 'see' && L.aglMax) ok = agl <= L.aglMax;
    else if (ok && L.kind === 'top') { var p = W.toLocal(T.f, L.lat, L.lon), base = X.travelH ? Math.max(0, X.travelH(p.x, p.z)) : 0, up = S.pos.y - base; ok = up >= L.above[0] && up <= L.above[1]; }
    return { d: d, agl: agl, ok: ok, where: 'travel' };
  }
  function lmTarget(L, out) {   // the arrow's point on the island branch (Dunn's patch only; the travel zone draws its own, travelHud)
    if (L.host === 'dunns' && dunnsActive()) { var F = fallsSeg(), D = X.D; out.x = D.c[0] + (F.bottom[0] + F.top[0]) / 2; out.z = D.c[1] + (F.bottom[1] + F.top[1]) / 2; out.y = 0; return out; } return null; }
  function checkWorld() {
    var S = X.S, i, a, L;
    for (i = 0; i < LANDMARKS.length; i++) { L = LANDMARKS[i]; if (Q.lm[L.id]) continue; var h = lmHere(L); st.lm[L.id] = h;
      if (h && h.ok) { a = activeLm(L.id); if (!a) { a = { id: 'lm:' + L.id, kind: 'lm', lm: L.id, giver: null, gname: null, e: L.e, title: L.title, line: L.line, legs: [{ k: 'lm', lm: L.id }], leg: 0, xp: L.xp, runes: L.runes, day: S.dawns || 0 }; Q.active.push(a); }
        st.lmLast = { id: L.id, d: +h.d.toFixed(1), agl: h.agl != null ? +h.agl.toFixed(1) : null, where: h.where }; finish(a, 'arrived ' + h.where + ' ' + h.d.toFixed(0) + ' m'); } }
    for (i = 0; i < Q.active.length; i++) { a = Q.active[i]; var g = a.legs[a.leg]; if (!g || g.k !== 'spot') continue; var p = spotOf(g, TMPP); if (!p) continue;
      if (Math.hypot(S.pos.x - p.x, S.pos.z - p.z) < C.TOUCH && Math.abs(S.pos.y - p.y) < C.TOUCH_Y) { try { X.toast(fill(WORDS.found, { g: a.gname, i: a.item }), 2800); } catch (e) { /* no toast */ } advance(a, 'touched'); break; } }
  }

  /* ---------- the arrow and the level card ---------- */
  function pinned() { if (!Q || !Q.pin) return null; for (var i = 0; i < Q.active.length; i++) if (Q.active[i].id === Q.pin) return Q.active[i]; return null; }
  function legTarget(a, out) { var L = a.legs[a.leg]; if (!L) return null; if (L.k === 'in') return window.WFR_INTERIORS729 ? WFR_INTERIORS729.doorAt(L.lm, out) : null; if (L.k === 'lm') return lmTarget(LMB[L.lm], out); if (L.k === 'spot') return spotOf(L, out); return posOf(L.who, out); }
  function goal() {   // goalTarget(): the pinned quest's next step where she is now, else null (the game's own chain carries on)
    if (!st.inited || st.fault) return null; var a = pinned(); if (!a) return null; var p = legTarget(a, TMPP); if (!p) return null; if (!V) V = new X.THREE.Vector3(); V.set(p.x, p.y, p.z); return V; }
  function stepText(a) { var L = a.legs[a.leg]; if (!L) return a.title; var o = { e: a.e, to: a.toName, g: a.gname, i: a.item, lm: a.title };
    if (L.k === 'give' || L.k === 'get') o.to = (personInfo(L.who) || {}).name || a.toName; return fill(STEP[L.k] || '{e} {lm}', o); }
  function pill() { if (!st.inited) return null; var a = pinned(); return a ? stepText(a) : null; }
  var AR = { a: null };
  function travelHud(T, viewYaw) {   // the travel zone: a pinned landmark gets the arrow and the distance (unless 725d's own route holds them)
    st.travelArrow = false; if (!st.inited) return; hideMarks();
    var a = pinned(), F = window.WFR_FAST725D, W = window.WFR_WORLD; if (!a || (a.kind !== 'lm' && a.kind !== 'in') || !T || !T.on || !T.ll || !W) return; if (F && F.state && F.state().on) return;
    var L = (a.kind === 'in' && window.WFR_INTERIORS729 && WFR_INTERIORS729.doorLL(a.lm)) || LMB[a.lm], km = W.flownKm(T.ll, L), d = km < 2 ? Math.round(km * 1000) + ' m' : Math.round(km).toLocaleString('en-US') + ' km', el = $('dist'), ar = $('arrowSvg');
    if (el && el.textContent !== L.e + ' ' + d) el.textContent = L.e + ' ' + d;
    if (ar) { var rel = W.yawToward(T.ll, L) - viewYaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); ar.style.transform = 'rotate(' + (-rel * 180 / Math.PI).toFixed(1) + 'deg)'; if (ar.style.opacity !== '1') ar.style.opacity = '1'; }
    st.travelArrow = true;
  }

  /* ---------- the ❗ marks (DOM over the canvas, a small pool) ---------- */
  var CAND = [], CN = 0, PV = null;
  function candPush(id, x, y, z, d, kind, txt) { var c = CAND[CN] || (CAND[CN] = {}); c.id = id; c.x = x; c.y = y; c.z = z; c.d = d; c.kind = kind; c.txt = txt; CN++; }
  function legWho() { var m = {}; for (var i = 0; i < Q.active.length; i++) { var a = Q.active[i], L = a.legs[a.leg]; if (L && L.who) m[L.who] = a; } return m; }
  function hideMarks() { for (var i = 0; i < st.marks.length; i++) if (!st.marks[i].hidden) st.marks[i].hidden = true; st.shown.length = 0; }
  function draw() {
    if (!st.inited || !st.el) return;
    try {
      var S = X.S; CN = 0; st.shown.length = 0;
      if (!S.lessons || !S.lessons.crow || S.inside || S.mode === 'menu' || S.mode === 'paused' || (X.TR && X.TR.on)) { hideMarks(); return; }
      var to = legWho(), k, n, d;
      var L = X.npcs || []; for (k = 0; k < L.length; k++) { n = L[k]; if (!n.g.visible) continue; var pid = 'v:' + n.name; d = Math.hypot(n.g.position.x - S.pos.x, n.g.position.z - S.pos.z);
        if (to[pid] && d < C.MARK_TARGET) candPush(pid, n.g.position.x, n.g.position.y + 4.3, n.g.position.z, d, 'to', to[pid].e);
        else if (d < C.MARK_ISLAND && offers(pid)) candPush(pid, n.g.position.x, n.g.position.y + 4.3, n.g.position.z, d, 'give', '❗'); }
      if (X.P && X.P.each) X.P.each(eachTown);
      for (k = 0; k < Q.active.length; k++) { var a = Q.active[k], g = a.legs[a.leg]; if (!g || g.k !== 'spot') continue; var p = spotOf(g, TMPP); if (!p) continue; d = Math.hypot(p.x - S.pos.x, p.z - S.pos.z); if (d < C.MARK_TARGET) candPush('spot:' + a.id, p.x, p.y + 0.5, p.z, d, 'lost', a.e); }
      var idx = []; for (k = 0; k < CN; k++) idx.push(k); idx.sort(function (x, y) { return (CAND[x].kind === 'give') - (CAND[y].kind === 'give') || CAND[x].d - CAND[y].d; });
      var w = innerWidth, h = innerHeight, used = 0; if (!PV) PV = new X.THREE.Vector3();
      for (k = 0; k < idx.length && used < C.POOL; k++) { var c = CAND[idx[k]]; PV.set(c.x, c.y, c.z).project(X.camera); if (PV.z > 1 || PV.x < -1.1 || PV.x > 1.1 || PV.y < -1.1 || PV.y > 1.1) continue;
        var el = st.marks[used++], sx = (PV.x + 1) / 2 * w, sy = (1 - PV.y) / 2 * h, cls = 'q720m ' + c.kind;
        if (el.className !== cls) el.className = cls; if (el.textContent !== c.txt) el.textContent = c.txt;
        el.style.transform = 'translate(' + sx.toFixed(0) + 'px,' + sy.toFixed(0) + 'px) translate(-50%,-100%)'; if (el.hidden) el.hidden = false;
        st.shown.push({ id: c.id, kind: c.kind, x: +sx.toFixed(0), y: +sy.toFixed(0), d: +c.d.toFixed(1) }); }
      for (k = used; k < st.marks.length; k++) if (!st.marks[k].hidden) st.marks[k].hidden = true;
    } catch (e) { st.fault = 'draw: ' + (e && e.message || e); hideMarks(); }
  }
  function eachTown(id, x, y, z) { var S = X.S, d = Math.hypot(x - S.pos.x, z - S.pos.z), to = st.toMap;
    if (to && to[id] && d < C.MARK_TARGET) candPush(id, x, y + 2.45, z, d, 'to', to[id].e); else if (d < C.MARK_NEAR && offers(id)) candPush(id, x, y + 2.45, z, d, 'give', '❗'); }

  /* ---------- the board ---------- */
  var CSS = [
    '#questsBtn720{position:fixed;z-index:5;width:44px;height:44px;padding:0;border-radius:50%;border:2px solid #e3b75a;background:radial-gradient(circle at 50% 38%,#2b3a78,#141c46 70%);',
    'box-shadow:0 0 0 1px #2e1a06,0 4px 10px rgba(3,5,22,.45);font-size:21px;line-height:40px;text-align:center;color:#fff;pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;',
    '-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;cursor:pointer}',
    '#questsBtn720 b{position:absolute;right:-4px;top:-4px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#c8314a;color:#fff;font:800 11px/18px system-ui,sans-serif;box-shadow:0 0 0 1.5px #ffe9a8}',
    '#questsBtn720 b:empty{display:none}#questsBtn720.new{animation:q720pulse 1.6s ease-in-out infinite}',
    '@keyframes q720pulse{0%,100%{box-shadow:0 0 0 1px #2e1a06,0 4px 10px rgba(3,5,22,.45)}50%{box-shadow:0 0 0 1px #2e1a06,0 0 14px 4px rgba(255,215,122,.85)}}',
    'body:has(#missions:not([hidden])) #questsBtn720,body:has(#quick:not([hidden])) #questsBtn720,body:has(#quests720:not([hidden])) #questsBtn720,body:has(#care:not([hidden]):not(.tucked)) #questsBtn720{visibility:hidden}',
    'html.q720 #xpPop{margin-left:54px}',
    '#quests720 .q{display:grid;grid-template-columns:28px 1fr auto;gap:2px 8px;align-items:center;padding:7px 2px;border-top:1px solid rgba(46,26,6,.14)}',
    '#quests720 .q:first-of-type{border-top:0}#quests720 .q .e{font-size:20px;text-align:center}#quests720 .q .t{font-weight:800;font-size:14px;line-height:1.25}',
    '#quests720 .q .l{grid-column:2/4;font-size:13px;line-height:1.35;opacity:.86}#quests720 .q .rw{grid-column:2/4;font-size:12px;font-weight:700;color:#8a5a1c}',
    '#quests720 .q button{grid-row:1;grid-column:3;min-height:44px;min-width:64px;padding:0 10px;border-radius:999px;border:0;background:#eef6ff;color:#2f5fb0;font:800 13px/1 var(--body,system-ui);touch-action:manipulation}',
    '#quests720 .q.pin .t::before{content:"📌 "}#quests720 .q .on{font:800 12px/1 var(--body,system-ui);color:#2e7d32;grid-row:1;grid-column:3}',
    '#quests720 .q.done{opacity:.72}#quests720 .q.done .t::before{content:"✓ ";color:#2e7d32}#quests720 .q720hint{font-size:13px;line-height:1.4;padding:6px 2px;opacity:.86}',
    '.q720m{position:fixed;left:0;top:0;z-index:4;pointer-events:none;font-size:26px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.45));will-change:transform}',
    '.q720m.give{font-size:30px;color:#ffd23f}.q720m.to{font-size:24px;padding:3px 5px;border-radius:12px;background:rgba(255,248,225,.92);box-shadow:0 0 0 2px #e3b75a}',
    '.q720m.lost{font-size:24px;text-shadow:0 0 10px #fff6c2,0 0 18px #ffd23f}'
  ].join('\n');
  var BUST = null;
  function bust(x, y) {   // the click a browser sends AFTER a thumb's lift lands on whatever is under it NOW: the ✕ closes the board over the 🎒, whose listener is 'click' (the guard's first run opened the Pouch). One click, there, within 600 ms, is eaten
    if (BUST) removeEventListener('click', BUST, true); var t0 = performance.now();
    BUST = function (e) { var me = BUST; if (performance.now() - t0 > 600) { removeEventListener('click', me, true); BUST = null; return; }
      if (e.detail && Math.hypot(e.clientX - x, e.clientY - y) < 40) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); removeEventListener('click', me, true); BUST = null; st.busted = (st.busted || 0) + 1; } };
    addEventListener('click', BUST, true); }
  function tap(b, fn) {   // 725d's rule: a thumb's tap is its own down and up (a second tap's click can be cancelled near any lift); a keyboard's Enter is the click
    var dn = null; b.addEventListener('pointerdown', function (e) { dn = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; e.stopPropagation(); });
    b.addEventListener('pointerup', function (e) { var d = dn; dn = null; if (!(d && d.id === e.pointerId && performance.now() - d.t < 800 && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 18)) return; e.preventDefault(); e.stopPropagation(); fn(e); bust(e.clientX, e.clientY); });
    b.addEventListener('pointercancel', function () { dn = null; }); b.addEventListener('click', function (e) { if (e.detail === 0) fn(e); });
  }
  function build() {
    var ui = $('ui'); if (!ui) return false;
    var s = document.createElement('style'); s.id = 'q720css'; s.textContent = CSS; document.head.appendChild(s); document.documentElement.classList.add('q720');
    var b = document.createElement('button'); b.type = 'button'; b.id = 'questsBtn720'; b.setAttribute('aria-label', WORDS.title); b.setAttribute('aria-expanded', 'false'); b.innerHTML = '📜<b></b>'; ui.appendChild(b); st.btn = b;
    var d = document.createElement('div'); d.className = 'missions'; d.id = 'quests720'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', WORDS.title);
    d.innerHTML = '<div class="top"><span>📜 ' + WORDS.title + '</span><button type="button" id="quests720Close" aria-label="Close">✕</button></div><div id="quests720Body"></div>'; ui.appendChild(d); st.board = d;
    tap(b, function () { openBoard(!st.open); });
    tap($('quests720Close'), function () { openBoard(false); });
    $('quests720Body').addEventListener('click', function (e) { var t = e.target && e.target.closest ? e.target.closest('button[data-q]') : null; if (!t) return; act(t.getAttribute('data-q'), t.getAttribute('data-a')); });
    var m = document.createElement('div'); m.id = 'q720marks'; ui.appendChild(m); st.el = m;
    for (var i = 0; i < C.POOL; i++) { var k = document.createElement('div'); k.className = 'q720m'; k.hidden = true; k.setAttribute('aria-hidden', 'true'); m.appendChild(k); st.marks.push(k); }
    place(); addEventListener('resize', place); if (window.visualViewport) visualViewport.addEventListener('resize', place); if ($('care') && typeof MutationObserver === 'function') new MutationObserver(place).observe($('care'), { attributes: true, attributeFilter: ['hidden', 'class'] });
    return true;
  }
  function place() {   // under the level card, its left edge (both looks, any safe area); measured, never assumed
    var p = $('lvPill'), b = st.btn; if (!p || !b) return; var r = p.getBoundingClientRect(); if (!r.width) return;
    var c = $('care'), q = c && !c.hidden && c.classList.contains('tucked') ? c.getBoundingClientRect() : null, bot = q && q.width && q.left < r.left + b.offsetWidth && q.right > r.left ? Math.max(r.bottom, q.bottom) : r.bottom;   // 735b: under a tucked chick bar that would sit on it (Marth's picture, Nov 6), in both looks
    var L = Math.round(r.left) + 'px', T = Math.round(bot + 8) + 'px'; if (b.style.left !== L) b.style.left = L; if (b.style.top !== T) b.style.top = T; }
  function openBoard(on) {
    if (!st.board) return; on = !!on;
    if (on) { try { if ($('missions')) $('missions').hidden = true; if (X.openQuick && X.S.quick) X.openQuick(false); } catch (e) { /* the other cards stay as they are */ } refreshBoard(true); st.opens++; st.seen = Q.active.length; }
    else st.closes++;
    st.board.hidden = !on; st.open = on; st.btn.setAttribute('aria-expanded', on ? 'true' : 'false'); badge(); }
  function act(id, how) {
    if (how === 'pin') { if (Q.active.some(function (a) { return a.id === id; })) Q.pin = id; }
    else if (how === 'start') { var L = LMB[id]; if (L && !Q.lm[id]) { var a = activeLm(id); if (!a) { a = { id: 'lm:' + id, kind: 'lm', lm: id, giver: null, gname: null, e: L.e, title: L.title, line: L.line, legs: [{ k: 'lm', lm: id }], leg: 0, xp: L.xp, runes: L.runes, day: X.S.dawns || 0 }; Q.active.push(a); } Q.pin = a.id; } }
    saveNow(); hudNow(); refreshBoard(true); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function where(a) {   // a short "where" for a step that is not where she is
    var L = a.legs[a.leg]; if (!L) return ''; if (L.k === 'lm') { var M = LMB[L.lm]; return M.where + '. ' + (X.TR && X.TR.on ? M.line : (X.canWorld && X.canWorld() ? WORDS.mapGo : WORDS.far)); }
    if (legTarget(a, TMPP)) return ''; return a.placeName ? 'At ' + a.placeName + '.' : ''; }
  function row(q, cls, btn) {
    return '<div class="q ' + cls + '"><span class="e">' + esc(q.e) + '</span><span class="t">' + esc(q.title) + '</span>' + (btn || '') +
      '<span class="l">' + esc(q.line) + '</span><span class="rw">' + esc(fill(WORDS.reward, { xp: q.xp, r: q.runes })) + (q.gname ? ' · 🤝 ' + esc(fill(WORDS.helped, { g: q.gname })) : '') + '</span></div>'; }
  function boardHtml() {
    var h = '', i, a, pin = pinned();
    h += '<h3>' + WORDS.active + ' (' + Q.active.length + ')</h3>';
    if (!Q.active.length) h += '<div class="q720hint">' + esc(WORDS.none) + '</div>';
    var act2 = Q.active.slice().sort(function (x, y) { return (y === pin) - (x === pin); });
    for (i = 0; i < act2.length; i++) { a = act2[i]; var on = a === pin, w = where(a);
      h += row({ e: a.e, title: a.title, line: stepText(a).replace(/^\S+\s/, 'Now: ') + (w ? ' · ' + w : '') + (a.kind === 'lm' ? '' : ' · ' + a.line), xp: a.xp, runes: a.runes, gname: a.gname }, on ? 'pin' : '',
        on ? '<span class="on">' + WORDS.pinned + '</span>' : '<button type="button" data-q="' + esc(a.id) + '" data-a="pin">' + WORDS.follow + '</button>'); }
    h += '<h3>' + WORDS.avail + '</h3>';
    var n = 0; if (X.S.lessons && X.S.lessons.crow && !(X.TR && X.TR.on)) { (X.npcs || []).forEach(function (v) { if (Math.hypot(v.g.position.x - X.S.pos.x, v.g.position.z - X.S.pos.z) < 120 && offers('v:' + v.name)) n++; }); if (X.P && X.P.each) X.P.each(function (id) { if (offers(id)) n++; }); }
    st.near = n; if (Q.active.length >= C.MAX_ACTIVE) h += '<div class="q720hint">' + esc(WORDS.busy) + '</div>'; else if (n) h += '<div class="q720hint">' + esc(fill(WORDS.near, { n: n === 1 ? 'One person' : n + ' people', have: n === 1 ? 'has' : 'have' })) + '</div>';
    var lmOpen = !X.canWorld || X.canWorld(), here = X.TR && X.TR.on && X.TR.ll ? X.TR.ll : null, LMS = LANDMARKS.slice();   /* 795 (30): the wide world after the climb, the nearest first */
    if (!lmOpen) h += '<div class="q720hint">' + esc(WORDS.later || 'The wide world waits past the climb: Paris, New York, the falls.') + '</div>';
    else if (here && isFinite(here.lat)) LMS.sort(function (a, b) { var da = Math.hypot(a.lat - here.lat, (a.lon - here.lon) * Math.cos(here.lat * Math.PI / 180)), db = Math.hypot(b.lat - here.lat, (b.lon - here.lon) * Math.cos(here.lat * Math.PI / 180)); return da - db; });
    for (i = 0; lmOpen && i < LMS.length; i++) { var L = LMS[i]; if (Q.lm[L.id] || activeLm(L.id)) continue; if (L.near790 && !(st.lm[L.id] && st.lm[L.id].d <= L.near790)) continue;   /* 790 D: a named place waits on the board until she is near it */
      h += row({ e: L.e, title: L.title, line: L.where + '. ' + L.line, xp: L.xp, runes: L.runes }, '', '<button type="button" data-q="' + L.id + '" data-a="start">' + WORDS.start + '</button>'); }
    if (Q.done.length) { h += '<h3>' + WORDS.done + ' (' + Q.done.length + ')</h3>'; for (i = Q.done.length - 1; i >= Math.max(0, Q.done.length - 8); i--) { var d = Q.done[i]; h += row({ e: d.e, title: d.title, line: d.giver ? 'For ' + d.giver + '.' : 'Seen with your own eyes.', xp: d.xp, runes: d.runes }, 'done', ''); } }
    return h; }
  function refreshBoard(force) { if (!st.board || (!st.open && !force)) { badge(); return; } var b = $('quests720Body'); if (b) { var h = boardHtml(); if (b.innerHTML !== h) b.innerHTML = h; } badge(); }
  function badge() { if (!st.btn) return; var n = Q ? Q.active.length : 0, t = n ? String(n) : '', bb = st.btn.firstElementChild; if (bb && bb.textContent !== t) bb.textContent = t;
    var fresh = !st.open && n > (st.seen || 0); if (st.btn.classList.contains('new') !== fresh) st.btn.classList.toggle('new', fresh); }

  /* ---------- the page's calls ---------- */
  function init(ctx) {
    if (st.inited) return; X = ctx;
    try { X.S.quests = Q = clean(X.S.quests); X.S.people724 = X.S.people724 && typeof X.S.people724 === 'object' ? X.S.people724 : {}; st.seen = Q.active.length;
      if (!build()) { st.fault = 'no #ui'; return; } st.inited = true; badge(); } catch (e) { st.fault = 'init: ' + (e && e.message || e); }
  }
  function tick(dt) {
    if (!st.inited) return;
    try {
      if (X.S.quests !== Q) X.S.quests = Q = clean(X.S.quests);   // a restore (Back up / Restore, a file switch) put a new record in
      checkWorld(); st.toMap = legWho();
      if ((st.offerT -= dt || 0) <= 0) { st.offerT = 1; place(); if (st.open && ((($('missions') && !$('missions').hidden)) || ($('quick') && !$('quick').hidden))) openBoard(false); }
    } catch (e) { st.fault = 'tick: ' + (e && e.message || e); }
  }
  function peek() {
    var b = st.btn ? st.btn.getBoundingClientRect() : null;
    return { inited: st.inited, fault: st.fault, open: st.open, opens: st.opens, closes: st.closes, accepted: st.accepted, completed: st.completed, events: st.events.slice(-12), daily: Q ? Q.daily : null, dailies: st.dailies || 0, dailyPaid: st.dailyPaid || 0, dailyLeft: Q && X ? dailyLeft() : null,   /* 786 */
      active: Q ? Q.active.map(function (a) { var L = a.legs[a.leg] || {}; return { id: a.id, kind: a.kind, leg: a.leg, legs: a.legs.length, k: L.k || null, next: L.who || L.base || L.lm || null, giver: a.giver, to: a.to || null, title: a.title, step: stepText(a) }; }) : [],
      nearId: X && X.S.nearPerson724 ? idOf(X.S.nearPerson724) : null,
      done: Q ? Q.done.map(function (d) { return d.id; }) : [], pin: Q ? Q.pin : null, given: Q ? Object.assign({}, Q.given) : {}, lm: Q ? Object.assign({}, Q.lm) : {}, lmLast: st.lmLast,
      shown: st.shown.slice(), busted: st.busted || 0, lastTalk: st.lastTalk, lastOffer: st.lastOffer || null, travelArrow: st.travelArrow, near: st.near,
      btn: b ? [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] : null, help: Object.assign({}, X && X.S.people724 || {}) };
  }
  function inside729(id) {   /* 729: she went inside a landmark: its "go inside" quest is done (made and done at once if she came without it) */
    if (!st.inited || !window.WFR_INTERIORS729) return false; var key = 'in:' + id, a = null, i; if (Q.lm[key]) return false;
    for (i = 0; i < Q.active.length; i++) if (Q.active[i].id === key) a = Q.active[i];
    if (!a) { a = WFR_INTERIORS729.questFor(id, X.S.dawns || 0); if (!a) return false; Q.active.push(a); }
    Q.lm[key] = 1; finish(a, 'went inside'); return true; }
  function pinLm(id) {   /* 783 #130: a country's arrival names a landmark that calls her inland: its quest is made (as checkWorld makes one) and pinned, so the arrow and the level card follow it */
    if (!st.inited || !LMB[id] || Q.lm[id]) return false; var L = LMB[id], a = activeLm(id);
    if (!a) { a = { id: 'lm:' + id, kind: 'lm', lm: id, giver: null, gname: null, e: L.e, title: L.title, line: L.line, legs: [{ k: 'lm', lm: id }], leg: 0, xp: L.xp, runes: L.runes, day: X.S.dawns || 0 }; Q.active.push(a); }
    Q.pin = a.id; st.events.push('pin ' + a.id); saveNow(); hudNow(); refreshBoard(); return true; }
  function lmPeek(id) { var L = LMB[id]; if (!L || !st.inited) return null; var h = lmHere(L); return { id: id, d: h ? +h.d.toFixed(1) : null, agl: h && h.agl != null ? +h.agl.toFixed(1) : null, ok: h ? h.ok : null, where: h ? h.where : null, done: !!Q.lm[id] }; }

  return { C: C, WORDS: WORDS, LANDMARKS: LANDMARKS, place: place, inside: function (id) { return inside729(id); }, init: init, tick: tick, draw: draw, travelHud: travelHud, talk: talk, goal: goal, pill: pill, peek: peek, lmPeek: lmPeek, pinLm: pinLm,
    lmDone: function (id) { return !!(st.inited && Q && Q.lm[id]); }, pinned: function () { var a = pinned(); return a ? a.id : null; },
    offers: function (pid) { return st.inited ? offers(pid) : false; }, open: function (on) { openBoard(on); } };
})();
