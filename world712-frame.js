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
  function frame(place) { var o = mercator(place.lat, place.lon); return { ox: o.x, oy: o.y, k: Math.cos(place.lat * Math.PI / 180) }; }
  function tileBounds(f, z, x, y) { var s = WORLD / Math.pow(2, z), mx = x * s - WORLD / 2, myTop = WORLD / 2 - y * s; return { x0: (mx - f.ox) * f.k, z0: (f.oy - myTop) * f.k, size: s * f.k }; }
  function toLocal(f, lat, lon) { var m = mercator(lat, lon); return { x: (m.x - f.ox) * f.k, z: (f.oy - m.y) * f.k }; }   /* x east, z SOUTH (terrarium.js's frame) */
  function toLatLon(f, lx, lz) { var mx = lx / f.k + f.ox, my = f.oy - lz / f.k; return { lat: (2 * Math.atan(Math.exp(my / R_EARTH)) - Math.PI / 2) * 180 / Math.PI, lon: mx / R_EARTH * 180 / Math.PI }; }
  function tileIndexAt(f, z, lx, lz) { var s = WORLD / Math.pow(2, z), mx = lx / f.k + f.ox, my = f.oy - lz / f.k; return { z: z, x: Math.floor((mx + WORLD / 2) / s), y: Math.floor((WORLD / 2 - my) / s) }; }
  /* great circles on the mean sphere (haversine; the initial bearing clockwise from north, degrees) */
  function distance(a, b) { var p1 = a.lat * D2R, p2 = b.lat * D2R, dp = p2 - p1, dl = (b.lon - a.lon) * D2R, h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2); return 2 * R_MEAN * Math.asin(Math.min(1, Math.sqrt(h))); }
  function bearing(a, b) { var p1 = a.lat * D2R, p2 = b.lat * D2R, dl = (b.lon - a.lon) * D2R, y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl); return (Math.atan2(y, x) / D2R + 360) % 360; }
  /* the game's yaw for a compass bearing: forward = (sin yaw, cos yaw) in game x/z. Game north is -z (terrarium's z runs SOUTH), so a bearing B
     (clockwise from north) faces (sin B, -cos B): yaw = PI - B. */
  function yawOf(bearingDeg) { return Math.PI - bearingDeg * D2R; }
  var HOMEF = frame(HOME);
  return { R_EARTH: R_EARTH, WORLD: WORLD, PX: PX, HOME: HOME, PLACES: PLACES, HOMEF: HOMEF, decodeHeight: decodeHeight, mercator: mercator, tileAt: tileAt, frame: frame, tileBounds: tileBounds,
    toLocal: toLocal, toLatLon: toLatLon, tileIndexAt: tileIndexAt, distance: distance, bearing: bearing, yawOf: yawOf,
    fromHome: function (id) { var p = PLACES[id]; if (!p) return null; return { id: id, name: p.name, km: distance(HOME, p) / 1000, bearing: bearing(HOME, p), local: toLocal(HOMEF, p.lat, p.lon) }; } };
})();
