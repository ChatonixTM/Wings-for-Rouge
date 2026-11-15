/* ledger817.js - BOARD 817, THREADS OF TIME: HER TRAVEL LEDGER (Wings for Rouge). Nov 14 2026. Guard: tests/ledger817.js.
   Marth, Nov 14 2026, verbatim (after reaching Cuba, on live #142, Lv 48): "We should keep an in game ledger thing or - threads of time for like ocarina of
   time. To keep tracks of countries explored and their titles like 'old Havana'".
   THE BAR (never the look): Ocarina's quest record, the feeling of a book that grows as she goes. Drawn in the game's own house style (795: night glass, mint).
   WHAT SHE SEES (Standard only; Classic is frozen and never makes it):
     - Pause has a card "Threads of Time" beside the Journal, and the Pouch a row for it. It opens one page over the whole screen:
       how many countries she has found out of the world's (the world data's 220), and how many places;
       every country she has reached, in the order she reached them, with its arrival line and the game day she first came;
       under each, the place titles she has seen there (Old Havana, National Park "Caguanes", Miami ...), each with its kind and its day;
       and, never named, how many of the hand-written places of that country still wait for her.
     - A tap on a place (or a country) shows it on the world map; closing the map comes back to the page. A Map pill on the page keeps the map one tap away.
     - While it is open the world holds (the page adds it to 792's cards) and nothing of the world draws over it (818's covered818).
   WHERE IT READS FROM (nothing it did not see is ever written):
     - a country reached: the arrivals' own flags (S.seen.arrive783: the six hand rows; S.seen.arrive821: every other country), read once a second; a flag
       that appears is a new country, written with today's game day;
     - a place title: the names that rise over the world (places790's card and its title card), a city's own card (arrive821 U3), and a hand row's
       "A rumour on the wind" (arrive783: Old Havana for Cuba);
     - an OLD file (no ledger yet): its countries are its flags, in the order they were written, shown as "before the book" (no day was ever kept), with
       their hand rows' rumours and the landmarks she reached (S.quests.lm). Nothing is written for them: her file loads untouched.
   SAVED under a NEW key only, S.seen.ledger817 = { c: [[country, day], ...], p: { country: [[name, kind, day, lat, lon], ...] } }, written the first time she
   reaches a new country or sees a new place's name.
   COST: DOM only, built on the first open and kept; its list is refilled on an open only when what it shows changed; nothing in the scene, no shader.
   Every word a DRAFT for his pen. */
window.WFR_LEDGER817 = (function () {
  'use strict';
  var C = { TICK_MS: 1000, KEEP: 150, SHOW: 6, K_MAP: 90 };
  var WORDS = {
    eyebrow: 'The ledger', title: 'Threads of Time', sub: 'Every country Rouge has reached, and the places she has seen there.',
    of: ' of ', countries: 'countries', country: 'country', places: 'places', place: 'place', day: 'Day ', before: 'Before the book', rumour: 'A rumour',
    landmark: 'Landmark', empty: 'No country yet. Fly out past the reef: the first coast she reaches is written here.',
    hint1: 'One more named place waits here.', hintN: ' more named places wait here.', all: 'Show all ', less: 'Show fewer', tap: 'Tap a place to see it on the map.',
    map: 'Map', close: 'Close the ledger', card: 'Threads of Time', cardSub: 'every country, every place she has found', pouchH: 'Travels', pouchB: 'Threads of Time'
  };
  var CSS = [
    '#ledger817{position:fixed;inset:0;z-index:70;display:flex;justify-content:center;box-sizing:border-box;padding:calc(env(safe-area-inset-top,0px) + 10px) 8px calc(env(safe-area-inset-bottom,0px) + 10px);',
    '  background:radial-gradient(120% 70% at 50% 0%,rgba(77,232,201,.10),rgba(5,6,12,0) 60%),rgba(5,6,12,.86);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);touch-action:pan-y}',
    '#ledger817[hidden]{display:none}#ledger817.l8-away{visibility:hidden;pointer-events:none}',
    '#ledger817 .l8-win{position:relative;display:flex;flex-direction:column;box-sizing:border-box;width:min(440px,100%);max-height:100%;min-height:0;border-radius:18px;overflow:hidden;',
    '  background:var(--h7-glass,rgba(12,16,28,.92));background-image:radial-gradient(120% 80% at 20% 0%,rgba(110,168,255,.08),rgba(110,168,255,0) 60%);border:1px solid var(--h7-line,rgba(120,150,220,.26));',
    '  box-shadow:0 0 0 1px rgba(0,0,0,.35),0 0 22px -8px var(--h7-glow,rgba(77,232,201,.45)),0 10px 24px rgba(0,0,0,.38);color:var(--h7-ink,#e9edf8);font-family:var(--h7-body,system-ui,sans-serif)}',
    '#ledger817 .l8-top{position:relative;flex:none;padding:14px 16px 12px;border-bottom:1px solid var(--h7-line,rgba(120,150,220,.26))}',
    '#ledger817 .l8-eb{font:700 10px/1.2 var(--h7-mono,ui-monospace,monospace);letter-spacing:.22em;text-transform:uppercase;color:var(--h7-mint,#4de8c9)}',
    '#ledger817 .l8-eb::before{content:"";display:inline-block;width:7px;height:7px;margin:0 8px 1px 0;border-radius:50%;background:var(--h7-red,#ff3b42);box-shadow:0 0 8px var(--h7-red,#ff3b42);vertical-align:middle}',
    '#ledger817 h2{margin:8px 0 4px;padding:0 92px 0 0;font:700 25px/1.1 var(--h7-head,system-ui,sans-serif);letter-spacing:-.01em;color:var(--h7-ink,#e9edf8);background:none;-webkit-text-fill-color:currentColor;text-shadow:none;text-transform:none}',
    '#ledger817 .l8-sub{margin:0;font:italic 500 13px/1.35 var(--h7-body,system-ui,sans-serif);color:var(--h7-dim,#95a0bd)}',
    '#ledger817 .l8-stats{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}',
    '#ledger817 .l8-stats b{font:700 11px/1 var(--h7-mono,ui-monospace,monospace);letter-spacing:.05em;padding:6px 10px;border:1px solid var(--h7-line2,rgba(150,170,230,.34));border-radius:999px;background:rgba(10,13,24,.72);color:var(--h7-ink,#e9edf8)}',
    '#ledger817 .l8-stats b.l8-n{border-color:var(--h7-mint,#4de8c9);color:#fff;box-shadow:0 0 10px -3px var(--h7-glow,rgba(77,232,201,.45))}',
    '#ledger817 .l8-x,#ledger817 .l8-map{position:absolute;top:10px;min-width:44px;height:44px;box-sizing:border-box;border-radius:999px;border:1px solid var(--h7-line2,rgba(150,170,230,.34));background:rgba(10,13,24,.8);color:var(--h7-ink,#e9edf8);cursor:pointer;padding:0;margin:0}',
    '#ledger817 .l8-x{right:10px;width:44px;font:400 18px/1 system-ui,sans-serif}',
    '#ledger817 .l8-map{right:60px;padding:0 12px;font:700 11px/1 var(--h7-mono,ui-monospace,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--h7-mint,#4de8c9)}',
    '#ledger817 .l8-list{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:10px 10px 4px}',
    '#ledger817 .l8-c{position:relative;margin:0 0 10px;padding:0 0 6px 0;border-radius:14px;background:rgba(16,21,36,.78);border:1px solid var(--h7-line,rgba(120,150,220,.26))}',
    '#ledger817 .l8-c::before{content:"";position:absolute;left:25px;top:52px;bottom:12px;width:1px;background:linear-gradient(var(--h7-mint,#4de8c9),rgba(77,232,201,0));opacity:.45}',
    '#ledger817 button{font-family:inherit;-webkit-tap-highlight-color:transparent}',
    '#ledger817 .l8-ch{display:grid;grid-template-columns:32px 1fr auto;column-gap:10px;align-items:baseline;width:100%;min-height:52px;box-sizing:border-box;margin:0;padding:12px 12px 8px;border:0;background:none;color:inherit;text-align:left;cursor:pointer}',
    '#ledger817 .l8-no{font:700 11px/1 var(--h7-mono,ui-monospace,monospace);color:var(--h7-mint,#4de8c9);letter-spacing:.06em}',
    '#ledger817 .l8-cn{min-width:0;font:700 18px/1.15 var(--h7-head,system-ui,sans-serif);color:#fff;overflow-wrap:anywhere}',
    '#ledger817 .l8-day{font:700 10.5px/1.2 var(--h7-mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--h7-gold,#ffd45c);white-space:nowrap}',
    '#ledger817 .l8-day.l8-old{color:var(--h7-dim,#95a0bd)}',
    '#ledger817 .l8-line{grid-column:2 / 4;margin-top:4px;font:italic 500 13px/1.35 var(--h7-body,system-ui,sans-serif);color:var(--h7-dim,#95a0bd)}',
    '#ledger817 .l8-pl{list-style:none;margin:0;padding:0 8px 0 38px}',
    '#ledger817 .l8-pb{position:relative;display:flex;flex-direction:column;justify-content:center;width:100%;min-height:44px;box-sizing:border-box;margin:0;padding:6px 30px 6px 4px;border:0;border-top:1px solid rgba(120,150,220,.12);background:none;color:inherit;text-align:left;cursor:pointer}',
    '#ledger817 .l8-pb::before{content:"";position:absolute;left:-16px;top:50%;width:7px;height:7px;margin-top:-4px;border-radius:50%;background:#0c101c;border:1.5px solid var(--h7-mint,#4de8c9)}',
    '#ledger817 .l8-pb::after{content:"";position:absolute;right:10px;top:50%;width:7px;height:7px;margin-top:-4px;border:solid var(--h7-mint,#4de8c9);border-width:2px 2px 0 0;transform:rotate(45deg);opacity:.8}',
    '#ledger817 .l8-pb:active,#ledger817 .l8-ch:active{background:rgba(77,232,201,.08)}',
    '#ledger817 .l8-pn{font:600 15px/1.25 var(--h7-head,system-ui,sans-serif);color:var(--h7-ink,#e9edf8);overflow-wrap:anywhere}',
    '#ledger817 .l8-pk{margin-top:2px;font:400 10.5px/1.25 var(--h7-mono,ui-monospace,monospace);letter-spacing:.04em;color:var(--h7-dim,#95a0bd)}',
    '#ledger817 .l8-pb.l8-r .l8-pn{font-style:italic;color:#cfd6ea}',
    '#ledger817 .l8-hint{margin:6px 12px 4px 42px;font:italic 500 12px/1.3 var(--h7-body,system-ui,sans-serif);color:var(--h7-muted,#8c97b4)}',
    '#ledger817 .l8-more{display:block;min-height:40px;margin:4px 12px 4px 42px;padding:0 14px;border-radius:999px;border:1px solid var(--h7-line2,rgba(150,170,230,.34));background:rgba(10,13,24,.72);color:var(--h7-mint,#4de8c9);font:700 11px/1 var(--h7-mono,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;cursor:pointer}',
    '#ledger817 .l8-empty{margin:18px 12px;font:italic 500 14px/1.4 var(--h7-body,system-ui,sans-serif);color:var(--h7-dim,#95a0bd)}',
    '#ledger817 .l8-foot{flex:none;margin:0;padding:8px 16px 12px;font:400 10.5px/1.3 var(--h7-mono,ui-monospace,monospace);letter-spacing:.06em;color:var(--h7-dim,#95a0bd);border-top:1px solid rgba(120,150,220,.12)}'
  ].join('\n');
  /* the two doors (the Pause card, the Pouch's row): made at load, before the page itself */
  var CSS0 = 'html.c712 #ledger817Btn{display:none!important}#pauseRow #ledger817Btn small{display:block;font-size:10.5px;opacity:.8}' +
    '.l8-pouch{display:block;width:100%;min-height:44px;margin:4px 0 8px;padding:0 14px;border-radius:12px;border:0;background:#2c4a73;color:#fff;font:800 14px var(--body,system-ui);text-align:left}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function r3(v) { return Math.round((+v || 0) * 1000) / 1000; }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function create(o) {
    if (!o) return null;
    var A821 = window.WFR_ARRIVE821 || null, ROWS = (window.WFR_ARRIVE783 && WFR_ARRIVE783.PLACES) || [], ROWC = {}, ROWBY = {};
    ROWS.forEach(function (r) { ROWBY[r.id] = r; });
    if (A821) { Object.keys(A821.HAND || {}).forEach(function (c) { var id = A821.HAND[c]; (ROWC[id] || (ROWC[id] = [])).push(c); });
      Object.keys(A821.PART || {}).forEach(function (c) { var id = A821.PART[c]; (ROWC[id] || (ROWC[id] = [])).push(c); }); }
    var st = { known: {}, ref: null, queue: [], ver: 0, opens: 0, builds: 0, fills: 0, from: null, away: false, key: '', open: [], taps: [], err: '', adds: 0, places: 0, maps: 0, ticks: 0 };
    var el = null, list = null, nEl = null, pEl = null;
    function S() { return o.S(); }
    function day() { var d = 0; try { d = o.day(); } catch (e) { d = 0; } return d | 0; }
    function a821() { try { return o.a821 ? o.a821() : null; } catch (e) { return null; } }
    function rec(make) {
      var s = S(); if (!s) return null; s.seen = s.seen || {}; var r = s.seen.ledger817;
      if (!r || typeof r !== 'object' || !Array.isArray(r.c) || !r.p || typeof r.p !== 'object') { if (!make) return null; r = s.seen.ledger817 = { c: [], p: {} }; }
      return r;
    }
    /* the countries her flags say she has reached, in the order they were written: the hand rows first (Hispaniola is two countries), then every other one */
    function flags() {
      var s = S(), seen = (s && s.seen) || {}, a = seen.arrive783 || {}, b = seen.arrive821 || {}, out = [], has = {};
      Object.keys(a).forEach(function (k) { if (!a[k]) return; (ROWC[k] || []).forEach(function (c) { if (!has[c]) { has[c] = 1; out.push(c); } }); });
      Object.keys(b).forEach(function (c) { if (b[c] && !has[c]) { has[c] = 1; out.push(c); } });
      return out;
    }
    function rowOf(c) {   /* the hand row that made this country's arrival (Mexico's only when she came to it by the Yucatan) */
      if (!A821) return null; var id = (A821.HAND && A821.HAND[c]) || null; if (!id && A821.PART && A821.PART[c]) { var s = S(), a = (s && s.seen && s.seen.arrive783) || {}; if (a[A821.PART[c]]) id = A821.PART[c]; } return id ? ROWBY[id] || null : null; }
    function snap() { st.known = {}; st.ref = (S() && S().seen) || null; flags().forEach(function (c) { st.known[c] = 1; }); var r = rec(false); if (r) r.c.forEach(function (e) { st.known[e[0]] = 1; }); }
    function addPlace(c, n, k, d, la, lo) {
      var r = rec(true), L = r.p[c] || (r.p[c] = []), key = String(n).toLowerCase();
      for (var i = 0; i < L.length; i++) if (String(L[i][0]).toLowerCase() === key) { if (L[i][1] === WORDS.rumour && k !== WORDS.rumour) { L[i][1] = k; L[i][2] = d; return true; } return false; }   /* heard of, then reached: it keeps the day she reached it */
      if (L.length >= C.KEEP) return false; L.push([String(n), String(k || ''), d, r3(la), r3(lo)]); st.places++; return true;
    }
    function tick() {
      try {
        st.ticks++; var s = S(); if (!s) return; if ((s.seen || null) !== st.ref) snap();   /* a restored file brings its own record: what it holds is old, never new */
        var dirty = false, fl = flags(), d = day();
        for (var i = 0; i < fl.length; i++) { var c = fl[i]; if (st.known[c]) continue; st.known[c] = 1;
          var r = rec(true); if (!r.c.some(function (e) { return e[0] === c; })) { r.c.push([c, d]); st.adds++; dirty = true; }
          var row = rowOf(c); if (row && row.call && row.call.name) { var cs = ROWC[row.id] || [c], cc = c;   /* its rumour, under the country it lies in (Hispaniola's Citadelle: Haiti) */
            if (cs.length > 1) { var A = a821(); try { cc = (A && A.here(row.call.lat, row.call.lon)) || c; } catch (e) { cc = c; } if (cs.indexOf(cc) < 0) cc = c; }
            if (cc === c && addPlace(c, row.call.name, WORDS.rumour, d, row.call.lat, row.call.lon)) dirty = true; } }
        if (st.queue.length) { var A2 = a821(), rd = false; try { rd = !!(A2 && A2.ready()); } catch (e) { rd = false; }
          for (var j = 0; j < st.queue.length; j++) { var q = st.queue[j], cn = q.c; if (!cn) { if (!rd) continue; try { cn = A2.here(q.la, q.lo); } catch (e) { cn = null; } }
            q.done = true; if (cn && addPlace(cn, q.n, q.k, q.d, q.la, q.lo)) dirty = true; }
          st.queue = st.queue.filter(function (q) { return !q.done; }); if (st.queue.length > 40) st.queue.splice(0, st.queue.length - 40); }
        if (dirty) { st.ver++; try { o.save(); } catch (e) { st.err = 'save: ' + (e && e.message || e); } }
      } catch (e) { st.err = 'tick: ' + (e && e.message || e); }
    }
    /* a place's name rose over the world (places790, a city's card): noted now, written on the next tick (its country read from the world data) */
    function place(n, k, la, lo, c) {
      try { if (!n || !isFinite(la) || !isFinite(lo)) return false; var key = String(n).toLowerCase();
        for (var i = 0; i < st.queue.length; i++) if (String(st.queue[i].n).toLowerCase() === key) return false;
        st.queue.push({ n: String(n), k: k || '', la: +la, lo: +lo, c: c || null, d: day() }); return true; } catch (e) { st.err = 'place: ' + (e && e.message || e); return false; }
    }

    /* ---------- what the page shows ---------- */
    var CAP = null, CUR = null;
    function mapData() { return window.WFR_WORLDMAP712 || null; }
    function capitals() {   /* each country's capital (else its first city), for a tap on the country */
      if (CAP) return CAP; var M = mapData(); if (!M) return null; var q = M.q || 100, out = {};
      M.cities.forEach(function (x) { var c = M.countries[x[1]]; if (!c) return; if (!out[c] || (x[6] && !out[c].cap)) out[c] = { lat: x[2] / q, lon: x[3] / q, cap: !!x[6] }; }); return (CAP = out);
    }
    function curated() {   /* the hand-written places (places790-data CURATED), each with its country: for the hint, never their names */
      if (CUR) return CUR; var A = a821(), D = window.WFR_PLACES790_DATA; if (!A || !D || !D.CURATED) return null; var rd = false; try { rd = A.ready(); } catch (e) { rd = false; } if (!rd) return null;
      var out = {}; D.CURATED.forEach(function (p) { var c = null; try { c = A.here(p.la, p.lo); } catch (e) { c = null; } if (c) (out[c] || (out[c] = [])).push(String(p.n).toLowerCase()); }); return (CUR = out);
    }
    function nameOf(c) { var N = A821 && A821.NAME; return (N && N[c]) || c; }
    function lineOf(c) { var row = rowOf(c); if (row && row.under) return row.under; return (A821 && A821.LINE && A821.LINE[c]) || ''; }   /* a hand row's own line, else the country's written one */
    function model() {
      var r = rec(false), fl = flags(), inRec = {}, out = [], s = S(), Q = (s && s.quests) || null, LM = (window.WFR_QUESTS720 && WFR_QUESTS720.LANDMARKS) || [], A = a821(), rd = false;
      try { rd = !!(A && A.ready()); } catch (e) { rd = false; }
      if (r) r.c.forEach(function (e) { inRec[e[0]] = e[1]; });
      fl.forEach(function (c) { if (!(c in inRec)) out.push({ c: c, d: null }); });   /* an old file's countries: before the book */
      if (r) r.c.forEach(function (e) { out.push({ c: e[0], d: e[1] }); });
      var by = {}; out.forEach(function (x) { by[x.c] = x; x.places = ((r && r.p[x.c]) || []).map(function (p) { return { n: p[0], k: p[1], d: p[2], la: p[3], lo: p[4] }; }); });
      out.forEach(function (x) {   /* an old file's hand rows: their rumour was heard on the arrival */
        if (x.d != null) return; var row = rowOf(x.c); if (!row || !row.call || !row.call.name) return; var cs = ROWC[row.id] || [], cc = x.c;
        if (cs.length > 1 && rd) { try { cc = A.here(row.call.lat, row.call.lon) || x.c; } catch (e) { cc = x.c; } }
        if (cc !== x.c) return; var key = row.call.name.toLowerCase(); if (!x.places.some(function (p) { return p.n.toLowerCase() === key; })) x.places.unshift({ n: row.call.name, k: WORDS.rumour, d: null, la: row.call.lat, lo: row.call.lon }); });
      if (Q && Q.lm && rd) LM.forEach(function (L) {   /* the landmarks she reached (the quests' own record) */
        if (!Q.lm[L.id] || !isFinite(L.lat)) return; var c = null; try { c = A.here(L.lat, L.lon); } catch (e) { c = null; } var x = c && by[c]; if (!x) return; var key = String(L.name).toLowerCase();
        var had = x.places.filter(function (p) { return p.n.toLowerCase() === key; })[0]; if (had) { if (had.k === WORDS.rumour) had.k = WORDS.landmark; return; }
        x.places.push({ n: L.name, k: WORDS.landmark, d: null, la: L.lat, lo: L.lon }); });
      var CU = curated();
      out.forEach(function (x) { x.name = nameOf(x.c); x.line = lineOf(x.c); x.hint = 0;
        if (CU && CU[x.c]) { var seen = {}; x.places.forEach(function (p) { seen[p.n.toLowerCase()] = 1; }); x.hint = CU[x.c].filter(function (n) { return !seen[n]; }).length; } });
      var M = mapData(); return { list: out, total: M ? M.countries.length : null, places: out.reduce(function (n, x) { return n + x.places.length; }, 0) };
    }
    function counts(m) { var n = m.list.length; return (m.total ? n + WORDS.of + m.total + ' ' + WORDS.countries : n + ' ' + (n === 1 ? WORDS.country : WORDS.countries)); }
    function build() {
      if (el) return el; st.builds++;
      var s = document.createElement('style'); s.id = 'ledger817css'; s.textContent = CSS; document.head.appendChild(s);
      el = document.createElement('div'); el.id = 'ledger817'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', WORDS.title);
      el.innerHTML = "<div class='l8-win'><div class='l8-top'><div class='l8-eb'>" + esc(WORDS.eyebrow) + "</div><h2>" + esc(WORDS.title) + "</h2><p class='l8-sub'>" + esc(WORDS.sub) + "</p>" +
        "<div class='l8-stats'><b class='l8-n'></b><b class='l8-p'></b></div><button type='button' class='l8-map' aria-label='Open the world map'>" + esc(WORDS.map) + "</button><button type='button' class='l8-x' aria-label='" + esc(WORDS.close) + "'>✕</button></div>" +
        "<div class='l8-list' role='list'></div><p class='l8-foot'>" + esc(WORDS.tap) + "</p></div>";
      document.body.appendChild(el); list = el.querySelector('.l8-list'); nEl = el.querySelector('.l8-n'); pEl = el.querySelector('.l8-p');
      el.querySelector('.l8-x').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); close(); });
      el.querySelector('.l8-map').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toMap(null); });
      el.addEventListener('click', function (e) { if (e.target === el) { e.preventDefault(); close(); } });   /* a tap outside the page */
      list.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target.closest('[data-t],[data-more]') : null; if (!t) return; e.preventDefault(); e.stopPropagation();
        if (t.hasAttribute('data-more')) { var c = t.getAttribute('data-more'), i = st.open.indexOf(c); if (i < 0) st.open.push(c); else st.open.splice(i, 1); st.key = ''; fill(); return; }
        toMap(st.taps[+t.getAttribute('data-t')] || null);
      });
      ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });   /* her thumb on the page never reaches the world under it */
      return el;
    }
    function fill() {
      var m = model(), key = JSON.stringify([m.list.map(function (x) { return [x.c, x.d, x.places.length, x.places.map(function (p) { return p.k; }).join(), x.hint]; }), m.total, st.open]);
      nEl.textContent = counts(m); pEl.textContent = m.places + ' ' + (m.places === 1 ? WORDS.place : WORDS.places);
      if (key === st.key) return; st.key = key; st.fills++; st.taps = [];
      if (!m.list.length) { list.innerHTML = "<p class='l8-empty'>" + esc(WORDS.empty) + '</p>'; return; }
      var CP = capitals(), h = '';
      m.list.forEach(function (x, i) {
        var cp = CP && CP[x.c], first = x.places[0], at = cp ? { lat: cp.lat, lon: cp.lon } : first ? { lat: first.la, lon: first.lo } : null, ti = -1;
        if (at) { ti = st.taps.length; st.taps.push({ lat: at.lat, lon: at.lon, name: x.name, country: null }); }
        h += "<section class='l8-c' role='listitem' data-c='" + esc(x.c) + "'><button type='button' class='l8-ch'" + (ti >= 0 ? " data-t='" + ti + "'" : ' disabled') + '>' +
          "<span class='l8-no'>" + pad(i + 1) + "</span><span class='l8-cn'>" + esc(x.name) + "</span><span class='l8-day" + (x.d == null ? ' l8-old' : '') + "'>" + (x.d == null ? esc(WORDS.before) : esc(WORDS.day + x.d)) + '</span>' +
          (x.line ? "<span class='l8-line'>" + esc(x.line) + '</span>' : '') + '</button>';
        var open = st.open.indexOf(x.c) >= 0, show = open ? x.places : x.places.slice(0, C.SHOW);
        if (show.length) { h += "<ul class='l8-pl'>"; show.forEach(function (p) { var pi = st.taps.length; st.taps.push({ lat: p.la, lon: p.lo, name: p.n, country: x.name });
          h += "<li><button type='button' class='l8-pb" + (p.k === WORDS.rumour ? ' l8-r' : '') + "' data-t='" + pi + "'><span class='l8-pn'>" + esc(p.n) + "</span><span class='l8-pk'>" + esc([p.k, p.d == null ? '' : WORDS.day + p.d].filter(Boolean).join(' · ')) + '</span></button></li>'; });
          h += '</ul>'; }
        if (x.places.length > C.SHOW) h += "<button type='button' class='l8-more' data-more='" + esc(x.c) + "'>" + esc(open ? WORDS.less : WORDS.all + x.places.length) + '</button>';
        if (x.hint > 0) h += "<p class='l8-hint'>" + esc(x.hint === 1 ? WORDS.hint1 : x.hint + WORDS.hintN) + '</p>';
        h += '</section>';
      });
      list.innerHTML = h;
    }
    function isOpen() { return !!(el && !el.hidden && !st.away); }
    function open(from) {
      try { build(); st.from = from || 'pause'; st.away = false; el.classList.remove('l8-away'); var A = a821(); try { if (A) A.ready(); } catch (e) { /* the count waits for the world data */ }
        fill(); if (el.hidden) { el.hidden = false; list.scrollTop = 0; st.opens++; } wait(); return true; } catch (e) { st.err = 'open: ' + (e && e.message || e); return false; }
    }
    function wait() {   /* the world data comes in (the count's 220, the capitals, the hint): filled once more then */
      if (mapData() && curated()) return; var n = 0, f = function () { if (!isOpen() || ++n > 40) return; if (mapData() && curated()) { st.key = ''; fill(); return; } setTimeout(f, 250); }; setTimeout(f, 250);
    }
    function close() { if (!el || el.hidden) return false; el.hidden = true; st.away = false; el.classList.remove('l8-away'); try { if (o.closed) o.closed(st.from); } catch (e) { /* fine */ } st.from = null; return true; }
    function toMap(t) {   /* the page steps aside for the world map, and comes back when it closes */
      if (!o.map) return false; st.away = true; el.classList.add('l8-away'); var ok = false;
      try { ok = !!o.map(t ? t.lat : null, t ? t.lon : null, t ? t.name : null, t ? t.country : null, C.K_MAP, back); } catch (e) { ok = false; st.err = 'map: ' + (e && e.message || e); }
      if (!ok) back(); else st.maps++; return ok;
    }
    function back() { if (!el) return; st.away = false; el.classList.remove('l8-away'); }
    function pauseCard() {   /* beside the Journal on the Pause page */
      var row = document.getElementById('pauseRow'); if (!row || document.getElementById('ledger817Btn')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.id = 'ledger817Btn'; b.setAttribute('data-n795', '03'); b.style.order = '2';
      if (window.WFR_HUD795) { b.textContent = '🧵 ' + WORDS.card; var sm = document.createElement('small'); sm.textContent = WORDS.cardSub; sm.setAttribute('aria-hidden', 'true'); b.appendChild(sm); }
      else b.textContent = '🧵 ' + WORDS.card;
      var j = document.getElementById('journalBtn'); if (j && j.parentNode === row) row.insertBefore(b, j.nextSibling); else row.appendChild(b);
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var jn = document.getElementById('journal'); if (jn) jn.hidden = true; open('pause'); });
    }
    function pouch() { var fl = flags(), n = fl.length, r = rec(false); if (r) r.c.forEach(function (e) { if (fl.indexOf(e[0]) < 0) n++; });
      return '<h3>' + esc(WORDS.pouchH) + '</h3><button type="button" class="l8-pouch" data-l817="open">🧵 ' + esc(WORDS.pouchB) + ' · ' + n + ' ' + (n === 1 ? WORDS.country : WORDS.countries) + '</button>'; }
    document.addEventListener('click', function (e) { var t = e.target && e.target.closest ? e.target.closest('[data-l817]') : null; if (!t) return; e.preventDefault(); e.stopPropagation();
      try { if (o.fromPouch) o.fromPouch(); } catch (x) { /* fine */ } open('pouch'); }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); close(); } }, true);
    snap(); var css0 = document.createElement('style'); css0.id = 'ledger817css0'; css0.textContent = CSS0; document.head.appendChild(css0);
    pauseCard(); setInterval(tick, C.TICK_MS);
    function peek() { var r = rec(false); return { rec: r ? JSON.parse(JSON.stringify(r)) : null, flags: flags(), known: Object.keys(st.known), queue: st.queue.length, ver: st.ver, opens: st.opens, builds: st.builds, fills: st.fills, from: st.from, open: isOpen(), away: st.away, adds: st.adds, places: st.places, maps: st.maps, ticks: st.ticks, err: st.err }; }
    return { C: C, WORDS: WORDS, tick: tick, place: place, open: open, close: close, isOpen: isOpen, el: function () { return el; }, pouch: pouch, model: model, peek: peek, back: back };
  }
  return { C: C, WORDS: WORDS, create: create };
}());
