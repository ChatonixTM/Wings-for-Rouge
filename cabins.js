/* ═══════════════════════════════════════════════════════════════════════════
   WFR_CABINS — four old log cabins round the island (board 552 §4, from 528 §B).

   Marth, Oct 9: "We still don't have any cabins."  528: "add cabinets or drawers
   that are ajar so that it's believable the bird (us) can enter" and "these random
   various locations have old nests (these can be considered where one finds rare
   items)".

   Each cabin: a log house (interlocked corner logs with ringed ends), a darker
   shingled gable roof (0x5a3a2a), a plank door that swings, two shuttered windows,
   a stone chimney and hearth. Inside: a chest of drawers with the bottom drawer
   pulled out and a KEEPSAKE in the gap (the foothill hut: a cupboard cracked open
   25 degrees, the keepsake on its bottom shelf, as 528 §B asked), an old bird's
   nest up in the rafters above it, a cot, a table and a tin cup, a rag rug.
   Outside: a woodpile, a rain barrel, and each site's own things (the shore
   cabin's buoy and rope, Hal's oars and pail, Rook's chopping block and axe,
   June's bench, stick and window box).

   Phone cost (measured in the game, hidden vs shown): 11 draws for the cabin
   beside her + 4 shadow draws (logs, roof, stone, woodwork: the small things are
   held castShadow = false); a far cabin (> NEAR = 60 m) draws 6 (its ends, cloth,
   door and keepsake switch off). ~6.1k triangles a cabin.

   ⚠ BINDING (552 §0): no Math.random, never the game's rnd(). Every choice is a
   fixed constant or frac(salt + k·φ) on a counter. Nothing stands inside the
   mountain's ellipse (every SITE has pk ≥ 95; the bench asserts it).

   ── THE API ───────────────────────────────────────────────────────────────
   WFR_CABINS.build(THREE, k, opts) → cabin            one cabin, UNSCALED (the game scales houses by HS)
     k       the site index 0..3 into SITES (picks the extras, the keepsake, the furniture)
     opts    { renderer,                     textures (WFR_TEX) + colour space
               foundation: 0.6,              local depth of the stone footing below the floor base
               ground(lx, lz) → local y,     the terrain under a local point (props sit on it); default 0
               keepsake: id, furniture: 'drawers' | 'cupboard', variant: {...} }   (overrides of the site's)
     cabin   { g,                THREE.Group; origin = the floor base on the ground, door toward local +z
               door,             the door's hinge pivot (THREE.Group): rotation.y 0 shut, 1.4 open (swings in)
               windows,          [Mesh, Mesh] the two panes, sharing windowMat (emissive: the game lights them)
               windowMat,        the panes' MeshLambertMaterial (push into WINDOW_MATS to glow at night)
               inside,           Vector3 local: where the bird stands just inside the door (the game's d/2 − 0.9)
               entry,            Vector3 local: outside, in front of the door (the game's doorFront 1.3)
               roofTop,          local y of the ridge's top
               keepsake: { g, mount, reach, type }
                                 g: the treat group (hide it when taken); mount: Vector3 local, where it rests;
                                 reach: { x, z } local, the point the treat test measures to; type: KEEPSAKES[id]
               nest,             the old nest's group (in the rafters, over the keepsake)
               roofAt(lx, lz),   local y of the walkable top (roof, ridge) at a local point inside the footprint
               solid(lx, lz),    true when a local floor point is inside furniture (the bird walks round it)
               lookUp,           local units (1.8): raise the inside camera's look target by this (the nest in view)
               dims, stats: { meshes, triangles, drawCalls } }
   WFR_CABINS.place(THREE, ctx) → [record]             all four, placed, scaled, ready for houses[]
     ctx     { H, HS, renderer, first }      first = houses.length (12): records get i = first + k
     record  { i, g, x, z, y, rot, w, d, ht, pivot, openT: Infinity, treat, treatTaken: false, cabin: true,
               id, name, who, keepsake, reach, roofAt, solid, lookUp, windowMats, windows, found, lo, hi, stats, nest }
             g is already positioned, rotated and scaled: scene.add(record.g) and houses.push(record).
             y = the HIGHEST ground under the footprint (+0.02): the hill never pokes through the floor; the stone
             footing reaches down past the lowest (found, local). lookUp here is in WORLD metres (1.8 x HS).
             windowMats is [] for a cabin nobody lives in (SITES lit: false - the shore cabin stays dark at night).
   WFR_CABINS.SITES, .KEEPSAKES, .keepsake(id) → type | null, .TOTAL (7), .dims
   ═══════════════════════════════════════════════════════════════════════════ */
window.WFR_CABINS = (function () {
  'use strict';

  /* ── the one design (local units; the game scales a house by HS = 1.6) ── */
  const D = {
    w: 5.6, d: 5.2, ht: 3.4,  // fixed (552 §4): the game's toLocal / groundAt / walk code read these
    r: 0.2,                   // log radius: courses every 0.4
    ov: 0.5,                  // log ends run past the wall line (the notched corners)
    dw: 1.2, dh: 2.0,         // the doorway: the game walks her in through |x| < 0.6
    slope: 0.8,               // roof pitch (rise per run, ~38.7 degrees)
    eave: 0.45,               // roof past the side walls' outer face
    front: 0.8, back: 0.5,    // roof past the front (over the door) and the back gable
    roofT: 0.2,               // roof board, vertical thickness
    floorTop: 0.1,            // the game stands her at h.y + 0.1 inside
  };
  D.rx = D.w / 2 + D.r;                   // the side walls' outer face (3.0): the roof's underside passes over it at y = ht
  D.ridgeU = D.ht + D.slope * D.rx;       // the roof's underside at the ridge (5.8)
  D.ridgeTop = D.ridgeU + D.roofT;        // the roof's top at the ridge (6.0, the same as a village roof's peak)
  D.span = D.rx + D.eave;                 // the roof's half-span (3.45)
  const W2 = D.w / 2, D2 = D.d / 2;
  /* the two windows: one in the left wall (back half), one in the front wall beside the door, so its glow at night is
     what she sees as she comes up to the door. c = centre along the wall; y0/y1 sit on log joints (the front courses
     joint at 0.4k, the sides at 0.2 + 0.4k), so the cut logs and the frame agree. */
  const WIN = [
    { wall: 'left',  c: -1.0, half: 0.55, y0: 1.4, y1: 2.6, shut: 0.52 },
    { wall: 'front', c: 1.65, half: 0.5,  y0: 1.2, y1: 2.4, shut: 0.32 },
  ];
  const TABLE = { z: 1.1 };                                               // the table: on the right wall, front half
  const HEARTH = { z: 1.0, half: 0.65 };                                  // on the left wall, front half
  const CHEST = { z: -1.0 };                                              // on the right wall, back half
  const TIE = [-1.0, 1.15];                                               // tie beams across the room (z); the old nest sits on the back one
  const NEAR = 60;                                                        // world metres: the cabin's small things are drawn within this

  /* deterministic variety: frac(salt + k·φ), never a random draw */
  const PHI = 0.6180339887498949, frac = (x) => x - Math.floor(x), seq = (k, salt) => frac(salt + k * PHI);

  /* ── the keepsakes (528 §B items 2–5): they ride the fruit pipeline, and Feed reads Give ── */
  const KEEPSAKES = {
    shell:      { id: 'shell',      emoji: '\u{1F41A}', name: 'a sea shell',         gives: { swim: 3 }, keepsake: true, mark: 'a pale chest' },
    bead:       { id: 'bead',       emoji: '\u{1F535}', name: 'a blue glass bead',   gives: { run: 3 },  keepsake: true, mark: 'blue eye-rings' },
    pinecone:   { id: 'pinecone',   emoji: '\u{1F330}', name: 'a pine cone',         gives: { sta: 3 },  keepsake: true, mark: 'a tufted tail' },
    riverstone: { id: 'riverstone', emoji: '\u{1FAA8}', name: 'a dark river stone',  gives: { str: 3 },  keepsake: true, mark: 'dark wingtips' },
  };
  const keepsake = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(KEEPSAKES, id) ? KEEPSAKES[id] : null);

  /* ── the four sites, in houses[] order (12, 13, 14, 15), measured in the game's own numbers (Oct 9):
       rot is the game's house rotation (local +z, the door, faces world (sin rot, cos rot)).
         shore    (200, −150)  H 5.81  pk 394  village 350  nearest 552-list thing 18.0 (nail node)  slope 0.68  door: out to sea
         lake     (2, −76)     H 8.44  pk 311  village 165  26.8 (SPOT 💧)  lake 59.7  slope 1.12  door: toward the lake
                  (moved from 552's (20, −72): SPOT 💧 was 10.0 m off, a tree's crown on the footprint, 2.1 m of slope)
         forest   (−146, 56)   H 7.64  pk 245  village 196  69.7 (log node)  slope 1.37  door: toward the village
                  (552's (−150, 60) passes the rules but has 2.3 m of slope across the footprint)
         foothill (−32, 150)   H 9.30  pk 114  village 313  86.0 (stone node)  slope 1.34  door: toward the village
                  (552's (−40, 160) has tree #14 standing INSIDE the footprint, 4.7 m from the centre)
       The whole footprint (chimney, woodpile, barrel, step) clears every tree crown by ≥ 0.49 m and every
       trunk square by ≥ 2.8 m. ── */
  const SITES = [
    { id: 'shore',    name: 'the shore cabin',  x: 200, z: -150, rot: 2.21, keepsake: 'shell',      furniture: 'drawers',  who: null,   lit: false },
    { id: 'lake',     name: 'the lake cabin',   x: 2,   z: -76,  rot: 0.88, keepsake: 'bead',       furniture: 'drawers',  who: 'Hal',  lit: true },
    { id: 'forest',   name: 'the forest cabin', x: -146, z: 56,  rot: -3.12, keepsake: 'pinecone',  furniture: 'drawers',  who: 'Rook', lit: true },
    { id: 'foothill', name: 'the foothill hut', x: -32, z: 150,  rot: -2.76, keepsake: 'riverstone', furniture: 'cupboard', who: 'June', lit: true },
  ];
  /* what differs: the door and shutter paint, and a few things by the door */
  const VARIANT = {
    shore:    { door: 0x4f6f8a, extras: ['buoy', 'rope'] },
    lake:     { door: 0x4d6b45, extras: ['oars', 'bucket'] },
    forest:   { door: 0x6e4529, extras: ['block'] },
    foothill: { door: 0x8a3f30, extras: ['bench', 'flowers'] },
  };
  const COL = { log: 0x9a7048, roof: 0x5a3a2a, stone: 0xb9b2a6, mortar: 0x8f897e, floor: 0xb08a5e, wood: 0xa57a50, dark: 0x2a2018,
    iron: 0x3a3632, soot: 0x1c1612, glass: 0x9fd3f0, mattress: 0xd8cfb8, blanket: 0x9a3b2e, pillow: 0xece6da, nest: 0x9c8060, straw: 0xdcc47e };

  let T = null, LIN = false;
  const MAT = {};

  /* ═════════ geometry helpers ═════════ */
  function M(px, py, pz, rx, ry, rz, sx, sy, sz) {
    const o = new T.Object3D(); o.position.set(px || 0, py || 0, pz || 0); o.rotation.set(rx || 0, ry || 0, rz || 0);
    o.scale.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz); o.updateMatrix(); return o.matrix;
  }
  const rgb = (hex, k) => { const c = new T.Color(hex); if (LIN) c.convertSRGBToLinear(); const s = k == null ? 1 : k; return [c.r * s, c.g * s, c.b * s]; };
  /* merge parts [{ g, m?, col?: [r,g,b] | fn(x,y,z) → [r,g,b], face?: fn(cx,cy,cz) → [r,g,b] (one colour per triangle),
     uv?: [su, sv], swap?: bool (u <-> v) }] into one non-indexed geometry */
  function merge(parts) {
    const P = [], N = [], U = [], C = [];
    const anyC = parts.some((p) => p.col || p.face);
    for (const p of parts) {
      const g = p.g.index ? p.g.toNonIndexed() : p.g.clone();
      if (p.m) g.applyMatrix4(p.m);
      if (!g.attributes.normal) g.computeVertexNormals();
      const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
      const su = p.uv ? p.uv[0] : 1, sv = p.uv ? p.uv[1] : 1;
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
        P.push(x, y, z); N.push(na.getX(i), na.getY(i), na.getZ(i));
        let u = ua ? ua.getX(i) : 0, v = ua ? ua.getY(i) : 0; if (p.swap) { const t = u; u = v; v = t; }
        U.push(u * su, v * sv);
        if (anyC) {
          let c;
          if (p.face) { const b = i - (i % 3); c = p.face((pa.getX(b) + pa.getX(b + 1) + pa.getX(b + 2)) / 3, (pa.getY(b) + pa.getY(b + 1) + pa.getY(b + 2)) / 3, (pa.getZ(b) + pa.getZ(b + 1) + pa.getZ(b + 2)) / 3); }
          else c = typeof p.col === 'function' ? p.col(x, y, z) : (p.col || [1, 1, 1]);
          C.push(c[0], c[1], c[2]);
        }
      }
      g.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    out.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
    out.setAttribute('uv', new T.Float32BufferAttribute(U, 2));
    if (anyC) out.setAttribute('color', new T.Float32BufferAttribute(C, 3));
    out.computeBoundingSphere();
    return out;
  }
  /* an axis-aligned box from its min and max corners */
  const boxAt = (x0, y0, z0, x1, y1, z1) => ({ g: new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m: M((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2) });
  /* a rod from A to B, radius r0 at A and r1 at B, open-ended unless caps */
  function rod(A, B, r0, r1, seg, caps) {
    const a = new T.Vector3().fromArray(A), b = new T.Vector3().fromArray(B), dir = b.clone().sub(a), len = dir.length();
    const g = new T.CylinderGeometry(r1, r0, len, seg || 8, 1, !caps); g.translate(0, len / 2, 0);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    return { g, m: new T.Matrix4().compose(a, q, new T.Vector3(1, 1, 1)), len };
  }
  /* a disc of radius r at P facing along n (the end grain of a log) */
  function disc(P, n, r) {
    const g = new T.CircleGeometry(r, 10), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3().fromArray(n).normalize());
    return { g, m: new T.Matrix4().compose(new T.Vector3().fromArray(P), q, new T.Vector3(1, 1, 1)) };
  }

  /* ═════════ the module's own little textures (canvas, painted once, no randomness) ═════════ */
  let ENDS = null, SPARK = null;
  function canvasTex(S, paint, linear) {
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    paint(g, S);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
    if (LIN && !linear) t.encoding = T.sRGBEncoding;
    return t;
  }
  /* a log's sawn end: pale heartwood, growth rings, one radial check, the bark rim */
  function endTex() {
    if (ENDS) return ENDS;
    ENDS = canvasTex(64, (g, S) => {
      const img = g.createImageData(S, S), d = img.data;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = (x + 0.5) / S * 2 - 1, dy = (y + 0.5) / S * 2 - 1, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const ring = 0.5 + 0.5 * Math.sin(r * 30 + Math.sin(a * 3) * 0.7 + Math.sin(a * 7) * 0.2);
        let L = 0.9 - 0.2 * Math.pow(ring, 5) - 0.16 * r * r;
        if (r > 0.84) L = 0.38 + 0.06 * Math.sin(a * 23);   // the bark rim
        const da = Math.atan2(Math.sin(a - 0.8), Math.cos(a - 0.8));
        if (r < 0.8 && r > 0.12 && Math.abs(da) < 0.05 * (1 - r)) L *= 0.55;   // one drying check
        const i = (y * S + x) * 4; d[i] = 255 * Math.min(1, L * 1.0); d[i + 1] = 255 * Math.min(1, L * 0.8); d[i + 2] = 255 * Math.min(1, L * 0.56); d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    return ENDS;
  }
  /* a four-pointed glint over the keepsake (additive) */
  function sparkTex() {
    if (SPARK) return SPARK;
    SPARK = canvasTex(64, (g, S) => {
      const c = S / 2, rg = g.createRadialGradient(c, c, 0, c, c, c);
      rg.addColorStop(0, 'rgba(255,250,225,0.9)'); rg.addColorStop(0.18, 'rgba(255,236,180,0.35)'); rg.addColorStop(1, 'rgba(255,220,150,0)');
      g.fillStyle = rg; g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(255,252,236,0.95)';
      for (const [w, h] of [[2.2, c * 0.95], [c * 0.95, 2.2]]) { g.beginPath(); g.moveTo(c - w, c); g.lineTo(c, c - h); g.lineTo(c + w, c); g.lineTo(c, c + h); g.closePath(); g.fill(); }
    });
    return SPARK;
  }

  /* ═════════ materials (shared by key) ═════════ */
  function mat(key, hex, o, texName, renderer) {
    const k = key + ':' + hex + ':' + (texName || '') + (LIN ? 'L' : '');
    if (MAT[k]) return MAT[k];
    const m = new T.MeshLambertMaterial(Object.assign({ color: new T.Color(hex) }, o || {}));
    if (LIN) m.color.convertSRGBToLinear();
    if (texName && window.WFR_TEX && WFR_TEX.names && WFR_TEX.names.indexOf(texName) >= 0) { try { WFR_TEX.apply({ material: m }, texName, 1, 1, renderer); } catch (e) { /* plain colour */ } }
    return (MAT[k] = m);
  }

  /* ═════════ the keepsakes, modelled (local units; the bird is ~0.25 tall in here) ═════════ */
  function keepsakeModel(id, renderer) {
    const g = new T.Group(); g.name = 'keepsake:' + id;
    let geo, m, lift = 0;
    if (id === 'shell') {   // a scallop: a ribbed fan, cream with pink rays, two little ears at the hinge
      const fan = new T.RingGeometry(0.004, 0.15, 18, 4, 0, Math.PI);
      const P = fan.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), r = Math.hypot(x, y), a = Math.atan2(y, x);
        P.setZ(i, 0.055 * (1 - Math.pow(r / 0.15, 2)) + 0.007 * Math.cos(a * 18) * (r / 0.15)); }
      fan.computeVertexNormals();
      const ears = new T.BoxGeometry(0.1, 0.035, 0.012);
      geo = merge([{ g: fan, m: M(0, 0, 0, -Math.PI / 2, 0, 0), col: (x, y, z) => { const a = Math.atan2(-z, x), band = 0.5 + 0.5 * Math.cos(a * 9); return rgb(0xf3dcc8).map((v, j) => v * (1 - 0.18 * band) + (j === 0 ? 0.08 : 0) * band); } },
        { g: ears, m: M(0, 0.006, 0.012), col: rgb(0xe8cdb6) }]);
      m = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide, emissive: new T.Color(0x2a2018) });
      lift = 0.01;
    } else if (id === 'bead') {   // a blue glass bead, standing on its edge
      geo = new T.TorusGeometry(0.075, 0.055, 10, 18);
      m = new T.MeshPhongMaterial({ color: new T.Color(0x2f6fe0), emissive: new T.Color(0x0c2458), specular: new T.Color(0xcfe6ff), shininess: 90 });
      lift = 0.13;
    } else if (id === 'pinecone') {   // a pine cone lying on its side: rings of scales
      const pts = [];
      for (let i = 0; i <= 12; i++) { const y = i / 12 * 0.3, base = 0.012 + 0.085 * Math.pow(Math.sin(Math.PI * Math.min(1, y / 0.3 * 0.92 + 0.04)), 0.75); pts.push(new T.Vector2(base * (i % 2 ? 0.72 : 1), y)); }
      const lathe = new T.LatheGeometry(pts, 10);
      geo = merge([{ g: lathe, m: M(-0.15, 0.085, 0, 0, 0, -Math.PI / 2), col: (x, y, z) => { const tip = Math.hypot(y - 0.085, z) > 0.07 ? 1 : 0; return rgb(tip ? 0xa4774a : 0x6e4a2c); } }]);
      m = new T.MeshLambertMaterial({ vertexColors: true, emissive: new T.Color(0x1a120a) });
      lift = 0;
    } else {   // riverstone: a dark, smooth river stone with one pale band round it
      const s = new T.SphereGeometry(0.12, 14, 10);
      geo = merge([{ g: s, m: M(0, 0.066, 0, 0, 0.4, 0, 1.3, 0.55, 0.95), col: (x, y, z) => { const band = Math.abs(x * 0.55 + z * 0.84 - 0.02) < 0.014; return band ? rgb(0xdcd6c8) : rgb(0x3b4148, 1 + 0.15 * (y - 0.06) / 0.07); } }]);
      m = new T.MeshPhongMaterial({ vertexColors: true, specular: new T.Color(0x4a4f55), shininess: 40, emissive: new T.Color(0x101214) });
      lift = 0;
    }
    if (LIN && m.color) m.color.convertSRGBToLinear();
    const mesh = new T.Mesh(geo, m); mesh.position.y = lift; mesh.castShadow = false; mesh.receiveShadow = false; g.add(mesh);
    const spark = new T.Sprite(new T.SpriteMaterial({ map: sparkTex(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.8 }));
    spark.scale.setScalar(0.5); spark.position.set(0.04, lift + 0.2, 0.02); spark.name = 'glint';
    spark.onBeforeRender = function () { const t = (window.performance ? performance.now() : Date.now()) / 1000, k = 0.5 + 0.5 * Math.sin(t * 2.6 + id.length);
      this.material.opacity = 0.25 + 0.65 * k * k; this.scale.setScalar(0.34 + 0.22 * k); };
    g.add(spark);
    return g;
  }

  /* ═════════ build one cabin ═════════ */
  function build(THREE, k, opts) {
    T = THREE; opts = opts || {};
    const R = opts.renderer || null; LIN = !!(R && R.outputEncoding === T.sRGBEncoding);
    const site = SITES[((k | 0) % SITES.length + SITES.length) % SITES.length];
    const V = Object.assign({}, VARIANT[site.id], opts.variant || {});
    const furniture = opts.furniture || site.furniture, ksType = keepsake(opts.keepsake || site.keepsake);
    const found = opts.foundation != null ? opts.foundation : 0.6;
    const ground = typeof opts.ground === 'function' ? opts.ground : () => 0;
    const { w, d, ht, r, ov, dw, dh, slope } = D;
    const bark = [], ends = [], wood = [], stone = [], cloth = [], roofP = [];
    let logN = 0;
    const logTint = () => { const v = seq(logN++, 0.37); return rgb(COL.log, 0.86 + 0.24 * v); };

    /* a log from A to B (local), bark round it and sawn ends at both ends */
    function log(A, B, rad, tint, noEnds) {
      const L = rod(A, B, rad, rad, 8); bark.push({ g: L.g, m: L.m, col: tint || logTint(), uv: [1, L.len / 1.26] });
      if (noEnds) return;
      const n = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
      ends.push(disc(B, n, rad * 0.98)); ends.push(disc(A, n.map((v) => -v), rad * 0.98));
    }
    /* split [a0, a1] by the openings that cut a course at height y: the solid runs */
    function runs(a0, a1, y, cuts) {
      let segs = [[a0, a1]];
      for (const c of cuts) { if (!(y - r < c.y1 - 1e-6 && y + r > c.y0 + 1e-6)) continue;
        const next = []; for (const [s0, s1] of segs) { if (c.a1 <= s0 || c.a0 >= s1) { next.push([s0, s1]); continue; } if (c.a0 > s0) next.push([s0, c.a0]); if (c.a1 < s1) next.push([c.a1, s1]); }
        segs = next; }
      return segs.filter(([s0, s1]) => s1 - s0 > 0.05);
    }

    /* ── the walls: front/back courses at 0.2..3.0, the sides half a log up (0.4..3.2): notched corners ── */
    const doorCut = { a0: -dw / 2 - 0.02, a1: dw / 2 + 0.02, y0: 0, y1: dh };
    const winCut = (wall) => WIN.filter((o) => o.wall === wall).map((o) => ({ a0: o.c - o.half, a1: o.c + o.half, y0: o.y0, y1: o.y1 }));
    for (let i = 0; i < 8; i++) {
      const yf = r + 2 * r * i, ys = 2 * r + 2 * r * i;
      for (const [s0, s1] of runs(-W2 - ov, W2 + ov, yf, [doorCut].concat(winCut('front')))) log([s0, yf, D2], [s1, yf, D2], r);      // front
      log([-W2 - ov, yf, -D2], [W2 + ov, yf, -D2], r);                                                           // back
      for (const [s0, s1] of runs(-D2 - ov, D2 + ov, ys, winCut('left'))) log([-W2, ys, s0], [-W2, ys, s1], r);   // left
      for (const [s0, s1] of runs(-D2 - ov, D2 + ov, ys, winCut('right'))) log([W2, ys, s0], [W2, ys, s1], r);    // right
    }
    /* the wall plates and the roof's bones: plates on the side walls, two purlins a side and the ridge beam, all
       running out under the eaves; two tie beams across the room (the old nest sits on the back one) */
    const z0 = -D2 - D.back + 0.12, z1 = D2 + D.front - 0.12, under = (x) => D.ridgeU - slope * Math.abs(x);
    for (const s of [-1, 1]) {
      log([s * 2.7, 3.52, z0], [s * 2.7, 3.52, z1], 0.16);
      log([s * 1.45, under(1.45) - 0.15, z0], [s * 1.45, under(1.45) - 0.15, z1], 0.14);
    }
    log([0, D.ridgeU - 0.16, z0], [0, D.ridgeU - 0.16, z1], 0.16);
    for (const tz of TIE) log([-W2 + 0.05, 3.3, tz], [W2 - 0.05, 3.3, tz], 0.13, null, true);
    log([0, D.ridgeTop - 0.02, -D2 - D.back - 0.02], [0, D.ridgeTop - 0.02, D2 + D.front + 0.02], 0.12, rgb(COL.roof, 1.25), true);   // the ridge cap

    /* ── the roof: two shingled boards, sheared to the pitch (top and underside stay parallel) ── */
    const depth = d + D.front + D.back, zc = (D.front - D.back) / 2;
    for (const s of [-1, 1]) {
      const g = new T.BoxGeometry(D.span, D.roofT, depth); g.translate(s * D.span / 2, D.roofT / 2, zc);
      const sh = new T.Matrix4().set(1, 0, 0, 0, -s * slope, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1); g.applyMatrix4(sh); g.translate(0, D.ridgeU, 0);
      roofP.push({ g, uv: [depth / 3.2, -s * D.span * 1.28 / 3.2], swap: true });   // rows along the ridge, each row over the one below
    }
    /* the roof's underside, boarded (seen from inside): planks just under each board */
    for (const s of [-1, 1]) {
      const g = new T.BoxGeometry(D.span - 0.05, 0.03, depth - 0.04); g.translate(s * (D.span / 2 + 0.02), -0.016, zc);
      const sh = new T.Matrix4().set(1, 0, 0, 0, -s * slope, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1); g.applyMatrix4(sh); g.translate(0, D.ridgeU, 0);
      wood.push({ g, col: rgb(COL.wood, 0.78), uv: [D.span / 1.4, depth / 1.4] });
    }

    /* ── the gables: vertical boards from the top front/back log up to the roof ── */
    for (const s of [-1, 1]) {
      const sp = new T.Shape(); sp.moveTo(-D.rx, 3.2); sp.lineTo(D.rx, 3.2); sp.lineTo(D.rx, D.ht); sp.lineTo(0, D.ridgeU); sp.lineTo(-D.rx, D.ht); sp.closePath();
      const g = new T.ExtrudeGeometry(sp, { depth: 0.12, bevelEnabled: false }); g.translate(0, 0, s * D2 - 0.06);
      wood.push({ g, col: rgb(COL.wood, 0.92), uv: [1 / 1.5, 1 / 1.5], swap: true });
      for (let b = -2; b <= 2; b++) wood.push(Object.assign(boxAt(b * 1.05 - 0.035, 3.2, s * D2 - 0.08, b * 1.05 + 0.035, under(b * 1.05) - 0.02, s * D2 + 0.08), { col: rgb(COL.wood, 0.7) }));   // battens over the joints
    }

    /* ── the floor, the footing, the door step ── */
    wood.push(Object.assign(boxAt(-W2 + 0.02, 0.02, -D2 + 0.02, W2 - 0.02, D.floorTop, D2 - 0.02), { col: rgb(COL.floor), uv: [w / 1.6, d / 1.6] }));
    const stoneCol = (x, y, z) => rgb(COL.stone, 0.88 + 0.16 * frac(Math.sin(x * 3.1 + z * 2.3 + y * 1.7) * 43.7));
    stone.push(Object.assign(boxAt(-D.rx - 0.03, -found, -D2 - r - 0.03, D.rx + 0.03, 0.02, D2 + r + 0.03), { col: stoneCol, uv: [3, 1] }));
    for (const s of [-1, 1]) stone.push(Object.assign(boxAt(s * W2 - r, 0.0, -D2 - r, s * W2 + r, 0.22, D2 + r), { col: stoneCol, uv: [3, 0.3] }));   // sills under the side walls' first course
    { const sy = Math.max(-found + 0.05, Math.min(-0.03, Math.min(ground(-0.8, D2 + r + 0.6), ground(0.8, D2 + r + 0.6), ground(0, D2 + r + 0.3)) + 0.05));
      stone.push(Object.assign(boxAt(-0.8, -found - 0.1, D2 + r, 0.8, sy, D2 + r + 0.6), { col: stoneCol, uv: [1, 0.6] })); }   // the door stone, flush with the ground
    wood.push(Object.assign(boxAt(-dw / 2, D.floorTop - 0.02, D2 - r - 0.02, dw / 2, D.floorTop + 0.04, D2 + r + 0.02), { col: rgb(COL.wood, 0.75) }));   // the threshold

    /* ── the door frame and the door (on its pivot: rotation.y 0 shut, 1.4 open, swinging in like a village door) ── */
    for (const s of [-1, 1]) wood.push(Object.assign(boxAt(s * (dw / 2 + 0.05) - 0.06, 0.02, D2 - r - 0.03, s * (dw / 2 + 0.05) + 0.06, dh + 0.04, D2 + r + 0.03), { col: rgb(COL.wood, 0.8), uv: [0.2, 1.4], swap: true }));
    wood.push(Object.assign(boxAt(-dw / 2 - 0.16, dh, D2 - r - 0.03, dw / 2 + 0.16, dh + 0.14, D2 + r + 0.03), { col: rgb(COL.wood, 0.75), uv: [1, 0.2] }));
    const doorCol = rgb(V.door), doorParts = [];
    for (let b = 0; b < 5; b++) doorParts.push(Object.assign(boxAt(b * 0.24 + 0.004, 0, -0.035, b * 0.24 + 0.236, 1.88, 0.035), { col: doorCol.map((v) => v * (0.9 + 0.14 * seq(b, 0.2))), uv: [0.19, 1.2], swap: true }));
    for (const by of [0.32, 1.5]) doorParts.push(Object.assign(boxAt(0.06, by - 0.07, -0.085, 1.14, by + 0.07, -0.035), { col: doorCol.map((v) => v * 0.8) }));   // battens, inside
    { const br = rod([0.16, 0.4, -0.06], [1.04, 1.43, -0.06], 0.05, 0.05, 4, true); doorParts.push({ g: br.g, m: br.m, col: doorCol.map((v) => v * 0.78) }); }
    for (const hy of [0.32, 1.5]) doorParts.push(Object.assign(boxAt(0.02, hy - 0.035, 0.035, 0.5, hy + 0.035, 0.05), { col: rgb(COL.iron) }));   // hinge straps
    for (const s of [-1, 1]) { const hd = new T.TorusGeometry(0.06, 0.014, 5, 10); doorParts.push({ g: hd, m: M(1.05, 0.95, s * 0.06, 0, Math.PI / 2, 0), col: rgb(COL.iron) }); }   // a ring pull each side
    const door = new T.Group(); door.name = 'cabin:door'; door.position.set(-dw / 2, D.floorTop - 0.02, D2);
    const doorMesh = new T.Mesh(merge(doorParts), mat('door', 0xffffff, { vertexColors: true }, 'planks', R)); door.add(doorMesh);

    /* ── the windows: frames, a cross of glazing bars, shutters open against the logs; two panes (glowing at night) ── */
    const glassMat = new T.MeshLambertMaterial({ color: new T.Color(COL.glass) }); if (LIN) glassMat.color.convertSRGBToLinear();
    const windows = [];
    for (const o of WIN) {
      /* B(a0, y0, n0, a1, y1, n1): a box in the wall's own frame - a along the wall, n out from the wall's centre line */
      const B = o.wall === 'left' ? (a0, y0, n0, a1, y1, n1) => boxAt(-W2 - n1, y0, a0, -W2 - n0, y1, a1)
        : (a0, y0, n0, a1, y1, n1) => boxAt(a0, y0, D2 + n0, a1, y1, D2 + n1);
      const c = o.c, h = o.half, ym = (o.y0 + o.y1) / 2, fr = rgb(COL.wood, 0.85), shut = rgb(V.door);
      wood.push(Object.assign(B(c - h - 0.08, o.y0 - 0.02, -0.3, c + h + 0.08, o.y0 + 0.08, 0.3), { col: fr }));     // the sill
      wood.push(Object.assign(B(c - h - 0.04, o.y1 - 0.08, -0.24, c + h + 0.04, o.y1 + 0.02, 0.24), { col: fr }));   // the head
      for (const e of [-1, 1]) wood.push(Object.assign(B(c + e * h - 0.05, o.y0, -0.24, c + e * h + 0.05, o.y1, 0.24), { col: fr }));   // jambs
      wood.push(Object.assign(B(c - 0.03, o.y0 + 0.08, -0.035, c + 0.03, o.y1 - 0.08, 0.035), { col: fr }));          // glazing bars
      wood.push(Object.assign(B(c - h, ym - 0.03, -0.035, c + h, ym + 0.03, 0.035), { col: fr }));
      for (const e of [-1, 1]) { const a0 = c + e * (h + 0.06), a1 = c + e * (h + 0.06 + o.shut);   // shutters, open flat against the logs
        wood.push(Object.assign(B(Math.min(a0, a1), o.y0 + 0.02, r + 0.005, Math.max(a0, a1), o.y1 - 0.02, r + 0.055), { col: shut.map((v) => v * (0.92 + 0.1 * e)), uv: [o.shut / 1.3, 1], swap: true })); }
      const pane = new T.Mesh(o.wall === 'left' ? new T.BoxGeometry(0.04, o.y1 - o.y0 - 0.16, 2 * h - 0.1) : new T.BoxGeometry(2 * h - 0.1, o.y1 - o.y0 - 0.16, 0.04), glassMat);
      if (o.wall === 'left') pane.position.set(-W2, ym, c); else pane.position.set(c, ym, D2);
      pane.name = 'cabin:window:' + o.wall; windows.push(pane);
    }

    /* ── the chimney (outside the left wall) and the hearth (inside it) ── */
    const cx0 = -D.rx - 1.0, cx1 = -D.rx + 0.02, hz0 = HEARTH.z - HEARTH.half, hz1 = HEARTH.z + HEARTH.half;
    stone.push(Object.assign(boxAt(cx0, -found, hz0, cx1, 2.5, hz1), { col: stoneCol, uv: [1.2, 2.2] }));
    { const sh = new T.CylinderGeometry(0.58, 0.82, 0.7, 4, 1); sh.rotateY(Math.PI / 4); sh.scale(1.0, 1, 1.15); stone.push({ g: sh, m: M((cx0 + cx1) / 2 - 0.05, 2.85, HEARTH.z), col: stoneCol, uv: [1.5, 0.6] }); }   // the shoulder
    stone.push(Object.assign(boxAt(cx0 + 0.2, 3.2, HEARTH.z - 0.42, cx1 - 0.15, 6.55, HEARTH.z + 0.42), { col: stoneCol, uv: [0.8, 3] }));
    stone.push(Object.assign(boxAt(cx0 + 0.1, 6.55, HEARTH.z - 0.52, cx1 - 0.05, 6.68, HEARTH.z + 0.52), { col: (x, y, z) => rgb(COL.mortar), uv: [1, 0.2] }));
    stone.push(Object.assign(boxAt(cx0 + 0.36, 6.6, HEARTH.z - 0.26, cx1 - 0.31, 6.69, HEARTH.z + 0.26), { col: rgb(COL.soot) }));   // the flue
    const hx0 = -W2 + r - 0.02, hx1 = -1.95, soot = rgb(COL.soot);
    stone.push(Object.assign(boxAt(hx0, D.floorTop, HEARTH.z - 0.35, -2.42, 1.45, HEARTH.z + 0.35), { col: soot }));                  // the fire-back
    for (const e of [-1, 1]) stone.push(Object.assign(boxAt(hx0, D.floorTop, e < 0 ? hz0 : HEARTH.z + 0.32, hx1, 1.45, e < 0 ? HEARTH.z - 0.32 : hz1), { col: stoneCol, uv: [0.6, 1] }));   // cheeks
    stone.push(Object.assign(boxAt(hx0, 0.86, HEARTH.z - 0.33, hx1, 1.45, HEARTH.z + 0.33), { col: stoneCol, uv: [0.6, 0.5] }));   // lintel
    stone.push(Object.assign(boxAt(hx1, D.floorTop - 0.01, hz0 - 0.1, hx1 + 0.42, D.floorTop + 0.05, hz1 + 0.1), { col: stoneCol, uv: [0.4, 1.2] }));   // the apron
    wood.push(Object.assign(boxAt(hx0, 1.45, hz0 - 0.08, hx1 + 0.12, 1.53, hz1 + 0.08), { col: rgb(COL.wood, 0.7) }));   // the mantel
    for (const [lz, ly] of [[HEARTH.z - 0.12, 0.2], [HEARTH.z + 0.1, 0.22], [HEARTH.z, 0.33]]) log([-2.35, ly, lz - 0.16], [-2.0, ly + 0.03, lz + 0.16], 0.07, rgb(0x2b2119), true);   // cold logs, charred
    { const jar = new T.CylinderGeometry(0.08, 0.09, 0.2, 8); wood.push({ g: jar, m: M(-2.3, 1.63, HEARTH.z + 0.35), col: rgb(0x6f8aa0) }); }

    /* ── the old nest, up on the back tie beam over the keepsake ── */
    const nest = new T.Group(); nest.name = 'cabin:nest';
    const NX = 1.5, NZ = TIE[0], NY = 3.3 + 0.13 + 0.06;   // on the back tie beam, on a pad of straw
    { const parts = [], tw = rgb(COL.nest), st = rgb(COL.straw);
      parts.push({ g: new T.CylinderGeometry(0.3, 0.22, 0.1, 10), m: M(NX, NY - 0.03, NZ), col: st.map((v) => v * 0.85) });   // the straw pad
      parts.push({ g: new T.TorusGeometry(0.38, 0.15, 6, 16), m: M(NX, NY + 0.09, NZ, Math.PI / 2, 0, 0, 1, 1, 0.62), col: (x, y, z) => tw.map((v) => v * (0.82 + 0.3 * frac(Math.sin(x * 41 + z * 37) * 91.3))), uv: [4, 1] });
      parts.push({ g: new T.SphereGeometry(0.32, 10, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m: M(NX, NY + 0.13, NZ, 0, 0, 0, 1, 0.42, 1), col: tw.map((v) => v * 0.55) });   // the bowl
      for (let i = 0; i < 16; i++) { const a = i * 2.39996, rr = 0.32 + 0.05 * seq(i, 0.6), up = 0.02 + 0.12 * seq(i, 0.1), out = 0.12 + 0.16 * seq(i, 0.8);
        const A = [NX + Math.cos(a) * rr * 0.8, NY + 0.06, NZ + Math.sin(a) * rr * 0.8], B = [NX + Math.cos(a + 0.5) * (rr + out), NY + 0.06 + up, NZ + Math.sin(a + 0.5) * (rr + out)];
        const t = rod(A, B, 0.02, 0.01, 4); parts.push({ g: t.g, m: t.m, col: i % 2 === 0 ? st : tw }); }   // twigs and straw poking out
      bark.push(...parts); }

    /* ── the furniture (local: the right wall's inner face is x = 2.6) ── */
    const IN = W2 - r, fw = rgb(COL.wood), fwD = rgb(COL.wood, 0.8), knob = rgb(COL.dark);
    const solids = [];   // [x0, z0, x1, z1] footprints the bird walks round
    let mount, reach;
    if (furniture === 'cupboard') {
      /* a tall cupboard, its door cracked open 25 degrees (hinged at the front edge, swung out), a stone on the bottom shelf */
      const X0 = IN - 0.6, Z0 = CHEST.z - 0.55, Z1 = CHEST.z + 0.55, TOP = 1.95;
      wood.push(Object.assign(boxAt(X0, TOP - 0.06, Z0 - 0.04, IN, TOP, Z1 + 0.04), { col: fwD }));           // top
      wood.push(Object.assign(boxAt(X0 + 0.02, D.floorTop, Z0 - 0.04, IN, 0.2, Z1 + 0.04), { col: fwD }));    // plinth
      for (const zz of [Z0 - 0.04, Z1]) wood.push(Object.assign(boxAt(X0, D.floorTop, zz, IN, TOP - 0.06, zz + 0.04), { col: fw, uv: [0.4, 1.4], swap: true }));   // sides
      wood.push(Object.assign(boxAt(IN - 0.04, 0.2, Z0, IN, TOP - 0.06, Z1), { col: rgb(COL.wood, 0.42) }));  // back (in its own shadow)
      for (const sy of [0.2, 0.82, 1.38]) wood.push(Object.assign(boxAt(X0 + 0.04, sy, Z0, IN - 0.04, sy + 0.04, Z1), { col: fw }));   // shelves
      for (let j = 0; j < 3; j++) { const jar = new T.CylinderGeometry(0.07, 0.08, 0.22 + 0.06 * seq(j, 0.4), 8); wood.push({ g: jar, m: M(IN - 0.25, 0.86 + 0.13, Z0 + 0.45 + j * 0.24), col: rgb([0x8aa07a, 0xb07a52, 0x7f93a8][j]) }); }   // jars on the middle shelf
      const dg = new T.Group(); dg.position.set(X0, 0.2, Z1); dg.rotation.y = 25 * Math.PI / 180;   // hinge at the front edge; the free edge swings OUT into the room (+y turns the -z edge toward -x)
      const dp = [Object.assign(boxAt(-0.04, 0, -1.1, 0, TOP - 0.3, 0), { col: doorCol, uv: [1, 1.4], swap: true }),
        Object.assign(boxAt(-0.05, 0.25, -1.0, -0.04, 0.4, -0.1), { col: doorCol.map((v) => v * 0.8) }), Object.assign(boxAt(-0.05, 1.2, -1.0, -0.04, 1.35, -0.1), { col: doorCol.map((v) => v * 0.8) })];
      const kn = new T.SphereGeometry(0.04, 6, 4); dp.push({ g: kn, m: M(-0.08, 0.85, -0.98), col: knob });
      dg.updateMatrix(); for (const p of dp) { const m4 = new T.Matrix4().multiplyMatrices(dg.matrix, p.m || new T.Matrix4()); wood.push(Object.assign({}, p, { m: m4 })); }
      mount = new T.Vector3(IN - 0.3, 0.24, CHEST.z - 0.38);   // in the crack: seen past the door's free edge from the corner camera
      reach = { x: X0 - 0.4, z: CHEST.z - 0.3 };   // in front of the crack, where her beak goes in (the door's swing is solid)
      solids.push([X0 - 0.5, Z0 - 0.1, IN, Z1 + 0.1]);
    } else {
      /* a chest of drawers, the bottom drawer pulled out (0.3 m of its 0.62), the keepsake in the gap */
      const X0 = IN - 0.62, Z0 = CHEST.z - 0.62, Z1 = CHEST.z + 0.62, TOP = 1.32, PO = 0.3;
      wood.push(Object.assign(boxAt(X0 - 0.03, TOP, Z0 - 0.04, IN, TOP + 0.06, Z1 + 0.04), { col: fwD }));    // top
      for (const zz of [Z0, Z1 - 0.05]) wood.push(Object.assign(boxAt(X0, D.floorTop, zz, IN, TOP, zz + 0.05), { col: fw, uv: [0.5, 1.2], swap: true }));   // sides
      wood.push(Object.assign(boxAt(IN - 0.04, 0.14, Z0, IN, TOP, Z1), { col: rgb(COL.wood, 0.55) }));        // back
      for (const fx of [X0 + 0.03, IN - 0.08]) for (const fz of [Z0 + 0.03, Z1 - 0.08]) wood.push(Object.assign(boxAt(fx, D.floorTop, fz, fx + 0.05, 0.16, fz + 0.05), { col: fwD }));   // feet
      wood.push(Object.assign(boxAt(X0, 0.14, Z0 + 0.05, IN - 0.04, 0.16, Z1 - 0.05), { col: fwD }));        // the carcass floor
      wood.push(Object.assign(boxAt(X0 + 0.02, 0.17, Z0 + 0.05, IN - 0.05, 0.5, Z1 - 0.05), { col: rgb(COL.soot, 1.5) }));   // the empty slot's dark, behind the open drawer
      for (const ry of [0.51, 0.91]) wood.push(Object.assign(boxAt(X0 - 0.01, ry, Z0 + 0.04, X0 + 0.04, ry + 0.03, Z1 - 0.04), { col: fwD }));   // rails
      const front = (x, y0, y1) => { wood.push(Object.assign(boxAt(x - 0.04, y0, Z0 + 0.06, x, y1, Z1 - 0.06), { col: fw.map((v) => v * 1.04) }));
        for (const kz of [CHEST.z - 0.3, CHEST.z + 0.3]) { const kg = new T.SphereGeometry(0.035, 6, 4); wood.push({ g: kg, m: M(x - 0.06, (y0 + y1) / 2, kz), col: knob }); } };
      front(X0, 0.94, 1.3); front(X0, 0.54, 0.9);
      /* the open drawer: its front pulled out, its sides and bottom showing, the keepsake inside the gap */
      const fx = X0 - PO;
      front(fx, 0.17, 0.5);
      for (const sz of [Z0 + 0.07, Z1 - 0.1]) wood.push(Object.assign(boxAt(fx, 0.18, sz, X0 + 0.32, 0.42, sz + 0.03), { col: fw.map((v) => v * 0.95) }));   // drawer sides
      wood.push(Object.assign(boxAt(fx, 0.17, Z0 + 0.07, X0 + 0.32, 0.19, Z1 - 0.07), { col: rgb(COL.wood, 0.7) }));   // drawer bottom
      mount = new T.Vector3(fx + 0.15, 0.19, CHEST.z + 0.05);
      reach = { x: mount.x, z: mount.z };
      solids.push([fx - 0.06, Z0 - 0.05, IN, Z1 + 0.05]);
    }
    /* the cot along the back wall, under the corner the game's camera looks down from */
    { const X0 = -W2 + r + 0.05, X1 = -0.9, Z0 = -D2 + r + 0.05, Z1 = Z0 + 0.82;
      for (const lx of [X0 + 0.04, X1 - 0.1]) for (const lz of [Z0 + 0.02, Z1 - 0.08]) wood.push(Object.assign(boxAt(lx, D.floorTop, lz, lx + 0.07, 0.42, lz + 0.07), { col: fwD }));
      for (const lz of [Z0, Z1 - 0.06]) wood.push(Object.assign(boxAt(X0, 0.26, lz, X1, 0.36, lz + 0.06), { col: fw }));
      wood.push(Object.assign(boxAt(X0, 0.48, Z0, X0 + 0.07, 0.75, Z1), { col: fwD }));   // the head board
      cloth.push(Object.assign(boxAt(X0 + 0.04, 0.34, Z0 + 0.03, X1 - 0.02, 0.48, Z1 - 0.03), { col: rgb(COL.mattress), uv: [3, 1] }));
      cloth.push(Object.assign(boxAt(X1 - 0.62, 0.47, Z0 + 0.0, X1 + 0.02, 0.56, Z1 + 0.01), { face: (x, y, z) => rgb(((Math.floor(x * 9) + Math.floor(z * 9)) & 1) ? COL.blanket : 0x6e2a22) }));   // a folded blanket
      { const pw = new T.SphereGeometry(0.2, 10, 6); cloth.push({ g: pw, m: M(X0 + 0.3, 0.54, (Z0 + Z1) / 2, 0, 0, 0, 1.1, 0.4, 1.3), col: rgb(COL.pillow) }); }
      solids.push([X0, Z0, X1, Z1]); }
    /* a small table under the right window, a tin cup and a candle on it */
    { const X0 = IN - 0.7, X1 = IN - 0.04, Z0 = TABLE.z - 0.5, Z1 = TABLE.z + 0.5, TY = 0.9;
      wood.push(Object.assign(boxAt(X0 - 0.04, TY, Z0 - 0.04, X1, TY + 0.06, Z1 + 0.04), { col: fw, uv: [1, 0.5] }));
      for (const lx of [X0, X1 - 0.07]) for (const lz of [Z0, Z1 - 0.07]) wood.push(Object.assign(boxAt(lx, D.floorTop, lz, lx + 0.07, TY, lz + 0.07), { col: fwD }));
      const cup = new T.CylinderGeometry(0.07, 0.06, 0.14, 10); wood.push({ g: cup, m: M(X0 + 0.25, TY + 0.13, Z0 + 0.3), col: rgb(0x8c8f93) });
      const cd = new T.CylinderGeometry(0.045, 0.05, 0.22, 8); wood.push({ g: cd, m: M(X0 + 0.32, TY + 0.17, Z1 - 0.25), col: rgb(0xefe6cc) });
      const holder = new T.CylinderGeometry(0.1, 0.11, 0.03, 10); wood.push({ g: holder, m: M(X0 + 0.32, TY + 0.075, Z1 - 0.25), col: rgb(COL.iron) });
      solids.push([X0 - 0.1, Z0 - 0.1, IN, Z1 + 0.1]); }
    solids.push([hx0 - 0.1, hz0 - 0.15, hx1 + 0.1, hz1 + 0.15]);   // the hearth
    /* the rag rug: braided rings, one colour per triangle */
    { const rug = new T.RingGeometry(0.02, 1.0, 32, 11); const bands = [0x7a4a3c, 0xbfae8c, 0x5f7080, 0xa98250, 0x6a7252, 0xbfae8c, 0x84503e, 0x5f7080, 0xa98250, 0x6e5446, 0x5a4034];
      cloth.push({ g: rug, m: M(-0.2, D.floorTop + 0.012, 0.25, -Math.PI / 2, 0, 0, 1.25, 0.85, 1), face: (x, y, z) => { const u = (x + 0.2) / 1.25, v = (z - 0.25) / 0.85, rr = Math.hypot(u, v), a = Math.atan2(v, u);
        return rgb(bands[Math.min(10, Math.floor(rr * 11))], 0.92 + 0.12 * ((Math.floor(a * 5.1 + rr * 11) & 1))); }, uv: [4, 4] }); }   // a braided rag rug: coils, the braid's light and dark

    /* ── outside: a woodpile on the back wall (on the real ground), the rain barrel, the site's own things ── */
    { const by = Math.max(-found + 0.1, Math.min(0, ground(0, -D2 - r - 0.4))) - 0.05;
      for (let row = 0; row < 3; row++) for (let i = 0; i < 7 - row; i++) {
        const lx = -1.7 + i * 0.4 + row * 0.2 + 0.03 * (seq(i + row * 7, 0.3) - 0.5), lz = -D2 - r - 0.45, ly = by + 0.16 + row * 0.28;
        log([lx, ly, lz - 0.35], [lx, ly, lz + 0.33], 0.14 + 0.02 * seq(i + row * 7, 0.9)); } }
    { const bx = D.rx + 0.5, bz = -D2 + 0.75, gy = Math.max(-found, Math.min(0, ground(bx, bz)));
      const st = new T.CylinderGeometry(0.4, 0.36, 1.0, 12, 1, true); wood.push({ g: st, m: M(bx, gy + 0.5, bz), col: rgb(COL.wood, 0.85), uv: [3, 1], swap: true });
      const bot = new T.CircleGeometry(0.4, 12); wood.push({ g: bot, m: M(bx, gy + 0.85, bz, -Math.PI / 2, 0, 0), col: rgb(0x3d5260) });   // rain water, up to here
      for (const hy of [0.15, 0.85]) { const hp = new T.TorusGeometry(0.385 + (hy > 0.5 ? 0.01 : 0.02), 0.022, 4, 16); wood.push({ g: hp, m: M(bx, gy + hy, bz, Math.PI / 2, 0, 0), col: rgb(COL.iron) }); }
      solids.push([bx - 0.5, bz - 0.5, bx + 0.5, bz + 0.5]); }
    for (const ex of V.extras || []) {
      if (ex === 'buoy') {   // a red and white float hanging right of the door
        const b = new T.SphereGeometry(0.22, 12, 8); wood.push({ g: b, m: M(-2.0, 1.25, D2 + r + 0.22), face: (x, y) => rgb(y > 1.25 ? 0xd8392f : 0xf2efe8) });
        const cord = rod([-2.0, 1.47, D2 + r + 0.22], [-2.0, 1.85, D2 + r + 0.05], 0.015, 0.015, 4); wood.push({ g: cord.g, m: cord.m, col: rgb(0xcdb48a) });
      } else if (ex === 'rope') {   // a coil of rope on a peg, left of the door
        const c = new T.TorusGeometry(0.25, 0.05, 6, 16); cloth.push({ g: c, m: M(-1.15, 1.35, D2 + r + 0.06, 0, 0, 0, 1, 1.15, 0.6), col: rgb(0xc9a76a), uv: [6, 1] });
      } else if (ex === 'oars') {   // a pair of oars leaning by the door
        for (const [ox, lean] of [[-1.15, 0.16], [-1.45, 0.2]]) {
          const gy = Math.max(-found, Math.min(0, ground(ox + 0.55, D2 + r + 0.45)));
          const sh = rod([ox + 0.3 + lean, gy, D2 + r + 0.42], [ox, gy + 2.4, D2 + r + 0.08], 0.04, 0.035, 6, true); wood.push({ g: sh.g, m: sh.m, col: rgb(0xc89a62) });
          const bl = new T.BoxGeometry(0.26, 0.8, 0.035); bl.translate(0, 0.42, 0); wood.push({ g: bl, m: sh.m, col: rgb(0xb88a55) }); }   // the blade, along the shaft's foot
      } else if (ex === 'bucket') {   // an upturned pail
        const gy = Math.max(-found, Math.min(0, ground(1.3, D2 + r + 0.6)));
        const pl = new T.CylinderGeometry(0.17, 0.22, 0.34, 10); wood.push({ g: pl, m: M(1.3, gy + 0.17, D2 + r + 0.6), col: rgb(0x8c8f93) });
      } else if (ex === 'block') {   // a chopping block with an axe in it
        const bx = -D.rx - 0.95, bz = -D2 - 0.1, gy = Math.max(-found, Math.min(0, ground(bx, bz)));
        log([bx, gy - 0.1, bz], [bx, gy + 0.55, bz], 0.3);
        const hd = rod([bx - 0.05, gy + 0.6, bz], [bx + 0.35, gy + 1.15, bz + 0.2], 0.03, 0.028, 6, true); wood.push({ g: hd.g, m: hd.m, col: rgb(0xc89a62) });
        wood.push({ g: new T.BoxGeometry(0.06, 0.16, 0.24), m: M(bx - 0.06, gy + 0.6, bz - 0.02, 0, 0.5, 0.95), col: rgb(0x6b6f73) });
        solids.push([bx - 0.4, bz - 0.4, bx + 0.4, bz + 0.4]);
      } else if (ex === 'bench') {   // a plank bench beside the door, a walking stick against it
        const gy = Math.max(-found, Math.min(0, ground(-1.6, D2 + r + 0.45)));
        wood.push(Object.assign(boxAt(-2.3, gy + 0.42, D2 + r + 0.25, -0.95, gy + 0.48, D2 + r + 0.65), { col: fw, uv: [1, 0.3] }));
        for (const lx of [-2.2, -1.1]) wood.push(Object.assign(boxAt(lx, gy, D2 + r + 0.3, lx + 0.07, gy + 0.42, D2 + r + 0.6), { col: fwD }));
        const stick = rod([-0.85, gy, D2 + r + 0.75], [-0.98, gy + 1.5, D2 + r + 0.3], 0.03, 0.025, 6, true); wood.push({ g: stick.g, m: stick.m, col: rgb(0x7a5232) });
      } else if (ex === 'flowers') {   // a window box under the front window, outside
        const o = WIN[1], bz = D2 + r + 0.16;
        wood.push(Object.assign(boxAt(o.c - o.half, o.y0 - 0.32, bz - 0.14, o.c + o.half, o.y0 - 0.06, bz + 0.14), { col: rgb(V.door) }));
        for (let i = 0; i < 7; i++) { const fx = o.c - o.half + 0.08 + i * 0.14, fl = new T.IcosahedronGeometry(0.075, 0);
          wood.push({ g: fl, m: M(fx, o.y0 + 0.02, bz + 0.02 * (i % 2)), col: rgb([0xe0533c, 0xf2c230, 0xf3f0e8, 0xd94f8a][i % 4]) }); }
      }
    }

    /* ── assemble: one mesh per material ── */
    const g = new T.Group(); g.name = 'cabin:' + site.id;
    const meshes = [], add = (geo, m, name) => { const o = new T.Mesh(geo, m); o.name = name; g.add(o); meshes.push(o); return o; };
    add(merge(bark), mat('bark', 0xffffff, { vertexColors: true }, 'bark', R), 'cabin:logs');
    add(merge(ends), mat('ends', 0xffffff, { map: endTex() }), 'cabin:ends');
    add(merge(roofP), mat('roof', COL.roof, null, 'roofTiles', R), 'cabin:roof');
    add(merge(wood), mat('wood', 0xffffff, { vertexColors: true }, 'planks', R), 'cabin:wood');
    add(merge(stone), mat('stone', 0xffffff, { vertexColors: true }, 'stone', R), 'cabin:stone');
    add(merge(cloth), mat('cloth', 0xffffff, { vertexColors: true }, 'cloth', R), 'cabin:cloth');
    for (const p of windows) { g.add(p); meshes.push(p); }
    g.add(door); meshes.push(doorMesh);
    /* the small things cast no shadow: only the logs, roof, stone and woodwork do (4 shadow draws a cabin, not 10). The
       game's one-time traverse sets castShadow on every mesh in the scene, so the flag is held false here. */
    const noShadow = (o) => { if (o.isMesh) Object.defineProperty(o, 'castShadow', { get: () => false, set: () => {}, configurable: true }); };
    for (const o of meshes) if (o.name === 'cabin:ends' || o.name === 'cabin:cloth') noShadow(o);
    windows.forEach(noShadow); noShadow(doorMesh);
    /* the keepsake: g is the TREAT (hide it when taken). It rests at `mount`; the html's doors() bobs a village treat at
       y = 0.7 ± 0.08, so the keepsake hangs in a holder 0.7 below the mount (if doors() bobs it anyway, it stays put
       within ±0.08; with the !h.cabin guard it never moves). */
    const holder = new T.Group(); holder.position.set(mount.x, mount.y - 0.7, mount.z); g.add(holder);
    const treat = keepsakeModel(ksType.id, R); treat.position.set(0, 0.7, 0); holder.add(treat); treat.traverse(noShadow);
    nest.position.set(0, 0, 0); g.add(nest);   // (the nest's twigs are merged into the logs; this group marks where it is)
    /* NEAR THINGS: the log ends, the cloth, the door and the keepsake are drawn only within NEAR metres of the camera
       (far off they are a few pixels inside a fogged cabin): 11 draws near, 6 far. The logs mesh is drawn whenever the
       cabin is in view, so its onBeforeRender is the switch (a perspective camera only; one frame late at most). The
       keepsake's holder is switched, never the treat itself (the game owns treat.visible: taken). */
    const logsMesh = meshes.find((o) => o.name === 'cabin:logs'), nearOnes = meshes.filter((o) => o.name === 'cabin:ends' || o.name === 'cabin:cloth').concat([doorMesh, holder]);
    const camAt = new T.Vector3(), cabAt = new T.Vector3(); let nearNow = true;
    logsMesh.onBeforeRender = function (rr, sc, cam) {
      if (!cam || !cam.isPerspectiveCamera) return;
      camAt.setFromMatrixPosition(cam.matrixWorld); cabAt.setFromMatrixPosition(g.matrixWorld);
      const on = camAt.distanceTo(cabAt) < NEAR;
      if (on !== nearNow) { nearNow = on; for (const o of nearOnes) o.visible = on; }
    };
    nest.userData.at = new T.Vector3(NX, NY + 0.1, NZ);
    let tris = 0; for (const o of meshes) { const pa = o.geometry.attributes.position; tris += o.geometry.index ? o.geometry.index.count / 3 : pa.count / 3; }
    treat.traverse((o) => { if (o.isMesh) { meshes.push(o); tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });

    /* the walkable top inside the footprint (the html's groundAt): the roof boards and the ridge cap */
    const roofAt = (lx, lz) => Math.max(D.ridgeU + D.roofT - slope * Math.abs(lx), Math.abs(lx) < 0.12 ? D.ridgeTop + 0.1 : -Infinity);
    const solid = (lx, lz) => solids.some(([x0, z0, x1, z1]) => lx > x0 - 0.18 && lx < x1 + 0.18 && lz > z0 - 0.18 && lz < z1 + 0.18);
    return {
      g, door, windows, windowMat: glassMat, inside: new T.Vector3(0, D.floorTop, D2 - 0.9), entry: new T.Vector3(0, 0, D2 + 1.3), roofTop: D.ridgeTop + 0.1,
      keepsake: { g: treat, mount: mount.clone(), reach, type: ksType }, nest, roofAt, solid, solids, lookUp: 1.8,
      site, dims: Object.assign({}, D), stats: { meshes: meshes.length, triangles: Math.round(tris), drawCalls: meshes.length + 1 /* + the glint */ },
    };
  }

  /* ═════════ place all four, as the game's houses[] records ═════════ */
  function place(THREE, ctx) {
    T = THREE; ctx = ctx || {};
    const H = ctx.H, HS = ctx.HS || 1.6, first = ctx.first == null ? 12 : ctx.first;
    if (typeof H !== 'function') throw new Error('WFR_CABINS.place: ctx.H (the terrain height) is required');
    return SITES.map((s, k) => {
      const c = Math.cos(s.rot), sn = Math.sin(s.rot);
      const toW = (lx, lz) => ({ x: s.x + (lx * c + lz * sn) * HS, z: s.z + (-lx * sn + lz * c) * HS });   // the game's toWorld
      /* the floor base sits on the HIGHEST ground under the footprint (the hill never pokes through the floor); the stone
         footing reaches down past the lowest */
      let hi = -1e9, lo = 1e9;
      for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const p = toW(-D.rx + 2 * D.rx * i / 6, -D2 - D.r + (D.d + 2 * D.r) * j / 6), h = H(p.x, p.z); hi = Math.max(hi, h); lo = Math.min(lo, h); }
      const y = hi + 0.02, found = (y - lo) / HS + 0.35;
      const ground = (lx, lz) => { const p = toW(lx, lz); return (H(p.x, p.z) - y) / HS; };
      const cab = build(THREE, k, { renderer: ctx.renderer, foundation: found, ground });
      cab.g.scale.setScalar(HS); cab.g.position.set(s.x, y, s.z); cab.g.rotation.y = s.rot;
      cab.door.rotation.y = 1.4;   // always open (openT Infinity): open from the first frame
      return {
        i: first + k, g: cab.g, x: s.x, z: s.z, y, rot: s.rot, w: D.w, d: D.d, ht: D.ht, pivot: cab.door, openT: Infinity,
        treat: cab.keepsake.g, treatTaken: false, cabin: true, id: s.id, name: s.name, who: s.who, keepsake: cab.keepsake.type,
        reach: cab.keepsake.reach, roofAt: cab.roofAt, solid: cab.solid, lookUp: cab.lookUp * HS /* world metres */, windows: cab.windows,
        windowMats: s.lit === false ? [] : [cab.windowMat], found, lo, hi, stats: cab.stats, nest: cab.nest,
      };
    });
  }

  return { build, place, SITES, KEEPSAKES, keepsake, TOTAL: 7, dims: D, VARIANT };
})();
