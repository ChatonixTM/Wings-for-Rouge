/* Wings for Rouge: the orchestra (window.WFR_ORCH) - boards 547 + 548. Two variations of "The Island Wakes" on recorded
   instruments, from Itachi's BRIEF_547_548_OWL_DOVE_MUSIC_2026-10-09.md (sections D, E, F), with Izumi's corrections.
   ORIGINAL music: both pieces are built only from The Island Wakes (music.js); no melody, riff or hook from anything else.

   Samples: VSCO 2 Community Edition by Versilian Studios, CC0 (credit to Versilian Studios / Sam Gossner, as their
   Readme.txt asks; https://versilian-studios.com/vsco-community/). Readme.txt also asks that the samples themselves are
   not sold directly. music.js is NOT touched by this file and nothing here changes the home song.

   "The Owl's Hour"  E minor, 3/4, quarter = 69, 24 bars = 62.61 s, a SEAMLESS LOOP. Intro 4 . A' 16 (home melody bars 9-24,
                     8vb in the cellos) . Tail 4 (the intro without the roll). Em | C/E | G/E | D/E over a contrabass pedal E2,
                     viola tremolo bed (3rd + 5th, retriggered per bar, 300 ms equal-power crossfade), harp R3-5-R4 pp,
                     horn countermelody bars 13-21, timpani E2 on bars 5, 9, 13, 17 and a roll in bars 3-4. Hall wet -12 dB.
   "After the Dove"  G major, 3/4, quarter = 76, 32 bars (ritardando x0.88 per bar over bars 30-32) = 77.9 s, a ONE-SHOT that
                     ends on a rolled G chord and stops by itself. Intro 4 (harp) . B' 16 (home bars 25-40 on the flute, harp,
                     cellos) . A' 8 (home bars 9-16, 8vb cellos, flute countermelody) . Coda 4. Hall wet -9 dB.

   PITCH-READ (Node, YIN on a steady 200 ms window + the median over the sustain; Oct 9 2026): the VSCO filenames for
   cello, viola, contrabass, F horn and flute are an octave BELOW scientific pitch (susvib_C3 sounds C4 = 261.7 Hz);
   the harp's names are scientific (KSHarp_E3 = 164.7 Hz). Every `base` below is the MEASURED pitch (float MIDI), so
   playbackRate also corrects the sample's tuning (most harp notes read ~10 cents flat). Timpani: drum 1 is the lowest
   of the five (principal ~89.6 Hz, F2 +45 c); E2 plays it 1.5 semitones down.
   ENTRY POINTS (measured): the soft (v1) cello and viola recordings swell slowly (cellos reach -6 dB of their body after
   0.1-0.5 s; the viola tremolo keeps growing for 2-3 s). Played from their first sample, every melody note would swell
   and land late. So each sustained recording is ENTERED at a measured point: melody voices at the -6 dB point of the
   body, beds at the start of their flattest 2.9 s; our own envelope makes the attack. Legato joins: the old note
   releases over 60 ms from the beat while the new one fades in over 60 ms centred on the beat (the brief's 60 ms
   overlap). A phrase's first note uses the brief's attack (strings 120 ms, horn 60, flute 80), centred on the beat too.
   Departures from the brief, forced by what the samples measured (say so to Marth):
     - The horn has no sample between C4 and D5 (VSCO's "D4" file sounds D5). So the held-note doublings at bars 8 and
       12 sound an octave BELOW the cellos (E3, A3), and bar 18's countermelody note E4 became D4 (unison with the
       cellos). Every horn note is then within 2.1 semitones of a recording.
     - The dove's low cellos need two extra samples (B2, D3), not three: A2..A3 is covered within 2 semitones.
     - The Owl's "swell": the viola bed rises pp -> p under the countermelody (bars 13-20) and returns to pp by bar 23.

   API (in the page; the module also loads in Node for the scores, as pictograms.js does)
     WFR_ORCH.SAMPLES                       id -> [VSCO path, base MIDI (measured), onset s in the raw WAV, reference RMS of
                                            the part that plays, entry s after the onset]
     WFR_ORCH.prepare(ctx, id, audioBuffer) a decoded RAW VSCO WAV -> MONO, cut from (onset + entry - 5 ms) for 3.4 s
                                            (harp/timpani 3.5 s, the roll 5.6 s), normalised to a common RMS. 19.4 MB for all
                                            33 at 44.1 kHz (measured; ~21 MB at 48 kHz). The scores read at most 3.3 s of
                                            a sustain, 3.0 s of a harp note, 2.6 s of a hit, 5.0 s of the roll, so the
                                            shipped crops can be that long. (Encoded crops must make the same cut.)
     WFR_ORCH.render(ctx, { variant, samples, seconds, hall, only, prepared })
                                            offline: schedules the whole piece on an OfflineAudioContext. samples = id ->
                                            decoded AudioBuffer (raw unless prepared: true). Returns the stats.
     WFR_ORCH.init(ctx, dest, { isMuted, hall })   live: the bus (+ the hall unless hall === false)
     WFR_ORCH.setSamples(map)               live: id -> PREPARED AudioBuffer. Missing ids are skipped and counted, never thrown.
     WFR_ORCH.play({ variant, fadeIn, startBar }) / stop({ fade }) / setMuted(b) / setVolume(v)
     WFR_ORCH.playing / .variant / .stats() / .score(variant) / .INFO
   CPU: one AudioBufferSourceNode + one GainNode per note, voices capped (harp 28, all 36), both disconnected on end; one
   panner per instrument per session; one ConvolverNode (2.4 s, seeded, generated at init; optional).
   Scheduling: the two-clocks pattern (25 ms tick, 120 ms lookahead, notes ordered by their START, which may lead the
   beat by up to 60 ms); hidden -> the tick stops, and on return anything past is SKIPPED (no burst); a one-shot past its
   end simply ends. The numbers say where the energy is; Marth's ear (speaker AND earbuds) is the real test. */
(function () {
  'use strict';

  /* ---------- the samples: id -> [VSCO 2 CE path, base MIDI (measured), onset s, reference RMS, entry s] ---------- */
  var SAMPLES = {
    cello_B2: ['Strings/Cello Section/susvib/susvib_B1_v1_1.wav', 47.00, 0.059, 0.0285, 0.26],
    cello_D3: ['Strings/Cello Section/susvib/susvib_D2_v1_1.wav', 50.01, 0.028, 0.0239, 0.49],
    cello_F3: ['Strings/Cello Section/susvib/susvib_F2_v1_1.wav', 53.01, 0.010, 0.0145, 0.19],
    cello_A3: ['Strings/Cello Section/susvib/susvib_A2_v1_1.wav', 56.99, 0.018, 0.0176, 0.26],
    cello_C4: ['Strings/Cello Section/susvib/susvib_C3_v1_1.wav', 60.00, 0.027, 0.0167, 0.26],
    cello_E4: ['Strings/Cello Section/susvib/susvib_E3_v1_1.wav', 63.99, 0.010, 0.0175, 0.10],
    cello_G4: ['Strings/Cello Section/susvib/susvib_G3_v1_1.wav', 67.01, 0.018, 0.0187, 0.12],
    cello_B4: ['Strings/Cello Section/susvib/susvib_B3_v1_1.wav', 71.00, 0.001, 0.0110, 0.10],
    cello_D5: ['Strings/Cello Section/susvib/susvib_D4_v1_1.wav', 74.01, 0.152, 0.0099, 0.23],
    viola_G3: ['Strings/Viola Section/trem/Violas_trem_G2_v1_rr1.wav', 55.10, 0.002, 0.0033, 2.96],
    viola_B3: ['Strings/Viola Section/trem/Violas_trem_B2_v1_rr1.wav', 59.00, 0.009, 0.0025, 1.48],
    viola_D4: ['Strings/Viola Section/trem/Violas_trem_D3_v1_rr1.wav', 61.99, 0.004, 0.0026, 2.75],
    bass_E2: ['Strings/Solo Contrabass/SusVib/BKCtbss_SusVib_E1_v1_rr1.wav', 40.00, 0.000, 0.0026, 2.77],
    horn_F3: ['Brass/F Horn/sus/MOHorn_sus_F2_v1_1.wav', 52.95, 0.000, 0.0067, 0.00],
    horn_A3: ['Brass/F Horn/sus/MOHorn_sus_A2_v1_1.wav', 56.98, 0.000, 0.0186, 0.04],
    horn_C4: ['Brass/F Horn/sus/MOHorn_sus_C3_v1_1.wav', 59.99, 0.000, 0.0138, 0.10],
    timp_p: ['Percussion/Timpani/Timpani1_Hit_v1_rr1_Sum.wav', 41.43, 0.000, 0.0003, 0],
    timp_mf: ['Percussion/Timpani/Timpani1_Hit_v3_rr1_Sum.wav', 41.45, 0.001, 0.0053, 0],
    timp_roll: ['Percussion/Timpani/Rolls/Timpani1_Roll_v3_rr1_Sum.wav', 41.58, 0.001, 0.0081, 0],
    harp_C3: ['Strings/Harp/KSHarp_C3_mf.wav', 47.98, 0.000, 0.0053, 0],
    harp_E3: ['Strings/Harp/KSHarp_E3_mf.wav', 51.99, 0.044, 0.0084, 0],
    harp_G3: ['Strings/Harp/KSHarp_G3_mf.wav', 54.97, 0.063, 0.0177, 0],
    harp_B3: ['Strings/Harp/KSHarp_B3_mf.wav', 58.90, 0.032, 0.0177, 0],
    harp_D4: ['Strings/Harp/KSHarp_D4_mf.wav', 61.90, 0.019, 0.0186, 0],
    harp_F4: ['Strings/Harp/KSHarp_F4_mf.wav', 65.00, 0.010, 0.0288, 0],
    harp_A4: ['Strings/Harp/KSHarp_A4_mf.wav', 68.90, 0.021, 0.0181, 0],
    harp_C5: ['Strings/Harp/KSHarp_C5_mf.wav', 71.91, 0.025, 0.0165, 0],
    harp_E5: ['Strings/Harp/KSHarp_E5_mf.wav', 75.89, 0.023, 0.0257, 0],
    harp_G5: ['Strings/Harp/KSHarp_G5_mf.wav', 78.93, 0.017, 0.0080, 0],
    flute_E5: ['Woodwinds/Flute/susvib/LDFlute_susvib_E4_v1_1.wav', 76.01, 0.005, 0.0451, 0.03],
    flute_A5: ['Woodwinds/Flute/susvib/LDFlute_susvib_A4_v1_1.wav', 81.02, 0.002, 0.0523, 0.02],
    flute_C6: ['Woodwinds/Flute/susvib/LDFlute_susvib_C5_v1_1.wav', 83.97, 0.005, 0.0914, 0.04],
    flute_E6: ['Woodwinds/Flute/susvib/LDFlute_susvib_E5_v1_1.wav', 88.01, 0.005, 0.0990, 0]
  };
  var NORM_RMS = 0.1;          /* every prepared buffer is scaled so its reference RMS is this */
  var PRE = 0.005;             /* the cut starts 5 ms before the entry point */
  function kindOf(id) { return id.split('_')[0]; }
  function cropOf(id) { return id === 'timp_roll' ? 5.6 : (/^(harp|timp)_/.test(id) ? 3.5 : 3.4); }

  /* ---------- instruments: envelope (brief F.1), level, pan ---------- */
  var INST = {
    cello: { att: 0.12, rel: 0.25, lvl: 1.00, pan: 0.22 },
    viola: { att: 0.12, rel: 0.25, lvl: 0.60, pan: -0.12 },
    bass:  { att: 0.12, rel: 0.25, lvl: 0.75, pan: 0.30 },
    horn:  { att: 0.06, rel: 0.25, lvl: 0.80, pan: -0.22 },
    timp:  { att: 0.001, rel: 0.25, lvl: 0.90, pan: 0.04 },
    harp:  { att: 0.002, rel: 0.25, lvl: 0.50, pan: -0.28 },
    flute: { att: 0.08, rel: 0.25, lvl: 0.95, pan: -0.04 }
  };
  var DYN = { pp: 0.30, p: 0.45, mp: 0.63, mf: 0.85 };
  /* the mix, per piece (dB on top of lvl x velocity), set from the bench's stem balance (each stem's RMS over the bars
     where it plays, re the lead): Owl - horn countermelody -6, viola bed -13 (pp) / -10 (p), pedal -12, harp -12,
     timpani mf hit -4 (500 ms), roll -8; Dove - low cellos -6 (they are dense in energy, low in loudness), harp -10 */
  var MIX = { owl: { horn: -4.4, viola: -3.7, bass: -1.3, harp: 4.2, timp: -4.3 }, dove: { harp: -2 } };
  var XFADE = 0.3;                       /* beds: 300 ms equal-power crossfade at each barline */
  var LEG_ATT = 0.06, LEG_REL = 0.06;    /* legato joins (see the header) */
  /* session level per variant, calibrated offline (Oct 9) so the loudest section's RMS matches the home song's A/B (0.018;
     the dove's B' 0.0165, a touch softer): peaks then ~0.09, under the 0.13 ceiling */
  var LEVEL = { owl: 0.219, dove: 0.252 };
  var WET = { owl: Math.pow(10, -12 / 20), dove: Math.pow(10, -9 / 20) };
  var MAX_LOW = 28, HARD_CAP = 36, LOOKAHEAD = 0.12, TICK = 25, IR_SEC = 2.4;

  var POOL = {};               /* instrument -> [[id, base] sorted by base]; the timpani are named, not looked up */
  (function () {
    for (var id in SAMPLES) { var k = kindOf(id); if (k !== 'timp') (POOL[k] = POOL[k] || []).push([id, SAMPLES[id][1]]); }
    for (k in POOL) POOL[k].sort(function (a, b) { return a[1] - b[1]; });
  })();
  /* nearest recording by semitone distance; a tie (within 0.05) goes to the sample above (repitched down) */
  function nearest(k, m) {
    var p = POOL[k], best = null, bd = 1e9;
    for (var i = 0; i < p.length; i++) { var d = Math.abs(m - p[i][1]); if (d < bd - 0.05 || (Math.abs(d - bd) <= 0.05 && p[i][1] > m)) { bd = d; best = p[i][0]; } }
    return best;
  }

  /* ---------- the score ---------- */
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) { var pc = PC[n[0]], i = 1; if (n[1] === '#') { pc++; i = 2; } return 12 * (parseInt(n.slice(i), 10) + 1) + pc; }
  var CH = { Em: [4, 3], C: [0, 4], G: [7, 4], D: [2, 4], Am: [9, 3] };   /* root pitch class, third in semitones */
  /* The Island Wakes, home bars 9-40: a COPY of music.js's MEL (the bench checks it against WFR_MUSIC's own score) */
  var MEL = [
    'B4 1 E5 1 G5 1', 'A5 2 G5 1', 'F#5 1 G5 1 D5 1', 'E5 3',
    'B4 1 E5 1 G5 1', 'A5 2 B5 1', 'D6 1.5 B5 .5 G5 1', 'A5 3',
    'G5 1 F#5 1 E5 1', 'E5 2 D5 1', 'D5 1 B4 1 D5 1', 'F#5 3',
    'G5 1 E5 1 B4 1', 'C5 2 D5 1', 'B4 1.5 A4 .5 G4 1', 'A4 2 B4 1',
    'E5 1 G5 1 C6 1', 'B5 2 G5 1', 'A5 1 B5 1 C6 1', 'A5 3',
    'E5 1 G5 1 C6 1', 'B5 2 D6 1', 'A5 1.5 F#5 .5 A5 1', 'G5 3',
    'C6 1 B5 1 A5 1', 'G5 2 B5 1', 'C6 1 B5 1 A5 1', 'F#5 3',
    'E5 1 G5 1 A5 1', 'B5 2 A5 1', 'F#5 1 E5 1 D5 1', 'E5 3'
  ];
  var SCALE = [7, 9, 11, 0, 2, 4, 6];        /* G major */

  function timeMap(tempo, bars, rit) {      /* rit = { from, k }: bar n >= from plays at tempo * k^(n - from + 1) */
    var st = [], sp = [], t = 0;
    for (var b = 1; b <= bars; b++) {
      var s = 60 / tempo; if (rit && b >= rit.from) s /= Math.pow(rit.k, b - rit.from + 1);
      sp[b] = s; st[b] = t; t += 3 * s;
    }
    return { at: function (bar, beat) { return st[bar] + beat * sp[bar]; }, len: t };
  }
  var TM = { owl: function () { return timeMap(69, 24); }, dove: function () { return timeMap(76, 32, { from: 30, k: 0.88 }); } };
  /* "B4 1 E5 1 r 1" -> notes in seconds; tr transposes; slur marks the line for legato joins (contiguous notes of the
     same instrument, across barlines too); breath (beats) shortens the bar's final note */
  function line(ev, tm, bar, str, k, v, o) {
    o = o || {};
    var tok = str.split(/\s+/), at = 0;
    for (var i = 0; i < tok.length; i += 2) {
      var d = parseFloat(tok[i + 1]);
      if (tok[i] !== 'r') {
        var beats = d - (i + 2 >= tok.length && o.breath ? o.breath : 0), t = tm.at(bar, at);
        ev.push({ t: t, k: k, m: midi(tok[i]) + (o.tr || 0), d: tm.at(bar, at + beats) - t, v: v, slur: !!o.slur, mel: !!o.mel, beat: (bar - 1) * 3 + at });
      }
      at += d;
    }
  }
  function harpFigure(ev, tm, bar, chord, v, full) {
    var c = CH[chord], r3 = 48 + c[0], i;
    var arp = full ? [r3, r3 + 7, r3 + 12, r3 + 12 + c[1], r3 + 19, r3 + 12] : [r3, r3 + 7, r3 + 12];
    for (i = 0; i < arp.length; i++) {
      var beat = full ? i * 0.5 : i, acc = full ? (i === 0 ? 1 : (i === 3 ? 0.85 : 0.72)) : (i === 0 ? 1 : 0.82);
      ev.push({ t: tm.at(bar, beat), k: 'harp', m: arp[i], d: 2.5, v: v * acc, pluck: true });
    }
  }

  function buildOwl() {
    var tm = TM.owl(), ev = [], bar, LOOP4 = ['Em', 'C', 'G', 'D'];
    var BED = { Em: ['G3', 'B3'], C: ['G3', 'E4'], G: ['B3', 'D4'], D: ['F#3', 'A3'] };
    var HORN = { 8: 'E3 3', 12: 'A3 3', 13: 'E3 2 G3 1', 14: 'A3 2 B3 1', 15: 'B3 3', 16: 'A3 2 C4 1', 17: 'B3 3',
      18: 'C4 2 D4 1', 19: 'D4 2 B3 1', 20: 'A3 2 F#3 1', 21: 'E3 3' };
    var SWELL = { 13: 0.25, 14: 0.5, 15: 0.75, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 0.66, 22: 0.33 };
    var TIMP = { 5: ['timp_p', DYN.p], 9: ['timp_mf', DYN.mp], 13: ['timp_mf', DYN.mp], 17: ['timp_mf', DYN.mf] };
    for (bar = 1; bar <= 24; bar++) {
      var ch = LOOP4[(bar - 1) % 4], t0 = tm.at(bar, 0), barSec = tm.at(bar, 3) - t0;
      harpFigure(ev, tm, bar, ch, DYN.pp, false);
      var bedV = DYN.pp + (DYN.p - DYN.pp) * (SWELL[bar] || 0);
      for (var i = 0; i < 2; i++) ev.push({ t: t0, k: 'viola', m: midi(BED[ch][i]), d: barSec, v: bedV, bed: true });
      ev.push({ t: t0, k: 'bass', m: 40, d: barSec, v: DYN.pp, bed: true });
      if (bar >= 5 && bar <= 20) line(ev, tm, bar, MEL[bar - 5], 'cello', DYN.mf, { tr: -12, slur: true, mel: true });
      if (HORN[bar]) line(ev, tm, bar, HORN[bar], 'horn', bar <= 12 ? DYN.p : DYN.mp, { slur: bar >= 13 });
      if (TIMP[bar]) ev.push({ t: t0, k: 'timp', id: TIMP[bar][0], m: 40, d: 2.5, v: TIMP[bar][1], pluck: true });
      if (bar === 3) ev.push({ t: t0, k: 'timp', id: 'timp_roll', m: 40, d: tm.at(5, 0) - t0, v: DYN.mp, from: DYN.pp, roll: true });
    }
    return finish(ev, tm.len, false);
  }

  function buildDove() {
    var tm = TM.dove(), ev = [], bar, i;
    var CHD = [null, 'G', 'Em', 'C', 'D', 'C', 'G', 'Am', 'D', 'C', 'G', 'D', 'Em', 'C', 'G', 'Am', 'D', 'C', 'G', 'D', 'Em',
      'Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D', 'G', 'G', 'C', 'G'];
    var CELLO_B = ['C3 3', 'B2 3', 'A2 3', 'D3 3', 'C3 2 E3 1', 'D3 2 G3 1', 'F#3 2 A3 1', 'E3 3',
      'C3 3', 'B2 3', 'A2 3', 'D3 3', 'C3 2 D3 1', 'D3 2 G3 1', 'F#3 2 A3 1', 'G3 2 E3 1'];
    var FLUTE_A = ['r 3', 'r 1 E5 2', 'D5 3', 'F#5 1 A5 2', 'G5 3', 'r 1 E5 2', 'G5 2 D5 1', 'F#5 3'];
    for (bar = 1; bar <= 31; bar++) {
      var hv = DYN.p * (bar === 30 ? 0.9 : bar === 31 ? 0.8 : 1);
      harpFigure(ev, tm, bar, CHD[bar], hv, true);
      if (bar === 1) {                                      /* the upward sweep, bar 1 only (home code) */
        var c = CH.G, si = SCALE.indexOf(c[0]), m = 48 + c[0] + 12;
        for (i = 0; i < 8; i++) {
          ev.push({ t: tm.at(1, i / 12), k: 'harp', m: m, d: 1.2, v: DYN.p * (0.32 + i * 0.04), pluck: true });
          var nx = SCALE[(si + 1) % 7]; m += (nx - SCALE[si] + 12) % 12; si = (si + 1) % 7;
        }
      }
      if (bar >= 5 && bar <= 20) {
        line(ev, tm, bar, MEL[16 + bar - 5], 'flute', DYN.mp, { slur: true, mel: true, breath: (bar % 4 === 0) ? 0.25 : 0 });
        line(ev, tm, bar, CELLO_B[bar - 5], 'cello', 0.28, { slur: true });          /* p under the flute (measured: DYN.p sat 1.7 dB under it) */
      }
      if (bar >= 21 && bar <= 28) {
        line(ev, tm, bar, MEL[bar - 21], 'cello', DYN.mp, { tr: -12, slur: true, mel: true });
        line(ev, tm, bar, FLUTE_A[bar - 21], 'flute', 0.35, { slur: true });         /* p, ~5 dB under the cellos' melody */
      }
      if (bar === 29) { line(ev, tm, 29, 'G5 2', 'flute', DYN.p, { slur: true }); line(ev, tm, 29, 'G3 3', 'cello', DYN.p, { slur: true }); }
    }
    var roll = ['G3', 'B3', 'D4', 'G4', 'B4'], t32 = tm.at(32, 0);       /* bar 32: one rolled chord, ringing 3 s. End. */
    for (i = 0; i < roll.length; i++) ev.push({ t: t32 + i * 0.07, k: 'harp', m: midi(roll[i]), d: 2.6 - i * 0.07, v: DYN.p * (i === 0 ? 1 : 0.85), pluck: true, rel: 0.4 });
    return finish(ev, tm.len, true);
  }
  /* legato flags, start times (a note may lead its beat), release, end; events ordered by START */
  function finish(ev, len, once) {
    var byK = {}, i, e, end = 0;
    ev.forEach(function (x) { if (x.slur) (byK[x.k] = byK[x.k] || []).push(x); });
    for (var k in byK) {
      var a = byK[k].sort(function (p, q) { return p.t - q.t; });
      for (i = 0; i + 1 < a.length; i++) if (Math.abs(a[i + 1].t - (a[i].t + a[i].d)) < 0.005) { a[i].legOut = true; a[i + 1].legIn = true; }
    }
    for (i = 0; i < ev.length; i++) {
      e = ev[i];
      var sus = !e.pluck && !e.bed && !e.roll;
      e.att = sus ? (e.legIn ? LEG_ATT : INST[e.k].att) : INST[e.k].att;
      e.s = Math.max(0, e.t - (sus ? e.att / 2 : 0));
      e.r = e.rel || (e.bed ? XFADE : (e.legOut ? LEG_REL : INST[e.k].rel));
      end = Math.max(end, e.t + e.d + e.r);
    }
    ev.sort(function (p, q) { return p.s - q.s || p.t - q.t; });
    return { ev: ev, len: len, once: once, end: end };
  }
  var BUILD = { owl: buildOwl, dove: buildDove }, SCORES = {};
  function score(v) { return SCORES[v] || (SCORES[v] = BUILD[v]()); }

  /* ---------- buffers ---------- */
  function newBuffer(ctx, ch, n, sr) {
    if (typeof AudioBuffer === 'function') { try { return new AudioBuffer({ numberOfChannels: ch, length: n, sampleRate: sr }); } catch (e) { /* old Safari */ } }
    return ctx.createBuffer(ch, n, sr);
  }
  /* a decoded RAW VSCO WAV -> mono, cut from (onset + entry - 5 ms) for cropOf(id) s, scaled to NORM_RMS, 20 ms fade at the cut */
  function prepare(ctx, id, ab) {
    var sm = SAMPLES[id];
    if (!sm || !ab) return null;
    var sr = ab.sampleRate, a = Math.max(0, Math.round((sm[2] + sm[4] - PRE) * sr)), n = Math.max(1, Math.min(ab.length - a, Math.round(cropOf(id) * sr)));
    var out = newBuffer(ctx, 1, n, sr), d = out.getChannelData(0), chs = ab.numberOfChannels, k = NORM_RMS / sm[3] / chs, i, c;
    for (c = 0; c < chs; c++) { var x = ab.getChannelData(c); for (i = 0; i < n; i++) d[i] += x[a + i] * k; }
    var f = Math.min(n, Math.round(0.02 * sr)); for (i = 0; i < f; i++) d[n - 1 - i] *= i / f;
    return out;
  }
  /* the hall's impulse: seeded noise (the music.js generator), 12 ms pre-delay, 4 ms fade-in, exponential decay to
     -60 dB at 2.4 s, two one-pole lowpasses at 4 kHz, each channel scaled to unit energy (wet RMS ~ dry RMS before WET) */
  function makeIR(ctx, sec) {
    var sr = ctx.sampleRate, n = Math.round(sec * sr), b = newBuffer(ctx, 2, n, sr), pre = Math.round(0.012 * sr);
    var a1 = Math.exp(-2 * Math.PI * 4000 / sr);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c), s = c ? 33333 : 22222, y1 = 0, y2 = 0, e2 = 0, i;
      for (i = 0; i < n; i++) {
        s = (s * 16807) % 2147483647;
        var x = (s / 1073741823.5) - 1; y1 = (1 - a1) * x + a1 * y1; y2 = (1 - a1) * y1 + a1 * y2;
        var t = (i - pre) / sr; d[i] = i < pre ? 0 : y2 * Math.exp(-6.9078 * t / sec) * Math.min(1, t / 0.004);
        e2 += d[i] * d[i];
      }
      var k = 1 / Math.sqrt(e2 || 1); for (i = 0; i < n; i++) d[i] *= k;
    }
    return b;
  }

  /* ---------- the rig: bus (volume) -> highpass 30 Hz (no DC) -> lowpass 9 kHz (hiss of the soft layers) -> mute ---------- */
  var volume = 1;
  function makeRig(c, dest, hallOn, muted) {
    var r = { ctx: c, hall: null };
    r.bus = c.createGain(); r.bus.gain.value = volume;
    r.hp = c.createBiquadFilter(); r.hp.type = 'highpass'; r.hp.frequency.value = 30; r.hp.Q.value = 0.5;
    r.lp = c.createBiquadFilter(); r.lp.type = 'lowpass'; r.lp.frequency.value = 9000; r.lp.Q.value = 0.5;
    r.mute = c.createGain(); r.mute.gain.value = muted ? 0 : 1;
    r.bus.connect(r.hp); r.hp.connect(r.lp); r.lp.connect(r.mute); r.mute.connect(dest || c.destination);
    if (hallOn !== false && c.createConvolver) {
      r.hall = c.createConvolver(); r.hall.normalize = false; r.hall.buffer = makeIR(c, IR_SEC); r.hall.connect(r.bus);
    }
    return r;
  }

  /* ---------- voices ---------- */
  function newStats() { return { scheduled: 0, dropped: 0, missing: 0, wide: 0, maxActive: 0, active: 0, maxShift: {}, maxRead: {} }; }
  var stats = newStats(), active = [];   /* active = end times of live voices */
  var XF_IN = new Float32Array(32), XF_OUT = new Float32Array(32);
  (function () { for (var i = 0; i < 32; i++) { var p = i / 31 * Math.PI / 2; XF_IN[i] = Math.sin(p); XF_OUT[i] = Math.cos(p); } })();
  function scaled(curve, k) { var o = new Float32Array(curve.length); for (var i = 0; i < curve.length; i++) o[i] = curve[i] * k; return o; }

  /* one note: base = the session's loop start on the audio clock; now = the clock (-Infinity offline) */
  function voice(s, e, base, now) {
    var ctx = s.rig.ctx, I = INST[e.k], id = e.id || nearest(e.k, e.m), sm = SAMPLES[id], buf = s.bufs[id];
    if (!buf) { stats.missing++; return; }
    var ts = base + e.s, t = base + e.t;
    if (ts < now) { t += now - ts; ts = now; }              /* late (a stalled tick): the whole note moves, never a cut attack */
    var end = t + e.d + e.r, i = 0;
    while (i < active.length) { if (active[i] <= ts) active.splice(i, 1); else i++; }
    if (active.length >= (e.k === 'harp' ? MAX_LOW : HARD_CAP)) { stats.dropped++; return; }
    active.push(end); stats.scheduled++; if (active.length > stats.maxActive) stats.maxActive = active.length;
    var shift = e.m - sm[1], rate = Math.pow(2, shift / 12);
    if (!(Math.abs(shift) <= (stats.maxShift[e.k] || 0))) stats.maxShift[e.k] = +Math.abs(shift).toFixed(2);
    if (Math.abs(shift) > 3) stats.wide++;                 /* the scores keep every note within ~2 semitones of a recording */
    var read = (end + 0.02 - ts) * rate; if (!(read <= (stats.maxRead[id] || 0))) stats.maxRead[id] = +read.toFixed(2);
    var src = ctx.createBufferSource(), g = ctx.createGain(), pk = I.lvl * s.mix[e.k] * e.v, gp = g.gain;
    src.buffer = buf; src.playbackRate.value = rate; gp.value = 0;
    if (e.bed) {                                         /* equal-power in, hold, equal-power out */
      gp.setValueCurveAtTime(scaled(XF_IN, pk), t, XFADE);
      gp.setValueCurveAtTime(scaled(XF_OUT, pk), t + e.d, XFADE);
    } else if (e.roll) {                                 /* the timpani roll: pp -> mp, released into the downbeat */
      gp.setValueAtTime(0, t); gp.linearRampToValueAtTime(I.lvl * s.mix[e.k] * e.from, t + 0.05);
      gp.linearRampToValueAtTime(pk, t + e.d); gp.linearRampToValueAtTime(0, end);
    } else {                                             /* attack from the start (centred on the beat), hold, release */
      gp.setValueAtTime(0, ts); gp.linearRampToValueAtTime(pk, ts + e.att);
      gp.setValueAtTime(pk, Math.max(ts + e.att, t + e.d)); gp.linearRampToValueAtTime(0, end);
    }
    src.connect(g); g.connect(s.strips[e.k]);
    src.onended = function () { try { src.disconnect(); g.disconnect(); } catch (x) { /* gone */ } };
    src.start(ts, 0); src.stop(end + 0.02);
  }

  /* ---------- sessions + the scheduler (two clocks) ---------- */
  var rigLive = null, bufsLive = {}, isMuted = null, sess = null, timer = null, endTimer = null;
  function newSession(rig, bufs, variant, t0, startBar, fadeIn) {
    var c = rig.ctx, sc = score(variant), s = { rig: rig, bufs: bufs, variant: variant, ev: sc.ev, len: sc.len, once: sc.once, idx: 0, mix: {} };
    for (var m in INST) s.mix[m] = Math.pow(10, ((MIX[variant] || {})[m] || 0) / 20);
    s.gain = c.createGain(); s.gain.connect(rig.bus);
    if (fadeIn > 0) { s.gain.gain.setValueAtTime(0, t0); s.gain.gain.linearRampToValueAtTime(LEVEL[variant], t0 + fadeIn); } else s.gain.gain.value = LEVEL[variant];
    if (rig.hall) { s.send = c.createGain(); s.send.gain.value = WET[variant]; s.gain.connect(s.send); s.send.connect(rig.hall); }
    s.strips = {};
    for (var k in INST) { var p = c.createStereoPanner ? c.createStereoPanner() : c.createGain(); if (p.pan) p.pan.value = INST[k].pan; p.connect(s.gain); s.strips[k] = p; }
    var off = startBar > 1 ? TM[variant]().at(Math.min(startBar, variant === 'owl' ? 24 : 32), 0) : 0;
    s.loopStart = t0 - off;
    while (s.idx < s.ev.length && s.ev[s.idx].t < off - 1e-6) s.idx++;
    s.endAt = s.once ? s.loopStart + sc.end + IR_SEC : Infinity;
    return s;
  }
  function pump(s, until, now) {
    if (!s.once && s.loopStart + s.len < now - 1) { var n = Math.floor((now - s.loopStart) / s.len); s.loopStart += n * s.len; s.idx = 0; }
    for (var guard = 0; guard < 5000; guard++) {
      if (s.idx >= s.ev.length) { if (s.once) break; s.idx = 0; s.loopStart += s.len; }
      var e = s.ev[s.idx], ts = s.loopStart + e.s;
      if (ts >= until) break;
      s.idx++;
      if (ts < now - 0.08) continue;                         /* past (we were asleep): skip, never burst */
      if (s.only && s.only.indexOf(e.k) < 0) continue;
      voice(s, e, s.loopStart, now);
    }
  }
  function closeSession(s, delaySec) {
    setTimeout(function () {
      try { s.gain.disconnect(); } catch (x) { /* gone */ }
      if (s.send) { try { s.send.disconnect(); } catch (x) { /* gone */ } }
      for (var k in s.strips) { try { s.strips[k].disconnect(); } catch (x) { /* gone */ } }
    }, delaySec * 1000);
  }
  function tick() {
    if (!sess || !rigLive) return;
    var now = rigLive.ctx.currentTime;
    if (sess.once && now > sess.endAt) { endSession(); return; }
    pump(sess, now + LOOKAHEAD, now);
  }
  function endSession() { stopTimer(); if (sess) closeSession(sess, 0.05); sess = null; active = []; stats.active = 0; }
  function startTimer() { if (!timer && sess && !(typeof document !== 'undefined' && document.hidden)) { tick(); timer = setInterval(tick, TICK); } }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function init(c, dest, o) {
    if (!c) return false;
    o = o || {};
    if (typeof o.isMuted === 'function') isMuted = o.isMuted;
    if (rigLive && rigLive.ctx === c) return true;
    if (sess) endSession();
    stats = newStats(); active = [];
    rigLive = makeRig(c, dest, o.hall, isMuted && isMuted());
    return true;
  }
  function setSamples(map) { bufsLive = map || {}; }
  function ramp(p, to, sec) { var t = rigLive.ctx.currentTime; p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(to, t + sec); }
  function setMuted(m) { if (rigLive) ramp(rigLive.mute.gain, m ? 0 : 1, 0.03); }
  function setVolume(v) { volume = Math.max(0, Math.min(1, +v || 0)); if (rigLive) ramp(rigLive.bus.gain, volume, 0.08); }
  function play(o) {
    o = o || {};
    if (!rigLive || !BUILD[o.variant]) return false;
    var fadeIn = o.fadeIn != null ? o.fadeIn : 1.5;
    if (isMuted) setMuted(!!isMuted());
    if (sess && sess.variant === o.variant && !sess.stopping) return true;
    if (sess) { var old = sess; ramp(old.gain.gain, 0, 0.6); closeSession(old, 3.2); stopTimer(); }
    sess = newSession(rigLive, bufsLive, o.variant, rigLive.ctx.currentTime + 0.06, o.startBar || 1, fadeIn);
    startTimer();
    return true;
  }
  function stop(o) {
    if (!sess || !rigLive) return;
    var fade = (o && o.fade != null) ? o.fade : 1.2, me = sess;
    me.stopping = true; ramp(me.gain.gain, 0, Math.max(0.02, fade));
    clearTimeout(endTimer);
    endTimer = setTimeout(function () { if (sess === me) endSession(); }, fade * 1000 + 50);
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopTimer(); else if (sess) startTimer(); });
  }

  /* ---------- offline: the whole piece scheduled up front (no timers) ---------- */
  var prepCache = (typeof WeakMap === 'function') ? new WeakMap() : null;
  function render(ctx, o) {
    o = o || {};
    var variant = BUILD[o.variant] ? o.variant : 'owl', sc = score(variant), bufs = {}, mem = 0;
    for (var id in (o.samples || {})) {
      var raw = o.samples[id], b = o.prepared ? raw : (prepCache && prepCache.get(raw));
      if (!b) { b = prepare(ctx, id, raw); if (prepCache && !o.prepared && b) prepCache.set(raw, b); }
      if (b) { bufs[id] = b; mem += b.length * b.numberOfChannels * 4; }
    }
    stats = newStats(); active = [];
    var rig = makeRig(ctx, ctx.destination, o.hall, false), s = newSession(rig, bufs, variant, 0, o.startBar || 1, 0);
    s.only = o.only || null;
    pump(s, o.seconds != null ? o.seconds : (sc.once ? sc.end + IR_SEC : sc.len), -Infinity);
    return { variant: variant, scheduled: stats.scheduled, dropped: stats.dropped, missing: stats.missing, wide: stats.wide, maxActive: stats.maxActive,
      len: sc.len, once: sc.once, scoreEnd: sc.end, hall: !!rig.hall, bufferMB: +(mem / 1048576).toFixed(2), maxShift: stats.maxShift, maxRead: stats.maxRead };
  }

  var WFR_ORCH = {
    SAMPLES: SAMPLES,
    INFO: { owl: { tempo: 69, bars: 24, len: score('owl').len, loop: true }, dove: { tempo: 76, bars: 32, len: score('dove').len, end: score('dove').end, loop: false } },
    prepare: prepare, render: render, score: function (v) { return score(v || 'owl').ev; }, nearest: nearest, cropOf: cropOf,
    init: init, setSamples: setSamples, play: play, stop: stop, setMuted: setMuted, setVolume: setVolume,
    get playing() { return !!(sess && !sess.stopping); },
    get variant() { return sess ? sess.variant : null; },
    stats: function () { var i = 0, now = rigLive ? rigLive.ctx.currentTime : 0; while (i < active.length) { if (active[i] <= now) active.splice(i, 1); else i++; } stats.active = active.length; return stats; },
    muteLevel: function () { return rigLive ? rigLive.mute.gain.value : null; },
    _LEVEL: LEVEL, _INST: INST
  };
  if (typeof window !== 'undefined') window.WFR_ORCH = WFR_ORCH;
  if (typeof module !== 'undefined') module.exports = WFR_ORCH;
})();
