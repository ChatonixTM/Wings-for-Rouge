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
    } else cache[name] = finish(paint(base), renderer, base === 'cloud' ? { clamp: true } : null);
    return cache[name];
  }

  /* bumpScale that reads well at game distance (r128 bump is screen-space: at heavy minification a big scale
     turns to glitter). opts.bump === true uses these; a number overrides. Grass on the 110× terrain: leave off. */
  const BUMP_SCALE = { grass: 0.03, bark: 0.08, stone: 0.06, roofTiles: 0.06, featherWing: 0.03 };
  const api = { names: Object.keys(painters).concat(Object.keys(ALIAS)), bumpNames: Object.keys(BUMP_SCALE), bumpScale: BUMP_SCALE, get: get, stats: stats };
  api.names.forEach(function (n) { api[n] = function (renderer) { return get(n, renderer); }; });
  api.bump = function (name, renderer) { return get(name + 'Bump', renderer); };
  api.count = function () {                         // distinct THREE.Textures alive (aliases share, so dedupe)
    const set = new Set(Object.values(cache).concat(Object.values(shared))); return set.size;
  };

  /* apply(mesh, name, rx, ry, renderer, opts): give the mesh (or each mesh in a group) the ONE texture for
     (name, repeat). opts.bump = true (recommended scale) or a number also sets material.bumpMap (Phong/Standard only). In r128 the bumpMap
     is read through the MAP's uv transform, so the single un-cloned '<name>Bump' texture serves every repeat. */
  /* ⚠ ONE TEXTURE PER (name, repeat), shared by every mesh that asks for it — Obito, Oct 8: a clone per mesh made
     three upload 540 textures where ~10 do (about 45 MB of a phone's graphics memory). */
  const shared = {};
  api.apply = function (mesh, name, repeatX, repeatY, renderer, opts) {
    const rx = repeatX || 1, ry = repeatY == null ? rx : repeatY, key = name + ':' + rx + ':' + ry;
    let t = shared[key];
    if (!t) { t = get(name, renderer).clone(); t.needsUpdate = true; t.repeat.set(rx, ry); shared[key] = t; }
    const bump = opts && opts.bump ? get(name + 'Bump', renderer) : null;
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
  return api;
})();
