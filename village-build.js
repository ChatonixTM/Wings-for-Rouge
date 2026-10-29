/* village-build.js - BOARD 641 §G + 646 U1, THE FIRST MOVE-IN HOUSE (Oct 15 2026). The RULES only: no THREE, no scene, no DOM, so
   node can prove them without a browser (tests/house641.js --unit). The game file builds the stakes, the stages and the newcomer
   from these answers (tools/wiring/wire-641-house.js).
   Marth, Oct 14 ~03:50 (646): "we should have construction. Of houses, how it takes the proper materials - The cutting down of trees,
   clearing space. And those 20 people perhaps, once you get to 28 villagers there's an achievement ( village complete)."
   Marth, Oct 14 ~00:05 (641 §G): "But remember keep the Minecraft / clash of clans / Lego Fortnite rule that u need a lot of certain
   resources or certain things to build certain items."
   Rouge (row 641): "I keep bringing things to the villagers.. idrk what it does".
   THE COUNTS ARE DRAFT. Itachi drafted logs 20, stones 12, planks 6, nails 10. Planks are DROPPED: only 4 planks exist in the whole
   game (the nest's one-shot leftovers, S.mats.plank) and the jetty (GROWTH[4]) spends those 4, so a 6-plank house could never finish.
   What she can gather again and again is nails, logs and stones (STUFF: 3 nodes each, back in 60 s, 1 or 2 a pick).
   The stages are CUMULATIVE: everything she delivers counts toward the whole house; a stage stands once the delivered totals reach
   its row. Saved as S.village = { plot1: { got: { stone, log, nail }, stage }, moved } (additive; no key renamed). */
window.WFR_VILLAGE = (function () {
  'use strict';
  var CAP = 28;   /* Marth 646: "once you get to 28 villagers there's an achievement ( village complete)" */
  var STAGES = [
    { id: 'stakes', name: 'the stakes', need: {} },
    { id: 'cleared', name: 'the plot cleared', need: { stone: 8 } },   /* DRAFT: two trees cut down, a stone footing */
    { id: 'frame', name: 'the frame', need: { stone: 8, log: 12, nail: 6 } },   /* DRAFT */
    { id: 'roof', name: 'the roof', need: { stone: 12, log: 20, nail: 10 } },   /* DRAFT: the whole house; then someone moves in */
  ];
  var TOTAL = STAGES[STAGES.length - 1].need, LAST = STAGES.length - 1;
  function fresh() { return { plot1: { got: {}, stage: 0 }, moved: 0 }; }
  function stageOf(got) {
    got = got || {}; var s = 0;
    for (var i = 1; i <= LAST; i++) { var nd = STAGES[i].need, ok = true; for (var k in nd) if ((got[k] || 0) < nd[k]) ok = false; if (!ok) break; s = i; }
    return s;
  }
  function next(got) { var s = stageOf(got); return s >= LAST ? null : STAGES[s + 1]; }
  /* a load: whatever was saved (or nothing: an old save) comes back clean; counts clamped to the house, the stage derived from them,
     anything this file does not know (a later plot2) kept as it was */
  function clean(v) {
    var o = fresh(); if (!v || typeof v !== 'object') return o;
    for (var key in v) if (key !== 'plot1' && key !== 'moved') o[key] = v[key];
    var p = v.plot1 && typeof v.plot1 === 'object' ? v.plot1 : {}, g = p.got && typeof p.got === 'object' ? p.got : {};
    for (var k in TOTAL) { var n = Math.floor(+g[k] || 0); if (n > 0) o.plot1.got[k] = Math.min(TOTAL[k], n); }
    o.plot1.stage = stageOf(o.plot1.got);
    o.moved = Math.max(0, Math.floor(+v.moved || 0));
    if (o.plot1.stage >= LAST && o.moved < 1) o.moved = 1;
    return o;
  }
  /* a delivery: from her pouch (inv) the house takes what it still wants of each kind, never more than she has */
  function take(got, inv) {
    got = got || {}; inv = inv || {}; var give = {}, n = 0;
    for (var k in TOTAL) { var want = Math.max(0, TOTAL[k] - (got[k] || 0)), has = Math.max(0, Math.floor(inv[k] || 0)), g = Math.min(want, has); if (g > 0) { give[k] = g; n += g; } }
    return { give: give, n: n };
  }
  /* the plot: of the candidate places that passed the game's own tests (ok), the one whose two nearest standing trees are nearest
     (they are the ones cut down: "clearing space"). Trees marked skip (a fruit tree) are never cut. Ties keep the earlier place. */
  function pickPlot(cands, trees) {
    var best = null;
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i]; if (!c.ok) continue;
      var d1 = Infinity, d2 = Infinity, i1 = -1, i2 = -1;
      for (var j = 0; j < trees.length; j++) {
        var t = trees[j]; if (t.skip) continue;
        var d = Math.hypot(t.x - c.x, t.z - c.z);
        if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = j; } else if (d < d2) { d2 = d; i2 = j; }
      }
      if (i2 < 0) continue;
      var score = d1 + d2;
      if (!best || score < best.score) best = { i: i, cand: c, trees: [i1, i2], d: [d1, d2], score: score };
    }
    return best;
  }
  function villagers(base, moved) { var n = (base | 0) + Math.max(0, moved | 0); return { n: n, cap: CAP, text: 'Villagers ' + n + ' / ' + CAP }; }
  /* 707 THE PILE AT THE FENCE (Marth, Oct 23: "we should also make so when youre gathering tools for the new houses you can drop the tools in
     your inventory at the fence where the house waits to be built"). A drop is take() above: the house's own clamps, never more than she has.
     What lies at the fence is what she delivered that the standing stage has not used yet (the stages are cumulative: a stage stands on its
     row, the rest waits in the pile). At the roof everything is used: the pile is gone. */
  function pile(got) {
    got = got || {}; var used = STAGES[stageOf(got)].need, o = {};
    for (var k in TOTAL) { var n = Math.min(TOTAL[k], Math.max(0, Math.floor(+got[k] || 0))); o[k] = Math.max(0, n - (used[k] || 0)); }
    return o;
  }
  /* 704 PIECE 2, VILLAGERS WHO LIVE (Marth, Oct 23: "some of these villagers need to have 'random' or 'smart' pathways, where they are
     continually learning things to build and places to go and things to do and interact with the world"). Each finished house opens the
     next JOB and its PLACE (the house's newcomer brings the trade); a villager who has WATCHED a job long enough takes it up. ALL DRAFT. */
  var JOBS = [
    { id: 'fisher', name: 'fisher', place: 'the shore', icon: '🎣', pose: 'pull' },
    { id: 'gardener', name: 'gardener', place: 'the garden', icon: '🥕', pose: 'kneel' },
    { id: 'builder', name: 'builder', place: 'the next plot', icon: '🔨', pose: 'hammer' },
    { id: 'lookout', name: 'lookout', place: 'the hill', icon: '🔭', pose: 'look' },
    { id: 'weaver', name: 'weaver', place: 'the loom', icon: '🧶', pose: 'paint' },
    { id: 'baker', name: 'baker', place: 'the oven', icon: '🍞', pose: 'shop' },
    { id: 'woodcutter', name: 'woodcutter', place: 'the woodpile', icon: '🪓', pose: 'hammer' },
    { id: 'herbalist', name: 'herbalist', place: 'the meadow', icon: '🌿', pose: 'kneel' }
  ];
  var LEARN = { need: 240, near: 7, cap: 3 };   /* clock units watched (240: about 53 s of play at the day's pace), within 7 m of the worker at work, at most 3 to a job */
  function jobById(id) { for (var i = 0; i < JOBS.length; i++) if (JOBS[i].id === id) return JOBS[i]; return null; }
  function jobsOpen(sealed) { return JOBS.slice(0, Math.max(0, Math.min(JOBS.length, Math.floor(+sealed || 0)))); }
  function jobOfHouse(n) { n = Math.floor(+n || 0); return n >= 1 && n <= JOBS.length ? JOBS[n - 1] : null; }
  /* the day (the game's clock: dawn 0-150, day to 1800, dusk to 2100, night to 2700; the village goes in at 2040): what a villager's day
     asks of them now. They set out for the evening's gathering at 1650, so the square is full by dusk. Rain and night send everyone home. */
  function routine(clock, wet) {
    clock = +clock || 0;
    if (wet || clock >= 2040) return 'home';
    if (clock >= 1650) return 'gather';
    if (clock < 300) return 'morning';
    if (clock < 1300) return 'work';
    return 'free';
  }
  /* watching: rec = { job, t } (t in clock units). Watching another job starts again from nothing; the watch never runs past the need. */
  function watch(rec, jobId, dClock) {
    if (!jobById(jobId)) return { rec: rec || null, learned: false };
    if (!rec || rec.job !== jobId) rec = { job: jobId, t: 0 };
    rec.t = Math.min(LEARN.need, (+rec.t || 0) + Math.max(0, +dClock || 0));
    return { rec: rec, learned: rec.t >= LEARN.need };
  }
  /* LEARNING GOES ON (Marth: "continually learning things to build and places to go and things to do"): a villager may come to hold up to
     CRAFT.maxTrades trades over the days (their house's own first, then each one watched long enough), and the trades teach them THINGS TO
     BUILD round the village: small real objects, a few a day, never more than CRAFT.cap in all. ALL DRAFT. */
  var CRAFTS = [
    { id: 'bench', name: 'a bench', trades: ['builder', 'woodcutter'], r: 1.1 },
    { id: 'flowers', name: 'a flower bed', trades: ['gardener', 'herbalist'], r: 1.1 },
    { id: 'lantern', name: 'a lantern', trades: ['builder', 'lookout', 'fisher'], r: 0.6 },
    { id: 'planter', name: 'a planter', trades: ['gardener', 'fisher', 'herbalist'], r: 0.7 },
    { id: 'awning', name: 'a market awning', trades: ['weaver', 'baker'], r: 1.5 },
    { id: 'well', name: 'a little well', trades: ['builder', 'woodcutter'], r: 1.1 },
    { id: 'birdbath', name: 'a bird bath', trades: ['gardener', 'lookout'], r: 0.8 }
  ];
  var CRAFT = { cap: 24, perDay: 2, maxTrades: 3 };
  function craftById(id) { for (var i = 0; i < CRAFTS.length; i++) if (CRAFTS[i].id === id) return CRAFTS[i]; return null; }
  /* what a villager with these trades builds next: of the things their trades teach, the one the village has least of (ties: the list's
     order); none at the cap, none once today's share is built */
  function craftFor(trades, made, day) {
    made = made || []; trades = trades || []; if (made.length >= CRAFT.cap) return null;
    var today = 0; for (var i = 0; i < made.length; i++) if (made[i].day === day) today++; if (today >= CRAFT.perDay) return null;
    var best = null, bn = 1e9;
    for (var c = 0; c < CRAFTS.length; c++) { var C = CRAFTS[c], ok = false; for (var t = 0; t < C.trades.length; t++) if (trades.indexOf(C.trades[t]) >= 0) ok = true; if (!ok) continue;
      var n = 0; for (var m = 0; m < made.length; m++) if (made[m].k === C.id) n++; if (n < bn) { bn = n; best = C; } }
    return best;
  }
  function mayLearn(trades, jobId) { trades = trades || []; return !!jobById(jobId) && trades.indexOf(jobId) < 0 && trades.length < CRAFT.maxTrades; }
  /* a load: S.village.live704 = { jobs: { who: jobId } (the first trade learned: kept for older saves), trades: { who: [jobId] } (every trade
     learned), watch: { who: { job, t } }, builds: [{ k, x, z, rot, by, day }] }; unknown trades and crafts dropped, times clamped, the
     trades per villager and the builds capped */
  function cleanLive(v) {
    var o = { jobs: {}, watch: {}, trades: {}, builds: [] }; if (!v || typeof v !== 'object') return o;
    var j = v.jobs && typeof v.jobs === 'object' ? v.jobs : {}, w = v.watch && typeof v.watch === 'object' ? v.watch : {}, tr = v.trades && typeof v.trades === 'object' ? v.trades : {};
    for (var a in j) if (jobById(j[a])) o.jobs[a] = j[a];
    for (var b in w) { var r = w[b]; if (r && typeof r === 'object' && jobById(r.job)) o.watch[b] = { job: r.job, t: Math.max(0, Math.min(LEARN.need, +r.t || 0)) }; }
    var add = function (who, id) { var L = o.trades[who] || (o.trades[who] = []); if (jobById(id) && L.indexOf(id) < 0 && L.length < CRAFT.maxTrades) L.push(id); };
    for (var c in tr) if (Object.prototype.toString.call(tr[c]) === '[object Array]') for (var q = 0; q < tr[c].length; q++) add(c, tr[c][q]);
    for (var d in o.jobs) add(d, o.jobs[d]);
    for (var e in o.trades) if (!o.trades[e].length) delete o.trades[e];
    var bl = Object.prototype.toString.call(v.builds) === '[object Array]' ? v.builds : [];
    for (var f = 0; f < bl.length && o.builds.length < CRAFT.cap; f++) { var B = bl[f]; if (!B || !craftById(B.k) || !isFinite(+B.x) || !isFinite(+B.z)) continue; o.builds.push({ k: B.k, x: +B.x, z: +B.z, rot: isFinite(+B.rot) ? +B.rot : 0, by: String(B.by || ''), day: Math.floor(+B.day || 0) }); }
    for (var key in v) if (key !== 'jobs' && key !== 'watch' && key !== 'trades' && key !== 'builds') o[key] = v[key];
    return o;
  }
  return { CAP: CAP, STAGES: STAGES, TOTAL: TOTAL, LAST: LAST, fresh: fresh, stageOf: stageOf, next: next, clean: clean, take: take, pickPlot: pickPlot, villagers: villagers,
    pile: pile, JOBS: JOBS, LEARN: LEARN, jobById: jobById, jobsOpen: jobsOpen, jobOfHouse: jobOfHouse, routine: routine, watch: watch, cleanLive: cleanLive,
    CRAFTS: CRAFTS, CRAFT: CRAFT, craftById: craftById, craftFor: craftFor, mayLearn: mayLearn };
})();
if (typeof module === 'object' && module.exports) module.exports = window.WFR_VILLAGE;
