/* Wings for Rouge: the song (window.WFR_MUSIC) - "The Island Wakes" (working title), boards 530 + 543.
   ORIGINAL music, composed by Itachi (BRIEF_530_543_OPENING_SONG_2026-10-09.md, section C). Marth asked for the MOOD of
   Viva la Vida / Sweet Dreams / the Great Fairy Fountain; no melody, riff or hook comes from any of them.

   E minor lifting to G major, 3/4, quarter = 132, 48 bars = 65.45 s, a seamless loop.
     Intro 8 (harp alone) . A 16 (melody + bass ostinato) . B 16 (pad swell, bell, light pulse) . Tail 8 (harp alone = the
     intro, so the loop point is invisible). Chords Em-C-G-D (x4); in B: C-G-Am-D | C-G-D-Em (x2).
     Bass every bar (A + B): R, R+8va, 5, R+8va, R, 5 in eighths. Harp every bar: R3, 5, R4, 3rd, 5 up, R4 in eighths, plus an
     upward scale sweep on the first bar of each section (bars 1, 9, 25, 41).

   Soft on purpose: Marth heard noise-heavy synthesis as "scratches". Every voice is pitched (triangle / sine / saw through a
   lowpass) except one 40 ms brush at -26 dB in B; gentle attacks; a 6 kHz lowpass and a 25 Hz highpass (no DC) on the bus.
   The numbers say where the energy is; Marth's ear is the real test.

   API
     WFR_MUSIC.init(ctx, destination, { isMuted })   ctx = the game's AudioContext; destination defaults to ctx.destination
     WFR_MUSIC.play({ variant, fadeIn, startBar })   variant 'home' (the full song, quarter = 132) or 'legend' (harp + melody
                                                     only, quarter = 80, for the opening scroll); fadeIn seconds (default 1.5);
                                                     startBar 1..48 (default 1). Playing the variant already playing only
                                                     cancels a fade-out; another variant fades the old one out (0.6 s).
     WFR_MUSIC.stop({ fade })                        fade seconds (default 1.2), then the scheduler stops
     WFR_MUSIC.setMuted(bool)                        30 ms ramp on the music bus (tails included)
     WFR_MUSIC.setVolume(v)                          0..1 user volume (default 1), 80 ms ramp
     WFR_MUSIC.playing / .variant / .position()      position() = seconds into the current loop (null when stopped)
     WFR_MUSIC.LOOP_SECONDS                          65.4545 (home)
   Scheduling: the WebAudio "two clocks" pattern - a 25 ms setInterval tick schedules every note whose time falls within the
   next 120 ms on the audio clock. When the page is hidden the tick stops; on return it jumps the song to where it should
   be by the audio clock and SKIPS anything already past (no burst). Voices are capped (MAX_VOICES) and every node is
   disconnected when its source ends. */
(function () {
  'use strict';

  var LEVEL = 0.48;           /* bus level: calibrated offline so the loudest moment peaks ~0.13 = 0.55 x the birds' ~0.24 */
  var REF = 0.1;              /* "0 dB" for one harp note before the bus */
  var LOOKAHEAD = 0.12, TICK = 25, MAX_VOICES = 30, HARD_CAP = 40;

  var ctx = null, bus = null, busHp = null, busLp = null, muteG = null, noise = null, isMuted = null, cosWave = null;
  var volume = 1, timer = null, sess = null, active = [], stats = { scheduled: 0, dropped: 0, maxActive: 0, mel: 0, tapped: 0 };   /* 657: mel = melody events the song itself played; tapped = notes her taps played */
  var only = null;            /* offline bench: render only these kinds */

  function db(x) { return Math.pow(10, x / 20); }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) { var pc = PC[n[0]], i = 1; if (n[1] === '#') { pc++; i = 2; } return 12 * (parseInt(n.slice(i), 10) + 1) + pc; }

  /* ---------- the score ---------- */
  var CH = { Em: [4, 3], C: [0, 4], G: [7, 4], D: [2, 4], Am: [9, 3] };   /* root pitch class, third in semitones */
  var LOOP4 = ['Em', 'C', 'G', 'D'], BPROG = ['C', 'G', 'Am', 'D', 'C', 'G', 'D', 'Em'];
  function chordOf(bar) {                     /* bar 1..48 */
    if (bar >= 25 && bar <= 40) return BPROG[(bar - 25) % 8];
    return LOOP4[(bar - 1) % 4];
  }
  var MEL = [
    /* A, bars 9-24 */
    'B4 1 E5 1 G5 1', 'A5 2 G5 1', 'F#5 1 G5 1 D5 1', 'E5 3',
    'B4 1 E5 1 G5 1', 'A5 2 B5 1', 'D6 1.5 B5 .5 G5 1', 'A5 3',
    'G5 1 F#5 1 E5 1', 'E5 2 D5 1', 'D5 1 B4 1 D5 1', 'F#5 3',
    'G5 1 E5 1 B4 1', 'C5 2 D5 1', 'B4 1.5 A4 .5 G4 1', 'A4 2 B4 1',
    /* B, bars 25-40 */
    'E5 1 G5 1 C6 1', 'B5 2 G5 1', 'A5 1 B5 1 C6 1', 'A5 3',
    'E5 1 G5 1 C6 1', 'B5 2 D6 1', 'A5 1.5 F#5 .5 A5 1', 'G5 3',
    'C6 1 B5 1 A5 1', 'G5 2 B5 1', 'C6 1 B5 1 A5 1', 'F#5 3',
    'E5 1 G5 1 A5 1', 'B5 2 A5 1', 'F#5 1 E5 1 D5 1', 'E5 3'
  ];
  var SCALE = [7, 9, 11, 0, 2, 4, 6];        /* G major = E natural minor */
  var BEATS = 3, BARS = 48;
  /* 658: each variant's own bar and length (BRIEF_620_658 §2); 620 U2: 'gem' is Gem Cut (4/4, 16 bars, quarter = 120: 32.0 s), its own score. */
  var BEATS_OF = { home: 3, legend: 3, gem: 4 }, BARS_OF = { home: 48, legend: 48, gem: 16 }, READY = { home: true, legend: true, gem: true };

  /* events in beats from bar 1 beat 1: { b, k, m, d, v } sorted by b */
  function build(variant) {
    var ev = [], full = variant !== 'legend', bar, i;
    if (variant === 'gem') return buildGem();   /* 620 U2 */
    for (bar = 1; bar <= BARS; bar++) {
      var c = CH[chordOf(bar)], r3 = 48 + c[0], b0 = (bar - 1) * BEATS;
      var arp = [r3, r3 + 7, r3 + 12, r3 + 12 + c[1], r3 + 19, r3 + 12];
      for (i = 0; i < 6; i++) ev.push({ b: b0 + i * 0.5, k: 'harp', m: arp[i], d: 0.5, v: i === 0 ? 1 : (i === 3 ? 0.85 : 0.72) });
      if (bar === 1 || bar === 9 || bar === 25 || bar === 41) {           /* the upward sweep, an octave of the scale */
        var si = SCALE.indexOf(c[0]), m = r3 + 12;
        for (i = 0; i < 8; i++) {
          ev.push({ b: b0 + i / 12, k: 'harp', m: m, d: 0.25, v: 0.32 + i * 0.04, sweep: true });
          var nx = SCALE[(si + 1) % 7]; m += (nx - SCALE[si] + 12) % 12; si = (si + 1) % 7;
        }
      }
      if (full && bar >= 9 && bar <= 40) {
        var rb = 36 + c[0], bs = [rb, rb + 12, rb + 7, rb + 12, rb, rb + 7];
        for (i = 0; i < 6; i++) ev.push({ b: b0 + i * 0.5, k: 'bass', m: bs[i], d: 0.5, v: i === 0 ? 1 : 0.8 });
      }
      if (full && bar >= 25 && bar <= 40) {
        var pad = [0, c[1], 7].map(function (iv) { var p = (c[0] + iv) % 12; return 55 + ((p - 7 + 12) % 12); });
        ev.push({ b: b0, k: 'pad', m: pad, d: BEATS, v: 1 });
        ev.push({ b: b0, k: 'thump', m: 0, d: 0.2, v: 1 });
        ev.push({ b: b0 + 2, k: 'brush', m: 0, d: 0.1, v: 1 });
        if (bar === 25 || bar === 29 || bar === 33 || bar === 37) ev.push({ b: b0, k: 'bell', m: 72 + c[0], d: 3, v: 1 });
      }
      if (bar >= 9 && bar <= 40) {
        if (variant === 'home' && ORN[bar]) ev.push({ b: b0 + 1, k: 'orn', m: midi(ORN[bar]), d: 1, v: 0.8 });   /* 658 U6: a soft answer on beat 2 */
        var tok = MEL[bar - 9].split(/\s+/), at = b0;
        for (i = 0; i < tok.length; i += 2) {
          var d = parseFloat(tok[i + 1]);
          ev.push({ b: at, k: 'mel', m: midi(tok[i]), d: d, v: 1 });
          at += d;
        }
      }
    }
    ev.sort(function (a, b) { return a.b - b.b; });
    return ev;
  }
  var SCORES = {};
  var TEMPO = { home: 132, legend: 80, gem: 120 };   /* 620 U2: Gem Cut */

  /* ---------- the bus ---------- */
  function init(c, dest, opts) {
    if (!c) return false;
    if (opts && typeof opts.isMuted === 'function') isMuted = opts.isMuted;
    if (ctx === c && bus) return true;
    if (sess) hardStop();
    ctx = c; active = [];
    bus = c.createGain(); bus.gain.value = LEVEL * volume;
    busHp = c.createBiquadFilter(); busHp.type = 'highpass'; busHp.frequency.value = 25; busHp.Q.value = 0.5;
    busLp = c.createBiquadFilter(); busLp.type = 'lowpass'; busLp.frequency.value = 6000; busLp.Q.value = 0.5;
    muteG = c.createGain(); muteG.gain.value = (isMuted && isMuted()) ? 0 : 1;
    bus.connect(busHp); busHp.connect(busLp); busLp.connect(muteG); muteG.connect(dest || c.destination);
    var len = Math.floor(c.sampleRate * 0.5), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0), s = 22222;
    for (var i = 0; i < len; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 1073741823.5) - 1; }
    noise = b;
    cosWave = c.createPeriodicWave(new Float32Array([0, 1]), new Float32Array([0, 0]), { disableNormalization: true });
    return true;
  }
  function ramp(p, to, sec) {
    var t = ctx.currentTime; p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(to, t + sec);
  }
  function setMuted(m) { if (muteG) ramp(muteG.gain, m ? 0 : 1, 0.03); }
  function setVolume(v) {
    volume = Math.max(0, Math.min(1, +v || 0));
    if (bus) ramp(bus.gain, LEVEL * volume, 0.08);
  }

  /* ---------- voices ---------- */
  function voice(t, end, kind) {
    var i = 0; while (i < active.length) { if (active[i] <= t) active.splice(i, 1); else i++; }
    var low = kind === 'harp' || kind === 'brush';
    if (active.length >= (low ? MAX_VOICES : HARD_CAP)) { stats.dropped++; return null; }
    active.push(end); stats.scheduled++; if (active.length > stats.maxActive) stats.maxActive = active.length;
    return { nodes: [], srcs: 0 };
  }
  function keep(v, n) { v.nodes.push(n); return n; }
  function run(v, s, t0, t1) {
    v.srcs++;
    s.onended = function () { if (--v.srcs === 0) { for (var i = 0; i < v.nodes.length; i++) { try { v.nodes[i].disconnect(); } catch (e) { /* gone */ } } v.nodes.length = 0; } };
    s.start(t0); s.stop(t1);
  }
  /* a pluck: 0 -> peak in att, exponential to -40 dB over dec, then 30 ms to true zero */
  function pluck(g, t, peak, att, dec) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + att);
    g.gain.exponentialRampToValueAtTime(peak * 0.01, t + att + dec); g.gain.linearRampToValueAtTime(0, t + att + dec + 0.03);
    return t + att + dec + 0.04;
  }

  function harpLike(e, t, out, spb, melody) {
    var f = hz(e.m), att = 0.004, dec, peak;
    if (melody) { dec = Math.max(0.9, 0.85 * e.d * spb); peak = REF * db(4) * e.v; stats.lastMelAt = t; }   /* 657: the guard reads when a melody note was scheduled */
    else { dec = 0.55; peak = REF * e.v; }
    var end = t + att + dec + 0.04, v = voice(t, end, melody ? 'mel' : 'harp'); if (!v) return;
    var o = keep(v, ctx.createOscillator()); o.type = 'triangle'; o.frequency.value = f;
    var o2 = keep(v, ctx.createOscillator()); o2.type = 'sine'; o2.frequency.value = f * 2;
    var g2 = keep(v, ctx.createGain()); g2.gain.value = db(-14);
    var lp = keep(v, ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 0.5;
    var g = keep(v, ctx.createGain()); pluck(g, t, peak, att, dec);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(out);
    if (melody && e.d >= 2) {                     /* light vibrato after 150 ms on the long notes */
      var l = keep(v, ctx.createOscillator()); l.frequency.value = 5.2;
      var lg = keep(v, ctx.createGain()); lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + 0.15); lg.gain.linearRampToValueAtTime(9, t + 0.5);
      l.connect(lg); lg.connect(o.detune); lg.connect(o2.detune); run(v, l, t, end);
    }
    run(v, o, t, end); run(v, o2, t, end);
  }
  function bass(e, t, out) {
    var att = 0.008, dec = 0.22, end = t + att + dec + 0.04, v = voice(t, end, 'bass'); if (!v) return;
    var o = keep(v, ctx.createOscillator()); o.type = 'triangle'; o.frequency.value = hz(e.m);
    var lp = keep(v, ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.6;
    var g = keep(v, ctx.createGain()); pluck(g, t, REF * db(-10) * 3.2 * e.v, att, dec);
    o.connect(lp); lp.connect(g); g.connect(out); run(v, o, t, end);
  }
  function pad(e, t, out, spb) {
    var dur = e.d * spb, att = 1.2, rel = 1.5, end = t + dur + rel + 0.02, v = voice(t, end, 'pad'); if (!v) return;
    var lp = keep(v, ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
    var g = keep(v, ctx.createGain()), peak = REF * db(-24) * 4.5;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + att);
    g.gain.setValueAtTime(peak, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + rel);
    var tr = keep(v, ctx.createGain()); tr.gain.value = 1 - 0.35 / 2;      /* eighth-rate tremolo, depth .35 */
    var l = keep(v, ctx.createOscillator()); l.setPeriodicWave(cosWave); l.frequency.value = 1 / (spb / 2);
    var lg = keep(v, ctx.createGain()); lg.gain.value = 0.35 / 2; l.connect(lg); lg.connect(tr.gain);
    for (var i = 0; i < e.m.length; i++) {
      for (var s = -1; s <= 1; s += 2) {
        var o = keep(v, ctx.createOscillator()); o.type = 'sawtooth'; o.frequency.value = hz(e.m[i]); o.detune.value = 7 * s;
        var og = keep(v, ctx.createGain()); og.gain.value = 1 / 6; o.connect(og); og.connect(lp); run(v, o, t, end);
      }
    }
    lp.connect(g); g.connect(tr); tr.connect(out); run(v, l, t, end);
  }
  function bell(e, t, out) {
    var att = 0.006, dec = 1.8, end = t + att + dec + 0.04, v = voice(t, end, 'bell'); if (!v) return;
    var f = hz(e.m), c = keep(v, ctx.createOscillator()); c.frequency.value = f;
    var mo = keep(v, ctx.createOscillator()); mo.frequency.value = f * 3.5;
    var mg = keep(v, ctx.createGain()), dev = 2 * f * 3.5;               /* index 2, easing to 0.4 so the tail is round */
    mg.gain.setValueAtTime(dev, t); mg.gain.exponentialRampToValueAtTime(dev * 0.2, t + dec);
    mo.connect(mg); mg.connect(c.frequency);
    var g = keep(v, ctx.createGain()); pluck(g, t, REF * db(-16) * 2.5, att, dec);
    c.connect(g); g.connect(out); run(v, c, t, end); run(v, mo, t, end);
  }
  function thump(e, t, out) {
    var end = t + 0.11, v = voice(t, end, 'thump'); if (!v) return;
    var o = keep(v, ctx.createOscillator()); o.frequency.value = 55;
    var g = keep(v, ctx.createGain()); pluck(g, t, REF * db(-6), 0.006, 0.064);
    o.connect(g); g.connect(out); run(v, o, t, end);
  }
  function brush(e, t, out) {
    var end = t + 0.08, v = voice(t, end, 'brush'); if (!v) return;
    var s = keep(v, ctx.createBufferSource()); s.buffer = noise;
    var bp = keep(v, ctx.createBiquadFilter()); bp.type = 'bandpass'; bp.frequency.value = 4000; bp.Q.value = 0.9;
    var g = keep(v, ctx.createGain()); pluck(g, t, REF * db(-26) * 4, 0.006, 0.034);
    s.connect(bp); bp.connect(g); g.connect(out); run(v, s, t, end);
  }

  /* 620 U2: 'tek', a 25 ms pitched click (a triangle near 2.5 kHz), Gem Cut's off-beat: pitched, never noise (Marth hears noise as scratches) */
  function tek(e, t, out) {
    var end = t + 0.04, v = voice(t, end, 'brush'); if (!v) return;
    var o = keep(v, ctx.createOscillator()); o.type = 'triangle'; o.frequency.value = e.v >= 1 ? 2500 : 2800;
    var g = keep(v, ctx.createGain()); pluck(g, t, REF * db(-20) * e.v, 0.002, 0.022); o.connect(g); g.connect(out); run(v, o, t, end);
  }
  /* ---------- the scheduler (two clocks) ---------- */
  var PAN = { harp: -0.18, mel: 0.06, bass: 0, pad: 0.12, bell: 0.25, thump: 0, brush: 0.2, tek: 0.3, brass: -0.08, orn: 0.1 };   /* 658 U6: orn */   /* 620 U2: tek, brass */
  function newSession(variant, t0, startBar, fadeIn) {
    var spb = 60 / TEMPO[variant], s = { variant: variant, spb: spb, loopLen: (BARS_OF[variant] || BARS) * (BEATS_OF[variant] || BEATS) * spb, ev: SCORES[variant] || (SCORES[variant] = build(variant)) };
    s.gain = ctx.createGain(); s.gain.connect(bus);
    if (fadeIn > 0) { s.gain.gain.setValueAtTime(0, t0); s.gain.gain.linearRampToValueAtTime(1, t0 + fadeIn); } else s.gain.gain.value = 1;
    s.strips = {};
    for (var k in PAN) { var p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(); if (p.pan) p.pan.value = PAN[k]; p.connect(s.gain); s.strips[k] = p; }
    var bars = BARS_OF[variant] || BARS, beats = BEATS_OF[variant] || BEATS, off = (Math.max(1, Math.min(bars, startBar || 1)) - 1) * beats;   /* 658: the variant's own bar */
    s.loopStart = t0 - off * spb; s.idx = 0;
    while (s.idx < s.ev.length && s.ev[s.idx].b < off) s.idx++;
    return s;
  }
  function pump(s, until) {
    var now = ctx.currentTime;
    if (s.loopStart + s.loopLen < now - 1) {                 /* hidden a long while: jump whole loops by the audio clock */
      var n = Math.floor((now - s.loopStart) / s.loopLen); s.loopStart += n * s.loopLen; s.idx = 0;
    }
    for (var guard = 0; guard < 4000; guard++) {
      if (s.idx >= s.ev.length) { s.idx = 0; s.loopStart += s.loopLen; }
      var e = s.ev[s.idx], t = s.loopStart + e.b * s.spb;
      if (t >= until) break;
      s.idx++;
      if (t < now - 0.08) continue;                          /* already past (we were asleep): skip, never burst */
      if (t < now) t = now;                                  /* a stall under 80 ms (a phone's first frames): late beats a hole (Obito D1) */
      if (only && only.indexOf(e.k) < 0) continue;
      var out = s.strips[e.k];
      switch (e.k) {
        case 'harp': harpLike(e, t, out, s.spb, false); break;
        case 'mel': if (s.muteMel && (s.muteMel === 'all' || s.muteMel[e.b])) break; stats.mel++; harpLike(e, t, out, s.spb, true); break;   /* 562: her taps play these; 657: 'all' = the whole melody is hers, tail and fade included */
        case 'bass': if (s.muteBass && s.muteMel === 'all' && s.muteBass[e.b]) { stats.bassLeft = (stats.bassLeft || 0) + 1; break; } stats.bassSong = (stats.bassSong || 0) + 1; bass(e, t, out); break;   /* 689: Expert's charted bass is hers to play (657's rule, by beat), only while the round's mute holds (so it never outlives the round) */
        case 'pad': pad(e, t, out, s.spb); break;
        case 'bell': bell(e, t, out); break;
        case 'thump': thump(e, t, out); break;
        case 'brush': brush(e, t, out); break;
        case 'orn': if (s.muteMel === 'all' && s.muteOrn) break; stats.orn = (stats.orn || 0) + 1; harpLike(e, t, out, s.spb, false); break;   /* 658 U6: the island's answers */
        case 'tek': stats.tek = (stats.tek || 0) + 1; tek(e, t, out); break;   /* 620 U2 */
        case 'brass': stats.brass = (stats.brass || 0) + 1; for (var bi = 0; bi < e.m.length; bi++) brass(e.m[bi], t, e.d * s.spb, REF * db(-8) * 0.7 * e.v, out); break;   /* 620 U2: the stabs */
      }
    }
  }
  function tick() { if (sess && ctx) pump(sess, ctx.currentTime + LOOKAHEAD); }
  function startTimer() { if (!timer && sess && !(typeof document !== 'undefined' && document.hidden)) { tick(); timer = setInterval(tick, TICK); } }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function retire(s, fade) {
    var t = ctx.currentTime; s.gain.gain.cancelScheduledValues(t); s.gain.gain.setValueAtTime(s.gain.gain.value, t);
    s.gain.gain.linearRampToValueAtTime(0, t + Math.max(0.02, fade));
    setTimeout(function () { try { s.gain.disconnect(); } catch (e) { /* gone */ } for (var k in s.strips) { try { s.strips[k].disconnect(); } catch (e) { /* gone */ } } }, (fade + 2.5) * 1000);
  }
  function hardStop() { stopTimer(); if (sess) { try { sess.gain.disconnect(); } catch (e) { /* gone */ } } sess = null; }

  function play(o) {
    o = o || {};
    if (!ctx || !bus) return false;
    var variant = o.variant === 'legend' || o.variant === 'gem' ? o.variant : 'home', fadeIn = o.fadeIn != null ? o.fadeIn : 1.5;
    if (isMuted) setMuted(!!isMuted());
    if (!o.restart && sess && sess.variant === variant && !sess.stopping) return true;   /* restart: from startBar, even if already playing (562) */
    if (!o.restart && sess && sess.variant === variant && sess.stopping) {   /* came back while fading out: fade back up, keep the place */
      ramp(sess.gain.gain, 1, Math.max(0.05, fadeIn)); sess.stopping = false; sess.muteMel = null; startTimer(); return true;   /* 657: the round's mute never outlives the round */
    }
    if (sess) { retire(sess, 0.6); stopTimer(); }
    sess = newSession(variant, ctx.currentTime + 0.06, o.startBar, fadeIn);
    if (o.muteMel === 'all') sess.muteMel = 'all'; else if (o.muteMel) { sess.muteMel = {}; o.muteMel.forEach(function (b) { sess.muteMel[b] = true; }); }
    sess.muteBass = null; if (o.muteBass && o.muteBass.length) { sess.muteBass = {}; o.muteBass.forEach(function (b) { sess.muteBass[b] = true; }); }   /* 689 */
    sess.muteOrn = !!o.muteOrn && !sess.muteBass;   /* 658 U6: an Expert round charts the island's answers: the song leaves them to her (only while the round's mute holds) */   /* 562: the charted notes are hers to play; 657: or every melody note */
    startTimer();
    return true;
  }
  /* 562: one melody note NOW, through the session's melody strip (so Mute still reaches it) */
  function note(m, beats, afterBeats) { if (!sess || !ctx) return false; stats.tapped++; stats.tapNow = ctx.currentTime; harpLike({ b: 0, k: 'mel', m: m, d: beats || 1, v: 1 }, ctx.currentTime + 0.005 + (afterBeats || 0) * sess.spb, sess.strips.mel, sess.spb, true); return true; }   /* 657: afterBeats = a pickup glued to her tap, at its own offset */
  function clearMute() { if (sess) sess.muteMel = null; }
  /* 562: the melody's events, bars from..to inclusive, in beats from bar 1 (the game must not reach into _test) */
  function melody(from, to, variant) { var v = variant || 'home', B = BEATS_OF[v] || BEATS; if (!READY[v]) return [];   /* 658: in the variant's own bar; a variant with no score has no melody */
    return build(v).filter(function (e) { return e.k === 'mel' && e.b >= (from - 1) * B && e.b < to * B; }).map(function (e) { var o = { b: e.b, m: e.m, d: e.d }; if (e.tier) o.tier = e.tier; return o; }); }
  /* 658: a song's clock, for the game (never through _test) */
  function info(variant) { var v = variant || 'home'; if (!TEMPO[v]) return null; return { id: v, tempo: TEMPO[v], beats: BEATS_OF[v], bars: BARS_OF[v], spb: 60 / TEMPO[v], loop: BARS_OF[v] * BEATS_OF[v] * 60 / TEMPO[v], ready: !!READY[v] }; }
  /* 658 U3: Expert's held notes, in beats from bar 1: the bar's chord root low (E2..D#3), held two bars and let go half a beat early (the brief's
     rule). A song with a score of its own (Gem Cut, 620 U2) adds its own to HOLDS_OF. */
  /* 658 U6: The Island Wakes' answers (Marth, Oct 16 ~01:55: "beautify the song and make it have slightly more notes on expert"): beat 2 of each
     section-A bar whose melody holds, a tone of that bar's chord (C: bars 10, 14, 18, 22; D: bars 12, 16, 20, 24). OURS/DRAFT, for his ear. */
  var ORN = { 10: 'E5', 12: 'A4', 14: 'G5', 16: 'F#5', 18: 'C5', 20: 'A4', 22: 'G4', 24: 'F#4' };
  function ornaments(from, to, variant) { if ((variant || 'home') !== 'home') return []; return build('home').filter(function (e) { return e.k === 'orn' && e.b >= (from - 1) * BEATS && e.b < to * BEATS; }).map(function (e) { return { b: e.b, m: e.m, d: e.d, orn: true }; }); }
  /* 689: the song's own bass, bars from..to inclusive, in beats from bar 1, for Expert's 4th lane. 'legend' (the slow harp) has no bass of its
     own: it is the island's harmony, so it lends the island's. */
  function bassline(from, to, variant) { var v = variant || 'home'; if (v === 'legend') v = 'home'; var B = BEATS_OF[v] || BEATS; if (!READY[v]) return [];
    return build(v).filter(function (e) { return e.k === 'bass' && e.b >= (from - 1) * B && e.b < to * B; }).map(function (e) { return { b: e.b, m: e.m }; }); }
  /* 689: one bass note NOW from her tap, on the session's bass strip (Mute and the volume reach it): the song's own bass voice at its exact
     pitch, and a soft harp an octave up so a phone's small speaker carries it (OURS/DRAFT, for her ear) */
  function bassNote(m) { if (!sess || !ctx) return false; stats.bassTapped = (stats.bassTapped || 0) + 1; var t = ctx.currentTime + 0.005;
    bass({ m: m, v: 1 }, t, sess.strips.bass); harpLike({ b: 0, k: 'harp', m: m + 12, d: 0.5, v: 0.55 }, t, sess.strips.bass, sess.spb, false); return true; }
  var HOLDS_OF = {};
  /* 620 U2 "GEM CUT" (Marth, Oct 15 ~23:55: "make it sound like the sand level in sonic or some egeyption shi"). ORIGINAL: composed here; no
     melody, riff or hook from any game's song. E Phrygian dominant (E F G# A B C D): the home chord is E major and the tune leans on the half
     step F to E; the step F up to G# is the desert colour. 4/4, quarter = 120, 16 bars = 32.0 s, a seamless loop; it shares The Island Wakes'
     E, so the two sound like one game.
       1-2   intro: the drone and the drum (not charted)
       3-6   A: the hook, a rising snake E-F-G#-A to a held B, and back down
       7-10  A': the answer, up to E5, closing F to E
       11-12 B: over F major, quick turns (most are Expert's)
       13-16 A'': the hook an octave up; the F-to-E cadence; the last beat leads back to bar 1
     Under it: the bass (root and fifth in eighths), the drone (root, fifth, octave on the pad), the deep drum on beat 1 and the and-of-2, a
     pitched click on every off-beat ('tek'), a finger-cymbal shimmer every 4th bar (bell), and brass stabs, F major then E major, at bars 6,
     10 and 16. The melody is the harp-pluck, played only by her taps in a round. Each note carries its tier (1 Normal, 2 Hard, 3 Expert):
     MEL tokens are note, beats, tier. Expert's held notes are the drone's root, two bars each (7). OURS/DRAFT: every note, for his ear. */
  var GEM = [
    'E4 1 1 F4 .5 2 G#4 .5 3 A4 1 1 B4 1 1', 'B4 3 1 A4 .5 2 G#4 .5 3', 'G#4 1 1 A4 .5 2 G#4 .5 3 F4 1 1 G#4 1 2', 'E4 3 1 B4 .5 2 C5 .5 3',
    'B4 1 1 C5 .5 2 D5 .5 3 E5 2 1', 'D5 .5 1 C5 .5 3 B4 1 2 C5 1 1 B4 1 2', 'A4 1 1 B4 .5 2 C5 .5 3 B4 1 1 A4 .5 2 G#4 .5 3', 'F4 2 1 E4 2 1',
    'A4 .5 1 C5 .5 3 F5 .5 2 E5 .5 3 D5 .5 1 C5 .5 3 A4 1 1', 'C5 .5 1 D5 .5 2 C5 .5 2 A4 .5 3 G#4 1 1 B4 1 2',
    'E5 1 1 F5 .5 2 G#5 .5 3 A5 1 1 B5 1 1', 'B5 3 1 A5 .5 2 G#5 .5 2', 'A5 1 1 G#5 .5 2 F5 .5 3 E5 1 1 F5 1 2', 'E5 3 1 B4 1 2'
  ];
  function gemRoot(bar) { return bar === 11 || bar === 12 ? 5 : 4; }   /* the pitch class under the bar: E, but F major under B */
  function buildGem() {
    var ev = [], bar, i, B = 4, b0, rb, bs, tok, at, d;
    for (bar = 1; bar <= 16; bar++) {
      b0 = (bar - 1) * B; rb = 36 + gemRoot(bar);   /* E2 = 40 */
      bs = [rb, rb, rb + 7, rb, rb, rb + 7, rb + 12, rb + 7]; for (i = 0; i < 8; i++) ev.push({ b: b0 + i * 0.5, k: 'bass', m: bs[i], d: 0.5, v: i % 4 === 0 ? 1 : 0.75 });
      ev.push({ b: b0, k: 'pad', m: [rb, rb + 7, rb + 12], d: B, v: 1 });
      ev.push({ b: b0, k: 'thump', m: 0, d: 0.2, v: 1 }); ev.push({ b: b0 + 1.5, k: 'thump', m: 0, d: 0.2, v: 0.8 });
      for (i = 0; i < 4; i++) ev.push({ b: b0 + i + 0.5, k: 'tek', m: 0, d: 0.1, v: i % 2 ? 1 : 0.7 });
      if (bar % 4 === 1) ev.push({ b: b0, k: 'bell', m: 76, d: 3, v: 1 });
      if (bar === 6 || bar === 10 || bar === 16) { ev.push({ b: b0 + 2, k: 'brass', m: [65, 69, 72], d: 0.5, v: 1 }); ev.push({ b: b0 + 3, k: 'brass', m: [64, 68, 71], d: 1, v: 1 }); }
      if (bar >= 3) { tok = GEM[bar - 3].split(/\s+/); at = b0; for (i = 0; i < tok.length; i += 3) { d = parseFloat(tok[i + 1]); ev.push({ b: at, k: 'mel', m: midi(tok[i]), d: d, v: 1, tier: +tok[i + 2] }); at += d; } }
    }
    ev.sort(function (a, b) { return a.b - b.b; }); return ev;
  }
  HOLDS_OF.gem = function (from, to) { var out = [], bar; for (bar = from; bar + 1 <= to; bar += 2) out.push({ b: (bar - 1) * 4, m: 36 + gemRoot(bar), d: 7.5 }); return out; };   /* two bars, let go half a beat early */
  function holds(from, to, variant) { var v = variant || 'home', B = BEATS_OF[v] || BEATS, out = [], bar, c; if (!READY[v]) return out;
    if (HOLDS_OF[v]) return HOLDS_OF[v](from, to);
    if (v !== 'home' && v !== 'legend') return out;
    for (bar = from; bar + 1 <= to; bar += 2) { c = CH[chordOf(bar)]; out.push({ b: (bar - 1) * B, m: 40 + ((c[0] + 8) % 12), d: 2 * B - 0.5 }); }
    return out; }
  /* 658 U3: the held note's sound, only while she holds it (657's law: only what she plays sounds). A soft pad (root + fifth, two saws each
     +-6 ct through a 700 Hz lowpass) on the session's pad strip, so Mute and the volume reach it; droneOff ramps it to 0 in 60 ms. */
  var drones = 0, lastDrone = null;
  function drone(m, secs) { if (!sess || !ctx) return null; var t = ctx.currentTime + 0.005, end = t + Math.max(0.3, secs || 4) + 0.4, v = voice(t, end, 'pad'); if (!v) return null;
    var lp = keep(v, ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.4;
    var g = keep(v, ctx.createGain()), pk = REF * db(-24) * 4.5, ms = [m, m + 7], i, s, o, og;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + 0.06);
    for (i = 0; i < 2; i++) for (s = -1; s <= 1; s += 2) { o = keep(v, ctx.createOscillator()); o.type = 'sawtooth'; o.frequency.value = hz(ms[i]); o.detune.value = 6 * s; og = keep(v, ctx.createGain()); og.gain.value = 1 / 4; o.connect(og); og.connect(lp); run(v, o, t, end); }
    lp.connect(g); g.connect(sess.strips.pad); drones++; stats.drone = (stats.drone || 0) + 1; lastDrone = { g: g, on: true }; return lastDrone;
  }
  function droneOff(h) { if (!h || !h.on || !ctx) return false; h.on = false; drones = Math.max(0, drones - 1); var t = ctx.currentTime; h.g.gain.cancelScheduledValues(t); h.g.gain.setValueAtTime(h.g.gain.value, t); h.g.gain.linearRampToValueAtTime(0, t + 0.06); return true; }
  function droneInfo() { return { count: drones, level: lastDrone ? lastDrone.g.gain.value : null, on: !!(lastDrone && lastDrone.on), made: stats.drone || 0 }; }
  function latency() { return ctx ? (ctx.outputLatency || 0) + (ctx.baseLatency || 0) : 0; }
  function stop(o) {
    if (!sess || !ctx) return;
    var fade = (o && o.fade != null) ? o.fade : 1.2, s = sess;
    s.stopping = true; ramp(s.gain.gain, 0, Math.max(0.02, fade));
    var me = s;
    setTimeout(function () { if (sess === me && me.stopping) { stopTimer(); retire(me, 0.02); sess = null; } }, fade * 1000 + 50);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopTimer();
      else if (sess) startTimer();                         /* pump skips what is past by the audio clock */
    });
  }

  /* ---------- 544: "The Open Spot" (working title), the MISSION COMPLETE. sting - ORIGINAL (BRIEF_544_546 section 6) ----------
     G major, quarter = 140: a D5 triplet pickup, G5 dotted quarter, B5 eighth, D6 held; underneath IV -> V -> I (C, D, G) - not
     the Mario cadence, no melody from any game. A soft brass (two saws +-5 ct, a lowpass opening 900 -> 2400 Hz in 30 ms); the
     thump once on the downbeat; a bell on the last chord; then the two dots HEARD as bells (D6 at +1.2 s, G6 at +2.4 s).
     One pass on the audio clock through the music bus (mute and volume hold). Muted: nothing is scheduled at all. */
  var cueN = 0;
  function brass(m, t, dur, peak, out) {
    var end = t + dur + 0.26, v = voice(t, end, 'brass'); if (!v) return 0;
    var lp = keep(v, ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(900, t); lp.frequency.linearRampToValueAtTime(2400, t + 0.03); lp.frequency.linearRampToValueAtTime(1500, t + dur);
    var g = keep(v, ctx.createGain()); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.03);
    g.gain.setValueAtTime(peak * 0.8, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.22);
    for (var s = -1; s <= 1; s += 2) { var o = keep(v, ctx.createOscillator()); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = 5 * s;
      var og = keep(v, ctx.createGain()); og.gain.value = 0.5; o.connect(og); og.connect(lp); run(v, o, t, end); }
    lp.connect(g); g.connect(out); return 1;
  }
  function cue(name) {
    if (name !== 'mission' || !ctx || !bus) return 0;
    if (isMuted && isMuted()) return 0;                                     /* muted: schedule nothing (bench check 10) */
    var t0 = ctx.currentTime + 0.05, q = 60 / 140, n = 0, i, B = REF * db(-8) * 2.2, out = ctx.createGain();
    out.connect(bus); setTimeout(function () { try { out.disconnect(); } catch (e) { /* gone */ } }, 6000);
    for (i = 0; i < 3; i++) n += brass(midi('D5'), t0 + i * q / 3, q / 3 * 0.85, B * 0.8, out);
    n += brass(midi('G5'), t0 + q, q * 1.45, B, out);
    n += brass(midi('B5'), t0 + q * 2.5, q * 0.45, B, out);
    n += brass(midi('D6'), t0 + q * 3, q * 1.5 + 0.5, B, out);
    [['C4', 'E4', 'G4'], ['D4', 'F#4', 'A4'], ['G3', 'B3', 'D4']].forEach(function (ch, j) {
      var at = [0, q, q * 3][j], dur = [q * 0.9, q * 1.9, 1.6][j];
      ch.forEach(function (nm) { n += brass(midi(nm), t0 + at, dur, B * 0.32, out); }); });
    [['C3', 0], ['D3', q], ['G2', q * 3], ['G3', q * 3]].forEach(function (b) { bass({ m: midi(b[0]), v: 1 }, t0 + b[1], out); n++; });
    thump(null, t0 + q, out); n++;
    bell({ m: midi('G5') }, t0 + q * 3, out); n++;
    bell({ m: midi('D6') }, t0 + 1.2, out); n++;                               /* the second dot */
    bell({ m: midi('G6') }, t0 + 2.4, out); n++;                               /* the third dot */
    cueN += n; return n;
  }
  /* offline bench: schedule a whole render up front on an OfflineAudioContext (no timers, no fades) */
  function render(o) {
    stats = { scheduled: 0, dropped: 0, maxActive: 0 }; active = [];
    only = o.only || null;
    var s = newSession(o.variant || 'home', 0, o.startBar || 1, 0);
    pump(s, o.seconds);
    only = null;
    return { scheduled: stats.scheduled, dropped: stats.dropped, maxActive: stats.maxActive, loopLen: s.loopLen, spb: s.spb };
  }

  window.WFR_MUSIC = {
    cue: cue, cueCount: function () { return cueN; },
    init: init, play: play, stop: stop, setMuted: setMuted, setVolume: setVolume, note: note, clearMute: clearMute, melody: melody, info: info, holds: holds, ornaments: ornaments, bassline: bassline, bassNote: bassNote, drone: drone, droneOff: droneOff, droneInfo: droneInfo, latency: latency,
    get playing() { return !!(sess && !sess.stopping); },
    get variant() { return sess ? sess.variant : null; },
    position: function () { if (!sess || !ctx) return null; var d = ctx.currentTime - sess.loopStart; if (d < 0) return d;   /* 701e: before the first beat */ /* the honest small negative time: wrapped, it read as the loop's END and a song started from bar 1 (Gem Cut) ended its round at once */
      return d % sess.loopLen; },
    LOOP_SECONDS: BARS * BEATS * 60 / TEMPO.home,   /* 657: derived, never a second copy of the tempo */
    muteLevel: function () { return muteG ? muteG.gain.value : null; },   /* the bench: does the game's mute button reach this bus */
    _test: { render: render, score: function (v) { return build(v || 'home'); }, stats: function () { return stats; }, session: function () { return sess ? { variant: sess.variant, muteMel: sess.muteMel, spb: sess.spb, tempo: TEMPO[sess.variant], stopping: !!sess.stopping } : null; } }   /* 657: the guard reads the session */
  };
})();
