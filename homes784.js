/* homes784.js - BOARD 784, EVERY VILLAGER'S HOUSE BIGGER ON THE INSIDE; VILLAGERS WHO LIVE THERE (Wings for Rouge). Trunks, for Su 41, Nov 12 2026.
   Marth, Nov 12 2026, verbatim: "Speaking of the hermits... you should see to it that all the villagers houses have the same or similar affect as the hermits.
   And they should kinda act like the npc's in ocarina of time" / "Or wind waker" / "Keep up the work on the mechs and the feel".
   The spirit only (a person lives in their home, is found at their own spot doing their own thing, turns to greet her, says something new by the hour):
   our own people, words and rooms; nothing of Nintendo's.

   WHAT IT IS. Each of the twelve Standard ring houses gets a HALL about 1.75x its footprint each way (3x its floor), a room of its own: the house's own wall
   texture inside, a wainscot, beams, a hearth whose glow is baked into the vertex colours (hermits.js's way), windows that read as daylight by day and dark
   blue at night (one shared material whose colour follows the night), a ceiling, the door back out on the front wall. The six owners' homes follow their
   favourite thing (Ada a garden home, Bo a market home, Cyril a well-and-tools home, Go a reading nook, Eli a tidy home, Faye a sky home), each with a bed;
   the six unowned are lived-in-but-quiet rooms. A ring house's ground is ~4.5 m, so a hall under it would sit below the sea (and switch on the underwater
   look): each hall hangs high over its own house (house.y + 420, alternate houses 12 m higher so two neighbours never share air), hidden unless she is in it.
   The halls are NOT in houses[]: groundAt treats every houses[] footprint as solid to its roof, houseAt finds it, and a villager's 'visit' picks from houses.

   THE OWNERS. When she steps into an owner's home and the owner is home (n.state 'inside'), the owner is there, drawn, at their own spot by the clock (their
   work by day, the hearth in the evening, in bed asleep at night with a 💤), turns to her and greets her with a bubble, and stays while she stays (their
   timer held). "💬 Talk" beside them says one line at a time, cycling: what she has done first (the Hawk, her strength, her chick, her nest), then the hour's
   lines. An owner who is out leaves the room empty and one quiet line says so. At night anyone not yet in is sent home first (the village goes in at 2040;
   knock746 already answers a night knock as "home"). When she leaves, the owner is put back exactly as they were: 'inside', not drawn, where they stood.

   PHONE COST. Per hall: six merged meshes (walls on a clone of the house's own dressed wall material, its own flags, so the same program; planks, bark,
   stone and cloth on clones of the cabins' four vertex-coloured materials: the same shader programs), one window mesh on ONE shared MeshBasicMaterial, the
   fire one shared emoji sprite moved to the hall she is in. Su 43 (Nov 13): a hall is BUILT WHEN SHE STEPS IN and its geometry freed when she steps out
   (nothing of a hall is in memory or the scene while she is outdoors; the build sits under the dark fade). The ceiling and the inside throw no shadow.

   SU 43, THE WIRING (ship #131). By day (clock < 2040) a ring house's door opens when she walks up to it (the door swings, she is in); at night it stays shut
   and #127's words say who is home for the night. Her daily round of the six (wings-for-rouge.html chooseAct, Standard only): mornings a chore at their own
   door and the well, days at their favourite place, evenings a visit to their friend's door or the bench, every one home by full dark (a villager still out
   when the night is deep and she is not looking goes in: homeNow). Lines change by the hour, the season (seasons.js), and what she has done (a tool she
   brought them, the village's builds, the Hawk, her chick). Feeding the loop: the first talk with each of them at home on a day gives a coin (DRAFT: 1),
   and a villager handed a tool at home goes straight out of the door to use it (their mark, as outdoors). Saved: S.seen.home784 { name: day } (S.seen saves).
   BORROWED: hermits.js's builder (box, cyl, rod, merge with a baked glow; copied here with a wall-UV mode added) and its trailing indoor camera; the cabins'
   materials; each house's own wall texture (textures.js dressHouse); the villagers, their model bodies, clips and poses; the game's say(), toast(), bubbles and
   CINE781's dark fade. Nothing downloaded: a furniture pack would add textures and programs to a phone for rooms the house's own primitives already furnish.

   CLASSIC IS FROZEN (645): create() is never called in Classic; the twelve keep their small rooms there.
   Every line and number here is DRAFT for Marth.

   ── THE API ───────────────────────────────────────────────────────────────────────────────────────
   WFR_HOMES784.create(THREE, scene, o) -> inst | throws (the wiring catches it: no halls, the game as it was)
     o = { HS, houses (the 12 ring records), wallMesh: (h) -> mesh, matSrc (a cabin group), renderer, emoji(ch, size),
           late: () => ({ S, npcs, pose, turnTo, say, toast, hud, nightAmt, chick, hawkWon, cine, homeNow, NAME, floorOf, standOf, $,
                          season, coin(n, why, pos), marks, built, day, save }) }
   inst = { halls, hallOf(house), door(house) -> bool, enter(house) -> bool, exit(hall), leave(hall), tick(dt), button(el) -> bool, press() -> bool,
            peek(), log }
   ═════════════════════════════════════════════════════════════════════════════════════════════════ */
window.WFR_HOMES784 = (function () {
  'use strict';
  var API = { error: '', last: null };
  var LIFT = 420, STEP = 12, GROW = 1.75;   /* the hall's height over its house (alternate houses STEP higher); its size against the house's, each way */
  var FAV = ['garden', 'market', 'well', 'reading', 'tidy', 'sky'];   /* Ada, Bo, Cyril, Go, Eli, Faye (the game's fav, by person) */
  /* DRAFT, every word (Marth rules). {name} is her name. */
  var LINES = {
    Ada: { greet: { morning: 'Morning, {name}! Mind the seed trays.', day: 'Oh, {name}! Come in. Never mind the soil.', evening: 'Evening, {name}. The herbs smell sweetest now.' },
      morning: ['I water before the sun is high. Plants drink early, like birds.', 'Those trays will be carrots by summer, if the slugs are kind.'],
      day: ['Basil by the window, mint in a pot. Mint gets everywhere if you let it.', 'Bo says my house smells like a garden. That is the point.'],
      evening: ['Rosemary for the soup, thyme for the bread. Done for the day.', 'Sit by the fire a while. The pots will not mind.'],
      night: ['Mm... {name}? The garden is asleep. So should we be...', 'Zz... water the seedlings... zz.'],
      out: 'Ada is out in her garden. The seed trays are still damp.' },
    Bo: { greet: { morning: 'Early bird! I am counting apples before the market opens.', day: '{name}! Welcome to the back of the shop.', evening: 'Evening! Market is shut. Come see what did not sell.' },
      morning: ['Fresh crates every morning. The best pears go first.', 'This scale is older than me. Still honest, though.'],
      day: ['An apple a day, they say. I say two, and buy them from me.', 'Ada grows them, I sell them. Good friends make good business.'],
      evening: ['The tally is done. A good day. Mostly pears.', 'Bruised fruit goes to the birds. Help yourself, little one.'],
      night: ['Hm? Shop is closed... come back at sunup...', 'Zz... three apples... four... zz.'],
      out: 'Bo is out at the market. The kettle is still warm.' },
    Cyril: { greet: { morning: 'Morning. Mind the buckets, I have a leak to find.', day: 'Ah, {name}. Come to see the workshop?', evening: 'Evening. Tools away, hands washed. Come in.' },
      morning: ['The well rope frays every spring. I keep a new one ready.', 'A good bucket does not leak. This one does. Hence the bench.'],
      day: ['Every nail in this village went through my hands at some point.', 'Faye says I talk to my hammer. I say it listens.'],
      evening: ['Tools washed, the pulley oiled. Tomorrow, the gate.', 'A quiet evening. I like a quiet evening.'],
      night: ['Huh? Oh... it is you. Off home, little bird...', 'Zz... the pulley squeaks... zz.'],
      out: 'Cyril is out at the well. A bucket of fresh water waits by the door.' },
    Go: { greet: { morning: 'Oh! {name}. I was just finding my page.', day: 'Come in, quietly. I am at the good part.', evening: 'Evening, {name}. Sit by me, I will read you a bit.' },
      morning: ['Mornings are for poems. Afternoons are for adventures.', 'Eli built this shelf for me. It is already full.'],
      day: ['This one has a bird in it. A brave one. Like you.', 'I have read every book on the island twice. Some three times.'],
      evening: ['Eli says I will ruin my eyes reading by the fire. Worth it.', 'One more chapter. Then one more.'],
      night: ['Mm... is it morning? ...no... zz.', 'Zz... the end... no, there is more... zz.'],
      out: 'Go is out with a book somewhere. Her page is marked with a feather.' },
    Eli: { greet: { morning: 'Morning, {name}! Wipe your feet. Only joking. Mostly.', day: '{name}! Come in, I have just swept.', evening: 'Evening. Everything in its place. Even you, by the fire.' },
      morning: ['Sweep first, then breakfast. That is the order of things.', 'That clock is four minutes fast. I keep it that way on purpose.'],
      day: ['Go\'s books are the only mess I allow. Do not tell her.', 'A tidy house is a happy house. Well, a tidy one, anyway.'],
      evening: ['Rocking chair, warm tea, a quiet house. That is the dream.', 'Go will be by soon. I have kept her seat warm.'],
      night: ['Shh... the house is sleeping... zz.', 'Zz... a speck of dust... zz.'],
      out: 'Eli is out sweeping the paths. His own floor is spotless.' },
    Faye: { greet: { morning: 'Morning, {name}! Did you see the clouds at dawn?', day: '{name}! Come see, I have charted a new cloud.', evening: 'Evening! The stars are nearly out. Want to look?' },
      morning: ['A red morning sky means rain by noon. Mostly.', 'Cyril fixed my telescope stand. It only wobbles a little now.'],
      day: ['You fly up there every day. I only get to look. What is it like?', 'The sky island floats on air older than all of us, I think.'],
      evening: ['There, the first star. Make a wish.', 'My charts say the north star never moves. Unlike you.'],
      night: ['Mm... wake me if a star falls... zz.', 'Zz... the hunter\'s belt... zz.'],
      out: 'Faye is out watching the sky. Her star charts are pinned to the wall.' },
    state: { hawk: 'They say you faced the Hawk. The whole village sleeps better.', strong: 'Look at you! Strong wings now. Hardly the little bird who first came by.',
      chick: 'How is your little one? Bring the chick by some time.', noChick: 'Still building your nest? Every bird starts with a twig.' },
    /* Su 43: what she has done for THEM (a tool she brought: S.marks), and for the village (its builds); the season outside; coming home to find her in */
    deed: { fix: 'The hammer you brought me? I have mended half the village with it.', paint: 'See my shutter? Painted with the brush you carried here.',
      unlock: 'I hung a hook for the key you brought. Never lost it since.', well: 'The well runs sweet. You carried the very thing it needed.',
      garden: 'The flowers by my door came up from your shears. I say hello to them.', market: 'That basket you flew in? Full every market day.' },
    built: 'One build, then another. The village is growing because of you, {name}.', built1: 'Have you seen what we built? You carried half of it here.',
    home: { Ada: 'Oh! {name}, you let yourself in. Good. Stay while I wash the soil off.', Bo: 'Ha! A customer before I even get my boots off.',
      Cyril: 'Hm. A bird in my workshop. Mind the nails.', Go: 'Oh! You startled me. I was just thinking about you.', Eli: 'Company! And the floor still clean. Lovely.',
      Faye: '{name}! Did you come to see the stars too?' },
    season: {
      Ada: { spring: 'Spring! Everything I planted wakes at once.', summer: 'Summer means watering twice a day. The tomatoes are worth it.', autumn: 'Autumn is for seeds. I save the best ones in jars.', winter: 'Winter is when the garden sleeps. I plan the next one by the fire.' },
      Bo: { spring: 'The first strawberries of spring sell before noon.', summer: 'Summer stock: peaches, plums, more peaches.', autumn: 'Apples and pears all autumn. The shelves groan.', winter: 'Winter is slow at the stall. Good for counting.' },
      Cyril: { spring: 'Spring rains find every leak in the village. I find them after.', summer: 'Summer, the well runs low. I keep it clean and deep.', autumn: 'Leaves in the gutters every autumn. Up the ladder I go.', winter: 'Winter is for mending tools. And my own hands.' },
      Go: { spring: 'I read under the blossom in spring. The petals mark the pages.', summer: 'Long summer days, long summer books.', autumn: 'Autumn and a good story. The best pair there is.', winter: 'Winter nights were made for reading aloud.' },
      Eli: { spring: 'Spring cleaning! My favourite time of year.', summer: 'Summer dust gets everywhere. I do not mind. Much.', autumn: 'The leaves blow in every autumn. I sweep them right back out.', winter: 'Snow on the boots, snow on the floor. Winter tests me.' },
      Faye: { spring: 'Spring skies change by the hour. I chart them all.', summer: 'Summer nights are short, but so clear.', autumn: 'In autumn the birds fly south in long lines. Not you, though.', winter: 'Winter stars are the brightest. Cold, but bright.' } },
    gift: 'Here, a coin for you. For coming to see me.',
    quiet: ['A quiet home. Someone keeps it swept.', 'Nobody is in. The chairs are pushed in neatly.', 'An empty room, warm from the morning sun.',
      'A spare home, kept ready for whoever comes next.', 'The shelves are dusted. Somebody cares for this place.', 'Quiet here. Only the clock and the wind.'],
  };
  var STRONG = 40;   /* her level from which the owners remark on her strength (DRAFT) */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function bandOf(c) { return c >= 2040 ? 'night' : c >= 1800 ? 'evening' : c < 600 ? 'morning' : 'day'; }

  /* ── geometry: hermits.js's builder (merged, vertex-coloured, box-mapped uv), copied with one addition: a part may carry wall uv (u along the wall
        every 1.9, v up the wall's height), so the house's own dressed wall texture lies on the hall's walls as it lies on the house's ── */
  function builder(T, lin) {
    var UVK = 1.4;
    var rgb = function (hex, k) { var c = new T.Color(hex); if (lin && c.convertSRGBToLinear) c.convertSRGBToLinear(); var s = k == null ? 1 : k; return [c.r * s, c.g * s, c.b * s]; };
    var M = function (px, py, pz, rx, ry, rz, sx, sy, sz) { var ob = new T.Object3D(); ob.position.set(px || 0, py || 0, pz || 0); ob.rotation.set(rx || 0, ry || 0, rz || 0); ob.scale.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz); ob.updateMatrix(); return ob.matrix.clone(); };
    var box = function (x0, y0, z0, x1, y1, z1, col) { return { g: new T.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), m: M((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), col: col }; };
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
          if (p.wall) { u = (ax >= az ? z : x) / 1.9; v = y / p.wall; }
          else if (ay >= ax && ay >= az) { u = x / UVK; v = z / UVK; } else if (ax >= az) { u = z / UVK; v = y / UVK; } else { u = x / UVK; v = y / UVK; }
          P.push(x, y, z); N.push(nx, ny, nz); U.push(u, v);
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
    var HS = o.HS, ring = o.houses.slice(0, 12);
    if (ring.length !== 12 || ring.some(function (h) { return !h || !h.kind683; })) throw new Error('homes784: the twelve Standard ring houses are not there');
    var lin = !!(o.renderer && T.sRGBEncoding !== undefined && o.renderer.outputEncoding === T.sRGBEncoding);
    var B = builder(T, lin);
    /* the cabins' four vertex-coloured materials, read off a cabin's own meshes, and CLONED (the same program; the clones' colour is the halls' own
       lamp: brighter at night while she is inside, never touching a cabin) */
    var SRC = {};
    if (o.matSrc) o.matSrc.traverse(function (ob) { if (!ob.isMesh) return; var n = String(ob.name).replace('cabin:', ''); if (/^(logs|wood|stone|cloth)$/.test(n) && !SRC[n]) SRC[n] = ob.material; });
    var MAT = {}, OWN = [];
    ['logs', 'wood', 'stone', 'cloth'].forEach(function (n) { var m = SRC[n] ? SRC[n].clone() : new T.MeshLambertMaterial({ vertexColors: true }); m.vertexColors = true; m.color.setRGB(1, 1, 1); MAT[n] = m; OWN.push(m); });
    var wallMats = {};   /* one clone per wall texture (timber, brick, stone): three at most */
    var wallMatOf = function (h) {
      var src = o.wallMesh ? o.wallMesh(h) : null, sm = src && src.material, key = sm && sm.map ? sm.map.uuid : 'plain';
      if (wallMats[key]) return wallMats[key];
      var m = sm ? sm.clone() : new T.MeshLambertMaterial(); m.color.setRGB(1, 1, 1); m.side = T.FrontSide;   /* Su 43: its own flags kept (vertexColors on would be a new program); the walls' glow is the lamp's */
      if (sm && sm.onBeforeCompile) { m.onBeforeCompile = sm.onBeforeCompile; if (sm.customProgramCacheKey) m.customProgramCacheKey = sm.customProgramCacheKey; }
      wallMats[key] = m; OWN.push(m); return m;
    };
    var WIN = new T.MeshBasicMaterial({ color: 0xeaf4ff });   /* the one shared window: daylight by day, dusk, dark blue at night (tick) */
    /* Su 43: a SLOT per house (its sizes and place, cheap); the hall itself is built on entry (got) and freed on exit (drop) */
    var halls = [], byHouse = new Map();
    function slot(i, h) {
      var W = Math.round(h.w * GROW * 10) / 10, D = Math.round(h.d * GROW * 10) / 10, ownerIx = i % 2 === 0 ? i / 2 : -1;
      return { i: i, h: h, rec: null, builds: 0, cyc: 0, w: W, d: D, ht: clamp(h.ht + 0.9, 4.6, 6.4), x: h.x, z: h.z, rot: h.rot, y: h.y + LIFT + (i % 2) * STEP,
        owner: ownerIx, who: ownerIx >= 0 ? ['Ada', 'Bo', 'Cyril', 'Go', 'Eli', 'Faye'][ownerIx] : null, theme: ownerIx >= 0 ? FAV[ownerIx] : 'quiet' };
    }
    for (var i = 0; i < 12; i++) { var e0 = slot(i, ring[i]); halls.push(e0); byHouse.set(ring[i], e0); }
    var buildMs = 0;
    function got(e) { if (!e.rec) { var t0 = performance.now(); e.rec = room(e.i, e.h); e.rec.home784.slot = e; e.builds++; buildMs = Math.round((performance.now() - t0) * 10) / 10; } return e.rec; }
    function drop(e) {
      var r = e && e.rec; if (!r) return; e.rec = null;
      var h = e.h; if (h.treat && h.treat.parent === r.g) r.g.remove(h.treat);   /* the treat is the house's: kept, out of the scene until she is back in */
      r.g.traverse(function (ob) { if (ob.isMesh && ob.geometry) ob.geometry.dispose(); });   /* the materials are shared and kept (the same programs) */
      if (r.g.parent) r.g.parent.remove(r.g);
    }

    /* the shared world-space things: the fire (moved to the hall she is in) */
    var wg = new T.Group(); wg.name = 'homes784:folk'; wg.visible = false; scene.add(wg);
    var fire = o.emoji('🔥', 1.0); wg.add(fire);

    function room(i, h) {
      var W = Math.round(h.w * GROW * 10) / 10, D = Math.round(h.d * GROW * 10) / 10, HT = clamp(h.ht + 0.9, 4.6, 6.4), W2 = W / 2, D2 = D / 2, FT = 0.1;
      var ownerIx = i % 2 === 0 ? i / 2 : -1, theme = ownerIx >= 0 ? FAV[ownerIx] : 'quiet';
      var y = h.y + LIFT + (i % 2) * STEP, rot = h.rot, c = Math.cos(rot), s = Math.sin(rot);
      var P = { WD: [], BK: [], ST: [], CL: [], WL: [], WN: [] }, SOL = [];
      var col = B.rgb, dk = col(0x5a3a24), mid = col(0x8a5f38), lt = col(0xb08a5e), beam = col(0x7d5a3a), stoneC = col(0xb3a896), soot = col(0x241a14);
      var bx = function (arr, x0, y0, z0, x1, y1, z1, cc) { P[arr].push(B.box(x0, y0, z0, x1, y1, z1, cc)); };
      var sol = function (x0, z0, x1, z1) { SOL.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]); };
      /* a box against a wall: side 'L' (x = -W2), 'R' (x = +W2), 'B' (z = -D2); a: along the wall, u: out from it */
      var wxz = function (side, a, u) { return side === 'L' ? [-W2 + u, a] : side === 'R' ? [W2 - u, a] : [a, -D2 + u]; };
      var wb = function (arr, side, a0, a1, u0, u1, y0, y1, cc, solid) { var p = wxz(side, a0, u0), q = wxz(side, a1, u1); bx(arr, p[0], y0, p[1], q[0], y1, q[1], cc); if (solid) sol(p[0], p[1], q[0], q[1]); };
      /* ── the shell: floor, walls (outside the room line: roomOf measures to it), wainscot, ceiling, beams ── */
      bx('WD', -W2 - 0.2, 0, -D2 - 0.2, W2 + 0.2, FT, D2 + 0.2, lt);
      var wc = col(0xffffff);
      [[-W2 - 0.2, -D2 - 0.2, -W2, D2 + 0.2], [W2, -D2 - 0.2, W2 + 0.2, D2 + 0.2], [-W2, -D2 - 0.2, W2, -D2], [-W2, D2, W2, D2 + 0.2]].forEach(function (q) { P.WL.push(Object.assign(B.box(q[0], 0, q[1], q[2], HT, q[3], wc), { wall: HT })); });
      bx('WD', -W2, FT, -D2, -W2 + 0.05, 1.05, D2, mid); bx('WD', W2 - 0.05, FT, -D2, W2, 1.05, D2, mid); bx('WD', -W2, FT, -D2, W2, 1.05, -D2 + 0.05, mid); bx('WD', -W2, FT, D2 - 0.05, W2, 1.05, D2, mid);
      bx('WD', -W2, 1.05, -D2, -W2 + 0.09, 1.13, D2, dk); bx('WD', W2 - 0.09, 1.05, -D2, W2, 1.13, D2, dk); bx('WD', -W2, 1.05, -D2, W2, 1.13, -D2 + 0.09, dk); bx('WD', -W2, 1.05, D2 - 0.09, W2, 1.13, D2, dk);
      var nb = Math.max(3, Math.round(D / 3.2));
      for (var k = 0; k < nb; k++) { var bz = -D2 + (k + 0.5) * D / nb;
        P.BK.push(B.rod([-W2, HT - 0.45, bz], [W2, HT - 0.45, bz], 0.16, beam));
        [-1, 1].forEach(function (sx) { P.BK.push(B.rod([sx * (W2 - 0.16), FT, bz], [sx * (W2 - 0.16), HT - 0.45, bz], 0.14, beam)); P.BK.push(B.rod([sx * (W2 - 0.16), HT - 1.25, bz], [sx * (W2 - 0.9), HT - 0.45, bz], 0.08, beam)); });
        sol(-W2, bz - 0.2, -W2 + 0.35, bz + 0.2); sol(W2 - 0.35, bz - 0.2, W2, bz + 0.2); }
      P.BK.push(B.rod([0, HT - 0.2, -D2], [0, HT - 0.2, D2], 0.13, beam));
      var ceil = col(0x7a5638);
      /* ── the door back out, on the front wall: the house's own doorway size, shut (it is drawn; the walk goes out through it) ── */
      var dw = h.dw || 1.5, dh = h.dh || 2.9, DZ = D2 - 0.02;
      bx('WD', -dw / 2, FT, DZ - 0.08, dw / 2, dh, DZ, col(0x6e4529, 0.95));
      [-1, 0, 1].forEach(function (k2) { bx('WD', k2 * dw / 3 - 0.03, FT + 0.2, DZ - 0.1, k2 * dw / 3 + 0.03, dh - 0.2, DZ - 0.08, col(0x553420)); });
      bx('WD', -dw / 2 - 0.16, FT, DZ - 0.12, -dw / 2, dh + 0.16, DZ, dk); bx('WD', dw / 2, FT, DZ - 0.12, dw / 2 + 0.16, dh + 0.16, DZ, dk); bx('WD', -dw / 2 - 0.16, dh, DZ - 0.12, dw / 2 + 0.16, dh + 0.16, DZ, dk);
      P.ST.push({ g: new T.SphereGeometry(0.07, 8, 6), m: B.M(dw / 2 - 0.22, FT + 1.35, DZ - 0.14), col: col(0xd9b24a) });
      bx('CL', -dw / 2 - 0.3, FT, D2 - 1.2, dw / 2 + 0.3, FT + 0.012, D2 - 0.15, col(0x4f6f8a));   /* the mat inside the door */
      /* ── windows: a pane of the shared window material just proud of the wall, a wooden frame and cross ── */
      var win = function (side, a, w0, y0, y1) {
        var p0 = wxz(side, a - w0 / 2, 0.02), p1 = wxz(side, a + w0 / 2, 0.035);
        P.WN.push(B.box(p0[0], y0, p0[1], p1[0], y1, p1[1], col(0xffffff)));
        var f = function (a0, a1, yy0, yy1) { wb('WD', side, a0, a1, 0.0, 0.1, yy0, yy1, dk); };
        f(a - w0 / 2 - 0.12, a - w0 / 2, y0 - 0.12, y1 + 0.12); f(a + w0 / 2, a + w0 / 2 + 0.12, y0 - 0.12, y1 + 0.12); f(a - w0 / 2, a + w0 / 2, y1, y1 + 0.12); f(a - w0 / 2, a + w0 / 2, y0 - 0.12, y0);
        f(a - 0.04, a + 0.04, y0, y1); f(a - w0 / 2, a + w0 / 2, (y0 + y1) / 2 - 0.04, (y0 + y1) / 2 + 0.04);
        wb('WD', side, a - w0 / 2 - 0.2, a + w0 / 2 + 0.2, 0, 0.26, y0 - 0.2, y0 - 0.12, lt);   /* the sill */
      };
      var wy0 = 1.55, wy1 = Math.min(HT - 1.0, 3.2);
      win('B', -W2 * 0.42, 1.5, wy0, wy1); win('B', W2 * 0.42, 1.5, wy0, wy1);
      win('L', D2 * 0.45, 1.4, wy0, wy1); if (theme !== 'reading') win('R', D2 * 0.38, 1.4, wy0, wy1);   /* Go's right wall is all books */
      /* ── the hearth on the left wall, in its back half: chimney breast, firebox, hearthstone, mantel, logs ── */
      var zH = -D2 * 0.3, HX = -W2, warm = ownerIx >= 0;
      P.ST.push(B.box(HX, 0, zH - 1.2, HX + 0.9, HT, zH - 0.6, stoneC), B.box(HX, 0, zH + 0.6, HX + 0.9, HT, zH + 1.2, stoneC), B.box(HX, 1.3, zH - 0.6, HX + 0.9, HT, zH + 0.6, stoneC));
      P.ST.push(B.box(HX, 0, zH - 0.6, HX + 0.35, 1.3, zH + 0.6, soot), B.box(HX + 0.9, 0, zH - 1.3, HX + 1.55, 0.16, zH + 1.3, col(0x9b9184)));
      bx('WD', HX + 0.8, 1.3, zH - 1.35, HX + 1.12, 1.42, zH + 1.35, dk);
      P.BK.push(B.rod([HX + 0.4, 0.12, zH - 0.35], [HX + 0.5, 0.2, zH + 0.35], 0.07, col(0x5a3a22)), B.rod([HX + 0.55, 0.12, zH - 0.3], [HX + 0.35, 0.22, zH + 0.3], 0.06, col(0x4a3020)));
      [[-0.9, 0xb8643a], [-0.55, 0xd8c27a], [0.7, 0x7a8faa], [1.0, 0x9a5a3a]].forEach(function (q) { P.CL.push(B.cyl(HX + 0.96, 1.42, zH + q[0], 0.09, 0.07, 0.24, 8, col(q[1]))); });
      sol(HX, zH - 1.3, HX + 1.55, zH + 1.3);
      var FIRE = { x: HX + 0.5, y: 0.5, z: zH };
      /* ── the shared middle: a rug, a table and two stools ── */
      P.CL.push(B.cyl(0.4, FT, D2 * 0.12, 2.3, 2.3, 0.015, 28, col([0x9a3b2e, 0x3f6e8c, 0x6d7f4a, 0x8a5a9c][i % 4])), B.cyl(0.4, FT + 0.002, D2 * 0.12, 1.6, 1.6, 0.015, 28, col(0xc8784a)));
      var table = function (cx, cz, w, d, ht, cc) { bx('WD', cx - w / 2, ht - 0.1, cz - d / 2, cx + w / 2, ht, cz + d / 2, cc);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { bx('WD', cx + q[0] * (w / 2 - 0.12) - 0.06, FT, cz + q[1] * (d / 2 - 0.12) - 0.06, cx + q[0] * (w / 2 - 0.12) + 0.06, ht - 0.1, cz + q[1] * (d / 2 - 0.12) + 0.06, dk); });
        sol(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2); };
      var stool = function (cx, cz) { P.WD.push(B.cyl(cx, 0.6, cz, 0.32, 0.32, 0.09, 12, mid)); P.BK.push(B.cyl(cx, FT, cz, 0.1, 0.14, 0.5, 8, dk)); sol(cx - 0.32, cz - 0.32, cx + 0.32, cz + 0.32); };
      var TX = -W2 * 0.42, TZ = D2 * 0.38;
      table(TX, TZ, 2.2, 1.3, 1.05, mid); stool(TX - 1.5, TZ); stool(TX + 1.5, TZ);
      P.CL.push(B.cyl(TX - 0.4, 1.05, TZ, 0.13, 0.11, 0.2, 10, col(0xe9dfca)), B.cyl(TX + 0.45, 1.05, TZ - 0.2, 0.3, 0.3, 0.05, 14, col(0xd9cbb0)));   /* a cup, a plate */
      /* ── shelves on the back wall between the windows ── */
      var shelf = function (side, a0, a1, u, levels, top, fill) {
        wb('WD', side, a0, a0 + 0.1, 0, u, FT, top, dk); wb('WD', side, a1 - 0.1, a1, 0, u, FT, top, dk); wb('WD', side, a0, a1, 0, 0.06, FT, top, mid);
        for (var q = 0; q < levels; q++) { var yy = FT + 0.3 + q * (top - 0.4) / Math.max(1, levels - 1); wb('WD', side, a0, a1, 0, u, yy, yy + 0.07, lt); if (fill) fill(yy + 0.07, q); }
        var p = wxz(side, a0, 0), r = wxz(side, a1, u); sol(p[0], p[1], r[0], r[1]);
      };
      var books = function (side, a0, a1, u, yy, seed) { var a = a0 + 0.08, k2 = 0; while (a < a1 - 0.2) { var bw = 0.1 + ((seed * 7 + k2 * 3) % 5) * 0.025, bh = 0.4 + ((seed + k2 * 5) % 4) * 0.07;
        wb('CL', side, a, a + bw, 0.06, u - 0.06, yy, yy + bh, col([0x8e3b2f, 0x2f5277, 0x3f6b4a, 0xb08a3c, 0x6a4a7a, 0xd9cbb0][(seed + k2) % 6])); a += bw + 0.02; k2++; } };
      var jars = function (side, a0, a1, u, yy, seed) { for (var a = a0 + 0.3, k2 = 0; a < a1 - 0.2; a += 0.55, k2++) { var p = wxz(side, a, u / 2); P.CL.push(B.cyl(p[0], yy, p[1], 0.13, 0.11, 0.3, 8, col([0x6f8f5a, 0xb8643a, 0x7a6fa0, 0xd8c27a, 0x9a5a3a][(seed + k2) % 5]))); } };
      /* ── each home its own ── */
      var BED = null, spots = {};
      var bed = function (blanket) {   /* the back-right corner; the headboard on the back wall */
        var x0 = W2 - 2.1, x1 = W2 - 0.25, z0 = -D2 + 0.12, z1 = -D2 + 3.15;
        bx('WD', x0, FT, z0, x1, 0.55, z1, dk); bx('WD', x0, FT, z0, x1, 1.55, z0 + 0.14, dk); bx('WD', x0, FT, z1 - 0.12, x1, 0.85, z1, dk);
        bx('CL', x0 + 0.06, 0.55, z0 + 0.14, x1 - 0.06, 0.78, z1 - 0.12, col(0xece4d2)); bx('CL', x0 + 0.02, 0.78, z0 + 1.0, x1 - 0.02, 0.86, z1 - 0.1, col(blanket));
        bx('CL', x0 + 0.03, 0.55, z0 + 1.0, x0 + 0.06, 0.82, z1 - 0.1, col(blanket, 0.85)); P.CL.push({ g: new T.SphereGeometry(0.3, 12, 7), m: B.M((x0 + x1) / 2, 0.88, z0 + 0.5, 0, 0, 0, 2.2, 0.42, 1.1), col: col(0xf6f1e6) });   /* the pillow (Su 43: was a drum on its end) */
        bx('WD', x0 - 0.75, FT, z0 + 0.1, x0 - 0.1, 0.75, z0 + 0.75, mid); P.CL.push(B.cyl(x0 - 0.42, 0.75, z0 + 0.42, 0.07, 0.07, 0.18, 8, col(0xf6efd8)));   /* the night table, a candle */
        sol(x0 - 0.75, z0, x1, z1); BED = { x: (x0 + x1) / 2, z: z1 - 0.25, top: 0.86 };
      };
      var who = ownerIx >= 0 ? ['Ada', 'Bo', 'Cyril', 'Go', 'Eli', 'Faye'][ownerIx] : null;
      var A = W2 - 0.25;   /* the right wall's front half is each owner's work place */
      if (theme === 'garden') {
        bed(0x6d9a4a);
        table(W2 - 0.8, D2 * 0.05, 1.1, 3.0, 1.05, lt);   /* the potting bench */
        [-1.1, -0.4, 0.3, 1.0].forEach(function (dz, k2) { P.ST.push(B.cyl(W2 - 0.8, 1.05, D2 * 0.05 + dz, 0.2, 0.15, 0.3, 10, col(0xb8643a))); P.CL.push({ g: new T.SphereGeometry(0.22, 8, 6), m: B.M(W2 - 0.8, 1.48, D2 * 0.05 + dz), col: col([0x5f9e4a, 0x6d8f3a, 0x8aa060, 0x4f8a3a][k2]) }); });
        [0, 1, 2].forEach(function (k2) { var z0 = D2 * 0.48 + k2 * 0.85; bx('WD', W2 - 1.3, FT, z0, W2 - 0.3, FT + 0.18, z0 + 0.7, lt); bx('CL', W2 - 1.25, FT + 0.18, z0 + 0.05, W2 - 0.35, FT + 0.2, z0 + 0.65, col(0x4a3426));
          for (var q = 0; q < 6; q++) P.CL.push({ g: new T.ConeGeometry(0.06, 0.16, 5), m: B.M(W2 - 1.15 + (q % 3) * 0.33, FT + 0.28, z0 + 0.18 + Math.floor(q / 3) * 0.32), col: col(0x7ab05a) }); });
        sol(W2 - 1.3, D2 * 0.48, W2 - 0.3, D2 * 0.48 + 2.4);
        [[-W2 + 1.6, -D2 + 0.7, 0.45], [W2 * 0.05, -D2 + 0.7, 0.4], [-W2 + 0.8, D2 - 1.6, 0.42]].forEach(function (q) { P.ST.push(B.cyl(q[0], FT, q[1], q[2], q[2] * 0.75, 0.75, 12, col(0xa85a32))); P.CL.push({ g: new T.SphereGeometry(q[2] * 1.2, 9, 7), m: B.M(q[0], 1.15, q[1], 0, 0, 0, 1, 1.15, 1), col: col(0x4f8a3a) }); sol(q[0] - q[2], q[1] - q[2], q[0] + q[2], q[1] + q[2]); });
        for (var hk = 0; hk < 7; hk++) P.CL.push({ g: new T.ConeGeometry(0.11, 0.45, 6), m: B.M(-W2 * 0.5 + hk * 0.6, HT - 0.8, -D2 * 0.15, Math.PI, 0, 0), col: col([0x6f8f5a, 0x8aa060, 0x9a8a50][hk % 3]) });   /* herbs drying from a beam */
        shelf('B', -W2 * 0.2, W2 * 0.2, 0.45, 3, 2.2, function (yy, q) { jars('B', -W2 * 0.2, W2 * 0.2, 0.45, yy, q); });
        spots.work = { x: W2 - 2.0, z: D2 * 0.68, face: Math.PI / 2, pose: 'kneel' };
      } else if (theme === 'market') {
        bed(0xc8314a);
        var crate = function (cx, cz, yb, fruit) { bx('WD', cx - 0.45, yb, cz - 0.38, cx + 0.45, yb + 0.6, cz + 0.38, col(0xb08a5e)); bx('WD', cx - 0.47, yb + 0.25, cz - 0.4, cx + 0.47, yb + 0.33, cz + 0.4, mid);
          if (fruit) for (var q = 0; q < 6; q++) P.CL.push({ g: new T.SphereGeometry(0.13, 8, 6), m: B.M(cx - 0.27 + (q % 3) * 0.27, yb + 0.66, cz - 0.13 + Math.floor(q / 3) * 0.26), col: col(fruit) }); };
        [[0.4, 0xc8314a], [1.4, 0x9cc04a], [2.4, 0xf2a02a]].forEach(function (q) { crate(A - 0.45, -D2 * 0.15 + q[0], FT, null); crate(A - 0.45, -D2 * 0.15 + q[0], FT + 0.6, q[1]); });
        sol(A - 0.95, -D2 * 0.15, W2, -D2 * 0.15 + 2.9);
        table(W2 - 2.4, D2 * 0.55, 1.0, 2.6, 1.15, mid);   /* the counter, Bo behind it */
        var SX = W2 - 2.4, SZ = D2 * 0.55 - 0.6;   /* the scale: a post, a beam, two pans */
        P.ST.push(B.cyl(SX, 1.15, SZ, 0.18, 0.18, 0.05, 10, col(0x8a7a5a)), B.cyl(SX, 1.2, SZ, 0.03, 0.03, 0.6, 6, col(0xb59a4a)));
        P.ST.push(B.rod([SX, 1.8, SZ - 0.4], [SX, 1.8, SZ + 0.4], 0.025, col(0xb59a4a)), B.cyl(SX, 1.5, SZ - 0.4, 0.2, 0.22, 0.04, 12, col(0xc9a84a)), B.cyl(SX, 1.52, SZ + 0.4, 0.2, 0.22, 0.04, 12, col(0xc9a84a)));
        P.CL.push({ g: new T.SphereGeometry(0.12, 8, 6), m: B.M(SX, 1.62, SZ - 0.4), col: col(0xc8314a) });
        [[A - 0.5, D2 - 1.2], [A - 1.3, D2 - 0.9]].forEach(function (q) { P.CL.push({ g: new T.SphereGeometry(0.42, 9, 7), m: B.M(q[0], FT + 0.36, q[1], 0, 0, 0, 1, 0.85, 1), col: col(0xcdb57a) }); sol(q[0] - 0.42, q[1] - 0.42, q[0] + 0.42, q[1] + 0.42); });
        P.BK.push(B.cyl(-W2 + 1.2, FT, -D2 + 0.9, 0.42, 0.42, 1.0, 12, col(0x7a5233))); sol(-W2 + 0.78, -D2 + 0.48, -W2 + 1.62, -D2 + 1.32);
        shelf('B', -W2 * 0.2, W2 * 0.2, 0.45, 3, 2.2, function (yy, q) { jars('B', -W2 * 0.2, W2 * 0.2, 0.45, yy, q + 2); });
        spots.work = { x: W2 - 1.3, z: D2 * 0.55, face: -Math.PI / 2, pose: 'shop' };
      } else if (theme === 'well') {
        bed(0x5f9e4a);
        table(W2 - 0.75, D2 * 0.3, 1.0, 3.2, 1.1, dk);   /* the workbench: a vice, tools hung above */
        bx('ST', W2 - 1.1, 1.1, D2 * 0.3 + 1.0, W2 - 0.7, 1.35, D2 * 0.3 + 1.3, col(0x5a5f66));
        for (var t = 0; t < 5; t++) { var tz = D2 * 0.3 - 1.2 + t * 0.55; P.BK.push(B.rod([W2 - 0.06, 2.6, tz], [W2 - 0.06, 1.9, tz], 0.035, col(0x8b5e34))); bx('ST', W2 - 0.12, 1.85, tz - 0.12, W2 - 0.02, 1.98, tz + 0.12, col(0x6a6f76)); }
        P.ST.push(B.cyl(W2 - 0.75, 1.1, D2 * 0.3 - 0.9, 0.04, 0.04, 0.35, 6, col(0x8b5e34)), B.box(W2 - 0.95, 1.4, D2 * 0.3 - 0.95, W2 - 0.55, 1.5, D2 * 0.3 - 0.85, col(0x6a6f76)));
        [[A - 0.4, D2 - 1.0], [A - 1.15, D2 - 0.8], [A - 0.5, D2 - 1.8]].forEach(function (q, k2) { P.ST.push(B.cyl(q[0], FT, q[1], 0.32, 0.38, 0.62, 12, col([0x7a7f86, 0x6e5a40, 0x7a7f86][k2]))); P.CL.push(B.cyl(q[0], FT + 0.55, q[1], 0.33, 0.33, 0.03, 12, col(0x5a8ab0))); sol(q[0] - 0.38, q[1] - 0.38, q[0] + 0.38, q[1] + 0.38); });
        [0, 1, 2].forEach(function (k2) { P.CL.push({ g: new T.TorusGeometry(0.42 - k2 * 0.08, 0.06, 6, 18), m: B.M(-W2 + 1.1, FT + 0.08 + k2 * 0.11, -D2 + 1.0, Math.PI / 2, 0, 0), col: col(0xcdb57a) }); });
        sol(-W2 + 0.6, -D2 + 0.5, -W2 + 1.6, -D2 + 1.5);
        P.BK.push(B.rod([W2 * 0.1, HT - 0.45, -D2 * 0.15], [W2 * 0.1, HT - 1.6, -D2 * 0.15], 0.04, col(0xcdb57a)));   /* a pulley's rope from a beam */
        P.ST.push({ g: new T.TorusGeometry(0.22, 0.05, 6, 16), m: B.M(W2 * 0.1, HT - 1.75, -D2 * 0.15), col: col(0x6a6f76) });
        shelf('B', -W2 * 0.2, W2 * 0.2, 0.45, 3, 2.2, function (yy, q) { jars('B', -W2 * 0.2, W2 * 0.2, 0.45, yy, q + 4); });
        spots.work = { x: W2 - 1.9, z: D2 * 0.3, face: Math.PI / 2, pose: 'hammer' };
      } else if (theme === 'reading') {
        bed(0x8a5a9c);
        [[-0.2, 1.6], [1.6, 3.4]].forEach(function (q, k2) { shelf('R', -D2 * 0.15 + q[0], -D2 * 0.15 + q[1], 0.5, 5, 3.0, function (yy, l) { books('R', -D2 * 0.15 + q[0], -D2 * 0.15 + q[1], 0.5, yy, l * 3 + k2); }); });
        var AX = W2 - 2.3, AZ = D2 * 0.62;   /* the armchair, facing the room */
        bx('CL', AX - 0.55, FT, AZ - 0.55, AX + 0.55, 0.62, AZ + 0.55, col(0x8a5a9c)); bx('CL', AX + 0.3, FT, AZ - 0.6, AX + 0.6, 1.55, AZ + 0.6, col(0x7a4a8c));
        bx('CL', AX - 0.55, FT, AZ - 0.62, AX + 0.6, 0.95, AZ - 0.42, col(0x7a4a8c)); bx('CL', AX - 0.55, FT, AZ + 0.42, AX + 0.6, 0.95, AZ + 0.62, col(0x7a4a8c));
        sol(AX - 0.2, AZ - 0.62, AX + 0.6, AZ + 0.62);
        table(AX - 0.3, AZ - 1.3, 0.6, 0.6, 0.9, mid); P.CL.push(B.cyl(AX - 0.3, 0.9, AZ - 1.3, 0.16, 0.06, 0.45, 10, col(0xf2d39a)));   /* a side table, a lamp */
        [[0, 0x8e3b2f], [0.12, 0x2f5277], [0.24, 0xb08a3c]].forEach(function (q) { bx('CL', AX - 1.2 - 0.25, FT + q[0], AZ + 0.2 - 0.18, AX - 1.2 + 0.25, FT + q[0] + 0.11, AZ + 0.2 + 0.18, col(q[1])); });   /* a pile of books on the floor */
        P.CL.push(B.cyl(-W2 + 2.2, FT, -D2 + 1.2, 0.55, 0.55, 0.3, 14, col(0xc8784a)), B.cyl(-W2 + 3.4, FT, -D2 + 1.0, 0.5, 0.5, 0.28, 14, col(0x6d7f4a)));   /* cushions */
        shelf('B', -W2 * 0.2, W2 * 0.2, 0.45, 4, 2.6, function (yy, q) { books('B', -W2 * 0.2, W2 * 0.2, 0.45, yy, q + 7); });
        spots.work = { x: AX, z: AZ, face: -Math.PI / 2, pose: 'sit', seat: 0.62 };
      } else if (theme === 'tidy') {
        bed(0x2e8b8b);
        var CZ = -D2 * 0.05;   /* the tall clock */
        wb('WD', 'R', CZ - 0.4, CZ + 0.4, 0, 0.5, FT, 2.7, dk); P.CL.push({ g: new T.CircleGeometry(0.3, 20), m: B.M(W2 - 0.515, 2.2, CZ, 0, -Math.PI / 2, 0), col: col(0xf6efd8) });
        P.BK.push(B.rod([W2 - 0.53, 2.2, CZ], [W2 - 0.53, 2.42, CZ], 0.02, col(0x1b1b1b)), B.rod([W2 - 0.53, 2.2, CZ], [W2 - 0.53, 2.2, CZ + 0.16], 0.02, col(0x1b1b1b)));
        bx('ST', W2 - 0.54, 0.6, CZ - 0.04, W2 - 0.51, 1.5, CZ + 0.04, col(0xc9a84a)); P.ST.push({ g: new T.SphereGeometry(0.12, 8, 6), m: B.M(W2 - 0.53, 0.55, CZ, 0, 0, 0, 0.4, 1, 1), col: col(0xc9a84a) });
        sol(W2 - 0.5, CZ - 0.4, W2, CZ + 0.4);
        var RX = -W2 + 2.6, RZ = zH + 1.9;   /* the rocking chair by the hearth */
        bx('WD', RX - 0.4, 0.62, RZ - 0.4, RX + 0.4, 0.7, RZ + 0.4, mid); bx('WD', RX - 0.4, 0.7, RZ + 0.32, RX + 0.4, 1.75, RZ + 0.4, mid);
        [-0.35, 0.35].forEach(function (dx) { P.WD.push({ g: new T.TorusGeometry(0.85, 0.04, 5, 16, 1.2), m: B.M(RX + dx, 0.95, RZ, 0, Math.PI / 2, -Math.PI / 2 - 0.6), col: dk }); bx('WD', RX + dx - 0.03, 0.2, RZ - 0.3, RX + dx + 0.03, 0.62, RZ - 0.24, dk); bx('WD', RX + dx - 0.03, 0.2, RZ + 0.3, RX + dx + 0.03, 0.62, RZ + 0.36, dk); });
        bx('CL', RX - 0.35, 0.7, RZ - 0.35, RX + 0.35, 0.76, RZ + 0.3, col(0x2e8b8b)); sol(RX - 0.45, RZ - 0.5, RX + 0.45, RZ + 0.5);
        P.BK.push(B.rod([dw / 2 + 0.55, FT, D2 - 0.12], [dw / 2 + 0.75, 2.0, D2 - 0.3], 0.035, col(0x8b5e34)));   /* the broom by the door */
        P.CL.push({ g: new T.ConeGeometry(0.18, 0.5, 8), m: B.M(dw / 2 + 0.53, FT + 0.22, D2 - 0.12, 0, 0, 0.1), col: col(0xd9b26a) });
        bx('WD', dw / 2 + 1.1, FT, D2 - 0.55, dw / 2 + 2.3, 0.9, D2 - 0.05, mid); P.ST.push(B.cyl(dw / 2 + 1.5, 0.9, D2 - 0.3, 0.12, 0.1, 0.2, 8, col(0x5a8ab0)));   /* a neat bench for the boots */
        sol(dw / 2 + 0.4, D2 - 0.6, dw / 2 + 2.3, D2);
        shelf('B', -W2 * 0.2, W2 * 0.2, 0.45, 3, 2.2, function (yy, q) { jars('B', -W2 * 0.2, W2 * 0.2, 0.45, yy, q + 1); });
        spots.work = { x: W2 * 0.25, z: D2 * 0.1, face: Math.PI, pose: 'sweep' };
      } else if (theme === 'sky') {
        bed(0x2f3a72);
        var TZ2 = D2 * 0.38, TXp = W2 - 1.25;   /* the telescope on its tripod, at the right window */
        [[0, -0.4], [0.35, 0.25], [-0.35, 0.25]].forEach(function (q) { P.BK.push(B.rod([TXp + q[1], FT, TZ2 + q[0]], [TXp, 1.55, TZ2], 0.035, col(0x6e4529))); });
        P.ST.push(B.rod([TXp - 0.55, 1.4, TZ2], [TXp + 0.6, 2.1, TZ2], 0.11, col(0xc9a84a)), B.rod([TXp - 0.7, 1.32, TZ2], [TXp - 0.5, 1.44, TZ2], 0.06, col(0x3a3a3a)));
        sol(TXp - 0.5, TZ2 - 0.5, TXp + 0.5, TZ2 + 0.5);
        var chart = function (side, a, yy, w0, h0) { wb('CL', side, a - w0 / 2, a + w0 / 2, 0.01, 0.03, yy, yy + h0, col(0x1d2f5a)); for (var q = 0; q < 9; q++) { var aa = a - w0 / 2 + 0.12 + ((q * 37) % 10) / 10 * (w0 - 0.24), yq = yy + 0.12 + ((q * 53) % 10) / 10 * (h0 - 0.24); wb('CL', side, aa, aa + 0.06, 0.03, 0.04, yq, yq + 0.06, col(0xf6efd8)); } };
        chart('R', -D2 * 0.1, 1.5, 1.2, 0.9); chart('R', D2 * 0.75, 1.6, 0.9, 0.7); chart('B', 0, 2.5, 1.4, 0.8);
        P.CL.push({ g: new T.SphereGeometry(0.32, 12, 9), m: B.M(-W2 + 1.6, 1.42, -D2 + 1.2), col: col(0x3f6e8c) }); P.BK.push(B.rod([-W2 + 1.6, FT, -D2 + 1.2], [-W2 + 1.6, 1.12, -D2 + 1.2], 0.05, dk));
        P.ST.push({ g: new T.TorusGeometry(0.36, 0.02, 4, 20), m: B.M(-W2 + 1.6, 1.42, -D2 + 1.2, 0, Math.PI / 2, 0.4), col: col(0xc9a84a) }); sol(-W2 + 1.2, -D2 + 0.8, -W2 + 2.0, -D2 + 1.6);
        shelf('B', -W2 * 0.2, W2 * 0.2, 0.45, 3, 1.9, function (yy, q) { books('B', -W2 * 0.2, W2 * 0.2, 0.45, yy, q + 11); });
        spots.work = { x: TXp - 1.15, z: TZ2, face: Math.PI / 2, pose: 'look' };
      } else {   /* a lived-in-but-quiet room: a dresser, shelves, a chest, a chair by the cold hearth */
        bx('WD', A - 0.55, FT, -D2 * 0.2, A, 1.3, -D2 * 0.2 + 1.8, mid); [0.45, 0.85].forEach(function (yy) { bx('WD', A - 0.58, yy, -D2 * 0.2 + 0.1, A - 0.55, yy + 0.3, -D2 * 0.2 + 1.7, dk); });
        sol(A - 0.6, -D2 * 0.2, W2, -D2 * 0.2 + 1.8);
        bx('WD', W2 - 1.8, FT, -D2 + 0.3, W2 - 0.3, 0.75, -D2 + 1.1, col(0x7a5233)); bx('ST', W2 - 1.85, 0.6, -D2 + 0.28, W2 - 0.25, 0.68, -D2 + 1.12, col(0x6a6f76)); sol(W2 - 1.85, -D2 + 0.3, W2 - 0.25, -D2 + 1.1);
        bx('WD', -W2 + 2.2, 0.6, zH + 1.6, -W2 + 2.9, 0.68, zH + 2.3, mid); bx('WD', -W2 + 2.2, 0.68, zH + 2.22, -W2 + 2.9, 1.6, zH + 2.3, mid); sol(-W2 + 2.1, zH + 1.5, -W2 + 3.0, zH + 2.4);
        [[-W2 + 2.25, zH + 1.65], [-W2 + 2.85, zH + 1.65], [-W2 + 2.25, zH + 2.25], [-W2 + 2.85, zH + 2.25]].forEach(function (q) { bx('WD', q[0] - 0.04, FT, q[1] - 0.04, q[0] + 0.04, 0.6, q[1] + 0.04, dk); });
        shelf('B', -W2 * 0.2, W2 * 0.2, 0.45, 3, 2.2, function (yy, q) { if (q % 2) books('B', -W2 * 0.2, W2 * 0.2, 0.45, yy, q + i); else jars('B', -W2 * 0.2, W2 * 0.2, 0.45, yy, q + i); });
        P.ST.push(B.cyl(A - 0.3, 1.3, -D2 * 0.2 + 0.9, 0.12, 0.09, 0.4, 8, col(0x5a8ab0))); P.CL.push({ g: new T.SphereGeometry(0.18, 8, 6), m: B.M(A - 0.3, 1.82, -D2 * 0.2 + 0.9), col: col(0xe0533c) });   /* a vase of flowers */
      }
      spots.hearth = { x: -W2 + 2.4, z: zH - 0.3, face: -Math.PI / 2, pose: 'listen' };
      if (BED) spots.bed = { x: BED.x, z: BED.z, top: BED.top };
      /* the fire's light baked in (warm near the hearth, dimmer in the far corners); a quiet home's hearth is low */
      var gk = warm ? 0.6 : 0.3;
      var glow = function (x, y2, z) { var d2 = (x - FIRE.x) * (x - FIRE.x) + (y2 - 0.8) * (y2 - 0.8) + (z - FIRE.z) * (z - FIRE.z); return 0.94 + gk * Math.exp(-d2 / 10); };
      var hg = new T.Group(); hg.name = 'homes784:hall' + i;
      var x0 = h.x, z0 = h.z; hg.position.set(x0, y, z0); hg.rotation.y = rot; hg.scale.setScalar(HS);
      var meshes = [], add = function (geo, mat, nm) { var m = new T.Mesh(geo, mat); m.name = 'homes784:' + nm; hg.add(m); meshes.push(m); return m; };
      add(B.merge(P.WL, glow), wallMatOf(h), 'walls');
      [['wood', 'WD'], ['logs', 'BK'], ['stone', 'ST'], ['cloth', 'CL']].forEach(function (e) { if (P[e[1]].length) add(B.merge(P[e[1]], glow), MAT[e[0]], e[0]); });
      var slab = add(B.merge([B.box(-W2 - 0.2, HT, -D2 - 0.2, W2 + 0.2, HT + 0.3, D2 + 0.2, ceil)], glow), MAT.wood, 'ceiling');
      add(B.merge(P.WN), WIN, 'windows');
      meshes.forEach(function (m) { m.castShadow = false; m.receiveShadow = m !== meshes[meshes.length - 1]; });
      hg.visible = false; scene.add(hg);
      /* the door's hinge (an empty pivot: freeIn reads it; the leaf is drawn shut in the wood) */
      var pivot = new T.Group(); pivot.position.set(-dw / 2, 0, D2); hg.add(pivot);
      /* the walk's record (what walkStep, roomOf, freeIn, moveIn, floorOf, the camera and the HUD read) */
      var solid = function (lx, lz) { for (var q = 0; q < SOL.length; q++) { var b = SOL[q]; if (lx > b[0] - 0.18 && lx < b[2] + 0.18 && lz > b[1] - 0.18 && lz < b[3] + 0.18) return true; }
        var st = rec.home784.here; if (st && !st.asleep) { var sp = st.spot; if (Math.abs(lx - sp.x) < 0.55 && Math.abs(lz - sp.z) < 0.55) return true; } return false; };
      var camL = { x: 0, z: D2 - 1, t: -1 }, CAMY = Math.min(HT - 1.4, 2.5);   /* Su 43: lower than the hermits' (the first look in was straight down on her head) */
      var camAim = function () {   /* Su 43: a room camera on the door's side of her, looking in (the townsfolk's houses' way): it slides with her, never turns
           with her, so the stick always means the same thing in the room (a camera trailing behind her yaw sat on her head at the back wall: the stick went wild) */
        var S = late().S; if (camL.t === S.t) return camL; camL.t = S.t;
        var dx = S.pos.x - x0, dz = S.pos.z - z0, lx = (dx * c - dz * s) / HS, lz = (dx * s + dz * c) / HS;
        camL.x = clamp(lx * 0.55, -W2 + 0.9, W2 - 0.9); camL.z = clamp(lz + 3.4, -D2 + 0.8, D2 - 0.4); return camL;
      };
      var rec = { i: 100 + i, g: hg, x: x0, z: z0, y: y, rot: rot, w: W, d: D, ht: HT, pivot: pivot, openT: 0, dw: dw, dh: dh, solid: solid, lookUp: 0.45, dims: { FT: FT },
        get treat() { return h.treat; }, get treatTaken() { return h.treatTaken; }, set treatTaken(v) { h.treatTaken = v; },
        get name() { return who ? who + '\'s home' : 'a quiet home'; },
        cam: { get x() { return camAim().x; }, get z() { return camAim().z; }, y: CAMY },
        home784: { i: i, house: h, owner: ownerIx, who: who, theme: theme, spots: spots, fire: FIRE, warm: warm, here: null, cyc: 0, slab: slab, W: W, D: D, HT: HT } };
      /* the house's treat moves into the hall (the walk finds it on the hall's own d: local (0, 0.7, -d/4), as it was in the house) */
      if (h.treat) { if (h.treat.parent) h.treat.parent.remove(h.treat); h.treat.position.set(0, 0.7, -D / 4); hg.add(h.treat); }
      return rec;
    }

    /* ── the frame ── */
    var LATE = null;
    function late() { return LATE || (LATE = o.late()); }
    var dead = false, log = [], cur = null, fadeAt = -1, label = '', winHex = -1, lampK = -1;
    var stats = { enters: 0, exits: 0, outs: 0, arrivals: 0, gifts: 0, beds: 0, wakes: 0, moves: 0, talks: 0 };
    var tmpC = new T.Color(), DAYC = new T.Color(0xeaf4ff), DUSK = new T.Color(0xffc58a), NIGHT = new T.Color(0x1a2a55);
    function fail(e) { dead = true; API.error = String(e && e.message || e); try { console.warn('homes784 stopped: ' + API.error); } catch (x) { /* fine */ } }
    function world(r, lx, lz) { var c = Math.cos(r.rot), s = Math.sin(r.rot); return { x: r.x + (lx * c + lz * s) * HS, z: r.z + (-lx * s + lz * c) * HS }; }
    function local(r, x, z) { var dx = x - r.x, dz = z - r.z, c = Math.cos(r.rot), s = Math.sin(r.rot); return { x: (dx * c - dz * s) / HS, z: (dx * s + dz * c) / HS }; }
    function name(t, who) { return String(t).replace(/\{name\}/g, late().NAME || 'Rouge').replace(/\{who\}/g, who || ''); }
    function fadeIn() { var Lt = late(); if (Lt.cine && Lt.cine.fade) { Lt.cine.fade(0.9); fadeAt = performance.now(); } }
    function sleepy(c) { return c >= 2100; }   /* in bed once the night is deep (the village goes in at 2040); up at dawn (the clock wraps to 0) */
    function stateLine() {
      var Lt = late(), S = Lt.S;
      if (Lt.hawkWon && Lt.hawkWon()) return LINES.state.hawk;
      if ((S.level || 1) >= STRONG) return LINES.state.strong;
      if (S.nestDone && Lt.chick && Lt.chick()) return LINES.state.chick;
      if (!S.nestDone) return LINES.state.noChick;
      return null;
    }
    function deedLine(H7) {   /* what she did for THEM first (the newest tool she brought them), else for the village (its builds) */
      var Lt = late(), mk = (Lt.marks && Lt.marks()) || [];
      for (var q = mk.length - 1; q >= 0; q--) { var m = mk[q]; if (m && m.who === H7.owner) { var a = m.act === 'crank' ? 'well' : m.act; if (LINES.deed[a]) return LINES.deed[a]; } }
      var b = Lt.built ? Lt.built() : 0; return b >= 3 ? LINES.built : b >= 1 ? LINES.built1 : null;
    }
    function seasonLine(who) { var Lt = late(), s = null; try { s = Lt.season ? Lt.season() : null; } catch (e) { s = null; } var t = LINES.season[who]; return (t && s && t[s]) || null; }
    /* by day a ring house's door opens to her as she walks up to it; at night it stays shut (#127's words say who is home) */
    function door(h) {
      if (dead) return false; var e = byHouse.get(h); if (!e) return false;
      if (late().S.clock >= 2040) return false; h.openT = Math.max(h.openT, 2.5); return true;
    }
    /* she steps in through the house's door (walkStep calls this in the frame she does: the hall is built and drawn at once, under the dark fade) */
    function enter(h) {
      if (dead) return false;
      try {
        var e = byHouse.get(h); if (!e) return false;
        var Lt = late(), S = Lt.S;
        if (cur) leave(cur);
        var r = got(e), p = world(r, 0, r.d / 2 - 3.0);   /* a few steps in, so the camera has room behind her (the door is at her back) */
        S.pos.x = p.x; S.pos.z = p.z; S.pos.y = Lt.floorOf(r) + Lt.standOf(); S.inside = r; S.camCut = true;
        show(r); fadeIn(); stats.enters++;
        var H7 = r.home784;
        if (H7.owner < 0) { quiet(r, LINES.quiet[(H7.i >> 1) % LINES.quiet.length]); Lt.hud(); return true; }
        var n = Lt.npcs[H7.owner];
        if (S.clock >= 2040 && n.state !== 'inside' && Lt.homeNow) Lt.homeNow(n);   /* the village goes in at 2040: a door opened at night finds them in */
        if (n.state !== 'inside') { quiet(r, LINES[H7.who].out); Lt.hud(); return true; }
        home(r, n); Lt.hud();
        return true;
      } catch (err) { fail(err); return false; }
    }
    function quiet(r, line) { var Lt = late(); log.push('quiet: ' + line); if (log.length > 60) log.splice(0, log.length - 60); if (Lt.toast) Lt.toast(name(line), 3400); }
    function show(r) {
      cur = r; r.g.visible = true; var F = r.home784.fire, p = world(r, F.x, F.z);
      fire.position.set(p.x, r.y + F.y * HS, p.z); fire.userData.k = r.home784.warm ? 1.0 : 0.55; wg.visible = true;
    }
    /* the owner, found at home: kept exactly as the game left them (put back on the way out), then placed at their own spot by the clock */
    function home(r, n) {
      var H7 = r.home784;
      var keep = { x: n.g.position.x, y: n.g.position.y, z: n.g.position.z, yaw: n.yaw, order: n.g.rotation.order, rx: n.g.rotation.x, rz: n.g.rotation.z };
      H7.here = { n: n, spot: null, key: '', asleep: false, keep: keep, t: 0, greet: 0, said: 0 };
      place(r, H7.here, true);
      n.g.visible = true; n.t = Math.max(n.t, 3);
    }
    function want(H7) { var c = late().S.clock; return sleepy(c) && H7.spots.bed ? 'bed' : c >= 1800 ? 'hearth' : 'work'; }
    function place(r, hr, hello) {
      var H7 = r.home784, n = hr.n, key = want(H7), sp = H7.spots[key] || H7.spots.hearth, Lt = late(), p = world(r, sp.x, sp.z), floor = Lt.floorOf(r);
      hr.key = key; hr.spot = sp; hr.asleep = key === 'bed';
      if (hr.asleep) {   /* lying on his or her back: head to the headboard, face up (YXZ: the yaw first) */
        n.g.rotation.order = 'YXZ'; n.yaw = r.rot; n.g.rotation.set(-Math.PI / 2, n.yaw, 0);
        n.g.position.set(p.x, floor + (sp.top - 0.1) * HS + 0.18, p.z); n.say784 = '💤'; hr.greet = 0;
      } else {
        n.g.rotation.order = hr.keep.order; n.g.rotation.x = hr.keep.rx; n.g.rotation.z = hr.keep.rz;
        n.yaw = r.rot + sp.face; n.g.rotation.y = n.yaw; n.g.position.set(p.x, floor + (sp.pose === 'sit' ? 0.25 : 0), p.z);
        if (hello) { n.say784 = '👋'; hr.greet = 2.6; log.push(H7.who + ' (greets, ' + key + ')'); } else n.say784 = null;
      }
    }
    /* she has left (the walk's out-branch calls exit; the tick also catches every other way out: a sleep, a teleport, a load) */
    function restore(hr) {
      var n = hr.n, k = hr.keep;
      n.say784 = null; n.g.rotation.order = k.order; n.g.rotation.set(k.rx, k.yaw, k.rz); n.yaw = k.yaw; n.g.position.set(k.x, k.y, k.z);
    }
    function leave(r) {
      if (!r) return;
      var H7 = r.home784, hr = H7.here;
      if (hr) { restore(hr); if (hr.n.state === 'inside') hr.n.g.visible = false; H7.here = null; }   /* back to what they were: home, not drawn */
      r.g.visible = false; if (cur === r) { cur = null; wg.visible = false; }
      drop(H7.slot);
    }
    function exit(r) { if (dead) return; try { leave(r); fadeIn(); stats.exits++; var S = late().S; stats.outAt = [+S.pos.x.toFixed(2), +S.pos.z.toFixed(2)]; } catch (e) { fail(e); } }   /* outAt: where the door set her down (the bench) */
    /* a tool handed to them at home: they go straight out of the door to use it (the game's own plan, from their doorstep) */
    function out(r, hr) {
      var Lt = late(), n = hr.n, h = r.home784.house; restore(hr); n.g.visible = true; h.openT = Math.max(h.openT, 3); r.home784.here = null; stats.outs++;
      log.push(r.home784.who + ' goes out to use it'); if (Lt.toastNext) Lt.toastNext(r.home784.who + ' hurries out of the door to use it.', 3000); else if (Lt.toast) Lt.toast(r.home784.who + ' hurries out of the door to use it.', 3000);   /* 782 #132: after her thanks, never over it */
    }
    function near() {
      var Lt = late(), S = Lt.S; if (!cur || S.inside !== cur || S.mode !== 'walk' || S.talking) return null;
      var hr = cur.home784.here; if (!hr || !hr.spot) return null;
      var q = local(cur, S.pos.x, S.pos.z), sp = hr.spot, d = Math.hypot(q.x - sp.x, q.z - (hr.asleep ? sp.z - 1.2 : sp.z));
      return d < 2.6 ? hr : null;
    }
    function button(el) {
      if (dead) return false;
      try { var hr = near(); label = hr ? '💬 Talk' : ''; if (!label) return false;
        if (el.textContent !== label) el.textContent = label; if (el.hidden) el.hidden = false; return true; } catch (e) { fail(e); return false; }
    }
    /* Talk: a hello by the hour first, then what she has done (her deeds, theirs to thank), the season, then the hour's own lines, one a press.
       The first talk with each of them at home on a day gives a coin (the loop: DRAFT 1). Asleep: a mumble. */
    function press() {
      if (dead) return false;
      try {
        var Lt = late(), S = Lt.S, hr = near(); if (!hr) return false;
        var H7 = cur.home784, e = H7.slot, L = LINES[H7.who], n = hr.n, band = hr.asleep ? 'night' : bandOf(S.clock), line;
        if (hr.asleep) line = L.night[(e.cyc++) % L.night.length];
        else if (!hr.said) line = L.greet[band] || L.greet.day;
        else {
          var list = [stateLine(), deedLine(H7), seasonLine(H7.who)].filter(Boolean).concat(L[band] || L.day);
          line = list[(e.cyc++) % list.length];
        }
        hr.said++; stats.talks++; line = name(line);
        log.push(H7.who + ' (' + band + '): ' + line); if (log.length > 60) log.splice(0, log.length - 60);
        var day = Lt.day ? Lt.day() : 0, seen = S.seen = S.seen || {}, got = seen.home784 = seen.home784 || {}, pay = !hr.asleep && got[H7.who] !== day && !!Lt.coin;
        n.say784 = hr.asleep ? '💤' : null;
        var lines = [[H7.who, line]]; if (pay) lines.push([H7.who, name(LINES.gift, H7.who)]);
        Lt.say(lines, pay ? function () { got[H7.who] = day; stats.gifts++; try { Lt.coin(1, H7.who + '\'s thanks', n.g.position); } catch (x) { /* the talk stands */ } if (Lt.save) Lt.save(); } : null, { g: n.g });
        return true;
      } catch (err) { fail(err); return false; }
    }
    function tick(dt) {
      if (dead) return;
      try { step(dt); } catch (e) { fail(e); }
    }
    function step(dt) {
      var Lt = late(), S = Lt.S;
      if (fadeAt >= 0 && Lt.cine) { var u = (performance.now() - fadeAt) / 420; if (u >= 1) { Lt.cine.fade(0); fadeAt = -1; } else Lt.cine.fade(0.9 * (1 - u) * (1 - u)); }
      if (cur && S.inside !== cur) leave(cur);   /* every way out the walk does not see (sleep, a teleport, a load) */
      if (!cur) return;
      var r = cur, H7 = r.home784, hr = H7.here, na = Lt.nightAmt();
      /* the window's light: daylight, dusk's orange, the night's blue; the halls' lamp a touch brighter at night */
      var c = S.clock; tmpC.copy(DAYC); if (c >= 1800 && c < 2160) tmpC.lerp(DUSK, Math.min(1, (c - 1800) / 200)); tmpC.lerp(NIGHT, na);
      var hx = tmpC.getHex(); if (hx !== winHex) { WIN.color.copy(tmpC); winHex = hx; }
      var lk = Math.round((1 + 0.35 * na) * 100) / 100; if (lk !== lampK) { lampK = lk; var ek = 0.24 * na; OWN.forEach(function (m) { m.color.setRGB(lk, lk, lk); if (m.emissive) m.emissive.setRGB(ek, ek * 0.6, ek * 0.3); }); }   /* Su 43: and the lamp's warmth at night (an emissive tint: a uniform, no new program; the night's moonlight alone left the room cold and grey) */
      fire.scale.setScalar(fire.userData.k * (1 + 0.08 * Math.sin(S.t * 13) + 0.05 * Math.sin(S.t * 7.3)));
      if (!hr) {   /* the owner comes home while she is in: found in the doorway's light, then at their own spot, surprised and glad */
        if (H7.owner < 0) return;
        var n0 = Lt.npcs[H7.owner];
        if (n0.state === 'inside' && !n0.g.visible && !n0.hog) { home(r, n0); stats.arrivals++; if (!H7.here.asleep) { n0.say784 = '😮'; H7.here.greet = 2.6; H7.here.said = 1; var hl = name(LINES.home[H7.who]); log.push(H7.who + ' (home): ' + hl); if (Lt.toast) Lt.toast(H7.who + ': ' + hl, 3600); }   /* said, never a talk that holds her (the stick stays hers) */ }
        return;
      }
      var n = hr.n; hr.t += dt;
      if (n.state === 'act') { if (n.tool) { out(r, hr); return; } n.state = 'inside'; n.t = Math.max(n.t, 3); }   /* a delivery's thanks ends in 'act': with the tool, out to use it */
      if (n.state === 'inside') { n.t = Math.max(n.t, 3); n.g.visible = true; } else return;   /* a song or a flinch: the game's own state runs it */
      if (want(H7) !== hr.key && !S.talking) { place(r, hr, false); fadeIn(); stats.moves++; if (hr.asleep) stats.beds++; else if (hr.key === 'work') stats.wakes++; }   /* to the hearth at dusk, to bed in the deep night, up at dawn */
      if (hr.asleep) { Lt.pose(n, 'listen', dt, 0); n.say784 = '💤'; return; }
      var me = S.pos, d = Math.hypot(me.x - n.g.position.x, me.z - n.g.position.z), talking = S.talking && d < 8;
      if (hr.greet > 0) { hr.greet -= dt; if (hr.greet <= 0 && n.say784 && n.say784 !== '💤') n.say784 = null; }
      var sp = hr.spot, look = talking || hr.greet > 0 || d < 5.5;
      if (look && sp.pose !== 'sit') Lt.turnTo(n, me.x, me.z, dt); else if (sp.pose !== 'sit') { var f = world(r, sp.x + Math.sin(sp.face), sp.z + Math.cos(sp.face)); Lt.turnTo(n, f.x, f.z, dt); }
      var kind = talking ? 'talk' : hr.greet > 1.0 && sp.pose !== 'sit' ? 'wave' : sp.pose === 'sit' ? 'sit' : d < 4 ? 'listen' : sp.pose;
      Lt.pose(n, kind, dt, 0);
    }
    function peek() {
      var Lt = late(), S = Lt.S, hr = cur && cur.home784.here;
      return { ready: !dead, err: API.error, inside: !!(cur && S.inside === cur), hall: cur ? cur.home784.i : null, label: label, log: log.slice(), stats: Object.assign({}, stats), buildMs: buildMs,
        here: hr ? { who: hr.n.name, asleep: hr.asleep, key: hr.key, vis: hr.n.g.visible, state: hr.n.state, say: hr.n.say784 || null, at: [+hr.n.g.position.x.toFixed(2), +hr.n.g.position.y.toFixed(2), +hr.n.g.position.z.toFixed(2)], rx: +hr.n.g.rotation.x.toFixed(3), spot: hr.spot, spotW: hr.spot ? (function () { var w = world(cur, hr.spot.x, hr.spot.z); return [w.x, w.z]; })() : null } : null,
        built: halls.filter(function (e) { return !!e.rec; }).map(function (e) { return e.i; }), shown: halls.filter(function (e) { return e.rec && e.rec.g.visible; }).map(function (e) { return e.i; }),
        inScene: halls.filter(function (e) { return e.rec && e.rec.g.parent; }).length, win: '#' + WIN.color.getHexString(), coins: Object.assign({}, (S.seen && S.seen.home784) || {}),
        halls: halls.map(function (e) { var h = e.h, f = world(e, 0, e.d / 2 - 0.9); return { i: e.i, who: e.who, theme: e.theme, w: e.w, d: e.d, ht: e.ht, hw: h.w, hd: h.d, hht: h.ht, y: +e.y.toFixed(2), hy: +h.y.toFixed(2), x: e.x, z: e.z, rot: e.rot, inAt: [+f.x.toFixed(2), +f.z.toFixed(2)], treat: !!h.treat, builds: e.builds }; }) };
    }
    function where(i, lx, lz) { var p = world(halls[i], lx, lz); return [p.x, p.z]; }
    var inst = { halls: halls, hallOf: function (h) { var e = byHouse.get(h); return e ? e.rec : null; }, has: function (h) { return byHouse.has(h); }, door: door, enter: enter, exit: exit, leave: leave,
      tick: tick, button: button, press: press, peek: peek, where: where, log: log };
    return inst;
  }

  API.create = create; API.LINES = LINES; API.FAV = FAV; API.LIFT = LIFT; API.GROW = GROW;
  return API;
})();
