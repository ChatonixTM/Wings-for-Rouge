/* Wings for Rouge: THE HAWK'S BATTLE SONG (window.WFR_BATTLE703), board 703. Working title "Talons Over the Damned". OURS/DRAFT, for his ear.
   Marth, Oct 28 2026: the Hawk battle "has to be tremendous"; "Battle song: his own battle theme that swells per phase, made in-house like the other songs".
   ORIGINAL music, composed here (Trunks): no melody, riff or hook from any game's or film's music. E minor, so it shares the island's E (The Island Wakes,
   Gem Cut) and the game sounds like one game. 4/4, quarter = 150, a bar = 1.6 s; the harmony is an 8-bar cycle Em Em C D | Em Em Am B (B major: the
   raised D# pulls back home).
     Phase 1  the low strings' ostinato (eighths: R R 8va R 5 R 8va 5, an E3 cello register), a sub bass on beats 1 and 3, the taiko (big drum on 1, the
              and-of-2 and 3; the small drum on 4 and its and; a four-hit fill every 4th bar), a soft quarter-note hat on the off-beats.
     Phase 2  adds the brass stabs (chord tones B3..A#4; odd bars 1 + the and-of-3, even bars 1, the and-of-2, 4), the hat in eighths, a brighter string
              lowpass and a third bass hit.
     Phase 3  the full line: the choir ("ah", the chord held through the bar) and the lead (8 bars over the cycle, D#5 leading home), the drums in
              double time (the big drum on every beat, the small one on every off-beat, sixteenth fills), the hat in sixteenths.
   The swell: each phase lifts the song's own level (0.78 -> 0.90 -> 1.00, ramped over half a bar) and lands with a big drum + a brass hit on its first
   bar. A phase change ALWAYS lands on a bar line: the scheduler applies it only at beat 1 of the next bar it schedules (if the call comes within the
   120 ms lookahead of a bar line, that bar is already on the clock and it lands on the following one, still a bar line).
   Instruments: music.js's recipes (the pluck envelope, the bass, the brass saws through an opening lowpass, the pad's detuned saws), copied and edited;
   the taiko, the hat, the choir and the lead are new, and every one is PITCHED (Marth hears noise as "scratches"). The bus: highpass 30 Hz (no DC),
   lowpass 7 kHz, a gentle compressor as a safety net, the mute gain, an analyser (the bench's witness of what really sounds).
   Voices: music.js's caps (light kinds, the hat, stop at 30; the rest at 40). The LINE (lead, choir) is never dropped (710's lesson): it is counted if
   it ever runs over the cap, and the score is lean enough that it does not (the bench measures the peak).
   The island's music: while this song plays, WFR_MUSIC is kept silent (stopped with a fade at start, and again if anything starts it mid-fight). After
   stop() nothing is restarted: the game's own rules bring the island's harp back (bgMusicTick), and its ducking (musicDuck) keeps working on WFR_MUSIC.
   Mute: opts.isMuted (a function) if the game gives one (best: start({ ctx: audio(), isMuted: () => muted })), else the game's own mute button as
   toggleMute labels it (#mute, aria-label 'Sound off'), polled every tick; WFR_MUSIC's mute bus only as the last resort (stale while the island is silent).
   No WebAudio, a context that is not running (locked, suspended, interrupted) or any fault: start() returns false, never throws; peek().on is false.

   API
     WFR_BATTLE703.start({ ctx, dest, isMuted, phase, fadeIn })  ctx = the game's AudioContext (required); phase 1..3 (default 1 or the last setPhase);
                                                                fadeIn s (default 0.4). Returns true when it plays. Already playing: true, no restart.
     WFR_BATTLE703.setPhase(n)                                  1..3; lands on the next bar line. Before start(): the phase start() begins in.
     WFR_BATTLE703.stop(fadeS)                                  fades out over fadeS s (default 1.5), then the scheduler stops.
     WFR_BATTLE703.setVolume(v)                                 0..1 (default 1), 80 ms ramp: a duck of the game's own, if it wants one.
     WFR_BATTLE703.peek()                                       { on, stopping, phase, bar, beat, voices, maxVoices, cap, dropped, lineOver, level,
                                                                  rms, muted, changes: [{ from, to, bar, beat, t }], hushed, why }
     WFR_BATTLE703.INFO                                         { tempo, beats, bar, cycle, cap }
   Scheduling: the WebAudio "two clocks" pattern, beat by beat: a 25 ms tick schedules every beat whose start falls within the next 120 ms on the audio
   clock. Hidden: the tick stops; on return the song jumps to where the audio clock says and SKIPS what is past (no burst). Every node is disconnected
   when its sources end. The numbers say where the energy is; Marth's ear is the real test. */
(function () {
  'use strict';

  var TEMPO = 150, SPB = 60 / TEMPO, BEATS = 4, BAR = BEATS * SPB, CYCLE = 8;
  var LEVEL = 0.35, REF = 0.1;   /* bus level, calibrated offline (the bench prints it): phase 1 RMS ~0.019 = the island's A/B (0.018), phase 3 ~0.030 (+4 dB), peaks <= ~0.19 */
  var LOOKAHEAD = 0.12, TICK = 25, LOW_CAP = 30, HARD_CAP = 40;   /* music.js: MAX_VOICES 30 (light kinds), HARD_CAP 40 */
  var SWELL = [0, 0.78, 0.9, 1];
  var LIGHT = { hat: true }, LINE = { lead: true, choir: true };
  var PAN = { str: -0.16, bass: 0, taiko: 0, tap: 0.1, hat: 0.24, brass: -0.1, choir: 0.12, lead: 0.04 };

  function db(x) { return Math.pow(10, x / 20); }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) { var pc = PC[n[0]], i = 1; if (n[1] === '#') { pc++; i = 2; } return 12 * (parseInt(n.slice(i), 10) + 1) + pc; }
  function inRange(pc, base) { return base + ((pc - (base % 12) + 12) % 12); }   /* the pitch class pc, placed in [base, base + 11] */

  /* ---------- the score ---------- */
  var CH = { Em: [4, 3], C: [0, 4], D: [2, 4], Am: [9, 3], B: [11, 4] };   /* root pitch class, third in semitones */
  var PROG = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'Am', 'B'];
  var OST = [0, 0, 12, 0, 7, 0, 12, 7];
  var LEAD = [
    'E5 1.5 F#5 .5 G5 1 B5 1', 'A5 .5 G5 .5 F#5 1 E5 2', 'E5 1 G5 1 C6 1.5 B5 .5', 'A5 2 F#5 1 D5 1',
    'E5 1.5 F#5 .5 G5 1 B5 1', 'E6 2 D6 1 B5 1', 'C6 1.5 B5 .5 A5 1 C6 1', 'B5 3 D#5 1'
  ];
  function barEvents(cb, ph) {   /* cb = the bar in the cycle (1..8); events { b, k, m, d, v } in beats from the bar line */
    var ev = [], c = CH[PROG[cb - 1]], r = c[0], tri = [r, (r + c[1]) % 12, (r + 7) % 12], i, rs = inRange(r, 52), rb = inRange(r, 40);
    for (i = 0; i < 8; i++) ev.push({ b: i * 0.5, k: 'str', m: rs + OST[i], d: 0.5, v: i % 4 === 0 ? 1 : (i % 2 ? 0.7 : 0.84) });
    ev.push({ b: 0, k: 'bass', m: rb, d: 1, v: 1 }); ev.push({ b: 2, k: 'bass', m: rb, d: 1, v: 0.85 });
    if (ph >= 2) ev.push({ b: 3.5, k: 'bass', m: rb + 7, d: 0.5, v: 0.7 });
    if (ph < 3) {
      ev.push({ b: 0, k: 'taiko', d: 1, v: 1 }); ev.push({ b: 1.5, k: 'taiko', d: 1, v: 0.72 }); ev.push({ b: 2, k: 'taiko', d: 1, v: 0.88 });
      if (cb % 4 === 0) { for (i = 0; i < 4; i++) ev.push({ b: 3 + i * 0.25, k: 'tap', d: 0.25, v: 0.6 + i * 0.12 }); }
      else { ev.push({ b: 3, k: 'tap', d: 0.5, v: 0.72 }); ev.push({ b: 3.5, k: 'tap', d: 0.5, v: 0.84 }); }
    } else {
      for (i = 0; i < 4; i++) ev.push({ b: i, k: 'taiko', d: 1, v: i === 0 ? 1 : (i === 2 ? 0.9 : 0.78) });
      for (i = 0; i < 4; i++) { if (!(cb % 2 === 0 && i === 3)) ev.push({ b: i + 0.5, k: 'tap', d: 0.5, v: 0.62 }); }
      if (cb % 2 === 0) { for (i = 0; i < 4; i++) ev.push({ b: 3 + i * 0.25, k: 'tap', d: 0.25, v: 0.6 + i * 0.12 }); }
    }
    if (ph === 1) { for (i = 0; i < 4; i++) ev.push({ b: i + 0.5, k: 'hat', d: 0.1, v: 0.6 }); }
    else if (ph === 2) { for (i = 0; i < 8; i++) ev.push({ b: i * 0.5, k: 'hat', d: 0.1, v: i % 2 ? 0.85 : 0.5 }); }
    else { for (i = 0; i < 16; i++) ev.push({ b: i * 0.25, k: 'hat', d: 0.1, v: i % 4 === 2 ? 0.9 : (i % 2 ? 0.45 : 0.6) }); }
    if (ph >= 2) {
      var st = tri.map(function (p) { return inRange(p, 59); }), hits = cb % 2 ? [[0, 0.35], [2.5, 0.6]] : [[0, 0.35], [1.5, 0.35], [3, 0.8]];
      for (i = 0; i < hits.length; i++) ev.push({ b: hits[i][0], k: 'brass', m: st, d: hits[i][1], v: ph === 3 ? 1 : 0.85 });
    }
    if (ph === 3) {
      ev.push({ b: 0, k: 'choir', m: tri.map(function (p) { return inRange(p, 55); }).concat([inRange(r, 43)]), d: 4, v: 1 });
      var tok = LEAD[cb - 1].split(/\s+/), at = 0;
      for (i = 0; i < tok.length; i += 2) { var d = parseFloat(tok[i + 1]); ev.push({ b: at, k: 'lead', m: midi(tok[i]), d: d, v: 1 }); at += d; }
    }
    ev.sort(function (a, b) { return a.b - b.b; });
    return ev;
  }
  var SC = {};
  function score(cb, ph) { var k = ph + ':' + cb; return SC[k] || (SC[k] = barEvents(cb, ph)); }

  /* ---------- the rig: bus (volume) -> highpass 30 Hz -> lowpass 7 kHz -> compressor -> mute -> analyser -> out ---------- */
  var rig = null, sess = null, timer = null, isMutedFn = null, volume = 1, wantPhase = 1, why = null, lastChanges = [];
  function makeRig(c, dest) {
    var r = { c: c };
    r.bus = c.createGain(); r.bus.gain.value = LEVEL * volume;
    r.hp = c.createBiquadFilter(); r.hp.type = 'highpass'; r.hp.frequency.value = 30; r.hp.Q.value = 0.5;
    r.lp = c.createBiquadFilter(); r.lp.type = 'lowpass'; r.lp.frequency.value = 7000; r.lp.Q.value = 0.5;
    var tail = r.lp; r.bus.connect(r.hp); r.hp.connect(r.lp);
    if (c.createDynamicsCompressor) { r.comp = c.createDynamicsCompressor(); r.comp.threshold.value = -12; r.comp.knee.value = 6; r.comp.ratio.value = 4; r.comp.attack.value = 0.004; r.comp.release.value = 0.15; tail.connect(r.comp); tail = r.comp; }
    r.mute = c.createGain(); r.mute.gain.value = mutedNow() ? 0 : 1; tail.connect(r.mute); tail = r.mute;
    if (c.createAnalyser) { r.an = c.createAnalyser(); r.an.fftSize = 2048; r.buf = new Float32Array(r.an.fftSize); tail.connect(r.an); tail = r.an; }
    tail.connect(dest || c.destination); r.muted = mutedNow();
    return r;
  }
  function ramp(c, p, to, sec) { var t = c.currentTime; p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(to, t + sec); }
  function mutedNow() {
    try {
      if (isMutedFn) return !!isMutedFn();
      var btn = typeof document !== 'undefined' && document.getElementById ? document.getElementById('mute') : null;
      if (btn && btn.getAttribute('aria-label')) return btn.getAttribute('aria-label') === 'Sound off';   /* the game's toggleMute labels its button; WFR_MUSIC's own mute bus is NOT read first: while the island is silent Chrome stops running that gain's ramp, so its value goes stale (the bench caught it) */
      if (typeof window !== 'undefined' && window.WFR_MUSIC && window.WFR_MUSIC.muteLevel) { var l = window.WFR_MUSIC.muteLevel(); return l != null && l < 0.5; }   /* last resort, right only while the island plays */
    } catch (e) { /* the switch could not be read: sound stays as it was */ }
    return false;
  }
  function applyMute(force) { if (!rig || !rig.mute) return; var m = mutedNow(); if (m !== rig.muted || force) { rig.muted = m; ramp(rig.c, rig.mute.gain, m ? 0 : 1, 0.03); } }
  function hush(fade) {
    try { if (typeof window !== 'undefined' && window.WFR_MUSIC && window.WFR_MUSIC.playing) { window.WFR_MUSIC.stop({ fade: fade }); if (sess) sess.hushed++; } } catch (e) { /* the island's music must never stop the fight */ }
  }

  /* ---------- voices (music.js's pattern: one record per note, every node disconnected when its sources end) ---------- */
  function newStats() { return { scheduled: 0, dropped: 0, lineOver: 0, maxActive: 0, kinds: {} }; }
  function voice(s, t, end, kind) {
    var a = s.active, i = 0; while (i < a.length) { if (a[i].e <= t) a.splice(i, 1); else i++; }
    if (LINE[kind]) { if (a.length >= HARD_CAP) s.stats.lineOver++; }   /* 710: the line is never dropped; counted if it ever runs over */
    else if (a.length >= (LIGHT[kind] ? LOW_CAP : HARD_CAP)) { s.stats.dropped++; return null; }
    a.push({ s: t, e: end }); s.stats.scheduled++; s.stats.kinds[kind] = (s.stats.kinds[kind] || 0) + 1;
    if (a.length > s.stats.maxActive) s.stats.maxActive = a.length;
    return { nodes: [], srcs: 0 };
  }
  function keep(v, n) { v.nodes.push(n); return n; }
  function run(v, src, t0, t1) {
    v.srcs++;
    src.onended = function () { if (--v.srcs === 0) { for (var i = 0; i < v.nodes.length; i++) { try { v.nodes[i].disconnect(); } catch (e) { /* gone */ } } v.nodes.length = 0; } };
    src.start(t0); src.stop(t1);
  }
  function pluck(g, t, peak, att, dec) {   /* music.js: 0 -> peak in att, exponential to -40 dB over dec, then 30 ms to true zero */
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + att);
    g.gain.exponentialRampToValueAtTime(peak * 0.01, t + att + dec); g.gain.linearRampToValueAtTime(0, t + att + dec + 0.03);
    return t + att + dec + 0.04;
  }
  function str(s, e, t, out) {   /* the low strings: two saws +-8 ct through a lowpass that opens with the phase, a short bowed pluck */
    var c = s.c, att = 0.012, dec = 0.3, end = t + att + dec + 0.04, v = voice(s, t, end, 'str'); if (!v) return;
    var lp = keep(v, c.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = [0, 700, 1000, 1350][s.phase]; lp.Q.value = 0.9;
    var g = keep(v, c.createGain()); pluck(g, t, REF * db(-5) * e.v, att, dec);
    for (var k = -1; k <= 1; k += 2) { var o = keep(v, c.createOscillator()); o.type = 'sawtooth'; o.frequency.value = hz(e.m); o.detune.value = 8 * k; var og = keep(v, c.createGain()); og.gain.value = 0.5; o.connect(og); og.connect(lp); run(v, o, t, end); }
    lp.connect(g); g.connect(out);
  }
  function bass(s, e, t, out) {   /* music.js's bass, held longer */
    var c = s.c, att = 0.008, dec = 0.4 * e.d, end = t + att + dec + 0.04, v = voice(s, t, end, 'bass'); if (!v) return;
    var o = keep(v, c.createOscillator()); o.type = 'triangle'; o.frequency.value = hz(e.m);
    var lp = keep(v, c.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.6;
    var g = keep(v, c.createGain()); pluck(g, t, REF * db(-10) * 3.4 * e.v, att, dec);
    o.connect(lp); lp.connect(g); g.connect(out); run(v, o, t, end);
  }
  function drum(s, e, t, out, big) {   /* the taiko: a sine whose pitch falls 2.4x -> 1x in 50 ms, and a short triangle "skin"; pitched, never noise */
    var c = s.c, f = big ? 64 : 132, dec = big ? 0.42 : 0.18, att = 0.003, end = t + att + dec + 0.04, v = voice(s, t, end, big ? 'taiko' : 'tap'); if (!v) return;
    var o = keep(v, c.createOscillator()); o.frequency.setValueAtTime(f * 2.4, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    var g = keep(v, c.createGain()); pluck(g, t, REF * db(big ? 2 : -3) * 2.2 * e.v, att, dec);
    var sk = keep(v, c.createOscillator()); sk.type = 'triangle'; sk.frequency.setValueAtTime(f * 5.3, t); sk.frequency.exponentialRampToValueAtTime(f * 3.1, t + 0.03);
    var sg = keep(v, c.createGain()); pluck(sg, t, REF * db(-12) * 2.2 * e.v, 0.002, 0.03);
    o.connect(g); g.connect(out); sk.connect(sg); sg.connect(out); run(v, o, t, end); run(v, sk, t, t + 0.08);
  }
  function hat(s, e, t, out) {   /* two inharmonic triangles (4.3 + 6.1 kHz), 25 ms: a metal tick, pitched (620 U2's 'tek' idea) */
    var c = s.c, end = t + 0.05, v = voice(s, t, end, 'hat'); if (!v) return;
    var g = keep(v, c.createGain()); pluck(g, t, REF * db(-22) * e.v, 0.002, 0.024);
    var a = keep(v, c.createOscillator()); a.type = 'triangle'; a.frequency.value = 4300;
    var b = keep(v, c.createOscillator()); b.type = 'triangle'; b.frequency.value = 6100;
    a.connect(g); b.connect(g); g.connect(out); run(v, a, t, end); run(v, b, t, end);
  }
  function brass(s, e, t, out) {   /* music.js's brass (saws +-5 ct, a lowpass that opens in 30 ms), the whole chord as one voice */
    var c = s.c, dur = e.d * SPB, end = t + dur + 0.24, v = voice(s, t, end, 'brass'); if (!v) return;
    var lp = keep(v, c.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(1100, t); lp.frequency.linearRampToValueAtTime(3000, t + 0.03); lp.frequency.linearRampToValueAtTime(1600, t + dur);
    var peak = REF * db(-8) * 0.8 * e.v, g = keep(v, c.createGain());
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.02); g.gain.linearRampToValueAtTime(peak * 0.7, t + Math.min(dur, 0.12));
    g.gain.setValueAtTime(peak * 0.7, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.2);
    for (var i = 0; i < e.m.length; i++) for (var k = -1; k <= 1; k += 2) { var o = keep(v, c.createOscillator()); o.type = 'sawtooth'; o.frequency.value = hz(e.m[i]); o.detune.value = 5 * k; var og = keep(v, c.createGain()); og.gain.value = 0.5; o.connect(og); og.connect(lp); run(v, o, t, end); }
    lp.connect(g); g.connect(out);
  }
  function choir(s, e, t, out) {   /* "ah": detuned saws (the pad's recipe) through two vowel formants (730 + 1090 Hz) and a little of the dry body */
    var c = s.c, dur = e.d * SPB, att = 0.28, rel = 0.7, end = t + dur + rel + 0.03, v = voice(s, t, end, 'choir'); if (!v) return;
    var sum = keep(v, c.createGain()); sum.gain.value = 1 / (e.m.length * 2);
    var l = keep(v, c.createOscillator()); l.frequency.value = 5.3; var lg = keep(v, c.createGain()); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(7, t + 0.5); l.connect(lg);
    for (var i = 0; i < e.m.length; i++) for (var k = -1; k <= 1; k += 2) { var o = keep(v, c.createOscillator()); o.type = 'sawtooth'; o.frequency.value = hz(e.m[i]); o.detune.value = 6 * k; lg.connect(o.detune); o.connect(sum); run(v, o, t, end); }
    var f1 = keep(v, c.createBiquadFilter()); f1.type = 'bandpass'; f1.frequency.value = 730; f1.Q.value = 3;
    var f2 = keep(v, c.createBiquadFilter()); f2.type = 'bandpass'; f2.frequency.value = 1090; f2.Q.value = 4; var f2g = keep(v, c.createGain()); f2g.gain.value = 0.6;
    var lp = keep(v, c.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.5; var lpg = keep(v, c.createGain()); lpg.gain.value = 0.22;
    var g = keep(v, c.createGain()), pk = REF * db(4) * e.v;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + att); g.gain.setValueAtTime(pk, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + rel);
    sum.connect(f1); f1.connect(g); sum.connect(f2); f2.connect(f2g); f2g.connect(g); sum.connect(lp); lp.connect(lpg); lpg.connect(g); g.connect(out); run(v, l, t, end);
  }
  function lead(s, e, t, out) {   /* the line: two saws +-4 ct and a triangle an octave down, a lowpass that blooms, vibrato on the long notes */
    var c = s.c, dur = e.d * SPB * 0.94, rel = 0.14, end = t + dur + rel + 0.03, v = voice(s, t, end, 'lead'); if (!v) return;
    var lp = keep(v, c.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(1400, t); lp.frequency.linearRampToValueAtTime(3000, t + 0.04); lp.frequency.linearRampToValueAtTime(2200, t + Math.max(0.05, dur));
    var pk = REF * db(-3) * e.v, g = keep(v, c.createGain());
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + 0.02); g.gain.setValueAtTime(pk, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + rel);
    var oscs = [];
    for (var k = -1; k <= 1; k += 2) { var o = keep(v, c.createOscillator()); o.type = 'sawtooth'; o.frequency.value = hz(e.m); o.detune.value = 4 * k; var og = keep(v, c.createGain()); og.gain.value = 0.4; o.connect(og); og.connect(lp); oscs.push(o); }
    var sub = keep(v, c.createOscillator()); sub.type = 'triangle'; sub.frequency.value = hz(e.m - 12); var sg = keep(v, c.createGain()); sg.gain.value = 0.35; sub.connect(sg); sg.connect(lp); oscs.push(sub);
    if (e.d >= 1) {
      var l = keep(v, c.createOscillator()); l.frequency.value = 5.6; var lg = keep(v, c.createGain()); lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + 0.15); lg.gain.linearRampToValueAtTime(10, t + 0.45);
      l.connect(lg); for (var j = 0; j < oscs.length; j++) lg.connect(oscs[j].detune); run(v, l, t, end);
    }
    for (var q = 0; q < oscs.length; q++) run(v, oscs[q], t, end);
    lp.connect(g); g.connect(out);
  }
  function play(s, e, t) {
    var out = s.strips[e.k];
    if (s.only && s.only.indexOf(e.k) < 0) return;
    switch (e.k) {
      case 'str': str(s, e, t, out); break;
      case 'bass': bass(s, e, t, out); break;
      case 'taiko': drum(s, e, t, out, true); break;
      case 'tap': drum(s, e, t, out, false); break;
      case 'hat': hat(s, e, t, out); break;
      case 'brass': brass(s, e, t, out); break;
      case 'choir': choir(s, e, t, out); break;
      case 'lead': lead(s, e, t, out); break;
    }
  }

  /* ---------- the session + the scheduler (two clocks, beat by beat) ---------- */
  function newSession(r, t0, phase, fadeIn) {
    var c = r.c, s = { c: c, t0: t0, beatN: 0, nextT: t0, phase: phase, want: phase, active: [], stats: newStats(), recs: [], changes: [], hushed: 0, stopping: false, entry: 0, only: null };
    s.gain = c.createGain(); s.gain.connect(r.bus);
    if (fadeIn > 0) { s.gain.gain.setValueAtTime(0, t0); s.gain.gain.linearRampToValueAtTime(1, t0 + fadeIn); } else s.gain.gain.value = 1;
    s.swell = c.createGain(); s.swell.gain.value = SWELL[phase]; s.swell.connect(s.gain);
    s.strips = {};
    for (var k in PAN) { var p = c.createStereoPanner ? c.createStereoPanner() : c.createGain(); if (p.pan) p.pan.value = PAN[k]; p.connect(s.swell); s.strips[k] = p; }
    return s;
  }
  function change(s, bar, t) {   /* a new phase: the swell, a big drum and a brass hit on its first beat, and the log the bench reads */
    s.changes.push({ from: s.phase, to: s.want, bar: bar, beat: s.beatN % BEATS, t: t });
    var g = s.swell.gain; g.cancelScheduledValues(t); g.setValueAtTime(SWELL[s.phase], t); g.linearRampToValueAtTime(SWELL[s.want], t + BAR / 2);
    s.phase = s.want; s.entry = bar;
  }
  function beat(s, bar, b, t, now) {
    var cb = ((bar - 1) % CYCLE) + 1, ev = score(cb, s.phase);
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i]; if (e.b < b || e.b >= b + 1) continue;
      var tt = t + (e.b - b) * SPB; if (tt < now) tt = now;   /* a short stall: late beats a hole */
      play(s, e, tt);
    }
    if (b === 0 && s.entry === bar && bar > 1) {
      play(s, { k: 'taiko', d: 1, v: 1.25 }, Math.max(t, now));
      var c = CH[PROG[cb - 1]], tri = [c[0], (c[0] + c[1]) % 12, (c[0] + 7) % 12].map(function (p) { return inRange(p, 59); });
      play(s, { k: 'brass', m: tri.concat([tri[0] + 12]), d: 1.5, v: 1 }, Math.max(t, now));
    }
  }
  function pump(s, until, now) {
    if (s.nextT < now - 1) { var n = Math.ceil((now - s.nextT) / BAR); s.beatN = (Math.floor(s.beatN / BEATS) + n) * BEATS; s.nextT = s.t0 + s.beatN * SPB; }   /* hidden a while: jump whole bars by the audio clock */
    for (var guard = 0; guard < 64 && s.nextT < until; guard++) {
      var b = s.beatN % BEATS, bar = Math.floor(s.beatN / BEATS) + 1, t = s.nextT;
      if (b === 0 && s.want !== s.phase) change(s, bar, t);   /* THE BAR LINE: a phase lands only on beat 1 */
      if (t >= now - 0.08) beat(s, bar, b, t, now);
      s.recs.push({ bar: bar, b: b, t: t, ph: s.phase }); if (s.recs.length > 16) s.recs.shift();
      s.beatN++; s.nextT = s.t0 + s.beatN * SPB;
    }
  }
  function tick() {
    if (!sess || !rig) return;
    try { var now = rig.c.currentTime; if (sess.stopping && now >= sess.stopAt) { finish(sess); return; } applyMute(false); if (!sess.stopping) hush(0.6); pump(sess, now + LOOKAHEAD, now); }   /* the fade ends on the AUDIO clock (a paused game pauses the fade too) */
    catch (e) { why = 'tick: ' + String((e && e.message) || e); }   /* the song must never stop the game */
  }
  function startTimer() { if (!timer && sess && !(typeof document !== 'undefined' && document.hidden)) { tick(); timer = setInterval(tick, TICK); } }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function finish(me) { if (sess === me) { stopTimer(); lastChanges = me.changes.slice(); close(me); sess = null; } }
  function close(s) { try { s.gain.disconnect(); } catch (e) { /* gone */ } try { s.swell.disconnect(); } catch (e) { /* gone */ } for (var k in s.strips) { try { s.strips[k].disconnect(); } catch (e) { /* gone */ } } }

  function start(o) {
    o = o || {};
    try {
      var c = o.ctx || null;
      if (!c || typeof c.createGain !== 'function') { why = 'no audio context'; return false; }
      if (c.state !== 'running') { why = 'audio locked (' + c.state + ')'; return false; }
      if (typeof o.isMuted === 'function') isMutedFn = o.isMuted;
      if (o.phase >= 1 && o.phase <= 3) wantPhase = o.phase | 0;
      if (!rig || rig.c !== c) rig = makeRig(c, o.dest);
      if (sess && !sess.stopping) return true;
      if (sess) { var old = sess; ramp(c, old.gain.gain, 0, 0.2); setTimeout(function () { close(old); }, 400); stopTimer(); }
      sess = newSession(rig, c.currentTime + 0.06, wantPhase, o.fadeIn != null ? Math.max(0, +o.fadeIn || 0) : 0.4);
      why = null; hush(1.0); applyMute(true); startTimer();
      return true;
    } catch (e) { why = 'start: ' + String((e && e.message) || e); stopTimer(); sess = null; return false; }
  }
  function setPhase(n) {
    n = Math.round(+n); if (!(n >= 1 && n <= 3)) return false;
    wantPhase = n; if (sess && !sess.stopping) sess.want = n;
    return true;
  }
  function stop(fadeS) {
    if (!sess || !rig) return false;
    var me = sess, f = Math.max(0.02, fadeS != null && isFinite(+fadeS) ? +fadeS : 1.5);
    if (me.stopping) return true;
    me.stopping = true; wantPhase = 1;
    try { ramp(rig.c, me.gain.gain, 0, f); } catch (e) { /* gone */ }
    me.stopAt = rig.c.currentTime + f + 0.05;
    return true;
  }
  function setVolume(v) { volume = Math.max(0, Math.min(1, +v || 0)); if (rig) ramp(rig.c, rig.bus.gain, LEVEL * volume, 0.08); }
  function rms() {
    if (!rig || !rig.an) return null;
    rig.an.getFloatTimeDomainData(rig.buf); var e = 0; for (var i = 0; i < rig.buf.length; i++) e += rig.buf[i] * rig.buf[i];
    return Math.sqrt(e / rig.buf.length);
  }
  function peek() {
    try {
      if (!sess || !rig) return { on: false, stopping: false, phase: wantPhase, bar: 0, beat: 0, voices: 0, maxVoices: 0, cap: HARD_CAP, dropped: 0, lineOver: 0, level: 0, rms: rms(), muted: mutedNow(), changes: lastChanges.slice(), hushed: 0, why: why };
      var s = sess, now = rig.c.currentTime, rec = null, i, n = 0;
      for (i = s.recs.length - 1; i >= 0; i--) { if (s.recs[i].t <= now) { rec = s.recs[i]; break; } }
      for (i = 0; i < s.active.length; i++) { if (s.active[i].s <= now && s.active[i].e > now) n++; }
      return { on: true, stopping: s.stopping, phase: rec ? rec.ph : s.phase, bar: rec ? rec.bar : 0, beat: rec ? rec.b + (now - rec.t) / SPB : 0, voices: n, maxVoices: s.stats.maxActive, cap: HARD_CAP,
        dropped: s.stats.dropped, lineOver: s.stats.lineOver, level: s.gain.gain.value, rms: rms(), muted: !!rig.muted, changes: s.changes.slice(), hushed: s.hushed, why: why, kinds: s.stats.kinds };
    } catch (e) { return { on: false, phase: wantPhase, bar: 0, beat: 0, voices: 0, why: 'peek: ' + String((e && e.message) || e) }; }
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopTimer(); else if (sess) startTimer(); });   /* pump skips what is past by the audio clock */
  }

  /* offline bench: a whole render scheduled up front on an OfflineAudioContext, one phase (no timers, the live song untouched) */
  function render(oc, o) {
    o = o || {};
    var r = makeRig(oc, oc.destination), s = newSession(r, 0, o.phase || 1, 0);
    s.only = o.only || null;
    pump(s, o.seconds || 4 * BAR, -Infinity);
    return { scheduled: s.stats.scheduled, dropped: s.stats.dropped, lineOver: s.stats.lineOver, maxActive: s.stats.maxActive, kinds: s.stats.kinds };
  }

  window.WFR_BATTLE703 = {
    start: start, setPhase: setPhase, stop: stop, setVolume: setVolume, peek: peek,
    INFO: { tempo: TEMPO, beats: BEATS, bar: BAR, cycle: CYCLE, cap: HARD_CAP, lowCap: LOW_CAP },
    _test: { render: render, score: score }
  };
})();
