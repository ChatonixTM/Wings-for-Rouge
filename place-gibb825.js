/* place-gibb825.js - BOARD 825, MAURICE GIBB MEMORIAL PARK IS A PLACE SHE CAN KNOW (Wings for Rouge). Nov 14 2026. Every number DRAFT (unmeasured on her phone).
   Marth, Nov 14 2026, 18:08, verbatim: "This is Maurice Gibbs?" (with his three pictures, refs-1111/bugs-825/: two of the real park, one of the game: the
   park's name over flat green suburbs, and Biscayne Bay itself drawn as green land; the bay is mended in world712-travel.js and world-look755b.js).

   WHAT ROUGE SEES at the real park (Sunset Harbour, Miami Beach, on Biscayne Bay's east shore), low-poly in the travel world's own look:
     - the low sea wall along the bay with its rail and the rip-rap at its foot, and the two small lookouts that jut from it;
     - the pale promenade along the wall and the paths that wind through the lawn to a round plaza (the playground's floor);
     - five shade sails over the playground, navy and greys, on their poles;
     - the big leaning guitar (an amber body, a dark neck) and the leaning piano-keys tower (grey, a keyboard down its face, red and yellow squares on top);
     - the wave-shaped grey stone sign with its round hole at the Purdy Avenue gate;
     - palms along the wall and the street, low shrubs, two broad shade trees;
     - the bay beside it (a water apron from the sea wall over to Belle Isle and the Sunset Islands, in the ground's own sea colours: the coarse ground
       sheets put the shore a few hundred metres out at her flying height), the Sunset Harbour Yacht Club's piers with boats at them, a few moored out.
   WHERE THE NUMBERS COME FROM: OpenStreetMap (ODbL; the street map's credit line already names it), read Nov 14 2026 through Overpass: the park way
   258236772 (leisure=park, 25.79171-25.79390 N, 80.14446-80.14511 W), the coastline ways 590778516 / 590778513 (Miami Beach's bay shore), Belle Isle
   23874119, the Sunset Islands 23912104 / 23912120, the yacht club's marina 76692192 and its piers 263233258..66, the slipway 522511668, the lookouts
   1493416987 / 1493416988. The sculptures' look from his two pictures of the real park (the guitar, the piano tower, the sails, the sign).
   BORROWED: place-dunns797.js's merge() and M4() (parts merged into one coloured, non-indexed geometry), the travel ground's own material and program
   (WFR_TRAVEL712.makeMaterial, untagged: the program the ground compiled at load; with polygonOffset its look is off, so the sails keep their navy), the
   travel ground's height (TRAVEL712.st.H) and its drawn-sheet signature (drawnSig, 798's) to sit on whatever sheet is drawn, WFR_WORLD.toLocal to stand at
   the true spot through every re-centre and the Gleason flip.
   COST LAW (Marth's): everything is made at load, inside the travel ground's holder (made at load by 824): no scene child, no material, no program is
   added mid-play. Three draws (the park, the boats and piers, the water). The tick reads two numbers a frame; the drape (a few hundred heights) runs
   only when the drawn ground under the park changes. Shown only in the travel zone, within C.SHOW m of the park.
   THE PAGE HANDS IT (one init line where the travel material is made): { THREE, T: TRAVEL712 }; one tick line before the travel frame's render.
   Classic is frozen (board 645): init refuses there and nothing is made. */
window.WFR_GIBB825 = (function () {
  'use strict';
  var C = { LAT: 25.79281, LON: -80.14478, SHOW: 30000, BASE: 0.35, WATER: 0.3, CELL: 18, SKIRT: 6, ORDER: [-9.36, -9.37, -9.38],
    /* the ground's own bay colour (a sea vertex there wears 75,122,113: its shallow turquoise in 755b's ramp) */
    BAY: [75 / 255, 122 / 255, 113 / 255] };
  /* park-local metres: x east, z SOUTH (the travel frame's sense), origin the park's middle (OSM way 258236772) */
  var PARK = [[-31, -121], [-29, 121], [32, 121], [32, -121]];
  var SHORE = [[-40, -367], [-39, -309], [-35, -215], [-32, -135], [-33, -102], [-32, -55], [-31, 3], [-29, 39], [-28, 57], [-31, 92], [-26, 140]];   // way 590778516, north to south
  var APRON = [[-44, -392]].concat(SHORE.map(function (q) { return [q[0] - 1.6, q[1]]; })).concat([[-100, 141], [-167, 140], [-212, 92], [-291, 25], [-337, -7], [-440, -11], [-482, 0], [-600, 0], [-640, -600], [-160, -600], [-140, -530],
    [-100, -466], [-54, -415]]);   // the bay west of the wall: the shore, Belle Isle's north side (23874119), the Sunset Islands' south side (23912104)
  var PIERS = [[[-165, -363], [-40, -367]], [[-157, -130], [-32, -135]], [[-165, -363], [-157, -130]], [[-133, -325], [-131, -276]], [[-132, -307], [-39, -309]], [[-130, -241], [-128, -192]],
    [[-129, -214], [-35, -215]], [[-31, -103], [-57, -102]], [[-32, -92], [-57, -91]], [[-32, -74], [-55, -73]]];
  var X = null, T3 = null, st = { inited: false, why: null, fault: null, built: false, group: null, meshes: [], f: null, sig: '', base: 0, ticks: 0, drapes: 0, shown: false, at: null, tris: 0, ms: 0 };
  var B = { e: null, s: null, k: 1, cx: 0, cz: 0 };

  /* ---------- the parts (place-dunns797.js's merge and M4, borrowed) ---------- */
  function merge(parts) {
    var P = [], N = [], Cc = [], v = new T3.Vector3(), nm = new T3.Matrix3();
    parts.forEach(function (q) { var g = q.g.index ? q.g.toNonIndexed() : q.g; g.computeVertexNormals(); var p = g.attributes.position, n = g.attributes.normal; nm.getNormalMatrix(q.m || new T3.Matrix4());
      for (var i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); var y0 = v.y; if (q.m) v.applyMatrix4(q.m); P.push(v.x, v.y, v.z); v.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
        var c = typeof q.c === 'function' ? q.c(y0, i) : q.c; Cc.push(c[0], c[1], c[2]); } });
    var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T3.Float32BufferAttribute(N, 3)); g.setAttribute('color', new T3.Float32BufferAttribute(Cc, 3)); return g;
  }
  function M4(x, y, z, sx, sy, sz, ry, rx, rz) { var m = new T3.Matrix4(), q = new T3.Quaternion().setFromEuler(new T3.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')); m.compose(new T3.Vector3(x, y, z), q, new T3.Vector3(sx, sy == null ? sx : sy, sz == null ? sx : sz)); return m; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rgb(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; }
  var COL = { lawn: rgb(0x5f8f3e), path: rgb(0xe4dccb), plaza: rgb(0xd9cfb8), rubber: rgb(0x5d7fa6), rubber2: rgb(0xe0b642), wall: rgb(0xcfcbc0), wallDark: rgb(0x8e8a80), rail: rgb(0x23262b),
    rock: rgb(0x8d8c88), navy: rgb(0x22345f), grey: rgb(0x9a9ea6), pale: rgb(0xd4d6da), pole: rgb(0xb9bcc2), amber: rgb(0xe08a2a), amberDark: rgb(0x8a4a16), neck: rgb(0x2a2420),
    hole: rgb(0x14110f), piano: rgb(0x8f949b), key: rgb(0xf4f2ec), keyBlack: rgb(0x1d1f23), red: rgb(0xd8352c), yellow: rgb(0xf2c230), orange: rgb(0xec7a23), stone: rgb(0xb7b4ad),
    trunk: rgb(0x8a7a62), palm: rgb(0x3f7f34), palm2: rgb(0x5c9a3c), shrub: rgb(0x2f5f2a), shrub2: rgb(0x47763a), tree: rgb(0x4c7d36), wood: rgb(0xb59a76), hull: rgb(0xf3f3f0), deck: rgb(0xcab79a),
    canopyN: rgb(0x26365c), mast: rgb(0xdedfe2), skirt: rgb(0x55574f) };

  function flat(pts, y, c) { var sh = new T3.Shape(pts.map(function (p) { return new T3.Vector2(p[0], -p[1]); })), g = new T3.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return { g: g, c: c }; }   // a flat polygon (x, z) at height y, facing up
  function strip(a, b, w, y, c) { var dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); return { g: new T3.BoxGeometry(L, 0.12, w), m: M4((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, 1, 1, 1, -Math.atan2(dz, dx)), c: c }; }
  function wallSeg(a, b, w, h, y, c) { var dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); return { g: new T3.BoxGeometry(L + 0.2, h, w), m: M4((a[0] + b[0]) / 2, y + h / 2, (a[1] + b[1]) / 2, 1, 1, 1, -Math.atan2(dz, dx)), c: c }; }
  function sail(c, p) {   // a shade sail: a twisted quad (hypar) from four corner posts, both faces
    var g = new T3.BufferGeometry(), v = []; [[0, 1, 2], [0, 2, 3], [0, 2, 1], [0, 3, 2]].forEach(function (t) { t.forEach(function (i) { v.push(p[i][0], p[i][1], p[i][2]); }); });
    g.setAttribute('position', new T3.Float32BufferAttribute(v, 3)); return { g: g, c: c };
  }
  function palm(parts, x, z, h, r) {
    var lean = (r() - 0.5) * 0.25, ry = r() * 6.28; parts.push({ g: new T3.CylinderGeometry(0.2, 0.3, h, 6), m: M4(x, h / 2, z, 1, 1, 1, ry, lean), c: COL.trunk });
    var tx = x + Math.sin(lean) * h * Math.sin(ry) * 0.5, tz = z + Math.sin(lean) * h * Math.cos(ry) * 0.5;
    for (var i = 0; i < 7; i++) { var a = i / 7 * 6.28 + r(); parts.push({ g: new T3.BoxGeometry(4.2, 0.12, 1.1), m: M4(tx + Math.cos(a) * 2, h - 0.6, tz + Math.sin(a) * 2, 1, 1, 1, -a, 0, -0.45), c: i % 2 ? COL.palm : COL.palm2 }); }
  }
  function blob(parts, x, y, z, s, c, sy) { parts.push({ g: new T3.IcosahedronGeometry(1, 0), m: M4(x, y, z, s, s * (sy || 0.7), s, x * 0.3), c: c }); }

  function buildPark() {
    var p = [], r = rng(825);
    /* the ground: the lawn over the park's outline, with a skirt (the drawn sheet under it moves with its detail) */
    p.push(flat(PARK, 0, COL.lawn)); p.push({ g: new T3.BoxGeometry(63, C.SKIRT, 242), m: M4(0.5, -C.SKIRT / 2 - 0.15, 0), c: COL.skirt });
    /* the promenade along the wall, the plaza, the winding paths */
    for (var i = 0; i < SHORE.length - 1; i++) if (SHORE[i][1] > -125 && SHORE[i + 1][1] < 125) p.push(strip([SHORE[i][0] + 4.5, Math.max(-121, SHORE[i][1])], [SHORE[i + 1][0] + 4.5, Math.min(121, SHORE[i + 1][1])], 6, 0.08, COL.path));
    var circ = []; for (i = 0; i < 20; i++) circ.push([4 + Math.cos(i / 20 * 6.283) * 19, -12 + Math.sin(i / 20 * 6.283) * 22]); p.push(flat(circ, 0.1, COL.plaza));
    var inner = []; for (i = 0; i < 16; i++) inner.push([5 + Math.cos(i / 16 * 6.283) * 13, -13 + Math.sin(i / 16 * 6.283) * 15]); p.push(flat(inner, 0.14, COL.rubber));
    var sw = []; for (i = 0; i < 10; i++) sw.push([0 + Math.cos(i / 10 * 6.283) * 5, -8 + Math.sin(i / 10 * 6.283) * 4]); p.push(flat(sw, 0.17, COL.rubber2));
    [[[-24, -60], [-6, -40], [6, -34]], [[23, -10], [32, -6]], [[4, 10], [10, 40], [4, 75], [20, 100], [32, 104]], [[4, 75], [-24, 90]], [[-24, 30], [-6, 20], [4, 10]], [[6, -34], [10, -70], [-6, -100], [-24, -112]]].forEach(function (L) {
      for (var k = 0; k < L.length - 1; k++) p.push(strip(L[k], L[k + 1], 3.2, 0.09, COL.path)); });
    /* the sea wall: its face down to the water, its cap, the rail, and the rip-rap at its foot; the two lookouts */
    for (i = 0; i < SHORE.length - 1; i++) if (SHORE[i][1] > -130 && SHORE[i][1] < 130) { var a = SHORE[i], b = SHORE[i + 1];
      p.push(wallSeg(a, b, 1.0, 6.6, -6.0, COL.wallDark)); p.push(wallSeg([a[0] + 0.3, a[1]], [b[0] + 0.3, b[1]], 1.2, 0.45, 0.45, COL.wall)); p.push(wallSeg([a[0] + 0.6, a[1]], [b[0] + 0.6, b[1]], 0.1, 0.1, 1.45, COL.rail));
      var L2 = Math.hypot(b[0] - a[0], b[1] - a[1]); for (var t = 0; t < L2; t += 6) { var f = t / L2; p.push({ g: new T3.BoxGeometry(0.12, 1.1, 0.12), m: M4(a[0] + 0.6 + (b[0] - a[0]) * f, 0.95, a[1] + (b[1] - a[1]) * f), c: COL.rail }); }
    }
    [[-30, 18, -42, 22], [-29, 33, -42, 30]].forEach(function (q) { var cx = (q[0] + q[2]) / 2 - 2, cz = (q[1] + q[3]) / 2; p.push({ g: new T3.CylinderGeometry(5.5, 5.5, 0.5, 8, 1, false, Math.PI / 2, Math.PI), m: M4(cx + 2, 0.55, cz, 1, 1, 1, 0), c: COL.wall });
      p.push({ g: new T3.CylinderGeometry(5.6, 5.6, 0.1, 8, 1, true, Math.PI / 2, Math.PI), m: M4(cx + 2, 1.45, cz), c: COL.rail }); });
    /* the five shade sails over the playground, and their poles */
    var SAILS = [[COL.navy, [[-12, 6.5, -30], [2, 3.4, -36], [10, 6.8, -22], [-4, 3.2, -16]]], [COL.grey, [[4, 3.6, -34], [18, 7.2, -30], [20, 3.4, -14], [6, 7.0, -18]]],
      [COL.pale, [[-14, 3.4, -14], [0, 7.4, -12], [-2, 3.6, 4], [-16, 6.8, 2]]], [COL.navy, [[2, 3.4, -12], [18, 6.6, -10], [16, 3.2, 6], [0, 7.2, 4]]], [COL.grey, [[-8, 6.2, 2], [6, 3.4, 4], [8, 6.6, 16], [-6, 3.2, 14]]]];
    SAILS.forEach(function (s) { s[1] = s[1].map(function (q) { return [2 + (q[0] - 2) * 1.2, q[1] * 1.25, -12 + (q[2] + 12) * 1.2]; }); p.push(sail(s[0], s[1]));   /* 1.2 x wide, 1.25 x tall: they read from her height */ s[1].forEach(function (q) { p.push({ g: new T3.CylinderGeometry(0.16, 0.2, q[1] + 0.6, 5), m: M4(q[0] * 1.06, (q[1] + 0.6) / 2, q[2] * 1.04 - 0.6), c: COL.pole }); }); });
    /* the big leaning guitar (an amber body, a dark rim and hole, a dark neck and head), leaning back toward the street */
    var gm = new T3.Matrix4().compose(new T3.Vector3(14, 0, -26), new T3.Quaternion().setFromEuler(new T3.Euler(0.16, Math.PI / 2 - 0.35, -0.12, 'YXZ'))   /* its face to Purdy Avenue (east), where she comes in over the town */, new T3.Vector3(1.4, 1.4, 1.4)), gp = [];   // 1.4 x: read from her flying height (the real one is about 7 m)
    gp.push({ g: new T3.CylinderGeometry(1.75, 1.75, 0.8, 12), m: M4(0, 1.8, 0, 1, 1, 1, 0, Math.PI / 2), c: COL.amber }); gp.push({ g: new T3.CylinderGeometry(1.35, 1.35, 0.8, 12), m: M4(0, 4.0, 0, 1, 1, 1, 0, Math.PI / 2), c: COL.amber });
    gp.push({ g: new T3.CylinderGeometry(1.8, 1.8, 0.7, 12), m: M4(0, 1.8, -0.06, 1, 1, 1, 0, Math.PI / 2), c: COL.amberDark }); gp.push({ g: new T3.CylinderGeometry(0.62, 0.62, 0.1, 10), m: M4(0, 3.1, 0.42, 1, 1, 1, 0, Math.PI / 2), c: COL.hole });
    gp.push({ g: new T3.BoxGeometry(0.6, 4.6, 0.35), m: M4(0, 7.4, 0.15), c: COL.neck }); gp.push({ g: new T3.BoxGeometry(0.9, 1.4, 0.4), m: M4(0, 10.3, 0.1, 1, 1, 1, 0, -0.15), c: COL.neck });
    gp.push({ g: new T3.BoxGeometry(1.1, 0.25, 0.3), m: M4(0, 1.0, 0.45), c: COL.neck });
    gp.forEach(function (q) { q.m = gm.clone().multiply(q.m); p.push(q); });
    /* the piano-keys tower: a leaning grey slab, a keyboard down its bay-side face, red, yellow and orange squares and dark round holes near its top */
    var pm = new T3.Matrix4().compose(new T3.Vector3(22, 0, -18), new T3.Quaternion().setFromEuler(new T3.Euler(0.0, Math.PI / 2 + 0.3, 0.2, 'YXZ')), new T3.Vector3(1.35, 1.35, 1.35)), pp = [];
    pp.push({ g: new T3.BoxGeometry(2.6, 11, 1.6), m: M4(0, 5.5, 0), c: COL.piano }); pp.push({ g: new T3.BoxGeometry(1.4, 7.2, 0.08), m: M4(-0.35, 4.6, 0.82), c: COL.key });
    for (i = 0; i < 9; i++) pp.push({ g: new T3.BoxGeometry(0.85, 0.36, 0.1), m: M4(-0.62, 1.6 + i * 0.78, 0.86), c: COL.keyBlack });
    [[0.55, 9.6, COL.red], [0.55, 8.9, COL.yellow], [0.05, 9.6, COL.orange], [0.05, 8.9, COL.red]].forEach(function (q) { pp.push({ g: new T3.BoxGeometry(0.45, 0.6, 0.1), m: M4(q[0] - 0.3, q[1], 0.86), c: q[2] }); });
    for (i = 0; i < 3; i++) pp.push({ g: new T3.CylinderGeometry(0.22, 0.22, 0.1, 8), m: M4(0.75, 7.8 - i * 0.7, 0.85, 1, 1, 1, 0, Math.PI / 2), c: COL.keyBlack });
    pp.push({ g: new T3.BoxGeometry(4.2, 1.6, 2.2), m: M4(-3.2, 0.7, 2.6, 1, 1, 1, 0.5, 0, 0.18), c: COL.canopyN });   // the fallen piano piece beside it
    pp.forEach(function (q) { q.m = pm.clone().multiply(q.m); p.push(q); });
    /* the wave-shaped stone sign at the Purdy Avenue gate (a wave's crest, a round hole), its words' panel */
    var ws = new T3.Shape(); ws.moveTo(-3.4, 0); ws.lineTo(3.4, 0); ws.quadraticCurveTo(3.2, 1.2, 2.4, 1.5); ws.quadraticCurveTo(1.0, 1.4, 0.2, 2.2); ws.quadraticCurveTo(-0.6, 3.0, -1.6, 2.9); ws.quadraticCurveTo(-0.9, 2.2, -1.8, 1.4); ws.quadraticCurveTo(-3.0, 0.9, -3.4, 0);
    var hole = new T3.Path(); hole.absarc(-1.4, 1.35, 0.42, 0, Math.PI * 2, true); ws.holes.push(hole);
    p.push({ g: new T3.ExtrudeGeometry(ws, { depth: 0.8, bevelEnabled: false, curveSegments: 5 }), m: M4(27, 0, 64, 0.95, 0.95, 0.95, Math.PI / 2), c: COL.stone });
    p.push({ g: new T3.BoxGeometry(0.06, 0.5, 2.4), m: M4(28.2, 1.0, 63.4), c: COL.wallDark });
    /* palms along the wall and the street, shrubs in beds, two broad shade trees */
    [[-20, -100], [-21, -70], [-21, -40], [-20, 48], [-20, 78], [-19, 108], [27, -100], [27, -60], [27, 30], [27, 85], [14, 112]].forEach(function (q) { palm(p, q[0], q[1], 8 + r() * 3, r); });
    for (i = 0; i < 44; i++) { var bz = -115 + r() * 230, bx = r() < 0.5 ? -15 + r() * 6 : 18 + r() * 10; if (Math.abs(bz + 12) < 26 && bx > -12 && bx < 24) continue; blob(p, bx, 0.5, bz, 0.8 + r() * 0.9, r() < 0.5 ? COL.shrub : COL.shrub2); }
    [[-6, 52, 5.2], [16, -84, 4.6]].forEach(function (q) { p.push({ g: new T3.CylinderGeometry(0.45, 0.7, 4.4, 6), m: M4(q[0], 2.2, q[1]), c: COL.trunk }); blob(p, q[0], 6.4, q[1], q[2], COL.tree, 0.62); blob(p, q[0] + 2.4, 5.6, q[1] - 1.5, q[2] * 0.7, COL.shrub2, 0.7); });
    return merge(p);
  }
  function buildMarina() {
    var p = [], r = rng(8250), W = 0;   // y 0 is the water's face here (the mesh rides at the water's level, drape()); the piers stand 0.7 m over it
    for (var i = 0; i < SHORE.length - 1; i++) if (SHORE[i][1] > -130 && SHORE[i][1] < 130) { var a = SHORE[i], b = SHORE[i + 1], L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);   // the rip-rap at the wall's foot
      for (var t = 0; t < L2; t += 2.2) { var f = t / L2; blob(p, a[0] - 1.6 - r() * 1.6 + (b[0] - a[0]) * f, 0.1, a[1] + (b[1] - a[1]) * f, 0.7 + r() * 0.6, r() < 0.5 ? COL.rock : COL.wallDark, 0.8); } }
    PIERS.forEach(function (q) { var a = q[0], b = q[1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); p.push({ g: new T3.BoxGeometry(L + 2.5, 0.35, 2.6), m: M4((a[0] + b[0]) / 2, W + 0.7, (a[1] + b[1]) / 2, 1, 1, 1, -Math.atan2(dz, dx)), c: COL.wood }); });
    /* boats: at the yacht club's two long piers (both sides), a few at the outer pier, and a few moored out in the bay */
    var B2 = []; [[-307, -125, -45], [-214, -122, -42]].forEach(function (q) { for (var x = q[1]; x < q[2]; x += 7 + r() * 3) { B2.push([x, q[0] - 6.5 - r(), 10 + r() * 8, Math.PI / 2]); if (r() < 0.8) B2.push([x + 2, q[0] + 6.5 + r(), 10 + r() * 7, -Math.PI / 2]); } });
    for (var x = -150; x < -50; x += 14 + r() * 6) B2.push([x, -355, 12 + r() * 6, -Math.PI / 2]);
    [[-150, -60], [-200, -110], [-260, -40], [-180, 20], [-120, -10], [-320, -160], [-90, -60], [-230, -260]].forEach(function (q) { B2.push([q[0], q[1], 9 + r() * 7, r() * 6.28]); });
    B2.forEach(function (b) { var L = b[2], w = L * 0.32, yaw = b[3] + (r() - 0.5) * 0.1, m = M4(b[0], W, b[1], 1, 1, 1, yaw), hull = new T3.Shape();
      hull.moveTo(-L / 2, -w / 2); hull.lineTo(L * 0.22, -w / 2); hull.quadraticCurveTo(L * 0.45, -w * 0.3, L / 2, 0); hull.quadraticCurveTo(L * 0.45, w * 0.3, L * 0.22, w / 2); hull.lineTo(-L / 2, w / 2); hull.lineTo(-L / 2, -w / 2);
      var hg = new T3.ExtrudeGeometry(hull, { depth: 1.3, bevelEnabled: false, curveSegments: 3 }); hg.rotateX(-Math.PI / 2); hg.translate(0, -0.2, 0);
      [{ g: hg, m: new T3.Matrix4(), c: COL.hull }, { g: new T3.BoxGeometry(L * 0.38, 1.1, w * 0.66), m: M4(-L * 0.08, 1.6, 0), c: r() < 0.4 ? COL.canopyN : COL.hull }, { g: new T3.BoxGeometry(L * 0.5, 0.06, w * 0.8), m: M4(-L * 0.12, 1.12, 0), c: COL.deck }]
        .forEach(function (q) { q.m = m.clone().multiply(q.m); p.push(q); });
      if (L > 13 && r() < 0.45) p.push({ g: new T3.CylinderGeometry(0.08, 0.12, L * 1.1, 4), m: m.clone().multiply(M4(L * 0.05, 1.1 + L * 0.55, 0)), c: COL.mast }); });
    st.boats = B2.length; return merge(p);
  }
  function inPoly(x, z, P) { var c = false; for (var i = 0, j = P.length - 1; i < P.length; j = i++) { var a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function buildWater() {   // a grid over the apron (cells whose middle is in it), draped on the drawn ground; it wears the ground's sea (aW825 1: world-look755b.js)
    var x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; APRON.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); });
    var S = C.CELL, nx = Math.ceil((x1 - x0) / S), nz = Math.ceil((z1 - z0) / S), pos = [], idx = [], col = [], w = [], vid = {}, n = 0;
    function snap(x, z) {   // a corner outside the apron goes to the nearest point of its edge (the grid's stair-steps become the shore's line)
      if (inPoly(x, z, APRON)) return [x, z]; var best = null, bd = 1e18; for (var k = 0, m = APRON.length - 1; k < APRON.length; m = k++) { var a = APRON[m], b = APRON[k], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz,
        t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)) : 0, px = a[0] + t * dx, pz = a[1] + t * dz, d = (px - x) * (px - x) + (pz - z) * (pz - z); if (d < bd) { bd = d; best = [px, pz]; } } return best; }
    function v(i, j) { var k = i + ',' + j; if (vid[k] != null) return vid[k]; var q = snap(x0 + i * S, z0 + j * S); pos.push(q[0], 0, q[1]); col.push(C.BAY[0], C.BAY[1], C.BAY[2]); w.push(1); return (vid[k] = n++); }
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) { var cx = x0 + i * S, cz = z0 + j * S; if (!inPoly(cx + S / 2, cz + S / 2, APRON) && !inPoly(cx, cz, APRON) && !inPoly(cx + S, cz, APRON) && !inPoly(cx, cz + S, APRON) && !inPoly(cx + S, cz + S, APRON)) continue;
      var a = v(i, j), b = v(i + 1, j), c = v(i, j + 1), d = v(i + 1, j + 1); idx.push(a, c, b, b, c, d); }
    var g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T3.Float32BufferAttribute(pos.map(function (_, k) { return k % 3 === 1 ? 1 : 0; }), 3));
    g.setAttribute('color', new T3.Float32BufferAttribute(col, 3)); g.setAttribute('aW825', new T3.Float32BufferAttribute(w, 1)); g.setIndex(idx); return g;
  }

  function init(ctx) {
    if (st.inited) return api; st.inited = true; X = ctx; T3 = ctx.THREE;
    if (window.WFR_DOOR && window.WFR_DOOR.classic) { st.why = 'classic'; return api; }
    var T = ctx.T, TR = window.WFR_TRAVEL712; if (!T || !T.hold || !T.u || !TR || !TR.makeMaterial || !window.WFR_WORLD) { st.why = 'no travel holder'; return api; }
    try {
      var t0 = performance.now(), L = TR.C.LAYER;
      /* the ground's own program, untagged: polygonOffset turns the ground's look off for the park and the boats (their own colours), on for the water */
      var mObj = TR.makeMaterial(T3, T.u); mObj.polygonOffset = true; mObj.polygonOffsetFactor = 0; mObj.polygonOffsetUnits = 0; mObj.name = 'gibb825:park';
      var mWater = TR.makeMaterial(T3, T.u); mWater.name = 'gibb825:water';
      st.group = new T3.Group(); st.group.name = 'gibb825'; st.group.matrixAutoUpdate = false; st.group.visible = false;
      [[buildPark(), mObj, 'park'], [buildMarina(), mObj, 'marina'], [buildWater(), mWater, 'water']].forEach(function (q, i) { var m = new T3.Mesh(q[0], q[1]); m.name = 'gibb825:' + q[2]; m.frustumCulled = false; m.matrixAutoUpdate = false;
        m.renderOrder = C.ORDER[i]; m.layers.set(L); m.castShadow = false; m.receiveShadow = false; st.group.add(m); st.meshes.push(m); st.tris += (q[0].index ? q[0].index.count : q[0].attributes.position.count) / 3; });
      T.hold.add(st.group); st.built = true; st.ms = +(performance.now() - t0).toFixed(1);
    } catch (e) { st.fault = String(e && e.message || e); }
    return api;
  }
  function basis(f) {   // the true metre's east and south in the travel frame (its scale and, on his disc, its turn) at the park
    var W = window.WFR_WORLD, o = W.toLocal(f, C.LAT, C.LON), d = 0.002, e = W.toLocal(f, C.LAT, C.LON + d), n = W.toLocal(f, C.LAT + d, C.LON), me = d * 111320 * Math.cos(C.LAT * Math.PI / 180), mn = d * 110574;
    B.e = [(e.x - o.x) / me, (e.z - o.z) / me]; B.s = [-(n.x - o.x) / mn, -(n.z - o.z) / mn]; B.cx = o.x; B.cz = o.z; st.f = f;
  }
  function at(x, z) { return [B.cx + B.e[0] * x + B.s[0] * z, B.cz + B.e[1] * x + B.s[1] * z]; }   // park metres to the travel frame
  function drape(T) {
    var H = T.st.H, base = -1e9; [[0, 0], [-25, -110], [25, -110], [-25, 110], [25, 110], [0, -60], [0, 60]].forEach(function (q) { var w = at(q[0], q[1]); base = Math.max(base, H(w[0], w[1])); });
    st.base = base + C.BASE; var g = st.group, m = g.matrix; m.set(B.e[0], 0, B.s[0], B.cx, 0, 1, 0, st.base, B.e[1], 0, B.s[1], B.cz, 0, 0, 0, 1); g.matrixWorldNeedsUpdate = true;
    /* the water: each corner over the highest of the drawn ground at it and 13 m round it (the fine survey has the bay's face at 0-3 m and a few 8 m
       ridges in it: a ridge between two corners poked through as green bands) */
    var wg = st.meshes[2].geometry, p = wg.attributes.position, a = p.array, R = 13; for (var i = 0; i < p.count; i++) { var x = a[i * 3], z = a[i * 3 + 2], hm = 0;
      for (var k = 0; k < 5; k++) { var w2 = at(x + (k === 1 ? R : k === 2 ? -R : 0), z + (k === 3 ? R : k === 4 ? -R : 0)); hm = Math.max(hm, H(w2[0], w2[1])); } a[i * 3 + 1] = hm + C.WATER - st.base; }
    p.needsUpdate = true; st.drapes++;
    var hw = 0; [[-60, -100], [-60, 0], [-120, -250], [-200, -60]].forEach(function (q) { var w3 = at(q[0], q[1]); hw += Math.max(0, H(w3[0], w3[1])) / 4; });   // the boats, the piers and the rocks ride at the water's level
    st.water = hw + C.WATER; var mm = st.meshes[1]; mm.matrix.makeTranslation(0, st.water - st.base, 0); mm.matrixWorldNeedsUpdate = true;
  }
  function tick(her) {
    if (!st.built) return; var T = X.T, g = st.group; st.ticks++;
    try {
      var on = !!(T.on && T.f && T.st && her); if (on) { if (st.f !== T.f) { basis(T.f); st.sig = ''; } var dx = her.x - B.cx, dz = her.z - B.cz; on = dx * dx + dz * dz < C.SHOW * C.SHOW; }
      if (on) { var q = [at(-650, -620), at(40, -620), at(-650, 160), at(40, 160)], bx = [1e9, 1e9, -1e9, -1e9]; q.forEach(function (w) { bx[0] = Math.min(bx[0], w[0]); bx[1] = Math.min(bx[1], w[1]); bx[2] = Math.max(bx[2], w[0]); bx[3] = Math.max(bx[3], w[1]); });
        var sig = T.st.drawnSig(bx[0], bx[1], bx[2], bx[3]); if (sig !== st.sig) { st.sig = sig; drape(T); } }
      if (g.visible !== on) g.visible = on; st.shown = on;
    } catch (e) { st.fault = String(e && e.message || e); g.visible = false; st.built = false; }
  }
  function peek() { return { inited: st.inited, why: st.why, fault: st.fault, built: st.built, shown: st.shown, ticks: st.ticks, drapes: st.drapes, base: +st.base.toFixed(2), water: +(st.water || 0).toFixed(2), det: B.e ? +(B.e[0] * B.s[1] - B.e[1] * B.s[0]).toFixed(4) : null, tris: Math.round(st.tris), boats: st.boats || 0, ms: st.ms,
    meshes: st.meshes.map(function (m) { return m.name; }), parent: st.group && st.group.parent ? st.group.parent.name : null, at: B.e ? { x: +B.cx.toFixed(1), z: +B.cz.toFixed(1), e: B.e.map(function (v) { return +v.toFixed(4); }), s: B.s.map(function (v) { return +v.toFixed(4); }) } : null }; }
  var api = { C: C, PARK: PARK, init: init, tick: tick, peek: peek, toFrame: function (x, z) { return B.e ? at(x, z) : null; }, group: function () { return st.group; } };
  return api;
})();
