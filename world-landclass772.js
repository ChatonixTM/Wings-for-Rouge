/* world-landclass772.js - GROUND COVER WHERE THE MAP IS SILENT (board 772a; Trunks, Nov 11 2026). Marth, verbatim (row 772): "Make sure every single place in the
   world has development. I want us to focus on the realistic world building".
   The defect it mends: world-vegetation.js plants trees and grass where an OpenStreetMap landcover / landuse polygon gives a class. Where a detailed map
   tile is loaded and holds no polygon over a spot, nothing grew there at all (bare ground beside a road in the taiga, in a savanna, on a poorly mapped farm).
   What it does: where the map is silent, the cover comes from NASA's yearly land cover map (MODIS, the 17 IGBP classes), and world-vegetation.js plants
   by its own classes, species, densities and bands. The map still wins wherever it speaks: a polygon of ANY class from the map's landcover, landuse or
   aeroway layers, a word the vegetation knows or not, is the map speaking, and the fill plants nothing in it; four outlines that are not ground cover (military, neighbourhood, quarter, suburb) do not count as speaking (world-vegetation.js, edits V5-V7 of the
   wire). Urban is a town's yard trees and lawns (the vegetation's own 'residential' class), never a forest.
   WHAT IT DOES NOT DO: it gives no cover to ice, bare rock or water. Those three are KNOWN bare: nothing is planted on them, and the photo's colour
   is not asked either (a later unit puts rocks and dry shrubs there). "Unclassified" and a tile still on its way are unknown: left exactly as before.
   WHERE IT SHOWS (the coverage survey, tests/coverage772.js, Nov 11 2026): a detailed map tile that HAS data but no landcover polygon at the spot was
   bare: Iowa farmland 99% of land points, Punjab 96%, the Australian outback 84%, half of Ujjain and Nakuru. (A detailed tile that arrives EMPTY never
   reached the vegetation: there the photo's colour grew a forest, and still does while the land cover tile is on its way.) And the forest the photo's
   colour grew from high up, over a place whose detailed tile then came in silent, vanished on the way down (Iowa: 9,234 trees from 3,000 m, none
   lower): now both heights ask the same map first.
   BORROWED (the gate, Marth, Nov 7 2026):
     - THE DATA: NASA GIBS layer MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual ("Land Cover Type (L3, IGBP, Annual, MODIS, Aqua+Terra)"; the GIBS layer
       metadata names the product MCD12Q1 v061, "MODIS/Terra+Aqua Land Cover Type Yearly L3 Global 500m SIN Grid V061", Friedl and Sulla-Menashe 2022,
       NASA LP DAAC, doi:10.5067/MODIS/MCD12Q1.061; NASA's catalogue lists no use constraint). Palette PNG tiles, z0-8, the same host and tile pattern
       as world-imagery.js; the server sends Access-Control-Allow-Origin: *; no key. NASA Earthdata Data Use Guidance, read Nov 11 2026: "Unless the
       content is marked with a use restriction or license, data provided from a NASA-led mission are licensed as Creative Commons Zero (CC0)"; "data
       users are very strongly urged to cite the data used". Kept: the credit on screen and in the menu; no NASA logo; no implied endorsement.
     - THE LEGEND (never guessed): the layer's own colour map, https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_IGBP_Land_Cover_Type.xml (named by
       the layer's entry in the GIBS WMTS capabilities), read Nov 11 2026. LEGEND below is its ColorMapEntry list, colour for colour.
     - THE CODE: world-imagery.js's tile fetch, bitmap decode and queue (copied and edited: one byte a pixel instead of three); the streamer's "a place
       deeper than z8 reads its z8 ancestor's window" (here: a point's web-map fraction times 2^8 names the tile, the remainder the pixel).
       world-vegetation.js's own class numbers, hash, species and densities are read from WFR_VEG, never copied.
   Hand-written (glue only): the class table below and the soft edge. A pixel is ~500 m: so a forest never ends in a square wall, each plant reads the
   map at its own spot moved by (1) a slow wobble (value noise, one cell = C.WOB pixels) that bends the edge, and (2) its own small hashed step
   (C.FEATHER of a pixel), which thins one class into the next the way a bilinear blend of their densities would. Against a town or a bare class
   (ice, rock, water) the wild side alone gives way: a plant stays wild only if its moved spot, its own spot AND the spot moved the opposite way are
   all wild, so the forest thins to nothing as it comes to the lake or the town (no wall on the pixel's line) and never stands on their pixels.
   The switch: localStorage 'wfr.landclass' = 'off' (or ?landclass=0) is the state before this unit. Classic is frozen: off when the classic look is on.
   It never touches the game, makes no mesh, no material, no shader program, and fetches nothing until the vegetation asks about a silent spot.
   KNOWN WEAK SHAPES (kept as they are in this unit; a later unit borrows real ones): cropland is drawn as grass with a lone tree, the savannas as a
   thinned oak-and-birch forest over grass, the shrublands as low krummholz and oak.
   Every number DRAFT (unmeasured on her phone). */
window.WFR_LANDCLASS = (function () {
  'use strict';
  var C = { ON: true, Z: 8, PX: 256, KEEP: 12, LOADS: 2, RETRY: 20000, TIMEOUT: 12000, WOB: 0.4, WARP: 0.5, FEATHER: 0.6, PRE: 16, NEAR_RGB: 12, DATE: '2024-01-01',   // DATE: the one pinned year of the map (the layer runs 2001-01-01 to 2024-01-01, one a year); TIMEOUT: a request that hangs is given up (it would hold one of the LOADS places for good)
    URL: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual/default/{date}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png' };   // WMTS RESTful: {TileMatrix}/{TileRow}/{TileCol} = z/y/x
  var CREDIT = 'Land cover: MODIS MCD12Q1 v061 (Terra + Aqua), NASA LP DAAC.';
  /* the layer's colour map: [red, green, blue, the IGBP class]. 18 stands for the product's 255 ("Unclassified"); a transparent pixel is no data (0) */
  var LEGEND = [[33, 138, 33, 1], [49, 204, 49, 2], [152, 204, 49, 3], [150, 250, 150, 4], [141, 186, 141, 5], [186, 141, 141, 6], [245, 222, 179, 7], [218, 235, 157, 8], [255, 213, 0, 9],
    [240, 185, 103, 10], [71, 131, 181, 11], [250, 239, 115, 12], [255, 0, 0, 13], [153, 147, 86, 14], [255, 255, 255, 15], [191, 191, 189, 16], [134, 202, 227, 17], [100, 100, 100, 18]];
  var NAMES = ['no data', 'evergreen needleleaf forest', 'evergreen broadleaf forest', 'deciduous needleleaf forest', 'deciduous broadleaf forest', 'mixed forest', 'closed shrubland', 'open shrubland',
    'woody savanna', 'savanna', 'grassland', 'permanent wetland', 'cropland', 'urban and built-up', 'cropland / natural vegetation mosaic', 'permanent snow and ice', 'barren', 'water', 'unclassified'];
  /* THE CLASS TABLE: an IGBP class onto the classes world-vegetation.js ALREADY has (by their names in WFR_VEG.CLS).
     [trees' class, share of that class's tree density, leaf (1 needle, 2 broad, 0 by latitude), height factor, grass's class, share of its grass density]
     The savannas are a thinned forest over a grass floor (IGBP: tree cover 30-60% and 10-30%); in the north the same rule gives the open taiga.
     Urban is 'residential' (the vegetation's own town class: a yard tree here and there, lawns; what it plants where the map itself says
     landuse = residential). Snow and ice, barren and water are 'bare_rock' (the vegetation's blocked class: no tree, no blade, and no asking the
     photo's colour). null (no data, unclassified): unknown, left as before. */
  var NEEDLE = 1, BROAD = 2;
  var RULES = [null,
    ['forest', 1, NEEDLE, 1, 'forest', 1], ['forest', 1, BROAD, 1, 'forest', 1], ['forest', 1, NEEDLE, 1, 'forest', 1], ['forest', 1, BROAD, 1, 'forest', 1], ['forest', 1, 0, 1, 'forest', 1],
    ['scrub', 1, 0, 1, 'scrub', 1], ['scrub', 0.35, 0, 1, 'scrub', 0.45],
    ['forest', 0.45, 0, 0.75, 'grass', 0.8], ['forest', 0.15, 0, 0.6, 'grass', 1],
    ['grass', 1, 0, 1, 'grass', 1], ['wetland', 1, 0, 1, 'wetland', 1], ['farmland', 1, 0, 1, 'farmland', 1],
    ['residential', 1, 0, 0.8, 'residential', 1],
    ['forest', 0.12, 0, 0.7, 'farmland', 0.9],
    ['bare_rock', 1, 0, 1, 'bare_rock', 1], ['bare_rock', 1, 0, 1, 'bare_rock', 1], ['bare_rock', 1, 0, 1, 'bare_rock', 1],
    null];
  var CLASSES = 19, SPAN = C.PX << C.Z;   // SPAN: the web map's width in z8 pixels (65,536)
  var URBAN = 13, OWN = RULES.map(function (r, i) { return !r || i === URBAN || r[0] === 'bare_rock'; });   // the classes that hold their own pixel: the town, the bare ones (snow and ice, barren, water) and the unknown (no data, unclassified)
  function zeros() { var a = []; for (var i = 0; i < CLASSES; i++) a.push(0); return a; }
  var stats = { asked: 0, ahead: 0, loaded: 0, errors: 0, timeouts: 0, evicted: 0, unknown: 0, near: 0, decodeMsMax: 0, lastError: null, trees: zeros(), grass: zeros(), kept: zeros() };   // trees / grass: lookups by IGBP class; kept: trees planted by it
  var tiles = new Map(), pend = new Set(), failed = new Map(), q = [], inflight = 0, clock = 0, cur = null, listeners = [], canvas = null, ctx = null, LUT = null;
  var T = null, hash = null, KI = null, en = null, api = null;
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function urlOf(x, y) { return C.URL.replace('{date}', C.DATE).replace('{z}', C.Z).replace('{y}', y).replace('{x}', x); }
  function enabled() {   // read once: the switch, the classic look, a page opened from a file (no fetch there, as world-imagery.js)
    if (en !== null) return en; en = true;
    try { if (location.protocol === 'file:' || location.search.indexOf('landclass=0') >= 0) en = false; if (window.localStorage && (localStorage.getItem('wfr.landclass') === 'off' || localStorage.getItem('wfr.look') === 'classic')) en = false; } catch (e) { /* private mode, or no page (node): on */ }
    if (window.WFR_DOOR && window.WFR_DOOR.classic) en = false;
    return en;
  }
  function resolve() {   // the vegetation's own numbers for the names above; a rule naming a class it does not have is left as before
    var V = window.WFR_VEG; if (!V || !V.CLS || !V.KINDS || typeof V.hash3 !== 'function') return false;
    var t = [], i, r; for (i = 0; i < CLASSES; i++) { r = RULES[i]; t.push(r && V.CLS[r[0]] && V.CLS[r[4]] ? { c: V.CLS[r[0]], k: r[1], leaf: r[2], h: r[3], g: V.CLS[r[4]], gk: r[5] } : null); }
    KI = { pine: V.KINDS.indexOf('pine'), fir: V.KINDS.indexOf('fir'), oak: V.KINDS.indexOf('oak'), birch: V.KINDS.indexOf('birch') }; hash = V.hash3; T = t; return true;
  }
  function live() { return C.ON && enabled() && !!(T || resolve()); }

  /* ---------- the tiles (world-imagery.js's fetch, decode and queue, copied and edited) ---------- */
  function fetchBlob(x, y) {   // a request that has not answered in C.TIMEOUT is given up (and aborted where the browser can)
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = 0;
    var job = fetch(urlOf(x, y), ctl ? { mode: 'cors', signal: ctl.signal } : { mode: 'cors' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); });
    if (typeof setTimeout !== 'function') return job;   // a bench with no clock: no timer to give up by
    var late = new Promise(function (res, rej) { timer = setTimeout(function () { stats.timeouts++; if (ctl) { try { ctl.abort(); } catch (e) { /* gone */ } } rej(new Error('timeout')); }, C.TIMEOUT); });
    return Promise.race([job, late]).then(function (b) { clearTimeout(timer); return b; }, function (e) { clearTimeout(timer); throw e; });
  }
  function bitmapOf(blob) {   // the file's own bytes (no colour management), as world-imagery.js decodes
    if (window.createImageBitmap) return createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    return new Promise(function (res, rej) { var u = URL.createObjectURL(blob), im = new Image(); im.onload = function () { URL.revokeObjectURL(u); res(im); }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('image')); }; im.src = u; });
  }
  function classOfColour(r, g, b) {   // the legend's class for a colour: exact; or, for a browser that shifted the colours a hair, the legend colour within C.NEAR_RGB, told apart as -2 - class; or -1 (unknown)
    if (!LUT) { LUT = new Map(); for (var i = 0; i < LEGEND.length; i++) LUT.set((LEGEND[i][0] << 16) | (LEGEND[i][1] << 8) | LEGEND[i][2], LEGEND[i][3]); }
    var v = LUT.get((r << 16) | (g << 8) | b); if (v !== undefined) return v;
    var best = -1, bd = C.NEAR_RGB + 1; for (var k = 0; k < LEGEND.length; k++) { var d = Math.abs(LEGEND[k][0] - r) + Math.abs(LEGEND[k][1] - g) + Math.abs(LEGEND[k][2] - b); if (d < bd) { bd = d; best = LEGEND[k][3]; } }
    return best < 0 ? -1 : -2 - best;
  }
  function classesOf(img) {   // one byte a pixel: the IGBP class (0 where the tile has no data or a colour the legend does not hold)
    var P = C.PX; if (!canvas) { canvas = document.createElement('canvas'); canvas.width = P; canvas.height = P; ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingEnabled = false; }
    ctx.clearRect(0, 0, P, P); ctx.drawImage(img, 0, 0, P, P); if (img.close) img.close();
    var d = ctx.getImageData(0, 0, P, P).data, out = new Uint8Array(P * P), lastKey = -1, lastV = 0, lastKind = 0;
    for (var i = 0, j = 0; i < d.length; i += 4, j++) {
      if (d[i + 3] < 128) continue;
      var key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      if (key !== lastKey) { lastKey = key; var v = classOfColour(d[i], d[i + 1], d[i + 2]); if (v === -1) { lastV = 0; lastKind = 1; } else if (v < -1) { lastV = -2 - v; lastKind = 2; } else { lastV = v; lastKind = 0; } }
      if (lastKind === 1) stats.unknown++; else if (lastKind === 2) stats.near++;
      out[j] = lastV;
    }
    return out;
  }
  function put(key, px) {   // the newest kept, the least lately read let go
    tiles.set(key, { key: key, px: px, used: ++clock, nb: 0 });
    if (tiles.size > C.KEEP) { var old = null; tiles.forEach(function (t) { if (!old || t.used < old.used) old = t; }); if (old) { tiles.delete(old.key); if (cur === old) cur = null; stats.evicted++; } }
  }
  function want(key, x, y) {
    if (pend.has(key)) return; if (failed.size) { var f = failed.get(key); if (f && now() - f < C.RETRY) return; }
    pend.add(key); q.push({ key: key, x: x, y: y }); pump();
  }
  function arrived(it) { for (var i = 0; i < listeners.length; i++) { try { listeners[i](it.x, it.y); } catch (e) { stats.lastError = 'listener: ' + (e && e.message || e); } } }
  function pump() {
    while (inflight < C.LOADS && q.length) {
      var it = q.pop(); inflight++; stats.asked++;
      (function (it) {
        fetchBlob(it.x, it.y).then(bitmapOf).then(function (img) { var t0 = now(), px = classesOf(img), ms = now() - t0; if (ms > stats.decodeMsMax) stats.decodeMsMax = ms; put(it.key, px); failed.delete(it.key); stats.loaded++; arrived(it); })
          .catch(function (e) { stats.errors++; stats.lastError = C.Z + '/' + it.x + '/' + it.y + ': ' + (e && e.message || e); failed.set(it.key, now()); })
          .then(function () { pend.delete(it.key); inflight--; pump(); });
      })(it);
    }
  }

  /* ---------- the lookup: (X, Y) is the web map's fraction (0..1 east, 0..1 south), as world-vegetation.js's masks read it ---------- */
  function rawPx(gx, gy) {   // the class of one z8 pixel of the whole map; 0 while its tile is on the way (asked for here)
    var px = Math.floor(gx), py = Math.floor(gy); if (py < 0) py = 0; else if (py >= SPAN) py = SPAN - 1; px = ((px % SPAN) + SPAN) % SPAN;
    var tx = px >> 8, ty = py >> 8, key = tx * 256 + ty, t = cur;   // >> 8: 256 pixels a tile (C.PX)
    if (!t || t.key !== key) { t = tiles.get(key); if (!t) { want(key, tx, ty); return 0; } t.used = ++clock; cur = t; }
    var ex = px & 255, ey = py & 255, dx = ex < C.PRE ? -1 : ex >= 256 - C.PRE ? 1 : 0, dy = ey < C.PRE ? -1 : ey >= 256 - C.PRE ? 1 : 0;
    if (dx || dy) ahead(t, tx, ty, dx, dy);
    return t.px[(ey << 8) | ex];
  }
  function ahead(t, tx, ty, dx, dy) {   // within C.PRE pixels (~8 km) of the tile's edge: the tiles past it are asked for once, so the map is there before she is
    var bit = 1 << ((dx + 1) * 3 + dy + 1); if (t.nb & bit) return; t.nb |= bit;
    var xs = dx ? [0, dx] : [0], ys = dy ? [0, dy] : [0];
    for (var i = 0; i < xs.length; i++) for (var j = 0; j < ys.length; j++) { if (!xs[i] && !ys[j]) continue; var x = (tx + xs[i] + 256) % 256, y = ty + ys[j]; if (y < 0 || y > 255) continue; if (!tiles.has(x * 256 + y)) { stats.ahead++; want(x * 256 + y, x, y); } }
  }
  var wi = 2147483647, wj = 0, wa = 0, wb = 0, wc = 0, wd = 0, ox = 0, oy = 0;   // the wobble's last cell (a row of plants crosses one cell many times: its four corners are hashed once); (ox, oy): the plant's step, in pixels
  function step(gx, gy, a, b) {   // how far a plant at pixel (gx, gy) reads from its own spot: the slow wobble plus its own hashed feather (a, b: the plant's own lattice numbers)
    ox = 0; oy = 0;
    if (C.WARP) {
      var u = gx / C.WOB, v = gy / C.WOB, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
      if (i !== wi || j !== wj) { wi = i; wj = j; wa = hash(i, j, 7720); wb = hash(i + 1, j, 7720); wc = hash(i, j + 1, 7720); wd = hash(i + 1, j + 1, 7720); }
      fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv);
      var ax = wa & 65535, bx = wb & 65535, cx = wc & 65535, dx = wd & 65535, ay = wa >>> 16, by = wb >>> 16, cy = wc >>> 16, dy = wd >>> 16;
      ox = (((ax + (bx - ax) * fu) * (1 - fv) + (cx + (dx - cx) * fu) * fv) / 65535 - 0.5) * 2 * C.WARP;
      oy = (((ay + (by - ay) * fu) * (1 - fv) + (cy + (dy - cy) * fu) * fv) / 65535 - 0.5) * 2 * C.WARP;
    }
    if (C.FEATHER) { var h = hash(a, b, 772); ox += ((h & 1023) / 1023 - 0.5) * C.FEATHER; oy += (((h >>> 10) & 1023) / 1023 - 0.5) * C.FEATHER; }
  }
  /* THE SOFT EDGE. Between two wild classes: the pixel under the plant's moved spot (one thins into the other). Against a town, a bare class or the
     unknown, that word stands wherever it is read: under the moved spot, under the plant itself, or under the spot moved the OPPOSITE way. So a forest
     thins to nothing as it comes to a lake or a town (the mirror read: no wall on the pixel's line) and no forest tree ever stands on their pixels. */
  function read(X, Y, a, b) {
    var gx = X * SPAN, gy = Y * SPAN; step(gx, gy, a, b);
    var v = rawPx(gx + ox, gy + oy); if (OWN[v]) return v;
    var w = rawPx(gx, gy); if (OWN[w]) return w;
    w = rawPx(gx - ox, gy - oy); if (OWN[w]) return w;
    return v;
  }
  /* the trees' question (world-vegetation.js's selection, at a point its masks call NONE): the vegetation's class number, or 0 = unknown, as before.
     With it: api.k (the share of the class's density), api.leaf, api.h (the height factor), api.last (the IGBP class, for kept()).
     A bare class answers with the vegetation's blocked class: nothing is planted and the photo's colour is not asked (known bare is not "no data"). */
  function tree(X, Y, a, b) {
    if (!live()) return 0; var v = read(X, Y, a, b), r = T[v]; stats.trees[v]++; if (!r) return 0;
    api.k = r.k; api.leaf = r.leaf; api.h = r.h; api.last = v; return r.c;
  }
  function grass(X, Y, a, b) {   // the grass's question (a blade's candidate): the vegetation's class number for the grass, or 0; with it api.gk
    if (!live()) return 0; var v = read(X, Y, a, b), r = T[v]; stats.grass[v]++; if (!r) return 0;
    api.gk = r.gk; return r.g;
  }
  function kind(k, leaf, u, lat) {   // the species the vegetation chose by latitude, turned to the map's leaf: needles (pine, fir) or broad leaves (oak, birch); a snag and the krummholz stay
    var w = (u * 13) % 1, al = Math.abs(lat);
    if (leaf === NEEDLE) return (k === KI.oak || k === KI.birch) ? (w < (al < 35 ? 0 : 0.55) ? KI.fir : KI.pine) : k;   // no firs in the warm pine woods
    if (leaf === BROAD) return (k === KI.pine || k === KI.fir) ? (w < (al > 45 ? 0.25 : 0.7) ? KI.oak : KI.birch) : k;   // the northern broadleaf woods are mostly birch
    return k;
  }
  function kept(v) { stats.kept[v]++; }
  function rawAt(X, Y) { return rawPx(X * SPAN, Y * SPAN); }   // the bench's read: the map's own pixel, no softening (0 while the tile is on the way)
  function count(a) { var o = {}; for (var i = 0; i < CLASSES; i++) if (a[i]) o[NAMES[i]] = a[i]; return o; }
  function peek() {
    var keys = []; tiles.forEach(function (t) { keys.push(C.Z + '/' + Math.floor(t.key / 256) + '/' + (t.key % 256)); });
    return { on: live(), enabled: enabled(), date: C.DATE, tiles: keys, pending: pend.size, inflight: inflight, asked: stats.asked, ahead: stats.ahead, loaded: stats.loaded, errors: stats.errors, timeouts: stats.timeouts, evicted: stats.evicted, unknown: stats.unknown, near: stats.near,
      decodeMsMax: +stats.decodeMsMax.toFixed(2), lastError: stats.lastError, trees: count(stats.trees), grass: count(stats.grass), kept: count(stats.kept) };
  }
  function reset() { stats.trees = zeros(); stats.grass = zeros(); stats.kept = zeros(); }   // the bench's: the counters only
  api = { C: C, CREDIT: CREDIT, LEGEND: LEGEND, NAMES: NAMES, RULES: RULES, stats: stats, k: 1, leaf: 0, h: 1, gk: 1, last: 0,
    tree: tree, grass: grass, kind: kind, kept: kept, rawAt: rawAt, classOfColour: classOfColour, onArrive: function (cb) { listeners.push(cb); }, enabled: enabled, live: live, urlOf: urlOf, peek: peek, reset: reset, version: 2 };
  return api;
})();
