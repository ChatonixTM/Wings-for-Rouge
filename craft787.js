/* craft787.js - BOARD 787, OCARINA'S PROGRESSION: WHAT ANIMALS LEAVE, CRAFTED INTO GEAR, AND THE FIRST PUZZLE (Wings for Rouge). Nov 13 2026.
   Marth, Nov 13 2026, verbatim: "Been grinding ocarina of time and I forgot how much it implemented puzzles and ruupes to get items to progress. Or
   defeating enemies and use what they drop. Like we could use the boas on the home island (the snake types should be available in other regions too)
   perhaps be able to use 5 snake skins to make a water proof cloak" / "Like maybe make you dive further. And another item that allows you to attack
   underwater or something. Stuff like that. Each aspect of the game ties into something that can use other places".

   WHAT IS HERE (the page wires it: tools/wiring/wire-787-craft.js; guard tests/craft787.js).
   DROPS      a beaten animal (fall748's fade: no gore, it turns white and is gone) leaves what animals really shed: a boa its old skin, a crab its
              moulted shell, a gull or pelican a long feather, a barracuda a silver scale, a shark a tooth (sharks lose teeth all their lives).
              Out in the world the same, by kind: the snakes of every region their skins, the birds feathers, the sharks teeth, the fish scales.
              It floats to her and goes in her bag, with one plain line of what it is for.
   CRAFTING   the pouch's Crafting row opens the Craft panel (on her feet). Three recipes, each a key to somewhere else (the Zelda shape):
                Waterproof cloak  5 snake skins + 20 coins        her feathers stay dry: down into the Blue Hole's deep, and half again as long
                                                                 under water, at home and out in the world
                Shell spur        3 crab shells + 2 feathers + 15 runes   she can peck and sweep under water: barracuda and sharks (who bite her
                                                                 there) can be driven off and drop scales and teeth, and the sea floor's bells ring
                Scale fins        4 scales + 1 shark tooth + the Deep Pearl + 30 coins   she swims a third faster, everywhere
   THE BLUE HOLE (the first puzzle, Ocarina-style) a round deep hole in the reef shelf off the home island's south-west shore (bearing 145 deg, by
              the reef). Without the cloak the cold, heavy water pushes her back up at its mouth. Three stone bells sit on the sea floor round it,
              small, middle and big; the Bell Stone on the shore shows their order (big, small, middle). Rung in that order (the spur: only a beak
              that can strike under water rings them) the chest at the bottom opens and a light rises up the hole; with the cloak she dives
              down to it: coins, runes, XP and the Deep Pearl (the fins' last part). A wrong bell hums out of tune and the order starts again.
   Standard only (Classic is frozen: nothing here is built, dropped, said or dug). Everything a DRAFT for his pen and her thumb. */
window.WFR_CRAFT787 = (function () {
  'use strict';
  var CLASSIC = (function () { try { return localStorage.getItem('wfr.look') === 'classic'; } catch (e) { return false; } })();
  var TAU = Math.PI * 2;
  /* THE PLACE: bearing 145 deg from the island's middle, 315 m out (the reef shelf, 4-5 m of water; the reef itself is 85 m away, the sharks' water far
     round the island). R the hole's mouth, LIP the rim that slopes into it, BOT its floor (about 18 m under the surface: the old sea floor is 5 m) */
  var TH = 145 * Math.PI / 180;
  var HOLE = { x: +(Math.cos(TH) * 315).toFixed(2), z: +(Math.sin(TH) * 315).toFixed(2), R: 9, LIP: 0.5, BOT: -17, RIM: 7.5 };   /* RIM: the stone lip laid round it, over the cut in the island's sea floor */
  var DUG = false;   /* the hole is in H only once its pictures are built from the old floor and the island's mesh is cut (create) */
  var STONE = { x: +(Math.cos(TH) * 268).toFixed(2), z: +(Math.sin(TH) * 268).toFixed(2) };   /* the Bell Stone, on the grass above the beach */
  var K = { CAP_IN: 0.5, PUSH: 5, BREATH: 1.5, FINS: 1.35, READ_R: 6, HINT_GAP: 25, TITLE_R: 30, CHEST_R: 2.6, BELL_GAP: 0.5, FLY: 0.9, ORDER: [2, 0, 1] };   /* ORDER: big, small, middle */
  var MATS = {
    snakeskin: { name: 'snake skin', many: 'snake skins', e: '\u{1F40D}' },
    shell: { name: 'crab shell', many: 'crab shells', e: '\u{1F980}' },
    feather: { name: 'long feather', many: 'long feathers', e: '\u{1FAB6}' },
    scale: { name: 'silver scale', many: 'silver scales', e: '\u{1F41F}' },
    tooth: { name: 'shark tooth', many: 'shark teeth', e: '\u{1F988}' },
    pearl: { name: 'Deep Pearl', many: 'Deep Pearls', e: '\u{1F9AA}' }
  };
  /* what each kind leaves, and how often (a boa and a shark always: they are the long fights). The world's kinds by name, then by family below */
  var DROP = { boa: ['snakeskin', 1], crab: ['shell', 0.7], gull: ['feather', 0.6], pelican: ['feather', 0.7], barracuda: ['scale', 1], shark: ['tooth', 1],
    hammerhead: ['tooth', 1], greatwhite: ['tooth', 1], moray: ['scale', 0.6],
    yellowboa: ['snakeskin', 1], rattlesnake: ['snakeskin', 1], gartersnake: ['snakeskin', 1], grasssnake: ['snakeskin', 1], python: ['snakeskin', 1], anaconda: ['snakeskin', 1], carpetpython: ['snakeskin', 1], cobra: ['snakeskin', 1], ratsnake: ['snakeskin', 1] };
  var BIRDS = ['egret', 'eagle', 'stork', 'crane', 'flamingo', 'toucan', 'macaw', 'condor'], FISH = ['reeffish', 'trout', 'poolfish', 'minnow', 'salmon', 'pacsalmon', 'seatrout', 'bass', 'tuna', 'swordfish'];
  function dropOf(k) { if (DROP[k]) return DROP[k]; if (BIRDS.indexOf(k) >= 0) return ['feather', 0.5]; if (FISH.indexOf(k) >= 0) return ['scale', 0.4]; if (/snake|boa|python|viper|adder/.test(String(k))) return ['snakeskin', 1]; return null; }
  var RECIPES = [
    { id: 'cloak', e: '\u{1F9E5}', name: 'Waterproof cloak', need: { snakeskin: 5 }, coins: 20, runes: 0,
      does: 'Shed boa skin, sewn tight: your feathers stay dry. Dive into the Blue Hole’s deep, and stay under half again as long, at home and out in the world.' },
    { id: 'spur', e: '\u{1F41A}', name: 'Shell spur', need: { shell: 3, feather: 2 }, coins: 0, runes: 15,
      does: 'A shell tip for your beak: peck and sweep under water. Drive off barracuda and sharks, and ring what sleeps on the sea floor.' },
    { id: 'fins', e: '\u{1F30A}', name: 'Scale fins', need: { scale: 4, tooth: 1, pearl: 1 }, coins: 30, runes: 0,
      does: 'Silver scales on your wings: swim a third faster, everywhere.' }
  ];
  var WORDS = {   /* DRAFT, his pen */
    first: 'Open your pouch and tap Craft to see what it makes.',
    heavy: 'The water down there is cold and heavy, and your feathers soak through. A waterproof cloak would keep you dry: five shed snake skins (the boas leave them), in your pouch’s Craft.',
    stone: 'The Bell Stone: the BIG bell, then the SMALL one, then the MIDDLE one. Under them, a chest.',
    stoneSpur: 'Only a beak that strikes under water rings them (a shell spur: Craft, in your pouch).',
    sour: 'The bells hum out of tune. Start again from the first.',
    solved: 'the three bells ring as one: far below, something opens',
    solvedDry: 'something opened far below: too deep for wet feathers (a waterproof cloak)',
    shut: 'A stone chest, shut tight. Three bells are carved on its lid.',
    took: 'scale fins need it',
    hurt: 'Ouch! Peck back with your shell spur, or Stroke to dart clear when its mark flashes big.',
    land: 'Land first, then craft.'
  };
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return h >>> 0; }

  /* H's last word (the page's height function calls it on the island only, never out in the world): the Blue Hole in the reef shelf. Pure. */
  function hole(x, z, h) {
    if (CLASSIC || !DUG) return h; var dx = x - HOLE.x, dz = z - HOLE.z, L = HOLE.R + HOLE.LIP; if (dx > L || dx < -L || dz > L || dz < -L) return h;
    var d = Math.sqrt(dx * dx + dz * dz); if (d >= L) return h; if (d <= HOLE.R) return HOLE.BOT; var u = (d - HOLE.R) / HOLE.LIP; u = u * u * (3 - 2 * u); return HOLE.BOT + (h - HOLE.BOT) * u;
  }

  function create(o) {
    if (CLASSIC || !o || !o.THREE) return null;
    var THREE = o.THREE, API = { error: '' };
    function S() { return o.S; }
    function st() { var s = S(); s.seen = s.seen || {}; var c = s.seen.craft787; if (!c || typeof c !== 'object') c = s.seen.craft787 = {}; c.bag = c.bag || {}; c.made = c.made || {}; c.told = c.told || {}; c.n = c.n | 0; c.bells = c.bells | 0; return c; }
    function have(m) { return st().bag[m] | 0; }
    function made(id) { return !!st().made[id]; }
    function home() { try { return !!o.home(); } catch (e) { return false; } }
    var stat = { drops: 0, rolls: 0, crafted: 0, rings: 0, sour: 0, pushes: 0, reads: 0, opened: 0, taken: 0, hints: 0, swims: 0, breathed: 0, wall: 0 };
    var hintAt = {}, quiet = -9, ONCE = { drop: 1 };
    function titled(a, b, c) { quiet = (S().played || 0) + 4.8; try { o.title(a, b, c, 'found'); } catch (e) { /* fine */ } }   /* a title: the hints wait under it (one card, never a wall) */
    function hint(key, text, ms, gap) { var t = S().played || 0; if (!ONCE[key] && t < quiet) return false; if (hintAt[key] != null && t - hintAt[key] < (gap || K.HINT_GAP)) return false; hintAt[key] = t; stat.hints++; stat.lastHint = text; try { o.toast(text, ms || 4200); } catch (e) { /* fine */ } return true; }

    /* ---------------- THE PICTURES (built once, never disposed; the island's own Lambert, one vertex-coloured program) ---------------- */
    var G = new THREE.Group(); G.name = 'craft787'; o.scene.add(G);
    var mat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    var H0 = function (x, z) { return o.H(x, z); };
    function colGeo(geo, fn) { geo = geo.index ? geo.toNonIndexed() : geo; var p = geo.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color(); for (var i = 0; i < p.count; i++) { fn(col, p.getX(i), p.getY(i), p.getZ(i), i); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; } geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); geo.computeVertexNormals(); return geo; }
    function rimY(a, r) { return H0(HOLE.x + Math.cos(a) * r, HOLE.z + Math.sin(a) * r); }   /* the old floor (read before the dig) */
    var NAT = []; for (var na = 0; na < 72; na++) NAT.push(rimY(na / 72 * TAU, HOLE.R + 1));
    function natAt(a) { var u = ((a % TAU) + TAU) % TAU / TAU * 72, i = Math.floor(u) % 72, f = u - Math.floor(u); return NAT[i] + (NAT[(i + 1) % 72] - NAT[i]) * f; }
    var TOP = { at: function (x, z) { return natAt(Math.atan2(z - HOLE.z, x - HOLE.x)) + 0.6; } };
    /* the wall: a ring of rock facing in, from the rim down to the floor, banded (coral at the lip, dark rock below) */
    (function wall() {
      var N = 36, rows = 8, R = HOLE.R + 0.25, pos = [], i, j;
      for (i = 0; i < N; i++) { var a0 = i / N * TAU, a1 = (i + 1) / N * TAU, y0t = natAt(a0) + 0.06, y1t = natAt(a1) + 0.06;
        for (j = 0; j < rows; j++) { var u0 = j / rows, u1 = (j + 1) / rows, w = function (a, yt, u) { var y = yt + (HOLE.BOT - yt) * u, r = R + 0.35 * Math.sin(a * 7 + u * 9) + 0.25 * Math.sin(a * 13 - u * 5); return [HOLE.x + Math.cos(a) * r, y, HOLE.z + Math.sin(a) * r]; };
          var A = w(a0, y0t, u0), B = w(a1, y1t, u0), C = w(a1, y1t, u1), D = w(a0, y0t, u1);
          pos.push.apply(pos, A.concat(C, B, A, D, C)); } }   /* wound to face the middle (seen from inside and from above) */
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      colGeo(g, function (c, x, y, z) { var u = clamp((y - HOLE.BOT) / 14, 0, 1), n = Math.sin(x * 1.7) * Math.cos(z * 1.3); c.setRGB(0.16 + 0.22 * u + 0.04 * n, 0.22 + 0.2 * u + 0.03 * n, 0.26 + 0.12 * u); if (u > 0.86) c.lerp(new THREE.Color(n > 0 ? 0xd98a7a : 0xb98fc4), 0.55); });
      var m = new THREE.Mesh(g, mat); m.name = 'craft787:wall'; m.receiveShadow = true; G.add(m);
    }());
    /* the lip: a flat ring over the slope (the island's mesh is 4.8 m a square: it would show its steps) and the floor of the hole */
    (function lip() {
      var N = 48, M = 4, pos = [], i, j; for (i = 0; i < N; i++) { var a0 = i / N * TAU, a1 = (i + 1) / N * TAU;
        var P = function (a, u) { var r = HOLE.R + 0.15 + (HOLE.RIM - 0.15) * u, x = HOLE.x + Math.cos(a) * r, z = HOLE.z + Math.sin(a) * r; return [x, Math.max(natAt(a), rimY(a, r)) + 0.09 * (1 - u * u) + 0.02, z]; };
        for (j = 0; j < M; j++) { var A = P(a0, j / M), B = P(a1, j / M), C = P(a1, (j + 1) / M), D = P(a0, (j + 1) / M); pos.push.apply(pos, A.concat(B, C, A, C, D)); } }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      colGeo(g, function (c, x, y, z) { var n = Math.sin(x * 2.1 + z * 0.7) * Math.cos(z * 1.9 - x * 0.4), u = clamp((Math.hypot(x - HOLE.x, z - HOLE.z) - HOLE.R) / HOLE.RIM, 0, 1); c.setRGB(0.66 + 0.08 * n, 0.6 + 0.06 * n, 0.52 + 0.05 * n); if (u < 0.45 && n > 0.5) c.setRGB(0.85, 0.48, 0.45); else if (u < 0.45 && n < -0.55) c.setRGB(0.52, 0.44, 0.7); c.lerp(new THREE.Color(0xd8c89c), u * u); });
      var m = new THREE.Mesh(g, mat); m.name = 'craft787:lip'; m.receiveShadow = true; G.add(m);
      var f = colGeo(new THREE.CircleGeometry(HOLE.R + 0.6, 28).rotateX(-Math.PI / 2), function (c, x, y, z) { var n = Math.sin(x * 3.1) * Math.cos(z * 2.7); c.setRGB(0.42 + 0.05 * n, 0.44 + 0.05 * n, 0.4); });
      var fm = new THREE.Mesh(f, mat); fm.position.set(HOLE.x, HOLE.BOT + 0.04, HOLE.z); fm.name = 'craft787:floor'; G.add(fm);
    }());
    /* the coral and stones round the rim: one mesh */
    (function coral() {
      var parts = [], s = 787, rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; }, i, COL = [0xe0745f, 0xf2a65a, 0xb56ccf, 0xe86f9a, 0x7fbf8f, 0x8a8676];
      for (i = 0; i < 34; i++) { var a = rnd() * TAU, r = HOLE.R + 0.5 + rnd() * 2.8, x = HOLE.x + Math.cos(a) * r, z = HOLE.z + Math.sin(a) * r, sc = 0.25 + rnd() * 0.55, tall = rnd() < 0.5;
        var g = tall ? new THREE.ConeGeometry(sc * 0.5, sc * 2.2, 5) : new THREE.IcosahedronGeometry(sc, 0); if (g.index) g = g.toNonIndexed(); g.translate(0, tall ? sc * 1.1 : sc * 0.5, 0); g.rotateY(rnd() * TAU);
        var y = Math.max(natAt(a), rimY(a, r)) + 0.08, cc = new THREE.Color(COL[(rnd() * COL.length) | 0]);
        g.translate(x, y, z); colGeo(g, function (c) { c.copy(cc); }); parts.push(g); }
      var n = 0; parts.forEach(function (g) { n += g.attributes.position.count; }); var P = new Float32Array(n * 3), C = new Float32Array(n * 3), k = 0;
      parts.forEach(function (g) { P.set(g.attributes.position.array, k * 3); C.set(g.attributes.color.array, k * 3); k += g.attributes.position.count; });
      var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3)); geo.computeVertexNormals();
      var m = new THREE.Mesh(geo, mat); m.name = 'craft787:coral'; G.add(m);
    }());
    /* the three bells: stone, mossy, a coral cap; small, middle and big, on the floor round the rim */
    var BELLS = [];
    (function bells() {
      var size = [0.5, 0.72, 1.0], ang = [TH + Math.PI * 0.5, TH + Math.PI * 1.17, TH + Math.PI * 1.83], prof = [];
      for (var q = 0; q <= 10; q++) { var u = q / 10; prof.push(new THREE.Vector2(0.18 + 0.82 * Math.pow(1 - u, 1.7) * (1 - 0.15 * Math.sin(u * 3.1)) + (u < 0.08 ? 0.08 : 0), u * 1.25)); }
      prof.push(new THREE.Vector2(0.001, 1.25));
      for (var i = 0; i < 3; i++) { var g = colGeo(new THREE.LatheGeometry(prof, 14), function (c, x, y) { c.setRGB(0.5 + 0.08 * Math.sin(y * 9), 0.56 + 0.06 * Math.sin(x * 11), 0.48); if (y < 0.12) c.setRGB(0.36, 0.42, 0.34); });
        var m = new THREE.Mesh(g, mat), r = HOLE.R + HOLE.RIM + 1.2, x = HOLE.x + Math.cos(ang[i]) * r, z = HOLE.z + Math.sin(ang[i]) * r, y = H0(x, z);
        var knob = new THREE.Mesh(colGeo(new THREE.SphereGeometry(0.16, 8, 6), function (c) { c.setRGB(0.93, 0.55, 0.42); }), mat); knob.position.y = 1.3; m.add(knob);
        m.scale.setScalar(size[i]); m.position.set(x, y, z); m.name = 'craft787:bell' + i; G.add(m);
        var ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0, depthWrite: false })); ring.position.set(x, y + size[i] * 0.6, z); ring.visible = false; ring.name = 'craft787:ring' + i; G.add(ring);
        BELLS.push({ i: i, m: m, ring: ring, x: x, y: y, z: z, s: size[i], t: 9, last: -9 }); }
    }());
    /* the chest at the bottom, its lid, the light that rises when it opens */
    var CH = {};
    (function chest() {
      var cx = HOLE.x + 2, cz = HOLE.z - 1.2, cy = HOLE.BOT, box = function (w, h, d, col) { return colGeo(new THREE.BoxGeometry(w, h, d), function (c, x, y, z) { c.set(col); c.offsetHSL(0, 0, 0.03 * Math.sin(x * 9 + z * 7)); }); };
      var base = new THREE.Mesh(box(1.6, 0.8, 1.0, 0x6b5a46), mat); base.position.set(cx, cy + 0.4, cz); base.rotation.y = 0.4; base.name = 'craft787:chest'; G.add(base);
      var pivot = new THREE.Group(); pivot.position.set(0, 0.4, -0.5); base.add(pivot);
      var lid = new THREE.Mesh(box(1.7, 0.32, 1.08, 0x5d6a5e), mat); lid.position.set(0, 0.16, 0.5); pivot.add(lid);
      for (var b = 0; b < 3; b++) { var bm = new THREE.Mesh(colGeo(new THREE.ConeGeometry([0.13, 0.1, 0.16][b], 0.22, 8), function (c) { c.setRGB(0.86, 0.78, 0.5); }), mat); bm.position.set(-0.45 + b * 0.45, 0.24, 0.5); lid.add(bm); }
      var glow = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.6, WATERY() - HOLE.BOT, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      glow.position.set(cx, (HOLE.BOT + WATERY()) / 2, cz); glow.visible = false; glow.name = 'craft787:light'; G.add(glow);
      CH.x = cx; CH.y = cy + 0.6; CH.z = cz; CH.base = base; CH.pivot = pivot; CH.glow = glow; CH.open = 0;
    }());
    (function deep() {   /* from the air: the dark round of deep water a blue hole is (on the surface, facing up only: from below it is not there) */
      var cv = document.createElement('canvas'); cv.width = cv.height = 64; var g = cv.getContext('2d'), r = g.createRadialGradient(32, 32, 4, 32, 32, 32);
      r.addColorStop(0, 'rgba(8,30,70,1)'); r.addColorStop(0.62, 'rgba(10,38,84,0.95)'); r.addColorStop(0.86, 'rgba(14,60,110,0.45)'); r.addColorStop(1, 'rgba(20,90,140,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
      var m = new THREE.Mesh(new THREE.PlaneGeometry(2 * (HOLE.R + 2.6), 2 * (HOLE.R + 2.6)).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.5, depthWrite: false }));
      m.position.set(HOLE.x, WATERY() + 0.03, HOLE.z); m.renderOrder = 1; m.name = 'craft787:deep'; G.add(m); CH.deep = m;
    }());
    function WATERY() { return o.water != null ? o.water : 1.2; }
    /* the Bell Stone on the shore: a slab, its face painted with the order (three bells, big, small, middle, numbered) */
    var STN = {};
    (function stone() {
      var cv = document.createElement('canvas'); cv.width = 256; cv.height = 160; var g = cv.getContext('2d');
      g.fillStyle = '#8e8a7c'; g.fillRect(0, 0, 256, 160); g.fillStyle = 'rgba(0,0,0,0.12)'; for (var q = 0; q < 40; q++) g.fillRect((q * 53) % 256, (q * 37) % 160, 6, 3);
      var bell = function (x, y, s, n) { g.fillStyle = '#e8dcae'; g.beginPath(); g.moveTo(x - 22 * s, y + 26 * s); g.quadraticCurveTo(x - 20 * s, y - 24 * s, x, y - 26 * s); g.quadraticCurveTo(x + 20 * s, y - 24 * s, x + 22 * s, y + 26 * s); g.closePath(); g.fill();
        g.fillStyle = '#3b3326'; g.font = 'bold 26px Georgia, serif'; g.textAlign = 'center'; g.fillText(String(n), x, y + 58); };
      bell(52, 66, 1.35, 1); bell(128, 74, 0.75, 2); bell(204, 70, 1.0, 3);
      g.strokeStyle = '#5a7f9a'; g.lineWidth = 4; g.beginPath(); for (var w = 0; w < 256; w += 4) g.lineTo(w, 150 + 4 * Math.sin(w * 0.12)); g.stroke();
      var tex = new THREE.CanvasTexture(cv), y = H0(STONE.x, STONE.z), face = Math.atan2(HOLE.x - STONE.x, HOLE.z - STONE.z) + Math.PI;
      var slab = new THREE.Mesh(colGeo(new THREE.BoxGeometry(2.2, 1.5, 0.35), function (c, x, yy, z) { c.setRGB(0.55, 0.54, 0.5); c.offsetHSL(0, 0, 0.04 * Math.sin(x * 7 + yy * 5)); }), mat);
      slab.position.set(STONE.x, y + 0.7, STONE.z); slab.rotation.y = face; slab.rotation.x = -0.08; slab.castShadow = true; slab.name = 'craft787:stone'; G.add(slab);
      var fMat = new THREE.MeshLambertMaterial({ map: tex }), facePl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.25), fMat); facePl.position.set(0, 0.02, -0.18); facePl.rotation.y = Math.PI; slab.add(facePl);
      var back = new THREE.Mesh(facePl.geometry, fMat); back.position.set(0, 0.02, 0.18); slab.add(back);   /* painted both sides: she comes from the sea or the land */
      STN.y = y; STN.slab = slab;
    }());
    /* THE DIG: from now on H has the hole (her swim, the sea's depth, the fog's), and the island's own mesh loses the sea-floor triangles over it (its 4.8 m
       squares would roof the hole: the rim's stone lip covers the cut's ragged edge). Nothing else is touched. */
    (function dig() {
      DUG = true; var gm = null; o.scene.traverse(function (m) { if (!gm && m.isMesh && m.userData && m.userData.ground && m.geometry && m.geometry.parameters && m.geometry.parameters.width === 720 && m.geometry.index) gm = m; });
      if (!gm) { API.error = 'dig: the island mesh was not found'; return; }
      var ix = gm.geometry.index, pa = gm.geometry.attributes.position, cut = 0, i, k, r2 = (HOLE.R + 0.6) * (HOLE.R + 0.6);
      for (i = 0; i < ix.count; i += 3) { var hit = false; for (k = 0; k < 3 && !hit; k++) { var v = ix.getX(i + k), dx = pa.getX(v) - HOLE.x, dz = pa.getZ(v) - HOLE.z; if (dx * dx + dz * dz < r2) hit = true; }
        if (hit) { ix.setX(i + 1, ix.getX(i)); ix.setX(i + 2, ix.getX(i)); cut++; } }
      ix.needsUpdate = true; stat.cut = cut;
    }());
    /* what she is given floats to her: a few sprites, reused */
    var FLY = Object.keys(MATS).map(function (m) { var s = o.emoji(MATS[m].e, 0.9); s.visible = false; s.name = 'craft787:drop:' + m; G.add(s); return { m: m, s: s, on: false, t: 0, x: 0, y: 0, z: 0 }; });   /* one sprite per material, made at load (#140, fall748 N1: nothing is added to the scene while she plays) */
    function flyDrop(m, x, y, z) { var f = null, i; for (i = 0; i < FLY.length; i++) if (FLY[i].m === m) f = FLY[i]; if (!f) return; f.on = true; f.t = 0; f.x = x; f.y = y; f.z = z; f.s.position.set(x, y, z); f.s.visible = true; }

    /* ---------------- DROPS ---------------- */
    function fell(q) {
      try {
        if (!q || !q.k) return null; var d = dropOf(q.k); if (!d) return null; var c = st(); c.n++; stat.rolls++;
        var lucky = d[1] >= 1 || hash(q.k + ':' + c.n) / 4294967296 < d[1]; if (!lucky) { o.save(); return null; }
        var m = d[0]; c.bag[m] = (c.bag[m] | 0) + 1; stat.drops++; stat.last = { k: q.k, m: m };
        if (!q.ll && home()) flyDrop(m, q.cx, q.cy + 0.4, q.cz);
        try { o.tone(1180, 0, 0.06, 'triangle', 0.04); o.tone(1570, 0.07, 0.1, 'triangle', 0.04); } catch (e) { /* fine */ }
        var R = RECIPES.filter(function (r) { return r.need[m] && !made(r.id); })[0], n = c.bag[m], line = MATS[m].e + ' ' + (q.k === 'boa' || m === 'snakeskin' ? 'A shed ' : 'A ') + MATS[m].name + (R ? ' (' + Math.min(n, R.need[m]) + ' of ' + R.need[m] + ' for a ' + R.name.toLowerCase() + ')' : ' (' + n + ' in your bag)') + '.';
        if (!c.told['m_' + m]) { c.told['m_' + m] = 1; line += ' ' + WORDS.first; }
        o.save(); hint('drop', line, 3800, 0); return m;
      } catch (e) { API.error = 'fell: ' + (e && e.message); return null; }
    }

    /* ---------------- CRAFTING ---------------- */
    function lacks(r) { var S0 = S(), out = [], k; for (k in r.need) if (have(k) < r.need[k]) out.push(MATS[k].e + ' ' + (r.need[k] - have(k)) + ' more ' + (r.need[k] - have(k) === 1 ? MATS[k].name : MATS[k].many)); if ((S0.coins || 0) < r.coins) out.push('\u{1FA99} ' + (r.coins - (S0.coins || 0)) + ' more coins'); if ((S0.runes || 0) < r.runes) out.push('✦ ' + (r.runes - (S0.runes || 0)) + ' more runes'); return out; }
    function craft(id) {
      var r = RECIPES.filter(function (x) { return x.id === id; })[0]; if (!r || made(id) || lacks(r).length) return false;
      var S0 = S(), c = st(), k; for (k in r.need) c.bag[k] -= r.need[k]; S0.coins = (S0.coins || 0) - r.coins; S0.runes = (S0.runes || 0) - r.runes; c.made[id] = Date.now(); stat.crafted++;
      if (id === 'spur' && o.words) o.words.hurt = WORDS.hurt;
      try { o.tone(523, 0, 0.12, 'triangle', 0.05); o.tone(659, 0.12, 0.12, 'triangle', 0.05); o.tone(784, 0.24, 0.12, 'triangle', 0.05); o.tone(1047, 0.36, 0.3, 'triangle', 0.05); } catch (e) { /* fine */ }
      o.save(); try { o.hud(); } catch (e) { /* fine */ }
      close(); titled(r.e + ' Crafted', r.name, r.does); return true;
    }
    var PANEL = null;
    function css() {
      if (document.getElementById('craft787css')) return; var s = document.createElement('style'); s.id = 'craft787css';
      s.textContent = '#craft787{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);transform:translateX(-50%);width:min(440px,calc(100vw - 24px));max-height:min(74vh,640px);box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;z-index:44;background:#fff8ea;color:#3b2a1a;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.35);padding:14px 14px 10px;font-family:var(--body,system-ui)}' +
        '#craft787 h3{margin:0 0 4px;font:600 22px Georgia,serif}#craft787 .bag{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}#craft787 .bag span{font:700 13px var(--body,system-ui);background:#fbeccb;border-radius:10px;padding:4px 8px}#craft787 .bag span.dim{opacity:.45}' +
        '#craft787 .rows{flex:1 1 auto;min-height:0;overflow:auto}#craft787 .row{display:flex;align-items:flex-start;gap:10px;padding:9px 4px;border-top:1px solid rgba(60,40,20,.1)}#craft787 .row .e{font-size:30px;width:40px;text-align:center}#craft787 .row .t{flex:1;min-width:0}' +
        '#craft787 .row b{display:block;font:700 15px var(--body,system-ui)}#craft787 .row small{display:block;font:600 12px var(--body,system-ui);color:#7a5a3a;margin-top:2px}#craft787 .row .cost{font:700 12px var(--body,system-ui);color:#3f6b4a;margin-top:3px}#craft787 .row .cost.no{color:#a0522d}' +
        '#craft787 .row button{min-width:78px;min-height:44px;border-radius:14px;border:0;background:#3f8f5a;color:#fff;font:800 14px var(--body,system-ui);align-self:center}#craft787 .row button[disabled]{background:#cbbfa8;color:#fff8ea}#craft787 .row.done button{background:#e9dfc8;color:#6b5a3a}' +
        '#craft787 .close{display:block;width:100%;margin-top:8px;min-height:44px;border-radius:14px;border:2px solid rgba(60,40,20,.2);background:#fff;font:800 14px var(--body,system-ui);color:#3b2a1a}' +
        '.c787b{margin-left:8px;min-height:34px;padding:0 12px;border-radius:12px;border:0;background:#3f8f5a;color:#fff;font:800 13px var(--body,system-ui);vertical-align:middle}';
      document.head.appendChild(s);
    }
    function costLine(r) { var parts = [], k; for (k in r.need) parts.push(MATS[k].e + ' ' + Math.min(have(k), r.need[k]) + '/' + r.need[k]); if (r.coins) parts.push('\u{1FA99} ' + Math.min(S().coins || 0, r.coins) + '/' + r.coins); if (r.runes) parts.push('✦ ' + Math.min(S().runes || 0, r.runes) + '/' + r.runes); return parts.join(' · '); }
    function panelHtml() {
      var bag = Object.keys(MATS).map(function (m) { return '<span class="' + (have(m) ? '' : 'dim') + '">' + MATS[m].e + ' ' + have(m) + ' ' + (have(m) === 1 ? MATS[m].name : MATS[m].many) + '</span>'; }).join('');
      var rows = RECIPES.map(function (r) { var dn = made(r.id), lk = dn ? [] : lacks(r);
        return '<div class="row' + (dn ? ' done' : '') + '" data-r="' + r.id + '"><div class="e">' + r.e + '</div><div class="t"><b>' + r.name + '</b><small>' + r.does + '</small>' +
          (dn ? '<div class="cost">Yours.</div>' : '<div class="cost' + (lk.length ? ' no' : '') + '">' + costLine(r) + (lk.length ? '<br>Still to find: ' + lk.join(', ') : '') + '</div>') + '</div>' +
          '<button data-c787="make" data-id="' + r.id + '"' + (dn || lk.length ? ' disabled' : '') + '>' + (dn ? '✓' : 'Make') + '</button></div>'; }).join('');
      return '<h3>Crafting</h3><div class="bag">' + bag + '</div><div class="rows">' + rows + '</div><button class="close" data-c787="close">Close</button>';
    }
    function canOpen() { var m = S().mode, af = o.afoot ? o.afoot() : m === 'walk'; return af && !S().talking && !S().inside; }   /* on her feet (792 may hold her still under a card) */
    function open() {
      if (!canOpen()) { hint('land', WORDS.land, 2200, 3); return false; }
      css(); try { o.pouch(false); } catch (e) { /* fine */ }
      if (!PANEL) { PANEL = document.createElement('div'); PANEL.id = 'craft787'; document.body.appendChild(PANEL); }
      PANEL.innerHTML = panelHtml(); PANEL.hidden = false; return true;
    }
    function close() { if (PANEL) PANEL.hidden = true; }
    function isOpen() { return !!(PANEL && !PANEL.hidden); }
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-c787]') : null; if (!t) return; e.preventDefault(); e.stopPropagation();
      var w = t.getAttribute('data-c787'); if (w === 'open') open(); else if (w === 'close') close(); else if (w === 'make') { if (!craft(t.getAttribute('data-id')) && PANEL) PANEL.innerHTML = panelHtml(); }
    }, true);
    function pouch() {   /* the pouch's own row: her bag and the Craft button (the pouch's slot look) */
      css(); var li = Object.keys(MATS).filter(function (m) { return m !== 'pearl' || have(m); }).map(function (m) { var n = have(m); return '<li class="slot' + (n > 0 ? '' : ' dim') + '"><i>' + MATS[m].e + '</i><em>' + MATS[m].many.replace('long ', '').replace('silver ', '') + '</em><b>' + n + '</b></li>'; });
      var gear = RECIPES.filter(function (r) { return made(r.id); }).map(function (r) { return r.e + ' ' + r.name; });
      return '<h3>Crafting<button class="c787b" data-c787="open">Craft</button></h3><ul class="slots">' + li.join('') + '</ul>' + (gear.length ? '<div class="line">' + gear.join(' · ') + '</div>' : '');
    }

    /* ---------------- THE WATER: the cloak's depth and breath, the fins, the hole's walls ---------------- */
    function swim(dt) {   /* the island's swim (the page calls it after the sea floor's own clamp) */
      var S0 = S(); if (S0.mode !== 'swim' || !home()) return; stat.swims++; var P = S0.pos, dx = P.x - HOLE.x, dz = P.z - HOLE.z, d = Math.sqrt(dx * dx + dz * dz); if (d > HOLE.R + HOLE.LIP + 2) return;
      var top = TOP.at(P.x, P.z);
      if (d > HOLE.R - 0.7 && P.y < top - 0.2) {   /* the walls: below the rim she stays inside the hole (or, outside it, on the old floor) */
        if (d < HOLE.R + 0.6 && P.y < top - 1) { var k = (HOLE.R - 0.7) / d; P.x = HOLE.x + dx * k; P.z = HOLE.z + dz * k; } else P.y = top - 0.2; stat.wall++; }
      if (!made('cloak') && d < HOLE.R + 0.3 && P.y < top - K.CAP_IN) {   /* no cloak: the cold, heavy water lifts her back to its mouth */
        P.y += (top - K.CAP_IN - P.y) * Math.min(1, dt * K.PUSH); S0.pitch = Math.max(S0.pitch, 0.25); stat.pushes++; hint('heavy', WORDS.heavy, 6000, 30); }
    }
    function swimK() { return made('fins') ? K.FINS : 1; }
    function breathK() { return made('cloak') ? K.BREATH : 1; }
    function spur() { return made('spur'); }

    /* ---------------- THE BELLS AND THE CHEST ---------------- */
    function ring(b) {
      var c = st(), t = S().played || 0; if (t - b.last < K.BELL_GAP) return false; b.last = t; b.t = 0; stat.rings++;
      var f = [880, 660, 440][b.i]; try { o.tone(f, 0, 0.9, 'sine', 0.06); o.tone(f * 2, 0, 0.5, 'sine', 0.02); } catch (e) { /* fine */ }
      if (c.solved) return true;
      if (K.ORDER[c.bells] === b.i) { c.bells++; if (c.bells >= 3) { c.solved = Date.now(); stat.opened++; try { o.tone(440, 0.4, 1.2, 'sine', 0.05); o.tone(554, 0.45, 1.2, 'sine', 0.04); o.tone(660, 0.5, 1.4, 'sine', 0.04); } catch (e) { /* fine */ }
          titled('', 'The Blue Hole', made('cloak') ? WORDS.solved : WORDS.solvedDry); } }
      else { stat.sour++; c.bells = b.i === K.ORDER[0] ? 1 : 0; try { o.tone(f * 1.06, 0.05, 0.6, 'sawtooth', 0.02); } catch (e) { /* fine */ } hint('sour', WORDS.sour, 3000, 12); }
      o.save(); return true;
    }
    function hit(reach, sw, fresh, R) {   /* her peck or sweep (the page's atkHit): a bell in reach rings */
      if (!home()) return 0; var n = 0, i, b; for (i = 0; i < BELLS.length; i++) { b = BELLS[i]; if (reach(b.x, b.y + b.s * 0.6, b.z, R + b.s * 0.9) && fresh(b) && ring(b)) n++; } return n;
    }
    function take() {
      var c = st(); if (c.taken) return false; c.taken = Date.now(); c.bag.pearl = (c.bag.pearl | 0) + 1; stat.taken++;
      try { o.coins(40, 'the Blue Hole', { x: CH.x, y: CH.y, z: CH.z }); } catch (e) { S().coins = (S().coins || 0) + 40; }
      S().runes = (S().runes || 0) + 30; try { o.xp(120, 'the Blue Hole'); } catch (e) { /* fine */ }
      try { o.tone(784, 0, 0.2, 'triangle', 0.05); o.tone(988, 0.15, 0.2, 'triangle', 0.05); o.tone(1319, 0.3, 0.5, 'triangle', 0.05); } catch (e) { /* fine */ }
      o.save(); titled(MATS.pearl.e, 'The Deep Pearl', '40 coins · 30 runes · ' + WORDS.took); return true;
    }

    /* ---------------- EACH FRAME ---------------- */
    function tick(dt) {
      try {
        var on = home(); G.visible = on; if (isOpen() && (S().talking || !(S().mode === 'walk' || S().mode === 'paused'))) close(); if (!on) return;
        var S0 = S(), P = S0.pos, c = st(), i;
        for (i = 0; i < BELLS.length; i++) { var b = BELLS[i]; b.t += dt; var w = b.t < 1.2 ? Math.sin(b.t * 18) * 0.18 * (1 - b.t / 1.2) : 0; b.m.rotation.z = w; b.m.rotation.x = w * 0.5;
          b.ring.visible = b.t < 1.2; if (b.ring.visible) { b.ring.scale.setScalar(0.6 + b.t * 3.2 * b.s); b.ring.material.opacity = 0.7 * (1 - b.t / 1.2); } }
        var want = c.solved && !c.taken ? 1 : c.taken ? 1 : 0; CH.open += (want - CH.open) * Math.min(1, dt * 1.2); CH.pivot.rotation.x = -1.6 * CH.open;
        CH.glow.visible = !!(c.solved && !c.taken); if (CH.glow.visible) CH.glow.material.opacity = 0.16 + 0.06 * Math.sin((S0.played || 0) * 2.2);
        for (i = 0; i < FLY.length; i++) { var f = FLY[i]; if (!f.on) continue; f.t += dt; var u = clamp(f.t / K.FLY, 0, 1), e = u * u * (3 - 2 * u), bp = o.birdPos ? o.birdPos() : P;
          f.s.position.set(f.x + (bp.x - f.x) * e, f.y + (bp.y + 0.3 - f.y) * e + Math.sin(u * Math.PI) * 1.2, f.z + (bp.z - f.z) * e); f.s.scale.setScalar(0.9 * (1 - 0.6 * e)); if (u >= 1) { f.on = false; f.s.visible = false; } }
        var dS = Math.hypot(P.x - STONE.x, P.z - STONE.z);
        if (dS < K.READ_R && P.y < STN.y + 5 && !S0.talking && (S0.mode === 'walk' || S0.mode === 'fly' || S0.mode === 'landing')) { if (hint('stone', WORDS.stone + (made('spur') ? '' : ' ' + WORDS.stoneSpur), 6500, 30)) { stat.reads++; if (!c.told.stone) { c.told.stone = 1; o.save(); } } }
        var dH = Math.hypot(P.x - HOLE.x, P.z - HOLE.z);
        if (!c.told.hole && dH < K.TITLE_R && !S0.talking) { c.told.hole = 1; o.save(); titled('', 'The Blue Hole', 'deep water off the shore'); }
        if (S0.mode === 'swim' && Math.hypot(P.x - CH.x, P.y - CH.y, P.z - CH.z) < K.CHEST_R) { if (c.solved && !c.taken && CH.open > 0.6) take(); else if (!c.solved) hint('shut', WORDS.shut, 3400, 20); }
      } catch (e) { API.error = 'tick: ' + (e && e.message); }
    }

    function peek() { var c = st(); return { error: API.error, bag: Object.assign({}, c.bag), made: Object.assign({}, c.made), n: c.n, bells: c.bells, solved: !!c.solved, taken: !!c.taken, told: Object.assign({}, c.told), stat: Object.assign({}, stat),
      hole: { x: HOLE.x, z: HOLE.z, R: HOLE.R, BOT: HOLE.BOT }, stone: { x: STONE.x, y: STN.y, z: STONE.z }, chest: { x: CH.x, y: CH.y, z: CH.z, open: +CH.open.toFixed(3) }, bellAt: BELLS.map(function (b) { return { i: b.i, x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), s: b.s }; }),
      visible: G.visible, panel: isOpen(), panelText: isOpen() ? PANEL.textContent : '', swimK: swimK(), spur: spur(), top: TOP.at(HOLE.x + HOLE.R - 1, HOLE.z) }; }
    var bench = { give: function (m, n) { var c = st(); c.bag[m] = Math.max(0, (c.bag[m] | 0) + (n == null ? 1 : n)); o.save(); return c.bag[m]; }, made: function (id, on) { var c = st(); if (on === false) delete c.made[id]; else c.made[id] = Date.now(); if (id === 'spur' && o.words) o.words.hurt = on === false ? o.words.hurt0 || o.words.hurt : WORDS.hurt; o.save(); return made(id); },
      reset: function () { var s = S(); s.seen = s.seen || {}; delete s.seen.craft787; hintAt = {}; o.save(); }, ring: function (i) { return ring(BELLS[i]); }, hintsClear: function () { hintAt = {}; } };
    if (made('spur') && o.words) o.words.hurt = WORDS.hurt;
    return { fell: fell, tick: tick, swim: swim, swimK: swimK, breathK: breathK, spur: spur, hit: hit, pouch: pouch, open: open, close: close, isOpen: isOpen, craft: craft, peek: peek, bench: bench, group: G };
  }
  return { HOLE: HOLE, STONE: STONE, K: K, MATS: MATS, RECIPES: RECIPES, WORDS: WORDS, DROP: DROP, dropOf: dropOf, hole: hole, create: create, classic: CLASSIC };
}());
