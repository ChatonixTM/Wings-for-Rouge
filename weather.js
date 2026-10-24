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
  function level(d, season) {   /* 699: 'clear' | 'drizzle' | 'rain' | 'pour' | 'storm' for day d: a rain day's level from its own dice, fixed per day */
    var k = roll(d, season); if (k !== 'rain') return k;
    var r = mul32(Math.imul((d | 0) + 1, 0x85EBCA6B) ^ (SALT + 699));
    return r < 0.35 ? 'drizzle' : r < 0.75 ? 'rain' : 'pour';
  }

  var RAIN_VS = [
    'uniform float uT; uniform vec3 uCam; uniform vec3 uBox; uniform vec3 uVel; uniform float uA; uniform float uLen;',
    'attribute float aEnd; attribute float aSeed;',
    'varying float vA;',
    'void main() {',
    '  vec3 p = position + uVel * ( uT * ( 0.85 + 0.3 * aSeed ) );',
    '  vec3 rel = mod( p - uCam + uBox, 2.0 * uBox ) - uBox;',
    '  rel -= normalize( uVel ) * aEnd * ( 0.9 + 0.7 * aSeed ) * uLen;',
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
    var U = { uT: { value: 0 }, uCam: { value: new T.Vector3() }, uBox: { value: BOX }, uVel: { value: new T.Vector3(0.92 * 2.2, -9, 0.38 * 2.2) }, uA: { value: 0 }, uLen: { value: 1 }, uColor: { value: new T.Color(0xd6dee8) } };
    var mat = new T.ShaderMaterial({ uniforms: U, vertexShader: RAIN_VS, fragmentShader: RAIN_FS, transparent: true, depthWrite: false });
    var rain = new T.LineSegments(g, mat); rain.frustumCulled = false; rain.renderOrder = 5; rain.name = 'wx:rain'; scene.add(rain);
    var warm = 3;   /* drawn (at alpha 0) for the first frames, so its one program compiles at load, never at the first rain (651's lesson) */
    var DAY = new T.Color(0xd6dee8), NIGHT = new T.Color(0x6a7584);
    /* 699: his four modes. a = the streaks' strength, n = the share of streaks drawn, len = their length, snd = the rain's loudness (DRAFT).
       'rain' and 'storm' keep 0.55 (what every rain guard has measured); drizzle is thin and short, a pour long, bright and loud. */
    var LV = { clear: { a: 0.55, n: 1, len: 1, snd: 1 }, drizzle: { a: 0.32, n: 0.4, len: 0.6, snd: 0.45 }, rain: { a: 0.55, n: 1, len: 1, snd: 1 },
      pour: { a: 0.72, n: 1, len: 1.7, snd: 1.9 }, storm: { a: 0.55, n: 1, len: 1.8, snd: 2.2 } }, LVNOW = null;
    /* 699: the BOLT. Two flat ribbons (the bolt and one branch) turned to face the camera, white, one material; laid with the weather's own
       dice at each storm flash, 140-220 m out, ahead of her within about 30 degrees. Warmed with the rain at load. */
    var BN = 16, BB = 8;
    function ribbon(n) { var gg = new T.BufferGeometry(), ix = []; gg.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 6), 3)); for (var q = 0; q < n - 1; q++) { var a = q * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } gg.setIndex(ix); return gg; }
    var BOLT = { mat: new T.MeshBasicMaterial({ color: 0xf4f7ff, transparent: true, opacity: 0, depthWrite: false, fog: false, side: T.DoubleSide }), on: 0, strikes: 0 };
    BOLT.mesh = new T.Mesh(ribbon(BN), BOLT.mat); BOLT.branch = new T.Mesh(ribbon(BB), BOLT.mat);
    [BOLT.mesh, BOLT.branch].forEach(function (m) { m.frustumCulled = false; m.renderOrder = 6; m.name = 'wx:bolt'; m.visible = false; scene.add(m); });
    var _v = new T.Vector3(), _s = new T.Vector3(), _d = new T.Vector3(), _f = new T.Vector3();
    function lay(m, pts, w) {   /* a flat ribbon through pts, its width across the line of sight, thinning to the tip */
      var a = m.geometry.attributes.position, cam = o.camera.position;
      for (var q = 0; q < pts.length; q++) { var p = pts[q], nx = pts[Math.min(q + 1, pts.length - 1)], pv = pts[Math.max(q - 1, 0)];
        _d.subVectors(nx, pv).normalize(); _f.subVectors(cam, p).normalize(); _s.crossVectors(_d, _f).normalize().multiplyScalar(w * (1 - 0.6 * q / pts.length) / 2);
        a.setXYZ(q * 2, p.x + _s.x, p.y + _s.y, p.z + _s.z); a.setXYZ(q * 2 + 1, p.x - _s.x, p.y - _s.y, p.z - _s.z); }
      a.needsUpdate = true; m.geometry.computeBoundingSphere();
    }
    function boltStrike(cam, at) {   /* 703: at = a chosen spot { x, y, z } (the Call); without it, the storm's own dice */
      o.camera.getWorldDirection(_v);
      var yaw = Math.atan2(_v.x, _v.z) + (R() - 0.5) * 1.1, dist = 140 + R() * 80, top = cam.y + 75 + R() * 25, drop = 70 + R() * 30;
      var x = cam.x + Math.sin(yaw) * dist, z = cam.z + Math.cos(yaw) * dist, pts = [], br = [], q;
      if (at) { x = at.x; z = at.z; top = (at.y || 0) + 85 + R() * 15; drop = top - (at.y || 0); }   /* 703: from the cloud down to the sea */
      for (q = 0; q < BN; q++) { pts.push(new T.Vector3(x, top - drop * q / (BN - 1), z)); x += (R() - 0.5) * 9; z += (R() - 0.5) * 9; }
      var j = 4 + Math.floor(R() * 5), bx = pts[j].x, bz = pts[j].z, sx = (R() < 0.5 ? -1 : 1) * (3 + R() * 3);
      for (q = 0; q < BB; q++) { br.push(new T.Vector3(bx, pts[j].y - drop * 0.45 * q / (BB - 1), bz)); bx += sx + (R() - 0.5) * 4; bz += (R() - 0.5) * 4; }
      lay(BOLT.mesh, pts, 2.2); lay(BOLT.branch, br, 1.2); BOLT.on = 0.22; BOLT.strikes++; BOLT.mesh.visible = BOLT.branch.visible = true; BOLT.mat.opacity = 1;
    }
    function boltTick(real) {
      if (BOLT.on > 0) { BOLT.on -= real; BOLT.mat.opacity = Math.max(0, Math.min(1, BOLT.on / 0.08)); if (BOLT.on <= 0) { BOLT.mesh.visible = BOLT.branch.visible = false; BOLT.mat.opacity = 0; } }
      else if (BOLT.mesh.visible) { BOLT.mesh.visible = BOLT.branch.visible = false; BOLT.mat.opacity = 0; }
    }   /* brighter than the overcast horizon (Obito: #b8c4d0 at 0.35 over #aab2ba was ~5 levels apart) */

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
      var want = (o.muted && o.muted()) ? 0 : Math.min(0.12, 0.05 * k * (SND.lv || 1) * (o.indoors() ? 0.3 : 1));   /* 699: the level's loudness */
      if (!SND.bed && want > 0.002) { var src = ac.createBufferSource(); src.buffer = noiseBuf(ac); src.loop = true; var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; SND.gain = ac.createGain(); SND.gain.gain.value = 0; src.connect(lp); lp.connect(SND.gain); SND.gain.connect(ac.destination); src.start(); SND.bed = src; }
      if (SND.gain) SND.gain.gain.setTargetAtTime(want, ac.currentTime, 0.4);
    }
    function rumble(far) {
      var ac = o.ac && o.ac(); if (!ac || (o.muted && o.muted())) return; TH.rumbles++;
      var src = ac.createBufferSource(); src.buffer = noiseBuf(ac); var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 190; var gn = ac.createGain(), t0 = ac.currentTime;   /* 190 Hz: a phone's speaker can play it (70 was silent there) */
      gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(far ? 0.05 : 0.1, t0 + 0.5); gn.gain.linearRampToValueAtTime(0, t0 + 2.6); src.connect(lp); lp.connect(gn); gn.connect(ac.destination); src.start(t0); src.stop(t0 + 2.8);
    }

    function strikeAt(at) {   /* 703 ship 4 (the Call): one bolt at a chosen spot, with the storm's own flash and rumble. Refused (false) inside 15 s of
       the last flash, while a flash is on, or indoors: the photosensitive rule holds in a cutscene too */
      if (dead) return false; var played = +o.played() || 0;
      if (o.indoors() || TH.on > 0 || (TH.last != null && played - TH.last < 15)) return false;
      if (TH.last != null) { var gap = played - TH.last; TH.minGap = TH.minGap == null ? gap : Math.min(TH.minGap, gap); }
      TH.last = played; TH.flashes++; TH.on = 0.12; TH.frames = 0; TH.len = 0; TH.called = (TH.called || 0) + 1;
      if (veil) veil.style.opacity = '0.35'; o.flash(0.4); boltStrike(o.camera.position, at);
      setTimeout(function () { rumble(false); }, 600 + R() * 900);
      TH.next = played + Math.max(15, 18 + R() * 27); return true;
    }
    function tick(dt, real) {
      if (dead) return; if (real == null) real = dt;
      try {
        var k = o.k(), cam = o.camera.position, inside = o.indoors(), kind = o.kind(), played = o.played();
        var lv = (o.level && o.level()) || kind, L = LV[lv] || LV.rain, drawN = Math.round(N * L.n) * 2;   /* 699 */
        LVNOW = lv; SND.lv = L.snd; U.uLen.value = L.len; if (g.drawRange.count !== drawN) g.setDrawRange(0, drawN);
        U.uT.value += Math.min(dt, 0.1);   /* the game's dt: the pouch's slow motion slows the rain too */ U.uCam.value.copy(cam);
        U.uColor.value.copy(DAY).lerp(NIGHT, o.night ? o.night() : 0);
        var show = k > 0.01 && !inside && cam.y < 160;
        if (warm > 0) { warm--; rain.visible = true; U.uA.value = 0; BOLT.mesh.visible = BOLT.branch.visible = true; BOLT.mat.opacity = 0; }   /* 699: the bolt's program compiles at load too */
        else { rain.visible = show; U.uA.value = show ? L.a * k : 0; boltTick(real); }
        soundTick(inside ? k : k);
        /* thunder, storm days only, timed in seconds of PLAY */
        if (TH.on > 0) { TH.on -= real; TH.frames++; TH.len += real; if (TH.on <= 0) { if (veil) veil.style.opacity = '0'; o.flash(0); TH.maxFrames = Math.max(TH.maxFrames, TH.frames); TH.maxLen = Math.max(TH.maxLen, TH.len); } }
        var far = kind !== 'storm' && lv === 'pour';   /* 699: a pouring day flickers far off now and then: a faint wash, a far rumble, no bolt */
        if ((kind === 'storm' || far) && k > 0.5) {
          if (TH.next == null) TH.next = played + (far ? 30 + R() * 40 : 18 + R() * 27);
          if (played >= TH.next && TH.on <= 0) {
            if (TH.last != null) { var gap = played - TH.last; TH.minGap = TH.minGap == null ? gap : Math.min(TH.minGap, gap); }
            TH.last = played; TH.flashes++; TH.on = 0.12; TH.frames = 0; TH.len = 0;
            if (veil && !inside) veil.style.opacity = far ? '0.12' : '0.35'; o.flash(inside ? (far ? 0.04 : 0.1) : far ? 0.14 : 0.4);
            if (far) TH.far = (TH.far || 0) + 1; else if (!inside) boltStrike(cam);   /* 699: a real bolt in the storm's sky */
            setTimeout(function () { rumble(far); }, far ? 2200 + R() * 2400 : 600 + R() * 1900);
            TH.next = played + Math.max(15, far ? 40 + R() * 40 : 18 + R() * 27);
          }
        } else TH.next = null;
      } catch (err) {
        dead = true; rain.visible = false; if (veil) veil.style.opacity = '0'; try { o.flash(0); console.warn('weather stopped: ' + (err && err.message)); } catch (e2) { /* fine */ }
      }
    }
    function peek() {
      return { dead: dead, rainVis: rain.visible && U.uA.value > 0.001, rainA: U.uA.value, rainVerts: N * 2, flashes: TH.flashes, minGap: TH.minGap, maxFlashFrames: TH.maxFrames, maxFlashLen: +TH.maxLen.toFixed(3), flashing: TH.on > 0, rumbles: TH.rumbles, sound: !!SND.bed,
        level: LVNOW, drawn: g.drawRange.count / 2, uLen: U.uLen.value, bolts: BOLT.strikes, boltShown: BOLT.mesh.visible && BOLT.mat.opacity > 0.01, farFlashes: TH.far || 0 };   /* 699 */
    }
    return { tick: tick, peek: peek, rain: rain, strikeAt: strikeAt, th: function () { return { flashes: TH.flashes, last: TH.last, minGap: TH.minGap, called: TH.called || 0 }; } };   /* 703 */
  }

  API = { roll: roll, level: level, seasons: SEASONS, create: create, last: null, error: null };
  return API;
}());
