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
                                      658: opts.bpm (132), opts.beats (3), opts.rule ('pick' = 623's rows | 'beat' = by beat)
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
  /* 623: the rows. easy = today's row exactly; hard keeps the half-beat pickups and tightens the windows; expert tightens them again and
     the notes fall faster. pay scales the song's gift (Marth: "Of course it's more xp"). */
  var ROWS = { easy: { id: 'easy', name: 'Normal', pick: 1, win: { perfect: 0.1, good: 0.2 }, fall: 2.0, pay: 1 },
               hard: { id: 'hard', name: 'Hard', pick: 0.5, win: { perfect: 0.08, good: 0.16 }, fall: 1.6, pay: 1.5 },
               expert: { id: 'expert', name: 'Expert', pick: 0.5, win: { perfect: 0.06, good: 0.12 }, fall: 1.25, pay: 2 } };
  function rowOf(r) { return (r && ROWS[r.id || r]) || ROWS.easy; }
  ROWS.expert.fall = 1.0;   /* 689: Expert's notes fall in 1.0 s, was 1.25 (Marth, Oct 22: "the notes faster"); the windows stay 623's: the difficulty comes from density */

  /* 658: density by beat, for a NEW song (The Island Wakes keeps 623's rows): Easy = each bar's downbeat; Hard = the downbeat and the
     bar's last beat (beat 4 in 4/4); Expert = every note. Nested by construction (BRIEF_620_658 §2). */
  function onBeat(b, beats, row) { var p = b - Math.floor(b / beats) * beats; return row === 'expert' || p < 1e-6 || (row === 'hard' && Math.abs(p - (beats - 1)) < 1e-6); }
  function chart(melody, opts) {
    opts = opts || {};
    if (opts.bass && opts.bass.length && rowOf(opts.row).id === 'expert') return expertChart(melody, opts);   /* 689: the real Expert (without the bass, chart() is 623/658's, byte for byte) */
    if (opts.orn && opts.orn.length && rowOf(opts.row).id === 'expert') melody = melody.concat(opts.orn).sort(function (a, b) { return a.b - b.b; });   /* 658 U6: Expert's slightly more notes */
    var beats = opts.beats || BEATS, SPB = 60 / (opts.bpm || BPM), rule = opts.rule || 'pick';   /* 658: THIS song's bar and beat length (the defaults are The Island Wakes', byte for byte) */
    var startBar = opts.startBar || 7, t0 = (startBar - 1) * beats, row = rowOf(opts.row);
    var notes = melody.filter(rule === 'tier' ? function (e) { return (e.tier || 1) <= TIER[row.id]; } : rule === 'beat' ? function (e) { return onBeat(e.b, beats, row.id); } : function (e) { return e.d >= row.pick; })   /* easy leaves the half-beat pickups to the song; hard and expert keep them (623); 658: a new song charts by beat */
      .map(function (e) { return { b: e.b, m: e.m, d: e.d, t: (e.b - t0) * SPB }; });
    /* lanes: per 4-bar phrase, the distinct pitches ranked and split in thirds */
    var phrase = function (b) { return Math.floor(b / (4 * beats)); }, groups = {};   /* 658: four of THIS song's bars */
    notes.forEach(function (n) { (groups[phrase(n.b)] = groups[phrase(n.b)] || []).push(n); });
    Object.keys(groups).forEach(function (k) {
      var ps = groups[k].map(function (n) { return n.m; }).filter(function (m, i, a) { return a.indexOf(m) === i; }).sort(function (a, b) { return a - b; });
      groups[k].forEach(function (n) { n.lane = Math.min(2, Math.floor(ps.indexOf(n.m) * 3 / ps.length)); });
    });
    if (opts.holds && row.id === 'expert') opts.holds.forEach(function (h) { notes.push({ b: h.b, m: h.m, d: h.d, t: (h.b - t0) * SPB, lane: 3, hold: Math.max(0.25, h.d * SPB) }); });   /* 658 U3: Expert's 4th lane */
    notes.sort(function (a, b) { return a.t - b.t; });
    return notes.map(function (n, i) { var o = { i: i, t: n.t, b: n.b, lane: n.lane, m: n.m, d: n.d }; if (n.hold) o.hold = n.hold; return o; });   /* b: the beat, so the song can leave exactly these to her */
  }
  /* 689 THE REAL EXPERT (Marth, Oct 22: "the expert mode doesn't even seem to have the background notes ... It needs to feel harder, the
     notes faster"; Rouge: the purple hold was "like some sort of guitar where you hold it down"). A part for TWO thumbs, from the song's own score:
       lanes 1-3  the whole melody, its pitches ranked per 4-bar phrase in thirds (623's rule, so a pitch keeps its lane)
       lane 4     the song's own BASS (opts.bass = [{ b, m }] from music.js), tapped at its exact pitch: every bar's downbeat (a chord with the
                  melody), and under each held note its beats and the last eighth before the next melody note
       holds      the melody's own long notes (2+ beats) are held in their lane and let go half a beat early (no more two-bar pedal)
       thumbs     every chord and every bass tap under a hold is split: the melody note in lanes 1-2 (left thumb), the bass in lanes 3-4
                  (right thumb). A bass tap closer than 2 x Good behind the last one in lane 4 steps to lane 3; if neither has room it is left
                  to the song. So no thumb ever presses two lanes at once, and two notes in one lane are always 2 x Good apart.
     Each note: { i, t, b, lane, m, d } (+ hold seconds, + dr the bass under a hold for its pad, + bass: true). OURS/DRAFT: her thumb tunes it. */
  function expertChart(melody, opts) {
    var beats = opts.beats || BEATS, spb = 60 / (opts.bpm || BPM), t0 = ((opts.startBar || 7) - 1) * beats, EPS = 1e-6, gap = 2 * ROWS.expert.win.good;
    var bassAt = function (b) { for (var k = 0; k < opts.bass.length; k++) if (Math.abs(opts.bass[k].b - b) < EPS) return opts.bass[k]; return null; };
    var notes = melody.map(function (e) { return { b: e.b, m: e.m, d: e.d, t: (e.b - t0) * spb }; });
    var phrase = function (b) { return Math.floor(b / (4 * beats)); }, groups = {};
    notes.forEach(function (n) { (groups[phrase(n.b)] = groups[phrase(n.b)] || []).push(n); });
    Object.keys(groups).forEach(function (k) {
      var ps = groups[k].map(function (n) { return n.m; }).filter(function (m, i, a) { return a.indexOf(m) === i; }).sort(function (a, b) { return a - b; });
      groups[k].forEach(function (n) { n.lane = Math.min(2, Math.floor(ps.indexOf(n.m) * 3 / ps.length)); });
    });
    var want = [];
    notes.forEach(function (n) {
      if (n.b - Math.floor(n.b / beats + EPS) * beats < EPS) want.push(n.b);   /* the bar's downbeat: melody and bass together */
      if (n.d >= 2) { n.hold = (n.d - 0.5) * spb; var hb = bassAt(n.b); if (hb) n.dr = hb.m;
        for (var k = 1; k < n.d - 0.5 - EPS; k++) want.push(n.b + k);   /* under the held note: its beats */
        want.push(n.b + n.d - 0.5); }   /* and the last eighth before the next melody note */
    });
    var chordAt = {}; want.forEach(function (b) { if (bassAt(b)) chordAt[b.toFixed(3)] = true; });
    notes.forEach(function (n) { if (n.hold || chordAt[n.b.toFixed(3)]) n.lane = Math.min(n.lane, 1); });   /* the thumb rule: held, or with the bass = the LEFT thumb's */
    var bass = [], seen = {};
    want.sort(function (a, b) { return a - b; }).forEach(function (b) { var e = bassAt(b); if (!e || seen[e.b.toFixed(3)]) return; seen[e.b.toFixed(3)] = true;
      var t = (e.b - t0) * spb, room = function (ln) { return !notes.concat(bass).some(function (o) { return o.lane === ln && Math.abs(o.t - t) < gap - EPS; }); };
      var ln = room(3) ? 3 : room(2) ? 2 : -1; if (ln >= 0) bass.push({ b: e.b, m: e.m, d: 0.5, t: t, lane: ln, bass: true }); });
    notes = notes.concat(bass).sort(function (a, b) { return a.t - b.t || a.lane - b.lane; });
    return notes.map(function (n, i) { var o = { i: i, t: n.t, b: n.b, lane: n.lane, m: n.m, d: n.d }; if (n.hold) o.hold = n.hold; if (n.dr != null) o.dr = n.dr; if (n.bass) o.bass = true; return o; });
  }
  function judge(dt, win) { win = win || WINDOWS; var a = Math.abs(dt); return a <= win.perfect ? 'perfect' : a <= win.good ? 'good' : null; }
  function round(notes, row) { var r = rowOf(row); return { notes: notes, state: notes.map(function () { return null; }), score: 0, streak: 0, best: 0, mult: 1, hits: 0, perfects: 0, misses: 0, row: r.id, win: r.win }; }   /* 623: the round carries its own windows; tap and tick read them, never the constant */
  /* 623: the rank, Sonic Riders style. WFR = every note perfect; SS = every note hit, 9 in 10 perfect; S = 95% hit; A = 85%; B = 70%; C = the rest. */
  function rank(st) { var n = st.notes.length || 1, h = st.hits / n, p = st.perfects / n;
    return st.perfects === st.notes.length && n > 1 ? 'WFR' : (h >= 1 && p >= 0.9) ? 'SS' : h >= 0.95 ? 'S' : h >= 0.85 ? 'A' : h >= 0.7 ? 'B' : 'C'; }
  /* 658 U3: Expert's held notes. Held to its end = 'held': one hit (a perfect if its head was), +50 x the multiplier. Let go earlier than the end
     minus Good = 'drop': the streak resets, the head's points stay, not a hit. TIER: Normal plays a score's tier-1 notes, Hard 1-2, Expert all. */
  var TIER = { easy: 1, hard: 2, expert: 3 };
  function holdEnd(st, j, ok) { if (ok) { st.state[j] = 'held'; st.hits++; if (st.hg && st.hg[j] === 'perfect') st.perfects++; st.score += 50 * st.mult; } else { st.state[j] = 'drop'; st.drops = (st.drops || 0) + 1; st.streak = 0; st.mult = 1; } }
  function release(st, lane, t) { for (var j = 0; j < st.notes.length; j++) if (st.state[j] === 'hold' && st.notes[j].lane === lane) { var ok = t >= st.notes[j].t + st.notes[j].hold - (st.win || WINDOWS).good; holdEnd(st, j, ok); return { note: st.notes[j], held: ok }; } return null; }
  function multOf(streak) { return streak >= 24 ? 4 : streak >= 16 ? 3 : streak >= 8 ? 2 : 1; }
  function tap(st, lane, t) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < st.notes.length; i++) {
      if (st.state[i] || st.notes[i].lane !== lane) continue;
      var d = Math.abs(t - st.notes[i].t); if (d <= (st.win || WINDOWS).good && d < bd) { bd = d; best = i; }
    }
    if (best < 0) return null;   /* nothing in reach in this lane: the tap does nothing at all */
    var g = judge(t - st.notes[best].t, st.win); st.state[best] = g;
    st.streak++; st.best = Math.max(st.best, st.streak); st.mult = multOf(st.streak);
    if (st.notes[best].hold) { st.state[best] = 'hold'; (st.hg || (st.hg = {}))[best] = g; } else { st.hits++; if (g === 'perfect') st.perfects++; }   /* 658 U3: a held note is one note, a hit only when held */
    st.score += (g === 'perfect' ? 100 : 50) * st.mult;
    var dtn = t - st.notes[best].t; (st.dts || (st.dts = [])).push(dtn); if (g !== 'perfect') { if (dtn < 0) st.early = (st.early || 0) + 1; else st.late = (st.late || 0) + 1; }   /* 658 U2: the score she sees */
    return { note: st.notes[best], grade: g };
  }
  function tick(st, t) {
    for (var j = 0; j < st.notes.length; j++) if (st.state[j] === 'hold' && t >= st.notes[j].t + st.notes[j].hold) holdEnd(st, j, true);   /* 658 U3 */
    var out = [];
    for (var i = 0; i < st.notes.length; i++) if (!st.state[i] && t - st.notes[i].t > (st.win || WINDOWS).good) { st.state[i] = 'miss'; st.misses++; st.streak = 0; st.mult = 1; out.push(st.notes[i]); }
    return out;
  }
  function stars(st) { var f = st.notes.length ? st.hits / st.notes.length : 0; return f >= 0.9 ? 3 : f >= 0.6 ? 2 : 1; }
  /* 658 U2: accuracy = (perfects + half the goods) / notes (a miss is 0); timing = her mean and median tap - note in ms over every hit, and how
     many goods fell early or late. Pure: the card and her best read these. */
  function accuracy(st) { var n = st.notes.length; return n ? (st.perfects + 0.5 * (st.hits - st.perfects)) / n : 0; }
  function timing(st) { var d = (st.dts || []).slice().sort(function (a, b) { return a - b; }), n = d.length, s = 0; for (var i = 0; i < n; i++) s += d[i];
    return { n: n, mean: n ? Math.round(s / n * 1000) : 0, median: n ? Math.round((n % 2 ? d[(n - 1) / 2] : (d[n / 2 - 1] + d[n / 2]) / 2) * 1000) : 0, early: st.early || 0, late: st.late || 0 }; }
  return { chart: chart, judge: judge, round: round, tap: tap, tick: tick, stars: stars, rank: rank, rowOf: rowOf, accuracy: accuracy, timing: timing, release: release, TIER: TIER, SPB: SPB, BPM: BPM, WINDOWS: WINDOWS, ROWS: ROWS };
})();
