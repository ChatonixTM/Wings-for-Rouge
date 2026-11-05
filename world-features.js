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
    return { ground: ground, wall: wall, roof: roof };
  }
  function attach(three, sc, travel, cam) {   // once, at load, where the travel material is made (the page's TRAVEL712 and its uniforms)
    if (mats) return api;
    THREE = three; scene = sc; T = travel; camera = cam || null; mats = makeMats(T.u);
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
    warm = new THREE.Mesh(g, mats.wall); warm.name = 'features:warm'; warm.frustumCulled = false; warm.layers.set(C.LAYER); scene.add(warm);   // a point-sized triangle: the walls' program compiles with the ground's at the gate, never later
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
  function want(z, t) { var w = { transportation: 1, water: 1, waterway: 1, place: z <= 12 ? 1 : 0, building: z >= 14 ? 1 : 0 }; if (listeners.length) { w.landcover = 1; w.landuse = 1; } if (poiWant && z >= 14 && t && poiWant(t)) w.poi = 1; return w; }
  function startJob(t) {
    var st = T.st, f = T.f, L = decodeTile(t.raw, want(t.z, t)), order = ['water', 'waterway', 'transportation', 'building', 'place', 'landcover', 'landuse', 'poi'], lays = [];
    for (var i = 0; i < order.length; i++) if (L[order[i]]) lays.push(L[order[i]]);
    var a = W.toLocal(f, t.nw.lat, t.nw.lon), b = W.toLocal(f, t.se.lat, t.se.lon), cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, pr = st.probe(cx, cz);
    t.job = { lakeK: 0, f: f, ax: a.x, az: a.z, lays: lays, li: 0, fi: 0, wall: new Out(), roof: new Out(), gnd: new Out(), wallN: 0, nB: 0, nR: 0, nW: 0, places: [], feed: listeners.length ? { landcover: [], landuse: [], water: [], buildings: [], roads: [], pois: [] } : null, terrZ: pr ? pr.zoom : -1 };
    t.job.gnd.uv = null; t.job.terrA = { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) }; stats.jobs++;
  }
  function stepJob(t, deadline) {   // true when done
    var J = t.job; if (J.f !== T.f) { startJob(t); J = t.job; }   // re-centred mid-build: start again in the new frame (rare: every 10 km)
    var cnt = 0;
    while (J.li < J.lays.length) { var L = J.lays[J.li], n = L.feats.length / 2;
      while (J.fi < n) { var ft = feature(L, J.fi++); try { emit(t, J, L, ft); } catch (e) { stats.lastError = 'feature: ' + (e && e.message || e); }
        if ((++cnt & 7) === 0 && now() > deadline) return false; }
      J.li++; J.fi = 0; }
    finish(t); return true;
  }
  function locRing(t, J, r, E, ll) {   // tile units to the frame's metres, relative to the tile's north-west corner (and, for the listeners, lat/lon)
    var n = r.length / 2, out = new Array(r.length), z = t.z, x = t.x, y = t.y, f = J.f;
    for (var i = 0; i < n; i++) { var g = llOf(z, x, y, r[2 * i], r[2 * i + 1], E), p = W.toLocal(f, g.lat, g.lon); out[2 * i] = p.x - J.ax; out[2 * i + 1] = p.z - J.az; if (ll) { ll[2 * i] = g.lon; ll[2 * i + 1] = g.lat; } }
    return out;
  }
  function H(J, lx, lz) { return T.st.H(J.ax + lx, J.az + lz); }
  function emit(t, J, L, ft) {
    var name = L.name, P = ft.props, E = L.extent;
    if (name === 'poi') { if (J.feed && J.feed.pois && ft.type === 1 && ft.rings[0] && /^(office|cafe|shop|clothing_store|grocery|bakery|ice_cream)$/.test(P['class'])) { var g729 = llOf(t.z, t.x, t.y, ft.rings[0][0], ft.rings[0][1], E); J.feed.pois.push({ id: ft.id, cls: P['class'], sub: P.subclass || null, name: P['name:en'] || P.name_en || P.name || null, lat: g729.lat, lon: g729.lon }); } return; }   /* 729 */
    if (name === 'building') { if (ft.type !== 3 || P.hide_3d) return; var ps = polygons(ft.rings); for (var i = 0; i < ps.length; i++) building(t, J, ps[i], P, ft.id, E); return; }
    if (name === 'transportation') { var cl = P['class']; if (!ROADS[t.z][cl] || ft.type !== 2 || P.brunnel === 'tunnel') return; for (i = 0; i < ft.rings.length; i++) ribbon(J, locRing(t, J, ft.rings[i], E), ROAD_W[cl] * C.WIDEN[t.z], ROAD_C[cl], C.LIFT[t.z], C.SUB[t.z]); J.nR++; if (J.feed) J.feed.roads.push(feedLine(t, ft.rings, E, cl, ROAD_W[cl] * C.WIDEN[t.z])); return; }   /* veg (Nov 4): the listeners hear the roads too (no grass or tree on a road) */
    if (name === 'waterway') { var wc = P['class'], ww = WAY_W[wc]; if (!ww || ft.type !== 2 || (wc === 'stream' && t.z < 14) || P.brunnel === 'tunnel') return; for (i = 0; i < ft.rings.length; i++) ribbon(J, locRing(t, J, ft.rings[i], E), ww * C.WIDEN[t.z], WATER_C, C.LIFT[t.z] * 1.2, C.SUB[t.z]); if (J.feed) J.feed.roads.push(feedLine(t, ft.rings, E, 'water', ww * C.WIDEN[t.z])); return; }
    if (name === 'water') { if (ft.type !== 3) return; ps = polygons(ft.rings);
      for (i = 0; i < ps.length; i++) { if (J.feed) J.feed.water.push(feedPoly(t, J, ps[i], E, P['class'])); if (!WATER_SKIP[P['class']]) { lake(t, J, ps[i], E, ft.id); J.nW++; } } return; }
    if (name === 'place') { var pc = P['class'], nm = P['name:en'] || P.name_en || P.name; if (!PLACE_R[pc] || !nm || ft.type !== 1 || !ft.rings[0]) return; if (t.z === 9 && !(pc === 'city' || pc === 'town' || pc === 'island')) return;
      var g = llOf(t.z, t.x, t.y, ft.rings[0][0], ft.rings[0][1], E); if (ft.rings[0][0] < 0 || ft.rings[0][0] >= E || ft.rings[0][1] < 0 || ft.rings[0][1] >= E) return; J.places.push({ name: String(nm), cls: pc, rank: P.rank || 9, lat: g.lat, lon: g.lon }); return; }
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
  function building(t, J, poly, P, id, E) {
    var outer = locRing(t, J, poly.outer, E), area = 0, n = outer.length / 2; for (var i = 0; i < n; i++) { var j = (i + 1) % n; area += outer[2 * i] * outer[2 * j + 1] - outer[2 * j] * outer[2 * i + 1]; }
    if (Math.abs(area / 2) < C.AREA_MIN) return;
    var rings = [outer]; for (i = 0; i < poly.holes.length; i++) rings.push(locRing(t, J, poly.holes[i], E));
    var gMin = 1e9, gMax = -1e9, gSum = 0; for (i = 0; i < n; i++) { var g = H(J, outer[2 * i], outer[2 * i + 1]); if (g < gMin) gMin = g; if (g > gMax) gMax = g; gSum += g; }
    var gC = gSum / n, h = Math.min(C.H_MAX, +P.render_height > 0 ? +P.render_height : C.H_DEF), mh = +P.render_min_height > 0 ? +P.render_min_height : 0;
    var bot = mh > 0 ? gC + mh : gMin - C.SINK, top = Math.max(gC + h, (mh > 0 ? bot : gMax) + 1.5);
    var rnd = hash((id | 0) ^ (Math.floor(gC * 7) | 0)), tall = h >= 60, col = tall ? GLASS[Math.floor(rnd * GLASS.length)] : WALLS[Math.floor(rnd * WALLS.length)], house = h <= 14 && Math.abs(area / 2) <= 600 && !mh;
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
    if (o.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2)); g.setIndex(o.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(o.i, 1) : new THREE.Uint16BufferAttribute(o.i, 1));
    var m = new THREE.Mesh(g, mat); m.name = name; m.frustumCulled = false; m.matrixAutoUpdate = false; m.renderOrder = order; m.layers.set(C.LAYER); m.castShadow = m.receiveShadow = false; m.userData.tris = o.i.length / 3; return m;
  }
  function finish(t) {
    var J = t.job; disposeMeshes(t); J.wallN = J.wall.p.length / 3;   // the walls that stand on the ground are the first wallN vertices of their mesh, four a wall (two feet, two tops): the guard reads the feet there
    var cells = cellSort(t, J);
    var ms = [meshOf(J.gnd, mats.ground, 'features:ground:' + t.key, -9.39), meshOf(mergeRoofs(J), mats.wall, 'features:walls:' + t.key, -9.385), meshOf(J.roof, mats.roof, 'features:roofs:' + t.key, -9.385)];
    var w = ms[1]; if (w) w.userData.wallN = J.wallN;
    if (cells && ms[0]) { ms[0].material = [mats.ground]; ms[0].userData.cells = cells; ms[0].geometry.addGroup(0, J.gnd.i.length, 0); ms[0].userData.sig = ''; }   // the same material object (the same program), drawn by groups: a coarse cell steps aside where a finer tile stands
    t.meshes = ms.filter(Boolean); t.f = J.f; t.ax = J.ax; t.az = J.az; t.terrZ = J.terrZ; t.places = J.places; t.box = J.terrA; t.nB = J.nB; t.nR = J.nR; t.nW = J.nW; t.lakes = J.lakes || null;
    t.tris = 0; for (var i = 0; i < t.meshes.length; i++) { var m = t.meshes[i]; m.position.set(J.ax, 0, J.az); m.updateMatrix(); m.visible = false; group.add(m); t.tris += m.userData.tris; }
    t.job = null; t.state = 'built'; t.stale = false; stats.built++; stats.buildings += J.nB; stats.roads += J.nR; stats.waters += J.nW;
    if (J.feed) for (i = 0; i < listeners.length; i++) try { listeners[i](t.z, t.x, t.y, J.feed); } catch (e) { stats.lastError = 'listener: ' + (e && e.message || e); }
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
    var W2 = J.wall; if (J.wallUp) append(W2, J.wallUp); if (J.roofFlat) append(W2, J.roofFlat); return W2;
  }
  function append(W2, R) {
    if (!R.i.length) return; var base = W2.p.length / 3;
    for (var i = 0; i < R.p.length; i++) W2.p.push(R.p[i]); for (i = 0; i < R.n.length; i++) W2.n.push(R.n[i]); for (i = 0; i < R.c.length; i++) W2.c.push(R.c[i]); for (i = 0; i < R.uv.length; i++) W2.uv.push(R.uv[i]);
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
      /* the LRU: never what this frame wants */
      if (tiles.size > C.KEPT) { var old = []; tiles.forEach(function (t) { if (t.used !== frameNo && t.state !== 'fetch') old.push(t); }); old.sort(function (a, b) { return a.used - b.used; });
        for (i = 0; i < old.length && tiles.size > C.KEPT; i++) { disposeMeshes(old[i]); old[i].raw = null; old[i].job = null; tiles.delete(old[i].key); stats.evicted++; for (var q = 0; q < droppers.length; q++) try { droppers[q](old[i].z, old[i].x, old[i].y); } catch (e) { /* a listener's own */ } } }
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
