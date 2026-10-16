/* runes.js - BOARD 632 U4, THE CLOUD PLATFORM AND THE RUNES RACE (Marth, Oct 15 2026 ~04:50, verbatim: "We should put almost like a semi
   invisible cloud platform (that’s only really visible when flying up to the cloud island) so we can introduce floating pillars and arches
   and statues (with moss ) that the bird can fly around/through retrieving the runes from 1 timed race against the falcon (he goes along the
   same pre ordained route) and another one trying to collect the 200 runes in 50 seconds challenge"; ~05:05: "Sometimes randomely a white
   feather 🪶 or a Huether will be randomely in between runes (pretty rare) but more often, if you complete the course with 90% or more
   collected or when u beat the falcon in the race up there"; ~13:34: "Yes the runes are the same" / "Yes a huether is a name I made up for a
   light-feather"). Itachi's brief: BRIEF_632_WEATHER_2026-10-15.md §4 U4.
   What lives here: ONE closed course (a Catmull-Rom loop) hung over the island, 110 m in from the temple, every point 45+ m from the temple's
   axis (outside the sky wall's cylinder), between 200 and 222 m up (inside skypiea's airspace: above WALL_Y + 6, under SKY_CAP); a
   semi-invisible cloud platform under it; floating pillars, stone arches and mossy bird statues; 200 runes on the line; the Falcon, who
   waits on the blue arch and flies the same line in a race; a rare white feather (the huether) between the runes.
   Two arches start the two challenges: the GOLD arch, 200 runes in 50 seconds of play; the BLUE arch (the Falcon's), one lap through eight
   arches against him. Built ONCE at load (instanced: five draw calls for the stone, the cloud and the runes), hidden and shown, never made
   per run; its programs compile at load (drawn at opacity 0 for the first frames: 651's lesson). Only OPACITY ever changes on its own
   materials (never side, transparent, alphaTest or fog; nothing shared with the game; nothing disposed). Like atmo.js and weather.js it
   never throws into the game: a fault hides the course, not the game. Timers run in seconds of PLAY (S.played: a pause, a talk, an event
   hold them). Saved keys (new, additive): S.runes (the one coin: row 639's rings), S.huethers (the one rare feather: row 639's helium
   feather), S.runeRec { best, race, wins }, S.seen.runes632. Every player-facing line is DRAFT for Marth. */
window.WFR_RUNES = (function () {
  'use strict';
  /* design numbers (DRAFT: his thumb decides) */
  var N = 200, LIMIT = 50, RACE_MAX = 120, GATES = 8, PICK_R = 2.4, ARCH_R = 4.2, COOL = 4;
  var RARE = 0.08, BONUS = 0.5, GOOD = 0.9;   /* a feather hides between the runes in 8% of runs; 50% at the end for 90%+ collected or a beaten Falcon */
  var INWARD = 110, BASE_Y = 212, PLAT_Y = 190;
  var RAIL_W = 2.5, LAT_K = 7, SPD_K = 1.5, V_UP = 0.5, V_DOWN = 0.4, V_MAX = 2.4, BURST = 0.4, BURST_T = 1.0, BURST_CD = 2.5, ZOOM_ADD = 0.8, JOIN_MIN = 0.6, JOIN_V = 8, JOIN_MAX = 20, LOOK = 8, LANE = 3.6, WAVES = 7, FAL0 = 1.294, FAL_LV = 0.006;   /* 632 U4b the rail: DRAFT, his thumb decides */
  /* the line, (a: inward from the temple, b: sideways, dy) about the course centre; P0 is the start and the finish, heading inward */
  var COURSE = [[-50, -14, 0], [-20, -22, -6], [12, -34, -12], [40, -30, -8], [54, -4, 0], [44, 24, 6], [16, 36, 10], [-16, 30, 6], [-44, 20, 2], [-62, 4, 0]];
  var API = null;
  function hash(x, z) { var s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }

  /* one geometry from many primitives, vertex-coloured: stone, and moss where a face looks up (and in patches) */
  function merge(T, parts) {
    var P = [], Nn = [], Cc = [], base = new T.Color(), moss = new T.Color(0x56783a);
    parts.forEach(function (p) {
      var g0 = p[0], g = g0.index ? g0.toNonIndexed() : g0; g.applyMatrix4(p[1]);
      var pa = g.attributes.position.array, na = g.attributes.normal.array; base.set(p[2]);
      for (var i = 0; i < pa.length; i += 3) {
        P.push(pa[i], pa[i + 1], pa[i + 2]); Nn.push(na[i], na[i + 1], na[i + 2]);
        var m = 0, ny = na[i + 1];
        if (p[3]) { if (ny > 0.3) m = Math.min(1, (ny - 0.3) / 0.5) * (0.55 + 0.45 * hash(pa[i], pa[i + 2])); if (hash(pa[i] * 3.1 + pa[i + 1], pa[i + 2] * 2.7) > 0.84) m = Math.max(m, 0.65); }
        var sh = 0.9 + 0.2 * hash(pa[i] + 7, pa[i + 1] + pa[i + 2]);
        Cc.push((base.r + (moss.r - base.r) * m) * sh, (base.g + (moss.g - base.g) * m) * sh, (base.b + (moss.b - base.b) * m) * sh);
      }
      if (g !== g0) g.dispose(); g0.dispose();   /* temporary geometries of our own, never uploaded */
    });
    var out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3)); out.setAttribute('color', new T.Float32BufferAttribute(Cc, 3));
    out.computeBoundingSphere(); return out;
  }

  function create(T, scene, o) {   /* the instance is kept as WFR_RUNES.last (for the bench); a fault as WFR_RUNES.error */
    try { var inst = build(T, scene, o); API.last = inst; return inst; } catch (err) { API.error = String(err && err.message || err); throw err; }
  }

  function build(T, scene, o) {
    var S = o.S, dead = false;
    var O = new T.Vector3(o.O[0], 0, o.O[2]);
    var u = new T.Vector3(-O.x, 0, -O.z); if (u.lengthSq() < 1) u.set(0, 0, 1); u.normalize();   /* inward, over the island */
    var v = new T.Vector3(-u.z, 0, u.x);
    var C = O.clone().addScaledVector(u, INWARD); C.y = BASE_Y;
    var at = function (a, b, y) { return C.clone().addScaledVector(u, a).addScaledVector(v, b).setY(y); };
    var curve = new T.CatmullRomCurve3(COURSE.map(function (p) { return at(p[0], p[1], BASE_Y + p[2]); }), true, 'centripetal');
    curve.arcLengthDivisions = 800; var L = curve.getLength();
    var SPN = 240, SP = curve.getSpacedPoints(SPN).slice(0, SPN);   /* for "where on the line is she" (the guard's aim) */
    var chk = { minFromO: 1e9, maxFromOrigin: 0, minY: 1e9, maxY: -1e9 };
    SP.forEach(function (p) { chk.minFromO = Math.min(chk.minFromO, Math.hypot(p.x - O.x, p.z - O.z)); chk.maxFromOrigin = Math.max(chk.maxFromOrigin, Math.hypot(p.x, p.z)); chk.minY = Math.min(chk.minY, p.y); chk.maxY = Math.max(chk.maxY, p.y); });
    var flat = function (t) { var d = curve.getTangentAt(t); d.y = 0; return d.lengthSq() < 1e-6 ? u.clone() : d.normalize(); };
    var inside = function (t, p) { var d = flat(t), n = new T.Vector3(d.z, 0, -d.x); if (n.dot(new T.Vector3(C.x - p.x, 0, C.z - p.z)) < 0) n.negate(); return n; };   /* toward the loop's middle */

    var root = new T.Group(); root.name = 'runes632'; scene.add(root);
    /* its OWN materials: transparent from birth, only their opacity ever moves */
    var M = {
      stone: new T.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0 }),
      cloud: new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a2f36, transparent: true, opacity: 0, depthWrite: false }),
      rune: new T.MeshBasicMaterial({ color: 0x7ff0dc, transparent: true, opacity: 0 }),
      gold: new T.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0, depthWrite: false }),
      blue: new T.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0, depthWrite: false }),
      feather: new T.MeshBasicMaterial({ color: 0xf6fbff, transparent: true, opacity: 0, side: T.DoubleSide })
    };
    var Mx = function (x, y, z, rx, ry, rz, sx, sy, sz) { return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(sx || 1, sy || 1, sz || 1)); };
    var dummy = new T.Object3D();
    var inst = function (geo, mat, n, name) { var m = new T.InstancedMesh(geo, mat, n); m.name = name; m.frustumCulled = false; root.add(m); return m; };   /* r128 culls an InstancedMesh by its first geometry's sphere at the origin: never cull */

    /* the arches: an opening ~7 m wide and ~8 m tall, its centre at the line; the keystone on top */
    var archGeo = merge(T, [
      [new T.TorusGeometry(4.2, 0.5, 6, 14, Math.PI), Mx(0, -1.2, 0), 0x9c978c, true],
      [new T.CylinderGeometry(0.55, 0.65, 4.4, 8), Mx(4.2, -3.4, 0), 0x958f84, true],
      [new T.CylinderGeometry(0.55, 0.65, 4.4, 8), Mx(-4.2, -3.4, 0), 0x958f84, true],
      [new T.BoxGeometry(1.5, 0.6, 1.5), Mx(4.2, -5.9, 0), 0x8a857a, true],
      [new T.BoxGeometry(1.5, 0.6, 1.5), Mx(-4.2, -5.9, 0), 0x8a857a, true],
      [new T.BoxGeometry(1.2, 0.9, 1.0), Mx(0, 3.35, 0), 0xa39e92, true]]);
    var P0 = curve.getPointAt(0), RACE_AT = P0.clone(), RUNES_AT = P0.clone().addScaledVector(inside(0, P0), 11);
    var GATE = []; for (var k = 0; k < GATES - 1; k++) GATE.push(curve.getPointAt((k + 1) / GATES)); GATE.push(RACE_AT);   /* the eighth is the finish: the blue arch again */
    var ARCHES = [RACE_AT, RUNES_AT].concat(GATE.slice(0, GATES - 1)), ARCH_T = [0, 0]; for (k = 0; k < GATES - 1; k++) ARCH_T.push((k + 1) / GATES);
    var arches = inst(archGeo, M.stone, ARCHES.length, 'runes632:arches');
    ARCHES.forEach(function (p, i) { var d = flat(ARCH_T[i]); dummy.position.copy(p); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.lookAt(p.x + d.x, p.y, p.z + d.z); dummy.updateMatrix(); arches.setMatrixAt(i, dummy.matrix); });

    /* floating pillars, off the line (9-13 m), bobbing slowly; a root of rock under each: they float */
    var pillarGeo = merge(T, [
      [new T.CylinderGeometry(1.1, 1.25, 14, 10), Mx(0, 0, 0), 0x9a958a, true],
      [new T.BoxGeometry(3.0, 0.8, 3.0), Mx(0, 7.4, 0), 0xa29d91, true],
      [new T.BoxGeometry(3.0, 0.8, 3.0), Mx(0, -7.4, 0), 0x8f8a7f, true],
      [new T.DodecahedronGeometry(1.4, 0), Mx(0, -9.0, 0, 0, 0, 0, 1, 1.4, 1), 0x7d786e, true]]);
    var PIL = []; for (k = 0; k < 10; k++) { var tp = (k + 0.5) / 10, pp = curve.getPointAt(tp), side = (k % 2 ? 1 : -1) * (9 + 4 * hash(k, 3)); PIL.push({ p: pp.clone().addScaledVector(inside(tp, pp), side).setY(pp.y + (hash(k, 9) - 0.5) * 10), ry: hash(k, 5) * 6.28, s: 0.8 + 0.4 * hash(k, 7), ph: k * 1.7 }); }
    var pillars = inst(pillarGeo, M.stone, PIL.length, 'runes632:pillars');

    /* mossy bird statues on the cloud, outside the loop, each looking in over the course */
    var statueGeo = merge(T, [
      [new T.BoxGeometry(3, 1.6, 3), Mx(0, 0.8, 0), 0x8f8a7f, true],
      [new T.SphereGeometry(1, 10, 8), Mx(0, 3.0, 0, 0, 0, 0, 1.0, 0.95, 1.5), 0xa09b90, true],
      [new T.SphereGeometry(0.62, 10, 8), Mx(0, 4.2, 1.15), 0xa09b90, true],
      [new T.ConeGeometry(0.24, 0.8, 6), Mx(0, 4.1, 1.85, Math.PI / 2, 0, 0), 0x8c877c, false],
      [new T.BoxGeometry(0.3, 1.2, 1.9), Mx(1.0, 3.2, -0.1, 0.25, 0, -0.2), 0x99948a, true],
      [new T.BoxGeometry(0.3, 1.2, 1.9), Mx(-1.0, 3.2, -0.1, 0.25, 0, 0.2), 0x99948a, true],
      [new T.BoxGeometry(0.9, 0.2, 1.6), Mx(0, 2.6, -1.7, -0.35, 0, 0), 0x99948a, true]]);
    var STAT = []; [0.12, 0.37, 0.62, 0.87].forEach(function (ts) { var p = curve.getPointAt(ts), out = inside(ts, p).negate(); STAT.push(p.clone().addScaledVector(out, 15).setY(PLAT_Y + 0.4)); });
    var statues = inst(statueGeo, M.stone, STAT.length, 'runes632:statues');
    STAT.forEach(function (p, i) { dummy.position.copy(p); dummy.rotation.set(0, Math.atan2(C.x - p.x, C.z - p.z), 0); dummy.scale.setScalar(1.4); dummy.updateMatrix(); statues.setMatrixAt(i, dummy.matrix); });

    /* the cloud platform: flattened puffs in a disc under the course (and one under each statue) */
    var PUFF = []; for (k = 0; k < 40; k++) { var ang = hash(k, 1) * 6.283, rr = 62 * Math.sqrt(hash(k, 2)); PUFF.push([C.x + Math.cos(ang) * rr, PLAT_Y - 1.5 + (hash(k, 4) - 0.5) * 2, C.z + Math.sin(ang) * rr, 7 + 6 * hash(k, 6)]); }
    STAT.forEach(function (p) { PUFF.push([p.x, PLAT_Y - 0.8, p.z, 6]); });
    var puffs = inst(new T.IcosahedronGeometry(1, 1), M.cloud, PUFF.length, 'runes632:cloud');
    PUFF.forEach(function (q, i) { dummy.position.set(q[0], q[1], q[2]); dummy.rotation.set(0, hash(i, 8) * 6.28, 0); dummy.scale.set(q[3], q[3] * 0.32, q[3] * 0.85); dummy.updateMatrix(); puffs.setMatrixAt(i, dummy.matrix); });

    /* the runes: 200 on the line (~1.5 m apart), one draw call; a taken rune is scaled to nothing, never removed */
    var runeGeo = new T.OctahedronGeometry(0.42, 0); runeGeo.scale(0.75, 1.0, 0.3);
    var RUNE = [], RLINE = [], RS = [], RLAT = [], AS = []; for (k = 0; k <= GATES; k++) AS.push(k * L / GATES);   /* 632 U4b: the arches' places */
    var weave = function (s) { var d = 1e9; for (var a = 0; a < AS.length; a++) d = Math.min(d, Math.abs(s - AS[a])); var x = Math.max(0, Math.min(1, (d - 2) / 5)); return LANE * Math.sin(2 * Math.PI * WAVES * s / L) * x * x * (3 - 2 * x); };   /* 0 through every arch, a smooth weave between */
    for (k = 0; k < N; k++) { var tk = 0.03 + 0.94 * k / (N - 1), lp = curve.getPointAt(tk), dk = flat(tk); RLINE.push(lp); RS.push(tk * L); RLAT.push(weave(tk * L)); RUNE.push(lp.clone().add(new T.Vector3(-dk.z, 0, dk.x).multiplyScalar(RLAT[k]))); }   /* right is (-d.z, 0, d.x) */
    var runes = inst(runeGeo, M.rune, N, 'runes632:runes'); runes.instanceMatrix.setUsage(T.DynamicDrawUsage);
    var alive = new Uint8Array(N);

    /* the huether: one white feather, made once */
    var fsh = new T.Shape(); fsh.moveTo(0, -1.2); fsh.quadraticCurveTo(0.55, -0.2, 0.12, 1.2); fsh.quadraticCurveTo(0, 1.32, -0.1, 1.15); fsh.quadraticCurveTo(-0.5, 0.1, 0, -1.2);
    var feather = new T.Mesh(new T.ShapeGeometry(fsh, 6), M.feather); feather.name = 'runes632:feather'; feather.scale.setScalar(1.2); feather.visible = false; root.add(feather);
    /* the two start halos (gold: runes; blue: the Falcon's race and, in a race, the next arch) */
    var haloGeo = new T.TorusGeometry(3.9, 0.16, 6, 32);
    var haloGold = new T.Mesh(haloGeo, M.gold), haloBlue = new T.Mesh(haloGeo, M.blue); haloGold.name = 'runes632:haloGold'; haloBlue.name = 'runes632:haloBlue'; root.add(haloGold); root.add(haloBlue);
    var aimHalo = function (h, p, t) { var d = flat(t); h.position.copy(p); h.lookAt(p.x + d.x, p.y, p.z + d.z); };
    aimHalo(haloGold, RUNES_AT, 0); aimHalo(haloBlue, RACE_AT, 0);

    /* the Falcon: one WFR_BIRDS falcon, waiting on the blue arch's keystone */
    var fal = null, FAL_SIZE = 1;
    try { if (window.WFR_BIRDS && o.BIRDS && o.BIRDS.falcon) { var fb = WFR_BIRDS.build(T, 'falcon', o.BIRDS.falcon, { renderer: o.renderer, folded: true }); fb.g.name = 'runes632:falcon'; FAL_SIZE = fb.g.scale.x * 1.3; fb.g.scale.setScalar(FAL_SIZE); root.add(fb.g); fal = { g: fb.g, rig: { wingL: fb.wingL, wingR: fb.wingR, tail: fb.tail, legs: fb.legs, body: fb.g, head: fb.head } }; } } catch (e) { fal = null; }
    var PERCH = RACE_AT.clone(); PERCH.y += 3.8 + 1.03 * FAL_SIZE;
    var perchYaw = Math.atan2(O.x - PERCH.x, O.z - PERCH.z);

    var st = { warm: 3, alpha: 0, mode: 'idle', t0: 0, el: 0, got: 0, gate: 0, cool: 0, lastPlayed: null, prev: new T.Vector3(), prevOk: false,
      vf: 0, fs: 0, fdone: false, tf: 0, fback: 1, fFrom: new T.Vector3(), rare: false, rareGot: false, gift: 0, last: null, refT: -99, said: false,
      force: { roll: null, falconK: null, pickR: null }, rolls: [], pill: '', fOff: 0 };
    var seg = new T.Line3(), tmp = new T.Vector3(), tmp2 = new T.Vector3(), q = new T.Quaternion(), e3 = new T.Euler(), one = new T.Vector3(1, 1, 1), zero = new T.Vector3(0.0001, 0.0001, 0.0001), mx = new T.Matrix4();
    /* 632 U4b: the rail's state and its scratch vectors, made once (the tick allocates nothing) */
    var RL = { on: false, s: 0, lat: 0, v: 0, jt: 1, jdur: JOIN_MIN, burstT: 0, cd: 0, age: 0, armT: -1, wrongT: -99,
      off: new T.Vector3(), P: new T.Vector3(), D: new T.Vector3(), Rt: new T.Vector3(), Q: new T.Vector3(), Pa: new T.Vector3(), Pb: new T.Vector3(), prev: new T.Vector3() };
    var RET = { camYaw: 0, v: 0, cd: 0, burst: false, armed: false, jt: 1 }, POSE = { on: false, s: 0, p: new T.Vector3(), t: new T.Vector3(), dir: { x: 0, z: 1 }, lat: 0, v: 0 };
    var D0 = flat(0), clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; }, wrapA = function (a) { return Math.atan2(Math.sin(a), Math.cos(a)); };
    function cruise() { return (o.cruise && o.cruise()) || 15; }

    function roll() { var r = st.force.roll != null ? st.force.roll : Math.random(); st.rolls.push(+r.toFixed(4)); if (st.rolls.length > 20) st.rolls.shift(); return r; }
    function pickR() { return st.force.pickR != null ? st.force.pickR : PICK_R; }
    function falconK() { return st.force.falconK != null ? st.force.falconK : FAL0 + FAL_LV * Math.min(25, (o.level && o.level()) || 1); }   /* 632 U4b: her cruise x 1.30 at level 1, x 1.444 at level 25 (was 0.70 + 0.006 x level): DRAFT */
    function say(t, ms) { try { o.toast(t, ms || 3200); } catch (e) { /* the slot is the game's */ } }
    function tone(f, d, v) { try { if (o.tone) o.tone(f, 0, d || 0.08, 'triangle', v || 0.035); } catch (e) { /* sound is optional */ } }
    function setAlpha(a) {
      M.stone.opacity = a; M.cloud.opacity = 0.34 * a; M.rune.opacity = a; M.feather.opacity = a;
      var pulse = 0.55 + 0.25 * Math.sin((S.t || 0) * 3); M.gold.opacity = pulse * a; M.blue.opacity = pulse * a;
    }
    function nearest(p) { var bi = 0, bd = 1e18; for (var i = 0; i < SPN; i++) { var d = SP[i].distanceToSquared(p); if (d < bd) { bd = d; bi = i; } } return bi; }

    function begin(kind) {
      var played = S.played || 0;
      st.mode = kind; st.t0 = played; st.el = 0; st.got = 0; st.gate = 0; st.rare = false; st.rareGot = false; st.last = null;
      for (var i = 0; i < N; i++) alive[i] = 1;
      runes.visible = true; feather.visible = false; st.gift = 0;
      if (roll() < RARE) { var j = 20 + Math.floor(Math.random() * 160); feather.position.copy(RLINE[j]).lerp(RLINE[j + 1], 0.5); st.rare = true; feather.visible = true; }
      if (kind === 'race') { var pace = (o.pace && o.pace()) || 1; st.vf = Math.max(4, ((o.cruise && o.cruise()) || 15) * falconK() * pace); st.tf = L / st.vf; st.fs = 0; st.fdone = false; st.fback = 1; }
      say(kind === 'race' ? 'Go! Fly the eight arches before the Falcon does.' : '200 runes, 50 seconds. Go!', 2200);   /* DRAFT */
      tone(988, 0.12, 0.06); tone(1319, 0.18, 0.05);
      if (S.mode === 'fly' && railStart(S.pos) && !(S.seen && S.seen.rail632)) { S.seen = S.seen || {}; S.seen.rail632 = true; try { o.save(); } catch (e) { /* fine */ } say((kind === 'race' ? 'Go! Fly the eight arches before the Falcon does.' : '200 runes, 50 seconds. Go!') + ' Stick up: faster. Flap: a burst.', 2600); }   /* 632 U4b: a run started on foot (the bench's door) stays unrailed. Obito R4: on her first railed run the tip rides in the Go line (one toast; DRAFT words) */
      if (o.hud) o.hud();
      return true;
    }
    function end(why) {
      if (RL.on) release();   /* 632 U4b */
      var k = st.mode, el = st.el, got = st.got, rec = S.runeRec = (S.runeRec && typeof S.runeRec === 'object') ? S.runeRec : {};
      var R = { kind: k, why: why, got: got, t: +el.toFixed(2), tf: k === 'race' ? +st.tf.toFixed(2) : null, win: false, rare: st.rareGot, bonus: false, newBest: false, eligible: false };
      S.runes = (S.runes || 0) + got;
      if (k === 'runes') { if (rec.best == null || got > rec.best) { rec.best = got; R.newBest = true; } }
      else if (why === 'finish' && el < st.tf) { R.win = true; rec.wins = (rec.wins || 0) + 1; if (rec.race == null || el < rec.race) { rec.race = +el.toFixed(2); R.newBest = true; } }
      R.eligible = R.win || (got >= Math.ceil(GOOD * N) && (k === 'runes' || why === 'finish'));   /* "more often": 90%+ of the course, or the Falcon beaten */
      if (R.eligible && roll() < BONUS) { R.bonus = true; S.huethers = (S.huethers || 0) + 1; st.gift = 2.2; feather.visible = true; }
      else if (!st.rareGot) feather.visible = false;
      st.mode = 'idle'; st.cool = (S.played || 0) + COOL; runes.visible = false; st.rare = false; st.last = R;
      var w;   /* DRAFT, every one */
      if (k === 'runes') w = why === 'all' ? 'Every rune! 200 in ' + el.toFixed(1) + ' seconds.' : why === 'time' ? got + ' runes in 50 seconds.' : why === 'rain' ? 'The rain closes the sky. You keep ' + got + ' runes.' : 'You left the course. You keep ' + got + ' runes.';
      else w = why === 'finish' ? (R.win ? 'You beat the Falcon! ' + el.toFixed(1) + ' s to his ' + st.tf.toFixed(1) + ' s.' : 'The Falcon wins this time: ' + st.tf.toFixed(1) + ' s to your ' + el.toFixed(1) + ' s.')
        : why === 'down' ? 'You touched down. The race is off.' : why === 'rain' ? 'The rain closes the sky. The race is off.' : why === 'time' ? 'Too long in the air. The Falcon wins this time.' : 'You left the course. The race is off.';
      if (k === 'race' && got) w += ' +' + got + ' runes.';
      if (R.newBest && k === 'runes') w += ' A new best!';
      if (R.bonus) w += ' A white feather drifts down to you!';
      try { if (R.win || why === 'all') { if (o.fanfare) o.fanfare(); } else if (o.ding) o.ding(); } catch (e) { /* sound is optional */ }
      try { o.save(); } catch (e) { /* private mode: it still plays */ }
      say(w, 4600); if (o.hud) o.hud();
      return R;
    }

    function step(dt) {
      var t = S.t || 0;
      if (st.warm > 0) {   /* drawn at opacity 0 (the Falcon at a speck's size) so every program compiles at load, never at the first visit */
        st.warm--; root.visible = true; feather.visible = true; feather.frustumCulled = false; haloGold.frustumCulled = false; haloBlue.frustumCulled = false; runes.visible = true;
        if (fal) { fal.g.scale.setScalar(0.0001); fal.g.position.copy(PERCH); }
        setAlpha(0);
        if (st.warm === 0) { feather.visible = false; feather.frustumCulled = true; haloGold.frustumCulled = true; haloBlue.frustumCulled = true; runes.visible = false; if (fal) fal.g.scale.setScalar(FAL_SIZE); }
        return;
      }
      var up = ((S.sky && S.sky.where) || 'home') === 'temple', closed = !!(o.closed && o.closed()), played = S.played || 0;
      var dp = st.lastPlayed == null ? 0 : Math.max(0, Math.min(0.25, played - st.lastPlayed)); st.lastPlayed = played;
      if (dp > dt) dp = dt;   /* Obito R1 (Jiraiya): the pouch slows the island to 0.35x while S.played counts real seconds: the run's clock and the Falcon follow the game's dt, slowing with her (a pause still holds them) */
      var want = S.mode === 'menu' ? 0 : up ? (closed ? 0.28 : 1) : 0;   /* semi-invisible: seen only from the sky island; rain all but hides it */
      st.alpha += (want - st.alpha) * Math.min(1, dt * 1.5); if (Math.abs(want - st.alpha) < 0.003) st.alpha = want;
      root.visible = st.alpha > 0.01 || st.mode !== 'idle';
      setAlpha(st.alpha);
      var me = S.pos, fly = S.mode === 'fly';
      if (!st.prevOk || st.prev.distanceToSquared(me) > 900) { st.prev.copy(me); st.prevOk = true; }   /* a jump (Home, a lift, a reload) is never a flight through anything */
      seg.set(st.prev, me);
      var near = function (p, r) { return seg.closestPointToPoint(p, true, tmp).distanceToSquared(p) < r * r; };
      var nearArch = function (p) { seg.closestPointToPoint(p, true, tmp); var dy = tmp.y - p.y; return Math.hypot(tmp.x - p.x, tmp.z - p.z) < ARCH_R && dy > -5.2 && dy < 3.0; };   /* the stone opening: ~4 m either side, from the legs' feet to under the keystone */

      if (st.mode === 'idle') {
        if (fly && up && played >= st.cool && st.alpha > 0.2) {
          var hitRace = nearArch(RACE_AT), hitRunes = !hitRace && nearArch(RUNES_AT);
          if (hitRace || hitRunes) { if (closed) { if (played - st.refT > 6) { st.refT = played; say('Rain clouds hide the runes course today. Come back when the sky clears.', 3600); } } else if (Math.sin(S.yaw) * D0.x + Math.cos(S.yaw) * D0.z > 0.3) begin(hitRace ? 'race' : 'runes'); else if (played - RL.wrongT > 6) { RL.wrongT = played; say('Fly through the arch the other way to start.', 2600); } }   /* DRAFT; 632 U4b: the heading rule */
        }
        if (up && !st.said && st.alpha > 0.9 && !closed && (S.mode === 'walk' || S.mode === 'fly') && (!o.calm || o.calm())) {
          S.seen = S.seen || {}; st.said = true;
          if (!S.seen.runes632) { S.seen.runes632 = true; try { o.save(); } catch (e) { /* fine */ } say('Old stone floats on the clouds below the temple. The gold arch: 200 runes in 50 seconds. The blue arch: race the Falcon.', 5200); }   /* DRAFT */
        }
      } else {
        st.el += dp;
        if (!up) { end('left'); }
        else if (closed) { end('rain'); }
        else if (st.mode === 'race' && (S.mode === 'walk' || S.mode === 'landing' || S.mode === 'swim')) { end('down'); }
        else if (RL.on && S.mode !== 'fly' && S.mode !== 'paused') { end('left'); }   /* 632 U4b */
        else {
          if (fly) { var r = pickR(); for (var i = 0; i < N; i++) if (alive[i] && near(RUNE[i], r)) { alive[i] = 0; st.got++; tone(1568 + (st.got % 5) * 110, 0.06, 0.03); } }
          if (st.rare && !st.rareGot && fly && near(feather.position, pickR() + 0.6)) { st.rareGot = true; st.rare = false; feather.visible = false; S.huethers = (S.huethers || 0) + 1; try { o.save(); } catch (e) { /* fine */ } say('A white feather! You have ' + S.huethers + '.', 3000); tone(1760, 0.2, 0.06); tone(2349, 0.25, 0.05); }   /* DRAFT */
          if (st.mode === 'race') {
            if (!st.fdone) { st.fs += st.vf * dp; if (st.fs >= L) { st.fdone = true; st.fback = 0; st.fFrom.copy(RACE_AT); } }
            if (fly && nearArch(GATE[st.gate])) { st.gate++; try { if (o.ding) o.ding(); } catch (e) { /* fine */ } if (st.gate >= GATES) end('finish'); }
          }
          if (st.mode === 'runes' && st.got >= N) end('all');
          else if (st.mode !== 'idle' && st.el >= (st.mode === 'runes' ? LIMIT : RACE_MAX)) end('time');
        }
      }
      st.prev.copy(me);
      animate(dt, t, closed);
      var pl = pill(); if (pl !== st.pill) { st.pill = pl; if (o.hud) o.hud(); }
    }

    function animate(dt, t, closed) {
      if (!root.visible) return;
      if (runes.visible) {
        for (var i = 0; i < N; i++) {
          var p = RUNE[i]; e3.set(0, t * 2.2 + i * 0.37, 0); q.setFromEuler(e3); tmp2.set(p.x, p.y + Math.sin(t * 2 + i * 0.3) * 0.15, p.z);
          runes.setMatrixAt(i, mx.compose(tmp2, q, alive[i] ? one : zero));
        }
        runes.instanceMatrix.needsUpdate = true;
      }
      for (var k = 0; k < PIL.length; k++) { var c = PIL[k]; dummy.position.set(c.p.x, c.p.y + Math.sin(t * 0.4 + c.ph) * 0.6, c.p.z); dummy.rotation.set(0, c.ry, 0); dummy.scale.setScalar(c.s); dummy.updateMatrix(); pillars.setMatrixAt(k, dummy.matrix); }
      pillars.instanceMatrix.needsUpdate = true;
      /* the halos: idle, gold in the runes arch and blue in the Falcon's; in a race, blue in the NEXT arch; none in the rain */
      haloGold.visible = st.mode === 'idle' && !closed;
      haloBlue.visible = (st.mode === 'idle' && !closed) || st.mode === 'race';
      if (st.mode === 'race') { var gi = Math.min(st.gate, GATES - 1); aimHalo(haloBlue, GATE[gi], gi === GATES - 1 ? 0 : (gi + 1) / GATES); }
      else aimHalo(haloBlue, RACE_AT, 0);
      /* the feather: a slow spin where it hides; a gift drifts down before her eyes */
      if (st.gift > 0) { st.gift -= dt; var cam = o.camera || null; if (cam) { tmp2.set(0, 0, -4).applyQuaternion(cam.quaternion).add(cam.position); feather.position.copy(tmp2); feather.position.y += st.gift * 0.5 - 0.5; } feather.rotation.set(0.3, t * 2, Math.sin(t * 3) * 0.4); if (st.gift <= 0) feather.visible = false; }
      else if (feather.visible) { feather.rotation.set(0, t * 1.6, 0.25); }
      /* the Falcon: on the keystone; in a race, on the line at his own pace; home again after */
      if (fal) {
        var g = fal.g;
        if (st.mode === 'race' && !st.fdone) {
          var u0 = (st.fs / L) % 1, pt = curve.getPointAt(u0), tg = curve.getTangentAt(u0), ease = Math.min(1, st.el / 0.6);
          g.position.copy(PERCH).lerp(pt, ease); g.rotation.set(-Math.asin(Math.max(-1, Math.min(1, tg.y))), Math.atan2(tg.x, tg.z), 0);
          try { if (WFR_BIRDS.fly) WFR_BIRDS.fly(fal.rig, dt, { t: t, flap: (t % 1.2) < 0.5, speed: st.vf, turn: 0 }); if (WFR_BIRDS.tuck) WFR_BIRDS.tuck(fal.rig, 1); } catch (e) { /* a pose is optional */ }
        } else if (st.fback < 1) {
          st.fback = Math.min(1, st.fback + dt / 2.5); g.position.copy(st.fFrom).lerp(PERCH, st.fback); g.position.y += Math.sin(st.fback * Math.PI) * 2; g.rotation.set(0, perchYaw, 0);
          try { if (WFR_BIRDS.fly) WFR_BIRDS.fly(fal.rig, dt, { t: t, flap: true, hover: 0.6, speed: 6, turn: 0 }); } catch (e) { /* fine */ }
        } else {
          g.position.copy(PERCH); g.rotation.set(0, perchYaw, 0);
          if (fal.rig.wingL) { fal.rig.wingL.rotation.set(0, 1.3, -0.18); fal.rig.wingR.rotation.set(0, -1.3, 0.18); }
          try { if (WFR_BIRDS.tuck) WFR_BIRDS.tuck(fal.rig, 0); } catch (e) { /* fine */ }
        }
      }
    }

    /* RAIL-TICK BEGIN: nothing between these markers allocates (tests/rail632.js reads this text) */
    function lineAt(s, outP, outD) {   /* the line at arc length s into outP (and its unit tangent into outD, from two points: r128's getTangent makes two vectors) */
      var uu = (((s % L) + L) % L) / L, e = 0.5 / L; curve.getPointAt(uu, outP);
      if (outD) { curve.getPointAt((uu + e) % 1, RL.Pa); curve.getPointAt((uu - e + 1) % 1, RL.Pb); outD.subVectors(RL.Pa, RL.Pb).normalize(); }
      return outP;
    }
    function railStep(dt, sx, sy) {
      var c = cruise(), pace = (o.pace && o.pace()) || 1, zk = o.zoom ? o.zoom() : 0;
      RL.age += dt; RL.cd = Math.max(0, RL.cd - dt); RL.burstT = Math.max(0, RL.burstT - dt);
      var want = c * (1 + V_UP * Math.max(0, sy) - V_DOWN * Math.max(0, -sy));
      if (RL.burstT > 0 || S.flutT > 0) want += BURST * c;
      if (zk > 0) want += ZOOM_ADD * c * zk;
      RL.v += (want - RL.v) * Math.min(1, dt * SPD_K); RL.v = clamp(RL.v, (1 - V_DOWN) * c, V_MAX * c);
      RL.s = (RL.s + RL.v * pace * dt) % L;
      RL.lat += (clamp(sx, -1, 1) * RAIL_W - RL.lat) * Math.min(1, dt * LAT_K); RL.lat = clamp(RL.lat, -RAIL_W, RAIL_W);
      RL.jt = Math.min(1, RL.jt + dt / RL.jdur); var e = 1 - RL.jt * RL.jt * (3 - 2 * RL.jt);
      lineAt(RL.s, RL.P, RL.D); RL.Rt.set(-RL.D.z, 0, RL.D.x).normalize();
      RL.prev.copy(S.pos); S.pos.copy(RL.P).addScaledVector(RL.Rt, RL.lat).addScaledVector(RL.off, e);
      var dx = S.pos.x - RL.prev.x, dy = S.pos.y - RL.prev.y, dz = S.pos.z - RL.prev.z, h = Math.hypot(dx, dz);
      if (h > 1e-4 && dt > 0) { var tn = wrapA(Math.atan2(dx, dz) - S.yaw) * Math.min(1, dt * 12); S.yaw += tn;
        S.yawV = (S.yawV || 0) + (-tn / dt - (S.yawV || 0)) * Math.min(1, dt * 6);   /* the game's sign: S.yaw -= S.yawV * dt */
        S.pitch += (clamp(Math.atan2(dy, h), -0.5, 0.5) - S.pitch) * Math.min(1, dt * 6); }
      S.speed = RL.v;   /* for the wings, the chick and the lift readers; never fed back */
      curve.getPointAt(((RL.s + LOOK) % L) / L, RL.Q);
      RET.camYaw = Math.atan2(RL.Q.x - RL.P.x, RL.Q.z - RL.P.z); RET.v = RL.v; RET.cd = RL.cd; RET.burst = RL.burstT > 0; RET.armed = RL.armT > (S.played || 0); RET.jt = RL.jt;
      return RET;
    }
    /* RAIL-TICK END */
    function kill(err) { dead = true; RL.on = false; root.visible = false; st.mode = 'idle'; API.error = String(err && err.message || err); try { console.warn('runes stopped: ' + API.error); if (o.hud) o.hud(); } catch (e) { /* fine */ } }
    function railed() { return !dead && RL.on && st.mode !== 'idle'; }
    function rail(dt, sx, sy) {   /* the html's railFly calls this once a frame while railed(); a fault stops the course, never the game */
      if (!railed()) return null;
      try { return railStep(dt, sx, sy); } catch (err) { kill(err); return null; }   /* the first run's tip rides in its Go line (begin) */
    }
    function railStart(me) {
      var s0 = nearest(me) * L / SPN; lineAt(s0, RL.P, null);
      if (RL.P.distanceTo(me) > JOIN_MAX) { RL.on = false; return false; }   /* a bench start far off the line rides free */
      var c = cruise(); RL.on = true; RL.s = s0; RL.lat = 0; RL.off.copy(me).sub(RL.P); RL.jt = 0; RL.jdur = Math.max(JOIN_MIN, RL.off.length() / JOIN_V);
      RL.v = clamp(S.speed || c, (1 - V_DOWN) * c, V_MAX * c); RL.burstT = 0; RL.cd = 0; RL.age = 0; RL.armT = -1;
      S.hold = false; S.holdT = 0; S.hoverK = 0; S.longK = 0; if (S.camYaw === undefined) S.camYaw = S.yaw; return true;
    }
    function release() { RL.on = false; RL.armT = -1; S.speed = clamp(RL.v, 7, 30); S.yawV = 0; S.hold = false; S.holdT = 0; S.pitch = clamp(S.pitch, -0.3, 0.3); }   /* her momentum along the line; S.camYaw is kept: no camera cut */
    function burst() { if (!railed() || RL.cd > 0) return false; RL.burstT = BURST_T; RL.cd = BURST_CD; tone(1175, 0.08, 0.04); return true; }
    function leave() { if (!railed()) return false; var now = S.played || 0; if (!(RL.armT > now)) { RL.armT = now + 2; return false; } try { end('left'); } catch (err) { kill(err); } return true; }   /* two taps inside 2 s: Land sits beside Flap */
    function railPose(back) {   /* 621 V2's hook: the line point back m behind her, at her side offset; t its unit tangent, dir its flat unit tangent. ONE shared object: copy it, never keep it */
      if (!railed()) return null; lineAt(RL.s - (back == null ? 4 : back), POSE.p, POSE.t);
      var fl = Math.hypot(POSE.t.x, POSE.t.z) || 1; POSE.dir.x = POSE.t.x / fl; POSE.dir.z = POSE.t.z / fl; POSE.p.x += -POSE.dir.z * RL.lat; POSE.p.z += POSE.dir.x * RL.lat;
      POSE.on = true; POSE.s = RL.s; POSE.lat = RL.lat; POSE.v = RL.v; return POSE;
    }
    function line(n) { return curve.getSpacedPoints(n || 2400).map(function (p) { return p.toArray(); }); }   /* bench only */
    function nextLat() { var best = -1, bd = 1e9; for (var i = 0; i < N; i++) if (alive[i]) { var d = ((RS[i] - RL.s) % L + L) % L; if (d < bd) { bd = d; best = i; } } return best < 0 ? null : RLAT[best]; }   /* bench only: the pilot's eyes */

    function pill() {   /* the ONE line of HUD (the game's quest line); DRAFT words */
      if (dead) return '';
      if (st.mode === 'runes') return '✦ ' + st.got + ' / ' + N + ' · ' + Math.max(0, Math.ceil(LIMIT - st.el)) + ' s';
      if (st.mode === 'race') return '🏁 Arch ' + Math.min(st.gate + 1, GATES) + ' / ' + GATES + ' · ' + Math.floor(st.el) + ' s · ✦ ' + st.got;
      if (((S.sky && S.sky.where) || 'home') === 'temple' && st.alpha > 0.5 && Math.hypot(S.pos.x - C.x, S.pos.z - C.z) < 130) return '✦ ' + (S.runes || 0) + ' runes · 🪶 ' + (S.huethers || 0);
      return '';
    }
    function goal() { return st.mode === 'race' ? GATE[Math.min(st.gate, GATES - 1)] : null; }   /* the compass: the next arch, in a race only */

    function tick(dt) {
      if (dead) return;
      try { step(dt); } catch (err) { dead = true; root.visible = false; st.mode = 'idle'; API.error = String(err && err.message || err); try { console.warn('runes stopped: ' + API.error); if (o.hud) o.hud(); } catch (e) { /* fine */ } }
    }
    function start(kind) { if (dead || st.mode !== 'idle' || (kind !== 'race' && kind !== 'runes')) return false; return begin(kind); }
    function force(f) { if (!f) { st.force.roll = null; st.force.falconK = null; st.force.pickR = null; } else Object.keys(f).forEach(function (k2) { if (k2 in st.force) st.force[k2] = f[k2] == null ? null : +f[k2]; }); return Object.assign({}, st.force); }
    function peek() {
      var me = S.pos, ni = nearest(me), ahead = SP[(ni + Math.round(12 / (L / SPN))) % SPN], n = 0, objs = 0;
      for (var i = 0; i < N; i++) if (alive[i]) n++;
      root.traverse(function () { objs++; });
      var fp = fal ? fal.g.position : null, fOn = null;
      if (fp) { var fi = nearest(fp); fOn = +SP[fi].distanceTo(fp).toFixed(2); }
      return { ready: true, dead: dead, error: API.error, mode: st.mode, warm: st.warm, alpha: +st.alpha.toFixed(3), visible: root.visible, got: st.got, n: N, alive: n, limit: LIMIT, el: +st.el.toFixed(3), gate: st.gate, gates: GATES,
        L: +L.toFixed(1), vf: +st.vf.toFixed(3), tf: +st.tf.toFixed(3), fs: +st.fs.toFixed(2), fdone: st.fdone, falcon: fp ? fp.toArray() : null, falconOnLine: fOn, falconPerched: fp ? fp.distanceTo(PERCH) < 0.05 : null, falconK: +falconK().toFixed(3),
        rare: st.rare, rareGot: st.rareGot, feather: feather.visible ? feather.position.toArray() : null, gift: st.gift > 0, last: st.last, rolls: st.rolls.slice(), force: Object.assign({}, st.force), pickR: pickR(), cool: st.cool,
        raceArch: RACE_AT.toArray(), runesArch: RUNES_AT.toArray(), gatesAt: GATE.map(function (p) { return p.toArray(); }), ahead: ahead.toArray(), centre: C.toArray(), temple: [O.x, O.z], check: chk,
        runeAt: [RUNE[0].toArray(), RUNE[N - 1].toArray()], me: me.toArray(), yaw: S.yaw, objects: objs, pill: pill(), haloGold: haloGold.visible, haloBlue: haloBlue.visible,
        runes: S.runes || 0, huethers: S.huethers || 0, rec: Object.assign({}, S.runeRec || {}),
        rail: { on: RL.on, s: RL.s, lat: RL.lat, v: RL.v, jt: RL.jt, jdur: RL.jdur, cd: RL.cd, burstT: RL.burstT, armed: RL.armT > (S.played || 0) }, W: RAIL_W, lane: LANE, D0: [D0.x, D0.z],   /* 632 U4b (bench only) */
        pillars: PIL.map(function (c) { return c.p.toArray(); }), statues: STAT.map(function (p) { return p.toArray(); }), next: nextLat() };
    }
    return { tick: tick, peek: peek, pill: pill, goal: goal, start: start, force: force, root: root, rail: rail, railed: railed, railPose: railPose, burst: burst, leave: leave, line: line };   /* 632 U4b: rail .. line */
  }

  API = { create: create, last: null, error: null, N: N, LIMIT: LIMIT, RARE: RARE, BONUS: BONUS, GOOD: GOOD };
  return API;
}());
