/* light834.js - BOARD 834, LIGHT AND FOG: GOLDEN HOUR, FOG OVER WATER, HAZE BETWEEN TOWERS (Wings for Rouge). Su 40's first chase, Nov 18 2026.
   MARTH picked "Light and fog" from Su's read of worldcraft.gg (refs-1118-su40/INDEX.md: the Golden Gate at sunset in fog, Salesforce Tower at golden
   hour, the Shard in London fog). Studied, never copied: their light and their feeling, none of their look or art.
   WHAT SHE GETS (Standard only; Classic is frozen and never loads a line of this):
     1 GOLDEN HOUR    at her LOCAL hour (809's sun where she is, never home's clock), while the sun is low: the sun's light turns gold-orange and a
                      little stronger, the sky's fill turns cool blue and a little weaker, so every building, roof and wave is warm on the sun side
                      and blue in its shade (the long-shadow look, done with the light balance: the phone's shadow box stays the 110 m round her).
                      Midday is as it was; night is as it was.
     2 FOG THAT LIES  a fog layer lying on the water and the low ground, thick at the sea, thin 100 m up, nothing at 300 m: banks on bays and
                      coasts in the morning that thin as the sun climbs, sea fog on the cool coasts (cold currents, high latitudes) by the
                      season, and the weather's rain and storm thickening it. Towers and hills stand out of it; she can fly above it.
     3 HAZE           a second, taller layer of air (the first kilometre or so) that thickens with distance: light everywhere, thick in a city, gold
                      at golden hour, pale blue at midday, grey in the rain. City depth reads, tower behind tower.
     4 THE SUN'S GLOW both layers and the old far fog brighten and warm toward the sun (light scattered forward), and a soft halo stands round the
                      sun's disc when it is low and the air is thick.
   HOW (no program compiled mid-play, nothing added to the scene mid-play): the fog is three's own linear Fog, untouched, its TYPE never switched.
   At load, before the first compile, four of three's own fog chunks get a few lines (the same way world-realism.js edits its chunks), reading five
   shared vec4 uniforms (one plain object each: three's uniform clone copies its reference, so every program reads the same five numbers). When
   the master number is 0 the fog is exactly three's. The halo is two sprites made at init, children of the sky dome beside the sun's own, with the
   sun's own sprite material settings (the same program). The tick only moves numbers, a few times a second for the place, every frame for the light.
   Every number a DRAFT for Marth's eye. */
window.WFR_LIGHT834 = (function () {
  'use strict';
  var CLASSIC = !!(window.WFR_DOOR && window.WFR_DOOR.classic);
  var OFF = (function () { try { return localStorage.getItem('wfr.light834') === 'off'; } catch (e) { return false; } })();
  var C = {
    /* golden hour by the sun's height (sin of its elevation): full from the horizon to ~6 deg, gone by ~26 deg */
    G0: -0.06, G1: 0.03, G2: 0.10, G3: 0.44,
    SUN_GOLD: 0xffb25e, SUN_LOW: 0xff8a45, SUN_K: 0.9, SUN_I: 0.6, SKY_COOL: 0x86a2e2, SKY_K: 0.62, SKY_I: 0.35, GND: 0x4b3b39, GND_K: 0.3, PROBE_K: 0.5,
    /* golden hour (Nov 18, measured on the RTX): the sun +60% and the fill -35% at full g, so the sun side reads gold and the shade stays blue */
    /* the fog layer: density per metre at its floor, its scale height (Nov 18: 1/1000 read as nothing from 140 m, Kingston's dawn water lum 0.41 vs noon 0.43; 1/150 over 45 m lifts it to 0.58-0.60, a bank you can see, and a 320 m tower stands out of it: top 66 from the fog colour, foot 25) */
    /* 840: 1/150 was read with the eye on the floor (see THE EYE below): from 140 m a ray now crosses the layer as it lies, a third as thick, so the floor
       density is 1/50 (light834 G2/G3/S1 green again: Kingston's dawn water lum 0.49 vs noon 0.34, the tower's top 141 from the fog colour, foot 33) */
    FOG_D: 1 / 50, BANKS: 0.8, FOG_H: 45, FOG_H_COOL: 85, FOG_RAIN_H: 160, TROPIC: 0.6, ISLAND: 0.27, COOL_DAY: 0.016, WET: 0.045, WET_NIGHT: 0.025,   /* the shares of FOG_D: a cool coast all day, rain by day, rain by night (as they were when FOG_D was 1/1000: only the morning banks were raised; 840: COOL_DAY, WET, WET_NIGHT a third of 0.048/0.135/0.075, the same floor density at 1/50; ISLAND 0.45 to 0.27, measured: her island at dawn from 60 m reads as it did, mean 133.4 vs 133.6, its lower half 97.3 vs 96.5) */
    /* the haze: density per metre at the floor (general, city, rain), its scale height */
    HAZE: 1.6e-5, HAZE_CITY: 2.4e-4, HAZE_GOLD: 1.7, HAZE_RAIN: 3.2e-4, HAZE_H: 1100,
    /* 840 (Nov 18, his picture flying into Kingston): the city's haze lay in the same 1,100 m layer as the general air, so from 1.5-3 km up every ray to the
       ground crossed half a kilometre-thick veil: the city, roads and hills went one milky blue-white (lower-half edge density 5.0 at 1.5 km, 2.1 at 3 km,
       against 12.5 and 10.1 with 834 off; 712's far fog measured no part in it). Now the city's own haze is a SHALLOW layer (CITY_H) you look down
       through, and the haze (not the fog banks) clears near the eye: its depth is scaled by d/(d+NEAR), so it grows with distance and lies toward the horizon */
    HAZE_CITY_H: 400, HAZE_NEAR: 3000,
    /* colours (display colours: the fog mixes after the tone curve) */
    FOG_DAY: 0xdfe5ea, FOG_DAWN: 0xd9d2d6, HAZE_DAY: 0xc4d6ea, HAZE_GOLD_C: 0xf0b77c, RAIN: 0xa9b1b9, STORM: 0x7d858d, GLOW: 0xffc98a, GLOW_LOW: 0xff9a52,
    SCATTER: 0.85, SKY_TINT: 0.55, HALO: 560, HALO2: 230, HALO_A: 0.7, PLACE_MS: 250, EASE: 0.6
  };
  /* cold-current and cool coasts: [lat0, lat1, lon0, lon1, strength, the month it peaks] (sea fog's real homes; DRAFT) */
  var COOL = [[30, 43, -127, -116, 1, 7], [43, 50, -127, -122, 0.8, 8], [-36, -4, -83, -70, 1, 9], [-30, -14, 7, 16, 1, 1], [19, 34, -19, -8, 0.7, 7],
    [41, 53, -62, -45, 1, 6], [49, 61, -11, 9, 0.7, 11], [36, 56, 139, 166, 0.8, 7], [-40, -28, 110, 122, 0.5, 6], [-48, -34, 140, 151, 0.4, 5], [52, 66, -170, -150, 0.7, 7]];

  var U = { N: { x: 0, y: 0, z: 0.8, w: 0 }, A: { x: 0, y: 55, z: 0, w: 1100 }, B: { x: 0.87, y: 0.9, z: 0.92, w: 0 }, C: { x: 0.77, y: 0.84, z: 0.92, w: 0 }, S: { x: 0, y: 1, z: 0, w: 0 }, G: { x: 1, y: 0.8, z: 0.55, w: 0 }, H: { x: 0, y: 400, z: 3000, w: 0 } };   /* 840: H = the city haze's floor density, its scale height, the near-clear distance */
  var st = { patched: false, inited: false, on: false, faults: [], g: 0, el: 0, morning: 0, cool: 0, city: 0, rain: 0, wet: 0, halo: 0, ticks: 0, placeAt: -1e9, ll: null, home: true,
    want: { fog: 0, haze: 0, city: 0 }, now: { fog: 0, haze: 0, city: 0 }, ms: [] };

  /* ═══ the chunks (made once, before any program compiles) ═══ */
  var PV = '\n#ifdef USE_FOG\n\tvarying vec4 v834;\n\tvarying vec3 e834;\n#endif\n';
  var VV = '\n#ifdef USE_FOG\n\tv834 = vec4( ( vec4( mvPosition.xyz, 0.0 ) * viewMatrix ).xyz, - mvPosition.z );\n\te834 = - ( vec4( viewMatrix[ 3 ].xyz, 0.0 ) * viewMatrix ).xyz;\n#endif\n';   /* the eye-to-point offset in world axes (the view's rotation, transposed) and the drawn depth; 840: the eye itself, from the view matrix */
  /* 840 (Nov 18): THE EYE WAS ON THE FLOOR. three r128 uploads cameraPosition only to Shader, Phong, Toon and Standard materials (or one with an envMap);
     the world's ground is Lambert, so its program read the eye at y 0 and every ray to the ground crossed the layers' THICKEST air for its whole length:
     from 3 km up the haze was the haze of standing in the street (Kingston, 3 km: 77% of the way to the haze colour 5 km out, the layer's own sum says 36%).
     viewMatrix reaches every lit and basic material, so the eye is taken from it: -R^T t */
  var PF = '\n#ifdef USE_FOG\n\tvarying vec4 v834;\n\tvarying vec3 e834;\n\tuniform vec4 u834A;\n\tuniform vec4 u834B;\n\tuniform vec4 u834C;\n\tuniform vec4 u834S;\n\tuniform vec4 u834G;\n\tuniform vec4 u834N;\n\tuniform vec4 u834H;\n' +
    '\tfloat lay834( float hc, float hp, float H ) { float ec = exp( - hc / H ), ep = exp( - hp / H ), dh = hp - hc; return abs( dh ) < 0.5 ? 0.5 * ( ec + ep ) : ( ec - ep ) * H / dh; }\n#endif\n';   /* the mean density of an exponential layer along the ray */
  var FF = [
    '#ifdef USE_FOG',
    '\t#ifdef FOG_EXP2',
    '\t\tfloat fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );',
    '\t#else',
    '\t\tfloat fogFactor = smoothstep( fogNear, fogFar, fogDepth );',
    '\t#endif',
    '\tvec3 fogC834 = fogColor;',
    '\tif ( u834B.w > 0.0 ) {',
    '\t\tvec3 r834 = v834.xyz * ( fogDepth / max( v834.w, 1e-4 ) );',   /* TRUE metres: a shrunk far pass has set fogDepth to the true depth */
    '\t\tfloat d834 = length( r834 );',
    '\t\tvec3 n834 = r834 / max( d834, 1e-3 );',
    '\t\tfloat s834 = max( dot( n834, u834S.xyz ), 0.0 ); s834 *= s834; s834 *= s834; float w834 = s834 * s834 * 0.7 + s834 * 0.3;',   /* forward scatter: toward the sun the air glows */
    '\t\tfogC834 = mix( fogColor, u834G.rgb, u834G.w * w834 );',
    '\t\tfloat hc834 = max( e834.y - u834C.w, 0.0 ), hp834 = max( e834.y + r834.y - u834C.w, 0.0 );',
    '\t\tvec2 q834 = e834.xz + r834.xz + u834N.xy; float b834 = 0.5 + 0.25 * ( sin( q834.x * 0.0010 + 2.0 * sin( q834.y * 0.00058 ) ) + sin( q834.y * 0.00093 + 2.3 * sin( q834.x * 0.00073 ) ) );',   /* banks: the layer lies in patches some 6 km across (Nov 18: 15 km read as one even sheet from 400 m), fixed to the world */
    '\t\tb834 = mix( 1.0, 0.12 + 1.5 * smoothstep( 0.28, 0.8, b834 ), u834N.z );',
    '\t\tfloat oF834 = b834 * u834A.x * lay834( hc834, hp834, u834A.y ) * d834, oH834 = ( u834A.z * lay834( hc834, hp834, u834A.w ) + u834H.x * lay834( hc834, hp834, u834H.y ) ) * d834 * d834 / max( d834 + u834H.z, 1.0 ), o834 = oF834 + oH834;',   /* 840: the city's haze its own shallow layer; the haze clears near the eye */
    '\t\tvec3 c834 = ( u834B.rgb * oF834 + u834C.rgb * oH834 ) / max( o834, 1e-6 );',
    '\t\tc834 = mix( c834, u834G.rgb, u834S.w * w834 );',
    '\t\tc834 = mix( c834, fogC834, 0.75 * smoothstep( 2500.0, 30000.0, d834 ) );',   /* far off, the banks melt into the sky's own horizon */
    '\t\tgl_FragColor.rgb = mix( gl_FragColor.rgb, c834, ( 1.0 - exp( - o834 ) ) * u834B.w );',
    '\t}',
    '\tgl_FragColor.rgb = mix( gl_FragColor.rgb, fogC834, fogFactor );',
    '#endif', ''].join('\n');
  function patch(T) {
    if (st.patched || CLASSIC || OFF || !T || !T.ShaderChunk) return st.patched;
    try {
      var SC = T.ShaderChunk;
      if (!/fogFactor = smoothstep\( fogNear, fogFar, fogDepth \)/.test(SC.fog_fragment) || !/fogDepth = - mvPosition\.z/.test(SC.fog_vertex)) { st.faults.push('fog chunks not as r128'); return false; }
      SC.fog_pars_vertex += PV; SC.fog_vertex += VV; SC.fog_pars_fragment += PF; SC.fog_fragment = FF;
      var add = function (u) { if (u && u.fogColor && !u.u834A) { u.u834A = { value: U.A }; u.u834B = { value: U.B }; u.u834C = { value: U.C }; u.u834S = { value: U.S }; u.u834G = { value: U.G }; u.u834N = { value: U.N }; u.u834H = { value: U.H }; } };
      add(T.UniformsLib.fog); for (var k in T.ShaderLib) if (T.ShaderLib[k] && T.ShaderLib[k].uniforms) add(T.ShaderLib[k].uniforms);
      st.patched = true;
    } catch (e) { st.faults.push('patch: ' + (e && e.message || e)); }
    return st.patched;
  }
  if (window.THREE) patch(window.THREE);

  /* ═══ the page hands it its lights (once, at load) ═══ */
  var X = null, K = {};
  function glowTex(T) {
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.18, 'rgba(255,255,255,0.45)'); r.addColorStop(0.45, 'rgba(255,255,255,0.14)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c);
  }
  function init(o) {
    if (st.inited || !st.patched) return false;
    try {
      X = o; var T = o.THREE;
      K.sun = new T.Color(); K.hemi = new T.Color(); K.gnd = new T.Color(); K.sunI = 0; K.hemiI = 0; K.w = { sun: new T.Color(-1, 0, 0), hemi: new T.Color(-1, 0, 0), gnd: new T.Color(-1, 0, 0), sunI: -1, hemiI: -1 };
      K.t = new T.Color(); K.t2 = new T.Color(); K.c = new T.Color(); K.v = new T.Vector3();
      var tex = glowTex(T), base = o.sunDisc && o.sunDisc.material;
      var mk = function (s) { var m = new T.SpriteMaterial({ map: tex, fog: false, depthWrite: false, blending: T.AdditiveBlending, transparent: base ? base.transparent : true });
        var sp = new T.Sprite(m); sp.scale.setScalar(s); sp.name = 'light834:halo'; sp.visible = false; if (o.sunDisc) sp.renderOrder = o.sunDisc.renderOrder; o.skyDome.add(sp); return sp; };
      K.halo = [mk(C.HALO), mk(C.HALO2)];
      K.probe = null; o.scene.traverse(function (q) { if (q.isLightProbe && q.name === 'realism732-probe') K.probe = q; }); K.probeI = K.probe ? K.probe.intensity : 0;
      st.inited = true; st.on = true;
    } catch (e) { st.faults.push('init: ' + (e && e.message || e)); }
    return st.inited;
  }

  function sm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hex(o, h) { o.x = ((h >> 16) & 255) / 255; o.y = ((h >> 8) & 255) / 255; o.z = (h & 255) / 255; }
  function mixHex(c, a, b, f) { return c.setHex(a).lerp(K.t2.setHex(b), Math.max(0, Math.min(1, f))); }
  function month() {
    var m = 0; try { m = +((JSON.parse(localStorage.getItem('wfr.hud795') || '{}') || {}).month) || 0; } catch (e) { m = 0; }   /* his season month on the pause page (809's way), else today's */
    return m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
  }
  function coolAt(ll) {   /* how much this coast is a sea-fog coast now (0..1) */
    if (!ll) return 0; var mo = month(), best = 0;
    for (var i = 0; i < COOL.length; i++) { var q = COOL[i]; if (ll.lat < q[0] - 2 || ll.lat > q[1] + 2 || ll.lon < q[2] - 2 || ll.lon > q[3] + 2) continue;
      var edge = Math.min(sm(q[0] - 2, q[0] + 1, ll.lat), 1 - sm(q[1] - 1, q[1] + 2, ll.lat), sm(q[2] - 2, q[2] + 1, ll.lon), 1 - sm(q[3] - 1, q[3] + 2, ll.lon));
      var dm = Math.abs(((mo - q[5]) % 12 + 18) % 12 - 6), season = 0.725 + 0.275 * Math.cos(dm / 6 * Math.PI);   /* 1 in its month, 0.45 six months off */
      best = Math.max(best, q[4] * edge * Math.min(1, season)); }
    var a = Math.abs(ll.lat); best = Math.max(best, 0.35 * sm(44, 56, a));   /* the high latitudes: a damp grey coast most mornings */
    return best;
  }
  function morningOf(c) {   /* her local sky clock: dawn 0-150, day 150-1800, dusk 1800-2100, night 2100-2700 */
    if (c >= 2550) return sm(2550, 2700, c); if (c < 150) return 1; return 1 - sm(150, 560, c);
  }
  function place(now) {
    if (now - st.placeAt < C.PLACE_MS) return; st.placeAt = now;
    var ll = null, home = true, city = 0;
    try { ll = X.ll ? X.ll() : null; home = !ll; if (!home && window.WFR_HIGH809 && WFR_HIGH809.peek) { var h = WFR_HIGH809.peek(); city = h && h.on ? +h.city || 0 : 0; } } catch (e) { st.faults.length < 8 && st.faults.push('place: ' + (e && e.message)); }
    st.ll = ll; st.home = home; st.cool = home ? 0 : coolAt(ll); st.want.city = city;
  }

  function banks() {   /* the banks stay where they lie when the travel frame is recentred (every 10 km): the shift is carried in U.N */
    var TR = window.TRAVEL712, W = window.WFR_WORLD, f = TR && TR.on ? TR.f : null;
    if (f === st.f) return; if (f && st.f && W && W.toLatLon && W.toLocal) { var o = W.toLatLon(st.f, 0, 0), d = W.toLocal(f, o.lat, o.lon); U.N.x -= d.x; U.N.y -= d.z; } else { U.N.x = 0; U.N.y = 0; } st.f = f;
  }
  /* ═══ each frame: the light, then the air (numbers only) ═══ */
  function setLight(sun, hemi, g, el) {
    var w = K.w;
    if (!sun.color.equals(w.sun)) K.sun.copy(sun.color); if (sun.intensity !== w.sunI) K.sunI = sun.intensity;   /* the page, atmo or the seasons wrote it since: that is the base */
    if (!hemi.color.equals(w.hemi)) K.hemi.copy(hemi.color); if (hemi.intensity !== w.hemiI) K.hemiI = hemi.intensity; if (!hemi.groundColor.equals(w.gnd)) K.gnd.copy(hemi.groundColor);
    var gold = mixHex(K.c, C.SUN_GOLD, C.SUN_LOW, sm(0.2, -0.02, el));
    sun.color.copy(K.sun).lerp(gold, C.SUN_K * g); sun.intensity = K.sunI * (1 + C.SUN_I * g);
    hemi.color.copy(K.hemi).lerp(K.t.setHex(C.SKY_COOL), C.SKY_K * g); hemi.intensity = K.hemiI * (1 - C.SKY_I * g); hemi.groundColor.copy(K.gnd).lerp(K.t.setHex(C.GND), C.GND_K * g);
    w.sun.copy(sun.color); w.sunI = sun.intensity; w.hemi.copy(hemi.color); w.hemiI = hemi.intensity; w.gnd.copy(hemi.groundColor);
    if (K.probe) K.probe.intensity = K.probeI * (1 - C.PROBE_K * g);
  }
  function tick(dt) {
    if (!st.inited) return; var t0 = performance.now(); st.ticks++;
    try {
      var S = X.S(), off = X.off ? X.off() : false, airOn = !off && X.air();
      var sv = X.sunV(), el = sv.y, na = Math.max(0, Math.min(1, X.night())), k = Math.max(0, Math.min(1, X.wxK())), lvl = X.wxLevel ? X.wxLevel() : 'clear', c = X.clock();
      var g = off ? 0 : sm(C.G0, C.G1, el) * (1 - sm(C.G2, C.G3, el)) * (1 - 0.85 * k); st.g = g; st.el = el;
      setLight(X.sun, X.HEMI, g, el);
      place(t0); banks();
      var e = Math.min(1, (dt || 0.016) * C.EASE * 3);
      st.now.city += (st.want.city - st.now.city) * e;
      /* the fog layer */
      var morning = morningOf(c), coast = st.home ? C.ISLAND : Math.max(C.TROPIC, st.cool), storm = lvl === 'storm' ? 1 : 0, wet = k * (0.55 + 0.45 * storm);
      var day = 1 - na, fog = (morning * coast + st.cool * C.COOL_DAY * (1 - morning) + wet * C.WET) * day + wet * C.WET_NIGHT * na;   /* the cool coasts keep a little all day; rain day or night */
      st.morning = morning; st.rain = k; st.wet = wet;
      var H = (C.FOG_H + (C.FOG_H_COOL - C.FOG_H) * st.cool) + C.FOG_RAIN_H * wet;
      U.A.x = C.FOG_D * Math.min(1.6, fog); U.A.y = H; U.N.z = C.BANKS * (1 - 0.7 * wet);   /* rain spreads it even */
      /* the haze */
      var hk = (1 + (C.HAZE_GOLD - 1) * g) * (0.15 + 0.85 * day);   /* the night as it was: only a breath of it */
      U.A.z = C.HAZE * hk + C.HAZE_RAIN * k; U.A.w = C.HAZE_H;
      U.H.x = C.HAZE_CITY * st.now.city * hk; U.H.y = C.HAZE_CITY_H; U.H.z = C.HAZE_NEAR;   /* 840: the city's own, a shallow layer */
      U.C.w = st.home ? X.water : 0;
      /* colours */
      var fc = mixHex(K.c, C.FOG_DAY, C.FOG_DAWN, Math.max(morning * (1 - sm(150, 400, c)), g)); fc.lerp(K.t.setHex(storm ? C.STORM : C.RAIN), wet);
      if (X.fogColor) fc.lerp(X.fogColor(), 0.25 + 0.6 * na); hex(U.B, fc.getHex());
      var hc = mixHex(K.c, C.HAZE_DAY, C.HAZE_GOLD_C, g); if (X.fogColor) hc.lerp(X.fogColor(), 0.3 + 0.6 * na); hc.lerp(K.t.setHex(storm ? C.STORM : C.RAIN), k); hex(U.C, hc.getHex());
      var gc = mixHex(K.c, C.GLOW, C.GLOW_LOW, sm(0.25, 0.0, el)); hex(U.G, gc.getHex());
      K.v.copy(sv).normalize(); U.S.x = K.v.x; U.S.y = K.v.y; U.S.z = K.v.z;
      var sunUp = sm(-0.05, 0.02, el) * day * (1 - k), low = 1 - sm(0.12, 0.5, el);
      U.S.w = C.SCATTER * sunUp * (0.25 + 0.75 * low);   /* the layers glow toward the sun */
      U.G.w = C.SKY_TINT * sunUp * low;   /* the old far fog too, so the far land under a low sun goes gold */
      U.B.w = airOn ? 1 : 0;
      /* the halo: a low sun in thick air */
      var thick = Math.min(1, 0.35 + fog * 0.8 + st.now.city * 0.5 + g * 0.3), a = C.HALO_A * sunUp * low * thick * (off ? 0 : 1); st.halo = a;
      for (var i = 0; i < K.halo.length; i++) { var sp = K.halo[i]; sp.visible = airOn && a > 0.01 && X.sunDisc.visible; if (sp.visible) { sp.position.copy(X.sunDisc.position); sp.material.color.copy(gc).multiplyScalar(i ? a * 0.8 : a); } }
      st.on = airOn;
    } catch (e) { if (st.faults.length < 8) st.faults.push('tick: ' + (e && e.message || e)); }
    var ms = performance.now() - t0; st.ms.push(+ms.toFixed(4)); if (st.ms.length > 2000) st.ms.shift();
  }
  function peek() {
    var r = function (o) { return { x: +o.x.toPrecision(4), y: +o.y.toPrecision(4), z: +o.z.toPrecision(4), w: +o.w.toPrecision(4) }; };
    return { classic: CLASSIC, offSwitch: OFF, patched: st.patched, inited: st.inited, on: st.on, faults: st.faults.slice(), g: +st.g.toFixed(3), el: +st.el.toFixed(3), morning: +st.morning.toFixed(3), cool: +st.cool.toFixed(3),
      city: +st.now.city.toFixed(3), rain: +st.rain.toFixed(3), wet: +st.wet.toFixed(3), halo: +st.halo.toFixed(3), home: st.home, ll: st.ll, ticks: st.ticks, U: { A: r(U.A), B: r(U.B), C: r(U.C), S: r(U.S), G: r(U.G), H: r(U.H) },
      haloVis: K.halo ? K.halo.map(function (s) { return s.visible; }) : null, ms: st.ms.slice(-600) };
  }
  return { C: C, U: U, patch: patch, init: init, tick: tick, peek: peek, coolAt: coolAt };
})();
