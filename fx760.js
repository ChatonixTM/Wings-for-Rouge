/* fx760.js - BOARD 760, PIXELFX, MADE 3D (Wings for Rouge). Trunks, Nov 7 2026. Wired by tools/wiring/wire-760-fx.js; guard tests/fx760.js.
   Marth, verbatim: "But we shud take his affects and 3D- fy some of the cool ones"; "Start on everything".
   WHAT IS HERE: five struck moments in the real world: a hit spark, an impact burst, a coin pickup, a blast at a fall, a water splash.
   Each is a flipbook on a camera-facing card (the picture) plus shards thrown through real 3D space (they fall, brake and hang, so turning the camera shows depth).
   BORROWED: the designs, beats, timings and colour ramps of pixelfx (hit-spark, crit-hit, collect-burst, small-explosion, poof, splash), read at
   github.com/patch-gg/pixelfx a84159688af3 and redrawn here; none of its code or pixels are in this file. MIT, (c) 2026 Patch, (c) 2026 Hugo Duprez: LICENSES.md carries the notice.
   THE GAME'S OWN: three.js r128, the attack, the coins, the swim, the two zones. HAND-WRITTEN: the small painter and the one mesh below.
   COST: ONE draw call for every effect at once, one 512 x 512 texture painted once at boot, no object made while playing, nothing drawn when nothing plays.
   Classic: never attached, so every call here does nothing. Every number a DRAFT. */
window.WFR_FX760 = (function () {
  'use strict';
  /* N: cards alive at once. CELL, GRID: one flipbook frame, and frames per side of the atlas. SEE: the least size, as a share of the camera's distance, so a blow 100 m off still reads.
     GAP: seconds before the same kind may fire again. PULL: how far a card comes toward the camera, as a share of its size, so a body does not cut it. RO: drawn after the world's glass. */
  var C = { N: 192, CELL: 64, GRID: 8, SEE: 0.085, KMAX: 40, GAP: 0.05, PULL: 0.5, RO: 30 };
  var TAU = Math.PI * 2, S = C.CELL * C.GRID;
  /* THE COLOURS, dark to white. Warm and crit are pixelfx's ramps; gold is collect-burst's ramp turned from pink to her coin; the blast is pale, for his white fade ("fade away kinda white ish"). */
  var WARM = ['#c9281f', '#f2561d', '#ff8a2a', '#ffe26b', '#fff3a6', '#ffffff'], CRIT = ['#a3142a', '#e0302c', '#ff7a2a', '#ffc23d', '#fff09a', '#ffffff'],
    GOLD = ['#b9770e', '#f2a81d', '#ffd23d', '#ffe98a', '#fff7cf', '#ffffff'], PALE = ['#ff9a3d', '#ffc23d', '#ffe26b', '#fff3a6', '#fffbe6', '#ffffff'],
    WATER = ['#1c8fc4', '#3fb4e0', '#7fd8f2', '#bdf0fa', '#e6fbff', '#ffffff'];
  /* THE CELLS: [first cell, frames] */
  var E = { spark: [0, 6], burst: [8, 8], coin: [16, 8], blast: [24, 8], splash: [32, 8], puff: [40, 4], hot: [44, 1], chip: [45, 1], drop: [46, 1], star: [47, 1] };
  /* THE RECIPES. main: [cell, life s, size m, added light 0-1, overshoot]. bits: [cell, count, slowest, fastest m/s, lift, gravity, drag, life, size, added light, delay]. */
  var R = {
    hit: { main: ['spark', 0.2, 1.3, 0.4, 0.35], bits: [['hot', 8, 4, 9, 0.2, 14, 0, 0.3, 0.22, 0.6, 0], ['chip', 5, 2, 4.5, 0.5, 16, 0, 0.42, 0.17, 0.2, 0]] },
    burst: { main: ['burst', 0.32, 2.6, 0.35, 0.3], bits: [['hot', 14, 6, 12, 0.15, 12, 1, 0.34, 0.26, 0.6, 0], ['chip', 8, 3, 6, 0.4, 16, 0, 0.5, 0.2, 0.2, 0]] },
    coin: { main: ['coin', 0.4, 1.6, 0.5, 0.2], bits: [['star', 10, 3.5, 6.5, 0.35, 0, 6, 0.62, 0.4, 0.5, 0.03]] },
    blast: { main: ['blast', 0.5, 3, 0.3, 0.25], bits: [['puff', 7, 1.6, 3.2, 0.25, -1, 3, 0.75, 1.4, 0, 0.06], ['hot', 12, 5, 10, 0.3, 12, 1, 0.42, 0.25, 0.6, 0], ['star', 5, 3, 5.5, 0.5, 0, 5, 0.7, 0.36, 0.5, 0.1]] },
    splash: { main: ['splash', 0.56, 2.8, 0.1, 0], lift: 0.3, crown: 3, bits: [['drop', 16, 2, 4.2, 1.5, 11, 0, 0.72, 0.24, 0.15, 0], ['puff', 3, 0.5, 1.2, 0.5, -0.4, 2, 0.6, 1.1, 0, 0.12]] },
  };
  var X = null, stat = { hit: 0, burst: 0, coin: 0, blast: 0, splash: 0, dropped: 0, peak: 0, ticks: 0, tickMs: 0, tickMax: 0, paintMs: 0, shifts: 0 }, seed = 760;
  function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function rng(a, b) { return a + (b - a) * rnd(); }

  /* ---------- THE PAINTER: every frame drawn once, at boot, pixel by pixel, on one canvas ---------- */
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function ramp(P, u) { var i = Math.max(0, Math.min(P.length - 1, Math.round(u * (P.length - 1)))); return P[i]; }   // u 0: the deep colour, 1: white
  function Brush(px) {
    var ox = 0, oy = 0, m = C.CELL - 1;
    var b = {
      cell: function (i) { ox = (i % C.GRID) * C.CELL; oy = Math.floor(i / C.GRID) * C.CELL; },
      dot: function (x, y, c, a) {   // over what is there; the cell's outer pixel stays clear, so a neighbour never bleeds in
        x = Math.round(x); y = Math.round(y); if (x < 1 || y < 1 || x >= m || y >= m || a <= 0) return; if (a > 1) a = 1;
        var i = ((oy + y) * S + ox + x) * 4, d = px[i + 3] / 255, o = a + d * (1 - a), k = rgb(c);
        for (var j = 0; j < 3; j++) px[i + j] = (k[j] * a + px[i + j] * d * (1 - a)) / o;
        px[i + 3] = o * 255;
      },
      cut: function (x, y, c, a) { if (a * 16 > BAYER[(Math.round(y) & 3) * 4 + (Math.round(x) & 3)]) b.dot(x, y, c, 1); },   // the fade by pattern, as pixel art dissolves
      disc: function (x, y, r, c, a) { for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) b.dot(x + dx, y + dy, c, a); },
      glow: function (x, y, r, c, a) { for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { var d = Math.sqrt(dx * dx + dy * dy) / r; if (d < 1) b.dot(x + dx, y + dy, c, a * (1 - d) * (1 - d)); } },
      ring: function (x, y, r, w, c, a, gaps) {
        var n = Math.ceil(r * 7) + 8, seedA = gaps || 0;
        for (var i = 0; i < n; i++) {
          var t = i / n * TAU; if (gaps && Math.sin(t * 5 + seedA) < -0.15) continue;
          for (var q = -w / 2; q <= w / 2; q += 0.5) b.dot(x + Math.cos(t) * (r + q), y + Math.sin(t) * (r + q), c, a);
        }
      },
      ray: function (x, y, t, L, w, P, from) {   // fat at the root, a hair at the tip, white cooling outward
        var c = Math.cos(t), s = Math.sin(t);
        for (var d = (from || 0) * L; d <= L; d += 0.5) {
          var u = d / L, hw = w * Math.pow(1 - u, 1.6), col = u < 0.3 ? P[5] : u < 0.62 ? P[4] : u < 0.88 ? P[3] : P[2];
          b.dot(x + c * d, y + s * d, col, 1);
          for (var o = 0.5; o <= hw; o += 0.5) { b.dot(x + c * d - s * o, y + s * d + c * o, col, 1); b.dot(x + c * d + s * o, y + s * d - c * o, col, 1); }
        }
      },
      diamond: function (x, y, r, P) { for (var dy = -r - 1; dy <= r + 1; dy++) for (var dx = -r - 1; dx <= r + 1; dx++) { var m2 = Math.abs(dx) + Math.abs(dy); if (m2 <= r) b.dot(x + dx, y + dy, P[5], 1); else if (m2 === r + 1) b.dot(x + dx, y + dy, P[4], 1); } },
    };
    return b;
  }
  var HALF = C.CELL / 2;
  /* hit-spark's beats: the whole cross round a white diamond; further and thinner; only the long ray, its root burning away; then the glow alone. */
  function paintSpark(b, f) {
    var A = 0.1, X0 = HALF, Y0 = HALF, rays = [[A, 27, 2.2], [A + Math.PI, 8, 2.2], [A - Math.PI / 2, 15, 2.6], [A + Math.PI / 2, 10, 2.3], [A - Math.PI / 4, 6, 1]], i, pop = Math.exp(-f / 1.6);
    b.glow(X0, Y0, 24, WARM[3], 0.55 * pop); b.glow(X0, Y0, 9, WARM[5], 0.5 * pop);
    if (f === 0) { for (i = 0; i < 5; i++) b.ray(X0, Y0, rays[i][0], rays[i][1], rays[i][2], WARM, 0); b.diamond(X0, Y0, 4, WARM); }
    else if (f === 1) { for (i = 0; i < 5; i++) b.ray(X0, Y0, rays[i][0], rays[i][1] * 1.18, rays[i][2] * 0.6, WARM, 0.12); b.diamond(X0, Y0, 3, WARM); }
    else if (f <= 3) b.ray(X0, Y0, A, 27 * (1.1 + f * 0.06), 0.7, WARM, 0.25 + f * 0.1);
  }
  /* crit-hit's beats: a jagged star slams in white and overshoots, cools from the rim, hollows; a ring breaks into flying arcs. */
  var SPIKES = (function () { var a = [], s = 11; for (var i = 0; i < 11; i++) { s = (s * 7 + 3) % 13; a.push(0.55 + s / 13 * 0.45); } return a; })();
  function starR(t) { var n = SPIKES.length, q = (t / TAU + 1) % 1 * n, i = Math.floor(q), f = q - i, tri = 1 - Math.abs(f - 0.5) * 2; return 0.42 + (SPIKES[i] - 0.42) * tri; }
  function paintBurst(b, f) {
    var u = f / 7, R0 = [31, 27, 25, 24, 23, 22, 21, 20][f], hole = Math.max(0, (u - 0.35) * 1.3), x, y;
    b.glow(HALF, HALF, 30, CRIT[3], 0.5 * (1 - u) * (1 - u));
    if (f < 6) for (y = 1; y < C.CELL - 1; y++) for (x = 1; x < C.CELL - 1; x++) {
      var dx = x - HALF, dy = y - HALF, d = Math.sqrt(dx * dx + dy * dy), r = R0 * starR(Math.atan2(dy, dx)), k = d / r;
      if (k >= 1 || k < hole) continue;
      b.dot(x, y, f < 1 ? (k > 0.8 ? CRIT[4] : CRIT[5]) : ramp(CRIT, 1 - k * (0.5 + u * 0.7)), 1);
    }
    if (f >= 1) b.ring(HALF, HALF, 10 + 23 * (1 - Math.pow(1 - u, 2)), Math.max(1, 3.5 - f * 0.45), f < 4 ? CRIT[5] : CRIT[3], 1 - u * 0.75, 1 + f * 0.2);
  }
  /* collect-burst's beats: a white flash and a cross of light, a thin ring snapping out ahead of a softer one. */
  function paintCoin(b, f) {
    var u = f / 7, e = 1 - Math.pow(1 - u, 3), L = 29 * Math.pow(1 - u, 0.7) + 4, i;
    b.glow(HALF, HALF, 24, GOLD[2], 0.6 * (1 - u));
    if (f < 3) b.disc(HALF, HALF, 8 - f * 2.5, GOLD[5], 1);
    if (f < 6) for (i = 0; i < 4; i++) b.ray(HALF, HALF, i * Math.PI / 2, L * (i % 2 ? 0.75 : 1), 2 * (1 - u), GOLD, 0);
    b.ring(HALF, HALF, 5 + 26 * e, 1, GOLD[5], 1 - u * u);
    b.ring(HALF, HALF, 3 + 19 * e, 2.5, GOLD[2], 0.65 * (1 - u));
  }
  /* small-explosion's first beats and poof's soft pop, made pale: a white flash, shock rings, a lumpy ball that cools and comes apart in a pattern. */
  function paintBlast(b, f) {
    var u = f / 7, R0 = 7 + 22 * (1 - Math.pow(1 - u, 2.2)), x, y;
    b.glow(HALF, HALF, 30, PALE[2], 0.7 * (1 - u));
    for (y = 1; y < C.CELL - 1; y++) for (x = 1; x < C.CELL - 1; x++) {
      var dx = x - HALF, dy = y - HALF, d = Math.sqrt(dx * dx + dy * dy), t = Math.atan2(dy, dx), r = R0 * (1 + 0.16 * Math.sin(t * 5 + f * 0.7) + 0.09 * Math.sin(t * 11 - f)), k = d / r;
      if (k >= 1) continue;
      var col = f < 2 ? PALE[5] : ramp(PALE, 1 - k * (0.25 + u * 0.8)), a = f < 3 ? 1 : (1 - u) * 1.5 * (0.45 + k * 0.75);
      b.cut(x, y, col, a);
    }
    b.ring(HALF, HALF, 8 + 24 * (1 - Math.pow(1 - u, 3)), Math.max(1, 3 - f * 0.4), PALE[5], 1 - u);
    if (f > 1) b.ring(HALF, HALF, 5 + 17 * u, 1, PALE[3], 0.7 * (1 - u));
  }
  /* splash's beats: a white hit, a crown that rises and tears at the tips, foam spreading on the water. */
  function paintSplash(b, f) {
    var u = f / 7, base = 48, up = Math.sin(Math.PI * Math.pow(u, 0.65)), i, j;
    if (f < 2) { b.glow(HALF, base - 4, 16, WATER[5], 0.9 - f * 0.3); b.disc(HALF, base - 2, 5 - f * 2, WATER[5], 1); }
    var spread = 8 + 18 * u, H = 40 * up;
    for (i = -6; i <= 6; i++) {
      var w = i / 6, x0 = HALF + w * spread * 0.55, tip = H * (1 - 0.72 * w * w) * (0.82 + 0.18 * Math.sin(i * 2.3)), lean = w * spread * 0.45, rip = u > 0.45 ? 0.35 + u * 0.4 : 0;
      for (j = 0; j <= tip; j += 0.5) {
        var v = tip ? j / tip : 0; if (v < rip * 0.5 && v > rip * 0.25) continue;
        var cx = x0 + lean * v * v, hw = 1.8 * (1 - v) + 0.5, col = ramp(WATER, 0.18 + v * 0.82);
        for (var o = -hw; o <= hw; o += 0.5) b.dot(cx + o, base - j, col, 1);
      }
      if (tip > 4) b.disc(x0 + lean, base - tip - 1, 1.3, WATER[5], 1);
    }
    var fw = 9 + 19 * u;
    for (i = -fw; i <= fw; i++) { var e = 1 - Math.abs(i / fw), hgt = 3.5 * e + 1; for (j = 0; j < hgt; j++) b.cut(HALF + i, base + j - 1, j < 1.5 ? WATER[5] : WATER[3], (1 - u * 0.7) * (0.6 + 0.4 * e) * 1.1); }
  }
  /* poof's soft round ball, thinning */
  function paintPuff(b, f) {
    var u = f / 3, r = 14 + f * 3.5, x, y;
    for (y = 1; y < C.CELL - 1; y++) for (x = 1; x < C.CELL - 1; x++) {
      var dx = x - HALF, dy = y - HALF, d = Math.sqrt(dx * dx + dy * dy) / r; if (d >= 1) continue;
      b.cut(x, y, dy > r * 0.25 ? '#f1e7d6' : '#ffffff', (1 - u * 0.75) * (1.1 - d * d * 0.7));
    }
  }
  function paintBits(b) {
    b.cell(E.hot[0]); b.glow(HALF, HALF, 28, WARM[3], 0.9); b.disc(HALF, HALF, 12, WARM[4], 1); b.disc(HALF, HALF, 7, WARM[5], 1);
    b.cell(E.chip[0]); b.diamond(HALF, HALF, 20, ['', '', '', '', '#ff8a2a', '#ffe26b']); b.diamond(HALF, HALF, 9, ['', '', '', '', '#fff3a6', '#ffffff']);
    b.cell(E.drop[0]); b.glow(HALF, HALF, 26, WATER[3], 0.7); b.disc(HALF, HALF + 5, 15, WATER[3], 1); b.disc(HALF - 2, HALF + 3, 9, WATER[5], 1); for (var i = 0; i < 18; i++) b.disc(HALF, HALF - i, 13 * (1 - i / 18), WATER[3], 1);
    b.cell(E.star[0]); b.glow(HALF, HALF, 24, GOLD[3], 0.7); for (var k = 0; k < 4; k++) b.ray(HALF, HALF, k * Math.PI / 2, 29, 5, GOLD, 0); b.disc(HALF, HALF, 6, GOLD[5], 1);
  }
  function paint() {
    var cv = document.createElement('canvas'); cv.width = cv.height = S; var g = cv.getContext('2d'), img = g.createImageData(S, S), b = Brush(img.data), f;
    for (f = 0; f < E.spark[1]; f++) { b.cell(E.spark[0] + f); paintSpark(b, f); }
    for (f = 0; f < 8; f++) { b.cell(E.burst[0] + f); paintBurst(b, f); b.cell(E.coin[0] + f); paintCoin(b, f); b.cell(E.blast[0] + f); paintBlast(b, f); b.cell(E.splash[0] + f); paintSplash(b, f); }
    for (f = 0; f < 4; f++) { b.cell(E.puff[0] + f); paintPuff(b, f); }
    paintBits(b); g.putImageData(img, 0, 0); return cv;
  }

  /* ---------- THE ONE MESH: every card of every effect, one draw call ---------- */
  var VS = 'attribute vec4 iP;attribute vec4 iD;varying vec2 vUv;varying vec2 vK;uniform float uG;uniform float uPull;\n' +
    'void main(){vec4 mv=modelViewMatrix*vec4(iP.xyz,1.);float L=length(mv.xyz);mv.xyz*=1.-min(uPull*iD.x/max(L,.001),.4);float c=cos(iD.y),s=sin(iD.y);vec2 q=position.xy*iD.x;mv.xy+=vec2(q.x*c-q.y*s,q.x*s+q.y*c);\n' +
    'float col=mod(iD.z,uG),row=floor(iD.z/uG);vUv=vec2(col+position.x+.5,row+.5-position.y)/uG;vK=vec2(iD.w,iP.w);gl_Position=projectionMatrix*mv;}';
  var FS = 'uniform sampler2D uMap;varying vec2 vUv;varying vec2 vK;\n' +
    'void main(){vec4 t=texture2D(uMap,vUv);if(t.a<.004)discard;gl_FragColor=vec4(t.rgb*vK.x,t.a*vK.x*(1.-vK.y));}';   // the picture comes premultiplied, so one blend carries solid colour and added light together
  /* one card, 18 numbers: 0 x 1 y 2 z 3 vx 4 vy 5 vz 6 gravity 7 drag 8 age 9 life 10 size 11 turn 12 spin 13 first cell 14 frames 15 added light 16 overshoot 17 growth */
  var ST = 18, P = null, n = 0, A = null, B = null, cursor = 0, last = {};
  function attach(io) {
    if (X) return X; var THREE = io.THREE, t0 = performance.now(), cv = paint(); stat.paintMs = +(performance.now() - t0).toFixed(2);
    var tex = new THREE.CanvasTexture(cv); tex.flipY = false; tex.premultiplyAlpha = true; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    var g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    P = new Float32Array(C.N * ST); A = new THREE.InstancedBufferAttribute(new Float32Array(C.N * 4), 4); B = new THREE.InstancedBufferAttribute(new Float32Array(C.N * 4), 4);
    A.setUsage(THREE.DynamicDrawUsage); B.setUsage(THREE.DynamicDrawUsage); g.setAttribute('iP', A); g.setAttribute('iD', B); g.instanceCount = 0;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e12);   // the warm-up hands frustum culling back; this keeps it from ever hiding a card
    var m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uMap: { value: tex }, uG: { value: C.GRID }, uPull: { value: C.PULL } }, transparent: true, depthWrite: false, depthTest: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, fog: false });
    var o = new THREE.Mesh(g, m); o.name = 'fx760'; o.frustumCulled = false; o.visible = false; o.renderOrder = C.RO; if (io.layer != null) o.layers.enable(io.layer); io.scene.add(o);
    X = { o: o, g: g, camera: io.camera, tex: tex }; return X;
  }
  function card(cell, x, y, z, vx, vy, vz, grav, drag, life, size, add, over, delay, turn, spin, grow) {
    if (n >= C.N) { stat.dropped++; return; }
    var q = n * ST; n++; P[q] = x; P[q + 1] = y; P[q + 2] = z; P[q + 3] = vx; P[q + 4] = vy; P[q + 5] = vz; P[q + 6] = grav; P[q + 7] = drag; P[q + 8] = -delay; P[q + 9] = life; P[q + 10] = size; P[q + 11] = turn; P[q + 12] = spin; P[q + 13] = E[cell][0]; P[q + 14] = E[cell][1]; P[q + 15] = add; P[q + 16] = over; P[q + 17] = grow;
  }
  function play(kind, x, y, z, k) {
    var r = R[kind]; if (!X || !r) return false;
    if (last[kind] != null && clock - last[kind] < C.GAP) return false; last[kind] = clock;
    var cam = X.camera, d = cam ? Math.sqrt((cam.position.x - x) * (cam.position.x - x) + (cam.position.y - y) * (cam.position.y - y) + (cam.position.z - z) * (cam.position.z - z)) : 0;
    k = Math.min(C.KMAX, Math.max(k || 1, d * C.SEE)); var M = r.main, i, j, y0 = y + (r.lift ? M[2] * r.lift * k : 0);
    card(M[0], x, y0, z, 0, 0, 0, 0, 0, M[1], M[2] * k, M[3], M[4], 0, kind === 'splash' ? 0 : rng(-0.35, 0.35), 0, 0);
    for (i = 0; i < (r.crown || 0); i++) { var a = i / r.crown * TAU + rng(0, 1); card(M[0], x + Math.sin(a) * 0.5 * k, y0 - 0.1 * k, z + Math.cos(a) * 0.5 * k, 0, 0, 0, 0, 0, M[1] * 0.85, M[2] * k * 0.72, M[3], 0, 0.05 + i * 0.05, 0, 0, 0); }
    for (j = 0; j < r.bits.length; j++) {
      var b = r.bits[j];
      for (i = 0; i < b[1]; i++) {
        var t = rnd() * TAU, c = rng(-1, 1), s = Math.sqrt(1 - c * c), v = rng(b[2], b[3]) * Math.sqrt(k);
        card(b[0], x, y, z, Math.sin(t) * s * v, (c * 0.6 + b[4]) * v, Math.cos(t) * s * v, b[5] * Math.sqrt(k), b[6], b[7] * rng(0.75, 1.15), b[8] * k * rng(0.75, 1.2), b[9], 0, b[10] * rng(0, 1.6), rng(0, TAU), rng(-7, 7), b[0] === 'puff' ? 0.5 : 0);
      }
    }
    stat[kind]++; if (n > stat.peak) stat.peak = n; return true;
  }
  var clock = 0;
  function tick(dt) {
    clock += dt; if (!X || !n) return;
    var t0 = performance.now(), Ad = A.array, Bd = B.array, i = 0;
    while (i < n) {
      var q = i * ST, age = P[q + 8] + dt; P[q + 8] = age; if (age >= P[q + 9]) { n--; if (i < n) P.copyWithin(q, n * ST, n * ST + ST); continue; }
      if (age >= 0) {
        var dr = P[q + 7] ? Math.max(0, 1 - P[q + 7] * dt) : 1; P[q + 3] *= dr; P[q + 5] *= dr; P[q + 4] = P[q + 4] * dr - P[q + 6] * dt;
        P[q] += P[q + 3] * dt; P[q + 1] += P[q + 4] * dt; P[q + 2] += P[q + 5] * dt; P[q + 11] += P[q + 12] * dt;
      }
      var u = Math.max(0, age) / P[q + 9], nf = P[q + 14], w = i * 4, over = 1 - u;
      Ad[w] = P[q]; Ad[w + 1] = P[q + 1]; Ad[w + 2] = P[q + 2]; Ad[w + 3] = P[q + 15];
      Bd[w] = age < 0 ? 0 : P[q + 10] * (1 + P[q + 16] * over * over * over) * (1 + P[q + 17] * u); Bd[w + 1] = P[q + 11]; Bd[w + 2] = P[q + 13] + Math.min(nf - 1, Math.floor(u * nf)); Bd[w + 3] = age < 0 ? 0 : (nf > 1 ? 1 : Math.min(1, (1 - u) * 2.5));
      i++;
    }
    X.g.instanceCount = n; X.o.visible = n > 0; A.needsUpdate = true; B.needsUpdate = true;
    var ms = performance.now() - t0; stat.ticks++; stat.tickMs += ms; if (ms > stat.tickMax) stat.tickMax = ms;
  }
  function shift(dx, dz) { if (!n) return; stat.shifts++; for (var i = 0; i < n; i++) { P[i * ST] += dx; P[i * ST + 2] += dz; } }   /* the travel frame recentred: a card stays where it was struck */
  function clear() { n = 0; if (X) { X.g.instanceCount = 0; X.o.visible = false; } }
  function warm() { return X ? [X.o] : []; }   /* atkPose's first frames: the program compiles and the picture uploads at boot */
  function peek() { return { ready: !!X, alive: n, drawn: X ? X.o.visible : false, stat: Object.assign({}, stat), atlas: S, n: C.N }; }
  function ready() { return !!X; }
  function mesh() { return X ? X.o : null; }   /* the bench's: the guard reads its picture */
  return { C: C, R: R, E: E, mesh: mesh, attach: attach, play: play, tick: tick, shift: shift, clear: clear, warm: warm, peek: peek, ready: ready };
})();
