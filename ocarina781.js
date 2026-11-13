/* ocarina781.js - BOARD 781 UNIT 5, ARRIVALS AND FIRST MEETINGS: THE OCARINA PASS (Wings for Rouge, ship #133). Su, Nov 13 2026.
   Marth, Nov 12 2026, verbatim: "were gonna have to improve the cinematics ogf each scene.. drastically.. sonic adventure 2 battle/ ocarina of time switch 2 style";
   then "you can look at orignal ocarina of time for refernces tbh. theyre more 'thoughrough' although its old. the newer game adds wayyy more cinematic".
   THE GRAMMAR WE STUDIED (never copied): the original game gives EVERY new place a few seconds the first time you reach it (which moments: a focal point,
   then a pan or a pull-back that finds the hero coming in, then play); the newer one shows a place's name when you come close or land, never when you fly
   high over it (how it looks). Our own words, our own phrase (sounds.js 'land'), title39's card.
   WHAT IS HERE: one row per place on the home island (PLACES). The first time she ARRIVES at a big place (she came in from outside it under her own wings or
   feet, low: never a teleport, never high over it) the bars come in, the camera stands by the place's focal point and turns slowly, then pulls back along
   the way she came and finds her, the place behind her; its name rises (title39); about 3.8 s; a tap after 0.8 s goes on. A small place (the four old
   cabins) only says its name when she lands by it. Once per file (S.seen.oc781). Never two in a row: GAP seconds after one, and 4 s after any other scene.
   Never in a fight, a talk, a scene, a ride, indoors, in the Haven, the travel zone, the tutorial; never in Classic (frozen).
   The page hands it (create): the kit (cine.js), Classic, S, save, title39, where(id) (each place's spot, measured by the page's own world), ground, clear
   (the camera's arm: nothing solid between two points), busy() (why not now, or ''), hold(on) and pose(t) (she hovers or stands while the shot plays).
   Every word and number a DRAFT for Marth's pen and thumb. */
window.WFR_OCARINA781 = (function () {
  'use strict';
  /* kind 'shot': the establishing shot + the name; 'name': the name only (landing by it). r: how near counts as arrived (m, across); up: how high over
     the ground she may be and still count (TotK: close or landed, never high over it); look: the focal height over the spot (m); wide: how far the first
     view stands from the focal point, as a share of the place's size (where() gives size) */
  var PLACES = [
    { id: 'village', kind: 'shot', over: 'Home island', name: 'The Village', under: 'Six homes round a green, and a well', r: 60, up: 28, look: 3, wide: 1.2, rise: 0.38 },
    { id: 'lighthouse', kind: 'shot', over: 'The east shore', name: 'The Lighthouse', under: 'Someone keeps watch at the top', r: 48, up: 40, look: 9, wide: 2.4, rise: 0.12, lookUp: 0.22 },
    { id: 'lake', kind: 'shot', over: 'The middle of the island', name: 'The Lake', under: 'Still water, and fish for a patient beak', r: 55, up: 28, look: 1, wide: 1.1, rise: 0.6, lookUp: 0.05 },
    { id: 'peak', kind: 'shot', over: 'The roof of the island', name: 'The Highest Peak', under: 'Only the strongest wings rest up here', r: 40, up: 40, look: 2, wide: 1.4 },
    { id: 'dunes', kind: 'shot', over: 'The south shore', name: 'The Dunes', under: 'Sand, rocks, and someone small and prickly', r: 46, up: 24, look: 1.5, wide: 1.0, rise: 0.4 },
    { id: 'cave', kind: 'shot', over: 'Behind the mountain', name: 'The Cave', under: 'Something old is kept in the dark', r: 26, up: 24, look: 2, wide: 1.6 },
    { id: 'hermits', kind: 'shot', over: 'The far side', name: 'The Hermits’ Cabin', under: 'Small outside. Knock, and see.', r: 34, up: 24, look: 2.5, wide: 3.0, rise: 0.4 },
    { id: 'race', kind: 'shot', over: 'The west meadow', name: 'The Race Track', under: 'Run, swim, climb, glide: the chicks race here', r: 40, up: 20, look: 1, wide: 1.4, rise: 0.55, lookUp: 0.05 },
    { id: 'woods', kind: 'name', over: 'Past the old signpost', name: 'The West Woods', under: 'The Owl’s tree. He wakes at dusk.', r: 14, up: 3 },
    { id: 'cabin:shore', kind: 'name', over: 'An old cabin', name: 'The Shore Cabin', under: 'Nobody lives here now', r: 12, up: 3 },
    { id: 'cabin:lake', kind: 'name', over: 'An old cabin', name: 'The Lake Cabin', under: 'Hal’s, by the water', r: 12, up: 3 },
    { id: 'cabin:forest', kind: 'name', over: 'An old cabin', name: 'The Forest Cabin', under: 'Rook’s, among the trees', r: 12, up: 3 },
    { id: 'cabin:foothill', kind: 'name', over: 'An old hut', name: 'The Foothill Hut', under: 'June’s, under the mountain', r: 12, up: 3 }
  ];
  /* first meetings the talks did not already name (782 #128 named the Crow, the Peregrine, the Owl, the Eagle, Beanda, Beandie, Thimble, the villagers;
     the School named its teachers): the page's talk framing reads these roles */
  var ROLES = { Hal: 'fishes the lake from dawn to dusk', Bramble: 'a hedgehog of the dunes, Pip’s dad', Moss: 'a hedgehog of the dunes, Pip’s mum', Pip: 'the hedgehogs’ boy, who lost a book' };
  var K = { DUR: 3.8, TA: 1.7, SKIP: 0.8, CARD: 0.9, GAP: 20, NAMEGAP: 6, AFTER: 4, WARM: 3, JUMP: 22, OUT: 8, STEP: 0.25 };
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function create(o) {
    var THREE = o.THREE, cine = o.cine, V = new THREE.Vector3(), A0 = new THREE.Vector3(), A1 = new THREE.Vector3(), FL = new THREE.Vector3(), HER = new THREE.Vector3();
    var st = { plays: 0, names: 0, skips: 0, ends: 0, why: '', last: null, on: null, err: '', since: 1e9, sceneAgo: 1e9, live: 0, acc: 0, jumps: 0, out: {}, prev: null, refused: 0, shots: [] };
    function seen() { var S = o.S; S.seen = S.seen || {}; return S.seen.oc781 || (S.seen.oc781 = {}); }
    function row(id) { for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return PLACES[i]; return null; }
    function where(id) { try { return o.where(id); } catch (e) { return null; } }
    function busy() { try { return o.busy() || ''; } catch (e) { return 'busy'; } }
    /* the shot: built once at the start from her place and the focal point; the end of it follows her live (she may hover and drift) */
    var R = null;
    function plan(P, w) {
      var S = o.S, B = S.pos, F = new THREE.Vector3(w.x, w.y + (w.top != null ? w.top : P.look), w.z), dx = B.x - F.x, dz = B.z - F.z, d = Math.hypot(dx, dz);
      var ux = d > 1 ? dx / d : -Math.sin(S.yaw), uz = d > 1 ? dz / d : -Math.cos(S.yaw), size = Math.max(6, w.size || 12), dA = Math.max(12, Math.min(70, size * (P.wide || 1) + 8));
      var best = null, tries = [], short = function (p) { var q = p.clone().sub(F), L = q.length(); return F.clone().add(q.multiplyScalar(Math.min(L * 0.5, size * 0.6) / Math.max(L, 1e-3))); };   /* the place itself is not in the way of its own view */
      [[0.95, 1], [0.95, -1], [0.6, 1], [0.6, -1], [1.35, 1], [1.35, -1], [0.95, 1, 0.7], [0.95, -1, 0.7], [0.3, 1, 0.7]].forEach(function (c) { tries.push(c); });
      for (var i = 0; i < tries.length && !best; i++) {
        var a = tries[i][0] * tries[i][1], k = tries[i][2] || 1, ca = Math.cos(a), sa = Math.sin(a), rx = ux * ca - uz * sa, rz = ux * sa + uz * ca, dd = dA * k;
        var rise = P.rise || 0.28, p0 = new THREE.Vector3(F.x + rx * dd, F.y + dd * rise + 2, F.z + rz * dd), a2 = a * 0.78, c2 = Math.cos(a2), s2 = Math.sin(a2), p1 = new THREE.Vector3(F.x + (ux * c2 - uz * s2) * dd * 0.92, F.y + dd * (rise + 0.02) + 2, F.z + (ux * s2 + uz * c2) * dd * 0.92);
        p0.y = Math.max(p0.y, o.ground(p0.x, p0.z) + 2); p1.y = Math.max(p1.y, o.ground(p1.x, p1.z) + 2);
        if (o.clear(p0, short(p0)) && o.clear(p1, short(p1))) best = { p0: p0, p1: p1, how: 'side' + (tries[i][1] > 0 ? '+' : '-') + tries[i][0] + (k < 1 ? ' near' : '') };
      }
      if (!best) { var up = new THREE.Vector3(F.x + ux * dA * 0.5, F.y + dA * 0.9 + 4, F.z + uz * dA * 0.5); best = { p0: up, p1: up.clone().add(V.set(ux, 0.2, uz).multiplyScalar(3)), how: 'above' }; }
      /* the end of the shot: low over her back, the place ahead of her (she is held, so it is planned once); higher, or a little to a side, if that is in a tree or a wall */
      var s = Math.max(0.25, o.size ? o.size() : 0.4), dB = 8 + 10 * s, hB = 1.0 + 1.6 * s, her = new THREE.Vector3(B.x, B.y + 0.4 * s, B.z), end = null;
      [[0, 0], [0, 2.5], [0.45, 1.5], [-0.45, 1.5], [0, 5], [0.8, 4], [-0.8, 4]].some(function (c) { var ca = Math.cos(c[0]), sa = Math.sin(c[0]), ex = ux * ca - uz * sa, ez = ux * sa + uz * ca;
        var q = new THREE.Vector3(B.x + ex * dB, B.y + hB + c[1], B.z + ez * dB); q.y = Math.max(q.y, o.ground(q.x, q.z) + 1.5); if (o.clear(q, her)) { end = q; return true; } return false; });
      if (!end) end = new THREE.Vector3(B.x + ux * dB * 0.5, B.y + hB + 6, B.z + uz * dB * 0.5);
      /* the pull-back from the place to her: an arc over whatever stands between (each of its eight legs clear), or else a cut */
      var lift = null; [0.16, 0.32, 0.55, 0.85].some(function (lk) { var h = Math.min(40, best.p1.distanceTo(end) * lk), prev = best.p1, q = new THREE.Vector3();
        for (var j = 1; j <= 8; j++) { var e2 = j / 8; q.copy(best.p1).lerp(end, e2); q.y += Math.sin(e2 * Math.PI) * h; q.y = Math.max(q.y, o.ground(q.x, q.z) + 1.5); if (!o.clear(prev, q)) return false; prev = q.clone(); }
        lift = h; return true; });
      return { P: P, F: F, FL: F.clone().setY(F.y + dA * (P.lookUp != null ? P.lookUp : 0.18)), ux: ux, uz: uz, p0: best.p0, p1: best.p1, how: best.how + (lift == null ? ' cut' : ''), end: end, lift: lift, size: s };   /* FL: the first look over the focal point (the place sits under its name) */
    }
    function shot(t, Pp, L) {
      var S = o.S, B = S.pos, s = R.size, end = K.DUR - 0.5;
      HER.set(B.x, B.y + 0.4 * s, B.z);
      if (t < K.TA) { var a = sm(t / K.TA); Pp.copy(R.p0).lerp(R.p1, a); L.copy(R.FL); return 46 - 4 * a; }   /* the place: a slow turn round its focal point */
      if (R.lift == null) { Pp.copy(R.end); L.copy(R.FL).lerp(HER, 0.6); L.y = Math.max(L.y, HER.y + 0.4); return 50; }   /* nothing clear to travel through: a cut to her */
      var e = sm((t - K.TA) / (end - K.TA));   /* the pull-back: along the way she came, over what stands between, finding her with the place ahead of her */
      Pp.copy(R.p1).lerp(R.end, e); Pp.y += Math.sin(e * Math.PI) * R.lift; Pp.y = Math.max(Pp.y, o.ground(Pp.x, Pp.z) + 1.5);
      L.copy(R.FL).lerp(HER, sm(e * 1.2) * 0.6); L.y = Math.max(L.y, R.FL.y + (HER.y + 0.4 - R.FL.y) * sm(e * 1.2)); return 42 + 8 * e;   /* she never above the middle (the name rises there) */
    }
    function play(P, w) {
      R = plan(P, w); var id = P.id;
      var ok = cine.arrival({ over: P.over, name: P.name, under: P.under, kind: 'land', dur: K.DUR, skip: K.SKIP, freeze: false, cardAt: K.CARD,
        shot: function (t, u, Pp, L) { var f = shot(t, Pp, L); st.cam = { t: +t.toFixed(2), P: Pp.toArray().map(function (v) { return +v.toFixed(2); }), L: L.toArray().map(function (v) { return +v.toFixed(2); }) }; return f; },
        start: function () { try { o.hold(true); } catch (e) { st.err = 'hold: ' + (e && e.message); } },
        tick: function (t, real) { try { o.pose(t, real); } catch (e) { /* fine */ } },
        end: function (how) { st.ends++; if (how === 'tap') st.skips++; st.on = null; st.since = 0; st.lastEnd = { id: id, how: how }; try { o.hold(false); } catch (e) { st.err = 'unhold: ' + (e && e.message); } R = null; } });
      if (!ok) { R = null; st.refused++; return false; }
      seen()[id] = 1; try { o.save(); } catch (e) { /* the flag is in S; the next save keeps it */ }
      st.plays++; st.on = id; st.last = { id: id, how: R ? R.how : null, at: o.S.pos.toArray().map(function (v) { return +v.toFixed(1); }), F: R ? R.F.toArray().map(function (v) { return +v.toFixed(1); }) : null };
      return true;
    }
    function nameOnly(P) {
      var ok = false; try { ok = !!o.title(P.over, P.name, P.under, 'found'); } catch (e) { st.err = 'title: ' + (e && e.message); }
      if (!ok) return false; seen()[P.id] = 1; try { o.save(); } catch (e) { /* fine */ } st.names++; st.since = K.GAP - K.NAMEGAP; st.last = { id: P.id, how: 'name' }; return true;
    }
    /* four times a second: has she arrived somewhere new? */
    function tick(real) {
      real = real || 0; st.since += real; st.live += real; if (cine.on()) st.sceneAgo = 0; else st.sceneAgo += real;
      st.acc += real; if (st.acc < K.STEP) return; st.acc = 0;
      var S = o.S, B = S.pos;
      if (st.prev && Math.hypot(B.x - st.prev[0], B.z - st.prev[1]) > K.JUMP) { st.out = {}; st.jumps++; }   /* a teleport (a door, a ride, a load, the bench): she must leave and come back to arrive */
      st.prev = [B.x, B.z];
      if (o.classic()) { st.why = 'classic'; return; }   /* Classic is frozen (board 645): nothing here ever plays there */
      if (R) return;
      var sn = seen(), due = null, dd = 1e9;
      for (var i = 0; i < PLACES.length; i++) {
        var P = PLACES[i]; if (sn[P.id]) continue; var w = where(P.id); if (!w) continue;
        var d = Math.hypot(B.x - w.x, B.z - w.z), r = P.r + (P.kind === 'shot' && w.size ? 0 : 0);
        if (d > r + K.OUT) { st.out[P.id] = 1; continue; }
        if (d > r || !st.out[P.id]) continue;
        var g = 0; try { g = o.ground(B.x, B.z); } catch (e) { g = 0; }
        if (P.kind === 'name' ? S.mode !== 'walk' : (S.mode !== 'walk' && B.y - Math.max(g, w.y) > P.up)) continue;   /* close or landed, never high over it */
        if (d < dd) { dd = d; due = { P: P, w: w }; }
      }
      if (!due) { st.why = ''; return; }
      if (st.live < K.WARM) { st.why = 'warm'; return; }
      if (st.since < K.GAP) { st.why = 'gap'; return; }
      if (st.sceneAgo < K.AFTER) { st.why = 'scene'; return; }
      var why = busy(); if (why) { st.why = why; return; }
      st.why = ''; if (due.P.kind === 'name') nameOnly(due.P); else play(due.P, due.w);
    }
    function peek() { var sn = seen(); return { plays: st.plays, names: st.names, skips: st.skips, ends: st.ends, refused: st.refused, on: st.on, why: st.why, last: st.last, lastEnd: st.lastEnd || null, err: st.err, jumps: st.jumps,
      since: +Math.min(st.since, 9999).toFixed(1), seen: Object.assign({}, sn), out: Object.keys(st.out), cam: st.cam || null, places: PLACES.map(function (p) { return p.id; }) }; }
    function force(id) { var P = row(id), w = where(id); if (!P || !w || o.classic() || R) return false; return P.kind === 'name' ? nameOnly(P) : play(P, w); }   /* the bench's: play one now (debug only) */
    return { tick: tick, peek: peek, force: force, on: function () { return !!R; }, PLACES: PLACES, ROLES: ROLES, K: K,
      where: function (id) { return where(id); }, reset: function (id) { var sn = seen(); if (id) delete sn[id]; else for (var k in sn) delete sn[k]; st.since = 1e9; } };
  }
  return { create: create, PLACES: PLACES, ROLES: ROLES, K: K };
})();
