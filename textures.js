/* ═══════════════════════════════════════════════════════════════════════════
   WFR_TEX v2 — the surfaces of "Wings for Rouge" (board 524; v2 Oct 8 2026).

   Original and procedural: every texture is painted at first use onto a small
   canvas (128–256 px, power of two so mipmaps work everywhere) with seeded
   randomness, so the game looks the same every time, ships no image files and
   touches no network. Built for an iPhone: lazy (nothing is painted until a
   texture is asked for), one pixel pass plus a few hundred canvas strokes each.

   ⭐ NEAR-WHITE BY DESIGN. three.js multiplies `material.color * map`, so a
   texture whose base is near-white keeps every existing material colour (and
   the terrain's per-face vertex colours) and only adds the material on top.
   The bird and human textures (feather, featherWing, down, skin, hair, denim,
   knit, linen, leather) are TINTABLE: greyscale around 0.75–0.95 luminance, so
   the colour comes from `material.color`. Only the cloud puff carries alpha.

   ⚠ TILING: every texture is periodic. Pixel-pass noise uses lattices whose
   period divides the canvas (tileable fbm); every scattered mark is drawn at
   its position AND its wrapped copies (drawWrapped). RepeatWrapping shows no
   seams — preview harness renders each at repeat 4 to prove it.

   ⚠ COLOUR SPACE: colour maps are THREE.sRGBEncoding (renderer.outputEncoding
   = sRGBEncoding + ACES). If the renderer passed in is still Linear output, the
   maps stay Linear so nothing darkens before the switch. Bump maps are Linear.

   Use:  WFR_TEX.get('grass', renderer)          → THREE.Texture (shared, cached)
         WFR_TEX.get('grassBump', renderer)      → greyscale height for bumpMap
         WFR_TEX.apply(mesh, 'planks', 2, 1, renderer)
         WFR_TEX.apply(mesh, 'bark', 2, 4, renderer, { bump: true })  // + bumpMap at api.bumpScale.bark
   ═══════════════════════════════════════════════════════════════════════════ */
window.WFR_TEX = (function () {
  'use strict';

  /* ── seeded randomness (mulberry32) ── */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function ctx(c) { return c.getContext('2d', { willReadFrequently: true }); }
  const grey = (v, a) => 'rgba(' + (v | 0) + ',' + (v | 0) + ',' + (v | 0) + ',' + (a == null ? 1 : a) + ')';
  const rgba = (r, g, b, a) => 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + a + ')';
  const TAU = Math.PI * 2;
  const smooth = (a, b, x) => { const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a); return t * t * (3 - 2 * t); };
  const fract = (x) => x - Math.floor(x);

  /* draw fn(x, y) at (x, y) and at its wrapped copies, so a mark near an edge
     continues on the opposite edge — this is what keeps the tiles seamless. */
  function drawWrapped(w, h, x, y, r, fn) {
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const px = x + ox * w, py = y + oy * h;
      if (px + r < 0 || px - r > w || py + r < 0 || py - r > h) continue;
      fn(px, py);
    }
  }

  /* ── tileable fbm: value noise on a lattice of fx × fy cells per tile per
     octave (each octave doubles both), wrapped modulo the lattice — so the
     field is exactly periodic over the canvas. Returns Float32Array in 0..1. */
  function fbm(S, rand, fx, fy, oct, gain) {
    const out = new Float32Array(S * S); gain = gain == null ? 0.5 : gain;
    let amp = 1, total = 0;
    const C0 = new Int32Array(S), C1 = new Int32Array(S), TX = new Float32Array(S);
    for (let o = 0; o < oct; o++) {
      const lx = fx << o, ly = fy << o, L = new Float32Array(lx * ly);
      for (let i = 0; i < L.length; i++) L[i] = rand() * amp;
      const sx = lx / S, sy = ly / S;
      for (let x = 0; x < S; x++) {                      // column tables: once per octave, not per pixel
        const gx = x * sx, xi = gx | 0, t = gx - xi;
        C0[x] = xi % lx; C1[x] = (xi + 1) % lx; TX[x] = t * t * (3 - 2 * t);
      }
      for (let y = 0; y < S; y++) {
        const gy = y * sy, yi = gy | 0, ty0 = gy - yi, ty = ty0 * ty0 * (3 - 2 * ty0);
        const r0 = (yi % ly) * lx, r1 = ((yi + 1) % ly) * lx, row = y * S;
        for (let x = 0; x < S; x++) {
          const c0 = C0[x], c1 = C1[x], tx = TX[x];
          const a = L[r0 + c0] + (L[r0 + c1] - L[r0 + c0]) * tx;
          const b = L[r1 + c0] + (L[r1 + c1] - L[r1 + c0]) * tx;
          out[row + x] += a + (b - a) * ty;
        }
      }
      total += amp; amp *= gain;
    }
    const inv = 1 / total;
    for (let i = 0; i < out.length; i++) out[i] *= inv;
    return out;
  }
  /* sine by lookup, argument in TURNS (1 = full period); periodic for negatives too */
  const SIN = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) SIN[i] = Math.sin(i / 1024 * TAU);
  const sinT = (t) => SIN[((t * 1024) | 0) & 1023];
  /* stretch a field to fill 0..1 (value noise averages toward 0.5) */
  function stretch(f) {
    let lo = 1, hi = 0;
    for (let i = 0; i < f.length; i++) { const v = f[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    const k = hi > lo ? 1 / (hi - lo) : 1;
    for (let i = 0; i < f.length; i++) f[i] = (f[i] - lo) * k;
    return f;
  }

  /* pixel pass: fn(x, y, i) returns a grey value or sets out[0..2] itself */
  function pixels(S, fn) {
    const c = canvas(S), g = ctx(c), img = g.createImageData(S, S), d = img.data, rgb = [0, 0, 0];
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const v = fn(x, y, i, rgb), p = i * 4;
      if (v === undefined) { d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; } else { d[p] = d[p + 1] = d[p + 2] = v; }
      d[p + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return { c: c, g: g };
  }

  /* multiply a drawn canvas by a field (k = 1 + (f-0.5)*amp) plus fine grain */
  function modulate(g, S, f, amp, rand, grain) {
    const img = g.getImageData(0, 0, S, S), d = img.data;
    for (let i = 0, p = 0; i < S * S; i++, p += 4) {
      const k = 1 + (f[i] - 0.5) * amp, n = grain ? (rand() - 0.5) * grain : 0;
      d[p] = d[p] * k + n; d[p + 1] = d[p + 1] * k + n; d[p + 2] = d[p + 2] * k + n;
    }
    g.putImageData(img, 0, 0);
  }

  /* ── the painters: each paints a fresh canvas and returns it ── */
  const painters = {

    /* grass: clumpy light/dark patches, then ~2400 blade strokes (dark roots
       first, light tips over them). Near-white with a faint yellow-green lean,
       so the terrain's own sand/green/rock face colours still lead. */
    grass: function () {
      const S = 256, r = rng(524001);
      const clump = stretch(fbm(S, r, 4, 4, 3)), patch = stretch(fbm(S, r, 8, 8, 2)), fine = fbm(S, r, 32, 32, 1);
      const P = pixels(S, function (x, y, i, o) {
        const L = 236 + (clump[i] - 0.5) * 30 + (fine[i] - 0.5) * 22 - 18 * smooth(0.6, 0.86, patch[i]);
        o[0] = L - 2; o[1] = L + 2; o[2] = L - 9;
      });
      const g = P.g; g.lineCap = 'round';
      // blades in 8 batches per pass (one stroke() per batch, not per blade): same look, a fraction of the cost
      for (let pass = 0; pass < 2; pass++) {
        const n = pass ? 1400 : 800, groups = 8;
        for (let k = 0; k < groups; k++) {
          const v = pass ? 240 + r() * 15 : 176 + r() * 36;
          g.strokeStyle = pass ? rgba(v - 4, v, v - 22, 0.35 + r() * 0.35) : rgba(v - 6, v + 6, v - 18, 0.28 + r() * 0.25);
          g.lineWidth = 0.7 + r() * 0.9;
          g.beginPath();
          for (let i = 0; i < n / groups; i++) {
            const x = r() * S, y = r() * S, len = 3 + r() * (pass ? 7 : 5), lean = (r() - 0.5) * 5, bend = (r() - 0.5) * 3;
            drawWrapped(S, S, x, y, len + 6, function (px, py) {
              g.moveTo(px, py); g.quadraticCurveTo(px + bend, py - len * 0.6, px + lean, py - len);
            });
          }
          g.stroke();
        }
      }
      return P.c;
    },

    /* bark: braided vertical ridges — two families of narrow wandering
       fissures leaning opposite ways, so the plates split and merge like real
       bark; convex plate shading, fibre streaks, short horizontal cracks. */
    bark: function () {
      const S = 256, r = rng(524002), N = 7;
      const w1 = fbm(S, r, 2, 3, 2), w2 = fbm(S, r, 2, 3, 2), width = fbm(S, r, 6, 4, 1), fiber = fbm(S, r, 48, 4, 1),
        crack = stretch(fbm(S, r, 8, 24, 1)), tone = stretch(fbm(S, r, 3, 3, 2));
      const plate = stretch(fbm(S, r, N, 5, 1));                    // plate-sized tone patches (tileable; a per-plate table would break at the V wrap)
      return pixels(S, function (x, y, i) {
        const u = x / S, v = y / S;
        const d1 = Math.abs(fract(u * N + v + (w1[i] - 0.5) * 1.6) - 0.5) * 2, d2 = Math.abs(fract(u * N - v + 0.5 + (w2[i] - 0.5) * 1.6) - 0.5) * 2;
        const w = 0.74 + (width[i] - 0.5) * 0.3, fis = Math.max(smooth(w, w + 0.18, d1), smooth(w + 0.04, w + 0.2, d2));
        const dd = Math.max(d1, d2);
        const L = 226 - 26 * dd * dd + (plate[i] - 0.5) * 34 + (fiber[i] - 0.5) * 40 + (tone[i] - 0.5) * 22 - fis * 96 - 40 * smooth(0.82, 0.94, crack[i]) * (1 - fis);
        return L;
      }).c;
    },

    /* barkTree (board 578, the forest's own bark; cabins and treehouses keep 'bark'): the same braided ridges, painted
       in colour - warm sunlit plates, cool deep fissures, pale grey-green lichen on the plates, soft moss in the cracks.
       Near-white overall: the tree's instance colour (brown / white birch / silver snag) still leads. 256 px. */
    barkTree: function () {
      const S = 256, r = rng(578101), N = 6;
      const w1 = fbm(S, r, 2, 3, 2), w2 = fbm(S, r, 2, 3, 2), width = fbm(S, r, 6, 4, 1), fiber = fbm(S, r, 48, 4, 1),
        crack = stretch(fbm(S, r, 8, 24, 1)), tone = stretch(fbm(S, r, 3, 3, 2)), plate = stretch(fbm(S, r, N, 5, 1)),
        lich = stretch(fbm(S, r, 4, 4, 3, 0.55)), moss = stretch(fbm(S, r, 3, 5, 2));
      return pixels(S, function (x, y, i, o) {
        const u = x / S, v = y / S;
        const d1 = Math.abs(fract(u * N + v + (w1[i] - 0.5) * 1.6) - 0.5) * 2, d2 = Math.abs(fract(u * N - v + 0.5 + (w2[i] - 0.5) * 1.6) - 0.5) * 2;
        const w = 0.72 + (width[i] - 0.5) * 0.3, fis = Math.max(smooth(w, w + 0.18, d1), smooth(w + 0.04, w + 0.2, d2));
        const dd = Math.max(d1, d2), edge = smooth(0.35, 0.7, dd) * (1 - fis);   // the rounded shoulder of each plate
        let L = 232 - 30 * dd * dd + (plate[i] - 0.5) * 36 + (fiber[i] - 0.5) * 38 + (tone[i] - 0.5) * 24 - fis * 90 - 42 * smooth(0.82, 0.94, crack[i]) * (1 - fis);
        L += 10 * (1 - edge) * (1 - fis);   // plate tops catch the light
        let R = L * 1.03, G = L * 0.99, B = L * 0.92;   // warm wood
        const dk = fis * 0.6; R -= dk * 18; B += dk * 8;   // fissures fall cool
        const li = smooth(0.62, 0.8, lich[i]) * (1 - fis) * (0.6 + 0.4 * plate[i]);   // lichen: pale, grey-green, on the plates
        R += (238 - R) * li * 0.55; G += (246 - G) * li * 0.6; B += (222 - B) * li * 0.5;
        const mo = smooth(0.5, 0.8, moss[i]) * Math.max(fis, 0.45 * edge);   // moss: in the cracks and on the shoulders
        R *= 1 - mo * 0.4; G *= 1 - mo * 0.08; B *= 1 - mo * 0.55;
        o[0] = Math.max(0, Math.min(255, R)); o[1] = Math.max(0, Math.min(255, G)); o[2] = Math.max(0, Math.min(255, B));
      }).c;
    },

    /* planks: 8 horizontal siding boards, two joints per row, each board its
       own tone, flowing grain + ring lines, seam shadow, nail holes at joints. */
    planks: function () {
      const S = 256, r = rng(524003), rows = 8, bh = S / rows;
      const warp = fbm(S, r, 2, 4, 2), grain = fbm(S, r, 4, 64, 1), blot = stretch(fbm(S, r, 4, 4, 2));
      const joints = [], tones = [];
      for (let j = 0; j < rows; j++) { const a = r() * S, b = (a + S * (0.35 + r() * 0.3)) % S; joints.push([Math.min(a, b), Math.max(a, b)]); tones.push([226 + r() * 26, 226 + r() * 26]); }
      const P = pixels(S, function (x, y, i, o) {
        const j = (y / bh) | 0, ly = y - j * bh, jt = joints[j], seg = (x >= jt[0] && x < jt[1]) ? 1 : 0;
        const ring = 0.5 + 0.5 * sinT(y / S * 22 + (warp[i] - 0.5) * 3 + seg * 0.37 + j * 0.21);
        let v = tones[j][seg] - 26 * Math.pow(ring, 6) + (grain[i] - 0.5) * 30 + (blot[i] - 0.5) * 14;
        if (ly >= bh - 2) v -= 85; else if (ly < 1) v += 14; else if (ly < 4) v -= (4 - ly) * 3;
        if (Math.abs(x - jt[0]) < 1 || Math.abs(x - jt[1]) < 1) v -= 70;
        o[0] = v; o[1] = v - 11; o[2] = v - 28;
      });
      const g = P.g;
      for (let j = 0; j < rows; j++) for (const jx of joints[j]) for (const side of [-4.5, 4.5]) for (const ny of [6, bh - 8]) {
        drawWrapped(S, S, jx + side, j * bh + ny, 3, function (px, py) {
          g.fillStyle = rgba(70, 50, 34, 0.8); g.beginPath(); g.arc(px, py, 1.3, 0, TAU); g.fill();
          g.fillStyle = rgba(255, 245, 230, 0.35); g.fillRect(px - 0.5, py - 1.4, 1, 0.7);
        });
      }
      return P.c;
    },

    /* plaster: light wall, soft mottling, a few faint water stains with a
       darker tide line, fine sandy grain. */
    plaster: function () {
      const S = 256, r = rng(524004);
      const mot = fbm(S, r, 3, 3, 4), stain = stretch(fbm(S, r, 2, 2, 3)), fine = fbm(S, r, 64, 64, 1);
      return pixels(S, function (x, y, i, o) {
        const k = smooth(0.64, 0.82, stain[i]), ring = k * (1 - k) * 4;
        const L = 244 + (mot[i] - 0.5) * 26 + (fine[i] - 0.5) * 12 + (r() - 0.5) * 6 - 6 * k - 4 * ring;
        o[0] = L; o[1] = L - 1.5 * k; o[2] = L - 5 * k;
      }).c;
    },

    /* roofTiles: staggered rows of rounded clay tiles, upper row overlapping
       the one below with a soft drop shadow; barrel shading across each tile. */
    roofTiles: function () {
      const S = 256, c = canvas(S), g = ctx(c), r = rng(524005), rows = 8, cols = 8, th = S / rows, tw = S / cols;
      const tone = []; for (let k = 0; k < rows * cols; k++) tone.push(230 + r() * 25);
      g.fillStyle = grey(130); g.fillRect(0, 0, S, S);
      for (let j = rows; j >= -1; j--) {
        const jj = ((j % rows) + rows) % rows, y0 = j * th - th * 0.35, y1 = (j + 1) * th;
        for (let i = -1; i <= cols; i++) {
          const ii = ((i % cols) + cols) % cols, v = tone[jj * cols + ii], x = i * tw + (jj % 2 ? tw / 2 : 0);
          // drop shadow on the tile below
          g.fillStyle = grey(40, 0.35); g.beginPath();
          g.moveTo(x + 1, y1 - 4); g.lineTo(x + tw - 1, y1 - 4); g.quadraticCurveTo(x + tw / 2, y1 + 9, x + 1, y1 - 4); g.fill();
          const gr = g.createLinearGradient(x, 0, x + tw, 0);
          gr.addColorStop(0, grey(v - 36)); gr.addColorStop(0.35, grey(v)); gr.addColorStop(0.55, grey(Math.min(255, v + 8))); gr.addColorStop(1, grey(v - 46));
          g.fillStyle = gr; g.beginPath();
          g.moveTo(x + 0.8, y0); g.lineTo(x + tw - 0.8, y0); g.lineTo(x + tw - 0.8, y1 - 5);
          g.quadraticCurveTo(x + tw / 2, y1 + 4, x + 0.8, y1 - 5); g.closePath(); g.fill();
          const vg = g.createLinearGradient(0, y0, 0, y1);                       // shadow under the row above
          vg.addColorStop(0, grey(30, 0.45)); vg.addColorStop(0.45, grey(30, 0)); vg.addColorStop(0.92, grey(255, 0)); vg.addColorStop(1, grey(255, 0.18));
          g.fillStyle = vg; g.fill();
        }
      }
      modulate(g, S, stretch(fbm(S, r, 4, 4, 3)), 0.18, r, 10);
      return c;
    },

    /* stone: coursed blocks with irregular corners, mortar recessed between,
       each stone its own tone, lit top edge, shaded lower edge, pitted grain. */
    stone: function () {
      const S = 256, c = canvas(S), g = ctx(c), r = rng(524006), rows = 6, rh = S / rows;
      g.fillStyle = grey(172); g.fillRect(0, 0, S, S);              // mortar
      for (let j = 0; j < rows; j++) {
        let x = -r() * 30; const y = j * rh, x0 = x;
        while (x < x0 + S) {
          const w = Math.min(28 + r() * 34, x0 + S - x), v = 214 + r() * 38;
          const jit = []; for (let k = 0; k < 8; k++) jit.push((r() - 0.5) * 3);
          const draw = function (px) {
            const a = 2.2, L = px + a, R = px + w - a, T = y + a, B = y + rh - a;
            g.beginPath();
            g.moveTo(L + 4 + jit[0], T + jit[1]); g.lineTo(R - 4 + jit[2], T + jit[3]);
            g.quadraticCurveTo(R, T, R + jit[4] * 0.5, T + 5); g.lineTo(R + jit[5] * 0.5, B - 5);
            g.quadraticCurveTo(R, B, R - 5 + jit[6], B); g.lineTo(L + 5 + jit[7], B);
            g.quadraticCurveTo(L, B, L, B - 5); g.lineTo(L, T + 5); g.quadraticCurveTo(L, T, L + 4 + jit[0], T + jit[1]);
            g.closePath();
            const gr = g.createLinearGradient(0, T, 0, B);
            gr.addColorStop(0, grey(Math.min(255, v + 14))); gr.addColorStop(0.25, grey(v)); gr.addColorStop(1, grey(v - 34));
            g.fillStyle = gr; g.fill();
            g.strokeStyle = grey(80, 0.45); g.lineWidth = 1.4; g.stroke();
          };
          draw(x); draw(x - S); draw(x + S);
          x += w;
        }
      }
      modulate(g, S, stretch(fbm(S, r, 8, 8, 3)), 0.24, r, 16);
      return c;
    },

    /* wood: vertical-grain board for doors, shutters, fences — flowing ring
       lines and fibre streaks, warm. */
    wood: function () {
      const S = 256, r = rng(524007);
      const warp = fbm(S, r, 2, 2, 2), fibre = fbm(S, r, 64, 4, 1), tone = stretch(fbm(S, r, 3, 2, 2));
      return pixels(S, function (x, y, i, o) {
        const ring = 0.5 + 0.5 * sinT(x / S * 12 + (warp[i] - 0.5) * 3.5);
        const v = 236 - 30 * Math.pow(ring, 5) - 8 * ring + (fibre[i] - 0.5) * 30 + (tone[i] - 0.5) * 14;
        o[0] = v + 2; o[1] = v - 8; o[2] = v - 24;
      }).c;
    },

    /* cloth: plain over-under weave, rounded threads, faint slubs. */
    cloth: function () {
      const S = 128, r = rng(524008), slub = fbm(S, r, 4, 32, 2), slub2 = fbm(S, r, 32, 4, 2);
      return pixels(S, function (x, y, i) {
        const over = ((x >> 1) + (y >> 1)) & 1, px = (x & 1) + 0.5, py = (y & 1) + 0.5;
        const prof = over ? Math.sin(px / 2 * Math.PI) : Math.sin(py / 2 * Math.PI);
        return 212 + 30 * prof + (over ? (slub[i] - 0.5) : (slub2[i] - 0.5)) * 26 + (r() - 0.5) * 6;
      }).c;
    },

    /* water: interfering ripple bands (tileable integer directions, noise
       warped) with bright caustic crests over soft swells. */
    water: function () {
      const S = 256, r = rng(524009);
      const warp = fbm(S, r, 3, 3, 2), swell = fbm(S, r, 2, 2, 2);
      const D = [[3, 1], [-2, 3], [1, -4]], ph = [r(), r(), r()];
      return pixels(S, function (x, y, i) {
        const u = x / S, v = y / S, w = (warp[i] - 0.5) * 5;
        let s = 0;
        for (let k = 0; k < 3; k++) s += sinT((D[k][0] * u + D[k][1] * v) * 2 + ph[k] + w * (k + 1) / TAU);
        const c1 = 1 - Math.min(1, Math.abs(s) / 1.6), c2 = c1 * c1, crest = c2 * c2 * c1;
        return 220 + (swell[i] - 0.5) * 34 + crest * 40 + s * 3;
      }).c;
    },

    /* cloud: soft puff of overlapping radial lobes; white with alpha. */
    cloud: function () {
      const S = 128, c = canvas(S), g = ctx(c), r = rng(524010);
      for (let i = 0; i < 9; i++) {
        const ang = r() * 6.283, d = r() * 16, x = S / 2 + Math.cos(ang) * d, y = S / 2 + 4 + Math.sin(ang) * d * 0.6, rad = 22 + r() * 14;  // stays inside the canvas: no clipped edge
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, S, S);
      }
      g.globalCompositeOperation = 'source-atop';
      const sh = g.createLinearGradient(0, S * 0.35, 0, S * 0.9);
      sh.addColorStop(0, 'rgba(225,232,240,0)'); sh.addColorStop(1, 'rgba(205,215,228,0.6)');
      g.fillStyle = sh; g.fillRect(0, 0, S, S);
      g.globalCompositeOperation = 'source-over';
      return c;
    },

    /* ── v2: the bird ─────────────────────────────────────────────────── */

    /* feather: small overlapping body feathers like shingles, tips pointing
       to the canvas bottom (−V), upper rows lying over lower ones. Tintable. */
    feather: function () {
      const S = 256, c = canvas(S), g = ctx(c), r = rng(524011), cols = 10, rows = 14, tw = S / cols, th = S / rows;
      const hw = tw * 0.62, H = th * 2.25, W = Math.ceil(hw * 2 + 4), SH = Math.ceil(H + 6);
      const sprite = function (v) {                                  // one feather, drawn once per tone, stamped ~170×
        const sc = canvas(W, SH), sg = ctx(sc), cx = W / 2, top = 0, tip = H, mid = tip - hw * 0.9;
        sg.fillStyle = grey(60, 0.22); sg.beginPath(); sg.ellipse(cx, tip + 1.5, hw * 0.85, 3.2, 0, 0, TAU); sg.fill();   // shadow on the feather below
        sg.beginPath(); sg.moveTo(cx - hw, top); sg.lineTo(cx - hw, mid);
        sg.quadraticCurveTo(cx - hw, tip, cx, tip); sg.quadraticCurveTo(cx + hw, tip, cx + hw, mid); sg.lineTo(cx + hw, top); sg.closePath();
        const gr = sg.createRadialGradient(cx, mid - th * 0.2, 1, cx, mid, hw * 1.2);
        gr.addColorStop(0, grey(Math.min(250, v + 12))); gr.addColorStop(0.7, grey(v)); gr.addColorStop(1, grey(v - 24));
        sg.fillStyle = gr; sg.fill();
        sg.strokeStyle = grey(v - 30, 0.5); sg.lineWidth = 0.8; sg.beginPath(); sg.moveTo(cx, top + th); sg.lineTo(cx, tip - 3); sg.stroke();   // shaft
        sg.strokeStyle = grey(v - 22, 0.22); sg.lineWidth = 0.6;
        for (let k = 0; k < 4; k++) {                                 // barbs
          const by = mid - th * 0.6 + k * 3.2;
          sg.beginPath(); sg.moveTo(cx, by); sg.lineTo(cx - hw * 0.8, by + 4); sg.moveTo(cx, by); sg.lineTo(cx + hw * 0.8, by + 4); sg.stroke();
        }
        sg.strokeStyle = grey(v - 55, 0.32); sg.lineWidth = 0.9; sg.beginPath();   // rim
        sg.moveTo(cx - hw, mid); sg.quadraticCurveTo(cx - hw, tip, cx, tip); sg.quadraticCurveTo(cx + hw, tip, cx + hw, mid); sg.stroke();
        return sc;
      };
      const sprites = [sprite(224), sprite(232), sprite(240)], pick = [];
      for (let k = 0; k < rows * cols; k++) pick.push(sprites[(r() * 3) | 0]);
      g.fillStyle = grey(185); g.fillRect(0, 0, S, S);
      for (let j = rows + 1; j >= -2; j--) {
        const jj = ((j % rows) + rows) % rows;
        for (let i = -1; i <= cols; i++) {
          const ii = ((i % cols) + cols) % cols, cx = i * tw + (jj % 2 ? tw / 2 : 0) + tw / 2;
          g.drawImage(pick[jj * cols + ii], cx - W / 2, j * th - th * 1.2);
        }
      }
      modulate(g, S, fbm(S, r, 4, 4, 2), 0.1, r, 6);
      return c;
    },

    /* featherWing: long flight feathers lying along U (shaft runs left→right),
       stacked in V; barbs angle toward +U, each feather's trailing vane lies
       over the next one's leading edge. Seamless in both axes. Tintable. */
    featherWing: function () {
      const S = 256, c = canvas(S), g = ctx(c), r = rng(524012), rows = 6, bh = S / rows, step = 2, nb = S / step;
      const tone = [], barbL = [], barbV = [];
      for (let k = 0; k < rows; k++) tone.push(222 + r() * 20);
      for (let k = 0; k < rows * nb; k++) { barbL.push(r()); barbV.push(r()); }
      g.fillStyle = grey(190); g.fillRect(0, 0, S, S);
      for (let j = rows; j >= -1; j--) {
        const jj = ((j % rows) + rows) % rows, v = tone[jj], top = j * bh - bh * 0.05, shaft = j * bh + bh * 0.3, bot = (j + 1) * bh + bh * 0.28;
        g.fillStyle = grey(60, 0.16); g.fillRect(0, bot - 1, S, 4);           // shadow onto the feather below
        const gr = g.createLinearGradient(0, top, 0, bot);
        gr.addColorStop(0, grey(v - 10)); gr.addColorStop(0.3, grey(v + 6)); gr.addColorStop(0.36, grey(v + 4)); gr.addColorStop(0.85, grey(v - 4)); gr.addColorStop(1, grey(v - 14));
        g.fillStyle = gr; g.fillRect(0, top, S, bot - top);
        g.lineWidth = 0.7;
        for (let b = -8; b < nb + 8; b++) {                                     // barbs (keyed by b mod nb → seamless)
          const bi = jj * nb + ((b % nb) + nb) % nb, x = b * step, lv = barbV[bi];
          g.strokeStyle = lv > 0.5 ? grey(255, 0.08 + lv * 0.08) : grey(90, 0.05 + lv * 0.1);
          const ld = (bot - shaft) * (0.92 + barbL[bi] * 0.08);
          g.beginPath(); g.moveTo(x, shaft + 1); g.quadraticCurveTo(x + ld * 0.25, shaft + ld * 0.5, x + ld * 0.75, shaft + ld);   // trailing vane
          g.moveTo(x, shaft - 1); g.lineTo(x + (shaft - top) * 0.7, top + 1); g.stroke();                                           // leading vane
        }
        for (let k = 0; k < 3; k++) {                                           // a few splits in the trailing vane
          const sx = r() * S, sl = (bot - shaft) * (0.4 + r() * 0.5);
          for (const ox of [-S, 0, S]) { g.strokeStyle = grey(120, 0.25); g.lineWidth = 0.8; g.beginPath(); g.moveTo(sx + ox + sl * 0.3, bot - 2); g.lineTo(sx + ox + sl * 0.3 - sl * 0.55, bot - sl); g.stroke(); }
        }
        g.fillStyle = grey(110, 0.45); g.fillRect(0, shaft + 1.2, S, 1);       // rachis: shadow + bright shaft
        g.fillStyle = grey(252); g.fillRect(0, shaft - 0.8, S, 2);
        g.fillStyle = grey(70, 0.3); g.fillRect(0, bot - 1, S, 1);
      }
      modulate(g, S, fbm(S, r, 4, 4, 3), 0.08, r, 5);
      return c;
    },

    /* down: soft fluffy chick down — soft mottling and many curly wisps. */
    down: function () {
      const S = 128, r = rng(524013), mot = stretch(fbm(S, r, 4, 4, 4));
      const P = pixels(S, function (x, y, i) { return 222 + mot[i] * 22 + (r() - 0.5) * 6; }), g = P.g;
      g.lineCap = 'round';
      for (let i = 0; i < 700; i++) {
        const x = r() * S, y = r() * S, len = 3 + r() * 6, a = r() * TAU, bend = (r() - 0.5) * 6, light = r() > 0.4;
        g.strokeStyle = light ? grey(255, 0.25 + r() * 0.3) : grey(185, 0.15 + r() * 0.2); g.lineWidth = 0.6 + r() * 0.9;
        drawWrapped(S, S, x, y, len + 6, function (px, py) {
          const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len;
          g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo((px + ex) / 2 - Math.sin(a) * bend, (py + ey) / 2 + Math.cos(a) * bend, ex, ey); g.stroke();
        });
      }
      return P.c;
    },

    /* ── v2: the people ───────────────────────────────────────────────── */

    /* skin: very subtle — a whisper of mottling and pores. Tintable. */
    skin: function () {
      const S = 128, r = rng(524014), low = fbm(S, r, 4, 4, 3), mid = fbm(S, r, 16, 16, 2);
      return pixels(S, function (x, y, i) { return 244 + (low[i] - 0.5) * 10 + (mid[i] - 0.5) * 7 + (r() < 0.012 ? -9 : 0); }).c;
    },

    /* hair: fine strands along V with clumped light sheen bands. Tintable. */
    hair: function () {
      const S = 256, r = rng(524015);
      const strand = stretch(fbm(S, r, 64, 2, 1)), clump = stretch(fbm(S, r, 12, 1, 2)), sheen = fbm(S, r, 4, 2, 2);
      const P = pixels(S, function (x, y, i) {
        const L = 206 + (strand[i] - 0.5) * 60 + (clump[i] - 0.5) * 40 + 30 * smooth(0.55, 0.75, sheen[i]);
        return L;
      }), g = P.g;
      g.lineWidth = 0.7;
      for (let i = 0; i < 260; i++) {                                         // a few loose strands (period S in y)
        const x0 = r() * S, a = 1 + r() * 3, p = r() * TAU, light = r() > 0.5;
        g.strokeStyle = light ? grey(255, 0.25) : grey(120, 0.2);
        for (const ox of [-S, 0, S]) {
          g.beginPath();
          for (let y = 0; y <= S; y += 8) { const x = x0 + ox + a * Math.sin(y / S * TAU + p); if (y) g.lineTo(x, y); else g.moveTo(x, y); }
          g.stroke();
        }
      }
      return P.c;
    },

    /* denim: 3/1 right-hand twill — diagonal warp ridges with white weft
       peeking through, slubby yarn and soft fading. Tintable (indigo comes
       from material.color). */
    denim: function () {
      const S = 256, r = rng(524016), slub = stretch(fbm(S, r, 64, 4, 1)), fade = stretch(fbm(S, r, 2, 2, 3));
      return pixels(S, function (x, y, i) {
        const ph = (x + y) & 3, ridge = ph === 0 ? 1 : ph === 2 ? 0.55 : 0;
        const weft = ph === 3 ? 1 : 0;
        return 198 + ridge * 22 + weft * 34 + (slub[i] - 0.5) * 30 + 14 * smooth(0.6, 0.95, fade[i]) + (r() - 0.5) * 10;
      }).c;
    },

    /* knit: stockinette — columns of V-shaped stitches (two leaning loops),
       rows overlapping. Tintable. */
    knit: function () {
      const S = 256, c = canvas(S), g = ctx(c), r = rng(524017), cols = 16, rows = 20, cw = S / cols, rh = S / rows, B = Math.ceil(rh * 2 + 4);
      const loop = function (ang, v) {                                // one leaning loop per (lean, tone), stamped ~740×
        const sc = canvas(B, B), sg = ctx(sc);
        sg.translate(B / 2, B / 2); sg.rotate(ang);
        const gr = sg.createRadialGradient(-0.8, -1.5, 0.5, 0, 0, cw * 0.48);
        gr.addColorStop(0, grey(Math.min(255, v + 18))); gr.addColorStop(0.6, grey(v)); gr.addColorStop(1, grey(v - 50));
        sg.fillStyle = gr; sg.beginPath(); sg.ellipse(0, 0, cw * 0.26, rh * 0.82, 0, 0, TAU); sg.fill();
        return sc;
      };
      const L = [loop(-0.55, 216), loop(-0.55, 226)], R = [loop(0.55, 212), loop(0.55, 222)];
      g.fillStyle = grey(140); g.fillRect(0, 0, S, S);
      for (let j = rows + 1; j >= -1; j--) for (let i = -1; i <= cols; i++) {
        const x = i * cw + cw / 2, y = j * rh, k = ((((j % rows) + rows) % rows) * 7 + ((i % cols) + cols) % cols * 3) & 1;
        g.drawImage(L[k], x - cw * 0.22 - B / 2, y - B / 2); g.drawImage(R[k ^ 1], x + cw * 0.22 - B / 2, y - B / 2);
      }
      modulate(g, S, stretch(fbm(S, r, 4, 4, 3)), 0.12, r, 6);
      return c;
    },

    /* linen: irregular plain weave — threads of varying thickness and slubs. */
    linen: function () {
      const S = 128, r = rng(524018), sx = fbm(S, r, 4, 64, 2), sy = fbm(S, r, 64, 4, 2), low = fbm(S, r, 4, 4, 3);
      const rowT = [], colT = []; for (let k = 0; k < S / 2; k++) { rowT.push(r()); colT.push(r()); }
      return pixels(S, function (x, y, i) {
        const over = ((x >> 1) + (y >> 1)) & 1;
        const t = over ? colT[x >> 1] : rowT[y >> 1], s = over ? sx[i] : sy[i];
        return 228 + (t - 0.5) * 22 + (s - 0.5) * 30 + (over ? 6 : -4) + (low[i] - 0.5) * 10;
      }).c;
    },

    /* leather: pebbled grain — a fine crease network around soft pebbles,
       scattered pores. Tintable. */
    leather: function () {
      const S = 256, r = rng(524019), n = fbm(S, r, 32, 32, 1), low = fbm(S, r, 3, 3, 2), fine = fbm(S, r, 64, 64, 1);
      return pixels(S, function (x, y, i) {
        const ridge = 1 - Math.abs(n[i] - 0.5) * 2;                           // 1 on the creases
        return 228 - 34 * smooth(0.84, 0.98, ridge) + 10 * (1 - ridge) + (low[i] - 0.5) * 18 + (fine[i] - 0.5) * 12 + (r() < 0.01 ? -22 : 0);
      }).c;
    },

    /* ── v2: the ground ──────────────────────────────────────────────── */

    /* sand: wind ripples, fine grains, odd bright/dark specks. Near-white, warm. */
    sand: function () {
      const S = 256, r = rng(524020), warp = fbm(S, r, 2, 3, 2), low = fbm(S, r, 4, 4, 2);
      return pixels(S, function (x, y, i, o) {
        const s = fract(y / S * 9 + x / S + (warp[i] - 0.5) * 2.4), rip = s < 0.75 ? s / 0.75 : (1 - s) / 0.25;   // asymmetric ripple
        const q = r(), sp = q < 0.03 ? 30 : q > 0.975 ? -40 : (r() - 0.5) * 22;
        const L = 228 + rip * 14 + (low[i] - 0.5) * 16 + sp;
        o[0] = L + 3; o[1] = L; o[2] = L - 9;
      }).c;
    },

    /* rock: layered fbm with ridged cracks, faint strata and pale lichen. */
    rock: function () {
      const S = 256, r = rng(524021), n = stretch(fbm(S, r, 4, 4, 4, 0.55)), cr = fbm(S, r, 8, 8, 3, 0.6), warp = fbm(S, r, 2, 2, 1), lich = stretch(fbm(S, r, 8, 8, 2));
      return pixels(S, function (x, y, i) {
        const ridge = 1 - Math.abs(cr[i] - 0.5) * 2;
        const strata = sinT(y / S * 5 + (warp[i] - 0.5) * 2);
        return 206 + (n[i] - 0.5) * 70 - 24 * smooth(0.94, 0.995, ridge) + strata * 7 + 26 * smooth(0.8, 0.92, lich[i]) + (r() - 0.5) * 16;
      }).c;
    },

    /* dirt: lumpy soil, small pebbles with shadows, dark organic specks. Warm. */
    dirt: function () {
      const S = 256, r = rng(524022), n = stretch(fbm(S, r, 8, 8, 3)), low = fbm(S, r, 3, 3, 2);
      const P = pixels(S, function (x, y, i, o) {
        const L = 204 + (n[i] - 0.5) * 50 + (low[i] - 0.5) * 24 + (r() < 0.04 ? -40 : (r() - 0.5) * 18);
        o[0] = L + 4; o[1] = L - 2; o[2] = L - 12;
      }), g = P.g;
      for (let i = 0; i < 140; i++) {
        const x = r() * S, y = r() * S, rw = 1.2 + r() * 3, rh = rw * (0.6 + r() * 0.4), v = 210 + r() * 40, a = r() * TAU;
        drawWrapped(S, S, x, y, rw + 3, function (px, py) {
          g.fillStyle = grey(70, 0.35); g.beginPath(); g.ellipse(px + 0.8, py + 1, rw, rh, a, 0, TAU); g.fill();
          g.fillStyle = rgba(v, v - 4, v - 12, 1); g.beginPath(); g.ellipse(px, py, rw, rh, a, 0, TAU); g.fill();
          g.fillStyle = grey(255, 0.3); g.beginPath(); g.ellipse(px - rw * 0.3, py - rh * 0.35, rw * 0.4, rh * 0.3, a, 0, TAU); g.fill();
        });
      }
      return P.c;
    }
  };
  /* aliases asked for in the order — resolved to the SAME texture, never painted twice */
  const ALIAS = { shingle: 'roofTiles', door: 'wood' };

  /* ── bump: a greyscale height derived from the colour canvas (dark = deep),
     contrast-stretched. Linear encoding. Works for any name + 'Bump'. ── */
  function bumpCanvas(src) {
    const S = src.width, H = src.height, c = canvas(S, H), g = ctx(c);
    const sd = ctx(src).getImageData(0, 0, S, H).data, img = g.createImageData(S, H), d = img.data;
    const L = new Float32Array(S * H), B = new Float32Array(S * H);
    for (let i = 0, p = 0; i < L.length; i++, p += 4) L[i] = sd[p] * 0.3 + sd[p + 1] * 0.59 + sd[p + 2] * 0.11;
    // 3×3 box blur, wrapped (stays tileable): pixel speckle would read as sandpaper under a light
    let lo = 1e9, hi = -1e9;
    for (let y = 0; y < H; y++) {
      const ym = ((y + H - 1) % H) * S, y0 = y * S, yp = ((y + 1) % H) * S;
      for (let x = 0; x < S; x++) {
        const xm = (x + S - 1) % S, xp = (x + 1) % S;
        const v = L[ym + xm] + L[ym + x] + L[ym + xp] + L[y0 + xm] + L[y0 + x] + L[y0 + xp] + L[yp + xm] + L[yp + x] + L[yp + xp];
        B[y0 + x] = v; if (v < lo) lo = v; if (v > hi) hi = v;
      }
    }
    const k = hi > lo ? 255 / (hi - lo) : 1;
    for (let i = 0, p = 0; i < B.length; i++, p += 4) { d[p] = d[p + 1] = d[p + 2] = (B[i] - lo) * k; d[p + 3] = 255; }
    g.putImageData(img, 0, 0);
    return c;
  }

  function finish(c, renderer, opts) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = (opts && opts.clamp) ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    const maxA = renderer && renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 1;
    t.anisotropy = Math.min(4, maxA || 1);              // 4 is plenty on a phone
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    // colour maps are sRGB — unless the renderer is still on Linear output, in which case stay Linear so nothing darkens
    const linearOut = renderer && renderer.outputEncoding !== undefined && renderer.outputEncoding !== THREE.sRGBEncoding;
    t.encoding = (opts && opts.linear) || linearOut ? THREE.LinearEncoding : THREE.sRGBEncoding;
    t.needsUpdate = true;
    return t;
  }

  /* ── cache + public API ── */
  const cache = {}, canvases = {}, stats = { painted: 0, ms: 0, each: {} };
  const now = () => (window.performance ? performance.now() : Date.now());
  function paint(base) {
    if (!canvases[base]) {
      const t0 = now(); canvases[base] = painters[base]();
      const dt = now() - t0; stats.painted++; stats.ms += dt; stats.each[base] = Math.round(dt * 10) / 10;
    }
    return canvases[base];
  }
  function get(name, renderer) {
    if (cache[name]) return cache[name];
    const al = name.replace(/Bump$/, ''); if (ALIAS[al]) return (cache[name] = get(ALIAS[al] + name.slice(al.length), renderer));
    const isBump = /Bump$/.test(name), base = isBump ? name.slice(0, -4) : name;
    if (!painters[base]) throw new Error('WFR_TEX: no texture named ' + name);
    if (isBump) {
      const t0 = now(); const c = bumpCanvas(paint(base)); const dt = now() - t0;
      stats.ms += dt; stats.each[name] = Math.round(dt * 10) / 10;
      cache[name] = finish(c, renderer, { linear: true });
    } else { cache[name] = finish(paint(base), renderer, base === 'cloud' ? { clamp: true } : null); photoFor(base); }
    return cache[name];
  }

  /* 578/618 - THE PHOTOS (Marth, Oct 11: "implement all fixes ... that can use other ppls code"; his "!!!" on the texture pack).
     tex-photos.js carries CC0 photo textures (Poly Haven). Once a photo decodes it is painted INTO the hand-made texture's own
     canvas, so every surface already sharing that texture (the per-repeat clones too) changes at once. The photo lends its
     DETAIL; the hand-made texture's average colour is kept, so the island's vertex and instance colours still lead and nothing
     darkens. No photo, or a failed decode: the hand-made texture simply stays. */
  const photoState = {};
  /* 626: the dial. Standard = the photos at full strength; Classic = no photos (the island as hand-painted). Read once per load. */
  const CLASSIC_LOOK = (function () { try { return localStorage.getItem('wfr.look') === 'classic'; } catch (e) { return false; } })();
  const PHOTO_SIZE = 512, PHOTO_HUE = CLASSIC_LOOK ? 0.25 : 0.65, PHOTO_CONTRAST = CLASSIC_LOOK ? 0.85 : 1.0;   // how much of the photo's own colour survives; detail strength
  function photoFor(base) {
    if (CLASSIC_LOOK) return;   // 626: Classic keeps the hand-made textures untouched
    const P = window.WFR_PHOTOS; if (!P || !P.use || !P.files || photoState[base]) return;
    const key = P.use[base] ? base : (/^roof_clay_/.test(base) ? 'roofTiles' : null);   // the village houses' clay roofs (any colour) wear the clay-tile photo
    const src = key && P.files[P.use[key]]; if (!src) return;
    photoState[base] = 'loading';
    const img = new Image();
    img.onerror = function () { photoState[base] = 'failed'; };
    img.onload = function () {
      try {
        const c = canvases[base]; if (!c) { photoState[base] = 'failed'; return; }
        const old = ctx(c).getImageData(0, 0, c.width, c.height).data; let ar = 0, ag = 0, ab = 0; const n = old.length / 4;
        for (let p = 0; p < old.length; p += 4) { ar += old[p]; ag += old[p + 1]; ab += old[p + 2]; }
        ar /= n; ag /= n; ab /= n; const baseL = ar * 0.3 + ag * 0.59 + ab * 0.11;
        c.width = c.height = PHOTO_SIZE; const g = ctx(c); g.drawImage(img, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
        const im = g.getImageData(0, 0, PHOTO_SIZE, PHOTO_SIZE), d = im.data; let L = 0;
        for (let p = 0; p < d.length; p += 4) L += d[p] * 0.3 + d[p + 1] * 0.59 + d[p + 2] * 0.11;
        L = (L / (d.length / 4)) || 1; const k = baseL / L;
        for (let p = 0; p < d.length; p += 4) {
          const l = 1 + ((d[p] * 0.3 + d[p + 1] * 0.59 + d[p + 2] * 0.11) / L - 1) * PHOTO_CONTRAST;
          d[p] = ar * l * (1 - PHOTO_HUE) + d[p] * k * PHOTO_HUE;   // the data is clamped to 0..255 by the browser
          d[p + 1] = ag * l * (1 - PHOTO_HUE) + d[p + 1] * k * PHOTO_HUE;
          d[p + 2] = ab * l * (1 - PHOTO_HUE) + d[p + 2] * k * PHOTO_HUE;
        }
        g.putImageData(im, 0, 0);
        for (const t of Object.values(cache).concat(Object.values(shared))) if (t && t.image === c) t.needsUpdate = true;
        const bump = cache[base + 'Bump']; if (bump) { bump.image = bumpCanvas(c); bump.needsUpdate = true; }
        photoState[base] = 'photo';
      } catch (e) { photoState[base] = 'failed'; }
    };
    img.src = src;
  }

  /* bumpScale that reads well at game distance (r128 bump is screen-space: at heavy minification a big scale
     turns to glitter). opts.bump === true uses these; a number overrides. Grass on the 110× terrain: leave off. */
  const BUMP_SCALE = { grass: 0.03, bark: 0.08, stone: 0.06, roofTiles: 0.06, featherWing: 0.03 };
  const api = { names: Object.keys(painters).concat(Object.keys(ALIAS)), bumpNames: Object.keys(BUMP_SCALE), bumpScale: BUMP_SCALE, get: get, stats: stats };
  api.names.forEach(function (n) { api[n] = function (renderer) { return get(n, renderer); }; });
  api.bump = function (name, renderer) { return get(name + 'Bump', renderer); };
  api.photos = photoState;   // 578/618: which textures wear a photo (loading / photo / failed)
  api.count = function () {                         // distinct THREE.Textures alive (aliases share, so dedupe)
    const set = new Set(Object.values(cache).concat(Object.values(shared))); return set.size;
  };

  /* apply(mesh, name, rx, ry, renderer, opts): give the mesh (or each mesh in a group) the ONE texture for
     (name, repeat). opts.bump = true (recommended scale) or a number also sets material.bumpMap (Phong/Standard only). In r128 the bumpMap
     is read through the MAP's uv transform, so the single un-cloned '<name>Bump' texture serves every repeat. */
  /* ⚠ ONE TEXTURE PER (name, repeat), shared by every mesh that asks for it — Obito, Oct 8: a clone per mesh made
     three upload 540 textures where ~10 do (about 45 MB of a phone's graphics memory). */
  const shared = {};
  /* board 578: THE MEADOW, richer. The island's own vertex colours (painted by the html from H) are deepened here, once,
     when the grass is laid: greens a touch more saturated, hollows darker and cooler, crests warm and sunlit, slow
     patches of spring and late-summer green. Only the grass band (sand, rock and snow are left alone); no rnd(). */
  function dressGround(mesh) {
    try {
      const g = mesh.geometry, col = g && g.attributes.color, pos = g && g.attributes.position, W = 151;
      if (!col || !pos || pos.count !== W * W || mesh.userData.groundDressed) return;
      const c = new THREE.Color(), hsl = {};
      for (let i = 0; i < pos.count; i++) {
        const ix = i % W, iz = (i / W) | 0, x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (y < 2.6 || y > 24) continue;   // the grass band only
        c.fromArray(col.array, i * 3); c.getHSL(hsl);
        if (hsl.h < 0.14 || hsl.h > 0.42 || hsl.s < 0.18) continue;   // greens only (the worn village green and rock stay)
        const yn = (ix > 0 ? pos.getY(i - 1) : y) + (ix < W - 1 ? pos.getY(i + 1) : y) + (iz > 0 ? pos.getY(i - W) : y) + (iz < W - 1 ? pos.getY(i + W) : y);
        const cav = Math.max(-1, Math.min(1, (yn / 4 - y) * 1.4));   // + in a hollow, - on a crest
        const warm = 0.5 + 0.5 * Math.sin(x * 0.013 + 1.1) * Math.cos(z * 0.011 - 0.6), spring = 0.5 + 0.5 * Math.sin(x * 0.029 - z * 0.023 + 2.0);
        const h = hsl.h - 0.022 * warm * (cav < 0 ? 1 : 0.4) + 0.012 * (spring - 0.5) + 0.01 * Math.max(0, cav);
        const sat = Math.min(0.85, hsl.s * (1.12 + 0.1 * spring));
        const l = hsl.l - 0.045 * cav + 0.02 * (warm - 0.5);
        c.setHSL(h, sat, Math.max(0.12, Math.min(0.7, l)));
        col.array[i * 3] = c.r; col.array[i * 3 + 1] = c.g; col.array[i * 3 + 2] = c.b;
      }
      col.needsUpdate = true; mesh.userData.groundDressed = true;
    } catch (e) { api.groundDressed = { error: String(e && e.message || e) }; }
  }
  api.apply = function (mesh, name, repeatX, repeatY, renderer, opts) {
    const rx = repeatX || 1, ry = repeatY == null ? rx : repeatY, key = name + ':' + rx + ':' + ry;
    let t = shared[key];
    if (!t) { t = get(name, renderer).clone(); t.needsUpdate = true; t.repeat.set(rx, ry); shared[key] = t; }
    const bump = opts && opts.bump ? get(name + 'Bump', renderer) : null;
    if (name === 'grass' && mesh.userData && mesh.userData.ground && mesh.isMesh) dressGround(mesh);   // 578: the meadow, richer (the island only)
    (mesh.traverse ? mesh.traverse.bind(mesh) : function (f) { f(mesh); })(function (o) {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach(function (m) {
        m.map = t;
        if (bump && 'bumpMap' in m) { m.bumpMap = bump; m.bumpScale = opts.bump === true ? (BUMP_SCALE[name] || 0.05) : opts.bump; }
        m.needsUpdate = true;
      });
    });
    return t;
  };
  /* board 578 (Oct 10, "upgrade the texture pack to the best of your ability"): THE SEA, dressed. Deep teal far out,
     bright turquoise over the shallows, a pale ring of foam where it meets the shore - coloured by the depth H() already
     knows, at the sea's own vertices (no rnd(): every seed stays put). The ripples drift slowly and a fine bump catches
     the sun as glints. One mesh, one draw, no new light: the drift rides onBeforeRender (only while the sea is drawn). */
  api.dressSea = function (sea, H, water, renderer) {
    try {
      const T = THREE, N = 150, geo = new T.PlaneGeometry(1400, 1400, N, N);
      const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color();
      const FOAM = new T.Color(0xf2fbf7), SHAL = new T.Color(0x55d3cf), TURQ = new T.Color(0x38bfd0), MID = new T.Color(0x2596b8), DEEP = new T.Color(0x175f86);
      const sm = function (a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = -p.getY(i), r = Math.hypot(x, z);   // the plane lies rotated -90 deg about x: world z = -local y
        const d = r > 335 ? 5.2 : water - H(x, z);   // depth below the surface (beyond the island the bed is flat at -4)
        c.copy(FOAM).lerp(SHAL, sm(-0.25, 0.45, d));
        c.lerp(TURQ, sm(0.3, 1.8, d)); c.lerp(MID, sm(2.4, 6, d));
        c.lerp(DEEP, Math.max(sm(330, 620, r), 0.55 * sm(6, 10, d)));   // the open sea and the lake's deep go dark teal
        c.offsetHSL(0, 0, 0.025 * Math.sin(x * 0.045 + Math.cos(z * 0.031) * 1.7) * Math.cos(z * 0.04));   // soft swells of light
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new T.BufferAttribute(col, 3));
      if (sea.geometry) sea.geometry.dispose();
      sea.geometry = geo;
      const m = sea.material;
      m.color.set(0xffffff); m.vertexColors = true;
      if ('specular' in m) { m.specular.set(0xb4e2f2); m.shininess = 80; }
      if ('bumpMap' in m) { m.bumpMap = get('waterBump', renderer); m.bumpScale = 0.025; }   // read through the map's uv transform (r128): it drifts with it
      m.needsUpdate = true;
      const t = m.map, t0 = now();
      if (t) sea.onBeforeRender = function () {   // the drift: slow, two-way, never a jump
        const s = (now() - t0) / 1000;
        t.offset.set(s * 0.006 + Math.sin(s * 0.21) * 0.01, s * 0.004 + Math.cos(s * 0.17) * 0.01);
      };
      api.seaDressed = { verts: p.count };
      return true;
    } catch (e) { api.seaDressed = { error: String(e && e.message || e) }; return false; }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     board 578, PASS 2 (Oct 10; Marth: "Texture tf outta it" - "women like NICE things and NICE LOOKING things").
     THE VILLAGE: painted walls in three builds (half-timber, brick under plaster, limewashed fieldstone), clay tiles and
     slate shingles in the roof's own colour with soft moss and rain streaks, framed windows and painted doors whose
     glass glows warm at night (an emissiveMap on the lights the game already turns up; no new light).
     THE MOUNTAIN: rock with painted strata, moss in the low folds, snow at the peak with soft blue shade.
     THE SHORE: warm dry sand with a fine grain, darker wet sand along the water line. THE GREEN: worn paths.
     THE SKY: fluffy cumulus on the far ring and round soft drifting clouds; a softer ramp in the dome.
     Same rules as above: seeded (never the game's rnd()), periodic where it repeats, at most 512 px, painted once and
     shared. Nothing here moves a vertex of the island, or the place of any house, tree or cloud.
     ═══════════════════════════════════════════════════════════════════════════ */
  const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  const rgbaC = (r, g, b, a) => 'rgba(' + (clamp255(r) | 0) + ',' + (clamp255(g) | 0) + ',' + (clamp255(b) | 0) + ',' + a + ')';
  const hexRGB = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const segDist = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
  /* tileable fbm on a W x H canvas (fx x fy lattice cells, doubling per octave) */
  function fbmWH(W, H, rand, fx, fy, oct, gain) {
    const out = new Float32Array(W * H); gain = gain == null ? 0.5 : gain;
    let amp = 1, total = 0;
    const C0 = new Int32Array(W), C1 = new Int32Array(W), TX = new Float32Array(W);
    for (let o = 0; o < oct; o++) {
      const lx = fx << o, ly = fy << o, L = new Float32Array(lx * ly);
      for (let i = 0; i < L.length; i++) L[i] = rand() * amp;
      const sx = lx / W, sy = ly / H;
      for (let x = 0; x < W; x++) { const gx = x * sx, xi = gx | 0, t = gx - xi; C0[x] = xi % lx; C1[x] = (xi + 1) % lx; TX[x] = t * t * (3 - 2 * t); }
      for (let y = 0; y < H; y++) {
        const gy = y * sy, yi = gy | 0, t0 = gy - yi, ty = t0 * t0 * (3 - 2 * t0), r0 = (yi % ly) * lx, r1 = ((yi + 1) % ly) * lx, row = y * W;
        for (let x = 0; x < W; x++) {
          const c0 = C0[x], c1 = C1[x], tx = TX[x], a = L[r0 + c0] + (L[r0 + c1] - L[r0 + c0]) * tx, b = L[r1 + c0] + (L[r1 + c1] - L[r1 + c0]) * tx;
          out[row + x] += a + (b - a) * ty;
        }
      }
      total += amp; amp *= gain;
    }
    const inv = 1 / total; for (let i = 0; i < out.length; i++) out[i] *= inv;
    return out;
  }
  function pixWH(W, H, fn) {
    const c = canvas(W, H), g = ctx(c), img = g.createImageData(W, H), d = img.data, o = [0, 0, 0];
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) { fn(x, y, i, o); const p = i * 4; d[p] = o[0]; d[p + 1] = o[1]; d[p + 2] = o[2]; d[p + 3] = 255; }
    g.putImageData(img, 0, 0);
    return { c: c, g: g };
  }
  /* a rounded, slightly irregular stone, lit from above (the plinths and the cottage walls) */
  function stoneShape(g, x, y, w, h, col, jit) {
    const rr = Math.min(w, h) * 0.32;
    g.beginPath();
    g.moveTo(x + rr + jit[0], y + jit[1]); g.lineTo(x + w - rr + jit[2], y + jit[3]);
    g.quadraticCurveTo(x + w, y, x + w + jit[4] * 0.4, y + rr); g.lineTo(x + w + jit[5] * 0.4, y + h - rr);
    g.quadraticCurveTo(x + w, y + h, x + w - rr + jit[6], y + h); g.lineTo(x + rr + jit[7], y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - rr); g.lineTo(x, y + rr); g.quadraticCurveTo(x, y, x + rr + jit[0], y + jit[1]);
    g.closePath();
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, rgbaC(col[0] + 24, col[1] + 24, col[2] + 22, 1)); gr.addColorStop(0.3, rgbaC(col[0], col[1], col[2], 1)); gr.addColorStop(1, rgbaC(col[0] - 42, col[1] - 44, col[2] - 44, 1));
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(58,50,42,0.45)'; g.lineWidth = 1.2; g.stroke();
  }
  /* two courses of fieldstone along the foot of a wall, from row y0 to the bottom (tiles in x) */
  function plinth(g, W, Hh, y0, r) {
    g.fillStyle = 'rgb(150,142,128)'; g.fillRect(0, y0, W, Hh - y0);
    const rh = (Hh - y0) / 2;
    for (let row = 0; row < 2; row++) {
      const ry = y0 + row * rh; let x = -r() * 20; const x0 = x;
      while (x < x0 + W) {
        const w = Math.min(16 + r() * 24, x0 + W - x), v = 150 + r() * 56, warm = r(), jit = [];
        for (let k = 0; k < 8; k++) jit.push((r() - 0.5) * 3);
        const col = [v + warm * 16, v + warm * 6, v - 8 - warm * 10];
        if (w > 4) for (const ox of [-W, 0, W]) stoneShape(g, x + ox + 1.2, ry + 1, w - 2.4, rh - 2, col, jit);
        if (w < 0.5) break;
        x += w;
      }
    }
    g.fillStyle = 'rgba(40,32,24,0.5)'; g.fillRect(0, y0, W, 3);   // the shadow under the sole beam
  }
  const timberRGB = (L, o) => { o[0] = 104 * L; o[1] = 70 * L; o[2] = 46 * L; };
  /* the door's little arched window (the door and its glow share it, so the glow lands on the glass exactly) */
  const DWIN = { cx: 64, cy: 46, r: 27, bot: 76 };
  function archPath(g, inset) { const r = DWIN.r - inset; g.beginPath(); g.moveTo(DWIN.cx - r, DWIN.bot - inset); g.lineTo(DWIN.cx - r, DWIN.cy); g.arc(DWIN.cx, DWIN.cy, r, Math.PI, 0); g.lineTo(DWIN.cx + r, DWIN.bot - inset); g.closePath(); }
  function archBars(g) { g.fillRect(DWIN.cx - 2, DWIN.cy - DWIN.r, 4, DWIN.bot - DWIN.cy + DWIN.r); g.fillRect(DWIN.cx - DWIN.r, DWIN.cy + 6, DWIN.r * 2, 4); }
  /* the window's four panes [x, y, w, h] on its 128 px face: frame 13 px, mullion and transom between, a sill below */
  const WPANES = [[13, 11, 47, 45], [68, 11, 47, 45], [13, 62, 47, 45], [68, 62, 47, 45]];

  Object.assign(painters, {
    /* wallTimber: a half-timbered panel (u = one panel between two posts, v = the whole wall, eaves at the top):
       oak posts at both edges, a top plate, a rail under the windows, a sole beam on a fieldstone plinth, braces;
       near-white lime plaster between (the house's own wall colour tints it), the timbers standing proud with a
       soft shadow, eaves shade at the top and splash grime at the foot. 256 x 512. */
    wallTimber: function () {
      const W = 256, Hh = 512, r = rng(579001);
      const mot = stretch(fbmWH(W, Hh, r, 3, 6, 4)), fine = fbmWH(W, Hh, r, 64, 128, 1), grime = stretch(fbmWH(W, Hh, r, 4, 4, 3));
      const gV = stretch(fbmWH(W, Hh, r, 48, 3, 2)), gH = stretch(fbmWH(W, Hh, r, 3, 96, 2)), knot = stretch(fbmWH(W, Hh, r, 8, 16, 2));
      const P = 15, T0 = 4, T1 = 24, R0 = 290, R1 = 308, S0 = 446, S1 = 466;   // post half-width; top plate, rail and sole beam rows
      const tim = function (x, y) {   // 0 plaster, 1 post, 2 beam, 3 brace
        x = ((x % W) + W) % W; const m = Math.min(x, W - x);
        if (y < T0 || y >= S1) return 0;
        if (m < P) return 1;
        if (y < T1 || (y >= R0 && y < R1) || y >= S0) return 2;
        if (y > R1 && y < S0 && segDist(m, y, P - 2, S0, P + 58, R1) < 6.5) return 3;
        if (y > T1 && y < R0 && segDist(m, y, P - 2, T1 + 78, P + 46, T1) < 5.5) return 3;
        return 0;
      };
      const M = new Uint8Array(W * Hh);
      for (let y = T0, i = T0 * W; y < S1; y++) for (let x = 0; x < W; x++, i++) M[i] = tim(x, y);
      const T = (x, y) => (y < 0 || y >= Hh ? 0 : M[y * W + (((x % W) + W) % W)]);
      const out = pixWH(W, Hh, function (x, y, i, o) {
        if (y >= S1) { o[0] = o[1] = o[2] = 0; return; }
        const t = M[i];
        if (t) {
          const gr = t === 1 ? gV[i] : t === 2 ? gH[i] : (gV[i] + gH[i]) * 0.5;
          let L = 1 + (gr - 0.5) * 0.38 + (knot[i] - 0.5) * 0.12 + (fine[i] - 0.5) * 0.08;
          if (!T(x - 2, y - 2)) L += 0.18; else if (!T(x + 2, y + 2)) L -= 0.24;
          L *= 1 - 0.16 * smooth(0.55, 0.95, grime[i]);
          timberRGB(L, o); return;
        }
        let L = 242 + (mot[i] - 0.5) * 20 + (fine[i] - 0.5) * 9;
        if (T(x - 3, y - 4)) L -= 28; else if (T(x - 6, y - 7)) L -= 10;
        L -= 16 * smooth(320, 446, y) * grime[i];
        L -= 20 * (1 - smooth(T1, T1 + 30, y));
        o[0] = L; o[1] = L - 2; o[2] = L - 7;
      });
      plinth(out.g, W, Hh, S1, r);
      const g = out.g;
      for (const [px, py] of [[7, T0 + 10], [7, R0 + 9], [7, S0 + 10], [24, R0 + 14], [22, T1 + 4]]) for (const sx of [px, W - px]) {
        drawWrapped(W, Hh, sx, py, 4, function (qx, qy) { g.fillStyle = 'rgba(40,26,16,0.85)'; g.beginPath(); g.arc(qx, qy, 2.3, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,230,200,0.3)'; g.fillRect(qx - 1, qy - 2, 1.5, 1); });   // oak pegs at the joints
      }
      return out.c;
    },

    /* wallBrick: warm running-bond brick below, a timber band, lime plaster above with rain streaks, a damp line,
       and a few patches fallen away to show the brick beneath. 256 x 512, tiles in u. */
    wallBrick: function () {
      const W = 256, Hh = 512, r = rng(579002);
      const mot = stretch(fbmWH(W, Hh, r, 3, 6, 4)), fine = fbmWH(W, Hh, r, 64, 128, 1), grime = stretch(fbmWH(W, Hh, r, 4, 6, 3));
      const spall = stretch(fbmWH(W, Hh, r, 4, 8, 3, 0.6)), gH = stretch(fbmWH(W, Hh, r, 3, 96, 2)), streak = stretch(fbmWH(W, Hh, r, 24, 2, 2));
      const T0 = 4, T1 = 22, B0 = 254, B1 = 272, BW = 32, BH = 14, FOOT = 496;
      const tone = []; for (let k = 0; k < 40 * 8; k++) tone.push([r(), r()]);
      const brick = function (x, y, i, o) {
        const yy = y - B1, row = Math.floor(yy / BH), ly = yy - row * BH, off = (row & 1) ? BW / 2 : 0, xx = (((x + off) % W) + W) % W, cI = (xx / BW) | 0, lx = xx - cI * BW;
        if (ly >= BH - 3 || lx >= BW - 3) { const v = 194 + (fine[i] - 0.5) * 26 - (ly >= BH - 3 && ly < BH - 1 && lx < BW - 3 ? 32 : 0); o[0] = v; o[1] = v - 6; o[2] = v - 16; return; }   // mortar, shaded under each brick
        const tt = tone[(((row % 40) + 40) % 40) * 8 + cI], q = tt[0];
        let R = 172, G = 88, B = 62;
        if (q < 0.16) { R = 126; G = 64; B = 54; } else if (q > 0.92) { R = 198; G = 146; B = 108; } else if (q > 0.72) { R = 190; G = 104; B = 66; } else if (q > 0.6) { R = 158; G = 92; B = 74; }
        let k = 0.88 + tt[1] * 0.22 + (fine[i] - 0.5) * 0.16 + (mot[i] - 0.5) * 0.08;
        if (ly < 1) k += 0.1; if (lx >= BW - 4) k -= 0.08; if (ly >= BH - 4) k -= 0.06;
        o[0] = R * k; o[1] = G * k; o[2] = B * k;
      };
      return pixWH(W, Hh, function (x, y, i, o) {
        if ((y >= T0 && y < T1) || (y >= B0 && y < B1)) {
          const top = y >= B0 ? B0 : T0, bot = y >= B0 ? B1 : T1;
          let L = 1 + (gH[i] - 0.5) * 0.38 + (fine[i] - 0.5) * 0.08; if (y < top + 2) L += 0.18; else if (y >= bot - 2) L -= 0.26;
          timberRGB(L, o); return;
        }
        if (y >= B1) {
          brick(x, y, i, o);
          const k = 1 - 0.24 * smooth(FOOT - 40, Hh, y) * (0.6 + 0.4 * grime[i]) - (y < B1 + 4 ? 0.22 : 0);
          o[0] *= k; o[1] *= k; o[2] *= k; return;
        }
        const sp = spall[i] * (0.78 + 0.22 * smooth(T1, B0, y));
        if (sp > 0.8) { brick(x, y, i, o); const k = sp < 0.83 ? 0.7 : 0.92; o[0] *= k; o[1] *= k; o[2] *= k; return; }   // the brick under a fallen patch, shadowed at its edge
        let L = 242 + (mot[i] - 0.5) * 20 + (fine[i] - 0.5) * 9;
        if (sp > 0.77) L += 7;   // the broken plaster edge
        L -= 16 * smooth(0.72, 0.95, streak[i]) * (1 - smooth(T1, T1 + 170, y));
        L -= 12 * smooth(B0 - 50, B0, y) * (0.4 + 0.6 * grime[i]);
        L -= 20 * (1 - smooth(T1, T1 + 28, y));
        if (y >= T1 && y < T1 + 4) L -= 22;
        o[0] = L; o[1] = L - 2; o[2] = L - 7;
      }).c;
    },

    /* wallStone: a cottage of coursed fieldstone - warm greys, ochres, a few dark stones - under an old limewash
       worn thin toward the foot, moss creeping up from the ground, a timber plate under the eaves. 256 x 512. */
    wallStone: function () {
      const W = 256, Hh = 512, c = canvas(W, Hh), g = ctx(c), r = rng(579003);
      g.fillStyle = 'rgb(204,196,180)'; g.fillRect(0, 0, W, Hh);
      let y = 20;
      while (y < Hh) {
        const rh = 15 + r() * 13 + (y > Hh - 70 ? 6 : 0);
        let x = -r() * 30; const x0 = x;
        while (x < x0 + W) {
          const w = Math.min(rh * (1.0 + r() * 1.7), x0 + W - x), q = r(), v = 184 + r() * 46, jit = [];
          for (let k = 0; k < 8; k++) jit.push((r() - 0.5) * 4);
          const col = q < 0.5 ? [v + 22, v + 12, v - 14] : q < 0.64 ? [v - 2, v - 1, v + 2] : q < 0.7 ? [v - 28, v - 31, v - 34] : [v + 14, v + 9, v - 4];
          if (w > 4) for (const ox of [-W, 0, W]) stoneShape(g, x + ox + 1.5, y + 1.5, w - 3, rh - 3, col, jit);
          if (w < 0.5) break;
          x += w;
        }
        y += rh;
      }
      const mot = stretch(fbmWH(W, Hh, r, 4, 8, 4)), fine = fbmWH(W, Hh, r, 64, 128, 1), wash = stretch(fbmWH(W, Hh, r, 3, 6, 3)), gH = stretch(fbmWH(W, Hh, r, 3, 96, 2)), moss = stretch(fbmWH(W, Hh, r, 8, 4, 3));
      const img = g.getImageData(0, 0, W, Hh), dd = img.data, o = [0, 0, 0];
      for (let yy = 0, i = 0; yy < Hh; yy++) for (let x = 0; x < W; x++, i++) {
        const p = i * 4;
        if (yy >= 3 && yy < 20) { let L = 1 + (gH[i] - 0.5) * 0.38 + (fine[i] - 0.5) * 0.08; if (yy < 5) L += 0.18; else if (yy >= 18) L -= 0.26; timberRGB(L, o); dd[p] = o[0]; dd[p + 1] = o[1]; dd[p + 2] = o[2]; continue; }
        let R = dd[p], G = dd[p + 1], B = dd[p + 2];
        const k = 1 + (mot[i] - 0.5) * 0.16 + (fine[i] - 0.5) * 0.1; R *= k; G *= k; B *= k;
        const wsh = 0.16 + 0.22 * smooth(0.45, 0.8, wash[i]) * (1 - yy / Hh);
        R += (246 - R) * wsh; G += (244 - G) * wsh; B += (236 - B) * wsh;
        const ms = smooth(0.55, 0.85, moss[i]) * smooth(Hh - 90, Hh, yy);
        R += (92 - R) * ms * 0.6; G += (118 - G) * ms * 0.6; B += (60 - B) * ms * 0.6;
        const ao = 1 - 0.2 * (1 - smooth(20, 48, yy)) - (yy < 24 ? 0.12 : 0);
        dd[p] = R * ao; dd[p + 1] = G * ao; dd[p + 2] = B * ao;
      }
      g.putImageData(img, 0, 0);
      return c;
    },

    /* houseWindow: a painted frame, a mullion and transom, four panes of glass with the sky in them and a soft
       reflection, the frame's shadow on the glass, a lit sill. White-based: the material goes white for it. 128 px. */
    houseWindow: function () {
      const S = 128, c = canvas(S), g = ctx(c), r = rng(579020);
      g.fillStyle = 'rgb(238,231,214)'; g.fillRect(0, 0, S, S);
      for (const [x, y, w, h] of WPANES) {
        const gl = g.createLinearGradient(x, y, x + w * 0.4, y + h);
        gl.addColorStop(0, 'rgb(204,231,245)'); gl.addColorStop(0.55, 'rgb(128,170,204)'); gl.addColorStop(1, 'rgb(80,118,152)');
        g.fillStyle = gl; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,0.26)'; g.beginPath(); g.moveTo(x + w * 0.12, y + h); g.lineTo(x + w * 0.42, y + h); g.lineTo(x + w * 0.86, y); g.lineTo(x + w * 0.56, y); g.closePath(); g.fill();
        g.fillStyle = 'rgba(36,46,58,0.38)'; g.fillRect(x, y, w, 3); g.fillRect(x, y, 3, h);
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x, y + h, w, 1.5);
      }
      g.fillStyle = 'rgb(250,246,236)'; g.fillRect(3, 109, S - 6, 4);
      g.fillStyle = 'rgba(70,60,50,0.35)'; g.fillRect(3, 121, S - 6, 7);
      g.strokeStyle = 'rgba(90,80,70,0.5)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, S - 3, S - 3);
      modulate(g, S, stretch(fbm(S, r, 4, 4, 3)), 0.08, r, 6);
      return c;
    },
    /* houseWindowGlow: the emissiveMap - lamp-lit panes (brighter low and in the middle), curtains drawn back at the
       sides, the frame dark. The game's night ramp sets the colour (WINDOW_MATS). 128 px. */
    houseWindowGlow: function () {
      const S = 128, c = canvas(S), g = ctx(c);
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      for (const [x, y, w, h] of WPANES) {
        const gl = g.createRadialGradient(64, 98, 6, 64, 70, 84); gl.addColorStop(0, '#ffffff'); gl.addColorStop(1, 'rgb(150,150,150)');
        g.fillStyle = gl; g.fillRect(x, y, w, h);
      }
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(13, 11, 9, 96); g.fillRect(106, 11, 9, 96);
      return c;
    },
    houseDoorGlow: function () {
      const W = 128, Hh = 256, c = canvas(W, Hh), g = ctx(c);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh);
      const gl = g.createRadialGradient(DWIN.cx, DWIN.bot - 6, 4, DWIN.cx, DWIN.cy, DWIN.r + 8); gl.addColorStop(0, '#ffffff'); gl.addColorStop(1, 'rgb(170,170,170)');
      g.fillStyle = gl; archPath(g, 3); g.fill();
      g.fillStyle = '#000'; archBars(g);
      return c;
    },

    /* groundDetail: three grey detail fields in one texture, read by the island's shader as masks -
       R rock (grain, cracks, pale lichen), G sand (wind ripples, grains, specks), B dirt (lumps and pebbles). 256 px. */
    groundDetail: function () {
      const S = 256, r = rng(579050);
      const rn = stretch(fbm(S, r, 4, 4, 4, 0.55)), cr = fbm(S, r, 8, 8, 3, 0.6), cr2 = fbm(S, r, 16, 16, 2, 0.6), lich = stretch(fbm(S, r, 12, 12, 2));
      const warp = fbm(S, r, 2, 3, 2), sl = fbm(S, r, 4, 4, 2), sf = fbm(S, r, 64, 64, 1), dl = stretch(fbm(S, r, 8, 8, 3)), peb = fbm(S, r, 32, 32, 1);
      return pixels(S, function (x, y, i, o) {
        const ridge = 1 - Math.abs(cr[i] - 0.5) * 2, ridge2 = 1 - Math.abs(cr2[i] - 0.5) * 2;
        o[0] = clamp255(150 + (rn[i] - 0.5) * 130 - 34 * smooth(0.88, 0.99, ridge) - 16 * smooth(0.9, 0.99, ridge2) + 30 * smooth(0.82, 0.95, lich[i]) + (r() - 0.5) * 26);
        const s = fract(y / S * 7 + x / S * 2 + (warp[i] - 0.5) * 2.2), rip = s < 0.7 ? s / 0.7 : (1 - s) / 0.3, q = r();
        o[1] = clamp255(150 + rip * 30 + (sl[i] - 0.5) * 40 + (sf[i] - 0.5) * 30 + (q < 0.04 ? 60 : q > 0.97 ? -70 : (r() - 0.5) * 30));
        o[2] = clamp255(150 + (dl[i] - 0.5) * 90 + 50 * smooth(0.62, 0.72, peb[i]) + (r() - 0.5) * 26);
      }).c;
    }
  });

  /* the roofs, painted IN the roof's colour (so moss can be green on a red roof): 'clay' barrel tiles or 'slate'
     shingles; rows run along the eave (canvas bottom = eave, top = ridge; u tiles, v is one face). 256 px. */
  function tint(base, k, h) { return [base[0] * k * (1 + h), base[1] * k * (1 + h * 0.15), base[2] * k * (1 - h * 0.6)]; }
  function paintClay(g, S, base, r) {
    const rows = 11, cols = 8, th = S / rows, tw = S / cols;
    g.fillStyle = rgbaC(base[0] * 0.42, base[1] * 0.42, base[2] * 0.42, 1); g.fillRect(0, 0, S, S);
    const tone = []; for (let k = 0; k < rows * cols; k++) { const q = r(); tone.push([0.84 + r() * 0.26 - (q < 0.06 ? 0.2 : 0), (r() - 0.5) * 0.22, (r() - 0.5) * 2.4]); }
    for (let j = 0; j < rows; j++) {
      const yb = S - j * th, yt = yb - th * 1.4;
      for (let i = -1; i <= cols; i++) {
        const ii = ((i % cols) + cols) % cols, t = tone[j * cols + ii], x = i * tw + (j % 2 ? tw / 2 : 0) + t[2] * 0.4, col = tint(base, t[0], t[1]);
        g.fillStyle = 'rgba(30,18,12,0.38)'; g.beginPath(); g.ellipse(x + tw / 2, yb + 2, tw * 0.46, 5, 0, 0, TAU); g.fill();
        const gr = g.createLinearGradient(x, 0, x + tw, 0);
        gr.addColorStop(0, rgbaC(col[0] * 0.62, col[1] * 0.62, col[2] * 0.62, 1)); gr.addColorStop(0.32, rgbaC(col[0], col[1], col[2], 1));
        gr.addColorStop(0.46, rgbaC(col[0] * 1.12 + 10, col[1] * 1.12 + 10, col[2] * 1.12 + 10, 1)); gr.addColorStop(0.7, rgbaC(col[0] * 0.92, col[1] * 0.92, col[2] * 0.92, 1)); gr.addColorStop(1, rgbaC(col[0] * 0.55, col[1] * 0.55, col[2] * 0.55, 1));
        g.fillStyle = gr; g.beginPath();
        g.moveTo(x + 1, yt); g.lineTo(x + tw - 1, yt); g.lineTo(x + tw - 1, yb - 5); g.quadraticCurveTo(x + tw / 2, yb + 3, x + 1, yb - 5); g.closePath(); g.fill();
        const vg = g.createLinearGradient(0, yt, 0, yb);
        vg.addColorStop(0, 'rgba(20,10,5,0.5)'); vg.addColorStop(0.5, 'rgba(20,10,5,0)'); vg.addColorStop(0.9, 'rgba(255,240,220,0)'); vg.addColorStop(1, 'rgba(255,240,220,0.22)');
        g.fillStyle = vg; g.fill();
      }
    }
  }
  function paintSlate(g, S, base, r) {
    const rows = 12, th = S / rows;
    g.fillStyle = rgbaC(base[0] * 0.35, base[1] * 0.35, base[2] * 0.35, 1); g.fillRect(0, 0, S, S);
    for (let j = 0; j < rows; j++) {
      const yb = S - j * th, yt = yb - th * 1.5, ws = []; let sum = 0;
      while (sum < S - 18) { const w = 20 + r() * 18; ws.push(w); sum += w; }
      const kw = S / sum; let x = r() * 20;
      for (let n = 0; n < ws.length; n++) {
        const w = ws[n] * kw, q = r(), kk = 0.8 + r() * 0.3 + (q > 0.94 ? 0.18 : 0) - (q < 0.05 ? 0.16 : 0), hh = (r() - 0.5) * 0.16, dy = (r() - 0.5) * 2.5, col = tint(base, kk, hh);
        for (const ox of [-S, 0, S]) {
          const X = x + ox; if (X > S + 2 || X + w < -2) continue;
          g.fillStyle = 'rgba(10,10,20,0.4)'; g.fillRect(X + 1, yb + dy - 1, w - 1, 4);
          const gr = g.createLinearGradient(0, yt, 0, yb + dy);
          gr.addColorStop(0, rgbaC(col[0] * 0.7, col[1] * 0.7, col[2] * 0.7, 1)); gr.addColorStop(0.6, rgbaC(col[0], col[1], col[2], 1)); gr.addColorStop(1, rgbaC(col[0] * 1.08, col[1] * 1.08, col[2] * 1.08, 1));
          g.fillStyle = gr;
          const rr = 3.5, B = yb + dy; g.beginPath(); g.moveTo(X + 1, yt); g.lineTo(X + w - 1, yt); g.lineTo(X + w - 1, B - rr); g.quadraticCurveTo(X + w - 1, B, X + w - 1 - rr, B); g.lineTo(X + 1 + rr, B); g.quadraticCurveTo(X + 1, B, X + 1, B - rr); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(X + 2, B - 2, w - 4, 1.2);
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + w - 1.5, yt, 1, B - yt);
        }
        x += w;
      }
    }
  }
  function weatherRoof(g, S, base, r) {   // soft moss in the lower courses, lichen, a sun-faded ridge end, rain streaks, ridge cap, drip edge
    const moss = stretch(fbm(S, r, 6, 6, 3)), lich = fbm(S, r, 32, 32, 1), fade = fbm(S, r, 3, 3, 2), fine = fbm(S, r, 64, 64, 1);
    const img = g.getImageData(0, 0, S, S), d = img.data;
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const p = i * 4; let R = d[p], G = d[p + 1], B = d[p + 2];
      const low = smooth(S * 0.45, S, y), m = smooth(0.6, 0.82, moss[i] * (0.55 + 0.45 * low) + (fine[i] - 0.5) * 0.12);
      R += (86 - R) * m * 0.78; G += (116 - G) * m * 0.78; B += (54 - B) * m * 0.78;
      const li = lich[i] > 0.83 ? smooth(0.83, 0.9, lich[i]) * (0.4 + 0.6 * low) : 0;
      R += (214 - R) * li * 0.5; G += (210 - G) * li * 0.5; B += (160 - B) * li * 0.5;
      const sun = (1 - smooth(0, S * 0.5, y)) * 0.12 * (0.6 + 0.4 * fade[i]), L = (R + G + B) / 3 + 18;
      R += (L - R) * sun; G += (L - G) * sun; B += (L - B) * sun;
      const k = 1 + (fine[i] - 0.5) * 0.08; d[p] = R * k; d[p + 1] = G * k; d[p + 2] = B * k;
    }
    g.putImageData(img, 0, 0);
    for (let n = 0; n < 14; n++) {
      const x = r() * S, y0 = r() * S * 0.5, len = 40 + r() * 120, w = 2 + r() * 4;
      for (const ox of [-S, 0, S]) { const gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, 'rgba(20,16,12,0)'); gr.addColorStop(0.3, 'rgba(20,16,12,0.14)'); gr.addColorStop(1, 'rgba(20,16,12,0)'); g.fillStyle = gr; g.fillRect(x + ox, y0, w, len); }
    }
    const rg = g.createLinearGradient(0, 0, 0, 10);
    rg.addColorStop(0, rgbaC(base[0] * 0.55, base[1] * 0.55, base[2] * 0.55, 1)); rg.addColorStop(0.5, rgbaC(base[0] * 0.95, base[1] * 0.95, base[2] * 0.95, 1)); rg.addColorStop(1, rgbaC(base[0] * 0.5, base[1] * 0.5, base[2] * 0.5, 1));
    g.fillStyle = rg; g.fillRect(0, 0, S, 10);
    g.fillStyle = 'rgba(25,18,12,0.5)'; g.fillRect(0, S - 3, S, 3);
  }
  function roofPainter(kind, hex) {
    return function () {
      const S = 256, c = canvas(S), g = ctx(c), r = rng((kind === 'slate' ? 579400 : 579300) + (hex % 997)), base = hexRGB(hex);
      if (kind === 'slate') paintSlate(g, S, base, r); else paintClay(g, S, base, r);
      weatherRoof(g, S, base, r);
      return c;
    };
  }
  /* a painted plank door in its own colour: four boards, two ledges, iron strap hinges, a brass knob, an arched
     window up top (houseDoorGlow lights it at night), paint worn to bare wood low down. 128 x 256. */
  function doorPainter(hex) {
    return function () {
      const W = 128, Hh = 256, r = rng(579010 + (hex % 4093)), base = hexRGB(hex);
      const gV = stretch(fbmWH(W, Hh, r, 40, 3, 2)), fine = fbmWH(W, Hh, r, 64, 128, 1), wear = stretch(fbmWH(W, Hh, r, 4, 8, 3));
      const tones = [0.93 + r() * 0.14, 0.93 + r() * 0.14, 0.93 + r() * 0.14, 0.93 + r() * 0.14];
      const P = pixWH(W, Hh, function (x, y, i, o) {
        const pl = (x / 32) | 0, lx = x - pl * 32;
        let k = tones[pl] * (1 + (gV[i] - 0.5) * 0.32 + (fine[i] - 0.5) * 0.06);
        if (x > 2 && lx < 2) k *= 0.5; else if (x > 2 && lx < 3) k *= 1.14;
        const bare = smooth(0.8, 0.97, wear[i]) * (0.25 + 0.5 * smooth(170, 256, y));
        const R = base[0] + (150 - base[0]) * bare, G = base[1] + (108 - base[1]) * bare, B = base[2] + (72 - base[2]) * bare;
        if (x < 6 || x >= W - 6 || y < 6) k *= 0.7;
        o[0] = R * k; o[1] = G * k; o[2] = B * k;
      }), g = P.g;
      for (const ly of [100, 210]) {
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(5, ly + 13, W - 10, 4);
        const gr = g.createLinearGradient(0, ly, 0, ly + 13); gr.addColorStop(0, rgbaC(base[0] * 1.18, base[1] * 1.18, base[2] * 1.18, 1)); gr.addColorStop(1, rgbaC(base[0] * 0.78, base[1] * 0.78, base[2] * 0.78, 1));
        g.fillStyle = gr; g.fillRect(5, ly, W - 10, 13);
      }
      g.fillStyle = rgbaC(base[0] * 0.62, base[1] * 0.62, base[2] * 0.62, 1); archPath(g, -3); g.fill();
      const gl = g.createLinearGradient(0, DWIN.cy - DWIN.r, 0, DWIN.bot); gl.addColorStop(0, 'rgb(200,228,243)'); gl.addColorStop(1, 'rgb(88,128,160)');
      g.fillStyle = gl; archPath(g, 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.moveTo(DWIN.cx - 14, DWIN.bot - 3); g.lineTo(DWIN.cx - 4, DWIN.bot - 3); g.lineTo(DWIN.cx + 14, DWIN.cy - 18); g.lineTo(DWIN.cx + 4, DWIN.cy - 20); g.closePath(); g.fill();
      g.fillStyle = rgbaC(base[0] * 0.62, base[1] * 0.62, base[2] * 0.62, 1); archBars(g);
      for (const ly of [103, 213]) {
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(4, ly + 3, 68, 8);
        g.fillStyle = 'rgb(46,42,40)'; g.beginPath(); g.moveTo(3, ly); g.lineTo(64, ly + 1); g.arc(66, ly + 4, 4, -Math.PI / 2, Math.PI / 2); g.lineTo(3, ly + 7); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(4, ly + 0.5, 58, 1);
        for (const rx of [12, 32, 52]) { g.fillStyle = 'rgb(24,22,20)'; g.beginPath(); g.arc(rx, ly + 3.5, 1.6, 0, TAU); g.fill(); }
      }
      g.fillStyle = 'rgb(56,48,42)'; g.fillRect(100, 134, 12, 32);
      const kg = g.createRadialGradient(104, 146, 1, 106, 148, 7); kg.addColorStop(0, 'rgb(255,238,168)'); kg.addColorStop(0.5, 'rgb(214,170,74)'); kg.addColorStop(1, 'rgb(118,84,30)');
      g.fillStyle = kg; g.beginPath(); g.arc(106, 148, 6.5, 0, TAU); g.fill();
      g.fillStyle = 'rgb(20,16,14)'; g.fillRect(105, 158, 2, 5);
      return P.c;
    };
  }

  /* house textures: shared once per name, tiled in u, clamped in v (each wall and roof face is ONE v span) */
  const CLAMPED = new Set();
  function houseTex(name, renderer, painter) {
    if (!painters[name] && painter) painters[name] = painter;
    const t = get(name, renderer);
    if (!CLAMPED.has(t)) { t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; CLAMPED.add(t); }
    return t;
  }
  /* wall UVs in panels: u counts panels across each wall from its corner (an odd number, so a post never stands
     over the door or a window), v runs from the ground (0) to the eaves (1). Each wall box has its own geometry. */
  function wallUV(m, o, nW, nD) {
    const geo = m.geometry, p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    const px = m.position.x, py = m.position.y, pz = m.position.z, pw = o.w / nW, pd = o.d / nD;
    for (let k = 0; k < p.count; k++) {
      const X = p.getX(k) + px, Y = p.getY(k) + py, Z = p.getZ(k) + pz, nx = n.getX(k), ny = n.getY(k), nz = n.getZ(k);
      let u;
      if (Math.abs(nz) > 0.5) u = ((nz > 0 ? X : -X) + o.w / 2) / pw;
      else if (Math.abs(nx) > 0.5) u = ((nx > 0 ? -Z : Z) + o.d / 2) / pd;
      else u = (X + o.w / 2) / pw;
      uv.setXY(k, u, ny > 0.5 ? 0.985 : Math.max(0.002, Math.min(0.998, Y / o.ht)));
    }
    uv.needsUpdate = true;
  }
  /* the roof: un-indexed so each of its four faces is flat-lit and has its own planar UV - u along the eave
     (2.4 units a tile), v from the eave (0) to the ridge point (1). Same vertices, same place. */
  function dressRoof(m, tex, i) {
    const T = THREE, src = m.geometry, geo = src.index ? src.toNonIndexed() : src.clone(), p = geo.attributes.position, uv = geo.attributes.uv;
    const H2 = src.parameters && src.parameters.height ? src.parameters.height / 2 : 1.3, U = 2.4;
    const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3(), nrm = new T.Vector3(), right = new T.Vector3(), mid = new T.Vector3(), q = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    for (let t = 0; t + 2 < p.count; t += 3) {
      a.fromBufferAttribute(p, t); b.fromBufferAttribute(p, t + 1); c.fromBufferAttribute(p, t + 2);
      nrm.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
      if (nrm.lengthSq() < 1e-10) continue;
      nrm.normalize();
      const low = [a, b, c].filter((v) => v.y < 0);
      if (Math.abs(nrm.y) > 0.98 || low.length !== 2) { for (let k = 0; k < 3; k++) { q.fromBufferAttribute(p, t + k); uv.setXY(t + k, q.x / U, q.z / U); } continue; }
      mid.addVectors(low[0], low[1]).multiplyScalar(0.5);
      right.set(-nrm.x, 0, -nrm.z).normalize().cross(up);
      for (let k = 0; k < 3; k++) { q.fromBufferAttribute(p, t + k); uv.setXY(t + k, q.clone().sub(mid).dot(right) / U + 0.5, Math.max(0, Math.min(1, (q.y + H2) / (2 * H2)))); }
    }
    uv.needsUpdate = true; geo.computeVertexNormals();
    m.geometry = geo; src.dispose();
    const mat = m.material, k = 0.92 + 0.08 * fract(Math.sin((i + 1) * 12.9898) * 43758.5453);
    mat.color.setRGB(k, k, k); mat.map = tex; mat.needsUpdate = true;   // the colour is in the paint now; a gentle shade apart per house
  }
  const WALLS = ['wallTimber', 'wallBrick', 'wallStone'], DOORS = [0x8e3b2f, 0x3f6b4a, 0x2f5277, 0x9a6a3c];
  /* dressHouse(g, { i, w, d, ht, wall, roof, roofHex, door, glow, renderer }) - called once per village house as it is
     built, before it is scaled and placed. glow: the array whose emissive the night ramp turns up (WINDOW_MATS): the
     door's glass joins it (the windows are in it already). */
  api.dressHouse = function (g, o) {
    const t0 = now();
    try {
      const R = o.renderer, i = o.i | 0, panels = (len) => Math.max(1, 2 * Math.round((len / 1.9 - 1) / 2) + 1);
      const nW = panels(o.w), nD = panels(o.d), wallT = houseTex(WALLS[i % 3], R);
      const winT = houseTex('houseWindow', R), winG = houseTex('houseWindowGlow', R), doorG = houseTex('houseDoorGlow', R);
      const rk = (o.roofHex === 0x3f6e8c || o.roofHex === 0x8a5a9c) ? 'slate' : 'clay', rName = 'roof_' + rk + '_' + o.roofHex.toString(16);
      const roofT = houseTex(rName, R, roofPainter(rk, o.roofHex));
      const dc = DOORS[(i + ((i / 4) | 0)) % 4], doorT = houseTex('houseDoor_' + dc.toString(16), R, doorPainter(dc));
      let walls = 0, wins = 0;
      g.traverse(function (m) {
        if (!m.isMesh || !m.material || !m.material.color) return;
        const mat = m.material, hx = mat.color.getHex(), isBox = m.geometry && m.geometry.type === 'BoxGeometry';
        if (m === o.roof) { dressRoof(m, roofT, i); return; }
        if (m === o.door) { mat.color.setRGB(1, 1, 1); mat.map = doorT; if ('emissiveMap' in mat) { mat.emissiveMap = doorG; if (o.glow) o.glow.push(mat); } mat.needsUpdate = true; return; }
        if (isBox && hx === o.wall) { wallUV(m, o, nW, nD); mat.map = wallT; mat.needsUpdate = true; walls++; return; }
        if (isBox && hx === 0x9fd3f0) { mat.color.setRGB(1, 1, 1); mat.map = winT; if ('emissiveMap' in mat) mat.emissiveMap = winG; mat.needsUpdate = true; wins++; }
      });
      const s = api.housesDressed || (api.housesDressed = { houses: 0, walls: 0, windows: 0, ms: 0 }); s.houses++; s.walls += walls; s.windows += wins; s.ms = Math.round((s.ms + now() - t0) * 10) / 10;
      return true;
    } catch (e) { api.housesDressed = { error: String(e && e.message || e) }; return false; }
  };

  /* THE ISLAND, pass 2: vertex colours for the shore (warm dry sand, darker wet sand), the rock (warm and cool, darker
     in the folds, pale on the crests, moss in the low folds) and the snow (white, soft blue where the sun seldom
     reaches); a per-vertex surface weight (rock, sand, snow, steepness) for the shader, which swaps the grass grain for
     rock, sand or snow grain, paints thin strata by height in the rock, darkens the sand at the water line, and wears
     paths into the village green - one spoke from the well to every door. No height is touched; no rnd(). */
  const GROUND_MAP = [
    '#ifdef USE_MAP',
    '  vec4 texelColor = texture2D( map, vUv );',
    '  texelColor = mapTexelToLinear( texelColor );',
    '#endif'].join('\n');
  const GROUND_FRAG = [
    '#ifdef USE_MAP',
    '{',
    '  vec4 d1 = texture2D( wfrDetail, vUv * 0.41 );',
    '  vec4 d2 = texture2D( wfrDetail, vUv * 0.093 + vec2( 0.37, 0.71 ) );',
    '  float nz = d2.r - 0.5;',
    '  float wSnow = smoothstep( 0.36, 0.64, vWfrSurf.z + nz * 0.55 + ( d1.r - 0.5 ) * 0.25 );',
    '  float wRock = smoothstep( 0.3, 0.7, vWfrSurf.x + nz * 0.8 + ( d1.r - 0.5 ) * 0.3 ) * ( 1.0 - wSnow );',
    '  float wSand = smoothstep( 0.43, 0.57, vWfrSurf.y + ( d1.b - 0.55 ) * 0.12 + nz * 0.3 ) * ( 1.0 - wRock ) * ( 1.0 - wSnow );',
    '  vec3 tSand = vec3( 0.88 + ( d1.g - 0.55 ) * 0.4 );',
    '  vec3 tRock = vec3( 0.66 + d1.r * 0.44 ) * ( 0.9 + d2.r * 0.2 );',
    '  vec3 tSnow = vec3( 0.97 + ( d1.r - 0.55 ) * 0.12 );',
    '  vec3 tex3 = mix( texelColor.rgb, tRock, wRock );',
    '  tex3 = mix( tex3, tSnow, wSnow );',
    '  vec3 col = diffuseColor.rgb * tex3;',
    '  vec3 sandCol = vec3( 0.76, 0.64, 0.44 ) * ( 0.93 + d2.g * 0.12 ) * tSand;',
    '  col = mix( col, sandCol, wSand );',
    '  float st = sin( vWfrPos.y * 1.25 + nz * 5.0 + ( d1.r - 0.5 ) * 1.4 );',
    '  float st2 = sin( vWfrPos.y * 3.3 + d2.g * 4.0 );',
    '  vec3 band = mix( vec3( 1.1, 1.02, 0.9 ), vec3( 0.84, 0.88, 0.98 ), 0.5 + 0.5 * st ) * ( 0.94 + 0.06 * st2 );',
    '  col *= mix( vec3( 1.0 ), band, wRock * clamp( vWfrSurf.w * 1.4, 0.25, 1.0 ) );',
    '  float wet = ( 1.0 - smoothstep( wfrWater + 0.05, wfrWater + 0.85, vWfrPos.y ) ) * wSand;',
    '  col *= mix( vec3( 1.0 ), vec3( 0.72, 0.69, 0.64 ), wet ) * ( 1.0 - 0.28 * smoothstep( 0.5, 3.0, wfrWater - vWfrPos.y ) );',
    '  vec2 vp = vWfrPos.xz - wfrVil.xy;',
    '  float rr = length( vp );',
    '  if ( wfrVilOn > 0.5 && rr < 48.0 ) {',
    '    float an = atan( vp.y, vp.x );',
    '    float wob = ( d1.b - 0.55 ) * 0.8 + sin( rr * 0.31 + an * 3.0 ) * 0.25;',
    '    float k = floor( an / 0.5235988 + 0.5 );',
    '    float rEnd = mod( k, 2.0 ) < 0.5 ? wfrVil.z : wfrVil.w;',
    '    float laneR = 29.0 + sin( an * 2.0 + 0.7 ) * 2.2 + sin( an * 5.0 + 1.3 ) * 0.8;',
    '    float spur = ( 1.0 - smoothstep( 0.5, 0.95, abs( sin( an - k * 0.5235988 ) ) * rr + wob * ( 1.0 - 0.85 * smoothstep( rEnd - 7.0, rEnd - 1.5, rr ) ) ) ) * smoothstep( laneR - 1.5, laneR + 0.5, rr ) * ( 1.0 - smoothstep( rEnd - 1.0, rEnd + 0.4, rr ) );',
    '    float inner = smoothstep( 5.0, 7.5, rr ) * ( 1.0 - smoothstep( laneR - 0.5, laneR + 1.0, rr ) );',
    '    float a1 = an - 0.5236 - sin( rr * 0.09 ) * 0.14;',
    '    float a2 = an - 2.618 - sin( rr * 0.08 + 1.0 ) * 0.14;',
    '    float a3 = an - 4.1888 - sin( rr * 0.1 + 2.0 ) * 0.14;',
    '    float spoke = ( 1.0 - smoothstep( 0.6, 1.1, abs( sin( a1 ) ) * rr + wob ) ) * step( 0.0, cos( a1 ) );',
    '    spoke = max( spoke, ( 1.0 - smoothstep( 0.6, 1.1, abs( sin( a2 ) ) * rr + wob ) ) * step( 0.0, cos( a2 ) ) );',
    '    spoke = max( spoke, ( 1.0 - smoothstep( 0.6, 1.1, abs( sin( a3 ) ) * rr + wob ) ) * step( 0.0, cos( a3 ) ) ) * inner;',
    '    float lane = 1.0 - smoothstep( 0.65, 1.2, abs( rr - laneR ) + wob * 0.7 );',
    '    float plaza = 1.0 - smoothstep( 5.5, 7.5, rr + wob * 1.8 );',
    '    float wPath = max( max( spur, spoke ), max( lane, plaza ) ) * ( 0.78 + 0.22 * smoothstep( 0.3, 0.7, d1.b ) );',
    '    vec3 dirt = vec3( 0.5, 0.42, 0.29 ) * ( 0.8 + d1.b * 0.4 );',
    '    col = mix( col, dirt, wPath * 0.85 );',
    '  }',
    '  diffuseColor.rgb = col;',
    '}',
    '#endif'].join('\n');
  api.dressTerrain = function (mesh, o) {
    const t0 = now();
    try {
      const T = THREE, geo = mesh.geometry, pos = geo.attributes.position, col = geo.attributes.color, nor = geo.attributes.normal, W = 151, WATER = o.water;
      if (!pos || !col || !nor || pos.count !== W * W || mesh.userData.terrainDressed) return false;
      const N = pos.count, surf = new Float32Array(N * 4), c = new T.Color(), t = new T.Color();
      const SAND = new T.Color(0xead2a0), SAND2 = new T.Color(0xdcbf88), DUNE = new T.Color(0xe3cf9a);
      const RWARM = new T.Color(0x7d6d5a), RCOOL = new T.Color(0x646970), RDARK = new T.Color(0x514a42), RPALE = new T.Color(0x9c9488), MOSS = new T.Color(0x56723a);
      const SNOW = new T.Color(0xe6edf6), SNOWB = new T.Color(0x98b0dc);
      let nSand = 0, nRock = 0, nSnow = 0;
      /* how far (m) each vertex is from the water line: dry vertices beside the water start at their interpolated
         crossing, then a two-pass chamfer over the grid carries it inland */
      const SP = 720 / 150, D2 = SP * Math.SQRT2, dist = new Float32Array(N).fill(1e9);
      for (let i = 0; i < N; i++) {
        const y = pos.getY(i); if (y < WATER) { dist[i] = 0; continue; }
        const ix = i % W, iz = (i / W) | 0;
        for (const j of [ix > 0 ? i - 1 : -1, ix < W - 1 ? i + 1 : -1, iz > 0 ? i - W : -1, iz < W - 1 ? i + W : -1]) {
          if (j < 0) continue; const yj = pos.getY(j); if (yj < WATER) dist[i] = Math.min(dist[i], SP * (y - WATER) / (y - yj));
        }
      }
      for (let iz = 0; iz < W; iz++) for (let ix = 0; ix < W; ix++) {
        const i = iz * W + ix; let d = dist[i]; if (d === 0) continue;
        if (ix > 0) d = Math.min(d, dist[i - 1] + SP);
        if (iz > 0) { d = Math.min(d, dist[i - W] + SP); if (ix > 0) d = Math.min(d, dist[i - W - 1] + D2); if (ix < W - 1) d = Math.min(d, dist[i - W + 1] + D2); }
        dist[i] = d;
      }
      for (let iz = W - 1; iz >= 0; iz--) for (let ix = W - 1; ix >= 0; ix--) {
        const i = iz * W + ix; let d = dist[i]; if (d === 0) continue;
        if (ix < W - 1) d = Math.min(d, dist[i + 1] + SP);
        if (iz < W - 1) { d = Math.min(d, dist[i + W] + SP); if (ix < W - 1) d = Math.min(d, dist[i + W + 1] + D2); if (ix > 0) d = Math.min(d, dist[i + W - 1] + D2); }
        dist[i] = d;
      }
      for (let i = 0; i < N; i++) {
        const ix = i % W, iz = (i / W) | 0, x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const ny = nor.getY(i), nz = nor.getZ(i), steep = Math.min(1, Math.max(0, (1 - ny) * 2.2));
        const yn = (ix > 0 ? pos.getY(i - 1) : y) + (ix < W - 1 ? pos.getY(i + 1) : y) + (iz > 0 ? pos.getY(i - W) : y) + (iz < W - 1 ? pos.getY(i + W) : y);
        const cav = Math.max(-1, Math.min(1, (yn / 4 - y) * 1.2));
        c.fromArray(col.array, i * 3);
        const big = 0.5 + 0.5 * Math.sin(x * 0.047 + Math.cos(z * 0.031) * 1.9) * Math.cos(z * 0.043 - Math.sin(x * 0.027) * 1.3);
        const dune = 1 - smooth(0.05, 0.13, Math.abs(c.r - DUNE.r) + Math.abs(c.g - DUNE.g) + Math.abs(c.b - DUNE.b));
        let sand = y < WATER ? 1.15 : Math.max(0, 1 - dist[i] / 20) * (1 - smooth(WATER + 4.0, WATER + 7.5, y));   // 1 at the water line, 0.5 ten metres in
        if (y < WATER + 0.6) { t.copy(SAND).lerp(SAND2, big * 0.6); c.lerp(t, 1 - smooth(WATER - 0.4, WATER + 0.6, y)); }   // under the shallows: sand, for the far view
        sand = Math.max(sand, dune);
        const rock = Math.max(smooth(19, 26, y), y > WATER + 1.2 ? smooth(0.34, 0.6, steep) : 0);
        const snow = smooth(33, 37.5, y) * (1 - 0.65 * smooth(0.4, 0.85, steep));
        if (rock > 0) {
          t.copy(RWARM).lerp(RCOOL, big);
          t.lerp(RDARK, Math.max(0, cav) * 0.5);
          t.lerp(RPALE, Math.max(0, -cav) * 0.6);
          t.lerp(MOSS, smooth(0.04, 0.4, cav) * (1 - smooth(27, 32, y)) * 0.75);
          c.lerp(t, rock * 0.92);
        }
        if (snow > 0) {
          const lit = ny * 0.92 + nz * 0.39, shade = Math.min(1, Math.max(0, 1 - smooth(0.8, 0.995, lit) + Math.max(0, cav) * 0.6));
          t.copy(SNOW).lerp(SNOWB, 0.12 + shade * 0.78); c.lerp(t, snow);
        }
        surf[i * 4] = rock * (1 - snow); surf[i * 4 + 1] = sand * (1 - rock); surf[i * 4 + 2] = snow; surf[i * 4 + 3] = steep;
        if (sand > 0.5 && y >= WATER) nSand++; if (rock > 0.5) nRock++; if (snow > 0.5) nSnow++;
        col.array[i * 3] = c.r; col.array[i * 3 + 1] = c.g; col.array[i * 3 + 2] = c.b;
      }
      geo.setAttribute('wfrSurf', new T.BufferAttribute(surf, 4)); col.needsUpdate = true;
      const V = o.village, uni = {
        wfrDetail: { value: get('groundDetail', o.renderer) }, wfrWater: { value: WATER },
        wfrVil: { value: new T.Vector4(V ? V.x : 0, V ? V.z : 0, 35.4, 41.4) }, wfrVilOn: { value: V ? 1 : 0 },
      };
      const m = mesh.material, st = api.terrainDressed = { sand: nSand, rock: nRock, snow: nSnow, shader: 'pending', ms: 0 };
      m.onBeforeCompile = function (sh) {
        const v = sh.vertexShader, f = sh.fragmentShader;
        if (v.indexOf('#include <common>') < 0 || v.indexOf('#include <begin_vertex>') < 0 || f.indexOf('#include <common>') < 0 || f.indexOf('#include <map_fragment>') < 0 || f.indexOf('#include <color_fragment>') < 0) { st.shader = 'skipped (chunks not found)'; return; }
        Object.assign(sh.uniforms, uni);
        sh.vertexShader = v.replace('#include <common>', '#include <common>\nattribute vec4 wfrSurf;\nvarying vec4 vWfrSurf;\nvarying vec3 vWfrPos;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWfrSurf = wfrSurf;\nvWfrPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
        sh.fragmentShader = f.replace('#include <common>', '#include <common>\nuniform sampler2D wfrDetail;\nuniform float wfrWater;\nuniform vec4 wfrVil;\nuniform float wfrVilOn;\nvarying vec4 vWfrSurf;\nvarying vec3 vWfrPos;')
          .replace('#include <map_fragment>', GROUND_MAP).replace('#include <color_fragment>', '#include <color_fragment>\n' + GROUND_FRAG);
        st.shader = 'on';
      };
      m.customProgramCacheKey = function () { return 'wfr-ground-578b'; };
      m.needsUpdate = true; mesh.userData.terrainDressed = true; st.ms = Math.round((now() - t0) * 10) / 10;
      return true;
    } catch (e) { api.terrainDressed = { error: String(e && e.message || e) }; return false; }
  };

  /* THE CLOUDS: each faceted puff becomes a round soft one - a smooth ball and four smaller lobes on its shoulders,
     a flatter underside, white on top and a soft blue-grey beneath (vertex colours on the cloud's own material).
     The radius each puff was made with is kept; its place and its cloud's place are not touched. */
  function puffGeometry(R, k) {
    const T = THREE, parts = [new T.IcosahedronGeometry(R, 2)];
    const h = (n) => fract(Math.sin(n * 127.1 + k * 311.7) * 43758.5453);
    for (let j = 0; j < 4; j++) {
      const a = j * 1.5708 + h(j) * 0.9, el = 0.2 + h(j + 9) * 0.35, s = 0.52 + h(j + 17) * 0.2, gj = new T.IcosahedronGeometry(R * s, 1);
      gj.translate(Math.cos(a) * R * 0.6, el * R, Math.sin(a) * R * 0.42); parts.push(gj);
    }
    let n = 0; parts.forEach(function (gp) { n += gp.attributes.position.count; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), base = -0.28 * R, top = 0.95 * R;
    let o = 0;
    parts.forEach(function (gp) {
      const p = gp.attributes.position, q = gp.attributes.normal;
      for (let v = 0; v < p.count; v++, o++) {
        let y = p.getY(v); if (y < base) y = base + (y - base) * 0.3;
        pos[o * 3] = p.getX(v); pos[o * 3 + 1] = y; pos[o * 3 + 2] = p.getZ(v);
        const bx = q.getX(v) * 0.7, by = q.getY(v) * 0.7 + 0.6, bz = q.getZ(v) * 0.7, bl = Math.hypot(bx, by, bz) || 1;
        nor[o * 3] = bx / bl; nor[o * 3 + 1] = by / bl; nor[o * 3 + 2] = bz / bl;
        const t = smooth(base - 0.1 * R, top, y);
        col[o * 3] = 0.88 + 0.12 * t; col[o * 3 + 1] = 0.91 + 0.09 * t; col[o * 3 + 2] = 0.96 + 0.04 * t;
      }
      gp.dispose();
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    return geo;
  }
  api.dressClouds = function (clouds) {
    const t0 = now();
    try {
      let n = 0;
      clouds.forEach(function (cl, ci) {
        const m = cl.children[0] && cl.children[0].material; if (!m) return;
        if (!cl.children.every(function (b) { return b.material === m && b.geometry && b.geometry.parameters && b.geometry.parameters.radius; })) return;   // all or none: the shared material turns on vertex colours only when every puff carries them
        cl.children.forEach(function (b, bi) { const old = b.geometry; b.geometry = puffGeometry(old.parameters.radius, ci * 7 + bi); old.dispose(); n++; });
        m.vertexColors = true; m.needsUpdate = true;
      });
      api.cloudsDressed = { puffs: n, ms: Math.round((now() - t0) * 10) / 10 };
      return true;
    } catch (e) { api.cloudsDressed = { error: String(e && e.message || e) }; return false; }
  };

  /* THE SKY RING: its alphaMap repainted (still fully opaque - black where there is no cloud, the bench holds that)
     with cumulus - round lobes on a level soft base - and a few high thin wisps; the ring itself gets six height rows
     with a blue-grey underside and white tops (vertex colours; the night/dusk tint still multiplies over them). */
  api.dressSky = function (ring, cc, ct) {
    const t0 = now();
    try {
      const T = THREE, W = cc.width, Hc = cc.height, g = cc.getContext('2d'), r = rng(579060), SQ = 3.4;
      g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, W, Hc);
      for (let k = 0; k < 10; k++) {
        const x = r() * W, y = 18 + r() * 30, w = 30 + r() * 60, a = 0.1 + r() * 0.12;
        for (const ox of [-W, 0, W]) { g.save(); g.translate(x + ox, y); g.scale(1, 0.18 * SQ); const gr = g.createRadialGradient(0, 0, 0, 0, 0, w); gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w, 0, TAU); g.fill(); g.restore(); }
      }
      const tmp = canvas(160, Hc), tg = ctx(tmp);
      for (let k = 0; k < 22; k++) {
        const cx = r() * W, base = 104 + r() * 14, size = 0.6 + r() * 0.8, nl = 5 + ((r() * 6) | 0), lobes = [];
        for (let j = 0; j < nl; j++) { const tt = j / (nl - 1), rx = (4 + r() * 5) * size * (1 - 0.5 * Math.abs(tt - 0.5)); lobes.push([(tt - 0.5) * 34 * size + (r() - 0.5) * 4, base - rx * SQ * (0.55 + r() * 0.5), rx]); }
        for (let j = 0; j < nl + 2; j++) { const tt = r(), rx = (2 + r() * 2.6) * size * (1 - 0.6 * Math.abs(tt - 0.5)); lobes.push([(tt - 0.5) * 30 * size, base - (7 + r() * 7) * size * SQ * (1 - 0.7 * Math.abs(tt - 0.5)) - rx * SQ * 0.3, rx]); }   // small lobes on the crown
        tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, 160, Hc);
        for (const [lx, ly, rx] of lobes) { tg.save(); tg.translate(80 + lx, ly); tg.scale(1, SQ); const gr = tg.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.68, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); tg.fillStyle = gr; tg.beginPath(); tg.arc(0, 0, rx, 0, TAU); tg.fill(); tg.restore(); }
        tg.globalCompositeOperation = 'destination-out';
        const bg = tg.createLinearGradient(0, base - 6, 0, base + 4); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,1)'); tg.fillStyle = bg; tg.fillRect(0, base - 6, 160, Hc);
        tg.globalCompositeOperation = 'source-over';
        for (const ox of [-W, 0, W]) g.drawImage(tmp, cx - 80 + ox, 0);
      }
      ct.needsUpdate = true;
      const geo = new T.CylinderGeometry(780, 780, 150, 48, 6, true), p = geo.attributes.position, colr = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const v = (p.getY(i) + 75) / 150, tt = smooth(0.08, 0.5, v); colr[i * 3] = 0.85 + 0.15 * tt; colr[i * 3 + 1] = 0.88 + 0.12 * tt; colr[i * 3 + 2] = 0.93 + 0.07 * tt; }
      geo.setAttribute('color', new T.BufferAttribute(colr, 3));
      ring.geometry.dispose(); ring.geometry = geo; ring.material.vertexColors = true; ring.material.needsUpdate = true;
      api.skyDressed = { ring: true, ms: Math.round((now() - t0) * 10) / 10 };
      return true;
    } catch (e) { api.skyDressed = { error: String(e && e.message || e) }; return false; }
  };
  /* the dome's ramp, eased: the zenith holds its deep blue longer and the light gathers near the horizon. The five
     stops (and so the fog = col[4] and the background = col[2] the bench reads) are the game's own, unchanged. */
  let SKY_A = null, SKY_B = null;
  api.skyStops = function (gr, col) {
    if (!SKY_A) { SKY_A = new THREE.Color(); SKY_B = new THREE.Color(); }
    const mix = (i, j, f) => '#' + SKY_A.set(col[i]).lerp(SKY_B.set(col[j]), f).getHexString();
    gr.addColorStop(0, col[0]); gr.addColorStop(0.2, mix(0, 1, 0.3)); gr.addColorStop(0.32, col[1]); gr.addColorStop(0.42, mix(1, 2, 0.42)); gr.addColorStop(0.47, col[2]);
    gr.addColorStop(0.49, mix(2, 3, 0.5)); gr.addColorStop(0.5, col[3]); gr.addColorStop(0.51, mix(3, 4, 0.55)); gr.addColorStop(0.53, col[4]); gr.addColorStop(1, col[4]);
  };

  api.photoDial = () => ({ classic: CLASSIC_LOOK, hue: PHOTO_HUE, contrast: PHOTO_CONTRAST, state: Object.assign({}, photoState) });   // 626: the dial, for the benches
  return api;
})();
