/* world-huts.js - BOARD 730, REGION-NATIVE HUTS IN THE WORLD (Wings for Rouge). Trunks, Nov 4 2026.
   Marth, Nov 4 2026, verbatim: "we need to be able to make random huts that are native to their region or continent". Asked who makes them, his
   button: "The world has them".

   WHAT ROUGE SEES: wherever she flies in the real world (the travel zone), small hamlets of the dwellings people really build there, out in the
   countryside: rondavels with thatched cones in southern and eastern Africa (some painted turquoise at the front, as in the Transkei) and tukuls in
   Ethiopia; Maasai enkangs (the loaf houses in a ring inside the thorn fence, the cattle ring at the centre) in the Kenya-Tanzania rift; West
   Africa's mud-brick compounds with their round thatched rooms and granaries; flat-roofed adobe in North Africa, Arabia and Persia; Berber and
   Bedouin tents in the Sahara and Arabia and the black yak-hair tents on the Tibetan plateau; gers on the Mongolian and Kazakh steppe (doors to the
   south, as they are pitched); igloos on the Arctic coasts in winter and sod houses (qarmaq) all year, Iceland's turf houses, the Sámi lavvu in
   Sápmi (and the Nenets' chum, the same cone, in the Russian Arctic); minka under thatched irimoya roofs in rural Japan; siheyuan courtyards in
   north China, tulou rings in Fujian, stilt houses in the south-west and across South-East Asia; mud-and-thatch houses in India; board houses on
   blocks with zinc roofs and verandahs in the Caribbean; Samoan fale and thatched huts across Polynesia; adobe under clay tiles and stone houses
   under ichu thatch in the Andes; maloca longhouses in the Amazon; log cabins across North America and the northern forests, adobe pueblos in the
   South-West; thatched and half-timbered cottages in Europe, chalets in the Alps, stone and tile round the Mediterranean; outback homesteads with a
   tank and a windmill in Australia. Goats graze by many of them and camels by the desert tents; a few people stand by the doors (world-people.js).
   The same hamlets in the same places on every visit: every one is generated from the cell's own key, never Math.random.
   RESPECT: real architecture in the game's low-poly style, never caricature. No religious objects are drawn (Marth's to rule on); the pueblos and
   the Amazon's malocas stand without people put in them (living communities: his to decide); every name and line below is DRAFT for his pen.

   REUSED, NOT REWRITTEN (MBAEEMP): world-animals.js's whole frame for the real world: its cells, its seeds (world-people.js's hash and rng), its
   drawn-sheet reads (rawAt, colAt), its OpenStreetMap veto (world-features.js onTile: water, towns, ice, and here the buildings too), its keeper
   instance that compiles the one program at load, its scene.onBeforeRender placement; world-animals.js's own goat and camel bodies (model + pose,
   its public doors) for the livestock; world-people.js's addPlace and its CC0 people for the folk at the doors; WFR_WORLD for every lat/lon.
   NEW (nothing on the shelf fits: cabins.js and treehouses.js are textured, multi-material island pieces that would cost a program each): a small
   flat-colour shape kit (box, cylinder and cone, dome, gable and hip roofs, rods) and twenty-seven dwellings built from it. Licence: our own code.

   HOW (cheap): cells of 0.025 deg; a cell near her is classified once the ground under it is final and given up to two hamlets from a generator
   seeded by its key. Every dwelling kind (and colour variant) is ONE InstancedMesh; every hut and animal shares ONE material program (Lambert with
   vertex colours, a soft contact shade at the foot of the walls, a daylight fill so whitewash reads white under the travel zone's high sun, warm lamplit
   windows at night), compiled at load by a keeper instance. Huts never
   move, so their matrices are written only when the set or the travel frame changes. A footprint must be dry, gentle land outside every OSM
   water, town and building polygon; features that arrive later re-check the huts already standing. Far cells are dropped (a return is the same).

   THE PAGE HANDS IT (tools/wiring/wire-huts.js): WFR_HUTS.init(ctx) once, tick(dt) each frame (beside the world animals' tick).
   ctx = { THREE, scene, renderer, camera, S, TR: TRAVEL712, H: travel712H, night: () => 0..1, classic: () => bool }
   Every number and every name is DRAFT for Marth's pen. */
window.WFR_HUTS = (function () {
  'use strict';
  var C = { CELL: 0.025, R_SPAWN: 2200, R_DROP: 3000, AGL_MAX: 3200, POP: 2, IMG_WAIT: 4, LOAD_MAX: 6, CAP: 160, LAYER: 7, KEEP: 300, LAND_MIN: 2,
    REFRESH: 20, PEOPLE_R: 1100, PEOPLE_DROP: 1700, PEOPLE_MAX: 5, VETO_R: 3500, TAHOE_LV: 1897.6, SEASON: null };
  var D2R = Math.PI / 180, TAU = Math.PI * 2;
  var X = null;
  var st = { inited: false, enabled: true, fault: null, faultAt: null, t: 0, dt: 0, frame: 0, cells: new Map(), act: [], mat: null, keep: null, root: null, kinds: {},
    built: [], ms: [], msMax: 0, placeMs: 0, pops: 0, drops: 0, waits: 0, img: 0, tint: 0, feat: new Map(), featTiles: 0, featGen: 0, featSeen: 0, featHooked: false, featPoll: 0,
    featFault: null, mode: 'off', her: { x: 0, y: 0, z: 0, agl: 0, lat: 0, lon: 0 }, dirty: true, fKey: '', rr: 0, vetoes: 0, refreshN: 0, placeN: 0, writes: 0,
    people: new Map(), peopleN: 0, peopleFault: null, stockFault: null, hook: false, buildN: -1, night: 0 };

  /* ---------- seeds: world-people.js's, line for line ---------- */
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function inB(lat, lon, B) { return lat >= B[0] && lat <= B[1] && lon >= B[2] && lon <= B[3]; }

  /* ---------- 1. THE SHAPE KIT: flat faces, vertex colours, outward normals (each face is turned to face away from a point inside, or up) ---------- */
  var WIN = 0x1a1410, SHOJI = 0xe9dcc0;   // the two colours the shader lights at night (a dark window pane, a paper screen)
  function hx(h) { return typeof h === 'number' ? [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255] : h; }
  function dk(c, k) { c = hx(c); return [c[0] * k, c[1] * k, c[2] * k]; }
  function G0() { return { p: [], n: [], c: [], tx: 0, ty: 0, tz: 0, yaw: 0, cy: 1, sy: 0 }; }
  function setT(G, x, y, z, yaw) { G.tx = x; G.ty = y; G.tz = z; G.yaw = yaw; G.cy = Math.cos(yaw); G.sy = Math.sin(yaw); }
  function T(G, v) { return [G.tx + v[0] * G.cy + v[2] * G.sy, G.ty + v[1], G.tz - v[0] * G.sy + v[2] * G.cy]; }
  function sub(G, x, y, z, yaw, fn) { var s = [G.tx, G.ty, G.tz, G.yaw], p = T(G, [x, y, z]); setT(G, p[0], p[1], p[2], G.yaw + (yaw || 0)); fn(); setT(G, s[0], s[1], s[2], s[3]); }
  function yawTo(dx, dz) { return Math.atan2(dx, dz); }   // the yaw that turns a local +z (a door) toward (dx, dz)
  function emit(G, Q, nx, ny, nz, c) { for (var i = 1; i + 1 < Q.length; i++) { var t = [Q[0], Q[i], Q[i + 1]]; for (var k = 0; k < 3; k++) { G.p.push(t[k][0], t[k][1], t[k][2]); G.n.push(nx, ny, nz); G.c.push(c[0], c[1], c[2]); } } }
  function face(G, P, col, ref, two) {
    var Q = P.map(function (v) { return T(G, v); }), n = Q.length, nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0, i;
    for (i = 0; i < n; i++) { var a = Q[i], b = Q[(i + 1) % n]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); cx += a[0]; cy += a[1]; cz += a[2]; }
    var L = Math.hypot(nx, ny, nz); if (!(L > 1e-9)) return; nx /= L; ny /= L; nz /= L; cx /= n; cy /= n; cz /= n;
    var want; if (ref === 'up') want = ny; else if (ref === 'down') want = -ny; else { var R = T(G, ref); want = nx * (cx - R[0]) + ny * (cy - R[1]) + nz * (cz - R[2]); }
    if (want < 0) { Q.reverse(); nx = -nx; ny = -ny; nz = -nz; }
    emit(G, Q, nx, ny, nz, hx(col));
    if (two) emit(G, Q.slice().reverse(), -nx, -ny, -nz, dk(col, 0.62));
  }
  function box(G, x, y, z, w, h, d, col, o) {   // centred on x, z; from y up by h; o.top its lid's colour, o.front the +z face's, o.noTop
    o = o || {}; var a = w / 2, b = d / 2, y1 = y + h, ref = [x, y + h / 2, z], P = function (sx, yy, sz) { return [x + sx * a, yy, z + sz * b]; };
    face(G, [P(-1, y, 1), P(1, y, 1), P(1, y1, 1), P(-1, y1, 1)], o.front != null ? o.front : col, ref);
    face(G, [P(1, y, -1), P(-1, y, -1), P(-1, y1, -1), P(1, y1, -1)], col, ref);
    face(G, [P(1, y, 1), P(1, y, -1), P(1, y1, -1), P(1, y1, 1)], o.side != null ? o.side : col, ref);
    face(G, [P(-1, y, -1), P(-1, y, 1), P(-1, y1, 1), P(-1, y1, -1)], o.side != null ? o.side : col, ref);
    if (!o.noTop) face(G, [P(-1, y1, 1), P(1, y1, 1), P(1, y1, -1), P(-1, y1, -1)], o.top != null ? o.top : col, ref);
  }
  function cyl(G, x, z, y0, y1, r0, r1, n, col, o) {   // a ring of n faces from radius r0 at y0 to r1 at y1 (r1 0: a cone); o.sx / o.sz an oval, o.a0 its turn, o.mode 'out' | 'in' | 'up', o.cap a lid
    o = o || {}; var sx = o.sx || 1, sz = o.sz || 1, a0 = o.a0 || 0, A = [], B = [], i, mode = o.mode || 'out', my = (y0 + y1) / 2;
    for (i = 0; i < n; i++) { var a = a0 + i / n * TAU, c = Math.cos(a), s = Math.sin(a); A.push([x + c * r0 * sx, y0, z + s * r0 * sz]); B.push([x + c * r1 * sx, y1, z + s * r1 * sz]); }
    for (i = 0; i < n; i++) { var j = (i + 1) % n, am = a0 + (i + 0.5) / n * TAU, cc = typeof col === 'function' ? col(i, am, n) : col;
      var Pq = r1 > 1e-6 ? [A[i], A[j], B[j], B[i]] : [A[i], A[j], B[i]], ref = mode === 'up' ? 'up' : mode === 'in' ? [x + Math.cos(am) * 1e4, my, z + Math.sin(am) * 1e4] : [x, my, z];
      face(G, Pq, cc, ref, o.two); }
    if (o.cap && r1 > 1e-6) face(G, B.slice(), o.capCol != null ? o.capCol : (typeof col === 'function' ? col(0, 0, n) : col), 'up');
  }
  function dome(G, x, y, z, r, rings, segs, col, o) {   // a half sphere (o.h its height); col may be a function of (ring, segment)
    o = o || {}; var h = o.h || r, sx = o.sx || 1, sz = o.sz || 1, P = function (ri, si) { var ph = ri / rings * Math.PI / 2, a = si / segs * TAU; return [x + Math.cos(a) * Math.cos(ph) * r * sx, y + Math.sin(ph) * h, z + Math.sin(a) * Math.cos(ph) * r * sz]; };
    for (var i = 0; i < rings; i++) for (var j = 0; j < segs; j++) { var cc = typeof col === 'function' ? col(i, j) : col; face(G, i === rings - 1 ? [P(i, j), P(i, j + 1), P(i + 1, j)] : [P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j)], cc, [x, y, z]); }
  }
  function rod(G, a, b, r, col, n) {   // a thin prism from a to b (poles, posts, rails, blades)
    n = n || 4; var d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]); if (!(L > 1e-6)) return; d = [d[0] / L, d[1] / L, d[2] / L];
    var up = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]], ul = Math.hypot(u[0], u[1], u[2]); u = [u[0] / ul, u[1] / ul, u[2] / ul];
    var w = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], ring = function (p, k) { var t = k / n * TAU + Math.PI / n, c = Math.cos(t) * r, s = Math.sin(t) * r; return [p[0] + u[0] * c + w[0] * s, p[1] + u[1] * c + w[1] * s, p[2] + u[2] * c + w[2] * s]; };
    for (var k = 0; k < n; k++) face(G, [ring(a, k), ring(a, k + 1), ring(b, k + 1), ring(b, k)], col, m);
  }
  function gable(G, x, y, z, w, d, rise, ov, col, endCol, o) {   // the ridge along x; eaves at y on the long sides, ov out; o.ovx at the gable ends, o.th the roof's edge, o.ridge a cap
    o = o || {}; var sl = rise / (d / 2), A = w / 2 + (o.ovx != null ? o.ovx : ov * 0.6), B = d / 2 + ov, ye = y - ov * sl, yr = y + rise, th = o.th || 0.12, ec = dk(col, 0.8), mid = [x, ye - 1, z];
    [1, -1].forEach(function (s) {
      face(G, [[x - A, ye, z + s * B], [x + A, ye, z + s * B], [x + A, yr, z], [x - A, yr, z]], col, 'up', true);
      face(G, [[x - A, ye, z + s * B], [x + A, ye, z + s * B], [x + A, ye - th, z + s * B], [x - A, ye - th, z + s * B]], ec, [x, ye, z]);
      face(G, [[x + s * A, ye, z + B], [x + s * A, yr, z], [x + s * A, yr - th, z], [x + s * A, ye - th, z + B]], ec, mid);
      face(G, [[x + s * A, ye, z - B], [x + s * A, yr, z], [x + s * A, yr - th, z], [x + s * A, ye - th, z - B]], ec, mid);
      if (endCol != null) face(G, [[x + s * w / 2, y, z + d / 2], [x + s * w / 2, y, z - d / 2], [x + s * w / 2, yr, z]], endCol, [x, y, z]);
    });
    if (o.ridge != null) box(G, x, yr - 0.1, z, 2 * A + 0.1, 0.24, 0.34, o.ridge);
    return { ye: ye, yr: yr };
  }
  function hip(G, x, y, z, w, d, rise, L, ov, col, o) {   // eaves at y all round (ov out), the ridge L long along x at y + rise
    o = o || {}; var A = w / 2 + ov, B = d / 2 + ov, sl = rise / (d / 2), ye = y - ov * sl, yr = y + rise, h = L / 2, th = o.th || 0.12;
    var e = [[x - A, ye, z + B], [x + A, ye, z + B], [x + A, ye, z - B], [x - A, ye, z - B]], r0 = [x - h, yr, z], r1 = [x + h, yr, z];
    face(G, [e[0], e[1], r1, r0], col, 'up', true); face(G, [e[2], e[3], r0, r1], col, 'up', true); face(G, [e[1], e[2], r1], col, 'up', true); face(G, [e[3], e[0], r0], col, 'up', true);
    for (var i = 0; i < 4; i++) { var a = e[i], b = e[(i + 1) % 4]; face(G, [a, b, [b[0], b[1] - th, b[2]], [a[0], a[1] - th, a[2]]], dk(col, 0.8), [x, ye, z]); }
    if (o.ridge != null && L > 0) box(G, x, yr - 0.1, z, L + 0.3, 0.24, 0.34, o.ridge);
    return { ye: ye, yr: yr, A: A, B: B };
  }
  function winZ(G, x, y, z, w, h, s, col) { box(G, x, y, z + s * 0.03, w, h, 0.07, col != null ? col : WIN); }   // a pane (or door) on a wall facing +z (s 1) or -z (s -1)
  function winX(G, x, y, z, w, h, s, col) { box(G, x + s * 0.03, y, z, 0.07, h, w, col != null ? col : WIN); }
  function ladder(G, a, b, col) { var off = [0.25, 0, 0]; rod(G, [a[0] - off[0], a[1], a[2]], [b[0] - off[0], b[1], b[2]], 0.05, col); rod(G, [a[0] + off[0], a[1], a[2]], [b[0] + off[0], b[1], b[2]], 0.05, col);
    for (var k = 1; k < 6; k++) { var u = k / 6, p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; rod(G, [p[0] - 0.25, p[1], p[2]], [p[0] + 0.25, p[1], p[2]], 0.035, col); } }

  /* ---------- 2. THE DWELLINGS (local metres: the ground at y 0, the door toward +z; P the footing's depth below the ground) ---------- */
  var THATCH = 0xb39256, DOOR = 0x3b2a1d;
  var B = {
    rondavel: function (G, v, P) {   // southern and eastern Africa: a round mud wall, whitewash or ochre (or turquoise at the front), a thatched cone
      var wall = [0xe8e2d2, 0xbf8f5f, 0xe8e2d2][v], front = [0xe8e2d2, 0xbf8f5f, 0x4fb3a9][v], a0 = TAU / 24;
      cyl(G, 0, 0, -P, 0.15, 3.2, 3.2, 12, 0x7b5d43, { a0: a0, cap: true });
      cyl(G, 0, 0, 0.15, 2.3, 3.0, 3.0, 12, function (i, a) { return Math.sin(a) > 0.2 ? front : wall; }, { a0: a0 });
      cyl(G, 0, 0, 1.92, 2.12, 3.7, 3.7, 12, dk(THATCH, 0.78), { a0: a0 });
      cyl(G, 0, 0, 2.12, 5.0, 3.7, 0, 12, THATCH, { a0: a0, mode: 'up', two: true });
      cyl(G, 0, 0, 4.72, 5.3, 0.3, 0.04, 6, 0x6e5a3a, { mode: 'up' });
      winZ(G, 0, 0.15, 2.9, 0.95, 1.8, 1, DOOR); sub(G, 0, 0, 0, Math.PI * 0.6, function () { winZ(G, 0, 1.0, 2.9, 0.55, 0.55, 1); });
    },
    kraal: function (G, v, P) {   // a cattle kraal of posts (beside the rondavels)
      for (var i = 0; i < 30; i++) { if (i === 0 || i === 1) continue; var a = i / 30 * TAU, r = 5 + 0.15 * Math.sin(i * 2.7); rod(G, [Math.cos(a) * r, -P, Math.sin(a) * r], [Math.cos(a) * r, 1.2 + 0.25 * Math.sin(i * 1.9), Math.sin(a) * r], 0.08, i % 3 ? 0x6a5236 : 0x5a4630); }
      for (var k = 0; k < 3; k++) cyl(G, 0, 0, 0.55 + k * 0.32, 0.62 + k * 0.32, 5.05, 5.05, 30, 0x5e4a32, { a0: 2 / 30 * TAU });
    },
    enkang: function (G, v, P) {   // a Maasai enkang: the loaf houses (inkajijik) in a ring, a thorn fence round them, the cattle ring at the centre
      var r = rng(hash('enkang')), thorn = [0x5c4a34, 0x6b6448, 0x4e4230], mud = 0x8c7c66, mud2 = 0x7d6e5a, i, a;
      var gate = function (a) { var g1 = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))), g2 = Math.abs(Math.atan2(Math.sin(a - 4.4), Math.cos(a - 4.4))); return g1 < 0.12 || g2 < 0.12; };
      for (i = 0; i < 54; i++) { a = i / 54 * TAU; var hh = 1.25 + r() * 0.6, rr = 21 + (r() - 0.5) * 0.6; if (gate(a)) continue;
        sub(G, Math.cos(a) * rr, 0, Math.sin(a) * rr, yawTo(-Math.cos(a), -Math.sin(a)), function () { box(G, 0, -P, 0, 2.7, P + hh, 1.5, thorn[i % 3], { top: dk(thorn[(i + 1) % 3], 0.9) }); }); }
      for (i = 0; i < 30; i++) { a = i / 30 * TAU; if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.2) continue; var h2 = 0.9 + r() * 0.4;
        sub(G, Math.cos(a) * 8, 0, Math.sin(a) * 8, yawTo(-Math.cos(a), -Math.sin(a)), function () { box(G, 0, -P, 0, 1.75, P + h2, 0.9, thorn[(i + 2) % 3]); }); }
      for (i = 0; i < 9; i++) { a = (i + 0.5) / 9 * TAU; if (gate(a)) a += 0.3;
        sub(G, Math.cos(a) * 15.5, 0, Math.sin(a) * 15.5, yawTo(-Math.cos(a), -Math.sin(a)), function () {
          cyl(G, 0, 0, -P, 1.25, 1, 1, 10, mud, { sx: 2.5, sz: 1.5 }); cyl(G, 0, 0, 1.25, 1.62, 1, 0.72, 10, mud2, { sx: 2.5, sz: 1.5, mode: 'up' });
          cyl(G, 0, 0, 1.62, 1.78, 0.72, 0.3, 10, mud2, { sx: 2.5, sz: 1.5, mode: 'up', cap: true }); winZ(G, 0.9, 0, 1.47, 0.6, 1.0, 1, 0x2a2018); }); }
    },
    compound: function (G, v, P) {   // a West African compound: a banco wall round flat-roofed rooms, round thatched rooms and a granary
      var W = 0xa8673f, W2 = 0xb3754c, beam = 0x4a3424;
      box(G, -5.5, -P, -9, 7.4, P + 2.0, 0.45, W); box(G, 4.5, -P, -9, 9.4, P + 2.0, 0.45, W); box(G, -9, -P, 0, 0.45, P + 2.0, 18.4, W); box(G, 9, -P, 0, 0.45, P + 2.0, 18.4, W);
      box(G, -5.3, -P, 9, 7.8, P + 2.0, 0.45, W); box(G, 5.3, -P, 9, 7.8, P + 2.0, 0.45, W);
      box(G, -4.6, -P, -5.6, 6, P + 2.8, 4.2, W2, { top: 0x9a5e3a }); box(G, -4.6, 2.8, -3.55, 6, 0.35, 0.18, W2); box(G, -1.65, 2.8, -5.6, 0.18, 0.35, 4.2, W2);
      for (var i = 0; i < 6; i++) box(G, -7.2 + i * 1.05, 2.35, -3.3, 0.14, 0.14, 0.5, beam);
      winZ(G, -4.6, 0, -3.5, 0.9, 1.7, 1, DOOR); winZ(G, -6.6, 1.3, -3.5, 0.5, 0.5, 1);
      [[4.5, -4.8, 2.2], [5.2, 2.6, 2.0], [-5.4, 3.0, 2.0]].forEach(function (q, k) {
        sub(G, q[0], 0, q[1], yawTo(-q[0], -q[1]), function () { cyl(G, 0, 0, -P, 2.0, q[2], q[2], 10, k === 1 ? W2 : W); cyl(G, 0, 0, 1.75, 1.92, q[2] + 0.5, q[2] + 0.5, 10, dk(THATCH, 0.78));
          cyl(G, 0, 0, 1.92, 4.1, q[2] + 0.5, 0, 10, THATCH, { mode: 'up', two: true }); winZ(G, 0, 0, q[2] - 0.08, 0.75, 1.5, 1, DOOR); }); });
      [[-1.2, 0.6], [1.0, -0.6], [0, 0.9]].forEach(function (s) { box(G, -1.4 + s[0], -P, 5 + s[1], 0.45, P + 0.5, 0.45, 0x8a8478); });
      cyl(G, -1.4, 5, 0.5, 2.4, 1.05, 1.0, 9, W2); cyl(G, -1.4, 5, 2.25, 3.5, 1.4, 0, 9, THATCH, { mode: 'up', two: true });
    },
    flatadobe: function (G, v, P) {   // North Africa, Arabia, Persia: a flat-roofed earth house with a parapet, a room on the roof
      var c = [0xb8875a, 0xd6c19c, 0xa8624a][v], top = dk(c, 0.92), door = [DOOR, 0x5a3a24, 0x2f5f8f][v];
      box(G, 0, -P, 0, 7, P + 3.2, 6, c, { top: top }); box(G, 0, 3.2, 2.9, 7, 0.45, 0.22, c); box(G, 0, 3.2, -2.9, 7, 0.45, 0.22, c); box(G, 3.4, 3.2, 0, 0.22, 0.45, 6, c); box(G, -3.4, 3.2, 0, 0.22, 0.45, 6, c);
      box(G, 1.7, 3.2, -1.3, 3.2, 2.4, 3.0, c, { top: top }); box(G, 1.7, 5.6, 0.12, 3.2, 0.3, 0.18, c);
      winZ(G, -1.2, 0, 3.0, 1.0, 2.0, 1, door); winZ(G, 1.5, 1.7, 3.0, 0.5, 0.6, 1); winZ(G, -2.6, 1.7, 3.0, 0.45, 0.55, 1); winZ(G, 1.7, 4.3, 0.2, 0.5, 0.6, 1);
      box(G, -3.1, 2.9, 3.15, 0.12, 0.12, 0.45, 0x6a5a48);
    },
    tent: function (G, v, P) {   // a black tent of woven goat (Berber, Bedouin) or yak hair (Tibet): a low ridge on poles, the front raised as an awning
      var cA = v ? 0x1f1c1b : 0x2b2522, cB = v ? 0x332d29 : 0x5a4a3a, strip = function (k) { return k % 2 ? cB : cA; };
      var yR = 2.0, xw = 4.2, zb = -2.6, yb = 0.75, zf = 2.6, yf = 1.55, n = 4, k;
      for (k = 0; k < n; k++) { var u0 = k / n, u1 = (k + 1) / n;
        face(G, [[-xw, yR + (yb - yR) * u0, zb * u0], [xw, yR + (yb - yR) * u0, zb * u0], [xw, yR + (yb - yR) * u1, zb * u1], [-xw, yR + (yb - yR) * u1, zb * u1]], strip(k), 'up', true);
        face(G, [[-xw, yR + (yf - yR) * u0, zf * u0], [xw, yR + (yf - yR) * u0, zf * u0], [xw, yR + (yf - yR) * u1, zf * u1], [-xw, yR + (yf - yR) * u1, zf * u1]], strip(k), 'up', true); }
      face(G, [[-xw, 0, zb], [xw, 0, zb], [xw, yb, zb], [-xw, yb, zb]], cA, [0, 1, 0]);
      [1, -1].forEach(function (s) { face(G, [[s * xw, 0, zb], [s * xw, 0, 0.6], [s * xw, yR, 0], [s * xw, yb, zb]], cA, [0, 1, 0]); });
      face(G, [[-xw + 0.1, 0, 0.05], [xw - 0.1, 0, 0.05], [xw - 0.1, yR - 0.05, 0.05], [-xw + 0.1, yR - 0.05, 0.05]], 0x3a2a22, [0, 1, -3]);
      [-2.6, 0, 2.6].forEach(function (x) { rod(G, [x, 0, 0], [x, yR, 0], 0.06, 0x5a4632); rod(G, [x, 0, zf], [x, yf, zf], 0.05, 0x5a4632); });
      [-xw, xw].forEach(function (x) { rod(G, [x, yf, zf], [x * 1.25, 0, zf + 1.4], 0.02, 0x8a7a62); rod(G, [x, yb, zb], [x * 1.25, 0, zb - 1.4], 0.02, 0x8a7a62); });
      box(G, 0, 0, 1.4, 3.2, 0.04, 2.2, v ? 0x6a3a2a : 0x8a2e26, { top: v ? 0x7a4a32 : 0x9c3a2c }); box(G, 0, -P, 0, 8.6, P, 5.4, 0x6a5a48, { noTop: true });
    },
    ger: function (G, v, P) {   // a ger: felt over a lattice wall, a shallow roof to the crown, the painted door to the south
      var felt = 0xf0ece0, felt2 = 0xe8e2d4, rope = 0x5a4a3a, a0 = TAU / 32;
      cyl(G, 0, 0, -P, 0.18, 3.3, 3.3, 16, 0x6b5a46, { a0: a0, cap: true });
      cyl(G, 0, 0, 0.18, 1.75, 3.15, 3.15, 16, felt, { a0: a0 });
      cyl(G, 0, 0, 0.55, 0.66, 3.19, 3.19, 16, rope, { a0: a0 }); cyl(G, 0, 0, 1.3, 1.41, 3.19, 3.19, 16, rope, { a0: a0 });
      cyl(G, 0, 0, 1.58, 1.74, 3.36, 3.36, 16, v ? 0x2f5d9a : felt2, { a0: a0 });
      cyl(G, 0, 0, 1.74, 2.86, 3.36, 0.62, 16, felt2, { a0: a0, mode: 'up', two: true });
      for (var i = 0; i < 4; i++) { var a = (i + 0.5) / 4 * TAU; rod(G, [Math.cos(a) * 3.38, 1.76, Math.sin(a) * 3.38], [Math.cos(a) * 0.66, 2.88, Math.sin(a) * 0.66], 0.03, rope); }
      cyl(G, 0, 0, 2.86, 3.0, 0.62, 0.56, 10, 0xa4683a, { cap: true });
      rod(G, [0.3, 2.7, -0.2], [0.3, 3.75, -0.2], 0.07, 0x3a3634, 6);
      winZ(G, 0, 0.18, 3.08, 1.05, 1.45, 1, 0x9a4a22); winZ(G, 0, 0.26, 3.13, 0.8, 1.25, 1, 0xd2692c);
    },
    igloo: function (G, v, P) {   // an igloo: snow blocks in rising rings, the cold-trap tunnel to the front, a clear ice pane
      var sh = [0xf3f7fb, 0xe3ebf2, 0xebf1f7];
      cyl(G, 0, 0, -P, 0.06, 2.6, 2.6, 14, 0xf4f7fa, { cap: true });
      dome(G, 0, 0.06, 0, 2.1, 5, 14, function (i, j) { return sh[(j + (i % 2) * 7 + i) % 3]; }, { h: 1.95 });
      var n = 6, k, R = 0.78, z0 = 1.55, z1 = 3.0;
      for (k = 0; k < n; k++) { var a = k / n * Math.PI, b = (k + 1) / n * Math.PI; face(G, [[Math.cos(a) * R, 0.06 + Math.sin(a) * R, z0], [Math.cos(a) * R, 0.06 + Math.sin(a) * R, z1], [Math.cos(b) * R, 0.06 + Math.sin(b) * R, z1], [Math.cos(b) * R, 0.06 + Math.sin(b) * R, z0]], sh[k % 3], [0, 0.06, 2.2]); }
      var m = []; for (k = 0; k <= n; k++) { var c = k / n * Math.PI; m.push([Math.cos(c) * (R - 0.12), 0.06 + Math.sin(c) * (R - 0.12), z1 + 0.02]); } face(G, m, 0x23303a, [0, 0.3, 0]);
      sub(G, 0, 0, 0, 2.2, function () { box(G, 0, 1.05, 1.86, 0.55, 0.42, 0.12, 0xbfd9ea); });
    },
    qarmaq: function (G, v, P) {   // an Arctic sod house: a low oval of turf and stone, a sunken entrance, a gut-skin window (v 1: snow on it, winter)
      var sod = 0x6f6450, roof = v ? 0xe8eef3 : 0x7d7258;
      cyl(G, 0, 0, -P, 0.95, 1, 1, 12, sod, { sx: 3.0, sz: 2.4 }); cyl(G, 0, 0, 0.95, 1.5, 1, 0.6, 12, roof, { sx: 3.0, sz: 2.4, mode: 'up' }); cyl(G, 0, 0, 1.5, 1.62, 0.6, 0.2, 12, roof, { sx: 3.0, sz: 2.4, mode: 'up', cap: true });
      box(G, 0, -P, 3.0, 1.2, P + 0.85, 1.9, 0x655a48, { top: roof }); winZ(G, 0, 0, 3.92, 0.6, 0.6, 1, 0x1c1814);
      sub(G, 0, 0, 0, 0, function () { box(G, 0, 1.26, 1.7, 0.7, 0.36, 0.1, 0xc8b080); });
    },
    turf: function (G, v, P) {   // an Icelandic turf house: three gabled rooms side by side, grass roofs, white wooden gables, the door in the middle
      var wall = 0x5f553c, grass = 0x6f8f46, white = 0xece8df;
      [-3.5, 0, 3.5].forEach(function (xo, k) {
        box(G, xo, -P, 0, 3.5, P + 1.45, 7.2, wall, { top: grass });
        sub(G, xo, 0, 0, Math.PI / 2, function () { gable(G, 0, 1.45, 0, 7.4, 3.5, 2.0, 0.12, grass, null, { th: 0.4, ovx: 0 }); });
        box(G, xo, 0, 3.62, 2.9, 1.45, 0.08, white); face(G, [[xo - 1.45, 1.45, 3.67], [xo + 1.45, 1.45, 3.67], [xo, 3.3, 3.67]], white, [xo, 1.45, 0]);
        if (k === 1) winZ(G, xo, 0, 3.66, 0.85, 1.7, 1, 0x6a2420); else { winZ(G, xo - 0.6, 0.6, 3.66, 0.5, 0.6, 1); winZ(G, xo + 0.6, 0.6, 3.66, 0.5, 0.6, 1); }
        winZ(G, xo, 2.0, 3.66, 0.4, 0.45, 1); });
    },
    lavvu: function (G, v, P) {   // a Sámi lavvu (and the Nenets' chum): a canvas cone on crossed poles, smoke-darkened at the top, the poles fanning out above
      cyl(G, 0, 0, -P, 0.03, 2.5, 2.5, 10, 0x5a4a3a, { cap: true });
      cyl(G, 0, 0, 0.03, 2.3, 2.4, 0.95, 10, 0xd8cdb4, { mode: 'up' }); cyl(G, 0, 0, 2.3, 3.35, 0.95, 0.32, 10, 0x8a7a62, { mode: 'up' });
      for (var i = 0; i < 9; i++) { var a = i / 9 * TAU + 0.2; rod(G, [Math.cos(a) * 0.5, 3.0, Math.sin(a) * 0.5], [-Math.cos(a) * 0.45, 4.35, -Math.sin(a) * 0.45], 0.035, 0x6b5338); }
      var rr = function (y) { return 2.4 - (2.4 - 0.95) * (y / 2.3) + 0.03; }, door = [];
      [[-0.24, 0.05], [0.24, 0.05], [0.18, 1.45], [-0.18, 1.45]].forEach(function (q) { door.push([Math.sin(q[0]) * rr(q[1]), q[1], Math.cos(q[0]) * rr(q[1])]); }); face(G, door, 0x6a5a48, [0, 1, 0]);
    },
    minka: function (G, v, P) {   // a minka of rural Japan: a timber frame with plaster and paper screens, the deep thatched irimoya roof, the engawa
      var Wd = 11, Dd = 7.5, Hh = 2.6, wood = 0x3a2a1e, i;
      box(G, 0, -P, 0, Wd + 0.3, P + 0.45, Dd + 0.3, 0x6e6458); box(G, 0, 0.45, 0, Wd, Hh - 0.45, Dd, 0xebe3d1);
      box(G, 0, 0.45, 0, Wd + 0.05, 0.85, Dd + 0.05, 0x4a3426, { noTop: true }); box(G, 0, Hh - 0.25, 0, Wd + 0.06, 0.22, Dd + 0.06, wood, { noTop: true });
      for (i = 0; i <= 6; i++) { var x = -Wd / 2 + i * Wd / 6; box(G, x, 0.45, Dd / 2 + 0.02, 0.16, Hh - 0.45, 0.06, wood); box(G, x, 0.45, -Dd / 2 - 0.02, 0.16, Hh - 0.45, 0.06, wood); }
      for (i = 0; i < 4; i++) winZ(G, -3.6 + i * 2.4, 0.9, Dd / 2 + 0.01, 1.6, 1.35, 1, SHOJI);
      winX(G, Wd / 2 + 0.01, 1.35, 0, 1.2, 0.8, 1); winX(G, -Wd / 2 - 0.01, 1.35, 0, 1.2, 0.8, -1);
      box(G, 0, -P, Dd / 2 + 0.8, Wd, P + 0.48, 1.3, 0x7a5a3c);
      var L = Wd * 0.42, R = hip(G, 0, Hh, 0, Wd, Dd, 3.7, L, 1.1, 0x9b8350, { th: 0.55 }), g = 0.75, run = R.A - L / 2, drop = (R.yr - R.ye) * g / run;
      [1, -1].forEach(function (s) { face(G, [[s * (L / 2 + g), R.yr, 0], [s * (L / 2 + g), R.yr - drop, 0.9], [s * (L / 2 + g), R.yr - drop, -0.9]], wood, [0, R.yr - 2, 0]); });
      box(G, 0, R.yr - 0.12, 0, L + 2 * g + 0.4, 0.34, 0.55, 0x4a4036);
    },
    siheyuan: function (G, v, P) {   // a siheyuan of north China: four halls round a courtyard, grey brick and grey tile, the gate at the south-east corner
      var Bk = 0x8f8d88, TL = 0x54585c, RED = 0xa3352b, LAT = 0x8a3428, x;
      box(G, 0, -P, 0, 24.4, P + 0.12, 24.4, 0x9a978f);
      box(G, 0, 0.12, -12, 24, 2.6, 0.5, Bk); box(G, 12, 0.12, 0, 0.5, 2.6, 24, Bk); box(G, -12, 0.12, 0, 0.5, 2.6, 24, Bk); box(G, -1.6, 0.12, 12, 20.8, 2.6, 0.5, Bk); box(G, 11.2, 0.12, 12, 1.6, 2.6, 0.5, Bk);
      box(G, 0, 0.12, -8.5, 15, 3.3, 6, Bk); for (x = -6.5; x <= 6.5; x += 2.6) box(G, x, 0.12, -5.35, 0.3, 3.3, 0.3, RED);
      for (x = -5.2; x <= 5.2; x += 2.6) winZ(G, x, 0.9, -5.5, 1.6, 1.8, 1, LAT); winZ(G, 0, 0.12, -5.47, 1.3, 2.6, 1, RED);
      gable(G, 0, 3.42, -8.5, 15, 6, 2.0, 0.7, TL, Bk, { th: 0.2, ridge: 0x3e4246 });
      [1, -1].forEach(function (s) { box(G, s * 8.6, 0.12, 0.6, 5, 3.0, 9, Bk); winX(G, s * 6.1 - s * 0.02, 0.9, 0.6, 1.6, 1.6, -s, LAT); winX(G, s * 6.1 - s * 0.02, 0.9, -2.4, 1.6, 1.6, -s, LAT); winX(G, s * 6.1 - s * 0.02, 0.12, 3.4, 1.1, 2.3, -s, RED);
        sub(G, s * 8.6, 0, 0.6, Math.PI / 2, function () { gable(G, 0, 3.12, 0, 9, 5, 1.6, 0.6, TL, Bk, { th: 0.2, ridge: 0x3e4246 }); }); });
      box(G, -1.6, 0.12, 9.6, 15, 2.8, 4.2, Bk); for (x = -6.4; x <= 3.2; x += 3.2) winZ(G, x, 0.9, 7.5, 1.6, 1.4, -1, LAT);
      gable(G, -1.6, 2.92, 9.6, 15, 4.2, 1.4, 0.5, TL, Bk, { th: 0.2, ridge: 0x3e4246 });
      box(G, 9.6, 0.12, 10.6, 2.8, 3.3, 3.0, Bk); winZ(G, 9.6, 0.12, 12.1, 1.5, 2.5, 1, RED); gable(G, 9.6, 3.42, 10.6, 3.2, 3.0, 1.1, 0.5, TL, Bk, { th: 0.18 });
      cyl(G, -2.5, 1.5, 0.12, 2.2, 0.18, 0.14, 6, 0x5a4632); dome(G, -2.5, 1.9, 1.5, 1.7, 3, 8, 0x587a38, { h: 1.6 });
    },
    tulou: function (G, v, P) {   // a Hakka tulou of Fujian: a great ring of rammed earth, storeys of wooden galleries round the courtyard, a tiled ring roof
      var R1 = 21, R0 = 12.5, Hh = 11, n = 28, EW = 0xc9a274, TL = 0x4d4d4b, k;
      cyl(G, 0, 0, -P, 0.3, R1 + 0.45, R1 + 0.45, n, 0x8a8478); cyl(G, 0, 0, -P, 0.15, R0, R0, n, 0x8e8a80, { mode: 'in', cap: true });
      cyl(G, 0, 0, 0.3, Hh, R1, R1, n, EW); cyl(G, 0, 0, 0.3, 1.5, R1 + 0.06, R1 + 0.06, n, 0x8f897d);
      for (k = 0; k < n; k++) { var a = (k + 0.5) / n * TAU; if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.25) continue; var c = Math.cos(a) * (R1 * Math.cos(Math.PI / n) + 0.02), s = Math.sin(a) * (R1 * Math.cos(Math.PI / n) + 0.02);
        sub(G, c, 0, s, yawTo(Math.cos(a), Math.sin(a)), function () { box(G, 0, 6.6, 0, 0.5, 0.7, 0.08, WIN); box(G, 0, 8.9, 0, 0.5, 0.7, 0.08, WIN); }); }
      cyl(G, 0, 0, 0.15, 2.8, R0, R0, n, 0x3e2e22, { mode: 'in' }); cyl(G, 0, 0, 2.8, 5.6, R0 - 0.3, R0 - 0.3, n, 0x7a5636, { mode: 'in' });
      cyl(G, 0, 0, 5.6, 8.4, R0 - 0.3, R0 - 0.3, n, 0x6e4e30, { mode: 'in' }); cyl(G, 0, 0, 8.4, Hh, R0 - 0.3, R0 - 0.3, n, 0x7a5636, { mode: 'in' });
      [2.8, 5.6, 8.4].forEach(function (y) { cyl(G, 0, 0, y - 0.05, y + 0.95, R0 - 0.55, R0 - 0.55, n, 0x8a6a46, { mode: 'in' }); });
      cyl(G, 0, 0, Hh - 0.3, Hh + 2.1, R1 + 1.6, (R1 + R0) / 2, n, TL, { mode: 'up', two: true }); cyl(G, 0, 0, Hh - 0.3, Hh + 2.1, R0 - 1.4, (R1 + R0) / 2, n, TL, { mode: 'up', two: true });
      cyl(G, 0, 0, Hh - 0.5, Hh - 0.3, R1 + 1.6, R1 + 1.6, n, dk(TL, 0.8));
      box(G, 0, 0.3, R1 - 0.1, 2.8, 3.6, 0.5, 0x9a948a); winZ(G, 0, 0.3, R1 + 0.16, 2.0, 3.0, 1, DOOR);
      box(G, 0, 0.15, -3, 6, 3.2, 4.5, 0xd8cbb2); hip(G, 0, 3.35, -3, 6, 4.5, 1.4, 2, 0.5, TL, { th: 0.15 }); winZ(G, 0, 0.15, -0.72, 1.4, 2.2, 1, 0xa3352b);
    },
    stilt: function (G, v, P) {   // a stilt house: South-East Asia (thatch, or teak under a dark roof) and south-west China (dark wood under grey tile)
      var wall = [0xa8875a, 0x7a5636, 0x6a4a30][v], roof = [0x9e8656, 0x6a4e3a, 0x4b4d4c][v], post = 0x5a4430, x, z;
      for (x = -3; x <= 3; x += 2) for (z = -2.4; z <= 3.2; z += 2.8) box(G, x, -P, z, 0.24, P + 2.2, 0.24, post);
      box(G, 0, 2.08, 0.45, 7.4, 0.22, 6.2, 0x6b5238);
      box(G, 0, 2.3, -0.6, 6.4, 2.3, 4.2, wall); winZ(G, 0.9, 2.3, 1.5, 0.9, 1.8, 1, DOOR); winZ(G, -1.8, 3.1, 1.5, 0.9, 0.7, 1); winX(G, 3.2, 3.1, -0.6, 0.9, 0.7, 1); winX(G, -3.2, 3.1, -0.6, 0.9, 0.7, -1);
      box(G, 0, 2.3, 3.45, 7.4, 0.7, 0.08, 0x7a5a3a); box(G, 3.65, 2.3, 2.5, 0.08, 0.7, 1.9, 0x7a5a3a);
      if (v === 2) gable(G, 0, 4.6, -0.6, 6.4, 4.2, 1.7, 0.85, roof, wall, { th: 0.18, ridge: 0x3e3f40, ovx: 0.7 });
      else gable(G, 0, 4.6, -0.6, 6.4, 4.2, v ? 3.0 : 2.6, 0.95, roof, wall, { th: v ? 0.18 : 0.35, ridge: v ? 0x4a3828 : 0x7a6640 });
      ladder(G, [-2.6, 0, 4.9], [-2.6, 2.3, 3.4], 0x6a5038);
    },
    mudthatch: function (G, v, P) {   // a rural house of mud and thatch (India; the Congo basin; Madagascar): a red-brown dado, a raised verandah
      var up = [0xd8b98a, 0xe9e1d0, 0x9a7652][v], base = [0x9a5a3a, 0x9a5a3a, 0x7e5a3c][v], roof = [0xa88c58, 0xa38a58, 0x8f7c56][v];
      box(G, 0, -P, 0.55, 6.8, P + 0.45, 6.4, 0x8c6c4c); box(G, 0, 0.45, 0, 6, 2.0, 4.6, up); box(G, 0, 0.45, 0, 6.04, 0.7, 4.64, base, { noTop: true });
      winZ(G, 0.7, 0.45, 2.3, 0.9, 1.6, 1, 0x4a3222); winZ(G, -1.6, 1.3, 2.3, 0.6, 0.5, 1); winX(G, 3.0, 1.3, 0, 0.6, 0.5, 1);
      hip(G, 0, 2.45, 0, 6, 4.6, 1.9, 2.2, 0.85, roof, { th: 0.35 }); rod(G, [-2.6, 0.45, 2.95], [-2.6, 2.25, 2.95], 0.08, 0x6a5038); rod(G, [2.6, 0.45, 2.95], [2.6, 2.25, 2.95], 0.08, 0x6a5038);
    },
    board: function (G, v, P) {   // a Caribbean board house on blocks: painted boards, white trim, louvres, a zinc roof and the verandah
      var wall = [0x7fcbc1, 0xf0cf6c, 0xe7a19c, 0xa3cf8c][v], zinc = v % 2 ? 0x9d6e52 : 0xa9b1b5, trim = 0xf4f3ee, x, z;
      for (x = -2.8; x <= 2.8; x += 2.8) for (z = -2.4; z <= 3.4; z += 2.9) box(G, x, -P, z, 0.4, P + 0.6, 0.4, 0x9a9a96);
      box(G, 0, 0.6, -0.4, 6, 0.15, 4.6, 0x7a6a5a); box(G, 0, 0.75, -0.4, 6, 2.5, 4.6, wall);
      [[3, 1.9], [-3, 1.9], [3, -2.7], [-3, -2.7]].forEach(function (q) { box(G, q[0], 0.75, q[1], 0.14, 2.5, 0.14, trim); });
      winZ(G, 0, 0.75, 1.9, 0.95, 2.0, 1, 0x6a4a32); winZ(G, -1.8, 1.4, 1.9, 0.9, 1.0, 1, 0x3f5a50); winZ(G, 1.8, 1.4, 1.9, 0.9, 1.0, 1, 0x3f5a50); winX(G, 3.0, 1.4, -0.4, 1.0, 1.0, 1, 0x3f5a50); winX(G, -3.0, 1.4, -0.4, 1.0, 1.0, -1, 0x3f5a50);
      box(G, 0, 0.6, 2.75, 6, 0.15, 1.7, 0x8a7a68); [-2.9, 0, 2.9].forEach(function (px) { rod(G, [px, 0.75, 3.5], [px, 2.85, 3.5], 0.07, trim); }); box(G, -1.8, 0.75, 3.55, 2.2, 0.8, 0.06, trim); box(G, 1.8, 0.75, 3.55, 2.2, 0.8, 0.06, trim);
      hip(G, 0, 3.25, -0.4, 6, 4.6, 1.4, 1.6, 0.35, zinc, { th: 0.06 }); face(G, [[-3.15, 3.18, 1.95], [3.15, 3.18, 1.95], [3.15, 2.82, 3.75], [-3.15, 2.82, 3.75]], zinc, 'up', true);
      box(G, 0, -P, 4.0, 1.2, P + 0.32, 0.7, 0x9a9a96);
    },
    fale: function (G, v, P) {   // a Samoan fale: an oval stone platform, a ring of posts, the rounded thatched roof; open-sided to the breeze
      var th = 0x9c8452, i;
      cyl(G, 0, 0, -P, 0.55, 1, 1, 14, 0x7c7a74, { sx: 4.8, sz: 3.6, cap: true, capCol: 0x8a877e });
      for (i = 0; i < 12; i++) { var a = i / 12 * TAU; rod(G, [Math.cos(a) * 4.1, 0.55, Math.sin(a) * 2.95], [Math.cos(a) * 4.1, 2.15, Math.sin(a) * 2.95], 0.11, 0x6b4e32); }
      rod(G, [0, 0.55, -0.8], [0, 4.7, -0.8], 0.14, 0x6b4e32); rod(G, [0, 0.55, 0.8], [0, 4.7, 0.8], 0.14, 0x6b4e32);
      cyl(G, 0, 0, 1.92, 2.12, 1, 1, 14, dk(th, 0.78), { sx: 5.0, sz: 3.8 });
      cyl(G, 0, 0, 2.12, 3.35, 1, 0.78, 14, th, { sx: 5.0, sz: 3.8, mode: 'up', two: true }); cyl(G, 0, 0, 3.35, 4.35, 0.78, 0.46, 14, th, { sx: 5.0, sz: 3.8, mode: 'up', two: true });
      cyl(G, 0, 0, 4.35, 4.95, 0.46, 0.1, 14, th, { sx: 5.0, sz: 3.8, mode: 'up', two: true }); box(G, 0, 0.55, 0, 3.2, 0.03, 2.2, 0xc9b27e);
    },
    polyhut: function (G, v, P) {   // a thatched house of Polynesia (fare, hale): plaited walls, a tall steep thatch
      box(G, 0, -P, 0, 6.6, P + 0.28, 4.6, 0x7a7266); box(G, 0, 0.28, 0, 6, 1.75, 4, 0xc8b083); winZ(G, 0, 0.28, 2.0, 1.0, 1.55, 1, DOOR); winX(G, 3.0, 0.9, 0, 0.9, 0.6, 1);
      gable(G, 0, 2.03, 0, 6, 4, 3.0, 0.8, 0x8e7848, 0xc8b083, { th: 0.42, ridge: 0x6e5c38 });
    },
    tilehouse: function (G, v, P) {   // adobe (or whitewash, or stone) under a clay-tile roof: the Andes' valleys, Mexico and Central America, the Mediterranean
      var wall = [0xb98a62, 0xece6da, 0xa49c8e][v], trim = [0x6a4a32, 0x2f5d8f, 0x4f6a3a][v];
      box(G, 0, -P, 0, 7.2, P + 0.2, 5.2, [0x8a6a4c, 0x9a8a7a, 0x8a8478][v]); box(G, 0, 0.2, 0, 7, 2.6, 5, wall);
      winZ(G, -1.2, 0.2, 2.5, 0.95, 1.9, 1, trim); winZ(G, 1.6, 1.1, 2.5, 0.75, 0.8, 1); box(G, 1.03, 1.1, 2.55, 0.3, 0.8, 0.06, trim); box(G, 2.17, 1.1, 2.55, 0.3, 0.8, 0.06, trim); winX(G, 3.5, 1.1, 0, 0.7, 0.7, 1);
      gable(G, 0, 2.8, 0, 7, 5, 1.3, 0.45, 0xae5038, wall, { th: 0.18, ridge: 0x8e3e2c }); box(G, 4.7, -P, 2.3, 2.4, P + 1.5, 0.35, wall);
    },
    stonehouse: function (G, v, P) {   // a stone house of the high Andes under ichu thatch, its stone corral beside it
      var stone = 0x7c7368, i;
      box(G, 0, -P, 0, 6, P + 2.1, 4.4, stone); winZ(G, 0.6, 0, 2.2, 0.8, 1.5, 1, 0x2c2218); winX(G, 3.0, 1.2, 0, 0.4, 0.35, 1);
      gable(G, 0, 2.1, 0, 6, 4.4, 2.3, 0.5, 0xc2a866, stone, { th: 0.4, ridge: 0x9c8648 });
      for (i = 0; i < 16; i++) { if (i === 8) continue; var a = i / 16 * TAU, b = (i + 1) / 16 * TAU, cx = 7 + 3.0 * (Math.cos(a) + Math.cos(b)) / 2, cz = 3.0 * (Math.sin(a) + Math.sin(b)) / 2;
        sub(G, cx, 0, cz, yawTo(-Math.cos((a + b) / 2), -Math.sin((a + b) / 2)), function () { box(G, 0, -P, 0, 1.25, P + 1.0, 0.5, i % 2 ? 0x8a8174 : 0x7e766a); }); }
    },
    maloca: function (G, v, P) {   // an Amazonian maloca: one great house of palm thatch reaching almost to the ground, its bark front and door
      var Wd = 14, Ln = 22, th = 0x8d7745;
      box(G, 0, -P, 0, Wd + 0.6, P + 0.1, Ln + 0.6, 0x6a563e); box(G, 0, 0.1, 0, Wd, 1.0, Ln, 0x7a5c3c);
      sub(G, 0, 0, 0, Math.PI / 2, function () { gable(G, 0, 1.1, 0, Ln, Wd, 8.5, 0.7, th, null, { th: 0.45, ovx: 0.3, ridge: 0x6e5c36 }); });
      face(G, [[-Wd / 2, 1.1, Ln / 2 + 0.02], [Wd / 2, 1.1, Ln / 2 + 0.02], [0, 9.6, Ln / 2 + 0.02]], 0x9a7a52, [0, 2, 0]); face(G, [[-Wd / 2, 1.1, -Ln / 2 - 0.02], [Wd / 2, 1.1, -Ln / 2 - 0.02], [0, 9.6, -Ln / 2 - 0.02]], dk(th, 0.9), [0, 2, 0]);
      winZ(G, 0, 0.1, Ln / 2 + 0.03, 2.2, 2.6, 1, 0x2c2218);
    },
    logcabin: function (G, v, P) {   // a log cabin: notched logs on a stone footing, a shingle roof, a stone chimney
      var Wd = 7, Dd = 5.5, Hh = 2.6, n = 8, i;
      box(G, 0, -P, 0, Wd + 0.3, P + 0.3, Dd + 0.3, 0x7f7a72);
      for (i = 0; i < n; i++) { var y = 0.3 + i * Hh / n, c = i % 2 ? 0x7b5536 : 0x8a6240; box(G, 0, y, 0, Wd, Hh / n, Dd, c, { noTop: i < n - 1 });
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q) { box(G, q[0] * (Wd / 2 + 0.14), y + 0.02, q[1] * (Dd / 2 + 0.14), 0.32, Hh / n - 0.04, 0.32, 0xa07a50); }); }
      winZ(G, 0, 0.3, Dd / 2, 0.95, 1.9, 1, 0x5a3a24); winZ(G, -2.1, 1.2, Dd / 2, 0.9, 0.8, 1); winZ(G, 2.1, 1.2, Dd / 2, 0.9, 0.8, 1); winX(G, -Wd / 2, 1.2, 0, 0.9, 0.8, -1);
      gable(G, 0, 0.3 + Hh, 0, Wd, Dd, 2.0, 0.55, 0x4b3d33, 0x8a6240, { th: 0.18, ridge: 0x3a2f28 }); box(G, Wd / 2 + 0.5, -P, 0, 0.9, P + Hh + 2.9, 0.9, 0x8a8780);
    },
    pueblo: function (G, v, P) {   // an adobe pueblo of the South-West: rooms stepped back in tiers, vigas, ladders to the roofs, an horno
      var A = 0xc58f62, A2 = 0xb8825a, VG = 0x6b4a2f, x;
      box(G, 0, -P, 0, 16, P + 2.8, 6, A); box(G, 0, 2.8, -1.5, 10.5, 2.6, 3, A2); box(G, -1.5, 5.4, -2, 4.5, 2.4, 2, A);
      box(G, 0, 2.8, 2.95, 16, 0.3, 0.12, A); box(G, 0, 5.4, 0.0, 10.5, 0.3, 0.12, A2);
      for (x = -7.2; x <= 7.2; x += 1.6) box(G, x, 2.45, 3.15, 0.18, 0.18, 0.5, VG); for (x = -4.8; x <= 4.8; x += 1.6) box(G, x, 5.05, 0.15, 0.18, 0.18, 0.4, VG);
      [-5, 0.5, 5.5].forEach(function (x2) { winZ(G, x2, 0, 3.0, 0.85, 1.6, 1, 0x3a2a1e); }); [-2.5, 2.5].forEach(function (x2) { winZ(G, x2, 3.6, 0.0, 0.6, 0.6, 1); }); winZ(G, -1.5, 6.3, -1.0, 0.5, 0.5, 1);
      ladder(G, [-2.5, 0, 4.3], [-2.5, 3.9, 2.8], 0x7a5a3a); ladder(G, [3.5, 2.8, 1.2], [3.5, 6.4, 0.1], 0x7a5a3a);
      dome(G, 9.6, 0, 1.4, 1.0, 3, 10, 0xc89a72, { h: 1.1 }); winZ(G, 9.6, 0.1, 2.35, 0.4, 0.4, 1, 0x2a2018); box(G, 9.6, -P, 1.4, 2.2, P, 2.2, 0xa87a52, { noTop: true });
    },
    thatch: function (G, v, P) {   // a thatched cottage (the British Isles, the Low Countries, Denmark): whitewash, deep thatch, chimneys at the gables
      var wall = 0xefe9da, door = [0x2d5a3a, 0x8a2a2a][v];
      box(G, 0, -P, 0, 9, P + 2.5, 5, wall); winZ(G, -0.4, 0, 2.5, 0.95, 1.9, 1, door); [-3.0, -1.7, 1.3, 3.0].forEach(function (x) { winZ(G, x, 1.0, 2.5, 0.7, 0.8, 1); }); winZ(G, 2.0, 1.0, -2.5, 0.7, 0.8, -1);
      gable(G, 0, 2.5, 0, 9, 5, 3.1, 0.45, 0xa68a55, wall, { th: 0.45, ridge: 0x8a7044, ovx: 0.35 });
      box(G, 4.1, 2.5, 0, 0.8, 3.7, 0.95, v ? wall : 0x8a5a46); box(G, -4.1, 2.5, 0, 0.8, 3.7, 0.95, v ? wall : 0x8a5a46);
    },
    halftimber: function (G, v, P) {   // a half-timbered house (central and northern Europe): a jettied upper storey, dark beams and braces, a steep roof
      var wall = 0xeee6d2, beam = 0x3a2a1e, x;
      box(G, 0, -P, 0, 8, P + 2.6, 6, wall); box(G, 0, 2.6, 0, 8.5, 2.4, 6.4, wall);
      box(G, 0, 2.5, 0, 8.6, 0.2, 6.5, beam, { noTop: true }); box(G, 0, 4.92, 0, 8.6, 0.16, 6.5, beam, { noTop: true });
      for (x = -4; x <= 4.01; x += 1.33) { box(G, x, 0, 3.02, 0.16, 2.6, 0.06, beam); box(G, x * 1.06, 2.6, 3.22, 0.16, 2.4, 0.06, beam); box(G, x, 0, -3.02, 0.16, 2.6, 0.06, beam); }
      [-3.6, 1.2].forEach(function (x0) { rod(G, [x0, 2.7, 3.26], [x0 + 1.3, 4.9, 3.26], 0.07, beam); rod(G, [x0 + 2.6, 2.7, 3.26], [x0 + 1.3, 4.9, 3.26], 0.07, beam); });
      winZ(G, -0.66, 0, 3.0, 0.95, 2.0, 1, 0x5a3a24); winZ(G, 2.0, 1.0, 3.0, 0.8, 0.9, 1); winZ(G, -2.6, 1.0, 3.0, 0.8, 0.9, 1); winZ(G, -0.66, 3.3, 3.2, 0.8, 0.9, 1); winZ(G, 2.0, 3.3, 3.2, 0.8, 0.9, 1);
      gable(G, 0, 5.0, 0, 8.5, 6.4, 4.2, 0.4, [0xa34a33, 0x9a8250][v], wall, { th: v ? 0.4 : 0.2, ridge: v ? 0x7a6640 : 0x7a3626 });
    },
    chalet: function (G, v, P) {   // an Alpine chalet: a stone ground floor, a timber storey, a balcony with its flower boxes, the wide low roof
      var wood = 0x8a5a32, shut = 0x3a6a3a;
      box(G, 0, -P, 0, 9, P + 2.4, 8, 0x9a958c); box(G, 0, 2.4, 0, 9, 2.6, 8, wood);
      winZ(G, 0, 0, 4.0, 1.0, 2.0, 1, 0x5a3a24); winZ(G, -2.8, 0.9, 4.0, 0.8, 0.9, 1); winZ(G, 2.8, 0.9, 4.0, 0.8, 0.9, 1);
      [-2.6, 0, 2.6].forEach(function (x) { winZ(G, x, 3.2, 4.0, 0.9, 1.1, 1); box(G, x - 0.66, 3.2, 4.05, 0.38, 1.1, 0.06, shut); box(G, x + 0.66, 3.2, 4.05, 0.38, 1.1, 0.06, shut); });
      box(G, 0, 2.6, 4.7, 9.4, 0.14, 1.4, 0x7a4e2c); box(G, 0, 2.74, 5.36, 9.4, 0.9, 0.1, 0x9a6a3e); box(G, 0, 3.45, 5.47, 8.6, 0.26, 0.26, 0x6a4a2a, { top: 0xc8323a });
      [-4.5, 4.5].forEach(function (x) { rod(G, [x, 2.6, 5.3], [x, 5.0, 5.3], 0.1, 0x6a4422); });
      sub(G, 0, 0, 0, Math.PI / 2, function () { gable(G, 0, 5.0, 0, 8, 9, 2.3, 1.4, 0x5a4b3e, wood, { th: 0.25, ovx: 1.5 }); });
    },
    homestead: function (G, v, P) {   // an Australian outback homestead: weatherboard on stumps, a corrugated-iron roof, a verandah all round, a tank, a windmill
      var roof = [0xb3b8ba, 0x9a3a2e][v], post = 0xe8e4da, i;
      box(G, 0, -P, 0, 17.4, P + 0.6, 15.4, 0x8a7f6c); box(G, 0, 0.6, 0, 12, 2.8, 10, 0xe9e1c9);
      winZ(G, 0, 0.6, 5.0, 1.0, 2.1, 1, 0x4a5a3a); [-4, -2, 2, 4].forEach(function (x) { winZ(G, x, 1.3, 5.0, 1.0, 1.2, 1); winZ(G, x, 1.3, -5.0, 1.0, 1.2, -1); }); winX(G, 6, 1.3, 0, 1.0, 1.2, 1); winX(G, -6, 1.3, 0, 1.0, 1.2, -1);
      hip(G, 0, 3.4, 0, 12, 10, 2.1, 2.0, 0.08, roof, { th: 0.05 });
      var I = [[-6, -5], [6, -5], [6, 5], [-6, 5]], O = [[-8.6, -7.6], [8.6, -7.6], [8.6, 7.6], [-8.6, 7.6]];
      for (i = 0; i < 4; i++) { var j = (i + 1) % 4; face(G, [[I[i][0], 3.36, I[i][1]], [I[j][0], 3.36, I[j][1]], [O[j][0], 2.8, O[j][1]], [O[i][0], 2.8, O[i][1]]], roof, 'up', true); }
      [[-8.4, -7.4], [0, -7.4], [8.4, -7.4], [-8.4, 7.4], [0, 7.4], [8.4, 7.4], [-8.4, 0], [8.4, 0]].forEach(function (q) { rod(G, [q[0], 0.6, q[1]], [q[0], 2.82, q[1]], 0.07, post); });
      box(G, 11.2, -P, -4.5, 2.4, P + 1.6, 2.4, 0x6a5a48); cyl(G, 11.2, -4.5, 1.6, 4.0, 1.35, 1.35, 12, 0xa9afb1); cyl(G, 11.2, -4.5, 4.0, 4.45, 1.35, 0.15, 12, 0x9aa0a2, { mode: 'up' });
      var wx = -11.5, wz = -5.5; [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q) { rod(G, [wx + q[0] * 1.1, -P, wz + q[1] * 1.1], [wx + q[0] * 0.18, 9.0, wz + q[1] * 0.18], 0.05, 0x8f9294); });
      box(G, wx, 9.0, wz, 0.5, 0.45, 0.6, 0x7a7c7e); for (i = 0; i < 12; i++) { var a = i / 12 * TAU; rod(G, [wx, 9.25, wz + 0.45], [wx + Math.cos(a) * 1.7, 9.25 + Math.sin(a) * 1.7, wz + 0.45], 0.06, 0xb0b2b4); }
      box(G, wx, 9.0, wz - 1.4, 0.06, 0.8, 1.6, 0xa0a2a4);
    }
  };

  /* ---------- 3. THE KINDS: footprint radius r, colour variants v, hamlet size n, layout, spacing, slope limit, livestock (DRAFT) ---------- */
  var TY = {
    rondavel: { name: 'Rondavel', r: 3.8, v: 3, n: [3, 6], lay: 'ring', gap: 9, stock: 'goat' },
    kraal: { name: 'Kraal', r: 5.4, v: 1 },
    enkang: { name: 'Maasai enkang', r: 22.5, v: 1, n: [1, 1], lay: 'one', lim: 1.6, stock: 'goat' },
    compound: { name: 'West African compound', r: 13.1, v: 1, n: [1, 3], lay: 'cluster', gap: 27, lim: 1.2, stock: 'goat' },
    flatadobe: { name: 'Flat-roofed adobe house', r: 5.2, v: 3, n: [3, 8], lay: 'cluster', gap: 11, stock: 'goat' },
    tent: { name: 'Black tent', r: 6.7, v: 2, n: [1, 4], lay: 'cluster', gap: 16, stock: 'camel' },
    ger: { name: 'Ger', r: 3.6, v: 2, n: [1, 4], lay: 'row', gap: 12, face: 'south', stock: 'goat' },
    igloo: { name: 'Igloo', r: 3.1, v: 1, n: [2, 5], lay: 'cluster', gap: 8 },
    qarmaq: { name: 'Sod house (qarmaq)', r: 4.1, v: 2, n: [2, 4], lay: 'cluster', gap: 10 },
    turf: { name: 'Turf house', r: 6.6, v: 1, n: [1, 2], lay: 'cluster', gap: 30 },
    lavvu: { name: 'Lavvu', r: 2.7, v: 1, n: [1, 4], lay: 'cluster', gap: 9 },
    minka: { name: 'Minka', r: 8.3, v: 1, n: [2, 5], lay: 'cluster', gap: 22 },
    siheyuan: { name: 'Siheyuan', r: 17.3, v: 1, n: [1, 3], lay: 'grid', gap: 27, face: 'south', lim: 1.2 },
    tulou: { name: 'Tulou', r: 22.7, v: 1, n: [1, 2], lay: 'cluster', gap: 70, lim: 1.8 },
    stilt: { name: 'Stilt house', r: 5.8, v: 3, n: [3, 7], lay: 'cluster', gap: 13 },
    mudthatch: { name: 'Mud-and-thatch house', r: 5.1, v: 3, n: [4, 9], lay: 'cluster', gap: 10, stock: 'goat' },
    board: { name: 'Board house', r: 5, v: 4, n: [3, 7], lay: 'road', gap: 20, stock: 'goat' },
    fale: { name: 'Fale', r: 5.2, v: 1, n: [3, 6], lay: 'ring', gap: 12 },
    polyhut: { name: 'Thatched fare', r: 4.8, v: 1, n: [3, 6], lay: 'cluster', gap: 12 },
    tilehouse: { name: 'Tile-roofed house', r: 6.5, v: 3, n: [3, 7], lay: 'cluster', gap: 12, stock: 'goat' },
    stonehouse: { name: 'Stone house', r: 10.3, v: 1, n: [1, 3], lay: 'cluster', gap: 26 },
    maloca: { name: 'Maloca', r: 13.7, v: 1, n: [1, 1], lay: 'one' },
    logcabin: { name: 'Log cabin', r: 5.4, v: 1, n: [1, 3], lay: 'spread', gap: 60 },
    pueblo: { name: 'Pueblo', r: 12.6, v: 1, n: [1, 2], lay: 'cluster', gap: 34 },
    thatch: { name: 'Thatched cottage', r: 5.8, v: 2, n: [3, 6], lay: 'road', gap: 18 },
    halftimber: { name: 'Half-timbered house', r: 6.2, v: 2, n: [3, 6], lay: 'road', gap: 16 },
    chalet: { name: 'Chalet', r: 8.1, v: 1, n: [2, 5], lay: 'spread', gap: 40 },
    homestead: { name: 'Outback homestead', r: 14.4, v: 2, n: [1, 1], lay: 'one' }
  };
  function limOf(t) { var d = TY[t]; return d.lim != null ? d.lim : clamp(d.r * 0.12, 0.7, 1.2); }
  function depthOf(t) { return limOf(t) + 0.7; }   // the footing reaches below the lowest ground under the footprint
  function build(t, v) { var G = G0(); B[t](G, v | 0, depthOf(t)); return { pos: new Float32Array(G.p), nrm: new Float32Array(G.n), col: new Float32Array(G.c), count: G.p.length / 3 }; }

  /* ---------- 4. THE REGIONS: which dwellings the people of each place build (rough boxes, DRAFT for Izumi's atlas check) ---------- */
  function winter() { if (C.SEASON) return C.SEASON === 'winter'; var m = new Date().getMonth(); return m >= 10 || m <= 3; }   // the real calendar (the game's own seasons are 'summer' only): igloos stand November to April
  function mexBorder(lon) { return lon < -106.5 ? 31.33 + (lon < -111 ? (lon + 111) * -0.19 : 0) : lon < -97.2 ? 31.8 - 0.634 * (lon + 106.5) : 25.9; }
  function regionOf(lat, lon, el) {   // { id, types: [[type, weight, variants?]], dens } | null; el the ground's height (m)
    el = el || 0;
    if (lat < -56 || lat > 78) return null;
    if (inB(lat, lon, [-14.6, -13.2, -172.9, -168.0])) return R('samoa');
    if ((lon >= 160 || lon <= -130) && lat > -30 && lat < 23 && !inB(lat, lon, [-47, -34, 165, 179])) return R('polynesia');
    if (inB(lat, lon, [11.8, 24.3, -85, -59]) || inB(lat, lon, [20.9, 27.3, -79.3, -72.5]) || inB(lat, lon, [10, 11.4, -62, -60.4])) return R('caribbean');
    if (lon < -30) {
      if (lat > 66.5 || (lat > 59.5 && lon > -100 && lon < -60) || (lat > 58.5 && lon > -80 && lon < -64) || (lat > 58 && lon < -158) || (lat > 59.5 && lon > -75)) return el < 400 ? R('arctic') : null;
      if (inB(lat, lon, [31, 38, -114, -103])) return R('pueblo');
      if (lat < mexBorder(lon) && lat >= 7 && lon < -77.2 && !(lat < 13 && lon > -79)) return R('mesoamerica');
      if (lat < 13 && lon > -82 && lon < -34) {
        if (lon < -63 && lat > -40 && lat < 8.5 && el > 2000) return R(el > 3500 ? 'altiplano' : 'andes');
        if (lat > -15 && lat < 5.5 && lon > -78 && lon < -48 && el < 600) return R('amazon');
        return R('samerica'); }
      if (lat >= 14 && lat < 72) return R('nwoods');
      return null; }
    if (inB(lat, lon, [63.2, 66.7, -24.6, -13.3])) return R('iceland');
    if (lat > 59.5 && lon > -45 && lon < -10) return el < 400 ? R('arctic') : null;
    if (inB(lat, lon, [67, 71.3, 14, 33.5]) || inB(lat, lon, [66.5, 69.5, 33.5, 41])) return R('sapmi');
    if (lat > 66.5 && lon >= 41) return R('chum');
    if (inB(lat, lon, [45.6, 47.9, 5.9, 16.2]) && el > 500) return R('alps');
    if (lat >= 29 && ((lat < 35.95 && lon >= -17 && lon < 2.5) || (lat < 37.6 && lon >= 2.5 && lon < 11.8))) return R('nafrica');   // the Maghreb's coast below Spain, Algeria and Tunisia (before Europe's box)
    if (inB(lat, lon, [36, 42.2, 31, 45]) || inB(lat, lon, [29.5, 37, 34, 44]) && lat >= 32) return R('persia');   // Anatolia's interior and the Levant: flat-roofed earth and stone
    if (lat >= 35 && lat < 71.5 && lon >= -11 && lon < 40 && !(lat < 37.5 && lon > 26)) {
      if (lat < 44.3 && lon < 26.5 || (lat < 46 && lon > 12 && lon < 20) || (lat < 42.2 && lon >= 26.5 && lon < 31)) return R('med');
      if (lat > 46 && (lon < 8.5 || (lon < 12.7 && lat > 54.4)) && lat < 61) return R('westeur');
      if (lon >= 6 && lon < 24 && lat >= 46 && lat < 55.5) return R('centeur');
      return R('eastwoods'); }
    if (inB(lat, lon, [-26, -11.5, 43, 51])) return R('madagascar');
    if (lat >= 29 && lat < 37.6 && lon >= -17 && lon < 12) return R('nafrica');
    if (inB(lat, lon, [22, 31.6, 29.5, 33.6]) || inB(lat, lon, [29, 33.2, 12, 29.5])) return R('nafrica');   // the Nile, and the Libyan and Egyptian coast
    if (lat > 12.4 && lat < 32 && lon > 42.6 && lon < 60) return R('arabia');   // Yemen and Oman before Africa's boxes (the Gulf of Aden between)
    if (lat >= 16 && lat < 29 && lon >= -17.5 && lon < 35) return R('sahara');
    if (lat >= 4 && lat < 16 && lon >= -18 && lon < 15) return R('wafrica');
    if (inB(lat, lon, [3.5, 15, 33, 48])) return R('ethiopia');
    if (inB(lat, lon, [-6.5, 1.5, 34, 38.5])) return R('maasai');
    if (inB(lat, lon, [-6, 4, 8.5, 30])) return R('congo');
    if (lat < 16 && lat > -35 && lon >= -18 && lon < 52) return R('safrica');
    if (inB(lat, lon, [12, 32, 34.5, 60])) return R('arabia');
    if (inB(lat, lon, [-39.5, -10.5, 112.5, 154])) return R('outback');
    if (inB(lat, lon, [27.5, 37, 78, 103]) && el > 3600) return R('tibet');
    if (inB(lat, lon, [41.5, 52.2, 87.5, 120]) || inB(lat, lon, [42, 54, 50, 87.5]) || inB(lat, lon, [41.8, 46, 105, 122])) return R('steppe');
    if (inB(lat, lon, [24, 42, 44, 75])) return R('persia');
    if (inB(lat, lon, [30, 45.6, 129, 146.5]) && !inB(lat, lon, [33, 38.7, 124, 129.6])) return R('japan');
    if (inB(lat, lon, [23.5, 26.5, 115.8, 119])) return R('fujian');
    if (inB(lat, lon, [21, 30, 97, 111])) return R('swchina');
    if (inB(lat, lon, [34, 42.5, 105, 125])) return R('nchina');
    if (inB(lat, lon, [6, 30.5, 68, 92.6])) return R('india');
    if (lat > -11 && lat < 28.5 && lon >= 92 && lon < 141 && !(lat > 21 && lon > 108)) return R('seasia');
    if (lat > -12 && lat < 0 && lon >= 141 && lon < 160) return R('seasia');
    if (lat >= 45 && lat <= 66.5 && lon >= 40 && lon < 180) return R('eastwoods');
    return null;
  }
  var REG = {   // [type, weight, variant list (optional)]; dens: the chance a cell's hamlet try is taken
    samoa: { types: [['fale', 1]], dens: 0.6 }, polynesia: { types: [['polyhut', 1]], dens: 0.55 }, caribbean: { types: [['board', 1]], dens: 0.7 },
    arctic: { types: function () { return winter() ? [['igloo', 3], ['qarmaq', 1, [1]]] : [['qarmaq', 1, [0]]]; }, dens: 0.3 },
    pueblo: { types: [['pueblo', 1]], dens: 0.18 }, mesoamerica: { types: [['tilehouse', 1, [0, 1]]], dens: 0.6 },
    andes: { types: [['tilehouse', 3, [0, 1]], ['stonehouse', 1]], dens: 0.55 }, altiplano: { types: [['stonehouse', 1]], dens: 0.5 },
    amazon: { types: [['maloca', 1]], dens: 0.22 }, samerica: { types: [['tilehouse', 1, [0, 1]]], dens: 0.45 }, nwoods: { types: [['logcabin', 1]], dens: 0.5 },
    iceland: { types: [['turf', 1]], dens: 0.35 }, sapmi: { types: [['lavvu', 1]], dens: 0.4 }, chum: { types: [['lavvu', 1]], dens: 0.2 },
    alps: { types: [['chalet', 1]], dens: 0.65 }, med: { types: [['tilehouse', 1, [2]]], dens: 0.6 }, westeur: { types: [['thatch', 2], ['halftimber', 1]], dens: 0.6 },
    centeur: { types: [['halftimber', 1]], dens: 0.6 }, eastwoods: { types: [['logcabin', 1]], dens: 0.5 },
    nafrica: { types: [['flatadobe', 1]], dens: 0.5 }, sahara: { types: [['tent', 1, [0]]], dens: 0.18 }, wafrica: { types: [['compound', 1]], dens: 0.6 },
    ethiopia: { types: [['rondavel', 1]], dens: 0.6 }, maasai: { types: [['enkang', 2], ['rondavel', 1]], dens: 0.6 }, congo: { types: [['mudthatch', 1, [2]]], dens: 0.45 },
    safrica: { types: [['rondavel', 1]], dens: 0.6 }, madagascar: { types: [['mudthatch', 1, [2]]], dens: 0.5 }, arabia: { types: [['tent', 2, [0]], ['flatadobe', 1, [0, 1]]], dens: 0.22 },
    persia: { types: [['flatadobe', 1, [0, 1]]], dens: 0.5 }, tibet: { types: [['tent', 1, [1]]], dens: 0.3 }, steppe: { types: [['ger', 1]], dens: 0.45 },
    japan: { types: [['minka', 1]], dens: 0.6 }, fujian: { types: [['tulou', 1]], dens: 0.5 }, swchina: { types: [['stilt', 1, [2]]], dens: 0.6 }, nchina: { types: [['siheyuan', 1]], dens: 0.55 },
    india: { types: [['mudthatch', 1, [0, 1]]], dens: 0.7 }, seasia: { types: [['stilt', 1, [0, 1]]], dens: 0.6 }, outback: { types: [['homestead', 1]], dens: 0.22 }
  };
  function R(id) { var g = REG[id]; return { id: id, types: typeof g.types === 'function' ? g.types() : g.types, dens: g.dens }; }

  /* ---------- 5. THE FOLK at the doors (world-people.js); names and lines DRAFT for Marth's pen; none in the pueblos or the Amazon (his to decide) ---------- */
  var SKIN = [0x3b2219, 0x5a3624, 0x7d4e33, 0x9a6a48, 0xb5835e, 0xcf9f7a, 0xe2b996, 0xf0cfb2];   // world-people.js's own palette, by index
  var FOLK = {
    safrica: { skin: [0, 3], names: ['Thandiwe', 'Sipho', 'Nomsa', 'Lwazi', 'Zanele', 'Themba'], lines: ['Molo! The hills are green after the rain.', 'Sawubona, little bird. Rest on the thatch if you like.'] },
    maasai: { skin: [0, 2], names: ['Naserian', 'Lemayian', 'Nashipae', 'Saitoti', 'Nalangu', 'Kakuta'], lines: ['Supa! The cattle came home early today.', 'Sopa, little one. The kraal is quiet at noon.'] },
    ethiopia: { skin: [1, 3], names: ['Selam', 'Dawit', 'Hanna', 'Bekele', 'Meron', 'Tesfaye'], lines: ['Selam! The coffee is on the fire.', 'Selam, little bird. The tukul keeps cool all day.'] },
    wafrica: { skin: [0, 2], names: ['Abena', 'Kwame', 'Aminata', 'Ibrahim', 'Fatou', 'Moussa'], lines: ['Akwaaba! You found our compound.', 'I ni ce! The millet is nearly ready.'] },
    nafrica: { skin: [3, 6], names: ['Itto', 'Idir', 'Tafsut', 'Amastan', 'Yasmina', 'Youssef'], lines: ['Azul! The roof is the coolest place at dusk.', 'Marhaba, little traveller. There is shade by the wall.'] },
    sahara: { skin: [2, 5], names: ['Itto', 'Idir', 'Tafsut', 'Amastan', 'Yasmina', 'Youssef'], lines: ['Azul! The wind brings sand from the south.', 'Rest a while; there is shade by the tent.'] },
    arabia: { skin: [3, 5], names: ['Layla', 'Omar', 'Noor', 'Karim', 'Huda', 'Khalid'], lines: ['Marhaba! Stay for coffee.', 'Ahlan, little bird. The camels know you are here.'] },
    persia: { skin: [3, 6], names: ['Darya', 'Reza', 'Laleh', 'Kian', 'Shirin', 'Arash'], lines: ['Salaam! The well is cool today.', 'Salaam, little bird. The roof is warm in the sun.'] },
    tibet: { skin: [3, 5], names: ['Tenzin', 'Dolma', 'Norbu', 'Pema', 'Lhakpa', 'Yangchen'], lines: ['Tashi delek! The yaks know the way better than I do.'] },
    steppe: { skin: [4, 6], names: ['Altantsetseg', 'Bat-Erdene', 'Oyunaa', 'Temuulen', 'Saraa', 'Ganbold'], lines: ['Sain baina uu! Come in out of the wind.', 'Our ger faces south, to catch the sun.'] },
    japan: { skin: [5, 7], names: ['Haruto', 'Yui', 'Sora', 'Aoi', 'Ren', 'Hana'], lines: ['Konnichiwa! The rice is tall this year.', 'Mind the thatch, little bird. The whole village laid it together.'] },
    china: { skin: [5, 7], names: ['Wei', 'Mei', 'Jun', 'Lan', 'Hao', 'Xiu'], lines: ['Ni hao! The courtyard is warm in the sun.', 'Ni hao, little bird. Four generations live behind these walls.'] },
    thai: { skin: [3, 5], names: ['Somchai', 'Malee', 'Anan', 'Kanya', 'Niran', 'Ploy'], lines: ['Sawasdee! The river rose up to the stilts last monsoon.'] },
    viet: { skin: [4, 6], names: ['Linh', 'Minh', 'Lan', 'Tuan', 'Hoa', 'Duc'], lines: ['Xin chào! The house stays dry above the water.'] },
    malay: { skin: [2, 4], names: ['Ayu', 'Budi', 'Siti', 'Arif', 'Dewi', 'Rizal'], lines: ['Selamat datang! The breeze comes up under the floor.'] },
    filipino: { skin: [2, 4], names: ['Maria', 'Jose', 'Ligaya', 'Paolo', 'Rosa', 'Andres'], lines: ['Mabuhay! Come up out of the rain.'] },
    india: { skin: [1, 4], names: ['Priya', 'Arjun', 'Lakshmi', 'Ravi', 'Meena', 'Suresh'], lines: ['Namaste! Mind the courtyard, it was just swept.', 'Namaste, little bird. The thatch is new this year.'] },
    caribbean: { skin: [0, 4], names: ['Marisol', 'Andre', 'Josette', 'Luis', 'Keisha', 'Pierre'], lines: ['Hello there! Mind the zinc, it gets hot in the sun.', 'Rest on the verandah, little bird. The breeze is sweet today.'] },
    samoa: { skin: [2, 4], names: ['Sina', 'Tavita', 'Malia', 'Iosefa', 'Losa', 'Ioane'], lines: ['Talofa! Sit in the fale, the breeze comes right through.'] },
    polynesia: { skin: [2, 4], names: ['Moana', 'Teva', 'Hina', 'Manu', 'Vaitiare', 'Tane'], lines: ['Ia ora na! The reef is calm today.'] },
    hawaii: { skin: [2, 5], names: ['Kai', 'Leilani', 'Keoni', 'Malia', 'Nalu', 'Kalani'], lines: ['Aloha! The trade winds are kind today.'] },
    arctic: { skin: [3, 5], names: ['Aputi', 'Siku', 'Nuka', 'Tapeesa', 'Kallik', 'Anernerk'], lines: ['Ai! The ice is good for travelling now.', 'Come in by the lamp, little bird. It is warm inside.'] },
    iceland: { skin: [6, 7], names: ['Gudrun', 'Jon', 'Sigridur', 'Olafur', 'Helga', 'Einar'], lines: ['Hallo! The turf keeps the house warm all winter.'] },
    sapmi: { skin: [5, 7], names: ['Aile', 'Niillas', 'Biret', 'Ande', 'Elle', 'Mahtte'], lines: ['Buorre beaivi! The reindeer are moving north.'] },
    andes: { skin: [2, 4], names: ['Rosa', 'Juan', 'Killa', 'Mateo', 'Sisa', 'Luis'], lines: ['Allillanchu! The terraces are ready for planting.', 'Buenos dias, pajarito.'] },
    meso: { skin: [2, 5], names: ['Maria', 'Jose', 'Ana', 'Miguel', 'Lucia', 'Carlos'], lines: ['Buenos dias! Mind the tiles, pajarito.'] },
    westeur: { skin: [5, 7], names: ['Eleanor', 'Thomas', 'Aoife', 'Pieter', 'Claire', 'Owen'], lines: ['Hello! The thatch was laid new this spring.'] },
    centeur: { skin: [5, 7], names: ['Anna', 'Lukas', 'Marie', 'Jonas', 'Lena', 'Felix'], lines: ['Guten Tag! The beams are older than the village church.'] },
    alps: { skin: [5, 7], names: ['Anna', 'Urs', 'Heidi', 'Reto', 'Vreni', 'Beat'], lines: ['Gruezi! The cows come down from the high meadow soon.'] },
    med: { skin: [4, 7], names: ['Maria', 'Giorgos', 'Lucia', 'Marco', 'Elena', 'Pablo'], lines: ['Buongiorno! The figs are ripe.', 'Hola! The stone keeps the house cool.'] },
    nordic: { skin: [5, 7], names: ['Ingrid', 'Erik', 'Astrid', 'Lars', 'Sigrid', 'Nils'], lines: ['Hei! The stove is lit, come and get warm.'] },
    russia: { skin: [5, 7], names: ['Olga', 'Ivan', 'Anya', 'Pavel', 'Katya', 'Mikhail'], lines: ['Privet! The stove is lit, come and get warm.'] },
    outback: { skin: [0, 7], names: ['Matilda', 'Jack', 'Ruby', 'Ned', 'Isla', 'Banjo'], lines: ["G'day! The tank's full after the storm."] }
  };
  function folkOf(reg, lat, lon) {   // the folk key for a hamlet (null: no people put there); 'jm' and 'us' are world-people.js's own folk (its own names and lines)
    switch (reg) {
      case 'caribbean': return inB(lat, lon, [17.6, 18.6, -78.5, -76.1]) ? 'jm' : 'caribbean';
      case 'nwoods': return lat < 49 && lon > -125 ? 'us' : (lat < 60 ? 'us' : null);
      case 'pueblo': case 'amazon': case 'chum': case 'congo': case 'madagascar': return null;
      case 'swchina': case 'fujian': case 'nchina': return 'china';
      case 'seasia': return lon >= 116 && lon < 127 && lat > 4.5 && lat < 21 ? 'filipino' : lat > 6 && lon < 102.5 ? 'thai' : lat > 8 && lon < 110 ? 'viet' : 'malay';
      case 'polynesia': return inB(lat, lon, [18.5, 22.5, -160.8, -154.5]) ? 'hawaii' : 'polynesia';
      case 'mesoamerica': case 'samerica': return 'meso';
      case 'altiplano': return 'andes';
      case 'eastwoods': return lon < 31 && lat > 55 ? 'nordic' : 'russia';
      default: return FOLK[reg] ? reg : null;
    }
  }

  /* ---------- 6. the ground the game draws (world-animals.js's own reads, copied): its height, the raw sheet (sea bed below 0), its real colour ---------- */
  var ST = function () { return X.TR && X.TR.st; };
  function H(x, z) { return X.H ? X.H(x, z) : (ST() ? ST().H(x, z) : 0); }
  function recOf(x, z) { var s = ST(); if (!s) return null; var p = s.probe(x, z); if (!p) return null; var r = s.tiles.get(p.key); if (!r || !r.hv || !r.mesh) return null; return { r: r, p: p }; }
  function uvOf(q, x, z) { var r = q.r; return WFR_WORLD.tileUV(X.TR.f, r.z, r.x, r.y, x, z); }
  function rawAt(x, z) {
    var q = recOf(x, z); if (!q) return null; var N = Math.round(Math.sqrt(q.r.hv.length)) - 1, uv = uvOf(q, x, z), hv = q.r.hv;
    var fx = Math.min(N - 1e-9, Math.max(0, uv.u * N)), fz = Math.min(N - 1e-9, Math.max(0, uv.v * N)), i = Math.floor(fx), j = Math.floor(fz), a = fx - i, c = fz - j;
    var h00 = hv[j * (N + 1) + i], h10 = hv[j * (N + 1) + i + 1], h01 = hv[(j + 1) * (N + 1) + i], h11 = hv[(j + 1) * (N + 1) + i + 1];
    return a + c <= 1 ? h00 + (h10 - h00) * a + (h01 - h00) * c : h11 + (h01 - h11) * (1 - a) + (h10 - h11) * (1 - c);
  }
  function colAt(x, z) {
    var q = recOf(x, z); if (!q) return null; var col = q.r.mesh.geometry.getAttribute('color'); if (!col) return null; var N = Math.round(Math.sqrt(q.r.hv.length)) - 1, uv = uvOf(q, x, z);
    var i = clamp(Math.round(uv.u * N), 0, N), j = clamp(Math.round(uv.v * N), 0, N), k = (j * (N + 1) + i) * 3, A = col.array;
    return { r: A[k], g: A[k + 1], b: A[k + 2], img: !!(q.r.im712 && q.r.im712.z >= 0) };
  }
  /* world-features.js (OpenStreetMap): water, towns, ice AND buildings veto a hut; kept per tile with the tile's own box, so a test reads only its tile */
  function hookFeatures() {
    var F = window.WFR_FEATURES; if (st.featHooked || !F || typeof F.onTile !== 'function') return; st.featHooked = true;
    try { F.onTile(function (z, x, y, feed) { featTile(z, x, y, feed); }); if (typeof F.onDrop === 'function') F.onDrop(function (z, x, y) { st.feat.delete(z + '/' + x + '/' + y); }); } catch (e) { st.featFault = String(e && e.message || e); }
  }
  var FCLS = { water: 'water', lake: 'water', river: 'water', pond: 'water', basin: 'water', reservoir: 'water', residential: 'town', commercial: 'town', industrial: 'town', retail: 'town', ice: 'ice', glacier: 'ice' };
  function bboxOf(R0) { var b = [1e9, -1e9, 1e9, -1e9]; for (var i = 0; i < R0.length; i += 2) { if (R0[i] < b[0]) b[0] = R0[i]; if (R0[i] > b[1]) b[1] = R0[i]; if (R0[i + 1] < b[2]) b[2] = R0[i + 1]; if (R0[i + 1] > b[3]) b[3] = R0[i + 1]; } return b; }
  function featTile(z, x, y, feed) {
    try { if (!feed) return; var L = [], tb = [1e9, -1e9, 1e9, -1e9], add = function (list, kind) { (list || []).forEach(function (p) {
        var c = kind === 'water' ? (p.cls === 'ocean' ? null : 'water') : kind === 'bld' ? 'bld' : FCLS[p.cls] || FCLS[p.subclass] || null; if (!c || !p.rings || !p.rings[0]) return;
        var b = bboxOf(p.rings[0]); tb[0] = Math.min(tb[0], b[0]); tb[1] = Math.max(tb[1], b[1]); tb[2] = Math.min(tb[2], b[2]); tb[3] = Math.max(tb[3], b[3]); L.push({ c: c, b: b, rings: p.rings }); }); };
      add(feed.water, 'water'); add(feed.landcover, 'cover'); add(feed.landuse, 'use'); add(feed.buildings, 'bld');
      var N = 8, cw = Math.max(1e-9, (tb[1] - tb[0]) / N), ch = Math.max(1e-9, (tb[3] - tb[2]) / N), g = []; for (var q = 0; q < N * N; q++) g.push([]);   // a grid over the tile: a point reads only its own cell's polygons
      L.forEach(function (p, i) { var i0 = clamp(Math.floor((p.b[0] - tb[0]) / cw), 0, N - 1), i1 = clamp(Math.floor((p.b[1] - tb[0]) / cw), 0, N - 1), j0 = clamp(Math.floor((p.b[2] - tb[2]) / ch), 0, N - 1), j1 = clamp(Math.floor((p.b[3] - tb[2]) / ch), 0, N - 1);
        for (var j = j0; j <= j1; j++) for (var k = i0; k <= i1; k++) g[j * N + k].push(i); });
      st.feat.set(z + '/' + x + '/' + y, { b: tb, L: L, g: g, cw: cw, ch: ch, N: N }); st.featTiles++; st.featGen++; } catch (e) { st.featFault = String(e && e.message || e); }
  }
  function inRing(R, lon, lat) { var c = false; for (var i = 0, j = R.length - 2; i < R.length; j = i, i += 2) { var xi = R[i], yi = R[i + 1], xj = R[j], yj = R[j + 1]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi || 1e-12) + xi) c = !c; } return c; }
  var FRANK = { water: 4, bld: 3, town: 2, ice: 1 };
  function featAt(lat, lon) {   // 'water' | 'bld' | 'town' | 'ice' | null (the strongest that holds the point)
    var best = null, br = 0; st.feat.forEach(function (T0) { if (br === 4 || lon < T0.b[0] || lon > T0.b[1] || lat < T0.b[2] || lat > T0.b[3]) return; var L = T0.L, N = T0.N;
      var I = T0.g[clamp(Math.floor((lat - T0.b[2]) / T0.ch), 0, N - 1) * N + clamp(Math.floor((lon - T0.b[0]) / T0.cw), 0, N - 1)];
      for (var ii = 0; ii < I.length; ii++) { var p = L[I[ii]], rk = FRANK[p.c]; if (rk <= br || lon < p.b[0] || lon > p.b[1] || lat < p.b[2] || lat > p.b[3]) continue; if (!inRing(p.rings[0], lon, lat)) continue;
        var hole = false; for (var h = 1; h < p.rings.length; h++) if (inRing(p.rings[h], lon, lat)) { hole = true; break; } if (!hole) { best = p.c; br = rk; } } }); return best;
  }
  function vetoNear(lat, lon) {   // the island's own patches and the real 3D places: no hamlet within 3.5 km (their own ground and their own buildings)
    var V = [[38.9558, -119.9426], [14.5574, -90.7335]], P = window.WFR_DUNNS712 && WFR_DUNNS712.place; if (P) V.push([P.lat, P.lon]);
    for (var i = 0; i < V.length; i++) if (WFR_WORLD.distance({ lat: lat, lon: lon }, { lat: V[i][0], lon: V[i][1] }) < C.VETO_R) return true; return false;
  }

  /* ---------- 7. CELLS and HAMLETS: classified once the ground is final, then filled from the cell's own seed ---------- */
  function lonStep(iLat) { var la = (iLat + 0.5) * C.CELL; return C.CELL / Math.max(0.1, Math.cos(la * D2R)); }
  function cellBox(iLat, iLon) { var ls = lonStep(iLat); return { lat0: iLat * C.CELL, lat1: (iLat + 1) * C.CELL, lon0: iLon * ls - 180, lon1: (iLon + 1) * ls - 180 }; }
  function sampleCell(cell, f) {   // a 4 x 4 lattice: each point's place, height, raw sheet and colour; null while the ground there still sharpens (never forever: 6 s)
    var s = ST(), out = [], img = 0;
    for (var j = 0; j < 4; j++) for (var i = 0; i < 4; i++) { var lat = cell.lat0 + (j + 0.5) / 4 * (cell.lat1 - cell.lat0), lon = cell.lon0 + (i + 0.5) / 4 * (cell.lon1 - cell.lon0), p = WFR_WORLD.toLocal(f, lat, lon);
      if (s.loadingUnder(p.x, p.z) && !(cell.lw > C.LOAD_MAX)) { cell.lw = (cell.lw || 0) + (j + i === 0 ? st.dt : 0); return null; }
      var h = H(p.x, p.z), raw = rawAt(p.x, p.z); if (raw == null) return null; var col = colAt(p.x, p.z); if (col && col.img) img++;
      out.push({ lat: lat, lon: lon, x: p.x, z: p.z, h: h, raw: raw, col: col }); }
    out.img = img; return out;
  }
  function lakeCol(col) { if (!col || !col.img) return false; var lum = (col.r + col.g + col.b) / 3; return col.b > col.r * 1.12 && col.b > col.g * 1.02 && lum < 0.4; }
  function foot(t, x, z, f) {   // may this dwelling stand here? dry, gentle land outside every OSM water, building and town polygon; its base height, or null
    var d = TY[t], R0 = d.r, lim = limOf(t), hmax = -1e9, hmin = 1e9;
    for (var i = 0; i < 9; i++) { var px = i ? x + Math.cos(i / 8 * TAU) * R0 : x, pz = i ? z + Math.sin(i / 8 * TAU) * R0 : z, raw = rawAt(px, pz); if (raw == null || raw < C.LAND_MIN) return null;
      var h = H(px, pz); if (!(h >= C.LAND_MIN)) return null; if (h > hmax) hmax = h; if (h < hmin) hmin = h;
      var ll = WFR_WORLD.toLatLon(f, px, pz); if (inB(ll.lat, ll.lon, [38.9, 39.28, -120.2, -119.9]) && Math.abs(raw - C.TAHOE_LV) < 1.0) return null;
      var fe = featAt(ll.lat, ll.lon); if (fe === 'water' || fe === 'bld' || fe === 'town' || (fe === 'ice' && t !== 'igloo' && t !== 'qarmaq')) return null; }
    if (hmax - hmin > lim) return null; if (lakeCol(colAt(x, z))) return null;
    return { y: hmax - 0.05, lo: hmin };
  }
  function layout(t, n, r) {   // the hamlet's own plan: offsets (metres, x east, z south) and door yaws; every draw from r happens here, before any ground is read
    var d = TY[t], g = d.gap || 12, out = [], i, th = r() * TAU;
    if (d.lay === 'one' || n === 1) { out.push({ x: 0, z: 0, yaw: d.face === 'south' ? (r() - 0.5) * 0.2 : r() * TAU }); return out; }
    if (d.lay === 'ring') { var Rr = Math.max(g * 0.8, g * n / TAU * 1.25 + 2); for (i = 0; i < n; i++) { var a = th + i / n * TAU + (r() - 0.5) * 0.35, rr = Rr * (0.9 + r() * 0.2); out.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, yaw: yawTo(-Math.cos(a), -Math.sin(a)) + (r() - 0.5) * 0.3 }); } return out; }
    if (d.lay === 'row') { for (i = 0; i < n; i++) out.push({ x: (i - (n - 1) / 2) * g + (r() - 0.5) * 3, z: (r() - 0.5) * 6, yaw: (r() - 0.5) * 0.25 }); return out; }
    if (d.lay === 'grid') { for (i = 0; i < n; i++) out.push({ x: (i % 2) * g * 1.05 - (n > 1 ? g * 0.5 : 0), z: Math.floor(i / 2) * g * 1.1, yaw: (r() - 0.5) * 0.06 }); return out; }
    if (d.lay === 'road') { var ux = Math.cos(th), uz = Math.sin(th); for (i = 0; i < n; i++) { var s = (i - (n - 1) / 2) * g * 0.6 + (r() - 0.5) * 3, side = i % 2 ? 1 : -1, off = side * (7 + r() * 3); out.push({ x: ux * s - uz * off, z: uz * s + ux * off, yaw: yawTo(uz * side, -ux * side) + (r() - 0.5) * 0.2 }); } return out; }
    for (i = 0; i < n; i++) { var a2 = i * 2.39996 + th, r2 = i ? g * Math.sqrt(i) * 0.8 * (0.85 + r() * 0.3) : 0; out.push({ x: Math.cos(a2) * r2, z: Math.sin(a2) * r2, yaw: d.face === 'south' ? (r() - 0.5) * 0.25 : r() * TAU }); }
    return out;
  }
  function pickW(L, r) { var tot = 0; L.forEach(function (e) { tot += e[1]; }); var u = r() * tot; for (var q = 0; q < L.length; q++) { u -= L[q][1]; if (u <= 0) return L[q]; } return L[L.length - 1]; }
  function hamlet(cell, q, r, f, tag) {   // one hamlet near lattice point q: its region, kind, plan; each dwelling's footprint checked; null if too few stand
    var cx = q.x + (r() - 0.5) * 500, cz = q.z + (r() - 0.5) * 500, take = r(), pickU = r(), nU = r(), vs = [r(), r(), r(), r(), r(), r(), r(), r(), r()], plan, kraal = r(), stockU = r(), stockR = rng(hash('wh730s:' + cell.key + ':' + tag));
    var ll = WFR_WORLD.toLatLon(f, cx, cz), el = Math.max(0, H(cx, cz)), rg = regionOf(ll.lat, ll.lon, el); if (!rg || take > rg.dens || vetoNear(ll.lat, ll.lon)) return null;
    var e = pickW(rg.types, function () { return pickU; }), t = e[0], d = TY[t], n = d.n[0] + Math.floor(nU * (d.n[1] - d.n[0] + 1)); plan = layout(t, n, r);
    var hm = { id: cell.key + ':' + tag, reg: rg.id, t: t, lat: ll.lat, lon: ll.lon, huts: [], stock: [], folk: folkOf(rg.id, ll.lat, ll.lon), r: 0 };
    plan.forEach(function (p, i) { var x = cx + p.x, z = cz + p.z, fo = foot(t, x, z, f); if (!fo) return; var vl = e[2] || null, v = vl ? vl[Math.floor(vs[i % 9] * vl.length) % vl.length] : Math.floor(vs[i % 9] * d.v) % d.v, l2 = WFR_WORLD.toLatLon(f, x, z);
      hm.huts.push({ t: t, v: v, k: t + ':' + v, lat: l2.lat, lon: l2.lon, yaw: p.yaw, s: 0.94 + vs[(i + 3) % 9] * 0.12, y: fo.y, lo: fo.lo, veto: false, id: hm.id + ':' + i }); hm.r = Math.max(hm.r, Math.hypot(p.x, p.z) + d.r); });
    if (hm.huts.length < Math.max(1, Math.ceil(n * 0.5))) return null;
    if (t === 'rondavel' && kraal < 0.6 && hm.huts.length >= 3) { var ringR = 0; plan.forEach(function (p) { ringR = Math.max(ringR, Math.hypot(p.x, p.z)); });   // the cattle kraal stands just outside the ring of houses
      var ka = kraal / 0.6 * TAU, kd = ringR + d.r + TY.kraal.r + 1.5, kx = cx + Math.cos(ka) * kd, kz = cz + Math.sin(ka) * kd, fk = foot('kraal', kx, kz, f), lk = WFR_WORLD.toLatLon(f, kx, kz);
      if (fk) { hm.huts.push({ t: 'kraal', v: 0, k: 'kraal:0', lat: lk.lat, lon: lk.lon, yaw: ka, s: 1, y: fk.y, lo: fk.lo, veto: false, id: hm.id + ':k' }); hm.r = Math.max(hm.r, kd + TY.kraal.r); } }
    var sk = d.stock, ns = sk ? 2 + Math.floor(stockU * 4) : 0;
    if (sk === 'camel' && rg.id === 'tibet') ns = 0;
    for (var k = 0; k < ns; k++) { var a = stockR() * TAU, dd = hm.r * 0.5 + 6 + stockR() * 10, sx = cx + Math.cos(a) * dd, sz = cz + Math.sin(a) * dd, yaw = stockR() * TAU, ss = 0.9 + stockR() * 0.2;
      var clear = hm.huts.every(function (h) { var p2 = WFR_WORLD.toLocal(f, h.lat, h.lon); return Math.hypot(p2.x - sx, p2.z - sz) > TY[h.t].r + 2; }), raw = rawAt(sx, sz), hh = H(sx, sz), l3 = WFR_WORLD.toLatLon(f, sx, sz), fe = featAt(l3.lat, l3.lon);
      if (!clear || raw == null || raw < C.LAND_MIN || !(hh >= C.LAND_MIN) || fe === 'water' || fe === 'bld' || fe === 'town') continue;
      hm.stock.push({ k: sk === 'camel' && k % 3 === 2 ? 'goat' : sk, lat: l3.lat, lon: l3.lon, yaw: yaw, s: ss, y: hh, veto: false, id: hm.id + ':s' + k }); }
    return hm;
  }
  function populate(cell, smp, f) {
    var r = rng(hash('wh730:' + cell.key)), G = [], land = smp.filter(function (q) { return q.raw >= C.LAND_MIN && q.h >= C.LAND_MIN; });
    for (var q = land.length - 1; q > 0; q--) { var w = Math.floor(r() * (q + 1)), tq = land[q]; land[q] = land[w]; land[w] = tq; }
    for (var g = 0; g < 2; g++) { var seed = r(), q0 = land[g % Math.max(1, land.length)]; if (!q0) continue; var hm = hamlet(cell, q0, rng(hash('wh730:' + cell.key + ':' + g + ':' + seed.toFixed(9))), f, g); if (hm) G.push(hm); }
    var sig = 2166136261 >>> 0; G.forEach(function (hm) { hm.huts.forEach(function (h) { sig = hash(sig + '|' + h.k + ':' + h.lat.toFixed(6) + ',' + h.lon.toFixed(6) + ':' + h.yaw.toFixed(4) + ':' + h.s.toFixed(4)); });
      hm.stock.forEach(function (a) { sig = hash(sig + '|' + a.k + ':' + a.lat.toFixed(6) + ',' + a.lon.toFixed(6)); }); });
    cell.hamlets = G; cell.sig = sig; cell.n = G.reduce(function (s, hm) { return s + hm.huts.length; }, 0); cell.regions = G.map(function (hm) { return hm.reg + '/' + hm.t; });
  }

  /* ---------- 8. each frame: the cells round her, the heights kept true, the OSM re-check, the folk ---------- */
  function herNow() { var S = X.S, T0 = X.TR, h = st.her; h.x = S.pos.x; h.y = S.pos.y; h.z = S.pos.z; h.agl = S.pos.y - Math.max(0, H(S.pos.x, S.pos.z)); var ll = WFR_WORLD.toLatLon(T0.f, S.pos.x, S.pos.z); h.lat = ll.lat; h.lon = ll.lon; return h; }
  function cellsTick(dt) {
    var her = herNow(), f = X.TR.f, keep = new Set(), pops = 0, dLat = (C.R_SPAWN + 1800) / 111320, i0 = Math.floor((her.lat - dLat) / C.CELL), i1 = Math.floor((her.lat + dLat) / C.CELL), near = [];
    for (var i = i0; i <= i1; i++) { var ls = lonStep(i), dLon = (C.R_SPAWN + 1800) / (111320 * Math.max(0.05, Math.cos(her.lat * D2R))), j0 = Math.floor((her.lon - dLon + 180) / ls), j1 = Math.floor((her.lon + dLon + 180) / ls);
      for (var j = j0; j <= j1; j++) { var b = cellBox(i, j), dd = WFR_WORLD.distance(her, { lat: (b.lat0 + b.lat1) / 2, lon: (b.lon0 + b.lon1) / 2 }); if (dd < C.R_SPAWN + 1800) near.push({ key: i + ':' + j, b: b, d: dd }); } }
    near.sort(function (a, b2) { return a.d - b2.d; });
    for (var n = 0; n < near.length; n++) { var c = near[n]; keep.add(c.key); var cell = st.cells.get(c.key);
      if (!cell) { cell = { key: c.key, lat0: c.b.lat0, lat1: c.b.lat1, lon0: c.b.lon0, lon1: c.b.lon1, hamlets: null, wait: 0 }; st.cells.set(c.key, cell); }
      cell.seen = st.t; cell.d = c.d;
      if (!cell.hamlets && pops < C.POP) { var smp = sampleCell(cell, f); if (!smp) { st.waits++; continue; }
        if (smp.img < smp.length && cell.wait < C.IMG_WAIT && window.WFR_IMAGERY && WFR_IMAGERY.enabled && WFR_IMAGERY.enabled()) { cell.wait += dt; continue; }
        populate(cell, smp, f); pops++; st.pops++; if (smp.img === smp.length) st.img++; else st.tint++; st.dirty = true; } }
    var act = []; st.cells.forEach(function (cell) { if (cell.hamlets && keep.has(cell.key)) act.push(cell); });
    if (act.length !== st.act.length || act.some(function (c2, k) { return c2 !== st.act[k]; })) st.dirty = true; st.act = act;
    if (st.cells.size > C.KEEP) { var old = []; st.cells.forEach(function (cell) { if (!keep.has(cell.key)) old.push(cell); }); old.sort(function (a, b2) { return a.seen - b2.seen; }); for (var q = 0; q < old.length && st.cells.size > C.KEEP; q++) { st.cells.delete(old[q].key); st.drops++; } }
  }
  function refreshTick() {   // a few dwellings a frame: the base height again (the ground sharpens as finer tiles arrive), and OSM's polygons that came after it
    var all = []; st.act.forEach(function (c) { c.hamlets.forEach(function (hm) { hm.huts.forEach(function (h) { all.push(h); }); hm.stock.forEach(function (a) { all.push(a); }); }); }); if (!all.length) return;
    var f = X.TR.f; if (st.featGen !== st.featSeen) { st.featSeen = st.featGen; st.featLeft = all.length; }   // new OSM polygons: every standing hut checked again, 3 x the pace, until a whole pass is done
    var n = Math.min(all.length, st.featLeft > 0 ? C.REFRESH * 3 : C.REFRESH); if (st.featLeft > 0) st.featLeft -= n;
    for (var k = 0; k < n; k++) { var h = all[(st.rr + k) % all.length], p = WFR_WORLD.toLocal(f, h.lat, h.lon), was = h.veto, y0 = h.y;
      if (h.t) { var fo = foot(h.t, p.x, p.z, f); if (fo) { h.y = fo.y; h.lo = fo.lo; h.veto = false; } else if (recOf(p.x, p.z)) { h.veto = true; } }
      else { var raw = rawAt(p.x, p.z), hh = H(p.x, p.z), fe = featAt(h.lat, h.lon); if (raw != null) { h.veto = raw < C.LAND_MIN || !(hh >= C.LAND_MIN) || fe === 'water' || fe === 'bld' || fe === 'town'; if (!h.veto) h.y = hh; } }
      if (was !== h.veto || Math.abs(y0 - h.y) > 0.02) { st.dirty = true; if (h.veto && !was) st.vetoes++; } }
    st.rr = (st.rr + n) % Math.max(1, all.length); st.refreshN++;
  }
  function peopleTick() {   // the nearest hamlets get a few folk at their doors (world-people.js's addPlace, its own people, names and lines from here); far ones lose them
    var P = window.WFR_PEOPLE724; if (!P || typeof P.addPlace !== 'function' || typeof P.dropPlace !== 'function') return; var her = st.her, want = [], f = X.TR.f;
    st.act.forEach(function (c) { c.hamlets.forEach(function (hm) { if (!hm.folk) return; var d = WFR_WORLD.distance(her, hm); if (d < C.PEOPLE_R) want.push({ hm: hm, d: d }); }); });
    want.sort(function (a, b) { return a.d - b.d; }); want = want.slice(0, C.PEOPLE_MAX); var ids = new Set(want.map(function (w) { return 'h730:' + w.hm.id; }));
    st.people.forEach(function (rec, id) { if (!ids.has(id) && (WFR_WORLD.distance(her, rec.hm) > C.PEOPLE_DROP || st.people.size > C.PEOPLE_MAX)) { try { P.dropPlace(id); } catch (e) { st.peopleFault = String(e && e.message || e); } st.people.delete(id); } });
    want.forEach(function (w) { var id = 'h730:' + w.hm.id; if (st.people.has(id)) return; try { addFolk(P, id, w.hm, f); } catch (e) { st.peopleFault = String(e && e.message || e); } });
  }
  function addFolk(P, id, hm, f) {
    var native = hm.folk === 'jm' || hm.folk === 'us', F = FOLK[hm.folk], doors = [], standing = hm.huts.filter(function (h) { return !h.veto && h.t !== 'kraal'; });
    if (!standing.length || (!native && !F)) return;
    standing.slice(0, 4).forEach(function (h) { var p = WFR_WORLD.toLocal(f, h.lat, h.lon), d = TY[h.t].r + 1.4, x = p.x + Math.sin(h.yaw) * d, z = p.z + Math.cos(h.yaw) * d, ll = WFR_WORLD.toLatLon(f, x, z);
      if (rawAt(x, z) == null || rawAt(x, z) < C.LAND_MIN || featAt(ll.lat, ll.lon) === 'bld') return; doors.push({ lat: ll.lat, lon: ll.lon, yaw: h.yaw }); });
    if (!doors.length) return;
    P.addPlace({ id: id, name: TY[hm.t].name, lat: hm.lat, lon: hm.lon, r: Math.max(40, hm.r + 10), folk: native ? hm.folk : 'h730', lines: native ? undefined : F.lines,
      build: function (p, r0, mk) {   // world-people.js's own person-maker (729): one person at each door, facing out; this hamlet's own names and lines (its own for jm / us)
        if (typeof mk !== 'function') return; var r = rng(hash('wh730p:' + hm.id));
        doors.forEach(function (dr) { var q = WFR_WORLD.toLocal(p.f, dr.lat, dr.lon), u = r(), o = { role: 'local', x: q.x, z: q.z, yaw: dr.yaw, kind: 'stand', clip: u < 0.25 ? 'wave' : u < 0.5 ? 'interact' : 'idle' };
          if (!native) { o.name = F.names[Math.floor(r() * F.names.length)]; o.line = F.lines[Math.floor(r() * F.lines.length)]; }
          var sp = mk(r, o), si = F ? F.skin[0] + Math.floor(r() * (F.skin[1] - F.skin[0] + 1)) : -1;
          if (!native && sp && Array.isArray(sp.skin) && si >= 0) { var c = SKIN[si]; sp.skin[0] = ((c >> 16) & 255) / 255; sp.skin[1] = ((c >> 8) & 255) / 255; sp.skin[2] = (c & 255) / 255; } }); } });
    st.people.set(id, { hm: hm, n: doors.length }); st.peopleN++;
  }

  /* ---------- 9. drawing: one program (Lambert, vertex colours, instanced); the matrices written only when something changed ---------- */
  function OBC(shader) {   // ONE function for every hut and grazing animal (r128 keys the program by this text): uWH730 marks it for the bench
    var u = this.userData.uWH730; shader.uniforms.uWH730Night = u.night;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWH730Y;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWH730Y = position.y;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uWH730Night; varying float vWH730Y;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 0.76 + 0.24 * smoothstep( -0.3, 1.0, vWH730Y );')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.26 * ( 1.0 - uWH730Night );\n#ifdef USE_COLOR\nif ( uWH730Night > 0.01 && ( all( lessThan( abs( vColor.rgb - vec3( 0.10196, 0.07843, 0.06275 ) ), vec3( 0.003 ) ) ) || all( lessThan( abs( vColor.rgb - vec3( 0.91373, 0.86275, 0.75294 ) ), vec3( 0.003 ) ) ) ) ) totalEmissiveRadiance += uWH730Night * vec3( 1.0, 0.68, 0.34 );\n#endif');
  }
  function meshOf(THREE, pos, nrm, col, name) {
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    var im = new THREE.InstancedMesh(g, st.mat, C.CAP); im.count = 0; im.visible = false; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.matrixAutoUpdate = false; im.name = name;
    im.layers.enable(0); im.layers.enable(C.LAYER); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.userData.ids = []; im.userData.y0 = []; return im;
  }
  function buildKind(k) {   // a dwelling kind ('type:variant') or a grazing animal ('@goat'), built the first time it is wanted (one a frame)
    var THREE = X.THREE, R0 = st.kinds[k] = { k: k, ok: false, err: null, im: null, n: 0, tris: 0 };
    try { var m;
      if (k.charAt(0) === '@') { var A = window.WFR_WORLDANIMALS; if (!A || typeof A.model !== 'function') throw new Error('no world-animals model door'); var b = A.model(k.slice(1)); if (!b) throw new Error('no body ' + k);
        if (typeof A.pose === 'function') A.pose(k.slice(1), b, false, 0.2); var cnt = b.count; m = { pos: new Float32Array(b.pos.subarray(0, cnt * 3)), nrm: new Float32Array(b.nrm.subarray(0, cnt * 3)), col: new Float32Array(b.color.subarray(0, cnt * 3)), count: cnt }; }
      else { var sp = k.split(':'); m = build(sp[0], +sp[1]); }
      R0.im = meshOf(THREE, m.pos, m.nrm, m.col, 'huts:' + k); R0.tris = m.count / 3; st.root.add(R0.im); R0.ok = true; st.built.push(k);
    } catch (e) { R0.err = String(e && e.message || e); if (k.charAt(0) === '@') st.stockFault = k + ': ' + R0.err; else st.fault = 'build ' + k + ': ' + R0.err; }
    return R0;
  }
  function put(R0, id, x, y, z, yaw, s) { if (R0.n >= C.CAP) return; var i = R0.n++, A = R0.im.instanceMatrix.array, o = i * 16, c = Math.cos(yaw) * s, sn = Math.sin(yaw) * s;
    A[o] = c; A[o + 1] = 0; A[o + 2] = -sn; A[o + 3] = 0; A[o + 4] = 0; A[o + 5] = s; A[o + 6] = 0; A[o + 7] = 0; A[o + 8] = sn; A[o + 9] = 0; A[o + 10] = c; A[o + 11] = 0; A[o + 12] = x; A[o + 13] = y; A[o + 14] = z; A[o + 15] = 1; R0.im.userData.ids[i] = id; }
  function fKeyOf(f) { if (!f) return ''; var dsc = WFR_WORLD.describeFrame ? WFR_WORLD.describeFrame(f) : f; return [dsc.ox, dsc.oy, dsc.oz, dsc.k, dsc.mode].join('|'); }
  function place() {   // the scene's onBeforeRender (after the travel zone's re-centre): every standing dwelling written into its kind's instances, when anything changed
    if (!st.inited) return; var t0 = performance.now();
    try {
      var on = st.enabled && st.mode === 'travel' && X.TR && X.TR.on && X.TR.f, f = on ? X.TR.f : null, fk = fKeyOf(f); if (fk !== st.fKey) { st.fKey = fk; st.dirty = true; }
      if (!st.dirty) return; st.dirty = false; var k;
      for (k in st.kinds) { st.kinds[k].n = 0; }
      if (on) { var S = X.S; for (var c = 0; c < st.act.length; c++) { var Hm = st.act[c].hamlets; for (var g = 0; g < Hm.length; g++) { var hm = Hm[g], o = WFR_WORLD.toLocal(f, hm.lat, hm.lon); if (Math.hypot(o.x - S.pos.x, o.z - S.pos.z) > C.R_DROP) continue;
        hm.huts.forEach(function (h) { if (h.veto) return; var R0 = st.kinds[h.k]; if (!R0 || !R0.ok) return; var p = WFR_WORLD.toLocal(f, h.lat, h.lon); put(R0, h.id, p.x, h.y, p.z, h.yaw, h.s); R0.im.userData.y0[R0.n - 1] = h.lo; });
        hm.stock.forEach(function (a) { if (a.veto) return; var R0 = st.kinds['@' + a.k]; if (!R0 || !R0.ok) return; var p = WFR_WORLD.toLocal(f, a.lat, a.lon); put(R0, a.id, p.x, a.y, p.z, a.yaw, a.s); R0.im.userData.y0[R0.n - 1] = a.y; }); } } }
      for (k in st.kinds) { var R1 = st.kinds[k]; if (!R1.ok) continue; R1.im.count = R1.n; R1.im.visible = R1.n > 0; if (R1.n) R1.im.instanceMatrix.needsUpdate = true; }
      st.writes++; st.placeN++;
    } catch (e) { st.fault = 'place: ' + (e && e.message || e); st.enabled = false; hideAll(); }
    finally { st.placeMs += performance.now() - t0; }
  }
  function hideAll() { for (var k in st.kinds) if (st.kinds[k].ok) { st.kinds[k].im.count = 0; st.kinds[k].im.visible = false; } }

  /* ---------- 10. init and tick ---------- */
  function init(ctx) {
    if (st.inited) return true; X = ctx || {};
    try {
      if (!X.THREE || !X.scene || !window.WFR_WORLD) { st.fault = 'init: no THREE, scene or WFR_WORLD'; return false; }
      if (X.classic && X.classic()) { st.fault = 'classic look: the huts are Standard only (board 645)'; return false; }
      var THREE = X.THREE; st.mat = new THREE.MeshLambertMaterial({ vertexColors: true }); st.mat.name = 'huts730'; st.mat.userData.uWH730 = { night: { value: 0 } }; st.mat.onBeforeCompile = OBC;
      var root = new THREE.Group(); root.name = 'huts730'; root.matrixAutoUpdate = false; root.layers.enable(C.LAYER); st.root = root;
      var keep = meshOf(THREE, new Float32Array(9), new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), new Float32Array(9), 'huts:keep'); keep.count = 1; keep.visible = true; keep.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0)); root.add(keep); st.keep = keep;   // the keeper: one empty instance, so the program compiles at load
      X.scene.add(root); root.updateMatrixWorld(true);
      var prev = X.scene.onBeforeRender; X.scene.onBeforeRender = function () { if (typeof prev === 'function') prev.apply(this, arguments); place(); }; st.hook = true;
      st.inited = true; hookFeatures(); return true;
    } catch (e) { st.fault = 'init: ' + (e && e.message || e); return false; }
  }
  function tick(dt) {
    if (!st.inited || !st.enabled) return; var t0 = performance.now(); dt = dt || 0;
    try {
      st.t += dt; st.dt = dt; st.frame++;
      if (!st.featHooked && (st.featPoll -= dt) <= 0) { st.featPoll = 2; hookFeatures(); }
      var nt = X.night ? clamp(+X.night() || 0, 0, 1) : 0; st.night = nt; st.mat.userData.uWH730.night.value = nt * 0.9;
      var T0 = X.TR, on = !!(T0 && T0.on && T0.f && T0.st && X.S && X.S.pos), agl = on ? X.S.pos.y - Math.max(0, H(X.S.pos.x, X.S.pos.z)) : 0, mode = on && agl < C.AGL_MAX ? 'travel' : 'off';
      if (mode !== st.mode) { st.mode = mode; st.dirty = true; }
      if (mode === 'travel') { cellsTick(dt);
        for (var c = 0; c < st.act.length; c++) { var Hm = st.act[c].hamlets; for (var g = 0; g < Hm.length; g++) { var hm = Hm[g];
          hm.huts.forEach(function (h) { if (!st.kinds[h.k] && st.buildN !== st.frame) { st.buildN = st.frame; buildKind(h.k); st.dirty = true; } });
          hm.stock.forEach(function (a) { if (!st.kinds['@' + a.k] && st.buildN !== st.frame) { st.buildN = st.frame; buildKind('@' + a.k); st.dirty = true; } }); } }
        refreshTick(); if ((st.peopleT = (st.peopleT || 0) - dt) <= 0) { st.peopleT = 0.5; peopleTick(); } }
      else if (st.act.length) { st.act = []; st.dirty = true; if (st.people.size && window.WFR_PEOPLE724) { st.people.forEach(function (rec, id) { try { WFR_PEOPLE724.dropPlace(id); } catch (e) { /* gone */ } }); st.people.clear(); } }
    } catch (e) { st.fault = 'tick: ' + (e && e.message || e); st.faultAt = String(e && e.stack || '').split(String.fromCharCode(10)).slice(0, 4).join(' | '); st.enabled = false; hideAll(); }   // a fault takes the huts away, never the game
    var ms = performance.now() - t0 + st.placeMs; st.placeMs = 0; st.ms.push(ms); if (st.ms.length > 600) st.ms.shift(); if (ms > st.msMax) st.msMax = ms;
  }

  /* ---------- 11. the bench's reads (guards only) ---------- */
  function drawn() {   // what SHIPS: every drawn dwelling and animal read back from the instance buffers
    var out = []; for (var k in st.kinds) { var R0 = st.kinds[k]; if (!R0.ok || !R0.im.visible) continue; var A = R0.im.instanceMatrix.array;
      for (var i = 0; i < R0.im.count; i++) { var o = i * 16; out.push({ k: k, t: k.charAt(0) === '@' ? null : k.split(':')[0], stock: k.charAt(0) === '@' ? k.slice(1) : null, id: R0.im.userData.ids[i], x: A[o + 12], y: A[o + 13], z: A[o + 14], yaw: Math.atan2(A[o + 8], A[o + 10]), s: Math.hypot(A[o], A[o + 1], A[o + 2]), lo: R0.im.userData.y0[i] }); } }
    return out; }
  function hutsNear() { var out = []; st.act.forEach(function (c) { c.hamlets.forEach(function (hm) { hm.huts.forEach(function (h) { out.push({ id: h.id, t: h.t, k: h.k, reg: hm.reg, lat: h.lat, lon: h.lon, r: TY[h.t].r, veto: h.veto, y: h.y }); }); }); }); return out; }
  function peek() {
    var byKind = {}, draws = 0, tris = 0; for (var k in st.kinds) { var R0 = st.kinds[k]; if (!R0.ok || !R0.im.visible || !R0.im.count) continue; draws++; tris += R0.im.count * R0.tris; byKind[k] = R0.im.count; }
    var ms = st.ms.slice().sort(function (a, b) { return a - b; }), act = st.act.map(function (c) { return { key: c.key, n: c.n, sig: c.sig, reg: c.regions, d: Math.round(c.d) }; });
    return { inited: st.inited, enabled: st.enabled, fault: st.fault, faultAt: st.faultAt, mode: st.mode, t: +st.t.toFixed(2), cells: st.cells.size, act: act, pops: st.pops, drops: st.drops, waits: st.waits, img: st.img, tint: st.tint,
      byKind: byKind, draws: draws, tris: Math.round(tris), built: st.built.slice(), vetoes: st.vetoes, writes: st.writes, refreshN: st.refreshN, featTiles: st.featTiles, featFault: st.featFault, featHooked: st.featHooked,
      people: Array.from(st.people.keys()), peopleN: st.peopleN, peopleFault: st.peopleFault, stockFault: st.stockFault, night: st.night, hook: st.hook, season: winter() ? 'winter' : 'summer',
      programs: X && X.renderer ? X.renderer.info.programs.length : null, hutPrograms: X && X.renderer ? X.renderer.info.programs.filter(function (q) { return /uWH730/.test(q.cacheKey || ''); }).length : null,
      ms: { n: ms.length, med: ms.length ? +ms[ms.length >> 1].toFixed(3) : null, p95: ms.length ? +ms[Math.floor(ms.length * 0.95)].toFixed(3) : null, max: +st.msMax.toFixed(3) }, her: st.her };
  }
  return { C: C, TYPES: TY, REGIONS: REG, init: init, tick: tick, peek: peek, drawn: drawn, near: hutsNear, regionOf: regionOf, folkOf: folkOf, build: build, depthOf: depthOf, limOf: limOf,
    resetMs: function () { st.ms = []; st.msMax = 0; }, forget: function () { st.cells.clear(); st.act = []; st.dirty = true; },   // the bench's revisit: every cell generated again from its key
    cell: function (key) { var c = st.cells.get(key); return c ? { key: c.key, n: c.n, sig: c.sig, reg: c.regions } : null; },
    set enabled(v) { st.enabled = !!v; st.dirty = true; if (!v) hideAll(); }, get enabled() { return st.enabled; } };
})();
