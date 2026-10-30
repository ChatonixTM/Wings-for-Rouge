/* WINGS FOR ROUGE · board 703, ship 6 · HAWK'S WAKE, THE RIDE (Trunks, Oct 28 2026)
   Marth, verbatim: "act 1 of the final battle. i want it to be styled after a sonic generations - that hallway kinda thing u mentioned earlier - think sonic unleashed, sonic riders the babylon stage with jet and how you gotta ride the turbulence at some points, think emerald coast with the whale behind you breaking the board walk"
   The rail idea is copied from runes.js (RAIL_W, railStep, its RAIL-TICK no-allocation slice); runes.js is never edited.
   Shape: create(THREE, scene, o) -> inst; the html calls inst.step(dt, input) once a frame while inst.on(). A fault turns the RIDE off (inst.dead), never the game.
   The course is built ONCE in its own frame (local +z forward, origin = the start); start() only moves that frame. Per frame: transforms and opacity, nothing compiles, nothing allocates.
   The per-frame line is a plain number table sampled at build, so the ride's math does not depend on the three.js version (the game ships r128, the node test loads a newer copy). */
window.WFR_HAWKWAKE = (function () {
  'use strict';
  /* design numbers: every one a DRAFT, his thumb decides */
  var RAIL_W = 2.5;                         /* the lane: 2.5 m either side of the line (his number, PLAN_703) */
  var LAT_K = 7;                            /* how fast she slides to where the stick points, 1/s (runes.js's LAT_K) */
  var V0 = 18;                              /* cruise along the line, m/s */
  var V_UP = 0.35, V_DOWN = 0.3;            /* stick up: up to +35% of cruise; stick down: down to -30% */
  var BOOST = 0.6;                          /* boost held: +60% of cruise */
  var BURST = 0.4, BURST_T = 1.0, BURST_CD = 2.5;   /* a Flap: +40% for 1 s, then 2.5 s to recharge (runes.js's burst) */
  var SPD_K = 1.5, V_MAX = 2.2;             /* speed eases at 1.5/s toward what she asks; never past 2.2 x cruise */
  var JOIN_T = 0.8;                         /* s: she eases from where the dash left her onto the line */
  var MIN_ABOVE = 8;                        /* m: the line's lowest point stays this far above the water (the course is lifted if needed) */
  var GATE_EVERY = 150;                     /* m: a checkpoint; a caught ride restarts at the last one passed */
  var END_PAD = 25;                         /* m before the line's end: done (the wind throws him into the cloud) */
  var BANDS = [[230, 330, 1], [520, 620, -1], [800, 880, 1]];   /* turbulence (Babylon): [from m, to m, shove side: +1 = her right] */
  var SHOVE = 3.2;                          /* m the shove pushes her target sideways: more than the lane, so at rest she is pinned on the edge */
  var BAND_RAMP = 18, GUST = 0.15, GUST_HZ = 0.6;   /* the shove eases in and out over 18 m; gusts of +-15% at 0.6 Hz */
  var RIDE_ADD = 0.15;                      /* riding the turbulence (stick held against it): +15% of cruise */
  var EDGE_DRAG = 0.25;                     /* pinned on the lane's edge by a shove: -25% of cruise (the wave gains on her) */
  var WAVE_GAP0 = 40;                       /* m: the wave starts this far behind her (and again after a restart) */
  var WAVE_K = 0.9, WAVE_RUB = 0.15, WAVE_HOLD = 30, WAVE_VMAX = 1.6;   /* the wave: 0.9 x cruise, +0.15 m/s per m of gap past 30 m, never past 1.6 x cruise */
  var CATCH = 6;                            /* m: the wave this close catches her */
  var WAVE_REACH = 2;                       /* m: the wave breaks what is within 2 m of its face */
  var HAWK_LEAD = 34, HAWK_SWAY = 6, HAWK_LAT = 1.8, HAWK_UP = 2;   /* the Hawk: 28-40 m ahead, weaving 1.8 m, 2 m above the line */
  var THROW_T = 2.4;                        /* s: the wind throws him into the cloud at the end */
  var ROLL_K = 0.25, ROLL_MAX = 0.7, SHAKE = 0.08;   /* her bank per m/s of slide, its limit, the turbulence shake (rad) */
  var DECK_DROP = 5, PLANK_EVERY = 1.5, POST_EVERY = 7, CLOUD_EVERY = 9, STREAK_EVERY = 5;   /* the wreck boardwalk 5 m under the line; prop spacing, m */
  var BREAK_T = 1.6, FLING_U = 9, FLING_F = 6, SPIN = 5;   /* a broken plank flies 1.6 s: up 9 m/s, ahead 6 m/s, spinning */
  var FADE_T = 0.8;                         /* s: the corridor fades in at the start */
  var COURSE = [[0, 0, 0], [0, 1, 40], [-6, 3, 120], [-26, 6, 210], [-38, 2, 300], [-28, -5, 390], [0, -8, 470], [30, -3, 550], [44, 6, 640],
    [34, 12, 730], [8, 8, 810], [-14, 2, 890], [-18, -1, 960], [-8, 2, 1030], [0, 4, 1070]];   /* local [x, y, z] m: gentle climbs and dips through the storm */
  var API = null;
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function num(x, lo, hi) { x = +x; return x === x && x !== Infinity && x !== -Infinity ? clamp(x, lo, hi) : 0; }   /* NaN and infinities read as rest */

  function create(T, scene, o) {   /* never throws into the game: a fault at build returns a dead ride (every call a no-op) */
    try { var inst = build(T, scene, o || {}); API.last = inst; return inst; } catch (err) {
      API.error = String(err && err.message || err); try { if (o && o.warn) o.warn('hawkwake not built: ' + API.error); } catch (e) { /* fine */ }
      return deadInst();
    }
  }
  function deadInst() {
    var no = function () { return null; };
    return { dead: true, _plant: null, root: null, start: function () { return false; }, stop: no, on: function () { return false; }, step: no, hawkPose: no, warm: no,
      peek: function () { return { ready: false, dead: true, error: API.error }; } };
  }

  function build(T, scene, o) {
    /* the line, sampled once by arc length into a number table (TX, TY, TZ) every DS m */
    var curve = new T.CatmullRomCurve3(COURSE.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); }), false, 'centripetal');
    var L = curve.getLength(), NS = Math.ceil(L / 0.5), DS = L / NS, pts = curve.getSpacedPoints(NS);
    var TX = new Float32Array(NS + 1), TY = new Float32Array(NS + 1), TZ = new Float32Array(NS + 1), minY = 1e9, maxY = -1e9;
    for (var i = 0; i <= NS; i++) { TX[i] = pts[i].x; TY[i] = pts[i].y; TZ[i] = pts[i].z; minY = Math.min(minY, TY[i]); maxY = Math.max(maxY, TY[i]); }
    var GATES = Math.floor((L - END_PAD) / GATE_EVERY);
    var water = +o.water || 0;

    var root = new T.Group(); root.name = 'hawkwake703'; root.visible = false; scene.add(root);
    var dummy = new T.Object3D();
    var LP = { x: 0, y: 0, z: 0 }, LD = { x: 0, y: 0, z: 1 }, WP = { x: 0, y: 0, z: 0 }, WD = { x: 0, y: 0, z: 1 }, RA = { x: 0, y: 0, z: 0 }, RB = { x: 0, y: 0, z: 0 };   /* the line's scratch, made before the props read it */
    var mats = [], mat = function (m, base) { m.transparent = true; m.opacity = 0; m.userData.base = base; mats.push(m); return m; };   /* transparent from birth: only opacity ever changes */
    var M = {
      cloud: mat(new T.MeshLambertMaterial({ color: 0xffffff, depthWrite: false }), 0.55),
      streak: mat(new T.MeshBasicMaterial({ color: 0xeaf4ff, depthWrite: false }), 0.5),
      plank: mat(new T.MeshLambertMaterial({ color: 0xffffff }), 1),
      post: mat(new T.MeshLambertMaterial({ color: 0x5b4330 }), 1),
      wave: mat(new T.MeshLambertMaterial({ color: 0x23566b, emissive: 0x0b2430, side: T.DoubleSide }), 0.9),
      foam: mat(new T.MeshLambertMaterial({ color: 0xf2f7fa, emissive: 0x334455 }), 0.95) };
    var imesh = function (geo, m, n, name) { var x = new T.InstancedMesh(geo, m, n); x.name = name; x.frustumCulled = false; root.add(x); return x; };   /* r128 culls an InstancedMesh by its geometry's sphere at the origin: never cull (runes.js) */
    var col = new T.Color();

    /* build-time line reader (allocates freely; never per frame) */
    var bp = { x: 0, y: 0, z: 0 }, bd = { x: 0, y: 0, z: 1 };
    var at = function (s) { lineAt(s, bp, bd); var h = Math.hypot(bd.x, bd.z) || 1; return { x: bp.x, y: bp.y, z: bp.z, dx: bd.x / h, dz: bd.z / h, rx: -bd.z / h, rz: bd.x / h, yaw: Math.atan2(bd.x, bd.z) }; };

    /* the storm hallway: cloud walls left and right, a lid above, a dark floor; lighter where the turbulence blows */
    var CL = [];
    for (var cs = 0; cs <= L; cs += CLOUD_EVERY) {
      var a = at(cs), inB = bandAt(cs) >= 0, k;
      for (k = 0; k < 4; k++) {
        var h1 = hash(cs, k), h2 = hash(k * 7.1, cs), side = k === 0 ? -1 : 1, lat, up, sc;
        if (k < 2) { lat = side * (RAIL_W + 9 + h1 * 7); up = h2 * 8 - 3; sc = 6 + h1 * 5; } else if (k === 2) { lat = (h1 - 0.5) * 10; up = 13 + h2 * 4; sc = 9 + h1 * 3; } else { lat = (h1 - 0.5) * 14; up = -15 - h2 * 3; sc = 9 + h2 * 4; }
        CL.push([a.x + a.rx * lat, a.y + up, a.z + a.rz * lat, a.yaw + h2, sc, k, inB, h1]);
      }
    }
    var clouds = imesh(new T.IcosahedronGeometry(1, 1), M.cloud, CL.length, 'hawkwake703:clouds');
    CL.forEach(function (c, j) {
      dummy.position.set(c[0], c[1], c[2]); dummy.rotation.set(0, c[3], 0); dummy.scale.set(c[4] * 1.4, c[4] * (c[5] >= 2 ? 0.35 : 0.8), c[4]); dummy.updateMatrix(); clouds.setMatrixAt(j, dummy.matrix);
      if (clouds.setColorAt) { if (c[6]) col.setRGB(0.72 + c[7] * 0.1, 0.78 + c[7] * 0.1, 0.86 + c[7] * 0.08); else if (c[5] === 3) col.setRGB(0.22 + c[7] * 0.08, 0.25 + c[7] * 0.08, 0.3 + c[7] * 0.08); else col.setRGB(0.36 + c[7] * 0.16, 0.39 + c[7] * 0.16, 0.45 + c[7] * 0.16); clouds.setColorAt(j, col); }
    });

    /* the wind's streaks inside each band, laid across the lane: they show which way it shoves */
    var SK = [];
    BANDS.forEach(function (B, bi) { for (var ss = B[0]; ss <= B[1]; ss += STREAK_EVERY) for (var m2 = 0; m2 < 2; m2++) { var a2 = at(ss), h3 = hash(ss, bi + m2 * 3), h4 = hash(bi + m2, ss * 1.3), lt = (h3 - 0.5) * 2 * (RAIL_W + 4); SK.push([a2.x + a2.rx * lt, a2.y + h4 * 6 - 2, a2.z + a2.rz * lt, a2.yaw, 5 + h4 * 4]); } });
    var streaks = imesh(new T.BoxGeometry(1, 0.06, 0.06), M.streak, Math.max(1, SK.length), 'hawkwake703:streaks');
    SK.forEach(function (c, j) { dummy.position.set(c[0], c[1], c[2]); dummy.rotation.set(0, c[3], 0); dummy.scale.set(c[4], 1, 1); dummy.updateMatrix(); streaks.setMatrixAt(j, dummy.matrix); });

    /* the wreck boardwalk under her (Emerald Coast): planks, posts and crates the wave breaks once she has passed */
    var boxGeo = new T.BoxGeometry(1, 1, 1);
    function breakSet(list, m, name) {
      var n = list.length, S2 = { n: n, s: new Float32Array(n), x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), yaw: new Float32Array(n), dx: new Float32Array(n), dz: new Float32Array(n),
        sx: new Float32Array(n), sy: new Float32Array(n), sz: new Float32Array(n), h: new Float32Array(n), at: new Float32Array(n), pB: 0, pD: 0, dirty: false, mesh: imesh(boxGeo, m, Math.max(1, n), name) };
      list.forEach(function (q, j) { S2.s[j] = q[0]; S2.x[j] = q[1]; S2.y[j] = q[2]; S2.z[j] = q[3]; S2.yaw[j] = q[4]; S2.dx[j] = q[5]; S2.dz[j] = q[6]; S2.sx[j] = q[7]; S2.sy[j] = q[8]; S2.sz[j] = q[9]; S2.h[j] = hash(j, n); S2.at[j] = -1; });
      return S2;
    }
    var PL = [], PO = [];
    for (var ps = 0; ps <= L; ps += PLANK_EVERY) { if (hash(ps, 3.3) < 0.1) continue; var a3 = at(ps), hj = hash(ps, 9.1); PL.push([ps, a3.x, a3.y - DECK_DROP + (hj - 0.5) * 0.15, a3.z, a3.yaw + (hj - 0.5) * 0.12, a3.dx, a3.dz, 2 * RAIL_W + 1.5, 0.22, 1.1]); }
    for (var qs = 0; qs <= L; qs += POST_EVERY) {
      var a4 = at(qs), hk = hash(qs, 5.7);
      for (var sd = -1; sd <= 1; sd += 2) { var lt2 = sd * (RAIL_W + 0.6); PO.push([qs, a4.x + a4.rx * lt2, a4.y - DECK_DROP + 0.8, a4.z + a4.rz * lt2, a4.yaw, a4.dx, a4.dz, 0.3, 1.6 + hk * 0.6, 0.3]); }
      if (hk < 0.25) { var lt3 = (hash(qs, 1.1) - 0.5) * 2 * RAIL_W; PO.push([qs + 0.5, a4.x + a4.rx * lt3, a4.y - DECK_DROP + 0.75, a4.z + a4.rz * lt3, a4.yaw + hk * 4, a4.dx, a4.dz, 1.2, 1.2, 1.2]); }
    }
    PL.sort(function (p, q2) { return p[0] - q2[0]; }); PO.sort(function (p, q2) { return p[0] - q2[0]; });
    var planks = breakSet(PL, M.plank, 'hawkwake703:planks'), posts = breakSet(PO, M.post, 'hawkwake703:posts');
    if (planks.mesh.setColorAt) for (var pc = 0; pc < planks.n; pc++) { var hv = planks.h[pc]; col.setRGB(0.42 + hv * 0.14, 0.3 + hv * 0.1, 0.19 + hv * 0.06); planks.mesh.setColorAt(pc, col); }

    /* the wave: one curling wall with a rolling foam lip, built once, only moved */
    var WAVE_W = 2 * RAIL_W + 34, WAVE_H = 26, wgeo = new T.PlaneGeometry(WAVE_W, WAVE_H, 16, 10), wpos = wgeo.attributes.position;
    for (var wv = 0; wv < wpos.count; wv++) { var vx = wpos.getX(wv), vy = wpos.getY(wv), hh = (vy + WAVE_H / 2) / WAVE_H; wpos.setXYZ(wv, vx, vy + WAVE_H / 2 - 10, 7 * hh * hh * hh + 1.5 * Math.sin(vx * 0.3) * hh - 0.012 * vx * vx); }
    wgeo.computeVertexNormals();
    var wave = new T.Mesh(wgeo, M.wave); wave.name = 'hawkwake703:wave'; wave.frustumCulled = false; root.add(wave);
    var foam = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, WAVE_W, 10), M.foam); foam.name = 'hawkwake703:foam'; foam.position.set(0, WAVE_H - 10, 7); foam.frustumCulled = false; wave.add(foam);
    var DRAWS = 6;   /* clouds, streaks, planks, posts, wave, foam: one draw each */

    /* ride state and scratch, made once */
    var R = { on: false, dead: false, plant: null, t: 0, s: 0, lat: 0, latV: 0, v: V0, burstT: 0, cd: 0, band: -1, push: 0, gate: 0, wave: -WAVE_GAP0, restarts: 0, done: false, doneT: 0,
      jt: 1, alpha: 0, roll: 0, ox: 0, oy: 0, oz: 0, yaw0: 0, c: 1, sn: 0, offX: 0, offY: 0, offZ: 0, cut: false, maxS: 0, startedAt: 0, hawkS: 0 };
    var POSE = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, v: 0, cut: false, done: false, lineYaw: 0 };   /* 703r: lineYaw, the line's own heading (her nose turns with her slide; a camera follows the line) */
    var HAWK = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, s: 0, lat: 0, visible: false, thrown: false };

    function bandAt(s) { for (var b = 0; b < BANDS.length; b++) if (s >= BANDS[b][0] && s <= BANDS[b][1]) return b; return -1; }
    function say(name) { try { if (o.event) o.event(name, R.gate, R.restarts); } catch (e) { /* the game's toasts are the game's */ } }

    /* RAIL-TICK BEGIN: nothing between these markers allocates (tests/hawkwake-unit.js reads this text) */
    function raw(s, out) {   /* the table, clamped to the line, linearly between samples */
      var u = s <= 0 ? 0 : s >= L ? NS : s / DS, i0 = Math.floor(u), f = u - i0; if (i0 >= NS) { i0 = NS - 1; f = 1; }
      out.x = TX[i0] + (TX[i0 + 1] - TX[i0]) * f; out.y = TY[i0] + (TY[i0 + 1] - TY[i0]) * f; out.z = TZ[i0] + (TZ[i0 + 1] - TZ[i0]) * f; return out;
    }
    function lineAt(s, outP, outD) {   /* the line at arc length s (local frame), its unit tangent from two points 1 m apart; past either end it runs straight on */
      var sa = clamp(s - 1, 0, L - 2), sb = sa + 2; raw(sa, RA); raw(sb, RB);
      var dx = RB.x - RA.x, dy = RB.y - RA.y, dz = RB.z - RA.z, n = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1; outD.x = dx / n; outD.y = dy / n; outD.z = dz / n;
      if (s < 0) { raw(0, outP); outP.x += outD.x * s; outP.y += outD.y * s; outP.z += outD.z * s; } else if (s > L) { raw(L, outP); var e = s - L; outP.x += outD.x * e; outP.y += outD.y * e; outP.z += outD.z * e; } else raw(s, outP);
      return outP;
    }
    function restAt(S2, i) { dummy.position.set(S2.x[i], S2.y[i], S2.z[i]); dummy.rotation.set(0, S2.yaw[i], 0); dummy.scale.set(S2.sx[i], S2.sy[i], S2.sz[i]); dummy.updateMatrix(); S2.mesh.setMatrixAt(i, dummy.matrix); S2.dirty = true; }
    function flungAt(S2, i, b) {
      var h = S2.h[i], k = b >= BREAK_T ? 0.0001 : 1 - clamp((b - 0.6 * BREAK_T) / (0.4 * BREAK_T), 0, 0.9999), fw = FLING_F * (0.6 + h) * b, up = FLING_U * (0.5 + h) * b - 4.9 * b * b, sw = (h - 0.5) * 6 * b;
      dummy.position.set(S2.x[i] + S2.dx[i] * fw - S2.dz[i] * sw, S2.y[i] + up, S2.z[i] + S2.dz[i] * fw + S2.dx[i] * sw);
      dummy.rotation.set(b * SPIN * (h - 0.3), S2.yaw[i] + b * SPIN * 0.4 * (h - 0.5), b * SPIN * (0.7 - h)); dummy.scale.set(S2.sx[i] * k, S2.sy[i] * k, S2.sz[i] * k); dummy.updateMatrix(); S2.mesh.setMatrixAt(i, dummy.matrix); S2.dirty = true;
    }
    function breakStep(S2) {   /* the wave's face breaks what it reaches, in order; only the pieces in flight are touched */
      while (S2.pB < S2.n && S2.s[S2.pB] <= R.wave + WAVE_REACH) { S2.at[S2.pB] = R.t; S2.pB++; }
      for (var i = S2.pD; i < S2.pB; i++) { var b = R.t - S2.at[i]; flungAt(S2, i, b); if (b >= BREAK_T && i === S2.pD) S2.pD++; }
      if (S2.dirty) { S2.mesh.instanceMatrix.needsUpdate = true; S2.dirty = false; }
    }
    function restore(S2, fromS) {   /* after a restart, what lies ahead of the new wave stands again (so it can break again) */
      while (S2.pB > 0 && S2.s[S2.pB - 1] > fromS) { S2.pB--; S2.at[S2.pB] = -1; restAt(S2, S2.pB); }
      if (S2.pD > S2.pB) S2.pD = S2.pB;
      if (S2.dirty) { S2.mesh.instanceMatrix.needsUpdate = true; S2.dirty = false; }
    }
    function setAlpha(a) { for (var i = 0; i < mats.length; i++) mats[i].opacity = mats[i].userData.base * a; }
    function caught() {   /* the wave has her: back to the last gate, nothing lost */
      R.restarts++; R.s = R.gate * GATE_EVERY; R.lat = 0; R.latV = 0; R.v = V0; R.burstT = 0; R.cd = 0; R.roll = 0; R.wave = R.s - WAVE_GAP0; R.cut = true;
      restore(planks, R.wave + WAVE_REACH); restore(posts, R.wave + WAVE_REACH); say('caught');
    }
    function toWorld(lx, ly, lz, out) { out.x = R.ox + lx * R.c + lz * R.sn; out.y = R.oy + ly; out.z = R.oz - lx * R.sn + lz * R.c; return out; }   /* the root's frame: rotation.y = yaw0 */
    function railStep(dt, inp) {
      dt = dt > 0 ? (dt < 0.25 ? dt : 0.25) : 0;   /* NaN and negatives are no time; a long stall is a quarter second */
      var sx = num(inp && inp.sx, -1, 1), sy = num(inp && inp.sy, -1, 1), flap = !!(inp && inp.flap), boost = !!(inp && inp.boost), dashV = num(inp && inp.dash, 0, 120), dodge = !!(inp && inp.dodge);   /* 703p: the fight's dash to the Hawk, m/s along the line (absent: 0, the ride as before) */
      R.t += dt; R.cut = false; R.cd = Math.max(0, R.cd - dt); R.burstT = Math.max(0, R.burstT - dt);
      if (flap && R.cd <= 0 && !R.done) { R.burstT = BURST_T; R.cd = BURST_CD; }
      var bi = bandAt(R.s), push = 0;
      if (bi >= 0) { var B = BANDS[bi], kk = Math.min(1, (R.s - B[0]) / BAND_RAMP, (B[1] - R.s) / BAND_RAMP); kk = kk * kk * (3 - 2 * kk); push = B[2] * SHOVE * kk * (1 + GUST * Math.sin(6.2832 * GUST_HZ * R.t + bi)); }
      R.band = bi; R.push = push;
      var against = bi >= 0 && sx * BANDS[bi][2] < -0.5 && Math.abs(push) > 0.5, pinned = bi >= 0 && R.lat * BANDS[bi][2] >= RAIL_W - 0.05;
      var want = V0 * (1 + V_UP * Math.max(0, sy) - V_DOWN * Math.max(0, -sy));
      if (boost) want += BOOST * V0;
      if (R.burstT > 0) want += BURST * V0;
      if (against) want += RIDE_ADD * V0;
      if (pinned) want -= EDGE_DRAG * V0;
      if (R.done) want = V0;
      R.v += (want - R.v) * Math.min(1, dt * SPD_K); R.v = clamp(R.v, (1 - V_DOWN - EDGE_DRAG) * V0, V_MAX * V0);
      R.s += R.v * dt; if (dashV > 0) R.s += dashV * dt; if (R.s > R.maxS) R.maxS = R.s;
      var lat0 = R.lat; R.lat += (sx * RAIL_W + (dodge ? 0 : push) - R.lat) * Math.min(1, dt * LAT_K);   /* 703p: a dodge (the fight's sidestep) beats the shove */
      if (R.plant !== 'noclamp') R.lat = clamp(R.lat, -RAIL_W, RAIL_W);   /* THE LANE (plant 'noclamp' lifts it: the unit test's control) */
      R.latV = dt > 0 ? (R.lat - lat0) / dt : 0;
      if (!R.done) { var g = Math.min(GATES, Math.floor(R.s / GATE_EVERY)); if (g > R.gate) { R.gate = g; say('gate'); } }
      if (!R.done) {   /* the wave: it chases, it gains when she slows, it never passes her */
        var gap = R.s - R.wave, wvel = Math.min(WAVE_VMAX * V0, WAVE_K * V0 + WAVE_RUB * Math.max(0, gap - WAVE_HOLD));
        R.wave += wvel * dt;
        if (R.plant !== 'wavefree') { if (R.wave > R.s - 0.01) R.wave = R.s - 0.01; if (R.s - R.wave < CATCH) caught(); }   /* plant 'wavefree': the control for "never ahead" */
      } else R.wave += 0.5 * V0 * dt;   /* done: the wave falls away behind */
      if (!R.done && R.s >= L - END_PAD) { R.done = true; R.doneT = R.t; say('done'); }
      breakStep(planks); breakStep(posts);
      if (R.alpha < 1) { R.alpha = Math.min(1, R.alpha + dt / FADE_T); setAlpha(R.alpha); }
      if (M.streak) M.streak.opacity = M.streak.userData.base * R.alpha * (0.7 + 0.3 * Math.sin(R.t * 7));
      /* the wave's wall */
      lineAt(R.wave, WP, WD); wave.position.set(WP.x, WP.y, WP.z); wave.rotation.set(0, Math.atan2(WD.x, WD.z), 0); wave.scale.set(1, 1 + 0.04 * Math.sin(R.t * 2.1), 1); foam.rotation.set(R.t * 3, 0, 1.5708);
      /* her pose */
      lineAt(R.s, LP, LD); var hz = Math.hypot(LD.x, LD.z) || 1, rx = -LD.z / hz, rz = LD.x / hz;
      R.jt = Math.min(1, R.jt + dt / JOIN_T); var e = 1 - R.jt * R.jt * (3 - 2 * R.jt);
      toWorld(LP.x + rx * R.lat, LP.y, LP.z + rz * R.lat, POSE); POSE.x += R.offX * e; POSE.y += R.offY * e; POSE.z += R.offZ * e;
      POSE.yaw = R.yaw0 + Math.atan2(LD.x, LD.z) - clamp(Math.atan2(R.latV, Math.max(1, R.v)), -0.5, 0.5);   /* her nose follows her slide (the game's yaw: forward = (sin, cos)) */
      POSE.pitch = Math.atan2(LD.y, hz);
      R.roll += (clamp(R.latV * ROLL_K, -ROLL_MAX, ROLL_MAX) - R.roll) * Math.min(1, dt * 6);
      POSE.roll = R.roll + SHAKE * Math.sin(R.t * 9) * Math.abs(push) / SHOVE;   /* roll > 0 = banking toward her right (+offset); the shake is the turbulence */
      POSE.v = R.v; POSE.cut = R.cut; POSE.done = R.done; POSE.lineYaw = R.yaw0 + Math.atan2(LD.x, LD.z);
      /* the Hawk: ahead, out of reach; at the end the wind throws him into the cloud */
      if (!R.done) {
        R.hawkS = Math.min(R.s + HAWK_LEAD + HAWK_SWAY * Math.sin(R.t * 0.7), L); lineAt(R.hawkS, WP, WD); var hh = Math.hypot(WD.x, WD.z) || 1;
        HAWK.lat = HAWK_LAT * Math.sin(R.t * 0.9); toWorld(WP.x - WD.z / hh * HAWK.lat, WP.y + HAWK_UP + 0.6 * Math.sin(R.t * 2.3), WP.z + WD.x / hh * HAWK.lat, HAWK);
        HAWK.yaw = R.yaw0 + Math.atan2(WD.x, WD.z); HAWK.pitch = Math.atan2(WD.y, hh); HAWK.roll = 0.25 * Math.cos(R.t * 0.9); HAWK.visible = true; HAWK.thrown = false;
      } else {
        var k = Math.min(1, (R.t - R.doneT) / THROW_T); lineAt(L, WP, WD); var h5 = Math.hypot(WD.x, WD.z) || 1, out = 26 * k * k, fw = 20 * k;
        toWorld(WP.x + WD.x * fw - WD.z / h5 * out, WP.y + HAWK_UP + 14 * k, WP.z + WD.z * fw + WD.x / h5 * out, HAWK);
        HAWK.yaw = R.yaw0 + Math.atan2(WD.x, WD.z) - 1.2 * k; HAWK.pitch = 0.6 * k; HAWK.roll = 6 * k; HAWK.visible = k < 1; HAWK.thrown = true; R.hawkS = L + fw;
      }
      HAWK.s = R.hawkS;
      return POSE;
    }
    /* RAIL-TICK END */

    function kill(err) {
      R.dead = true; R.on = false; I.dead = true; API.error = String(err && err.message || err);
      try { root.visible = false; } catch (e) { /* fine */ }
      try { if (o.warn) o.warn('hawkwake stopped: ' + API.error); } catch (e) { /* fine */ }
    }
    function start(pos, yaw) {
      if (R.dead) return false;
      try {
        var px = +pos.x || 0, py = +pos.y || 0, pz = +pos.z || 0; yaw = +yaw || 0;
        R.ox = px; R.oz = pz; R.oy = Math.max(py, water + MIN_ABOVE - minY); R.yaw0 = yaw; R.c = Math.cos(yaw); R.sn = Math.sin(yaw);   /* the line starts where she is; lifted if it would dip near the water */
        root.position.set(R.ox, R.oy, R.oz); root.rotation.set(0, yaw, 0);
        R.offX = px - R.ox; R.offY = py - R.oy; R.offZ = pz - R.oz; R.jt = (R.offX || R.offY || R.offZ) ? 0 : 1;
        R.t = 0; R.s = 0; R.maxS = 0; R.lat = 0; R.latV = 0; R.v = V0; R.burstT = 0; R.cd = 0; R.band = -1; R.push = 0; R.gate = 0; R.wave = -WAVE_GAP0; R.restarts = 0; R.done = false; R.doneT = 0; R.roll = 0; R.cut = true;
        planks.pB = planks.n; planks.pD = 0; posts.pB = posts.n; posts.pD = 0; restore(planks, -1e9); restore(posts, -1e9);
        R.alpha = 0; setAlpha(0); root.visible = true; R.on = true; try { R.startedAt = o.played ? +o.played() || 0 : 0; } catch (e) { R.startedAt = 0; }
        return true;
      } catch (err) { kill(err); return false; }
    }
    function stop() { R.on = false; try { root.visible = false; } catch (e) { /* fine */ } }
    function step(dt, input) {   /* the html calls this once a frame while on(); a fault stops the ride, never the game */
      if (!R.on || R.dead) return null;
      try { R.plant = I._plant || null; if (R.plant === 'throw') R.no.such = 1; return railStep(dt, input); } catch (err) { kill(err); return null; }   /* plant 'throw': a fault inside the step */
    }
    function hawkPose() { return R.on && !R.dead ? HAWK : null; }   /* ONE shared object: copy it, never keep it */
    function warm(renderer, camera) {   /* compile the corridor's programs at load (never mid-scene): show it for one compile, then hide it */
      try { var was = root.visible; root.visible = true; setAlpha(1); renderer.compile(scene, camera); root.visible = was; setAlpha(R.alpha); return true; } catch (e) { return false; }
    }
    function peek() {   /* for guards and the bench: a new object each call (never per frame) */
      return { ready: true, on: R.on, dead: R.dead, error: API.error, progress: +R.s.toFixed(3), maxProgress: +R.maxS.toFixed(3), length: +L.toFixed(2), frac: +(R.s / L).toFixed(4),
        offset: +R.lat.toFixed(4), lane: RAIL_W, speed: +R.v.toFixed(3), inBand: R.band >= 0, band: R.band, bandDir: R.band >= 0 ? BANDS[R.band][2] : 0, push: +R.push.toFixed(3),
        waveGap: +(R.s - R.wave).toFixed(3), wave: +R.wave.toFixed(3), restarts: R.restarts, gate: R.gate, gates: GATES, gateEvery: GATE_EVERY, done: R.done,
        hawkAhead: +(R.hawkS - R.s).toFixed(3), hawkVisible: HAWK.visible, t: +R.t.toFixed(3), alpha: +R.alpha.toFixed(3), startedAt: R.startedAt,
        broken: { planks: planks.pB, posts: posts.pB }, props: { clouds: CL.length, streaks: SK.length, planks: planks.n, posts: posts.n }, drawCount: R.on ? DRAWS : 0,
        check: { minY: +minY.toFixed(2), maxY: +maxY.toFixed(2), samples: NS }, bands: BANDS.map(function (b) { return b.slice(); }), plant: R.plant };
    }
    var I = { dead: false, _plant: null, root: root, start: start, stop: stop, on: function () { return R.on && !R.dead; }, step: step, hawkPose: hawkPose, peek: peek, warm: warm };
    return I;
  }

  API = { create: create, last: null, error: null, RAIL_W: RAIL_W, V0: V0, CATCH: CATCH, GATE_EVERY: GATE_EVERY, BANDS: BANDS };
  return API;
}());
