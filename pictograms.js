/* ═══════════════════════════════════════════════════════════════════════════
   WFR_PICTO — the hedgehog son's history book (board 542, with 529; Oct 9 2026).

   Marth: "and yes we should have pictograms of biblical stories. like noahs
   ark. the lions den. Jesus and the donkey. the dove and John the baptist and
   Jesus. the big fish and Jonah. the four horses in revelation"

   SEVEN PAGES, in his order: the cover (brown, a gold cross, no words), then
   noah · lions · donkey · baptism · jonah · horses. Each drawing follows the
   passage named in its `range` (Itachi's BRIEF_542, every detail read from the
   local ASV), with the brief's reverence defaults (§2) as Marth ruled them on
   Oct 9 ("4 nah add the scythe but drip out accordingly the other horses too.
   2 make Jesus look beautiful as possible while being respectful. follow
   scvripture. 5. yes.  everything is continue"), and again that evening
   ("wait why would hades left out be okay? isnt he part of scripture im jw
   ... yes redraw the baptism page. 4 yes adjust. but all in all good work"):
     - Jesus is drawn with care, the same head on both of His pages: a gentle,
       dignified face in profile, a soft eye, a beard and hair to the
       shoulders, a robe in folds, in the same two inks as the rest. No halo,
       no glow, no ring of light about Him (none is in the text). The crowd's
       faces stay simple so that He is the focus. On the colt He sits as a
       grown man on a young ass, His feet near the ground, the mother close by,
       garments on both.
     - At the baptism He stands in the river, praying, John beside Him. The
       Father is light only: no hand, no face, no figure; the dove comes down.
     - The white rider is plain and unlabelled, with no Christ markers. Every
       horse and rider is drawn with care and carries only what the text gives
       him; Death carries a scythe (his ruling), with no face, no skull, no
       bones, no gore, and is never the biggest thing on the page. Hades
       follows behind him: a dark hooded shadow on foot, faceless, smaller
       than the riders, never glorified.
     - Daniel's angel is a shaft of light, no figure (ruled: yes).

   THE HAND (BRIEF_530_543 §A): two inks on paper (dark brown, one red spot),
   thick strokes, hatching instead of gradients, light as negative space. Gold
   and the leather brown appear on the cover only. No live filters, ever.

   HOUSE LAW, kept by construction: no Scripture text on any page (no SVG text
   element at all; the chapter reference is shown by the game, under the
   page); no SVG filter element; ≤ 10 KB a page; pattern ids are namespaced per page
   (p3-hatch), so two pages in one document never collide.

   API (pure strings, no THREE, no DOM — loads in the page and in Node)
     WFR_PICTO.ink                 { paper, dark, spot, gold, leather }
     WFR_PICTO.pages               [{ id, ref, range, svg }]; pages[0] is
                                   { id:'cover', cover:true, svg } (no ref, no range)
     WFR_PICTO.svg(idOrIndex)      the page's <svg viewBox="0 0 400 260"> string, or null
     WFR_PICTO.page(idOrIndex)     the page object, or null
     WFR_PICTO.hand.defs(prefix, names)  the woodcut patterns, for the opening to borrow
   `ref` is the chapter shown under the page; `range` is the verse span the
   bench resolves through asv-lookup.js (resolve() refuses a chapter-only ref).
   ═══════════════════════════════════════════════════════════════════════════ */
const WFR_PICTO = (function () {
  'use strict';

  const ink = { paper: '#e9dcc0', dark: '#3a2414', spot: '#c8314a', gold: '#d4a73c', leather: '#6b4428' };
  const P = ink.paper, D = ink.dark, R = ink.spot, G = ink.gold, L = ink.leather;
  const r1 = v => Math.round(v * 10) / 10;

  /* ── the woodcut patterns: hatching in place of every gradient. Each tile is
     laid on paper, so a hatched thing in front hides what is behind it (a
     transparent tile let the mountain's ridge run straight through the ark). ── */
  const tile = (id, w, h, rot, inner) =>
    `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${rot ? ' patternTransform="rotate(45)"' : ''}>` +
    `<rect width="${w}" height="${h}" fill="${P}"/>${inner}</pattern>`;
  const PAT = {
    hatch: id => tile(id, 5, 5, 1, `<path d="M2.5 0V5" stroke="${D}" stroke-width="1.1"/>`),
    dense: id => tile(id, 3.2, 3.2, 1, `<path d="M1.6 0V3.2" stroke="${D}" stroke-width="1.4"/>`),
    horiz: id => tile(id, 8, 5, 0, `<path d="M0 2.5H8" stroke="${D}" stroke-width="1"/>`),
    rosy: id => tile(id, 8, 5, 0, `<path d="M0 2.5H8" stroke="${R}" stroke-width="1.3"/>`),
    stripe: id => tile(id, 6, 6, 0, `<path d="M1.5 0V6" stroke="${D}" stroke-width="2"/>`),
    rstripe: id => tile(id, 6, 6, 0, `<path d="M1.5 0V6" stroke="${R}" stroke-width="2.4"/>`),
    wave: id => tile(id, 20, 9, 0, `<path d="M0 4.5q5 -3 10 0t10 0" fill="none" stroke="${D}" stroke-width="1.1"/>`),
    scale: id => tile(id, 12, 10, 0, `<path d="M0 10a6 6 0 0 1 12 0M-6 5a6 6 0 0 1 12 0M6 5a6 6 0 0 1 12 0" fill="none" stroke="${D}" stroke-width="1.1"/>`)
  };
  const defs = (prefix, names) => names.map(k => PAT[k](prefix + '-' + k)).join('');

  /* the double rule of a woodcut block, with a paper mat that trims any overhang */
  const FRAME = `<path d="M0 0H400V260H0ZM12 12V248H388V12Z" fill="${P}" fill-rule="evenodd"/>` +
    `<rect x="7" y="7" width="386" height="246" rx="3" fill="none" stroke="${D}" stroke-width="4"/>` +
    `<rect x="12" y="12" width="376" height="236" fill="none" stroke="${D}" stroke-width="1.5"/>`;

  function sheet(n, label, pats, extraDefs, body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" role="img" aria-label="${label}">` +
      `<defs>${defs('p' + n, pats)}${extraDefs}</defs><rect width="400" height="260" fill="${P}"/>` +
      body.join('') + FRAME + '</svg>';
  }
  const u = (n, k) => `url(#p${n}-${k})`;

  /* a wavy line, a fan of rays, a woolly (or cloudy) outline, a leafy branch */
  function waveLine(y, x0, x1, amp, len) {
    let d = `M${x0} ${y}q${len / 2} ${-amp} ${len} 0`;
    for (let x = x0 + len; x < x1; x += len) d += `t${len} 0`;
    return d;
  }
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

  /* ── 0 · the cover: a brown book, a gold cross, no title, no words ── */
  const cross = 'M196 66H210V92H232V106H210V180H196V106H174V92H196Z';
  const cover = sheet(0, 'A brown book with a gold cross', ['hatch'],
    `<pattern id="p0-grain" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M1.6 0V3.2" stroke="${D}" stroke-width="1.4"/></pattern>`, [
    `<rect x="154" y="40" width="122" height="202" rx="5" fill="${u(0, 'hatch')}"/>`,
    `<rect x="146" y="34" width="122" height="200" rx="5" fill="${D}"/>`,
    `<rect x="140" y="28" width="122" height="200" rx="3" fill="${P}" stroke="${D}" stroke-width="1.5"/>`,
    `<path d="M258.5 30V226M260.5 30V226M142 224.5H258M142 226.5H258" stroke="${D}" stroke-width=".6"/>`,
    `<rect x="134" y="22" width="122" height="200" rx="5" fill="${L}" stroke="${D}" stroke-width="2.5"/>`,
    `<path d="M150 22H139a5 5 0 0 0 -5 5V217a5 5 0 0 0 5 5H150Z" fill="${u(0, 'grain')}"/>`,
    `<path d="M150 22V222M134 52H150M134 92H150M134 152H150M134 192H150" stroke="${D}" stroke-width="2.5"/>`,
    `<rect x="161" y="34" width="84" height="176" fill="none" stroke="${G}" stroke-width="1.8"/>`,
    `<rect x="166" y="39" width="74" height="166" fill="none" stroke="${G}" stroke-width=".9"/>`,
    `<path d="M161 28l6 6-6 6-6-6ZM245 28l6 6-6 6-6-6ZM161 204l6 6-6 6-6-6ZM245 204l6 6-6 6-6-6Z" fill="${G}" stroke="${D}" stroke-width=".8"/>`,
    `<path transform="translate(2.5 2.5)" d="${cross}" fill="${D}" opacity=".6"/>`,
    `<path d="${cross}" fill="${G}" stroke="${D}" stroke-width="1.2"/>`
  ]);

  /* ── 1 · Noah: the ark grounded on the mountains, the door in the side, the
     dove come in at eventide with an olive leaf, the bow in the cloud.
     The ark is a long box (300 × 50 × 30 cubits), never a curved boat. ── */
  const noah = sheet(1, 'The ark on the mountains, the dove with an olive leaf, the bow in the cloud',
    ['hatch', 'dense', 'horiz', 'rosy', 'wave'],
    '<path id="p1-cloud" d="M2 24C-2 16 6 10 12 13C12 4 26 0 30 8C34 2 46 4 46 12C54 10 60 18 56 24Z"/>', [
    `<rect x="12" y="118" width="376" height="96" fill="${u(1, 'rosy')}"/>`,
    `<circle cx="344" cy="172" r="17" fill="${R}"/><path d="${rays(344, 172, 23, 33, 195, 345, 7)}" stroke="${R}" stroke-width="2.2" stroke-linecap="round"/>`,
    `<path d="M36 212A142 142 0 0 1 320 212" fill="none" stroke="${R}" stroke-width="8"/>`,
    `<path d="M45 212A133 133 0 0 1 311 212M51 212A127 127 0 0 1 305 212" fill="none" stroke="${D}" stroke-width="2.6"/>`,
    `<use href="#p1-cloud" transform="translate(12 148) scale(1.6)" fill="${P}" stroke="${D}" stroke-width="1.6"/>`,
    `<use href="#p1-cloud" transform="translate(252 90) scale(1.1)" fill="${P}" stroke="${D}" stroke-width="2.2"/>`,
    `<path d="M12 248V214L58 190L118 146L136 158L150 164L232 168L258 156L286 136L314 158L340 172L388 196V248Z" fill="${P}" stroke="${D}" stroke-width="3" stroke-linejoin="round"/>`,
    `<path d="M118 146L58 190L12 214V248H96L104 196ZM286 136L258 156L232 168L246 248H300L292 186Z" fill="${u(1, 'hatch')}"/>`,
    `<path d="M118 146L104 196L96 248M286 136L292 186L300 248M138 196l12 -9M156 214l16 -11M318 204l13 -8M336 222l15 -9" fill="none" stroke="${D}" stroke-width="2" stroke-linecap="round"/>`,
    `<rect x="12" y="228" width="376" height="20" fill="${P}"/><rect x="12" y="230" width="376" height="18" fill="${u(1, 'wave')}"/>`,
    `<path d="${waveLine(229, 12, 388, 3, 14)}" fill="none" stroke="${D}" stroke-width="2"/>`,
    /* the ark: end, deck, the light a cubit upward, the long side, three stories, the door */
    `<path d="M122 134L140 142V172L122 164Z" fill="${u(1, 'dense')}" stroke="${D}" stroke-width="2.5" stroke-linejoin="round"/>`,
    `<path d="M122 134L140 142H272L254 134Z" fill="${P}" stroke="${D}" stroke-width="2.5" stroke-linejoin="round"/>`,
    `<path d="M146 126L136 122H252L262 126Z" fill="${P}" stroke="${D}" stroke-width="2" stroke-linejoin="round"/>`,
    `<path d="M146 126L136 122V135L146 139Z" fill="${u(1, 'dense')}" stroke="${D}" stroke-width="2" stroke-linejoin="round"/>`,
    `<rect x="146" y="126" width="116" height="13" fill="${P}" stroke="${D}" stroke-width="2.2"/>`,
    `<path d="M152 129h7v7h-7ZM165 129h7v7h-7ZM178 129h7v7h-7ZM191 129h7v7h-7ZM204 129h7v7h-7ZM217 129h7v7h-7ZM230 129h7v7h-7ZM243 129h7v7h-7Z" fill="${D}"/>`,
    `<rect x="140" y="142" width="132" height="30" fill="${u(1, 'horiz')}" stroke="${D}" stroke-width="3"/>`,
    `<path d="M140 152H272M140 162H272" stroke="${D}" stroke-width="1.8"/>`,
    `<rect x="184" y="149" width="18" height="23" fill="${P}" stroke="${D}" stroke-width="2.6"/><path d="M193 149V172" stroke="${D}" stroke-width="1.2"/>`,
    /* the dove, coming in to the ark with the olive leaf in her mouth */
    `<g transform="translate(90 90) rotate(12) scale(1.15)" stroke="${D}" stroke-linejoin="round">` +
      `<path d="M20 12C22 2 30 -6 42 -8C37 0 34 7 30 13Z" fill="${u(1, 'hatch')}" stroke-width="1.8"/>` +
      `<path d="M0 16L9 15C15 11 24 11 31 11C34 8 39 9 40 12L45 13L40 15C38 18 31 21 21 22C13 23 6 21 0 20Z" fill="${P}" stroke-width="2"/>` +
      `<path d="M12 14C9 3 15 -6 27 -11C24 -2 25 6 24 14Z" fill="${P}" stroke-width="2"/>` +
      `<circle cx="36" cy="12" r="1.2" fill="${D}" stroke="none"/>` +
      `<path d="M44 13.5q5 -6 12 -3q-5 6 -12 3Z" fill="${D}" stroke-width=".6"/></g>`
  ]);

  /* ── 2 · the lions' den: the stone moved from the mouth, very early in the
     morning; the king small above; Daniel calm below; the lions at rest with
     their mouths shut; the angel only as light, no figure. ── */
  const lionDef = `<g id="p2-lion">` +
    `<path d="M78 32C90 34 93 23 87 20" fill="none" stroke="${D}" stroke-width="2.5"/><circle cx="87" cy="20" r="3" fill="${D}"/>` +
    `<path d="M22 36C20 22 32 14 50 14C66 14 80 20 82 32V36Z" fill="${P}" stroke="${D}" stroke-width="2.5"/>` +
    `<path d="M30 36C30 30 40 26 54 27C66 28 76 32 80 36Z" fill="url(#p2-hatch)"/>` +
    `<path d="M64 36C62 28 68 22 76 24" fill="none" stroke="${D}" stroke-width="2"/>` +
    `<path d="${bumpy(19, 20, 13, 12, 12, 1.05)}" fill="${D}"/>` +
    `<ellipse cx="15" cy="21" rx="7.5" ry="8.5" fill="${P}" stroke="${D}" stroke-width="1.5"/>` +
    `<path d="M9.5 18.5q2 1.6 4 0M16 18.5q2 1.6 4 0M12.5 27.5q2.5 1.4 5 0M15 25.5v2" fill="none" stroke="${D}" stroke-width="1.2" stroke-linecap="round"/>` +
    `<path d="M13 23.5h4l-2 2.3Z" fill="${D}"/>` +
    `<path d="M-6 36C-6 31 0 30 20 31V36Z" fill="${P}" stroke="${D}" stroke-width="2.2"/>` +
    `<path d="M-2 33v3M2 33v3" stroke="${D}" stroke-width="1"/></g>`;
  /* the angel, reported and not described: a standing light, ringed with rays */
  let glow = '';
  for (let i = 0; i < 22; i++) {
    const a = 2 * Math.PI * i / 22, dx = 25 * Math.cos(a), dy = 62 * Math.sin(a), l = Math.hypot(dx, dy);
    glow += `M${r1(229 + dx + dx / l * 4)} ${r1(170 + dy + dy / l * 4)}l${r1(dx / l * 13)} ${r1(dy / l * 13)}`;
  }
  const CAVE = 'M152 82C136 104 70 104 44 138C26 162 22 206 24 236H378C382 200 380 150 352 124C324 100 228 104 204 82';
  const lions = sheet(2, 'The lions’ den at dawn: the stone moved, the king above, Daniel calm, the lions at rest',
    ['hatch', 'dense', 'rosy'], lionDef, [
    `<rect x="12" y="46" width="376" height="36" fill="${u(2, 'rosy')}"/>`,
    `<circle cx="336" cy="82" r="20" fill="${R}"/><path d="${rays(336, 82, 26, 38, 200, 340, 6)}" stroke="${R}" stroke-width="2.2" stroke-linecap="round"/>`,
    `<path d="${CAVE}Z" fill="${u(2, 'hatch')}"/>`,
    `<path d="M156 84L202 84L178 236H94Z" fill="${u(2, 'rosy')}"/>`,
    `<ellipse cx="229" cy="170" rx="25" ry="62" fill="${P}"/><path d="${glow}" stroke="${D}" stroke-width="1.6" stroke-linecap="round"/>`,
    `<path d="M12 82H388V248H12Z${CAVE}Z" fill="${u(2, 'dense')}" fill-rule="evenodd"/>`,
    `<path d="${CAVE}M12 82H152M204 82H388" fill="none" stroke="${D}" stroke-width="3" stroke-linejoin="round"/>`,
    `<path d="M22 112q14 -4 22 2M60 98q10 -6 22 -4M378 104q-10 2 -16 10M120 244h30M250 243h40" fill="none" stroke="${P}" stroke-width="2.2" stroke-linecap="round"/>`,
    /* the stone, rolled from the mouth, with the king's broken seal */
    `<ellipse cx="114" cy="70" rx="27" ry="12" fill="${u(2, 'hatch')}" stroke="${D}" stroke-width="2.6"/>`,
    `<path d="M92 64q8 3 18 2M120 66q8 1 14 7" fill="none" stroke="${D}" stroke-width="1.4"/><circle cx="115" cy="66" r="3.6" fill="${R}" stroke="${D}" stroke-width=".8"/>`,
    /* the king, very early in the morning, calling down */
    `<path d="M204 82L206 60C206 54 216 52 219 57L226 82Z" fill="${D}"/>`,
    `<path d="M211 63L197 71" stroke="${D}" stroke-width="3.5" stroke-linecap="round"/>`,
    `<circle cx="211" cy="49" r="6.5" fill="${D}"/><ellipse cx="207.5" cy="50" rx="3.4" ry="4.4" fill="${P}"/>`,
    `<path d="M205 44L205.5 36.5L208.5 40.5L211.5 35.5L214.5 40.5L217 36.5L217 44Z" fill="${D}"/>`,
    /* the lions, resting, mouths shut */
    `<use href="#p2-lion" transform="translate(270 196.4) scale(1.1)"/>`,
    `<use href="#p2-lion" transform="translate(130 196.4) scale(-1.1 1.1)"/>`,
    /* Daniel, unhurt, looking up to the king */
    `<g transform="translate(6 0)"><path d="M134 236L139 192C140 184 158 184 160 192L166 236Z" fill="${D}"/>`,
    `<path d="M141 204q9 6 18 0" fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round"/>`,
    `<circle cx="150" cy="176" r="8.5" fill="${D}"/><ellipse cx="153" cy="175" rx="5" ry="6.2" transform="rotate(-20 153 175)" fill="${P}"/></g>`
  ]);

  /* ── 3 · Jesus and the donkey (Matthew 21:1–11). Both beasts are brought,
     the she-ass and her colt, and garments are laid on both; Jesus sits on
     the colt with the mother close behind. Ahead, one of the crowd lays his
     garment on the road; on the mount another pulls a branch from an olive;
     branches already lie in the way; some walk before toward the city gate,
     one follows. Jesus is drawn with the most care in the book: a gentle
     profile, a soft eye, a beard, hair to the shoulders, a robe and a mantle
     in folds. No halo, no glow, no rays. The crowd stays plain silhouettes. ── */
  let crenel = '';
  for (let x = 278; x < 386; x += 12) crenel += `M${x} 110v-5h6v5`;
  /* one leafy branch, drawn once and laid wherever a branch is cut or strewn */
  const br = (x, y, len, a) => `<use href="#p3-br" transform="translate(${x} ${y}) rotate(${a}) scale(${r1(len / 24)})"/>`;
  let fringe = '';
  for (let x = -22; x < 22; x += 5) fringe += `M${x} ${r1(19 + Math.abs(x) / 12)}v4`;
  /* an ass facing right: the seat at 0 0, the hooves at y 57; a hatched coat,
     pale muzzle, belly and eye-ring, long ears, a short upright mane, a tufted tail */
  const assDefs = `<g id="p3-br">${branch(0, 0, 24, 0)}</g>` +
    `<path id="p3-ab" d="M-30 1Q-4 -2 20 -1C28 -4 33 -12 37 -19Q42 -23 48 -17L60 -4Q64 2 59 6Q53 9 47 5Q42 2 39 0Q35 6 32 13L30 24Q4 30 -24 26Q-36 22 -36 12Q-36 4 -30 1Z"/>` +
    `<path id="p3-gar" d="M-28 -1Q-2 -6 22 -2L21 17Q0 21 -25 17Z"/>` +
    `<g id="p3-ass" stroke="${D}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M-33 5C-38 14 -38 24 -38 30" fill="none" stroke-width="2.2"/><path d="M-38 28l-3.5 9h7Z" fill="${D}"/>` +
    `<path d="M-20 24L-18 41L-20 55M19 24L19 41L16 55" fill="none" stroke-width="4"/><path d="M-27 20L-33 39L-29 55M27 22L31 39L33 55" fill="none" stroke-width="4.6"/>` +
    `<path d="M-32 56.5h5M-23 56.5h5M13 56.5h5M30 56.5h5" stroke-width="3.2"/>` +
    `<use href="#p3-ab" fill="${u(3, 'hatch')}" stroke="none"/>` +
    `<path d="M52 -12.7L60 -4Q64 2 59 6Q53 9 47 5Q48 -4 52 -12.7ZM-24 26Q4 30 30 23L31 19Q4 25 -26 21Z" fill="${P}" stroke="none"/>` +
    `<circle cx="45" cy="-11" r="3.2" fill="${P}" stroke="none"/><circle cx="45.6" cy="-11" r="1.6" fill="${D}" stroke="none"/>` +
    `<use href="#p3-ab" fill="none" stroke-width="2.4"/>` +
    `<path d="M-20 3Q-28 10 -27 20M22 2Q16 12 20 22" fill="none" stroke-width="1.2"/>` +
    `<path d="M37 -19Q29 -34 33 -46Q40 -34 41 -21ZM42 -20Q41 -35 46 -45Q49 -32 46 -18Z" fill="${D}" stroke-width="1"/><path d="M44.5 -24L46 -40" stroke="${P}" stroke-width=".9"/>` +
    `<path d="M23 -3l-2 -5M27 -6l-2 -5M31 -10l-2 -5M34.5 -14.5l-2 -5" stroke-width="2"/><path d="M58 1.5l1.5 -1.2" stroke-width="1"/></g>`;

  /* His head, drawn once and used on this page and at the baptism: a gentle profile
     facing right, a smooth face with no line on the skin (Marth: no wrinkles), one
     soft brow, the eye, the beard, the hair to the shoulders; it is placed at natural
     size (about a seventh of His height), not enlarged */
  const jesusHead = t => `<g transform="${t}" stroke="${D}">` +
    `<path d="M6.5 -13.5C8.8 -11.5 10 -8 10.2 -5C10.3 -4 10.1 -3.2 10.3 -2.3C11.3 0 12.8 2 13.6 3.3C14 4.2 13.2 4.8 11.4 4.7C11.2 5.4 11.5 6.2 11.7 6.8L10.8 7.4C11.4 8 11.4 8.9 10.8 9.3L-6 10L-5 -9Z" fill="${P}" stroke-width="1.5"/>` +
    `<path d="M6.5 -13.5C3 -18.5 -7 -19.5 -11.5 -13.5C-15.5 -8 -15.5 2 -14.5 10C-13.5 17 -15 23 -18 28.5Q-15 31 -12 29Q-9.5 31.5 -6.5 29.5Q-3.5 30.5 -2.5 27C-3.5 22 -4 15 -4.5 10C-5 4 -5 -2 -3 -6C-1 -10 2.5 -12.5 6.5 -13.5Z" fill="${D}"/>` +
    `<path d="M-2 -3Q-5.2 -3.6 -5 .5Q-4.6 4 -1.6 3.2" fill="${P}" stroke-width="1.2"/>` +
    `<path d="M11.7 6.8C10.6 5.8 9.2 5.4 8 5.8C6.6 6.3 5.6 7.4 4.2 7.6C2.4 7.8 .5 6.5 -1 4.5L-4.6 8C-4.5 12.5 -1.5 16 3 17.5C6.5 18.6 10 17.4 11.3 14.4C11.9 13 11.7 11.2 10.9 9.8C10 10 9.2 9.6 9.1 8.8C9.9 8.9 10.6 8.4 10.9 7.6Z" fill="${D}"/>` +
    `<path d="M4 -16C-2 -16 -8 -12 -10.5 -4M1 -14C-5 -11 -8 -5 -9.5 3M-2 -16.5C-8 -14 -12 -6 -13 4M-12 2C-11.5 12 -12.5 20 -15.5 27M-8 8C-7.5 15 -8 22 -10 28M2 11Q4.5 14.5 7.5 15.5M6 10.5Q8 13 10 13.5" fill="none" stroke="${P}" stroke-width=".8"/>` +
    `<path d="M4 -4.6Q6.8 -7.4 9.8 -5.6Q6.8 -6.3 4 -4.6Z" fill="${D}" stroke-width=".4"/><path d="M4.6 -1.8Q6.6 -3.5 8.9 -1.5" fill="none" stroke-width="1.4"/>` +
    `<circle cx="7.3" cy="-1.2" r="1.2" fill="${D}"/></g>`;
  /* Jesus, seated on the colt (local frame: the seat at 0 0, facing right); the colt is
     sized to carry a grown man, His feet hanging near the ground */
  const jesus = `<g transform="translate(196 138) scale(1.08)" stroke="${D}" stroke-linejoin="round" stroke-linecap="round">` +
    `<g transform="scale(1.32)"><use href="#p3-ass"/><use href="#p3-gar" fill="${u(3, 'stripe')}" stroke-width="1.1"/><path d="${fringe}" stroke-width=".65"/></g>` +
    /* the mantle, falling behind over the colt's back */
    `<path d="M-11 -56C-20 -46 -25 -24 -28 -4Q-31 10 -34 24Q-24 28 -15 20Q-14 8 -14 2Z" fill="${u(3, 'fine')}" stroke-width="1.4"/><path d="M-19 -34Q-24 -12 -27 20" fill="none" stroke-width=".8"/>` +
    /* the robe, its folds, a sandalled foot */
    `<path d="M-14 2C-18 -18 -17 -42 -11 -56Q-5 -61 2 -61Q11 -59 13 -51C15 -41 14 -29 12 -21C17 -15 24 -6 27 6C30 22 30 42 29 60Q19 63 9 60C8 44 6 26 2 10C-4 8 -10 6 -14 2Z" fill="${P}" stroke-width="1.5"/>` +
    `<path d="M24 18Q26 40 24 60M18.5 18Q20 40 17 60.5M12.5 16Q14 40 12 60M9 -52Q11.5 -42 10 -31M6 -46Q7.5 -39 6.5 -34" fill="none" stroke-width=".8"/>` +
    `<path d="M15 60L15 64Q22 67 30 66Q30 63 26 60Z" fill="${P}" stroke-width="1.1"/><path d="M19 61.5L23 65M15 64.4L30 65.4" stroke-width=".7"/>` +
    /* the mantle over the near shoulder and across the lap */
    `<path d="M-11 -56Q-5 -61 1 -60Q4 -54 3 -46Q2 -38 4 -31Q11 -22 22 -14Q28 -7 29 4Q28 14 25 20Q14 10 4 6Q-6 4 -14 2C-18 -18 -17 -42 -11 -56Z" fill="${u(3, 'fine')}" stroke-width="1.4"/>` +
    `<path d="M-9 -46Q-6 -26 4 -12M-13 -26Q-6 -10 6 -3M15 -7Q21 2 22 16" fill="none" stroke-width=".8"/>` +
    `<path d="M-.6 -58Q2.4 -52 1.6 -46Q.6 -38 2.6 -30.5Q10 -21 20.8 -13" fill="none" stroke="${P}" stroke-width="1.3"/>` +
    /* the arm in its sleeve, the hand holding */
    `<path d="M1 -38Q4 -30 10 -28Q16 -27 20 -29L20 -23Q14 -21 8 -22Q0 -24 -2 -33Z" fill="${P}" stroke-width="1.1"/><path d="M5 -29Q10 -25 15 -25" fill="none" stroke-width=".6"/>` +
    `<path d="M20 -29.5Q24.5 -30.5 26.5 -28Q27.5 -25 24.5 -23.5Q22 -22.6 20 -23.2Z" fill="${P}" stroke-width="1"/><path d="M22 -26.5h3.5M22 -24.6h3" stroke-width=".5"/>` +
    /* the neck, the neckline, the head */
    `<rect x="-3" y="-68" width="10" height="12" fill="${P}" stroke="none"/><path d="M-6 -59Q2 -55 9 -58" fill="none" stroke-width="1.1"/>` +
    jesusHead('translate(4 -70) scale(.68)') + '</g>';

  const donkey = sheet(3, 'Jesus seated on the colt, its mother behind; garments and branches in the way; the crowd; the city ahead',
    ['hatch', 'horiz', 'stripe', 'rstripe'], tile('p3-fine', 3.4, 3.4, 1, `<path d="M1.7 0V3.4" stroke="${D}" stroke-width=".7"/>`) + assDefs, [
    /* the mount behind, the hill and the city ahead */
    `<path d="M12 116C60 106 120 122 176 176H12Z" fill="${u(3, 'hatch')}"/><path d="M12 116C60 106 120 122 176 176" fill="none" stroke="${D}" stroke-width="2.5"/>`,
    `<path d="M250 156C280 136 320 124 388 120V170H250Z" fill="${u(3, 'hatch')}"/><path d="M250 156C280 136 320 124 388 120" fill="none" stroke="${D}" stroke-width="2.5"/>`,
    `<rect x="314" y="92" width="34" height="18" fill="${u(3, 'hatch')}" stroke="${D}" stroke-width="2"/><path d="M310 92L331 80L352 92Z" fill="${P}" stroke="${D}" stroke-width="2" stroke-linejoin="round"/>`,
    `<path d="M276 150V110H388V150Z${crenel}" fill="${P}" stroke="${D}" stroke-width="2.4"/>`,
    `<path d="M288 150V82h5v6h4.5v-6h5v6h4.5v-6h5V150ZM352 150V78h5v6h4.5v-6h5v6h4.5v-6h5V150Z" fill="${P}" stroke="${D}" stroke-width="2.4"/>`,
    `<path d="M298 98h4v9h-4ZM362 94h4v9h-4ZM298 120h4v9h-4ZM362 116h4v9h-4Z" fill="${D}"/>`,
    `<path d="M322 150V136a10 10 0 0 1 20 0V150Z" fill="${D}"/>`,
    /* the road to the gate, the field beside it */
    `<path d="M12 196C120 196 230 180 322 150H342C300 196 250 236 200 248H12Z" fill="${P}"/>`,
    `<path d="M200 248C250 236 300 196 342 150H388V248Z" fill="${u(3, 'hatch')}"/>`,
    `<path d="M12 196C120 196 230 180 322 150M200 248C250 236 300 196 342 150" fill="none" stroke="${D}" stroke-width="2.5"/>`,
    /* the olive on the mount, and one pulling a branch down from it */
    `<path d="M50 116L52 82M51 96L40 86M52 90L64 80" stroke="${D}" stroke-width="5" stroke-linecap="round"/>`,
    `<path d="${bumpy(50, 62, 34, 21, 11, 1.1)}" fill="${u(3, 'hatch')}" stroke="${D}" stroke-width="2.5"/>`,
    `<path d="M16 120L19 94C20 88 30 88 31 94L34 120Z" fill="${D}"/><path d="M27 96L38 72" stroke="${D}" stroke-width="3.5" stroke-linecap="round"/>`,
    `<circle cx="25" cy="83" r="6" fill="${D}"/><ellipse cx="27.5" cy="83.5" rx="3.2" ry="4.3" fill="${P}"/>`,
    br(38, 72, 22, -40),
    /* the mother ass, a garment on her too, close behind the colt */
    `<g transform="translate(42 137) scale(1.5)"><use href="#p3-ass"/><use href="#p3-gar" fill="${u(3, 'horiz')}" stroke="${D}" stroke-width="1.6"/></g>`,
    /* one following behind */
    `<path d="M14 226L18 188C19 181 31 181 32 188L36 226Z" fill="${D}"/><circle cx="25" cy="174" r="7" fill="${D}"/><ellipse cx="28" cy="175" rx="3.6" ry="4.8" fill="${P}"/>`,
    `<path d="M23 192L16 170" stroke="${D}" stroke-width="3.5" stroke-linecap="round"/>`, br(16, 170, 24, -96),
    /* branches and a garment already in the way */
    br(232, 236, 28, -12), br(300, 216, 26, -30), br(268, 240, 22, -20),
    `<path d="M248 220L290 208L297 220L255 231Z" fill="${u(3, 'rstripe')}" stroke="${D}" stroke-width="1.8" stroke-linejoin="round"/>`,
    jesus,
    /* one going before, laying his garment in the way */
    `<path d="M302 212L306 188L318 187L321 212Z" fill="${D}"/><path d="M306 191L292 175L300 167L318 189Z" fill="${D}"/>`,
    `<path d="M297 176L289 207" stroke="${D}" stroke-width="3.5" stroke-linecap="round"/>`,
    `<circle cx="290" cy="169" r="6.5" fill="${D}"/><ellipse cx="287" cy="171.5" rx="3.4" ry="4.6" fill="${P}"/>`,
    /* two going before, toward the gate, branches raised */
    `<path d="M330 178L332 160C333 155 341 155 342 160L344 178ZM348 170L350 154C351 149 358 149 359 154L361 170Z" fill="${D}"/>`,
    `<circle cx="337" cy="150" r="5" fill="${D}"/><circle cx="354" cy="144" r="4.6" fill="${D}"/>`,
    `<path d="M340 160L344 142M357 154L362 138" stroke="${D}" stroke-width="2.6" stroke-linecap="round"/>`,
    br(344, 142, 18, -80), br(362, 138, 16, -76)
  ]);

  /* ── 4 · the baptism (Matthew 3:13–17; Luke 3:21–22), redrawn Oct 9 by
     Marth's ruling: Jesus, just risen from the Jordan, stands in the river
     with His hands together in prayer and His face lifted, drawn as on the
     Matthew 21 page (the same head, a robe with its folds). John stands in
     the water beside Him, a plain silhouette in his rough coat and belt. The
     sky has opened: the Father is light only, a shaft through a rent in the
     clouds, with no hand, no face, no figure. The Spirit comes down upon Him
     in the shape of a dove. No halo, no ring of light about Him. ── */
  let reeds = '';
  for (const x of [22, 30, 39, 47, 56, 344, 352, 361, 370, 378]) reeds += `M${x} 196V${x % 3 ? 164 : 170}`;
  let heads = '';
  for (const x of [22, 39, 56, 352, 370]) heads += `<rect x="${x - 2}" y="${x % 3 ? 160 : 166}" width="4" height="10" rx="2"/>`;
  /* Jesus standing in the river (local frame: the waterline at y 0, facing right; mirrored to face John) */
  const risen = `<g transform="translate(216 196) scale(-1.12 1.12)" stroke="${D}" stroke-linejoin="round" stroke-linecap="round">` +
    `<path d="M-14 -50Q-13 -60 2 -61Q11 -59 13 -51C15 -38 14 -20 15 1H-14C-15 -20 -15 -40 -14 -50Z" fill="${P}" stroke-width="1.5"/>` +
    `<path d="M8 -50Q10 -28 9 1M-8 -48Q-10 -24 -9 1M2 -26Q3 -12 2 1M-3 -14Q-2 -6 -3 1" fill="none" stroke-width=".8"/>` +
    /* the near arm in its sleeve, bent up to the hands joined in prayer */
    `<path d="M-6 -55Q-9 -42 -6 -30Q-4 -25 1 -27L14 -38L11 -45L1 -35Q1 -46 -1 -56Z" fill="${P}" stroke-width="1.1"/><path d="M-5 -33Q-2 -29 2 -31M-4 -48Q-6 -40 -4 -34" fill="none" stroke-width=".6"/>` +
    `<path d="M11 -45Q15 -53 19 -60Q21 -52 18 -43Q16 -39 12 -40Z" fill="${P}" stroke-width="1"/><path d="M14.5 -46.5L18.6 -57" stroke-width=".5"/>` +
    `<rect x="-3" y="-68" width="10" height="12" fill="${P}" stroke="none"/><path d="M-6 -59Q2 -55 9 -58" fill="none" stroke-width="1.1"/>` +
    jesusHead('translate(4 -70) rotate(-10) scale(.68)') +
    `<ellipse cx="0" cy="1" rx="22" ry="3.5" fill="none" stroke-width="1.5"/><ellipse cx="0" cy="3" rx="34" ry="6" fill="none" stroke-width="1"/></g>`;
  const baptism = sheet(4, 'Jesus, drawn with care, risen from the Jordan and praying; John beside Him; the sky opened as light; the dove coming down upon Him',
    ['hatch', 'dense', 'wave'],
    '<path id="p4-cl" d="M12 12H178C180 26 172 40 160 44C152 58 132 60 122 52C112 64 90 62 84 52C70 62 48 58 44 48C30 56 14 52 12 46Z"/>', [
    `<rect x="12" y="12" width="376" height="180" fill="${u(4, 'hatch')}"/>`,
    `<path d="M180 12H220L292 184H108Z" fill="${P}"/>`,
    `<path d="M200 40L134 184M200 40L166 184M200 40L234 184M200 40L266 184" stroke="${D}" stroke-width=".8" opacity=".7"/>`,
    `<use href="#p4-cl" fill="${P}" stroke="${D}" stroke-width="2.5"/><use href="#p4-cl" transform="translate(400 0) scale(-1 1)" fill="${P}" stroke="${D}" stroke-width="2.5"/>`,
    `<path d="M14 40C30 46 46 44 56 36M90 46C104 52 116 48 124 42M386 40C370 46 354 44 344 36M310 46C296 52 284 48 276 42" fill="none" stroke="${D}" stroke-width="1.4"/>`,
    /* the banks and the reeds */
    `<path d="M12 168C34 162 64 164 90 182H12ZM388 168C366 162 336 164 310 182H388Z" fill="${u(4, 'dense')}" stroke="${D}" stroke-width="2.5" stroke-linejoin="round"/>`,
    `<path d="${reeds}" stroke="${D}" stroke-width="2"/><g fill="${D}">${heads}</g>`,
    /* the river */
    `<rect x="12" y="180" width="376" height="68" fill="${P}"/><rect x="12" y="183" width="376" height="65" fill="${u(4, 'wave')}"/>`,
    `<path d="${waveLine(181, 12, 388, 2.5, 12)}" fill="none" stroke="${D}" stroke-width="2"/>`,
    /* John in the water beside Him: a rough coat of hair, a leather belt, his hand held out */
    `<g transform="translate(134 196) scale(1.1)"><path d="M-13 0L-12 -52C-11 -61 9 -61 11 -52L13 0Z" fill="${D}"/>` +
      `<path d="M-7 -46l4 3M3 -48l4 3M-6 -30l4 3M4 -28l4 3M-8 -8l4 3M3 -6l4 3" stroke="${P}" stroke-width="1.4" stroke-linecap="round"/><path d="M-13 -17H13" stroke="${P}" stroke-width="2.6"/>` +
      `<path d="M6 -50L25 -60" stroke="${D}" stroke-width="4.5" stroke-linecap="round"/>` +
      `<path d="M-7 -76C-11 -66 -9 -60 -4 -57H3Z" fill="${D}"/><circle cx="0" cy="-71" r="8" fill="${D}"/><ellipse cx="3.2" cy="-70.4" rx="4.8" ry="6" fill="${P}"/>` +
      `<ellipse cx="0" cy="1" rx="22" ry="3.5" fill="none" stroke="${D}" stroke-width="1.6"/></g>`,
    risen,
    /* the Spirit coming down upon Him, in the shape of a dove */
    `<g stroke="${D}" stroke-linejoin="round" transform="translate(200 52) scale(.85) translate(-200 -80)"><path d="M195 72L200 59L205 72Z" fill="${P}" stroke-width="1.8"/>` +
      `<path d="M200 76C190 66 174 60 156 62C166 70 178 82 196 88ZM200 76C210 66 226 60 244 62C234 70 222 82 204 88Z" fill="${P}" stroke-width="2"/>` +
      `<path d="M172 66l5 6M182 69l4 6M228 66l-5 6M218 69l-4 6" stroke-width="1.2"/>` +
      `<ellipse cx="200" cy="84" rx="7" ry="12" fill="${P}" stroke-width="2"/><circle cx="200" cy="98" r="5" fill="${P}" stroke-width="2"/>` +
      `<path d="M198.4 102.4L200 107L201.6 102.4Z" fill="${D}" stroke-width=".6"/></g>`
  ]);

  /* ── 5 · Jonah (Jonah 1:17–2:10): inside a great FISH (a fish, not a
     whale's shape: scales, gills, a tail fin standing upright), kneeling,
     hands raised, the weeds wrapped about his head; the sea; the ship above. ── */
  const jonah = sheet(5, 'Jonah praying inside the great fish, weeds about his head, the ship above',
    ['hatch', 'dense', 'wave', 'scale'],
    '<path id="p5-body" d="M40 160C60 112 150 92 230 104C280 112 312 132 324 150C312 168 280 190 230 198C150 210 60 200 40 160Z"/>' +
    '<clipPath id="p5-clip"><use href="#p5-body"/></clipPath>', [
    `<rect x="12" y="60" width="376" height="188" fill="${u(5, 'wave')}"/>`,
    `<path d="${waveLine(60, 12, 388, 4, 16)}" fill="none" stroke="${D}" stroke-width="2.6"/>`,
    /* the ship, small, on the face of the sea */
    `<path d="M74 54V18" stroke="${D}" stroke-width="2.2"/><path d="M62 22Q75 28 88 22V44Q75 49 62 44Z" fill="${R}" stroke="${D}" stroke-width="1.6"/>`,
    `<path d="M40 50H108L98 63H50Z" fill="${D}"/><path d="M74 18l9 3l-9 3Z" fill="${D}"/>`,
    /* the great fish */
    `<path d="M318 150L374 102Q356 150 374 198Z" fill="${P}" stroke="${D}" stroke-width="2.6" stroke-linejoin="round"/>`,
    `<path d="${rays(318, 150, 10, 50, -36, 36, 6)}" stroke="${D}" stroke-width="1.2"/>`,
    `<path d="M166 103C184 74 230 70 266 102Z" fill="${u(5, 'hatch')}" stroke="${D}" stroke-width="2.4" stroke-linejoin="round"/>`,
    `<path d="M220 194C230 214 248 220 258 214C252 206 246 200 242 194Z" fill="${u(5, 'hatch')}" stroke="${D}" stroke-width="2"/>`,
    `<use href="#p5-body" fill="${P}"/><use href="#p5-body" fill="${u(5, 'scale')}"/>`,
    `<g clip-path="url(#p5-clip)"><path d="M60 100H330V146C280 130 210 120 150 122C110 124 86 128 60 134Z" fill="${u(5, 'dense')}"/>` +
      `<path d="M20 90H96C116 140 116 172 96 210H20Z" fill="${P}"/></g>`,
    `<use href="#p5-body" fill="none" stroke="${D}" stroke-width="3"/>`,
    `<path d="M96 122C114 140 116 172 96 194" fill="none" stroke="${D}" stroke-width="3"/>`,
    `<path d="M41 160Q54 167 66 164" fill="none" stroke="${D}" stroke-width="2.6" stroke-linecap="round"/>`,
    `<circle cx="70" cy="140" r="8" fill="${P}" stroke="${D}" stroke-width="2.5"/><circle cx="68" cy="140" r="4" fill="${D}"/><circle cx="66.6" cy="138.6" r="1.3" fill="${P}"/>`,
    `<path d="M108 170C118 186 134 196 150 194C140 186 130 176 124 166Z" fill="${u(5, 'hatch')}" stroke="${D}" stroke-width="2" stroke-linejoin="round"/>`,
    /* inside: the belly, Jonah kneeling with hands raised */
    `<ellipse cx="200" cy="156" rx="60" ry="41" fill="none" stroke="${D}" stroke-width="1.5"/>`,
    `<ellipse cx="200" cy="156" rx="55" ry="36" fill="${P}" stroke="${D}" stroke-width="4"/>`,
    `<path d="M156 184C152 174 162 168 156 158M248 180C252 170 244 164 250 154" fill="none" stroke="${D}" stroke-width="1.8" stroke-linecap="round"/>`,
    `<path d="M174 187L176 179C178 172 186 170 193 172L215 178L219 187Z" fill="${D}"/>`,
    `<path d="M196 179L194 153C194 145 209 143 212 151L218 179Z" fill="${D}"/>`,
    `<path d="M197 153L182 129M210 153L220 128" stroke="${D}" stroke-width="4.6" stroke-linecap="round"/>`,
    `<circle cx="202" cy="138" r="9.5" fill="${D}"/><ellipse cx="198" cy="136" rx="5.4" ry="6.8" transform="rotate(-22 198 136)" fill="${P}"/>`,
    /* the weeds wrapped about his head, trailing */
    `<path d="M191 133C191 123 209 120 214 129M213 130C222 129 224 139 232 139S244 147 250 147M212 142C220 147 218 157 228 161S238 171 246 169" fill="none" stroke="${D}" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="M222 134q3 -6 8 -6q-2 6 -8 6ZM238 143q3 -6 8 -6q-2 6 -8 6ZM219 152q6 -1 8 4q-6 1 -8 -4ZM234 165q6 -1 8 4q-6 1 -8 -4ZM196 124q-1 -6 4 -8q1 6 -4 8Z" fill="${D}"/>`
  ]);

  /* ── 6 · the four horses (Revelation 6:1–8), under the Lamb who opens the
     seals; the Lamb is larger than any horse, the scroll's seven seals four
     of them opened. Each horse gallops with a streaming mane and tail; each
     rider has a cloak in folds and carries only what the text gives him.
     White: a bow, and a crown given. Red (the spot ink, by the text): a great
     sword. Black: a pair of scales held up. Pale: the rider named Death, hooded,
     the hood empty of any face, carrying a scythe (Marth's ruling), and no
     larger than the others. No skull, no bones, no gore. The first rider is
     plain, with no mark of Christ. Hades follows close behind the pale
     horse (Marth's ruling, Oct 9 evening): a dark hooded figure on foot, no
     face, its hem trailing into a low shadow, smaller than any rider. ── */
  /* a horse at the flying gallop, facing right: the body, the four legs, the
     mane and the tail; the rider's seat is near 36 12 */
  const horseDefs =
    `<path id="p6-b" d="M14 8C24 12 34 12 42 8C48 2 54 -6 58 -12Q61 -16 66 -14L78 -2Q81 2 78 5Q74 7 71 4Q67 1 64 2Q62 4 61 8C60 14 60 20 62 24Q63 30 58 34Q46 39 34 37Q24 38 18 36Q8 34 5 26Q4 16 14 8Z"/>` +
    `<path id="p6-n" d="M57 28L63 28Q66 34 67 41L70 49L74 53L73 56L67 55L66 51L63 43Q59 38 55 35ZM24 30L30 36Q24 40 17 45L10 52L7 56L1 56L2 53L6 51L12 44Q14 38 16 34Z"/>` +
    `<path id="p6-f" d="M50 32L57 33L59 44L53 51L50 49L54 44L51 38ZM28 32L34 34L36 42L43 50L42 54L38 53L38 50L32 45L30 38Z"/>` +
    `<path id="p6-m" d="M63 -15C56 -18 48 -10 44 -2C40 4 36 6 30 5C35 2 37 -2 39 -4C35 -3 31 -4 29 -7C37 -6 43 -12 50 -17C55 -20 60 -19 63 -15ZM65 -14Q70 -15 70 -9Q67 -12 65 -12Z"/>` +
    `<path id="p6-t" d="M13 9C5 3 -5 3 -17 9C-11 10 -10 13 -13 17C-7 13 -1 13 3 16C-1 20 -2 24 -2 28C4 21 8 17 11 15Z"/>` +
    `<path id="p6-r" d="M-6 2C-6 -10 -2 -20 4 -24Q10 -24 10 -18L10 -6Q12 0 14 4L10 8Q2 6 -6 2Z"/>` +
    `<g id="p6-x"><path d="M70 52L74 53L73 56L67 55ZM7 56L1 56L2 53L6 52ZM53 51L50 49L51 47L55 48ZM43 50L42 54L38 53L39 50ZM62 -14L62 -21L66 -15Z" fill="${D}" stroke="none"/><path d="M8 7Q-2 4 -12 9M5 12Q0 16 -1 22M58 -15Q49 -11 43 -1M54 -17Q46 -14 39 -5" fill="none" stroke="${P}" stroke-width=".75"/><path d="M-6 52q-4 -2 -9 0M-3 57q-5 -1 -9 1M36 57q-4 -1 -8 1" fill="none" stroke-width=".9"/></g>` +
    `<g id="p6-d" fill="none" stroke-width="1.1"><path d="M50 10Q56 18 55 30M16 14Q10 22 14 32M77 0l-2 1M65 -13L71 3M69 -1Q73 0 78 -2M72 3Q60 8 47 2"/><circle cx="70" cy="-7" r=".9" stroke-width="1.6"/></g>` +
    `<g id="p6-k"><path d="M0 3L11 7L9 18" fill="none" stroke-width="4.2"/><path d="M3 -23C-3 -20 -7 -13 -9 -5C-11 1 -12 7 -12 12Q-8 10 -5 12Q-2 10 1 12L-2 0Z" fill="${u(6, 'hatch')}" stroke-width="1.3"/><path d="M-2 -17Q-5 -6 -5 9M-6 -9Q-9 0 -9 10" fill="none" stroke-width=".8"/></g>`;
  /* one horse: its fill, the detail ink (dark on light, paper on dark), the mane's fill, the rider's load */
  const horse = (x, y, fill, ink, mane, rider, ex) =>
    `<g transform="translate(${x} ${y}) scale(.9)">` +
    `<use href="#p6-t" fill="${mane}" stroke-width="1.3"/>` +
    `<use href="#p6-f" fill="${fill === P ? u(6, 'hatch') : D}" stroke="${ink}" stroke-width="1.2"/>` +
    `<use href="#p6-n" fill="${fill}" stroke-width="1.8"/><use href="#p6-b" fill="${fill}" stroke-width="2"/>${ex || ''}` +
    `<use href="#p6-d" stroke="${ink}"/><use href="#p6-m" fill="${mane}" stroke-width="1.1"/><use href="#p6-x"/>` +
    `<g transform="translate(36 10)"><use href="#p6-k"/><use href="#p6-r" fill="${D}"${fill === D ? ` stroke="${P}" stroke-width="1.3"` : ''}/>${rider}</g></g>`;
  const head = `<circle cx="6" cy="-29" r="5.6" fill="${D}"/>`;
  let seals = '';
  for (let i = 0; i < 7; i++) seals += `<circle cx="${r1(270 + i * 6.2)}" cy="97" r="2.8" fill="${i < 4 ? P : R}" stroke="${R}" stroke-width="1.6"/>`;
  const horses = sheet(6, 'The Lamb with the sealed book above; four horses and riders: white with a bow and crown, red with a great sword, black with a balance, pale with a hooded rider and a scythe, a dark hooded shadow following him',
    ['hatch', 'dense'], horseDefs, [
    /* the Lamb on the cloud, the book of seven seals before him */
    `<path d="M122 106C114 96 128 86 138 92C142 82 160 80 168 88C176 80 194 80 202 88C210 80 228 80 236 88C244 80 262 80 270 88C278 82 296 84 300 92C312 88 324 98 314 106Z" fill="${P}" stroke="${D}" stroke-width="2.5" stroke-linejoin="round"/>`,
    `<path d="M160 74V95M173 76V97M207 76V97M220 74V95" stroke="${D}" stroke-width="4" stroke-linecap="round"/>`,
    `<path d="${bumpy(190, 57, 46, 23, 18, 1.1)}" fill="${P}" stroke="${D}" stroke-width="2.5"/>`,
    `<path d="M158 50q4 -4 8 0M178 42q4 -4 8 0M198 48q4 -4 8 0M168 64q4 -4 8 0M190 66q4 -4 8 0M212 62q4 -4 8 0M152 64q4 -4 8 0" fill="none" stroke="${D}" stroke-width="1.2"/>`,
    `<ellipse cx="247" cy="45" rx="14.5" ry="10.5" transform="rotate(22 247 45)" fill="${P}" stroke="${D}" stroke-width="2.5"/>`,
    `<path d="M238 38l-12 5l11 2Z" fill="${D}"/><path d="M246 42q2.6 2 5.2 0" fill="none" stroke="${D}" stroke-width="1.4" stroke-linecap="round"/><circle cx="258.5" cy="51" r="1.7" fill="${D}"/>`,
    `<path d="${bumpy(241, 34, 7, 4, 7, 1.1)}" fill="${P}" stroke="${D}" stroke-width="1.4"/>`,
    `<rect x="266" y="84" width="44" height="12" fill="${P}" stroke="${D}" stroke-width="2"/><ellipse cx="266" cy="90" rx="3.2" ry="6" fill="${P}" stroke="${D}" stroke-width="1.8"/><ellipse cx="310" cy="90" rx="3.2" ry="6" fill="${P}" stroke="${D}" stroke-width="1.8"/>`,
    seals,
    /* the ground */
    `<rect x="12" y="226" width="376" height="22" fill="${u(6, 'hatch')}"/><path d="M12 226H388" stroke="${D}" stroke-width="2.6"/>`,
    /* the four horses in the order of the seals, under one ink; the white horse: a bow, and a crown given him */
    `<g stroke="${D}" stroke-linejoin="round" stroke-linecap="round">`,
    horse(22, 174, P, D, D, head + `<path d="M.5 -33L1.5 -40L4.4 -36L6.5 -41L8.6 -36L11.5 -40L11.5 -33Z" fill="${D}"/>` +
      `<path d="M8 -19L19 -17" stroke="${D}" stroke-width="3.4"/><path d="M19 -34Q31 -18 19 -2" fill="none" stroke="${D}" stroke-width="2.3"/><path d="M19 -34V-2" stroke="${D}" stroke-width=".8"/>`),
    /* the red horse: a great sword */
    horse(102, 166, R, D, D, head + `<path d="M8 -19L14 -28" stroke-width="3.4"/><path d="M11.5 -31.5L1.5 -62.5L3 -66L4.5 -63.5L14.5 -32.5Z" fill="${D}"/><path d="M8.2 -30.5L17.8 -33.5" stroke-width="2.4"/><path d="M13 -32L15 -26" stroke-width="2.6"/>`),
    /* the black horse: the rider holds up a pair of scales */
    horse(182, 174, D, P, D, `<circle cx="6" cy="-29" r="5.6" fill="${D}" stroke="${P}" stroke-width="1.4"/><path d="M8 -19L17 -32" stroke="${D}" stroke-width="3.4"/>` +
      `<path d="M7 -40H29M18 -33V-43M7 -40L4 -30M7 -40L10 -30M29 -40L26 -30M29 -40L32 -30" fill="none" stroke="${D}" stroke-width="1.5"/><path d="M3 -30Q7 -25 11 -30ZM25 -30Q29 -25 33 -30Z" fill="${D}"/>`),
    /* the pale horse: the rider named Death, hooded, with a scythe */
    horse(300, 166, P, D, u(6, 'hatch'), `<path d="M0 -24C-1 -32 3 -38 9 -37C13 -36 14 -31 12 -24Z" fill="${D}"/><path d="M4 -25C4 -31 7 -34 10.5 -33" fill="none" stroke="${P}" stroke-width="1"/>` +
      `<path d="M-6 6L22 -44" stroke="${D}" stroke-width="2.2"/><path d="M8 -19L13 -18" stroke="${D}" stroke-width="3.4"/><path d="M22 -44Q34 -46 40 -35Q31 -40 21 -40Z" fill="${D}"/>`,
      `<use href="#p6-n" fill="${u(6, 'hatch')}" opacity=".55"/><use href="#p6-b" fill="${u(6, 'hatch')}" opacity=".55"/>`),
    '</g>',
    /* Hades, following with him: hooded and faceless, gliding, the hem fraying into shadow */
    `<path d="M234 226C246 220 258 219 270 222V226Z" fill="${u(6, 'dense')}"/>`,
    `<path d="M274 191C268 197 264 207 260 216Q256 222 248 226Q258 222 265 226Q271 221 277 226Q283 221 289 226Q293 222 298 224C295 212 293 202 291 192Z" fill="${D}"/>`,
    `<path d="M272 194C271 183 277 175 285 176C291 177 293 185 291 194Z" fill="${D}"/><path d="M290 180.5C284.5 180 281.5 184.5 282.2 188.5C283 192 286 193.5 290.5 192.5" fill="none" stroke="${P}" stroke-width="1.1"/>`,
    `<path d="M277 200Q273 210 270 222M285 199Q284 211 284 222" fill="none" stroke="${P}" stroke-width=".7"/>`
  ]);

  const pages = [
    { id: 'cover', cover: true, svg: cover },
    { id: 'noah', ref: 'Genesis 6–9', range: 'Genesis 8:6-12', svg: noah },
    { id: 'lions', ref: 'Daniel 6', range: 'Daniel 6:16-23', svg: lions },
    { id: 'donkey', ref: 'Matthew 21', range: 'Matthew 21:1-11', svg: donkey },
    { id: 'baptism', ref: 'Matthew 3', range: 'Matthew 3:13-17', svg: baptism },
    { id: 'jonah', ref: 'Jonah 1–2', range: 'Jonah 1:17-2:10', svg: jonah },
    { id: 'horses', ref: 'Revelation 6', range: 'Revelation 6:1-8', svg: horses }
  ];

  function page(key) {
    if (typeof key === 'number') return pages[key] || null;
    for (const p of pages) if (p.id === key) return p;
    return null;
  }
  function svg(key) { const p = page(key); return p ? p.svg : null; }

  return { ink, pages, svg, page, hand: { defs, frame: FRAME } };
})();
if (typeof window !== 'undefined') window.WFR_PICTO = WFR_PICTO;
if (typeof module !== 'undefined') module.exports = WFR_PICTO;
