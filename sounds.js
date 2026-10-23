/* Wings for Rouge: the birds' voices (window.WFR_SOUND), v2 - TONAL.
   v1 built the harsh birds from noise through a bandpass; on Marth's phone that read as "scratches", and he said it was
   not pleasing to hear on repeat (Oct 9). v2 makes every call from pitched sources only:
     tone() - a sine or triangle with gentle pitch glides (any number of points), an optional low-index FM modulator for
              a little grain, an optional formant (a peaking filter) for nasal or bright colour, vibrato, a soft lowpass
     breath() - a faint noise puff under a note, at -24 dB or less, never the body of a call (owl and crow only)
   Gentle attacks (15-80 ms) and soft releases; a 6 kHz lowpass on the whole bus; at vol 1 a call peaks <= 0.25.
   Every call varies: pitch +-6%, duration +-15%, note count, small timing jitter between notes, and one of 2-3 variants
   per species. FM ratios are never 1 (a ratio of 1 puts a sideband at 0 Hz: DC, a thump).
   The numbers say where the energy is; Marth's ear is the real test.

   API
     WFR_SOUND.init(ctx, destination, { isMuted })   ctx = the game's AudioContext; destination defaults to ctx.destination
     WFR_SOUND.setMuted(bool)                        silences the bus at once (cuts tails already ringing)
     WFR_SOUND.call(kind, { vol, distance, pan, notes, when, variant })
        kind: cardinal, cardinal:chip, bluejay, bluejay:pump, crow, falcon, owl, eagle, hawk
        vol 0..1 (default 0.7) · distance 0 close .. 1 far (-18 dB and a 2.5 kHz lowpass; the hawk defaults to 0.55)
        pan -1..1 · notes: play only the first N notes · when: seconds from now · variant: force one (0, 1, 2)
        returns true when it played; false when muted / not ready / at the voice cap (6)
     WFR_SOUND.near(kind, dist, pan, vol)   a call from a bird's home: dist 0 (beside her) .. 1 (edge of hearing)
     WFR_SOUND.ambient(dt, { mood, exclude, vol, pool })   optional background: one distant call every 6-14 s
     WFR_SOUND.KINDS */
(function () {
  'use strict';
  var ctx = null, bus = null, busLp = null, noise = null, isMuted = null, voices = 0;
  var MAX_VOICES = 6, ambT = 8, rnd = Math.random, noBreath = false, last = null;

  /* per-kind loudness, measured offline over many renders so the loudest variant peaks ~0.22 at vol 1, distance 0 */
  var CAL = { cardinal: 0.2, 'cardinal:chip': 0.22, bluejay: 0.14, 'bluejay:pump': 0.2, crow: 0.17, falcon: 0.19, owl: 0.21, eagle: 0.2, hawk: 0.165 };

  function init(c, dest, opts) {
    if (!c) return false;
    if (opts && typeof opts.isMuted === 'function') isMuted = opts.isMuted;
    if (ctx === c && bus) return true;
    ctx = c; voices = 0;
    bus = c.createGain(); bus.gain.value = 1;
    busLp = c.createBiquadFilter(); busLp.type = 'lowpass'; busLp.frequency.value = 6000; busLp.Q.value = 0.5;
    bus.connect(busLp); busLp.connect(dest || c.destination);
    var len = Math.floor(c.sampleRate * 1), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise = b;
    return true;
  }
  function setMuted(m) {
    if (!bus) return; var t = ctx.currentTime;
    bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(m ? 0 : 1, t + 0.03);
  }

  /* ---------- a voice: every node it makes, disconnected when its last source ends ---------- */
  function keep(v, n) { v.nodes.push(n); return n; }
  function run(v, s, t0, t1) { v.srcs++; s.onended = function () { if (--v.srcs === 0) finish(v); }; s.start(t0); s.stop(t1); }
  function finish(v) {
    for (var i = 0; i < v.nodes.length; i++) { try { v.nodes[i].disconnect(); } catch (e) { /* already gone */ } }
    v.nodes.length = 0; voices = Math.max(0, voices - 1);
  }
  function envGain(v, t, dur, vol, atk, rel) {
    if (atk + rel > dur) { var k = dur / (atk + rel); atk *= k; rel *= k; }
    var g = keep(v, ctx.createGain());
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.setValueAtTime(vol, t + dur - rel); g.gain.linearRampToValueAtTime(0, t + dur);
    return g;
  }
  function glide(param, pts, t, mul) {   // pts: [[time, value], ...], exponential between points
    param.setValueAtTime(pts[0][1] * mul, t);
    for (var i = 1; i < pts.length; i++) param.exponentialRampToValueAtTime(pts[i][1] * mul, t + pts[i][0]);
  }

  /* ---------- the primitives ---------- */
  function tone(v, out, t, o) {
    var dur = o.dur, end = t + dur + 0.02;
    var g = envGain(v, t, dur, o.vol, o.atk != null ? o.atk : 0.02, o.rel != null ? o.rel : 0.06);
    var car = keep(v, ctx.createOscillator()); car.type = o.type || 'sine'; glide(car.frequency, o.pts, t, 1);
    car.connect(g); run(v, car, t, end);
    var h = null;
    if (o.harm) {
      h = keep(v, ctx.createOscillator()); var hg = keep(v, ctx.createGain());
      glide(h.frequency, o.pts, t, 2); hg.gain.value = o.harm; h.connect(hg); hg.connect(g); run(v, h, t, end);
    }
    var fMid = Math.sqrt(o.pts[0][1] * o.pts[o.pts.length - 1][1]);
    if (o.fm) {   // [ratio, index]: deviation = index * modulator frequency, so the grain follows the glide
      var m = keep(v, ctx.createOscillator()), mg = keep(v, ctx.createGain());
      glide(m.frequency, o.pts, t, o.fm[0]); glide(mg.gain, o.pts, t, o.fm[0] * o.fm[1]);
      m.connect(mg); mg.connect(car.frequency); run(v, m, t, end);
    }
    if (o.vib) {  // [rate Hz, depth as a fraction of pitch]
      var l = keep(v, ctx.createOscillator()), lg = keep(v, ctx.createGain());
      l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1] * fMid; l.connect(lg); lg.connect(car.frequency);
      if (h) { var lg2 = keep(v, ctx.createGain()); lg2.gain.value = o.vib[1] * fMid * 2; l.connect(lg2); lg2.connect(h.frequency); }
      run(v, l, t, end);
    }
    var tail = g;
    if (o.trem) { // [rate, depth]: gain swings (1 - 2*depth) .. 1
      var tg = keep(v, ctx.createGain()), tl = keep(v, ctx.createOscillator()), tlg = keep(v, ctx.createGain());
      tg.gain.value = 1 - o.trem[1]; tl.frequency.value = o.trem[0]; tlg.gain.value = o.trem[1];
      tl.connect(tlg); tlg.connect(tg.gain); tail.connect(tg); tail = tg; run(v, tl, t, end);
    }
    if (o.formant) { // [freq, Q, dB]
      var pk = keep(v, ctx.createBiquadFilter()); pk.type = 'peaking';
      pk.frequency.value = o.formant[0]; pk.Q.value = o.formant[1]; pk.gain.value = o.formant[2]; tail.connect(pk); tail = pk;
    }
    if (o.lp) {
      var lp = keep(v, ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.Q.value = 0.5; tail.connect(lp); tail = lp;
    }
    tail.connect(out);
  }
  function breath(v, out, t, fc, dur, vol) {   // a faint puff of air under a note's onset
    if (noBreath) return;
    var g = envGain(v, t, dur, vol, dur * 0.4, dur * 0.6);
    var bp = keep(v, ctx.createBiquadFilter()); bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = 0.8;
    var ns = keep(v, ctx.createBufferSource()); ns.buffer = noise; ns.loop = true;
    ns.connect(bp); bp.connect(g); g.connect(out);
    v.srcs++; ns.onended = function () { if (--v.srcs === 0) finish(v); };
    ns.start(t, rnd() * 0.8); ns.stop(t + dur + 0.01);
  }

  /* ---------- recipe helpers ---------- */
  function j(a) { return 1 + (rnd() * 2 - 1) * a; }                         // +-a jitter factor
  function ri(lo, hi) { return lo + Math.floor(rnd() * (hi - lo + 1)); }    // integer lo..hi
  function T(o) { return function (v, out, t) { tone(v, out, t, o); }; }
  function Br(fc, dur, vol) { return function (v, out, t) { breath(v, out, t, fc, dur, vol); }; }
  function N(at, dur) { return { at: at, dur: dur, parts: Array.prototype.slice.call(arguments, 2) }; }
  function seq(count, gap, make) {   // count notes, each gap apart (with +-8% timing jitter); make(i) -> [dur, parts...]
    var n = [], t = 0;
    for (var i = 0; i < count; i++) { var m = make(i); n.push(N.apply(null, [t, m[0]].concat(m.slice(1)))); t += Math.max(m[0] + 0.03, gap * j(0.08)); }
    return n;
  }
  function after(a, b, gap) { var last = a[a.length - 1], s = last.at + last.dur + gap; return a.concat(b.map(function (x) { x.at += s; return x; })); }

  /* ---------- the recipes: (P = pitch factor, D = duration factor, V = variant) -> notes ---------- */
  var R = {
    /* Northern Cardinal: clear whistles. 0 = "cheer cheer cheer, purty-purty", 1 = "what-cheer" pairs, 2 = purty run */
    cardinal: function (P, D, V) {
      function cheer() { var d = 0.22 * D * j(0.08), q = P * j(0.015); return [d, T({ pts: [[0, 2600 * q], [d, 1700 * q]], dur: d, vol: 0.9, harm: 0.08, atk: 0.02, rel: 0.07 })]; }
      function purty() { var d = 0.09 * D * j(0.08), q = P * j(0.015); return [d, T({ pts: [[0, 1800 * q], [d, 2400 * q]], dur: d, vol: 0.75, harm: 0.08, atk: 0.018, rel: 0.04 })]; }
      if (V === 0) return after(seq(ri(2, 4), 0.3 * D, cheer), seq(ri(3, 5), 0.14 * D, purty), 0.12 * D * j(0.2));
      if (V === 1) {   // "what-cheer": a short rising slur, then the long falling one, as one note
        return seq(ri(2, 3), 0.62 * D, function () {
          var q = P * j(0.015), du = 0.1 * D * j(0.08), dd = 0.24 * D * j(0.08);
          return [du + 0.03 + dd, T({ pts: [[0, 1500 * q], [du, 2700 * q]], dur: du, vol: 0.7, harm: 0.08, atk: 0.02, rel: 0.03 }),
            function (v, out, t) { tone(v, out, t + du + 0.03, { pts: [[0, 2900 * q], [dd, 1800 * q]], dur: dd, vol: 0.9, harm: 0.08, atk: 0.02, rel: 0.07 }); }];
        });
      }
      return seq(ri(4, 7), 0.15 * D, function () { var d = 0.1 * D * j(0.08), q = P * j(0.02); return [d, T({ pts: [[0, 1700 * q], [d, 2500 * q]], dur: d, vol: 0.8, harm: 0.08, atk: 0.018, rel: 0.045 })]; });
    },
    /* the cardinal's short "chip" (softened: a 15 ms attack) */
    'cardinal:chip': function (P, D) {
      return seq(ri(1, 2), 0.2 * D, function () { var d = 0.06 * D * j(0.1), q = P * j(0.02); return [d, T({ pts: [[0, 4000 * q], [d, 3500 * q]], dur: d, vol: 0.8, harm: 0.05, atk: 0.015, rel: 0.035 })]; });
    },
    /* Blue Jay: 0 = a bright FM "jay-jay" (1-3), 1 = the musical "queedle", 2 = the pump */
    bluejay: function (P, D, V) {
      if (V === 2) return R['bluejay:pump'](P, D);
      if (V === 1) {
        return seq(ri(2, 3), 0.28 * D, function () { var d = 0.18 * D * j(0.1), q = P * j(0.02);
          return [d, T({ pts: [[0, 1300 * q], [d * 0.5, 2000 * q], [d, 1400 * q]], dur: d, vol: 0.85, fm: [2, 0.25], atk: 0.02, rel: 0.06 })]; });
      }
      return seq(ri(1, 3), 0.32 * D, function () { var d = 0.2 * D * j(0.1), q = P * j(0.02);
        return [d, T({ pts: [[0, 1500 * q], [0.04, 1650 * q], [d, 1150 * q]], dur: d, vol: 0.85, fm: [2, 0.8], formant: [2600, 1.5, 5], lp: 4500, atk: 0.02, rel: 0.07 })]; });
    },
    /* the Blue Jay's "pump": two or three rising notes with a soft 20 Hz flutter */
    'bluejay:pump': function (P, D) {
      return seq(ri(2, 3), 0.22 * D, function () { var d = 0.14 * D * j(0.1), q = P * j(0.02);
        return [d, T({ pts: [[0, 900 * q], [d, 1500 * q]], dur: d, vol: 0.85, harm: 0.25, fm: [2, 0.2], trem: [20, 0.2], atk: 0.02, rel: 0.05 })]; });
    },
    /* American Crow: a warm, rounded "caw" - a triangle ~600-900 Hz with a quick downward bend and a nasal formant.
       0 = 2-4 caws each a little lower, 1 = 2-3 slow low "caaw"s, 2 = "ca-ca-caaw" */
    crow: function (P, D, V) {
      function caw(f, d, vol) {
        return [d, T({ pts: [[0, f], [0.05, f * 1.04], [d * 0.45, f * 0.84], [d, f * 0.78]], dur: d, vol: vol, type: 'triangle', fm: [2, 0.4],
          formant: [1250, 2.5, 7], lp: 2600, atk: 0.025, rel: 0.09 }), Br(1300, Math.min(0.05, d * 0.3), 0.012)];
      }
      if (V === 1) return seq(ri(2, 3), 0.55 * D, function (i) { return caw(780 * P * j(0.02) * (1 - 0.03 * i), 0.4 * D * j(0.1), 0.9); });
      if (V === 2) return seq(3, 0.22 * D, function (i) { return i < 2 ? caw(880 * P * j(0.02), 0.14 * D * j(0.1), 0.7) : caw(820 * P * j(0.02), 0.34 * D * j(0.1), 0.9); });
      return seq(ri(2, 4), 0.4 * D, function (i) { return caw(840 * P * j(0.02) * (1 - 0.04 * i), 0.3 * D * j(0.1), 0.9); });
    },
    /* Peregrine: a light tonal "kek-kek-kek" of short FM blips. 0 = 3-7 quick, 1 = 3-5 slower and lower, 2 = a wail then keks */
    falcon: function (P, D, V) {
      function kek(f) { var d = 0.075 * D * j(0.1); return [d, T({ pts: [[0, f], [d, f * 0.88]], dur: d, vol: 0.8, fm: [1.5, 0.5], lp: 4500, atk: 0.015, rel: 0.04 })]; }
      if (V === 1) return seq(ri(3, 5), 0.2 * D, function () { return kek(1800 * P * j(0.02)); });
      if (V === 2) {
        var wail = seq(1, 0, function () { var d = 0.32 * D * j(0.1); return [d, T({ pts: [[0, 1600 * P], [0.12, 2200 * P], [d, 1500 * P]], dur: d, vol: 0.8, fm: [1.5, 0.3], lp: 4500, atk: 0.03, rel: 0.1 })]; });
        return after(wail, seq(ri(2, 3), 0.13 * D, function () { return kek(2100 * P * j(0.02)); }), 0.12 * D);
      }
      return seq(ri(3, 7), 0.13 * D, function () { return kek(2100 * P * j(0.02)); });
    },
    /* Great Horned Owl: round, soft hoots. 0 = "hoo, hoo-hoo, hoo, hoo", 1 = four, 2 = three slow */
    owl: function (P, D, V) {
      var sets = [
        [[0, 0.25, 365], [0.45, 0.15, 352], [0.66, 0.15, 350], [1.05, 0.3, 340], [1.6, 0.3, 334]],
        [[0, 0.3, 360], [0.5, 0.15, 350], [0.7, 0.15, 348], [1.15, 0.35, 336]],
        [[0, 0.3, 350], [0.6, 0.3, 344], [1.2, 0.35, 335]],
      ];
      return sets[V].map(function (h, i) {
        var d = h[1] * D * j(0.08), f = h[2] * P;
        return N(i ? h[0] * D * j(0.04) : 0, d, T({ pts: [[0, f], [d, f * 0.97]], dur: d, vol: 0.9, harm: 0.05, vib: [5, 0.01], atk: Math.min(0.06, d * 0.3), rel: Math.min(0.12, d * 0.5) }),
          Br(500, 0.03, 0.01));
      });
    },
    /* Bald Eagle (its honest call): thin whistles "kleek kik-ik-ik". 0 = kleek + 3-5 iks, 1 = two kleeks + 2-4 iks, 2 = 4-6 iks */
    eagle: function (P, D, V) {
      function kleek() { var d = 0.1 * D * j(0.08), q = P * j(0.015); return [d, T({ pts: [[0, 3200 * q], [d, 2600 * q]], dur: d, vol: 0.85, harm: 0.06, fm: [2, 0.12], atk: 0.015, rel: 0.04 })]; }
      function ik() { var d = 0.05 * D * j(0.08), q = P * j(0.02); return [d, T({ pts: [[0, 3400 * q], [d, 3200 * q]], dur: d, vol: 0.7, harm: 0.05, atk: 0.015, rel: 0.03 })]; }
      if (V === 2) return seq(ri(4, 6), 0.08 * D, ik);
      return after(seq(V === 1 ? 2 : 1, 0.18 * D, kleek), seq(V === 1 ? ri(2, 4) : ri(3, 5), 0.08 * D, ik), 0.06 * D);
    },
    /* the HAWK: a distant, clean, descending "kee-eeer" 2.6 -> 1.2 kHz over ~1.4 s, slight vibrato, soft lowpass.
       0 = one cry, 1 = a cry then a shorter, lower echo, 2 = a longer "kee" before the fall */
    hawk: function (P, D, V) {
      function cry(d, q, hold) {
        return [d, T({ pts: [[0, 2300 * q], [0.15 * hold, 2600 * q], [d * 0.6, 1700 * q], [d, 1200 * q]], dur: d, vol: 0.9, harm: 0.15, fm: [2, 0.12],
          vib: [6, 0.012], lp: 3200, atk: 0.08, rel: 0.5 })];
      }
      if (V === 1) return seq(2, 1.75 * D, function (i) { return i ? cry(0.9 * D * j(0.08), P * 0.94, 1) : cry(1.4 * D * j(0.08), P, 1); });
      if (V === 2) return seq(1, 0, function () { return cry(1.6 * D * j(0.08), P, 2); });
      return seq(1, 0, function () { return cry(1.4 * D * j(0.08), P, 1); });
    },
  };
  var VARIANTS = { cardinal: 3, 'cardinal:chip': 1, bluejay: 3, 'bluejay:pump': 1, crow: 3, falcon: 3, owl: 3, eagle: 3, hawk: 3 };
  var VOICE_LP = { owl: 900 };          // the owl is all chest
  var DEFAULT_DIST = { hawk: 0.55 };    // the hawk is heard far away unless the game says otherwise
  var KINDS = Object.keys(R);

  function call(kind, o) {
    o = o || {};
    if (!ctx || !bus || !R[kind]) return false;
    if (isMuted && isMuted()) return false;
    if (voices >= MAX_VOICES) return false;
    var P = j(0.06), D = j(0.15);
    var V = o.variant != null ? Math.min(VARIANTS[kind] - 1, Math.max(0, o.variant | 0)) : Math.floor(rnd() * VARIANTS[kind]);
    var notes = R[kind](P, D, V);
    if (o.notes > 0) notes = notes.slice(0, o.notes);
    last = { kind: kind, variant: V, notes: notes.length, pitch: +P.toFixed(3), dur: +D.toFixed(3) };
    var vol = o.vol != null ? Math.max(0, Math.min(1, o.vol)) : 0.7;
    var dist = Math.max(0, Math.min(1, o.distance != null ? o.distance : (DEFAULT_DIST[kind] || 0)));
    var v = { nodes: [], srcs: 0 };
    voices++;
    var vg = keep(v, ctx.createGain());
    vg.gain.value = vol * (CAL[kind] || 1) * Math.pow(10, (-18 * dist) / 20);
    var head = vg, tail = vg;
    if (VOICE_LP[kind]) { var lp0 = keep(v, ctx.createBiquadFilter()); lp0.type = 'lowpass'; lp0.frequency.value = VOICE_LP[kind]; lp0.Q.value = 0.5; lp0.connect(vg); head = lp0; }
    if (dist > 0) {
      var lp = keep(v, ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 0.5;
      lp.frequency.value = 20000 * Math.pow(2500 / 20000, dist); tail.connect(lp); tail = lp;
    }
    if (o.pan && ctx.createStereoPanner) {
      var pn = keep(v, ctx.createStereoPanner()); pn.pan.value = Math.max(-1, Math.min(1, o.pan)); tail.connect(pn); tail = pn;
    }
    tail.connect(bus);
    var t0 = ctx.currentTime + 0.01 + (o.when > 0 ? o.when : 0);
    for (var i = 0; i < notes.length; i++) for (var k = 0; k < notes[i].parts.length; k++) notes[i].parts[k](v, head, t0 + notes[i].at);
    if (!v.srcs) finish(v);
    return true;
  }

  /* a call from a bird's home: dist 0 = beside her, 1 = the edge of hearing (silent beyond) */
  function near(kind, dist, pan, vol) {
    if (!(dist >= 0) || dist >= 1) return false;
    return call(kind, { distance: dist, pan: pan || 0, vol: vol != null ? vol : 0.8 });
  }

  /* ---------- optional background: a distant bird now and then ---------- */
  var MOODS = {
    day: ['cardinal', 'cardinal', 'cardinal:chip', 'bluejay', 'bluejay:pump', 'crow'],
    dusk: ['cardinal', 'crow', 'owl', 'bluejay:pump'],
    night: ['owl', 'owl', 'owl'],
    storm: [],
  };
  function ambient(dt, o) {
    o = o || {};
    if (!ctx) return null;
    ambT -= Math.min(0.25, Math.max(0, dt || 0));
    if (ambT > 0) return null;
    ambT = 6 + rnd() * 8;
    var pool = (o.pool || MOODS[o.mood] || MOODS.day).filter(function (k) { return k.split(':')[0] !== o.exclude; });
    if (!pool.length) return null;
    var k = pool[Math.floor(rnd() * pool.length)];
    var ok = call(k, { vol: o.vol != null ? o.vol : 0.5, distance: 0.65 + rnd() * 0.35, pan: (rnd() * 2 - 1) * 0.85 });
    return ok ? k : null;
  }

  /* for the offline bench only: a seeded random, and a switch to render without the breath */
  function seed(s) {
    if (s == null) { rnd = Math.random; return; }
    var a = s >>> 0;
    rnd = function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  var windV = null;
  function windState() {   /* 683 A bench: what the whistle was last asked for (the TARGET gain and band: what ships), how often, and the gain's value now */
    if (!windV) return { made: false, calls: 0, level: null, gain: null, freq: null, at: null, now: null, state: ctx ? ctx.state : null };
    return { made: true, calls: windV.n, level: windV.last.L, gain: windV.last.gain, freq: windV.last.freq, at: windV.last.t, now: windV.g.gain.value, state: ctx ? ctx.state : null };
  }
  function wind(level) {   /* 673 V2 (b): the stoop's wind whistle: the noise buffer looped through a bandpass that rises with the dive, on the bus (muted with it). Called each frame of a dive; it fades by itself 0.3 s after the last call, so no mode has to switch it off */
    if (!ctx || !bus || !noise) return false; var t = ctx.currentTime;
    if (!windV) { var s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.6; var g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(bus); s.start(t); windV = { f: f, g: g, n: 0, last: { L: 0, gain: 0, freq: 0, t: 0 } }; }
    var L = Math.max(0, Math.min(1, level || 0));
    var F = 250 + 650 * L, G = 0.015 * L;   /* 683 A: a low rush (250 -> 900 Hz) at a fifth of the old gain (0.07 -> 0.015). Marth, Oct 22: "the annoying dive sound" */
    windV.f.frequency.setTargetAtTime(F, t, 0.1);
    windV.g.gain.cancelScheduledValues(t); windV.g.gain.setTargetAtTime(G, t, 0.08); windV.last.L = L; windV.last.gain = G; windV.last.freq = F; windV.last.t = t; windV.n++; windV.g.gain.setTargetAtTime(0, t + 0.3, 0.12);
    return true;
  }
  window.WFR_SOUND = {
    init: init, setMuted: setMuted, call: call, wind: wind, windState: windState, near: near, ambient: ambient, KINDS: KINDS, VARIANTS: VARIANTS, MOODS: MOODS, CAL: CAL,
    get voices() { return voices; },
    _test: { seed: seed, breath: function (on) { noBreath = !on; }, last: function () { return last; } },
  };
})();
