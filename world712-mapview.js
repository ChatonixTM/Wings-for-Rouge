/* world712-mapview.js - BOARD 712 S7a (712e): THE WHOLE WORLD ON THE MAP (Marth, Oct 28 2026, verbatim: "Not just Jamaica, the whole world. I want
   you to port the whole damn world into the game today"; "Follow the Gleason map layout and airway flights to map accurate mapping"; "don’t cut any
   corners and actually make the mechs and graphics and functions well"). Trunks, Oct 28. Wired by tools/wiring/wire-712e-worldmap.js; guard
   tests/worldmap712.js.
   The radar's chart (705) gains a "World" tab. The island chart is untouched and stays the default every time the map opens.
   Two TRUE projections of the one measured globe (WFR_WORLD), a toggle:
     - "Globe-true": equirectangular (plate carree), every place at its real latitude and longitude, east-west wrapping round;
     - "North-pole (Gleason style)": azimuthal equidistant centred on the North Pole, out to the South Pole at the rim (the layout of Gleason's
       1892 map; every distance FROM THE POLE is true).
   A 2-D canvas only: no WebGL, no shader. Lines are Path2D objects built once per projection in "plane" units (degrees), drawn under one transform,
   so a pan or pinch costs a transform, not a rebuild. Her home (WFR_WORLD.HOME) and the places she knows (WFR_WORLD.PLACES) are always marked;
   a tapped place shows its great-circle distance from home (WFR_WORLD.distance) and the great circle itself, the way an airliner flies it.
   Nothing here runs per game frame: it draws only while the world view is open and something changed. */
window.WMAP712 = (function () {
  'use strict';
  var D2R = Math.PI / 180, PAPER = '#f1e2b8', INK = '#3a1d0c';
  var NE_CREDIT = 'Natural Earth (public domain).';   // the terrain half of the credit is read from the page's own #credit712 (board 712 S0), the line LICENSES.md records
  function credit() { var t = document.getElementById('credit712'); return NE_CREDIT + (t ? ' ' + t.textContent.trim() : ''); }
  var OCEANS = [['Pacific Ocean', 0, -150, 0], ['Pacific Ocean', 18, 165, 1], ['Atlantic Ocean', 30, -42, 0], ['Atlantic Ocean', -22, -14, 1], ['Indian Ocean', -20, 78, 0], ['Arctic Ocean', 81, 150, 0], ['Southern Ocean', -60, 60, 1], ['Southern Ocean', -60, -110, 1], ['Caribbean Sea', 14.6, -73.5, 2], ['Gulf of Mexico', 25.3, -90.2, 2], ['Mediterranean Sea', 34.6, 18, 2]];   // ours: the oceans' names (Natural Earth's sea polygons were not downloaded)
  var S = { el: null, src: null, view: 'island', proj: 'globe', k: 1, cX: 0, cY: 0, cw: 0, ch: 0, dpr: 1, loaded: false, loading: false, failed: false, built: {}, sel: null,
    draws: 0, ms: 0, want: false, made: 0, cvs: [], waits: 0, jobs: [], job: null, next: null, progress: 0, error: null, base: {}, detail: null, rjob: null, dt: 0, renders: [], opens: 0, toggles: 0, needHome: true, gestures: 0 };
  var D = null;   // the decoded world: rings and lines as Float64Array [lat, lon, ...], cities, regions, the raster
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- the two projections: (lat, lon) to the plane (degrees), and back ---------- */
  function P(lat, lon, o) {
    if (S.proj === 'pole') { var r = 90 - lat, a = lon * D2R; o.x = r * Math.sin(a); o.y = r * Math.cos(a); }   // azimuthal equidistant on the North Pole: 0 deg down, east anticlockwise (as seen from above the pole), the rim the South Pole
    else { o.x = lon; o.y = -lat; }   // equirectangular: x east, y south
    return o;
  }
  function invP(X, Y) {
    if (S.proj === 'pole') { var r = Math.hypot(X, Y); if (r > 180) return null; return { lat: 90 - r, lon: r < 1e-9 ? 0 : Math.atan2(X, Y) / D2R }; }
    if (Y < -90 || Y > 90) return null; return { lat: -Y, lon: ((X + 180) % 360 + 360) % 360 - 180 };
  }
  var tmp = { x: 0, y: 0 };
  function nearX(X) { return S.proj === 'pole' ? X : X + 360 * Math.round((S.cX - X) / 360); }   // equirectangular wraps: the copy nearest the view
  function toScreen(lat, lon) { P(lat, lon, tmp); return { x: S.cw / 2 + (nearX(tmp.x) - S.cX) * S.k, y: S.ch / 2 + (tmp.y - S.cY) * S.k }; }
  function fromScreen(sx, sy) { return invP(S.cX + (sx - S.cw / 2) / S.k, S.cY + (sy - S.ch / 2) / S.k); }
  function kMin() { return S.proj === 'pole' ? Math.min(S.cw, S.ch) / 360 * 0.86 : Math.max(S.cw / 360, S.ch / 180 * 0.62); }
  var K_MAX = 140;   // about 15 km a pixel on the equator: Jamaica a thumb wide. Street level is the later, streamed tier.
  function clampView() {
    var k0 = kMin(); S.k = Math.max(k0, Math.min(K_MAX, S.k));
    if (S.proj === 'pole') { var r = Math.hypot(S.cX, S.cY); if (r > 180) { S.cX *= 180 / r; S.cY *= 180 / r; } }
    else { S.cX = ((S.cX + 180) % 360 + 360) % 360 - 180; var hh = S.ch / 2 / S.k; S.cY = 180 * S.k <= S.ch ? 0 : Math.max(-90 + hh, Math.min(90 - hh, S.cY)); }
  }
  function homeView() {
    var H = window.WFR_WORLD && WFR_WORLD.HOME;
    if (S.proj === 'pole') { S.k = kMin(); S.cX = 0; S.cY = 0; }
    else { S.k = Math.max(kMin(), S.ch / 180 * 0.98); S.cX = H ? H.lon : 0; S.cY = 0; }
    clampView();
  }

  /* ---------- the first build, IN SLICES (Su 36, Oct 28: no frozen tap on her phone). Every piece of work (decoding the file, colouring the
     relief, re-projecting it for the pole view, building the paths) is a small step; a pump runs steps for at most BUDGET ms, then hands the
     phone back (a fresh task), so no tap and no frame waits on more than one slice. Meanwhile the map shows "Drawing the world…". ---------- */
  var BUDGET = 8;
  function dec(s, q) { var out = [], i = 0, la = 0, lo = 0, n = s.length, b, sh, r;
    while (i < n) { sh = 0; r = 0; do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32 && i < n); la += (r & 1) ? ~(r >> 1) : (r >> 1);
      sh = 0; r = 0; do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32 && i < n); lo += (r & 1) ? ~(r >> 1) : (r >> 1); out.push(la / q, lo / q); }
    return new Float64Array(out); }
  /* ---------- the colours of the raster: sea by depth, land by height, light from the north-west, the paper's grain (the island chart's own recipe) ---------- */
  /* THE CLASSROOM ATLAS LOOK (Marth, Oct 28: "the islands in their aireal (mapped from above view) topography to show on the map. think opening any map of
     land when i was in history or geography class"): an original palette in that tradition. The sea pale on the shelf, navy in the deeps; the land green
     in the lowlands, then yellow-tan, then browns, then white peaks; every slope lit from the north-west. */
  var SEA = [[-8000, 22, 52, 104], [-5000, 38, 82, 140], [-3000, 62, 116, 172], [-1000, 104, 160, 206], [-200, 150, 199, 228], [0, 196, 228, 240]];
  var LAND = [[0, 112, 168, 98], [150, 142, 186, 108], [400, 196, 206, 128], [800, 226, 206, 142], [1300, 214, 170, 112], [2000, 182, 130, 88], [3000, 150, 104, 78], [4000, 196, 184, 176], [4800, 244, 244, 244]];
  var SHADE_LAND = 12, SHADE_SEA = 5;   // how strongly a slope turned to the north-west lights (and one turned away darkens): 0 would be a flat map
  function ramp(R, e) { if (e <= R[0][0]) return R[0]; for (var k = 1; k < R.length; k++) if (e <= R[k][0]) { var a = R[k - 1], b = R[k], t = (e - a[0]) / (b[0] - a[0]); return [0, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; } return R[R.length - 1]; }
  function mk() { S.made++; var c = document.createElement('canvas'); S.cvs.push(c); return c; }   // every canvas the map makes is counted (the bench holds the count bounded)
  var POOL = {};
  function backCanvas(key, front, w, h) { var two = POOL[key] || (POOL[key] = [mk(), mk()]), c = two[0] === front ? two[1] : two[0]; if (c.width !== w) c.width = w; if (c.height !== h) c.height = h; return c; }   // the one not on show; its size set only when it changes
  function toCanvas(px, w, h) { var c = mk(); c.width = w; c.height = h; var g = c.getContext('2d'), im = g.createImageData(w, h); im.data.set(px); g.putImageData(im, 0, 0); return c; }
  var RIMG = null;
  /* ---------- the vector layers in plane units, once per projection: each ring a Float32Array with its box (so a close look draws only what it
     sees), and the whole layer as one Path2D (for the base picture) ---------- */
  function ringPlane(p) {   // a long east-west step is cut into 2-degree pieces in the pole view, so an edge along a parallel follows its circle
    var o = { x: 0, y: 0 }, n = p.length / 2, out = [], x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; if (n < 2) return null;
    var put = function () { out.push(o.x, o.y); if (o.x < x0) x0 = o.x; if (o.x > x1) x1 = o.x; if (o.y < y0) y0 = o.y; if (o.y > y1) y1 = o.y; };
    P(p[0], p[1], o); put();
    for (var i = 1; i < n; i++) { var la = p[i * 2], lo = p[i * 2 + 1];
      if (S.proj === 'pole') { var pla = p[i * 2 - 2], plo = p[i * 2 - 1], dl = lo - plo; if (Math.abs(dl) > 2) { var m = Math.ceil(Math.abs(dl) / 2); for (var k = 1; k < m; k++) { P(pla + (la - pla) * k / m, plo + dl * k / m, o); put(); } } }
      P(la, lo, o); put(); }
    return { p: new Float32Array(out), b: [x0, y0, x1, y1] };
  }
  function addPts(path, q) {   /* no closePath: every baked ring ends on its own first point (the bake makes sure), and Chrome's Path2D.closePath slows as the
       path grows (measured Oct 28: the land took 312 ms with it, 2.7 ms without); fill and clip close a sub-path by themselves */
    path.moveTo(q[0], q[1]); for (var i = 2; i < q.length; i += 2) path.lineTo(q[i], q[i + 1]);
  }
  function stepsFor(proj) {   // the work list for one projection (the decode and the relief's colours are shared: done by the first)
    var st = [], W = window.WFR_WORLDMAP712, q = W.q, w = W.raster.w, h = W.raster.h, bin = null, B = null, ROWS = 32;
    if (!D) {
      st.push(function () { D = { land: [], coast: [], lakes: [], glaciers: [], rivers: [], countries: W.countries, cities: [], regions: [], ras: null }; });
      ['land', 'coast', 'lakes', 'glaciers', 'rivers'].forEach(function (key) { var arr = W[key];
        for (var a = 0; a < arr.length; a += 200) (function (a) { st.push(function () { for (var i = a; i < Math.min(arr.length, a + 200); i++) D[key].push(key === 'rivers' ? { p: dec(arr[i][0], q), rank: arr[i][1] } : dec(arr[i], q)); }); })(a); });
      st.push(function () { D.cities = W.cities.map(function (c) { return { name: c[0], country: W.countries[c[1]] || '', lat: c[2] / q, lon: c[3] / q, rank: c[4], pop: c[5], cap: !!c[6] }; });
        D.regions = W.regions.map(function (r) { return { name: r[0], kind: r[1], lat: r[2] / q, lon: r[3] / q, rank: r[4] }; }); });
      st.push(function () { bin = atob(W.raster.b64); D.ras = { w: w, h: h, e: new Float32Array(w * h) }; });
      for (var r0 = 0; r0 < h; r0 += ROWS * 2) (function (r0) { st.push(function () { var e = D.ras.e; for (var k = r0 * w; k < Math.min(h, r0 + ROWS * 2) * w; k++) { var b = bin.charCodeAt(k); e[k] = b < 128 ? -11000 * Math.pow((127 - b) / 127, 2) : 9000 * Math.pow((b - 128) / 127, 2); } }); })(r0);
      st.push(function () { bin = null; S.loaded = true; });
    }
    if (!RIMG) {
      st.push(function () { RIMG = { w: w, h: h, sea: new Uint8ClampedArray(w * h * 4), land: new Uint8ClampedArray(w * h * 4), done: false }; });
      for (var j0 = 0; j0 < h; j0 += ROWS / 2) (function (j0) { st.push(function () { colourRows(j0, Math.min(h, j0 + ROWS / 2)); }); })(j0);   // 16 rows a step: the heaviest step of the build (10-20 ms at 32 rows on a busy machine)
      st.push(function () { RIMG.done = true; });
    }
    st.push(function () { B = { img: null, ov: [], R: null, path: null, city: [], region: [], ocean: [] }; });
    if (proj !== 'pole') {
      st.push(function () { B.img = { sea: toCanvas(RIMG.sea, w, h), land: null, x0: -180, y0: -90, ww: 360, hh: 180 }; });
      st.push(function () { B.img.land = toCanvas(RIMG.land, w, h); });
    } else {
      var N = 1024, pse = null, pla = null;
      st.push(function () { pse = new Uint8ClampedArray(N * N * 4); pla = new Uint8ClampedArray(N * N * 4); });
      for (var p0 = 0; p0 < N; p0 += ROWS) (function (p0) { st.push(function () { poleRows(pse, pla, N, p0, Math.min(N, p0 + ROWS)); }); })(p0);
      st.push(function () { B.img = { sea: toCanvas(pse, N, N), land: null, x0: -180, y0: -180, ww: 360, hh: 360 }; pse = null; });
      st.push(function () { B.img.land = toCanvas(pla, N, N); pla = null; });
    }
    if (!OVS) OVS = overlaySources();
    OVS.forEach(function (o) { if (o.coloured) return; for (var r0 = 0; r0 < o.h; r0 += 24) (function (r0) { st.push(function () { shadeInto(o.e, o.w, o.h, r0, Math.min(o.h, r0 + 24), o.sea, o.land, o.cellW, o.cellH, o.contour, false); }); })(r0); st.push(function () { o.coloured = true; }); });
    var plans = OVS.map(function (o) { return overlayPlan(o, proj); });
    plans.forEach(function (L) { for (var r0 = 0; r0 < L.H; r0 += 24) (function (r0) { st.push(function () { overlayRows(L, r0, Math.min(L.H, r0 + 24)); }); })(r0);
      st.push(function () { B.ov.push({ id: L.o.id, sea: toCanvas(L.sea, L.W, L.H), land: toCanvas(L.land, L.W, L.H), x0: L.x0, y0: L.y0, ww: L.W / L.d, hh: L.H / L.d }); L.sea = L.land = null; }); });
    st.push(function () { B.R = { land: [], coast: [], lakes: [], glaciers: [], riv0: [], riv1: [], riv2: [] }; B.path = { land: new Path2D(), coast: new Path2D(), lakes: new Path2D(), glaciers: new Path2D(), riv0: new Path2D(), riv1: new Path2D(), riv2: new Path2D() }; });
    ['land', 'coast', 'lakes', 'glaciers', 'rivers'].forEach(function (key) { var n = (W[key] || []).length;
      for (var a = 0; a < n; a += 250) (function (a) { st.push(function () { var arr = D[key];
        for (var i = a; i < Math.min(arr.length, a + 250); i++) { var to = key === 'rivers' ? 'riv' + (arr[i].rank <= 3 ? 0 : arr[i].rank <= 5 ? 1 : 2) : key, r = ringPlane(key === 'rivers' ? arr[i].p : arr[i]); if (!r) continue; B.R[to].push(r); addPts(B.path[to], r.p); } }); })(a); });
    st.push(function () { var o = { x: 0, y: 0 };
      D.cities.forEach(function (c) { P(c.lat, c.lon, o); B.city.push(o.x, o.y); }); D.regions.forEach(function (c) { P(c.lat, c.lon, o); B.region.push(o.x, o.y); });
      OCEANS.forEach(function (c) { P(c[1], c[2], o); B.ocean.push(o.x, o.y); }); S.built[proj] = B; });
    return st;
  }
  function shadeInto(e, w, h, j0, j1, sea, land, cellWf, cellH, contour, wrap) {   // sea by depth, land by height, the light from the north-west, the paper's grain, faint contours if asked
    for (var j = j0; j < j1; j++) { var cellW = cellWf(j);
      for (var i = 0; i < w; i++) { var k = j * w + i, v = e[k], W_ = e[j * w + (wrap ? (i + w - 1) % w : Math.max(0, i - 1))], E_ = e[j * w + (wrap ? (i + 1) % w : Math.min(w - 1, i + 1))], N_ = e[Math.max(0, j - 1) * w + i], S_ = e[Math.min(h - 1, j + 1) * w + i];
        var slope = (E_ - W_) / (2 * cellW) + (S_ - N_) / (2 * cellH), n = (((i * 73856093) ^ (j * 19349663)) >>> 0) % 5 - 2;   // rising to the east and the south: a face turned to the north-west, lit. The grain a hash: the same on every load
        var cs = ramp(SEA, Math.min(-30, v)), ss = Math.max(0.86, Math.min(1.14, 1 + slope * SHADE_SEA)), cl = ramp(LAND, Math.max(0, v)), sl = Math.max(0.6, Math.min(1.36, 1 + slope * SHADE_LAND)), o = k * 4;
        if (contour && v > 0 && (Math.floor(v / contour) !== Math.floor(E_ / contour) || Math.floor(v / contour) !== Math.floor(S_ / contour))) sl *= 0.88;   // a faint contour
        sea[o] = cs[1] * ss * 0.94 + 14.6 + n; sea[o + 1] = cs[2] * ss * 0.94 + 13.6 + n; sea[o + 2] = cs[3] * ss * 0.94 + 11 + n; sea[o + 3] = 255;
        land[o] = cl[1] * sl * 0.94 + 14.6 + n; land[o + 1] = cl[2] * sl * 0.94 + 13.6 + n; land[o + 2] = cl[3] * sl * 0.94 + 11 + n; land[o + 3] = 255; } }
  }
  function colourRows(j0, j1) { var r = D.ras; shadeInto(r.e, r.w, r.h, j0, j1, RIMG.sea, RIMG.land, function (j) { return Math.max(2000, 40030174 / r.w * Math.cos((90 - (j + 0.5) * 180 / r.h) * D2R)); }, 20015087 / r.h, 0, true); }
  /* DETAIL SHARPENS WITH ZOOM: the Caribbean at 0.1 degree (baked into world712-map.js) and, round home, the 4 km true-scale grid the game already carries
     (world712-carib.js, azimuthal equidistant round home: no new bytes), each shaded like the world and laid over it, feathered over its last 3 cells */
  var OV_DENSITY = { carib: 12, carib4: 30 };   // a picture's pixels per plane degree
  var OVS = null;
  function overlaySources() {
    var out = [], W = window.WFR_WORLDMAP712;
    (W.relief || []).forEach(function (R) { var bin = atob(R.b64), n = bin.length, e = new Float32Array(n), step = (R.lon1 - R.lon0) / R.w;
      for (var i = 0; i < n; i++) { var b = bin.charCodeAt(i); e[i] = b < 128 ? -11000 * Math.pow((127 - b) / 127, 2) : 9000 * Math.pow((b - 128) / 127, 2); }
      out.push({ id: R.id, w: R.w, h: R.h, e: e, cellW: function (j) { return step * 111320 * Math.cos((R.lat1 - (j + 0.5) * step) * D2R); }, cellH: step * 111320, contour: 0,
        at: function (lat, lon) { return { fx: (lon - R.lon0) / step - 0.5, fy: (R.lat1 - lat) / step - 0.5 }; },
        edge: function () { var pts = []; for (var t = 0; t <= 40; t++) { var f = t / 40; pts.push([R.lat0, R.lon0 + f * (R.lon1 - R.lon0)], [R.lat1, R.lon0 + f * (R.lon1 - R.lon0)], [R.lat0 + f * (R.lat1 - R.lat0), R.lon0], [R.lat0 + f * (R.lat1 - R.lat0), R.lon1]); } return pts; } }); });
    var C = window.WFR_CARIB712;
    if (C && C.b64 && C.n) { var cb = atob(C.b64), cn = C.n, ce = new Float32Array(cn * cn), R0 = 6371008.8, p1 = C.home.lat * D2R, l1 = C.home.lon * D2R;
      for (var k = 0; k < cn * cn; k++) { var u = cb.charCodeAt(k * 2) | (cb.charCodeAt(k * 2 + 1) << 8); ce[k] = u > 32767 ? u - 65536 : u; }   // Int16, little-endian
      out.push({ id: 'carib4', w: cn, h: cn, e: ce, cellW: function () { return C.cell; }, cellH: C.cell, contour: 200,
        at: function (lat, lon) { var p2 = lat * D2R, dl = lon * D2R - l1, c = Math.acos(Math.max(-1, Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl)))), th = Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)), x = R0 * c * Math.sin(th), nn = R0 * c * Math.cos(th);
          return { fx: (x + C.half) / C.cell, fy: (C.half - nn) / C.cell }; },   // its column x east, its row z south (bake-712b's own frame)
        edge: function () { var pts = []; for (var t = 0; t <= 40; t++) { var f = -C.half + 2 * C.half * t / 40; [[f, -C.half], [f, C.half], [-C.half, f], [C.half, f]].forEach(function (q) { var d = Math.hypot(q[0], q[1]) / R0, th = Math.atan2(q[0], q[1]), p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th)); pts.push([p2 / D2R, (l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2))) / D2R]); }); } return pts; } }); }
    out.forEach(function (o) { o.sea = new Uint8ClampedArray(o.w * o.h * 4); o.land = new Uint8ClampedArray(o.w * o.h * 4); });
    return out;
  }
  function overlayPlan(o, proj) {   // the picture's box in the plane, for one projection
    var was = S.proj; S.proj = proj; var q = { x: 0, y: 0 }, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    o.edge().forEach(function (pt) { P(pt[0], pt[1], q); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }); S.proj = was;
    var d = OV_DENSITY[o.id] || 12, W = Math.max(2, Math.ceil((x1 - x0) * d)), H = Math.max(2, Math.ceil((y1 - y0) * d));
    return { o: o, d: d, x0: x0, y0: y0, W: W, H: H, sea: new Uint8ClampedArray(W * H * 4), land: new Uint8ClampedArray(W * H * 4) };
  }
  function overlayRows(L, j0, j1) {   // each pixel of the picture: back to latitude and longitude, into the grid, bilinear; feathered near the grid's edge
    var o = L.o, w = o.w, h = o.h;
    for (var j = j0; j < j1; j++) for (var i = 0; i < L.W; i++) { var ll = invP(L.x0 + (i + 0.5) / L.d, L.y0 + (j + 0.5) / L.d); if (!ll) continue; var g = o.at(ll.lat, ll.lon), fx = g.fx, fy = g.fy, m = Math.min(fx, fy, w - 1 - fx, h - 1 - fy); if (!(m >= 0)) continue;
      var a = Math.min(1, m / 3), x0 = Math.min(w - 2, Math.floor(fx)), y0 = Math.min(h - 2, Math.floor(fy)), tx = fx - x0, ty = fy - y0, A = (y0 * w + x0) * 4, B2 = A + 4, Cc = A + w * 4, Dd = Cc + 4, out = (j * L.W + i) * 4;
      for (var t = 0; t < 2; t++) { var s0 = t ? o.land : o.sea, d0 = t ? L.land : L.sea; for (var ch = 0; ch < 3; ch++) d0[out + ch] = (s0[A + ch] * (1 - tx) + s0[B2 + ch] * tx) * (1 - ty) + (s0[Cc + ch] * (1 - tx) + s0[Dd + ch] * tx) * ty; d0[out + 3] = 255 * a; } }
  }
  function poleRows(sea, land, N, j0, j1) {   // the relief re-projected for the pole view, pixel by pixel (bilinear)
    var w = RIMG.w, h = RIMG.h, src = [RIMG.sea, RIMG.land], dst = [sea, land];
    for (var j = j0; j < j1; j++) for (var i = 0; i < N; i++) { var X = -180 + (i + 0.5) * 360 / N, Y = -180 + (j + 0.5) * 360 / N, r = Math.hypot(X, Y); if (r > 180.5) continue;
      var lat = 90 - Math.min(180, r), lon = Math.atan2(X, Y) / D2R, fx = (lon + 180) / 360 * w - 0.5, fy = Math.max(0, Math.min(h - 1.001, (90 - lat) / 180 * h - 0.5)), x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      var a = ((y0 * w) + ((x0 % w) + w) % w) * 4, b = ((y0 * w) + ((x0 + 1) % w + w) % w) * 4, c = (((y0 + 1) * w) + ((x0 % w) + w) % w) * 4, d = (((y0 + 1) * w) + ((x0 + 1) % w + w) % w) * 4, o = (j * N + i) * 4;
      for (var L = 0; L < 2; L++) { var s = src[L], t = dst[L]; for (var ch = 0; ch < 3; ch++) t[o + ch] = (s[a + ch] * (1 - tx) + s[b + ch] * tx) * (1 - ty) + (s[c + ch] * (1 - tx) + s[d + ch] * tx) * ty; t[o + 3] = 255; } }
  }
  function ensure(proj) {   // true when the projection is ready; otherwise its build is started (or queued behind the one running)
    if (S.built[proj]) return true; if (!window.WFR_WORLDMAP712 || S.failed) return false;
    if (S.job) { if (S.job.proj !== proj) S.next = proj; return false; }
    S.job = { proj: proj, steps: stepsFor(proj), i: 0, t0: performance.now(), slices: 0, longest: 0, worst: 0, worstAt: -1 }; requestAnimationFrame(pump); return false;
  }
  function pump() {
    var J = S.job; if (!J) return; var t = performance.now(), was = S.proj; S.proj = J.proj;   // a step projects in ITS projection, whatever the view shows
    try { do { var t1 = performance.now(); J.steps[J.i++](); var d1 = performance.now() - t1; if (d1 > J.worst) { J.worst = d1; J.worstAt = J.i - 1; } } while (J.i < J.steps.length && performance.now() - t < BUDGET); } catch (e) { S.failed = true; S.error = String(e && e.message || e); J.i = J.steps.length; } finally { S.proj = was; }
    var sl = performance.now() - t; J.slices++; if (sl > J.longest) J.longest = sl; S.progress = 0.9 * J.i / J.steps.length;
    if (J.i < J.steps.length) { want(); requestAnimationFrame(pump); return; }   // the next slice in the next frame: the card's bar moves, a tap is answered
    S.job = null; S.jobs.push({ proj: J.proj, ms: Math.round(performance.now() - J.t0), slices: J.slices, longestSlice: Math.round(J.longest * 10) / 10, worstStep: Math.round(J.worst * 10) / 10, worstAt: J.worstAt, steps: J.steps.length });
    var nx = S.next; S.next = null; if (nx) ensure(nx); want();
  }
  var CACHE = true;   // the still world drawn once into a picture and slid while her thumb moves (false: every frame draws it all, as before Oct 28)
  var KEYS = ['land', 'coast', 'lakes', 'glaciers', 'riv0', 'riv1', 'riv2'];
  function copiesFor(proj, V) { if (proj === 'pole') return [0]; var out = [], half = V.w / 2 / V.k; for (var n = -2; n <= 2; n++) { var o = n * 360; if (o - 180 < V.cX + half && o + 180 > V.cX - half) out.push(o); } return out; }
  function culled(B, V, off) {   // only the rings whose box meets the view (one degree to spare)
    var x0 = V.cX - V.w / 2 / V.k - off - 1, x1 = V.cX + V.w / 2 / V.k - off + 1, y0 = V.cY - V.h / 2 / V.k - 1, y1 = V.cY + V.h / 2 / V.k + 1, out = {};
    KEYS.forEach(function (key) { var path = new Path2D(); B.R[key].forEach(function (r) { var b = r.b; if (b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1) return; addPts(path, r.p); }); out[key] = path; });
    return out;
  }
  function layerSteps(B, proj, V, ctx, cull) {   // the still world for view V into ctx, as six steps
    var offs = copiesFor(proj, V), paths = [], px = 1 / V.k, I = B.img, st = [];
    var setT = function (off) { var sc = V.k * V.dpr; ctx.setTransform(sc, 0, 0, sc, V.dpr * (V.w / 2 + (off - V.cX) * V.k), V.dpr * (V.h / 2 - V.cY * V.k)); };
    var each = function (fn) { offs.forEach(function (off, i) { setT(off); fn(paths[i]); }); };
    st.push(function () { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.imageSmoothingEnabled = true;
      offs.forEach(function (off, i) { paths[i] = cull ? culled(B, V, off) : B.path; }); each(function () { ctx.drawImage(I.sea, I.x0, I.y0, I.ww, I.hh); B.ov.forEach(function (ov) { ctx.drawImage(ov.sea, ov.x0, ov.y0, ov.ww, ov.hh); }); }); });   // the sharper reliefs over the world's
    st.push(function () { each(function (q) { ctx.save(); ctx.clip(q.land); ctx.drawImage(I.land, I.x0, I.y0, I.ww, I.hh); B.ov.forEach(function (ov) { ctx.drawImage(ov.land, ov.x0, ov.y0, ov.ww, ov.hh); }); ctx.restore(); }); });
    st.push(function () { each(function (q) { ctx.fillStyle = 'rgba(250,252,255,.88)'; ctx.fill(q.glaciers); ctx.lineWidth = 0.7 * px; ctx.strokeStyle = 'rgba(140,170,196,.55)'; ctx.stroke(q.glaciers);
      ctx.fillStyle = 'rgb(150,192,210)'; ctx.fill(q.lakes); ctx.lineWidth = 0.7 * px; ctx.strokeStyle = 'rgba(47,95,134,.7)'; ctx.stroke(q.lakes); }); });
    st.push(function () { each(function (q) { ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (var rv = 0; rv < 3; rv++) { var a = rv === 0 ? 1 : fadeAt(rv === 1 ? 3 : 5, V.k); if (a <= 0) continue; ctx.globalAlpha = a * 0.85; ctx.strokeStyle = 'rgb(62,118,168)'; ctx.lineWidth = (rv === 0 ? 1.2 : rv === 1 ? 0.9 : 0.7) * px; ctx.stroke(q['riv' + rv]); }
      ctx.globalAlpha = 1; }); });
    st.push(function () { each(function (q) { ctx.strokeStyle = 'rgba(58,29,12,.78)'; ctx.lineWidth = 0.85 * px; ctx.stroke(q.coast); }); });
    st.push(function () { each(function () {
      var step = V.k > 30 ? 5 : V.k > 9 ? 10 : 30, grat = new Path2D(), lat, lon;
      for (lat = -90 + step; lat < 90; lat += step) if (lat !== 0) parallel(grat, lat);
      for (lon = -180; lon < 180; lon += step) meridian(grat, lon, -90, proj === 'pole' ? 90 - step : 90);
      ctx.strokeStyle = 'rgba(58,29,12,.22)'; ctx.lineWidth = 0.8 * px; ctx.stroke(grat);
      var trop = new Path2D(); parallel(trop, 23.44); parallel(trop, -23.44); ctx.setLineDash([4 * px, 4 * px]); ctx.strokeStyle = 'rgba(178,120,40,.55)'; ctx.lineWidth = 0.9 * px; ctx.stroke(trop);
      var polar = new Path2D(); parallel(polar, 66.56); parallel(polar, -66.56); ctx.strokeStyle = 'rgba(60,110,150,.55)'; ctx.stroke(polar); ctx.setLineDash([]);
      var eq = new Path2D(); parallel(eq, 0); ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 1.6 * px; ctx.stroke(eq);   // the equator, gold
      if (proj === 'pole') { var rim = new Path2D(); parallel(rim, -90); ctx.strokeStyle = INK; ctx.lineWidth = 1.6 * px; ctx.stroke(rim); var rim2 = new Path2D(); parallel(rim2, -87.6); ctx.lineWidth = 0.7 * px; ctx.stroke(rim2); } });
      ctx.setTransform(1, 0, 0, 1, 0, 0); });
    return st;
  }
  function baseV(proj) {   // the base picture: the whole plane at the home look's scale (so the first look and every pan at it are pixel for pixel)
    var was = S.proj; S.proj = proj; var k = proj === 'pole' ? kMin() : Math.max(kMin(), S.ch / 180 * 0.98); S.proj = was;
    k = Math.min(k, 4096 / (360 * S.dpr)); return { k: k, cX: 0, cY: 0, w: 360 * k, h: (proj === 'pole' ? 360 : 180) * k, dpr: S.dpr };
  }
  function curV() { return { k: S.k, cX: S.cX, cY: S.cY, w: S.cw, h: S.ch, dpr: S.dpr }; }
  function sameV(a, b) { return !!(a && b && a.k === b.k && a.cX === b.cX && a.cY === b.cY && a.w === b.w && a.h === b.h && a.dpr === b.dpr); }
  function startRender(kind, proj, V) {   // on a canvas the processor draws (willReadFrequently): its cost is the page's own time, cut into steps like the build
    var front = kind === 'base' ? (S.base[proj] && S.base[proj].c) : (S.detail && S.detail.c), c = backCanvas(kind === 'base' ? 'base-' + proj : 'detail', front, Math.max(1, Math.round(V.w * V.dpr)), Math.max(1, Math.round(V.h * V.dpr)));
    var J = { kind: kind, proj: proj, V: V, c: c, i: 0, t0: performance.now(), steps: null }; J.steps = layerSteps(S.built[proj], proj, V, c.getContext('2d', { willReadFrequently: true }), kind === 'detail');
    S.rjob = J; requestAnimationFrame(function () { rpump(J); });
  }
  function rpump(J) {
    if (S.rjob !== J) return; var t = performance.now(), was = S.proj; S.proj = J.proj;
    try { do { J.steps[J.i++](); } while (J.i < J.steps.length && performance.now() - t < BUDGET); } catch (e) { J.bad = true; S.error = String(e && e.message || e); J.i = J.steps.length; } finally { S.proj = was; }
    if (J.kind === 'base') S.progress = 0.9 + 0.1 * J.i / J.steps.length;
    if (J.i < J.steps.length) { if (J.kind === 'base') want(); requestAnimationFrame(function () { rpump(J); }); return; }
    S.rjob = null; if (!J.bad) { if (J.kind === 'base') S.base[J.proj] = { c: J.c, V: J.V }; else S.detail = { c: J.c, V: J.V, proj: J.proj }; }
    S.renders.push({ kind: J.kind, proj: J.proj, ms: Math.round(performance.now() - J.t0) }); if (S.renders.length > 40) S.renders.shift(); want();
  }
  function blit(g, pic) {   // a still picture drawn for view pic.V, slid and scaled into the view she has now
    var V = pic.V, sc = S.k / V.k, y = S.ch / 2 + (V.cY - V.h / 2 / V.k - S.cY) * S.k, w = V.w * sc, h = V.h * sc;
    for (var n = S.proj === 'pole' ? 0 : -1; n <= (S.proj === 'pole' ? 0 : 1); n++) { var x = S.cw / 2 + (V.cX + n * 360 - V.w / 2 / V.k - S.cX) * S.k;
      if (x > S.cw || x + w < 0 || y > S.ch || y + h < 0) continue; g.drawImage(pic.c, x * S.dpr, y * S.dpr, w * S.dpr, h * S.dpr); }
  }
  function wantDetail() {   // a sharp picture of exactly this view, once her thumb has rested 140 ms
    clearTimeout(S.dt); S.dt = setTimeout(function () { S.dt = 0; if (S.view !== 'world' || !S.built[S.proj]) return; if (S.rjob && S.rjob.kind === 'base') { wantDetail(); return; }
      startRender('detail', S.proj, curV()); }, 140);
  }
  function drawWaiting(g) {   // the soft state while the world is drawn: a paper card, the words, a filling bar
    var w = S.cw, h = S.ch, bw = Math.min(220, w - 60), x = (w - bw) / 2, y = h / 2 + 14;
    g.font = 'italic 700 15px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    text(g, S.failed ? 'The world map could not load.' : 'Drawing the world…', w / 2, h / 2 - 10, 1);
    if (S.failed) return;
    g.fillStyle = 'rgba(58,29,12,.14)'; g.fillRect(x, y, bw, 7); g.fillStyle = '#c0821e'; g.fillRect(x, y, Math.max(4, bw * (S.progress || 0)), 7); g.strokeStyle = 'rgba(58,29,12,.5)'; g.lineWidth = 1; g.strokeRect(x - 0.5, y - 0.5, bw + 1, 8);
    S.waits++;
  }

  /* ---------- drawing ---------- */
  function need(rank) { return kMin() * (rank <= 1 ? 0.5 : Math.pow(1.5, rank)); }   // the zoom at which a rank shows: rank 0-1 always (full at the widest look), then half again each rank
  function fade(rank) { return fadeAt(rank, S.k); }
  function fadeAt(rank, k) { var n = need(rank); return Math.max(0, Math.min(1, (k - n) / (n * 0.35))); }
  function setPlane(g, off) { var s = S.k * S.dpr; g.setTransform(s, 0, 0, s, S.dpr * (S.cw / 2 + (off - S.cX) * S.k), S.dpr * (S.ch / 2 - S.cY * S.k)); }
  function copies() { if (S.proj === 'pole') return [0]; var out = [], half = S.cw / 2 / S.k; for (var n = -2; n <= 2; n++) { var o = n * 360; if (o - 180 < S.cX + half && o + 180 > S.cX - half) out.push(o); } return out; }
  function text(g, s, x, y, a, col) { g.globalAlpha = a; g.lineWidth = 3; g.strokeStyle = 'rgba(243,227,184,.9)'; g.strokeText(s, x, y); g.fillStyle = col || INK; g.fillText(s, x, y); g.globalAlpha = 1; }
  function parallel(path, lat) { var o = { x: 0, y: 0 }; for (var lon = -180; lon <= 180; lon += 2) { P(lat, lon, o); if (lon === -180) path.moveTo(o.x, o.y); else path.lineTo(o.x, o.y); } }
  function meridian(path, lon, lat0, lat1) { var o = { x: 0, y: 0 }; for (var lat = lat0; lat <= lat1 + 1e-9; lat += 2) { P(lat, lon, o); if (lat === lat0) path.moveTo(o.x, o.y); else path.lineTo(o.x, o.y); } }
  function antipodal(a, b) { var f1 = a.lat * D2R, f2 = b.lat * D2R, dl = (b.lon - a.lon) * D2R, d = Math.sin(f1) * Math.sin(f2) + Math.cos(f1) * Math.cos(f2) * Math.cos(dl); return d < -1 + 5e-9; }   // within about 0.6 km of the far side
  function gcPoints(a, b) {   // the great circle home -> place, 96 points (slerp on unit vectors), longitudes unwrapped so the line never jumps the map
    var v = function (p) { var f = p.lat * D2R, l = p.lon * D2R; return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)]; }, A = v(a), Bv = v(b), dot = Math.max(-1, Math.min(1, A[0] * Bv[0] + A[1] * Bv[1] + A[2] * Bv[2])), om = Math.acos(dot), out = [], prev = null;
    if (antipodal(a, b)) { var M = [-A[2] * A[0], -A[2] * A[1], 1 - A[2] * A[2]], mn = Math.hypot(M[0], M[1], M[2]); if (mn < 1e-9) { M = [1, 0, 0]; mn = 1; }   // every great circle reaches the far side: this one leaves home due north
      Bv = [M[0] / mn, M[1] / mn, M[2] / mn]; om = Math.PI / 2; }
    for (var i = 0; i <= 96; i++) { var t = i / 96, s0 = om < 1e-9 ? 1 - t : Math.sin((1 - t) * om) / Math.sin(om), s1 = om < 1e-9 ? t : Math.sin(t * om) / Math.sin(om);
      if (antipodal(a, b)) { s0 = Math.cos(t * Math.PI); s1 = Math.sin(t * Math.PI); }
      var x = A[0] * s0 + Bv[0] * s1, y = A[1] * s0 + Bv[1] * s1, z = A[2] * s0 + Bv[2] * s1;
      var lat = Math.atan2(z, Math.hypot(x, y)) / D2R, lon = Math.atan2(y, x) / D2R; if (prev != null) { while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360; } prev = lon; out.push([lat, lon]); }
    return out;
  }
  function draw() {
    S.want = false; var cv = $('wmap712cv'); if (!cv || S.view !== 'world') return; var box = { width: cv.clientWidth, height: cv.clientHeight }; if (box.width < 20) return;   // layout size: a window's opening animation (a scale) never shrinks the drawing
    var t0 = performance.now(), dpr = Math.min(2, window.devicePixelRatio || 1);
    S.cw = box.width; S.ch = box.height; S.dpr = dpr; var PW = Math.round(S.cw * dpr), PH = Math.round(S.ch * dpr); if (cv.width !== PW || cv.height !== PH) { cv.width = PW; cv.height = PH; }
    var g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = PAPER; g.fillRect(0, 0, PW, PH);   // cleared in backing pixels, under no transform (trap 51)
    if (!ensure(S.proj)) { g.setTransform(dpr, 0, 0, dpr, 0, 0); drawWaiting(g); return; }
    if (S.needHome) { S.needHome = false; homeView(); }   // the first look, once the canvas has its size
    clampView(); var B = S.built[S.proj], px = 1 / S.k, offs = copies(), bs = S.base[S.proj], V = curV();
    if (!CACHE) layerSteps(B, S.proj, V, g, false).forEach(function (f) { f(); });
    else {
      var bv = baseV(S.proj);
      if (!bs || bs.V.k !== bv.k || bs.V.dpr !== bv.dpr) { if (!S.rjob) startRender('base', S.proj, bv); if (!bs) { g.setTransform(dpr, 0, 0, dpr, 0, 0); drawWaiting(g); return; } }   // the base is the last part of the opening
      g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; blit(g, bs);
      var dt = S.detail && S.detail.proj === S.proj ? S.detail : null; if (dt) blit(g, dt);
      if (!(bs.V.k === S.k && bs.V.w > 0) && !(dt && sameV(dt.V, V))) wantDetail();
      else if (S.rjob && S.rjob.kind === 'detail' && !sameV(S.rjob.V, V)) S.rjob = null;
    }
    if (S.sel && S.home) { var pts = gcPoints(S.home, S.sel);   // her flight: the great circle home -> the place, live over the pictures
      for (var c = 0; c < offs.length; c++) { setPlane(g, offs[c]); var arc = new Path2D(), o = { x: 0, y: 0 };
        for (var i = 0; i < pts.length; i++) { P(pts[i][0], pts[i][1], o); if (i) arc.lineTo(o.x, o.y); else arc.moveTo(o.x, o.y); }
        g.setLineDash([6 * px, 5 * px]); g.lineWidth = 3.4 * px; g.strokeStyle = 'rgba(255,242,194,.9)'; g.stroke(arc); g.lineWidth = 2 * px; g.strokeStyle = '#c0821e'; g.stroke(arc); g.setLineDash([]); } }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.textBaseline = 'middle';
    if (S.proj === 'pole') {   // Gleason's rim: the meridians named round the edge
      g.font = '700 9px Georgia, serif'; g.textAlign = 'center';
      for (var m = -180; m < 180; m += 30) { var q = toScreen(-95.5, m); if (q.x < 6 || q.y < 6 || q.x > S.cw - 6 || q.y > S.ch - 6) continue; text(g, m === 0 ? '0°' : m === -180 ? '180°' : Math.abs(m) + '°' + (m > 0 ? 'E' : 'W'), q.x, q.y, 0.9); }
    }
    var boxes = [], fits = function (x, y, w, h) { for (var b = 0; b < boxes.length; b++) { var q = boxes[b]; if (x < q[0] + q[2] && x + w > q[0] && y < q[1] + q[3] && y + h > q[1]) return false; } boxes.push([x, y, w, h]); return true; };
    var onScreen = function (x, y, m) { return x > -m && y > -m && x < S.cw + m && y < S.ch + m; };
    var scr = function (arr, i) { return { x: S.cw / 2 + (nearX(arr[i * 2]) - S.cX) * S.k, y: S.ch / 2 + (arr[i * 2 + 1] - S.cY) * S.k }; };
    var marks = [], H = S.home;
    if (H) marks.push({ kind: 'home', name: 'Home', lat: H.lat, lon: H.lon });
    var PL = (window.WFR_WORLD && WFR_WORLD.PLACES) || {}; Object.keys(PL).forEach(function (id) { var p = PL[id]; marks.push({ kind: 'known', id: id, name: p.name, lat: p.lat, lon: p.lon }); });
    var np = S.proj === 'pole' ? toScreen(90, 0) : null; if (np) fits(np.x - 7, np.y - 7, 14, 14);
    marks.forEach(function (mk) { var q = toScreen(mk.lat, mk.lon); mk.x = q.x; mk.y = q.y; mk.shown = fits(q.x - 7, q.y - 7, 14, 14); });   // every marker before any name; home first: a place too near it waits for a closer look
    g.font = '700 11px Georgia, serif'; marks.forEach(function (mk) { mk.lab = mk.shown && fits(mk.x + 9, mk.y - 7, g.measureText(mk.name).width + 4, 14); });
    var npLab = np && fits(np.x + 8, np.y + 3, 56, 12);
    if (S.sel) { var sq = toScreen(S.sel.lat, S.sel.lon); fits(sq.x - 9, sq.y - 9, 18, 18); }
    var dots = [];
    g.textAlign = 'left';
    for (var ci = 0; ci < D.cities.length; ci++) { var C = D.cities[ci], ca = fade(C.rank); if (ca <= 0.05) continue; var cp = scr(B.city, ci); if (!onScreen(cp.x, cp.y, 4)) continue;
      if (!fits(cp.x - 3, cp.y - 3, 6, 6)) continue; dots.push([cp.x, cp.y, ca, C.cap]); C.sx = cp.x; C.sy = cp.y; C.shown = ca; C.drawnAt = S.draws;
      g.font = (C.cap ? '700 ' : '600 ') + (C.rank <= 1 ? 11 : 10) + 'px Georgia, serif'; var cw = g.measureText(C.name).width; if (fits(cp.x + 5, cp.y - 6, cw + 2, 12)) text(g, C.name, cp.x + 5, cp.y, ca); }
    g.font = 'italic 600 12px Georgia, serif'; g.textAlign = 'center';
    for (var oc = 0; oc < OCEANS.length; oc++) { var oa = OCEANS[oc][3] === 2 ? fade(3) : OCEANS[oc][3] === 1 ? fade(2) : 1; if (oa <= 0) continue; var op = scr(B.ocean, oc); if (!onScreen(op.x, op.y, 40)) continue; var ow = g.measureText(OCEANS[oc][0]).width; if (fits(op.x - ow / 2, op.y - 7, ow, 14)) text(g, OCEANS[oc][0], op.x, op.y, oa * 0.8, '#2f5f86'); }
    g.font = 'italic 600 10.5px Georgia, serif';
    for (var r = 0; r < D.regions.length; r++) { var R = D.regions[r], ra = fade(R.rank); if (ra <= 0.05) continue; var rp = scr(B.region, r); if (!onScreen(rp.x, rp.y, 30)) continue; var rw = g.measureText(R.name).width; if (fits(rp.x - rw / 2, rp.y - 6, rw, 12)) text(g, R.name, rp.x, rp.y, ra * 0.75, '#6e4c2a'); }
    for (var dd = 0; dd < dots.length; dd++) { var d = dots[dd]; g.globalAlpha = d[2]; g.beginPath(); g.arc(d[0], d[1], d[3] ? 3.2 : 2.6, 0, 6.2832); g.fillStyle = '#fff8e8'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = INK; g.stroke(); if (d[3]) { g.beginPath(); g.arc(d[0], d[1], 1, 0, 6.2832); g.fillStyle = INK; g.fill(); } }   // the dots last, over every name
    g.globalAlpha = 1;
    if (np) { g.save(); g.translate(np.x, np.y); g.fillStyle = '#1f8a8a'; g.strokeStyle = '#fff2c2'; g.lineWidth = 1.2; g.beginPath();   // the North Pole: a teal star at the centre, over every name
      for (var s = 0; s < 8; s++) { var rr = s % 2 ? 2 : 6.5, an = s * Math.PI / 4; g.lineTo(Math.sin(an) * rr, -Math.cos(an) * rr); } g.closePath(); g.stroke(); g.fill(); g.restore();
      if (npLab) { g.font = 'italic 700 10px Georgia, serif'; g.textAlign = 'left'; text(g, 'North Pole', np.x + 8, np.y + 9, 0.85); } }
    g.textAlign = 'left'; marks.slice().reverse().forEach(function (mk) { if (!mk.shown || !onScreen(mk.x, mk.y, 10)) return; g.font = '700 11px Georgia, serif';   // home drawn last, on top
      if (mk.lab) text(g, mk.name, mk.x + 9, mk.y, 1, mk.kind === 'home' ? '#8c1d33' : INK);
      g.save(); g.translate(mk.x, mk.y);
      if (mk.kind === 'home') { g.rotate(Math.PI / 4); g.fillStyle = '#c8314a'; g.strokeStyle = '#fff2c2'; g.lineWidth = 1.6; g.fillRect(-5, -5, 10, 10); g.strokeRect(-5, -5, 10, 10); }   // home: the chart's ruby diamond
      else { g.beginPath(); for (var s2 = 0; s2 < 10; s2++) { var r2 = s2 % 2 ? 2.6 : 6, a2 = s2 * Math.PI / 5; g.lineTo(Math.sin(a2) * r2, -Math.cos(a2) * r2); } g.closePath(); g.fillStyle = '#f2b134'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = INK; g.stroke(); }   // a place she knows: a gold star
      g.restore(); });
    if (S.sel) { var ss = toScreen(S.sel.lat, S.sel.lon); g.beginPath(); g.arc(ss.x, ss.y, 9, 0, 6.2832); g.lineWidth = 2; g.strokeStyle = '#c0821e'; g.stroke(); g.beginPath(); g.arc(ss.x, ss.y, 11, 0, 6.2832); g.lineWidth = 1; g.strokeStyle = 'rgba(255,242,194,.9)'; g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(0.6, 0.6, S.cw - 1.2, S.ch - 1.2);
    S.marks = marks; S.draws++; S.ms = Math.round((performance.now() - t0) * 10) / 10;
  }
  function want() { if (S.want) return; S.want = true; requestAnimationFrame(draw); }

  /* ---------- picking: what is under her thumb is what is drawn there (trap 66), hit-tested against the drawn marks, nearest first ---------- */
  function pick(sx, sy) {
    var best = null, bd = 1e9, R = 22;
    (S.marks || []).forEach(function (mk) { if (!mk.shown) return; var d = Math.hypot(mk.x - sx, mk.y - sy) - 4; if (d < R && d < bd) { bd = d; best = { name: mk.kind === 'home' ? (S.home.name || 'Home') : mk.name, country: '', lat: mk.lat, lon: mk.lon, kind: mk.kind }; } });
    if (D) for (var i = 0; i < D.cities.length; i++) { var C = D.cities[i]; if (C.drawnAt !== S.draws - 1 || !(C.shown > 0.3)) continue; var d = Math.hypot(C.sx - sx, C.sy - sy); if (d < R && d < bd) { bd = d; best = { name: C.name, country: C.country, lat: C.lat, lon: C.lon, kind: 'city' }; } }
    if (best) return best;
    var ll = fromScreen(sx, sy); if (!ll) return null; return { name: null, lat: ll.lat, lon: ll.lon, kind: 'point' };
  }
  function deg(v, p, n) { return Math.abs(v).toFixed(1) + '° ' + (v >= 0 ? p : n); }
  var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function select(p) {
    S.sel = p; var el = $('wmap712sel'); if (!el) return;
    if (!p) { el.textContent = 'Tap a place: how far it is from home'; return; }
    var H = S.home, anti = antipodal(H, p), km = WFR_WORLD.distance(H, p) / 1000, br = anti ? 0 : WFR_WORLD.bearing(H, p), where = p.name ? '<b>' + esc(p.name) + '</b>' + (p.country ? ', ' + esc(p.country) : '') : deg(p.lat, 'N', 'S') + ', ' + deg(p.lon, 'E', 'W');
    p.km = km; p.bearing = br; p.word = COMPASS[Math.round(br / 22.5) % 16]; p.anti = anti;
    el.innerHTML = where + (p.kind === 'home' ? ' · this is home' : ' · <b>' + Math.round(km).toLocaleString('en-US') + ' km</b> from home, flying ' + p.word + (anti ? ' (the far side of the world: this great circle leaves due north)' : ' (a great circle)'));
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- her thumb: one finger pans, two pinch, a tap picks, a double tap zooms; a mouse wheel zooms ---------- */
  function zoomAt(sx, sy, f) { var X = S.cX + (sx - S.cw / 2) / S.k, Y = S.cY + (sy - S.ch / 2) / S.k; S.k = Math.max(kMin(), Math.min(K_MAX, S.k * f)); S.cX = X - (sx - S.cw / 2) / S.k; S.cY = Y - (sy - S.ch / 2) / S.k; clampView(); want(); }
  function wireGestures(cv) {
    var ptr = new Map(), G = null, lastTap = null;
    var rel = function (e) { var b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    var startPinch = function () { var a = Array.from(ptr.values()), m = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; G = { mode: 'pinch', d0: Math.max(10, Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)), k0: S.k, X: S.cX + (m.x - S.cw / 2) / S.k, Y: S.cY + (m.y - S.ch / 2) / S.k }; S.gestures++; };
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} var q = rel(e); ptr.set(e.pointerId, q);
      if (ptr.size === 1) G = { mode: 'tap', x0: q.x, y0: q.y, t0: performance.now(), cX: S.cX, cY: S.cY }; else if (ptr.size === 2) startPinch(); });
    cv.addEventListener('pointermove', function (e) { if (!ptr.has(e.pointerId) || !G) return; e.preventDefault(); var q = rel(e); ptr.set(e.pointerId, q);
      if (G.mode === 'tap' && Math.hypot(q.x - G.x0, q.y - G.y0) > 8) { G.mode = 'pan'; S.gestures++; }
      if (G.mode === 'pan') { S.cX = G.cX - (q.x - G.x0) / S.k; S.cY = G.cY - (q.y - G.y0) / S.k; clampView(); want(); }
      else if (G.mode === 'pinch' && ptr.size >= 2) { var a = Array.from(ptr.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), m = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
        S.k = Math.max(kMin(), Math.min(K_MAX, G.k0 * d / G.d0)); S.cX = G.X - (m.x - S.cw / 2) / S.k; S.cY = G.Y - (m.y - S.ch / 2) / S.k; clampView(); want(); } });
    var up = function (e, cancel) { if (!ptr.has(e.pointerId)) return; var q = rel(e); ptr.delete(e.pointerId);
      if (!cancel && G && G.mode === 'tap' && ptr.size === 0 && performance.now() - G.t0 < 700) { e.preventDefault(); var now = performance.now();
        if (lastTap && now - lastTap.t < 320 && Math.hypot(q.x - lastTap.x, q.y - lastTap.y) < 24) { lastTap = null; zoomAt(q.x, q.y, 2); } else { lastTap = { t: now, x: q.x, y: q.y }; select(pick(q.x, q.y)); want(); } }
      if (ptr.size === 1 && G && G.mode === 'pinch') { var r = Array.from(ptr.values())[0]; G = { mode: 'pan', x0: r.x, y0: r.y, cX: S.cX, cY: S.cY }; } else if (ptr.size === 0) G = null; };
    cv.addEventListener('pointerup', function (e) { up(e, false); }); cv.addEventListener('pointercancel', function (e) { up(e, true); });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); var q = rel(e); zoomAt(q.x, q.y, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  }
  function tapButton(b, fn) {   // a thumb's tap is its own down and up (705's rule: 615 cancels a second tap's click near any lift); a keyboard's Enter is the click
    var dn = null; b.addEventListener('pointerdown', function (e) { dn = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; });
    b.addEventListener('pointerup', function (e) { var d = dn; dn = null; if (!(d && d.id === e.pointerId && performance.now() - d.t < 800 && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 18)) return; e.preventDefault(); fn(); });
    b.addEventListener('pointercancel', function () { dn = null; }); b.addEventListener('click', function (e) { if (e.detail === 0) fn(); });
  }

  /* ---------- the window: a World tab on the chart, the world view beside the island chart ---------- */
  var CSS = '#wmap712Btn{position:absolute;left:6px;top:6px;height:40px;padding:0 12px;border:0;border-radius:20px;background:#efe4cf;color:var(--ink);font:800 13.5px/40px var(--body);touch-action:manipulation;-webkit-tap-highlight-color:transparent;z-index:2}' +
    '#wmap712Btn:focus-visible,#wmap712 button:focus-visible{outline:3px solid var(--rouge);outline-offset:2px}#wmap712{position:relative;display:none}#map705.wm712 #wmap712{display:block}#map705.wm712 #map705cv,#map705.wm712 .m705foot{display:none}' +
    '#wmap712cv{display:block;position:static;inset:auto;border-radius:6px;box-shadow:0 0 0 2px rgba(60,40,20,.35);touch-action:none;cursor:grab}' +
    '#wmap712 .wmProj{position:absolute;left:6px;bottom:6px;display:flex;border-radius:19px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.25)}#wmap712 .wmProj button{height:38px;padding:0 10px;white-space:nowrap;border:0;background:rgba(246,236,214,.94);color:var(--ink);font:700 12px/38px var(--body);touch-action:manipulation}' +
    '#wmap712 .wmProj button[aria-pressed="true"]{background:#c8314a;color:#fff6e2}#wmap712 .wmZoom{position:absolute;right:6px;bottom:6px;display:grid;gap:6px}#wmap712 .wmZoom button{width:40px;height:40px;padding:0;border:0;border-radius:50%;background:rgba(246,236,214,.94);color:var(--ink);font:800 19px/40px var(--body);box-shadow:0 2px 8px rgba(0,0,0,.25);touch-action:manipulation}' +
    '#wmap712foot{display:none;margin:2px 0 0;max-width:100%;font:600 13px/1.3 var(--body);text-align:center}#map705.wm712 #wmap712foot{display:grid;gap:1px}#wmap712foot .wmNote{font-size:11.5px;opacity:.8}#wmap712sel{min-height:3.9em}#wmap712foot .wmCredit{font-size:11px;opacity:.72}' +
    '@media (orientation:landscape) and (max-height:520px){#map705.wm712 .m705win{grid-template-columns:auto minmax(150px,210px);column-gap:12px;align-items:center}#map705.wm712 .m705win h3{grid-column:1/-1}#map705.wm712 #wmap712{grid-column:1;grid-row:2}#map705.wm712 #wmap712foot{grid-column:2;grid-row:2;text-align:left;align-self:center}}';
  function sizeCanvas() {   // as big as the island chart (map705Size's side), and wider on a phone on its side
    var isl = $('map705cv'), side = isl && parseFloat(isl.style.width) || Math.max(180, Math.min(innerWidth - 44, innerHeight - 150, 460)), land = innerWidth > innerHeight && innerHeight <= 520;
    var cv = $('wmap712cv'), w = land ? Math.round(Math.max(200, Math.min(innerWidth - 60 - 222, side * 1.6))) : side, h = side;   // on its side the card sits beside the map (the landscape grid in CSS)
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
  }
  function note() { var n = $('wmap712note'); if (n) n.textContent = S.proj === 'pole' ? 'Gleason\'s layout: the true globe seen from above the North Pole; every distance from the pole is true, and the rim is the South Pole.' : 'Globe-true: every place at its real latitude and longitude.'; }
  function load(cb) {
    if (window.WFR_WORLDMAP712 || S.failed) return cb(); if (S.loading) return; S.loading = true; var sc = document.createElement('script'); sc.src = S.src || 'world712-map.js';
    sc.onload = function () { S.loading = false; if (!window.WFR_WORLDMAP712) S.failed = true; cb(); };
    sc.onerror = function () { S.loading = false; S.failed = true; cb(); }; document.head.appendChild(sc);
  }
  function show(v) {
    var m = S.el; if (!m) return; S.view = v; m.classList.toggle('wm712', v === 'world'); var b = $('wmap712Btn'), h3 = m.querySelector('h3');
    if (v === 'world') { b.textContent = '🏝 Island'; b.setAttribute('aria-label', 'Back to the island chart'); if (h3) h3.textContent = 'The world'; m.setAttribute('aria-label', 'Map of the whole world');
      S.home = window.WFR_WORLD ? WFR_WORLD.HOME : null; sizeCanvas(); want(); load(want); }
    else { b.textContent = '🌍 World'; b.setAttribute('aria-label', 'Show the whole world'); if (h3) h3.textContent = 'The island'; m.setAttribute('aria-label', 'Map of the island');
      if (S.redraw) S.redraw(); }   // back to the island chart, drawn by 705's own map705Size and map705Draw (the hook hands them over: they are not globals)
  }
  function setProj(p) { if (p !== 'globe' && p !== 'pole') return; S.proj = p; S.toggles++; document.querySelectorAll('#wmap712 .wmProj button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.proj === p)); }); note(); S.needHome = true; want(); }
  function attach(m, src, redraw) {
    if (S.el) return; S.el = m; S.src = src || 'world712-map.js'; S.redraw = typeof redraw === 'function' ? redraw : null;
    var st = document.createElement('style'); st.id = 'wmap712css'; st.textContent = CSS; document.head.appendChild(st);
    var win = m.querySelector('.m705win'), b = document.createElement('button'); b.type = 'button'; b.id = 'wmap712Btn'; b.textContent = '🌍 World'; b.setAttribute('aria-label', 'Show the whole world'); win.appendChild(b);
    var wrap = document.createElement('div'); wrap.id = 'wmap712';
    wrap.innerHTML = '<canvas id="wmap712cv" width="8" height="8" aria-label="The whole world: drag to move, pinch to zoom, tap a place"></canvas>' +
      '<div class="wmProj" role="group" aria-label="Projection"><button type="button" data-proj="globe" aria-pressed="true">Globe-true</button><button type="button" data-proj="pole" aria-pressed="false">North-pole (Gleason style)</button></div>' +
      '<div class="wmZoom"><button type="button" id="wmap712in" aria-label="Zoom in">+</button><button type="button" id="wmap712out" aria-label="Zoom out">−</button><button type="button" id="wmap712home" aria-label="Back to home">⌂</button></div>';
    var foot = document.createElement('p'); foot.id = 'wmap712foot';
    foot.innerHTML = '<span id="wmap712sel">Tap a place: how far it is from home</span><span class="wmNote" id="wmap712note"></span><span class="wmCredit" id="wmap712credit"></span>'; foot.querySelector('#wmap712credit').textContent = credit();
    var isl = $('map705cv'); win.insertBefore(wrap, isl.nextSibling); win.insertBefore(foot, win.querySelector('.m705foot').nextSibling); note();
    tapButton(b, function () { show(S.view === 'world' ? 'island' : 'world'); });
    wrap.querySelectorAll('.wmProj button').forEach(function (pb) { tapButton(pb, function () { setProj(pb.dataset.proj); }); });
    tapButton($('wmap712in'), function () { zoomAt(S.cw / 2, S.ch / 2, 1.6); }); tapButton($('wmap712out'), function () { zoomAt(S.cw / 2, S.ch / 2, 1 / 1.6); });
    tapButton($('wmap712home'), function () { var H = WFR_WORLD.HOME; S.k = Math.max(S.k, 24); P(H.lat, H.lon, tmp); S.cX = tmp.x; S.cY = tmp.y; clampView(); want(); });
    wireGestures($('wmap712cv'));
    new MutationObserver(function () { if (m.hidden) { if (S.view !== 'island') show('island'); } else S.opens++; }).observe(m, { attributes: true, attributeFilter: ['hidden'] });   // every opening starts on the island chart
    addEventListener('resize', function () { if (S.view === 'world' && !m.hidden) { sizeCanvas(); want(); } });
  }
  return { attach: attach, show: show, setProj: setProj, credit: credit,
    choose: function (lat, lon) { select({ name: null, lat: lat, lon: lon, kind: 'point' }); want(); return S.sel; },   // the bench's door for a place no thumb can hit exactly (home's antipode)
    look: function (lat, lon, k) { S.needHome = false; P(lat, lon, tmp); S.k = k; S.cX = tmp.x; S.cY = tmp.y; clampView(); draw(); return { k: S.k, cX: S.cX, cY: S.cY }; },   // the bench's and the home button's way to aim the view
    state: function () { var cv = $('wmap712cv'), r = cv ? cv.getBoundingClientRect() : null; return { view: S.view, proj: S.proj, k: S.k, kMin: S.cw ? kMin() : null, cX: S.cX, cY: S.cY, cw: S.cw, ch: S.ch, dpr: S.dpr, loaded: S.loaded, failed: S.failed,
      draws: S.draws, ms: S.ms, opens: S.opens, toggles: S.toggles, gestures: S.gestures, sel: S.sel ? { name: S.sel.name, lat: S.sel.lat, lon: S.sel.lon, km: S.sel.km, kind: S.sel.kind, word: S.sel.word, bearing: S.sel.bearing, anti: S.sel.anti } : null, canvases: S.made, canvasBytes: S.cvs.reduce(function (a, c) { return a + c.width * c.height * 4; }, 0), overlays: Object.keys(S.built).map(function (k) { return k + ':' + S.built[k].ov.map(function (o) { return o.id; }).join('+'); }), rect: r ? { l: r.left, t: r.top, w: r.width, h: r.height } : null,
      ready: Object.keys(S.built), building: S.job ? S.job.proj : (S.rjob && S.rjob.kind === 'base' ? S.rjob.proj : null), rendering: !!(S.rjob || S.dt), base: Object.keys(S.base), renders: S.renders.slice(), progress: S.progress, waits: S.waits, jobs: S.jobs.slice(), error: S.error, counts: D ? { land: D.land.length, coast: D.coast.length, lakes: D.lakes.length, glaciers: D.glaciers.length, rivers: D.rivers.length, cities: D.cities.length, regions: D.regions.length } : null }; },
    project: toScreen, unproject: fromScreen };
})();
