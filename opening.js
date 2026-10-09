/* ═══════════════════════════════════════════════════════════════════════════
   WFR_OPENING — the parchment legend that opens Wings for Rouge (board 530/543;
   Oct 9 2026).

   Marth: "need to make the opening like link wind waker, the cinematics for the
   slide show". Before that: "make the slideshow look much more 'realistic'".

   SIX WOODCUTS on one parchment strip (Itachi, BRIEF_530_543 §A): the six beats
   of the story, drawn in the hand of the history book (pictograms.js): the same
   paper, the same dark ink, the same tile recipe (every hatch tile is laid on
   paper), thick strokes, hatching instead of gradients, light as negative space.
   The one difference: the SPOT INK is the colour of the bird she chose. It is
   used for the birds of her kind and nothing else (her mother, the little one,
   the three feathers, the flock), so the eye always finds them.

   ⚠ CARE. The mother is drawn tenderly, in the player's own colours. Beat 3
   shows only the hawk's shadow passing over the storm and three feathers rising
   on the wind toward a break in the clouds. No strike, no fall, no wound, no
   body. The wind carries her away; she is never shown hurt.

   The captions are NOT here: the game types them beneath, unchanged. No SVG text
   element, no SVG filter element, ≤ 12 KB a scene, every id namespaced per
   scene (wo2-hatch in a lone scene, ws2-hatch inside the strip), so a scene and
   the strip can share one document without one borrowing the other's patterns.

   API (pure strings, no THREE, no DOM — loads in the page and in Node)
     WFR_OPENING.ink                    { paper, dark } (the book's, WFR_PICTO.ink)
     WFR_OPENING.count                  6
     WFR_OPENING.labels                 six short descriptions (aria-label)
     WFR_OPENING.coloursFor(birdDef)    a BIRDS entry (numbers) → { body, wing,
                                        mask, chest, beakDark } as CSS hex
     WFR_OPENING.scene(i, colours, opts)  <svg viewBox="0 0 400 300"> for beat i (0–5)
     WFR_OPENING.strip(colours, opts)     <svg viewBox="0 0 2400 300">, the six side
                                          by side, one 400-wide cell per beat
   colours: the coloursFor() result (a raw BIRDS entry is converted for you);
   omitted, the cardinal. opts.frame === false drops the double rule and mat
   (the art bleeds to the edge, for a camera that scales in on the hold);
   opts.id overrides the id prefix.
   ═══════════════════════════════════════════════════════════════════════════ */
const WFR_OPENING = (function () {
  'use strict';

  const ink = { paper: '#e9dcc0', dark: '#3a2414' };
  const P = ink.paper, D = ink.dark;
  const r1 = v => Math.round(v * 10) / 10;
  const hex = n => '#' + ('00000' + (Number(n) >>> 0).toString(16)).slice(-6);
  const lum = h => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };
  const CARDINAL = { body: 0xc8202f, wing: 0xa8182a, beak: 0xf28c28, mask: true };

  function coloursFor(b) {
    b = b || CARDINAL;
    return {
      body: hex(b.body), wing: hex(b.wing != null ? b.wing : b.body), mask: !!b.mask,
      chest: b.chest != null ? hex(b.chest) : null,              // the blue jay's pale breast: left as paper
      beakDark: b.beak != null ? lum(hex(b.beak)) < 0.3 : false  // a dark beak is cut in ink, a light one left as paper
    };
  }

  /* ── the woodcut tiles: the book's recipe (pictograms.js), each laid on paper,
     plus three bare ones (the shade over the spot ink, the rain cut as paper,
     the drizzle drawn in ink) and the parchment grain, baked once. ── */
  const tile = (id, w, h, rot, inner, bare) =>
    `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${rot ? ` patternTransform="rotate(${rot})"` : ''}>` +
    (bare ? '' : `<rect width="${w}" height="${h}" fill="${P}"/>`) + inner + '</pattern>';
  let seed = 11;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  let fib = '', speck = '';
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI, l = 3 + rnd() * 5;
    fib += `M${r1(6 + rnd() * 48)} ${r1(6 + rnd() * 48)}l${r1(Math.cos(a) * l)} ${r1(Math.sin(a) * l)}`;
  }
  for (let i = 0; i < 9; i++) speck += `M${r1(4 + rnd() * 52)} ${r1(4 + rnd() * 52)}h.6`;
  const PAT = {
    grain: id => tile(id, 60, 60, 0, `<path d="${fib}" stroke="${D}" stroke-width=".7" opacity=".14" stroke-linecap="round"/><path d="${speck}" stroke="${D}" stroke-width="1.2" opacity=".22" stroke-linecap="round"/>`),
    hatch: id => tile(id, 5, 5, 45, `<path d="M2.5 0V5" stroke="${D}" stroke-width="1.1"/>`),
    dense: id => tile(id, 3.2, 3.2, 45, `<path d="M1.6 0V3.2" stroke="${D}" stroke-width="1.4"/>`),
    sparse: id => tile(id, 7, 7, 45, `<path d="M3.5 0V7" stroke="${D}" stroke-width=".9"/>`),
    horiz: id => tile(id, 8, 5, 0, `<path d="M0 2.5H8" stroke="${D}" stroke-width="1"/>`),
    wave: id => tile(id, 20, 9, 0, `<path d="M0 4.5q5 -3 10 0t10 0" fill="none" stroke="${D}" stroke-width="1.1"/>`),
    bark: id => tile(id, 7, 24, 0, `<path d="M2 0q2.6 6 0 12t0 12" fill="none" stroke="${D}" stroke-width="1.3"/>`),
    leaf: id => tile(id, 12, 10, 0, `<path d="M0 10a6 6 0 0 1 12 0M-6 5a6 6 0 0 1 12 0M6 5a6 6 0 0 1 12 0" fill="none" stroke="${D}" stroke-width="1.1"/>`),
    weave: id => tile(id, 12, 8, 0, `<path d="M0 6q6 -7 12 0M-6 2q6 7 12 0M6 2q6 7 12 0" fill="none" stroke="${D}" stroke-width="1.2"/>`),
    shade: id => tile(id, 3.4, 3.4, 45, `<path d="M1.7 0V3.4" stroke="${D}" stroke-width=".8" opacity=".75"/>`, 1),
    rain: id => tile(id, 16, 22, 18, `<path d="M3 0V9M11 11V20" stroke="${P}" stroke-width="1.3" stroke-linecap="round"/>`, 1),
    drizzle: id => tile(id, 18, 24, 18, `<path d="M3 0V8M12 12V20" stroke="${D}" stroke-width="1" stroke-linecap="round"/>`, 1)
  };

  /* the double rule of a woodcut block, with a paper mat that trims any overhang */
  const FRAME = `<path d="M0 0H400V300H0ZM12 12V288H388V12Z" fill="${P}" fill-rule="evenodd"/>` +
    `<rect x="7" y="7" width="386" height="286" rx="3" fill="none" stroke="${D}" stroke-width="4"/>` +
    `<rect x="12" y="12" width="376" height="276" fill="none" stroke="${D}" stroke-width="1.5"/>`;

  /* ── small tools, from the book: rays, a bumpy outline, a leafy branch; and
     the Wind Waker wind: a long stroke that winds into a curl ── */
  function rays(cx, cy, ra, rb, a0, a1, n) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      d += `M${r1(cx + ra * c)} ${r1(cy + ra * s)}L${r1(cx + rb * c)} ${r1(cy + rb * s)}`;
    }
    return d;
  }
  function bumpy(cx, cy, rx, ry, n, bulge) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n; pts.push([r1(cx + rx * Math.cos(a)), r1(cy + ry * Math.sin(a))]); }
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i <= n; i++) {
      const p = pts[i % n], q = pts[i - 1], r = r1(Math.hypot(p[0] - q[0], p[1] - q[1]) / 2 * bulge);
      d += `A${r} ${r} 0 0 1 ${p[0]} ${p[1]}`;
    }
    return d + 'Z';
  }
  function branch(x, y, len, ang) {
    let leaves = '';
    for (let t = 6; t < len; t += 7) leaves += `M${t} 0q2 -6 7 -7q-1 5 -7 7M${t} 0q2 6 7 7q-1 -5 -7 -7`;
    return `<g transform="translate(${x} ${y}) rotate(${ang})"><path d="M0 0H${len}" stroke="${D}" stroke-width="1.8"/><path d="${leaves}" fill="${D}"/></g>`;
  }
  /* the wind: from (x0,y0) a curve that runs into a curl centred (cx,cy), radius
     r0, entering at angle a0 (degrees), winding dir (+1 clockwise on screen).
     Returns { d, at(t) } where at(t) is a point and heading along the lead-in. */
  function wind(x0, y0, cx, cy, r0, turns, a0, dir) {
    const A = a0 * Math.PI / 180, sx = cx + r0 * Math.cos(A), sy = cy + r0 * Math.sin(A);
    const tx = -Math.sin(A) * dir, ty = Math.cos(A) * dir, L = Math.hypot(sx - x0, sy - y0) * 0.55;
    const qx = sx - tx * L, qy = sy - ty * L;
    let d = `M${r1(x0)} ${r1(y0)}Q${r1(qx)} ${r1(qy)} ${r1(sx)} ${r1(sy)}`;
    const n = Math.ceil(turns * 20);
    for (let i = 1; i <= n; i++) {
      const t = i / n, a = A + dir * t * turns * 2 * Math.PI, r = r0 * (1 - 0.8 * t);
      d += `L${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`;
    }
    const at = t => {
      const u = 1 - t;
      return {
        x: u * u * x0 + 2 * u * t * qx + t * t * sx, y: u * u * y0 + 2 * u * t * qy + t * t * sy,
        a: Math.atan2(2 * u * (qy - y0) + 2 * t * (sy - qy), 2 * u * (qx - x0) + 2 * t * (sx - qx)) * 180 / Math.PI
      };
    };
    return { d, at };
  }
  /* an engraved line: paper cut through an ink edge, so it reads on dark and light alike */
  const cut = (d, w) => `<path d="${d}" fill="none" stroke="${D}" stroke-width="${w + 3.4}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${P}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  /* a storm mass: one ink shape, its outline a paper cut round the whole (no seams where the lumps overlap) */
  const mass = d => `<path d="${d}" fill="${P}" stroke="${P}" stroke-width="3.6" stroke-linejoin="round"/><path d="${d}" fill="${D}"/>`;
  /* a lightning bolt as negative space: a centreline and its widths → a paper polygon */
  function bolt(pts) {
    const L = [], R = [];
    for (const [x, y, w] of pts) { L.push(`${r1(x - w / 2)} ${y}`); R.unshift(`${r1(x + w / 2)} ${y}`); }
    const d = `M${L.join('L')}L${R.join('L')}Z`;
    return `<path d="${d}" fill="${D}" stroke="${D}" stroke-width="5" stroke-linejoin="round"/><path d="${d}" fill="${P}"/>`;   // the ink cleared round it, so the paper flashes
  }
  const tufts = list => list.map(([x, y, h]) => `M${x} ${y}q-1 ${r1(-h * .6)} -5 ${-h}M${x} ${y}q0 ${r1(-h * .7)} 1 ${r1(-h * 1.1)}M${x} ${y}q2 ${r1(-h * .6)} 6 ${r1(-h * .85)}`).join('');

  /* ── her kind, drawn once per scene in the spot ink ──
     b  the perched bird (facing right, feet at 0,0): body, breast, mask, eye, beak
     w  the folded wing     l  the legs     bp  the body outline (for a paper halo)
     c  the little one, a fluffed chick
     fu/fd  a flying bird, wings up / down     f  a feather     h  the hawk's shadow
     cl a Wind Waker cloud with its curls */
  const BODY = 'M23 -34C25 -25 21 -12 8 -6C1 -3 -8 -4 -14 -8L-40 5L-44 -1L-20 -18C-15 -32 -3 -44 7 -46L2 -62C11 -56 17 -51 20 -48C22 -47 23 -45 23 -43Z';
  const WING = 'M12 -30C4 -34 -10 -30 -16 -20L-32 -5C-18 -6 -4 -10 6 -16C11 -20 13 -25 12 -30Z';
  const FLY = 'M16 -2L11 -4.5C9 -8 5 -8.5 3 -6.5L-1 -12L1 -5.5C-4 -4 -10 -3 -14 -2L-25 -5.5L-23.5 1.5L-14 2C-6 5 6 4.5 11 0Z';
  const VANE = 'M-12 0C-6 -7 8 -8 21 -1C10 6 -4 8 -12 1Z';
  const eye = (x, y, ring, k) => (ring ? `<circle cx="${x}" cy="${y}" r="${r1(2.3 * k)}" fill="${P}"/>` : '') +
    `<circle cx="${x}" cy="${y}" r="${r1((ring ? 1.5 : 1.9) * k)}" fill="${D}"/><circle cx="${r1(x + .6 * k)}" cy="${r1(y - .6 * k)}" r="${r1(.6 * k)}" fill="${P}"/>`;

  function kindDefs(pre, c, need) {
    const S = c.body, beak = c.beakDark ? D : P, has = k => need.indexOf(k) >= 0;
    let s = '';
    if (has('b')) {
      s += `<path id="${pre}-bp" d="${BODY}"/>` +
        `<g id="${pre}-b" stroke-linejoin="round"><use href="#${pre}-bp" fill="${S}"/>` +
        (c.chest ? `<path d="M23 -34C25 -25 21 -12 8 -6C1 -3 -8 -4 -14 -8C-2 -12 8 -19 12 -28C14 -32 18 -34 23 -34Z" fill="${P}"/>` +
          `<path d="M11 -40C12 -31 18 -27 23.5 -30M-30 -4l2 3.5M-36 0l2 3.5" fill="none" stroke="${D}" stroke-width="2"/>` : '') +
        (c.mask ? `<path d="M23.5 -45C17 -47 11.5 -44 11 -40C10.5 -35 15 -31 23.5 -31Z" fill="${D}"/>` : '') +
        `<use href="#${pre}-bp" fill="none" stroke="${D}" stroke-width="2"/>${eye(15.5, -41, c.mask, 1)}` +
        `<path d="M22.5 -43.5L33 -38.5L22.5 -33.5Z" fill="${beak}" stroke="${D}" stroke-width="1.4"/></g>` +
        `<g id="${pre}-w" stroke-linejoin="round"><path d="${WING}" fill="${S}"/><path d="${WING}" fill="url(#${pre}-shade)" stroke="${D}" stroke-width="1.6"/>` +
        `<path d="M8 -25C0 -24 -8 -20 -13 -14M-2 -14L-22 -5M3 -18L-14 -9${c.chest ? 'M-6 -23l3 5M-12 -19l3 5M-18 -14l3 5' : ''}" fill="none" stroke="${D}" stroke-width="1.1"/></g>` +
        `<path id="${pre}-l" d="M4 -6L2 0M9 -7L8 0M-3 0h8M4 0h8" fill="none" stroke="${D}" stroke-width="2" stroke-linecap="round"/>`;
    }
    if (has('c')) {
      s += `<g id="${pre}-c" stroke-linejoin="round"><path d="${bumpy(0, -10, 12, 9.5, 13, 1.25)}" fill="${S}" stroke="${D}" stroke-width="1.6"/>` +
        (c.chest ? `<ellipse cx="5" cy="-6" rx="6" ry="4.5" fill="${P}"/>` : '') +
        `<path d="M-9 -12C-3 -16 5 -13 6 -8C0 -5 -6 -7 -10 -10Z" fill="url(#${pre}-shade)" stroke="${D}" stroke-width="1.2"/>` +
        `<path d="M5 -27q-1 -5 2 -7q1 3 3 5" fill="${S}" stroke="${D}" stroke-width="1.2"/>` +
        `<circle cx="8" cy="-21" r="7.5" fill="${S}" stroke="${D}" stroke-width="1.6"/>${eye(10.5, -22.5, 0, .95)}` +
        `<path d="M14.6 -24L20 -21.5L14.6 -19Z" fill="${beak}" stroke="${D}" stroke-width="1.1"/></g>`;
    }
    if (has('fu')) {
      const one = (id, far, near) => `<g id="${pre}-${id}" fill="${S}" stroke="${D}" stroke-width="1.3" stroke-linejoin="round">` +
        (far ? `<path d="${far}"/>` : '') + `<path d="${FLY}"/><path d="${near}"/><circle cx="8" cy="-4" r="1.1" fill="${D}" stroke="none"/></g>`;
      s += one('fu', 'M2 -5C2 -12 6 -18 10 -22C9 -14 8 -9 6 -4Z', 'M4 -4.5C1 -14 -5 -22 -14 -28C-12 -18 -11 -10 -5 -3Z') +
        one('fd', '', 'M4 -2C1 7 -5 14 -13 19C-11 10 -10 4 -5 0Z');
    }
    if (has('f')) {
      s += `<g id="${pre}-f" stroke-linejoin="round" stroke-linecap="round">` +
        `<path d="${VANE}M-21 1.6L21 -.6" fill="${P}" stroke="${P}" stroke-width="5"/>` +
        `<path d="${VANE}" fill="${S}" stroke="${D}" stroke-width="1.4"/><path d="M-21 1.6L21 -.6" stroke="${D}" stroke-width="1.3"/>` +
        `<path d="M-6 .7L18 -.4" stroke="${P}" stroke-width=".9"/><path d="M2 -6.2L5 -1.4M10 -5.2L12.5 -1M3 5.8L6.4 1.2M12 3.8L14 .6" stroke="${P}" stroke-width="1.1"/></g>`;
    }
    if (has('h')) {
      s += `<path id="${pre}-hw" d="M6 -14C30 -24 62 -26 92 -19Q112 -21 122 -15Q112 -12 104 -10Q118 -8 124 -3Q112 -1 104 -2Q116 2 120 8Q108 7 102 5Q110 11 112 16Q102 14 97 11Q100 17 100 21Q92 17 88 14C70 18 40 20 22 16C14 14 8 12 6 10Z"/>` +
        `<g id="${pre}-h" fill="${D}"><use href="#${pre}-hw"/><use href="#${pre}-hw" transform="scale(-1 1)"/>` +
        '<ellipse cx="0" cy="-2" rx="11" ry="22"/><circle cx="0" cy="-25" r="8"/><path d="M-7 14L-16 44Q0 50 16 44L7 14Z"/></g>';
    }
    if (has('cl')) {
      s += `<g id="${pre}-cl" stroke="${D}" stroke-linecap="round" stroke-linejoin="round"><path d="M0 22C-8 22 -10 12 -2 9C-1 0 12 -4 18 3C21 -8 38 -9 43 1C49 -5 62 -1 61 9C68 8 72 18 66 22Z" fill="${P}" stroke-width="2.2"/>` +
        '<path d="M18 3c-3 3 -2 8 3 8c3 0 4 -3 2 -5M43 1c-3 4 -1 9 4 9c3 0 4 -4 1 -5M-2 9c2 2 6 2 7 -1" fill="none" stroke-width="1.4"/></g>';
    }
    return s;
  }
  const use = (pre, k, tf) => `<use href="#${pre}-${k}"${tf ? ` transform="${tf}"` : ''}/>`;
  const halo = (pre, tf, w) => `<use href="#${pre}-bp" transform="${tf}" fill="${P}" stroke="${P}" stroke-width="${w || 5}" stroke-linejoin="round"/>`;
  const perched = (pre, tf, wingTf) => `<g transform="${tf}">${use(pre, 'l')}${use(pre, 'b')}${use(pre, 'w', wingTf)}</g>`;

  /* ── 1 · High in the big tree: the island far below; the nest in the fork;
     the mother's wing wrapped round her little one, her beak to its head. ── */
  function s1(c, u, pre) {
    const S = c.body;
    const WRAP = 'M-2 -28C14 -32 36 -36 56 -30C63 -26 63 -18 60 -12C44 -9 20 -10 -4 -16Z';
    return {
      pats: ['grain', 'horiz', 'sparse', 'wave', 'bark', 'leaf', 'weave', 'shade'], need: ['b', 'c', 'cl'],
      body: [
        `<rect x="0" y="44" width="250" height="72" fill="${u('horiz')}"/><circle cx="84" cy="80" r="47" fill="${P}"/>`,
        `<path d="${rays(84, 80, 31, 43, 0, 337.5, 16)}" stroke="${D}" stroke-width="2.2" stroke-linecap="round"/>`,
        `<circle cx="84" cy="80" r="24" fill="${P}" stroke="${D}" stroke-width="2.6"/><circle cx="84" cy="80" r="16" fill="none" stroke="${D}" stroke-width="1"/>`,
        use(pre, 'cl', 'translate(128 112) scale(1.05)'), use(pre, 'cl', 'translate(10 20) scale(.8)'),
        /* the sea far below, and the island in it: the village, the peaks, the lake, the lighthouse */
        `<rect x="0" y="166" width="300" height="134" fill="${u('wave')}"/><path d="M0 166H300" stroke="${D}" stroke-width="2"/>`,
        `<path d="M0 300V246C14 236 30 238 40 228C56 214 82 216 98 206C116 196 140 200 156 212C172 222 190 226 206 240L222 300Z" fill="${u('sparse')}" stroke="${D}" stroke-width="2.4" stroke-linejoin="round"/>`,
        `<path d="M110 214L124 190L138 214ZM128 216L141 196L154 216Z" fill="${P}" stroke="${D}" stroke-width="1.8" stroke-linejoin="round"/><path d="M124 190L129 214H138ZM141 196L146 216H154Z" fill="${D}"/>`,
        `<path d="M50 236h12v7h-12ZM66 231h10v7h-10ZM80 238h12v7h-12Z" fill="${P}" stroke="${D}" stroke-width="1.2"/><path d="M48 237l8 -8l8 8ZM64 232l7 -7l7 7ZM78 239l8 -8l8 8Z" fill="${D}"/>`,
        `<ellipse cx="166" cy="232" rx="15" ry="4.5" fill="${P}" stroke="${D}" stroke-width="1.4"/>`,
        `<path d="M18 246l2.6 -20h5.8l2.6 20Z" fill="${P}" stroke="${D}" stroke-width="1.4" stroke-linejoin="round"/><path d="M19.6 238h8.8M20.6 230h6.8" stroke="${D}" stroke-width="2"/><path d="M19.5 226l4 -5l4 5Z" fill="${D}"/>`,
        /* the big tree: limbs, crown, trunk (its shadow side cut solid) */
        `<path d="M226 176C206 140 190 112 180 64L196 60C204 100 220 132 246 168ZM330 170C350 132 360 96 362 36L380 38C380 100 368 140 350 178Z" fill="${u('bark')}" stroke="${D}" stroke-width="3" stroke-linejoin="round"/>`,
        `<path d="${bumpy(300, 18, 118, 48, 15, 1.2)}${bumpy(178, 38, 46, 30, 9, 1.2)}" fill="${u('leaf')}" stroke="${D}" stroke-width="2.6"/>`,
        `<path d="M252 300C262 262 268 222 262 196H326C320 230 328 266 344 300Z" fill="${u('bark')}" stroke="${D}" stroke-width="3"/><path d="M326 196C320 230 328 266 344 300H331C316 266 311 230 316 196Z" fill="${D}"/>`,
        branch(360, 150, 30, -18), branch(208, 148, 28, 200),
        /* the nest: the dark of its hollow, twigs at the back rim */
        `<ellipse cx="283" cy="158" rx="78" ry="13" fill="${D}"/><path d="M214 155l-10 -8M352 153l12 -9M240 147l-4 -9M330 147l5 -9" stroke="${D}" stroke-width="2" stroke-linecap="round"/>`,
        /* the mother, her little one, and her wing round it */
        `<g transform="translate(266 182) rotate(5) scale(1.35)">${use(pre, 'b')}<path d="M-10 -24C-6 -32 0 -37 8 -39M-18 -18C-14 -24 -8 -29 -2 -31" fill="none" stroke="${D}" stroke-width="1.1"/>${use(pre, 'c', 'translate(46 -16) scale(-1.25 1.25) rotate(-16)')}` +
          `<g stroke-linejoin="round"><path d="${WRAP}" fill="${S}"/><path d="${WRAP}" fill="${u('shade')}" stroke="${D}" stroke-width="1.6"/>` +
          `<path d="M8 -28C26 -33 44 -31 55 -24M61 -21L51 -12M55 -27L45 -13M47 -31L38 -15" fill="none" stroke="${D}" stroke-width="1.1"/></g></g>`,
        /* the nest's woven front, which hides all below the rim */
        `<path d="M205 158C214 172 352 172 361 158C360 190 320 208 283 208C246 208 206 190 205 158Z" fill="${u('weave')}" stroke="${D}" stroke-width="3" stroke-linejoin="round"/>`,
        `<path d="M207 160C220 172 346 172 359 160" fill="none" stroke="${D}" stroke-width="5"/><path d="M216 166C240 172 326 172 350 166" fill="none" stroke="${P}" stroke-width="1.2" stroke-dasharray="7 5"/>`,
        `<path d="M209 170l-15 4M357 168l15 2M236 201l-10 8M330 201l10 8" stroke="${D}" stroke-width="2.2" stroke-linecap="round"/>`
      ]
    };
  }

  /* ── 2 · The storm: a black sky, rain cut as paper, lightning as negative
     space over the sea (far from the tree); the tree bending; the nest small. ── */
  function s2(c, u, pre) {
    const crown = bumpy(344, 116, 42, 26, 11, 1.2) + bumpy(378, 98, 30, 20, 9, 1.2) + bumpy(312, 126, 24, 16, 8, 1.2);
    return {
      pats: ['grain', 'dense', 'hatch', 'wave', 'rain'], need: ['b'],
      body: [
        `<rect width="400" height="216" fill="${u('dense')}"/>`,
        bolt([[134, 30, 15], [120, 90, 13], [138, 96, 12], [106, 154, 10], [122, 159, 8], [84, 220, 2]]),
        bolt([[121, 94, 6], [100, 116, 4.5], [105, 120, 3.5], [86, 142, 1]]),
        mass(`${bumpy(70, 14, 132, 46, 13, 1.15)}${bumpy(300, 4, 150, 52, 15, 1.15)}${bumpy(206, 40, 66, 22, 9, 1.2)}`),
        `<path d="M40 40c-6 -8 4 -16 10 -10c4 4 -2 9 -5 6M170 46c-6 -8 4 -16 10 -10c4 4 -2 9 -5 6M262 44c-6 -8 4 -16 10 -10c4 4 -2 9 -5 6M352 36c-6 -8 4 -16 10 -10c4 4 -2 9 -5 6" fill="none" stroke="${P}" stroke-width="1.6" stroke-linecap="round"/>`,
        `<rect y="56" width="400" height="160" fill="${u('rain')}"/>`,
        cut(wind(10, 118, 196, 104, 14, 1.2, 90, -1).d, 2.2), cut(wind(150, 176, 262, 150, 11, 1.1, 90, -1).d, 1.8),
        /* the sea, heaving, and the strike far out on it */
        `<rect y="212" width="400" height="88" fill="${u('wave')}"/>`,
        `<path d="M-10 216q20 -12 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0M-30 238q16 -9 32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0t32 0" fill="none" stroke="${D}" stroke-width="2.6"/>`,
        /* the island's hill and the big tree, bending east in the wind */
        `<path d="M190 300C222 252 290 228 400 222V300Z" fill="${u('hatch')}" stroke="${D}" stroke-width="3"/>`,
        `<path d="M312 246C316 208 324 178 342 148L354 152C340 180 334 212 336 246Z${crown}" fill="${P}" stroke="${P}" stroke-width="6" stroke-linejoin="round"/>`,
        `<path d="M312 246C316 208 324 178 342 148L354 152C340 180 334 212 336 246Z${crown}" fill="${D}"/>`,
        `<path d="M322 236C324 214 330 194 340 172M330 132c8 -4 16 -2 22 4M358 104c6 -3 12 -2 16 2" fill="none" stroke="${P}" stroke-width="1.4" stroke-linecap="round"/>`,
        `<path d="M388 126q7 -5 12 0q-6 5 -12 0ZM372 146q7 -5 12 0q-6 5 -12 0ZM396 150q6 -4 10 0q-5 4 -10 0Z" fill="${D}" stroke="${P}" stroke-width="1.2"/>`,
        /* the nest, small in the fork, the mother sitting tight */
        `<path d="${bumpy(333, 147, 24, 17, 9, 1.15)}" fill="${P}"/>`,
        `<g transform="translate(334 156) scale(.5)">${use(pre, 'b')}${use(pre, 'w')}</g>`,
        `<path d="M318 150C320 162 346 162 349 150Z" fill="${u('hatch')}" stroke="${D}" stroke-width="2" stroke-linejoin="round"/>`
      ]
    };
  }

  /* ── 3 · Out of the storm, the hawk: only its shadow, passing away west. The
     wind, cut through the clouds as paper, carries three of her feathers up
     toward a break in the sky. No strike, no fall, no body. ── */
  function s3(c, u, pre) {
    const W = wind(18, 270, 336, 86, 30, 1.25, 90, -1), W2 = wind(40, 226, 232, 160, 14, 1.1, 90, -1);
    const f = (t, k, da, dy) => { const p = W.at(t); return use(pre, 'f', `translate(${r1(p.x)} ${r1(p.y + dy)}) rotate(${r1(p.a + da)}) scale(${k})`); };
    return {
      pats: ['grain', 'dense', 'drizzle'], need: ['f', 'h'],
      body: [
        /* the break in the clouds, its light drawn in fine lines */
        `<path d="${rays(330, -30, 70, 190, 62, 128, 9)}" stroke="${D}" stroke-width=".9"/>`,
        `<rect width="270" height="210" fill="${u('drizzle')}"/>`,
        mass(`${bumpy(56, -6, 116, 40, 12, 1.15)}${bumpy(216, -14, 70, 32, 9, 1.15)}`),
        `<path d="M32 22c-6 -8 4 -16 10 -10c4 4 -2 9 -5 6M118 24c-6 -8 4 -16 10 -10c4 4 -2 9 -5 6M214 10c-6 -8 4 -16 10 -10c4 4 -2 9 -5 6" fill="none" stroke="${P}" stroke-width="1.6" stroke-linecap="round"/>`,
        /* the hawk, a shadow on the storm-light: no eye, no claw */
        `<g transform="translate(118 102) rotate(-16) scale(.6)">${use(pre, 'h')}</g>`,
        /* the storm bank below, with lightning running through it as paper */
        `<path d="M0 300V216C30 198 60 206 80 198C100 178 140 182 156 198C176 188 206 194 220 208C246 198 276 204 290 220C316 208 350 214 370 228C384 224 396 228 400 232V300Z" fill="${u('dense')}" stroke="${D}" stroke-width="3" stroke-linejoin="round"/>`,
        mass(`${bumpy(60, 290, 70, 34, 10, 1.15)}${bumpy(250, 300, 90, 40, 12, 1.15)}${bumpy(380, 290, 40, 26, 8, 1.15)}`),
        bolt([[300, 222, 5], [286, 246, 5], [298, 249, 4], [276, 280, 3], [284, 282, 2.5], [270, 300, 1]]),
        /* the wind, and the three feathers it carries */
        cut(W2.d, 1.8), cut(W.d, 2.8),
        f(.34, 1.25, -28, -12), f(.6, 1.1, 34, -11), f(.84, .95, -12, -10)
      ]
    };
  }

  /* ── 4 · The villagers found you in the grass: two kneel, one cupping the
     little one in a fold of cloth, one with a bowl of seed. Faces as paper. ── */
  function s4(c, u, pre) {
    const FIG = 'M4 0L-38 0C-41 -10 -38 -18 -30 -24C-30 -36 -24 -48 -12 -56L-2 -54C2 -44 0 -32 -8 -24C-2 -20 6 -14 6 -6Z';
    const head = (bun) => `<circle cx="2" cy="-65" r="10" fill="${D}"/><ellipse cx="6.4" cy="-64.5" rx="5.6" ry="7.2" transform="rotate(18 6.4 -64.5)" fill="${P}"/>` +
      (bun ? `<circle cx="-8" cy="-70" r="5" fill="${D}"/>` : `<path d="M-12 -70H16" stroke="${D}" stroke-width="3" stroke-linecap="round"/><path d="M-6 -71a8 7 0 0 1 16 0Z" fill="${D}"/>`);
    const robe = `<path d="${FIG}" fill="${D}"/><path d="M-28 -20C-20 -15 -10 -13 -2 -14M-22 -46C-18 -40 -14 -36 -8 -34" fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round"/>`;
    return {
      pats: ['grain', 'horiz', 'hatch', 'sparse', 'shade'], need: ['c', 'cl'],
      body: [
        `<rect x="150" y="40" width="250" height="70" fill="${u('horiz')}"/><circle cx="318" cy="76" r="44" fill="${P}"/>`,
        `<path d="${rays(318, 76, 29, 40, 0, 337.5, 16)}" stroke="${D}" stroke-width="2.2" stroke-linecap="round"/><circle cx="318" cy="76" r="22" fill="${P}" stroke="${D}" stroke-width="2.6"/>`,
        use(pre, 'cl', 'translate(40 40) scale(1.1)'),
        /* the far hills and the village */
        `<path d="M0 200C60 170 120 176 170 190C220 170 300 164 400 184V300H0Z" fill="${u('sparse')}" stroke="${D}" stroke-width="2.2"/>`,
        `<path d="M22 186V156H72V186ZM92 182V160H126V182Z" fill="${P}" stroke="${D}" stroke-width="2.2"/><path d="M16 158L47 132L78 158ZM88 162L109 144L130 162Z" fill="${u('hatch')}" stroke="${D}" stroke-width="2.2" stroke-linejoin="round"/>`,
        `<path d="M40 186V170h10v16ZM104 182V170h8v12ZM58 164h8v7h-8Z" fill="${D}"/><path d="M60 140v-12h6v8" fill="${P}" stroke="${D}" stroke-width="1.8"/>`,
        /* the meadow where they found you */
        `<path d="M0 222C80 206 180 210 240 216C300 208 360 210 400 216V300H0Z" fill="${P}" stroke="${D}" stroke-width="2.4"/>`,
        `<path d="${tufts([[30, 240, 10], [72, 284, 12], [118, 236, 9], [246, 232, 9], [300, 290, 12], [348, 240, 10], [380, 270, 11], [200, 292, 10], [16, 280, 9]])}" fill="none" stroke="${D}" stroke-width="1.8" stroke-linecap="round"/>`,
        /* the one cupping you (a bun), and the one with the seed (a hat) */
        `<g transform="translate(142 270) scale(1.55)">${robe}${head(1)}<path d="M-6 -50Q8 -36 20 -31" fill="none" stroke="${D}" stroke-width="6" stroke-linecap="round"/></g>`,
        `<g transform="translate(266 270) scale(-1.55 1.55)">${robe}${head(0)}<path d="M-6 -50Q6 -32 18 -28" fill="none" stroke="${D}" stroke-width="6" stroke-linecap="round"/>` +
          `<path d="M12 -29h18c0 6 -4 9.5 -9 9.5s-9 -3.5 -9 -9.5Z" fill="${P}" stroke="${D}" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 -30.6h.1M21 -31.6h.1M26 -30.6h.1M18.6 -32.4h.1M23.6 -32.6h.1" stroke="${D}" stroke-width="2.4" stroke-linecap="round"/></g>`,
        /* the cloth in the cupped hands, and you in it */
        `<path d="M158 222C156 206 168 198 180 204C192 198 204 206 202 222Z" fill="${u('hatch')}" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/>`,
        `<g transform="translate(179 226) scale(1.2)">${use(pre, 'c')}</g>`,
        `<path d="M154 218C156 242 204 244 206 218C196 232 164 232 154 218Z" fill="${D}"/>`,
        `<path d="M157 219C164 232 196 232 203 219C192 226 168 226 157 219Z" fill="${u('hatch')}" stroke="${D}" stroke-width="1.8" stroke-linejoin="round"/>`,
        `<path d="M164 192q-4 5 0 10M158 190q-5 7 0 14M210 186q4 5 0 10M216 184q5 7 0 14" fill="none" stroke="${D}" stroke-width="1.5" stroke-linecap="round"/>`
      ]
    };
  }

  /* ── 5 · Stubborn: alone on the crag, chin up, the wind in her face; the far
     peaks, the low sun, and the hawk only a speck beyond them. ── */
  function s5(c, u, pre) {
    return {
      pats: ['grain', 'horiz', 'sparse', 'dense', 'shade'], need: ['b', 'h', 'cl'],
      body: [
        `<rect x="140" y="96" width="260" height="64" fill="${u('horiz')}"/><circle cx="280" cy="156" r="44" fill="${P}"/>`,
        `<path d="${rays(280, 156, 30, 42, 185, 355, 11)}" stroke="${D}" stroke-width="2.2" stroke-linecap="round"/><circle cx="280" cy="156" r="22" fill="${P}" stroke="${D}" stroke-width="2.6"/>`,
        use(pre, 'cl', 'translate(26 34) scale(1.2)'), use(pre, 'cl', 'translate(250 30) scale(.7)'),
        `<g transform="translate(336 82) rotate(-8) scale(.1)">${use(pre, 'h')}</g>`,
        `<path d="M150 216L200 150L226 178L264 128L300 174L332 140L372 188L400 176V240H150Z" fill="${u('sparse')}" stroke="${D}" stroke-width="2.6" stroke-linejoin="round"/>`,
        `<path d="M200 150L194 174L208 168ZM264 128L256 156L272 150ZM332 140L326 160L340 156Z" fill="${P}" stroke="${D}" stroke-width="1.4" stroke-linejoin="round"/>`,
        `<path d="M120 300V226C190 216 270 220 400 210V300Z" fill="${P}" stroke="${D}" stroke-width="2.4"/>`,
        `<path d="${tufts([[230, 250, 10], [292, 236, 9], [340, 276, 12], [384, 236, 10], [258, 288, 11]])}" fill="none" stroke="${D}" stroke-width="1.8" stroke-linecap="round"/>`,
        /* the wind she faces, as Wind Waker draws it */
        `<path d="${wind(320, 124, 212, 110, 9, 1.1, 270, -1).d}${wind(372, 82, 270, 72, 7, 1.1, 270, -1).d}${wind(250, 52, 170, 54, 6, 1.1, 270, -1).d}" fill="none" stroke="${D}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
        /* the crag */
        `<path d="M-6 300V206C10 194 30 182 62 178C92 174 126 174 146 186C166 198 184 238 198 300Z" fill="${u('dense')}" stroke="${D}" stroke-width="3" stroke-linejoin="round"/>`,
        `<path d="M40 190C50 212 46 240 56 270M100 182C110 204 118 236 116 280M152 200C158 222 162 252 174 290" fill="none" stroke="${P}" stroke-width="2" stroke-linecap="round"/>`,
        `<path d="${tufts([[30, 186, 10], [140, 186, 9], [196, 296, 12], [10, 296, 9]])}" fill="none" stroke="${D}" stroke-width="1.8" stroke-linecap="round"/>`,
        /* her, chin up */
        `<path d="M60 177h66" stroke="${P}" stroke-width="3"/>`,
        perched(pre, 'translate(96 178) rotate(-16) scale(1.3)')
      ]
    };
  }

  /* ── 6 · Then, far off: a flock of her own kind in the open sky, and her on
     a low branch, looking up at them, her wing already lifting. ── */
  function s6(c, u, pre) {
    const flock = [[180, 112, .62, 'fu', -6], [208, 94, .56, 'fd', -10], [234, 114, .56, 'fu', -4], [254, 80, .5, 'fd', -12], [278, 100, .5, 'fu', -8], [298, 68, .44, 'fu', -14], [318, 88, .42, 'fd', -6]];
    return {
      pats: ['grain', 'hatch', 'sparse', 'wave', 'bark', 'leaf', 'shade'], need: ['b', 'fu', 'cl'],
      body: [
        `<path d="${rays(378, 30, 32, 44, 90, 200, 7)}" stroke="${D}" stroke-width="2.2" stroke-linecap="round"/>`,
        `<circle cx="378" cy="30" r="24" fill="${P}" stroke="${D}" stroke-width="2.6"/><circle cx="378" cy="30" r="16" fill="none" stroke="${D}" stroke-width="1"/>`,
        use(pre, 'cl', 'translate(56 34) scale(1.3)'), use(pre, 'cl', 'translate(150 140) scale(.8)'), use(pre, 'cl', 'translate(296 150) scale(1)'),
        flock.map(([x, y, k, id, a]) => use(pre, id, `translate(${x} ${y}) rotate(${a}) scale(${k})`)).join(''),
        /* the sea, and the island's far shore */
        `<rect x="0" y="206" width="400" height="94" fill="${u('wave')}"/><path d="M0 206H400" stroke="${D}" stroke-width="2"/>`,
        `<path d="M150 300C190 240 260 226 330 230C360 226 384 230 400 236V300Z" fill="${u('sparse')}" stroke="${D}" stroke-width="2.4"/>`,
        `<path d="M0 300V250C40 240 90 242 130 256C150 264 166 280 176 300Z" fill="${u('hatch')}" stroke="${D}" stroke-width="2.4"/>`,
        /* the tree at the edge, its low branch, and her on it */
        `<path d="M-6 300V110H24C22 160 28 240 40 300Z" fill="${u('bark')}" stroke="${D}" stroke-width="3"/><path d="M24 110C22 160 28 240 40 300H30C18 240 12 160 14 110Z" fill="${D}"/>`,
        `<path d="M20 214C60 204 104 200 156 206L156 212C104 208 62 214 22 224Z" fill="${u('bark')}" stroke="${D}" stroke-width="2.6" stroke-linejoin="round"/>`,
        branch(150, 208, 30, -14), branch(132, 207, 22, 30),
        `<path d="${bumpy(18, 80, 62, 46, 12, 1.2)}" fill="${u('leaf')}" stroke="${D}" stroke-width="2.6"/>`,
        perched(pre, 'translate(110 206) rotate(-28) scale(1.2)', 'rotate(-16 10 -28)')
      ]
    };
  }

  const SCENES = [s1, s2, s3, s4, s5, s6];
  const labels = [
    'High in the big tree, a mother bird holds her little one under her wing; the island far below',
    'A storm: black clouds, rain, lightning over the sea; the nest small in the bending tree',
    'The shadow of a hawk passing through the storm; three feathers carried up on the wind toward a break in the clouds',
    'Two villagers kneel in the grass; one cups a tiny bird in a fold of cloth, the other offers a bowl of seed',
    'A young bird alone on a crag, chin up into the wind; far peaks, a low sun, a hawk only a speck',
    'A flock of birds of her kind far off in the sky; the young bird on a low branch looks up at them'
  ];

  function norm(colours) {
    if (!colours) return coloursFor(CARDINAL);
    if (typeof colours.body === 'number') return coloursFor(colours);
    return colours;
  }
  /* one beat's inside: its defs (patterns + her kind), its drawing, its frame */
  function cell(i, c, pre, frame) {
    const sc = SCENES[i](c, k => `url(#${pre}-${k})`, pre);
    const pats = sc.pats.slice();
    if ((sc.need.indexOf('b') >= 0 || sc.need.indexOf('c') >= 0) && pats.indexOf('shade') < 0) pats.push('shade');   // a wing always carries its shade
    return `<defs>${pats.map(k => PAT[k](pre + '-' + k)).join('')}${kindDefs(pre, c, sc.need)}</defs>` +
      `<rect width="400" height="300" fill="url(#${pre}-grain)"/>` + sc.body.join('') + (frame === false ? '' : FRAME);
  }
  function scene(i, colours, opts) {
    i = Number(i); if (!(i >= 0 && i < SCENES.length)) return null;
    opts = opts || {};
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="${labels[i]}">` +
      cell(i, norm(colours), (opts.id || 'wo') + i, opts.frame) + '</svg>';
  }
  function strip(colours, opts) {
    opts = opts || {};
    const c = norm(colours);
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 300" role="img" aria-label="Six woodcut scenes of the story">';
    for (let i = 0; i < SCENES.length; i++) {
      s += `<svg x="${i * 400}" y="0" width="400" height="300" viewBox="0 0 400 300" role="img" aria-label="${labels[i]}">` +
        cell(i, c, (opts.id || 'ws') + i, opts.frame) + '</svg>';
    }
    return s + '</svg>';
  }

  return { ink, count: SCENES.length, labels, coloursFor, scene, strip };
})();
if (typeof window !== 'undefined') window.WFR_OPENING = WFR_OPENING;
if (typeof module !== 'undefined') module.exports = WFR_OPENING;
