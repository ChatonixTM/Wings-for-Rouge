/* world712-frame.js - BOARD 712 S0, THE FRAME (Marth, Oct 28 2026: "realistic scaling. everything and everybuilding and land mass ... accounted for";
   plan: PLAN_712_THE_WORLD_2026-10-28.md S0). One real Earth: WGS84 lat/lon is the truth; game metres are a local flat patch round a place.
   The tile maths is earth/terrarium.js's (Trunks, Oct 21), copied line for line into a classic script (the game loads no modules); the guard
   tests/world712.js holds the two equal on sample points. Added here: great-circle distance and initial bearing, and the island's home.
   Nothing here draws, allocates per frame, or touches the game: it is the frame the world ships (S1..S7) stand on. */
window.WFR_WORLD = (function () {
  'use strict';
  var R_EARTH = 6378137, WORLD = 2 * Math.PI * R_EARTH, PX = 256, R_MEAN = 6371008.8, D2R = Math.PI / 180;
  /* the island's home in the real world: open sea just south of Jamaica, clear of the Pedro and Morant Cays (Su 35's pick on his ruling "yes you
     have the choice"; PLAN_703 Q9). DRAFT until Izumi checks it on a chart. */
  var HOME = { lat: 16.5, lon: -77.0, name: 'Home (south of Jamaica)' };
  var PLACES = { antigua: { lat: 14.5586, lon: -90.7295, name: 'Antigua Guatemala' }, tahoe: { lat: 39.0968, lon: -120.0324, name: 'Lake Tahoe' }, kingston: { lat: 17.9714, lon: -76.7920, name: 'Kingston, Jamaica' } };
  function decodeHeight(r, g, b) { return r * 256 + g + b / 256 - 32768; }
  function mercator(lat, lon) { return { x: lon * Math.PI / 180 * R_EARTH, y: R_EARTH * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) }; }
  function tileAt(lat, lon, z) { var n = Math.pow(2, z), latR = lat * Math.PI / 180; return { z: z, x: Math.floor((lon + 180) / 360 * n), y: Math.floor((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n) }; }
  /* ---------- 725b THE ONE DOOR (Trunks, Nov 4 2026; PLAN_725 + CENSUS_725b; Marth, Nov 4: "prioritize accurate and vaast and submersive world building").
     Every position, tile vertex, tile box, distance, bearing and sun direction goes through this door. Mercator (the default) answers with the SAME
     expressions as Oct 28 (tests/door725b.js holds them to tests/fixtures/world712-frame.oct28.js, number for number). ?world=gleason previews his
     disc, Gleason's New Standard Map (1892): rho = R(pi/2 - lat), x = rho sin L, z = rho cos L, L = lon - ROT_LON; a translation-only frame; a FLAT
     horizon (his ruling: the disc is the world). A frame carries its own kind (a disc frame has g: 1), so CREATIVE_FRAME stays Mercator in either
     mode. 725c deletes the Mercator BRANCH (the dispatch below), never M or the creative functions. */
  var ROT_LON = -77.0;   // FROZEN: the disc's one turn (PLAN_725), separate from HOME (still DRAFT): if HOME moves, the world does not swing round
  var MODE = typeof location !== 'undefined' && location && /[?&]world=gleason(&|$)/.test(location.search || '') ? 'gleason' : 'mercator', GL = MODE === 'gleason';
  var LATMAX = 85.0511287798066;   // the Web Mercator grid's edge: the tiles stop here in both modes
  /* the Mercator frame: Oct 28's lines, unchanged but for their names */
  function mFrame(place) { var o = mercator(place.lat, place.lon); return { ox: o.x, oy: o.y, k: Math.cos(place.lat * Math.PI / 180) }; }
  function mTileBounds(f, z, x, y) { var s = WORLD / Math.pow(2, z), mx = x * s - WORLD / 2, myTop = WORLD / 2 - y * s; return { x0: (mx - f.ox) * f.k, z0: (f.oy - myTop) * f.k, size: s * f.k }; }
  function mToLocal(f, lat, lon) { var m = mercator(lat, lon); return { x: (m.x - f.ox) * f.k, z: (f.oy - m.y) * f.k }; }   /* x east, z SOUTH (terrarium.js's frame) */
  function mToLatLon(f, lx, lz) { var mx = lx / f.k + f.ox, my = f.oy - lz / f.k; return { lat: (2 * Math.atan(Math.exp(my / R_EARTH)) - Math.PI / 2) * 180 / Math.PI, lon: mx / R_EARTH * 180 / Math.PI }; }
  function mTileIndexAt(f, z, lx, lz) { var s = WORLD / Math.pow(2, z), mx = lx / f.k + f.ox, my = f.oy - lz / f.k; return { z: z, x: Math.floor((mx + WORLD / 2) / s), y: Math.floor((WORLD / 2 - my) / s) }; }
  /* world712-travel.js's boundsOf and recAt's index, moved in whole: a tile's square, the antimeridian wrapped to the copy nearest the frame's origin */
  function mTileBox(f, z, x, y) {
    var s = WORLD / Math.pow(2, z), mx = x * s - WORLD / 2, myTop = WORLD / 2 - y * s, dx = mx + s / 2 - f.ox;
    if (dx > WORLD / 2) mx -= WORLD; else if (dx < -WORLD / 2) mx += WORLD;
    return { x0: (mx - f.ox) * f.k, z0: (f.oy - myTop) * f.k, size: s * f.k, s: s };
  }
  function mTileIndexAtWrapped(f, z, lx, lz) { var s = WORLD / Math.pow(2, z), mx = lx / f.k + f.ox, my = f.oy - lz / f.k; return { z: z, x: Math.floor((((mx + WORLD / 2) % WORLD) + WORLD) % WORLD / s), y: Math.floor((WORLD / 2 - my) / s) }; }
  /* the disc (his map). The sign of L is written HERE, once: east of ROT_LON turns toward +x (east); the centre is the North Pole; +z runs outward (south). */
  function disc(lat, lon, rot) { var rho = R_MEAN * (Math.PI / 2 - lat * D2R), L = (lon - (rot == null ? ROT_LON : rot)) * D2R; return { x: rho * Math.sin(L), z: rho * Math.cos(L) }; }
  function discInv(x, z, rot) { var rho = Math.sqrt(x * x + z * z), lon = (rho > 0 ? Math.atan2(x, z) / D2R : 0) + (rot == null ? ROT_LON : rot); return { lat: 90 - rho / R_MEAN / D2R, lon: ((lon + 180) % 360 + 360) % 360 - 180 }; }
  function gFrame(place) { var d = disc(place.lat, place.lon); return { g: 1, ox: d.x, oz: d.z }; }   // translation only: no k, no turn
  function gToLocal(f, lat, lon) { var d = disc(lat, lon); return { x: d.x - f.ox, z: d.z - f.oz }; }
  function gToLatLon(f, lx, lz) { return discInv(lx + f.ox, lz + f.oz); }
  function clampLat(lat) { return Math.max(-LATMAX, Math.min(LATMAX, lat)); }
  function gTileIndexAt(f, z, lx, lz) { var ll = gToLatLon(f, lx, lz), t = tileAt(clampLat(ll.lat), ll.lon, z), n = Math.pow(2, z); t.x = Math.min(n - 1, Math.max(0, t.x)); t.y = Math.min(n - 1, Math.max(0, t.y)); return t; }
  function tileLon(z, x) { return x / Math.pow(2, z) * 360 - 180; }
  function tileLat(z, y) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / Math.pow(2, z)))) / D2R; }
  /* a disc tile is a ring sector: its box is the AABB of its corners and edge points (16 a side below z4, where one tile spans a quarter turn or more), squared up so every square-box reader stays conservative */
  function gTileBox(f, z, x, y) { var m = z < 4 ? 16 : 2, x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (var j = 0; j <= m; j++) for (var i = 0; i <= m; i++) { if (i > 0 && i < m && j > 0 && j < m) continue; var p = gToLocal(f, tileLat(z, y + j / m), tileLon(z, x + i / m)); if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.z < z0) z0 = p.z; if (p.z > z1) z1 = p.z; }
    return { x0: x0, z0: z0, x1: x1, z1: z1, size: Math.max(x1 - x0, z1 - z0), s: WORLD / Math.pow(2, z) }; }
  /* ---------- the door's public face: a Mercator frame answers through the frozen lines above, a disc frame through the disc ---------- */
  function frame(place) { return GL ? gFrame(place) : mFrame(place); }
  function tileBounds(f, z, x, y) { return f.g ? gTileBox(f, z, x, y) : mTileBounds(f, z, x, y); }
  function toLocal(f, lat, lon) { return f.g ? gToLocal(f, lat, lon) : mToLocal(f, lat, lon); }   /* x east, z SOUTH (terrarium.js's frame) */
  function toLatLon(f, lx, lz) { return f.g ? gToLatLon(f, lx, lz) : mToLatLon(f, lx, lz); }
  function tileIndexAt(f, z, lx, lz) { return f.g ? gTileIndexAt(f, z, lx, lz) : mTileIndexAt(f, z, lx, lz); }
  function tileIndexAtWrapped(f, z, lx, lz) { return f.g ? gTileIndexAt(f, z, lx, lz) : mTileIndexAtWrapped(f, z, lx, lz); }
  function tileBox(f, z, x, y) { return f.g ? gTileBox(f, z, x, y) : mTileBox(f, z, x, y); }
  /* a tile's mesh: where it stands (origin and scale), each grid point in the mesh's own units (o = tilePlace's answer: relative to the tile's own
     origin, since Float32 at 8,000+ km loses a metre), its rows' latitudes, and a point's place on its grid (u east, v south, 0..1) */
  function tilePlace(f, z, x, y) { if (!f.g) { var b = mTileBox(f, z, x, y); return { x: b.x0, z: b.z0, scale: f.k }; } var o = gToLocal(f, tileLat(z, y), tileLon(z, x)); return { x: o.x, z: o.z, scale: 1 }; }
  function tileLocal(f, z, x, y, u, v, o) { if (!f.g) { var s = WORLD / Math.pow(2, z); return { x: u * s, z: v * s }; } var p = gToLocal(f, tileLat(z, y + v), tileLon(z, x + u)); return { x: p.x - o.x, z: p.z - o.z }; }
  function tileCorner(f, z, x, y, u, v) { if (!f.g) { var b = mTileBox(f, z, x, y); return { x: b.x0 + u * b.size, z: b.z0 + v * b.size }; } return gToLocal(f, tileLat(z, y + v), tileLon(z, x + u)); }
  function tileRowLats(f, z, x, y, b) { if (!f.g) return [mToLatLon(f, 0, b.z0).lat, mToLatLon(f, 0, b.z0 + b.size).lat]; return [tileLat(z, y), tileLat(z, y + 1)]; }
  function tileUV(f, z, x, y, lx, lz) { if (!f.g) { var b = mTileBox(f, z, x, y); return { u: (lx - b.x0) / b.size, v: (lz - b.z0) / b.size }; }
    var ll = gToLatLon(f, lx, lz), n = Math.pow(2, z), u = (ll.lon + 180) / 360 * n - x, la = clampLat(ll.lat) * D2R; if (u > n / 2) u -= n; else if (u < -n / 2) u += n;
    return { u: u, v: (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n - y }; }
  function describeFrame(f) { return f.g ? { mode: 'gleason', ox: f.ox, oz: f.oz } : { mode: 'mercator', ox: f.ox, oy: f.oy, k: f.k }; }   // the frame is opaque: readers outside this file ask here
  function isDisc(f) { return !!(f && f.g); }
  /* great circles on the mean sphere (haversine; the initial bearing clockwise from north, degrees) */
  function distance(a, b) { var p1 = a.lat * D2R, p2 = b.lat * D2R, dp = p2 - p1, dl = (b.lon - a.lon) * D2R, h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2); return 2 * R_MEAN * Math.asin(Math.min(1, Math.sqrt(h))); }
  function bearing(a, b) { var p1 = a.lat * D2R, p2 = b.lat * D2R, dl = (b.lon - a.lon) * D2R, y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl); return (Math.atan2(y, x) / D2R + 360) % 360; }
  /* the game's yaw for a compass bearing: forward = (sin yaw, cos yaw) in game x/z. Game north is -z (terrarium's z runs SOUTH), so a bearing B
     (clockwise from north) faces (sin B, -cos B): yaw = PI - B. */
  function yawOf(bearingDeg) { return Math.PI - bearingDeg * D2R; }
  /* 725b: the km she flies and the km on the globe, named apart. A yaw needs the place it is taken at (on the disc, north turns with the spoke),
     so spoke() refuses a missing place in BOTH modes: a caller that forgets it is caught on Mercator, before the flip. */
  function globeKm(a, b) { return distance(a, b) / 1000; }
  function flownKm(a, b) { if (!GL) return distance(a, b) / 1000; var p = disc(a.lat, a.lon), q = disc(b.lat, b.lon), dx = q.x - p.x, dz = q.z - p.z; return Math.sqrt(dx * dx + dz * dz) / 1000; }
  function spoke(ll) { if (!ll || typeof ll.lon !== 'number' || !isFinite(ll.lon)) throw new Error('WFR_WORLD: a yaw on the disc needs the place it is taken at'); return (ll.lon - ROT_LON) * D2R; }
  function eastAt(ll) { var L = spoke(ll); return GL ? L : 0; }   // how far her local east is turned from game +x (0 on Mercator)
  function yawAt(B, ll) { var L = spoke(ll); return GL ? Math.PI - B * D2R + L : yawOf(B); }   // a compass bearing B (degrees) at place ll
  function yawToward(ll, target) { spoke(ll); if (!GL) return yawOf(bearing(ll, target)); var p = disc(ll.lat, ll.lon), q = disc(target.lat, target.lon); return Math.atan2(q.x - p.x, q.z - p.z); }   // the straight line on his map
  function angleToward(ll, target) { spoke(ll); if (!GL) { var B = bearing(ll, target) * Math.PI / 180; return Math.atan2(-Math.cos(B), Math.sin(B)); } var p = disc(ll.lat, ll.lon), q = disc(target.lat, target.lon); return Math.atan2(q.z - p.z, q.x - p.x); }   // the horizon's angle a: direction (cos a, sin a) in game x/z
  function bearingOfYaw(yaw, ll) { var L = spoke(ll); return GL ? ((((Math.PI - yaw + L) * 180 / Math.PI) % 360 + 360) % 360) : ((((Math.PI - yaw) * 180 / Math.PI) % 360 + 360) % 360); }
  function turnEast(v, ll) { var L = spoke(ll); if (!GL) return v; var c = Math.cos(L), s = Math.sin(L), x = v.x, z = v.z; v.x = x * c + z * s; v.z = z * c - x * s; return v; }   // a sky vector built in fixed axes (+x east, +z south), turned to her local east
  function curveR() { return GL ? Infinity : 7432843; }   // the curve's radius (carib712's refraction radius, 7/6 R); his disc is FLAT
  /* FROZEN (725b): Damned's true spot where 723d leaves it: tf723DamnedC, 5 km out on DAMNED703_C.b = 2.3 from home, through the Oct 28 home frame */
  var DAMNED = { lat: 16.529923980389, lon: -76.965067553098, name: 'Damned' };
  var HOMEF = frame(HOME);
  /* FROZEN FOREVER (725b): Rouge's creative saves stand on today's Mercator home frame (z14 cells); 725c's flip must never reach them */
  var CREATIVE_FRAME = mFrame(HOME);
  var M = { mercator: mercator, frame: mFrame, tileBounds: mTileBounds, toLocal: mToLocal, toLatLon: mToLatLon, tileIndexAt: mTileIndexAt, tileBox: mTileBox };   // the frozen Mercator names
  return { R_EARTH: R_EARTH, WORLD: WORLD, PX: PX, HOME: HOME, PLACES: PLACES, HOMEF: HOMEF, decodeHeight: decodeHeight, mercator: mercator, tileAt: tileAt, frame: frame, tileBounds: tileBounds,
    toLocal: toLocal, toLatLon: toLatLon, tileIndexAt: tileIndexAt, distance: distance, bearing: bearing, yawOf: yawOf,
    MODE: MODE, ROT_LON: ROT_LON, R_MEAN: R_MEAN, LATMAX: LATMAX, DAMNED: DAMNED, CREATIVE_FRAME: CREATIVE_FRAME, M: M, disc: disc, discInv: discInv, tileLat: tileLat, tileLon: tileLon,
    tileIndexAtWrapped: tileIndexAtWrapped, tileBox: tileBox, tilePlace: tilePlace, tileLocal: tileLocal, tileCorner: tileCorner, tileRowLats: tileRowLats, tileUV: tileUV, describeFrame: describeFrame, isDisc: isDisc,
    globeKm: globeKm, flownKm: flownKm, eastAt: eastAt, yawAt: yawAt, yawToward: yawToward, angleToward: angleToward, bearingOfYaw: bearingOfYaw, turnEast: turnEast, curveR: curveR,
    creativeTileIndexAt: function (z, lx, lz) { return mTileIndexAt(CREATIVE_FRAME, z, lx, lz); }, creativeTileBounds: function (z, x, y) { return mTileBounds(CREATIVE_FRAME, z, x, y); },
    fromHome: function (id) { var p = PLACES[id]; if (!p) return null; return { id: id, name: p.name, km: distance(HOME, p) / 1000, globeKm: distance(HOME, p) / 1000, flownKm: flownKm(HOME, p), bearing: bearing(HOME, p), local: toLocal(HOMEF, p.lat, p.lon) }; } };
})();
