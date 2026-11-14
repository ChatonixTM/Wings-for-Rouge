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
    LOADS: 4, KEPT: 56, SLICE_MS: 4, TRI_MAX: 1500000, LABELS: 8, AREA_MIN: 20, H_DEF: 6, H_MAX: 900, SINK: 1.5, WAIT_MS: 2500, LAYER: 7,
    LIFT: { 14: 0.3, 12: 1.0, 9: 4.0 }, SUB: { 14: 30, 12: 120, 9: 800 }, WIDEN: { 14: 1, 12: 1.5, 9: 4 },
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
  var stats = { lakeReads: [], fetched: 0, bytes: 0, errors: 0, empty: 0, built: 0, evicted: 0, restale: 0, jobs: 0, sliceMax: 0, updMax: 0, upd: [], buildings: 0, roads: 0, waters: 0, tris: 0, visible: 0, kept: 0, inflight: 0, labels: 0, places: 0, fault: null, lastError: null, recentres: 0, tilejson: null, waits: 0 };
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
  var poiWant = null;   /* 729: world-interiors.js asks for shops, cafes and offices near the quests */
  function want(z, t) { var w = { transportation: 1, water: 1, waterway: 1, place: z <= 12 ? 1 : 0, building: z >= 14 ? 1 : 0 }; if (listeners.length) { w.landcover = 1; w.landuse = 1; if (window.WFR_LANDCLASS && window.WFR_LANDCLASS.live && window.WFR_LANDCLASS.live()) w.aeroway = 1; } if (poiWant && z >= 14 && t && poiWant(t)) w.poi = 1; return w; }
  function startJob(t) {
    var st = T.st, f = T.f, L = decodeTile(t.raw, want(t.z, t)), order = ['water', 'waterway', 'transportation', 'building', 'place', 'landcover', 'landuse', 'aeroway', 'poi'], lays = [];
    for (var i = 0; i < order.length; i++) if (L[order[i]]) lays.push(L[order[i]]);
    var a = W.toLocal(f, t.nw.lat, t.nw.lon), b = W.toLocal(f, t.se.lat, t.se.lon), cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, pr = st.probe(cx, cz);
    t.job = { lakeK: 0, f: f, ax: a.x, az: a.z, lays: lays, li: 0, fi: 0, wall: new Out(), roof: new Out(), gnd: new Out(), wallN: 0, nB: 0, nR: 0, nW: 0, places: [], feed: listeners.length ? { landcover: [], landuse: [], aeroway: [], water: [], buildings: [], roads: [], pois: [] } : null, terrZ: pr ? pr.zoom : -1 };
    t.job.gnd.uv = null; t.job.terrA = { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) }; stats.jobs++;
    if (t.z === 14 && mats.city && window.WFR_CITY790) { var J7 = t.job; J7.Out = Out; J7.tri = tri; J7.Hf = function (lx, lz) { return H(J7, lx, lz); }; WFR_CITY790.begin(J7, t); }   /* 790 A */
  }
  function stepJob(t, deadline) {   // true when done
    var J = t.job; if (J.f !== T.f) { startJob(t); J = t.job; }   // re-centred mid-build: start again in the new frame (rare: every 10 km)
    var cnt = 0;
    while (J.li < J.lays.length) { var L = J.lays[J.li], n = L.feats.length / 2;
      while (J.fi < n) { if (J.bq && !drainB(t, J, deadline)) return false; var ft = feature(L, J.fi++), e0 = now(); try { emit(t, J, L, ft); } catch (e) { stats.lastError = 'feature: ' + (e && e.message || e); } var em = now() - e0; if (em > ((stats.emitMax || (stats.emitMax = {}))[L.name] || 0)) { stats.emitMax[L.name] = +em.toFixed(1); if (L.name === 'building') stats.emitBig = [ft.rings.length, ft.rings.reduce(function (q, r) { return q + r.length / 2; }, 0), t.key]; }
        if ((++cnt & (J.city ? 1 : 7)) === 0 && now() > deadline) return false; }   /* 790: a dressed building weighs more: the clock asked every second one */
      if (J.bq && !drainB(t, J, deadline)) return false; J.li++; J.fi = 0; }
    if (J.city && !WFR_CITY790.stepRoads(J, deadline, H, now)) return false;   /* 790 A: the streets, after the buildings, a slice at a time */
    finish(t); return true;
  }
  function drainB(t, J, deadline) { var q = J.bq; while (q.i < q.ps.length) { building(t, J, q.ps[q.i], q.P, q.id, q.E, q.i); q.i++; if ((q.i & 3) === 0 && now() > deadline) return false; } J.bq = null; return true; }   /* 790 */
  function locRing(t, J, r, E, ll) {   // tile units to the frame's metres, relative to the tile's north-west corner (and, for the listeners, lat/lon)
    var n = r.length / 2, out = new Array(r.length), z = t.z, x = t.x, y = t.y, f = J.f;
    for (var i = 0; i < n; i++) { var g = llOf(z, x, y, r[2 * i], r[2 * i + 1], E), p = W.toLocal(f, g.lat, g.lon); out[2 * i] = p.x - J.ax; out[2 * i + 1] = p.z - J.az; if (ll) { ll[2 * i] = g.lon; ll[2 * i + 1] = g.lat; } }
    return out;
  }
  function H(J, lx, lz) { return T.st.H(J.ax + lx, J.az + lz); }
  function emit(t, J, L, ft) {
    var name = L.name, P = ft.props, E = L.extent;
    if (name === 'poi') { if (J.feed && J.feed.pois && ft.type === 1 && ft.rings[0] && /^(office|cafe|shop|clothing_store|grocery|bakery|ice_cream)$/.test(P['class'])) { var g729 = llOf(t.z, t.x, t.y, ft.rings[0][0], ft.rings[0][1], E); J.feed.pois.push({ id: ft.id, cls: P['class'], sub: P.subclass || null, name: P['name:en'] || P.name_en || P.name || null, lat: g729.lat, lon: g729.lon }); } return; }   /* 729 */
    if (name === 'building') { if (ft.type !== 3 || P.hide_3d) return; var ps = polygons(ft.rings); if (J.city) { J.bq = { ps: ps, P: P, id: ft.id, E: E, i: 0 }; return; } for (var i = 0; i < ps.length; i++) building(t, J, ps[i], P, ft.id, E); return; }   /* 790: one z14 feature can hold 9,000 buildings: the city drains it a slice at a time */
    if (name === 'transportation') { var cl = P['class']; if (cl === 'transit' && t.z === 14 && J.feed && ft.type === 2 && P.brunnel !== 'tunnel') { var fl790 = feedLine(t, ft.rings, E, 'transit', 3); fl790.sub = P.subclass || null; J.feed.roads.push(fl790); return; }   /* 790 B: the streetcar lines to the listeners (world-life790.js), not drawn */ if (!ROADS[t.z][cl] || ft.type !== 2 || P.brunnel === 'tunnel') return; for (i = 0; i < ft.rings.length; i++) { var lr = locRing(t, J, ft.rings[i], E); if (!(J.city && WFR_CITY790.road(J, cl, lr))) ribbon(J, lr, ROAD_W[cl] * C.WIDEN[t.z], ROAD_C[cl], C.LIFT[t.z], C.SUB[t.z]); } J.nR++; if (J.feed) J.feed.roads.push(feedLine(t, ft.rings, E, cl, ROAD_W[cl] * C.WIDEN[t.z])); return; }   /* veg (Nov 4): the listeners hear the roads too (no grass or tree on a road) */
    if (name === 'waterway') { var wc = P['class'], ww = WAY_W[wc]; if (!ww || ft.type !== 2 || (wc === 'stream' && t.z < 14) || P.brunnel === 'tunnel') return; for (i = 0; i < ft.rings.length; i++) ribbon(J, locRing(t, J, ft.rings[i], E), ww * C.WIDEN[t.z], WATER_C, C.LIFT[t.z] * 1.2, C.SUB[t.z]); if (J.feed) J.feed.roads.push(feedLine(t, ft.rings, E, 'water', ww * C.WIDEN[t.z])); return; }
    if (name === 'water') { if (ft.type !== 3) return; ps = polygons(ft.rings);
      for (i = 0; i < ps.length; i++) { if (J.feed) J.feed.water.push(feedPoly(t, J, ps[i], E, P['class'])); if (!WATER_SKIP[P['class']]) { lake(t, J, ps[i], E, ft.id); J.nW++; } } return; }
    if (name === 'place') { var pc = P['class'], nm = P['name:en'] || P.name_en || P.name; if (!PLACE_R[pc] || !nm || ft.type !== 1 || !ft.rings[0]) return; if (t.z === 9 && !(pc === 'city' || pc === 'town' || pc === 'island')) return;
      var g = llOf(t.z, t.x, t.y, ft.rings[0][0], ft.rings[0][1], E); if (ft.rings[0][0] < 0 || ft.rings[0][0] >= E || ft.rings[0][1] < 0 || ft.rings[0][1] >= E) return; J.places.push({ name: String(nm), cls: pc, rank: P.rank || 9, lat: g.lat, lon: g.lon }); return; }
    if (name === 'aeroway') { if (J.feed && J.feed.aeroway) { if (ft.type === 3) { ps = polygons(ft.rings); for (i = 0; i < ps.length; i++) J.feed.aeroway.push(feedPoly(t, J, ps[i], E, P['class'])); } else if (ft.type === 2) J.feed.aeroway.push(feedLine(t, ft.rings, E, P['class'], P['class'] === 'runway' ? 60 : 25)); } return; }   // 772a: pavement for the listeners (areas as polygons; a centre line with a DRAFT width: runway 60 m, taxiway 25 m)
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
    var rnd = hash((id | 0) ^ (Math.floor(gC * 7) | 0)), tall = h >= 60, col = tall ? GLASS[Math.floor(rnd * GLASS.length)] : WALLS[Math.floor(rnd * WALLS.length)], house = h <= 14 && Math.abs(area / 2) <= 600 && !mh;
    if (J.city) { WFR_CITY790.building(J, { rings: rings, area: area / 2, h: h, mh: mh, top: top, bot: bot, gC: gC, P: P, house: house, id: pi ? (id | 0) ^ Math.imul(pi, 0x9E3779B1) : id, faces: triangulate(rings), tri: tri }, Out);   /* 790 A */
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
      if (prev >= 0) { tri(G, prev, prev + 1, kl); tri(G, prev + 1, kr, kl); } prev = kl; }
  }
  function meshOf(o, mat, name, order) {
    if (!o || !o.i.length) return null; var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(o.c, 3));
    if (o.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2)); if (o.f && o.f.length) { g.setAttribute('aF790', new THREE.Float32BufferAttribute(o.f, 2)); g.setAttribute('aM790', new THREE.Float32BufferAttribute(o.m, 2)); } g.setIndex(o.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(o.i, 1) : new THREE.Uint16BufferAttribute(o.i, 1));
    var m = new THREE.Mesh(g, mat); m.name = name; m.frustumCulled = false; m.matrixAutoUpdate = false; m.renderOrder = order; m.layers.set(C.LAYER); m.castShadow = m.receiveShadow = false; m.userData.tris = o.i.length / 3; return m;
  }
  function finish(t) {
    var J = t.job, f0 = now(); disposeMeshes(t); J.wallN = J.wall.p.length / 3;   // the walls that stand on the ground are the first wallN vertices of their mesh, four a wall (two feet, two tops): the guard reads the feet there
    var cells = cellSort(t, J);
    var ms = [meshOf(J.gnd, mats.ground, 'features:ground:' + t.key, -9.39), meshOf(mergeRoofs(J), J.wall.f ? mats.city : mats.wall, 'features:walls:' + t.key, -9.385), meshOf(J.roof, mats.roof, 'features:roofs:' + t.key, -9.385)];
    if (J.road && mats.road) ms.push(meshOf(J.road, mats.road, 'features:roads:' + t.key, -9.388)); if (window.WFR_CITY790) { WFR_CITY790.finishTile(t, J); WFR_CITY790.changed(); }   /* 790 A */
    var w = ms[1]; if (w) w.userData.wallN = J.wallN;
    if (cells && ms[0]) { ms[0].material = [mats.ground]; ms[0].userData.cells = cells; ms[0].geometry.addGroup(0, J.gnd.i.length, 0); ms[0].userData.sig = ''; }   // the same material object (the same program), drawn by groups: a coarse cell steps aside where a finer tile stands
    t.meshes = ms.filter(Boolean); t.f = J.f; t.ax = J.ax; t.az = J.az; t.terrZ = J.terrZ; t.places = J.places; t.box = J.terrA; t.nB = J.nB; t.nR = J.nR; t.nW = J.nW; t.lakes = J.lakes || null;
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
  function update(cam, travel) {   // every travel frame, before the render; off the travel zone it hides what it shows (labels, credit)
    if (!mats) return; var t0 = now(); frameNo++;
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
      stats.tris = tris; stats.visible = shown; cover();
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
    var cand = [], names = new Set(), REFR = window.WFR_TRAVEL712 && WFR_TRAVEL712.C.REFR;
    tiles.forEach(function (t) { if (t.used !== frameNo && t.used !== frameNo - 1 && t.used !== frameNo - 2 && t.used !== frameNo - 3) return; for (var i = 0; i < t.places.length; i++) { var p = t.places[i]; if (names.has(p.name)) continue;
      var L = W.toLocal(T.f, p.lat, p.lon), d = Math.hypot(L.x - cam.x, L.z - cam.z); if (d > PLACE_R[p.cls]) continue; names.add(p.name); cand.push({ p: p, x: L.x, z: L.z, d: d, s: PLACE_W[p.cls] / (1 + d / 4000) / (1 + (p.rank || 5) * 0.05) }); } });
    cand.sort(function (a, b) { return b.s - a.s; }); stats.places = cand.length;
    var W0 = window.innerWidth, H0 = window.innerHeight, used = 0;
    for (var i = 0; i < cand.length && used < C.LABELS; i++) { var c = cand[i], y = T.st.H(c.x, c.z) + 40 - (REFR ? c.d * c.d / (2 * REFR) : 0); v3.set(c.x, y, c.z).project(camera); if (v3.z > 1 || v3.z < -1 || Math.abs(v3.x) > 0.95 || Math.abs(v3.y) > 0.9) continue;
      var el = pool[used] || (pool[used] = mk()); if (el.textContent !== c.p.name) el.textContent = c.p.name; var big = c.p.cls === 'city' ? 15 : c.p.cls === 'town' ? 13 : 11.5;
      el.style.fontSize = big + 'px'; el.style.opacity = String(Math.max(0.35, Math.min(1, 1.4 - c.d / PLACE_R[c.p.cls]))); el.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W0).toFixed(1) + 'px,' + ((-v3.y * 0.5 + 0.5) * H0).toFixed(1) + 'px) translate(-50%,-100%)'; el.hidden = false; used++; }
    for (i = used; i < pool.length; i++) if (!pool[i].hidden) pool[i].hidden = true;
    labelsEl.hidden = used === 0; stats.labels = used;
  }
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
  var api = { C: C, attach: attach, update: update, peek: peek, meshes: meshes, decodeTile: decodeTile, feature: feature, polygons: polygons, llOf: llOf,
    onTile: function (cb) { listeners.push(cb); }, wantPoi: function (fn) { poiWant = fn; }, onDrop: function (cb) { droppers.push(cb); }, setFetch: function (fn) { fetchFn = fn; }, group: function () { return group; }, materials: function () { return mats; }, attached: function () { return { T: T, scene: scene, warm: warm }; }, version: 1 };   // attached(): what the page handed attach() (the game's script is scoped; the guard reads it here)
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
    LIFT_S: 0.32, LIFT_A: 0.38, SUB: 22, PERIOD: 8, TREE_STEP: 11, LAMP_STEP: 32, TREE_R: 600, LAMP_R: 420, BENCH_R: 300, MOVE: 40, AGL_MAX: 650,
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
      if (HAS('nofacade')) style = 0; if (tc) st.tagged++; else st.seeded++; st.styles[style]++;
      var shop = 0; if (!tall && !house && J.city && J.city.near(cx, cz, C.SHOP_D + Math.sqrt(area) / 2)) { shop = 1; st.shops++; }
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
    var side = town ? (C.SIDE[cls] || 0) : 0, Ro = J.road || (J.road = new J.Out()), G = J.gnd, ac = cls === 'service' ? [0.9, 0.9, 0.9] : [1, 1, 1], scol = toLin([0.74, 0.73, 0.70]);
    var prev = null, prevS = null;
    for (i = 0; i < T2.length; i++) { var tt = T2[i], q0 = at(p, s, tt), cut = inCut(tt - 0.02) || inCut(tt + 0.02), dir = q0[2];
      var nx = -dir[1], nz = dir[0], lx = q0[0] + nx * hw, lz = q0[1] + nz * hw, rx = q0[0] - nx * hw, rz = q0[1] - nz * hw;
      var yl = Math.max(0, H(lx, lz)) + C.LIFT_A, yr = Math.max(0, H(rx, rz)) + C.LIFT_A, v = tt / C.PERIOD;
      var segPlain = i > 0 && inCut((T2[i - 1] + tt) / 2), u0 = segPlain ? 64 / 512 : (sec[0] + 8) / 512, u1 = segPlain ? 64 / 512 : (sec[1] - 8) / 512;
      var kl = Ro.v(lx, yl, lz, 0, 1, 0, ac[0], ac[1], ac[2], u0, v), kr = Ro.v(rx, yr, rz, 0, 1, 0, ac[0], ac[1], ac[2], u1, v);
      if (prev) { var pl = prev[0], pr = prev[1]; if (prev[2] !== segPlain) { var a0 = Ro.p.length / 3; Ro.v(Ro.p[3 * pl], Ro.p[3 * pl + 1], Ro.p[3 * pl + 2], 0, 1, 0, ac[0], ac[1], ac[2], u0, Ro.uv[2 * pl + 1]); Ro.v(Ro.p[3 * pr], Ro.p[3 * pr + 1], Ro.p[3 * pr + 2], 0, 1, 0, ac[0], ac[1], ac[2], u1, Ro.uv[2 * pr + 1]); pl = a0; pr = a0 + 1; }
        J.tri(Ro, pl, pr, kl); J.tri(Ro, pr, kr, kl); }
      prev = [kl, kr, segPlain];
      if (side > 0) { var ow = hw + side, sx = q0[0] + nx * ow, sz = q0[1] + nz * ow, ex = q0[0] - nx * ow, ez = q0[1] - nz * ow;
        var sl = G.v(sx, Math.max(0, H(sx, sz)) + C.LIFT_S, sz, 0, 1, 0, scol[0], scol[1], scol[2]), sr = G.v(ex, Math.max(0, H(ex, ez)) + C.LIFT_S, ez, 0, 1, 0, scol[0], scol[1], scol[2]);
        if (prevS != null) { J.tri(G, prevS, prevS + 1, sl); J.tri(G, prevS + 1, sr, sl); } prevS = sl; } }
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
    var u0 = (SEC.zebra[0] + 8) / 512, u1 = (SEC.zebra[1] - 8) / 512, k = [[u0, 0], [u1, 0], [u1, 0.4], [u0, 0.4]].map(function (uv, i) { return Ro.v(pts[i][0], y(pts[i][0], pts[i][1]), pts[i][1], 0, 1, 0, 1, 1, 1, uv[0], uv[1]); });
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
  return { C: C, on: on, materials: materials, begin: begin, building: building, road: road, stepRoads: stepRoads, finishTile: finishTile, tick: tick, changed: changed, restale: restale, peek: peek, tagColour: tagColour, obb: obb, U: U, version: 1 };
})();
