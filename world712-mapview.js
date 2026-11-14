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
   Nothing here runs per game frame: it draws only while the world view is open and something changed.
   725a (Nov 4 2026), THE MAP IN GLEASON'S LOOK. Marth, verbatim: "i just think the earth is flat based on pilot flights os make it kinda like the gleasons
   with the topography from the maps"; "make sure antartica is the highest continent on avrg too". Trunks. The World tab now opens on Gleason's disc (the
   North-pole view) and names it "Gleason's New Standard Map of the World (1892)"; the old words "the true globe seen from above" are retired. The ice is
   painted by its OWN height (raster.ice, baked by bake-712e from the tiles' ice-top zoom), white at the top of the dome, with 500 m contours and its own
   light, so Antarctica reads as the high ice ring it is. A switch lays the 1892 paper itself (assets/gleason/, "No known copyright restrictions") under the
   marks, at its pixel-measured pole (1009, 1021), with the turn and scale fitted to six of its own painted islands. Guards: tests/map725.js,
   tests/continents725.js.
   76 REVIEW FIXES (Nov 4 2026, Trunks; wiring tools/wiring/wire-76-review-fixes.js). His ruling: "in this game the disc IS the world", so the second tab is
   plain "Globe" (no "true", no "real"). The 1892 paper is decoded OFF the page's thread (createImageBitmap / img.decode) behind the "Drawing the world…" card,
   laid ONCE into a canvas the size of the map's own disc, in strips, then the full decode is let go; a scan that fails turns the switch back off and the next
   tap tries again. The switch is 44 px tall in both looks. The ice mask is decoded in slices like the heights. Every new word on the map is a DRAFT for Marth
   (marked where it stands). */
window.WMAP712 = (function () {
  'use strict';
  var D2R = Math.PI / 180, PAPER = '#f1e2b8', INK = '#3a1d0c';
  var PAPER_CREDIT = 'The 1892 paper: Gleason\'s New Standard Map of the World, scanned by the Norman B. Leventhal Map & Education Center at the Boston Public Library (no known copyright restrictions).';   // 725a: LICENSES.md's line, word for word
  var NE_CREDIT = 'Natural Earth (public domain).';   // the terrain half of the credit is read from the page's own #credit712 (board 712 S0), the line LICENSES.md records
  function credit() { var t = document.getElementById('credit712'); return NE_CREDIT + (t ? ' ' + t.textContent.trim() : ''); }
  var OCEANS = [['Pacific Ocean', 0, -150, 0], ['Pacific Ocean', 18, 165, 1], ['Atlantic Ocean', 30, -42, 0], ['Atlantic Ocean', -22, -14, 1], ['Indian Ocean', -20, 78, 0], ['Arctic Ocean', 81, 150, 0], ['Southern Ocean', -60, 60, 1], ['Southern Ocean', -60, -110, 1], ['Caribbean Sea', 14.6, -73.5, 2], ['Gulf of Mexico', 25.3, -90.2, 2], ['Mediterranean Sea', 34.6, 18, 2]];   // ours: the oceans' names (Natural Earth's sea polygons were not downloaded)
  var S = { el: null, src: null, view: 'island', proj: 'pole', k: 1, cX: 0, cY: 0, cw: 0, ch: 0, dpr: 1, loaded: false, loading: false, failed: false, built: {}, sel: null,
    draws: 0, ms: 0, want: false, made: 0, cvs: [], waits: 0, jobs: [], job: null, next: null, progress: 0, error: null, base: {}, detail: null, rjob: null, dt: 0, renders: [], opens: 0, toggles: 0, needHome: true, gestures: 0,
    vec: {}, fill: 0, plainDraws: 0, noDetail: false, loadFail: false, sc: null, kicks: 0, plainPic: null, plainDirect: false };   // 813: vec, the plain map's lines per projection (drawn while the pictures are made); fill, the pictures' progress
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
  function kDisc() { return S.proj === 'pole' ? Math.min(S.cw, S.ch) / 360 * 0.86 : Math.max(S.cw / 360, S.ch / 180 * 0.62); }   // the whole disc in view: Classic's widest look, and the measure the base picture and the names keep
  function kMin() { return CLASSIC ? kDisc() : Math.max(kDisc(), Math.min(S.cw, S.ch) * 111.2 / FLOOR_KM); }   // 735b, Marth: "No no you can’t zoom out to see the whole disk": Standard's widest look
  var CLASSIC = !!(window.WFR_DOOR && WFR_DOOR.classic);   // 735: Classic is frozen (board 645): its map keeps its old look; the look switch reloads the page
  var HOME_SPAN = 10;   // 735b: the plane degrees across the first look's shorter side, tuned by eye (753a: 32 until now; with no seed that was her whole explored world as a speck under her arrow. DRAFT for Marth)
  var FLOOR_KM = 4000;   // 735b: the ground across the widest look's shorter side, about a continent (DRAFT for Marth)
  var K_MAX = CLASSIC ? 140 : 2400;   // 735: about 46 m a pixel (was 140); past k 200 the streamed water, roads and towns take over from the baked relief
  function clampView() {
    var k0 = kMin(); S.k = Math.max(k0, Math.min(K_MAX, S.k));
    if (S.proj === 'pole') { var r = Math.hypot(S.cX, S.cY); if (r > 180) { S.cX *= 180 / r; S.cY *= 180 / r; } }
    else { S.cX = ((S.cX + 180) % 360 + 360) % 360 - 180; var hh = S.ch / 2 / S.k; S.cY = 180 * S.k <= S.ch ? 0 : Math.max(-90 + hh, Math.min(90 - hh, S.cY)); }
  }
  function homeK() { return Math.max(kMin(), Math.min(S.cw, S.ch) / HOME_SPAN); }
  function homeView() {
    var H = window.WFR_WORLD && WFR_WORLD.HOME;
    if (!CLASSIC) { var Y = YOU && YOU(), c = Y && isFinite(Y.lat) && isFinite(Y.lon) ? Y : H; S.k = homeK(); if (c) { P(c.lat, c.lon, tmp); S.cX = tmp.x; S.cY = tmp.y; } clampView(); return; }   // 735b, Marth: "you should have it waaaaaaaaaaay more zoomed in": on her, the Caribbean filling the view at home (Classic keeps its wide opening)
    if (S.proj === 'pole') { S.k = kMin(); S.cX = 0; S.cY = 0; }
    else { S.k = Math.max(kMin(), S.ch / 180 * 0.98); S.cX = H ? H.lon : 0; S.cY = 0; }
    clampView();
  }

  /* ---------- the first build, IN SLICES (Su 36, Oct 28: no frozen tap on her phone). Every piece of work (decoding the file, colouring the
     relief, re-projecting it for the pole view, building the paths) is a small step; a pump runs steps for at most BUDGET ms, then hands the
     phone back (a fresh task), so no tap and no frame waits on more than one slice. Meanwhile the map shows "Drawing the world…". ---------- */
  var BUDGET = 8, BUDGET_MAX = 40;   // 813: while the map is open, a slice may take half the time the game's own frame took before it (never past 40 ms): on the PC still 8 ms, on a phone drawing its world at ~120 ms a frame, 40
  function budget(J, t) { var gap = J.end ? t - J.end : 0; J.end = 0; return shown() && gap > 2 * BUDGET ? Math.min(BUDGET_MAX, gap / 2) : BUDGET; }
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
  /* 725a: the ice by its own height (the topographic look: colour by height, the light on the slopes, contours), pale blue-grey at the coast to white on
     the dome. The ice sheets slope gently (a few metres a kilometre), so their light is stronger, and a faint line marks every 500 m. */
  var ICE = [[0, 178, 198, 218], [1000, 204, 219, 234], [2000, 224, 233, 243], [3000, 240, 245, 250], [4000, 255, 255, 255]], SHADE_ICE = 40, ICE_CONTOUR = 500;
  function ramp(R, e) { if (e <= R[0][0]) return R[0]; for (var k = 1; k < R.length; k++) if (e <= R[k][0]) { var a = R[k - 1], b = R[k], t = (e - a[0]) / (b[0] - a[0]); return [0, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; } return R[R.length - 1]; }
  function mk() { S.made++; var c = document.createElement('canvas'); S.cvs.push(c); return c; }   // every canvas the map makes is counted (the bench holds the count bounded)
  var POOL = {};
  function backCanvas(key, front, w, h) { var two = POOL[key] || (POOL[key] = [mk(), mk()]), c = two[0] === front ? two[1] : two[0]; if (c.width !== w) c.width = w; if (c.height !== h) c.height = h; return c; }   // the one not on show; its size set only when it changes
  function toCanvas(px, w, h) { var c = mk(); c.width = w; c.height = h; var g = c.getContext('2d', { willReadFrequently: true }), im = g.createImageData(w, h); im.data.set(px); g.putImageData(im, 0, 0); for (var i = (w * h) >> 1, n = 0; n < w * h; n++, i = (i + 1) % (w * h)) if (px[i * 4 + 3] > 127) { c.__p = [i % w, (i / w) | 0]; break; }
    return c; }   // 735: __p, a pixel the witness can ask for
  /* 813 (the #142 gate, Nov 14: worldmap712 W9, one 100-180 ms task at the first full look; the same 115-140 ms task measured on #141's own file when the
     opening is slower than W9's): the relief pictures lived on the graphics card while the base picture is drawn on the processor, so the first base after
     they had settled there read each of them back from the card in one go. They are made on the processor now (willReadFrequently), like the base, and every
     render step is finished inside its own slice (rpump), the whole-world lines cut into pieces (chunks in layerSteps): measured, no step over 25 ms. */
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
    /* 813 (Marth, Nov 14: "the map is STILL buggy on boot"): THE LINES FIRST. The coast, the land, the lakes, the rivers and every name are decoded and laid first
       (st.vec marks the step): from there the map is drawn plain and she can use it, while the relief's pictures are made behind it; the pictures were made
       first until now, so the whole 278-step build stood behind the "Drawing the world…" card. */
    var st = [], W = window.WFR_WORLDMAP712, q = W.q, w = W.raster.w, h = W.raster.h, bin = null, ib = null, B = null, ROWS = 32, ICE = !!W.raster.ice, needRas = !D || !D.ras;
    if (!D) {
      st.push(function () { D = { land: [], coast: [], lakes: [], glaciers: [], rivers: [], countries: W.countries, cities: [], regions: [], ras: null }; });
      ['land', 'coast', 'lakes', 'glaciers', 'rivers'].forEach(function (key) { var arr = W[key];
        for (var a = 0; a < arr.length; a += 200) (function (a) { st.push(function () { for (var i = a; i < Math.min(arr.length, a + 200); i++) D[key].push(key === 'rivers' ? { p: dec(arr[i][0], q), rank: arr[i][1] } : dec(arr[i], q)); }); })(a); });
      st.push(function () { D.cities = W.cities.map(function (c) { return { name: c[0], country: W.countries[c[1]] || '', lat: c[2] / q, lon: c[3] / q, rank: c[4], pop: c[5], cap: !!c[6] }; });
        D.regions = W.regions.map(function (r) { return { name: r[0], kind: r[1], lat: r[2] / q, lon: r[3] / q, rank: r[4] }; }); });
    }
    st.push(function () { B = { img: null, ov: [], R: null, path: null, city: [], region: [], ocean: [] }; });
    st.push(function () { B.R = { land: [], coast: [], lakes: [], glaciers: [], icebig: [], riv0: [], riv1: [], riv2: [] }; B.path = { land: new Path2D(), coast: new Path2D(), lakes: new Path2D(), glaciers: new Path2D(), icebig: new Path2D(), riv0: new Path2D(), riv1: new Path2D(), riv2: new Path2D() }; });
    ['land', 'coast', 'lakes', 'glaciers', 'rivers'].forEach(function (key) { var n = (W[key] || []).length;
      for (var a = 0; a < n; a += 250) (function (a) { st.push(function () { var arr = D[key];
        for (var i = a; i < Math.min(arr.length, a + 250); i++) { var to = key === 'rivers' ? 'riv' + (arr[i].rank <= 3 ? 0 : arr[i].rank <= 5 ? 1 : 2) : key, r = ringPlane(key === 'rivers' ? arr[i].p : arr[i]); if (!r) continue; if (to === 'glaciers' && ICE && Math.max(r.b[2] - r.b[0], r.b[3] - r.b[1]) > 6) to = 'icebig'; B.R[to].push(r); addPts(B.path[to], r.p); } }); })(a); });
    st.push(function () { var o = { x: 0, y: 0 };
      D.cities.forEach(function (c) { P(c.lat, c.lon, o); B.city.push(o.x, o.y); }); D.regions.forEach(function (c) { P(c.lat, c.lon, o); B.region.push(o.x, o.y); });
      OCEANS.forEach(function (c) { P(c[1], c[2], o); B.ocean.push(o.x, o.y); }); S.vec[proj] = B; });   // 813: the plain map is ready: lines, names, marks; the pictures follow
    st.vec = st.length;
    if (needRas) {
      st.push(function () { bin = atob(W.raster.b64); D.ras = { w: w, h: h, e: new Float32Array(w * h) }; });
      for (var r0 = 0; r0 < h; r0 += ROWS * 2) (function (r0) { st.push(function () { var e = D.ras.e; for (var k = r0 * w; k < Math.min(h, r0 + ROWS * 2) * w; k++) { var b = bin.charCodeAt(k); e[k] = b < 128 ? -11000 * Math.pow((127 - b) / 127, 2) : 9000 * Math.pow((b - 128) / 127, 2); } }); })(r0);
      st.push(function () { bin = null; ib = W.raster.ice ? atob(W.raster.ice) : null; if (ib) D.ras.ice = new Uint8Array(w * h); });   // 725a: the ice mask, one bit a cell (76 review: unpacked in slices of rows, as the heights are)
      for (var i0 = 0; i0 < h; i0 += ROWS * 2) (function (i0) { st.push(function () { if (!ib) return; var m = D.ras.ice; for (var k = i0 * w; k < Math.min(h, i0 + ROWS * 2) * w; k++) m[k] = (ib.charCodeAt(k >> 3) >> (k & 7)) & 1; }); })(i0);
      st.push(function () { ib = null; S.loaded = true; });
    }
    if (!RIMG) {
      st.push(function () { RIMG = { w: w, h: h, sea: new Uint8ClampedArray(w * h * 4), land: new Uint8ClampedArray(w * h * 4), done: false }; });
      for (var j0 = 0; j0 < h; j0 += ROWS / 2) (function (j0) { st.push(function () { colourRows(j0, Math.min(h, j0 + ROWS / 2)); }); })(j0);   // 16 rows a step: the heaviest step of the build (10-20 ms at 32 rows on a busy machine)
      st.push(function () { RIMG.done = true; });
    }
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
    st.push(function () {   // 813: the overlays' sources decoded inside a step (it was the opening's first long task), their steps added to this same list
      if (!OVS) OVS = overlaySources(); var more = [];
      OVS.forEach(function (o) { if (o.coloured) return; for (var r0 = 0; r0 < o.h; r0 += 24) (function (r0) { more.push(function () { shadeInto(o.e, o.w, o.h, r0, Math.min(o.h, r0 + 24), o.sea, o.land, o.cellW, o.cellH, o.contour, false); }); })(r0); more.push(function () { o.coloured = true; }); });
      OVS.map(function (o) { return overlayPlan(o, proj); }).forEach(function (L) { for (var r0 = 0; r0 < L.H; r0 += 24) (function (r0) { more.push(function () { overlayRows(L, r0, Math.min(L.H, r0 + 24)); }); })(r0);
        more.push(function () { B.ov.push({ id: L.o.id, sea: toCanvas(L.sea, L.W, L.H), land: toCanvas(L.land, L.W, L.H), x0: L.x0, y0: L.y0, ww: L.W / L.d, hh: L.H / L.d }); L.sea = L.land = null; }); });
      more.push(function () { S.built[proj] = B; }); Array.prototype.push.apply(st, more); });
    return st;
  }
  function shadeInto(e, w, h, j0, j1, sea, land, cellWf, cellH, contour, wrap, ice) {   // sea by depth, land by height, the light from the north-west, the paper's grain, faint contours if asked; ice (725a) by its own ramp
    for (var j = j0; j < j1; j++) { var cellW = cellWf(j);
      for (var i = 0; i < w; i++) { var k = j * w + i, v = e[k], W_ = e[j * w + (wrap ? (i + w - 1) % w : Math.max(0, i - 1))], E_ = e[j * w + (wrap ? (i + 1) % w : Math.min(w - 1, i + 1))], N_ = e[Math.max(0, j - 1) * w + i], S_ = e[Math.min(h - 1, j + 1) * w + i];
        var slope = (E_ - W_) / (2 * cellW) + (S_ - N_) / (2 * cellH), n = (((i * 73856093) ^ (j * 19349663)) >>> 0) % 5 - 2;   // rising to the east and the south: a face turned to the north-west, lit. The grain a hash: the same on every load
        var onIce = !!(ice && ice[k]), cs = ramp(SEA, Math.min(-30, v)), ss = Math.max(0.86, Math.min(1.14, 1 + slope * SHADE_SEA)), cl = ramp(onIce ? ICE : LAND, Math.max(0, v)), sl = Math.max(0.6, Math.min(1.36, 1 + slope * (onIce ? SHADE_ICE : SHADE_LAND))), o = k * 4;
        var ct = onIce ? ICE_CONTOUR : contour;
        if (ct && v > 0 && (Math.floor(v / ct) !== Math.floor(E_ / ct) || Math.floor(v / ct) !== Math.floor(S_ / ct))) sl *= onIce ? 0.95 : 0.88;   // a faint contour
        sea[o] = cs[1] * ss * 0.94 + 14.6 + n; sea[o + 1] = cs[2] * ss * 0.94 + 13.6 + n; sea[o + 2] = cs[3] * ss * 0.94 + 11 + n; sea[o + 3] = 255;
        land[o] = cl[1] * sl * 0.94 + 14.6 + n; land[o + 1] = cl[2] * sl * 0.94 + 13.6 + n; land[o + 2] = cl[3] * sl * 0.94 + 11 + n; land[o + 3] = 255; } }
  }
  function colourRows(j0, j1) { var r = D.ras; shadeInto(r.e, r.w, r.h, j0, j1, RIMG.sea, RIMG.land, function (j) { return Math.max(2000, 40030174 / r.w * Math.cos((90 - (j + 0.5) * 180 / r.h) * D2R)); }, 20015087 / r.h, 0, true, r.ice); }
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
    S.job = { proj: proj, steps: stepsFor(proj), i: 0, t0: performance.now(), tick: performance.now(), slices: 0, longest: 0, worst: 0, worstAt: -1, vecMs: 0 }; next(pump); return false;
  }
  /* 813 THE STALL'S ROOT (measured Nov 14 at phone speed, the CPU slowed 6x): a slice of the build ran once an ANIMATION FRAME, and the game keeps drawing its
     world under the Pause screen, ~120 ms a frame on a slow phone; so the build got 8 ms of every 120 and its 278 steps took 15.3 s, the card's bar crawling
     through the 80s and 90s. Now, while the map is open, each slice is its own task (a MessageChannel message): the build takes every quiet moment between
     the game's frames, each slice at most half the game's last frame (budget(): 8 ms on the PC, at most 40 ms on a struggling phone), so a tap still waits no
     longer than about one of the game's own frames. On the island chart it goes back to a slice a frame; with the map shut, nothing runs (parked). */
  var MC = null;
  function shown() { return S.view === 'world' && !!S.el && !S.el.hidden && !document.hidden; }
  function next(fn) {
    if (!shown() || typeof MessageChannel === 'undefined') { requestAnimationFrame(fn); return; }
    if (!MC) { MC = new MessageChannel(); MC.q = []; MC.port1.onmessage = function () { var f = MC.q.shift(); if (f) f(); }; }
    MC.q.push(fn); MC.port2.postMessage(0);
  }
  function parked(J) { if (!(S.el && S.el.hidden)) return false; J.parked = true; return true; }   // 813: the map shut, the work waits (it used to keep building under her flight, a slice every frame)
  function unpark() { if (S.job && S.job.parked) { S.job.parked = false; S.job.tick = performance.now(); next(pump); } if (S.rjob && S.rjob.parked) { var J = S.rjob; J.parked = false; J.tick = performance.now(); next(function () { rpump(J); }); } }
  function kick() {   // 813: a chain that has gone quiet for 1.5 s (a frame callback the phone dropped) is started again; a live chain is never doubled
    var t = performance.now();
    if (S.job && !S.job.parked && t - S.job.tick > 1500) { S.job.tick = t; S.kicks++; next(pump); }
    if (S.rjob && !S.rjob.parked && t - S.rjob.tick > 1500) { var J = S.rjob; J.tick = t; S.kicks++; next(function () { rpump(J); }); }
  }
  function pump() {
    var J = S.job; if (!J) return; var t = performance.now(), was = S.proj, bud = budget(J, t); S.proj = J.proj; J.tick = t;   // a step projects in ITS projection, whatever the view shows
    if (parked(J)) { S.proj = was; return; }
    try { do { var t1 = performance.now(); J.steps[J.i++](); var d1 = performance.now() - t1; if (d1 > J.worst) { J.worst = d1; J.worstAt = J.i - 1; } } while (J.i < J.steps.length && performance.now() - t < bud); }
    catch (e) { S.error = String(e && e.message || e); J.i = J.steps.length;
      if (S.vec[J.proj]) { S.built[J.proj] = S.vec[J.proj]; HEAL.direct = true; HEAL.lost++; HEAL.why = 'out of picture memory'; healNote(); }   // 813: the pictures could not be made (a phone out of canvas memory): the plain map stays, and says so
      else { S.failed = true; D = null; } }   // the lines themselves did not read: the words say so, and the next opening tries again
    finally { S.proj = was; }
    var sl = performance.now() - t; J.slices++; if (sl > J.longest) J.longest = sl; J.end = performance.now(); var v = J.steps.vec || 1;
    S.progress = Math.min(1, J.i / v); S.fill = J.i <= v ? 0 : (J.i - v) / Math.max(1, J.steps.length - v); if (!J.vecMs && J.i >= v) J.vecMs = Math.round(performance.now() - J.t0);   // 813: the card's bar is the lines; the thin bar along the top, the pictures
    if (J.i < J.steps.length) { if (S.vec[J.proj]) wantSoon(); else want(); next(pump); return; }   // the next slice: a tap is answered between slices (813: under the plain map, a redraw for the thin bar at most every 400 ms)
    S.job = null; S.fill = 1; S.jobs.push({ proj: J.proj, ms: Math.round(performance.now() - J.t0), vecMs: J.vecMs, slices: J.slices, longestSlice: Math.round(J.longest * 10) / 10, worstStep: Math.round(J.worst * 10) / 10, worstAt: J.worstAt, steps: J.steps.length });
    var nx = S.next; S.next = null; if (nx) ensure(nx); want();
  }
  var CACHE = true;   // the still world drawn once into a picture and slid while her thumb moves (false: every frame draws it all, as before Oct 28)
  var KEYS = ['land', 'coast', 'lakes', 'glaciers', 'icebig', 'riv0', 'riv1', 'riv2'];
  function copiesFor(proj, V) { if (proj === 'pole') return [0]; var out = [], half = V.w / 2 / V.k; for (var n = -2; n <= 2; n++) { var o = n * 360; if (o - 180 < V.cX + half && o + 180 > V.cX - half) out.push(o); } return out; }
  function culled(B, V, off) {   // only the rings whose box meets the view (one degree to spare)
    var x0 = V.cX - V.w / 2 / V.k - off - 1, x1 = V.cX + V.w / 2 / V.k - off + 1, y0 = V.cY - V.h / 2 / V.k - 1, y1 = V.cY + V.h / 2 / V.k + 1, out = {};
    KEYS.forEach(function (key) { var path = new Path2D(); B.R[key].forEach(function (r) { var b = r.b; if (b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1) return; addPts(path, r.p); }); out[key] = path; });
    return out;
  }
  function layerSteps(B, proj, V, ctx, cull, flat, J) {   // the still world for view V into ctx, as six steps (735: flat, the plain map with no pictures at all; J, the render that counts its tiles)
    var offs = copiesFor(proj, V), paths = [], px = 1 / V.k, I = B.img, st = [], fp = null, ts = [];
    var setT = function (off) { var sc = V.k * V.dpr; ctx.setTransform(sc, 0, 0, sc, V.dpr * (V.w / 2 + (off - V.cX) * V.k), V.dpr * (V.h / 2 - V.cY * V.k)); };
    var each = function (fn) { offs.forEach(function (off, i) { setT(off); fn(paths[i]); }); };
    var eachSeen = function (fn) { offs.forEach(function (off, i) { setT(off); ctx.save(); fn(paths[i]); ctx.restore(); }); };   // 753a: only the ground she has seen, by the trail's alpha laid first (source-atop)
    var whole = function () { var w = new Path2D(); if (proj === 'pole') parallel(w, -90); else w.rect(-180, -90, 360, 180); return w; };
    st.push(function () { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true; fp = CLASSIC ? null : fogPaths();
      if (fp) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); offs.forEach(function (off) { setT(off); fogMask(ctx, V, fp); }); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-atop'; } else { ctx.fillStyle = PAPER; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }   // 753a: the canvas's own alpha is the fog, so no hidden canvas can come back empty and show the world
      ts = cull && !flat ? tileReady(V) : []; if (J) J.tiles = ts.length; offs.forEach(function (off, i) { paths[i] = cull ? culled(B, V, off) : B.path; }); eachSeen(function () { if (flat) { ctx.fillStyle = 'rgb(150,199,228)'; ctx.fill(whole()); return; } ctx.drawImage(I.sea, I.x0, I.y0, I.ww, I.hh); B.ov.forEach(function (ov) { ctx.drawImage(ov.sea, ov.x0, ov.y0, ov.ww, ov.hh); }); }); });   // the sharper reliefs over the world's
    st.push(function () { eachSeen(function (q) { if (flat) { ctx.fillStyle = 'rgb(176,194,126)'; ctx.fill(q.land); return; } ctx.save(); ctx.clip(q.land); ctx.drawImage(I.land, I.x0, I.y0, I.ww, I.hh); B.ov.forEach(function (ov) { ctx.drawImage(ov.land, ov.x0, ov.y0, ov.ww, ov.hh); }); ctx.restore(); }); });
    st.push(function () { if (!ts.length) return; eachSeen(function () { ts.forEach(function (t) { var q = tilePaths(t); ctx.save(); ctx.clip(q.rect); ctx.drawImage(I.land, I.x0, I.y0, I.ww, I.hh); B.ov.forEach(function (ov) { ctx.drawImage(ov.land, ov.x0, ov.y0, ov.ww, ov.hh); });   // 735: inside a real tile the coast is the tile's own: land's colours first, the sea only inside its water
        ctx.lineJoin = 'round'; ctx.lineWidth = 1.7 * px; ctx.strokeStyle = 'rgba(58,29,12,.78)'; ctx.stroke(q.water); ctx.save(); ctx.clip(q.water); ctx.drawImage(I.sea, I.x0, I.y0, I.ww, I.hh); B.ov.forEach(function (ov) { ctx.drawImage(ov.sea, ov.x0, ov.y0, ov.ww, ov.hh); }); ctx.restore();
        ctx.lineJoin = 'round'; ctx.lineCap = 'round'; [[2, 0.9, 'rgba(250,244,226,.9)'], [1, 1.3, 'rgba(250,236,196,.95)'], [0, 1.8, 'rgba(232,178,92,.95)']].forEach(function (R) { ctx.lineWidth = (R[1] + 0.8) * px; ctx.strokeStyle = 'rgba(58,29,12,.42)'; ctx.stroke(q.roads[R[0]]); ctx.lineWidth = R[1] * px; ctx.strokeStyle = R[2]; ctx.stroke(q.roads[R[0]]); }); ctx.restore(); }); }); });
    var chunk = function (key, n, j) {   // 813: piece j of a layer's rings cut into n pieces of about equal points, each piece made once, in its own step
      var ck = B.ck || (B.ck = {}), id = key + n, R = B.R[key];
      if (!ck[id]) { var tot = 0, cut = [0], acc = 0, r; for (r = 0; r < R.length; r++) tot += R[r].p.length; for (r = 0; r < R.length; r++) { acc += R[r].p.length; if (acc >= tot * cut.length / n && cut.length < n) cut.push(r + 1); } while (cut.length < n) cut.push(R.length); cut.push(R.length); ck[id] = { cut: cut, p: [] }; }
      var C = ck[id]; if (C.p[j] === undefined) { var a = C.cut[j], b = C.cut[j + 1], pa = null; if (a < b) { pa = new Path2D(); for (var q = a; q < b; q++) addPts(pa, R[q].p); } C.p[j] = pa; } return C.p[j]; };
    if (cull) st.push(function () { eachSeen(function (q) { ctx.fillStyle = 'rgba(250,252,255,.88)'; ctx.fill(q.glaciers); ctx.lineWidth = 0.7 * px; ctx.strokeStyle = 'rgba(140,170,196,.55)'; ctx.stroke(q.glaciers); ctx.strokeStyle = 'rgba(112,146,178,.6)'; ctx.stroke(q.icebig);
      ctx.fillStyle = 'rgb(150,192,210)'; ctx.fill(q.lakes); ctx.lineWidth = 0.7 * px; ctx.strokeStyle = 'rgba(47,95,134,.7)'; ctx.stroke(q.lakes); }); });
    else {   // 813: the whole world (the base picture): the same fills and strokes, a piece a step (was one step of 27-30 ms)
      for (var gj = 0; gj < 4; gj++) (function (j) { st.push(function () { var cp = chunk('glaciers', 4, j); if (!cp) return; eachSeen(function () { ctx.fillStyle = 'rgba(250,252,255,.88)'; ctx.fill(cp); ctx.lineWidth = 0.7 * px; ctx.strokeStyle = 'rgba(140,170,196,.55)'; ctx.stroke(cp); }); }); })(gj);
      st.push(function () { eachSeen(function (q) { ctx.lineWidth = 0.7 * px; ctx.strokeStyle = 'rgba(112,146,178,.6)'; ctx.stroke(q.icebig); }); });
      for (var lj = 0; lj < 2; lj++) (function (j) { st.push(function () { var cp = chunk('lakes', 2, j); if (!cp) return; eachSeen(function () { ctx.fillStyle = 'rgb(150,192,210)'; ctx.fill(cp); ctx.lineWidth = 0.7 * px; ctx.strokeStyle = 'rgba(47,95,134,.7)'; ctx.stroke(cp); }); }); })(lj);
    }
    st.push(function () { eachSeen(function (q) { ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (var rv = 0; rv < 3; rv++) { var a = rv === 0 ? 1 : fadeAt(rv === 1 ? 3 : 5, V.k); if (a <= 0) continue; ctx.globalAlpha = a * 0.85; ctx.strokeStyle = 'rgb(62,118,168)'; ctx.lineWidth = (rv === 0 ? 1.2 : rv === 1 ? 0.9 : 0.7) * px; ctx.stroke(q['riv' + rv]); }
      ctx.globalAlpha = 1; }); });
    if (cull) st.push(function () { if (!ts.length) eachSeen(function (q) { ctx.strokeStyle = 'rgba(58,29,12,.78)'; ctx.lineWidth = 0.85 * px; ctx.stroke(q.coast); }); });   // 735: a real tile brings its own coast
    else for (var cj = 0; cj < 8; cj++) (function (j) { st.push(function () { var cp = chunk('coast', 8, j); if (!cp) return; eachSeen(function () { ctx.strokeStyle = 'rgba(58,29,12,.78)'; ctx.lineWidth = 0.85 * px; ctx.stroke(cp); }); }); })(cj);   // 813: the whole coast in eight pieces (was one step of 47-51 ms)
    st.push(function () { if (!fp) return; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = PAPER; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.globalCompositeOperation = 'source-over'; });   // 753a: the fog's paper, under the picture and its soft rim
    st.push(function () { each(function () {
      var step = V.k > 30 ? 5 : V.k > 9 ? 10 : 30, grat = new Path2D(), lat, lon;
      for (lat = -90 + step; lat < 90; lat += step) if (lat !== 0) parallel(grat, lat);
      for (lon = -180; lon < 180; lon += step) meridian(grat, lon, -90, proj === 'pole' ? 90 - step : 90);
      ctx.strokeStyle = 'rgba(58,29,12,.22)'; ctx.lineWidth = 0.8 * px; ctx.stroke(grat);
      var trop = new Path2D(); parallel(trop, 23.44); parallel(trop, -23.44); ctx.setLineDash([4 * px, 4 * px]); ctx.strokeStyle = 'rgba(178,120,40,.55)'; ctx.lineWidth = 0.9 * px; ctx.stroke(trop);
      var polar = new Path2D(); parallel(polar, 66.56); parallel(polar, -66.56); ctx.strokeStyle = 'rgba(60,110,150,.55)'; ctx.stroke(polar); ctx.setLineDash([]);
      var eq = new Path2D(); parallel(eq, 0); ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 1.6 * px; ctx.stroke(eq);   // the equator, gold
      if (proj === 'pole') { var rim = new Path2D(); parallel(rim, -90); ctx.strokeStyle = INK; ctx.lineWidth = 1.6 * px; ctx.stroke(rim); var rim2 = new Path2D(); parallel(rim2, -87.6); ctx.lineWidth = 0.7 * px; ctx.stroke(rim2); } });
      ctx.setTransform(1, 0, 0, 1, 0, 0); if (J && J.kind === 'base') { ctx.fillStyle = WITNESS; ctx.fillRect(0, 0, 2, 2); } });   // 753a: the witness's own pixels: home is no longer sure to be picture
    return st;
  }
  function baseV(proj) {   // the base picture: the whole plane at the home look's scale (so the first look and every pan at it are pixel for pixel)
    var was = S.proj; S.proj = proj; var k = proj === 'pole' ? kDisc() : Math.max(kDisc(), S.ch / 180 * 0.98); S.proj = was;
    k = Math.min(k, 4096 / (360 * S.dpr)); return { k: k, cX: 0, cY: 0, w: 360 * k, h: (proj === 'pole' ? 360 : 180) * k, dpr: S.dpr };
  }
  function curV() { return { k: S.k, cX: S.cX, cY: S.cY, w: S.cw, h: S.ch, dpr: S.dpr }; }
  function sameV(a, b) { return !!(a && b && a.k === b.k && a.cX === b.cX && a.cY === b.cY && a.w === b.w && a.h === b.h && a.dpr === b.dpr); }
  function startRender(kind, proj, V) {   // on a canvas the processor draws (willReadFrequently): its cost is the page's own time, cut into steps like the build
    var pl = kind === 'plain', front = kind === 'base' ? (S.base[proj] && S.base[proj].c) : pl ? (S.plainPic && S.plainPic.c) : (S.detail && S.detail.c), c = backCanvas(kind === 'base' ? 'base-' + proj : 'detail', front, Math.max(1, Math.round(V.w * V.dpr)), Math.max(1, Math.round(V.h * V.dpr)));
    if (pl) S.detail = null; else if (kind === 'detail') S.plainPic = null;   // 813: the plain picture and the close picture share one pair of canvases (they are never needed at once): the map holds no more canvases than before
    var J = { kind: kind, proj: proj, V: V, c: c, i: 0, t0: performance.now(), steps: null, fv: FOG.v, tiles: 0, stale: false }; J.steps = layerSteps(pl ? (S.built[proj] || S.vec[proj]) : S.built[proj], proj, V, c.getContext('2d', { willReadFrequently: true }), kind === 'detail' || pl, pl, J);   // 735: fv, the fog it was drawn under (813: 'plain', the lines alone, while the pictures are made)
    J.tick = performance.now(); S.rjob = J; next(function () { rpump(J); });
  }
  function rpump(J) {
    if (S.rjob !== J) return; var t = performance.now(), was = S.proj, bud = budget(J, t); if (parked(J)) return; S.proj = J.proj; J.tick = t;
    try { do { J.steps[J.i++](); J.c.getContext('2d').getImageData(0, 0, 1, 1); } while (J.i < J.steps.length && performance.now() - t < bud); } catch (e) { J.bad = true; S.error = String(e && e.message || e); J.i = J.steps.length; } finally { S.proj = was; }
    if (J.kind === 'base') S.progress = 0.9 + 0.1 * J.i / J.steps.length;
    if (J.i < J.steps.length) { if (J.kind === 'base') wantSoon(); next(function () { rpump(J); }); return; }
    J.end = performance.now();
    if (J.bad && J.kind === 'base') { HEAL.direct = true; HEAL.lost++; HEAL.why = 'out of picture memory'; healNote(); }   // 813: a base picture that cannot be made is never asked for again and again behind the card: the plain map, said in words
    if (J.bad && J.kind === 'detail') S.noDetail = true;   // the base picture stays; no close picture is asked for again
    if (J.kind === 'plain') { S.rjob = null; if (J.bad) S.plainDirect = true; else S.plainPic = { c: J.c, V: J.V, proj: J.proj, fv: J.fv }; S.renders.push({ kind: 'plain', proj: J.proj, ms: Math.round(performance.now() - J.t0) }); if (S.renders.length > 40) S.renders.shift(); want(); return; }
    /* 813 (the #142 gate, Nov 14: worldmap712 W9, one 102 ms task at the first look): the plain map was drawn with its paths straight onto the canvas on show, the
       graphics card's canvas, and its first fills and strokes there cost ~100 ms in one frame. Now it is drawn like the base: on a processor canvas, a step a
       slice, each step finished inside its slice (the pixel read above), then laid on screen as one picture; a canvas the phone refuses falls back to the
       old straight drawing (plainDirect). */
    S.rjob = null; if (!J.bad) { if (J.kind === 'base') { S.base[J.proj] = { c: J.c, V: J.V, fv: J.fv }; healSoon(); } else S.detail = { c: J.c, V: J.V, proj: J.proj, fv: J.fv, tiles: J.tiles, stale: J.stale }; }   // 735: a new base is witnessed before it is trusted
    S.renders.push({ kind: J.kind, proj: J.proj, ms: Math.round(performance.now() - J.t0) }); if (S.renders.length > 40) S.renders.shift(); want();
  }
  function blit(g, pic) {   // a still picture drawn for view pic.V, slid and scaled into the view she has now
    var V = pic.V, sc = S.k / V.k, y = S.ch / 2 + (V.cY - V.h / 2 / V.k - S.cY) * S.k, w = V.w * sc, h = V.h * sc;
    for (var n = S.proj === 'pole' ? 0 : -1; n <= (S.proj === 'pole' ? 0 : 1); n++) { var x = S.cw / 2 + (V.cX + n * 360 - V.w / 2 / V.k - S.cX) * S.k;
      if (x > S.cw || x + w < 0 || y > S.ch || y + h < 0) continue; g.drawImage(pic.c, x * S.dpr, y * S.dpr, w * S.dpr, h * S.dpr); }
  }
  function wantDetail() {   // a sharp picture of exactly this view, once her thumb has rested 140 ms
    if (S.noDetail) return; clearTimeout(S.dt); S.dt = setTimeout(function () { S.dt = 0; if (S.view !== 'world' || !S.built[S.proj]) return; if (S.rjob && S.rjob.kind === 'base') { wantDetail(); return; }
      tileAsk(curV()); startRender('detail', S.proj, curV()); }, 140);   // 735: the tiles of this view asked for at the same rest
  }
  function drawWaiting(g, prog) {   // the soft state while the world is drawn: a paper card, the words, a filling bar (prog given: the 1892 paper's own bar, 76 review)
    var w = S.cw, h = S.ch, bw = Math.min(220, w - 60), x = (w - bw) / 2, y = h / 2 + 14, own = prog != null;
    g.font = 'italic 700 15px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    text(g, S.failed && !own ? (S.loadFail && !CLASSIC ? 'The world map\'s file did not arrive.' : 'The world map could not load.') : 'Drawing the world…', w / 2, h / 2 - 10, 1);
    if (S.failed && !own) { if (!CLASSIC) { g.font = 'italic 600 12px Georgia, serif'; text(g, 'No connection? The island chart still works.', w / 2, h / 2 + 14, 0.85); text(g, 'Open the map again to try once more.', w / 2, h / 2 + 32, 0.85); } return; }   // 813: said plainly, and the next opening tries again (DRAFT words for Marth)
    g.fillStyle = 'rgba(58,29,12,.14)'; g.fillRect(x, y, bw, 7); g.fillStyle = '#c0821e'; g.fillRect(x, y, Math.max(4, bw * ((own ? prog : S.progress) || 0)), 7); g.strokeStyle = 'rgba(58,29,12,.5)'; g.lineWidth = 1; g.strokeRect(x - 0.5, y - 0.5, bw + 1, 8);
    if (own) PP.waits++; else S.waits++;
  }

  /* ---------- 735 THE TRUE MAP, AND IT REVEALS ITSELF (Marth, Nov 5 2026, verbatim: "focus on the map.. since the world is 'accessible' the map needs to massively accurate. We should
     also make it so the map kinda reveals itself as your travel"; "in the vid u can see im nowhere near the village but the marker / the map says i am"). Trunks. Wired by
     tools/wiring/wire-735-map.js; guard tests/map735.js. Four parts, each its own section below:
       THE WITNESS: a picture kept on a hidden canvas can come back EMPTY with no error (his phone, Nov 5: paper and city dots, no land). So before a kept picture is trusted, one pixel of it is
         carried through drawImage onto the canvas on show and read back. An empty one is rebuilt from the data held in memory; a second failure in a row switches to the plain map, drawn straight
         onto the canvas on show, so there is always land. Whatever happened is written under the map, never silent.
       HER: a live ruby arrow at her true lat/lon, turned to her true heading; ruby means her and nothing else.
       THE REVEAL: the discs she has flown under, saved in S.world.fog in order (753a). The picture lies inside their soft alpha; the rest stays paper and the grid (735b, Marth: "you kept the outlines, makes the whole point redundant").
       THE CLOSE LOOK: past k 200, OpenFreeMap's own water, roads and place names, each vertex through P(), the relief and sea laid under them, credited only while drawn. ---------- */
  var WITNESS = 'rgb(228,212,170)';   // 753a: the base's corner, a shade off paper: paperLike() refuses paper, her eye cannot tell them apart
  var HEAL = { need: true, checks: 0, lost: 0, rebuilds: 0, fails: 0, direct: false, why: '' };
  var YOU = null, WORDS = null; var MK = null;   // the page's doors: a function returning { lat, lon, bearing, away }, and (735b) her place in plain words
  function hasPixels(c) { try { var p = c.__p || [c.width >> 1, c.height >> 1]; return c.getContext('2d').getImageData(p[0], p[1], 1, 1).data[3] > 0; } catch (e) { return false; } }
  function paperLike(d) { return Math.abs(d[0] - 241) < 7 && Math.abs(d[1] - 226) < 7 && Math.abs(d[2] - 184) < 7; }
  function witness(g, B, bs) {   // true when the kept pictures are really there: each source read, then the base's own witness pixel carried onto this canvas and read back
    HEAL.checks++; var bad = [], I = B.img;
    if (!hasPixels(I.sea)) bad.push('sea'); if (!hasPixels(I.land)) bad.push('land');
    B.ov.forEach(function (o) { if (!hasPixels(o.sea) || !hasPixels(o.land)) bad.push(o.id); });
    { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = PAPER; g.fillRect(0, 0, 2, 2); g.drawImage(bs.c, 0, 0, 1, 1, 0, 0, 1, 1);
      var d = null; try { d = g.getImageData(0, 0, 1, 1).data; } catch (e) { d = null; } g.fillStyle = PAPER; g.fillRect(0, 0, 2, 2); if (d && paperLike(d)) bad.push('picture'); }
    if (PP.cv && !hasPixels(PP.cv)) { PP.cv = null; if (PP.on) paperImg(); }   // the 1892 paper is decoded again from its file
    if (!bad.length) { HEAL.fails = 0; return true; }
    HEAL.lost++; HEAL.fails++; HEAL.why = bad.join(' ');
    if (HEAL.fails >= 2) HEAL.direct = true; else { HEAL.rebuilds++; rebuildAll(); }
    healNote(); return false;
  }
  function rebuildAll() {   // the data (D, RIMG, OVS) is in memory: only the pictures are made again, behind the "Drawing the world…" card
    S.built = {}; S.base = {}; S.detail = null; S.rjob = null; S.job = null; S.next = null; clearTimeout(S.dt); S.dt = 0; POOL = {}; S.plainPic = null; HEAL.need = true;   // 813: S.vec is kept: the lines are paths, nothing a phone can wipe, and the plain map shows while the pictures are made again
    S.cvs = S.cvs.filter(function (c) { if (c === PP.cv || c === PP.build) return true; c.width = 0; c.height = 0; return false; });
  }
  function healSoon() { clearTimeout(HEAL.t); HEAL.t = setTimeout(function () { HEAL.need = true; if (S.view === 'world') want(); }, 300); }   // a new base is read once the browser has finished taking it in: reading at once froze the Globe tap (W9)
  function healNote() { var n = $('wmap735note'); if (!n) return; var t = !HEAL.lost ? '' : HEAL.direct ? 'Plain map: this phone would not keep the full picture (' + HEAL.why + ').' : 'This phone wiped the map\'s picture, so it was drawn again (' + HEAL.lost + ').';
    if (PP.failed) t += (t ? ' ' : '') + 'The 1892 paper did not load; tap it to try again.';   // 813: a piece that did not load says so, and the rest still shows
    n.hidden = !t; n.textContent = t; }   // DRAFT for Marth

  /* ---------- HER ---------- */
  function ahead(ll, b, d) {   // the point d degrees along bearing b: a heading is only ever turned by projecting two real places, never a raw yaw
    var f = ll.lat * D2R, l = ll.lon * D2R, t = b * D2R, a = d * D2R, f2 = Math.asin(Math.sin(f) * Math.cos(a) + Math.cos(f) * Math.sin(a) * Math.cos(t));
    return { lat: f2 / D2R, lon: (l + Math.atan2(Math.sin(t) * Math.sin(a) * Math.cos(f), Math.cos(a) - Math.sin(f) * Math.sin(f2))) / D2R };
  }
  function drawYou(g) {
    var Y = YOU && YOU(), el = $('wmap735you'); if (!Y || !isFinite(Y.lat) || !isFinite(Y.lon)) { S.youAt = null; return; }
    var a = toScreen(Y.lat, Y.lon), n = ahead(Y, Y.bearing, 30 / S.k < 0.01 ? 0.01 : Math.min(2, 30 / S.k)), b = toScreen(n.lat, n.lon), ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2, x = a.x, y = a.y, off = x < 12 || y < 12 || x > S.cw - 12 || y > S.ch - 12;
    if (off) { var cx = S.cw / 2, cy = S.ch / 2, dx = x - cx, dy = y - cy, t = Math.min((cx - 16) / Math.max(1e-6, Math.abs(dx)), (cy - 16) / Math.max(1e-6, Math.abs(dy))); x = cx + dx * t; y = cy + dy * t; ang = Math.atan2(dy, dx) + Math.PI / 2; }   // out of this view: pinned to the edge, pointing to where she is
    g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 7); g.lineTo(0, 3); g.lineTo(-7, 7); g.closePath(); g.fillStyle = '#c8314a'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = '#fff2c2'; g.stroke(); g.lineWidth = 0.8; g.strokeStyle = '#3d0610'; g.stroke(); g.restore();
    g.font = '700 11px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; text(g, 'You', x, y + (y > S.ch - 26 ? -17 : 17), 1, '#8c1d33');
    S.youAt = { x: a.x, y: a.y, shownX: x, shownY: y, ang: ang, off: off, lat: Y.lat, lon: Y.lon, bearing: Y.bearing };
    if (el) { var s = WORDS ? WORDS() : ''; if (el.textContent !== s) el.textContent = s; }   // 735b: the same plain words as the line along the top
  }

  /* ---------- THE REVEAL (753a; Marth, Nov 7, on his iPhone: "it still is revealing way more than I’ve actually searched. And I don’t like how its unveiling in the shape of parentheses"; this overrules the seed he okayed "For now").
     No seeded block. What she has seen is a small circle round home and a list of the discs she truly flew under, in order, at her own place to a hundredth of a degree, one for each eighth-of-a-degree cell that showed her something new. The known places stay as
     marks and open nothing. The discs are stroked as one round-capped trail with a feathered rim measured in screen pixels, so it is the same soft shape on Gleason, the Globe and the 1892 paper.
     The cell grid is the quick "has she seen this spot" for names and tiles; it is only ever drawn from the discs, and it stays inside what is drawn on either map.
     'all' is the whole world seen (the creative world, and the guards that are about the whole picture). ---------- */
  var FC = 2880, FR = 1440, FCELL = 8, FOG = { bits: new Uint8Array(FC * FR / 8), pts: [], pp: {}, all: false, v: 1, n: 0, cell: -1, rc: 0, loaded: false };
  var FOG_KM = [30, 50, 90], FOG_HIGH = [5000, 20000];   // what a bird can see: the radius low, over 5 km up and over 20 km up (DRAFT for Marth); home's circle is the 50
  var FOG_FEATHER = 9, FOG_RINGS = 10, FOG_LINK = 0.4;   // the rim's width in screen px and the strokes that make it; the plane degrees two neighbouring discs are joined across
  var FOG_OLD_SEED = [8, 28, -90, -58], FOG_OLD_RINGS = [[14.5586, -90.7295], [39.0968, -120.0324]];   // only to take the old seed back out of an 'f1:' save; Home, Kingston and Dunn's rings lay inside the block
  function fogRow(lat) { return Math.max(0, Math.min(FR - 1, Math.floor((90 - lat) * FCELL))); }
  function fogCol(lon) { return ((Math.floor((lon + 180) * FCELL) % FC) + FC) % FC; }
  function fogHas(i) { return (FOG.bits[i >> 3] >> (i & 7)) & 1; }
  function fogSet(i) { if (fogHas(i)) return 0; FOG.bits[i >> 3] |= 1 << (i & 7); FOG.n++; return 1; }
  function fogSeen(lat, lon) { return FOG.all || !!fogHas(fogRow(lat) * FC + fogCol(lon)); }
  function fogShown(lat, lon) { return CLASSIC || fogSeen(lat, lon); }   // Classic is frozen (board 645): the trail is kept, never drawn
  function fogTile(z, x, y) { var f = [0.1, 0.5, 0.9]; for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) if (fogSeen(WFR_WORLD.tileLat(z, y + f[a]), WFR_WORLD.tileLon(z, x + f[b]))) return true; return false; }   // a trail can cross a tile and miss its middle
  function fogAround(i, km) {   // the cells under a disc. A degree of longitude is t plane degrees on Gleason and 1 on the Globe: dividing by the larger keeps the cells inside the round disc drawn on both
    var r0 = Math.floor(i / FC), c0 = i % FC, rad = km / 111.2 * FCELL, top = Math.floor(rad), n = 0;
    for (var dr = -top; dr <= top; dr++) { var r = r0 + dr; if (r < 0 || r >= FR) continue; var t = Math.max(1, (r + 0.5) / FCELL * D2R), w = Math.min(FC / 2, Math.floor(Math.sqrt(rad * rad - dr * dr) / t));
      for (var dc = -w; dc <= w; dc++) n += fogSet(r * FC + ((c0 + dc) % FC + FC) % FC); }
    return n;
  }
  function fogPack(lat, lon, rc) { return (Math.round((90 - lat) * 100) * 36000 + (Math.round((lon + 180) * 100) % 36000 + 36000) % 36000) * 3 + rc; }
  function fogLat(v) { return 90 - Math.floor(v / 108000) / 100; }
  function fogLon(v) { return -180 + Math.floor(v / 3) % 36000 / 100; }
  function fogDisc(lat, lon, rc) { var i = fogRow(lat) * FC + fogCol(lon), n = fogAround(i, FOG_KM[rc]); if (n) { FOG.pts.push(fogPack(lat, lon, rc)); FOG.v++; } return n; }   // kept only when it showed her something new, so circling costs nothing. Her true place, not the cell's middle: a straight flight stays straight
  function fogHome() { var W = window.WFR_WORLD; if (W) fogDisc(W.HOME.lat, W.HOME.lon, 1); }
  function fogSave() {   // 'f2:' then the discs in the order she flew them, each her place x 3 + its size, in base 36: seven characters for every 14 km of new ground
    if (FOG.all) return 'all'; return 'f2:' + FOG.pts.map(function (v) { return v.toString(36); }).join(',');
  }
  function fogOld(s) {   // an 'f1:' save (ships #94-#104): half-degree cells, run lengths, with the seed mixed in. Whatever lies outside the seed she truly reached and is kept, as round patches; inside the seed her flights cannot be told from it, so they go with it
    var OC = 720, OR = 360, N = OC * OR, parts = s.slice(3).split(','), sum = 0, a; for (a = 0; a < parts.length; a++) sum += parseInt(parts[a], 36) || 0; if (sum !== N) return;   // a file that does not add up is ignored, never half-read
    var seed = new Uint8Array(N), row = function (lat) { return Math.max(0, Math.min(OR - 1, Math.floor((90 - lat) * 2))); }, col = function (lon) { return ((Math.floor((lon + 180) * 2) % OC) + OC) % OC; };
    for (var la = FOG_OLD_SEED[0]; la < FOG_OLD_SEED[1]; la += 0.5) for (var lo = FOG_OLD_SEED[2]; lo < FOG_OLD_SEED[3]; lo += 0.5) seed[row(la + 0.25) * OC + col(lo + 0.25)] = 1;
    FOG_OLD_RINGS.forEach(function (q) { var r0 = row(q[0]), c0 = col(q[1]);
      for (var dr = -3; dr <= 3; dr++) { var r = r0 + dr, cs = Math.max(0.02, Math.cos((90 - (r + 0.5) / 2) * D2R)), w = Math.min(OC / 2, Math.ceil(Math.sqrt(Math.max(0, 9 - dr * dr)) / cs)); for (var dc = -w; dc <= w; dc++) seed[r * OC + ((c0 + dc) % OC + OC) % OC] = 1; } });
    var i = 0, cur = 0; for (var k = 0; k < parts.length; k++) { var run = parseInt(parts[k], 36) || 0; if (cur) for (var j = i; j < i + run; j++) if (!seed[j]) fogDisc(90 - (Math.floor(j / OC) + 0.5) / 2, -180 + (j % OC + 0.5) / 2, 1); i += run; cur = 1 - cur; }
  }
  function fogLoad(s) {
    FOG.bits.fill(0); FOG.pts = []; FOG.n = 0; FOG.cell = -1; FOG.rc = 0; FOG.all = s === 'all'; FOG.loaded = true; FOG.v++;
    if (typeof s === 'string' && s.indexOf('f2:') === 0) { var vs = s.slice(3).split(',').map(function (x) { return parseInt(x, 36); }); if (vs.every(function (v) { return v >= 0 && v < 18001 * 108000; })) vs.forEach(function (v) { fogAround(fogRow(fogLat(v)) * FC + fogCol(fogLon(v)), FOG_KM[v % 3]); FOG.pts.push(v); }); }   // a file that does not read is ignored, never half-read
    if (!FOG.pts.length) fogHome();
    if (typeof s === 'string' && s.indexOf('f1:') === 0) fogOld(s);
    return FOG.n;
  }
  function fogMark(lat, lon, agl) {   // true when she has revealed something new (the only time the page saves); the cell she is in is remembered, so a still bird costs one comparison
    if (FOG.all || !FOG.loaded) return false; var i = fogRow(lat) * FC + fogCol(lon), rc = agl > FOG_HIGH[1] ? 2 : agl > FOG_HIGH[0] ? 1 : 0; if (i === FOG.cell && rc <= FOG.rc) return false; FOG.cell = i; FOG.rc = rc; return fogDisc(lat, lon, rc) > 0;
  }
  function fogPaths() {   // the trail as one path for each disc size, in plane degrees (null: the whole world is seen). Neighbours are joined, so a straight flight has straight sides, not a string of beads
    if (FOG.all) return null; var c = FOG.pp[S.proj]; if (c && c.v === FOG.v) return c.p;
    var p = [new Path2D(), new Path2D(), new Path2D()], last = [null, null, null], o = { x: 0, y: 0 };
    FOG.pts.forEach(function (v) { var rc = v % 3, l = last[rc]; P(fogLat(v), fogLon(v), o);
      if (l && Math.hypot(o.x - l.x, o.y - l.y) <= FOG_LINK) p[rc].lineTo(o.x, o.y); else { p[rc].moveTo(o.x, o.y); p[rc].lineTo(o.x + 0.001, o.y); } last[rc] = { x: o.x, y: o.y }; });
    FOG.pp[S.proj] = { v: FOG.v, p: p }; return p;
  }
  function fogMask(g, V, fp) {   // the trail as alpha on a cleared canvas, under the plane's transform: a run of round strokes from the rim's outside in, each lifting it one step, the last solid. Stroke width is in plane degrees, so every disc is round on the screen on any map
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#000';
    for (var rc = 0; rc < 3; rc++) { var r = FOG_KM[rc] / 111.2, f = Math.min(FOG_FEATHER / V.k, r * 0.6);
      for (var i = 0; i < FOG_RINGS; i++) { g.globalAlpha = 1 / (FOG_RINGS - i); g.lineWidth = Math.max(2 * r + f - 2 * f * i / (FOG_RINGS - 1), 0.9 / V.k); g.stroke(fp[rc]); } }
    g.restore();
  }

  /* ---------- THE CLOSE LOOK: real water, roads and towns past K_TILE, read with the game's own decoder (world-features.js) ---------- */
  var K_TILE = 200, K_Z12 = 1200, TL = { tmpl: null, tj: 0, map: new Map(), q: [], busy: 0, fetched: 0, fails: 0, v: 0 };
  function tileKey(z, x, y) { return z + '/' + x + '/' + y; }
  function tileNeed(V) {   // the tiles of this view, seen ground only (nothing is fetched for what she has not reached)
    if (V.k < K_TILE || !window.WFR_FEATURES || !window.WFR_WORLD) return []; var z = V.k >= K_Z12 ? 12 : 9, hw = V.w / 2 / V.k, hh = V.h / 2 / V.k, pts = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]], x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = Math.pow(2, z);
    pts.forEach(function (p) { var ll = invP(V.cX + p[0] * hw, V.cY + p[1] * hh); if (!ll) return; var t = WFR_WORLD.tileAt(Math.max(-85, Math.min(85, ll.lat)), ll.lon, z); x0 = Math.min(x0, t.x); x1 = Math.max(x1, t.x); y0 = Math.min(y0, t.y); y1 = Math.max(y1, t.y); });
    if (x1 < x0 || x1 - x0 > 7 || y1 - y0 > 7) return []; var out = [];
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (x >= 0 && x < n && y >= 0 && y < n && fogTile(z, x, y)) out.push({ z: z, x: x, y: y, k: tileKey(z, x, y) });
    return out;
  }
  function tileAsk(V) {
    var need = tileNeed(V); if (!need.length) return;
    if (!TL.tmpl) { if (TL.tj) return; TL.tj = 1; fetch(WFR_FEATURES.C.TILEJSON).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function (j) { var u = j && j.tiles && j.tiles[0]; if (!u || u.indexOf('{z}') < 0) throw new Error('no url'); TL.tmpl = u; TL.tj = 0; markStale(); }, function () { TL.fails++; setTimeout(function () { TL.tj = 0; }, 20000); }); return; }
    need.forEach(function (t) { if (TL.map.has(t.k)) return; TL.map.set(t.k, t); t.state = 'wait'; TL.q.push(t); }); tilePump();
    if (TL.map.size > 90) { var keep = {}; need.forEach(function (t) { keep[t.k] = 1; }); TL.map.forEach(function (t, k) { if (TL.map.size > 70 && !keep[k] && t.state !== 'load') TL.map.delete(k); }); }
  }
  function tilePump() {
    while (TL.busy < 4 && TL.q.length) (function (t) { TL.busy++; t.state = 'load';
      fetch(TL.tmpl.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y)).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(function (b) { tileRead(t, new Uint8Array(b)); t.state = 'ok'; TL.fetched++; }).catch(function () { t.state = 'bad'; TL.fails++; }).then(function () { TL.busy--; tilePump(); if (t.state === 'ok') markStale(); });
    })(TL.q.shift());
  }
  function tileRead(t, u8) {   // lat/lon rings, kept whole: each projection makes its own paths on first use
    var F = WFR_FEATURES, L = F.decodeTile(u8, { water: 1, transportation: 1, place: 1 }), ll = function (ring, E) { var o = new Float64Array(ring.length); for (var i = 0; i < ring.length; i += 2) { var q = F.llOf(t.z, t.x, t.y, ring[i], ring[i + 1], E); o[i] = q.lat; o[i + 1] = q.lon; } return o; };
    t.water = []; t.roads = [[], [], []]; t.labels = []; t.paths = {};
    if (L.water) for (var i = 0; i < L.water.feats.length / 2; i++) { var f = F.feature(L.water, i); if (f.type === 3) f.rings.forEach(function (r) { t.water.push(ll(r, L.water.extent)); }); }
    if (L.transportation) for (var j = 0; j < L.transportation.feats.length / 2; j++) { var g = F.feature(L.transportation, j), c = g.props['class'], rk = c === 'motorway' || c === 'trunk' ? 0 : c === 'primary' ? 1 : c === 'secondary' || c === 'tertiary' ? 2 : -1; if (g.type === 2 && rk >= 0) g.rings.forEach(function (r) { t.roads[rk].push(ll(r, L.transportation.extent)); }); }
    if (L.place) for (var k = 0; k < L.place.feats.length / 2; k++) { var p = F.feature(L.place, k), nm = p.props['name:latin'] || p.props.name; if (p.type === 1 && nm && p.rings[0]) { var q = F.llOf(t.z, t.x, t.y, p.rings[0][0], p.rings[0][1], L.place.extent); t.labels.push({ name: String(nm), lat: q.lat, lon: q.lon, big: p.props['class'] === 'city' || p.props['class'] === 'town' }); } }
  }
  function markStale() { if (S.detail) S.detail.stale = true; if (S.rjob) S.rjob.stale = true; if (S.view === 'world') want(); }
  function tilePaths(t) {   // in plane degrees, in the projection the picture is being made for
    var key = S.proj; if (t.paths[key]) return t.paths[key]; var o = { x: 0, y: 0 }, line = function (path, q) { P(q[0], q[1], o); path.moveTo(o.x, o.y); for (var i = 2; i < q.length; i += 2) { P(q[i], q[i + 1], o); path.lineTo(o.x, o.y); } };
    var W = WFR_WORLD, rect = new Path2D(), la0 = W.tileLat(t.z, t.y), la1 = W.tileLat(t.z, t.y + 1), lo0 = W.tileLon(t.z, t.x), lo1 = W.tileLon(t.z, t.x + 1), edge = [];
    for (var s = 0; s <= 8; s++) edge.push(la0, lo0 + (lo1 - lo0) * s / 8); for (s = 8; s >= 0; s--) edge.push(la1, lo0 + (lo1 - lo0) * s / 8); line(rect, edge);
    var water = new Path2D(); t.water.forEach(function (q) { line(water, q); }); var roads = t.roads.map(function (list) { var p = new Path2D(); list.forEach(function (q) { line(p, q); }); return p; });
    return (t.paths[key] = { rect: rect, water: water, roads: roads });
  }
  function tileReady(V) { var out = []; tileNeed(V).forEach(function (t) { var h = TL.map.get(t.k); if (h && h.state === 'ok') out.push(h); }); return out; }
  function tileLabels(g, fits) {   // the towns of the close look, in screen space, under the same no-overlap rule as the cities
    if (S.k < K_TILE) return; var seen = {}; g.textAlign = 'left';
    tileReady(curV()).forEach(function (t) { t.labels.forEach(function (L) { if (seen[L.name] || !fogSeen(L.lat, L.lon)) return; var q = toScreen(L.lat, L.lon); if (q.x < 6 || q.y < 6 || q.x > S.cw - 6 || q.y > S.ch - 6) return; g.font = (L.big ? '700 11px' : '600 10px') + ' Georgia, serif'; var w = g.measureText(L.name).width; if (!fits(q.x + 5, q.y - 6, w + 2, 12)) return; seen[L.name] = 1; text(g, L.name, q.x + 5, q.y, 1); g.beginPath(); g.arc(q.x, q.y, 2.2, 0, 6.2832); g.fillStyle = '#fff8e8'; g.fill(); g.lineWidth = 1; g.strokeStyle = INK; g.stroke(); }); });
  }
  function tileCredit() { var el = $('wmap735tiles'); if (!el) return; var on = !!(S.detail && S.detail.proj === S.proj && S.detail.tiles > 0 && S.k >= K_TILE); if (el.hidden === on) el.hidden = !on; if (on && !el.textContent) el.textContent = WFR_FEATURES.C.CREDIT; }

  function nearCity(lat, lon, km) {   // 735b: the nearest city inside km, or null (nothing is read until the world's data is in)
    if (!D) return null; var best = null, bd = km, f = lat * D2R; for (var i = 0; i < D.cities.length; i++) { var c = D.cities[i], dl = Math.abs(c.lon - lon); if (dl > 180) dl = 360 - dl; var d = 111.2 * Math.hypot(c.lat - lat, dl * Math.cos(f)); if (d < bd) { bd = d; best = c; } }
    return best ? best.name + (best.country ? ', ' + best.country : '') : null; }
  /* ---------- drawing ---------- */
  function need(rank) { return kDisc() * (rank <= 1 ? 0.5 : Math.pow(1.5, rank)); }   // the zoom at which a rank shows: rank 0-1 always (full at the widest look), then half again each rank
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
    kick();   // 813: a build or picture chain that went quiet is started again
    var plain = !ensure(S.proj);   // 813: the pictures are still being made
    if (plain && (CLASSIC || !S.vec[S.proj])) { g.setTransform(dpr, 0, 0, dpr, 0, 0); drawWaiting(g); return; }   // the card only until the lines are in (Classic, frozen: until the whole build, as before)
    if (S.needHome) { S.needHome = false; homeView(); }   // the first look, once the canvas has its size
    clampView(); var B = S.built[S.proj] || S.vec[S.proj], px = 1 / S.k, offs = copies(), bs = S.base[S.proj], V = curV(), filling = plain;
    var flatNow = function () { layerSteps(B, S.proj, V, g, true, true).forEach(function (f) { f(); }); S.plainDraws++; };   // 813: the plain map straight onto the canvas on show: only when the phone refuses a hidden canvas
    var plainShow = function () {   // 813: the plain map's picture (made in slices, startRender 'plain'), slid to this view; false while none is made yet (the card stays)
      if (S.plainDirect) { flatNow(); return true; }
      var pp = S.plainPic && S.plainPic.proj === S.proj && S.plainPic.fv === FOG.v && S.plainPic.c.width > 0 ? S.plainPic : null;
      if ((!pp || !sameV(pp.V, V)) && !S.rjob) startRender('plain', S.proj, V);
      if (!pp) return false; g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; blit(g, pp); S.plainDraws++; return true; };
    var paperUp = !plain && S.proj === 'pole' && PP.on && !!PP.cv && (CLASSIC || (CACHE && !HEAL.direct));   // 76 review: nothing is drawn or sharpened under the laid paper (735b: in Standard it stops at the ground she has seen, and past that is bare paper)
    if (plain) { if (!plainShow()) { g.setTransform(dpr, 0, 0, dpr, 0, 0); drawWaiting(g); return; } }
    else if (!CACHE || HEAL.direct) layerSteps(B, S.proj, V, g, HEAL.direct, HEAL.direct).forEach(function (f) { f(); });
    else {
      var bv = baseV(S.proj);
      if (!bs || bs.V.k !== bv.k || bs.V.dpr !== bv.dpr || bs.fv !== FOG.v) { if (!S.rjob) startRender('base', S.proj, bv); if (!bs && CLASSIC) { g.setTransform(dpr, 0, 0, dpr, 0, 0); drawWaiting(g); return; } }   // the base is the last part of the opening
      if (!bs) { if (!plainShow()) { g.setTransform(dpr, 0, 0, dpr, 0, 0); drawWaiting(g); return; } filling = true; paperUp = false; }   // 813: Standard shows the plain map while the base picture is made (the card if none was needed)
      else if (HEAL.need && !S.rjob && (HEAL.need = false, !witness(g, B, bs))) { B = S.vec[S.proj] || B; want(); if (!plainShow()) { g.setTransform(dpr, 0, 0, dpr, 0, 0); drawWaiting(g); return; } filling = true; paperUp = false; }   // 735: never show a kept picture on trust (813: the plain map while it is made again, not the card)
      else {
        g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; if (!paperUp) blit(g, bs);
        var dt = S.detail && S.detail.proj === S.proj && S.detail.fv === FOG.v ? S.detail : null; if (dt && !paperUp) blit(g, dt);
        if (paperUp) { if (S.dt) { clearTimeout(S.dt); S.dt = 0; } if (S.rjob && S.rjob.kind === 'detail') S.rjob = null; }
        else if (!(bs.V.k === S.k && bs.V.w > 0) && !(dt && sameV(dt.V, V) && !dt.stale)) wantDetail();
        else if (S.rjob && S.rjob.kind === 'detail' && !sameV(S.rjob.V, V)) S.rjob = null;
      }
    }
    var paper = paperUp && drawPaper(g);   // 725a: the 1892 paper over the relief, under every mark
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
    var yq = !CLASSIC && YOU && YOU(); if (yq && isFinite(yq.lat) && isFinite(yq.lon)) { var ys = toScreen(yq.lat, yq.lon); fits(ys.x - 16, ys.y - 12, 32, 40); }   // 735b
    var dots = [];
    g.textAlign = 'left';
    tileLabels(g, fits);
    for (var ci = 0; ci < D.cities.length; ci++) { var C = D.cities[ci], ca = paper ? 0 : fade(C.rank); if (ca <= 0.05 || !fogShown(C.lat, C.lon)) continue; var cp = scr(B.city, ci); if (!onScreen(cp.x, cp.y, 4)) continue;
      if (!fits(cp.x - 3, cp.y - 3, 6, 6)) continue; dots.push([cp.x, cp.y, ca, C.cap]); C.sx = cp.x; C.sy = cp.y; C.shown = ca; C.drawnAt = S.draws;
      g.font = (C.cap ? '700 ' : '600 ') + (C.rank <= 1 ? 11 : 10) + 'px Georgia, serif'; var cw = g.measureText(C.name).width; if (fits(cp.x + 5, cp.y - 6, cw + 2, 12)) text(g, C.name, cp.x + 5, cp.y, ca); }
    g.font = 'italic 600 12px Georgia, serif'; g.textAlign = 'center';
    for (var oc = 0; oc < OCEANS.length; oc++) { var oa = paper ? 0 : OCEANS[oc][3] === 2 ? fade(3) : OCEANS[oc][3] === 1 ? fade(2) : 1; if (oa <= 0 || !fogShown(OCEANS[oc][1], OCEANS[oc][2])) continue; var op = scr(B.ocean, oc); if (!onScreen(op.x, op.y, 40)) continue; var ow = g.measureText(OCEANS[oc][0]).width; if (fits(op.x - ow / 2, op.y - 7, ow, 14)) text(g, OCEANS[oc][0], op.x, op.y, oa * 0.8, '#2f5f86'); }
    g.font = 'italic 600 10.5px Georgia, serif';
    for (var r = 0; r < D.regions.length; r++) { var R = D.regions[r], ra = paper ? 0 : fade(R.rank); if (ra <= 0.05 || !fogShown(R.lat, R.lon)) continue; var rp = scr(B.region, r); if (!onScreen(rp.x, rp.y, 30)) continue; var rw = g.measureText(R.name).width; if (fits(rp.x - rw / 2, rp.y - 6, rw, 12)) text(g, R.name, rp.x, rp.y, ra * 0.75, '#6e4c2a'); }
    for (var dd = 0; dd < dots.length; dd++) { var d = dots[dd]; g.globalAlpha = d[2]; g.beginPath(); g.arc(d[0], d[1], d[3] ? 3.2 : 2.6, 0, 6.2832); g.fillStyle = '#fff8e8'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = INK; g.stroke(); if (d[3]) { g.beginPath(); g.arc(d[0], d[1], 1, 0, 6.2832); g.fillStyle = INK; g.fill(); } }   // the dots last, over every name
    g.globalAlpha = 1;
    if (np) { g.save(); g.translate(np.x, np.y); g.fillStyle = '#1f8a8a'; g.strokeStyle = '#fff2c2'; g.lineWidth = 1.2; g.beginPath();   // the North Pole: a teal star at the centre, over every name
      for (var s = 0; s < 8; s++) { var rr = s % 2 ? 2 : 6.5, an = s * Math.PI / 4; g.lineTo(Math.sin(an) * rr, -Math.cos(an) * rr); } g.closePath(); g.stroke(); g.fill(); g.restore();
      if (npLab) { g.font = 'italic 700 10px Georgia, serif'; g.textAlign = 'left'; text(g, 'North Pole', np.x + 8, np.y + 9, 0.85); } }
    g.textAlign = 'left'; marks.slice().reverse().forEach(function (mk) { if (!mk.shown || !onScreen(mk.x, mk.y, 10)) return; g.font = '700 11px Georgia, serif';   // home drawn last, on top
      if (mk.lab) text(g, mk.name, mk.x + 9, mk.y, 1, CLASSIC && mk.kind === 'home' ? '#8c1d33' : INK);
      g.save(); g.translate(mk.x, mk.y);
      if (mk.kind === 'home' && CLASSIC) { g.rotate(Math.PI / 4); g.fillStyle = '#c8314a'; g.strokeStyle = '#fff2c2'; g.lineWidth = 1.6; g.fillRect(-5, -5, 10, 10); g.strokeRect(-5, -5, 10, 10); } else if (mk.kind === 'home') { g.lineWidth = 1.3; g.strokeStyle = INK; g.lineJoin = 'round'; g.fillStyle = '#c9744a'; g.beginPath(); g.moveTo(-6, 0); g.lineTo(0, -6); g.lineTo(6, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#f3e3b8'; g.fillRect(-4.5, 0, 9, 6); g.strokeRect(-4.5, 0, 9, 6); }   // 735: home is the chart's house; ruby means her (Classic keeps its ruby diamond)
      else { g.beginPath(); for (var s2 = 0; s2 < 10; s2++) { var r2 = s2 % 2 ? 2.6 : 6, a2 = s2 * Math.PI / 5; g.lineTo(Math.sin(a2) * r2, -Math.cos(a2) * r2); } g.closePath(); g.fillStyle = '#f2b134'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = INK; g.stroke(); }   // a place she knows: a gold star
      g.restore(); });
    if (S.sel) { var ss = toScreen(S.sel.lat, S.sel.lon); g.beginPath(); g.arc(ss.x, ss.y, 9, 0, 6.2832); g.lineWidth = 2; g.strokeStyle = '#c0821e'; g.stroke(); g.beginPath(); g.arc(ss.x, ss.y, 11, 0, 6.2832); g.lineWidth = 1; g.strokeStyle = 'rgba(255,242,194,.9)'; g.stroke(); }
    if (MK) MK.draw(g, toScreen, S.cw, S.ch); if (!CLASSIC) drawYou(g); tileCredit();   // 735: her, over every mark
    if (filling) { g.globalAlpha = 1; g.fillStyle = 'rgba(58,29,12,.16)'; g.fillRect(0, 0, S.cw, 3); g.fillStyle = '#c0821e'; g.fillRect(0, 0, Math.max(6, S.cw * (S.job ? S.fill : 1)), 3); }   // 813: the relief filling in: a thin bar along the top, the map usable under it
    g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(0.6, 0.6, S.cw - 1.2, S.ch - 1.2);
    scaleBar();
    if (S.proj === 'pole' && PP.on && !PP.cv) drawWaiting(g, PP.progress);   // 76 review: the paper is being decoded and laid: the soft card, never a frozen frame
    S.marks = marks; S.draws++; S.ms = Math.round((performance.now() - t0) * 10) / 10;
  }
  function want() { if (S.want) return; S.want = true; requestAnimationFrame(draw); }
  var lastSoon = 0;
  function wantSoon() { var t = performance.now(); if (t - lastSoon < 400) return; lastSoon = t; want(); }   // 813: progress alone redraws at most every 400 ms, so the plain map's redraws never eat the build's time
  /* 813 THE WORLD'S OWN SCALE (Marth's screenshot, Nov 14: the island chart's "0 ... 200 m" sat on the world map, over the Gleason | Globe switch). The world
     map has its own: the true ground distance across the middle of the view (two points 100 px apart, a great circle between them), a round number, its own
     place above the switch. Gleason's disc stretches east-west away from the pole, so it is measured where she is looking, never fixed. Standard only. */
  function scaleBar() {
    var el = $('wmap813scale'); if (!el) return; var a = fromScreen(S.cw / 2 - 50, S.ch / 2), b = fromScreen(S.cw / 2 + 50, S.ch / 2);
    if (!a || !b) { if (!el.hidden) el.hidden = true; return; }
    var f1 = a.lat * D2R, f2 = b.lat * D2R, dl = (b.lon - a.lon) * D2R, km = 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(Math.pow(Math.sin((f2 - f1) / 2), 2) + Math.cos(f1) * Math.cos(f2) * Math.pow(Math.sin(dl / 2), 2)))), per = km / 100;
    if (!(per > 0)) { if (!el.hidden) el.hidden = true; return; }
    var want = per * 90, e = Math.pow(10, Math.floor(Math.log(want) / Math.LN10)), nice = [5, 2, 1].map(function (m) { return m * e; }).filter(function (v) { return v <= want; })[0] || e, w = Math.round(nice / per);
    var label = nice >= 1 ? nice.toLocaleString('en-US') + ' km' : Math.round(nice * 1000) + ' m', key = label + '|' + w;
    if (el.dataset.k !== key) { el.dataset.k = key; el.querySelector('i').style.width = w + 'px'; el.querySelector('span').textContent = label; }
    if (el.hidden) el.hidden = false;
  }

  /* ---------- 725a: THE 1892 PAPER under the marks (the Gleason view only). The scan's pole is the PIXEL-measured pin (1009, 1021), never the eye's
     (969, 979); its map edge r = 869 (the two black rings at 860 and 878); its scale and turn are fitted to six of its painted islands (PAPER725.s
     pixels a degree from the pole, PAPER725.a the turn: the sheet puts Greenwich to the RIGHT, this map puts it DOWN). Paper pixel = pole + s * Rot(a) *
     plane, plane in degrees (x = c sin lon, y = c cos lon); drawn under one transform, clipped to the map's edge (the hour dial left off). ---------- */
  var PAPER725 = { src: 'assets/gleason/gleason-1892-disc-2048.jpg', cx: 1009, cy: 1021, r: 869, s: 4.7765, a: -89.775 * D2R };   // s, a: fitted Nov 4 to six painted islands (tests/map725-paper.json), rms 1.9 deg
  /* 76 REVIEW (Nov 4 2026, Trunks): her first tap on the switch never freezes the map. The 2048 px scan is DECODED OFF THE PAGE'S THREAD (createImageBitmap, or
     img.decode() where that is missing) while the map shows its "Drawing the world…" card; then it is laid ONCE, turned to the map (Greenwich down) and clipped to
     its edge, into PP.cv, a canvas the size of the map's own disc (2 x 869 px, the scan's own pixels a degree), PAPER_STRIPS strips, one a frame; then the full
     decode is let go. Every later frame draws PP.cv under one plain transform (no turn, no clip, no 2048 px source). A scan that fails to load turns the switch
     back off (aria-pressed false, the credit hidden) and the next tap tries again. */
  var PP = { on: false, img: null, cv: null, build: null, loading: false, failed: false, fails: 0, tries: 0, draws: 0, waits: 0, progress: 0, decodeMs: 0, stripMs: 0, strips: 0, released: false, path: '' };
  var PAPER_STRIPS = 6;
  function paperImg() {   // start the decode (once at a time); nothing is drawn from the scan until it is decoded and laid
    if (PP.cv || PP.loading) return; PP.loading = true; PP.failed = false; PP.tries++; PP.progress = 0.05; var im = new Image(), t0 = performance.now(), done = false;
    var fail = function () { if (done) return; done = true; im.onload = im.onerror = null; PP.loading = false; PP.failed = true; PP.fails++; PP.img = null; PP.build = null; paperSwitch(false); healNote(); };
    var laid = function (src, how) { if (done) return; done = true; im.onload = im.onerror = null; PP.decodeMs = Math.round(performance.now() - t0); PP.path = how; PP.img = src; PP.progress = 0.3; want(); requestAnimationFrame(function () { paperStrip(0); }); };
    setTimeout(function () { if (!done) fail(); }, 12000);   // 813: a fetch or decode that never settles turns the switch off and says so, never a card for ever
    healNote();
    if (window.fetch && window.createImageBitmap && location.protocol !== 'file:') {   // served (her app, the site): the bytes fetched, decoded by the browser's own decoder threads
      fetch(PAPER725.src).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); }).then(function (bl) { return createImageBitmap(bl); }).then(function (bm) { laid(bm, 'blob'); }, fail); return; }
    var decoded = function () { laid(im, 'img'); };   // a file:// page (a bench's copy): img.decode() decodes off the thread, then the image itself is laid
    im.onerror = fail; im.onload = im.decode ? null : decoded; im.src = PAPER725.src;
    if (im.decode) im.decode().then(decoded, function () { if (im.complete && im.naturalWidth > 0) decoded(); else fail(); });
  }
  function paperStrip(k) { try { paperStrip0(k); } catch (e) { PP.loading = false; PP.failed = true; PP.fails++; PP.img = null; PP.build = null; S.error = String(e && e.message || e); paperSwitch(false); healNote(); } }   // 813: a strip that throws never leaves the paper's card up
  function paperStrip0(k) {   // one strip of the laid paper a frame: the scan turned and clipped into PP.build, rows [k, k + 1) / PAPER_STRIPS
    var P7 = PAPER725, src = PP.img; if (!src) { PP.loading = false; return; } var N = 2 * P7.r, t = performance.now();
    if (!PP.build) { PP.build = mk(); PP.build.width = N; PP.build.height = N; }
    var g = PP.build.getContext('2d'), ca = Math.cos(P7.a), sa = Math.sin(P7.a), y0 = Math.floor(N * k / PAPER_STRIPS), y1 = Math.floor(N * (k + 1) / PAPER_STRIPS);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(0, y0, N, y1 - y0); g.clip();
    g.setTransform(ca, -sa, sa, ca, N / 2 - (ca * P7.cx + sa * P7.cy), N / 2 - (-sa * P7.cx + ca * P7.cy)); g.beginPath(); g.arc(P7.cx, P7.cy, P7.r, 0, 6.2832); g.clip();
    g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0); g.restore();
    PP.stripMs = Math.max(PP.stripMs, Math.round((performance.now() - t) * 10) / 10); PP.strips++; PP.progress = 0.3 + 0.7 * (k + 1) / PAPER_STRIPS;
    if (k + 1 < PAPER_STRIPS) { want(); requestAnimationFrame(function () { paperStrip(k + 1); }); return; }
    PP.cv = PP.build; PP.build = null; PP.loading = false; if (src.close) src.close(); PP.img = null; PP.released = true; want();   // laid: the full decode let go
  }
  function drawPaper(g) {   // the laid paper: one picture, plain scale and offset (the plane's origin at the disc's centre, P7.s of its pixels a degree)
    if (!PP.cv) return false; var P7 = PAPER725, N = PP.cv.width, ks = S.k / P7.s, d = S.dpr, ox = S.cw / 2 - S.cX * S.k, oy = S.ch / 2 - S.cY * S.k;
    g.save(); var fp = CLASSIC ? null : fogPaths(); if (fp) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.setTransform(S.k * d, 0, 0, S.k * d, d * ox, d * oy); fogMask(g, curV(), fp); g.globalCompositeOperation = 'source-atop'; } g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(PP.cv, d * (ox - N / 2 * ks), d * (oy - N / 2 * ks), d * N * ks, d * N * ks); if (fp) { g.globalCompositeOperation = 'destination-over'; g.fillStyle = PAPER; g.fillRect(0, 0, g.canvas.width, g.canvas.height); } g.restore(); PP.draws++; return true;
  }
  function paperSwitch(on) {
    PP.on = !!on; var b = $('wmap725paper'), c = $('wmap725credit'); if (b) b.setAttribute('aria-pressed', String(PP.on)); if (c) c.hidden = !(PP.on && S.proj === 'pole');
    if (PP.on) paperImg(); want();
  }

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
    var hold = function (g0) { setTimeout(function () { if (G !== g0 || g0.mode !== 'tap' || ptr.size !== 1 || !S.built[S.proj]) return; var ll = fromScreen(g0.x0, g0.y0); if (!ll) return; g0.mode = 'held'; MK.press(g0.x0, g0.y0, ll); }, MK.hold); };   // 743: a held thumb is a fourth gesture; it ends without a pan or a pick
    var startPinch = function () { var a = Array.from(ptr.values()), m = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; G = { mode: 'pinch', d0: Math.max(10, Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)), k0: S.k, X: S.cX + (m.x - S.cw / 2) / S.k, Y: S.cY + (m.y - S.ch / 2) / S.k }; S.gestures++; };
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} var q = rel(e); ptr.set(e.pointerId, q);
      if (MK) MK.down(); if (ptr.size === 1) { G = { mode: 'tap', x0: q.x, y0: q.y, t0: performance.now(), cX: S.cX, cY: S.cY }; if (MK && MK.can()) hold(G); } else if (ptr.size === 2) startPinch(); });
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
    '#wmap712 .wmScale{position:absolute;left:8px;bottom:58px;display:flex;align-items:center;gap:5px;pointer-events:none;font:800 11px/1 system-ui,sans-serif;color:#2b1b17;text-shadow:0 0 3px #f8efdc,0 0 3px #f8efdc,0 0 2px #f8efdc}#wmap712 .wmScale[hidden]{display:none}' +   // 813: the world's own scale, above the switch
    '#wmap712 .wmScale i{display:block;height:6px;box-sizing:border-box;border:1px solid #2b1b17;background:linear-gradient(90deg,#2b1b17 50%,#f8efdc 50%)}' +
    '#wmap712foot{display:none;margin:2px 0 0;max-width:100%;font:600 13px/1.3 var(--body);text-align:center}#map705.wm712 #wmap712foot{display:grid;gap:1px}#wmap712foot .wmNote{font-size:11.5px;opacity:.8}#wmap712sel{min-height:3.9em}#wmap712foot .wmCredit{font-size:11px;opacity:.72}' +
    '#wmap725paper{position:absolute;right:6px;top:6px;height:44px;min-height:44px;min-width:44px;padding:0 12px;border:0;border-radius:22px;background:rgba(246,236,214,.94);color:var(--ink);font:700 12px/44px var(--body);box-shadow:0 2px 8px rgba(0,0,0,.25);touch-action:manipulation}#wmap725paper[aria-pressed="true"]{background:#c8314a;color:#fff6e2}#wmap712.wmGlobe #wmap725paper{display:none}#wmap725credit[hidden],#wmap735note[hidden],#wmap735tiles[hidden]{display:none}#wmap735you{font-size:12px;font-weight:700}#wmap735note{font-size:12px;font-weight:700;color:#8c1d33}html.ui716 #wmap735note{color:var(--u-gold)}' +   // 76 review: a 44 px thumb target in both looks
    'html.ui716 #wmap725paper{height:44px!important;line-height:44px!important;padding-top:0!important;padding-bottom:0!important;background:linear-gradient(180deg,#26316c,#141a4a)!important;color:var(--u-ivory)!important}html.ui716 #wmap725paper[aria-pressed="true"]{background:linear-gradient(180deg,#e04a62,#c8314a 45%,#8a1a2e)!important;color:#fff8ea!important}' +   // 76 review: in Standard, the projection buttons' own plates, its words centred
    '@media (orientation:landscape) and (max-height:520px){#map705.wm712 .m705win{grid-template-columns:auto minmax(150px,210px);column-gap:12px;align-items:center}#map705.wm712 .m705win h3{grid-column:1/-1}#map705.wm712 #wmap712{grid-column:1;grid-row:2}#map705.wm712 #wmap712foot{grid-column:2;grid-row:2;text-align:left;align-self:center}}';
  function sizeCanvas() {   // as big as the island chart (map705Size's side), and wider on a phone on its side
    var isl = $('map705cv'), side = isl && parseFloat(isl.style.width) || Math.max(180, Math.min(innerWidth - 44, innerHeight - 150, 460)), land = innerWidth > innerHeight && innerHeight <= 520;
    var cv = $('wmap712cv'), w = land ? Math.round(Math.max(200, Math.min(innerWidth - 60 - 222, side * 1.6))) : side, h = side;   // on its side the card sits beside the map (the landscape grid in CSS)
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
  }
  function note() { var n = $('wmap712note'); if (n) n.textContent = S.proj === 'pole' ? 'Gleason\'s New Standard Map of the World (1892): the North Pole at the centre, Antarctica the ring of ice at the rim, painted by its height.' : 'Globe: the round world unrolled flat, latitude and longitude drawn as a square grid.'; }   // DRAFT for Marth (76 review): only the title is his ruling; the pole note's tail and the whole Globe note are ours. The Globe note never calls the globe "true" or "real": in this game the disc IS the world
  function load(cb) {
    if (window.WFR_WORLDMAP712 || S.failed) return cb(); if (S.loading) return; S.loading = true; var sc = document.createElement('script'); sc.src = S.src || 'world712-map.js'; S.sc = sc;
    sc.onload = function () { S.loading = false; if (!window.WFR_WORLDMAP712) { S.failed = true; S.loadFail = true; } cb(); };
    sc.onerror = function () { S.loading = false; S.failed = true; S.loadFail = true; cb(); }; document.head.appendChild(sc);
  }
  function show(v) {
    var m = S.el; if (!m) return; S.view = v; m.classList.toggle('wm712', v === 'world'); var b = $('wmap712Btn'), h3 = m.querySelector('h3');
    if (v === 'world') { b.textContent = '🏝 Island'; b.setAttribute('aria-label', 'Back to the island chart'); if (h3) h3.textContent = 'The world'; m.setAttribute('aria-label', 'Map of the whole world');
      if (S.failed && !S.loading) { S.failed = false; S.loadFail = false; if (S.sc && S.sc.parentNode && !window.WFR_WORLDMAP712) S.sc.parentNode.removeChild(S.sc); }   // 813: what failed before is tried again at every opening (it was given up for the whole session)
      if (!CLASSIC) S.needHome = true; HEAL.need = true; S.home = window.WFR_WORLD ? WFR_WORLD.HOME : null; sizeCanvas(); want(); load(want); }
    else { b.textContent = '🌍 World'; b.setAttribute('aria-label', 'Show the whole world'); if (h3) h3.textContent = 'The island'; m.setAttribute('aria-label', 'Map of the island');
      if (S.redraw) S.redraw(); }   // back to the island chart, drawn by 705's own map705Size and map705Draw (the hook hands them over: they are not globals)
  }
  function setProj(p) { if (p !== 'globe' && p !== 'pole') return; S.proj = p; S.toggles++; var wr = $('wmap712'); if (wr) wr.classList.toggle('wmGlobe', p === 'globe'); var pc = $('wmap725credit'); if (pc) pc.hidden = !(PP.on && p === 'pole'); document.querySelectorAll('#wmap712 .wmProj button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.proj === p)); }); note(); S.needHome = true; want(); }
  function attach(m, src, redraw) {
    if (S.el) return; S.el = m; S.src = src || 'world712-map.js'; S.redraw = typeof redraw === 'function' ? redraw : null;
    var st = document.createElement('style'); st.id = 'wmap712css'; st.textContent = CSS; document.head.appendChild(st);
    var win = m.querySelector('.m705win'), b = document.createElement('button'); b.type = 'button'; b.id = 'wmap712Btn'; b.textContent = '🌍 World'; b.setAttribute('aria-label', 'Show the whole world'); win.appendChild(b);
    var wrap = document.createElement('div'); wrap.id = 'wmap712';
    wrap.innerHTML = '<canvas id="wmap712cv" width="8" height="8" aria-label="The whole world: drag to move, pinch to zoom, tap a place"></canvas>' +
      '<div class="wmProj" role="group" aria-label="Projection"><button type="button" data-proj="pole" aria-pressed="true">Gleason (1892)</button><button type="button" data-proj="globe" aria-pressed="false">Globe</button></div>' +   // DRAFT for Marth (76 review): the tab words "Gleason (1892)" and "Globe" (was "Globe-true")
      '<div class="wmZoom"><button type="button" id="wmap712in" aria-label="Zoom in">+</button><button type="button" id="wmap712out" aria-label="Zoom out">−</button><button type="button" id="wmap712home" aria-label="' + (CLASSIC ? 'Back to home' : 'Back to you') + '">⌂</button></div>' +
      '<button type="button" id="wmap725paper" aria-pressed="false" aria-label="Lay the 1892 paper map under the marks">1892 paper</button>' +
      (CLASSIC ? '' : '<div class="wmScale" id="wmap813scale" hidden aria-hidden="true"><i></i><span></span></div>');   // 813: the world's own scale (Classic, frozen, has none)   // DRAFT for Marth (76 review): the switch's words "1892 paper" and its spoken label
    var foot = document.createElement('p'); foot.id = 'wmap712foot';
    foot.innerHTML = (CLASSIC ? '' : '<span id="wmap735you"></span>') + '<span id="wmap712sel">Tap a place: how far it is from home</span><span id="wmap735note" hidden></span><span class="wmNote" id="wmap712note"></span><span class="wmCredit" id="wmap712credit"></span><span class="wmCredit" id="wmap725credit" hidden></span><span class="wmCredit" id="wmap735tiles" hidden></span>'; foot.querySelector('#wmap712credit').textContent = credit(); foot.querySelector('#wmap725credit').textContent = PAPER_CREDIT;
    var isl = $('map705cv'); win.insertBefore(wrap, isl.nextSibling); win.insertBefore(foot, win.querySelector('.m705foot').nextSibling); note();
    tapButton(b, function () { show(S.view === 'world' ? 'island' : 'world'); });
    wrap.querySelectorAll('.wmProj button').forEach(function (pb) { tapButton(pb, function () { setProj(pb.dataset.proj); }); });
    tapButton($('wmap725paper'), function () { paperSwitch(!PP.on); var pc = $('wmap725credit'); if (pc) pc.hidden = !(PP.on && S.proj === 'pole'); });
    tapButton($('wmap712in'), function () { zoomAt(S.cw / 2, S.ch / 2, 1.6); }); tapButton($('wmap712out'), function () { zoomAt(S.cw / 2, S.ch / 2, 1 / 1.6); });
    tapButton($('wmap712home'), function () { if (!CLASSIC) { homeView(); want(); return; } var H = WFR_WORLD.HOME; S.k = Math.max(S.k, 24); P(H.lat, H.lon, tmp); S.cX = tmp.x; S.cY = tmp.y; clampView(); want(); });   // 735b: back to her
    wireGestures($('wmap712cv'));
    new MutationObserver(function () { if (m.hidden) { if (S.view !== 'island') show('island'); } else { S.opens++; unpark(); if (!CLASSIC) load(function () { if (!S.failed && window.WFR_WORLDMAP712) ensure(S.proj); }); } }).observe(m, { attributes: true, attributeFilter: ['hidden'] });   // every opening starts on the island chart (813: and the world's lines start while she reads it; nothing runs with the map shut)
    if (!m.hidden && !CLASSIC) load(function () { if (!S.failed && window.WFR_WORLDMAP712) ensure(S.proj); });   // 813: the first opening (this file arrives after the chart is up, so the watcher above never saw it)
    addEventListener('resize', function () { if (S.view === 'world' && !m.hidden) { sizeCanvas(); want(); } });
    document.addEventListener('visibilitychange', function () { if (document.hidden) return; HEAL.need = true; if (S.view === 'world' && !m.hidden) want(); });   // 735: back from the lock screen
  }
  return { attach: attach, show: show, setProj: setProj, credit: credit, paper: paperSwitch, PAPER725: PAPER725, you: function (fn, words) { YOU = fn; WORDS = words || null; if (S.view === 'world') want(); }, near: nearCity, fog: { load: fogLoad, save: fogSave, mark: fogMark, seen: fogSeen },
    choose: function (lat, lon) { select({ name: null, lat: lat, lon: lon, kind: 'point' }); want(); return S.sel; },   // the bench's door for a place no thumb can hit exactly (home's antipode)
    look: function (lat, lon, k) { S.needHome = false; P(lat, lon, tmp); S.k = k; S.cX = tmp.x; S.cY = tmp.y; clampView(); draw(); return { k: S.k, cX: S.cX, cY: S.cY }; },   // the bench's and the home button's way to aim the view
    state: function () { var cv = $('wmap712cv'), r = cv ? cv.getBoundingClientRect() : null; return { view: S.view, proj: S.proj, k: S.k, kMin: S.cw ? kMin() : null, cX: S.cX, cY: S.cY, cw: S.cw, ch: S.ch, dpr: S.dpr, loaded: S.loaded, failed: S.failed,
      draws: S.draws, ms: S.ms, opens: S.opens, toggles: S.toggles, gestures: S.gestures, sel: S.sel ? { name: S.sel.name, lat: S.sel.lat, lon: S.sel.lon, km: S.sel.km, kind: S.sel.kind, word: S.sel.word, bearing: S.sel.bearing, anti: S.sel.anti } : null, canvases: S.made, canvasBytes: S.cvs.reduce(function (a, c) { return a + c.width * c.height * 4; }, 0), overlays: Object.keys(S.built).map(function (k) { return k + ':' + S.built[k].ov.map(function (o) { return o.id; }).join('+'); }), rect: r ? { l: r.left, t: r.top, w: r.width, h: r.height } : null,
      citiesShown: D ? D.cities.filter(function (c) { return c.drawnAt === S.draws - 1 && c.shown > 0.3; }).map(function (c) { return c.name; }) : null,
      paper: { on: PP.on, loaded: !!PP.cv, failed: PP.failed, fails: PP.fails, tries: PP.tries, loading: PP.loading, draws: PP.draws, waits: PP.waits, path: PP.path, decodeMs: PP.decodeMs, strips: PP.strips, stripMs: PP.stripMs, holdsFull: !!PP.img, released: PP.released, cacheSide: PP.cv ? PP.cv.width : 0, cx: PAPER725.cx, cy: PAPER725.cy, r: PAPER725.r, s: PAPER725.s, a: PAPER725.a },
      map735: { heal: { checks: HEAL.checks, lost: HEAL.lost, rebuilds: HEAL.rebuilds, direct: HEAL.direct, why: HEAL.why }, you: S.youAt || null, fog: { n: FOG.n, all: FOG.all, v: FOG.v, pts: FOG.pts.length }, tiles: { fetched: TL.fetched, fails: TL.fails, held: TL.map.size, pending: TL.q.length + TL.busy, inPicture: S.detail ? S.detail.tiles : 0, fresh: !!(S.detail && S.detail.fv === FOG.v && !S.detail.stale && sameV(S.detail.V, curV())) }, kMax: K_MAX },
      plain: { vec: Object.keys(S.vec), draws: S.plainDraws, fill: S.fill, kicks: S.kicks, noDetail: S.noDetail, loadFail: S.loadFail },   // 813
      ready: Object.keys(S.built), building: S.job ? S.job.proj : (S.rjob && S.rjob.kind === 'base' ? S.rjob.proj : null), rendering: !!(S.rjob || S.dt), base: Object.keys(S.base), renders: S.renders.slice(), progress: S.progress, waits: S.waits, jobs: S.jobs.slice(), error: S.error, counts: D ? { land: D.land.length, coast: D.coast.length, lakes: D.lakes.length, glaciers: D.glaciers.length, rivers: D.rivers.length, cities: D.cities.length, regions: D.regions.length } : null }; },
    project: toScreen, unproject: fromScreen, marks: function (o) { MK = o; want(); }, redraw: want, tapButton: tapButton };
})();
