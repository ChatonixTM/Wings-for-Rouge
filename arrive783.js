/* arrive783.js - BOARD 783, HER ARRIVAL IN A COUNTRY (Wings for Rouge, ship #130). Nov 13 2026.
   Marth, Nov 12 2026, verbatim: "We need to make the introduction to her getting to Jamaica cinematic like ocarina of time. / Skyrim"; and "you can look at
   orignal ocarina of time for refernces tbh. theyre more 'thoughrough' although its old. the newer game adds wayyy more cinematic".
   THE GRAMMAR WE STUDIED (never copied): the original game gives EVERY new land a scene (which moments: the first time you reach it); the newer one makes it
   slow, wide and lit (how it looks); Skyrim's habit: a place, then a rumour that pulls you on. Our own words, our own tune (sounds.js 'country', 'call').

   THE SCENE (the first time her bird comes within sight of a country's coast; once; a tap skips it; never in Classic):
     1 'ahead'   the bars come in; the camera leaves its place behind her, swings round and ahead, and turns back to find her over the water;
     2 'coast'   a dip to dark; the camera is off the coast (the streamed real ground made ready behind the dark, or the shot waits for it), a slow move in
                 toward the shore with the look rising from the beaches to the mountains;
     3 'title'   the country's name rises over the view (title39's card), a smaller line under it, our phrase;
     4 'inland'  the look turns inland, toward the place that calls her; 'call': the kit's card names it, our question phrase, and its quest is pinned
                 (the arrow and the level card follow it);
     5 'back'    a dip to dark, back on her, the bars go, her own camera takes over.
   While it plays she flies on, level, slowed to a glide and turned gently toward the coast (her thumb is not read); after it her own speed returns over 2 s.
   THE PATTERN: one row per country in PLACES (place, trigger area = a coarse coastline and how many km is "within sight", the shot's targets, the title,
   the line under it, the call inland). Jamaica is the only row filled. A new country is a new row, nothing else.
   The page hands it (create): the kit (cine.js), the world's frame (WFR_WORLD), the travel zone's state and ground, Classic, title39, the sounds, the quests'
   pin, save and toast. It never touches the island. Every word and number a DRAFT for Marth's pen and thumb (the coastline points are public geography,
   coarse, for Izumi to check on a chart). */
window.WFR_ARRIVE783 = (function () {
  'use strict';
  var PLACES = [
    { id: 'jamaica', name: 'JAMAICA', under: 'Land of wood and water',
      /* the trigger area: a coarse coastline (lat, lon), clockwise from Negril; she is "within sight" inside it or within sight km of it */
      coast: [[18.31, -78.37], [18.47, -77.92], [18.49, -77.65], [18.47, -77.40], [18.42, -77.12], [18.37, -76.89], [18.27, -76.77], [18.18, -76.45], [17.93, -76.18],
        [17.88, -76.41], [17.94, -76.75], [17.86, -76.95], [17.70, -77.17], [17.87, -77.56], [18.02, -77.85], [18.21, -78.13], [18.27, -78.33]],
      sight: 40,
      peak: { lat: 18.0467, lon: -76.5792, h: 2256, name: 'the Blue Mountains' },   /* the establishing look ends here (Blue Mountain Peak) */
      /* the establishing shot's own place (Ocarina's habit: one chosen view per land, wherever she comes from): off the south-east shore by Yallahs, a
         slow move in toward the beach with the look rising from the shore to the Blue Mountains; then the look turns west along the range toward the call.
         [lat, lon, metres]. A row without a shot gets one made from the nearest coast (camAt's fallback) */
      shot: { cam0: [17.835, -76.596, 260], cam1: [17.852, -76.590, 330], look0: [17.893, -76.585, 30], look1: [18.0467, -76.5792, 1900], fov: [36, 30] },
      call: { lm: 'dunns', lat: 18.4116, lon: -77.1406, h: 120, over: 'A rumour on the wind', name: 'Dunn\'s River Falls', line: 'A river that comes down to the sea in steps. North, over the hills.' } }
  ];
  var K = { SKIP: 0.8, A: 3.4, DIP: 0.4, C1: 9.8, D1: 12.6, E: 13.0, DUR: 14.6, TITLE: 4.7, CALL: 10.2, HOLD_MAX: 4, PRE_MAX: 8, CAP: 24, REL: 2, OUT0: 3000, OUT1: 1500, CAMY0: 380, CAMY1: 520 };
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  /* km on a flat patch (good to a few hundred metres at these distances): the gap from a point to the coastline, 0 inside it */
  function kmXY(lat0, a) { return [(a[1]) * 111.32 * Math.cos(lat0 * Math.PI / 180), a[0] * 110.57]; }
  function inside(poly, lat, lon) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], b = poly[j]; if ((a[0] > lat) !== (b[0] > lat) && lon < (b[1] - a[1]) * (lat - a[0]) / (b[0] - a[0]) + a[1]) c = !c; } return c; }
  function nearest(P, lat, lon) {   /* { km, lat, lon }: the nearest point of the coastline */
    var poly = P.coast, me = kmXY(lat, [lat, lon]), best = { km: 1e9, lat: lat, lon: lon };
    for (var i = 0; i < poly.length; i++) { var a = kmXY(lat, poly[i]), b = kmXY(lat, poly[(i + 1) % poly.length]), dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy,
      t = l2 ? Math.max(0, Math.min(1, ((me[0] - a[0]) * dx + (me[1] - a[1]) * dy) / l2)) : 0, px = a[0] + dx * t, py = a[1] + dy * t, d = Math.hypot(me[0] - px, me[1] - py);
      if (d < best.km) best = { km: d, lat: lerp(poly[i][0], poly[(i + 1) % poly.length][0], t), lon: lerp(poly[i][1], poly[(i + 1) % poly.length][1], t) }; }
    if (inside(poly, lat, lon)) best.km = 0; return best;
  }
  function create(o) {
    var THREE = o.THREE, W = o.W, cine = o.cine;
    var st = { made: true, why: '', plays: 0, skips: 0, ends: 0, last: null, beats: [], wait: 0, hold: 0, holds: 0, err: '', since: 1e9, on: null, refused: 0, lastKm: null };
    var V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), TP = new THREE.Vector3(), TL = new THREE.Vector3(), TA = new THREE.Vector3(), TB = new THREE.Vector3(), TC = new THREE.Vector3();
    function seen() { var S = o.S; S.seen = S.seen || {}; return S.seen.arrive783 || (S.seen.arrive783 = {}); }
    function local(lat, lon, y, out) { var p = W.toLocal(o.T.f, lat, lon); return out.set(p.x, y, p.z); }
    function ground(x, z) { try { return Math.max(0, o.H(x, z)); } catch (e) { return 0; } }
    function loading(x, z) { var st2 = o.T.st; try { return !!(st2 && st2.loadingUnder(x, z)); } catch (e) { return false; } }
    function beat(n) { st.beats.push([n, +sc0().k.toFixed(2)]); }
    var R = null; function sc0() { return R || { k: 0 }; }
    /* the scene: one record R for the play; the kit's clock is only used for its blend in and out, the beats run on R.k (held while the ground streams in) */
    function play(P, ll) {
      var S = o.S, n = nearest(P, ll.lat, ll.lon), B = S.pos;
      var cp = local(n.lat, n.lon, 0, new THREE.Vector3()), out = new THREE.Vector3(B.x - cp.x, 0, B.z - cp.z); if (out.lengthSq() < 1) out.set(0, 0, 1); out.normalize();
      if (n.km === 0) { var c0 = local(P.peak.lat, P.peak.lon, 0, new THREE.Vector3()); out.set(cp.x - c0.x, 0, cp.z - c0.z).normalize(); }   /* already over the land: the camera stands off the shore on the far side from the mountains */
      R = { P: P, k: 0, n: n, cp: cp, out: out, skipped: false, dip: 0, cut: false, said: false, called: false, pinned: false, y0: B.y, yaw0: S.yaw, wait: 0, held: 0, lastShot: 0 };
      R.coastYaw = W.yawToward ? W.yawToward(ll, { lat: n.lat, lon: n.lon }) : S.yaw;
      st.beats = []; st.wait = 0;
      var ok = cine.play({ name: 'arrive783', dur: K.DUR, skip: K.SKIP, freeze: false, bars: true,
        onTap: function (t) { if (t < K.SKIP || R.skipped) return null; R.skipped = true; beat('skip'); return 'skip'; },
        start: function () { beat('ahead'); },
        tick: function (t, real) { tickScene(real); },
        shot: function (t, u, Pp, L) { return shot(Pp, L); },
        end: function (how) { endScene(how); } });
      if (!ok) { R = null; st.refused++; return false; }
      seen()[P.id] = 1; try { o.save(); } catch (e) { /* the flag is in S; the next save keeps it */ }
      st.plays++; st.on = P.id; st.last = { id: P.id, km: +n.km.toFixed(1), y: Math.round(B.y), at: [+ll.lat.toFixed(4), +ll.lon.toFixed(4)] };
      return true;
    }
    function camAt(k, Pp, L) {   /* where the camera is at scene time k (her place read live: she flies on through it) */
      var S = o.S, B = S.pos, s = Math.max(0.25, o.size ? o.size() : 0.4), d0 = 6 + 8 * s, h0 = 2 + 3 * s, yaw = S.yaw, fx = Math.sin(yaw), fz = Math.cos(yaw), sx = Math.cos(yaw), sz = -Math.sin(yaw);
      if (R.skipped || k >= K.E) {   /* 5: back on her, a little low and to her side, settling into her own camera's place */
        var e = R.skipped ? 1 : sm((k - K.E) / (K.DUR - 0.5 - K.E));
        Pp.set(B.x - fx * d0 * lerp(1.15, 1, e) + sx * d0 * 0.25 * (1 - e), B.y + h0 * lerp(0.6, 1, e), B.z - fz * d0 * lerp(1.15, 1, e) + sz * d0 * 0.25 * (1 - e));
        L.set(B.x + fx * 6, B.y + 1, B.z + fz * 6); Pp.y = Math.max(Pp.y, ground(Pp.x, Pp.z) + 1.5); return 50; }
      if (k < K.A + K.DIP) {   /* 1: from her own camera's place, round and ahead, then turned back on her over the water (a slow push in at the end) */
        var a = sm(k / 3.0), ang = Math.PI * (1 - a) + 0.38 * a, r = d0 * (1 + 0.5 * a) * (1 - 0.08 * sm((k - 3.0) / 0.8)), dx = fx * Math.cos(ang) + sx * Math.sin(ang), dz = fz * Math.cos(ang) + sz * Math.sin(ang);
        Pp.set(B.x + dx * r, B.y + lerp(h0, 0.18 * d0, a), B.z + dz * r); Pp.y = Math.max(Pp.y, ground(Pp.x, Pp.z) + 1.2);
        var b = sm(k / 1.1);   /* the look settles on her early, so the swing keeps her in the frame (the first take lost her off the right edge mid-swing) */
        L.set(B.x + fx * 6 * (1 - b), B.y + (1 - b) + 0.25 * s * b, B.z + fz * 6 * (1 - b)); return lerp(50, 40, a); }
      /* 2-4: off the coast, moving in; the look from the shore to the mountains, then inland to the call */
      var c = sm((k - K.A - K.DIP) / (K.C1 - K.A - K.DIP)), dI = sm((k - K.C1) / (K.D1 - K.C1)), P = R.P, cp = R.cp, out = R.out, sh = P.shot;
      if (sh) {   /* the row's chosen view: the move in, the look up the land to its mountains, then turned toward the call (the camera drifts on and rises) */
        var a0 = local(sh.cam0[0], sh.cam0[1], sh.cam0[2], TA), a1 = local(sh.cam1[0], sh.cam1[1], sh.cam1[2], TB);
        Pp.copy(a0).lerp(a1, c); Pp.x += (a1.x - a0.x) * 0.35 * dI; Pp.z += (a1.z - a0.z) * 0.35 * dI; Pp.y += 140 * dI; Pp.y = Math.max(Pp.y, ground(Pp.x, Pp.z) + 120);
        L.copy(local(sh.look0[0], sh.look0[1], sh.look0[2], TA)).lerp(local(sh.look1[0], sh.look1[1], sh.look1[2], TB), sm((k - K.A - K.DIP - 0.5) / 4.8));
        if (dI > 0 && P.call) L.lerp(local(P.call.lat, P.call.lon, P.call.h + 900, TC), dI);
        return lerp(sh.fov[0], sh.fov[1], c) + 4 * dI; }
      var off = lerp(K.OUT0, K.OUT1, c), y = lerp(K.CAMY0, K.CAMY1, c) + 260 * dI;
      Pp.set(cp.x + out.x * (off - 500 * dI), 0, cp.z + out.z * (off - 500 * dI)); Pp.y = Math.max(y, ground(Pp.x, Pp.z) + 300);
      var shore = V.set(cp.x - out.x * 2500, 40, cp.z - out.z * 2500), pk = local(P.peak.lat, P.peak.lon, P.peak.h * 0.75, V2);
      L.copy(shore).lerp(pk, sm((k - K.A - K.DIP - 0.6) / 4.6));
      if (dI > 0 && P.call) { var cl = W.toLocal(o.T.f, P.call.lat, P.call.lon); L.lerp(V3.set(cl.x, P.call.h + 400, cl.z), dI); }
      return lerp(46, 38, c) + 6 * dI;
    }
    function shot(Pp, L) { var f = camAt(R.k, Pp, L); R.lastShot = f; st.camD = Math.round(Pp.distanceTo(o.S.pos)); st.camMax = Math.max(st.camMax || 0, st.camD); return f; }   /* the bench's witness: how far the scene's camera is from her */
    function tickScene(real) {
      var k0 = R.k, P = R.P, coastPhase = R.k >= K.A + K.DIP && R.k < K.E && !R.skipped;
      /* the hold: at the cut to the coast, the dark stays until the ground there is in (the camera is already there, so the streamer's eye is too) */
      if (!R.skipped && R.k >= K.A + K.DIP && !R.ready) {   /* at least 0.3 s in the dark at the coast (the streamer has seen its new eye), then until the ground is in, 4 s at most */
        camAt(R.k, TP, TL); R.wait += real; st.wait = +R.wait.toFixed(2);
        var sh = R.P.shot, shoreX = R.cp.x - R.out.x * 2500, shoreZ = R.cp.z - R.out.z * 2500, lk = sh ? local(sh.look0[0], sh.look0[1], 0, TA) : null, pk = sh ? local(sh.look1[0], sh.look1[1], 0, TB) : null;
        var busy = R.wait < 0.3 || loading(TP.x, TP.z) || (sh ? loading(lk.x, lk.z) || loading(pk.x, pk.z) : loading(R.cp.x, R.cp.z) || loading(shoreX, shoreZ));
        if (busy && R.wait < K.HOLD_MAX) { var cur = cine.current(); if (cur) cur.dur += real; if (R.wait >= 0.3 && !R.held) { R.held = 1; st.holds++; beat('hold'); } cine.fade(1); return; }
        R.ready = true; st.loadedIn = +R.wait.toFixed(2); st.loadedAll = !busy;
      }
      R.k += real; var k = R.k;
      if (R.skipped) { cine.fade(0); return; }
      /* the two dips to dark (the cut to the coast and the cut back to her) */
      var d1 = k >= K.A && k < K.A + K.DIP + 0.4 ? (k < K.A + K.DIP ? sm((k - K.A) / (K.DIP * 0.8)) : 1 - sm((k - K.A - K.DIP) / 0.4)) : 0;
      var d2 = k >= K.D1 && k < K.E + 0.4 ? (k < K.E ? sm((k - K.D1) / (K.E - K.D1 - 0.05)) : 1 - sm((k - K.E) / 0.4)) : 0;
      cine.fade(Math.max(d1, d2));
      if (k0 < K.A + K.DIP && k >= K.A + K.DIP) beat('coast');
      if (!R.said && k >= K.TITLE) { R.said = true; beat('title'); try { o.title('', P.name, P.under, 'country'); } catch (e) { st.err = 'title: ' + (e && e.message); } }
      if (k0 < K.C1 && k >= K.C1) beat('inland');
      if (!R.called && k >= K.CALL && P.call) { R.called = true; beat('call'); callNow(); }
      if (k0 < K.E && k >= K.E) { beat('back'); try { if (o.titleHide) o.titleHide(); var cd = cine.root && cine.root.querySelector('.card'); if (cd) cd.classList.remove('on'); } catch (e) { /* fine */ } }
    }
    function callNow() {
      var P = R.P, c = P.call; if (!c) return;
      try { cine.card(c.over, c.name, c.line); } catch (e) { st.err = 'card: ' + (e && e.message); }
      try { if (o.sound) o.sound('call'); } catch (e) { /* the card shows without its tune */ }
      pinCall();
    }
    function pinCall() { var c = R && R.P.call; if (!c || R.pinned) return; R.pinned = true; try { st.pinned = !!(o.pin && o.pin(c.lm)); } catch (e) { st.err = 'pin: ' + (e && e.message); } }
    function endScene(how) {
      var P = R ? R.P : null; st.ends++; if (how === 'tap') st.skips++; beat('end:' + how); st.on = null; st.since = 0;
      try { cine.fade(0); } catch (e) { /* fine */ }
      if (P) {
        if (!R.said) { try { o.title('', P.name, P.under, 'country'); } catch (e) { /* fine */ } R.said = true; }   /* skipped before the name rose: the name still rises, over her own flight */
        if (!R.pinned && P.call) { pinCall(); try { if (o.toast && st.pinned) o.toast('💦 ' + P.call.name + ' calls. The arrow points the way.', 3400); } catch (e) { /* fine */ } }
      }
      st.lastEnd = { how: how, k: R ? +R.k.toFixed(2) : null };
      R = null;
    }
    function busyWhy() { try { return o.busy ? o.busy() || '' : ''; } catch (e) { return 'busy'; } }
    /* each travel frame (the travel zone only): is she within sight of a country she has never reached? */
    function tick(real) {
      st.since += real || 0;
      if (R || !o.T.on || !o.T.f) return;
      var S = o.S, ll = W.toLatLon(o.T.f, S.pos.x, S.pos.z), sn = seen(), km = [];
      for (var j = 0; j < PLACES.length; j++) km.push(nearest(PLACES[j], ll.lat, ll.lon)); st.lastKm = +km[0].km.toFixed(2);   /* the bench's reading, kept in every state */
      if (o.classic()) { st.why = 'classic'; return; }   /* Classic is frozen (board 645): nothing here ever plays there */
      for (var i = 0; i < PLACES.length; i++) { var P = PLACES[i], n = km[i]; if (sn[P.id]) continue;
        if (n.km > P.sight) { st.pre = 0; continue; }
        var why = busyWhy(); if (why) { st.why = why; return; }
        if (cine.on()) { st.why = 'scene'; return; }
        /* her own ground first (the hold before the shot): never a scene over a hole */
        if (loading(S.pos.x, S.pos.z) && (st.pre = (st.pre || 0) + (real || 0)) < K.PRE_MAX) { st.why = 'ground'; return; }
        st.why = ''; st.pre = 0; play(P, ll); return; }
    }
    /* her flight while it plays: level, turned gently toward the coast, her thumb not read */
    function steer(sx, sy) {
      if (!R) return null; var S = o.S, wrap = function (a) { return Math.atan2(Math.sin(a), Math.cos(a)); };
      return { sx: Math.max(-0.5, Math.min(0.5, -wrap(R.coastYaw - S.yaw) * 1.2)), sy: Math.max(-0.3, Math.min(0.3, (R.y0 - S.pos.y) / 60)) };
    }
    function cap(hz) {   /* a glide while it plays; her own speed back over 2 s after it */
      if (R) return Math.min(hz, K.CAP);
      if (st.since < K.REL) return Math.min(hz, lerp(K.CAP, hz, sm(st.since / K.REL)));
      return hz;
    }
    function peek() { return { made: st.made, on: st.on, k: R ? +R.k.toFixed(2) : null, plays: st.plays, skips: st.skips, ends: st.ends, refused: st.refused, why: st.why, lastKm: st.lastKm, wait: st.wait, holds: st.holds,
      beats: st.beats.slice(), last: st.last, camD: st.camD == null ? null : st.camD, camMax: st.camMax || 0, loadedIn: st.loadedIn == null ? null : st.loadedIn, loadedAll: st.loadedAll == null ? null : st.loadedAll, lastEnd: st.lastEnd || null, pinned: !!st.pinned, err: st.err, seen: Object.assign({}, seen()), places: PLACES.map(function (p) { return p.id; }) }; }
    function probe(lat, lon) {   /* the bench's question: from here, would a country's arrival be due (and if not, why)? It plays nothing */
      if (o.classic()) return 'classic'; var sn = seen();
      for (var i = 0; i < PLACES.length; i++) { var P = PLACES[i], n = nearest(P, lat, lon); if (n.km <= P.sight) return sn[P.id] ? 'seen ' + P.id : 'due ' + P.id; } return 'none'; }
    return { tick: tick, steer: steer, cap: cap, on: function () { return !!R; }, peek: peek, probe: probe, PLACES: PLACES, K: K,
      reset: function (id) { var sn = seen(); if (id) delete sn[id]; else for (var k in sn) delete sn[k]; } };
  }
  return { create: create, PLACES: PLACES, K: K, nearest: nearest };
})();
