/* world725d-fast.js - BOARD 725d, FAST FLIGHT THAT IS STILL REAL (Marth, Nov 4 2026: "Use those 27 agents and BUild me the PLAYABLE FLYABLE WORLD";
   "prioritize accurate and vaast and submersive world building"; "i want this game to be ground breaking. real and submersive"). Plan:
   PLAN_725_THE_GLEASON_WORLD_2026-11-04.md 725d (Itachi). Trunks, Nov 4 2026. Wired by tools/wiring/wire-725d-fast.js; guard tests/fast725d.js.
   The world is vast, so crossing it must be fun, and it must stay TRUE flight (no white, no teleport: every frame she moves her speed x dt, no more):
     - THE HIGH BAND: a fourth knot on travel712's speed curve, 60 km at 18 km/s (log-even from 20 km at 6 km/s), and a 60 km ceiling in the travel
       zone (C.TOP_FAST). The page keys the speed to her height ABOVE THE GROUND there (Everest + 200 m flies like the sea + 200 m). The far plane and
       the haze are untouched: FAR_MAX stays 800 km (no depth past 800 km, no logarithmicDepthBuffer, no new shader program).
     - "FLY THERE": a place tapped on the world map gets a button; tapped, the map closes and her course is held for her: the great circle (725b's
       W.yawToward / W.flownKm when they exist, so the Gleason flip moves it), high and fast while the place is far, coming down as it nears (about
       20 s of the speed she needs, the Fly home rule), until she is within 1 km of it. It only ever moves HER STICK: any push of her own (over 0.35)
       takes the wind back at once; Fly home, leaving the world, a drop or a new place ends it too.
     - "DROP HERE" (Su 37 relaying Marth's reference, refs-1104/e5b16dd7.png: from the world map you zoom in, tap "Drop here", and you are standing in that
       city): the one deliberate door. A soft dusk fade (never the white), she is placed at the lat/lon in the travel zone by the page's door
       (fast725dPlace), held there while the ground under her streams in (5 s at most), shown 350 m over it, and glides down to about 60 m (her thumb
       takes it back at any moment). The travel zone has no surface to stand on yet (S5): she arrives flying low over the place.
   Nothing here draws in WebGL or allocates per frame; it never sets her position itself (the page's door does, for the drop only). Every number and
   every word is DRAFT for Marth. */
window.WFR_FAST725D = (function () {
  'use strict';
  var C = { TOP: 60000, VMAX: 18000, T_ARR: 20, ARRIVE_KM: 1, LOW: 300, BREAK: 0.35, SY: 0.6,
    DROP_AGL: 350, DROP_HOLD: 2000, GLIDE_TO: 60, GLIDE_END: 80, GLIDE_MAX: 40, FADE_IN: 260, FADE_OUT: 650, WAIT_MAX: 5000 };
  var WORDS = { fly: '✈ Fly there', drop: '⬇ Drop here', set: 'Flying to {p}. Steer any time to take the wind back.', took: 'You take the wind yourself.',
    here: 'You are over {p}.', dropped: '{p}', shut: 'The whole world opens after the climb.' };   // DRAFT words for Marth ("You take the wind yourself." is Fly home's own)
  var R = { on: false, to: null, name: '', enters: -1, sets: 0, arrivals: 0, breaks: 0, ends: {}, km: null, yaw: null, wantAgl: null, kmMin: null, maxY: 0, frames: 0 };
  var DR = { phase: null, to: null, name: '', t0: 0, tw: 0, drops: 0, reveals: 0, aborts: 0, last: null, glide: false, glideT: 0, waits: 0, err: null };
  var D = null;   // the page's door (fast725dPlace and its friends), handed over by door() at load
  var installed = false, sel = null, hooked = false, ui = null, veil = null, tries = 0;

  function install() {   // the high band onto travel712's own curve (idempotent): the knots are shared by speedAt and Fly home's height rule
    var L = window.WFR_TRAVEL712; if (!L || installed) return !!L; var K = L.C.KNOTS, last = K[K.length - 1];
    if (last[0] < C.TOP) K.push([C.TOP, C.VMAX]); L.C.TOP_FAST = C.TOP; installed = true; return true;
  }
  function W() { return window.WFR_WORLD; }
  function kmTo(a, b) { return W().flownKm(a, b); }      // 725b's one door (world712-frame.js): the km she FLIES (the disc's straight line once 725c flips)
  function yawTo(a, b) { return W().yawToward(a, b); }   // 725b's one door: the course from a (a lat/lon, required: the disc's north turns with it) to b
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function deg(v, p, n) { return Math.abs(v).toFixed(1) + '° ' + (v >= 0 ? p : n); }
  function nameOf(p) { return p.name ? String(p.name) : deg(p.lat, 'N', 'S') + ', ' + deg(p.lon, 'E', 'W'); }
  function say(t, p) { if (D && D.toast) try { D.toast(t.replace('{p}', p || R.name), 2600); } catch (e) { /* no toast */ } }

  /* the height above the ground that gives a speed (m/s at a bird's speed 1): travel712's knots inverted, log-even; under 1,800 m the island's climb
     speed (15 to 60 m/s) read as a straight line down to the route's lowest 300 m (only the last kilometre uses it) */
  function aglFor(v) {
    var K = window.WFR_TRAVEL712.C.KNOTS; if (v >= K[K.length - 1][1]) return K[K.length - 1][0];
    if (v <= K[0][1]) return C.LOW + (K[0][0] - C.LOW) * clamp((v - 15) / (K[0][1] - 15), 0, 1);
    for (var i = 1; i < K.length; i++) if (v <= K[i][1]) { var a = K[i - 1], b = K[i]; return a[0] + (b[0] - a[0]) * Math.log(v / a[1]) / Math.log(b[1] / a[1]); }
    return K[K.length - 1][0];
  }

  function set(p) {   // a route to a lat/lon (the map's selection); the travel zone only
    var T = D && D.T; if (!T || !T.on || !p || !isFinite(p.lat) || !isFinite(p.lon)) return false;
    glideOff(); R.on = true; R.to = { lat: p.lat, lon: p.lon }; R.name = nameOf(p); R.enters = T.enters; R.sets++; R.kmMin = null; R.maxY = 0; R.frames = 0;
    T.homeSteer = false; return true;
  }
  function end(why) { if (!R.on) return; R.on = false; R.ends[why] = (R.ends[why] || 0) + 1; }
  function glideOff() { DR.glide = false; }

  /* THE COURSE: called from the travel flight after her stick and Fly home are read. Returns the stick to use; never moves her. */
  function steer(T, bs, yaw, y, agl, sx, sy) {
    if (DR.phase === 'in' || DR.phase === 'wait') return { sx: 0, sy: 0, on: true };   // behind the drop's veil: held level while the ground streams in
    var pushed = Math.abs(sx) > C.BREAK || Math.abs(sy) > C.BREAK;
    if (DR.glide) {   // after a drop: down to about 60 m over the place, gently; her thumb takes it back
      DR.glideT += 1 / 60;
      if (pushed || !T.on) { glideOff(); if (pushed) { DR.last && (DR.last.broke = true); } }
      else if (agl < C.GLIDE_END || DR.glideT > C.GLIDE_MAX) glideOff();
      else return { sx: sx, sy: clamp((C.GLIDE_TO - agl) / 500, -0.45, 0.2), on: true };
    }
    if (!R.on) return { sx: sx, sy: sy, on: false };
    if (!T.on || T.enters !== R.enters) { end('left'); return { sx: sx, sy: sy, on: false }; }
    if (T.homeSteer) { end('home'); return { sx: sx, sy: sy, on: false }; }
    if (pushed) { end('stick'); R.breaks++; say(WORDS.took); return { sx: sx, sy: sy, on: false }; }   // her thumb, at once
    var ll = T.ll; if (!ll) return { sx: sx, sy: sy, on: true };
    var km = kmTo(ll, R.to); R.km = km; R.kmMin = R.kmMin == null ? km : Math.min(R.kmMin, km); R.maxY = Math.max(R.maxY, y); R.frames++;
    if (km < C.ARRIVE_KM) { end('arrived'); R.arrivals++; R.at = { lat: ll.lat, lon: ll.lon, km: km }; say(WORDS.here); return { sx: 0, sy: 0, on: false }; }
    var yw = yawTo(ll, R.to); R.yaw = yw;
    var want = aglFor(km * 1000 / C.T_ARR / Math.max(0.2, bs || 1)); R.wantAgl = want;   // about 20 s of the speed she needs (Fly home's rule), as a height
    var spd = window.WFR_TRAVEL712.speedAt(Math.max(1800, agl)) * (bs || 1);
    return { sx: clamp(-wrap(yw - yaw) * 2, -1, 1), sy: clamp((want - agl) / Math.max(1500, spd * 3), -C.SY, C.SY), on: true };   // the climb or the descent paced to about 3 s of her speed (no porpoising at 18 km/s)
  }

  /* DROP HERE: the soft veil, the page's door each frame while the ground streams in, the reveal over it, the glide */
  function veilEl() {
    if (veil) return veil; veil = document.createElement('div'); veil.id = 'veil725d'; veil.setAttribute('aria-hidden', 'true');
    veil.style.cssText = 'position:fixed;inset:0;z-index:60;pointer-events:none;opacity:0;transition:opacity ' + C.FADE_IN + 'ms ease;background:radial-gradient(ellipse at 50% 45%,#2a3a62 0%,#141c36 60%,#0b1024 100%)';   // dusk, never the white
    document.body.appendChild(veil); return veil;
  }
  function fade(on) { var v = veilEl(); v.style.transition = 'opacity ' + (on ? C.FADE_IN : C.FADE_OUT) + 'ms ease'; v.style.opacity = on ? '1' : '0'; }
  var DROP_OFF = true;   // Marth, Nov 5 2026: "just make it so u have to manually fly for now so it may take minutes" (Rouge was sent 8000 km): no Drop here until he says
  function drop(p) {
    if (DROP_OFF) return false;
    if (!D || DR.phase || !p || !isFinite(p.lat) || !isFinite(p.lon)) return false;
    if (!D.can()) { say(WORDS.shut); return false; }
    end('drop'); glideOff(); DR.to = { lat: p.lat, lon: p.lon }; DR.name = nameOf(p); DR.phase = 'in'; DR.t0 = performance.now(); DR.drops++; DR.err = null; DR.waits = 0;
    fade(true); try { D.close(); D.resume(); } catch (e) { DR.err = String(e && e.message || e); }
    requestAnimationFrame(dropTick); return true;
  }
  function dropTick() {
    var now = performance.now(), t = now - DR.t0;
    if (DR.phase === 'in') { if (t < C.FADE_IN) { requestAnimationFrame(dropTick); return; } DR.phase = 'wait'; DR.tw = now; }
    if (DR.phase === 'wait') {
      var g = D.ground(), r = D.place(DR.to.lat, DR.to.lon, g ? g.h + C.DROP_AGL : C.DROP_HOLD); DR.waits++;
      if (r === 'closed' || r === 'fault') { DR.phase = null; DR.aborts++; DR.err = r; fade(false); say(WORDS.shut); return; }
      g = D.ground(); var ready = r === 'ok' && g && !g.loading;
      if (!ready && now - DR.tw < C.WAIT_MAX) { requestAnimationFrame(dropTick); return; }
      if (!g) { requestAnimationFrame(dropTick); return; }   // the travel zone not yet open (the streamer's manifests still coming): the veil waits
      D.place(DR.to.lat, DR.to.lon, g.h + C.DROP_AGL);   // shown 350 m over the ground there
      DR.last = { lat: DR.to.lat, lon: DR.to.lon, name: DR.name, ground: g.h, y: g.h + C.DROP_AGL, loading: g.loading, waitMs: Math.round(now - DR.tw), waits: DR.waits };
      DR.reveals++; DR.phase = 'out'; DR.t0 = now; DR.glide = true; DR.glideT = 0; fade(false); say(WORDS.dropped, DR.name);
    }
    if (DR.phase === 'out') { if (now - DR.t0 < C.FADE_OUT) { requestAnimationFrame(dropTick); return; } DR.phase = null; }
  }

  /* THE HUD: each travel frame. The label and the arrow name the place while a route is on; the map's buttons follow what she tapped. */
  function hud(T, viewYaw) {
    install(); hook();
    if (R.on && T.on && T.ll) {
      var km = kmTo(T.ll, R.to), d = R.name + ' ' + Math.round(km).toLocaleString('en-US') + ' km', el = document.getElementById('dist'); if (el && el.textContent !== d) el.textContent = d;
      var ar = document.getElementById('arrowSvg'); if (ar) ar.style.transform = 'rotate(' + (-wrap(yawTo(T.ll, R.to) - viewYaw) * 180 / Math.PI).toFixed(1) + 'deg)';
    }
    vis();
  }
  function vis() {
    if (!ui) return; var any = !!(sel && sel.kind !== 'home'), fly = !!(any && D && D.T && D.T.on), dr = !DROP_OFF && !!(any && D && D.can());
    if (ui.fly.hidden === fly) ui.fly.hidden = !fly; if (ui.drop.hidden === dr) ui.drop.hidden = !dr; var row = fly || dr; if (ui.row.hidden === row) ui.row.hidden = !row;
  }
  function tap(b, fn) {   // a thumb's tap is its own down and up (705's rule: 615 cancels a second tap's click near any lift); a keyboard's Enter is the click
    var dn = null; b.addEventListener('pointerdown', function (e) { dn = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; });
    b.addEventListener('pointerup', function (e) { var d = dn; dn = null; if (!(d && d.id === e.pointerId && performance.now() - d.t < 800 && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 18)) return; e.preventDefault(); fn(); });
    b.addEventListener('pointercancel', function () { dn = null; }); b.addEventListener('click', function (e) { if (e.detail === 0) fn(); });
  }
  function hook() {   // the map's footer gets the two buttons; the map's canvas tells us what she tapped (read after the map's own pick)
    if (hooked) return true; var foot = document.getElementById('wmap712foot'), cv = document.getElementById('wmap712cv'); if (!foot || !cv || !window.WMAP712) return false; hooked = true;
    var row = document.createElement('span'); row.id = 'go725d'; row.hidden = true; row.style.cssText = 'display:flex;gap:8px;justify-content:center;margin:4px 0 2px';
    var mk = function (id, t) { var b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'ghost'; b.textContent = t; b.hidden = true; b.style.cssText = 'min-height:44px;padding:0 14px;font:800 14px/44px var(--body);touch-action:manipulation'; row.appendChild(b); return b; };
    ui = { row: row, fly: mk('fly725d', WORDS.fly), drop: mk('drop725d', WORDS.drop) };
    var sp = document.getElementById('wmap712sel'); foot.insertBefore(row, sp ? sp.nextSibling : foot.firstChild);
    cv.addEventListener('pointerup', function () { try { var s = window.WMAP712.state().sel; sel = s ? { name: s.name, lat: s.lat, lon: s.lon, kind: s.kind } : null; } catch (e) { sel = null; } vis(); });
    tap(ui.fly, function () { if (!sel || !set(sel)) return; say(WORDS.set); if (D) { D.close(); D.resume(); } });   // the map closes; from Pause, Go resumes her flight
    tap(ui.drop, function () { if (sel) drop(sel); });
    var mp = document.getElementById('map705'); if (mp) new MutationObserver(function () { if (!mp.hidden) vis(); }).observe(mp, { attributes: true, attributeFilter: ['hidden'] });
    return true;
  }
  function door(d) { D = d; install(); var again = function () { if (hook() || ++tries > 200) { vis(); return; } setTimeout(again, 400); }; again(); }   // the map's World tab arrives with an async script: looked for a few times a second until it is there

  install();
  return { C: C, WORDS: WORDS, install: install, aglFor: aglFor, steer: steer, hud: hud, set: set, end: end, drop: drop, door: door,
    veil: veilEl, fade: fade,   /* 751b: the reload's way back wears the same dusk */
    routeKm: function () { return R.on ? R.km : null; }, arrivals: function () { return R.arrivals; },   /* 757: read each frame by fast forward; state() would force a style read */
    state: function () { var v = veil ? +getComputedStyle(veil).opacity : 0; return { on: R.on, to: R.to, name: R.name, sets: R.sets, arrivals: R.arrivals, breaks: R.breaks, ends: Object.assign({}, R.ends), km: R.km, kmMin: R.kmMin, at: R.at || null, wantAgl: R.wantAgl, maxY: R.maxY, frames: R.frames,
      drop: { phase: DR.phase, drops: DR.drops, reveals: DR.reveals, aborts: DR.aborts, last: DR.last, glide: DR.glide, err: DR.err, veil: v }, ground: D && D.ground ? D.ground() : null,
      btn: { fly: !!(ui && !ui.fly.hidden), drop: !!(ui && !ui.drop.hidden) }, hooked: hooked, sel: sel, top: window.WFR_TRAVEL712 ? window.WFR_TRAVEL712.C.TOP_FAST : null, knots: window.WFR_TRAVEL712 ? window.WFR_TRAVEL712.C.KNOTS.map(function (k) { return k.slice(); }) : null }; },
    version: 1 };
})();
