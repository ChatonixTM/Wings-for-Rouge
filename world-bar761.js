/* world-bar761.js - BOARD 761b + 762, THE BAR (Marth, Nov 7 2026, verbatim: "I want the world to look at least as good as this , yes I understand tripo is a factor").
   The look aimed at is board 761's reference clip. Trunks, Nov 7 and Nov 11 2026. Every number DRAFT (unmeasured on her phone).

   WHAT THIS UNIT IS NOT (so nobody ticks row 761 on it):
     - NOT full tree crowns. The crowns are RE-LIT: the same triangles, with rounded normals and a fill from the sky. No new geometry, no fuller shape.
     - NOT a skyline. Nothing far away is built here.
     - NOT seen on a phone. Every number comes from a desktop graphics card with the CPU slowed three times.

   WHAT SHIPS (Nov 11 2026): the shade map, the grass's light and the crowns' light. THE FOG IS BUILT AND HELD BACK: it is OFF unless localStorage 'wfr.fog762' === 'on'.
     Why: it hides the bird in flight. Over the park at 30 m in the morning her red pixels fell from about 210 to about 20 with the mist on (the travel sheet, render order -9.31; the cause is NOT found:
     the depth wipe is suspected and untested), and from the air the mist reads as a white blotch under her that stops about 100 m out. Off means: no fog mesh, no fog program, no noise or flow texture,
     no fluid made or stepped, nothing uploaded, no fog work in the frame. The guard's default run judges this state; its --fog run is the door the fog must pass before it is switched on.
   THE GRASS, plainly (the wire's V1 and V13): thicker than the game before out to about 46 m from her, THINNER beyond (46 to 70 m: 3,693 clumps against 5,554; 70 to 110 m: 1,151 against 4,481).
     The reach (110 m), the full ring (24 m) and the cap (16,000 clumps) are the old ones, so the near grass is paid for by the far grass.

   WHAT IT DOES, round her, on the island and on the real ground (under 140 m):
     1. THE SHADE MAP. One 256 px canvas, 224 m across, painted again when she has moved 14 m, the sun has turned, or the trees and grass round her have changed (at most twice a second, a slice a frame).
        Red = soft cast shadows (each tree's crown stretched away from the sun, its trunk's streak, a dark foot; the real world's buildings swept along the sun). Green = where the grass grows.
        Blue = under a roof (the island's houses, the real world's buildings): there no shade, no green floor and no mist is drawn.
        The ground reads it through ONE draped sheet (a multiply, so night and day need no second colour) and every grass clump reads it in its vertex shader,
        so a shadow lies across the blades as well as under them. Her own contact shadow is worked out in the sheet's shader: it costs no repaint.
     2. THE FOG (row 762), HELD BACK (see WHAT SHIPS): only with 'wfr.fog762' = 'on'. Two thin sheets just over the grass. Exactly what it does, and no more:
        - The mist is a tiling noise picture SCROLLED by a fixed wind (C.WIND). Its drift is not a simulation.
        - What PARTS it is a small fluid on the CPU: 48 x 48 cells, 2 m each, that travel with her. While she MOVES (over 0.2 m/s) lower than 14 m above the ground, on foot or flying,
          her body pushes the air and thins the mist where she is. The hole closes slowly behind her (about 40 s). Higher than 14 m she does not touch it; standing still she does not push it.
          The guard proves the parting on foot only. Flying low through it runs the same code and is NOT proven.
        - Morning only (the page says how much), gone in rain, never under a roof.

   FOLLOWS / REWRITTEN FROM (nothing of theirs ships as a file; licences read at source Nov 7 2026, sources pinned to a commit):
     - the fluid's steps (advect, splat, divergence, Jacobi pressure, subtract the gradient) are ADAPTED from Pavel Dobryakov's WebGL-Fluid-Simulation (MIT, (c) 2017 Pavel Dobryakov,
       github.com/PavelDoGreat/WebGL-Fluid-Simulation at a2d292931f19), after Jos Stam's Stable Fluids: written again for the CPU, the divergence and pressure lines term for term his.
       (His runs on half-float render targets, which r128 on an old phone cannot be trusted with, and which would add five programs and a dozen passes a frame.) His notice is printed in LICENSES.md.
     - the blades' root-to-tip colour ramp and the lean away from her (world-vegetation.js) follow Simon Dev's Quick_Grass (MIT, (c) 2023 simondevyoutube, github.com/simondevyoutube/Quick_Grass at 6b56164272f2).
     - this unit's own: the wider far clumps, the mist's noise, the shade map, the crowns' light.
   three.js stays r128: nothing here needs newer.

   PHONE COST AS IT SHIPS (the fog off): the shade sheet, 3,200 triangles and 1 program more than the game before it (the grass gives nothing back: its cap is the old 16,000 clumps). One 256 px upload
   at most twice a second while she moves, its painting spread over a few frames (0.4 ms each).
   WITH THE FOG ON (held back): 9,600 triangles and 2 programs in all. One 9 KB upload at 30 Hz while she is moving through the mist, and after she stops until the air has come to rest and the mist has
   closed again (about 40 s); after that nothing is stepped and nothing is uploaded. In the travel zone the sheets are drawn in the OPAQUE list with their own blending (three keeps custom blending there)
   so they fall before the clearer's depth wipe, where the ground and the trees still hold depth; on the island they are plain transparent things.

   Use (tools/wiring/wire-761b-bar.js does it):
     WFR_BAR.attach(THREE, scene, renderer, T, { sunDir, sunK(), fogNow(), her(), fogCol(), island: { H, water }, floors(cb) })   at load, after WFR_VEG.attach
     WFR_BAR.tick(cam, dt)     each travel frame, after WFR_VEG.tick          WFR_BAR.island(cam, dt)   each island frame, after WFR_VEG.island
     WFR_BAR.peek()            the bench
   localStorage 'wfr.bar' = 'off': nothing at all (the state before this unit, and one of the guard's plants). Classic is frozen (board 645): never in Classic.
   localStorage 'wfr.fog762' = 'on': the fog as well (held back; anything else, or nothing, is off). */
window.WFR_BAR = (function () {
  'use strict';
  var C = { R: 112, PX: 256, G: 41, MOVE: 14, AGL0: 70, AGL1: 140, SLICE_MS: 0.35, DRAW_MS: 0.4, REDRAW_S: 0.5, SUN_EPS: 0.015, SHADE: 1, LEN_MAX: 2.6, FOOT: 0.55, CROWN: 0.85, UNDER: [0.3, 0.6, 0.44], UNDER_K: 0.9, UNDER_ISLE: 0.45, UNDER_AGL: [8, 34],
    LIFT: 0.2, FOG_N: 48, FOG_CELL: 2, FOG_LO: 0.42, FOG_HI: 0.95, FOG_A: 0.5, FOG_WHITE: 0.7, FOG_AGL0: 10, FOG_AGL1: 70, FOG_HZ: 30, HER_R: 3.2, HER_AGL: 14, REFILL: 0.1, DRAG: 1.1, JACOBI: 6, WIND: [0.017, 0.0105], BUILD_H: 60, ROOF_PAD: 1.5 };   // the roof mask reaches 1.5 m past the walls: the map is 0.9 m a pixel and smoothed, and a narrower one let mist in along the foot of the walls
  var OFF = (function () { try { return !!(window.WFR_DOOR && window.WFR_DOOR.classic) || localStorage.getItem('wfr.bar') === 'off'; } catch (e) { return !!(window.WFR_DOOR && window.WFR_DOOR.classic); } })();
  var FOG = (function () { try { return localStorage.getItem('wfr.fog762') === 'on'; } catch (e) { return false; } })();   // the fog is held back: it hides the bird in flight (see the head)
  try { var TUNE = JSON.parse(localStorage.getItem('wfr.bar.C') || 'null'); if (TUNE && localStorage.getItem('wfr.debug') === '1') for (var tk in TUNE) if (tk in C) C[tk] = TUNE[tk]; } catch (e) { /* the bench's tuning only (debug saves) */ }
  var NL = String.fromCharCode(10), S = null, WHITE = { r: 1, g: 0.99, b: 0.96 };
  function sstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  /* ═══ the shaders: the travel zone's shrink toward the eye and the Earth's curve, as the grass has them (uInvK 1 on the island) ═══ */
  function vs(REFR, fog) { return [
    'uniform vec3 uEye; uniform float uInvK; uniform float uLift; varying vec2 vXZ; varying float vD;', fog ? 'attribute float aSlice;' : '',
    'void main() { vec3 wp = position; float d = length( wp.xz - uEye.xz ); vXZ = wp.xz; vD = d;',
    fog ? '  wp.y += mix( ' + C.FOG_LO.toFixed(3) + ', ' + C.FOG_HI.toFixed(3) + ', aSlice );' : '  wp.y += uLift + d * 0.004;',
    '  vec3 r = wp - uEye; r.y -= d * d / ( 2.0 * ' + REFR.toFixed(1) + ' ); wp = uEye + r * uInvK;',
    '  gl_Position = projectionMatrix * viewMatrix * vec4( wp, 1.0 ); }'].join(NL); }
  var EDGE = 'float edgeOf( vec2 uv ) { return 1.0 - smoothstep( 0.40, 0.5, max( abs( uv.x - 0.5 ), abs( uv.y - 0.5 ) ) ); }';
  function fsSheet() { var U = C.UNDER; return [
    'uniform sampler2D uTex; uniform vec4 uC; uniform vec4 uHer; uniform float uUK; varying vec2 vXZ; varying float vD;', EDGE,
    'void main() { vec2 uv = ( vXZ - uC.xy ) * uC.z + 0.5; vec4 t = texture2D( uTex, uv ); float e = edgeOf( uv ), out0 = 1.0 - t.b * e, sh = t.r * uC.w * e * out0;',
    '  vec2 dh = ( vXZ - uHer.xy ) / uHer.z; sh = 1.0 - ( 1.0 - sh ) * ( 1.0 - uHer.w * exp( -dot( dh, dh ) * 2.2 ) );',
    '  vec3 under = mix( vec3( 1.0 ), vec3( ' + U[0].toFixed(3) + ', ' + U[1].toFixed(3) + ', ' + U[2].toFixed(3) + ' ), t.g * e * out0 * uUK * ( 1.0 - smoothstep( 0.28, 0.42, length( uv - 0.5 ) ) ) );',
    '  gl_FragColor = vec4( under * mix( vec3( 1.0 ), vec3( 0.36, 0.44, 0.52 ), sh ), 1.0 ); }'].join(NL); }
  function fsFog() { return [
    'uniform sampler2D uTex; uniform sampler2D uNoise; uniform sampler2D uFlow; uniform vec4 uC; uniform vec4 uFC; uniform vec3 uCol; uniform vec3 uDrift; varying vec2 vXZ; varying float vD;', EDGE,
    'void main() { vec2 fu = ( vXZ - uFC.xy ) * uFC.z + 0.5; vec3 fl = texture2D( uFlow, fu ).rgb; float inF = edgeOf( fu ); inF *= inF;',
    '  vec2 vel = ( fl.rg - 0.5 ) * inF; float keep = mix( 1.0, fl.b, inF );',
    '  vec2 p = vXZ * 0.021 + uDrift.xy - vel * 0.22; float n = texture2D( uNoise, p ).r * 0.62 + texture2D( uNoise, p * 2.6 + vec2( 0.31, 0.77 ) - uDrift.xy * 1.7 ).r * 0.38;',
    '  float a = smoothstep( 0.36, 0.66, n ) * keep * uFC.w * smoothstep( 1.2, 7.0, vD ) * ( 1.0 - smoothstep( 72.0, 108.0, vD ) );',
    '  vec2 uv = ( vXZ - uC.xy ) * uC.z + 0.5; vec4 tB = texture2D( uTex, uv ); float eB = edgeOf( uv ), sh = tB.r * uC.w * eB;',
    '  gl_FragColor = vec4( uCol * ( 1.0 - 0.34 * sh ), a * ( 1.0 - tB.b * eB ) ); }'].join(NL); }

  /* a mist that tiles: summed octaves of a hashed lattice, each wrapped to its own period (128 px; mipmapped, so the far sheet does not shimmer) */
  function noiseTex(T) {
    var N = 128, A = new Uint8Array(N * N * 4), hash = window.WFR_VEG.hash3, oct = [[8, 0.5], [16, 0.28], [32, 0.15], [64, 0.07]];
    function lat(i, j, P, s) { return hash(((i % P) + P) % P, ((j % P) + P) % P, s) / 4294967296; }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var v = 0;
      for (var o = 0; o < oct.length; o++) { var P = oct[o][0], fx = x / N * P, fy = y / N * P, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var a = lat(ix, iy, P, o), b = lat(ix + 1, iy, P, o), c = lat(ix, iy + 1, P, o), d = lat(ix + 1, iy + 1, P, o); v += (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty) * oct[o][1]; }
      var q = (y * N + x) * 4; A[q] = A[q + 1] = A[q + 2] = Math.round(Math.max(0, Math.min(1, v)) * 255); A[q + 3] = 255; }
    var t = new T.DataTexture(A, N, N, T.RGBAFormat, T.UnsignedByteType); t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
  }

  /* ═══ THE FLUID (the CPU's Stable Fluids: Pavel Dobryakov's steps, see the head). Pure numbers: node runs it as the page does ═══ */
  function makeFluid(N, cell) {
    var n2 = N * N, u = new Float32Array(n2), v = new Float32Array(n2), d = new Float32Array(n2).fill(1), u2 = new Float32Array(n2), v2 = new Float32Array(n2), d2 = new Float32Array(n2), p = new Float32Array(n2), p2 = new Float32Array(n2), dv = new Float32Array(n2);
    var F = { N: N, cell: cell, ox: 0, oz: 0, set: false, u: u, v: v, d: d, moving: true, steps: 0, shifts: 0 };
    function lerp(a, x, y) { x = x < 0 ? 0 : x > N - 1.001 ? N - 1.001 : x; y = y < 0 ? 0 : y > N - 1.001 ? N - 1.001 : y; var i = x | 0, j = y | 0, s = x - i, t = y - j, q = j * N + i; return (a[q] * (1 - s) + a[q + 1] * s) * (1 - t) + (a[q + N] * (1 - s) + a[q + N + 1] * s) * t; }
    F.anchor = function (x, z) {   // the grid goes with her in whole cells, so the air it holds stays put in the world
      var ox = Math.round(x / cell) * cell - N / 2 * cell, oz = Math.round(z / cell) * cell - N / 2 * cell;
      if (!F.set) { F.ox = ox; F.oz = oz; F.set = true; return; } var di = Math.round((ox - F.ox) / cell), dj = Math.round((oz - F.oz) / cell); if (!di && !dj) return;
      var A = [[u, u2, 0], [v, v2, 0], [d, d2, 1]]; for (var k = 0; k < 3; k++) { var a = A[k][0], b = A[k][1], f = A[k][2]; for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) { var si = i + di, sj = j + dj; b[j * N + i] = si >= 0 && sj >= 0 && si < N && sj < N ? a[sj * N + si] : f; } a.set(b); }
      F.ox = ox; F.oz = oz; F.shifts++;
    };
    F.moved = function (dx, dz) { F.ox += dx; F.oz += dz; };   // a re-centre: the world's numbers moved, the air did not
    F.reset = function () { u.fill(0); v.fill(0); d.fill(1); F.set = false; F.moving = true; };
    F.step = function (dt, her) {   // her: { x, z, vx, vz, r, on }
      var i, j, q, peak = 0, rest = 1;
      if (her && her.on) { var hi = (her.x - F.ox) / cell, hj = (her.z - F.oz) / cell, rc = her.r / cell, R = Math.ceil(rc * 2), sp = Math.hypot(her.vx, her.vz), push = 1.6 + Math.min(sp, 24) * 0.7;
        for (j = Math.max(1, Math.floor(hj - R)); j <= Math.min(N - 2, Math.ceil(hj + R)); j++) for (i = Math.max(1, Math.floor(hi - R)); i <= Math.min(N - 2, Math.ceil(hi + R)); i++) { var ax = i - hi, az = j - hj, r2 = (ax * ax + az * az) / (rc * rc), w = Math.exp(-r2 * 1.4), rl = Math.sqrt(ax * ax + az * az) || 1; q = j * N + i;
          u[q] += (her.vx * 0.5 + ax / rl * push) * w * dt * 5; v[q] += (her.vz * 0.5 + az / rl * push) * w * dt * 5; d[q] *= 1 - Math.min(0.9, w * dt * (4 + sp * 0.5)); } }
      var kk = dt / cell;
      for (j = 0; j < N; j++) for (i = 0; i < N; i++) { q = j * N + i; var bx = i - u[q] * kk, by = j - v[q] * kk; u2[q] = lerp(u, bx, by); v2[q] = lerp(v, bx, by); d2[q] = lerp(d, bx, by); }
      u.set(u2); v.set(v2); d.set(d2);
      for (j = 1; j < N - 1; j++) for (i = 1; i < N - 1; i++) { q = j * N + i; dv[q] = (u[q + 1] - u[q - 1] + v[q + N] - v[q - N]) * 0.5; }
      p.fill(0); for (var it = 0; it < C.JACOBI; it++) { for (j = 1; j < N - 1; j++) for (i = 1; i < N - 1; i++) { q = j * N + i; p2[q] = (p[q - 1] + p[q + 1] + p[q - N] + p[q + N] - dv[q]) * 0.25; } p.set(p2); }
      var drag = Math.max(0, 1 - dt * C.DRAG), fill = Math.min(1, dt * C.REFILL);
      for (j = 1; j < N - 1; j++) for (i = 1; i < N - 1; i++) { q = j * N + i; u[q] = (u[q] - (p[q + 1] - p[q - 1]) * 0.5) * drag; v[q] = (v[q] - (p[q + N] - p[q - N]) * 0.5) * drag; d[q] += (1 - d[q]) * fill; var m = Math.abs(u[q]) + Math.abs(v[q]); if (m > peak) peak = m; if (d[q] < rest) rest = d[q]; }
      F.moving = peak > 0.02 || rest < 0.985; F.steps++;
    };
    F.pack = function (A) { for (var q = 0; q < n2; q++) { var o = q * 4, a = 0.5 + u[q] / 24, b = 0.5 + v[q] / 24; A[o] = a < 0 ? 0 : a > 1 ? 255 : a * 255; A[o + 1] = b < 0 ? 0 : b > 1 ? 255 : b * 255; A[o + 2] = d[q] * 255; A[o + 3] = 255; } };
    return F;
  }

  /* ═══ THE GAME'S SIDE ═══ */
  function attach(THREE, scene, renderer, TR, o) {
    if (S || OFF || !window.WFR_VEG || !WFR_VEG.api() || !TR || !TR.u) return null; o = o || {};
    var T = THREE, V = WFR_VEG.api(), W = window.WFR_WORLD, REFR = (window.WFR_TRAVEL712 && WFR_TRAVEL712.C && WFR_TRAVEL712.C.REFR) || 7432843, G = C.G, STEP = 2 * C.R / (G - 1), PX = C.PX;
    var cv = document.createElement('canvas'); cv.width = cv.height = PX; var ctx = cv.getContext('2d'), tex = new T.CanvasTexture(cv); tex.flipY = false; tex.generateMipmaps = false; tex.minFilter = tex.magFilter = T.LinearFilter; tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, PX, PX);
    var blob = document.createElement('canvas'); blob.width = blob.height = 64; { var bg = blob.getContext('2d'), gr = bg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,0,0,1)'); gr.addColorStop(0.55, 'rgba(255,0,0,0.62)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); bg.fillStyle = gr; bg.fillRect(0, 0, 64, 64); }
    var FN = C.FOG_N, fluid = null, flowA = null, flow = null, noise = null;   // the fog's own things: made only when the fog is on
    if (FOG) { fluid = makeFluid(FN, C.FOG_CELL); flowA = new Uint8Array(FN * FN * 4); flow = new T.DataTexture(flowA, FN, FN, T.RGBAFormat, T.UnsignedByteType); flow.magFilter = flow.minFilter = T.LinearFilter; flow.generateMipmaps = false; fluid.pack(flowA); flow.needsUpdate = true; noise = noiseTex(T); }
    var uC ={ value: new T.Vector4(0, 0, 1 / (2 * C.R), 0) }, uHer = { value: new T.Vector4(0, 0, 1, 0) }, uFC = { value: new T.Vector4(0, 0, 1 / (FN * C.FOG_CELL), 0) }, uCol = { value: new T.Color(0xffffff) }, uDrift = { value: new T.Vector3() }, uLift = { value: C.LIFT };

    var pos = new T.BufferAttribute(new Float32Array(G * G * 3), 3); pos.setUsage(T.DynamicDrawUsage); var idx = new Uint16Array((G - 1) * (G - 1) * 6), ii = 0;
    for (var j = 0; j < G - 1; j++) for (var i = 0; i < G - 1; i++) { var a = j * G + i, b = a + 1, c = a + G, d = c + 1; idx[ii++] = a; idx[ii++] = c; idx[ii++] = b; idx[ii++] = b; idx[ii++] = c; idx[ii++] = d; }
    var sheetGeo = new T.BufferGeometry(); sheetGeo.setAttribute('position', pos); sheetGeo.setIndex(new T.BufferAttribute(idx, 1)); sheetGeo.boundingSphere = new T.Sphere(new T.Vector3(), 1e9);
    var fogGeo = null; if (FOG) { fogGeo = new T.InstancedBufferGeometry(); fogGeo.setAttribute('position', pos); fogGeo.setIndex(sheetGeo.index); fogGeo.setAttribute('aSlice', new T.InstancedBufferAttribute(new Float32Array([0, 1]), 1)); fogGeo.instanceCount = 2; fogGeo.boundingSphere = sheetGeo.boundingSphere; }
    function sheetMat(own, travel) { var m = new T.ShaderMaterial({ name: 'bar761:sheet', vertexShader: vs(REFR, false), fragmentShader: fsSheet(), uniforms: { uEye: own.uEye, uInvK: own.uInvK, uLift: uLift, uTex: { value: tex }, uC: uC, uHer: uHer, uUK: own.uUK }, depthWrite: false, fog: false, lights: false, toneMapped: false, transparent: !travel, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.ZeroFactor, blendDst: T.SrcColorFactor }); m.customProgramCacheKey = function () { return 'bar761sheet'; }; return m; }
    function fogMat(own, travel) { var m = new T.ShaderMaterial({ name: 'bar761:fog', vertexShader: vs(REFR, true), fragmentShader: fsFog(), uniforms: { uEye: own.uEye, uInvK: own.uInvK, uTex: { value: tex }, uNoise: { value: noise }, uFlow: { value: flow }, uC: uC, uFC: uFC, uCol: uCol, uDrift: uDrift }, depthWrite: false, fog: false, lights: false, toneMapped: false, transparent: !travel, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.SrcAlphaFactor, blendDst: T.OneMinusSrcAlphaFactor }); m.customProgramCacheKey = function () { return 'bar761fog'; }; return m; }
    function place(name, layer, own, travel, ORD) {
      var sh = new T.Mesh(sheetGeo, sheetMat(own, travel)), fg = FOG ? new T.Mesh(fogGeo, fogMat(own, travel)) : null; sh.name = 'bar761:sheet:' + name; if (fg) fg.name = 'bar761:fog:' + name;   // fog null: held back, no mesh in the scene
      [sh, fg].forEach(function (m) { if (!m) return; m.frustumCulled = false; m.matrixAutoUpdate = false; m.layers.set(layer); m.castShadow = m.receiveShadow = false; scene.add(m); });
      sh.renderOrder = ORD[0]; if (fg) fg.renderOrder = ORD[1]; return { name: name, sheet: sh, fog: fg, own: own };
    }
    var ORDER = (WFR_VEG.C && WFR_VEG.C.ORDER) || -9.35;   // the ground -9.4, the trees -9.35, [sheet, grass, fog], the depth wipe -9.3
    var PT = place('travel', (WFR_VEG.C && WFR_VEG.C.LAYER) || 7, { uEye: TR.u.uEye, uInvK: TR.u.uInvK, uUK: { value: 0 } }, true, [ORDER + 0.01, ORDER + 0.04]);
    var PI = place('island', 0, { uEye: { value: new T.Vector3() }, uInvK: { value: 1 }, uUK: { value: 0 } }, false, [0.5, 5]);
    var st = { cur: null, gc: null, job: null, stage: new Float32Array(G * G * 3), shadeC: null, sj: null, slow: {}, sunD: new T.Vector3(0, 1, 0), drawn: 0, drawMs: 0, drawMax: 0, grids: 0, gridMax: 0, ground: null, tDraw: -9, clock: 0, lastF: null, acc: 0, fluidMs: 0, fluidMax: 0, uploads: 0, hx: null, hz: 0, vx: 0, vz: 0, tick: [], fog: 0, shade: 0, agl: null, fault: null, stone: 0, veg: '' };
    var BU = V.grass.BU; BU.uBarTex.value = tex;
    function note(what, ms) { if (!(st.slow[what] >= ms)) st.slow[what] = +ms.toFixed(2); }   // the slowest each piece of the tick has been since the bench last asked

    /* the real world's buildings near her, from the features feed (the outer ring and height of each, per detailed tile; 24 tiles kept) */
    var BT = new Map();
    function listen() { var F = window.WFR_FEATURES; if (!F || F === st.sub || typeof F.onTile !== 'function') return; st.sub = F;
      F.onTile(function (z, x, y, d) { if (z < 14 || !d || !d.buildings) return; var out = [], tb = [1e9, -1e9, 1e9, -1e9]; for (var i = 0; i < d.buildings.length; i++) { var b = d.buildings[i], r = b.rings && b.rings[0]; if (!r || r.length < 6) continue; var a0 = 1e9, a1 = -1e9, c0 = 1e9, c1 = -1e9; for (var k = 0; k < r.length; k += 2) { if (r[k] < a0) a0 = r[k]; if (r[k] > a1) a1 = r[k]; if (r[k + 1] < c0) c0 = r[k + 1]; if (r[k + 1] > c1) c1 = r[k + 1]; } out.push({ h: b.h || 8, r: r, a0: a0, a1: a1, c0: c0, c1: c1 }); if (a0 < tb[0]) tb[0] = a0; if (a1 > tb[1]) tb[1] = a1; if (c0 < tb[2]) tb[2] = c0; if (c1 > tb[3]) tb[3] = c1; }
        var key = z + '/' + x + '/' + y; BT.delete(key); BT.set(key, { L: out, tb: tb }); while (BT.size > 24) BT.delete(BT.keys().next().value); }); }
    function buildingsNear(cx, cz, r) { var f = TR.st && TR.st.frame(); if (!f || !BT.size) return null; var ll = W.toLatLon(f, cx, cz), dl = r / 111320, dn = dl / Math.max(0.05, Math.cos(ll.lat * Math.PI / 180)), out = [];
      BT.forEach(function (Tl) { var tb = Tl.tb, L = Tl.L; if (tb[1] < ll.lon - dn || tb[0] > ll.lon + dn || tb[3] < ll.lat - dl || tb[2] > ll.lat + dl) return; for (var i = 0; i < L.length && out.length < 80; i++) { var b = L[i]; if (b.a1 < ll.lon - dn || b.a0 > ll.lon + dn || b.c1 < ll.lat - dl || b.c0 > ll.lat + dl) continue; var p = []; for (var k = 0; k < b.r.length; k += 2) { var q = W.toLocal(f, b.r[k + 1], b.r[k]); p.push(q.x, q.z); } out.push({ h: b.h, p: p }); } }); return out; }
    o.buildings = o.buildings || buildingsNear; listen();

    function gridJob(cx, cz, H, floor) { return { cx: Math.round(cx / STEP) * STEP, cz: Math.round(cz / STEP) * STEP, H: H, floor: floor, j: 0 }; }
    function gridStep(J, ms) {   // the ground under the sheet, a few rows a frame; the sheet on show changes only when the whole of it is read
      var t0 = performance.now(), A = st.stage, x0 = J.cx - C.R, z0 = J.cz - C.R;
      for (; J.j < G; J.j++) { if (ms != null && performance.now() - t0 > ms) return false; var z = z0 + J.j * STEP; for (var i = 0; i < G; i++) { var q = (J.j * G + i) * 3, x = x0 + i * STEP, h = J.H(x, z); A[q] = x; A[q + 1] = h > J.floor ? h : J.floor; A[q + 2] = z; } }
      pos.array.set(A); pos.needsUpdate = true; st.gc = { x: J.cx, z: J.cz }; st.grids++; return true;
    }
    /* THE SHADE MAP, drawn a slice a frame (Nov 11 2026, B5: one whole redraw cost 2 to 5 ms under a 3x throttle and came about twice a second while she walks, so the tick's p99 sat on it).
       shadeJob reads the lists in one go (no canvas work); shadeStep paints them over the next frames, C.DRAW_MS each. The texture and its centre change only when the whole map is painted,
       so a half-painted map is never on show. The first map of a place is painted whole, as before. drawMax is now the slowest single slice. */
    function shadeJob(cx, cz, isl) {
      var sd = o.sunDir, sl = Math.hypot(sd.x, sd.z) || 1e-6, ux = -sd.x / sl, uz = -sd.z / sl, R2 = (C.R + 30) * (C.R + 30), cov = [], cf = [], tr = [], fl = [];
      V.grass.cover(function (ch, cells, f) { cov.push(ch); cf.push(f); });   // each chunk with the count that means 'grass all over' at the depth it was built to
      function add(x, z, ht, r) { var dx = x - cx, dz = z - cz; if (dx * dx + dz * dz <= R2) tr.push(x, z, ht, r); }
      if (isl) { var dm = st.discs || (st.discs = scene.getObjectByName('trees:shadow')); if (dm) { var A = dm.instanceMatrix.array; for (var t = 0; t < dm.count; t++) { var r = Math.abs(A[t * 16]); if (r > 0.3) add(A[t * 16 + 12], A[t * 16 + 14], r * 3.1, r * 0.9); } } }
      else V.nearTrees(add);
      if (isl && o.floors) o.floors(function (x, z, rot, w, d) { fl.push(x, z, rot, w, d); });   // the island's houses: centre, turn, width, depth (metres)
      return { cx: cx, cz: cz, isl: isl, ux: ux, uz: uz, cot: sl / Math.max(0.12, sd.y), ang: Math.atan2(uz, ux), sun: new T.Vector3(sd.x, sd.y, sd.z), cov: cov, cf: cf, tr: tr, fl: fl, B: null, ph: 0, i: 0 };
    }
    function shadeStep(J, ms) { var t0 = performance.now(), ph = J.ph, done = shadeStep0(J, ms); note('paint, step ' + ph, performance.now() - t0); return done; }
    function shadeStep0(J, ms) {   // true when the whole map is painted and on show
      var t0 = performance.now(), late = function () { return ms != null && performance.now() - t0 > ms; }, k = PX / (2 * C.R), h = PX / 2, cx = J.cx, cz = J.cz, X = function (x) { return (x - cx) * k + h; }, Z = function (z) { return (z - cz) * k + h; }, ux = J.ux, uz = J.uz, ca = Math.cos(J.ang), sa = Math.sin(J.ang);
      if (J.ph === 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, PX, PX); J.ph = 1; J.i = 0; }
      ctx.globalCompositeOperation = 'lighter';
      if (J.ph === 1) {   // green: where the grass grows
        ctx.fillStyle = 'rgb(0,255,0)';
        for (; J.i < J.cov.length; J.i++) { if (late()) return false; var ch = J.cov[J.i], cvr = ch.cv, cfull = J.cf[J.i]; if (!cvr) continue; ctx.setTransform(ch.ax / 4 * k, ch.az / 4 * k, ch.bx / 4 * k, ch.bz / 4 * k, X(ch.x0), Z(ch.z0));
          var all = true; for (var q = 0; q < 16 && all; q++) if (cvr[q] < cfull) all = false; if (all) { ctx.globalAlpha = 1; ctx.fillRect(0, 0, 4, 4); } else for (var q2 = 0; q2 < 16; q2++) if (cvr[q2]) { ctx.globalAlpha = Math.min(1, cvr[q2] / cfull); ctx.fillRect(q2 & 3, q2 >> 2, 1, 1); } }
        J.ph = 2; J.i = 0;
      }
      if (J.ph === 2) {   // red: the crown's shadow lies away from the sun, the trunk's streak runs out to it, a dark foot holds the tree to the ground
        for (; J.i < J.tr.length; J.i += 4) { if (late()) return false; var x = J.tr[J.i], z = J.tr[J.i + 1], ht = J.tr[J.i + 2], r = J.tr[J.i + 3], L = Math.min(ht * 0.62 * J.cot, ht * C.LEN_MAX), sx = x + ux * L, sz = z + uz * L, along = r * 1.05 + L * 0.22;
          ctx.setTransform(ca * along * k / 32, sa * along * k / 32, -sa * r * 1.05 * k / 32, ca * r * 1.05 * k / 32, X(sx), Z(sz)); ctx.globalAlpha = C.CROWN; ctx.drawImage(blob, -32, -32);
          var mx = x + ux * L * 0.5, mz = z + uz * L * 0.5, tw = Math.max(0.5, ht * 0.05); ctx.setTransform(ca * L * 0.56 * k / 32, sa * L * 0.56 * k / 32, -sa * tw * k / 32, ca * tw * k / 32, X(mx), Z(mz)); ctx.globalAlpha = 0.34; ctx.drawImage(blob, -32, -32);
          var fr = Math.max(1.1, r * 0.5); ctx.setTransform(fr * k / 32, 0, 0, fr * k / 32, X(x), Z(z)); ctx.globalAlpha = C.FOOT; ctx.drawImage(blob, -32, -32); }
        J.ph = 3; J.i = 0;
      }
      if (J.ph === 3) { if (late()) return false;   // blue: under a roof. The island's houses first (a turned rectangle each, a little over their walls)
        ctx.fillStyle = 'rgb(0,0,255)'; ctx.globalAlpha = 1; for (var fi = 0; fi < J.fl.length; fi += 5) { var fc = Math.cos(J.fl[fi + 2]), fz = Math.sin(J.fl[fi + 2]), fw = J.fl[fi + 3] + 2 * C.ROOF_PAD, fd = J.fl[fi + 4] + 2 * C.ROOF_PAD; ctx.setTransform(fc * k, -fz * k, fz * k, fc * k, X(J.fl[fi]), Z(J.fl[fi + 1])); ctx.fillRect(-fw / 2, -fd / 2, fw, fd); }
        var b0 = performance.now(); J.B = !J.isl && o.buildings ? o.buildings(cx, cz, C.R + C.BUILD_H) : null; note('find buildings', performance.now() - b0); J.ph = 4; J.i = 0; }   // the real world's buildings: found in one slice, swept along the sun in the next ones
      if (J.ph === 4) {
        if (J.B) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.5; ctx.fillStyle = 'rgb(255,0,0)'; var sw = [0.0, 0.5, 1.0];
          for (; J.i < J.B.length; J.i++) { if (late()) return false; var bd = J.B[J.i], Lb = Math.min(bd.h * J.cot, C.BUILD_H); ctx.beginPath(); for (var s = 0; s < 3; s++) { var ox = ux * Lb * sw[s], oz = uz * Lb * sw[s], p = bd.p; ctx.moveTo(X(p[0] + ox), Z(p[1] + oz)); for (var e = 2; e < p.length; e += 2) ctx.lineTo(X(p[e] + ox), Z(p[e + 1] + oz)); ctx.closePath(); } ctx.fill(); ctx.fillStyle = 'rgb(0,0,255)'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(X(bd.p[0]), Z(bd.p[1])); for (var e2 = 2; e2 < bd.p.length; e2 += 2) ctx.lineTo(X(bd.p[e2]), Z(bd.p[e2 + 1])); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgb(255,0,0)'; ctx.globalAlpha = 0.5; } }   // its own footprint in blue: under its roof
        J.ph = 5;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); tex.needsUpdate = true; st.shadeC = { x: cx, z: cz }; st.sunD.copy(J.sun); st.drawn++; st.trees = J.tr.length / 4; uC.value.x = cx; uC.value.y = cz; BU.uBarC.value.x = cx; BU.uBarC.value.y = cz;
      return true;
    }
    function hide(P) { P.sheet.visible = false; if (P.fog) P.fog.visible = false; }
    function shiftAll(dx, dz) {   // a re-centre: everything held in local metres moves with the ground (the same delta the trees take)
      if (fluid) fluid.moved(dx, dz); if (st.shadeC) { st.shadeC.x += dx; st.shadeC.z += dz; uC.value.x += dx; uC.value.y += dz; BU.uBarC.value.x += dx; BU.uBarC.value.y += dz; } if (st.hx != null) { st.hx += dx; st.hz += dz; } if (st.gc) { var PA = pos.array; for (var q = 0; q < PA.length; q += 3) { PA[q] += dx; PA[q + 2] += dz; } pos.needsUpdate = true; st.gc.x += dx; st.gc.z += dz; } st.job = null; if (st.sj) { st.sj = null; st.veg = ''; }
    }
    function frame(P, cam, dt, H, floor, agl, isl, groundKey) {
      st.clock += dt || 0; var other = P === PT ? PI : PT; if (st.cur !== P) { hide(other); st.cur = P; st.gc = null; st.job = null; st.sj = null; st.shadeC = null; st.discs = null; if (fluid) fluid.reset(); st.hx = null; } st.agl = agl;
      var show = 1 - sstep(C.AGL0, C.AGL1, agl), her = o.her ? o.her() : cam; if (P === PI) P.own.uEye.value.copy(cam);
      if (st.hx != null && dt > 0) { var a = Math.min(1, dt * 8); st.vx += ((her.x - st.hx) / dt - st.vx) * a; st.vz += ((her.z - st.hz) / dt - st.vz) * a; } st.hx = her.x; st.hz = her.z;
      var hg = H(her.x, her.z), hAgl = (her.y || 0) - Math.max(hg, floor), held = V.grass.H.hold; if (!held) BU.uHerG.value.set(her.x, her.z, hAgl < 6 ? 1 - Math.max(0, hAgl) / 6 : 0);
      if (show <= 0) { hide(P); BU.uBarC.value.w = 0; st.shade = 0; st.fog = 0; st.gc = null; st.job = null; st.sj = null; st.shadeC = null; return; }
      if (groundKey !== st.ground) { st.ground = groundKey; st.stale = true; }
      if (!st.job && (!st.gc || st.stale || Math.hypot(cam.x - st.gc.x, cam.z - st.gc.z) > C.MOVE)) { st.stale = false; st.job = gridJob(cam.x, cam.z, H, floor); }
      var gridRan = false; if (st.job) { var g1 = performance.now(); gridRan = true; if (gridStep(st.job, C.SLICE_MS)) st.job = null; st.gridMax = Math.max(st.gridMax, performance.now() - g1); note('ground rows', performance.now() - g1); }
      var key = V.vegKey(), turned = 1 - st.sunD.dot(o.sunDir) > C.SUN_EPS * C.SUN_EPS, due = !st.shadeC || Math.hypot(cam.x - st.shadeC.x, cam.z - st.shadeC.z) > C.MOVE || turned || key !== st.veg;
      var d0 = performance.now(), ran = false; if (due && !held && !st.sj && (!st.shadeC || st.clock - st.tDraw >= C.REDRAW_S)) { st.veg = key; st.tDraw = st.clock; st.sj = shadeJob(cam.x, cam.z, isl); ran = true; note('read the lists', performance.now() - d0); }
      if (st.sj && !held && !gridRan) { if (shadeStep(st.sj, C.DRAW_MS)) st.sj = null; ran = true; }
      if (ran) { var dms = performance.now() - d0; st.drawMs = dms; if (dms > st.drawMax) st.drawMax = dms; }
      var sunK = o.sunK ? Math.max(0, Math.min(1, +o.sunK() || 0)) : 1, sk = sunK * C.SHADE * show; uC.value.w = sk; if (!held) BU.uBarC.value.w = st.shadeC ? sk : 0; st.shade = +sk.toFixed(3); P.own.uUK.value = (isl ? C.UNDER_ISLE : C.UNDER_K) * (1 - sstep(C.UNDER_AGL[0], C.UNDER_AGL[1], agl));   // the green floor is for standing on it: from the air the ground is the ground
      uHer.value.set(her.x, her.z, 1.1 + Math.max(0, hAgl) * 0.12, isl ? 0 : sunK * 0.62 * (1 - sstep(1.5, 12, hAgl))); var ready = !!st.gc && !!st.shadeC; P.sheet.visible = ready;   // nothing is shown until its ground and its map are both whole (a few frames)
      if (!FOG) { st.fog = 0; return; }   // the fog is held back: nothing below runs (no mist drawn, no air stepped, nothing uploaded)
      var fn = 0; try { fn = o.fogNow ? Math.max(0, Math.min(1, +o.fogNow() || 0)) : 0; } catch (e) { fn = 0; } fn *= 1 - sstep(C.FOG_AGL0, C.FOG_AGL1, agl); st.fog = +fn.toFixed(3);
      if (fn <= 0.002) { P.fog.visible = false; return; } P.fog.visible = ready;
      var f0 = performance.now(); fluid.anchor(cam.x, cam.z); st.acc += dt || 0; var stepT = 1 / C.FOG_HZ, sp = Math.hypot(st.vx, st.vz), inIt = hAgl < C.HER_AGL;
      if (st.acc >= stepT && (fluid.moving || (inIt && sp > 0.2))) { var hs = Math.min(st.acc, 0.1); st.acc = 0; fluid.step(hs, { x: her.x, z: her.z, vx: st.vx, vz: st.vz, r: C.HER_R, on: inIt && sp > 0.2 }); fluid.pack(flowA); flow.needsUpdate = true; st.uploads++; } else if (st.acc >= stepT) st.acc = 0;
      var fms = performance.now() - f0; st.fluidMs = fms; if (fms > st.fluidMax) st.fluidMax = fms; note('the air', fms);
      uFC.value.set(fluid.ox + FN * C.FOG_CELL / 2, fluid.oz + FN * C.FOG_CELL / 2, 1 / (FN * C.FOG_CELL), fn * C.FOG_A); uDrift.value.x = st.clock * C.WIND[0]; uDrift.value.y = st.clock * C.WIND[1];
      if (o.fogCol) uCol.value.copy(o.fogCol()).lerp(WHITE, C.FOG_WHITE);   // his mist is white where it catches the light, whatever the sky is doing
    }
    function tick(cam, dt) {
      var t0 = performance.now();
      try { listen(); var stt = TR.st; if (!stt || !TR.on) return; var f = stt.frame(), H = stt.H, g = H(cam.x, cam.z);
        if (st.lastF && f !== st.lastF) { var ll = W.toLatLon(f, cam.x, cam.z), pa = W.toLocal(f, ll.lat, ll.lon), pb = W.toLocal(st.lastF, ll.lat, ll.lon); shiftAll(pa.x - pb.x, pa.z - pb.z); } st.lastF = f;
        frame(PT, cam, dt, H, 0.05, cam.y - g, false, stt.stats.built + '/' + stt.stats.evicted);
      } catch (e) { st.fault = String(e && e.message || e); }
      var ms = performance.now() - t0; st.tick.push(+ms.toFixed(3)); if (st.tick.length > 20000) st.tick.shift();
    }
    function island(cam, dt) {
      var I = o.island; if (!I) return; var t0 = performance.now();
      try { var g = I.H(cam.x, cam.z); frame(PI, cam, dt, I.H, I.water, cam.y - Math.max(g, I.water), true, 'i'); } catch (e) { st.fault = 'island: ' + String(e && e.message || e); }
      var ms = performance.now() - t0; st.tick.push(+ms.toFixed(3)); if (st.tick.length > 20000) st.tick.shift();
    }
    function quant(a) { var c = a.slice().sort(function (x, y) { return x - y; }), q = function (p) { return c.length ? c[Math.min(c.length - 1, Math.floor(c.length * p))] : null; }; return { n: c.length, med: q(0.5), p99: q(0.99), max: c.length ? c[c.length - 1] : null }; }
    function peek(r) { var P = st.cur, out = { on: true, place: P ? P.name : null, drawn: st.drawn, trees: st.trees, drawMs: +st.drawMs.toFixed(2), drawMax: +st.drawMax.toFixed(2), grids: st.grids, gridMax: +st.gridMax.toFixed(2), fluidMax: +st.fluidMax.toFixed(2), steps: fluid ? fluid.steps : 0, uploads: st.uploads, shifts: fluid ? fluid.shifts : 0, fog: st.fog, fogBuilt: FOG, shade: st.shade, agl: st.agl == null ? null : +st.agl.toFixed(1), sheet: !!(P && P.sheet.visible), fogOn: !!(P && P.fog && P.fog.visible), tickQ: quant(st.tick), fault: st.fault, moving: fluid ? fluid.moving : false, tris: (G - 1) * (G - 1) * 2 * (FOG ? 3 : 1), slow: Object.assign({}, st.slow), ready: !!st.gc && !!st.shadeC }; if (r && r.reset) { st.tick = []; st.drawMax = 0; st.gridMax = 0; st.fluidMax = 0; st.slow = {}; } return out; }
    function air(x, z) { if (!fluid) return null; var i = Math.round((x - fluid.ox) / fluid.cell), jj = Math.round((z - fluid.oz) / fluid.cell); if (i < 0 || jj < 0 || i >= FN || jj >= FN) return null; return +fluid.d[jj * FN + i].toFixed(3); }
    function floors() { var out = []; if (o.floors) o.floors(function (x, z, rot, w, d, y) { out.push([x, z, rot, w, d, y]); }); return out; }
    S = { api: { tick: tick, island: island, peek: peek, air: air, floors: floors, meshes: { travel: PT, island: PI }, U: { uC: uC, uHer: uHer }, canvas: cv } };
    return S.api;
  }

  return { C: C, off: OFF, fog: FOG, attach: attach, makeFluid: makeFluid, tick: function (cam, dt) { if (S) S.api.tick(cam, dt); }, island: function (cam, dt) { if (S) S.api.island(cam, dt); }, peek: function (r) { return S ? S.api.peek(r) : { on: false }; }, api: function () { return S ? S.api : null; }, version: 1 };
})();
