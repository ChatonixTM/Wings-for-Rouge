/* strike819.js - BOARD 819, LIGHTNING CAN STRIKE HER IN THE RAIN (Wings for Rouge). Nov 14 2026. Pure rules: no THREE, no DOM. Guard: tests/bread818.js (L rows).
   Marth, Nov 14 2026, verbatim: "And when it's raining , make it a 1/15 chance of the lightning strike to hit you when you're flying mid height - removes a heart and a half".
   HOW: weather.js asks the page at each real storm bolt (the bolts it already throws on thunder days); the page builds her state and asks decide().
   On a hit the bolt is laid from the cloud down to HER, the white flash is stronger, the thunder comes at once (no delay when it is her), a small
   knock (a lurch, a dip, a twist), and hurt() takes 3 half hearts.
   MID HEIGHT (DRAFT numbers, his thumb), from the game's own heights:
     LOW 40 m above the ground under her: over the tallest things she can fly past (the island's trees and its lighthouse top out near 20-25 m over
       their ground, rainforest canopy 30-40 m), so "above the treetops and roofs".
     HIGH at home: 166 m, the island's own cloud ceiling (CEILING, the soft wet layer above it); out in the world: 200 m above the ground, the floor
       of world-sky756.js's lowest cloud band (200-340 m). At or above it she is "very high": never hit.
   NEVER: on the ground or swimming, perched (a perch or a ride's roof), indoors, in a cutscene or a held card, very high, in a dry sky, in Classic.
   HEARTS: kept in half hearts here. The game saves whole hearts (S.hearts.now, unchanged); the one missing half is a NEW key, S.seen.half819 = 1,
   so an old save means what it always meant. A strike never takes her last half heart (DRAFT: the safest default, his to change).
   THE ROLL: rnd() < 1/15, from a seeded generator the bench can reseed or force (hit / miss), so the guard can make a hit and a miss. */
window.WFR_STRIKE819 = (function () {
  'use strict';
  var C = { P: 1 / 15, LOW: 40, HIGH_HOME: 166, HIGH_WORLD: 200, LOSS: 3, KEEP: 1 };   /* LOSS and KEEP in half hearts */
  function mulberry(a) { a = a | 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var rnd = mulberry((Date.now() ^ 0x5819) | 0), force = null, plant = null;
  var st = { asks: 0, rolls: 0, hits: 0, misses: 0, refused: {}, last: null };
  function band(o) {   /* 'low' | 'mid' | 'high' (o: { agl, y, home }) */
    if (plant === 'band') return 'mid';
    if (!(o.agl >= C.LOW)) return 'low';
    if (o.home ? o.y >= C.HIGH_HOME : o.agl >= C.HIGH_WORLD) return 'high';
    return 'mid';
  }
  function why(o) {   /* null when a bolt may find her; else the reason it never can */
    if (!o || o.classic) return 'classic';
    if (!o.wet) return 'dry';
    if (o.inside) return 'indoors';
    if (o.perched) return 'perched';
    if (o.mode !== 'fly' && o.mode !== 'hover') return o.mode === 'walk' || o.mode === 'landing' ? 'ground' : String(o.mode || 'none');
    if (o.busy) return 'busy';
    var b = band(o); return b === 'mid' ? null : b;
  }
  function roll() { if (force === 'hit') return true; if (force === 'miss') return false; return rnd() < C.P; }
  function decide(o) {   /* one bolt: true if it is hers */
    st.asks++; var w = why(o);
    if (w) { st.refused[w] = (st.refused[w] || 0) + 1; st.last = { why: w, band: o ? band(o) : null, agl: o && isFinite(o.agl) ? +o.agl.toFixed(1) : null }; return false; }
    st.rolls++; var h = roll(); if (h) st.hits++; else st.misses++; st.last = { why: h ? 'hit' : 'miss', band: 'mid', agl: +o.agl.toFixed(1) }; return h;
  }
  /* hearts in halves: 2 x now, less the missing half */
  function halves(S) { var h = S && S.hearts; if (!h || !(h.max > 0)) return null; var n = Math.max(0, Math.floor(+h.now || 0)); return 2 * n - (n > 0 && S.seen && S.seen.half819 ? 1 : 0); }
  function setHalves(S, v) { var h = S && S.hearts; if (!h || !(h.max > 0)) return null; v = Math.max(0, Math.min(2 * h.max, Math.round(v))); h.now = Math.ceil(v / 2); S.seen = S.seen || {};
    if (h.now * 2 - v) S.seen.half819 = 1; else if (S.seen.half819 != null) delete S.seen.half819; return v; }
  function hurt(S) { var e = halves(S); if (e == null) return null; var to = e <= C.KEEP ? e : Math.max(C.KEEP, e - C.LOSS); setHalves(S, to); return { from: e, to: to }; }
  function heal(S, n) { var e = halves(S); if (e == null) return 'nohearts'; if (e >= 2 * S.hearts.max) return 'whole'; setHalves(S, e + (n || 1)); return true; }
  function seed(s) { rnd = mulberry(s | 0); }
  function rate(s, n, o) {   /* the bench: n bolts at mid height through decide() itself, on a seeded roll; how many were hers */
    var keep = rnd, f = force, k = 0, s0 = JSON.parse(JSON.stringify(st)); seed(s); force = null;
    for (var i = 0; i < n; i++) if (decide(o || { wet: true, mode: 'fly', agl: 80, y: 80, home: true })) k++;
    rnd = keep; force = f; st = s0; return k;
  }
  function peek() { return { C: C, force: force, plant: plant, asks: st.asks, rolls: st.rolls, hits: st.hits, misses: st.misses, refused: Object.assign({}, st.refused), last: st.last }; }
  function bench(o) { o = o || {}; if ('force' in o) force = o.force || null; if ('plant' in o) plant = o.plant || null; if (o.seed != null) seed(o.seed); if (o.rate) return rate(o.rate.seed, o.rate.n, o.rate.o); return peek(); }
  return { C: C, band: band, why: why, decide: decide, halves: halves, setHalves: setHalves, hurt: hurt, heal: heal, seed: seed, rate: rate, peek: peek, bench: bench };
}());
