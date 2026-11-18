/* world-features.js - THE REAL STREETS (Marth, Nov 4 2026: "Use those 27 agents and BUild me the PLAYABLE FLYABLE WORLD"; "prioritize accurate and vaast
   and submersive world building"). Trunks, Nov 4 2026. Every number DRAFT (unmeasured on her phone).
   What it draws, as she flies the travel zone (world712-travel.js): the real world's buildings standing on their footprints at their mapped heights,
   the roads as ribbons on the ground, lakes and rivers as water, and a few place names. The data: OpenFreeMap's vector tiles (OpenMapTiles schema,
   OpenStreetMap data), read at their own pages Nov 4 2026: openfreemap.org "Is commercial usage allowed? Yes."; "no limits on the number of map views or
   requests"; credit "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"; the OpenMapTiles design licence CC-BY 4.0 ("need to visibly credit
   'OpenMapTiles.org' or reference 'OpenMapTiles' with a link"); both servers send Access-Control-Allow-Origin: *. ODbL: what she sees is a Produced Work.
   Reused, not rewritten (MBAEEMP): the travel material (WFR_TRAVEL712.makeMaterial: the shrink toward the eye, the curve, the true-distance haze; the
   roads and the water wear ITS program, no new one), the travel streamer's ground (api.H: the sheet she sees), THREE.ShapeUtils (three.js's own earcut,
   MIT) for roofs and lakes, the CC0 Poly Haven plaster and clay-tile photos already in tex-photos.js. Written new (nothing usable was on the shelf, and
   the house loads no modules): the Protocol Buffer reader and the Mapbox Vector Tile decoder (the open MVT 2.1 spec), about 80 lines.
   Every place goes through WFR_WORLD (toLocal / toLatLon of the travel frame), so the Gleason flip moves it with the ground.
   The page's glue is three lines (tools/wiring/wire-features.js): the script tag, attach() where the travel material is made, update() before the
   travel frame's render. */
window.WFR_FEATURES = (function () {
  'use strict';
  var W = window.WFR_WORLD, R2D = 180 / Math.PI;
  var C = {
    TILEJSON: 'https://tiles.openfreemap.org/planet',   // read once at the start: the tiles' dated path is never hard-coded (PLAN_712_S5)
    /* three rings of tiles round her: z14 (buildings and every road) near and low, z12 (the main roads, water, towns) mid, z9 (motorways, big water, cities) far */
    RINGS: [{ z: 14, r: 2600, show: 3200, agl: 2600 }, { z: 12, r: 15000, show: 18000, agl: 16000 }, { z: 9, r: 120000, show: 150000, agl: 1e9 }],
    LOADS: 4, KEPT: 56, SLICE_MS: 4, TRI_MAX: 1500000, LABELS: 8, LABELS820: 4, AREA_MIN: 20, H_DEF: 6, H_MAX: 900, SINK: 1.5, WAIT_MS: 2500, LAYER: 7,
    LIFT: { 14: 0.3, 12: 1.0, 9: 4.0 }, SUB: { 14: 20, 12: 50, 9: 250 }, DRAPE_MS: 0.4,   /* 798: SUB was 30, 120, 800: a straight cut that long bridged the valleys and cut through the ridges of the ground she sees */ WIDEN: { 14: 1, 12: 1.5, 9: 4 },
    CREDIT: 'OpenFreeMap · © OpenMapTiles (openmaptiles.org) · © OpenStreetMap contributors (openstreetmap.org/copyright)'
  };
  /* what each ring reads (the OpenMapTiles layers by name) */
  var ROADS = { 14: { motorway: 1, trunk: 1, primary: 1, secondary: 1, tertiary: 1, minor: 1, service: 1, track: 1, path: 1, rail: 1, raceway: 1, busway: 1 }, 12: { motorway: 1, trunk: 1, primary: 1, secondary: 1, tertiary: 1, rail: 1 }, 9: { motorway: 1, trunk: 1 } };
  var ROAD_W = { motorway: 16, trunk: 13, primary: 11, secondary: 9, tertiary: 8, minor: 6, service: 4, track: 3, path: 2, rail: 3.5, raceway: 10, busway: 7 };
  var ROAD_C = { motorway: [0.80, 0.66, 0.40], trunk: [0.58, 0.56, 0.52], primary: [0.55, 0.54, 0.52], secondary: [0.50, 0.50, 0.49], tertiary: [0.50, 0.50, 0.49], minor: [0.45, 0.45, 0.46], service: [0.47, 0.47, 0.47], track: [0.62, 0.53, 0.40], path: [0.70, 0.62, 0.48], rail: [0.33, 0.30, 0.28], raceway: [0.40, 0.40, 0.42], busway: [0.50, 0.40, 0.40] };
  var WATER_SKIP = { ocean: 1, swimming_pool: 1 }, WATER_C = [0.24, 0.47, 0.62], WAY_W = { river: 18, canal: 10, stream: 3 };
  var PLACE_R = { city: 140000, town: 40000, village: 12000, suburb: 5000, quarter: 4000, neighbourhood: 3000, hamlet: 3000, island: 30000 }, PLACE_W = { city: 6, town: 4, island: 3, village: 2.5, suburb: 2, quarter: 1.6, neighbourhood: 1.4, hamlet: 1 };
  var WALLS = [[0.92, 0.88, 0.80], [0.86, 0.79, 0.68], [0.78, 0.60, 0.50], [0.88, 0.86, 0.84], [0.72, 0.73, 0.75], [0.95, 0.92, 0.85], [0.70, 0.52, 0.44]], GLASS = [[0.55, 0.62, 0.70], [0.62, 0.66, 0.70], [0.48, 0.56, 0.64], [0.66, 0.68, 0.66]];

  /* ---------- the Protocol Buffer reader and the vector tile decoder (MVT 2.1: Tile.layers = 3; Layer name 1, features 2, keys 3, values 4, extent 5;
     Feature id 1, tags 2, type 3, geometry 4; Value string 1, float 2, double 3, int64 4, uint64 5, sint64 6, bool 7) ---------- */
  var TD = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;
  function varint(s) { var b = s.b, v = 0, sh = 0, c; do { c = b[s.p++]; if (sh < 28) v |= (c & 0x7f) << sh; else v += (c & 0x7f) * Math.pow(2, sh); sh += 7; } while (c & 0x80); return v; }
  function skip(s, wt) { if (wt === 0) varint(s); else if (wt === 1) s.p += 8; else if (wt === 2) { var n = varint(s); s.p += n; } else if (wt === 5) s.p += 4; else throw new Error('mvt: wire type ' + wt); }
  function str(b, a, e) { if (TD) return TD.decode(b.subarray(a, e)); var o = ''; for (var i = a; i < e; i++) o += String.fromCharCode(b[i]); try { return decodeURIComponent(escape(o)); } catch (x) { return o; } }
  function decodeTile(u8, want) {   // the tile's layers by name: each { extent, keys, vals (lazy), feats: [start, end] pairs }; only the layers asked for are indexed
    var s = { b: u8, p: 0 }, out = {}, dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    while (s.p < u8.length) { var k = varint(s), f = k >> 3, wt = k & 7;
      if (f === 3 && wt === 2) { var n = varint(s), a = s.p, e = a + n; layer(u8, dv, a, e, want, out); s.p = e; } else skip(s, wt); }
    return out;
  }
  function layer(b, dv, a, e, want, out) {
    var s = { b: b, p: a }, name = null;
    while (s.p < e) { var k = varint(s), f = k >> 3, wt = k & 7; if (f === 1 && wt === 2) { var n = varint(s); name = str(b, s.p, s.p + n); s.p += n; } else skip(s, wt); }
    if (!name || (want && !want[name])) return;
    var L = { name: name, extent: 4096, keys: [], valAt: [], vals: [], feats: [], b: b, dv: dv }; s.p = a;
    while (s.p < e) { k = varint(s); f = k >> 3; wt = k & 7;
      if (f === 2 && wt === 2) { n = varint(s); L.feats.push(s.p, s.p + n); s.p += n; }
      else if (f === 3 && wt === 2) { n = varint(s); L.keys.push(str(b, s.p, s.p + n)); s.p += n; }
      else if (f === 4 && wt === 2) { n = varint(s); L.valAt.push(s.p, s.p + n); s.p += n; }
      else if (f === 5 && wt === 0) L.extent = varint(s);
      else skip(s, wt); }
    out[name] = L;
  }
  function value(L, i) {   // decoded on first use (a city's name layers carry thousands of values the game never reads)
    if (L.vals[i] !== undefined) return L.vals[i];
    var b = L.b, s = { b: b, p: L.valAt[2 * i] }, e = L.valAt[2 * i + 1], v = null;
    while (s.p < e) { var k = varint(s), f = k >> 3, wt = k & 7;
      if (f === 1 && wt === 2) { var n = varint(s); v = str(b, s.p, s.p + n); s.p += n; }
      else if (f === 2 && wt === 5) { v = L.dv.getFloat32(s.p, true); s.p += 4; }
      else if (f === 3 && wt === 1) { v = L.dv.getFloat64(s.p, true); s.p += 8; }
      else if ((f === 4 || f === 5) && wt === 0) v = varint(s);
      else if (f === 6 && wt === 0) { var z = varint(s); v = z % 2 ? -(z + 1) / 2 : z / 2; }
      else if (f === 7 && wt === 0) v = !!varint(s);
      else skip(s, wt); }
    L.vals[i] = v; return v;
  }
  var CMD = [];
  function feature(L, i) {   // { id, type (1 point, 2 line, 3 polygon), props, rings: [[x0, y0, x1, y1, ...], ...] in tile units, y down }
    var b = L.b, s = { b: b, p: L.feats[2 * i] }, e = L.feats[2 * i + 1], o = { id: 0, type: 0, props: {}, rings: [] }, gA = -1, gE = -1;
    while (s.p < e) { var k = varint(s), f = k >> 3, wt = k & 7;
      if (f === 1 && wt === 0) o.id = varint(s);
      else if (f === 2 && wt === 2) { var n = varint(s), te = s.p + n; while (s.p < te) { var ki = varint(s), vi = varint(s); o.props[L.keys[ki]] = value(L, vi); } }
      else if (f === 3 && wt === 0) o.type = varint(s);
      else if (f === 4 && wt === 2) { n = varint(s); gA = s.p; gE = s.p + n; s.p = gE; }
      else skip(s, wt); }
    if (gA >= 0) { s.p = gA; var x = 0, y = 0, cur = null;
      while (s.p < gE) { var ci = varint(s), id = ci & 7, cnt = ci >> 3;
        if (id === 1 || id === 2) for (var q = 0; q < cnt; q++) { var dx = varint(s), dy = varint(s); x += (dx >>> 1) ^ -(dx & 1); y += (dy >>> 1) ^ -(dy & 1); if (id === 1) { cur = []; o.rings.push(cur); } cur.push(x, y); }
        else if (id !== 7) break; } }
    return o;
  }
  function ringArea(r) { var a = 0, n = r.length; for (var i = 0; i < n; i += 2) { var j = (i + 2) % n; a += r[i] * r[j + 1] - r[j] * r[i + 1]; } return a / 2; }
  function polygons(rings) {   // MVT: an exterior ring's area has one sign (positive, y down), its holes the other; the first ring sets the sign
    var out = [], sgn = 0, cur = null;
    for (var i = 0; i < rings.length; i++) { var r = rings[i]; if (r.length < 6) continue; var a = ringArea(r); if (!a) continue; if (!sgn) sgn = a > 0 ? 1 : -1;
      if (a * sgn > 0) { cur = { outer: r, holes: [] }; out.push(cur); } else if (cur) cur.holes.push(r); }
    return out;
  }

  /* ---------- state ---------- */
  var THREE = null, scene = null, camera = null, T = null, group = null, mats = null, tex = {}, labelsEl = null, creditEl = null, pool = [];
  var tiles = new Map(), template = null, tjState = 'none', tjTries = 0, tjNext = 0, inflight = 0, fetchFn = null, frameNo = 0, F = null, listeners = [], droppers = [], warm = null, lakeLv = new Map(), lakeVotes = new Map();   // lakeLv: OSM id -> { z: the finest ground zoom its level was read on, h }
  var stats = { lakeReads: [], fetched: 0, bytes: 0, errors: 0, empty: 0, built: 0, evicted: 0, restale: 0, jobs: 0, sliceMax: 0, updMax: 0, upd: [], buildings: 0, roads: 0, waters: 0, tris: 0, visible: 0, kept: 0, inflight: 0, labels: 0, places: 0, fault: null, lastError: null, recentres: 0, tilejson: null, waits: 0, drape: { jobs: 0, verts: 0, furn: 0, msMax: 0 } };
  function now() { return (typeof performance !== 'undefined' ? performance : Date).now(); }
  function keyOf(z, x, y) { return z + '/' + x + '/' + y; }
  function llOf(z, x, y, px, py, E) { var n = Math.pow(2, z), X = (x + px / E) / n, Y = (y + py / E) / n; return { lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * Y))) * R2D, lon: X * 360 - 180 }; }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }

  /* ---------- the materials: roads and water wear the TRAVEL ground's own program (same key, its own polygon offset); walls and roofs share ONE
     new program (a photo map), compiled with the ground's at the first travel frame (the warm mesh) ---------- */
  function photo(name, fill, size) {
    var c = document.createElement('canvas'); c.width = c.height = size; var g = c.getContext('2d'); g.fillStyle = fill; g.fillRect(0, 0, size, size);
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    var P = window.WFR_PHOTOS, src = P && P.files && P.files[name];
    if (src) { var im = new Image(); im.onload = function () { g.drawImage(im, 0, 0, size, size); t.needsUpdate = true; tex[name] = 'photo'; }; im.onerror = function () { tex[name] = 'failed'; }; im.src = src; }
    return t;
  }
  function makeMats(u) {
    var TR = window.WFR_TRAVEL712, ground = TR.makeMaterial(THREE, u);   // 'travel712far': the very program the ground already compiled
    ground.polygonOffset = true; ground.polygonOffsetFactor = -2; ground.polygonOffsetUnits = -4;
    var wall = TR.makeMaterial(THREE, u, 'feat'); wall.map = photo('painted_plaster_wall_diff_1k.jpg', '#e6e1d6', 256);
    if (window.WFR_SURF732) WFR_SURF732.wall(wall);   // 732 step 2 (world-surfaces732.js): the walls wear the CC0 facade (windows, its occlusion baked in)
    var roof = TR.makeMaterial(THREE, u, 'feat'); roof.map = photo('clay_roof_tiles_02_diff_1k.jpg', '#b8654a', 256);
    var CY = window.WFR_CITY790, cm = null; try { cm = CY && CY.on() ? CY.materials(THREE, TR, u, { ground: ground, wall: wall, roof: roof }) : null; } catch (e) { cm = null; stats.lastError = 'city790: ' + (e && e.message || e); }   /* 790 A: the city look (world-city790.js) */
    return { ground: ground, wall: wall, roof: roof, city: cm ? cm.walls : null, road: cm ? cm.road : null };
  }
  function attach(three, sc, travel, cam) {   // once, at load, where the travel material is made (the page's TRAVEL712 and its uniforms)
    if (mats) return api;
    THREE = three; scene = sc; T = travel; camera = cam || null; mats = makeMats(T.u);
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
    warm = new THREE.Mesh(g, mats.wall); warm.name = 'features:warm'; warm.frustumCulled = false; warm.layers.set(C.LAYER); scene.add(warm);
    if (mats.city) { var w790 = new THREE.Mesh(g, mats.city); w790.name = 'features:warm790'; w790.frustumCulled = false; w790.layers.set(C.LAYER); scene.add(w790); }   /* 790 A: the city walls' program, compiled at the gate too */   // a point-sized triangle: the walls' program compiles with the ground's at the gate, never later
    group = new THREE.Group(); group.name = 'features'; group.matrixAutoUpdate = false;
    if (window.WFR_SACRED831) WFR_SACRED831.attach(THREE, T, group);   /* 831: the rooms she can fly into, made here at load inside this group (Standard only) */
    T.layers.push({ id: 'features', onTile: onTerrainTile, onDrop: null });
    return api;
  }
  function onTerrainTile(rec, st) {   // the streamer built a ground tile: our group rides in its group (excused from the island's home witness); a finer ground restales what stands on it
    if (group.parent !== st.group) st.group.add(group);
    if (!rec.b) return; var bx0 = rec.b.x0, bz0 = rec.b.z0, bs = rec.b.size;
    tiles.forEach(function (t) { if (t.state !== 'built' || !t.meshes.length || t.terrZ >= rec.z || !t.box) return; var b = t.box;
      if (b.x1 < bx0 || b.x0 > bx0 + bs || b.z1 < bz0 || b.z0 > bz0 + bs) return; t.stale = true; });
  }

  /* ---------- building one tile, a slice at a time ---------- */
  function Out() { this.p = []; this.n = []; this.c = []; this.uv = []; this.i = []; }
  Out.prototype.v = function (x, y, z, nx, ny, nz, r, g, b, u, v) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(r, g, b); if (this.uv) this.uv.push(u || 0, v || 0); return this.p.length / 3 - 1; };
  /* 798 THE DRAPE (Marth, Nov 13 2026: "The road is floating"): a line on the ground keeps, per vertex, how far over the ground it was laid (dl; NaN for
     what is not laid on the ground: a lake's level surface, a wall). The ground under a built tile changes as she flies (a finer sheet, a coarser one, a
     stand-in replaced by the real one): every frame each showing tile asks the streamer which sheets are drawn over it (drawnSig); when that changed,
     its lines are laid again on the ground she now sees, a few milliseconds a frame, nearest first. Was: sampled once, re-laid only when a FINER sheet
     came under the tile's centre, so roads kept the heights of a sheet no longer drawn (floating over valleys, buried in hills, out to 100 m far off). */
  function drp(o, k, lift) { var d = o.dl || (o.dl = []); while (d.length < k) d.push(NaN); d[k] = lift; }
  var poiWant = null;   /* 729: world-interiors.js asks for shops, cafes and offices near the quests */
  function want(z, t) { var w = { transportation: 1, water: 1, waterway: 1, place: z <= 12 ? 1 : 0, building: z >= 14 ? 1 : 0 }; if (listeners.length) { w.landcover = 1; w.landuse = 1; if (window.WFR_LANDCLASS && window.WFR_LANDCLASS.live && window.WFR_LANDCLASS.live()) w.aeroway = 1; } if (poiWant && z >= 14 && t && poiWant(t)) w.poi = 1; if (z >= 14 && window.WFR_SACRED830 && WFR_SACRED830.on()) { w.poi = 1; w.landcover = 1; }   /* 830: the houses of prayer, the drive-thrus and the golf courses (WFR_SACRED830, at the end of this file) */ return w; }
  function startJob(t) {
    var st = T.st, f = T.f, L = decodeTile(t.raw, want(t.z, t)), order = ['water', 'waterway', 'transportation', 'poi', 'building', 'place', 'landcover', 'landuse', 'aeroway']   /* 830: the points before the buildings (a mosque's or a church's own walls are known as they are built) */, lays = [];
    for (var i = 0; i < order.length; i++) if (L[order[i]]) lays.push(L[order[i]]);
    var a = W.toLocal(f, t.nw.lat, t.nw.lon), b = W.toLocal(f, t.se.lat, t.se.lon), cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, pr = st.probe(cx, cz);
    t.job = { lakeK: 0, f: f, ax: a.x, az: a.z, lays: lays, li: 0, fi: 0, wall: new Out(), roof: new Out(), gnd: new Out(), wallN: 0, nB: 0, nR: 0, nW: 0, places: [], feed: listeners.length ? { landcover: [], landuse: [], aeroway: [], water: [], buildings: [], roads: [], pois: [] } : null, terrZ: pr ? pr.zoom : -1 };
    t.job.gnd.uv = null; t.job.sig798 = null; t.job.terrA = { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) }; t.job.sig798 = sigOf(t.job.terrA); t.job.fp = t.z === 14 ? [] : null; stats.jobs++;
    if (t.z === 14 && mats.city && window.WFR_CITY790) { var J7 = t.job; J7.Out = Out; J7.tri = tri; J7.drp = drp; J7.Hf = function (lx, lz) { return H(J7, lx, lz); }; WFR_CITY790.begin(J7, t); }   /* 790 A */
    if (t.z === 14 && window.WFR_SACRED830) { t.job.Out830 = Out; WFR_SACRED830.begin(t.job, t, KIT830); }   /* 830 */
  }
  function stepJob(t, deadline) {   // true when done
    var J = t.job; if (J.f !== T.f) { startJob(t); J = t.job; }   // re-centred mid-build: start again in the new frame (rare: every 10 km)
    var cnt = 0;
    while (J.li < J.lays.length) { var L = J.lays[J.li], n = L.feats.length / 2;
      while (J.fi < n) { if (J.bq && !drainB(t, J, deadline)) return false; var ft = feature(L, J.fi++), e0 = now(); try { emit(t, J, L, ft); } catch (e) { stats.lastError = 'feature: ' + (e && e.message || e); } var em = now() - e0; if (em > ((stats.emitMax || (stats.emitMax = {}))[L.name] || 0)) { stats.emitMax[L.name] = +em.toFixed(1); if (L.name === 'building') stats.emitBig = [ft.rings.length, ft.rings.reduce(function (q, r) { return q + r.length / 2; }, 0), t.key]; }
        if ((++cnt & (J.city ? 1 : 7)) === 0 && now() > deadline) return false; }   /* 790: a dressed building weighs more: the clock asked every second one */
      if (J.bq && !drainB(t, J, deadline)) return false; J.li++; J.fi = 0; }
    if (J.city && !WFR_CITY790.stepRoads(J, deadline, H, now)) return false;   /* 790 A: the streets, after the buildings, a slice at a time */
    if (J.s830 && !WFR_SACRED830.step(t, J, KIT830, deadline)) return false;   /* 830: the mosques, the golf, the drive-thrus, a task at a time, before the meshes are made */
    finish(t); return true;
  }
  function drainB(t, J, deadline) { var q = J.bq; while (q.i < q.ps.length) { building(t, J, q.ps[q.i], q.P, q.id, q.E, q.i); q.i++; if ((q.i & 3) === 0 && now() > deadline) return false; } J.bq = null; return true; }   /* 790 */
  function locRing(t, J, r, E, ll) {   // tile units to the frame's metres, relative to the tile's north-west corner (and, for the listeners, lat/lon)
    var n = r.length / 2, out = new Array(r.length), z = t.z, x = t.x, y = t.y, f = J.f;
    for (var i = 0; i < n; i++) { var g = llOf(z, x, y, r[2 * i], r[2 * i + 1], E), p = W.toLocal(f, g.lat, g.lon); out[2 * i] = p.x - J.ax; out[2 * i + 1] = p.z - J.az; if (ll) { ll[2 * i] = g.lon; ll[2 * i + 1] = g.lat; } }
    return out;
  }
  function H(J, lx, lz) { return T.st.H(J.ax + lx, J.az + lz); }
  var KIT830 = { locRing: locRing, H: H, ribbon: function (J, pts, w, col, lift, sub) { return ribbon(J, pts, w, col, lift, sub); }, tri: tri, triangulate: function (r) { return triangulate(r); }, drp: drp,   /* 830: world-features' own tools, for WFR_SACRED830 */
    llOf: function (t, px, py, E) { return llOf(t.z, t.x, t.y, px, py, E); }, toLL: function (J, x, z) { return W.toLatLon(J.f, J.ax + x, J.az + z); }, fromLL: function (J, lat, lon) { var p = W.toLocal(J.f, lat, lon); return [p.x - J.ax, p.z - J.az]; } };
  function emit(t, J, L, ft) {
    var name = L.name, P = ft.props, E = L.extent;
    if (name === 'poi') { if (J.s830 && ft.type === 1 && ft.rings[0]) WFR_SACRED830.poi(J, P, ft.rings[0][0], ft.rings[0][1], E);   /* 830 */
      if (J.feed && J.feed.pois && ft.type === 1 && ft.rings[0] && /^(office|cafe|shop|clothing_store|grocery|bakery|ice_cream)$/.test(P['class'])) { var g729 = llOf(t.z, t.x, t.y, ft.rings[0][0], ft.rings[0][1], E); J.feed.pois.push({ id: ft.id, cls: P['class'], sub: P.subclass || null, name: P['name:en'] || P.name_en || P.name || null, lat: g729.lat, lon: g729.lon }); } return; }   /* 729 */
    if (name === 'building') { if (ft.type !== 3 || P.hide_3d) return; var ps = polygons(ft.rings); if (J.city) { J.bq = { ps: ps, P: P, id: ft.id, E: E, i: 0 }; return; } for (var i = 0; i < ps.length; i++) building(t, J, ps[i], P, ft.id, E); return; }   /* 790: one z14 feature can hold 9,000 buildings: the city drains it a slice at a time */
    if (name === 'transportation') { var cl = P['class']; if (cl === 'transit' && t.z === 14 && J.feed && ft.type === 2 && P.brunnel !== 'tunnel') { var fl790 = feedLine(t, ft.rings, E, 'transit', 3); fl790.sub = P.subclass || null; J.feed.roads.push(fl790); return; }   /* 790 B: the streetcar lines to the listeners (world-life790.js), not drawn */ if (!ROADS[t.z][cl] || ft.type !== 2 || P.brunnel === 'tunnel') return; for (i = 0; i < ft.rings.length; i++) { var lr = locRing(t, J, ft.rings[i], E); if (!(J.city && WFR_CITY790.road(J, cl, lr))) ribbon(J, lr, ROAD_W[cl] * C.WIDEN[t.z], ROAD_C[cl], C.LIFT[t.z], C.SUB[t.z]); } J.nR++; if (J.feed) J.feed.roads.push(feedLine(t, ft.rings, E, cl, ROAD_W[cl] * C.WIDEN[t.z])); return; }   /* veg (Nov 4): the listeners hear the roads too (no grass or tree on a road) */
    if (name === 'waterway') { var wc = P['class'], ww = WAY_W[wc]; if (!ww || ft.type !== 2 || (wc === 'stream' && t.z < 14) || P.brunnel === 'tunnel') return; for (i = 0; i < ft.rings.length; i++) ribbon(J, locRing(t, J, ft.rings[i], E), ww * C.WIDEN[t.z], WATER_C, C.LIFT[t.z] * 1.2, C.SUB[t.z]); if (J.feed) J.feed.roads.push(feedLine(t, ft.rings, E, 'water', ww * C.WIDEN[t.z])); return; }
    if (name === 'water') { if (ft.type !== 3) return; ps = polygons(ft.rings); if (J.s830) WFR_SACRED830.water(J, ps);   /* 830: the golf's stripes stop at the water */
      for (i = 0; i < ps.length; i++) { if (J.feed) J.feed.water.push(feedPoly(t, J, ps[i], E, P['class'])); if (!WATER_SKIP[P['class']]) { lake(t, J, ps[i], E, ft.id); J.nW++; } } return; }
    if (name === 'place') { var pc = P['class'], nm = P['name:en'] || P.name_en || P.name; if (!PLACE_R[pc] || !nm || ft.type !== 1 || !ft.rings[0]) return; if (t.z === 9 && !(pc === 'city' || pc === 'town' || pc === 'island')) return;
      var g = llOf(t.z, t.x, t.y, ft.rings[0][0], ft.rings[0][1], E); if (ft.rings[0][0] < 0 || ft.rings[0][0] >= E || ft.rings[0][1] < 0 || ft.rings[0][1] >= E) return; J.places.push({ name: String(nm), cls: pc, rank: P.rank || 9, lat: g.lat, lon: g.lon }); return; }
    if (name === 'aeroway') { if (J.feed && J.feed.aeroway) { if (ft.type === 3) { ps = polygons(ft.rings); for (i = 0; i < ps.length; i++) J.feed.aeroway.push(feedPoly(t, J, ps[i], E, P['class'])); } else if (ft.type === 2) J.feed.aeroway.push(feedLine(t, ft.rings, E, P['class'], P['class'] === 'runway' ? 60 : 25)); } return; }   // 772a: pavement for the listeners (areas as polygons; a centre line with a DRAFT width: runway 60 m, taxiway 25 m)
    if (name === 'landcover' && J.s830 && ft.type === 3 && /golf_course|^sand$|^grass$/.test(String(P.subclass || P['class'] || ''))) WFR_SACRED830.cover(J, P, polygons(ft.rings), E);   /* 830 */
    if ((name === 'landcover' || name === 'landuse') && J.feed && ft.type === 3) { ps = polygons(ft.rings); for (i = 0; i < ps.length; i++) J.feed[name].push(feedPoly(t, J, ps[i], E, P['class'], P.subclass)); }
  }
  function feedLine(t, rings, E, cls, w) { var out = []; for (var i = 0; i < rings.length; i++) { var r = rings[i], ll = new Float64Array(r.length); for (var k = 0; k < r.length; k += 2) { var g = llOf(t.z, t.x, t.y, r[k], r[k + 1], E); ll[k] = g.lon; ll[k + 1] = g.lat; } out.push(ll); } return { cls: cls, width: w, lines: out }; }   // a line for the listeners: [lon, lat] pairs and its drawn width (m)
  function feedPoly(t, J, poly, E, cls, sub) { var rs = [poly.outer].concat(poly.holes), out = []; for (var i = 0; i < rs.length; i++) { var ll = new Float64Array(rs[i].length); locRing(t, J, rs[i], E, ll); out.push(ll); } return { cls: cls || null, subclass: sub || null, rings: out }; }
  function tri(o, a, b, c) { var p = o.p, ux = p[3 * b] - p[3 * a], uz = p[3 * b + 2] - p[3 * a + 2], vx = p[3 * c] - p[3 * a], vz = p[3 * c + 2] - p[3 * a + 2]; if (uz * vx - ux * vz >= 0) o.i.push(a, b, c); else o.i.push(a, c, b); }   // always facing up
  function triangulate(rings) {   // three.js's earcut: the outer ring and its holes, as THREE.Vector2 lists; faces index the rings' points in order
    var V = THREE.Vector2, outer = [], holes = []; for (var i = 0; i < rings[0].length; i += 2) outer.push(new V(rings[0][i], rings[0][i + 1]));
    for (var h = 1; h < rings.length; h++) { var hh = []; for (i = 0; i < rings[h].length; i += 2) hh.push(new V(rings[h][i], rings[h][i + 1])); holes.push(hh); }
    return THREE.ShapeUtils.triangulateShape(outer, holes);
  }
  function building(t, J, poly, P, id, E, pi) {
    var outer = locRing(t, J, poly.outer, E), area = 0, n = outer.length / 2; for (var i = 0; i < n; i++) { var j = (i + 1) % n; area += outer[2 * i] * outer[2 * j + 1] - outer[2 * j] * outer[2 * i + 1]; }
    if (Math.abs(area / 2) < C.AREA_MIN) return;
    var rings = [outer]; for (i = 0; i < poly.holes.length; i++) rings.push(locRing(t, J, poly.holes[i], E));
    var gMin = 1e9, gMax = -1e9, gSum = 0; for (i = 0; i < n; i++) { var g = H(J, outer[2 * i], outer[2 * i + 1]); if (g < gMin) gMin = g; if (g > gMax) gMax = g; gSum += g; }
    var gC = gSum / n, h = Math.min(C.H_MAX, +P.render_height > 0 ? +P.render_height : C.H_DEF), mh = +P.render_min_height > 0 ? +P.render_min_height : 0;
    var bot = mh > 0 ? gC + mh : gMin - C.SINK, top = Math.max(gC + h, (mh > 0 ? bot : gMax) + 1.5);
    if (t.z === 14 && J.fp) { var fx0 = 1e9, fx1 = -1e9, fz0 = 1e9, fz1 = -1e9; for (i = 0; i < n; i++) { fx0 = Math.min(fx0, outer[2 * i]); fx1 = Math.max(fx1, outer[2 * i]); fz0 = Math.min(fz0, outer[2 * i + 1]); fz1 = Math.max(fz1, outer[2 * i + 1]); } var po = poly.outer, pn = po.length / 2, clip = new Uint8Array(pn); for (i = 0; i < pn; i++) { var j8 = (i + pn - 1) % pn, xa = po[2 * j8], ya = po[2 * j8 + 1], xb = po[2 * i], yb = po[2 * i + 1]; clip[i] = (xa <= 0 && xb <= 0) || (xa >= E && xb >= E) || (ya <= 0 && yb <= 0) || (ya >= E && yb >= E) ? 1 : 0; }   /* an edge the tile's own cut made (both ends on or past its border): not a wall; the next tile's piece carries the house on */
      J.fp.push({ r: outer, clip: clip, x0: fx0, x1: fx1, z0: fz0, z1: fz1, bot: bot, top: top, gC: gC, cx: (fx0 + fx1) / 2, cz: (fz0 + fz1) / 2 }); }   /* 808: its footprint, for her feet and the lens */
    var sc830 = J.s830 ? WFR_SACRED830.atB(J, outer) : null;   /* 830: a house of prayer's own walls in its stone, no windows; a landmark rebuilt by hand drops the map's boxes (its footprint stays for her feet) */
    if (sc830 === 'skip') { J.nB++; if (J.feed) J.feed.buildings.push({ h: h, minH: mh, id: id, rings: [poly.outer].concat(poly.holes).map(function (q) { var ll = new Float64Array(q.length); locRing(t, J, q, E, ll); return ll; }) }); return; }
    var rnd = hash((id | 0) ^ (Math.floor(gC * 7) | 0)), tall = h >= 60, col = tall ? GLASS[Math.floor(rnd * GLASS.length)] : WALLS[Math.floor(rnd * WALLS.length)], house = h <= 14 && Math.abs(area / 2) <= 600 && !mh;
    if (J.city) { WFR_CITY790.building(J, { rings: rings, area: area / 2, h: h, mh: mh, top: top, bot: bot, gC: gC, P: P, house: house, sacredCol: sc830 || null, id: pi ? (id | 0) ^ Math.imul(pi, 0x9E3779B1) : id, faces: triangulate(rings), tri: tri }, Out);   /* 790 A */
      J.nB++; if (J.feed) J.feed.buildings.push({ h: h, minH: mh, id: id, rings: [poly.outer].concat(poly.holes).map(function (q) { var ll = new Float64Array(q.length); locRing(t, J, q, E, ll); return ll; }) }); return; }
    var W2 = mh > 0 ? J.wallUp || (J.wallUp = new Out()) : J.wall;   // a part that starts in the air (render_min_height) keeps its walls apart from the ones standing on the ground
    for (var r = 0; r < rings.length; r++) { var R = rings[r], m = R.length / 2, A = 0; for (i = 0; i < m; i++) { j = (i + 1) % m; A += R[2 * i] * R[2 * j + 1] - R[2 * j] * R[2 * i + 1]; }
      var s = (r > 0 ? 1 : -1) * (A > 0 ? 1 : -1), run = 0;   // s > 0: the natural quad faces (-dz, dx); else it is turned (outer walls face out, a courtyard's face in)
      for (i = 0; i < m; i++) { j = (i + 1) % m; var ax = R[2 * i], az = R[2 * i + 1], bx = R[2 * j], bz = R[2 * j + 1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz); if (len < 0.05) continue;
        var nx = (s > 0 ? -dz : dz) / len, nz = (s > 0 ? dx : -dx) / len, u0 = run / 6, u1 = (run + len) / 6, vt = (top - bot) / 6; run += len;
        var k0 = W2.v(ax, bot, az, nx, 0, nz, col[0] * 0.78, col[1] * 0.78, col[2] * 0.78, u0, 0), k1 = W2.v(bx, bot, bz, nx, 0, nz, col[0] * 0.78, col[1] * 0.78, col[2] * 0.78, u1, 0);
        var k2 = W2.v(ax, top, az, nx, 0, nz, col[0], col[1], col[2], u0, vt), k3 = W2.v(bx, top, bz, nx, 0, nz, col[0], col[1], col[2], u1, vt);
        if (s > 0) W2.i.push(k0, k1, k3, k0, k3, k2); else W2.i.push(k0, k3, k1, k0, k2, k3); } }
    var faces = triangulate(rings), RO = house ? J.roof : J.roofFlat || (J.roofFlat = new Out()), base = RO.p.length / 3, rc = house ? [0.96 - rnd * 0.12, 0.90 - rnd * 0.15, 0.86 - rnd * 0.12] : [col[0] * 0.66, col[1] * 0.66, col[2] * 0.68];
    for (r = 0; r < rings.length; r++) for (i = 0; i < rings[r].length; i += 2) RO.v(rings[r][i], top, rings[r][i + 1], 0, 1, 0, rc[0], rc[1], rc[2], rings[r][i] / 10, rings[r][i + 1] / 10);
    for (i = 0; i < faces.length; i++) tri(RO, base + faces[i][0], base + faces[i][1], base + faces[i][2]);
    J.nB++; if (J.feed) J.feed.buildings.push({ h: h, minH: mh, id: id, rings: [poly.outer].concat(poly.holes).map(function (q) { var ll = new Float64Array(q.length); locRing(t, J, q, E, ll); return ll; }) });
  }
  function lake(t, J, poly, E, id) {   // a lake's surface is level: at its flat interior's height when the ground inside is flat (a lake), else at the lowest ground on its shore (a river on a slope never floats)
    var rings = [locRing(t, J, poly.outer, E)]; for (var i = 0; i < poly.holes.length; i++) rings.push(locRing(t, J, poly.holes[i], E));
    var R = rings[0], lo = 1e9; for (i = 0; i < R.length; i += 2) { var g = H(J, R[i], R[i + 1]); if (g < lo) lo = g; }
    var faces = triangulate(rings), V = [].concat.apply([], rings), hs = [], sz = [], step = Math.max(1, Math.floor(faces.length / 96));
    for (i = 0; i < faces.length; i += step) { var f = faces[i], q = T.st.probe(J.ax + (V[2 * f[0]] + V[2 * f[1]] + V[2 * f[2]]) / 3, J.az + (V[2 * f[0] + 1] + V[2 * f[1] + 1] + V[2 * f[2] + 1]) / 3);
      if (q) { hs.push(q.h); sz.push([q.real ? q.zoom : +String(q.srcKey).split('/')[0] || 0, q.h]); } }   // each sample's TRUE ground resolution: a virtual tile's is its source ancestor's
    hs.sort(function (a, b) { return a - b; }); var level = lo, flat = hs.length >= 3 && hs[Math.floor(hs.length * 0.9)] - hs[Math.floor(hs.length * 0.1)] < 3;
    if (flat) level = Math.max(lo, hs[hs.length >> 1]);   // Nov 4: Tahoe's shore samples dipped 1.4 m under its surface (the DEM at the water's edge); the interior is the lake
    /* one level a lake, wherever and whenever it is drawn (Nov 4, run 5: Tahoe's far pieces took the level of the coarse ground under them when built,
       35.7 m over and 21.7 m under the real surface). The level read off the FINEST ground yet (by the OSM id the tiles share) wins, and every piece
       drawn from a coarser read is rebuilt from its kept bytes. Run 6 (Marth: "Fix the lake first"): a piece is kilometres wide, so the COARSEST zoom
       under it stayed ~z10 and no read ever beat another; a read is now its FINEST tier: the samples on the highest ground zoom under the piece (widened a
       zoom at a time until 3+), flat within 3 m, their median */
    /* run 7 (measured): over far Tahoe the drawn ground is 1898 m nearly everywhere, but with dips (to 1875 m) and blurred-in mountains (1932 m), so no
       piece was ever flat within 3 m and each fell to its lowest shore sample. A lake's read is now the DOMINANT height: the 2 m window holding the most
       samples, when it holds 40%+ of them (and 3+), its median; z = the finest ground zoom among them */
    /* run 8 (measured): the interior read came out on 1 piece of 19 (the drawn ground inside is not flat enough); the SHORE is where the lake's height
       is (its lowest sample was 1898 on 15 of 19 pieces, and a tile's cut edge runs through the water itself). So the read is the shore ring's */
    var sr = [], sst = Math.max(1, Math.floor(R.length / 2 / 160)); for (i = 0; i < R.length; i += 2 * sst) { var qs = T.st.probe(J.ax + R[i], J.az + R[i + 1]); if (qs) sr.push([qs.real ? qs.zoom : +String(qs.srcKey).split('/')[0] || 0, qs.h]); }
    /* run 9 (measured): the shore's MOST crowded window still disagreed piece to piece (1898, 1902, 1914: banks rising from the water). A lake's surface
       is the LOWEST flat level its shore and water touch; the ground's artefact dips are lone samples. The read: the lowest 2 m window holding 3+ samples
       and 10%+ of them (shore and interior together), its median */
    sr = sr.concat(sz);
    var rd = null; if (sr.length >= 3) { var hh = sr.map(function (s) { return s[1]; }).sort(function (a, b) { return a - b; }), bi = -1, bn = 0, j = 0, need = Math.max(3, Math.ceil(0.1 * hh.length));
      for (i = 0; i < hh.length && bi < 0; i++) { j = i; while (j + 1 < hh.length && hh[j + 1] - hh[i] <= 2) j++; if (j - i + 1 >= need) { bi = i; bn = j - i + 1; } }
      if (bi >= 0) { var lo2 = hh[bi], hi2 = hh[bi + bn - 1], zc = 0; for (i = 0; i < sr.length; i++) if (sr[i][1] >= lo2 && sr[i][1] <= hi2) zc = Math.max(zc, sr[i][0]);
        rd = { z: zc, h: hh[bi + (bn >> 1)], n: bn }; } }
    if (rd && !(id != null && lakeLv.get(id))) level = rd.h;   // its own dominant height, until the lake's shared level is known
    if (id != null) { var best = lakeLv.get(id);
      if (stats.lakeReads.length < 40) stats.lakeReads.push([t.key, id, rd ? rd.z : null, rd ? +rd.h.toFixed(2) : null, rd ? rd.n : 0, sz.length, best ? best.z : null]);
      /* the lake's ONE level: every piece's read is a vote (by tile, so a rebuild replaces its own); the sample-weighted median of the votes on the finest
         ground zoom any vote stands on (one piece on blurred mountains or an artefact dip cannot carry it) */
      if (rd) { var vs = lakeVotes.get(id) || new Map(); vs.set(t.key + '#' + J.lakeK, rd); lakeVotes.set(id, vs); J.lakeK++;
        var zT = 0; vs.forEach(function (v) { zT = Math.max(zT, v.z); }); var top = []; vs.forEach(function (v) { if (v.z === zT) top.push(v); }); top.sort(function (a, b) { return a.h - b.h; });
        /* run 10 (measured): the weighted median sat on 1899.9 (pieces reading their banks, 1900-1909, outweighed the water's 1898). The lake is the
           LOWEST level well voted: the lowest 1 m window of votes holding 20%+ of the weight, its weighted median */
        var wT = 0, k2, k3; for (k2 = 0; k2 < top.length; k2++) wT += top[k2].n; var nbh = top[top.length >> 1].h;
        for (k2 = 0; k2 < top.length; k2++) { var wW = 0; for (k3 = k2; k3 < top.length && top[k3].h - top[k2].h <= 1; k3++) wW += top[k3].n;
          if (wW >= 0.2 * wT) { var wH = 0; for (var k4 = k2; k4 < k3; k4++) { wH += top[k4].n; if (wH * 2 >= wW) { nbh = top[k4].h; break; } } break; } }
        var nb = { z: zT, h: nbh, n: wT }; }
      if (rd && (!best || nb.z !== best.z || Math.abs(nb.h - best.h) > 0.5)) { best = nb; lakeLv.set(id, best); var hB = nb.h;
        tiles.forEach(function (o) { if (o !== t && o.lakes && o.raw && o.state === 'built' && o.lakes.some(function (L) { return L.id === id && Math.abs(L.lv - hB) > 0.5; })) { o.stale = true; stats.lakeRelevel = (stats.lakeRelevel || 0) + 1; } }); }
      if (best) level = best.h; (J.lakes || (J.lakes = [])).push({ id: id, z: best ? best.z : -1, lv: +level.toFixed(2), rd: rd ? [rd.z, +rd.h.toFixed(2), rd.n] : null, lo: +lo.toFixed(2), ns: sz.length }); }
    var y = Math.max(0, level) + Math.min(C.LIFT[t.z], 1) * 0.8, K = FINER[t.z] ? 1 << (FINER[t.z] - t.z) : 0;   // run 10: one lift for every zoom's lake (0.8 m; z9's 3.2 m alone broke the level); the ground material's polygon offset keeps it off the ground
    if (!K) { waterOut(J, rings, faces, y); return; }
    /* a coarse tile: the lake cut exactly on the finer tiles' lines (tile units), so each piece steps aside whole where a finer tile stands (cellSort) */
    var O = poly.outer, bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, cs = E / K; for (i = 0; i < O.length; i += 2) { bx0 = Math.min(bx0, O[i]); bx1 = Math.max(bx1, O[i]); by0 = Math.min(by0, O[i + 1]); by1 = Math.max(by1, O[i + 1]); }
    for (var cy = Math.max(0, Math.floor(by0 / cs)); cy <= Math.min(K - 1, Math.floor(by1 / cs)); cy++) for (var cx = Math.max(0, Math.floor(bx0 / cs)); cx <= Math.min(K - 1, Math.floor(bx1 / cs)); cx++) {
      var x0 = cx * cs, y0 = cy * cs, o = clipRect(O, x0, y0, x0 + cs, y0 + cs); if (o.length < 6) continue; var rr = [locRing(t, J, o, E)];
      for (i = 0; i < poly.holes.length; i++) { var hq = clipRect(poly.holes[i], x0, y0, x0 + cs, y0 + cs); if (hq.length >= 6) rr.push(locRing(t, J, hq, E)); }
      waterOut(J, rr, triangulate(rr), y); }
  }
  function waterOut(J, rings, faces, y) { var G = J.gnd, base = G.p.length / 3, r, i;
    for (r = 0; r < rings.length; r++) for (i = 0; i < rings[r].length; i += 2) G.v(rings[r][i], y, rings[r][i + 1], 0, 1, 0, WATER_C[0], WATER_C[1], WATER_C[2]);
    for (i = 0; i < faces.length; i++) tri(G, base + faces[i][0], base + faces[i][1], base + faces[i][2]); }
  function clipRect(r, x0, y0, x1, y1) {   // Sutherland-Hodgman: a ring (x, y pairs, tile units) cut to an axis-aligned square
    var p = r, e, i, n, q;
    function inR(e, x, y) { return e === 0 ? x >= x0 : e === 1 ? x <= x1 : e === 2 ? y >= y0 : y <= y1; }
    function cut(e, ax, ay, bx, by, q) { if (e < 2) { var X = e === 0 ? x0 : x1; q.push(X, ay + (X - ax) / (bx - ax) * (by - ay)); } else { var Y = e === 2 ? y0 : y1; q.push(ax + (Y - ay) / (by - ay) * (bx - ax), Y); } }
    for (e = 0; e < 4; e++) { q = []; n = p.length / 2; if (!n) break;
      for (i = 0; i < n; i++) { var j = (i + n - 1) % n, ax = p[2 * j], ay = p[2 * j + 1], bx = p[2 * i], by = p[2 * i + 1], ia = inR(e, ax, ay), ib = inR(e, bx, by);
        if (ib) { if (!ia) cut(e, ax, ay, bx, by, q); q.push(bx, by); } else if (ia) cut(e, ax, ay, bx, by, q); }
      p = q; }
    return p;
  }
  function ribbon(J, pts, w, col, lift, sub) {   // a line on the ground: cut every sub metres, each point's two edges sampled on the ground she sees
    var P = [pts[0], pts[1]]; for (var i = 2; i < pts.length; i += 2) { var x0 = pts[i - 2], z0 = pts[i - 1], x1 = pts[i], z1 = pts[i + 1], d = Math.hypot(x1 - x0, z1 - z0), k = Math.max(1, Math.ceil(d / sub)); for (var q = 1; q <= k; q++) P.push(x0 + (x1 - x0) * q / k, z0 + (z1 - z0) * q / k); }
    var n = P.length / 2; if (n < 2) return; var G = J.gnd, prev = -1, hw = w / 2;
    for (i = 0; i < n; i++) { var a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), tx = P[2 * b] - P[2 * a], tz = P[2 * b + 1] - P[2 * a + 1], tl = Math.hypot(tx, tz) || 1, px = -tz / tl * hw, pz = tx / tl * hw;
      var lx = P[2 * i] + px, lz = P[2 * i + 1] + pz, rx = P[2 * i] - px, rz = P[2 * i + 1] - pz, kl = G.v(lx, Math.max(0, H(J, lx, lz)) + lift, lz, 0, 1, 0, col[0], col[1], col[2]), kr = G.v(rx, Math.max(0, H(J, rx, rz)) + lift, rz, 0, 1, 0, col[0], col[1], col[2]);
      drp(G, kl, lift); drp(G, kr, lift); if (prev >= 0) { tri(G, prev, prev + 1, kl); tri(G, prev + 1, kr, kl); } prev = kl; }
  }
  function meshOf(o, mat, name, order) {
    if (!o || !o.i.length) return null; var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(o.c, 3));
    if (o.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2)); if (o.f && o.f.length) { g.setAttribute('aF790', new THREE.Float32BufferAttribute(o.f, 2)); g.setAttribute('aM790', new THREE.Float32BufferAttribute(o.m, 2)); } g.setIndex(o.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(o.i, 1) : new THREE.Uint16BufferAttribute(o.i, 1));
    var m = new THREE.Mesh(g, mat); if (o.dl && o.dl.length) { var nv = o.p.length / 3, dl = new Float32Array(nv), q; for (q = 0; q < nv; q++) dl[q] = q < o.dl.length ? o.dl[q] : NaN; m.userData.dl = dl; }   /* 798 */
    m.name = name; m.frustumCulled = false; m.matrixAutoUpdate = false; m.renderOrder = order; m.layers.set(C.LAYER); m.castShadow = m.receiveShadow = false; m.userData.tris = o.i.length / 3; return m;
  }
  function finish(t) {
    var J = t.job, f0 = now(); disposeMeshes(t); J.wallN = J.wall.p.length / 3;   // the walls that stand on the ground are the first wallN vertices of their mesh, four a wall (two feet, two tops): the guard reads the feet there
    var cells = cellSort(t, J);
    var ms = [meshOf(J.gnd, mats.ground, 'features:ground:' + t.key, -9.39), meshOf(mergeRoofs(J), J.wall.f ? mats.city : mats.wall, 'features:walls:' + t.key, -9.385), meshOf(J.roof, mats.roof, 'features:roofs:' + t.key, -9.385)];
    if (J.road && mats.road) ms.push(meshOf(J.road, mats.road, 'features:roads:' + t.key, -9.388)); if (window.WFR_CITY790) { WFR_CITY790.finishTile(t, J); WFR_CITY790.changed(); }   /* 790 A */
    var w = ms[1]; if (w) w.userData.wallN = J.wallN;
    if (cells && ms[0]) { ms[0].material = [mats.ground]; ms[0].userData.cells = cells; ms[0].geometry.addGroup(0, J.gnd.i.length, 0); ms[0].userData.sig = ''; }   // the same material object (the same program), drawn by groups: a coarse cell steps aside where a finer tile stands
    t.meshes = ms.filter(Boolean); t.f = J.f; t.ax = J.ax; t.az = J.az; t.terrZ = J.terrZ; t.places = J.places; t.box = J.terrA; t.gsig = J.sig798; t.drape = null; t.fp = J.fp && J.fp.length ? J.fp : null; t.fpg = null; t.nB = J.nB; t.nR = J.nR; t.nW = J.nW; t.lakes = J.lakes || null;
    t.tris = 0; for (var i = 0; i < t.meshes.length; i++) { var m = t.meshes[i]; m.position.set(J.ax, 0, J.az); m.updateMatrix(); m.visible = false; group.add(m); t.tris += m.userData.tris; }
    stats.finMax = Math.max(stats.finMax || 0, now() - f0);   /* 790: the one step a slice cannot cut (the meshes made at once) */
    t.job = null; t.state = 'built'; t.stale = false; stats.built++; stats.buildings += J.nB; stats.roads += J.nR; stats.waters += J.nW;
    var l0 = now(); if (J.feed) for (i = 0; i < listeners.length; i++) try { listeners[i](t.z, t.x, t.y, J.feed); } catch (e) { stats.lastError = 'listener: ' + (e && e.message || e); }
    stats.lisMax = Math.max(stats.lisMax || 0, now() - l0);
  }
  /* ---------- one zoom per place (Nov 4, after the guard's first run: the z9 and z12 lakes and roads lay OVER the z14 ones under her, the coarse
     shore spilling onto the land). A coarse tile's ground triangles are sorted by the finer ring's tile each one falls in (its centre, through the
     door: W.toLatLon + W.tileAt); every frame a cell whose finer tile is built and showing is left out of the draw. ---------- */
  var FINER = { 12: 14, 9: 12 };
  function cellSort(t, J) {
    var zf = FINER[t.z], G = J.gnd; if (!zf || !G.i.length) return null;
    var K = 1 << (zf - t.z), x0 = t.x * K, y0 = t.y * K, n = G.i.length / 3, cellOf = new Uint16Array(n), count = new Uint32Array(K * K), P = G.p, I = G.i, i, c;
    for (i = 0; i < n; i++) { var a = I[3 * i] * 3, b = I[3 * i + 1] * 3, d = I[3 * i + 2] * 3, ll = W.toLatLon(J.f, J.ax + (P[a] + P[b] + P[d]) / 3, J.az + (P[a + 2] + P[b + 2] + P[d + 2]) / 3), q = W.tileAt(Math.max(-85, Math.min(85, ll.lat)), ll.lon, zf);
      var cx = Math.max(0, Math.min(K - 1, q.x - x0)), cy = Math.max(0, Math.min(K - 1, q.y - y0)); c = cy * K + cx; cellOf[i] = c; count[c]++; }
    var start = new Uint32Array(K * K + 1); for (c = 0; c < K * K; c++) start[c + 1] = start[c] + count[c];
    var at = start.slice(0, K * K), out = new Array(I.length); for (i = 0; i < n; i++) { var o = at[cellOf[i]]++ * 3; out[o] = I[3 * i]; out[o + 1] = I[3 * i + 1]; out[o + 2] = I[3 * i + 2]; }
    G.i = out; return { zf: zf, K: K, x0: x0, y0: y0, start: start };   // cell c's triangles: start[c] .. start[c + 1]
  }
  function covered(z, x, y) { var f = tiles.get(keyOf(z, x, y)); return !!(f && f.used === frameNo && f.state === 'built' && f.d <= f.show && (!f.meshes.length || f.meshes[0].visible)); }
  function cover() {   // after the visibility pass: each showing coarse ground leaves out the cells a finer tile now draws
    tiles.forEach(function (t) { var m = t.meshes[0], C2 = m && m.userData.cells; if (!C2 || !m.visible) return;
      var sig = '', K = C2.K, c; for (c = 0; c < K * K; c++) sig += covered(C2.zf, C2.x0 + c % K, C2.y0 + (c / K | 0)) ? '1' : '0';
      if (sig === m.userData.sig) return; m.userData.sig = sig; var g = m.geometry, s = -1; g.clearGroups();
      for (c = 0; c <= K * K; c++) { var off = c === K * K || sig.charCodeAt(c) === 49; if (!off && s < 0) s = c; if (off && s >= 0) { var a = C2.start[s] * 3, b = C2.start[c] * 3; if (b > a) g.addGroup(a, b - a, 0); s = -1; } }
      stats.cellChanges = (stats.cellChanges || 0) + 1; });
  }
  function mergeRoofs(J) {   // the raised parts' walls and the flat roofs ride in the walls' mesh (one material, one draw), AFTER the standing walls (wallN)
    if (!J.wall.f) { var W2 = J.wall; if (J.wallUp) append(W2, J.wallUp); if (J.roofFlat) append(W2, J.roofFlat); return W2; }   // as it always was (Classic, and the city off)
    var parts = [J.wall, J.wallUp, J.roofFlat, J.wallX].filter(function (o) { return o && o.i.length; }); if (parts.length < 2) return J.wall;   /* 790 A: the gables, chimneys, parapets and rooftop boxes ride after the standing walls too */
    var nv = 0, ni = 0, f = !!J.wall.f; parts.forEach(function (o) { nv += o.p.length / 3; ni += o.i.length; });
    var M = { p: new Float32Array(nv * 3), n: new Float32Array(nv * 3), c: new Float32Array(nv * 3), uv: new Float32Array(nv * 2), f: f ? new Float32Array(nv * 2) : null, m: f ? new Float32Array(nv * 2) : null, i: nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni) }, v = 0, k = 0;
    parts.forEach(function (o) { var n = o.p.length / 3; M.p.set(o.p, v * 3); M.n.set(o.n, v * 3); M.c.set(o.c, v * 3); M.uv.set(o.uv, v * 2); if (f && o.f) { M.f.set(o.f, v * 2); M.m.set(o.m, v * 2); } for (var q = 0; q < o.i.length; q++) M.i[k++] = o.i[q] + v; v += n; });
    return M;
  }
  function append(W2, R) {
    if (!R.i.length) return; var base = W2.p.length / 3;
    for (var i = 0; i < R.p.length; i++) W2.p.push(R.p[i]); for (i = 0; i < R.n.length; i++) W2.n.push(R.n[i]); for (i = 0; i < R.c.length; i++) W2.c.push(R.c[i]); for (i = 0; i < R.uv.length; i++) W2.uv.push(R.uv[i]);
    if (W2.f && R.f) { for (i = 0; i < R.f.length; i++) W2.f.push(R.f[i]); for (i = 0; i < R.m.length; i++) W2.m.push(R.m[i]); }
    for (i = 0; i < R.i.length; i++) W2.i.push(R.i[i] + base);
  }
  function disposeMeshes(t) { if (!t.meshes) { t.meshes = []; return; } for (var i = 0; i < t.meshes.length; i++) { group.remove(t.meshes[i]); t.meshes[i].geometry.dispose(); } t.meshes = []; }   // geometries only: the shared materials are never disposed (a disposed material kills its shared program)
  function placeAll() { tiles.forEach(function (t) { if (t.state !== 'built' || !t.meshes.length) return; var a = W.toLocal(T.f, t.nw.lat, t.nw.lon), s0 = t.f, k = 1;
      if (s0 && s0.k && T.f.k) k = T.f.k / s0.k;   // the Mercator frame scales the ground by its k (the terrain's own mesh.scale); a frame without k only slides
      for (var i = 0; i < t.meshes.length; i++) { var m = t.meshes[i]; m.position.set(a.x, 0, a.z); m.scale.set(k, 1, k); m.updateMatrix(); }
      var b = W.toLocal(T.f, t.se.lat, t.se.lon); t.box = { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) }; }); }

  /* ---------- the stream ---------- */
  function readTileJSON() {
    if (tjState === 'ok' || tjState === 'loading' || now() < tjNext || tjTries >= 4) return;
    tjState = 'loading'; tjTries++;
    (fetchFn || fetch)(C.TILEJSON).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { var u = j && j.tiles && j.tiles[0]; if (!u || u.indexOf('{z}') < 0) throw new Error('no tile url'); template = u; tjState = 'ok'; stats.tilejson = u; })
      .catch(function (e) { tjState = 'none'; tjNext = now() + 20000; stats.errors++; stats.lastError = 'tilejson: ' + (e && e.message || e); });
  }
  function load(t) {
    t.state = 'fetch'; inflight++; stats.inflight = inflight;
    (fetchFn || fetch)(template.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y)).then(function (r) { if (r.status === 204 || r.status === 404) return null; if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(function (ab) { if (!tiles.has(t.key)) return; if (!ab || !ab.byteLength) { t.state = 'built'; t.meshes = []; t.places = []; stats.empty++; return; } t.raw = new Uint8Array(ab); stats.fetched++; stats.bytes += ab.byteLength; t.state = 'raw'; t.since = now(); })
      .catch(function (e) { t.state = 'missing'; t.retry = now() + 15000; stats.errors++; stats.lastError = t.key + ': ' + (e && e.message || e); })
      .then(function () { inflight--; stats.inflight = inflight; });
  }
  function boxDist(cam, a, b) { var x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z), dx = Math.max(x0 - cam.x, 0, cam.x - x1), dz = Math.max(z0 - cam.z, 0, cam.z - z1); return Math.hypot(dx, dz); }
  function wanted(cam, ll, agl) {
    var out = []; for (var ri = 0; ri < C.RINGS.length; ri++) { var R = C.RINGS[ri], z = R.z; if (agl > R.agl) continue;
      var n = Math.pow(2, z), tm = 2 * Math.PI * 6378137 / n * Math.max(0.05, Math.cos(ll.lat / R2D)), span = Math.ceil(R.r / tm) + 1, c = W.tileAt(Math.max(-85, Math.min(85, ll.lat)), ll.lon, z);
      for (var dy = -span; dy <= span; dy++) { var y = c.y + dy; if (y < 0 || y >= n) continue;
        for (var dx = -span; dx <= span; dx++) { var x = ((c.x + dx) % n + n) % n, nw = llOf(z, x, y, 0, 0, 1), se = llOf(z, x, y, 1, 1, 1), a = W.toLocal(T.f, nw.lat, nw.lon), b = W.toLocal(T.f, se.lat, se.lon), d = boxDist(cam, a, b);
          if (d <= R.r) out.push({ z: z, x: x, y: y, d: d, nw: nw, se: se, show: R.show }); } } }
    return out;
  }
  /* 808: a building stands where the ground was when its tile was built; the ground under it changed (finer OR coarser, anywhere in the tile: the
     re-lay above follows the streets, a house needs its tile built again): when the ground under its houses moved by more than 1.5 m the tile is
     rebuilt from its kept bytes (Bethel Town, Nov 14: a whole tile of houses 60 m under the street, their walls drawn by the next tile's sliver) */
  function restand808(t) { var F = t.fp, m = t.meshes[0]; if (!F || !m || !t.raw) return; var k = m.scale.x, st2 = T.st, step = Math.max(1, Math.floor(F.length / 24)), worst = 0;
    for (var i = 0; i < F.length; i += step) { var f = F[i]; if (f.gC == null) continue; var g = st2.H(m.position.x + f.cx * k, m.position.z + f.cz * k); var d = Math.abs(g - f.gC); if (d > worst) worst = d; }
    if (worst > 1.5) { t.stale = true; stats.restand808 = (stats.restand808 || 0) + 1; } }
  function sigOf(b) { var st = T && T.st; if (!st || !st.drawnSig || !b) return null; var g = (b.x1 - b.x0) * 0.03; return st.drawnSig(b.x0 - g, b.z0 - g, b.x1 + g, b.z1 + g); }   /* 798: the tile's box and the tiles' own buffer (its lines run a little past its edge) */
  function drapeStep(vis, deadline) {   /* 798: which showing tiles stand on changed ground; then lay their lines again, nearest first, until the deadline */
    var D = stats.drape, i, t; for (i = 0; i < vis.length; i++) { t = vis[i]; var sg = sigOf(t.box); if (sg == null || sg === t.gsig) continue;   /* a stale tile's old lines (they stand until its rebuild ends) are laid again too */
      if (!t.drape) { t.drape = { sig: sg, mi: 0, i: 0 }; if (t.fp && !t.stale && !t.job) restand808(t); } }   // a job under way runs on (each point reads the ground as it is when laid); a change since is laid again after it
    var H0 = T.st.H, t0 = now();
    for (i = 0; i < vis.length && now() < deadline; i++) { t = vis[i]; var dj = t.drape; if (!dj) continue;
      while (dj.mi < t.meshes.length) { var m = t.meshes[dj.mi], dl = m.userData.dl; if (!dl) { dj.mi++; dj.i = 0; continue; }
        var pa = m.geometry.attributes.position, P = pa.array, px = m.position.x, pz = m.position.z, k = m.scale.x, n = dl.length, q = dj.i;
        for (; q < n; q++) { var L = dl[q]; if (L !== L) continue; var ny = Math.max(0, H0(px + P[3 * q] * k, pz + P[3 * q + 2] * k)) + L; if (Math.abs(ny - P[3 * q + 1]) > 0.01) { P[3 * q + 1] = ny; dj.mv = 1; } D.verts++; if ((q & 255) === 255 && now() > deadline) { q++; break; } }
        dj.i = q; if (q < n) break; if (dj.mv) { pa.needsUpdate = true; m.geometry.boundingSphere = null; m.geometry.boundingBox = null; D.uploads = (D.uploads || 0) + 1; }   /* its bounds made again when asked (a ray onto a re-laid street) */ dj.mv = 0; dj.mi++; dj.i = 0; }   // sent to the card once a mesh is laid, and only when a point moved
      if (dj.mi < t.meshes.length) break;
      if (t.city && t.meshes[0]) { var A = t.city, m0 = t.meshes[0], fx = m0.position.x, fz = m0.position.z, fk = m0.scale.x, a = dj.fi || 0;   // the street's lamps, trees and benches stand on it too
        for (; a < A.length; a += 7) { var fy = Math.max(0, H0(fx + A[a + 1] * fk, fz + A[a + 3] * fk)); if (Math.abs(fy - A[a + 2]) > 0.05) { A[a + 2] = fy; dj.fm = 1; } D.furn++; if ((a & 1023) === 1022 && now() > deadline) { a += 7; break; } }
        dj.fi = a; if (a < A.length) break; if (dj.fm && window.WFR_CITY790) WFR_CITY790.changed(); }   // gathered again only when one moved
      t.gsig = dj.sig; t.drape = null; D.jobs++; }
    D.msMax = Math.max(D.msMax, now() - t0);
  }
  /* 798 HER FEET ON THE PAVEMENT (Marth, Nov 13 2026, verbatim: "You can also see in the vid clips how I'm walking through the pavement"): the streets,
     sidewalks and paths stand a few decimetres over the ground (their lift, so the ground never shows through them), and her walk read the ground under
     them. surface798(x, z): the top of what is laid on the ground at a point (a road, a sidewalk, a zebra, a path, a river's ribbon), from the z14 tiles'
     own triangles as they are drawn (draped), or null where none. Each mesh gets a coarse grid of its laid triangles the first time she walks on it. */
  var SG798 = 8;
  function grid798(m) {
    var g = m.geometry, I = g.index, P = g.attributes.position.array, dl = m.userData.dl, cells = new Map(), n = I.count;
    for (var t = 0; t < n; t += 3) { var a = I.getX(t), b = I.getX(t + 1), c = I.getX(t + 2); if (dl[a] !== dl[a] || dl[b] !== dl[b] || dl[c] !== dl[c]) continue;
      var x0 = Math.min(P[3 * a], P[3 * b], P[3 * c]), x1 = Math.max(P[3 * a], P[3 * b], P[3 * c]), z0 = Math.min(P[3 * a + 2], P[3 * b + 2], P[3 * c + 2]), z1 = Math.max(P[3 * a + 2], P[3 * b + 2], P[3 * c + 2]);
      for (var cz = Math.floor(z0 / SG798); cz <= Math.floor(z1 / SG798); cz++) for (var cx = Math.floor(x0 / SG798); cx <= Math.floor(x1 / SG798); cx++) { var k = cx + ',' + cz, L = cells.get(k); if (!L) cells.set(k, L = []); L.push(a, b, c); } }
    return cells;
  }
  function surface798(x, z) {
    var best = null; tiles.forEach(function (t) { if (t.z !== 14 || t.state !== 'built' || !t.box || x < t.box.x0 - 5 || x > t.box.x1 + 5 || z < t.box.z0 - 5 || z > t.box.z1 + 5) return;
      for (var i = 0; i < t.meshes.length; i++) { var m = t.meshes[i], dl = m.userData.dl; if (!dl || !m.visible) continue; if (!m.userData.sg798) m.userData.sg798 = grid798(m);
        var k = m.scale.x, lx = (x - m.position.x) / k, lz = (z - m.position.z) / k, L = m.userData.sg798.get(Math.floor(lx / SG798) + ',' + Math.floor(lz / SG798)); if (!L) continue; var P = m.geometry.attributes.position.array;
        for (var q = 0; q < L.length; q += 3) { var a = 3 * L[q], b = 3 * L[q + 1], c = 3 * L[q + 2], v0x = P[b] - P[a], v0z = P[b + 2] - P[a + 2], v1x = P[c] - P[a], v1z = P[c + 2] - P[a + 2], v2x = lx - P[a], v2z = lz - P[a + 2], den = v0x * v1z - v1x * v0z; if (Math.abs(den) < 1e-9) continue;
          var u = (v2x * v1z - v1x * v2z) / den, v = (v0x * v2z - v2x * v0z) / den; if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue; var y = P[a + 1] + (P[b + 1] - P[a + 1]) * u + (P[c + 1] - P[a + 1]) * v; if (best == null || y > best) best = y; } } });
    return best;
  }
  /* 808 STREET LEVEL IS SOLID (Marth's Nov 14 recording: she walks into a house and the camera ends inside its walls). Every z14 building keeps its
     footprint, foot and top. solid808(p, pad): a point inside a footprint (or within pad of its wall), between its foot and its top, is set back out on
     the wall's far side of pad, along the nearest wall (so she slides along it); returns true when it moved her. lensOut808(cam, her): a lens inside a
     building steps toward her until it is out. Never while she is inside a building's own room (world-interiors.js). */
  function fpGrid(t) { if (t.fpg) return t.fpg; var g = new Map(), F = t.fp; for (var i = 0; i < F.length; i++) { var f = F[i]; for (var cz = Math.floor(f.z0 / 16); cz <= Math.floor(f.z1 / 16); cz++) for (var cx = Math.floor(f.x0 / 16); cx <= Math.floor(f.x1 / 16); cx++) { var k = cx + ',' + cz, L = g.get(k); if (!L) g.set(k, L = []); L.push(f); } } return (t.fpg = g); }
  function inPoly(r, x, z) { var c = false, n = r.length / 2; for (var i = 0, j = n - 1; i < n; j = i++) { var xi = r[2 * i], zi = r[2 * i + 1], xj = r[2 * j], zj = r[2 * j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
  function nearEdge(r, x, z, clip) { var n = r.length / 2, best = null; for (var i = 0, j = n - 1; i < n; j = i++) { if (clip && clip[i]) continue; var ax = r[2 * j], az = r[2 * j + 1], ex = r[2 * i] - ax, ez = r[2 * i + 1] - az, L2 = ex * ex + ez * ez; if (L2 < 1e-6) continue;
      var u = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / L2)), qx = ax + ex * u, qz = az + ez * u, d = Math.hypot(x - qx, z - qz); if (!best || d < best.d) best = { d: d, qx: qx, qz: qz, ex: ex, ez: ez }; } return best; }
  function fpAt(x, y, z, pad, fn) {   // fn(tile, footprint, local x, local z, k, mesh) for each footprint whose wall (grown by pad) holds the point; true stops
    var hit = false; tiles.forEach(function (t) { if (hit || t.z !== 14 || !t.fp || !t.meshes.length || !t.box || x < t.box.x0 - 30 || x > t.box.x1 + 30 || z < t.box.z0 - 30 || z > t.box.z1 + 30) return;
      var m = t.meshes[0], k = m.scale.x, lx = (x - m.position.x) / k, lz = (z - m.position.z) / k, L = fpGrid(t).get(Math.floor(lx / 16) + ',' + Math.floor(lz / 16)); if (!L) return;
      for (var i = 0; i < L.length; i++) { var f = L[i]; if (f.open831 || lx < f.x0 - pad || lx > f.x1 + pad || lz < f.z0 - pad || lz > f.z1 + pad || y < f.bot - 0.5 || y > f.top) continue; if (fn(t, f, lx, lz, k, m)) { hit = true; return; } } });   /* 831: a dome she may fly into is open */
    return hit;
  }
  function inside808() { return !!(window.WFR_INTERIORS729 && WFR_INTERIORS729.k1 && WFR_INTERIORS729.k1()); }
  function solid808(p, pad, body) {
    if (inside808()) return false; var moved = false;
    for (var it = 0; it < 3; it++) { var done = true;
      fpAt(p.x, p.y + 0.2, p.z, pad, function (t, f, lx, lz, k, m) { var e = nearEdge(f.r, lx, lz, f.clip); if (!e) return false; var inn = inPoly(f.r, lx, lz); if (!inn && e.d >= pad) return false;
        var dx = lx - e.qx, dz = lz - e.qz, dl = Math.hypot(dx, dz); if (dl < 1e-4) { dx = -e.ez; dz = e.ex; dl = Math.hypot(dx, dz) || 1; if (!inPoly(f.r, lx + dx / dl * 0.01, lz + dz / dl * 0.01)) { dx = -dx; dz = -dz; } inn = true; }   /* on the wall: d points into the house, so the push (-d) leaves it */ var sg = inn ? -1 : 1, nx = e.qx + dx / dl * sg * pad * 1.001, nz = e.qz + dz / dl * sg * pad * 1.001;
        var wx = m.position.x + nx * k, wz = m.position.z + nz * k, mx = wx - p.x, mz = wz - p.z; p.x = wx; p.z = wz; if (body && body.position) { body.position.x += mx; body.position.z += mz; } moved = true; done = false; stats.solid808 = (stats.solid808 || 0) + 1; return true; });
      if (done) break; }
    return moved;
  }
  function lensOut808(cam, her) {   // a spring arm from her eyes out to the lens: the first wall on that line brings the lens in to just short of it
    if (window.WFR_SACRED831 && her && WFR_SACRED831.lensIn(cam, her)) { if (T && T.u && T.u.uEye) T.u.uEye.value.copy(cam); return true; }   /* 831: inside a room the lens stays inside its walls */
    if (inside808() || !her) return false; var hx = her.x, hy = her.y + 0.5, hz = her.z, dx = cam.x - hx, dy = cam.y - hy, dz = cam.z - hz, L = Math.sqrt(dx * dx + dy * dy + dz * dz); if (L < 0.7) return false;
    for (var s2 = 0.3; s2 <= L + 1e-6; s2 += 0.2) { var f2 = Math.min(1, s2 / L), x = hx + dx * f2, y = hy + dy * f2, z = hz + dz * f2;
      if (fpAt(x, y, z, 0.25, function (t, f, lx, lz) { var e5 = nearEdge(f.r, lx, lz, f.clip); return inPoly(f.r, lx, lz) || (e5 && e5.d < 0.25); })) { var k = Math.max(0.6, s2 - 0.25) / L; x = hx + dx * k; y = hy + dy * k; z = hz + dz * k; cam.set(x, y, z); if (T && T.u && T.u.uEye) T.u.uEye.value.set(x, y, z); stats.lens808 = (stats.lens808 || 0) + 1; return true; } }
    return false;
  }
  function update(cam, travel) {   // every travel frame, before the render; off the travel zone it hides what it shows (labels, credit)
    if (window.WFR_SACRED831 && T && T.on && cam) WFR_SACRED831.update(T, cam);   /* 831: the rooms placed at their spots, shown near her (cam: the camera's position) */
    if (!mats) return; hudTick820(); var t0 = now(); frameNo++;
    try {
      T = travel || T; if (!T || !T.on || !T.st || !T.f) { hideAll(); return; }
      if (group.parent !== T.st.group) T.st.group.add(group);
      if (F !== T.f) { if (F) stats.recentres++; F = T.f; placeAll(); }
      readTileJSON(); if (!template) return;
      var st = T.st, ll = W.toLatLon(T.f, cam.x, cam.z), agl = cam.y - st.H(cam.x, cam.z), list = wanted(cam, ll, agl), seen = new Set();
      list.sort(function (a, b) { return a.d / a.show - b.d / b.show; });
      for (var i = 0; i < list.length; i++) { var w = list[i], k = keyOf(w.z, w.x, w.y), t = tiles.get(k); seen.add(k);
        if (!t) { t = { key: k, z: w.z, x: w.x, y: w.y, nw: w.nw, se: w.se, state: 'want', meshes: [], places: [], used: frameNo, d: w.d, show: w.show }; tiles.set(k, t); }
        t.used = frameNo; t.d = w.d; t.show = w.show;
        if (t.state === 'missing' && now() > t.retry) t.state = 'want';
        if (t.state === 'built' && !t.stale && t.raw && window.WFR_CITY790 && WFR_CITY790.restale(t)) t.stale = true;   /* 790 A: a far-built tile she nears is rebuilt with its rooftop detail */
        if (t.state === 'want' && inflight < C.LOADS) load(t); }
      /* one tile's work a frame, a few milliseconds of it: the nearest first (a stale one is rebuilt from its kept bytes, its old meshes standing until then) */
      var deadline = t0 + C.SLICE_MS, job = null, best = 1e18;
      tiles.forEach(function (t) { if (t.used !== frameNo) return; var ready = t.job || t.state === 'raw' || (t.state === 'built' && t.stale && t.raw); if (!ready) return; var sc = t.job ? -1 : t.d / t.show + (t.z === 14 ? 0 : 0.01); if (sc < best) { best = sc; job = t; } });
      if (job) { if (!job.job) { if (job.z === 14 && st.loadingUnder(cam.x, cam.z) && now() - (job.since || 0) < C.WAIT_MS) { stats.waits++; job = null; } else { if (job.stale) stats.restale++; startJob(job); } }
        if (job) { var a = now(); stepJob(job, deadline); stats.sliceMax = Math.max(stats.sliceMax, now() - a); } }
      /* who shows: built, wanted, within its ring's sight; over the triangle budget the farthest go first */
      var vis = [], tris = 0; tiles.forEach(function (t) { if (t.state !== 'built' || !t.meshes.length) return; var on = t.used === frameNo && t.d <= t.show; if (on) vis.push(t); else setVis(t, false); });
      vis.sort(function (a, b) { return a.d - b.d; }); var shown = 0;
      for (i = 0; i < vis.length; i++) { var ok = tris + vis[i].tris <= C.TRI_MAX; setVis(vis[i], ok); if (ok) { tris += vis[i].tris; shown++; } }
      stats.tris = tris; stats.visible = shown; cover(); drapeStep(vis, Math.max(now() + C.DRAPE_MS, t0 + C.SLICE_MS));   /* 798: what the tile's build left of its slice, and never less than DRAPE_MS */
      if (mats.city && window.WFR_CITY790) WFR_CITY790.tick(cam, tiles, frameNo, T, group, agl);   /* 790 A: the street trees, lamps and benches near her; the night windows */
      /* the LRU: never what this frame wants */
      if (tiles.size > C.KEPT) { var old = []; tiles.forEach(function (t) { if (t.used !== frameNo && t.state !== 'fetch') old.push(t); }); old.sort(function (a, b) { return a.used - b.used; });
        for (i = 0; i < old.length && tiles.size > C.KEPT; i++) { disposeMeshes(old[i]); old[i].raw = null; old[i].job = null; old[i].city = null; tiles.delete(old[i].key); stats.evicted++; if (window.WFR_CITY790) WFR_CITY790.changed(); for (var q = 0; q < droppers.length; q++) try { droppers[q](old[i].z, old[i].x, old[i].y); } catch (e) { /* a listener's own */ } } }
      stats.kept = tiles.size;
      if ((frameNo & 3) === 0) labels(cam);
      credit(shown > 0 || stats.labels > 0);
    } catch (e) { stats.fault = String(e && e.message || e); }
    finally { var ms = now() - t0; stats.updMax = Math.max(stats.updMax, ms); stats.upd.push(+ms.toFixed(3)); if (stats.upd.length > 4000) stats.upd.shift(); }
  }
  function setVis(t, v) { for (var i = 0; i < t.meshes.length; i++) if (t.meshes[i].visible !== v) t.meshes[i].visible = v; }
  function hideAll() { tiles.forEach(function (t) { setVis(t, false); }); if (labelsEl && !labelsEl.hidden) labelsEl.hidden = true; if (creditEl && !creditEl.hidden) creditEl.hidden = true; stats.labels = 0; }

  /* ---------- place names: a few, by size and nearness, laid on the screen where the far pass draws them (the same shrink keeps the direction; the
     curve's drop applied) ---------- */
  var v3 = null;
  function labels(cam) {
    if (!camera) return; if (!labelsEl) { labelsEl = document.createElement('div'); labelsEl.id = 'features-labels'; labelsEl.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6;overflow:hidden'; document.body.appendChild(labelsEl); v3 = new THREE.Vector3(); }
    if (cover820 && !(window.WFR_DOOR && window.WFR_DOOR.classic) && cover820()) { for (var j = 0; j < pool.length; j++) if (!pool[j].hidden) pool[j].hidden = true;   /* 820: a sheet or a card is open (the page's own test, 818's covered(), and Pause): no name over it */
      if (!labelsEl.hidden) labelsEl.hidden = true; stats.labels = 0; stats.cover820 = (stats.cover820 || 0) + 1; return; }
    if (window.WFR_SACRED831 && WFR_SACRED831.inside && WFR_SACRED831.inside(cam)) { for (var j2 = 0; j2 < pool.length; j2++) if (!pool[j2].hidden) pool[j2].hidden = true;   /* 831 (Su 40, seen in the pictures): inside a room no street or town name from outside shows through its walls */
      if (!labelsEl.hidden) labelsEl.hidden = true; stats.labels = 0; stats.in831 = (stats.in831 || 0) + 1; return; }
    var cand = [], names = new Set(), REFR = window.WFR_TRAVEL712 && WFR_TRAVEL712.C.REFR;
    tiles.forEach(function (t) { if (t.used !== frameNo && t.used !== frameNo - 1 && t.used !== frameNo - 2 && t.used !== frameNo - 3) return; for (var i = 0; i < t.places.length; i++) { var p = t.places[i]; if (names.has(p.name)) continue;
      var L = W.toLocal(T.f, p.lat, p.lon), d = Math.hypot(L.x - cam.x, L.z - cam.z); if (d > PLACE_R[p.cls]) continue; names.add(p.name); cand.push({ p: p, x: L.x, z: L.z, d: d, s: PLACE_W[p.cls] / (1 + d / 4000) / (1 + (p.rank || 5) * 0.05) }); } });
    var std = !(window.WFR_DOOR && window.WFR_DOOR.classic);   /* 820: Standard only (Classic is frozen: its names as they always were) */
    if (std) cand.sort(function (a, b) { return a.d - b.d; }); else cand.sort(function (a, b) { return b.s - a.s; }); stats.places = cand.length;
    var W0 = window.innerWidth, H0 = window.innerHeight, used = 0, keep = std ? hud820(W0, H0) : null, put = std ? [] : null;
    for (var i = 0; i < cand.length && used < (std ? C.LABELS820 : C.LABELS); i++) { var c = cand[i], y = T.st.H(c.x, c.z) + 40 - (REFR ? c.d * c.d / (2 * REFR) : 0); v3.set(c.x, y, c.z).project(camera); if (v3.z > 1 || v3.z < -1 || Math.abs(v3.x) > 0.95 || Math.abs(v3.y) > 0.9) continue;
      var big = c.p.cls === 'city' ? 15 : c.p.cls === 'town' ? 13 : 11.5;
      if (std) { var sx = (v3.x * 0.5 + 0.5) * W0, sy = (-v3.y * 0.5 + 0.5) * H0, hw = textW820(c.p.name, big) / 2 + 3, bx = [sx - hw, sy - big * 1.3 - 2, sx + hw, sy + 2];   /* the name's box, from its own width (no layout read) */
        if (bx[0] < 4 || bx[2] > W0 - 4) { stats.edge820 = (stats.edge820 || 0) + 1; continue; }   /* never cut by the screen's edge */
        if (hit820(bx, keep)) { stats.hud820 = (stats.hud820 || 0) + 1; continue; } if (hit820(bx, put)) { stats.lap820 = (stats.lap820 || 0) + 1; continue; } put.push(bx); }   /* over a card or a button: held back; over a nearer name: the farther one goes */
      var el = pool[used] || (pool[used] = mk()); if (el.textContent !== c.p.name) el.textContent = c.p.name;
      if (el._s820 !== std) { el._s820 = std; el.style.textShadow = std ? '0 2px 8px rgba(0,10,30,.75),0 0 2px rgba(0,0,0,.6)' : '0 1px 2px rgba(0,0,0,.75),0 0 6px rgba(0,0,0,.35)'; }   /* Standard: the place title's own shadow (#place790 .n) */
      el.style.fontSize = big + 'px'; el.style.opacity = String(Math.max(0.35, Math.min(1, 1.4 - c.d / PLACE_R[c.p.cls]))); el.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W0).toFixed(1) + 'px,' + ((-v3.y * 0.5 + 0.5) * H0).toFixed(1) + 'px) translate(-50%,-100%)'; el.hidden = false; used++; }
    for (i = used; i < pool.length; i++) if (!pool[i].hidden) pool[i].hidden = true;
    labelsEl.hidden = used === 0; stats.labels = used;
  }
  /* 820 (Marth, Nov 14, live #143 near Yaguajay: the names lay over the level card, the timer line and the round compass): the play screen's cards and
     buttons, read twice a second at most (never per name, never per frame), each with a margin; an action button's paper tag counted in (its own box
     does not hold it). A name's width comes from a 2D canvas's measure, kept per name and size. */
  var HUD820 = ['cmp795', 'lvPill', 'mapBtn705', 'wordsTop735', 'dist', 'place790', 'hint', 'toast', 'xpPop', 'mute', 'muteTop', 'birdsBtn', 'quickBtn', 'emoBtn633', 'questsBtn720', 'journalBtn', 'petBtn', 'feedBtn',
    'flap', 'flutter', 'jump', 'atkBtn', 'land', 'read', 'zoom', 'nightBtn', 'home', 'thBtn', 'sing', 'ff757'], PIP825 = { ff757: 16 }, TAG820 = { flap: 1, flutter: 1, jump: 1, atkBtn: 1, land: 1, read: 1, zoom: 1, nightBtn: 1, home: 1, thBtn: 1, sing: 1 };
  var hudC820 = { at: -1e9, w: 0, h: 0, r: [] }, wC820 = new Map(), cx820 = null, cover820 = null;   /* cover820: the page's "a sheet or a card is open" (WFR_FEATURES.cover) */
  /* #150 (the coordinator: "make hud820's box cache refresh on the tick ... so clear825() inside say() only reads cached boxes and never forces a layout"):
     places790 B5 measured 11.6-11.8 ms in its card's DOM: 825's clear825 asked hud825() inside say(), just after the card's own DOM write, and a stale cache
     there read 29 boxes and styles from a dirty layout. Now the frame refreshes the cache every 400 ms at its top (before this module's own timed work, the
     layout clean), so a reader within 500 ms always finds it fresh. Its own cost is kept apart (stats.hud820Max, hud820N). Standard only. */
  function hudTick820() { if (window.WFR_DOOR && window.WFR_DOOR.classic) return; var t = now(), W0 = window.innerWidth, H0 = window.innerHeight;
    if (t - hudC820.at < 400 && hudC820.w === W0 && hudC820.h === H0) return; hudC820.at = -1e9; hud820(W0, H0); var ms = now() - t; stats.hud820Max = Math.max(stats.hud820Max || 0, +ms.toFixed(2)); stats.hud820N = (stats.hud820N || 0) + 1; }
  function hud820(W0, H0) { var t = now(); if (t - hudC820.at < 500 && hudC820.w === W0 && hudC820.h === H0) return hudC820.r; hudC820.at = t; hudC820.w = W0; hudC820.h = H0; var r = hudC820.r = [];
    for (var i = 0; i < HUD820.length; i++) { var e = document.getElementById(HUD820[i]); if (!e || e.hidden || e.closest('[hidden]')) continue; var q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2) continue;
      var cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity < 0.05) continue; var tg = TAG820[HUD820[i]] ? 1 : 0;
      r.push([q.left - 6 - tg * q.width * 0.5 - (PIP825[HUD820[i]] || 0), q.top - 6, q.right + 6 + tg * q.width * 0.5, q.bottom + 6 + tg * 20, HUD820[i]]); }   /* 825: the fast-forward button (757) joined, its three use-dots left of it counted in; each box keeps its id (the place card skips its own) */
    stats.hudBoxes820 = r.length; return r; }
  function hit820(b, list) { for (var i = 0; i < list.length; i++) { var o = list[i]; if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return true; } return false; }
  function textW820(s, px) { var k = px + '|' + s, w = wC820.get(k); if (w != null) return w; if (!cx820) cx820 = document.createElement('canvas').getContext('2d');
    cx820.font = '700 ' + px + 'px system-ui,-apple-system,sans-serif'; w = cx820.measureText(s).width + s.length * px * 0.02; if (wC820.size > 400) wC820.clear(); wC820.set(k, w); return w; }
  function mk() { var el = document.createElement('div'); el.className = 'feat-label'; el.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap;color:#fffef6;font-weight:700;font-family:system-ui,-apple-system,sans-serif;letter-spacing:.02em;text-shadow:0 1px 2px rgba(0,0,0,.75),0 0 6px rgba(0,0,0,.35)'; labelsEl.appendChild(el); return el; }
  function credit(on) {
    if (!creditEl) { creditEl = document.createElement('div'); creditEl.id = 'credit-features'; creditEl.setAttribute('role', 'note'); creditEl.textContent = C.CREDIT;
      creditEl.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:max(2px,calc(env(safe-area-inset-bottom,0px) - 32px));z-index:7;box-sizing:border-box;width:max-content;max-width:min(98vw,560px);padding:0 4px;border-radius:4px;background:none;color:rgba(255,254,246,.72);font:500 7.5px/1.2 system-ui,-apple-system,sans-serif;text-align:center;text-shadow:0 1px 1px rgba(0,0,0,.45);pointer-events:none'; creditEl.hidden = true; document.body.appendChild(creditEl); }
    var d = document.getElementById('credit712d'), lift = d && !d.hidden ? 30 : 0, want = 'calc(max(2px,calc(env(safe-area-inset-bottom,0px) - 32px)) + ' + lift + 'px)'; if (creditEl.style.bottom !== want) creditEl.style.bottom = want;   // above the Dunn's credit when both show
    if (creditEl.hidden !== !on) creditEl.hidden = !on;
  }

  /* ---------- the bench's read, and the doors for the other units ---------- */
  function peek() { var s = Object.assign({}, stats); delete s.upd; var u = stats.upd.slice().sort(function (a, b) { return a - b; }); s.updP99 = u.length ? u[Math.floor(u.length * 0.99)] : 0; s.updMed = u.length ? u[Math.floor(u.length / 2)] : 0; s.frames = u.length;
    s.tiles = []; tiles.forEach(function (t) { s.tiles.push({ key: t.key, state: t.state, d: Math.round(t.d), vis: !!(t.meshes[0] && t.meshes[0].visible), nB: t.nB || 0, nR: t.nR || 0, nW: t.nW || 0, tris: t.tris || 0, terrZ: t.terrZ, stale: !!t.stale, places: t.places ? t.places.length : 0 }); });
    var geo = 0; tiles.forEach(function (t) { for (var i = 0; i < t.meshes.length; i++) { var g = t.meshes[i].geometry; for (var a in g.attributes) geo += g.attributes[a].array.byteLength; if (g.index) geo += g.index.array.byteLength; } }); s.geoMB = +(geo / 1048576).toFixed(2);
    var raw = 0; tiles.forEach(function (t) { if (t.raw) raw += t.raw.byteLength; }); s.rawMB = +(raw / 1048576).toFixed(2); s.template = template; s.photos = Object.assign({}, tex); s.lakeLv = []; lakeLv.forEach(function (v, k) { if (s.lakeLv.length < 12) s.lakeLv.push([k, v.z, +v.h.toFixed(2)]); }); s.lakeReads = stats.lakeReads.slice(); s.lakeOf = function (id) { var b = lakeLv.get(id), pcs = []; tiles.forEach(function (t) { if (t.lakes) t.lakes.forEach(function (L) { if (L.id === id) pcs.push([t.key, t.state, !!t.stale, L.z, L.lv, L.rd, L.lo, L.ns]); }); }); return { best: b ? [b.z, +b.h.toFixed(2)] : null, pieces: pcs }; }; return s; }
  function meshes() { var out = []; tiles.forEach(function (t) { for (var i = 0; i < t.meshes.length; i++) out.push({ key: t.key, z: t.z, mesh: t.meshes[i] }); }); return out; }
  var api = { C: C, attach: attach, update: update, peek: peek, meshes: meshes, hud825: function () { return hud820(window.innerWidth, window.innerHeight); }, hit825: hit820,   /* 825: the play screen's buttons (the same cached read), for the place card (places790.js) */
    decodeTile: decodeTile, feature: feature, polygons: polygons, llOf: llOf,
    surface798: surface798, solid808: solid808, lensOut808: lensOut808, fp808: function (x, y, z) { var out = []; tiles.forEach(function (t) { if (t.z !== 14) return; var m = t.meshes[0]; out.push({ key: t.key, st: t.state, fp: t.fp ? t.fp.length : null, box: t.box ? [Math.round(t.box.x0), Math.round(t.box.z0), Math.round(t.box.x1), Math.round(t.box.z1)] : null, m: m ? [Math.round(m.position.x), Math.round(m.position.z)] : null }); }); var hits = []; tiles.forEach(function (t) { if (t.z !== 14 || !t.fp || !t.meshes.length) return; var m = t.meshes[0], k = m.scale.x, lx = (x - m.position.x) / k, lz = (z - m.position.z) / k; t.fp.forEach(function (f) { if (lx < f.x0 - 8 || lx > f.x1 + 8 || lz < f.z0 - 8 || lz > f.z1 + 8) return; var e = nearEdge(f.r, lx, lz, f.clip); hits.push({ key: t.key, in: inPoly(f.r, lx, lz), d: e ? +e.d.toFixed(2) : null, bot: +f.bot.toFixed(1), top: +f.top.toFixed(1), y: +y.toFixed(1), n: f.r.length / 2, clip: f.clip ? Array.prototype.reduce.call(f.clip, function (a, b) { return a + b; }, 0) : null }); }); }); return { tiles: out, hits: hits }; },   /* 808 bench read */ onTile: function (cb) { listeners.push(cb); }, cover: function (fn) { cover820 = typeof fn === 'function' ? fn : null; }, wantPoi: function (fn) { poiWant = fn; }, onDrop: function (cb) { droppers.push(cb); }, setFetch: function (fn) { fetchFn = fn; }, group: function () { return group; }, materials: function () { return mats; }, attached: function () { return { T: T, scene: scene, warm: warm }; }, version: 1 };   // attached(): what the page handed attach() (the game's script is scoped; the guard reads it here)
  api.hud833 = function () { return hud820(window.innerWidth, window.innerHeight); };   /* 833: Night Vision's names keep clear of the same cards and buttons (820's cached read) */
  return api;
})();

/* WFR_CITY790 (at the end of world-features.js) - BOARD 790 PART A, THE CITY LOOK EVERYWHERE (ship #137). Su, Nov 13 2026. Every number DRAFT (unmeasured on her phone).
   Marth, verbatim: "Nah I want the whole world built at least as nice as the current game looks. Everything in his game looks better than in our game.
   ... His map look nice like miles morales spider man." The bar: Yegor Sak's COO (a Toronto pigeon game, no external assets): gabled houses with real
   roofs and chimneys, brick and stucco walls, windowed towers, orange-red autumn street trees, streets with lane paint, crossings and sidewalks.
   STUDIED, NEVER COPIED: everything here is procedural, written for this game (no external asset, nothing to log in the sources ledger).

   WHAT SHE SEES, wherever the map has a town (world-features.js streams the buildings and roads; this dresses them):
     HOUSES      a low building (world-features' own test: 14 m or less, 600 m2 or less) on a near-rectangular footprint gets a pitched roof over its
                 best-fitting rectangle: a gable (ridge on the long side, the two gable ends walled) or a hip, 0.4 m eaves, 30-42 degrees, a chimney on
                 about half; the walls wear a house facade (two windows a bay, a front door, frames); roof colours from slate, charcoal, brown, red-brown.
     BLOCKS      mid-rise walls in brick (coursed, near) or stucco/stone (floor bands), towers in glass curtain-wall grids; a parapet on every flat roof
                 of 8 m and more, rooftop boxes on the big ones; a shopfront (glass, an awning on some) on the ground floor of any building that fronts
                 a primary, secondary or tertiary street.
     COLOUR      the map's own colour tag (OpenMapTiles 'colour': "red", "beige", "#bd8161") softened into the painted palette; else a seeded palette
                 per neighbourhood (300 m cells): brick reds and browns, cream and beige siding, grey stone, pale yellow, sage.
     NIGHT       about half the windows lit warm (per window, fixed), the shopfronts lit; far away the facade fades to its own average and the glow
                 to a soft half.
     STREETS     the z14 roads drawn as textured asphalt: plain on minor streets, a dashed yellow centre on tertiary, double yellow and lane dashes on
                 primary/secondary, white lanes and edges on motorways; paint stops short of every junction; zebra crossings on each arm of a
                 junction of three arms or more; concrete sidewalks where buildings stand (a building within 40 m).
     FURNITURE   street trees along the town streets in the season's colours (autumn: gold, amber, orange, rust; the tropics stay green; the south
                 has its own season), lamps every ~32 m, a few benches and street-name posts. Instanced, near her only (trees 700 m, lamps 420 m).
   HOW (the frames held): ONE new shader program (the city walls: the travel ground's own program plus the procedural facade; windows are
   arithmetic on the wall's metres, not geometry); the roads and roofs reuse the 'travel712feat' program (a map, vertex colours); the furniture
   reuses the vegetation's instanced program ('wfrveg1'), so 4 draws for all of it; the roads one draw per z14 tile. Classic is frozen: nothing
   here runs there (WFR_DOOR.classic), and localStorage 'wfr.city790' = 'off' is the game before this unit (the guard's control).
   NO PAGE GLUE: this module rides at the end of world-features.js (the page already loads that file), and world-features.js asks it when it is on. */
window.WFR_CITY790 = (function () {
  'use strict';
  var C = { EAVE: 0.4, FILL: 0.72, SHORT_MAX: 18, LONG_MAX: 40, PAR: 0.9, PAR_H: 8, BOX_A: 250, BOX_H: 10, SHOP_D: 16, URB_R: 40, URB_N: 2,
    W: { minor: 7, service: 4.2, tertiary: 9, secondary: 12, primary: 14, trunk: 16, motorway: 18, busway: 8, raceway: 10 }, SIDE: { minor: 1.9, tertiary: 2.4, secondary: 2.8, primary: 3.2, busway: 2 },
    LIFT_S: 0.53, LIFT_A: 0.38,   /* 798: the sidewalk a 15 cm curb OVER the street (was 0.32: under it) */ SUB: 22, PERIOD: 8, TREE_STEP: 11, LAMP_STEP: 32, TREE_R: 600, LAMP_R: 420, BENCH_R: 300, MOVE: 40, AGL_MAX: 650,
    CAP: { tree: 2400, lamp: 900, bench: 160, sign: 220 }, NIGHT_K: 0.8, DETAIL_D: 1500, DETAIL_UP: 1100 };
  var MODE = (function () { try { return localStorage.getItem('wfr.city790') || 'on'; } catch (e) { return 'on'; } })();
  function HAS(m) { return (',' + MODE + ',').indexOf(',' + m + ',') >= 0; }   /* 790 A2: the switch may carry two words ('nofacade,noink': the ink guard's plain walls) */
  var INK = !HAS('noink'); C.INK = 0.7;   /* 790 A2: the ink on the walls' corners and tops ('noink' is the guard's control, sky790.js) */
  function on() { return !HAS('off') && (HAS('force') || !(window.WFR_DOOR && window.WFR_DOOR.classic)); }
  /* the guard's controls (localStorage 'wfr.city790'): 'off' the game before this unit; 'noroof' no pitched roofs; 'nofacade' plain walls (no windows, no
     night glow); 'nostreet' the old road ribbons (no paint, sidewalks, crossings or furniture); 'nofurn' no trees, lamps or benches; 'force' even in Classic */
  var st = { mode: MODE, built: 0, houses: 0, gables: 0, hips: 0, chimneys: 0, parapets: 0, boxes: 0, shops: 0, flat: 0, tagged: 0, seeded: 0, styles: [0, 0, 0, 0, 0, 0, 0],
    roads: 0, sidewalks: 0, xings: 0, cuts: 0, trees: 0, lamps: 0, benches: 0, signs: 0, gathers: 0, gatherMs: 0, gatherMax: 0, shown: { tree: 0, lamp: 0, bench: 0, sign: 0 }, night: 0, faults: [], season: null, lin: null };
  var THREE = null, U = { night: { value: 0 } }, lin = false;
  function fault(w, e) { if (st.faults.length < 12) st.faults.push(w + ': ' + (e && e.message || e)); }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }
  function h2(a, b) { return hash((Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) | 0); }
  function toLin(c) { if (!lin) return c; return c.map(function (v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); }

  /* ---------- the palette (sRGB as painted; made linear once when the renderer outputs sRGB) ---------- */
  var NAMED = { red: [0.66, 0.31, 0.25], darkred: [0.52, 0.22, 0.19], brown: [0.52, 0.34, 0.25], maroon: [0.48, 0.22, 0.2], beige: [0.86, 0.78, 0.63], tan: [0.80, 0.68, 0.52],
    white: [0.93, 0.92, 0.88], ivory: [0.94, 0.91, 0.82], grey: [0.68, 0.67, 0.65], gray: [0.68, 0.67, 0.65], lightgrey: [0.80, 0.79, 0.76], lightgray: [0.80, 0.79, 0.76], silver: [0.76, 0.77, 0.78],
    darkgrey: [0.45, 0.45, 0.46], darkgray: [0.45, 0.45, 0.46], black: [0.30, 0.30, 0.32], yellow: [0.90, 0.80, 0.50], cream: [0.93, 0.87, 0.72], orange: [0.86, 0.56, 0.34], pink: [0.88, 0.70, 0.68],
    blue: [0.50, 0.60, 0.72], lightblue: [0.66, 0.76, 0.84], green: [0.58, 0.66, 0.52], sandstone: [0.84, 0.72, 0.54], brick: [0.66, 0.33, 0.26], stone: [0.72, 0.70, 0.66], concrete: [0.74, 0.73, 0.70], glass: [0.56, 0.68, 0.78] };
  var PAL_HOUSE = [[0.66, 0.33, 0.26], [0.60, 0.29, 0.23], [0.54, 0.35, 0.27], [0.88, 0.82, 0.68], [0.84, 0.76, 0.62], [0.93, 0.92, 0.87], [0.66, 0.70, 0.72], [0.90, 0.83, 0.60], [0.70, 0.66, 0.58], [0.78, 0.60, 0.50]];
  var PAL_BRICK = [[0.64, 0.32, 0.25], [0.56, 0.30, 0.23], [0.70, 0.42, 0.32], [0.50, 0.33, 0.26], [0.74, 0.52, 0.40]];
  var PAL_STONE = [[0.86, 0.82, 0.74], [0.78, 0.76, 0.72], [0.90, 0.86, 0.78], [0.70, 0.69, 0.67], [0.84, 0.76, 0.62], [0.92, 0.90, 0.86]];
  var PAL_GLASS = [[0.52, 0.66, 0.78], [0.60, 0.70, 0.76], [0.46, 0.58, 0.70], [0.66, 0.74, 0.78], [0.56, 0.64, 0.66]];
  var PAL_ROOF = [[0.30, 0.31, 0.34], [0.24, 0.24, 0.26], [0.42, 0.30, 0.24], [0.52, 0.27, 0.21], [0.36, 0.41, 0.47], [0.38, 0.40, 0.35], [0.46, 0.43, 0.40]];
  var PAL_FLAT = [[0.56, 0.56, 0.55], [0.48, 0.48, 0.49], [0.62, 0.60, 0.56], [0.42, 0.43, 0.45]];
  function tagColour(v) {
    if (v == null || v === '') return null; var s = String(v).toLowerCase().replace(/[\s_-]/g, ''), c = NAMED[s];
    if (!c && /^#?[0-9a-f]{6}$/.test(s)) { var x = parseInt(s.replace('#', ''), 16), r = (x >> 16 & 255) / 255, g = (x >> 8 & 255) / 255, b = (x & 255) / 255, m = (r + g + b) / 3;
      c = [r + (m - r) * 0.5, g + (m - g) * 0.5, b + (m - b) * 0.5]; var l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2], k = l < 0.32 ? 0.32 / Math.max(0.02, l) : l > 0.9 ? 0.9 / l : 1; c = [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];
      var hi = Math.max(c[0], c[1], c[2]), lo = Math.min(c[0], c[1], c[2]), mc = (c[0] + c[1] + c[2]) / 3; if (hi - lo > 0.28) { var q = 1 - 0.28 / (hi - lo); c = [c[0] + (mc - c[0]) * q, c[1] + (mc - c[1]) * q, c[2] + (mc - c[2]) * q]; } }   /* a painted city, never a neon one: the spread held to 0.28 */
    return c || null;
  }
  function isRedBrown(c) { return c[0] > c[2] * 1.35 && c[0] > 0.4 && c[1] < c[0] * 0.8; }
  function isBlue(c) { return c[2] > c[0] * 1.15; }

  /* ---------- the materials ---------- */
  var NL = String.fromCharCode(10);
  var FACADE = [
    'uniform float uNight790; varying vec2 vF790; varying vec2 vM790;',
    'float h790( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }',
    'float bx790( vec2 f, vec4 r, vec2 w ) { vec2 a = smoothstep( r.xy - w, r.xy + w, f ) * ( 1.0 - smoothstep( r.zw - w, r.zw + w, f ) ); return a.x * a.y; }'].join(NL);
  var FACADE_MAIN = [
    '{ float cd = floor( vF790.x + 0.5 ); float shp = step( 7.5, cd ); float sy = cd - 8.0 * shp;',
    '  if ( sy > 0.5 && sy < 5.5 ) {',
    '    vec3 wc = diffuseColor.rgb; float sd = floor( vF790.y ) / 256.0; float fl = sy < 1.5 ? 2.9 : ( sy < 2.5 ? 3.2 : ( sy < 3.5 ? 3.4 : ( sy < 4.5 ? 3.7 : 4.5 ) ) );',
    '    float bw = sy < 1.5 ? 3.3 : ( sy < 2.5 ? 2.7 : ( sy < 3.5 ? 3.1 : ( sy < 4.5 ? 1.7 : 4.6 ) ) );',
    '    vec2 q = vM790 / vec2( bw, fl ); vec2 ce = floor( q ); vec2 f = fract( q ); vec2 dq = fwidth( q );',
    '    float fa = clamp( ( max( dq.x, dq.y ) - 0.16 ) / 0.30, 0.0, 1.0 ); vec2 aw = dq * 0.7 + 0.004;',
    '    vec4 R = sy < 1.5 ? vec4( 0.30, 0.30, 0.70, 0.78 ) : ( sy < 2.5 ? vec4( 0.25, 0.26, 0.75, 0.80 ) : ( sy < 3.5 ? vec4( 0.20, 0.28, 0.80, 0.80 ) : ( sy < 4.5 ? vec4( 0.05, 0.10, 0.95, 0.94 ) : vec4( 0.10, 0.56, 0.90, 0.84 ) ) ) );',
    '    float wn = bx790( f, R, aw ); float fr = clamp( bx790( f, R + vec4( -0.06, -0.08, 0.06, 0.04 ), aw ) - wn, 0.0, 1.0 );',
    '    float rnd = h790( ce + vec2( sd * 37.0, sd * 11.0 ) );',
    '    vec3 gl = mix( vec3( 0.13, 0.17, 0.23 ), vec3( 0.44, 0.54, 0.64 ), clamp( f.y * 0.9 + rnd * 0.25 - 0.1, 0.0, 1.0 ) );',
    '    if ( sy > 3.5 && sy < 4.5 ) gl = mix( wc * vec3( 0.45, 0.6, 0.78 ), vec3( 0.62, 0.74, 0.84 ), clamp( ( f.y - 0.1 ) * 0.8 + rnd * 0.18, 0.0, 1.0 ) );',
    '    vec3 cl = wc;',
    '    if ( sy > 1.5 && sy < 2.5 ) { vec2 b = vM790 * vec2( 1.0 / 0.95, 1.0 / 0.32 ); b.x += 0.5 * mod( floor( b.y ), 2.0 ); vec2 db = fwidth( b );',
    '      float bf = clamp( ( max( db.x, db.y ) - 0.2 ) / 0.4, 0.0, 1.0 ); float mo = bx790( fract( b ), vec4( 0.05, 0.14, 0.95, 0.94 ), db * 0.7 + 0.01 );',
    '      cl *= mix( mix( 0.80, 1.0 + 0.12 * ( h790( floor( b ) ) - 0.5 ), mo ), 0.95, bf ); }',
    '    if ( sy > 2.5 && sy < 3.5 ) cl = mix( cl, cl * 1.10 + 0.025, bx790( f, vec4( -1.0, -0.03, 2.0, 0.08 ), aw ) );',
    '    if ( sy < 1.5 ) { float sl = fract( vM790.y / 0.22 ); cl *= 1.0 - 0.07 * ( 1.0 - fa ) * smoothstep( 0.75, 0.95, sl ); }',
    '    cl = mix( cl, min( cl * 1.3 + 0.07, vec3( 1.0 ) ), fr * ( sy > 3.5 && sy < 4.5 ? 0.45 : 1.0 ) );',
    '    cl = mix( cl, gl, wn );',
    '    float lw = wn * step( 0.6, rnd );',
    '    if ( ce.y < 0.5 ) {',
    '      if ( shp > 0.5 ) { float sf = bx790( f, vec4( 0.04, 0.03, 0.96, 0.76 ), aw ); float an = bx790( f, vec4( -0.2, 0.79, 1.2, 0.95 ), aw ) * step( 0.35, h790( vec2( sd * 13.0, 5.0 ) ) );',
    '        vec3 ac = 0.42 + 0.38 * cos( 6.2831 * ( h790( vec2( sd * 7.0, 2.0 ) ) + vec3( 0.0, 0.33, 0.67 ) ) );',
    '        cl = mix( wc * 0.82, mix( vec3( 0.10, 0.12, 0.14 ), vec3( 0.58, 0.55, 0.46 ), clamp( f.y * 0.6 + rnd * 0.2, 0.0, 1.0 ) ), sf ); cl = mix( cl, ac, an ); lw = sf * step( 0.2, rnd ); }',
    '      else if ( sy < 1.5 && abs( mod( ce.x, 3.0 ) - floor( h790( vec2( sd, 3.0 ) ) * 3.0 ) ) < 0.5 ) { float dr = bx790( f, vec4( 0.34, -0.2, 0.66, 0.72 ), aw );',
    '        cl = mix( wc, min( wc * 1.3 + 0.07, vec3( 1.0 ) ), clamp( bx790( f, vec4( 0.29, -0.2, 0.71, 0.77 ), aw ), 0.0, 1.0 ) );',
    '        cl = mix( cl, vec3( 0.34, 0.20, 0.13 ) * ( 0.6 + 0.8 * h790( vec2( sd, 9.0 ) ) ), dr ); lw = 0.0; }',
    '    }',
    '    float cov = ( R.z - R.x ) * ( R.w - R.y );',
    '    diffuseColor.rgb = mix( cl, mix( wc, gl, cov * 0.8 ), fa );',
    '    lit790 = mix( lw, cov * 0.22, fa );',
    '  } }',
    /* 790 A2 (Nov 13): THE INK (COO's look): a soft dark line, about two pixels, down every corner of a wall and along its top; each face carries its
       own 0..1 across (in vF790.x's fraction, 0.3 wide) and up (in vF790.y's fraction, 0.45 wide), so the line keeps its width at any distance; it fades
       out where a face is under ~20 px (far off a building is not drawn as a scribble), and a face with no flags (a gable, a flat roof) gets none */
    INK ? '{ float iu = ( vF790.x - floor( vF790.x + 0.5 ) ) / 0.3, iv = fract( vF790.y ) / 0.45; vec2 fw = vec2( fwidth( iu ), fwidth( iv ) ), sz = 1.0 / max( fw, vec2( 1e-5 ) );' +
    '  float ex = min( iu, 1.0 - iu ) * sz.x, ey = ( 1.0 - iv ) * sz.y; float ik = max( ( 1.0 - smoothstep( 1.5, 2.7, ex ) ) * step( 1e-5, fw.x ) * smoothstep( 14.0, 30.0, sz.x ),' +
    '  ( 1.0 - smoothstep( 1.5, 2.7, ey ) ) * step( 1e-5, fw.y ) * smoothstep( 14.0, 30.0, sz.y ) ); diffuseColor.rgb *= 1.0 - ' + C.INK.toFixed(2) + ' * ik; }' : ''].join(NL);
  function wallMaterial(three, TR, u) {   // the city walls: the travel ground's own program (tag 'feat790') plus the facade; ONE new program
    THREE = three; var m = TR.makeMaterial(THREE, u, 'feat790'), base = m.onBeforeCompile;
    m.extensions = { derivatives: true }; m.name = 'city790:walls';
    m.onBeforeCompile = function (sh, r) {
      base.call(this, sh, r); sh.uniforms.uNight790 = U.night;
      sh.vertexShader = 'attribute vec2 aF790; attribute vec2 aM790; varying vec2 vF790; varying vec2 vM790;' + NL + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + NL + 'vF790 = aF790; vM790 = aM790;');
      sh.fragmentShader = FACADE + NL + sh.fragmentShader.replace('void main() {', 'void main() {' + NL + '  float lit790 = 0.0;')
        .replace('#include <color_fragment>', '#include <color_fragment>' + NL + FACADE_MAIN)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + NL + '  totalEmissiveRadiance += vec3( 1.0, 0.62, 0.27 ) * lit790 * uNight790 * ' + C.NIGHT_K.toFixed(2) + ';');
      st.compiled = (st.compiled || 0) + 1;
    };
    return m;
  }
  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); draw(g, w, h); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* the road sheet: 512 x 256 px, one 8 m period along v; five sections across u (minor, two-lane, avenue, motorway, zebra), each asphalt from px 8 to
     px w-8 of its section (the padding is asphalt too, so the mipmaps never bleed paint across sections) */
  var SEC = { minor: [0, 128], two: [128, 256], ave: [256, 384], hwy: [384, 448], zebra: [448, 512] };
  function roadTex() {
    return canvasTex(512, 256, function (g, w, h) {
      var r = rng(790); g.fillStyle = '#5a5a5e'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 9000; i++) { var v = 70 + (r() * 40 | 0); g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 4) + ',0.55)'; g.fillRect(r() * w | 0, r() * h | 0, 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)); }
      function sec(a, b) { var x0 = a + 8, x1 = b - 8; g.fillStyle = 'rgba(30,30,32,0.35)'; g.fillRect(x0, 0, 5, h); g.fillRect(x1 - 5, 0, 5, h); return [x0, x1]; }
      var Y = '#e8c14a', Wt = '#f2f0e8';
      function line(x, wd, col, dash) { g.fillStyle = col; if (!dash) g.fillRect(x - wd / 2, 0, wd, h); else g.fillRect(x - wd / 2, 0, wd, h * dash); }
      sec(SEC.minor[0], SEC.minor[1]);
      var t = sec(SEC.two[0], SEC.two[1]), cx = (t[0] + t[1]) / 2; line(cx, 4, Y, 0.4);
      t = sec(SEC.ave[0], SEC.ave[1]); cx = (t[0] + t[1]) / 2; line(cx - 3, 3, Y); line(cx + 3, 3, Y); line(t[0] + (cx - t[0]) / 2, 3, Wt, 0.375); line(cx + (t[1] - cx) / 2, 3, Wt, 0.375); line(t[0] + 6, 2, Wt); line(t[1] - 6, 2, Wt);
      t = sec(SEC.hwy[0], SEC.hwy[1]); line(t[0] + 4, 2, Wt); line(t[1] - 4, 2, Wt); line(t[0] + (t[1] - t[0]) / 3, 2, Wt, 0.375); line(t[0] + 2 * (t[1] - t[0]) / 3, 2, Wt, 0.375);
      t = sec(SEC.zebra[0], SEC.zebra[1]); g.fillStyle = Wt; for (var k = 0; k < 6; k++) g.fillRect(t[0] + 2 + k * 8, 0, 5, h);
    });
  }
  function roofTex() {   // shingles: light grey with darker courses and staggered tabs (the vertex colour carries the hue)
    return canvasTex(256, 256, function (g, w, h) {
      var r = rng(137); g.fillStyle = '#d4d4d4'; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 16) { var row = y / 16; g.fillStyle = 'rgba(40,40,40,0.38)'; g.fillRect(0, y + 13, w, 3);
        for (var x = (row % 2) * 16; x < w; x += 32) { var v = 190 + (r() * 50 | 0); g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.fillRect(x + 1, y, 30, 13); g.fillStyle = 'rgba(40,40,40,0.25)'; g.fillRect(x, y, 1, 13); } }
    });
  }
  var mats = null;
  function materials(three, TR, u, ex) {   // world-features' makeMats asks once; ex = its own { ground, wall, roof }
    if (mats) return mats; THREE = three;
    try {
      var R = window.WFR_REALISM && WFR_REALISM.peek ? WFR_REALISM.peek() : null; lin = !!(R && R.enc === THREE.sRGBEncoding); st.lin = lin;
      var walls = wallMaterial(THREE, TR, u), road = TR.makeMaterial(THREE, u, 'feat'); road.map = roadTex(); road.name = 'city790:roads'; road.polygonOffset = true; road.polygonOffsetFactor = -3; road.polygonOffsetUnits = -6;
      ex.roof.map = roofTex(); ex.roof.needsUpdate = true;
      mats = { walls: walls, road: road }; return mats;
    } catch (e) { fault('materials', e); return null; }
  }

  /* ---------- one building (world-features' building() hands it here when the city is on) ---------- */
  function nbSeed(J, cx, cz) { var k = J.tk || [0, 0]; return h2(k[0] * 8 + Math.floor(cx / 300), k[1] * 8 + Math.floor(cz / 300)); }   // a neighbourhood: 300 m cells counted from the tile's corner (stable through every re-centre)
  function pick(list, r) { return list[Math.min(list.length - 1, Math.floor(r * list.length))]; }
  function obb(R) {   // the minimum-area rectangle over the edge directions: { cx, cz, ux, uz (long axis), L, W (half extents), area }
    var n = R.length / 2, best = null;
    for (var i = 0; i < n; i++) { var j = (i + 1) % n, dx = R[2 * j] - R[2 * i], dz = R[2 * j + 1] - R[2 * i + 1], l = Math.hypot(dx, dz); if (l < 0.8) continue; var ux = dx / l, uz = dz / l;
      var s0 = 1e9, s1 = -1e9, t0 = 1e9, t1 = -1e9; for (var k = 0; k < n; k++) { var x = R[2 * k], z = R[2 * k + 1], s = x * ux + z * uz, t = -x * uz + z * ux; if (s < s0) s0 = s; if (s > s1) s1 = s; if (t < t0) t0 = t; if (t > t1) t1 = t; }
      var a = (s1 - s0) * (t1 - t0); if (!best || a < best.area) best = { area: a, ux: ux, uz: uz, s0: s0, s1: s1, t0: t0, t1: t1 }; }
    if (!best) return null; var b = best, sc = (b.s0 + b.s1) / 2, tc = (b.t0 + b.t1) / 2, o = { cx: sc * b.ux - tc * b.uz, cz: sc * b.uz + tc * b.ux, ux: b.ux, uz: b.uz, L: (b.s1 - b.s0) / 2, W: (b.t1 - b.t0) / 2, area: b.area };
    if (o.W > o.L) { var tL = o.L; o.L = o.W; o.W = tL; var ux2 = -o.uz, uz2 = o.ux; o.ux = ux2; o.uz = uz2; }
    return o;
  }
  function inPoly(R, x, z) { var c = false, n = R.length / 2; for (var i = 0, j = n - 1; i < n; j = i++) { var xi = R[2 * i], zi = R[2 * i + 1], xj = R[2 * j], zj = R[2 * j + 1]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; }
  function V(o, x, y, z, nx, ny, nz, c, u, v, F, mu, mv, eu, ev) { var k = o.v(x, y, z, nx, ny, nz, c[0], c[1], c[2], u, v); if (o.f) { o.f.push(F[0] + 8 * F[2] + 0.3 * (eu || 0), Math.floor(F[1] * 256) + 0.45 * (ev || 0)); o.m.push(mu, mv); } return k; }   // 790 A2: eu, ev = the corner's place on its face (0 or 1), for the ink
  var PLAIN = [6, 0, 0, 3], FLATF = [0, 0, 0, 3];
  function nrm(a, b, c) { var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1; return [nx / nl, ny / nl, nz / nl]; }
  function quad(o, a, b, c, d, col, F, want) {   // a planar quad a-b-c-d, turned to face 'want'; flat normal; uv and facade metres along a->b and up
    var n = nrm(a, b, d); if (want && n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) { var t = b; b = d; d = t; n = [-n[0], -n[1], -n[2]]; }
    var lu = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), lv = Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
    var k0 = V(o, a[0], a[1], a[2], n[0], n[1], n[2], col, 0, 0, F, 0, 0, 0, 0), k1 = V(o, b[0], b[1], b[2], n[0], n[1], n[2], col, lu / 2.5, 0, F, lu, 0, 1, 0), k2 = V(o, c[0], c[1], c[2], n[0], n[1], n[2], col, lu / 2.5, lv / 2.5, F, lu, lv, 1, 1), k3 = V(o, d[0], d[1], d[2], n[0], n[1], n[2], col, 0, lv / 2.5, F, 0, lv, 0, 1);
    o.i.push(k0, k1, k2, k0, k2, k3);
  }
  function tri3(o, a, b, c, col, F, want) { var n = nrm(a, b, c); if (want && n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) { var t = b; b = c; c = t; n = [-n[0], -n[1], -n[2]]; }
    o.i.push(V(o, a[0], a[1], a[2], n[0], n[1], n[2], col, 0, 0, F, 0, 0), V(o, b[0], b[1], b[2], n[0], n[1], n[2], col, 0, 0, F, 0, 0), V(o, c[0], c[1], c[2], n[0], n[1], n[2], col, 0, 0, F, 0, 0)); }
  function box(o, cx, cz, ux, uz, hl, hw, y0, y1, col, F) {   // an upright box (no floor), long axis (ux, uz)
    var px = -uz, pz = ux, P = function (s, t, y) { return [cx + ux * s + px * t, y, cz + uz * s + pz * t]; };
    var a = P(-hl, -hw, y0), b = P(hl, -hw, y0), c = P(hl, hw, y0), d = P(-hl, hw, y0), A = P(-hl, -hw, y1), B = P(hl, -hw, y1), Cc = P(hl, hw, y1), D = P(-hl, hw, y1);
    quad(o, a, b, B, A, col, F, [uz, 0, -ux]); quad(o, b, c, Cc, B, col, F, [ux, 0, uz]); quad(o, c, d, D, Cc, col, F, [-uz, 0, ux]); quad(o, d, a, A, D, col, F, [-ux, 0, -uz]); quad(o, A, B, Cc, D, [col[0] * 0.9, col[1] * 0.9, col[2] * 0.9], F, [0, 1, 0]);
  }
  function outOf(J, name, Out) { var o = J[name]; if (!o) { o = J[name] = new Out(); o.f = []; o.m = []; } return o; }
  /* the standing walls stay exactly world-features' (four vertices a wall, feet then tops: its guard reads the feet), with the facade attributes added */
  function building(J, B, Out) {
    var b0 = performance.now();
    try {
      var rings = B.rings, outer = rings[0], n = outer.length / 2, area = Math.abs(B.area), h = B.h, mh = B.mh, top = B.top, bot = B.bot, gC = B.gC, P = B.P, house = B.house;
      var cx = 0, cz = 0; for (var i = 0; i < n; i++) { cx += outer[2 * i]; cz += outer[2 * i + 1]; } cx /= n; cz /= n;
      var nb = nbSeed(J, cx, cz), r1 = hash((B.id | 0) ^ 0x51ed27), r2 = hash((B.id | 0) ^ 0x2c1b3c6d), r3 = hash((B.id | 0) ^ 0x7f4a7c15);
      var tc = tagColour(P.colour), col, style, fl;
      var big = area > 2500 && h <= 16, tall = h > 40;
      if (house) { style = 1; fl = 2.9; col = tc || pick(PAL_HOUSE, r1 < 0.55 ? (nb * 3.7) % 1 : r2);   /* a street shares its look (the neighbourhood), about half the houses their own */ }
      else if (tall) { if (tc ? isBlue(tc) || r1 < 0.45 : r1 < 0.6) { style = 4; fl = 3.7; col = tc && isBlue(tc) ? tc : pick(PAL_GLASS, r2); } else { style = 3; fl = 3.5; col = tc || pick(PAL_STONE, r2); } }
      else if (big) { style = 5; fl = 4.5; col = tc || pick(PAL_STONE, r2); }
      else { if (tc ? isRedBrown(tc) : nb < 0.55 + (r1 - 0.5) * 0.4) { style = 2; fl = 3.2; col = tc || pick(PAL_BRICK, r2); } else { style = 3; fl = 3.3; col = tc || pick(PAL_STONE, r2); } }
      if (B.sacredCol) { style = 0; col = B.sacredCol; house = false; }   /* 830 */
      if (HAS('nofacade')) style = 0; if (tc) st.tagged++; else st.seeded++; st.styles[style]++;
      var shop = 0; if (!B.sacredCol && !tall && !house && J.city && J.city.near(cx, cz, C.SHOP_D + Math.sqrt(area) / 2)) { shop = 1; st.shops++; }
      else if (house && J.city && h >= 7 && J.city.near(cx, cz, C.SHOP_D * 0.8)) { shop = r3 < 0.5 ? 1 : 0; if (shop) st.shops++; }
      col = toLin(col); var F = [style, r2, shop, fl];
      if (J.city) { J.city.addB(cx, cz, area, shop); J.city.occupy(outer); }
      /* the flat parts first decided: a parapet raises the outer walls */
      var pitched = null; if (house && !mh && rings.length === 1 && !HAS('noroof')) { var o = obb(outer); if (o && area / o.area >= C.FILL && o.W * 2 <= C.SHORT_MAX && o.L * 2 <= C.LONG_MAX && o.W >= 2.2) pitched = o; }
      var par = J.detail && !pitched && !mh && h >= C.PAR_H && n <= 48 ? C.PAR : 0, wtop = top + par;
      var W2 = mh > 0 ? outOf(J, 'wallUp', Out) : J.wall;
      for (var r = 0; r < rings.length; r++) { var Rr = rings[r], m = Rr.length / 2, A = 0, j; for (i = 0; i < m; i++) { j = (i + 1) % m; A += Rr[2 * i] * Rr[2 * j + 1] - Rr[2 * j] * Rr[2 * i + 1]; }
        var s = (r > 0 ? 1 : -1) * (A > 0 ? 1 : -1), run = 0;
        for (i = 0; i < m; i++) { j = (i + 1) % m; var ax = Rr[2 * i], az = Rr[2 * i + 1], bx = Rr[2 * j], bz = Rr[2 * j + 1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz); if (len < 0.05) continue;
          var nx = (s > 0 ? -dz : dz) / len, nz = (s > 0 ? dx : -dx) / len, u0 = run / 6, u1 = (run + len) / 6, vt = (wtop - bot) / 6, c0 = [col[0] * 0.78, col[1] * 0.78, col[2] * 0.78];
          var m0 = run, m1 = run + len; run += len + 1.3;
          var k0 = V(W2, ax, bot, az, nx, 0, nz, c0, u0, 0, F, m0, bot - gC, 0, 0), k1 = V(W2, bx, bot, bz, nx, 0, nz, c0, u1, 0, F, m1, bot - gC, 1, 0);
          var k2 = V(W2, ax, wtop, az, nx, 0, nz, col, u0, vt, F, m0, wtop - gC, 0, 1), k3 = V(W2, bx, wtop, bz, nx, 0, nz, col, u1, vt, F, m1, wtop - gC, 1, 1);
          if (s > 0) W2.i.push(k0, k1, k3, k0, k3, k2); else W2.i.push(k0, k3, k1, k0, k2, k3); } }
      var X = outOf(J, 'wallX', Out);
      if (pitched) { roofPitched(J, X, pitched, top, col, r1, r2, r3); st.houses++; }
      else {   /* a flat roof (in the walls' mesh, plain), its parapet's inner face, its rooftop boxes */
        var faces = B.faces, RO = outOf(J, 'roofFlat', Out), base = RO.p.length / 3, rc = toLin(house ? pick(PAL_ROOF, r3) : pick(PAL_FLAT, r3));
        for (r = 0; r < rings.length; r++) for (i = 0; i < rings[r].length; i += 2) V(RO, rings[r][i], top, rings[r][i + 1], 0, 1, 0, rc, rings[r][i] / 10, rings[r][i + 1] / 10, FLATF, 0, 0);
        for (i = 0; i < faces.length; i++) B.tri(RO, base + faces[i][0], base + faces[i][1], base + faces[i][2]);
        st.flat++;
        if (par) { st.parapets++; var pc = [col[0] * 0.86, col[1] * 0.86, col[2] * 0.86];
          for (r = 0; r < rings.length; r++) { Rr = rings[r]; m = Rr.length / 2; A = 0; for (i = 0; i < m; i++) { j = (i + 1) % m; A += Rr[2 * i] * Rr[2 * j + 1] - Rr[2 * j] * Rr[2 * i + 1]; } s = (r > 0 ? 1 : -1) * (A > 0 ? 1 : -1);
            for (i = 0; i < m; i++) { j = (i + 1) % m; var a3 = [Rr[2 * i], top, Rr[2 * i + 1]], b3 = [Rr[2 * j], top, Rr[2 * j + 1]], A3 = [a3[0], wtop, a3[2]], B3 = [b3[0], wtop, b3[2]], ddx = b3[0] - a3[0], ddz = b3[2] - a3[2];
              if (Math.hypot(ddx, ddz) < 0.05) continue; quad(X, a3, b3, B3, A3, pc, PLAIN, s > 0 ? [ddz, 0, -ddx] : [-ddz, 0, ddx]); } } }
        if (J.detail && !house && area >= C.BOX_A && h >= C.BOX_H) { var o2 = obb(outer); if (o2) { var nbx = 1 + Math.floor(r3 * 3);
          for (var q = 0; q < nbx; q++) { var rq = hash((B.id | 0) * 31 + q), rs = hash((B.id | 0) * 17 + q * 7), hl = 1.2 + rq * Math.min(4, o2.L * 0.2), hw = 1 + rs * Math.min(3, o2.W * 0.25), so = (rq - 0.5) * o2.L * 0.9, to = (rs - 0.5) * o2.W * 0.9;
            var bxc = o2.cx + o2.ux * so - o2.uz * to, bzc = o2.cz + o2.uz * so + o2.ux * to; if (!inPoly(outer, bxc, bzc)) continue;
            box(X, bxc, bzc, o2.ux, o2.uz, hl, hw, top - 0.2, top + 1.4 + rq * 2.2, toLin([0.72, 0.71, 0.69]), PLAIN); st.boxes++; } } }
      }
      st.built++;
    } catch (e) { fault('building', e); }
    st.bMax = Math.max(st.bMax || 0, performance.now() - b0);
  }
  function roofPitched(J, X, o, top, wcol, r1, r2, r3) {
    var e = C.EAVE, L = o.L + e, Wd = o.W + e, ux = o.ux, uz = o.uz, px = -uz, pz = ux, cx = o.cx, cz = o.cz, ang = (30 + r1 * 12) * Math.PI / 180, rise = Math.min(5.5, Math.max(1.2, Wd * Math.tan(ang))), ye = top - 0.12, yr = ye + rise;
    var P = function (s, t, y) { return [cx + ux * s + px * t, y, cz + uz * s + pz * t]; }, rc = toLin(pick(PAL_ROOF, r2)), RO = J.roof, hip = r3 < 0.38 || o.L < o.W * 1.25;
    var rf = function (a, b, c, d) { quadRoof(RO, a, b, c, d, rc); };
    var A = P(-L, -Wd, ye), Bq = P(L, -Wd, ye), Cq = P(L, Wd, ye), D = P(-L, Wd, ye);
    if (!hip) { var R0 = P(-L, 0, yr), R1 = P(L, 0, yr); rf(A, Bq, R1, R0); rf(Cq, D, R0, R1);
      var gw = o.W, gL = o.L, gy = ye + rise * (e / Wd), g0 = P(-gL, -gw, top), g1 = P(-gL, gw, top), g2 = P(gL, gw, top), g3 = P(gL, -gw, top), ap0 = P(-gL, 0, yr - 0.05), ap1 = P(gL, 0, yr - 0.05);
      tri3(X, g1, g0, ap0, wcol, PLAIN, [-ux, 0, -uz]); tri3(X, g3, g2, ap1, wcol, PLAIN, [ux, 0, uz]); st.gables++; }
    else { var ri = Math.max(0, L - Wd), H0 = P(-ri, 0, yr), H1 = P(ri, 0, yr); rf(A, Bq, H1, H0); rf(Cq, D, H0, H1); triRoof(RO, Bq, Cq, H1, rc); triRoof(RO, D, A, H0, rc); st.hips++; }
    if (J.detail && r2 < 0.45) { var sAt = (r3 - 0.5) * o.L * 1.2, tAt = (r1 < 0.5 ? -1 : 1) * o.W * 0.45, chx = cx + ux * sAt + px * tAt, chz = cz + uz * sAt + pz * tAt;
      box(X, chx, chz, ux, uz, 0.55, 0.45, top - 0.4, yr + 0.45, toLin(r1 < 0.6 ? [0.58, 0.30, 0.24] : [0.55, 0.53, 0.50]), [6, 0, 0, 3]); st.chimneys++; }
  }
  function quadRoof(o, a, b, c, d, col) {   // a roof plane: uv across (a->b) and up the slope, metres / 2 (the shingle rows run along the eave)
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    var dn = ny < 0; if (dn) { nx = -nx; ny = -ny; nz = -nz; } var lu = Math.hypot(ux, uy, uz) || 1, ex = ux / lu, ey = uy / lu, ez = uz / lu;
    function uv(p) { var rx = p[0] - a[0], ry = p[1] - a[1], rz = p[2] - a[2], s = rx * ex + ry * ey + rz * ez, wx = rx - s * ex, wy = ry - s * ey, wz = rz - s * ez; return [s / 2, Math.hypot(wx, wy, wz) / 2]; }
    var k = [a, b, c, d].map(function (p) { var t = uv(p); return o.v(p[0], p[1], p[2], nx, ny, nz, col[0], col[1], col[2], t[0], t[1]); });
    if (dn) o.i.push(k[0], k[2], k[1], k[0], k[3], k[2]); else o.i.push(k[0], k[1], k[2], k[0], k[2], k[3]);   // world-features' roofs draw single-sided, facing up: the corners are given counter-clockwise from above
  }
  function triRoof(o, a, b, c, col) { var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    var dn = ny < 0; if (dn) { nx = -nx; ny = -ny; nz = -nz; } var lu = Math.hypot(ux, uy, uz) || 1, ex = ux / lu, ey = uy / lu, ez = uz / lu;
    function uv(p) { var rx = p[0] - a[0], ry = p[1] - a[1], rz = p[2] - a[2], s = rx * ex + ry * ey + rz * ez; return [s / 2, Math.hypot(rx - s * ex, ry - s * ey, rz - s * ez) / 2]; }
    var k = [a, b, c].map(function (p) { var t = uv(p); return o.v(p[0], p[1], p[2], nx, ny, nz, col[0], col[1], col[2], t[0], t[1]); }); if (dn) o.i.push(k[0], k[2], k[1]); else o.i.push(k[0], k[1], k[2]); }

  /* ---------- the tile's city state: the main roads (for the shopfronts), the buildings (for the sidewalks and the trees) ---------- */
  var MAJOR = { primary: 1, secondary: 1, tertiary: 1, trunk: 1 }, URBAN = { minor: 1, tertiary: 1, secondary: 1, primary: 1, service: 1, busway: 1 }, DRAWN = { motorway: 1, trunk: 1, primary: 1, secondary: 1, tertiary: 1, minor: 1, service: 1, busway: 1, raceway: 1 };
  function cityState() {
    var segs = new Map(), bl = new Map(), occ = new Map(), CS = 24, BC = C.URB_R, OC = 4;
    function key(a, b) { return (a + 32768) * 65536 + (b + 32768); }
    var S = { lines: [], furn: [],
      addLine: function (cls, pts) { S.lines.push({ cls: cls, p: pts }); if (!MAJOR[cls]) return; for (var i = 2; i < pts.length; i += 2) { var x0 = pts[i - 2], z0 = pts[i - 1], x1 = pts[i], z1 = pts[i + 1];
        var a = Math.floor(Math.min(x0, x1) / CS) - 1, b = Math.floor(Math.max(x0, x1) / CS) + 1, c = Math.floor(Math.min(z0, z1) / CS) - 1, d = Math.floor(Math.max(z0, z1) / CS) + 1;
        if ((b - a) * (d - c) > 400) continue; for (var gx = a; gx <= b; gx++) for (var gz = c; gz <= d; gz++) { var k = key(gx, gz), L = segs.get(k); if (!L) segs.set(k, L = []); L.push(x0, z0, x1, z1); } } },
      near: function (x, z, d) { var r = Math.ceil(d / CS), gx = Math.floor(x / CS), gz = Math.floor(z / CS), d2 = d * d;
        for (var a = gx - r; a <= gx + r; a++) for (var b = gz - r; b <= gz + r; b++) { var L = segs.get(key(a, b)); if (!L) continue;
          for (var i = 0; i < L.length; i += 4) { var x0 = L[i], z0 = L[i + 1], dx = L[i + 2] - x0, dz = L[i + 3] - z0, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / l2)) : 0, ex = x0 + dx * t - x, ez = z0 + dz * t - z; if (ex * ex + ez * ez <= d2) return true; } }
        return false; },
      addB: function (x, z, area, shop) { var k = key(Math.floor(x / BC), Math.floor(z / BC)); bl.set(k, (bl.get(k) || 0) + 1); },
      occupy: function (R) { var x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, n = R.length / 2, i; for (i = 0; i < n; i++) { x0 = Math.min(x0, R[2 * i]); x1 = Math.max(x1, R[2 * i]); z0 = Math.min(z0, R[2 * i + 1]); z1 = Math.max(z1, R[2 * i + 1]); }
        var a = Math.floor(x0 / OC), b = Math.floor(x1 / OC), c = Math.floor(z0 / OC), d = Math.floor(z1 / OC); if ((b - a + 1) * (d - c + 1) > 900) { for (var gx = a; gx <= b; gx++) for (var gz = c; gz <= d; gz++) occ.set(key(gx, gz), 1); return; }
        for (gx = a; gx <= b; gx++) for (gz = c; gz <= d; gz++) if (inPoly(R, (gx + 0.5) * OC, (gz + 0.5) * OC)) occ.set(key(gx, gz), 1);
        for (i = 0; i < n; i++) occ.set(key(Math.floor(R[2 * i] / OC), Math.floor(R[2 * i + 1] / OC)), 1); },
      free: function (x, z) { return !occ.get(key(Math.floor(x / OC), Math.floor(z / OC))); },
      urban: function (x, z) { var gx = Math.floor(x / BC), gz = Math.floor(z / BC), n = 0; for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) n += bl.get(key(gx + a, gz + b)) || 0; return n >= C.URB_N; },
      ri: 0, phase: 0 };
    return S;
  }
  function begin(J, t) { if (!on() || !mats) return null; J.city = cityState(); J.tk = [t.x, t.y]; J.detail = !(t.d > C.DETAIL_D); t.detail790 = J.detail; J.wall.f = []; J.wall.m = []; return J.city; }
  function road(J, cls, pts) { if (!J.city || !DRAWN[cls] || HAS('nostreet')) return false; J.city.addLine(cls, pts); return true; }

  /* ---------- the roads, after the buildings (a slice at a time): junctions, paint that stops short of them, zebras, sidewalks, the furniture ---------- */
  function junctions(S) {
    if (S.jn) return; var map = new Map(), q = function (x, z) { return Math.round(x * 2) + ',' + Math.round(z * 2); };
    S.lines.forEach(function (L, li) { if (!URBAN[L.cls] && !MAJOR[L.cls]) return; for (var i = 0; i < L.p.length; i += 2) { var k = q(L.p[i], L.p[i + 1]), e = map.get(k); if (!e) map.set(k, e = { x: L.p[i], z: L.p[i + 1], ls: [], w: 0, arms: 0 }); if (e.ls.indexOf(li) < 0) e.ls.push(li); e.w = Math.max(e.w, (C.W[L.cls] || 6) / 2); e.arms += (i === 0 || i === L.p.length - 2) ? 1 : 2; } });
    S.jn = []; S.jAt = new Map(); map.forEach(function (e, k) { if (e.ls.length >= 2) { S.jn.push(e); S.jAt.set(k, e); } }); S.q = q;
  }
  function stepRoads(J, deadline, H, now) {
    var S = J.city; if (!S) return true; junctions(S);
    while (S.ri < S.lines.length) { if (now() > deadline) return false; var r0 = now(); try { oneRoad(J, S, S.lines[S.ri]); } catch (e) { fault('road', e); } st.rMax = Math.max(st.rMax || 0, now() - r0); S.ri++; }
    return true;
  }
  function oneRoad(J, S, L) {
    var cls = L.cls, p = L.p, w = C.W[cls] || 6, hw = w / 2, urban = !!URBAN[cls], H = J.Hf, n0 = p.length / 2; if (n0 < 2) return;
    /* the arc length of each vertex and the junction cuts along it */
    var s = [0], i; for (i = 1; i < n0; i++) s.push(s[i - 1] + Math.hypot(p[2 * i] - p[2 * i - 2], p[2 * i + 1] - p[2 * i - 1]));
    var len = s[n0 - 1]; if (len < 1) return; var cuts = [], jvs = [];
    /* urban? (a building within 40 m of most of it) */
    var hits = 0, tries = 0; for (var t = 0; t <= len; t += 25) { var pt = at(p, s, t); tries++; if (S.urban(pt[0], pt[1])) hits++; } var town = urban && hits >= Math.max(1, tries * 0.4);
    for (i = 0; i < n0; i++) { var e = S.jAt.get(S.q(p[2 * i], p[2 * i + 1])); if (e) { var dj = e.w + 1.5, zc = town && cls !== 'service' && e.arms >= 3 ? 3.4 : 0; cuts.push([s[i] - dj - zc, s[i] + dj + zc]); jvs.push([s[i], e, dj, i]); } }
    var sec = cls === 'motorway' || cls === 'trunk' ? SEC.hwy : (cls === 'primary' || cls === 'secondary') ? SEC.ave : cls === 'tertiary' ? SEC.two : SEC.minor;
    if (!town && (cls === 'minor' || cls === 'service')) sec = SEC.minor;
    /* the resampled stations: every SUB metres, plus each cut's ends */
    var ts = []; for (i = 0; i < n0; i++) ts.push(s[i]); for (t = C.SUB; t < len; t += C.SUB) ts.push(t); cuts.forEach(function (c) { if (c[0] > 0 && c[0] < len) ts.push(c[0]); if (c[1] > 0 && c[1] < len) ts.push(c[1]); });
    ts.sort(function (a, b) { return a - b; }); var T2 = []; for (i = 0; i < ts.length; i++) if (!T2.length || ts[i] - T2[T2.length - 1] > 0.05) T2.push(ts[i]);
    cuts.sort(function (a, b) { return a[0] - b[0]; }); var cmax = []; for (i = 0; i < cuts.length; i++) cmax.push(Math.max(cuts[i][1], i ? cmax[i - 1] : -1e9));
    var inCut = function (tt) { return nearCut(cuts, tt, -0.01, cmax); };
    var side = town ? (C.SIDE[cls] || 0) : 0, Ro = J.road || (J.road = new J.Out()), G = J.gnd, ac = cls === 'service' ? [0.9, 0.9, 0.9] : [1, 1, 1], scol = toLin([0.74, 0.73, 0.70]), ccol = toLin([0.58, 0.57, 0.55]);
    var prev = null, prevS = null;
    for (i = 0; i < T2.length; i++) { var tt = T2[i], q0 = at(p, s, tt), cut = inCut(tt - 0.02) || inCut(tt + 0.02), dir = q0[2];
      var nx = -dir[1], nz = dir[0], lx = q0[0] + nx * hw, lz = q0[1] + nz * hw, rx = q0[0] - nx * hw, rz = q0[1] - nz * hw;
      var yl = Math.max(0, H(lx, lz)) + C.LIFT_A, yr = Math.max(0, H(rx, rz)) + C.LIFT_A, v = tt / C.PERIOD;
      var segPlain = i > 0 && inCut((T2[i - 1] + tt) / 2), u0 = segPlain ? 64 / 512 : (sec[0] + 8) / 512, u1 = segPlain ? 64 / 512 : (sec[1] - 8) / 512;
      var kl = Ro.v(lx, yl, lz, 0, 1, 0, ac[0], ac[1], ac[2], u0, v), kr = Ro.v(rx, yr, rz, 0, 1, 0, ac[0], ac[1], ac[2], u1, v); if (J.drp) { J.drp(Ro, kl, C.LIFT_A); J.drp(Ro, kr, C.LIFT_A); }   /* 798 */
      if (prev) { var pl = prev[0], pr = prev[1]; if (prev[2] !== segPlain) { var a0 = Ro.p.length / 3; Ro.v(Ro.p[3 * pl], Ro.p[3 * pl + 1], Ro.p[3 * pl + 2], 0, 1, 0, ac[0], ac[1], ac[2], u0, Ro.uv[2 * pl + 1]); Ro.v(Ro.p[3 * pr], Ro.p[3 * pr + 1], Ro.p[3 * pr + 2], 0, 1, 0, ac[0], ac[1], ac[2], u1, Ro.uv[2 * pr + 1]); pl = a0; pr = a0 + 1; if (J.drp) { J.drp(Ro, a0, C.LIFT_A); J.drp(Ro, a0 + 1, C.LIFT_A); } }
        J.tri(Ro, pl, pr, kl); J.tri(Ro, pr, kr, kl); }
      prev = [kl, kr, segPlain];
      if (side > 0) {   /* 798: the two sidewalks stand a curb (C.CURB) over the street, each its own strip from the kerb out, with the kerb's face as a steep bevel
           down to the road; inside a junction they stop (was: one strip under the whole street, 6 cm UNDER the road). Marth: "how I'm walking through the pavement" */
        var ow = hw + side, kc = hw - 0.12, SW = [[ow, C.LIFT_S, 0], [hw, C.LIFT_S, 0], [kc, C.LIFT_A + 0.01, 1], [-kc, C.LIFT_A + 0.01, 1], [-hw, C.LIFT_S, 0], [-ow, C.LIFT_S, 0]], s0 = -1;
        for (var si = 0; si < 6; si++) { var o6 = SW[si][0], wx = q0[0] + nx * o6, wz = q0[1] + nz * o6, cc = SW[si][2] ? ccol : scol, kv = G.v(wx, Math.max(0, H(wx, wz)) + SW[si][1], wz, 0, 1, 0, cc[0], cc[1], cc[2]); if (J.drp) J.drp(G, kv, SW[si][1]); if (si === 0) s0 = kv; }
        if (prevS != null && !segPlain) for (var sp2 = 0; sp2 < 5; sp2++) { if (sp2 === 2) continue; J.tri(G, prevS + sp2, prevS + sp2 + 1, s0 + sp2); J.tri(G, prevS + sp2 + 1, s0 + sp2 + 1, s0 + sp2); }
        prevS = s0; } }
    st.roads++; if (side > 0) st.sidewalks++;
    /* zebras: each arm of a junction of three arms or more, in town */
    if (town && cls !== 'service') for (i = 0; i < jvs.length; i++) { var jv = jvs[i]; if (jv[1].arms < 3) continue;
      [-1, 1].forEach(function (sg) { var tz = jv[0] + sg * (jv[2] + 1.6); if (tz < 1 || tz > len - 1) return; zebra(J, Ro, at(p, s, tz), hw, H); st.xings++; }); }
    /* the furniture (town only): trees both sides, lamps alternating, a bench now and then on the avenues, a post at the corners */
    if (!town || cls === 'service') return; var Fu = S.furn, hs = (C.SIDE[cls] || 1.8), stepT = cls === 'primary' ? C.TREE_STEP * 1.6 : C.TREE_STEP, seed = ((J.ax * 13 + J.az * 7) | 0) ^ (S.ri * 2654435761 | 0);
    for (t = stepT * 0.5; t < len; t += stepT) { if (nearCut(cuts, t, 5, cmax)) continue; var a = at(p, s, t), dx = a[2][0], dz = a[2][1];
      for (var sg = -1; sg <= 1; sg += 2) { var r = hash(seed + ((t * 10) | 0) * 3 + sg); if (r < 0.18) continue; var off = hw + hs * 0.6, x = a[0] - dz * off * sg, z = a[1] + dx * off * sg; if (!S.free(x, z)) continue;
        Fu.push(0, x, Math.max(0, H(x, z)), z, r * 6.283, 0.8 + hash(seed ^ ((t * 7) | 0)) * 0.5, r); st.trees++; } }
    var k2 = 0; for (t = C.LAMP_STEP * 0.4; t < len; t += C.LAMP_STEP) { if (nearCut(cuts, t, 3, cmax)) continue; var b = at(p, s, t), sg2 = (k2++ & 1) ? 1 : -1, o2 = hw + 0.45, lx2 = b[0] - b[2][1] * o2 * sg2, lz2 = b[1] + b[2][0] * o2 * sg2;
      if (!S.free(lx2, lz2)) continue; Fu.push(1, lx2, Math.max(0, H(lx2, lz2)), lz2, Math.atan2(b[2][0] * sg2, b[2][1] * sg2), 1, 0); st.lamps++;
      if ((cls === 'primary' || cls === 'secondary' || cls === 'tertiary') && hash(seed + k2 * 101) < 0.22) { var bo = hw + hs * 0.7, bx = b[0] - b[2][1] * bo * -sg2, bz = b[1] + b[2][0] * bo * -sg2; if (S.free(bx, bz)) { Fu.push(2, bx, Math.max(0, H(bx, bz)), bz, Math.atan2(-b[2][1] * sg2, b[2][0] * sg2), 1, 0); st.benches++; } } }
    for (i = 0; i < jvs.length; i++) { if (jvs[i][1].arms < 3 || jvs[i][1].post) continue; jvs[i][1].post = 1; var c0 = at(p, s, Math.max(0.5, Math.min(len - 0.5, jvs[i][0] + (jvs[i][0] < len / 2 ? 1 : -1) * (jvs[i][2] + 0.5)))), po = hw + 0.6, px2 = c0[0] - c0[2][1] * po, pz2 = c0[1] + c0[2][0] * po;
      if (S.free(px2, pz2)) { Fu.push(3, px2, Math.max(0, H(px2, pz2)), pz2, Math.atan2(c0[2][0], -c0[2][1]), 1, 0); st.signs++; } }
  }
  function nearCut(cuts, t, m, cmax) {   // is t within m of a cut? (cuts sorted by start; cmax: the running furthest end)
    var lo = 0, hi = cuts.length - 1, k = -1; while (lo <= hi) { var md = (lo + hi) >> 1; if (cuts[md][0] - m < t) { k = md; lo = md + 1; } else hi = md - 1; }
    if (k < 0) return false; if (cmax) return t < cmax[k] + m; for (var q = k; q >= 0; q--) if (t < cuts[q][1] + m) return true; return false; }
  var AT = { p: null, i: 1 };
  function at(p, s, t) {   // the point at arc length t: [x, z, [dx, dz]]; a cursor per line (t mostly rises), so a long road is walked once
    var n = s.length, i = AT.p === p ? AT.i : 1; if (i > n - 1 || s[i - 1] > t) i = 1; while (i < n - 1 && s[i] < t) i++; AT.p = p; AT.i = i; var a = i - 1, l = s[i] - s[a] || 1, k = Math.max(0, Math.min(1, (t - s[a]) / l)), dx = (p[2 * i] - p[2 * a]) / l, dz = (p[2 * i + 1] - p[2 * a + 1]) / l;
    return [p[2 * a] + (p[2 * i] - p[2 * a]) * k, p[2 * a + 1] + (p[2 * i + 1] - p[2 * a + 1]) * k, [dx, dz]];
  }
  function zebra(J, Ro, c, hw, H) { var dx = c[2][0], dz = c[2][1], nx = -dz, nz = dx, d = 1.5, y = function (x, z) { return Math.max(0, H(x, z)) + C.LIFT_A + 0.03; };
    var pts = [[c[0] - dx * d + nx * hw, c[1] - dz * d + nz * hw], [c[0] - dx * d - nx * hw, c[1] - dz * d - nz * hw], [c[0] + dx * d - nx * hw, c[1] + dz * d - nz * hw], [c[0] + dx * d + nx * hw, c[1] + dz * d + nz * hw]];
    var u0 = (SEC.zebra[0] + 8) / 512, u1 = (SEC.zebra[1] - 8) / 512, k = [[u0, 0], [u1, 0], [u1, 0.4], [u0, 0.4]].map(function (uv, i) { var kz = Ro.v(pts[i][0], y(pts[i][0], pts[i][1]), pts[i][1], 0, 1, 0, 1, 1, 1, uv[0], uv[1]); if (J.drp) J.drp(Ro, kz, C.LIFT_A + 0.03); return kz; });
    J.tri(Ro, k[0], k[1], k[2]); J.tri(Ro, k[0], k[2], k[3]); }
  function finishTile(t, J) { if (!J.city) return; t.city = J.city.furn.length ? new Float32Array(J.city.furn) : null; t.cityN = J.city.furn.length / 7; J.city = null; }

  /* ---------- the furniture pools: four instanced meshes in the vegetation's program, filled from the tiles near her ---------- */
  var pool = null, lastAt = null, lastVer = -1, ver = 0;
  function shadeGeo(g, lo, hi, y0, y1, tint) { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); var p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (var i = 0; i < p.count; i++) { var k = Math.max(0, Math.min(1, (p.getY(i) - y0) / ((y1 - y0) || 1))), s = lo + (hi - lo) * k; c[3 * i] = s * tint[0]; c[3 * i + 1] = s * tint[1]; c[3 * i + 2] = s * tint[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g; }
  function mergeG(list) { var P = [], N = [], Cc = []; list.forEach(function (g) { var p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color; for (var i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); Cc.push(c.getX(i), c.getY(i), c.getZ(i)); } });
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.computeBoundingSphere(); return g; }
  function geos() {
    var T3 = THREE, L = function (c) { return toLin(c); };
    var trunk = shadeGeo(new T3.CylinderGeometry(0.16, 0.24, 3.0, 5, 1, true).translate(0, 1.5, 0), 0.5, 0.8, 0, 3, L([0.42, 0.30, 0.22]));
    var c1 = shadeGeo(new T3.IcosahedronGeometry(2.3, 0).translate(0, 4.9, 0), 0.62, 1.08, 2.6, 7.2, [1, 1, 1]), c2 = shadeGeo(new T3.IcosahedronGeometry(1.6, 0).translate(1.3, 4.1, 0.5), 0.6, 1.0, 2.6, 6, [1, 1, 1]), c3 = shadeGeo(new T3.IcosahedronGeometry(1.5, 0).translate(-1.1, 4.3, -0.7), 0.6, 1.0, 2.6, 6, [1, 1, 1]), c4 = shadeGeo(new T3.IcosahedronGeometry(1.3, 0).translate(0.2, 6.2, 0.4), 0.8, 1.1, 5, 7.5, [1, 1, 1]);
    var dk = L([0.20, 0.21, 0.22]), pole = shadeGeo(new T3.CylinderGeometry(0.07, 0.11, 6.2, 5, 1, true).translate(0, 3.1, 0), 0.8, 1, 0, 6, dk), arm = shadeGeo(new T3.BoxGeometry(1.4, 0.1, 0.1).translate(0.65, 6.1, 0), 1, 1, 0, 1, dk), head = shadeGeo(new T3.BoxGeometry(0.6, 0.18, 0.32).translate(1.25, 6.0, 0), 1, 1, 0, 1, dk), lens = shadeGeo(new T3.PlaneGeometry(0.5, 0.26).rotateX(Math.PI / 2).translate(1.25, 5.9, 0), 1, 1, 0, 1, L([1.0, 0.93, 0.72]));
    var wood = L([0.55, 0.36, 0.20]), seat = shadeGeo(new T3.BoxGeometry(1.7, 0.07, 0.45).translate(0, 0.46, 0), 1, 1, 0, 1, wood), back = shadeGeo(new T3.BoxGeometry(1.7, 0.36, 0.06).translate(0, 0.78, -0.2), 1, 1, 0, 1, wood), lg = L([0.18, 0.18, 0.19]), l1 = shadeGeo(new T3.BoxGeometry(0.07, 0.46, 0.45).translate(-0.7, 0.23, 0), 1, 1, 0, 1, lg), l2 = shadeGeo(new T3.BoxGeometry(0.07, 0.46, 0.45).translate(0.7, 0.23, 0), 1, 1, 0, 1, lg);
    var sp = shadeGeo(new T3.CylinderGeometry(0.04, 0.05, 3.0, 4, 1, true).translate(0, 1.5, 0), 0.8, 1, 0, 3, L([0.45, 0.46, 0.48])), b1 = shadeGeo(new T3.BoxGeometry(0.95, 0.2, 0.03).translate(0.3, 2.85, 0), 1, 1, 0, 1, L([0.10, 0.36, 0.22])), b2 = shadeGeo(new T3.BoxGeometry(0.03, 0.2, 0.95).translate(0, 2.62, 0.3), 1, 1, 0, 1, L([0.10, 0.36, 0.22]));
    return [mergeG([trunk, c1, c2, c4]), mergeG([pole, arm, head, lens]), mergeG([seat, back, l1, l2]), mergeG([sp, b1, b2])];
  }
  var SEASON_PAL = { autumn: [0xe3b63a, 0xd9a02f, 0xd8892c, 0xdb7a2a, 0xd0642e, 0xc4552c, 0xb8452e, 0xa8402a, 0xe8c04a, 0x9a3a28], summer: [0x4f9142, 0x5b9a48, 0x3f7f3a, 0x6aa24e, 0x4a8a44], spring: [0x7fb85a, 0x8cc068, 0xe8b8c8, 0x6aa850, 0xf0d0dc], winter: [0x8a7a68, 0x7a6c5c, 0x9a8a76] };
  function seasonAt(lat) {
    var s = 'autumn'; try { s = window.WFR_SEASONS && WFR_SEASONS.season ? WFR_SEASONS.season() : 'autumn'; } catch (e) { s = 'autumn'; }
    if (s === 'off') s = 'summer'; if (Math.abs(lat) < 23.5) return 'summer';
    if (lat < 0) s = { autumn: 'spring', spring: 'autumn', winter: 'summer', summer: 'winter' }[s] || s; return s;
  }
  function makePool(group) {
    var V2 = window.WFR_VEG && WFR_VEG.api && WFR_VEG.api(), mat = V2 && V2.material; if (!mat) return null;
    var G = geos(), names = ['tree', 'lamp', 'bench', 'sign'], caps = [C.CAP.tree, C.CAP.lamp, C.CAP.bench, C.CAP.sign];
    var P = { meshes: names.map(function (nm, i) { var im = new THREE.InstancedMesh(G[i], mat, caps[i]); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(caps[i] * 3), 3); im.instanceColor.setUsage(THREE.DynamicDrawUsage);
      im.count = 0; im.frustumCulled = false; im.name = 'city790:' + nm; im.layers.set(7); im.renderOrder = -9.35;   /* with the trees: before the travel pass's depth clear (-9.3), so the buildings hide them */ im.castShadow = im.receiveShadow = false; im.matrixAutoUpdate = false; group.add(im); return im; }), caps: caps, tris: G.map(function (g) { return g.attributes.position.count / 3; }) };
    P.m4 = new THREE.Matrix4(); P.q = new THREE.Quaternion(); P.v = new THREE.Vector3(); P.s = new THREE.Vector3(); P.c = new THREE.Color(); P.up = new THREE.Vector3(0, 1, 0); return P;
  }
  function tick(cam, tiles, frameNo, T, group, agl) {
    if (!mats) return; var t0 = performance.now();
    try {
      var R = window.WFR_REALISM; U.night.value = st.night = R && R.nightNow ? +R.nightNow() || 0 : 0;
      if (!pool) { pool = makePool(group); if (!pool) return; }
      if (pool.meshes[0].parent !== group) pool.meshes.forEach(function (m) { group.add(m); });
      var moved = !lastAt || Math.hypot(cam.x - lastAt[0], cam.z - lastAt[1]) > C.MOVE || T.f !== lastAt[2];
      if (!moved && lastVer === ver) return;
      lastAt = [cam.x, cam.z, T.f]; lastVer = ver;
      var cnt = [0, 0, 0, 0], RR = [C.TREE_R, C.LAMP_R, C.BENCH_R, C.BENCH_R], low = agl < C.AGL_MAX, W = window.WFR_WORLD, ll = W.toLatLon(T.f, cam.x, cam.z), pal = SEASON_PAL[seasonAt(ll.lat)] || SEASON_PAL.summer;
      st.season = seasonAt(ll.lat);
      if (low && !HAS('nofurn')) tiles.forEach(function (t) { if (!t.city || t.state !== 'built' || !t.meshes.length || t.used !== frameNo) return; var m0 = t.meshes[0], px = m0.position.x, pz = m0.position.z, k = m0.scale.x, A = t.city;
        if (t.d > C.TREE_R + 200) return;
        for (var i = 0; i < A.length; i += 7) { var kind = A[i], x = px + A[i + 1] * k, z = pz + A[i + 3] * k, dx = x - cam.x, dz = z - cam.z; if (dx * dx + dz * dz > RR[kind] * RR[kind] || cnt[kind] >= pool.caps[kind]) continue;
          pool.v.set(x, A[i + 2], z); pool.q.setFromAxisAngle(pool.up, A[i + 4]); var sc = A[i + 5]; pool.s.set(sc, sc * (kind === 0 ? 0.9 + A[i + 6] * 0.25 : 1), sc); pool.m4.compose(pool.v, pool.q, pool.s);
          var M = pool.meshes[kind]; M.setMatrixAt(cnt[kind], pool.m4);
          if (kind === 0) { pool.c.setHex(pal[Math.floor(A[i + 6] * pal.length) % pal.length]); if (lin) pool.c.convertSRGBToLinear(); } else pool.c.setRGB(1, 1, 1);
          M.setColorAt(cnt[kind], pool.c); cnt[kind]++; } });
      for (var i = 0; i < 4; i++) { var M = pool.meshes[i]; M.count = cnt[i]; M.instanceMatrix.needsUpdate = true; if (M.instanceColor) M.instanceColor.needsUpdate = true; }
      st.shown = { tree: cnt[0], lamp: cnt[1], bench: cnt[2], sign: cnt[3] }; st.gathers++;
    } catch (e) { fault('tick', e); }
    var ms = performance.now() - t0; st.gatherMs = +ms.toFixed(2); st.gatherMax = Math.max(st.gatherMax, ms);
  }
  function changed() { ver++; }
  function restale(t) { return !!(mats && on() && t.z === 14 && t.detail790 === false && t.d < C.DETAIL_UP); }   /* world-features asks: a far-built tile she now nears is rebuilt with its detail */
  function peek() { var o = JSON.parse(JSON.stringify(st)); o.on = on(); o.ink = INK; o.mats = !!mats; o.pool = pool ? { tris: pool.tris, counts: pool.meshes.map(function (m) { return m.count; }) } : null; return o; }
  return { C: C, on: on, materials: materials, begin: begin, building: building, road: road, stepRoads: stepRoads, finishTile: finishTile, tick: tick, changed: changed, restale: restale, peek: peek, tagColour: tagColour, obb: obb, U: U, version: 1,
    g830: { V: V, obb: obb, toLin: toLin, quadRoof: quadRoof, triRoof: triRoof } };   /* 830: the wall's own vertex and roof planes, for WFR_SACRED830 */
})();

/* ---------- BOARD 830 (Nov 14 2026): HOUSES OF PRAYER, GOLF AND DRIVE-THRUS, from the z14 tiles world-features.js already reads. Su, Nov 14 2026.
   Marth, verbatim: "We need to add people golfing, and drive thrus and mosques and arabs :) especially in upper africa and Middle East".
   WHAT ROUGE SEES (Standard only; Classic is frozen, board 645), and the data each piece reads (OpenMapTiles via OpenFreeMap, OSM, ODbL, credited on
   screen by world-features.js):
     MOSQUES     at every poi class place_of_worship whose subclass (OSM religion) is muslim: the building the point stands in (or the nearest within
                 20 m) gets a dome and minaret(s) in its region's style: the Maghreb a square minaret with a small lantern and green tile roofs; Egypt
                 and Sudan a Mamluk tiered octagonal minaret with a bulb top and a stone dome; Turkey and the Ottoman Balkans pencil minarets with lead
                 cones, a lead dome and half-domes; Iran, Afghanistan and Central Asia a turquoise bulb dome, an iwan and blue minarets; South Asia a
                 white onion dome; the Gulf, the Levant and Iraq a white or gold dome and slender round minarets with balconies. A crescent finial at
                 most. No figure, no image. Where the map already draws the minarets or the domes as parts (Hassan II, the Blue Mosque, Sheikh Zayed),
                 those parts are crowned (a cap, a dome on the round part) and nothing is added beside them. Outside the lands where a mosque is
                 nearly always purpose-built, a mosque is dressed only when the map itself draws a minaret or a dome part (a converted hall in London
                 keeps its own roof: nothing is invented).
     GOLF        landcover subclass golf_course: the course mown in two-tone stripes (water and the bunkers left out), the map's sand polygons on the
                 course as bunkers, and the small round grass polygons on it (8+ corners, 200-2,000 m2: how OSM draws a green) as greens with a flag.
                 world-life790.js puts the golfers and the carts on the same polygons.
     DRIVE-THRU  the OpenMapTiles schema has no drive_through tag (checked: transportation.service and poi carry none), so: a fast_food poi of a
                 drive-thru chain (by its name) in a country where drive-thrus are the rule (the US, Canada, Australia, New Zealand, the Gulf), standing
                 in a FREE-STANDING small building (90-1,000 m2, no other building within 5 m): the lane round it, the menu board, a canopy at the
                 window. world-life790.js queues the cars and hands her a treat at the window.
   COST: geometry only, inside the tile's own meshes (the walls', the roofs' and the ground's: the programs they already use), built in slices with
   the tile's job; nothing joins the scene and no program compiles. localStorage 'wfr.sacred830' = 'off' is the game before this unit (the guard's control). */
window.WFR_SACRED830 = (function () {
  'use strict';
  var C = { MAX_MOSQUES: 90, MAX_DT: 16, MAX_GOLF: 8, STRIPE: 12, SUB: 30, LIFT_G: 0.34, LIFT_B: 0.42, LIFT_L: 0.46, DT_OFF: 4.2, SEG: 14, FLAG: 3.4 };
  var MODE = (function () { try { return localStorage.getItem('wfr.sacred830') || 'on'; } catch (e) { return 'on'; } })();
  function on() { return MODE !== 'off' && !(window.WFR_DOOR && window.WFR_DOOR.classic) && !!(window.WFR_CITY790 && WFR_CITY790.on() && WFR_CITY790.g830); }
  var st = { mode: MODE, tiles: 0, mosques: 0, skipped: 0, domes: 0, mappedDomes: 0, minarets: 0, mappedMinarets: 0, golf: 0, stripes: 0, bunkers: 0, greens: 0, dt: 0, dtNo: 0, ms: 0, msMax: 0, faults: [], styles: {}, items: new Map() };
  function fault(w, e) { if (st.faults.length < 12) st.faults.push(w + ': ' + (e && e.message || e)); }
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h >>> 0) / 4294967296; }

  /* ---------- where: the region (people's dress in world-life790.js, the mosques' style here). Rough boxes, first match wins (DRAFT, for Izumi's chart) ---------- */
  var BOX = [
    ['levant', 31.22, 31.6, 34.2, 34.57], [null, 31.7, 31.88, 35.08, 35.27], ['levant', 31.35, 32.55, 34.95, 35.57], [null, 30.5, 33.35, 34.2, 35.57], [null, 29.45, 30.5, 34.2, 34.98],   // Gaza; Jerusalem (mixed: left as it is); the West Bank; then Israel (no Arab dress invented there)
    [null, 40.0, 43.6, 43.6, 50.9], [null, 41.45, 43.6, 41.5, 43.6], [null, 38.8, 40.0, 44.8, 48.0], [null, 41.75, 44.2, 22.0, 28.0], [null, 40.6, 41.75, 22.0, 26.6],   // the Caucasus, Bulgaria, Greek Thrace: not Turkey
    [null, 38.95, 39.4, 25.8, 26.65], [null, 38.15, 38.62, 25.8, 26.2], [null, 37.65, 37.82, 26.55, 27.1], [null, 36.7, 36.92, 26.9, 27.4], [null, 35.85, 36.48, 27.65, 28.3], [null, 34.5, 35.75, 32.2, 34.7],   // the Greek islands off Turkey, Cyprus
    [null, 37.7, 42.8, 52.5, 66.7], [null, 29.8, 38.5, 60.9, 75.0], [null, 24.5, 29.8, 61.6, 63.5], ['gulf', 28.5, 30.1, 46.5, 48.5],   // Turkmenistan, Afghanistan, Pakistan: not Iran; Kuwait before Iraq
    ['kurd', 35.0, 37.4, 43.4, 46.3], ['kurd', 36.8, 39.8, 38.5, 44.8], ['kurd', 34.3, 37.0, 45.0, 48.0], ['kurd', 36.3, 37.4, 40.0, 42.4],
    ['turkey', 35.8, 42.2, 25.6, 44.8, 'tr'], ['levant', 33.05, 34.7, 35.1, 36.65], ['levant', 32.3, 37.3, 35.7, 42.4], ['levant', 29.2, 33.4, 34.9, 39.3],
    ['iraq', 29.0, 37.4, 38.8, 48.6, 'iraq'], ['gulf_city', 22.6, 26.1, 51.5, 56.4], ['gulf_city', 24.4, 26.2, 50.7, 51.7], ['gulf', 25.8, 26.35, 50.3, 50.85],
    ['gulf', 16.6, 24.9, 52.0, 59.9], ['gulf', 25.6, 26.4, 56.0, 56.5], ['iran', 25.0, 39.8, 44.0, 63.4], ['egypt', 22.0, 31.7, 24.7, 36.9, 'egypt'], ['gulf', 16.3, 32.2, 34.5, 55.7], ['gulf', 12.1, 19.0, 42.5, 53.1],
    ['tuareg', 16.0, 26.0, -5.0, 12.0], ['sudan', 8.7, 22.0, 21.8, 38.6], ['libya', 19.5, 33.2, 9.3, 25.2],
    ['amazigh', 29.5, 33.5, -9.5, -4.0], ['amazigh', 34.6, 35.4, -5.6, -2.9], ['amazigh', 36.3, 36.95, 3.6, 5.2], ['amazigh', 34.8, 35.7, 5.6, 7.2],
    ['maghreb', 30.2, 37.6, 7.5, 11.6], ['maghreb', 18.9, 37.1, -8.7, 12.0], ['maghreb', 27.6, 35.95, -13.2, -1.0], ['maghreb', 20.7, 27.7, -17.1, -8.7], ['maghreb', 14.7, 27.3, -17.1, -4.8]];
  function region(lat, lon) {
    for (var i = 0; i < BOX.length; i++) { var b = BOX[i]; if (lat < b[1] || lat > b[2] || lon < b[3] || lon > b[4]) continue;
      if (b[5] === 'iraq' && (!(lon < 45.6 || (lat < 31.0 && lon < 48.4)) || lat < 32.2 - (lon - 39) * 0.55)) continue;   // Iraq's east edge leans (Kermanshah and Ahvaz are Iran), its south-west edge too (Arar and Sakaka are Saudi)
      if (b[5] === 'tr' && ((lon > 42.2 && lat < 37.15) || (lon > 36.6 && lon <= 42.2 && lat < 36.75) || (lon > 35.9 && lon <= 36.6 && lat < 35.95))) continue;   // Turkey's south edge: Aleppo and Mosul are not Turkey, Hatay is
      if (b[5] === 'egypt' && lat >= 24 && lon > 34.9) continue;                     // Egypt ends at the Gulf of Aqaba; the Saudi coast is east of it
      return b[0]; }
    return null;
  }
  var OTTO = [[42.5, 45.3, 15.7, 19.7], [41.8, 43.3, 20.0, 21.8], [39.6, 42.7, 19.2, 21.1]], PERS = [[29.4, 38.5, 60.5, 74.9], [37.0, 45.6, 55.9, 73.2]], MUGH = [[23.6, 37.1, 60.9, 77.8], [20.6, 26.6, 88.0, 92.7], [8.0, 30.5, 68.0, 88.0]];
  function inB(B, lat, lon) { for (var i = 0; i < B.length; i++) { var b = B[i]; if (lat >= b[0] && lat <= b[1] && lon >= b[2] && lon <= b[3]) return true; } return false; }
  function mosqueStyle(lat, lon) {   // null: not a land where a mosque is nearly always purpose-built (dressed only where the map draws its minaret or dome)
    var r = region(lat, lon);
    if (r === 'maghreb' || r === 'amazigh' || r === 'libya' || r === 'tuareg') return 'maghreb';
    if (r === 'egypt' || r === 'sudan') return 'mamluk';
    if (r === 'turkey' || (r === 'kurd' && lat > 36.8 && lon < 44.8) || inB(OTTO, lat, lon)) return 'ottoman';
    if (r === 'iran' || inB(PERS, lat, lon)) return 'persian';
    if (r) return 'arab';
    if (inB(MUGH, lat, lon)) return 'mughal';
    return null;
  }

  /* ---------- the drive-thru chains and the countries where the drive-thru is the rule ---------- */
  var CHAIN = /^(mcdonald'?s|wendy'?s|taco bell|chick-fil-a|kfc|kentucky fried chicken|burger king|tim hortons|in-n-out( burger)?|sonic( drive-in)?|whataburger|jack in the box|popeyes( louisiana kitchen)?|arby'?s|dairy queen|hardee'?s|carl'?s jr\.?|culver'?s|raising cane'?s( chicken fingers)?|checkers|rally'?s|del taco|zaxby'?s|bojangles'?|white castle|dunkin'?( donuts)?|hungry jack'?s)$/i;
  function usBorderLat(lon) {   // the US-Mexico line, west to east (lat at a lon), for lon -117.2..-97.1
    var P = [[-117.2, 32.55], [-114.8, 32.5], [-111.1, 31.33], [-108.2, 31.33], [-106.5, 31.8], [-104.5, 29.7], [-103.0, 29.0], [-101.4, 29.8], [-100.5, 28.7], [-99.5, 27.5], [-98.3, 26.1], [-97.1, 25.9]];
    for (var i = 1; i < P.length; i++) if (lon <= P[i][0]) { var f = (lon - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f; } return 25.8; }
  function dtCountry(lat, lon) {   // { left: drives on the left } or null
    if (lat > 24.4 && lat < 49.5 && lon > -125 && lon < -66.8) { if (lon > -117.2 && lon < -97.1 && lat < usBorderLat(lon)) return null; if (lat < 27 && lon > -80.0) return null; return { left: false }; }   // the contiguous US (not Mexico, not the Bahamas)
    if (lat >= 49.5 && lat < 70 && lon > -141 && lon < -52) return { left: false };   // Canada
    if ((lat > 18.8 && lat < 22.4 && lon > -160.5 && lon < -154.7) || (lat > 51 && lat < 71.5 && lon > -170 && lon < -129.9) || (lat > 17.8 && lat < 18.6 && lon > -67.4 && lon < -65.2)) return { left: false };   // Hawaii, Alaska, Puerto Rico
    if (lat > -44 && lat < -10 && lon > 112 && lon < 154) return { left: true };   // Australia
    if (lat > -47.5 && lat < -34 && lon > 166 && lon < 179) return { left: true };   // New Zealand
    var r = region(lat, lon); if (r === 'gulf' || r === 'gulf_city') return { left: false };
    return null;
  }

  /* ---------- the tile's lists (from world-features' emit, tile units) ---------- */
  var K0 = null;
  function begin(J, t, K) { if (!on() || t.z !== 14) return null; K0 = K || K0; G = WFR_CITY790.g830; J.s830 = { pois: [], golf: [], sand: [], grass: [], water: [], tasks: null, ti: 0, t: t, skip: window.WFR_SACRED831 ? WFR_SACRED831.skips(J, t, K || K0) : null }; st.tiles++; return J.s830; }
  var STONE = { maghreb: [0.93, 0.9, 0.84], ottoman: [0.86, 0.84, 0.79], persian: [0.82, 0.72, 0.56], mamluk: [0.82, 0.71, 0.53], arab: [0.95, 0.94, 0.9], mughal: [0.93, 0.92, 0.88], church: [0.84, 0.81, 0.74], synagogue: [0.88, 0.85, 0.78] };
  function atB(J, R) {   // a building as it is made: dropped (a hand-built landmark stands there), or worn in its house of prayer's stone, or as it was (null)
    var S = J.s830; if (!S) return null; var n = R.length / 2, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, i; for (i = 0; i < n; i++) { x0 = Math.min(x0, R[2 * i]); x1 = Math.max(x1, R[2 * i]); z0 = Math.min(z0, R[2 * i + 1]); z1 = Math.max(z1, R[2 * i + 1]); }
    var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (S.skip) for (i = 0; i < S.skip.length; i++) { var k = S.skip[i], dx = cx - k.x, dz = cz - k.z, s = dx * k.ux + dz * k.uz, t = -dx * k.uz + dz * k.ux; if (Math.abs(s) <= k.hl && Math.abs(t) <= k.hw && (!k.minTop || true)) return 'skip'; }
    var a = (x1 - x0) * (z1 - z0);
    for (i = 0; i < S.pois.length; i++) { var p = S.pois[i]; if (p.x == null) continue; var inside = p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1 && inPoly(R, p.x, p.z), d = Math.hypot(cx - p.x, cz - p.z);
      if (p.k === 'dt') { if (inside && a < 1000 && p.ll && dtCountry(p.ll.lat, p.ll.lon)) return col([0.9, 0.82, 0.68]); continue; }   /* a drive-thru's own walls: a flat-roofed restaurant in warm render, not a house */
      if (inside || (p.k === 'mosque' && d < 60 && a < 1500)) { if (p.k === 'mosque') { var sty = p.sty !== undefined ? p.sty : (p.sty = mosqueStyle(p.ll.lat, p.ll.lon)); return sty ? col(STONE[sty]) : null; } return p.k === 'church' ? col(STONE.church) : p.k === 'synagogue' ? col(STONE.synagogue) : null; } }
    return null; }
  function poi(J, P, px, py, E) {
    var S = J.s830; if (!S || S.pois.length > 400 || px < 0 || py < 0 || px >= E || py >= E) return; S.E = E; var n0 = S.pois.length; var cl = P['class'], sub = P.subclass, nm = P['name:en'] || P.name_en || P.name || '';
    if (cl === 'place_of_worship') S.pois.push({ k: sub === 'muslim' ? 'mosque' : sub === 'christian' ? 'church' : sub === 'jewish' ? 'synagogue' : 'worship', sub: sub || null, name: nm, px: px, py: py, rank: +P.rank || 999 });
    else if (cl === 'fast_food' && CHAIN.test(String(P.name || '').trim())) S.pois.push({ k: 'dt', name: String(P.name).trim(), px: px, py: py });
    if (S.pois.length > n0 && K0) { var q = S.pois[n0], lc = K0.locRing(S.t, J, [px, py], E); q.x = lc[0]; q.z = lc[1]; q.ll = K0.llOf(S.t, px, py, E); }
  }
  function cover(J, P, polys, E) { var S = J.s830; if (!S) return; S.E = E; var sub = P.subclass, cl = P['class'];
    for (var i = 0; i < polys.length; i++) { if (sub === 'golf_course') S.golf.push(polys[i]); else if (cl === 'sand') S.sand.push(polys[i]); else if (sub === 'grass' && polys[i].outer.length >= 16 && polys[i].outer.length <= 400) S.grass.push(polys[i]); } }
  function water(J, polys) { var S = J.s830; if (!S) return; for (var i = 0; i < polys.length && S.water.length < 300; i++) S.water.push(polys[i]); }

  /* ---------- the geometry: world-city790's own vertex (the facade's attributes, PLAIN: no windows, no ink) ---------- */
  var G = null, PLAIN = [6, 0, 0, 3];
  function col(c) { return G.toLin(c); }
  function revolve(o, cx, cz, y0, prof, c, seg) {   // a surface of revolution: prof [[r, y], ...] bottom to top; smooth normals; faces out
    var n = prof.length, rows = [], i, k, cc = col(c);
    for (i = 0; i < n; i++) { var a = prof[Math.max(0, i - 1)], b = prof[Math.min(n - 1, i + 1)], dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1, nr = dy / l, ny = -dr / l, row = [];
      for (k = 0; k <= seg; k++) { var th = k / seg * 6.283185, cs = Math.cos(th), sn = Math.sin(th); row.push(G.V(o, cx + cs * prof[i][0], y0 + prof[i][1], cz + sn * prof[i][0], cs * nr, ny, sn * nr, cc, 0, 0, PLAIN, 0, 0)); }
      rows.push(row); }
    for (i = 0; i < n - 1; i++) for (k = 0; k < seg; k++) { var a0 = rows[i][k], a1 = rows[i][k + 1], b0 = rows[i + 1][k], b1 = rows[i + 1][k + 1]; o.i.push(a0, b0, a1, a1, b0, b1); }
    return (n - 1) * seg * 2;
  }
  function half(o, cx, cz, y0, r, h, ux, uz, c, seg) {   // a half-dome opening toward -u (its flat side against the main dome's drum)
    var cc = col(c), rows = [], R = 5, i, k, px = -uz, pz = ux;
    for (i = 0; i <= R; i++) { var ph = i / R * Math.PI / 2, rr = Math.cos(ph) * r, yy = Math.sin(ph) * h, row = [];
      for (k = 0; k <= seg; k++) { var th = -Math.PI / 2 + k / seg * Math.PI, cs = Math.cos(th), sn = Math.sin(th), dx = ux * cs + px * sn, dz = uz * cs + pz * sn, nl = Math.hypot(Math.cos(ph) * h, Math.sin(ph) * r) || 1;
        row.push(G.V(o, cx + dx * rr, y0 + yy, cz + dz * rr, dx * Math.cos(ph) * h / nl, Math.sin(ph) * r / nl, dz * Math.cos(ph) * h / nl, cc, 0, 0, PLAIN, 0, 0)); }
      rows.push(row); }
    for (i = 0; i < R; i++) for (k = 0; k < seg; k++) { var a0 = rows[i][k], a1 = rows[i][k + 1], b0 = rows[i + 1][k], b1 = rows[i + 1][k + 1]; o.i.push(a0, b0, a1, a1, b0, b1); }
  }
  function box(o, cx, cz, ux, uz, hl, hw, y0, y1, c, roof) {   // an upright box, long axis (ux, uz); flat normals; faces out
    var px = -uz, pz = ux, cc = col(c), P = function (s, t, y) { return [cx + ux * s + px * t, y, cz + uz * s + pz * t]; };
    var q = [[P(-hl, -hw, y0), P(hl, -hw, y0), P(hl, -hw, y1), P(-hl, -hw, y1), [-px, 0, -pz]], [P(hl, -hw, y0), P(hl, hw, y0), P(hl, hw, y1), P(hl, -hw, y1), [ux, 0, uz]],
      [P(hl, hw, y0), P(-hl, hw, y0), P(-hl, hw, y1), P(hl, hw, y1), [px, 0, pz]], [P(-hl, hw, y0), P(-hl, -hw, y0), P(-hl, -hw, y1), P(-hl, hw, y1), [-ux, 0, -uz]]];
    if (roof !== false) q.push([P(-hl, -hw, y1), P(hl, -hw, y1), P(hl, hw, y1), P(-hl, hw, y1), [0, 1, 0]]);
    for (var i = 0; i < q.length; i++) quad(o, q[i][0], q[i][1], q[i][2], q[i][3], q[i][4], cc);
  }
  function quad(o, a, b, c, d, n, cc) {   // a planar quad turned to face n
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2], fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (fx * n[0] + fy * n[1] + fz * n[2] < 0) { var t = b; b = d; d = t; }
    var k = [a, b, c, d].map(function (p) { return G.V(o, p[0], p[1], p[2], n[0], n[1], n[2], cc, 0, 0, PLAIN, 0, 0); }); o.i.push(k[0], k[1], k[2], k[0], k[2], k[3]);
  }
  function dome(o, cx, cz, y0, r, kind, c, seg) {   // the profile of each region's dome
    var p = [], i, N = 7;
    if (kind === 'bulb' || kind === 'onion') { var sw = kind === 'onion' ? 1.18 : 1.1, ht = kind === 'onion' ? 1.55 : 1.3;   // swells past the drum, then draws to a point
      p = [[r * 0.92, 0], [r * sw, r * 0.25 * ht], [r * sw * 0.98, r * 0.45 * ht], [r * 0.86, r * 0.68 * ht], [r * 0.55, r * 0.86 * ht], [r * 0.22, r * 0.96 * ht], [r * 0.04, r * ht], [0, r * ht + 0.01]]; }
    else { var hk = kind === 'flat' ? 0.62 : kind === 'pointed' ? 1.15 : 0.92;
      for (i = 0; i <= N; i++) { var ph = i / N * Math.PI / 2, rr = Math.cos(ph) * r, yy = Math.sin(ph) * r * hk; if (kind === 'pointed' && i === N) yy += r * 0.12; p.push([rr, yy]); } }
    return revolve(o, cx, cz, y0, p, c, seg);
  }
  function finial(o, x, z, y, s, c) {   // a short pole and a crescent (two thin bars bent into a C), no more
    box(o, x, z, 1, 0, 0.05 * s, 0.05 * s, y, y + 1.1 * s, c);
    var r = 0.38 * s, yc = y + 1.5 * s, prev = null; for (var i = 0; i <= 6; i++) { var a = -Math.PI * 0.85 + i / 6 * Math.PI * 1.7, px = x + Math.sin(a) * r, py = yc + Math.cos(a) * r; if (prev) { var mx = (px + prev[0]) / 2, my = (py + prev[1]) / 2; box(o, mx, z, 1, 0, 0.07 * s, 0.03 * s, my - 0.07 * s, my + 0.07 * s, c); } prev = [px, py]; }
  }

  /* ---------- a minaret by style: y0 its foot, h its height ---------- */
  var PAL = {
    arab: { dome: [[0.95, 0.94, 0.9], [0.95, 0.94, 0.9], [0.95, 0.94, 0.9], [0.84, 0.66, 0.3], [0.22, 0.5, 0.36]], min: [0.94, 0.92, 0.86], trim: [0.78, 0.72, 0.6] },
    mamluk: { dome: [[0.84, 0.73, 0.56], [0.8, 0.69, 0.52]], min: [0.82, 0.71, 0.53], trim: [0.68, 0.56, 0.42] },
    ottoman: { dome: [[0.52, 0.55, 0.58]], min: [0.91, 0.89, 0.83], trim: [0.52, 0.55, 0.58] },
    persian: { dome: [[0.19, 0.6, 0.68], [0.16, 0.5, 0.66]], min: [0.82, 0.72, 0.56], trim: [0.15, 0.42, 0.62] },
    maghreb: { dome: [[0.14, 0.44, 0.3]], min: [0.87, 0.76, 0.58], trim: [0.14, 0.46, 0.32] },
    mughal: { dome: [[0.95, 0.94, 0.9]], min: [0.72, 0.42, 0.32], trim: [0.95, 0.94, 0.9] } };
  function minaret(o, x, z, y0, h, sty, pal, ux, uz, rnd) {
    var M = pal.min, T = pal.trim, seg = 10, r;
    if (sty === 'maghreb') { var w = Math.max(1.6, Math.min(6, h * 0.11)); box(o, x, z, ux, uz, w, w, y0, y0 + h * 0.84, M); box(o, x, z, ux, uz, w * 1.02, w * 1.02, y0 + h * 0.74, y0 + h * 0.8, T);
      box(o, x, z, ux, uz, w * 1.08, w * 1.08, y0 + h * 0.84, y0 + h * 0.86, M); box(o, x, z, ux, uz, w * 0.45, w * 0.45, y0 + h * 0.86, y0 + h, M); dome(o, x, z, y0 + h, w * 0.45, 'flat', T, 8); finial(o, x, z, y0 + h + w * 0.28, Math.max(1, w * 0.4), [0.85, 0.72, 0.35]); return; }
    if (sty === 'ottoman') { r = Math.max(0.9, h / 42); revolve(o, x, z, y0, [[r * 1.15, 0], [r * 1.15, h * 0.12], [r, h * 0.13], [r, h * 0.62]], M, seg);
      revolve(o, x, z, y0 + h * 0.62, [[r, 0], [r * 1.6, h * 0.015], [r * 1.6, h * 0.03], [r * 0.95, h * 0.035], [r * 0.95, h * 0.2], [r * 1.5, h * 0.21], [r * 1.5, h * 0.225], [r * 0.9, h * 0.23], [r * 0.9, h * 0.28]], M, seg);
      revolve(o, x, z, y0 + h * 0.9, [[r * 1.02, 0], [r * 0.5, h * 0.12], [0.06, h * 0.21], [0, h * 0.215]], T, seg); finial(o, x, z, y0 + h * 1.1, Math.max(1, r * 0.8), [0.85, 0.72, 0.35]); return; }
    if (sty === 'mamluk') { var b0 = Math.max(1.5, h / 16); box(o, x, z, ux, uz, b0, b0, y0, y0 + h * 0.32, M); box(o, x, z, ux, uz, b0 * 1.15, b0 * 1.15, y0 + h * 0.32, y0 + h * 0.34, T);
      r = b0 * 0.92; revolve(o, x, z, y0 + h * 0.34, [[r, 0], [r, h * 0.3], [r * 1.3, h * 0.31], [r * 1.3, h * 0.33], [r * 0.7, h * 0.335], [r * 0.7, h * 0.5]], M, 8);
      revolve(o, x, z, y0 + h * 0.84, [[r * 0.9, 0], [r * 0.9, h * 0.02], [r * 0.55, h * 0.03]], T, 8); dome(o, x, z, y0 + h * 0.86, r * 0.55, 'bulb', M, 8); finial(o, x, z, y0 + h * 0.86 + r * 0.7, Math.max(1, r * 0.5), [0.85, 0.72, 0.35]); return; }
    if (sty === 'persian') { r = Math.max(1.1, h / 22); revolve(o, x, z, y0, [[r * 1.1, 0], [r, h * 0.08], [r * 0.85, h * 0.8]], M, seg); revolve(o, x, z, y0 + h * 0.45, [[r * 0.95, 0], [r * 0.86, h * 0.35]], T, seg);
      revolve(o, x, z, y0 + h * 0.8, [[r * 0.85, 0], [r * 1.35, h * 0.04], [r * 1.35, h * 0.1], [r * 0.85, h * 0.11]], T, seg); revolve(o, x, z, y0 + h * 0.91, [[r * 0.6, 0], [r * 0.6, h * 0.04]], M, seg); dome(o, x, z, y0 + h * 0.95, r * 0.62, 'bulb', T, 8); return; }
    if (sty === 'mughal') { r = Math.max(1.1, h / 20); revolve(o, x, z, y0, [[r * 1.15, 0], [r, h * 0.85]], M, 8); revolve(o, x, z, y0 + h * 0.85, [[r * 1.2, 0], [r * 1.2, h * 0.02]], pal.trim, 8);
      for (var c = 0; c < 4; c++) { var a = c * Math.PI / 2 + 0.785; box(o, x + Math.cos(a) * r * 0.8, z + Math.sin(a) * r * 0.8, 1, 0, 0.12, 0.12, y0 + h * 0.87, y0 + h * 0.95, pal.trim); }
      dome(o, x, z, y0 + h * 0.95, r * 1.05, 'onion', pal.trim, 8); return; }
    /* arab: a slender round shaft, one or two balconies, a small cap */
    r = Math.max(0.9, h / 24); var two = h > 30 || rnd < 0.4;
    revolve(o, x, z, y0, [[r * 1.25, 0], [r * 1.25, h * 0.18], [r, h * 0.2], [r, h * 0.55]], M, seg);
    revolve(o, x, z, y0 + h * 0.55, [[r, 0], [r * 1.5, h * 0.02], [r * 1.5, h * 0.04], [r * 0.85, h * 0.045], [r * 0.85, two ? h * 0.2 : h * 0.3]], M, seg);
    if (two) revolve(o, x, z, y0 + h * 0.75, [[r * 0.85, 0], [r * 1.3, h * 0.02], [r * 1.3, h * 0.035], [r * 0.7, h * 0.04], [r * 0.7, h * 0.13]], M, seg);
    dome(o, x, z, y0 + h * 0.88, r * 0.75, 'pointed', T, 8); finial(o, x, z, y0 + h * 0.88 + r * 0.95, Math.max(1, r * 0.6), [0.85, 0.72, 0.35]);
  }

  /* ---------- one mosque: the building the point stands in, its parts round it, the dressing ---------- */
  function fpArea(f) { var R = f.r, n = R.length / 2, a = 0; for (var i = 0; i < n; i++) { var j = (i + 1) % n; a += R[2 * i] * R[2 * j + 1] - R[2 * j] * R[2 * i + 1]; } return Math.abs(a / 2); }
  function inPoly(R, x, z) { var c = false, n = R.length / 2; for (var i = 0, j = n - 1; i < n; j = i++) { var xi = R[2 * i], zi = R[2 * i + 1], xj = R[2 * j], zj = R[2 * j + 1]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; }
  function boxD(f, x, z) { var dx = Math.max(f.x0 - x, 0, x - f.x1), dz = Math.max(f.z0 - z, 0, z - f.z1); return Math.hypot(dx, dz); }
  function hostOf(J, x, z, near) { var F = J.fp || [], best = null, bd = 1e9;
    for (var i = 0; i < F.length; i++) { var f = F[i]; if (f.top - f.gC < 2.5) continue; var d = boxD(f, x, z); if (d > near) continue; if (d === 0 && inPoly(f.r, x, z)) d = -fpArea(f) / 1e6; if (d < bd) { bd = d; best = f; } }
    return best; }
  function mosque(J, p, ll, sty) {
    var hall = hostOf(J, p.x, p.z, 20); if (!hall) { st.skipped++; return null; }
    var o = J.wallX || (J.wallX = new J.Out830()), F = J.fp, hA = fpArea(hall), hH = hall.top - hall.gC, cx = (hall.x0 + hall.x1) / 2, cz = (hall.z0 + hall.z1) / 2, R = Math.max(25, Math.hypot(hall.x1 - hall.x0, hall.z1 - hall.z0) * 0.8);
    if (!o.f) { o.f = []; o.m = []; }
    var mins = [], rounds = [], i, f;
    for (i = 0; i < F.length; i++) { f = F[i]; var fx = (f.x0 + f.x1) / 2, fz = (f.z0 + f.z1) / 2; if (Math.hypot(fx - cx, fz - cz) > R) continue; var w = f.x1 - f.x0, d = f.z1 - f.z0, hh = f.top - f.gC;
      var mw = Math.max(11, Math.sqrt(hA) * 0.35); if (w < mw && d < mw && hh >= Math.max(15, hH * 1.4)) { var mm = null; for (var q0 = 0; q0 < mins.length; q0++) if (Math.hypot((mins[q0].x0 + mins[q0].x1) / 2 - fx, (mins[q0].z0 + mins[q0].z1) / 2 - fz) < 3) mm = q0;
        if (mm === null) mins.push(f); else if (f.top > mins[mm].top) mins[mm] = f; continue; }   // a stack of minaret parts: the tallest is its top
      var rq0 = fpArea(f) / (Math.PI * w * d / 4); if (f.r.length / 2 >= 10 && w > 4 && Math.abs(w - d) < 0.2 * Math.max(w, d) && rq0 > 0.85 && rq0 < 1.08 && hh >= hH * 0.8 && f !== hall) rounds.push(f); }   // a circle fills pi/4 of its box (a square would read 1.27)
    rounds = rounds.filter(function (q) { return !rounds.some(function (s) { return s !== q && s.top > q.top && Math.hypot((s.x0 + s.x1) / 2 - (q.x0 + q.x1) / 2, (s.z0 + s.z1) / 2 - (q.z0 + q.z1) / 2) < 1.5; }); });   // a dome's stacked rings: its top ring carries it
    if (!sty && !mins.length && !rounds.length) { st.skipped++; return null; }   // a hall in a land of converted halls, with nothing drawn by the map: left as it is
    var s = sty || 'arab', pal = PAL[s], rnd = hash(p.name + Math.round(p.x) + ',' + Math.round(p.z)), domeC = pal.dome[Math.floor(rnd * pal.dome.length) % pal.dome.length], ob = G.obb(hall.r) || { cx: cx, cz: cz, ux: 1, uz: 0, L: (hall.x1 - hall.x0) / 2, W: (hall.z1 - hall.z0) / 2 };
    var dk = s === 'persian' ? 'bulb' : s === 'mughal' ? 'onion' : s === 'mamluk' ? 'pointed' : s === 'ottoman' ? 'flat' : 'round', out = { domes: 0, minarets: 0, mapped: mins.length + rounds.length };
    /* the minarets: the map's own crowned, else made at the hall's corners */
    if (mins.length) for (i = 0; i < mins.length && i < 6; i++) { f = mins[i]; var mx = (f.x0 + f.x1) / 2, mz = (f.z0 + f.z1) / 2, mr = Math.min(f.x1 - f.x0, f.z1 - f.z0) / 2, mh = f.top - f.gC;
        if (s === 'ottoman') { revolve(o, mx, mz, f.top, [[mr * 1.02, 0], [mr * 0.5, mh * 0.08], [0.06, mh * 0.15], [0, mh * 0.155]], pal.trim, 10); finial(o, mx, mz, f.top + mh * 0.15, Math.max(1, mr * 0.6), [0.85, 0.72, 0.35]); }
        else if (s === 'maghreb') { dome(o, mx, mz, f.top, mr * 0.9, 'flat', pal.trim, 8); finial(o, mx, mz, f.top + mr * 0.56, Math.max(1, mr * 0.3), [0.85, 0.72, 0.35]); }   // the map draws its lantern already: a small green cap and the finial
        else { dome(o, mx, mz, f.top, mr * 0.9, s === 'persian' || s === 'mamluk' ? 'bulb' : 'pointed', pal.trim, 8); finial(o, mx, mz, f.top + mr * 1.1, Math.max(1, mr * 0.5), [0.85, 0.72, 0.35]); }
        out.minarets++; st.mappedMinarets++; }
    else if (sty) { var n = hA < 1500 ? (s === 'arab' && hA > 800 ? 2 : 1) : hA < 6000 ? 2 : (s === 'ottoman' || s === 'arab' ? 4 : 2); if (s === 'maghreb') n = 1; if (s === 'persian' || s === 'mughal') n = Math.max(2, Math.min(n, 4));
      var mh2 = Math.max(14, Math.min(s === 'maghreb' ? 45 : 70, hH * (s === 'ottoman' ? 3.0 : 2.4) + Math.sqrt(hA) * 0.25)), corners = [[1, 1], [-1, -1], [1, -1], [-1, 1]], c0 = Math.floor(rnd * 4);
      for (i = 0; i < n; i++) { var cr = corners[(c0 + i) % 4], ins = s === 'maghreb' ? 2.2 : 1.6, sx = ob.L - ins, tx = ob.W - ins, x = ob.cx + ob.ux * sx * cr[0] - ob.uz * tx * cr[1], z = ob.cz + ob.uz * sx * cr[0] + ob.ux * tx * cr[1];
        minaret(o, x, z, hall.gC - 0.5, mh2, s, pal, ob.ux, ob.uz, rnd); out.minarets++; st.minarets++; } }
    /* the domes: the map's round parts crowned, else the hall's own */
    if (rounds.length) for (i = 0; i < rounds.length && i < 12; i++) { f = rounds[i]; var dr = Math.min(f.x1 - f.x0, f.z1 - f.z0) / 2 * 0.98; dome(o, (f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, f.top - 0.05, dr, dk === 'round' ? 'flat' : dk, domeC, C.SEG); out.domes++; st.mappedDomes++; }
    else if (sty) { var top = hall.top;
      if (s === 'maghreb') {   /* the green tile roof: a low hip over the hall's rectangle (the roofs' mesh: its tile courses), and a small dome over the mihrab bay */
        var RO = J.roof, e = 0.3, L = ob.L + e, W = ob.W + e, rise = Math.min(6, W * 0.32), ri = Math.max(0, L - W), P = function (a, b, y) { return [ob.cx + ob.ux * a - ob.uz * b, y, ob.cz + ob.uz * a + ob.ux * b]; }, gc = col(pal.dome[0]);
        var A = P(-L, -W, top), B = P(L, -W, top), Cq = P(L, W, top), D = P(-L, W, top), H0 = P(-ri, 0, top + rise), H1 = P(ri, 0, top + rise);
        G.quadRoof(RO, A, B, H1, H0, gc); G.quadRoof(RO, Cq, D, H0, H1, gc); G.triRoof(RO, B, Cq, H1, gc); G.triRoof(RO, D, A, H0, gc); out.roof = 1; }
      else { var rD = Math.max(2.4, Math.min(s === 'ottoman' ? 22 : 18, Math.min(ob.L, ob.W) * (s === 'ottoman' ? 0.62 : s === 'mamluk' ? 0.45 : 0.55))), dy = top;
        if (s === 'ottoman' || s === 'persian' || s === 'mughal') { revolve(o, ob.cx, ob.cz, top - 0.2, [[rD * 1.02, 0], [rD * 1.02, rD * 0.28]], s === 'ottoman' ? pal.min : pal.min, C.SEG); dy = top + rD * 0.28; }
        dome(o, ob.cx, ob.cz, dy, rD, dk === 'round' ? 'round' : dk, domeC, C.SEG); out.domes++; st.domes++;
        if (s === 'ottoman' && ob.L > rD * 1.6) for (var hs = -1; hs <= 1; hs += 2) { half(o, ob.cx + ob.ux * rD * hs, ob.cz + ob.uz * rD * hs, top - 0.1, rD * 0.72, rD * 0.62, ob.ux * hs, ob.uz * hs, domeC, 10); out.domes++; }
        if (s === 'ottoman' && hA > 900) for (var q = 0; q < 4; q++) { var qa = [[1, 1], [-1, -1], [1, -1], [-1, 1]][q], qs = ob.L * 0.72, qt = ob.W * 0.72; dome(o, ob.cx + ob.ux * qs * qa[0] - ob.uz * qt * qa[1], ob.cz + ob.uz * qs * qa[0] + ob.ux * qt * qa[1], top, Math.min(rD * 0.32, ob.W * 0.2), 'flat', domeC, 8); out.domes++; }
        if (s === 'persian' && ob.L > 6) {   /* the iwan: a tall portal on the hall's long side, its pointed arch set back in tile blue */
          var iw = Math.min(ob.L * 0.9, 22), ih = Math.max(hH * 1.35, hH + 4), ix = ob.cx - ob.uz * (ob.W + 1.0), iz = ob.cz + ob.ux * (ob.W + 1.0);
          box(o, ix, iz, ob.ux, ob.uz, iw / 2, 1.2, hall.gC - 0.4, hall.gC + ih, pal.min); var fn = [-ob.uz, 0, ob.ux], ar = col([0.12, 0.33, 0.52]), fx2 = ix - ob.uz * 1.25, fz2 = iz + ob.ux * 1.25, aw = iw * 0.3, ay0 = hall.gC, ay1 = hall.gC + ih * 0.62;
          quad(o, [fx2 - ob.ux * aw, ay0, fz2 - ob.uz * aw], [fx2 + ob.ux * aw, ay0, fz2 + ob.uz * aw], [fx2 + ob.ux * aw, ay1, fz2 + ob.uz * aw], [fx2 - ob.ux * aw, ay1, fz2 - ob.uz * aw], fn, ar);
          var tk = G.V(o, fx2 - ob.ux * aw, ay1, fz2 - ob.uz * aw, fn[0], 0, fn[2], ar, 0, 0, PLAIN, 0, 0), tk2 = G.V(o, fx2 + ob.ux * aw, ay1, fz2 + ob.uz * aw, fn[0], 0, fn[2], ar, 0, 0, PLAIN, 0, 0), tk3 = G.V(o, fx2, ay1 + aw * 0.9, fz2, fn[0], 0, fn[2], ar, 0, 0, PLAIN, 0, 0);
          o.i.push(tk, tk3, tk2, tk, tk2, tk3); out.iwan = 1; }
        finial(o, ob.cx, ob.cz, dy + rD * (dk === 'onion' ? 1.55 : dk === 'bulb' ? 1.3 : dk === 'pointed' ? 1.27 : dk === 'flat' ? 0.62 : 0.92), Math.max(1, rD * 0.12), [0.85, 0.72, 0.35]); } }
    st.mosques++; st.styles[s] = (st.styles[s] || 0) + 1; return { k: 'mosque', name: p.name, lat: +ll.lat.toFixed(5), lon: +ll.lon.toFixed(5), style: s, domes: out.domes, minarets: out.minarets, mapped: out.mapped, hallA: Math.round(hA), roof: out.roof || 0, iwan: out.iwan || 0 };
  }

  /* ---------- golf ---------- */
  function scan(rings, ox, oz, ux, uz, t) { var px = -uz, pz = ux, xs = [];
    for (var r = 0; r < rings.length; r++) { var R = rings[r], n = R.length / 2; for (var i = 0; i < n; i++) { var j = (i + 1) % n, ax = R[2 * i] - ox, az = R[2 * i + 1] - oz, bx = R[2 * j] - ox, bz = R[2 * j + 1] - oz, ta = ax * px + az * pz, tb = bx * px + bz * pz;
      if ((ta > t) !== (tb > t)) { var f = (t - ta) / (tb - ta), sa = ax * ux + az * uz, sb = bx * ux + bz * uz; xs.push(sa + (sb - sa) * f); } } }
    return xs.sort(function (a, b) { return a - b; }); }
  function bbox(R) { var b = [1e9, 1e9, -1e9, -1e9]; for (var i = 0; i < R.length; i += 2) { b[0] = Math.min(b[0], R[i]); b[1] = Math.min(b[1], R[i + 1]); b[2] = Math.max(b[2], R[i]); b[3] = Math.max(b[3], R[i + 1]); } return b; }
  function inRings(rings, bb, x, z) { if (x < bb[0] || x > bb[2] || z < bb[1] || z > bb[3] || !inPoly(rings[0], x, z)) return false; for (var h = 1; h < rings.length; h++) if (inPoly(rings[h], x, z)) return false; return true; }
  function fill(J, K, rings, c, lift) { var faces = K.triangulate(rings), Gd = J.gnd, base = Gd.p.length / 3, cc = c, r, i;
    for (r = 0; r < rings.length; r++) for (i = 0; i < rings[r].length; i += 2) { var k = Gd.v(rings[r][i], Math.max(0, K.H(J, rings[r][i], rings[r][i + 1])) + lift, rings[r][i + 1], 0, 1, 0, cc[0], cc[1], cc[2]); K.drp(Gd, k, lift); }
    for (i = 0; i < faces.length; i++) K.tri(Gd, base + faces[i][0], base + faces[i][1], base + faces[i][2]); }
  var MOW = [[0.42, 0.62, 0.27], [0.34, 0.53, 0.22]], SAND = [0.93, 0.86, 0.66], GREEN = [0.5, 0.76, 0.33];
  function golf(J, K, poly, S, t, E) {
    var rings = [K.locRing(t, J, poly.outer, E)].concat(poly.holes.map(function (h) { return K.locRing(t, J, h, E); })), bb = bbox(rings[0]), ob = G.obb(rings[0]); if (!ob) return null;
    var wat = S.water.map(function (w) { var rr = [K.locRing(t, J, w.outer, E)].concat(w.holes.map(function (h) { return K.locRing(t, J, h, E); })); return { r: rr, b: bbox(rr[0]) }; }).filter(function (w) { return w.b[0] < bb[2] && w.b[2] > bb[0] && w.b[1] < bb[3] && w.b[3] > bb[1]; });
    var ux = ob.ux, uz = ob.uz, ext = Math.hypot(ob.L, ob.W) + 2, stripes = 0, i;
    for (var tt = -ext, k = 0; tt <= ext; tt += C.STRIPE, k++) { var xs = scan(rings, ob.cx, ob.cz, ux, uz, tt);
      for (i = 0; i + 1 < xs.length; i += 2) { var run = []; for (var s = xs[i]; s <= xs[i + 1]; s += 8) { var x = ob.cx + ux * s - uz * tt, z = ob.cz + uz * s + ux * tt, wet = false;
          for (var w = 0; w < wat.length && !wet; w++) wet = inRings(wat[w].r, wat[w].b, x, z);
          if (!wet) run.push(x, z); else { if (run.length >= 4) { K.ribbon(J, run, C.STRIPE + 0.3, MOW[k & 1], C.LIFT_G, C.SUB); stripes++; } run = []; } }
        if (run.length >= 4) { K.ribbon(J, run, C.STRIPE + 0.3, MOW[k & 1], C.LIFT_G, C.SUB); stripes++; } } }
    var bunk = 0, greens = [], o = J.wallX || (J.wallX = new J.Out830()); if (!o.f) { o.f = []; o.m = []; }
    S.sand.forEach(function (sp) { var rr = [K.locRing(t, J, sp.outer, E)], b = bbox(rr[0]); if (b[2] - b[0] > 120 || b[3] - b[1] > 120 || !inRings(rings, bb, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2)) return; fill(J, K, rr, SAND, C.LIFT_B); bunk++; });
    S.grass.forEach(function (gp) { var rr = [K.locRing(t, J, gp.outer, E)], b = bbox(rr[0]), a = fpArea({ r: rr[0] }), gx = (b[0] + b[2]) / 2, gz = (b[1] + b[3]) / 2; if (a < 200 || a > 2000 || !inRings(rings, bb, gx, gz) || greens.length >= 30) return;
      fill(J, K, rr, GREEN, C.LIFT_B); var gy = Math.max(0, K.H(J, gx, gz)); box(o, gx, gz, 1, 0, 0.05, 0.05, gy, gy + C.FLAG, [0.95, 0.95, 0.93]);
      var fk = [G.V(o, gx, gy + C.FLAG, gz, 0, 0, 1, col([0.92, 0.18, 0.15]), 0, 0, PLAIN, 0, 0), G.V(o, gx, gy + C.FLAG - 0.9, gz, 0, 0, 1, col([0.92, 0.18, 0.15]), 0, 0, PLAIN, 0, 0), G.V(o, gx + 1.3, gy + C.FLAG - 0.45, gz, 0, 0, 1, col([0.92, 0.18, 0.15]), 0, 0, PLAIN, 0, 0)];
      o.i.push(fk[0], fk[1], fk[2], fk[0], fk[2], fk[1]); greens.push([gx, gz]); });
    st.golf++; st.stripes += stripes; st.bunkers += bunk; st.greens += greens.length;
    return { stripes: stripes, bunkers: bunk, greens: greens };
  }

  /* ---------- the drive-thru: a free-standing chain building, its lane, board and canopy ---------- */
  function driveThru(J, K, p, ll, cty) {
    var F = J.fp || [], host = hostOf(J, p.x, p.z, 10); if (!host) { st.dtNo++; return null; } var A = fpArea(host), hh = host.top - host.gC;
    if (A < 90 || A > 1000 || hh > 12) { st.dtNo++; return null; }
    for (var i = 0; i < F.length; i++) { var f = F[i]; if (f === host || f.top - f.gC < 2) continue; if (f.x0 < host.x1 + 5 && f.x1 > host.x0 - 5 && f.z0 < host.z1 + 5 && f.z1 > host.z0 - 5) { st.dtNo++; return null; } }   // not free-standing: a mall's food court, a corner of a block
    var ob = G.obb(host.r); if (!ob) return null; var off = C.DT_OFF, side = cty.left ? -1 : 1, L = ob.L, W = ob.W;
    var P = function (s, t2) { t2 *= side; return [ob.cx + ob.ux * s - ob.uz * t2, ob.cz + ob.uz * s + ob.ux * t2]; };
    var pts = [P(-L - off, -W - off), P(-L - off, W + off), P(L + off, W + off), P(L + off + 7, W + off + 3)].reduce(function (a, q) { return a.concat(q); }, []);
    for (i = 0; i < pts.length; i += 2) for (var j = 0; j < F.length; j++) { var g = F[j]; if (g !== host && boxD(g, pts[i], pts[i + 1]) < 1.5 && inPoly(g.r, pts[i], pts[i + 1])) { st.dtNo++; return null; } }
    K.ribbon(J, pts, 3.6, [0.29, 0.29, 0.3], C.LIFT_L, 6);
    var o = J.wallX || (J.wallX = new J.Out830()); if (!o.f) { o.f = []; o.m = []; }
    var bd = P(-L * 0.25, W + 1.3), gy = Math.max(0, K.H(J, bd[0], bd[1])), fx = -ob.uz * side, fz = ob.ux * side;   // the menu board, between the lane and the wall, facing the lane
    box(o, bd[0] + ob.ux * 0.8, bd[1] + ob.uz * 0.8, ob.ux, ob.uz, 0.05, 0.05, gy, gy + 1.0, [0.2, 0.2, 0.22]); box(o, bd[0] - ob.ux * 0.8, bd[1] - ob.uz * 0.8, ob.ux, ob.uz, 0.05, 0.05, gy, gy + 1.0, [0.2, 0.2, 0.22]);
    box(o, bd[0], bd[1], ob.ux, ob.uz, 1.1, 0.12, gy + 0.9, gy + 2.5, [0.16, 0.16, 0.18]);
    var fc = col([0.96, 0.84, 0.42]), fb = [bd[0] + fx * 0.13, bd[1] + fz * 0.13], k0 = G.V(o, fb[0] - ob.ux, gy + 1.0, fb[1] - ob.uz, fx, 0, fz, fc, 0, 0, PLAIN, 0, 0), k1 = G.V(o, fb[0] + ob.ux, gy + 1.0, fb[1] + ob.uz, fx, 0, fz, fc, 0, 0, PLAIN, 0, 0), k2 = G.V(o, fb[0] + ob.ux, gy + 2.4, fb[1] + ob.uz, fx, 0, fz, fc, 0, 0, PLAIN, 0, 0), k3 = G.V(o, fb[0] - ob.ux, gy + 2.4, fb[1] - ob.uz, fx, 0, fz, fc, 0, 0, PLAIN, 0, 0);
    o.i.push(k0, k1, k2, k0, k2, k3, k0, k2, k1, k0, k3, k2);
    var wn = P(L * 0.45, W + 0.6), wy = Math.max(0, K.H(J, wn[0], wn[1]));   // the canopy over the window
    box(o, wn[0], wn[1], ob.ux, ob.uz, 1.8, 0.9, host.gC + 2.7, host.gC + 2.95, [0.82, 0.18, 0.14]);
    var lls = [], b0 = K.toLL(J, bd[0], bd[1]), w0 = K.toLL(J, wn[0], wn[1]); for (i = 0; i < pts.length; i += 2) { var q = K.toLL(J, pts[i], pts[i + 1]); lls.push(q.lon, q.lat); }
    st.dt++; return { k: 'dt', name: p.name, lat: +ll.lat.toFixed(5), lon: +ll.lon.toFixed(5), lane: new Float64Array(lls), board: [b0.lat, b0.lon], win: [w0.lat, w0.lon], left: !!cty.left, area: Math.round(A), wy: wy };
  }

  /* ---------- the slices: one task (a course, a mosque, a drive-thru) at a time, with the tile's job ---------- */
  function step(t, J, K, deadline) {
    var S = J.s830; if (!S) return true; G = WFR_CITY790.g830; if (!G) return true; var t0 = performance.now();
    try {
      if (!S.tasks) { S.tasks = []; var E = S.E || 4096, nm = 0, nd = 0;
        S.golf.slice(0, C.MAX_GOLF).forEach(function (g) { S.tasks.push({ k: 'golf', g: g }); });
        if (window.WFR_SACRED831) WFR_SACRED831.tasks(J, t, K, S.tasks);   /* 831: the hand-built landmarks whose middle is in this tile */
        S.pois.slice().sort(function (a, b) { return (a.rank || 999) - (b.rank || 999); }).forEach(function (p) { if (p.x == null)   /* the map's most important first (its rank): a city tile of a hundred mosques dresses its great ones */ { var q = K.locRing(t, J, [p.px, p.py], E); p.x = q[0]; p.z = q[1]; p.ll = K.llOf(t, p.px, p.py, E); } var ll = p.ll;
          if (p.k === 'mosque' && nm < C.MAX_MOSQUES) { nm++; S.tasks.push({ k: 'mosque', p: p }); } else if (p.k === 'dt' && nd < C.MAX_DT) { var c = dtCountry(ll.lat, ll.lon); if (c) { nd++; S.tasks.push({ k: 'dt', p: p, c: c }); } }
          else if (p.k !== 'dt' && window.WFR_SACRED831 && WFR_SACRED831.want(p)) S.tasks.push({ k: 'w831', p: p }); }); }
      var cLL = K.llOf(t, 2048, 2048, 4096), sty = mosqueStyle(cLL.lat, cLL.lon);
      while (S.ti < S.tasks.length) { var T = S.tasks[S.ti++], r = null;
        try { if (T.k === 'golf') { r = golf(J, K, T.g, S, t, S.E || 4096); if (r && J.feed) { var gl = r.greens.map(function (g) { var q = K.toLL(J, g[0], g[1]); return [q.lat, q.lon]; }); (J.feed.p830 = J.feed.p830 || { golf: [], dt: [] }).golf.push({ greens: gl }); } }
          else if (T.k === 'mosque') r = mosque(J, T.p, T.p.ll, sty);
          else if (T.k === 'dt') { r = driveThru(J, K, T.p, T.p.ll, T.c); if (r && J.feed) (J.feed.p830 = J.feed.p830 || { golf: [], dt: [] }).dt.push(r); }
          else if (T.k === 'w831' || T.k === 'lm831') r = WFR_SACRED831.dress(J, K, T, G, GEO);
          if (r && r.k) { var key = r.k + '|' + r.lat + ',' + r.lon; st.items.set(key, Object.assign({ tile: t.key }, r, { lane: undefined })); if (st.items.size > 600) st.items.delete(st.items.keys().next().value); } }
        catch (e) { fault(T.k, e); }
        if (performance.now() > deadline) break; }
    } catch (e) { fault('step', e); S.ti = S.tasks ? S.tasks.length : 0; }
    var ms = performance.now() - t0; st.ms += ms; if (ms > st.msMax) st.msMax = ms;
    return !S.tasks || S.ti >= S.tasks.length;
  }
  var GEO = { box: box, quad: quad, revolve: revolve, dome: dome, half: half, col: col, hostOf: hostOf, fpArea: fpArea, inPoly: inPoly, finial: finial, minaret: minaret, PLAIN: PLAIN, region: region, PAL: PAL };
  function items(kind) { var out = []; st.items.forEach(function (v) { if (!kind || v.k === kind) out.push(v); }); return out; }
  function peek() { var o = {}; for (var k in st) if (k !== 'items') o[k] = st[k]; o.on = on(); o.n = st.items.size; o.msMax = +st.msMax.toFixed(2); return JSON.parse(JSON.stringify(o)); }
  return { C: C, on: on, region: region, mosqueStyle: mosqueStyle, dtCountry: dtCountry, CHAIN: CHAIN, begin: begin, poi: poi, cover: cover, water: water, step: step, atB: atB, geo: function () { G = WFR_CITY790.g830; return GEO; }, items: items, peek: peek, version: 1 };
})();

/* ---------- BOARD 831 (Nov 14 2026): THE HOUSES OF THE GOD OF ISRAEL, GOTHIC AND GRECO-ROMAN, AND THE DOMES SHE CAN FLY INTO. Su, Nov 14 2026.
   Marth, verbatim: "We need to add beautiful gothic cathedrals (annodes cathodes) and the Greco-Roman style where they apply."; "You can try and replicate
   the art in the middle of the domes on the inside"; and his ruling: "Definitely include more YHWH related temples rather than Allah".
   WHAT ROUGE SEES (Standard only; the same tiles, slices and programs as 830's WFR_SACRED830, no second pipeline):
     CHURCHES    every poi place_of_worship whose subclass (OSM religion) is christian: its building in pale stone, a pitched roof, a bell tower with a
                 spire and a plain cross (the Caribbean's square tower with a parapet; Russia's onion domes; Greece and the Balkans a drum and dome),
                 the map's own tower crowned with a spire where it draws one, the map's round parts domed with a cross.
     SYNAGOGUES  every one whose subclass is jewish: its stone, a Star of David on its roof's front. Shaare Shalom (Kingston, with its sand floor
                 inside), the Dohany (Budapest, its twin onion towers), Touro (Newport) and Bevis Marks (London) by hand.
     GOTHIC      real Gothic cathedrals of Europe and the Gothic Revival where it truly stands (St Patrick's, Washington National), by hand at their
                 places from their known plans: pale stone (Cologne's blackened sandstone), slate roofs, flying buttresses with pinnacles, lancet
                 windows, rose windows, twin west towers or the spire each truly has, a plain cross on each spire.
     GRECO-ROMAN the Parthenon (a ruin, no roof), the Hephaisteion, the Pantheon, the Colosseum (its south outer ring fallen), the Forum's temples
                 and arch, Ephesus' library, Baalbek, Leptis Magna, Jerash; neoclassical where it truly is (the Lincoln and Jefferson memorials, the
                 Madeleine, the Brandenburg Gate (no quadriga: no figures), the Pantheon of Paris, the Maison Carree).
     THE BIBLE'S PLACES  the Western Wall, the Holy Sepulchre and the Nativity (their churches dressed from the map), Capernaum's white synagogue
                 ruins, St Catherine's at Sinai; and Rouge's home: Kingston Parish Church, the Cathedral of St Jago de la Vega in Spanish Town.
     INTERIORS   six she can fly into (the dome's footprint is open to her): the Pantheon (in through the oculus, its coffers, the light falling),
                 Florence's dome and St Peter's (their gold and blue rings, ribs and stars, never their figures), Notre-Dame's nave (ribbed vault,
                 glass in colour only), Shaare Shalom (its sand floor, mahogany pews, bimah and ark), the Sultan Ahmed (Iznik blue, ornament bands).
   HOUSE LAW: no figure of God or Christ anywhere; until Marth answers about saints and angels, no human or angel figure at all; a plain cross on a
   church, a Star of David on a synagogue. Where a real dome is figural, only its framework is drawn: rings, gold, sky blue, stars, light.
   COST: the exteriors are geometry inside the tiles' own meshes (830's way); the six interiors are made AT LOAD (attach), each one group of meshes
   in the features group, wearing the roofs' own program (a painted canvas map: the 'feat' program, warmed at the gate), hidden until she is
   within 600 m. Coordinates: the map's own points where it has them (checked Nov 14 2026 in the OpenFreeMap tiles), else known plans (DRAFT). */
window.WFR_SACRED831 = (function () {
  'use strict';
  var D2R = Math.PI / 180;
  function on() { return !!(window.WFR_SACRED830 && WFR_SACRED830.on()); }
  var st = { churches: 0, synagogues: 0, towers: 0, spires: 0, crosses: 0, stars: 0, roofs: 0, landmarks: 0, kinds: {}, opened: 0, interiors: 0, shown: [], faults: [], built: [] };
  function fault(w, e) { if (st.faults.length < 12) st.faults.push(w + ': ' + (e && e.message || e)); }
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h >>> 0) / 4294967296; }
  var PALE = [0.88, 0.85, 0.77], LEAD = [0.27, 0.3, 0.34], SLATE = [0.33, 0.36, 0.41], MARBLE = [0.92, 0.89, 0.82], TRAV = [0.86, 0.79, 0.65], GOLD = [0.88, 0.72, 0.32], BRICK = [0.62, 0.32, 0.25], WHITE = [0.94, 0.93, 0.89], GLASS = [0.16, 0.2, 0.34];

  /* ---------- the hand-built places (b: the bearing of the axis, front to back, degrees from north) ---------- */
  function G_(name, lat, lon, b, o) { return Object.assign({ k: 'gothic', name: name, lat: lat, lon: lon, b: b }, o); }
  var LM = [
    G_('Notre-Dame de Paris', 48.85296, 2.34996, 112, { L: 128, W: 40, Wn: 13, Hn: 33, Ha: 16, tr: [0.55, 48, 14], tw: 'twin', Ht: 69, cs: 96, stone: [0.9, 0.86, 0.76], inside: 'notredame' }),
    G_('Cologne Cathedral', 50.94131, 6.95813, 92, { L: 144, W: 45, Wn: 15, Hn: 43, Ha: 19, tr: [0.5, 86, 15], tw: 'twinSpire', Ht: 100, Hs: 157, stone: [0.43, 0.41, 0.39] }),
    G_('Chartres Cathedral', 48.44774, 1.48760, 90, { L: 130, W: 32, Wn: 16, Hn: 37, Ha: 15, tr: [0.55, 64, 14], tw: 'twinSpire', Ht: 60, Hs: 113, stone: [0.78, 0.74, 0.66], roof: [0.36, 0.56, 0.47] }),
    G_('Reims Cathedral', 49.25373, 4.03407, 90, { L: 149, W: 30, Wn: 14, Hn: 38, Ha: 16, tr: [0.55, 61, 14], tw: 'twin', Ht: 81, stone: [0.88, 0.84, 0.74] }),
    G_('Amiens Cathedral', 49.89489, 2.30210, 90, { L: 145, W: 33, Wn: 15, Hn: 42, Ha: 18, tr: [0.5, 70, 15], tw: 'twin', Ht: 64, cs: 112, stone: [0.88, 0.85, 0.77] }),
    G_('Milan Cathedral', 45.46416, 9.19190, 90, { L: 158, W: 67, Wn: 16, Hn: 45, Ha: 26, tr: [0.62, 93, 16], tw: 'none', cs: 108, stone: [0.95, 0.91, 0.88], pinn: 1 }),
    G_('Westminster Abbey', 51.49929, -0.12731, 87, { L: 156, W: 30, Wn: 12, Hn: 31, Ha: 14, tr: [0.55, 62, 12], tw: 'twin', Ht: 69, stone: [0.86, 0.83, 0.74] }),
    G_('York Minster', 53.96204, -1.08194, 90, { L: 158, W: 32, Wn: 14, Hn: 31, Ha: 15, tr: [0.5, 76, 14], tw: 'twin', Ht: 60, ct: 71, stone: [0.86, 0.82, 0.7] }),
    G_('Salisbury Cathedral', 51.06508, -1.79745, 90, { L: 135, W: 25, Wn: 12, Hn: 26, Ha: 12, tr: [0.5, 70, 12], tw: 'none', cs: 123, ct: 62, stone: [0.8, 0.79, 0.75] }),
    G_('Canterbury Cathedral', 51.27976, 1.08296, 90, { L: 157, W: 28, Wn: 12, Hn: 24, Ha: 13, tr: [0.45, 47, 12], tw: 'twin', Ht: 48, ct: 72, stone: [0.85, 0.82, 0.72] }),
    G_('Strasbourg Cathedral', 48.58181, 7.75107, 90, { L: 112, W: 41, Wn: 16, Hn: 32, Ha: 15, tr: [0.6, 50, 14], tw: 'oneSpire', Ht: 66, Hs: 142, stone: [0.74, 0.5, 0.44] }),
    G_('Ulm Minster', 48.39845, 9.99244, 90, { L: 123, W: 49, Wn: 15, Hn: 41, Ha: 20, tw: 'westSpire', Ht: 100, Hs: 161, stone: [0.86, 0.84, 0.78] }),
    G_("St. Stephen's Cathedral, Vienna", 48.20849, 16.37315, 90, { L: 107, W: 39, Wn: 12, Hn: 28, Ha: 26, tw: 'none', st: 136, stone: [0.66, 0.63, 0.57], roof: [0.42, 0.5, 0.38] }),
    G_('St. Vitus Cathedral', 50.09086, 14.40043, 90, { L: 124, W: 34, Wn: 13, Hn: 33, Ha: 15, tr: [0.55, 60, 13], tw: 'twinSpire', Ht: 60, Hs: 82, st: 96, stone: [0.6, 0.58, 0.55] }),
    G_('Burgos Cathedral', 42.34045, -3.70444, 100, { L: 108, W: 30, Wn: 12, Hn: 26, Ha: 14, tr: [0.5, 59, 12], tw: 'twinSpire', Ht: 50, Hs: 80, stone: [0.9, 0.86, 0.76] }),
    G_('Seville Cathedral', 37.38582, -5.99319, 90, { L: 135, W: 76, Wn: 16, Hn: 37, Ha: 26, tw: 'none', giralda: 104, stone: [0.86, 0.78, 0.64] }),
    G_("St. Patrick's Cathedral, New York", 40.75846, -73.97604, 119, { L: 101, W: 39, Wn: 14, Hn: 34, Ha: 16, tr: [0.55, 53, 14], tw: 'twinSpire', Ht: 50, Hs: 100, stone: [0.93, 0.91, 0.87] }),
    G_('Washington National Cathedral', 38.93063, -77.07069, 90, { L: 161, W: 40, Wn: 13, Hn: 31, Ha: 15, tr: [0.5, 84, 13], tw: 'twin', Ht: 71, ct: 92, stone: [0.82, 0.8, 0.74] }),
    { k: 'rock', name: 'Acropolis of Athens', lat: 37.97160, lon: 23.72630, b: 0, ring: [[37.9722, 23.7245], [37.9725, 23.7256], [37.9727, 23.7268], [37.9725, 23.7279], [37.9718, 23.7284], [37.9711, 23.7281], [37.9707, 23.7270], [37.9708, 23.7258], [37.9711, 23.7248], [37.9716, 23.7243]], up: 58 },
    { k: 'colrow', name: 'Propylaea', lat: 37.97160, lon: 23.72505, b: 0, n: 6, gap: 3.6, Hc: 8.8, D: 1.55, pod: 1, ent: 2.2, on: 'acropolis', stone: [0.89, 0.84, 0.74] },
    { k: 'temple', on: 'acropolis', name: 'Parthenon', lat: 37.97150, lon: 23.72662, b: 77, L: 69.5, W: 30.9, nf: 8, ns: 17, Hc: 10.4, D: 1.9, pod: 1.6, ent: 3.3, roof: false, ped: 'frame', cella: 'ruin', stone: [0.89, 0.84, 0.74] },
    { k: 'temple', name: 'Temple of Hephaestus', lat: 37.97559, lon: 23.72135, b: 77, L: 31.8, W: 13.7, nf: 6, ns: 13, Hc: 5.7, D: 1.0, pod: 1.2, ent: 1.6, roof: true, cella: true, stone: [0.84, 0.78, 0.66] },
    { k: 'pantheon', name: 'Pantheon', lat: 41.89855, lon: 12.47683, b: 172, inside: 'pantheon' },
    { k: 'colosseum', name: 'Colosseum', lat: 41.89021, lon: 12.49223, b: 70, A: 94.5, B: 78, H: 48 },
    { k: 'temple', name: 'Temple of Saturn', lat: 41.89262, lon: 12.48438, b: 330, L: 22, W: 15, nf: 6, ns: 3, Hc: 11, D: 1.4, pod: 9, ent: 2.2, roof: false, ped: 'none', cella: false, front: true, stone: [0.82, 0.76, 0.66] },
    { k: 'colrow', name: 'Temple of Castor and Pollux', lat: 41.89178, lon: 12.48614, b: 70, n: 3, gap: 4.2, Hc: 14.8, D: 1.5, pod: 7, ent: 2.4, stone: [0.86, 0.82, 0.72] },
    { k: 'arch', name: 'Arch of Septimius Severus', lat: 41.89303, lon: 12.48473, b: 60, W: 25, D: 11, H: 21, n: 3, stone: [0.86, 0.82, 0.72] },
    { k: 'facade', name: 'Library of Celsus', lat: 37.93939, lon: 27.34063, b: 270, W: 21, H: 16.7, stone: [0.88, 0.84, 0.76] },
    { k: 'colrow', name: 'Temple of Jupiter, Baalbek', lat: 34.00686, lon: 36.20391, b: 90, n: 6, gap: 4.4, Hc: 20, D: 2.2, pod: 7, ent: 5, stone: [0.82, 0.72, 0.58] },
    { k: 'temple', name: 'Temple of Bacchus', lat: 34.00611, lon: 36.20385, b: 90, L: 69, W: 36, nf: 8, ns: 15, Hc: 19, D: 1.9, pod: 5, ent: 4, roof: false, ped: 'none', cella: true, stone: [0.82, 0.72, 0.58] },
    { k: 'arch', name: 'Arch of Septimius Severus, Leptis Magna', lat: 32.63710, lon: 14.28940, b: 0, W: 18, D: 18, H: 20, n: 4, stone: [0.84, 0.74, 0.6] },
    { k: 'theatre', name: 'Theatre of Leptis Magna', lat: 32.63930, lon: 14.29010, b: 330, R: 45, H: 14, stone: [0.84, 0.74, 0.6] },
    { k: 'oval', name: 'Oval Plaza, Jerash', lat: 32.28060, lon: 35.89080, b: 0, A: 45, B: 40, n: 56, Hc: 6, stone: [0.86, 0.8, 0.68] },
    { k: 'cardo', name: 'Cardo Maximus, Jerash', lat: 32.28410, lon: 35.89170, b: 8, L: 600, w: 12, gap: 6, Hc: 6, stone: [0.86, 0.8, 0.68] },
    { k: 'colrow', name: 'Temple of Artemis, Jerash', lat: 32.28400, lon: 35.88890, b: 90, n: 6, gap: 3.4, Hc: 13, D: 1.5, pod: 4, ent: 2, side: 5, stone: [0.86, 0.8, 0.68] },
    { k: 'temple', name: 'Maison Carree', lat: 43.83826, lon: 4.35612, b: 180, L: 26.4, W: 13.5, nf: 6, ns: 11, Hc: 9, D: 0.9, pod: 2.9, ent: 2.2, roof: true, cella: true, front: true, stone: [0.88, 0.84, 0.74] },
    { k: 'temple', name: 'La Madeleine', lat: 48.87005, lon: 2.32455, b: 180, L: 108, W: 43, nf: 8, ns: 18, Hc: 20, D: 1.8, pod: 7, ent: 4, roof: true, cella: true, stone: [0.86, 0.83, 0.76] },
    { k: 'temple', name: 'Lincoln Memorial', lat: 38.88927, lon: -77.05017, b: 270, L: 57.8, W: 36, nf: 12, ns: 8, Hc: 13.4, D: 2.1, pod: 4, ent: 4, roof: 'attic', cella: true, stone: [0.94, 0.93, 0.9] },
    { k: 'gate', name: 'Brandenburg Gate', lat: 52.51628, lon: 13.37770, b: 90, W: 65.5, D: 11, H: 26, n: 6, Hc: 15, stone: [0.86, 0.82, 0.72] },
    { k: 'rotunda', name: 'Jefferson Memorial', lat: 38.88136, lon: -77.03651, b: 180, R: 26, H: 20, D: 30, stone: [0.94, 0.93, 0.9] },
    { k: 'rotunda', name: 'Pantheon, Paris', lat: 48.84622, lon: 2.34637, b: 270, R: 17, H: 50, D: 83, cross: true, stone: [0.88, 0.85, 0.77] },
    { k: 'domeChurch', name: 'Florence Cathedral dome', lat: 43.77312, lon: 11.25695, r: 27, drum: 55, top: 91, lan: 107, col: [0.72, 0.36, 0.24], drumCol: [0.9, 0.88, 0.82], seg: 8, ribs: [0.95, 0.94, 0.9], inside: 'florence' },
    { k: 'domeChurch', name: "St. Peter's Basilica dome", lat: 41.90217, lon: 12.45338, r: 30, drum: 73, top: 120, lan: 133, col: [0.55, 0.6, 0.63], drumCol: [0.88, 0.84, 0.74], seg: 16, ribs: [0.85, 0.83, 0.78], inside: 'stpeter' },
    { k: 'wall', name: 'Western Wall', lat: 31.77670, lon: 35.23425, b: 0, L: 57, H: 19, T: 3, stone: [0.88, 0.82, 0.66] },
    { k: 'ruin', name: 'Synagogue of Capernaum', lat: 32.88105, lon: 35.57541, b: 0, L: 24.4, W: 18.6, stone: [0.94, 0.92, 0.86] },
    { k: 'monastery', name: "Saint Catherine's Monastery", lat: 28.55593, lon: 33.97588, b: 120, L: 85, W: 75, H: 12, stone: [0.7, 0.6, 0.5] },
    { k: 'church', name: 'Kingston Parish Church', lat: 17.97004, lon: -76.79257, b: 90, L: 40, W: 18, H: 11, tower: 27, walls: [0.93, 0.91, 0.85], roofC: [0.62, 0.28, 0.22], top: 'parapet' },
    { k: 'church', name: 'Cathedral of St. Jago de la Vega', lat: 17.99441, lon: -76.95209, b: 90, L: 45, W: 16, H: 10, tower: 22, spire: 36, walls: [0.64, 0.33, 0.26], roofC: [0.4, 0.42, 0.45], tr: 28 },
    { k: 'synagogue', own: 1, name: 'Shaare Shalom Synagogue', lat: 17.97509, lon: -76.79011, b: 90, L: 24, W: 16, H: 11, walls: [0.95, 0.94, 0.9], portico: 4, inside: 'shaare' },
    { k: 'synagogue', name: 'Touro Synagogue', lat: 41.48943, lon: -71.31193, b: 70, L: 15, W: 12, H: 9, walls: [0.84, 0.76, 0.62], hip: 1 },
    { k: 'synagogue', name: 'Dohany Street Synagogue', lat: 47.49565, lon: 19.06073, b: 135, L: 75, W: 27, H: 26, walls: [0.86, 0.72, 0.6], towers: 43 }];
  var IN = {   /* the interiors: where, how big (m), what kind of room */
    pantheon: { lat: 41.89855, lon: 12.47683, kind: 'rotunda', r: 21.65, h: 21.65, dh: 21.65, eye: 4.1, seg: 28 },
    florence: { lat: 43.77312, lon: 11.25695, kind: 'rotunda', r: 22.7, h: 55, dh: 32, eye: 3, seg: 8 },
    stpeter: { lat: 41.90217, lon: 12.45338, kind: 'rotunda', r: 21, h: 72, dh: 42, eye: 3.2, seg: 32 },
    bluemosque: { lat: 41.00525, lon: 28.97688, kind: 'rotunda', r: 24, h: 24, dh: 19, eye: 0, seg: 32 },
    notredame: { lat: 48.852973, lon: 2.349911, kind: 'nave', b: 112, L: 110, W: 12.5, h: 33, bay: 7.3333, dw: 3, dy: 11, endH: 41 },   /* round 3: 3.9 m west of the church's middle, 110 m: from inside its west towers to the apse's curve (the exterior's walls all stand outside it); bay, its 15 bays (m); dw/dy, the west portal's half width and its top (m, from the room's base); endH, the end walls up into the vault's point (no gap over them) */
    shaare: { lat: 17.97509, lon: -76.79011, kind: 'hall', b: 90, L: 22.6, W: 14.6, h: 10, dw: 1.8, dy: 6.5 } };

  /* ---------- tile doors: the landmarks' rectangles (the map's boxes under them dropped), the tasks, the open footprints ---------- */
  function frameOf(J, K, lat, lon, b) { var p = K.fromLL(J, lat, lon), q = K.fromLL(J, lat + Math.cos(b * D2R) * 1e-4, lon + Math.sin(b * D2R) * 1e-4 / Math.cos(lat * D2R)), dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1; return { x: p[0], z: p[1], ux: dx / l, uz: dz / l }; }
  function ext(L) { if (L.k === 'gothic') return [Math.max(L.L, (L.tr ? L.tr[1] : 0)) / 2 + 4, Math.max(L.W, L.tr ? L.tr[1] : 0) / 2 + 4]; if (L.k === 'domeChurch') return [L.r + 2, L.r + 2]; if (L.k === 'pantheon') return [56, 32];
    if (L.k === 'colosseum') return [L.A + 4, L.B + 4]; if (L.k === 'wall' || L.k === 'cardo' || L.k === 'oval' || L.k === 'theatre' || L.k === 'arch' || L.k === 'colrow' || L.k === 'facade') return null; if (L.k === 'monastery') return null;
    if (L.own) return [L.L / 2 + 2, L.W / 2 + 2]; if (L.k === 'temple') return [L.L / 2 + 2, L.W / 2 + 2]; if (L.k === 'rotunda') return [L.R + 2, L.R + 2]; if (L.k === 'gate') return [L.D / 2 + 2, L.W / 2 + 2]; return null; }   // the ones beside the map's own (a wall, a colonnade, a ruin on open ground) drop nothing
  function bounds(t) { var n = Math.pow(2, t.z), la = function (y) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) / D2R; }; return { lat0: la(t.y + 1), lat1: la(t.y), lon0: t.x / n * 360 - 180, lon1: (t.x + 1) / n * 360 - 180 }; }
  function inTile(t, lat, lon, m) { var b = bounds(t); return lat >= b.lat0 - m && lat <= b.lat1 + m && lon >= b.lon0 - m && lon <= b.lon1 + m; }
  var Kk = null;
  function skips(J, t, K) { if (!on()) return null; var out = []; Kk = K || Kk; if (!Kk) return null;
    for (var i = 0; i < LM.length; i++) { var L = LM[i], e = ext(L); if (!e || !inTile(t, L.lat, L.lon, 0.004)) continue; var f = frameOf(J, Kk, L.lat, L.lon, L.b || 0); out.push({ x: f.x, z: f.z, ux: f.ux, uz: f.uz, hl: e[0], hw: e[1], name: L.name }); }
    return out.length ? out : null; }
  function tasks(J, t, K, list) { Kk = K; for (var i = 0; i < LM.length; i++) { var L = LM[i]; if (inTile(t, L.lat, L.lon, 0)) list.unshift({ k: 'lm831', L: L }); }
    for (var k in IN) { var I = IN[k]; if (!inTile(t, I.lat, I.lon, 0.003)) continue; var c = K.fromLL(J, I.lat, I.lon), R = I.kind === 'rotunda' ? I.r + 6 : Math.max(I.L, I.W) / 2 + 6;   /* her way in: the footprints over the room are open */
      (J.fp || []).forEach(function (f) { if (Math.hypot((f.x0 + f.x1) / 2 - c[0], (f.z0 + f.z1) / 2 - c[1]) < R) { f.open831 = true; st.opened++; } });
      /* round 3: and the map's own blocks in front of its door (Notre-Dame's west towers held her 13 m out of the portal): a corridor 30 m out, the door's width and 2 m */
      var brg = (I.kind === 'rotunda' ? (k === 'pantheon' ? 0 : (I.b || 90) + 180) : (I.b || 90) + 180) * D2R, e0 = I.kind === 'rotunda' ? I.r : I.L / 2, hw2 = (I.dw || (I.kind === 'rotunda' ? 3.5 : 1.8)) + 2, pts = [];
      for (var s = e0 - 4; s <= e0 + 30; s += 2) for (var w2 = -1; w2 <= 1; w2++) { var dN = Math.cos(brg) * s - Math.sin(brg) * w2 * hw2, dE = Math.sin(brg) * s + Math.cos(brg) * w2 * hw2; pts.push(K.fromLL(J, I.lat + dN / 111320, I.lon + dE / (111320 * Math.cos(I.lat * D2R)))); }
      (J.fp || []).forEach(function (f) { if (f.open831) return; for (var q = 0; q < pts.length; q++) if (pts[q][0] > f.x0 - 0.5 && pts[q][0] < f.x1 + 0.5 && pts[q][1] > f.z0 - 0.5 && pts[q][1] < f.z1 + 0.5) { f.open831 = true; st.opened++; st.doorOpened = (st.doorOpened || 0) + 1; return; } }); } }
  function want(p) { return p.k === 'church' || p.k === 'synagogue'; }

  /* ---------- the parts every builder uses ---------- */
  var g = null, G = null;
  function P_(f, s, t) { return [f.x + f.ux * s - f.uz * t, f.z + f.uz * s + f.ux * t]; }
  function bx(o, f, s, t, hl, hw, y0, y1, c, roof) { var p = P_(f, s, t); g.box(o, p[0], p[1], f.ux, f.uz, hl, hw, y0, y1, c, roof); }
  function cross(o, x, z, y, s, c) { c = c || GOLD; g.box(o, x, z, 1, 0, 0.09 * s, 0.09 * s, y, y + 2.2 * s, c); g.box(o, x, z, 1, 0, 0.55 * s, 0.09 * s, y + 1.35 * s, y + 1.55 * s, c); st.crosses++; }
  function pyramid(o, f, s, t, hw, y0, y1, c, n) { var p = P_(f, s, t); g.revolve(o, p[0], p[1], y0, [[hw * 1.41, 0], [0.02, y1 - y0], [0, y1 - y0 + 0.01]], c, n || 4); }
  function column(o, x, z, y0, h, d, c) { g.revolve(o, x, z, y0, [[d * 0.5, 0], [d * 0.5, h * 0.04], [d * 0.45, h * 0.06], [d * 0.4, h * 0.92], [d * 0.55, h * 0.97], [d * 0.55, h]], c, 8); }
  function gable(o, f, s, hw, y0, rise, c, n) { var a = P_(f, s, -hw), b = P_(f, s, hw), m = P_(f, s, 0), cc = g.col(c), k0 = G.V(o, a[0], y0, a[1], n[0], 0, n[1], cc, 0, 0, g.PLAIN, 0, 0), k1 = G.V(o, b[0], y0, b[1], n[0], 0, n[1], cc, 0, 0, g.PLAIN, 0, 0), k2 = G.V(o, m[0], y0 + rise, m[1], n[0], 0, n[1], cc, 0, 0, g.PLAIN, 0, 0); o.i.push(k0, k1, k2, k0, k2, k1); }
  function roofGable(J, f, s0, s1, hw, y0, rise, c) { var RO = J.roof, cc = g.col(c), A = P_(f, s0, -hw), B = P_(f, s1, -hw), Cq = P_(f, s1, hw), D = P_(f, s0, hw), R0 = P_(f, s0, 0), R1 = P_(f, s1, 0);
    G.quadRoof(RO, [A[0], y0, A[1]], [B[0], y0, B[1]], [R1[0], y0 + rise, R1[1]], [R0[0], y0 + rise, R0[1]], cc); G.quadRoof(RO, [Cq[0], y0, Cq[1]], [D[0], y0, D[1]], [R0[0], y0 + rise, R0[1]], [R1[0], y0 + rise, R1[1]], cc); st.roofs++; }
  function halfCyl(o, cx, cz, y0, y1, r, ux, uz, c, n) { var cc = g.col(c), px = -uz, pz = ux, prev = null; for (var i = 0; i <= n; i++) { var th = -Math.PI / 2 + i / n * Math.PI, dx = ux * Math.cos(th) + px * Math.sin(th), dz = uz * Math.cos(th) + pz * Math.sin(th);
      var k0 = G.V(o, cx + dx * r, y0, cz + dz * r, dx, 0, dz, cc, 0, 0, g.PLAIN, 0, 0), k1 = G.V(o, cx + dx * r, y1, cz + dz * r, dx, 0, dz, cc, 0, 0, g.PLAIN, 0, 0); if (prev) o.i.push(prev[0], k0, prev[1], prev[1], k0, k1, prev[0], prev[1], k0, prev[1], k1, k0); prev = [k0, k1]; } }
  function flat(o, f, s, t, cc, nrm, y0, y1, hw) {   // a dark pointed window (lancet) on a wall facing nrm
    var a = P_(f, s - hw, t), b = P_(f, s + hw, t), m = P_(f, s, t), c = g.col(cc), k = [G.V(o, a[0], y0, a[1], nrm[0], 0, nrm[1], c, 0, 0, g.PLAIN, 0, 0), G.V(o, b[0], y0, b[1], nrm[0], 0, nrm[1], c, 0, 0, g.PLAIN, 0, 0), G.V(o, b[0], y1, b[1], nrm[0], 0, nrm[1], c, 0, 0, g.PLAIN, 0, 0), G.V(o, a[0], y1, a[1], nrm[0], 0, nrm[1], c, 0, 0, g.PLAIN, 0, 0), G.V(o, m[0], y1 + hw * 1.5, m[1], nrm[0], 0, nrm[1], c, 0, 0, g.PLAIN, 0, 0)];
    o.i.push(k[0], k[1], k[2], k[0], k[2], k[3], k[3], k[2], k[4], k[0], k[2], k[1], k[0], k[3], k[2], k[3], k[4], k[2]); }
  function rose(o, f, s, t0, y, r, nrm) {   // a rose window: a wheel of coloured glass (colour only), a stone ring and spokes
    var p = P_(f, s, t0), cc = [g.col(GLASS), g.col([0.42, 0.16, 0.2]), g.col([0.2, 0.3, 0.55])], ring = g.col([0.78, 0.74, 0.66]), N = 16, ctr = G.V(o, p[0], y, p[1], nrm[0], 0, nrm[1], cc[2], 0, 0, g.PLAIN, 0, 0), px = -f.uz, pz = f.ux, prev = null;
    for (var i = 0; i <= N; i++) { var a = i / N * 6.283, q = [p[0] + px * Math.cos(a) * r, y + Math.sin(a) * r, p[1] + pz * Math.cos(a) * r], k = G.V(o, q[0], q[1], q[2], nrm[0], 0, nrm[1], cc[i % 2], 0, 0, g.PLAIN, 0, 0); if (prev !== null) o.i.push(ctr, prev, k, ctr, k, prev); prev = k; }
    for (i = 0; i < 8; i++) { var a2 = i / 8 * 3.1416; g.box(o, p[0], p[1], Math.cos(a2) * px, Math.cos(a2) * pz, 0.12, 0.06, y + Math.sin(a2) * r - 0.12, y + Math.sin(a2) * r + 0.12, [0.78, 0.74, 0.66]); }
    g.revolve(o, p[0], p[1], y - 0.01, [[r * 1.08, 0], [r * 1.08, 0.02]], [0.78, 0.74, 0.66], 6); }

  /* ---------- the builders ---------- */
  function gothic(J, K, L, o, f, y) {   // 831 round 2 (the coordinator's look at 260 m): the Gothic kit's signature parts, each big enough to read from her height
    var S = L.stone, Sd = [S[0] * 0.8, S[1] * 0.79, S[2] * 0.78], Sl = [Math.min(1, S[0] * 1.07), Math.min(1, S[1] * 1.07), Math.min(1, S[2] * 1.06)], R = L.roof || LEAD, hl = L.L / 2, Wn = L.Wn, Wa = (L.W - Wn) / 2, Tw = L.tw === 'none' ? 0 : Math.min(L.W * 0.32, 17);
    var s0 = -hl + Tw, apse = Wn / 2 + Wa * 0.6, s1 = hl - apse, back = [-f.ux, -f.uz], rise = Wn * 1.05, sd, s;
    var lancet = function (fr, sA, tA, nrm, y0, y1, w) {   // a tall pointed window: a darker stone frame, the glass, a mullion and a little rosette in its head
      flat(o, fr, sA, tA, Sd, nrm, y0 - 0.6, y1 + 0.2, w + 0.45); flat(o, { x: fr.x + nrm[0] * 0.05, z: fr.z + nrm[1] * 0.05, ux: fr.ux, uz: fr.uz }, sA, tA, GLASS, nrm, y0, y1, w);
      var m = P_(fr, sA, tA); g.box(o, m[0] + nrm[0] * 0.12, m[1] + nrm[1] * 0.12, fr.ux, fr.uz, 0.09, 0.05, y0, y1 + w * 0.6, Sl); };
    /* the nave and its steep dark lead roof (a cresting along the ridge), its parapet of pinnacles */
    if (L.inside) { for (var sw = -1; sw <= 1; sw += 2) bx(o, f, (s0 + s1) / 2, sw * (Wn / 2 - 0.12), (s1 - s0) / 2, 0.12, y - 1, y + L.Hn, S, false);   /* round 3: a nave she flies into: its two walls, no end caps (they stood inside her room, a plain wall across the choir) */
      roofGable(J, f, -hl + 0.3, s1 + 0.1, Wn / 2 + 0.6, y + L.Hn, rise, R); gable(o, f, -hl + 0.3, Wn / 2, y + L.Hn, rise, S, back); }   /* the roof runs on over the room's west bay to the front, its gable there */
    else { bx(o, f, (s0 + s1) / 2, 0, (s1 - s0) / 2, Wn / 2, y - 1, y + L.Hn, S, false);
      roofGable(J, f, s0, s1 + 0.1, Wn / 2 + 0.6, y + L.Hn, rise, R); gable(o, f, s0, Wn / 2, y + L.Hn, rise, S, back); }
    bx(o, f, (s0 + s1) / 2, 0, (s1 - s0) / 2, 0.18, y + L.Hn + rise - 0.1, y + L.Hn + rise + 0.6, [0.62, 0.55, 0.38]);
    for (sd = -1; sd <= 1; sd += 2) {
      var nrm = sd > 0 ? [-f.uz, f.ux] : [f.uz, -f.ux];
      bx(o, f, (s0 + s1) / 2, sd * (Wn / 2 + Wa / 2), (s1 - s0) / 2, Wa / 2, y - 1, y + L.Ha, S);   // the aisle, its lean-to roof
      var ra = P_(f, s0, sd * (Wn / 2)), rb = P_(f, s1, sd * (Wn / 2)), rc = P_(f, s1, sd * (Wn / 2 + Wa + 0.4)), rd = P_(f, s0, sd * (Wn / 2 + Wa + 0.4)), yr = y + L.Ha, yt = y + L.Ha + Wa * 0.5;
      if (sd > 0) G.quadRoof(J.roof, [rd[0], yr, rd[1]], [rc[0], yr, rc[1]], [rb[0], yt, rb[1]], [ra[0], yt, ra[1]], g.col(R)); else G.quadRoof(J.roof, [ra[0], yt, ra[1]], [rb[0], yt, rb[1]], [rc[0], yr, rc[1]], [rd[0], yr, rd[1]], g.col(R));
      bx(o, f, (s0 + s1) / 2, sd * (Wn / 2 + 0.25), (s1 - s0) / 2, 0.35, y + L.Hn - 0.4, y + L.Hn + 0.5, Sl);   // the cornice
      for (s = s0 + 4; s < s1 - 2; s += 7.5) {
        var tb = sd * (Wn / 2 + Wa + 1.8);   // the pier outside the aisle, its pinnacle, and two flying arms up to the nave wall
        bx(o, f, s, tb, 0.9, 1.6, y - 1, y + L.Ha + 7, Sd); pyramid(o, f, s, tb, 1.0, y + L.Ha + 7, y + L.Ha + 14, Sl, 4);
        for (var arm = 0; arm < 2; arm++) { var a = P_(f, s, tb - sd * 1.6), b = P_(f, s, sd * (Wn / 2 + 0.2)), ya = y + L.Ha + 2 + arm * 4, yb = y + L.Hn * (0.62 + arm * 0.24), th = 1.1, cc = g.col(Sd), n2 = [-f.ux, 0, -f.uz];
          var kk = [[a, ya], [a, ya + th], [b, yb + th], [b, yb]].map(function (q) { return G.V(o, q[0][0] - f.ux * 0.45, q[1], q[0][1] - f.uz * 0.45, n2[0], 0, n2[2], cc, 0, 0, g.PLAIN, 0, 0); }), kb = [[a, ya], [a, ya + th], [b, yb + th], [b, yb]].map(function (q) { return G.V(o, q[0][0] + f.ux * 0.45, q[1], q[0][1] + f.uz * 0.45, -n2[0], 0, -n2[2], cc, 0, 0, g.PLAIN, 0, 0); });
          o.i.push(kk[0], kk[1], kk[2], kk[0], kk[2], kk[3], kk[0], kk[2], kk[1], kk[0], kk[3], kk[2], kb[0], kb[1], kb[2], kb[0], kb[2], kb[3], kb[0], kb[2], kb[1], kb[0], kb[3], kb[2]);
          var tp = [kk[1], kb[1], kb[2], kk[2]]; o.i.push(tp[0], tp[1], tp[2], tp[0], tp[2], tp[3], tp[0], tp[2], tp[1], tp[0], tp[3], tp[2]); }   // its top, so it reads from above
        pyramid(o, f, s, sd * (Wn / 2 + 0.1), 0.45, y + L.Hn, y + L.Hn + 4.5, Sl, 4);
        lancet(f, s + 3.75, sd * (Wn / 2 + 0.06), nrm, y + L.Ha + Wa * 0.5 + 1.5, y + L.Hn - 3.5, 1.35);   // the clerestory
        lancet(f, s + 3.75, sd * (Wn / 2 + Wa + 0.06), nrm, y + 2.5, y + L.Ha - 3, 1.15); } }   // the aisle's windows
    /* the transept: its arms, steep roof, a great rose and a portal at each end */
    if (L.tr) { var ts = -hl + L.L * L.tr[0], th2 = L.tr[1] / 2, RO = J.roof, cc2 = g.col(R), w2 = L.tr[2] / 2 + 0.6, rr = L.tr[2] * 1.0;
      /* round 3: a cathedral she can fly into (L.inside) has its transept as two arms off the nave, roofed each: the crossing is the nave's own (one box across it stood inside the nave, a grey wall and a slate roof in the vault) */
      var arms = L.inside ? [[-th2, -Wn / 2], [Wn / 2, th2]] : [[-th2, th2]];
      arms.forEach(function (ar) { bx(o, f, ts, (ar[0] + ar[1]) / 2, L.tr[2] / 2, (ar[1] - ar[0]) / 2, y - 1, y + L.Hn, S, false);
        var A = P_(f, ts, ar[0]), Bq = P_(f, ts, ar[1]), q1 = function (dsg) { return [A[0] + f.ux * w2 * dsg, A[1] + f.uz * w2 * dsg]; }, q2 = function (dsg) { return [Bq[0] + f.ux * w2 * dsg, Bq[1] + f.uz * w2 * dsg]; };
        G.quadRoof(RO, [q1(-1)[0], y + L.Hn, q1(-1)[1]], [q2(-1)[0], y + L.Hn, q2(-1)[1]], [Bq[0], y + L.Hn + rr, Bq[1]], [A[0], y + L.Hn + rr, A[1]], cc2); G.quadRoof(RO, [q2(1)[0], y + L.Hn, q2(1)[1]], [q1(1)[0], y + L.Hn, q1(1)[1]], [A[0], y + L.Hn + rr, A[1]], [Bq[0], y + L.Hn + rr, Bq[1]], cc2); });
      for (var e = -1; e <= 1; e += 2) { var fe = P_(f, ts, e * th2), en = [-f.uz * e, f.ux * e], ff = { x: fe[0], z: fe[1], ux: -f.uz, uz: f.ux };
        gable(o, ff, 0, L.tr[2] / 2, y + L.Hn, rr, S, en); rose(o, { x: fe[0] - f.uz * e * 0.12, z: fe[1] + f.ux * e * 0.12, ux: f.uz, uz: -f.ux }, 0, 0, y + L.Hn * 0.64, L.tr[2] * 0.36, en);
        flat(o, { x: fe[0] - f.uz * e * 0.1, z: fe[1] + f.ux * e * 0.1, ux: f.ux, uz: f.uz }, 0, 0, [0.2, 0.16, 0.14], en, y, y + 7, 2.6);
        for (var cb = -1; cb <= 1; cb += 2) { var cbp = P_(f, ts + cb * (L.tr[2] / 2 + 0.6), e * (th2 + 0.6)); g.box(o, cbp[0], cbp[1], f.ux, f.uz, 1.2, 1.2, y - 1, y + L.Hn + 4, Sd); g.revolve(o, cbp[0], cbp[1], y + L.Hn + 4, [[1.6, 0], [0.02, 7]], Sl, 4); } } }
    /* the apse: its wall, the steep conical roof, and the ring of buttresses with their arms (the chevet) */
    var ap = P_(f, s1, 0); halfCyl(o, ap[0], ap[1], y - 1, y + L.Hn, Wn / 2, f.ux, f.uz, S, 10); g.half(o, ap[0], ap[1], y + L.Hn, Wn / 2 + 0.6, rise, f.ux, f.uz, R, 10);
    halfCyl(o, ap[0], ap[1], y - 1, y + L.Ha, Wn / 2 + Wa, f.ux, f.uz, S, 12);
    for (var ai = 0; ai < 7; ai++) { var aa = -1.35 + ai * 0.45, dx = f.ux * Math.cos(aa) - f.uz * Math.sin(aa), dz = f.uz * Math.cos(aa) + f.ux * Math.sin(aa), Rr = Wn / 2 + Wa + 1.8, ax = ap[0] + dx * Rr, az = ap[1] + dz * Rr;
      g.box(o, ax, az, dx, dz, 1.6, 0.9, y - 1, y + L.Ha + 7, Sd); g.revolve(o, ax, az, y + L.Ha + 7, [[1.4, 0], [0.02, 7]], Sl, 4);
      var bxx = ap[0] + dx * (Wn / 2 + 0.2), bzz = ap[1] + dz * (Wn / 2 + 0.2), cc3 = g.col(Sd), kk3 = [[ax, az, y + L.Ha + 3], [ax, az, y + L.Ha + 4.2], [bxx, bzz, y + L.Hn * 0.86 + 1.2], [bxx, bzz, y + L.Hn * 0.86]].map(function (q) { return G.V(o, q[0], q[2], q[1], 0, 1, 0, cc3, 0, 0, g.PLAIN, 0, 0); });
      o.i.push(kk3[0], kk3[1], kk3[2], kk3[0], kk3[2], kk3[3], kk3[0], kk3[2], kk3[1], kk3[0], kk3[3], kk3[2]); }
    /* the west front: the towers with their corner buttresses, string courses, tall belfry lancets on every face; the gallery between them; the rose; three portals */
    var fs = -hl, wf = { x: P_(f, fs, 0)[0], z: P_(f, fs, 0)[1], ux: f.ux, uz: f.uz }, front = [-f.ux, -f.uz], across = { x: wf.x, z: wf.z, ux: -f.uz, uz: f.ux };
    var tower = function (tt2, top) { bx(o, f, fs + Tw / 2, tt2, Tw / 2, Tw / 2, y - 1, y + top, S);
      for (var c = 0; c < 4; c++) { var cs = [[1, 1], [1, -1], [-1, 1], [-1, -1]][c]; bx(o, f, fs + Tw / 2 + cs[0] * (Tw / 2 + 0.2), tt2 + cs[1] * (Tw / 2 + 0.2), 0.7, 0.7, y - 1, y + top - 4, Sd); }
      for (var k = 1; k <= 3; k++) bx(o, f, fs + Tw / 2, tt2, Tw / 2 + 0.3, Tw / 2 + 0.3, y + top * k / 4 - 0.4, y + top * k / 4 + 0.4, Sl);
      for (var d = 0; d < 4; d++) { var nd = [[-f.ux, -f.uz], [f.ux, f.uz], [-f.uz, f.ux], [f.uz, -f.ux]][d], tcx = P_(f, fs + Tw / 2, tt2), fc = { x: tcx[0] + nd[0] * (Tw / 2 + 0.05), z: tcx[1] + nd[1] * (Tw / 2 + 0.05), ux: -nd[1], uz: nd[0] };
        for (var w = -1; w <= 1; w += 2) lancet(fc, w * Tw * 0.2, 0, nd, y + top * 0.76, y + top - 3, Tw * 0.1); } };
    if (L.tw === 'twin' || L.tw === 'twinSpire') { for (sd = -1; sd <= 1; sd += 2) { var tt3 = sd * (L.W / 2 - Tw / 2); tower(tt3, L.Ht); var tp3 = P_(f, fs + Tw / 2, tt3);
        if (L.tw === 'twinSpire') { g.revolve(o, tp3[0], tp3[1], y + L.Ht, [[Tw * 0.48, 0], [Tw * 0.4, (L.Hs - L.Ht) * 0.12], [Tw * 0.05, L.Hs - L.Ht], [0, L.Hs - L.Ht + 0.1]], Sl, 8); cross(o, tp3[0], tp3[1], y + L.Hs, Math.max(1, Tw / 8)); st.spires++;
          for (var p2 = 0; p2 < 4; p2++) { var cp2 = [[1, 1], [1, -1], [-1, 1], [-1, -1]][p2]; pyramid(o, f, fs + Tw / 2 + cp2[0] * Tw * 0.45, tt3 + cp2[1] * Tw * 0.45, 0.7, y + L.Ht, y + L.Ht + Tw * 0.9, Sl, 4); } }
        else { bx(o, f, fs + Tw / 2, tt3, Tw / 2 + 0.2, Tw / 2 + 0.2, y + L.Ht - 0.3, y + L.Ht + 1.2, Sl); for (var pc = 0; pc < 4; pc++) { var cs3 = [[1, 1], [1, -1], [-1, 1], [-1, -1]][pc]; pyramid(o, f, fs + Tw / 2 + cs3[0] * Tw * 0.44, tt3 + cs3[1] * Tw * 0.44, 0.8, y + L.Ht + 1.2, y + L.Ht + 6, Sl, 4); } } }
      /* the gallery: an open arcade of colonnettes across the front between the towers, a balustrade on top */
      var gy = y + L.Hn + 1.5; bx(o, f, fs - 0.1, 0, 0.6, L.W / 2 - 0.2, gy - 0.6, gy, Sl); bx(o, f, fs - 0.12, 0, 0.1, L.W / 2 - 0.6, gy + 0.3, gy + 6.5, [0.14, 0.13, 0.13]);
      for (var cl = -L.W / 2 + 1; cl <= L.W / 2 - 1; cl += 1.6) { var cpt = P_(across, cl, 0.4); g.box(o, cpt[0], cpt[1], f.ux, f.uz, 0.2, 0.2, gy, gy + 7, Sl); } bx(o, f, fs - 0.2, 0, 0.7, L.W / 2, gy + 7, gy + 8.2, Sl); }
    if (L.tw === 'oneSpire' || L.tw === 'westSpire') { var ot = L.tw === 'westSpire' ? 0 : -(L.W / 2 - Tw / 2); tower(ot, L.Ht); var op = P_(f, fs + Tw / 2, ot); g.revolve(o, op[0], op[1], y + L.Ht, [[Tw * 0.48, 0], [Tw * 0.32, (L.Hs - L.Ht) * 0.35], [Tw * 0.05, L.Hs - L.Ht], [0, L.Hs - L.Ht + 0.1]], Sl, 8); cross(o, op[0], op[1], y + L.Hs, Math.max(1, Tw / 8)); st.spires++;
      if (L.tw === 'oneSpire') tower(-ot, L.Ht * 0.92); }
    var scr = L.tw === 'none' ? L.W / 2 : L.W / 2 - Tw; if (scr > 1) bx(o, f, fs + 1.2, 0, 1.2, scr, y - 1, y + L.Hn + (L.tw === 'none' ? rise : 1), S);
    if (L.tw === 'none') gable(o, f, fs, L.W / 2, y + L.Hn + 0.1, rise, S, front);
    var rR = Math.min(Wn * 0.45, 7.5); bx(o, f, fs - 0.08, 0, 0.1, rR + 1.2, y + L.Hn * 0.6 - rR - 1.2, y + L.Hn * 0.6 + rR + 1.2, Sd);   // the rose in its square frame
    rose(o, { x: wf.x - f.ux * 0.22, z: wf.z - f.uz * 0.22, ux: f.ux, uz: f.uz }, 0, 0, y + L.Hn * 0.6, rR, front);
    for (var pt = -1; pt <= 1; pt++) { var pw = pt ? 2.4 : 3.2, ph = pt ? 7 : 9.5; flat(o, across, pt * (L.W / 3.4), 0.05, Sd, front, y, y + ph + 0.6, pw + 0.9); flat(o, across, pt * (L.W / 3.4), 0.1, [0.2, 0.16, 0.14], front, y, y + ph, pw); }   // the portals, each in its archivolt
    for (var lt = -1; lt <= 1; lt += 2) lancet(across, lt * scr * 0.55, 0.06, front, y + L.Hn * 0.6 - 3, y + L.Hn * 0.6 + 4, 1.1);
    /* the crossing: a lead spire with its pinnacles, or a tower; Seville's Giralda; Vienna's south tower */
    if (L.cs || L.ct) { var cp = P_(f, L.tr ? -hl + L.L * L.tr[0] : 0, 0), cw = Wn * 0.42;
      if (L.ct) { g.box(o, cp[0], cp[1], f.ux, f.uz, Wn * 0.55, Wn * 0.55, y + L.Hn - 2, y + L.ct, S); for (var cq = 0; cq < 4; cq++) { var cs4 = [[1, 1], [1, -1], [-1, 1], [-1, -1]][cq]; g.revolve(o, cp[0] + (f.ux * cs4[0] - f.uz * cs4[1]) * Wn * 0.5, cp[1] + (f.uz * cs4[0] + f.ux * cs4[1]) * Wn * 0.5, y + L.ct, [[0.9, 0], [0.02, 6]], Sl, 4); } }
      if (L.cs) { var y0 = y + (L.ct || L.Hn + rise); g.revolve(o, cp[0], cp[1], y0 - 2, [[cw, 0], [cw, 3], [cw * 0.08, L.cs - (y0 - y)], [0, L.cs - (y0 - y) + 0.1]], L.pinn ? Sl : R, 8); cross(o, cp[0], cp[1], y + L.cs, Math.max(1, cw / 5)); st.spires++;
        for (var cq2 = 0; cq2 < 4; cq2++) { var c5 = [[1, 1], [1, -1], [-1, 1], [-1, -1]][cq2]; g.revolve(o, cp[0] + (f.ux * c5[0] - f.uz * c5[1]) * cw * 0.9, cp[1] + (f.uz * c5[0] + f.ux * c5[1]) * cw * 0.9, y0 - 1, [[0.7, 0], [0.02, 8]], L.pinn ? Sl : R, 4); } } }
    if (L.giralda) { var gp = P_(f, hl * 0.6, L.W / 2 + 9); g.box(o, gp[0], gp[1], 1, 0, 7, 7, y - 1, y + 70, [0.86, 0.66, 0.5]); g.box(o, gp[0], gp[1], 1, 0, 6.2, 6.2, y + 70, y + 86, [0.92, 0.88, 0.8]); g.box(o, gp[0], gp[1], 1, 0, 4.5, 4.5, y + 86, y + 96, [0.92, 0.88, 0.8]); g.revolve(o, gp[0], gp[1], y + 96, [[3.2, 0], [1.4, 6], [0.2, 8], [0, 8.1]], [0.92, 0.88, 0.8], 8); }
    if (L.st) { var sp = P_(f, -hl * 0.1, L.W / 2 + 7); g.box(o, sp[0], sp[1], f.ux, f.uz, 7, 7, y - 1, y + L.st * 0.45, S); g.revolve(o, sp[0], sp[1], y + L.st * 0.45, [[7, 0], [5, L.st * 0.2], [0.4, L.st * 0.55], [0, L.st * 0.55 + 0.1]], Sl, 8); cross(o, sp[0], sp[1], y + L.st, 1.4); st.spires++; }
    if (L.pinn) for (var pn = s0; pn < s1; pn += 5) for (sd = -1; sd <= 1; sd += 2) pyramid(o, f, pn, sd * (Wn / 2 + Wa), 0.4, y + L.Ha, y + L.Ha + 7, Sl, 4);
    st.kinds.gothic = (st.kinds.gothic || 0) + 1;
  }
  function rockTop(J, K) {   // the Acropolis: its top 58 m over the lowest ground round its foot (the streamed ground is too coarse to hold the rock), never under the ground at its middle
    if (J.rock831 != null) return J.rock831; var L = LM.filter(function (q) { return q.k === 'rock'; })[0], lo = 1e9, mid = K.fromLL(J, L.lat, L.lon);
    L.ring.forEach(function (q) { var p = K.fromLL(J, q[0], q[1]); lo = Math.min(lo, Math.max(0, K.H(J, p[0], p[1]))); }); J.rock831 = Math.max(lo + L.up, Math.max(0, K.H(J, mid[0], mid[1])) + 6); return J.rock831; }
  function rock(J, K, L, o, f, y) {   // the rock: its cliffs from the ground to the top, the top, the wall round its rim; and her feet stand on it (a footprint)
    var top = rockTop(J, K), R = L.ring.map(function (q) { return K.fromLL(J, q[0], q[1]); }), n = R.length, cliff = g.col([0.66, 0.6, 0.5]), lip = g.col([0.6, 0.55, 0.46]), lo = 1e9, i;
    for (i = 0; i < n; i++) { var a = R[i], b = R[(i + 1) % n], ga = Math.max(0, K.H(J, a[0], a[1])) - 3, gb = Math.max(0, K.H(J, b[0], b[1])) - 3, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = dz / l, nz = -dx / l; lo = Math.min(lo, ga, gb);
      var mx = (a[0] + b[0]) / 2 + nx * 6, mz = (a[1] + b[1]) / 2 + nz * 6, gm = Math.max(0, K.H(J, mx, mz)) - 3;   // a buttress of rock bulging out halfway, so the cliff is not a flat wall
      g.quad(o, [a[0], ga, a[1]], [mx, gm, mz], [mx, top - 4, mz], [a[0], top, a[1]], [nx, 0, nz], i % 2 ? cliff : lip); g.quad(o, [mx, gm, mz], [b[0], gb, b[1]], [b[0], top, b[1]], [mx, top - 4, mz], [nx, 0, nz], i % 2 ? lip : cliff);
      g.box(o, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, dx / l, dz / l, l / 2, 0.9, top, top + 3.2, [0.8, 0.74, 0.62]); }
    var TH = IX.THREE || window.THREE, faces = TH.ShapeUtils.triangulateShape(R.map(function (p) { return new TH.Vector2(p[0], p[1]); }), []), base = o.p.length / 3, tc = g.col([0.8, 0.75, 0.64]);
    for (i = 0; i < n; i++) G.V(o, R[i][0], top + 0.05, R[i][1], 0, 1, 0, tc, 0, 0, g.PLAIN, 0, 0);
    for (i = 0; i < faces.length; i++) { var t0 = faces[i]; o.i.push(base + t0[0], base + t0[1], base + t0[2], base + t0[0], base + t0[2], base + t0[1]); }
    if (J.fp) { var flat2 = [], x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; R.forEach(function (p) { flat2.push(p[0], p[1]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
      J.fp.push({ r: flat2, clip: new Uint8Array(n), x0: x0, x1: x1, z0: z0, z1: z1, bot: lo, top: top, gC: lo, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, rock831: true }); }
    st.kinds.rock = 1; }
  function temple(J, K, L, o, f, y) {   // stylobate, the colonnade, the entablature, pediments; a roof if it stands, a cella if it does
    var hl = L.L / 2, hw = L.W / 2, S = L.stone, cy = y + L.pod, i, mi = 0;
    bx(o, f, 0, 0, hl, hw, y - 1.5, y + L.pod, S); bx(o, f, 0, 0, hl + 1.2, hw + 1.2, y - 1.5, y + L.pod * 0.4, S);
    var put = function (s, t) { var p = P_(f, s, t); if (L.ruinGap && hash(L.name + mi++) < L.ruinGap) return; column(o, p[0], p[1], cy, L.Hc, L.D, S); };
    var fs = L.nf > 1 ? (L.W - L.D * 2) / (L.nf - 1) : 0, ss = L.ns > 1 ? (L.L - L.D * 2) / (L.ns - 1) : 0;
    for (i = 0; i < L.nf; i++) { var tt = -hw + L.D + i * fs; put(-hl + L.D, tt); if (!L.front) put(hl - L.D, tt); }
    for (i = 1; i < L.ns - 1; i++) { var s2 = -hl + L.D + i * ss; if (L.front && s2 > -hl + L.D + ss * 1.5) continue; put(s2, -hw + L.D); put(s2, hw - L.D); }
    var ey = cy + L.Hc; if (L.front) { bx(o, f, -hl + L.D + ss * 0.75, 0, ss * 0.75 + L.D, hw, ey, ey + L.ent, S); }
    else { bx(o, f, -hl + L.D, 0, L.D * 0.7, hw, ey, ey + L.ent, S); bx(o, f, hl - L.D, 0, L.D * 0.7, hw, ey, ey + L.ent, S); bx(o, f, 0, -hw + L.D, hl, L.D * 0.7, ey, ey + L.ent, S); bx(o, f, 0, hw - L.D, hl, L.D * 0.7, ey, ey + L.ent, S); }
    if (L.cella) { var ch = L.cella === 'ruin' ? L.Hc * 0.25 : L.Hc; bx(o, f, L.front ? L.L * 0.12 : 0, 0, hl * (L.front ? 0.75 : 0.72), hw * 0.62, cy, cy + ch, S, L.roof !== true); }
    var rise = L.W * 0.13, front = [-f.ux, -f.uz], backN = [f.ux, f.uz];
    if (L.roof === true) { roofGable(J, f, -hl, hl, hw + 0.4, ey + L.ent, rise, [0.72, 0.4, 0.3]); gable(o, f, -hl, hw, ey + L.ent, rise, S, front); gable(o, f, hl, hw, ey + L.ent, rise, S, backN); }
    else if (L.roof === 'attic') bx(o, f, 0, 0, hl * 0.82, hw * 0.78, ey + L.ent, ey + L.ent + 5, S);
    else if (L.ped === 'frame') { gable(o, f, -hl, hw, ey + L.ent, rise, S, front); gable(o, f, hl, hw, ey + L.ent, rise, S, backN); }
    st.kinds.temple = (st.kinds.temple || 0) + 1;
  }
  function pantheon(J, K, L, o, f, y) {   // the rotunda (brick, stepped rings), the dome (its oculus open), the portico of sixteen columns
    var BR = [0.74, 0.62, 0.5], LEAD = [0.6, 0.62, 0.62], c = P_(f, 0, 0);   // the rotunda's middle is the map's point (the room inside is centred there too)
    g.revolve(o, c[0], c[1], y - 1, [[29, 0], [29, 31], [27.5, 31.5], [27.5, 34], [26, 34.5], [26, 36]], BR, 32);
    g.revolve(o, c[0], c[1], y + 35.8, [[26, 0], [23.5, 3.4], [19.5, 6.6], [14, 9.5], [8, 11.2], [4.6, 11.7], [4.6, 11.9]], LEAD, 32);
    temple(J, K, { name: 'Pantheon portico', L: 15.5, W: 33, nf: 8, ns: 3, Hc: 11.9, D: 1.5, pod: 1.3, ent: 2.6, roof: true, cella: false, stone: [0.82, 0.78, 0.7] }, o, { x: P_(f, -47, 0)[0], z: P_(f, -47, 0)[1], ux: f.ux, uz: f.uz }, y);
    bx(o, f, -34, 0, 5, 13, y - 1, y + 24, [0.8, 0.74, 0.64]); st.kinds.pantheon = 1;
  }
  function colosseum(J, K, L, o, f, y) {   // the ellipse of arches in four storeys (the outer ring's south side fallen: the inner ring stands there), the stands, the arena
    var N = 80, A = L.A, B = L.B, cc = g.col(TRAV), dk = g.col([0.32, 0.27, 0.22]);
    for (var i = 0; i < N; i++) { var a0 = i / N * 6.283, a1 = (i + 1) / N * 6.283, am = (a0 + a1) / 2, nx = Math.cos(am) / A, nz = Math.sin(am) / B, nl = Math.hypot(nx, nz), ns = [ (f.ux * nx / nl - f.uz * nz / nl), (f.uz * nx / nl + f.ux * nz / nl) ];
      var north = -ns[1] > -0.25, k = north ? 1 : 0.86, H = north ? L.H : 32, p0 = P_(f, Math.cos(a0) * A * k, Math.sin(a0) * B * k), p1 = P_(f, Math.cos(a1) * A * k, Math.sin(a1) * B * k), n3 = [ns[0], ns[1]];
      g.quad(o, [p0[0], y - 1, p0[1]], [p1[0], y - 1, p1[1]], [p1[0], y + H, p1[1]], [p0[0], y + H, p0[1]], [n3[0], 0, n3[1]], cc);
      for (var lv = 0; lv < (north ? 3 : 2); lv++) { var ya = y + 1 + lv * 10.5, yb = ya + 7.5, m0 = [p0[0] + (p1[0] - p0[0]) * 0.2 + n3[0] * 0.08, p0[1] + (p1[1] - p0[1]) * 0.2 + n3[1] * 0.08], m1 = [p0[0] + (p1[0] - p0[0]) * 0.8 + n3[0] * 0.08, p0[1] + (p1[1] - p0[1]) * 0.8 + n3[1] * 0.08];
        g.quad(o, [m0[0], ya, m0[1]], [m1[0], ya, m1[1]], [m1[0], yb, m1[1]], [m0[0], yb, m0[1]], [n3[0], 0, n3[1]], dk); }
      var q0 = P_(f, Math.cos(a0) * A * 0.84, Math.sin(a0) * B * 0.84), q1 = P_(f, Math.cos(a1) * A * 0.84, Math.sin(a1) * B * 0.84), r0 = P_(f, Math.cos(a0) * A * 0.5, Math.sin(a0) * B * 0.53), r1 = P_(f, Math.cos(a1) * A * 0.5, Math.sin(a1) * B * 0.53);   // the stands, down to the arena wall
      g.quad(o, [q0[0], y + 30, q0[1]], [q1[0], y + 30, q1[1]], [r1[0], y + 4, r1[1]], [r0[0], y + 4, r0[1]], [0, 1, 0], g.col([0.66, 0.58, 0.48])); }
    var ar = P_(f, 0, 0); g.revolve(o, ar[0], ar[1], y + 0.3, [[0.01, 0], [B * 0.5, 0]], [0.36, 0.3, 0.24], 24); st.kinds.colosseum = 1;
  }
  function colrow(J, K, L, o, f, y) { var S = L.stone, w = (L.n - 1) * L.gap / 2; bx(o, f, 0, 0, w + L.D + 1, L.D + 1 + (L.side ? L.side * L.gap / 2 : 0), y - 1, y + L.pod, S);
    for (var i = 0; i < L.n; i++) { var p = P_(f, 0, -w + i * L.gap); column(o, p[0], p[1], y + L.pod, L.Hc, L.D, S); } bx(o, f, 0, 0, L.D * 0.7, w + L.D * 0.6, y + L.pod + L.Hc, y + L.pod + L.Hc + L.ent, S);
    if (L.side) for (i = 1; i < L.side; i++) { var q = P_(f, i * L.gap, -w); column(o, q[0], q[1], y + L.pod, L.Hc, L.D, S); } st.kinds.colrow = (st.kinds.colrow || 0) + 1; }
  function arch(J, K, L, o, f, y) { var S = L.stone, dk = [0.3, 0.26, 0.22], hw = L.W / 2, hd = L.D / 2; bx(o, f, 0, 0, hd, hw, y - 1, y + L.H, S);
    var nn = L.n === 4 ? 1 : L.n; for (var i = 0; i < nn; i++) { var t = nn === 1 ? 0 : (i - 1) * hw * 0.62, w = i === 1 || nn === 1 ? hw * 0.26 : hw * 0.13, hh = i === 1 || nn === 1 ? L.H * 0.6 : L.H * 0.4;
      for (var sd = -1; sd <= 1; sd += 2) { var fc = { x: P_(f, sd * (hd + 0.06), 0)[0], z: P_(f, sd * (hd + 0.06), 0)[1], ux: -f.uz, uz: f.ux }; flat(o, fc, t, 0, dk, [f.ux * sd, f.uz * sd], y, y + hh - w * 1.5, w); }
      var cl = P_(f, -hd - 0.8, t - w - 1.2), cr = P_(f, -hd - 0.8, t + w + 1.2); column(o, cl[0], cl[1], y + 3, L.H * 0.55, 1.1, S); column(o, cr[0], cr[1], y + 3, L.H * 0.55, 1.1, S); }
    st.kinds.arch = (st.kinds.arch || 0) + 1; }
  function facade(J, K, L, o, f, y) { var S = L.stone, hw = L.W / 2; bx(o, f, 2.5, 0, 1.5, hw, y - 1, y + L.H, S); bx(o, f, -0.5, 0, 1.5, hw + 1, y - 1, y + 1.2, S);
    for (var lv = 0; lv < 2; lv++) for (var i = 0; i < 8; i++) { var t = -hw + 1.3 + Math.floor(i / 2) * (L.W - 2.6) / 3 + (i % 2) * 1.6 - 0.8, p = P_(f, -0.6, t), y0 = y + 1.2 + lv * 8.2; column(o, p[0], p[1], y0, 7, 0.75, S); bx(o, f, -0.6, t, 0.8, 0.8, y0 + 7, y0 + 8.2, S); }
    st.kinds.facade = 1; }
  function theatre(J, K, L, o, f, y) { var S = L.stone, cc = g.col(S), N = 20; for (var i = 0; i < N; i++) { var a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N, P0 = P_(f, -Math.sin(a0) * L.R, Math.cos(a0) * L.R), P1 = P_(f, -Math.sin(a1) * L.R, Math.cos(a1) * L.R), Q0 = P_(f, -Math.sin(a0) * L.R * 0.35, Math.cos(a0) * L.R * 0.35), Q1 = P_(f, -Math.sin(a1) * L.R * 0.35, Math.cos(a1) * L.R * 0.35);
      g.quad(o, [Q0[0], y, Q0[1]], [Q1[0], y, Q1[1]], [P1[0], y + L.H, P1[1]], [P0[0], y + L.H, P0[1]], [0, 1, 0], cc); g.quad(o, [P0[0], y - 1, P0[1]], [P1[0], y - 1, P1[1]], [P1[0], y + L.H, P1[1]], [P0[0], y + L.H, P0[1]], [-(f.ux) , 0, -(f.uz)], cc); }
    bx(o, f, 4, 0, 1.2, L.R * 0.75, y - 1, y + 4, S); for (var c = 0; c < 12; c++) { var p = P_(f, 2.2, -L.R * 0.7 + c * L.R * 1.4 / 11); column(o, p[0], p[1], y + 4, 8, 0.8, S); } st.kinds.theatre = 1; }
  function oval(J, K, L, o, f, y) { var S = L.stone; for (var i = 0; i < L.n; i++) { var a = i / L.n * 6.283; if (Math.abs(Math.sin(a)) < 0.12 && Math.cos(a) > 0) continue; var p = P_(f, Math.cos(a) * L.A, Math.sin(a) * L.B), gy = Math.max(0, K.H(J, p[0], p[1])); column(o, p[0], p[1], gy, L.Hc, 0.7, S); g.box(o, p[0], p[1], f.ux, f.uz, 1.1, 0.5, gy + L.Hc, gy + L.Hc + 0.8, S); } st.kinds.oval = 1; }
  function cardo(J, K, L, o, f, y) { var S = L.stone; for (var s = -L.L / 2; s <= L.L / 2; s += L.gap) for (var sd = -1; sd <= 1; sd += 2) { if (hash(L.name + s + sd) < 0.3) continue; var p = P_(f, s, sd * L.w / 2), gy = Math.max(0, K.H(J, p[0], p[1])); column(o, p[0], p[1], gy, L.Hc, 0.65, S); if (hash(s + 'e' + sd) < 0.5) g.box(o, p[0] + f.ux * L.gap / 2, p[1] + f.uz * L.gap / 2, f.ux, f.uz, L.gap / 2, 0.4, gy + L.Hc, gy + L.Hc + 0.7, S); } st.kinds.cardo = 1; }
  function gate(J, K, L, o, f, y) { var S = L.stone, hw = L.W / 2; bx(o, f, 0, -hw + 5, L.D / 2, 5, y - 1, y + L.Hc + 3, S); bx(o, f, 0, hw - 5, L.D / 2, 5, y - 1, y + L.Hc + 3, S);
    for (var r = -1; r <= 1; r += 2) for (var i = 0; i < L.n; i++) { var p = P_(f, r * (L.D / 2 - 1), -12.5 + i * 5); column(o, p[0], p[1], y + 1, L.Hc, 1.7, S); }
    bx(o, f, 0, 0, L.D / 2 + 0.5, 15, y + L.Hc + 1, y + L.Hc + 5, S); bx(o, f, 0, 0, L.D / 2 - 1, 9, y + L.Hc + 5, y + L.H - 4, S); st.kinds.gate = 1; }   /* no quadriga: no figures (house law) */
  function rotunda(J, K, L, o, f, y) { var S = L.stone, c = P_(f, 0, 0); g.revolve(o, c[0], c[1], y - 1, [[L.R, 0], [L.R, L.H]], S, 24); g.dome(o, c[0], c[1], y + L.H - 0.5, L.R * 0.86, 'round', S, 24);
    if (L.D > 40) { g.revolve(o, c[0], c[1], y + L.H, [[L.R * 0.7, 0], [L.R * 0.7, L.D - L.H - L.R * 0.6]], S, 20); g.dome(o, c[0], c[1], y + L.D - L.R * 0.6, L.R * 0.62, 'pointed', [0.6, 0.62, 0.63], 20); if (L.cross) cross(o, c[0], c[1], y + L.D + 1, 1.5); }
    temple(J, K, { name: L.name + ' portico', L: 10, W: L.R * 1.2, nf: 6, ns: 3, Hc: L.H * 0.7, D: 1.4, pod: 1.5, ent: 2, roof: true, cella: false, stone: S }, o, { x: P_(f, -L.R - 4, 0)[0], z: P_(f, -L.R - 4, 0)[1], ux: f.ux, uz: f.uz }, y); st.kinds.rotunda = (st.kinds.rotunda || 0) + 1; }
  function domeChurch(J, K, L, o, f, y) { var c = [f.x, f.z], hk = (L.top - L.drum) / L.r, prof = [], N = 8, i;
    g.revolve(o, c[0], c[1], y - 1, [[L.r, 0], [L.r, L.drum - y + y + 1]], L.drumCol, L.seg);
    for (i = 0; i <= N; i++) { var ph = i / N * Math.PI / 2; prof.push([Math.cos(ph) * L.r, Math.sin(ph) * L.r * hk]); } prof[N][0] = L.r * 0.12; g.revolve(o, c[0], c[1], y + L.drum, prof, L.col, L.seg);
    for (var rb = 0; rb < L.seg; rb++) { var a = rb / L.seg * 6.283, cs = Math.cos(a), sn = Math.sin(a); for (i = 0; i < N; i++) { var p0 = prof[i], p1 = prof[i + 1], mx = (p0[0] + p1[0]) / 2 + 0.3; g.box(o, c[0] + cs * mx, c[1] + sn * mx, cs, sn, Math.abs(p0[0] - p1[0]) / 2 + 0.4, 0.5, y + L.drum + p0[1], y + L.drum + p1[1] + 0.3, L.ribs); } }
    g.revolve(o, c[0], c[1], y + L.top - 0.5, [[L.r * 0.14, 0], [L.r * 0.14, (L.lan - L.top) * 0.6], [L.r * 0.04, L.lan - L.top], [0, L.lan - L.top + 0.1]], L.ribs, 8); cross(o, c[0], c[1], y + L.lan + 2, 1.6); st.kinds.domeChurch = (st.kinds.domeChurch || 0) + 1; }
  function wall(J, K, L, o, f, y) { var cc = [L.stone, [0.82, 0.76, 0.6], [0.9, 0.85, 0.7]]; for (var c = 0; c < 14; c++) bx(o, f, 0, 0, L.L / 2, L.T / 2 - (c % 3) * 0.03, y - 1 + c * L.H / 14, y - 1 + (c + 1) * L.H / 14 - 0.12, cc[c % 3], c === 13); st.kinds.wall = 1; }   // courses of ashlar, each a little set back
  function ruin(J, K, L, o, f, y) { var S = L.stone, hl = L.L / 2, hw = L.W / 2; bx(o, f, 0, 0, hl + 1, hw + 1, y - 1, y + 0.6, [0.25, 0.24, 0.24]); bx(o, f, -hl, 0, 0.6, hw, y, y + 4.5, S); bx(o, f, hl, 0, 0.6, hw, y, y + 2.5, S); bx(o, f, 0, -hw, hl, 0.6, y, y + 2.2, S); bx(o, f, 0, hw, hl, 0.6, y, y + 3, S);
    for (var i = 0; i < 7; i++) { var p = P_(f, -hl + 4 + i * (L.L - 8) / 6, -hw + 4.5), q = P_(f, -hl + 4 + i * (L.L - 8) / 6, hw - 4.5); column(o, p[0], p[1], y + 0.5, 4.5, 0.7, S); if (i % 2 === 0) column(o, q[0], q[1], y + 0.5, 4.5, 0.7, S); }
    bx(o, f, -hl + 4 + (L.L - 8) / 4, -hw + 4.5, (L.L - 8) / 4 + 0.6, 0.45, y + 5, y + 5.7, S); st.kinds.ruin = 1; }
  function monastery(J, K, L, o, f, y) { var S = L.stone, hl = L.L / 2, hw = L.W / 2; bx(o, f, 0, -hw, hl, 1.5, y - 1, y + L.H, S); bx(o, f, 0, hw, hl, 1.5, y - 1, y + L.H + 4, S); bx(o, f, -hl, 0, 1.5, hw, y - 1, y + L.H + 2, S); bx(o, f, hl, 0, 1.5, hw, y - 1, y + L.H, S);
    bx(o, f, 0, 0, 20, 9, y - 1, y + 12, [0.78, 0.7, 0.58]); roofGable(J, f, -20, 20, 9.5, y + 12, 5, [0.5, 0.52, 0.55]); var tp = P_(f, -23, 0); g.box(o, tp[0], tp[1], f.ux, f.uz, 3, 3, y - 1, y + 24, [0.84, 0.78, 0.66]); g.revolve(o, tp[0], tp[1], y + 24, [[4.2, 0], [0.02, 4]], [0.5, 0.52, 0.55], 4); cross(o, tp[0], tp[1], y + 28, 1);
    var mp = P_(f, 14, 12); g.minaret(o, mp[0], mp[1], y - 0.5, 18, 'arab', g.PAL.arab, f.ux, f.uz, 0.2); st.kinds.monastery = 1; }   /* the small Fatimid mosque inside the walls is truly there */
  function church(J, K, L, o, f, y, cur) {   // a church: walls (if the map has none), a pitched roof, a bell tower, a spire or a parapet, a plain cross
    var hl = L.L / 2, hw = L.W / 2, S = L.walls || [0.84, 0.81, 0.74], R = L.roofC || SLATE;
    if (cur) bx(o, f, 0, 0, hl, hw, y - 1, y + L.H, S, false);
    roofGable(J, f, -hl, hl, hw + 0.4, y + L.H, Math.min(hw * 1.1, 9), R); gable(o, f, -hl, hw, y + L.H, Math.min(hw * 1.1, 9), S, [-f.ux, -f.uz]); gable(o, f, hl, hw, y + L.H, Math.min(hw * 1.1, 9), S, [f.ux, f.uz]);
    if (L.tr) { bx(o, f, hl * 0.25, 0, hw * 0.9, L.tr / 2, y - 1, y + L.H, S, false); roofGable(J, { x: P_(f, hl * 0.25, 0)[0], z: P_(f, hl * 0.25, 0)[1], ux: -f.uz, uz: f.ux }, -L.tr / 2, L.tr / 2, hw * 0.9 + 0.4, y + L.H, Math.min(hw, 8), R); }
    if (L.tower) { var tw = Math.max(2.4, Math.min(hw * 0.75, 6)), ts = cur ? -hl - tw + 0.5 : -hl + tw, tp = P_(f, ts, 0); bx(o, f, ts, 0, tw, tw, y - 1, y + L.tower, S); st.towers++;
      for (var d = 0; d < 4; d++) { var nd = [[-f.ux, -f.uz], [f.uz, -f.ux], [-f.uz, f.ux], [f.ux, f.uz]][d], fc = { x: tp[0] + nd[0] * (tw + 0.05), z: tp[1] + nd[1] * (tw + 0.05), ux: -nd[1], uz: nd[0] }; flat(o, fc, 0, 0, [0.15, 0.14, 0.13], nd, y + L.tower - 5.5, y + L.tower - 2.2, tw * 0.28); }
      if (L.top === 'parapet') { for (var c = 0; c < 4; c++) { var cs = [[1, 1], [1, -1], [-1, 1], [-1, -1]][c]; bx(o, f, ts + cs[0] * tw * 0.82, cs[1] * tw * 0.82, tw * 0.18, tw * 0.18, y + L.tower, y + L.tower + 1.8, S); } cross(o, tp[0], tp[1], y + L.tower, Math.max(0.8, tw / 4)); }
      else if (L.top === 'onion') { g.dome(o, tp[0], tp[1], y + L.tower, tw * 0.9, 'onion', L.domeC || GOLD, 10); cross(o, tp[0], tp[1], y + L.tower + tw * 1.4, Math.max(0.8, tw / 4)); }
      else if (L.top === 'dome') { g.dome(o, tp[0], tp[1], y + L.tower, tw * 0.95, 'round', L.domeC || [0.3, 0.46, 0.7], 10); cross(o, tp[0], tp[1], y + L.tower + tw * 0.9, Math.max(0.8, tw / 4)); }
      else { var sh = L.spire ? L.spire - L.tower : tw * 3.2; g.revolve(o, tp[0], tp[1], y + L.tower, [[tw * 1.25, 0], [0.04, sh], [0, sh + 0.05]], L.spireC || (L.spire ? WHITE : SLATE), L.spire ? 8 : 4); cross(o, tp[0], tp[1], y + L.tower + sh, Math.max(0.8, tw / 4)); st.spires++; } }
  }
  function synagogue(J, K, L, o, f, y, cur) {   // its walls (if the map has none), its roof, the Star of David on its front
    var hl = L.L / 2, hw = L.W / 2, S = L.walls || [0.88, 0.85, 0.78];
    if (cur) bx(o, f, 0, 0, hl, hw, y - 1, y + L.H, S, !L.hip);
    if (L.hip) { var RO = J.roof, cc = g.col([0.36, 0.3, 0.28]), e = 0.3, a = P_(f, -hl - e, -hw - e), b = P_(f, hl + e, -hw - e), c = P_(f, hl + e, hw + e), d = P_(f, -hl - e, hw + e), r0 = P_(f, -hl * 0.3, 0), r1 = P_(f, hl * 0.3, 0), yy = y + L.H, ry = yy + hw * 0.7;
      G.quadRoof(RO, [a[0], yy, a[1]], [b[0], yy, b[1]], [r1[0], ry, r1[1]], [r0[0], ry, r0[1]], cc); G.quadRoof(RO, [c[0], yy, c[1]], [d[0], yy, d[1]], [r0[0], ry, r0[1]], [r1[0], ry, r1[1]], cc); G.triRoof(RO, [b[0], yy, b[1]], [c[0], yy, c[1]], [r1[0], ry, r1[1]], cc); G.triRoof(RO, [d[0], yy, d[1]], [a[0], yy, a[1]], [r0[0], ry, r0[1]], cc); }
    if (L.portico) { for (var i = 0; i < L.portico; i++) { var p = P_(f, -hl - 2.2, -hw * 0.6 + i * hw * 1.2 / (L.portico - 1)); column(o, p[0], p[1], y, L.H * 0.72, 0.7, S); } bx(o, f, -hl - 1.4, 0, 1.6, hw * 0.75, y + L.H * 0.72, y + L.H * 0.8, S); gable(o, f, -hl - 1.4 - 1.6, hw * 0.75, y + L.H * 0.8, 2.4, S, [-f.ux, -f.uz]); }
    if (L.towers) for (var sd = -1; sd <= 1; sd += 2) { var tp = P_(f, -hl + 3.5, sd * (hw - 3.5)); g.revolve(o, tp[0], tp[1], y - 1, [[3.4, 0], [3.4, L.towers - 6 + 1]], [0.82, 0.62, 0.5], 8); g.dome(o, tp[0], tp[1], y + L.towers - 6, 3.6, 'onion', GOLD, 8); }
    star(o, f, -hl - (L.portico ? 3 : 0) - 0.2, y + L.H + (L.portico ? -0.8 : 0.6) + 1.6, Math.max(0.9, Math.min(hw * 0.18, 2.2)));
    st.synagogues++;
  }
  function star(o, f, s, y, r) {   // a Star of David: two triangles of thin bars, standing on the front, facing out
    var p = P_(f, s, 0), px = -f.uz, pz = f.ux; for (var tr = 0; tr < 2; tr++) for (var i = 0; i < 3; i++) { var a0 = (tr ? Math.PI : 0) + Math.PI / 2 + i * 2.0944, a1 = a0 + 2.0944, x0 = Math.cos(a0) * r, y0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, L2 = Math.hypot(x1 - x0, y1 - y0) / 2, ang = Math.atan2(y1 - y0, x1 - x0);
      var cc = g.col(GOLD), nn = [-f.ux, -f.uz], th = 0.09 * r, ca = Math.cos(ang), sa = Math.sin(ang), Q = function (u, v) { return [p[0] + px * (mx + ca * u - sa * v), y + my + sa * u + ca * v, p[1] + pz * (mx + ca * u - sa * v)]; };
      var k = [Q(-L2, -th), Q(L2, -th), Q(L2, th), Q(-L2, th)].map(function (q) { return G.V(o, q[0], q[1], q[2], nn[0], 0, nn[1], cc, 0, 0, g.PLAIN, 0, 0); }); o.i.push(k[0], k[1], k[2], k[0], k[2], k[3], k[0], k[2], k[1], k[0], k[3], k[2]); }
    st.stars++; }

  /* ---------- the doors 830's step calls ---------- */
  var ORTHO_RU = [[44, 70, 22, 180]], ORTHO_GR = [[34.8, 41.8, 19.3, 28.3], [41.8, 46.2, 18.8, 23.0], [41.2, 44.2, 22.3, 28.6], [43.6, 48.3, 20.2, 29.7], [41.0, 43.6, 40.0, 46.7], [38.8, 41.3, 43.4, 46.6], [3.4, 14.9, 33.0, 43.0]];
  function inBx(B, la, lo) { for (var i = 0; i < B.length; i++) { var b = B[i]; if (la >= b[0] && la <= b[1] && lo >= b[2] && lo <= b[3]) return true; } return false; }
  function churchStyle(lat, lon) { if (lat > 9.5 && lat < 27.5 && lon > -90 && lon < -59) return 'carib'; if (inBx([[53.8, 59.7, 20.9, 28.2], [49, 54.9, 14.1, 24.2]], lat, lon)) return 'west'; if (inBx(ORTHO_RU, lat, lon) && !(lon < 30 && lat > 54)) return 'onion'; if (inBx(ORTHO_GR, lat, lon)) return 'dome'; return 'west'; }
  function dress(J, K, T, Gv, GEO) {
    G = Gv; g = GEO; var o = J.wallX || (J.wallX = new J.Out830()); if (!o.f) { o.f = []; o.m = []; }
    if (T.k === 'lm831') { var L = T.L, f = frameOf(J, K, L.lat, L.lon, L.b || 0), y = Math.max(0, K.H(J, f.x, f.z)), hosted = null;
      if ((L.k === 'church' || L.k === 'synagogue') && !L.own) { hosted = g.hostOf(J, f.x, f.z, 8); if (hosted) { var ob = G.obb(hosted.r); if (ob) { f = { x: ob.cx, z: ob.cz, ux: ob.ux, uz: ob.uz }; L = Object.assign({}, L, { L: ob.L * 2, W: ob.W * 2, H: Math.max(4, hosted.top - hosted.gC) }); y = hosted.gC; } } }
      if (L.on === 'acropolis') y = rockTop(J, K);
      var B = { rock: rock, gothic: gothic, temple: temple, pantheon: pantheon, colosseum: colosseum, colrow: colrow, arch: arch, facade: facade, theatre: theatre, oval: oval, cardo: cardo, gate: gate, rotunda: rotunda, domeChurch: domeChurch, wall: wall, ruin: ruin, monastery: monastery, church: church, synagogue: synagogue }[L.k];
      if (!B) return null; B(J, K, L, o, f, y, !hosted); st.landmarks++;
      if (!hosted && L.own && J.feed && J.feed.buildings) { var ring = new Float64Array(10), cn = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]; cn.forEach(function (q, ci) { var pp = P_(f, q[0] * L.L / 2, q[1] * L.W / 2), g2 = K.toLL(J, pp[0], pp[1]); ring[ci * 2] = g2.lon; ring[ci * 2 + 1] = g2.lat; }); J.feed.buildings.push({ h: L.H, minH: 0, id: 0, rings: [ring] }); }   /* a building of its own: the grass, the trees and the walkers keep out of it as out of the map's */ var ll = K.toLL(J, f.x, f.z); st.built.push(L.name); if (st.built.length > 40) st.built.shift();
      return { k: 'lm', name: L.name, kind: L.k, lat: +ll.lat.toFixed(5), lon: +ll.lon.toFixed(5), hosted: !!hosted }; }
    var p = T.p, i; for (i = 0; i < LM.length; i++) if (Math.hypot((LM[i].lat - p.ll.lat) * 111320, (LM[i].lon - p.ll.lon) * 111320 * Math.cos(p.ll.lat * D2R)) < 130) return null;   // a hand-built place stands here
    var host = g.hostOf(J, p.x, p.z, 12); if (!host) return null; var A = g.fpArea(host), hH = host.top - host.gC; if (A < 50 || A > 9000) return null; var ob2 = G.obb(host.r); if (!ob2) return null;
    var f2 = { x: ob2.cx, z: ob2.cz, ux: ob2.ux, uz: ob2.uz }, rnd = hash(p.name + Math.round(p.x)); if (rnd < 0.5) { f2.ux = -f2.ux; f2.uz = -f2.uz; }
    if (p.k === 'synagogue') { star(o, f2, -ob2.L - 0.15, host.top + 1.8, Math.max(0.9, Math.min(ob2.W * 0.25, 2.2))); st.synagogues++; return { k: 'synagogue', name: p.name, lat: +p.ll.lat.toFixed(5), lon: +p.ll.lon.toFixed(5), area: Math.round(A) }; }
    /* a church: the map's tower crowned, the map's round parts domed, else a tower of its own; a pitched roof on a low rectangular hall */
    var F = J.fp || [], cx = (host.x0 + host.x1) / 2, cz = (host.z0 + host.z1) / 2, towers = [], rounds = [], sty = churchStyle(p.ll.lat, p.ll.lon);
    for (i = 0; i < F.length; i++) { var q = F[i], qx = (q.x0 + q.x1) / 2, qz = (q.z0 + q.z1) / 2, w = q.x1 - q.x0, d = q.z1 - q.z0, hh = q.top - q.gC; if (q === host || Math.hypot(qx - cx, qz - cz) > Math.max(30, Math.sqrt(A))) continue;
      if (w < 16 && d < 16 && hh > Math.max(12, hH * 1.25)) { if (!towers.some(function (u) { return Math.hypot((u.x0 + u.x1) / 2 - qx, (u.z0 + u.z1) / 2 - qz) < 3 && u.top >= q.top; })) towers = towers.filter(function (u) { return Math.hypot((u.x0 + u.x1) / 2 - qx, (u.z0 + u.z1) / 2 - qz) >= 3; }).concat([q]); }
      else if (q.r.length / 2 >= 10 && w > 4 && Math.abs(w - d) < 0.2 * Math.max(w, d) && g.fpArea(q) / (Math.PI * w * d / 4) > 0.85 && g.fpArea(q) / (Math.PI * w * d / 4) < 1.08) rounds.push(q); }
    var out = { k: 'church', name: p.name, lat: +p.ll.lat.toFixed(5), lon: +p.ll.lon.toFixed(5), style: sty, area: Math.round(A), mapped: towers.length + rounds.length };
    for (i = 0; i < towers.length && i < 3; i++) { var tq = towers[i], tx = (tq.x0 + tq.x1) / 2, tz = (tq.z0 + tq.z1) / 2, tr2 = Math.min(tq.x1 - tq.x0, tq.z1 - tq.z0) / 2;
      if (sty === 'onion') { g.dome(o, tx, tz, tq.top, tr2 * 0.9, 'onion', GOLD, 10); cross(o, tx, tz, tq.top + tr2 * 1.4, Math.max(0.8, tr2 / 4)); } else if (sty === 'carib') cross(o, tx, tz, tq.top, Math.max(0.8, tr2 / 4));
      else { g.revolve(o, tx, tz, tq.top, [[tr2 * 1.2, 0], [0.04, tr2 * 3], [0, tr2 * 3 + 0.05]], SLATE, 4); cross(o, tx, tz, tq.top + tr2 * 3, Math.max(0.8, tr2 / 4)); st.spires++; } st.towers++; }
    for (i = 0; i < rounds.length && i < 6; i++) { var rq = rounds[i], rr = Math.min(rq.x1 - rq.x0, rq.z1 - rq.z0) / 2 * 0.98; g.dome(o, (rq.x0 + rq.x1) / 2, (rq.z0 + rq.z1) / 2, rq.top, rr, sty === 'onion' ? 'onion' : 'round', sty === 'onion' ? GOLD : [0.6, 0.62, 0.64], 12); cross(o, (rq.x0 + rq.x1) / 2, (rq.z0 + rq.z1) / 2, rq.top + rr * (sty === 'onion' ? 1.55 : 0.92), Math.max(0.8, rr / 5)); }
    var fill = A / (ob2.L * ob2.W * 4);
    if (!towers.length && !rounds.length && hH < 30 && fill > 0.72 && ob2.W > 2.5) {
      church(J, K, { L: ob2.L * 2, W: ob2.W * 2, H: hH, tower: hH + Math.max(7, Math.min(28, ob2.L * 1.1)), top: sty === 'carib' ? 'parapet' : sty === 'onion' ? 'onion' : sty === 'dome' ? 'dome' : 'spire', roofC: sty === 'carib' ? [0.62, 0.28, 0.22] : sty === 'dome' ? [0.7, 0.38, 0.28] : SLATE }, o, f2, host.gC, false);
      if (sty === 'onion' || sty === 'dome') { g.dome(o, ob2.cx, ob2.cz, host.top + Math.min(ob2.W * 1.1, 9) * 0.5, Math.min(ob2.W * 0.6, 7), sty === 'onion' ? 'onion' : 'round', sty === 'onion' ? GOLD : [0.3, 0.46, 0.7], 10); }
      out.tower = 1; }
    else if (!towers.length && !rounds.length) { cross(o, ob2.cx, ob2.cz, host.top, Math.max(1, Math.min(ob2.W / 6, 2.5))); out.cross = 1; }
    st.churches++; return out;
  }

  /* ---------- the interiors: made at load, each a group of meshes wearing the roofs' program with a painted map; hidden till she is near ---------- */
  var IX = { THREE: null, T: null, group: null, rooms: [], mats: null, made: false };
  function cnv(w, h, paint) { var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); paint(x, w, h); var t = new IX.THREE.CanvasTexture(c); t.anisotropy = 4; if (IX.THREE.sRGBEncoding && window.WFR_REALISM) t.encoding = IX.THREE.sRGBEncoding; return t; }
  function mat(tex, rep) { var m = IX.T.makeMaterial(IX.THREE, IX.T.u, 'feat'); m.map = tex; if (m.emissive) m.emissive.setRGB(0.2, 0.15, 0.1);   /* round 2: a warm glow inside, whatever side the sun is on (a uniform: the same program) */ if (rep) { tex.wrapS = tex.wrapT = IX.THREE.RepeatWrapping; } m.name = 'sacred831:room'; return m; }
  /* the paintings (canvas, at load): only patterns, colour and light; ornament bands drawn as ornament (never readable script); no figure of any kind */
  function polar(x, w, cb) { x.save(); x.translate(w / 2, w / 2); cb(w / 2); x.restore(); }
  /* round 3: Notre-Dame's painters. stoneC: a stone colour at 1/K (the nave's walls wear vertex colour K); lancetPath: a pointed window; glassIn: coloured
     glass in small panes on lead, inside a path (b: its bounds, px), dim darkens it (a window far away); GLASS831: Notre-Dame's blues, ruby, gold, green, violet */
  var GLASS831 = ['#1f4fb8', '#2a64d0', '#16378a', '#b8202a', '#e8b23a', '#2f8a4a', '#6a3a9a', '#d8e4f2', '#1f4fb8', '#b8202a', '#2a64d0'];
  function stoneC(r, g, b) { var k = 1 / 1.9; return 'rgb(' + Math.round(r * k) + ',' + Math.round(g * k) + ',' + Math.round(b * k) + ')'; }
  function stone831(x, w, h, m) { x.fillStyle = stoneC(214, 205, 188); x.fillRect(0, 0, w, h); for (var j = 0; j < m / 0.55; j++) { x.fillStyle = stoneC(192, 183, 166); x.fillRect(0, h * j * 0.55 / m, w, 1.2); } }   /* ashlar courses, 55 cm */
  function lancetPath(x, cx, hw, yb, yt) { var ys = yt + hw * 1.7; x.beginPath(); x.moveTo(cx - hw, yb); x.lineTo(cx - hw, ys); x.quadraticCurveTo(cx - hw, yt + hw * 0.3, cx, yt); x.quadraticCurveTo(cx + hw, yt + hw * 0.3, cx + hw, ys); x.lineTo(cx + hw, yb); x.closePath(); }
  function glassIn(x, path, b, cell, dim) { x.save(); path(); x.clip(); x.fillStyle = '#14100c'; x.fillRect(b[0] - 2, b[1] - 2, b[2] - b[0] + 4, b[3] - b[1] + 4); var ch = cell * 1.3;
    for (var yy = b[1]; yy < b[3]; yy += ch) for (var xx = b[0]; xx < b[2]; xx += cell) { var q = Math.abs(Math.sin(xx * 12.9898 + yy * 78.233) * 43758.5453) % 1; x.fillStyle = GLASS831[Math.floor(q * GLASS831.length)]; x.fillRect(xx + 0.8, yy + 0.8, cell - 1.6, ch - 1.6); }
    if (dim) { x.fillStyle = 'rgba(16,12,9,' + dim + ')'; x.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); } x.restore(); }
  var PAINT = {
    pantheon: { dome: function (x, w) { polar(x, w, function (R) { x.fillStyle = '#b9ab95'; x.fillRect(-R, -R, 2 * R, 2 * R); for (var ring = 0; ring < 5; ring++) { var r0 = R * (0.95 - ring * 0.13), r1 = r0 - R * 0.105; for (var i = 0; i < 28; i++) { var a0 = i / 28 * 6.283 + 0.02, a1 = (i + 1) / 28 * 6.283 - 0.02;
          for (var st2 = 0; st2 < 3; st2++) { var k = st2 * 0.18; x.beginPath(); x.arc(0, 0, r0 - (r0 - r1) * k * 0.5, a0 + k * 0.05, a1 - k * 0.05); x.arc(0, 0, r1 + (r0 - r1) * k * 0.5, a1 - k * 0.05, a0 + k * 0.05, true); x.closePath(); x.fillStyle = ['#a39580', '#8f816c', '#7b6e5b'][st2]; x.fill(); } } }
        var gr = x.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 0.32); gr.addColorStop(0, '#fff8e8'); gr.addColorStop(1, 'rgba(255,248,232,0)'); x.fillStyle = gr; x.beginPath(); x.arc(0, 0, R * 0.32, 0, 6.283); x.fill(); x.fillStyle = '#cfe4f4'; x.beginPath(); x.arc(0, 0, R * 0.19, 0, 6.283); x.fill(); }); },
      drum: function (x, w, h) { x.fillStyle = '#d8ccb4'; x.fillRect(0, 0, w, h); x.fillStyle = '#c9b48a'; x.fillRect(0, h * 0.42, w, h * 0.06); x.fillStyle = '#e8dfcf'; x.fillRect(0, h * 0.48, w, h * 0.5); for (var i = 0; i < 8; i++) { var cx = (i + 0.5) / 8 * w; x.fillStyle = '#6e5f4e'; x.fillRect(cx - w * 0.035, h * 0.52, w * 0.07, h * 0.42); x.fillStyle = '#b34a3a'; x.fillRect(cx - w * 0.05, h * 0.5, w * 0.008, h * 0.46); x.fillRect(cx + w * 0.042, h * 0.5, w * 0.008, h * 0.46); }
        for (var j = 0; j < 16; j++) { x.fillStyle = '#9d8b74'; x.fillRect((j + 0.3) / 16 * w, h * 0.1, w / 40, h * 0.22); } var sp = x.createRadialGradient(w * 0.3, h * 0.7, 2, w * 0.3, h * 0.7, h * 0.35); sp.addColorStop(0, 'rgba(255,246,220,0.85)'); sp.addColorStop(1, 'rgba(255,246,220,0)'); x.fillStyle = sp; x.fillRect(0, 0, w, h); },
      floor: function (x, w) { x.fillStyle = '#cfc6b6'; x.fillRect(0, 0, w, w); var n = 12, s = w / n; for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? '#8f8a84' : '#d9cfbd'; x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); x.fillStyle = (i + j) % 2 ? '#9a3b30' : '#c9a253'; x.beginPath(); x.arc(i * s + s / 2, j * s + s / 2, s * 0.3, 0, 6.283); x.fill(); }
        var sun = x.createRadialGradient(w * 0.42, w * 0.5, 4, w * 0.42, w * 0.5, w * 0.14); sun.addColorStop(0, 'rgba(255,250,228,0.95)'); sun.addColorStop(0.7, 'rgba(255,246,215,0.6)'); sun.addColorStop(1, 'rgba(255,246,215,0)'); x.fillStyle = sun; x.beginPath(); x.ellipse(w * 0.42, w * 0.5, w * 0.14, w * 0.11, 0, 0, 6.283); x.fill(); } },   /* the oculus' light on the floor */
    florence: { dome: function (x, w) { polar(x, w, function (R) { x.fillStyle = '#4f7fc0'; x.fillRect(-R, -R, 2 * R, 2 * R); for (var t = 0; t < 7; t++) { var r = R * (0.95 - t * 0.12); x.strokeStyle = t % 2 ? '#e3c36a' : '#f1e6c8'; x.lineWidth = R * 0.03; x.beginPath(); x.arc(0, 0, r, 0, 6.283); x.stroke(); }
        for (var s = 0; s < 220; s++) { var a = s * 2.39996, rr = R * (0.18 + 0.75 * ((s * 0.618) % 1)); x.fillStyle = '#f5df8a'; x.beginPath(); x.arc(Math.cos(a) * rr, Math.sin(a) * rr, R * 0.008, 0, 6.283); x.fill(); }
        for (var i = 0; i < 8; i++) { var aa = i / 8 * 6.283; x.strokeStyle = '#ece6d6'; x.lineWidth = R * 0.035; x.beginPath(); x.moveTo(Math.cos(aa) * R * 0.12, Math.sin(aa) * R * 0.12); x.lineTo(Math.cos(aa) * R, Math.sin(aa) * R); x.stroke(); }
        var gr = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.2); gr.addColorStop(0, '#fffbe9'); gr.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = gr; x.beginPath(); x.arc(0, 0, R * 0.2, 0, 6.283); x.fill(); }); },
      drum: function (x, w, h) { for (var b = 0; b < 16; b++) { x.fillStyle = b % 2 ? '#e9e4d8' : '#5d7d62'; x.fillRect(0, b * h / 16, w, h / 16); } for (var i = 0; i < 8; i++) { var cx = (i + 0.5) / 8 * w, cy = h * 0.22; var gg = x.createRadialGradient(cx, cy, 2, cx, cy, h * 0.12); gg.addColorStop(0, '#ffe9a8'); gg.addColorStop(0.5, '#c0443a'); gg.addColorStop(1, '#27408b'); x.fillStyle = gg; x.beginPath(); x.arc(cx, cy, h * 0.12, 0, 6.283); x.fill(); x.strokeStyle = '#efe8d8'; x.lineWidth = 4; x.stroke(); } },
      floor: function (x, w) { x.fillStyle = '#e4ddcf'; x.fillRect(0, 0, w, w); x.strokeStyle = '#7c2f2a'; x.lineWidth = w / 60; for (var r = 1; r < 8; r++) { x.beginPath(); x.arc(w / 2, w / 2, r * w / 17, 0, 6.283); x.stroke(); } } },
    stpeter: { dome: function (x, w) { polar(x, w, function (R) { x.fillStyle = '#2f5a9e'; x.fillRect(-R, -R, 2 * R, 2 * R); for (var t = 0; t < 6; t++) { var r = R * (0.9 - t * 0.13); x.strokeStyle = '#e1c15e'; x.lineWidth = R * 0.045; x.beginPath(); x.arc(0, 0, r, 0, 6.283); x.stroke(); }
        for (var s = 0; s < 300; s++) { var a = s * 2.39996, rr = R * (0.16 + 0.8 * ((s * 0.618) % 1)); x.fillStyle = '#f2d777'; x.fillRect(Math.cos(a) * rr - 2, Math.sin(a) * rr - 2, 4, 4); }
        for (var i = 0; i < 16; i++) { var aa = i / 16 * 6.283; x.strokeStyle = '#e8c766'; x.lineWidth = R * 0.03; x.beginPath(); x.moveTo(Math.cos(aa) * R * 0.14, Math.sin(aa) * R * 0.14); x.lineTo(Math.cos(aa) * R, Math.sin(aa) * R); x.stroke(); }
        var gr = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.16); gr.addColorStop(0, '#fffdf0'); gr.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = gr; x.beginPath(); x.arc(0, 0, R * 0.16, 0, 6.283); x.fill(); }); },
      drum: function (x, w, h) { x.fillStyle = '#d8cfbb'; x.fillRect(0, 0, w, h); x.fillStyle = '#c9a84f'; x.fillRect(0, h * 0.1, w, h * 0.05); for (var k = 0; k < 120; k++) { x.fillStyle = '#1f3d72'; x.fillRect(k / 120 * w + 1, h * 0.108, w / 200, h * 0.034); }   /* the band of ornament (no letters) */
        for (var i = 0; i < 16; i++) { var cx = (i + 0.5) / 16 * w; x.fillStyle = '#fff6dc'; x.fillRect(cx - w * 0.012, h * 0.25, w * 0.024, h * 0.22); x.fillStyle = '#b8a888'; x.fillRect(cx + w * 0.022, h * 0.2, w * 0.006, h * 0.6); x.fillRect(cx - w * 0.028, h * 0.2, w * 0.006, h * 0.6); } },
      floor: function (x, w) { x.fillStyle = '#d6d0c4'; x.fillRect(0, 0, w, w); x.strokeStyle = '#8a3b33'; x.lineWidth = w / 50; x.beginPath(); x.arc(w / 2, w / 2, w * 0.2, 0, 6.283); x.stroke(); x.strokeStyle = '#59605a'; x.beginPath(); x.arc(w / 2, w / 2, w * 0.36, 0, 6.283); x.stroke(); } },
    bluemosque: { dome: function (x, w) { polar(x, w, function (R) { x.fillStyle = '#f4f1ea'; x.fillRect(-R, -R, 2 * R, 2 * R); for (var ring = 0; ring < 4; ring++) { var r0 = R * (0.95 - ring * 0.2); x.fillStyle = ['#2357a6', '#f4f1ea', '#1f8a9e', '#f4f1ea'][ring]; x.beginPath(); x.arc(0, 0, r0, 0, 6.283); x.fill(); }
        for (var i = 0; i < 48; i++) { var a = i / 48 * 6.283, r = R * 0.86; x.fillStyle = i % 2 ? '#c8352d' : '#f2f0e6'; x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, R * 0.04, 0, 6.283); x.fill(); }
        for (var j = 0; j < 12; j++) { var b = j / 12 * 6.283; x.strokeStyle = '#1b4f99'; x.lineWidth = R * 0.012; x.beginPath(); for (var k = 0; k <= 20; k++) { var rr = R * (0.2 + k * 0.012), aa = b + Math.sin(k * 0.6) * 0.18; if (!k) x.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); else x.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } x.stroke(); }   /* swirls of ornament at the crown (no letters) */
        for (var s = 0; s < 8; s++) { var c = s / 8 * 6.283; x.save(); x.rotate(c); x.fillStyle = '#e1b84c'; x.beginPath(); x.moveTo(0, R * 0.08); x.lineTo(R * 0.02, R * 0.16); x.lineTo(0, R * 0.24); x.lineTo(-R * 0.02, R * 0.16); x.fill(); x.restore(); } }); },
      drum: function (x, w, h) { x.fillStyle = '#e9eef2'; x.fillRect(0, 0, w, h); for (var i = 0; i < 64; i++) for (var j = 0; j < 10; j++) { x.fillStyle = (i + j) % 3 ? '#2a62ad' : '#1c8f9c'; x.beginPath(); x.arc((i + 0.5) / 64 * w, h * (0.35 + j * 0.06), w / 220, 0, 6.283); x.fill(); }
        for (var k = 0; k < 24; k++) { x.fillStyle = '#fff4d6'; x.fillRect((k + 0.3) / 24 * w, h * 0.08, w / 80, h * 0.16); } x.fillStyle = '#18407e'; x.fillRect(0, h * 0.28, w, h * 0.03); },
      floor: function (x, w) { x.fillStyle = '#a3262b'; x.fillRect(0, 0, w, w); x.strokeStyle = '#d7b35a'; x.lineWidth = 3; for (var i = 0; i < 12; i++) { x.beginPath(); x.moveTo(0, i * w / 12); x.lineTo(w, i * w / 12); x.stroke(); } } },
    notredame: { K: 1.9, wallSize: [256, 1024], endSize: [256, 840],   /* round 3: one bay a repeat (7.33 m x 33 m); the stone painted at 1/K and the walls' vertex colour K, so the stone reads as stone and the glass glows */
      wall: function (x, w, h) { var Y = function (m) { return h * (1 - m / 33); };
        stone831(x, w, h, 33);
        lancetPath(x, w / 2, w * 0.4, Y(1.1), Y(13.2)); x.fillStyle = '#17120d'; x.fill();   /* the arcade into the aisle (its 3D arch stands in front) */
        var ga = x.createLinearGradient(0, Y(13.2), 0, Y(1.1)); ga.addColorStop(0, 'rgba(60,48,36,0.9)'); ga.addColorStop(1, 'rgba(10,8,6,0.2)'); lancetPath(x, w / 2, w * 0.4, Y(1.1), Y(13.2)); x.fillStyle = ga; x.fill();
        glassIn(x, function () { lancetPath(x, w / 2, w * 0.12, Y(3.4), Y(9.6)); }, [w * 0.38, Y(9.6), w * 0.62, Y(3.4)], 7, 0.4);   /* the aisle's own window, deep inside */
        x.fillStyle = stoneC(232, 224, 208); x.fillRect(0, Y(14), w, Y(13.5) - Y(14));   /* string course */
        for (var t = 0; t < 2; t++) { lancetPath(x, w * (0.3 + t * 0.4), w * 0.13, Y(14.4), Y(19.2)); x.fillStyle = '#1d1813'; x.fill(); }   /* the tribune's twin openings */
        x.strokeStyle = stoneC(165, 155, 140); x.lineWidth = 4; lancetPath(x, w / 2, w * 0.4, Y(14.2), Y(19.9)); x.stroke();
        x.fillStyle = stoneC(232, 224, 208); x.fillRect(0, Y(20.6), w, Y(20.1) - Y(20.6));   /* string course */
        for (var c = 0; c < 2; c++) { var cx = w * (0.31 + c * 0.38); glassIn(x, function () { lancetPath(x, cx, w * 0.13, Y(21.2), Y(29.4)); }, [cx - w * 0.13, Y(29.4), cx + w * 0.13, Y(21.2)], 9, 0);   /* the clerestory: a pair of tall lancets */
          x.strokeStyle = stoneC(150, 140, 126); x.lineWidth = 5; lancetPath(x, cx, w * 0.13, Y(21.2), Y(29.4)); x.stroke(); }
        glassIn(x, function () { x.beginPath(); x.arc(w / 2, Y(30.9), w * 0.1, 0, 6.283); }, [w * 0.4, Y(30.9) - w * 0.1, w * 0.6, Y(30.9) + w * 0.1], 6, 0); x.strokeStyle = stoneC(150, 140, 126); x.lineWidth = 5; x.beginPath(); x.arc(w / 2, Y(30.9), w * 0.1, 0, 6.283); x.stroke();   /* the oculus over them */
        for (var sp = 0; sp < 6; sp++) { var aa = sp / 6 * 6.283; x.beginPath(); x.moveTo(w / 2, Y(30.9)); x.lineTo(w / 2 + Math.cos(aa) * w * 0.1, Y(30.9) + Math.sin(aa) * w * 0.1); x.stroke(); } },
      end: function (x, w, h) { var Y = function (m) { return h * (1 - m / 41); }, M = w / 12.5, cx = w / 2, cy = Y(23.6), R = 5 * M;   /* the rose from inside: rings of coloured glass in stone tracery, no figure */
        stone831(x, w, h, 41);
        var gl = x.createRadialGradient(cx, cy, R, cx, cy, R * 1.5); gl.addColorStop(0, 'rgba(255,236,200,0.35)'); gl.addColorStop(1, 'rgba(255,236,200,0)'); x.fillStyle = gl; x.fillRect(0, 0, w, h);
        x.save(); x.beginPath(); x.arc(cx, cy, R, 0, 6.283); x.clip(); x.fillStyle = '#120e0a'; x.fillRect(cx - R, cy - R, 2 * R, 2 * R);
        for (var ring = 3; ring >= 0; ring--) { var r1 = R * (0.3 + ring * 0.235), r0 = r1 - R * 0.2, n = ring < 2 ? 12 : 24; for (var i = 0; i < n; i++) { var a0 = i / n * 6.283 + 0.035, a1 = (i + 1) / n * 6.283 - 0.035;
            x.beginPath(); x.arc(cx, cy, r1, a0, a1); x.arc(cx, cy, r0, a1, a0, true); x.closePath(); x.fillStyle = GLASS831[(i * 3 + ring * 5) % GLASS831.length]; x.fill();
            var am = (a0 + a1) / 2, rm = (r0 + r1) / 2; x.beginPath(); x.arc(cx + Math.cos(am) * rm, cy + Math.sin(am) * rm, (r1 - r0) * 0.3, 0, 6.283); x.fillStyle = ring % 2 ? '#e8b23a' : '#b8202a'; x.fill(); } }
        x.beginPath(); x.arc(cx, cy, R * 0.1, 0, 6.283); x.fillStyle = '#2a64d0'; x.fill(); x.restore();
        x.strokeStyle = stoneC(150, 140, 126); x.lineWidth = 4; for (var r2 = 0; r2 < 4; r2++) { x.beginPath(); x.arc(cx, cy, R * (0.1 + r2 * 0.235), 0, 6.283); x.stroke(); } x.lineWidth = 7; x.beginPath(); x.arc(cx, cy, R, 0, 6.283); x.stroke();
        x.lineWidth = 3; for (var s = 0; s < 24; s++) { var as = s / 24 * 6.283; x.beginPath(); x.moveTo(cx + Math.cos(as) * R * 0.1, cy + Math.sin(as) * R * 0.1); x.lineTo(cx + Math.cos(as) * R, cy + Math.sin(as) * R); x.stroke(); }
        for (var l2 = 0; l2 < 6; l2++) { var lx = w * (0.13 + l2 * 0.148); glassIn(x, function () { lancetPath(x, lx, w * 0.052, Y(12.4), Y(17.8)); }, [lx - w * 0.052, Y(17.8), lx + w * 0.052, Y(12.4)], 5, 0); x.strokeStyle = stoneC(150, 140, 126); x.lineWidth = 3; lancetPath(x, lx, w * 0.052, Y(12.4), Y(17.8)); x.stroke(); }   /* the gallery of lancets under it */
        x.fillStyle = stoneC(232, 224, 208); x.fillRect(0, Y(11.6), w, Y(11) - Y(11.6));
        lancetPath(x, cx, 3 * M, Y(1.1), Y(10.4)); x.fillStyle = '#0f0b08'; x.fill(); x.strokeStyle = stoneC(160, 150, 135); x.lineWidth = 6; x.stroke(); },   /* the portal: open (her way in) */
      vault: function (x, w, h) { x.fillStyle = '#e4dccd'; x.fillRect(0, 0, w, h); for (var j = 0; j < 14; j++) { x.fillStyle = 'rgba(150,138,118,0.18)'; x.fillRect(0, j / 14 * h, w, 1.5); }   /* the webs between the ribs (the ribs themselves are built), one bay a repeat */
        var g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(120,108,90,0.28)'); g.addColorStop(0.5, 'rgba(255,250,240,0)'); g.addColorStop(1, 'rgba(120,108,90,0.28)'); x.fillStyle = g; x.fillRect(0, 0, w, h); },
      floor: function (x, w) { var n = 16, s = w / n; for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? '#5d5a55' : '#e3ddd0'; x.fillRect(i * s, j * s, s, s); } } },
    shaare: { wall: function (x, w, h) { x.fillStyle = '#f3efe6'; x.fillRect(0, 0, w, h); x.fillStyle = '#5a2f1d'; x.fillRect(0, h * 0.78, w, h * 0.22); for (var i = 0; i < 10; i++) { var cx = (i + 0.5) / 10 * w; x.fillStyle = '#e9f2f6'; x.fillRect(cx - w * 0.02, h * 0.22, w * 0.04, h * 0.44); x.beginPath(); x.arc(cx, h * 0.22, w * 0.02, Math.PI, 0); x.fill(); } },
      ceil: function (x, w, h) { x.fillStyle = '#f7f4ee'; x.fillRect(0, 0, w, h); x.fillStyle = '#5a2f1d'; for (var i = 0; i <= 8; i++) x.fillRect(i * w / 8 - 7, 0, 14, h); x.fillRect(0, 0, w, 12); x.fillRect(0, h - 12, w, 12); x.fillRect(0, h / 2 - 6, w, 12); x.fillStyle = '#d9b45a'; for (var j = 0; j < 8; j++) { x.beginPath(); x.arc((j + 0.5) * w / 8, h / 2, 9, 0, 6.283); x.fill(); } },   /* a white ceiling between mahogany beams, brass roses */
      floor: function (x, w) { x.fillStyle = '#e3cf9c'; x.fillRect(0, 0, w, w); x.strokeStyle = 'rgba(190,160,105,0.55)'; x.lineWidth = 3; for (var rp = 0; rp < 40; rp++) { x.beginPath(); x.arc(w * ((rp * 0.37) % 1), w * ((rp * 0.61) % 1), 30 + (rp % 5) * 14, 0.4, 2.6); x.stroke(); } for (var i = 0; i < 4000; i++) { x.fillStyle = i % 3 ? 'rgba(160,140,100,0.35)' : 'rgba(250,240,215,0.45)'; x.fillRect((i * 97.13) % w, (i * 57.71) % w, 2, 2); } } } };   /* the sand floor: the sand of the desert years, kept as the old Caribbean congregations kept it */
  function shellRotunda(I, P) {   // a drum and a dome, faces in; uv: the drum round and up, the dome polar; a floor disc
    var THREE = IX.THREE, N = Math.max(16, I.seg === 8 ? 8 : 32), grp = new THREE.Group(), pos = [], nrm = [], col = [], uv = [], idx = [], i, k;
    for (k = 0; k <= N; k++) { var a = k / N * 6.283, c = Math.cos(a), s = Math.sin(a); for (var v = 0; v <= 1; v++) { pos.push(c * I.r, v * I.h, s * I.r); nrm.push(-c, 0, -s); var b = 0.85 + 0.2 * v; col.push(b, b * 0.93, b * 0.84); uv.push(k / N * (I.seg === 8 ? 1 : 2), v); } }
    for (k = 0; k < N; k++) { var o = k * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
    grp.add(meshOf(pos, nrm, col, uv, idx, mat(cnv(1024, 256, P.drum), true)));
    pos = []; nrm = []; col = []; uv = []; idx = []; var RN = 10, eye = I.eye / I.r;
    for (i = 0; i <= RN; i++) { var ph = i / RN * (Math.PI / 2 - Math.asin(Math.min(0.99, eye || 0.01))), cr = Math.cos(ph), sr = Math.sin(ph); for (k = 0; k <= N; k++) { var a2 = k / N * 6.283; pos.push(Math.cos(a2) * cr * I.r, I.h + sr * I.dh, Math.sin(a2) * cr * I.r); nrm.push(-Math.cos(a2) * cr, -sr, -Math.sin(a2) * cr); var bb = 0.9 + 0.25 * (i / RN); col.push(bb, bb * 0.94, bb * 0.86); var rr = 0.5 * cr; uv.push(0.5 + Math.cos(a2) * rr, 0.5 + Math.sin(a2) * rr); } }
    for (i = 0; i < RN; i++) for (k = 0; k < N; k++) { var a0 = i * (N + 1) + k, b0 = a0 + N + 1; idx.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0); }
    grp.add(meshOf(pos, nrm, col, uv, idx, mat(cnv(512, 512, P.dome))));
    pos = [0, 1.1, 0]; nrm = [0, 1, 0]; col = [1, 1, 1]; uv = [0.5, 0.5]; idx = []; for (k = 0; k <= N; k++) { var a3 = k / N * 6.283; pos.push(Math.cos(a3) * I.r, 1.1, Math.sin(a3) * I.r); nrm.push(0, 1, 0); col.push(0.95, 0.95, 0.95); uv.push(0.5 + Math.cos(a3) * 0.5, 0.5 + Math.sin(a3) * 0.5); if (k) idx.push(0, k + 1, k); }
    grp.add(meshOf(pos, nrm, col, uv, idx, mat(cnv(512, 512, P.floor)))); return grp; }
  function shellBox(I, P, vault) {   // a long room, faces in: four walls, a pointed vault (or a flat ceiling), a floor; its long axis on x
    var THREE = IX.THREE, grp = new THREE.Group(), hl = I.L / 2, hw = I.W / 2, h = I.h;
    var rep = I.bay || 12, W = function (ax, az, bx2, bz, nx, nz, len) { return quadIn([ax, 0, az], [bx2, 0, bz], [bx2, h, bz], [ax, h, az], [nx, 0, nz], [0, 0, len / rep, 1]); };   /* round 3: a nave's wall repeats once a bay */
    var walls = [W(-hl, -hw, hl, -hw, 0, 1, I.L), W(hl, hw, -hl, hw, 0, -1, I.L), W(hl, -hw, hl, hw, -1, 0, I.W), W(-hl, hw, -hl, -hw, 1, 0, I.W)];
    if (I.endH) [2, 3].forEach(function (wi) { var q = walls[wi]; q.p[7] = q.p[10] = I.endH; });   /* round 3: the ends rise into the vault (its webs hide what stands over their arch) */
    var ws = P.wallSize || [1024, 256], es = P.endSize || [512, 512], wm = mat(cnv(ws[0], ws[1], P.wall), true), em = P.end ? mat(cnv(es[0], es[1], P.end)) : wm;
    walls.forEach(function (q, wi) { if (wi > 1 && P.end) q.u = [0, 0, 1, 0, 1, 1, 0, 1]; if (P.K) q.c = q.c.map(function () { return P.K; });   /* round 3: the glass glows (the stone is painted at 1/K) */ grp.add(meshOf(q.p, q.n, q.c, q.u, q.i, wi > 1 ? em : wm)); });
    if (vault) { var pos = [], nrm = [], col = [], uv = [], idx = [], N = 8, i, k; for (i = 0; i <= N; i++) { var a = i / N, t = -hw + a * I.W, y = h + Math.sin(Math.min(a, 1 - a) * Math.PI) * hw * 0.9 + (1 - Math.abs(a - 0.5) * 2) * hw * 0.35, ny = -1, nz = (0.5 - a) * 1.4; for (k = 0; k <= 1; k++) { pos.push(k ? hl : -hl, y, t); nrm.push(0, ny, nz); col.push(1.35, 1.32, 1.26); uv.push(k * I.L / rep, a); } }   /* round 3: the vault lit (its light comes up from the glass), one bay a repeat */
        for (i = 0; i < N; i++) { var o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } grp.add(meshOf(pos, nrm, col, uv, idx, mat(cnv(1024, 256, P.vault), true))); }
    else { var cq = quadIn([-hl, h, hw], [hl, h, hw], [hl, h, -hw], [-hl, h, -hw], [0, -1, 0], [0, 0, 1, 1]); grp.add(meshOf(cq.p, cq.n, cq.c, cq.u, cq.i, mat(cnv(512, 256, P.ceil)))); }
    var fq = quadIn([-hl, 1.1, -hw], [hl, 1.1, -hw], [hl, 1.1, hw], [-hl, 1.1, hw], [0, 1, 0], [0, 0, I.L / 24, I.W / 24]); grp.add(meshOf(fq.p, fq.n, fq.c, fq.u, fq.i, mat(cnv(512, 512, P.floor), true)));
    if (vault) kit(grp, I);   /* round 3: the nave in the round */
    return grp; }
  function vaultY(I, a) { var hw = I.W / 2; return I.h + Math.sin(Math.min(a, 1 - a) * Math.PI) * hw * 0.9 + (1 - Math.abs(a - 0.5) * 2) * hw * 0.35; }   // the vault's section (a: 0..1 across), as its mesh draws it (eight chords)
  function kit(grp, I) {   // round 3: Notre-Dame's nave in the round: round piers with capitals, the pointed arcades, the shafts to the vault, its ribs and bosses, the chairs, the altar (the props' program; no figure)
    var THREE = IX.THREE, P = [], N2 = [], C2 = [], ID = [], hl = I.L / 2, hw = I.W / 2, F = 1.1, B = I.bay, nb = Math.round(I.L / B), SPR = 9.6, APX = 13.2, k, sd, q8;
    var ST = [0.86, 0.82, 0.74], CAP = [0.93, 0.89, 0.8], RIB = [0.8, 0.75, 0.66], GB = [0.92, 0.72, 0.3], WD = [0.4, 0.26, 0.15], WH = [0.95, 0.94, 0.9];
    var sub = function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }, crs = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }, nrm = function (a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    var face = function (a, b, c, d, n, col) { var o = P.length / 3, f = crs(sub(b, a), sub(c, a)), q = f[0] * n[0] + f[1] * n[1] + f[2] * n[2] >= 0 ? [a, b, c, d] : [a, d, c, b];   /* wound to face along n */
      q.forEach(function (v) { P.push(v[0], v[1], v[2]); N2.push(n[0], n[1], n[2]); C2.push(col[0], col[1], col[2]); }); ID.push(o, o + 1, o + 2, o, o + 2, o + 3); };
    var box = function (x0, x1, y0, y1, z0, z1, col) { face([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], col); face([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col);
      face([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col); face([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], col); face([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], col); face([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], col); };
    var prism = function (cx, cz, y0, y1, r, n, col, top) { for (var j = 0; j < n; j++) { var a0 = j / n * 6.2832, a1 = (j + 1) / n * 6.2832, am = (a0 + a1) / 2;
        face([cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], [cx + Math.cos(a1) * r, y1, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y1, cz + Math.sin(a0) * r], [Math.cos(am), 0, Math.sin(am)], col);
        if (top) face([cx, y1, cz], [cx + Math.cos(a0) * r, y1, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y1, cz + Math.sin(a1) * r], [cx, y1, cz], [0, 1, 0], col); } };
    var beam = function (A, Bp, t, col) { var d = nrm(sub(Bp, A)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], s = nrm(crs(d, up)), u = crs(s, d), e = t / 2;
      var cr = function (Q, i, j) { return [Q[0] + (s[0] * i + u[0] * j) * e, Q[1] + (s[1] * i + u[1] * j) * e, Q[2] + (s[2] * i + u[2] * j) * e]; };
      var a0 = cr(A, -1, -1), a1 = cr(A, 1, -1), a2 = cr(A, 1, 1), a3 = cr(A, -1, 1), b0 = cr(Bp, -1, -1), b1 = cr(Bp, 1, -1), b2 = cr(Bp, 1, 1), b3 = cr(Bp, -1, 1);
      face(a0, a1, b1, b0, [-u[0], -u[1], -u[2]], col); face(a1, a2, b2, b1, s, col); face(a2, a3, b3, b2, u, col); face(a3, a0, b0, b3, [-s[0], -s[1], -s[2]], col); };
    var chain = function (pts, t, col) { for (var i = 0; i + 1 < pts.length; i++) beam(pts[i], pts[i + 1], t, col); };
    var arch = function (xa, xb, z) { var half = (xb - xa) / 2, rs = APX - SPR, rad = (half * half + rs * rs) / (2 * half), a1 = Math.atan2(rs, half - rad), pts = [], i;   /* a two-centred pointed arch from xa to xb, springing at SPR, its point at APX */
      for (i = 0; i <= 6; i++) { var a = Math.PI + (a1 - Math.PI) * i / 6; pts.push([xa + rad + Math.cos(a) * rad, SPR + Math.sin(a) * rad, z]); }
      var right = pts.slice(0, 6).reverse().map(function (q) { return [xa + xb - q[0], q[1], z]; }); chain(pts.concat(right), 0.62, ST); };
    for (k = 0; k <= nb; k++) { var x = -hl + k * B, inner = k > 0 && k < nb;
      for (sd = -1; sd <= 1; sd += 2) { var z = sd * (hw - 0.85), zs = sd * (hw - 0.3);
        if (inner) { box(x - 1.05, x + 1.05, F, F + 0.55, z - 1.05, z + 1.05, CAP); prism(x, z, F + 0.55, SPR - 1, 0.78, 12, ST); prism(x, z, SPR - 1, SPR - 0.25, 1.05, 12, CAP, true); box(x - 1.15, x + 1.15, SPR - 0.25, SPR, z - 1.15, z + 1.15, CAP);   /* the round pier, its capital and abacus */
          for (var c = -1; c <= 1; c++) prism(x + c * 0.36, zs, SPR, I.h, 0.17, 6, ST); prism(x, zs, I.h - 0.6, I.h, 0.6, 8, CAP, true); }   /* the three shafts up to the vault, a capital where they spring */
        if (k < nb) arch(x + (k > 0 ? 0.95 : 0.2), x + B - (k + 1 < nb ? 0.95 : 0.2), sd * (hw - 0.45)); } }   /* the arcade */
    var prof = function (a) { return vaultY(I, a) - 0.4; }, N8 = 8;
    for (k = 0; k <= nb; k++) { var xk = -hl + k * B, tr = []; for (q8 = 0; q8 <= N8; q8++) tr.push([Math.max(-hl + 0.3, Math.min(hl - 0.3, xk)), prof(q8 / N8), -hw + q8 / N8 * I.W]); chain(tr, 0.55, RIB);   /* the transverse rib */
      if (k < nb) { var d1 = [], d2 = []; for (q8 = 0; q8 <= N8; q8++) { var a8 = q8 / N8; d1.push([xk + a8 * B, prof(a8), -hw + a8 * I.W]); d2.push([xk + a8 * B, prof(a8), hw - a8 * I.W]); } chain(d1, 0.42, RIB); chain(d2, 0.42, RIB);   /* the diagonals */
        box(xk + B / 2 - 0.5, xk + B / 2 + 0.5, prof(0.5) - 0.55, prof(0.5) + 0.2, -0.5, 0.5, GB); } }   /* the boss where they cross */
    chain([[-hl + 0.3, prof(0.5), 0], [hl - 0.3, prof(0.5), 0]], 0.36, RIB);   /* the ridge */
    for (var xr = -hl + 14; xr < hl - 22; xr += 1.25) for (sd = -1; sd <= 1; sd += 2) { var z0 = sd * 1.7, z1 = sd * (hw - 2.1), za = Math.min(z0, z1), zb = Math.max(z0, z1);   /* the chairs, in rows facing east, an aisle down the middle */
      box(xr - 0.22, xr + 0.22, F + 0.42, F + 0.5, za, zb, WD); box(xr - 0.26, xr - 0.2, F + 0.5, F + 0.98, za, zb, WD); box(xr - 0.22, xr + 0.22, F, F + 0.42, za + 0.05, za + 0.12, WD); box(xr - 0.22, xr + 0.22, F, F + 0.42, zb - 0.12, zb - 0.05, WD); }
    box(hl - 16, hl - 0.2, F, F + 0.5, -hw + 1.8, hw - 1.8, CAP); box(hl - 14.5, hl - 0.2, F + 0.5, F + 0.95, -hw + 2.4, hw - 2.4, CAP);   /* the choir's steps */
    box(hl - 9, hl - 7.4, F + 0.95, F + 2, -1.8, 1.8, WH); box(hl - 9.1, hl - 7.3, F + 2, F + 2.08, -1.9, 1.9, GB);   /* the altar, plain */
    var m = propMat();
    grp.add(meshOf(P, N2, C2, P.map(function () { return 0; }).slice(0, P.length / 3 * 2), ID, m)); st.kit = { verts: P.length / 3, tris: ID.length / 3 }; }
  function quadIn(a, b, c, d, n, u) { return { p: a.concat(b, c, d), n: n.concat(n, n, n), c: [1, 0.93, 0.84, 1, 0.93, 0.84, 1, 0.93, 0.84, 1, 0.93, 0.84], u: [u[0], u[1], u[2], u[1], u[2], u[3], u[0], u[3]], i: (function () { var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2], fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx; return fx * n[0] + fy * n[1] + fz * n[2] > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]; })() }; }
  function meshOf(pos, nrm, col, uv, idx, m) { var THREE = IX.THREE, gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gm.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); gm.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gm.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gm.setIndex(idx);
    var me = new THREE.Mesh(gm, m); me.frustumCulled = false; me.matrixAutoUpdate = false; me.updateMatrix(); me.layers.set(7); me.renderOrder = -9.385; me.castShadow = me.receiveShadow = false; return me; }
  function propMat() {   // round 3: the built parts wear the rooms' own program over a white map (the ground's program painted their tops as grass: the pews' green stripes)
    var m = mat(IX.white || (IX.white = cnv(4, 4, function (x, w, h) { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); }))); m.name = 'sacred831:props'; if (m.emissive) m.emissive.setRGB(0.12, 0.08, 0.05); return m; }
  function props(grp, I) {   // Shaare Shalom: pews facing the middle, the bimah, the ark on the east wall (mahogany), brass lamps (the ground's own vertex-coloured program)
    var THREE = IX.THREE, P = [], C2 = [], N2 = [], ID = [], m = propMat();
    var B2 = function (x0, x1, y0, y1, z0, z1, c) { var v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], F = [[0, 3, 2, 1, 0, 0, -1], [4, 5, 6, 7, 0, 0, 1], [0, 4, 7, 3, -1, 0, 0], [1, 2, 6, 5, 1, 0, 0], [3, 7, 6, 2, 0, 1, 0], [0, 1, 5, 4, 0, -1, 0]];
      F.forEach(function (f) { var b = P.length / 3; for (var q = 0; q < 4; q++) { P.push.apply(P, v[f[q]]); N2.push(f[4], f[5], f[6]); C2.push(c[0], c[1], c[2]); } ID.push(b, b + 1, b + 2, b, b + 2, b + 3); }); };
    var MA = [0.36, 0.17, 0.1], hl = I.L / 2, hw = I.W / 2, B0 = B2; B2 = function (x0, x1, y0, y1, z0, z1, c) { B0(x0, x1, y0 + 0.95, y1 + 0.95, z0, z1, c); };   /* on the sand floor (1.1 m: over the ground's grass) */
    for (var r = 0; r < 6; r++) for (var sd = -1; sd <= 1; sd += 2) { var z0 = sd * (hw - 1.2 - r * 0.9); B2(-hl * 0.55, hl * 0.4, 0.15, 0.6, Math.min(z0, z0 - sd * 0.5), Math.max(z0, z0 - sd * 0.5), MA); B2(-hl * 0.55, hl * 0.4, 0.6, 1.05, sd > 0 ? z0 : z0 - 0.08, sd > 0 ? z0 + 0.08 : z0, MA); }
    B2(-2.2, 2.2, 0.15, 1.0, -1.6, 1.6, MA); B2(-2.2, 2.2, 1.0, 1.9, -1.6, -1.5, MA); B2(-2.2, 2.2, 1.0, 1.9, 1.5, 1.6, MA);   /* the bimah */
    B2(hl - 1.0, hl - 0.2, 0.15, 5.2, -2.2, 2.2, MA); B2(hl - 1.05, hl - 0.95, 0.9, 4.6, -1.4, 1.4, [0.48, 0.1, 0.12]);   /* the ark and its curtain */
    for (var lmp = -2; lmp <= 2; lmp++) B2(lmp * 4 - 0.4, lmp * 4 + 0.4, I.h - 2.6, I.h - 2.3, -0.4, 0.4, [0.85, 0.68, 0.3]);
    for (var gs = -1; gs <= 1; gs += 2) { var zi = gs * (hw - 2.4), zo = gs * hw; B2(-hl, hl * 0.62, 3.8, 4.1, Math.min(zi, zo), Math.max(zi, zo), MA); B2(-hl, hl * 0.62, 4.1, 5.0, Math.min(zi, zi + gs * 0.1), Math.max(zi, zi + gs * 0.1), MA);   /* the gallery on three sides, its balustrade and columns */
      for (var gc = -hl + 2; gc < hl * 0.62; gc += 3.2) B2(gc - 0.15, gc + 0.15, 0.15, 3.8, zi - 0.15, zi + 0.15, [0.92, 0.9, 0.85]); }
    B2(-hl, -hl + 2.4, 3.8, 4.1, -hw, hw, MA); B2(-hl + 2.4, -hl + 2.5, 4.1, 5.0, -hw + 2.4, hw - 2.4, MA);
    grp.add(meshOf(P, N2, C2, P.map(function () { return 0; }).slice(0, P.length / 3 * 2), ID, m)); }
  function attach(THREE, T, group) {
    var mk = (window.WFR_TRAVEL712 && WFR_TRAVEL712.makeMaterial) || (T && T.makeMaterial); if (IX.made || !on() || !T || !T.u || !mk) { st.why = 'attach: ' + (!on() ? 'off' : !T ? 'no travel' : !T.u ? 'no uniforms' : 'no makeMaterial'); return; }
    IX.THREE = THREE; IX.T = { makeMaterial: mk, u: T.u }; IX.group = group; IX.made = true;
    var t0 = performance.now();
    try { for (var k in IN) { var I = IN[k], P = PAINT[k], grp = I.kind === 'rotunda' ? shellRotunda(I, P) : shellBox(I, P, I.kind === 'nave'); if (k === 'shaare') props(grp, I);
        grp.name = 'sacred831:' + k; grp.visible = false; grp.matrixAutoUpdate = false; group.add(grp); IX.rooms.push({ id: k, I: I, g: grp }); st.interiors++; }
      var wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3)); wg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3)); wg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3)); wg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
      var warm = new THREE.Mesh(wg, IX.rooms[0].g.children[0].material); warm.name = 'sacred831:warm'; warm.frustumCulled = false; warm.layers.set(7); group.add(warm); }   /* the rooms' program (the roofs': 'feat' with a map) compiled at the gate */
    catch (e) { fault('attach', e); }
    st.attachMs = Math.round(performance.now() - t0); }
  var LT = new Map();
  function update(TR, her) {   // each travel frame: a room is placed at its true spot and shown within 600 m of her
    if (!IX.made || !TR || !TR.f) return; var W = window.WFR_WORLD, shown = [];
    for (var i = 0; i < IX.rooms.length; i++) { var R = IX.rooms[i], I = R.I, p = W.toLocal(TR.f, I.lat, I.lon), d = her ? Math.hypot(her.x - p.x, her.z - p.z) : 1e9, vis = d < 600;
      if (vis) { if (R.f !== TR.f || (R.seatN = (R.seatN || 0) + 1) % 30 === 0) { var q = W.toLocal(TR.f, I.lat + Math.cos((I.b || 90) * D2R) * 1e-4, I.lon + Math.sin((I.b || 90) * D2R) * 1e-4 / Math.cos(I.lat * D2R)), rot = -Math.atan2(q.z - p.z, q.x - p.x), gy = seat(I, TR.st.H, p, rot);
          if (R.f !== TR.f || Math.abs(gy - R.g.position.y) > 0.05) { R.g.position.set(p.x, gy, p.z); R.g.rotation.set(0, rot, 0); R.g.updateMatrix(); R.f = TR.f; R.y = gy; } }   /* round 3: seated again every 30 frames (the finer ground arrives after the room is shown) */
        shown.push(R.id); }
      if (R.g.visible !== vis) R.g.visible = vis; }
    st.shown = shown; if (her && IX.her && lensIn(her, IX.her) && IX.T && IX.T.u && IX.T.u.uEye) IX.T.u.uEye.value.copy(her); }   /* the lens kept inside a room again here, after the camera has followed her this frame (her: the camera's position) */
  function seat(I, H, p, rot) {   // round 3: the room's base so its floor (1.1 m up) is 0.7 m over the HIGHEST ground under it: no grass through the floor anywhere in it
    var ca = Math.cos(rot), sa = Math.sin(rot), ex = I.kind === 'rotunda' ? I.r : I.L / 2, ez = I.kind === 'rotunda' ? I.r : I.W / 2, m = -1e9;
    for (var i = -6; i <= 6; i++) for (var j = -2; j <= 2; j++) { var lx = ex * i / 6, lz = ez * j / 2; if (I.kind === 'rotunda' && Math.hypot(lx, lz) > I.r) continue; var h = H(p.x + lx * ca + lz * sa, p.z - lx * sa + lz * ca); if (h > m) m = h; }
    return Math.max(0, m) - 0.4; }
  function inRL(I, l, m) { if (l[1] < -1 || l[1] > (I.kind === 'rotunda' ? I.h + I.dh * 0.9 : I.h) - m) return false; return I.kind === 'rotunda' ? Math.hypot(l[0], l[2]) < I.r - m : Math.abs(l[0]) < I.L / 2 - m && Math.abs(l[2]) < I.W / 2 - (I.kind === 'nave' && l[1] < 13.6 ? 1.9 : 0) - m; }   // the lens' room: inside by m (under the vault's spring, the dome's 90%)
  function lensIn(cam, her) {   // she is inside a room: the lens is drawn in along its arm until it is inside the walls (and under the vault) too
    for (var i = 0; i < IX.rooms.length; i++) { var R = IX.rooms[i]; if (!R.g.visible) continue; var I = R.I, P = R.g.position, a = -R.g.rotation.y, ca = Math.cos(a), sa = Math.sin(a);
      var loc = function (q) { var dx = q.x - P.x, dz = q.z - P.z; return [dx * ca + dz * sa, q.y - P.y, -dx * sa + dz * ca]; };
      var inR = function (l, m) { return inRL(I, l, m); };
      if (!inR(loc(her), 0.3)) continue; if (inR(loc(cam), 0.6)) return false;
      var hx = her.x, hy = her.y + 0.5, hz = her.z; for (var k = 1; k >= 0; k -= 0.05) { var q = { x: hx + (cam.x - hx) * k, y: hy + (cam.y - hy) * k, z: hz + (cam.z - hz) * k }; if (inR(loc(q), 0.6) || k <= 0.06) { cam.set(q.x, q.y, q.z); st.lensIn = (st.lensIn || 0) + 1; return true; } } }
    return false; }
  /* round 2: THE ROOMS HAVE WALLS. She goes in and out only by the door (and the Pantheon's oculus): a crossing anywhere else is set back to the side she came from */
  var DOOR = { pantheon: -Math.PI / 2 };   // the room's door in its own frame: the Pantheon's bronze doors face north (local -z); every other room's west end (local -x)
  function roomLoc(R, q) { var P = R.g.position, a = -R.g.rotation.y, ca = Math.cos(a), sa = Math.sin(a), dx = q.x - P.x, dz = q.z - P.z; return [dx * ca + dz * sa, q.y - P.y, -dx * sa + dz * ca]; }
  function roomWorld(R, l) { var P = R.g.position, a = R.g.rotation.y, ca = Math.cos(a), sa = Math.sin(a); return { x: P.x + l[0] * ca + l[2] * sa, y: P.y + l[1], z: P.z - l[0] * sa + l[2] * ca }; }
  function domeY(I, rr) { var u = Math.min(1, rr / I.r); return I.h + I.dh * Math.sqrt(Math.max(0, 1 - u * u)); }
  function inRoom(I, l) { if (l[1] < -1) return false; if (I.kind === 'rotunda') { var rr = Math.hypot(l[0], l[2]); return rr < I.r && l[1] < domeY(I, rr); } return Math.abs(l[0]) < I.L / 2 && Math.abs(l[2]) < I.W / 2 && l[1] < I.h + (I.kind === 'nave' ? I.W * 0.45 : 0); }
  function passage(id, I, l) {   // is this point in the door (or the oculus)?
    if (I.kind === 'rotunda') { var rr = Math.hypot(l[0], l[2]); if (I.eye && rr < I.eye && l[1] > I.h) return true; var dA = DOOR[id] != null ? DOOR[id] : Math.PI, ang = Math.atan2(l[2], l[0]), da = Math.abs(Math.atan2(Math.sin(ang - dA), Math.cos(ang - dA)));
      return da * I.r < 3.5 && l[1] < Math.min(11, I.h * 0.6); }
    return Math.abs(l[2]) < (I.dw || 1.8) && l[1] < (I.dy || 4.5) && l[0] < 0; }   /* round 3: each room's own door (Notre-Dame's west portal is tall) */
  /* round 3: SHE FLIES IN. The travel zone holds her 30 m over the ground (world712-travel.js C.FLOOR, eased up at 1.5/s: what lifted her to ~28 m over a
     room's floor every frame). floor(her, ground, base): her flight floor over that ground: inside a room, the room's own floor (FLOOR_IN over it); in
     front of its door (or over the Pantheon's oculus) it comes down to the doorstep, blended back to the travel floor (base) over APP m; else null. */
  var FLOOR_IN = 1.4, APP = 40;
  function sm(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function floor(her, g, base) {
    if (!IX.made || !her) return null; base = base == null ? 30 : base; var best = null;
    for (var i = 0; i < IX.rooms.length; i++) { var R = IX.rooms[i]; if (!R.g.visible) continue; var I = R.I, l = roomLoc(R, her), low = R.g.position.y + 1.1 + FLOOR_IN - g, d, side;
      if (inRoom(I, l) || R.wasIn === true) { st.floorIn = (st.floorIn || 0) + 1; return low; }   /* wasIn: pressed into a wall she is a step out of it until the wall law sets her back (the travel floor would lift her up the wall) */
      if (I.kind === 'rotunda') { var dA = DOOR[R.id] != null ? DOOR[R.id] : Math.PI, ux = Math.cos(dA), uz = Math.sin(dA), along = l[0] * ux + l[2] * uz; side = Math.abs(l[0] * uz - l[2] * ux); d = along - I.r;
        if (I.eye && Math.hypot(l[0], l[2]) < I.eye + 3) { d = 0; side = 0; } }   /* over the oculus: the floor opens down through it */
      else { side = Math.abs(l[2]) - (I.dw || 1.8); d = -I.L / 2 - l[0]; }
      if (d < -0.5 || d > APP || side > 6) continue; var f = low + (base - low) * sm((d - 8) / (APP - 8)); if (best == null || f < best) best = f; }
    return best; }
  /* round 3: THE ROOM'S OWN SHOT. While she is inside, the lens rides a short arm behind her (827's spring arm: brought in short of the walls and the vault)
     and looks at the room's best part: Notre-Dame's vault and its rose ahead (low, looking up the nave); Shaare Shalom's sand floor, pews and bimah (from
     over her shoulder, looking down: walls, floor and ceiling all round, never the sky); the Pantheon's coffers and its oculus (low, looking up). */
  var LZ = { R: null, p: null, t: null, n: 0, ax: 0 };
  function shot(R, l, f) {   // the wanted lens and its aim, in the room's frame (l: her, f: her heading, level)
    var I = R.I, F = 1.1, c, t;
    if (I.kind === 'nave') { if (!LZ.ax || f[0] * LZ.ax < -0.35) LZ.ax = f[0] < 0 ? -1 : 1; var ax = LZ.ax;   /* down the nave's axis, the way she is going (a hysteresis: a turn across it does not swing the lens) */
      var dEnd = I.L / 2 - l[0] * ax, wR = Math.max(0, Math.min(1, (28 - dEnd) / 22));   /* near the end she flies at, the aim rises onto its rose */
      c = [l[0] - ax * 7, l[1] - 1.2, l[2] * 0.6]; t = [(l[0] + ax * 20) * (1 - wR) + ax * I.L / 2 * wR, (l[1] + 9) * (1 - wR) + 25 * wR, l[2] * 0.3 * (1 - wR)]; }   /* low, near the middle line, looking up the nave: the ribs going away, the rose at its end */
    else if (I.kind === 'hall') {   /* from the high corner farthest from her (it changes only for one 3 m farther): the whole room under the ceiling, her, the pews, the bimah and the sand */
      var best = LZ.cn, bd = -1, cd = -1; for (var cn = 0; cn < 4; cn++) { var px = (cn & 1 ? 1 : -1) * (I.L / 2 - 2.9), pz = (cn & 2 ? 1 : -1) * (I.W / 2 - 2.9), dd = Math.hypot(px - l[0], pz - l[2]); if (cn === LZ.cn) cd = dd; if (dd > bd) { bd = dd; best = cn; } }
      if (LZ.cn == null || bd > cd + 3) LZ.cn = best; c = [(LZ.cn & 1 ? 1 : -1) * (I.L / 2 - 2.9), I.h - 2.4, (LZ.cn & 2 ? 1 : -1) * (I.W / 2 - 2.9)];   /* inside the gallery's line, 2.4 m under the ceiling (the lens' near plane is 1 m: closer, it cut the ceiling open and the sky showed) */ t = aim(c, [l[0], l[1], l[2]], [0, F + 1, 0]); }
    else { var rr = Math.hypot(l[0], l[2]), ox = l[0], oz = l[2], ol = rr; if (ol < 3) { ox = -f[0]; oz = -f[2]; ol = 1; }   /* under the dome: on the line from the middle out through her, past her (at most to the wall), low; aimed between her and the oculus (so they stand one over the other in a tall frame) */
      var rc = Math.min(Math.max(rr + 6, 10), I.r - 1.2); c = [ox / ol * rc, l[1] - (rc - rr < 4 ? 3 : 2.5), oz / ol * rc]; t = aim(c, [l[0], l[1] + 0.3, l[2]], [0, I.h + I.dh, 0]); }
    var top = I.kind === 'rotunda' ? I.h + I.dh * 0.9 : I.h; c[1] = Math.max(F + 1.6, Math.min(top - 2.2, c[1])); return { c: c, t: t }; }   /* the lens 1.6 m and more off every surface: its near plane (1 m) never cuts one open */
  function aim(c, a, b) {   // a point straight ahead of c on the line half way between the directions to a and to b (both kept in frame)
    var da = [a[0] - c[0], a[1] - c[1], a[2] - c[2]], db = [b[0] - c[0], b[1] - c[1], b[2] - c[2]], la = Math.hypot(da[0], da[1], da[2]) || 1, lb = Math.hypot(db[0], db[1], db[2]) || 1;
    return [c[0] + (da[0] / la + db[0] / lb) * 10, c[1] + (da[1] / la + db[1] / lb) * 10, c[2] + (da[2] / la + db[2] / lb) * 10]; }
  function lens(cam, her, yaw, dt) {   // the page's flight camera, after its own lookAt: true when the room's shot holds the lens this frame
    if (!IX.made || !cam || !her) return false; var R = null, l = null;
    for (var i = 0; i < IX.rooms.length; i++) { var Q = IX.rooms[i]; if (!Q.g.visible) continue; var lq = roomLoc(Q, her); if (inRoom(Q.I, lq) || Q.wasIn === true) { R = Q; l = lq; break; } }
    if (!R) { LZ.R = null; LZ.ax = 0; LZ.cn = null; return false; }
    var I0 = R.I; if (I0.kind === 'rotunda') { var rr0 = Math.hypot(l[0], l[2]); if (rr0 > I0.r - 0.7) { l[0] *= (I0.r - 0.7) / rr0; l[2] *= (I0.r - 0.7) / rr0; } } else { l[0] = Math.max(-I0.L / 2 + 0.7, Math.min(I0.L / 2 - 0.7, l[0])); var zl = I0.W / 2 - (I0.kind === 'nave' && l[1] < 13.6 ? 2.2 : 0.7); l[2] = Math.max(-zl, Math.min(zl, l[2])); }
    l[1] = Math.max(1.6, Math.min((I0.kind === 'rotunda' ? I0.h + I0.dh * 0.9 : I0.h) - 1.2, l[1]));   /* pressed into a wall this frame (the wall law sets her back after): the shot is taken from where she will be, inside */
    var eye = roomWorld(R, [l[0], l[1] + 0.5, l[2]]);
    var a = -R.g.rotation.y, wx = Math.sin(yaw), wz = Math.cos(yaw), f = [wx * Math.cos(a) + wz * Math.sin(a), 0, -wx * Math.sin(a) + wz * Math.cos(a)], S0 = shot(R, l, f), cw = roomWorld(R, S0.c), tw = roomWorld(R, S0.t), k = 1 - Math.exp(-(dt || 0.016) * 5);
    if (LZ.R !== R) { LZ.R = R; LZ.p = { x: cam.position.x, y: cam.position.y, z: cam.position.z }; LZ.t = tw; LZ.n++; }   /* she has just come in: the lens eases from where it was */
    LZ.p.x += (cw.x - LZ.p.x) * k; LZ.p.y += (cw.y - LZ.p.y) * k; LZ.p.z += (cw.z - LZ.p.z) * k; LZ.t = { x: LZ.t.x + (tw.x - LZ.t.x) * k, y: LZ.t.y + (tw.y - LZ.t.y) * k, z: LZ.t.z + (tw.z - LZ.t.z) * k };
    var hx = eye.x, hy = eye.y, hz = eye.z, q = null;
    for (var s = 1; s >= 0; s -= 0.04) { q = { x: hx + (LZ.p.x - hx) * s, y: hy + (LZ.p.y - hy) * s, z: hz + (LZ.p.z - hz) * s }; if (inRL(R.I, roomLoc(R, q), 1.4)) break; }   /* 827's spring arm: in from the lens toward her eyes until it is 1.4 m inside the room (clear of the near plane) */
    var lx = LZ.t.x - q.x, ly = LZ.t.y - q.y, lz = LZ.t.z - q.z, lh = Math.hypot(lx, lz), mx = Math.tan(72 * D2R) * Math.max(lh, 1e-3); if (ly > mx) ly = mx; if (lh < 1e-3) { lx = Math.sin(yaw) * 0.3; lz = Math.cos(yaw) * 0.3; }   /* never steeper than 72 degrees (straight up the lens would turn over) */
    cam.position.set(q.x, q.y, q.z); cam.up.set(0, 1, 0); cam.lookAt(q.x + lx, q.y + ly, q.z + lz); if (IX.T && IX.T.u && IX.T.u.uEye) IX.T.u.uEye.value.copy(cam.position); st.lens = R.id; st.lensN = (st.lensN || 0) + 1; return true; }
  function wall(p, pad, body) {
    var moved = false; pad = pad || 0.5;
    for (var i = 0; i < IX.rooms.length; i++) { var R = IX.rooms[i], I = R.I; if (!R.g.visible) { R.wasIn = undefined; continue; } var l = roomLoc(R, p), inn = inRoom(I, l), jump = R.lp ? Math.hypot(p.x - R.lp[0], p.y - R.lp[1], p.z - R.lp[2]) > 8 : true; R.lp = [p.x, p.y, p.z];   /* a jump of 8 m in a frame is a teleport (a save, a respawn): taken as it lands */
      if (R.wasIn === undefined || jump || inn === R.wasIn) { R.wasIn = inn; continue; }
      if (passage(R.id, I, l)) { R.wasIn = inn; st.passages = (st.passages || 0) + 1; continue; }
      var q = l.slice();
      if (R.wasIn) {   // she tried to leave through a wall or the vault: back inside
        if (I.kind === 'rotunda') { var rr = Math.hypot(q[0], q[2]); if (rr > I.r - pad) { q[0] *= (I.r - pad) / rr; q[2] *= (I.r - pad) / rr; } q[1] = Math.min(q[1], domeY(I, Math.hypot(q[0], q[2])) - pad); }
        else { q[0] = Math.max(-I.L / 2 + pad, Math.min(I.L / 2 - pad, q[0])); q[2] = Math.max(-I.W / 2 + pad, Math.min(I.W / 2 - pad, q[2])); q[1] = Math.min(q[1], I.h - pad); } }
      else {   // she tried to come in through a wall or the vault: back outside
        if (I.kind === 'rotunda') { var r2 = Math.hypot(q[0], q[2]) || 1e-3, overTop = q[1] > I.h; if (overTop) q[1] = domeY(I, r2) + pad; else { q[0] *= (I.r + pad) / r2; q[2] *= (I.r + pad) / r2; } }
        else { var ex = I.L / 2 - Math.abs(q[0]), ez = I.W / 2 - Math.abs(q[2]), ey = I.h - q[1]; if (ey < ex && ey < ez) q[1] = I.h + pad; else if (ex < ez) q[0] = (q[0] < 0 ? -1 : 1) * (I.L / 2 + pad); else q[2] = (q[2] < 0 ? -1 : 1) * (I.W / 2 + pad); } }
      var w = roomWorld(R, q), dx = w.x - p.x, dy = w.y - p.y, dz = w.z - p.z; p.x = w.x; p.y = w.y; p.z = w.z; R.lp = [p.x, p.y, p.z]; if (body && body.position) { body.position.x += dx; body.position.y += dy; body.position.z += dz; }
      moved = true; st.walls = (st.walls || 0) + 1; }
    return moved; }
  function aisle(p, body) {   // round 3: in Notre-Dame's nave the piers and arcades stand 1.9 m in from the walls (the aisles behind are painted): under the arcades' points she keeps inside them
    for (var i = 0; i < IX.rooms.length; i++) { var R = IX.rooms[i], I = R.I; if (I.kind !== 'nave' || !R.g.visible || R.wasIn !== true) continue; var l = roomLoc(R, p), lim = I.W / 2 - 1.9;
      if (l[1] > 13.6 || Math.abs(l[2]) <= lim || Math.abs(l[0]) > I.L / 2) continue; l[2] = (l[2] < 0 ? -1 : 1) * lim; var w = roomWorld(R, l), dx = w.x - p.x, dz = w.z - p.z; p.x = w.x; p.z = w.z; R.lp = [p.x, p.y, p.z]; if (body && body.position) { body.position.x += dx; body.position.z += dz; } st.aisle = (st.aisle || 0) + 1; } }
  function her(pos, body, cam) {   // each travel frame (world-vegetation's tick, at any height): the rooms' walls for her, then the lens inside them
    if (!IX.made || !pos) return; wall(pos, 0.5, body); aisle(pos, body); IX.her = pos; if (cam && lensIn(cam, pos) && IX.T && IX.T.u && IX.T.u.uEye) IX.T.u.uEye.value.copy(cam); }
  function crossLaw(id, a, b) {   // the bench's read: from frame point a to b, may she pass? (the same law, without moving anyone)
    var R = IX.rooms.find(function (q) { return q.id === id; }); if (!R) return null; var la = roomLoc(R, a), lb = roomLoc(R, b), ia = inRoom(R.I, la), ib = inRoom(R.I, lb); return ia === ib || passage(id, R.I, lb); }
  function room(id) { var R = IX.rooms.find(function (q) { return q.id === id; }); if (!R) return null; R.g.updateMatrixWorld(true); var e = R.g.matrixWorld.elements; return { x: e[12], y: e[13], z: e[14], rot: R.g.rotation.y, visible: R.g.visible, meshes: R.g.children.length, I: R.I }; }
  function peek() { var o = JSON.parse(JSON.stringify(st)); o.on = on(); o.rooms = IX.rooms.map(function (R) { return R.id; }); o.LM = LM.length; o.K = IX.T && IX.T.u && IX.T.u.uInvK ? +(1 / IX.T.u.uInvK.value).toFixed(3) : null; return o; }
  var K1 = { k1: true };
  function k1(p) {   // round 3: the travel ground's update option while she is in a room or at its door: true scale (729's K1). The shrink (K = half her height, 4.6 at 9 m) put every wall, the ceiling and the piers within K m behind the 1 m near plane: the sky through Shaare Shalom's ceiling
    if (!IX.made || !p) return null; for (var i = 0; i < IX.rooms.length; i++) { var R = IX.rooms[i]; if (!R.g.visible) continue; if (R.wasIn === true) return K1; var l = roomLoc(R, p), I = R.I, e = I.kind === 'rotunda' ? I.r + 14 : null;
      if (e ? Math.hypot(l[0], l[2]) < e && l[1] < I.h + I.dh + 6 : Math.abs(l[0]) < I.L / 2 + 14 && Math.abs(l[2]) < I.W / 2 + 14 && l[1] < I.h + 12) { st.k1 = (st.k1 || 0) + 1; return K1; } } return null; }
  function inside(p) { if (!IX.made || !p) return false; for (var i = 0; i < IX.rooms.length; i++) { var R = IX.rooms[i]; if (R.g.visible && (R.wasIn === true || inRoom(R.I, roomLoc(R, p)))) return true; } return false; }   // round 3: is she in a room (the vegetation's lens steps stand aside)
  return { on: on, LM: LM, IN: IN, skips: skips, tasks: tasks, want: want, dress: dress, attach: attach, update: update, room: room, lensIn: lensIn, wall: wall, her: her, cross: crossLaw, peek: peek, floor: floor, lens: lens, inside: inside, k1: k1, version: 1 };
})();
