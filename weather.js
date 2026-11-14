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
    var BOLT = { mat: new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false, side: T.DoubleSide }), on: 0, strikes: 0, T: 0.26, gk: 0.32 };   /* 819: white-hot (no tone mapping greys it) */
    BOLT.gmat = new T.MeshBasicMaterial({ color: 0x9cc2ff, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false, side: T.DoubleSide });   /* 819: the blue-white glow (the same kind of material: the same program) */
    BOLT.mesh = new T.Mesh(ribbon(BN), BOLT.mat); BOLT.branch = new T.Mesh(ribbon(BB), BOLT.mat); BOLT.br2 = new T.Mesh(ribbon(BB), BOLT.mat); BOLT.br3 = new T.Mesh(ribbon(BB), BOLT.mat); BOLT.glow = new T.Mesh(ribbon(BN), BOLT.gmat);
    BOLT.all = [BOLT.glow, BOLT.mesh, BOLT.branch, BOLT.br2, BOLT.br3];   /* 819: built here once, at load: the white-hot core, up to three branches, the glow behind it */
    BOLT.all.forEach(function (m, i) { m.frustumCulled = false; m.renderOrder = i ? 6 : 5; m.name = 'wx:bolt'; m.visible = false; scene.add(m); });
    function boltShow(on) { for (var i = 0; i < BOLT.all.length; i++) BOLT.all[i].visible = on && (BOLT.all[i] !== BOLT.br3 || BOLT.nb > 2); }
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
      var x = cam.x + Math.sin(yaw) * dist, z = cam.z + Math.cos(yaw) * dist, ex = x + (R() - 0.5) * 24, ez = z + (R() - 0.5) * 24, ey, q, near = !!(at && at.hit);
      if (at) { x = at.x + (near ? (R() - 0.5) * 30 : 0); z = at.z + (near ? (R() - 0.5) * 30 : 0); top = (at.y || 0) + 85 + R() * 15; drop = top - (at.y || 0); ex = at.x; ez = at.z; }   /* 703: from the cloud down to the sea (819: down to her) */
      ey = top - drop;
      /* 819: a real bolt: jagged (kinks across the line of sight, alternating sides), its branches short and forked off it */
      var mx = (x + ex) / 2 - cam.x, mz = (z + ez) / 2 - cam.z, mL = Math.hypot(mx, mz) || 1, px = -mz / mL, pz = mx / mL;
      var jag = function (x0, y0, z0, x1, y1, z1, n, kz, tip, ease) {   /* kinks of about kz x the segment's own length; ease: the joints crowd toward the end, so the part the lens sees (the last few metres, at her) is jagged too */
        var out = [], s0 = R() < 0.5 ? 1 : -1, LL = Math.hypot(x1 - x0, y1 - y0, z1 - z0), U = function (i) { var v = i / (n - 1); return ease ? 1 - (1 - v) * (1 - v) : v; };
        for (var i = 0; i < n; i++) { var u = U(i), X = x0 + (x1 - x0) * u, Y = y0 + (y1 - y0) * u, Z = z0 + (z1 - z0) * u, seg = LL * (u - U(Math.max(0, i - 1)));
          if (i > 0 && (i < n - 1 || !tip)) { var a = (R() - 0.5) * 0.9, s = (i % 2 ? s0 : -s0) * (0.55 + R() * 0.45) * kz * seg, cx = px * Math.cos(a) - pz * Math.sin(a), cz = px * Math.sin(a) + pz * Math.cos(a); X += cx * s; Z += cz * s; Y += (R() - 0.5) * seg * 0.2; }
          out.push(new T.Vector3(X, Y, Z)); } return out; };
      var pts = jag(x, top, z, ex, ey, ez, BN, 0.7, true, near);
      if (near) BOLT.hits = (BOLT.hits || 0) + 1;
      BOLT.end = [pts[BN - 1].x, pts[BN - 1].y, pts[BN - 1].z];
      BOLT.nb = 2 + (R() < 0.5 ? 1 : 0); var used = {}, BR = [BOLT.branch, BOLT.br2, BOLT.br3], j0 = near ? BN - 7 : 3, jn = near ? 5 : BN - 8;   /* 819: her bolt forks low, where the lens sees it */
      for (var b = 0; b < 3; b++) { var j = j0 + Math.floor(R() * jn); while (used[j]) j = j0 + ((j - j0 + 1) % jn); used[j] = 1;
        var L = near ? 1.5 + R() * 3 : drop * (0.12 + R() * 0.14), sd = (R() < 0.5 ? -1 : 1), P0 = pts[j];
        lay(BR[b], jag(P0.x, P0.y, P0.z, P0.x + px * sd * L * 0.8, P0.y - L * 0.9, P0.z + pz * sd * L * 0.8, BB, 0.6, false, false), near ? 0.1 : 1.0); }
      lay(BOLT.mesh, pts, near ? 0.22 : 2.2); lay(BOLT.glow, pts, near ? 1.0 : 7); BOLT.gk = near ? 0.45 : 0.32;   /* 819: her bolt is beside the lens: a thin white-hot core in a soft blue-white glow */
      var A = BOLT.mesh.geometry.attributes.position; BOLT.line = pts.map(function (p) { return [p.x, p.y, p.z]; }); BOLT.edge = [[A.getX(2 * (BN - 2)), A.getY(2 * (BN - 2)), A.getZ(2 * (BN - 2))], [A.getX(2 * (BN - 2) + 1), A.getY(2 * (BN - 2) + 1), A.getZ(2 * (BN - 2) + 1)]];
      BOLT.on = BOLT.T; BOLT.strikes++; boltShow(true); BOLT.mat.opacity = 1; BOLT.gmat.opacity = BOLT.gk;
    }
    function boltTick(real) {   /* 819: one flicker: on, a breath dark, on again, then out (about 0.26 s) */
      if (BOLT.on > 0) { BOLT.on -= real; var t = BOLT.T - BOLT.on, f = t < 0.07 ? 1 : t < 0.11 ? 0.12 : t < 0.17 ? 1 : Math.max(0, 1 - (t - 0.17) / 0.09);
        BOLT.mat.opacity = f; BOLT.gmat.opacity = BOLT.gk * f; if (BOLT.on <= 0) { boltShow(false); BOLT.mat.opacity = 0; BOLT.gmat.opacity = 0; } }
      else if (BOLT.mesh.visible) { boltShow(false); BOLT.mat.opacity = 0; BOLT.gmat.opacity = 0; }
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
        if (warm > 0) { warm--; rain.visible = true; U.uA.value = 0; BOLT.nb = 3; boltShow(true); BOLT.mat.opacity = 0; BOLT.gmat.opacity = 0; }   /* 699: the bolt's program compiles at load too */
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
            var me819 = !far && !inside && o.strike ? o.strike() : null;   /* 819: the page rolls her 1 in 15; a hit is { x, y, z, hit } */
            if (veil && !inside) veil.style.opacity = me819 ? '0.5' : far ? '0.12' : '0.35'; o.flash(inside ? (far ? 0.04 : 0.1) : me819 ? 0.55 : far ? 0.14 : 0.4);
            if (far) TH.far = (TH.far || 0) + 1; else if (!inside) boltStrike(cam, me819 || undefined);   /* 699: a real bolt in the storm's sky (819: down to her) */
            TH.delay = me819 ? 0 : far ? 2200 + R() * 2400 : 600 + R() * 1900; setTimeout(function () { rumble(far); }, TH.delay);   /* 819: when it is hers, the thunder at once */
            TH.next = played + Math.max(15, far ? 40 + R() * 40 : 18 + R() * 27);
          }
        } else TH.next = null;
      } catch (err) {
        dead = true; rain.visible = false; if (veil) veil.style.opacity = '0'; try { o.flash(0); console.warn('weather stopped: ' + (err && err.message)); } catch (e2) { /* fine */ }
      }
    }
    function peek() {
      return { dead: dead, rainVis: rain.visible && U.uA.value > 0.001, rainA: U.uA.value, rainVerts: N * 2, flashes: TH.flashes, minGap: TH.minGap, maxFlashFrames: TH.maxFrames, maxFlashLen: +TH.maxLen.toFixed(3), flashing: TH.on > 0, rumbles: TH.rumbles, sound: !!SND.bed,
        level: LVNOW, drawn: g.drawRange.count / 2, uLen: U.uLen.value, bolts: BOLT.strikes, boltShown: BOLT.mesh.visible && BOLT.mat.opacity > 0.01, farFlashes: TH.far || 0, hits819: BOLT.hits || 0, end819: BOLT.end || null, delay819: TH.delay == null ? null : TH.delay, line819: BOLT.line || null, edge819: BOLT.edge || null, branches819: BOLT.nb || 0, parts819: BOLT.all.length };   /* 699; 819 */
    }
    return { tick: tick, peek: peek, rain: rain, strikeAt: strikeAt, soon819: function () { if (TH.next != null) TH.next = 0; }, th: function () { return { flashes: TH.flashes, last: TH.last, minGap: TH.minGap, called: TH.called || 0 }; } };   /* 703 */
  }

  API = { roll: roll, level: level, seasons: SEASONS, create: create, last: null, error: null };
  return API;
}());
