/* pirate.js - BOARD 669 U1, THE PIRATE SHIP ON THE HORIZON (Marth, Oct 16 2026 ~00:45: "...the pirate boat that comes from the outskirts
   of the render, appears when its a bit rainy, ((thats the setting of the battle with the hawk,)) and once u give them some of the special
   item(s) - purchasable from beandie, theyll take you. past the games invisible wall, only accessible when on the pirate boat."). Itachi's
   brief: BRIEF_669_PIRATE_AND_THE_HAWK_COURSE_2026-10-16.md, U1. On a rainy day the ship sails in out of the fog and anchors just past the
   wind wall, off the village's shore, its pirate on the deck: she can see it, not reach it (U2 brings it in). At night, or when the rain
   stops, it sails away. Nothing about it is saved: a reload finds it gone, and the next rain brings it again.
   EVERY DISTANCE IS MEASURED FROM THE WALL (Marth Oct 16 ~04:05, row 671: the Standard map will grow): the game passes its EDGE in, and the
   ship anchors at EDGE + C.ANCHOR, shows at EDGE + C.FROM, hides at EDGE + C.AWAY. A bigger EDGE moves the whole voyage out with the wall.
   Its bearing is the village's (passed in), so a moved village moves the anchorage with it.
   Art: original low-poly (a hull with a pointed bow and a raised stern, three masts, black sails, a jib, a flag, a wale stripe, gun ports;
   a pirate in a red coat and bandana), merged: FOUR meshes, each the game's own plain Lambert (lam(): no map, no vertex colours, front
   side) so no new shader program is made; no shadow (no extra pass). The pirate is his own two meshes in his own group, so U2-U4 can move him.
   Like weather.js it never throws into the game: a fault hides the ship; the game goes on. No allocation once built (the bench door may).
   U2 (Trunks, Oct 16; brief U2; wire-669-landing.js): with o.reach the ship anchors INSIDE the wall (EDGE + REACH, the brief's 315), pushed
   out until its hull clears 646's circling boat (o.clear(): that ring's outer radius, the boat's ring being EDGE - 20 today) by GAP metres;
   once it lies settled there its main deck is ground (deck(), joined to groundAt by the game) and a landing spot (spot()); o.keep() holds
   it at anchor while she lands on it or answers its prompt. Without o.reach it is U1's ship, unchanged.
   715 (Trunks, Oct 28; wire-715a-the-ship-home.js): inst.pin (null by default: the island's ship unchanged) holds it where the game puts it
   (Damned's shore, the ride home) with its deck offered while pin.deck; inst.unpin(home) lets go, home = at its own anchorage.
   Every number in C is a DRAFT (reasoned, not measured on his phone): his eye decides. */
window.WFR_PIRATE = (function () {
  'use strict';
  var C = {
    ANCHOR: 15,      /* metres past EDGE where it anchors (345 at EDGE 330: the brief's d 345) while she may not land on it (U1 alone) */
    REACH: -15,      /* U2 (o.reach): metres past EDGE where it anchors once she may land on it: inside the wall (the brief's d 315 at EDGE 330) */
    GAP: 3,          /* U2: metres of open water kept between its hull and 646's circling boat (o.clear(): that boat's outer radius); pushes REACH out */
    SPOT_X: 1.2, SPOT_Z: 0.9,     /* U2: where a landing aims on the main deck (metres, its own frame): 3.3 m fore of the pirate, beside the main mast, so the two-shot sees them side by side from the shore */
    SETTLE: 0.002,   /* U2: the deck is offered only once it lies at anchor AND has swung to its line (rad): never a deck still turning under her */
    FROM: 230,       /* metres past EDGE where it first shows: past the rain fog's far line (216 m by day) from anywhere she can fly */
    AWAY: 400,       /* metres past EDGE where it hides again: past a clear day's fog too (360; 400 with the Owl's night eyes) */
    ARC: 140,        /* metres along the shore it sweeps coming in (and going out): it arrives broadside, never head-on */
    V: 7,            /* mean speed on a leg (m/s); each leg eases out of rest and into it (peak 1.5 V) */
    TURN: 0.35,      /* how fast it swings (rad/s) toward its heading; at anchor toward its line along the shore */
    NIGHT: 0.5,      /* nightAmt past which it sails away */
    COMES: { rain: 1, drizzle: 1 },   /* the weathers it comes in (his "a bit rainy"): never 'storm', never 'pour' */
    SIZE: 1.6,       /* the ship's design units to metres (the villagers stand ~3.4 m: humans.js scale 1.35) */
    MAN: 1.7,        /* the pirate's design (2 m) to the villagers' height */
    BOB: 0.18, BOBT: 5.0, ROLL: 2.5 * Math.PI / 180, ROLLT: 6.1, PITCH: 1.2 * Math.PI / 180, PITCHT: 7.3
  };
  /* the main deck in the ship's own frame (x across to starboard, z to the bow, y up from the water line), in metres: U2's landing */
  C.DECK = 1.8 * C.SIZE; C.HALF_W = 2.3 * C.SIZE; C.STERN = -3.4 * C.SIZE; C.MID = 4 * C.SIZE; C.BOW = 7.98 * C.SIZE;
  var API = { error: '', last: null, C: C };

  function create(T, scene, o) {   /* the instance is kept as WFR_PIRATE.last (for the bench); a fault as WFR_PIRATE.error */
    try { var inst = build(T, scene, o); API.last = inst; return inst; } catch (err) { API.error = String(err && err.message || err); return null; }
  }
  /* [geometry, x, y, z, rx?] -> one non-indexed geometry with flat normals, scaled by s; the parts are freed (copied from boat.js, 646) */
  function merge(T, parts, s) {
    var pos = [], i, k, g, n, a;
    for (i = 0; i < parts.length; i++) {
      g = parts[i][0]; if (parts[i][4]) g.rotateX(parts[i][4]); g.translate(parts[i][1], parts[i][2], parts[i][3]);
      n = g.index ? g.toNonIndexed() : g; a = n.attributes.position.array;
      for (k = 0; k < a.length; k++) pos.push(a[k] * s);
      if (n !== g) n.dispose(); g.dispose();
    }
    var out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.computeVertexNormals(); out.computeBoundingSphere(); return out;
  }
  function tri(T, A, B, Cc) {   /* a flat triangle seen from both sides (both windings: the material is front-side) */
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute([A[0], A[1], A[2], B[0], B[1], B[2], Cc[0], Cc[1], Cc[2], A[0], A[1], A[2], Cc[0], Cc[1], Cc[2], B[0], B[1], B[2]], 3));
    return g;
  }

  function build(T, scene, o) {
    var E = +o.edge; if (!(E > 0)) throw new Error('669: no EDGE passed in');
    var B = function (w, h, d) { return new T.BoxGeometry(w, h, d); };
    var rp = 4.6 / Math.sqrt(3), bz = 4 + rp / 2;   /* the bow: a three-sided prism whose back edge is the hull's width (boat.js's way) */
    var wood = merge(T, [
      [B(4.6, 2.8, 10), 0, 0.4, -1],                                   /* the hull, from under the water to the main deck (1.8) */
      [new T.CylinderGeometry(rp, rp, 2.8, 3), 0, 0.4, bz],             /* the bow, pointed (its tip at z 7.98) */
      [B(4.6, 1.5, 2.6), 0, 2.55, -4.7],                                /* the raised stern (the quarterdeck) */
      [B(0.16, 0.7, 7.4), 2.22, 2.15, 0.3], [B(0.16, 0.7, 7.4), -2.22, 2.15, 0.3],   /* the main deck's rails */
      [B(0.16, 0.55, 2.6), 2.22, 3.57, -4.7], [B(0.16, 0.55, 2.6), -2.22, 3.57, -4.7], [B(4.6, 0.55, 0.16), 0, 3.57, -5.92],   /* the stern's rails */
      [B(0.36, 13.4, 0.36), 0, 8.5, 0.4],                               /* the main mast (to 15.2) */
      [B(0.3, 9.6, 0.3), 0, 6.6, 4.6],                                  /* the fore mast */
      [B(0.24, 6.0, 0.24), 0, 6.3, -4.6],                               /* the mizzen, on the stern */
      [B(6.6, 0.2, 0.2), 0, 7.2, 0.62], [B(5.2, 0.18, 0.18), 0, 11.6, 0.6], [B(5.4, 0.18, 0.18), 0, 6.6, 4.8], [B(4.2, 0.18, 0.18), 0, 9.8, 4.78],   /* the yards */
      [B(1.1, 0.5, 1.1), 0, 12.5, 0.4],                                 /* the crow's nest */
      [B(0.22, 0.22, 4.4), 0, 2.6, 9.6, -0.3],                          /* the bowsprit, tilted up */
      [B(0.2, 2.2, 0.9), 0, 0.2, -6.4]                                  /* the rudder */
    ], C.SIZE);
    var ports = []; for (var pz = -4; pz <= 2; pz += 2) { ports.push([B(0.06, 0.4, 0.5), 2.33, 0.45, pz]); ports.push([B(0.06, 0.4, 0.5), -2.33, 0.45, pz]); }
    var dark = merge(T, [
      [B(6.0, 4.0, 0.08), 0, 5.1, 0.75], [B(4.8, 3.6, 0.08), 0, 9.7, 0.72],   /* the main sails, black */
      [B(5.0, 3.4, 0.08), 0, 4.8, 4.92], [B(3.8, 2.8, 0.08), 0, 8.3, 4.9],    /* the fore sails */
      [B(0.08, 4.0, 2.4), 0, 6.6, -5.8],                                      /* the mizzen's fore-and-aft sail */
      [tri(T, [0, 10.9, 4.65], [0, 2.3, 7.4], [0, 3.2, 11.5]), 0, 0, 0],      /* the jib, fore mast to bowsprit */
      [B(0.05, 1.0, 1.7), 0, 14.7, -0.55],                                    /* the flag, off the main mast's top */
      [B(4.72, 0.35, 10.02), 0, 1.1, -1], [new T.CylinderGeometry(rp + 0.06, rp + 0.06, 0.35, 3), 0, 1.1, bz],   /* the wale stripe, round the bow */
      [B(3.0, 0.5, 0.06), 0, 2.6, -6.03]                                      /* the stern windows */
    ].concat(ports), C.SIZE);
    var garb = merge(T, [   /* the pirate, feet at 0, facing his own +z: the red coat, legs, arms, bandana and its knot */
      [B(0.22, 0.78, 0.24), 0.13, 0.39, 0], [B(0.22, 0.78, 0.24), -0.13, 0.39, 0], [B(0.7, 0.4, 0.42), 0, 0.86, 0], [B(0.62, 0.62, 0.36), 0, 1.36, 0],
      [B(0.17, 0.66, 0.2), 0.41, 1.3, 0], [B(0.17, 0.66, 0.2), -0.41, 1.3, 0], [B(0.42, 0.13, 0.42), 0, 1.95, 0], [B(0.08, 0.22, 0.06), 0.08, 1.82, -0.24]
    ], C.MAN);
    var skin = merge(T, [[B(0.36, 0.38, 0.36), 0, 1.75, 0], [B(0.15, 0.15, 0.15), 0.41, 0.9, 0], [B(0.15, 0.15, 0.15), -0.41, 0.9, 0]], C.MAN);
    var meshes = [new T.Mesh(wood, o.lam(0x5b3d26)), new T.Mesh(dark, o.lam(0x2f2b33)), new T.Mesh(garb, o.lam(0x9a2f2b)), new T.Mesh(skin, o.lam(0xd9a07a))];   /* DRAFT colours */
    var NAMES = ['wood', 'dark', 'garb', 'skin'];
    for (var i = 0; i < meshes.length; i++) meshes[i].name = 'pirate669:' + NAMES[i];
    var group = new T.Group(); group.name = 'pirate669'; group.visible = false; group.rotation.order = 'YXZ';   /* yaw, then pitch and roll about her own axes */
    var man = new T.Group(); man.name = 'pirate669:man'; man.add(meshes[2]); man.add(meshes[3]);
    man.position.set(1.35 * C.SIZE, C.DECK, -1.4 * C.SIZE); man.rotation.y = Math.PI / 2;   /* starboard, facing out over the rail: at anchor, the shore */
    group.add(meshes[0]); group.add(meshes[1]); group.add(man);
    scene.add(group);

    var a = Math.atan2(o.village.z, o.village.x);   /* the village's bearing from the island's middle: the anchorage lies on it */
    function anchorR() {   /* U1: EDGE + ANCHOR. U2 (o.reach): EDGE + REACH, pushed out until its hull clears 646's ring (o.clear()) by GAP. Read at each
       arrival (646's boat is made after this ship), so a grown EDGE or a moved ring moves the anchorage with it (row 671) */
      if (!o.reach) return E + C.ANCHOR;
      var r = E + C.REACH, c = o.clear ? +o.clear() : NaN;
      if (c > 0) r = Math.max(r, c + C.GAP + C.HALF_W);
      API.warn = r + C.HALF_W > E ? '669: the anchorage (' + r.toFixed(1) + ' m) puts its deck past the wall (' + E + '): the ring of 646 lies too far out' : '';
      return r;
    }
    var rA = anchorR(), rIn = E + C.FROM, rOut = E + C.AWAY, dthA = C.ARC / (E + C.ANCHOR);
    var YAW_A = Math.PI - a;   /* at anchor: the bow along the shore, starboard (the pirate's side) to the island */
    var st = 'away', dead = false, lastT = null;
    var L = { r0: 0, th0: 0, r1: 0, th1: 0, u: 0, dur: 1 };   /* the leg under way */
    var pose = { x: 0, y: 0, z: 0, r: rIn, th: a + dthA, yaw: YAW_A, pitch: 0, roll: 0, deckY: 0, state: 'away', speed: 0 };
    var inst = null;
    function leg(kind) {   /* a new leg from where it is now (from the far show-point when it was away) */
      if (st === 'away') { pose.r = rIn; pose.th = a + dthA; }
      L.r0 = pose.r; L.th0 = pose.th;
      if (kind === 'in') { rA = anchorR(); L.r1 = rA; L.th1 = a; } else { L.r1 = rOut; L.th1 = a - dthA; }
      var len = Math.sqrt((L.r1 - L.r0) * (L.r1 - L.r0) + (0.5 * (L.r0 + L.r1) * (L.th1 - L.th0)) * (0.5 * (L.r0 + L.r1) * (L.th1 - L.th0)));
      L.dur = Math.max(6, len / (C.V * ((o.speed && +o.speed()) || 1))); L.u = 0;   /* 703: the Call's leg is quicker */
      if (st === 'away') { L.u = 0; place(0); pose.yaw = headingNow(); }   /* it appears already pointing along its way */
      st = kind;
    }
    function place(e) {   /* the leg's point at eased progress e */
      pose.r = L.r0 + (L.r1 - L.r0) * e; pose.th = L.th0 + (L.th1 - L.th0) * e;
    }
    function headingNow() {   /* the leg's way at the current point, as a yaw (the bow, local +z, faces (sin yaw, cos yaw)) */
      var dr = L.r1 - L.r0, rt = pose.r * (L.th1 - L.th0), c = Math.cos(pose.th), s = Math.sin(pose.th);
      if (Math.abs(dr) + Math.abs(rt) < 1e-6) return pose.yaw;   /* a leg that goes nowhere (the rain back at once): keep the bow */
      return Math.atan2(dr * c - rt * s, dr * s + rt * c);
    }
    function step() {
      if (inst.boom) { inst.boom = false; throw new Error('669 bench: a planted fault in the tick'); }
      var t = +o.played() || 0, dp = lastT == null ? 0 : t - lastT; lastT = t;
      if (!(dp > 0)) dp = 0; if (dp > 0.5) dp = 0.5;   /* seconds of PLAY: the title screen, a pause, a page asleep move nothing */
      if (inst.hold) { group.visible = false; return; }   /* the bench: held out of sight (the program census's "before") */
      if (inst.pin) { pinned(t); return; }   /* 715: held where the game puts it (Damned's shore, the ride home); its own legs wait */
      var g = !!o.gate(), call = !!(o.call && o.call()), want = g && (call || (C.COMES[o.kind()] === 1 && o.night() < C.NIGHT));   /* 703 ship 4: the Call brings it in a storm and keeps it the rest of that day */
      if (st === 'away') { if (want) leg('in'); }
      else if (st === 'out') { if (want) leg('in'); }
      else if (!want && !(o.keep && o.keep())) leg('out');   /* U2: while she is landing on it or held by its prompt, it keeps its anchor */
      var e = 0, tgt = YAW_A;
      if (st === 'in' || st === 'out') {
        L.u = Math.min(1, L.u + dp / L.dur); e = L.u * L.u * (3 - 2 * L.u); place(e); tgt = headingNow();
        pose.speed = 6 * L.u * (1 - L.u) * Math.sqrt((L.r1 - L.r0) * (L.r1 - L.r0) + (pose.r * (L.th1 - L.th0)) * (pose.r * (L.th1 - L.th0))) / L.dur;
        if (L.u >= 1) { st = st === 'in' ? 'anchor' : 'away'; pose.speed = 0; }
      } else pose.speed = 0;
      var dy = Math.atan2(Math.sin(tgt - pose.yaw), Math.cos(tgt - pose.yaw)), mx = C.TURN * dp;
      pose.yaw += dy > mx ? mx : dy < -mx ? -mx : dy;
      pose.x = pose.r * Math.cos(pose.th); pose.z = pose.r * Math.sin(pose.th);
      pose.y = o.water + C.BOB * Math.sin(2 * Math.PI * t / C.BOBT);
      pose.roll = C.ROLL * Math.sin(2 * Math.PI * t / C.ROLLT); pose.pitch = C.PITCH * Math.sin(2 * Math.PI * t / C.PITCHT);
      pose.deckY = pose.y + C.DECK; pose.state = st;
      if (inst.ride) { try { inst.ride(pose, dp, t); } catch (err) { inst.ride = null; API.warn = '703 voyage: ' + (err && err.message); } }   /* 703 ship 5: the voyage steers the ship itself */
      group.position.set(pose.x, pose.y, pose.z); group.rotation.set(pose.pitch, pose.yaw, pose.roll);
      group.visible = g && st !== 'away';
    }
    function pinned(t) {   /* 715 (Trunks, Oct 28): inst.pin = { x, z, yaw, deck } puts the ship where the game says, shown (by the gate), bobbing as at anchor;
       its leg (st, r, th) is left as it was, so letting go resumes it. pin.deck offers the deck (deck(), spot()) wherever it lies, moving or not */
      var P = inst.pin; pose.x = +P.x; pose.z = +P.z; pose.yaw = +P.yaw; pose.speed = +P.speed || 0;
      pose.y = o.water + C.BOB * Math.sin(2 * Math.PI * t / C.BOBT);
      pose.roll = C.ROLL * Math.sin(2 * Math.PI * t / C.ROLLT); pose.pitch = C.PITCH * Math.sin(2 * Math.PI * t / C.PITCHT);
      pose.deckY = pose.y + C.DECK; pose.state = st;
      group.position.set(pose.x, pose.y, pose.z); group.rotation.set(pose.pitch, pose.yaw, pose.roll);
      group.visible = !!o.gate();
    }
    function unpin(home) {   /* 715: let go. home: it lies at its own anchorage now (the ride's end), so its own legs take it on from there */
      inst.pin = null; if (!home) return;
      rA = anchorR(); pose.r = rA; pose.th = a; L.u = 1; st = 'anchor';
    }
    function die(err) { dead = true; inst.dead = true; group.visible = false; API.error = String(err && err.message || err); }
    function tick() {   /* once a frame; never throws */
      if (dead) return;
      try { step(); } catch (err) { die(err); }
    }
    var LP = { x: 0, z: 0 };
    function local(x, z, out) {   /* a world point in the ship's frame (pose now): boat.js's own maths */
      var dx = x - pose.x, dz = z - pose.z, c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
      out.x = dx * c - dz * s; out.z = dx * s + dz * c; return out;
    }
    function inDeck(lx, lz, m) {   /* the main deck, m metres in from its edge (the stern's raised deck is not in it yet) */
      if (lz < C.STERN + m || lz > C.BOW - m) return false;
      if (lz <= C.MID) return Math.abs(lx) < C.HALF_W - m;
      return Math.abs(lx) < C.HALF_W * (C.BOW - lz) / (C.BOW - C.MID) - m;
    }
    function settled() {   /* U2: at anchor, shown, and swung to its line: the deck stands still under her (only the bob moves it) */
      if (inst.pin) return group.visible && !!inst.pin.deck;   /* 715: pinned, the game says when the deck is offered */
      return group.visible && st === 'anchor' && Math.abs(Math.atan2(Math.sin(YAW_A - pose.yaw), Math.cos(YAW_A - pose.yaw))) < C.SETTLE;
    }
    function deck(x, z) {   /* U2's part of groundAt: the deck's top while it lies settled at anchor; else nothing (-1e9). One distance test first */
      if (dead || !settled()) return -1e9;
      var dx = x - pose.x, dz = z - pose.z; if (dx * dx + dz * dz > 225) return -1e9;
      local(x, z, LP); return inDeck(LP.x, LP.z, 0) ? pose.deckY : -1e9;
    }
    function spot(out) {   /* U2: where a landing aims (local SPOT_X, SPOT_Z), into out {x, y, z}; false while the deck is not offered */
      if (dead || !settled()) return false;
      var c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
      out.x = pose.x + C.SPOT_X * c + C.SPOT_Z * s; out.z = pose.z - C.SPOT_X * s + C.SPOT_Z * c; out.y = pose.deckY; return true;
    }
    function anchorAt(out) { var r = anchorR(); out = out || {}; out.x = r * Math.cos(a); out.z = r * Math.sin(a); out.r = r; return out; }
    function peek() {   /* the bench (allocates: never called by the game's frame) */
      return { dead: dead, error: API.error, state: st, shown: group.visible, x: pose.x, y: pose.y, z: pose.z, r: Math.hypot(pose.x, pose.z), th: pose.th, yaw: pose.yaw,
        speed: pose.speed, deckY: pose.deckY, u: L.u, dur: L.dur, edge: E, anchorR: rA, fromR: rIn, awayR: rOut, bearing: a, yawAnchor: YAW_A, hold: !!inst.hold, meshes: meshes.length,
        reach: !!o.reach, settled: settled(), pinned: !!inst.pin, kept: !!(o.keep && o.keep()), halfW: C.HALF_W, gap: C.GAP, warn: API.warn || '',
        shadow: meshes.some(function (m) { return m.castShadow || m.receiveShadow; }) };
    }
    pose.x = pose.r * Math.cos(pose.th); pose.z = pose.r * Math.sin(pose.th); pose.y = o.water; pose.deckY = o.water + C.DECK;
    group.position.set(pose.x, pose.y, pose.z); group.rotation.set(0, pose.yaw, 0);
    inst = { C: C, pose: pose, group: group, man: man, meshes: meshes, dead: false, boom: false, hold: false, pin: null, unpin: unpin, tick: tick, die: die, peek: peek, local: local, inDeck: inDeck, deck: deck, anchorAt: anchorAt, spot: spot, settled: settled,
      state: function () { return st; }, shown: function () { return group.visible; } };
    return inst;
  }
  API.create = create;
  return API;
})();
