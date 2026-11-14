/* world-sky756.js - BOARD 756, CLOUDS TO FLY THROUGH AND THE RINGS, OUT OVER THE WORLD (Wings for Rouge). Trunks, Nov 7 2026. Every number and word DRAFT (unmeasured on her phone).
   Marth, Nov 7 2026, verbatim: "Just realized there are no clouds to fly thru over the sea lmaoo. I understand if it’s a clear day but there’s none whatsoever. Dang God is so Perfect. The best we can do is try to remember everything he naturally made in the world + wha manmade." and "+ the rings in the air are nowhere to be found".

   WHY THERE WERE NONE: the island's eight clouds live within 300 m of home at 70-96 m, and the rune course hangs over the sky island, shown only from the temple. Nothing was ever put over the sea, on either side of the gate.

   WHAT ROUGE SEES past the island's edge and past the gate: cumulus banks at four heights, white in the sun, blue-grey underneath, world-fixed, so she flies toward them, under them, over them and through them.
   A pass is soft: the near puffs thin away, a light mist comes and goes, nothing bonks. More cloud over warm seas, less over cold water and land; a bank's day comes from the day's weather; about one clear day in three has almost none.
   Gold rings stand in short lines on the routes between real ports along the coasts, and on spokes out from home. Flying through one pays a rune (S.runes, the one coin); a whole line pays a bonus. They come back the next day.

   BORROWED (MBAEEMP): the puffs are Kenney's Smoke Particles, White puff (CC0, www.kenney.nl; the licence in the pack and on the OpenGameArt page, MANIFEST unit 756; tools/bake-puffs756.js packs four into assets/sky756/puffs.png).
   The ports are world-traffic.js's Natural Earth table (public domain). The shrink and curve, the seeds, the lat/lon cells and the scene.onBeforeRender placing are world-traffic.js's. The ring is runes.js's halo with its rune inside; a ring pays the same S.runes. The mist is climb712Veil's own div, under the same cap of half.
   New, the glue: the two small shaders (a billboard, a hoop), the bank's shape, the routes.

   THE COST, limits set before the first run: 2 draws, 2 programs compiled at load, caps of 260 sprites (520 triangles) and 48 rings (under 10,000 triangles), one 512 x 512 texture, nothing in the shadow pass. Lists refreshed twice a second. A fault takes the sky away, never the game.
   THE PAGE HANDS IT (tools/wiring/wire-756-sky.js): WFR_SKY756.init(ctx) once, tick(dt) each frame. ctx = { THREE, scene, renderer, camera, S, TR: TRAVEL712, sun, sunI, wx, open, classic, H, pay, toast, tone, save } */
window.WFR_SKY756 = (function () {
  'use strict';
  var C = { LAYER: 7, REFRESH: 0.5, NEW_CELLS: 16, KEEP: 500, SHOW0: 1100, SHOW1: 2400, ORDER_FAR: -9.32, ORDER_HOME: 5,
    CELL: 0.12, R: 38000, LOD: 9000, LOD2: 22000, CAP: 260, PER_CELL: 2, HOME_KM: 5.5, EASE: 0.35, FOG0: 9000, FOG1: 42000, FOG_MAX: 0.82, VEIL: 0.42,
    BANDS: [[200, 340, 0.2, 0.4], [520, 1000, 0.34, 0.65], [1500, 2600, 0.26, 1], [3300, 4300, 0.2, 1.25]], W: [620, 1800], P_CLEAR: 0.3, COVER: { clear: 0.07, fair: 0.42, big: 0.64, drizzle: 0.6, rain: 0.74, pour: 0.84, storm: 0.95 },
    RING_R: 10, RING_GAP: 55, RING_N: 8, RING_CAP: 48, LINES: 6, LINE_R: 26000, RING_FAR0: 700, RING_FARK: 1100, RING_FOG: 0.5, BONUS: 5, PICK: 1.2, JUMP: 2500, SEEN_M: 1800,
    STEP_KM: 8, LINK_MIN: 25, LINK_MAX: 260, LINKS: 2, P_LINE: 0.6, SPOKES: 6, SPOKE_KM: 900, SPOKE_SEP: 0.87, SPOKE_FROM: 4, LINE_ALT: [[120, 320, 0.6, 1], [900, 1500, 0.25, 2], [3000, 4000, 0.15, 5]] };
  var D2R = Math.PI / 180, M_DEG = 111200, NL = String.fromCharCode(10);
  var X = null, st = { inited: false, enabled: true, fault: null, mode: 'off', t: 0, acc: 0, zone: 0, cells: new Map(), banks: [], lines: [], cache: new Map(), spokes: [], ports: null, links: new Map(), day: null, cover: 0, force: { cover: null }, veil: 0, veilEl: null, inK: 0, prev: null, got: 0, lineDone: 0, ms: [], msMax: 0, placeMs: 0, U: null, seenOn: false };

  /* ---------- seeds (world-traffic.js's: the same place, the same sky, on every visit and every phone) ---------- */
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function kmTo(aLat, aLon, bLat, bLon) { var dl = ((bLon - aLon + 540) % 360) - 180, dx = dl * Math.cos((aLat + bLat) / 2 * D2R), dy = bLat - aLat; return Math.sqrt(dx * dx + dy * dy) * M_DEG / 1000; }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function bandOf(r, B) { var acc = 0; for (var i = 0; i < B.length; i++) { acc += B[i][2]; if (r < acc) return B[i]; } return B[B.length - 1]; }

  /* ---------- how much cloud: the day's weather, then the sea under it ---------- */
  function dayCover(w) {
    if (st.force.cover != null) return st.force.cover;
    if (w.kind !== 'clear') return C.COVER[w.level] || C.COVER[w.kind] || C.COVER.rain;
    var d = rng(hash('day756/' + w.day))(); return d < C.P_CLEAR ? C.COVER.clear : d < 0.75 ? C.COVER.fair : C.COVER.big;
  }
  function warmth(lat) { var a = Math.abs(lat); return a <= 20 ? 1.3 : a >= 45 ? 0.65 : 1.3 - (a - 20) / 25 * 0.65; }   // sea warmth by latitude: warm water feeds cloud, cold water starves it
  function coverAt(base, lat, land) { return st.force.cover != null ? base : Math.min(0.97, base * warmth(lat) * (land ? 0.75 : 1)); }

  /* ---------- a bank: a flat-based heap of puffs, from its own seed ---------- */
  function bankOf(ci, cj, n) {
    var g = C.CELL, r = rng(hash('c756/' + ci + '/' + cj + '/' + n)), la = (ci + r()) * g, lo = (cj + r()) * g, dice = r(), band = bandOf(r(), C.BANDS), base = band[0] + r() * (band[1] - band[0]), W = (C.W[0] + r() * (C.W[1] - C.W[0])) * band[3], Hh = W * (0.42 + 0.34 * r()), turn = r() * 6.283, cs = Math.cos(turn), sn = Math.sin(turn), N = 12 + Math.floor(W / 150), P = new Float32Array(N * 7), lobes = [];
    for (var i = 0; i < 3; i++) lobes.push([(r() - 0.5) * 1.2 * W, (r() - 0.5) * 0.7 * W, 0.6 + 0.4 * r()]);   // three heads, so a bank is a skyline and not a dome
    for (var k = 0; k < N; k++) { var a = r() * 6.283, rr = Math.sqrt(r()), px = Math.cos(a) * rr * W, pz = Math.sin(a) * rr * W * 0.68, top = 0;
      for (i = 0; i < 3; i++) { var dx = px - lobes[i][0], dz = pz - lobes[i][1]; top = Math.max(top, lobes[i][2] * Math.exp(-(dx * dx + dz * dz) / (W * W * 0.22))); }
      var hf = Math.min(1, top * (0.25 + 0.75 * r())), rad = W * (0.26 + 0.2 * r()) * (0.75 + 0.5 * top), o = k * 7;
      P[o] = px * cs - pz * sn; P[o + 1] = rad * 0.3 + hf * Hh; P[o + 2] = px * sn + pz * cs; P[o + 3] = rad; P[o + 4] = Math.floor(r() * 4); P[o + 5] = hf; P[o + 6] = r() * 6.283; }
    return { id: ci + '/' + cj + '/' + n, lat: la, lon: lo, dice: dice, base: base, W: W, H: Hh, P: P, n: N, a: 0, want: 0, land: null, d: 0, fresh: true };
  }
  function cellOf(ci, cj, f, T) { var out = []; for (var n = 0; n < C.PER_CELL; n++) { var b = bankOf(ci, cj, n); if (kmTo(b.lat, b.lon, WFR_WORLD.HOME.lat, WFR_WORLD.HOME.lon) < C.HOME_KM + b.W / 1000) continue; if (T.st && T.on) { var p = WFR_WORLD.toLocal(f, b.lat, b.lon); b.land = T.st.H(p.x, p.z) > 2; } else b.land = false; out.push(b); } return out; }

  /* ---------- the routes: real ports, each to its nearest neighbours along the coast; spokes from home ---------- */
  function portsLoad() { var A = window.WFR_TRAFFIC && WFR_TRAFFIC.tables && WFR_TRAFFIC.tables.PORTS; st.ports = []; if (A) for (var i = 0; i + 1 < A.length; i += 2) st.ports.push({ lat: A[i] / 100, lon: A[i + 1] / 100, i: i >> 1 }); }
  function linksOf(p) {   // read once a port, then kept
    var L = st.links.get(p.i); if (L) return L; var near = [];
    for (var i = 0; i < st.ports.length; i++) { var q = st.ports[i]; if (q === p) continue; var d = kmTo(p.lat, p.lon, q.lat, q.lon); if (d >= C.LINK_MIN && d <= C.LINK_MAX) near.push({ q: q, d: d }); }
    near.sort(function (a, b) { return a.d - b.d; }); L = near.slice(0, C.LINKS); st.links.set(p.i, L); return L;
  }
  function spokesBuild() {   // from home toward the nearest ports, no two on nearly the same bearing, so a line of rings waits on most ways she can leave
    var H = WFR_WORLD.HOME, near = []; for (var i = 0; i < st.ports.length; i++) { var q = st.ports[i], d = kmTo(H.lat, H.lon, q.lat, q.lon); if (d <= C.SPOKE_KM) near.push({ q: q, d: d, b: Math.atan2((q.lon - H.lon) * Math.cos(H.lat * D2R), q.lat - H.lat) }); }
    near.sort(function (a, b) { return a.d - b.d; }); var out = [];
    for (i = 0; i < near.length && out.length < C.SPOKES; i++) { var ok = true; for (var k = 0; k < out.length; k++) if (Math.abs(Math.atan2(Math.sin(near[i].b - out[k].b), Math.cos(near[i].b - out[k].b))) < C.SPOKE_SEP) ok = false; if (ok) out.push(near[i]); }
    st.spokes = out;
  }
  function lineAt(id, aLat, aLon, bLat, bLon, u, seed) {   // one line of rings at u along a route: world-fixed, from its own seed; a taken ring stays taken until tomorrow
    var L = st.cache.get(id); if (L) return L;
    var r = rng(hash('r756/' + seed)), band = bandOf(r(), C.LINE_ALT), g = band[3], la = aLat + (bLat - aLat) * u, lo = aLon + (((bLon - aLon + 540) % 360) - 180) * u, e = 0.02;
    L = { id: id, lat: la, lon: lo, lat2: la + (bLat - aLat) * e, lon2: lo + (((bLon - aLon + 540) % 360) - 180) * e, alt: band[0] + r() * (band[1] - band[0]), g: g, amp: (8 + 14 * r()) * g, ph: r() * 6.283, gap: C.RING_GAP * g, R: C.RING_R * g, alive: new Uint8Array(C.RING_N).fill(1), pop: new Float32Array(C.RING_N), h: new Float32Array(C.RING_N), got: 0, d: 0 };
    st.cache.set(id, L); return L;
  }
  function near(lat, lon) {   // the nearest lines she could reach, on the spokes and the coastal links
    var out = [], R = C.LINE_R / 1000, H = WFR_WORLD.HOME, s, i, k, seen = {};
    for (s = 0; s < st.spokes.length; s++) { var sp = st.spokes[s], n = Math.floor(sp.d / C.STEP_KM); for (k = 0; k < n; k++) { var km = C.SPOKE_FROM + k * C.STEP_KM, u = km / sp.d; if (u >= 1) break; var la = H.lat + (sp.q.lat - H.lat) * u, lo = H.lon + (sp.q.lon - H.lon) * u, d = kmTo(lat, lon, la, lo); if (d <= R) { var L = lineAt('s' + sp.q.i + '/' + k, H.lat, H.lon, sp.q.lat, sp.q.lon, u, 's' + sp.q.i + '/' + k); L.d = d; out.push(L); } } }
    for (i = 0; i < st.ports.length; i++) { var p = st.ports[i]; if (kmTo(lat, lon, p.lat, p.lon) > C.LINK_MAX + R) continue; var links = linksOf(p);
      for (var j = 0; j < links.length; j++) { var q = links[j].q, D = links[j].d, a = Math.min(p.i, q.i), b = Math.max(p.i, q.i), key = a + '-' + b; if (seen[key]) continue; seen[key] = 1; var A = p.i === a ? p : q, B = p.i === a ? q : p, m = Math.floor(D / C.STEP_KM);
        for (k = 1; k < m; k++) { var seed = 'l' + key + '/' + k; if (rng(hash('p756/' + seed))() >= C.P_LINE) continue; var u2 = k * C.STEP_KM / D, la2 = A.lat + (B.lat - A.lat) * u2, lo2 = A.lon + (((B.lon - A.lon + 540) % 360) - 180) * u2, d2 = kmTo(lat, lon, la2, lo2); if (d2 > R) continue; var L2 = lineAt(seed, A.lat, A.lon, B.lat, B.lon, u2, seed); L2.d = d2; out.push(L2); } } }
    return out.sort(function (a2, b2) { return a2.d - b2.d; }).slice(0, C.LINES);
  }
  var FR = { a: { x: 0, z: 0 }, dx: 0, dz: 0 };
  function lineFrame(L, f) { var a = WFR_WORLD.toLocal(f, L.lat, L.lon), b = WFR_WORLD.toLocal(f, L.lat2, L.lon2), dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; FR.a = a; FR.dx = dx / l; FR.dz = dz / l; return FR; }
  function ringAt(L, n, F, o) { var al = (n - (C.RING_N - 1) / 2) * L.gap, sd = L.amp * Math.sin(n * 0.8 + L.ph); o.x = F.a.x + F.dx * al + F.dz * sd; o.z = F.a.z + F.dz * al - F.dx * sd; o.y = L.alt + L.h[n] + L.amp * 0.35 * Math.cos(n * 0.8 + L.ph); return o; }

  /* ---------- the lists, twice a second ---------- */
  function refresh(f, T) {
    var S = X.S, ll = WFR_WORLD.toLatLon(f, S.pos.x, S.pos.z), lat = ll.lat, lon = ll.lon, w = X.wx(), base = dayCover(w), g = C.CELL, cs = Math.max(0.1, Math.cos(lat * D2R)), nI = Math.ceil(C.R / (g * M_DEG)), nJ = Math.min(14, Math.ceil(C.R / (g * M_DEG * cs))), ci = Math.floor(lat / g), cj = Math.floor(lon / g), budget = C.NEW_CELLS, out = [], i, j, k;
    st.cover = base; if (st.day !== w.day) { st.day = w.day; st.cache.forEach(function (L) { L.alive.fill(1); L.got = 0; }); }
    for (i = -nI; i <= nI; i++) for (j = -nJ; j <= nJ; j++) { var key = (ci + i) + '/' + (cj + j), c = st.cells.get(key); if (c === undefined) { if (budget <= 0) continue; budget--; c = cellOf(ci + i, cj + j, f, T); st.cells.set(key, c); }
      for (k = 0; k < c.length; k++) { var b = c[k]; b.d = kmTo(lat, lon, b.lat, b.lon) * 1000; if (b.d > C.R + b.W) continue; b.want = b.dice < coverAt(base, b.lat, b.land) ? 1 : 0; if (b.fresh) { b.fresh = false; b.a = b.want; } if (b.want || b.a > 0.01) out.push(b); } }
    st.banks = out.sort(function (p, q) { return p.d - q.d; }); if (st.cells.size > C.KEEP) st.cells.clear();
    st.lines = near(lat, lon); for (i = 0; i < st.lines.length; i++) { var L = st.lines[i], F = lineFrame(L, f), o = { x: 0, y: 0, z: 0 }; for (k = 0; k < C.RING_N; k++) { ringAt(L, k, F, o); L.h[k] = Math.max(0, X.H(o.x, o.z) || 0); } }
    if (st.cache.size > 400) { var keep = new Set(st.lines); st.cache.forEach(function (L2, id) { if (!keep.has(L2) && !L2.got) st.cache.delete(id); }); }
  }

  /* ---------- a ring flown through: the segment since the last frame, so no speed tunnels it ---------- */
  var O = { x: 0, y: 0, z: 0 };
  function pick(f) {
    var S = X.S, W = WFR_WORLD, ll = W.toLatLon(f, S.pos.x, S.pos.z), pv = st.prev; st.prev = { lat: ll.lat, lon: ll.lon, y: S.pos.y }; if (!pv || S.mode !== 'fly') return;
    var a = W.toLocal(f, pv.lat, pv.lon), sx = S.pos.x - a.x, sy = S.pos.y - pv.y, sz = S.pos.z - a.z, l2 = sx * sx + sy * sy + sz * sz, nearM = 1e9; if (l2 > C.JUMP * C.JUMP) return;
    for (var i = 0; i < st.lines.length; i++) { var L = st.lines[i], F = lineFrame(L, f); for (var n = 0; n < C.RING_N; n++) { if (!L.alive[n]) continue; ringAt(L, n, F, O);
      var t = l2 > 0 ? Math.max(0, Math.min(1, ((O.x - a.x) * sx + (O.y - pv.y) * sy + (O.z - a.z) * sz) / l2)) : 0, dx = a.x + sx * t - O.x, dy = pv.y + sy * t - O.y, dz = a.z + sz * t - O.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d < nearM) nearM = d;
      if (d < L.R * C.PICK) { L.alive[n] = 0; L.pop[n] = 0.3; L.got++; st.got++; X.pay(1); X.tone(1568 + 90 * n, 0, 0.08, 'triangle', 0.04); if (L.got === C.RING_N) { st.lineDone++; X.pay(C.BONUS); X.tone(2093, 0, 0.2, 'triangle', 0.05); X.toast('✦ A whole line! +' + C.BONUS + ' runes. ' + (S.runes || 0) + ' now', 2200); X.save(); } else X.toast('✦ ' + (S.runes || 0), 800); } } }
    if (nearM < C.SEEN_M && !st.seenOn) { st.seenOn = true; S.seen = S.seen || {}; if (!S.seen.rings756) { S.seen.rings756 = 1; X.save(); X.toast('Gold rings on the route. Fly through them: each one is a rune.', 4200); } }
  }

  /* ---------- the mist of a pass: how far inside a bank she is ---------- */
  function inside(f) {
    var S = X.S, k = 0; for (var i = 0; i < st.banks.length; i++) { var b = st.banks[i]; if (b.d > 3500 || b.a < 0.2) continue; var p = WFR_WORLD.toLocal(f, b.lat, b.lon), dx = (S.pos.x - p.x) / b.W, dz = (S.pos.z - p.z) / b.W, dy = (S.pos.y - b.base - b.H * 0.45) / (b.H * 0.72), q = dx * dx + dz * dz + dy * dy; k = Math.max(k, b.a * (1 - smooth(0.25, 0.8, q))); }
    return S.mode === 'fly' ? k : 0;
  }
  function veilTick(dt) {
    st.veil += (st.inK * C.VEIL * st.zone - st.veil) * Math.min(1, dt * 2.2); var v = st.veilEl; if (st.veil < 0.004) st.veil = 0; if (!v && st.veil <= 0) return;
    if (!v) { v = document.createElement('div'); v.id = 'veil756'; v.setAttribute('aria-hidden', 'true'); v.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:#ffffff;opacity:0'; var at = document.getElementById('vig700') || document.getElementById('c'); if (at) at.after(v); else document.body.appendChild(v); st.veilEl = v; }   // climb712Veil's place: the canvas keeps its neighbour
    var s = st.veil.toFixed(3); if (v.style.opacity !== s) v.style.opacity = s; var c = st.U && st.U.lit.value, css = c ? 'rgb(' + Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255) + ')' : '#fff'; if (st.veilCss !== css) { st.veilCss = css; v.style.background = css; }
  }

  /* ---------- the two programs ---------- */
  var VS_CLOUD = ['attribute vec3 aC; attribute vec4 aP; attribute vec3 aQ;', 'uniform vec3 uEye; uniform vec3 uSun; uniform float uInvK; uniform float uR;', 'varying vec2 vUv; varying vec2 vL; varying vec2 vS; varying float vA; varying float vH; varying float vFog; varying float vB; varying float vSz;',
    'void main() {', '  vec3 r = aC - uEye; float dh = length( r.xz ); r.y -= dh * dh / ( 2.0 * uR );', '  float dist = length( r ), rad = aP.x;',
    '  vA = aP.y * smoothstep( 0.28 * rad, 0.95 * rad, dist ); vH = aP.z; vUv = vec2( 0.0 ); vL = vec2( 0.0 ); vS = vec2( 0.0 ); vFog = 0.0; vB = 1.0; vSz = 1.0;', '  if ( vA < 0.004 ) { gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 ); return; }',
    '  vec4 mv = viewMatrix * vec4( uEye + r * uInvK, 1.0 );', '  float c = cos( aP.w ), s = sin( aP.w ); vec2 q = vec2( c * position.x - s * position.y, s * position.x + c * position.y );', '  mv.xy += q * rad * uInvK; gl_Position = projectionMatrix * mv; gl_Position.z = min( gl_Position.z, gl_Position.w * 0.99999 );',
    '  vUv = ( position.xy * 0.5 + 0.5 ) * 0.5 + aQ.xy * 0.5; vL = q; vec3 sv = ( viewMatrix * vec4( uSun, 0.0 ) ).xyz; vS = sv.xy; vSz = sv.z; vB = ( aQ.z + q.y * rad ) / rad;', '  vFog = ' + C.FOG_MAX.toFixed(2) + ' * smoothstep( ' + C.FOG0.toFixed(1) + ', ' + C.FOG1.toFixed(1) + ', dist );', '}'].join(NL);
  /* 790 A2 (Nov 13): the near banks PAINTED, as COO's first layer: the puff's edge crisp but soft (was a 0.04-0.8 smoke ramp), the light in two soft
     bands (a lit top, a cool underside), and a flat base: a puff's part below its bank's floor fades out (vB: height over the floor, in puff radii) */
  var FS_CLOUD_756 = ['uniform sampler2D uMap; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uFogC;', 'varying vec2 vUv; varying vec2 vL; varying vec2 vS; varying float vA; varying float vH; varying float vFog; varying float vB;',
    'void main() {', '  vec4 t = texture2D( uMap, vUv ); float a = smoothstep( 0.04, 0.8, t.a ) * vA; if ( a < 0.004 ) discard;', '  float l = 0.34 + 0.62 * vH + 0.34 * vL.y + 0.24 * dot( vL, vS ) + 0.22 * ( t.r - 0.8 );',
    '  vec3 col = mix( uShade, uLit, clamp( l, 0.0, 1.0 ) ); gl_FragColor = vec4( mix( col, uFogC, vFog ), a );', '}'].join(NL);   // the 756 smoke, kept only as the guard's control ('nopaint')
  var SW790 = (function () { try { return localStorage.getItem('wfr.sky790') || ''; } catch (e) { return ''; } })();   // the guard's switches (sky790.js): 'nodome', 'nopaint', 'noskyink'
  var FS_CLOUD = ['uniform sampler2D uMap; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uFogC;', 'varying vec2 vUv; varying vec2 vL; varying vec2 vS; varying float vA; varying float vH; varying float vFog; varying float vB; varying float vSz;',
    'void main() {', '  vec4 t = texture2D( uMap, vUv ); float r = length( vL ), e = r - ( 0.8 + 0.22 * ( t.a - 0.6 ) );', '  float a = ( 1.0 - smoothstep( -0.05, 0.025, e ) ) * smoothstep( -0.02, 0.16, vB ) * vA; if ( a < 0.004 ) discard;',
    '  vec3 n = vec3( vL / 0.84, 0.0 ); n.z = sqrt( max( 0.0, 1.0 - dot( n.xy, n.xy ) ) ); float w = dot( n, normalize( vec3( vS.xy, vSz ) ) ) * 0.5 + 0.5;',
    '  float l = smoothstep( 0.46, 0.54, w * ( 0.82 + 0.36 * vH ) ) * ( 1.0 - smoothstep( 0.12, -0.04, vB ) );', '  vec3 col = mix( uShade, uLit, l );',
    '  col = mix( col, uShade * 0.34, 0.8 * smoothstep( -0.085, -0.045, e ) );', '  gl_FragColor = vec4( mix( col, uFogC, vFog ), a );', '}'].join(NL);   // two flat tones and an ink rim (COO's clouds)
  var VS_RING = ['attribute vec3 color; attribute float aSpin; attribute vec3 aC; attribute vec4 aD;', 'uniform vec3 uEye; uniform float uInvK; uniform float uR; uniform float uT;', 'varying vec3 vC; varying float vA; varying float vFog;',
    'void main() {', '  vec3 r = aC - uEye; float dh = length( r.xz ); r.y -= dh * dh / ( 2.0 * uR ); float dist = length( r );', '  vec3 p = position; if ( aSpin > 0.5 ) { float c = cos( uT * 2.0 ), s = sin( uT * 2.0 ); p = vec3( c * p.x + s * p.z, p.y, c * p.z - s * p.x ); }',
    '  float far = 1.0 + max( 0.0, dist - ' + C.RING_FAR0.toFixed(1) + ' ) / ' + C.RING_FARK.toFixed(1) + ', size = aD.z * far * ( 1.0 + 0.7 * ( 1.0 - aD.w ) );', '  vec3 side = vec3( aD.y, 0.0, -aD.x ), fwd = vec3( aD.x, 0.0, aD.y ), v = side * p.x + vec3( 0.0, p.y, 0.0 ) + fwd * p.z;',
    '  gl_Position = projectionMatrix * viewMatrix * vec4( uEye + ( r + v * size ) * uInvK, 1.0 ); gl_Position.z = min( gl_Position.z, gl_Position.w * 0.99999 );', '  vC = color * ( 0.8 + 0.2 * normal.y ); vA = aD.w; vFog = ' + C.RING_FOG.toFixed(2) + ' * smoothstep( ' + C.FOG0.toFixed(1) + ', ' + C.FOG1.toFixed(1) + ', dist );', '}'].join(NL);
  var FS_RING = ['uniform vec3 uFogC; uniform float uDim;', 'varying vec3 vC; varying float vA; varying float vFog;', 'void main() { if ( vA < 0.01 ) discard; gl_FragColor = vec4( mix( vC * uDim, uFogC, vFog ), vA ); }'].join(NL);

  function ringGeo(THREE) {   // runes.js's halo (a gold torus) with its rune (a flat octahedron, its colour) in the middle, one body
    var a = new THREE.TorusGeometry(1, 0.075, 5, 20), b = new THREE.OctahedronGeometry(0.26, 0); b.scale(0.75, 1, 0.3);
    var A = a.index ? a.toNonIndexed() : a, B = b.index ? b.toNonIndexed() : b, na = A.attributes.position.count, nb = B.attributes.position.count, P = new Float32Array((na + nb) * 3), Nn = new Float32Array((na + nb) * 3), Cc = new Float32Array((na + nb) * 3), Sp = new Float32Array(na + nb);
    P.set(A.attributes.position.array, 0); P.set(B.attributes.position.array, na * 3); Nn.set(A.attributes.normal.array, 0); Nn.set(B.attributes.normal.array, na * 3);
    var gold = new THREE.Color(0xffd24a), rune = new THREE.Color(0x7ff0dc); for (var i = 0; i < na + nb; i++) { var c = i < na ? gold : rune; Cc[i * 3] = c.r; Cc[i * 3 + 1] = c.g; Cc[i * 3 + 2] = c.b; if (i >= na) Sp[i] = 1; }
    var g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); g.setAttribute('aSpin', new THREE.BufferAttribute(Sp, 1));
    a.dispose(); b.dispose(); return g;
  }
  function inst(THREE, g, name, cap, n) { var at = new THREE.InstancedBufferAttribute(new Float32Array(cap * n), n); at.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, at); return at; }

  /* ---------- the drawing: every frame, after the recentre (scene.onBeforeRender, as world-traffic.js) ---------- */
  var TMP = new Float32Array(C.CAP * 9), KEY = new Float32Array(C.CAP), ORD = [], byFar = function (a, b) { return KEY[b] - KEY[a]; };
  function clearAll() { if (st.gc) st.gc.instanceCount = 0; if (st.gr) st.gr.instanceCount = 0; }
  function paint(on) {   // the light of the moment: the game's own sun and haze
    var U = st.U, s = Math.max(0, Math.min(1.2, X.sunI())), fc = X.scene.fog ? X.scene.fog.color : null, L = light806();
    U.lit.value.copy(L.lit.value); U.shade.value.copy(L.shade.value); if (fc) U.fogC.value.copy(fc);   // 806 seam a: the banks take the deck's own lit and shade (one light, domeLight)
    U.sun.value.copy(X.sun.position).sub(X.sun.target.position).normalize(); U.dim.value = 0.55 + 0.45 * Math.min(1, s);
    var T = X.TR; U.eye.value.copy(on ? T.u.uEye.value : X.camera.position); U.invK.value = on ? T.u.uInvK.value : 1; U.R.value = on ? st.REFR : 1e30; U.t.value = st.t;
    st.matC.transparent = !on; st.meshC.renderOrder = on ? C.ORDER_FAR : C.ORDER_HOME;   // past the gate the ground's depth is cleared at -9.3: the clouds go in just before, so a mountain hides them and she is never under them; at home, the plain transparent pass
  }
  function place() {
    if (!st.inited) return; var t0 = performance.now();
    try {
      if (!st.enabled || st.mode === 'off') { clearAll(); return; }
      var T = X.TR, on = st.mode === 'travel', f = on ? T.f : WFR_WORLD.HOMEF, W = WFR_WORLD, eye = on ? T.u.uEye.value : X.camera.position, n = 0, i, k; paint(on);
      for (i = 0; i < st.banks.length && n < C.CAP; i++) { var b = st.banks[i], p = W.toLocal(f, b.lat, b.lon), d = Math.hypot(p.x - eye.x, p.z - eye.z), fade = b.a * (1 - smooth(C.R * 0.8, C.R, d)) * st.zone; if (fade < 0.01) continue; var lod = d > C.LOD2 ? 3 : d > C.LOD ? 2 : 1, big = lod === 3 ? 1.65 : lod === 2 ? 1.35 : 1;
        for (k = 0; k < b.n && n < C.CAP; k += lod) { var o = k * 7, q = n * 9, x = p.x + b.P[o], y = b.base + b.P[o + 1], z = p.z + b.P[o + 2], ex = x - eye.x, ey = y - eye.y, ez = z - eye.z; TMP[q] = x; TMP[q + 1] = y; TMP[q + 2] = z; TMP[q + 3] = b.P[o + 3] * big; TMP[q + 4] = fade; TMP[q + 5] = b.P[o + 5]; TMP[q + 6] = b.P[o + 6]; TMP[q + 7] = b.P[o + 4]; TMP[q + 8] = b.P[o + 1]; KEY[n] = ex * ex + ey * ey + ez * ez; n++; } }
      ORD.length = n; for (i = 0; i < n; i++) ORD[i] = i; ORD.sort(byFar);   // far to near: blended sprites read right only in that order
      var aC = st.aC.array, aP = st.aP.array, aQ = st.aQ.array; for (i = 0; i < n; i++) { var s = ORD[i] * 9, t = TMP[s + 7]; aC[i * 3] = TMP[s]; aC[i * 3 + 1] = TMP[s + 1]; aC[i * 3 + 2] = TMP[s + 2]; aP[i * 4] = TMP[s + 3]; aP[i * 4 + 1] = TMP[s + 4]; aP[i * 4 + 2] = TMP[s + 5]; aP[i * 4 + 3] = TMP[s + 6]; aQ[i * 3] = t % 2; aQ[i * 3 + 1] = t >= 2 ? 1 : 0; aQ[i * 3 + 2] = TMP[s + 8]; }
      st.gc.instanceCount = n; st.aC.needsUpdate = st.aP.needsUpdate = st.aQ.needsUpdate = true;
      var m = 0, rc = st.rC.array, rd = st.rD.array; for (i = 0; i < st.lines.length; i++) { var L = st.lines[i], F = lineFrame(L, f); for (k = 0; k < C.RING_N && m < C.RING_CAP; k++) { if (!L.alive[k] && L.pop[k] <= 0) continue; ringAt(L, k, F, O); rc[m * 3] = O.x; rc[m * 3 + 1] = O.y; rc[m * 3 + 2] = O.z; rd[m * 4] = F.dx; rd[m * 4 + 1] = F.dz; rd[m * 4 + 2] = L.R; rd[m * 4 + 3] = (L.alive[k] ? 1 : L.pop[k] / 0.3) * st.zone; m++; } }
      st.gr.instanceCount = m; st.rC.needsUpdate = st.rD.needsUpdate = true;
    } catch (e) { fail('place', e); }
    st.placeMs = performance.now() - t0;
  }
  function fail(where, e) { st.fault = where + ': ' + (e && e.message || e); st.enabled = false; clearAll(); if (st.veilEl) st.veilEl.style.opacity = '0'; }   // a fault takes the sky away, never the game

  /* ========== 790 A2 (Su, Nov 13 2026): THE PAINTED SKY. Marth, verbatim, on #137's side-by-side: "even the clouds first layer looks so much better on the COO
     by Yegor than ours". COO's sky (refs-1111/coo-site/09-gameplay-hud-clouds.jpg, 10-clouds-inked-zoom.png) is FULL: a deck of flat cumulus from overhead to
     the horizon, in many sizes, each cloud two flat tones (cream where the sun is on it, blue-grey on the far side) with a dark ink line round it, and the
     clouds thin into small flecks toward the horizon. Ours was a pale ramp with a faint ring low down. THE DECK: one dome round the eye (upper half,
     drawn first after the sky, renderOrder -9.8, so everything solid covers it); per pixel the view ray meets a flat cloud plane (x/y, z/y: perspective
     makes the flecks by itself), whose shapes are a tileable noise baked ONCE at load (256 px, no file, mipmapped so the far flecks thin to haze rather
     than shimmer); the cover of the day sets how much is cloud (never an empty sky, nearly full on a big day); the plane drifts on a slow wind; the
     ink is a constant ~1.5 px line on the shape's edge (fwidth), fading out where the shapes get too small to draw; the lit/shade split is the shape
     sampled a step toward the sun. Light from the game's own sun: cream by day, gold at dusk, faint and blue at night, greyer in weather.
     COST: 1 draw, 1 program, 3 texture reads a sky pixel, one 256 px texture. Standard only (Classic is frozen); hides when the dome hides (under water). ========== */
  var DOME = { R: 700, ORDER: -9.8, SCALE: 0.22, WIND: [0.004, 0.0015], MIN: 0.4, INK: SW790 === 'noskyink' ? 0 : 0.8 };   // 'noskyink': the guard's control
  var dm = { on: false, made: false, fault: null, bakeMs: 0, cover: 0, thr: 0.5, dome: null, mesh: null, U: null, t: 0 };
  function domeBake(THREE) {   // a tileable fbm, 256 x 256: four octaves of value noise on wrapping lattices (8, 16, 32, 64 cells)
    var t0 = performance.now(), N = 256, D = new Uint8Array(N * N * 4), O = [[8, 0.5], [16, 0.27], [32, 0.15], [64, 0.08]], G = O.map(function (o, k) { var g = new Float32Array(o[0] * o[0]), r = rng(hash('deck790/' + k)); for (var i = 0; i < g.length; i++) g[i] = r(); return g; });
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var v = 0;
      for (var k = 0; k < O.length; k++) { var n = O[k][0], fx = x / N * n, fy = y / N * n, i = Math.floor(fx), j = Math.floor(fy), ux = fx - i, uy = fy - j, g = G[k], i1 = (i + 1) % n, j1 = (j + 1) % n; ux = ux * ux * (3 - 2 * ux); uy = uy * uy * (3 - 2 * uy);
        v += O[k][1] * ((g[j * n + i] * (1 - ux) + g[j * n + i1] * ux) * (1 - uy) + (g[j1 * n + i] * (1 - ux) + g[j1 * n + i1] * ux) * uy); }
      var o = (y * N + x) * 4, b = Math.max(0, Math.min(255, Math.round((v - 0.5) * 1.6 * 255 + 128))); D[o] = D[o + 1] = D[o + 2] = b; D[o + 3] = 255; }
    var tex = new THREE.DataTexture(D, N, N, THREE.RGBAFormat); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
    dm.bakeMs = +(performance.now() - t0).toFixed(1); return tex;
  }
  var VS_DOME = ['varying vec3 vD;', 'void main() { vD = position; vec4 p = projectionMatrix * viewMatrix * vec4( cameraPosition + position, 1.0 ); gl_Position = vec4( p.xy, p.w * 0.99999, p.w ); }'].join(NL);
  var FS_DOME = ['uniform sampler2D uMap; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uInk; uniform vec3 uFogC; uniform vec3 uSun; uniform vec2 uOff; uniform float uThr; uniform float uScale; uniform float uA; uniform float uInkK;', 'varying vec3 vD;',
    'float dens( vec2 p ) { return texture2D( uMap, p ).r * 0.8 + texture2D( uMap, p * 2.3 + vec2( 0.37, 0.71 ) ).r * 0.2; }',
    'void main() {', '  vec3 d = normalize( vD ); if ( d.y < 0.004 ) discard;',
    '  vec2 p = d.xz / ( d.y + 0.035 ) * uScale + uOff; float v = dens( p ), w = fwidth( v ) + 1e-4;',
    '  float far = smoothstep( 0.012, 0.11, d.y ), fine = 1.0 - smoothstep( 0.07, 0.2, w );',
    '  float a = smoothstep( uThr - w * 0.8, uThr + w * 0.8, v ) * far; if ( a < 0.004 ) discard;',
    '  vec2 sd = normalize( uSun.xz + vec2( 1e-4 ) ) * 0.035; float lit = max( step( dens( p + sd ), v + 0.05 ), step( uThr + 0.13, v ) );',
    '  vec3 col = mix( uShade, uLit, lit );',
    '  float ink = ( 1.0 - smoothstep( 1.1, 2.3, ( v - uThr ) / w ) ) * fine * uInkK; col = mix( col, uInk, ink );',
    '  col = mix( col, uFogC, ( 1.0 - smoothstep( 0.03, 0.22, d.y ) ) * 0.55 ); gl_FragColor = vec4( col, a * uA );', '}'].join(NL);
  /* 806 seam a (Marth, Nov 14 2026, verbatim: "The clouds in the back ground don't match the foreground"): ONE LIGHT FOR EVERY CLOUD. The deck's lit, shade,
     ink, haze and sun live here once (L806), written by domeLight each frame; the deck reads them, the banks copy them (paint), and the island's near clouds
     (the 16 at 70-96 m and the 9 at the ceiling) are painted with them by cloud806(material): two flat tones split by the sun, the same ink at the rim. */
  var L806 = null;
  function l806() { if (!L806 && window.THREE) { var T3 = window.THREE; L806 = { lit: { value: new T3.Color(1, 0.95, 0.82) }, shade: { value: new T3.Color(0.62, 0.70, 0.84) }, ink: { value: new T3.Color(0.2, 0.24, 0.34) }, fogC: { value: new T3.Color(0.8, 0.9, 1) }, sun: { value: new T3.Vector3(0, 1, 0) }, inkK: { value: DOME.INK } }; } return L806; }
  function light806() { var L = l806(); if (L && X && X.sun) domeLight(L); return L; }
  var CLOUD806_V = function (sh) { var L = l806(); sh.uniforms.uLit806 = L.lit; sh.uniforms.uShd806 = L.shade; sh.uniforms.uInk806 = L.ink; sh.uniforms.uSun806 = L.sun; sh.uniforms.uInkK806 = L.inkK;
    sh.vertexShader = 'attribute vec3 normal0; varying vec3 vN806; varying vec3 vM806; varying vec3 vV806;\n' + sh.vertexShader.replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\n  vN806 = normalize( transformedNormal ); vM806 = normalMatrix * normal0;').replace('#include <project_vertex>', '#include <project_vertex>\n  vV806 = - mvPosition.xyz;');
    sh.fragmentShader = 'uniform vec3 uLit806; uniform vec3 uShd806; uniform vec3 uInk806; uniform vec3 uSun806; uniform float uInkK806; varying vec3 vN806; varying vec3 vM806; varying vec3 vV806;\n' + sh.fragmentShader.replace('#include <encodings_fragment>', ['#include <encodings_fragment>',
      '  { vec3 n = normalize( vN806 ); if ( !gl_FrontFacing ) n = -n; vec3 sv = normalize( ( viewMatrix * vec4( uSun806, 0.0 ) ).xyz ), up = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );',
      '    float w = dot( n, sv ) * 0.5 + 0.5, h = dot( n, up ) * 0.5 + 0.5, l = smoothstep( 0.46, 0.54, w * ( 0.82 + 0.36 * h ) );',
      '    vec3 col = mix( uShd806, uLit806, l ), m0 = length( vM806 ) > 0.5 ? normalize( vM806 ) : n; float e = abs( dot( m0, normalize( vV806 ) ) );',   // the ink reads the lobe's own normal (textures.js normal0): its silhouette, not the light's bent one
      '#if __VERSION__ >= 300',
      '    float fw = fwidth( e ), ink = 1.0 - smoothstep( fw * 0.8, fw * 2.2 + 0.004, e );',   // a line about 1.5 px wide at every size, as the deck draws its own
      '#else',
      '    float ink = 1.0 - smoothstep( 0.05, 0.11, e );',
      '#endif',
      '    gl_FragColor.rgb = mix( col, uInk806, uInkK806 * ink ); }'].join('\n')); };   // after the encodings, before the fog: exactly as the deck draws (its colours raw, then the haze)
  function cloud806(m) {   // the page hands each near cloud's material here, once, at load (Standard only: Classic is frozen, board 645)
    try { if (!m || m.userData.cloud806 || localStorage.getItem('wfr.look') === 'classic' || SW790 === 'nopaint' || !l806()) return false; } catch (e) { return false; }
    var prev = m.onBeforeCompile; m.onBeforeCompile = typeof prev === 'function' ? function (sh, r) { prev.call(this, sh, r); CLOUD806_V(sh); } : CLOUD806_V; m.userData.cloud806 = true; m.needsUpdate = true; return true;
  }
  function domeInit(THREE) {
    try {
      var L = l806(), U = dm.U = { map: { value: domeBake(THREE) }, lit: L.lit, shade: L.shade, ink: L.ink, fogC: L.fogC, sun: L.sun,
        off: { value: new THREE.Vector2(0.13, 0.41) }, thr: { value: 0.5 }, scale: { value: DOME.SCALE }, a: { value: 1 }, inkK: L.inkK };   // 806: the light is L806's, shared
      var g = new THREE.SphereGeometry(DOME.R, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2 + 0.02);
      var m = new THREE.ShaderMaterial({ name: 'sky790:deck', vertexShader: VS_DOME, fragmentShader: FS_DOME, side: THREE.BackSide, uniforms: { uMap: U.map, uLit: U.lit, uShade: U.shade, uInk: U.ink, uFogC: U.fogC, uSun: U.sun, uOff: U.off, uThr: U.thr, uScale: U.scale, uA: U.a, uInkK: U.inkK },
        transparent: false, depthTest: false, depthWrite: false, fog: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor });   // not 'transparent': it goes in the opaque list at -9.8, so all that is solid draws over it (the 756 trick)
      m.extensions = { derivatives: true };
      dm.mesh = new THREE.Mesh(g, m); dm.mesh.name = 'sky790:dome'; dm.mesh.frustumCulled = false; dm.mesh.renderOrder = DOME.ORDER; dm.mesh.layers.enable(C.LAYER); dm.mesh.matrixAutoUpdate = false; X.scene.add(dm.mesh);
      dm.dome = X.scene.children.find(function (o) { return o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.radius === 820; }) || null;   // the page's sky dome: its visibility is ours (it hides under water)
      dm.made = true;
    } catch (e) { dm.fault = 'init: ' + (e && e.message || e); dm.made = false; }
  }
  function domeLight(U) {   // the light of the moment (paint()'s): the game's sun and haze; dimmer and greyer in weather
    var w = X.wx(), s = Math.max(0, Math.min(1.2, X.sunI())), sc = X.sun.color, dark = (w.kind === 'storm' ? 0.75 : w.kind === 'clear' ? 0 : 0.42) * Math.max(0, Math.min(1, w.k)), fc = X.scene.fog ? X.scene.fog.color : null, k = 0.3 + 0.75 * s;
    U.lit.value.setRGB(Math.min(1, (0.5 + 0.5 * sc.r) * k), Math.min(1, (0.46 + 0.5 * sc.g) * k), Math.min(1, (0.42 + 0.5 * sc.b) * k)).multiplyScalar(1 - 0.4 * dark);   // cream by day; the dusk's gold reaches it
    U.shade.value.setRGB(0.6, 0.68, 0.82).multiplyScalar(0.25 + 0.66 * s).multiplyScalar(1 - 0.4 * dark); if (fc) U.fogC.value.copy(fc);
    U.ink.value.setRGB(0.18, 0.22, 0.32).multiplyScalar(0.5 + 0.5 * Math.min(1, s));
    U.sun.value.copy(X.sun.position).sub(X.sun.target.position).normalize(); return { s: s, w: w };
  }
  function domeTick(dt) {
    if (!dm.made) return; try {
      var cl = !!(X.classic && X.classic()), vis = !cl && (!dm.dome || dm.dome.visible); dm.on = vis; dm.mesh.visible = vis; domeRing(!vis); if (!vis) return;
      dm.t += dt || 0; var w = X.wx(), cover = st.force.cover != null ? st.force.cover : dayCover(w), want = DOME.MIN + (1 - DOME.MIN) * Math.min(1, cover * 1.2);   // never an empty sky; a big day nearly full
      dm.cover = dm.cover ? dm.cover + (want - dm.cover) * Math.min(1, (dt || 0) * 0.2) : want; dm.thr = 0.66 - 0.26 * dm.cover;   // the share of the deck that is cloud follows the day's cover, eased
    } catch (e) { dm.fault = 'tick: ' + (e && e.message || e); dm.made = false; if (dm.mesh) dm.mesh.visible = false; domeRing(true); }
  }
  function domeRing(show) {   // the dome's old ring of soft puffs (drawn in the see-through pass, so past the gate it lay OVER the far hills as a grey smear): the deck takes its place while ours shows; back as it was whenever ours does not (the residue law)
    var ring = dm.dome && dm.dome.userData && dm.dome.userData.ring; if (!ring) return; if (dm.ringWas == null) dm.ringWas = ring.visible; var want = show ? dm.ringWas : false; if (ring.visible !== want) ring.visible = want; dm.ringHidden = !want; }
  function domePlace() {
    if (!dm.made || !dm.on) { light806(); return; } try {   // 806: with the deck hidden the near clouds still take the light
      var L = domeLight(dm.U), night = 1 - smooth(0.28, 0.7, L.s), U = dm.U;
      U.thr.value = dm.thr; U.a.value = 1 - 0.5 * night; U.off.value.set(0.13 + dm.t * DOME.WIND[0], 0.41 + dm.t * DOME.WIND[1]);
    } catch (e) { dm.fault = 'place: ' + (e && e.message || e); dm.made = false; dm.mesh.visible = false; domeRing(true); }
  }
  function domePeek() { return { made: dm.made, on: dm.on, fault: dm.fault, bakeMs: dm.bakeMs, cover: +dm.cover.toFixed(3), thr: +dm.thr.toFixed(3), order: DOME.ORDER, domeFound: !!dm.dome, ringHidden: !!dm.ringHidden }; }

  function init(ctx) {
    if (st.inited) return true; X = ctx || {};
    try {
      if (!X.THREE || !X.scene || !window.WFR_WORLD) { st.fault = 'init: no THREE, scene or WFR_WORLD'; return false; }
      if (X.classic && X.classic()) { st.fault = 'classic look: the sky over the world is Standard only (board 645)'; return false; }
      var THREE = X.THREE, R = window.WFR_TRAVEL712 && WFR_TRAVEL712.C ? WFR_TRAVEL712.C.REFR : 1e30; st.REFR = R; portsLoad(); spokesBuild();
      st.U = { eye: { value: new THREE.Vector3() }, invK: { value: 1 }, R: { value: 1e30 }, t: { value: 0 }, sun: { value: new THREE.Vector3(0, 1, 0) }, lit: { value: new THREE.Color(1, 1, 1) }, shade: { value: new THREE.Color(0.5, 0.6, 0.76) }, fogC: { value: new THREE.Color(0.8, 0.9, 1) }, dim: { value: 1 }, map: { value: null } };
      var tex = new THREE.TextureLoader().load('assets/sky756/puffs.png', undefined, undefined, function () { st.texFault = 'assets/sky756/puffs.png did not load'; st.enabled = false; clearAll(); }); st.U.map.value = tex;
      var U = st.U, gc = new THREE.InstancedBufferGeometry(); gc.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)); gc.setIndex([0, 1, 2, 0, 2, 3]); st.aC = inst(THREE, gc, 'aC', C.CAP, 3); st.aP = inst(THREE, gc, 'aP', C.CAP, 4); st.aQ = inst(THREE, gc, 'aQ', C.CAP, 3); gc.instanceCount = 0; st.gc = gc;
      st.matC = new THREE.ShaderMaterial({ name: 'sky756:cloud', vertexShader: VS_CLOUD, fragmentShader: SW790 === 'nopaint' ? FS_CLOUD_756 : FS_CLOUD, uniforms: { uEye: U.eye, uSun: U.sun, uInvK: U.invK, uR: U.R, uMap: U.map, uLit: U.lit, uShade: U.shade, uFogC: U.fogC }, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
      st.meshC = new THREE.Mesh(gc, st.matC); st.meshC.name = 'sky756:clouds'; st.meshC.frustumCulled = false; st.meshC.renderOrder = C.ORDER_HOME; st.meshC.layers.enable(C.LAYER); st.meshC.onAfterRender = function (r) { r.state.buffers.depth.setMask(true); };   // the next thing drawn past the gate is the depth clearer, and gl.clear does nothing to depth while the write mask is off: left off, the shrunk sea stayed in the depth and hid her
      var gr = ringGeo(THREE); st.rC = inst(THREE, gr, 'aC', C.RING_CAP, 3); st.rD = inst(THREE, gr, 'aD', C.RING_CAP, 4); gr.instanceCount = 0; st.gr = gr;
      st.matR = new THREE.ShaderMaterial({ name: 'sky756:rings', vertexShader: VS_RING, fragmentShader: FS_RING, uniforms: { uEye: U.eye, uInvK: U.invK, uR: U.R, uT: U.t, uFogC: U.fogC, uDim: U.dim }, transparent: true, depthWrite: false });
      st.meshR = new THREE.Mesh(gr, st.matR); st.meshR.name = 'sky756:rings'; st.meshR.frustumCulled = false; st.meshR.renderOrder = 7; st.meshR.layers.enable(C.LAYER);
      st.root = new THREE.Group(); st.root.name = 'sky756'; st.root.matrixAutoUpdate = false; st.root.add(st.meshC); st.root.add(st.meshR); X.scene.add(st.root); st.root.updateMatrixWorld(true);
      var prev = X.scene.onBeforeRender; X.scene.onBeforeRender = function () { if (typeof prev === 'function') prev.apply(this, arguments); place(); domePlace(); };
      if (SW790 !== 'nodome') domeInit(THREE);   /* 790 A2: the painted dome layer */
      st.inited = true; return true;
    } catch (e) { st.fault = 'init: ' + (e && e.message || e); return false; }
  }
  function tick(dt) {
    if (st.inited) domeTick(dt);   /* 790 A2 */
    if (!st.inited || !st.enabled) return; var t0 = performance.now(); dt = dt || 0;
    try {
      st.t += dt; var T = X.TR, S = X.S, travel = !!(T && T.on && T.f && T.st), dc = Math.hypot(S.pos.x, S.pos.z), home = !travel && S.mode !== 'menu' && X.open() && dc > C.SHOW0; st.mode = X.classic() ? 'off' : travel ? 'travel' : home ? 'island' : 'off';
      if (st.mode === 'off') { st.zone = 0; st.prev = null; st.inK = 0; st.banks = []; st.lines = []; st.acc = 0; veilTick(dt); return; }
      st.zone = travel ? 1 : smooth(C.SHOW0, C.SHOW1, dc); var f = travel ? T.f : WFR_WORLD.HOMEF;
      if (st.lastF !== f) { st.lastF = f; st.acc = 0; }
      st.acc -= dt; if (st.acc <= 0) { st.acc = C.REFRESH; refresh(f, T); }
      for (var i = 0; i < st.banks.length; i++) { var b = st.banks[i]; b.a += (b.want - b.a) * Math.min(1, dt * C.EASE); }
      for (i = 0; i < st.lines.length; i++) { var P = st.lines[i].pop; for (var k = 0; k < C.RING_N; k++) if (P[k] > 0) P[k] = Math.max(0, P[k] - dt); }
      pick(f); st.inK = inside(f); veilTick(dt);
    } catch (e) { fail('tick', e); }
    var ms = performance.now() - t0 + st.placeMs; st.placeMs = 0; st.ms.push(ms); if (st.ms.length > 600) st.ms.shift(); if (ms > st.msMax) st.msMax = ms;
  }

  /* ---------- the bench's reads (guards only): what SHIPS ---------- */
  function peek() { var ms = st.ms.slice().sort(function (a, b) { return a - b; }); return { inited: st.inited, enabled: st.enabled, fault: st.fault, texFault: st.texFault || null, mode: st.mode, zone: +st.zone.toFixed(3), cover: st.cover, banks: st.banks.length, banksOn: st.banks.filter(function (b) { return b.want; }).length, sprites: st.gc ? st.gc.instanceCount : 0, rings: st.gr ? st.gr.instanceCount : 0, lines: st.lines.length, spokes: st.spokes.length, veil: +st.veil.toFixed(3), inK: +st.inK.toFixed(3), got: st.got, lineDone: st.lineDone, cells: st.cells.size, ms: { n: ms.length, med: ms.length ? +ms[ms.length >> 1].toFixed(3) : null, p95: ms.length ? +ms[Math.floor(ms.length * 0.95)].toFixed(3) : null, max: +st.msMax.toFixed(3) } }; }
  function banksNear() { var f = X.TR.on ? X.TR.f : WFR_WORLD.HOMEF; return st.banks.map(function (b) { var p = WFR_WORLD.toLocal(f, b.lat, b.lon); return { id: b.id, lat: b.lat, lon: b.lon, x: p.x, z: p.z, y: b.base + b.H * 0.45, base: b.base, W: b.W, H: b.H, a: b.a, d: b.d, want: b.want }; }); }
  function ringsNear() { var f = X.TR.on ? X.TR.f : WFR_WORLD.HOMEF, out = []; st.lines.forEach(function (L) { var F = lineFrame(L, f), o = { x: 0, y: 0, z: 0 }, r = []; for (var n = 0; n < C.RING_N; n++) { ringAt(L, n, F, o); r.push({ x: o.x, y: o.y, z: o.z, alive: !!L.alive[n] }); } out.push({ id: L.id, lat: L.lat, lon: L.lon, alt: L.alt, R: L.R, g: L.g, d: L.d, got: L.got, rings: r }); }); return out; }
  function drawnAt(x, y, z) { var U = st.U; if (!U) return null; var e = U.eye.value, k = U.invK.value; return { x: e.x + (x - e.x) * k, y: e.y + (y - e.y) * k, z: e.z + (z - e.z) * k, k: k }; }   // where a world point is drawn this frame (past the gate the far is shrunk toward the eye): the guard's camera aims there
  return { C: C, init: init, tick: tick, peek: peek, dome: domePeek, cloud806: cloud806, light806: function () { return l806(); }, DOME: DOME, drawnAt: drawnAt, banksNear: banksNear, ringsNear: ringsNear, force: st.force, resetMs: function () { st.ms = []; st.msMax = 0; }, coverOfDay: function (w) { return dayCover(w); }, warmth: warmth,
    set enabled(v) { st.enabled = !!v; if (!v) { clearAll(); st.veil = 0; if (st.veilEl) st.veilEl.style.opacity = '0'; } }, get enabled() { return st.enabled; } };
})();
