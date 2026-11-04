/* world712-photo.js - BOARD 723e U1, THE REAL GROUND: the PHOTO LAYER ENGINE on the travel zone's terrain, the whole world (Trunks, Nov 4 2026).
   Marth, verbatim: "i want this game to be ground breaking. real and submersive"; "Focus on the WHOLE world done how it loos on Google Maps ish or the other links".
   What it is: a LAYER of world712-travel.js's streamer (its onTile / onDrop hooks; the streamer's core is not touched). Every streamed terrain tile
   z/x/y asks the SOURCES, in order, for the photo with the same z/x/y; a source that has nothing that deep gives its nearest ancestor, and the tile
   draws that ancestor's window (the streamer's own trick for virtual heights). No photo anywhere: the tile keeps its vertex colours (the fallback).
   THE SOURCE INTERFACE (one shape for every source): { id, imageTile(z, x, y) -> Promise<ImageBitmap | HTMLImageElement | null>, maxZ?, minZ?,
     has?(z, x, y) (sync: when given, only tiles it has are asked), credit? (a line, or a function returning the lines in view), owns? (true: the
     engine may close() the bitmap after upload; a source that caches its bitmaps leaves it false) }.
     - 'naip' etc.: a baked set hosted by us (earth/tiles/<set>/manifest.json; Tahoe: USDA NAIP CA 2018 + NV 2019, public domain, baked by
       tools/wiring/bake-723e-naip.js). Tried FIRST: the sharpest where it exists.
     - the world: window.WFR_IMAGERY (world-imagery.js, unit w-imagery: NASA Blue Marble via GIBS, z0-8; it shows its own credit and drapes the
       vertex colours underneath, so where no atlas photo is drawn the Earth still wears its real colours), picked up when it exists; any other
       world source as window.WFR_WORLD_IMAGERY, or handed in by WFR_PHOTO712.addSource / the attach's api.addSource.
   How it draws: ONE shared material (the far pass's own, world712-travel.js makeMaterial: its onBeforeCompile samples uPhoto712t where the vertex
   attribute aPh712t.z is 1). Every photo lives in ONE atlas texture (4096 x 2048: 128 slots of 256 px; LinearFilter, no mipmaps; 32 MB on the GPU,
   DRAFT), filled slot by slot with renderer.copyTextureToTexture; a slot is SHARED by every tile that draws the same picture (a z8 picture serves all
   the deeper tiles under it: one fetch, one upload), and the least recently used undrawn picture leaves first: never a new material, never a fog-type switch, nothing shared disposed. */
window.WFR_PHOTO712 = (function () {
  'use strict';
  var C = { W: 4096, H: 2048, SLOT: 256, LOADS: 6, UP: 6 };   // UP: how many levels up an async source is asked before it is passed over (DRAFT)
  var PERX = C.W / C.SLOT, NSLOT = PERX * (C.H / C.SLOT), pending = [], live = null;
  function keyOf(z, x, y) { return z + '/' + x + '/' + y; }

  /* a baked set as a source (manifest {path, tiles: [{z, x, y}], credit}) */
  function setSource(id, base, man) {
    var p = man.path || '{z}/{x}/{y}.webp', have = new Map(), maxZ = 0, minZ = 99;
    man.tiles.forEach(function (t) { have.set(keyOf(t.z, t.x, t.y), base + p.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y)); if (t.z > maxZ) maxZ = t.z; if (t.z < minZ) minZ = t.z; });
    function decode(blob) {
      if (window.createImageBitmap) return createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      return new Promise(function (res, rej) { var url = URL.createObjectURL(blob), im = new Image(); im.onload = function () { URL.revokeObjectURL(url); res(im); }; im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('image')); }; im.src = url; });
    }
    return { id: id, maxZ: maxZ, minZ: minZ, owns: true, credit: man.credit || null, count: have.size, bytes: man.bytes || null,
      has: function (z, x, y) { return have.has(keyOf(z, x, y)); },
      imageTile: function (z, x, y) { var u = have.get(keyOf(z, x, y)); if (!u) return Promise.resolve(null); return fetch(u).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(decode); } };
  }

  function attach(THREE, renderer, u, layers, o) {
    o = o || {};
    var sources = [], slots = new Array(NSLOT), free = [], q = [], inflight = 0, recs = new Map(), picked = {}, byKey = new Map(), loading = new Map(), tick = 0;   // slots SHARED by photo: a z8 picture serves every deeper tile under it
    var stats = { sources: 0, asked: 0, got: 0, nulls: 0, uploaded: 0, errors: 0, evicted: 0, full: 0, used: 0, usedMax: 0, lastError: null, bySource: {} };
    for (var i = NSLOT - 1; i >= 0; i--) free.push(i);
    var atlas = new THREE.DataTexture(new Uint8Array(C.W * C.H * 4), C.W, C.H, THREE.RGBAFormat);
    atlas.minFilter = THREE.LinearFilter; atlas.magFilter = THREE.LinearFilter; atlas.generateMipmaps = false; atlas.flipY = false; atlas.needsUpdate = true;
    atlas.onUpdate = function () { atlas.image.data = null; };   // the zeros leave the JS heap once the GPU has them (the atlas is never re-uploaded whole)
    u.uPhoto.value = atlas;

    function addSource(s, first) { if (!s || typeof s.imageTile !== 'function') return false; if (first) sources.unshift(s); else sources.push(s); stats.sources = sources.length; stats.bySource[s.id || ('s' + sources.length)] = 0; return true; }
    function pickWorld() {   // world-imagery.js (window.WFR_IMAGERY: NASA Blue Marble z0-8, its own credit on screen, the caller closes the bitmap); WFR_WORLD_IMAGERY: any other world source (the guard's stub)
      ['WFR_WORLD_IMAGERY', 'WFR_IMAGERY'].forEach(function (n) { var w = window[n]; if (picked[n] || !w || typeof w.imageTile !== 'function') return; picked[n] = true;
        addSource({ id: w.id || (n === 'WFR_IMAGERY' ? 'imagery' : 'world'), imageTile: w.imageTile.bind(w), maxZ: w.maxZ != null ? w.maxZ : (w.C && w.C.MAXZ), minZ: w.minZ, has: w.has ? w.has.bind(w) : null, credit: n === 'WFR_IMAGERY' ? null : w.credit, owns: n === 'WFR_IMAGERY' ? true : !!w.owns }); }); }
    function attr(rec) { var g = rec.mesh.geometry, n = g.getAttribute('position').count, a = g.getAttribute('aPh712t'); if (!a) { a = new THREE.BufferAttribute(new Float32Array(n * 3), 3); g.setAttribute('aPh712t', a); } return a; }
    function fill(rec, slot, w) {   // the tile's sheet (and its skirt) to its window of the slot; pixel centres kept inside the slot (no bleed from a neighbour)
      var a = attr(rec), arr = a.array, N = Math.round(Math.sqrt(rec.hv.length)) - 1, sx = (slot % PERX) * C.SLOT, sy = Math.floor(slot / PERX) * C.SLOT, lo = 0.5 / C.SLOT, hi = 1 - lo;
      function uv(i, j, k) { var pu = Math.min(hi, Math.max(lo, w.u0 + i / N * w.s)), pv = Math.min(hi, Math.max(lo, w.v0 + j / N * w.s)); arr[k] = (sx + pu * C.SLOT) / C.W; arr[k + 1] = (sy + pv * C.SLOT) / C.H; arr[k + 2] = 1; }
      for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) uv(i, j, (j * (N + 1) + i) * 3);
      var vs = (N + 1) * (N + 1);   // the skirt, in the streamer's order: north (j 0), south (j N), west (i 0), east (i N)
      for (var e = 0; e < 4; e++) for (var g = 0; g <= N; g++) { var ii = e < 2 ? g : (e === 2 ? 0 : N), jj = e === 0 ? 0 : e === 1 ? N : g; uv(ii, jj, vs * 3); vs++; }
      a.needsUpdate = true;
    }
    function clearAttr(rec) { if (!rec.mesh) return; var a = rec.mesh.geometry.getAttribute('aPh712t'); if (a) { for (var i = 2; i < a.array.length; i += 3) a.array[i] = 0; a.needsUpdate = true; } }
    function seen(e) { var v = false; e.recs.forEach(function (r) { if (r.mesh && r.mesh.visible) v = true; }); return v; }
    function evict(s) { var e = slots[s]; e.recs.forEach(function (r) { r.ph712.slot = -1; r.ph712.src = null; clearAttr(r); }); byKey.delete(e.key); slots[s] = null; free.push(s); stats.used--; stats.evicted++; }
    function takeSlot() {   // a free slot, else the least recently used one whose tiles are none of them drawn this frame
      if (free.length) return free.pop();
      var best = -1, bt = Infinity; for (var s = 0; s < NSLOT; s++) { var e = slots[s]; if (e && e.t < bt && !seen(e)) { bt = e.t; best = s; } }
      if (best < 0) return -1; evict(best); return free.pop();
    }
    function release(rec) { var p = rec.ph712; if (!p || p.slot < 0) return; var e = slots[p.slot]; if (e) e.recs.delete(rec); p.slot = -1; clearAttr(rec); }   // the picture stays in its slot (cached) until a slot is needed
    function windowOf(rec, dz) { var n = 1 << dz, x = rec.x >> dz, y = rec.y >> dz; return { z: rec.z - dz, x: x, y: y, s: 1 / n, u0: (rec.x - x * n) / n, v0: (rec.y - y * n) / n, dz: dz }; }
    function plan(rec, s) {   // the levels this source is asked for, deepest first
      var top = s.maxZ != null ? Math.max(0, rec.z - s.maxZ) : 0, lo = s.minZ != null ? s.minZ : 0, out = [];
      if (s.has) { for (var dz = top; rec.z - dz >= lo; dz++) { var w = windowOf(rec, dz); if (s.has(w.z, w.x, w.y)) { out.push(w); break; } } return out; }
      for (dz = top; dz < top + C.UP && rec.z - dz >= lo; dz++) out.push(windowOf(rec, dz));
      return out;
    }
    function load(s, w, k2) {   // one picture into one slot: -1 the atlas is full, -2 the source has none, -3 an error; a picture already loading is waited for
      if (byKey.has(k2)) return Promise.resolve(byKey.get(k2));
      if (loading.has(k2)) return loading.get(k2);
      stats.asked++;
      var p = Promise.resolve().then(function () { return s.imageTile(w.z, w.x, w.y); }).then(function (img) {
        if (!img) return -2; var sl = takeSlot();
        if (sl >= 0) { var tex = new THREE.Texture(img); renderer.copyTextureToTexture(new THREE.Vector2((sl % PERX) * C.SLOT, Math.floor(sl / PERX) * C.SLOT), tex, atlas);
          slots[sl] = { key: k2, recs: new Set(), t: ++tick }; byKey.set(k2, sl); stats.uploaded++; stats.used++; if (stats.used > stats.usedMax) stats.usedMax = stats.used; stats.bySource[s.id] = (stats.bySource[s.id] || 0) + 1; }
        else stats.full++;
        if (s.owns && img.close) img.close(); return sl;
      }, function (e) { stats.errors++; stats.lastError = (s.id || '?') + ' ' + keyOf(w.z, w.x, w.y) + ': ' + (e && e.message || e); return -3; });
      loading.set(k2, p); p.then(function () { loading.delete(k2); });
      return p;
    }
    function ask(rec, si, li, list) {   // the next source / level for this tile, until a picture is in a slot
      if (rec.ph712.dead) return Promise.resolve(null);
      if (!list) { if (si >= sources.length) return Promise.resolve(null); list = plan(rec, sources[si]); li = 0; }
      if (li >= list.length) return ask(rec, si + 1, 0, null);
      var s = sources[si], w = list[li], k2 = (s.id || '?') + ':' + keyOf(w.z, w.x, w.y);
      return load(s, w, k2).then(function (sl) { if (sl >= 0) return { slot: sl, w: w, s: s, k2: k2 }; if (sl === -1) return null; if (sl === -2) stats.nulls++; return ask(rec, si, li + 1, list); });
    }
    function pump() {
      pickWorld();
      while (inflight < C.LOADS && q.length) { var rec = q.shift(); if (rec.ph712.dead) continue; inflight++;
        (function (rec) {
          ask(rec, 0, 0, null).then(function (got) {
            if (!got || rec.ph712.dead) return; var e = slots[got.slot]; if (!e || e.key !== got.k2) { q.push(rec); return; }   // evicted in between: asked again
            e.recs.add(rec); e.t = ++tick; rec.ph712.slot = got.slot; rec.ph712.src = { id: got.s.id, key: keyOf(got.w.z, got.w.x, got.w.y), dz: got.w.dz };
            stats.got++; fill(rec, got.slot, got.w); })
          .catch(function (e) { stats.errors++; stats.lastError = String(e && e.message || e); })
          .then(function () { inflight--; pump(); }); })(rec);
      }
    }
    var layer = { id: 'photo712',
      onTile: function (rec) { if (!rec.mesh) return; attr(rec); rec.ph712 = { src: null, slot: -1, dead: false }; recs.set(rec.key, rec); q.push(rec); pump(); },
      onDrop: function (rec) { if (!rec.ph712) return; rec.ph712.dead = true; release(rec); recs.delete(rec.key); } };
    layers.push(layer);
    var api = { layer: layer, atlas: atlas, stats: stats, sources: sources, addSource: addSource,
      of: function (key) { var r = recs.get(key); return r && r.ph712 ? { src: r.ph712.src ? r.ph712.src.key : null, id: r.ph712.src ? r.ph712.src.id : null, dz: r.ph712.src ? r.ph712.src.dz : null, slot: r.ph712.slot } : null; } };
    (o.sets || []).forEach(function (id) { if (location.protocol === 'file:') return; var base = 'earth/tiles/' + id + '/';   // the baked sets first: the sharpest where they exist
      fetch(base + 'manifest.json').then(function (r) { if (!r.ok) throw new Error(id + ': HTTP ' + r.status); return r.json(); }).then(function (m) { addSource(setSource(id, base, m), true); })
        .catch(function (e) { stats.errors++; stats.lastError = String(e && e.message || e); }); });
    pending.forEach(function (s) { addSource(s); }); pending = []; live = api;

    var el = null;
    function shown() { var ids = {}; recs.forEach(function (r) { if (r.ph712 && r.ph712.slot >= 0 && r.mesh && r.mesh.visible) ids[r.ph712.src.id] = 1; }); return ids; }   // the sources drawn this frame
    function credit(on) {   // the ledger's credit lines of the sources drawn, on screen without a click (the page calls it each travel frame, false on leaving)
      var ids = on ? shown() : {}, lines = [];
      sources.forEach(function (s) { if (!ids[s.id] || !s.credit) return; var c = typeof s.credit === 'function' ? s.credit() : s.credit; [].concat(c || []).forEach(function (l) { if (l && lines.indexOf(l) < 0) lines.push(l); }); });
      var v = lines.length > 0;
      if (!el && v) { el = document.createElement('div'); el.id = 'credit723e'; el.setAttribute('role', 'note');
        el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 3px);z-index:7;box-sizing:border-box;width:max-content;max-width:min(96vw,560px);white-space:pre-line;padding:2px 8px;border-radius:7px;background:rgba(18,30,26,.45);color:#fffef6;font:600 9.5px/1.3 system-ui,-apple-system,sans-serif;text-align:center;text-shadow:0 1px 1px rgba(0,0,0,.45);pointer-events:none';
        el.hidden = true; document.body.appendChild(el); }
      if (el) { var t = lines.join('\n'); if (el.textContent !== t) el.textContent = t; if (el.hidden === v) el.hidden = !v; }
      return v;
    }
    api.credit = credit; api.shown = shown;
    return api;
  }
  /* a source handed in before or after the attach (world-imagery.js may load in either order) */
  function addSource(s) { if (live) return live.addSource(s); pending.push(s); return true; }
  return { C: C, attach: attach, addSource: addSource, setSource: setSource, version: 2 };
})();
