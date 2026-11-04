/* world-imagery.js - THE WHOLE EARTH IN REAL COLOUR (unit w-imagery; Trunks, Nov 4 2026). Marth, verbatim: "Use those 27 agents and BUild me the
   PLAYABLE FLYABLE WORLD"; "prioritize accurate and vaast and submersive world building"; "i want this game to be ground breaking. real and submersive".
   What it is: the real colour of the whole Earth from above, for the travel zone (world712-travel.js), by two doors:
     1. imageTile(z, x, y) -> Promise<ImageBitmap|null>: the photo tile with the SAME z/x/y as a terrain tile (Web Mercator, GoogleMapsCompatible), for
        723e's photo layer (world712-photo.js's atlas) to call; null past MAXZ or when the network fails. The caller owns the bitmap (close it).
     2. THE DRAPE (on by default; ?imagery=0 or localStorage wfr.imagery = '0' turns it off; 723e may set WFR_IMAGERY.C.DRAPE = false): a LAYER of the
        streamer (its onTile / onDrop hooks) that paints each terrain tile's VERTEX COLOURS from the photo. No shader is touched, no material made, no
        texture uploaded, no fog changed: zero new programs (the far material already draws vertex colours). Where 723e's atlas photo is drawn it wins
        in its own shader; everywhere else the Earth wears its real colours. A tile deeper than z8 takes its z8 ancestor's window (the streamer's own trick).
   The source (licence read at the source, Nov 4 2026; the ledger face/sources-ledger.json, "NASA GIBS", USE WITH CONDITIONS):
     NASA GIBS layer BlueMarble_NextGeneration, "Blue Marble (August 2004)", "MODIS / NASA Earth Observatory" (GIBS layer metadata), cloud-free, z0-8,
     ~600 m a pixel at z8. NASA Earthdata Data Use Guidance: "Unless the content is marked with a use restriction or license, data provided from a
     NASA-led mission are licensed as Creative Commons Zero (CC0)." Conditions kept: the credit on screen; no NASA logo; no implied endorsement.
     The server sends Access-Control-Allow-Origin: *; her app's offline worker keeps each tile the first time it loads.
     EOX cloudless is NOT used: its own page says "EOxCloudless WM(T)S layers are free to use for non-commercial purposes" (the 2016 data's CC BY does
     not make their SERVICE free for a paid game).
   Why vertex colours (MBAEEMP): over the open world the streamer's tiles stop at z8 (z5 real + 3 virtual), 33 x 33 vertices a tile; z8 Blue Marble is
   the finest the grid can show, so a texture would cost an atlas and a shader for nothing the eye can see from 20 km. 723e's atlas is the door for more.
   Every number DRAFT. */
window.WFR_IMAGERY = (function () {
  'use strict';
  var C = { MAXZ: 8, PIN: 2, KEEP: 40, LOADS: 4, PX: 256, SEA: 0.5, GAIN: 1.0, RETRY: 20000, DRAPE: true,
    URL: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg' };   // WMTS RESTful: {TileMatrix}/{TileRow}/{TileCol} = z/y/x
  var CREDIT = 'Earth imagery: Blue Marble, NASA Earth Observatory (MODIS). We acknowledge the use of imagery provided by services from NASA\'s Global Imagery Browse Services (GIBS), part of NASA\'s Earth Science Data and Information System (ESDIS).';
  var stats = { asked: 0, loaded: 0, errors: 0, painted: 0, repainted: 0, cached: 0, cacheBytes: 0, cacheMax: 0, pinned: 0, inflight: 0, paintMsMax: 0, lastError: null };
  var cache = new Map(), pend = new Set(), failed = new Map(), q = [], inflight = 0, lives = [], main = null, canvas = null, ctx = null;
  function keyOf(z, x, y) { return z + '/' + x + '/' + y; }
  function urlOf(z, x, y) { return C.URL.replace('{z}', z).replace('{y}', y).replace('{x}', x); }
  function enabled() { try { if (/[?&]imagery=0\b/.test(location.search)) return false; if (window.localStorage && localStorage.getItem('wfr.imagery') === '0') return false; } catch (e) {} return C.DRAPE; }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  function fetchBlob(z, x, y) { return fetch(urlOf(z, x, y), { mode: 'cors' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }); }
  function bitmapOf(blob) {   // the file's own bytes (no colour management), as the streamer and 723e decode
    if (window.createImageBitmap) return createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    return new Promise(function (res, rej) { var u = URL.createObjectURL(blob), im = new Image(); im.onload = function () { URL.revokeObjectURL(u); res(im); }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('image')); }; im.src = u; });
  }
  /* DOOR 1, for 723e's atlas: the photo tile itself */
  function imageTile(z, x, y) {
    if (!(z >= 0 && z <= C.MAXZ) || x < 0 || y < 0 || x >= (1 << z) || y >= (1 << z)) return Promise.resolve(null);
    return fetchBlob(z, x, y).then(bitmapOf).catch(function (e) { stats.errors++; stats.lastError = keyOf(z, x, y) + ': ' + (e && e.message || e); return null; });
  }
  /* the pixels the drape samples: RGB bytes, 256 x 256, in an LRU (z <= PIN kept for good: the whole Earth's coarse colour is always at hand) */
  function rgbOf(img) {
    var P = C.PX; if (!canvas) { canvas = document.createElement('canvas'); canvas.width = P; canvas.height = P; ctx = canvas.getContext('2d', { willReadFrequently: true }); }
    ctx.clearRect(0, 0, P, P); ctx.drawImage(img, 0, 0, P, P); if (img.close) img.close();
    var d = ctx.getImageData(0, 0, P, P).data, out = new Uint8Array(P * P * 3); for (var i = 0, j = 0; i < d.length; i += 4, j += 3) { out[j] = d[i]; out[j + 1] = d[i + 1]; out[j + 2] = d[i + 2]; }
    return out;
  }
  function put(k, z, px) { cache.set(k, { z: z, px: px }); if (z <= C.PIN) stats.pinned++; stats.cached = cache.size; stats.cacheBytes += px.length;
    var g = cache.size; while (cache.size - stats.pinned > C.KEEP && g-- > 0) { for (var kk of cache.keys()) { var e = cache.get(kk); if (e.z > C.PIN) { cache.delete(kk); stats.cacheBytes -= e.px.length; break; } } }
    stats.cached = cache.size; if (stats.cacheBytes > stats.cacheMax) stats.cacheMax = stats.cacheBytes; }
  function hit(k) { var e = cache.get(k); if (e && e.z > C.PIN) { cache.delete(k); cache.set(k, e); } return e || null; }   // touched: most recent at the end
  function want(z, x, y) {
    var k = keyOf(z, x, y); if (cache.has(k) || pend.has(k)) return; var f = failed.get(k); if (f && now() - f < C.RETRY) return;
    pend.add(k); q.push({ k: k, z: z, x: x, y: y }); pump();
  }
  function pump() {
    while (inflight < C.LOADS && q.length) {
      var it = q.pop(); inflight++; stats.inflight = inflight; stats.asked++;   // the newest ask first: the tile just built near her
      (function (it) {
        fetchBlob(it.z, it.x, it.y).then(bitmapOf).then(function (img) { stats.loaded++; put(it.k, it.z, rgbOf(img)); failed.delete(it.k); arrived(it); })
          .catch(function (e) { stats.errors++; stats.lastError = it.k + ': ' + (e && e.message || e); failed.set(it.k, now()); })
          .then(function () { pend.delete(it.k); inflight--; stats.inflight = inflight; pump(); });
      })(it);
    }
  }

  /* THE DRAPE */
  function targetOf(rec) { var z = Math.min(rec.z, C.MAXZ), dz = rec.z - z; return { z: z, x: rec.x >> dz, y: rec.y >> dz }; }
  function bestOf(rec) {   // the finest cached photo over this tile: the target, else its nearest cached ancestor; with the window of it the tile covers
    var t = targetOf(rec); for (var z = t.z; z >= 0; z--) { var dz = rec.z - z, x = rec.x >> dz, y = rec.y >> dz, e = hit(keyOf(z, x, y));
      if (e) { var n = Math.pow(2, dz); return { e: e, z: z, s: 1 / n, u0: (rec.x - x * n) / n, v0: (rec.y - y * n) / n }; } }
    return null;
  }
  function sample(px, u, v, out) {   // bilinear over pixel centres, clamped (the streamer's sampleField, on three channels)
    var P = C.PX, fx = Math.min(P - 1, Math.max(0, u * P - 0.5)), fy = Math.min(P - 1, Math.max(0, v * P - 0.5)), x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(P - 1, x0 + 1), y1 = Math.min(P - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
    for (var c = 0; c < 3; c++) { var a = px[(y0 * P + x0) * 3 + c], b = px[(y0 * P + x1) * 3 + c], d = px[(y1 * P + x0) * 3 + c], e = px[(y1 * P + x1) * 3 + c]; out[c] = ((a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty) / 255; }
    return out;
  }
  var rgb = [0, 0, 0];
  function paint(rec, src) {   // the sheet's vertices from the photo (land: the photo; sea: half the photo, half the atlas's depth blue), the skirt at 0.8 of its edge
    var t0 = now(), g = rec.mesh.geometry, col = g.getAttribute('color'), arr = col.array, im = rec.im712, N = Math.round(Math.sqrt(rec.hv.length)) - 1, V = (N + 1) * (N + 1), hv = rec.hv, base = im.base;
    for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) { var q2 = j * (N + 1) + i, k = q2 * 3; sample(src.e.px, src.u0 + i / N * src.s, src.v0 + j / N * src.s, rgb);
      if (hv[q2] > 0) { arr[k] = Math.min(1, rgb[0] * C.GAIN); arr[k + 1] = Math.min(1, rgb[1] * C.GAIN); arr[k + 2] = Math.min(1, rgb[2] * C.GAIN); }
      else { arr[k] = base[k] + (rgb[0] - base[k]) * C.SEA; arr[k + 1] = base[k + 1] + (rgb[1] - base[k + 1]) * C.SEA; arr[k + 2] = base[k + 2] + (rgb[2] - base[k + 2]) * C.SEA; } }
    var vs = V;   // the skirt, in the streamer's order: north (j 0), south (j N), west (i 0), east (i N)
    for (var e = 0; e < 4; e++) for (var gg = 0; gg <= N; gg++) { var ii = e === 0 || e === 1 ? gg : (e === 2 ? 0 : N), jj = e === 0 ? 0 : e === 1 ? N : gg, qq = (jj * (N + 1) + ii) * 3, kk = vs * 3;
      if (kk + 2 < arr.length) { arr[kk] = arr[qq] * 0.8; arr[kk + 1] = arr[qq + 1] * 0.8; arr[kk + 2] = arr[qq + 2] * 0.8; } vs++; }
    col.needsUpdate = true; if (im.z >= 0) stats.repainted++; else stats.painted++; im.z = src.z; im.key = keyOf(src.z, rec.x >> (rec.z - src.z), rec.y >> (rec.z - src.z));
    var ms = now() - t0; if (ms > stats.paintMsMax) stats.paintMsMax = ms;
  }
  function arrived(it) {   // a photo came: every live tile it betters is repainted (its own target, or a finer ancestor than it wears)
    lives.forEach(function (live) { live.forEach(function (rec) { var im = rec.im712; if (!im || im.dead || !rec.mesh || it.z <= im.z || it.z > rec.z) return; var dz = rec.z - it.z; if ((rec.x >> dz) !== it.x || (rec.y >> dz) !== it.y) return;
      var src = bestOf(rec); if (src && src.z > im.z) paint(rec, src); }); });
  }
  function makeLayer() {   // one list of live tiles per layer (a second streamer, e.g. the bench's, never mixes with the game's: the same z/x/y keys)
    var live = new Map(); lives.push(live);
    return { id: 'imagery', live: live,
      onTile: function (rec) { if (!rec.mesh || !rec.hv || !enabled()) return; var col = rec.mesh.geometry.getAttribute('color'); if (!col) return;
        rec.im712 = { base: new Float32Array(col.array), z: -1, key: null, dead: false }; live.set(rec.key, rec);
        var src = bestOf(rec); if (src) paint(rec, src); var t = targetOf(rec); if (!src || src.z < t.z) want(t.z, t.x, t.y); },
      onDrop: function (rec) { if (rec.im712) rec.im712.dead = true; if (live.get(rec.key) === rec) live.delete(rec.key); },
      close: function () { live.clear(); var i = lives.indexOf(live); if (i >= 0) lives.splice(i, 1); } };
  }
  function prefetch() { for (var z = 0; z <= C.PIN; z++) { var n = 1 << z; for (var x = 0; x < n; x++) for (var y = 0; y < n; y++) want(z, x, y); } }

  /* the credit, on screen without a click while a painted tile is drawn; it sits above the other place credits (Dunn's, 723e) when they show */
  var el = null, T0 = null, timer = 0;
  function shown() { var on = false; if (main) main.live.forEach(function (r) { if (!on && r.im712 && r.im712.z >= 0 && r.mesh && r.mesh.visible) on = true; }); return on; }
  function credit() {
    var v = !!(T0 && T0.on) && shown();
    if (!el && v) { el = document.createElement('div'); el.id = 'creditImagery'; el.setAttribute('role', 'note'); el.textContent = CREDIT;
      el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 3px);z-index:7;box-sizing:border-box;width:max-content;max-width:min(96vw,560px);white-space:normal;padding:2px 8px;border-radius:7px;background:rgba(18,30,26,.45);color:#fffef6;font:600 9px/1.3 system-ui,-apple-system,sans-serif;text-align:center;text-shadow:0 1px 1px rgba(0,0,0,.45);pointer-events:none';
      el.hidden = true; document.body.appendChild(el); }
    if (!el) return v;
    if (v) { var up = 3; ['credit712d', 'credit723e'].forEach(function (id) { var o = document.getElementById(id); if (o && !o.hidden) up += o.getBoundingClientRect().height + 3; });
      var b = 'calc(env(safe-area-inset-bottom,0px) + ' + Math.round(up) + 'px)'; if (el.style.bottom !== b) el.style.bottom = b; }
    if (el.hidden === v) el.hidden = !v; return v;
  }
  /* the page's one call (tools/wiring/wire-w-imagery.js): the layer into the travel zone's layer list, the coarse Earth fetched, the credit watched */
  function hook(T) {
    if (!T || !T.layers || T.layers.some(function (l) { return l && l.id === 'imagery'; })) return false;
    T0 = T; main = makeLayer(); T.layers.push(main); if (enabled() && location.protocol !== 'file:') { var started = false;
      timer = setInterval(function () { if (!started && T.st) { started = true; prefetch(); } credit(); }, 500); }   // after the streamer exists (never a fetch at the title screen); 2 a second: the credit only
    return true;
  }
  return { C: C, CREDIT: CREDIT, stats: stats, imageTile: imageTile, makeLayer: makeLayer, hook: hook, prefetch: prefetch, urlOf: urlOf, credit: credit, enabled: enabled,
    travel: function () { return T0; },   // the bench's door to the travel zone object hook() was given (the game keeps TRAVEL712 in its own scope)
    of: function (key, layer) { var r = (layer || main || { live: new Map() }).live.get(key); return r && r.im712 ? { z: r.im712.z, key: r.im712.key } : null; }, cacheKeys: function () { return Array.from(cache.keys()); }, version: 1 };
})();
