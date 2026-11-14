/* bread818.js - BOARD 818, THE PEOPLE WHO OFFER BREAD GIVE HER A LIL PIECE (Wings for Rouge). Nov 14 2026. Guard: tests/bread818.js.
   Marth, Nov 14 2026, verbatim (on live #143, Lv 48, in Cuba near Yaguajay): "We should make it so these guys actually give you a lil piece of bread".
   WHAT SHE SEES: out in the world, when someone says a bread line ("Want some bread?", "Here, birdie.": interact790.js's worldCrumb), they hold a
   little piece of bread out for a breath, then toss it so it lands just in front of her. She pecks it up (she walks onto it, or presses Peck by it):
   a tiny burst of crumbs, the peck's own sound, and it goes in her bag as Bread. From the bag (the pouch) she eats one: half a heart back.
   DRAFTS for his thumb: half a heart a piece; one piece per person per visit (a visit ends when she flies home); 5 in the bag at most.
   SAVED under a NEW key only, S.seen.bread818 = { n: in the bag, got: ever pecked up, ate: ever eaten }, written the first time she pecks one up.
   COST: every picture is made here at load (3 pieces, 12 crumbs, one material, both layers), hidden until used; nothing is added to the scene or
   compiled while she plays (the page warms the program at boot). Standard only (the page never creates it in Classic). Every word a DRAFT. */
window.WFR_BREAD818 = (function () {
  'use strict';
  var C = { CAP: 5, HEAL: 1, HOLD: 0.75, TOSS: 0.55, ARC: 0.7, LAND: 0.85, WALK_R: 0.75, PECK_R: 1.7, LIFE: 45, POOL: 3, CRUMBS: 12, BURST: 0.6 };   /* HEAL in half hearts; LAND: m in front of her; LIFE: s a piece waits on the ground */
  var WORDS = { got: '🍞 A lil piece of bread', bag: 'in your bag', full: '🍞 Your bag already holds 5 pieces of bread: no room for this one.', first: 'Eat it from your pouch: half a heart back.',
    ate: '🍞 Mm, bread. Half a heart back.', whole: 'Your hearts are full: keep it for later.', none: 'No bread in your bag.', noHearts: 'You feel fine: keep it for later.', eat: 'Eat one', title: 'Food', name: 'bread' };

  function create(io) {
    if (!io || !io.THREE) return null;
    var THREE = io.THREE, L = io.layer || 7, plant = null, visit = null, given = {}, err = null;
    var stat = { offered: 0, twice: 0, noPiece: 0, tossed: 0, landed: 0, taken: 0, bagged: 0, full: 0, eaten: 0, refused: 0, expired: 0, pecks: 0, walks: 0, bursts: 0, shifts: 0 };
    function S() { return io.S(); }
    function both(o) { o.layers.enable(0); o.layers.enable(L); o.frustumCulled = false; o.visible = false; io.scene.add(o); return o; }
    function colGeo(geo, fn) { geo = geo.index ? geo.toNonIndexed() : geo; var p = geo.attributes.position, n = geo.attributes.normal, c = new Float32Array(p.count * 3), col = new THREE.Color();
      for (var i = 0; i < p.count; i++) { fn(col, p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo; }
    /* the pictures: a torn chunk of bread (golden top, darker crust, the soft white inside at its torn end) and its crumbs; flat colours lit by hand,
       so the one program needs no light and no fog (it reads the same at home and out in the world) */
    var mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false });
    var pieceGeo = colGeo(new THREE.SphereGeometry(0.1, 9, 6).scale(1.15, 0.62, 0.85), function (c, x, y, z, nx, ny) { var w = 0.035 * Math.sin(x * 83 + z * 59);   /* a torn lump: a golden crust on top, darker low down, the soft pale inside at its torn end */
      if (x > 0.075) c.setRGB(0.96 + w, 0.9 + w, 0.74 + w); else if (ny > 0.35) c.setRGB(0.84 + w, 0.6 + w, 0.32 + w); else if (ny < -0.4) c.setRGB(0.62, 0.42, 0.22); else c.setRGB(0.74 + w, 0.5 + w, 0.26 + w); });
    var crumbGeo = colGeo(new THREE.BoxGeometry(0.05, 0.035, 0.045), function (c, x, y, z, nx, ny) { if (ny > 0.5) c.setRGB(0.95, 0.86, 0.66); else c.setRGB(0.76, 0.5, 0.25); });
    var P = [], CR = [], i;
    for (i = 0; i < C.POOL; i++) { var m = new THREE.Mesh(pieceGeo, mat); m.name = 'bread818:piece'; P.push({ m: both(m), ph: null, t: 0, id: null, where: null, x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: 0, tx: 0, ty: 0, tz: 0, spin: 0 }); }
    for (i = 0; i < C.CRUMBS; i++) { var cm = new THREE.Mesh(crumbGeo, mat); cm.name = 'bread818:crumb'; CR.push({ m: both(cm), on: false, t: 0, vx: 0, vy: 0, vz: 0, s: 1 }); }

    function rec(make) { var s = S(); if (!s) return null; s.seen = s.seen || {}; var r = s.seen.bread818; if (!r || typeof r !== 'object') { if (!make) return null; r = s.seen.bread818 = { n: 0, got: 0, ate: 0 }; } r.n = Math.max(0, r.n | 0); r.got = r.got | 0; r.ate = r.ate | 0; return r; }
    function have() { var r = rec(false); return r ? r.n : 0; }
    function cap() { return plant === 'nocap' ? 1e9 : C.CAP; }
    function toast(t, ms) { try { io.toast(t, ms || 3200); } catch (e) { /* fine */ } }
    function save() { try { io.save(); } catch (e) { err = 'save: ' + (e && e.message || e); } }
    function visitNow() { var v = null; try { v = io.visit(); } catch (e) { v = null; } if (v !== visit) { visit = v; given = {}; } }
    function at(where) { var w = null; try { w = where(); } catch (e) { w = null; } return w && isFinite(w.x) && isFinite(w.z) ? w : null; }
    function ground(x, z) { var g = 0; try { g = +io.ground(x, z); } catch (e) { g = 0; } return g === g ? g : 0; }

    /* a bread line was said (interact790's peopleScan): this person holds a piece out, then tosses it to her. Once per person per visit. */
    function offer(id, where) {
      try {
        if (!io.travel()) return false; visitNow(); var key = String(id);
        if (given[key]) { stat.twice++; return false; }
        var w = at(where); if (!w) return false;
        var p = null; for (var k = 0; k < P.length; k++) if (!P[k].ph) { p = P[k]; break; } if (!p) { stat.noPiece++; return false; }
        given[key] = 1; stat.offered++; p.ph = 'hold'; p.t = 0; p.id = key; p.where = where; p.spin = 0; hand(p, w); p.m.visible = true; place(p); return true;
      } catch (e) { err = 'offer: ' + (e && e.message || e); return false; }
    }
    function hand(p, w) { var me = io.me(), dx = me.x - w.x, dz = me.z - w.z, d = Math.hypot(dx, dz) || 1; p.x = w.x + dx / d * 0.35; p.z = w.z + dz / d * 0.35; p.y = (isFinite(w.y) ? w.y : ground(w.x, w.z)) + 1.05 + 0.03 * Math.sin(p.t * 9); }
    function place(p) { p.m.position.set(p.x, p.y, p.z); p.m.rotation.set(0.25 * Math.sin(p.spin), p.spin, 0.2 * Math.cos(p.spin * 0.7)); }
    function toss(p) {   /* from the hand to just in front of her, on the person's side */
      var me = io.me(), dx = p.x - me.x, dz = p.z - me.z, d = Math.hypot(dx, dz) || 1, r = Math.min(C.LAND, d * 0.6);
      p.fx = p.x; p.fy = p.y; p.fz = p.z; p.tx = me.x + dx / d * r; p.tz = me.z + dz / d * r; p.ty = ground(p.tx, p.tz) + 0.065; p.ph = 'toss'; p.t = 0; stat.tossed++;
      try { io.sound('toss'); } catch (e) { /* fine */ }
    }
    function burst(x, y, z) {   /* the crumbs fly from where her beak met it */
      stat.bursts++; for (var k = 0; k < CR.length; k++) { var c = CR[k], a = k / CR.length * Math.PI * 2 + Math.random() * 0.5, v = 0.9 + Math.random() * 1.1;
        c.on = true; c.t = 0; c.vx = Math.cos(a) * v; c.vz = Math.sin(a) * v; c.vy = 1.6 + Math.random() * 1.4; c.s = 0.7 + Math.random() * 0.6; c.m.position.set(x, y + 0.04, z); c.m.scale.setScalar(c.s); c.m.visible = true; }
    }
    function take(p, how) {   /* she pecks it up: the crumbs, the peck's sound, into her bag (5 at most) */
      var x = p.x, y = p.y, z = p.z; p.ph = null; p.m.visible = false; p.where = null; stat.taken++; if (how === 'peck') stat.pecks++; else stat.walks++;
      burst(x, y, z); try { io.peck(); } catch (e) { /* fine */ }
      var r = rec(true), first = !r.got;
      if (r.n >= cap()) { stat.full++; toast(WORDS.full, 3000); }
      else { r.n++; r.got++; stat.bagged++; toast(WORDS.got + ' (' + r.n + ' ' + WORDS.bag + ').' + (first ? ' ' + WORDS.first : ''), first ? 4200 : 2600); }
      save(); try { io.changed(); } catch (e) { /* fine */ }
    }
    function peck() {   /* a press of Peck by a piece takes it (from the page's attack, out in the world) */
      try { if (!io.travel()) return false; var me = io.me(), best = null, bd = C.PECK_R;
        for (var k = 0; k < P.length; k++) { var p = P[k]; if (p.ph !== 'rest' && p.ph !== 'toss') continue; var d = Math.hypot(p.x - me.x, p.z - me.z); if (d <= bd) { bd = d; best = p; } }
        if (!best) return false; take(best, 'peck'); return true; } catch (e) { err = 'peck: ' + (e && e.message || e); return false; }
    }
    function tick(dt) {
      try {
        dt = Math.max(0, Math.min(0.1, +dt || 0)); var k, p;
        if (!io.travel()) { for (k = 0; k < P.length; k++) if (P[k].ph) { P[k].ph = null; P[k].m.visible = false; P[k].where = null; } for (k = 0; k < CR.length; k++) if (CR[k].on) { CR[k].on = false; CR[k].m.visible = false; } return; }   /* home: what was out there stays out there */
        visitNow(); var me = io.me(), foot = io.foot(), walking = io.walking();
        for (k = 0; k < P.length; k++) { p = P[k]; if (!p.ph) continue; p.t += dt;
          if (p.ph === 'hold') { var w = at(p.where); if (w) hand(p, w); p.spin = 0.4 * Math.sin(p.t * 5); if (p.t >= C.HOLD || !w) toss(p); }
          else if (p.ph === 'toss') { var u = Math.min(1, p.t / C.TOSS); p.x = p.fx + (p.tx - p.fx) * u; p.z = p.fz + (p.tz - p.fz) * u; p.y = p.fy + (p.ty - p.fy) * u + 4 * C.ARC * u * (1 - u); p.spin += dt * 9;
            if (u >= 1) { p.ph = 'rest'; p.t = 0; p.y = p.ty; p.spin = Math.round(p.spin / Math.PI) * Math.PI + 0.4; stat.landed++; } }
          else if (p.ph === 'rest') { if (p.t > C.LIFE) { p.ph = null; p.m.visible = false; stat.expired++; continue; } }
          if (p.ph === 'rest' || p.ph === 'toss') { var d = Math.hypot(p.x - me.x, p.z - me.z); if (walking && d < C.WALK_R && Math.abs(p.y - foot) < 0.8) { take(p, 'walk'); continue; } }
          place(p); }
        for (k = 0; k < CR.length; k++) { var c = CR[k]; if (!c.on) continue; c.t += dt; if (c.t >= C.BURST) { c.on = false; c.m.visible = false; continue; }
          var q = c.m.position; c.vy -= 9 * dt; q.x += c.vx * dt; q.y += c.vy * dt; q.z += c.vz * dt; var g = ground(q.x, q.z) + 0.02; if (q.y < g) { q.y = g; c.vy = 0; c.vx *= 0.6; c.vz *= 0.6; }
          c.m.rotation.x += dt * 12; c.m.rotation.z += dt * 9; c.m.scale.setScalar(c.s * Math.min(1, (C.BURST - c.t) / 0.2)); }
      } catch (e) { err = 'tick: ' + (e && e.message || e); }
    }
    function shift(dx, dz) {   /* the travel frame recentred: a piece stays where it was */
      stat.shifts++; for (var k = 0; k < P.length; k++) { var p = P[k]; if (!p.ph) continue; p.x += dx; p.z += dz; p.fx += dx; p.fz += dz; p.tx += dx; p.tz += dz; place(p); }
      for (k = 0; k < CR.length; k++) if (CR[k].on) { CR[k].m.position.x += dx; CR[k].m.position.z += dz; }
    }
    /* from the bag: one piece, half a heart back (never past full; with no hearts yet it is kept) */
    function eat() {
      try { var r = rec(false); if (!r || r.n <= 0) { toast(WORDS.none, 2000); return 'none'; }
        var h = io.heal(C.HEAL); if (h === 'nohearts') { stat.refused++; toast(WORDS.noHearts, 2400); return h; } if (h !== true) { stat.refused++; toast(WORDS.whole, 2400); return 'whole'; }
        r.n--; r.ate++; stat.eaten++; try { io.sound('eat'); } catch (e) { /* fine */ } toast(WORDS.ate, 2400); save(); try { io.changed(); } catch (e) { /* fine */ } return true;
      } catch (e) { err = 'eat: ' + (e && e.message || e); return false; }
    }
    function pouch() {   /* the pouch's own row: the bread and its Eat button (only once she has had a piece) */
      var r = rec(false); if (!r || !(r.got > 0 || r.n > 0)) return '';
      return '<h3>' + WORDS.title + '</h3><ul class="slots"><li class="slot' + (r.n > 0 ? '' : ' dim') + '" data-k="bread818"><i>🍞</i><em>' + WORDS.name + '</em><b>' + r.n + '</b></li></ul>' +
        '<button type="button" data-b818="eat" style="margin:4px 0 8px;min-height:40px;padding:0 16px;border-radius:12px;border:0;background:#3f8f5a;color:#fff;font:800 14px var(--body,system-ui)"' + (r.n > 0 ? '' : ' disabled') + '>' + WORDS.eat + ' (+½ ❤️)</button>';
    }
    document.addEventListener('click', function (e) { var t = e.target && e.target.closest ? e.target.closest('[data-b818]') : null; if (!t) return; e.preventDefault(); e.stopPropagation(); eat(); }, true);
    function warm() { return [P[0].m, CR[0].m]; }   /* the page's first frames draw these too small to see: the one program compiles at boot */
    function peek() {
      var r = rec(false); return { bag: r ? { n: r.n, got: r.got, ate: r.ate } : null, cap: C.CAP, plant: plant, visit: visit, given: Object.keys(given), err: err, stat: Object.assign({}, stat),
        pieces: P.map(function (p) { return p.ph ? { ph: p.ph, id: p.id, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), vis: p.m.visible } : null; }), crumbs: CR.filter(function (c) { return c.on; }).length };
    }
    function bench(o) { o = o || {}; if ('plant' in o) plant = o.plant || null; if (o.bag != null) { var r = rec(true); r.n = o.bag | 0; save(); } if (o.offer) return offer(o.offer.id, o.offer.where); if (o.peck) return peck(); if (o.eat) return eat(); return peek(); }
    return { C: C, WORDS: WORDS, offer: offer, tick: tick, peck: peck, eat: eat, shift: shift, pouch: pouch, warm: warm, have: have, peek: peek, bench: bench };
  }
  return { C: C, WORDS: WORDS, create: create };
}());
