/* boat.js - BOARD 646 V1, THE CIRCLING BOAT (Marth, Oct 14 2026 ~03:50: "maybe around 27 villagers there's a boat that circles the island on
   som Zelda WW shi."; Oct 15 ~23:55: "a different boat from time to time where u can board and rest and itll take you to a different island
   (make the circling boat for now)"; Oct 16 ~01:55: "yes thats fine for now, as no second island/level exists . at level 27 as i said before").
   Itachi's brief: BRIEF_646_CIRCLING_BOAT_2026-10-16.md. ONE boat sails round the home island all the time, on a ring of R m round (0, 0),
   counter-clockwise: it waits at the village's stop, sails past the lighthouse to the far shore (the hermits' side), waits, and sails on home.
   Where it is is a PURE function of her play clock (S.played): nothing about it is saved, and a reload finds it where the clock says.
   The game file joins its deck to groundAt (she lands on it with the real controls) and carries what stands on it (never places it).
   Art: original low-poly (a hull with a pointed bow, rails, a mast with its yard and boom, one sail, a lantern), merged: THREE meshes, each
   the game's own plain Lambert (lam(): no map, no vertex colours, front side) so no new shader program is made; no shadow (no extra pass).
   Like weather.js it never throws into the game: a fault hides the boat and takes its deck away; the game goes on.
   Every number in C is a DRAFT (the brief's, not measured): his eye decides. */
window.WFR_BOAT = (function () {
  'use strict';
  var C = {
    EDGE_IN: 20,     /* the ring sits this far inside the wind (EDGE, passed in: 330 today, so 310 m), pushed out if the sea there is not deep (ringR) */
    STOP_MIN: 27 * Math.PI / 180, STOP_MAX: 45 * Math.PI / 180,   /* the village stop: this far either side of the village's bearing (669 U2's pirate anchors ON it at EDGE + 15), where the dry shore is nearest (stopBearing) */
    V: 8,            /* cruising speed (m/s) */
    WAIT: 25,        /* seconds at each stop */
    RAMP: 4,         /* seconds to reach cruising speed, and to stop (a leg is D / V + RAMP long) */
    BOB: 0.12, BOBT: 4, ROLL: 2 * Math.PI / 180, ROLLT: 5.3,
    DECK: 0.9,       /* the deck's top over the water line */
    HALF_W: 1.5, STERN: -3.5, MID: 1.7, BOW: 4.3,   /* the deck in the boat's own frame (x across, z to the bow): a box, then a pointed bow */
    SPOT_Z: -1.4     /* where a landing aims: between the mast and the stern */
  };
  var FAR = { x: 180, z: 129 };   /* a fallback only: the game passes o.far (hermits.js SITES[0], the cabin's door on the far side) */
  var API = { error: '', warn: '', last: null, C: C };

  function plan(village, far, R, avIn) {   /* the lap: wait at the village, sail to the far stop, wait, sail on round to the village */
    far = far || FAR; var TAU = 2 * Math.PI, av = avIn != null ? avIn : Math.atan2(village.z, village.x) + C.STOP_MIN, af = Math.atan2(far.z, far.x);
    var a1 = ((af - av) % TAU + TAU) % TAU, a2 = TAU - a1, legs = [], t = 0;
    function leg(kind, a0, da, stop) { var dur = kind === 'wait' ? C.WAIT : R * da / C.V + C.RAMP; legs.push({ kind: kind, t0: t, dur: dur, a0: a0, da: da, stop: stop }); t += dur; }
    leg('wait', av, 0, 'village'); leg('sail', av, a1, null); leg('wait', av + a1, 0, 'far'); leg('sail', av + a1, a2, null);
    return { legs: legs, lap: t, av: av, af: af, R: R };
  }
  function stopBearing(o, R) {   /* the village stop's bearing: STOP_MIN-STOP_MAX either side of the village's, the one whose dry shore (H >= WATER + 0.8)
     is nearest the ring: her shortest flight out (on Oct 16 the first draft's -107 deg sat off a 79 m shallow shelf) */
    var vb = Math.atan2(o.village.z, o.village.x), best = null, d, k, th, r, gap; if (!o.H) return vb + C.STOP_MIN;
    for (d = C.STOP_MIN; d <= C.STOP_MAX + 1e-9; d += Math.PI / 180) for (k = -1; k <= 1; k += 2) { th = vb + k * d; r = R - 1;
      while (r > R - 120 && o.H(Math.cos(th) * r, Math.sin(th) * r) < o.water + 0.8) r -= 1; gap = R - r; if (!best || gap < best.gap - 0.5) best = { th: th, gap: gap }; }
    API.stopGap = best.gap; return best.th;
  }
  function ringR(o) {   /* EDGE - 20, pushed outward (never past EDGE - 12) until on every bearing the hull is over deep water: the fish code's search
     (html, Silverlings: the first r with ground < WATER - 2.5), plus the hull's reach (4.3 m) and a margin */
    var E = o.edge || 330, R0 = E - C.EDGE_IN, cap = E - 12, need = R0, k, a, r;
    if (o.H) for (k = 0; k < 72; k++) { a = k / 72 * Math.PI * 2; r = 240; while (r < cap && o.H(Math.cos(a) * r, Math.sin(a) * r) > o.water - 2.5) r += 2; need = Math.max(need, r + 5); }
    if (need > cap) API.warn = 'the sea is shallow at the ring on some bearing: it needs ' + need + ' m, held at ' + cap;
    return Math.min(need, cap);
  }
  function create(T, scene, o) {   /* the instance is kept as WFR_BOAT.last (for the bench); a fault as WFR_BOAT.error */
    try { var inst = build(T, scene, o); API.last = inst; return inst; } catch (err) { API.error = String(err && err.message || err); return null; }
  }
  function merge(T, parts) {   /* [geometry, x, y, z] -> one non-indexed geometry with flat normals; the parts are freed */
    var pos = [], i, k, g, n, a;
    for (i = 0; i < parts.length; i++) {
      g = parts[i][0]; g.translate(parts[i][1], parts[i][2], parts[i][3]); n = g.index ? g.toNonIndexed() : g; a = n.attributes.position.array;
      for (k = 0; k < a.length; k++) pos.push(a[k]);
      if (n !== g) n.dispose(); g.dispose();
    }
    var out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.computeVertexNormals(); out.computeBoundingSphere(); return out;
  }
  function build(T, scene, o) {
    var K = Object.assign({}, C); K.R = ringR(o);   /* this boat's own constants: its ring */
    var P = plan(o.village, o.far, K.R, stopBearing(o, K.R)), dead = false, D = C.DECK;
    var B = function (w, h, d) { return new T.BoxGeometry(w, h, d); };
    var rp = C.HALF_W * 2 / Math.sqrt(3);   /* the bow: a three-sided prism whose back edge is the hull's width */
    var wood = merge(T, [
      [B(3.0, 1.6, C.MID - C.STERN), 0, D - 0.8, (C.MID + C.STERN) / 2],                 /* the hull; its top is the deck */
      [new T.CylinderGeometry(rp, rp, 1.6, 3), 0, D - 0.8, C.MID + rp / 2],               /* the bow, pointed (its tip at C.BOW) */
      [B(0.14, 0.25, C.MID - C.STERN), C.HALF_W - 0.07, D + 0.125, (C.MID + C.STERN) / 2], [B(0.14, 0.25, C.MID - C.STERN), -C.HALF_W + 0.07, D + 0.125, (C.MID + C.STERN) / 2],
      [B(3.0, 0.25, 0.14), 0, D + 0.125, C.STERN + 0.07],                                  /* the rails */
      [B(0.12, 0.12, 1.3), 0, D + 0.1, C.BOW + 0.4],                                       /* the bowsprit */
      [B(0.2, 5.0, 0.2), 0, D + 2.5, 0.6], [B(2.9, 0.14, 0.14), 0, D + 4.6, 0.6], [B(2.6, 0.12, 0.12), 0, D + 1.5, 0.6],   /* the mast, its yard, its boom */
      [B(0.1, 1.3, 0.1), 1.15, D + 0.65, -3.2]                                             /* the lantern's post */
    ]);
    var cloth = merge(T, [[B(2.7, 2.9, 0.05), 0, D + 3.05, 0.72], [B(0.04, 0.35, 0.8), 0, D + 5.2, 1.0]]);   /* the sail, a pennant */
    var lamp = merge(T, [[B(0.3, 0.36, 0.3), 1.15, D + 1.45, -3.2]]);
    var meshes = [new T.Mesh(wood, o.lam(0x8b5e34)), new T.Mesh(cloth, o.lam(0xc8314a)), new T.Mesh(lamp, o.lam(0xffe08a, { emissive: 0xffc860 }))];   /* DRAFT colours: the lookout's deck, the village's red */
    var group = new T.Group(); group.name = 'boat646'; group.visible = false;
    for (var i = 0; i < meshes.length; i++) { meshes[i].name = 'boat646:' + ['wood', 'cloth', 'lamp'][i]; group.add(meshes[i]); }
    scene.add(group);
    var pose = {}, prev = {}, inst = null;
    function at(t, out) {   /* THE SCHEDULE: where the boat is at play-second t (pure; the same answer every call, every reload) */
      out = out || {};
      var L = P.lap, u = ((t % L) + L) % L, i = 0, g = P.legs[0];
      for (i = 0; i < P.legs.length; i++) { g = P.legs[i]; if (u < g.t0 + g.dur) break; }
      if (i >= P.legs.length) { i = P.legs.length - 1; g = P.legs[i]; }
      var tau = u - g.t0, s = 0, v = 0;
      if (g.kind === 'sail') {
        var Dd = K.R * g.da, r = C.RAMP, acc = C.V / r, Tl = g.dur;
        if (tau < r) { s = 0.5 * acc * tau * tau; v = acc * tau; }
        else if (tau < Tl - r) { s = 0.5 * C.V * r + C.V * (tau - r); v = C.V; }
        else { var w = Math.max(0, Tl - tau); s = Dd - 0.5 * acc * w * w; v = acc * w; }
        s = Math.max(0, Math.min(Dd, s));
      }
      var th = g.a0 + s / K.R;
      out.th = th; out.x = K.R * Math.cos(th); out.z = K.R * Math.sin(th);
      out.yaw = -th;   /* counter-clockwise in (x, z): its way is (-sin th, cos th), and the bow (local +z) faces (sin yaw, cos yaw) */
      out.y = o.water + C.BOB * Math.sin(2 * Math.PI * t / C.BOBT); out.roll = C.ROLL * Math.sin(2 * Math.PI * t / C.ROLLT);
      out.deckY = out.y + D; out.leg = i; out.kind = g.kind; out.stop = g.kind === 'wait' ? g.stop : null; out.speed = v;
      return out;
    }
    function local(x, z, out) {   /* a world point in the boat's frame (pose now) */
      var dx = x - pose.x, dz = z - pose.z, c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
      out.x = dx * c - dz * s; out.z = dx * s + dz * c; return out;
    }
    function inDeck(lx, lz, m) {   /* the walkable deck, m metres in from its edge */
      if (lz < C.STERN + m || lz > C.BOW - m) return false;
      if (lz <= C.MID) return Math.abs(lx) < C.HALF_W - m;
      return Math.abs(lx) < C.HALF_W * (C.BOW - lz) / (C.BOW - C.MID) - m;
    }
    var L0 = { x: 0, z: 0 };
    function deck(x, z) {   /* groundAt's part: the deck's top where (x, z) is on it; else nothing (-1e9). One distance test first */
      if (!group.visible) return -1e9;
      var dx = x - pose.x, dz = z - pose.z; if (dx * dx + dz * dz > 25) return -1e9;
      local(x, z, L0); return inDeck(L0.x, L0.z, 0) ? pose.deckY : -1e9;
    }
    function shown() { return group.visible; }
    function die(err) { dead = true; inst.dead = true; group.visible = false; API.error = String(err && err.message || err); }
    function step() {
      if (inst.boom) { inst.boom = false; throw new Error('646 bench: a planted fault in the tick'); }
      var t = o.played();
      prev.x = pose.x; prev.y = pose.y; prev.z = pose.z; prev.yaw = pose.yaw; prev.th = pose.th; prev.deckY = pose.deckY; prev.leg = pose.leg; prev.stop = pose.stop;
      at(t, pose);
      group.position.set(pose.x, pose.y, pose.z); group.rotation.set(0, pose.yaw, pose.roll);
      group.visible = !!o.gate();
    }
    function tick() {   /* once a frame; never throws */
      if (dead) return;
      try { step(); } catch (err) { die(err); }
    }
    function sweep(t0, t1, dt) {   /* the bench: the schedule sampled (pure), [t, x, z, th, deckY, legKind] */
      var out = [], q = {}; for (var t = t0; t <= t1 + 1e-9; t += dt) { at(t, q); out.push([t, q.x, q.z, q.th, q.deckY, q.kind]); } return out;
    }
    at(o.played(), pose); at(o.played(), prev);
    group.position.set(pose.x, pose.y, pose.z); group.rotation.set(0, pose.yaw, pose.roll);
    inst = { C: K, plan: P, pose: pose, prev: prev, group: group, meshes: meshes, dead: false, boom: false, at: at, local: local, inDeck: inDeck, deck: deck, shown: shown, tick: tick, die: die, sweep: sweep };
    return inst;
  }
  API.create = create; API.plan = plan;
  return API;
})();
