/* interact790.js - BOARD 790 PART C, INTERACT WITH ALL OF IT (Wings for Rouge). Ship #139/#140, Nov 13 2026. Every word and number a DRAFT for Marth's pen.
   Marth, Nov 13 2026, verbatim: "Can interact with all living things and many inanimate objects. Moving or stationary."
   The bar: Yegor Sak's COO (perch on a traffic camera and see its live feed; ride the streetcar; pigeons that lift as you come).

   WHAT ROUGE CAN DO, ON THE HOME ISLAND (today) AND OUT IN THE WORLD (as the builders' agents land):
     PERCH     the tops of the signposts, the village's flagpole, bell post and watch-camera pole are landing places (Land sets her down on them, the way it
               does on a roof); a perch DOES something the moment she settles: a FACT (a sign: a true thing about birds), a VIEW (the flagpole, the roofs,
               the lighthouse: the camera lifts and names the place), a FEED (the camera pole: its live picture in a corner, what it watches), a REST (the bell
               post: she catches her breath, the chick's mood lifts a little). A first perch of each kind pays a little XP.
     PECK      by the bell, the bin and the flag the action button names the thing: Ring (it swings and rings), Tip (the bin rocks over and crumbs spill;
               she pecks them up), Tug (the flag runs up its pole and flies). They set themselves right again after a while.
     PEOPLE    the villagers (and, out there, the world's people) notice her: flying low over them they look up and say so; landing by them, now and then one
               tosses a crumb; diving fast past them, they flinch. A short line in a bubble over the head, never two at once, never the same person twice
               in a minute.
     FLOCKS    a flock of pigeons on the village green lifts and scatters when she comes near and settles again; if she flies along with them while they
               are up, they take her as one of them and FOLLOW her for a while (out there: the gulls and pigeons of world-life790.js scatter by their own
               code; flying with a flock is counted the same way).
     RIDE      out there, anything that offers a seat (a bus, a streetcar, a train, a boat: world-life790.js handles with seat()) and any perch another
               module registers: flying close, the action button reads Ride (or Perch); she sits on its roof and goes where it goes; Flap hops her off.

   THE HOOK API (for #137 world-features / world-city790 and #138 world-people / world-life790 / world-traffic, who never need to edit this file):
     WFR_INTERACT790.provider(name, fn)   fn(x, z, r) -> handles near the frame point: { id, kind, what, where() -> {x, y, z, yaw?}, startle?(x, z),
                                          rideable?, seat?() -> {x, y, z, yaw}, perch?: 'fact'|'view'|'feed'|'rest', line?, fact?, look?() -> {x, y, z} }
     WFR_INTERACT790.perch(o)             a stationary perch on the home island: { id, kind, x, y (its top), z, r, does, text, look }
     WFR_INTERACT790.thing(o)             a peckable thing: { id, kind, x, y, z, r, verb, react(t) }
   Built in: world-life790.js (near(x, z, r)) and world-people.js (each()) are read if present; nothing else is assumed.

   THE PAGE HANDS IT (one line each): create(ctx) once at the end of the script; tick(dt, real) from both frames; top(x, z) inside groundAt (the perch tops);
   spots() into landSpots (Land's aim); rideFrame(dt) in the travel zone's flight (true while riding); riding()/hopOff() from Flap. Standard only (Classic frozen). */
window.WFR_INTERACT790 = (function () {
  'use strict';
  var C = { BTN_R: 2.2, BTN_HIDE: 3.2, RIDE_R: 6, PEOPLE_R: 10, LOW: 7, SCAN: 0.25, LINE_T: 2.8, LINE_GAP: 3.5, PER_CD: 60, CRUMB_P: 0.35, FLINCH_V: 17,
    FLOCK_N: 7, FLOCK_R: 6.5, FOLLOW_R: 16, FOLLOW_T: 2.2, FOLLOW_DUR: 22, SETTLE: 14, FEED_W: 176, FEED_H: 120, FEED_EVERY: 0.2, XP_NEW: 4, RESET: 14 };
  var WORDS = {   /* DRAFT lines for his pen */
    look: ['Look, up there!', 'Hello, little bird!', 'There she goes!', 'Is that a cardinal?', 'Morning, Rouge!'],
    crumb: ['Here, have a crumb.', 'For you, little one.', 'Go on, take it.'],
    flinch: ['Whoa!', 'Easy there!', 'Ha, you scared me!'],
    world: ['Look, a bird!', 'Pretty bird!', 'Over there, look!', 'Where did she come from?'],
    worldCrumb: ['Here, birdie.', 'Want some bread?'],
    flock: 'The pigeons take you as one of their own.', flockWorld: 'You fly with the flock.',
    feed: '📷 Live', rest: 'You catch your breath up here. Your chick feels it too.', firstPerch: 'A new perch',
    ride: 'Hold on tight. Flap to hop off.', off: 'Off you hop.', crumbGot: 'A crumb!',
    facts: ['Cardinals do not migrate: they keep the same patch all year round.', 'A bird\'s bones are hollow, braced inside like a bridge: light and strong.',
      'Pigeons can find their way home from hundreds of kilometres away.', 'Gulls can drink sea water: a gland over each eye takes the salt out.',
      'Perching birds sleep standing: their toes lock round the branch.', 'A bird has no teeth: a stone-filled gizzard grinds its food.',
      'Some birds see colours we cannot: patterns on feathers glow in ultraviolet.', 'A feather is made of keratin, like your fingernails.'] };
  var X = null, T = null;
  var st = { inited: false, fault: null, t: 0, perches: [], things: [], providers: [], flock: null, scanT: 0, near: null, btn: null, btnFor: null, onPerch: null, perchSeen: {},
    lines: 0, lastLine: -9, saidBy: {}, bubbles: [], crumbs: [], crumbsGot: 0, scares: 0, follows: 0, worldFollows: 0, followT: 0, rides: 0, riding: null, rideCam: null, hops: 0,
    feed: null, feedT: 0, feedOn: false, feeds: 0, facts: 0, views: 0, rests: 0, rings: 0, tips: 0, tugs: 0, flinches: 0, looks: 0, crumbsTossed: 0, perchArrivals: 0, ms: [], events: [], fIdx: 0 };
  function ev(s) { st.events.push(s); if (st.events.length > 40) st.events.shift(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pick(a, k) { return a[Math.abs(k | 0) % a.length]; }
  function S() { return X.S; }
  function travel() { return !!(X.TR && X.TR.on); }

  /* ---------- the island's things (built once, ours: procedural, the house's flat colours) ---------- */
  function lam(c) { return new T.MeshLambertMaterial({ color: c }); }
  function spot(dx, dz) {   /* a free spot on land near the village green: the first of a spiral that is dry, flat enough and clear of houses and signs */
    var V = X.village, i, a, r, x, z;
    for (i = 0; i < 160; i++) { a = (dx * 7 + dz * 3 + i * 2.39996) ; r = 12 + (i % 40) * 0.6; x = V.x + dx + Math.cos(a) * r * 0.25; z = V.z + dz + Math.sin(a) * r * 0.25;
      if (X.free(x, z)) return { x: x, z: z }; }
    return { x: V.x + dx, z: V.z + dz };
  }
  function pole(x, z, h, col) { var g = new T.Group(), y = X.H(x, z); var p = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, h, 6), lam(col || 0x6b5a48)); p.position.y = h / 2; g.add(p); g.position.set(x, y - 0.05, z); X.scene.add(g); g.userData.y0 = y; return g; }
  function buildIsland() {
    var s, g, y, m;
    /* the flagpole: a VIEW perch (its finial), and Tug runs the flag up */
    s = spot(18, 12); g = pole(s.x, s.z, 6.2, 0xd9d4c8); y = g.userData.y0;
    var ball = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), lam(0xe8c25a)); ball.position.y = 6.3; g.add(ball);
    var flag = new T.Mesh(new T.PlaneGeometry(1.3, 0.8, 4, 1), new T.MeshLambertMaterial({ color: 0xc8314a, side: T.DoubleSide })); flag.position.set(0.68, 2.2, 0); g.add(flag);
    perch({ id: 'flagpole', kind: 'flagpole', x: s.x, y: y + 6.42, z: s.z, r: 0.4, does: 'view', text: 'The village from the flagpole' });
    thing({ id: 'flag', kind: 'flag', x: s.x, y: y, z: s.z, r: 1.7, verb: '🚩 Tug', g: g, flag: flag, k: 0, up: 0,
      react: function (o) { o.up = 1; o.t = 0; st.tugs++; X.sound('ding'); } , step: function (o, dt) { o.t = (o.t || 0) + dt; var want = o.up ? 5.2 : 2.2; o.k += (want - o.k) * Math.min(1, dt * 1.6); o.flag.position.y = o.k; var pos = o.flag.geometry.attributes.position, i; for (i = 0; i < pos.count; i++) { var u = pos.getX(i) + 0.65; pos.setZ(i, Math.sin(st.t * 6 + u * 4) * 0.12 * u); } pos.needsUpdate = true; if (o.up && o.t > C.RESET) o.up = 0; } });
    /* the bell post: a REST perch (its cap), and Ring swings the bell */
    s = spot(-16, 14); g = pole(s.x, s.z, 2.6, 0x7a5a3a); y = g.userData.y0;
    var arm = new T.Mesh(new T.BoxGeometry(0.9, 0.1, 0.12), lam(0x7a5a3a)); arm.position.set(0.35, 2.55, 0); g.add(arm);
    var cap = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.08, 8), lam(0x5d4630)); cap.position.y = 2.64; g.add(cap);
    var hang = new T.Group(); hang.position.set(0.7, 2.5, 0); g.add(hang);
    var bell = new T.Mesh(new T.CylinderGeometry(0.1, 0.24, 0.34, 10, 1, true), new T.MeshLambertMaterial({ color: 0xc9a440, side: T.DoubleSide })); bell.position.y = -0.2; hang.add(bell);
    perch({ id: 'bellpost', kind: 'post', x: s.x, y: y + 2.68, z: s.z, r: 0.3, does: 'rest' });
    thing({ id: 'bell', kind: 'bell', x: s.x, y: y, z: s.z, r: 1.7, verb: '🔔 Ring', hang: hang, sw: 0, swV: 0,
      react: function (o) { o.swV += 3.2; st.rings++; X.sound('bell'); }, step: function (o, dt) { o.swV += -o.sw * 30 * dt; o.swV *= Math.exp(-dt * 1.4); o.sw += o.swV * dt; o.hang.rotation.z = o.sw; } });
    /* the bin: Tip rocks it over, crumbs spill (she pecks them up), it rights itself */
    s = spot(-6, 22); y = X.H(s.x, s.z); g = new T.Group(); g.position.set(s.x, y, s.z); X.scene.add(g);
    var piv = new T.Group(); g.add(piv); m = new T.Mesh(new T.CylinderGeometry(0.28, 0.24, 0.7, 10), lam(0x4f6b4a)); m.position.y = 0.35; piv.add(m);
    var lid = new T.Mesh(new T.CylinderGeometry(0.31, 0.31, 0.06, 10), lam(0x3c5238)); lid.position.y = 0.73; piv.add(lid);
    thing({ id: 'bin', kind: 'bin', x: s.x, y: y, z: s.z, r: 1.6, verb: '🗑️ Tip', piv: piv, tip: 0, tipK: 0,
      react: function (o) { if (o.tip) return; o.tip = 1; o.t = 0; st.tips++; X.sound('thud'); var i; for (i = 0; i < 5; i++) crumb(o.x + 0.55 + Math.random() * 0.7, o.z + (Math.random() - 0.5) * 0.8, null); },
      step: function (o, dt) { o.t = (o.t || 0) + dt; if (o.tip && o.t > C.RESET) o.tip = 0; o.tipK += ((o.tip ? 1 : 0) - o.tipK) * Math.min(1, dt * (o.tip ? 7 : 1.5)); o.piv.rotation.z = -1.35 * o.tipK; o.piv.position.x = 0.32 * o.tipK; } });
    /* the watch camera on its pole: a FEED perch (it watches the green) */
    s = spot(10, -14); g = pole(s.x, s.z, 4.0, 0x55585e); y = g.userData.y0;
    var box = new T.Mesh(new T.BoxGeometry(0.34, 0.24, 0.5), lam(0xe9e6df)); box.position.set(0, 4.12, 0.1); g.add(box);
    var lens = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.1, 8), lam(0x1a1c22)); lens.rotation.x = Math.PI / 2; lens.position.set(0, 4.12, 0.38); g.add(lens);
    var V = X.village; g.rotation.y = Math.atan2(V.x - s.x, V.z - s.z);
    var fl = Math.hypot(V.x - s.x, V.z - s.z) || 1;   /* the feed's eye a little out in front of the lens, so the bird sitting on the box is never in her own picture */
    perch({ id: 'watchcam', kind: 'camera', x: s.x, y: y + 4.26, z: s.z, r: 0.32, does: 'feed', text: 'the village green', look: { x: V.x, y: X.H(V.x, V.z) + 1, z: V.z }, from: { x: s.x + (V.x - s.x) / fl * 0.9, y: y + 3.95, z: s.z + (V.z - s.z) / fl * 0.9 } });
    /* the signposts: FACT perches (the board's top edge) */
    (X.signs || []).forEach(function (sg, i) { perch({ id: 'sign:' + sg.id, kind: 'sign', x: sg.x, y: X.H(sg.x, sg.z) - 0.05 + 2.04, z: sg.z, r: 0.42, does: 'fact', text: null, fi: i }); });
    /* the pigeons on the green */
    buildFlock();
  }

  /* ---------- the registry ---------- */
  function perch(o) { o.r = o.r || 0.4; st.perches.push(o); return o; }
  function thing(o) { st.things.push(o); return o; }
  function provider(name, fn) { for (var i = 0; i < st.providers.length; i++) if (st.providers[i].name === name) { st.providers[i].fn = fn; return; } st.providers.push({ name: name, fn: fn }); }
  function top(x, z) {   /* inside groundAt: a perch's top under (x, z), or -Infinity (cheap: a few dozen circles) */
    if (!st.inited) return -Infinity; var best = -Infinity, P = st.perches;
    for (var i = 0; i < P.length; i++) { var p = P[i], dx = x - p.x, dz = z - p.z; if (dx * dx + dz * dz < p.r * p.r && p.y > best) best = p.y; }
    return best;
  }
  function spots() { return st.inited ? st.perches.map(function (p) { return { x: p.x, z: p.z, name: 'perch790:' + p.id }; }) : []; }

  /* ---------- the button (the game's own 'act' skin, above Read) ---------- */
  function btn() {
    if (st.btn) return st.btn; var s = document.createElement('style'); s.id = 'act790css';
    s.textContent = '#act790{right:calc(env(safe-area-inset-right,0px) + 136px);bottom:calc(env(safe-area-inset-bottom,0px) + 214px);top:auto;left:auto;min-width:60px;height:52px;padding:0 12px;line-height:normal;font-weight:800;white-space:nowrap}' +
      'html.cine781 #act790,html.lv781 #act790{display:none!important}#feed790{position:fixed;z-index:7;right:calc(env(safe-area-inset-right,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 120px);width:' + C.FEED_W + 'px;border-radius:12px;overflow:hidden;background:#111;box-shadow:0 6px 18px rgba(0,0,0,.4);border:2px solid #fff3d0}' +
      '#feed790 canvas{display:block;width:100%;height:auto}#feed790 b{position:absolute;left:6px;top:5px;font:800 11px system-ui,sans-serif;color:#fff;background:rgba(200,49,74,.92);padding:2px 6px;border-radius:8px}#feed790 i{position:absolute;left:6px;bottom:5px;font:600 11px system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #000}' +
      '.bub790{position:fixed;left:0;top:0;z-index:6;pointer-events:none;max-width:200px;padding:5px 9px;border-radius:12px;background:#fff8ec;color:#22314a;font:700 13px/1.25 system-ui,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.25);will-change:transform;white-space:normal}' +
      '.bub790:after{content:"";position:absolute;left:50%;bottom:-6px;margin-left:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fff8ec}';
    document.head.appendChild(s);
    var b = document.createElement('button'); b.className = 'act'; b.id = 'act790'; b.type = 'button'; b.hidden = true;
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); press(); });
    (document.getElementById('ui') || document.body).appendChild(b); st.btn = b; return b;
  }
  function setBtn(label, what) { var b = btn(); st.btnFor = label ? what : null; if (!label) { if (!b.hidden) b.hidden = true; return; } if (b.textContent !== label) b.textContent = label; if (b.hidden) b.hidden = false; }
  function press() {
    try { var w = st.btnFor; if (!w) return false;
      if (w.t === 'thing') { w.o.react(w.o); w.o.n = (w.o.n || 0) + 1; ev('peck ' + w.o.id); X.chirp(); return true; }
      if (w.t === 'ride') { return rideOn(w.h); }
    } catch (e) { st.fault = 'press: ' + (e && e.message || e); } return false;
  }

  /* ---------- perched: what a perch does ---------- */
  function perchTick(real) {
    var s = S(), on = null;
    if (!travel() && s.mode === 'walk' && !s.inside && !s.insideTH) for (var i = 0; i < st.perches.length; i++) { var p = st.perches[i], dx = s.pos.x - p.x, dz = s.pos.z - p.z; if (dx * dx + dz * dz < (p.r + 0.15) * (p.r + 0.15) && Math.abs(s.pos.y - X.standOf() - p.y) < 0.4) { on = p; break; } }
    if (on !== st.onPerch) { if (st.onPerch) leavePerch(st.onPerch); st.onPerch = on; if (on) arrive(on); }
    if (on && on.does === 'feed') feedTick(real, on);
  }
  function arrive(p) {
    st.perchArrivals++; ev('perch ' + p.id); var first = !st.perchSeen[p.kind]; st.perchSeen[p.kind] = 1;
    if (first) X.xp(C.XP_NEW, WORDS.firstPerch);
    if (p.does === 'fact') { st.facts++; X.toast('🪶 ' + WORDS.facts[st.fIdx++ % WORDS.facts.length], 4200); }
    else if (p.does === 'view') { st.views++; p.lift0 = S().camLift || 0; S().camLift = 3; X.toast('🔭 ' + (p.text || 'The view from up here'), 2600); }
    else if (p.does === 'rest') { st.rests++; X.rest(); X.toast('🪶 ' + WORDS.rest, 3000); }
    else if (p.does === 'feed') { st.feeds++; feedShow(p, true); }
  }
  function leavePerch(p) { if (p.does === 'view') S().camLift = p.lift0 || 0; if (p.does === 'feed') feedShow(p, false); }

  /* ---------- the feed: the camera's own picture, small, five times a second ---------- */
  function feedShow(p, on) {
    if (!on) { if (st.feed && st.feed.el) st.feed.el.hidden = true; st.feedOn = false; return; }
    var F = st.feed; if (!F) { F = st.feed = {}; F.rt = new T.WebGLRenderTarget(C.FEED_W, C.FEED_H); F.cam = new T.PerspectiveCamera(58, C.FEED_W / C.FEED_H, 0.3, 900); F.px = new Uint8Array(C.FEED_W * C.FEED_H * 4);
      var el = document.createElement('div'); el.id = 'feed790'; el.style.cssText = 'position:fixed;z-index:7;right:calc(env(safe-area-inset-right,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 120px);left:auto;bottom:auto;width:' + C.FEED_W + 'px;height:auto;max-width:46vw;border-radius:12px;overflow:hidden;background:#111;box-shadow:0 6px 18px rgba(0,0,0,.4);border:2px solid #fff3d0';   /* inline: the page's own wide rules never stretch it */ el.innerHTML = '<canvas width="' + C.FEED_W + '" height="' + C.FEED_H + '" style="display:block;position:static;inset:auto;width:100%;height:auto;pointer-events:none"></canvas><b></b><i></i>'; document.body.appendChild(el); F.el = el; F.cv = el.querySelector('canvas'); F.ctx = F.cv.getContext('2d'); F.img = F.ctx.createImageData(C.FEED_W, C.FEED_H); }
    F.el.querySelector('b').textContent = WORDS.feed; F.el.querySelector('i').textContent = p.text || ''; F.el.hidden = false; st.feedOn = true; st.feedT = 0; F.p = p; F.frames = 0;
  }
  function feedTick(real, p) {
    var F = st.feed; if (!F || !st.feedOn) return; st.feedT -= real; if (st.feedT > 0) return; st.feedT = C.FEED_EVERY;
    var R = X.renderer, fr = p.from || p, lk = p.look || { x: p.x + 5, y: p.y - 2, z: p.z };
    try { F.cam.position.set(fr.x, fr.y, fr.z); F.cam.lookAt(lk.x, lk.y, lk.z); F.cam.layers.mask = X.camera.layers.mask; F.cam.updateMatrixWorld();
      var prev = R.getRenderTarget(); R.setRenderTarget(F.rt); R.render(X.scene, F.cam); R.readRenderTargetPixels(F.rt, 0, 0, C.FEED_W, C.FEED_H, F.px); R.setRenderTarget(prev);
      var d = F.img.data, W = C.FEED_W, H = C.FEED_H, y, rowA, rowB; for (y = 0; y < H; y++) { rowA = (H - 1 - y) * W * 4; rowB = y * W * 4; d.set(F.px.subarray(rowA, rowA + W * 4), rowB); }
      F.ctx.putImageData(F.img, 0, 0); F.frames++;
    } catch (e) { st.fault = 'feed: ' + (e && e.message || e); feedShow(p, false); }
  }

  /* ---------- crumbs (tossed by people, spilled by the bin): she pecks them up by walking into them ---------- */
  var crumbGeo = null, crumbMat = null;
  function crumb(x, z, y) { if (!crumbGeo) { crumbGeo = new T.SphereGeometry(0.06, 6, 4); crumbMat = lam(0xe8c27a); } var m = new T.Mesh(crumbGeo, crumbMat), g = y != null ? y : X.ground(x, z); m.position.set(x, g + 0.05, z); X.scene.add(m); st.crumbs.push({ m: m, t: 0 }); }
  function crumbTick(dt) {
    var s = S(); for (var i = st.crumbs.length - 1; i >= 0; i--) { var c = st.crumbs[i]; c.t += dt; var p = c.m.position, d = Math.hypot(p.x - s.pos.x, p.z - s.pos.z);
      if ((s.mode === 'walk' && d < 0.65 && Math.abs(p.y - (s.pos.y - X.standOf())) < 0.8) || c.t > 60) { if (c.t <= 60) { st.crumbsGot++; X.xp(1, WORDS.crumbGot); X.chirp(); } X.scene.remove(c.m); st.crumbs.splice(i, 1); } }
  }

  /* ---------- the pigeons on the green ---------- */
  function buildFlock() {
    var s = spot(2, 18), g = new T.Group(), y = X.H(s.x, s.z), F = { home: { x: s.x, y: y, z: s.z }, b: [], state: 'ground', t: 0, followT: 0, near: 0 };
    var body = new T.SphereGeometry(0.13, 7, 5), head = new T.SphereGeometry(0.07, 6, 4), wing = new T.PlaneGeometry(0.26, 0.12);
    var mb = lam(0x8a8f9a), mh = lam(0x5d6a78), mw = new T.MeshLambertMaterial({ color: 0x7a808c, side: T.DoubleSide });
    for (var i = 0; i < C.FLOCK_N; i++) { var b = new T.Group(), m = new T.Mesh(body, mb); m.scale.set(1, 0.85, 1.35); b.add(m); var h = new T.Mesh(head, mh); h.position.set(0, 0.1, 0.15); b.add(h);
      var wl = new T.Mesh(wing, mw), wr = new T.Mesh(wing, mw); wl.position.set(0.14, 0.04, 0); wr.position.set(-0.14, 0.04, 0); b.add(wl); b.add(wr);
      var a = i / C.FLOCK_N * Math.PI * 2, r = 0.8 + (i % 3) * 0.6; b.position.set(s.x + Math.cos(a) * r, y + 0.12, s.z + Math.sin(a) * r); g.add(b);
      F.b.push({ g: b, h: h, wl: wl, wr: wr, v: new T.Vector3(), ph: i * 1.7, peck: Math.random() * 3, off: new T.Vector3(Math.cos(a) * 1.4, (i % 3) * 0.5 - 0.3, Math.sin(a) * 1.4) }); }
    X.scene.add(g); F.g = g; st.flock = F;
  }
  function flockTick(dt) {
    var F = st.flock; if (!F) return; var s = S(), P = s.pos, i, b, d = Math.hypot(P.x - F.home.x, P.z - F.home.z), agl = P.y - X.ground(P.x, P.z), air = s.mode === 'fly' || s.mode === 'hover';
    F.t += dt; F.g.visible = !travel();
    if (travel()) return;
    if (F.state === 'ground') { if (d < C.FLOCK_R + (air ? 3 : 0) && agl < 12 && (s.mode === 'walk' || air)) { F.state = 'up'; F.t = 0; st.scares++; ev('scare'); X.sound('flutter'); for (i = 0; i < F.b.length; i++) { b = F.b[i]; var a = Math.atan2(b.g.position.z - P.z, b.g.position.x - P.x) + (Math.random() - 0.5) * 0.8; b.v.set(Math.cos(a) * 6, 5 + Math.random() * 2, Math.sin(a) * 6); } } }
    else if (F.state === 'up') {
      var cx = 0, cz = 0, cy = 0; for (i = 0; i < F.b.length; i++) { cx += F.b[i].g.position.x; cy += F.b[i].g.position.y; cz += F.b[i].g.position.z; } cx /= F.b.length; cy /= F.b.length; cz /= F.b.length;
      var dn = Math.hypot(P.x - cx, P.y - cy, P.z - cz); F.near = dn;
      if (air && dn < C.FOLLOW_R) F.followT += dt; else F.followT = Math.max(0, F.followT - dt * 0.5);
      if (F.followT >= C.FOLLOW_T) { F.state = 'follow'; F.t = 0; st.follows++; ev('follow'); X.toast('🕊️ ' + WORDS.flock, 3000); X.xp(3, 'flying with the pigeons'); }
      else if (F.t > C.SETTLE) F.state = 'settle';
      for (i = 0; i < F.b.length; i++) { b = F.b[i]; var w = F.home.y + 9 + b.off.y * 2; b.v.y += (w - b.g.position.y) * 0.6 * dt; var tx = F.home.x + Math.cos(F.t * 0.5 + b.ph) * 14, tz = F.home.z + Math.sin(F.t * 0.5 + b.ph) * 14;
        b.v.x += ((tx - b.g.position.x) * 0.5 - b.v.x) * Math.min(1, dt * 0.8); b.v.z += ((tz - b.g.position.z) * 0.5 - b.v.z) * Math.min(1, dt * 0.8); b.v.multiplyScalar(Math.exp(-dt * 0.3)); b.g.position.addScaledVector(b.v, dt); } }
    else if (F.state === 'follow') {
      var fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
      for (i = 0; i < F.b.length; i++) { b = F.b[i]; var px = P.x - fx * (3 + (i % 3) * 1.2) + b.off.x * 1.3, pz = P.z - fz * (3 + (i % 3) * 1.2) + b.off.z * 1.3, py = P.y + b.off.y;
        b.v.set(px - b.g.position.x, py - b.g.position.y, pz - b.g.position.z).multiplyScalar(Math.min(1, dt * 2.2) / Math.max(dt, 1e-3)); b.g.position.addScaledVector(b.v, dt); }
      if (F.t > C.FOLLOW_DUR || !air || d > 400) { F.state = 'settle'; F.t = 0; } }
    else if (F.state === 'settle') {
      var done = 0; for (i = 0; i < F.b.length; i++) { b = F.b[i]; var a2 = i / F.b.length * Math.PI * 2, r2 = 0.8 + (i % 3) * 0.6, gx = F.home.x + Math.cos(a2) * r2, gz = F.home.z + Math.sin(a2) * r2, gy = F.home.y + 0.12;
        var dx = gx - b.g.position.x, dy = gy - b.g.position.y, dz = gz - b.g.position.z, L = Math.hypot(dx, dy, dz); if (L < 0.15) { b.g.position.set(gx, gy, gz); b.v.set(0, 0, 0); done++; continue; }
        var sp = Math.min(L / Math.max(dt, 1e-3), 7); b.v.set(dx / L * sp, dy / L * sp, dz / L * sp); b.g.position.addScaledVector(b.v, dt); }
      if (done === F.b.length && d > C.FLOCK_R + 4) { F.state = 'ground'; F.t = 0; } }
    for (i = 0; i < F.b.length; i++) { b = F.b[i]; var flying = F.state !== 'ground' && b.v.lengthSq() > 0.04;
      if (flying) { b.g.rotation.y = Math.atan2(b.v.x, b.v.z); var fl = Math.sin(st.t * 22 + b.ph) * 0.9; b.wl.rotation.z = fl; b.wr.rotation.z = -fl; b.h.position.y = 0.1; }
      else { b.wl.rotation.z = -0.2; b.wr.rotation.z = 0.2; b.peck -= dt; var pk = b.peck < 0.25 && b.peck > 0 ? 1 : 0; if (b.peck < 0) b.peck = 1.5 + Math.random() * 2.5; b.h.position.y = 0.1 - pk * 0.1; b.g.rotation.y += Math.sin(st.t * 0.7 + b.ph) * 0.004; } }
  }

  /* ---------- people: they notice her ---------- */
  function bubbleEl() { var i; for (i = 0; i < st.bubbles.length; i++) if (!st.bubbles[i].on) return st.bubbles[i]; if (st.bubbles.length >= 3) return null; var el = document.createElement('div'); el.className = 'bub790'; el.hidden = true; document.body.appendChild(el); var o = { el: el, on: false }; st.bubbles.push(o); return o; }
  function say(key, text, where, head, startle) {   /* where(): the person's feet now (frame metres); one bubble per person, never the same person within PER_CD (a startle: a flinch is a reflex, 1.5 s apart) */
    var s = S(); if (st.t - st.lastLine < (startle ? 1.5 : C.LINE_GAP) || (!startle && st.saidBy[key] && st.t - st.saidBy[key] < C.PER_CD) || s.talking) return false;
    var b = bubbleEl(); if (!b) return false; b.on = true; b.t = 0; b.where = where; b.head = head || 1.9; b.el.textContent = text; b.el.hidden = false; st.saidBy[key] = st.t; st.lastLine = st.t; st.lines++; ev('line ' + key + ': ' + text); return true;
  }
  var PV = null;
  function bubbleTick(dt) {
    if (!PV) PV = new T.Vector3(); var w = innerWidth, h = innerHeight;
    for (var i = 0; i < st.bubbles.length; i++) { var b = st.bubbles[i]; if (!b.on) continue; b.t += dt; var p = null; try { p = b.where(); } catch (e) { p = null; }
      if (!p || b.t > C.LINE_T) { b.on = false; b.el.hidden = true; continue; }
      PV.set(p.x, p.y + b.head, p.z).project(X.camera); if (PV.z > 1 || Math.abs(PV.x) > 1.02 || PV.y < -0.85 || PV.y > 1.02 || S().inside || S().insideTH) { b.el.style.opacity = '0'; continue; }
      b.el.style.opacity = '1'; b.el.style.transform = 'translate(' + clamp((PV.x + 1) / 2 * w, 60, w - 60).toFixed(0) + 'px,' + clamp((1 - PV.y) / 2 * h, 90, h - 160).toFixed(0) + 'px) translate(-50%,-100%)'; }
  }
  function peopleScan() {
    var s = S(), P = s.pos, air = s.mode === 'fly' || s.mode === 'hover', agl = P.y - X.ground(P.x, P.z), fast = air && s.speed > C.FLINCH_V && s.pitch < -0.2, k = Math.floor(st.t * 7);
    if (s.inside || s.insideTH || s.talking) return;
    if (!travel()) {
      var N = X.npcs ? X.npcs() : [], i, best = null, bd = 1e9;
      for (i = 0; i < N.length; i++) { var n = N[i]; if (!n || !n.g || !n.g.visible || n.state === 'inside' || n.hog) continue; var q = n.g.position, d = Math.hypot(q.x - P.x, q.z - P.z); if (d < bd) { bd = d; best = n; } }
      if (best) { var nm = best; var where = function () { return nm.g.position; }, key = 'v' + N.indexOf(best);
        if (fast && bd < 5) { if (say(key, '😮 ' + pick(WORDS.flinch, k), where, null, true)) { st.flinches++; X.npcFlinch && X.npcFlinch(best); } }
        else if (air && agl < C.LOW && bd < 6) { if (say(key, '👀 ' + pick(WORDS.look, k), where)) { st.looks++; X.npcLook && X.npcLook(best); } }
        else if (s.mode === 'walk' && bd < 3.5 && bd > 1.0 && Math.random() < C.CRUMB_P) { if (say(key, '🍞 ' + pick(WORDS.crumb, k), where)) { st.crumbsTossed++; var cx = P.x + (best.g.position.x - P.x) * 0.45, cz = P.z + (best.g.position.z - P.z) * 0.45; crumb(cx, cz, null); } }
        else if (s.mode === 'walk' && bd < 3.5) st.saidBy[key] = st.saidBy[key] || -99; }
      return;
    }
    /* out there: the world's people (world-people.js) and life790's walkers */
    var W = window.WFR_PEOPLE724, bx = null, bdd = 1e9, bid = null;
    if (W && W.each) W.each(function (id, wx, wy, wz) { var d = Math.hypot(wx - P.x, wz - P.z); if (d < bdd) { bdd = d; bid = id; bx = { x: wx, y: wy, z: wz }; } });
    var hs = handlesNear(P.x, P.z, C.PEOPLE_R), hp = null; for (var j = 0; j < hs.length; j++) { var hk = hs[j].what || hs[j].kind; if (hk === 'person' || hk === 'people' || hk === 'walker' || hk === 'jogger' || hk === 'busker' || hk === 'sitter') { hp = hs[j]; break; } }
    if (hp) { var hw = null; try { hw = hp.where(); } catch (e) { hw = null; } if (hw && Math.hypot(hw.x - P.x, hw.z - P.z) < bdd) { bdd = Math.hypot(hw.x - P.x, hw.z - P.z); bid = 'L' + hp.id; bx = hw; } else hp = null; }
    if (!bx || bdd > C.PEOPLE_R) return; var H0 = hp, fixed = bx, where2 = H0 ? function () { return H0.where(); } : function () { return W && W.locate ? (W.locate(bid, {}) || fixed) : fixed; };
    if (fast && bdd < 6) { if (say(bid, '😮 ' + pick(WORDS.flinch, k), where2, null, true)) { st.flinches++; if (H0 && H0.startle) try { H0.startle(P.x, P.z); } catch (e) { /* theirs */ } } }
    else if (air && agl < C.LOW && bdd < 7) { if (say(bid, '👀 ' + pick(WORDS.world, k), where2)) st.looks++; }
    else if (!air && bdd < 3.5 && Math.random() < C.CRUMB_P) { if (say(bid, '🍞 ' + pick(WORDS.worldCrumb, k), where2)) st.crumbsTossed++; }
  }

  /* ---------- the providers (the builders' agents) ---------- */
  function handlesNear(x, z, r) {
    var out = [], i; for (i = 0; i < st.providers.length; i++) { try { var a = st.providers[i].fn(x, z, r) || []; for (var k = 0; k < a.length; k++) out.push(a[k]); } catch (e) { st.provFault = st.providers[i].name + ': ' + (e && e.message || e); } }
    return out;
  }
  function builtIns() {
    provider('life790', function (x, z, r) { var L = window.WFR_LIFE790; return L && L.near ? L.near(x, z, r) : []; });
  }

  /* ---------- rides (and world perches): a seat that she sits on, wherever it goes ---------- */
  function rideOn(h) {
    var s = S(); if (st.riding || !h || !h.seat) return false; var q = h.seat(); if (!q) return false;
    st.riding = { h: h, id: h.id, kind: h.what || h.kind, t: 0, perch: !!h.perch, last: { x: q.x, y: q.y, z: q.z, yaw: q.yaw || s.yaw } }; st.rides++; ev('ride ' + h.id);
    s.speed = 0; s.pitch = 0; s.hold = false; X.chirp(); X.toast((h.perch ? '🪶 ' : '🚌 ') + (h.perch ? (h.line || 'Perched.') : WORDS.ride), 2400); setBtn(null);
    if (h.perch === 'feed') feedShow({ from: q, look: h.look ? h.look() : null, text: h.line || '' }, true);
    else if (h.perch === 'fact') X.toast('🪶 ' + (h.fact || WORDS.facts[st.fIdx++ % WORDS.facts.length]), 4200);
    return true;
  }
  function riding() { return !!st.riding; }
  function hopOff() {
    var R = st.riding; if (!R) return false; st.riding = null; st.hops++; ev('hop ' + R.id); var s = S(); s.mode = 'fly'; s.speed = 9; s.pitch = 0.35; s.flapT = 0.4; s.pos.y += 0.6; feedShow(null, false); X.toast(WORDS.off, 1400); X.chirp(); return true;
  }
  function rideFrame(dt) {   /* the travel zone's flight branch, while she rides: on the seat, wings folded, the camera trailing the seat */
    var R = st.riding; if (!R) return false; var s = S(), q = null; try { q = R.h.seat(); } catch (e) { q = null; }
    if (!q) { hopOff(); return false; } R.t += dt; R.last = q;
    s.pos.set(q.x, q.y + X.standOf(), q.z); if (q.yaw != null) s.yaw = q.yaw; s.speed = 0; s.pitch = 0; s.yawV = 0;
    var b = X.bird(); if (b) { b.position.copy(s.pos); b.rotation.set(0, s.yaw, 0); }
    var cam = X.camera, fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), sz = X.size(); if (!st.rideCam) st.rideCam = new T.Vector3();
    st.rideCam.set(s.pos.x - fx * (4 + 5 * sz), s.pos.y + 1.6 + 2 * sz, s.pos.z - fz * (4 + 5 * sz)); cam.position.lerp(st.rideCam, Math.min(1, dt * 3)); cam.lookAt(s.pos.x + fx * 2, s.pos.y + 0.4, s.pos.z + fz * 2);
    if (X.TR.camOff) X.TR.camOff.copy(cam.position).sub(s.pos);
    if (R.h.perch === 'feed' && st.feed) feedTick(dt, st.feed.p);
    return true;
  }
  function worldTick(dt) {   /* out there: the button for a seat or a world perch near her, the flocks she flies with */
    var s = S(), P = s.pos; if (st.riding) { setBtn(null); return; }
    if (s.mode !== 'fly') { if (st.btnFor && st.btnFor.t === 'ride') setBtn(null); return; }
    var hs = handlesNear(P.x, P.z, C.RIDE_R + 4), best = null, bd = 1e9, i;
    for (i = 0; i < hs.length; i++) { var h = hs[i]; if (!(h.rideable || h.perch) || !h.seat) continue; var q = null; try { q = h.seat(); } catch (e) { q = null; } if (!q) continue; var d = Math.hypot(q.x - P.x, q.y - P.y, q.z - P.z); if (d < bd) { bd = d; best = h; } }
    var keep = st.btnFor && st.btnFor.t === 'ride' && best && st.btnFor.h.id === best.id && bd < C.RIDE_R + 2;
    if (best && (bd < C.RIDE_R || keep)) { var w = best.what || best.kind || ''; setBtn(best.perch ? '🪶 Perch' : (/tram|streetcar/.test(w) ? '🚋 Ride' : /train/.test(w) ? '🚆 Ride' : /bus/.test(w) ? '🚌 Ride' : /boat|ferry|sail|motor|river/.test(w) ? '⛵ Ride' : '🛞 Ride'), { t: 'ride', h: best }); }
    else if (st.btnFor && st.btnFor.t === 'ride') setBtn(null);
    /* a flock out there: flying with one for FOLLOW_T s counts */
    var L = window.WFR_LIFE790, fl = L && L.flocksNear ? L.flocksNear(C.FOLLOW_R) : []; if (fl.length && fl[0].state !== 'ground' && fl[0].state !== 'sit') { st.followT += dt; if (st.followT >= C.FOLLOW_T && !st.flockSaid) { st.flockSaid = true; st.worldFollows++; X.toast('🕊️ ' + WORDS.flockWorld, 2600); X.xp(2, 'flying with a flock'); } } else { st.followT = 0; st.flockSaid = false; }
  }

  /* ---------- the island's button ---------- */
  function islandBtn() {
    var s = S(), P = s.pos; if (s.mode !== 'walk' || s.inside || s.insideTH || s.talking) { if (st.btnFor && st.btnFor.t === 'thing') setBtn(null); return; }
    var best = null, bd = 1e9; for (var i = 0; i < st.things.length; i++) { var o = st.things[i], d = Math.hypot(P.x - o.x, P.z - o.z); if (d < bd) { bd = d; best = o; } }
    var keep = st.btnFor && st.btnFor.t === 'thing' && st.btnFor.o === best && bd < C.BTN_HIDE;
    if (best && (bd < C.BTN_R || keep) && Math.abs(P.y - X.standOf() - best.y) < 1.2) setBtn(best.verb, { t: 'thing', o: best }); else if (st.btnFor && st.btnFor.t === 'thing') setBtn(null);
  }

  /* ---------- the frame ---------- */
  function tick(dt, real) {
    if (!st.inited) return; var t0 = performance.now();
    try {
      var s = S(); if (s.mode === 'paused' || s.mode === 'menu') { if (st.btn && !st.btn.hidden) st.btn.hidden = true; return; }
      st.t += dt; for (var i = 0; i < st.things.length; i++) if (st.things[i].step) st.things[i].step(st.things[i], dt);
      if (travel()) { if (st.onPerch) { leavePerch(st.onPerch); st.onPerch = null; } worldTick(dt); }
      else { if (st.riding) hopOff(); perchTick(real || dt); islandBtn(); flockTick(dt); crumbTick(dt); }
      st.scanT -= dt; if (st.scanT <= 0) { st.scanT = C.SCAN; peopleScan(); }
      bubbleTick(real || dt);
    } catch (e) { st.fault = 'tick: ' + (e && e.message || e); }
    var ms = performance.now() - t0; st.ms.push(ms); if (st.ms.length > 600) st.ms.shift();
  }
  function create(ctx) {
    if (st.inited) return API; X = ctx; T = ctx.THREE;
    try { if (ctx.classic && ctx.classic()) { st.fault = 'classic: Standard only'; return null; } buildIsland(); builtIns(); btn(); st.inited = true; } catch (e) { st.fault = 'create: ' + (e && e.message || e); return null; }
    return API;
  }
  function peek() {
    var F = st.flock, ms = st.ms.slice().sort(function (a, b) { return a - b; });
    return { inited: st.inited, fault: st.fault, provFault: st.provFault || null, perches: st.perches.map(function (p) { return { id: p.id, kind: p.kind, does: p.does, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), r: p.r }; }),
      things: st.things.map(function (o) { return { id: o.id, kind: o.kind, verb: o.verb, x: +o.x.toFixed(2), y: +o.y.toFixed(2), z: +o.z.toFixed(2), n: o.n || 0, tip: o.tipK != null ? +o.tipK.toFixed(2) : null, sw: o.sw != null ? +o.sw.toFixed(3) : null, flagY: o.flag ? +o.flag.position.y.toFixed(2) : null }; }),
      onPerch: st.onPerch ? st.onPerch.id : null, btn: st.btn && !st.btn.hidden ? st.btn.textContent : null, flock: F ? { state: F.state, n: F.b.length, home: F.home, near: +(F.near || 0).toFixed(1), followT: +F.followT.toFixed(2), first: F.b[0].g.position.toArray().map(function (v) { return +v.toFixed(2); }) } : null,
      counts: { lines: st.lines, looks: st.looks, flinches: st.flinches, crumbsTossed: st.crumbsTossed, crumbsGot: st.crumbsGot, scares: st.scares, follows: st.follows, worldFollows: st.worldFollows, rides: st.rides, hops: st.hops, facts: st.facts, views: st.views, rests: st.rests, feeds: st.feeds, rings: st.rings, tips: st.tips, tugs: st.tugs, perchArrivals: st.perchArrivals },
      riding: st.riding ? { id: st.riding.id, kind: st.riding.kind, t: +st.riding.t.toFixed(2) } : null, feed: st.feed ? { on: st.feedOn, frames: st.feed.frames || 0 } : null, crumbs: st.crumbs.length,
      bubbles: st.bubbles.filter(function (b) { return b.on; }).map(function (b) { return b.el.textContent; }), providers: st.providers.map(function (p) { return p.name; }), events: st.events.slice(-12), ms: { n: ms.length, med: ms.length ? +ms[ms.length >> 1].toFixed(3) : null, max: ms.length ? +ms[ms.length - 1].toFixed(3) : null } };
  }
  var API = { C: C, WORDS: WORDS, create: create, tick: tick, top: top, spots: spots, perch: perch, thing: thing, provider: provider, press: press, riding: riding, hopOff: hopOff, rideFrame: rideFrame, peek: peek,
    feedPixels: function () { var F = st.feed; if (!F || !F.px) return null; var n = 0, sum = 0; for (var i = 0; i < F.px.length; i += 4 * 37) { sum += F.px[i] + F.px[i + 1] + F.px[i + 2]; n++; } return { mean: +(sum / n / 3).toFixed(1), frames: F.frames || 0 }; } };
  return API;
})();
