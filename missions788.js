/* missions788.js - BOARD 788, REPLAY THE PLACES: MISSIONS AND RANKS PER PLACE, AND CHICK BOOSTS FOUND OUT THERE (Wings for Rouge). Nov 13 2026.
   Marth, Nov 13 2026, verbatim: "And sonic adventure 2 battle - like the chaos drives (I guess the fruit for now) directly induces stage playing a lot - APART
   from the mission of each levels and trying to get A rank or higher". And "These are due and looping integration" (every system feeds the next).
   WHAT WE STUDIED (never copied): a stage you go back to because it holds things your pet needs, a short list of missions per stage, and a grade per run
   worth beating. Our own names, our own look, our own letters, our own rewards.

   WHAT IS HERE (the page wires it: wings-for-rouge.html, "788").
   GLIMMERS    each place grows its own kind of glimmer (a small bright seed in its strength's colour): three lie out in each place every day. Picked up, they
               go in her pouch; when she is next by her chick it eats them, and they raise its strengths like fruit does (the Lake's Dew Glimmer: Swim). Every
               mission run also pays glimmers of that place, more for a better grade. So she goes back to a place to grow her chick in its way.
   MISSIONS    every place on the home island (the Village, the Lighthouse, the Lake, the Highest Peak, the Dunes, the Cave, the Hermits' Cabin, the Race Track)
               and Dunn's River Falls in Jamaica has five: Gather the sparks (collect), Beat the clock (rings in order), a lost thing to find (warmer and colder,
               no arrow), Feather-light (sparks without touching down once) and the Storm run (the hard one, open after an A on Gather the sparks). Arriving
               at a place, a small card says so; one tap shows the five, each with her best grade.
   RANKS       every finished run is graded D, C, B, A or ★ (the star, above A) by her time against the course's own par (its length at her own cruise
               speed, so her level never wins it for her: her flying does). Her best is kept and shown. Every run pays coins and XP by its grade; her
               FIRST A and her FIRST ★ on each mission also pay runes and building materials (nails, logs, stones: the village's builds and 787's crafting);
               every ★ in a place pays a place prize once.
   THE RULES   pure (no THREE, no page): gradeOf, payOf, layout and the tables, so the guard and the numbers read the same code.
   Standard only (Classic is frozen: nothing here is built or said there). Every word, name and number a DRAFT for his pen and her thumb. */
window.WFR_MISSIONS788 = (function () {
  'use strict';
  var API = { error: '' };
  var STAT = { fly: ['Flight', 0x7ec8f0], run: ['Run', 0xf5a623], str: ['Strength', 0xe0533c], sta: ['Stamina', 0x6cc26a], swim: ['Swim', 0x3fbfb0], cre: ['Creativity', 0xff8fa3] };
  /* one row per place. r: the place's mission area (m, across from its spot); boost: its glimmer (gives: the strengths it raises, fruit is 4 of one);
     lost: the hidden mission's thing [emoji, name, hint]; mat: the materials its first A pays (its first star pays twice that). A world row (world: 1) is
     placed by lat/lon in the travel zone: a new country is a new row. */
  var PLACES = [
    { id: 'village', name: 'The Village', r: 44, boost: { id: 'hearth', e: '\u{1F7E2}', name: 'Hearth Glimmer', gives: { sta: 4 } }, lost: ['\u{1F9F5}', 'Ada’s lost thimble', 'Ada dropped her thimble somewhere round the green.'], mat: { nail: 2 } },
    { id: 'lighthouse', name: 'The Lighthouse', r: 40, boost: { id: 'beacon', e: '\u{1FA77}', name: 'Beacon Glimmer', gives: { cre: 4 } }, lost: ['\u{1F5DD}️', 'The keeper’s spare key', 'The keeper lost the spare key on the way up from the shore.'], mat: { nail: 2 } },
    { id: 'lake', name: 'The Lake', r: 46, boost: { id: 'dew', e: '\u{1F535}', name: 'Dew Glimmer', gives: { swim: 4 } }, lost: ['\u{1F3A3}', 'Hal’s lost float', 'Hal’s float drifted off. It is near the water somewhere.'], mat: { log: 2 } },
    { id: 'peak', name: 'The Highest Peak', r: 36, boost: { id: 'sky', e: '\u{1FA75}', name: 'Sky Glimmer', gives: { fly: 4 } }, lost: ['\u{1FAB6}', 'An old golden feather', 'A feather of the old one’s, blown off the top.'], mat: { stone: 2 } },
    { id: 'dunes', name: 'The Dunes', r: 40, boost: { id: 'sand', e: '\u{1F7E0}', name: 'Sand Glimmer', gives: { run: 4 } }, lost: ['\u{1F4C4}', 'A page of Pip’s book', 'The wind took a page of Pip’s book into the dunes.'], mat: { stone: 2 } },
    { id: 'cave', name: 'The Cave', r: 32, boost: { id: 'ember', e: '\u{1F534}', name: 'Ember Glimmer', gives: { str: 4 } }, lost: ['\u{1F48E}', 'A glowing pebble', 'A pebble that glows rolled out of the dark.'], mat: { stone: 3 } },
    { id: 'hermits', name: 'The Hermits’ Cabin', r: 34, boost: { id: 'moss', e: '\u{1F7E4}', name: 'Moss Glimmer', gives: { str: 2, sta: 2 } }, lost: ['\u{1FAA8}', 'A hermit’s rune stone', 'One of their rune stones is out in the grass.'], mat: { log: 2, nail: 1 } },
    { id: 'race', name: 'The Race Track', r: 40, boost: { id: 'dash', e: '\u{1F7E1}', name: 'Dash Glimmer', gives: { run: 2, fly: 2 } }, lost: ['\u{1F380}', 'A lost cup ribbon', 'A winner’s ribbon blew off the line.'], mat: { log: 3 } },
    { id: 'jamaica', world: 1, country: 'Jamaica', name: 'Dunn’s River Falls', lat: 18.4116, lon: -77.1406, r: 90, craft: { feather: 1, shell: 1 }, boost: { id: 'falls', e: '\u{1F48E}', name: 'Falls Glimmer', gives: { swim: 3, sta: 3 } }, lost: ['\u{1F965}', 'A carved calabash', 'Someone left a carved calabash by the river.'], mat: { log: 3, stone: 3 } }
  ];
  /* the five missions (the same five in every place; each place lays them out round its own spot). n: sparks or rings; T: the time she has (s);
     spread: how far out (share of r); hi: heights over the ground (m); lock: the mission whose A opens it */
  var KINDS = [
    { id: 'collect', e: '✨', name: 'Gather the sparks', line: 'Fly through all 8 sparks before the time runs out.', n: 8, T: 90, spread: 0.9, hi: [3, 11] },
    { id: 'clock', e: '⏱️', name: 'Beat the clock', line: 'Through the 7 rings in order, fast as you can.', n: 7, T: 90, spread: 0.75, hi: [4, 12] },
    { id: 'hidden', e: '\u{1F50E}', name: '', line: '', T: 150 },
    { id: 'clean', e: '\u{1FAB6}', name: 'Feather-light', line: 'Take off, then 6 sparks without touching down once.', n: 6, T: 90, spread: 0.85, hi: [4, 12] },
    { id: 'hard', e: '\u{1F32A}️', name: 'Storm run', line: '12 sparks, spread wide and high, and less time.', n: 12, T: 110, spread: 1.35, hi: [4, 22], lock: 'collect' }
  ];
  var GRADES = ['D', 'C', 'B', 'A', '★'];   /* 0..4; the star is above A */
  var CUT = { star: 0.8, A: 1.05, B: 1.5 };     /* her time over the par: at most 0.8 a star, 1.05 an A, 1.5 a B (a straight-steering autopilot flies about 0.7-0.85); any finish a C; half done when time ran out a D */
  var PAY = { coins: [1, 2, 3, 5, 8], xp: [10, 20, 30, 45, 60], boosts: [0, 1, 1, 2, 3] };
  var FIRST = { A: { coins: 6, runes: 6, mat: 1 }, star: { coins: 12, runes: 12, mat: 2, craft: { feather: 1 } } };   /* craft: into 787's own bag (craft787.js: S.seen.craft787.bag), so a star feeds the gear she makes */
  var CRAFT = { feather: ['🪶', 'long feather', 'long feathers'], shell: ['🦀', 'crab shell', 'crab shells'] };
  var ALLSTAR = { coins: 25, runes: 20 };
  var K = { PICK: 2.4, RING: 2.9, LEAVE: 2.2, LEAVE_W: 1.8, BANNER: 9, BACK: 1.3, GAP: 150, GLIM: 3, GLIM_SEE: 1.7, FEED: 6, COUNT: 3, PAUSE_MAX: 90, PAR_PAD: 0.6, PAR_V: 1.25, HID_PAR: 16, HID_SEE: 26, WORLD_K: 2 };
  var W0 = {   /* DRAFT, for his pen */
    missions: 'Missions', notNow: 'Not now', play: 'Play', again: 'Again', done: 'Done', locked: function (n) { return '\u{1F512} An A on ' + n + ' opens it'; },
    banner: function (P) { return P.name; }, bannerSub: function (P, r) { var n = 0, b = -1; KINDS.forEach(function (k) { var g = r.best[P.id + '.' + k.id]; if (g != null) { n++; if (g > b) b = g; } }); return '5 missions' + (n ? ' · best ' + GRADES[b] : '') + ' · tap'; }, best: 'Best', none: '—',
    glim: function (P, left) { var g = P.boost; return g.e + ' ' + g.name + 's (' + givesText(g.gives) + '): ' + left + ' of ' + K.GLIM + ' still out here today'; },
    count: ['3', '2', '1', 'Go!'], up: 'Take off to start: Feather-light counts once you are up.',
    touched: 'You touched down.', timeUp: 'Time!', left: 'You left the place.', stopped: 'The run stopped.',
    warm: ['Cold', 'Cool', 'Warm', 'Warmer', 'Hot!'], found: function (n) { return 'Found ' + n + '!'; },
    pick: function (g, n) { return 'Found a ' + g.name + ' (' + givesText(g.gives) + '). Your chick will love it · ' + n + ' in your pouch'; },
    ate: function (n, what) { return 'Your chick ate ' + n + ' glimmer' + (n === 1 ? '' : 's') + ' · ' + what; },
    gradeWord: ['Keep at it', 'Done!', 'Good flying!', 'Great flying!', 'A star!'],
    firstA: 'First A here', firstStar: 'First star here', allStar: function (P) { return 'Every star at ' + P.name + '!'; }
  };
  function givesText(g) { var out = []; for (var k in g) out.push((STAT[k] ? STAT[k][0] : k) + ' +' + g[k]); return out.join(', '); }
  function place(id) { for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return PLACES[i]; return null; }
  function kindOf(id) { for (var i = 0; i < KINDS.length; i++) if (KINDS[i].id === id) return KINDS[i]; return null; }
  function kindName(k, P) { return k.id === 'hidden' ? P.lost[1] : k.name; }
  function kindLine(k, P) { return k.id === 'hidden' ? P.lost[2] + ' No arrow: warmer and colder.' : k.line; }
  /* THE RULES (pure) */
  function rng(seed) { var s = 0; for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0; s = (s ^ 0x9e3779b9) >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* the grade: done = she finished; t her time (s); par the course's par (s); got/n what she had when the time ran out. -1 = no grade */
  function gradeOf(done, t, par, got, n) {
    if (!done) return n && got * 2 >= n ? 0 : -1;
    var r = t / Math.max(1, par); return r <= CUT.star ? 4 : r <= CUT.A ? 3 : r <= CUT.B ? 2 : 1;
  }
  /* what a run pays: by its grade, plus a first A / a first star on that mission (the best she had before: prev, -1 none). world rows pay K.WORLD_K times */
  function payOf(g, prev, P) {
    var x = P && P.world ? K.WORLD_K : 1, out = { coins: 0, xp: 0, runes: 0, boosts: 0, mat: {}, craft: {}, firstA: false, firstStar: false };
    if (g < 0) return out;
    out.coins = PAY.coins[g] * x; out.xp = PAY.xp[g] * x; out.boosts = PAY.boosts[g];
    var addMat = function (m) { for (var k in P.mat) out.mat[k] = (out.mat[k] || 0) + P.mat[k] * m; };
    if (g >= 3 && prev < 3) { out.firstA = true; out.coins += FIRST.A.coins * x; out.runes += FIRST.A.runes * x; addMat(FIRST.A.mat); }
    if (g >= 4 && prev < 4) { out.firstStar = true; out.coins += FIRST.star.coins * x; out.runes += FIRST.star.runes * x; addMat(FIRST.star.mat); var cr = P.craft || FIRST.star.craft; for (var ck in cr) out.craft[ck] = (out.craft[ck] || 0) + cr[ck]; }
    return out;
  }
  /* the course's par: the nearest-first tour from where she starts, at her cruise speed with her flaps (PAR_V: flapping carries her a quarter over cruise), plus a moment per spark (rings: in order) */
  function parOf(pts, from, v, ordered) {
    var left = pts.slice(), at = from, L = 0, n = pts.length;
    while (left.length) { var bi = 0, bd = 1e9; if (!ordered) for (var i = 0; i < left.length; i++) { var d = Math.hypot(left[i].x - at.x, left[i].y - at.y, left[i].z - at.z); if (d < bd) { bd = d; bi = i; } } else bd = Math.hypot(left[0].x - at.x, left[0].y - at.y, left[0].z - at.z);
      L += bd; at = left[bi]; left.splice(bi, 1); }
    return L / (Math.max(4, v) * K.PAR_V) + K.PAR_PAD * n;
  }
  /* a layout: n points round (0,0) within spread*r, heights hi, at least gap apart; ok(x, z, h) may refuse a spot (a roof or a crown above it) */
  function layout(seed, n, r, spread, hi, ok, ring) {
    var R = rng(seed), out = [], gap = Math.max(5, r * spread * 0.32), tries = 0;
    while (out.length < n && tries < n * 60) {
      tries++; var a, d;
      if (ring) { a = (out.length / n) * Math.PI * 2 + (R() - 0.5) * 0.5; d = r * spread * (0.55 + R() * 0.45); }
      else { a = R() * Math.PI * 2; d = r * spread * (0.25 + 0.75 * Math.sqrt(R())); }
      var p = { x: Math.sin(a) * d, z: Math.cos(a) * d, h: hi[0] + R() * (hi[1] - hi[0]) };
      var near = false; for (var i = 0; i < out.length; i++) if (Math.hypot(out[i].x - p.x, out[i].z - p.z) < gap * (tries > n * 30 ? 0.5 : 1)) { near = true; break; }
      if (near) continue; if (ok && !ok(p.x, p.z, p.h) && tries < n * 45) continue; out.push(p);
    }
    return out;
  }
  function rec0(m) { m = m && typeof m === 'object' ? m : {}; ['best', 'paid', 'pouch', 'got', 'all', 'runs'].forEach(function (k) { if (!m[k] || typeof m[k] !== 'object') m[k] = {}; }); if (typeof m.fed !== 'number') m.fed = 0; return m; }

  function create(o) {
    var THREE = o.THREE, L = o.layer;
    var A = { here: null, banner: null, card: null, res: null, chip: null, run: null, banT: 0, shownAt: {}, err: '', tick: 0, glim: {}, feeds: 0, picks: 0, runs: 0, ends: [], last: null, out: {}, pauseT: 0, lastWarm: -1, hidT: 0 };
    var V = new THREE.Vector3(), GOAL = new THREE.Vector3();
    function S() { return o.S; }
    function rec() { var s = S(); s.world = s.world || {}; return (s.world.m788 = rec0(s.world.m788)); }
    function classic() { try { return !!o.classic(); } catch (e) { return true; } }
    function travelOn() { return !!(o.T && o.T.on && o.T.f && o.W); }
    /* where a place is now: island rows from the page's own spots (ocarina781's), world rows from lat/lon in the travel zone's frame */
    function centre(P) {
      if (P.world) { if (!travelOn()) return null; var q = o.W.toLocal(o.T.f, P.lat, P.lon); return { x: q.x, z: q.z, y: gnd(P, q.x, q.z) }; }
      if (travelOn()) return null; var w = null; try { w = o.where(P.id); } catch (e) { w = null; } return w ? { x: w.x, z: w.z, y: w.y } : null;
    }
    function gnd(P, x, z) { try { return P.world ? Math.max(0, o.H(x, z)) : o.ground(x, z); } catch (e) { return 0; } }
    /* a point of a layout (offsets from the place's spot) in the scene now; a world row's offsets are metres east and north, put through lat/lon */
    function at(P, c, p, out) {
      if (P.world) { var lat = P.lat + p.z / 111320, lon = P.lon + p.x / (111320 * Math.cos(P.lat * Math.PI / 180)), q = o.W.toLocal(o.T.f, lat, lon); out.set(q.x, 0, q.z); }
      else out.set(c.x + p.x, 0, c.z + p.z);
      out.y = (p.abs != null ? p.abs : gnd(P, out.x, out.z)) + p.h; return out;
    }
    function scale(P) { return P.world ? 2.4 : 1; }
    /* ---------- the look: our own sparks, rings and glimmers ---------- */
    var HALO = null;
    function haloTex() {
      if (HALO) return HALO; var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      HALO = new THREE.CanvasTexture(c); return HALO;
    }
    function both(m) { m.traverse(function (q) { q.layers.enable(0); if (L != null) q.layers.enable(L); q.frustumCulled = false; }); return m; }
    function spark(col, size, beam) {   /* beam: a soft pillar of light over a mission's spark, so she sees where they are from across the place */
      var g = new THREE.Group(), core = new THREE.Mesh(new THREE.OctahedronGeometry(0.62 * size, 0), new THREE.MeshBasicMaterial({ color: col, fog: false }));
      var h = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: col, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      h.scale.setScalar(3.6 * size); g.add(core); g.add(h); g.userData.core = core; g.userData.halo = h;
      var rim = new THREE.Mesh(new THREE.TorusGeometry(1.05 * size, 0.09 * size, 6, 24), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false })); core.add(rim);   /* a pale rim round the gold: it reads against a bright sky and a dark wood alike */
      if (beam) { var bm = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * size, 0.16 * size, 14 * size, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4, depthWrite: false, fog: false })); bm.position.y = 7.6 * size; g.add(bm); g.userData.beam = bm; }
      o.scene.add(both(g)); return g;
    }
    function ring(size) {
      var g = new THREE.Group(), m = new THREE.Mesh(new THREE.TorusGeometry(2.4 * size, 0.2 * size, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 1, fog: false }));
      g.add(m); g.userData.m = m; o.scene.add(both(g)); return g;
    }
    function emojiSprite(e, size) {
      var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'); g.font = '96px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 64, 70);
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false })); s.scale.setScalar(size);
      var gr = new THREE.Group(), h = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: 0xfff2b0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      h.scale.setScalar(size * 1.6); gr.add(h); gr.add(s); gr.userData.halo = h; gr.userData.core = s; o.scene.add(both(gr)); return gr;
    }
    function drop(m) { if (!m) return; if (m.parent) m.parent.remove(m); m.traverse(function (q) { if (q.geometry) q.geometry.dispose(); if (q.material) { if (q.material.map && q.material.map !== HALO) q.material.map.dispose(); q.material.dispose(); } }); }
    /* ---------- the DOM: one style, our cards ---------- */
    function css() {
      if (document.getElementById('m788css')) return; var s = document.createElement('style'); s.id = 'm788css';
      s.textContent = '#m788ban,#m788card,#m788res{position:fixed;left:50%;transform:translateX(-50%);width:min(440px,calc(100vw - 24px));box-sizing:border-box;z-index:44;background:#fff8ea;color:#3b2a1a;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.35);font-family:var(--body,system-ui)}' +
        '#m788ban{top:calc(env(safe-area-inset-top,0px) + 222px);width:auto;max-width:calc(100vw - 24px);padding:8px 18px 8px 12px;display:flex;align-items:center;gap:10px;border-radius:999px;cursor:pointer;border:2px solid #e3b75a;white-space:nowrap}' +
        '#m788ban .e{font-size:24px;line-height:1}#m788ban b{display:block;font:600 17px Georgia,serif}#m788ban small{display:block;font:800 11.5px var(--body,system-ui);color:#a0742a;letter-spacing:.06em;text-transform:uppercase}#m788ban.mini{padding:5px 14px 5px 9px;border-width:1.5px;opacity:.92}#m788ban.mini .e{font-size:19px}#m788ban.mini b{font-size:14px}#m788ban.mini small{font-size:10px}' +
        '#m788card{bottom:calc(env(safe-area-inset-bottom,0px) + 12px);max-height:calc(100vh - 150px);display:flex;flex-direction:column;overflow:hidden;padding:14px 14px 10px}' +
        '#m788card .k,#m788res .k{font:800 11px var(--body,system-ui);letter-spacing:.12em;text-transform:uppercase;color:#a0742a}#m788card h3{margin:2px 0 2px;font:600 23px Georgia,serif}' +
        '#m788card .gl{font:600 12.5px/1.35 var(--body,system-ui);color:#5a4026;margin:0 0 6px;padding:6px 8px;background:rgba(227,183,90,.18);border-radius:10px}#m788card .rows{flex:1 1 auto;min-height:0;overflow:auto}' +
        '#m788card .r{display:flex;align-items:center;gap:10px;padding:7px 2px;border-top:1px solid rgba(60,40,20,.1)}#m788card .r .e{flex:0 0 30px;font-size:22px;text-align:center}#m788card .r .t{flex:1;min-width:0}' +
        '#m788card .r b{display:block;font:700 15px var(--body,system-ui)}#m788card .r small{display:block;font:600 12px/1.3 var(--body,system-ui);color:#7a5a3a}' +
        '#m788card .g,#m788res .big{flex:0 0 34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 17px Georgia,serif;background:#efe3c8;color:#9a8460}' +
        '#m788card .g.s3,#m788res .big.s3{background:#2e8b57;color:#fff}#m788card .g.s4,#m788res .big.s4{background:linear-gradient(135deg,#ffd75e,#f0a020);color:#fff;text-shadow:0 1px 2px rgba(120,60,0,.6)}#m788card .g.s2,#m788res .big.s2{background:#4a7fc0;color:#fff}#m788card .g.s1,#m788card .g.s0,#m788res .big.s1,#m788res .big.s0{background:#b49a74;color:#fff}' +
        '#m788card button,#m788res button{text-transform:none!important;letter-spacing:0!important}#m788card .r button{flex:0 0 auto;min-height:40px;min-width:62px;border-radius:12px!important;border:0;background:#c8314a!important;color:#fff!important;font:800 14px var(--body,system-ui)!important;box-shadow:0 2px 6px rgba(0,0,0,.2)!important;filter:none!important}' +
        '#m788card .r.lock{opacity:.6}#m788card .r.lock button{display:none}' +
        '#m788card .no,#m788res button{display:block;width:100%;margin-top:8px;min-height:46px;border-radius:14px!important;border:2px solid rgba(60,40,20,.2);background:#fff!important;color:#3b2a1a!important;font:800 15px var(--body,system-ui)!important;filter:none!important}' +
        '#m788res{top:calc(env(safe-area-inset-top,0px) + 112px);padding:16px 16px 12px;text-align:center}#m788res .big{width:84px;height:84px;margin:6px auto 4px;font-size:46px;flex:none}#m788res h3{margin:2px 0;font:600 21px Georgia,serif}' +
        '#m788res p{margin:4px 0;font:600 13.5px/1.4 var(--body,system-ui);color:#5a4026}#m788res .pay{font-weight:800;color:#3b2a1a}#m788res .row{display:flex;gap:10px}#m788res .row button{flex:1}#m788res .row button.go{background:#c8314a!important;color:#fff!important;border:0}' +
        '#m788chip{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 112px);z-index:30;padding:7px 16px;border-radius:999px;background:rgba(30,20,10,.62);color:#fff;font:800 16px var(--body,system-ui);letter-spacing:.02em;white-space:nowrap;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,.5)}' +
        '#m788chip.cd{font-size:34px;padding:6px 26px}#m788chip.low{background:rgba(170,40,40,.75)}';
      document.head.appendChild(s);
    }
    function el(id, tag) { var e = document.getElementById(id); if (!e) { e = document.createElement(tag || 'div'); e.id = id; e.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); }, true); document.body.appendChild(e); } return e; }
    function kill(id) { var e = document.getElementById(id); if (e) e.remove(); }
    function gradeBadge(g) { return '<span class="g s' + g + '">' + (g >= 0 ? GRADES[g] : W0.none) + '</span>'; }
    function glimLeft(P) { var r = rec(), d = o.day(), gt = r.got[P.id]; if (!gt || gt[0] !== d) return K.GLIM; var n = 0; for (var i = 0; i < K.GLIM; i++) if (!(gt[1] & (1 << i))) n++; return n; }
    /* ---------- the arrival card ---------- */
    function banner(P, mini) {
      css(); var b = el('m788ban'); b.className = mini ? 'mini' : ''; b.style.visibility = ''; b.innerHTML = '<span class="e">\u{1F3C5}</span><span><b></b><small></small></span>';
      b.querySelector('b').textContent = W0.banner(P); b.querySelector('small').textContent = W0.bannerSub(P, rec());
      b.onclick = function (e) { e.stopPropagation(); openCard(); };
      A.banner = P.id; A.banT = mini ? K.BANNER : 0; if (mini) return; A.shownAt[P.id] = o.S.played || 0; A.bans = (A.bans || 0) + 1;
      try { o.pick(true); } catch (e) { /* the card shows without its note */ }
    }
    function bannerOff() { kill('m788ban'); A.banner = null; }
    function openCard() {
      var P = place(A.here); if (!P || A.run) return false; css(); bannerOff(); var r = rec();
      var c = el('m788card'), h = '<div class="k">' + (P.country ? P.country + ' · ' : '') + W0.missions + '</div><h3></h3><div class="gl"></div><div class="rows">';
      KINDS.forEach(function (k) { var key = P.id + '.' + k.id, g = r.best[key] != null ? r.best[key] : -1, lk = locked(P, k);
        h += '<div class="r' + (lk ? ' lock' : '') + '" data-k="' + k.id + '"><div class="e">' + (k.id === 'hidden' ? P.lost[0] : k.e) + '</div><div class="t"><b></b><small></small></div>' + gradeBadge(g) + '<button type="button">' + W0.play + '</button></div>'; });
      h += '</div><button type="button" class="no">' + W0.notNow + '</button>'; c.innerHTML = h;
      c.querySelector('h3').textContent = P.name; c.querySelector('.gl').textContent = W0.glim(P, glimLeft(P));
      KINDS.forEach(function (k) { var row = c.querySelector('.r[data-k="' + k.id + '"]'), lk = locked(P, k); row.querySelector('b').textContent = kindName(k, P); row.querySelector('small').textContent = lk ? W0.locked(kindName(kindOf(k.lock), P)) : kindLine(k, P);
        row.querySelector('button').addEventListener('click', function (e) { e.stopPropagation(); closeCard(); start(P.id, k.id); }); });
      c.querySelector('.no').addEventListener('click', function (e) { e.stopPropagation(); closeCard(); });
      A.card = P.id; A.cards = (A.cards || 0) + 1; o.S.talking = true; return true;
    }
    function closeCard() { kill('m788card'); if (A.card) { A.card = null; o.S.talking = false; try { o.hud(); } catch (e) { /* the pill catches up */ } if (A.here && !A.run) banner(place(A.here), true); } }
    function locked(P, k) { if (!k.lock) return false; var b = rec().best[P.id + '.' + k.lock]; return !(b >= 3); }
    /* ---------- a run ---------- */
    function start(pid, kid) {
      var P = place(pid), k = kindOf(kid), c = P && centre(P), s = S(); if (!P || !k || !c || A.run || classic()) return false; if (locked(P, k)) return false;
      var sz = scale(P), r = P.r, okFn = P.world ? null : function (x, z, h) { try { var y = o.ground(c.x + x, c.z + z) + h; V.set(c.x + x, y, c.z + z); return o.clear(new THREE.Vector3(V.x, y + 40, V.z), V); } catch (e) { return true; } };
      var R = { pid: pid, kid: kid, t: 0, cd: 0, cn: -1, ph: 'count', got: 0, n: 0, pts: [], meshes: [], next: 0, armed: kid !== 'clean', par: 0, from: { x: s.pos.x, y: s.pos.y, z: s.pos.z }, paused: 0 };
      if (kid === 'hidden') {
        var d = o.day(), H = layout(pid + ':lost:' + d, 1, r, 0.8, [0.5, 0.5], okFn)[0]; H.abs = null; R.pts = [H]; R.n = 1;
        var m = emojiSprite(P.lost[0], 1.3 * sz); R.meshes = [m];
        at(P, c, H, V); R.par = K.HID_PAR + Math.hypot(V.x - s.pos.x, V.z - s.pos.z) / Math.max(4, o.cruise()) * 1.5;
      } else {
        var pts = layout(pid + ':' + kid, k.n, r, k.spread, k.hi.map(function (h) { return h * (P.world ? 1.8 : 1); }), okFn, kid === 'clock');
        R.pts = pts; R.n = pts.length;
        R.meshes = pts.map(function () { return kid === 'clock' ? ring(sz) : spark(kid === 'hard' ? 0x9a7bff : 0xffb21e, sz, true); });
        var world = pts.map(function (p) { at(P, c, p, V); return { x: V.x, y: V.y, z: V.z }; });
        R.par = parOf(world, R.from, o.cruise(), kid === 'clock');
      }
      R.par = +R.par.toFixed(1); A.run = R; A.runs++; R.T = k.T * (P.world ? 1.5 : 1); bannerOff(); closeCard(); A.lastWarm = -1;
      var rc = rec(); rc.runs[pid + '.' + kid] = (rc.runs[pid + '.' + kid] || 0) + 1;
      chip(); place3d(); return true;
    }
    function place3d() {
      var R = A.run; if (!R) return; var P = place(R.pid), c = centre(P); if (!c) return; var t = o.S.t || 0;
      R.pts.forEach(function (p, i) { var m = R.meshes[i]; if (!m) return; at(P, c, p, V);
        if (R.kid === 'clock') { var on = i >= R.next && i <= R.next + 1; m.visible = on; m.position.copy(V); var nx = R.pts[i + 1] || R.pts[i - 1]; if (nx) { var Q = at(P, c, nx, new THREE.Vector3()); m.lookAt(Q.x, V.y, Q.z); } m.userData.m.material.opacity = i === R.next ? 1 : 0.35; m.userData.m.material.color.setHex(i === R.next ? 0xffd166 : 0xffffff); }
        else if (R.kid === 'hidden') { m.position.copy(V); m.position.y += Math.sin(t * 2) * 0.12; var dd = Math.hypot(V.x - o.S.pos.x, V.z - o.S.pos.z), k2 = Math.max(0, Math.min(1, (K.HID_SEE * scale(P) - dd) / 8)); m.visible = !p.got && k2 > 0; m.userData.core.material.opacity = k2; m.userData.halo.material.opacity = 0.5 * k2; }
        else { m.visible = !p.got; m.position.copy(V); m.position.y += Math.sin(t * 2.2 + i) * 0.25; m.userData.core.rotation.y = t * 2 + i; m.userData.halo.material.opacity = 0.65 + Math.sin(t * 4 + i) * 0.2; } });
    }
    function fmt(s) { s = Math.max(0, s); var m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + (r < 10 ? '0' : '') + r; }
    function chip() {
      var R = A.run; if (!R) { kill('m788chip'); return; } css(); var c = el('m788chip'), P = place(R.pid), k = kindOf(R.kid);
      if (R.ph === 'count' || R.go > 0) { c.className = 'cd'; c.textContent = W0.count[Math.max(0, R.cn)]; return; }
      var left = R.T - R.t; c.className = left < 10 ? 'low' : '';
      var what = R.kid === 'hidden' ? (P.lost[0] + ' ' + warmWord()) : R.kid === 'clock' ? ('⏱️ ' + R.got + ' / ' + R.n) : ((R.kid === 'clean' ? '\u{1FAB6} ' : '✨ ') + R.got + ' / ' + R.n);
      c.textContent = (R.kid === 'clean' && !R.armed ? W0.up : what + ' · ' + fmt(left));
    }
    function warmWord() { var R = A.run; if (!R || R.kid !== 'hidden') return ''; var P = place(R.pid), c = centre(P); if (!c) return ''; at(P, c, R.pts[0], V);
      var d = Math.hypot(V.x - o.S.pos.x, V.z - o.S.pos.z) / scale(P), i = d < 10 ? 4 : d < 20 ? 3 : d < 35 ? 2 : d < 55 ? 1 : 0;
      if (i !== A.lastWarm && A.lastWarm >= 0 && i > A.lastWarm) { try { o.pick(false); } catch (e) { /* quiet */ } } A.lastWarm = i; return W0.warm[i]; }
    function runTick(real) {
      var R = A.run, s = S(), P = place(R.pid), c = centre(P), k = kindOf(R.kid);
      if (!c) { end(false, 'stopped'); return; }
      var why = ''; try { why = o.busy() || ''; } catch (e) { why = ''; }
      if (why === 'away') { end(false, 'stopped'); return; }
      var hold = s.mode === 'paused' || s.talking || (why !== '' && why !== 'm788' && why !== 'mode' && why !== 'race');
      if (hold) { R.paused += real; if (R.paused > K.PAUSE_MAX) end(false, 'stopped'); place3d(); return; }
      if (R.ph === 'count') { R.cd += real; var n = Math.min(2, Math.floor(R.cd)); if (n !== R.cn) { R.cn = n; chip(); try { o.pick(false); } catch (e) { /* quiet */ } } if (R.cd >= K.COUNT) { R.ph = 'run'; R.go = 0.9; R.cn = 3; chip(); try { o.pick(true); } catch (e) { /* quiet */ } } place3d(); return; }
      if (R.go > 0) R.go = Math.max(0, R.go - real);   /* Go! shows for a moment while her clock already runs */
      var air = s.mode === 'fly' || s.mode === 'hover';
      if (R.kid === 'clean') { var low = s.pos.y - gnd(P, s.pos.x, s.pos.z);
        if (!R.armed) { if (air && low > 2) R.armed = true; else { place3d(); chip(); return; } }   /* her clock starts once she is up */
        else if (!air || low < 0.35) { end(false, 'touched'); return; } }
      R.t += real;
      var dC = Math.hypot(s.pos.x - c.x, s.pos.z - c.z); if (dC > P.r * (P.world ? K.LEAVE_W : K.LEAVE)) { end(false, 'left'); return; }
      var pr = (K.PICK + o.size()) * scale(P);
      for (var i = 0; i < R.pts.length; i++) { var p = R.pts[i]; if (p.got) continue; if (R.kid === 'clock' && i !== R.next) continue; at(P, c, p, V);
        var dx = V.x - s.pos.x, dy = V.y - s.pos.y, dz = V.z - s.pos.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < (R.kid === 'clock' ? K.RING * scale(P) + o.size() : R.kid === 'hidden' ? pr + 1.2 : pr)) { p.got = true; R.got++; if (R.kid === 'clock') { R.next++; R.meshes[i].visible = false; } try { o.pick(R.got === R.n); } catch (e) { /* quiet */ } } }
      place3d();
      if (R.got >= R.n) { end(true, 'done'); return; }
      if (R.t >= R.T) { end(false, 'timeUp'); return; }
      chip();
    }
    function end(done, why) {
      var R = A.run; if (!R) return; A.run = null; R.meshes.forEach(drop); kill('m788chip');
      var P = place(R.pid), s = S(), r = rec(), key = R.pid + '.' + R.kid, prev = r.best[key] != null ? r.best[key] : -1;
      var g = why === 'stopped' || why === 'left' || why === 'touched' ? -1 : gradeOf(done, R.t, R.par, R.got, R.n);
      var pay = payOf(g, prev, P), newBest = g > prev;
      if (newBest) r.best[key] = g;
      var all = KINDS.every(function (k) { return r.best[P.id + '.' + k.id] >= 4; }), allNew = all && !r.all[P.id];
      if (allNew) { r.all[P.id] = 1; pay.coins += ALLSTAR.coins; pay.runes += ALLSTAR.runes; }
      if (pay.runes) s.runes = (s.runes || 0) + pay.runes;
      if (pay.coins) o.coin(pay.coins, P.name, s.pos); if (pay.xp) o.xp(pay.xp, P.name);
      var inv = s.inv = s.inv || {}; for (var mk in pay.mat) inv[mk] = (inv[mk] || 0) + pay.mat[mk];
      if (Object.keys(pay.craft).length) { s.seen = s.seen || {}; var c787 = s.seen.craft787; if (!c787 || typeof c787 !== 'object') c787 = s.seen.craft787 = {}; c787.bag = c787.bag || {}; for (var ck in pay.craft) c787.bag[ck] = (c787.bag[ck] | 0) + pay.craft[ck]; }   /* 787's bag, its own shape */
      if (pay.boosts) r.pouch[P.boost.id] = (r.pouch[P.boost.id] || 0) + pay.boosts;
      A.last = { pid: R.pid, kid: R.kid, done: done, why: why, t: +R.t.toFixed(1), par: R.par, g: g, prev: prev, got: R.got, n: R.n, pay: JSON.parse(JSON.stringify(pay)), allNew: allNew };
      A.ends.push(A.last); if (A.ends.length > 20) A.ends.shift();
      try { o.save(); } catch (e) { /* the result still shows */ }
      result(P, R, g, prev, pay, why, allNew);
    }
    function result(P, R, g, prev, pay, why, allNew) {
      css(); var c = el('m788res'), k = kindOf(R.kid), lines = [];
      var head = g >= 0 ? W0.gradeWord[g] : (W0[why] || W0.stopped);
      if (R.kid !== 'hidden' || g >= 0) lines.push((g >= 0 ? fmt(R.t) + ' · par ' + fmt(R.par) : R.got + ' / ' + R.n) + (prev >= 0 ? ' · ' + W0.best + ' ' + GRADES[Math.max(prev, g)] : ''));
      var payL = []; if (pay.coins) payL.push('\u{1FA99} ' + pay.coins); if (pay.runes) payL.push('✦ ' + pay.runes + ' runes'); for (var mk in pay.mat) payL.push(({ nail: '\u{1F529}', log: '\u{1FAB5}', stone: '\u{1FAA8}' })[mk] + ' ' + pay.mat[mk]);
      for (var ck in pay.craft) if (CRAFT[ck]) payL.push(CRAFT[ck][0] + ' ' + pay.craft[ck] + ' ' + CRAFT[ck][pay.craft[ck] > 1 ? 2 : 1]);
      if (pay.boosts) payL.push(P.boost.e + ' ' + pay.boosts + ' ' + P.boost.name + (pay.boosts > 1 ? 's' : ''));
      var tags = []; if (pay.firstStar) tags.push(W0.firstStar); else if (pay.firstA) tags.push(W0.firstA); if (allNew) tags.push(W0.allStar(P));
      c.innerHTML = '<div class="k"></div><div class="big s' + Math.max(0, g) + '">' + (g >= 0 ? GRADES[g] : '—') + '</div><h3></h3><p class="ln"></p><p class="tags pay"></p><p class="pay"></p><div class="row"><button type="button" class="again">' + W0.again + '</button><button type="button" class="go">' + W0.done + '</button></div>';
      c.querySelector('.k').textContent = P.name + ' · ' + kindName(k, P); c.querySelector('h3').textContent = head; c.querySelector('.ln').textContent = lines.join(' ');
      c.querySelector('.tags').textContent = tags.join(' · '); c.querySelector('p.pay:not(.tags)').textContent = payL.length ? payL.join('  ') : '';
      c.querySelector('.again').addEventListener('click', function (e) { e.stopPropagation(); closeRes(); start(R.pid, R.kid); });
      c.querySelector('.go').addEventListener('click', function (e) { e.stopPropagation(); closeRes(); });
      A.res = { g: g, why: why }; o.S.talking = true;
      try { if (g >= 3) o.sound('found'); else o.pick(g >= 0); } catch (e) { /* quiet */ }
    }
    function closeRes() {
      kill('m788res'); if (!A.res) return; A.res = null; o.S.talking = false;
      try { o.hud(); } catch (e) { /* the pill catches up */ } if (A.here) banner(place(A.here), true);
    }
    /* ---------- glimmers out in the places, and the chick eating them ---------- */
    function glimPts(P) { return layout(P.id + ':glim:' + o.day(), K.GLIM, P.r, 0.85, [1.1, 1.1], P.world ? null : function (x, z) { var c = centre(P); if (!c) return true; try { var y = o.ground(c.x + x, c.z + z) + 1.1; V.set(c.x + x, y, c.z + z); return o.clear(new THREE.Vector3(V.x, y + 40, V.z), V); } catch (e) { return true; } }); }
    /* #140 THE GLIMMERS' POOL (fall748 N1: nothing added to the scene while she plays): the glimmer sparks are made at load, two places' worth at each size
       (the island's and the world's), recoloured and reused as she comes and goes; never dropped (their programs stay too) */
    var GPOOL = [];
    function glimGet(col, size) { var i, q = null; for (i = 0; i < GPOOL.length; i++) if (!GPOOL[i].busy && Math.abs(GPOOL[i].size - size) < 1e-6) { q = GPOOL[i]; break; }
      if (!q) { q = { g: spark(col, size), size: size, busy: false }; GPOOL.push(q); } q.busy = true; q.g.userData.core.material.color.set(col); q.g.userData.halo.material.color.set(col); q.g.visible = true; return q.g; }
    function glimFree(g) { for (var i = 0; i < GPOOL.length; i++) if (GPOOL[i].g === g) { GPOOL[i].busy = false; g.visible = false; return; } drop(g); }
    function glimWarm() { try { [0.7, 0.7 * 2.4].forEach(function (sz) { for (var i = 0; i < K.GLIM * 2; i++) { var g = glimGet(0xffffff, sz); g.position.set(0, -80, 0); } }); GPOOL.forEach(function (q) { q.busy = false; q.g.visible = false; }); } catch (e) { /* the pool fills as she plays */ } }
    function glimTick() {
      var s = S(), d = o.day(), r = rec(), keep = {};
      PLACES.forEach(function (P) {
        var c = centre(P); if (!c) return; var dC = Math.hypot(s.pos.x - c.x, s.pos.z - c.z); if (dC > P.r * K.GLIM_SEE) return;
        var G = A.glim[P.id]; if (!G || G.day !== d) { if (G) G.m.forEach(glimFree); G = A.glim[P.id] = { day: d, pts: glimPts(P), m: [] }; var col = STAT[Object.keys(P.boost.gives)[0]][1]; G.m = G.pts.map(function () { return glimGet(col, 0.7 * scale(P)); }); }
        keep[P.id] = 1; var gt = r.got[P.id]; if (!gt || gt[0] !== d) gt = r.got[P.id] = [d, 0];
        G.pts.forEach(function (p, i) { var m = G.m[i]; if (gt[1] & (1 << i)) { m.visible = false; return; } at(P, c, p, V); m.visible = true; m.position.copy(V); m.position.y += Math.sin((s.t || 0) * 2 + i) * 0.15; m.userData.core.rotation.y = (s.t || 0) * 1.5 + i;
          var dd = V.distanceTo(s.pos); if (!A.run && dd < (K.PICK + o.size()) * scale(P)) { gt[1] |= 1 << i; m.visible = false; r.pouch[P.boost.id] = (r.pouch[P.boost.id] || 0) + 1; A.picks++; try { o.pick(true); o.toast(W0.pick(P.boost, pouchN()), 3200); o.save(); } catch (e) { /* kept */ } } });
      });
      for (var id in A.glim) if (!keep[id]) { A.glim[id].m.forEach(glimFree); delete A.glim[id]; }
    }
    function pouchN() { var p = rec().pouch, n = 0; for (var k in p) n += p[k] || 0; return n; }
    function feedTick() {
      var s = S(); if (A.run || A.card || A.res || s.talking || !pouchN()) return; if (['walk', 'fly', 'hover'].indexOf(s.mode) < 0) return;
      var cp = null; try { cp = o.chick(); } catch (e) { cp = null; } if (!cp || cp.distanceTo(s.pos) > K.FEED) return;
      var r = rec(), tot = {}, n = 0, cols = [];
      PLACES.forEach(function (P) { var q = r.pouch[P.boost.id] || 0; if (!q) return; n += q; for (var k in P.boost.gives) { tot[k] = (tot[k] || 0) + P.boost.gives[k] * q; if (cols.indexOf(STAT[k][1]) < 0) cols.push(STAT[k][1]); } r.pouch[P.boost.id] = 0; });
      var ups = [], what = []; for (var k in tot) { var u = o.addStat(k, tot[k]); if (u) ups.push(u); what.push(STAT[k][0] + ' +' + tot[k]); }
      r.fed += n; A.feeds++; A.lastFeed = { n: n, tot: tot };
      try { o.fed(cols); } catch (e) { /* the numbers are true without the burst */ }
      o.toast(W0.ate(n, what.join(', ')) + (ups.length ? ' — ' + ups.join(' ') : ''), ups.length ? 4200 : 3200); o.save();
    }
    /* ---------- where she is, and the card when she arrives ---------- */
    function hereTick() {
      var s = S(), best = null, bd = 1e9;
      PLACES.forEach(function (P) { var c = centre(P); if (!c) return; var d = Math.hypot(s.pos.x - c.x, s.pos.z - c.z), lim = P.r * (A.here === P.id ? K.BACK : 1); if (d < lim && d < bd) { bd = d; best = P; } });
      var was = A.here; A.here = best ? best.id : null;
      if (A.here !== was) { bannerOff(); if (A.card) closeCard(); A.arrived = 0; }
      if (!A.here || A.run || A.card || A.res) return;
      var why = ''; try { why = o.busy() || ''; } catch (e) { why = 'busy'; } var calm = why === '' || why === 'm788';
      if (A.banner) { var b = document.getElementById('m788ban'); if (calm) A.banT += 0.25;   /* its full time counts only while she can see it (795's drop-in hides it on an arrival out there) */ if (b) { if (A.banT > K.BANNER) b.classList.add('mini'); b.style.visibility = calm ? '' : 'hidden'; } return; }
      if (!calm) { A.arrived = 0; return; }
      A.arrived += 0.25; if (A.arrived < 1.2) return;   /* calm for a moment after she came in (a first arrival's scene goes first) */
      var P = place(A.here), seen = A.shownAt[P.id]; banner(P, seen != null && (o.S.played || 0) - seen < K.GAP);   /* back within GAP seconds: the small pill only */
    }
    function tick(dt, real) {
      try {
        if (classic()) return; var rl = real || dt;
        if (A.run) runTick(rl);
        if ((A.tick += rl) < 0.25) return; A.tick = 0;
        hereTick(); glimTick(); feedTick();
      } catch (e) { A.err = String(e && e.message || e); }
    }
    function goal() {
      var R = A.run; if (!R || R.kid === 'hidden') return null; var P = place(R.pid), c = centre(P), s = S(); if (!c) return null;
      if (R.kid === 'clock') { var q = R.pts[R.next]; return q ? at(P, c, q, GOAL) : null; }
      var best = null, bd = 1e9; R.pts.forEach(function (p) { if (p.got) return; at(P, c, p, V); var d = V.distanceTo(s.pos); if (d < bd) { bd = d; best = p; } });
      return best ? at(P, c, best, GOAL) : null;
    }
    function peek() {
      var R = A.run, r = rec(), P = A.here ? place(A.here) : null, pts = null;
      if (R) { var PP = place(R.pid), c = centre(PP); pts = c ? R.pts.map(function (p) { var q = at(PP, c, p, new THREE.Vector3()); return [+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2), p.got ? 1 : 0]; }) : null; }
      return { here: A.here, banner: A.banner, card: A.card, res: A.res, run: R ? { pid: R.pid, kid: R.kid, ph: R.ph, t: +R.t.toFixed(2), T: R.T, got: R.got, n: R.n, next: R.next, par: R.par, armed: R.armed, paused: +R.paused.toFixed(2), pts: pts } : null,
        last: A.last, ends: A.ends.slice(), rec: JSON.parse(JSON.stringify(r)), pouch: pouchN(), picks: A.picks, feeds: A.feeds, lastFeed: A.lastFeed || null, runs: A.runs, bans: A.bans || 0, cards: A.cards || 0,
        glim: Object.keys(A.glim).map(function (id) { var G = A.glim[id], PP = place(id), c = centre(PP); return { id: id, day: G.day, at: c ? G.pts.map(function (p) { var q = at(PP, c, p, new THREE.Vector3()); return [+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2)]; }) : null, vis: G.m.map(function (m) { return m.visible; }) }; }),
        left: P ? glimLeft(P) : null, chip: (document.getElementById('m788chip') || {}).textContent || '', err: A.err };
    }
    /* THE KEEPERS (for ship #140; after786 H2 found a MeshBasic program compiled mid-race the day the glimmers were laid again): one spark with its beam, one ring and one
       glimmer made at load, a hair's size, under the island and never dropped. Their programs compile with the first frame at boot and stay alive, so a place's new sparks,
       rings and glimmers (and drop()'s dispose of the old ones) never compile or free a program while she plays (the house's keeper, as NV_DIM's speck). */
    glimWarm();
    var KEEP788 = (function () { try { var k = [spark(0xffd166, 0.001, true), ring(0.001), emojiSprite('✨', 0.001)]; k.forEach(function (g) { g.position.set(0, -80, 0); }); return k; } catch (e) { return null; } }());
    return {
      tick: tick, goal: goal, peek: peek, start: start, openCard: openCard, closeCard: closeCard, closeRes: closeRes, end: function (why) { if (A.run) end(false, why || 'stopped'); },
      running: function () { return !!A.run; }, noArrow: function () { return !!(A.run && A.run.kid === 'hidden'); }, holds: function () { return !!(A.card || A.res); }, here: function () { return A.here; }
    };
  }
  API.create = create; API.PLACES = PLACES; API.KINDS = KINDS; API.GRADES = GRADES; API.CUT = CUT; API.PAY = PAY; API.FIRST = FIRST; API.ALLSTAR = ALLSTAR; API.K = K; API.W = W0;
  API.gradeOf = gradeOf; API.payOf = payOf; API.parOf = parOf; API.layout = layout; API.rng = rng; API.place = place;
  return API;
})();
