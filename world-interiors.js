/* world-interiors.js - BOARD 729, ENTERABLE BUILDINGS WHERE THE QUESTS ARE (Wings for Rouge). Trunks, Nov 4 2026. Extends 690 (bigger on the inside).
   Marth, Nov 4 2026, verbatim: "all of those 'quests' need to have enterabke buildings if available irl. office spaces etc or tourrism like irl. good
   additions tho, this is what i mean by adept and tact coding and innovation".

   WHAT ROUGE SEES: at the real door of a landmark she can enter in real life (a 🚪 tag marks it from 260 m), she glides in low (the door draws her in:
   her flight floor drops and she slows as she nears it), and within 2.5 m the button she uses for signs and people reads 🚪 Enter (gone again past 4 m,
   the 💬 rule). One tap: a soft dusk fade (his door rule: never white; a fade only when she chooses a door), and she is standing inside, walking:
     the Eiffel Tower's 1st floor (the glass floor 57 m up) and, by the lift, the summit deck with Gustave Eiffel's office and all of Paris round it;
     the Empire State's Art Deco lobby (the gold ceiling, the relief of the building) and the 86th-floor open-air deck with its curved fence;
     the Statue of Liberty's pedestal (the iron pylon and the spiral stairs rising into the copper) and the crown's 25 windows;
     the Elizabeth Tower's clock room behind the four lit dials, and the belfry with the Great Bell;
     the Great Pyramid's Grand Gallery (corbelled, climbing at 26 degrees) and the King's Chamber, quiet: it is a tomb;
     the Sydney Opera House's north foyer (the ribs, the glass over the harbour) and the Concert Hall (the Grand Organ, the rings over the stage);
     the Taj Mahal's hall, REVERENTLY: a mausoleum. Quiet, seen: no people, no talk, no music change; only walking, looking, and the way out.
   Inside, the same button reads 🛗 / 🌀 / 🪜 by a lift or stairs, 💬 Talk by a person (not in the quiet rooms), 🚪 by the way out; out, she is in the
   air just outside the door, gliding on. Going in counts her landmark's "go inside" quest (world-quests.js, its 729 doors).
   EVERYDAY BUILDINGS: near a quest (a landmark, or a person with a quest), shops, cafés and offices the real map names (OpenStreetMap POIs, through
   world-features.js) open too, each into a small room of its kind (an office lobby with lifts and a desk, a shop, a café), laid out from the building's
   own id (the same room on every visit), its people from world-people.js (a receptionist, a shopkeeper, a barista, shoppers, customers).

   REUSED, NOT REWRITTEN (MBAEEMP): world-features' wall material (the travel program and the CC0 Poly Haven plaster photo, compiled at the gate: no new
   program; never disposed); WFR_WORLD for every lat/lon; the streamed ground (travelH) for every height; world-people's places, roster seeding and talk;
   world-quests' finish() for the reward; the page's #read button (its skin, its place, its tap) for 🚪 / 🛗 / 💬; the island's walk numbers (5.5 m/s x
   (0.6 + size) x 0.7 indoors, 1.8 rad/s turn) and its gait (WFR_BIRDS.walk); 725d's dusk veil colours. NEW, because nothing like it existed: the
   interiors (data: rooms, walk areas, links, views; geometry built behind the veil), the door approach, the POI feed's reader.

   THE PAGE HANDS IT (tools/wiring/wire-interiors.js): init(ctx) once; tick(dt) every frame (both zones); frame(dt) at the head of the travel zone's
   branch (true: she is inside, the flight and the leave wait); floor(x, z) in tf723Floor (the door's low floor); cap(speed, pos, yaw) after the flight's
   speed. Every word, number and coordinate here is DRAFT for Marth's pen (doors and heights are public record, for Izumi to check on a chart). */
window.WFR_INTERIORS729 = (function () {
  'use strict';
  var C = { SHOW: 2.5, HIDE: 4, DOOR_Y: 1.6, APPROACH: 40, BLEND: 15, FLOOR_NEAR: 1.2, CAP_MIN: 1.0, CAP_K: 0.5, CAP_PAD: 1.5, EXIT_OUT: 3.2, EXIT_UP: 1.8, EXIT_V: 3,
    FADE_IN: 0.42, FADE_OUT: 0.6, LINK_R: 1.6, VIEW_R: 1.8, CAM_M: 1.08, WALK_K: 0.7, TURN: 1.8, MARK_R: 260, POOL: 10, NEAR_DOORS: 320,
    GEN_R: 350, GEN_MAX: 9, GEN_PER: 3, GEN_KEEP: 4000, GEN_CLEAR: 30, ANCHOR_KM: 4, SEL_EVERY: 0.5, KEEP_BUILT: 2, LAYER: 7, UVK: 1 / 3, XP: 60, RUNES: 8 };
  var X = null, THREE = null, W = null;
  var st = { inited: false, fault: null, on: false, phase: null, phT: 0, pend: null, cur: null, owned: false, near: null, nearD: null, enters: 0, exits: 0, links: 0, talks: 0,
    lastEnter: null, lastExit: null, external: 0, built: new Map(), gen: [], genT: 0, cand: new Map(), feedTiles: 0, feedPois: 0, marks: [], markEl: null, veil: null,
    ms: [], msMax: 0, buildMs: [], events: [], hidden: null, doorsNow: [], atView: null, viewsSeen: {}, osmTall: {}, crossT: 0 };

  /* ---------- small tools ---------- */
  function hx(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; }
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(r, a) { return a[Math.floor(r() * a.length) % a.length]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function jit(col, r, k) { var f = 1 + (r() * 2 - 1) * k; return [col[0] * f, col[1] * f, col[2] * f]; }
  function now() { return performance.now(); }
  function $(id) { return document.getElementById(id); }
  function ev(s) { st.events.push(s); if (st.events.length > 30) st.events.shift(); }

  /* ---------- the geometry builder: one buffer per room (positions, normals, colours, uv), every face oriented by the side it is seen from ---------- */
  var UP = [0, 1, 0], DN = [0, -1, 0];
  function Geo() { this.p = []; this.n = []; this.c = []; this.uv = []; this.i = []; this.yh = 6; this.glowN = null; }
  Geo.prototype.poly = function (P, col, want, glow) {   // a convex (or star-from-P[0]) polygon; want: the side it faces; glow: lit from within (its normal faces the sun)
    var a = P[0], b = P[1], c = P[2], ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz); if (!(l > 1e-10)) return;
    nx /= l; ny /= l; nz /= l; var rev = !!want && nx * want[0] + ny * want[1] + nz * want[2] < 0; if (rev) { nx = -nx; ny = -ny; nz = -nz; }
    if (this.glowN && this.fill) { var gx = nx + this.glowN[0] * this.fill, gy = ny + this.glowN[1] * this.fill, gz = nz + this.glowN[2] * this.fill, gl = Math.hypot(gx, gy, gz) || 1; nx = gx / gl; ny = gy / gl; nz = gz / gl; }   // the room's fill light (lit rooms, not the sun's black backs)
    var N = glow && this.glowN ? this.glowN : null, base = this.p.length / 3, ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz), k, q, f, K = C.UVK;
    for (k = 0; k < P.length; k++) { q = P[k]; this.p.push(q[0], q[1], q[2]); if (N) this.n.push(N[0], N[1], N[2]); else this.n.push(nx, ny, nz);
      f = glow ? 1.08 : 0.8 + 0.2 * clamp(q[1] / this.yh, 0, 1); this.c.push(col[0] * f, col[1] * f, col[2] * f);
      if (ay >= ax && ay >= az) this.uv.push(q[0] * K, q[2] * K); else if (ax >= az) this.uv.push(q[2] * K, q[1] * K); else this.uv.push(q[0] * K, q[1] * K); }
    for (k = 1; k < P.length - 1; k++) { if (rev) this.i.push(base, base + k + 1, base + k); else this.i.push(base, base + k, base + k + 1); }
  };
  Geo.prototype.box = function (x0, y0, z0, x1, y1, z1, col, o) {   // outward faces (no bottom unless asked)
    o = o || {}; var g = o.glow;
    if (!o.noTop) this.poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], col, UP, g);
    if (o.bottom) this.poly([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], col, DN, g);
    this.poly([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], col, [-1, 0, 0], g); this.poly([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], col, [1, 0, 0], g);
    this.poly([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], col, [0, 0, -1], g); this.poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col, [0, 0, 1], g);
  };
  Geo.prototype.flat = function (x0, z0, x1, z1, y, col, down, glow) { this.poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], col, down ? DN : UP, glow); };
  Geo.prototype.wall = function (ax, az, bx, bz, y0, y1, col, want, holes, r, k) {   // a wall A->B with rectangular holes [u0, u1, v0, v1] (u metres from A, v absolute y)
    var L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, us = [0, L], vs = [y0, y1], i, j; holes = holes || [];
    for (i = 0; i < holes.length; i++) { var h = holes[i]; us.push(clamp(h[0], 0, L), clamp(h[1], 0, L)); vs.push(clamp(h[2], y0, y1), clamp(h[3], y0, y1)); }
    us = uniq(us); vs = uniq(vs);
    for (i = 0; i < us.length - 1; i++) for (j = 0; j < vs.length - 1; j++) { var um = (us[i] + us[i + 1]) / 2, vm = (vs[j] + vs[j + 1]) / 2, out = false;
      for (var q = 0; q < holes.length && !out; q++) out = um > holes[q][0] && um < holes[q][1] && vm > holes[q][2] && vm < holes[q][3];
      if (out) continue; var u0 = us[i], u1 = us[i + 1], v0 = vs[j], v1 = vs[j + 1], cc = r ? jit(col, r, k || 0.05) : col;
      this.poly([[ax + dx * u0, v0, az + dz * u0], [ax + dx * u1, v0, az + dz * u1], [ax + dx * u1, v1, az + dz * u1], [ax + dx * u0, v1, az + dz * u0]], cc, want); }
  };
  function uniq(a) { a.sort(function (x, y) { return x - y; }); var o = []; for (var i = 0; i < a.length; i++) if (!o.length || a[i] - o[o.length - 1] > 1e-4) o.push(a[i]); return o; }
  Geo.prototype.arch = function (ax, az, bx, bz, u0, u1, vs, col, want) {   // the two corners above a hole's springing line, curved: the hole becomes an arch
    var L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, r = (u1 - u0) / 2, cu = (u0 + u1) / 2, n = 8, k, P, A;
    function at(u, v) { return [ax + dx * u, v, az + dz * u]; }
    P = [at(u0, vs + r)]; for (k = 0; k <= n; k++) { A = Math.PI - k / n * Math.PI / 2; P.push(at(cu + Math.cos(A) * r, vs + Math.sin(A) * r)); } this.poly(P, col, want);
    P = [at(u1, vs + r)]; for (k = 0; k <= n; k++) { A = k / n * Math.PI / 2; P.push(at(cu + Math.cos(A) * r, vs + Math.sin(A) * r)); } this.poly(P, col, want);
  };
  Geo.prototype.shell = function (x0, z0, x1, z1, h, c, holes, o) {   // a room seen from inside: floor, ceiling (unless open), four walls facing in
    o = o || {}; holes = holes || {};
    if (c.floor) this.flat(x0, z0, x1, z1, 0, c.floor);
    if (c.ceil && !o.open) this.flat(x0, z0, x1, z1, h, c.ceil, true);
    this.wall(x0, z0, x1, z0, 0, h, c.wall, [0, 0, 1], holes.n, o.r, o.k); this.wall(x0, z1, x1, z1, 0, h, c.wall, [0, 0, -1], holes.s, o.r, o.k);
    this.wall(x0, z0, x0, z1, 0, h, c.wall, [1, 0, 0], holes.w, o.r, o.k); this.wall(x1, z0, x1, z1, 0, h, c.wall, [-1, 0, 0], holes.e, o.r, o.k);
  };
  Geo.prototype.cyl = function (cx, cz, r, y0, y1, n, col, o) {
    o = o || {}; for (var k = 0; k < n; k++) { var a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, am = (a0 + a1) / 2, w = [Math.cos(am), 0, Math.sin(am)];
      if (o.inward) w = [-w[0], 0, -w[2]];
      this.poly([[cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], [cx + Math.cos(a1) * r, y1, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y1, cz + Math.sin(a0) * r]], col, w, o.glow); }
    if (o.cap) { var P = []; for (k = 0; k < n; k++) P.push([cx + Math.cos(k / n * Math.PI * 2) * r, y1, cz + Math.sin(k / n * Math.PI * 2) * r]); this.poly(P, o.capCol || col, UP, o.glow); }
  };
  Geo.prototype.lathe = function (cx, cz, prof, n, col, y0, inward) {   // prof: [[r, y], ...] bottom to top
    for (var j = 0; j < prof.length - 1; j++) for (var k = 0; k < n; k++) { var a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, r0 = prof[j][0], r1 = prof[j + 1][0], h0 = y0 + prof[j][1], h1 = y0 + prof[j + 1][1], am = (a0 + a1) / 2;
      var w = [Math.cos(am) * (inward ? -1 : 1), inward ? -0.3 : 0.3, Math.sin(am) * (inward ? -1 : 1)], P = [[cx + Math.cos(a0) * r0, h0, cz + Math.sin(a0) * r0], [cx + Math.cos(a1) * r0, h0, cz + Math.sin(a1) * r0]];
      if (r1 > 1e-6) P.push([cx + Math.cos(a1) * r1, h1, cz + Math.sin(a1) * r1], [cx + Math.cos(a0) * r1, h1, cz + Math.sin(a0) * r1]); else P.push([cx, h1, cz]);
      if (r0 < 1e-6) P = [[cx, h0, cz], [cx + Math.cos(a1) * r1, h1, cz + Math.sin(a1) * r1], [cx + Math.cos(a0) * r1, h1, cz + Math.sin(a0) * r1]];
      this.poly(P, col, w); }
  };
  Geo.prototype.disc = function (c, r, n, col, U, V, want, glow) { var P = []; for (var k = 0; k < n; k++) { var a = k / n * Math.PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r; P.push([c[0] + U[0] * ca + V[0] * sa, c[1] + U[1] * ca + V[1] * sa, c[2] + U[2] * ca + V[2] * sa]); } this.poly(P, col, want, glow); };
  Geo.prototype.beam = function (p, q, w, col, glow) {   // a square beam between two points (four sides)
    var d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(d[0], d[1], d[2]); if (!(L > 1e-6)) return; d = [d[0] / L, d[1] / L, d[2] / L];
    var t = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = norm(cross(d, t)), v = cross(d, u), h = w / 2, k, s = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    for (k = 0; k < 4; k++) { var a = s[k], b = s[(k + 1) % 4], ca = [u[0] * a[0] * h + v[0] * a[1] * h, u[1] * a[0] * h + v[1] * a[1] * h, u[2] * a[0] * h + v[2] * a[1] * h], cb = [u[0] * b[0] * h + v[0] * b[1] * h, u[1] * b[0] * h + v[1] * b[1] * h, u[2] * b[0] * h + v[2] * b[1] * h];
      var mid = [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2, (ca[2] + cb[2]) / 2];
      this.poly([[p[0] + ca[0], p[1] + ca[1], p[2] + ca[2]], [p[0] + cb[0], p[1] + cb[1], p[2] + cb[2]], [q[0] + cb[0], q[1] + cb[1], q[2] + cb[2]], [q[0] + ca[0], q[1] + ca[1], q[2] + ca[2]]], col, mid, glow); }
  };
  Geo.prototype.bars = function (ax, az, bx, bz, y0, y1, step, w, col) { var L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step)); for (var k = 0; k <= n; k++) { var t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; this.box(x - w / 2, y0, z - w / 2, x + w / 2, y1, z + w / 2, col, { noTop: true }); } };
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function ring4(G, a, b, y, col) {   // the square band between half-sizes a and b
    G.poly([[-b, y, -b], [b, y, -b], [a, y, -a], [-a, y, -a]], col, UP); G.poly([[b, y, -b], [b, y, b], [a, y, a], [a, y, -a]], col, UP);
    G.poly([[b, y, b], [-b, y, b], [-a, y, a], [a, y, a]], col, UP); G.poly([[-b, y, b], [-b, y, -b], [-a, y, -a], [-a, y, a]], col, UP); }
  function square(G, s, fn) { fn(-s, -s, s, -s, [0, 0, 1]); fn(s, -s, s, s, [-1, 0, 0]); fn(s, s, -s, s, [0, 0, -1]); fn(-s, s, -s, -s, [1, 0, 0]); }   // four sides of a square, each with its inward normal
  function parapet(G, s, h, col, capCol) { square(G, s, function (ax, az, bx, bz, w) { G.wall(ax, az, bx, bz, 0, h, col, w); });
    G.box(-s - 0.05, h, -s - 0.05, s + 0.05, h + 0.08, -s + 0.25, capCol); G.box(-s - 0.05, h, s - 0.25, s + 0.05, h + 0.08, s + 0.05, capCol); G.box(-s - 0.05, h, -s + 0.25, -s + 0.25, h + 0.08, s - 0.25, capCol); G.box(s - 0.25, h, -s + 0.25, s + 0.05, h + 0.08, s - 0.25, capCol); }
  function fenceSq(G, s, y0, y1, step, w, col) { square(G, s, function (ax, az, bx, bz) { G.bars(ax, az, bx, bz, y0, y1, step, w, col); }); G.beam([-s, y1, -s], [s, y1, -s], w * 1.6, col); G.beam([s, y1, -s], [s, y1, s], w * 1.6, col); G.beam([s, y1, s], [-s, y1, s], w * 1.6, col); G.beam([-s, y1, s], [-s, y1, -s], w * 1.6, col); }

  /* ---------- the people inside (world-people.js: a place hosted by the room, its roster seeded by the room's id) ---------- */
  function pp(role, title, x, z, yaw, kind, clip, line) { return { role: role, title: title, x: x, z: z, yaw: yaw, kind: kind || 'stand', clip: clip || 'idle', line: line || null }; }

  /* ---------- THE LANDMARKS (DRAFT, Marth's pen; public-record dimensions, simplified; for Izumi to check on a chart). Each room: at [x, z] in the
     landmark's frame (yaw: the building's own axes), y its floor over the ground at the landmark's point, walk/block shapes, spawn [x, z, yaw], links,
     view, cam clamp [x0, z0, x1, z1, yTop], floorAt (a slope), quiet (a tomb: no people, no talk). Doors: [x, z] in the same frame. ---------- */
  var IRON = hx(0x7a5a45), IRON2 = hx(0x5e4434), DARK = hx(0x1a120c), GLOWW = hx(0xffe9b8);
  var DEFS = {
    eiffel: { name: 'the Eiffel Tower', e: '🗼', lat: 48.85837, lon: 2.29448, yaw: Math.PI / 4, door: [31, -31],
      quest: ['Go inside the Eiffel Tower', 'Ride the lift to the summit: all of Paris below you.'],
      rooms: [
        { name: '1st floor, 57 m', y: 57, at: [0, 0], yh: 4, walk: [[-28.6, -28.6, 28.6, 28.6]], block: [[-12.8, -12.8, 12.8, 12.8], [23.6, 23.6, 29.5, 29.5], [-29.5, 23.6, -23.6, 29.5], [23.6, -29.5, 29.5, -23.6], [-29.5, -29.5, -23.6, -23.6], [18.6, -22.9, 22.9, -18.6], [-12.4, 19.6, 12.4, 27.4], [19.6, -12.4, 27.4, 12.4]],
          spawn: [16.6, -16.6, -Math.PI * 0.75], cam: [-28.2, -28.2, 28.2, 28.2, 22], links: [{ at: [17.7, -20.9], to: 1, label: '🛗 To the summit' }, { at: [20.9, -17.7], to: 'out', label: '🚪 Down and out' }],
          lines: ['Look down through the glass floor, if you dare!', 'Gustave Eiffel kept a little office at the very top.', 'On a clear day you can see for 70 km.'],
          people: [pp('local', 'visiting the tower', 26, 4, -Math.PI / 2), pp('local', 'visiting the tower', 25.6, 7, -Math.PI / 2, 'stand', 'wave'), pp('local', 'visiting the tower', -4, 26.5, 0), pp('local', 'visiting the tower', 14.6, 2, -Math.PI / 2, 'stand', 'interact'), pp('local', 'a tower guide', 15.5, -9, -Math.PI / 2, 'stand', 'wave', 'Welcome to the 1st floor! The summit lift is just behind you.')],
          build: function (G) {
            var BOARD = hx(0x9a8a74), GLASS = hx(0x9fc6d9), PAV = hx(0xcfd6da), s, k;
            ring4(G, 16.5, 29, 0, BOARD); ring4(G, 12.9, 16.5, 0.01, GLASS);
            fenceSq(G, 12.9, 0, 1.1, 0.55, 0.05, IRON2);
            parapet(G, 29, 1.15, IRON, IRON2); fenceSq(G, 28.9, 1.15, 2.7, 0.4, 0.04, IRON2);
            [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) { var x0 = c[0] > 0 ? 23.8 : -29.3, z0 = c[1] > 0 ? 23.8 : -29.3; G.box(x0, -8, z0, x0 + 5.5, 9, z0 + 5.5, IRON);
              G.beam([c[0] * 23.8, 0, c[1] * 26.5], [c[0] * 23.8, 9, c[1] * 23.8], 0.25, IRON2); G.beam([c[0] * 26.5, 9, c[1] * 23.8], [c[0] * 23.8, 0, c[1] * 23.8], 0.25, IRON2);
              G.beam([c[0] * 26.5, 9, c[1] * 26.5], [c[0] * 11, 58, c[1] * 11], 3.2, IRON); G.beam([c[0] * 25, 9, c[1] * 28], [c[0] * 10, 58, c[1] * 12], 0.6, IRON2); });
            for (k = 0; k < 4; k++) { var y = 18 + k * 10, a = 26.5 - (k + 1) * 3.2 + 1.6; G.beam([-a, y, -a], [a, y, -a], 0.7, IRON2); G.beam([a, y, -a], [a, y, a], 0.7, IRON2); G.beam([a, y, a], [-a, y, a], 0.7, IRON2); G.beam([-a, y, a], [-a, y, -a], 0.7, IRON2); }
            G.box(-12, 0, 20, 12, 4.2, 27, PAV); G.box(20, 0, -12, 27, 4.2, 12, PAV);
            for (s = -11; s <= 11; s += 2) { G.box(s - 0.06, 0, 19.94, s + 0.06, 4.2, 20.0, IRON2); G.box(19.94, 0, s - 0.06, 20.0, 4.2, s + 0.06, IRON2); }
            G.box(-12, 4.2, 19.8, 12, 4.5, 27.2, IRON2); G.box(19.8, 4.2, -12, 27.2, 4.5, 12, IRON2);
            G.box(19, 0, -22.5, 22.5, 2.6, -19, IRON); G.box(18.96, 0.05, -21.6, 19.0, 2.2, -19.8, hx(0xb9a27c)); G.box(19.8, 0.05, -19.04, 21.6, 2.2, -19.0, hx(0xb9a27c));
            G.box(19.3, 2.3, -19.06, 20.1, 2.45, -19.0, GLOWW, { glow: true }); G.box(18.94, 2.3, -20.1, 19.0, 2.45, -19.3, GLOWW, { glow: true }); } },
        { name: 'the summit, 276 m', y: 276, at: [0, 0], yh: 3, walk: [[-7.2, -7.2, 7.2, 7.2]], block: [[-3.25, -2.75, 3.25, 2.75], [4.2, -7.6, 7.6, -4.2]],
          spawn: [1.9, -4.6, -Math.PI / 2], cam: [-7.0, -7.0, 7.0, 7.0, 9], links: [{ at: [3.6, -5.8], to: 0, label: '🛗 Down to the 1st floor' }], view: { at: [-3.5, -6.1], name: 'Paris: the Seine and the Trocadéro' },
          lines: ['Two hundred and seventy-six metres. Hold on to your feathers!', 'That is the Seine, and the Trocadéro across it.'],
          people: [pp('local', 'at the top', -6.4, 1, Math.PI / 2), pp('local', 'at the top', 0.5, 6.4, 0, 'stand', 'wave'), pp('local', 'at the top', 6.3, 3, -Math.PI / 2, 'stand', 'interact')],
          build: function (G) {
            var DECK = hx(0x8d8a84), CREAM = hx(0xe9dfc8), k;
            G.flat(-7.6, -7.6, 7.6, 7.6, 0, DECK); parapet(G, 7.6, 1.1, IRON, IRON2); fenceSq(G, 7.5, 1.1, 3.2, 0.3, 0.035, IRON2);
            G.box(-3, 0, -2.5, 3, 2.8, 2.5, CREAM); G.box(-3.2, 2.8, -2.7, 3.2, 3.05, 2.7, hx(0x6b5a4a));
            for (k = -2; k <= 2; k += 2) { G.box(k - 0.45, 0.9, -2.53, k + 0.45, 2.0, -2.5, GLOWW, { glow: true }); G.box(k - 0.45, 0.9, 2.5, k + 0.45, 2.0, 2.53, GLOWW, { glow: true }); }
            G.box(-3.03, 0, -0.55, -3.0, 2.1, 0.55, hx(0x5a3a26));
            for (k = 0; k < 8; k++) G.cyl(0, 0, 0.55 - k * 0.03, 3.05 + k * 2.4, 5.45 + k * 2.4, 10, k % 2 ? hx(0xd8d8d8) : hx(0xb8342c));
            G.box(4.4, 0, -7.2, 7.2, 2.6, -4.4, IRON); G.box(4.36, 0.05, -6.6, 4.4, 2.2, -5.0, hx(0xb9a27c)); G.box(4.34, 2.3, -6.2, 4.4, 2.45, -5.4, GLOWW, { glow: true });
            G.poly([[-4.3, 0.95, -6.9], [-2.7, 0.95, -6.9], [-2.7, 1.15, -6.4], [-4.3, 1.15, -6.4]], hx(0x6e6a60), UP); G.box(-3.7, 0, -6.8, -3.3, 0.95, -6.5, IRON2); } }
      ] },
    empire: { name: 'the Empire State Building', e: '🏙️', lat: 40.74844, lon: -73.98566, yaw: -29 * Math.PI / 180, door: [0, -31],
      quest: ['Go up to the 86th floor', 'The open-air deck, 320 m over New York.'],
      rooms: [
        { name: 'the lobby', y: 0, at: [0, 0], yh: 8, walk: [[-13.6, -4.6, 13.6, 4.6]], block: [[6.8, -1.2, 10.2, 0.6], [-13.7, -3.2, -13.0, 3.2]],
          spawn: [0, -2.0, 0], cam: [-12.9, -3.9, 12.9, 3.9, 7.9], links: [{ at: [2, 3.6], to: 1, label: '🛗 Up to the 86th floor' }, { at: [0, -3.7], to: 'out', label: '🚪 Out to 34th Street' }],
          lines: ['The lobby ceiling is real gold and aluminium leaf.', 'It took just 410 days to build. Can you believe it?', 'The observatory lifts are on your left.'],
          people: [pp('local', 'at the security desk', 8.5, 1.4, Math.PI), pp('local', 'visiting', -6, 1.5, -Math.PI / 2, 'stand', 'interact'), pp('local', 'visiting', -9.5, -2.5, -Math.PI / 2), pp('local', 'visiting', 4.5, 3.0, 0, 'stand', 'wave')],
          build: function (G) {
            var MARB = hx(0xa07850), PIL = hx(0x6e4f33), GOLD = hx(0xc8a050), TERR = hx(0xc9bba3), BRONZE = hx(0x8a6235), k;
            G.shell(-14, -5, 14, 5, 9, { floor: TERR, wall: MARB, ceil: GOLD });
            G.flat(-14, -5, 14, -4.4, 0.01, hx(0x6e5a44)); G.flat(-14, 4.4, 14, 5, 0.01, hx(0x6e5a44));
            for (k = -12; k <= 12; k += 3.5) { G.box(k - 0.25, 0, -5, k + 0.25, 9, -4.7, PIL); G.box(k - 0.25, 0, 4.7, k + 0.25, 9, 5, PIL); G.box(k - 0.12, 8.6, -5, k + 0.12, 8.98, 5, hx(0x8a6a2a)); }
            G.box(-13.98, 1.2, -3.2, -13.9, 7.4, 3.2, hx(0x3a2a20));
            var SIL = hx(0xd9c9a0), st0 = [[1.8, 0, 1.6], [1.25, 1.6, 2.8], [0.85, 2.8, 4.0], [0.5, 4.0, 4.7], [0.22, 4.7, 5.2], [0.05, 5.2, 5.9]];
            st0.forEach(function (q) { G.box(-13.9, 1.3 + q[1], -q[0], -13.82, 1.3 + q[2], q[0], SIL); });
            for (k = 0; k < 9; k++) { var a = (k - 4) * 0.28; G.beam([-13.86, 7.2, 0], [-13.86, 7.2 + Math.cos(a) * 0.01 - 0.0, Math.sin(a) * 2.6], 0.05, SIL); }
            for (k = -6; k <= 6; k += 4) { G.box(k - 0.65, 0, 4.92, k + 0.65, 2.4, 5, BRONZE); G.box(k - 0.03, 0, 4.9, k + 0.03, 2.4, 4.92, DARK); G.box(k - 0.3, 2.55, 4.92, k + 0.3, 2.75, 5, GLOWW, { glow: true }); }
            G.box(-1.6, 0, -5, 1.6, 3.2, -4.86, BRONZE); G.box(-1.3, 0.1, -4.87, 1.3, 2.9, -4.84, hx(0x4a5a64));
            G.box(7, 0, -1, 10, 1.1, 0.4, hx(0x4a3628)); G.box(6.9, 1.1, -1.1, 10.1, 1.18, 0.5, hx(0x2c2018)); } },
        { name: 'the 86th floor, 320 m', y: 320, at: [0, 0], yh: 3, walk: [[-12.2, -8.2, 12.2, 8.2]], block: [[-9.2, -5.2, 9.2, 5.2], [11.2, 7.2, 12.4, 8.4], [-12.4, 7.2, -11.2, 8.4], [11.2, -8.4, 12.4, -7.2], [-12.4, -8.4, -11.2, -7.2]],
          spawn: [2.2, -6.6, -Math.PI / 2], cam: [-12.2, -8.2, 12.2, 8.2, 10], links: [{ at: [0, -5.8], to: 0, label: '🛗 Down to the lobby' }], view: { at: [0, 7.4], name: 'Downtown Manhattan' },
          lines: ['Central Park is that way, the green rectangle.', 'The fence curves in so nobody can climb it.', 'Hold my hand, it is windy up here!'],
          people: [pp('local', 'on the deck', -10, -7.2, Math.PI), pp('local', 'on the deck', 6, 7.4, 0, 'stand', 'wave'), pp('local', 'on the deck', 11.4, 0, Math.PI / 2, 'stand', 'interact'), pp('local', 'on the deck', -11.4, 3, -Math.PI / 2)],
          build: function (G) {
            var LIME = hx(0xbdb19c), DECK = hx(0x8f8a80), k;
            G.flat(-12.6, -8.6, 12.6, 8.6, 0, DECK);
            G.box(-9, 0, -5, 9, 3.6, 5, LIME); G.box(-9.2, 3.6, -5.2, 9.2, 3.9, 5.2, hx(0x9a8f7c));
            for (k = -7.5; k <= 7.5; k += 2.5) { if (Math.abs(k) > 0.5) { G.box(k - 0.5, 1.0, -5.03, k + 0.5, 2.6, -5.0, GLOWW, { glow: true }); } G.box(k - 0.5, 1.0, 5.0, k + 0.5, 2.6, 5.03, GLOWW, { glow: true }); }
            G.box(-0.8, 0, -5.06, 0.8, 2.5, -5.0, hx(0x8a6235));
            G.box(-6, 3.9, -3.5, 6, 30, 3.5, LIME); G.box(-4, 30, -2.5, 4, 42, 2.5, LIME); G.cyl(0, 0, 1.6, 42, 58, 10, hx(0xc9c4b6)); G.cyl(0, 0, 0.5, 58, 75, 8, hx(0x9a9a9a));
            parapet(G, 12.6, 1.3, LIME, hx(0xa59a86));
            square(G, 12.55, function (ax, az, bx, bz, w) { var L = Math.hypot(bx - ax, bz - az), n = Math.round(L / 0.4); for (var i = 0; i <= n; i++) { var t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
              G.beam([x, 1.3, z], [x, 3.1, z], 0.04, hx(0x3a3a3a)); G.beam([x, 3.1, z], [x + w[0] * 0.55, 3.6, z + w[2] * 0.55], 0.04, hx(0x3a3a3a)); } });
            [[11.8, 7.8], [-11.8, 7.8], [11.8, -7.8], [-11.8, -7.8]].forEach(function (q) { G.box(q[0] - 0.08, 0, q[1] - 0.08, q[0] + 0.08, 1.2, q[1] + 0.08, hx(0x2f4a3a)); G.box(q[0] - 0.22, 1.2, q[1] - 0.18, q[0] + 0.22, 1.5, q[1] + 0.18, hx(0x2f4a3a)); }); } }
      ] },
    liberty: { name: 'the Statue of Liberty', e: '🗽', lat: 40.68925, lon: -74.0445, yaw: 50 * Math.PI / 180, door: [0, -17],
      quest: ['Climb to Liberty\'s crown', 'Through the pedestal, up the spiral stairs, to the crown\'s windows.'],
      rooms: [
        { name: 'the pedestal', y: 38, at: [0, 0], yh: 4.5, walk: [[-8.8, -8.8, 8.8, 8.8]], block: [{ c: [0, 0], r: 1.25 }, [-6.2, -6.2, -1.0, -5.8], [1.0, -6.2, 6.2, -5.8], [-6.2, 5.8, -1.0, 6.2], [1.0, 5.8, 6.2, 6.2], [-6.2, -6.2, -5.8, -1.0], [-6.2, 1.0, -5.8, 6.2], [5.8, -6.2, 6.2, -1.0], [5.8, 1.0, 6.2, 6.2], [-2.15, -2.15, -1.65, -1.65], [1.65, -2.15, 2.15, -1.65], [-2.15, 1.65, -1.65, 2.15], [1.65, 1.65, 2.15, 2.15]],
          spawn: [0, -3.6, 0], cam: [-8.6, -8.6, 8.6, 8.6, 6], links: [{ at: [0, -1.8], to: 1, label: '🌀 Up the spiral stairs' }, { at: [-4.8, -4.8], to: 'out', label: '🚪 Down to the island' }], view: { at: [0, 8.2], name: 'New York Harbor' },
          lines: ['Gustave Eiffel built her iron skeleton. The same Eiffel!', 'Her copper skin is thinner than two pennies.', '162 steps to the crown. Good thing you can fly.'],
          people: [pp('local', 'a park ranger', -3.5, -3.5, Math.PI / 4, 'stand', 'wave', 'Welcome to Liberty Island! The stairs to the crown start under the pylon.'), pp('local', 'visiting', 7.8, 3, -Math.PI / 2), pp('local', 'visiting', -7.6, -2, Math.PI / 2, 'stand', 'interact')],
          build: function (G, r) {
            var GRAN = hx(0x9a8e80), COP = hx(0x6b5236), PAT = hx(0x4f7a68), k;
            G.flat(-6, -6, 6, 6, 0, hx(0x8c8274));
            var hole = [[5, 7, 0, 3.0]]; G.wall(-6, -6, 6, -6, 0, 4.8, GRAN, [0, 0, 1], hole); G.wall(-6, 6, 6, 6, 0, 4.8, GRAN, [0, 0, -1], hole); G.wall(-6, -6, -6, 6, 0, 4.8, GRAN, [1, 0, 0], hole); G.wall(6, -6, 6, 6, 0, 4.8, GRAN, [-1, 0, 0], hole);
            G.flat(-6, -6, 6, -2.5, 4.8, GRAN, true); G.flat(-6, 2.5, 6, 6, 4.8, GRAN, true); G.flat(-6, -2.5, -2.5, 2.5, 4.8, GRAN, true); G.flat(2.5, -2.5, 6, 2.5, 4.8, GRAN, true);
            G.wall(-2.5, -2.5, 2.5, -2.5, 4.8, 40, COP, [0, 0, 1], null, r, 0.12); G.wall(-2.5, 2.5, 2.5, 2.5, 4.8, 40, COP, [0, 0, -1], null, r, 0.12); G.wall(-2.5, -2.5, -2.5, 2.5, 4.8, 40, COP, [1, 0, 0], null, r, 0.12); G.wall(2.5, -2.5, 2.5, 2.5, 4.8, 40, COP, [-1, 0, 0], null, r, 0.12);
            for (k = 0; k < 9; k++) { var y = 7 + k * 3.6; G.box(-2.49, y, -2.49, -2.3, y + 1.8, 2.49, PAT); }
            [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]].forEach(function (q) { G.box(q[0] - 0.16, 0, q[1] - 0.16, q[0] + 0.16, 40, q[1] + 0.16, hx(0x2e2e30)); });
            for (k = 0; k < 6; k++) { var yb = 6 + k * 6; G.beam([-1.9, yb, -1.9], [1.9, yb + 6, -1.9], 0.1, hx(0x2e2e30)); G.beam([1.9, yb, 1.9], [-1.9, yb + 6, 1.9], 0.1, hx(0x2e2e30)); G.beam([-1.9, yb, 1.9], [-1.9, yb + 6, -1.9], 0.1, hx(0x2e2e30)); G.beam([1.9, yb, -1.9], [1.9, yb + 6, 1.9], 0.1, hx(0x2e2e30)); }
            for (k = 0; k < 190; k++) { var a = k / 14 * Math.PI * 2 + (k % 2 ? Math.PI : 0), yy = 0.2 + k * 0.2, cx = Math.cos(a) * 0.75, cz = Math.sin(a) * 0.75; G.box(cx - 0.3, yy - 0.05, cz - 0.3, cx + 0.3, yy, cz + 0.3, hx(0x7c7c80)); }
            G.cyl(0, 0, 0.12, 0, 38, 6, hx(0x3a3a3c));
            G.flat(-9.2, -9.2, 9.2, -6, 0, hx(0x8c8274)); G.flat(-9.2, 6, 9.2, 9.2, 0, hx(0x8c8274)); G.flat(-9.2, -6, -6, 6, 0, hx(0x8c8274)); G.flat(6, -6, 9.2, 6, 0, hx(0x8c8274));
            parapet(G, 9.2, 1.1, GRAN, hx(0x857a6c));
            G.box(-5.3, 0, -5.3, -4.3, 2.4, -5.25, hx(0x8a6235)); } },
        { name: 'the crown, 77 m', y: 77, at: [0, 0], yh: 3, walk: [[-3.6, -1.8, 3.6, 1.8]], block: [], spawn: [-1.4, -0.9, 0], cam: [-2.9, -1.1, 2.9, 1.1, 1.9],
          links: [{ at: [-3.0, -1.5], to: 0, label: '🌀 Back down the stairs' }], view: { at: [0, 1.4], r: 1.3, name: 'the harbour through the 25 windows' }, lines: ['Twenty-five windows. One for every gemstone on Earth, they say.'],
          people: [pp('local', 'in the crown', 2.6, 0.6, 0, 'stand', 'interact')],
          build: function (G, r) {
            var COP = hx(0x5e4630), k, wins = []; for (k = 0; k < 25; k++) { var x0 = -3.6 + k * 0.3 + 0.04; wins.push([x0 + 0.4, x0 + 0.62, 1.3, 1.78]); }
            G.flat(-4, -2.2, 4, 2.2, 0, hx(0x4a4a48)); G.flat(-4, -2.2, 4, 2.2, 3.0, COP, true);
            G.wall(-4, 2.2, 4, 2.2, 0, 3.0, COP, [0, 0, -1], wins, r, 0.08); G.wall(-4, -2.2, 4, -2.2, 0, 3.0, COP, [0, 0, 1], null, r, 0.1); G.wall(-4, -2.2, -4, 2.2, 0, 3.0, COP, [1, 0, 0], null, r, 0.1); G.wall(4, -2.2, 4, 2.2, 0, 3.0, COP, [-1, 0, 0], null, r, 0.1);
            for (k = -3.2; k <= 3.2; k += 0.8) { G.beam([k, 0, -2.15], [k, 3, -2.15], 0.06, hx(0x2e2e30)); }
            G.beam([-3.95, 1.0, -2.15], [3.95, 1.0, -2.15], 0.06, hx(0x2e2e30)); G.beam([-3.95, 2.2, 2.15], [3.95, 2.2, 2.15], 0.06, hx(0x2e2e30)); G.beam([-3.95, 1.1, 2.15], [3.95, 1.1, 2.15], 0.06, hx(0x2e2e30));
            G.flat(-3.7, -2.1, -2.5, -1.0, 0.01, DARK); G.bars(-3.7, -0.95, -2.5, -0.95, 0, 0.9, 0.3, 0.04, hx(0x2e2e30)); } }
      ] },
    bigben: { name: 'Big Ben', e: '🕰️', lat: 51.50073, lon: -0.12463, yaw: 0, door: [-7.5, 0],
      quest: ['Climb the Elizabeth Tower', 'Behind the four clock faces, then up to the Great Bell.'],
      rooms: [
        { name: 'behind the clock faces, 52 m', y: 52, at: [0, 0], yh: 8, walk: [[-5.1, -5.1, 5.1, 5.1]], block: [[-1.8, -0.8, 1.8, 0.8], { c: [-4.4, 4.4], r: 1.0 }],
          spawn: [-2.6, -2.6, Math.PI / 4], cam: [-4.4, -4.4, 4.4, 4.4, 7.3], links: [{ at: [-3.0, 3.4], to: 1, label: '🪜 Up to the belfry' }, { at: [-4.2, -4.2], to: 'out', label: '🚪 Down the 334 steps' }],
          lines: ['Old pennies on the pendulum keep the clock right. Truly!', 'Each dial is seven metres across.'],
          people: [pp('local', 'a tower guide', 3.2, -3.4, -Math.PI / 4, 'stand', 'wave', 'Mind the drive rods! Each one turns a pair of hands.')],
          build: function (G, r, ctx) {
            var STONE = hx(0x8a8070), OPAL = hx(0xfff0c4), IR = hx(0x2b2b2b), k, clock = ctx.clock(), mA = (clock % 112.5) / 112.5 * Math.PI * 2, hA = (clock % 1350) / 1350 * Math.PI * 2;
            G.shell(-5.5, -5.5, 5.5, 5.5, 8.4, { floor: hx(0x6e665c), wall: STONE, ceil: hx(0x5a5248) }, null, { r: r, k: 0.04 });
            [[[0, 4.2, -5.47], [1, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, 4.2, 5.47], [1, 0, 0], [0, 1, 0], [0, 0, -1]], [[-5.47, 4.2, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0]], [[5.47, 4.2, 0], [0, 0, 1], [0, 1, 0], [-1, 0, 0]]].forEach(function (d) {
              var c = d[0], U = d[1], V = d[2], N = d[3], off = function (p, o) { return [p[0] + N[0] * o, p[1] + N[1] * o, p[2] + N[2] * o]; };
              G.disc(c, 3.3, 40, OPAL, U, V, N, true);
              for (k = 0; k < 12; k++) { var a = k / 12 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); G.beam(off([c[0] + U[0] * ca * 0.4 + V[0] * sa * 0.4, c[1] + U[1] * ca * 0.4 + V[1] * sa * 0.4, c[2] + U[2] * ca * 0.4 + V[2] * sa * 0.4], 0.05), off([c[0] + U[0] * ca * 3.3 + V[0] * sa * 3.3, c[1] + U[1] * ca * 3.3 + V[1] * sa * 3.3, c[2] + U[2] * ca * 3.3 + V[2] * sa * 3.3], 0.05), 0.06, IR); }
              [2.5, 3.28].forEach(function (rr) { for (k = 0; k < 24; k++) { var a0 = k / 24 * Math.PI * 2, a1 = (k + 1) / 24 * Math.PI * 2; G.beam(off([c[0] + (U[0] * Math.cos(a0) + V[0] * Math.sin(a0)) * rr, c[1] + (U[1] * Math.cos(a0) + V[1] * Math.sin(a0)) * rr, c[2] + (U[2] * Math.cos(a0) + V[2] * Math.sin(a0)) * rr], 0.05), off([c[0] + (U[0] * Math.cos(a1) + V[0] * Math.sin(a1)) * rr, c[1] + (U[1] * Math.cos(a1) + V[1] * Math.sin(a1)) * rr, c[2] + (U[2] * Math.cos(a1) + V[2] * Math.sin(a1)) * rr], 0.05), 0.07, IR); } });
              [[mA, 3.0, 0.1], [hA, 2.1, 0.14]].forEach(function (h) { var e = [c[0] + (U[0] * Math.sin(h[0]) + V[0] * Math.cos(h[0])) * h[1], c[1] + (U[1] * Math.sin(h[0]) + V[1] * Math.cos(h[0])) * h[1], c[2] + (U[2] * Math.sin(h[0]) + V[2] * Math.cos(h[0])) * h[1]]; G.beam(off(c, 0.1), off(e, 0.1), h[2], hx(0x141414)); });
              G.beam([0, 1.45, 0], off(c, 0.15), 0.06, IR); });
            G.box(-1.6, 0, -0.6, 1.6, 1.4, 0.6, hx(0x2f5a3c)); for (k = -1.2; k <= 1.2; k += 0.8) G.cyl(k, 0, 0.32, 1.4, 1.48, 12, hx(0xb08d3a), { cap: true });
            G.beam([0, 1.4, 0], [0, -4, 0], 0.12, hx(0x6a5a3a)); G.cyl(0, 0, 0.35, 0.02, 0.12, 12, hx(0x6a5a3a), { cap: true });
            for (k = 0; k < 24; k++) { var a = k / 8 * Math.PI * 2, cx = -4.4 + Math.cos(a) * 0.55, cz = 4.4 + Math.sin(a) * 0.55, y = k * 0.33; G.box(cx - 0.32, y, cz - 0.32, cx + 0.32, y + 0.08, cz + 0.32, hx(0x5a5248)); }
            G.flat(-5.0, -5.0, -3.6, -3.6, 0.01, DARK); G.bars(-3.55, -5.0, -3.55, -3.55, 0, 0.9, 0.35, 0.04, IR); G.box(4.6, 6.8, -0.4, 5.3, 7.1, 0.4, GLOWW, { glow: true }); } },
        { name: 'the belfry, 61 m', y: 61, at: [0, 0], yh: 9, walk: [[-5.1, -5.1, 5.1, 5.1]], block: [{ c: [0, 0], r: 1.7 }, [-2.7, -0.3, -2.1, 0.3], [2.1, -0.3, 2.7, 0.3], { c: [3.6, 3.6], r: 1.0 }, { c: [-3.6, 3.6], r: 1.0 }, { c: [3.6, -3.6], r: 1.0 }, { c: [-3.6, -3.6], r: 1.0 }],
          spawn: [-3.4, 0, Math.PI / 2], cam: [-4.4, -4.4, 4.4, 4.4, 7.9], links: [{ at: [-4.5, 1.5], to: 0, label: '🪜 Down to the clock room' }], view: { at: [4.4, 0], name: 'the Thames and the London Eye' },
          lines: ['That is Big Ben himself: thirteen and a half tonnes.'], people: [],
          build: function (G) {
            var STONE = hx(0x9a907e), BR = hx(0x5b4a33), OAK = hx(0x6b4a2c), k;
            G.flat(-5.5, -5.5, 5.5, 5.5, 0, hx(0x7a7264)); G.flat(-5.5, -5.5, 5.5, 5.5, 9, hx(0x6a6256), true);
            var arches = [[0.65, 2.65, 1.0, 5.0], [4.5, 6.5, 1.0, 5.0], [8.35, 10.35, 1.0, 5.0]];
            square(G, 5.5, function (ax, az, bx, bz, w) { G.wall(ax, az, bx, bz, 0, 9, STONE, w, arches.map(function (h) { return [h[0], h[1], h[2], h[3] + 1.0]; })); arches.forEach(function (h) { G.arch(ax, az, bx, bz, h[0], h[1], h[3], STONE, w); }); });
            var prof = [[1.37, 0], [1.32, 0.25], [1.08, 0.95], [0.92, 1.7], [0.86, 2.2], [0.62, 2.55], [0.25, 2.7], [0.0, 2.72]];
            G.lathe(0, 0, prof, 24, BR, 1.4); G.disc([0, 1.42, 0], 1.3, 24, hx(0x1e1912), [1, 0, 0], [0, 0, 1], DN); G.beam([0, 4.12, 0], [0, 1.9, 0], 0.12, hx(0x3a3024)); G.cyl(0, 0, 0.16, 1.7, 1.95, 8, hx(0x3a3024), { cap: true });
            G.box(-2.7, 0, -0.3, -2.1, 4.8, 0.3, OAK); G.box(2.1, 0, -0.3, 2.7, 4.8, 0.3, OAK); G.box(-2.7, 4.2, -0.35, 2.7, 4.8, 0.35, OAK); G.beam([0, 4.2, 0], [0, 4.12, 0], 0.3, hx(0x3a3024));
            [[3.6, 3.6], [-3.6, 3.6], [3.6, -3.6], [-3.6, -3.6]].forEach(function (q) { G.lathe(q[0], q[1], prof.map(function (p) { return [p[0] * 0.55, p[1] * 0.55]; }), 16, BR, 2.4);
              G.box(q[0] - 0.9, 4.0, q[1] - 0.12, q[0] + 0.9, 4.25, q[1] + 0.12, OAK); G.box(q[0] - 0.9, 0, q[1] - 0.12, q[0] - 0.75, 4.0, q[1] + 0.12, OAK); G.box(q[0] + 0.75, 0, q[1] - 0.12, q[0] + 0.9, 4.0, q[1] + 0.12, OAK); G.beam([q[0], 4.0, q[1]], [q[0], 3.89, q[1]], 0.12, hx(0x3a3024)); });
            G.flat(-5.3, 1.0, -3.9, 2.2, 0.01, DARK); } }
      ] },
    giza: { name: 'the Great Pyramid', e: '🔺', lat: 29.97917, lon: 31.13417, yaw: 0, door: [0, -117],
      quest: ['Enter the Great Pyramid', 'Up the Grand Gallery to the King\'s Chamber.'],
      rooms: [
        { name: 'the Grand Gallery', y: 21, at: [0, 0], yh: 9, walk: [[-0.42, -22.6, 0.42, 22.7]], block: [], spawn: [0, -20.4, 0], cam: [-0.02, -22.2, 0.02, 22.4, 99], camLow: 1.3, camHigh: 7.3,
          floorAt: function (x, z) { var s = Math.tan(26.3 * Math.PI / 180); return (Math.min(z, 21.6) + 23) * s + (Math.abs(x) > 0.52 ? 0.6 : 0); },
          links: [{ at: [0, 22.4], to: 1, label: '⬛ Through to the King\'s Chamber' }, { at: [0, -22.4], to: 'out', label: '🚪 Back down and out' }],
          lines: ['Mind your head at the top: the passage is low.', 'The walls step in seven times. Nobody knows quite why.'],
          people: [pp('local', 'visiting', 0.78, -6, 0), pp('local', 'visiting', -0.78, 9, Math.PI, 'stand', 'wave')],
          build: function (G) {
            var s = Math.tan(26.3 * Math.PI / 180), LIME = hx(0xc8b48a), FL = hx(0xb9a47c), WOOD = hx(0x8a6a45), N = 23, k, j;
            function F(z) { return (Math.min(z, 21.6) + 23) * s; }
            for (k = 0; k < N; k++) { var za = -23 + k * 2, zb = za + 2, ya = F(za), yb = F(zb), sd;
              G.poly([[-0.52, ya, za], [0.52, ya, za], [0.52, yb, zb], [-0.52, yb, zb]], FL, UP);
              for (sd = -1; sd <= 1; sd += 2) { var xi = sd * 0.52, xo = sd * 1.03;
                G.poly([[xi, ya + 0.6, za], [xo, ya + 0.6, za], [xo, yb + 0.6, zb], [xi, yb + 0.6, zb]], LIME, UP);
                G.poly([[xi, ya, za], [xi, yb, zb], [xi, yb + 0.6, zb], [xi, ya + 0.6, za]], LIME, [-sd, 0, 0]);
                G.poly([[xo, ya + 0.6, za], [xo, yb + 0.6, zb], [xo, yb + 2.9, zb], [xo, ya + 2.9, za]], LIME, [-sd, 0, 0]);
                for (j = 0; j < 7; j++) { var x0 = sd * (1.03 - 0.076 * j), x1 = sd * (1.03 - 0.076 * (j + 1)), v0 = 2.9 + 0.82 * j, v1 = v0 + 0.82, cc = j % 2 ? LIME : hx(0xbfa982);
                  G.poly([[x0, ya + v0, za], [x1, ya + v0, za], [x1, yb + v0, zb], [x0, yb + v0, zb]], hx(0x9a8866), DN);
                  G.poly([[x1, ya + v0, za], [x1, yb + v0, zb], [x1, yb + v1, zb], [x1, ya + v1, za]], cc, [-sd, 0, 0]); }
                if (k % 2 === 0) G.poly([[sd * 0.62, ya + 0.61, za + 0.6], [sd * 0.9, ya + 0.61, za + 0.6], [sd * 0.9, ya + 0.61 + 0.15, za + 0.9], [sd * 0.62, ya + 0.61 + 0.15, za + 0.9]], hx(0x4a3e2c), UP);
                if (k % 3 === 1) G.box(sd * 0.53 - 0.04, ya + 0.3, za + 0.9, sd * 0.53 + 0.04, ya + 0.48, za + 1.1, GLOWW, { glow: true }); }
              G.poly([[-0.5, ya + 8.64, za], [0.5, ya + 8.64, za], [0.5, yb + 8.64, zb], [-0.5, yb + 8.64, zb]], hx(0xae9a76), DN);
              G.poly([[-0.4, ya + 0.04, za], [0.4, ya + 0.04, za], [0.4, yb + 0.04, zb], [-0.4, yb + 0.04, zb]], WOOD, UP);
              for (j = 0; j < 4; j++) { var zc = za + j * 0.5 + 0.2, yc = F(zc) + 0.04; G.box(-0.4, yc, zc - 0.03, 0.4, yc + 0.05, zc + 0.03, hx(0x6a4e30)); }
              G.beam([-0.48, ya + 0.95, za], [-0.48, yb + 0.95, zb], 0.05, hx(0x5a4630)); G.beam([0.48, ya + 0.95, za], [0.48, yb + 0.95, zb], 0.05, hx(0x5a4630)); }
            var yt = F(23), y0 = F(-23);
            G.poly([[-1.03, y0, -23], [1.03, y0, -23], [1.03, y0 + 8.64, -23], [-1.03, y0 + 8.64, -23]], LIME, [0, 0, 1]); G.poly([[-0.52, y0 + 0.01, -22.98], [0.52, y0 + 0.01, -22.98], [0.52, y0 + 1.15, -22.98], [-0.52, y0 + 1.15, -22.98]], DARK, [0, 0, 1]);
            G.flat(-1.03, 21.6, 1.03, 23, yt, FL); G.poly([[-1.03, yt, 23], [1.03, yt, 23], [1.03, yt + 8.64, 23], [-1.03, yt + 8.64, 23]], LIME, [0, 0, -1]); G.poly([[-0.52, yt + 0.01, 22.98], [0.52, yt + 0.01, 22.98], [0.52, yt + 1.1, 22.98], [-0.52, yt + 1.1, 22.98]], DARK, [0, 0, -1]); } },
        { name: 'the King\'s Chamber', y: 43, at: [0, 22], yh: 5.8, quiet: true, walk: [[-4.9, -2.3, 4.9, 2.3]], block: [[-4.6, -1.3, -3.25, 1.3]], spawn: [2.8, -1.0, -Math.PI / 2], cam: [-4.14, -1.52, 4.14, 1.52, 4.74],
          links: [{ at: [4.45, -2.2], to: 0, label: '⬛ Back through the passage' }], view: { at: [-2.6, 0], r: 1.6, name: 'the granite coffer' }, hush: 'The King\'s Chamber. It is a tomb: quiet here.',
          build: function (G, r) {
            var GR = hx(0x7d3f33), GR2 = hx(0x6e3a30), k, j, x;
            G.yh = 5.8; G.flat(-5.24, -2.62, 5.24, 2.62, 0, GR2);
            for (k = 0; k < 9; k++) G.flat(-5.24 + k * 10.48 / 9, -2.62, -5.24 + (k + 1) * 10.48 / 9, 2.62, 5.84, jit(GR, r, 0.08), true);
            for (j = 0; j < 5; j++) { var v0 = j * 1.168, v1 = v0 + 1.168;
              for (x = -5.24; x < 5.23;) { var L = Math.min(5.24 - x, 1.2 + r() * 1.5); G.poly([[x, v0, -2.62], [x + L, v0, -2.62], [x + L, v1, -2.62], [x, v1, -2.62]], jit(GR, r, 0.09), [0, 0, 1]); G.poly([[x, v0, 2.62], [x + L, v0, 2.62], [x + L, v1, 2.62], [x, v1, 2.62]], jit(GR, r, 0.09), [0, 0, -1]); x += L; }
              for (x = -2.62; x < 2.61;) { var L2 = Math.min(2.62 - x, 1.1 + r() * 1.3); G.poly([[-5.24, v0, x], [-5.24, v0, x + L2], [-5.24, v1, x + L2], [-5.24, v1, x]], jit(GR, r, 0.09), [1, 0, 0]); G.poly([[5.24, v0, x], [5.24, v0, x + L2], [5.24, v1, x + L2], [5.24, v1, x]], jit(GR, r, 0.09), [-1, 0, 0]); x += L2; } }
            G.poly([[3.9, 0.01, -2.6], [4.95, 0.01, -2.6], [4.95, 1.1, -2.6], [3.9, 1.1, -2.6]], DARK, [0, 0, 1]);
            G.poly([[2.4, 0.9, -2.6], [2.6, 0.9, -2.6], [2.6, 1.05, -2.6], [2.4, 1.05, -2.6]], DARK, [0, 0, 1]); G.poly([[2.4, 0.9, 2.6], [2.6, 0.9, 2.6], [2.6, 1.05, 2.6], [2.4, 1.05, 2.6]], DARK, [0, 0, -1]);
            var SC = hx(0x5a2f28); G.box(-4.42, 0, -1.14, -4.27, 1.05, 1.14, SC); G.box(-3.59, 0, -1.14, -3.44, 1.05, 1.14, SC); G.box(-4.27, 0, -1.14, -3.59, 1.05, -0.99, SC); G.box(-4.27, 0, 0.99, -3.59, 1.05, 1.14, SC);
            G.flat(-4.27, -0.99, -3.59, 0.99, 0.22, hx(0x1c100c)); G.poly([[-4.27, 0.22, -0.99], [-4.27, 0.22, 0.99], [-4.27, 1.05, 0.99], [-4.27, 1.05, -0.99]], hx(0x2a1610), [1, 0, 0]); G.poly([[-3.59, 0.22, -0.99], [-3.59, 0.22, 0.99], [-3.59, 1.05, 0.99], [-3.59, 1.05, -0.99]], hx(0x2a1610), [-1, 0, 0]);
            G.box(5.16, 3.6, -0.3, 5.24, 3.8, 0.3, GLOWW, { glow: true }); G.box(-0.3, 3.6, 2.54, 0.3, 3.8, 2.62, GLOWW, { glow: true }); } }
      ] },
    opera: { name: 'the Sydney Opera House', e: '🎭', lat: -33.85678, lon: 151.2153, yaw: 0, door: [0, 85],
      quest: ['Go inside the Opera House', 'The north foyer over the harbour, then the Concert Hall.'],
      rooms: [
        { name: 'the north foyer', y: 18, at: [-18, -62], yh: 12, walk: [[-13.6, -5.6, 13.6, 5.6]], block: [[-9, -1.5, -5, -0.9], [5, -1.5, 9, -0.9]], spawn: [5, 3.6, Math.PI], cam: [-12.9, -4.9, 12.9, 4.9, 9],
          links: [{ at: [0, 4.9], to: 1, label: '🎭 Into the Concert Hall' }, { at: [10, 4.9], to: 'out', label: '🚪 Down the steps and out' }], view: { at: [0, -5.2], name: 'the Harbour Bridge' },
          lines: ['The roof has over a million tiles. They clean themselves in the rain!', 'Tonight it is Beethoven. Are you coming in?', 'Look at the bridge, all lit up.'],
          people: [pp('local', 'at the concert', -10, -4.6, Math.PI, 'stand', 'interact'), pp('local', 'at the concert', -8, -1.2, Math.PI, 'sit', 'sit'), pp('local', 'at the concert', 7, -1.2, Math.PI, 'sit', 'sit'), pp('local', 'at the concert', 11.5, 2, -Math.PI / 2, 'stand', 'wave'), pp('local', 'an usher', -2.5, 4.6, Math.PI, 'stand', 'idle', 'The Concert Hall doors are open. Find your seat, little one!')],
          build: function (G) {
            var CON = hx(0xd7ccb8), CEIL = hx(0xe6ddcc), GRAN = hx(0xa98c80), BRZ = hx(0x3b2f25), k;
            G.flat(-14, -6, 14, 6, 0, GRAN); G.flat(-3, -6, 3, 6, 0.01, hx(0x6a2c4a));
            G.wall(-14, 6, 14, 6, 0, 10, CON, [0, 0, -1]); G.poly([[-14, 0, 6], [-14, 0, -6], [-14, 16, -6], [-14, 10, 6]], CON, [1, 0, 0]); G.poly([[14, 0, 6], [14, 0, -6], [14, 16, -6], [14, 10, 6]], CON, [-1, 0, 0]);
            G.poly([[-14, 10, 6], [14, 10, 6], [14, 16, -6], [-14, 16, -6]], CEIL, DN);
            for (k = -13; k <= 13; k += 2) G.beam([k, 9.6, 6], [k, 15.6, -6], 0.4, CON);
            for (k = -14; k <= 14; k += 2) G.beam([k, 0, -6], [k, 16, -6], 0.08, BRZ); for (k = 0; k <= 16; k += 2.7) G.beam([-14, k, -6], [14, k, -6], 0.08, BRZ);
            G.box(-9, 0, -1.5, -5, 0.45, -0.9, hx(0x5a3a2a)); G.box(5, 0, -1.5, 9, 0.45, -0.9, hx(0x5a3a2a));
            G.box(-1.5, 0, 5.86, 1.5, 3.4, 6, hx(0x7a4a2c)); G.box(8.8, 0, 5.86, 11.2, 3.0, 6, hx(0x7a4a2c)); G.box(-0.6, 3.5, 5.9, 0.6, 3.75, 6, GLOWW, { glow: true });
            for (k = 0; k < 6; k++) G.box(-13.9, k * 0.28, 4 - k * 0.35, -10.5, k * 0.28 + 0.28, 6, hx(0xb9a094)); } },
        { name: 'the Concert Hall', y: 12, at: [-18, -25], yh: 22, walk: [[-13.6, -23.6, 13.6, -12], [-2, -12, 2, -9], [-1.2, -9, 1.2, 25.6]], block: [], spawn: [0, 24.0, Math.PI], cam: [-17, -25, 17, 25, 22],
          floorAt: function (x, z) { if (z <= -12) return 1.2; if (z <= -10.4) return 1.2 * (1 - (z + 12) / 1.6); if (z <= -9) return 0; if (Math.abs(x) > 1.4) return (Math.floor(z + 9) + 1) * 0.3; return (z + 9) * 0.3; },
          links: [{ at: [0, 26.2], to: 0, label: '🚪 Back to the foyer' }], view: { at: [0, -17], r: 2, name: 'the stage, under the rings' },
          lines: ['Shh, the orchestra is tuning.', 'The Grand Organ has over ten thousand pipes!'],
          people: [pp('local', 'a musician', -4, -18, 0, 'stand', 'interact'), pp('local', 'a musician', 5, -19, 0, 'stand', 'idle'), pp('local', 'in the audience', -3, -6.5, Math.PI, 'sit', 'sit'), pp('local', 'in the audience', 4, -5.5, Math.PI, 'sit', 'sit'), pp('local', 'in the audience', -6, -2.5, Math.PI, 'sit', 'sit'), pp('local', 'in the audience', 3, 1.5, Math.PI, 'sit', 'sit'), pp('local', 'in the audience', -8, 4.5, Math.PI, 'sit', 'sit'), pp('local', 'in the audience', 6, 8.5, Math.PI, 'sit', 'sit')],
          build: function (G) {
            var BOX = hx(0x9a5d3e), BIR = hx(0xe4d6bb), SEAT = hx(0x8e2b2e), PIPE = hx(0xc4c7cc), k, z;
            G.flat(-18, -26, 18, 26, 0, hx(0x6e4430)); G.wall(-18, -26, 18, -26, 0, 24, BOX, [0, 0, 1]); G.wall(-18, 26, 18, 26, 0, 24, BOX, [0, 0, -1]); G.wall(-18, -26, -18, 26, 0, 20, BOX, [1, 0, 0]); G.wall(18, -26, 18, 26, 0, 20, BOX, [-1, 0, 0]);
            G.poly([[-18, 20, -26], [0, 24, -26], [0, 24, 26], [-18, 20, 26]], BIR, DN); G.poly([[0, 24, -26], [18, 20, -26], [18, 20, 26], [0, 24, 26]], BIR, DN);
            G.poly([[-18, 20, -26], [0, 24, -26], [18, 20, -26]], BOX, [0, 0, 1]); G.poly([[-18, 20, 26], [18, 20, 26], [0, 24, 26]], BOX, [0, 0, -1]);
            G.box(-14, 0, -24, 14, 1.2, -12, hx(0x8a5634)); G.box(-2, 0, -12, 2, 0.6, -10.4, hx(0x8a5634));
            for (k = 0; k < 5; k++) G.box(-14, 1.2 + k * 0.5, -26 + k * 0.4, 14, 1.7 + k * 0.5, -24 + k * 0.4 - 1.6, hx(0x7a4a2c));
            G.box(-10, 6, -26, 10, 20, -24.6, hx(0x6b4024));
            for (k = -9.6; k <= 9.61; k += 0.48) { var t = 1 - Math.abs(k) / 10, h = 5 + 8 * Math.pow(t, 0.6) + (Math.abs(Math.abs(k) - 5) < 0.6 ? 3 : 0); G.cyl(k, -24.4, 0.17, 7, 7 + h, 8, PIPE, { cap: true }); }
            for (k = 0; k < 18; k++) { var cx = -10 + (k % 6) * 4, cz = -22 + Math.floor(k / 6) * 4, P = []; for (var q = 0; q <= 16; q++) { var a = q / 16 * Math.PI * 2; P.push([cx + Math.cos(a) * 1.2, 15, cz + Math.sin(a) * 1.2], [cx + Math.cos(a) * 0.6, 15, cz + Math.sin(a) * 0.6]); }
              for (q = 0; q < 16; q++) G.poly([P[2 * q], P[2 * q + 2], P[2 * q + 3], P[2 * q + 1]], hx(0xcfe0e8), DN); G.beam([cx, 15, cz + 1.2], [cx, 24, cz + 1.2], 0.03, hx(0x555555)); }
            for (z = -9; z < 25.5; z += 1) { var y1 = (Math.floor(z + 9) + 1) * 0.3; G.box(-17, 0, z, -1.4, y1, z + 1, hx(0x7a4a2c)); G.box(1.4, 0, z, 17, y1, z + 1, hx(0x7a4a2c));
              G.box(-16.6, y1, z + 0.75, -1.6, y1 + 0.75, z + 0.92, SEAT); G.box(1.6, y1, z + 0.75, 16.6, y1 + 0.75, z + 0.92, SEAT); }
            G.poly([[-1.4, 0, -9], [1.4, 0, -9], [1.4, 10.35, 25.5], [-1.4, 10.35, 25.5]], hx(0x5a2a3a), UP); G.flat(-1.4, 25.5, 1.4, 26, 10.35, hx(0x5a2a3a));
            G.box(-1.0, 10.35, 25.9, 1.0, 12.8, 26, hx(0x7a4a2c)); G.box(-0.4, 12.9, 25.94, 0.4, 13.1, 26, GLOWW, { glow: true }); } }
      ] },
    taj: { name: 'the Taj Mahal', e: '🕌', lat: 27.17502, lon: 78.04216, yaw: 0, door: [0, 48], quiet: true,
      quest: ['Visit the Taj Mahal\'s hall', 'A resting place. Walk softly, and look.'],
      rooms: [
        { name: 'the hall of the cenotaphs', y: 7, at: [0, 0], yh: 12, quiet: true, walk: [{ oct: 8.3 }], block: [{ oct: 4.0 }], spawn: [0, 6.6, Math.PI], cam: [-7.6, -7.6, 7.6, 7.6, 10.9],
          links: [{ at: [0, 8.3], to: 'out', label: '🚪 Leave quietly' }], view: { at: [0, 4.6], r: 1.4, name: 'the cenotaphs of Mumtaz Mahal and Shah Jahan' }, hush: 'The Taj Mahal. A resting place: walk softly, and look.',
          build: function (G) {
            var MARB = hx(0xf1ede4), MARB2 = hx(0xe6e0d2), DK = hx(0x3d3a38), R = 8.8 / Math.cos(Math.PI / 8), k, j, P = [];
            for (k = 0; k < 8; k++) { var a = Math.PI / 8 + k * Math.PI / 4; P.push([Math.cos(a) * R, 0, Math.sin(a) * R]); }
            G.poly(P.map(function (p) { return [p[0], 0, p[2]]; }), MARB, UP);
            for (k = 0; k < 16; k++) { var a0 = k / 16 * Math.PI * 2, a1 = (k + 1) / 16 * Math.PI * 2; G.poly([[Math.cos(a0) * 5.2, 0.01, Math.sin(a0) * 5.2], [Math.cos(a1) * 5.2, 0.01, Math.sin(a1) * 5.2], [Math.cos(a1) * 6.2, 0.01, Math.sin(a1) * 6.2], [Math.cos(a0) * 6.2, 0.01, Math.sin(a0) * 6.2]], k % 2 ? DK : MARB2, UP); }
            for (k = 0; k < 8; k++) { var b0 = k / 8 * Math.PI * 2, b1 = b0 + Math.PI / 8, b2 = b0 + Math.PI / 4; G.poly([[0, 0.012, 0], [Math.cos(b0) * 2.4, 0.012, Math.sin(b0) * 2.4], [Math.cos(b1) * 3.4, 0.012, Math.sin(b1) * 3.4], [Math.cos(b2) * 2.4, 0.012, Math.sin(b2) * 2.4]], hx(0x2f2c2a), UP); }
            for (k = 0; k < 8; k++) { var A = P[k], B = P[(k + 1) % 8], dx = B[0] - A[0], dz = B[2] - A[2], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, mx = (A[0] + B[0]) / 2, mz = (A[2] + B[2]) / 2, nIn = norm([-mx, 0, -mz]);
              G.wall(A[0], A[2], B[0], B[2], 0, 12, MARB, nIn, [[1.8, L - 1.8, 7.0, 10.6]]); G.arch(A[0], A[2], B[0], B[2], 1.8, L - 1.8, 9.0, MARB, nIn);
              var w0 = [A[0] + ux * 1.8 - nIn[0] * 0.05, A[2] + uz * 1.8 - nIn[2] * 0.05], w1 = [A[0] + ux * (L - 1.8) - nIn[0] * 0.05, A[2] + uz * (L - 1.8) - nIn[2] * 0.05];
              G.poly([[w0[0], 7.0, w0[1]], [w1[0], 7.0, w1[1]], [w1[0], 10.6, w1[1]], [w0[0], 10.6, w0[1]]], hx(0xfff6dc), nIn, true);
              for (j = 0; j <= 8; j++) { var t = j / 8; G.beam([w0[0] + (w1[0] - w0[0]) * t + nIn[0] * 0.04, 7.0, w0[1] + (w1[1] - w0[1]) * t + nIn[2] * 0.04], [w0[0] + (w1[0] - w0[0]) * t + nIn[0] * 0.04, 10.0, w0[1] + (w1[1] - w0[1]) * t + nIn[2] * 0.04], 0.06, MARB2); }
              for (j = 0; j < 6; j++) { var yy = 7.0 + j * 0.6; G.beam([w0[0] + nIn[0] * 0.04, yy, w0[1] + nIn[2] * 0.04], [w1[0] + nIn[0] * 0.04, yy, w1[1] + nIn[2] * 0.04], 0.06, MARB2); }
              G.box(Math.min(A[0], A[0] + nIn[0] * 0.3) - 0.2, 0, Math.min(A[2], A[2] + nIn[2] * 0.3) - 0.2, Math.max(A[0], A[0] + nIn[0] * 0.3) + 0.2, 12, Math.max(A[2], A[2] + nIn[2] * 0.3) + 0.2, MARB2);
              var c0 = [A[0] + nIn[0] * 0.02, A[2] + nIn[2] * 0.02]; G.poly([[c0[0] + ux * 0.4, 0.3, c0[1] + uz * 0.4], [c0[0] + ux * (L - 0.4), 0.3, c0[1] + uz * (L - 0.4)], [c0[0] + ux * (L - 0.4), 1.25, c0[1] + uz * (L - 0.4)], [c0[0] + ux * 0.4, 1.25, c0[1] + uz * 0.4]], MARB2, nIn);
              for (j = 1; j <= 5; j++) { var f = j / 6, fx = c0[0] + ux * L * f + nIn[0] * 0.01, fz = c0[1] + uz * L * f + nIn[2] * 0.01, FL = [hx(0xa8323a), hx(0xd9b54a), hx(0x7a3a8a)][j % 3], LF = hx(0x3f7a4a);
                G.poly([[fx - ux * 0.02, 0.45, fz - uz * 0.02], [fx + ux * 0.02, 0.45, fz + uz * 0.02], [fx + ux * 0.02, 0.95, fz + uz * 0.02], [fx - ux * 0.02, 0.95, fz - uz * 0.02]], LF, nIn);
                G.poly([[fx, 0.6, fz], [fx - ux * 0.16, 0.72, fz - uz * 0.16], [fx - ux * 0.05, 0.62, fz - uz * 0.05]], LF, nIn); G.poly([[fx, 0.66, fz], [fx + ux * 0.05, 0.68, fz + uz * 0.05], [fx + ux * 0.16, 0.8, fz + uz * 0.16]], LF, nIn);
                G.disc([fx, 1.0, fz], 0.09, 6, FL, [ux, 0, uz], [0, 1, 0], nIn); G.disc([fx - ux * 0.11, 0.9, fz - uz * 0.11], 0.05, 5, FL, [ux, 0, uz], [0, 1, 0], nIn); G.disc([fx + ux * 0.11, 0.86, fz + uz * 0.11], 0.05, 5, FL, [ux, 0, uz], [0, 1, 0], nIn); } }
            G.lathe(0, 0, [[R, 12], [R * 0.97, 15], [R * 0.86, 18.5], [R * 0.66, 21.4], [R * 0.38, 23.5], [0, 24.4]].map(function (p) { return [p[0], p[1] - 12]; }), 32, MARB, 12, true);
            var SR = 4.0 / Math.cos(Math.PI / 8), S = []; for (k = 0; k < 8; k++) { var as = Math.PI / 8 + k * Math.PI / 4; S.push([Math.cos(as) * SR, Math.sin(as) * SR]); }
            for (k = 0; k < 8; k++) { var p0 = S[k], p1 = S[(k + 1) % 8];
              G.box(p0[0] - 0.12, 0, p0[1] - 0.12, p0[0] + 0.12, 2.05, p0[1] + 0.12, MARB2); G.box(p0[0] - 0.08, 2.05, p0[1] - 0.08, p0[0] + 0.08, 2.3, p0[1] + 0.08, hx(0xd9b54a));
              G.beam([p0[0], 0.12, p0[1]], [p1[0], 0.12, p1[1]], 0.22, MARB2); G.beam([p0[0], 1.9, p0[1]], [p1[0], 1.9, p1[1]], 0.16, MARB2);
              for (j = 1; j < 12; j++) { var tt = j / 12, bx = p0[0] + (p1[0] - p0[0]) * tt, bz = p0[1] + (p1[1] - p0[1]) * tt; G.beam([bx, 0.24, bz], [bx, 1.82, bz], 0.045, MARB); }
              for (j = 1; j < 5; j++) { var yv = 0.24 + j * 0.32; G.beam([p0[0], yv, p0[1]], [p1[0], yv, p1[1]], 0.04, MARB); } }
            function ceno(cx, sc, top) { G.box(cx - 0.8 * sc, 0, -1.25 * sc, cx + 0.8 * sc, 0.3, 1.25 * sc, MARB); G.box(cx - 0.62 * sc, 0.3, -1.05 * sc, cx + 0.62 * sc, 0.65, 1.05 * sc, MARB2);
              G.box(cx - 0.64 * sc, 0.4, -1.07 * sc, cx + 0.64 * sc, 0.47, 1.07 * sc, hx(0x3f7a4a)); G.box(cx - 0.42 * sc, 0.65, -0.85 * sc, cx + 0.42 * sc, 1.05, 0.85 * sc, MARB);
              if (top === 'slate') G.box(cx - 0.18 * sc, 1.05, -0.7 * sc, cx + 0.18 * sc, 1.18, 0.7 * sc, MARB2); else G.box(cx - 0.12 * sc, 1.05, -0.45 * sc, cx + 0.12 * sc, 1.3, 0.45 * sc, MARB2); }
            ceno(0, 1, 'slate'); ceno(-1.95, 1.12, 'pen');
            G.beam([0, 24.3, 0], [0, 9.1, 0], 0.04, hx(0x7a6230)); G.lathe(0, 0, [[0.0, 0], [0.32, 0.25], [0.45, 0.7], [0.3, 1.1], [0.08, 1.4], [0, 1.45]], 12, hx(0xb08a3c), 7.7); G.disc([0, 7.72, 0], 0.2, 8, GLOWW, [1, 0, 0], [0, 0, 1], DN, true); } }
      ] }
  };
  /* ---------- THE ASIAN CITIES (Su 37 relaying Marth, Nov 4 2026, verbatim: "make sure to make shanghai, bejiing, tokyo, shibuya, shinjiku etc").
     Their landmark quests (world-quests.js concatenates LANDMARKS below into its own), the interiors that are enterable in real life (one deck kit for
     the observation floors, built to each tower's shape and height), the crowds (world-people.js places, seeded by id), the Scramble's light, and
     low-poly tower models where the map's extrusion does not draw the tower (decided at run time from the map's own buildings). All DRAFT. ---------- */
  var LANDMARKS = [
    { id: 'shtower', e: '🏙️', name: 'the Shanghai Tower', title: 'Fly up the Shanghai Tower', where: 'Shanghai, China', lat: 31.23350, lon: 121.50550, kind: 'fly', r: 300, aglMax: 700, xp: 150, runes: 20, line: '632 m of glass, twisting as it climbs.' },
    { id: 'pearl', e: '🔮', name: 'the Oriental Pearl Tower', title: 'See the Oriental Pearl Tower', where: 'Shanghai, China', lat: 31.23972, lon: 121.49972, kind: 'fly', r: 250, aglMax: 600, xp: 130, runes: 16, line: 'Pink pearls strung on a 468 m tower.' },
    { id: 'bund', e: '🌃', name: 'the Bund', title: 'Fly along the Bund', where: 'Shanghai, China', lat: 31.24030, lon: 121.49060, kind: 'see', r: 500, aglMax: 400, xp: 110, runes: 14, line: 'Old stone banks on one shore, glass towers on the other.' },
    { id: 'forbidden', e: '🏯', name: 'the Forbidden City', title: 'See the Forbidden City', where: 'Beijing, China', lat: 39.91560, lon: 116.39040, kind: 'fly', r: 500, aglMax: 600, xp: 140, runes: 18, line: 'Courtyard after courtyard under golden roofs.' },
    { id: 'tiananmen', e: '🏮', name: 'Tiananmen', title: 'See Tiananmen', where: 'Beijing, China', lat: 39.90750, lon: 116.39740, kind: 'fly', r: 250, aglMax: 500, xp: 110, runes: 14, line: 'The Gate of Heavenly Peace.' },
    { id: 'heaven', e: '🔵', name: 'the Temple of Heaven', title: 'See the Temple of Heaven', where: 'Beijing, China', lat: 39.88230, lon: 116.40660, kind: 'fly', r: 300, aglMax: 500, xp: 120, runes: 15, line: 'A round hall under three blue roofs. Seen from the air, quietly.' },
    { id: 'skytree', e: '📡', name: 'Tokyo Skytree', title: 'Up to the Skytree\'s Tembo Deck', where: 'Tokyo, Japan', lat: 35.71006, lon: 139.81070, kind: 'fly', r: 250, aglMax: 700, xp: 150, runes: 20, line: '634 m: the tallest tower in the world.' },
    { id: 'tokyotower', e: '🗼', name: 'Tokyo Tower', title: 'Fly round Tokyo Tower', where: 'Tokyo, Japan', lat: 35.65858, lon: 139.74543, kind: 'fly', r: 200, aglMax: 500, xp: 120, runes: 15, line: 'Red and white, a lighthouse for the city.' },
    { id: 'scramble', e: '🚦', name: 'the Shibuya Crossing', title: 'Watch the Shibuya Scramble', where: 'Shibuya, Tokyo', lat: 35.65950, lon: 139.70055, kind: 'see', r: 150, aglMax: 250, xp: 120, runes: 15, line: 'Every green light, the whole crossing walks at once.' },
    { id: 'shibuyasky', e: '🌆', name: 'Shibuya Sky', title: 'Up to Shibuya Sky', where: 'Shibuya, Tokyo', lat: 35.65840, lon: 139.70240, kind: 'top', r: 60, above: [215, 300], xp: 130, runes: 16, line: 'An open rooftop 229 m over the crossing.' },
    { id: 'tmg', e: '🏢', name: 'the Tokyo Metropolitan Government Building', title: 'The free observatory in Shinjuku', where: 'Shinjuku, Tokyo', lat: 35.68950, lon: 139.69170, kind: 'fly', r: 200, aglMax: 500, xp: 120, runes: 15, line: 'Twin towers; on a clear day, Mount Fuji.' },
    { id: 'kabukicho', e: '🍜', name: 'Kabukicho', title: 'Fly over Kabukicho', where: 'Shinjuku, Tokyo', lat: 35.69440, lon: 139.70280, kind: 'see', r: 300, aglMax: 300, xp: 100, runes: 12, line: 'Neon streets, and a Godzilla on the roof.' }
  ];
  var GLS = hx(0x2a3440);
  function deckRoom(o) {   // one observation floor: a ring (circle or square) round the lift core, windows of mullions (the real city through them) or an open parapet
    var R = o.R, cr = o.core, sq = o.shape === 'square', H = o.h || 4.2;
    return { name: o.name, y: o.y, at: o.at || [0, 0], yh: H, walk: sq ? [[-R + 0.6, -R + 0.6, R - 0.6, R - 0.6]] : [{ c: [0, 0], r: R - 0.6 }], block: sq ? [[-cr - 0.3, -cr - 0.3, cr + 0.3, cr + 0.3]] : [{ c: [0, 0], r: cr + 0.3 }],
      spawn: o.spawn, cam: [-R + 1.1, -R + 1.1, R - 1.1, R - 1.1, o.open ? H + 6 : H - 1.08], links: [{ at: o.lift, to: 'out', label: '🛗 Down and out' }], view: o.view, lines: o.lines, people: o.people || [],
      build: function (G, r) {
        var FL = hx(o.floor || 0x7c7a76), WL = hx(o.coreCol || 0xd8d4cc), MU = hx(o.mull || 0x2c2c30), n = sq ? 4 : 32, k;
        if (sq) { G.flat(-R, -R, R, R, 0, FL); if (o.glassRing) ring4(G, R - o.glassRing, R, 0.01, hx(0x9fc6d9)); }
        else { for (k = 0; k < n; k++) { var a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2; G.poly([[Math.cos(a0) * cr, 0, Math.sin(a0) * cr], [Math.cos(a1) * cr, 0, Math.sin(a1) * cr], [Math.cos(a1) * R, 0, Math.sin(a1) * R], [Math.cos(a0) * R, 0, Math.sin(a0) * R]], FL, UP);
            if (o.glassRing) G.poly([[Math.cos(a0) * (R - o.glassRing), 0.01, Math.sin(a0) * (R - o.glassRing)], [Math.cos(a1) * (R - o.glassRing), 0.01, Math.sin(a1) * (R - o.glassRing)], [Math.cos(a1) * R, 0.01, Math.sin(a1) * R], [Math.cos(a0) * R, 0.01, Math.sin(a0) * R]], hx(0x9fc6d9), UP); } }
        if (sq) G.box(-cr, 0, -cr, cr, H, cr, WL); else G.cyl(0, 0, cr, 0, H, 16, WL);
        var lk = o.lift, la = Math.atan2(lk[1], lk[0]), lx = Math.cos(la) * (cr + 0.02), lz = Math.sin(la) * (cr + 0.02);
        G.box(lx - 0.7 * Math.abs(Math.sin(la)) - 0.03, 0, lz - 0.7 * Math.abs(Math.cos(la)) - 0.03, lx + 0.7 * Math.abs(Math.sin(la)) + 0.03, 2.3, lz + 0.7 * Math.abs(Math.cos(la)) + 0.03, hx(0xb9bcc0)); G.box(lx - 0.2, 2.4, lz - 0.2, lx + 0.2, 2.6, lz + 0.2, GLOWW, { glow: true });
        if (o.open) { if (sq) { parapet(G, R, 1.1, hx(0x9a9890), hx(0x6e6c66)); fenceSq(G, R - 0.05, 1.1, 1.9, 1.2, 0.05, MU); } else { G.cyl(0, 0, R, 0, 1.1, n, hx(0x9a9890), { inward: true }); } }
        else {
          if (sq) { square(G, R, function (ax, az, bx, bz, w) { G.wall(ax, az, bx, bz, 0, 0.45, hx(0x3a3a3e), w); G.wall(ax, az, bx, bz, H - 0.4, H, hx(0x3a3a3e), w); G.bars(ax, az, bx, bz, 0.45, H - 0.4, 1.6, 0.08, MU); }); G.flat(-R, -R, R, R, H, hx(o.ceil || 0xe8e6e0), true); }
          else { G.cyl(0, 0, R, 0, 0.45, n, hx(0x3a3a3e), { inward: true }); G.cyl(0, 0, R, H - 0.4, H, n, hx(0x3a3a3e), { inward: true }); for (k = 0; k < n; k++) { var a = k / n * Math.PI * 2; G.beam([Math.cos(a) * (R - 0.05), 0.45, Math.sin(a) * (R - 0.05)], [Math.cos(a) * (R - 0.05), H - 0.4, Math.sin(a) * (R - 0.05)], 0.08, MU); }
            for (k = 0; k < n; k++) { var b0 = k / n * Math.PI * 2, b1 = (k + 1) / n * Math.PI * 2; G.poly([[Math.cos(b0) * cr, H, Math.sin(b0) * cr], [Math.cos(b1) * cr, H, Math.sin(b1) * cr], [Math.cos(b1) * R, H, Math.sin(b1) * R], [Math.cos(b0) * R, H, Math.sin(b0) * R]], hx(o.ceil || 0xe8e6e0), DN); } }
          for (k = 0; k < (sq ? 8 : 12); k++) { var c2 = (k + 0.5) / (sq ? 8 : 12) * Math.PI * 2, rr = (cr + R) / 2; G.box(Math.cos(c2) * rr - 0.4, H - 0.03, Math.sin(c2) * rr - 0.4, Math.cos(c2) * rr + 0.4, H, Math.sin(c2) * rr + 0.4, GLOWW, { glow: true, bottom: true, noTop: true }); } }
        if (o.extra) o.extra(G, r);
      } };
  }
  function vp(n, y0) { var o = []; for (var i = 0; i < n; i++) { var a = (i + 0.5) / n * Math.PI * 2 + 0.3; o.push(pp('local', 'enjoying the view', Math.cos(a) * y0, Math.sin(a) * y0, Math.atan2(Math.cos(a), Math.sin(a)), 'stand', i % 3 ? 'idle' : 'interact')); } return o; }
  var RED = hx(0xa8282a), GOLDR = hx(0xd9a531);
  var DEFS_ASIA = {
    shtower: { name: 'the Shanghai Tower', e: '🏙️', lat: 31.23350, lon: 121.50550, yaw: 0, door: [0, -42], quest: ['Up the Shanghai Tower', 'The 118th-floor deck, 546 m over Shanghai.'],
      rooms: [deckRoom({ name: 'the 118th floor, 546 m', y: 546, R: 21, core: 8.5, h: 4.6, spawn: [0, -11.2, Math.PI], lift: [0, -9.2], view: { at: [0, 19.6], name: 'the Huangpu and the Bund' }, people: vp(6, 17), lines: ['The world\'s second-tallest building. It twists 120 degrees as it climbs!', 'That pink ball down there is the Pearl Tower.'] })] },
    pearl: { name: 'the Oriental Pearl Tower', e: '🔮', lat: 31.23972, lon: 121.49972, yaw: 0, door: [26, 0], quest: ['Walk the Pearl\'s glass floor', 'The sightseeing floor in the upper pearl, 263 m up.'],
      rooms: [deckRoom({ name: 'the upper pearl, 263 m', y: 263, R: 17, core: 6, h: 4.2, glassRing: 3.2, mull: 0xd06aa0, coreCol: 0xe7cfe0, spawn: [9.8, 0, Math.PI / 2], lift: [7.4, 0], view: { at: [-15.4, 0], name: 'the Bund across the river' }, people: vp(5, 13), lines: ['Look down! The glass floor is right under you.', 'At night the whole tower lights up pink.'] })] },
    forbidden: { name: 'the Forbidden City', e: '🏯', lat: 39.91560, lon: 116.39040, yaw: 0, door: [0, 48], quest: ['Look into the Hall of Supreme Harmony', 'From its threshold: the Dragon Throne under a golden ceiling.'],
      rooms: [{ name: 'the Hall of Supreme Harmony', y: 8, at: [0, 0], yh: 12, walk: [[-14, 7.2, 14, 9.6]], block: [], spawn: [-4, 8.6, Math.PI], cam: [-12, 7.6, 12, 9.4, 6], links: [{ at: [6, 9.4], to: 'out', label: '🚪 Back to the courtyard' }], view: { at: [0, 7.6], r: 1.4, name: 'the Dragon Throne' },
        lines: ['Visitors look in from the doors: the throne room is kept as it was.', 'Seventy-two great columns hold up this roof.'], people: [pp('local', 'looking in', 3, 8.2, Math.PI, 'stand', 'interact'), pp('local', 'looking in', -9, 8.4, Math.PI)],
        build: function (G) {
          var k, j, COL = hx(0xb02a26), FLR = hx(0x5a5650), CEIL = hx(0x2d6a5a);
          G.shell(-30, -16, 30, 10, 13, { floor: FLR, wall: hx(0x8a2a24), ceil: CEIL });
          for (k = -26; k <= 26; k += 4) for (j = -12; j <= 4; j += 4) if (!(Math.abs(k) < 6 && j > -6)) G.cyl(k, j, 0.55, 0, 12.6, 10, (Math.abs(k) < 8 && j < 0) ? GOLDR : COL);
          for (k = -28; k <= 28; k += 2) for (j = -15; j <= 9; j += 2) G.box(k - 0.85, 12.75, j - 0.85, k + 0.85, 12.98, j + 0.85, (k + j) % 4 ? hx(0x2f7a64) : hx(0x2a4a8a), { bottom: true, noTop: true });
          G.box(-5, 0, -13, 5, 0.6, -5, hx(0x6e6a60)); G.box(-3.5, 0.6, -12, 3.5, 1.2, -6, hx(0x7a7468)); G.box(-2.2, 1.2, -10, 2.2, 1.4, -7.5, GOLDR);
          G.box(-1.3, 1.4, -10, 1.3, 3.2, -9.4, GOLDR); G.box(-1.4, 1.4, -9.4, -1.1, 2.2, -7.6, GOLDR); G.box(1.1, 1.4, -9.4, 1.4, 2.2, -7.6, GOLDR); G.box(-0.9, 1.4, -9.3, 0.9, 1.9, -8.0, RED);
          G.box(-4, 0, -14.2, 4, 7, -13.6, GOLDR); G.cyl(0, -11, 1.4, 12.2, 12.6, 12, GOLDR, { cap: true });
          G.bars(-14, 6.9, 14, 6.9, 0, 1.0, 0.7, 0.06, RED); G.beam([-14, 1.0, 6.9], [14, 1.0, 6.9], 0.08, RED);
          G.box(-30, 0, 9.9, 30, 13, 10, hx(0x8a2a24)); for (k = -26; k <= 26; k += 4) G.box(k - 1.6, 0.4, 9.88, k + 1.6, 4.6, 9.9, hx(0xffe6b0), { glow: true }); } }] },
    tiananmen: { name: 'Tiananmen', e: '🏮', lat: 39.90750, lon: 116.39740, yaw: 0, door: [0, 22], quest: ['Stand on the Tiananmen rostrum', 'The gate\'s balcony over the square.'],
      rooms: [{ name: 'the rostrum', y: 13, at: [0, 0], yh: 8, walk: [[-28, -1.6, 28, 2.6]], block: [], spawn: [-6, 0.4, 0], cam: [-27, -1.4, 27, 2.4, 7], links: [{ at: [0, -1.6], to: 'out', label: '🚪 Down the gate stairs' }], view: { at: [0, 2.4], name: 'the square to the south' },
        lines: ['From here you can see right down the square.', 'The lanterns are lit for every festival.'], people: [pp('local', 'visiting', 8, 2.2, 0), pp('local', 'visiting', -14, 2.0, 0, 'stand', 'wave'), pp('local', 'visiting', 18, 0, 0, 'stand', 'interact')],
        build: function (G) {
          var k; G.flat(-30, -3, 30, 3.4, 0, hx(0x6e6a64)); G.box(-30, 0, 3.0, 30, 1.15, 3.4, RED); G.box(-30.1, 1.15, 2.9, 30.1, 1.25, 3.5, hx(0x6a5a4a));
          G.wall(-30, -3, 30, -3, 0, 7, RED, [0, 0, 1]); for (k = -27; k <= 27; k += 4.5) { G.cyl(k, -2.4, 0.4, 0, 7, 10, RED); if (Math.abs(k) > 2) G.box(k + 0.8, 1.0, -2.98, k + 3.7, 5.2, -2.95, hx(0x8a6a3a)); }
          G.box(-31, 7, -3.4, 31, 7.5, 4.6, hx(0x2f6a5a), { bottom: true }); G.poly([[-32, 7.5, 5.6], [32, 7.5, 5.6], [30, 9.6, -1], [-30, 9.6, -1]], hx(0xd9a531), UP);
          for (k = -24; k <= 24; k += 8) { G.beam([k, 7.0, 3.6], [k, 6.0, 3.6], 0.03, hx(0x3a2a1a)); G.lathe(k, 3.6, [[0.05, 0], [0.45, 0.2], [0.55, 0.6], [0.45, 1.0], [0.05, 1.15]], 10, hx(0xd8382c), 4.85); } } }] },
    skytree: { name: 'Tokyo Skytree', e: '📡', lat: 35.71006, lon: 139.81070, yaw: 0, door: [0, 42], quest: ['The Skytree\'s Tembo Deck', '350 m: all of Tokyo in one window.'],
      rooms: [deckRoom({ name: 'the Tembo Deck, 350 m', y: 350, R: 16, core: 6, h: 5, spawn: [0, 9.0, 0], lift: [0, 7.0], view: { at: [0, -14.6], name: 'Mount Fuji, far to the west' }, people: vp(6, 13), lines: ['On a clear day you can see Mount Fuji.', 'The tower sways a little in the wind. Do not worry!'] })] },
    tokyotower: { name: 'Tokyo Tower', e: '🗼', lat: 35.65858, lon: 139.74543, yaw: 0, door: [0, 46], quest: ['Up to Tokyo Tower\'s Main Deck', '150 m, and a glass window in the floor.'],
      rooms: [deckRoom({ name: 'the Main Deck, 150 m', y: 150, R: 12, core: 4, shape: 'square', h: 4.4, glassRing: 1.6, mull: 0xc8382c, spawn: [0, 6.8, 0], lift: [0, 4.9], view: { at: [0, -10.6], name: 'the city towards Shinjuku' }, people: vp(5, 9), lines: ['Look down through the floor window!', 'Tokyo Tower is a bit taller than the Eiffel Tower, you know.'] })] },
    shibuyasky: { name: 'Shibuya Sky', e: '🌆', lat: 35.65840, lon: 139.70240, yaw: 20 * Math.PI / 180, door: [0, -34], quest: ['Up to Shibuya Sky', 'The open rooftop over the Scramble.'],
      rooms: [deckRoom({ name: 'the rooftop, 229 m', y: 229, R: 15, core: 4, shape: 'square', h: 3.2, open: true, floor: 0x5a5c60, spawn: [0, -7.6, Math.PI], lift: [0, -5.6], view: { at: [-13.6, -13.6], r: 1.6, name: 'the Sky Edge, over the crossing' }, people: vp(7, 12),
        lines: ['Look down at the crossing. Everyone crosses at once!', 'This corner is called the Sky Edge.'],
        extra: function (G) { var k; for (k = 0; k < 24; k++) { var a = k / 24 * Math.PI * 2; G.poly([[Math.cos(a) * 5.4, 0.01, Math.sin(a) * 5.4], [Math.cos(a + 0.26) * 5.4, 0.01, Math.sin(a + 0.26) * 5.4], [Math.cos(a + 0.26) * 5.8, 0.01, Math.sin(a + 0.26) * 5.8], [Math.cos(a) * 5.8, 0.01, Math.sin(a) * 5.8]], hx(0xe8e4d8), UP); }
          for (k = 0; k < 4; k++) G.box(7 + k * 1.6, 0, 10, 8.2 + k * 1.6, 0.35, 12.4, hx(0xd8c8a8)); } })] },
    tmg: { name: 'the Tokyo Metropolitan Government Building', e: '🏢', lat: 35.68950, lon: 139.69170, yaw: 0, door: [0, 44], quest: ['The free observatory in Shinjuku', '202 m up, and it costs nothing.'],
      rooms: [deckRoom({ name: 'the South Observatory, 202 m', y: 202, R: 14, core: 5, shape: 'square', h: 4.2, at: [0, -16], spawn: [0, 7.6, 0], lift: [0, 5.9], view: { at: [-12.6, 0], name: 'towards Mount Fuji' }, people: vp(6, 10), lines: ['It is free to come up here, you know.', 'The café sells little Tokyo souvenirs.'],
        extra: function (G) { G.box(8, 0, -12.5, 12.5, 1.05, -10.5, hx(0x6a4a30)); G.box(7.9, 1.05, -12.6, 12.6, 1.1, -10.4, hx(0xd9cbb2)); } })] }
  };
  Object.keys(DEFS_ASIA).forEach(function (k) { DEFS[k] = DEFS_ASIA[k]; });
  var DEF_IDS = Object.keys(DEFS);

  /* ---------- the everyday kit (seeded by the building's own id: the same room every visit) ---------- */
  var KIND = { office: 'office', cafe: 'cafe', shop: 'shop', clothing_store: 'shop', grocery: 'shop', bakery: 'cafe', ice_cream: 'cafe' };
  var KIT = {
    office: { e: '🏢', word: 'an office', line: 'Reception is on the ground floor.', lines: ['Good morning! Do you have an appointment?', 'The lifts are just behind me.', 'Busy day upstairs. Everyone is in meetings.'] },
    shop: { e: '🛍️', word: 'a shop', line: 'Have a look around.', lines: ['Take your time, look around!', 'Everything on these shelves is local.', 'Can I help you find something?'] },
    cafe: { e: '☕', word: 'a café', line: 'Something warm to drink?', lines: ['One small coffee for the little bird?', 'The croissants are fresh this morning.', 'Sit anywhere you like.'] }
  };
  function genRoom(g) {   // g: { id, gk, w, d, h, seed, name }
    var r = rng(hash('729:' + g.id)), k, w = g.w, d = g.d, hw = w / 2, hd = d / 2, H = g.gk === 'office' ? Math.min(6, Math.max(4.2, g.h * 0.7)) : Math.min(3.8, Math.max(3.2, g.h * 0.5)), block = [], people = [];
    var tones = { office: [0xd8d2c8, 0xc9c4ba, 0xe2ddd3], shop: [0xe8e0d0, 0xd8e2e8, 0xf0e6d8], cafe: [0xe9d8bf, 0xd9c2a0, 0xf1e2c8] }[g.gk];
    var WALL = hx(pick(r, tones)), FLOOR = hx(pick(r, g.gk === 'cafe' ? [0x8a5a3a, 0x6e4a30, 0xb08a5a] : g.gk === 'shop' ? [0xb8b0a4, 0x9a8f80, 0xcfc6b8] : [0xd8d0c4, 0xbab2a6, 0x8a8478])), ACC = hx(pick(r, [0x2d6a9f, 0xc8314a, 0x2f8a5a, 0xd98a2a, 0x6a3a8a, 0x1f1f24]));
    var sig = [g.gk, w.toFixed(1), d.toFixed(1), H.toFixed(1)];
    var build = function (G) {
      G.yh = H; var front = [], x;
      for (x = -hw + 1.0; x < hw - 1.0; x += 1.6) if (Math.abs(x) > 1.6) front.push([x + hw, x + hw + 1.2, 0.5, H - 0.6]);
      G.shell(-hw, -hd, hw, hd, H, { floor: FLOOR, wall: WALL, ceil: hx(0xf2efe8) }, { n: front });
      for (k = 0; k < front.length; k++) { var fx = front[k][0] - hw; G.box(fx - 0.04, 0.5, -hd - 0.02, fx + 0.04, H - 0.6, -hd + 0.04, hx(0x3a3a3c)); G.box(fx + 1.16, 0.5, -hd - 0.02, fx + 1.24, H - 0.6, -hd + 0.04, hx(0x3a3a3c)); }
      G.box(-0.9, 0, -hd, 0.9, 2.5, -hd + 0.06, hx(0x4a4a4e)); G.box(-0.8, 0.05, -hd + 0.06, 0.8, 2.4, -hd + 0.08, hx(0x8fa4b0));
      for (x = -hw + 2; x < hw - 1; x += 3) G.box(x - 0.5, H - 0.05, -0.3, x + 0.5, H, 0.3, GLOWW, { glow: true, bottom: true, noTop: true });
      if (g.gk === 'office') {
        G.box(-1.6, 0, hd - 3.9, 1.6, 1.1, hd - 3.1, hx(0x3a2a20)); G.box(-1.7, 1.1, hd - 4.0, 1.7, 1.18, hd - 3.0, hx(0xd8d0c4)); G.box(-1.2, 2.2, hd - 0.06, 1.2, 3.0, hd, ACC, { glow: true });
        var nl = 2 + Math.floor(r() * 2); for (k = 0; k < nl; k++) { var lz = -hd + 2.2 + k * 1.9; G.box(hw - 0.06, 0, lz - 0.6, hw, 2.4, lz + 0.6, hx(0xb9bcc0)); G.box(hw - 0.08, 0, lz - 0.02, hw - 0.06, 2.4, lz + 0.02, DARK); G.box(hw - 0.08, 2.55, lz - 0.25, hw - 0.04, 2.7, lz + 0.25, GLOWW, { glow: true }); }
        G.box(-hw + 0.4, 0, -hd + 2.5, -hw + 1.2, 0.45, -hd + 4.7, ACC); G.box(-hw + 0.4, 0.45, -hd + 2.5, -hw + 0.6, 0.85, -hd + 4.7, ACC); block.push([-hw, -hd + 2.3, -hw + 1.4, -hd + 4.9]);
        [[-hw + 0.7, -hd + 0.9], [hw - 0.7, -hd + 0.9]].forEach(function (q) { G.cyl(q[0], q[1], 0.3, 0, 0.5, 8, hx(0x6a5a4a), { cap: true }); G.box(q[0] - 0.35, 0.5, q[1] - 0.35, q[0] + 0.35, 1.5, q[1] + 0.35, hx(0x3f7a4a)); block.push([q[0] - 0.45, q[1] - 0.45, q[0] + 0.45, q[1] + 0.45]); });
        block.push([-1.8, hd - 4.1, 1.8, hd]); people.push(pp('local', 'at the front desk', 0, hd - 2.4, Math.PI, 'stand', 'idle', 'Good morning! Welcome. How can I help?'));
        people.push(pp('local', 'waiting for a lift', hw - 1.6, -hd + 3.0, Math.PI / 2, 'stand', 'interact')); if (r() < 0.6) people.push(pp('local', 'waiting', -hw + 0.9, -hd + 3.6, Math.PI / 2, 'sit', 'sit'));
        sig.push('lifts' + nl);
      } else if (g.gk === 'shop') {
        var GOODS = [0xc8314a, 0x2d6a9f, 0xf2c94c, 0x2f8a5a, 0xf2994a, 0x9b51e0, 0xffffff, 0x56ccf2];
        [-1, 1].forEach(function (sd) { var x0 = sd < 0 ? -hw : hw - 0.55; G.box(x0, 0, -hd + 1.4, x0 + 0.55, 2.0, hd - 1.0, hx(0x8a6a4a));
          for (var sh = 0; sh < 3; sh++) for (var zz = -hd + 1.5; zz < hd - 1.2; zz += 0.45) { var gc = hx(pick(r, GOODS)); G.box(x0 + (sd < 0 ? 0.55 : -0.0) - (sd < 0 ? 0 : 0.0), 0.35 + sh * 0.6, zz, x0 + (sd < 0 ? 0.62 : -0.07) + (sd < 0 ? 0 : 0.0), 0.35 + sh * 0.6 + 0.3 + r() * 0.12, zz + 0.32, gc); }
          block.push([sd < 0 ? -hw : hw - 0.8, -hd + 1.3, sd < 0 ? -hw + 0.8 : hw, hd - 0.9]); });
        G.box(-1.4, 0, -0.5, 1.4, 0.8, 0.5, hx(0x6e5038)); for (k = 0; k < 6; k++) G.box(-1.2 + k * 0.42, 0.8, -0.3, -0.92 + k * 0.42, 1.0 + r() * 0.2, 0.2, hx(pick(r, GOODS))); block.push([-1.6, -0.7, 1.6, 0.7]);
        G.box(-2.2, 0, hd - 1.8, 0.6, 1.0, hd - 1.1, hx(0x4a3628)); G.box(-0.2, 1.0, hd - 1.6, 0.3, 1.3, hd - 1.3, hx(0x2a2a2c)); block.push([-2.4, hd - 2.0, 0.8, hd]);
        people.push(pp('local', 'minding the shop', -0.8, hd - 0.6, Math.PI, 'stand', 'idle', 'Welcome in! Everything you see is for sale. Except me.'));
        var ns = 2 + Math.floor(r() * 2); for (k = 0; k < ns; k++) people.push(pp('local', 'shopping', (k % 2 ? 1 : -1) * (hw - 1.4), -hd + 2.2 + k * 1.6, (k % 2 ? 1 : -1) * Math.PI / 2, 'stand', k ? 'interact' : 'idle'));
        sig.push('shoppers' + ns);
      } else {
        G.box(-hw + 1, 0, hd - 1.2, hw - 1, 1.05, hd - 0.4, hx(0x5a3a26)); G.box(-hw + 0.9, 1.05, hd - 1.3, hw - 0.9, 1.12, hd - 0.3, hx(0xd9cbb2));
        G.box(-1.8, 1.12, hd - 1.1, -0.2, 1.5, hd - 0.6, hx(0xffefc8), { glow: true }); G.box(0.6, 1.12, hd - 1.0, 1.3, 1.6, hd - 0.6, hx(0xb9bcc0)); G.box(-1.6, 1.9, hd - 0.06, 1.6, 2.8, hd, hx(0x2a2a2c)); for (k = 0; k < 4; k++) G.box(-1.4, 2.0 + k * 0.2, hd - 0.08, -1.4 + 1.2 + r() * 1.4, 2.06 + k * 0.2, hd - 0.06, hx(0xf2efe8));
        block.push([-hw + 0.8, hd - 1.4, hw - 0.8, hd]);
        var nt = Math.min(5, Math.max(3, Math.floor((w - 2) * (d - 4) / 9))), tables = []; for (k = 0; k < nt; k++) { var tx = -hw + 1.6 + (k % 3) * Math.max(2.2, (w - 3.2) / 2), tz = -hd + 2.6 + Math.floor(k / 3) * 2.6; if (tx > hw - 1.2 || tz > hd - 2.4 || Math.hypot(tx, tz - (-hd + 2.4)) < 2.0 || Math.hypot(tx, tz - (-hd + 0.6)) < 2.4) continue; tables.push([tx, tz]); }
        tables.forEach(function (t, i) { G.cyl(t[0], t[1], 0.42, 0.72, 0.76, 12, hx(0xe9e4da), { cap: true }); G.cyl(t[0], t[1], 0.05, 0, 0.72, 6, hx(0x2a2a2c)); [-1, 1].forEach(function (sd) { var cx = t[0] + sd * 0.75; G.box(cx - 0.2, 0, t[1] - 0.2, cx + 0.2, 0.45, t[1] + 0.2, hx(0x8a5a3a)); G.box(cx + sd * 0.16 - 0.03, 0.45, t[1] - 0.2, cx + sd * 0.16 + 0.03, 0.95, t[1] + 0.2, hx(0x8a5a3a)); });
          block.push({ c: t, r: 1.0 }); if (i < 3 && r() < 0.8) people.push(pp('local', 'having a coffee', t[0] + 0.75, t[1], -Math.PI / 2, 'sit', 'sit')); });
        people.push(pp('local', 'behind the counter', 0.2, hd - 0.2, Math.PI, 'stand', 'interact', 'Hello! What can I get you?'));
        sig.push('tables' + tables.length);
      }
    };
    return { name: g.name ? g.name : KIT[g.gk].word, y: 0, at: [0, 0], yh: H, walk: [[-hw + 0.4, -hd + 0.4, hw - 0.4, hd - 0.4]], block: block, spawn: [0, -hd + 2.4, 0], cam: [-hw + C.CAM_M, -hd + C.CAM_M, hw - C.CAM_M, hd - C.CAM_M, H - C.CAM_M],
      links: [{ at: [0, -hd + 0.6], to: 'out', label: '🚪 Out to the street' }], lines: KIT[g.gk].lines, people: people, build: build, sig: hash(sig.join('|') + '|' + people.length) };
  }

  /* ---------- shapes: the walkable floor ---------- */
  function inShape(s, x, z) { if (Array.isArray(s)) return x >= s[0] && x <= s[2] && z >= s[1] && z <= s[3]; if (s.oct) { var ax = Math.abs(x), az = Math.abs(z); return Math.max(ax, az, (ax + az) / Math.SQRT2) <= s.oct; } return Math.hypot(x - s.c[0], z - s.c[1]) <= s.r; }
  function okAt(R, x, z) { var ok = false, i; for (i = 0; i < R.walk.length && !ok; i++) ok = inShape(R.walk[i], x, z); if (!ok) return false; for (i = 0; i < (R.block || []).length; i++) if (inShape(R.block[i], x, z)) return false; return true; }
  function floorOf(R, x, z) { return R.floorAt ? R.floorAt(x, z) : 0; }

  /* ---------- the doors: where they are now (the travel frame), the outside point ---------- */
  var LMDOORS = [];
  function lmDoor(id) { for (var i = 0; i < LMDOORS.length; i++) if (LMDOORS[i].id === id) return LMDOORS[i]; return null; }
  function makeLmDoors() {
    LMDOORS = DEF_IDS.map(function (id) { var D = DEFS[id], f = W.frame({ lat: D.lat, lon: D.lon }), c = Math.cos(D.yaw), s = Math.sin(D.yaw), dx = D.door[0] * c + D.door[1] * s, dz = -D.door[0] * s + D.door[1] * c, ll = W.toLatLon(f, dx, dz), n = norm([dx, 0, dz]);
      return { id: id, kind: 'lm', def: D, lat: ll.lat, lon: ll.lon, e: D.e, name: D.name, nx: n[0], nz: n[2] }; });
  }
  var DP = { x: 0, y: 0, z: 0 };
  function doorWorld(dr, out) { var T = X.TR, p = W.toLocal(T.f, dr.lat, dr.lon); out.x = p.x; out.z = p.z; out.y = Math.max(0, X.travelH(p.x, p.z)) + C.DOOR_Y; return out; }

  /* ---------- the POI feed (world-features.js, its 729 doors): shops, cafés and offices inside a building's footprint ---------- */
  function pip(ring, lon, lat) { var ins = false, n = ring.length / 2; for (var i = 0, j = n - 1; i < n; j = i++) { var xi = ring[2 * i], yi = ring[2 * i + 1], xj = ring[2 * j], yj = ring[2 * j + 1]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) ins = !ins; } return ins; }
  function onFeat(z, x, y, feed) {
    try {
      if (feed && feed.buildings) tallSeen(feed);
      if (!feed || !feed.pois || !feed.pois.length || !feed.buildings) return; st.feedTiles++;
      var B = feed.buildings, boxes = B.map(function (b) { var r = b.rings && b.rings[0]; if (!r || r.length < 6) return null; var a = [1e9, 1e9, -1e9, -1e9]; for (var i = 0; i < r.length; i += 2) { a[0] = Math.min(a[0], r[i]); a[1] = Math.min(a[1], r[i + 1]); a[2] = Math.max(a[2], r[i]); a[3] = Math.max(a[3], r[i + 1]); } return a; });
      var Q0 = window.WFR_QUESTS720, LM = (Q0 && Q0.LANDMARKS) || [];
      feed.pois.forEach(function (q) { var gk = KIND[q.cls]; if (!gk || st.cand.has('g' + q.id)) return; var hit = -1, near = false;
        for (var m = 0; m < LM.length && !near; m++) near = W.distance(q, LM[m]) < C.GEN_R + 250; if (!near) return;   // only near a quest's landmark (a city has thousands of shops)
        for (var i = 0; i < B.length && hit < 0; i++) { var a = boxes[i]; if (!a || q.lon < a[0] || q.lon > a[2] || q.lat < a[1] || q.lat > a[3]) continue; if (pip(B[i].rings[0], q.lon, q.lat)) hit = i; }
        if (hit < 0) return; st.feedPois++;
        st.cand.set('g' + q.id, { id: 'g' + q.id, poi: q.id, gk: gk, name: q.name || null, lat: q.lat, lon: q.lon, ring: Array.prototype.slice.call(B[hit].rings[0]), h: B[hit].h || 8, bid: B[hit].id != null ? B[hit].id : null, door: null }); });
      if (st.cand.size > C.GEN_KEEP) { var it = st.cand.keys(), n = st.cand.size - C.GEN_KEEP; while (n-- > 0) st.cand.delete(it.next().value); }
    } catch (e) { st.fault = 'feed: ' + (e && e.message || e); }
  }
  function genDoor(c) {   // the shopfront nearest the POI: the door just outside it, the room inside behind it, its yaw along the facade (computed once)
    if (c.door) return c.door; var f = W.frame({ lat: c.lat, lon: c.lon }), P = [], i, best = null;
    for (i = 0; i < c.ring.length; i += 2) { var p = W.toLocal(f, c.ring[i + 1], c.ring[i]); P.push([p.x, p.z]); }
    var cx = 0, cz = 0; P.forEach(function (q) { cx += q[0]; cz += q[1]; }); cx /= P.length; cz /= P.length;
    for (i = 0; i < P.length - 1; i++) { var a = P[i], b = P[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], L2 = ex * ex + ez * ez; if (L2 < 4) continue; var t = clamp(-(a[0] * ex + a[1] * ez) / L2, 0.15, 0.85), qx = a[0] + ex * t, qz = a[1] + ez * t, d = Math.hypot(qx, qz);
      if (!best || d < best.d) best = { d: d, qx: qx, qz: qz, ex: ex, ez: ez, L: Math.sqrt(L2) }; }
    if (!best) return null; var L = best.L, nx = -best.ez / L, nz = best.ex / L; if (nx * (best.qx - cx) + nz * (best.qz - cz) < 0) { nx = -nx; nz = -nz; }
    var w = 0, dd = 0; P.forEach(function (q) { var u = (q[0] - best.qx) * best.ex / L + (q[1] - best.qz) * best.ez / L, v = -((q[0] - best.qx) * nx + (q[1] - best.qz) * nz); w = Math.max(w, Math.abs(u)); dd = Math.max(dd, v); });
    var gw = clamp(Math.min(L, w * 2) * 0.85, 8, 18), gd = clamp(dd * 0.85, 7, 14), dl = W.toLatLon(f, best.qx + nx * 0.8, best.qz + nz * 0.8), cl = W.toLatLon(f, best.qx - nx * gd / 2, best.qz - nz * gd / 2);
    c.door = { id: c.id, kind: 'gen', gk: c.gk, name: c.name, e: KIT[c.gk].e, lat: dl.lat, lon: dl.lon, clat: cl.lat, clon: cl.lon, nx: nx, nz: nz, yaw: Math.atan2(-nx, -nz), w: gw, d: gd, h: c.h, poi: c.poi, bid: c.bid };
    return c.door;
  }
  function anchors() {   // the quests near her: every landmark (a quest), and anyone with a quest to give or take (world-quests.js + world-people.js)
    var A = [], Q = window.WFR_QUESTS720, T = X.TR, ll = T && T.ll; if (!ll) return A;
    (Q && Q.LANDMARKS || []).forEach(function (L) { if (W.distance(ll, L) < C.ANCHOR_KM * 1000) A.push({ lat: L.lat, lon: L.lon }); });
    if (Q && X.P && X.P.each && T.f) { var pk = Q.peek(), want = {}; (pk.active || []).forEach(function (a) { if (a.next) want[a.next] = 1; if (a.giver) want[a.giver] = 1; });
      X.P.each(function (id, x, y, z) { if (A.length < 40 && (want[id] || Q.offers(id))) A.push(W.toLatLon(T.f, x, z)); }); }
    return A;
  }
  function selectGen() {
    var A = anchors(), out = [], per = {}, lmL = LMDOORS; if (!A.length) { st.gen = []; return; }
    var list = []; st.cand.forEach(function (c) { var best = 1e9; for (var i = 0; i < A.length; i++) { var d = W.distance(A[i], c); if (d < best) best = d; } if (best > C.GEN_R) return;
      for (i = 0; i < lmL.length; i++) if (W.distance(lmL[i], c) < C.GEN_CLEAR) return; list.push({ c: c, d: best }); });
    list.sort(function (a, b) { return a.d - b.d || (a.c.id < b.c.id ? -1 : 1); });
    for (var i = 0; i < list.length && out.length < C.GEN_MAX; i++) { var c = list[i].c; if ((per[c.gk] || 0) >= C.GEN_PER) continue; var dr = genDoor(c); if (!dr) continue; per[c.gk] = (per[c.gk] || 0) + 1; out.push(dr); }
    st.gen = out;
  }
  function wantPoi(t) {   // world-features asks per z14 tile: read its POIs only near a landmark (the quests)
    try { var Q = window.WFR_QUESTS720, c = { lat: (t.nw.lat + t.se.lat) / 2, lon: (t.nw.lon + t.se.lon) / 2 }; return (Q && Q.LANDMARKS || []).some(function (L) { return W.distance(c, L) < C.ANCHOR_KM * 1000; }); } catch (e) { return false; } }

  /* ---------- the veil (725d's dusk, never the white) and the button (the page's own #read) ---------- */
  function veilEl() { if (st.veil) return st.veil; var v = document.createElement('div'); v.id = 'veil729'; v.setAttribute('aria-hidden', 'true');
    v.style.cssText = 'position:fixed;inset:0;z-index:60;pointer-events:none;opacity:0;transition:opacity 380ms ease;background:radial-gradient(ellipse at 50% 45%,#2a3a62 0%,#141c36 60%,#0b1024 100%)'; document.body.appendChild(v); st.veil = v; return v; }
  function fade(on) { var v = veilEl(); v.style.transition = 'opacity ' + (on ? Math.round(C.FADE_IN * 900) : Math.round(C.FADE_OUT * 1000)) + 'ms ease'; v.style.opacity = on ? '1' : '0'; }
  function setBtn(label) { var b = $('read'); if (!b) return; if (label) { if (b.textContent !== label) b.textContent = label; if (b.hidden) b.hidden = false; st.owned = true; } else if (st.owned) { if (!b.hidden) b.hidden = true; st.owned = false; } }
  function onTap(e) {
    var b = $('read'); if (!st.inited || !st.owned || !b || b.hidden || st.phase) return; if (e && e.type === 'click' && e.detail !== 0) return;
    try {
      if (!st.on) { if (st.near) begin('in', st.near); return; }
      var R = st.cur.R; if (st.link) { begin('link', st.link); return; }
      if (st.person && !R.quiet && !X.S.talking) { var Q = window.WFR_QUESTS720, P = X.P; st.talks++; if (!(Q && Q.talk(st.person))) P.talk(st.person); }
    } catch (err) { st.fault = 'tap: ' + (err && err.message || err); }
  }
  function begin(kind, what) { st.phase = kind; st.phT = 0; st.pend = what; fade(true); ev(kind + ' ' + (what.id || what.to)); if (kind === 'in') st.enterD = st.nearD; }

  /* ---------- building an interior (behind the veil): one mesh per room, the shared material, rooms hosted for the people ---------- */
  function material() { var F = window.WFR_FEATURES, m = F && F.materials && F.materials(); return (m && m.wall) || (X.TR && X.TR.mat) || null; }
  function sunDir() { try { return X.sunDir ? norm(X.sunDir()) : [0.4, 0.8, 0.3]; } catch (e) { return [0.4, 0.8, 0.3]; } }
  function buildRoomGeo(R, seed) { var G = new Geo(); G.yh = R.yh || 6; G.glowN = sunDir(); G.fill = 0.85; R.build(G, rng(seed), { clock: function () { return X.S.clock || 0; } }); return G; }
  function meshOf(G, name) {
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(G.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(G.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(G.uv, 2)); g.setIndex(G.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(G.i, 1) : new THREE.Uint16BufferAttribute(G.i, 1));
    var m = new THREE.Mesh(g, material()); m.name = name; m.frustumCulled = false; m.castShadow = m.receiveShadow = false; m.layers.set(C.LAYER); m.userData.tris = G.i.length / 3; return m; }
  function build(door) {
    var key = door.id; if (st.built.has(key)) { var o = st.built.get(key); st.built.delete(key); st.built.set(key, o); return o; }
    var t0 = now(), def = door.kind === 'lm' ? door.def : null, rooms = def ? def.rooms : [genRoom(door)], grp = new THREE.Group(); grp.name = 'interior729:' + key;
    var out = { id: key, door: door, def: def, rooms: rooms, group: grp, hosts: [], meshes: [], tris: 0, lat: def ? def.lat : door.clat, lon: def ? def.lon : door.clon, yaw: def ? def.yaw : door.yaw, gy: 0, sig: 0 };
    rooms.forEach(function (R, i) { var G = buildRoomGeo(R, hash(key + ':' + i)), h = new THREE.Object3D(); h.name = 'room729:' + key + ':' + i; h.position.set(R.at[0], R.y, R.at[1]); grp.add(h);
      var m = meshOf(G, 'interior729:' + key + ':' + i); m.visible = false; h.add(m); out.hosts.push(h); out.meshes.push(m); out.tris += m.userData.tris; out.sig = hash(out.sig + '|' + G.p.length + '|' + G.i.length + '|' + (R.sig || 0)); });
    st.built.set(key, out); st.buildMs.push(+(now() - t0).toFixed(2));
    while (st.built.size > C.KEEP_BUILT) { var k0 = st.built.keys().next().value, old = st.built.get(k0); if (st.cur && st.cur.I === old) break; st.built.delete(k0); old.meshes.forEach(function (m) { m.geometry.dispose(); }); if (old.group.parent) old.group.parent.remove(old.group); }   // geometries only: the shared material is never disposed (a disposed material kills its shared program)
    return out;
  }
  function placeGroup(I) { var p = W.toLocal(X.TR.f, I.lat, I.lon); I.group.position.set(p.x, I.gy, p.z); I.group.rotation.y = I.yaw; I.group.updateMatrixWorld(true); }
  function peopleFor(I, ri) {   // the room's people as a world-people place hosted by the room (none in a quiet room)
    var P = X.P, R = I.rooms[ri], id = 'i729:' + I.id + ':' + ri; dropPeople(); if (!P || !P.addPlace || R.quiet || !R.people || !R.people.length) return;
    P.addPlace({ id: id, name: (I.def ? I.def.name : (I.door.name || KIT[I.door.gk].word)), lat: I.lat, lon: I.lon, r: 60, folk: 'all', lines: R.lines || null,
      host: function () { return st.cur && st.cur.I === I && st.cur.ri === ri && I.group.parent ? I.hosts[ri] : null; }, ground: function (lx, lz) { return floorOf(R, lx, lz); },
      build: function (p, r, make) { if (typeof make !== 'function') return; R.people.forEach(function (q) { make(r, { role: q.role, title: q.title, x: q.x, z: q.z, yaw: q.yaw, kind: q.kind, clip: q.clip, line: q.line }); }); } });
    st.placeId = id;
  }
  function dropPeople() { if (st.placeId && X.P && X.P.dropPlace) X.P.dropPlace(st.placeId); st.placeId = null; }

  /* ---------- in, between rooms, out ---------- */
  function hideUi(on) {   // indoors: no Flap, no Attack, no Zoom (walking and looking only); each put back as it was
    if (on) { st.hidden = []; ['flap', 'atkBtn', 'zoom'].forEach(function (id) { var e = $(id); if (e && !e.hidden) { e.hidden = true; st.hidden.push(e); } }); }
    else if (st.hidden) { st.hidden.forEach(function (e) { e.hidden = false; }); st.hidden = null; } }
  function toRoom(I, ri, how) {
    var R = I.rooms[ri]; I.meshes.forEach(function (m, k) { m.visible = k === ri; }); st.cur.ri = ri; st.cur.R = R; st.cur.lx = R.spawn[0]; st.cur.lz = R.spawn[1]; st.cur.yaw = R.spawn[2]; st.cur.cut = true; st.cur.moved = 0;
    peopleFor(I, ri); placeHer(0, true); st.atView = null;
    var nm = (I.def ? I.def.e + ' ' + I.def.name.replace(/^the /, 'The ') + ' · ' : (I.door.e + ' ')) + R.name; try { X.toast(R.hush ? R.hush : (I.def ? nm : nm + (R.lines ? '' : '')), 2600); } catch (e) { /* no toast */ }
    ev('room ' + I.id + ':' + ri + ' ' + how);
  }
  function doEnter(door) {
    var S = X.S, T = X.TR, I = build(door); var g = W.toLocal(T.f, I.lat, I.lon); I.gy = Math.max(0, X.travelH(g.x, g.z));
    X.scene.add(I.group); placeGroup(I); st.on = true; st.cur = { I: I, ri: 0, R: null, lx: 0, lz: 0, yaw: 0, cut: true, moved: 0 };
    S.mode = 'walk'; S.speed = 0; S.pitch = 0; S.yawV = 0; S.hopY = 0; hideUi(true); st.enters++; st.lastEnter = { id: door.id, kind: door.kind, d: st.enterD != null ? +st.enterD.toFixed(2) : null, t: +(S.t || 0).toFixed(2) };
    toRoom(I, 0, 'enter');
    if (door.kind === 'lm') { var Q = window.WFR_QUESTS720; try { if (Q && Q.inside) st.lastQuest = Q.inside(door.id); } catch (e) { st.fault = 'quest: ' + (e && e.message || e); } }
    st.visited = st.visited || {}; st.visited[door.id] = (st.visited[door.id] || 0) + 1;
  }
  function doExit(why) {
    var S = X.S, I = st.cur && st.cur.I; if (!I) { st.on = false; return; }
    var d = I.door, p = doorWorld(d, { x: 0, y: 0, z: 0 }), ox = p.x + d.nx * C.EXIT_OUT, oz = p.z + d.nz * C.EXIT_OUT, gy = Math.max(0, X.travelH(ox, oz));
    teardown(); S.mode = 'fly'; S.speed = C.EXIT_V; S.pitch = 0.05; S.yawV = 0; S.yaw = Math.atan2(d.nx, d.nz); S.pos.set(ox, gy + C.EXIT_UP, oz);
    var b = X.bird(); if (b) { b.position.copy(S.pos); b.rotation.set(0, S.yaw, 0); }
    var cam = X.camera; cam.position.set(S.pos.x - Math.sin(S.yaw) * 6, S.pos.y + 2.4, S.pos.z - Math.cos(S.yaw) * 6); cam.lookAt(S.pos.x + Math.sin(S.yaw) * 6, S.pos.y + 1, S.pos.z + Math.cos(S.yaw) * 6);
    if (X.TR.camOff) X.TR.camOff.copy(cam.position).sub(S.pos);
    st.exits++; st.lastExit = { id: d.id, why: why, at: [+ox.toFixed(2), +(gy + C.EXIT_UP).toFixed(2), +oz.toFixed(2)], door: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], t: +(S.t || 0).toFixed(2) }; ev('exit ' + d.id + ' ' + why);
  }
  function teardown() { var I = st.cur && st.cur.I; dropPeople(); if (I) { if (I.group.parent) I.group.parent.remove(I.group); I.meshes.forEach(function (m) { m.visible = false; }); } hideUi(false); st.on = false; st.cur = null; st.link = null; st.person = null; setBtn(null); }

  /* ---------- walking inside (the island's numbers) ---------- */
  var V = null, V2 = null;
  function local2world(I, ri, x, y, z, out) { out.set(x, y, z); I.hosts[ri].updateMatrixWorld(true); return out.applyMatrix4(I.hosts[ri].matrixWorld); }
  function placeHer(dt, cut) {
    var S = X.S, c = st.cur, I = c.I, R = c.R, size = X.size(), stand = X.standOf(); if (!V) { V = new THREE.Vector3(); V2 = new THREE.Vector3(); }
    placeGroup(I); var fy = floorOf(R, c.lx, c.lz);
    local2world(I, c.ri, c.lx, fy + stand, c.lz, V); S.pos.copy(V); S.yaw = c.yaw + I.yaw;
    var b = X.bird(); if (b) { b.position.copy(S.pos); b.rotation.set(0, S.yaw, 0); }
    var back = 2.2 + 2 * size, up = 0.9 + 1.2 * size, cx = c.lx - Math.sin(c.yaw) * back, cz = c.lz - Math.cos(c.yaw) * back, K = R.cam;
    cx = clamp(cx, K[0], K[2]); cz = clamp(cz, K[1], K[3]); var cyl = fy + stand + up, cfl = floorOf(R, cx, cz);
    if (R.camLow != null) cyl = clamp(cyl, cfl + R.camLow, cfl + R.camHigh); cyl = Math.min(cyl, K[4]);
    local2world(I, c.ri, cx, cyl, cz, V2); var cam = X.camera;
    if (cut || c.cut) cam.position.copy(V2); else cam.position.lerp(V2, Math.min(1, dt * 5)); c.cut = false;
    local2world(I, c.ri, c.lx + Math.sin(c.yaw) * 1.6, fy + stand + 0.35, c.lz + Math.cos(c.yaw) * 1.6, V2); cam.lookAt(V2);
  }
  function frame(dt) {
    if (!st.inited || !st.on) return false;
    var t0 = now(), S = X.S;
    try {
      if (!X.TR.on) { teardown(); return false; }
      if (S.mode === 'fly' || S.mode === 'hover' || S.mode === 'landing') { st.external++; ev('external ' + S.mode); teardown(); return false; }   // a Drop here, Fly home or anything else that moved her out: let it
      if (S.mode === 'paused' || S.mode === 'menu') return true;
      var c = st.cur, R = c.R, sx = 0, sy = 0;
      if (!st.phase && !S.talking) { var s = X.steer(); sx = s.sx; sy = s.sy; }
      c.yaw -= sx * C.TURN * dt; var step = (sy >= 0 ? sy * 5.5 : sy * 2.5) * (0.6 + X.size()) * dt * C.WALK_K, nx = c.lx + Math.sin(c.yaw) * step, nz = c.lz + Math.cos(c.yaw) * step, x0 = c.lx, z0 = c.lz;
      if (okAt(R, nx, nz)) { c.lx = nx; c.lz = nz; } else if (okAt(R, nx, c.lz)) c.lx = nx; else if (okAt(R, c.lx, nz)) c.lz = nz;
      var moved = Math.hypot(c.lx - x0, c.lz - z0); c.moved += moved;
      placeHer(dt, false);
      var rig = X.rig(), B = X.birdObj(), go;
      if (window.WFR_BIRDS && WFR_BIRDS.walk && rig && B) { var ws = moved > 1e-4 && dt > 0 ? Math.min(12, moved / dt) * (sy < 0 ? -1 : 1) : 0; go = WFR_BIRDS.walk(rig, dt, { speed: ws, turn: S.talking ? 0 : sx, air: false, rest: false, still: !!S.talking, shake: false }); B.position.y += go.y * X.size(); B.rotation.x = go.pitch; B.rotation.z = go.roll; B.rotation.y += go.yaw; }
      var wg = X.wings ? X.wings() : null; if (wg && wg[0] && wg[1]) { var fo = S.fold = (S.fold || 0) + (1 - (S.fold || 0)) * Math.min(1, dt * 6); wg[0].rotation.x *= 1 - fo; wg[1].rotation.x *= 1 - fo; wg[0].rotation.y = 1.3 * fo; wg[1].rotation.y = -1.3 * fo; wg[0].rotation.z = wg[0].rotation.z * (1 - fo) - 0.18 * fo; wg[1].rotation.z = wg[1].rotation.z * (1 - fo) + 0.18 * fo; }   // refine-1: folded after the gait by the island's own rule (S.fold eased to 1; rotation.y is the rig's fold, the hand tucks from it)
      if (R.view && Math.hypot(c.lx - R.view.at[0], c.lz - R.view.at[1]) < (R.view.r || C.VIEW_R)) { if (!st.atView) { st.atView = { room: c.I.id + ':' + c.ri, name: R.view.name, t: +(S.t || 0).toFixed(2) }; st.viewsSeen[c.I.id + ':' + c.ri] = 1; ev('view ' + R.view.name); } } else st.atView = null;
    } catch (e) { st.fault = 'frame: ' + (e && e.message || e); try { teardown(); } catch (e2) { /* the flight takes over */ } return false; }
    var ms = now() - t0; st.ms.push(ms); if (st.ms.length > 4000) st.ms.shift(); if (ms > st.msMax) st.msMax = ms;
    return true;
  }

  /* ---------- the tick (both zones): the fades, the doors near her, the button, the tags ---------- */
  var MV = null;
  function tick(dt) {
    if (!st.inited) return; var t0 = now(), S = X.S, T = X.TR;
    try {
      signals(); towers();
      if (!T || !T.on || !T.f) { if (st.on) teardown(); if (st.phase) { st.phase = null; fade(false); } if (st.owned) setBtn(null); hideMarks(); st.near = null; return; }
      if (st.phase) { st.phT += dt;
        if (st.phase === 'in' || st.phase === 'link') { if (st.phT >= C.FADE_IN) { var k = st.phase, w = st.pend; st.phase = 'reveal'; st.phT = 0;
            if (k === 'in') doEnter(w); else if (w.to === 'out') doExit('door'); else { toRoom(st.cur.I, w.to, 'link'); st.links++; }
            fade(false); } }
        else if (st.phase === 'reveal' && st.phT >= C.FADE_OUT + 0.2) { st.phase = null; st.pend = null; } }   // the CSS fade (FADE_OUT) ends inside the phase: no open-air frame ever carries the veil
      if ((st.genT -= dt) <= 0) { st.genT = C.SEL_EVERY; selectGen(); }
      var doors = st.doorsNow; doors.length = 0;
      var fly = S.mode === 'fly', hz = fly ? (S.speed || 0) * Math.cos(S.pitch || 0) * dt : 0, ex = S.pos.x + Math.sin(S.yaw) * hz, ez = S.pos.z + Math.cos(S.yaw) * hz, ey = S.pos.y + (fly ? (S.speed || 0) * Math.sin(S.pitch || 0) * dt : 0);   // where she will be when this frame is drawn (the flight moves her after this tick): the button answers THAT place, not the last one
      if (!st.on) { var all = LMDOORS.concat(st.gen), ll = T.ll; for (var i = 0; i < all.length; i++) { var dr = all[i]; if (ll && W.distance(ll, dr) > C.NEAR_DOORS + 200) continue; var p = doorWorld(dr, { x: 0, y: 0, z: 0 }); p.dr = dr; p.dh = Math.hypot(p.x - ex, p.z - ez); p.d = Math.hypot(p.dh, p.y - ey); doors.push(p); } }
      if (st.on) { var c = st.cur, R = c.R, lab = null; st.link = null; st.person = null;
        if (!st.phase && !S.talking) { for (var j = 0; j < (R.links || []).length; j++) { var L = R.links[j]; if (Math.hypot(c.lx - L.at[0], c.lz - L.at[1]) < C.LINK_R) { st.link = L; lab = L.label; break; } }
          if (!lab && !R.quiet && X.P && X.P.near) { var tg = X.P.near(S); if (tg) { st.person = tg; lab = '💬 Talk'; } } }
        setBtn(lab); hideMarks(); }
      else {
        var best = null; for (i = 0; i < doors.length; i++) if (!best || doors[i].d < best.d) best = doors[i];
        var can = S.mode === 'fly' && !S.talking && !st.phase && !(window.WFR_FAST725D && WFR_FAST725D.state && WFR_FAST725D.state().drop.phase);
        if (!can || !best) { st.near = null; st.nearD = best ? best.d : null; }
        else if (st.near && st.near === best.dr && best.d < C.HIDE) st.nearD = best.d;
        else if (best.d < C.SHOW) { st.near = best.dr; st.nearD = best.d; }
        else { st.near = null; st.nearD = best.d; }
        setBtn(st.near ? '🚪 Enter' : null); marks(doors);
      }
    } catch (e) { st.fault = 'tick: ' + (e && e.message || e); }
    var ms = now() - t0; st.ms.push(ms); if (st.ms.length > 4000) st.ms.shift(); if (ms > st.msMax) st.msMax = ms;
  }
  function nearestDoor(x, z, y) { var D = st.doorsNow, b = null, bd = 1e9; for (var i = 0; i < D.length; i++) { var d = Math.hypot(D[i].x - x, D[i].z - z); if (d < bd) { bd = d; b = D[i]; } } return b ? { p: b, dh: bd, d3: y == null ? bd : Math.hypot(bd, b.y - y) } : null; }
  function floor(x, z) {   // tf723Floor: near a door the flight floor comes down to the doorstep, blended back to the travel floor over 15 m
    if (!st.inited || st.on || !X.TR || !X.TR.on) return null; var n = nearestDoor(x, z); if (!n || n.dh > C.APPROACH + C.BLEND) return null;
    var base = X.floorBase ? X.floorBase() : 30; return C.FLOOR_NEAR + (base - C.FLOOR_NEAR) * smooth((n.dh - C.APPROACH) / C.BLEND); }
  function cap(speed, pos, yaw) {   // the door draws her in: closing on a door she slows, to 1 m/s at its step
    if (!st.inited || st.on || !X.TR || !X.TR.on || !pos) return speed; var n = nearestDoor(pos.x, pos.z, pos.y); if (!n || n.d3 > C.APPROACH) return speed;
    var dx = n.p.x - pos.x, dz = n.p.z - pos.z, l = Math.hypot(dx, dz) || 1, toward = (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / l; if (toward < 0.2) return speed;
    return Math.min(speed, Math.max(C.CAP_MIN, C.CAP_K * (n.d3 - C.CAP_PAD))); }

  /* ---------- the door tags (DOM over the canvas: no mesh, no program) ---------- */
  function marksEl() { if (st.markEl) return st.markEl; var s = document.createElement('style'); s.id = 'i729css';
    s.textContent = '.i729m{position:fixed;left:0;top:0;z-index:4;pointer-events:none;padding:3px 7px;border-radius:12px;background:rgba(20,24,40,.62);color:#fff7e6;font:700 12px/1.2 system-ui,sans-serif;white-space:nowrap;box-shadow:0 0 0 1.5px rgba(227,183,90,.85);will-change:transform}'; document.head.appendChild(s);
    var m = document.createElement('div'); m.id = 'i729marks'; document.body.appendChild(m); for (var i = 0; i < C.POOL; i++) { var k = document.createElement('div'); k.className = 'i729m'; k.hidden = true; k.setAttribute('aria-hidden', 'true'); m.appendChild(k); st.marks.push(k); } st.markEl = m; return m; }
  function hideMarks() { for (var i = 0; i < st.marks.length; i++) if (!st.marks[i].hidden) st.marks[i].hidden = true; }
  function marks(doors) {
    marksEl(); if (!MV) MV = new THREE.Vector3(); var S = X.S, used = 0, w = innerWidth, h = innerHeight, list = doors.filter(function (p) { return p.dh < C.MARK_R; }).sort(function (a, b) { return a.dh - b.dh; });
    if (S.mode === 'fly' && !st.phase) for (var i = 0; i < list.length && used < C.POOL; i++) { var p = list[i]; MV.set(p.x, p.y + 1.6, p.z).project(X.camera); if (MV.z > 1 || MV.x < -1.1 || MV.x > 1.1 || MV.y < -1.1 || MV.y > 1.1) continue;
      var el = st.marks[used++], txt = p.dr.e + ' 🚪' + (p.dr.kind === 'lm' ? '' : p.dr.name ? ' ' + p.dr.name : ''); if (el.textContent !== txt) el.textContent = txt;
      el.style.transform = 'translate(' + ((MV.x + 1) / 2 * w).toFixed(0) + 'px,' + ((1 - MV.y) / 2 * h).toFixed(0) + 'px) translate(-50%,-100%)'; if (el.hidden) el.hidden = false; }
    for (var k = used; k < st.marks.length; k++) if (!st.marks[k].hidden) st.marks[k].hidden = true; st.marksShown = used;
  }

  /* ---------- the crowds of the Asian cities (world-people.js places, seeded by their ids) and the Scramble's light ---------- */
  var NAMES_JP = ['Haruto', 'Yui', 'Sota', 'Hina', 'Ren', 'Aoi', 'Yuto', 'Mei', 'Kaito', 'Sakura', 'Riku', 'Yuna', 'Takumi', 'Rin'], NAMES_CN = ['Wei', 'Li Na', 'Hao', 'Xiu', 'Jun', 'Mei', 'Lei', 'Fang', 'Chen', 'Yan', 'Bo', 'Ling'];
  var XC = { P: 50, G: 24, HALF: 20, ROT: 20 * Math.PI / 180, PER: 10, lat: 35.65950, lon: 139.70055 };   // the Scramble: a 50 s cycle, 24 s of walking (DRAFT)
  function crossLight(t) { var n = Math.floor(t / XC.P), ph = t - n * XC.P; return { green: ph < XC.G, ph: ph, n: n }; }
  function crossPos(sp, t, out) {   // world-people's posNow for a crosser: at a corner on red, across on green, every cycle the other way
    var c = sp.cross, L = crossLight(t), side = (L.n + c.k) & 1, prog = L.green ? clamp((L.ph - c.delay) * c.v, 0, c.L) : c.L, s = side ? c.L - prog : prog, P = sp.path, dx = P[2] - P[0], dz = P[3] - P[1];
    var moving = L.green && prog > 0 && prog < c.L, dir = prog < c.L ? (side ? -1 : 1) : (side ? 1 : -1); st.crossT = t;
    out[0] = P[0] + dx * s / c.L; out[1] = P[1] + dz * s / c.L; out[2] = Math.atan2(dx * dir, dz * dir); var cl = moving ? 'walk' : 'idle'; if (sp.clip !== cl) sp.clip = cl; return out; }
  function rot(x, z, a) { var c = Math.cos(a), s = Math.sin(a); return [x * c + z * s, -x * s + z * c]; }
  function crowdSpots(make, r, names, spots, line) {   // squares and streets, as world-people's spots, with the place's own names and words
    spots.forEach(function (s) { for (var j = 0; j < s.n; j++) { var u = r(), nm = pick(r, names);
      if (s.to) { var t = r(), x = s.x + (s.to[0] - s.x) * t, z = s.z + (s.to[1] - s.z) * t, side = (r() < 0.5 ? -1 : 1) * (2 + r() * 3), dx = s.to[0] - s.x, dz = s.to[1] - s.z, l = Math.hypot(dx, dz) || 1, ox = dz / l * side, oz = -dx / l * side;
        if (u < 0.6) make(r, { role: 'walker', title: 'out walking', name: nm, line: pick(r, line), path: new Float32Array([s.x + ox, s.z + oz, s.to[0] + ox, s.to[1] + oz]) }); else make(r, { role: 'local', title: s.title || 'out and about', name: nm, line: pick(r, line), x: x + ox, z: z + oz, kind: 'stand', clip: u < 0.8 ? 'idle' : 'interact', yaw: Math.atan2(-ox, -oz) }); }
      else { var a = r() * Math.PI * 2, d = Math.sqrt(r()) * s.r, px = s.x + Math.cos(a) * d, pz = s.z + Math.sin(a) * d;
        if (u < 0.35) { var a2 = r() * Math.PI * 2, L2 = 12 + r() * 25; make(r, { role: 'walker', title: 'out walking', name: nm, line: pick(r, line), path: new Float32Array([px, pz, px + Math.cos(a2) * L2, pz + Math.sin(a2) * L2]) }); }
        else make(r, { role: 'local', title: s.title || 'out and about', name: nm, line: pick(r, line), x: px, z: pz, kind: u < 0.5 ? 'sit' : 'stand', clip: u < 0.5 ? 'sit' : u < 0.75 ? 'idle' : u < 0.9 ? 'interact' : 'wave', yaw: r() * Math.PI * 2 }); } } }); }
  var CROWDS = [
    { id: 'scramble729', name: 'the Shibuya Crossing', lat: XC.lat, lon: XC.lon, r: 400, names: NAMES_JP, lines: ['Wait for the green, then everybody goes!', 'Over two thousand people cross here at once.', 'Hachiko the faithful dog has a statue just over there.'],
      build: function (p, r, make, C2) { var H = XC.HALF, cs = [[-H, -H], [H, -H], [H, H], [-H, H]].map(function (q) { return rot(q[0], q[1], XC.ROT); }), paths = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]];
        paths.forEach(function (pq, pi) { for (var k = 0; k < XC.PER; k++) { var A = cs[pq[0]], B = cs[pq[1]], dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, j = (r() * 2 - 1) * 2.5, a0 = r() * 1.6 + 0.4, b0 = r() * 1.6 + 0.4;
          var p0 = [A[0] - ux * a0 - uz * j, A[1] - uz * a0 + ux * j], p1 = [B[0] + ux * b0 - uz * j, B[1] + uz * b0 + ux * j], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), delay = r() * 3, v = Math.max(1.2 + r() * 0.5, L / (XC.G - delay - 2));
          var sp = make(r, { role: 'walker', title: 'crossing the Scramble', name: pick(r, NAMES_JP), line: pick(r, C2.lines), path: new Float32Array([p0[0], p0[1], p1[0], p1[1]]), v: v });
          if (sp) { sp.cross = { L: L, v: v, delay: delay, k: (k + pi) & 1, path: pi }; sp.v = v; } } });
        crowdSpots(make, r, NAMES_JP, [{ x: rot(-34, 26, XC.ROT)[0], z: rot(-34, 26, XC.ROT)[1], r: 14, n: 14, title: 'by Hachiko' }], C2.lines); } },
    { id: 'bund729', name: 'the Bund', lat: 31.24030, lon: 121.49060, r: 900, names: NAMES_CN, lines: ['The old banks on this side, the towers of Pudong across the river.', 'Everyone comes here to see the lights at night.', 'That pink tower is the Oriental Pearl.'],
      build: function (p, r, make, C2) { crowdSpots(make, r, NAMES_CN, [{ x: 30, z: -500, to: [70, 520], n: 46, title: 'on the promenade' }, { x: 55, z: 0, r: 30, n: 22, title: 'taking photos' }, { x: 40, z: -300, r: 22, n: 12, title: 'taking photos' }], C2.lines); } },
    { id: 'shinjuku729', name: 'Shinjuku Station', lat: 35.69000, lon: 139.70060, r: 600, names: NAMES_JP, lines: ['The busiest station in the world! Millions a day.', 'Which exit? There are over two hundred.', 'Kabukicho is just north of here.'],
      build: function (p, r, make, C2) { crowdSpots(make, r, NAMES_JP, [{ x: 0, z: 0, r: 45, n: 40, title: 'at the station' }, { x: -60, z: -80, to: [80, -80], n: 18 }, { x: 90, z: -120, to: [90, 120], n: 14 }], C2.lines); } },
    { id: 'kabukicho729', name: 'Kabukicho', lat: 35.69440, lon: 139.70280, r: 500, names: NAMES_JP, lines: ['Look up: there is a Godzilla on that roof!', 'This street never sleeps.', 'Ramen? The best is down that alley.'],
      build: function (p, r, make, C2) { crowdSpots(make, r, NAMES_JP, [{ x: -120, z: 40, to: [120, 40], n: 22 }, { x: 0, z: -120, to: [0, 140], n: 18 }, { x: 10, z: 30, r: 25, n: 12, title: 'under the neon' }], C2.lines); } }
  ];
  function registerCrowds() {
    var P = X.P; if (!P || !P.addPlace) return;
    CROWDS.forEach(function (c) { P.addPlace({ id: c.id, name: c.name, lat: c.lat, lon: c.lon, r: c.r, folk: 'all', lines: c.lines, build: function (p, r, make) { if (typeof make === 'function') c.build(p, r, make, c); else st.noMaker = true; } }); });
  }
  function crossPeek() {   // the bench's read: the light now, and every drawn crosser's place along its own crossing (what SHIPS: world-people's drawn positions)
    var T = X.TR; if (!T || !T.on || !T.f || !X.P || !X.P.each) return null; var o = W.toLocal(T.f, XC.lat, XC.lon), out = [], L = crossLight(st.crossT || 0);
    X.P.each(function (id, x, y, z, sp) { if (!sp || !sp.cross) return; var P = sp.path, lx = x - o.x, lz = z - o.z, dx = P[2] - P[0], dz = P[3] - P[1], l = Math.hypot(dx, dz), s = ((lx - P[0]) * dx + (lz - P[1]) * dz) / l, off = Math.abs((lx - P[0]) * dz - (lz - P[1]) * dx) / l;
      out.push({ id: id, s: +s.toFixed(2), L: +l.toFixed(2), off: +off.toFixed(2), clip: sp.clip }); });
    return { t: st.crossT || 0, green: L.green, ph: +L.ph.toFixed(2), n: out.length, people: out };
  }
  var SIG = null;
  function signals() {   // the Scramble's walk signals at its four corners: posts, a red head, a green head (three small meshes, near her only)
    var T = X.TR; if (!T || !T.on || !T.f) { if (SIG) SIG.g.visible = false; return; } var o = W.toLocal(T.f, XC.lat, XC.lon), d = Math.hypot(o.x - X.S.pos.x, o.z - X.S.pos.z);
    if (d > 700) { if (SIG) SIG.g.visible = false; return; }
    if (!SIG) { var g = new THREE.Group(); g.name = 'scramble729:signals'; var Gp = new Geo(), Gr = new Geo(), Gg = new Geo(); Gr.glowN = Gg.glowN = sunDir();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) { var c = rot(q[0] * (XC.HALF + 2.5), q[1] * (XC.HALF + 2.5), XC.ROT); Gp.cyl(c[0], c[1], 0.09, 0, 3.4, 6, hx(0x4a4c50)); Gp.box(c[0] - 0.28, 2.4, c[1] - 0.28, c[0] + 0.28, 3.4, c[1] + 0.28, hx(0x2a2a2c));
        Gr.box(c[0] - 0.3, 2.95, c[1] - 0.3, c[0] + 0.3, 3.35, c[1] + 0.3, hx(0xff3a30), { glow: true }); Gg.box(c[0] - 0.3, 2.45, c[1] - 0.3, c[0] + 0.3, 2.85, c[1] + 0.3, hx(0x30e070), { glow: true }); });
      SIG = { g: g, posts: meshOf(Gp, 'scramble729:posts'), red: meshOf(Gr, 'scramble729:red'), green: meshOf(Gg, 'scramble729:green') }; g.add(SIG.posts, SIG.red, SIG.green); SIG.posts.visible = true; X.scene.add(g); }
    var gy = Math.max(0, X.travelH(o.x, o.z)), L = crossLight(st.crossT || 0); SIG.g.visible = true; SIG.g.position.set(o.x, gy, o.z); SIG.g.updateMatrixWorld(true); SIG.red.visible = !L.green; SIG.green.visible = L.green;
  }

  /* ---------- the towers the map does not draw (OpenMapTiles marks them hide_3d): low-poly, recognisable, shown only where no tall extrusion stands ---------- */
  var TOWERS = [
    { id: 'tokyotower', lat: 35.65858, lon: 139.74543, h: 333, build: function (G) { var k, OR = hx(0xe8502a), WH = hx(0xf2f0ea), half = function (y) { return y < 250 ? 40 - 35 * y / 250 : 5; };
        for (k = 0; k < 10; k++) { var y0 = k * 25, y1 = y0 + 25, a = half(y0), b = half(y1), col = k % 2 ? WH : OR;
          [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (q) { G.beam([q[0] * a, y0, q[1] * a], [q[0] * b, y1, q[1] * b], 2.2 - k * 0.12, col); });
          square(G, 1, function (ax, az, bx, bz) { G.beam([ax * a, y0, az * a], [bx * b, y1, bz * b], 0.7, col); G.beam([bx * a, y0, bz * a], [ax * b, y1, az * b], 0.7, col); }); }
        G.box(-13, 143, -13, 13, 160, 13, WH, { bottom: true }); G.box(-6.5, 246, -6.5, 6.5, 254, 6.5, WH, { bottom: true }); for (k = 0; k < 6; k++) G.cyl(0, 0, 2.2 - k * 0.3, 254 + k * 13, 267 + k * 13, 8, k % 2 ? WH : OR); } },
    { id: 'pearl', lat: 31.23972, lon: 121.49972, h: 468, build: function (G) { var k, PK = hx(0xc23a6a), CO = hx(0xd8d4cc), sph = function (cy, r, col) { var pr = []; for (var i = 0; i <= 10; i++) { var a = -Math.PI / 2 + i / 10 * Math.PI; pr.push([Math.cos(a) * r, Math.sin(a) * r + r]); } G.lathe(0, 0, pr, 18, col, cy - r); };
        for (k = 0; k < 3; k++) { var a = k / 3 * Math.PI * 2; G.cyl(Math.cos(a) * 9, Math.sin(a) * 9, 4.5, 0, 295, 10, CO); G.beam([Math.cos(a) * 60, 0, Math.sin(a) * 60], [Math.cos(a) * 14, 88, Math.sin(a) * 14], 6, CO); }
        sph(93, 25, PK); sph(272, 22.5, PK); G.cyl(0, 0, 6, 295, 335, 10, CO); sph(342, 7, PK); G.cyl(0, 0, 3, 349, 410, 8, CO); G.cyl(0, 0, 1.2, 410, 468, 6, CO); } },
    { id: 'shtower', lat: 31.23350, lon: 121.50550, h: 632, build: function (G) { var N = 24, M = 28, k, j, pts = [];
        for (j = 0; j <= N; j++) { var y = j / N * 600, s = 1 - 0.45 * j / N, tw = j / N * Math.PI * 2 / 3, ring = []; for (k = 0; k < M; k++) { var a = k / M * Math.PI * 2, rr = 37 * s * (1 + 0.12 * Math.cos(3 * a)); ring.push([Math.cos(a + tw) * rr, y, Math.sin(a + tw) * rr]); } pts.push(ring); }
        for (j = 0; j < N; j++) for (k = 0; k < M; k++) { var A = pts[j][k], B = pts[j][(k + 1) % M], Cc = pts[j + 1][(k + 1) % M], D = pts[j + 1][k], mid = [(A[0] + Cc[0]) / 2, 0, (A[2] + Cc[2]) / 2]; G.poly([A, B, Cc, D], j % 4 === 3 ? hx(0x6e8aa0) : hx(0x9fb8cc), mid); }
        G.poly(pts[N].slice(), hx(0x8a9aa8), UP); for (k = 0; k < M; k += 2) { var P0 = pts[N][k]; G.beam(P0, [P0[0] * 0.8, 632, P0[2] * 0.8], 0.8, hx(0xb8c4cc)); } } },
    { id: 'skytree', lat: 35.71006, lon: 139.81070, h: 634, build: function (G) { var N = 14, M = 24, k, j, pts = [];
        for (j = 0; j <= N; j++) { var y = j / N * 340, t = j / N, ring = []; for (k = 0; k < M; k++) { var a = k / M * Math.PI * 2, rr = (34 - 22 * t) * (1 + 0.22 * (1 - t) * Math.cos(3 * a)); ring.push([Math.cos(a) * rr, y, Math.sin(a) * rr]); } pts.push(ring); }
        for (j = 0; j < N; j++) for (k = 0; k < M; k++) { var A = pts[j][k], B = pts[j][(k + 1) % M], Cc = pts[j + 1][(k + 1) % M], D = pts[j + 1][k]; G.poly([A, B, Cc, D], (j + k) % 2 ? hx(0xd9e2ea) : hx(0xb9c6d2), [(A[0] + Cc[0]) / 2, 0, (A[2] + Cc[2]) / 2]); }
        G.cyl(0, 0, 17, 340, 356, 24, hx(0x8fa4b4), { cap: true }); G.cyl(0, 0, 11, 356, 445, 16, hx(0xd9e2ea)); G.cyl(0, 0, 12.5, 445, 452, 20, hx(0x8fa4b4), { cap: true }); G.cyl(0, 0, 5, 452, 560, 10, hx(0xd9e2ea)); G.cyl(0, 0, 2, 560, 634, 8, hx(0xe8ecf0)); } }
  ];
  var TW = {};
  function towers() {
    var T = X.TR, on = T && T.on && T.f && T.ll;
    TOWERS.forEach(function (tw) { var o = TW[tw.id], near = on && W.distance(T.ll, tw) < 30000, want = near && !st.osmTall[tw.id];
      if (!want) { if (o && o.m.visible) o.m.visible = false; return; }
      if (!o) { var G = new Geo(); G.yh = tw.h; tw.build(G); o = TW[tw.id] = { m: meshOf(G, 'tower729:' + tw.id) }; X.scene.add(o.m); }
      var p = W.toLocal(T.f, tw.lat, tw.lon); o.m.position.set(p.x, Math.max(0, X.travelH(p.x, p.z)) - 0.5, p.z); o.m.updateMatrixWorld(true); if (!o.m.visible) o.m.visible = true; });
  }
  function tallSeen(feed) {   // a drawn extrusion at least 60% of a tower's height within 80 m of it: the map already shows it; no model
    (feed.buildings || []).forEach(function (b) { if (!(b.h > 150)) return; var r = b.rings && b.rings[0]; if (!r) return; var lo = 0, la = 0; for (var i = 0; i < r.length; i += 2) { lo += r[i]; la += r[i + 1]; } lo /= r.length / 2; la /= r.length / 2;
      TOWERS.forEach(function (tw) { if (b.h >= 0.6 * tw.h && W.distance({ lat: la, lon: lo }, tw) < 80) st.osmTall[tw.id] = b.h; }); }); }

  /* ---------- world-quests.js's doors ---------- */
  function questFor(id, day) { var D = DEFS[id]; if (!D) return null; return { id: 'in:' + id, kind: 'in', lm: id, giver: null, gname: null, e: '🚪', title: D.quest[0], line: D.quest[1], legs: [{ k: 'in', lm: id }], leg: 0, xp: C.XP, runes: C.RUNES, day: day || 0 }; }
  var K1 = { k1: true };
  function k1() { return st.inited && (st.on || st.phase === 'reveal') ? K1 : null; }   // the travel ground's update: one true-scale depth round her while she is inside (Dunn's own option, TF723.stOpt); the shrink would put every wall behind the 1 m near plane
  function doorAt(id, out) { var d = lmDoor(id); if (!d || !st.inited || !X.TR || !X.TR.on || !X.TR.f) return null; return doorWorld(d, out); }
  function doorLL(id) { var d = lmDoor(id); return d ? { lat: d.lat, lon: d.lon, e: '🚪' } : null; }

  /* ---------- the page's calls ---------- */
  function init(ctx) {
    if (st.inited) return; X = ctx; THREE = ctx.THREE; W = window.WFR_WORLD;
    try {
      if (!W) { st.fault = 'no WFR_WORLD'; return; } makeLmDoors();
      var b = $('read'); if (b) { b.addEventListener('pointerdown', onTap); b.addEventListener('click', onTap); }
      registerCrowds();
      var F = window.WFR_FEATURES; if (F && F.onTile) { F.onTile(onFeat); if (F.wantPoi) F.wantPoi(wantPoi); else st.noPoi = true; }
      st.inited = true;
    } catch (e) { st.fault = 'init: ' + (e && e.message || e); }
  }
  function peek() {
    var b = $('read'), c = st.cur, v = st.veil ? +getComputedStyle(st.veil).opacity : 0;
    return { inited: st.inited, fault: st.fault, on: st.on, phase: st.phase, enters: st.enters, exits: st.exits, links: st.links, talks: st.talks, external: st.external, lastEnter: st.lastEnter, lastExit: st.lastExit, lastQuest: st.lastQuest,
      near: st.near ? { id: st.near.id, kind: st.near.kind } : null, nearD: st.nearD != null ? +st.nearD.toFixed(3) : null, btn: b ? { owned: st.owned, hidden: b.hidden, label: b.textContent } : null, veil: v, veilBg: st.veil ? st.veil.style.background : null,
      cur: c ? { id: c.I.id, ri: c.ri, room: c.R.name, quiet: !!c.R.quiet, local: [+c.lx.toFixed(3), +c.lz.toFixed(3), +c.yaw.toFixed(3)], link: st.link ? st.link.label : null, person: st.person ? st.person.id : null, sig: c.I.sig, tris: c.I.tris, people: (X.P && X.P.roster && st.placeId) ? X.P.roster(st.placeId) : null,
        links: (c.R.links || []).map(function (L) { return { at: L.at, to: L.to, label: L.label }; }), view: c.R.view ? { at: c.R.view.at, name: c.R.view.name } : null } : null,
      atView: st.atView, views: Object.keys(st.viewsSeen), gen: st.gen.map(function (d) { return { id: d.id, gk: d.gk, name: d.name, lat: +d.lat.toFixed(6), lon: +d.lon.toFixed(6), w: +d.w.toFixed(1), d: +d.d.toFixed(1), bid: d.bid }; }),
      cand: st.cand.size, osmTall: Object.assign({}, st.osmTall), towers: Object.keys(TW).filter(function (k) { return TW[k].m.visible; }), signals: !!(SIG && SIG.g.visible), feedTiles: st.feedTiles, feedPois: st.feedPois, noPoi: !!st.noPoi, built: Array.from(st.built.keys()), buildMs: st.buildMs.slice(-6), marks: st.marksShown || 0, events: st.events.slice(-14) };
  }
  function doorPeek(id) { var d = lmDoor(id) || st.gen.filter(function (g) { return g.id === id; })[0]; if (!d || !X.TR || !X.TR.on) return null; var p = doorWorld(d, { x: 0, y: 0, z: 0 }), S = X.S;
    return { id: d.id, kind: d.kind, lat: d.lat, lon: d.lon, p: [p.x, p.y, p.z], out: [p.x + d.nx * C.EXIT_OUT, p.z + d.nz * C.EXIT_OUT], n: [d.nx, d.nz], d: Math.hypot(p.x - S.pos.x, p.y - S.pos.y, p.z - S.pos.z), dh: Math.hypot(p.x - S.pos.x, p.z - S.pos.z) }; }
  function msStats(reset) { var a = st.ms.slice().sort(function (x, y) { return x - y; }), q = function (p) { return a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(3) : null; }, o = { n: a.length, med: q(0.5), p95: q(0.95), max: a.length ? +a[a.length - 1].toFixed(3) : null }; if (reset) { st.ms = []; st.msMax = 0; } return o; }
  function selfTest() {   // every room of every landmark, and one of each everyday kind: built (no scene), finite, its spawn, links and view on its floor
    var out = []; function chk(id, R, i) { var G = new Geo(); G.yh = R.yh || 6; G.glowN = [0.3, 0.9, 0.3]; R.build(G, rng(hash(id + ':' + i)), { clock: function () { return 600; } });
      var bad = 0; for (var k = 0; k < G.p.length; k++) if (!isFinite(G.p[k])) bad++; for (k = 0; k < G.n.length; k++) if (!isFinite(G.n[k])) bad++;
      var pts = [['spawn', R.spawn]].concat((R.links || []).map(function (L) { return ['link ' + L.label, L.at]; })).concat(R.view ? [['view', R.view.at]] : []), reach = {};
      pts.forEach(function (q) { var x = q[1][0], z = q[1][1], ok = okAt(R, x, z), r = q[0] === 'spawn' ? 0 : (q[0] === 'view' ? (R.view.r || C.VIEW_R) : C.LINK_R) - 0.15;   // a link or view counts if a walkable point lies within its radius
        if (!ok && r > 0) for (var a = 0; a < 24 && !ok; a++) for (var rr = 0.2; rr <= r && !ok; rr += 0.2) ok = okAt(R, x + Math.cos(a / 24 * Math.PI * 2) * rr, z + Math.sin(a / 24 * Math.PI * 2) * rr); reach[q[0]] = ok; });
      var linkAtSpawn = (R.links || []).filter(function (L) { return Math.hypot(R.spawn[0] - L.at[0], R.spawn[1] - L.at[1]) < C.LINK_R; }).map(function (L) { return L.label; });
      out.push({ id: id, room: i, name: R.name, tris: G.i.length / 3, verts: G.p.length / 3, bad: bad, reach: reach, ok: bad === 0 && Object.keys(reach).every(function (k2) { return reach[k2]; }) && !linkAtSpawn.length && G.i.length > 0, linkAtSpawn: linkAtSpawn, quiet: !!R.quiet, people: (R.people || []).length }); }
    DEF_IDS.forEach(function (id) { DEFS[id].rooms.forEach(function (R, i) { chk(id, R, i); }); });
    ['office', 'shop', 'cafe'].forEach(function (gk, i) { chk('kit:' + gk, genRoom({ id: 'g' + (1000 + i), gk: gk, w: 8 + i * 4, d: 7 + i * 3, h: 12, name: null }), 0); });
    return out;
  }

  return { C: C, DEFS: DEFS, LANDMARKS: LANDMARKS, crossPos: crossPos, crossPeek: crossPeek, crossLight: crossLight, XC: XC, init: init, tick: tick, frame: frame, k1: k1, floor: floor, cap: cap, questFor: questFor, doorAt: doorAt, doorLL: doorLL, peek: peek, doorPeek: doorPeek, msStats: msStats, selfTest: selfTest,
    genSig: function (id) { var c = st.cand.get(id); if (!c) return null; var d = genDoor(c); return d ? genRoom(d).sig : null; } };
})();
