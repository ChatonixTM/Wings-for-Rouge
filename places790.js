/* places790.js - BOARD 790 D, NAMED PLACES EVERYWHERE (Wings for Rouge). Su 39's builder, Nov 13 2026.
   Marth, Nov 13 2026, verbatim: "Nah I want the whole world built at least as nice as the current game looks. Everything in his game looks better than
   in our game." COO (the Toronto pigeon game, his bar) has 3,237 named places, parks, stations, squares and landmarks, with facts.

   WHAT ROUGE SEES (out in the world, the travel zone; Standard only, Classic is frozen):
     - when she comes near a named place, its name rises softly in the word lane: a small card (the kind over it, the name, and for a notable place ONE
       short fact under it); a big place (a landmark, a national park, a capital, a famous square, a great lake) rises in the game's own title card
       (title39). One name at a time, never stacking: a title already up, a scene, a talk or a card holds it back; a title that comes takes its place.
     - the bigger places are 'see' quests (world-quests.js LANDMARKS): reaching them pays XP and runes; the quest board lists the ones near her.
   WHERE THE NAMES COME FROM: (1) the hand-written places (places790-data.js CURATED: Toronto deep, the UK, the Caribbean, North America, each fact with
   its source); (2) Natural Earth (public domain): every populated place, lake, river, cape, island and waterfall in the world, in 10-degree chunks
   parsed only when she is near (loaded by region); (3) OpenStreetMap's own names (ODbL; credited by the street map's line, world-features.js) for the
   parks, stations, squares, peaks, neighbourhoods and sights in the tiles the street map is already streaming round her: read from the same bytes
   (WFR_FEATURES.setFetch: the tile's answer is cloned, never fetched twice), decoded a tile per tick.
   Light on a phone: a tick every 250 ms (not every frame), a coarse grid per chunk, the street tiles' names only for the tiles round her.
   THE PAGE HANDS IT (init(ctx), once): S, T (TRAVEL712), W (WFR_WORLD), H(x, z) (the travel ground), classic(), title(over, name, under),
   titleOn(), quiet() (the lane is held: a scene, a card), busy() (a menu, a talk, inside, the pause). Every word and number a DRAFT for Marth's pen. */
window.WFR_PLACES790 = (function () {
  'use strict';
  var C = { TICK_MS: 250, GAP: 8, GAP2: 6, GAP_BIG: 2.5, SHOW: { 2: 4200, 3: 3000 }, COOL: 1500, OSM_KEEP: 90, OSM_R_PAD: 3500, CELL: 1, HINT: 60000 };
  /* the word over the name, and the kind's own reach (m) and ceiling over the ground (m): a station is named only low and close, a lake from high up */
  var KIND = {
    tower: ['Landmark', 600, 2500], landmark: ['Landmark', 300, 900], ruins: ['Ruins', 500, 1500], castle: ['Castle', 300, 900], fort: ['Fort', 250, 800],
    park: ['Park', 350, 900], npark: ['National park', 5000, 6000], garden: ['Gardens', 250, 700], square: ['Square', 200, 500], station: ['Station', 180, 450],
    hood: ['Neighbourhood', 700, 1200], market: ['Market', 200, 450], museum: ['Museum', 200, 500], stadium: ['Stadium', 300, 900], zoo: ['Zoo', 400, 900],
    harbour: ['Harbour', 400, 900], bridge: ['Bridge', 400, 1200], airport: ['Airport', 2000, 3000], beach: ['Beach', 500, 900], lighthouse: ['Lighthouse', 250, 900],
    cliffs: ['Cliffs', 1200, 1500], valley: ['Valley', 3000, 5000], peak: ['Mountain', 1500, 4500], volcano: ['Volcano', 2500, 6000], lake: ['Lake', 1500, 4000],
    reservoir: ['Reservoir', 1500, 3000], river: ['River', 3000, 2500], canal: ['Canal', 2000, 1500], island: ['Island', 4000, 4000], falls: ['Waterfall', 1500, 2000],
    cave: ['Cave', 300, 600], reef: ['Reef', 1500, 1500], bay: ['Bay', 1500, 3000], cape: ['Cape', 3000, 3000], plain: ['Plain', 20000, 9000], pole: ['Pole', 20000, 9000],
    town: ['Town', 2000, 1500], city: ['City', 5000, 4000], capital: ['Capital', 12000, 9000], neigh: ['Neighbourhood', 700, 1200]
  };
  var TIER_AGL = { 1: 9000, 2: 4000, 3: 1500 };
  var X = null, D = window.WFR_PLACES790_DATA || null;
  var st = { inited: false, fault: null, iv: 0, ticks: 0, tickMs: 0, tickMax: 0, shown: [], last: null, lastAt: -1e9, cardOn: false, cardUntil: 0, cardEl: null, raf: 0,
    stackChecks: 0, held: 0, why: '', near: [], chunks: {}, chunkN: 0, curIdx: null, cool: {}, now: 0,
    osm: { on: false, tiles: new Map(), queue: [], decoded: 0, names: 0, errors: 0, lastErr: '', ms: 0 } };
  function now() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; }
  var D2R = Math.PI / 180;
  function dist(la1, lo1, la2, lo2) { var dx = (lo2 - lo1) * Math.cos((la1 + la2) / 2 * D2R) * 111320, dy = (la2 - la1) * 110570; return Math.sqrt(dx * dx + dy * dy); }   // metres, flat (good to a fraction of a per cent at these reaches)
  function segDist(la, lo, a0, o0, a1, o1) { var k = Math.cos(la * D2R) * 111320, px = (lo - o0) * k, py = (la - a0) * 110570, dx = (o1 - o0) * k, dy = (a1 - a0) * 110570, l2 = dx * dx + dy * dy,
    t = l2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / l2)) : 0; return Math.hypot(px - t * dx, py - t * dy); }

  /* ---------- the hand-written places ---------- */
  function curated() {
    if (st.curIdx) return st.curIdx; var L = (D && D.CURATED) || [], out = [];
    for (var i = 0; i < L.length; i++) { var c = L[i], K = KIND[c.k] || KIND.landmark; out.push({ id: 'c:' + c.id, cid: c.id, k: c.k, n: c.n, la: c.la, lo: c.lo, r: c.r || K[1], t: c.t, u: c.f || '', src: 'curated', q: c.q ? c.id : c.lq || null }); }
    return (st.curIdx = out);
  }
  /* ---------- Natural Earth, a 10-degree chunk at a time, into 1-degree cells (the big ones, lakes with a box and rivers, kept apart) ---------- */
  function chunk(key) {
    var ch = st.chunks[key]; if (ch) return ch; ch = st.chunks[key] = { cells: {}, big: [], n: 0 }; st.chunkN++;
    var s = D && D.CHUNKS && D.CHUNKS[key]; if (!s) return ch; var lines = s.split('\n');
    for (var i = 0; i < lines.length; i++) { var f = lines[i].split('|'), k = f[0], la = +f[2] / 1e3, lo = +f[3] / 1e3, R = { id: 'n:' + key + ':' + i, k: k, n: f[1], la: la, lo: lo, r: +f[4], t: +f[5] || 3, u: (D.U && D.U[+f[6] || 0]) || '', src: 'ne', wd: f[8] || '' };
      if (f[7]) { var v = f[7].split(';'); if (k === 'river' || k === 'canal') { var pts = [la, lo], a = Math.round(la * 100), o = Math.round(lo * 100); for (var j = 0; j < v.length; j++) { var d = v[j].split(','); a += +d[0]; o += +d[1]; pts.push(a / 100, o / 100); } R.line = pts; }
        else { var b = f[7].split(',').map(Number); R.box = [b[0] / 1e3, b[1] / 1e3, b[2] / 1e3, b[3] / 1e3]; } }
      if (R.line || R.box) { var bb = R.box || lineBox(R.line); R.bb = bb; ch.big.push(R); }
      else { var ck = Math.floor(la) + ',' + Math.floor(lo); (ch.cells[ck] || (ch.cells[ck] = [])).push(R); }
      ch.n++; }
    return ch;
  }
  function lineBox(p) { var a0 = 90, a1 = -90, o0 = 180, o1 = -180; for (var i = 0; i < p.length; i += 2) { a0 = Math.min(a0, p[i]); a1 = Math.max(a1, p[i]); o0 = Math.min(o0, p[i + 1]); o1 = Math.max(o1, p[i + 1]); } return [a0, o0, a1, o1]; }
  function inBox(b, la, lo, padDeg) { return la >= b[0] - padDeg && la <= b[2] + padDeg && lo >= b[1] - padDeg && lo <= b[3] + padDeg; }

  /* ---------- OpenStreetMap's names, from the street map's own tiles (ODbL; its credit line is the street map's) ---------- */
  /* what of the street map's names rises: the places a person would name to a friend (a station, a park, a square, a castle, a peak, a neighbourhood);
     not the noise (a tour boat's stall, a slip of water between two piers, a parkette, a marina): the first Toronto flight said 'Rees Slip', 'Kajama' */
  var OSM_POI = { monument: 'landmark', castle: 'castle', museum: 'museum', zoo: 'zoo', stadium: 'stadium', town_hall: 'landmark', square: 'square' }, OSM_NOISE = /parkette|playground|dog (park|area)|slip$|basin$|parking|program|cruises?|tours?|rental|marina|club|school|daycare|centre$/i;
  function osmKind(layer, P) {
    var c = P['class'], s = P.subclass;
    if (layer === 'poi') { if (c === 'railway' && /^(station|halt|subway)$/.test(s)) return 'station'; if (c === 'park') return s === 'garden' ? 'garden' : /^(park|nature_reserve|recreation_ground|common|village_green)$/.test(s || 'park') ? 'park' : null;
      if (s === 'square' || c === 'square') return 'square'; if (s === 'beach') return 'beach'; return OSM_POI[c] || null; }
    if (layer === 'place') return /^(neighbourhood|quarter|suburb)$/.test(c) ? 'neigh' : null;
    if (layer === 'mountain_peak') return c === 'volcano' ? 'volcano' : c === 'peak' ? 'peak' : null;
    if (layer === 'park') return c === 'national_park' ? 'npark' : /^(nature_reserve|protected_area|state_park)$/.test(c) ? 'park' : null;
    if (layer === 'water_name') return /^(lake|reservoir|lagoon)$/.test(c) ? 'lake' : null;
    return null;
  }
  var WANT14 = { poi: 1, place: 1, park: 1, mountain_peak: 1, water_name: 1 }, WANT12 = { poi: 1, park: 1, mountain_peak: 1, water_name: 1 };
  /* a tile's names are read a slice at a time (2 ms, then the next slice 30 ms later): the first Toronto flight read a downtown tile whole in 7 ms,
     which on her phone would be a dropped frame or three */
  var JOB = null, PUMP = 0;
  function osmStart(q) {
    var F = window.WFR_FEATURES, z = q[0]; if (!F || !F.decodeTile) return null;
    var L = F.decodeTile(new Uint8Array(q[3]), z >= 14 ? WANT14 : WANT12);
    return { z: z, x: q[1], y: q[2], L: L, names: Object.keys(L), li: 0, fi: 0, recs: [], seen: {} };
  }
  function osmStep(J, deadline) {   // true when the tile is read
    var F = window.WFR_FEATURES, z = J.z, x = J.x, y = J.y, cnt = 0;
    while (J.li < J.names.length) { var name = J.names[J.li], Ly = J.L[name], n = Ly.feats.length / 2;
      while (J.fi < n) { if ((++cnt & 15) === 0 && now() > deadline) return false;
        var ft = F.feature(Ly, J.fi++), P = ft.props, nm = P['name:en'] || P.name_en || P.name, k = nm ? osmKind(name, P) : null; if (!k || OSM_NOISE.test(nm) || (name === 'water_name' && z >= 14)) continue;
        nm = String(nm); if (k === 'station') nm = nm.replace(/\s+(tube |underground |subway |railway |train |metro )?station$/i, '') || nm;   /* the word over it already says Station */ var key = nm.toLowerCase(); if (J.seen[key]) continue; var r0 = ft.rings[0]; if (!r0 || r0.length < 2) continue;
        var px = r0[0], py = r0[1]; if (ft.type === 3) { var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (var j = 0; j < r0.length; j += 2) { x0 = Math.min(x0, r0[j]); x1 = Math.max(x1, r0[j]); y0 = Math.min(y0, r0[j + 1]); y1 = Math.max(y1, r0[j + 1]); } px = (x0 + x1) / 2; py = (y0 + y1) / 2; }
        if (px < 0 || py < 0 || px > Ly.extent || py > Ly.extent) continue;   /* a feature's buffer beyond the tile's edge belongs to its neighbour */
        var g = F.llOf(z, x, y, px, py, Ly.extent), K = KIND[k], ele = +P.ele || 0;
        J.seen[key] = 1; J.recs.push({ id: 'o:' + key + ':' + g.lat.toFixed(3) + ',' + g.lon.toFixed(3), k: k, n: nm, la: g.lat, lo: g.lon, r: K[1], t: k === 'npark' ? 2 : 3, u: ele > 0 && (k === 'peak' || k === 'volcano') ? Math.round(ele).toLocaleString('en-US') + ' m high' : '', src: 'osm' }); }
      J.li++; J.fi = 0; }
    return true;
  }
  function osmDone(J) {
    var z = J.z, x = J.x, y = J.y, n2 = Math.pow(2, z), lat0 = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n2))) / D2R, lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n2))) / D2R;
    st.osm.tiles.set(z + '/' + x + '/' + y, { recs: J.recs, bb: [lat1, x / n2 * 360 - 180, lat0, (x + 1) / n2 * 360 - 180], used: st.ticks });
    st.osm.decoded++; st.osm.names += J.recs.length;
    if (st.osm.tiles.size > C.OSM_KEEP) { var old = null, ou = 1e18; st.osm.tiles.forEach(function (v, k2) { if (v.used < ou) { ou = v.used; old = k2; } }); if (old) { st.osm.names -= st.osm.tiles.get(old).recs.length; st.osm.tiles.delete(old); } }
  }
  function pump() {
    PUMP = 0; var t0 = now();
    try {
      while (now() - t0 < 0.002) {
        if (!JOB) { if (!st.osm.queue.length) break; JOB = osmStart(st.osm.queue.shift()); if (!JOB) break; continue; }
        if (osmStep(JOB, t0 + 0.002)) { osmDone(JOB); JOB = null; }
      }
    } catch (e) { st.osm.errors++; st.osm.lastErr = String(e && e.message || e); JOB = null; }
    st.osm.ms = Math.max(st.osm.ms, (now() - t0) * 1000); st.osm.slices = (st.osm.slices || 0) + 1;
    if (JOB || st.osm.queue.length) PUMP = setTimeout(pump, 30);
  }
  function wake() { if (!PUMP && st.inited) PUMP = setTimeout(pump, 30); }
  var TILE_RE = /\/(\d+)\/(\d+)\/(\d+)\.pbf(\?|$)/;
  function fetch790(url, opt) {   // the street map's fetch, unchanged; a z12 or z14 tile's bytes are also read here for their names (a clone of the same answer)
    var p = window.fetch(url, opt), m = typeof url === 'string' ? TILE_RE.exec(url) : null;
    if (m && (+m[1] === 14 || +m[1] === 12)) p.then(function (r) { if (!r || r.status !== 200) return; r.clone().arrayBuffer().then(function (ab) { if (ab && ab.byteLength && st.osm.queue.length < 24) { st.osm.queue.push([+m[1], +m[2], +m[3], ab]); wake(); } }).catch(function () { /* the names wait for the next tile */ }); }).catch(function () { /* the street map sees its own failure */ });
    return p;
  }

  /* ---------- the query: every place she is "at" now ---------- */
  var CAND = [];
  function near(la, lo, agl, out) {
    out = out || []; out.length = 0; var i, j, R;
    var cur = curated(); for (i = 0; i < cur.length; i++) { R = cur[i]; if (Math.abs(R.la - la) > 0.3) continue; consider(R, la, lo, agl, out); }
    var ka = Math.floor(la / 10), ko = Math.floor(lo / 10);
    for (var da = -1; da <= 1; da++) for (var dO = -1; dO <= 1; dO++) { var key = (ka + da) + ',' + (((ko + dO + 18) % 36 + 36) % 36 - 18); if (!D || !D.CHUNKS || !D.CHUNKS[key]) continue;
      var ch = (da === 0 && dO === 0) || Math.abs(la - (ka + da + 0.5) * 10) < 7 && Math.abs(lo - (ko + dO + 0.5) * 10) < 7 ? chunk(key) : st.chunks[key]; if (!ch) continue;   /* a neighbour chunk is read when she is within 2 degrees of it */
      for (var ca = Math.floor(la) - 1; ca <= Math.floor(la) + 1; ca++) for (var co = Math.floor(lo) - 1; co <= Math.floor(lo) + 1; co++) { var L = ch.cells[ca + ',' + co]; if (L) for (j = 0; j < L.length; j++) consider(L[j], la, lo, agl, out); }
      for (j = 0; j < ch.big.length; j++) { R = ch.big[j]; if (inBox(R.bb, la, lo, 0.05)) consider(R, la, lo, agl, out); } }
    st.osm.tiles.forEach(function (T) { if (!inBox(T.bb, la, lo, 0.04)) return; T.used = st.ticks; for (var q = 0; q < T.recs.length; q++) consider(T.recs[q], la, lo, agl, out); });
    return out;
  }
  function consider(R, la, lo, agl, out) {
    var K = KIND[R.k] || KIND.landmark, ceil = R.t === 1 ? Math.min(TIER_AGL[1], Math.max(1500, K[2] * 2)) : Math.min(K[2], TIER_AGL[R.t] || 1500);   /* a big place is named from high up; a small one only low */
    if (agl != null && agl > ceil) return;
    var d;
    if (R.line) { d = 1e9; for (var i = 0; i + 3 < R.line.length; i += 2) d = Math.min(d, segDist(la, lo, R.line[i], R.line[i + 1], R.line[i + 2], R.line[i + 3])); if (d > R.r) return; }
    else if (R.box) { var b = R.box, sh = 0.18, ia = (b[2] - b[0]) * sh, io = (b[3] - b[1]) * sh; if (!(la > b[0] + ia && la < b[2] - ia && lo > b[1] + io && lo < b[3] - io)) { d = dist(la, lo, R.la, R.lo); if (d > R.r) return; } else d = dist(la, lo, R.la, R.lo); }
    else { d = dist(la, lo, R.la, R.lo); if (d > R.r) return; }
    out.push({ R: R, d: d, s: (4 - R.t) * 10 + (R.k === 'city' || R.k === 'capital' ? 7 : R.src === 'curated' ? 5 : R.src === 'osm' ? 1 : 0) + 3 * (1 - Math.min(1, d / R.r)) });   /* the city she is in first, then its sights */
  }

  /* ---------- the word lane ---------- */
  var CSS = ['#place790{position:fixed;left:16px;right:16px;top:24%;z-index:40;text-align:center;pointer-events:none;opacity:0;transform:translateY(14px);transition:opacity .8s ease,transform 1.2s cubic-bezier(.2,.7,.2,1)}',
    '#place790.on{opacity:1;transform:none}',
    '#place790 .o{font:600 11px/1.3 var(--k-sans,var(--body,system-ui));letter-spacing:.3em;text-transform:uppercase;color:#f6efd8;text-shadow:0 1px 3px rgba(0,8,24,.8)}',
    '#place790 .n{margin:4px auto 0;display:inline-block;padding:0 16px;font:500 24px/1.15 Georgia,"Times New Roman",serif;letter-spacing:.03em;color:#fff8e6;text-shadow:0 2px 8px rgba(0,10,30,.75),0 0 2px rgba(0,0,0,.6);background:linear-gradient(90deg,transparent,rgba(255,240,200,.6) 18%,rgba(255,240,200,.6) 82%,transparent) no-repeat bottom/100% 1px}',
    '#place790 .u{margin:6px auto 0;max-width:330px;font:500 12.5px/1.35 var(--k-sans,var(--body,system-ui));color:#eaf2ff;text-shadow:0 1px 3px rgba(0,8,24,.85)}',
    '#place790.t3 .n{font-size:19px;background:none}#place790.t3 .o{font-size:10px}',
    '@media (orientation:portrait){html.ui716 #place790{left:70px;right:70px}}'].join('\n');
  function cardMake() {
    if (st.cardEl) return st.cardEl; var s = document.createElement('style'); s.id = 'place790css'; s.textContent = CSS; document.head.appendChild(s);
    var e = document.createElement('div'); e.id = 'place790'; e.setAttribute('role', 'status'); e.setAttribute('aria-live', 'polite'); document.body.appendChild(e); return (st.cardEl = e);
  }
  function cardShow(R) {
    var e = cardMake(), K = KIND[R.k] || KIND.landmark; e.innerHTML = '';
    var add = function (c, t) { if (!t) return; var d = document.createElement('div'); d.className = c; d.textContent = t; e.appendChild(d); };
    add('o', K[0]); add('n', R.n); if (R.t <= 2) add('u', R.u);
    e.className = 't' + Math.max(2, R.t); st.cardOn = true; st.cardUntil = now() + (C.SHOW[Math.max(2, R.t)] || 3000) / 1000;
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (st.cardOn && st.cardEl === e) e.classList.add('on'); }); }); watch();   /* risen two frames later: no forced layout (the gate measured 9 ms on the heavier #138 page) */
  }
  function cardHide(now0) {   /* now0: at once (a title is coming into the lane), else its own soft fade */
    var e = st.cardEl, was = st.cardOn || (e && e.classList.contains('on')); st.cardOn = false; if (!e) return; if (now0) { e.style.transition = 'none'; e.classList.remove('on'); requestAnimationFrame(function () { e.style.transition = ''; }); st.cardGone = 0; } else if (was) { e.classList.remove('on'); st.cardGone = now() + 0.85; } }
  /* seen without asking the browser for its styles (a computed style mid-transition costs a style pass): the card's fade is 0.8 s, the title's 1.1 s */
  function cardSeen() { return st.cardOn || now() < (st.cardGone || 0); }
  function titleSeen() { var e = document.getElementById('title39'), t = now(); if (e && e.classList.contains('on')) { st.titleAt = t; return true; } return t - (st.titleAt || -9) < 1.2; }
  function watch() {   /* while the small card is up or fading, every frame: a title that comes takes its place at once (never two in the lane); its time runs out */
    if (st.raf) return; var f = function () { st.raf = 0; if (!st.cardOn && !cardSeen()) return; st.stackChecks++;
      var tOn = false; try { tOn = !!X.titleOn(); } catch (e) { tOn = false; } if (tOn) st.titleAt = now();
      if (tOn) { cardHide(true); st.yielded = (st.yielded || 0) + 1; return; }
      if (st.cardOn && now() >= st.cardUntil) cardHide(); st.raf = requestAnimationFrame(f); };
    st.raf = requestAnimationFrame(f);
  }
  function laneFree(t) {
    if (X.quiet && X.quiet()) return 'quiet'; if ((X.titleOn && X.titleOn()) || titleSeen()) return 'title'; if (st.cardOn || (t !== 1 && cardSeen())) return 'card';
    var gap = now() - st.lastAt; if (gap < (t === 1 ? C.GAP_BIG : t === 2 ? C.GAP2 : C.GAP)) return 'gap'; return '';
  }
  function say(c) {
    var R = c.R, K = KIND[R.k] || KIND.landmark, key = R.n.toLowerCase(), t = now(), lane;
    if (R.t === 1) { if (cardSeen()) cardHide(true); var ok = false; try { ok = X.title(K[0], R.n, R.u || null); } catch (e) { ok = false; } if (!ok) return false; lane = 'title'; }
    else { cardShow(R); lane = 'card'; }
    st.cool[key] = t; st.lastAt = t; st.last = { n: R.n, k: R.k, t: R.t, u: R.u, src: R.src, lane: lane, d: Math.round(c.d), at: +t.toFixed(2) };
    st.shown.push(st.last); if (st.shown.length > 60) st.shown.shift(); return true;
  }

  /* ---------- the tick (4 a second, while she is out in the world) ---------- */
  function tick() {
    if (!st.inited) return; var t0 = now();
    try {
      st.ticks++; st.now = t0;
      var T = X.T, S = X.S;
      if (X.classic()) { st.why = 'classic'; cardHide(); return; }
      if (!T || !T.on || !T.ll) { st.why = 'home'; cardHide(); return; }
      if (X.busy && X.busy()) { st.why = 'busy'; return; }
      var ll = T.ll, gh = 0; try { gh = Math.max(0, X.H(S.pos.x, S.pos.z)); } catch (e) { gh = 0; } var agl = S.pos.y - gh, fast = !!(X.fast && X.fast());
      var L = near(ll.lat, ll.lon, agl, CAND); st.near = [];
      var best = null, seenN = {};
      for (var i = 0; i < L.length; i++) { var c = L[i], key = c.R.n.toLowerCase(); st.near.push(c.R.n);
        if (st.cool[key] != null && t0 - st.cool[key] < C.COOL) continue; if (fast && c.R.t > 1) continue;
        if (seenN[key] && seenN[key].s >= c.s) continue; seenN[key] = c; if (!best || c.s > best.s) best = c; }
      if (!best) { st.why = 'none'; return; }
      var why = laneFree(best.R.t); st.qMs = (now() - t0) * 1000; st.qMax = Math.max(st.qMax || 0, st.qMs); if (why) { st.why = why; st.held++; return; }
      var t1 = now(); st.why = say(best) ? 'said' : 'refused'; var sm = (now() - t1) * 1000; if (best.R.t === 1) st.titleMax = Math.max(st.titleMax || 0, sm); else st.sayMax = Math.max(st.sayMax || 0, sm);   /* our card's DOM, and the game's own title card (title39), timed apart */
    } catch (e) { st.fault = 'tick: ' + (e && e.message || e); }
    finally { var ms = (now() - t0) * 1000; st.tickMs = ms; st.tickMax = Math.max(st.tickMax, ms); }
  }

  /* ---------- the quests: the bigger places pay when reached (world-quests.js reads LANDMARKS at its load: 'see' within r, under agl) ---------- */
  var LANDMARKS = (function () {
    var L = (D && D.CURATED) || [], out = [];
    for (var i = 0; i < L.length; i++) { var c = L[i], q = c.q; if (!q) continue;
      out.push({ id: c.id, e: q.e, name: c.n, title: q.title, where: c.w, lat: c.la, lon: c.lo, kind: q.kind, r: q.r, aglMax: q.agl, xp: q.xp, runes: q.ru, line: c.f, near790: C.HINT }); }
    return out;
  })();

  function init(ctx) {
    if (st.inited) return true; X = ctx;
    try {
      if (!D) { st.fault = 'no data (places790-data.js)'; return false; }
      if (window.WFR_FEATURES && WFR_FEATURES.setFetch) { WFR_FEATURES.setFetch(fetch790); st.osm.on = true; }
      st.iv = setInterval(tick, C.TICK_MS); st.inited = true; return true;
    } catch (e) { st.fault = 'init: ' + (e && e.message || e); return false; }
  }
  function peek() {
    return { inited: st.inited, fault: st.fault, ticks: st.ticks, why: st.why, held: st.held, last: st.last, shown: st.shown.slice(), cardOn: st.cardOn, yielded: st.yielded || 0,
      near: st.near.slice(0, 24), chunks: Object.keys(st.chunks), tickMs: +st.tickMs.toFixed(3), tickMax: +st.tickMax.toFixed(3), qMax: +(st.qMax || 0).toFixed(3), sayMax: +(st.sayMax || 0).toFixed(3), titleMax: +(st.titleMax || 0).toFixed(3), landmarks: LANDMARKS.length,
      osm: { on: st.osm.on, tiles: st.osm.tiles.size, decoded: st.osm.decoded, names: st.osm.names, queue: st.osm.queue.length, errors: st.osm.errors, lastErr: st.osm.lastErr, msMax: +st.osm.ms.toFixed(2), slices: st.osm.slices || 0 },
      counts: D && D.stats ? D.stats : null };
  }
  function osmNear(la, lo, km) { var out = []; st.osm.tiles.forEach(function (T) { for (var i = 0; i < T.recs.length; i++) { var R = T.recs[i]; if (dist(la, lo, R.la, R.lo) <= km * 1000) out.push([R.k, R.n]); } }); return out; }
  return { C: C, KIND: KIND, LANDMARKS: LANDMARKS, init: init, tick: tick, peek: peek, near: function (la, lo, agl) { return near(la, lo, agl, []).map(function (c) { return { n: c.R.n, k: c.R.k, t: c.R.t, src: c.R.src, d: Math.round(c.d), s: +c.s.toFixed(2), u: c.R.u }; }).sort(function (a, b) { return b.s - a.s; }); },
    osmNear: osmNear, resetCool: function () { st.cool = {}; st.lastAt = -1e9; }, cardEl: function () { return st.cardEl; } };
})();
