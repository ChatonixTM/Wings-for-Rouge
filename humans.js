/* ═══════════════════════════════════════════════════════════════════════════
   WFR_HUMANS — the villagers of "Wings for Rouge" (Oct 8 2026).

   Marth: "we also gotta improve the textures of the humans" — "even 'fly like a
   bird 2' looks better than what we got so far" — "nostalgic but polished".

   WFR_HUMANS.make(THREE, i, pal, opts) → { g, body, legL, legR, armL, armR, head, broom, props }
     props = { broom, basket, book, can, rod, bread, lantern, mug } — groups on armR's hand, hidden
     pal  = { shirt, pants, shoes, skin, hair }   (hex numbers, the game's palettes)
     opts = { renderer, scale = 1.35, linear = auto, textures = true, look }
       look (Oct 9, board 552, additive): a LOOKS-shaped object used instead of LOOKS[i] (folk.js: Hal is
       Bo's look with a beard). Absent, every villager renders exactly as before.

   ⚠ THE RIG IS THE GAME'S, UNCHANGED. Hips pivot at (±0.15, 0.98, 0), shoulders
   at (±0.37, 1.74, 0), the head group sits at y 2.1, the broom hangs from armR at
   y -0.72, and the body's origin is on the ground. pose() in the game drives
   legL/legR/armL/armR rotation.x and .z, body.position.y and head.rotation.x/.y
   — nothing here moves a pivot, so those animations drive these bodies as-is.
   Height/build variation is body.scale about the ground (feet stay planted).

   PHONE-LIGHT: parts that share a material inside one rig node are MERGED into
   one mesh (~28 meshes, ~3–4.5k triangles per villager), and every geometry and
   material is cached and shared across villagers.

   COLOUR: when the renderer outputs sRGB (outputEncoding === sRGBEncoding) the
   palette hexes are converted sRGB→linear so they show as designed and not
   washed out. Force with opts.linear = true/false.

   TEXTURES: if window.WFR_TEX has 'skin', 'hair', 'denim', 'knit', 'linen',
   'leather' they are laid on (shared, through WFR_TEX.apply); any name it lacks
   falls back to plain colour.
   ═══════════════════════════════════════════════════════════════════════════ */
window.WFR_HUMANS = (function () {
  'use strict';

  /* who they are: shape of the body, the clothes, the hair, the eyes */
  const LOOKS = [
    // Ada — a long-sleeved dress, hair up in a bun
    { torso: 'f', dress: true, sleeves: 'long', hair: 'bun', iris: 0x5a3b22, h: 1.00, w: 0.96, shirtTex: 'linen' },
    // Bo — a knit jumper and a flat cap
    { torso: 'm', sleeves: 'long', hair: 'cap', iris: 0x4a3220, h: 1.03, w: 1.08, shirtTex: 'knit', cap: 0x5e5244 },
    // Cyril — shirt and leather waistcoat, close crop, a trimmed beard
    { torso: 'm', sleeves: 'long', hair: 'crop', beard: true, vest: 0x6b4a2e, iris: 0x2e1d12, h: 1.06, w: 1.03, shirtTex: 'linen' },
    // Dina — short sleeves, trousers, a ponytail
    { torso: 'f', sleeves: 'short', hair: 'pony', iris: 0x4d6a3a, h: 0.97, w: 0.95, shirtTex: 'linen' },
    // Eli — short sleeves and a head of curls
    { torso: 'm', sleeves: 'short', hair: 'curls', iris: 0x2b1a10, h: 1.02, w: 1.0, shirtTex: 'knit' },
    // Faye — a dress, a white apron, a headscarf over fair hair
    { torso: 'f', dress: true, sleeves: 'long', hair: 'scarf', scarf: 0xc8574b, apron: 0xf3ead8, iris: 0x4f6f8f, h: 0.95, w: 0.94, shirtTex: 'linen' },
  ];

  let T = null;                 // THREE, from the first call
  const GEO = {}, MAT = {};     // shared across villagers

  /* ── small helpers ── */
  const V2 = (x, y) => new T.Vector2(x, y);
  function M(px, py, pz, rx, ry, rz, sx, sy, sz) {
    const m = new T.Matrix4();
    m.compose(new T.Vector3(px || 0, py || 0, pz || 0),
      new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)),
      new T.Vector3(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz));
    return m;
  }
  /* merge [[geometry, matrix], ...] into one indexed BufferGeometry (position, normal, uv) */
  function merge(parts) {
    let nv = 0, ni = 0;
    const gs = parts.map(([geo, m]) => { const c = geo.clone(); if (m) c.applyMatrix4(m); if (!c.index) { const ix = []; for (let k = 0; k < c.attributes.position.count; k++) ix.push(k); c.setIndex(ix); } nv += c.attributes.position.count; ni += c.index.count; return c; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
    let vo = 0, io = 0;
    for (const c of gs) {
      const n = c.attributes.position.count;
      pos.set(c.attributes.position.array, vo * 3);
      if (c.attributes.normal) nor.set(c.attributes.normal.array, vo * 3);
      if (c.attributes.uv) uv.set(c.attributes.uv.array, vo * 2);
      const ia = c.index.array; for (let k = 0; k < ia.length; k++) idx[io + k] = ia[k] + vo;
      vo += n; io += ia.length; c.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.BufferAttribute(nor, 3));
    out.setAttribute('uv', new T.BufferAttribute(uv, 2));
    out.setIndex(new T.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }
  const geo = (key, build) => GEO[key] || (GEO[key] = build());
  const sph = (r, ws, hs, t0, tl) => new T.SphereGeometry(r, ws || 12, hs || 8, 0, Math.PI * 2, t0 || 0, tl == null ? Math.PI : tl);
  /* a lathe from [radius, y] pairs listed bottom → top */
  const lathe = (pts, seg, p0, pl) => new T.LatheGeometry(pts.map((p) => V2(p[0], p[1])), seg || 14, p0 || 0, pl == null ? Math.PI * 2 : pl);
  const off = (pts, d) => pts.map((p) => [p[0] ? p[0] + d : 0, p[1]]);
  const mix = (a, b, t) => { const ca = new T.Color(a), cb = new T.Color(b); return ca.lerp(cb, t).getHex(); };

  /* ── profiles (radius, y), body-local; the torso is flattened front-to-back ── */
  const TORSO_M = [[0, 0.975], [0.268, 0.975], [0.265, 1.04], [0.25, 1.18], [0.258, 1.3], [0.282, 1.45], [0.302, 1.58], [0.308, 1.68], [0.298, 1.76], [0.22, 1.835], [0.1, 1.885], [0, 1.895]];
  const TORSO_F = [[0, 0.975], [0.268, 0.975], [0.264, 1.03], [0.228, 1.18], [0.236, 1.3], [0.27, 1.45], [0.282, 1.56], [0.282, 1.68], [0.276, 1.76], [0.2, 1.835], [0.095, 1.885], [0, 1.895]];
  const DRESS = [[0, 0.6], [0.355, 0.6], [0.36, 0.63], [0.33, 0.8], [0.29, 0.98], [0.245, 1.14], [0.232, 1.24], [0.24, 1.32], [0.27, 1.45], [0.282, 1.56], [0.282, 1.68], [0.276, 1.76], [0.2, 1.835], [0.095, 1.885], [0, 1.895]];
  const ZT = 0.64, ZD = 0.74;   // front-to-back flattening: torso, skirt

  /* ── the shared geometries ── */
  function legGeo() {        // hip-local: a trouser leg, thigh to ankle cuff
    return geo('leg', () => merge([[lathe([[0, -0.885], [0.086, -0.885], [0.09, -0.82], [0.094, -0.66], [0.1, -0.52], [0.098, -0.44], [0.115, -0.3], [0.128, -0.12], [0.128, 0.0], [0, 0.07]], 10), null]]));
  }
  function shoeGeo() {       // the upper, a rounded toe
    return geo('shoe', () => merge([
      [sph(1, 10, 5, 0, Math.PI / 2), M(0, -0.945, 0.06, 0, 0, 0, 0.088, 0.1, 0.19)],
      [new T.CylinderGeometry(0.084, 0.088, 0.08, 10), M(0, -0.9, -0.0)],
    ]));
  }
  function soleGeo() {
    return geo('sole', () => merge([[new T.BoxGeometry(0.19, 0.04, 0.4, 1, 1, 1), M(0, -0.96, 0.06)], [new T.CylinderGeometry(0.095, 0.095, 0.04, 10), M(0, -0.96, 0.26, 0, 0, 0, 1, 1, 0.6)]]));
  }
  function sleeveGeo(kind) { // shoulder-local: cap + sleeve
    return geo('sleeve-' + kind, () => {
      const long = [[0, -0.63], [0.064, -0.63], [0.07, -0.6], [0.072, -0.55], [0.078, -0.4], [0.084, -0.25], [0.088, -0.05], [0.072, 0.02], [0, 0.04]];
      const short = [[0, -0.31], [0.088, -0.31], [0.092, -0.28], [0.094, -0.15], [0.094, -0.05], [0.075, 0.02], [0, 0.04]];
      const parts = [[lathe(kind === 'long' ? long : short, 10), null]];
      if (kind === 'long') parts.push([new T.TorusGeometry(0.066, 0.012, 4, 10), M(0, -0.615, 0, Math.PI / 2)]);
      return merge(parts);
    });
  }
  function armSkinGeo(kind, s) {  // shoulder-local: forearm (short sleeves) + the hand
    return geo('armskin-' + kind + s, () => {
      const parts = [
        [sph(0.058, 8, 6), M(0, -0.705, 0.005, 0, 0, 0, 0.62, 1.2, 1.0)],                    // palm
        [sph(0.026, 8, 6), M(0.022 * -s, -0.69, 0.045, -0.45, 0, 0, 0.9, 1.5, 0.9)],          // thumb, toward the body and forward
        [sph(0.05, 7, 5), M(0, -0.765, 0.0, 0, 0, 0, 0.55, 0.75, 0.9)],                       // curled fingers
      ];
      if (kind === 'short') parts.push([lathe([[0, -0.665], [0.046, -0.66], [0.052, -0.62], [0.058, -0.52], [0.068, -0.4], [0.074, -0.3], [0, -0.25]], 10), null]);
      else parts.push([new T.CylinderGeometry(0.046, 0.044, 0.08, 8), M(0, -0.645)]);   // wrist
      return merge(parts);
    });
  }
  function torsoGeo(L) {     // body-local: shirt or dress + collar
    const key = 'torso-' + (L.dress ? 'dress' : L.torso);
    return geo(key, () => merge([
      [lathe(L.dress ? DRESS : L.torso === 'f' ? TORSO_F : TORSO_M, 14), M(0, 0, 0, 0, 0, 0, 1, 1, L.dress ? ZD : ZT)],
      [new T.TorusGeometry(0.098, 0.026, 5, 14), M(0, 1.87, 0.005, Math.PI / 2 - 0.25, 0, 0, 1, 0.85, 1)],
    ]));
  }
  function pelvisGeo() {
    return geo('pelvis', () => merge([[lathe([[0, 0.83], [0.2, 0.84], [0.248, 0.9], [0.255, 0.97], [0.25, 1.0], [0, 1.01]], 14), M(0, 0, 0, 0, 0, 0, 1, 1, ZT + 0.05)]]));
  }
  function beltGeo() {
    return geo('belt', () => merge([[new T.CylinderGeometry(0.262, 0.262, 0.055, 16, 1, true), M(0, 0.95, 0, 0, 0, 0, 1, 1, ZT + 0.04)]]));
  }
  function buckleGeo() { return geo('buckle', () => merge([[new T.BoxGeometry(0.07, 0.055, 0.02), M(0, 0.95, 0.262 * (ZT + 0.04) + 0.006)]])); }
  function neckGeo() { return geo('neck', () => merge([[new T.CylinderGeometry(0.068, 0.078, 0.26, 10, 1, true), M(0, 1.93)]])); }
  function vestGeo() {       // open-fronted waistcoat
    return geo('vest', () => merge([[lathe(off(TORSO_M.slice(1, 9), 0.014), 16, 0.32, Math.PI * 2 - 0.64), M(0, 0, 0, 0, 0, 0, 1, 1, ZT)]]));
  }
  function apronGeo() {      // skirt panel + bib, following the dress
    return geo('apron', () => merge([
      [lathe(off(DRESS.slice(2, 8), 0.012), 10, -0.75, 1.5), M(0, 0, 0, 0, 0, 0, 1, 1, ZD)],
      [lathe(off(DRESS.slice(6, 10), 0.016), 8, -0.42, 0.84), M(0, 0, 0, 0, 0, 0, 1, 1, ZD)],
      [new T.TorusGeometry(0.245, 0.012, 4, 20, Math.PI * 1.2), M(0, 1.24, 0, Math.PI / 2, 0, Math.PI * 0.4, 1, ZD, 1)],   // the waist tie
    ]));
  }

  /* head-local (the head group sits at y 2.1); the face looks down +z */
  const EYE = [0.068, 0.035, 0.168];
  function headSkinGeo() {
    return geo('headskin', () => {
      const p = [
        [sph(0.2, 14, 10), M(0, 0.04, -0.01, 0, 0, 0, 0.93, 1.05, 1.0)],      // cranium
        [sph(0.155, 12, 7), M(0, -0.06, 0.035, 0, 0, 0, 1.0, 0.9, 0.95)],     // cheeks + jaw
        [sph(0.046, 8, 5), M(0, -0.152, 0.105, 0, 0, 0, 1.15, 0.8, 0.8)],        // chin
        [sph(0.026, 6, 5), M(0, 0.0, 0.188, -0.3, 0, 0, 0.75, 1.4, 0.9)],      // bridge of the nose
        [sph(0.024, 7, 5), M(0, -0.033, 0.197, 0, 0, 0, 1.15, 0.95, 1)],       // tip of the nose
      ];
      for (const s of [-1, 1]) {
        p.push([sph(0.05, 7, 5), M(0.183 * s, 0.005, -0.01, 0, 0.35 * s, 0, 0.42, 1, 0.72)]);              // ear
      }
      return merge(p);
    });
  }
  function eyeGeo(part) {
    return geo('eye-' + part, () => {
      const p = [];
      for (const s of [-1, 1]) {
        const x = EYE[0] * s, y = EYE[1], z = EYE[2];
        if (part === 'white') p.push([sph(0.035, 9, 6), M(x, y, z, 0, 0, 0, 1.0, 0.85, 0.55)]);
        if (part === 'iris') p.push([sph(0.0215, 10, 4, 0, Math.PI / 2), M(x, y - 0.002, z + 0.014, Math.PI / 2, 0, 0, 1, 0.42, 1)]);
        if (part === 'pupil') {
          p.push([sph(0.0105, 8, 3, 0, Math.PI / 2), M(x, y - 0.002, z + 0.0175, Math.PI / 2, 0, 0, 1, 0.85, 1)]);
          p.push([new T.TorusGeometry(0.0335, 0.0055, 3, 9, Math.PI * 0.85), M(x, y + 0.002, z + 0.009, -0.25, 0, Math.PI * 0.075 + (s > 0 ? -0.08 : 0.08), 1.05, 0.95, 1)]);   // the lash line
        }
        if (part === 'glint') p.push([sph(0.0048, 6, 4), M(x + 0.007, y + 0.006, z + 0.0245)]);
        if (part === 'brow') p.push([sph(0.036, 7, 4), M(x, y + 0.056, z + 0.012, -0.2, 0, -0.12 * s, 1, 0.26, 0.38)]);
        if (part === 'blush') p.push([sph(0.034, 6, 4), M(0.102 * s, -0.045, 0.148, 0, 0.45 * s, 0, 1, 0.68, 0.42)]);
      }
      return merge(p);
    });
  }
  function mouthGeo() {     // a small smile
    return geo('mouth', () => merge([[new T.TorusGeometry(0.034, 0.0075, 5, 10, Math.PI * 0.8), M(0, -0.068, 0.172, -0.18, 0, Math.PI * 1.1)]]));
  }
  /* the hair: a shared cap, then a style per villager */
  const capPart = (r, t, tilt, y, z) => [sph(r || 0.212, 14, 8, 0, (t || 0.56) * Math.PI), M(0, y == null ? 0.045 : y, z == null ? -0.015 : z, tilt == null ? -0.42 : tilt, 0, 0, 0.955, 1.05, 1.03)];
  function hairGeo(style) {
    return geo('hair-' + style, () => {
      const p = [];
      if (style === 'bun') {
        p.push(capPart(0.214, 0.6, -0.5));
        p.push([sph(0.19, 12, 6), M(0, 0.0, -0.055, 0, 0, 0, 0.98, 0.95, 0.88)]);                 // the back, gathered
        p.push([sph(0.09, 12, 8), M(0, 0.25, -0.12)]);                                             // the bun, up top
        p.push([new T.TorusGeometry(0.075, 0.016, 4, 12), M(0, 0.205, -0.1, Math.PI / 2 - 0.6, 0, 0)]);   // its band
        p.push([sph(0.09, 10, 6), M(0.06, 0.17, 0.13, 0.25, 0, -0.35, 1.5, 0.42, 0.7)]);              // a parted fringe
        p.push([sph(0.09, 10, 6), M(-0.07, 0.165, 0.125, 0.25, 0, 0.45, 1.3, 0.42, 0.7)]);
      } else if (style === 'cap') {
        p.push(capPart(0.208, 0.62, -0.62));                                                       // short hair under the cap
        p.push([sph(0.03, 6, 4), M(0.165, -0.0, 0.03, 0, 0, 0, 0.5, 1.6, 0.9)]);                    // sideburns
        p.push([sph(0.03, 6, 4), M(-0.165, -0.0, 0.03, 0, 0, 0, 0.5, 1.6, 0.9)]);
      } else if (style === 'crop') {
        p.push(capPart(0.207, 0.5, -0.5));
      } else if (style === 'pony') {
        p.push(capPart(0.213, 0.58, -0.5));
        p.push([sph(0.17, 12, 8), M(0, 0.04, -0.07, 0, 0, 0, 1.0, 1.0, 0.85)]);
        p.push([lathe([[0, -0.3], [0.035, -0.26], [0.06, -0.15], [0.065, -0.05], [0.04, 0.02], [0, 0.03]], 10), M(0, 0.1, -0.235, 0.5, 0, 0)]);   // the tail
        p.push([sph(0.08, 10, 6), M(0, 0.165, 0.11, 0.2, 0, 0, 1.6, 0.42, 0.65)]);                 // a side-swept fringe
      } else if (style === 'curls') {
        p.push(capPart(0.214, 0.6, -0.42));
        const n = 22, ga = Math.PI * (3 - Math.sqrt(5));
        for (let k = 0; k < n; k++) {        // curls spread over the crown (golden-angle spiral), clear of the brow
          const yv = 1 - (k / (n - 1)) * 0.85, rr = Math.sqrt(1 - yv * yv), th = k * ga;
          let x = Math.cos(th) * rr, z = Math.sin(th) * rr;
          if (z > 0.55 && yv < 0.55) continue;
          p.push([sph(0.062, 6, 4), M(x * 0.2, 0.06 + yv * 0.215, -0.03 + z * 0.2)]);
        }
      } else if (style === 'scarf') {
        p.push([sph(0.04, 8, 6), M(0.145, 0.04, 0.11, 0, 0, 0.3, 0.6, 1.3, 0.7)]);
        p.push([sph(0.04, 8, 6), M(-0.145, 0.04, 0.11, 0, 0, -0.3, 0.6, 1.3, 0.7)]);
      }
      return merge(p);
    });
  }
  function hatGeo(style) {
    if (style === 'cap') return geo('hat-cap', () => merge([
      [sph(0.228, 16, 6, 0, Math.PI * 0.44), M(0, 0.09, -0.015, -0.1, 0, 0, 1.03, 0.78, 1.08)],
      [new T.CylinderGeometry(0.225, 0.225, 0.04, 16, 1, true), M(0, 0.1, -0.015, -0.1, 0, 0, 1.03, 1, 1.08)],
      [new T.CylinderGeometry(0.135, 0.13, 0.018, 14, 1, false, -Math.PI / 2, Math.PI), M(0, 0.098, 0.205, -0.16, 0, 0, 1.05, 1, 0.75)],   // brim
      [sph(0.02, 6, 4), M(0, 0.27, -0.03)],                                                         // button
    ]));
    if (style === 'scarf') return geo('hat-scarf', () => merge([
      [sph(0.226, 14, 8, 0, Math.PI * 0.66), M(0, 0.035, -0.035, -0.72, 0, 0, 0.99, 1.06, 1.05)],
      [new T.TorusGeometry(0.2, 0.022, 4, 14, Math.PI * 1.1), M(0, 0.075, 0.0, -0.72 + Math.PI / 2, 0, -Math.PI * 0.05 + Math.PI * -0.0, 0.98, 1.1, 1)],   // the folded front band
      [sph(0.05, 8, 6), M(0, -0.055, -0.21)],                                                       // the knot
      [sph(0.045, 8, 6), M(0.03, -0.12, -0.21, 0.3, 0, 0.3, 0.8, 1.6, 0.5)],                          // its tails
      [sph(0.045, 8, 6), M(-0.035, -0.115, -0.205, 0.3, 0, -0.45, 0.8, 1.6, 0.5)],
    ]));
    return null;
  }
  function beardGeo() {
    return geo('beard', () => merge([
      [sph(0.16, 16, 8, Math.PI * 0.62, Math.PI * 0.38), M(0, -0.055, 0.04, 0, 0, 0, 1.02, 0.92, 0.98)],
      [sph(0.045, 8, 6), M(0, -0.052, 0.181, 0, 0, 0, 1.25, 0.35, 0.45)],                          // moustache
    ]));
  }
  function broomGeo(part) {
    return geo('broom-' + part, () => part === 'stick'
      ? merge([[new T.CylinderGeometry(0.03, 0.03, 1.5, 6), M(0, -0.3, 0.25, 0.5)]])
      : merge([[new T.CylinderGeometry(0.05, 0.17, 0.34, 10), M(0, -1.08, -0.18, 0.5, 0, 0, 1, 1, 0.38)], [new T.CylinderGeometry(0.056, 0.056, 0.05, 10), M(0, -0.93, -0.1, 0.5, 0, 0, 1, 1, 0.55)]]));   // a flat fan of straw at the stick's foot, bound at the neck
  }


  /* ── things they carry: hand-local (origin = the palm of armR, -y down, +z forward), hidden by default ── */
  function propGeo(name) {
    return geo('prop-' + name, () => {
      const C = (rt, rb, h, seg, open) => new T.CylinderGeometry(rt, rb, h, seg || 10, 1, !!open);
      switch (name) {
        case 'basket': return merge([
          [C(0.15, 0.115, 0.15, 12, true), M(0, -0.25, 0.03)],                                       // wicker walls
          [C(0.115, 0.115, 0.012, 12), M(0, -0.32, 0.03)],                                             // floor
          [new T.TorusGeometry(0.15, 0.012, 4, 14), M(0, -0.175, 0.03, Math.PI / 2)],                  // rim
          [new T.TorusGeometry(0.15, 0.011, 4, 10, Math.PI), M(0, -0.175, 0.03, 0, Math.PI / 2, 0)]]);  // handle, up into the hand
        case 'basketFill': return merge([
          [sph(0.05, 7, 5), M(0.05, -0.19, 0.06)], [sph(0.05, 7, 5), M(-0.055, -0.195, 0.0)], [sph(0.048, 7, 5), M(0.0, -0.18, -0.06)], [sph(0.046, 7, 5), M(-0.03, -0.17, 0.1)]]);
        case 'bookCover': return merge([[new T.BoxGeometry(0.05, 0.25, 0.19), M(0, -0.06, 0.07)]]);
        case 'bookPages': return merge([[new T.BoxGeometry(0.036, 0.236, 0.18), M(0, -0.06, 0.077)]]);
        case 'can': return merge([
          [C(0.095, 0.105, 0.19, 12), M(0, -0.2, 0.0)],                                                 // body
          [C(0.012, 0.022, 0.3, 6), M(0, -0.17, 0.2, 0.95)],                                              // spout, forward and up
          [C(0.035, 0.02, 0.05, 8), M(0, -0.08, 0.33, 0.95)],                                             // the rose
          [new T.TorusGeometry(0.09, 0.014, 4, 10, Math.PI), M(0, -0.105, -0.0, 0, Math.PI / 2, 0)]]);  // handle over the top
        case 'rod': return merge([
          [C(0.008, 0.016, 2.1, 6), M(0, 0.48, 0.83, 1.05)],                                               // the rod, forward and up
          [C(0.024, 0.024, 0.26, 8), M(0, 0.0, 0.0, 1.05)],                                                 // cork grip
          [new T.TorusGeometry(0.03, 0.01, 4, 8), M(0.03, 0.05, 0.08, 0, Math.PI / 2, 0)]]);                // reel
        case 'rodLine': return merge([
          [C(0.003, 0.003, 0.95, 3), M(0, 0.98, 1.73)],                                                     // line from the tip
          [sph(0.03, 7, 5), M(0, 0.5, 1.73)]]);                                                             // bobber
        case 'bread': return merge([
          [sph(0.062, 10, 7), M(0.02, -0.07, 0.06, 0, 0, 0, 2.9, 0.85, 1.0)]]);                            // a long loaf, across the hand
        case 'lanternMetal': return merge([
          [new T.TorusGeometry(0.04, 0.008, 4, 10), M(0, -0.02, 0, 0, Math.PI / 2, 0)],                    // ring in the hand
          [new T.ConeGeometry(0.085, 0.07, 8), M(0, -0.09, 0)],                                               // cap
          [C(0.075, 0.08, 0.03, 8), M(0, -0.3, 0)],                                                          // base
          ...[0, 1, 2, 3].map((k) => [C(0.007, 0.007, 0.17, 4), M(Math.cos(k * Math.PI / 2 + 0.785) * 0.072, -0.2, Math.sin(k * Math.PI / 2 + 0.785) * 0.072)])]);
        case 'lanternGlass': return merge([[C(0.062, 0.062, 0.17, 8), M(0, -0.2, 0)]]);
        case 'mug': return merge([
          [C(0.052, 0.048, 0.11, 10, true), M(0, -0.04, 0.085)],
          [C(0.048, 0.048, 0.01, 10), M(0, -0.095, 0.085)],
          [new T.TorusGeometry(0.032, 0.009, 4, 8, Math.PI), M(0, -0.04, 0.025, 0, Math.PI / 2, Math.PI / 2)]]);   // handle, toward the palm
        case 'mugTea': return merge([[new T.CircleGeometry(0.047, 10), M(0, -0.0, 0.085, -Math.PI / 2)]]);
      }
      return null;
    });
  }

  /* ── materials: one per (colour, texture, finish), shared ── */
  let LIN = false, R = null;
  function mat(hex, texName, o) {
    o = o || {};
    const key = [hex, texName || '', o.rough || 0.85, o.side || 0, LIN ? 1 : 0, o.basic ? 1 : 0, o.rep || ''].join('|');
    if (MAT[key]) return MAT[key];
    const m = o.basic ? new T.MeshBasicMaterial({ color: hex })
      : new T.MeshStandardMaterial({ color: hex, roughness: o.rough || 0.85, metalness: 0, side: o.side || T.FrontSide });
    if (LIN) m.color.convertSRGBToLinear();
    const X = window.WFR_TEX;
    if (texName && X && typeof X.apply === 'function' && X.names && X.names.indexOf(texName) >= 0) {
      try { const rr = o.rep || [2, 2]; X.apply({ material: m }, texName, rr[0], rr[1], R); } catch (e) { /* plain colour */ }
    }
    return (MAT[key] = m);
  }

  function make(THREE, i, pal, opts) {
    T = THREE; opts = opts || {}; R = opts.renderer || null;
    LIN = opts.linear != null ? !!opts.linear : !!(R && THREE.sRGBEncoding && R.outputEncoding === THREE.sRGBEncoding);
    const useTex = opts.textures !== false;
    const tx = (n) => (useTex ? n : null);
    const L = opts.look || LOOKS[((i % LOOKS.length) + LOOKS.length) % LOOKS.length];   // opts.look: a whole look of one's own (folk.js, board 552)
    const g = new T.Group(), body = new T.Group(); g.add(body);
    /* the waist (Oct 9, board 555: "they should bend better"): a pivot at the hips' height. The upper body hangs in
       `up`, set back down by the same height, so every body-local number below stays as it was and nothing re-bases */
    const WAIST_Y = 0.98, waist = new T.Group(), up = new T.Group(); waist.position.y = WAIST_Y; up.position.y = -WAIST_Y; waist.add(up); body.add(waist);
    const add = (parent, geometry, material) => { const m = new T.Mesh(geometry, material); parent.add(m); return m; };

    const shirt = mat(pal.shirt, tx(L.shirtTex)), pants = mat(pal.pants, tx(L.dress ? 'knit' : 'denim'), { rep: [1, 2] });
    const skin = mat(mix(pal.skin, 0xc47a58, 0.1), tx('skin'), { rough: 0.7, rep: [1, 1] }), hairM = mat(pal.hair, tx('hair'), { rough: 0.75, rep: [2, 2] });
    const shoes = mat(pal.shoes, tx('leather'), { rough: 0.6, rep: [1, 1] }), sole = mat(mix(pal.shoes, 0x0e0a08, 0.65), null, { rough: 0.9 });

    /* legs: the game's hip pivots */
    const mkLeg = (s) => { const hip = new T.Group(); hip.position.set(0.15 * s, 0.98, 0);
      add(hip, legGeo(), pants); add(hip, shoeGeo(), shoes); add(hip, soleGeo(), sole);
      body.add(hip); return hip; };
    /* arms: the game's shoulder pivots */
    const mkArm = (s) => { const sh = new T.Group(); sh.position.set(0.37 * s, 1.74, 0);
      add(sh, sleeveGeo(L.sleeves), shirt); add(sh, armSkinGeo(L.sleeves, s), skin);
      up.add(sh); return sh; };   // the shoulders ride the waist
    const legL = mkLeg(-1), legR = mkLeg(1), armL = mkArm(-1), armR = mkArm(1);

    add(up, torsoGeo(L), shirt);
    if (!L.dress) { add(body, pelvisGeo(), pants); add(body, beltGeo(), mat(0x4a3322, tx('leather'), { rough: 0.6, rep: [4, 1] })); add(body, buckleGeo(), mat(0xc9a25a, null, { rough: 0.4 })); }
    if (L.vest) add(up, vestGeo(), mat(L.vest, tx('leather'), { rough: 0.7, side: T.DoubleSide, rep: [5, 4] }));
    if (L.apron) add(up, apronGeo(), mat(L.apron, tx('linen'), { side: T.DoubleSide, rep: [2, 2] }));
    add(up, neckGeo(), skin);

    const head = new T.Group(); head.position.y = 2.1; up.add(head);
    add(head, headSkinGeo(), skin);
    add(head, eyeGeo('white'), mat(0xf4efe6, null, { rough: 0.35 }));
    add(head, eyeGeo('iris'), mat(L.iris, null, { rough: 0.3 }));
    add(head, eyeGeo('pupil'), mat(0x0d0a08, null, { rough: 0.25 }));
    add(head, eyeGeo('glint'), mat(0xffffff, null, { basic: true }));
    add(head, eyeGeo('brow'), mat(mix(pal.hair, 0x000000, 0.15), null, { rough: 0.9 }));
    add(head, eyeGeo('blush'), mat(mix(mix(pal.skin, 0xc47a58, 0.1), 0xd05a5a, 0.22), null, { rough: 0.75 }));
    add(head, mouthGeo(), mat(mix(pal.skin, 0x7a2430, 0.6), null, { rough: 0.6 }));
    add(head, hairGeo(L.hair), hairM);
    if (L.hair === 'cap') add(head, hatGeo('cap'), mat(L.cap, tx('knit'), { rep: [3, 2] }));
    if (L.hair === 'scarf') add(head, hatGeo('scarf'), mat(L.scarf, tx('linen'), { rep: [3, 3] }));
    if (L.beard) add(head, beardGeo(), hairM);

    /* a broom, for sweeping days (the game shows it; same place as before) */
    const broom = new T.Group(); broom.position.y = -0.72; broom.visible = false; armR.add(broom);
    add(broom, broomGeo('stick'), mat(0x8b5e34, null, { rough: 0.8 }));
    add(broom, broomGeo('bristle'), mat(0xd9b26a, null, { rough: 0.95 }));

    /* build: taller/shorter, broader/slimmer — scaled about the ground, pivots untouched */
    body.scale.set(L.w, L.h, 0.5 + L.w * 0.5);
    g.scale.setScalar(opts.scale == null ? 1.35 : opts.scale);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = !!opts.shadows; } });
    /* things to hold (Su wires which act shows which); all on the right hand, like the broom */
    const prop = (parts) => { const p = new T.Group(); p.position.y = -0.72; p.visible = false; armR.add(p); for (const [n, m] of parts) add(p, propGeo(n), m); return p; };
    const wood = mat(0x8b5e34, null, { rough: 0.8 }), wicker = mat(0xc49a5a, tx('wood'), { rough: 0.9, side: T.DoubleSide, rep: [3, 1] });
    const props = {
      broom,
      basket: prop([['basket', wicker], ['basketFill', mat(0xc23b2e, null, { rough: 0.5 })]]),
      book: prop([['bookCover', mat(0x7a2e2a, tx('leather'), { rough: 0.7, rep: [1, 1] })], ['bookPages', mat(0xf1e6cc, null, { rough: 0.9 })]]),
      can: prop([['can', mat(0x5f8f6e, null, { rough: 0.45, side: T.DoubleSide })]]),
      rod: prop([['rod', wood], ['rodLine', mat(0xd8473a, null, { rough: 0.5 })]]),
      bread: prop([['bread', mat(0xb8702e, null, { rough: 0.8 })]]),
      lantern: prop([['lanternMetal', mat(0x3a3530, null, { rough: 0.5 })], ['lanternGlass', glow()]]),
      mug: prop([['mug', mat(0xe9e2d4, null, { rough: 0.4, side: T.DoubleSide })], ['mugTea', mat(0x6b3f22, null, { rough: 0.2 })]]),
    };
    return { g, body, waist, legL, legR, armL, armR, head, broom, props };
  }
  function glow() {    // the lantern's warm glass: lit from inside, so it reads at dusk
    const key = 'glow|' + (LIN ? 1 : 0);
    if (!MAT[key]) { const m = new T.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffb347, emissiveIntensity: 0.9, roughness: 0.3 }); if (LIN) { m.color.convertSRGBToLinear(); m.emissive.convertSRGBToLinear(); } MAT[key] = m; }
    return MAT[key];
  }

  /* census: meshes and triangles in one villager (visible or not) */
  function count(h) {
    let meshes = 0, tris = 0;
    let shown = 0;
    const vis = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    h.g.traverse((o) => { if (o.isMesh) { meshes++; const gm = o.geometry, t = (gm.index ? gm.index.count : gm.attributes.position.count) / 3; tris += t; if (vis(o)) shown += t; } });
    return { meshes, tris, shownTris: shown };
  }

  return { make, count, LOOKS };
})();
