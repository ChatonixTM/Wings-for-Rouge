/* world-animals.js - BOARD 714 (extended), ANIMALS ACROSS THE REAL WORLD (Wings for Rouge). Trunks, Nov 4 2026.
   Marth, Nov 4 2026, verbatim: "focus on the world building please and the incorporation of the npc's and the quests and the animals. Why aren't the
   animals added yet?"  Row 714's own words (Oct 28): "were gonna involve / include animals on land, air, and water, some that are nice, and  passive,
   some that investigate you, sometimes attack, some are mostly malicious."

   WHAT ROUGE SEES: wherever she flies in the real world (the travel zone), the animals that really live there, by region and habitat: dolphin pods
   porpoising, humpback whales surfacing, sea turtles, reef sharks and fish schools by ocean; gulls, pelicans, egrets and bald eagles over coasts,
   wetlands and Tahoe; zebra, giraffe and elephant herds on Africa's savanna; camels in the Old World's deserts; deer and bears in temperate forest;
   elk and moose in the boreal; Adelie penguins and seals on Antarctica's coast; goats, iguanas and mongooses in the Caribbean; trout in Lake Tahoe;
   and at Dunn's River, egrets, pelicans and gulls over the falls and fish in its pools. The same animals in the same spots every visit.

   REUSED, NOT REWRITTEN (MBAEEMP): animals714.js's KIT: its bodies (dolphin, shark, turtle, gull, pelican, mongoose, the reef fish), its rigs and its
   pose functions (every new four-legged kind wears the mongoose's eight-bone rig and is posed by poseMongoose; every new bird wears buildBird's
   seven-bone rig and is posed by poseBird; every new swimmer is lofted and posed by poseSwim) and its four temperaments (WFR_ANIMALS.T);
   world-people.js's seeds (the same hash and rng) and its one-program instancing; WFR_WORLD (world712-frame.js) for every lat/lon; the travel
   streamer's own drawn ground (H) and heights; the Earth's real colour already painted on it (world-imagery.js, NASA Blue Marble); world-features.js's
   OpenStreetMap water, landcover and towns (when it is there) as a veto.
   NEW (nothing on the shelf: CC0 models in models.js are the island's; procedural, in the kit's own flat-shaded style): whale, seal, penguin, deer,
   elk, moose, black bear, brown bear, zebra, giraffe, elephant, camel, goat, iguana, egret, bald eagle, trout, pool fish. Licence: our own code.

   HOW (cheap): cells of 0.02 deg latitude (about 2.2 km); a cell near her is classified once the ground under it is final (its height, its sea
   depth, its latitude, its real colour, its region) and given herds, pods and flocks from a generator seeded by the cell's key; far cells are
   dropped (kept 400 in memory: a return is the same). Each kind is ONE InstancedMesh per pose (moving / resting): posed on the processor once
   (the kit's pose), drawn for every animal of that kind. One material program for all of it (Lambert + a sea tint below the water line, so a pod
   under the surface reads as dark shapes in the water), compiled at load. Behaviour, light and fair: passive kinds flee when she comes low and
   near, curious ones come to look (dolphins escort her when she skims the sea), "sometimes" kinds turn to face her, the malicious shark circles
   under her. The fight core (animals714's step) is never run out here: she flies 30 m+ above the ground, out of every land strike's reach.

   THE PAGE HANDS IT (tools/wiring/wire-world-animals.js): WFR_WORLDANIMALS.init(ctx) once, tick(dt) each frame (above the travel branch).
   ctx = { THREE, scene, renderer, camera, S, TR: TRAVEL712, H: travel712H, D: DUNNS712, dG: dunns712G, dData: dunns712Data, WATER, classic }
   Every number and every name is DRAFT for Marth's pen. */
window.WFR_WORLDANIMALS = (function () {
  'use strict';
  var C = { CELL: 0.02, R_SPAWN: 1500, R_DROP: 2400, AGL_MAX: 2500, POP: 1, POP_MS: 0.6, IMG_WAIT: 4, CAP: 128, LAYER: 7, KEEP: 400, LAND_MIN: 2, SLOPE: 0.45,
    FLEE_R: 60, FLEE_Y: 70, RUN: 2.6, FLEE_MAX: 30, NOTICE: 80, SHARK_Y: 50, LOAD_MAX: 6, ESC_R: 240, ESC_Y: 45, ESC_V: 9, ESC_MAX: 450, TAHOE_LV: 1897.6, WATER_COL: [0.08, 0.27, 0.37] };
  var D2R = Math.PI / 180, TAU = Math.PI * 2;
  var X = null, KIT = null, PR = null;
  var st = { inited: false, enabled: true, fault: null, t: 0, frame: 0, cells: new Map(), act: [], mat: null, keep: null, root: null, kinds: {}, models: 0,
    programsInit: null, programsAt: null, ms: [], msMax: 0, pops: 0, drops: 0, waits: 0, img: 0, tint: 0, feat: new Map(), featTiles: 0, featHooked: false, featPoll: 0, featFault: null,
    dunns: null, mode: 'off', her: { x: 0, y: 0, z: 0, agl: 0, lat: 0, lon: 0 }, flees: 0, escorts: 0, faces: 0, circles: 0, hook: false, placeN: 0, built: [] };

  /* ---------- seeds: world-people.js's, line for line (the same place, the same animals, on every visit and every phone) ---------- */
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function inBox(lat, lon, B) { return lat >= B[0] && lat <= B[1] && lon >= B[2] && lon <= B[3]; }

  /* ---------- the real regions (rough boxes, DRAFT for Izumi's atlas check) ---------- */
  var RG = { africa: [-35, 37, -18, 52], caribbean: [10, 27, -90, -59], namerica: [15, 75, -170, -52], samerica: [-56, 13, -82, -34], europe: [35, 72, -25, 45], tahoe: [38.9, 39.28, -120.2, -119.9],
    australia: [-44, -10, 112, 155], nz: [-48, -34, 165, 179], congo: [-6, 6, 9, 31], sichuan: [27.5, 34.5, 101, 106], india: [6, 30, 68, 92], japan: [30, 46, 129, 146], crane: [33, 54, 120, 146],
    plains: [30, 50, -106, -94], florida: [24.5, 31, -87.6, -80], amazon: [-16, 6, -79, -44], andes: [-40, 10, -82, -62] };
  var PACIFIC = [[30, 42, -126, -116], [-46, -3, -82, -70], [-2, 1, -92, -89], [-40, -30, 113, 150], [-48, -34, 165, 179]];   // the sea lions' coasts: California, Peru and Chile, the Galapagos, southern Australia, New Zealand
  function regionOf(lat, lon) {   // the continent a point is on (rough boxes, DRAFT): its animals are its own
    if (lat > 66) return 'arctic'; if (lat < -60) return 'antarctic'; if (inBox(lat, lon, RG.australia)) return 'australia'; if (inBox(lat, lon, RG.nz)) return 'oceania'; if (lon < -30) return 'americas';
    if (inBox(lat, lon, RG.africa) && lat < 36 && !(lat > 29 && lon > 32)) return 'africa'; if (inBox(lat, lon, RG.europe)) return 'europe'; return 'asia'; }
  var DESERTS = [[16, 31, -16, 33], [12, 32, 35, 60], [37, 47, 88, 115], [-32, -19, 118, 142], [24, 29.5, 69, 73.5]];   // Sahara, Arabia, the Gobi, Australia's interior, the Thar (camels' real range)
  function americas(lat, lon) { return lon < -30; }

  /* ---------- 1. THE KINDS: reused bodies first, then the new ones (built in the kit's own flat-shaded style) ---------- */
  var K = {
    dolphin: { name: 'Bottlenose dolphin', kit: 'dolphin', realm: 'sea', temper: 'curious', y: -0.9, depth: 8, v: 3.6, loop: [70, 160], lag: 0.05, side: 3, leap: true },
    shark: { name: 'Reef shark', kit: 'shark', realm: 'sea', temper: 'malicious', y: -2.6, depth: 8, v: 1.5, loop: [40, 90], lag: 0.4, side: 6 },
    turtle: { name: 'Green sea turtle', kit: 'turtle', realm: 'sea', temper: 'passive', y: -0.55, depth: 3, v: 0.7, loop: [20, 45], lag: 0.5, side: 8 },
    reeffish: { name: 'Sergeant major', make: 'reeffish', sp: 'dolphin', realm: 'sea', temper: 'passive', y: -1.4, depth: 3, v: 0.9, loop: [8, 18], lag: 0.04, side: 1.2, school: true },
    whale: { name: 'Humpback whale', make: 'whale', sp: 'dolphin', realm: 'sea', temper: 'passive', y: -4.5, depth: 30, v: 2.0, loop: [180, 380], lag: 0.06, side: 25, surface: true },
    seal: { name: 'Seal', make: 'seal', sp: 'dolphin', realm: 'sea', also: 'land', coast: true, temper: 'passive', y: -0.35, depth: 2, v: 1.6, loop: [25, 60], lag: 0.3, side: 5, spread: 7, stride: 0.6 },
    penguin: { name: 'Adelie penguin', make: 'penguin', sp: 'penguin', realm: 'land', also: 'sea', coast: true, temper: 'passive', y: -0.3, depth: 2, v: 0.5, swimV: 2.4, loop: [30, 70], lag: 0.08, side: 2, spread: 2.2, stride: 0.25, porpoise: true },
    trout: { name: 'Lahontan cutthroat trout', make: 'trout', sp: 'dolphin', realm: 'lake', temper: 'passive', y: -1.0, depth: 0, v: 0.8, loop: [6, 14], lag: 0.12, side: 1.0, school: true },
    poolfish: { name: 'Mountain mullet', make: 'poolfish', sp: 'dolphin', realm: 'pool', temper: 'passive', v: 0.5 },
    gull: { name: 'Gull', kit: 'gull', realm: 'air', temper: 'sometimes', alt: [16, 45], v: 9, loop: [30, 70], lag: 0.45 },
    pelican: { name: 'Brown pelican', kit: 'pelican', realm: 'air', temper: 'passive', alt: [9, 25], v: 7, loop: [30, 60], lag: 0.35 },
    egret: { name: 'Great egret', make: 'egret', sp: 'gull', realm: 'air', temper: 'passive', alt: [8, 28], v: 7, loop: [25, 55], lag: 0.3 },
    eagle: { name: 'Bald eagle', make: 'eagle', sp: 'pelican', realm: 'air', temper: 'sometimes', alt: [45, 110], v: 8, loop: [60, 120], lag: 1.6 },
    mongoose: { name: 'Mongoose', kit: 'mongoose', realm: 'land', temper: 'curious', v: 1.6, stride: 0.5, spread: 5 },
    goat: { name: 'Feral goat', make: 'goat', sp: 'mongoose', realm: 'land', temper: 'curious', v: 0.9, stride: 0.75, spread: 4 },
    iguana: { name: 'Jamaican iguana', make: 'iguana', sp: 'mongoose', realm: 'land', temper: 'passive', v: 0.4, stride: 0.35, spread: 6 },
    deer: { name: 'White-tailed deer', make: 'deer', sp: 'mongoose', realm: 'land', temper: 'passive', v: 1.2, stride: 1.4, spread: 7 },
    elk: { name: 'Elk', make: 'elk', sp: 'mongoose', realm: 'land', temper: 'passive', v: 1.3, stride: 2.0, spread: 9 },
    moose: { name: 'Moose', make: 'moose', sp: 'mongoose', realm: 'land', temper: 'sometimes', v: 1.1, stride: 2.4, spread: 14 },
    blackbear: { name: 'American black bear', make: 'blackbear', sp: 'mongoose', realm: 'land', temper: 'sometimes', v: 0.9, stride: 1.1, spread: 8, rest: 0.65 },
    brownbear: { name: 'Brown bear', make: 'brownbear', sp: 'mongoose', realm: 'land', temper: 'sometimes', v: 0.9, stride: 1.3, spread: 8, rest: 0.65 },
    zebra: { name: 'Plains zebra', make: 'zebra', sp: 'mongoose', realm: 'land', temper: 'passive', v: 1.3, stride: 1.8, spread: 6 },
    giraffe: { name: 'Masai giraffe', make: 'giraffe', sp: 'mongoose', realm: 'land', temper: 'passive', v: 1.1, stride: 3.2, spread: 12 },
    elephant: { name: 'African bush elephant', make: 'elephant', sp: 'mongoose', realm: 'land', temper: 'sometimes', v: 1.0, stride: 3.0, spread: 10 },
    camel: { name: 'Dromedary camel', make: 'camel', sp: 'mongoose', realm: 'land', temper: 'passive', v: 1.1, stride: 2.6, spread: 8 },
    /* EVERY REGION ITS OWN (Marth, Nov 4: "make sure to put the animals in their regions"): the same rigs, the same poses, new bodies */
    kangaroo: { name: 'Red kangaroo', make: 'kangaroo', sp: 'mongoose', realm: 'land', temper: 'passive', v: 2.2, stride: 2.4, spread: 9, bound: true, region: 'australia' },
    koala: { name: 'Koala (on the ground: no trees out there to climb)', make: 'koala', sp: 'mongoose', realm: 'land', temper: 'passive', v: 0.3, stride: 0.4, spread: 7, rest: 0.85, region: 'australia' },
    emu: { name: 'Emu', make: 'emu', sp: 'mongoose', realm: 'land', temper: 'curious', v: 1.4, stride: 1.4, spread: 9, region: 'australia' },
    saltcroc: { name: 'Saltwater crocodile', make: 'saltcroc', sp: 'mongoose', realm: 'land', temper: 'malicious', v: 0.4, stride: 1.0, spread: 12, rest: 0.85, coast: true, region: 'australia' },
    panda: { name: 'Giant panda', make: 'panda', sp: 'mongoose', realm: 'land', temper: 'passive', v: 0.4, stride: 0.9, spread: 14, rest: 0.7, region: 'asia' },
    tiger: { name: 'Bengal tiger', make: 'tiger', sp: 'mongoose', realm: 'land', temper: 'malicious', v: 1.2, stride: 1.6, spread: 30, rest: 0.6, region: 'asia' },
    indianelephant: { name: 'Indian elephant', make: 'indianelephant', sp: 'mongoose', realm: 'land', temper: 'sometimes', v: 1.0, stride: 2.8, spread: 9, region: 'asia' },
    snowleopard: { name: 'Snow leopard', make: 'snowleopard', sp: 'mongoose', realm: 'land', temper: 'malicious', v: 1.0, stride: 1.2, spread: 30, rest: 0.6, region: 'asia' },
    yak: { name: 'Wild yak', make: 'yak', sp: 'mongoose', realm: 'land', temper: 'passive', v: 0.9, stride: 1.6, spread: 8, region: 'asia' },
    macaque: { name: 'Macaque', make: 'macaque', sp: 'mongoose', realm: 'land', temper: 'curious', v: 0.9, stride: 0.5, spread: 5, region: 'asia' },
    lion: { name: 'Lion', make: 'lion', sp: 'mongoose', realm: 'land', temper: 'malicious', v: 1.0, stride: 1.6, spread: 9, rest: 0.75, region: 'africa' },
    hippo: { name: 'Hippopotamus (half under the lake)', make: 'hippo', sp: 'mongoose', realm: 'wade', temper: 'sometimes', v: 0.5, stride: 1.4, spread: 8, sink: 0.75, rest: 0.7, region: 'africa' },
    gorilla: { name: 'Western lowland gorilla', make: 'gorilla', sp: 'mongoose', realm: 'land', temper: 'sometimes', v: 0.6, stride: 1.0, spread: 8, rest: 0.7, region: 'africa' },
    ostrich: { name: 'Common ostrich', make: 'ostrich', sp: 'mongoose', realm: 'land', temper: 'passive', v: 1.8, stride: 2.6, spread: 10, region: 'africa' },
    bison: { name: 'American bison', make: 'bison', sp: 'mongoose', realm: 'land', temper: 'sometimes', v: 1.0, stride: 2.0, spread: 7, region: 'americas' },
    alligator: { name: 'American alligator', make: 'alligator', sp: 'mongoose', realm: 'land', temper: 'sometimes', v: 0.35, stride: 0.8, spread: 10, rest: 0.85, region: 'americas' },
    jaguar: { name: 'Jaguar', make: 'jaguar', sp: 'mongoose', realm: 'land', temper: 'malicious', v: 1.0, stride: 1.4, spread: 30, rest: 0.65, region: 'americas' },
    llama: { name: 'Llama', make: 'llama', sp: 'mongoose', realm: 'land', temper: 'curious', v: 1.0, stride: 1.6, spread: 6, region: 'americas' },
    polarbear: { name: 'Polar bear', make: 'polarbear', sp: 'mongoose', realm: 'land', temper: 'malicious', v: 1.0, stride: 1.6, spread: 20, rest: 0.6, coast: true, region: 'arctic' },
    caribou: { name: 'Caribou', make: 'caribou', sp: 'mongoose', realm: 'land', temper: 'passive', v: 1.4, stride: 1.9, spread: 7, region: 'arctic' },
    arcticfox: { name: 'Arctic fox', make: 'arcticfox', sp: 'mongoose', realm: 'land', temper: 'curious', v: 1.0, stride: 0.6, spread: 15, rest: 0.5, region: 'arctic' },
    walrus: { name: 'Walrus', make: 'walrus', sp: 'dolphin', realm: 'sea', also: 'land', coast: true, temper: 'passive', y: -0.5, depth: 3, v: 1.2, loop: [20, 50], lag: 0.3, side: 5, spread: 3, stride: 0.6, region: 'arctic' },
    reddeer: { name: 'Red deer', make: 'reddeer', sp: 'mongoose', realm: 'land', temper: 'passive', v: 1.2, stride: 1.8, spread: 8, region: 'europe' },
    redfox: { name: 'Red fox', make: 'redfox', sp: 'mongoose', realm: 'land', temper: 'curious', v: 1.0, stride: 0.7, spread: 15, rest: 0.5, region: 'europe' },
    boar: { name: 'Wild boar', make: 'boar', sp: 'mongoose', realm: 'land', temper: 'sometimes', v: 0.8, stride: 0.8, spread: 5, region: 'europe' },
    crane: { name: 'Red-crowned crane', make: 'crane', sp: 'pelican', realm: 'air', temper: 'passive', alt: [15, 40], v: 8, loop: [30, 70], lag: 0.3, region: 'asia' },
    flamingo: { name: 'Lesser flamingo', make: 'flamingo', sp: 'gull', realm: 'air', temper: 'passive', alt: [6, 20], v: 9, loop: [40, 90], lag: 0.15, region: 'africa' },
    stork: { name: 'White stork', make: 'stork', sp: 'pelican', realm: 'air', temper: 'passive', alt: [20, 60], v: 8, loop: [40, 80], lag: 0.4, region: 'europe' },
    condor: { name: 'Andean condor', make: 'condor', sp: 'pelican', realm: 'air', temper: 'passive', alt: [60, 150], v: 9, loop: [80, 160], lag: 2, region: 'americas' },
    toucan: { name: 'Toco toucan (small: clear only near her)', make: 'toucan', sp: 'gull', realm: 'air', temper: 'passive', alt: [20, 35], v: 8, loop: [25, 50], lag: 0.4, region: 'americas' },
    macaw: { name: 'Scarlet macaw (small: clear only near her)', make: 'macaw', sp: 'gull', realm: 'air', temper: 'curious', alt: [25, 45], v: 10, loop: [30, 60], lag: 0.2, region: 'americas' },
    orca: { name: 'Orca', make: 'orca', sp: 'dolphin', realm: 'sea', temper: 'sometimes', y: -1.3, depth: 14, v: 3.0, loop: [120, 260], lag: 0.08, side: 8, leap: true },
    manta: { name: 'Giant manta ray (approximate in low poly)', make: 'manta', sp: 'dolphin', realm: 'sea', temper: 'passive', y: -1.2, depth: 6, v: 1.0, loop: [30, 70], lag: 0.5, side: 6 },
    sealion: { name: 'Sea lion', make: 'sealion', sp: 'dolphin', realm: 'sea', also: 'land', coast: true, temper: 'curious', y: -0.3, depth: 2, v: 2.2, loop: [25, 60], lag: 0.2, side: 4, spread: 4, stride: 0.6 }
  };
  var TMP = { passive: 0, curious: 1, sometimes: 2, malicious: 3 };
  function temper(k) { var T = window.WFR_ANIMALS && WFR_ANIMALS.T ? WFR_ANIMALS.T : TMP; return T[K[k].temper]; }

  /* ---------- 2. THE NEW BODIES, from animals714's primitives (kit.prim) ---------- */
  /* a four-legged animal on the MONGOOSE'S RIG (bones: root, body, head, tail, legFL, legFR, legHL, legHR, the same pivots' roles), so poseMongoose
     walks it: s.by the body's centre height, s.r its radii, s.neck [length, rise (rad), r0, r1], s.head radii, s.snout [length, r0, r1], s.legR [top, foot] */
  function quad(s) {
    var P = PR, G = P.G0(), hx = P.hex, top = hx(s.top), belly = hx(s.belly || s.top), leg = hx(s.leg || s.top), hoof = hx(s.hoof || 0x2a221c), muz = hx(s.muzzle || s.top);
    var by = s.by, rx = s.r[0], ry = s.r[1], rz = s.r[2], lx = rx * 0.6, lzF = rz * 0.62, lzH = s.biped ? 0 : -rz * 0.6, sw = s.sprawl || 1, bp = s.bp || 0;
    var rp = function (q) { var c = Math.cos(bp), sn = Math.sin(bp); return [q[0], q[1] * c - q[2] * sn + by, q[1] * sn + q[2] * c]; };   // a point of the body (from its centre), the body pitched by bp (negative: the front up)
    var nA = rp([0, ry * 0.35, rz * 0.8]), nl = s.neck[0], np = s.neck[1], nB = [0, nA[1] + nl * Math.sin(np), nA[2] + nl * Math.cos(np)];
    var ta = rp([0, ry * 0.2, -rz * 0.95]), fT = rp([lx, -ry * 0.3, lzF]), hT = rp([lx, -ry * 0.3, lzH]), hx2 = s.biped ? rx * 0.35 : lx;
    var bones = [{ name: 'root', p: [0, 0, 0] }, { name: 'body', p: [0, by, -rz * 0.5], parent: 0 }, { name: 'head', p: nA, parent: 1 }, { name: 'tail', p: ta, parent: 1 },
      { name: 'legFL', p: [lx, fT[1], fT[2]], parent: 1 }, { name: 'legFR', p: [-lx, fT[1], fT[2]], parent: 1 }, { name: 'legHL', p: [hx2, hT[1], hT[2]], parent: 0 }, { name: 'legHR', p: [-hx2, hT[1], hT[2]], parent: 0 }];
    P.ell(G, { c: [0, by, 0], r: [rx, ry, rz], pitch: bp, seg: 10, ring: 6, top: top, belly: belly, bone: 1, pat: s.pat });
    if (s.hump) P.ell(G, { c: rp([0, ry * 0.72, s.hump[3] || 0]), r: [s.hump[0], s.hump[1], s.hump[2]], pitch: bp, seg: 8, ring: 5, top: top, belly: top, bone: 1, pat: s.pat });
    P.tube(G, { a: nA, b: nB, ra: s.neck[2], rb: s.neck[3], sides: 7, top: s.mane ? hx(s.mane) : top, belly: belly, bone: 2, pat: s.neckPat || s.pat });
    var hr = s.head, hc = [0, nB[1] + hr[1] * 0.25, nB[2] + hr[2] * 0.35];
    P.ell(G, { c: hc, r: hr, pitch: s.hp == null ? 0.3 : s.hp, seg: 8, ring: 5, top: top, belly: belly, bone: 2, pat: s.headPat || s.pat });
    var sn = s.snout, sa = [0, hc[1] - hr[1] * 0.2, hc[2] + hr[2] * 0.55], sb = [0, hc[1] - hr[1] * 0.2 - sn[0] * (s.droop == null ? 0.45 : s.droop), hc[2] + hr[2] * 0.55 + sn[0]];
    P.tube(G, { a: sa, b: sb, ra: sn[1], rb: sn[2], sides: 6, top: muz, belly: muz, bone: 2 });
    P.ell(G, { c: [0, sb[1] + sn[2] * 0.2, sb[2] + sn[2] * 0.5], r: [sn[2] * 0.9, sn[2] * 0.6, sn[2] * 0.5], seg: 5, ring: 3, col: hx(s.nose || 0x1c1612), bone: 2 });
    [1, -1].forEach(function (sd) {
      P.eye(G, [hr[0] * 0.78 * sd, hc[1] + hr[1] * 0.25, hc[2] + hr[2] * 0.3], s.eyeR || hr[0] * 0.16, 2, [0.55 * sd, 0, 0.8]);
      if (s.ear) P.ell(G, { c: [hr[0] * 0.75 * sd, hc[1] + hr[1] * 0.85, hc[2] - hr[2] * 0.25], r: s.ear, roll: -0.5 * sd, seg: 5, ring: 3, top: hx(s.earC || s.top), belly: hx(s.earIn || s.belly || s.top), bone: 2 });
    });
    var LEGS = s.biped ? [[hx2, hT, 6], [-hx2, hT, 7]] : [[lx, fT, 4], [-lx, fT, 5], [lx, hT, 6], [-lx, hT, 7]];
    LEGS.forEach(function (L) {
      var front = L[2] < 6, arm = front && s.armY, r0 = front && s.armR ? s.armR[0] : s.legR[0], r1 = front && s.armR ? s.armR[1] : s.legR[1], tp = [L[0], L[1][1], L[1][2]];
      var fx = L[0] * sw, fy = arm ? s.armY : r1 * 0.8, fz = tp[2] + (front ? 0.02 * rz : 0) + (arm ? 0.06 : 0), ft = s.foot || 1;
      P.tube(G, { a: tp, b: [fx, fy, fz], ra: r0, rb: r1, sides: 6, top: leg, belly: leg, bone: L[2], pat: s.legPat });
      if (!arm) P.ell(G, { c: [fx, r1 * 0.55, fz + r1 * 0.3 + (ft > 1 ? r1 * 1.4 * (ft - 1) : 0)], r: [r1 * 1.15, r1 * 0.55, r1 * 1.4 * ft], seg: 6, ring: 3, col: hoof, bone: L[2] });
    });
    var tl = s.tail, tb = [0, ta[1] - tl[0] * (tl[3] == null ? 0.8 : tl[3]), ta[2] - tl[0] * 0.6];
    if (tb[1] < tl[2]) tb[1] = tl[2];   // a long low tail rests on the ground, never through it
    P.tube(G, { a: ta, b: tb, ra: tl[1], rb: tl[2], sides: 5, top: hx(s.tailC || s.top), belly: hx(s.tailB || s.tailC || s.belly || s.top), bone: 3 });
    if (s.extra) s.extra(G, P, { hc: hc, hr: hr, nA: nA, nB: nB, sa: sa, sb: sb, ta: ta, tb: tb, by: by, ry: ry, rz: rz, hx: hx, rp: rp });
    var m = P.finish(G, bones, s.id); m.radius = Math.max(by + ry, rz) * 1.6; return m;
  }
  function antler(G, P, base, sd, o) {   /* a beam rising back and out, then forward; tines up off it (o: beam length, tine count, tine length, radius, colour) */
    var c = PR.hex(o.col || 0xd8c8a4), b0 = base, b1 = [b0[0] + sd * o.L * 0.35, b0[1] + o.L * 0.55, b0[2] - o.L * 0.35], b2 = [b0[0] + sd * o.L * 0.55, b0[1] + o.L * 0.85, b0[2] + o.L * 0.1];
    P.tube(G, { a: b0, b: b1, ra: o.r, rb: o.r * 0.8, sides: 5, col: c, bone: 2 }); P.tube(G, { a: b1, b: b2, ra: o.r * 0.8, rb: o.r * 0.45, sides: 5, col: c, bone: 2 });
    for (var i = 0; i < o.n; i++) { var u = (i + 1) / (o.n + 1), q = i % 2 ? b1 : b0, w = i % 2 ? b2 : b1, p = [q[0] + (w[0] - q[0]) * u, q[1] + (w[1] - q[1]) * u, q[2] + (w[2] - q[2]) * u];
      P.tube(G, { a: p, b: [p[0] + sd * o.t * 0.15, p[1] + o.t, p[2] + o.t * 0.35], ra: o.r * 0.55, rb: o.r * 0.25, sides: 4, col: c, bone: 2 }); }
  }
  var Q = {
    deer: function () { return quad({ id: 'deer', by: 0.82, r: [0.17, 0.21, 0.5], neck: [0.42, 1.0, 0.085, 0.065], head: [0.075, 0.085, 0.13], snout: [0.1, 0.05, 0.035], legR: [0.05, 0.022],
      top: 0x9a6a42, belly: 0xece2d2, leg: 0x8a5f3c, muzzle: 0x6b4a32, ear: [0.025, 0.07, 0.04], earIn: 0xe8d8c8, tail: [0.18, 0.05, 0.03, 0.3], tailC: 0x8a5f3c, tailB: 0xffffff,
      extra: function (G, P, o) { [1, -1].forEach(function (sd) { antler(G, P, [0.035 * sd, o.hc[1] + o.hr[1] * 0.85, o.hc[2] - 0.02], sd, { L: 0.3, n: 2, t: 0.1, r: 0.012 }); }); } }); },
    elk: function () { return quad({ id: 'elk', by: 1.32, r: [0.3, 0.36, 0.86], neck: [0.62, 0.85, 0.17, 0.12], head: [0.1, 0.12, 0.22], snout: [0.16, 0.08, 0.06], legR: [0.08, 0.035],
      top: 0xb28d5f, belly: 0x5a3e28, leg: 0x4a3324, mane: 0x4a3324, muzzle: 0x3e2a1c, ear: [0.035, 0.1, 0.06], tail: [0.12, 0.06, 0.04, 0.4], tailC: 0xe6d2a8,
      pat: function (c, nx, ny, nz, x, y, z) { return z < -0.55 && y > 1.0 ? [0.9, 0.82, 0.66] : c; },
      extra: function (G, P, o) { [1, -1].forEach(function (sd) { antler(G, P, [0.05 * sd, o.hc[1] + o.hr[1] * 0.85, o.hc[2] - 0.05], sd, { L: 1.0, n: 5, t: 0.26, r: 0.03 }); }); } }); },
    moose: function () { return quad({ id: 'moose', by: 1.55, r: [0.36, 0.44, 0.98], neck: [0.42, 0.55, 0.22, 0.17], head: [0.12, 0.15, 0.3], snout: [0.3, 0.11, 0.1], droop: 0.6, hp: 0.6, legR: [0.09, 0.04],
      top: 0x3a2a1e, belly: 0x2c2018, leg: 0x9b8a72, muzzle: 0x3a2a1e, ear: [0.04, 0.12, 0.06], tail: [0.08, 0.05, 0.04, 0.5],
      extra: function (G, P, o) { var c = P.hex(0xcdbb94); P.tube(G, { a: [0, o.hc[1] - 0.12, o.hc[2] + 0.02], b: [0, o.hc[1] - 0.45, o.hc[2] - 0.02], ra: 0.05, rb: 0.03, sides: 5, col: P.hex(0x2c2018), bone: 2 });   /* the bell */
        [1, -1].forEach(function (sd) { var b = [0.08 * sd, o.hc[1] + o.hr[1] * 0.75, o.hc[2] - 0.08]; P.tube(G, { a: b, b: [b[0] + sd * 0.25, b[1] + 0.05, b[2]], ra: 0.035, rb: 0.03, sides: 5, col: c, bone: 2 });
          P.ell(G, { c: [b[0] + sd * 0.55, b[1] + 0.16, b[2] + 0.02], r: [0.34, 0.035, 0.22], roll: 0.35 * sd, seg: 8, ring: 3, col: c, bone: 2 });   /* the palm */
          for (var i = 0; i < 4; i++) P.tube(G, { a: [b[0] + sd * (0.45 + i * 0.1), b[1] + 0.2 + i * 0.03, b[2] - 0.1 + i * 0.08], b: [b[0] + sd * (0.55 + i * 0.12), b[1] + 0.38 + i * 0.04, b[2] - 0.1 + i * 0.1], ra: 0.025, rb: 0.01, sides: 4, col: c, bone: 2 }); }); } }); },
    blackbear: function () { return bear('blackbear', 0x231c18, 0x9a7a58); },
    brownbear: function () { return bear('brownbear', 0x5b3b22, 0x7a5434); },
    zebra: function () { var st = function (c, nx, ny, nz, x, y, z) { return Math.sin(z * 26 + y * 7 + Math.sin(y * 9) * 1.2) > 0.1 ? [0.08, 0.08, 0.09] : [0.95, 0.94, 0.9]; };
      return quad({ id: 'zebra', by: 1.05, r: [0.25, 0.31, 0.72], neck: [0.52, 0.95, 0.13, 0.1], head: [0.09, 0.12, 0.24], snout: [0.16, 0.07, 0.06], legR: [0.065, 0.03],
        top: 0xf2f0ea, belly: 0xf2f0ea, leg: 0xf2f0ea, muzzle: 0x1a1a1c, mane: 0x1a1a1c, ear: [0.035, 0.09, 0.05], tail: [0.4, 0.03, 0.02], tailC: 0x1a1a1c,
        pat: st, headPat: function (c, nx, ny, nz, x, y, z) { return Math.sin(y * 60 + z * 10) > 0.2 ? [0.08, 0.08, 0.09] : [0.95, 0.94, 0.9]; }, legPat: function (c, nx, ny, nz, x, y, z) { return Math.sin(y * 40) > 0.1 ? [0.08, 0.08, 0.09] : [0.95, 0.94, 0.9]; } }); },
    giraffe: function () { var pt = function (c, nx, ny, nz, x, y, z) { return Math.sin(x * 11 + z * 3) * Math.sin(z * 9 + y * 8) > 0.12 ? [0.47, 0.27, 0.12] : c; };
      return quad({ id: 'giraffe', by: 2.35, r: [0.36, 0.46, 0.85], neck: [1.9, 1.08, 0.2, 0.11], head: [0.11, 0.13, 0.27], hp: 0.6, snout: [0.14, 0.07, 0.055], legR: [0.08, 0.04],
        top: 0xdca868, belly: 0xefdcb8, leg: 0xe8d0a4, muzzle: 0xcfb08a, ear: [0.03, 0.09, 0.04], tail: [0.75, 0.035, 0.02, 0.95], tailC: 0xdca868, pat: pt,
        extra: function (G, P, o) { [1, -1].forEach(function (sd) { P.tube(G, { a: [0.035 * sd, o.hc[1] + o.hr[1] * 0.8, o.hc[2] - 0.05], b: [0.045 * sd, o.hc[1] + o.hr[1] * 0.8 + 0.15, o.hc[2] - 0.08], ra: 0.02, rb: 0.018, sides: 5, col: P.hex(0x7a4a22), bone: 2 }); }); } }); },   /* the ossicones */
    elephant: function () { return quad({ id: 'elephant', by: 1.95, r: [0.82, 0.92, 1.45], neck: [0.35, 0.25, 0.55, 0.5], head: [0.52, 0.6, 0.52], hp: 0.15, snout: [0.25, 0.22, 0.18], droop: 1.2, legR: [0.3, 0.26],
      top: 0x8b8680, belly: 0x77726c, leg: 0x85807a, muzzle: 0x8b8680, hoof: 0x5a5650, nose: 0x5a5650, tail: [0.9, 0.06, 0.03, 0.95],
      pat: function (c, nx, ny, nz, x, y, z) { return Math.sin(x * 21 + y * 17 + z * 13) > 0.85 ? [c[0] * 0.9, c[1] * 0.9, c[2] * 0.9] : c; },
      extra: function (G, P, o) { var g = P.hex(0x857f79), t0 = o.sb, t1 = [0, t0[1] - 0.75, t0[2] + 0.25], t2 = [0, 0.45, t0[2] + 0.35];
        P.tube(G, { a: t0, b: t1, ra: 0.17, rb: 0.12, sides: 6, col: g, bone: 2 }); P.tube(G, { a: t1, b: t2, ra: 0.12, rb: 0.07, sides: 6, col: g, bone: 2 });   /* the trunk */
        [1, -1].forEach(function (sd) { P.ell(G, { c: [o.hr[0] * 0.95 * sd, o.hc[1] + 0.05, o.hc[2] - 0.25], r: [0.06, 0.62, 0.5], yaw: 0.35 * sd, seg: 8, ring: 4, top: P.hex(0x7d7872), belly: P.hex(0x9a7a72), bone: 2 });   /* the ears */
          P.tube(G, { a: [0.18 * sd, o.hc[1] - 0.35, o.hc[2] + 0.35], b: [0.22 * sd, o.hc[1] - 0.5, o.hc[2] + 0.95], ra: 0.06, rb: 0.03, sides: 5, col: P.hex(0xf1e8d2), bone: 2 }); }); } }); },   /* the tusks */
    camel: function () { return quad({ id: 'camel', by: 1.5, r: [0.32, 0.38, 0.8], neck: [0.95, 0.45, 0.13, 0.1], head: [0.1, 0.12, 0.26], hp: -0.1, snout: [0.12, 0.07, 0.06], droop: 0.1, legR: [0.08, 0.05],
      top: 0xc79e66, belly: 0xd9b884, leg: 0xc49a62, muzzle: 0xb08a58, hoof: 0x8a6a48, ear: [0.025, 0.05, 0.03], tail: [0.45, 0.035, 0.03, 0.95], hump: [0.26, 0.36, 0.35, -0.05] }); },
    goat: function () { return quad({ id: 'goat', by: 0.5, r: [0.15, 0.19, 0.38], neck: [0.24, 0.95, 0.07, 0.055], head: [0.06, 0.07, 0.12], snout: [0.08, 0.04, 0.03], legR: [0.035, 0.018],
      top: 0xe6dccb, belly: 0xf3ede2, leg: 0xd8cdb8, muzzle: 0xcfc2ab, ear: [0.06, 0.02, 0.03], earC: 0xd8cdb8, tail: [0.1, 0.025, 0.015, -0.4],
      pat: function (c, nx, ny, nz, x, y, z) { return Math.sin(x * 9 + z * 6) > 0.55 ? [0.36, 0.26, 0.18] : c; },
      extra: function (G, P, o) { var hc = P.hex(0x6b5a44); [1, -1].forEach(function (sd) { var a = [0.025 * sd, o.hc[1] + o.hr[1] * 0.8, o.hc[2] + 0.01], b = [0.04 * sd, a[1] + 0.12, a[2] - 0.08];
        P.tube(G, { a: a, b: b, ra: 0.015, rb: 0.01, sides: 4, col: hc, bone: 2 }); P.tube(G, { a: b, b: [0.05 * sd, b[1] + 0.02, b[2] - 0.1], ra: 0.01, rb: 0.004, sides: 4, col: hc, bone: 2 }); });
        P.tube(G, { a: [0, o.sb[1] - 0.02, o.sb[2] - 0.03], b: [0, o.sb[1] - 0.1, o.sb[2] - 0.05], ra: 0.015, rb: 0.004, sides: 4, col: P.hex(0xcfc2ab), bone: 2 }); } }); },   /* horns and the beard */
    iguana: function () { return quad({ id: 'iguana', by: 0.11, r: [0.075, 0.065, 0.24], neck: [0.06, 0.2, 0.045, 0.04], head: [0.04, 0.04, 0.075], hp: 0.05, snout: [0.04, 0.025, 0.018], droop: 0.1, legR: [0.022, 0.012], sprawl: 2.6,
      top: 0x6a7f4a, belly: 0x9aa47a, leg: 0x5f7044, muzzle: 0x6a7f4a, hoof: 0x4a5236, tail: [0.75, 0.04, 0.01, 0.1], tailC: 0x5d6f40, tailB: 0x8a9466,
      pat: function (c, nx, ny, nz, x, y, z) { return Math.sin(z * 40) > 0.6 && ny > 0.2 ? [0.3, 0.36, 0.22] : c; },
      extra: function (G, P, o) { for (var i = 0; i < 9; i++) { var z = 0.2 - i * 0.07; P.fin3(G, [[0, 0.17 - i * 0.004, z + 0.02], [0, 0.21 - i * 0.004, z], [0, 0.17 - i * 0.004, z - 0.02]], 0.006, P.hex(0x8a9a5a), 1, [1, 0, 0]); }
        P.ell(G, { c: [0, o.hc[1] - 0.05, o.hc[2] - 0.02], r: [0.012, 0.035, 0.04], seg: 5, ring: 3, col: P.hex(0x9aa47a), bone: 2 }); } }); }   /* the dorsal spikes, the dewlap */
  };
  function bear(id, fur, muzzle, o) {
    return quad(Object.assign({ id: id, by: 0.62, r: [0.33, 0.36, 0.7], neck: [0.2, 0.25, 0.2, 0.17], head: [0.17, 0.16, 0.18], hp: 0.1, snout: [0.13, 0.08, 0.055], droop: 0.15, legR: [0.11, 0.08],
      top: fur, belly: fur, leg: fur, muzzle: muzzle, hoof: 0x14100e, ear: [0.05, 0.05, 0.03], tail: [0.06, 0.04, 0.03], pat: function (c, nx, ny, nz, x, y, z) { return Math.sin(x * 31 + y * 23 + z * 19) > 0.7 ? [c[0] * 1.15, c[1] * 1.15, c[2] * 1.15] : c; } }, o || {}));
  }
  /* a bird on buildBird's rig (root, head, wL, wR, wL2, wR2, tail), so poseBird flies it; the wing is the kit's own wing(), scaled */
  function birdOf(s) {
    var P = PR, G = P.G0(), hx = P.hex, k = s.k, back = hx(s.back), belly = hx(s.belly), head = hx(s.head), bill = hx(s.bill), f = s.span;
    var bones = [{ name: 'root', p: [0, 0, 0] }, { name: 'head', p: [0, 0.1 * k, 0.32 * k] }, { name: 'wL', p: [0.1 * f, 0.05 * k, 0.04 * k] }, { name: 'wR', p: [-0.1 * f, 0.05 * k, 0.04 * k] },
      { name: 'wL2', p: [0.55 * f, 0.05 * k, 0], parent: 2 }, { name: 'wR2', p: [-0.55 * f, 0.05 * k, 0], parent: 3 }, { name: 'tail', p: [0, 0.02 * k, -0.36 * k] }];
    P.ell(G, { c: [0, 0, 0], r: [0.15 * k, 0.15 * k, 0.4 * k], seg: 10, ring: 6, top: back, belly: belly, bone: 0 });
    var hc = s.neck ? [0, 0.08 * k + s.neck * 0.55, 0.4 * k + s.neck * 0.8] : [0, 0.09 * k, 0.45 * k], hr = [0.07 * k, 0.075 * k, 0.1 * k];
    if (s.neck) P.tube(G, { a: [0, 0.05 * k, 0.32 * k], b: hc, ra: 0.055 * k, rb: 0.04 * k, sides: 6, top: head, belly: head, bone: 1 });
    P.ell(G, { c: hc, r: hr, seg: 8, ring: 5, top: head, belly: head, bone: 1 });
    [1, -1].forEach(function (sd) { P.eye(G, [hc[0] + sd * hr[0] * 0.72, hc[1] + hr[1] * 0.25, hc[2] + hr[2] * 0.35], 0.012 * k, 1, [0.6 * sd, 0, 0.8]); });
    P.tube(G, { a: [0, hc[1] - 0.01 * k, hc[2] + hr[2] * 0.75], b: [0, hc[1] - s.hook * k, hc[2] + hr[2] * 0.75 + s.billL * k], ra: (s.billR || 0.025) * k, rb: (s.billR ? s.billR * 0.35 : 0.006) * k, sides: 5, col: bill, bone: 1 });
    P.tube(G, { a: [0, 0.02 * k, -0.34 * k], b: [0, 0.02 * k, -(0.62 + (s.tailL || 0)) * k], ra: 0.1 * k, rb: (s.tailL ? 0.03 : 0.07) * k, sides: 6, top: hx(s.tail), belly: hx(s.tail), bone: 6 });
    if (s.crown) P.ell(G, { c: [0, hc[1] + hr[1] * 0.85, hc[2]], r: [hr[0] * 0.5, hr[1] * 0.25, hr[2] * 0.45], seg: 6, ring: 3, col: hx(s.crown), bone: 1 });
    if (s.ruff) P.ell(G, { c: [0, 0.07 * k, 0.36 * k], r: [0.11 * k, 0.09 * k, 0.07 * k], seg: 8, ring: 4, col: hx(s.ruff), bone: 1 });
    if (s.throat) P.ell(G, { c: [0, hc[1] - hr[1] * 0.45, hc[2] + hr[2] * 0.2], r: [hr[0] * 0.8, hr[1] * 0.5, hr[2] * 0.6], seg: 6, ring: 3, col: hx(s.throat), bone: 1 });
    if (s.legs) [1, -1].forEach(function (sd) { P.tube(G, { a: [0.04 * k * sd, -0.08 * k, -0.2 * k], b: [0.04 * k * sd, -0.06 * k, -0.2 * k - s.legs], ra: 0.012 * k, rb: 0.008 * k, sides: 4, col: hx(s.legC), bone: 0 }); });   /* an egret trails its legs */
    var W = { sh: 0.1 * f, wr: 0.55 * f, hd: 0.78 * f, le: 0.1 * f, chA: 0.34 * f, chW: 0.3 * f, chH: 0.24 * f, t: 0.03 * f, y: 0.05 * k, n: 5, pl: 0.24 * f, pw: 0.028 * f, fan0: -0.15, fan1: -1.25, top: back, top2: hx(s.back2 || s.back), under: hx(s.under || s.belly), prim: hx(s.prim) };
    P.wing(G, null, 1, W); P.wing(G, null, -1, W);
    var m = P.finish(G, bones, s.id); m.radius = f * 1.2; return m;
  }
  var B = {
    egret: function () { return birdOf({ id: 'egret', k: 0.62, span: 0.7, neck: 0.32, back: 0xf7f7f2, belly: 0xffffff, head: 0xf7f7f2, bill: 0xe8b830, tail: 0xf2f2ee, prim: 0xe9e9e4, hook: 0.03, billL: 0.22, legs: 0.42, legC: 0x141414 }); },
    eagle: function () { return birdOf({ id: 'eagle', k: 0.95, span: 1.0, back: 0x3b2a1c, back2: 0x34261a, belly: 0x3a2a1e, under: 0x2e2218, head: 0xfafaf6, bill: 0xf0c020, tail: 0xfafaf6, prim: 0x1c1610, hook: 0.08, billL: 0.1 }); }
  };
  /* swimmers, lofted like the dolphin and posed by poseSwim */
  function swimmer(id, o) {
    var P = PR, G = P.G0(); P.loft(G, { L: o.L, z0: o.z0, rings: o.rings || 18, sides: o.sides || 10, nose: o.nose || 0.01, tailX: o.tailX || 0.01, prof: o.prof, col: o.col });
    if (o.extra) o.extra(G, P); return P.swimDone(G, id, o.sw, o.radius);
  }
  var S3 = {
    whale: function () { var hx = PR.hex, top = hx(0x2b3038), mid = hx(0x3a4048), white = hx(0xd9dcdc), groove = hx(0x9aa0a6);   /* a humpback, 13 m: the long white pectorals, the throat grooves, the small dorsal on its hump, the wide flukes */
      return swimmer('whale', { L: 13, z0: 4.4, rings: 24, sides: 12,
        prof: function (u) { var t, e; if (u < 0.08) { t = u / 0.08; return [0.35 + 0.6 * t, 0.25 + 0.5 * t, -0.1]; } if (u < 0.4) { e = Math.sin((u - 0.08) / 0.32 * Math.PI / 2); return [0.95 + 0.55 * e, 0.75 + 0.6 * e, -0.1 + 0.05 * e]; }
          t = (u - 0.4) / 0.6; return [1.5 * Math.pow(Math.max(0, 1 - t), 1.3) + 0.12, 1.35 * Math.pow(Math.max(0, 1 - t), 1.15) + 0.14, -0.05 + 0.1 * t]; },
        col: function (u, up, side) { if (up < -0.35) return u < 0.38 ? (Math.sin(side * 40) > 0.3 ? groove : white) : mid; return up > 0.4 ? top : mid; },
        extra: function (G, P) { P.fin3(G, [[0, 1.0, -3.0], [0, 1.45, -3.6], [0, 1.0, -4.2]], 0.12, top, 0, [1, 0, 0]);
          [1, -1].forEach(function (sd) { P.fin3(G, [[0.9 * sd, -0.6, 1.4], [3.6 * sd, -1.5, 0.3], [4.1 * sd, -1.7, -0.2], [3.4 * sd, -1.5, -0.1], [0.9 * sd, -0.75, 0.3]], 0.14, white, sd > 0 ? 3 : 4, [0, 1, 0], mid);
            P.fin3(G, [[0, 0.05, -8.0], [0.6 * sd, 0.05, -8.3], [2.1 * sd, 0.05, -9.1], [1.9 * sd, 0.05, -9.4], [0.6 * sd, 0.05, -8.9], [0, 0.05, -8.8]], 0.12, top, 0, [0, 1, 0], white);
            P.eye(G, [1.05 * sd, -0.2, 2.9], 0.07, 0, [0.6 * sd, 0, 0.8]); }); },
        sw: { L: 13, z0: 4.4, vert: true, amp: 0.045, kw: 3.4, f0: 0.1, f1: 0.05, vRef: 3, finX: 0.9, finY: -0.65, jawMax: 0 }, radius: 9 }); },
    seal: function () { var hx = PR.hex, top = hx(0x5f5a52), mid = hx(0x8a8378), belly = hx(0xb8b0a2), dark = hx(0x2a2622);   /* a true seal, 1.7 m: a round head, a fat spindle body, short fore-flippers, the hind flippers paired behind */
      return swimmer('seal', { L: 1.7, z0: 0.62, rings: 16, sides: 10,
        prof: function (u) { var t; if (u < 0.15) { t = Math.sqrt(u / 0.15); return [0.03 + 0.11 * t, 0.03 + 0.11 * t, 0.23]; } if (u < 0.22) return [0.12, 0.12, 0.22]; if (u < 0.62) { t = Math.sin((u - 0.22) / 0.4 * Math.PI / 2); return [0.12 + 0.12 * t, 0.12 + 0.11 * t, 0.23]; }
          t = (u - 0.62) / 0.38; return [0.24 * Math.pow(Math.max(0, 1 - t), 1.2) + 0.03, 0.23 * Math.pow(Math.max(0, 1 - t), 1.2) + 0.03, 0.23]; },
        col: function (u, up, side) { if (up < -0.3) return belly; return Math.sin(u * 47 + side * 9) > 0.75 ? dark : up > 0.3 ? top : mid; },
        extra: function (G, P) { [1, -1].forEach(function (sd) { P.fin3(G, [[0.17 * sd, 0.08, 0.2], [0.33 * sd, 0.0, 0.08], [0.3 * sd, 0.0, 0.0], [0.17 * sd, 0.05, 0.05]], 0.025, top, sd > 0 ? 3 : 4, [0, 1, 0], mid);
          P.fin3(G, [[0.03 * sd, 0.2, -1.04], [0.17 * sd, 0.2, -1.28], [0.08 * sd, 0.2, -1.3], [0.02 * sd, 0.2, -1.12]], 0.02, top, 0, [0, 1, 0], mid); P.eye(G, [0.09 * sd, 0.29, 0.5], 0.022, 0, [0.6 * sd, 0, 0.8]); });
          P.ell(G, { c: [0, 0.22, 0.6], r: [0.025, 0.02, 0.02], seg: 5, ring: 3, col: dark, bone: 0 }); },
        sw: { L: 1.7, z0: 0.62, vert: false, amp: 0.06, kw: 3, f0: 0.25, f1: 0.2, vRef: 2, finX: 0.17, finY: 0.06, jawMax: 0 }, radius: 1.3 }); },
    trout: function () { return fish('trout', 0.45, [0x56603a, 0x8a9a5a, 0xd88a7a, 0xe8e2c8], 0.045, 0.06); },
    poolfish: function () { return fish('poolfish', 0.28, [0x5a6260, 0x8a9496, 0xa8b0ae, 0xdfe4e2], 0.03, 0.045); },
    reeffish: function () { var G = PR.G0(); PR.fishInto(G, 0); return PR.swimDone(G, 'reeffish', { L: 0.17 * 0.84, z0: 0.085 * 0.84, vert: false, amp: 0.08, kw: 4, f0: 0.9, f1: 0.3, vRef: 1, finX: 0, finY: 0, jawMax: 0 }, 0.3); },
    penguin: function () { return penguin(); }
  };
  function fish(id, L, cs, rx, ry) { var hx = PR.hex, back = hx(cs[0]), side = hx(cs[1]), stripe = hx(cs[2]), belly = hx(cs[3]), spot = hx(0x1e1e18);
    return swimmer(id, { L: L, z0: L * 0.45, rings: 12, sides: 8,
      prof: function (u) { var e = Math.sin(Math.PI * Math.min(1, u * 1.02 + 0.05)); return [rx * (0.2 + 0.8 * e), ry * (0.25 + 0.75 * e), 0]; },
      col: function (u, up, sd) { if (up > 0.45) return Math.sin(u * 61 + sd * 13) > 0.6 ? spot : back; if (up > -0.15) return Math.abs(up - 0.1) < 0.25 ? stripe : side; return belly; },
      extra: function (G, P) { P.fin3(G, [[0, ry * 0.9, 0], [0, ry * 1.5, -L * 0.1], [0, ry * 0.9, -L * 0.2]], 0.004, back, 0, [1, 0, 0]);
        P.fin3(G, [[0, 0, -L * 0.52], [0, ry * 1.1, -L * 0.68], [0, 0, -L * 0.6], [0, -ry * 1.1, -L * 0.68]], 0.004, back, 0, [1, 0, 0]); },
      sw: { L: L, z0: L * 0.45, vert: false, amp: 0.08, kw: 4, f0: 0.8, f1: 0.4, vRef: 1, finX: 0, finY: 0, jawMax: 0 }, radius: L }); }
  /* the ADELIE PENGUIN, 0.7 m: black back and head, the white front and the white eye-ring, a short beak, flipper wings, pink feet. Its own small rig
     (root, body, head, flipL, flipR): it waddles (the body rolls side to side), flaps its flippers, and swims lying forward (the instance pitch) */
  function penguin() {
    var P = PR, G = P.G0(), hx = P.hex, blk = hx(0x15161a), wht = hx(0xf4f4f0);
    var bones = [{ name: 'root', p: [0, 0, 0] }, { name: 'body', p: [0, 0.03, 0], parent: 0 }, { name: 'head', p: [0, 0.52, 0.0], parent: 1 }, { name: 'flipL', p: [0.13, 0.48, 0], parent: 1 }, { name: 'flipR', p: [-0.13, 0.48, 0], parent: 1 }];
    P.ell(G, { c: [0, 0.3, 0], r: [0.15, 0.3, 0.14], seg: 10, ring: 7, top: blk, belly: blk, bone: 1, pat: function (c, nx, ny, nz) { return nz > 0.15 ? wht : blk; } });
    P.ell(G, { c: [0, 0.62, 0.02], r: [0.085, 0.09, 0.09], seg: 8, ring: 5, col: blk, bone: 2 });
    P.tube(G, { a: [0, 0.61, 0.09], b: [0, 0.6, 0.15], ra: 0.018, rb: 0.005, sides: 5, col: hx(0x2a1a14), bone: 2 });
    [1, -1].forEach(function (sd) { P.ell(G, { c: [0.06 * sd, 0.645, 0.06], r: [0.012, 0.016, 0.016], seg: 5, ring: 3, col: wht, bone: 2 }); P.ell(G, { c: [0.064 * sd, 0.645, 0.064], r: [0.006, 0.007, 0.007], seg: 4, ring: 2, col: blk, bone: 2 });
      P.ell(G, { c: [0.16 * sd, 0.36, 0], r: [0.02, 0.15, 0.05], roll: 0.15 * sd, seg: 6, ring: 4, top: blk, belly: wht, bone: sd > 0 ? 3 : 4 });
      P.ell(G, { c: [0.06 * sd, 0.015, 0.04], r: [0.035, 0.012, 0.055], seg: 5, ring: 3, col: hx(0xe8a0a0), bone: 0 }); });
    P.tube(G, { a: [0, 0.08, -0.1], b: [0, 0.03, -0.18], ra: 0.04, rb: 0.01, sides: 5, col: blk, bone: 1 });
    var m = P.finish(G, bones, 'penguin'); m.radius = 0.6; return m;
  }
  function posePenguin(m, a, dt) { var P = PR, t = m.ph += (dt || 0) * (a.swim ? 7 : a.v > 0.05 ? 6 : 1.2), w = a.v > 0.05 && !a.swim ? 1 : 0;
    P.setR(m, 0, 0, 0, 0, 0, 0.02 * Math.abs(Math.sin(t)) * w, 0); P.setR(m, 1, 0, 0, 0.13 * Math.sin(t) * w);
    P.setR(m, 2, 0.1 * Math.sin(t * 0.37) * (1 - w), 0.4 * Math.sin(t * 0.23) * (1 - w), 0);
    var fl = a.swim ? 0.9 * Math.sin(t) : 0.35 * w + 0.08 * Math.sin(t * 0.5); P.setR(m, 3, 0, 0, fl + 0.15); P.setR(m, 4, 0, 0, -fl - 0.15);
    P.bonesPose(m); }

  /* ---------- 2b. EVERY REGION ITS OWN: the new bodies (the same quad, birdOf and swimmer builders; real sizes, U1 holds them) ---------- */
  function cat(id, o) { var b = o.by; return quad({ id: id, by: b, r: [b * 0.33, b * 0.37, b * 1.05], neck: [b * 0.3, 0.3, b * 0.2, b * 0.16], head: [b * 0.2, b * 0.19, b * 0.22], hp: 0.1, snout: [b * 0.12, b * 0.1, b * 0.08], droop: 0.25,
    legR: [b * 0.11, b * 0.07], top: o.top, belly: o.belly, leg: o.leg || o.top, muzzle: o.muzzle || o.belly, nose: 0x3a2420, hoof: o.paw || o.top, ear: [b * 0.06, b * 0.07, b * 0.025], earC: o.earC || o.top, earIn: o.belly,
    tail: [b * (o.tailL || 1.1), b * 0.07, b * 0.05, 0.55], tailC: o.tailC || o.top, pat: o.pat, legPat: o.legPat || o.pat, headPat: o.headPat || o.pat, extra: o.extra }); }
  var spotPat = function (dark, k) { return function (c, nx, ny, nz, x, y, z) { return ny > -0.5 && Math.sin(x * k) * Math.sin(z * k * 1.07 + 1.3) * Math.sin(y * k * 0.93 + 0.7) > 0.22 ? dark : c; }; };
  function croc(id, k, back, belly) { return quad({ id: id, by: 0.28 * k, r: [0.32 * k, 0.2 * k, 1.3 * k], neck: [0.2 * k, 0, 0.2 * k, 0.18 * k], head: [0.18 * k, 0.12 * k, 0.25 * k], hp: 0, snout: [0.62 * k, 0.13 * k, 0.08 * k], droop: 0,
    legR: [0.07 * k, 0.05 * k], sprawl: 2.1, top: back, belly: belly, leg: back, muzzle: back, hoof: back, tail: [2.0 * k, 0.22 * k, 0.04 * k, 0.1], tailC: back, tailB: belly,
    pat: function (c, nx, ny, nz, x, y, z) { return ny > 0.6 && Math.sin(z * 9 / k) > 0.5 ? [c[0] * 0.75, c[1] * 0.75, c[2] * 0.75] : c; },
    extra: function (G, P, o) { for (var i = 0; i < 12; i++) { var z = 1.0 * k - i * 0.32 * k, y = (i < 6 ? o.by + 0.19 * k : o.by + 0.19 * k - (i - 5) * 0.03 * k); P.fin3(G, [[0, y, z + 0.06 * k], [0, y + 0.07 * k, z], [0, y, z - 0.06 * k]], 0.02 * k, P.hex(back), i < 6 ? 1 : 3, [1, 0, 0]); } } }); }
  function biped(id, o) { return quad({ id: id, biped: true, by: o.by, r: o.r, neck: o.neck, head: o.head, hp: 0.1, snout: o.beak, droop: 0.1, legR: o.legR, foot: 1.8, top: o.top, belly: o.belly, leg: o.leg, muzzle: o.bill, hoof: o.leg, nose: o.bill,
    mane: o.neckC, tail: o.tail, tailC: o.tailC, pat: o.pat, neckPat: o.neckPat, headPat: o.neckPat }); }
  var NEWQ = {
    kangaroo: function () { return quad({ id: 'kangaroo', by: 0.68, bp: -0.85, r: [0.17, 0.26, 0.36], neck: [0.18, 1.2, 0.08, 0.06], head: [0.07, 0.08, 0.13], hp: 0.25, snout: [0.09, 0.045, 0.03], droop: 0.3,
      legR: [0.08, 0.035], foot: 2.6, armY: 0.55, armR: [0.035, 0.022], top: 0xa8705a, belly: 0xe8d8c4, leg: 0x9a6650, muzzle: 0x8a5a48, ear: [0.025, 0.09, 0.02], earIn: 0xe8c8b8, tail: [1.0, 0.1, 0.035, 0.85], tailC: 0x9a6650 }); },
    koala: function () { return quad({ id: 'koala', by: 0.3, r: [0.14, 0.16, 0.2], neck: [0.05, 0.5, 0.1, 0.09], head: [0.12, 0.11, 0.1], hp: 0.05, snout: [0.03, 0.035, 0.03], droop: 0.6, nose: 0x15131a,
      legR: [0.045, 0.035], top: 0x8c8c8a, belly: 0xe6e2da, leg: 0x7a7a78, muzzle: 0x8c8c8a, hoof: 0x3a3a3a, ear: [0.07, 0.07, 0.025], earIn: 0xf4f2ee, tail: [0.02, 0.02, 0.02] }); },
    emu: function () { return biped('emu', { by: 1.0, r: [0.24, 0.3, 0.4], neck: [0.55, 1.35, 0.06, 0.045], head: [0.055, 0.06, 0.08], beak: [0.06, 0.025, 0.012], legR: [0.06, 0.03], top: 0x5a4a38, belly: 0x6a5a46, leg: 0x6a6460,
      bill: 0x2a2420, neckC: 0x4a5a6a, tail: [0.15, 0.12, 0.06, 0.4], tailC: 0x5a4a38, pat: function (c, nx, ny, nz, x, y, z) { return Math.sin(x * 40 + y * 33 + z * 27) > 0.4 ? [c[0] * 0.75, c[1] * 0.75, c[2] * 0.75] : c; } }); },
    ostrich: function () { return biped('ostrich', { by: 1.25, r: [0.32, 0.36, 0.5], neck: [0.8, 1.4, 0.07, 0.05], head: [0.06, 0.065, 0.09], beak: [0.07, 0.03, 0.015], legR: [0.08, 0.035], top: 0x1a1818, belly: 0x1a1818, leg: 0xd29a96,
      bill: 0xd8a890, neckC: 0xcfa4a0, tail: [0.25, 0.16, 0.08, 0.2], tailC: 0xf2f0ea, pat: function (c, nx, ny, nz, x, y, z) { return Math.abs(x) > 0.27 && z < 0.1 ? [0.95, 0.94, 0.9] : c; } }); },
    saltcroc: function () { return croc('saltcroc', 1, 0x56603e, 0xd2c8a2); },
    alligator: function () { return croc('alligator', 0.78, 0x2b3026, 0xbcb59a); },
    panda: function () { return bear('panda', 0xf3f1ea, 0xf3f1ea, { earC: 0x141414, legPat: function () { return [0.08, 0.08, 0.09]; },
      pat: function (c, nx, ny, nz, x, y, z) { return z > 0.18 && z < 0.42 && y > 0.45 ? [0.08, 0.08, 0.09] : c; },
      headPat: function (c, nx, ny, nz, x, y, z) { return nz > 0.3 && Math.abs(x) > 0.05 && Math.abs(x) < 0.13 && y > 0.85 && y < 0.95 ? [0.08, 0.08, 0.09] : c; } }); },
    tiger: function () { return cat('tiger', { by: 0.72, top: 0xd9792a, belly: 0xf2e8d8, pat: function (c, nx, ny, nz, x, y, z) { return ny > -0.45 && Math.sin(z * 15 + y * 4 + Math.sin(x * 9) * 1.5) > 0.55 ? [0.1, 0.08, 0.07] : c; } }); },
    lion: function () { return cat('lion', { by: 0.75, top: 0xc9a062, belly: 0xe8d4a8, tailL: 1.0,
      extra: function (G, P, o) { P.ell(G, { c: [0, o.nB[1] + 0.02, o.nB[2] - 0.02], r: [0.3, 0.32, 0.26], seg: 9, ring: 5, top: P.hex(0x6a4420), belly: P.hex(0x5a3a1c), bone: 2 });   /* the mane */
        P.ell(G, { c: o.tb, r: [0.06, 0.06, 0.09], seg: 6, ring: 3, col: P.hex(0x3a2614), bone: 3 }); } }); },   /* the tail's tuft */
    jaguar: function () { return cat('jaguar', { by: 0.55, top: 0xd9a540, belly: 0xf0e2c0, tailL: 0.9, pat: spotPat([0.12, 0.09, 0.06], 24) }); },
    snowleopard: function () { return cat('snowleopard', { by: 0.45, top: 0xd8d4c8, belly: 0xf2efe8, tailL: 1.9, tailC: 0xd0ccc0, pat: spotPat([0.3, 0.3, 0.3], 30) }); },
    indianelephant: function () { return quad({ id: 'indianelephant', by: 1.75, r: [0.75, 0.85, 1.3], neck: [0.3, 0.3, 0.5, 0.45], head: [0.48, 0.58, 0.48], hp: 0.15, snout: [0.25, 0.2, 0.16], droop: 1.2, legR: [0.27, 0.24],
      top: 0x6e6a66, belly: 0x5e5a56, leg: 0x6a6662, muzzle: 0x6e6a66, hoof: 0x4a4642, nose: 0x4a4642, tail: [0.8, 0.05, 0.03, 0.95],
      extra: function (G, P, o) { var g = P.hex(0x686460), t0 = o.sb, t1 = [0, t0[1] - 0.7, t0[2] + 0.22], t2 = [0, 0.4, t0[2] + 0.3];
        P.tube(G, { a: t0, b: t1, ra: 0.15, rb: 0.11, sides: 6, col: g, bone: 2 }); P.tube(G, { a: t1, b: t2, ra: 0.11, rb: 0.06, sides: 6, col: g, bone: 2 });
        [1, -1].forEach(function (sd) { P.ell(G, { c: [o.hr[0] * 0.95 * sd, o.hc[1] + 0.05, o.hc[2] - 0.2], r: [0.05, 0.36, 0.28], yaw: 0.3 * sd, seg: 8, ring: 4, top: P.hex(0x625e5a), belly: P.hex(0x8a6e66), bone: 2 });   /* the smaller ears: the Asian elephant's */
          P.tube(G, { a: [0.16 * sd, o.hc[1] - 0.35, o.hc[2] + 0.3], b: [0.18 * sd, o.hc[1] - 0.42, o.hc[2] + 0.5], ra: 0.04, rb: 0.02, sides: 5, col: P.hex(0xf1e8d2), bone: 2 }); }); } }); },
    yak: function () { return quad({ id: 'yak', by: 1.0, r: [0.38, 0.45, 0.9], neck: [0.25, -0.05, 0.3, 0.26], head: [0.2, 0.24, 0.28], hp: 0.5, snout: [0.12, 0.12, 0.1], droop: 0.5, legR: [0.1, 0.07], hump: [0.3, 0.25, 0.4, 0.4],
      top: 0x2a2420, belly: 0x1e1a18, leg: 0x2a2420, muzzle: 0x3a3430, hoof: 0x141210, tail: [0.6, 0.08, 0.06, 0.9], tailC: 0x2a2420,
      extra: function (G, P, o) { P.ell(G, { c: [0, o.by - 0.42, 0], r: [0.42, 0.18, 0.85], seg: 8, ring: 4, col: P.hex(0x221e1a), bone: 1 });   /* the long hair's skirt */
        [1, -1].forEach(function (sd) { var a = [0.17 * sd, o.hc[1] + 0.14, o.hc[2] - 0.05], b = [0.38 * sd, a[1] + 0.12, a[2] + 0.02]; P.tube(G, { a: a, b: b, ra: 0.045, rb: 0.03, sides: 5, col: P.hex(0xd8d0c0), bone: 2 }); P.tube(G, { a: b, b: [0.42 * sd, b[1] + 0.2, b[2] + 0.08], ra: 0.03, rb: 0.01, sides: 4, col: P.hex(0xd8d0c0), bone: 2 }); }); } }); },
    macaque: function () { return quad({ id: 'macaque', by: 0.35, r: [0.12, 0.13, 0.24], neck: [0.08, 0.6, 0.07, 0.06], head: [0.075, 0.08, 0.075], hp: 0.1, snout: [0.04, 0.045, 0.035], droop: 0.3, nose: 0x8a3a34, legR: [0.035, 0.022],
      top: 0x8a7a66, belly: 0xa89a86, leg: 0x7a6a58, muzzle: 0xd06a60, hoof: 0x6a5048, ear: [0.02, 0.025, 0.01], earC: 0xc8706a, tail: [0.12, 0.025, 0.015, 0.3],
      headPat: function (c, nx, ny, nz) { return nz > 0.55 ? [0.82, 0.42, 0.38] : c; } }); },   /* the red face */
    hippo: function () { return quad({ id: 'hippo', by: 0.72, r: [0.55, 0.55, 1.2], neck: [0.15, 0.1, 0.42, 0.4], head: [0.34, 0.3, 0.42], hp: 0.05, snout: [0.3, 0.3, 0.28], droop: 0.05, legR: [0.2, 0.17],
      top: 0x6e5a5c, belly: 0xb08a84, leg: 0x6a5658, muzzle: 0x8a6a6a, hoof: 0x4a3c3c, nose: 0x3a2c2c, ear: [0.05, 0.05, 0.03], tail: [0.2, 0.05, 0.02, 0.6] }); },
    gorilla: function () { return quad({ id: 'gorilla', by: 0.78, bp: -0.45, r: [0.33, 0.4, 0.42], neck: [0.06, 0.5, 0.16, 0.15], head: [0.15, 0.17, 0.15], hp: -0.1, snout: [0.06, 0.08, 0.07], droop: 0.2, nose: 0x0e0e0e,
      legR: [0.1, 0.08], armR: [0.11, 0.09], top: 0x1e1c1c, belly: 0x262222, leg: 0x1e1c1c, muzzle: 0x2a2626, hoof: 0x141212, ear: [0.025, 0.03, 0.01], tail: [0.02, 0.02, 0.02],
      pat: function (c, nx, ny, nz, x, y, z) { return ny > 0.35 && z < 0.05 ? [0.55, 0.55, 0.55] : c; } }); },   /* the silverback */
    bison: function () { return quad({ id: 'bison', by: 1.12, r: [0.42, 0.52, 1.05], neck: [0.25, -0.2, 0.34, 0.3], head: [0.24, 0.27, 0.3], hp: 0.6, snout: [0.12, 0.13, 0.11], droop: 0.6, legR: [0.11, 0.07], hump: [0.38, 0.38, 0.45, 0.45],
      top: 0x3b2a1e, belly: 0x2a1e16, leg: 0x2a1e16, muzzle: 0x241a14, hoof: 0x141010, tail: [0.45, 0.04, 0.03, 0.95],
      pat: function (c, nx, ny, nz, x, y, z) { return z > 0.15 ? [0.38, 0.27, 0.18] : c; },   /* the shaggy, paler forequarters */
      extra: function (G, P, o) { [1, -1].forEach(function (sd) { P.tube(G, { a: [0.2 * sd, o.hc[1] + 0.14, o.hc[2] - 0.05], b: [0.3 * sd, o.hc[1] + 0.24, o.hc[2] - 0.02], ra: 0.035, rb: 0.012, sides: 4, col: P.hex(0x141210), bone: 2 }); }); } }); },
    llama: function () { return quad({ id: 'llama', by: 1.05, r: [0.22, 0.28, 0.55], neck: [0.75, 1.35, 0.1, 0.08], head: [0.08, 0.1, 0.17], hp: 0.2, snout: [0.08, 0.06, 0.045], droop: 0.3, legR: [0.06, 0.035],
      top: 0xeee6d6, belly: 0xe2d8c4, leg: 0xe2d8c4, muzzle: 0xd8ccb4, hoof: 0x4a3e30, ear: [0.025, 0.1, 0.03], tail: [0.15, 0.06, 0.04, 0.6],
      pat: function (c, nx, ny, nz, x, y, z) { return Math.sin(x * 7 + z * 5) > 0.5 ? [0.55, 0.38, 0.24] : c; } }); },
    polarbear: function () { return quad({ id: 'polarbear', by: 0.8, r: [0.42, 0.45, 0.95], neck: [0.35, 0.25, 0.24, 0.2], head: [0.18, 0.18, 0.24], hp: 0.15, snout: [0.16, 0.09, 0.06], droop: 0.15, legR: [0.14, 0.11],
      top: 0xf2ede0, belly: 0xe6dfcc, leg: 0xeae4d4, muzzle: 0xeae4d4, hoof: 0x2a2826, nose: 0x141210, ear: [0.04, 0.04, 0.02], tail: [0.07, 0.05, 0.04] }); },
    caribou: function () { return quad({ id: 'caribou', by: 0.98, r: [0.25, 0.3, 0.68], neck: [0.42, 0.75, 0.13, 0.1], head: [0.085, 0.1, 0.18], snout: [0.12, 0.06, 0.05], legR: [0.06, 0.04],
      top: 0x7a6248, belly: 0xece6da, leg: 0x6a5440, muzzle: 0x5a4a3a, ear: [0.03, 0.07, 0.04], tail: [0.1, 0.05, 0.04, 0.4], tailC: 0xf2eee6, neckPat: function () { return [0.92, 0.9, 0.86]; },
      extra: function (G, P, o) { [1, -1].forEach(function (sd) { antler(G, P, [0.04 * sd, o.hc[1] + o.hr[1] * 0.85, o.hc[2] - 0.04], sd, { L: 0.95, n: 4, t: 0.22, r: 0.022, col: 0xc8b48e }); }); } }); },
    arcticfox: function () { return fox('arcticfox', 0xf4f3ef, 0xffffff, 0xe8e6e0, 0.85); },
    redfox: function () { return fox('redfox', 0xc8642a, 0xf2ece2, 0x2a2420, 1); },
    reddeer: function () { return quad({ id: 'reddeer', by: 1.02, r: [0.24, 0.3, 0.68], neck: [0.5, 0.95, 0.13, 0.1], head: [0.09, 0.1, 0.19], snout: [0.13, 0.06, 0.045], legR: [0.06, 0.03],
      top: 0x8a4a2a, belly: 0xc8a888, leg: 0x6a3a22, muzzle: 0x5a3a28, mane: 0x6a3e26, ear: [0.035, 0.09, 0.05], tail: [0.1, 0.05, 0.03, 0.4], tailC: 0xe6d8c0,
      extra: function (G, P, o) { [1, -1].forEach(function (sd) { antler(G, P, [0.045 * sd, o.hc[1] + o.hr[1] * 0.85, o.hc[2] - 0.05], sd, { L: 0.75, n: 4, t: 0.2, r: 0.025 }); }); } }); },
    boar: function () { return quad({ id: 'boar', by: 0.5, r: [0.22, 0.27, 0.55], neck: [0.12, 0.1, 0.18, 0.16], head: [0.12, 0.14, 0.2], hp: 0.5, snout: [0.18, 0.07, 0.06], droop: 0.5, legR: [0.05, 0.03], nose: 0x4a3a34,
      top: 0x3a2e26, belly: 0x4a3c32, leg: 0x2a221c, muzzle: 0x3a2e26, hoof: 0x141010, ear: [0.03, 0.06, 0.02], tail: [0.18, 0.02, 0.01, 0.9],
      pat: function (c, nx, ny, nz, x, y, z) { return ny > 0.7 ? [0.2, 0.16, 0.13] : Math.sin(x * 50 + y * 41 + z * 37) > 0.6 ? [c[0] * 1.3, c[1] * 1.3, c[2] * 1.3] : c; },
      extra: function (G, P, o) { [1, -1].forEach(function (sd) { P.tube(G, { a: [0.04 * sd, o.sb[1] + 0.02, o.sb[2] - 0.05], b: [0.06 * sd, o.sb[1] + 0.07, o.sb[2] - 0.04], ra: 0.012, rb: 0.004, sides: 4, col: P.hex(0xf0e8d8), bone: 2 }); }); } }); }
  };
  function fox(id, fur, belly, legC, k) { return quad({ id: id, by: 0.3 * k, r: [0.09 * k, 0.1 * k, 0.28 * k], neck: [0.1 * k, 0.6, 0.06 * k, 0.05 * k], head: [0.06 * k, 0.06 * k, 0.08 * k], snout: [0.08 * k, 0.03 * k, 0.015 * k], droop: 0.2,
    legR: [0.025 * k, 0.012 * k], top: fur, belly: belly, leg: legC, muzzle: belly, hoof: legC, nose: 0x141212, ear: [0.03 * k, 0.065 * k, 0.015 * k], earC: fur, earIn: belly, tail: [0.4 * k, 0.07 * k, 0.045 * k, 0.4], tailC: fur,
    extra: function (G, P, o) { P.ell(G, { c: o.tb, r: [0.05 * k, 0.05 * k, 0.07 * k], seg: 6, ring: 3, col: P.hex(0xf6f4f0), bone: 3 }); } }); }   /* the tail's white tip */
  var NEWB = {
    crane: function () { return birdOf({ id: 'crane', k: 0.78, span: 1.15, neck: 0.48, back: 0xf6f6f2, back2: 0xf6f6f2, belly: 0xffffff, under: 0xf0f0ec, head: 0x1a1a1a, bill: 0x8a8a6a, tail: 0x1a1a1a, prim: 0xf4f4f0, hook: 0.02, billL: 0.17, legs: 0.6, legC: 0x2a2a2a, crown: 0xd0201a }); },
    flamingo: function () { return birdOf({ id: 'flamingo', k: 0.6, span: 0.8, neck: 0.5, back: 0xf08aa0, back2: 0xf28ea4, belly: 0xf3a3b5, under: 0xf06a88, head: 0xf3a3b5, bill: 0x1a1a1a, tail: 0xf08aa0, prim: 0x141414, hook: 0.1, billL: 0.12, billR: 0.035, legs: 0.62, legC: 0xe07a8e }); },
    stork: function () { return birdOf({ id: 'stork', k: 0.82, span: 1.0, neck: 0.3, back: 0xf6f6f2, back2: 0x141414, belly: 0xffffff, under: 0xf0f0ec, head: 0xf6f6f2, bill: 0xd0302a, tail: 0xf6f6f2, prim: 0x141414, hook: 0.01, billL: 0.22, legs: 0.48, legC: 0xd0402a }); },
    condor: function () { return birdOf({ id: 'condor', k: 1.15, span: 1.55, back: 0x141414, back2: 0xd8d8d0, belly: 0x141414, under: 0x1a1a1a, head: 0xb07a6a, bill: 0xe8dcc0, tail: 0x141414, prim: 0x0e0e0e, hook: 0.06, billL: 0.07, ruff: 0xf4f4f0 }); },
    toucan: function () { return birdOf({ id: 'toucan', k: 0.36, span: 0.4, back: 0x111111, belly: 0x111111, head: 0x111111, bill: 0xf08a1a, tail: 0x111111, prim: 0x0a0a0a, hook: 0.05, billL: 0.48, billR: 0.07, throat: 0xf4f0e0 }); },
    macaw: function () { return birdOf({ id: 'macaw', k: 0.42, span: 0.55, back: 0xd42020, back2: 0xf0c020, belly: 0xd42020, under: 0xd42020, head: 0xd42020, bill: 0xe8e0d0, tail: 0xd42020, prim: 0x1f5fd0, hook: 0.07, billL: 0.07, billR: 0.04, tailL: 0.75 }); }
  };
  function sealLike(id, o) { var hx = PR.hex, top = hx(o.top), mid = hx(o.mid), belly = hx(o.belly), dark = hx(0x2a2622), L = o.L, z0 = L * 0.365, k = L / 1.7;
    return swimmer(id, { L: L, z0: z0, rings: 16, sides: 10,
      prof: function (u) { var t; if (u < 0.15) { t = Math.sqrt(u / 0.15); return [(0.03 + 0.11 * t) * k, (0.03 + 0.11 * t) * k, 0.23 * k]; } if (u < 0.22) return [0.12 * k, 0.12 * k, 0.22 * k]; if (u < 0.62) { t = Math.sin((u - 0.22) / 0.4 * Math.PI / 2); return [(0.12 + 0.12 * t) * k, (0.12 + 0.11 * t) * k, 0.23 * k]; }
        t = (u - 0.62) / 0.38; return [(0.24 * Math.pow(Math.max(0, 1 - t), 1.2) + 0.03) * k, (0.23 * Math.pow(Math.max(0, 1 - t), 1.2) + 0.03) * k, 0.23 * k]; },
      col: function (u, up) { return up < -0.3 ? belly : up > 0.3 ? top : mid; },
      extra: function (G, P) { [1, -1].forEach(function (sd) { var f = o.fore || 1; P.fin3(G, [[0.17 * sd * k, 0.08 * k, 0.2 * k], [0.33 * sd * k * f, 0.0, 0.08 * k], [0.3 * sd * k * f, 0.0, -0.02 * k * f], [0.17 * sd * k, 0.05 * k, 0.05 * k]], 0.025 * k, top, sd > 0 ? 3 : 4, [0, 1, 0], mid);
        P.fin3(G, [[0.03 * sd * k, 0.2 * k, -1.04 * k], [0.17 * sd * k, 0.2 * k, -1.28 * k], [0.08 * sd * k, 0.2 * k, -1.3 * k], [0.02 * sd * k, 0.2 * k, -1.12 * k]], 0.02 * k, top, 0, [0, 1, 0], mid); P.eye(G, [0.09 * sd * k, 0.29 * k, 0.5 * k], 0.022 * k, 0, [0.6 * sd, 0, 0.8]);
        if (o.ears) P.ell(G, { c: [0.08 * sd * k, 0.33 * k, 0.43 * k], r: [0.01 * k, 0.02 * k, 0.012 * k], seg: 4, ring: 2, col: top, bone: 0 });
        if (o.tusks) P.tube(G, { a: [0.04 * sd * k, 0.16 * k, 0.6 * k], b: [0.05 * sd * k, -0.12 * k, 0.62 * k], ra: 0.018 * k, rb: 0.008 * k, sides: 4, col: hx(0xf2ead8), bone: 0 }); });
        P.ell(G, { c: [0, 0.2 * k, 0.6 * k], r: [0.025 * k * (o.tusks ? 2.4 : 1), 0.02 * k * (o.tusks ? 2 : 1), 0.02 * k], seg: 5, ring: 3, col: o.tusks ? hx(0xb08a78) : dark, bone: 0 }); },
      sw: { L: L, z0: z0, vert: false, amp: 0.06, kw: 3, f0: 0.25, f1: 0.2, vRef: 2, finX: 0.17 * k, finY: 0.06 * k, jawMax: 0 }, radius: 1.3 * k }); }
  var NEWS = {
    sealion: function () { return sealLike('sealion', { L: 2.1, top: 0x6b4a32, mid: 0x7a5a40, belly: 0x8a6a4a, fore: 1.5, ears: true }); },
    walrus: function () { return sealLike('walrus', { L: 3.0, top: 0x9a6a58, mid: 0xa87a66, belly: 0x8a5e4e, fore: 1.2, tusks: true }); },
    orca: function () { var hx = PR.hex, blk = hx(0x101114), wht = hx(0xf2f2f0), sad = hx(0x8a8c90);   /* 7 m: black, the white belly and the white patch behind each eye, the grey saddle, the tall dorsal */
      return swimmer('orca', { L: 7, z0: 2.4, rings: 22, sides: 12,
        prof: function (u) { var t, e; if (u < 0.1) { t = Math.sqrt(u / 0.1); return [0.15 + 0.4 * t, 0.15 + 0.4 * t, 0]; } if (u < 0.42) { e = Math.sin((u - 0.1) / 0.32 * Math.PI / 2); return [0.55 + 0.25 * e, 0.55 + 0.3 * e, 0.02]; }
          t = (u - 0.42) / 0.58; return [0.8 * Math.pow(Math.max(0, 1 - t), 1.2) + 0.06, 0.85 * Math.pow(Math.max(0, 1 - t), 1.0) + 0.08, 0.02]; },
        col: function (u, up, side) { if (up < -0.35 && u < 0.6) return wht; if (u > 0.1 && u < 0.2 && up > 0.05 && up < 0.6) return wht; if (u > 0.36 && u < 0.48 && up > 0.75) return sad; return blk; } ,
        extra: function (G, P) { P.fin3(G, [[0, 0.8, 0.0], [0, 2.4, -0.25], [0, 0.85, -0.7]], 0.08, blk, 0, [1, 0, 0]);
          [1, -1].forEach(function (sd) { P.fin3(G, [[0.55 * sd, -0.45, 1.5], [1.4 * sd, -0.8, 1.1], [1.3 * sd, -0.85, 0.8], [0.55 * sd, -0.5, 1.0]], 0.06, blk, sd > 0 ? 3 : 4, [0, 1, 0]);
            P.fin3(G, [[0, 0.1, -4.2], [0.4 * sd, 0.1, -4.4], [1.1 * sd, 0.1, -4.9], [1.0 * sd, 0.1, -5.05], [0.3 * sd, 0.1, -4.75], [0, 0.1, -4.7]], 0.06, blk, 0, [0, 1, 0], wht); P.eye(G, [0.5 * sd, 0.05, 1.75], 0.04, 0, [0.6 * sd, 0, 0.8]); }); },
        sw: { L: 7, z0: 2.4, vert: true, amp: 0.06, kw: 3.8, f0: 0.25, f1: 0.1, vRef: 5, finX: 0.55, finY: -0.45, jawMax: 0 }, radius: 4.5 }); },
    manta: function () { var hx = PR.hex, blk = hx(0x1e2228), wht = hx(0xeef0f0);   /* a giant manta, 4 m across (APPROXIMATE in low poly): a flat body, wide wing fins that beat, the two head fins, the thin tail */
      return swimmer('manta', { L: 1.6, z0: 0.8, rings: 10, sides: 10,
        prof: function (u) { var e = Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.05)); return [0.45 * e + 0.05, 0.12 * e + 0.02, 0]; },
        col: function (u, up) { return up < 0 ? wht : blk; },
        extra: function (G, P) { [1, -1].forEach(function (sd) { P.fin3(G, [[0.35 * sd, 0, 0.55], [2.0 * sd, 0.05, -0.15], [1.85 * sd, 0.04, -0.35], [0.35 * sd, 0, -0.55]], 0.05, blk, sd > 0 ? 3 : 4, [0, 1, 0], wht);
            P.fin3(G, [[0.18 * sd, 0, 0.78], [0.24 * sd, -0.02, 1.08], [0.12 * sd, -0.02, 1.0]], 0.03, blk, 0, [sd, 0, 0]); });
          P.tube(G, { a: [0, 0, -0.8], b: [0, 0, -2.2], ra: 0.04, rb: 0.01, sides: 4, col: blk, bone: 0 }); },
        sw: { L: 1.6, z0: 0.8, vert: true, amp: 0.03, kw: 2, f0: 0.3, f1: 0.1, vRef: 2, finX: 0.35, finY: 0, jawMax: 0 }, radius: 2.2 }); }
  };
  Object.assign(Q, NEWQ); Object.assign(B, NEWB); Object.assign(S3, NEWS);

  /* ---------- 3. one program for every world animal: the kit's Lambert, instanced, the sea's tint under its water line ---------- */
  function OBC(shader) {   // ONE function for every world animal material (r128 keys the program by this text): uWA714 marks it for the bench
    var u = this.userData.uWA714; shader.uniforms.uWA714Col = u.col;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWater714; varying vec2 vWA714;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n#ifdef USE_INSTANCING\nvec4 wa714W = modelMatrix * instanceMatrix * vec4( transformed, 1.0 );\n#else\nvec4 wa714W = modelMatrix * vec4( transformed, 1.0 );\n#endif\nvWA714 = vec2( wa714W.y, aWater714 );');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uWA714Col; varying vec2 vWA714;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nif ( vWA714.x < vWA714.y ) { float wa714D = clamp( ( vWA714.y - vWA714.x ) / 6.0, 0.0, 1.0 ); diffuseColor.rgb = mix( diffuseColor.rgb, uWA714Col, 0.42 + 0.45 * wa714D ); }');
  }
  function geoOf(THREE, m, cap) {
    var g = new THREE.BufferGeometry(), pa = new THREE.BufferAttribute(m.pos, 3), na = new THREE.BufferAttribute(m.nrm, 3), wa = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    pa.setUsage(THREE.DynamicDrawUsage); na.setUsage(THREE.DynamicDrawUsage); wa.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', pa); g.setAttribute('normal', na); g.setAttribute('color', new THREE.BufferAttribute(m.color, 3)); g.setAttribute('aWater714', wa);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7); return g;
  }
  function meshOf(THREE, g, cap, name) {
    var im = new THREE.InstancedMesh(g, st.mat, cap); im.count = 0; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.matrixAutoUpdate = false; im.name = name;
    im.layers.enable(0); im.layers.enable(C.LAYER); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.userData.ids = []; im.userData.realm = []; return im;
  }
  function buildKind(k) {   // a kind's two posed bodies (moving, resting) and their meshes; built the first time a cell asks for it (one per tick)
    var THREE = X.THREE, d = K[k], R = st.kinds[k] = { k: k, ok: false, err: null, v: [], n: [0, 0], near: 1e9, poseN: 0 };
    try {
      var mk = function () { if (d.kit) return KIT.build(d.kit); if (Q[d.make]) return Q[d.make](); if (B[d.make]) return B[d.make](); if (S3[d.make]) return S3[d.make](); throw new Error('no body ' + k); };
      for (var v = 0; v < 2; v++) { var m = mk(), im = meshOf(THREE, geoOf(THREE, m, C.CAP), C.CAP, 'worldanimals:' + k + ':' + v);
        R.v.push({ m: m, im: im, a: { sp: d.kit || d.sp, v: 0, mv: 0, k: 0, stand: 0, curl: 0, state: 'idle', fold: 0, air: false, rear: 0, yaw: 0, atk: -1, swim: false } }); st.root.add(im); }
      R.ok = true; st.models += 2; st.built.push(k);
    } catch (e) { R.err = String(e && e.message || e); st.fault = 'build ' + k + ': ' + R.err; }
    return R;
  }
  function poseKind(R, dt) {   // the kit's pose, into the same arrays (moving: walk / flap / cruise; resting: idle / glide / slow)
    var d = K[R.k];
    for (var v = 0; v < 2; v++) { var P = R.v[v], a = P.a, m = P.m; if (!R.n[v]) continue;
      if (d.realm === 'land' || d.realm === 'wade' || d.make === 'penguin') { a.v = v === 0 ? d.v : 0; a.mv = v === 0 && d.bound ? 1 : 0; a.state = v === 0 ? 'approach' : 'idle'; a.k += (v === 0 ? d.v * dt * TAU / (d.stride || 1) / 10 : 0); a.swim = false; }
      else if (d.realm === 'air') { a.mv = v === 0 ? 1 : 0; a.state = v === 0 ? 'flee' : 'idle'; a.fold = 0; }
      else { a.v = v === 0 ? d.v : d.v * 1.7; a.state = 'idle'; a.air = false; a.swim = true; }
      if (d.make === 'penguin') posePenguin(m, a, dt); else KIT.pose(m, a, dt);
      var g = P.im.geometry; g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; }
    R.poseN++;
  }

  /* ---------- 4. the ground the game draws (the travel streamer's own sheet): its height, the sea's true depth, its real colour ---------- */
  var ST = function () { return X.TR && X.TR.st; };
  function H(x, z) { return X.H ? X.H(x, z) : (ST() ? ST().H(x, z) : 0); }
  function recOf(x, z) { var s = ST(); if (!s) return null; var p = s.probe(x, z); if (!p) return null; var r = s.tiles.get(p.key); if (!r || !r.hv || !r.mesh) return null; return { r: r, p: p }; }
  function uvOf(q, x, z) { var r = q.r; return WFR_WORLD.tileUV(X.TR.f, r.z, r.x, r.y, x, z); }
  function rawAt(x, z) {   // the drawn sheet's RAW height (the sea floor below 0), its two triangles as the streamer's surf() reads them
    var q = recOf(x, z); if (!q) return null; var N = Math.round(Math.sqrt(q.r.hv.length)) - 1, uv = uvOf(q, x, z), hv = q.r.hv;
    var fx = Math.min(N - 1e-9, Math.max(0, uv.u * N)), fz = Math.min(N - 1e-9, Math.max(0, uv.v * N)), i = Math.floor(fx), j = Math.floor(fz), a = fx - i, c = fz - j;
    var h00 = hv[j * (N + 1) + i], h10 = hv[j * (N + 1) + i + 1], h01 = hv[(j + 1) * (N + 1) + i], h11 = hv[(j + 1) * (N + 1) + i + 1];
    return a + c <= 1 ? h00 + (h10 - h00) * a + (h01 - h00) * c : h11 + (h01 - h11) * (1 - a) + (h10 - h11) * (1 - c);
  }
  function colAt(x, z) {   // the colour painted on the ground there: NASA Blue Marble when world-imagery.js has painted the tile (img), else the atlas tint
    var q = recOf(x, z); if (!q) return null; var col = q.r.mesh.geometry.getAttribute('color'); if (!col) return null; var N = Math.round(Math.sqrt(q.r.hv.length)) - 1, uv = uvOf(q, x, z);
    var i = clamp(Math.round(uv.u * N), 0, N), j = clamp(Math.round(uv.v * N), 0, N), k = (j * (N + 1) + i) * 3, A = col.array;
    return { r: A[k], g: A[k + 1], b: A[k + 2], img: !!(q.r.im712 && q.r.im712.z >= 0) };
  }
  /* world-features.js (OpenStreetMap): water and towns veto land animals, ice keeps only the polar ones; its polygons kept per tile while it keeps them */
  function hookFeatures() {
    var F = window.WFR_FEATURES; if (st.featHooked || !F || typeof F.onTile !== 'function') return; st.featHooked = true;
    try { F.onTile(function (z, x, y, feed) { featTile(z, x, y, feed); }); if (typeof F.onDrop === 'function') F.onDrop(function (z, x, y) { st.feat.delete(z + '/' + x + '/' + y); }); } catch (e) { st.featFault = String(e && e.message || e); }
  }
  var FCLS = { water: 'water', lake: 'water', river: 'water', pond: 'water', basin: 'water', reservoir: 'water', residential: 'town', commercial: 'town', industrial: 'town', retail: 'town', ice: 'ice', glacier: 'ice' };
  function featTile(z, x, y, feed) {
    try { if (!feed) return; var L = [], add = function (list, kind) { (list || []).forEach(function (p) { var c = kind === 'water' ? (p.cls === 'ocean' ? null : 'water') : FCLS[p.cls] || FCLS[p.subclass] || null; if (!c || !p.rings || !p.rings[0]) return;
        var R0 = p.rings[0], b = [1e9, -1e9, 1e9, -1e9]; for (var i = 0; i < R0.length; i += 2) { if (R0[i] < b[0]) b[0] = R0[i]; if (R0[i] > b[1]) b[1] = R0[i]; if (R0[i + 1] < b[2]) b[2] = R0[i + 1]; if (R0[i + 1] > b[3]) b[3] = R0[i + 1]; }
        L.push({ c: c, b: b, rings: p.rings }); }); };
      add(feed.water, 'water'); add(feed.landcover, 'cover'); add(feed.landuse, 'use'); st.feat.set(z + '/' + x + '/' + y, L); st.featTiles++; } catch (e) { st.featFault = String(e && e.message || e); }
  }
  function inRing(R, lon, lat) { var c = false; for (var i = 0, j = R.length - 2; i < R.length; j = i, i += 2) { var xi = R[i], yi = R[i + 1], xj = R[j], yj = R[j + 1]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi || 1e-12) + xi) c = !c; } return c; }
  function featAt(lat, lon) {   // 'water' | 'town' | 'ice' | null (water first)
    var best = null; [14, 12, 9].forEach(function (z) { var t = WFR_WORLD.tileAt(lat, lon, z), L = st.feat.get(t.z + '/' + t.x + '/' + t.y); if (!L) return; for (var i = 0; i < L.length; i++) { var p = L[i]; if (best === 'water') return; if (lon < p.b[0] || lon > p.b[1] || lat < p.b[2] || lat > p.b[3]) continue;
      if (!inRing(p.rings[0], lon, lat)) continue; var hole = false; for (var h = 1; h < p.rings.length; h++) if (inRing(p.rings[h], lon, lat)) { hole = true; break; } if (!hole && (best == null || p.c === 'water')) best = p.c; } }); return best;
  }

  /* ---------- 5. THE BIOME of a point: its height and depth, its latitude, its real colour, its region (and OSM's word when it has one) ---------- */
  function biomeAt(lat, lon, h, raw, col) {
    if (raw == null) return null;
    if (raw <= -2) { if (lat < -55) return 'southsea'; if (lat > 62) return 'northsea'; if (raw > -60 && Math.abs(lat) < 32) return 'reef'; return raw > -200 ? 'shelf' : 'ocean'; }
    if (inBox(lat, lon, RG.tahoe) && Math.abs(raw - C.TAHOE_LV) < 0.8) return 'tahoelake';
    if (raw < C.LAND_MIN || h < C.LAND_MIN) return 'shore';
    var im = col && col.img, lum = col ? (col.r + col.g + col.b) / 3 : 0, mx = col ? Math.max(col.r, col.g, col.b) : 0, mn = col ? Math.min(col.r, col.g, col.b) : 0;
    if (im && col.b > col.r * 1.12 && col.b > col.g * 1.02 && lum < 0.4) return 'lake';   // a lake's dark blue on land (Blue Marble)
    if (lat < -60) return 'antarctic';
    if (lat > 66) return 'tundra';
    if (im && lum > 0.78 && mx - mn < 0.1) return 'ice';
    var green = col ? col.g - (col.r + col.b) / 2 : 0;
    if (h > 3200 && Math.abs(lat) < 45) return 'alpine';   // the Himalaya and Tibet, the Andes
    if (Math.abs(lat) >= 50) return inBox(lat, lon, RG.europe) && lat < 60 ? 'temperate' : 'boreal';
    if (DESERTS.some(function (Bx) { return inBox(lat, lon, Bx); }) && !(im && green > 0.04)) return 'desert';
    if (inBox(lat, lon, RG.caribbean)) return 'caribbean';
    if (inBox(lat, lon, RG.africa) && Math.abs(lat) < 20) return im && green > 0.06 && lum < 0.3 ? 'rainforest' : 'savanna';
    if (Math.abs(lat) < 23.5) return 'tropical';
    return 'temperate';
  }
  /* each biome's animals: [kind, weight, [fewest, most]] (land herds, sea pods and schools, air flocks). DRAFT, from each region's real fauna */
  function roster(b, lat, lon) {   /* each region's own animals by biome: [kind, weight, [fewest, most]] (land herds, sea pods and schools, air flocks). DRAFT, from each region's real fauna */
    var rg = regionOf(lat, lon), am = rg === 'americas', alat = Math.abs(lat), R = { land: [], sea: [], air: [] }, pac = PACIFIC.some(function (Bx) { return inBox(lat, lon, Bx); }), pin = pac ? 'sealion' : 'seal';
    switch (b) {
      case 'savanna': R.land = [['zebra', 4, [6, 14]], ['giraffe', 2, [3, 6]], ['elephant', 2, [4, 9]], ['lion', 2, [3, 8]], ['ostrich', 1, [2, 6]]]; R.air = [['egret', 1, [6, 12]]]; break;
      case 'rainforest': R.land = inBox(lat, lon, RG.congo) ? [['gorilla', 2, [3, 8]], ['elephant', 1, [3, 6]]] : [['elephant', 1, [3, 6]]]; break;
      case 'lake': if (rg === 'africa') { R.land = [['hippo', 1, [4, 12]]]; R.air = [['flamingo', 2, [14, 40]]]; } else if (rg === 'asia' && inBox(lat, lon, RG.crane)) R.air = [['crane', 1, [4, 10]]]; break;
      case 'desert': if (rg === 'africa') R.land = [['camel', 2, [3, 8]], ['ostrich', 1, [2, 5]]]; else if (rg === 'asia') R.land = [['camel', 1, [3, 8]]]; else if (rg === 'australia') R.land = [['kangaroo', 3, [4, 12]], ['emu', 2, [2, 6]], ['camel', 1, [2, 6]]]; break;
      case 'caribbean': R.land = [['goat', 3, [3, 7]], ['iguana', 2, [2, 5]], ['mongoose', 2, [1, 3]]]; R.air = [['egret', 1, [4, 9]]]; break;
      case 'alpine': if (rg === 'asia') R.land = [['yak', 3, [4, 12]], ['snowleopard', 1, [1, 2]]]; else if (am && inBox(lat, lon, RG.andes)) { R.land = [['llama', 1, [4, 10]]]; R.air = [['condor', 1, [1, 3]]]; } break;
      case 'tropical':
        if (rg === 'australia') R.land = [['kangaroo', 3, [4, 12]], ['emu', 2, [2, 6]], ['saltcroc', 1, [1, 3]]];
        else if (rg === 'asia') R.land = [['indianelephant', 2, [3, 8]], ['tiger', 1, [1, 2]]];
        else if (rg === 'africa') R.land = [['elephant', 1, [3, 6]], ['lion', 1, [2, 5]]];
        else if (am) { if (inBox(lat, lon, RG.amazon)) { R.land = [['jaguar', 1, [1, 2]]]; R.air = [['macaw', 2, [3, 8]], ['toucan', 2, [2, 6]]]; } else if (inBox(lat, lon, RG.florida)) { R.land = [['alligator', 2, [1, 4]], ['deer', 2, [2, 5]]]; R.air = [['egret', 1, [4, 8]]]; } else { R.land = [['deer', 1, [2, 5]]]; R.air = [['egret', 1, [4, 8]]]; } }
        break;
      case 'temperate':
        if (rg === 'australia') R.land = [['kangaroo', 4, [5, 14]], ['emu', 2, [2, 6]]].concat(lon > 140 ? [['koala', 2, [1, 3]]] : []);
        else if (rg === 'asia') { if (inBox(lat, lon, RG.sichuan)) R.land = [['panda', 3, [2, 4]], ['macaque', 1, [4, 10]]]; else if (inBox(lat, lon, RG.india)) R.land = [['indianelephant', 2, [3, 8]], ['tiger', 1, [1, 2]]]; else if (inBox(lat, lon, RG.japan)) R.land = [['macaque', 3, [5, 14]], ['brownbear', 1, [1, 2]]]; else R.land = [['brownbear', 1, [1, 2]], ['macaque', 1, [3, 8]]]; if (inBox(lat, lon, RG.crane)) R.air = [['crane', 1, [4, 10]]]; }
        else if (rg === 'europe') { R.land = [['reddeer', 4, [4, 10]], ['boar', 3, [3, 8]], ['redfox', 2, [1, 2]], ['brownbear', 1, [1, 2]]]; R.air = [['stork', 1, [3, 8]]]; }
        else if (am) R.land = inBox(lat, lon, RG.plains) ? [['bison', 5, [8, 24]], ['deer', 1, [2, 6]]] : inBox(lat, lon, RG.florida) ? [['alligator', 2, [1, 4]], ['deer', 2, [2, 5]]] : [['deer', 4, [3, 8]], ['blackbear', 1, [1, 2]]];
        else if (rg === 'africa') R.land = [['ostrich', 1, [2, 5]]];
        if (pac) R.land = R.land.concat([['sealion', 1, [3, 10]]]);
        break;
      case 'boreal': R.land = am ? [['elk', 3, [4, 10]], ['moose', 2, [1, 3]], ['blackbear', 1, [1, 2]]] : rg === 'europe' ? [['moose', 3, [1, 3]], ['reddeer', 2, [3, 8]], ['brownbear', 1, [1, 2]]] : [['moose', 3, [1, 3]], ['brownbear', 1, [1, 2]]]; break;
      case 'antarctic': R.land = [['penguin', 4, [14, 36]], ['seal', 2, [2, 6]]]; break;
      case 'tundra': R.land = [['caribou', 4, [6, 20]], ['arcticfox', 2, [1, 2]], ['polarbear', 1, [1, 2]], ['walrus', 1, [4, 12]], ['seal', 1, [2, 5]]]; break;
      case 'reef': R.sea = [['turtle', 2, [1, 3]], ['reeffish', 3, [12, 24]], ['dolphin', 2, [4, 9]], ['shark', 1, [1, 2]], ['manta', 1, [1, 3]]]; break;
      case 'shelf': R.sea = [['dolphin', 3, [4, 10]], ['whale', 1, [1, 2]]].concat(alat < 35 ? [['turtle', 1, [1, 2]]] : []).concat(alat < 45 ? [['shark', 1, [1, 2]]] : []).concat(alat > 40 ? [['orca', 1, [3, 7]]] : []).concat(alat < 30 ? [['manta', 1, [1, 2]]] : []).concat(pac ? [['sealion', 1, [2, 6]]] : []); break;
      case 'ocean': R.sea = (alat < 50 ? [['dolphin', 2, [5, 12]]] : []).concat([['whale', 2, [1, 3]]]).concat(alat < 45 ? [['shark', 1, [1, 2]]] : []).concat(alat > 40 ? [['orca', 2, [3, 7]]] : []).concat(alat < 30 ? [['manta', 1, [1, 2]]] : []); break;
      case 'southsea': R.sea = [[pin, 2, [2, 6]], ['penguin', 3, [8, 18]], ['whale', 1, [1, 2]], ['orca', 1, [3, 7]]]; break;
      case 'northsea': R.sea = [['seal', 2, [2, 6]], ['walrus', 1, [3, 8]], ['whale', 1, [1, 2]], ['orca', 1, [3, 7]]]; break;
      case 'tahoelake': R.sea = [['trout', 1, [6, 12]]]; R.air = [['eagle', 1, [1, 3]]]; break;
    }
    return R;
  }
  function coastAir(lat, lon) { var L = [], rg = regionOf(lat, lon); if (Math.abs(lat) < 62) L.push(['gull', 3, [5, 12]]); if ((rg === 'americas' && Math.abs(lat) < 40) || rg === 'australia') L.push(['pelican', 2, [3, 7]]); return L; }

  /* ---------- 6. CELLS: classified once the ground is final, then filled from the cell's own seed ---------- */
  function lonStep(iLat) { var la = (iLat + 0.5) * C.CELL; return C.CELL / Math.max(0.1, Math.cos(la * D2R)); }
  function cellKey(iLat, iLon) { return iLat + ':' + iLon; }
  function cellBox(iLat, iLon) { var ls = lonStep(iLat); return { lat0: iLat * C.CELL, lat1: (iLat + 1) * C.CELL, lon0: iLon * ls - 180, lon1: (iLon + 1) * ls - 180 }; }
  function valid(k, x, z, lat, lon, realm) {   // may a kind stand (or swim) here? land: firm, gentle, dry ground away from lakes and towns; sea: deep enough water
    var d = K[k], h = H(x, z), raw = rawAt(x, z); if (raw == null) return false;
    realm = realm || d.realm;
    if (realm === 'sea') return h <= 0.01 && raw <= -d.depth;
    if (realm === 'lake') return inBox(lat, lon, RG.tahoe) && Math.abs(raw - C.TAHOE_LV) < 0.6 && Math.abs(h - C.TAHOE_LV) < 0.6 && Math.abs(rawAt(x + 12, z) - C.TAHOE_LV) < 0.6 && Math.abs(rawAt(x, z + 12) - C.TAHOE_LV) < 0.6;
    if (realm === 'wade') { if (h < C.LAND_MIN || raw < C.LAND_MIN) return false; var fw = featAt(lat, lon), cw = colAt(x, z); return fw === 'water' || !!(cw && cw.img && cw.b > cw.r * 1.12 && cw.b > cw.g * 1.02 && (cw.r + cw.g + cw.b) / 3 < 0.4); }   // a lake's surface (the colour biomeAt calls a lake)
    if (realm === 'land') { if (h < C.LAND_MIN || raw < C.LAND_MIN) return false; if (inBox(lat, lon, RG.tahoe) && Math.abs(raw - C.TAHOE_LV) < 1.0) return false;
      var sx = H(x + 4, z) - H(x - 4, z), sz = H(x, z + 4) - H(x, z - 4); if (Math.hypot(sx, sz) / 8 > C.SLOPE) return false; var f = featAt(lat, lon); return f !== 'water' && f !== 'town' && !(f === 'ice' && k !== 'penguin' && k !== 'seal'); }
    return true;
  }
  function nearSea(x, z) {   // a coast: the sea within 2.6 km (a coastal colony's cell may hold no water of its own)
    for (var r = 600; r <= 2600; r += 1000) for (var a = 0; a < 12; a++) { var t = a / 12 * TAU, q = rawAt(x + Math.cos(t) * r, z + Math.sin(t) * r); if (q != null && q <= -2) return true; } return false;
  }
  function sampleCell(cell, f) {   // a 4 x 4 lattice of the cell: each point's place, height, depth, colour and biome; null while any of it is still loading
    var s = ST(), out = [], img = 0;
    for (var j = 0; j < 4; j++) for (var i = 0; i < 4; i++) { var lat = cell.lat0 + (j + 0.5) / 4 * (cell.lat1 - cell.lat0), lon = cell.lon0 + (i + 0.5) / 4 * (cell.lon1 - cell.lon0), p = WFR_WORLD.toLocal(f, lat, lon);
      if (s.loadingUnder(p.x, p.z) && !(cell.lw > C.LOAD_MAX)) { cell.lw = (cell.lw || 0) + (j + i === 0 ? st.dt : 0); return null; } var h = H(p.x, p.z), raw = rawAt(p.x, p.z); if (raw == null) return null; var col = colAt(p.x, p.z); if (col && col.img) img++;   // waits while the ground there still sharpens (never forever: 6 s)
      out.push({ lat: lat, lon: lon, x: p.x, z: p.z, h: h, raw: raw, col: col, b: null }); }
    out.img = img; return out;
  }
  function populate(cell, smp, f) {
    var r = rng(hash('wa714:' + cell.key)), G = [], i;
    smp.forEach(function (q) { q.b = biomeAt(q.lat, q.lon, q.h, q.raw, q.col); var fe = featAt(q.lat, q.lon); if (fe === 'water' && q.b !== 'tahoelake' && q.raw > 0) q.b = 'lake'; if (fe === 'town') q.b = 'town'; });
    var landN = {}, seaN = {}, land = 0, sea = 0; smp.forEach(function (q) { var R0 = roster(q.b, q.lat, q.lon); if (R0.land.length) { landN[q.b] = (landN[q.b] || 0) + 1; land++; } if (R0.sea.length) { seaN[q.b] = (seaN[q.b] || 0) + 1; sea++; } });
    var top = function (o) { var b = null, n = 0; Object.keys(o).sort().forEach(function (k) { if (o[k] > n) { n = o[k]; b = k; } }); return b; };
    var lb = top(landN), sb = top(seaN), anySea = smp.some(function (q) { return q.raw <= -2; }), anyLand = smp.some(function (q) { return q.raw >= C.LAND_MIN; });
    var tahoe = inBox(cell.lat0, cell.lon0, RG.tahoe);
    cell.biomes = { land: lb, sea: sb, coast: anySea && anyLand, img: smp.img }; cell.groups = G;
    var pickK = function (L) { var tot = 0; L.forEach(function (e) { tot += e[1]; }); var u = r() * tot; for (var q = 0; q < L.length; q++) { u -= L[q][1]; if (u <= 0) return L[q]; } return L[L.length - 1]; };
    var spots = function (b) { var L = smp.filter(function (q) { return q.b === b; }); for (var q = L.length - 1; q > 0; q--) { var w = Math.floor(r() * (q + 1)); var t = L[q]; L[q] = L[w]; L[w] = t; } return L; };
    /* land: up to two herds of the cell's main land biome (penguins and seals only on a coast) */
    var lb2 = null; Object.keys(landN).sort().forEach(function (k) { if (k !== lb && (!lb2 || landN[k] > landN[lb2])) lb2 = k; });
    if (lb) { var RL = roster(lb, smp[0].lat, smp[0].lon).land, sp = spots(lb), RL2 = lb2 ? roster(lb2, smp[0].lat, smp[0].lon).land : null, sp2 = lb2 ? spots(lb2) : null;
      for (var g = 0; g < 2; g++) { var two = g === 1 && RL2 && RL2.length, u0 = r(), e = pickK(two ? RL2 : RL), q0 = two ? sp2[0] : sp[g % Math.max(1, sp.length)]; if (!q0 || u0 > (g ? (two ? 0.6 : 0.4) : (tahoe ? 1 : 0.8))) continue; if (K[e[0]].coast && !anySea && !nearSea(q0.x, q0.z)) continue; herd(G, e, q0, r, f, cell); } }
    /* sea: a pod, a school, a turtle or two */
    if (sb) { var RS = roster(sb, smp[0].lat, smp[0].lon).sea, ss = spots(sb);
      for (var g2 = 0; g2 < 2; g2++) { var u1 = r(), e2 = pickK(RS), q1 = ss[g2 % Math.max(1, ss.length)]; if (!q1 || u1 > (g2 ? 0.45 : (tahoe ? 1 : 0.8))) continue; pod(G, e2, q1, r, f, cell); } }
    /* air: gulls and pelicans over a coast, egrets over the savanna and the Caribbean, eagles over Tahoe */
    var RA = (lb ? roster(lb, smp[0].lat, smp[0].lon).air : []).concat(sb ? roster(sb, smp[0].lat, smp[0].lon).air : []).concat(anySea && anyLand ? coastAir(smp[0].lat, smp[0].lon) : []);
    var u2 = r(); if (RA.length && u2 < 0.75) { var e3 = pickK(RA), q2 = smp[Math.floor(r() * smp.length) % smp.length]; flock(G, e3, q2, r, f, cell); }
    var sig = 2166136261 >>> 0; G.forEach(function (gr) { gr.m.forEach(function (m) { sig = hash(sig + '|' + gr.k + ':' + gr.realm + ':' + m.lat.toFixed(6) + ',' + m.lon.toFixed(6) + ':' + m.R.toFixed(2) + ':' + (m.side || 0).toFixed(3) + ':' + m.ph.toFixed(5)); }); }); cell.sig = sig;
    cell.n = G.reduce(function (s, gr) { return s + gr.m.length; }, 0);
  }
  function member(gr, k, x, z, f, r, R) { var ll = WFR_WORLD.toLatLon(f, x, z); return { k: k, g: gr, lat: ll.lat, lon: ll.lon, R: R, ph: r(), th: r() * TAU, dir: r() < 0.5 ? -1 : 1, s: 0.9 + r() * 0.2, fx: 0, fz: 0, ex: 0, ez: 0, yaw: r() * TAU, wx: 0, wy: 0, wz: 0, v: 0, id: gr.id + ':' + gr.m.length }; }
  function herd(G, e, q, r, f, cell) {
    var k = e[0], d = K[k], n = e[2][0] + Math.floor(r() * (e[2][1] - e[2][0] + 1)), gr = { k: k, kind: 'herd', realm: d.realm === 'wade' ? 'wade' : 'land', id: cell.key + ':' + G.length, m: [] }, rad = (d.spread || 6) * Math.sqrt(n) * 0.7;
    var cx = q.x + (r() - 0.5) * 120, cz = q.z + (r() - 0.5) * 120;
    for (var i = 0; i < n; i++) { var a = r() * TAU, dd = Math.sqrt(r()) * rad, x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd, R = 2 + r() * (d.spread || 6), ll = WFR_WORLD.toLatLon(f, x, z);
      if (!valid(k, x, z, ll.lat, ll.lon, gr.realm)) continue; var ok = true; for (var p = 0; p < 6 && R > 0; p++) { var t = p / 6 * TAU, px = x + Math.cos(t) * R, pz = z + Math.sin(t) * R, l2 = WFR_WORLD.toLatLon(f, px, pz); if (!valid(k, px, pz, l2.lat, l2.lon, gr.realm)) { ok = false; break; } }
      gr.m.push(member(gr, k, x, z, f, r, ok ? R : 0)); }
    if (gr.m.length) G.push(gr);
  }
  function pod(G, e, q, r, f, cell) {   // a pod (or a school) on one loop round its home: each member a lag behind the one before, a little to one side
    var k = e[0], d = K[k], n = e[2][0] + Math.floor(r() * (e[2][1] - e[2][0] + 1)), R = d.loop[0] + r() * (d.loop[1] - d.loop[0]), gr = { k: k, kind: 'pod', realm: d.realm === 'lake' ? 'lake' : 'sea', id: cell.key + ':' + G.length, m: [], R: R, dir: r() < 0.5 ? -1 : 1, th: r() * TAU };
    var cx = q.x, cz = q.z, ll = WFR_WORLD.toLatLon(f, cx, cz); if (!valid(k, cx, cz, ll.lat, ll.lon, gr.realm)) return;
    for (var s = 0; s < 3; s++) { var bad = false; for (var p = 0; p < 10; p++) { var t = p / 10 * TAU, px = cx + Math.cos(t) * gr.R, pz = cz + Math.sin(t) * gr.R, l2 = WFR_WORLD.toLatLon(f, px, pz); if (!valid(k, px, pz, l2.lat, l2.lon, gr.realm)) { bad = true; break; } } if (!bad) break; gr.R *= 0.5; if (s === 2) gr.R = 0; }
    gr.lat = ll.lat; gr.lon = ll.lon;
    for (var i = 0; i < n; i++) { var m = member(gr, k, cx, cz, f, r, gr.R); m.i = i; m.side = (r() - 0.5) * 2 * d.side; m.dy = (r() - 0.5) * (d.school ? 0.8 : 0.4); gr.m.push(m); }
    G.push(gr);
  }
  function flock(G, e, q, r, f, cell) {
    var k = e[0], d = K[k], n = e[2][0] + Math.floor(r() * (e[2][1] - e[2][0] + 1)), R = d.loop[0] + r() * (d.loop[1] - d.loop[0]), alt = d.alt[0] + r() * (d.alt[1] - d.alt[0]);
    var gr = { k: k, kind: 'flock', realm: 'air', id: cell.key + ':' + G.length, m: [], R: R, dir: r() < 0.5 ? -1 : 1, th: r() * TAU }, cx = q.x, cz = q.z, top = Math.max(0, H(cx, cz));
    for (var p = 0; p < 12; p++) { var t = p / 12 * TAU; top = Math.max(top, H(cx + Math.cos(t) * R, cz + Math.sin(t) * R)); }   // over the highest ground on its ring: never into a hill
    var ll = WFR_WORLD.toLatLon(f, cx, cz); gr.lat = ll.lat; gr.lon = ll.lon; gr.y = top + alt;
    for (var i = 0; i < n; i++) { var m = member(gr, k, cx, cz, f, r, R); m.i = i; m.side = (r() - 0.5) * 6; m.dy = (r() - 0.5) * 4; gr.m.push(m); }
    G.push(gr);
  }

  /* ---------- 7. each frame: the cells round her, who is drawn, how each one reacts to her ---------- */
  function herNow() { var S = X.S, T = X.TR, h = st.her; h.x = S.pos.x; h.y = S.pos.y; h.z = S.pos.z; h.agl = S.pos.y - Math.max(0, H(S.pos.x, S.pos.z)); var ll = WFR_WORLD.toLatLon(T.f, S.pos.x, S.pos.z); h.lat = ll.lat; h.lon = ll.lon; h.yaw = S.yaw || 0; return h; }
  function cellsNear(her) {
    var dLat = (C.R_SPAWN + 1600) / 111320, i0 = Math.floor((her.lat - dLat) / C.CELL), i1 = Math.floor((her.lat + dLat) / C.CELL), out = [];
    for (var i = i0; i <= i1; i++) { var ls = lonStep(i), dLon = (C.R_SPAWN + 1600) / (111320 * Math.max(0.05, Math.cos(her.lat * D2R))), j0 = Math.floor((her.lon - dLon + 180) / ls), j1 = Math.floor((her.lon + dLon + 180) / ls);
      for (var j = j0; j <= j1; j++) { var b = cellBox(i, j), cLat = (b.lat0 + b.lat1) / 2, cLon = (b.lon0 + b.lon1) / 2, d = WFR_WORLD.distance(her, { lat: cLat, lon: cLon }); if (d < C.R_SPAWN + 1600) out.push({ i: i, j: j, d: d, b: b }); } }
    return out.sort(function (a, b) { return a.d - b.d; });
  }
  function cellsTick(dt) {
    var her = herNow(), f = X.TR.f, near = cellsNear(her), keep = new Set(), pops = 0, t0 = performance.now();
    for (var n = 0; n < near.length; n++) { var c = near[n], key = cellKey(c.i, c.j); keep.add(key); var cell = st.cells.get(key);
      if (!cell) { cell = { key: key, lat0: c.b.lat0, lat1: c.b.lat1, lon0: c.b.lon0, lon1: c.b.lon1, groups: null, wait: 0, seen: st.t }; st.cells.set(key, cell); }
      cell.seen = st.t; cell.d = c.d;
      if (!cell.groups && pops < C.POP && performance.now() - t0 < C.POP_MS && c.d < C.R_SPAWN + 1600) {   // one cell a frame, and only while the frame has room (C1: no hitch as she flies)
        var smp = sampleCell(cell, f); if (!smp) { st.waits++; continue; }
        if (smp.img < smp.length && cell.wait < C.IMG_WAIT && window.WFR_IMAGERY && WFR_IMAGERY.enabled && WFR_IMAGERY.enabled()) { cell.wait += dt; continue; }   // a moment for the real colour to arrive (never forever)
        populate(cell, smp, f); pops++; st.pops++; if (smp.img === smp.length) st.img++; else st.tint++; } }
    st.act = []; st.cells.forEach(function (cell) { if (cell.groups && keep.has(cell.key) && cell.d < C.R_DROP) st.act.push(cell); });
    if (st.cells.size > C.KEEP) { var old = []; st.cells.forEach(function (cell) { if (!keep.has(cell.key)) old.push(cell); }); old.sort(function (a, b) { return a.seen - b.seen; }); for (var q = 0; q < old.length && st.cells.size > C.KEEP; q++) { st.cells.delete(old[q].key); st.drops++; } }
  }
  /* where a member is now, at the clock (deterministic: the same visit at the same game time looks the same), before her influence */
  function motion(m, d, gr, t, out) {
    var T = st.t;
    if (gr.kind === 'herd') {   // walk a small loop round its spot, rest a while, walk again (a bear rests longer)
      var Pd = 18 + m.ph * 14, duty = 1 - (d.rest || 0.45), tt = T + m.ph * Pd, cyc = Math.floor(tt / Pd), w = tt - cyc * Pd, walked = cyc * duty * Pd + Math.min(w, duty * Pd), moving = m.R > 0 && w < duty * Pd;
      var th = m.th + m.dir * walked * d.v / Math.max(1, m.R); out.ox = Math.cos(th) * m.R; out.oz = Math.sin(th) * m.R; out.yaw = m.R > 0 ? Math.atan2(-Math.sin(th) * m.dir, Math.cos(th) * m.dir) : m.yaw; out.mv = moving; out.y = 0; out.pitch = 0; out.roll = 0; return out; }
    if (!(gr.R >= 1)) { out.ox = m.side || 0; out.oz = 0; out.yaw = m.yaw; out.mv = true; out.pitch = 0; out.roll = 0; out.y = gr.kind === 'flock' ? m.dy : d.y + (m.dy || 0); return out; }   // no room for a loop: it keeps its spot
    var dir = gr.dir, v = d.v, th2 = gr.th + dir * T * v / Math.max(1, gr.R) - (m.i || 0) * (d.lag || 0.1) * (gr.R > 0 ? 1 : 0), rr = gr.R + m.side;
    out.ox = Math.cos(th2) * rr; out.oz = Math.sin(th2) * rr; out.yaw = gr.R > 0 ? Math.atan2(-Math.sin(th2) * dir, Math.cos(th2) * dir) : m.yaw; out.mv = true; out.pitch = 0; out.roll = 0;
    if (gr.kind === 'flock') { var bank = Math.atan(v * v / Math.max(5, rr) / 9.8); out.roll = clamp(bank, 0, 0.7) * -dir; out.y = m.dy + 1.5 * Math.sin(T * 0.4 + m.ph * 6); out.mv = Math.sin(T * 0.7 + m.ph * 9) > -0.2; return out; }
    out.y = d.y + m.dy;
    if (d.leap || d.porpoise) { var Lp = 6 + m.ph * 5, u = ((T + m.ph * 37) % Lp) / 1.2; if (u < 1) { var hgt = (d.leap ? 1.1 : 0.5) - d.y; out.y = d.y + hgt * Math.sin(Math.PI * u); out.pitch = -Math.atan2(hgt * Math.PI * Math.cos(Math.PI * u) / 1.2, v); } }
    if (d.surface) { var cyc2 = ((T + m.ph * 90) % 45) / 45, up = cyc2 < 0.22 ? Math.sin(cyc2 / 0.22 * Math.PI) : 0; out.y = d.y + (-0.35 - d.y) * up; out.pitch = -0.08 * Math.cos(cyc2 / 0.22 * Math.PI) * (cyc2 < 0.22 ? 1 : 0); }   // a humpback's back rises to the surface to breathe, every 45 s
    return out;
  }
  var MO = { ox: 0, oz: 0, yaw: 0, mv: false, y: 0, pitch: 0, roll: 0 };
  function homeOf(gr, m, f, o) { var p = WFR_WORLD.toLocal(f, gr.kind === 'herd' ? m.lat : gr.lat, gr.kind === 'herd' ? m.lon : gr.lon); o.x = p.x; o.z = p.z; return o; }
  var HO = { x: 0, z: 0 };
  function react(m, d, gr, f, her, dt, mo) {   // the four temperaments, light: passive flee, curious come to look (dolphins escort), sometimes face her, malicious circle under her
    homeOf(gr, m, f, HO); var bx = HO.x + mo.ox, bz = HO.z + mo.oz, x = bx + m.fx + m.ex, z = bz + m.fz + m.ez, dx = x - her.x, dz = z - her.z, dh = Math.hypot(dx, dz), tp = temper(m.k);
    var groundY = gr.realm === 'air' ? gr.y : gr.realm === 'land' || gr.realm === 'wade' ? m.wy : gr.realm === 'lake' ? C.TAHOE_LV : 0, low = her.y - groundY < (gr.realm === 'air' ? 12 : C.FLEE_Y) && her.y - groundY > -12, act = null;
    if (tp === 0 && dh < C.FLEE_R && low) {   // PASSIVE: away from her, at its run (checked for footing / water each step)
      var vx = dx / (dh || 1) * C.RUN * dt * (gr.realm === 'air' ? 3 : gr.realm === 'land' ? 1 : 1.5), vz = dz / (dh || 1) * C.RUN * dt * (gr.realm === 'air' ? 3 : gr.realm === 'land' ? 1 : 1.5), nx = m.fx + vx, nz = m.fz + vz;
      if (Math.hypot(nx, nz) < C.FLEE_MAX && (gr.realm === 'air' || (function () { var ll = WFR_WORLD.toLatLon(f, bx + nx + m.ex, bz + nz + m.ez); return valid(m.k, bx + nx + m.ex, bz + nz + m.ez, ll.lat, ll.lon, gr.realm); })())) { m.fx = nx; m.fz = nz; }
      act = 'flee'; m.yaw2 = Math.atan2(dx, dz); st.flees++;
    } else if (tp === 1 && gr.realm === 'sea' && dh < C.ESC_R && her.y < C.ESC_Y && her.y > -2) {   // CURIOUS at sea: the pod comes alongside her and keeps pace (dolphins bow-ride her)
      var side = (m.i % 2 ? 1 : -1) * (6 + (m.i || 0) * 1.6), tx = her.x + Math.cos(her.yaw) * side + Math.sin(her.yaw) * (4 - (m.i || 0) * 2.5), tz = her.z - Math.sin(her.yaw) * side + Math.cos(her.yaw) * (4 - (m.i || 0) * 2.5);
      var ex = tx - bx - m.fx, ez = tz - bz - m.fz, ddx = ex - m.ex, ddz = ez - m.ez, dl = Math.hypot(ddx, ddz), stp = Math.min(dl, C.ESC_V * dt * 2.5);
      if (dl > 0.01 && Math.hypot(m.ex + ddx / dl * stp, m.ez + ddz / dl * stp) < C.ESC_MAX) { var px = bx + m.fx + m.ex + ddx / dl * stp, pz = bz + m.fz + m.ez + ddz / dl * stp, l3 = WFR_WORLD.toLatLon(f, px, pz); if (valid(m.k, px, pz, l3.lat, l3.lon, 'sea')) { m.ex += ddx / dl * stp; m.ez += ddz / dl * stp; } }
      act = 'escort'; m.yaw2 = dl > 0.3 ? Math.atan2(ddx, ddz) : her.yaw; st.escorts++;
    } else if (tp === 3 && gr.realm === 'sea' && dh < 90 && her.y < C.SHARK_Y && her.y > -2) {   // MALICIOUS: the shark circles under her
      var a2 = st.t * 0.6 + (m.i || 0) * 2, tx2 = her.x + Math.cos(a2) * 7, tz2 = her.z + Math.sin(a2) * 7, gx = tx2 - bx - m.fx - m.ex, gz = tz2 - bz - m.fz - m.ez, gl = Math.hypot(gx, gz), s2 = Math.min(gl, 6 * dt);
      if (gl > 0.01 && Math.hypot(m.ex + gx / gl * s2, m.ez + gz / gl * s2) < C.ESC_MAX) { var qx = bx + m.fx + m.ex + gx / gl * s2, qz = bz + m.fz + m.ez + gz / gl * s2, l4 = WFR_WORLD.toLatLon(f, qx, qz); if (valid(m.k, qx, qz, l4.lat, l4.lon, 'sea')) { m.ex += gx / gl * s2; m.ez += gz / gl * s2; } }
      act = 'circle'; m.yaw2 = Math.atan2(gx, gz); st.circles++;
    } else if ((tp === 1 || tp === 2) && (gr.realm === 'land' || gr.realm === 'wade') && dh < C.NOTICE && low) { act = 'face'; m.yaw2 = Math.atan2(her.x - x, her.z - z); st.faces++; }   // CURIOUS / SOMETIMES on land: it turns to look at her
    if (act !== 'flee') { var fl = Math.hypot(m.fx, m.fz); if (fl > 0) { var k2 = Math.max(0, fl - 1.2 * dt) / fl; m.fx *= k2; m.fz *= k2; } }
    if (act !== 'escort' && act !== 'circle') { var el = Math.hypot(m.ex, m.ez); if (el > 0) { var k3 = Math.max(0, el - 2.5 * dt) / el; m.ex *= k3; m.ez *= k3; } }
    m.act = act;
  }
  /* the scene's onBeforeRender: every drawn animal placed in the frame the picture is drawn in (after the travel zone's re-centre), on the ground the game draws */
  function place() {
    if (!st.inited || !st.enabled) return; var t0 = performance.now();
    try {
      for (var k in st.kinds) { var R = st.kinds[k]; R.n[0] = 0; R.n[1] = 0; R.near = 1e9; }
      var on = st.mode === 'travel' && X.TR && X.TR.on && X.TR.f, f = on ? X.TR.f : null, S = X.S;
      if (on) for (var c = 0; c < st.act.length; c++) { var G = st.act[c].groups; for (var g = 0; g < G.length; g++) { var gr = G[g], d = K[gr.k], R2 = st.kinds[gr.k]; if (!R2 || !R2.ok) continue;
        for (var i = 0; i < gr.m.length; i++) { var m = gr.m[i]; motion(m, d, gr, st.t, MO); homeOf(gr, m, f, HO); var x = HO.x + MO.ox + m.fx + m.ex, z = HO.z + MO.oz + m.fz + m.ez, y, wat = -1e4, pitch = MO.pitch, roll = MO.roll, yaw = m.act ? m.yaw2 : MO.yaw, mv = MO.mv || !!m.act;
          var dd = Math.hypot(x - S.pos.x, z - S.pos.z); if (dd > C.R_DROP) continue;   // despawned past 2.4 km (its cell keeps it for her return)
          if (gr.realm === 'land' || gr.realm === 'wade') { y = H(x, z) - (gr.realm === 'wade' ? d.sink || 0 : 0); if (m.act === 'face') mv = false; }
          else if (gr.realm === 'air') y = gr.y + MO.y;
          else if (gr.realm === 'lake') { y = C.TAHOE_LV + d.y + m.dy; wat = C.TAHOE_LV; }
          else { y = MO.y; wat = 0; if (d.make === 'penguin') pitch += Math.PI / 2 * 0.92; }
          put(R2, mv ? 0 : 1, gr.id + ':' + i, x, y, z, yaw, pitch, roll, m.s, wat, gr.realm); m.wx = x; m.wy = y; m.wz = z;
          if (dd < R2.near) R2.near = dd; } } }
      if (st.dunns) dunnsPlace();
      for (var k2 in st.kinds) { var R3 = st.kinds[k2]; if (!R3.ok) continue; for (var v = 0; v < 2; v++) { var im = R3.v[v].im; im.count = R3.n[v]; if (R3.n[v]) { im.instanceMatrix.needsUpdate = true; im.geometry.attributes.aWater714.needsUpdate = true; } } }
      st.placeN++;
    } catch (e) { st.fault = 'place: ' + (e && e.message || e); st.enabled = false; for (var k3 in st.kinds) if (st.kinds[k3].ok) st.kinds[k3].v.forEach(function (P) { P.im.count = 0; }); }
    var ms = performance.now() - t0; st.placeMs = (st.placeMs || 0) + ms;
  }
  function put(R, v, id, x, y, z, yaw, pitch, roll, s, wat, realm) {   // one instance: T . Ry(yaw) . Rx(pitch) . Rz(roll) . S (the island's 'YXZ' order)
    if (v === 1 && R.n[1] >= C.CAP) v = 0; if (R.n[v] >= C.CAP) return; var P = R.v[v], i = R.n[v]++, A = P.im.instanceMatrix.array, o = i * 16;
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    var m00 = cy * cr + sy * sp * sr, m01 = -cy * sr + sy * sp * cr, m02 = sy * cp, m10 = cp * sr, m11 = cp * cr, m12 = -sp, m20 = -sy * cr + cy * sp * sr, m21 = sy * sr + cy * sp * cr, m22 = cy * cp;
    A[o] = m00 * s; A[o + 1] = m10 * s; A[o + 2] = m20 * s; A[o + 3] = 0; A[o + 4] = m01 * s; A[o + 5] = m11 * s; A[o + 6] = m21 * s; A[o + 7] = 0; A[o + 8] = m02 * s; A[o + 9] = m12 * s; A[o + 10] = m22 * s; A[o + 11] = 0;
    A[o + 12] = x; A[o + 13] = y; A[o + 14] = z; A[o + 15] = 1; P.im.geometry.attributes.aWater714.array[i] = wat; P.im.userData.ids[i] = id; P.im.userData.realm[i] = realm;
  }

  /* ---------- 8. DUNN'S RIVER (its own patch: the falls' terraces and pools, world712-dunns.js): egrets over the falls, pelicans and gulls over its
     beach, fish in the pools. Placed in the patch's own metres through its group's matrix, in either zone (the crossing or the travel frame) ---------- */
  function dunnsBuild() {
    var D = X.D, d = X.dData ? X.dData() : null; if (!D || !d || !d.terr) return null; var T = d.terr, r = rng(hash('wa714:dunns')), G = [], i, W = X.WATER || 0;
    var foot = d.P && d.P.dunns ? d.P.dunns.bottom : [T[T.length - 4], T[T.length - 3]], mid = [(T[0] + T[T.length - 4]) / 2, (T[1] + T[T.length - 3]) / 2];
    var gL = function (x, z) { return W + X.dG(x, z); };
    var ring = function (c, R) { var top = gL(c[0], c[1]); for (var p = 0; p < 12; p++) { var t = p / 12 * TAU; top = Math.max(top, gL(c[0] + Math.cos(t) * R, c[1] + Math.sin(t) * R)); } return top; };
    [['egret', mid, 26, 16, 6], ['pelican', [foot[0], foot[1] + 60], 40, 14, 3], ['gull', [foot[0] + 30, foot[1] + 30], 45, 22, 5]].forEach(function (e) {
      var gr = { k: e[0], kind: 'flock', id: 'dunns:' + G.length, m: [], R: e[2], dir: r() < 0.5 ? -1 : 1, th: r() * TAU, cx: e[1][0], cz: e[1][1] }; gr.y = ring(e[1], e[2]) + e[3];
      for (var q = 0; q < e[4]; q++) gr.m.push({ k: e[0], i: q, ph: r(), side: (r() - 0.5) * 6, dy: (r() - 0.5) * 3, s: 0.9 + r() * 0.2 }); G.push(gr); });
    var pools = { k: 'poolfish', kind: 'pools', id: 'dunns:pools', m: [] };
    for (i = 0; i + 6 < T.length; i += 7) { if (Math.abs(T[i + 2] - T[i + 5]) > 1.2) continue; var L = Math.hypot(T[i + 3] - T[i], T[i + 4] - T[i + 1]); if (L < 4) continue;   // a pool: the gentle part of a terrace
      for (var q2 = 0; q2 < 4; q2++) pools.m.push({ k: 'poolfish', seg: i, L: L, ph: r(), off: (r() - 0.5) * T[i + 6] * 0.9, v: 0.3 + r() * 0.4, s: 0.85 + r() * 0.3 }); }
    G.push(pools); return { G: G, T: T, n: G.reduce(function (s, g) { return s + g.m.length; }, 0) };
  }
  var V3 = [0, 0, 0];
  function hostPt(e, x, y, z) { V3[0] = e[0] * x + e[4] * y + e[8] * z + e[12]; V3[1] = e[1] * x + e[5] * y + e[9] * z + e[13]; V3[2] = e[2] * x + e[6] * y + e[10] * z + e[14]; return V3; }
  function dunnsPlace() {
    var D = X.D, P = st.dunns; if (!D || !D.group || D.group.parent !== X.scene || !P) return; D.group.updateMatrixWorld(); var e = D.group.matrixWorld.elements, rot = Math.atan2(e[8], e[10]), T = P.T, W = X.WATER || 0;
    P.G.forEach(function (gr) { var R = st.kinds[gr.k]; if (!R || !R.ok) return; var d = K[gr.k];
      if (gr.kind === 'pools') { gr.m.forEach(function (m, i) { var u = ((st.t * m.v / m.L + m.ph) % 2 + 2) % 2, fw = u < 1, w = fw ? u : 2 - u, s = m.seg, dx = T[s + 3] - T[s], dz = T[s + 4] - T[s + 1], l = Math.hypot(dx, dz) || 1;
          var lx = T[s] + dx * w + dz / l * m.off, lz = T[s + 1] + dz * w - dx / l * m.off, ly = W + T[s + 2] + (T[s + 5] - T[s + 2]) * w + 0.2, p = hostPt(e, lx, ly, lz);
          put(R, 0, gr.id + ':' + i, p[0], p[1], p[2], Math.atan2(dx, dz) + (fw ? 0 : Math.PI) + rot, 0, 0, m.s, -1e4, 'pool'); }); return; }
      gr.m.forEach(function (m, i) { var th = gr.th + gr.dir * st.t * d.v / gr.R - i * (d.lag || 0.3), rr = gr.R + m.side, lx = gr.cx + Math.cos(th) * rr, lz = gr.cz + Math.sin(th) * rr, ly = gr.y + m.dy + 1.2 * Math.sin(st.t * 0.4 + m.ph * 6), p = hostPt(e, lx, ly, lz);
        put(R, Math.sin(st.t * 0.7 + m.ph * 9) > -0.2 ? 0 : 1, gr.id + ':' + i, p[0], p[1], p[2], Math.atan2(-Math.sin(th) * gr.dir, Math.cos(th) * gr.dir) + rot, 0, -0.35 * gr.dir, m.s, -1e4, 'air'); }); });
  }

  /* ---------- 9. init and tick ---------- */
  function init(ctx) {
    if (st.inited) return true; X = ctx || {};
    try {
      if (!X.THREE || !X.scene || !window.WFR_WORLD) { st.fault = 'init: no THREE, scene or WFR_WORLD'; return false; }
      if (X.classic && X.classic()) { st.fault = 'classic look: the world animals are Standard only (board 645)'; return false; }
      if (!window.WFR_ANIMALS || !WFR_ANIMALS.kit) { st.fault = 'init: no animals714.js kit'; return false; }
      KIT = WFR_ANIMALS.kit; PR = KIT.prim || null; if (!PR) { st.fault = 'init: animals714.js has no kit.prim (run the wire)'; return false; }
      var THREE = X.THREE; st.mat = new THREE.MeshLambertMaterial({ vertexColors: true }); st.mat.name = 'worldanimals'; st.mat.userData.uWA714 = { col: { value: new THREE.Color(C.WATER_COL[0], C.WATER_COL[1], C.WATER_COL[2]) } }; st.mat.onBeforeCompile = OBC;
      var root = new THREE.Group(); root.name = 'worldanimals'; root.matrixAutoUpdate = false; root.layers.enable(C.LAYER); st.root = root;
      var kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3)); kg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
      kg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3)); kg.setAttribute('aWater714', new THREE.InstancedBufferAttribute(new Float32Array(1), 1));
      var keep = meshOf(THREE, kg, 1); keep.name = 'worldanimals:keep'; keep.count = 1; keep.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0)); root.add(keep); st.keep = keep;   // the keeper: one empty instance, so the program compiles at load
      X.scene.add(root); root.updateMatrixWorld(true);
      var prev = X.scene.onBeforeRender; X.scene.onBeforeRender = function () { if (typeof prev === 'function') prev.apply(this, arguments); place(); }; st.hook = true;
      st.inited = true; hookFeatures(); return true;
    } catch (e) { st.fault = 'init: ' + (e && e.message || e); return false; }
  }
  function tick(dt) {
    if (!st.inited || !st.enabled) return; var t0 = performance.now(); dt = dt || 0;
    try {
      st.t += dt; st.dt = dt; st.frame++;
      if (st.programsAt == null && st.frame > 30 && X.renderer) st.programsAt = X.renderer.info.programs.length;
      if (!st.featHooked && (st.featPoll -= dt) <= 0) { st.featPoll = 2; hookFeatures(); }
      var T = X.TR, on = !!(T && T.on && T.f && T.st && X.S && X.S.pos), agl = on ? X.S.pos.y - Math.max(0, H(X.S.pos.x, X.S.pos.z)) : 0;
      st.mode = on && agl < C.AGL_MAX ? 'travel' : 'off';
      if (st.mode === 'travel') { cellsTick(dt); var her = st.her, f = T.f;
        for (var c = 0; c < st.act.length; c++) { var G = st.act[c].groups; for (var g = 0; g < G.length; g++) { var gr = G[g], d = K[gr.k]; if (!st.kinds[gr.k]) { if (st.buildN !== st.frame) { st.buildN = st.frame; buildKind(gr.k); } }
          for (var i = 0; i < gr.m.length; i++) { var m = gr.m[i]; motion(m, d, gr, st.t, MO); react(m, d, gr, f, her, dt, MO); } } } }
      else st.act = [];
      var D = X.D; if (D && D.group && D.group.parent === X.scene && X.dData && X.dData()) { if (!st.dunns) { st.dunns = dunnsBuild(); } if (st.dunns) st.dunns.G.forEach(function (gr) { if (!st.kinds[gr.k] && st.buildN !== st.frame) { st.buildN = st.frame; buildKind(gr.k); } }); }
      /* the pose: every kind drawn last frame, near ones every frame, far ones now and then */
      for (var k in st.kinds) { var R = st.kinds[k]; if (!R.ok || !(R.n[0] + R.n[1])) continue; var every = R.near < 250 ? 1 : R.near < 800 ? 3 : 8; R.acc = (R.acc || 0) + dt; if ((st.frame + R.k.length) % every === 0) { poseKind(R, R.acc); R.acc = 0; } }
    } catch (e) { st.fault = 'tick: ' + (e && e.message || e); st.faultAt = String(e && e.stack || '').split(String.fromCharCode(10)).slice(0, 4).join(' | '); st.enabled = false; for (var k2 in st.kinds) if (st.kinds[k2].ok) st.kinds[k2].v.forEach(function (P) { P.im.count = 0; }); }   // a fault takes the animals away, never the game
    var ms = performance.now() - t0 + (st.placeMs || 0); st.placeMs = 0; st.ms.push(ms); if (st.ms.length > 600) st.ms.shift(); if (ms > st.msMax) st.msMax = ms;
  }

  /* ---------- 10. the bench's reads (guards only) ---------- */
  function drawn() {   // what SHIPS: every drawn animal read back from the instance buffers
    var out = []; for (var k in st.kinds) { var R = st.kinds[k]; if (!R.ok) continue; R.v.forEach(function (P, v) { var A = P.im.instanceMatrix.array, W = P.im.geometry.attributes.aWater714.array;
      for (var i = 0; i < P.im.count; i++) { var o = i * 16; out.push({ k: k, realm: P.im.userData.realm[i], v: v, id: P.im.userData.ids[i], x: A[o + 12], y: A[o + 13], z: A[o + 14], s: Math.hypot(A[o], A[o + 1], A[o + 2]), wat: W[i] }); } }); }
    return out; }
  function peek() {
    var byKind = {}, draws = 0, tris = 0; for (var k in st.kinds) { var R = st.kinds[k]; if (!R.ok) continue; R.v.forEach(function (P) { if (P.im.count) { draws++; tris += P.im.count * P.m.count / 3; byKind[k] = (byKind[k] || 0) + P.im.count; } }); }
    var ms = st.ms.slice().sort(function (a, b) { return a - b; }), act = st.act.map(function (c) { return { key: c.key, n: c.n, sig: c.sig, b: c.biomes, d: Math.round(c.d) }; });
    return { inited: st.inited, enabled: st.enabled, fault: st.fault, faultAt: st.faultAt || null, mode: st.mode, t: +st.t.toFixed(2), cells: st.cells.size, act: act, pops: st.pops, drops: st.drops, waits: st.waits, img: st.img, tint: st.tint,
      byKind: byKind, draws: draws, tris: Math.round(tris), built: st.built.slice(), models: st.models, dunns: st.dunns ? st.dunns.n : 0,
      programsAt: st.programsAt, programs: X && X.renderer ? X.renderer.info.programs.length : null, waPrograms: X && X.renderer ? X.renderer.info.programs.filter(function (q) { return /uWA714/.test(q.cacheKey || ''); }).length : null,
      ms: { n: ms.length, med: ms.length ? +ms[ms.length >> 1].toFixed(3) : null, p95: ms.length ? +ms[Math.floor(ms.length * 0.95)].toFixed(3) : null, max: +st.msMax.toFixed(3) },
      reacts: { flees: st.flees, escorts: st.escorts, faces: st.faces, circles: st.circles }, featTiles: st.featTiles, featFault: st.featFault, hook: st.hook, placeN: st.placeN, her: st.her };
  }
  return { C: C, KINDS: K, init: init, tick: tick, peek: peek, drawn: drawn, biomeAt: biomeAt, roster: roster,
    resetMs: function () { st.ms = []; st.msMax = 0; }, forget: function () { st.cells.clear(); st.act = []; },   // the bench's revisit: every cell generated again from its key
    cell: function (key) { var c = st.cells.get(key); return c ? { key: c.key, n: c.n, sig: c.sig, b: c.biomes } : null; },
    model: function (k) { KIT = KIT || (window.WFR_ANIMALS && WFR_ANIMALS.kit); PR = PR || (KIT && KIT.prim); var d = K[k]; if (!d || !KIT || !PR) return null; return d.kit ? KIT.build(d.kit) : (Q[d.make] || B[d.make] || S3[d.make])(); },   // pure: a kind's body (the unit bench)
    pose: function (k, m, mv, dt) { var d = K[k], a = { sp: d.kit || d.sp, v: mv ? d.v : 0, mv: d.realm === 'air' && mv ? 1 : 0, k: mv ? 1.3 : 0, stand: 0, curl: 0, state: mv ? 'approach' : 'idle', fold: 0, air: false, rear: 0, yaw: 0, atk: -1, swim: d.realm !== 'land' && d.realm !== 'air' }; if (d.make === 'penguin') posePenguin(m, a, dt); else KIT.pose(m, a, dt); return m; },
    set enabled(v) { st.enabled = !!v; if (!v) for (var k in st.kinds) if (st.kinds[k].ok) st.kinds[k].v.forEach(function (P) { P.im.count = 0; }); }, get enabled() { return st.enabled; } };
})();
