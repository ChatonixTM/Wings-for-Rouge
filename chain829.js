/* chain829.js - BOARD 829 LINK 3, THE ERRANDS CHAIN AND THE FIRST STRONG ONE ACROSS THE EARTH (Wings for Rouge). Trunks, Nov 18 2026. Guard: tests/chain829.js.
   Marth, Nov 14 2026, verbatim: "rewards you for doing one action which ties into another which may potentially unlock something somewhere else, that might
   ultimately bring u back to the starter village/island, then sends u to boss across the earth, that kind of looping." And: "there WILL be bosses and strong
   at that, in certain countries". LOOP_MAP_829.md, link 3 (from COO's Operations, studied, never copied): "each card says what unlocks the next, each sends
   her farther ... the chain's far end is a boss across the earth (the Everglades gator first). Beating it brings a villager home and opens the next chain."

   WHAT SHE SEES (Standard only; Classic is frozen and never makes it; it opens after the Hawk, once she has hearts to fight with):
     ERRANDS   opened the first time she comes to the village after the Hawk (a card: "Village errands"); then a row in her pouch, "Errands", opens one sheet: five cards in a chain, each farther out (the home island, Jamaica, the Caribbean, Florida,
               then "Soon"). Each card says where, what it asks, what it pays, and, locked, exactly what opens it. Each pays what the next one needs:
               the home errand's word sends her to Jamaica; the Doctor Bird's fast flight carries her over the long sea; the Caribbean's shark teeth are
               the shield's; the Caribbean errand's fisherman puts the enemy mark (743) on the old gator in Florida. A finished errand is a card (title39):
               what it paid and what it opened. Errands already done in her file (an A at home, the Doctor Bird beaten) are counted, one card at a time.
     THE OLD GATOR   at Flamingo, the Everglades' southern tip, a huge old alligator lies in the shallows of Florida Bay with only its back and eyes out (world-animals.js's own
               alligator body at a big bull's size, its enemy mark on her compass). Near it: a framed scene (cine.js: bars, a low shot pushing in as it
               lifts its head, its name card, the title), then the fight, in the air: tap Attack and she swoops and pecks (fall748's swoop, peck and sweep,
               as at any animal); it has four alligators' hit points, shown as 8 hearts in the job pill. It fights back with animals714's shape (a warning
               of at least 0.6 s, one strike at a time, a grace after it lands): the SNAP (it rears, a ring on the water where its jaws will land, then lunges
               at her if she is low and near) and the heavy GATOR LEAP (a longer warning, then it launches straight up out of the water to her height, the
               way real alligators jump for birds). Flying clear of the ring dodges both. A hit is the hearts' own (hearts714: the first hit of a fight a
               stagger and the runes, later ones a heart). It never takes her last heart: it lets her go ("rest, eat, come back"). Her stamina drains as in
               any flight (stamina832) and three apples hang over the water while they fight (stamina832's boss-fight fruit). Flying off ends it; it heals.
     BEATEN    it rolls and turns white like every animal (fall748), leaves two gator scutes (craft787: the 4th recipe, the Scute shield) and a coin;
               a short title; the errand's card; its enemy mark comes off the compass; and Cypress, from the Everglades, comes home with her: back at the
               village green she is there, with a word about the old gator, and the next chain's first card opens ("Soon").
   SAVED under a NEW key only: S.seen.chain829 = { at, done: { id: day }, carib, tries, beaten, met, cy }, written when the chain first opens (after the
   Hawk). Nothing renamed; an old file loads as it was.
   COST: the gator's bodies are world-animals' (its one program) and made at load (prebuild829); its warning ring is fall748's aim ring's twin (the same
   MeshBasicMaterial flags: its program), made here at load; the sheet is DOM. Nothing joins the scene and nothing compiles while she plays.
   BORROWED: missions788's grades and places; doctor766's record; world-animals.js's alligator (croc), its instancing and its 748 hit path; fall748's hit
   points, fade and coin; craft787's bag and Craft; hearts714's hit; stamina832's drain and arena fruit; cine.js's scene, name card and item-get; title39;
   743's enemy mark; the village's newcomer body (the page). New here: the chain's table and the gator's few moves, nothing else.
   Every word, name and number a DRAFT for his pen and her thumb. No Scripture is added. */
window.WFR_CHAIN829 = (function () {
  'use strict';
  var API = { error: '' };
  var GATOR = { lat: 25.1385, lon: -80.9246, name: 'The Old Gator', role: 'Flamingo, the Everglades' };   /* the shallows off the Flamingo shore, Florida Bay (DRAFT spot: Shark Valley's sawgrass draws as dry grass and hid it; the bay's water is drawn) */
  var CARIB = [10, 27, -90, -59], FLORIDA = [24.5, 31, -87.6, -80];
  var K = { CHECK: 1.0, GAP: 6.5, MEET: 60, MEET_UP: 50, LEASH: 320, AWAY: 450, RANGE: 26, GLIDE: 1.7, TURN: 1.9, SINK: 0.2, CD: 1.2, GRACE: 3, HEAVY_P: 0.35, SCENE: 4.8, SKIP: 1.2, CARIB_N: 3, WON_T: 1.4, CY_TALK: 4.5,
    SNAP: { id: 'snap', warn: 0.85, fly: 0.28, lock: 0.3, from: 9, up: 6, reach: 6, hitR: 2.6, rise: 1.4, recover: 1.6 },
    LEAP: { id: 'leap', heavy: true, warn: 1.35, fly: 0.5, lock: 0.35, from: 11, up: 13, reach: 3, hitR: 3.0, rise: 0, recover: 2.4, fall: 0.8 } };
  var HEARTS = 8;   /* the pill's hearts for its hit points (fall748 ROW.oldgator: 22) */
  /* THE CHAIN (DRAFT, his pen). ask: what she does; gives: what it pays INTO the next; lock: what opens it (the card before it) */
  var ERR = [
    { id: 'home', e: '\u{1F3DD}\u{FE0F}', where: 'The home island', name: 'Show the village your flying', ask: 'Earn an A on any mission at home.', pay: { coins: 8, runes: 10 },
      gives: 'Hal draws you the way to Jamaica: the Doctor Bird of Dunn’s River knows a fast flight.' },
    { id: 'jamaica', e: '\u{1F30A}', where: 'Dunn’s River Falls, Jamaica', name: 'The fast one of Jamaica', ask: 'Beat the Doctor Bird in his race to Dolphin Cove.', pay: { coins: 10, runes: 12 },
      gives: 'Fast forward, for good: the long flights out over the sea.' },
    { id: 'carib', e: '\u{1F988}', where: 'Out over the Caribbean', name: 'The wild sea', ask: 'Beat 3 animals out in the Caribbean, past the home island.', pay: { coins: 12, runes: 15, tooth: 2 },
      gives: 'And a fisherman’s word: an old gator rules the shallows at Flamingo, in the Florida Everglades. Its enemy mark is on your compass.' },
    { id: 'gator', e: '\u{1F40A}', where: 'Flamingo, the Everglades, Florida', name: 'The old gator', ask: 'Beat the old gator of Flamingo. Follow its enemy mark.', pay: { coins: 25, runes: 30, xp: 200 },
      gives: '2 gator scutes for a Scute shield (Craft), and Cypress from the Everglades comes home to the village with you.' },
    { id: 'soon', e: '\u{1F9ED}', where: 'Farther out', name: 'Soon', ask: 'Cypress has heard of something stranger, farther out. Soon.', soon: true }
  ];
  var W = {   /* DRAFT, his pen */
    open: ['NEW', 'Village errands', 'Each one opens the next, farther out · in your pouch'], openToast: '\u{1F4DC} Errands: the village has a chain of jobs for you, each one farther out. Pouch → Errands.',
    done: 'ERRAND DONE', next: function (e) { return 'Next: ' + e.name + ' · ' + e.where; }, carib: function (n) { return '\u{1F988} Errand: ' + n + ' of ' + K.CARIB_N + ' animals out in the Caribbean.'; },
    title: ['A STRONG ONE', 'The Old Gator', 'Swoop and peck it (Attack) · fly clear when it rears'], again: ['THE OLD GATOR', 'Again', 'Swoop and peck · fly clear when it rears'],
    how: 'Tap Attack to swoop down and peck. When it rears and the ring shows, fly clear!', snap: 'it rears to SNAP: fly clear!', leap: 'it sinks to LEAP: fly up and away!',
    fled: 'The old gator sinks back into the sawgrass. It will be waiting.', spared: 'The old gator drags you down, then lets you go. Rest, eat, and come back stronger.',
    beaten: ['A STRONG ONE FALLS', 'The Old Gator', '🐊 2 gator scutes for your Craft · Flamingo is quiet tonight'],
    cyHome: 'Cypress, from the Everglades, flew home with you: find her on the village green.',
    cy: [['Cypress', 'You are the little bird who beat the old gator! I watched it from the marina my whole life. Nobody ever made it sink like that.'],
      ['Cypress', 'I wanted to see your island. Your village is lovely. I think I will stay a while, right here by the well.'],
      ['Cypress', 'And I hear things, from boats that come up from the south. Something stranger, farther out. When I know more, I will tell you.']],
    cyAgain: [['Cypress', 'The sawgrass would be swaying now. Thank you for bringing me. When the boats tell me more, you will be the first to know.']],
    soonCard: 'The next chain: Soon', sheet: 'Errands', sheetSub: 'Each one opens the next, farther out.', close: 'Close', now: 'Now', doneW: 'Done', locked: function (e) { return '\u{1F512} Opens when you finish: ' + e.name; },
    pill: function (h, warn) { var s = ''; for (var i = 0; i < HEARTS; i++) s += i < h ? '♥' : '♡'; return '\u{1F40A} The old gator ' + s + (warn ? ' · ' + warn : ''); }
  };
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function inBox(lat, lon, B) { return lat >= B[0] && lat <= B[1] && lon >= B[2] && lon <= B[3]; }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function payText(p) { var o = []; if (p.coins) o.push('+' + p.coins + ' coins'); if (p.runes) o.push('+' + p.runes + ' runes'); if (p.xp) o.push('+' + p.xp + ' XP'); if (p.tooth) o.push('+' + p.tooth + ' shark teeth'); return o.join(' · '); }
  /* THE RULES (pure: the guard reads the same) */
  function rec(S, make) { S.seen = S.seen || {}; var r = S.seen.chain829; if (!r || typeof r !== 'object') { if (!make) return null; r = S.seen.chain829 = { at: 0, done: {}, carib: 0, tries: 0, beaten: 0, met: 0, cy: 0 }; }
    r.at = clamp(r.at | 0, 0, ERR.length - 1); r.done = r.done && typeof r.done === 'object' ? r.done : {}; r.carib = r.carib | 0; r.tries = r.tries | 0; r.met = r.met | 0; r.cy = r.cy | 0; return r; }
  function homeA(S) { var M = window.WFR_MISSIONS788, b = S.world && S.world.m788 && S.world.m788.best; if (!M || !b) return false; var ids = M.PLACES.filter(function (P) { return !P.world; }).map(function (P) { return P.id; });
    for (var k in b) if (b[k] >= 3 && ids.indexOf(k.split('.')[0]) >= 0) return true; return false; }
  function met(S, id, r) {   /* is errand id done in her file? */
    if (id === 'home') return homeA(S);
    if (id === 'jamaica') return !!(S.seen && S.seen.doctor766 && S.seen.doctor766.won > 0);
    if (id === 'carib') return (r ? r.carib : 0) >= K.CARIB_N;
    if (id === 'gator') return !!(r && r.beaten);
    return false; }
  function caribOf(ll) { return !!ll && inBox(ll.lat, ll.lon, CARIB) && !inBox(ll.lat, ll.lon, FLORIDA); }

  function create(o) {
    var THREE = o.THREE, S = o.S, A = { err: '', checkT: 0, gap: 0, said: {}, cards: 0, sheets: 0, scenes: 0, fights: 0, hurts: 0, warns: 0, dodges: 0, spared: 0, fled: 0, wins: 0, cyTalks: 0, last: null };
    var B = { m: null, ph: 'lurk', s: 'stalk', st: 0, ox: 0, oz: 0, up: 0, yaw: 0, pitch: 0, mv: false, surf: 0, atk: null, since: 0, cd: 0, grace: 0, J: null, hits: 0, cool: false, sceneT: -1, wonT: -1, hp0: null, warn: '', lastHp: -1, fightId: '' };
    var V = new THREE.Vector3();
    /* ---------- the warning ring: fall748's aim ring's own flags (its program), made here at load, hidden ---------- */
    var ring = null; try { var rg = new THREE.RingGeometry(0.82, 1, 40); rg.rotateX(-Math.PI / 2); ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0.75, depthWrite: false, fog: false, toneMapped: false }));
      ring.name = 'chain829:warn'; ring.visible = false; ring.frustumCulled = false; ring.layers.enable(0); if (o.layer) ring.layers.enable(o.layer); ring.renderOrder = 6; o.scene.add(ring); } catch (e) { A.err = 'ring: ' + (e && e.message); }
    try { if (o.WA && o.WA.prebuild829) A.built = o.WA.prebuild829('oldgator'); } catch (e) { A.err = 'prebuild: ' + (e && e.message); }
    function on() { return !o.classic() && !o.creative() && !!(S.hearts && S.hearts.max > 0); }
    function r0() { return rec(S, false); }
    function cur() { var r = r0(); return r ? ERR[r.at] : null; }
    function cardUp() { try { return !!o.cardUp(); } catch (e) { return false; } }
    function calm() { return !S.talking && !o.busy() && !cardUp() && (S.mode === 'fly' || S.mode === 'walk' || S.mode === 'hover' || S.mode === 'swim'); }
    function bagAdd(m, n) { S.seen = S.seen || {}; var c = S.seen.craft787; if (!c || typeof c !== 'object') c = S.seen.craft787 = { bag: {}, made: {}, told: {}, n: 0, bells: 0 }; c.bag = c.bag || {}; c.bag[m] = (c.bag[m] | 0) + n; }

    /* ---------- THE CHAIN ---------- */
    function complete() {   /* the open errand is done: its pay, its card, the next one opened (one card at a time) */
      var r = r0(), e = ERR[r.at], nx = ERR[r.at + 1] || null, p = e.pay || {}; r.done[e.id] = (S.dawns || 0) + 1;
      if (p.coins) { try { o.coin(p.coins, 'the errand: ' + e.name, S.pos, true); } catch (x) { S.coins = (S.coins || 0) + p.coins; } }
      if (p.runes) S.runes = (S.runes || 0) + p.runes; if (p.tooth) bagAdd('tooth', p.tooth);
      if (p.xp) { try { o.xp(p.xp, 'the errand: ' + e.name); } catch (x) { /* fine */ } }
      if (nx) r.at++; A.cards++; A.last = e.id; o.save(); o.hud();
      try { o.title(W.done, e.name, payText(p) + (nx ? ' · ' + W.next(nx) : ''), 'found'); } catch (x) { /* the card is a nicety */ }
      try { o.tone(659, 0, 0.12, 'triangle', 0.05); o.tone(880, 0.12, 0.18, 'triangle', 0.05); } catch (x) { /* fine */ }
      if (nx && nx.id === 'gator') { try { o.mark(true, GATOR); } catch (x) { /* fine */ } fix(); }
      if (e.id === 'gator') { try { o.mark(false, GATOR); } catch (x) { /* fine */ } A.cyToast = true; }
      A.gap = K.GAP; return e.id;
    }
    function chainTick(dt) {
      A.gap = Math.max(0, A.gap - dt); if ((A.checkT -= dt) > 0) return; A.checkT = K.CHECK; if (A.gap > 0 || !calm()) return;
      var r = r0();
      if (!r) { if (!o.village || !o.village()) return;   /* the village gives them: the chain opens the first time she is at the village after the Hawk */ r = rec(S, true); o.save(); A.gap = K.GAP; A.opened = (A.opened || 0) + 1; try { o.title(W.open[0], W.open[1], W.open[2], 'found'); } catch (x) { o.toast(W.openToast, 5200); } return; }
      if (A.cyToast) { A.cyToast = false; o.toast(W.cyHome, 5200); A.gap = K.GAP; return; }
      var e = ERR[r.at]; if (!e.soon && met(S, e.id, r)) complete();
    }
    function fell(q) {   /* every fall (the page's fall748Fall): the Caribbean's count; the old gator's end */
      try { if (!on() || !q) return; var r = r0(); if (!r) return; if (q.k === 'oldgator') { won(); return; }
        if (ERR[r.at].id === 'carib' && caribOf(q.ll) && r.carib < K.CARIB_N) { r.carib++; o.save(); o.toast(W.carib(r.carib), 2600); } } catch (e) { A.err = 'fell: ' + (e && e.message); }
    }

    /* ---------- THE OLD GATOR ---------- */
    function fix() { if (B.m || !o.WA || !o.WA.fixed829) return; var r = r0(); if (!r || ERR[r.at].id !== 'gator' || r.beaten) return; B.m = o.WA.fixed829({ k: 'oldgator', lat: GATOR.lat, lon: GATOR.lon, drive: drive }); B.ph = 'lurk'; }
    function unfix() { if (B.m && o.WA && o.WA.unfix829) o.WA.unfix829(B.m); B.m = null; ring.visible = false; }
    function home() { var q = o.at(GATOR.lat, GATOR.lon); return q; }
    function gPos(out) { var h = home(); out = out || { x: 0, y: 0, z: 0 }; out.x = h.x + B.ox; out.z = h.z + B.oz; out.base = o.ground(out.x, out.z); out.y = out.base + B.up; return out; }
    var GP = { x: 0, y: 0, z: 0, base: 0 };
    function drive(out, m) {   /* world-animals' place() asks this every picture: where it is, how it lies */
      if (B.ph === 'gone' || !o.on()) { out.hide = true; return; }
      var surf = B.ph === 'scene' ? sm((B.sceneT - 0.6) / 1.6) : B.ph === 'fight' || B.ph === 'won' ? 1 : 0;
      out.ox = B.ox; out.oz = B.oz; out.up = B.up; out.sink = K.SINK * (1 - 0.8 * surf); out.yaw = B.yaw; out.pitch = B.pitch - (B.ph === 'scene' ? 0.18 * surf : 0); out.roll = 0; out.mv = B.mv;
    }
    function hpOf() { var m = B.m; if (!m) return 0; var F = window.WFR_FALL748, mx = F ? F.hp('oldgator') : 22; return m.hp748 == null ? mx : Math.max(0, m.hp748); }
    function hearts() { var F = window.WFR_FALL748, mx = F ? F.hp('oldgator') : 22; return Math.ceil(hpOf() / mx * HEARTS - 1e-6); }
    function pill() { if (B.ph !== 'fight' && B.ph !== 'won') return ''; return W.pill(B.ph === 'won' ? 0 : hearts(), B.ph === 'fight' && (B.s === 'warn') ? B.warn : ''); }
    function startFight(first) {
      var r = r0(); r.tries++; o.save(); B.ph = 'fight'; B.s = 'stalk'; B.st = 0; B.cd = 1.6; B.grace = 0; B.hits = 0; B.since = 0; B.fightId = 'oldgator829:' + r.tries; A.fights++; B.lastHp = -1;
      try { o.title(first ? W.title[0] : W.again[0], first ? W.title[1] : W.again[1], first ? W.title[2] : W.again[2], 'found'); } catch (x) { /* fine */ }
      B.howT = first ? 4.8 : 0;   /* the how-to waits under the title (game time) */
      o.hud(); }
    function meet() {   /* the first time: the framed scene (the Doctor Bird's staging, borrowed), then the fight; after: straight to the fight */
      var r = r0(); r.met++; o.save();
      if (r.met > 1 || !o.cine) { startFight(r.met <= 1); return; }
      B.ph = 'scene'; B.sceneT = 0; A.scenes++;
      var H0 = gPos({}), B0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, dx = B0.x - H0.x, dz = B0.z - H0.z, L = Math.hypot(dx, dz) || 1, dir = { x: dx / L, z: dz / L }, side = { x: dir.z, z: -dir.x };
      B.yaw = Math.atan2(dx, dz);
      var ok = o.cine.play({ name: 'chain829', dur: K.SCENE, skip: K.SKIP, freeze: true, bars: true,
        start: function () { try { o.cine.nameCard(GATOR.name, GATOR.role, 3800); } catch (e) { /* the card is a nicety */ } try { o.tone(98, 0.2, 0.9, 'sawtooth', 0.03); o.tone(73, 0.5, 1.1, 'sawtooth', 0.03); } catch (e) { /* fine */ } },
        tick: function (t) { B.sceneT = t; },
        shot: function (t, u, P, Lk) {   /* low over the water from her side of it, pushing in on the head as it lifts out of the water */
          var G = gPos(GP), k = sm(t / K.SCENE), d = 21 - 7 * k, a = 0.85 - 0.3 * k, c = Math.cos(a), s = Math.sin(a), vx = dir.x * c + side.x * s, vz = dir.z * c + side.z * s, hx = Math.sin(B.yaw) * 2.6, hz = Math.cos(B.yaw) * 2.6;
          P.set(G.x + hx + vx * d, G.base + 1.6 + 1.4 * (1 - k), G.z + hz + vz * d); P.y = Math.max(P.y, o.ground(P.x, P.z) + 0.6);
          Lk.set(G.x + hx * 0.35, G.base + 0.7 + 0.3 * k, G.z + hz * 0.35); return 42 - 6 * k; },
        end: function () { B.sceneT = -1; startFight(true); } });
      if (!ok) { B.ph = 'lurk'; startFight(true); }
    }
    function endFight(why) {   /* 'fled' | 'spared': it heals; she must fly off before it fights again (spared) */
      B.ph = 'lurk'; B.s = 'stalk'; B.up = 0; B.pitch = 0; B.mv = false; ring.visible = false; if (B.m) { B.m.hp748 = null; B.m.h748 = null; }
      if (why === 'spared') { B.cool = true; A.spared++; o.toast(W.spared, 5200); } else { A.fled++; o.toast(W.fled, 3800); } o.hud(); }
    function won() {
      if (B.ph === 'won' || B.ph === 'gone') return; B.ph = 'won'; B.wonT = 0; ring.visible = false; A.wins++; var r = r0(); r.beaten = Date.now(); r.cy = 1; o.save(); o.hud();
      try { o.tone(392, 0, 0.3, 'triangle', 0.05); o.tone(523, 0.25, 0.3, 'triangle', 0.05); o.tone(659, 0.5, 0.6, 'triangle', 0.05); } catch (e) { /* fine */ } }
    function pickAtk() { var a = B.since >= 2 || Math.random() < K.HEAVY_P ? K.LEAP : K.SNAP; if (a === K.LEAP) B.since = 0; else B.since++; return a; }
    function hurt(G) {   /* the strike landed: the hearts' own hit, never her last heart */
      var free = B.hits === 0, h = S.hearts; B.hits++;
      if (!free && h && h.now <= 1) { endFight('spared'); return; }
      var res = null; try { res = o.hit({ from: { x: G.x, z: G.z }, fightId: B.fightId }); } catch (e) { res = null; }
      if (res && res.ignored) { B.hits--; return; }
      A.hurts++; B.grace = K.GRACE;
      var dx = S.pos.x - G.x, dz = S.pos.z - G.z, L = Math.hypot(dx, dz) || 1; S.pos.x += dx / L * 2.4; S.pos.z += dz / L * 2.4; S.pos.y += 1.8; S.pitch = Math.max(S.pitch || 0, 0.3);   /* knocked up and away from its jaws */
      try { o.tone(160, 0, 0.18, 'square', 0.05); o.tone(110, 0.06, 0.22, 'triangle', 0.05); } catch (e) { /* fine */ }
    }
    function fightTick(dt) {
      var G = gPos(GP), dx = S.pos.x - G.x, dz = S.pos.z - G.z, d = Math.hypot(dx, dz), hy = S.pos.y - G.base, Hm = home();
      if (Math.hypot(S.pos.x - Hm.x, S.pos.z - Hm.z) > K.LEASH) { endFight('fled'); return; }
      var hp = hearts(); if (hp !== B.lastHp) { B.lastHp = hp; o.hud(); }
      B.st += dt; B.cd = Math.max(0, B.cd - dt); B.grace = Math.max(0, B.grace - dt); if (B.howT > 0 && (B.howT -= dt) <= 0) o.toast(W.how, 4200);
      var want = Math.atan2(dx, dz), turn = function (k) { B.yaw = wrap(B.yaw + clamp(wrap(want - B.yaw), -K.TURN * k * dt, K.TURN * k * dt)); };
      if (B.s === 'stalk') {
        turn(1); B.up += (0 - B.up) * Math.min(1, dt * 3); B.pitch += (0 - B.pitch) * Math.min(1, dt * 4); B.mv = false;
        if (d > 5) { var nx = B.ox + Math.sin(B.yaw) * K.GLIDE * dt, nz = B.oz + Math.cos(B.yaw) * K.GLIDE * dt; if (Math.hypot(nx, nz) < K.RANGE) { B.ox = nx; B.oz = nz; B.mv = true; } }
        if (B.cd <= 0 && B.grace <= 0 && S.mode !== 'paused') { var a = pickAtk(); if (d < a.from && hy < a.up + 2) { B.atk = a; B.s = 'warn'; B.st = 0; A.warns++; B.warn = a === K.LEAP ? W.leap : W.snap; B.J = { x: S.pos.x, y: S.pos.y, z: S.pos.z }; o.hud();
          try { if (a === K.LEAP) { o.tone(82, 0, 1.0, 'sawtooth', 0.035); } else { o.tone(140, 0, 0.5, 'sawtooth', 0.035); o.tone(120, 0.2, 0.4, 'sawtooth', 0.03); } } catch (e) { /* fine */ } } else { B.since = Math.max(0, B.since - (a === K.LEAP ? 0 : 1)); B.cd = 0.4; } }
        return; }
      var at = B.atk;
      if (B.s === 'warn') {
        turn(2); if (B.st < at.warn - at.lock) { B.J.x = S.pos.x; B.J.y = S.pos.y; B.J.z = S.pos.z; }   /* the aim follows her until it locks */
        if (at === K.LEAP) { B.up += (-0.35 - B.up) * Math.min(1, dt * 3); B.pitch += (-0.15 - B.pitch) * Math.min(1, dt * 3); } else { B.up += (0.25 - B.up) * Math.min(1, dt * 4); B.pitch += (-0.35 - B.pitch) * Math.min(1, dt * 4); }   /* the leap: it sinks, coiling; the snap: it rears, jaws up */
        var gx = B.J.x - G.x, gz = B.J.z - G.z, gl = Math.hypot(gx, gz); if (gl > at.reach + 1) { B.J.x = G.x + gx / gl * (at.reach + 1); B.J.z = G.z + gz / gl * (at.reach + 1); }
        B.J.y = Math.min(B.J.y, G.base + at.up);
        var u = B.st / at.warn, lock = B.st >= at.warn - at.lock; ring.visible = true; ring.position.set(B.J.x, G.base + 0.12, B.J.z); ring.scale.setScalar(at.hitR * (1.6 - 0.6 * sm(u)));
        ring.material.opacity = lock ? (Math.sin(B.st * 40) > 0 ? 0.95 : 0.45) : 0.35 + 0.4 * u;
        if (B.st >= at.warn) { B.s = 'strike'; B.st = 0; B.from = { ox: B.ox, oz: B.oz, up: B.up }; }
        return; }
      if (B.s === 'strike') {
        var e = clamp(B.st / at.fly, 0, 1), ee = 1 - (1 - e) * (1 - e), hx = B.J.x - (Hm.x + B.from.ox), hz = B.J.z - (Hm.z + B.from.oz), hl = Math.hypot(hx, hz) || 1, go = Math.min(at.reach, Math.max(0, hl - 1.2));
        if (at === K.LEAP) { B.up = B.from.up + (B.J.y - G.base - 1.0 - B.from.up) * ee; B.pitch = -1.05 * sm(e * 2); B.ox = B.from.ox + hx / hl * Math.min(go, 2) * ee; B.oz = B.from.oz + hz / hl * Math.min(go, 2) * ee; }
        else { B.up = B.from.up + (at.rise) * Math.sin(Math.PI * e * 0.5); B.pitch = -0.5; B.ox = B.from.ox + hx / hl * go * ee; B.oz = B.from.oz + hz / hl * go * ee; }
        if (Math.hypot(B.ox, B.oz) > K.RANGE + 4) { var kk = (K.RANGE + 4) / Math.hypot(B.ox, B.oz); B.ox *= kk; B.oz *= kk; }
        ring.material.opacity = 0.9;
        if (B.st >= at.fly) { var Jn = gPos({}), jaw = { x: Jn.x + Math.sin(B.yaw) * 2.2, y: Jn.y + 0.6, z: Jn.z + Math.cos(B.yaw) * 2.2 }, miss = Math.hypot(S.pos.x - B.J.x, S.pos.y - B.J.y, S.pos.z - B.J.z), reach = Math.hypot(S.pos.x - jaw.x, S.pos.y - jaw.y, S.pos.z - jaw.z);
          A.lastStrike = { atk: at.id, miss: +miss.toFixed(2), jaw: +reach.toFixed(2), hitR: at.hitR };
          if (Math.min(miss, reach) < at.hitR && hy < at.up + 3) hurt(Jn); else A.dodges++;
          B.s = 'recover'; B.st = 0; ring.visible = false; B.warn = ''; o.hud();
          try { o.tone(220, 0, 0.12, 'triangle', 0.04); o.tone(330, 0.03, 0.2, 'sine', 0.03); } catch (x) { /* the splash */ } }
        return; }
      if (B.s === 'recover') {   /* it falls back into the water: her opening */
        var rc = at.recover; B.up += (0 - B.up) * Math.min(1, dt * (at === K.LEAP ? 2.2 : 4)); B.pitch += (0.1 - B.pitch) * Math.min(1, dt * 3); turn(0.4);
        if (B.st >= rc) { B.s = 'stalk'; B.st = 0; B.cd = K.CD; }
      }
    }
    function gatorTick(dt) {
      if (!B.m) { fix(); if (!B.m) return; }
      var m = B.m; if (!o.on()) { if (B.ph === 'fight' || B.ph === 'scene') { B.ph = 'lurk'; ring.visible = false; m.hp748 = null; } return; }
      if (B.ph === 'won') { B.wonT += dt; if (B.wonT >= K.WON_T && !A.saidWon) { A.saidWon = true; try { o.title(W.beaten[0], W.beaten[1], W.beaten[2], 'found'); } catch (x) { /* fine */ } }
        var F = window.WFR_FALL748; if (B.wonT > (F ? F.C.WHITE + F.C.GONE : 1.3) + 0.5) { B.ph = 'gone'; unfix(); A.gap = Math.max(A.gap, K.GAP); o.hud(); } return; }
      if (B.ph === 'gone') return;
      if (m.gone748) { won(); return; }
      if (B.ph === 'scene') return;
      if (B.ph === 'fight') { if (o.frozen && o.frozen()) return; fightTick(dt); return; }
      /* lurking: it lies still, its head toward her; she comes near and low */
      var Hm = home(), d0 = Math.hypot(S.pos.x - Hm.x, S.pos.z - Hm.z), G = gPos(GP), hy = S.pos.y - G.base;
      B.up += (0 - B.up) * Math.min(1, dt * 2); B.pitch += (0 - B.pitch) * Math.min(1, dt * 2); B.mv = false; B.ox *= Math.max(0, 1 - dt * 0.2); B.oz *= Math.max(0, 1 - dt * 0.2);
      if (d0 < 400) B.yaw = wrap(B.yaw + clamp(wrap(Math.atan2(S.pos.x - G.x, S.pos.z - G.z) - B.yaw), -0.3 * dt, 0.3 * dt));
      if (B.cool && d0 > K.AWAY) B.cool = false;
      if (!B.cool && d0 < K.MEET && hy < K.MEET_UP && (S.mode === 'fly' || S.mode === 'hover' || S.mode === 'walk') && !S.talking && !o.busy() && !cardUp()) meet();
    }
    function aim(P) { if (!B.m || B.ph !== 'fight' || B.m.gone748) return null; var G = gPos(GP); return Math.hypot(P.x - G.x, P.y - G.y, P.z - G.z) < 140 ? B.m : null; }   /* her swoop goes to it first (another gator in the slough never steals it) */
    function spots() { if (B.ph !== 'fight' || !B.m) return null; var Hm = home(), out = [], base = o.ground(Hm.x, Hm.z); for (var i = 0; i < 3; i++) { var a = i * 2.0944 + 0.9; out.push({ x: Hm.x + Math.cos(a) * 17, y: base + 9, z: Hm.z + Math.sin(a) * 17 }); } return out; }   /* stamina832's boss-fight fruit: three apples over the water */

    /* ---------- CYPRESS, home from the Everglades (the page stands her on the green: o.cy) ---------- */
    function cyTick(dt) {
      var r = r0(), want = !!(r && r.cy) && o.cy && o.cy.home(); if (o.cy) o.cy.show(want, dt); if (!want) return;
      var P = o.cy.pos(); if (!P) return; var d = Math.hypot(S.pos.x - P.x, S.pos.z - P.z), near = d < K.CY_TALK && Math.abs(S.pos.y - P.y) < 4;
      if (!near) { A.cyNear = false; return; } if (A.cyNear || S.talking || o.busy() || !(S.mode === 'walk' || S.mode === 'hover' || S.mode === 'fly')) return; A.cyNear = true; A.cyTalks++;
      var first = r.cy < 2; o.say(first ? W.cy : W.cyAgain, function () { if (first) { r.cy = 2; o.save(); try { o.title('THE NEXT CHAIN', ERR[ERR.length - 1].name, ERR[ERR.length - 1].ask, 'found'); } catch (x) { /* fine */ } } }, { g: o.cy.g ? o.cy.g() : null, name: 'Cypress', role: 'from the Everglades' });
    }

    /* ---------- THE SHEET (the pouch's row opens it; craft787's panel look, its own id) ---------- */
    var PANEL = null;
    function css() {
      if (document.getElementById('chain829css')) return; var s = document.createElement('style'); s.id = 'chain829css';
      s.textContent = '#chain829{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);transform:translateX(-50%);width:min(440px,calc(100vw - 24px));max-height:min(78vh,660px);box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;z-index:44;background:#fff8ea;color:#3b2a1a;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.35);padding:14px 14px 10px;font-family:var(--body,system-ui)}' +
        '#chain829 h3{margin:0;font:600 22px Georgia,serif}#chain829 .sub{margin:2px 0 8px;font:600 12px var(--body,system-ui);color:#7a5a3a}#chain829 .rows{flex:1 1 auto;min-height:0;overflow:auto}' +
        '#chain829 .row{display:flex;align-items:flex-start;gap:10px;padding:10px 4px;border-top:1px solid rgba(60,40,20,.1)}#chain829 .row .e{font-size:28px;width:38px;text-align:center}#chain829 .row .t{flex:1;min-width:0}' +
        '#chain829 .row b{display:block;font:700 15px var(--body,system-ui)}#chain829 .row i{display:block;font:italic 600 12px Georgia,serif;color:#7a5a3a}#chain829 .row small{display:block;font:600 12px/1.35 var(--body,system-ui);color:#3b2a1a;margin-top:3px}' +
        '#chain829 .row .pay{font:700 12px var(--body,system-ui);color:#3f6b4a;margin-top:3px}#chain829 .row .st{font:800 11px var(--body,system-ui);letter-spacing:.06em;text-transform:uppercase;margin-top:4px;color:#a0522d}' +
        '#chain829 .row.now{background:#fbeccb;border-radius:12px}#chain829 .row.now .st{color:#1f7a45}#chain829 .row.done{opacity:.7}#chain829 .row.done .st{color:#6b5a3a}#chain829 .row.lock .t{opacity:.62}' +
        '#chain829 .close{display:block;width:100%;margin-top:8px;min-height:44px;border-radius:14px;border:2px solid rgba(60,40,20,.2);background:#fff;font:800 14px var(--body,system-ui);color:#3b2a1a}' +
        '.c829b{margin-left:8px;min-height:34px;padding:0 12px;border-radius:12px;border:0;background:#3f6b8f;color:#fff;font:800 13px var(--body,system-ui);vertical-align:middle}';
      document.head.appendChild(s); }
    function rowsHtml() {
      var r = r0() || { at: 0, done: {}, carib: 0 }, esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
      return ERR.map(function (e, i) { var dn = !!r.done[e.id], now = i === r.at && !dn, cls = dn ? 'done' : now ? 'now' : 'lock', prog = e.id === 'carib' && now ? ' (' + r.carib + ' of ' + K.CARIB_N + ')' : '';
        return '<div class="row ' + cls + '" data-e="' + e.id + '"><div class="e">' + e.e + '</div><div class="t"><b>' + esc(e.name) + '</b><i>' + esc(e.where) + '</i><small>' + esc(e.ask) + prog + '</small>' +
          (e.pay ? '<div class="pay">' + esc(payText(e.pay)) + ' · ' + esc(e.gives) + '</div>' : '') + '<div class="st">' + (dn ? '✓ ' + W.doneW : now ? '▶ ' + W.now : esc(W.locked(ERR[i - 1] || e))) + '</div></div></div>'; }).join(''); }
    function open() { if (!on()) return false; css(); try { o.pouch(false); } catch (e) { /* fine */ } if (!PANEL) { PANEL = document.createElement('div'); PANEL.id = 'chain829'; PANEL.setAttribute('role', 'dialog'); document.body.appendChild(PANEL); }
      PANEL.innerHTML = '<h3>' + W.sheet + '</h3><div class="sub">' + W.sheetSub + '</div><div class="rows">' + rowsHtml() + '</div><button class="close" data-c829="close">' + W.close + '</button>'; PANEL.hidden = false; A.sheets++; return true; }
    function close() { if (PANEL) PANEL.hidden = true; }
    function isOpen() { return !!(PANEL && !PANEL.hidden); }
    document.addEventListener('click', function (ev) { var t = ev.target && ev.target.closest ? ev.target.closest('[data-c829]') : null; if (!t) return; ev.preventDefault(); ev.stopPropagation(); var w = t.getAttribute('data-c829'); if (w === 'open') open(); else close(); }, true);
    function pouchRow() { if (!on()) return ''; css(); var e = cur(); return '<h3>Errands<button class="c829b" data-c829="open">Errands</button></h3>' + (e ? '<div class="line">' + (e.soon ? W.soonCard : W.now + ': ' + e.name + ' · ' + e.where) + '</div>' : ''); }

    /* ---------- EACH FRAME (game time) ---------- */
    function tick(dt) {
      try {
        if (!on()) { if (ring) ring.visible = false; if (isOpen()) close(); return; }
        if (isOpen() && S.talking) close();
        chainTick(dt); gatorTick(dt); cyTick(dt);
      } catch (e) { A.err = 'tick: ' + (e && e.message || e); }
    }
    function peek() { var r = r0(), G = B.m && o.on() ? gPos({}) : null, m = B.m;
      return { err: A.err || API.error, on: on(), rec: r ? JSON.parse(JSON.stringify(r)) : null, at: r ? ERR[r.at].id : null, ph: B.ph, s: B.s, hp: B.m ? +hpOf().toFixed(2) : null, hearts: B.m ? hearts() : null, pill: pill(), warn: B.warn, ring: !!(ring && ring.visible),
        gator: G ? [+G.x.toFixed(1), +G.y.toFixed(1), +G.z.toFixed(1)] : null, base: G ? +G.base.toFixed(2) : null, drawnAt: m && m.pf >= 0 ? [+m.wx.toFixed(1), +m.wy.toFixed(1), +m.wz.toFixed(1)] : null, gone748: !!(m && m.gone748), fixed: !!m,
        stat: { opened: A.opened || 0, cards: A.cards, sheets: A.sheets, scenes: A.scenes, fights: A.fights, warns: A.warns, hurts: A.hurts, dodges: A.dodges, spared: A.spared, fled: A.fled, wins: A.wins, cyTalks: A.cyTalks, last: A.last, lastStrike: A.lastStrike || null, built: A.built },
        sheet: isOpen() ? PANEL.textContent : '', gap: +A.gap.toFixed(2) }; }
    var bench = {
      calm: function (v) { K.CD = v ? 1e9 : 1.2; return K.CD; },   /* the guard's: no strikes (a fight it only wants to win) */
      force: function (id) { K.HEAVY_P = id === 'leap' ? 1 : id === 'snap' ? 0 : 0.35; B.since = id === 'leap' ? 2 : 0; return K.HEAVY_P; },
      hp: function (v) { if (B.m) B.m.hp748 = v; return hpOf(); }, check: function () { A.checkT = 0; A.gap = 0; }, gap: function () { A.gap = 0; A.checkT = 0; }, open: open, close: close, home: function () { return home(); }, GATOR: GATOR, K: K };
    return { tick: tick, fell: fell, aim: aim, spots: spots, pill: pill, fighting: function () { return B.ph === 'fight' || B.ph === 'scene'; }, pouch: pouchRow, open: open, close: close, isOpen: isOpen, peek: peek, bench: bench,
      ncName: function () { return null; } };
  }
  API.create = function (o) { if (!o || (o.classic && o.classic())) { API.error = 'classic'; return null; } try { return create(o); } catch (e) { API.error = String(e && e.message || e); return null; } };
  API.ERR = ERR; API.W = W; API.K = K; API.GATOR = GATOR; API.CARIB = CARIB; API.rec = rec; API.met = met; API.caribOf = caribOf; API.HEARTS = HEARTS;
  return API;
}());
