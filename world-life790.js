/* world-life790.js - BOARD 790 PART B, LIFE EVERYWHERE (Wings for Rouge). Ship #138, Nov 13 2026. Every number DRAFT (unmeasured on her phone).
   Marth, Nov 13 2026, verbatim: "I want the whole world built at least as nice as the current game looks ... His map look nice like miles morales spider
   man. Can interact with all living things and many inanimate objects. Moving or stationary." / "lock tf in ... I want results tho brother."
   The bar: Yegor Sak's COO (a Toronto pigeon game): "a living city: traffic, pedestrians, flocks, boats, weather, day/night ... rush-hour traffic".

   WHAT ROUGE SEES, wherever the real map has streets (not one city): people on the sidewalks of the real streets, more downtown than in the suburbs,
   most at the rush hours and few at night; joggers and walkers (some with a dog) on the park paths; people sitting on the grass in the parks, waiting at
   the stops, a busker with a ring of listeners downtown; cars on the real roads by class (motorways full, side streets light), queueing at the
   junctions' lights and braking for the car ahead, keeping to the side of the road the country drives on, headlights and tail lights at night; buses
   that stop; streetcars on the real tram lines (a rail line that runs IN a street is a tram: Toronto's red streetcars are the proof) and trains on the
   rest, both stopping and lit at night; pigeons pecking on the sidewalks and in the squares that LIFT AND SCATTER when she flies low through them, and
   settle again; gulls wheeling over harbours, lakes and rivers that veer off when she cuts through; ducks on park ponds; sailboats, motorboats and a
   ferry on the harbours and lakes, boats on the rivers. In the country: a car now and then on the highway, a walker on a track; the wild animals stay
   world-animals.js's (it already has them by realm).

   REUSED, NOT REWRITTEN (MBAEEMP): world-features.js's listener feed (WFR_FEATURES.onTile: its OpenStreetMap roads with their class and drawn width,
   rail lines, water, landuse, landcover, buildings and shops; OpenFreeMap / OpenMapTiles, ODbL, already credited on screen by that module; this
   module draws no map data, only things moving on it); world-traffic.js's one-program pattern (Lambert + the travel ground's shrink-and-curve per
   instance, the keeper instance that compiles the program at load, the placing in scene.onBeforeRender so a recentre never shows) and its seeds;
   world712-travel.js's drawn ground (st.H) and frame; WFR_WORLD for every lat/lon. NEW (nothing on the shelf at these sizes; procedural, our own
   code, flat-shaded like the house's kit): the figure (one body, posed in the vertex shader: walk, stand, sit, busk), the dog, the car, the bus, the
   streetcar, the train car, three boats, the pigeon, the gull and the duck.

   THE BUDGET (limits set before the first run, measured after): hard caps per mesh (C.CAP), 1,500 agents at most, 16 draws at most (one per kind,
   only when something of it is near), people within 420 m (the full figure within 140 m, a three-box figure beyond), cars within 760 m (full within
   220 m), transit within 1.4 km; the map's tiles read in slices of 2.5 ms; lists refreshed twice a second; far agents placed every other frame.

   READY FOR PART C (interaction): every living thing here is a handle: near(x, z, r, kinds) and get(id) give { id, kind, what, where(), startle(x, z),
   rideable, seat() } (where() in the frame's metres and lat/lon; startle() makes people hurry off, cars brake, birds scatter; seat() is the roof or
   deck of a bus, streetcar, train or boat for a ride). ONE interaction is wired now, the proof: pigeons and gulls scatter when she flies low through.

   THE PAGE HANDS IT NOTHING NEW: world-traffic.js calls WFR_LIFE790.init(ctx) from its own init and tick(dt) from its own tick (ctx = { THREE, scene,
   renderer, S, TR: TRAVEL712, classic }). Standard only: Classic is frozen (board 645), init refuses there and nothing is made. */
window.WFR_LIFE790 = (function () {
  'use strict';
  var C = { LAYER: 7, NEAR: 1.02, REFRESH: 0.5, GRID: 8, ACT_R: 760, DROP_R: 960, P_ON: 480, P_OFF: 600, NEW_CELLS: 4, SPAWNS: 40, INGEST_MS: 2.5, TARGET_EVERY: 15,
    P_R: 420, P_NEAR: 140, C_R: 760, C_NEAR: 220, T_R: 1400, F_R: 300, W_R: 1100, AGENTS: 1500, H_EVERY: 3, H_BUDGET: 1500, STEP: 25, CELL_CAP: { walk: 34, car: 34 },
    CAP: { personN: 240, personF: 420, prop: 12, dog: 48, car: 180, carF: 240, bus: 20, tram: 36, train: 48, sail: 12, motor: 12, ferry: 3, pigeon: 300, gull: 72, duck: 40 },
    SCALE: { pigeon: 1.7, gull: 1.4, duck: 1.4, person: 1.12, personFar: 1.3 },   /* a little larger than life, so a figure reads from her height (DRAFT) */
    SCATTER: { R: 30, AGL: 75, R3: 14, AIR: [9, 14], GULL_R: 26 },
    SIGNAL: { CYCLE: 40, RED: 18, STOP: 7 } };
  var D2R = Math.PI / 180;
  var X = null, st = { inited: false, enabled: true, fault: null, why: null, mode: 'off', t: 0, frame: 0, acc: 0, tgAcc: 0, tgtAcc: 0, f: null, ep: 0, tiles: new Map(), queue: [], cells: new Map(), agents: [], flocks: [], loops: [],
    lists: {}, mesh: {}, U: null, ids: 0, byId: new Map(), ms: [], msMax: 0, placeMs: 0, ingestMs: 0, ingestMax: 0, tilesIn: 0, scatters: 0, gullVeers: 0, lastScatter: null, refMax: 0, placeMax: 0, hooked: false, her: null, hour: 10, night: 0, spawned: 0, hBudget: 0, listenFault: null, hookFault: null };

  /* ---------- seeds (world-animals.js's: the same place gives the same life, on every visit and every phone) ---------- */
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(r, a) { return a[Math.floor(r() * a.length) % a.length]; }
  function hex(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; }

  /* ---------- the place: which side of the road, whose faces, which streetcar (DRAFT tables, Marth's pen) ---------- */
  var LEFT = [[49.8, 60.9, -10.7, 1.8], [24, 46, 122.9, 146], [-44, -10, 112, 154], [-47.5, -34, 166, 179], [6, 35.5, 68, 89], [23.5, 37, 60.8, 77.8], [20.5, 26.7, 88, 92.7], [5.6, 20.5, 97.3, 105.7],
    [-11, 7.4, 95, 141], [22.1, 22.6, 113.8, 114.5], [-35, -17, 15, 36], [-17, -8, 22, 41], [-11.8, 5, 29.3, 42], [17.6, 18.6, -78.5, -76.1], [20.9, 27.3, -80.5, -72.7], [10, 11.4, -62, -60.5], [13, 13.4, -59.7, -59.4], [1.2, 8.6, -61.5, -54], [34.5, 35.8, 32.2, 34.7], [35.8, 36.1, 14.1, 14.6]];
  function inBoxes(B, lat, lon) { for (var i = 0; i < B.length; i++) { var b = B[i]; if (lat >= b[0] && lat <= b[1] && lon >= b[2] && lon <= b[3]) return true; } return false; }
  var SKIN = { dark: [0x2e1a12, 0x3b2219, 0x4a2c1e, 0x5a3624, 0x6b412b, 0x7d4e33], mid: [0x6b412b, 0x8a5a3c, 0x9a6a48, 0xb5835e, 0xc69472], light: [0xb5835e, 0xcf9f7a, 0xe2b996, 0xf0cfb2, 0xf3d6c0], east: [0xc69472, 0xd8aa84, 0xe6bf9a, 0xf0cfb2],
    all: [0x3b2219, 0x5a3624, 0x7d4e33, 0x9a6a48, 0xb5835e, 0xcf9f7a, 0xe2b996, 0xf0cfb2] };
  function skins(lat, lon) {
    if (lat > 9 && lat < 27 && lon > -90 && lon < -59) return SKIN.dark;               // the Caribbean
    if (lat > -35 && lat < 17 && lon > -18 && lon < 52) return SKIN.dark;               // Africa south of the Sahara
    if (lat > 5 && lat < 37 && lon > 60 && lon < 92) return SKIN.mid;                   // South Asia
    if (lat > 18 && lat < 50 && lon > 98 && lon < 146) return SKIN.east;                // East Asia
    if (lat > 35 && lat < 71 && lon > -11 && lon < 45) return SKIN.light;               // Europe
    return SKIN.all;                                                                    // the Americas' cities and the rest: everyone
  }
  var TOPS = [0xf2c94c, 0x2d9cdb, 0xeb5757, 0x27ae60, 0xf7f7f2, 0xf2994a, 0x9b51e0, 0x56ccf2, 0x1d1d1f, 0xff8fab, 0x00a86b, 0x3a3f58, 0x8d6e63, 0xb0bec5, 0x7b1e3a, 0xd9c7a7].map(hex);
  var BOTS = [0x34508a, 0x2a3f6b, 0xc2b280, 0x222225, 0x4b4b50, 0x6b4f3a, 0x37474f, 0x1f2a44, 0x8d8d8d].map(hex);
  var CARS = [0xf4f4f2, 0xf4f4f2, 0x1b1b1d, 0x1b1b1d, 0xa9adb3, 0xa9adb3, 0x6d7278, 0xb3261e, 0x1f4e9a, 0x24452e, 0x7a5c3e, 0xd8c9a3, 0x2f6f8f].map(hex), TAXI = hex(0xf3c316);
  var TRAMS = [[0xd0201b, 0xf2f2ee], [0xf0c419, 0xf2f2ee], [0x1f5fa8, 0xf2f2ee], [0x2e8b57, 0xf2f2ee], [0xf2f2ee, 0xc8261d]].map(function (p) { return [hex(p[0]), hex(p[1])]; });
  var TRAINS = [[0x2f7d4f, 0xf2f2ee], [0xb9bec4, 0x1f4e9a], [0xb9bec4, 0xc8261d], [0x2b4a7a, 0xf0c419]].map(function (p) { return [hex(p[0]), hex(p[1])]; });
  var BUSES = [[0xd0201b, 0xf2f2ee], [0x1f5fa8, 0xf2f2ee], [0x2e8b57, 0xf2f2ee], [0xf2f2ee, 0x1f5fa8], [0xf0c419, 0x222222]].map(function (p) { return [hex(p[0]), hex(p[1])]; });
  var DOGS = [0x8a5a2b, 0x1d1d1d, 0xe8e0d0, 0xc8964f, 0x6b6b6b, 0xd9b77a].map(hex);
  var PIGEONS = [0x8b93a0, 0x7d8592, 0x9aa2ae, 0x6f7480, 0xa59a8c, 0xd8d8d4].map(hex), SHEEN = [0x4f8a6e, 0x6e4f8a, 0x5d7f86].map(hex);
  var SAILS = [0xf7f7f2, 0xf7f7f2, 0xeb5757, 0x2d9cdb, 0xf2c94c].map(hex), HULLS = [0xf4f4f2, 0x1f4e9a, 0xb3261e, 0x24452e, 0xf4f4f2].map(hex), FERRY = [hex(0xf4f4f2), hex(0x1f4e9a)];
  function torontoish(lat, lon) { return lat > 43.55 && lat < 43.86 && lon > -79.65 && lon < -79.1; }

  /* ---------- the hour, from the game's one clock (S.clock in [0, 2700): dawn 0-150, day 150-1800, dusk 1800-2100, night 2100-2700) ---------- */
  function hourOf(c) { c = ((c || 0) % 2700 + 2700) % 2700; if (c < 150) return 5 + 2 * c / 150; if (c < 1800) return 7 + 11 * (c - 150) / 1650; if (c < 2100) return 18 + 3 * (c - 1800) / 300; return (21 + 8 * (c - 2100) / 600) % 24; }
  function band(h, a, b, k) { return h >= a && h < b ? k : 0; }
  function peopleK(h) { if (h < 5) return 0.1; if (h < 7) return 0.35; if (h < 9.5) return 1.3; if (h < 16) return 1.0; if (h < 18.5) return 1.35; if (h < 21) return 0.75; return 0.3; }
  function carK(h) { if (h < 5) return 0.18; if (h < 7) return 0.5; if (h < 9.5) return 1.55; if (h < 16) return 1.0; if (h < 18.5) return 1.6; if (h < 21) return 0.7; return 0.35; }
  function nightOf(h) { if (h >= 20.5 || h < 5.5) return 1; if (h >= 18.5) return (h - 18.5) / 2; if (h < 7) return 1 - (h - 5.5) / 1.5; return 0; }

  /* ---------- the bodies: boxes with a part (who colours it), a joint (what moves it) and its pivot ---------- */
  function Body() { this.p = []; this.n = []; this.c = []; this.part = []; this.anim = []; this.piv = []; }
  Body.prototype.tri = function (a, b, c, col, part, anim, piv) { var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    for (var i = 0; i < 3; i++) { var q = i === 0 ? a : i === 1 ? b : c; this.p.push(q[0], q[1], q[2]); this.n.push(nx / l, ny / l, nz / l); this.c.push(col[0], col[1], col[2]); this.part.push(part || 0); this.anim.push(anim || 0); this.piv.push(piv || 0); } };
  Body.prototype.quad = function (a, b, c, d, col, part, anim, piv) { this.tri(a, b, c, col, part, anim, piv); this.tri(a, c, d, col, part, anim, piv); };
  Body.prototype.box = function (x0, x1, y0, y1, z0, z1, col, part, anim, piv, noBottom) { var A = [x0, y0, z0], B = [x1, y0, z0], Cc = [x1, y0, z1], D = [x0, y0, z1], E = [x0, y1, z0], F = [x1, y1, z0], G = [x1, y1, z1], H = [x0, y1, z1];
    this.quad(E, H, G, F, col, part, anim, piv); if (!noBottom) this.quad(A, B, Cc, D, col, part, anim, piv); this.quad(D, Cc, G, H, col, part, anim, piv); this.quad(B, A, E, F, col, part, anim, piv); this.quad(Cc, B, F, G, col, part, anim, piv); this.quad(A, D, H, E, col, part, anim, piv); };
  var W1 = [1, 1, 1], GLASS = [0.15, 0.19, 0.25], TYRE = [0.08, 0.08, 0.09], HEAD = [1.0, 0.96, 0.82], TAIL = [0.85, 0.06, 0.05], HAIR = [0.11, 0.08, 0.06], SHOE = [0.13, 0.12, 0.12];
  /* parts: 0 its own colour, 1 the instance's first colour (top, body), 2 its second (legs, stripe), 3 its third (skin), 4 a lamp (lit at night), 5 a window (lit at night) */
  /* joints: 1/2 legs, 3/4 arms (pivot y), 5/6 wings (pivot y, about the body's line), 7 a head that pecks */
  function personBody() { var b = new Body(), L = 0.88, S = 1.42;
    b.box(0.025, 0.165, 0.08, L, -0.07, 0.07, W1, 2, 1, L); b.box(-0.165, -0.025, 0.08, L, -0.07, 0.07, W1, 2, 2, L);
    b.box(0.02, 0.17, 0, 0.09, -0.08, 0.12, SHOE, 0, 1, L); b.box(-0.17, -0.02, 0, 0.09, -0.08, 0.12, SHOE, 0, 2, L);
    b.box(-0.19, 0.19, 0.8, 0.94, -0.11, 0.11, W1, 2); b.box(-0.2, 0.2, 0.92, 1.47, -0.115, 0.115, W1, 1);
    b.box(0.2, 0.3, 0.9, 1.45, -0.06, 0.06, W1, 1, 3, S); b.box(0.21, 0.29, 0.78, 0.9, -0.05, 0.05, W1, 3, 3, S);
    b.box(-0.3, -0.2, 0.9, 1.45, -0.06, 0.06, W1, 1, 4, S); b.box(-0.29, -0.21, 0.78, 0.9, -0.05, 0.05, W1, 3, 4, S);
    b.box(-0.11, 0.11, 1.5, 1.75, -0.11, 0.12, W1, 3); b.box(-0.06, 0.06, 1.45, 1.52, -0.05, 0.05, W1, 3, 0, 0, true);
    b.box(-0.12, 0.12, 1.69, 1.8, -0.125, 0.1, HAIR, 0, 0, 0, true); b.box(-0.12, 0.12, 1.5, 1.72, -0.135, -0.08, HAIR, 0, 0, 0, true);
    return b; }
  function personFar() { var b = new Body(); b.box(-0.19, 0.19, 0, 0.9, -0.1, 0.1, W1, 2, 0, 0, true); b.box(-0.22, 0.22, 0.9, 1.48, -0.12, 0.12, W1, 1, 0, 0, true); b.box(-0.11, 0.11, 1.48, 1.76, -0.1, 0.1, W1, 3, 0, 0, true); return b; }
  function guitarBody() { var b = new Body(), wd = [0.55, 0.3, 0.12], dk = [0.2, 0.12, 0.06]; b.box(-0.2, 0.12, 0.92, 1.28, 0.13, 0.22, wd); b.box(0.1, 0.62, 1.16, 1.22, 0.15, 0.2, dk); b.box(-0.06, 0.04, 1.06, 1.14, 0.219, 0.23, dk); return b; }
  function dogBody() { var b = new Body(), dk = [0.12, 0.1, 0.09], P = 0.34;
    b.box(-0.12, 0.12, 0.3, 0.54, -0.32, 0.3, W1, 1); b.box(-0.1, 0.1, 0.44, 0.66, 0.26, 0.48, W1, 1); b.box(-0.05, 0.05, 0.44, 0.53, 0.47, 0.6, dk);
    b.box(-0.1, -0.05, 0.6, 0.72, 0.28, 0.34, W1, 1); b.box(0.05, 0.1, 0.6, 0.72, 0.28, 0.34, W1, 1); b.box(-0.03, 0.03, 0.46, 0.66, -0.42, -0.3, W1, 1);
    b.box(0.05, 0.11, 0, P, 0.16, 0.24, W1, 1, 1, P); b.box(-0.11, -0.05, 0, P, 0.16, 0.24, W1, 1, 2, P); b.box(0.05, 0.11, 0, P, -0.28, -0.2, W1, 1, 2, P); b.box(-0.11, -0.05, 0, P, -0.28, -0.2, W1, 1, 1, P);
    return b; }
  function wheels(b, x, y, zs, r) { for (var i = 0; i < zs.length; i++) { b.box(x - 0.18, x, 0, y, zs[i] - r, zs[i] + r, TYRE); b.box(-x, -x + 0.18, 0, y, zs[i] - r, zs[i] + r, TYRE); } }
  function carBody() { var b = new Body();
    b.box(-0.9, 0.9, 0.28, 0.95, -2.2, 2.2, W1, 1); b.box(-0.82, 0.82, 0.95, 1.42, -1.1, 1.0, GLASS, 0, 0, 0, true); b.box(-0.8, 0.8, 1.42, 1.49, -1.05, 0.95, W1, 1, 0, 0, true);
    wheels(b, 0.95, 0.58, [1.35, -1.35], 0.31);
    b.box(0.42, 0.82, 0.6, 0.78, 2.19, 2.25, HEAD, 4); b.box(-0.82, -0.42, 0.6, 0.78, 2.19, 2.25, HEAD, 4); b.box(0.5, 0.86, 0.66, 0.82, -2.25, -2.19, TAIL, 4); b.box(-0.86, -0.5, 0.66, 0.82, -2.25, -2.19, TAIL, 4);
    return b; }
  function carFar() { var b = new Body(); b.box(-0.9, 0.9, 0.1, 0.95, -2.2, 2.2, W1, 1, 0, 0, true); b.box(-0.82, 0.82, 0.95, 1.45, -1.1, 1.0, GLASS, 0, 0, 0, true); b.box(-0.8, 0.8, 0.55, 0.8, 2.2, 2.32, HEAD, 4, 0, 0, true); b.box(-0.84, 0.84, 0.62, 0.84, -2.32, -2.2, TAIL, 4, 0, 0, true); return b; }
  function busBody() { var b = new Body(), roof = [0.86, 0.86, 0.84];
    b.box(-1.27, 1.27, 0.35, 3.05, -6, 6, W1, 1); b.box(-1.29, 1.29, 1.55, 2.6, -5.6, 5.4, GLASS, 5, 0, 0, true); b.box(-1.2, 1.2, 1.2, 2.8, 5.99, 6.04, GLASS, 5, 0, 0, true); b.box(-1.29, 1.29, 0.95, 1.2, -6, 6, W1, 2, 0, 0, true);
    b.box(-1.15, 1.15, 3.05, 3.2, -5.6, 5.6, roof, 0, 0, 0, true); wheels(b, 1.3, 0.95, [4.1, -3.6], 0.48);
    b.box(0.7, 1.15, 0.6, 0.85, 6.03, 6.1, HEAD, 4); b.box(-1.15, -0.7, 0.6, 0.85, 6.03, 6.1, HEAD, 4); b.box(0.75, 1.2, 0.7, 1.0, -6.1, -6.03, TAIL, 4); b.box(-1.2, -0.75, 0.7, 1.0, -6.1, -6.03, TAIL, 4);
    return b; }
  function tramBody() { var b = new Body(), roof = [0.5, 0.5, 0.52], dk = [0.1, 0.1, 0.11];
    b.box(-1.27, 1.27, 0.32, 1.45, -7, 7, W1, 1); b.box(-1.29, 1.29, 1.45, 2.55, -6.6, 6.6, GLASS, 5, 0, 0, true); b.box(-1.27, 1.27, 2.55, 3.1, -7, 7, W1, 1, 0, 0, true); b.box(-1.29, 1.29, 1.02, 1.2, -7, 7, W1, 2, 0, 0, true);
    b.box(-1.15, 1.15, 3.1, 3.32, -6.4, 6.4, roof, 0, 0, 0, true); b.box(-1.22, 1.22, 1.5, 2.6, 6.98, 7.04, GLASS, 5, 0, 0, true); b.box(-1.22, 1.22, 1.5, 2.6, -7.04, -6.98, GLASS, 5, 0, 0, true);
    b.box(-0.05, 0.05, 3.32, 4.25, -0.5, -0.4, dk, 0, 0, 0, true); b.box(-0.65, 0.65, 4.2, 4.28, -0.62, -0.3, dk, 0, 0, 0, true);
    b.box(0.75, 1.1, 0.55, 0.8, 7.0, 7.08, HEAD, 4); b.box(-1.1, -0.75, 0.55, 0.8, 7.0, 7.08, HEAD, 4); b.box(0.75, 1.1, 0.55, 0.8, -7.08, -7.0, TAIL, 4); b.box(-1.1, -0.75, 0.55, 0.8, -7.08, -7.0, TAIL, 4);
    return b; }
  function trainBody() { var b = new Body(), roof = [0.42, 0.43, 0.45]; b.box(-1.5, 1.5, 0.75, 3.9, -10.4, 10.4, W1, 1); b.box(-1.52, 1.52, 2.0, 2.95, -9.8, 9.8, GLASS, 5, 0, 0, true); b.box(-1.53, 1.53, 1.3, 1.6, -10.4, 10.4, W1, 2, 0, 0, true);
    b.box(-1.3, 1.3, 3.9, 4.15, -10, 10, roof, 0, 0, 0, true); b.box(-1.3, 1.3, 0.1, 0.75, -8.6, -5.6, TYRE, 0, 0, 0, true); b.box(-1.3, 1.3, 0.1, 0.75, 5.6, 8.6, TYRE, 0, 0, 0, true);
    b.box(-0.9, 0.9, 0.9, 1.15, 10.38, 10.45, HEAD, 4); b.box(-0.9, 0.9, 0.9, 1.15, -10.45, -10.38, TAIL, 4); return b; }
  var FOAM = [0.88, 0.94, 0.96];
  function sailBody() { var b = new Body(), dk = [0.3, 0.3, 0.32]; b.box(-1.1, 1.1, 0, 0.85, -3.4, 2.6, W1, 2); b.tri([-1.1, 0.85, 2.6], [0, 0.85, 4.2], [1.1, 0.85, 2.6], W1, 2); b.tri([-1.1, 0, 2.6], [1.1, 0, 2.6], [0, 0.85, 4.2], W1, 2);
    b.box(-0.05, 0.05, 0.85, 9.5, 0.6, 0.7, dk, 0, 0, 0, true); b.tri([0, 1.4, 0.55], [0, 9.3, 0.55], [0, 1.4, -3.0], W1, 1); b.tri([0, 1.4, 0.75], [0, 7.8, 0.75], [0, 1.4, 3.6], W1, 1); return b; }
  function motorBody() { var b = new Body(); b.box(-1.1, 1.1, 0, 1.0, -3.2, 2.4, W1, 2); b.tri([-1.1, 1.0, 2.4], [0, 1.0, 4.0], [1.1, 1.0, 2.4], W1, 2); b.tri([-1.1, 0, 2.4], [1.1, 0, 2.4], [0, 1.0, 4.0], W1, 2);
    b.box(-0.8, 0.8, 1.0, 1.75, -1.2, 1.0, [0.95, 0.95, 0.93], 0, 0, 0, true); b.box(-0.78, 0.78, 1.15, 1.6, 0.98, 1.04, GLASS, 5, 0, 0, true); b.box(-0.5, 0.5, 1.2, 1.4, 2.0, 2.1, HEAD, 4, 0, 0, true);
    b.quad([-1.0, 0.06, -3.2], [1.0, 0.06, -3.2], [3.6, 0.06, -18], [-3.6, 0.06, -18], FOAM); return b; }
  function ferryBody() { var b = new Body(), wh = [0.95, 0.95, 0.93]; b.box(-4.5, 4.5, 0, 2.2, -13, 12, W1, 1); b.tri([-4.5, 2.2, 12], [0, 2.2, 16], [4.5, 2.2, 12], W1, 1); b.tri([-4.5, 0, 12], [4.5, 0, 12], [0, 2.2, 16], W1, 1);
    b.box(-4.2, 4.2, 2.2, 4.6, -11, 10, wh, 0, 0, 0, true); b.box(-4.25, 4.25, 3.0, 4.0, -10.5, 9.5, GLASS, 5, 0, 0, true); b.box(-3.5, 3.5, 4.6, 6.6, -7, 6, wh, 0, 0, 0, true); b.box(-3.55, 3.55, 5.3, 6.1, -6.5, 5.5, GLASS, 5, 0, 0, true);
    b.box(-0.5, 0.5, 6.6, 9.5, -3, -2, W1, 2, 0, 0, true); b.quad([-4.4, 0.06, -13], [4.4, 0.06, -13], [11, 0.06, -60], [-11, 0.06, -60], FOAM); return b; }
  function pigeonBody() { var b = new Body(), beak = [0.25, 0.22, 0.2], P = 0.155, WP = 0.18;
    b.box(-0.07, 0.07, 0.06, 0.2, -0.12, 0.12, W1, 1); b.box(-0.05, 0.05, 0.1, 0.15, -0.24, -0.1, [0.62, 0.62, 0.66], 1, 0, 0, true);
    b.box(-0.055, 0.055, 0.14, 0.23, 0.05, 0.14, W1, 2, 7, P); b.box(-0.045, 0.045, 0.19, 0.29, 0.1, 0.2, [0.8, 0.82, 0.86], 1, 7, P); b.box(-0.012, 0.012, 0.215, 0.235, 0.2, 0.24, beak, 0, 7, P, true);
    b.box(0.065, 0.32, 0.17, 0.19, -0.11, 0.08, [0.86, 0.87, 0.9], 1, 5, WP); b.box(-0.32, -0.065, 0.17, 0.19, -0.11, 0.08, [0.86, 0.87, 0.9], 1, 6, WP);
    b.box(-0.04, 0.04, 0, 0.06, -0.01, 0.04, [0.78, 0.42, 0.42], 0, 0, 0, true); return b; }
  function gullBody() { var b = new Body(), gr = [0.62, 0.65, 0.7], tip = [0.12, 0.12, 0.13], yel = [0.95, 0.75, 0.15], WP = 0.12;
    b.box(-0.08, 0.08, 0.04, 0.18, -0.26, 0.24, [0.97, 0.97, 0.95]); b.box(-0.06, 0.06, 0.1, 0.22, 0.2, 0.34, [0.97, 0.97, 0.95]); b.box(-0.015, 0.015, 0.13, 0.16, 0.33, 0.42, yel, 0, 0, 0, true);
    b.box(0.07, 0.62, 0.11, 0.13, -0.12, 0.1, gr, 0, 5, WP); b.box(0.62, 0.82, 0.11, 0.13, -0.1, 0.05, tip, 0, 5, WP); b.box(-0.62, -0.07, 0.11, 0.13, -0.12, 0.1, gr, 0, 6, WP); b.box(-0.82, -0.62, 0.11, 0.13, -0.1, 0.05, tip, 0, 6, WP);
    b.box(-0.06, 0.06, 0.09, 0.13, -0.38, -0.24, [0.97, 0.97, 0.95], 0, 0, 0, true); return b; }
  function duckBody() { var b = new Body(); b.box(-0.12, 0.12, 0, 0.17, -0.2, 0.18, W1, 1); b.box(-0.06, 0.06, 0.12, 0.3, 0.12, 0.26, W1, 2); b.box(-0.03, 0.03, 0.17, 0.21, 0.26, 0.34, [0.95, 0.68, 0.12], 0, 0, 0, true); b.box(-0.08, 0.08, 0.1, 0.16, -0.27, -0.18, W1, 1, 0, 0, true); return b; }

  /* ---------- the one program: Lambert, the travel ground's shrink-and-curve (world-traffic.js's), the pose in the vertex shader, the lamps at night ---------- */
  function OBC(sh) {
    var U = st.U, NL = String.fromCharCode(10), R = window.WFR_TRAVEL712 && WFR_TRAVEL712.C ? WFR_TRAVEL712.C.REFR : 1e30;
    sh.uniforms.uEye790 = U.eye; sh.uniforms.uInvK790 = U.invK; sh.uniforms.uT790 = U.t; sh.uniforms.uGlow790 = U.glow;
    sh.vertexShader = ['attribute float aPart790; attribute float aAnim790; attribute float aPiv790; attribute vec4 iA790; attribute vec3 iC1790; attribute vec3 iC2790; attribute vec3 iC3790;',
      'uniform vec3 uEye790; uniform float uInvK790; uniform float uT790; uniform float uGlow790; varying float vGlow790;',
      'vec3 rotX790( vec3 p, float py, float a ) { float c = cos( a ), s = sin( a ), y = p.y - py; return vec3( p.x, py + y * c - p.z * s, y * s + p.z * c ); }',
      'vec3 rotZ790( vec3 p, float py, float a ) { float c = cos( a ), s = sin( a ), y = p.y - py; return vec3( p.x * c - y * s, py + p.x * s + y * c, p.z ); }'].join(NL) + NL + sh.vertexShader
      .replace('#include <color_vertex>', ['#include <color_vertex>', 'vGlow790 = 0.0;', '#ifdef USE_COLOR',
        'if ( aPart790 > 0.5 && aPart790 < 3.5 ) vColor.rgb *= aPart790 < 1.5 ? iC1790 : aPart790 < 2.5 ? iC2790 : iC3790;',
        'vGlow790 = aPart790 > 4.5 ? uGlow790 * 0.85 : aPart790 > 3.5 ? uGlow790 * 1.8 : 0.0;', '#endif'].join(NL))
      .replace('#include <begin_vertex>', ['#include <begin_vertex>',
        'float md790 = iA790.w, tt790 = uT790 * iA790.z + iA790.x, sit790 = ( md790 > 1.5 && md790 < 2.5 ) ? 1.0 : 0.0;',
        'if ( aAnim790 > 0.5 ) {',
        '  if ( aAnim790 < 2.5 ) { float g790 = aAnim790 < 1.5 ? 1.0 : -1.0; float a790 = md790 < 0.5 ? sin( tt790 ) * iA790.y * g790 : 0.0; if ( sit790 > 0.5 ) a790 = -1.45; transformed = rotX790( transformed, aPiv790, a790 ); }',
        '  else if ( aAnim790 < 4.5 ) { float g790 = aAnim790 < 3.5 ? 1.0 : -1.0; float a790 = md790 < 0.5 ? -sin( tt790 ) * iA790.y * 0.8 * g790 : md790 < 1.5 ? sin( uT790 * 0.9 + iA790.x ) * 0.06 : md790 < 2.5 ? -0.35 : ( aAnim790 < 3.5 ? -1.15 : -0.75 + sin( uT790 * 11.0 + iA790.x ) * 0.3 ); transformed = rotX790( transformed, aPiv790, a790 ); }',
        '  else if ( aAnim790 < 6.5 ) { float g790 = aAnim790 < 5.5 ? 1.0 : -1.0; if ( md790 > 5.5 ) { transformed.x = g790 * 0.06 + ( transformed.x - g790 * 0.06 ) * 0.18; } else { float a790 = md790 > 4.5 ? 0.1 + sin( tt790 * 0.3 ) * 0.06 : sin( tt790 ) * 0.85; transformed = rotZ790( transformed, aPiv790, a790 * g790 ); } }',
        '  else if ( aAnim790 < 7.5 ) { float a790 = ( md790 > 5.5 && md790 < 6.5 ) ? max( 0.0, sin( tt790 ) ) * 1.1 : 0.0; transformed = rotX790( transformed, aPiv790, a790 ); }',
        '}',
        'if ( md790 < 0.5 ) transformed.y += abs( cos( tt790 ) ) * 0.05 * iA790.y;',
        'if ( sit790 > 0.5 ) transformed.y -= 0.74;'].join(NL))
      .replace('#include <project_vertex>', ['vec4 wp790 = vec4( transformed, 1.0 );', '#ifdef USE_INSTANCING', 'wp790 = instanceMatrix * wp790;', '#endif', 'wp790 = modelMatrix * wp790;',
        'vec3 r790 = wp790.xyz - uEye790; float d790 = length( r790.xz );', 'r790.y -= d790 * d790 / ( 2.0 * ' + R.toFixed(1) + ' );',
        'float s790 = max( uInvK790, min( 1.0, ' + C.NEAR.toFixed(2) + ' / max( length( r790 ), 0.001 ) ) );', 'wp790.xyz = uEye790 + r790 * s790;',
        'vec4 mvPosition = viewMatrix * wp790;', 'gl_Position = projectionMatrix * mvPosition;'].join(NL))
      .replace('#include <fog_vertex>', '#include <fog_vertex>' + NL + '#ifdef USE_FOG' + NL + '  fogDepth /= s790;' + NL + '#endif');
    sh.fragmentShader = 'varying float vGlow790;' + NL + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + NL + '#ifdef USE_COLOR' + NL + 'totalEmissiveRadiance += vColor.rgb * vGlow790;' + NL + '#endif');
  }
  function meshOf(name, b, cap) {
    var THREE = X.THREE, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b.p), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(b.n), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(b.c), 3));
    g.setAttribute('aPart790', new THREE.BufferAttribute(new Float32Array(b.part), 1)); g.setAttribute('aAnim790', new THREE.BufferAttribute(new Float32Array(b.anim), 1)); g.setAttribute('aPiv790', new THREE.BufferAttribute(new Float32Array(b.piv), 1));
    var iA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4), c1 = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3), c2 = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3), c3 = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    [iA, c1, c2, c3].forEach(function (a) { a.setUsage(THREE.DynamicDrawUsage); }); g.setAttribute('iA790', iA); g.setAttribute('iC1790', c1); g.setAttribute('iC2790', c2); g.setAttribute('iC3790', c3);
    var im = new THREE.InstancedMesh(g, st.mat, cap); im.name = 'life790:' + name; im.count = 0; im.visible = false; im.frustumCulled = false; im.matrixAutoUpdate = false; im.castShadow = false; im.receiveShadow = false; im.layers.set(C.LAYER); im.renderOrder = -9.35; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);   /* before the travel pass's depth clear (-9.3), as the trees and the city do: the buildings hide what is behind them */
    im.userData.tris = b.p.length / 9; im.userData.cap = cap; st.root.add(im); st.mesh[name] = im; st.lists[name] = []; return im;
  }

  /* ---------- a tile of the map, read once into metres round its own centre (x east, z south, like the frame) ---------- */
  var KY = 111132, CAR_W = { motorway: 3.0, trunk: 2.2, primary: 1.6, secondary: 1.2, tertiary: 0.8, minor: 0.35, busway: 0.2 },   /* service ways (alleys, drives, garages) carry no one: they run through buildings */
    WALK = { primary: 1, secondary: 1, tertiary: 1, minor: 1 }, SPEED = { motorway: 27, trunk: 22, primary: 14, secondary: 12.5, tertiary: 11, minor: 8, service: 5, busway: 11 },
    SIGNAL = { primary: 1, secondary: 1, tertiary: 1 }, TRAMNEAR = { primary: 1, secondary: 1, tertiary: 1, minor: 1, busway: 1 };
  function tileBounds(z, x, y) { var n = Math.pow(2, z), lon0 = x / n * 360 - 180, lon1 = (x + 1) / n * 360 - 180, la = function (yy) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * yy / n))) / D2R; }; return { lat0: la(y + 1), lat1: la(y), lon0: lon0, lon1: lon1 }; }
  function Tile(z, x, y, feed) {
    var b = tileBounds(z, x, y); this.key = z + '/' + x + '/' + y; this.z = z; this.x = x; this.y = y; this.feed = feed; this.lat = (b.lat0 + b.lat1) / 2; this.lon = (b.lon0 + b.lon1) / 2; this.KX = 111320 * Math.cos(this.lat * D2R);
    this.x0 = (b.lon0 - this.lon) * this.KX; this.x1 = (b.lon1 - this.lon) * this.KX; this.z0 = (this.lat - b.lat1) * KY; this.z1 = (this.lat - b.lat0) * KY; this.cw = (this.x1 - this.x0) / C.GRID; this.ch = (this.z1 - this.z0) / C.GRID;
    this.paths = []; this.bgrid = new Map(); this.grid = new Map(); this.rgrid = new Map(); this.jmap = new Map(); this.lu = []; this.park = []; this.water = []; this.pois = []; this.nb = new Int16Array(C.GRID * C.GRID); this.hmax = new Float32Array(C.GRID * C.GRID);
    this.cells = null; this.ready = false; this.phase = 0; this.i = 0; this.j = 0; this.A = null; this.left = inBoxes(LEFT, this.lat, this.lon); this.skins = skins(this.lat, this.lon); this.toronto = torontoish(this.lat, this.lon); this.r = rng(hash('life790/' + this.key));
    var rr = rng(hash('life790c/' + Math.round(this.lat * 4) + '/' + Math.round(this.lon * 4))); this.tram = this.toronto ? TRAMS[0] : pick(rr, TRAMS); this.train = pick(rr, TRAINS); this.bus = this.toronto ? BUSES[0] : pick(rr, BUSES); this.taxi = this.lat > 25 && this.lat < 50 && this.lon < -60 ? 0.08 : 0.03;
  }
  Tile.prototype.m = function (lat, lon, out) { out[0] = (lon - this.lon) * this.KX; out[1] = (this.lat - lat) * KY; return out; };
  Tile.prototype.ll = function (mx, mz) { return { lat: this.lat - mz / KY, lon: this.lon + mx / this.KX }; };
  Tile.prototype.anchor = function () {   // the frame's metres for this tile's metres: local = O + [a b; c d] (mx, mz); made again at each recentre
    if (this.A && this.A.ep === st.ep) return this.A; var W = window.WFR_WORLD, f = st.f, o = W.toLocal(f, this.lat, this.lon), e = W.toLocal(f, this.lat, this.lon + 0.01), s = W.toLocal(f, this.lat - 0.01, this.lon), kx = 0.01 * this.KX, ky = 0.01 * KY;
    var A = { ep: st.ep, ox: o.x, oz: o.z, a: (e.x - o.x) / kx, c: (e.z - o.z) / kx, b: (s.x - o.x) / ky, d: (s.z - o.z) / ky }; A.det = A.a * A.d - A.b * A.c; this.A = A; return A; };
  Tile.prototype.her = function () {   // her place in this tile's metres (once a frame)
    if (this.hf === st.frame && this.hep === st.ep) return this.hm; var A = this.anchor(), P = X.S.pos, dx = P.x - A.ox, dz = P.z - A.oz; this.hm = this.hm || [0, 0]; this.hm[0] = (A.d * dx - A.b * dz) / A.det; this.hm[1] = (-A.c * dx + A.a * dz) / A.det; this.hf = st.frame; this.hep = st.ep; return this.hm; };
  function gkey(mx, mz, s) { return Math.floor(mx / s) + ',' + Math.floor(mz / s); }
  var GS = 25;
  function mkPath(T, ll, cls, w, kind) {
    var n = ll.length / 2; if (n < 2) return null; var pts = [], cum = [], ov = [], q = [0, 0], px = null, pz = null, L = 0, i;
    for (i = 0; i < n; i++) { T.m(ll[2 * i + 1], ll[2 * i], q); var x = q[0], z = q[1];
      if (px !== null) { var dx = x - px, dz = z - pz, d = Math.sqrt(dx * dx + dz * dz); if (d < 0.05) continue; var k = Math.ceil(d / C.STEP); for (var j = 1; j < k; j++) { pts.push(px + dx * j / k, pz + dz * j / k); L += d / k; cum.push(L); } L += d / k; }
      pts.push(x, z); cum.push(L); ov.push(pts.length / 2 - 1); px = x; pz = z; }
    if (L < 12 || pts.length < 4) return null;
    var P = { id: ++st.ids, T: T, cls: cls, w: w, kind: kind, m: new Float32Array(pts), cum: new Float32Array(cum), len: L, ov: ov, hy: null, hT: -1e9, junc: null, jax: null, stops: null, dirOnly: 0, cells: null, act: false, nAg: 0 };
    return P;
  }
  function indexSegs(G, P) { for (var k = 0; k + 1 < P.cum.length; k++) { var x = (P.m[2 * k] + P.m[2 * k + 2]) / 2, z = (P.m[2 * k + 1] + P.m[2 * k + 3]) / 2, key = gkey(x, z, GS), L = G.get(key); if (!L) G.set(key, L = []); L.push(P, k); } }
  function nearSeg(G, x, z, rad, test) {   // the nearest segment to a point in a tile's grid: { P, k, d, t, tx, tz }
    var best = null, bd = rad * rad, gx = Math.floor(x / GS), gz = Math.floor(z / GS);
    for (var a = -1; a <= 1; a++) for (var c = -1; c <= 1; c++) { var L = G.get((gx + a) + ',' + (gz + c)); if (!L) continue;
      for (var q = 0; q < L.length; q += 2) { var P = L[q], k = L[q + 1]; if (test && !test(P)) continue; var x0 = P.m[2 * k], z0 = P.m[2 * k + 1], ex = P.m[2 * k + 2] - x0, ez = P.m[2 * k + 3] - z0, l2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((x - x0) * ex + (z - z0) * ez) / l2)), dx = x0 + ex * t - x, dz = z0 + ez * t - z, d2 = dx * dx + dz * dz;
        if (d2 < bd) { bd = d2; var l = Math.sqrt(l2); best = { P: P, k: k, d: Math.sqrt(d2), t: t, tx: ex / l, tz: ez / l, vx: x - (x0 + ex * t), vz: z - (z0 + ez * t) }; } } }
    return best;
  }
  function polyM(T, rings) { var out = [], q = [0, 0], x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (var i = 0; i < rings.length; i++) { var r = rings[i], m = new Float32Array(r.length); for (var k = 0; k < r.length; k += 2) { T.m(r[k + 1], r[k], q); m[k] = q[0]; m[k + 1] = q[1]; if (!i) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < z0) z0 = q[1]; if (q[1] > z1) z1 = q[1]; } } out.push(m); }
    var A = 0, o = out[0]; for (var j = 0, n = o.length / 2; j < n; j++) { var a = j * 2, b = ((j + 1) % n) * 2; A += o[a] * o[b + 1] - o[b] * o[a + 1]; } return { rings: out, x0: x0, x1: x1, z0: z0, z1: z1, area: Math.abs(A) / 2 }; }
  function inRing(r, x, z) { var c = false, n = r.length / 2; for (var i = 0, j = n - 1; i < n; j = i++) { var xi = r[2 * i], zi = r[2 * i + 1], xj = r[2 * j], zj = r[2 * j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
  function inPoly(p, x, z) { if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1 || !inRing(p.rings[0], x, z)) return false; for (var h = 1; h < p.rings.length; h++) if (inRing(p.rings[h], x, z)) return false; return true; }
  var BS = 30;
  function addB(T, p) { if (p.area < 12) return; for (var gx = Math.floor(p.x0 / BS); gx <= Math.floor(p.x1 / BS); gx++) for (var gz = Math.floor(p.z0 / BS); gz <= Math.floor(p.z1 / BS); gz++) { var k = gx + ',' + gz, L = T.bgrid.get(k); if (!L) T.bgrid.set(k, L = []); L.push(p); } }
  function inB(T, x, z) { var L = T.bgrid.get(Math.floor(x / BS) + ',' + Math.floor(z / BS)); if (!L) return false; for (var i = 0; i < L.length; i++) if (inPoly(L[i], x, z)) return true; return false; }   /* inside a building's footprint (no one stands in a wall) */
  function polyAt(L, x, z) { for (var i = 0; i < L.length; i++) if (inPoly(L[i], x, z)) return L[i]; return null; }

  /* the map's tile, read in slices (C.INGEST_MS a frame): roads and rails into paths, junctions, trams, land use, cells, water */
  function ingest(T, until) {
    var F = T.feed, R = F.roads || [], q = [0, 0], P, i;
    while (performance.now() < until) {
      if (T.phase === 0) {   // roads, paths, rails, rivers
        if (T.i >= R.length) { T.phase = 1; T.i = 0; continue; } var rd = R[T.i], cls = rd.cls, kind = CAR_W[cls] != null || WALK[cls] ? 'road' : cls === 'path' ? 'path' : cls === 'rail' || cls === 'transit' ? 'rail' : cls === 'water' && rd.width >= 9 ? 'river' : null;
        if (kind && T.j < rd.lines.length) { P = mkPath(T, rd.lines[T.j], cls, rd.width || 6, kind); T.j++; if (P) { P.sub = rd.sub || null; T.paths.push(P); if (kind === 'road') { indexSegs(T.grid, P); for (i = 0; i < P.ov.length; i++) { var vi = P.ov[i], jk = Math.round(P.m[2 * vi]) + ',' + Math.round(P.m[2 * vi + 1]); T.jmap.set(jk, (T.jmap.get(jk) || 0) + 1); } } else if (kind === 'rail') indexSegs(T.rgrid, P); } continue; }
        T.i++; T.j = 0; continue; }
      if (T.phase === 1) {   // junctions (a vertex two roads share) with the axis their light keeps; then the rails: a rail IN a street is a tram
        if (T.i >= T.paths.length) { T.phase = 2; T.i = 0; continue; } P = T.paths[T.i++];
        if (P.kind === 'road' && SIGNAL[P.cls]) { var js = [], ax = [], jp = []; for (i = 0; i < P.ov.length; i++) { var v = P.ov[i], vk = Math.round(P.m[2 * v]) + ',' + Math.round(P.m[2 * v + 1]); if ((T.jmap.get(vk) || 0) >= 2 && P.cum[v] > 8 && P.cum[v] < P.len - 8) { var v2 = Math.min(v + 1, P.cum.length - 1), v1 = v2 - 1; js.push(P.cum[v]); ax.push(Math.abs(P.m[2 * v2] - P.m[2 * v1]) > Math.abs(P.m[2 * v2 + 1] - P.m[2 * v1 + 1]) ? 1 : 0); jp.push((hash(T.key + '/' + vk) % 400) / 10); } } if (js.length) { P.junc = new Float32Array(js); P.jax = ax; P.jph = jp; } }
        if (P.kind === 'rail') { var n = 0, hit = 0, vote = 0, offs = 0;
          for (var s = 5; s < P.len; s += 15) { var pt = pathAt(P, s, null), ns = nearSeg(T.grid, pt.x, pt.z, 8, function (Q) { return TRAMNEAR[Q.cls]; }); n++; if (ns) { hit++; var side = ns.vx * -ns.tz + ns.vz * ns.tx, al = ns.tx * pt.tx + ns.tz * pt.tz; vote += (side > 0 ? 1 : -1) * (al > 0 ? 1 : -1); offs += Math.abs(side); } }
          var subK = P.sub === 'tram' || P.sub === 'light_rail' ? 'tram' : P.sub === 'subway' || P.sub === 'monorail' || P.sub === 'funicular' ? 'train' : null;   /* the map's own word first (OpenMapTiles' transit class, fed by world-features.js), the street test second */
          if (subK === 'tram' || (!subK && n >= 2 && hit / n >= 0.6)) { P.kind = 'tram'; if (offs / Math.max(1, hit) > 0.8 && Math.abs(vote) > hit * 0.4) P.dirOnly = (vote > 0 ? 1 : -1) * (T.left ? -1 : 1); } else P.kind = 'train'; }
        if (P.kind === 'tram' || (P.kind === 'road' && (P.cls === 'primary' || P.cls === 'secondary'))) { var sp = P.kind === 'tram' ? 360 : 420, s0 = 40 + T.r() * sp * 0.6, ss = []; for (var u = s0; u < P.len - 30; u += sp) ss.push(u); if (ss.length) P.stops = new Float32Array(ss); }
        continue; }
      if (T.phase === 2) {   // land use, parks, water, buildings, shops
        var lu = F.landuse || [], lc = F.landcover || [], wa = F.water || [], bu = F.buildings || [], po = F.pois || [], all = lu.length + lc.length + wa.length, k0 = T.i;
        if (k0 < lu.length) { var L1 = lu[k0], c1 = L1.cls || ''; if (L1.rings && L1.rings[0] && L1.rings[0].length >= 6) { var pm = polyM(T, L1.rings); pm.cls = /commercial|retail/.test(c1) ? 'core' : /residential|school|university|college|kindergarten|hospital|library|neighbourhood|suburb|quarter/.test(c1) ? 'res' : /industrial|garages|railway|military/.test(c1) ? 'ind' : /playground|pitch|stadium|theme_park|zoo|cemetery/.test(c1) ? 'park' : null; if (pm.cls === 'park') T.park.push(pm); else if (pm.cls) T.lu.push(pm); } T.i++; continue; }
        if (k0 < lu.length + lc.length) { var L2 = lc[k0 - lu.length], k2 = L2.subclass || ''; if (/park|garden|recreation_ground|village_green|playground/.test(k2) && L2.rings && L2.rings[0] && L2.rings[0].length >= 6) { var pp = polyM(T, L2.rings); pp.cls = 'park'; if (pp.area > 1500) T.park.push(pp); } T.i++; continue; }
        if (k0 < all) { var L3 = wa[k0 - lu.length - lc.length]; if (L3.rings && L3.rings[0] && L3.rings[0].length >= 6 && L3.cls !== 'swimming_pool') { var pw = polyM(T, L3.rings); pw.cls = L3.cls; if (pw.area > 600) T.water.push(pw); } T.i++; continue; }
        var b0 = k0 - all, b1 = Math.min(bu.length, b0 + 300);   /* the buildings, 300 a slice: only where they stand and how tall (a town's density) */
        for (i = b0; i < b1; i++) { var r0 = bu[i].rings && bu[i].rings[0]; if (!r0 || r0.length < 2) continue; T.m(r0[1], r0[0], q); var ci = Math.floor((q[0] - T.x0) / T.cw), cj = Math.floor((q[1] - T.z0) / T.ch); if (ci < 0 || cj < 0 || ci >= C.GRID || cj >= C.GRID) continue; var cc = cj * C.GRID + ci; T.nb[cc]++; if ((bu[i].h || 0) > T.hmax[cc]) T.hmax[cc] = bu[i].h || 0; addB(T, polyM(T, [r0])); }
        if (b1 < bu.length) { T.i = all + b1; continue; }
        for (i = 0; i < po.length; i++) { T.m(po[i].lat, po[i].lon, q); T.pois.push([q[0], q[1]]); }
        T.phase = 3; T.i = 0; T.cells = []; continue; }
      if (T.phase === 3) { makeCell(T, T.i++); if (T.i >= C.GRID * C.GRID) { T.phase = 4; T.i = 0; } continue; }
      if (T.phase === 4) {   // the paths sampled into the cells (every 20 m, inside the tile's own bounds: the buffer belongs to the neighbour)
        if (T.i >= T.paths.length) { T.phase = 5; T.i = 0; continue; } P = T.paths[T.i++]; var cs = null;
        if (P.kind === 'path') { var ins = 0, tot = 0; for (var s3 = 3; s3 < P.len; s3 += 10) { var p3 = pathAt(P, s3, null); tot++; if (inB(T, p3.x, p3.z)) ins++; } if (ins > tot * 0.25) { P.kind = 'indoor'; continue; } }   /* a footway through buildings (a mall, an underground walk): nobody is drawn there */
        for (var s2 = 6; s2 < P.len - 4; s2 += 20) { var p2 = pathAt(P, s2, null), c2 = cellAt(T, p2.x, p2.z); if (!c2) continue;
          if (P.kind === 'road') { if (WALK[P.cls]) c2.walk.push(P, s2); if (CAR_W[P.cls] != null) { c2.car.push(P, s2); c2.carW += CAR_W[P.cls] * 20; } if ((P.cls === 'primary' || P.cls === 'secondary') && P.stops) c2.bus.push(P, s2); }
          else if (P.kind === 'path') c2.path.push(P, s2);
          else { if (!cs) cs = []; if (cs.indexOf(c2) < 0) cs.push(c2); } }
        if (cs) { P.cells = cs; for (var w2 = 0; w2 < cs.length; w2++) cs[w2].transit.push(P); }
        if (P.stops) for (var u2 = 0; u2 < P.stops.length; u2++) { var ps = pathAt(P, P.stops[u2], null), cst = cellAt(T, ps.x, ps.z); if (cst) cst.stops.push(P, P.stops[u2]); }
        continue; }
      if (T.phase === 5) { if (T.i < T.water.length) { waterLife(T, T.i++); continue; } T.phase = 6; T.ready = true; T.feed = null; st.tilesIn++; return true; }
      return true;
    }
    return T.ready;
  }
  function cellAt(T, x, z) { var ci = Math.floor((x - T.x0) / T.cw), cj = Math.floor((z - T.z0) / T.ch); if (ci < 0 || cj < 0 || ci >= C.GRID || cj >= C.GRID) return null; return T.cells[cj * C.GRID + ci]; }
  function makeCell(T, i) {
    { var ci = i % C.GRID, cj = Math.floor(i / C.GRID), cx = T.x0 + (ci + 0.5) * T.cw, cz = T.z0 + (cj + 0.5) * T.ch, votes = { core: 0, res: 0, ind: 0, park: 0 }, pts = [[0, 0], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]];
      for (var k = 0; k < 5; k++) { var x = cx + pts[k][0] * T.cw, z = cz + pts[k][1] * T.ch, p = polyAt(T.park, x, z) || polyAt(T.lu, x, z); if (p) votes[p.cls]++; }
      var nb = T.nb[i], lu = 'none', best = 0; for (var v in votes) if (votes[v] > best) { best = votes[v]; lu = v; }
      if (lu === 'none' && nb >= 25) lu = 'res'; if ((lu === 'res' || lu === 'none') && (T.hmax[i] > 45 || nb >= 90)) lu = 'core'; if (lu === 'none' && nb >= 6) lu = 'res';
      var parkPts = []; if (T.park.length) { var rr = rng(hash('pk/' + T.key + '/' + i)); for (var a = 0; a < 12 && parkPts.length < 6; a++) { var px = cx + (rr() - 0.5) * T.cw, pz = cz + (rr() - 0.5) * T.ch; if (polyAt(T.park, px, pz) && !polyAt(T.water, px, pz)) parkPts.push(px, pz); } }
      T.cells.push({ key: T.key + '#' + i, T: T, i: i, cx: cx, cz: cz, lu: lu, nb: nb, walk: [], car: [], carW: 0, path: [], bus: [], stops: [], transit: [], parkPts: parkPts, loops: [], gulls: [], ducks: [], active: false, people: false, agents: [], flocks: [], tg: null, tgAt: -1e9, seed: hash('cell790/' + T.key + '/' + i) }); }
  }
  function waterLife(T, w) {   // one water of the tile: boats on loops, gulls by the shore, ducks on the ponds (seeded by the tile and the water)
    var r = rng(hash('w790/' + T.key + '/' + w)), town = 0, i; for (i = 0; i < T.nb.length; i++) town += T.nb[i];
    { var p = T.water[w], o = p.rings[0], n = o.length / 2, small = p.area < 60000;
      var shoreAt = function (inMin, inMax) { for (var a = 0; a < 24; a++) { var k = Math.floor(r() * n), vx = o[2 * k], vz = o[2 * k + 1]; if (vx - T.x0 < 25 || T.x1 - vx < 25 || vz - T.z0 < 25 || T.z1 - vz < 25) continue; var ang = r() * 6.283, d = inMin + r() * (inMax - inMin), x = vx + Math.cos(ang) * d, z = vz + Math.sin(ang) * d; if (x > T.x0 && x < T.x1 && z > T.z0 && z < T.z1 && inPoly(p, x, z)) return [x, z]; } return null; };
      var loopOk = function (x, z, R) { for (var a = 0; a < 8; a++) if (!inPoly(p, x + Math.cos(a * 0.785) * R, z + Math.sin(a * 0.785) * R)) return false; return true; };
      if (small) { if (r() < 0.8) { var dp = shoreAt(4, 18); if (dp) { var cd = cellAt(T, dp[0], dp[1]); if (cd) cd.ducks.push({ x: dp[0], z: dp[1], n: 3 + Math.floor(r() * 5) }); } } return; }
      var nBoats = Math.min(5, Math.max(1, Math.round(p.area / 250000))), big = p.area > 1500000;
      for (var b = 0; b < nBoats; b++) { var c = shoreAt(50, 260); if (!c) continue; var R = 25 + r() * 70; if (!loopOk(c[0], c[1], R)) { R = 18; if (!loopOk(c[0], c[1], R)) continue; } var cl = cellAt(T, c[0], c[1]); if (cl) cl.loops.push({ x: c[0], z: c[1], R: R, k: r() < 0.55 ? 'sail' : 'motor', w: (r() < 0.5 ? -1 : 1) * (2.2 + r() * 2.5) / R, ph: r() * 6.283, c: r() }); }
      if (big && town > 150 && r() < 0.8) { var fc = shoreAt(250, 700); if (fc) { var FR = 160 + r() * 200; if (!loopOk(fc[0], fc[1], FR)) FR = 90; if (loopOk(fc[0], fc[1], FR)) { var fl = cellAt(T, fc[0], fc[1]); if (fl) fl.loops.push({ x: fc[0], z: fc[1], R: FR, k: 'ferry', w: (r() < 0.5 ? -1 : 1) * 4.5 / FR, ph: r() * 6.283, c: r() }); } } }
      var nG = Math.min(3, 1 + Math.floor(p.area / 800000)); for (var g = 0; g < nG; g++) if (r() < 0.75) { var gp = shoreAt(20, 120); if (gp) { var gc = cellAt(T, gp[0], gp[1]); if (gc) gc.gulls.push({ x: gp[0], z: gp[1], n: 4 + Math.floor(r() * 6) }); } } }
  }

  /* ---------- a point on a path at a station: its metres, its tangent (cached segment, walked from the last one) ---------- */
  var PT = { x: 0, z: 0, tx: 0, tz: 1, y: 0 };
  function pathAt(P, s, ag) {
    var cum = P.cum, n = cum.length, k = ag ? ag.seg : 0; if (s <= 0) { s = 0; k = 0; } else if (s >= P.len) { s = P.len; k = n - 2; }
    if (k > n - 2) k = n - 2; if (k < 0) k = 0;
    if (!ag) { var lo = 0, hi = n - 2; while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid - 1; } k = lo; }
    else { while (k < n - 2 && cum[k + 1] <= s) k++; while (k > 0 && cum[k] > s) k--; ag.seg = k; }
    var m = P.m, l = cum[k + 1] - cum[k] || 1, t = (s - cum[k]) / l, x0 = m[2 * k], z0 = m[2 * k + 1], ex = m[2 * k + 2] - x0, ez = m[2 * k + 3] - z0;
    PT.x = x0 + ex * t; PT.z = z0 + ez * t; PT.tx = ex / l; PT.tz = ez / l; PT.y = P.hy ? P.hy[k] + (P.hy[k + 1] - P.hy[k]) * t : null; return PT;
  }
  function heights(P) {   // the drawn ground under the path's points (refreshed every few seconds: the finer ground arrives late)
    var T = P.T, A = T.anchor(), H = X.TR.st.H, n = P.cum.length; if (!P.hy) P.hy = new Float32Array(n);
    for (var i = 0; i < n; i++) { var mx = P.m[2 * i], mz = P.m[2 * i + 1]; P.hy[i] = Math.max(0, H(A.ox + A.a * mx + A.b * mz, A.oz + A.c * mx + A.d * mz)); }
    P.hT = st.t; st.hBudget -= n;
  }
  function groundAtM(T, mx, mz) { var A = T.anchor(); return Math.max(0, X.TR.st.H(A.ox + A.a * mx + A.b * mz, A.oz + A.c * mx + A.d * mz)); }

  /* ---------- the agents: a pooled record each, with the small interface part C will use ---------- */
  var KIND = { walker: 'person', jogger: 'person', sitter: 'person', waiter: 'person', busker: 'person', listener: 'person', dog: 'dog', car: 'car', bus: 'bus', tram: 'streetcar', train: 'train', river: 'boat' };
  function Agent() {}
  Agent.prototype.where = function () { var ll = this.T.ll(this.mx || 0, this.mz || 0); return { x: this.lx, y: this.ly, z: this.lz, lat: ll.lat, lon: ll.lon, yaw: this.yaw, v: this.v || 0, kind: KIND[this.k] || this.k }; };
  Agent.prototype.startle = function (x, z) {   // part C's door: people hurry off, cars brake hard, the rest flinch; never wired to her yet (except the birds, below)
    this.scared = st.t; if (this.P && (this.k === 'walker' || this.k === 'jogger')) { var dx = this.lx - x, dz = this.lz - z; this.d = (this.htx * dx + this.htz * dz) * this.d >= 0 ? this.d : -this.d; this.boost = 2.2; }
    if (this.k === 'car' || this.k === 'bus') this.brake = 2.5; if (this.k === 'sitter' || this.k === 'waiter' || this.k === 'listener') this.mode = 1; return true; };
  Agent.prototype.seat = function () { if (!this.rideable) return null; var h = { bus: 3.25, tram: 3.35, train: 4.15, river: 1.8 }[this.k] || 2; return { x: this.lx, y: this.ly + h, z: this.lz, yaw: this.yaw }; };
  function newAgent(k, T, cell) { var a = new Agent(); a.id = ++st.ids; a.k = k; a.what = KIND[k] || k; a.T = T; a.cell = cell; a.P = null; a.s = 0; a.seg = 0; a.d = 1; a.v = 0; a.vm = 1; a.off = 0; a.lane = 0; a.mode = 0; a.fade = 0; a.fadeTo = 1; a.ph = Math.random() * 6.283; a.gait = 0; a.rate = 0;
    a.lx = 0; a.ly = 0; a.lz = 0; a.mx = 0; a.mz = 0; a.yaw = 0; a.htx = 0; a.htz = 1; a.dead = false; a.c1 = W1; a.c2 = W1; a.c3 = W1; a.rideable = k === 'bus' || k === 'tram' || k === 'train' || k === 'river'; a.dwell = 0; a.dist = 0; a.lastStop = -1;
    st.agents.push(a); st.byId.set(a.id, a); if (cell) cell.agents.push(a); st.spawned++; return a; }
  function dress(a, r, T) { var sk = T.skins; a.c1 = pick(r, TOPS); a.c2 = pick(r, BOTS); a.c3 = hex(pick(r, sk)); }
  function onSample(a, list, r) { var n = list.length / 2; if (!n) return false; var q = Math.floor(r() * n) * 2; a.P = list[q]; a.s = list[q + 1] + (r() - 0.5) * 16; a.seg = 0; a.T = a.P.T; return true; }
  function lane(a, r) { var w = a.P.w, sideK = a.T.left ? -1 : 1; if (a.P.cls === 'motorway' || a.P.cls === 'trunk') a.lane = sideK * w * (r() < 0.5 ? 0.17 : 0.34); else a.lane = sideK * Math.max(1.3, w * 0.25); }

  function spawn(cell, kind, r) {
    if (st.agents.length >= C.AGENTS) return null; var T = cell.T, a;
    if (kind === 'walker' || kind === 'jogger') { a = newAgent(kind, T, cell); if (!onSample(a, (kind === 'jogger' && cell.path.length) || !cell.walk.length ? cell.path : cell.walk, r)) { a.dead = true; return null; }
      dress(a, r, T); a.d = r() < 0.5 ? 1 : -1; a.side = r() < 0.5 ? 1 : -1; a.off = a.P.kind === 'path' ? a.side * (0.5 + r() * 0.6) : a.side * (a.P.w / 2 + 1.3 + r() * 0.9); var sp0 = pathAt(a.P, a.s, null), tz0 = sp0.tz, tx0 = sp0.tx, px0 = sp0.x, pz0 = sp0.z, offIn = function (o) { return inB(T, px0 - tz0 * o, pz0 + tx0 * o); }; if (offIn(a.off)) { a.off = -a.off; if (offIn(a.off)) { a.off = (a.off > 0 ? 1 : -1) * (a.P.kind === 'path' ? 0 : a.P.w / 2 + 0.5); if (offIn(a.off)) { a.dead = true; return null; } } }   /* the sidewalk side that is not a wall */ a.vm = kind === 'jogger' ? 2.6 + r() * 0.7 : 1.1 + r() * 0.45; a.v = a.vm; a.gait = kind === 'jogger' ? 0.85 : 0.5; a.rate = (kind === 'jogger' ? 2.7 : 1.9) * 3.1416 * a.vm / (kind === 'jogger' ? 2.9 : 1.3); a.mode = 0;
      if (kind === 'jogger' && r() < 0.6) { a.c1 = pick(r, [hex(0xff4f6d), hex(0x2d9cdb), hex(0xf2f2ee), hex(0x1d1d1f), hex(0x9be15d)]); a.c2 = hex(0x1d1d1f); }
      if (kind === 'walker' && r() < (cell.lu === 'core' ? 0.06 : 0.13)) { var dg = newAgent('dog', T, cell); dg.owner = a; a.dog = dg; dg.c1 = pick(r, DOGS); dg.gait = 0.7; dg.rate = a.rate * 1.6; dg.mode = 0; dg.size = 0.75 + r() * 0.5; }
      return a; }
    if (kind === 'car' || kind === 'bus') { a = newAgent(kind, T, cell); if (!onSample(a, kind === 'bus' ? cell.bus : carList(cell, r), r)) { a.dead = true; return null; } a.d = r() < 0.5 ? 1 : -1; lane(a, r);
      a.vm = (SPEED[a.P.cls] || 10) * (0.85 + r() * 0.3) * (kind === 'bus' ? 0.85 : 1); a.v = a.vm * 0.7; if (kind === 'bus') { a.c1 = T.bus[0]; a.c2 = T.bus[1]; a.len = 12; } else { a.c1 = r() < T.taxi ? TAXI : pick(r, CARS); a.len = 4.4; } a.c2 = a.c2 || a.c1; a.c3 = a.c1; return a; }
    return null;
  }
  function carList(cell, r) {   // a road drawn by its class's weight (a motorway carries more than a side street)
    var L = cell.car, n = L.length / 2; if (!n) return L; var tries = 6, best = null; while (tries--) { var q = Math.floor(r() * n) * 2, w = CAR_W[L[q].cls] || 0.1; if (r() * 3 < w) { best = q; break; } } if (best == null) best = Math.floor(r() * n) * 2; return [L[best], L[best + 1]];
  }
  function spawnStatic(cell, kind, x, z, yaw, r, mode) { if (inB(cell.T, x, z)) return { dead: true, yaw0: yaw };   /* never inside a building */ var a = newAgent(kind, cell.T, cell); a.P = null; a.mx = x; a.mz = z; a.yaw0 = yaw; a.mode = mode; dress(a, r, cell.T); a.gy = null; a.gait = 0; a.rate = 1; return a; }
  function transit(P, on) {   // a tram, train or river path comes alive while one of its cells is near her
    if (on === P.act) return; P.act = on; if (!on) { st.agents.forEach(function (a) { if (a.P === P && (a.k === 'tram' || a.k === 'train' || a.k === 'river') && !a.dead) { a.fadeTo = 0; a.leaving = true; } }); return; }
    var T = P.T, r = rng(hash('tr790/' + T.key + '/' + P.id + '/' + Math.floor(st.t / 600))), k = P.kind === 'tram' ? 'tram' : P.kind === 'train' ? 'train' : 'river', sp = k === 'tram' ? 650 : k === 'train' ? 2600 : 900;
    var n = Math.floor(P.len * (P.dirOnly ? 1 : 2) / sp + r()); if (k === 'river' && r() < 0.4) n = 0;   /* by length: the map splits a line into many short ways, so a short one most often has none */
    for (var i = 0; i < n && st.agents.length < C.AGENTS; i++) { var a = newAgent(k, T, null); a.P = P; a.s = r() * P.len; a.d = P.dirOnly || (i % 2 ? -1 : 1); a.seg = 0; a.lane = k === 'river' ? (a.d > 0 ? 1 : -1) * Math.min(4, P.w * 0.2) : 0;
      a.vm = k === 'tram' ? 9 + r() * 2 : k === 'train' ? 22 + r() * 6 : 3 + r() * 2; a.v = a.vm; a.cars = k === 'tram' ? 2 : k === 'train' ? 4 + Math.floor(r() * 3) : 1; a.len = k === 'tram' ? 14.4 : k === 'train' ? 21.4 : 7;
      if (k === 'tram') { a.c1 = T.tram[0]; a.c2 = T.tram[1]; } else if (k === 'train') { a.c1 = T.train[0]; a.c2 = T.train[1]; } else { a.c1 = pick(r, HULLS); a.c2 = pick(r, HULLS); a.boat = r() < 0.5 ? 'motor' : 'sail'; } a.c3 = a.c1; }
  }

  /* ---------- the cells near her: what each wants by its land and the hour, spawned a few at a time ---------- */
  function targets(cell) {
    var h = st.hour, pk = peopleK(h), ck = carK(h), lu = cell.lu, wl = cell.walk.length / 2 * 20, pl = cell.path.length / 2 * 20, t = {};
    var wr = { core: 2.6, res: 0.7, ind: 0.25, park: 0.5, none: 0.06 }[lu], pr = { core: 1.4, res: 0.8, ind: 0.2, park: 1.3, none: 0.15 }[lu];
    t.walker = Math.min(C.CELL_CAP.walk, Math.round(wl / 100 * wr * pk + pl / 100 * pr * pk * 0.7));
    var jogK = (h >= 6 && h < 9) || (h >= 17 && h < 20) ? 0.5 : h >= 9 && h < 17 ? 0.2 : 0.05; t.jogger = Math.round((pl / 100 * pr + wl / 100 * wr * 0.15) * pk * jogK);
    var lk = { core: 1.2, res: 0.8, ind: 0.8, park: 0.8, none: 0.7 }[lu]; t.car = Math.min(C.CELL_CAP.car, Math.round(cell.carW / 100 * lk * ck));
    t.bus = cell.bus.length && (lu === 'core' || lu === 'res') && h > 5.5 && h < 23.5 && (cell.seed % 10) < 5 ? 1 : 0;
    var day = h >= 9 && h < 19; t.sit = cell.parkPts.length && day && lu !== 'none' ? Math.round((lu === 'park' ? 6 : 2) * pk) : 0;
    t.busk = lu === 'core' && h >= 10 && h < 21 && (cell.seed % 100) < (cell.T.pois.length ? 40 : 22) && cell.walk.length ? 1 : 0;
    t.pigeon = (h < 5.5 || h >= 21) ? 0 : cell.walk.length || cell.parkPts.length ? (   /* pigeons roost at night */lu === 'core' ? 2 : lu === 'park' ? 1 : lu === 'res' ? ((cell.seed >> 3) % 2) : lu === 'ind' ? ((cell.seed >> 5) % 3 === 0 ? 1 : 0) : 0) : 0;
    t.waiters = h > 5.5 && h < 23.5 ? Math.round(pk * (lu === 'core' ? 3 : 1.5)) : 0;
    return t;
  }
  function count(cell, k) { var n = 0; for (var i = 0; i < cell.agents.length; i++) { var a = cell.agents[i]; if (a.k === k && !a.dead && !a.leaving) n++; } return n; }
  function retire(cell, k, n) { for (var i = cell.agents.length - 1; i >= 0 && n > 0; i--) { var a = cell.agents[i]; if (a.k === k && !a.dead && !a.leaving) { a.fadeTo = 0; a.leaving = true; if (a.dog) { a.dog.fadeTo = 0; a.dog.leaving = true; } n--; } } }
  function fill(cell, budget) {
    var r = rng(cell.seed ^ Math.floor(st.t * 7)), tg = cell.tg, k, have, made = 0;
    var kinds = cell.people ? ['walker', 'jogger', 'car', 'bus'] : ['car', 'bus'];
    for (var q = 0; q < kinds.length; q++) { k = kinds[q]; have = count(cell, k); if (have > tg[k] + 2) retire(cell, k, have - tg[k]); while (have < tg[k] && made < budget) { var a = spawn(cell, k, r); if (!a) break; have++; made++; } }
    var band = st.hour < 6 || st.hour >= 21 ? 'night' : 'day';   /* the sitters, waiters, buskers and pigeons are made again when day turns to night (and back) */
    if (cell.statics && cell.sband !== band) { for (var j = 0; j < cell.agents.length; j++) if (!cell.agents[j].P && cell.agents[j].k !== 'dog') cell.agents[j].dead = true; for (var g = 0; g < cell.flocks.length; g++) cell.flocks[g].dead = true; cell.flocks = []; cell.statics = false; }
    if (cell.people && !cell.statics) { cell.statics = true; cell.sband = band; statics(cell, rng(cell.seed)); made += 4; }
    if (!cell.people && cell.statics) { cell.statics = false; for (var i = 0; i < cell.agents.length; i++) { var b = cell.agents[i]; if ((!b.P || b.k === 'walker' || b.k === 'jogger') && !b.dead) { b.dead = true; if (b.dog) b.dog.dead = true; } } for (var f = 0; f < cell.flocks.length; f++) cell.flocks[f].dead = true; cell.flocks = []; }
    return made;
  }
  function statics(cell, r) {   // sitters on the park grass, waiters at the stops, a busker and a ring of listeners, the pigeons, the ducks
    var T = cell.T, tg = cell.tg, i, a;
    for (i = 0; i < tg.sit && i * 2 < cell.parkPts.length * 3; i++) { var j = (i % (cell.parkPts.length / 2)) * 2, x = cell.parkPts[j] + (r() - 0.5) * 8, z = cell.parkPts[j + 1] + (r() - 0.5) * 8; a = spawnStatic(cell, 'sitter', x, z, r() * 6.283, r, 2); a.ph = r() * 6; if (r() < 0.5 && i + 1 < tg.sit) { var b = spawnStatic(cell, 'sitter', x + 0.9, z + 0.3, a.yaw0 + 2.6 + r(), r, 2); i++; } }
    for (i = 0; i < cell.stops.length && i < 6; i += 2) { var P = cell.stops[i], s = cell.stops[i + 1], p = pathAt(P, s, null), side = P.kind === 'tram' ? 1 : (T.left ? -1 : 1), o = P.kind === 'tram' ? 3.4 : P.w / 2 + 1.6, nx = -p.tz * side, nz = p.tx * side, n = Math.round(tg.waiters * (0.5 + r()));
      for (var w = 0; w < n; w++) spawnStatic(cell, 'waiter', p.x + nx * (o + r() * 1.2) + p.tx * (r() - 0.5) * 6, p.z + nz * (o + r() * 1.2) + p.tz * (r() - 0.5) * 6, Math.atan2(-nx, -nz) + (r() - 0.5) * 1.2, r, 1); }
    if (tg.busk) { var L = cell.walk, m = Math.floor(r() * L.length / 2) * 2, BP = L[m], bp = pathAt(BP, L[m + 1], null), sd = r() < 0.5 ? 1 : -1, bo = BP.w / 2 + 3.2, bx = bp.x - bp.tz * sd * bo, bz = bp.z + bp.tx * sd * bo, by = Math.atan2(bp.tz * sd, -bp.tx * sd);
      var bk = spawnStatic(cell, 'busker', bx, bz, by, r, 3); bk.prop = 'guitar'; var nL = 3 + Math.floor(r() * 4);
      for (i = 0; i < nL; i++) { var an = by + (i - (nL - 1) / 2) * 0.5, rr = 2.6 + r() * 0.6, lx = bx + Math.sin(an) * rr, lz = bz + Math.cos(an) * rr; spawnStatic(cell, 'listener', lx, lz, Math.atan2(bx - lx, bz - lz), r, 1); } }
    for (i = 0; i < tg.pigeon; i++) { var fx, fz; if (cell.parkPts.length && (cell.lu === 'park' || r() < 0.3)) { var pj = Math.floor(r() * cell.parkPts.length / 2) * 2; fx = cell.parkPts[pj]; fz = cell.parkPts[pj + 1]; } else if (cell.walk.length) { var wq = Math.floor(r() * cell.walk.length / 2) * 2, WP = cell.walk[wq], wp = pathAt(WP, cell.walk[wq + 1], null), ws = r() < 0.5 ? 1 : -1; fx = wp.x - wp.tz * ws * (WP.w / 2 + 2.5); fz = wp.z + wp.tx * ws * (WP.w / 2 + 2.5); } else continue;
      flock(cell, 'pigeon', fx, fz, 7 + Math.floor(r() * 12), r); }
    for (i = 0; i < cell.ducks.length; i++) flock(cell, 'duck', cell.ducks[i].x, cell.ducks[i].z, cell.ducks[i].n, r);
  }
  function flock(cell, kind, x, z, n, r) { var F = { id: ++st.ids, kind: kind, what: kind === 'pigeon' ? 'pigeons' : kind === 'gull' ? 'gulls' : 'ducks', T: cell.T, cell: cell, mx: x, mz: z, n: n, b: [], state: 'ground', t0: -1e9, gy: null, gyT: -1e9, dead: false, R: 0, alt: 0 };
    for (var i = 0; i < n; i++) { var a = r() * 6.283, d = Math.sqrt(r()) * (kind === 'pigeon' ? 3.5 : kind === 'duck' ? 4 : 1); F.b.push({ ox: Math.cos(a) * d, oz: Math.sin(a) * d, yaw: r() * 6.283, ph: r() * 6.283, c1: kind === 'pigeon' ? pick(r, PIGEONS) : kind === 'duck' ? (r() < 0.5 ? hex(0x7a5c3e) : hex(0x8f8f88)) : W1, c2: kind === 'pigeon' ? pick(r, SHEEN) : kind === 'duck' ? (r() < 0.5 ? hex(0x1f6f3a) : hex(0x7a5c3e)) : W1, out: r() * 6.283, up: 3.5 + r() * 3, air: C.SCATTER.AIR[0] + r() * (C.SCATTER.AIR[1] - C.SCATTER.AIR[0]), cr: 10 + r() * 14, ca: r() * 6.283, cw: (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.35), ch: 9 + r() * 12, peck: r() < 0.6 }); }
    cell.flocks.push(F); st.flocks.push(F); st.byId.set(F.id, F); return F; }
  function wet(c, on) { c.wOn = on; if (on) { var rg = rng(c.seed ^ 77); c.gullsF = c.gulls.map(function (g) { return gullFlock(c, g, rg); }); } else { (c.gullsF || []).forEach(function (F) { F.dead = true; }); c.gullsF = []; } }
  function gullFlock(cell, g, r) { var F = flock(cell, 'gull', g.x, g.z, g.n, r); cell.flocks.pop();   /* gulls belong to the water's ring, not the cell's people */ F.state = 'air'; F.R = 25 + r() * 30; F.alt = 16 + r() * 22; F.b.forEach(function (b) { b.cr = F.R * (0.5 + r() * 0.8); b.cw = (r() < 0.5 ? -1 : 1) * (7 + r() * 3) / b.cr; b.ch = F.alt + (r() - 0.5) * 10; }); return F; }
  function flockWhere(F) { var ll = F.T.ll(F.mx, F.mz), A = F.T.anchor(); return { x: A.ox + A.a * F.mx + A.b * F.mz, y: F.gy || 0, z: A.oz + A.c * F.mx + A.d * F.mz, lat: ll.lat, lon: ll.lon, kind: F.kind, n: F.n, state: F.state }; }
  function scatter(F, hx, hz) { if (F.kind === 'duck') return false; if (F.kind === 'gull') { if (F.state === 'veer') return false; F.state = 'veer'; F.t0 = st.t; F.hx = hx; F.hz = hz; st.gullVeers++; return true; }
    if (F.state !== 'ground') return false; F.state = 'up'; F.t0 = st.t; var ang = Math.atan2(F.mz - hz, F.mx - hx); F.b.forEach(function (b) { b.out = ang + (b.ph - 3.14) * 0.45; }); st.scatters++; st.lastScatter = { id: F.id, t: +st.t.toFixed(2), n: F.n }; return true; }
  function cellDist(cell) { var h = cell.T.her(), dx = cell.cx - h[0], dz = cell.cz - h[1]; return Math.sqrt(dx * dx + dz * dz); }

  /* ---------- the refresh, twice a second: the tiles read, the cells near her alive, the counts kept, who is drawn with which mesh ---------- */
  function refresh() {
    var S = X.S, f = st.f, W = window.WFR_WORLD, ll = W.toLatLon(f, S.pos.x, S.pos.z); st.her = ll; st.hBudget = C.H_BUDGET;
    var agl = S.pos.y - Math.max(0, X.TR.st.H(S.pos.x, S.pos.z)); st.agl = agl;
    var active = [], newC = 0, i, c;
    var water = [];
    st.tiles.forEach(function (T) { if (!T.ready) return; var h = T.her(), mx = Math.max(T.x0 - h[0], 0, h[0] - T.x1), mz = Math.max(T.z0 - h[1], 0, h[1] - T.z1); if (Math.sqrt(mx * mx + mz * mz) > C.W_R + 200) { T.cells.forEach(function (c2) { if (c2.active) sleep(c2); if (c2.wOn) wet(c2, false); }); return; }
      for (var k = 0; k < T.cells.length; k++) { c = T.cells[k]; var d = cellDist(c); c.d = d;
        if (!c.wOn && d < C.W_R && (c.loops.length || c.gulls.length)) wet(c, true); else if (c.wOn && d > C.W_R + 200) wet(c, false); if (c.wOn) water.push(c);   /* the water's life is seen from further: its own ring */
        if (c.active && d > C.DROP_R) sleep(c); else if (!c.active && d < C.ACT_R && newC < C.NEW_CELLS) { c.active = true; newC++; st.cells.set(c.key, c); }
        if (c.active) { var pOn = c.people ? d < C.P_OFF : d < C.P_ON; if (pOn !== c.people) c.people = pOn; active.push(c); } } });
    st.tgAcc -= C.REFRESH; var reTg = st.tgAcc <= 0; if (reTg) st.tgAcc = C.TARGET_EVERY;
    active.sort(function (a, b) { return a.d - b.d; }); var budget = C.SPAWNS;
    for (i = 0; i < active.length; i++) { c = active[i]; if (!c.tg || reTg) c.tg = targets(c); if (budget > 0) { budget -= fill(c, budget); st.filled = i + 1; } for (var q = 0; q < c.transit.length; q++) if (!c.transit[q].act) transit(c.transit[q], true); }
    st.tiles.forEach(function (T) { if (!T.ready) return; for (var k = 0; k < T.paths.length; k++) { var P = T.paths[k]; if (P.act && P.cells && !P.cells.some(function (c3) { return c3.active; })) transit(P, false); } });
    /* the dead out, the paths' ground kept fresh where someone stands on it */
    var keep = []; for (i = 0; i < st.agents.length; i++) { var a = st.agents[i]; if (a.dead) { st.byId.delete(a.id); continue; } keep.push(a); if (a.P && (!a.P.hy || st.t - a.P.hT > C.H_EVERY) && st.hBudget > 0) heights(a.P); if (!a.P && (a.gy == null || st.t - (a.gyT || 0) > C.H_EVERY) && st.hBudget > 0) { a.gy = groundAtM(a.T, a.mx, a.mz); a.gyT = st.t; st.hBudget--; } }
    st.agents = keep; st.cells.forEach(function (c4) { c4.agents = c4.agents.filter(function (a2) { return !a2.dead; }); });
    st.flocks = st.flocks.filter(function (F) { if (F.dead) st.byId.delete(F.id); return !F.dead; });
    for (i = 0; i < st.flocks.length; i++) { var F = st.flocks[i]; if (F.gy == null || st.t - F.gyT > C.H_EVERY) { F.gy = groundAtM(F.T, F.mx, F.mz); F.gyT = st.t; } }
    /* the boats on the water loops of the active cells */
    var loops = []; for (i = 0; i < water.length; i++) for (var lq = 0; lq < water[i].loops.length; lq++) { var L = water[i].loops[lq]; L.T = water[i].T; if (L.gy == null || st.t - (L.gyT || 0) > C.H_EVERY * 2) { L.gy = groundAtM(L.T, L.x, L.z); L.gyT = st.t; } loops.push(L); } st.loops = loops;
    lanes(); lists();
  }
  function sleep(c) { c.active = false; c.people = false; c.statics = false; st.cells.delete(c.key); for (var i = 0; i < c.agents.length; i++) { c.agents[i].dead = true; if (c.agents[i].dog) c.agents[i].dog.dead = true; } c.agents = []; c.flocks.forEach(function (F) { F.dead = true; }); c.flocks = []; c.tg = null; }
  function lanes() {   // who follows whom: the vehicles on each path and direction, in order
    var M = new Map(), i, a; for (i = 0; i < st.agents.length; i++) { a = st.agents[i]; a.lead = null; if (!a.P || !(a.k === 'car' || a.k === 'bus' || a.k === 'tram' || a.k === 'train')) continue; var key = a.P.id * 2 + (a.d > 0 ? 1 : 0), L = M.get(key); if (!L) M.set(key, L = []); L.push(a); }
    M.forEach(function (L) { L.sort(function (p, q) { return p.s * p.d - q.s * q.d; }); for (var j = 0; j + 1 < L.length; j++) L[j].lead = L[j + 1]; });
  }
  function lists() {   // each mesh's list, nearest first under its cap; the full figure near, the light one far
    var Ls = st.lists, k, i; for (k in Ls) Ls[k].length = 0;
    for (i = 0; i < st.agents.length; i++) { var a = st.agents[i]; if (a.dead) continue; if (a.P) { var pp = pathAt(a.P, a.s, null); a.mx = pp.x; a.mz = pp.z; a.T = a.P.T; } else if (a.k === 'dog' && a.owner) { a.mx = a.owner.mx; a.mz = a.owner.mz; a.T = a.owner.T; }
      var h = a.T.her(), dx = a.mx - h[0], dz = a.mz - h[1], d = Math.sqrt(dx * dx + dz * dz); a.dist = d;
      switch (a.k) {
        case 'walker': case 'jogger': case 'waiter': case 'listener': case 'busker': case 'sitter': if (d < C.P_NEAR || (a.mode === 2 && d < C.P_R) || a.k === 'busker') Ls.personN.push(a); else if (d < C.P_R) Ls.personF.push(a); if (a.prop && d < C.P_R) Ls.prop.push(a); break;
        case 'dog': break;   // drawn with its walker
        case 'car': if (d < C.C_NEAR) Ls.car.push(a); else if (d < C.C_R) Ls.carF.push(a); break;
        case 'bus': if (d < C.C_R) Ls.bus.push(a); break;
        case 'tram': if (d < C.T_R) Ls.tram.push(a); break;
        case 'train': if (d < C.T_R) Ls.train.push(a); break;
        case 'river': if (d < C.W_R) Ls[a.boat].push(a); break; } }
    for (k in Ls) { var L = Ls[k], cap = st.mesh[k] ? st.mesh[k].userData.cap : 0, per = k === 'tram' ? 2 : k === 'train' ? 6 : 1; if (L.length * per > cap) { L.sort(function (p, q) { return p.dist - q.dist; }); L.length = Math.floor(cap / per); } }
  }

  /* ---------- the step, every frame: walkers walk, cars drive (the car ahead, the light, the stop), transit runs, flocks lift and land ---------- */
  function red(P, j, t) { return ((t + P.jph[j] + (P.jax[j] ? C.SIGNAL.CYCLE / 2 : 0)) % C.SIGNAL.CYCLE) < C.SIGNAL.RED; }   // the two roads at a junction share its phase and take turns by their axis
  function nextJ(P, s, d) { var J = P.junc; if (!J) return -1; if (d > 0) { for (var i = 0; i < J.length; i++) if (J[i] > s + 0.5) return i; } else { for (var k = J.length - 1; k >= 0; k--) if (J[k] < s - 0.5) return k; } return -1; }
  function nextStop(P, s, d, last) { var S2 = P.stops; if (!S2) return -1; if (d > 0) { for (var i = 0; i < S2.length; i++) if (S2[i] > s + 0.5 && i !== last) return i; } else { for (var k = S2.length - 1; k >= 0; k--) if (S2[k] < s - 0.5 && k !== last) return k; } return -1; }
  function carryOn(a, want) {   // at a path's end: the nearest path of the same kind going on (a junction, a tile's seam), else null
    var P = a.P, p = pathAt(P, a.d > 0 ? P.len : 0, null), hx = p.tx * a.d, hz = p.tz * a.d, T = P.T, ll = T.ll(p.x, p.z), cand = [];
    var tiles = [T]; st.tiles.forEach(function (T2) { if (T2 !== T && T2.ready && ll.lat >= T2.lat - (T2.z1 / KY) - 0.002 && ll.lat <= T2.lat - (T2.z0 / KY) + 0.002 && ll.lon >= T2.lon + T2.x0 / T2.KX - 0.002 && ll.lon <= T2.lon + T2.x1 / T2.KX + 0.002) tiles.push(T2); });
    var q = [0, 0];
    for (var i = 0; i < tiles.length; i++) { var T3 = tiles[i]; T3.m(ll.lat, ll.lon, q); var G = want === 'road' ? T3.grid : T3.rgrid, gx = Math.floor(q[0] / GS), gz = Math.floor(q[1] / GS);
      for (var u = -1; u <= 1; u++) for (var v = -1; v <= 1; v++) { var L = G.get((gx + u) + ',' + (gz + v)); if (!L) continue;
        for (var j = 0; j < L.length; j += 2) { var Q = L[j], k = L[j + 1]; if (Q === P || (want === 'road' ? Q.kind !== 'road' : Q.kind !== want)) continue; if (want === 'road' && a.k !== 'walker' && a.k !== 'jogger' && CAR_W[Q.cls] == null) continue;
          var x0 = Q.m[2 * k], z0 = Q.m[2 * k + 1], ex = Q.m[2 * k + 2] - x0, ez = Q.m[2 * k + 3] - z0, l2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((q[0] - x0) * ex + (q[1] - z0) * ez) / l2)), dx = x0 + ex * t - q[0], dz = z0 + ez * t - q[1];
          if (dx * dx + dz * dz > 49) continue; var l = Math.sqrt(l2), dot = (ex * hx + ez * hz) / l, d2 = Q.dirOnly || (dot >= 0 ? 1 : -1); if (Q.dirOnly && dot * Q.dirOnly < -0.3) continue; var s2 = Q.cum[k] + t * l, rest = d2 > 0 ? Q.len - s2 : s2; if (rest < 25) continue;
          cand.push({ Q: Q, s: s2, d: d2, sc: Math.abs(dot) + Math.random() * 0.9 }); } } }
    if (!cand.length) return null; cand.sort(function (m, n) { return n.sc - m.sc; }); return cand[0];
  }
  function moveTo(a, c) { a.P = c.Q; a.s = c.s; a.d = c.d; a.T = c.Q.T; a.seg = 0; a.lastStop = -1; if (a.k === 'car' || a.k === 'bus') { lane(a, Math.random); a.vm = (SPEED[a.P.cls] || 10) * (0.85 + Math.random() * 0.3) * (a.k === 'bus' ? 0.85 : 1); } }
  function respawnCar(a) { if (a.leaving) { a.dead = true; return; } var c = a.cell; if (!c || !c.active || !c.car.length) { a.fadeTo = 0; a.leaving = true; return; } var r = Math.random; var L = a.k === 'bus' ? c.bus : carList(c, r); if (!L.length) { a.fadeTo = 0; a.leaving = true; return; } onSample(a, L, r); a.d = r() < 0.5 ? 1 : -1; lane(a, r); a.fade = 0; a.fadeTo = 1; a.v = a.vm * 0.6; a.lastStop = -1; }
  function stepAgent(a, dt) {
    var t = st.t, P = a.P;
    if (a.fade !== a.fadeTo) { a.fade += (a.fadeTo > a.fade ? 1 : -1) * dt * 1.5; if (a.fade >= a.fadeTo && a.fadeTo === 1) a.fade = 1; if (a.fade <= 0 && a.fadeTo === 0) { a.fade = 0; a.dead = true; if (a.dog) a.dog.dead = true; return; } }
    if (a.k === 'dog') { if (!a.owner || a.owner.dead) { a.dead = true; return; } return; }
    if (!P) { if (a.mode === 1 && a.scared && t - a.scared > 4) a.scared = 0; return; }
    if (a.k === 'walker' || a.k === 'jogger') { var v = a.vm * (a.boost && t - a.scared < 3 ? a.boost : 1); a.v = v; a.s += a.d * v * dt;
      if (a.s < 0 || a.s > P.len) { var c = Math.random() < 0.5 ? carryOn(a, P.kind === 'path' ? 'path' : 'road') : null; if (c) { moveTo(a, c); a.off = (a.off >= 0 ? 1 : -1) * (a.P.kind === 'path' ? 0.8 : a.P.w / 2 + 1.6); } else { a.d = -a.d; a.s = Math.max(0, Math.min(P.len, a.s)); a.off = -a.off * (Math.random() < 0.5 ? 1 : -1); } } return; }
    /* vehicles */
    var vt = a.vm, ahead;
    if (a.dwell > 0) { a.dwell -= dt; a.v = 0; if (a.dwell <= 0 && a.atEnd) { a.atEnd = false; a.d = -a.d; a.lastStop = -1; } return; }
    if (a.brake && t - a.scared < a.brake) vt = 0;
    if (a.lead && a.lead.P === P && !a.lead.dead) { var gap = (a.lead.s - a.s) * a.d - (a.lead.len * (a.lead.cars || 1) + a.len) / 2 - 2.5; if (gap < a.v * 1.3 + 3) vt = Math.min(vt, Math.max(0, (gap - 1) / 1.3)); }
    if (P.junc && (a.k === 'car' || a.k === 'bus')) { var j = nextJ(P, a.s, a.d); if (j >= 0) { var dj = Math.abs(P.junc[j] - a.s) - C.SIGNAL.STOP; if (dj < 40 && red(P, j, t)) { if (dj > -1.5) vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * 4 * Math.max(0, dj - 0.5)))); } } }
    if ((a.k === 'bus' || a.k === 'tram') && P.stops) { var sI = nextStop(P, a.s, a.d, a.lastStop); if (sI >= 0) { var ds = Math.abs(P.stops[sI] - a.s); if (ds < 30) vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * 2.5 * (ds - 0.3))) + 0.3); if (ds < 0.8) { a.dwell = a.k === 'tram' ? 10 : 8; a.lastStop = sI; a.v = 0; return; } } }
    a.v += Math.max(-6 * dt, Math.min(2.4 * dt, vt - a.v)); if (a.v < 0) a.v = 0; a.s += a.d * a.v * dt;
    if (a.s < 0 || a.s > P.len) {
      var want = a.k === 'car' || a.k === 'bus' ? 'road' : a.k === 'tram' ? 'tram' : a.k === 'train' ? 'train' : null, cc = want ? carryOn(a, want) : null;
      if (cc) { moveTo(a, cc); return; }
      if (a.k === 'car' || a.k === 'bus') { respawnCar(a); return; }
      if (P.dirOnly) { a.s = a.d > 0 ? 0 : P.len; a.seg = 0; a.fade = 0; a.fadeTo = 1; a.lastStop = -1; return; }   // a one-way track with no line going on: the next car comes in at its start
      a.s = Math.max(0, Math.min(P.len, a.s)); a.dwell = a.k === 'river' ? 3 : 14; a.atEnd = true; }
    if ((a.k === 'car' || a.k === 'bus') && a.dist > C.C_R + 200) respawnCar(a);
  }
  function stepFlocks(dt) {
    var S = X.S, P = S.pos, flying = S.mode === 'fly';
    for (var i = 0; i < st.flocks.length; i++) { var F = st.flocks[i]; if (F.dead) continue; var h = F.T.her(), dx = F.mx - h[0], dz = F.mz - h[1], dh = Math.sqrt(dx * dx + dz * dz);
      if (F.kind === 'pigeon') { var dy = P.y - (F.gy || 0); if (F.state === 'ground' && ((dh < C.SCATTER.R && dy < C.SCATTER.AGL) || Math.sqrt(dh * dh + dy * dy) < C.SCATTER.R3)) scatter(F, h[0], h[1]);
        if (F.state === 'up' && st.t - F.t0 > C.SCATTER.AIR[1] + 4) F.state = 'ground'; }
      else if (F.kind === 'gull') { var gy = (F.gy || 0) + F.alt, d3 = Math.sqrt(dh * dh + (P.y - gy) * (P.y - gy)); if (F.state === 'air' && d3 < F.R + C.SCATTER.GULL_R) scatter(F, h[0], h[1]); if (F.state === 'veer' && st.t - F.t0 > 9) F.state = 'air'; } }
  }

  /* ---------- the drawing, every frame after the recentre ---------- */
  var MM = null;
  function put(im, i, x, y, z, yaw, s) { var a = im.instanceMatrix.array, o = i * 16, c = Math.cos(yaw) * s, n = Math.sin(yaw) * s; a[o] = c; a[o + 1] = 0; a[o + 2] = -n; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = s; a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = n; a[o + 9] = 0; a[o + 10] = c; a[o + 11] = 0; a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1; }
  function attr(im, i, ph, gait, rate, mode, c1, c2, c3) { var g = im.geometry.attributes, A = g.iA790.array, a = g.iC1790.array, b = g.iC2790.array, c = g.iC3790.array, o = i * 4, p = i * 3; A[o] = ph; A[o + 1] = gait; A[o + 2] = rate; A[o + 3] = mode; a[p] = c1[0]; a[p + 1] = c1[1]; a[p + 2] = c1[2]; b[p] = c2[0]; b[p + 1] = c2[1]; b[p + 2] = c2[2]; c[p] = c3[0]; c[p + 1] = c3[1]; c[p + 2] = c3[2]; }
  function toLocal(T, mx, mz, out) { var A = T.anchor(); out[0] = A.ox + A.a * mx + A.b * mz; out[1] = A.oz + A.c * mx + A.d * mz; return out; }
  function yawOf(T, hx, hz) { var A = T.anchor(); return Math.atan2(A.a * hx + A.b * hz, A.c * hx + A.d * hz); }
  var Q2 = [0, 0];
  function placeOn(a, s, lat, lift) {   // an agent's point on its path at a station, offset to its side: its frame metres, height, heading
    var P = a.P, p = pathAt(P, s, a), hx = p.tx * a.d, hz = p.tz * a.d, rx = -p.tz, rz = p.tx, mx = p.x + rx * lat, mz = p.z + rz * lat, y = p.y;
    if (y == null) y = groundAtM(P.T, mx, mz); a.mx = mx; a.mz = mz; a.htx = hx; a.htz = hz; toLocal(P.T, mx, mz, Q2); return { x: Q2[0], y: y + lift, z: Q2[1], yaw: yawOf(P.T, hx, hz) };
  }
  /* 808 PEOPLE STEP ROUND HER (Marth's Nov 14 recording: "a man walks straight through her and the camera"). When she is on foot (or within 2 m of the
     ground) a walker whose way passes within 1 m of her steps sideways on the sidewalk to pass her at 1 m (eased, ~0.3 s), and back afterwards; and she
     herself is set back out of any person she walks into (solid808, asked each travel frame by the trees' tick, world-vegetation.js). */
  function foot808Now() { var S = X.S, T = X.TR; if (!S || !S.pos || !T || !T.st) return false; return S.pos.y - Math.max(0, T.st.H(S.pos.x, S.pos.z)) < 2.5; }
  function step808(b, on, dt) {
    var want = 0; if (on && b.k === 'walker' || on && b.k === 'jogger') { var h = b.T.her(), dx = h[0] - (b.mx || 0), dz = h[1] - (b.mz || 0), d = Math.sqrt(dx * dx + dz * dz);
      if (d < 3.5) { var tx = (b.htx || 0) * b.d, tz = (b.htz || 0) * b.d, ahead = dx * (b.htx || 0) + dz * (b.htz || 0), lr = dx * -tz + dz * tx;
        if (ahead > -0.8 && Math.abs(lr) < 1.0) { var cur = b.off + (b.av808 || 0), herLat = cur + lr; want = herLat - (lr > 0 ? 1.0 : -1.0) - b.off; } else if (Math.abs(lr) < 1.0 && ahead <= -0.8) want = b.av808 || 0; } }
    b.av808 = (b.av808 || 0) + (want - (b.av808 || 0)) * Math.min(1, dt * 6);
  }
  function solid808(pos, pad, body) {   // she is set back out of a person (a walker's or a jogger's middle within pad + 0.25 m)
    var moved = false, R = (pad || 0.45) + 0.25; for (var i = 0; i < st.agents.length; i++) { var a = st.agents[i]; if (a.dead || (a.k !== 'walker' && a.k !== 'jogger') || a.lx == null) continue; var dx = pos.x - a.lx, dz = pos.z - a.lz; if (dx > R || dx < -R || dz > R || dz < -R) continue;
      if (pos.y > a.ly + 1.9 || pos.y < a.ly - 0.5) continue; var d = Math.sqrt(dx * dx + dz * dz); if (d >= R) continue; if (d < 1e-3) { dx = 1; dz = 0; d = 1; } var nx = a.lx + dx / d * R, nz = a.lz + dz / d * R;
      if (body && body.position) { body.position.x += nx - pos.x; body.position.z += nz - pos.z; } pos.x = nx; pos.z = nz; moved = true; st.solid808 = (st.solid808 || 0) + 1; }
    return moved;
  }
  function lensOut808(cam, her) {   // the lens never inside a person: it steps toward her (above their heads is fine)
    for (var i = 0; i < st.agents.length; i++) { var a = st.agents[i]; if (a.dead || a.lx == null || (a.k !== 'walker' && a.k !== 'jogger')) continue; var dx = cam.x - a.lx, dz = cam.z - a.lz; if (dx * dx + dz * dz > 0.16 || cam.y > a.ly + 1.9) continue;
      var L = Math.hypot(her.x - cam.x, her.y + 0.5 - cam.y, her.z - cam.z); for (var s2 = 0.2; s2 <= L; s2 += 0.2) { var f = Math.min(1, s2 / L), x = cam.x + (her.x - cam.x) * f, z = cam.z + (her.z - cam.z) * f; if ((x - a.lx) * (x - a.lx) + (z - a.lz) * (z - a.lz) > 0.2) { cam.set(x, cam.y + (her.y + 0.5 - cam.y) * f, z); st.lens808 = (st.lens808 || 0) + 1; return true; } } }
    return false;
  }
  function place() {
    if (!st.inited || !st.enabled) return; var t0 = performance.now();
    try {
      var T = X.TR, U = st.U, M = st.mesh, Ls = st.lists, k; if (st.mode !== 'travel' || !T.on || !T.u) { for (k in M) { M[k].count = 0; M[k].visible = false; } return; }
      U.eye.value.copy(T.u.uEye.value); U.invK.value = T.u.uInvK.value; U.t.value = st.t; U.glow.value = st.night;
      var n = {}, i, a, w, im; for (k in M) n[k] = 0;
      /* people */
      var tn808 = performance.now(), dt808 = Math.min(0.1, (tn808 - (st.pl808 || tn808)) / 1000), foot808 = foot808Now(); st.pl808 = tn808;
      ['personN', 'personF'].forEach(function (mk) { var L = Ls[mk], im2 = M[mk]; for (var q = 0; q < L.length; q++) { var b = L[q], p;
        if (b.P) { if (mk === 'personN') step808(b, foot808, dt808); p = placeOn(b, b.s, b.off + (b.av808 || 0), 0.04); b.yaw = p.yaw; } else { toLocal(b.T, b.mx, b.mz, Q2); p = { x: Q2[0], y: (b.gy || 0) + 0.02, z: Q2[1] }; b.yaw = yawOf(b.T, Math.sin(b.yaw0), Math.cos(b.yaw0)); if (b.mode === 1 && b.scared) b.yaw += Math.PI; }
        b.lx = p.x; b.ly = p.y; b.lz = p.z; if (b.fade <= 0.001 && b.fadeTo === 1) b.fade = 0.001; var sc = Math.min(1, b.fade * 3) * (b.size || 1) * (mk === 'personN' ? C.SCALE.person : C.SCALE.personFar);
        put(im2, n[mk], p.x, p.y, p.z, b.yaw, sc); attr(im2, n[mk], b.ph, b.gait, b.rate, b.mode, b.c1, b.c2, b.c3); n[mk]++;
        if (b.dog && !b.dog.dead && n.dog < M.dog.userData.cap && b.dist < C.P_NEAR * 1.6) { var g = b.dog, gp = placeOn(b, b.s - b.d * 1.4, b.off + (b.off > 0 ? -0.55 : 0.55), 0.02); g.lx = gp.x; g.ly = gp.y; g.lz = gp.z; g.yaw = gp.yaw; g.mx = b.mx; g.mz = b.mz;
          put(M.dog, n.dog, gp.x, gp.y, gp.z, gp.yaw, (g.size || 1) * Math.min(1, b.fade * 3)); attr(M.dog, n.dog, b.ph * 1.3, 0.7, b.rate * 1.5, 0, g.c1, g.c1, g.c1); n.dog++; } } });
      for (i = 0; i < Ls.prop.length; i++) { a = Ls.prop[i]; put(M.prop, n.prop, a.lx, a.ly, a.lz, a.yaw, 1); attr(M.prop, n.prop, 0, 0, 0, 1, W1, W1, W1); n.prop++; }
      /* cars and buses */
      ['car', 'carF', 'bus'].forEach(function (mk) { var L = Ls[mk], im2 = M[mk]; for (var q = 0; q < L.length; q++) { var b = L[q], p = placeOn(b, b.s, b.lane * b.d, 0.32); b.lx = p.x; b.ly = p.y; b.lz = p.z; b.yaw = p.yaw;
        put(im2, n[mk], p.x, p.y, p.z, p.yaw, Math.max(0.001, b.fade)); attr(im2, n[mk], 0, 0, 0, 1, b.c1, b.c2, b.c3); n[mk]++; } });
      /* streetcars and trains: their sections follow the line */
      ['tram', 'train'].forEach(function (mk) { var L = Ls[mk], im2 = M[mk]; for (var q = 0; q < L.length; q++) { var b = L[q], seg0 = b.seg;
        for (var c = 0; c < b.cars && n[mk] < im2.userData.cap; c++) { var s = b.s - b.d * c * (b.len + 0.6), sOk = s >= 0 && s <= b.P.len, p = placeOn(b, Math.max(0, Math.min(b.P.len, s)), b.lane, 0.3); if (c === 0) { b.lx = p.x; b.ly = p.y; b.lz = p.z; b.yaw = p.yaw; b.mx0 = b.mx; b.mz0 = b.mz; }
          put(im2, n[mk], p.x, p.y, p.z, p.yaw, sOk ? Math.max(0.001, b.fade) : 0.001); attr(im2, n[mk], 0, 0, 0, 1, b.c1, b.c2, b.c3); n[mk]++; }
        b.seg = seg0; if (b.mx0 != null) { b.mx = b.mx0; b.mz = b.mz0; } } });
      /* boats: on the rivers (agents) and the water loops */
      ['sail', 'motor'].forEach(function (mk) { var L = Ls[mk]; for (var q = 0; q < L.length; q++) { var b = L[q], p = placeOn(b, b.s, b.lane, 0.15); b.lx = p.x; b.ly = p.y; b.lz = p.z; b.yaw = p.yaw; put(M[mk], n[mk], p.x, p.y, p.z, p.yaw, Math.max(0.001, b.fade)); attr(M[mk], n[mk], 0, 0, 0, 1, b.c1, b.c2, b.c1); n[mk]++; } });
      for (i = 0; i < st.loops.length; i++) { var Lp = st.loops[i], mk = Lp.k, imL = M[mk]; if (n[mk] >= imL.userData.cap) continue; var ang = Lp.ph + Lp.w * st.t, lx = Lp.x + Math.cos(ang) * Lp.R, lz = Lp.z + Math.sin(ang) * Lp.R, hx = -Math.sin(ang) * Lp.w, hz = Math.cos(ang) * Lp.w;
        toLocal(Lp.T, lx, lz, Q2); var c1 = mk === 'ferry' ? FERRY[Lp.c < 0.5 ? 0 : 1] : SAILS[Math.floor(Lp.c * SAILS.length) % SAILS.length], c2 = mk === 'ferry' ? hex(0xc8261d) : HULLS[Math.floor(Lp.c * 7) % HULLS.length]; if (mk === 'motor') c1 = c2;
        put(imL, n[mk], Q2[0], (Lp.gy || 0) + 0.2, Q2[1], yawOf(Lp.T, hx, hz), 1); attr(imL, n[mk], 0, 0, 0, 1, c1, mk === 'sail' ? hex(0xf4f4f2) : c2, c1); n[mk]++; }
      /* birds: pigeons on the ground or lifting, gulls wheeling, ducks drifting */
      var G = st.t;
      for (i = 0; i < st.flocks.length; i++) { var F = st.flocks[i]; if (F.dead) continue; var hF = F.T.her(), fdx = F.mx - hF[0], fdz = F.mz - hF[1], fd = Math.sqrt(fdx * fdx + fdz * fdz); if (fd > (F.kind === 'gull' ? C.W_R : C.F_R)) continue;
        var imF = M[F.kind], sc0 = C.SCALE[F.kind] || 1, gy0 = F.gy || 0;
        for (var bi = 0; bi < F.b.length && n[F.kind] < imF.userData.cap; bi++) { var B = F.b[bi], bx, by, bz, yaw, mode;
          if (F.kind === 'pigeon') { var u = F.state === 'up' ? G - F.t0 : 1e9;
            if (u < 1.6) { var e = u / 1.6; bx = F.mx + B.ox + Math.cos(B.out) * e * 9; bz = F.mz + B.oz + Math.sin(B.out) * e * 9; by = gy0 + e * e * B.ch * 0.8; yaw = Math.atan2(Math.cos(B.out), Math.sin(B.out)); mode = 4; }
            else if (u < B.air) { var a2 = B.ca + B.cw * (u - 1.6), e2 = Math.min(1, (u - 1.6) / 1.5), cxp = F.mx + B.ox + Math.cos(B.out) * 9, czp = F.mz + B.oz + Math.sin(B.out) * 9; bx = cxp + (F.mx - cxp) * e2 + Math.cos(a2) * B.cr * e2; bz = czp + (F.mz - czp) * e2 + Math.sin(a2) * B.cr * e2; by = gy0 + B.ch * (0.8 + 0.2 * e2) + Math.sin(u * 1.3 + B.ph) * 1.2; yaw = Math.atan2(-Math.sin(a2) * B.cw, Math.cos(a2) * B.cw); mode = Math.sin(u * 0.7 + B.ph) > 0.3 ? 5 : 4; }
            else if (u < B.air + 2.6) { var e3 = (u - B.air) / 2.6, a3 = B.ca + B.cw * (B.air - 1.6), sx = F.mx + Math.cos(a3) * B.cr, sz = F.mz + Math.sin(a3) * B.cr; bx = sx + (F.mx + B.ox - sx) * e3; bz = sz + (F.mz + B.oz - sz) * e3; by = gy0 + B.ch * (1 - e3) * (1 - e3); yaw = Math.atan2(F.mx + B.ox - sx, F.mz + B.oz - sz); mode = 4; }
            else { bx = F.mx + B.ox + Math.sin(G * 0.13 + B.ph) * 0.4; bz = F.mz + B.oz + Math.cos(G * 0.11 + B.ph) * 0.4; by = gy0 + 0.03; yaw = B.yaw + Math.sin(G * 0.3 + B.ph) * 0.8; mode = B.peck ? 6 : 7; }
            var mx3 = bx, mz3 = bz; toLocal(F.T, mx3, mz3, Q2); var yl = yawOf(F.T, Math.sin(yaw), Math.cos(yaw));
            put(imF, n.pigeon, Q2[0], by, Q2[1], yl, sc0); attr(imF, n.pigeon, B.ph, 0, mode === 4 ? 16 : 5, mode, B.c1, B.c2, B.c1); n.pigeon++; }
          else if (F.kind === 'gull') { var v2 = F.state === 'veer' ? Math.min(1, (G - F.t0) / 2) * Math.max(0, 1 - (G - F.t0 - 6) / 3) : 0, ag = B.ca + B.cw * G * (1 + v2 * 0.6), rr = B.cr * (1 + v2 * 1.6);
            bx = F.mx + Math.cos(ag) * rr; bz = F.mz + Math.sin(ag) * rr; by = gy0 + B.ch + v2 * 18 + Math.sin(G * 0.4 + B.ph) * 2; toLocal(F.T, bx, bz, Q2);
            put(imF, n.gull, Q2[0], by, Q2[1], yawOf(F.T, -Math.sin(ag) * B.cw, Math.cos(ag) * B.cw), sc0); attr(imF, n.gull, B.ph, 0, v2 > 0.1 ? 14 : 6, Math.sin(G * 0.5 + B.ph) > 0 || v2 > 0.1 ? 4 : 5, W1, W1, W1); n.gull++; }
          else { bx = F.mx + B.ox + Math.sin(G * 0.05 + B.ph) * 2; bz = F.mz + B.oz + Math.cos(G * 0.04 + B.ph) * 2; toLocal(F.T, bx, bz, Q2); put(imF, n.duck, Q2[0], gy0 + 0.25, Q2[1], B.yaw + G * 0.03, sc0); attr(imF, n.duck, 0, 0, 0, 1, B.c1, B.c2, B.c1); n.duck++; } } }
      for (k in M) { im = M[k]; im.count = n[k]; im.visible = n[k] > 0; if (n[k]) { im.instanceMatrix.needsUpdate = true; var ga = im.geometry.attributes; ga.iA790.needsUpdate = true; ga.iC1790.needsUpdate = true; ga.iC2790.needsUpdate = true; ga.iC3790.needsUpdate = true; } }
      st.drawnN = n;
    } catch (e) { fail('place', e); }
    st.placeMs = performance.now() - t0; if (st.placeMs > (st.placeMax || 0)) st.placeMax = st.placeMs;
  }
  function fail(where, e) { st.fault = where + ': ' + (e && e.stack ? String(e.stack).split('\n').slice(0, 3).join(' | ') : e); st.enabled = false; for (var k in st.mesh) { st.mesh[k].count = 0; st.mesh[k].visible = false; } }   // a fault takes the life away, never the game

  /* ---------- the feed: world-features.js hands each tile it builds (z14 only: the streets near her) ---------- */
  function listen() {
    var F = window.WFR_FEATURES; if (st.hooked || !F || typeof F.onTile !== 'function') return; st.hooked = true;
    try { F.onTile(function (z, x, y, feed) { try { if (!st.enabled || z !== 14 || !feed) return; var key = z + '/' + x + '/' + y; if (st.tiles.has(key)) return; var T = new Tile(z, x, y, feed);   /* the same tile built again (a recentre): its life is in its own metres, kept as it is */ st.tiles.set(key, T); st.queue.push(T); } catch (e) { st.listenFault = String(e && e.message || e); } });
      if (typeof F.onDrop === 'function') F.onDrop(function (z, x, y) { try { dropTile(z + '/' + x + '/' + y); } catch (e) { st.listenFault = String(e && e.message || e); } }); } catch (e) { st.hookFault = String(e && e.message || e); }
  }
  function dropTile(key) { var T = st.tiles.get(key); if (!T) return; st.tiles.delete(key); var qi = st.queue.indexOf(T); if (qi >= 0) st.queue.splice(qi, 1); if (T.cells) T.cells.forEach(function (c) { if (c.active) sleep(c); });
    for (var i = 0; i < st.agents.length; i++) { var a = st.agents[i]; if (a.T === T || (a.P && a.P.T === T)) a.dead = true; } st.flocks.forEach(function (F) { if (F.T === T) F.dead = true; }); }

  function init(ctx) {
    if (st.inited) return true; X = ctx || {};
    try {
      if (!X.THREE || !X.scene || !window.WFR_WORLD) { st.fault = 'init: no THREE, scene or WFR_WORLD'; return false; }
      if (X.classic && X.classic()) { st.why = 'classic'; st.fault = 'classic look: life790 is Standard only (board 645)'; return false; }
      var THREE = X.THREE; st.U = { eye: { value: new THREE.Vector3() }, invK: { value: 1 }, t: { value: 0 }, glow: { value: 0 } };
      st.mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }); st.mat.name = 'life790'; st.mat.onBeforeCompile = OBC; st.mat.customProgramCacheKey = function () { return 'life790'; };
      st.root = new THREE.Group(); st.root.name = 'life790'; st.root.matrixAutoUpdate = false;
      var Cp = C.CAP; meshOf('personN', personBody(), Cp.personN); meshOf('personF', personFar(), Cp.personF); meshOf('prop', guitarBody(), Cp.prop); meshOf('dog', dogBody(), Cp.dog); meshOf('car', carBody(), Cp.car); meshOf('carF', carFar(), Cp.carF); meshOf('bus', busBody(), Cp.bus);
      meshOf('tram', tramBody(), Cp.tram); meshOf('train', trainBody(), Cp.train); meshOf('sail', sailBody(), Cp.sail); meshOf('motor', motorBody(), Cp.motor); meshOf('ferry', ferryBody(), Cp.ferry); meshOf('pigeon', pigeonBody(), Cp.pigeon); meshOf('gull', gullBody(), Cp.gull); meshOf('duck', duckBody(), Cp.duck);
      var kb = new Body(); kb.tri([0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]); var keeper = meshOf('keep', kb, 1); delete st.mesh.keep; delete st.lists.keep; keeper.count = 1; keeper.visible = true; keeper.layers.set(0); keeper.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0));   // one empty instance: the program compiles at load, never in flight
      X.scene.add(st.root); st.root.updateMatrixWorld(true);
      var prev = X.scene.onBeforeRender; X.scene.onBeforeRender = function () { if (typeof prev === 'function') prev.apply(this, arguments); place(); };
      listen(); st.inited = true; return true;
    } catch (e) { st.fault = 'init: ' + (e && e.message || e); return false; }
  }
  function tick(dt) {
    if (!st.inited || !st.enabled) return; var t0 = performance.now(); dt = Math.min(0.1, dt || 0);
    try {
      st.t += dt; st.frame++; if (!st.hooked) listen(); var T = X.TR, on = !!(T && T.on && T.f && T.st && X.S && X.S.pos); st.mode = on ? 'travel' : 'off';
      if (!on) { st.acc = 0; } else {
        if (T.f !== st.f) { st.f = T.f; st.ep++; }
        st.hour = hourOf(X.S.clock); st.night = nightOf(st.hour);
        var ti = performance.now(), until = ti + C.INGEST_MS; while (st.queue.length && performance.now() < until) { if (ingest(st.queue[0], until)) st.queue.shift(); } var im = performance.now() - ti; st.ingestMs += im; if (im > st.ingestMax) st.ingestMax = im;
        st.acc -= dt; if (st.acc <= 0) { st.acc = C.REFRESH; var tr = performance.now(); st.nRef = (st.nRef || 0) + 1; refresh(); tr = performance.now() - tr; if (tr > st.refMax) st.refMax = tr; }
        for (var i = 0; i < st.agents.length; i++) { var a = st.agents[i]; if (!a.dead) stepAgent(a, dt); }
        stepFlocks(dt);
      }
    } catch (e) { fail('tick', e); }
    var ms = performance.now() - t0 + st.placeMs; st.placeMs = 0; st.ms.push(ms); if (st.ms.length > 600) st.ms.shift(); if (ms > st.msMax) st.msMax = ms;
  }

  /* ---------- part C's doors (handles), and the bench's reads (guards only) ---------- */
  function near(x, z, r, kinds) {   // every living thing within r m of a frame point (agents and flocks), nearest first
    var out = [], r2 = r * r, i; for (i = 0; i < st.agents.length; i++) { var a = st.agents[i]; if (a.dead || (kinds && kinds.indexOf(a.what) < 0 && kinds.indexOf(a.k) < 0)) continue; var dx = a.lx - x, dz = a.lz - z; if (dx * dx + dz * dz <= r2) out.push({ d: Math.sqrt(dx * dx + dz * dz), h: a }); }
    for (i = 0; i < st.flocks.length; i++) { var F = st.flocks[i]; if (F.dead || (kinds && kinds.indexOf(F.kind) < 0 && kinds.indexOf(F.what) < 0)) continue; var w = flockWhere(F), ex = w.x - x, ez = w.z - z; if (ex * ex + ez * ez <= r2) out.push({ d: Math.sqrt(ex * ex + ez * ez), h: fHandle(F) }); }
    return out.sort(function (p, q) { return p.d - q.d; }).map(function (o) { return o.h; });
  }
  function fHandle(F) { return { id: F.id, kind: F.kind, what: F.what, n: F.n, rideable: false, where: function () { return flockWhere(F); }, startle: function (x, z) { var A = F.T.anchor(), dx = x - A.ox, dz = z - A.oz; return scatter(F, (A.d * dx - A.b * dz) / A.det, (-A.c * dx + A.a * dz) / A.det); }, seat: function () { return null; }, state: function () { return F.state; } }; }
  function get(id) { var o = st.byId.get(id); if (!o) return null; return o instanceof Agent ? o : fHandle(o); }
  function peek() {
    var byK = {}, i; for (i = 0; i < st.agents.length; i++) { var a = st.agents[i]; if (!a.dead) byK[a.k] = (byK[a.k] || 0) + 1; } var fl = {}; st.flocks.forEach(function (F) { if (!F.dead) { fl[F.kind] = (fl[F.kind] || 0) + 1; fl[F.kind + 'Birds'] = (fl[F.kind + 'Birds'] || 0) + F.n; } });
    var draws = 0, tris = 0, n = {}; for (var k in st.mesh) { var im = st.mesh[k]; n[k] = im.count; if (im.count && im.visible) { draws++; tris += im.count * im.userData.tris; } }
    var ms = st.ms.slice().sort(function (p, q) { return p - q; }), q = function (p) { return ms.length ? +ms[Math.min(ms.length - 1, Math.floor(ms.length * p))].toFixed(3) : null; };
    var lu = {}, cellsN = 0; st.cells.forEach(function (c) { cellsN++; lu[c.lu] = (lu[c.lu] || 0) + 1; }); var paths = { tram: 0, train: 0, road: 0, path: 0, river: 0 }, wat = { polys: 0, big: 0, cls: {}, loops: 0, gulls: 0, ducks: 0 }; st.tiles.forEach(function (T) { T.paths.forEach(function (P) { paths[P.kind] = (paths[P.kind] || 0) + 1; }); T.water.forEach(function (w) { wat.polys++; if (w.area >= 60000) wat.big++; wat.cls[w.cls] = (wat.cls[w.cls] || 0) + 1; }); (T.cells || []).forEach(function (c) { wat.loops += c.loops.length; wat.gulls += c.gulls.length; wat.ducks += c.ducks.length; }); });
    return { inited: st.inited, enabled: st.enabled, fault: st.fault, why: st.why, mode: st.mode, t: +st.t.toFixed(2), hour: +st.hour.toFixed(2), night: +st.night.toFixed(2), tiles: st.tiles.size, tilesIn: st.tilesIn, queue: st.queue.length, cells: cellsN, lu: lu, paths: paths,
      agents: st.agents.length, byKind: byK, water: wat, flocks: fl, loops: st.loops.length, n: n, draws: draws, tris: Math.round(tris), caps: C.CAP, scatters: st.scatters, gullVeers: st.gullVeers, lastScatter: st.lastScatter, agl: st.agl != null ? +st.agl.toFixed(1) : null,
      ms: { n: ms.length, med: q(0.5), p95: q(0.95), max: +st.msMax.toFixed(3) }, ingest: { ms: +st.ingestMs.toFixed(1), max: +st.ingestMax.toFixed(2) }, refMax: +(st.refMax || 0).toFixed(2), nRef: st.nRef || 0, filled: st.filled, nActive: st.cells.size, frame: st.frame, placeMax: +(st.placeMax || 0).toFixed(2), programs: X && X.renderer ? X.renderer.info.programs.filter(function (p) { return /life790/.test(p.cacheKey || ''); }).length : null, listenFault: st.listenFault, hookFault: st.hookFault }; }
  function drawn(kind) {   // what SHIPS: read back from the instance buffers, with each point's lat/lon
    var out = [], f = st.f; for (var k in st.mesh) { if (kind && k !== kind) continue; var im = st.mesh[k], A = im.instanceMatrix.array; if (!im.visible) continue; for (var i = 0; i < im.count; i++) { var o = i * 16, x = A[o + 12], z = A[o + 14], ll = f ? WFR_WORLD.toLatLon(f, x, z) : null; out.push({ k: k, x: x, y: A[o + 13], z: z, s: Math.hypot(A[o], A[o + 1], A[o + 2]), lat: ll && ll.lat, lon: ll && ll.lon, mode: im.geometry.attributes.iA790.array[i * 4 + 3] }); } } return out; }
  function flocksNear(r) { var out = []; st.flocks.forEach(function (F) { if (F.dead) return; var h = F.T.her(), d = Math.hypot(F.mx - h[0], F.mz - h[1]); if (d <= r) { var w = flockWhere(F); out.push({ id: F.id, kind: F.kind, state: F.state, n: F.n, d: +d.toFixed(1), x: w.x, y: w.y, z: w.z, lat: w.lat, lon: w.lon }); } }); return out.sort(function (p, q) { return p.d - q.d; }); }
  function pathsNear(lat, lon, r, kind) { var out = []; st.tiles.forEach(function (T) { if (!T.ready) return; var q = T.m(lat, lon, [0, 0]); T.paths.forEach(function (P) { if (kind && P.kind !== kind) return; for (var i = 0; i < P.cum.length; i++) { var dx = P.m[2 * i] - q[0], dz = P.m[2 * i + 1] - q[1]; if (dx * dx + dz * dz < r * r) { out.push({ id: P.id, kind: P.kind, cls: P.cls, len: Math.round(P.len), dirOnly: P.dirOnly, stops: P.stops ? P.stops.length : 0 }); return; } } }); }); return out; }
  function onLine(lat, lon, kinds) {   // the bench's read: metres from a point to the nearest path of these kinds (the map's own line), with its class
    var best = null; st.tiles.forEach(function (T) { if (!T.ready) return; var q = T.m(lat, lon, [0, 0]); if (q[0] < T.x0 - 80 || q[0] > T.x1 + 80 || q[1] < T.z0 - 80 || q[1] > T.z1 + 80) return;
      T.paths.forEach(function (P) { if (kinds.indexOf(P.kind) < 0) return; for (var k = 0; k + 1 < P.cum.length; k++) { var x0 = P.m[2 * k], z0 = P.m[2 * k + 1], ex = P.m[2 * k + 2] - x0, ez = P.m[2 * k + 3] - z0, l2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((q[0] - x0) * ex + (q[1] - z0) * ez) / l2)), dx = x0 + ex * t - q[0], dz = z0 + ez * t - q[1], d = Math.sqrt(dx * dx + dz * dz);
        if (!best || d < best.d) best = { d: +d.toFixed(2), kind: P.kind, cls: P.cls, sub: P.sub || null, w: P.w }; } }); });
    return best; }
  function tramLines() { var n = 0, sub = 0, len = 0; st.tiles.forEach(function (T) { T.paths.forEach(function (P) { if (P.kind === 'tram') { n++; len += P.len; if (P.sub === 'tram' || P.sub === 'light_rail') sub++; } }); }); return { n: n, fromMap: sub, km: +(len / 1000).toFixed(2) }; }
  return { C: C, init: init, tick: tick, peek: peek, drawn: drawn, near: near, solid808: solid808, lensOut808: lensOut808, get: get, flocksNear: flocksNear, pathsNear: pathsNear, onLine: onLine, tramLines: tramLines, hourOf: hourOf, resetMs: function () { st.ms = []; st.msMax = 0; st.ingestMax = 0; st.refMax = 0; st.placeMax = 0; },
    set enabled(v) { st.enabled = !!v; if (!v) for (var k in st.mesh) { st.mesh[k].count = 0; st.mesh[k].visible = false; } }, get enabled() { return st.enabled; } };
})();
