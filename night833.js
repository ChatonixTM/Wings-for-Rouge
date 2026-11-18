/* night833.js - BOARD 833, NIGHT VISION OUT IN THE WORLD (Wings for Rouge). Nov 15 2026. Guard: tests/night833.js.
   Marth, Nov 15 2026, verbatim: "Night vision doesn't apply to the outside world.. as in when I press it, it does NOT locate any artifacts".
   WHY IT FOUND NOTHING OUT THERE: the island's Night Vision (663 V3, the page) marks what nvThings() lists: the island's items, twigs, materials, fruit,
   glow-caps, keepsakes, the huether. Out in the world (the travel zone) none of those are near her, and nothing of the world was ever on that list;
   and the camera out there draws only the travel layer (7), while the dark, the glows and their cores were made on layer 0 alone: so even a find in
   reach would have glowed where nobody could see it.
   WHAT THIS DOES (Standard only, the travel zone only; Classic is frozen and never makes it): it hands nvThings() the world's finds near her, and the
   island's own Night Vision does the rest exactly as at home (the same dark, the same soft-yellow glows and cores, the same sea-glass hue for the
   special ones, the same rest, length and look by her level, the Owl's always-on):
     - GOLD (things to pick up): the world's fruit on real trees (stamina832's own sprites), the place glimmers out there (missions788, Dunn's River),
       a lost thing a person asked her to find (world-quests' spot), and a piece of bread tossed to her (bread818), within NEAR metres;
     - SEA-GLASS (places she has not been): the landmark quests not yet done (world-quests: the ten, the Caribbean's, Shanghai to Tokyo, places790's big
       ones), the named places (places790: hand-written, Natural Earth, the street map's own names) and the great cities (arrive821) whose names are not
       yet in her ledger (ledger817), the nearest PLACES within a reach that grows with her height.
     The world has no chests and no lying runes (runes are a reward out there, never a pickup): nothing to mark for them.
   A glow out here is sized by its distance (it reads the same on her screen near or far), re-chosen once a second as she flies (and at once when the
   world re-centres under her), and tested against the real ground's hills (travel712H), not the island's.
   NAMES AND MARKS (833 follow-up, Nov 15 2026): under each world glow a short name (the place's for sea-glass, the thing's for gold: "Mango", "Bread"),
   small, kept clear of the play screen's cards and buttons by row 820's own box list (world-features.js hud833: the same cached read the town names
   use); a name that would sit under a button is nudged to the first clear spot round its glow (below, above, right, left, further down), else it waits.
   A tap on a glow (or its name) marks it with 826's markers: the mark she follows, its beam on the compass strip; when she gets there its name rises and
   her ledger (817) keeps it, and Night Vision no longer marks it. The names and their tap rings are DOM, made here at load (a pool of 24).
   COST: the anchors (plain Object3Ds: no geometry, no material, no program) are made here at load in one group; the page puts its dark, glows and
   their keepers on the travel layer at load. Nothing is added to the scene or compiled while she plays. Every word and number a DRAFT for his pen. */
window.WFR_NIGHT833 = (function () {
  'use strict';
  var C = { ANCHORS: 20, NEAR: 600, PLACE_R: 4000, PLACE_R_MAX: 15000, PLACE_AGL_K: 3, PLACES: 8, UP: 18, SIZE_K: 0.045, SIZE_MIN: 3.4, SIZE_MAX: 260, REPICK: 1 };
  var WORDS = { first: '🦉 Night Vision works out here too: gold glows are things to pick up, sea-glass glows are places you have not been yet. Tap one to mark it.',
    glimmer: 'Glimmer', bread: 'Bread', lost: 'Lost thing' };
  var L833 = { N: 24, PX: 11.5, GAP: 3, MARGIN: 4, RING: 44, TAP_MOVE: 18, TAP_MS: 700, FAR: 120 };   /* FAR: a name never further than this from its glow (px) */   /* the names: their pool, size (px), gap from the glow, the screen's margin; the tap ring (px) and what a tap is */
  var CSS833 = '#nv833{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6;overflow:hidden}' +
    '#nv833 .r{position:absolute;left:0;top:0;width:' + L833.RING + 'px;height:' + L833.RING + 'px;margin:-' + (L833.RING / 2) + 'px 0 0 -' + (L833.RING / 2) + 'px;border-radius:50%;pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent}' +
    '#nv833 .n{position:absolute;left:0;top:0;white-space:nowrap;pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;font:600 ' + L833.PX + 'px/1.2 var(--h7-body,system-ui,-apple-system,sans-serif);letter-spacing:.02em;' +
    'color:#fff3c4;text-shadow:0 1px 2px rgba(0,8,24,.9),0 0 6px rgba(0,8,24,.6)}#nv833 .n.sp{color:#c9fbe9}#nv833 [hidden]{display:none}';
  function create(io) {
    if (!io || !io.THREE || !io.scene) return null;
    var THREE = io.THREE, root = new THREE.Group(), A = [], i;
    root.name = 'night833:anchors'; io.scene.add(root);
    for (i = 0; i < C.ANCHORS; i++) { var a = new THREE.Object3D(); a.name = 'night833:a' + i; root.add(a); A.push(a); }
    var FRUIT = []; io.scene.children.forEach(function (o) { if (o.isSprite && o.name && o.name.indexOf('stam832:fruit:') === 0) FRUIT.push(o); });   /* stamina832's world fruit, made at load */
    var CITIES = null, st = { finds: 0, picks: 0, picked: null, at: -1e9, rec: -1, said: false, err: '' };
    function S() { return io.S(); }
    function on() { var T = io.T; return !!(T && T.on && T.f && T.ll) && !(io.classic && io.classic()); }
    function lower(s) { return String(s || '').toLowerCase(); }
    function visited() {   /* every place name already in her ledger (ledger817): a place she has been */
      var v = {}, s = S(), L = s && s.seen && s.seen.ledger817, p = L && L.p; if (p) for (var c in p) { var row = p[c]; if (Array.isArray(row)) for (var k = 0; k < row.length; k++) if (row[k]) v[lower(row[k][0])] = 1; } return v; }
    function cities() { if (CITIES) return CITIES; var c = null; try { c = io.cities ? io.cities() : null; } catch (e) { c = null; } if (c && c.length) CITIES = c; return c || []; }   /* arrive821's great cities, read once the world map's data is in */
    function dist(la1, lo1, la2, lo2) { var dx = (lo2 - lo1) * Math.cos((la1 + la2) / 2 * Math.PI / 180) * 111320, dy = (la2 - la1) * 110570; return Math.sqrt(dx * dx + dy * dy); }
    function entry(o, kind, sp, reach, label) { return { o: o, kind: kind, sp: sp, it: null, d: 0, lift: null, ro: 0, ws: true, reach: reach, label: label || '' }; }
    function fruitName(o) { var id = o.name.slice(14), S0 = window.WFR_STAM832 && WFR_STAM832.SETS, f = S0 ? S0.filter(function (x) { return x.id === id; })[0] : null, n = f ? f.name.replace(/^handful of /, '') : 'Fruit'; return n.charAt(0).toUpperCase() + n.slice(1); }
    function anchorAt(n, x, y, z, name, kind) { var a = A[n]; a.position.set(x, y, z); a.updateMatrixWorld(true); a.userData.n833 = name; a.userData.k833 = kind; return a; }
    /* the finds near her now, pushed onto L (nvThings' own list); the anchors are re-placed here, so a list is good until the next call */
    function finds(L) {
      if (!on()) return L; var s = S(), T = io.T, W = io.W, P = s.pos, n = 0, k;
      try {
        /* GOLD: the world's fruit (their own sprites), the place glimmers, a lost thing, a piece of bread */
        for (k = 0; k < FRUIT.length; k++) if (FRUIT[k].visible) L.push(entry(FRUIT[k], 'wildfruit', false, C.NEAR, fruitName(FRUIT[k])));
        var gl = io.glims ? io.glims() : []; for (k = 0; k < gl.length && n < C.ANCHORS; k++) { var g = gl[k]; L.push(entry(anchorAt(n++, g[0], g[1], g[2], 'glimmer', 'glimmer'), 'glimmer', false, C.NEAR, WORDS.glimmer)); }
        var lo = io.spots ? io.spots() : []; for (k = 0; k < lo.length && n < C.ANCHORS; k++) L.push(entry(anchorAt(n++, lo[k].x, lo[k].y + 0.4, lo[k].z, lo[k].e || 'lost', 'lost'), 'lost', false, C.NEAR, lo[k].n ? lo[k].n.charAt(0).toUpperCase() + lo[k].n.slice(1) : WORDS.lost));
        var br = io.bread ? io.bread() : []; for (k = 0; k < br.length && n < C.ANCHORS; k++) L.push(entry(anchorAt(n++, br[k][0], br[k][1] + 0.2, br[k][2], 'bread', 'bread'), 'bread', false, C.NEAR, WORDS.bread));
        /* SEA-GLASS: the places not yet hers, nearest first */
        var ll = T.ll, agl = Math.max(0, P.y - Math.max(0, io.H(P.x, P.z))), R = Math.min(C.PLACE_R_MAX, Math.max(C.PLACE_R, C.PLACE_AGL_K * agl)), seen = visited(), got = {}, cand = [];
        var add = function (name, kind, la, lo2, why) { var key = lower(name); if (kind === 'river' || kind === 'canal' || !key || seen[key] || got[key]) return; var d = dist(ll.lat, ll.lon, la, lo2); if (d > R) return; got[key] = 1; cand.push({ n: name, k: kind, la: la, lo: lo2, d: d, why: why }); };
        var LM = io.landmarks ? io.landmarks() : []; for (k = 0; k < LM.length; k++) { var m = LM[k]; if (!(io.lmDone && io.lmDone(m.id))) add(m.name, 'landmark', m.lat, m.lon, 'quest'); else got[lower(m.name)] = 1; }
        var PL = io.places ? io.places(ll.lat, ll.lon, R / 1000) : []; for (k = 0; k < PL.length; k++) add(PL[k].n, 'place', PL[k].la, PL[k].lo, PL[k].src);
        var CT = cities(); for (k = 0; k < CT.length; k++) { var c = CT[k]; if (Math.abs(c.lat - ll.lat) < 0.2) add(c.name, 'city', c.lat, c.lon, 'arrive821'); }
        cand.sort(function (x, y) { return x.d - y.d; });
        for (k = 0; k < cand.length && k < C.PLACES && n < C.ANCHORS; k++) { var q = cand[k], p = W.toLocal(T.f, q.la, q.lo), gy = Math.max(0, io.H(p.x, p.z)), an = anchorAt(n++, p.x, gy + C.UP, p.z, q.n, q.k);
          L.push(entry(an, q.k, true, R + 50, q.n)); }
        st.finds++; st.err = '';
      } catch (e) { st.err = String(e && e.message || e); }
      for (k = n; k < A.length; k++) A[k].userData.n833 = null;
      return L;
    }
    /* a glow's size out here: by its distance from the eye, so it reads the same on her screen near or far */
    function size(c) { var cam = io.camera.position, o = c.o.position, d = Math.sqrt((cam.x - o.x) * (cam.x - o.x) + (cam.y - o.y) * (cam.y - o.y) + (cam.z - o.z) * (cam.z - o.z)); return Math.min(C.SIZE_MAX, Math.max(C.SIZE_MIN, d * C.SIZE_K)); }
    /* nv3Tick asks: re-choose the glows now? (once a second as she flies; at once when the world re-centres) */
    function repick(t) { var T = io.T, r = T && T.recentres || 0; if (r !== st.rec || t - st.at >= C.REPICK) { st.rec = r; st.at = t; return true; } return false; }
    /* nvPick tells what it marked: the bench's record, and her first time out here a line saying what the colours mean */
    function picked(R, t) {
      st.picks++; st.at = t == null ? st.at : t; st.rec = io.T && io.T.recentres || 0;
      var ws = 0; for (var k = 0; k < R.length && k < 24; k++) if (R[k].ws) ws++; st.picked = ws;
      var s = S(); if (ws && !(s.seen && s.seen.nv833)) { s.seen = s.seen || {}; s.seen.nv833 = 1; try { io.save(); io.toast(WORDS.first, 4600); } catch (e) { /* the line waits */ } }
    }
    /* ---------- the names under the glows, and a tap that marks one (DOM, a pool made here at load) ---------- */
    var box = document.createElement('div'), css = document.createElement('style'), NM = [], V = new THREE.Vector3(), cx = null, wC = {}, nst = { drawn: 0, nudged: 0, held: 0, taps: 0, marks: 0, last: null };
    css.id = 'nv833css'; css.textContent = CSS833; document.head.appendChild(css); box.id = 'nv833'; box.setAttribute('aria-hidden', 'true'); box.hidden = true; document.body.appendChild(box);
    function tapOn(el, it) { var d = null; el.addEventListener('pointerdown', function (e) { d = { x: e.clientX, y: e.clientY, t: performance.now() }; e.stopPropagation(); });
      el.addEventListener('pointerup', function (e) { var q = d; d = null; e.stopPropagation(); if (!q || Math.hypot(e.clientX - q.x, e.clientY - q.y) > L833.TAP_MOVE || performance.now() - q.t > L833.TAP_MS) return; tap(el === it.r ? nearest(e.clientX, e.clientY, it) : it); });
      el.addEventListener('pointercancel', function () { d = null; }); el.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); }); }
    for (i = 0; i < L833.N; i++) { var it = { r: document.createElement('div'), n: document.createElement('div'), c: null, txt: '', sp: null, x: -1, y: -1, nx: -1, ny: -1 }; it.r.className = 'r'; it.n.className = 'n'; it.r.hidden = true; it.n.hidden = true; box.appendChild(it.r); box.appendChild(it.n); tapOn(it.r, it); tapOn(it.n, it); NM.push(it); }
    function nearest(x, y, it) { var b = it, bd = 1e9; for (var k = 0; k < NM.length; k++) { var o = NM[k]; if (!o.c || o.r.hidden) continue; var d = Math.hypot(o.sx - x, o.sy - y); if (d < bd) { bd = d; b = o; } } return b; }   /* rings that overlap (two finds close together, far off): the glow nearest the thumb */
    function textW(t) { var w = wC[t]; if (w != null) return w; if (!cx) cx = document.createElement('canvas').getContext('2d'); cx.font = '600 ' + L833.PX + 'px system-ui,-apple-system,sans-serif'; w = cx.measureText(t).width + t.length * L833.PX * 0.02 + 2; if (Object.keys(wC).length > 300) wC = {}; wC[t] = w; return w; }
    function hit(b, L) { for (var k = 0; k < L.length; k++) { var o = L[k]; if (o && b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return true; } return false; }
    /* where a name goes round its glow (sx, sy; r its glow's screen radius): the first spot clear of the screen's edge, the play screen's cards and buttons, and the names
       already placed; the first spot is under the glow; any other is a nudge. null: no clear spot (the name waits) */
    function spot(sx, sy, r, w, h, hud, put) {
      var g = L833.GAP, W0 = window.innerWidth, H0 = window.innerHeight, m = L833.MARGIN, rr = Math.min(r, 60), first = true;
      var ys = [sy + rr + g, sy - rr - g - h, sy - h / 2, sy + rr + g + h + 6, sy - rr - g - 2 * h - 6, sy + rr + g + 2 * (h + 6), sy - rr - g - 3 * h - 12];   /* under, over, level, then a row further each way */
      for (var j = 0; j < ys.length; j++) { var y = ys[j], level = j === 2;
        for (var k = 0; k <= 10; k++) { var dx = k === 0 ? 0 : (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 30, x = level ? (dx <= 0 ? sx - rr - g - w + dx : sx + rr + g + dx) : sx - w / 2 + dx, b = [x, y, x + w, y + h];   /* centred, then 30 px steps left and right (level: beside the glow) */
          if (x < m || y < m || x + w > W0 - m || y + h > H0 - m) { first = false; continue; } if (hit(b, hud) || hit(b, put)) { first = false; continue; }
          if (Math.hypot(x + w / 2 - sx, y + h / 2 - sy) > L833.FAR) { first = false; continue; } return { b: b, nudged: !first }; } }
      return null;
    }
    function hide() { if (!box.hidden) box.hidden = true; for (var k = 0; k < NM.length; k++) { NM[k].c = null; if (!NM[k].r.hidden) NM[k].r.hidden = true; if (!NM[k].n.hidden) NM[k].n.hidden = true; } nst.drawn = 0; }
    /* each frame Night Vision is on out in the world (nv3Tick, after its glows): a name under each glow shown, a tap ring on it */
    function draw(pool) {
      if (!on() || (io.covered && io.covered())) { hide(); return; }
      var cam = io.camera, W0 = window.innerWidth, H0 = window.innerHeight, hud = io.hud ? io.hud() || [] : [], used = 0, h = Math.round(L833.PX * 1.25), tap = !!(io.canMark && io.canMark()), R2 = L833.RING / 2, k, it;
      if (box.hidden) box.hidden = false;
      /* first every glow on screen and its tap ring; then the names, each clear of the buttons, of the names placed, and of every other glow's ring (so a tap lands on the glow it is on) */
      for (k = 0; k < pool.length && used < NM.length; k++) { var g = pool[k], c = g.userData.nv; if (!c || !c.ws || !g.visible || !c.label) continue;
        V.copy(g.position).project(cam); if (V.z > 1 || Math.abs(V.x) > 1 || Math.abs(V.y) > 1) continue;
        var sx = (V.x + 1) / 2 * W0, sy = (1 - V.y) / 2 * H0; V.copy(g.position).addScaledVector(io.right(), g.scale.x * 0.28).project(cam);
        it = NM[used++]; it.c = c; it.sx = sx; it.sy = sy; it.rr = Math.abs((V.x + 1) / 2 * W0 - sx); it.rb = [sx - R2, sy - R2, sx + R2, sy + R2]; }
      for (k = used; k < NM.length; k++) { NM[k].c = null; if (!NM[k].r.hidden) NM[k].r.hidden = true; if (!NM[k].n.hidden) NM[k].n.hidden = true; }
      var put = []; for (k = 0; k < used; k++) put.push(NM[k].rb);
      for (k = 0; k < used; k++) { it = NM[k]; var c2 = it.c, own = it.rb; put[k] = null;   /* its own ring may sit under its own name: both mark the same find */
        var q = spot(it.sx, it.sy, it.rr, textW(c2.label), h, hud, put); put[k] = own;
        if (it.txt !== c2.label) { it.txt = c2.label; it.n.textContent = c2.label; } if (it.sp !== c2.sp) { it.sp = c2.sp; it.n.classList.toggle('sp', !!c2.sp); }
        if (Math.abs(it.x - it.sx) > 0.5 || Math.abs(it.y - it.sy) > 0.5) { it.x = it.sx; it.y = it.sy; it.r.style.transform = 'translate(' + it.sx.toFixed(1) + 'px,' + it.sy.toFixed(1) + 'px)'; }
        var ringOk = tap && !hit(own, hud); if (it.r.hidden === ringOk) it.r.hidden = !ringOk;   /* a glow under a button: the button keeps its own tap; the glow's name still takes one */
        if (!q) { if (!it.n.hidden) it.n.hidden = true; it.box = null; nst.held++; continue; }
        put.push(q.b); if (q.nudged) nst.nudged++; if (Math.abs(it.nx - q.b[0]) > 0.5 || Math.abs(it.ny - q.b[1]) > 0.5) { it.nx = q.b[0]; it.ny = q.b[1]; it.n.style.transform = 'translate(' + q.b[0].toFixed(1) + 'px,' + q.b[1].toFixed(1) + 'px)'; }
        if (it.n.hidden) it.n.hidden = false; var pe = tap ? 'auto' : 'none'; if (it.n.style.pointerEvents !== pe) it.n.style.pointerEvents = pe; it.box = q.b; it.nudged = q.nudged; }
      nst.drawn = used;
    }
    /* a tap on a glow or its name: that find becomes the mark she follows (826) */
    function tap(it) { var c = it.c; if (!c || !on() || !(io.canMark && io.canMark())) return false; nst.taps++; var ll = io.W.toLatLon(io.T.f, c.o.position.x, c.o.position.z);
      var id = io.mark ? io.mark({ lat: ll.lat, lon: ll.lon }, c.label, c.kind) : null; if (id) { nst.marks++; nst.last = { n: c.label, k: c.kind, i: id, lat: +ll.lat.toFixed(5), lon: +ll.lon.toFixed(5) }; } return !!id; }
    function names() { return NM.filter(function (it) { return it.c; }).map(function (it) { return { t: it.txt, sp: !!it.sp, kind: it.c.kind, glow: [+it.x.toFixed(1), +it.y.toFixed(1)], box: it.n.hidden || !it.box ? null : it.box.map(function (v) { return +v.toFixed(1); }), nudged: !it.n.hidden && !!it.nudged, ring: !it.r.hidden }; }); }
    function peek() { return { on: on(), covered: !!(io.covered && io.covered()), names: names(), nst: Object.assign({}, nst), tapOk: !!(io.canMark && io.canMark()), hud: io.hud ? (io.hud() || []).map(function (b) { return b.slice(0, 4).map(Math.round).concat([b[4]]); }) : null, anchors: A.length, used: A.filter(function (a) { return a.userData.n833; }).map(function (a) { return { n: a.userData.n833, k: a.userData.k833, at: a.position.toArray().map(function (v) { return +v.toFixed(1); }) }; }),
      fruit: FRUIT.length, fruitOn: FRUIT.filter(function (f) { return f.visible; }).length, finds: st.finds, picks: st.picks, picked: st.picked, err: st.err, cities: CITIES ? CITIES.length : null }; }
    return { on: on, finds: finds, size: size, repick: repick, picked: picked, peek: peek, root: root, draw: draw, hide: hide, layout: function (sx, sy, r, t) { var q = spot(sx, sy, r || 10, textW(t), Math.round(L833.PX * 1.25), io.hud ? io.hud() || [] : [], []); return q ? { b: q.b.map(function (v) { return +v.toFixed(1); }), nudged: q.nudged } : null; }, tap: function (k) { return NM[k] && NM[k].c ? tap(NM[k]) : false; } };
  }
  return { C: C, WORDS: WORDS, create: create };
})();
