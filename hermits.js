/* hermits.js - BOARD 632 U5, THE HERMITS' CABIN (Wings for Rouge). Marth, Oct 12 ~00:20 (verbatim): "the cabin on the far side of the
   map who has an old hermit man and woman (who helped raise the eagle secret lore haha) who can help nurse your chic to health. this
   is also where u go when u get injured when we introduce predators and the hawk"; Oct 15 ~04:40: "they only take sky island runes"
   / "We should make the cabin small on the outside but a whole The hobbit themed castle that is quite deceivingly spacious inside.
   Make the woman hermit the healer and the man the merchant - for da weapons later on." / "2. Beandie and Beanda (man and woman)";
   ~04:55: "The runes will also be able to use at the hermits ‘cabin’"; ~15:10: "the hermits right after the 11 are done or fit em
   somewhere in between". Itachi's brief: BRIEF_632_WEATHER_2026-10-15.md §4 U5.

   WHAT IT IS. A small log cabin (cabins.js's own build, unchanged: same textures, same materials, same programs) on the far side of
   the island from the village, on a low hill near the north-east shore. Its door leads DOWN into a hall dug into the hill under it:
   a hobbit hall, about four times the cabin's floor, with a round door, low beams, a stone hearth, Beanda's healing corner and
   Beandie's stall. The hall is one houses[] record (the game's own indoor walk, door, camera and HUD); its front wall lies under the
   cabin's front wall, so the game's own door rules (in at the front, out at the front, doorFront) take her in and out of the cabin.
   The hall's floor sits 1.5 m+ under the lowest ground above it (the island's mesh vertices included), and above the sea.
   No H() change, no Math.random, never the game's rnd(); every place is a constant or measured from H() at load.

   PHONE COST. The hall's walls, floor, beams, hearth and furniture are four merged meshes on the cabin's OWN four materials (bark,
   planks, stone, cloth: shared with the four cabins, so no new shader program), the round door one more, the ceiling one more (it
   throws the hall's shadow only while she is inside, so the cabin above never casts a stray shadow into it), five emoji sprites
   (the game's emojiSprite: one shared texture per emoji). The hall and the two hermits are drawn only when she is inside or at the
   door. Built ONCE at load; nothing is made or freed per visit.

   THE TWO HERMITS. Beanda (the healer) and Beandie (the merchant), made by humans.js like the villagers (grey hair), and in Standard
   swapped into the model people by villagers.js exactly as the newcomer is (woman1 / man2). The Talk button ($('read'), the game's
   own) says what a press does: "💬 Talk", "✦ 150 · Mend" or "✦ 40 · Buy 🍎". Prices and every line are DRAFT for Marth.
     Beanda mends the chick's cold (632 U3's S.chick.cold) for runes: the alternative to 5 apples + 2 blueberries.
     Beandie sells an apple and blueberries (into her beak, for the chick) and five nails (into the pouch; Strength 2 and the Crow's
     lesson first, as the island's own nails ask). Weapons later (his words).
     "and later she": HER own healing (545 predators, the Hawk) is NOT in the game yet. The hook: a future unit sets
     WFR_HERMITS.healHer = { price: () => n, need: () => bool, heal: () => void, line: string }; Beanda offers it when need() is true.
   Saved keys: none new at the top level. S.seen.hermits632 (the greeting, once), S.seen.beandie632 (his first word). A purchase
   lands in keys that already save: S.runes (632 U4), S.chick.cold (632 U3), S.inv (644), the beak (S.fruit -> save's beak).

   ── THE API ───────────────────────────────────────────────────────────────────────────────────────
   WFR_HERMITS.create(THREE, scene, o) -> inst | throws (the wiring catches: no cabin, no game harm)
     o = { H, HS, WATER, houses, trees, CAVE, VILLAGE, renderer, windows (WINDOW_MATS), toLocal, toWorld, groundAt(x, z),
           emoji(ch, size), humans, cabins, late: () => ({ S, floorOf, standOf, pose, turnTo, say, hud, save, chirp, ding,
           careStats, strength, fruit(id), giveBeak(type), chick(), classic(), $, villagers, people, models }) }
     late() is read only from the frame on (every name in it is declared after this module is created).
   inst = { hall, cabin, site, tick(dt, real), button(el) -> bool, press() -> bool, peek(), set(o), log, error }
   WFR_HERMITS.SITES, .HALL, .PRICES, .ITEMS, .LINES, .check(o, site) (pure: the site's tests, also run in node), .healHer
   ═════════════════════════════════════════════════════════════════════════════════════════════════ */
window.WFR_HERMITS = (function () {
  'use strict';
  var API = { error: '', last: null, healHer: null };
  /* the hall, in the game's local house units (x HS = metres); its door (+z) under the cabin's door */
  var HALL = { W: 10, D: 11, HT: 3.4, SLAB: 0.35, FT: 0.1 };
  var CZ = HALL.D / 2 - 2.6;   /* the cabin's middle on the hall's local z: its front wall (cabins.js d 5.2) on the hall's */
  /* the door's point (x, z) and the house rotation (the door faces world (sin rot, cos rot)). Measured with the game's H() and its
     forest (rnd 1010, 45000 skipped: tree #14 sits 4.74 m off 552's foothill site, as cabins.js records) by a scan of the far side:
     the cabin's ground within 1.4 m, the hall's cover >= 9.9 m, 10 m of dry clear ground before the door. First that passes wins. */
  var SITES = [
    { x: 180, z: 129, rot: Math.PI / 4 },
    { x: 183, z: 129, rot: 3 * Math.PI / 8 },
    { x: 186, z: 123, rot: Math.PI / 2 },
    { x: 183, z: 126, rot: Math.PI / 2 },
  ];
  var GRID = { size: 720, seg: 150 };   /* the island's mesh (its triangles are straight between these vertices) */
  /* DRAFT prices (a run on the cloud course pays about 100-200 runes): a mend is about one good run; the nails two to three runs;
     a fruit is a small convenience (the trees give fruit free; a fruit at two runs would be a trap, not a shop) */
  var PRICES = { mend1: 150, mend2: 200 };
  var ITEMS = [
    { id: 'apple', emoji: '🍎', price: 40, fruit: 'apple', z: -2.6 },
    { id: 'blueberry', emoji: '🫐', price: 60, fruit: 'blueberry', z: -1.2 },
    { id: 'nails', emoji: '🔩', price: 400, inv: 'nail', n: 5, z: 0.2 },
  ];
  var ITEM_X = 3.2, REACH_X = 2.3, REACH_R = 0.5;
  var BEANDA = { x: -3.3, z: -1.0, face: 1.5708, near: 1.6 }, BEANDIE = { x: 4.25, z: -1.2, face: -1.5708 };
  var FIRE = { x: -HALL.W / 2 + 0.5, y: 0.55, z: -1.0 };
  /* DRAFT lines, every one (Marth rules) */
  var LINES = {
    hello: [['Beanda', 'Oh! A visitor. Come in out of the weather, little one.'],
      ['Beanda', 'I am Beanda. I mend what the rain breaks: colds, sniffles, the odd bent feather.'],
      ['Beandie', 'And I am Beandie. I keep the shop.'],
      ['Beandie', 'We trade in runes, the kind that float about up by the sky island. Stand at my counter to see a price.'],
      ['Beanda', 'Bigger in here than it looks, isn\'t it? Mind the beams.']],
    beandaWell: [['Beanda', 'Your chick is well. Keep it warm when the rain comes, and you will not need me.']],
    beandaNoChick: [['Beanda', 'No chick yet? When it hatches, bring its sniffles to me.']],
    mendPoor: function (p, n) { return [['Beanda', 'A cold like that takes ' + p + ' runes of herbs, dear, and you have ' + n + '.'], ['Beanda', 'The rune course up by the sky island pays well. I will be here.']]; },
    mended: [['Beanda', 'Willow bark, warm honey, and a little song. Hold still...'], ['Beanda', 'There. Your chick\'s cold is mended. Keep it out of the rain.']],
    beandie: function (n) { return [['Beandie', 'Fruit for your chick, nails for the village. Blades and such come later, if that hawk gets bold.'], ['Beandie', 'You have ' + n + ' runes. Stand at a thing on my counter to see its price.']]; },
    poor: function (p, n) { return [['Beandie', 'That is ' + p + ' runes. You have ' + n + '. Come back richer.']]; },
    beakFull: [['Beandie', 'Your beak is full. Come back with it empty.']],
    noChick: [['Beandie', 'Fruit is for a chick, and you have none yet.']],
    heavy: [['Beandie', 'Nails are heavy. Come back at level 3, when you are stronger.']],
    noCrow: [['Beandie', 'Metal? Learn to see it first. The Crow can teach you.']],
    sold: { apple: [['Beandie', 'One apple. Take it to your chick.']], blueberry: [['Beandie', 'A handful of blueberries. Take them to your chick.']],
      nails: [['Beandie', 'Five nails, in your pouch. Mind your beak, they are heavy.']] },
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ── the site: pure, the game's H() and trees and houses only (node runs it too) ── */
  function check(o, s) {
    var HS = o.HS, c = Math.cos(s.rot), sn = Math.sin(s.rot), D2 = HALL.D / 2, W2 = HALL.W / 2;
    var ox = s.x - sn * D2 * HS, oz = s.z - c * D2 * HS;   /* the hall's middle, behind the door */
    var W = function (lx, lz) { return { x: ox + (lx * c + lz * sn) * HS, z: oz + (-lx * sn + lz * c) * HS }; };
    var L = function (x, z) { var dx = x - ox, dz = z - oz; return { x: (dx * c - dz * sn) / HS, z: (dx * sn + dz * c) / HS }; };
    var CD = o.cabinDims || { w: 5.6, d: 5.2, r: 0.2 }, rx = CD.w / 2 + CD.r;
    var hi = -1e9, lo = 1e9, i, j, p, h;
    for (i = 0; i <= 6; i++) for (j = 0; j <= 6; j++) { p = W(-rx + 2 * rx * i / 6, CZ - CD.d / 2 - CD.r + (CD.d + 2 * CD.r) * j / 6); h = o.H(p.x, p.z); hi = Math.max(hi, h); lo = Math.min(lo, h); }
    var out = { ok: false, s: s, ox: ox, oz: oz, hi: hi, lo: lo };
    if (hi - lo > 1.4) { out.why = 'the cabin\'s ground varies ' + (hi - lo).toFixed(2) + ' m'; return out; }
    /* the hall's cover: dense samples of H over its footprint + 1 unit, and the mesh vertices of every cell it touches */
    var hmin = 1e9, lx, lz;
    for (lx = -W2 - 1; lx <= W2 + 1.001; lx += 0.5) for (lz = -D2 - 1; lz <= D2 + 0.001; lz += 0.5) { p = W(lx, lz); hmin = Math.min(hmin, o.H(p.x, p.z)); }
    var cell = GRID.size / GRID.seg, R = (Math.hypot(W2 + 1, D2 + 1)) * HS + cell;
    for (var gx = Math.floor((ox - R + GRID.size / 2) / cell); gx <= Math.ceil((ox + R + GRID.size / 2) / cell); gx++)
      for (var gz = Math.floor((oz - R + GRID.size / 2) / cell); gz <= Math.ceil((oz + R + GRID.size / 2) / cell); gz++) {
        var vx = -GRID.size / 2 + gx * cell, vz = -GRID.size / 2 + gz * cell, q = L(vx, vz);
        if (Math.abs(q.x) <= W2 + 1 + cell / HS && q.z >= -D2 - 1 - cell / HS && q.z <= D2 + cell / HS) hmin = Math.min(hmin, o.H(vx, vz));
      }
    out.hmin = hmin;
    var y0 = Math.min(hmin, lo) - 1.5 - (HALL.HT + HALL.SLAB) * HS;
    out.y0 = y0;
    if (y0 < o.WATER + 0.8) { out.why = 'too little hill over the hall (floor ' + y0.toFixed(2) + ')'; return out; }
    /* before the door: 10 m of dry ground, nothing built or grown there */
    var gAt = o.groundAt || o.H;
    for (var m = 1; m <= 10; m++) for (var lat = -1.5; lat <= 1.5; lat += 1.5) {
      var x = s.x + sn * m + c * lat, z = s.z + c * m - sn * lat;
      if (o.H(x, z) < o.WATER + 0.6) { out.why = 'water before the door'; return out; }
      if (gAt(x, z) - o.H(x, z) > 0.05) { out.why = 'something stands before the door'; return out; }
    }
    /* the cabin's footprint (+1 m): nothing built or grown */
    for (lx = -rx - 0.7; lx <= rx + 0.7; lx += 0.5) for (lz = CZ - CD.d / 2 - 0.7; lz <= CZ + CD.d / 2 + 0.7; lz += 0.5) { p = W(lx, lz); if (gAt(p.x, p.z) - o.H(p.x, p.z) > 0.05) { out.why = 'something stands on the cabin\'s ground'; return out; } }
    /* trees: no trunk inside the hall's footprint (+1 unit) (the walk would answer it as the hall's wall); crowns clear of the cabin */
    var cab = W(0, CZ);
    for (var t = 0; t < (o.trees || []).length; t++) { var tr = o.trees[t]; if (tr.hidden) continue; var tl = L(tr.x, tr.z), r = (tr.r || 1) / HS;
      if (Math.abs(tl.x) < W2 + 1 + r && tl.z > -D2 - 1 - r && tl.z < D2 + 1 + r) { out.why = 'a tree on the hall\'s ground'; return out; }
      if (Math.hypot(tr.x - cab.x, tr.z - cab.z) < 8.5 + 2 * (tr.r || 1)) { out.why = 'a tree crown over the cabin'; return out; } }
    /* other houses (the village, the four cabins, the cave): 25 m clear of the hall's middle */
    for (var k = 0; k < (o.houses || []).length; k++) { var hh = o.houses[k]; if (Math.hypot(hh.x - ox, hh.z - oz) < 25 + Math.max(hh.w || 0, hh.d || 0) * HS / 2) { out.why = 'too near ' + (hh.name || 'a house'); return out; } }
    if (o.VILLAGE && Math.hypot(s.x - o.VILLAGE.x, s.z - o.VILLAGE.z) < 250) { out.why = 'not the far side'; return out; }
    out.ok = true; out.cab = cab; out.W = W; out.L = L;
    return out;
  }

  /* ── geometry: merged, vertex-coloured, box-mapped uv (the cabin's textured materials read uv and color) ── */
  function builder(T, lin) {
    var UVK = 1.4;
    var rgb = function (hex, k) { var c = new T.Color(hex); if (lin && c.convertSRGBToLinear) c.convertSRGBToLinear(); var s = k == null ? 1 : k; return [c.r * s, c.g * s, c.b * s]; };
    var M = function (px, py, pz, rx, ry, rz, sx, sy, sz) { var ob = new T.Object3D(); ob.position.set(px || 0, py || 0, pz || 0); ob.rotation.set(rx || 0, ry || 0, rz || 0); ob.scale.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz); ob.updateMatrix(); return ob.matrix.clone(); };
    var box = function (x0, y0, z0, x1, y1, z1, col) { return { g: new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m: M((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), col: col }; };
    var cyl = function (x, y, z, r0, r1, h, seg, col, rx, rz) { return { g: new T.CylinderGeometry(r1, r0, h, seg || 10), m: M(x, y + h / 2, z, rx, 0, rz), col: col }; };
    var rod = function (A, B, r, col) {
      var a = new T.Vector3(A[0], A[1], A[2]), b = new T.Vector3(B[0], B[1], B[2]), dir = b.clone().sub(a), len = dir.length();
      var g = new T.CylinderGeometry(r, r, len, 8); g.translate(0, len / 2, 0);
      var q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
      return { g: g, m: new T.Matrix4().compose(a, q, new T.Vector3(1, 1, 1)), col: col };
    };
    function merge(parts, glow) {
      var P = [], N = [], U = [], C = [];
      parts.forEach(function (p) {
        var g = p.g.index ? p.g.toNonIndexed() : p.g.clone(); if (p.m) g.applyMatrix4(p.m);
        var pa = g.attributes.position.array, na = g.attributes.normal.array;
        for (var i = 0; i < pa.length; i += 3) {
          var x = pa[i], y = pa[i + 1], z = pa[i + 2], nx = na[i], ny = na[i + 1], nz = na[i + 2], ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz), u, v;
          if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
          P.push(x, y, z); N.push(nx, ny, nz); U.push(u / UVK, v / UVK);
          var k = glow ? glow(x, y, z) : 1, cc = p.col; C.push(cc[0] * k, cc[1] * k, cc[2] * k);
        }
        g.dispose(); p.g.dispose();
      });
      var out = new T.BufferGeometry();
      out.setAttribute('position', new T.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
      out.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); out.setAttribute('color', new T.Float32BufferAttribute(C, 3));
      out.computeBoundingSphere(); return out;
    }
    return { rgb: rgb, M: M, box: box, cyl: cyl, rod: rod, merge: merge };
  }

  function create(T, scene, o) {
    try { var inst = build(T, scene, o); API.last = inst; API.error = ''; return inst; } catch (err) { API.error = String(err && err.message || err); throw err; }
  }

  function build(T, scene, o) {
    if (!window.WFR_CABINS || !WFR_CABINS.build) throw new Error('hermits: cabins.js is not loaded');
    var HS = o.HS, CD = WFR_CABINS.dims;
    var site = null, whys = [], si;
    for (si = 0; si < SITES.length; si++) { var r0 = check({ H: o.H, HS: HS, WATER: o.WATER, groundAt: o.groundAt, trees: o.trees, houses: o.houses, VILLAGE: o.VILLAGE, cabinDims: CD }, SITES[si]); if (r0.ok) { site = r0; site.k = si; break; } whys.push(r0.why); }
    if (!site) throw new Error('hermits: no site passed (' + whys.join(' | ') + ')');
    var s = site.s, rot = s.rot, c = Math.cos(rot), sn = Math.sin(rot), W = site.W, L = site.L, Y0 = site.y0, W2 = HALL.W / 2, D2 = HALL.D / 2;
    var lin = !!(o.renderer && T.sRGBEncoding !== undefined && o.renderer.outputEncoding === T.sRGBEncoding);
    var B = builder(T, lin);

    /* ── THE CABIN, outside: cabins.js's own build, placed exactly as WFR_CABINS.place places the four ── */
    var cabY = site.hi + 0.02, found = (cabY - site.lo) / HS + 0.35;
    var cab = WFR_CABINS.build(T, 2, { renderer: o.renderer, foundation: found, keepsake: 'riverstone', furniture: 'cupboard',
      variant: { door: 0x3f6b3a, extras: ['bench', 'flowers'] }, ground: function (lx, lz) { var p = W(lx, lz + CZ); return (o.H(p.x, p.z) - cabY) / HS; } });
    cab.g.scale.setScalar(HS); cab.g.position.set(site.cab.x, cabY, site.cab.z); cab.g.rotation.y = rot;
    cab.door.rotation.y = 0;   /* shut; it opens as she comes up to it (tick) */
    if (cab.keepsake && cab.keepsake.g) cab.keepsake.g.visible = false;   /* the hermits keep no keepsake out: nothing to take here */
    scene.add(cab.g);
    if (o.windows && cab.windowMat) o.windows.push(cab.windowMat);   /* someone lives here: its windows glow at night */
    /* the cabin's four shared materials, read off its own meshes (the hall wears exactly these: no new program) */
    var MAT = {};
    cab.g.traverse(function (ob) { if (!ob.isMesh) return; var n = ob.name.replace('cabin:', ''); if (/^(logs|wood|stone|cloth)$/.test(n) && !MAT[n]) MAT[n] = ob.material; });
    ['logs', 'wood', 'stone', 'cloth'].forEach(function (n) { if (!MAT[n]) MAT[n] = new T.MeshLambertMaterial({ vertexColors: true }); });

    /* ── THE HALL, inside the hill: local house units, the door at +z ── */
    var hg = new T.Group(); hg.name = 'hermits632:hall'; hg.position.set(site.ox, Y0, site.oz); hg.rotation.y = rot; hg.scale.setScalar(HS);
    var WD = [], BK = [], ST = [], CL = [], HT = HALL.HT, FT = HALL.FT;
    var cWall = B.rgb(0xc59a62), cPanel = B.rgb(0x8a5f38), cFloor = B.rgb(0xa77a50), cDark = B.rgb(0x5a3a24), cBeam = B.rgb(0x8a6440), cStone = B.rgb(0xb3a896), cSoot = B.rgb(0x241a14);
    /* floor, walls (outside the room line: roomOf measures to it), a darker wainscot band */
    WD.push(B.box(-W2 - 0.2, 0, -D2 - 0.2, W2 + 0.2, FT, D2 + 0.2, cFloor));
    WD.push(B.box(-W2 - 0.2, 0, -D2 - 0.2, -W2, HT, D2 + 0.2, cWall), B.box(W2, 0, -D2 - 0.2, W2 + 0.2, HT, D2 + 0.2, cWall));
    WD.push(B.box(-W2, 0, -D2 - 0.2, W2, HT, -D2, cWall), B.box(-W2, 0, D2, W2, HT, D2 + 0.2, cWall));
    WD.push(B.box(-W2, FT, -D2, -W2 + 0.04, 1.0, D2, cPanel), B.box(W2 - 0.04, FT, -D2, W2, 1.0, D2, cPanel), B.box(-W2, FT, -D2, W2, 1.0, -D2 + 0.04, cPanel), B.box(-W2, FT, D2 - 0.04, W2, 1.0, D2, cPanel));
    /* low beams across the hall, with knee braces down to posts at the walls */
    [-4.0, -1.5, 1.0, 3.5].forEach(function (z) {
      BK.push(B.rod([-W2, 2.8, z], [W2, 2.8, z], 0.16, cBeam));
      [-1, 1].forEach(function (sx) { BK.push(B.rod([sx * (W2 - 0.18), FT, z], [sx * (W2 - 0.18), 2.8, z], 0.15, cBeam)); BK.push(B.rod([sx * (W2 - 0.18), 2.15, z], [sx * (W2 - 0.85), 2.8, z], 0.08, cBeam)); });
    });
    BK.push(B.rod([0, 3.1, -D2], [0, 3.1, D2], 0.14, cBeam));   /* the ridge beam, front to back */
    /* the round door's frame and its dark way out (the leaf is its own mesh: the game's doors() swings its pivot) */
    ST.push({ g: new T.TorusGeometry(0.7, 0.08, 6, 24), m: B.M(0, FT + 0.8, D2 - 0.03), col: cStone });
    CL.push({ g: new T.CircleGeometry(0.64, 24), m: B.M(0, FT + 0.8, D2 - 0.02, 0, Math.PI, 0), col: B.rgb(0x1a120c) });
    /* the hearth on the left wall: chimney breast, firebox, hearthstone, mantel */
    var HX = -W2;
    ST.push(B.box(HX, 0, -2.2, HX + 0.8, HT, -1.6, cStone), B.box(HX, 0, -0.4, HX + 0.8, HT, 0.2, cStone), B.box(HX, 1.2, -1.6, HX + 0.8, HT, -0.4, cStone));
    ST.push(B.box(HX, 0, -1.6, HX + 0.3, 1.2, -0.4, cSoot), B.box(HX + 0.8, 0, -2.3, HX + 1.4, 0.16, 0.3, B.rgb(0x9b9184)));
    WD.push(B.box(HX + 0.7, 1.2, -2.35, HX + 1.0, 1.32, 0.35, cDark));
    BK.push(B.rod([HX + 0.35, 0.12, -1.35], [HX + 0.45, 0.2, -0.65], 0.07, B.rgb(0x5a3a22)), B.rod([HX + 0.5, 0.12, -1.3], [HX + 0.3, 0.22, -0.7], 0.06, B.rgb(0x4a3020)));   /* logs in the fire */
    /* Beanda's corner: the herb table, jars, a straw basket by the fire for a sick chick, herbs hung from the beam */
    WD.push(B.box(-3.9, 0.85, -4.9, -2.3, 0.95, -4.0, cDark));
    [[-3.75, -4.75], [-2.45, -4.75], [-3.75, -4.15], [-2.45, -4.15]].forEach(function (q) { WD.push(B.box(q[0] - 0.05, FT, q[1] - 0.05, q[0] + 0.05, 0.85, q[1] + 0.05, cDark)); });
    [[-3.6, -4.5, 0x6f8f5a], [-3.2, -4.3, 0xb8643a], [-2.9, -4.6, 0x7a6fa0], [-2.6, -4.3, 0xd8c27a]].forEach(function (q) { CL.push(B.cyl(q[0], 0.95, q[1], 0.11, 0.09, 0.28, 8, B.rgb(q[2]))); });
    WD.push(B.box(-4.95, 1.4, -5.45, -2.3, 1.48, -5.05, cDark), B.box(-4.95, 2.0, -5.45, -2.3, 2.08, -5.05, cDark));
    [[-4.6, 1.48, 0x6f8f5a], [-4.1, 1.48, 0xc9b27a], [-3.5, 1.48, 0x9a5a3a], [-2.8, 1.48, 0x7a8faa], [-4.4, 2.08, 0xb8643a], [-3.7, 2.08, 0x6f8f5a], [-3.0, 2.08, 0xd8c27a]].forEach(function (q) { CL.push(B.cyl(q[0], q[1], -5.25, 0.12, 0.1, 0.3, 8, B.rgb(q[2]))); });
    BK.push(B.cyl(-3.6, FT, 1.4, 0.45, 0.6, 0.35, 12, B.rgb(0xcdb57a)));   /* the basket */
    CL.push(B.cyl(-3.6, 0.3, 1.4, 0.4, 0.4, 0.08, 12, B.rgb(0xe9dfca)));
    [-4.6, -4.35].forEach(function (x, i) { [-2.6, -1.2, 0.2].forEach(function (z, j) { CL.push({ g: new T.ConeGeometry(0.1, 0.4, 6), m: B.M(x, 2.42 - ((i + j) % 2) * 0.08, z + (i ? 0.3 : 0), Math.PI, 0, 0), col: B.rgb([0x6f8f5a, 0x8aa060, 0x9a8a50][(i + j) % 3]) }); }); });
    /* the middle: a long table and two benches, a round rug */
    WD.push(B.box(-0.4, 0.78, -4.3, 1.6, 0.88, -3.3, cDark));
    [[-0.3, -4.2], [1.5, -4.2], [-0.3, -3.4], [1.5, -3.4]].forEach(function (q) { WD.push(B.box(q[0] - 0.05, FT, q[1] - 0.05, q[0] + 0.05, 0.78, q[1] + 0.05, cDark)); });
    WD.push(B.box(-0.3, 0.45, -4.85, 1.5, 0.53, -4.55, cDark), B.box(-0.3, 0.45, -3.05, 1.5, 0.53, -2.75, cDark));
    CL.push(B.cyl(0, FT, 0.8, 1.8, 1.8, 0.015, 28, B.rgb(0x9a3b2e)), B.cyl(0, FT + 0.002, 0.8, 1.2, 1.2, 0.015, 28, B.rgb(0xc8784a)));
    /* Beandie's stall: the counter, his shelves of crates, barrels and sacks behind him */
    WD.push(B.box(2.9, 0, -3.3, 3.5, 1.0, 0.6, cDark), B.box(2.85, 1.0, -3.35, 3.6, 1.06, 0.65, cWall));
    WD.push(B.box(4.6, 1.2, -3.4, W2, 1.28, 0.6, cDark), B.box(4.6, 1.9, -3.4, W2, 1.98, 0.6, cDark));
    [[-3.0, 1.28], [-2.0, 1.28], [-0.4, 1.28], [-2.6, 1.98], [-1.0, 1.98]].forEach(function (q) { WD.push(B.box(4.65, q[1], q[0] - 0.3, 4.95, q[1] + 0.35, q[0] + 0.3, B.rgb(0xb08a5e))); });
    BK.push(B.cyl(4.55, FT, 1.4, 0.35, 0.35, 0.8, 12, B.rgb(0x7a5233)), B.cyl(4.55, FT, 2.2, 0.35, 0.35, 0.8, 12, B.rgb(0x6e4a2e)));
    CL.push(B.cyl(4.6, FT, -4.2, 0.3, 0.22, 0.6, 8, B.rgb(0xcbb88f)), B.cyl(4.2, FT, -4.6, 0.28, 0.2, 0.55, 8, B.rgb(0xbfa97f)));
    /* a few warm things on the walls: a round window's glow painted on the back wall, a rug by the door */
    CL.push({ g: new T.CircleGeometry(0.55, 24), m: B.M(-1.6, 1.9, -D2 + 0.02), col: B.rgb(0xf2d39a) }, { g: new T.CircleGeometry(0.55, 24), m: B.M(1.6, 1.9, -D2 + 0.02), col: B.rgb(0xf2d39a) });
    ST.push({ g: new T.TorusGeometry(0.58, 0.06, 6, 20), m: B.M(-1.6, 1.9, -D2 + 0.03), col: cStone }, { g: new T.TorusGeometry(0.58, 0.06, 6, 20), m: B.M(1.6, 1.9, -D2 + 0.03), col: cStone });
    CL.push(B.box(-0.9, FT, 3.6, 0.9, FT + 0.012, 4.6, B.rgb(0x4f6f8a)));
    /* the fire's light, baked into the colours: warm near the hearth, a little dimmer in the far corners */
    var glow = function (x, y, z) { var d2 = (x - FIRE.x) * (x - FIRE.x) + (y - 0.8) * (y - 0.8) + (z - FIRE.z) * (z - FIRE.z); return 0.92 + 0.55 * Math.exp(-d2 / 7); };
    var meshes = [];
    [['wood', WD], ['logs', BK], ['stone', ST], ['cloth', CL]].forEach(function (e) { var m = new T.Mesh(B.merge(e[1], glow), MAT[e[0]]); m.name = 'hermits632:' + e[0]; hg.add(m); meshes.push(m); });
    /* the ceiling: its own mesh, the one that throws the hall's shadow (only while she is inside) */
    var slabOn = false;
    var slab = new T.Mesh(B.merge([B.box(-W2 - 0.2, HT, -D2 - 0.2, W2 + 0.2, HT + HALL.SLAB, D2 + 0.2, B.rgb(0x7a5638))], glow), MAT.wood); slab.name = 'hermits632:ceiling'; hg.add(slab); meshes.push(slab);
    /* the round door's leaf, on a pivot at the game's hinge (-0.6, d/2): doors() swings it */
    var pivot = new T.Group(); pivot.position.set(-0.6, 0, D2 - 0.06); hg.add(pivot);
    var leaf = new T.Mesh(B.merge([{ g: new T.CylinderGeometry(0.62, 0.62, 0.08, 24), m: B.M(0.62, FT + 0.8, 0, Math.PI / 2, 0, 0), col: B.rgb(0x3f6b3a) },
      { g: new T.SphereGeometry(0.07, 8, 6), m: B.M(0.62, FT + 0.8, -0.07), col: B.rgb(0xd9b24a) }]), MAT.wood); leaf.name = 'hermits632:door'; pivot.add(leaf); meshes.push(leaf);
    /* the game's one-time shadow pass sets castShadow on every mesh: held false here (the inside throws none), the ceiling's by flag */
    meshes.forEach(function (m) { var isSlab = m === slab; Object.defineProperty(m, 'castShadow', { get: function () { return isSlab ? slabOn : false; }, set: function () {}, configurable: true }); m.receiveShadow = true; });
    hg.visible = false; scene.add(hg);

    /* ── the world-space group: the fire, the stall's goods, the two hermits (never scaled by HS) ── */
    var wg = new T.Group(); wg.name = 'hermits632:folk'; wg.visible = false; scene.add(wg);
    var at = function (lx, ly, lz) { var p = W(lx, lz); return new T.Vector3(p.x, Y0 + ly * HS, p.z); };
    var fire = o.emoji('🔥', 1.1); fire.position.copy(at(FIRE.x, FIRE.y, FIRE.z)); wg.add(fire);
    var goods = ITEMS.map(function (it) { var sp = o.emoji(it.emoji, 0.75); sp.position.copy(at(ITEM_X, 1.06 + 0.3, it.z)); wg.add(sp); return sp; });
    var sign = o.emoji('✦', 0.6); sign.position.copy(at(ITEM_X, 2.2, -1.2)); wg.add(sign);
    var folk = [];
    var mk = function (who, idx, look, pal, spot, body) {
      var m = o.humans.make(T, idx, pal, { renderer: o.renderer, look: look });
      var n = Object.assign(m, { name: who, i: 60 + folk.length, yaw: 0, stride: 0, spot: spot, body0: body, pal: pal });
      var p = at(spot.x, FT, spot.z); n.g.position.copy(p); n.yaw = spot.face + rot; n.g.rotation.y = n.yaw; wg.add(n.g); folk.push(n); return n;
    };
    /* grey hair, old clothes; the looks are humans.js's own shapes (Ada's bun and dress, Cyril's crop, beard and waistcoat) */
    var beanda = mk('Beanda', 0, { torso: 'f', dress: true, sleeves: 'long', hair: 'bun', apron: 0xe9dfca, iris: 0x5a6f80, h: 0.93, w: 1.0, shirtTex: 'linen' },
      { shirt: 0x7a6390, pants: 0x5a4a3a, shoes: 0x3b2f2a, skin: 0xe2bfa2, hair: 0xcfcac2 }, BEANDA, 'woman1');
    var beandie = mk('Beandie', 2, { torso: 'm', sleeves: 'long', hair: 'crop', beard: true, vest: 0x5a4030, iris: 0x4a3a2a, h: 0.97, w: 1.06, shirtTex: 'linen' },
      { shirt: 0x6d7f4a, pants: 0x4a3a2a, shoes: 0x2e2620, skin: 0xd6ad8a, hair: 0xbdb8ae }, BEANDIE, 'man2');
    /* Standard: the model people, after the script has run (the look is decided once, at load: classicLook is read then) */
    setTimeout(function () { try { var Lt = late(); if (Lt.classic() || !Lt.villagers || !Lt.people || !Lt.models) return;
      folk.forEach(function (n) { var bx = new T.Box3().setFromObject(n.g), height = bx.max.y - bx.min.y;
        Lt.villagers.swap(T, n, 2, { WFR_PEOPLE: Lt.people, height: height, body: n.body0, pal: n.pal, looks: false, onSwap: function (mm) { mm.body.traverse(function (ob) { if (ob.isMesh) { ob.castShadow = true; ob.receiveShadow = true; } }); } }); });
    } catch (e) { inst.swapErr = String(e && e.message || e); } }, 0);

    /* ── the houses[] record: the game's indoor walk, door, camera and HUD read it ── */
    var room = { x: W2 - 0.075 - 0.42, z: D2 - 0.075 - 0.42 };   /* the game's plaster rule (roomOf): the inner face less her reach */
    var solids = [[HX, -2.4, HX + 1.45, 0.4], [-3.95, -4.95, -2.25, -3.95], [-4.98, -5.5, -2.25, -5.0], [-4.1, 0.9, -3.1, 1.9], [-0.45, -4.9, 1.65, -2.7],
      [2.85, -3.4, W2, 0.7], [4.15, 1.0, W2, 2.6], [3.85, -4.9, W2, -3.85], [-W2, -5.5, -W2 + 0.35, D2], [W2 - 0.35, -5.5, W2, D2],
      [BEANDA.x - 0.35, BEANDA.z - 0.35, BEANDA.x + 0.35, BEANDA.z + 0.35]];
    [-4.0, -1.5, 1.0, 3.5].forEach(function (z) { solids.push([-W2, z - 0.2, -W2 + 0.4, z + 0.2], [W2 - 0.4, z - 0.2, W2, z + 0.2]); });
    var solid = function (lx, lz) { for (var q = 0; q < solids.length; q++) { var b = solids[q]; if (lx > b[0] - 0.18 && lx < b[2] + 0.18 && lz > b[1] - 0.18 && lz < b[3] + 0.18) return true; } return false; };
    var cabZ = function (lz) { return lz - CZ; };
    var roofAt = function (lx, lz) {   /* the walkable top: the cabin's roof over the cabin's footprint; elsewhere the hill (the hall is under it) */
      if (Math.abs(lx) < CD.w / 2 + 0.1 && Math.abs(cabZ(lz)) < CD.d / 2 + 0.1) return (cabY - Y0) / HS + cab.roofAt(lx, cabZ(lz));
      return -1e6;
    };
    var camL = { x: 0, z: D2 - 1, t: -1 };
    var camAim = function () {   /* 5.2 m behind her, kept inside the walls and clear of the hearth and the shelves */
      var Lt = late(), S = Lt.S; if (camL.t === S.t) return camL; camL.t = S.t;
      var q = L(S.pos.x - Math.sin(S.yaw) * 5.2, S.pos.z - Math.cos(S.yaw) * 5.2);
      camL.x = clamp(q.x, -W2 + 0.95, W2 - 0.95); camL.z = clamp(q.z, -D2 + 0.6, D2 - 0.45); return camL;
    };
    var rec = { i: o.houses.length, g: hg, x: site.ox, z: site.oz, y: Y0, rot: rot, w: HALL.W, d: HALL.D, ht: HALL.HT, pivot: pivot, openT: Infinity,
      treat: null, treatTaken: true, cabin: true, id: 'hermits', get name() { return 'the hermits\' hall' + (LATE ? ' · ✦ ' + (LATE.S.runes || 0) + ' runes' : ''); }, who:'Beanda and Beandie', keepsake: null, reach: { x: 1e3, z: 1e3 },
      roofAt: roofAt, solid: solid, lookUp: 0.5, dims: { FT: FT }, room: room, windowMats: [],
      cam: { get x() { return camAim().x; }, get z() { return camAim().z; }, y: 2.35 } };

    /* ── the frame ── */
    var LATE = null;
    function late() { return LATE || (LATE = o.late()); }
    var dead = false, log = [], doorPt = { x: s.x, z: s.z }, wasIn = false, inT = 0, label = '';
    function say(lines, done) { var Lt = late(); lines.forEach(function (l) { log.push(l[0] + ': ' + l[1]); }); if (log.length > 60) log.splice(0, log.length - 60); Lt.say(lines, done); }
    function inside() { return late().S.inside === rec; }
    function local() { var S = late().S; return L(S.pos.x, S.pos.z); }
    function runes() { return late().S.runes || 0; }
    function coldOf() { var S = late().S; return S.chick && S.chick.cold && S.chick.cold.stage ? S.chick.cold : null; }
    function near() {
      var Lt = late(), S = Lt.S; if (!inside() || S.mode !== 'walk' || S.talking) return null;
      var q = local(), k;
      for (k = 0; k < ITEMS.length; k++) if (Math.hypot(q.x - REACH_X, q.z - ITEMS[k].z) < REACH_R) return { who: 'item', it: ITEMS[k] };
      if (Math.hypot(q.x - BEANDA.x, q.z - BEANDA.z) < BEANDA.near + 0.35) return { who: 'beanda' };
      if (q.x > 1.5 && q.z > -3.6 && q.z < 1.0) return { who: 'beandie' };
      return null;
    }
    function labelOf(nr) {
      if (!nr) return '';
      if (nr.who === 'item') return '✦ ' + nr.it.price + ' · Buy ' + nr.it.emoji;
      if (nr.who === 'beanda') { var cd = coldOf(); if (cd) return '✦ ' + (cd.stage >= 2 ? PRICES.mend2 : PRICES.mend1) + ' · Mend';
        if (API.healHer && API.healHer.need && API.healHer.need()) return '✦ ' + API.healHer.price() + ' · Heal'; return '💬 Talk'; }
      return '💬 Talk';
    }
    function button(el) {   /* signTick's first word: the game's Talk button says what a press here does */
      if (dead) return false;
      try { var nr = near(); label = labelOf(nr); if (!label) return false;
        if (el.textContent !== label) el.textContent = label; if (el.hidden) el.hidden = false; return true; } catch (e) { fail(e); return false; }
    }
    function pay(n) { var S = late().S; S.runes = (S.runes || 0) - n; }
    function mend() {
      var Lt = late(), S = Lt.S, cd = coldOf(), p = cd.stage >= 2 ? PRICES.mend2 : PRICES.mend1, n = runes();
      if (n < p) { say(LINES.mendPoor(p, n)); return; }
      pay(p); Object.assign(S.chick.cold, { stage: 0, at: -1, a: 0, b: 0 }); Lt.save(); Lt.careStats(); Lt.hud(); Lt.ding();
      say(LINES.mended);
    }
    function buy(it) {
      var Lt = late(), S = Lt.S, n = runes();
      if (it.fruit) { if (!S.nestDone || !Lt.chick()) { say(LINES.noChick); return; } if (S.fruit) { say(LINES.beakFull); return; } }
      if (it.inv) { if (Lt.strength() < 2) { say(LINES.heavy); return; } if (!(S.lessons && S.lessons.crow)) { say(LINES.noCrow); return; } }
      if (n < it.price) { say(LINES.poor(it.price, n)); return; }
      if (it.fruit) { var type = Lt.fruit(it.fruit); if (!type) { say(LINES.noChick); return; } pay(it.price); Lt.giveBeak(type); }
      else { pay(it.price); S.inv = S.inv || {}; S.inv[it.inv] = (S.inv[it.inv] || 0) + it.n; }
      Lt.save(); Lt.hud(); Lt.chirp(); Lt.ding(); say(LINES.sold[it.id]);
    }
    function press() {   /* the read button's pointerdown, before the signs and the mentors */
      if (dead) return false;
      try { var Lt = late(), S = Lt.S, nr = near(); if (!nr) return false;
        if (nr.who === 'item') buy(nr.it);
        else if (nr.who === 'beanda') {
          if (coldOf()) mend();
          else if (API.healHer && API.healHer.need && API.healHer.need()) { var hp = API.healHer.price(); if (runes() < hp) say(LINES.mendPoor(hp, runes())); else { pay(hp); API.healHer.heal(); Lt.save(); Lt.hud(); say([['Beanda', API.healHer.line || 'There. You are mended.']]); } }
          else say(S.nestDone && Lt.chick() ? LINES.beandaWell : LINES.beandaNoChick);
        } else { S.seen = S.seen || {}; S.seen.beandie632 = true; Lt.save(); say(LINES.beandie(runes())); }
        return true;
      } catch (e) { fail(e); return false; }
    }
    function fail(e) { dead = true; API.error = String(e && e.message || e); try { console.warn('hermits stopped: ' + API.error); } catch (x) { /* fine */ } }
    function tick(dt) {
      if (dead) return;
      try { step(dt); } catch (e) { fail(e); }
    }
    function step(dt) {
      var Lt = late(), S = Lt.S, me = S.pos, isIn = inside();
      var dDoor = Math.hypot(me.x - doorPt.x, me.z - doorPt.z), atDoor = !isIn && dDoor < 7 && Math.abs(me.y - cabY) < 6 && (S.mode === 'walk' || S.mode === 'landing' || S.mode === 'fly');
      var want = atDoor || isIn ? 1.4 : 0; cab.door.rotation.y += (want - cab.door.rotation.y) * Math.min(1, dt * 4);
      var show = isIn || (atDoor && dDoor < 4.5);
      if (hg.visible !== show) hg.visible = show;
      if (wg.visible !== show) wg.visible = show;
      slabOn = isIn;
      if (isIn !== wasIn) { wasIn = isIn; inT = 0; }
      if (isIn) inT += dt;
      if (!show) return;
      fire.scale.setScalar(1.1 * (1 + 0.08 * Math.sin(S.t * 13) + 0.05 * Math.sin(S.t * 7.3)));
      for (var k = 0; k < goods.length; k++) goods[k].position.y = Y0 + 1.36 * HS + Math.sin(S.t * 2 + k) * 0.04;
      folk.forEach(function (n) {
        var d = Math.hypot(me.x - n.g.position.x, me.z - n.g.position.z);
        if (isIn && d < 7) Lt.turnTo(n, me.x, me.z, dt); else { var f = at(n.spot.x + Math.sin(n.spot.face), 0, n.spot.z + Math.cos(n.spot.face)); Lt.turnTo(n, f.x, f.z, dt); }
        Lt.pose(n, S.talking && isIn && d < 9 ? 'talk' : isIn && inT < 2.5 ? 'wave' : isIn && d < 7 ? 'listen' : 'look', dt, 0);
      });
      /* the first time in: both of them say hello (once a save) */
      if (isIn && inT > 0.6 && !S.talking && S.mode === 'walk' && !(S.seen && S.seen.hermits632) && Lt.$('story').hidden) { S.seen = S.seen || {}; S.seen.hermits632 = true; Lt.save(); say(LINES.hello); }
    }
    function where(lx, lz) { var p = W(lx, lz); return [+p.x.toFixed(3), +p.z.toFixed(3)]; }
    function peek() {
      var Lt = late(), S = Lt.S, nr = null; try { nr = near(); } catch (e) { /* peek never throws */ }
      var cdoor = W(0, D2), cin = W(0, D2 - 0.9), cout = W(0, D2 + 1.3);
      return { ready: !dead, err: API.error, site: { k: site.k, door: [s.x, s.z], rot: rot, hall: [+site.ox.toFixed(3), +Y0.toFixed(3), +site.oz.toFixed(3)], cabin: [+site.cab.x.toFixed(3), +cabY.toFixed(3), +site.cab.z.toFixed(3)],
          hi: +site.hi.toFixed(3), lo: +site.lo.toFixed(3), hmin: +site.hmin.toFixed(3), cover: +(site.hmin - (Y0 + (HALL.HT + HALL.SLAB) * HS)).toFixed(3) },
        dims: { hallW: HALL.W, hallD: HALL.D, cabW: CD.w, cabD: CD.d, HS: HS, room: [room.x, room.z] }, doorIn: [+cin.x.toFixed(3), +cin.z.toFixed(3)], doorAt: [+cdoor.x.toFixed(3), +cdoor.z.toFixed(3)], doorOut: [+cout.x.toFixed(3), +cout.z.toFixed(3)],
        inside: inside(), local: (function () { var q = local(); return [+q.x.toFixed(3), +q.z.toFixed(3)]; })(), near: nr ? (nr.who === 'item' ? nr.it.id : nr.who) : null, label: label,
        shown: hg.visible, folkShown: wg.visible, cabinDoor: +cab.door.rotation.y.toFixed(3), slab: slabOn, floorY: +(Y0 + FT * HS).toFixed(3),
        beanda: where(BEANDA.x, BEANDA.z), beandie: where(BEANDIE.x, BEANDIE.z), beandaNear: where(BEANDA.x + 1.05, BEANDA.z), beandieNear: where(2.3, -1.9),
        wp: where(0.3, 3.4), exit: where(0.25, D2 + 0.4), hallRect: [W(-W2, -D2), W(W2, -D2), W(W2, D2), W(-W2, D2)].map(function (p) { return [+p.x.toFixed(3), +p.z.toFixed(3)]; }),
        folk: folk.map(function (n) { return { name: n.name, at: [+n.g.position.x.toFixed(3), +n.g.position.y.toFixed(3), +n.g.position.z.toFixed(3)], visible: n.g.visible && wg.visible, model: !!n.model }; }),
        items: ITEMS.map(function (it) { return { id: it.id, price: it.price, at: where(ITEM_X, it.z), reach: where(REACH_X, it.z) }; }), prices: { mend1: PRICES.mend1, mend2: PRICES.mend2 },
        runes: S.runes || 0, seen: !!(S.seen && S.seen.hermits632), log: log.slice(), swapErr: inst.swapErr || '' };
    }
    function set(q) {   /* the bench's setup door (never the player's): her runes, an emptied beak */
      var Lt = late(), S = Lt.S; q = q || {};
      if (typeof q.runes === 'number') S.runes = q.runes;
      if (q.emptyBeak && S.fruit) { if (S.fruit.g && S.fruit.g.parent) S.fruit.g.parent.remove(S.fruit.g); S.fruit = null; }
      Lt.save(); Lt.hud(); return peek();
    }
    var inst = { hall: rec, cabin: cab, site: site, tick: tick, button: button, press: press, peek: peek, set: set, log: log, swapErr: '' };
    return inst;
  }

  API.create = create; API.check = check; API.SITES = SITES; API.HALL = HALL; API.PRICES = PRICES; API.ITEMS = ITEMS; API.LINES = LINES;
  return API;
})();
