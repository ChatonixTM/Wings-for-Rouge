/* ═══════════════════════════════════════════════════════════════════════════
   WFR_RHYTHM — "Keep it warm" as a song (board 562). Pure: no DOM, no THREE.

   Marth, Oct 9: "We should also include a different way to keep warm. Make it so it's like a guitar hero / tap tap
   revenge / ocarina of time / wind waker . Inputs for a song. (The bird of your choice will wiggle over the egg and
   flutter its wings in a dance formation an flutter off when done)"

   Itachi BRIEF_562_566: the notes are the game's OWN song - "The Island Wakes", section A (bars 9-24), melody only, the
   two half-beat pickups left out: 35 notes, never closer than one beat (455 ms at quarter = 132), one at a time. Three
   lanes; within each 4-bar phrase the pitches are ranked low to high and split in thirds (low left, middle centre, high
   right), so ear and eye agree and a pitch keeps its lane. Windows: Perfect +-100 ms, Good +-200 ms (design numbers - her
   thumb tunes them). A miss is a soft gap: it resets the streak and nothing else. The egg always hatches.

   API
     WFR_RHYTHM.chart(melody, opts)   melody = [{ b, m, d }] in beats from bar 1 (WFR_MUSIC.melody(9, 24));
                                      opts.startBar (default 7) -> notes [{ i, t, b, lane, m, d }], t in seconds from startBar
     WFR_RHYTHM.judge(dt)             -> 'perfect' | 'good' | null    (dt = tap time - note time, seconds)
     WFR_RHYTHM.round(notes)          -> a fresh round state
     WFR_RHYTHM.tap(st, lane, t)      -> { note, grade } or null   (the nearest unjudged note in THAT lane, in the window)
     WFR_RHYTHM.tick(st, t)           marks notes now past their window as missed; returns the newly missed
     WFR_RHYTHM.stars(st)             1..3 (90%+ of notes hit = 3, 60%+ = 2, else 1; never zero)
     WFR_RHYTHM.SPB, WINDOWS, BPM
   ═══════════════════════════════════════════════════════════════════════════ */
window.WFR_RHYTHM = (function () {
  'use strict';
  var BPM = 132, SPB = 60 / BPM, BEATS = 3;
  var WINDOWS = { perfect: 0.1, good: 0.2 };

  function chart(melody, opts) {
    opts = opts || {};
    var startBar = opts.startBar || 7, t0 = (startBar - 1) * BEATS;
    var notes = melody.filter(function (e) { return e.d >= 1; })   /* the half-beat pickups are left to the song */
      .map(function (e) { return { b: e.b, m: e.m, d: e.d, t: (e.b - t0) * SPB }; });
    /* lanes: per 4-bar phrase, the distinct pitches ranked and split in thirds */
    var phrase = function (b) { return Math.floor(b / (4 * BEATS)); }, groups = {};
    notes.forEach(function (n) { (groups[phrase(n.b)] = groups[phrase(n.b)] || []).push(n); });
    Object.keys(groups).forEach(function (k) {
      var ps = groups[k].map(function (n) { return n.m; }).filter(function (m, i, a) { return a.indexOf(m) === i; }).sort(function (a, b) { return a - b; });
      groups[k].forEach(function (n) { n.lane = Math.min(2, Math.floor(ps.indexOf(n.m) * 3 / ps.length)); });
    });
    notes.sort(function (a, b) { return a.t - b.t; });
    return notes.map(function (n, i) { return { i: i, t: n.t, b: n.b, lane: n.lane, m: n.m, d: n.d }; });   /* b: the beat, so the song can leave exactly these to her */
  }
  function judge(dt) { var a = Math.abs(dt); return a <= WINDOWS.perfect ? 'perfect' : a <= WINDOWS.good ? 'good' : null; }
  function round(notes) { return { notes: notes, state: notes.map(function () { return null; }), score: 0, streak: 0, best: 0, mult: 1, hits: 0, perfects: 0, misses: 0 }; }
  function multOf(streak) { return streak >= 24 ? 4 : streak >= 16 ? 3 : streak >= 8 ? 2 : 1; }
  function tap(st, lane, t) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < st.notes.length; i++) {
      if (st.state[i] || st.notes[i].lane !== lane) continue;
      var d = Math.abs(t - st.notes[i].t); if (d <= WINDOWS.good && d < bd) { bd = d; best = i; }
    }
    if (best < 0) return null;   /* nothing in reach in this lane: the tap does nothing at all */
    var g = judge(t - st.notes[best].t); st.state[best] = g;
    st.streak++; st.best = Math.max(st.best, st.streak); st.mult = multOf(st.streak); st.hits++; if (g === 'perfect') st.perfects++;
    st.score += (g === 'perfect' ? 100 : 50) * st.mult;
    return { note: st.notes[best], grade: g };
  }
  function tick(st, t) {
    var out = [];
    for (var i = 0; i < st.notes.length; i++) if (!st.state[i] && t - st.notes[i].t > WINDOWS.good) { st.state[i] = 'miss'; st.misses++; st.streak = 0; st.mult = 1; out.push(st.notes[i]); }
    return out;
  }
  function stars(st) { var f = st.notes.length ? st.hits / st.notes.length : 0; return f >= 0.9 ? 3 : f >= 0.6 ? 2 : 1; }
  return { chart: chart, judge: judge, round: round, tap: tap, tick: tick, stars: stars, SPB: SPB, BPM: BPM, WINDOWS: WINDOWS };
})();
