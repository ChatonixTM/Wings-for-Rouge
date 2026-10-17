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
  return { CAP: CAP, STAGES: STAGES, TOTAL: TOTAL, LAST: LAST, fresh: fresh, stageOf: stageOf, next: next, clean: clean, take: take, pickPlot: pickPlot, villagers: villagers };
})();
if (typeof module === 'object' && module.exports) module.exports = window.WFR_VILLAGE;
