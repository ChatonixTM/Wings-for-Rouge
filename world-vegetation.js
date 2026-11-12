/* world-vegetation.js - REAL FORESTS AND GREENERY (Marth, Nov 4 2026: "Use those 27 agents and BUild me the PLAYABLE FLYABLE WORLD";
   "prioritize accurate and vaast and submersive world building"; "i want this game to be ground breaking. real and submersive"). Trunks, Nov 4 2026.
   Every number DRAFT (unmeasured on her phone).

   Trees where the real world has them, in the travel zone (layer 7):
     - WHERE: the features unit's landcover / landuse polygons (WFR_FEATURES.onTile(cb), cb(z, x, y, { landcover: [{ cls, rings }], landuse: [...],
       water: [...], buildings: [...] })) are drawn into a class mask per feature tile (forest, wood, mangrove, orchard, park, scrub, wetland, grass,
       farmland); water and buildings are cut out of it and widened one cell; the green is narrowed one cell, so a tree never stands on a lake's
       edge, on a roof, or just outside its wood.
     - WHICH: trees.js's own species (pine, fir, krumm, oak, birch, snag: Oct 8's ecology), chosen by latitude (tropical broadleaf, temperate mixed,
       boreal conifers), by height (a tree line falling with latitude, wind-bent krumm under it) and by the class; heights by class and latitude
       (Meta's canopy-height map is CC BY but ships as 1 m GeoTIFF tiles, hundreds of MB: not cheap, so class defaults).
     - HOW MANY: a grid anchored in LAT/LON (stable across the re-centres and any change of map), each point kept by its class's density; NEAR
       (520 m) the full trees.js shapes, MID (to 2.6 km) one cheap cone or crown, FAR a tint painted into the streamed ground's own vertex colours.
     - PLACED THROUGH WFR_WORLD: every tree's spot is WFR_WORLD.toLocal(the streamer's frame, lat, lon) and its foot the streamer's H(): the
       re-centre and the Gleason flip (725b) carry them.
     - COST: ONE shader program for every tree (a Lambert with vertex colours, instancing and instance colours, drawn through the travel zone's
       own shrink-toward-the-eye, the Earth's curve, the Dunn's hole and the haze at true distance, sharing its uniforms); made at load so it
       compiles with everything else; 8 draw calls (6 species near, 2 shapes mid); the tint costs no program and no draw.
   v2 (Nov 4, after Marth: "yo those screen shots are mad emoty bro"): DENSER (9 m near grid, ~110 trees a hectare; 22 m mid grid, fatter crowns);
     the roads come in the feed too (world-features.js feedLine) and are cut out (footpaths only for the grass); town, campus and sand classes;
     WHERE NO DETAILED MAP IS (no z14 tile), the ground's REAL colour (NASA Blue Marble on the streamed sheet, world-imagery.js) plants the forest
     where it is dark green; the selection is SLICED (1.6 ms a frame); and THE GRASS (Marth: "theres no moving grass still"): see below.
   v3 (Nov 5, board 731, fuller forests in the middle distance): Obito capped the full trees at 200 m (C.NEAR) for triangles, which left
     200-480 m thin: the mid grid was 6x sparser AND its hole (cut round where the mid list was chosen, re-chosen every 160 m) ran up to 150 m past
     the near ring ahead of her. Now THE BAND: the near job runs on to C.BAND on the SAME 9 m lattice at the same density and draws the trees past
     C.NEAR as the cheap mid shapes (22-30 triangles, not ~440), so a tree there becomes its full self in the same spot as she nears it; the mid
     list's hole is C.BAND - MOVE_MID - MOVE - 10 (no gap however far she has come since), re-chosen every 80 m, on an 18 m grid; and past C.FALL
     the mid trees thin with distance and grow wider to keep the canopy closed (fewer triangles where the haze hides them).
   It never touches the game: tools/wiring/wire-veg.js hands it THREE, the scene, the renderer and TRAVEL712, and calls tick() each travel frame. */
window.WFR_VEG = (function () {
  'use strict';
  var C = { NEAR: 200, MID: 2600, NEAR_MAX: 7000, MID_MAX: 24000, G_NEAR: 9, G_MID: 18, MOVE: 30, MOVE_MID: 80, BAND: 480, BAND_MAX: 9000, FALL: 1300, FALL_FAT: 1.8, NEAR_AGL: 900, MID_AGL: 3200, SLICE_MS: 1.6, MID_FAT: 1.35, BM_D: 0.6,
    MASK_HI: 256, MASK_LO: 128, MASKS: 96, DIRTY_S: 1.0, ORDER: -9.35, LAYER: 7, SINK: 0.4, SEA: 0.5 };
  var M_LAT = 111320, D2R = Math.PI / 180;
  /* the classes (priority = the number: the forest wins an overlap) */
  var NONE = 0, FARM = 1, GRASS = 2, WET = 3, SCRUB = 4, PARK = 5, ORCH = 6, MANG = 7, FOREST = 8, RES = 9, DEV = 10, BLK = 11;   // BLK: water, a roof, a road, sand or rock (no tree, no blade)
  var PRIO = [0, 3, 5, 7, 6, 4, 8, 9, 10, 2, 1, 99];   // which class wins an overlap: the specific cover (a wood, a lawn, a marsh) over the park it lies in, the park over the town
  var CLS = { forest: FOREST, wood: FOREST, mangrove: MANG, orchard: ORCH, vineyard: ORCH, plant_nursery: ORCH, park: PARK, garden: PARK, cemetery: PARK, grave_yard: PARK,
    recreation_ground: PARK, village_green: PARK, golf_course: PARK, nature_reserve: PARK, zoo: PARK, flowerbed: GRASS, pitch: GRASS, residential: RES, suburb: RES, college: RES, school: RES, university: RES, hospital: RES, library: DEV, playground: DEV, commercial: DEV, industrial: DEV, retail: DEV, railway: DEV, quarry: BLK, sand: BLK, beach: BLK, bare_rock: BLK, rock: BLK, scree: BLK, glacier: BLK, ice: BLK, scrub: SCRUB, heath: SCRUB, shrubbery: SCRUB, grass: GRASS, grassland: GRASS,
    meadow: GRASS, fell: GRASS, allotments: GRASS, farmland: FARM, farm: FARM, farmyard: FARM, wetland: WET, swamp: WET, marsh: WET, bog: WET, wet_meadow: WET };
  var CLS_NAME = ['none', 'farmland', 'grass', 'wetland', 'scrub', 'park', 'orchard', 'mangrove', 'forest', 'residential', 'developed', 'blocked'];
  var DENS = [0, 0.004, 0.015, 0.12, 0.45, 0.22, 0.5, 0.8, 0.9, 0.07, 0, 0];   // the near grid (9 m): forest ~110 trees a hectare, a park's groves, a town's yard trees, a meadow's lone tree
  var DENS_MID = [0, 0, 0, 0.12, 0.3, 0.2, 0.5, 0.8, 0.9, 0.05, 0, 0];   // the mid grid (22 m): no lone field trees out there
  var TINT = [null, [168, 166, 98, 0.28], [104, 150, 70, 0.45], [78, 110, 78, 0.3], [112, 122, 72, 0.32], [84, 136, 62, 0.5], [92, 132, 62, 0.35], [40, 80, 50, 0.6], [42, 80, 40, 0.6]];   // [r, g, b (0..255 like the streamer's tint), mix]
  var PINE = 0, FIR = 1, KRUMM = 2, OAK = 3, BIRCH = 4, SNAG = 5, KINDS = ['pine', 'fir', 'krumm', 'oak', 'birch', 'snag'];

  function hash3(a, b, s) { var h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul((s | 0) + 1, 0x9e3779b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; }
  /* the feed's tiles are web-map tiles in either world mode: their y is read through THE ONE DOOR (725b), never written here. W.tileAt at zoom 30
     is the fraction to 1e-9 (a mask cell is 1/2^22); W.tileLat(0, Y) is its inverse */
  var TZ = 30, TN = Math.pow(2, 30);
  function tileY(W, lat) { var l = Math.max(-85.05112, Math.min(85.05112, lat)); return W.tileAt(l, 0, TZ).y / TN; }   // 0 at the north edge of the web map, 1 at the south
  function treeline(al) { return al < 25 ? 3900 : al < 70 ? 3900 - (al - 25) * 78 : 0; }   // DRAFT: ~3,900 m in the tropics, ~2,300 m in the Alps, ~1,200 m at 60 degrees
  function kindFor(cls, lat, h, u) {
    var al = Math.abs(lat), tl = treeline(al); if (h > tl) return -1;
    var hi = h > tl - 500;
    if (cls === SCRUB) return hi || al > 50 || u < 0.5 ? KRUMM : OAK;
    if (hi) return u < 0.6 ? KRUMM : u < 0.95 ? FIR : SNAG;
    if (cls === MANG) return OAK;
    if (cls === WET) return al > 45 ? (u < 0.5 ? BIRCH : FIR) : (u < 0.7 ? OAK : BIRCH);
    if (cls !== FOREST) return al < 23.5 ? OAK : u < 0.6 ? OAK : u < 0.85 ? BIRCH : PINE;   // parks, orchards, the lone field tree
    if (al < 23.5) return u < 0.78 ? OAK : u < 0.97 ? BIRCH : SNAG;   // tropical broadleaf (no pines in Jamaica's hills)
    if (al < 35) return u < 0.45 ? OAK : u < 0.8 ? PINE : u < 0.92 ? BIRCH : u < 0.98 ? FIR : SNAG;
    if (al < 50) return u < 0.38 ? OAK : u < 0.62 ? PINE : u < 0.78 ? FIR : u < 0.95 ? BIRCH : SNAG;
    return u < 0.5 ? FIR : u < 0.8 ? PINE : u < 0.96 ? BIRCH : SNAG;   // boreal
  }
  function heightFor(cls, lat, h) {   // metres, before the jitter (class defaults: DRAFT)
    var al = Math.abs(lat), m = cls === FOREST ? (al < 23.5 ? 26 : al < 50 ? 22 : 17) : cls === MANG ? 8 : cls === WET ? 11 : cls === ORCH ? 6 : cls === SCRUB ? 3 : 14;
    return h > treeline(al) - 500 ? m * 0.55 : m;
  }

  /* ═════════ THE CORE (no THREE: the masks, the class lookup, the selection into plain arrays; node runs it as the page does) ═════════ */
  function makeCore(W) {
    var masks = new Map(), zooms = [], last = null, box = null, stats = { tiles: 0, evicted: 0, rasterMs: 0, bad: 0, roads: 0 }, hitZ = -1;   // hitZ: the zoom of the mask the last lookup read (-1: none)
    function keyOf(z, x, y) { return (z * 65536 + x) * 65536 + y; }
    function ringsOf(e) {
      var R = e.rings || e.coordinates || (e.ring ? [e.ring] : []); if (!R || !R.length) return [];
      if (Array.isArray(R[0]) && Array.isArray(R[0][0]) && Array.isArray(R[0][0][0])) { var o = []; for (var i = 0; i < R.length; i++) for (var j = 0; j < R[i].length; j++) o.push(R[i][j]); return o; }   // a multipolygon
      return R;
    }
    function toPx(ring, z, x, y, M, ext) {   // a ring to the mask's cells: [lon, lat] pairs, a flat [lon, lat, ...] list, {lat, lon} objects, or tile units when the feed names its extent
      var n = Math.pow(2, z), out = [], k, a, b, flat = typeof ring[0] === 'number', cnt = flat ? ring.length >> 1 : ring.length;
      for (k = 0; k < cnt; k++) {
        if (flat) { a = ring[2 * k]; b = ring[2 * k + 1]; } else if (Array.isArray(ring[k])) { a = ring[k][0]; b = ring[k][1]; } else { a = ring[k].lon; b = ring[k].lat; }
        if (ext) out.push(a / ext * M, b / ext * M); else out.push(((a + 180) / 360 * n - x) * M, (tileY(W, b) * n - y) * M);
      }
      return out;
    }
    function fill(rings, M, grid, val, prio) {   // even-odd scanline over every ring of ONE feature (its holes stay open); a cell is in when its centre is
      var E = [], minY = 1e9, maxY = -1e9, i, r;
      for (r = 0; r < rings.length; r++) { var p = rings[r], n = p.length >> 1; for (i = 0; i < n; i++) { var j = (i + 1) % n, y0 = p[2 * i + 1], y1 = p[2 * j + 1]; if (y0 === y1) continue; E.push(p[2 * i], y0, p[2 * j], y1); if (y0 < minY) minY = y0; if (y1 < minY) minY = y1; if (y0 > maxY) maxY = y0; if (y1 > maxY) maxY = y1; } }
      if (!E.length) return; var rA = Math.max(0, Math.floor(minY)), rB = Math.min(M - 1, Math.ceil(maxY)), xs = [];
      for (var row = rA; row <= rB; row++) {
        var yc = row + 0.5; xs.length = 0;
        for (i = 0; i < E.length; i += 4) { var ya = E[i + 1], yb = E[i + 3]; if ((ya <= yc) !== (yb <= yc)) xs.push(E[i] + (yc - ya) * (E[i + 2] - E[i]) / (yb - ya)); }
        if (xs.length < 2) continue; xs.sort(function (a, b) { return a - b; });
        for (var k = 0; k + 1 < xs.length; k += 2) { var a = Math.max(0, Math.ceil(xs[k] - 0.5)), b = Math.min(M - 1, Math.ceil(xs[k + 1] - 0.5) - 1), q = row * M;
          for (var c = a; c <= b; c++) { if (!prio || PRIO[grid[q + c]] < PRIO[val]) grid[q + c] = val; } }
      }
    }
    function m0lat(z, y) { return W.tileLat(z, y + 0.5); }
    function hasBlkNear(blk, M, q) { var j = (q / M) | 0, i = q - j * M; for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) { var jj = j + dj, ii = i + di; if (jj >= 0 && ii >= 0 && jj < M && ii < M && blk[jj * M + ii]) return true; } return false; }
    function stroke(p, M, grid, r) {   // a road's line into the mask: every cell whose centre is within r cells of a segment
      var n = p.length >> 1, R = Math.ceil(r);
      for (var k = 0; k + 1 < n; k++) { var ax = p[2 * k], ay = p[2 * k + 1], bx = p[2 * k + 2], by = p[2 * k + 3], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
        var i0 = Math.max(0, Math.floor(Math.min(ax, bx) - R)), i1 = Math.min(M - 1, Math.ceil(Math.max(ax, bx) + R)), j0 = Math.max(0, Math.floor(Math.min(ay, by) - R)), j1 = Math.min(M - 1, Math.ceil(Math.max(ay, by) + R));
        for (var jj = j0; jj <= j1; jj++) for (var ii = i0; ii <= i1; ii++) { var cx = ii + 0.5, cy = jj + 0.5, t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / L2)), ex = ax + dx * t - cx, ey = ay + dy * t - cy; if (ex * ex + ey * ey <= r * r) grid[jj * M + ii] = 1; } }
    }
    function ingest(z, x, y, d) {
      var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now()), M = z >= 14 ? C.MASK_HI : C.MASK_LO, cls = new Uint8Array(M * M), blk = new Uint8Array(M * M), ext = d && d.extent, i, j, k;
      var lists = [d && d.landcover, d && d.landuse, d && d.park];
      var spk772 = (window.WFR_LANDCLASS && window.WFR_LANDCLASS.live && window.WFR_LANDCLASS.live()) ? new Uint8Array(M * M) : null, QUIET772 = { military: 1, neighbourhood: 1, quarter: 1, suburb: 1 };   // 772a: the cells the map has SPOKEN for with a word the vegetation does not know (landuse = stadium ...): the fill plants nothing there. QUIET772: outlines that are NOT ground cover (the land of an army, the name of a neighbourhood): the fill plants in them by the class NASA gives, as where the map is silent
      for (k = 0; k < lists.length; k++) { var L = lists[k]; if (!L) continue; for (i = 0; i < L.length; i++) { var e = L[i], nm = String(e.subclass || e.cls || e['class'] || '').toLowerCase(), v = CLS[nm];
        if (!v && e.cls && e.subclass) v = CLS[String(e.cls).toLowerCase()];
        if (!v) { if (spk772 && QUIET772[nm] !== 1 && QUIET772[String(e.cls || '').toLowerCase()] !== 1) { try { fill(ringsOf(e).map(function (rg) { return toPx(rg, z, x, y, M, ext); }), M, spk772, 1, false); } catch (err) { stats.bad++; } } continue; } try { fill(ringsOf(e).map(function (rg) { return toPx(rg, z, x, y, M, ext); }), M, v === BLK ? blk : cls, v === BLK ? 1 : v, v !== BLK); } catch (err) { stats.bad++; } } }
      var B = [d && d.water, d && d.buildings];
      for (k = 0; k < B.length; k++) { if (!B[k]) continue; for (i = 0; i < B[k].length; i++) { try { fill(ringsOf(B[k][i]).map(function (rg) { return toPx(rg, z, x, y, M, ext); }), M, blk, 1, false); } catch (err) { stats.bad++; } } }
      var RD = d && d.roads, cell = 40075016.7 * Math.cos(m0lat(z, y) * D2R) / Math.pow(2, z) / M, road = new Uint8Array(M * M), foot = new Uint8Array(M * M);   // cell: a mask cell's size in metres (at the tile's middle)
      var AW772 = d && d.aeroway; if (AW772) for (i = 0; i < AW772.length; i++) { try { var a772 = AW772[i]; if (a772.lines) { for (j = 0; j < a772.lines.length; j++) stroke(toPx(a772.lines[j], z, x, y, M, ext), M, blk, (a772.width || 25) / 2 / cell + 0.71); } else fill(ringsOf(a772).map(function (rg) { return toPx(rg, z, x, y, M, ext); }), M, (spk772 && (a772.cls === 'aerodrome' || a772.cls === 'heliport')) ? spk772 : blk, 1, false); } catch (err) { stats.bad++; } }   // 772a: runways, taxiways and aprons are pavement (blocked, with the margin); an aerodrome's own outline is spoken for
      if (RD) for (i = 0; i < RD.length; i++) { var rd = RD[i], wd = rd.width || 6, isW = rd.cls === 'water', thin = !isW && wd <= 3.2, rr = thin ? 0.5 : wd / 2 / cell + 0.71;   // a footpath marks only the cells it crosses, and only for the grass (a canopy over a path is real)
        for (j = 0; j < (rd.lines || []).length; j++) { try { stroke(toPx(rd.lines[j], z, x, y, M, ext), M, isW ? blk : thin ? foot : road, rr); } catch (err) { stats.bad++; } } stats.roads++; }
      var out = new Uint8Array(M * M), edge = z >= 14;   // a detailed tile's green is narrowed one cell at its edges (a tree never stands just outside its wood); a coarse one's is not (its cells are 50 m+)
      for (j = 0; j < M; j++) for (i = 0; i < M; i++) {
        var q = j * M + i, v2 = cls[q]; if (blk[q] || road[q]) { out[q] = BLK; continue; } if (!v2) { if ((spk772 && spk772[q]) || (edge && hasBlkNear(blk, M, q))) out[q] = BLK; continue; } var keep = 1;
        for (var dj = -1; dj <= 1 && keep; dj++) for (var di = -1; di <= 1; di++) { var jj = j + dj, ii = i + di; if (jj < 0 || ii < 0 || jj >= M || ii >= M) continue; var qq = jj * M + ii; if (blk[qq]) { keep = 0; break; } if (edge && !cls[qq] && !road[qq]) { keep = 2; break; } }
        out[q] = keep === 1 ? v2 : keep === 0 ? BLK : NONE;   // beside water or a roof: known bare; at a wood's edge: nothing
        if (out[q] && out[q] !== BLK && foot[q]) out[q] |= 128;   // the path flag (grass only)
      }
      var n = Math.pow(2, z), m = { z: z, x: x, y: y, M: M, cls: out, X0: x / n, X1: (x + 1) / n, Y0: y / n, Y1: (y + 1) / n, n: n, lat0: W.tileLat(z, y + 1), lat1: W.tileLat(z, y), lon0: x / n * 360 - 180, lon1: (x + 1) / n * 360 - 180 };
      var key = keyOf(z, x, y); masks.delete(key); masks.set(key, m);
      while (masks.size > C.MASKS) { var old = masks.keys().next().value; masks.delete(old); stats.evicted++; }
      reindex(); stats.tiles++; stats.rasterMs = Math.max(stats.rasterMs, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
      return m;
    }
    var byZ = [];   // per zoom: [z, n, Map(x * 2^z + y -> mask)] (small integer keys: a fast lookup)
    function reindex() {
      var zs = {}; box = null; last = null; byZ = [];
      masks.forEach(function (m) { zs[m.z] = 1; if (!box) box = [m.lat0, m.lat1, m.lon0, m.lon1]; else { box[0] = Math.min(box[0], m.lat0); box[1] = Math.max(box[1], m.lat1); box[2] = Math.min(box[2], m.lon0); box[3] = Math.max(box[3], m.lon1); } });
      zooms = Object.keys(zs).map(Number).sort(function (a, b) { return b - a; });
      zooms.forEach(function (z) { byZ.push([z, Math.pow(2, z), new Map()]); });
      masks.forEach(function (m) { for (var i = 0; i < byZ.length; i++) if (byZ[i][0] === m.z) byZ[i][2].set(m.x * m.n + m.y, m); m.finer = false; });
      masks.forEach(function (m) { masks.forEach(function (f2) { if (f2.z > m.z && f2.X0 >= m.X0 && f2.X1 <= m.X1 && f2.Y0 >= m.Y0 && f2.Y1 <= m.Y1) m.finer = true; }); });   // a coarse mask with a finer one inside is never the fast path
    }
    var hitPath = false;
    function sample(m, X, Y) { var M = m.M, px = Math.min(M - 1, Math.max(0, Math.floor((X * m.n - m.x) * M))), py = Math.min(M - 1, Math.max(0, Math.floor((Y * m.n - m.y) * M))), v = m.cls[py * M + px]; hitPath = v >= 128; return v & 127; }
    function classAtXY(X, Y) {
      if (last && !last.finer && X >= last.X0 && X < last.X1 && Y >= last.Y0 && Y < last.Y1) { hitZ = last.z; return sample(last, X, Y); }
      for (var i = 0; i < byZ.length; i++) { var n = byZ[i][1], m = byZ[i][2].get(Math.floor(X * n) * n + Math.floor(Y * n)); if (m) { last = m; hitZ = m.z; return sample(m, X, Y); } }
      hitZ = -1; hitPath = false; return NONE;
    }
    function classAt(lat, lon) { if (!zooms.length) return NONE; return classAtXY((lon + 180) / 360, tileY(W, lat)); }
    function overlaps(a0, a1, o0, o1) { return !!box && a1 >= box[0] && a0 <= box[1] && o1 >= box[2] && o0 <= box[3]; }

    /* THE SELECTION: rows of a lat/lon grid outward from her row (a cap cuts the farthest rows, never a side), each point jittered by its own hash.
       SLICED (Nov 4): begin() sets a job up, step(job, ms) runs rows until its time is spent; the caller shows the old trees until the job is done.
       WHERE NO DETAILED MAP IS (no z14 mask: the open world, Tahoe's hills, Jamaica's): the ground's own real colour (NASA Blue Marble, painted on the
       streamed sheet by world-imagery.js) says where it is green, dark green the forest: o.bm(x, z) -> 0..1 (the forest's share there), null when unknown */
    function begin(o) {   // o: { level 0 near | 1 mid, cam {x, z}, frame, H(x, z), R0, put(kind, ...), bm(x, z) }
      var near = o.level === 0, G = near ? C.G_NEAR : C.G_MID, R = o.R || (near ? C.BAND : C.MID), f = o.frame, ll = W.toLatLon(f, o.cam.x, o.cam.z), latStep = G / M_LAT;
      return { o: o, near: near, G: G, R: R, R0: o.R0 || 0, Rs2: near ? C.NEAR * C.NEAR : Infinity, F2: near ? Infinity : C.FALL * C.FALL, cap: o.cap || (near ? C.NEAR_MAX : C.MID_MAX), capB: o.cap || C.BAND_MAX, nb: 0, salt: near ? 11 : 29, Dn: near ? DENS : DENS_MID, f: f, ll: ll, latStep: latStep, rc: Math.floor(ll.lat / latStep), nr: Math.ceil(R / G) + 1, q: 0, total: 0, cand: 0, bm: 0, done: false };
    }
    function step(J, ms) {
      var o = J.o, t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now()), R2 = J.R * J.R, R02 = J.R0 * J.R0, ll = J.ll, f = J.f, G = J.G, latStep = J.latStep, Dn = J.Dn, salt = J.salt, nrow = 0;
      for (; J.q <= 2 * J.nr; J.q++) {
        if (ms != null && (nrow++ & 1) === 0 && (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0 > ms) return false;
        var q = J.q, r = J.rc + ((q & 1) ? (q + 1) >> 1 : -(q >> 1)), latC = (r + 0.5) * latStep, cosr = Math.cos(latC * D2R); if (cosr < 0.01) continue;
        var dzRow = (latC - ll.lat) * M_LAT; if (Math.abs(dzRow) > J.R + G) continue;
        var lonStep = G / (M_LAT * cosr), half = Math.sqrt(Math.max(0, (J.R + G) * (J.R + G) - dzRow * dzRow)) / (M_LAT * cosr), c0 = Math.floor((ll.lon - half) / lonStep), c1 = Math.ceil((ll.lon + half) / lonStep);
        var Yc = tileY(W, latC), dY = -D2R / (2 * Math.PI * cosr);   // the web map's y along this row, to first order (a row is 9-22 m tall: the error is far under a mask cell)
        for (var c = c0; c <= c1; c++) {
          var h0 = hash3(r, c, salt), lat = (r + 0.5 + (((h0 & 1023) / 1023) - 0.5) * 0.8) * latStep, lon = (c + 0.5 + ((((h0 >>> 10) & 1023) / 1023) - 0.5) * 0.8) * lonStep;
          var dx = (lon - ll.lon) * M_LAT * cosr, dz = (lat - ll.lat) * M_LAT, d2 = dx * dx + dz * dz; if (d2 > R2 || d2 < R02) continue;
          var bnd = d2 >= J.Rs2, sz = 1; if (bnd ? J.nb >= J.capB : J.total >= J.cap) continue;   // the band (the near lattice past C.NEAR): its own cap
          if (d2 > J.F2) { var kf = J.F2 / d2; if (hash3(r, c, salt + 3) / 4294967296 >= kf) continue; sz = Math.min(C.FALL_FAT, 1 / Math.sqrt(kf)); }   // past C.FALL: fewer, wider (the canopy stays closed in the haze)
          var hk = ((h0 >>> 20) & 4095) / 4096; if (hk >= 0.9) continue;   // no class keeps a point past the forest's own density: skip the lookup
          J.cand++; var cls = zooms.length ? classAtXY((lon + 180) / 360, Yc + dY * (lat - latC)) : NONE, p = null, viaBm = false;
          if (cls === BLK) continue;
          var f772 = 0, lf772 = 0, hf772 = 1; if (cls === NONE) { var L772 = window.WFR_LANDCLASS, v772 = L772 ? L772.tree((lon + 180) / 360, Yc + dY * (lat - latC), r, c) : 0; if (v772) { if (hk >= Dn[v772] * L772.k) continue; cls = v772; f772 = L772.last; lf772 = L772.leaf; hf772 = L772.h; } }   // 772a: where the map is silent, NASA's yearly land cover class decides (world-landclass772.js); the map still wins wherever it speaks
          if (cls === NONE) {   // no class here: a detailed map (z14) means nothing grows; else the real colour decides
            if ((zooms.length && hitZ >= 14) || !o.bm) continue;
            p = W.toLocal(f, lat, lon); var fr = o.bm(p.x, p.z); if (!fr || hk >= fr * C.BM_D * (J.near ? 1 : 0.9)) continue; cls = FOREST; viaBm = true;
          } else if (hk >= Dn[cls]) continue;
          if (!p) p = W.toLocal(f, lat, lon); var gy = o.H(p.x, p.z); if (gy < C.SEA) continue;   // the coarse ground says sea here: no tree on the water
          var h1 = hash3(r, c, salt + 7), u = (h1 & 65535) / 65536, kind = kindFor(cls, lat, gy, u); if (kind < 0) continue;
          var ht = heightFor(cls, lat, gy) * (0.75 + ((h1 >>> 16) & 255) / 255 * 0.45), yaw = ((h1 >>> 24) & 255) / 256 * Math.PI * 2;
          if (f772) { var M772 = window.WFR_LANDCLASS; if (lf772) kind = M772.kind(kind, lf772, u, lat); ht *= hf772; M772.kept(f772); }   // 772a: the leaf the land cover names (needle or broad), its height, and the count the guard reads
          o.put(kind, p.x, gy - C.SINK, p.z, yaw, ht, h0, h1, lat, cls, sz, bnd);
          if (viaBm) J.bm++;
          if (bnd) J.nb++; else J.total++; if (J.total >= J.cap && (!J.near || J.nb >= J.capB)) { J.done = true; return true; }
        }
      }
      J.done = true; return true;
    }
    function select(o) { var J = begin(o); step(J, null); return { total: J.total, band: J.nb, cand: J.cand, bm: J.bm }; }
    return { ingest: ingest, classAt: classAt, classAtXY: function (X, Y) { return zooms.length ? classAtXY(X, Y) : NONE; }, hitZ: function () { return hitZ; }, hitPath: function () { return hitPath; }, select: select, begin: begin, step: step, masks: masks, overlaps: overlaps, stats: stats, zooms: function () { return zooms.slice(); }, box: function () { return box && box.slice(); } };
  }

  /* ═════════ THE LOOK (THREE r128): the species merged trunk + crown (absolute vertex colours; the instance colour a near-white variation), one material ═════════ */
  function srgb(THREE, hex, lin) { var c = new THREE.Color(hex); if (lin) c.convertSRGBToLinear(); return c; }
  function merge(THREE, parts) {   // parts: [[BufferGeometry (non-indexed, colour = a shade), THREE.Color]] -> one geometry: position, normal, colour (shade x colour)
    var P = [], N = [], Cc = [];
    parts.forEach(function (pt) { var g = pt[0].index ? pt[0].toNonIndexed() : pt[0], p = g.attributes.position, n = g.attributes.normal, s = g.attributes.color, k = pt[1];
      for (var i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); var sh = s ? [s.getX(i), s.getY(i), s.getZ(i)] : [1, 1, 1]; Cc.push(sh[0] * k.r, sh[1] * k.g, sh[2] * k.b); } });
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
    geo.computeBoundingBox(); geo.computeBoundingSphere(); return geo;
  }
  function shaded(THREE, geo, y0, y1, lo, hi) {   // a cheap shape's shade: dark beneath, lit on top (trees.js's canopyShade, simplified)
    var g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); var p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (var i = 0; i < p.count; i++) { var t = Math.max(0, Math.min(1, (p.getY(i) - y0) / (y1 - y0))), s = lo + (hi - lo) * t; c[i * 3] = s; c[i * 3 + 1] = s; c[i * 3 + 2] = s * 0.96; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
  }
  var CROWN = [0x2f6235, 0x2c5e45, 0x3b5f3c, 0x4f9142, 0x8dbb4c, 0];
  function speciesGeos(THREE, renderer, lin) {
    var specs = KINDS.map(function (k, i) { return { x: i * 60, z: 0, s: 1, y: 0 }; });
    var res = WFR_TREES.plant(THREE, specs, { renderer: renderer, kindOf: function (sp, i) { return KINDS[i]; }, understory: false, shadows: false, wind: 0, fruitEvery: 0 });
    var G = {}; res.meshes.forEach(function (m) { G[m.name.replace('trees:', '')] = m.geometry; });   // the shared species geometry (never disposed: the island's forest draws it)
    var bark = (WFR_TREES.palettes && WFR_TREES.palettes.bark) || { pine: 0x7a5638, oak: 0x6f4c32, birch: 0xffffff, snag: 0xa79e92, krumm: 0x6a5442 };
    var B = function (k) { var c = srgb(THREE, bark[k], lin); if (BAR761 && k !== 'birch' && k !== 'snag') { c.r *= 0.58; c.g *= 0.64; c.b *= 0.74; } return c; }, K = function (i) { return srgb(THREE, CROWN[i], lin); };
    var out = [merge(THREE, [[G.woodStraight, B('pine')], [G.pine, K(PINE)]]), merge(THREE, [[G.woodStraight, B('pine')], [G.fir, K(FIR)]]), merge(THREE, [[G.woodBent, B('krumm')], [G.krumm, K(KRUMM)]]),
      merge(THREE, [[G.woodOak, B('oak')], [G.oak, K(OAK)]]), merge(THREE, [[G.woodBirch, B('birch')], [G.birch, K(BIRCH)]]), merge(THREE, [[G.woodSnag, B('snag')]])];
    var tops = out.map(function (g) { return g.boundingBox.max.y; });   // trap 115: a declared size is not the geometry; the top is read from the built box
    return { geos: out, tops: tops, tris: out.map(function (g) { return g.attributes.position.count / 3; }) };
  }
  function midGeos(THREE, lin) {
    var cone = shaded(THREE, new THREE.ConeGeometry(2.1, 6.4, 7, 1, true).translate(0, 4.2, 0), 1.0, 7.4, 0.42, 1.05), stem = shaded(THREE, new THREE.CylinderGeometry(0.22, 0.38, 1.4, 4, 1, true).translate(0, 0.7, 0), 0, 1.4, 0.6, 0.8);
    var blob = shaded(THREE, new THREE.IcosahedronGeometry(1, 0).scale(2.8, 2.2, 2.8).translate(0, 5.0, 0), 2.8, 7.2, 0.45, 1.05), trunk = shaded(THREE, new THREE.CylinderGeometry(0.26, 0.42, 3.2, 5, 1, true).translate(0, 1.6, 0), 0, 3.2, 0.6, 0.85);
    if (BAR761) { var pb = blob.attributes.position, nb = blob.attributes.normal; for (var ib = 0; ib < pb.count; ib++) { var qx = pb.getX(ib), qy = pb.getY(ib) - 5.0, qz = pb.getZ(ib), ql = Math.hypot(qx, qy, qz) || 1; nb.setXYZ(ib, qx / ql, qy / ql, qz / ql); } }   // 761b: rounded light on the same 20 triangles
    var g0 = merge(THREE, [[stem, srgb(THREE, 0x7a5638, lin)], [cone, srgb(THREE, CROWN[PINE], lin)]]), g1 = merge(THREE, [[trunk, srgb(THREE, 0x6f4c32, lin)], [blob, srgb(THREE, CROWN[OAK], lin)]]);
    return { geos: [g0, g1], tops: [g0.boundingBox.max.y, g1.boundingBox.max.y] };
  }
  function makeMaterial(THREE, u) {   // the travel zone's far pass for INSTANCES: its shrink toward the eye, the Earth's curve, the Dunn's hole, the haze at true distance
    var REFR = (window.WFR_TRAVEL712 && WFR_TRAVEL712.C && WFR_TRAVEL712.C.REFR) || 7432843, NL = String.fromCharCode(10);
    var m = new THREE.MeshLambertMaterial({ vertexColors: true }); m.name = 'veg:trees';
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uEyeVeg = u.uEye; sh.uniforms.uInvKVeg = u.uInvK; sh.uniforms.uHoleVeg = u.uHole;
      sh.vertexShader = 'uniform vec3 uEyeVeg; uniform float uInvKVeg; varying vec2 vWVeg;' + NL + sh.vertexShader.replace('#include <project_vertex>', [
        'vec4 wpVeg = vec4( transformed, 1.0 );', '#ifdef USE_INSTANCING', '  wpVeg = instanceMatrix * wpVeg;', '#endif', 'wpVeg = modelMatrix * wpVeg;', 'vWVeg = wpVeg.xz;',
        'vec3 rVeg = wpVeg.xyz - uEyeVeg; float dVeg = length( rVeg.xz );', 'rVeg.y -= dVeg * dVeg / ( 2.0 * ' + REFR.toFixed(1) + ' );', 'wpVeg.xyz = uEyeVeg + rVeg * uInvKVeg;',
        'vec4 mvPosition = viewMatrix * wpVeg;', 'gl_Position = projectionMatrix * mvPosition;'].join(NL))
        .replace('#include <fog_vertex>', '#include <fog_vertex>' + NL + '#ifdef USE_FOG' + NL + '  fogDepth /= uInvKVeg;' + NL + '#endif');
      if (BAR761) sh.vertexShader = sh.vertexShader.replace('#include <lights_lambert_vertex>', '#include <lights_lambert_vertex>' + NL + '  vLightFront += lightProbe[ 0 ] * vec3( 0.82, 1.13, 0.75 );'); sh.fragmentShader = 'uniform vec4 uHoleVeg; varying vec2 vWVeg;' + NL + sh.fragmentShader.replace('void main() {', 'void main() {' + NL + '  if ( vWVeg.x > uHoleVeg.x && vWVeg.x < uHoleVeg.z && vWVeg.y > uHoleVeg.y && vWVeg.y < uHoleVeg.w ) discard;');
    };
    m.customProgramCacheKey = function () { return 'wfrveg1'; };
    return m;
  }

  /* ═════════ THE GRASS (Marth, Nov 4 2026, verbatim: "theres no moving grass still"; boards 687 / 691, deferred till now) ═════════
     Blades in clumps round her (to ~110 m: full to 28 m, thinning to a tenth at the edge, the far clumps a little larger), on the island's meadow and
     on the real world's grass, meadow, park, farmland and lawns (the masks above), and where no detailed map is, where the real colour is green
     (Blue Marble). Never on water, a road, a roof, sand or rock (BLK), nor on the island's beach, dunes, rock and snow. The sway: ONE time uniform in
     the vertex shader (a slow gust rolling across the field + a flutter), its strength the game's weather (calm to storm); ONE program for both
     places (two materials, one key, one compile at load). Clumps are made per 16 m chunk (anchored in lat/lon out there: the re-centres carry them),
     a few chunks a frame within a time budget, nearest first; the drawn list is put together from the chunks' rank-sorted lists. */
  var GC = { CH: 16, SP: 1.0, R: 110, FULL: 24, THIN: 0.1, CAP: 16000, BUILD_MS: 1.0, VEG_MS: 2.2, ASM_EVERY: 4, AGL: 140, BLADES: 6, H: 0.8, LAYER_ONLY: 30 };
  var BAR761 = (function () { try { return !(window.WFR_DOOR && window.WFR_DOOR.classic) && localStorage.getItem('wfr.bar') !== 'off'; } catch (e) { return !(window.WFR_DOOR && window.WFR_DOOR.classic); } })();   // 761b THE BAR: Classic is frozen; 'off' is the state before it
  if (BAR761) { GC.SP = 0.65; GC.THIN = 0.03; }   // 761b: the clumps closer together (0.65 m apart, was 1 m: 2.4 times as many where she stands). The game's reach (110 m), full ring (24 m) and cap (16,000 clumps) are KEPT, so the ring falls away faster to fit the same count (V13): thicker than before out to about 46 m, thinner beyond (46 to 70 m: 3,693 clumps against 5,554; 70 to 110 m: 1,151 against 4,481). The shade sheet's 3,200 triangles are a plain cost (9,600 with the fog's two sheets, held back)
  function fr761(dist) { return dist < GC.FULL ? 1 : GC.THIN + (1 - GC.THIN) * Math.pow(1 - Math.min(1, (dist - GC.FULL) / (GC.R - GC.FULL)), 4); }   // 761b: the share of clumps shown at a distance (the ring's rule, written once)
  function barColour761() { return ['vec2 uvB = ( iPos.xz - uBarC.xy ) * uBarC.z + 0.5; float shB = texture2D( uBarTex, uvB ).r * uBarC.w * ( 1.0 - smoothstep( 0.40, 0.5, max( abs( uvB.x - 0.5 ), abs( uvB.y - 0.5 ) ) ) );',
    'float pA = sin( iPos.x * 0.062 + sin( iPos.z * 0.044 ) * 1.7 ) * cos( iPos.z * 0.053 + sin( iPos.x * 0.039 ) * 1.9 ), pB = sin( iPos.x * 0.117 + iPos.z * 0.073 + pA * 2.0 ), lightB = smoothstep( -0.42, 0.62, pA + pB * 0.28 );',
    'float upB = clamp( position.y / ' + GC.H.toFixed(3) + ', 0.0, 1.0 ); vec3 tipB = mix( vec3( 0.22, 0.50, 0.24 ), vec3( 0.60, 0.82, 0.46 ), lightB * ( 1.0 - shB ) );',
    'vec3 colB = mix( vec3( 0.05, 0.17, 0.10 ), tipB, pow( upB, 1.4 ) ) * mix( vec3( 1.0 ), vec3( 0.40, 0.50, 0.58 ), shB );', 'vColor.xyz = colB * iSc.yzw;'].join(String.fromCharCode(10)); }
  var GD = [0, 0.55, 1, 0.8, 0.5, 0.9, 0.8, 0, 0.35, 0.45, 0, 0];   // a class's grass: the forest floor thin, the town's lawns, no blade in a mangrove or a car park
  /* SU39 THE FAR GRASS (Marth, Nov 12 2026, verbatim: "in that screenshot the grass doesnt look loaded passed 100 meters"; Nov 11: "all grass within 1000 m"). On the island, past the
     near field: clumps of three single-triangle blades on a 2 m grid, from IN0 out to R (the far clumps larger, thinning past THIN0), built once for the whole island
     (nearest squares first, within a time budget) and re-listed as she moves. The island's near grass's own material (the season's tint and the sway are its own), one
     more draw; a far clump carries a NEGATIVE scale, which the shader reads to grow it in past the near ring and sink it at its own edge. Every number DRAFT. */
  var FAR39 = (function () { try { return !(window.WFR_DOOR && window.WFR_DOOR.classic) && localStorage.getItem('wfr.bar') !== 'off' && localStorage.getItem('wfr.far39') !== 'off'; } catch (e) { return false; } })();   // its own switch: 'wfr.far39' = 'off' is the game without it; Classic is frozen
  var GF = { CH: 32, SP: 2.0, IN0: 52.0, IN1: 76.0, R: 280.0, THIN0: 150, KEEP: 0.45, CAP: 36000, SC: 1.7, MOVE: 6, BUILD_MS: 4, FIRST_MS: 60, AGL: 320 };
  var GCOL = [[0.95, 1, 0.9], [1.18, 1.05, 0.62], [1, 1, 1], [0.8, 0.95, 0.85], [1.02, 0.95, 0.72], [0.95, 1.06, 0.95], [1, 1, 0.88], [1, 1, 1], [0.76, 0.86, 0.74], [0.95, 1.02, 0.9]];
  function grassGeo(THREE, lin) {   // one clump: BLADES blades of three triangles (two segments and a tip), dark at the root, lit at the tip; every normal up
    var P = [], Cc = [], N = [], base = srgb(THREE, 0x6a9a3e, lin);
    for (var b = 0; b < GC.BLADES; b++) {
      var h = hash3(b, 3, 91), a = b / GC.BLADES * Math.PI * 2 + ((h & 255) / 255 - 0.5), rr = 0.05 + ((h >>> 8) & 255) / 255 * 0.28, bx = Math.cos(a) * rr, bz = Math.sin(a) * rr;
      var ht = GC.H * (0.6 + ((h >>> 16) & 255) / 255 * 0.45), fa = ((h >>> 24) & 255) / 255 * Math.PI, sx = Math.cos(fa), sz = Math.sin(fa), w = (0.035 + (b % 3) * 0.01) * (BAR761 ? 1.1 : 1), ln = 0.12 + (b % 2) * 0.1;
      var la = BAR761 ? fa * 2 : a, Lx = bx + Math.cos(la) * ln * ht, Lz = bz + Math.sin(la) * ln * ht;   // the tip, leaning outward
      var v = [[bx - sx * w, 0, bz - sz * w], [bx + sx * w, 0, bz + sz * w], [bx + (Lx - bx) * 0.3 - sx * w * 0.7, ht * 0.55, bz + (Lz - bz) * 0.3 - sz * w * 0.7], [bx + (Lx - bx) * 0.3 + sx * w * 0.7, ht * 0.55, bz + (Lz - bz) * 0.3 + sz * w * 0.7], [Lx, ht, Lz]];
      var sh = [0.5, 0.5, 0.82, 0.82, 1.12], tri = [[0, 1, 3], [0, 3, 2], [2, 3, 4]];
      for (var t = 0; t < 3; t++) for (var k = 0; k < 3; k++) { var q = tri[t][k]; P.push(v[q][0], v[q][1], v[q][2]); N.push(0, 1, 0); Cc.push(base.r * sh[q], base.g * sh[q], base.b * sh[q] * 0.95); }
    }
    var g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
    return g;
  }
  function grassMat(THREE, GU, own) {   // GU: the shared clock, strength and direction; own: this place's eye, shrink and hole (the island's: none)
    var REFR = (window.WFR_TRAVEL712 && WFR_TRAVEL712.C && WFR_TRAVEL712.C.REFR) || 7432843, NL = String.fromCharCode(10);
    var m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }); m.name = 'veg:grass';
    m.onBeforeCompile = function (sh) {
      if (BAR761) { sh.uniforms.uBarTex = GU.uBarTex; sh.uniforms.uBarC = GU.uBarC; sh.uniforms.uHerG = GU.uHerG; } sh.uniforms.uGrassT = GU.uGrassT; sh.uniforms.uGrassW = GU.uGrassW; sh.uniforms.uGrassDir = GU.uGrassDir; sh.uniforms.uEyeG = own.uEye; sh.uniforms.uInvKG = own.uInvK; sh.uniforms.uHoleG = own.uHole;
      sh.vertexShader = (BAR761 ? 'uniform sampler2D uBarTex; uniform vec4 uBarC; uniform vec3 uHerG;' + NL : '') + 'attribute vec4 iPos; attribute vec4 iSc; uniform float uGrassT; uniform float uGrassW; uniform vec2 uGrassDir; uniform vec3 uEyeG; uniform float uInvKG; varying vec2 vWG;' + NL + sh.vertexShader
        .replace('#include <color_vertex>', '#include <color_vertex>' + NL + (BAR761 ? barColour761() : 'vColor.xyz *= iSc.yzw;'))
        .replace('#include <begin_vertex>', ['float cG = cos( iPos.w ), sG = sin( iPos.w ); vec3 pG = position * iSc.x;' + (BAR761 ? ' float eG = length( iPos.xz - uHerG.xy ), farG = step( iSc.x, 0.0 ); pG = position * abs( iSc.x ); pG.xz *= 1.0 + 1.5 * smoothstep( 16.0, 96.0, eG ); pG.y *= mix( 1.0 - smoothstep( ' + (GC.R - 30).toFixed(1) + ', ' + GC.R.toFixed(1) + ', eG ), smoothstep( ' + GF.IN0.toFixed(1) + ', ' + GF.IN1.toFixed(1) + ', eG ) * ( 1.0 - smoothstep( ' + (GF.R - 40).toFixed(1) + ', ' + GF.R.toFixed(1) + ', eG ) ), farG );' : ''),   /* SU39: at the ring's edge the blades sink into the ground (the ground is their colour), never pop */ 'vec3 transformed = vec3( cG * pG.x + sG * pG.z, pG.y, -sG * pG.x + cG * pG.z );',
          'float phG = dot( iPos.xz, vec2( 0.071, 0.053 ) ), hG = position.y / ' + GC.H.toFixed(3) + ';', 'float swG = ( sin( uGrassT * 1.7 - phG ) * 0.6 + sin( uGrassT * 4.3 + phG * 2.3 ) * 0.22 + 0.45 ) * uGrassW;',
          'transformed.xz += uGrassDir * ( swG * hG * hG * pG.y * 1.6 ); transformed.y -= swG * swG * hG * hG * pG.y * 0.5;' + (BAR761 ? NL + 'vec2 awG = iPos.xz - uHerG.xy; float puG = uHerG.z * smoothstep( 3.4, 0.5, eG ); transformed.xz += ( awG / max( eG, 0.2 ) ) * ( puG * hG * hG * pG.y * 1.5 ); transformed.y -= puG * hG * pG.y * 0.62; vColor.xyz *= 1.0 + 0.55 * swG * hG;' : ''), 'transformed += iPos.xyz;'].join(NL))
        .replace('#include <project_vertex>', ['vec4 wpG = modelMatrix * vec4( transformed, 1.0 ); vWG = wpG.xz;', 'vec3 rG = wpG.xyz - uEyeG; float dG = length( rG.xz );', 'rG.y -= dG * dG / ( 2.0 * ' + REFR.toFixed(1) + ' );', 'wpG.xyz = uEyeG + rG * uInvKG;',
          'vec4 mvPosition = viewMatrix * wpG;', 'gl_Position = projectionMatrix * mvPosition;'].join(NL))
        .replace('#include <lights_lambert_vertex>', '#include <lights_lambert_vertex>' + NL + '#ifdef DOUBLE_SIDED' + NL + '  vLightBack = vLightFront;' + NL + '#endif')
        .replace('#include <fog_vertex>', '#include <fog_vertex>' + NL + '#ifdef USE_FOG' + NL + '  fogDepth /= uInvKG;' + NL + '#endif');
      sh.fragmentShader = 'uniform vec4 uHoleG; varying vec2 vWG;' + NL + sh.fragmentShader.replace('void main() {', 'void main() {' + NL + '  if ( vWG.x > uHoleG.x && vWG.x < uHoleG.z && vWG.y > uHoleG.y && vWG.y < uHoleG.w ) discard;');
    };
    m.customProgramCacheKey = function () { return 'wfrgrass1'; };
    return m;
  }

  /* ═════════ THE GAME'S SIDE ═════════ */
  var S = null;   // the one attached state
  function attach(THREE, scene, renderer, TR, opts) {
    if (S) return S.api; if (!window.WFR_TREES || !window.WFR_WORLD || !TR || !TR.u) return null; opts = opts || {};
    var lin = !!(renderer && renderer.outputEncoding === THREE.sRGBEncoding), W = window.WFR_WORLD, core = makeCore(W), u = TR.u;
    if (!u.uHole) u.uHole = { value: new THREE.Vector4(1, 1, -1, -1) };   // world712-travel's makeMaterial makes the same (the Dunn's hole); whichever runs first, one object
    var sp = speciesGeos(THREE, renderer, lin), md = midGeos(THREE, lin), mat = makeMaterial(THREE, u), group = new THREE.Group(); group.name = 'veg712';
    function mk(geo, cap, name) { var im = new THREE.InstancedMesh(geo, mat, cap); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); im.instanceColor.setUsage(THREE.DynamicDrawUsage);
      im.count = 0; im.frustumCulled = false; im.renderOrder = C.ORDER; im.layers.set(C.LAYER); im.name = name; im.castShadow = false; im.receiveShadow = false; group.add(im); return im; }
    var near = sp.geos.map(function (g, i) { return mk(g, C.NEAR_MAX, 'veg:near:' + KINDS[i]); }), mid = md.geos.map(function (g, i) { return mk(g, C.MID_MAX, 'veg:mid:' + (i ? 'crown' : 'cone')); }), band = md.geos.map(function (g, i) { return mk(g, C.BAND_MAX, 'veg:band:' + (i ? 'crown' : 'cone')); });
    scene.add(group);   // in the scene from load (always visible, counts 0): the island's camera never sees layer 7, and renderer.compile reaches it with everything else
    /* instance colours: a near-white variation per tree, the tropics a deeper green, the palettes of trees.js as ratios to each species' base */
    var PAL = WFR_TREES.palettes || {}, ratios = KINDS.map(function (k, i) { var base = CROWN[i] ? srgb(THREE, CROWN[i], lin) : null, list = (PAL[k] || []).map(function (h) { var c = srgb(THREE, h, lin); return base ? [c.r / base.r, c.g / base.g, c.b / base.b] : [1, 1, 1]; });
      return list.length ? list.map(function (r) { return [Math.min(1.6, r[0]), Math.min(1.6, r[1]), Math.min(1.6, r[2])]; }) : [[1, 1, 1]]; });
    var TROP = lin ? [0.62, 0.85, 0.55] : [0.8, 0.92, 0.75];
    var stage = [near.map(function () { return { m: new Float32Array(C.NEAR_MAX * 16), c: new Float32Array(C.NEAR_MAX * 3) }; }), mid.map(function () { return { m: new Float32Array(C.MID_MAX * 16), c: new Float32Array(C.MID_MAX * 3) }; }), band.map(function () { return { m: new Float32Array(C.BAND_MAX * 16), c: new Float32Array(C.BAND_MAX * 3) }; })];
    var st = { near: near, mid: mid, n: [0, 0, 0, 0, 0, 0], nm: [0, 0], nb: [0, 0], at: [null, null], sn: [[0, 0, 0, 0, 0, 0], [0, 0], [0, 0]], jobs: [null, null], lastF: null, nc: null, mc: null, lastKey: null, dirty: false, tDirty: -9, clock: 0, sub: null, subs: 0, tick: [], selMs: [0, 0], selMax: [0, 0], sels: [0, 0], fault: null, tintQ: new Map(), tinted: 0, tintMs: 0, cand: [0, 0], bm: [0, 0], agl: null, onTiles: 0, shifts: 0, tImz: 0, frames: [0, 0], wind: 0 };
    function put(level0) { return function (kind, x, y, z, yaw, ht, h0, h1, lat, cls, sz, bnd) { var level = bnd ? 2 : level0;   // 2: the band, drawn as the mid shapes
      var mi = level === 0 ? kind : (kind === PINE || kind === FIR || kind === KRUMM ? 0 : 1), sg = stage[level][mi], cnt = st.sn[level], k = cnt[mi]++;
      var top = level === 0 ? sp.tops[mi] : md.tops[mi], s = ht / top, w = s * (0.9 + ((h0 >>> 8) & 255) / 255 * 0.25) * (level !== 0 ? C.MID_FAT : cls === FOREST ? 1.12 : 1) * (sz || 1), c = Math.cos(yaw), sn = Math.sin(yaw), a = sg.m, o = k * 16;
      a[o] = c * w; a[o + 1] = 0; a[o + 2] = -sn * w; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = s; a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = sn * w; a[o + 9] = 0; a[o + 10] = c * w; a[o + 11] = 0; a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
      var R = ratios[kind], rr = R[(h1 >>> 3) % R.length], b = 0.88 + ((h0 >>> 4) & 255) / 255 * 0.24, tr = Math.abs(lat) < 23.5 && kind !== SNAG ? TROP : null, ic = sg.c, oc = k * 3;
      ic[oc] = rr[0] * b * (tr ? tr[0] : 1); ic[oc + 1] = rr[1] * b * (tr ? tr[1] : 1); ic[oc + 2] = rr[2] * b * (tr ? tr[2] : 1);
    }; }
    function flush(list, counts) { for (var i = 0; i < list.length; i++) { var m = list[i], n = counts[i]; m.count = n; m.instanceMatrix.updateRange.offset = 0; m.instanceMatrix.updateRange.count = n * 16; m.instanceMatrix.needsUpdate = true; m.instanceColor.updateRange.offset = 0; m.instanceColor.updateRange.count = n * 3; m.instanceColor.needsUpdate = true; } }
    function commit(level) { var list = level === 0 ? near : level === 1 ? mid : band, cnt = level === 0 ? st.n : level === 1 ? st.nm : st.nb; for (var i = 0; i < list.length; i++) { var n = st.sn[level][i]; cnt[i] = n; list[i].instanceMatrix.array.set(stage[level][i].m.subarray(0, n * 16)); list[i].instanceColor.array.set(stage[level][i].c.subarray(0, n * 3)); } flush(list, cnt); if (level === 0) commit(2); }
    function start(level, cam, f, H, R0) { for (var i = 0; i < st.sn[level].length; i++) st.sn[level][i] = 0; if (level === 0) st.sn[2][0] = st.sn[2][1] = 0; st.jobs[level] = { J: core.begin({ level: level, cam: { x: cam.x, z: cam.z }, frame: f, H: H, R0: R0, put: put(level), bm: bmForest }), ms: 0, frames: 0 }; }
    function work(level, ms) { var jb = st.jobs[level]; if (!jb) return 0; var t0 = performance.now(); core.step(jb.J, ms); var dt = performance.now() - t0; jb.ms += dt; jb.frames++;
      if (jb.J.done) { commit(level); st.at[level] = { x: jb.J.o.cam.x, z: jb.J.o.cam.z }; st.cand[level] = jb.J.cand; st.bm[level] = jb.J.bm; st.selMs[level] = jb.ms; if (jb.ms > st.selMax[level]) st.selMax[level] = jb.ms; st.sels[level]++; st.frames[level] = jb.frames; st.jobs[level] = null; } return dt; }
    function clear(level) { st.jobs[level] = null; if (level === 0) { for (var i = 0; i < 6; i++) st.n[i] = 0; flush(near, st.n); st.nb[0] = st.nb[1] = 0; flush(band, st.nb); } else { st.nm[0] = st.nm[1] = 0; flush(mid, st.nm); } }
    function shift(list, cnt, dx, dz) { for (var i = 0; i < list.length; i++) { var a = list[i].instanceMatrix.array; for (var k = 0; k < cnt[i]; k++) { a[k * 16 + 12] += dx; a[k * 16 + 14] += dz; } } flush(list, cnt); }

    /* the real colour under a point (world-imagery.js's drape on the streamed sheet): null where it is not painted yet or is the sea */
    var bmRec = null;
    function bmColour(x, z) {
      var s2 = TR.st; if (!s2) return null; var r = bmRec, b = r && r.b;
      if (!r || !r.mesh || !s2.tiles.has(r.key) || x < b.x0 || x >= b.x0 + b.size || z < b.z0 || z >= b.z0 + b.size) { var pr = s2.probe(x, z); r = pr ? s2.tiles.get(pr.key) : null; bmRec = r; if (!r || !r.mesh) return null; b = r.b; }
      if (!r.im712 || r.im712.z < 0 || !r.hv) return null; var N = WFR_TRAVEL712.C.GRID, i = Math.max(0, Math.min(N, Math.round((x - b.x0) / b.size * N))), j = Math.max(0, Math.min(N, Math.round((z - b.z0) / b.size * N))), q = j * (N + 1) + i;
      if (r.hv[q] <= 0) return null; var a = (r.vegCol0 && r.vegImz === r.im712.z) ? r.vegCol0 : r.mesh.geometry.attributes.color.array; return [a[q * 3], a[q * 3 + 1], a[q * 3 + 2]];
    }
    function bmForest(x, z) { var c = bmColour(x, z); if (!c) return 0; var lum = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2], gr = c[1] - Math.max(c[0], c[2]); return Math.max(0, Math.min(1, gr / 0.05)) * Math.max(0, Math.min(1, (0.38 - lum) / 0.12)); }
    function bmGrass(x, z) { var c = bmColour(x, z); if (!c) return 0; var lum = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2], gr = c[1] - Math.max(c[0], c[2] * 1.05); return lum > 0.65 ? 0 : Math.max(0, Math.min(1, (gr + 0.01) / 0.04)); }

    /* the features feed: subscribed when it is there (and again if the page's WFR_FEATURES is replaced) */
    function subscribe() { var F = window.WFR_FEATURES; if (!F || F === st.sub || typeof F.onTile !== 'function') return; st.sub = F; st.subs++;
      F.onTile(function (z, x, y, d) { try { var m = core.ingest(z, x, y, d || {}); st.dirty = true; queueTints(m); if (GT) GT.stale = true; } catch (e) { st.fault = 'ingest: ' + (e && e.message || e); } }); }

    /* THE FAR TINT: the streamed ground's own vertex colours, mixed toward the class's green where the masks know it (no program, no draw) */
    function tileBox(rec) { if (!rec.vegBox) rec.vegBox = [W.tileLat(rec.z, rec.y + 1), W.tileLat(rec.z, rec.y), W.tileLon(rec.z, rec.x), W.tileLon(rec.z, rec.x + 1)]; return rec.vegBox; }
    function queueTints(m) { if (!TR.st) return; TR.st.tiles.forEach(function (rec, k) { if (!rec.mesh) return; var b = tileBox(rec); if (b[1] >= m.lat0 && b[0] <= m.lat1 && b[3] >= m.lon0 && b[2] <= m.lon1) st.tintQ.set(k, rec); }); }
    function tint(rec) {   // grid point (i, j) of a streamed sheet IS web-map point (x + i/N, y + j/N) at zoom z (world712-travel.js build(), both modes)
      if (!rec.mesh || !TR.st.tiles.has(rec.key)) return; var t0 = performance.now(), geo = rec.mesh.geometry, col = geo.attributes.color, a = col.array, N = WFR_TRAVEL712.C.GRID, V = (N + 1) * (N + 1), b = tileBox(rec), n = Math.pow(2, rec.z);
      var imz = rec.im712 ? rec.im712.z : -2; if (!rec.vegCol0 || rec.vegImz !== imz) { rec.vegCol0 = a.slice(0, V * 3); rec.vegImz = imz; }   // the photo repainted it since: that is the base now
      var c0 = rec.vegCol0, hv = rec.hv, any = false;
      if (!core.overlaps(b[0], b[1], b[2], b[3])) { if (rec.vegTinted) { a.set(c0); col.needsUpdate = true; rec.vegTinted = false; } return; }
      for (var q = 0; q < V; q++) { var o = q * 3; a[o] = c0[o]; a[o + 1] = c0[o + 1]; a[o + 2] = c0[o + 2]; if (hv && hv[q] <= 0) continue;
        var cls = core.classAtXY((rec.x + (q % (N + 1)) / N) / n, (rec.y + Math.floor(q / (N + 1)) / N) / n), T = TINT[cls]; if (!T) continue;
        var k = T[3]; a[o] += (T[0] / 255 - a[o]) * k; a[o + 1] += (T[1] / 255 - a[o + 1]) * k; a[o + 2] += (T[2] / 255 - a[o + 2]) * k; any = true; }
      col.needsUpdate = true; rec.vegTinted = any; if (any) st.tinted++; st.tintMs = Math.max(st.tintMs, performance.now() - t0);
    }
    TR.layers.push({ id: 'veg', onTile: function (rec) { st.onTiles++; st.tintQ.set(rec.key, rec); }, onDrop: function (rec) { st.tintQ.delete(rec.key); } });   // the streamer's layer hooks (world712-travel.js opts.layers); after the imagery's, so the photo is painted first
    if (window.WFR_LANDCLASS) window.WFR_LANDCLASS.onArrive(function () { st.dirty = true; if (GT) GT.stale = true; });   // 772a: a land cover tile came: the trees and the grass round her are chosen again

    /* ═════ THE GRASS FIELDS: one out there (lat/lon chunks), one on the island (local chunks) ═════ */
    var GU = { uGrassT: { value: 0 }, uGrassW: { value: 0.3 }, uGrassDir: { value: new THREE.Vector2(0.8, 0.6) }, uBarTex: { value: null }, uBarC: { value: new THREE.Vector4(0, 0, 1 / 224, 0) }, uHerG: { value: new THREE.Vector3() } }, gGeo = grassGeo(THREE, lin), GT = null;
    function field(name, layer, own) {
      var g = new THREE.InstancedBufferGeometry(); ['position', 'normal', 'color'].forEach(function (k) { g.setAttribute(k, gGeo.attributes[k]); });
      var aP = new THREE.InstancedBufferAttribute(new Float32Array(GC.CAP * 4), 4), aS = new THREE.InstancedBufferAttribute(new Float32Array(GC.CAP * 4), 4); aP.setUsage(THREE.DynamicDrawUsage); aS.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('iPos', aP); g.setAttribute('iSc', aS); g.instanceCount = 0; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
      var m = new THREE.Mesh(g, grassMat(THREE, GU, own)); m.name = name; m.frustumCulled = false; m.layers.set(layer); m.layers.enable(GC.LAYER_ONLY); m.castShadow = false; m.receiveShadow = false; m.matrixAutoUpdate = false; scene.add(m);
      return { mesh: m, geo: g, aP: aP, aS: aS, chunks: new Map(), n: 0, key: null, built: 0, rebuilt: 0, buildMs: 0, buildMax: 0, stale: false, f: null, asm: 0, want: [], need: false };
    }
    GT = field('veg:grass:travel', C.LAYER, { uEye: u.uEye, uInvK: u.uInvK, uHole: u.uHole }); if (BAR761) GT.mesh.renderOrder = C.ORDER + 0.02;
    var GI = field('veg:grass:island', 0, { uEye: { value: new THREE.Vector3() }, uInvK: { value: 1 }, uHole: { value: new THREE.Vector4(1, 1, -1, -1) } });
    var ISL = opts.island || null;
    var GFI = null;   /* SU39: the far grass (the island only) */
    if (FAR39 && ISL && String(grassMat).indexOf('farG') > 0) { var fP = [], fN = [], fC = [], fb = srgb(THREE, 0x6a9a3e, lin);
      for (var fb0 = 0; fb0 < 3; fb0++) { var fa = fb0 / 3 * Math.PI * 2 + 0.4, fr = 0.18, fx = Math.cos(fa) * fr, fz = Math.sin(fa) * fr, fs = fa + Math.PI / 2, fw = 0.075, fh = GC.H * (0.8 + 0.12 * fb0), lx = fx + Math.cos(fa) * 0.18 * fh, lz = fz + Math.sin(fa) * 0.18 * fh;
        var fv = [[fx - Math.cos(fs) * fw, 0, fz - Math.sin(fs) * fw, 0.5], [fx + Math.cos(fs) * fw, 0, fz + Math.sin(fs) * fw, 0.5], [lx, fh, lz, 1.12]];
        for (var fk = 0; fk < 3; fk++) { fP.push(fv[fk][0], fv[fk][1], fv[fk][2]); fN.push(0, 1, 0); fC.push(fb.r * fv[fk][3], fb.g * fv[fk][3], fb.b * fv[fk][3] * 0.95); } }
      var fg = new THREE.InstancedBufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fP, 3)); fg.setAttribute('normal', new THREE.Float32BufferAttribute(fN, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(fC, 3));
      var faP = new THREE.InstancedBufferAttribute(new Float32Array(GF.CAP * 4), 4), faS = new THREE.InstancedBufferAttribute(new Float32Array(GF.CAP * 4), 4); faP.setUsage(THREE.DynamicDrawUsage); faS.setUsage(THREE.DynamicDrawUsage);
      fg.setAttribute('iPos', faP); fg.setAttribute('iSc', faS); fg.instanceCount = 0; fg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
      var fm = new THREE.Mesh(fg, GI.mesh.material); fm.name = 'veg:grass:island:far'; fm.frustumCulled = false; fm.layers.set(0); fm.layers.enable(GC.LAYER_ONLY); fm.castShadow = false; fm.receiveShadow = false; fm.matrixAutoUpdate = false; scene.add(fm);
      GFI = { mesh: fm, geo: fg, aP: faP, aS: faS, chunks: [], made: false, next: 0, n: 0, key: null, built: 0, buildMs: 0, asm: 0, asmMs: 0 }; }
    function islandDens(x, z) {   // the island's meadow band (the terrain painter's: over the beach, under the rock), never the dunes, the village's trodden green or a floor
      var I = ISL, h = I.H(x, z); if (h < I.water + 1.4 || h > 24) return 0;
      if (I.dunes && I.dunes.at && Math.hypot(x - I.dunes.at.x, z - I.dunes.at.z) < (I.dunes.r || 45) + 6) return 0;
      if (I.village && Math.hypot(x - I.village.x, z - I.village.z) < 24) return 0;
      if (I.groundAt && floorNear) { try { if (I.groundAt(x, z) > h + 0.05) return 0; } catch (e) { /* a floor test that throws: the meadow */ } }
      return 1;
    }
    var floorNear = true;
    function floorsIn(ch) {   // any floor (a house, a deck) over the chunk? 25 reads, so the 256 candidates skip the page's floor walk where there is none
      if (!ISL.groundAt) return false; for (var j = 0; j <= 4; j++) for (var i = 0; i <= 4; i++) { var x = ch.x0 + ch.ax * i / 4 + ch.bx * j / 4, z = ch.z0 + ch.az * i / 4 + ch.bz * j / 4; try { if (ISL.groundAt(x, z) > ISL.H(x, z) + 0.05) return true; } catch (e) { return true; } }
      return false;
    }
    function buildChunk(F, ch, geo) {   // every candidate on a jittered 0.8 m grid in the chunk, kept by its class's (or the island's) grass, sorted by its rank
      var t0 = performance.now(), n = Math.round(GC.CH / GC.SP), out = [], f = geo ? geo.f : null, H = geo ? geo.H : ISL.H, salt = geo ? 77 : 78;
      var cv761 = new Uint8Array(16), cut761b = BAR761 ? fr761(Math.max(0, (ch.dist || 0) - GC.CH - 24)) : 2, cbm = geo ? bmGrass(ch.cx, ch.cz) : 0; if (!geo) floorNear = floorsIn(ch);   // the real colour at the chunk's middle (the photo is ~600 m a pixel: one read a chunk)
      for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
        var h0 = hash3(ch.i * 64 + i, ch.j * 64 + j, salt), rank = ((h0 >>> 20) & 4095) / 4096, ju = ((h0 & 1023) / 1023 - 0.5) * 0.9, jv = (((h0 >>> 10) & 1023) / 1023 - 0.5) * 0.9;
        if (rank >= cut761b) continue; var a = (i + 0.5 + ju) / n, b = (j + 0.5 + jv) / n, x = ch.x0 + ch.ax * a + ch.bx * b, z = ch.z0 + ch.az * a + ch.bz * b, dens, cls = -1;
        if (geo) { var X = ch.X0 + ch.aX * a + ch.bX * b, Y = ch.Y0 + ch.aY * a + ch.bY * b; cls = core.classAtXY(X, Y); if (cls === BLK || core.hitPath()) continue;
          if (cls === NONE) { var G772 = window.WFR_LANDCLASS, g772 = G772 ? G772.grass(X, Y, ch.i * 64 + i, ch.j * 64 + j) : 0; if (g772) { if (rank >= GD[g772] * G772.gk) continue; cls = g772; } }   // 772a: the grass asks the same map where the masks are silent
          if (cls === NONE) { if (core.hitZ() >= 14) continue; dens = cbm; } else dens = GD[cls]; }
        else dens = islandDens(x, z);
        if (rank >= dens) continue;
        var y = H(x, z); if (geo && y < 1.0) continue;   // the sea and the beach's last metre
        var h1 = hash3(ch.i * 64 + i, ch.j * 64 + j, salt + 1), sc = 0.8 + (h1 & 255) / 255 * 0.45, vv = 0.88 + ((h1 >>> 8) & 255) / 255 * 0.24, K = cls >= 0 && cls < GCOL.length ? GCOL[cls] : [1, 1, 1];
        if (!geo) { var nz = Math.sin(x * 0.021 + Math.cos(z * 0.017) * 2.1) * Math.cos(z * 0.019 + Math.sin(x * 0.013) * 1.7); K = nz > 0.25 ? [1.12, 1.04, 0.7] : nz < -0.3 ? [0.82, 0.96, 0.8] : [1, 1, 1]; }   // the island's dry and lush patches (its painter's noise)
        cv761[Math.max(0, Math.min(3, (b * 4) | 0)) * 4 + Math.max(0, Math.min(3, (a * 4) | 0))]++; out.push([rank, x, y - 0.04, z, ((h1 >>> 16) & 1023) / 1023 * 6.2832, sc, K[0] * vv, K[1] * vv, K[2] * vv]);
      }
      out.sort(function (p, q) { return p[0] - q[0]; });
      var d = new Float32Array(out.length * 9); for (var k = 0; k < out.length; k++) d.set(out[k], k * 9);
      ch.d = d; ch.cv = cv761; ch.cut = Math.min(1, cut761b); ch.bd = ch.dist || 0; ch.n = out.length; ch.stale = false; ch.f = f; var ms = performance.now() - t0; F.buildMs += ms; if (ms > F.buildMax) F.buildMax = ms; F.built++;
    }
    function chunksNear(F, cam, geo) {   // the chunks whose middle is within R + a chunk of her: lat/lon cells out there, local squares on the island
      var list = [], R = GC.R + GC.CH;
      if (!geo) { var ci = Math.floor(cam.x / GC.CH), cj = Math.floor(cam.z / GC.CH), nr = Math.ceil(R / GC.CH);
        for (var j = cj - nr; j <= cj + nr; j++) for (var i = ci - nr; i <= ci + nr; i++) { var cx = (i + 0.5) * GC.CH, cz = (j + 0.5) * GC.CH, d = Math.hypot(cx - cam.x, cz - cam.z); if (d > R) continue;
          var k = i + ',' + j, ch = F.chunks.get(k); if (!ch) { ch = { k: k, i: i, j: j, x0: i * GC.CH, z0: j * GC.CH, ax: GC.CH, az: 0, bx: 0, bz: GC.CH, cx: cx, cz: cz, d: null, n: 0 }; F.chunks.set(k, ch); } ch.dist = d; list.push(ch); }
      } else { var f = geo.f, ll = W.toLatLon(f, cam.x, cam.z), dl = GC.CH / M_LAT, rc = Math.floor(ll.lat / dl), nr2 = Math.ceil(R / GC.CH);
        for (var r = rc - nr2; r <= rc + nr2; r++) { var la0 = r * dl, la1 = la0 + dl, cs = Math.cos((la0 + dl / 2) * D2R), dn = GC.CH / (M_LAT * cs), c0 = Math.floor(ll.lon / dn);
          for (var c = c0 - nr2 - 1; c <= c0 + nr2 + 1; c++) { var lo0 = c * dn, k2 = r + ':' + c, ch2 = F.chunks.get(k2);
            if (!ch2 || ch2.f !== f) { var p00 = W.toLocal(f, la1, lo0), p10 = W.toLocal(f, la1, lo0 + dn), p01 = W.toLocal(f, la0, lo0);   // the chunk's north-west corner and its two edges (a = east, b = south)
              var old = ch2; ch2 = { k: k2, i: r, j: c, x0: p00.x, z0: p00.z, ax: p10.x - p00.x, az: p10.z - p00.z, bx: p01.x - p00.x, bz: p01.z - p00.z, X0: (lo0 + 180) / 360, aX: dn / 360, bX: 0, Y0: tileY(W, la1), aY: 0, bY: tileY(W, la0) - tileY(W, la1), d: null, n: 0, f: f };
              ch2.cx = ch2.x0 + (ch2.ax + ch2.bx) / 2; ch2.cz = ch2.z0 + (ch2.az + ch2.bz) / 2;
              if (old && old.d && old.f) { var q0 = W.toLatLon(old.f, old.cx, old.cz), q1 = W.toLocal(f, q0.lat, q0.lon), ddx = q1.x - old.cx, ddz = q1.z - old.cz, dd = old.d; for (var t = 0; t < old.n; t++) { dd[t * 9 + 1] += ddx; dd[t * 9 + 3] += ddz; } ch2.d = dd; ch2.cv = old.cv; ch2.cut = old.cut; ch2.bd = old.bd; ch2.n = old.n; ch2.stale = true; }   // re-centred: carried by the shift, rebuilt soon
              F.chunks.set(k2, ch2); }
            var d2 = Math.hypot(ch2.cx - cam.x, ch2.cz - cam.z); if (d2 > R) continue; ch2.dist = d2; list.push(ch2); } }
      }
      list.sort(function (p, q) { return p.dist - q.dist; }); return list;
    }
    function assemble(F, cam) {   // the drawn list: each chunk's rank-sorted clumps up to the share its distance allows (the far clumps a little larger)
      var P = F.aP.array, Sx = F.aS.array, n = 0, R2 = GC.R * GC.R;
      for (var c = 0; c < F.want.length && n < GC.CAP; c++) { var ch = F.want[c]; if (!ch.d) continue; var d = ch.d, cut761 = BAR761 ? fr761(Math.max(0, Math.hypot(ch.cx - cam.x, ch.cz - cam.z) - GC.CH)) : 2;
        for (var k = 0; k < ch.n && n < GC.CAP; k++) { var o = k * 9; if (d[o] >= cut761) break; var dx = d[o + 1] - cam.x, dz = d[o + 3] - cam.z, r2 = dx * dx + dz * dz; if (r2 > R2) continue;
          var dist = Math.sqrt(r2), fr = BAR761 ? fr761(dist) : dist < GC.FULL ? 1 : Math.max(GC.THIN, 1 - (dist - GC.FULL) / (GC.R - GC.FULL) * (1 - GC.THIN)); if (d[o] >= fr) continue;
          var up = Math.min(BAR761 ? 1.2 : 1.6, Math.pow(1 / fr, 0.35)); P[n * 4] = d[o + 1]; P[n * 4 + 1] = d[o + 2]; P[n * 4 + 2] = d[o + 3]; P[n * 4 + 3] = d[o + 4]; Sx[n * 4] = d[o + 5] * up; Sx[n * 4 + 1] = d[o + 6]; Sx[n * 4 + 2] = d[o + 7]; Sx[n * 4 + 3] = d[o + 8]; n++; } }
      F.n = n; F.geo.instanceCount = n; F.aP.updateRange.offset = 0; F.aP.updateRange.count = n * 4; F.aP.needsUpdate = true; F.aS.updateRange.offset = 0; F.aS.updateRange.count = n * 4; F.aS.needsUpdate = true; F.asm++;
    }
    var GH = { hold: false };   // the bench's hold: no chunk made and no list re-made while it is on (its motion test: only the wind moves the blades)
    function grassTick(F, cam, agl, geo, budget) {
      if (GH.hold) return;
      if (agl > GC.AGL) { if (F.n) { F.n = 0; F.geo.instanceCount = 0; } F.key = null; return; }
      var key = Math.floor(cam.x / 8) + ',' + Math.floor(cam.z / 8);
      if (key !== F.key || (geo && geo.f !== F.f)) { F.key = key; F.f = geo ? geo.f : null; F.want = chunksNear(F, cam, geo); F.need = true;
        if (F.chunks.size > F.want.length * 3) { var keep = new Set(F.want.map(function (c) { return c.k; })); F.chunks.forEach(function (c, k) { if (!keep.has(k)) F.chunks.delete(k); }); } }
      if (F.stale) { F.stale = false; F.want.forEach(function (c) { if (c.d) c.stale = true; }); } if (BAR761) for (var w761 = 0; w761 < F.want.length; w761++) { var c761 = F.want[w761]; if (c761.d && c761.cut < 1 && c761.dist < c761.bd - 16) c761.stale = true; }
      var t0 = performance.now(), any = false;
      if (budget == null || budget >= 0) { var unb39 = 0; for (var u39 = 0; u39 < F.want.length; u39++) if (!F.want[u39].d) unb39++; if (unb39 > 6 && unb39 > F.want.length * 0.2) { budget = 90; F.need = true; F.fills39 = (F.fills39 || 0) + 1; } }   // SU39 (Marth, Nov 11: "i also dont like how it takes so long/ not much of the grass is already generated"): a field mostly unmade (the game's start, a jump, a landing far off) is made whole in one frame, not over two seconds
      outer: for (var pass = (budget != null && budget < 0) ? 2 : 0; pass < 2; pass++) for (var i = 0; i < F.want.length; i++) { var ch = F.want[i]; if (pass === 0 ? ch.d : !ch.stale) continue; var c0 = performance.now(); buildChunk(F, ch, geo); any = true; if (pass) F.rebuilt++; var c1 = performance.now(); if (c1 - t0 + (BAR761 ? c1 - c0 : 0) > (budget == null ? GC.BUILD_MS : budget)) break outer; }
      F.since = (F.since || 0) + 1; var late = performance.now() - t0 > (budget == null ? GC.BUILD_MS : budget) * 0.7 && !F.need && F.since < 12;   // a frame already spent: the list waits a frame (never longer than her own move)
      if (late && (any || F.pend)) { F.pend = true; return; }
      if (F.need || (any && F.since >= GC.ASM_EVERY)) { F.need = false; F.since = 0; assemble(F, cam); } else if (any) F.pend = true; else if (F.pend && F.since >= GC.ASM_EVERY) { F.pend = false; F.since = 0; assemble(F, cam); }   // the drawn list re-made at most every few frames while chunks come in (her own move re-makes it at once)
    }
    function windNow() { var w = 0; try { w = opts.wind ? +opts.wind() || 0 : 0; } catch (e) { w = 0; } return Math.max(0, Math.min(1, w)); }
    function grassClock(dt) { var w = windNow(); GU.uGrassT.value += (dt || 0) * (0.8 + w * 1.4); GU.uGrassW.value = 0.12 + w * 0.5; st.wind = w; }

    var probeAt = [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40], [300, 0], [-300, 0], [0, 300], [0, -300], [1500, 0], [-1500, 0], [0, 1500], [0, -1500]], probeH = null;
    function groundMoved(cam, H, fc) {   // which of her lists stand on ground that changed: 1 the grass (her 40 m), 2 the trees (to 1.5 km); a new frame: both
      var h = probeAt.map(function (q) { return H(cam.x + q[0], cam.z + q[1]); }), old = probeH, out = 0; probeH = h; if (!old || fc) return 3;
      for (var i = 0; i < h.length; i++) if (Math.abs(h[i] - old[i]) > 0.05) out |= i < 5 ? 3 : 2;
      return out;
    }
    function tick(cam, dt) {   // each travel frame, after the streamer's update (the frame and the ground are this frame's)
      var t0 = performance.now();
      try {
        subscribe(); var stt = TR.st; if (!stt || !TR.on) return; st.clock += dt || 0; grassClock(dt);
        var f = stt.frame(), H = stt.H, g = H(cam.x, cam.z), agl = cam.y - g, key = stt.stats.built + '/' + stt.stats.evicted; st.agl = agl;
        var fc = f !== st.lastF, nearOn = agl < C.NEAR_AGL, midOn = agl < C.MID_AGL;
        if (fc && st.lastF) { var ll = W.toLatLon(f, cam.x, cam.z), pa = W.toLocal(f, ll.lat, ll.lon), pb = W.toLocal(st.lastF, ll.lat, ll.lon), dx = pa.x - pb.x, dz = pa.z - pb.z;   // re-centred: the trees drawn move with the ground until the new lists are done
          shift(near, st.n, dx, dz); shift(mid, st.nm, dx, dz); shift(band, st.nb, dx, dz); st.at.forEach(function (q) { if (q) { q.x += dx; q.z += dz; } }); st.shifts++; st.jobs = [null, null]; if (st.nc) { st.nc.x += dx; st.nc.z += dz; } if (st.mc) { st.mc.x += dx; st.mc.z += dz; } }
        if (key !== st.lastKey) { st.lastKey = key; var ch = groundMoved(cam, H, fc); if (ch & 1) GT.stale = true; if (ch & 2) st.dirty = true; }   // the streamed ground was refined or dropped UNDER THEM (probed): the feet follow it (trees at most every DIRTY_S)
        var due = st.dirty && st.clock - st.tDirty >= C.DIRTY_S;
        if (due) { st.dirty = false; st.tDirty = st.clock; }
        if (!nearOn) { if (st.nc) { clear(0); st.nc = null; } }
        else if (!st.jobs[0] && (fc || due || !st.nc || Math.hypot(cam.x - st.nc.x, cam.z - st.nc.z) > C.MOVE)) { start(0, cam, f, H, 0); st.nc = { x: cam.x, z: cam.z }; }
        if (!midOn) { if (st.mc) { clear(1); st.mc = null; } }
        else if (!st.jobs[1] && (fc || due || !st.mc || st.mc.near !== nearOn || Math.hypot(cam.x - st.mc.x, cam.z - st.mc.z) > C.MOVE_MID)) { start(1, cam, f, H, nearOn ? C.BAND - C.MOVE_MID - C.MOVE - 10 : 0); st.mc = { x: cam.x, z: cam.z, near: nearOn }; }   // the hole inside the band however far she has come since either list
        var left = C.SLICE_MS, tv = 0; tv = work(0, left); left -= tv; if (left > 0.2) tv += work(1, left);
        st.lastF = f;
        if (st.tintQ.size) { var it = st.tintQ.entries().next().value; st.tintQ.delete(it[0]); tint(it[1]); }   // one tile a frame
        if (st.clock - st.tImz > 1) { st.tImz = st.clock; stt.tiles.forEach(function (rec, k) { if (rec.vegImz !== undefined && rec.im712 && rec.im712.z !== rec.vegImz) st.tintQ.set(k, rec); }); }   // the photo came after the tint: tint again over it
        grassTick(GT, cam, agl, { f: f, H: H }, BAR761 && tv > 1.5 && (st.gw761 = (st.gw761 || 0) + 1) <= 2 ? -1 : (st.gw761 = 0, Math.max(0.3, Math.min(GC.BUILD_MS, GC.VEG_MS - tv))));   // the trees and the grass share one budget a frame
        if (GI.n) { GI.n = 0; GI.geo.instanceCount = 0; GI.key = null; } if (GFI && GFI.n) { GFI.n = 0; GFI.geo.instanceCount = 0; GFI.key = null; }   /* SU39: the far grass too */
      } catch (e) { st.fault = String(e && e.message || e); }
      var ms = performance.now() - t0; st.tick.push(+ms.toFixed(3)); if (st.tick.length > 20000) st.tick.shift();
    }
    function farMake() {   // SU39: the island cut in GF.CH squares; each square's clumps made once, nearest first
      var half = 380, n = Math.ceil(half * 2 / GF.CH); for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) { var x0 = -half + i * GF.CH, z0 = -half + j * GF.CH; GFI.chunks.push({ i: i, j: j, x0: x0, z0: z0, cx: x0 + GF.CH / 2, cz: z0 + GF.CH / 2, d: null, n: 0 }); }
      GFI.made = true; }
    function farBuild(ch) {   // the far clumps of one square: a jittered 2 m grid kept by the island's own meadow test, each with its rank (for the thinning far out)
      var m = Math.round(GF.CH / GF.SP), out = []; for (var j = 0; j < m; j++) for (var i = 0; i < m; i++) { var h0 = hash3(ch.i * 97 + i, ch.j * 97 + j, 79), ju = ((h0 & 1023) / 1023 - 0.5) * 0.95, jv = (((h0 >>> 10) & 1023) / 1023 - 0.5) * 0.95;
        var x = ch.x0 + (i + 0.5 + ju) * GF.SP, z = ch.z0 + (j + 0.5 + jv) * GF.SP; if (!islandDens(x, z)) continue; var h1 = hash3(ch.i * 97 + i, ch.j * 97 + j, 80), nz = Math.sin(x * 0.021 + Math.cos(z * 0.017) * 2.1) * Math.cos(z * 0.019 + Math.sin(x * 0.013) * 1.7), K = nz > 0.25 ? [1.12, 1.04, 0.7] : nz < -0.3 ? [0.82, 0.96, 0.8] : [1, 1, 1], vv = 0.88 + ((h1 >>> 8) & 255) / 255 * 0.24;
        out.push(((h0 >>> 20) & 4095) / 4096, x, ISL.H(x, z) - 0.04, z, ((h1 >>> 16) & 1023) / 1023 * 6.2832, -(0.85 + (h1 & 255) / 255 * 0.4) * GF.SC, K[0] * vv, K[1] * vv, K[2] * vv); }
      ch.d = new Float32Array(out); ch.n = out.length / 9; GFI.built++; }
    function farTick(cam, agl) {
      if (!GFI || GH.hold) return; var F = GFI; if (agl > GF.AGL) { if (F.n) { F.n = 0; F.geo.instanceCount = 0; } F.key = null; return; } if (!F.made) farMake();
      var t0 = performance.now(), lim = F.next === 0 ? GF.FIRST_MS : GF.BUILD_MS, any = false;
      if (F.next < F.chunks.length) { var order = F.chunks.filter(function (c) { return !c.d; }).sort(function (a, b) { return Math.hypot(a.cx - cam.x, a.cz - cam.z) - Math.hypot(b.cx - cam.x, b.cz - cam.z); });
        for (var c = 0; c < order.length; c++) { var ch = order[c]; if (Math.hypot(ch.cx - cam.x, ch.cz - cam.z) > GF.R + GF.CH) break; farBuild(ch); F.next++; any = true; if (performance.now() - t0 > lim) break; } F.buildMs += performance.now() - t0; }
      var key = Math.floor(cam.x / GF.MOVE) + ',' + Math.floor(cam.z / GF.MOVE); if (key === F.key && !any) return; F.key = key;
      var t1 = performance.now(), P = F.aP.array, Sx = F.aS.array, n = 0, R2 = GF.R * GF.R, r0 = GF.IN0 - 6, r02 = r0 * r0;
      var near39 = []; for (var q0 = 0; q0 < F.chunks.length; q0++) { var c0 = F.chunks[q0]; if (!c0.d) continue; c0.dc = Math.hypot(c0.cx - cam.x, c0.cz - cam.z); if (c0.dc > GF.R + GF.CH || c0.dc < r0 - GF.CH) continue; near39.push(c0); } near39.sort(function (a, b) { return a.dc - b.dc; });   // nearest squares first: at the cap the farthest go, never a hole
      for (var q = 0; q < near39.length && n < GF.CAP; q++) { var cq = near39[q], d = cq.d;
        for (var k = 0; k < cq.n && n < GF.CAP; k++) { var o = k * 9, dx = d[o + 1] - cam.x, dz = d[o + 3] - cam.z, r2 = dx * dx + dz * dz; if (r2 > R2 || r2 < r02) continue; var dist = Math.sqrt(r2), keep = 1 - (1 - GF.KEEP) * Math.min(1, Math.max(0, (dist - GF.THIN0) / (GF.R - GF.THIN0))); if (d[o] >= keep) continue;
          P[n * 4] = d[o + 1]; P[n * 4 + 1] = d[o + 2]; P[n * 4 + 2] = d[o + 3]; P[n * 4 + 3] = d[o + 4]; Sx[n * 4] = d[o + 5] * (1 + 0.6 * Math.min(1, dist / GF.R)); Sx[n * 4 + 1] = d[o + 6]; Sx[n * 4 + 2] = d[o + 7]; Sx[n * 4 + 3] = d[o + 8]; n++; } }
      F.n = n; F.geo.instanceCount = n; F.aP.updateRange.offset = 0; F.aP.updateRange.count = n * 4; F.aP.needsUpdate = true; F.aS.updateRange.offset = 0; F.aS.updateRange.count = n * 4; F.aS.needsUpdate = true; F.asm++; F.asmMs = Math.max(F.asmMs, performance.now() - t1);
    }
    function island(cam, dt) {   // each island frame (the island's own branch of the page's frame)
      if (!ISL) return; var t0 = performance.now();
      try { grassClock(dt); var g = ISL.H(cam.x, cam.z); grassTick(GI, cam, cam.y - Math.max(g, ISL.water), null); farTick(cam, cam.y - Math.max(g, ISL.water)); if (GT.n) { GT.n = 0; GT.geo.instanceCount = 0; GT.key = null; } } catch (e) { st.fault = 'island: ' + String(e && e.message || e); }
      var ms = performance.now() - t0; st.islandTick = st.islandTick || []; st.islandTick.push(+ms.toFixed(3)); if (st.islandTick.length > 20000) st.islandTick.shift();
    }
    function progs() { if (!renderer || !renderer.info) return {}; var P = renderer.info.programs; return { programs: P.length, vegPrograms: P.filter(function (q) { return String(q.cacheKey).indexOf('wfrveg1') >= 0; }).length, grassPrograms: P.filter(function (q) { return String(q.cacheKey).indexOf('wfrgrass1') >= 0; }).length }; }
    function quant(a) { var c = (a || []).slice().sort(function (x, y) { return x - y; }), qq = function (p) { return c.length ? c[Math.min(c.length - 1, Math.floor(c.length * p))] : null; }; return { n: c.length, med: qq(0.5), p90: qq(0.9), p99: qq(0.99), max: c.length ? c[c.length - 1] : null }; }
    function peek(o) {
      var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); }, gf = function (F) { return { n: F.n, chunks: F.chunks.size, want: F.want.length, built: F.built, rebuilt: F.rebuilt, buildMax: +F.buildMax.toFixed(2), asm: F.asm }; };
      var out = Object.assign({ near: sum(st.n), mid: sum(st.nm), band: sum(st.nb), bandShapes: st.nb.slice(), midTris: md.geos.map(function (g) { return g.attributes.position.count / 3; }), perKind: KINDS.reduce(function (acc, k, i) { acc[k] = st.n[i]; return acc; }, {}), midShapes: st.nm.slice(),
        masks: core.masks.size, zooms: core.zooms(), core: Object.assign({}, core.stats), subs: st.subs, sels: st.sels.slice(), selMs: st.selMs.map(function (x) { return +x.toFixed(2); }), selMax: st.selMax.map(function (x) { return +x.toFixed(2); }), selFrames: st.frames.slice(),
        cand: st.cand.slice(), bm: st.bm.slice(), fault: st.fault, tinted: st.tinted, tintMs: +st.tintMs.toFixed(2), tintQ: st.tintQ.size, onTiles: st.onTiles, agl: st.agl == null ? null : +st.agl.toFixed(1), drawCalls: near.length + mid.length + band.length, tris: sp.tris, material: mat.uuid, inScene: group.parent === scene, shifts: st.shifts,
        grass: { far39: GFI ? { n: GFI.n, built: GFI.built, of: GFI.chunks.length, buildMs: +GFI.buildMs.toFixed(1), asm: GFI.asm, asmMs: +GFI.asmMs.toFixed(2) } : null, travel: gf(GT), island: gf(GI), t: +GU.uGrassT.value.toFixed(3), w: +GU.uGrassW.value.toFixed(3), wind: st.wind, tris: gGeo.attributes.position.count / 3 } }, progs());   // the bench's read: the page keeps its renderer to itself
      if (o && o.tick) { out.tickQ = quant(st.tick); out.islandQ = quant(st.islandTick); if (o.reset) { st.tick = []; st.islandTick = []; st.selMax = [0, 0]; GT.buildMax = 0; GI.buildMax = 0; } }
      if (o && o.instances) { out.inst = []; [[near, st.n, 0], [mid, st.nm, 1], [band, st.nb, 2]].forEach(function (L) { L[0].forEach(function (m, i) { var a = m.instanceMatrix.array; for (var k = 0; k < L[1][i]; k++) out.inst.push([a[k * 16 + 12], a[k * 16 + 13], a[k * 16 + 14], L[2], i, a[k * 16 + 5]]); }); }); }
      if (o && o.ring && st.at[0] && TR.st) { var c0 = st.at[0], rr0 = o.ring[0], rr1 = o.ring[1], lat8 = [0, 0, 0, 0, 0, 0, 0, 0], drw = [0, 0, 0, 0, 0, 0, 0, 0], sec = function (x, z) { return Math.floor((Math.atan2(z - c0.z, x - c0.x) + Math.PI) / (2 * Math.PI) * 8) % 8; };   // the audit (veg712 V6): the near forest's own lattice in a ring round where the near list was chosen, against the trees drawn there
        var JA = core.begin({ level: 0, cam: c0, frame: TR.st.frame(), H: TR.st.H, R: rr1, R0: rr0, cap: 1e9, put: function (kind, x, y, z) { lat8[sec(x, z)]++; }, bm: bmForest }); core.step(JA, null);
        [[near, st.n], [mid, st.nm], [band, st.nb]].forEach(function (L) { L[0].forEach(function (m, i) { var a = m.instanceMatrix.array; for (var k = 0; k < L[1][i]; k++) { var d = Math.hypot(a[k * 16 + 12] - c0.x, a[k * 16 + 14] - c0.z); if (d >= rr0 && d <= rr1) drw[sec(a[k * 16 + 12], a[k * 16 + 14])]++; } }); });
        out.ring = { at: [+c0.x.toFixed(1), +c0.z.toFixed(1)], r: [rr0, rr1], lattice: lat8, drawn: drw }; }
      if (o && o.grass) { var F = o.grass === 'island' ? GI : GT, P = F.aP.array; out.blades = []; for (var k = 0; k < F.n; k++) out.blades.push([+P[k * 4].toFixed(2), +P[k * 4 + 1].toFixed(2), +P[k * 4 + 2].toFixed(2)]); }
      return out;
    }
    subscribe();   // at load when the features unit is already there: it reads landcover / landuse only for a listener, so the first tiles carry them too
    function cover761(cb) { var F = TR.on ? GT : GI, full = Math.max(1, Math.pow(GC.CH / GC.SP / 4, 2) * 0.55); for (var i = 0; i < F.want.length; i++) { var c = F.want[i]; if (c.cv) cb(c, 16, Math.max(1, full * (c.cut == null ? 1 : c.cut))); } }   // 761b: where the grass stands (a chunk built part-deep is counted against that depth)
    function nearTrees761(cb) { var RK = [0.24, 0.24, 0.3, 0.46, 0.3, 0.1]; for (var i = 0; i < near.length; i++) { var a = near[i].instanceMatrix.array, top = sp.tops[i]; for (var k = 0; k < st.n[i]; k++) { var ht = a[k * 16 + 5] * top; cb(a[k * 16 + 12], a[k * 16 + 14], ht, ht * RK[i]); } } }   // 761b: every full tree: x, z, height, crown radius
    function key761() { var F = TR.on ? GT : GI; return st.sels[0] + '/' + (F.built >> 4); }   // 761b: changes when the near list or the chunks do
    S = { core: core, st: st, api: { tick: tick, island: island, peek: peek, core: core, group: group, material: mat, nearTrees: nearTrees761, vegKey: key761, grass: { travel: GT.mesh, island: GI.mesh, U: GU, BU: GU, cover: cover761, LAYER_ONLY: GC.LAYER_ONLY, H: GH } } };
    return S.api;
  }

  return { C: C, GC: GC, CLS: CLS, CLS_NAME: CLS_NAME, DENS: DENS, GD: GD, KINDS: KINDS, makeCore: makeCore, kindFor: kindFor, heightFor: heightFor, treeline: treeline, hash3: hash3, tileY: tileY, attach: attach,
    tick: function (cam, dt) { if (S) S.api.tick(cam, dt); }, island: function (cam, dt) { if (S) S.api.island(cam, dt); }, peek: function (o) { return S ? S.api.peek(o) : null; }, api: function () { return S ? S.api : null; }, version: 3 };
})();
