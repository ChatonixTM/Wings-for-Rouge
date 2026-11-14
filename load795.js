/* load795.js - THE LOADING SCENE (board 795, part 1). Needs ui795.js first.
   Marth, Nov 13 2026, verbatim: "Everything is higher standard. Writing. Fonts animations, effects, transitions. Loading screens, game play".
   The wait is a show: Rouge on a flame-tree branch over a Jamaican coast, drawn here in code (no image files), PAINTS ITSELF IN as the game
   loads: the ink goes down first, line by line, then the colour is laid in with a brush, layer by layer in a painter's order (sky, sun,
   mountains, the hills and their houses, the sea, the sand and the palm, the tree, its flowers, and Rouge last). Named stages tick off,
   a big percent, a plain line of what is happening (the real file, the real count), the Eagle's short lines while she waits, and What's new.
   At 100% the light comes up and Rouge shakes out her wings; her tap sends her off the branch as the scene hands over.

   API (window.LOAD795)
     .mount(root, {files})   draw the scene into root (the game's #boot: its .bootIn - "loading" and "Tap to begin" - is moved into the
                             card, so the page's own tap handlers and classes keep working). Watches every <script> that loads after it.
     .file(name)             count one file as loaded (the mount's own listener calls this; a page may call it for a non-script part)
     .progress(p, label)     set the progress by hand (0..1) - the demo, or a page that knows better
     .finish()               100%: the flourish, the Eagle's last line, Tap to begin. The game calls it when its first frame is drawn.
     .away()                 her take-off (also fired when the root gets the class 'gone', as #boot does on her tap)
     .simulate({secs})       the demo: walk the real file list on a timer
     .state()                {shown, target, stage, loaded, total, done} for the guard
     .STAGES                 the named stages and the files each one holds (tests/ui795.js checks every <script src> of the page is in one)
   Every word on screen is a DRAFT for Marth's pen. */
(function () {
  'use strict';
  if (window.LOAD795) return;
  var U = window.UI795; if (!U) { console.warn('load795: ui795.js must load first'); return; }
  var C = U.C, INK = C.ink;

  /* ---------- the stages: what our page actually loads, in its order ---------- */
  var STAGES = [
    { id: 'wake', chip: 'Wake', name: 'Waking the painter', say: 'Morning, little one. Give the island a moment. It is getting dressed.',
      files: ['three.min.js', 'toon.js', 'gltf-loader.js', 'skeleton-utils.js', 'meshopt-decoder.js'] },
    { id: 'birds', chip: 'Birds', name: 'Calling the birds', say: 'The birds are coming in. Late, as usual.',
      files: ['models.js', 'people.js', 'villagers.js', 'tex-photos.js', 'textures.js', 'birds.js', 'models758.js', 'birds758.js', 'humans.js', 'folk.js'] },
    { id: 'village', chip: 'Village', name: 'Raising the village', say: 'Waking the village. Most of them were already up.',
      files: ['trees.js', 'treehouses.js', 'cabins.js', 'cave.js', 'hermits.js', 'homes784.js'] },
    { id: 'stories', chip: 'Stories', name: 'Setting the scenes', say: 'Telling the Hawk he is not invited. He is coming anyway.',
      files: ['sounds.js', 'cine.js', 'haven781.js', 'race782.js', 'school782.js', 'arrive783.js', 'ocarina781.js', 'after786.js', 'interact790.js', 'craft787.js', 'hud795.js', 'missions788.js', 'show795.js',
        'music.js', 'battle703-song.js', 'music-orchestra.js', 'rhythm.js', 'pictograms.js', 'chick-wear.js', 'hedgehogs.js', 'opening.js'] },
    { id: 'weather', chip: 'Weather', name: 'Mixing the weather', say: 'Hanging the clouds. Some of them are soft and wet.',
      files: ['skypiea.js', 'pirate.js', 'atmo.js', 'world-realism.js', 'boat.js', 'weather.js', 'seasons.js', 'village-build.js', 'runes.js', 'fall748.js', 'fx760.js', 'hearts714.js'] },
    { id: 'world', chip: 'World', name: 'Unrolling the world', say: 'Painting Jamaica. The Blue Mountains take a second coat.',
      files: ['world712-frame.js', 'creative712.js', 'world712-carib.js', 'world712-dunns.js', 'world712-travel.js', 'world-look755b.js', 'world-surfaces732.js', 'world-terrain.js',
        'world-features.js', 'world-vegetation.js', 'world-bar761.js', 'world725d-fast.js', 'world-chicks.js', 'world-imagery.js', 'world-landclass772.js', 'world712-photo.js',
        'hawkwake.js', 'hawkfight.js', 'hawkarena.js', 'orchard.js', 'net678.js', 'net678-config.js', 'net721.js'] },
    { id: 'people', chip: 'People', name: 'Waking the people', say: 'Putting Hal at the lake. He was going there anyway.',
      files: ['animals714.js', 'world-people.js', 'world-animals.js', 'world-life790.js', 'world-traffic.js', 'world-sky756.js', 'world-huts.js', 'world-interiors.js',
        'places790-data.js', 'places790.js', 'world-quests.js'] },
    { id: 'rouge', chip: 'Rouge', name: 'Rouge wakes up', say: 'Planting the big tree. It insists on being the biggest.', files: [] }
  ];
  var IDLE = ['Counting twigs. There are always more twigs.', 'Slow? Mountains are slow. Nobody complains about mountains.', 'Laying the reef. Mind the coral: it was here first.',
    'This is taking a while. The island is being thorough.', 'Lighting the lighthouse. The Peregrine says it is too slow.', 'Still here. So am I.'];   /* several from the writing pass (VOICE_795 Table C); never Grandma, the Dove or Scripture */
  var DONE_LINE = 'It is ready, little one. Go on.';
  var FILE_STAGE = {}; STAGES.forEach(function (s, i) { s.files.forEach(function (f) { FILE_STAGE[f] = i; }); });
  var KNOWN = STAGES.reduce(function (n, s) { return n + s.files.length; }, 0), ORDER = [].concat.apply([], STAGES.map(function (s) { return s.files; }));

  /* ---------- a seeded hand, so the painting is the same every time ---------- */
  var seed = 795; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function f1(v) { return Math.round(v * 10) / 10; }
  function smooth(pts, closed) {   // Catmull-Rom through the points, as cubic Beziers
    var d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ' C' + f1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
    }
    return d + (closed ? ' Z' : '');
  }
  function poly(pts) { return 'M' + pts.map(function (p) { return f1(p[0]) + ' ' + f1(p[1]); }).join(' L') + ' Z'; }
  function cloud(cx, cy, w, h) {
    var n = 6 + Math.floor(rnd() * 3), pts = [], d;
    for (var i = 0; i <= n; i++) { var t = Math.PI * (1 - i / n); pts.push([cx + (w / 2) * Math.cos(t), cy - h * 0.62 * Math.sin(t) * (0.8 + rnd() * 0.35)]); }
    d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
    for (var j = 1; j < pts.length; j++) { var dx = pts[j][0] - pts[j - 1][0], dy = pts[j][1] - pts[j - 1][1], r = Math.hypot(dx, dy) * (0.56 + rnd() * 0.12); d += ' A' + f1(r) + ' ' + f1(r) + ' 0 0 1 ' + f1(pts[j][0]) + ' ' + f1(pts[j][1]); }
    d += ' Q' + f1(cx) + ' ' + f1(cy + h * 0.16) + ' ' + f1(pts[0][0]) + ' ' + f1(pts[0][1]) + ' Z';
    var belly = 'M' + f1(cx - w * 0.38) + ' ' + f1(cy - h * 0.02) + ' Q' + f1(cx) + ' ' + f1(cy - h * 0.34) + ' ' + f1(cx + w * 0.4) + ' ' + f1(cy - h * 0.04) + ' Q' + f1(cx) + ' ' + f1(cy + h * 0.12) + ' ' + f1(cx - w * 0.38) + ' ' + f1(cy - h * 0.02) + ' Z';
    return { d: d, belly: belly };
  }
  function frond(x0, y0, ang, len, droop, w) {   // a palm frond: a curved spine, a tapering blade, its edge cut into leaflets
    var ca = Math.cos(ang), sa = Math.sin(ang), P1 = [x0 + ca * len * 0.5, y0 + sa * len * 0.5 - len * 0.18], P2 = [x0 + ca * len, y0 + sa * len + droop];
    var L = [], R = [], spine = [], n = 14;
    for (var i = 0; i <= n; i++) {
      var t = i / n, mt = 1 - t, x = mt * mt * x0 + 2 * mt * t * P1[0] + t * t * P2[0], y = mt * mt * y0 + 2 * mt * t * P1[1] + t * t * P2[1];
      var tx = 2 * mt * (P1[0] - x0) + 2 * t * (P2[0] - P1[0]), ty = 2 * mt * (P1[1] - y0) + 2 * t * (P2[1] - P1[1]), tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
      var hw = w * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.7) * (i % 2 ? 0.45 : 1);
      spine.push([x, y]); L.push([x + nx * hw, y + ny * hw]); R.push([x - nx * hw * 0.9, y - ny * hw * 0.9 + (i % 2 ? 0 : 3)]);
    }
    return { blade: poly(L.concat(R.reverse())), spine: smooth(spine) };
  }
  function ragged(x, y, w, h, flip) {   // the brush that lays a colour in: a long stroke, its front edge ragged with bristles
    var pts = [[x - 2 * w - 340, y - 20]], yy, c2 = 2 * x + w;   /* the bristles start 10+ units outside the box: nothing shows before its turn */
    for (yy = y - 20; yy <= y + h + 20; yy += 9) { var bristle = rnd() < 0.18 ? 30 + rnd() * 70 : rnd() * 26; pts.push([x - 110 + bristle, yy]); }
    pts.push([x - 2 * w - 340, y + h + 20]);
    if (flip) pts = pts.map(function (p) { return [c2 - p[0], p[1]]; });   /* mirrored about the box's middle: it starts to the right and sweeps left */
    return poly(pts);
  }

  /* ---------- the night palette: every colour the painting names, moved to Rouge's coast after dark (the house style: the void, line-light, a little colour) ---------- */
  var NIGHT = {
    '#7ccbe2': '#05060c', '#bfe6e4': '#0b0f24', '#fbe2ad': '#1d1638', '#f7c27c': '#3a2042', '#fff6cf': '#ffd45c', '#ffe2a0': '#ff8a4a',
    '#fff7d6': '#fff3c4', '#ffd36b': '#ffd45c', '#f4a23a': '#ff8a3c', '#fffbe6': '#fff6d8',
    '#3b86b0': '#081a33', '#2a9fae': '#0b2c41', '#3fc0b8': '#0d404a', '#8fe0cf': '#145a57', '#2c6f9a': '#071226', '#9fe6d3': '#1b6a62',
    '#f6deaa': '#241c2c', '#e6bf80': '#1b1522', '#fff1d0': '#3a2a55', '#c99a5e': '#120e18', '#e2b878': '#18121f',
    '#fffaf0': '#141a36', '#e3d7ea': '#0e1329', '#93a6cd': '#141a38', '#7385b4': '#0c1129',
    '#74ad5c': '#0e2b28', '#8fc06a': '#16403a', '#3f7d3c': '#0b2621', '#5c9a48': '#11362e',
    '#f6e3c4': '#1b2036', '#f3c6c0': '#24203a', '#cfe8df': '#18263a', '#fbe2a0': '#221f34', '#ffffff': '#1b2036', '#fff8ec': '#1b2036',
    '#2b4a5a': '#ffd45c', '#c8463a': '#a3202c', '#a9b2ba': '#2a3150', '#5b8fb0': '#26406a', '#5a3a2a': '#ffb454',
    '#17707a': '#4de8c9', '#fff3c0': '#ffd45c', '#e9fff8': '#6ea8ff', '#e9cf94': '#221a2a', '#fff6e4': '#cfd8f5', '#f4b23c': '#ffd45c',
    '#fff2e0': '#3a3550', '#a7774a': '#3a2a24', '#7d5534': '#2a1d18', '#6e4a2c': '#55402f', '#3f8a3c': '#135a3e', '#4f9a44': '#1a6b48', '#2f6e33': '#0e3a28',
    '#6e8a3a': '#3a4a24', '#7a9a40': '#44562a', '#5f7d32': '#323f1f',
    '#86593a': '#3a2a22', '#b0825a': '#6a4a36', '#7a5236': '#3a2a22', '#5aa046': '#1f7a52', '#4b8f3b': '#17603f', '#6cb052': '#2a8f5f', '#3f6e2e': '#1d5a3a',
    '#3f7d35': '#0f3a2a', '#2f6a2c': '#0b2e22', '#548f3e': '#174f36', '#c2453a': '#ff6b6b',
    '#f6d36a': '#ffd45c', '#e8613a': '#ff6b4a', '#d8402e': '#ff3b42', '#d8283a': '#ff3b42', '#ee4d58': '#ff6b72', '#a8182a': '#c8202e', '#9c1426': '#b01826'
  };
  function night(svg) { return svg.replace(/#[0-9a-fA-F]{6}\b/g, function (m) { return NIGHT[m.toLowerCase()] || m; }); }
  /* ---------- the painting ---------- */
  var VB = [1000, 800], RXY = [0, 0];
  function paint(px) {
    seed = 795;
    var defs = '', ink = [], col = [], k = 0, layers = [];
    function I(d, a, b, wdt, cls) { ink.push("<path class='l7-i" + (cls ? ' ' + cls : '') + "' pathLength='1' d='" + d + "' data-a='" + a + "' data-b='" + b + "' stroke-width='" + (wdt || 2.2) + "'/>"); }
    function L(id, a, b, bbox, flip, body) {   // a colour layer, laid in by a brush stroke between progress a and b
      var mid = px + 'm' + id; defs += "<mask id='" + mid + "' maskUnits='userSpaceOnUse' x='-200' y='-200' width='1400' height='1200'><path class='l7-brush' fill='#fff' d='" + ragged(bbox[0], bbox[1], bbox[2], bbox[3], flip) + "' data-a='" + a + "' data-b='" + b + "' data-w='" + (bbox[2] + 240) + "' data-flip='" + (flip ? 1 : 0) + "'/></mask>";
      col.push({ id: id, h: "<g class='l7-c l7-c-" + id + "' mask='url(#" + mid + ")'>" + body + '</g>' });
    }
    /* SKY: dawn over the sea, warm at the horizon */
    defs += "<linearGradient id='" + px + "sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#7ccbe2'/><stop offset='.45' stop-color='#bfe6e4'/><stop offset='.78' stop-color='#fbe2ad'/><stop offset='1' stop-color='#f7c27c'/></linearGradient>" +
      "<radialGradient id='" + px + "glow' cx='.65' cy='.52' r='.45'><stop offset='0' stop-color='#fff6cf' stop-opacity='.95'/><stop offset='.4' stop-color='#ffe2a0' stop-opacity='.5'/><stop offset='1' stop-color='#ffe2a0' stop-opacity='0'/></radialGradient>" +
      "<radialGradient id='" + px + "sun' cx='.42' cy='.38' r='.7'><stop offset='0' stop-color='#fff7d6'/><stop offset='.55' stop-color='#ffd36b'/><stop offset='1' stop-color='#f4a23a'/></radialGradient>" +
      "<linearGradient id='" + px + "sea' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3b86b0'/><stop offset='.35' stop-color='#2a9fae'/><stop offset='.8' stop-color='#3fc0b8'/><stop offset='1' stop-color='#8fe0cf'/></linearGradient>" +
      "<linearGradient id='" + px + "sand' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f6deaa'/><stop offset='1' stop-color='#e6bf80'/></linearGradient>" +
      "<linearGradient id='" + px + "haze' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff1d0' stop-opacity='0'/><stop offset='1' stop-color='#fff1d0' stop-opacity='.75'/></linearGradient>";
    var skyBody = "<rect x='-20' y='-20' width='1040' height='520' fill='url(#" + px + "sky)'/><rect x='-20' y='-20' width='1040' height='520' fill='url(#" + px + "glow)'/>";
    /* the light: soft rays from the sun, turning slowly (shown at the end) */
    var rays = ''; for (var r = 0; r < 14; r++) { var a0 = (r / 14) * Math.PI * 2, a1 = a0 + 0.12; rays += "<path d='M650 400 L" + f1(650 + Math.cos(a0) * 900) + ' ' + f1(400 + Math.sin(a0) * 900) + ' L' + f1(650 + Math.cos(a1) * 900) + ' ' + f1(400 + Math.sin(a1) * 900) + " Z'/>"; }
    /* clouds, two tones, an ink edge */
    var clouds = [[170, 130, 230, 74], [560, 92, 280, 84], [880, 170, 210, 62], [380, 245, 150, 42], [770, 300, 120, 30]], cloudBody = '';
    clouds.forEach(function (c, i) { var cl = cloud(c[0], c[1], c[2], c[3]); cloudBody += "<g class='l7-cloud l7-cloud" + i + "'><path d='" + cl.d + "' fill='#fffaf0'/><path d='" + cl.belly + "' fill='#e3d7ea' opacity='.9'/></g>"; I(cl.d, 0.0 + i * 0.015, 0.1 + i * 0.015, 2, 'l7-cloud' + i); });
    L('sky', 0.28, 0.44, [-40, -40, 1080, 560], false, skyBody + cloudBody);
    /* the sun */
    I('M714 400 A64 64 0 1 0 586 400 A64 64 0 1 0 714 400 Z', 0.02, 0.12, 2.4);
    L('sun', 0.36, 0.47, [570, 320, 160, 160], true, "<circle cx='650' cy='400' r='64' fill='url(#" + px + "sun)'/><path d='M612 372 A44 44 0 0 1 664 354' stroke='#fffbe6' stroke-width='6' fill='none' stroke-linecap='round' opacity='.8'/>");
    /* far mountains (the Blue Mountains, hazy) */
    var mt = [[-30, 318], [40, 296], [110, 268], [170, 300], [240, 282], [300, 322], [370, 352], [440, 404], [520, 448], [580, 470]];
    var mtD = smooth(mt) + ' L580 520 L-30 520 Z';
    I(smooth(mt), 0.04, 0.17, 2);
    var facets = "<path d='M110 268 Q150 300 172 300 L150 372 Q118 330 110 268 Z M240 282 Q270 310 300 322 L268 400 Q246 340 240 282 Z M40 296 Q60 330 50 380 L20 380 Q36 330 40 296 Z' fill='#7385b4' opacity='.5'/>";
    L('mtn', 0.42, 0.54, [-40, 250, 640, 280], false, "<path d='" + mtD + "' fill='#93a6cd'/>" + facets + "<rect x='-30' y='380' width='620' height='100' fill='url(#" + px + "haze)'/>");
    /* the green hills running down to the sea, with houses */
    var hl = [[-30, 380], [60, 368], [150, 392], [240, 410], [330, 438], [420, 462], [500, 486], [560, 500], [610, 506]];
    var hlD = smooth(hl) + ' L612 514 Q420 548 -30 566 Z';
    I(smooth(hl), 0.08, 0.2, 2.2);
    var hillShade = "<path d='M-30 430 Q120 410 250 446 T520 500 L560 520 L-30 540 Z' fill='#4f8a45' opacity='.55'/><path d='M60 368 Q100 380 120 420 Q80 410 40 420 Z' fill='#8fc06a' opacity='.6'/>";
    var houses = '', hs = [[372, 452, 30, 22, '#f6e3c4', '#c8463a'], [414, 468, 28, 20, '#f3c6c0', '#a9b2ba'], [452, 482, 34, 22, '#cfe8df', '#c8463a'], [496, 494, 26, 18, '#fbe2a0', '#a9b2ba'], [330, 438, 26, 20, '#ffffff', '#5b8fb0'], [536, 504, 24, 16, '#f6e3c4', '#c8463a'], [292, 424, 24, 18, '#fbe2a0', '#c8463a']];
    houses += "<path d='M246 418 h22 v-22 h-22 z' fill='#fff8ec'/><path d='M243 397 l14 -12 l14 12 z' fill='#a9b2ba'/><path d='M252 386 v-22 h10 v22' fill='#fff8ec'/><path d='M250 365 l7 -14 l7 14 z' fill='#c8463a'/><path d='M255 418 v-9 a2 2 0 0 1 5 0 v9' fill='#5a3a2a'/>";
    ['M246 418 h22 v-22 h-22 z', 'M243 397 l14 -12 l14 12 z', 'M252 386 v-22 h10 v22', 'M250 365 l7 -14 l7 14 z'].forEach(function (d) { I(d, 0.12, 0.22, 1.8); });
    hs.forEach(function (h, i) {
      var x = h[0], y = h[1], w = h[2], hh = h[3], wall = poly([[x, y], [x + w, y], [x + w, y - hh], [x, y - hh]]), roof = poly([[x - 5, y - hh + 1], [x + w / 2, y - hh - 15], [x + w + 5, y - hh + 1]]);
      houses += "<path d='" + wall + "' fill='" + h[4] + "'/><path d='" + roof + "' fill='" + h[5] + "'/><rect x='" + (x + 5) + "' y='" + (y - hh + 6) + "' width='6' height='6' fill='#2b4a5a'/><rect x='" + (x + w - 13) + "' y='" + (y - 11) + "' width='7' height='11' fill='" + C.sea + "'/>";
      I(wall, 0.12 + i * 0.012, 0.22 + i * 0.012, 1.8); I(roof, 0.12 + i * 0.012, 0.22 + i * 0.012, 1.8);
    });
    var bushes = ''; for (var b = 0; b < 16; b++) { var bx = 20 + b * 34 + rnd() * 14, by = 380 + bx * 0.2 + 18 + rnd() * 18, br = 9 + rnd() * 8; if (bx > 560) continue; bushes += "<circle cx='" + f1(bx) + "' cy='" + f1(by) + "' r='" + f1(br) + "' fill='" + (b % 3 ? '#3f7d3c' : '#5c9a48') + "'/>"; }
    L('hills', 0.48, 0.61, [-40, 340, 660, 230], true, "<path d='" + hlD + "' fill='#74ad5c'/>" + hillShade + bushes + houses);
    /* the sea, the little cay, the canoe, the sun's road on the water */
    var seaD = 'M-30 470 L1030 470 L1030 720 L-30 720 Z';
    I('M440 470 L1030 470', 0.1, 0.22, 2);
    var waves = '', road = '';
    for (var wv = 0; wv < 26; wv++) { var wx = rnd() * 1000, wy = 490 + rnd() * 160, wl = 14 + (wy - 480) * 0.18; waves += "<path d='M" + f1(wx) + ' ' + f1(wy) + ' q' + f1(wl / 2) + ' -5 ' + f1(wl) + " 0' stroke='#17707a' stroke-width='2' fill='none' stroke-linecap='round' opacity='.55'/>"; }
    for (var rd = 0; rd < 16; rd++) { var ry = 478 + rd * 10 + rd * rd * 0.5, rw = 16 + rd * 5 + rnd() * 10; road += "<rect class='l7-glint' style='animation-delay:" + f1(rnd() * 2) + "s' x='" + f1(650 - rw / 2 + (rnd() - 0.5) * 20) + "' y='" + f1(ry) + "' width='" + f1(rw) + "' height='3' rx='1.5' fill='#fff3c0'/>"; }
    var cay = "<path d='M820 474 Q880 452 960 474 Z' fill='#e9cf94'/><path d='M842 470 Q880 456 930 470 Z' fill='#4f8a45'/>";
    I('M820 474 Q880 452 960 474', 0.14, 0.24, 1.8);
    var canoe = "<g class='l7-canoe'><path d='M742 552 Q780 566 822 552 L814 562 Q780 572 750 562 Z' fill='#c8463a'/><path d='M748 557 Q780 566 816 557' stroke='#f4b23c' stroke-width='2.4' fill='none'/><path d='M784 552 L784 500 L812 548 Z' fill='#fff6e4'/></g>";
    I('M742 552 Q780 566 822 552 L814 562 Q780 572 750 562 Z', 0.15, 0.25, 1.8); I('M784 552 L784 500 L812 548 Z', 0.15, 0.25, 1.8);
    var shelf = "<rect x='-30' y='470' width='1060' height='26' fill='#2c6f9a' opacity='.35'/><path d='M-30 640 Q300 600 620 632 T1030 640 L1030 720 L-30 720 Z' fill='#9fe6d3' opacity='.55'/>";
    var specks = ''; for (var sp = 0; sp < 40; sp++) { var sx = rnd() * 1000, sy = 486 + rnd() * 150; specks += "<rect class='l7-glint' style='animation-delay:" + f1(rnd() * 3) + "s' x='" + f1(sx) + "' y='" + f1(sy) + "' width='" + f1(4 + rnd() * 8) + "' height='2' rx='1' fill='#e9fff8' opacity='.8'/>"; }
    L('sea', 0.54, 0.67, [-40, 460, 1080, 270], false, "<path d='" + seaD + "' fill='url(#" + px + "sea)'/>" + shelf + road + specks + waves + cay + canoe);
    /* the beach, the foam, a tall palm leaning over it */
    var sandTop = [[-30, 668], [120, 652], [300, 664], [480, 680], [660, 676], [840, 690], [1030, 682]];
    var sandD = smooth(sandTop) + ' L1030 1140 L-30 1140 Z';
    I(smooth(sandTop), 0.16, 0.28, 2.2);
    var foam = "<path d='" + smooth(sandTop.map(function (p) { return [p[0], p[1] - 7]; })) + "' stroke='#fffaf0' stroke-width='5' fill='none' stroke-linecap='round' opacity='.9'/>";
    var palmSpine = [[262, 790], [258, 690], [250, 600], [244, 530], [236, 478]], trunkL = [], trunkR = [];
    palmSpine.forEach(function (p, i) { var wdt = 13 - i * 1.8; trunkL.push([p[0] - wdt, p[1]]); trunkR.push([p[0] + wdt, p[1]]); });
    var trunkD = smooth(trunkL) + ' L' + trunkR.slice().reverse().map(function (p) { return f1(p[0]) + ' ' + f1(p[1]); }).join(' L') + ' Z';
    I(smooth(trunkL), 0.18, 0.3, 2.2); I(smooth(trunkR), 0.18, 0.3, 2.2);
    var rings = ''; for (var rg = 0; rg < 11; rg++) { var tt = rg / 11, py = 780 - tt * 300, pxx = 262 - Math.pow(tt, 1.2) * 25, ww = 12 - tt * 6; rings += "<path d='M" + f1(pxx - ww) + ' ' + f1(py) + ' q' + f1(ww) + ' 5 ' + f1(ww * 2) + " 0' stroke='#6e4a2c' stroke-width='1.6' fill='none'/>"; }
    var palm = "<path d='" + trunkD + "' fill='#a7774a'/><path d='" + smooth(trunkR) + "' stroke='#7d5534' stroke-width='6' fill='none' opacity='.6'/>" + rings;
    var fronds = [[-3.0, 160, 70], [-2.5, 170, 40], [-2.0, 130, 10], [-1.4, 120, 10], [-0.8, 130, 40], [-0.3, 120, 70], [0.4, 100, 80], [2.7, 130, 90]];
    fronds.forEach(function (fd, i) { var F = frond(236, 478, fd[0], fd[1], fd[2], 20); palm += "<path d='" + F.blade + "' fill='" + (i % 2 ? '#3f8a3c' : '#4f9a44') + "'/><path d='" + F.spine + "' stroke='#2f6e33' stroke-width='3' fill='none'/>"; I(F.blade, 0.2 + i * 0.008, 0.32 + i * 0.008, 1.6); });
    palm += "<circle cx='230' cy='484' r='7' fill='#6e8a3a'/><circle cx='243' cy='488' r='7' fill='#7a9a40'/><circle cx='236' cy='496' r='6' fill='#5f7d32'/>";
    var shade = "<ellipse cx='330' cy='770' rx='120' ry='14' fill='#c99a5e' opacity='.45'/><ellipse cx='720' cy='740' rx='200' ry='16' fill='#c99a5e' opacity='.35'/><g fill='#fff2e0' stroke='" + INK + "' stroke-width='1.2'><path d='M420 724 q6 -8 12 0 z'/><path d='M610 760 q5 -7 10 0 z'/><circle cx='890' cy='735' r='3'/></g>";
    L('sand', 0.62, 0.75, [-40, 420, 1080, 740], true, "<path d='" + sandD + "' fill='url(#" + px + "sand)'/>" + foam + shade + "<path d='M-30 740 Q300 720 600 748 T1030 744 L1030 820 L-30 820 Z' fill='#e2b878' opacity='.6'/>" + palm);
    /* the flame tree: a branch from the right, its fern leaves, the canopy at the top right */
    var br0 = [1030, 700], br1 = [720, 640], br2 = [360, 620];
    function bq(t) { var m = 1 - t; return [m * m * br0[0] + 2 * m * t * br1[0] + t * t * br2[0], m * m * br0[1] + 2 * m * t * br1[1] + t * t * br2[1]]; }
    var bT = [], bB = [];
    for (var bi = 0; bi <= 16; bi++) { var t = bi / 16, p = bq(t), th = 18 * (1 - t) + 5; bT.push([p[0], p[1] - th]); bB.push([p[0], p[1] + th * 0.8]); }
    var branchD = smooth(bT) + ' L' + bB.slice().reverse().map(function (p) { return f1(p[0]) + ' ' + f1(p[1]); }).join(' L') + ' Z';
    I(smooth(bT), 0.2, 0.34, 2.6); I(smooth(bB), 0.2, 0.34, 2.6);
    var twigs = [['M640 622 Q610 590 560 568', 6], ['M560 616 Q530 640 500 676', 5], ['M800 646 Q790 690 770 720', 6], ['M400 614 Q380 596 350 590', 4]], twigBody = '';
    twigs.forEach(function (tw) { twigBody += "<path d='" + tw[0] + "' stroke='#7a5236' stroke-width='" + tw[1] + "' fill='none' stroke-linecap='round'/>"; I(tw[0], 0.24, 0.36, 2); });
    function leafSprig(x, y, ang, len, scale) {   // a flame-tree leaf: a midrib with small paired leaflets
      var s = '', ca = Math.cos(ang), sa = Math.sin(ang), n = Math.floor(len / 9);
      s += "<path d='M" + f1(x) + ' ' + f1(y) + ' L' + f1(x + ca * len) + ' ' + f1(y + sa * len) + "' stroke='#3f6e2e' stroke-width='1.6'/>";
      for (var i = 1; i <= n; i++) { var tx = x + ca * i * 9, ty = y + sa * i * 9, l = 7 * scale * (1 - i / (n + 2)) + 3;
        s += "<ellipse cx='" + f1(tx - sa * l) + "' cy='" + f1(ty + ca * l) + "' rx='" + f1(l) + "' ry='" + f1(l * 0.42) + "' transform='rotate(" + f1((ang + Math.PI / 2) * 57.3) + ' ' + f1(tx - sa * l) + ' ' + f1(ty + ca * l) + ")' fill='" + (i % 2 ? '#5aa046' : '#4b8f3b') + "'/>" +
          "<ellipse cx='" + f1(tx + sa * l) + "' cy='" + f1(ty - ca * l) + "' rx='" + f1(l) + "' ry='" + f1(l * 0.42) + "' transform='rotate(" + f1((ang + Math.PI / 2) * 57.3) + ' ' + f1(tx + sa * l) + ' ' + f1(ty - ca * l) + ")' fill='" + (i % 2 ? '#4b8f3b' : '#6cb052') + "'/>"; }
      return s;
    }
    var leaves = '';
    [[560, 568, -2.6, 70], [560, 568, -1.9, 60], [500, 676, 2.2, 60], [770, 720, 1.9, 70], [350, 590, -2.9, 60], [350, 590, 2.6, 50], [690, 632, -1.4, 70], [880, 660, -1.7, 80], [940, 676, -1.1, 70]].forEach(function (s) { leaves += leafSprig(s[0], s[1], s[2], s[3], 1); });
    var canopy = '';
    for (var cn = 0; cn < 30; cn++) { var cx = 690 + rnd() * 350, cy = -30 + rnd() * 110; canopy += leafSprig(cx, cy, 1.3 + rnd() * 1.4, 60 + rnd() * 80, 1.2); }
    var canopyMass = "<path d='M680 -30 Q720 40 800 60 Q860 110 940 90 Q990 120 1030 110 L1030 -30 Z' fill='#3f7d35'/><path d='M760 -30 Q790 20 860 36 Q930 60 1030 50 L1030 -30 Z' fill='#2f6a2c'/>";
    I('M680 -30 Q720 40 800 60 Q860 110 940 90 Q990 120 1030 110', 0.22, 0.36, 2.4);
    L('tree', 0.7, 0.83, [300, -60, 760, 820], true, canopyMass + canopy + twigBody + "<path d='" + branchD + "' fill='#86593a'/><path d='" + smooth(bT.map(function (q) { return [q[0], q[1] + 4]; })) + "' stroke='#b0825a' stroke-width='4' fill='none' opacity='.7'/>" + leaves);
    /* the flowers: flame-red, one petal flecked gold */
    function flower(x, y, s) {
      var o = '', i, a;
      for (i = 0; i < 5; i++) { a = i * 72 + rnd() * 10; o += "<ellipse cx='" + f1(x + Math.cos(a / 57.3) * 6 * s) + "' cy='" + f1(y + Math.sin(a / 57.3) * 6 * s) + "' rx='" + f1(6.5 * s) + "' ry='" + f1(4.6 * s) + "' transform='rotate(" + f1(a) + ' ' + f1(x + Math.cos(a / 57.3) * 6 * s) + ' ' + f1(y + Math.sin(a / 57.3) * 6 * s) + ")' fill='" + (i === 0 ? '#f6d36a' : (i % 2 ? '#e8613a' : '#d8402e')) + "' stroke='" + INK + "' stroke-width='1'/>"; }
      return o + "<circle cx='" + f1(x) + "' cy='" + f1(y) + "' r='" + f1(2.4 * s) + "' fill='#8a2a1a'/>";
    }
    var flowers = '';
    [[556, 562], [572, 552], [546, 548], [352, 584], [364, 572], [770, 724], [784, 712], [694, 626], [880, 656], [896, 644], [940, 670], [720, 70], [760, 96], [800, 74], [850, 112], [905, 92], [960, 110], [990, 70], [740, 30], [870, 40], [930, 30], [500, 680], [512, 692]].forEach(function (f) { flowers += flower(f[0] + (rnd() - 0.5) * 6, f[1] + (rnd() - 0.5) * 6, 0.9 + rnd() * 0.45); });
    L('flowers', 0.78, 0.89, [320, -60, 720, 820], false, flowers);
    /* the Eagle, high, gliding; two gulls */
    var eagle = "<g class='l7-eagle'><path d='M-34 0 Q-18 -10 -4 -2 L0 4 L4 -2 Q18 -10 34 0 Q20 -2 8 6 L0 12 L-8 6 Q-20 -2 -34 0 Z' fill='#6b4426' stroke='" + INK + "' stroke-width='1.8' stroke-linejoin='round'/><circle cx='0' cy='-1' r='3.6' fill='#f5f1e6' stroke='" + INK + "' stroke-width='1.4'/><path d='M-4 12 L0 18 L4 12 Z' fill='#f5f1e6' stroke='" + INK + "' stroke-width='1.2'/></g>";
    var gulls = "<path class='l7-gull' d='M552 232 q8 -8 16 0 q8 -8 16 0' stroke='" + INK + "' stroke-width='2.2' fill='none' stroke-linecap='round'/><path class='l7-gull g2' d='M600 262 q6 -6 12 0 q6 -6 12 0' stroke='" + INK + "' stroke-width='2' fill='none' stroke-linecap='round'/>";
    /* ROUGE: a small red cardinal, on the branch, facing the sun */
    var foot = bq(0.74), RX = foot[0], RY = foot[1] - 14; RXY = [RX, RY];
    /* the same bird twice, part for part: once in colour (masked, laid in last), once in ink (drawn early). Same groups, same geometry, so her
       look, her blink and her wing shake move ink and colour together */
    var BIRD = [
      ['g', 'l7-rouge-in'],
      ['p', 'M-22 -58 C-48 -46 -80 -24 -108 4 C-106 18 -92 26 -80 20 C-60 4 -38 -12 -14 -26 Z', '#a8182a', 2.6, 'l7-tail'],
      ['s', 'M-30 -44 C-54 -30 -76 -10 -96 12', '#7c0f1e', 2],
      ['p', 'M-34 -46 C-36 -80 -6 -98 22 -92 C44 -88 52 -66 46 -44 C40 -20 14 -8 -6 -10 C-24 -12 -34 -28 -34 -46 Z', '#d8283a', 2.6],
      ['f', 'M10 -60 C34 -60 44 -44 36 -28 C26 -16 8 -14 -2 -16 C14 -28 16 -46 10 -60 Z', '#ee4d58'],
      ['g', 'l7-wing'],
      ['p', 'M-30 -64 C-10 -78 22 -70 26 -48 C20 -34 -6 -24 -40 -30 C-30 -40 -32 -52 -30 -64 Z', '#9c1426', 2.4],
      ['i', 'M-28 -42 Q-6 -40 16 -48 M-34 -35 Q-10 -31 8 -39', 1.6],
      ['/g'],
      ['g', 'l7-head'],
      ['p', 'M8 -92 C4 -112 14 -126 30 -128 L22 -152 Q42 -142 46 -126 C58 -120 62 -106 56 -94 C48 -84 22 -82 8 -92 Z', '#d8283a', 2.6],
      ['f', 'M40 -113 C50 -117 61 -111 62 -100 C60 -92 50 -88 42 -92 C36 -98 36 -107 40 -113 Z', '#1a0a10'],
      ['p', 'M55 -110 Q74 -105 79 -100 Q72 -94 55 -91 Z', '#f28c28', 2.2],
      ['i', 'M57 -101 L77 -100', 1.2],
      ['g', 'l7-eye'], ['c', 47, -104, 4.2, '#000'], ['c', 48.4, -105.4, 1.5, '#fff'], ['/g'],
      ['s', 'M16 -110 Q22 -100 30 -96', '#f06a76', 2.4],
      ['/g'],
      ['i', 'M2 -12 L-1 2 M14 -12 L13 2 M-8 3 Q-1 -2 6 4 M5 3 Q12 -2 20 4', 3],
      ['/g']
    ];
    function bird(mode) {   /* mode 'col': the fills; 'ink': the ink lines, each with its turn to be drawn */
      var o = "<g class='l7-rouge" + (mode === 'ink' ? ' l7-rouge-ink' : '') + "' transform='translate(" + f1(RX) + ' ' + f1(RY) + ") scale(.95)'>", n = 0;
      BIRD.forEach(function (b) {
        var t = b[0];
        if (t === 'g') o += "<g class='" + b[1] + "'>"; else if (t === '/g') o += '</g>';
        else if (t === 'c') o += mode === 'col' ? "<circle cx='" + b[1] + "' cy='" + b[2] + "' r='" + b[3] + "' fill='" + b[4] + "'/>" : '';
        else if (mode === 'col') {
          if (t === 'p' || t === 'f') o += "<path" + (b[4] ? " class='" + b[4] + "'" : '') + " d='" + b[1] + "' fill='" + b[2] + "'" + (t === 'f' ? " opacity='.9'" : '') + '/>';
          else if (t === 's') o += "<path d='" + b[1] + "' stroke='" + b[2] + "' stroke-width='" + b[3] + "' fill='none' stroke-linecap='round'/>";
          else if (t === 'i') o += "<path d='" + b[1] + "' stroke='" + INK + "' stroke-width='" + b[2] + "' fill='none' stroke-linecap='round'/>";
        } else if (t === 'p' || t === 'i') {
          o += "<path class='l7-i' pathLength='1' d='" + b[1] + "' data-a='" + f1((0.1 + n * 0.016) * 1000) / 1000 + "' data-b='" + f1((0.22 + n * 0.016) * 1000) / 1000 + "' stroke-width='" + (t === 'p' ? b[3] : b[2]) + "'/>"; n++;
        } else o += "<path d='" + b[1] + "' fill='none' stroke='none'/>";   /* keeps the ink group's box the colour group's box */
      });
      return o + '</g>';
    }
    var rouge = bird('col'), rInk = bird('ink');
    var rougeMid = px + 'mrouge'; defs += "<mask id='" + rougeMid + "' maskUnits='userSpaceOnUse' x='-200' y='-200' width='1400' height='1200'><path class='l7-brush' fill='#fff' d='" + ragged(RX - 120, RY - 170, 230, 190, false) + "' data-a='0.85' data-b='0.95' data-w='470' data-flip='0'/></mask>";
    var rougeCol = "<g class='l7-c l7-c-rouge' mask='url(#" + rougeMid + ")'>" + rouge + '</g>';
    /* sea-grape leaves in the near corner (frames the picture) */
    var grape = '';
    [[40, 760, 46], [96, 790, 40], [10, 700, 38], [150, 800, 36], [60, 690, 30]].forEach(function (g, i) { var d = 'M' + g[0] + ' ' + (g[1] + g[2]) + ' C' + (g[0] - g[2] * 1.2) + ' ' + (g[1] + g[2] * 0.2) + ' ' + (g[0] - g[2] * 0.6) + ' ' + (g[1] - g[2]) + ' ' + g[0] + ' ' + (g[1] - g[2] * 0.9) + ' C' + (g[0] + g[2] * 0.6) + ' ' + (g[1] - g[2]) + ' ' + (g[0] + g[2] * 1.2) + ' ' + (g[1] + g[2] * 0.2) + ' ' + g[0] + ' ' + (g[1] + g[2]) + ' Z';
      grape += "<path d='" + d + "' fill='" + (i % 2 ? '#3f7d35' : '#548f3e') + "'/><path d='M" + g[0] + ' ' + (g[1] + g[2]) + ' L' + g[0] + ' ' + (g[1] - g[2] * 0.6) + "' stroke='#c2453a' stroke-width='2'/>"; I(d, 0.26, 0.38, 2.2); });
    L('grape', 0.74, 0.86, [-60, 640, 260, 200], false, grape);
    function zc(ids) { return ids.map(function (id) { var c = col.filter(function (x) { return x.id === id; })[0]; return c ? c.h : ''; }).join(''); }
    var stars = ''; for (var st = 0; st < 70; st++) stars += "<circle class='l7-star' style='animation-delay:" + f1(rnd() * 4) + "s' cx='" + f1(rnd() * 1000) + "' cy='" + f1(rnd() * 380) + "' r='" + f1(0.6 + rnd() * 1.4) + "'/>";
    var rings = ''; for (var rr = 1; rr <= 7; rr++) rings += "<circle cx='470' cy='560' r='" + rr * 95 + "'/>";
    return night("<svg class='l7-paint' viewBox='0 0 " + VB[0] + ' ' + VB[1] + "' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><defs>" + defs + '</defs>' +
      "<rect x='-50' y='-50' width='1100' height='1300' fill='" + C.night + "'/><g fill='#e9edf8' opacity='.8'>" + stars + "</g><g class='l7-rings' fill='none' stroke='#4de8c9' stroke-opacity='.07' stroke-width='1.2'>" + rings + '</g>' +
      zc(['sky']) + "<g class='l7-rays' fill='#fff6d4'>" + rays + '</g>' + zc(['sun', 'mtn', 'sea', 'hills', 'sand', 'tree', 'flowers', 'grape']) +
      "<g class='l7-inks' fill='none' stroke='#4de8c9' stroke-linecap='round' stroke-linejoin='round'>" + ink.join('') + '</g>' + rougeCol + "<g class='l7-rink' fill='none' stroke='#ff6b6b' stroke-linecap='round' stroke-linejoin='round'>" + rInk + '</g>' + eagle + gulls + '</svg>');
  }

  /* ---------- the scene's own CSS ---------- */
  U.css(
    '.l795-root{position:absolute;inset:0;overflow:hidden;background:var(--u7-paper);color:var(--u7-ink);font-family:var(--u7-body);text-align:left;-webkit-user-select:none;user-select:none}' +
    '#boot.l795{background:var(--u7-paper)!important;display:block}' +
    '#boot.l795 .bootBird{display:none}' +
    '.l7-scene{position:absolute;left:0;right:0;top:0;height:100%}' +
    '.l7-scene:after{content:"";position:absolute;inset:0;background-image:var(--u7-fibre),var(--u7-grain);mix-blend-mode:multiply;opacity:.9;pointer-events:none}' +
    '.l7-paint{position:absolute;inset:0;width:100%;height:100%;display:block}' +
    '.l7-i{stroke-dasharray:1 1;stroke-dashoffset:1}' +
    '.l7-rays{opacity:0;transition:opacity 2.4s ease;transform-box:view-box;transform-origin:650px 400px;animation:l7turn 90s linear infinite}' +
    '.l795-root.lit .l7-rays,.l795-root.still .l7-rays{opacity:.22}' +
    '@keyframes l7turn{to{transform:rotate(360deg)}}' +
    '.l7-cloud0,.l7-cloud2,.l7-cloud4{animation:l7drift 26s ease-in-out infinite alternate}.l7-cloud1,.l7-cloud3{animation:l7drift 34s ease-in-out infinite alternate-reverse}' +
    '@keyframes l7drift{to{transform:translateX(26px)}}' +
    '.l7-eagle{offset-path:path("M600 300 C680 240 840 260 820 330 C800 380 640 370 600 300 Z");animation:l7glide 16s linear infinite;offset-rotate:auto 0deg}' +
    '@supports not (offset-path:path("M0 0")){.l7-eagle{transform:translate(620px,200px)}}' +
    '@keyframes l7glide{from{offset-distance:0%}to{offset-distance:100%}}' +
    '.l7-gull{animation:l7gull 1.1s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}.l7-gull.g2{animation-delay:.4s}' +
    '@keyframes l7gull{to{transform:scaleY(.55) translateY(-2px)}}' +
    '.l7-glint{opacity:.85}.l795-root.lit .l7-glint{animation:l7glint 2.2s ease-in-out infinite}' +
    '@keyframes l7glint{50%{opacity:.25}}' +
    '.l7-canoe{animation:l7bob 3.4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}' +
    '@keyframes l7bob{50%{transform:translateY(3px) rotate(1.5deg)}}' +
    '.l7-head{transform-box:fill-box;transform-origin:30% 90%;animation:l7look 6s ease-in-out infinite}' +
    '@keyframes l7look{0%,60%,100%{transform:rotate(0)}66%,82%{transform:rotate(-9deg)}}' +
    '.l7-eye{transform-box:fill-box;transform-origin:50% 50%;animation:l7blink 4.6s infinite}' +
    '@keyframes l7blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}' +
    '.l7-wing{transform-box:fill-box;transform-origin:85% 20%}' +
    '.l795-root.lit .l7-wing{animation:l7shake .9s cubic-bezier(.3,1.5,.5,1) 2}' +
    '@keyframes l7shake{0%,100%{transform:rotate(0)}30%{transform:rotate(-38deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(-24deg)}}' +
    '.l7-rouge-in{transform-box:fill-box;transform-origin:50% 100%}' +
    '.l795-root.lit .l7-rouge-in{animation:l7hop .7s cubic-bezier(.3,1.6,.5,1) .3s both}' +
    '@keyframes l7hop{40%{transform:translateY(-14px) scaleY(1.06)}70%{transform:translateY(0) scaleY(.94)}100%{transform:none}}' +
    '.l795-root.away .l7-rouge{transition:transform 1s cubic-bezier(.5,0,.6,1),opacity .9s ease .2s;opacity:0}' +
    '.l795-root.away .l7-paint{transition:transform 1.2s cubic-bezier(.5,0,.6,1);transform:scale(1.08)}' +
    '.l7-flash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 62% 46%,rgba(255,250,224,.95),rgba(255,226,150,.55) 30%,rgba(255,226,150,0) 66%);opacity:0}' +
    '.l795-root.lit .l7-flash{animation:l7flash 1.6s ease-out both}' +
    '@keyframes l7flash{0%{opacity:0}25%{opacity:1}100%{opacity:0}}' +
    /* the title: our name, painted, ink-edged */
    '.l7-title{position:absolute;left:calc(16px + var(--u7-safe-l));top:calc(14px + var(--u7-safe-t));transform:rotate(-3deg);transform-origin:0 0;pointer-events:none}' +
    '.l7-title small{display:block;font-family:var(--u7-display);font-size:19px;color:var(--u7-paper);-webkit-text-stroke:5px var(--u7-ink);paint-order:stroke fill;letter-spacing:.02em;margin:0 0 -6px 4px}' +
    '.l7-title b{display:block;font-family:var(--u7-display);font-weight:400;font-size:56px;line-height:1;color:var(--u7-rouge);-webkit-text-stroke:7px var(--u7-ink);paint-order:stroke fill;text-shadow:4px 5px 0 var(--u7-ink)}' +
    '.l7-title i{display:inline-block;margin:4px 0 0 6px;font-style:normal;font-family:var(--u7-body);font-weight:900;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;background:var(--u7-ink);color:var(--u7-paper);padding:3px 8px;border-radius:4px;transform:rotate(1.5deg)}' +
    /* the Eagle while she waits */
    '.l7-talk{position:absolute;right:4px;bottom:calc(100% - 10px);width:min(92%,360px)}' +
    '.l7-talk .u7-speech{margin-left:auto;max-width:380px}' +
    '.l7-talk .u7-face .u7-disc{width:56px;height:56px}.l7-talk .u7-bubble{font-size:14px;padding:9px 12px 10px}' +
    /* the card: percent, stage, the plain line, the brush bar, the chips, What's new, and the tap */
    '.l7-panel{position:absolute;left:calc(12px + var(--u7-safe-l));right:calc(12px + var(--u7-safe-r));bottom:calc(12px + var(--u7-safe-b));padding:12px 14px 12px;--tilt:-.6deg}' +
    '.l7-head1{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:center}' +
    '.l7-pct{grid-row:span 2;font-family:var(--u7-display);font-size:58px;line-height:.86;color:var(--u7-rouge);-webkit-text-stroke:2px var(--u7-ink);paint-order:stroke fill;text-shadow:3px 3px 0 var(--u7-ink);min-width:2.3ch;letter-spacing:-.02em}' +
    '.l7-pct sup{font-size:.42em;vertical-align:.95em;margin-left:1px;text-shadow:2px 2px 0 var(--u7-ink)}' +
    '.l7-stage{font-family:var(--u7-display);font-size:22px;line-height:1.02;min-width:0}' +
    '.l7-line{font-weight:700;font-size:11.5px;line-height:1.3;color:var(--u7-ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}' +
    '.l7-line b{color:var(--u7-ink);font-weight:900}' +
    '.l7-bar{position:relative;height:16px;margin:10px 0 10px;border:2px solid var(--u7-ink);border-radius:9px 6px 10px 7px;background:rgba(255,255,255,.55);overflow:hidden}' +
    '.l7-bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,var(--u7-rouge),var(--u7-flame) 70%,var(--u7-sun));border-right:2px solid var(--u7-ink);transition:width .35s ease-out}' +
    '.l7-bar i:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.22) 0 6px,transparent 6px 14px);animation:l7slide 1s linear infinite}' +
    '@keyframes l7slide{to{background-position:28px 0}}' +
    '.l7-panel .u7-checks{margin-bottom:10px}' +
    '.l7-new .u7-newcard{padding:0;background:none;border:0;box-shadow:none;transform:none}' +
    '.l7-new .u7-newcard h5{font-size:15px;margin-bottom:6px}' +
    '.l7-new .u7-new{gap:5px}.l7-new .u7-new li{font-size:12px}' +
    '.l7-new .u7-new li>span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.l7-tapslot{display:none}' +
    '.l795-root.ready .l7-tapslot{display:block;margin:2px 0 10px}' +
    '.l795-root.ready .l7-bar{display:none}' +
    '#boot.l795 .bootIn{display:block;padding:0;gap:0;pointer-events:none}' +
    '#boot.l795 .bootLoad,.l795-root .l7-load{position:absolute;right:8px;top:50%;transform:translateY(-50%);z-index:1;font-size:9px!important;letter-spacing:.18em!important;margin:0;font-family:var(--u7-body);font-weight:900;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--u7-ink2)}' +
    '#boot.l795 .bootTap,.l795-root .l7-tap{margin:0;padding:10px 12px 9px;text-align:center;font-family:var(--u7-display);font-weight:400;font-size:28px;letter-spacing:.01em;color:var(--u7-paper);' +
      'background:var(--u7-rouge);border:2px solid var(--u7-ink);border-radius:12px 9px 13px 10px;box-shadow:3px 4px 0 var(--u7-ink);text-shadow:2px 2px 0 var(--u7-ink);animation:l7tap 1.6s ease-in-out infinite}' +
    '@keyframes l7tap{50%{transform:scale(1.035) rotate(-1deg)}}' +
    '.l7-tapslot{position:relative}.l7-panel .u7-stamp{position:absolute;right:-6px;bottom:-14px;background:var(--u7-paper);z-index:2;pointer-events:none}' +
    '#boot.l795.gone{transition:opacity .7s ease .2s}' +
    '.l7-panel .u7-checks{gap:5px}.l7-panel .u7-chip{text-transform:none;letter-spacing:0;font-size:11px;padding:5px 5px;gap:4px}.l7-panel .u7-chip i{width:12px;height:12px}' +
    '.l795-root.ready .l7-load{display:none}' +
    /* desktop and landscape: the card to the left, the picture wide, the Eagle bottom right */
    '@media (min-width:760px) and (min-aspect-ratio:1/1){' +
      '.l7-title b{font-size:84px}.l7-title small{font-size:26px}' +
      '.l7-panel{left:calc(28px + var(--u7-safe-l));right:auto;bottom:28px;width:420px;padding:16px 18px}' +
      '.l7-pct{font-size:72px}.l7-stage{font-size:26px}' +
      '.l795-root>.l7-talk{position:absolute;left:auto;right:calc(28px + var(--u7-safe-r));top:auto;bottom:34px;width:400px}' +
      '.l7-panel .u7-chip{font-size:12px}.l7-line{font-size:12.5px}.l7-new .u7-new li{font-size:12.5px}' +
    '}' +
    '@media (max-width:759px),(max-aspect-ratio:1/1){.l7-scene{height:62%}.l7-scene .l7-paint{height:100%}}' +
    '@media (max-height:700px) and (max-aspect-ratio:1/1){.l7-new{display:none}.l7-title b{font-size:46px}}' +
    '@media (prefers-reduced-motion:reduce){.l7-rays,.l7-cloud0,.l7-cloud1,.l7-cloud2,.l7-cloud3,.l7-cloud4,.l7-eagle,.l7-gull,.l7-canoe,.l7-head,.l7-eye,.l7-bar i:after,#boot.l795 .bootTap,.l795-root .l7-tap{animation:none!important}}'
  );

  /* ---------- THE HOUSE STYLE over the scene (Marth: "Take from bait and nuke or The face as inspiration"): the night void, line-light that glows, glass,
     mono numbers, glowing pills; later rules win over the first block, which keeps the layout ---------- */
  U.css(
    '.l795-root{background:radial-gradient(120% 80% at 50% 0%,#0d1124 0,#05060c 62%)}#boot.l795{background:#05060c!important}' +
    '.l7-scene:after{background-image:radial-gradient(130% 90% at 50% 40%,rgba(5,6,12,0) 55%,rgba(5,6,12,.75) 100%);mix-blend-mode:normal;opacity:1}' +
    '.l7-inks{filter:drop-shadow(0 0 2px rgba(77,232,201,.9)) drop-shadow(0 0 7px rgba(77,232,201,.35))}' +
    '.l7-rink{filter:drop-shadow(0 0 2px rgba(255,59,66,.95)) drop-shadow(0 0 8px rgba(255,59,66,.45))}' +
    '.l7-c-rouge{filter:drop-shadow(0 0 10px rgba(255,59,66,.55))}.l7-c-sun{filter:drop-shadow(0 0 24px rgba(255,212,92,.55))}' +
    '.l7-star{animation:l7twinkle 3.2s ease-in-out infinite}@keyframes l7twinkle{50%{opacity:.25}}' +
    '.l7-rings{transform-box:view-box;transform-origin:470px 560px;animation:l7rings 7s ease-in-out infinite}@keyframes l7rings{50%{transform:scale(1.05);opacity:.55}}' +
    '.l795-root.lit .l7-rays,.l795-root.still .l7-rays{opacity:.08}' +
    '.l7-flash{background:radial-gradient(circle at 47% 66%,rgba(77,232,201,.45),rgba(255,212,92,.18) 30%,rgba(5,6,12,0) 62%)}' +
    /* the name: Bait & Nuke's two-colour title, a mono eyebrow */
    '.l7-title{transform:none}' +
    '.l7-title small{font-family:var(--u7-display);font-weight:600;font-size:22px;letter-spacing:-.01em;color:var(--u7-mint);-webkit-text-stroke:0;margin:0 0 -2px 1px;text-shadow:0 0 14px rgba(77,232,201,.45)}' +
    '.l7-title b{font-family:var(--u7-display);font-weight:700;font-size:58px;letter-spacing:-.04em;line-height:.95;color:var(--u7-rouge);-webkit-text-stroke:0;text-shadow:0 0 22px rgba(255,59,66,.55),0 0 2px rgba(255,59,66,.9)}' +
    '.l7-title i{display:flex;align-items:center;gap:8px;margin:8px 0 0 1px;transform:none;background:none;padding:0;font-family:var(--u7-mono);font-weight:400;font-size:10px;letter-spacing:.24em;color:var(--u7-ink2)}' +
    '.l7-title i:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--u7-mint);box-shadow:0 0 8px var(--u7-mint)}' +
    /* the panel: glass, mono numbers, the Face's progress line */
    '.l7-panel{padding:14px 16px 14px}' +
    '.l7-pct{font-family:var(--u7-mono);font-weight:700;font-size:44px;line-height:1;letter-spacing:-.04em;color:var(--u7-ink);-webkit-text-stroke:0;text-shadow:0 0 18px rgba(77,232,201,.35);min-width:3ch}' +
    '.l7-pct sup{font-size:.4em;vertical-align:1em;color:var(--u7-mint);text-shadow:none}' +
    '.l7-stage{font-family:var(--u7-display);font-weight:600;font-size:20px;letter-spacing:-.01em;line-height:1.1}' +
    '.l7-line{font-family:var(--u7-mono);font-weight:400;font-size:10.5px;letter-spacing:.04em;color:var(--u7-ink2)}.l7-line b{color:var(--u7-mint);font-weight:700}' +
    '.l7-bar{height:4px;margin:20px 0 12px;border:0;border-radius:4px;background:rgba(120,140,210,.16);overflow:visible}' +
    '.l7-bar i{border:0;border-radius:4px;background:linear-gradient(90deg,var(--u7-mint),#a8fff0);box-shadow:0 0 10px var(--u7-mint),0 0 2px #fff}' +
    '.l7-bar i:after{display:none}' +
    '#boot.l795 .bootLoad,.l795-root .l7-load{top:-15px;right:0;transform:none;font-family:var(--u7-mono)!important;font-weight:400!important;color:var(--u7-mint)!important;letter-spacing:.24em!important}' +
    '.l7-panel .u7-checks{gap:6px;margin-bottom:12px}.l7-panel .u7-chip{text-transform:uppercase;letter-spacing:.12em;font-size:9.5px;padding:5px 10px 5px 8px;gap:6px}.l7-panel .u7-chip i{width:6px;height:6px}' +
    '.l7-new .u7-newcard{-webkit-backdrop-filter:none;backdrop-filter:none;background:none;border:0;box-shadow:none;padding:0}.l7-new .u7-newcard h5{font-size:10px;margin-bottom:8px}.l7-new .u7-new{gap:6px}.l7-new .u7-new li{font-size:12px}' +
    '#boot.l795 .bootTap,.l795-root .l7-tap{padding:13px 14px 12px;font-family:var(--u7-display);font-weight:700;font-size:21px;letter-spacing:.01em;color:#fff;background:linear-gradient(180deg,#ff4a50,#d81f2a);border:1px solid rgba(255,140,140,.6);border-radius:999px;' +
      'box-shadow:0 0 0 4px rgba(255,59,66,.14),0 0 30px -4px rgba(255,59,66,.75),inset 0 1px 0 rgba(255,255,255,.35);text-shadow:none;animation:l7tapglow 1.8s ease-in-out infinite}' +
    '@keyframes l7tapglow{50%{box-shadow:0 0 0 7px rgba(255,59,66,.08),0 0 40px -2px rgba(255,59,66,.9),inset 0 1px 0 rgba(255,255,255,.35)}}' +
    '.l7-panel .u7-stamp{right:12px;bottom:auto;top:12px;background:rgba(5,6,12,.92)}' +
    '.l7-talk{bottom:calc(100% + 8px)}.l795-root>.l7-talk{bottom:34px}' +
    '@media (min-width:760px) and (min-aspect-ratio:1/1){.l7-title b{font-size:86px}.l7-title small{font-size:30px}.l7-pct{font-size:54px}.l7-stage{font-size:24px}}' +
    '@media (max-height:700px) and (max-aspect-ratio:1/1){.l7-title b{font-size:46px}}' +
    '@media (prefers-reduced-motion:reduce){.l7-star,.l7-rings,#boot.l795 .bootTap,.l795-root .l7-tap{animation:none!important}}'
  );

  /* ---------- the scene's life ---------- */
  var S = { root: null, shown: 0, target: 0, soft: 0, manual: false, loaded: 0, seen: {}, stage: -1, total: KNOWN, done: false, bytes: 0, t0: performance.now(), raf: 0, lastSay: 0, idle: 0, inks: [], brushes: [] };
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function draw(p) {
    for (var i = 0; i < S.inks.length; i++) { var n = S.inks[i], f = clamp((p - n.a) / (n.b - n.a)); if (f !== n.f) { n.f = f; n.el.style.strokeDashoffset = String(1 - f); } }
    for (var j = 0; j < S.brushes.length; j++) { var m = S.brushes[j], g = ease(clamp((p - m.a) / (m.b - m.a))); if (g !== m.g) { m.g = g; m.el.setAttribute('transform', 'translate(' + f1((m.flip ? -1 : 1) * g * m.w) + ' 0)'); } }
  }
  function tick() {
    S.raf = 0; if (!S.root) return;
    if (S.root.closest('[hidden]') || (S.host && S.host.classList.contains('gone') && S.awayDone)) return;
    /* a slow line: while the next file is on its way the painting keeps moving, easing toward that file's share and never past it (a weak signal
       never looks frozen); S.soft is only ever a fraction of the step to the next file */
    if (!S.done && !S.manual) { var nxt = Math.min(0.94, ((S.loaded + 0.85) / S.total) * 0.94); S.soft += (nxt - S.soft) * 0.006; if (S.soft > S.target) S.target = S.soft; }
    var d = S.target - S.shown; S.shown += d * (S.done ? 0.12 : 0.07) + (d > 0 ? 0.0006 : 0); if (S.shown > S.target) S.shown = S.target;
    /* the line art never waits for a slow link: the ink goes down on its own clock (all of it by ~7 s), the colour only with real progress */
    S.drawn = Math.max(S.shown, S.done ? 1 : Math.min(0.27, ((performance.now() - S.t0) / 7000) * 0.27)); draw(S.drawn);
    var pct = Math.round(S.shown * 100); if (pct !== S.pct) { S.pct = pct; S.pctEl.firstChild.nodeValue = String(pct); }
    S.barEl.style.width = (S.shown * 100).toFixed(1) + '%';
    if (!S.done && performance.now() - S.lastSay > 7000 && S.talk) { S.lastSay = performance.now(); S.talk.say(IDLE[S.idle++ % IDLE.length]); }
    if (Math.abs(S.target - S.shown) > 0.0005 || !S.done) S.raf = requestAnimationFrame(tick);
  }
  function kick() { if (!S.raf && S.root) S.raf = requestAnimationFrame(tick); }
  function setStage(i, why) {
    if (i === S.stage || i < 0 || i >= STAGES.length) return;
    for (var k = 0; k < i; k++) S.checks.tick(STAGES[k].id);
    S.stage = i; S.checks.active(STAGES[i].id); S.stageEl.textContent = STAGES[i].name;
    if (S.talk && why !== 'quiet') { S.lastSay = performance.now(); S.talk.say(STAGES[i].say); }
  }
  function lineFor(name) {
    var mb = S.bytes > 0 ? ' · ' + (S.bytes / 1048576).toFixed(1) + ' MB' : '';
    var next = null; for (var i = 0; i < ORDER.length; i++) if (!S.seen[ORDER[i]]) { next = ORDER[i]; break; }
    S.lineEl.innerHTML = (next ? '&darr; <b>' + U.esc(next) + '</b>' : 'building <b>the island</b>') + ' · ' + S.loaded + '/' + S.total + mb;
  }
  function file(name) {
    if (S.done || !name) return; var base = String(name).split('?')[0].split('#')[0]; base = base.slice(base.lastIndexOf('/') + 1);
    if (S.seen[base]) return; S.seen[base] = 1; S.loaded++;
    if (FILE_STAGE[base] == null) S.total = Math.max(S.total, S.loaded + 1);
    try { var e = performance.getEntriesByType('resource').filter(function (r) { return r.name.indexOf(base) >= 0; })[0]; if (e) S.bytes += e.encodedBodySize || e.transferSize || 0; } catch (x) {}
    var frac = S.loaded / S.total; S.target = Math.max(S.target, clamp(frac) * 0.94);
    var next = STAGES.length - 1; for (var i = 0; i < STAGES.length; i++) { var s = STAGES[i], all = s.files.every(function (f) { return S.seen[f]; }); if (!all) { next = i; break; } }
    setStage(next); lineFor(base); kick();
  }
  function progress(p, label) { S.target = Math.max(S.target, clamp(p)); var si = Math.min(STAGES.length - 1, Math.floor(clamp(p) * (STAGES.length - 0.0001))); setStage(si); if (label) S.lineEl.textContent = label; kick(); }
  function finish() {
    if (S.done || !S.root) return; S.done = true; S.target = 1; setStage(STAGES.length - 1, 'quiet'); S.checks.all();
    var secs = ((performance.now() - S.t0) / 1000).toFixed(1);
    S.stageEl.textContent = 'All here'; S.lineEl.innerHTML = '<b>' + S.loaded + ' files</b>' + (S.bytes > 0 ? ' · ' + (S.bytes / 1048576).toFixed(1) + ' MB' : '') + ' · ready in ' + secs + ' s';
    S.root.classList.add('ready');
    setTimeout(function () { if (!S.root) return; S.root.classList.add('lit'); var st = U.stamp('Wings ready', { colour: '#4de8c9' }); S.panel.appendChild(st); U.stampIn(st, 200); if (S.talk) S.talk.say(DONE_LINE); }, 380);
    kick();
  }
  function away() { if (!S.root || S.root.classList.contains('away')) return; S.root.querySelectorAll('.l7-rouge').forEach(function (r) { r.style.transform = 'translate(' + (RXY[0] + 560) + 'px,' + (RXY[1] - 560) + 'px) scale(.35)'; }); S.root.classList.add('away'); setTimeout(function () { S.awayDone = true; }, 1300); }
  function mount(host, o) {
    o = o || {}; if (S.root) return S.root; S.manual = !!o.manual;
    var root = U.el('div', 'l795-root'), px = 'l7' + Math.floor(Math.random() * 1e6).toString(36) + '-';
    root.innerHTML = "<div class='l7-scene'>" + paint(px) + "<div class='l7-flash'></div></div>" +
      "<div class='l7-title'><small>Wings for</small><b>Rouge</b><i>A gift, made by hand // Jamaica</i></div>";
    var panel = U.card({ cls: 'l7-panel' });
    panel.innerHTML = "<div class='l7-head1'><div class='l7-pct'>0<sup>%</sup></div><div class='l7-stage'>Opening the paint box</div><div class='l7-line'>Fetching <b>three.min.js</b>, the 3D engine</div></div>" +
      "<div class='l7-bar'><i></i></div><div class='l7-tapslot'></div><div class='l7-checks'></div><div class='l7-new'></div><div class='l7-talk'></div>";
    root.appendChild(panel);
    S.root = root; S.host = host; S.panel = panel; S.pctEl = panel.querySelector('.l7-pct'); S.stageEl = panel.querySelector('.l7-stage'); S.lineEl = panel.querySelector('.l7-line'); S.barEl = panel.querySelector('.l7-bar i');
    S.checks = U.checklist(STAGES.map(function (s) { return { id: s.id, label: s.chip }; })); panel.querySelector('.l7-checks').appendChild(S.checks.el);
    panel.querySelector('.l7-new').appendChild(U.whatsNew({ max: o.newMax || 3 }));
    S.inks = [].map.call(root.querySelectorAll('.l7-i'), function (e) { return { el: e, a: +e.getAttribute('data-a'), b: +e.getAttribute('data-b'), f: -1 }; });
    S.brushes = [].map.call(root.querySelectorAll('.l7-brush'), function (e) { return { el: e, a: +e.getAttribute('data-a'), b: +e.getAttribute('data-b'), w: +e.getAttribute('data-w'), flip: e.getAttribute('data-flip') === '1', g: -1 }; });
    host = host || document.body;
    if (host.id === 'boot') host.classList.add('l795');
    var bootIn = host.querySelector && host.querySelector('.bootIn');
    if (bootIn) { panel.querySelector('.l7-tapslot').appendChild(bootIn); var bl = bootIn.querySelector('.bootLoad'); if (bl) panel.querySelector('.l7-bar').appendChild(bl); }
    else { panel.querySelector('.l7-tapslot').innerHTML = "<p class='l7-tap' role='button' tabindex='0'>Tap to begin</p>"; panel.querySelector('.l7-bar').appendChild(U.el('p', 'l7-load', 'loading')); }
    host.insertBefore(root, host.firstChild);
    if (U.reduced) root.querySelectorAll('.l7-i').forEach(function (e) { e.style.transition = 'none'; });
    var talkBox = root.querySelector('.l7-talk'), wideQ = window.matchMedia ? matchMedia('(min-width:760px) and (min-aspect-ratio:1/1)') : null;
    function placeTalk() { var wide = wideQ && wideQ.matches; (wide ? root : panel).appendChild(talkBox); }   /* phone: on the card's top edge; wide: bottom right of the picture */
    placeTalk(); if (wideQ) { if (wideQ.addEventListener) wideQ.addEventListener('change', placeTalk); else if (wideQ.addListener) wideQ.addListener(placeTalk); }
    S.talk = U.speech({ who: 'eagle', parent: talkBox });
    setTimeout(function () { if (S.talk && !S.done && S.stage <= 0) S.talk.say(STAGES[0].say); }, 250);
    U.slam(S.talk.el, { from: 'right', delay: 200 }); U.slam(panel, { from: 'down', delay: 60 });
    setStage(0, 'quiet');
    if (!o.manual) {   // every script that loads after this one, as it lands
      document.addEventListener('load', function (e) { var t = e.target; if (t && t.tagName === 'SCRIPT' && t.src) file(t.src); }, true);
      document.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'SCRIPT' && t.src) file(t.src); }, true);
    }
    if (host.id === 'boot' && window.MutationObserver) new MutationObserver(function () { if (host.classList.contains('ready')) finish(); if (host.classList.contains('gone')) away(); }).observe(host, { attributes: true, attributeFilter: ['class'] });
    kick();
    return root;
  }
  function scenery(host, o) {   /* the painting, finished, as a backdrop (the demo's title and cards sit on it until the live world is wired). o.viewBox: '0 280 1000 800' lifts Rouge into a phone's upper half */
    o = o || {}; var w = U.el('div', 'l795-root lit l7-backdrop'); w.innerHTML = "<div class='l7-scene' style='height:100%'>" + paint('l7b' + Math.floor(Math.random() * 1e6).toString(36) + '-') + '</div>';
    if (o.viewBox) w.querySelector('.l7-paint').setAttribute('viewBox', o.viewBox);
    w.querySelectorAll('.l7-i').forEach(function (e) { e.style.strokeDashoffset = '0'; });
    w.querySelectorAll('.l7-brush').forEach(function (e) { e.setAttribute('transform', 'translate(' + ((e.getAttribute('data-flip') === '1' ? -1 : 1) * +e.getAttribute('data-w')) + ' 0)'); });
    w.querySelector('.l7-wing') && w.classList.remove('lit'); w.classList.add('still');
    (host || document.body).appendChild(w); return w;
  }
  function simulate(o) {
    o = o || {}; var all = []; STAGES.forEach(function (s) { all = all.concat(s.files); }); var secs = o.secs || 8, i = 0, gap = (secs * 1000) / (all.length + 4);
    (function step() { if (i < all.length) { file(all[i++]); setTimeout(step, gap * (0.4 + Math.random() * 1.2)); } else if (o.finish !== false) setTimeout(finish, gap * 4); })();
  }
  window.LOAD795 = { mount: mount, scenery: scenery, file: file, progress: progress, finish: finish, away: away, simulate: simulate, STAGES: STAGES,
    state: function () { return { shown: S.shown, target: S.target, stage: S.stage >= 0 ? STAGES[S.stage].id : null, loaded: S.loaded, total: S.total, done: S.done, bytes: S.bytes }; },
    _draw: function (p) { S.shown = S.target = p; draw(p); if (S.pctEl) S.pctEl.firstChild.nodeValue = String(Math.round(p * 100)); if (S.barEl) S.barEl.style.width = (p * 100) + '%'; } };
})();
