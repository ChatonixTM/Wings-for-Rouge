/* weather.js - BOARD 632 U1, THE SKY THAT CHANGES (Marth, Oct 15 2026 ~04:40: "we need to add elements / effects. I'm talking weather
   and seasons. We can start simple for now but we will certainly expand ... So we're gonna need to add rain. And clouds I guess and a
   better moving sun and moon." / "Thunderstorms. I want added but pretty rare"). Itachi's brief: BRIEF_632_WEATHER_2026-10-15.md §2.
   What lives here: the day's ROLL (a pure function of the day's number, its own dice: the island's rnd() is never drawn after the
   build), the RAIN (one LineSegments, every streak moved on the GPU round the camera, the shape of atmo.js's pollen motes), gentle
   THUNDER on storm days, and a quiet rain SOUND (brown noise: his ear heard white-noise synthesis as "scratches", sounds.js).
   The sky's colours, the fog and the light stay in the game file (its paint block), so nothing here touches a colour ATMO repaints.
   Like atmo.js it never throws into the game: a fault turns the weather off, not the game. */
window.WFR_WX = (function () {
  'use strict';
  /* the season table: seasons later add ROWS, not code (Marth: "we will certainly expand") */
  var SEASONS = { summer: { storm: 0.05, rain: 0.15 } }, SALT = 632011;   /* chosen by known answer (Obito): the first ungated rain is day 4, the first storm day 18; with 632001 nothing fell before day 14 */
  function mul32(a) { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function roll(d, season) {   /* 'clear' | 'rain' | 'storm' for day number d: the same answer every call, every reload */
    var w = SEASONS[season || 'summer'], r = mul32(Math.imul((d | 0) + 1, 0x9E3779B1) ^ SALT);
    return r < w.storm ? 'storm' : r < w.storm + w.rain ? 'rain' : 'clear';
  }

  var RAIN_VS = [
    'uniform float uT; uniform vec3 uCam; uniform vec3 uBox; uniform vec3 uVel; uniform float uA;',
    'attribute float aEnd; attribute float aSeed;',
    'varying float vA;',
    'void main() {',
    '  vec3 p = position + uVel * ( uT * ( 0.85 + 0.3 * aSeed ) );',
    '  vec3 rel = mod( p - uCam + uBox, 2.0 * uBox ) - uBox;',
    '  rel -= normalize( uVel ) * aEnd * ( 0.9 + 0.7 * aSeed );',
    '  vec4 mv = modelViewMatrix * vec4( uCam + rel, 1.0 );',
    '  gl_Position = projectionMatrix * mv;',
    '  float d = length( rel );',
    '  vec3 q = abs( rel ) / uBox; float e = max( q.x, max( q.y, q.z ) );',
    '  vA = uA * ( 1.0 - smoothstep( 0.6, 1.0, e ) ) * smoothstep( 0.8, 2.5, d );',
    '}'].join('\n');
  var RAIN_FS = 'uniform vec3 uColor; varying float vA; void main() { gl_FragColor = vec4( uColor, vA ); }';

  var API = null;
  function create(T, scene, o) {   /* the instance is kept as WFR_WX.last (for the bench); a fault as WFR_WX.error */
    try { var inst = build(T, scene, o); API.last = inst; return inst; } catch (err) { API.error = String(err && err.message || err); throw err; }
  }
  function build(T, scene, o) {
    var dead = false, N = o.phone ? 500 : 900, BOX = new T.Vector3(20, 15, 20), seed = 63201;
    var R = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var pos = new Float32Array(N * 6), end = new Float32Array(N * 2), sd = new Float32Array(N * 2);
    for (var i = 0; i < N; i++) { var x = R() * 40, y = R() * 30, z = R() * 40, s = R();
      pos[i * 6] = pos[i * 6 + 3] = x; pos[i * 6 + 1] = pos[i * 6 + 4] = y; pos[i * 6 + 2] = pos[i * 6 + 5] = z; end[i * 2 + 1] = 1; sd[i * 2] = sd[i * 2 + 1] = s; }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aEnd', new T.BufferAttribute(end, 1)); g.setAttribute('aSeed', new T.BufferAttribute(sd, 1));
    var U = { uT: { value: 0 }, uCam: { value: new T.Vector3() }, uBox: { value: BOX }, uVel: { value: new T.Vector3(0.92 * 2.2, -9, 0.38 * 2.2) }, uA: { value: 0 }, uColor: { value: new T.Color(0xd6dee8) } };
    var mat = new T.ShaderMaterial({ uniforms: U, vertexShader: RAIN_VS, fragmentShader: RAIN_FS, transparent: true, depthWrite: false });
    var rain = new T.LineSegments(g, mat); rain.frustumCulled = false; rain.renderOrder = 5; rain.name = 'wx:rain'; scene.add(rain);
    var warm = 3;   /* drawn (at alpha 0) for the first frames, so its one program compiles at load, never at the first rain (651's lesson) */
    var DAY = new T.Color(0xd6dee8), NIGHT = new T.Color(0x6a7584);   /* brighter than the overcast horizon (Obito: #b8c4d0 at 0.35 over #aab2ba was ~5 levels apart) */

    /* thunder: a soft white wash over the picture, never closer than 15 s of play (photosensitive-safe, far under 3 a second) */
    var veil = null; try { veil = document.createElement('div'); veil.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:4;transition:none'; document.body.appendChild(veil); } catch (e) { veil = null; }
    var TH = { next: null, on: 0, frames: 0, len: 0, flashes: 0, last: null, minGap: null, maxFrames: 0, maxLen: 0, rumbles: 0 };

    /* the rain's sound: brown noise through a lowpass, very quiet (his ear decides; a CC0 recording is the fallback, with his yes) */
    var SND = { bed: null, gain: null, buf: null };
    function noiseBuf(ac) { if (SND.buf) return SND.buf; var n = ac.sampleRate * 6, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), last = 0;
      for (var j = 0; j < n; j++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[j] = last * 3.5; }
      var d0 = d[0], dn = d[n - 1]; for (j = 0; j < n; j++) d[j] -= (dn - d0) * (j / (n - 1));   /* the loop ends where it starts: no thump every pass (Obito) */ SND.buf = b; return b; }
    function soundTick(k) {
      var ac = o.ac && o.ac(); if (!ac) return;
      var want = (o.muted && o.muted()) ? 0 : 0.05 * k * (o.indoors() ? 0.3 : 1);
      if (!SND.bed && want > 0.002) { var src = ac.createBufferSource(); src.buffer = noiseBuf(ac); src.loop = true; var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; SND.gain = ac.createGain(); SND.gain.gain.value = 0; src.connect(lp); lp.connect(SND.gain); SND.gain.connect(ac.destination); src.start(); SND.bed = src; }
      if (SND.gain) SND.gain.gain.setTargetAtTime(want, ac.currentTime, 0.4);
    }
    function rumble() {
      var ac = o.ac && o.ac(); if (!ac || (o.muted && o.muted())) return; TH.rumbles++;
      var src = ac.createBufferSource(); src.buffer = noiseBuf(ac); var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 190; var gn = ac.createGain(), t0 = ac.currentTime;   /* 190 Hz: a phone's speaker can play it (70 was silent there) */
      gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(0.1, t0 + 0.5); gn.gain.linearRampToValueAtTime(0, t0 + 2.6); src.connect(lp); lp.connect(gn); gn.connect(ac.destination); src.start(t0); src.stop(t0 + 2.8);
    }

    function tick(dt, real) {
      if (dead) return; if (real == null) real = dt;
      try {
        var k = o.k(), cam = o.camera.position, inside = o.indoors(), kind = o.kind(), played = o.played();
        U.uT.value += Math.min(dt, 0.1);   /* the game's dt: the pouch's slow motion slows the rain too */ U.uCam.value.copy(cam);
        U.uColor.value.copy(DAY).lerp(NIGHT, o.night ? o.night() : 0);
        var show = k > 0.01 && !inside && cam.y < 160;
        if (warm > 0) { warm--; rain.visible = true; U.uA.value = 0; } else { rain.visible = show; U.uA.value = show ? 0.55 * k : 0; }
        soundTick(inside ? k : k);
        /* thunder, storm days only, timed in seconds of PLAY */
        if (TH.on > 0) { TH.on -= real; TH.frames++; TH.len += real; if (TH.on <= 0) { if (veil) veil.style.opacity = '0'; o.flash(0); TH.maxFrames = Math.max(TH.maxFrames, TH.frames); TH.maxLen = Math.max(TH.maxLen, TH.len); } }
        if (kind === 'storm' && k > 0.5) {
          if (TH.next == null) TH.next = played + 18 + R() * 27;
          if (played >= TH.next && TH.on <= 0) {
            if (TH.last != null) { var gap = played - TH.last; TH.minGap = TH.minGap == null ? gap : Math.min(TH.minGap, gap); }
            TH.last = played; TH.flashes++; TH.on = 0.12; TH.frames = 0; TH.len = 0;
            if (veil && !inside) veil.style.opacity = '0.35'; o.flash(inside ? 0.1 : 0.4);
            setTimeout(rumble, 600 + R() * 1900);
            TH.next = played + Math.max(15, 18 + R() * 27);
          }
        } else TH.next = null;
      } catch (err) {
        dead = true; rain.visible = false; if (veil) veil.style.opacity = '0'; try { o.flash(0); console.warn('weather stopped: ' + (err && err.message)); } catch (e2) { /* fine */ }
      }
    }
    function peek() {
      return { dead: dead, rainVis: rain.visible && U.uA.value > 0.001, rainA: U.uA.value, rainVerts: N * 2, flashes: TH.flashes, minGap: TH.minGap, maxFlashFrames: TH.maxFrames, maxFlashLen: +TH.maxLen.toFixed(3), flashing: TH.on > 0, rumbles: TH.rumbles, sound: !!SND.bed };
    }
    return { tick: tick, peek: peek, rain: rain };
  }

  API = { roll: roll, seasons: SEASONS, create: create, last: null, error: null };
  return API;
}());
