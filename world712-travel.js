/* world712-travel.js - BOARD 712 S4b-1, FLY ANYWHERE (Marth, Oct 28 2026: "Not just Jamaica, the whole world. I want you to port the whole damn world into
   the game today"; Oct 29: "only dunns river?? lol we need every part of the world made. falls included, high altitude, andcient places, modenr ubranistic
   places them all"; "don’t cut any corners"; "make sure it looks AND works at LEAST as as good as GTA: San Andreas"). Plan: PLAN_712_S4B_FLY_ANYWHERE
   (Itachi, Oct 28). Trunks, Oct 29 2026.
   What this file is: the LIBRARY of the travel zone. It never touches the game: the page's glue (tools/wiring/wire-712f-fly-anywhere.js) hands it THREE
   (r128), the scene and the tile sets, and calls it. Reused, not rewritten (MBAEEMP):
     - earth/tiles.js (Trunks, Oct 21; written for r186 modules): the quadtree, the parent drawn while a child loads, the skirts, the LRU, H() from the
       height field; ported to r128 and a classic script here, with three additions: many tile sets in ONE tree (the world z0-5, the Caribbean z5-8,
       Tahoe and Antigua z10-13), VIRTUAL children (a child with no file of its own is cut from its nearest real ancestor's heights, so the tree reaches
       Tahoe's z10 through z6-z9 that were never downloaded, and every pixel of a coarse tile is used), and a BUDGET (<= 64 drawn, 96 kept, 4 loads,
       1 mesh built a frame; refined where the error is largest first);
     - earth/terrarium.js (and world712-frame.js, which copies it): the tile maths, line for line (sampleField, childrenOf, the Mercator frame);
     - carib712's shrink-and-curve (wings-for-rouge.html CLIMB712_SHRINK): the far pass draws the ground shrunk toward the eye by K, bent by the
       Earth's curve (the same refraction radius, 7,432,843 m), its fog measured at TRUE distance; one shared material (one program);
     - the atlas palette (world712-mapview.js SEA / LAND, the classroom-atlas look Marth chose Oct 28) made 3D, with the island's meadow greens
       (tiles.js tint) at the low end, sand on the coasts and snow by latitude.
   Hooks for S5 (the streamed street layer, OpenFreeMap vector tiles; per-place landmark models): opts.layers, each { id, onTile(rec, api),
   onDrop(rec) }: a layer is told when a tile becomes drawable (with its bounds, frame, height sampler and the group to add to) and when it is
   dropped; nothing here knows what a layer draws. */
window.WFR_TRAVEL712 = (function () {
  'use strict';
  var W = window.WFR_WORLD, PX = 256, WORLD = 2 * Math.PI * 6378137;
  /* Every number DRAFT (plan section 3: the iPhone 12 budget, unmeasured on the phone). */
  var C = { ON: 20000, OFF: 18000, RECENTRE: 10000, TOP: 1800, TOP2: 20000, KNOTS: [[1800, 60], [6000, 600], [20000, 6000]], XP_V: 30,
    DRAWN: 64, KEPT: 96, LOADS: 4, BUILDS: 1, GRID: 32, SPLIT: 1.25, VDEPTH: 3, FLOOR: 30, LAYER: 7, REFR: 7432843, FAR_MIN: 60000, FAR_MAX: 800000, FAR_PAD: 150000 };

  /* ---------- the height sets the speed (plan section 2): S4a's x1-x4 below 1,800 m stays the page's; above it, log-even between the knots ---------- */
  function speedAt(y) {
    var K = C.KNOTS; if (y <= K[0][0]) return K[0][1]; if (y >= K[K.length - 1][0]) return K[K.length - 1][1];
    for (var i = 1; i < K.length; i++) if (y <= K[i][0]) { var a = K[i - 1], b = K[i], t = (y - a[0]) / (b[0] - a[0]); return a[1] * Math.pow(b[1] / a[1], t); }
    return K[K.length - 1][1];
  }
  function horizon(h) { return Math.sqrt(2 * C.REFR * Math.max(1, h)); }   // how far the curve lets an eye at h metres see the sea
  function farOf(h) { return Math.max(C.FAR_MIN, Math.min(C.FAR_MAX, horizon(h) + C.FAR_PAD)); }   // + 150 km: mountains past the sea's horizon still stand up over it

  /* ---------- terrarium.js, line for line ---------- */
  function keyOf(z, x, y) { return z + '/' + x + '/' + y; }
  function childrenOf(t) { var z = t.z + 1, x = t.x * 2, y = t.y * 2; return [{ z: z, x: x, y: y }, { z: z, x: x + 1, y: y }, { z: z, x: x, y: y + 1 }, { z: z, x: x + 1, y: y + 1 }]; }
  function fieldOf(rgba, channels) { var n = PX * PX, h = new Float32Array(n); for (var i = 0; i < n; i++) { var j = i * channels; h[i] = rgba[j] * 256 + rgba[j + 1] + rgba[j + 2] / 256 - 32768; } return h; }
  function sampleField(h, u, v) {   // bilinear over pixel centres, clamped at the edges; u east 0..1, v south 0..1
    var fx = Math.min(PX - 1, Math.max(0, u * PX - 0.5)), fy = Math.min(PX - 1, Math.max(0, v * PX - 0.5));
    var x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(PX - 1, x0 + 1), y1 = Math.min(PX - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
    var a = h[y0 * PX + x0], b = h[y0 * PX + x1], c = h[y1 * PX + x0], d = h[y1 * PX + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
  /* a tile's square in a frame, the antimeridian wrapped to the copy nearest the frame's origin: x0 its west edge, z0 its NORTH edge, size its side */
  function boundsOf(f, z, x, y) {
    var s = WORLD / Math.pow(2, z), mx = x * s - WORLD / 2, myTop = WORLD / 2 - y * s, dx = mx + s / 2 - f.ox;
    if (dx > WORLD / 2) mx -= WORLD; else if (dx < -WORLD / 2) mx += WORLD;
    return { x0: (mx - f.ox) * f.k, z0: (f.oy - myTop) * f.k, size: s * f.k, s: s };
  }

  /* ---------- the atlas made 3D (world712-mapview.js SEA / LAND; tiles.js's meadow at the low end; sand at the coast; snow by latitude) ---------- */
  var SEA = [[-8000, 22, 52, 104], [-5000, 38, 82, 140], [-3000, 62, 116, 172], [-1000, 104, 160, 206], [-200, 150, 199, 228], [0, 196, 228, 240]];
  var LAND = [[0, 112, 168, 98], [150, 142, 186, 108], [400, 196, 206, 128], [800, 226, 206, 142], [1300, 214, 170, 112], [2000, 182, 130, 88], [3000, 150, 104, 78], [4000, 196, 184, 176], [4800, 244, 244, 244]];
  var MEADOW = [[0, 134, 178, 92], [60, 111, 162, 78], [250, 92, 140, 69]];   /* the island's G1 G2 G3 (0x86b25c 0x6fa24e 0x5c8c45): the lowlands wear her island's own greens */
  var SAND = [230, 214, 168], SNOW = [244, 246, 248], ROCK = [139, 134, 118], DRY = [206, 184, 132];
  function ramp(R, e, out) { if (e <= R[0][0]) { out[0] = R[0][1]; out[1] = R[0][2]; out[2] = R[0][3]; return out; }
    for (var k = 1; k < R.length; k++) if (e <= R[k][0]) { var a = R[k - 1], b = R[k], t = (e - a[0]) / (b[0] - a[0]); out[0] = a[1] + (b[1] - a[1]) * t; out[1] = a[2] + (b[2] - a[2]) * t; out[2] = a[3] + (b[3] - a[3]) * t; return out; }
    var L = R[R.length - 1]; out[0] = L[1]; out[1] = L[2]; out[2] = L[3]; return out; }
  function mix(o, c, t) { o[0] += (c[0] - o[0]) * t; o[1] += (c[1] - o[1]) * t; o[2] += (c[2] - o[2]) * t; }
  var cA = [0, 0, 0], cB = [0, 0, 0];
  function tint(h, slope, lat, out, k) {   // out: Float32 rgb 0..1 at k
    if (h <= 0) { ramp(SEA, h, cA); }
    else {
      ramp(LAND, h, cA); ramp(MEADOW, h, cB); mix(cA, cB, 1 - Math.min(1, h / 600));   // low land: her meadow, fading into the atlas by 600 m
      var al = Math.abs(lat), dry = Math.max(0, 1 - Math.abs(al - 24) / 9) * (1 - Math.min(1, h / 2500));   // the dry belts (Sahara, Arabia, Sonora, the Outback) near 24 degrees
      if (dry > 0) mix(cA, DRY, dry * 0.55);
      if (h < 8) mix(cA, SAND, 1 - h / 8);   // the coast's sand
      if (slope > 0.45) mix(cA, ROCK, Math.min(0.7, (slope - 0.45) / 0.8));
      var snowLine = al < 20 ? 4900 : al < 66 ? 4900 - (al - 20) * 100 : 300;   // DRAFT: the snow line falls with latitude (Kilimanjaro's top white, the Andes', the Rockies' lower, the Arctic's at the sea)
      if (h > snowLine - 300) mix(cA, SNOW, Math.min(1, (h - snowLine + 300) / 600) * (slope > 0.9 ? 0.5 : 1));
    }
    out[k] = cA[0] / 255; out[k + 1] = cA[1] / 255; out[k + 2] = cA[2] / 255;
  }
  function latOfV(f, z0, size, v) { var my = f.oy - (z0 + v * size) / f.k; return (2 * Math.atan(Math.exp(my / 6378137)) - Math.PI / 2) * 180 / Math.PI; }

  /* ---------- the far pass's material: carib712's shrink toward the eye and the Earth's curve, at true-distance fog (ONE program for every tile) ---------- */
  function makeMaterial(THREE, u, tag) {
    var m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uEye712t = u.uEye; sh.uniforms.uInvK712t = u.uInvK;
      sh.vertexShader = 'uniform vec3 uEye712t; uniform float uInvK712t;\n' + sh.vertexShader.replace('#include <project_vertex>', [
        'vec4 wp712t = modelMatrix * vec4( transformed, 1.0 );',
        'vec3 r712t = wp712t.xyz - uEye712t; float d712t = length( r712t.xz );',
        'r712t.y -= d712t * d712t / ( 2.0 * ' + C.REFR.toFixed(1) + ' );',   // the Earth's curve (carib712's refraction radius)
        'wp712t.xyz = uEye712t + r712t * uInvK712t;',   // shrunk toward the eye: the same picture, inside the near and far planes
        'vec4 mvPosition = viewMatrix * wp712t;', 'gl_Position = projectionMatrix * mvPosition;'].join('\n'))
        .replace('#include <fog_vertex>', '#include <fog_vertex>\n#ifdef USE_FOG\n  fogDepth /= uInvK712t;\n#endif');   // the haze at TRUE distance
    };
    var key = 'travel712far' + (tag || ''); m.customProgramCacheKey = function () { return key; };
    return m;
  }

  /* ---------- the streamer ---------- */
  function makeStreamer(THREE, o) {
    var sets = o.sets, have = new Map(), deep = new Map(), missing = new Set(), layers = o.layers || [];
    sets.forEach(function (s) { var p = s.manifest.path || 'terrarium/{z}/{x}/{y}.png'; s.manifest.tiles.forEach(function (t) { var k = keyOf(t.z, t.x, t.y); if (!have.has(k)) have.set(k, s.base + p.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y)); }); });
    have.forEach(function (url, k) { var a = k.split('/'), z = +a[0], x = +a[1], y = +a[2]; for (var zz = z; zz >= 0; zz--) { var kk = keyOf(zz, x >> (z - zz), y >> (z - zz)); if (!(deep.get(kk) >= z)) deep.set(kk, z); } });
    if (!have.has('0/0/0')) throw new Error('travel712: the tile sets have no world root (0/0/0)');
    var u = o.u || { uEye: { value: new THREE.Vector3() }, uInvK: { value: 1 } };   // the page's own uniforms when it made the material at load
    var material = o.material || makeMaterial(THREE, u);
    var group = new THREE.Group(); group.name = 'travel712'; group.matrixAutoUpdate = false;
    var tiles = new Map(), inflight = new Map(), waiting = new Set(), seen = new Set(), fetchQ = [], buildQ = [], f = o.frame, drawn = [], drawnSet = new Set();
    var stats = { loaded: 0, built: 0, virt: 0, evicted: 0, errors: 0, missing: 0, inflight: 0, inflightMax: 0, drawn: 0, drawnMax: 0, kept: 0, keptMax: 0, buildsMax: 0, overBudget: 0, updates: 0, bytes: 0, uniq: 0, uniqBytes: 0, tris: 0, fault: null, lastError: null, recentres: 0 };
    var canvas = document.createElement('canvas'); canvas.width = PX; canvas.height = PX;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var MAXZ = 0; deep.forEach(function (z) { if (z > MAXZ) MAXZ = z; });

    function decode(blob) {   // the PNG's bytes to heights, through the browser's own decoder (no colour management: the bytes ARE the heights)
      if (window.createImageBitmap) return createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).then(function (bmp) { ctx.clearRect(0, 0, PX, PX); ctx.drawImage(bmp, 0, 0); if (bmp.close) bmp.close(); return fieldOf(ctx.getImageData(0, 0, PX, PX).data, 4); });
      return new Promise(function (res, rej) { var url = URL.createObjectURL(blob), im = new Image(); im.onload = function () { ctx.clearRect(0, 0, PX, PX); ctx.drawImage(im, 0, 0); URL.revokeObjectURL(url); res(fieldOf(ctx.getImageData(0, 0, PX, PX).data, 4)); }; im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('image')); }; im.src = url; });
    }
    function real(k) { return have.has(k) && !missing.has(k); }
    function srcOf(t) {   // the nearest REAL ancestor that is built (or t itself): its field and the window of it that t covers
      for (var dz = 1; dz <= t.z; dz++) { var z = t.z - dz, x = t.x >> dz, y = t.y >> dz, r = tiles.get(keyOf(z, x, y)); if (r && r.field && r.real) { var n = 1 << dz; return { rec: r, s: 1 / n, u0: (t.x - x * n) / n, v0: (t.y - y * n) / n }; } }
      return null;
    }
    function limitOf(rec) { return Math.max(deep.get(rec.key) != null ? deep.get(rec.key) : -1, rec.srcZ + C.VDEPTH); }   // real data deeper, or the source's own pixels not yet all used

    function build(rec) {   // one tile: a GRID x GRID sheet in the tile's own mercator metres (scaled by the frame's k), plus a skirt round its edge
      var N = C.GRID, V = (N + 1) * (N + 1), E = 4 * (N + 1), s = WORLD / Math.pow(2, rec.z), b = boundsOf(f, rec.z, rec.x, rec.y), skirt = Math.max(30, b.size * 0.04);
      var pos = new Float32Array((V + E) * 3), col = new Float32Array((V + E) * 3), hv = new Float32Array(V), idx = [], fld = rec.field, U0 = rec.u0, V0 = rec.v0, SS = rec.s, minH = 1e9, maxH = -1e9, eps = 0.5 / N;
      for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) { var h = sampleField(fld, U0 + i / N * SS, V0 + j / N * SS), q = j * (N + 1) + i; hv[q] = h; }
      var latTop = latOfV(f, b.z0, b.size, 0), latBot = latOfV(f, b.z0, b.size, 1);
      for (j = 0; j <= N; j++) for (i = 0; i <= N; i++) { q = j * (N + 1) + i; var k = q * 3, hh = hv[q], y = Math.max(0, hh);
        pos[k] = i / N * s; pos[k + 1] = y; pos[k + 2] = j / N * s; if (y < minH) minH = y; if (y > maxH) maxH = y;
        var hx = hv[j * (N + 1) + Math.min(N, i + 1)] - hv[j * (N + 1) + Math.max(0, i - 1)], hz = hv[Math.min(N, j + 1) * (N + 1) + i] - hv[Math.max(0, j - 1) * (N + 1) + i], step = 2 * b.size / N;
        tint(hh, Math.hypot(hx, hz) / step, latTop + (latBot - latTop) * j / N, col, k); }
      for (j = 0; j < N; j++) for (i = 0; i < N; i++) { var a = j * (N + 1) + i, c = a + N + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }   // tiles.js's diagonal (H() below reads the same two triangles)
      var gridFaces = idx.length, edges = [[], [], [], []], vs = V;
      for (i = 0; i <= N; i++) { edges[0].push(i); edges[1].push(N * (N + 1) + i); edges[2].push(i * (N + 1)); edges[3].push(i * (N + 1) + N); }
      for (var ei = 0; ei < 4; ei++) { var e = edges[ei], first = vs, outA = ei === 0 || ei === 3;   // north and east wind one way, south and west the other: every skirt faces OUT
        for (var g = 0; g < e.length; g++) { var kk = vs * 3, qq = e[g] * 3; pos[kk] = pos[qq]; pos[kk + 1] = pos[qq + 1] - skirt; pos[kk + 2] = pos[qq + 2]; col[kk] = col[qq] * 0.8; col[kk + 1] = col[qq + 1] * 0.8; col[kk + 2] = col[qq + 2] * 0.8; vs++; }
        for (i = 0; i < e.length - 1; i++) { var ea = e[i], eb = e[i + 1], sa = first + i, sb = first + i + 1; if (outA) idx.push(ea, eb, sa, eb, sb, sa); else idx.push(ea, sa, eb, eb, sa, sb); } }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setIndex(idx.slice(0, gridFaces)); geo.computeVertexNormals();   // the sheet's normals alone; the skirt copies its edge's
      var nrm = geo.getAttribute('normal').array; vs = V; for (ei = 0; ei < 4; ei++) for (g = 0; g < edges[ei].length; g++) { nrm[vs * 3] = nrm[edges[ei][g] * 3]; nrm[vs * 3 + 1] = nrm[edges[ei][g] * 3 + 1]; nrm[vs * 3 + 2] = nrm[edges[ei][g] * 3 + 2]; vs++; }
      geo.setIndex(idx);
      var mesh = new THREE.Mesh(geo, o.materialFor ? o.materialFor(rec) : material); mesh.name = 'travel712:' + rec.key; mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.visible = false; mesh.renderOrder = -9.4;
      mesh.castShadow = false; mesh.receiveShadow = false; mesh.layers.set(o.layer == null ? C.LAYER : o.layer);
      rec.mesh = mesh; rec.hv = hv; rec.skirt = skirt; rec.minH = minH; rec.maxH = maxH; rec.tris = idx.length / 3; place(rec); group.add(mesh); stats.built++; if (!rec.real) stats.virt++;
      for (var L = 0; L < layers.length; L++) try { if (layers[L].onTile) layers[L].onTile(rec, api); } catch (err) { stats.fault = 'layer ' + layers[L].id + ': ' + (err && err.message || err); }
    }
    function place(rec) { var b = boundsOf(f, rec.z, rec.x, rec.y); rec.b = b; rec.mesh.position.set(b.x0, 0, b.z0); rec.mesh.scale.set(f.k, 1, f.k); rec.mesh.updateMatrix(); rec.mesh.matrixWorld.copy(rec.mesh.matrix); }
    function drop(rec) { for (var L = 0; L < layers.length; L++) try { if (layers[L].onDrop) layers[L].onDrop(rec, api); } catch (err) { stats.fault = 'layer ' + layers[L].id + ': ' + (err && err.message || err); }
      if (rec.mesh) { group.remove(rec.mesh); rec.mesh.geometry.dispose(); } tiles.delete(rec.key); stats.evicted++; }

    function want(t, d) {   // a tile is needed: a real one is fetched, a virtual one (or one whose file is missing) is cut from its ancestor
      var k = keyOf(t.z, t.x, t.y); if (tiles.has(k) || inflight.has(k) || waiting.has(k)) return;   // decoded and waiting its turn to build: never fetched twice
      if (real(k)) { for (var i = 0; i < fetchQ.length; i++) if (fetchQ[i].k === k) { fetchQ[i].d = Math.min(fetchQ[i].d, d); return; } fetchQ.push({ k: k, t: t, d: d }); return; }
      var src = srcOf(t); if (!src) return; for (i = 0; i < buildQ.length; i++) if (buildQ[i].key === k) { buildQ[i].d = Math.min(buildQ[i].d, d); return; }
      buildQ.push({ key: k, z: t.z, x: t.x, y: t.y, real: false, field: src.rec.field, u0: src.u0, v0: src.v0, s: src.s, srcZ: src.rec.z, srcKey: src.rec.key, d: d });
    }
    function pump() {
      fetchQ.sort(function (a, b) { return a.t.z - b.t.z || a.d - b.d; });   // coarse first, then near (tiles.js: the ground shows at once and sharpens)
      while (inflight.size < C.LOADS && fetchQ.length) {
        (function (q) { var url = have.get(q.k), p = (o.fetch || fetch)(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
          .then(function (bl) { stats.bytes += bl.size; if (!seen.has(q.k)) { seen.add(q.k); stats.uniq++; stats.uniqBytes += bl.size; } return decode(bl); })
          .then(function (fl) { stats.loaded++; waiting.add(q.k); buildQ.push({ key: q.k, z: q.t.z, x: q.t.x, y: q.t.y, real: true, field: fl, u0: 0, v0: 0, s: 1, srcZ: q.t.z, srcKey: q.k, d: q.d }); })
          .catch(function (e) { stats.errors++; stats.missing++; missing.add(q.k); stats.lastError = q.k + ': ' + (e && e.message || e); })   // a missing tile: its parent stands in (it becomes virtual)
          .then(function () { inflight.delete(q.k); stats.inflight = inflight.size; });
          inflight.set(q.k, p); stats.inflight = inflight.size; if (inflight.size > stats.inflightMax) stats.inflightMax = inflight.size; })(fetchQ.shift());
      }
      fetchQ.length = 0;   // asked again next frame by the walk, so the queue is always this frame's need
      buildQ.sort(function (a, b) { return a.z - b.z || a.d - b.d; });
      var n = 0; while (n < C.BUILDS && buildQ.length) { var r = buildQ.shift(); waiting.delete(r.key); if (tiles.has(r.key)) continue; tiles.set(r.key, r); build(r); n++; }
      if (n > stats.buildsMax) stats.buildsMax = n;
      for (var i = buildQ.length - 1; i >= 0; i--) if (!buildQ[i].real) buildQ.splice(i, 1);   // virtual asks are re-made each frame; decoded real fields wait their turn
    }

    var cam = { x: 0, y: 0, z: 0 };
    function distOf(b, top) { var dx = Math.max(b.x0 - cam.x, 0, cam.x - (b.x0 + b.size)), dz = Math.max(b.z0 - cam.z, 0, cam.z - (b.z0 + b.size)); return Math.hypot(dx, dz, Math.max(0, cam.y - top)); }
    function update(camPos, o2) {
      cam.x = camPos.x; cam.y = camPos.y; cam.z = camPos.z; var F = farOf(cam.y), opt = o2 || {};
      var root = tiles.get('0/0/0'); drawn.length = 0;
      if (!root) { want({ z: 0, x: 0, y: 0 }, 0); pump(); stats.updates++; return drawn; }
      var leaves = [root], stuck = new Set(), protect = new Set(['0/0/0']), waits = [], guard = 0;
      while (guard++ < 400) {
        var best = -1, be = 0;
        for (var i = 0; i < leaves.length; i++) { var L = leaves[i]; if (stuck.has(L.key) || L.z >= Math.min(limitOf(L), MAXZ + C.VDEPTH)) continue; var d = distOf(L.b, L.maxH), e = L.b.size / Math.max(1, d); if (e > 1 / C.SPLIT && e > be) { be = e; best = i; } }
        if (best < 0) break;
        var P = leaves[best], kids = childrenOf(P), ready = [], need = [];
        for (i = 0; i < 4; i++) { var t = kids[i], kb = boundsOf(f, t.z, t.x, t.y), kd = distOf(kb, P.maxH); if (kd > F + kb.size * 0.5) continue;   // past the haze and the curve: nothing to draw there
          var r = tiles.get(keyOf(t.z, t.x, t.y)); if (r && r.mesh) ready.push(r); else need.push({ t: t, d: kd }); }
        if (need.length || leaves.length - 1 + ready.length > C.DRAWN) { stuck.add(P.key); if (need.length) waits.push({ ready: ready, need: need }); else stats.overBudget++; continue; }   // the PARENT stays drawn while a child loads (no hole, no pop)
        protect.add(P.key); leaves.splice(best, 1); for (i = 0; i < ready.length; i++) leaves.push(ready[i]);
      }
      for (i = 0; i < leaves.length; i++) { drawn.push(leaves[i]); protect.add(leaves[i].key); }
      for (i = 0; i < leaves.length; i++) { var a = leaves[i]; for (var dz = 1; dz <= a.z; dz++) protect.add(keyOf(a.z - dz, a.x >> dz, a.y >> dz)); }   // every drawn tile's ancestors stay: the tree is walked from the root each frame
      /* the waiting splits, the most needed first, while the budget has room: their children already here are KEPT (else the LRU throws a child away while its
         siblings load, and the split never happens: Antigua's cut was never reached, Oct 29), and only their missing children are asked for */
      for (i = 0; i < waits.length; i++) { var wq = waits[i]; if (protect.size + wq.ready.length + wq.need.length > (o.unbounded ? 1e9 : C.KEPT) - 2) break;
        for (var q2 = 0; q2 < wq.ready.length; q2++) protect.add(wq.ready[q2].key); for (q2 = 0; q2 < wq.need.length; q2++) { var nt = wq.need[q2].t; protect.add(keyOf(nt.z, nt.x, nt.y)); want(nt, wq.need[q2].d); } }
      pump();
      drawnSet.clear(); stats.tris = 0; for (i = 0; i < drawn.length; i++) { drawnSet.add(drawn[i].key); stats.tris += drawn[i].tris; }
      protect.forEach(function (k) { var r = tiles.get(k); if (r) { tiles.delete(k); tiles.set(k, r); } });   // touch: most recent at the end
      tiles.forEach(function (r, k) { var v = drawnSet.has(k) && !opt.hide; if (r.mesh && r.mesh.visible !== v) r.mesh.visible = v; });
      var budget = o.unbounded ? 1e9 : C.KEPT, g2 = tiles.size;
      while (tiles.size > budget && g2-- > 0) { var victim = null; for (var kk of tiles.keys()) if (!protect.has(kk)) { victim = kk; break; } if (!victim) { stats.overBudget++; break; } drop(tiles.get(victim)); }
      stats.drawn = drawn.length; stats.kept = tiles.size; if (stats.drawn > stats.drawnMax) stats.drawnMax = stats.drawn; if (stats.kept > stats.keptMax) stats.keptMax = stats.kept; stats.updates++;
      var K = Math.max(1, Math.min(F / 1400, Math.max(1, (cam.y - groundUnder(cam.x, cam.z)) * 0.5)));   // shrunk inside 1.4 km, the ground below never nearer the eye than half a metre per metre of K
      u.uInvK.value = 1 / K; u.uEye.value.set(cam.x, cam.y, cam.z); stats.K = K; stats.F = F;
      return drawn;
    }
    function setFrame(f2) { f = f2; tiles.forEach(function (r) { if (r.mesh) place(r); }); stats.recentres++; }   // re-centred: every tile's corner and scale from the new frame (no rebuild)

    function recAt(x, z, onlyDrawn) {   // the drawn tile under a point (else the finest built one)
      var best = null; for (var i = 0; i < drawn.length; i++) { var r = drawn[i], b = r.b; if (x >= b.x0 && x < b.x0 + b.size && z >= b.z0 && z < b.z0 + b.size) { best = r; break; } }
      if (best || onlyDrawn) return best;
      for (var zz = MAXZ + C.VDEPTH; zz >= 0; zz--) { var s = WORLD / Math.pow(2, zz), mx = x / f.k + f.ox, my = f.oy - z / f.k, tx = Math.floor((((mx + WORLD / 2) % WORLD) + WORLD) % WORLD / s), ty = Math.floor((WORLD / 2 - my) / s), r2 = tiles.get(keyOf(zz, tx, ty)); if (r2 && r2.mesh) return r2; }
      return null;
    }
    function surf(r, x, z) {   // the height of the DRAWN sheet at a point: its two triangles (tiles.js's diagonal), the sea at 0
      var N = C.GRID, fx = Math.min(N - 1e-9, Math.max(0, (x - r.b.x0) / r.b.size * N)), fz = Math.min(N - 1e-9, Math.max(0, (z - r.b.z0) / r.b.size * N)), i = Math.floor(fx), j = Math.floor(fz), a = fx - i, c = fz - j, hv = r.hv;
      var h00 = Math.max(0, hv[j * (N + 1) + i]), h10 = Math.max(0, hv[j * (N + 1) + i + 1]), h01 = Math.max(0, hv[(j + 1) * (N + 1) + i]), h11 = Math.max(0, hv[(j + 1) * (N + 1) + i + 1]);
      return a + c <= 1 ? h00 + (h10 - h00) * a + (h01 - h00) * c : h11 + (h01 - h11) * (1 - a) + (h10 - h11) * (1 - c);
    }
    function groundUnder(x, z) { var r = recAt(x, z, false); return r ? surf(r, x, z) : 0; }
    function probe(x, z) { var r = recAt(x, z, false); if (!r) return null; return { h: surf(r, x, z), key: r.key, zoom: r.z, real: r.real, srcKey: r.srcKey, u0: r.u0, v0: r.v0, s: r.s, b: { x0: r.b.x0, z0: r.b.z0, size: r.b.size }, grid: C.GRID, drawn: drawnSet.has(r.key) }; }
    function loadingUnder(x, z) { var r = recAt(x, z, true); return !r || r.z < Math.min(limitOf(r), MAXZ); }   // the finest tile there is not drawn yet (the descent waits for it)

    function seams() {   // every drawn pair sharing an edge: the largest height step along it, against the smaller skirt that must hide it (tiles.js)
      var D = drawn, pairs = 0, worst = null, maxRatio = 0;
      function along(A, B, vertical, cc, lo, hi) { var st = 0; for (var i = 0; i <= 32; i++) { var p = lo + (hi - lo) * i / 32, x = vertical ? cc : p, z = vertical ? p : cc; st = Math.max(st, Math.abs(surf(A, x, z) - surf(B, x, z))); } return st; }
      for (var i = 0; i < D.length; i++) for (var j = i + 1; j < D.length; j++) { var A = D[i], B = D[j], a = A.b, b = B.b, st = null, tol = 0.01 * Math.max(1, a.size / 1e4);
        var lo = Math.max(a.z0, b.z0), hi = Math.min(a.z0 + a.size, b.z0 + b.size), lx = Math.max(a.x0, b.x0), hx = Math.min(a.x0 + a.size, b.x0 + b.size);
        if (Math.abs(a.x0 + a.size - b.x0) < tol && hi > lo) st = along(A, B, true, b.x0, lo, hi); else if (Math.abs(b.x0 + b.size - a.x0) < tol && hi > lo) st = along(A, B, true, a.x0, lo, hi);
        else if (Math.abs(a.z0 + a.size - b.z0) < tol && hx > lx) st = along(A, B, false, b.z0, lx, hx); else if (Math.abs(b.z0 + b.size - a.z0) < tol && hx > lx) st = along(A, B, false, a.z0, lx, hx);
        if (st == null) continue; pairs++; var sk = Math.min(A.skirt, B.skirt), ratio = st / sk; if (ratio > maxRatio) { maxRatio = ratio; worst = { a: A.key, b: B.key, step: +st.toFixed(2), skirt: +sk.toFixed(1) }; } }
      return { drawn: D.length, pairs: pairs, maxRatio: +maxRatio.toFixed(3), worst: worst, ok: pairs > 0 && maxRatio < 1 };
    }
    var api = { update: update, setFrame: setFrame, H: groundUnder, probe: probe, loadingUnder: loadingUnder, seams: seams, stats: stats, group: group, material: material, u: u, tiles: tiles,
      frame: function () { return f; }, drawnKeys: function () { return drawn.map(function (r) { return r.key; }); }, liveKeys: function () { return Array.from(tiles.keys()); }, inflightKeys: function () { return Array.from(inflight.keys()); },
      missingKeys: function () { return Array.from(missing); }, maxZ: MAXZ, sets: sets.map(function (s) { return s.id; }), have: have.size };
    return api;
  }

  /* the depth's clean slate between the far pass and everything near (the bird is never hidden by a mountain shrunk toward the eye) */
  function makeClearer(THREE, layer) {
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false })); m.name = 'travel712:clear'; m.frustumCulled = false; m.renderOrder = -9.3;
    m.layers.set(layer == null ? C.LAYER : layer); m.onBeforeRender = function (r) { r.clearDepth(); }; return m;
  }

  return { C: C, speedAt: speedAt, horizon: horizon, farOf: farOf, keyOf: keyOf, childrenOf: childrenOf, sampleField: sampleField, fieldOf: fieldOf, boundsOf: boundsOf, tint: tint,
    makeMaterial: makeMaterial, makeStreamer: makeStreamer, makeClearer: makeClearer, version: 1 };
})();
