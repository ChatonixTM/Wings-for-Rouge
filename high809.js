/* high809.js - BOARD 809, FAST HIGH FLIGHT FROM 2-3 KM, AN ALTIMETER IN FEET, AND THE FIRMAMENT AT ITS HIGHEST (Wings for Rouge). The 809 builder, Nov 15 2026.
   MARTH, verbatim (row 809): "I noticed that when I'm super high in the air - I can super sped fly, like I'm travelling at like 1km per second virtually. We
   should allow that from around 2-3k if ur not over super populated areas ;)" / "I think we should show the altitude as well tho. The firmament at it's highest
   etc" / "And travel speed" / "Nah nah we can't let the climbing get faster as we climb. That isn't true to physics" / his pick for the dome: "Rowbotham's
   figures (Recommended)": the stars on the dome ~3,100 mi up, the disc 12,000 mi from the Pole to the edge.
   WHAT SHE GETS (Standard only; Classic is frozen and never sees any of it):
     1 THE FAST BAND   out in the world, from 2,500 m over the ground she cruises at 1 km/s, and faster still in the thinner air above (6 km/s at 20 km,
                       18 km/s at 60 km and up: today's high band). Over a town or a city (Natural Earth's populated places, read through places790's own
                       query at her spot and 6 s ahead) the pace eases back to today's calmer one.
     2 THE CLIMB       never faster than 1 km/s at any height (his rule: the climb does not grow with height); a steady climb.
     3 THE ALTIMETER   her height above the sea in FEET and her speed in MPH, in Space Mono at the foot of the screen, whenever she flies (the island too).
     4 THE FIRMAMENT   the dome: 3,100 mi (16,368,000 ft) over the Pole, easing down toward the rim of the disc 12,000 mi out (a flat-topped dome: over
                       the lands people live in it stands within 1% of its height); she flies up to 20 km under the stars set in it, never through. On the way the sky deepens to indigo and black,
                       the stars set in the dome come out, and below her the ground gives way to the disc itself: Gleason's own 1892 map (the scan the world
                       map already shows, assets/gleason/, fitted there: tests/map725-paper.json), laid under her where she really is.
                       The climb is 1 h 23 min at 1 km/s: above 100 km, nose up, a "Rise" pill skips it and says how long it would have taken.
                       At the top the dome is named (the game's own title card).
   PART 2 (Nov 15 2026, the coordinator's order from the row's own words and his sources):
     5 THE TWO GREAT LIGHTS  the sun and the moon are local lights circling inside the dome like the hands of a clock, one turn a game day (Ben Wehrman's
                       explainer, his pick: Rowbotham's figures, each 32 mi wide, ~3,000 mi up). The sun's circle widens and narrows with the season between the
                       Tropic of Cancer in June (4,600 mi from the Pole) and the Tropic of Capricorn in December (7,800 mi), eased day by day (the explainer's 03;
                       the date is the game's own season month when he picked one, else today's). From the ground both are DRAWN where people really see them
                       from where she stands (the explainer's 07, "the light has to bend"), so sunset is the sun going out of her view at the horizon. The
                       moon is the same height and size, about 50 minutes later every game day (12.19 degrees of its circle), and shows its phase. From high
                       up she sees both lights over the disc and the day as the lit area under the sun (Gleason's spotlight), the rest of the disc in night.
                       THE CLOCK STAYS IN STEP: at home the sun rises at the game clock's dawn (0) and sets at its dusk (2,100), exactly as before; out in the
                       world the sky's own clock (colours, light, stars) is her LOCAL time under the same sun, so a bright sky never hangs over a set sun.
                       Enoch's six portals (1 Enoch 72, the row's detail source): the portal the sun rises in is read from the same circle (six bands between
                       the tropics) and kept in peek() for a later word on screen; no line of 1 Enoch is shown (the house's rule: quoted exactly or not at all).
     6 THE SOFTER HAND-OVER  from 120 km to 300 km the world's own ground fades out over the disc (no pop), the haze and the sky's ground colour darken with
                       the sky; the only Gleason scan in the house is the 2,048 px one (no larger copy exists here; none was downloaded).
     7 THE RISE IS HONEST  the skipped climb moves the game clock by what that climb would have taken at the game's own pace (its days and dawns counted).
   HOW (no new shader program mid-play): every material is made at load and compiled with the page's renderer then; the sky's layer draws BEFORE the world
   (render order between the sky dome and the ground, no depth test), scaled toward her eye by K (the carib712 trick: the same angles, inside the far plane).
   Every number a DRAFT for Marth's pen. */
window.WFR_HIGH809 = (function () {
  'use strict';
  var MI = 1609.344;
  var C = { FAST_Y: 2500, FAST_V: 1000, CLIMB: 1000, DOME_MI: 3100, EDGE_MI: 12000, FT: 3.28084, MPH: 2.236936, K: 1 / 800, SKY0: 20000, SKY1: 200000,
    DISC0: 120000, DISC1: 300000, STAR0: 60000, STAR1: 600000, RISE_Y: 100000, NSTARS: 1800, GAP: 20000, SUN_MI: 3000, LIGHT_MI: 32, JUNE_MI: 4600, DEC_MI: 7800, MONTH: 29.530589, TILT: 23.44, CITY_MS: 500, AHEAD_S: 6 };
  C.DOME = C.DOME_MI * MI; C.EDGE = C.EDGE_MI * MI; C.DEG = C.EDGE / 180;   /* the disc: 12,000 mi from the Pole to the rim, every degree from the Pole 66.7 mi */
  var TODAY = [[1800, 60], [6000, 600], [20000, 6000], [60000, 18000]], FAST = [[1800, 60], [C.FAST_Y, C.FAST_V], [20000, 6000], [60000, 18000]];
  var PAPER = { src: 'assets/gleason/gleason-1892-disc-2048.jpg', cx: 1009, cy: 1021, r: 869, s: 4.7765, a: -89.775 * Math.PI / 180, px: 2048 };   /* world712-mapview.js PAPER725 */
  var X = null, st = { on: false, city: 0, cityWant: 0, cityAt: 0, cityName: '', ll: null, topNamed: false, rises: 0, hk: 0, sk: 0, ceil: C.DOME, frames: 0, tex: false, hid: false, err: null };

  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function curve(K, y) { if (y <= K[0][0]) return K[0][1]; if (y >= K[K.length - 1][0]) return K[K.length - 1][1];
    for (var i = 1; i < K.length; i++) if (y <= K[i][0]) { var a = K[i - 1], b = K[i], t = (y - a[0]) / (b[0] - a[0]); return a[1] * Math.pow(b[1] / a[1], t); } return K[K.length - 1][1]; }
  function fmt(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function hm(s) { var m = Math.round(s / 60), h = Math.floor(m / 60); return h ? h + ' h ' + (m % 60) + ' min' : m + ' min'; }
  /* the dome over a point r metres from the Pole: flat-topped (a superellipse), 3,100 mi at the Pole, down to the disc at the rim */
  function domeAt(r) { var q = Math.min(1, r / C.EDGE); return C.DOME * Math.pow(Math.max(0, 1 - q * q * q * q), 0.25); }
  function plane(ll) { var c = 90 - ll.lat, a = ll.lon * Math.PI / 180; return { x: c * Math.sin(a), y: c * Math.cos(a), c: c, a: a }; }   /* degrees from the Pole (the world map's 'pole' plane) */

  /* ---------- 5 the two great lights ---------- */
  var D2R = Math.PI / 180, TAU = 2 * Math.PI;
  function wrapPi(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function doy() {   /* the day of the year: his season month on the pause page (1-12, its middle), else today */
    var m = 0; try { m = +((JSON.parse(localStorage.getItem('wfr.hud795') || '{}') || {}).month) || 0; } catch (e) { m = 0; }
    if (m >= 1 && m <= 12) return Math.round((m - 1) * 30.44 + 15);
    var d = new Date(); return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  }
  function semi(ph, dec) { return Math.acos(Math.max(-0.995, Math.min(0.995, -Math.tan(ph) * Math.tan(dec)))); }   /* half the day's arc at a latitude */
  function sunAt(c) {   /* for the HOME clock c: the sun's declination, home's hour angle (0 = noon, + after), the moon's elongation and age */
    var n = doy(), lam = TAU * (n - 80) / 365.2422, dec = C.TILT * D2R * Math.sin(lam), DL = X.daylen || 2100, CY = X.cycle || 2700, H0 = semi(X.W.HOME.lat * D2R, dec);
    var H = c < DL ? -H0 + 2 * H0 * c / DL : H0 + (TAU - 2 * H0) * (c - DL) / (CY - DL);
    var days = (X.S.dawns || 0) + c / CY, age = (((st.age0 || 0) + days) % C.MONTH + C.MONTH) % C.MONTH, el = TAU * age / C.MONTH;
    return { n: n, lam: lam, dec: dec, H: H, el: el, age: age, decM: C.TILT * D2R * Math.sin(lam + el), lit: (1 - Math.cos(el)) / 2 };
  }
  function enu(ph, dec, H, v) { var E = -Math.cos(dec) * Math.sin(H), N = Math.cos(ph) * Math.sin(dec) - Math.sin(ph) * Math.cos(dec) * Math.cos(H), U = Math.sin(ph) * Math.sin(dec) + Math.cos(ph) * Math.cos(dec) * Math.cos(H); v.set(E, U, -N); return v; }
  function here() { var T = X.T; return T && T.on && T.ll ? T.ll : X.W.HOME; }
  function skyClock(c) {   /* the sky's clock where she is: HOME's clock at home, her local time under the same sun elsewhere */
    if (!st.on) return c; var ll = here(); if (ll === X.W.HOME) return c;
    var s = sunAt(c), DL = X.daylen || 2100, CY = X.cycle || 2700, Hl = wrapPi(s.H + (ll.lon - X.W.HOME.lon) * D2R), H0 = semi(ll.lat * D2R, s.dec);
    var out = Hl >= -H0 && Hl <= H0 ? (Hl + H0) / (2 * H0) * DL : DL + (Hl > H0 ? Hl - H0 : Hl + TAU - H0) / (TAU - 2 * H0) * (CY - DL);
    st.skyC = out; return Math.max(0, Math.min(CY - 0.001, out));
  }
  function sky(sunV, moonV, c) {   /* called by the page's sky clock after its own arcs: the two lights drawn where she really sees them */
    if (!st.on) return; var s = sunAt(c), ll = here(), ph = ll.lat * D2R, dl = (ll.lon - X.W.HOME.lon) * D2R;
    if (!st.nl) st.nl = moonV.clone(); st.nl.copy(moonV);   /* the page's own night arc, kept for the night's shadow light only (smooth; sky632 K11) */
    enu(ph, s.dec, s.H + dl, sunV); enu(ph, s.decM, s.H - s.el + dl, moonV);
    if (X.W.MODE === 'gleason' && X.W.turnEast) { X.W.turnEast(sunV, ll); X.W.turnEast(moonV, ll); }
    st.sun = s; st.portal = 1 + Math.min(5, Math.floor((Math.sin(s.lam) + 1) / 2 * 6));   /* Enoch's six portals: the band of the sun's circle between the tropics */
    phase(s);
  }
  function phase(s) {   /* the moon's own face: lit by the sun's side (its elongation), the dark part a faint earthshine, a soft glow round it */
    var md = X.moonDisc; if (!md) return; var key = Math.round(s.el * 40); if (st.phaseKey === key) return; st.phaseKey = key;
    if (!st.pc) { st.pc = document.createElement('canvas'); st.pc.width = st.pc.height = 128; st.pt = new X.THREE.CanvasTexture(st.pc); md.material.map = st.pt; }
    var g = st.pc.getContext('2d'), im = g.createImageData(128, 128), d = im.data, sx = Math.sin(s.el), sz = -Math.cos(s.el), R = 30;
    for (var j = 0; j < 128; j++) for (var i = 0; i < 128; i++) { var u = (i - 63.5) / R, v = (j - 63.5) / R, q = u * u + v * v, o = (j * 128 + i) * 4, a;
      if (q <= 1) { var z = Math.sqrt(1 - q), l = u * sx + z * sz, t = Math.max(0, Math.min(1, (l + 0.06) / 0.12)); a = 0.13 + 0.87 * t; d[o] = 236; d[o + 1] = 240; d[o + 2] = 255; d[o + 3] = Math.round(255 * Math.min(1, a * Math.min(1, (1 - q) * 12 + 0.4))); }
      else { var gl = Math.max(0, 1 - (Math.sqrt(q) - 1) / 1.1) * (0.08 + 0.3 * s.lit); d[o] = 170; d[o + 1] = 190; d[o + 2] = 255; d[o + 3] = Math.round(255 * gl * gl); } }
    g.putImageData(im, 0, 0); st.pt.needsUpdate = true;
  }

  /* ---------- 1 the fast band: today's knots become the fast ones; over a town the old pace comes back ---------- */
  function install() {
    var L = window.WFR_TRAVEL712; if (!L || L.__h809) return !!L; var K = L.C.KNOTS, more = K.filter(function (k) { return k[0] > 60000; });
    K.splice.apply(K, [0, K.length].concat(FAST.map(function (k) { return k.slice(); }), more));
    var base = L.speedAt; L.speedAt = function (y) { var v = base(y); return st.city > 0 ? v * (1 - st.city) + curve(TODAY, y) * st.city : v; };
    L.__h809 = true; return true;
  }
  function cityTick(now) {
    if (now - st.cityAt < C.CITY_MS) return; st.cityAt = now;
    var T = X.T, P = window.WFR_PLACES790, want = 0, name = '';
    if (T && T.on && P && P.near && T.f && X.W) {
      try { var S = X.S, ll = X.W.toLatLon(T.f, S.pos.x, S.pos.z), d = S.speed * C.AHEAD_S, ah = X.W.toLatLon(T.f, S.pos.x + Math.sin(S.yaw) * d, S.pos.z + Math.cos(S.yaw) * d);
        [ll, ah].forEach(function (q) { if (want) return; var L = P.near(q.lat, q.lon, null); for (var i = 0; i < L.length; i++) if (/^(city|capital|town)$/.test(L[i].k)) { want = 1; name = L[i].n; break; } });
      } catch (e) { st.err = 'city: ' + (e && e.message); }
    }
    st.cityWant = want; st.cityName = name;
  }

  /* ---------- 3 the altimeter and the Rise pill ---------- */
  var CSS = '#alt809{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 54px);transform:translateX(-50%);z-index:5;pointer-events:none;white-space:nowrap;' +
      'padding:3px 11px;border-radius:999px;border:1px solid rgba(150,170,230,.34);background:rgba(10,13,24,.72);color:#e9edf8;box-shadow:0 0 10px -3px rgba(77,232,201,.45);' +
      'font:700 9.5px/16px var(--h7-mono,"Space Mono",ui-monospace,Menlo,Consolas,monospace);letter-spacing:0;max-width:180px;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis}' +
    '#alt809[hidden],#rise809[hidden]{display:none}#alt809 b{color:#4de8c9;font-weight:700}#alt809.top b{color:#ffd45c}' +
    '#rise809{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 80px);transform:translateX(-50%);z-index:6;height:44px;max-width:160px;padding:0 16px;box-sizing:border-box;' +
      'border-radius:999px!important;border:1.5px solid #4de8c9!important;background:rgba(8,11,20,.86)!important;color:#e9edf8!important;font:700 12px/1 var(--h7-head,"Space Grotesk",system-ui,sans-serif);letter-spacing:.06em;' +
      'white-space:nowrap;box-shadow:0 0 14px -3px rgba(77,232,201,.6);touch-action:manipulation;-webkit-tap-highlight-color:transparent;pointer-events:auto}' +
    '#rise809 small{display:block;font:700 9.5px/1.2 var(--h7-mono,"Space Mono",monospace);color:#95a0bd;letter-spacing:.02em;margin-top:2px}';
  function hud() {
    var s = document.createElement('style'); s.id = 'high809css'; s.textContent = CSS; document.head.appendChild(s);
    var a = document.createElement('div'); a.id = 'alt809'; a.hidden = true; a.setAttribute('aria-live', 'off'); document.body.appendChild(a);
    var r = document.createElement('button'); r.id = 'rise809'; r.type = 'button'; r.hidden = true; document.body.appendChild(r);
    r.addEventListener('click', rise); st.alt = a; st.rise = r;
  }
  function ceilHere() {   /* the dome over where she is (out in the world); the island has its own sky and its own ceiling */
    if (!st.ll) return C.DOME - C.GAP; var p = plane(st.ll); return domeAt(p.c * C.DEG) - C.GAP;   /* she flies up to 20 km under the stars set in it */
  }
  function rise() {
    var S = X.S, T = X.T; if (!T || !T.on || S.mode !== 'fly') return; var c = st.ceil, left = c - 1000 - S.pos.y; if (left <= 0) return;
    S.pos.y = c - 1000; S.pitch = 0; st.rises++;
    /* 7: the clock moves by what the climb would have taken at the game's own pace (its dawns counted the way the clock counts them, crossing 150) */
    var secs = left / C.CLIMB, CY = X.cycle || 2700, u = secs * (X.daySpeed || 4.5) * (S.timeScale == null ? 1 : S.timeScale), c0 = S.clock;
    var n = Math.floor((c0 + u - 150) / CY) - Math.floor((c0 - 150) / CY); S.clock = (c0 + u) % CY; S.lastClock = S.clock; S.dawns = (S.dawns || 0) + Math.max(0, n);
    st.lastRise = { secs: Math.round(secs), units: Math.round(u), dawns: n, from: Math.round(c0), to: Math.round(S.clock) };
    if (X.toast) X.toast('A steady climb of ' + hm(secs) + ' at 1 km/s' + (n > 0 ? ': ' + n + (n === 1 ? ' day' : ' days') + ' went by on the way up.' : '.') + ' The dome is just above you.', 4600);
  }
  function hudTick() {
    var S = X.S, a = st.alt, r = st.rise; if (!a) return;
    var show = !X.classic() && (S.mode === 'fly' || S.mode === 'hover') && !(X.busy && X.busy());
    if (a.hidden === show) a.hidden = !show;
    if (show) { var top = X.T && X.T.on && S.pos.y >= st.ceil - 60, k = fmt(S.pos.y * C.FT) + ' ft · ' + fmt(S.speed * C.MPH) + ' mph';   /* at the top the feet turn gold */
      if (a.dataset.k !== k + top) { a.dataset.k = k + top; a.innerHTML = '<b>' + fmt(S.pos.y * C.FT) + '</b> ft · ' + fmt(S.speed * C.MPH) + ' mph'; a.classList.toggle('top', !!top); } }
    var rs = show && X.T && X.T.on && S.mode === 'fly' && S.pos.y > C.RISE_Y && S.pos.y < st.ceil - 5000 && S.pitch > 0.25;
    if (r.hidden === !!rs) r.hidden = !rs;
    if (rs) { var lab = 'Rise<small>' + hm((st.ceil - 1000 - S.pos.y) / C.CLIMB) + ' skipped</small>'; if (r.dataset.k !== lab) { r.dataset.k = lab; r.innerHTML = lab; } }
    /* the top: named once a visit */
    if (X.T && X.T.on && S.pos.y >= st.ceil - 60 && !st.topNamed) { st.topNamed = true; if (X.title) X.title('As high as she can go', 'The firmament', fmt((st.ceil + C.GAP) * C.FT) + ' ft above the disc'); }
    if (st.topNamed && S.pos.y < st.ceil - 100000) st.topNamed = false;
  }

  /* ---------- 4 the sky's layer: the deepening sky, the disc, the stars set in the dome ---------- */
  function layer() {
    var THREE = X.THREE, g = new THREE.Group(); g.name = 'high809'; g.visible = false; g.matrixAutoUpdate = true;
    var blend = { transparent: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, depthTest: false, depthWrite: false, fog: false };
    /* the sky deepening: a sphere round her eye, inside the sky dome (820), over it and its clouds */
    var sky = new THREE.Mesh(new THREE.SphereGeometry(700, 24, 12), new THREE.MeshBasicMaterial(Object.assign({ color: 0x1d2470, side: THREE.BackSide, opacity: 0 }, blend)));
    sky.renderOrder = -8.6; sky.frustumCulled = false;
    /* the disc: Gleason's paper in the Pole's plane (degrees), the disc mesh's own UVs from the paper's fitted pole, scale and turn */
    var R = PAPER.r / PAPER.s, geo = new THREE.RingGeometry(0.05, R, 160, 48), pos = geo.attributes.position, uv = geo.attributes.uv, ca = Math.cos(PAPER.a), sa = Math.sin(PAPER.a);
    var col = new Float32Array(pos.count * 3).fill(1), ll = new Float32Array(pos.count * 3);   /* 5: each vertex's daylight; its latitude's sine and cosine and its longitude */
    for (var i = 0; i < pos.count; i++) { var x = pos.getX(i), y = pos.getY(i), px = PAPER.cx + PAPER.s * (x * ca - y * sa), py = PAPER.cy + PAPER.s * (x * sa + y * ca); uv.setXY(i, px / PAPER.px, 1 - py / PAPER.px);
      var la = (90 - Math.hypot(x, y)) * D2R; ll[i * 3] = Math.sin(la); ll[i * 3 + 1] = Math.cos(la); ll[i * 3 + 2] = Math.atan2(x, y); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.rotateX(Math.PI / 2);   /* (x, y) of the plane onto (x, 0, y): seen from above it is the circle's back */
    var tex = new THREE.Texture(); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4;   /* 2048 px: mipmapped, so the disc never shimmers far off */
    var disc = new THREE.Mesh(geo, new THREE.MeshBasicMaterial(Object.assign({ map: tex, vertexColors: true, side: THREE.BackSide, opacity: 0 }, blend)));
    disc.renderOrder = -8.4; disc.frustumCulled = false; disc.visible = false;
    var discG = new THREE.Group(); discG.add(disc);
    if (location.protocol === 'file:') st.err = 'paper: a file page cannot hand the scan to WebGL'; else { var im = new Image(); im.onload = function () { tex.image = im; tex.needsUpdate = true; st.tex = true; try { if (X.renderer.initTexture) X.renderer.initTexture(tex); } catch (e) { /* uploaded on its first draw */ } };
    im.onerror = function () { st.err = 'paper'; }; im.src = PAPER.src; }
    /* the stars set in the dome: points on the dome's own surface over the whole disc, its turn once a day round the Pole */
    var n = C.NSTARS, p = new Float32Array(n * 3), s7 = 809, rnd = function () { s7 = (s7 * 16807) % 2147483647; return s7 / 2147483647; };
    for (var k = 0; k < n; k++) { var rr = C.EDGE * Math.sqrt(rnd()) * 0.995, aa = rnd() * Math.PI * 2; p[k * 3] = Math.cos(aa) * rr; p[k * 3 + 1] = domeAt(rr); p[k * 3 + 2] = Math.sin(aa) * rr; }
    var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    var stars = new THREE.Points(sg, new THREE.PointsMaterial(Object.assign({ color: 0xffffff, size: 1.8, sizeAttenuation: false, opacity: 0 }, blend, { blendDst: THREE.OneFactor })));
    stars.renderOrder = -8.2; stars.frustumCulled = false;
    var starG = new THREE.Group(); starG.add(stars);
    /* the two great lights over the disc: glows inside the dome (the page's own sprite paint: no new program) */
    var lightG = new THREE.Group(), mk = function (map) { var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: map, fog: false, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); sp.renderOrder = -8.1; sp.frustumCulled = false; lightG.add(sp); return sp; };
    var sunS = mk(X.sunDisc ? X.sunDisc.material.map : null), moonS = mk(X.moonDisc ? X.moonDisc.material.map : null);
    var eye = new THREE.Group(); eye.add(discG); eye.add(starG); eye.add(lightG); g.add(sky); g.add(eye);
    var LY = window.WFR_TRAVEL712 && WFR_TRAVEL712.C.LAYER; if (LY != null) g.traverse(function (o) { o.layers.enable(LY); });   /* out in the world the camera sees only the travel layer */
    X.scene.add(g);
    st.L = { g: g, sky: sky, disc: disc, discG: discG, stars: stars, starG: starG, eye: eye, tex: tex, col: col, ll: ll, lightG: lightG, sunS: sunS, moonS: moonS };
    /* compiled now, at load (the page's own renderer.compile): never a program in play */
    try { g.visible = true; disc.visible = true; X.renderer.compile(X.scene, X.camera); } catch (e) { /* the first frame compiles instead */ } g.visible = false;
  }
  var DEEP = null, BLACK = null;
  function frame(camera) {
    if (!X || !st.L) return; st.frames++;
    var S = X.S, T = X.T, L = st.L, out = !!(T && T.on), y = S.pos.y;
    if (out && T.f) { try { st.ll = X.W.toLatLon(T.f, S.pos.x, S.pos.z); } catch (e) { st.ll = null; } }
    st.ceil = out ? ceilHere() : C.DOME - C.GAP;
    var sk = out && !X.classic() ? smooth(C.SKY0, C.SKY1, y) : 0, hk = out && st.tex ? smooth(C.DISC0, C.DISC1, y) : 0, rk = out ? smooth(C.STAR0, C.STAR1, y) : 0; st.sk = sk; st.hk = hk;
    L.g.visible = sk > 0.001;
    /* 6: the world's own ground fades out over the disc (it would only be fog from up here), then goes */
    var gm = T && T.st && T.st.material, hide = hk >= 0.999;
    if (gm && (hk > 0.001 || st.faded)) { var fade = hk > 0.001 && !hide; gm.transparent = fade; gm.opacity = fade ? 1 - hk : 1; st.faded = fade; }
    if (T && T.st && T.st.group && (hide || st.hid)) { T.st.group.visible = !hide; st.hid = hide; }
    if (!DEEP) { DEEP = new X.THREE.Color(0x1d2470); BLACK = new X.THREE.Color(0x03040b); st.fogBase = new X.THREE.Color(); st.fogMine = new X.THREE.Color(-1, -1, -1); st.bgBase = new X.THREE.Color(); st.bgMine = new X.THREE.Color(-1, -1, -1); }
    /* the haze and the sky's own ground colour darken with the sky (from what the sky clock last painted: never compounding) */
    var fg = X.scene.fog && X.scene.fog.color, bg = X.scene.background && X.scene.background.isColor ? X.scene.background : null, deep = st.deepNow || DEEP;
    if (fg) { if (!fg.equals(st.fogMine)) st.fogBase.copy(fg); if (sk > 0.001) { fg.copy(st.fogBase).lerp(deep, 0.92 * sk); st.fogMine.copy(fg); } else if (!fg.equals(st.fogBase)) { fg.copy(st.fogBase); st.fogMine.setRGB(-1, -1, -1); } }
    if (bg) { if (!bg.equals(st.bgMine)) st.bgBase.copy(bg); if (sk > 0.001) { bg.copy(st.bgBase).lerp(deep, 0.92 * sk); st.bgMine.copy(bg); } else if (!bg.equals(st.bgBase)) { bg.copy(st.bgBase); st.bgMine.setRGB(-1, -1, -1); } }
    if (!L.g.visible) return;
    L.g.position.copy(camera.position);
    L.sky.material.color.copy(DEEP).lerp(BLACK, smooth(150000, 2000000, y)); L.sky.material.opacity = 0.97 * sk; st.deepNow = L.sky.material.color;
    /* the eye's scale: everything true-size about her eye, drawn at K of its distance (the same angles) */
    /* K of the true distance, small enough that the disc's far rim (and the stars over it) sit inside the camera's far plane, which the travel zone pulls
       in tight high up (a couple of km): the same angles, every point inside the frustum */
    var far = camera.far || 1600, k = Math.min(C.K, 0.45 * far / (y + 2.2 * C.EDGE)); L.eye.scale.setScalar(k); L.sky.scale.setScalar(Math.min(1, 0.4 * far / 700));
    L.disc.visible = hk > 0.001; L.disc.material.opacity = hk;
    L.stars.material.opacity = rk; L.stars.visible = rk > 0.001;
    if (st.ll) {
      var pl = plane(st.ll), M = C.DEG, lon = st.ll.lon * Math.PI / 180;
      /* the disc's plane laid under her: her own point under her eye, north toward the Pole (the frame's -z), east along +x */
      L.discG.scale.setScalar(M); L.discG.rotation.set(0, -lon, 0);
      var dx = M * (pl.x * Math.cos(lon) - pl.y * Math.sin(lon)), dz = M * (pl.x * Math.sin(lon) + pl.y * Math.cos(lon));
      var cp = camera.position; L.discG.position.set(S.pos.x - cp.x - dx, -cp.y, S.pos.z - cp.z - dz);   /* in the eye's frame (the camera at 0): her own point of the disc right under her */
      L.starG.position.copy(L.discG.position); L.starG.rotation.set(0, -lon + 2 * Math.PI * ((X.clock ? X.clock() : 0) / (X.cycle || 2700)), 0);
      /* 5: the sun and the moon over their own points of the disc, 3,000 mi up, each on the circle its declination gives (4,600 mi in June to 7,800 in December) */
      L.lightG.position.copy(L.discG.position); L.lightG.rotation.set(0, -lon, 0);
      var s = st.sun || sunAt(X.S.clock), up = C.SUN_MI * MI, w = C.LIGHT_MI * MI, hx = pl.x * M, hz = pl.y * M;
      var put = function (spr, dec, Hh, op) { var r = (6200 - 1600 * Math.sin(dec) / Math.sin(C.TILT * D2R)) * MI, lo = (X.W.HOME.lon * D2R) - Hh;   /* the light stands over the meridian where it is noon */
        var lx = r * Math.sin(lo), lz = r * Math.cos(lo), dist = Math.hypot(lx - hx, lz - hz, up - y);
        spr.position.set(lx, up, lz); spr.scale.setScalar(Math.max(w, dist * 0.03)); spr.material.opacity = op; spr.visible = op > 0.01; };
      put(L.sunS, s.dec, s.H, smooth(C.SKY0, C.DISC1, y)); put(L.moonS, s.decM, s.H - s.el, 0.4 + 0.6 * s.lit);
      if (L.moonS.material.map !== (st.pt || L.moonS.material.map) && st.pt) L.moonS.material.map = st.pt;
    }
  }

  function daylight(now) {   /* 5: Gleason's spotlight: the disc lit where the sun stands above her horizon (real sight), the rest in night */
    var L = st.L; if (!L || !L.disc.visible || now - (st.dayAt || 0) < 250) return; st.dayAt = now;
    var s = st.sun || sunAt(X.S.clock), sd = Math.sin(s.dec), cd = Math.cos(s.dec), H0 = s.H - X.W.HOME.lon * D2R, col = L.col, ll = L.ll, n = col.length / 3;
    var lit = 0; for (var i = 0; i < n; i++) { var j = i * 3, sa = ll[j] * sd + ll[j + 1] * cd * Math.cos(H0 + ll[j + 2]), t = Math.max(0, Math.min(1, (sa + 0.1) / 0.16)); t = t * t * (3 - 2 * t); if (t > 0.5) lit++;
      col[j] = 0.16 + 0.84 * t; col[j + 1] = 0.18 + 0.82 * t; col[j + 2] = 0.34 + 0.66 * t; }
    st.litShare = lit / n;
    L.disc.geometry.attributes.color.needsUpdate = true;
  }
  function loop(now) { requestAnimationFrame(loop); if (!X || !st.on) return; try { st.city += (st.cityWant - st.city) * 0.04; if (st.city < 0.002) st.city = 0; cityTick(now); hudTick(); daylight(now); } catch (e) { st.err = 'tick: ' + (e && e.message); } }

  function init(ctx) {
    if (X) return; X = ctx; if (X.classic()) return;   /* Classic is frozen: nothing of 809 */
    st.on = true; install(); hud();
    /* the moon's age today (a known new moon, 6 Jan 2000 18:14 UTC), so the game's days run on from the real phase */
    st.age0 = ((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % C.MONTH - ((X.S.dawns || 0) + X.S.clock / (X.cycle || 2700));
    try { layer(); } catch (e) { st.err = 'layer: ' + (e && e.message); }
    requestAnimationFrame(loop);
  }
  function climb(vy) { return st.on ? Math.min(vy, C.CLIMB) : vy; }
  function top(def) { return st.on ? st.ceil : def; }
  function peek() { return { on: st.on, city: +st.city.toFixed(3), cityWant: st.cityWant, cityName: st.cityName, ceil: Math.round(st.ceil), sk: +st.sk.toFixed(3), hk: +st.hk.toFixed(3), tex: st.tex, rises: st.rises,
    alt: st.alt && !st.alt.hidden ? st.alt.textContent : null, rise: st.rise && !st.rise.hidden ? st.rise.textContent : null, frames: st.frames, err: st.err, sun: st.sun ? { doy: st.sun.n, dec: +(st.sun.dec / D2R).toFixed(2), H: +(st.sun.H / D2R).toFixed(2), age: +st.sun.age.toFixed(2), el: +(st.sun.el / D2R).toFixed(2), lit: +st.sun.lit.toFixed(3), portal: st.portal } : null, skyC: st.skyC == null ? null : Math.round(st.skyC), lastRise: st.lastRise || null, faded: !!st.faded, litShare: st.litShare == null ? null : +st.litShare.toFixed(3), sunVis: !!(st.L && st.L.sunS.visible), phaseTex: !!(st.pt && X.moonDisc && X.moonDisc.material.map === st.pt), knots: window.WFR_TRAVEL712 ? WFR_TRAVEL712.C.KNOTS.map(function (k) { return k.slice(); }) : null }; }
  return { C: C, init: init, frame: frame, climb: climb, top: top, peek: peek, install: install, domeAt: domeAt, rise: rise, sky: sky, skyClock: skyClock, clockHere: function () { return X ? skyClock(X.S.clock) : 0; }, nightLight: function () { return st.on && st.nl ? st.nl : null; }, sunAt: function (c) { return X ? sunAt(c) : null; } };
})();
