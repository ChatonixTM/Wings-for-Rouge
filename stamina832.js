/* stamina832.js - BOARD 832, FLYING COSTS HER, FRUIT FEEDS HER (Wings for Rouge). Nov 14 2026. Guard: tests/stamina832.js.
   Marth, Nov 14 2026, verbatim: "I was thinking flying will cost her some hearts and yeah fruit from the trees rouge / blue jay should be able to feed
   themselves to get back some stamina". (Loop link 4 in LOOP_MAP_829.md.)
   WHAT SHE SEES (Standard only; Classic is frozen and never makes it; only once she has hearts, after the Hawk, as hearts are what it costs):
     - a small bar beside her hearts: her stamina. Flying wears it down: a flap, a held Flap, a hover, a climb and Quick Flutter cost more; a glide, the tuck
       dive and fast forward cost little. Standing, perching and being indoors rest her slowly, only to half (walking slower); fruit and bread are the real refill.
     - at a quarter: one line, her wings are tiring, perch, land or eat fruit. Empty while flying: the bar blinks red and a line says flying will soon cost
       hearts; only after GRACE more seconds in the air does it take half a heart, then half a heart every EVERY seconds. It never takes her last heart.
     - fruit: a tree fruit she flies or walks to while tired (under HUNGRY) she eats herself (stamina +FRUIT, and the heart the fruit already gave); when she
       is not tired it goes in her beak for her chick as before. Out in the world some real trees near her bear fruit (one in WF_EVERY: a mango in the
       tropics, an apple in the middle latitudes, blueberries in the north), so her routes over land have food. The bread people give (818) gives BREAD.
     - the Hawk's fights drain her as any flight does (apples hang in the arena, in reach); races, the rune course, a mission run, arrivals and talks never do.
   Both birds: every phone runs this for its own bird, so Rouge and the blue jay in Fly together follow the same rules (net721 keeps S.stam832 for a guest,
   799's rule: what she earns there).
   SAVED under a NEW key only, S.stam832 = { v: 0-100, ate: n }, written the first time her bar drops below full (an old file loads full and untouched).
   COST: the bar is DOM (built at load, hung beside the hearts once they exist); the world's fruit are 12 sprites made at load on the game's own emoji sprite
   (one program, compiled at boot), hidden until a tree near her bears; over each a glimmer, missions788's own spark and beam (4, made at load: its programs); nothing is added to the scene or compiled while she plays.
   Every number and word a DRAFT for his pen and his thumb. */
window.WFR_STAM832 = (function () {
  'use strict';
  /* THE NUMBERS (per second of play unless said; the bar is 0-100) */
  var C = { MAX: 100, GLIDE: 0.12, DIVE: 0.05, FF: 0.05, HOLD: 0.6, HOVER: 1.5, FLAP: 0.5, CLIMB: 0.5, FLUT: 2.0, STAND: 0.55, WALK: 0.25, REST_TO: 0.5,
    WARN: 25, GRACE: 10, EVERY: 20, KEEP: 2, FRUIT: 40, BREAD: 25, HUNGRY: 0.75, SAVE_S: 5, POP_T: 1.4, ARENA_BACK: 30, ARENA_R: 3.5,
    WF_EVERY: 37, WF_N: 4, WF_MAX: 240, WF_FAR: 480, WF_R: 6, WF_DY: 10, WF_BACK: 120, WF_SCAN: 1.0, WF_SIZE: 4.8, GL_SIZE: 1.4, GL_UP: 3.2, GL_BEAM_W: 2.5, GL_NEAR: 70, GL_FAR: 420, GL_MAX: 3.2 };   /* GL: the glimmer over a fruiting tree (missions788's own), scaled with her distance so it reads from 150-400 m up */
  var WORDS = {
    tiring: '🪽 Your wings are tiring. Perch, land or eat fruit to rest them.',
    empty: '🪽 Out of breath! Land, perch or eat fruit: soon flying will cost hearts.',
    cost: '🪽 Tired wings: half a heart. Land to rest, or eat fruit.',
    last: '🪽 Too tired to fly well. Land and rest: your last heart is safe.',
    ate: function (name, n, heart) { return '😋 You ate ' + name + ': stamina +' + n + (heart ? ', and a heart back' : '') + '. Fruit trees fill your wings.'; },
    wild: function (name, n, heart) { return '😋 A wild ' + name + '! Stamina +' + n + (heart ? ', and a heart back' : '') + '. Trees with fruit fill your wings.'; },
    rested: '🪽 Rested to half. Fruit and bread fill your wings the rest of the way.', label: 'Stamina'
  };
  var SETS = [{ id: 'tropic', e: '🥭', name: 'mango' }, { id: 'mid', e: '🍎', name: 'apple' }, { id: 'north', e: '🫐', name: 'handful of blueberries' }];
  function setOf(lat) { var a = Math.abs(+lat || 0); return a < 24 ? 0 : a < 50 ? 1 : 2; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function hash2(x, z) { var h = Math.imul(Math.round(x) | 0, 73856093) ^ Math.imul(Math.round(z) | 0, 19349663); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  /* THE RULE (pure): the bar's change per second for what she is doing. o: { mode, still, hold, hover, pitch, dive, flut, ff, travel, inside, busy } */
  function rate(o) {
    if (!o || o.busy) return 0;
    if (o.mode === 'walk' || o.mode === 'nest' || o.mode === 'hatch') return o.inside || o.still ? C.STAND : C.WALK;
    if (o.mode !== 'fly' && o.mode !== 'hover') return 0;   /* swimming, landing, a scene: the bar holds */
    if (o.ff) return -C.FF;
    if (o.dive) return -C.DIVE;
    var r = C.GLIDE;
    if (!o.travel && o.hold) r = o.hover ? C.HOVER : C.HOLD;
    else if (o.mode === 'hover') r = C.HOVER;
    if (o.pitch > 0.12) r += C.CLIMB * Math.min(1, o.pitch / 0.5);
    if (o.flut) r += C.FLUT;
    return -r;
  }
  /* how far a full bar carries her (the numbers' check: seconds and metres at a speed) */
  function reach(perS, speed) { return { s: Math.round(C.MAX / perS), m: Math.round(C.MAX / perS * (speed || 15)) }; }

  function create(io) {
    if (!io || io.classic()) return null;
    var THREE = io.THREE, err = null, st = { drained: 0, rested: 0, flaps: 0, costs: 0, warned: 0, empties: 0, ate: 0, bread: 0, wild: 0, wildShown: 0, scans: 0, kept: 0 };
    var flapWas = 0, emptyT = 0, costT = 0, saveT = 0, tired = false, lastRate = 0, plant = null, px = null, pz = null;
    function S() { return io.S(); }
    function MX() { var k = 1; try { k = io.maxK ? Math.max(1, +io.maxK() || 1) : 1; } catch (e) { k = 1; } return C.MAX * k; }   /* 829 link 1: Bigger wings */
    function on() { var s = S(); return !!(s && s.hearts && s.hearts.max > 0); }
    function rec(make) { var s = S(); var r = s.stam832; if (!r || typeof r !== 'object') { if (!make) return null; r = s.stam832 = { v: MX(), ate: 0 }; } r.v = clamp(isFinite(+r.v) ? +r.v : MX(), 0, MX()); r.ate = r.ate | 0; return r; }
    function v() { var r = rec(false); return r ? r.v : MX(); }
    function put(x) { var r = rec(x < MX()); if (!r) return; r.v = clamp(x, 0, MX()); }
    function toast(t, ms) { try { io.toast(t, ms || 3600); } catch (e) { /* fine */ } }

    /* ---------- THE BAR (DOM, built here at load; hung beside the hearts once their row exists) ---------- */
    var bar = document.createElement('div'); bar.id = 'stam832'; bar.setAttribute('role', 'meter'); bar.setAttribute('aria-label', WORDS.label); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
    bar.style.cssText = 'position:absolute;top:50%;height:9px;width:56px;margin-top:-4px;border-radius:6px;background:rgba(10,14,24,.55);box-shadow:0 0 0 1.5px rgba(255,255,255,.75),0 1px 3px rgba(0,0,0,.4);overflow:hidden;pointer-events:none;transition:opacity .4s';
    var fill = document.createElement('i'); fill.style.cssText = 'display:block;height:100%;width:100%;border-radius:6px;background:#6fd36a;transform-origin:left center';
    bar.appendChild(fill);
    var popEl = document.createElement('b'); popEl.id = 'stam832p'; popEl.style.cssText = 'position:absolute;top:50%;margin-top:-9px;font:800 13px/18px system-ui,sans-serif;color:#6fd36a;text-shadow:0 1px 2px rgba(0,0,0,.7),0 0 6px rgba(111,211,106,.6);pointer-events:none;white-space:nowrap;opacity:0;transition:none';
    var popT = -1, popN = 0;   /* the +n by the bar, in the bar's own green: what a fruit or bread put into her stamina (never her hearts) */
    function pop(n) { popN = n; popT = io.played(); popEl.textContent = '+' + n; st.pops = (st.pops || 0) + 1; st.lastPop = '+' + n; }
    var hung = null, shown = { w: -1, col: '', blink: -1, left: -1, op: '', mx: C.MAX };
    function colOf(x) { return x > 50 ? '#6fd36a' : x > C.WARN ? '#f2c14e' : '#ff5a4f'; }
    function draw(t) {
      var host = document.getElementById('hearts714'), cv = document.getElementById('hearts714c');
      if (host !== hung) { if (host) { if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; host.appendChild(bar); host.appendChild(popEl); } hung = host; }
      if (!host) return;
      var show = on() && !host.hidden; if (bar.hidden === show) bar.hidden = !show; if (!show) return;
      var x = v(), mx = MX(), w = Math.round(x / mx * 100), col = colOf(x / mx * 100), blink = x <= 0 && flying() ? (Math.sin(t * 9) > 0 ? 1 : 0) : 0, left = cv ? Math.round(parseFloat(cv.style.width) || cv.clientWidth || 110) + 4 : 114, op = x >= MX() && !flying() ? '.6' : '1';
      if (w !== shown.w) { shown.w = w; fill.style.width = Math.max(0, w) + '%'; bar.setAttribute('aria-valuenow', String(Math.round(x))); }
      if (mx !== shown.mx) { shown.mx = mx; bar.style.width = Math.round(56 * mx / C.MAX) + 'px'; bar.setAttribute('aria-valuemax', String(mx)); }   /* a bigger bar is a longer bar */
      if (col !== shown.col || blink !== shown.blink) { shown.col = col; shown.blink = blink; fill.style.background = col; bar.style.boxShadow = blink ? '0 0 0 2px #ff5a4f,0 0 8px #ff5a4f' : '0 0 0 1.5px rgba(255,255,255,.75),0 1px 3px rgba(0,0,0,.4)'; }
      if (left !== shown.left) { shown.left = left; bar.style.left = left + 'px'; }
      if (op !== shown.op) { shown.op = op; bar.style.opacity = op; }
      if (popT >= 0) { var u = Math.min(1, Math.max(0, ((t || 0) - popT) / C.POP_T)); popEl.style.left = (left + parseFloat(bar.style.width || '56') + 6) + 'px'; popEl.style.opacity = String(u < 0.15 ? u / 0.15 : 1 - Math.max(0, (u - 0.6) / 0.4)); popEl.style.transform = 'translateY(' + (-10 * u).toFixed(1) + 'px)'; if (u >= 1) { popT = -1; popEl.style.opacity = '0'; } }
    }

    /* ---------- THE WORLD'S FRUIT (12 sprites made here at load, hidden; a few placed on real trees near her) ---------- */
    var POOL = [];
    SETS.forEach(function (set, si) { for (var i = 0; i < C.WF_N; i++) { var sp = io.sprite(set.e, C.WF_SIZE); sp.name = 'stam832:fruit:' + set.id; sp.visible = false; sp.frustumCulled = false; sp.layers.enable(0); if (io.layer) sp.layers.enable(io.layer); io.scene.add(sp); POOL.push({ s: sp, set: si, on: false, x: 0, y: 0, z: 0, key: '' }); } });
    var SPOT = []; for (var si2 = 0; si2 < 3; si2++) { var ap = io.sprite('\u{1F34E}', 3.0); ap.name = 'stam832:arena'; ap.visible = false; io.scene.add(ap); SPOT.push({ s: ap, back: 0, x: 0, y: 0, z: 0 }); }   /* the boss fight's fruit, made at load */
    function spotTick(dt) { var sp = null; try { sp = io.spots ? io.spots() : null; } catch (e) { sp = null; } var P = io.me();
      for (var i = 0; i < SPOT.length; i++) { var q = SPOT[i], at = sp && sp[i]; if (!at) { if (q.s.visible) q.s.visible = false; q.back = 0; continue; } q.back = Math.max(0, q.back - dt); q.x = at.x; q.y = at.y; q.z = at.z; q.s.position.set(at.x, at.y + Math.sin(io.played() * 2 + i) * 0.3, at.z);
        var vis = q.back <= 0; if (q.s.visible !== vis) q.s.visible = vis; if (vis && Math.hypot(P.x - q.x, P.y - q.y, P.z - q.z) < C.ARENA_R && v() < MX() - 0.5) { q.back = C.ARENA_BACK; q.s.visible = false; var g = gain(C.FRUIT); st.arena = (st.arena || 0) + 1; try { io.yum(); } catch (e) { /* fine */ } toast('😋 An apple! Stamina +' + g + '.', 2400); } } }
    var picked = {}, scanT = 0, GL = [], GCOL = [0xffb347, 0xff7a6b, 0x8fb0ff];
    function glimK() { try { return io.glimK ? Math.max(1, +io.glimK() || 1) : 1; } catch (e) { return 1; } }   /* 829 link 1: the Wider glimmer upgrade */
    /* the glimmers: missions788's glimmer (its spark and beam), made once at load by glimmer(make) from the page; one over each fruit shown */
    function glimmer(make) { try { if (GL.length || typeof make !== 'function') return GL.length; for (var i = 0; i < C.WF_N; i++) { var g = make(0xffd166, C.GL_SIZE, true); g.visible = false; g.name = 'stam832:glimmer'; GL.push(g); } } catch (e) { err = 'glimmer: ' + (e && e.message || e); } return GL.length; }
    function glimTick() { var P = io.me(), k = 0, t = io.played(); for (var i = 0; i < POOL.length && k < GL.length; i++) { var f = POOL[i]; if (!f.on) continue; var g = GL[k++], d = Math.hypot(P.x - f.x, P.y - f.y, P.z - f.z), gk = glimK(), s = clamp(d / C.GL_NEAR * 0.6, 0.6, C.GL_MAX) * gk;
        if (!g.visible) g.visible = true; if (g.userData.set !== f.set) { g.userData.set = f.set; var c = GCOL[f.set]; if (g.userData.core) g.userData.core.material.color.setHex(c); if (g.userData.halo) g.userData.halo.material.color.setHex(c); if (g.userData.beam) g.userData.beam.material.color.setHex(c); }
        g.position.set(f.x, f.y + C.GL_UP + Math.sin(t * 2 + i) * 0.25, f.z); g.scale.setScalar(s);
        var bm = g.userData.beam; if (bm) { var want = Math.max(20, P.y - f.y + 40), ky = want / (14 * C.GL_SIZE * s); bm.scale.set(C.GL_BEAM_W, ky, C.GL_BEAM_W); bm.position.y = 7 * C.GL_SIZE * ky + 0.6 * C.GL_SIZE; g.userData.beamH = want; }   /* the glimmer's pillar of light rises from the tree to her height: seen from high up, ahead */ if (g.userData.core) g.userData.core.rotation.y = t * 1.6; if (g.userData.halo) g.userData.halo.material.opacity = 0.7 + 0.2 * Math.sin(t * 3 + i); }
      for (; k < GL.length; k++) if (GL[k].visible) GL[k].visible = false; }
    function wildHide() { for (var i = 0; i < POOL.length; i++) if (POOL[i].on) { POOL[i].on = false; POOL[i].s.visible = false; } for (var j = 0; j < GL.length; j++) if (GL[j].visible) GL[j].visible = false; }
    function scan() {   /* every WF_SCAN s out in the world: the bearing trees near her (ahead first), one fruit each */
      st.scans++; var P = io.me(), yaw = io.yaw(), fx = Math.sin(yaw), fz = Math.cos(yaw), set = setOf(io.lat()), cand = [], now = io.played();
      var agl = Math.max(0, P.y - io.ground(P.x, P.z)), gk = glimK(), R = Math.min(C.WF_FAR, Math.max(C.WF_MAX, 1.6 * agl)) * gk; st.reach = Math.round(R);   /* high up she looks farther ahead: the trees in her view, not under her */
      var shownKey = {}; for (var q = 0; q < POOL.length; q++) if (POOL[q].on) shownKey[POOL[q].key] = 1;   /* a fruit she can see stays while its tree is in reach */
      if (!io.trees) return; io.trees(function (x, z, ht, cr) {
        var dx = x - P.x, dz = z - P.z, d = Math.sqrt(dx * dx + dz * dz); if (d < 2 || d > R || ht < 3) return;
        if (hash2(x * 0.5, z * 0.5) >= 1 / C.WF_EVERY) return; var key = Math.round(x) + ',' + Math.round(z); if (picked[key] && now - picked[key] < C.WF_BACK) return;
        var a = (dx * fx + dz * fz) / Math.max(1, d); cand.push({ x: x, z: z, ht: ht, cr: cr, d: d, a: a, key: key, w: shownKey[key] ? -1 : a > 0.3 && d >= 0.6 * agl ? 0 : a > -0.2 ? 1 : 2 }); });
      cand.sort(function (a, b) { return a.w - b.w || a.d - b.d; });   /* ahead and in her view first, then the nearest */
      var take = cand.slice(0, C.WF_N), keep = {}; take.forEach(function (c) { keep[c.key] = c; });
      for (var i = 0; i < POOL.length; i++) { var f = POOL[i]; if (f.on && (f.set !== set || !keep[f.key])) { f.on = false; f.s.visible = false; } if (f.on) { var kc = keep[f.key]; f.y = io.ground(kc.x, kc.z) + kc.ht * 0.72; f.s.position.y = f.y; delete keep[f.key]; } }   /* re-seated on the ground as it sharpens */
      Object.keys(keep).forEach(function (k) { var c = keep[k], f = null; for (var j = 0; j < POOL.length && !f; j++) if (!POOL[j].on && POOL[j].set === set) f = POOL[j]; if (!f) return;
        var ux = P.x - c.x, uz = P.z - c.z, ul = Math.max(0.01, Math.hypot(ux, uz)), foot = io.ground(c.x, c.z);
        f.x = c.x + ux / ul * c.cr * 1.15; f.z = c.z + uz / ul * c.cr * 1.15; f.y = foot + c.ht * 0.72;   /* just outside the crown on her side, where she sees it */ f.key = c.key; f.on = true; f.s.position.set(f.x, f.y, f.z); f.s.visible = true; st.wildShown++; });
    }
    function wildTick(dt) {
      if (!io.travel()) { wildHide(); return; }
      scanT -= dt; if (scanT <= 0) { scanT = C.WF_SCAN; try { scan(); } catch (e) { err = 'scan: ' + (e && e.message || e); } }
      var P = io.me(), m = S().mode; if (m !== 'fly' && m !== 'walk' && m !== 'landing' && m !== 'hover') return;   /* a swoop down onto it (landing) eats it too */
      for (var i = 0; i < POOL.length; i++) { var f = POOL[i]; if (!f.on) continue; f.s.position.y = f.y + Math.sin(io.played() * 2 + i) * 0.08;
        if (Math.hypot(P.x - f.x, P.z - f.z) < C.WF_R && Math.abs(P.y - f.y) < C.WF_DY && v() < MX() - 0.5) {   /* a swoop past the crown: near across, and within WF_DY up or down */ f.on = false; f.s.visible = false; picked[f.key] = io.played(); var set = SETS[f.set], heart = false;   /* a wild fruit is stamina only: no heart (a tree in every forest would farm them) */
          var got = gain(C.FRUIT); st.wild++; st.ate++; var r = rec(true); r.ate++; io.save(); try { io.yum(); } catch (e) { /* fine */ } toast(WORDS.wild(set.name, got, heart), 3600); } }
      glimTick();
    }

    /* ---------- EATING ---------- */
    function gain(n) { var x0 = v(), x1 = Math.min(MX(), x0 + n); put(x1); if (x1 > C.WARN) tired = false; if (x1 > 0) { emptyT = 0; costT = 0; } var g = Math.round(x1 - x0); if (g > 0) pop(g); return g; }
    function hungry() { return on() && v() < MX() * C.HUNGRY; }   /* under three quarters she eats a tree fruit herself; fuller, it goes in her beak for her chick */
    /* a tree fruit on the island, while she is tired: she eats it (the page calls this instead of filling her beak); returns the stamina gained */
    function eatFruit(name, heart) { if (!on()) return 0; var got = gain(C.FRUIT); st.ate++; var r = rec(true); r.ate++; io.save(); toast(WORDS.ate(name, got, heart), 3400); return got; }
    /* bread818's eat asks this: stamina back from a piece (0 when the bar is full) */
    function bread() { if (!on() || v() >= MX() - 0.5) return 0; var got = gain(C.BREAD); st.bread++; io.save(); return got; }

    /* ---------- EACH FRAME (both zones) ---------- */
    function flying() { var m = S().mode; return m === 'fly' || m === 'hover'; }
    function tick(dt, t) {
      try {
        if (!on()) { draw(t || 0); wildHide(); return; }
        var s = S(), fl = flying(), busy = io.busy();
        var flapNow = s.flapT || 0; if (fl && !busy && flapNow > flapWas + 0.1) { put(v() - C.FLAP); st.flaps++; } flapWas = flapNow;
        var P = io.me(), mv = px == null || !(dt > 0) ? 0 : Math.hypot(P.x - px, P.z - pz) / dt; px = P.x; pz = P.z;
        var o = { mode: s.mode, still: mv < 0.4, hold: !!s.hold, hover: (s.hoverK || 0) > 0.5, pitch: s.pitch || 0, dive: (s.pitch || 0) < -0.35, flut: (s.flutT || 0) > 0,
          ff: io.ff(), travel: io.travel(), inside: !!(s.inside || s.insideTH), busy: busy || !!s.talking || s.mode === 'paused' || s.mode === 'menu' || s.mode === 'event' };
        var r = plant === 'nodrain' ? 0 : rate(o); if (r < 0 && io.wx) { var wk = 1; try { wk = +io.wx() || 1; } catch (e) { wk = 1; } r *= clamp(wk, 0.5, 2); }   /* 805 piece 2: the weather's share of a flight's cost (headwind, wet wings); it only scales a drain, so the hearts' own rule (KEEP) still guards her last */
        lastRate = r; var x0 = v();
        var half = MX() * C.REST_TO;   /* resting fills her only to half, slowly: fruit and bread are the real refill */
        if (r < 0) { put(x0 + r * dt); st.drained += -r * dt; } else if (r > 0 && x0 < half) { var x1 = Math.min(half, x0 + r * dt); put(x1); st.rested += x1 - x0; if (x1 >= half && x0 < half && !st.restSaid) { st.restSaid = true; toast(WORDS.rested, 3200); } }
        if (x0 < half - 10) st.restSaid = false;
        var x = v();
        if (x > C.WARN + 5) tired = false;
        if (fl && !o.busy && x <= C.WARN && x > 0 && !tired) { tired = true; st.warned++; toast(WORDS.tiring, 4200); }
        if (fl && !o.busy && x <= 0) {
          if (emptyT === 0) { st.empties++; toast(WORDS.empty, 5200); }
          emptyT += dt;
          if (emptyT >= C.GRACE) { costT -= dt; if (costT <= 0) { costT = C.EVERY; var h = io.halves();   /* the first half at GRACE, then one every EVERY s */
              if (h != null && h > C.KEEP) { io.setHalves(h - 1); st.costs++; toast(WORDS.cost, 3200); io.save(); } else if (h != null && !st.lastSaid) { st.lastSaid = true; toast(WORDS.last, 4200); } } }
        } else if (!fl) { emptyT = 0; costT = 0; st.lastSaid = false; }
        saveT += dt; if (saveT >= C.SAVE_S && rec(false)) { saveT = 0; io.save(); }
        wildTick(dt); spotTick(dt); draw(t || 0);
      } catch (e) { err = 'tick: ' + (e && e.message || e); }
    }
    function peek() { var r = rec(false); return { err: err, on: on(), v: +v().toFixed(2), rec: r ? { v: +r.v.toFixed(2), ate: r.ate } : null, rate: +lastRate.toFixed(3), emptyT: +emptyT.toFixed(2), costT: +costT.toFixed(2), tired: tired, plant: plant,
      stat: Object.assign({}, st), C: C, max: MX(), pop: { on: popT >= 0, text: popEl.textContent, col: popEl.style.color, rect: popEl.getBoundingClientRect().toJSON() }, spots: SPOT.map(function (q) { return { on: q.s.visible, at: [+q.x.toFixed(1), +q.y.toFixed(1), +q.z.toFixed(1)], back: +q.back.toFixed(1) }; }), bar: { hung: !!hung, hidden: bar.hidden, w: fill.style.width, col: fill.style.background, left: bar.style.left, rect: bar.getBoundingClientRect().toJSON() },
      wild: POOL.filter(function (f) { return f.on; }).map(function (f) { return { e: SETS[f.set].e, x: +f.x.toFixed(2), y: +f.y.toFixed(2), z: +f.z.toFixed(2), key: f.key }; }), pool: POOL.length,
      glim: GL.map(function (g) { return { on: g.visible, at: [+g.position.x.toFixed(2), +g.position.y.toFixed(2), +g.position.z.toFixed(2)], s: +g.scale.x.toFixed(2), halo: g.userData.halo ? +(g.userData.halo.scale.x * g.scale.x).toFixed(2) : null, beamH: g.userData.beamH ? +g.userData.beamH.toFixed(1) : null, beamW: +(0.32 * C.GL_SIZE * C.GL_BEAM_W * g.scale.x).toFixed(2) }; }) }; }
    function bench(q) { q = q || {}; if ('plant' in q) plant = q.plant || null; if (typeof q.v === 'number') { put(q.v); if (q.v > 0) { emptyT = 0; costT = 0; } } if (q.empty) { emptyT = q.empty; } if (q.scan) { scanT = 0; } return peek(); }
    return { tick: tick, hungry: hungry, eatFruit: eatFruit, bread: bread, peek: peek, bench: bench, v: v, glimmer: glimmer };
  }
  return { C: C, WORDS: WORDS, SETS: SETS, rate: rate, reach: reach, setOf: setOf, create: create };
}());
