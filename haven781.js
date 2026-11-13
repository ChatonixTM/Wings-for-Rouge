/* haven781.js - BOARD 781 UNITS 2 + 4, THE CHICK HAVEN AND ITS MARKET (Wings for Rouge). Su 41, Nov 12 2026.
   Marth, Oct 23 2026, verbatim: "we never built the area for the chics. we should make that a chao garden type are where u enter a door and a cutscene
   (like going to sleep black screen fade) and ur inthe chic haven". Nov 12: "the chic aspect is entirely derived from snoic adventure dx ... where the chao shop
   is upgraded, theres a school for the chics, they can fight or race etc."; his picks: "One now, eggs later", "Haven, race outside". Then "dont rush the ships" /
   "make a nice build". Plan: PLAN_781_CINEMATICS_AND_CHICK_HAVEN_2026-11-12.md, units 2 and 4. Study, never copy: our names, our shapes, our words.

   WHAT IS HERE.
   THE DOOR  a small round door at the foot of the nest tree (a frame, a leaf on a pivot, a step, a warm lantern), always there; near it the game's own action
             button says '🐣 Chick Haven'. Before she has a chick it stays shut ("something small will live here one day").
   IN        a scene (cine.js): the bars, a low shot behind her, the door swings in, warm light, she steps up to it, the dark; then the arrival: a crane shot over
             the garden down to her, the name rising ('Chick Haven', title39 with our 'haven' phrase), and her chick RUNS to her across the grass (its Run stat
             sets the pace), hops, chirps, hearts. First visit the long cut; after it a shorter one. A tap ends either after 1.5 s.
   THE HAVEN a walled garden above the clouds (it hangs over the nest tree at Y, shown only while she is in it): a round lawn of grass blades and flowers, a
             mossy stone wall, a ring of the island's own oaks and birches outside it, bushes and ferns (trees.js plant(): the island's own builder), a pond with
             lily pads, a signpost to the Market, the School and the Ring, the School's slate and the Ring's stumps (both 'opening soon': units 6-8), her toys, and
             the way home: a round door in the wall. The ground is the game's own: groundAt() asks ground(x, z) first while she is in, so her walk, hop, landing,
             camera, the chick's own life and its follow all stand on this lawn with no special case; the wall and the pond hold her by clamp().
   THE MARKET a stall with a striped awning, kept by Thimble, a hedgehog (hedgehogs.js's own builder, borrowed). Coins (fall748's, the game's only coin) buy:
             WEAR four new wearables (chick-wear.js, shop: true), TOYS that stand in the Haven and cheer the chick, FRUIT that pushes one strength four times a
             tree fruit (into her beak: the game's own Feed gives it), EGGS shown 'soon' (his "One now, eggs later"). Prices: PRICES, set from a measured hunt.
   KEEPSAKES (Marth, Nov 12, picking between the two: "Just the Haven") a little two-tier shelf by the toys holds every keepsake her chick has kept (the Feed's
             own record, S.chick.marks: nothing new saved); now and then the chick takes one down and plays with it (it hops over to the shelf, the keepsake hops down to it and bounces round it,
             hearts, mood +3), then it goes back to its place. The seven keepsakes come from cabins.js / cave.js (o.keepsake(id)). DRAFT.
   THE RACE  (782 #129) a red board by the home door: its Race button takes her and her chick out through the dark to the Race's start line on the
             island (race782.js; his "Haven, race outside"), where the cups panel opens.
   SAVED     S.chick.haven781 = { visits, met, owned: { id: true }, toys: [id], spent } (S.chick is saved whole).
   COST      built once at load into one group, hidden until she is in: one floor, one wall, one instanced grass, one instanced flower field, the trees' own
             instanced meshes, a few plain meshes and canvas signs; Lambert only (the game's programs). Nothing is made or freed per visit.
   BORROWED  trees.js plant() (oaks, birches, bushes, ferns), textures.js via the game's tex() (grass, stone, planks, wood, bark, cloth, rock), hedgehogs.js's
             hedgehog, chick-wear.js's dress, the game's emojiSprite and burst; nothing downloaded. The grass blade, the awning stripes and the sign boards are
             a few lines of glue. Every word and number a DRAFT for his pen and thumb. Standard only (the door is never built in Classic: frozen). */
window.WFR_HAVEN781 = (function () {
  'use strict';
  var API = { error: '' };
  var K = { Y: 135, R: 14.6, FLOOR_R: 21, WALL_R: 16, WALL_H: 1.5, DOOR_R: 0.62, NEAR: 3.4 };   /* 782 (3): the door's button from 3.4 m (it was 2.4: a stranger at the trunk never saw it) */
  /* the garden, in its own frame (metres from its middle; +z is the home door's side) */
  var P = { arrive: [0, 11.4], door: [0, 15.55], pond: [-6.2, -3.2, 2.9], chick: [-3.4, -6.4], shelf: [-8.4, -7.8], market: [7.4, -4.8], counter: [5.6, -3.6], school: [-8.6, 5.6], ring: [0.6, -10.6, 2.5], post: [2.6, 6.4], race: [4.4, 11.4] };   /* 782 #129: race, the Race's board by the home door (the course is outside) */
  /* DRAFT prices in coins, set from a measured island (Su 41, Nov 12, Lv 30 save): 23 animals, each fall drops a coin at its row's chance (fall748.js), so a
     whole sweep pays about 5.0 coins (0.22 a fall) and the island refills 240 s after she leaves an animal's sight. A keen hunt (a fall every ~30 s with the
     travel) makes about 25 coins an hour; ordinary play, hunting now and then, about 5-10. So a fruit is a few minutes' hunting, a toy about twenty, a wear about
     half an hour; the whole shelf (4 wear + 3 toys) is 72 coins: a few evenings, a goal that lasts. Past the gate the world's animals pay faster. */
  var PRICES = { fruit: 3, toy: 8, wear: 12 };
  var FRUIT = [   /* one strength each, four times a tree fruit (FRUIT_GAIN 4 x 4 = 16); into her beak, given with the game's own Feed */
    { id: 'lean_fly', emoji: '\u{1F351}', name: 'a sky peach', stat: 'fly', word: 'Flight' }, { id: 'lean_run', emoji: '\u{1F350}', name: 'a quick pear', stat: 'run', word: 'Run' },
    { id: 'lean_str', emoji: '\u{1F965}', name: 'a strong coconut', stat: 'str', word: 'Strength' }, { id: 'lean_sta', emoji: '\u{1F34C}', name: 'a long banana', stat: 'sta', word: 'Stamina' },
    { id: 'lean_swim', emoji: '\u{1F348}', name: 'a sea melon', stat: 'swim', word: 'Swim' }];
  var TOYS = [{ id: 'ball', emoji: '\u{26BD}', name: 'a bouncy ball', at: [-1.6, -8.4] }, { id: 'pinwheel', emoji: '\u{1F390}', name: 'a pinwheel', at: [-5.6, -8.2] }, { id: 'drum', emoji: '\u{1FA98}', name: 'a little drum', at: [-1.2, -4.6] }];
  var LINES = {
    shut: 'A little round door, shut tight. Something small will live here one day.',
    hello: 'Oh! A customer with wings. I keep the Market here. Coins for nice things, that is the deal. You earn them by helping: a twig, a tool brought, a lesson, every new level. Animals drop a few too.',   /* 782 (2): she says plainly how coins are earned */
    poor: function (p, n) { return 'That one is ' + p + ' coins and you have ' + n + '. Bring a villager their tool, learn a lesson, or grow a level: each pays a coin or two.'; },
    earn: 'Earn coins: a twig 1 · a tool brought 2 · a lesson 2 · a new level 1 · animals now and then',   /* 782 (2): the panel says it too (DRAFT) */
    full: 'Your beak is full. Give that to your chick first.',
    school: 'The School. Lessons for chicks: songs, dances, drawings. The teacher is still on the way. (Opening soon.)',
    ring: 'The Ring. Gentle games for chicks: Puff Push, and a vine tug-of-war. Nobody gets hurt. (Opening soon.)',
    post: 'Market this way. School that way. The Ring straight on. Home is the round door behind you.'
  };
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function board(THREE, text, w, h, opts) {   /* a sign: both faces painted (782 (9): read from behind it said "nevaH kcihC"); an arrow on the back points the other way */
    opts = opts || {}; var g = new THREE.Group(), f = face(THREE, text, w, h, opts), bt = String(text).replace(/\u2192|\u2190/g, function (c) { return c === '\u2192' ? '\u2190' : '\u2192'; });
    var b = face(THREE, bt, w, h, opts); b.rotation.y = Math.PI; g.add(f); g.add(b); g.userData.faces = [String(text), bt]; return g;
  }
  function face(THREE, text, w, h, opts) {   /* one face: a canvas with words, on a plane */
    var cv = document.createElement('canvas'), W = 512, H = Math.round(512 * h / w); cv.width = W; cv.height = H; var g = cv.getContext('2d');
    g.fillStyle = opts.bg || '#7a5432'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(40,24,10,.6)'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
    for (var i = 0; i < 6; i++) { g.fillStyle = 'rgba(40,24,10,' + (0.06 + 0.05 * hash(i + w)) + ')'; g.fillRect(0, (i + 0.5) * H / 6, W, 3); }
    g.fillStyle = opts.ink || '#fff3d6'; g.textAlign = 'center'; g.textBaseline = 'middle'; var lines = String(text).split('\n'), fs = Math.min(H / (lines.length + 0.6), opts.size || 120);
    g.font = '600 ' + fs + 'px Georgia, "Times New Roman", serif'; lines.forEach(function (l, k) { g.fillText(l, W / 2, H / 2 + (k - (lines.length - 1) / 2) * fs * 1.05, W - 30); });
    var tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tx, side: THREE.FrontSide })); return m;
  }
  function create(o) {
    var THREE = o.THREE, scene = o.scene, L = o.late, C = o.center, ok = true;
    var H = { in: false, visits: 0, enters: 0, leaves: 0, x: C.x, z: C.z, y: K.Y, door: null, open: 0, want: 0, near: null, panel: null, tab: 'wear', lastLabel: null, chickRun: null, lastPrices: PRICES };
    var root = new THREE.Group(); root.name = 'haven781'; root.position.set(C.x, K.Y, C.z); root.visible = false; scene.add(root);
    var lam = function (c, x) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, x || {})); };
    function add(m, x, y, z) { m.position.set(x || 0, y || 0, z || 0); root.add(m); return m; }
    function shade(m, cast, recv) { m.traverse(function (q) { if (q.isMesh) { q.castShadow = !!cast; q.receiveShadow = recv !== false; } }); return m; }
    /* THE LAWN: the floor, its rock underside (a floating garden seen from its own edge), the blades, the flowers */
    var floor = o.tex(new THREE.Mesh(new THREE.CircleGeometry(K.FLOOR_R, 72), lam(0x8fbf5a)), 'grass', 9, 9); floor.rotation.x = -Math.PI / 2; add(floor); floor.receiveShadow = true;
    var under = o.tex(new THREE.Mesh(new THREE.ConeGeometry(K.FLOOR_R, 16, 28, 3), lam(0x8a7a66)), 'rock', 6, 2); under.rotation.x = Math.PI; add(under, 0, -8.02, 0);
    var path = o.tex(new THREE.Mesh(new THREE.RingGeometry(0, 1, 40), lam(0xcdb48a)), 'sand', 2, 2); path.rotation.x = -Math.PI / 2; path.scale.set(1.3, 6.2, 1); path.position.set(0, 0.012, 9.4); root.add(path); path.receiveShadow = true;
    var plaza = o.tex(new THREE.Mesh(new THREE.CircleGeometry(3.4, 36), lam(0xcdb48a)), 'sand', 3, 3); plaza.rotation.x = -Math.PI / 2; add(plaza, 0.8, 0.014, 1.6); plaza.receiveShadow = true;
    (function blades() {
      var g = new THREE.BufferGeometry(), pos = [0, 0, 0, 0.05, 0, 0, 0.02, 0.42, 0.01], col = [0.18, 0.32, 0.1, 0.2, 0.36, 0.11, 0.62, 0.82, 0.36];
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
      var N = 4200, im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), N), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(), n = 0;
      for (var i = 0; n < N && i < N * 3; i++) { var a = hash(i * 3.1) * Math.PI * 2, r = Math.sqrt(hash(i * 7.7)) * (K.WALL_R - 0.6), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (Math.hypot(x - P.pond[0], z - P.pond[1]) < P.pond[2] + 0.2 || Math.hypot(x - 0.8, z - 1.6) < 3.3 || (Math.abs(x) < 1.3 && z > 3.4 && z < 15.6) || Math.hypot(x - P.ring[0], z - P.ring[1]) < P.ring[2]) continue;
        e.set((hash(i * 1.3) - 0.5) * 0.5, hash(i * 2.9) * 6.3, (hash(i * 4.1) - 0.5) * 0.5); q.setFromEuler(e); var k = 0.7 + hash(i * 5.3) * 0.9; s.set(1, k, 1); v.set(x, 0, z); m.compose(v, q, s); im.setMatrixAt(n++, m); }
      im.count = n; im.receiveShadow = false; root.add(im);
    })();
    (function flowers() {
      var g = new THREE.IcosahedronGeometry(0.075, 0), N = 220, im = new THREE.InstancedMesh(g, lam(0xffffff), N), m = new THREE.Matrix4(), col = new THREE.Color(), CL = [0xfff2a8, 0xff8fa3, 0xffffff, 0xb59cf0, 0xffb84a, 0x9fd8ff], n = 0;
      for (var i = 0; n < N && i < N * 4; i++) { var a = hash(i * 9.3) * Math.PI * 2, r = 3 + Math.sqrt(hash(i * 3.7)) * (K.WALL_R - 3.6), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (Math.hypot(x - P.pond[0], z - P.pond[1]) < P.pond[2] + 0.5 || (Math.abs(x) < 1.6 && z > 3) || Math.hypot(x - P.market[0], z - P.market[1]) < 3.4 || Math.hypot(x - P.school[0], z - P.school[1]) < 2.6) continue;
        m.makeTranslation(x, 0.2 + hash(i) * 0.12, z); im.setMatrixAt(n, m); im.setColorAt(n, col.setHex(CL[Math.floor(hash(i * 5.1) * CL.length)])); n++; }
      im.count = n; im.instanceColor.needsUpdate = true; root.add(im);
    })();
    /* THE WALL: mossy stone, a lathe of its cross-section, the home door's gap left in it */
    (function wall() {
      var t = 0.36, h = K.WALL_H, R = K.WALL_R, pts = [new THREE.Vector2(R - t, 0), new THREE.Vector2(R - t, h), new THREE.Vector2(R - t * 0.6, h + 0.18), new THREE.Vector2(R + t * 0.6, h + 0.18), new THREE.Vector2(R + t, h), new THREE.Vector2(R + t, 0)];
      var gap = 0.16, g = new THREE.LatheGeometry(pts, 64, Math.PI / 2 + gap, Math.PI * 2 - 2 * gap);   /* the gap faces +z (the lathe starts on +x... turned below) */
      var w = shade(o.tex(new THREE.Mesh(g, lam(0xb8b0a0)), 'stone', 26, 1), true, true); w.rotation.y = 0; root.add(w); H.wallMesh = w;
      var moss = new THREE.Mesh(new THREE.TorusGeometry(R, 0.2, 5, 64, Math.PI * 2 - 2 * gap), lam(0x5d8f3c)); moss.rotation.x = Math.PI / 2; moss.rotation.z = Math.PI / 2 + gap; moss.position.y = h + 0.16; moss.scale.z = 0.5; root.add(moss);
    })();
    /* THE TREES: the island's own builder, a ring outside the wall; bushes and ferns inside it */
    (function trees() {
      if (!o.plant) return; var specs = [], kinds = [];
      for (var i = 0; i < 18; i++) { var a = i / 18 * Math.PI * 2 + 0.09, r = 18.6 + hash(i * 2.3) * 1.6; if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.2) continue; specs.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0, s: 1.15 + hash(i) * 0.5 }); kinds.push(i % 3 === 0 ? 'birch' : 'oak'); }
      for (var j = 0; j < 22; j++) { var b = j / 22 * Math.PI * 2 + 0.12, rr = 14.2 + hash(j * 4.4) * 0.6; if (Math.abs(Math.atan2(Math.sin(b - Math.PI / 2), Math.cos(b - Math.PI / 2))) < 0.22) continue; specs.push({ x: Math.cos(b) * rr, z: Math.sin(b) * rr, y: 0, s: 0.8 + hash(j * 3) * 0.4 }); kinds.push(j % 2 ? 'bush' : 'fern'); }
      try { var T = o.plant(specs, { kindOf: function (sp, i) { return kinds[i]; }, understory: false, shadows: true, fruitEvery: 0 }); (T.meshes || []).forEach(function (m) { root.add(m); }); H.trees = specs.length; } catch (e) { API.error = 'trees: ' + (e && e.message); }
    })();
    /* THE POND: still water, a stone rim, lily pads */
    (function pond() {
      var w = new THREE.Mesh(new THREE.CircleGeometry(P.pond[2], 40), new THREE.MeshPhongMaterial({ color: 0x3f8fae, shininess: 90, specular: 0x9fd8ff, transparent: true, opacity: 0.9 })); w.rotation.x = -Math.PI / 2; add(w, P.pond[0], 0.03, P.pond[1]); H.water = w;
      var g = new THREE.DodecahedronGeometry(0.32, 0), im = o.tex(new THREE.InstancedMesh(g, lam(0x9a9286), 26), 'stone', 1, 1), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
      for (var i = 0; i < 26; i++) { var a = i / 26 * Math.PI * 2; e.set(hash(i) * 3, hash(i * 2) * 3, 0); q.setFromEuler(e); s.set(1 + hash(i * 3) * 0.6, 0.55, 1 + hash(i * 5) * 0.4); v.set(P.pond[0] + Math.cos(a) * (P.pond[2] + 0.1), 0.08, P.pond[1] + Math.sin(a) * (P.pond[2] + 0.1)); m.compose(v, q, s); im.setMatrixAt(i, m); }
      shade(im, true, true); root.add(im);
      for (var k = 0; k < 5; k++) { var pad = new THREE.Mesh(new THREE.CircleGeometry(0.28 + hash(k) * 0.15, 12, 0.3, Math.PI * 2 - 0.6), lam(0x4f9a3c, { side: THREE.DoubleSide })); pad.rotation.x = -Math.PI / 2; pad.rotation.z = hash(k * 7) * 6; add(pad, P.pond[0] + (hash(k * 3) - 0.5) * 3.4, 0.05, P.pond[1] + (hash(k * 9) - 0.5) * 3.4); }
    })();
    /* THE SIGNS: the post at the plaza, the School's slate, the Ring's stumps */
    function post(x, z, h) { var p = o.tex(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 7), lam(0x7a5432)), 'wood', 1, 2); shade(p, true); add(p, x, h / 2, z); return p; }
    (function signs() {
      post(P.post[0], P.post[1], 2.2);
      var arrows = [['Market →', P.market], ['← School', P.school], ['Ring ↑', P.ring]];
      arrows.forEach(function (a, i) { var b = board(THREE, a[0], 1.3, 0.34, { size: 90 }); var ang = Math.atan2(a[1][0] - P.post[0], a[1][1] - P.post[1]); b.position.set(P.post[0] + Math.sin(ang) * 0.5, 1.95 - i * 0.42, P.post[1] + Math.cos(ang) * 0.5); b.rotation.y = ang + Math.PI / 2; root.add(b); });
      var top = board(THREE, 'Chick Haven', 1.5, 0.42, { bg: '#5e3f22', size: 100 }); top.position.set(P.post[0], 2.45, P.post[1]); top.rotation.y = Math.PI * 0.1; root.add(top);
      /* the School: an open shelter, a slate, three stools */
      var sx = P.school[0], sz = P.school[1]; [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]].forEach(function (q) { post(sx + q[0], sz + q[1], 2.3); });
      var roof = shade(o.tex(new THREE.Mesh(new THREE.BoxGeometry(3, 0.14, 2.1), lam(0x8b5e34)), 'planks', 2, 1), true); add(roof, sx, 2.36, sz); roof.rotation.z = 0.08;
      var slate = board(THREE, o.schoolOpen ? 'School\nsongs · dances · drawings' : 'School\nopening soon', 1.8, 1.0, { bg: '#2f3a33', ink: '#eef4e6', size: 86 }); slate.position.set(sx, 1.3, sz - 0.68); root.add(slate); slate.rotation.y = 0;
      var face = Math.atan2(-sx, -sz); slate.rotation.y = face; slate.position.set(sx + Math.sin(face) * -0.6, 1.3, sz + Math.cos(face) * -0.6);
      for (var i = 0; i < 3; i++) { var st = shade(o.tex(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.32, 9), lam(0x8b6a44)), 'bark', 1, 1), true); add(st, sx + Math.sin(face) * 0.7 + Math.cos(face) * (i - 1) * 0.7, 0.16, sz + Math.cos(face) * 0.7 - Math.sin(face) * (i - 1) * 0.7); }
      /* the Ring: a sandy circle and mossy stumps round it */
      var sand = o.tex(new THREE.Mesh(new THREE.CircleGeometry(P.ring[2], 36), lam(0xd9c290)), 'sand', 2, 2); sand.rotation.x = -Math.PI / 2; add(sand, P.ring[0], 0.016, P.ring[1]); sand.receiveShadow = true;
      for (var k = 0; k < 10; k++) { var a = k / 10 * Math.PI * 2, hgt = 0.35 + hash(k) * 0.25, sp = shade(o.tex(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, hgt, 9), lam(0x8b6a44)), 'bark', 1, 1), true); add(sp, P.ring[0] + Math.cos(a) * (P.ring[2] + 0.35), hgt / 2, P.ring[1] + Math.sin(a) * (P.ring[2] + 0.35));
        var mt = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 9), lam(0x5d8f3c)); add(mt, sp.position.x, hgt + 0.02, sp.position.z); }
      /* 782 #129 · THE RACE'S BOARD by the home door (his "Haven, race outside": the course runs on the island; this board takes her and her chick out to its line) */
      if (o.race) { var rb = board(THREE, 'THE RACE\nout by the meadow', 1.5, 0.8, { bg: '#7a2f2a', size: 92 }); var rf = Math.atan2(0 - P.race[0], 7 - P.race[1]); rb.position.set(P.race[0], 1.35, P.race[1]); rb.rotation.y = rf; root.add(rb); H.raceBoard = rb;
        [-0.62, 0.62].forEach(function (d) { post(P.race[0] + Math.cos(rf) * d, P.race[1] - Math.sin(rf) * d, 1.7); }); }
      var rs = board(THREE, o.schoolOpen ? 'The Ring\nPuff Push · Vine Tug' : 'The Ring\nopening soon', 1.4, 0.7, { size: 80 });   /* 782 #132: open */ rs.position.set(P.ring[0] + 3.3, 1.2, P.ring[1] + 0.8); rs.rotation.y = Math.atan2(-(P.ring[0] + 3.3), -(P.ring[1] + 0.8)); root.add(rs); post(P.ring[0] + 3.3, P.ring[1] + 0.8 - 0.05, 0.9);
    })();
    /* THE MARKET: four posts, a counter, a striped awning, crates of wares, its sign, Thimble behind the counter */
    (function market() {
      var mx = P.market[0], mz = P.market[1], face = Math.atan2(-mx, -mz), g = new THREE.Group(); g.position.set(mx, 0, mz); g.rotation.y = face; root.add(g); H.stall = g;
      var pst = function (x, z, h) { var p = o.tex(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, h, 7), lam(0x7a5432)), 'wood', 1, 2); p.position.set(x, h / 2, z); shade(p, true); g.add(p); };
      pst(-1.6, 0.9, 2.5); pst(1.6, 0.9, 2.5); pst(-1.6, -0.9, 2.9); pst(1.6, -0.9, 2.9);
      var counter = shade(o.tex(new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 0.7), lam(0xa0784c)), 'planks', 3, 1), true); counter.position.set(0, 0.5, 0.95); g.add(counter);
      var top = shade(o.tex(new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.86), lam(0x8b5e34)), 'wood', 3, 1), true); top.position.set(0, 1.04, 0.95); g.add(top);
      var cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; var c = cv.getContext('2d'); for (var i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff4dc' : '#d8504a'; c.fillRect(i * 32, 0, 32, 64); }
      var stripes = new THREE.CanvasTexture(cv), aw = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.3, 1, 1), lam(0xffffff, { map: stripes, side: THREE.DoubleSide })); aw.position.set(0, 2.72, 0); aw.rotation.x = -Math.PI / 2 + 0.2; shade(aw, true, false); g.add(aw);
      var fr = new THREE.Group(); for (var k = 0; k < 8; k++) { var sc = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.3, 3, 1, false, 0, Math.PI), lam(k % 2 ? 0xfff4dc : 0xd8504a, { side: THREE.DoubleSide })); sc.rotation.set(Math.PI, 0, 0); sc.position.set(-1.68 + k * 0.48, 2.36, 1.17); fr.add(sc); } g.add(fr);
      var sign = board(THREE, 'Market', 1.6, 0.45, { bg: '#5e3f22', size: 110 }); sign.position.set(0, 3.06, 1.06); sign.rotation.x = -0.1; g.add(sign);
      [[-1.1, 1.18], [-0.4, 1.18], [0.35, 1.18], [1.1, 1.18]].forEach(function (q, i) { var it = o.sprite(['\u{1F452}', '\u{1F351}', '\u{26BD}', '\u{1F490}'][i], 0.5); it.position.set(q[0], q[1] + 0.2, 1.0); g.add(it); });
      [[-2.3, 0.4, 0.62], [-2.4, -0.4, 0.5], [2.3, 0.2, 0.55]].forEach(function (q) { var cr = shade(o.tex(new THREE.Mesh(new THREE.BoxGeometry(q[2], q[2], q[2]), lam(0xa0784c)), 'planks', 1, 1), true); cr.position.set(q[0], q[2] / 2, q[1]); cr.rotation.y = hash(q[0] * 3) * 0.6; g.add(cr); });
      var box = shade(o.tex(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.62, 0.7), lam(0xa0784c)), 'planks', 1, 1), true); box.position.set(0.1, 0.31, 0.1); g.add(box);   /* he stands on a crate to see over his counter */
      if (o.hog) try { var hog = o.hog(1.55, 0x8a6a48); hog.g.position.set(0.1, 0.63, 0.12); g.add(hog.g); H.hog = hog; hog.g.traverse(function (q) { if (q.isMesh) q.castShadow = true; }); } catch (e) { API.error = 'hog: ' + (e && e.message); }
      var ap = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.4, 0.42, 12, 1, true, -1.1, 2.2), lam(0x6a8f5a, { side: THREE.DoubleSide })); ap.position.set(0.1, 1.0, 0.13); g.add(ap); H.apron = ap;
    })();
    /* THE HOME DOOR in the wall's gap: a round leaf in a stone arch, 'Home' over it */
    (function homeDoor() {
      var dz = K.WALL_R, arch = shade(o.tex(new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.26, 8, 20, Math.PI), lam(0xb8b0a0)), 'stone', 3, 1), true); arch.position.set(0, 1.0, dz); root.add(arch);
      [-1, 1].forEach(function (s) { var j = shade(o.tex(new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.0, 0.72), lam(0xb8b0a0)), 'stone', 1, 1), true); j.position.set(0.98 * s, 0.5, dz); root.add(j); });
      var leaf = shade(o.tex(new THREE.Mesh(new THREE.CircleGeometry(0.98, 28), lam(0x6e8f4a, { side: THREE.DoubleSide })), 'planks', 2, 2), true); leaf.position.set(0, 0.98, dz + 0.05); root.add(leaf);
      var knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), lam(0xf2b134, { emissive: 0x3a2400 })); knob.position.set(0, 0.95, dz - 0.05); root.add(knob);
      var hs = board(THREE, 'Home', 1.0, 0.32, { size: 100 }); hs.position.set(0, 2.32, dz - 0.05); hs.rotation.y = Math.PI; root.add(hs);
    })();
    /* HER TOYS: built when owned, placed by the pond */
    var toyG = {};
    function toyMesh(id) {
      var g = new THREE.Group();
      if (id === 'ball') { var cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; var c = cv.getContext('2d'); for (var i = 0; i < 6; i++) { c.fillStyle = ['#e0533c', '#fff4dc', '#3f7fd0', '#fff4dc', '#f2b134', '#fff4dc'][i]; c.fillRect(i * 22, 0, 22, 64); } var b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), lam(0xffffff, { map: new THREE.CanvasTexture(cv) })); b.position.y = 0.32; g.add(b); }
      else if (id === 'pinwheel') { var st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.1, 6), lam(0x8b5e34)); st.position.y = 0.55; g.add(st); var hub = new THREE.Group(); hub.position.set(0, 1.08, 0.04); for (var k = 0; k < 4; k++) { var bl = new THREE.Mesh(new THREE.CircleGeometry(0.22, 3), lam([0xff8fa3, 0x9fd8ff, 0xfff2a8, 0xb59cf0][k], { side: THREE.DoubleSide })); bl.rotation.z = k * Math.PI / 2; bl.position.set(Math.cos(k * Math.PI / 2) * 0.12, Math.sin(k * Math.PI / 2) * 0.12, 0); hub.add(bl); } g.add(hub); g.userData.spin = hub; }
      else if (id === 'drum') { var d = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.34, 16), lam(0xc8314a)); d.position.y = 0.17; g.add(d); var tp = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.03, 16), lam(0xfff4dc)); tp.position.y = 0.355; g.add(tp); }
      shade(g, true); return g;
    }
    function placeToys() { var hv = state(); (hv.toys || []).forEach(function (id) { if (toyG[id]) return; var t = TOYS.find(function (q) { return q.id === id; }); if (!t) return; var m = toyMesh(id); m.position.set(t.at[0], 0, t.at[1]); m.rotation.y = hash(id.length) * 6; root.add(m); toyG[id] = m; }); }
    /* HER CHICK'S KEEPSAKES: the shelf (built at load, empty slots), a sprite per kept keepsake, and the chick's play with one at a time */
    var SLOTS = [[-0.75, 0.98], [-0.25, 0.98], [0.25, 0.98], [0.75, 0.98], [-0.6, 0.38], [0, 0.38], [0.6, 0.38]];
    var shelf = (function () {
      var g = new THREE.Group(), wood = function (w, h, d) { return shade(o.tex(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(0x8b5e34)), 'planks', 1, 1), true); };
      [-1.05, 1.05].forEach(function (x) { var s = wood(0.1, 1.5, 0.5); s.position.set(x, 0.75, 0); g.add(s); });
      [0.18, 0.78, 1.38].forEach(function (y) { var b = wood(2.2, 0.07, 0.5); b.position.set(0, y, 0); g.add(b); });
      var back = wood(2.2, 1.4, 0.05); back.position.set(0, 0.74, -0.24); g.add(back);
      var sign = board(THREE, 'Keepsakes', 1.2, 0.3, { size: 80 }); sign.position.set(0, 1.64, 0.02); g.add(sign);
      g.position.set(P.shelf[0], 0, P.shelf[1]); g.rotation.y = Math.atan2(-P.shelf[0], -P.shelf[1]); root.add(g); return g;
    })();
    var kept = {}, keptN = 0, play = { t: 5, cur: null, n: 0, said: false };
    function keepType(id) { try { return o.keepsake ? o.keepsake(id) : null; } catch (e) { return null; } }
    function slotAt(i) { var q = SLOTS[i], ry = shelf.rotation.y, z = 0.06; return { x: P.shelf[0] + q[0] * Math.cos(ry) + z * Math.sin(ry), y: q[1], z: P.shelf[1] - q[0] * Math.sin(ry) + z * Math.cos(ry) }; }
    function home(k) { shelf.add(k.sp); k.sp.position.set(SLOTS[k.i][0], SLOTS[k.i][1], 0.06); }
    function placeKept() {
      var marks = (L().S.chick && L().S.chick.marks) || {};
      Object.keys(marks).forEach(function (id) { if (kept[id] || keptN >= SLOTS.length) return; var t = keepType(id); if (!t || !t.emoji) return;
        var sp = o.sprite(t.emoji, 0.4); var k = { id: id, i: keptN++, sp: sp, name: t.name }; kept[id] = k; home(k); });
    }
    function playTick(dt, Lt, S) {   /* one keepsake at a time, never in a scene, the Market or a talk */
      var chick = Lt.chick();
      if (play.cur && (S.talking || H.panel)) return;   /* a talk or the Market holds the play where it is (Obito) */
      if (!play.cur) {
        play.t -= dt; if (play.t > 0) return;
        var ids = Object.keys(kept); if (!ids.length || !chick || S.talking || H.panel) { play.t = 4; return; }
        var k = kept[ids[play.n++ % ids.length]];
        play.cur = { k: k, u: 0, wait: 0, from: null, hearts: false, a: Math.random() * 6.28 };
        var f = Math.atan2(-P.shelf[0], -P.shelf[1]), fw = toW(P.shelf[0] + Math.sin(f) * 1.3, P.shelf[1] + Math.cos(f) * 1.3);   /* it goes to its shelf first (unless it is following her) */
        if (!(Lt.FOLLOW && Lt.FOLLOW.with) && chick.userData) { play.cur.was = chick.userData.home ? chick.userData.home.clone() : null; chick.userData.home = new THREE.Vector3(fw.x, K.Y + 0.3, fw.z); chick.userData.life = null; }
        if (!play.said) { play.said = true; try { Lt.toast('Your chick takes ' + k.name + ' down from its shelf to play.', 2600); } catch (e) { /* fine */ } }
        return;
      }
      var c = play.cur, k = c.k, sp = k.sp; if (c.wait == null) c.u += dt;
      if (!chick) { home(k); play.cur = null; play.t = 6; return; }
      var cx = chick.position.x - C.x, cz = chick.position.z - C.z;
      if (c.wait != null) { c.wait += dt; if (Math.hypot(cx - P.shelf[0], cz - P.shelf[1]) > 2.0 && c.wait < 6) return;   /* until it stands at the shelf (or 6 s) */
        c.wait = null; c.u = 0; c.from = slotAt(k.i); root.add(sp); sp.position.set(c.from.x, c.from.y, c.from.z); }
      c.a += dt * 1.6; var ox = cx + Math.sin(c.a) * 0.55, oz = cz + Math.cos(c.a) * 0.55;   /* its spot: circling the chick as it nudges it along */
      if (c.u < 0.8) { var s = sm(c.u / 0.8); sp.position.set(c.from.x + (ox - c.from.x) * s, c.from.y + (0.25 - c.from.y) * s + Math.sin(s * Math.PI) * 0.9, c.from.z + (oz - c.from.z) * s); }
      else if (c.u < 5.6) { sp.position.set(ox, 0.25 + Math.abs(Math.sin(c.u * 4.2)) * 0.3, oz);
        chick.rotation.y = Math.atan2(ox - cx, oz - cz);
        if (!c.hearts && c.u > 2.4) { c.hearts = true; try { Lt.chirp(); Lt.burstHearts(chick.position); } catch (e) { /* fine */ } if (S.chick && !H.playMood) { H.playMood = true; S.chick.happy = Math.min(100, (S.chick.happy || 0) + 3); }   /* once a visit (DRAFT, Obito: not a mood farm) */ H.plays = (H.plays || 0) + 1; } }
      else if (c.u < 6.4) { if (!c.back) c.back = sp.position.clone(); var b = sm((c.u - 5.6) / 0.8), to = slotAt(k.i); sp.position.set(c.back.x + (to.x - c.back.x) * b, c.back.y + (to.y - c.back.y) * b + Math.sin(b * Math.PI) * 0.9, c.back.z + (to.z - c.back.z) * b); }
      else { home(k); if (c.was && chick.userData && !(Lt.FOLLOW && Lt.FOLLOW.with)) { chick.userData.home = c.was; chick.userData.life = null; } play.cur = null; play.t = 14 + Math.random() * 8; }   /* and back to its own spot (Obito) */
    }
    /* THE NEST-TREE DOOR (outside, always): placed on the trunk's measured face */
    var outside = new THREE.Group(); outside.name = 'haven781:door';
    (function nestDoor() {
      var D = o.door; if (!D) { ok = false; return; } var r = K.DOOR_R;
      var frame = shade(o.tex(new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 8, 22), lam(0x6e4529)), 'wood', 2, 1), true); frame.position.y = r + 0.06; outside.add(frame);
      var back = new THREE.Mesh(new THREE.CircleGeometry(r - 0.02, 24), new THREE.MeshBasicMaterial({ color: 0xffd98a })); back.position.set(0, r + 0.06, -0.06); outside.add(back); H.glow = back;   /* the warm light inside, seen when the leaf swings */
      var piv = new THREE.Group(); piv.position.set(-r + 0.04, r + 0.06, 0.02); outside.add(piv); H.pivot = piv;
      var leaf = shade(o.tex(new THREE.Mesh(new THREE.CircleGeometry(r - 0.04, 24), lam(0x5f8a46, { side: THREE.DoubleSide })), 'planks', 2, 2), true); leaf.position.set(r - 0.04, 0, 0); piv.add(leaf);
      var knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lam(0xf2b134, { emissive: 0x3a2400 })); knob.position.set(r * 1.45, -0.02, 0.05); piv.add(knob);
      var step = shade(o.tex(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.16, 16, 1, false, 0, Math.PI), lam(0x9a9286)), 'stone', 2, 1), true, true); step.rotation.y = -Math.PI / 2; step.position.set(0, 0.06, 0.02); outside.add(step);
      var lant = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd36a })); lant.position.set(r + 0.28, r * 2 + 0.02, 0.12); outside.add(lant); H.lantern = lant;
      var hook = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 4), lam(0x3a2a1a)); hook.position.set(r + 0.28, r * 2 + 0.2, 0.12); outside.add(hook);
      var plate = board(THREE, '\u{1F423}', 0.36, 0.26, { size: 120, bg: '#7a5432' }); plate.position.set(0, r * 2 + 0.3, 0.04); outside.add(plate);
      outside.position.set(D.x, D.y, D.z); outside.rotation.y = D.yaw; scene.add(outside);
    })();
    function state() { var Lt = L(), c = Lt.S.chick; c.haven781 = c.haven781 || { visits: 0, met: false, owned: {}, toys: [], spent: 0 }; var h = c.haven781; h.owned = h.owned || {}; h.toys = h.toys || []; return h; }
    function toW(x, z) { return { x: C.x + x, z: C.z + z }; }
    function loc(p) { return { x: p.x - C.x, z: p.z - C.z }; }
    function ground(x, z) { if (!H.in) return null; var dx = x - C.x, dz = z - C.z; return dx * dx + dz * dz < (K.FLOOR_R + 40) * (K.FLOOR_R + 40) ? K.Y : null; }
    function clampIn(p) {   /* the wall, the pond, the stall and the shelter hold her (a circle each) */
      var l = loc(p), d = Math.hypot(l.x, l.z), R = K.R; if (d > R) { l.x *= R / d; l.z *= R / d; }
      var push = function (cx, cz, r) { var dx = l.x - cx, dz = l.z - cz, q = Math.hypot(dx, dz); if (q < r && q > 1e-4) { l.x = cx + dx / q * r; l.z = cz + dz / q * r; } };
      push(P.pond[0], P.pond[1], P.pond[2] + 0.35); push(P.market[0], P.market[1], 2.1); push(P.school[0], P.school[1], 1.75); push(P.post[0], P.post[1], 0.35); push(P.shelf[0], P.shelf[1], 1.25);
      p.x = C.x + l.x; p.z = C.z + l.z;
    }
    /* THE BUTTON: what the game's own action button says here */
    function nearOf(S) {
      if (!S || S.mode !== 'walk' || S.talking) return null;
      if (!H.in) { var D = o.door; if (D && !S.inside && Math.hypot(S.pos.x - D.fx, S.pos.z - D.fz) < K.NEAR && Math.abs(S.pos.y - D.y) < 3) return 'door'; return null; }
      var l = loc(S.pos);
      if (Math.hypot(l.x - P.door[0], l.z - P.door[1]) < 3.4) return 'home';
      var cw = (function () { var f = Math.atan2(-P.market[0], -P.market[1]); return [P.market[0] + Math.sin(f) * 1.6, P.market[1] + Math.cos(f) * 1.6]; })();
      if (Math.hypot(l.x - cw[0], l.z - cw[1]) < 2.6) return 'market';
      if (Math.hypot(l.x - P.school[0], l.z - P.school[1]) < 3.2) return 'school';
      if (Math.hypot(l.x - P.ring[0], l.z - P.ring[1]) < P.ring[2] + 1.6) return 'ring';
      if (o.race && Math.hypot(l.x - P.race[0], l.z - P.race[1]) < 2.0) return 'race';   /* 782 #129 */
      if (Math.hypot(l.x - P.post[0], l.z - P.post[1]) < 1.8) return 'post';
      return null;
    }
    var LABEL = { door: '\u{1F423} Chick Haven', home: '\u{1F3E0} Home', market: '\u{1F6D2} Market', school: o.school ? '\u{1F3EB} School' : '\u{1F4DC} Read', ring: o.school ? '\u{1F343} Ring' : '\u{1F4DC} Read', post: '\u{1F4DC} Read', race: '\u{1F3C1} Race' };   /* 782 #132: the School and the Ring open */
    function button(el) {
      var Lt = L(), S = Lt.S; if (!ok || (o.classic && o.classic())) return false; var n = nearOf(S); H.near = n;
      if (!n) return false; var lab = LABEL[n]; if (el.textContent !== lab) el.textContent = lab; if (el.hidden) el.hidden = false; return true;
    }
    function press() {
      var Lt = L(), S = Lt.S; if (!ok || !H.near || (o.cine && o.cine.on()) || H.panel) return false; var n = H.near;
      if (n === 'door') { enter(); return true; }
      if (n === 'home') { leave(); return true; }
      if (n === 'market') { openMarket(); return true; }
      if (n === 'school') { if (o.school && o.school('school')) return true; Lt.toast(LINES.school, 4200); return true; }   /* 782 #132: school782.js */
      if (n === 'ring') { if (o.school && o.school('ring')) return true; Lt.toast(LINES.ring, 4200); return true; }
      if (n === 'post') { Lt.toast(LINES.post, 3800); return true; }
      if (n === 'race') { if (o.race) o.race(); return true; }   /* 782 #129: out to the start line, her chick with her */
      return false;
    }
    /* IN: the door scene, then the arrival */
    var tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3();
    function enter() {
      var Lt = L(), S = Lt.S, D = o.door, cine = o.cine;
      if (!S.nestDone || !Lt.chick()) { Lt.toast(LINES.shut, 3600); return false; }
      if (!cine) return false;
      var from = { x: S.pos.x, z: S.pos.z }, to = { x: D.fx - Math.sin(D.yaw) * 0.55, z: D.fz - Math.cos(D.yaw) * 0.55 }, yaw0 = S.yaw, want = Math.atan2(D.x - S.pos.x, D.z - S.pos.z), moved = false;
      var side = 1;
      try { if (Lt.sound) Lt.sound('door'); } catch (e) { /* fine */ }
      return cine.play({ name: 'havenDoor', dur: 3.1, skip: false, freeze: true,
        tick: function (t) {
          H.open = sm((t - 0.35) / 0.8); if (H.pivot) H.pivot.rotation.y = -1.9 * H.open; if (H.glow) H.glow.material.color.setHSL(0.1, 0.95, 0.5 + 0.16 * H.open);
          var w = sm((t - 0.9) / 1.0); if (!moved) { S.pos.x = from.x + (to.x - from.x) * w; S.pos.z = from.z + (to.z - from.z) * w; S.yaw = yaw0 + Math.atan2(Math.sin(want - yaw0), Math.cos(want - yaw0)) * sm(t / 0.6); S.camYaw = S.yaw; }
          if (cine.fade) cine.fade(sm((t - 1.65) / 0.55));
          if (!moved && t >= 2.3) { moved = true; arriveInside(); }
        },
        shot: function (t, u, Pp, Lk) {   /* behind her and well to the side, the round door clear of her; a slow push in as she goes to it */
          var b = D.yaw, k = sm(u); Pp.set(D.fx + Math.sin(b) * (5.6 - 1.6 * k) + Math.cos(b) * 2.3 * side, D.y + 1.45 - 0.35 * k, D.fz + Math.cos(b) * (5.6 - 1.6 * k) - Math.sin(b) * 2.3 * side);
          Lk.set(D.x + Math.sin(b) * 0.6, D.y + 0.75, D.z + Math.cos(b) * 0.6); return 46; },
        end: function () { if (!moved) { moved = true; arriveInside(); } if (H.pivot) H.pivot.rotation.y = 0; H.open = 0; arrival(); }
      });
    }
    function arriveInside() {
      var Lt = L(), S = Lt.S, hv = state(), chick = Lt.chick();
      H.in = true; root.visible = true; H.enters++; document.documentElement.classList.add('haven781'); hv.visits = (hv.visits || 0) + 1; H.first = hv.visits === 1;
      var a = toW(P.arrive[0], P.arrive[1]); S.mode = 'walk'; S.inside = null; S.insideTH = null; S.pos.set(a.x, K.Y + Lt.standOf(), a.z); S.yaw = Math.PI; S.camYaw = S.yaw; S.camCut = true; S.speed = 0; S.vy = 0; S.hopY = 0;
      H.follow = !!(Lt.FOLLOW && Lt.FOLLOW.with); if (Lt.FOLLOW) { Lt.FOLLOW.with = false; if (Lt.FOLLOW.ring) Lt.FOLLOW.ring.length = 0; Lt.FOLLOW.last = null; }
      if (chick && !(o.chickAway && o.chickAway())) { var c = toW(P.chick[0], P.chick[1]); chick.position.set(c.x, K.Y + 0.3, c.z); var U = chick.userData; U.home = chick.position.clone(); U.where = 'haven'; U.pendWord = null; U.life = null; }   /* 782 #132: a chick at school stays on its stool */
      placeToys(); placeKept(); play.t = 5; H.playMood = false; Lt.save(); Lt.hud();
    }
    function arrival() {
      var Lt = L(), S = Lt.S, cine = o.cine, chick = o.chickAway && o.chickAway() ? null : Lt.chick(), first = !!H.first,   /* 782 #132: at school it does not run to her */ dur = first ? 6.4 : 3.6, runAt = first ? 2.9 : 0.5, said = false, met = false, hopY = 0, cyaw = 0;
      var c0 = chick ? chick.position.clone() : null, her = S.pos.clone(), stop = new THREE.Vector3(), runS = chick ? Math.min(8, 4.6 + ((S.chick.stats || {}).run || 0) / 25) : 0;   /* its Run sets the pace */
      if (c0) { var dx = her.x - c0.x, dz = her.z - c0.z, d = Math.hypot(dx, dz); stop.set(her.x - dx / d * 0.75, c0.y, her.z - dz / d * 0.75); cyaw = Math.atan2(dx, dz); }
      var runT = c0 ? c0.distanceTo(stop) / runS : 0, arriveT = runAt + runT;
      return cine.play({ name: 'havenArrive', dur: Math.max(dur, arriveT + 1.6), skip: 1.5, freeze: true,
        start: function () { if (cine.fade) cine.fade(1); },
        tick: function (t) {
          if (cine.fade) cine.fade(1 - sm((t - 0.05) / 0.8));
          if (!said && t >= (first ? 1.1 : 0.5)) { said = true; try { o.title(first ? 'Welcome to' : '', 'Chick Haven', first ? 'Market · School · Ring' : '', 'haven'); } catch (e) { /* fine */ } }
          if (chick && c0) { var u = Math.min(1, Math.max(0, (t - runAt) / Math.max(0.01, runT))); chick.position.lerpVectors(c0, stop, u); hopY = u > 0 && u < 1 ? Math.abs(Math.sin((t - runAt) * 11)) * 0.18 : (t > arriveT && t < arriveT + 0.6 ? Math.abs(Math.sin((t - arriveT) * 10)) * 0.22 : 0);
            if (!met && u >= 1) { met = true; try { Lt.chirp(); Lt.burstHearts(chick.position); var b = Lt.bond('haven781'); if (b) Lt.toast('Your chick is so happy to see you! Bond +' + b, 2600); } catch (e) { /* fine */ } } }
        },
        pose: function (on) { if (!chick) return; if (on) { H.cy = chick.position.y; H.cr = chick.rotation.y; chick.position.y += hopY; chick.rotation.y = cyaw; } else { chick.position.y = H.cy; chick.rotation.y = H.cr; } },
        shot: function (t, u, Pp, Lk) {   /* three shots, cut (the newer game's grammar): the garden from over the far wall, the run toward her, the two of them */
          var hx = her.x, hz = her.z, hy = her.y, cx = C.x, cz = C.z, cp = chick ? chick.position : her;
          if (first && t < runAt) { var k = sm(t / runAt); Pp.set(cx - 9 + 3.5 * k, K.Y + 8.5 - 1.8 * k, cz - 11.5 - 1.2 * k); Lk.set(cx + 0.5 + 0.8 * k, K.Y + 0.4, cz + 3); return 54; }   /* over the far wall: the lawn, the stall, the pond, the way she came */
          if (t < arriveT + 0.15) { var k3 = sm((t - runAt) / Math.max(0.5, arriveT - runAt)); Pp.set(hx - 2.8 + 0.6 * k3, hy + 0.75, hz - 3.4 + 0.8 * k3); Lk.set(cp.x + (hx - cp.x) * 0.3, hy + 0.25, cp.z + (hz - cp.z) * 0.3); return 50; }   /* low in front of her: the chick runs at us, she waits on the right */
          var mx = (hx + cp.x) / 2, mz = (hz + cp.z) / 2, dx = hx - cp.x, dz = hz - cp.z, d = Math.hypot(dx, dz) || 1, k4 = sm((t - arriveT) / 1.8);   /* the two of them, from the side, low, a slow push */
          Pp.set(mx - dz / d * (2.6 - 0.5 * k4), hy + 0.4, mz + dx / d * (2.6 - 0.5 * k4)); Lk.set(mx, hy + 0.2, mz); return 44;
        },
        end: function (how) {
          if (how === 'tap' && o.titleHide) try { o.titleHide(); } catch (e) { /* fine */ }   /* a skipped arrival takes its name card with it */
          if (chick) { chick.position.copy(stop); var U = chick.userData; U.home = stop.clone(); U.life = null; S.chickHop = 1; }
          if (chick && !met) { met = true; try { Lt.chirp(); Lt.burstHearts(chick.position); var b2 = Lt.bond('haven781'); if (b2) Lt.toast('Your chick is so happy to see you! Bond +' + b2, 2600); } catch (e) { /* fine */ } }
          if (!state().met && o.cine) { /* the first meeting with Thimble is at the Market */ }
          Lt.save();
        }
      });
    }
    /* OUT: the dark, then home at the nest tree's door */
    function leave(to) {   /* to (782 #129, optional): { x, z, yaw, title, then } somewhere else on the island (the Race's start line), not the door */
      var Lt = L(), S = Lt.S, cine = o.cine, D = o.door, chick = Lt.chick(), done = false;
      closeMarket();
      var out = function () {
        if (done) return; done = true; H.in = false; root.visible = false; H.leaves++; document.documentElement.classList.remove('haven781');
        S.mode = 'walk'; S.pos.set(D.fx + Math.sin(D.yaw) * 1.4, D.y + Lt.standOf(), D.fz + Math.cos(D.yaw) * 1.4); S.yaw = D.yaw; S.camYaw = S.yaw; S.camCut = true; S.speed = 0; S.vy = 0;
        if (to && Lt.ground) { S.pos.set(to.x, Lt.ground(to.x, to.z) + Lt.standOf(), to.z); S.yaw = to.yaw; S.camYaw = S.yaw; }   /* 782 #129: out at the Race's line */
        if (chick && !(o.chickAway && o.chickAway())) { var U = chick.userData, h = Lt.chickSpot(); U.where = 'home'; U.life = null; if (H.follow && Lt.FOLLOW) { Lt.FOLLOW.with = true; chick.position.set(S.pos.x + Math.sin(D.yaw + 2) * 0.9, D.y + 0.3, S.pos.z + Math.cos(D.yaw + 2) * 0.9); U.home = h; } else { chick.position.copy(h); U.home = h.clone(); } }
        Lt.save(); Lt.hud();
      };
      if (!cine) { out(); return true; }
      return cine.play({ name: 'havenLeave', dur: 2.0, skip: false, freeze: true, bars: true,
        tick: function (t) { if (cine.fade) cine.fade(t < 0.75 ? sm(t / 0.7) : 1 - sm((t - 0.95) / 0.9)); if (t >= 0.78 && !done) { out(); var sc = cine.current && cine.current(); if (sc) sc.freeze = false; } },
        end: function () { out(); if (cine.fade) cine.fade(0); if (o.title && !to) try { o.title('', 'Home', '', 'land'); } catch (e) { /* fine */ } if (to && to.then) try { to.then(); } catch (e) { API.error = 'leave: ' + (e && e.message); } }
      });
    }
    /* THE MARKET'S PANEL */
    function css() {
      if (document.getElementById('market781css')) return; var s = document.createElement('style'); s.id = 'market781css';
      s.textContent = '#market781{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);transform:translateX(-50%);width:min(440px,calc(100vw - 24px));height:min(68vh,600px);box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;z-index:44;background:#fff8ea;color:#3b2a1a;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.35);padding:14px 14px 10px;font-family:var(--body,system-ui)}' +
        '#market781 h3{margin:0 0 2px;font:600 22px Georgia,serif;display:flex;justify-content:space-between;align-items:center}#market781 h3 span{font:800 16px var(--body,system-ui);color:#8a5a12}' +
        '#market781 .who{font:italic 13px Georgia,serif;color:#7a5a3a;margin-bottom:4px}#market781 .earn{font:700 12px var(--body,system-ui);color:#6b4a14;background:#fbeccb;border-radius:10px;padding:5px 8px;margin-bottom:8px}#market781 .tabs{display:flex;gap:6px;margin:0 0 10px}#market781 .tabs button{flex:1;min-height:40px;border-radius:12px;border:2px solid rgba(60,40,20,.18);background:#fff8ea;font:800 13px var(--body,system-ui);color:#3b2a1a}#market781 .tabs button.on{background:#f2b134;border-color:#c98a12}' +
        '#market781 > *{flex:none}#market781 .rows{flex:1 1 auto;min-height:0;overflow:auto}' +   /* 782 (9): the tabs hold still under the thumb (the panel shrank with fewer rows) */
        '#market781 .row{display:flex;align-items:center;gap:10px;padding:8px 4px;border-top:1px solid rgba(60,40,20,.1)}#market781 .row .e{font-size:30px;width:40px;text-align:center}#market781 .row .t{flex:1;min-width:0}#market781 .row b{display:block;font:700 15px var(--body,system-ui)}#market781 .row small{display:block;font:600 12px var(--body,system-ui);color:#7a5a3a}' +
        '#market781 .row button{min-width:84px;min-height:44px;border-radius:14px;border:0;background:#3f8f5a;color:#fff;font:800 14px var(--body,system-ui)}#market781 .row button[disabled]{background:#cbbfa8;color:#fff8ea}#market781 .close{display:block;width:100%;margin-top:8px;min-height:44px;border-radius:14px;border:2px solid rgba(60,40,20,.2);background:#fff;font:800 14px var(--body,system-ui);color:#3b2a1a}';
      document.head.appendChild(s);
    }
    (function () { var s = document.createElement('style'); s.textContent = 'html.haven781 #flap{display:none!important}'; document.head.appendChild(s); })();   /* no flying in the Haven */
    function wares(tab) {
      var hv = state();
      if (tab === 'wear') return (window.WFR_WEAR ? WFR_WEAR.WEAR.filter(function (w) { return w.shop; }) : []).map(function (w) { return { kind: 'wear', id: w.id, emoji: w.emoji, name: w.name, what: 'For your chick to wear (Dress)', price: PRICES.wear, owned: !!hv.owned[w.id] }; });
      if (tab === 'toys') return TOYS.map(function (t) { return { kind: 'toy', id: t.id, emoji: t.emoji, name: t.name, what: 'Stays in the Haven. Your chick plays: mood up, bond up', price: PRICES.toy, owned: hv.toys.indexOf(t.id) >= 0 }; });
      if (tab === 'fruit') return FRUIT.map(function (f) { return { kind: 'fruit', id: f.id, emoji: f.emoji, name: f.name, what: f.word + ' +16 (four tree fruits’ worth)', price: PRICES.fruit, owned: false }; });
      return [{ kind: 'egg', id: 'egg', emoji: '\u{1F95A}', name: 'an egg', what: 'A second chick. Coming soon.', price: null, owned: false }];
    }
    function draw() {
      var el = H.panel; if (!el) return; var S = L().S, n = S.coins || 0, hv = state();
      var h = '<h3>Market<span>\u{1FA99} ' + n + '</span></h3><div class="who">Thimble, keeper of the Market</div><div class="earn">' + LINES.earn + '</div><div class="tabs">' + [['wear', 'Wear'], ['toys', 'Toys'], ['fruit', 'Fruit'], ['eggs', 'Eggs']].map(function (q) { return '<button type="button" data-tab="' + q[0] + '" class="' + (H.tab === q[0] ? 'on' : '') + '">' + q[1] + '</button>'; }).join('') + '</div>';
      h += '<div class="rows">';   /* 782 (9) */
      wares(H.tab).forEach(function (w) { var can = w.price != null && !w.owned && n >= w.price, lab = w.price == null ? 'Soon' : w.owned ? 'Yours' : '\u{1FA99} ' + w.price;
        h += '<div class="row"><div class="e">' + w.emoji + '</div><div class="t"><b>' + w.name.replace(/^./, function (c) { return c.toUpperCase(); }) + '</b><small>' + w.what + '</small></div><button type="button" data-buy="' + w.kind + ':' + w.id + '"' + (can ? '' : ' disabled') + '>' + lab + '</button></div>'; });
      h += '</div><button type="button" class="close" data-close="1">Close</button>'; el.innerHTML = h;
    }
    function openMarket() {
      var Lt = L(), S = Lt.S, hv = state(); css(); if (H.panel) return;
      var el = document.createElement('div'); el.id = 'market781'; document.body.appendChild(el); H.panel = el; S.talking = true; H.opens = (H.opens || 0) + 1;
      el.addEventListener('pointerdown', function (e) { e.stopPropagation(); }, true);
      el.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.close) { closeMarket(); return; } if (b.dataset.tab) { H.tab = b.dataset.tab; draw(); return; } if (b.dataset.buy) buy(b.dataset.buy); });
      draw();
      if (!hv.met) { hv.met = true; Lt.save(); var card = false; try { if (o.cine) card = o.cine.nameCard('Thimble', 'keeper of the Market', 4200); } catch (e) { /* fine */ } setTimeout(function () { if (H.panel || H.in) Lt.toast(LINES.hello, 6400); }, card ? 5000 : 0); }   /* 782 (4): his name first, then his long hello (they sat on each other) */
    }
    function closeMarket() { if (!H.panel) return; H.panel.remove(); H.panel = null; var S = L().S; S.talking = false; }
    function buy(key) {
      var Lt = L(), S = Lt.S, hv = state(), kind = key.split(':')[0], id = key.split(':')[1], n = S.coins || 0, p = kind === 'wear' ? PRICES.wear : kind === 'toy' ? PRICES.toy : PRICES.fruit;
      if (n < p) { Lt.toast(LINES.poor(p, n), 3200); return false; }
      if (kind === 'fruit') { if (S.fruit) { Lt.toast(LINES.full, 2600); return false; } var f = FRUIT.find(function (q) { return q.id === id; }); if (!f) return false; Lt.giveBeak(fruitType(f)); }
      else if (kind === 'wear') { if (hv.owned[id]) return false; hv.owned[id] = true; }
      else if (kind === 'toy') { if (hv.toys.indexOf(id) >= 0) return false; hv.toys.push(id); placeToys(); S.chick.happy = Math.min(100, (S.chick.happy || 0) + 20); try { Lt.bond('toy781'); } catch (e) { /* fine */ } }
      S.coins = n - p; hv.spent = (hv.spent || 0) + p; H.bought = (H.bought || 0) + 1; Lt.save(); Lt.hud(); draw();
      try { if (Lt.sound) Lt.sound('buy'); } catch (e) { /* fine */ }
      var it = wares(kind === 'toy' ? 'toys' : kind).find(function (w) { return w.id === id; });
      if (it) { closeMarket(); if (o.cine) o.cine.itemGet({ back: true, emoji: it.emoji, name: it.name, over: 'You bought', line: kind === 'wear' ? 'Dress your chick in it from its card.' : kind === 'toy' ? 'It is in the Haven now. Your chick loves it.' : 'Give it to your chick: ' + it.what + '.', hide: kind === 'fruit' && S.fruit ? [S.fruit.g] : [] }); }
      return true;
    }
    function fruitType(f) { return { id: f.id, emoji: f.emoji, name: f.name, stat: f.stat, gives: (function () { var g = {}; g[f.stat] = 16; return g; })(), happy: 4, food: 30, market781: true }; }
    function find(id) { var f = FRUIT.find(function (q) { return q.id === id; }); return f ? fruitType(f) : null; }
    /* EACH FRAME: the door's leaf at rest, the lantern's flicker, the Haven's clamp and the camera inside the wall, the pinwheel, the keeper's breathing */
    function tick(dt, real) {
      var Lt = L(), S = Lt.S, t = S.t || 0;
      if (H.lantern) H.lantern.material.color.setHSL(0.12, 1, 0.6 + 0.06 * Math.sin(t * 7) + 0.03 * Math.sin(t * 13));
      if (!H.in) return;
      if (S.mode === 'fly') { S.mode = 'walk'; S.speed = 0; }   /* a garden for little ones: walk and hop (the Flap button is hidden here; this is the net under it) */
      if (S.mode === 'walk' || S.mode === 'landing') clampIn(S.pos);
      if (S.mode !== 'walk' && S.mode !== 'fly' && S.mode !== 'landing' && S.mode !== 'menu' && S.mode !== 'paused') { /* never swim or ride here */ S.mode = 'walk'; }
      var chick = Lt.chick(); if (chick && !(o.cine && o.cine.on())) { var cp = { x: chick.position.x, z: chick.position.z }; clampIn(cp); chick.position.x = cp.x; chick.position.z = cp.z; if (chick.position.y < K.Y - 1 || chick.position.y > K.Y + 6) chick.position.y = K.Y + 0.3; }
      var sp = toyG.pinwheel && toyG.pinwheel.userData.spin; if (sp) sp.rotation.z += dt * 3;
      if (H.hog) { H.hog.g.scale.y = 1.55 * (1 + 0.025 * Math.sin(t * 2)); H.hog.g.rotation.y = 0.35 * Math.sin(t * 0.4); if (H.apron) H.apron.rotation.y = H.hog.g.rotation.y; }
      if (toyG.ball) toyG.ball.children[0].position.y = 0.32 + Math.abs(Math.sin(t * 2.2)) * 0.12;
      if (!(o.cine && o.cine.on()) && !(o.chickAway && o.chickAway())) playTick(dt, Lt, S); else if (play.cur) { home(play.cur.k); play.cur = null; play.t = 6; }
      var hv = state(); if (hv.toys.length && S.chick) S.chick.happy = Math.min(100, (S.chick.happy || 0) + dt * 0.05 * hv.toys.length);   /* toys: the chick plays while she is here */
    }
    function camClamp(cam) {   /* after the game has placed its camera: inside the wall, above the lawn */
      if (!H.in || !cam) return; var l = { x: cam.position.x - C.x, z: cam.position.z - C.z }, d = Math.hypot(l.x, l.z), R = K.WALL_R - 0.8;
      if (d > R) { cam.position.x = C.x + l.x * R / d; cam.position.z = C.z + l.z * R / d; cam.position.y = Math.max(cam.position.y, K.Y + 2.2); }
      if (cam.position.y < K.Y + 0.6) cam.position.y = K.Y + 0.6;
    }
    API.inst = { root: root, door: outside, ground: ground, button: button, press: press, tick: tick, camClamp: camClamp, enter: enter, leave: leave, openMarket: openMarket, closeMarket: closeMarket, buy: buy, find: find,
      playNow: function () { placeKept(); if (!play.cur) play.t = 0; return Object.keys(kept); }, kept: function () { return Object.keys(kept).map(function (id) { return { id: id, slot: kept[id].i, playing: !!(play.cur && play.cur.k.id === id), world: (function () { var v = new THREE.Vector3(); kept[id].sp.getWorldPosition(v); return v.toArray(); })() }; }); },
      on: function () { return H.in; }, y: K.Y, center: C, K: K, P: P, PRICES: PRICES, LINES: LINES, toW: toW, near: function () { return H.near; },
      peek: function () { var hv = (function () { try { return state(); } catch (e) { return null; } })(); return { ok: ok, in: H.in, near: H.near, enters: H.enters, leaves: H.leaves, visits: hv && hv.visits, met: hv && hv.met, owned: hv && Object.keys(hv.owned || {}), toys: hv && hv.toys.slice(), spent: hv && hv.spent, kept: Object.keys(kept), plays: H.plays || 0, playing: play.cur ? play.cur.k.id : null, panel: !!H.panel, tab: H.tab, bought: H.bought || 0, trees: H.trees, rootVisible: root.visible, door: o.door, error: API.error }; } };
    return API.inst;
  }
  API.create = create; API.K = K; API.P = P; API.PRICES = PRICES; API.FRUIT = FRUIT; API.TOYS = TOYS; API.LINES = LINES;
  return API;
})();
