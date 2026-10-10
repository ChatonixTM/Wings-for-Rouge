/* atmo.js — THE AIR OF THE ISLAND (boards 575 / 613; Marth, Oct 10 ~03:15: "We need shading/shaders / hue, wind insects"
   and "Build everything that's beautiful and adds to the story"). Wings for Rouge, her birthday.

   It owns LIGHT, COLOUR GRADING and PARTICLES, and nothing else:
     1. THE GRADE   a gentle filmic tone curve (patched into three's CustomToneMapping stub, so it costs nothing extra:
                    it runs inside every material's own fragment shader, no post pass), exposure + sun + hemisphere
                    colours that follow the clock (peach dawn, crisp noon, golden dusk, blue moonlight), and a CSS
                    vignette with a faint warm wash at golden hour. Intensities, fog and sky colours are NOT touched:
                    the bench's night readings (hemi intensity, fog, background, sunI, stars) mean what they meant.
     2. THE WIND    one wind clock: it drives the trees' own sway uniform (WFR_TREES.update) a little faster in the gusts,
                    and the same gusts carry pollen motes in the sunlight and leaves blown off the trees.
     3. THE SMALL LIVES   butterflies over the meadows by day (and at her nest once it blooms), dragonflies darting over the
                    lake, fireflies at night by the forest and on the village green. Every one of them moves out of her
                    way. None is hurt; none can hurt her; none is touchable or counted by the game.
   Phone budget: no new lights, 6 draw calls, 278 small things in all, no shadows, everything paused when the page is hidden.
   It never calls the game's rnd(), never moves or adds to anything the game places, and never touches the save.

   Use (from the game):
     WFR_ATMO.grade(renderer, THREE)            right after the renderer is made (before anything compiles)
     const A = WFR_ATMO.create(THREE, scene, opts)   once the world exists; opts = { renderer, camera, canvas, H, WATER, LAKE,
                                                VILLAGE, MOUND, NEST, trees, sun, HEMI, S, night(), clock(), under(), bird() }
     A.tick(dt, t)                              each frame, just before renderer.render
     A.peek()                                   what is out and where (for the bench and the screenshots)              */
window.WFR_ATMO = (function () {
  'use strict';

  /* ═════════ 1. THE GRADE: the curve ═════════ */
  var CURVE = [
    'vec3 CustomToneMapping( vec3 color ) {',
    '  color *= toneMappingExposure;',
    '  float l0 = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );',
    '  color = max( mix( vec3( l0 ), color, 1.12 ), 0.0 );',
    '  vec3 k = vec3( 0.78 );',
    '  vec3 sh = k + ( 1.0 - k ) * ( 1.0 - exp( ( k - color ) / ( 1.0 - k ) ) );',
    '  color = mix( color, sh, step( k, color ) );',
    '  color = mix( color, color * color * ( 3.0 - 2.0 * color ), 0.16 );',
    '  float l1 = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );',
    '  color += vec3( -0.010, 0.0, 0.016 ) * ( 1.0 - l1 ) * ( 1.0 - l1 ) + vec3( 0.018, 0.007, -0.012 ) * l1 * l1;',
    '  return clamp( color, 0.0, 1.0 );',
    '}'].join('\n');
  /* (what the curve does: +12% colour; values above 0.78 roll off softly so a sunlit white never clips flat; a 16% S for
     depth; shade a breath cooler, light a breath warmer. Mid-grey 0.5 stays 0.5.) */
  var patched = false;
  function patchChunk(T) {
    if (patched) return true;
    var C = T && T.ShaderChunk, re = /vec3 CustomToneMapping\( vec3 color \) \{[^}]*\}/;
    if (!C || typeof C.tonemapping_pars_fragment !== 'string' || !re.test(C.tonemapping_pars_fragment)) return false;
    C.tonemapping_pars_fragment = C.tonemapping_pars_fragment.replace(re, CURVE);
    patched = true; return true;
  }
  if (window.THREE) { try { patchChunk(window.THREE); } catch (e) { /* the curve is a grace; without it, the old look */ } }
  function grade(renderer, T) {
    try { if (patchChunk(T) && T.CustomToneMapping != null) { renderer.toneMapping = T.CustomToneMapping; renderer.toneMappingExposure = 1.04; return true; } } catch (e) { /* fine */ }
    return false;
  }

  /* the clock's colours: [clock, exposure, sun, hemisphere sky, hemisphere ground, vignette rgba, top wash rgba]
     (dawn 0-150, day 150-1800, dusk 1800-2100, night 2100-2700, as the game's clock). Design colours; his eye rules. */
  var KEYS = [
    [0,    1.06, 0xffb08a, 0xbcb6ee, 0x4b4a3c, [72, 40, 86, 0.30], [255, 168, 150, 0.10]],
    [110,  1.07, 0xffcf9c, 0xd2dbf7, 0x55633c, [96, 62, 46, 0.24], [255, 196, 150, 0.07]],
    [260,  1.05, 0xfff0d4, 0xdbe9ff, 0x52703c, [36, 46, 70, 0.20], [255, 230, 190, 0.02]],
    [1050, 1.03, 0xfffaf0, 0xe2efff, 0x4f6f3a, [24, 44, 76, 0.18], [255, 240, 210, 0.00]],
    [1560, 1.05, 0xffeac2, 0xe6ebf4, 0x58703e, [70, 50, 30, 0.20], [255, 210, 150, 0.04]],
    [1830, 1.09, 0xffba6c, 0xf0d8c6, 0x6a5e38, [120, 64, 22, 0.26], [255, 176, 96, 0.12]],
    [1970, 1.09, 0xff9356, 0xc9a6cf, 0x5a3f38, [116, 40, 44, 0.30], [255, 140, 110, 0.12]],
    [2090, 1.03, 0xb4a6ec, 0x4e4e7c, 0x2a2432, [42, 30, 74, 0.36], [120, 110, 200, 0.05]],
    [2190, 1.00, 0x9ab2ff, 0x22305e, 0x0e1a1a, [10, 16, 48, 0.42], [40, 60, 140, 0.04]],
    [2640, 1.00, 0x9ab2ff, 0x22305e, 0x0e1a1a, [10, 16, 48, 0.42], [40, 60, 140, 0.04]],
    [2700, 1.06, 0xffb08a, 0xbcb6ee, 0x4b4a3c, [72, 40, 86, 0.30], [255, 168, 150, 0.10]]];
  function keyAt(c) {
    c = ((c % 2700) + 2700) % 2700;
    for (var i = 0; i < KEYS.length - 1; i++) if (c < KEYS[i + 1][0]) { var a = KEYS[i], b = KEYS[i + 1], f = (c - a[0]) / (b[0] - a[0]); return [a, b, f * f * (3 - 2 * f)]; }
    return [KEYS[0], KEYS[0], 0];
  }

  /* our own seeded generator: the game's rnd() is never called (its order places the island) */
  function gen(s) { s = s % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  /* ═════════ shaders for the lights in the air (additive, no lights, no textures) ═════════ */
  var MOTE_VS = [
    'uniform float uT; uniform vec3 uCam; uniform vec3 uWind; uniform float uBox; uniform float uPx; uniform float uSize; uniform vec3 uSun; uniform float uA;',
    'attribute float aSeed;',
    'varying float vA;',
    'void main() {',
    '  vec3 p = position + uWind + vec3( sin( uT * 0.71 + aSeed * 6.3 ), 0.6 * sin( uT * 0.93 + aSeed * 4.1 ), cos( uT * 0.57 + aSeed * 5.7 ) ) * 0.7;',
    '  vec3 rel = mod( p - uCam + uBox, 2.0 * uBox ) - uBox;',
    '  vec4 mv = modelViewMatrix * vec4( uCam + rel, 1.0 );',
    '  gl_Position = projectionMatrix * mv;',
    '  float d = length( rel );',
    '  float fw = max( dot( rel / max( d, 0.001 ), uSun ), 0.0 );',
    '  vA = uA * ( 1.0 - smoothstep( uBox * 0.55, uBox, d ) ) * smoothstep( 1.6, 3.6, d ) * ( 0.55 + 0.45 * sin( uT * 1.7 + aSeed * 31.0 ) ) * ( 0.55 + 1.3 * fw * fw );',
    '  gl_PointSize = min( uSize * ( 0.55 + aSeed ) * uPx / max( -mv.z, 0.5 ), 40.0 );',
    '}'].join('\n');
  var MOTE_FS = [
    'uniform vec3 uColor; varying float vA;',
    'void main() { vec2 c = gl_PointCoord - 0.5; float r = 1.0 - dot( c, c ) * 4.0; if ( r <= 0.0 ) discard; gl_FragColor = vec4( uColor, vA * r * r ); }'].join('\n');
  var FLY_VS = [
    'uniform float uPx; attribute float aGlow; attribute float aSize; varying float vG;',
    'void main() { vec4 mv = modelViewMatrix * vec4( position, 1.0 ); gl_Position = projectionMatrix * mv; vG = aGlow;',
    '  gl_PointSize = clamp( aSize * uPx / max( -mv.z, 0.5 ), 2.5, 90.0 ); }'].join('\n');
  var FLY_FS = [
    'uniform vec3 uColor; varying float vG;',
    'void main() { vec2 c = gl_PointCoord - 0.5; float r = dot( c, c ) * 4.0; if ( r >= 1.0 || vG <= 0.002 ) discard;',
    '  float core = exp( -r * 12.0 ), halo = ( 1.0 - r ) * ( 1.0 - r ) * 0.5;',
    '  gl_FragColor = vec4( mix( uColor, vec3( 1.0, 1.0, 0.86 ), core ), vG * ( core + halo ) ); }'].join('\n');

  /* wings that beat: rotate each vertex about the body's long axis (z) by an angle that rises and falls */
  function flapper(T, mat, uni) {
    mat.onBeforeCompile = function (shader) {
      shader.uniforms.uT = uni.t; shader.uniforms.uFq = uni.fq; shader.uniforms.uAmp = uni.amp; shader.uniforms.uRest = uni.rest;
      shader.vertexShader = 'uniform float uT;\nuniform float uFq;\nuniform float uAmp;\nuniform float uRest;\nattribute float aPh;\n' +
        shader.vertexShader.replace('#include <begin_vertex>',
          'vec3 transformed = vec3( position );\n' +
          'float wAng = uRest + uAmp * abs( sin( uT * uFq + aPh * 6.2832 ) );\n' +
          'float wAx = abs( position.x );\n' +
          'transformed = vec3( sign( position.x ) * wAx * cos( wAng ), position.y + wAx * sin( wAng ), position.z );\n');
    };
    mat.customProgramCacheKey = function () { return 'wfr-atmo-flap'; };
    return mat;
  }

  /* a butterfly, seen from above: white, so each one's own colour tints it; a dark rim, veins, a body */
  function wingTexture(T) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 64; var g = c.getContext('2d');
    function half() {
      g.beginPath();
      g.moveTo(2, 30); g.bezierCurveTo(14, 6, 42, -1, 60, 5); g.bezierCurveTo(60, 17, 46, 29, 2, 33); g.closePath();
      g.moveTo(2, 32); g.bezierCurveTo(30, 29, 50, 42, 42, 57); g.bezierCurveTo(30, 64, 10, 53, 2, 38); g.closePath();
      var gr = g.createLinearGradient(0, 0, 60, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.75, '#f6f6f6'); gr.addColorStop(1, '#d6d6d6');
      g.fillStyle = gr; g.fill(); g.lineJoin = 'round'; g.lineWidth = 3.4; g.strokeStyle = '#1b130d'; g.stroke();
      g.lineWidth = 1; g.strokeStyle = 'rgba(32,22,12,.5)'; g.beginPath();
      g.moveTo(3, 31); g.lineTo(52, 8); g.moveTo(3, 31); g.lineTo(42, 22); g.moveTo(3, 34); g.lineTo(36, 52); g.moveTo(3, 34); g.lineTo(44, 44); g.stroke();
      g.fillStyle = '#ffffff'; [[52, 7.5], [57, 10], [40, 55], [45, 50], [47, 46]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 1.3, 0, Math.PI * 2); g.fill(); });
    }
    g.save(); g.translate(64, 0); half(); g.restore();
    g.save(); g.translate(64, 0); g.scale(-1, 1); half(); g.restore();
    g.fillStyle = '#23180f'; g.beginPath(); g.ellipse(64, 33, 2.6, 17, 0, 0, Math.PI * 2); g.fill();
    var t = new T.CanvasTexture(c); t.magFilter = T.LinearFilter; return t;
  }
  function quads(T, list, uvs) {   /* list of [x0, x1, z0, z1, y] quads in the XZ plane */
    var pos = [], uv = [], idx = [];
    list.forEach(function (q, i) {
      var b = i * 4, u = uvs ? uvs[i] : [0, 1];
      pos.push(q[0], q[4], q[2], q[1], q[4], q[2], q[1], q[4], q[3], q[0], q[4], q[3]);
      uv.push(u[0], 0, u[1], 0, u[1], 1, u[0], 1);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    geo.computeVertexNormals(); return geo;
  }

  function merge(T, boxes) {   /* [w, h, d, x, y, z] boxes, one geometry */
    var pos = [], nor = [];
    boxes.forEach(function (b) { var g = new T.BoxGeometry(b[0], b[1], b[2]).toNonIndexed(); g.translate(b[3], b[4], b[5]);
      pos.push.apply(pos, g.attributes.position.array); nor.push.apply(nor, g.attributes.normal.array); g.dispose(); });
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); return geo;
  }
  function wings(T, list) {   /* [side, z of the root, length, half-width]: each wing a long leaf of 8 triangles, from the body out */
    var pos = [];
    list.forEach(function (w) { var sd = w[0], z0 = w[1], L = w[2], hw = w[3], pts = [];
      for (var i = 0; i <= 8; i++) { var u = i / 8, x = 0.035 + u * L, wd = Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.04)) * hw; pts.push([x, wd]); }
      for (i = 0; i < 8; i++) { var a = pts[i], b = pts[i + 1];
        pos.push(sd * a[0], 0.02, z0 + a[1], sd * b[0], 0.02, z0 + b[1], sd * b[0], 0.02, z0 - b[1] * 0.7);
        pos.push(sd * a[0], 0.02, z0 + a[1], sd * b[0], 0.02, z0 - b[1] * 0.7, sd * a[0], 0.02, z0 - a[1] * 0.7); } });
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); return geo;
  }

  /* ═════════ create ═════════ */
  var API = null;
  function create(T, scene, o) {   /* the instance is kept as WFR_ATMO.last (for the bench); a fault is kept as WFR_ATMO.error */
    try { var inst = build(T, scene, o); API.last = inst; return inst; } catch (err) { API.error = String(err && err.message || err); throw err; }
  }
  function build(T, scene, o) {
    var H = o.H, WATER = o.WATER, S = o.S, camera = o.camera, renderer = o.renderer, trees = o.trees || [];
    var R = gen(613575), dead = false, root = new T.Group(); root.name = 'atmo'; scene.add(root);
    var tmpA = new T.Color(), tmpB = new T.Color(), v = new T.Vector3(), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(0, 0, 0, 'YXZ'), sc = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    var WIND = new T.Vector3(0.92, 0, 0.38).normalize(), windOff = new T.Vector3(), windT = null, BOX = 16;
    var gust = function (t) { return Math.sin(t * 0.41) * Math.sin(t * 0.23 + 1.7); };   /* the same slow envelope trees.js puts on its canopies */

    /* where the forest is: a coarse 10 m grid, 0 = open ground, 1 = among trees (the village green and her tree count as 1) */
    var G = 10, GN = 68, GO = 340, dens = new Float32Array(GN * GN);
    trees.forEach(function (t) { if (t.hidden) return; var i = Math.floor((t.x + GO) / G), j = Math.floor((t.z + GO) / G);
      for (var di = -1; di <= 1; di++) for (var dj = -1; dj <= 1; dj++) { var a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < GN && b < GN) dens[a * GN + b] += (di || dj) ? 0.18 : 0.42; } });
    var densAt = function (x, z) {
      var i = Math.floor((x + GO) / G), j = Math.floor((z + GO) / G), d = (i >= 0 && j >= 0 && i < GN && j < GN) ? Math.min(1, dens[i * GN + j]) : 0;
      if (o.VILLAGE && Math.hypot(x - o.VILLAGE.x, z - o.VILLAGE.z) < 34) d = 1;
      if (o.MOUND && Math.hypot(x - o.MOUND.x, z - o.MOUND.z) < 26) d = 1;
      return d; };
    var slope = function (x, z) { return Math.hypot(H(x + 1, z) - H(x - 1, z), H(x, z + 1) - H(x, z - 1)) / 2; };

    /* the meadows (open, gentle, grassy) and the village gardens: where butterflies go */
    var MEADOW = [];
    for (var k = 0; k < 2600 && MEADOW.length < 420; k++) {
      var r = Math.sqrt(R()) * 275, a = R() * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, h = H(x, z);
      var vg = o.VILLAGE ? Math.hypot(x - o.VILLAGE.x, z - o.VILLAGE.z) : 999;
      if (h < WATER + 1.3 || h > 24) continue;
      if (vg < 30 && vg > 6) { MEADOW.push([x, z]); continue; }
      if (slope(x, z) < 0.24 && densAt(x, z) < 0.35) MEADOW.push([x, z]);
    }
    /* the lake's open water: where dragonflies hunt */
    var LAKEPTS = [];
    if (o.LAKE) for (k = 0; k < 900 && LAKEPTS.length < 160; k++) { var lr = Math.sqrt(R()) * 34, la = R() * Math.PI * 2, lx = o.LAKE.x + Math.cos(la) * lr, lz = o.LAKE.z + Math.sin(la) * lr; if (H(lx, lz) < WATER - 0.25) LAKEPTS.push([lx, lz]); }

    /* ── pollen motes: one draw, all on the GPU (wrapped round the camera, carried by the wind) ── */
    var NM = 140, mp = new Float32Array(NM * 3), ms = new Float32Array(NM);
    for (k = 0; k < NM; k++) { mp[k * 3] = R() * BOX * 2; mp[k * 3 + 1] = R() * BOX * 2; mp[k * 3 + 2] = R() * BOX * 2; ms[k] = R(); }
    var mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(mp, 3)); mg.setAttribute('aSeed', new T.BufferAttribute(ms, 1));
    var MU = { uT: { value: 0 }, uCam: { value: new T.Vector3() }, uWind: { value: windOff }, uBox: { value: BOX }, uPx: { value: 600 }, uSize: { value: 0.1 }, uSun: { value: new T.Vector3(0, 1, 0) }, uA: { value: 0 }, uColor: { value: new T.Color(0xfff0c0) } };
    var motes = new T.Points(mg, new T.ShaderMaterial({ uniforms: MU, vertexShader: MOTE_VS, fragmentShader: MOTE_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    motes.frustumCulled = false; motes.renderOrder = 5; root.add(motes);

    /* ── fireflies: world-anchored in a 52 m tile that follows her; brighter by the trees and on the green ── */
    var NF = 96, TILE = 52, fp = new Float32Array(NF * 3), fgw = new Float32Array(NF), fsz = new Float32Array(NF), FF = [];
    for (k = 0; k < NF; k++) { FF.push({ bx: R() * TILE, bz: R() * TILE, h: 0.5 + R() * 2.8, w: 0.9 + R() * 1.6, ph: R() * 6.283, wx: 0.15 + R() * 0.25, wz: 0.12 + R() * 0.25, steady: R() < 0.25 }); fsz[k] = 0.55 + R() * 0.45; }
    var fg = new T.BufferGeometry(); fg.setAttribute('position', new T.BufferAttribute(fp, 3)); fg.setAttribute('aGlow', new T.BufferAttribute(fgw, 1)); fg.setAttribute('aSize', new T.BufferAttribute(fsz, 1));
    var FU = { uPx: { value: 600 }, uColor: { value: new T.Color(0xc8ff5a) } };
    var flies = new T.Points(fg, new T.ShaderMaterial({ uniforms: FU, vertexShader: FLY_VS, fragmentShader: FLY_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    flies.frustumCulled = false; flies.renderOrder = 6; flies.visible = false; root.add(flies);

    /* ── butterflies ── */
    var NB = 12, BCOL = [0xf08a24, 0x6ec6ff, 0xff8fb8, 0xffe36a, 0xf6f2ea, 0xd8344a, 0xf08a24, 0x9ad8ff, 0xffb0d0, 0xfff1a0, 0xffffff, 0xff7a3a];
    var bgeo = quads(T, [[-0.5, 0, -0.36, 0.36, 0], [0, 0.5, -0.36, 0.36, 0]], [[0, 0.5], [0.5, 1]]);
    var bph = new Float32Array(NB); for (k = 0; k < NB; k++) bph[k] = R(); bgeo.setAttribute('aPh', new T.InstancedBufferAttribute(bph, 1));
    var BUNI = { t: { value: 0 }, fq: { value: 13 }, amp: { value: 1.15 }, rest: { value: 0.12 } };
    var bmat = flapper(T, new T.MeshBasicMaterial({ map: wingTexture(T), alphaTest: 0.5, side: T.DoubleSide }), BUNI);
    var bms = new T.InstancedMesh(bgeo, bmat, NB); bms.frustumCulled = false; bms.renderOrder = 4; root.add(bms);
    var BF = [];
    for (k = 0; k < NB; k++) { bms.setColorAt(k, tmpA.setHex(BCOL[k])); BF.push({ home: null, fade: 0, s: 0.42 + R() * 0.26, f1: 0.25 + R() * 0.3, f2: 0.6 + R() * 0.5, f3: 0.22 + R() * 0.3, p1: R() * 6.28, p2: R() * 6.28, p3: R() * 6.28, rad: 1.6 + R() * 2.8, yaw: 0, last: new T.Vector3(), hasLast: false, nest: k === 0 }); }
    if (bms.instanceColor) bms.instanceColor.needsUpdate = true;

    /* ── dragonflies: an opaque body and four glassy wings that shimmer ── */
    var ND = 5, DCOL = [0x23b5c9, 0x2f6fe0, 0xd8344a, 0x23b5c9, 0x37c98a];
    var dbody = merge(T, [[0.12, 0.10, 0.10, 0, 0, 0.27], [0.09, 0.09, 0.17, 0, 0, 0.14], [0.05, 0.05, 0.22, 0, 0, -0.04], [0.035, 0.035, 0.30, 0, 0, -0.29]]);
    var dhead = new T.InstancedMesh(dbody, new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0x0a1a20 }), ND); dhead.frustumCulled = false; root.add(dhead);
    var dwgeo = wings(T, [[1, 0.16, 0.44, 0.05], [-1, 0.16, 0.44, 0.05], [1, 0.07, 0.40, 0.05], [-1, 0.07, 0.40, 0.05]]);
    var dph = new Float32Array(ND); for (k = 0; k < ND; k++) dph[k] = R(); dwgeo.setAttribute('aPh', new T.InstancedBufferAttribute(dph, 1));
    var DUNI = { t: { value: 0 }, fq: { value: 47 }, amp: { value: 0.42 }, rest: { value: -0.12 } };
    var dwing = new T.InstancedMesh(dwgeo, flapper(T, new T.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.42, depthWrite: false, side: T.DoubleSide }), DUNI), ND);
    dwing.frustumCulled = false; dwing.renderOrder = 4; root.add(dwing);
    var DF = [];
    for (k = 0; k < ND; k++) { dhead.setColorAt(k, tmpA.setHex(DCOL[k])); var p0 = LAKEPTS.length ? LAKEPTS[Math.floor(R() * LAKEPTS.length)] : [0, 0];
      DF.push({ p: new T.Vector3(p0[0], WATER + 0.8, p0[1]), at: new T.Vector3(p0[0], WATER + 0.8, p0[1]), to: new T.Vector3(p0[0], WATER + 0.8, p0[1]), hold: R() * 2, yaw: R() * 6.28, ph: R() * 6.28 }); }
    if (dhead.instanceColor) dhead.instanceColor.needsUpdate = true;

    /* ── leaves blown off the trees ── */
    var NL = 20, LCOL = [0xd9822b, 0xc9432a, 0xe8b23a, 0x8aa63a, 0x6d8f2f, 0xb85a26, 0xa4b84a];
    var lgeo = new T.BufferGeometry(); lgeo.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0.13, 0.065, 0, 0.01, 0, 0, -0.11, -0.065, 0, 0.01], 3)); lgeo.setIndex([0, 1, 2, 0, 2, 3]); lgeo.computeVertexNormals();
    var lms = new T.InstancedMesh(lgeo, new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide }), NL); lms.frustumCulled = false; root.add(lms);
    var LF = [];
    for (k = 0; k < NL; k++) { lms.setColorAt(k, tmpA.setHex(LCOL[k % LCOL.length])); LF.push({ live: false, wait: R() * 6, p: new T.Vector3(), vy: 0, age: 0, rest: 0, s: 1.3 + R() * 0.9, rx: 1 + R() * 3, ry: 0.5 + R() * 2, rz: 1 + R() * 3, ph: R() * 6.28, k: 1.1 + R() * 0.8 }); }
    if (lms.instanceColor) lms.instanceColor.needsUpdate = true;
    var HIDE = new T.Matrix4().makeScale(0, 0, 0);
    function hideAll(im, n) { for (var i = 0; i < n; i++) im.setMatrixAt(i, HIDE); im.instanceMatrix.needsUpdate = true; }
    hideAll(bms, NB); hideAll(dhead, ND); hideAll(dwing, ND); hideAll(lms, NL);

    /* ── the vignette and the warm wash: one CSS layer just above the canvas, under every card and button ── */
    var vig = null, vigStr = '', vigT = 0;
    try { var cv = o.canvas || renderer.domElement; vig = document.createElement('div'); vig.id = 'atmoVig'; vig.setAttribute('aria-hidden', 'true');
      vig.style.cssText = 'position:fixed;inset:0;pointer-events:none'; cv.insertAdjacentElement('afterend', vig); } catch (er) { vig = null; }

    var focus = new T.Vector3(), fwd = new T.Vector3(), bird = new T.Vector3(), sunDir = new T.Vector3(), reT = 0, stats = { motes: 0, flies: 0, butterflies: 0, dragonflies: 0, leaves: 0 };
    function away(p, push, rad, lift) {   /* a gentle step out of her way: none of them is ever in her path */
      var dx = p.x - bird.x, dy = p.y - bird.y, dz = p.z - bird.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d >= rad || d < 1e-4) return; var f = (rad - d) / rad; f = f * f * (3 - 2 * f) * push / d;
      p.x += dx * f; p.z += dz * f; p.y += Math.abs(dy) * f * 0.5 + lift * (rad - d) / rad;
    }
    function pickHome(b, nest) {
      var c = [], i;
      if (nest) { b.home = [o.NEST.x, o.NEST.z, o.NEST.y + 0.9]; b.fade = 0; b.hasLast = false; return; }   /* her nest bloomed: one comes to it */
      for (i = 0; i < 24; i++) { var m = MEADOW[Math.floor(R() * MEADOW.length)]; if (!m) break; var d = Math.hypot(m[0] - focus.x, m[1] - focus.z); if (d > 8 && d < 46) c.push(m); if (c.length > 2) break; }
      b.home = c.length ? [c[0][0], c[0][1], null] : null; b.fade = 0; b.hasLast = false;
    }
    function spawnLeaf(L) {
      for (var i = 0; i < 12; i++) { var t = trees[Math.floor(R() * trees.length)]; if (!t || t.hidden) continue;
        var d = Math.hypot(t.x - focus.x, t.z - focus.z); if (d > 42) continue;
        var a = R() * 6.283, rr = (t.r || 1.5) * (0.4 + R() * 0.9);
        L.p.set(t.x + Math.cos(a) * rr, (t.top || H(t.x, t.z) + 8) - 1 - R() * 2.6, t.z + Math.sin(a) * rr); L.live = true; L.age = 0; L.rest = 0; L.vy = -(0.45 + R() * 0.4); return true; }
      return false;
    }

    function tick(dt, t) {
      if (dead || document.hidden) return; dt = Math.max(0, Math.min(0.1, dt || 0));
      try {
        var c = o.clock(), na = o.night(), under = !!(o.under && o.under()), day = 1 - na;
        /* the grade */
        var K = keyAt(c), A = K[0], B = K[1], f = K[2];
        if (renderer.toneMapping === T.CustomToneMapping) renderer.toneMappingExposure = A[1] + (B[1] - A[1]) * f;
        if (o.sun) o.sun.color.copy(tmpA.setHex(A[2]).lerp(tmpB.setHex(B[2]), f));
        if (o.HEMI) { o.HEMI.color.copy(tmpA.setHex(A[3]).lerp(tmpB.setHex(B[3]), f)); o.HEMI.groundColor.copy(tmpA.setHex(A[4]).lerp(tmpB.setHex(B[4]), f)); }
        vigT -= dt;
        if (vig && vigT <= 0) { vigT = 0.4;
          var vA = A[5], vB = B[5], wA = A[6], wB = B[6], L = function (x, y) { return Math.round(x + (y - x) * f); }, LA = function (x, y) { return (x + (y - x) * f).toFixed(3); };
          var vc = L(vA[0], vB[0]) + ',' + L(vA[1], vB[1]) + ',' + L(vA[2], vB[2]), wc = L(wA[0], wB[0]) + ',' + L(wA[1], wB[1]) + ',' + L(wA[2], wB[2]);
          var s = 'radial-gradient(ellipse 118% 96% at 50% 46%,rgba(' + vc + ',0) 56%,rgba(' + vc + ',' + LA(vA[3], vB[3]) + ') 100%),linear-gradient(to bottom,rgba(' + wc + ',' + LA(wA[3], wB[3]) + ') 0%,rgba(' + wc + ',0) 48%)';
          if (s !== vigStr) { vigStr = s; vig.style.background = s; } }

        /* the wind: one clock for the canopies, the ferns and everything in the air */
        var g = gust(t);
        if (windT === null) windT = t;
        windT += dt * (1 + 0.35 * g);
        if (window.WFR_TREES && WFR_TREES.update) WFR_TREES.update(windT);
        var ws = 1.15 * (1 + 0.6 * g);
        windOff.addScaledVector(WIND, ws * dt); windOff.x %= BOX * 2; windOff.z %= BOX * 2;

        camera.getWorldDirection(fwd); focus.copy(camera.position).addScaledVector(fwd, 12);
        var bp = o.bird ? o.bird() : null; if (bp) bird.copy(bp); else bird.copy(focus);
        var px = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
        if (o.sun) sunDir.copy(o.sun.position).sub(o.sun.target.position).normalize();
        root.visible = !under;
        if (under) return;

        /* motes */
        var ma = day * (camera.position.y - H(camera.position.x, camera.position.z) < 60 ? 1 : 0.35);
        motes.visible = ma > 0.01; stats.motes = motes.visible ? NM : 0;
        if (motes.visible) { MU.uT.value = t; MU.uCam.value.copy(camera.position); MU.uPx.value = px; MU.uSun.value.copy(sunDir); MU.uA.value = 0.75 * ma;
          MU.uColor.value.copy(tmpA.setHex(A[2]).lerp(tmpB.setHex(B[2]), f)).lerp(tmpB.setHex(0xfff2c4), 0.45); }

        /* fireflies */
        flies.visible = na > 0.02; stats.flies = 0;
        if (flies.visible) { FU.uPx.value = px;
          for (var i = 0; i < NF; i++) { var F = FF[i];
            var x = camera.position.x + ((((F.bx - camera.position.x) % TILE) + TILE * 1.5) % TILE) - TILE / 2, z = camera.position.z + ((((F.bz - camera.position.z) % TILE) + TILE * 1.5) % TILE) - TILE / 2;
            var edge = Math.max(Math.abs(x - camera.position.x), Math.abs(z - camera.position.z)), ef = 1 - Math.min(1, Math.max(0, (edge - TILE * 0.36) / (TILE * 0.14)));   /* fades out before the tile's edge, so none pops when it wraps */
            x += Math.sin(t * F.wx + F.ph) * 1.6 + Math.sin(t * F.wx * 2.7 + F.ph * 2) * 0.5; z += Math.cos(t * F.wz + F.ph * 1.3) * 1.6;
            var gh = H(x, z), wet = gh < WATER + 0.2, dd = densAt(x, z), y = (wet ? WATER + 0.35 : gh) + F.h * (wet ? 0.5 : 1) + Math.sin(t * 0.8 + F.ph) * 0.35;
            v.set(x, y, z); away(v, 2.4, 3.2, 0.6);
            fp[i * 3] = v.x; fp[i * 3 + 1] = v.y; fp[i * 3 + 2] = v.z;
            var blink = F.steady ? 0.7 + 0.25 * Math.sin(t * F.w + F.ph) : 0.32 + 0.68 * Math.pow(Math.max(0, Math.sin(t * F.w + F.ph)), 4);
            var far = Math.hypot(x, z) > 300 ? 0 : 1, gl = na * blink * (0.35 + 0.65 * dd) * (wet ? 0.7 : 1) * far * ef;
            fgw[i] = gl; if (gl > 0.05) stats.flies++; }
          fg.attributes.position.needsUpdate = true; fg.attributes.aGlow.needsUpdate = true; }

        /* butterflies (by day) */
        BUNI.t.value = t; stats.butterflies = 0; reT -= dt;
        var bvis = day > 0.05 && MEADOW.length;
        if (bvis) {
          for (i = 0; i < NB; i++) { var b = BF[i];
            var wantNest = !!(b.nest && o.NEST && S && S.nestTier >= 2 && Math.hypot(o.NEST.x - focus.x, o.NEST.z - focus.z) < 60);
            if (reT <= 0 && (!b.home || wantNest !== (b.home[2] != null) || Math.hypot(b.home[0] - focus.x, b.home[1] - focus.z) > 64)) pickHome(b, wantNest);
            if (!b.home) { bms.setMatrixAt(i, HIDE); continue; }
            b.fade = Math.min(1, b.fade + dt * 0.7);
            var bx = b.home[0] + Math.sin(t * b.f1 + b.p1) * b.rad + Math.sin(t * b.f2 * 2.3 + b.p2) * 0.45, bz = b.home[1] + Math.cos(t * b.f3 + b.p3) * b.rad + Math.cos(t * b.f2 * 1.9 + b.p1) * 0.45;
            var base = b.home[2] != null ? b.home[2] : Math.max(H(bx, bz), WATER + 0.3) + 0.75;
            v.set(bx, base + 0.45 * Math.sin(t * 1.1 + b.p2) + 0.12 * Math.sin(t * 13 + bph[i] * 6.28), bz); away(v, 3.2, 4.2, 1.2);
            if (b.hasLast) { var vx = v.x - b.last.x, vz = v.z - b.last.z; if (vx * vx + vz * vz > 1e-6) { var ty = Math.atan2(vx, vz), dy = ((ty - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; b.yaw += dy * Math.min(1, dt * 6); } }
            b.last.copy(v); b.hasLast = true;
            var bs = b.s * b.fade * Math.min(1, day * 1.5);
            e.set(0.12 * Math.sin(t * 2 + b.p1), b.yaw, 0.18 * Math.sin(t * 1.3 + b.p3)); q.setFromEuler(e); sc.set(bs, bs, bs);
            bms.setMatrixAt(i, m4.compose(v, q, sc)); if (bs > 0.05) stats.butterflies++; }
          if (reT <= 0) reT = 1.5;
          bms.instanceMatrix.needsUpdate = true;
        } else if (bms.visible) hideAll(bms, NB);
        bms.visible = !!bvis;

        /* dragonflies (by day, when she is near the lake) */
        DUNI.t.value = t; stats.dragonflies = 0;
        var dvis = day > 0.1 && LAKEPTS.length && o.LAKE && Math.hypot(o.LAKE.x - focus.x, o.LAKE.z - focus.z) < 150;
        if (dvis) {
          for (i = 0; i < ND; i++) { var D = DF[i];
            var near = Math.hypot(D.p.x - bird.x, D.p.y - bird.y, D.p.z - bird.z) < 5;
            if (D.hold > 0 && !near) { D.hold -= dt; D.p.set(D.at.x + Math.sin(t * 3.1 + D.ph) * 0.08, D.at.y + Math.sin(t * 4.3 + D.ph) * 0.06, D.at.z + Math.cos(t * 2.7 + D.ph) * 0.08); }
            else {
              if (D.hold > -1) {   /* pick where to dart: a few metres off, over the water, and away from her if she is close */
                var best = null, bd = -1;
                for (var n = 0; n < 12; n++) { var lp = LAKEPTS[Math.floor(R() * LAKEPTS.length)], dl = Math.hypot(lp[0] - D.p.x, lp[1] - D.p.z);
                  if (dl < 2.5 || dl > 11) continue;
                  var sb = near ? Math.hypot(lp[0] - bird.x, lp[1] - bird.z) : 1; if (sb > bd) { bd = sb; best = lp; } if (!near) break; }
                if (!best) best = LAKEPTS[Math.floor(R() * LAKEPTS.length)];
                D.to.set(best[0], WATER + 0.5 + R() * 1.2, best[1]); D.hold = -2; }
              var dx = D.to.x - D.p.x, dy2 = D.to.y - D.p.y, dz = D.to.z - D.p.z, dl2 = Math.sqrt(dx * dx + dy2 * dy2 + dz * dz), stp = Math.min(dl2, (near ? 14 : 10) * dt);
              if (dl2 > 1e-3) { D.p.x += dx / dl2 * stp; D.p.y += dy2 / dl2 * stp; D.p.z += dz / dl2 * stp; var ty2 = Math.atan2(dx, dz), dy3 = ((ty2 - D.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; D.yaw += dy3 * Math.min(1, dt * 18); }
              if (dl2 - stp < 0.02) { D.at.copy(D.to); D.hold = 0.7 + R() * 2.4; }
            }
            v.copy(D.p); e.set(0, D.yaw, 0); q.setFromEuler(e); sc.set(0.95, 0.95, 0.95); m4.compose(v, q, sc);
            dhead.setMatrixAt(i, m4); dwing.setMatrixAt(i, m4); stats.dragonflies++; }
          dhead.instanceMatrix.needsUpdate = true; dwing.instanceMatrix.needsUpdate = true;
        } else if (dhead.visible) { hideAll(dhead, ND); hideAll(dwing, ND); }
        dhead.visible = dwing.visible = !!dvis;

        /* leaves on the wind */
        stats.leaves = 0;
        for (i = 0; i < NL; i++) { var Lf = LF[i];
          if (!Lf.live) { Lf.wait -= dt; if (Lf.wait > 0 || !trees.length || !spawnLeaf(Lf)) { if (Lf.wait <= 0) Lf.wait = 0.5 + R(); lms.setMatrixAt(i, HIDE); continue; } }
          Lf.age += dt;
          var gy = H(Lf.p.x, Lf.p.z), ls = Lf.s;
          if (Lf.rest > 0) { Lf.rest -= dt; ls *= Math.min(1, Lf.rest / 0.8); if (Lf.rest <= 0) { Lf.live = false; Lf.wait = 0.6 + R() * 3.5; lms.setMatrixAt(i, HIDE); continue; } }
          else {
            Lf.p.addScaledVector(WIND, ws * Lf.k * dt); Lf.p.y += (Lf.vy + Math.sin(Lf.age * 2.3 + Lf.ph) * 0.35) * dt;
            Lf.p.x += Math.sin(Lf.age * 3.1 + Lf.ph) * 0.5 * dt; Lf.p.z += Math.cos(Lf.age * 2.6 + Lf.ph) * 0.5 * dt;
            if (Lf.p.y <= Math.max(gy, WATER) + 0.03) { Lf.p.y = Math.max(gy, WATER) + 0.03; Lf.rest = 1.8; }
            if (Lf.age > 12 || Math.hypot(Lf.p.x - focus.x, Lf.p.z - focus.z) > 70) { Lf.live = false; Lf.wait = R() * 2; lms.setMatrixAt(i, HIDE); continue; }
            e.set(Lf.age * Lf.rx, Lf.age * Lf.ry + Lf.ph, Lf.age * Lf.rz); }
          if (Lf.rest > 0) e.set(0, Lf.ph, 0);
          q.setFromEuler(e); sc.set(ls, ls, ls); lms.setMatrixAt(i, m4.compose(Lf.p, q, sc)); stats.leaves++; }
        lms.instanceMatrix.needsUpdate = true;
      } catch (err) {
        dead = true; root.visible = false; try { console.warn('atmo stopped: ' + (err && err.message)); } catch (e2) { /* fine */ }
      }
    }
    function peek() {
      var P = function (im, n) { var out = []; for (var i = 0; i < n; i++) { im.getMatrixAt(i, m4); v.setFromMatrixPosition(m4); sc.setFromMatrixScale(m4); if (sc.x > 0.01) out.push([+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]); } return out; };
      return { dead: dead, graded: renderer.toneMapping === T.CustomToneMapping, exposure: renderer.toneMappingExposure, stats: stats, meadows: MEADOW.length, lakePts: LAKEPTS.length,
        butterflies: P(bms, NB), dragonflies: P(dhead, ND), dragonflyHold: DF.map(function (d) { return +d.hold.toFixed(2); }), leaves: P(lms, NL), windT: windT, vignette: vigStr };
    }
    return { tick: tick, peek: peek, root: root };
  }

  API = { grade: grade, create: create, curve: CURVE, keys: KEYS, last: null, error: null };
  return API;
}());
