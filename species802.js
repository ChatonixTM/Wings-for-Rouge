/* species802.js - TREES OF THE REAL PLACE (board 802; the 802 builder, Nov 14 2026). Marth, verbatim: "Oh I just realized we need to implement trees
   and their real world location, ie they're  palm trees in Jamaica naturally, I don't know of any in Canada".
   Every number DRAFT (unmeasured on her phone).

   WHAT IT IS: the world's trees chosen by the place's real climate and setting, not by latitude alone.
     - THE CLIMATE: climate802.js, the Koppen-Geiger map of Beck et al. 2018 (CC BY 4.0), 0.5 degree, bundled (works offline).
     - THE SETTING: the vegetation's own land class (forest, wetland, mangrove, park ...), the ground's height, and the distance to the sea
       (probed on the streamed ground's own heights, cached per ~200 m cell; asked only where a palm could grow).
     - THE KINDS: trees.js's six (pine, fir, krumm, oak, birch, snag) plus nine new unit shapes made here: maple, palm, tropic (a wide dense
       broadleaf), ceiba (the emergent silk-cotton), treefern, olive, cypress, umbrella (stone pine, live oak), acacia. Each SPECIES (a real tree,
       its name and source below) draws as one of those shapes, with its own height, width and colour.
   COST LAW (world-vegetation.js's header): every shape is made at load (attach), in the vegetation's ONE program (Lambert, vertex colours,
     instance colours); one InstancedMesh per shape, in the scene from load; nothing is added while she plays. A shape with no tree near her draws
     nothing (r128 skips an instanced draw of count 0), so over Jamaica the northern shapes cost nothing and over Ontario the palms cost nothing.
   It never touches the game: tools/wiring/wire-802-species.js splices it into world-vegetation.js and the page.

   THE SPECIES AND THEIR SOURCES (fetched Nov 14 2026; [WP] = Wikipedia, used only where nothing better loaded):
     A&R   Asprey, G.F. & Robbins, R.G. (1953) The Vegetation of Jamaica. Ecological Monographs 23(4).
           https://seabean.com/mucuna/Literature/Asprey%20&%20Robbins.%201953.%20The%20Vegetation%20of%20Jamaica.pdf
     JFD   Forestry Department of Jamaica, All About Mangroves: https://www.forestry.gov.jm/wetlands/All-About-Mangroves
     JIS   Jamaica Information Service, the Blue Mahoe (to ~1,200 m): https://jis.gov.jm/information/symbols/jamaican-national-tree-the-blue-mahoe/
     GLN   Jamaica Gleaner, breadfruit (1793) and mango (1782) "all over Jamaica": https://old.jamaica-gleaner.com/pages/history/story0019.html
     POD   Gymnosperm Database, Podocarpus urbanii (1,160-2,256 m, abundant at the summit): https://conifers.org/po/Podocarpus_urbanii.php
     JOB   Jamaica Observer 2012, Caribbean pine planted in the Blue Mountain Forest Reserve: https://www.jamaicaobserver.com/2012/06/11/forestry-dept-utilises-native-tree-species
     BMW   [WP] Blue Mountains (Jamaica), bands: lower montane 750-1,500 m, cloud forest with tree ferns 1,500-1,800 m, elfin woodland above:
           https://en.wikipedia.org/wiki/Blue_Mountains_(Jamaica)
     PRO   PROSEA, Cocos nucifera (pantropical, coastal, mostly planted below 500 m): https://prosea.prota4u.org/view.aspx?id=829
     ECO   FAO EcoCrop, Cocos nucifera (tropical Aw / Ar climates; killed at -1/0 C): https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=744
     NRC   Natural Resources Canada, forest classification (boreal; Great Lakes-St Lawrence; Carolinian):
           https://natural-resources.canada.ca/forest-forestry/sustainable-forest-management/forest-classification
     ONT   Ontario, forest regions: https://www.ontario.ca/page/forest-regions
     SAB   Castanea, Sabal minor in NE North Carolina, the northernmost native palm of eastern North America (so no wild palm in Canada):
           https://castaneajournal.com/article/sabal-minor-arecaceae-a-new-northern-record-of-palms-in-eastern-north-america-2/
     JRC   EU JRC European Atlas of Forest Tree Species (Olea europaea, Pinus pinea, Pinus halepensis, Quercus ilex, Cupressus sempervirens,
           Fagus sylvatica, Pinus sylvestris): https://ies-ows.jrc.ec.europa.eu/efdac/download/Atlas/pdf/<Species>.pdf
     EUF   EUFORGEN species pages (Quercus robur, Picea abies, Betula pendula): https://www.euforgen.org/species/<name>
     USF   USFS forest type groups (oak-hickory, maple-beech-birch, loblolly-shortleaf, Douglas-fir, ponderosa, lodgepole, pinyon-juniper):
           https://www.fs.usda.gov/ne/global/pubs/books/fslulc2/lu_metric/table10.html
     BAI   Bailey 1995 ecoregions (212 NE, 231 SE, 242 Puget-Willamette, M331 S Rockies, 261 California, 322 American desert):
           http://www.forestasyst.org/ecoregions/<code>.cfm
     SIL   USFS Silvics: longleaf pine, live oak: https://research.fs.usda.gov/silvics/<name>; Sabal palmetto (Keys to Cape Fear, within ~20 km
           of the sea): https://dendro.cnre.vt.edu/dendrology/USDAFSSilvics/398.pdf
     ABS   Australian Bureau of Statistics Year Book 2012, forests: eucalypt ~79%, acacia ~7%:
           https://www.abs.gov.au/AUSSTATS/abs@.nsf/7d12b0f6763c78caca257061001cc588/7a87fd809f5a684eca257a07001ac4c1!OpenDocument
     VAC   [WP] Vachellia tortilis, umbrella thorn of Africa's savanna and Sahel and the Middle East: https://en.wikipedia.org/wiki/Vachellia_tortilis
     MUL   [WP] Acacia aneura, mulga, ~20% of Australia: https://en.wikipedia.org/wiki/Acacia_aneura
     SAG   (Nov 15, at the wiring; NOT fetched, the range as commonly known, DRAFT) Carnegiea gigantea, the saguaro: the Sonoran Desert only (southern
           Arizona, Sonora, a sliver of SE California), on the low desert below ~1,200 m. A box here, not a map: 26-35.2 N, 115.6-109 W, hot desert or steppe.
   Where none of the named regions applies (South America, Asia, most of Africa), the mix is CLIMATE-GENERIC (tropical broadleaf, temperate
   broadleaf and pine, boreal conifer and birch by the Koppen class): shapes, not species claims. */
window.WFR_SP802 = (function () {
  'use strict';
  var KG = function () { return window.WFR_KG802 || null; };
  /* the vegetation's classes (world-vegetation.js: the same numbers) */
  var NONE = 0, FARM = 1, GRASS = 2, WET = 3, SCRUB = 4, PARK = 5, ORCH = 6, MANG = 7, FOREST = 8, RES = 9;
  /* the shapes: 0-5 are trees.js's (world-vegetation.js's KINDS); 6+ are made here, in this order */
  var GEOS = ['maple', 'palm', 'tropic', 'ceiba', 'treefern', 'olive', 'cypress', 'umbrella', 'acacia', 'palm2', 'fanpalm', 'tropic2', 'bamboo', 'spruce', 'cactus'];   // 802 wiring (Nov 15): + cactus, the desert's own (a saguaro)
  var G = { pine: 0, fir: 1, krumm: 2, oak: 3, birch: 4, snag: 5 }; GEOS.forEach(function (n, i) { G[n] = 6 + i; });
  /* the far shapes: 0 cone, 1 crown (world-vegetation.js's), 2 palm (a star of fronds), 3 flat (a wide flat crown) */
  var MIDS = ['palm', 'flat'], MD = { cone: 0, crown: 1, palm: 2, flat: 3 };
  /* the crown's radius as a share of the height, per shape 6+ (798's canopy and trunk tests read it, as RK798 for trees.js's) */
  var RK = [0.3, 0.3, 0.46, 0.42, 0.32, 0.5, 0.12, 0.46, 0.55, 0.3, 0.26, 0.34, 0.3, 0.16, 0.12];

  /* THE SPECIES: [name, Latin, shape, far shape, height m, width factor, crown tint (on the shape's own colours), source] */
  var SP = [
    ['pine', 'Pinus', 'pine', 'cone', 22, 1, null, 'trees.js'], ['fir', 'Abies', 'fir', 'cone', 22, 1, null, 'trees.js'], ['krumm', 'wind-bent conifer', 'krumm', 'cone', 4, 1, null, 'trees.js'],
    ['oak', 'Quercus', 'oak', 'crown', 20, 1, null, 'trees.js'], ['birch', 'Betula', 'birch', 'crown', 16, 1, null, 'trees.js'], ['snag', 'dead tree', 'snag', 'crown', 12, 1, null, 'trees.js'],
    /* 6 */ ['spruce', 'Picea (black, white, Norway, Engelmann, Sitka)', 'spruce', 'cone', 20, 1, [1, 1, 1], 'NRC ONT EUF BAI'],
    /* 7 */ ['aspen', 'Populus tremuloides / tremula', 'birch', 'crown', 18, 0.95, [0.9, 1.0, 0.92], 'NRC ONT BAI'],
    /* 8 */ ['maple', 'Acer saccharum / rubrum', 'maple', 'crown', 22, 1, [1, 1, 1], 'NRC ONT BAI USF'],
    /* 9 */ ['beech', 'Fagus sylvatica / grandifolia', 'maple', 'crown', 26, 1.05, [1.06, 1.05, 0.88], 'JRC NRC BAI'],
    /* 10 */ ['hemlock', 'Tsuga canadensis / heterophylla', 'fir', 'cone', 24, 0.95, [0.82, 0.86, 0.9], 'NRC ONT BAI'],
    /* 11 */ ['tamarack', 'Larix laricina', 'fir', 'cone', 16, 0.8, [1.32, 1.18, 0.78], 'NRC ONT'],
    /* 12 */ ['coconut palm', 'Cocos nucifera (planted along the beaches)', 'palm', 'palm', 17, 1, [1, 1, 1], 'A&R PRO ECO'],
    /* 13 */ ['cabbage palmetto', 'Sabal palmetto', 'fanpalm', 'palm', 12, 1.1, [0.92, 0.96, 0.86], 'SIL'],
    /* 14 */ ['mango', 'Mangifera indica', 'tropic', 'crown', 14, 1.05, [0.86, 0.92, 0.9], 'A&R GLN'],
    /* 15 */ ['breadfruit', 'Artocarpus altilis', 'tropic', 'crown', 15, 0.95, [1.14, 1.12, 0.92], 'A&R GLN'],
    /* 16 */ ['mahogany', 'Swietenia mahagoni', 'tropic2', 'crown', 21, 0.95, [1, 1, 1], 'A&R'],
    /* 17 */ ['blue mahoe', 'Hibiscus elatus', 'tropic2', 'crown', 18, 0.8, [0.86, 0.96, 1.12], 'JIS'],
    /* 18 */ ['silk cotton', 'Ceiba pentandra', 'ceiba', 'flat', 30, 1, [1, 1, 1], 'A&R'],
    /* 19 */ ['tree fern', 'Cyathea', 'treefern', 'palm', 7, 1, [1, 1, 1], 'A&R BMW'],
    /* 20 */ ['montane cloud forest', 'Cyrilla, Alchornea, Clethra, Podocarpus urbanii', 'tropic', 'crown', 12, 0.85, [0.72, 0.84, 0.86], 'A&R POD BMW'],
    /* 21 */ ['elfin woodland', 'Podocarpus urbanii, Clethra alexandri, Clusia havetioides', 'tropic', 'crown', 4.5, 0.9, [0.66, 0.78, 0.8], 'A&R POD BMW'],
    /* 22 */ ['Caribbean pine (planted)', 'Pinus caribaea', 'pine', 'cone', 22, 0.9, [1.0, 1.0, 0.95], 'JOB'],
    /* 23 */ ['sea grape', 'Coccoloba uvifera', 'tropic', 'crown', 5, 1.25, [1.08, 1.06, 0.88], 'A&R'],
    /* 24 */ ['mangrove', 'Rhizophora mangle, Avicennia germinans, Laguncularia racemosa', 'tropic', 'crown', 7, 1.1, [0.78, 0.86, 0.82], 'JFD'],
    /* 25 */ ['olive', 'Olea europaea', 'olive', 'crown', 7, 1, [1, 1, 1], 'JRC'],
    /* 26 */ ['Mediterranean cypress', 'Cupressus sempervirens', 'cypress', 'cone', 17, 1, [1, 1, 1], 'JRC'],
    /* 27 */ ['stone pine', 'Pinus pinea', 'umbrella', 'flat', 15, 1, [1, 1, 1], 'JRC'],
    /* 28 */ ['Aleppo pine', 'Pinus halepensis / brutia', 'pine', 'cone', 16, 1.1, [1.12, 1.1, 0.9], 'JRC'],
    /* 29 */ ['holm oak', 'Quercus ilex', 'oak', 'crown', 14, 1.05, [0.72, 0.8, 0.8], 'JRC'],
    /* 30 */ ['Douglas-fir', 'Pseudotsuga menziesii', 'fir', 'cone', 40, 0.9, [0.86, 0.95, 0.95], 'BAI USF'],
    /* 31 */ ['western red cedar', 'Thuja plicata', 'fir', 'cone', 35, 1.05, [0.95, 1.0, 0.86], 'BAI'],
    /* 32 */ ['ponderosa pine', 'Pinus ponderosa', 'pine', 'cone', 28, 1.0, [1.08, 1.06, 0.92], 'BAI USF'],
    /* 33 */ ['lodgepole pine', 'Pinus contorta', 'pine', 'cone', 22, 0.7, [1, 1, 1], 'BAI USF'],
    /* 34 */ ['juniper', 'Juniperus (pinyon-juniper)', 'olive', 'crown', 6, 0.9, [0.62, 0.78, 0.82], 'USF BAI'],
    /* 35 */ ['pinyon pine', 'Pinus edulis / monophylla', 'pine', 'cone', 8, 1.2, [0.92, 0.95, 0.9], 'USF BAI'],
    /* 36 */ ['mesquite and paloverde', 'Prosopis / Parkinsonia', 'acacia', 'flat', 6, 0.9, [0.95, 1.0, 0.88], 'BAI'],
    /* 37 */ ['live oak', 'Quercus virginiana', 'umbrella', 'flat', 15, 1.35, [0.86, 0.92, 0.84], 'SIL'],
    /* 38 */ ['loblolly and longleaf pine', 'Pinus taeda / palustris', 'pine', 'cone', 28, 0.85, [1.06, 1.04, 0.92], 'BAI SIL USF'],
    /* 39 */ ['hickory', 'Carya', 'maple', 'crown', 24, 0.95, [1.04, 1.06, 0.92], 'NRC ONT USF'],
    /* 40 */ ['acacia', 'Vachellia tortilis / Acacia aneura', 'acacia', 'flat', 7, 1, [1, 1, 1], 'VAC MUL ABS'],
    /* 41 */ ['eucalyptus', 'Eucalyptus', 'birch', 'crown', 24, 1.1, [0.82, 0.86, 1.06], 'ABS'],
    /* 42 */ ['tropical broadleaf', '(climate-generic)', 'tropic', 'crown', 18, 1, [0.92, 0.98, 0.94], 'climate'],
    /* 43 */ ['tropical emergent', '(climate-generic)', 'ceiba', 'flat', 30, 0.9, [0.92, 0.98, 0.94], 'climate'],
    /* 44 */ ['palm', '(climate-generic: tropical coasts)', 'palm', 'palm', 15, 1, [1, 1, 1], 'PRO ECO'],
    /* 45 */ ['white pine', 'Pinus strobus / resinosa', 'pine', 'cone', 26, 1.05, [0.92, 1.0, 1.0], 'NRC ONT'],
    /* 46 */ ['thatch palm', 'Thrinax parviflora, Coccothrinax fragrans, Sabal jamaicensis', 'fanpalm', 'palm', 7, 1, [1, 1, 1], 'A&R'],
    /* 47 */ ['royal palm', 'Roystonea princeps (the Black River morass)', 'palm2', 'palm', 11, 0.9, [0.95, 1.0, 1.0], 'A&R'],
    /* 48 */ ['bamboo', 'Bambusa vulgaris (bamboo brake)', 'bamboo', 'crown', 14, 1, [1, 1, 1], 'A&R'],
    /* 49 */ ['guango', 'Samanea saman (rain tree)', 'umbrella', 'flat', 18, 1.3, [1.06, 1.08, 0.9], 'A&R'],
    /* 50 */ ['West Indian cedar', 'Cedrela odorata', 'tropic2', 'crown', 24, 1.05, [1.04, 1.04, 0.94], 'A&R'],
    /* 51 */ ['coconut palm (upright)', 'Cocos nucifera', 'palm2', 'palm', 18, 1, [1, 1, 1], 'A&R PRO ECO'],
    /* 52 */ ['wet limestone forest', 'Brosimum alicastrum (breadnut), Terminalia latifolia, Cedrela odorata', 'tropic2', 'crown', 20, 1.05, [0.84, 0.92, 0.88], 'A&R'],
    /* 53 */ ['saguaro', 'Carnegiea gigantea (the Sonoran Desert: southern Arizona, Sonora, the edge of California)', 'cactus', 'cone', 10, 1, [1, 1, 1], 'SAG'],   // 802 wiring (Nov 15)
  ];
  var S = {}; SP.forEach(function (r, i) { S[r[0]] = i; });
  var GEO = SP.map(function (r) { return G[r[2]]; }), MID = SP.map(function (r) { return MD[r[3]]; }), HT = SP.map(function (r) { return r[4]; }), WF = SP.map(function (r) { return r[5]; }), TINT = SP.map(function (r) { return r[6]; });

  /* ═════════ THE CHOICE ═════════ */
  var KGN = ['-', 'Af', 'Am', 'Aw', 'BWh', 'BWk', 'BSh', 'BSk', 'Csa', 'Csb', 'Csc', 'Cwa', 'Cwb', 'Cwc', 'Cfa', 'Cfb', 'Cfc', 'Dsa', 'Dsb', 'Dsc', 'Dsd', 'Dwa', 'Dwb', 'Dwc', 'Dwd', 'Dfa', 'Dfb', 'Dfc', 'Dfd', 'ET', 'EF'];
  function treeline(al) { return al < 25 ? 3900 : al < 70 ? 3900 - (al - 25) * 78 : 0; }   // world-vegetation.js's own (DRAFT)
  function pick(u, list) { var t = 0, i; for (i = 1; i < list.length; i += 2) t += list[i]; var x = u * t; for (i = 0; i < list.length; i += 2) { x -= list[i + 1]; if (x < 0) return list[i]; } return list[list.length - 2]; }
  function inBox(lat, lon, la0, la1, lo0, lo1) { return lat >= la0 && lat <= la1 && lon >= lo0 && lon <= lo1; }
  function climate(lat, lon) {   // the Koppen class name ('-' at sea or without the map: then by latitude)
    var K = KG(), v = K ? K.at(lat, lon) : 0; if (v) return KGN[v];
    var al = Math.abs(lat); return al < 23.5 ? 'Aw' : al < 40 ? 'Cfa' : al < 55 ? 'Dfb' : al < 66 ? 'Dfc' : 'ET';
  }
  var last = { region: '', climate: '' };   // the bench's read: why the last tree was chosen
  /* kindFor802(lat, lon, heightM, cls, seaDistM, u[, leaf]): a species code (0..SP.length-1) or -1 (no tree here).
     cls the vegetation's class number; seaDistM the distance to the sea in metres (Infinity / null: unknown or far); u 0..1 the tree's own hash;
     leaf (optional) the land cover map's leaf: 1 needle, 2 broad, 0 unknown (world-landclass772.js). */
  function kindFor802(lat, lon, h, cls, sea, u, leaf) {
    var al = Math.abs(lat), k = climate(lat, lon), K0 = k.charAt(0), tl = treeline(al), u2 = (u * 7919.31) % 1, sd = sea == null ? Infinity : sea;
    last.climate = k;
    if (h > tl) { last.region = 'above the tree line'; return -1; }
    if (k === 'EF') { last.region = 'ice'; return -1; }
    /* JAMAICA (A&R; JFD; JIS; POD; JOB; BMW) */
    if (inBox(lat, lon, 17.6, 18.6, -78.45, -76.15)) {
      last.region = 'Jamaica';
      if (cls === MANG) return S['mangrove'];
      if (h >= 1800) return u < 0.85 ? S['elfin woodland'] : S['tree fern'];   // elfin woodland on the ridges and summits; no tree line (Blue Mountain Peak is wooded)
      if (h >= 1400) return pick(u, [S['montane cloud forest'], 0.62, S['tree fern'], 0.26, S['Caribbean pine (planted)'], 0.06, S['blue mahoe'], 0.06]);   // the mist forest from ~1,370 m: Cyrilla, Alchornea, Podocarpus, tree ferns conspicuous
      if (h >= 750) return pick(u, [S['blue mahoe'], h < 1200 ? 0.26 : 0.05, S['montane cloud forest'], 0.28, S['West Indian cedar'], 0.1, S['tree fern'], 0.14, S['breadfruit'], h < 1000 ? 0.06 : 0, S['bamboo'], h < 1000 ? 0.05 : 0, S['Caribbean pine (planted)'], h >= 900 ? 0.08 : 0, S['silk cotton'], 0.02]);   // lower montane: Blue Mahoe to ~1,200 m (JIS)
      var PAL = h > 500 ? 0 : sd < 700 ? 0.3 : h < 250 ? 0.14 : 0.06;   // coconuts mostly planted below 500 m (PRO); thick near the coast
      if (sd <= 160 && h < 14) { last.region = 'Jamaica: the beach'; return pick(u, [S['coconut palm'], 0.36, S['coconut palm (upright)'], 0.24, S['sea grape'], 0.18, S['thatch palm'], 0.1, S['guango'], 0.04, S['mango'], 0.04, S['breadfruit'], 0.04]); }   // coconuts planted along the beaches; sea grape, thatch palms in the strand woodland
      if (inBox(lat, lon, 17.95, 18.25, -77.95, -77.55) && h < 25 && (cls === WET || cls === NONE || cls === FOREST)) { last.region = 'Jamaica: the Black River morass'; return pick(u, [S['royal palm'], 0.45, S['tropical broadleaf'], 0.25, S['mangrove'], 0.15, S['thatch palm'], 0.15]); }   // royal palm groups, endemic to the morass
      if (lat < 18.12 && lon > -77.95 && lon < -76.55) { last.region = 'Jamaica: dry limestone south'; return pick(u, [S['mahogany'], 0.3, S['tropical broadleaf'], 0.2, S['thatch palm'], 0.14, S['mango'], 0.1, S['guango'], 0.08, S['silk cotton'], 0.04, S['coconut palm'], PAL * 0.4, S['coconut palm (upright)'], PAL * 0.2]); }   // the rain shadow: dry limestone forest, mahogany emergent, thatch palms in the sub-canopy
      if (inBox(lat, lon, 18.2, 18.45, -77.85, -77.35) && h > 150) { last.region = 'Jamaica: Cockpit Country'; return pick(u, [S['wet limestone forest'], 0.45, S['West Indian cedar'], 0.2, S['tropical broadleaf'], 0.2, S['silk cotton'], 0.05, S['bamboo'], 0.05, S['tree fern'], 0.05]); }   // wet limestone: Terminalia and Cedrela emergents over breadnut
      last.region = 'Jamaica: lowland and hills';   // the shale hills and valleys: mango, breadfruit and guango cultivated and naturalized, bamboo brake, cotton tree and cedar in the valley remnants
      return pick(u, [S['mango'], 0.19, S['breadfruit'], 0.14, S['guango'], 0.05, S['bamboo'], h > 120 ? 0.09 : 0.04, S['West Indian cedar'], 0.07, S['mahogany'], 0.07, S['blue mahoe'], 0.1, S['tropical broadleaf'], 0.12, S['silk cotton'], 0.03, S['coconut palm'], PAL * 0.6, S['coconut palm (upright)'], PAL * 0.4]);
    }
    /* deserts and dry lands: sparse (BAI 322 "usually very sparse") */
    if (K0 === 'B') {
      var keep = k === 'BWh' || k === 'BWk' ? 0.1 : 0.4; if (u2 >= keep) { last.region = 'dry land (bare)'; return -1; }
      if (inBox(lat, lon, 25, 49, -125, -95)) { last.region = 'American dry west'; if (h > 1500 || k === 'BSk' || k === 'BWk') return pick(u, [S['juniper'], 0.5, S['pinyon pine'], 0.4, S['ponderosa pine'], h > 2000 ? 0.2 : 0]);
        if (inBox(lat, lon, 26, 35.2, -115.6, -109) && h < 1200) { last.region = 'the Sonoran Desert'; return pick(u, [S['saguaro'], 0.45, S['mesquite and paloverde'], 0.55]); }   // SAG: the saguaro among the mesquite and paloverde
        return S['mesquite and paloverde']; }
      if (inBox(lat, lon, -45, -10, 112, 155)) { last.region = 'Australia dry'; return u < 0.75 ? S['acacia'] : S['eucalyptus']; }
      if (inBox(lat, lon, -35, 37, -20, 60)) { last.region = 'Africa / Middle East dry'; return S['acacia']; }
      last.region = 'dry land (generic)'; return k === 'BSk' || k === 'BWk' ? pick(u, [S['juniper'], 0.5, 0, 0.5]) : S['acacia'];
    }
    if (k === 'ET') { last.region = 'tundra'; return u2 < 0.2 ? (u < 0.7 ? 2 : S['spruce']) : -1; }
    /* the CARIBBEAN and the tropics: palms on the coast, broadleaf inland */
    if (K0 === 'A') {
      var carib = inBox(lat, lon, 8, 27.5, -92, -59);
      if (cls === MANG) { last.region = 'tropical mangrove'; return S['mangrove']; }
      if (k === 'Aw' && inBox(lat, lon, -35, 20, -20, 52) && h < 2000) { last.region = 'African savanna'; if (u2 > 0.6) return -1; return pick(u, [S['acacia'], 0.7, S['tropical broadleaf'], 0.3]); }   // 802 wiring (Nov 15): before the montane bands: the Serengeti's plains stand 1,100-1,800 m high and are savanna, not cloud forest (VAC)
      if (h > 2200) { last.region = 'tropical highland'; return u < 0.8 ? S['elfin woodland'] : S['tree fern']; }
      if (h > 1200) { last.region = 'tropical montane'; return pick(u, [S['montane cloud forest'], 0.7, S['tree fern'], 0.2, S['tropical broadleaf'], 0.1]); }
      if (inBox(lat, lon, 24.4, 27.5, -82.5, -79.5)) {   // South Florida: coconuts planted on both coasts (UF/IFAS); palmettos; hammocks; mangroves on the coasts
        last.region = 'South Florida'; if (sd <= 200 && h < 10) return pick(u, [S['coconut palm'], 0.4, S['cabbage palmetto'], 0.3, S['mangrove'], 0.2, S['live oak'], 0.1]);
        return pick(u, [S['cabbage palmetto'], 0.3, S['live oak'], 0.3, S['mahogany'], 0.1, S['loblolly and longleaf pine'], 0.2, S['tropical broadleaf'], 0.1]);
      }
      if (sd <= 160 && h < 14) { last.region = carib ? 'Caribbean coast' : 'tropical coast'; return pick(u, [S['coconut palm'], 0.38, S['coconut palm (upright)'], 0.24, carib ? S['sea grape'] : S['tropical broadleaf'], 0.24, S['tropical broadleaf'], 0.14]); }
      var pl = h > 500 ? 0 : sd < 700 ? 0.28 : 0.1;
      if (k === 'Aw' && inBox(lat, lon, -35, 20, -20, 52)) { last.region = 'African savanna'; if (u2 > 0.6) return -1; return pick(u, [S['acacia'], 0.7, S['tropical broadleaf'], 0.3]); }   // (the low savanna; the high plains are taken above)
      last.region = carib ? 'Caribbean inland' : 'tropical inland';
      return carib ? pick(u, [S['mango'], 0.2, S['breadfruit'], 0.14, S['mahogany'], 0.18, S['tropical broadleaf'], 0.2, S['silk cotton'], 0.06, S['coconut palm'], pl * 0.6, S['coconut palm (upright)'], pl * 0.4])
        : pick(u, [S['tropical broadleaf'], 0.82, S['tropical emergent'], 0.08, S['palm'], pl]);
    }
    /* MEDITERRANEAN BASIN (JRC; EUF) */
    if ((k === 'Csa' || k === 'Csb') && inBox(lat, lon, 29, 46.5, -10.5, 42)) {
      last.region = 'Mediterranean'; if (h > 1200) return pick(u, [S['Aleppo pine'], 0.3, 0, 0.3, S['holm oak'], 0.4]);   // the mountains: pines (black pine shown as the generic pine) and holm oak
      if (cls === ORCH || cls === FARM) return pick(u, [S['olive'], 0.8, S['Mediterranean cypress'], 0.12, S['stone pine'], 0.08]);   // groves and field rows
      if (h < 200 && sd < 3000) return pick(u, [S['stone pine'], 0.28, S['Aleppo pine'], 0.2, S['olive'], 0.24, S['Mediterranean cypress'], 0.12, S['holm oak'], 0.16]);   // olive and stone pine "principally along the coasts"
      return pick(u, [S['holm oak'], 0.36, S['Aleppo pine'], 0.2, S['olive'], 0.2, S['Mediterranean cypress'], 0.12, S['stone pine'], 0.12]);
    }
    /* NORTH AMERICA */
    if (inBox(lat, lon, 24, 72, -170, -50)) {
      if (lon < -116 && lat >= 40 && (k === 'Csb' || k === 'Cfb' || k === 'Csc' || k === 'Cfc' || k === 'Dsb' || k === 'Dfb' || k === 'Dfc') && h < 1000) { last.region = 'Pacific Northwest';   // BAI 242: redcedar, hemlock, Douglas-fir; Sitka spruce on the coast (NRC)
        return pick(u, [S['Douglas-fir'], 0.42, S['hemlock'], 0.24, S['western red cedar'], 0.2, S['spruce'], sd < 3000 ? 0.1 : 0.02, 3, 0.04]); }
      if (lon < -114 && lat < 42 && K0 === 'C') { last.region = 'California';   // BAI 261: oak woodland, chaparral, pines
        return h > 1500 ? pick(u, [S['ponderosa pine'], 0.5, 1, 0.3, S['Douglas-fir'], 0.2]) : pick(u, [3, 0.55, S['live oak'], 0.15, 0, 0.2, S['ponderosa pine'], 0.1]); }
      if (lon < -117 && lat >= 35 && lat < 49 && (K0 === 'D' || h > 1200)) { last.region = 'Sierra Nevada and Cascades';   // USF's western groups: ponderosa (and Jeffrey) pine, lodgepole, Douglas-fir; true firs high (trees.js's fir)
        if (h > tl - 600) return pick(u, [S['lodgepole pine'], 0.45, 1, 0.35, 2, 0.2]);
        return pick(u, [S['ponderosa pine'], 0.38, 1, 0.26, S['lodgepole pine'], h > 2200 ? 0.24 : 0.1, S['Douglas-fir'], 0.12, S['aspen'], 0.04]); }
      if (lon < -103 && lon >= -117 && lat < 60) { last.region = 'Rocky Mountains';   // BAI M331: Engelmann spruce + subalpine fir high; ponderosa / Douglas-fir montane; aspen, lodgepole
        if (h > tl - 600) return pick(u, [S['spruce'], 0.5, 1, 0.35, 2, 0.15]);
        if (h > 2700) return pick(u, [S['spruce'], 0.45, 1, 0.3, S['lodgepole pine'], 0.15, S['aspen'], 0.1]);
        return pick(u, [S['ponderosa pine'], 0.35, S['Douglas-fir'], 0.25, S['lodgepole pine'], 0.2, S['aspen'], 0.2]); }
      var boreal = k === 'Dfc' || k === 'Dfd' || k === 'Dwc' || k === 'Dwd' || ((k === 'Dfb' || k === 'Dwb') && lat >= 47.5);
      if (boreal) { last.region = 'boreal';   // NRC / ONT boreal: black + white spruce, balsam fir, jack pine, tamarack, poplar and white birch
        if (cls === WET) return pick(u, [S['spruce'], 0.65, S['tamarack'], 0.35]);
        return pick(u, [S['spruce'], 0.42, 1, 0.14, 0, 0.12, S['aspen'], 0.13, 4, 0.12, S['tamarack'], 0.07]); }
      if (K0 === 'D' && lon > -100) {
        if (lat < 43.6 && lon > -83.5 && lon < -78.8 && k === 'Dfa') { last.region = 'Carolinian';   // NRC / ONT: beech, maple, black walnut, hickory, oak
          return pick(u, [S['maple'], 0.3, S['beech'], 0.15, S['hickory'], 0.15, 3, 0.3, S['white pine'], 0.1]); }
        last.region = 'Great Lakes-St Lawrence';   // NRC / ONT: red and white pine, hemlock, yellow birch, sugar and red maple, basswood, red oak (balsam fir and white spruce toward the boreal)
        if (cls === WET) return pick(u, [S['tamarack'], 0.3, S['spruce'], 0.3, S['hemlock'], 0.2, 4, 0.2]);
        var nb = lat > 46 ? 1 : 0;
        return pick(u, [S['maple'], 0.32, S['white pine'], 0.18, S['hemlock'], 0.12, 4, 0.12, 3, 0.1, S['spruce'], 0.04 + nb * 0.1, 1, 0.04 + nb * 0.1, S['aspen'], 0.04]);
      }
      if (k === 'Cfa' && lon > -100) { last.region = 'US Southeast';   // BAI 231: loblolly-shortleaf pine with oak, hickory, sweetgum; live oak on the lower coastal plain; palmetto within ~20 km of the sea south of Cape Fear (SIL)
        if (lat < 34 && sd < 3000 && lon > -98) { var lo = lat < 31 ? 0.3 : 0.12; return pick(u, [S['cabbage palmetto'], lo, S['live oak'], 0.3, S['loblolly and longleaf pine'], 0.3, 3, 0.1]); }
        return pick(u, [S['loblolly and longleaf pine'], 0.42, 3, 0.28, S['hickory'], 0.12, S['maple'], 0.08, S['live oak'], lat < 32 ? 0.1 : 0]); }
      if (k === 'Cfb' || k === 'Cfa' || K0 === 'D') { last.region = 'US East / Appalachia';   // USF oak-hickory, maple-beech-birch; BAI 221
        return pick(u, [3, 0.36, S['hickory'], 0.14, S['maple'], 0.22, S['beech'], 0.1, S['white pine'], 0.1, S['hemlock'], 0.08]); }
    }
    /* EUROPE (JRC; EUF) */
    if (inBox(lat, lon, 35, 72, -11, 45)) {
      if (h > 1000 && al < 50) { last.region = 'European mountains'; return h > tl - 500 ? pick(u, [2, 0.5, S['spruce'], 0.3, 0, 0.2]) : pick(u, [S['spruce'], 0.5, 1, 0.2, 0, 0.15, S['beech'], h < 1500 ? 0.15 : 0]); }
      if (K0 === 'D' && (k === 'Dfc' || lat > 60)) { last.region = 'Nordic boreal'; return cls === WET ? pick(u, [4, 0.5, 0, 0.5]) : pick(u, [0, 0.45, S['spruce'], 0.35, 4, 0.2]); }   // Scots pine, Norway spruce, birch
      last.region = 'temperate Europe';   // beech in the central lowlands (JRC), pedunculate oak in the lowlands (EUF), Scots pine, Norway spruce, silver birch
      if (cls === WET) return pick(u, [4, 0.6, 3, 0.2, 0, 0.2]);
      return K0 === 'D' ? pick(u, [0, 0.3, S['spruce'], 0.3, 4, 0.2, 3, 0.1, S['beech'], 0.1]) : pick(u, [S['beech'], 0.34, 3, 0.3, 0, 0.12, S['spruce'], 0.1, 4, 0.14]);
    }
    /* AUSTRALIA (ABS: eucalypts dominate) */
    if (inBox(lat, lon, -45, -10, 112, 155)) { last.region = 'Australia'; return u < 0.88 ? S['eucalyptus'] : S['acacia']; }
    /* CLIMATE-GENERIC (shapes, not species claims) */
    last.region = 'generic ' + K0;
    if (h > tl - 500) return u < 0.6 ? 2 : u < 0.95 ? 1 : 5;
    if (K0 === 'C') return k.charAt(1) === 'w' ? pick(u, [0, 0.3, 3, 0.35, S['tropical broadleaf'], 0.35]) : pick(u, [3, 0.45, S['maple'], 0.15, 0, 0.25, 4, 0.15]);
    if (K0 === 'D') return k === 'Dfc' || k === 'Dwc' || k === 'Dfd' || k === 'Dwd' ? pick(u, [S['spruce'], 0.3, S['tamarack'], 0.25, 0, 0.25, 4, 0.2]) : pick(u, [0, 0.3, S['spruce'], 0.25, 4, 0.2, 3, 0.15, S['maple'], 0.1]);
    return u < 0.5 ? 3 : 0;
  }
  /* the height (metres, before the jitter): the species' own, by the class (an orchard's, a scrub's smaller) and near the tree line */
  function height(spc, cls, lat, h) {
    var m = HT[spc] || 14, al = Math.abs(lat);
    m *= cls === ORCH ? 0.55 : cls === SCRUB ? 0.4 : cls === WET ? 0.8 : cls === PARK || cls === RES ? 0.85 : cls === FARM || cls === GRASS ? 0.9 : 1;
    if (h > treeline(al) - 500 && spc < 6) m *= 0.55;
    return Math.min(m, 42);
  }
  /* the sea's distance: asked only where a palm can grow (a tropical or a warm coast, low land) */
  function needsSea(lat, lon, h) { if (h > 60) return false; var k = climate(lat, lon), K0 = k.charAt(0); return K0 === 'A' || k === 'Cfa' && Math.abs(lat) < 34 || ((k === 'Csa' || k === 'Csb') && inBox(lat, lon, 29, 46.5, -10.5, 42)); }
  var seaC = new Map(), SEA_TTL = 6000, SEA_CELL = 0.002, RINGS = [40, 90, 160, 300, 700], SEA = { asked: 0, probes: 0, hits: 0 };
  function seaDist(lat, lon, Hll) {   // Hll(lat, lon) -> the ground's height there (< 0.5: the sea); cached per ~200 m cell
    SEA.asked++; var ki = Math.floor(lat / SEA_CELL), kj = Math.floor(lon / SEA_CELL), key = ki * 400000 + kj, v = seaC.get(key), now = Date.now(); if (v !== undefined && now - v[1] < SEA_TTL) { SEA.hits++; return v[0]; }   // a cell's answer is kept a few seconds: the streamed ground sharpens under her (a coast read off a coarse sheet is not kept)
    var cla = (ki + 0.5) * SEA_CELL, clo = (kj + 0.5) * SEA_CELL, c = Math.cos(cla * Math.PI / 180) || 1e-6, d = Infinity;
    outer: for (var r = 0; r < RINGS.length; r++) for (var a = 0; a < 12; a++) { var an = a / 12 * Math.PI * 2 + r * 0.4, dl = RINGS[r] * Math.cos(an) / 111320, dn = RINGS[r] * Math.sin(an) / (111320 * c); SEA.probes++;
      var y = Hll(cla + dl, clo + dn); if (y != null && y < 0.5) { d = RINGS[r]; break outer; } }
    if (seaC.size > 6000) seaC.clear(); seaC.set(key, [d, now]); return d;
  }
  /* the density by the sea: where coconuts are planted (a tropical shore: A&R "modifications have been brought about by the planting of coconuts"),
     the lawns, gardens, farms and hotel grounds within ~200 m of the sea keep more trees (they are chosen as the beach's: palms, sea grape) */
  var DENS_SEA = [0, 0.14, 0.16, 0, 0.2, 0.2, 0, 0, 0, 0.2, 0.1];   // by class: farmland, grass, -, scrub, park, -, -, -, residential, developed
  function dens(D, lat, lon, cls, Hll) { var k = DENS_SEA[cls] || 0; if (!k || D >= k) return D; var h = Hll(lat, lon); if (!(h >= 0.5 && h < 14) || !needsSea(lat, lon, h)) return D; var c = climate(lat, lon); if (c.charAt(0) !== 'A' && !inBox(lat, lon, 24.4, 34, -98, -75)) return D; return seaDist(lat, lon, Hll) <= 200 ? k : D; }
  /* an instance colour (multipliers on the shape's own colours), into out[0..2] */
  var FARK = { crown: [0.52, 0.68, 0.5], flat: [0.8, 0.86, 0.76], palm: [1, 1, 1], cone: [1, 1, 1] };   // the far crown (the vegetation's own, a bright oak green) toward each shape's own green
  var NEARK = { tropic: [0.82, 0.9, 0.8], tropic2: [0.84, 0.9, 0.82], ceiba: [0.86, 0.92, 0.84], umbrella: [0.86, 0.92, 0.84], bamboo: [0.9, 0.94, 0.86], palm: [0.9, 0.94, 0.88], palm2: [0.9, 0.94, 0.88] };   // the tropics' deep, glossy green under a high sun (as the vegetation's TROP did for its six)
  function colour(spc, h0, h1, out, level) {
    var t = TINT[spc] || [1, 1, 1], fk = level ? FARK[SP[spc][3]] || FARK.cone : NEARK[SP[spc][2]]; if (fk) t = [t[0] * fk[0], t[1] * fk[1], t[2] * fk[2]];
    var b = 0.86 + ((h0 >>> 4) & 255) / 255 * 0.26, v = ((h1 >>> 3) & 255) / 255 - 0.5;
    out[0] = t[0] * b * (1 + v * 0.1); out[1] = t[1] * b * (1 - v * 0.04); out[2] = t[2] * b * (1 - v * 0.08); return out;
  }

  /* ═════════ THE LOOK (THREE r128): the new unit shapes (absolute vertex colours, in the vegetation's one material) ═════════
     Built in metres of a typical tree (the vegetation scales each to its own height by its built top). Borrowed from trees.js's craft: lumpy
     clumps with soft normals leaning out from the crown (761b), canopy shading (dark beneath and inside, warm on top), fronds and leaflets as
     hand-built triangles; from Dunn's River's palm (place-dunns797.js): fronds as segmented strips arching then drooping. */
  function hash(x, z, k) { var h = Math.imul((x * 73.13 + 0.5) | 0, 374761393) ^ Math.imul((z * 91.71 + 0.5) | 0, 668265263) ^ Math.imul(k + 1, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function rng(seed) { var a = seed | 0; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var cl = function (v) { return Math.max(0, Math.min(1, v)); }, ss = function (a, b, x) { var t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function makeLook(T, lin) {
    function C3(hex) { var c = new T.Color(hex); if (lin) c.convertSRGBToLinear(); return [c.r, c.g, c.b]; }
    function Bld() { this.p = []; this.n = []; this.c = []; }
    Bld.prototype.push = function (x, y, z, nx, ny, nz, c) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(c[0], c[1], c[2]); };
    Bld.prototype.add = function (geo, m, colourAt, soft) {   // a THREE geometry, moved by m, each corner coloured by colourAt(x, y, z) -> [r, g, b]; soft: [cx, cy, cz] crown middle for rounded light
      var g = geo.index ? geo.toNonIndexed() : geo.clone(); if (m) g.applyMatrix4(m); g.computeVertexNormals(); var P = g.attributes.position, N = g.attributes.normal;
      for (var i = 0; i < P.count; i++) { var x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
        if (soft) { var lx = x - soft[0], ly = y - soft[1], lz = z - soft[2], ll = Math.hypot(lx, ly, lz) || 1, gx = x - soft[3], gy = y - soft[4], gz = z - soft[5], gl = Math.hypot(gx, gy, gz) || 1;
          nx = lx / ll * 0.6 + gx / gl * 0.4; ny = ly / ll * 0.6 + gy / gl * 0.4 + 0.3; nz = lz / ll * 0.6 + gz / gl * 0.4; var nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl; }
        this.push(x, y, z, nx, ny, nz, colourAt(x, y, z)); }
      g.dispose(); geo.dispose(); return this;
    };
    Bld.prototype.tri = function (A, B, Cc, colourAt, up) {
      var ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Cc[0] - A[0], vy = Cc[1] - A[1], vz = Cc[2] - A[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l; var lit2 = up === -2; if (lit2) up = -1; if (up && ny * up < 0) { var t = B; B = Cc; Cc = t; nx = -nx; ny = -ny; nz = -nz; } if (lit2) { nx = -nx * 0.3; ny = 0.9; nz = -nz * 0.3; }
      var self = this; [A, B, Cc].forEach(function (V) { self.push(V[0], V[1], V[2], nx, ny, nz, colourAt(V[0], V[1], V[2])); });
    };
    Bld.prototype.geometry = function () { var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3)); g.computeBoundingBox(); g.computeBoundingSphere(); return g; };
    /* colour helpers: a crown dark beneath and inside, lit and warm on top (trees.js canopyShade); bark darker at the foot */
    function canopy(base, y0, y1, cx, cz, rIn) { var B0 = C3(base); return function (x, y, z) { var t = cl((y - y0) / (y1 - y0)), out = cl(Math.hypot(x - cx, z - cz) / rIn), s = (0.62 + 0.5 * Math.pow(t, 0.8)) * (0.72 + 0.28 * out) * (0.93 + 0.14 * hash(x * 2.3, z * 2.3 + y * 1.7, 802));
      var warm = 0.12 * ss(0.45, 1, t) * (0.6 + 0.4 * out), cool = 0.1 * (1 - ss(0, 0.5, t)); return [B0[0] * s * (1 + warm - cool * 0.6), B0[1] * s * (1 + warm * 0.55), B0[2] * s * (1 - warm * 0.9 + cool)]; }; }
    function bark(base, h) { var B0 = C3(base); return function (x, y) { var s = 0.62 + 0.38 * ss(0, h * 0.5, y), m = 1 - ss(0, h * 0.25, y); return [B0[0] * s * (1 - 0.25 * m), B0[1] * s * (1 - 0.05 * m), B0[2] * s * (1 - 0.4 * m)]; }; }
    function M(x, y, z, sx, sy, sz, ry, rx, rz) { var m = new T.Matrix4(); m.compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(sx, sy == null ? sx : sy, sz == null ? sx : sz)); return m; }
    function lumpy(det, seed, r) { var g = new T.IcosahedronGeometry(1, det), P = g.attributes.position; for (var i = 0; i < P.count; i++) { var x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = (r || 1) * (0.84 + 0.3 * hash(x * 13.1, z * 17.3 + y * 7.7, seed)), fl = y < -0.35 ? 0.78 : 1; P.setXYZ(i, x * k, y * k * fl, z * k); } return g; }
    function clump(B, cx, cy, cz, r, det, seed, col, sq, crown) { var g = lumpy(det, seed, 1); g.applyMatrix4(M(cx, cy, cz, r * (sq ? sq[0] : 1), r * (sq ? sq[1] : 1), r * (sq ? sq[2] : 1)));
      var lit = function (x, y, z) { var c = col(x, y, z), k = 0.76 + 0.46 * ss(-0.75 * r, 0.7 * r, y - cy); return [c[0] * k, c[1] * k, c[2] * k]; };
      B.add(g, null, lit, [cx, cy, cz].concat(crown || [cx, cy, cz])); }
    function limb(B, A, Bp, r0, r1, seg, col) { var a = new T.Vector3().fromArray(A), b = new T.Vector3().fromArray(Bp), d = new T.Vector3().subVectors(b, a), len = d.length(), g = new T.CylinderGeometry(r1, r0, len, seg || 5, 1, true);
      var q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()), m = new T.Matrix4().compose(a.clone().lerp(b, 0.5), q, new T.Vector3(1, 1, 1)); B.add(g, m, col); }
    function trunk(B, h, r0, r1, seg, rows, col, o) {   // a trunk with a root flare (o.buttress: the ceiba's fins; o.bend: a lean; o.rings: a palm's leaf scars)
      o = o || {}; var g = new T.CylinderGeometry(r1, r0, h, seg, rows, true), P = g.attributes.position;
      for (var i = 0; i < P.count; i++) { var x = P.getX(i), y = P.getY(i) + h / 2, z = P.getZ(i), f = y / h, an = Math.atan2(z, x), fl = 1 + (o.flare || 0.6) * Math.pow(1 - ss(0, h * (o.flareH || 0.2), y), 2);
        if (o.buttress) fl *= 1 + o.buttress * Math.pow(Math.max(0, Math.cos(an * 5)), 3) * Math.pow(1 - ss(0, h * 0.22, y), 1.5);
        if (o.swell) fl *= 1 + o.swell * Math.exp(-Math.pow((f - 0.05) / 0.08, 2));
        var bx = o.bend ? o.bend * f * f : 0, bz = o.bend2 ? o.bend2 * f * f : 0; P.setXYZ(i, x * fl + bx, y - (o.sink || 0.4), z * fl + bz); }
      var col2 = o.rings ? function (x, y, z) { var c = col(x, y, z), k = 0.86 + 0.2 * (Math.sin(y * 9.5) > 0.35 ? 1 : 0); return [c[0] * k, c[1] * k, c[2] * k]; } : col;
      B.add(g, null, col2);
    }
    var out = {};
    /* PALM (coconut): a slender trunk with leaf-scar rings, swollen at its foot and bending as it climbs; 11 fronds that rise and arch over,
       each a feather of leaflets hanging in a V from its midrib; a cluster of nuts; two dead fronds hanging brown */
    (function () {
      var B = new Bld(), H = 13.5, BEND = 2.4, top = [BEND, H - 0.4, 0];
      trunk(B, H, 0.24, 0.17, 7, 12, bark(0xb8a88c, H), { flare: 0.5, flareH: 0.08, swell: 0.12, bend: BEND, rings: true });
      var FR = C3(0x3d7a28), FT = C3(0x7f9c38), FU = C3(0x2f5e24), R = rng(1201), DEAD = C3(0x8a6a3e);
      var col = function (base) { return function () { return base; }; };
      for (var f = 0; f < 11; f++) {
        var a = f / 11 * Math.PI * 2 + (R() - 0.5) * 0.35, ca = Math.cos(a), sa = Math.sin(a), len = 5.4 + R() * 1.5, rise = 0.55 + R() * 0.45, young = f % 4 === 0, K = 7;
        if (young) { len *= 0.75; rise += 0.9; }
        var at = function (t) { var d = t * len; return [top[0] + ca * d, top[1] + Math.sin(t * Math.PI * 0.62) * rise * len * 0.42 - t * t * len * 0.52 + (young ? t * 0.8 : 0), top[2] + sa * d]; };
        for (var k = 0; k < K; k++) {
          var t0 = k / K, t1 = (k + 1) / K, p0 = at(t0), p1 = at(t1), w0 = (0.25 + 1.0 * Math.sin(Math.PI * Math.min(1, t0 * 0.92 + 0.06))) * (young ? 0.6 : 1), w1 = (0.25 + 1.0 * Math.sin(Math.PI * Math.min(1, t1 * 0.92 + 0.06))) * (young ? 0.6 : 1), dn0 = 0.35 + 0.45 * t0, dn1 = 0.35 + 0.45 * t1;
          var lerpC = function (t) { return [FR[0] + (FT[0] - FR[0]) * t, FR[1] + (FT[1] - FR[1]) * t, FR[2] + (FT[2] - FR[2]) * t]; }, ca0 = lerpC(t0 * t0), ca1 = lerpC(t1 * t1);
          for (var sd = -1; sd <= 1; sd += 2) {   // each side: the leaflets hang out and down from the midrib (a V); the outer edge saw-toothed
            var e0 = [p0[0] - sa * sd * w0, p0[1] - dn0 * w0, p0[2] + ca * sd * w0], e1 = [p1[0] - sa * sd * w1 * 0.82, p1[1] - dn1 * w1 * 0.82, p1[2] + ca * sd * w1 * 0.82], em = [(p0[0] + p1[0]) / 2 - sa * sd * w1 * 1.08, (p0[1] + p1[1]) / 2 - dn1 * w1 * 1.08, (p0[2] + p1[2]) / 2 + ca * sd * w1 * 1.08];
            B.tri(p0, p1, em, col(ca1), 1); B.tri(p0, em, e0, col(ca0), 1); B.tri(em, p1, e1, col(ca1), 1);
            B.tri(p0, em, p1, col(FU), -2);   // the underside, darker (lit, never black from below)
          }
        }
      }
      for (var dfr = 0; dfr < 2; dfr++) {   // the old fronds hanging down the trunk, brown
        var ad = dfr * 2.6 + 0.8, cd = Math.cos(ad), sdd = Math.sin(ad), b0 = [top[0] + cd * 0.3, top[1] - 0.2, top[2] + sdd * 0.3], b1 = [top[0] + cd * 1.0, top[1] - 1.6, top[2] + sdd * 1.0], b2 = [top[0] + cd * 1.1, top[1] - 3.4, top[2] + sdd * 1.1];
        [[b0, b1], [b1, b2]].forEach(function (sg) { var w = 0.45; B.tri(sg[0], sg[1], [sg[1][0] - sdd * w, sg[1][1] + 0.2, sg[1][2] + cd * w], col(DEAD), 0); B.tri(sg[0], [sg[1][0] + sdd * w, sg[1][1] + 0.2, sg[1][2] - cd * w], sg[1], col(DEAD), 0); });
      }
      var NUT = C3(0x5f6a26); for (var nn = 0; nn < 5; nn++) { var an2 = nn * 1.26; B.add(new T.IcosahedronGeometry(0.2, 0), M(top[0] + Math.cos(an2) * 0.32, top[1] - 0.35 - (nn % 2) * 0.18, top[2] + Math.sin(an2) * 0.32, 1), function () { return NUT; }); }
      out.palm = B.geometry();
    })();
    /* TROPIC (mango, breadfruit, mahogany, blue mahoe, the lowland broadleaf): a short stout trunk forking low, a WIDE, DENSE dome of clumps */
    (function () {
      var B = new Bld(), col = canopy(0x295d26, 4.2, 14, 0, 0, 5.5), bk = bark(0x6b5a48, 6), R = rng(1401), CR = [0, 9.5, 0];
      trunk(B, 5.2, 0.55, 0.38, 8, 3, bk, { flare: 0.7 });
      [[2.6, 8.4, 0.5], [-2.2, 8.2, 1.8], [0.4, 8.6, -2.6], [0.2, 9.6, 0.3]].forEach(function (L) { limb(B, [0, 4.4, 0], L, 0.34, 0.12, 5, bk); });
      clump(B, 0, 10.6, 0, 3.6, 1, 11, col, [1.1, 0.78, 1.1], CR);
      for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2 + 0.3, rr = 3.8 + R() * 0.7; clump(B, Math.cos(a) * rr, 8.4 + R() * 1.4, Math.sin(a) * rr, 2.6 + R() * 0.6, k % 2, 20 + k, col, [1.05, 0.82, 1.05], CR); }
      clump(B, 1.2, 12.0, -0.8, 2.2, 0, 31, col, null, CR); clump(B, -1.6, 11.4, 1.4, 2.0, 0, 32, col, null, CR);
      out.tropic = B.geometry();
    })();
    /* CEIBA (silk-cotton, the emergent): a tall straight grey trunk on buttress fins, a few heavy horizontal limbs, a flat wide crown in tiers */
    (function () {
      var B = new Bld(), H = 22, col = canopy(0x3e7431, 20, 29, 0, 0, 9), bk = bark(0x9d978a, H), R = rng(1501), CR = [0, 25, 0];
      trunk(B, H, 1.1, 0.55, 9, 5, bk, { flare: 0.4, buttress: 1.4 });
      for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2 + 0.4, L = 8 + R() * 2.5; limb(B, [0, H - 2.5 + k * 0.5, 0], [Math.cos(a) * L, H + 1.5 + R() * 1.5, Math.sin(a) * L], 0.42, 0.14, 5, bk); }
      for (var j = 0; j < 8; j++) { var a2 = j / 8 * Math.PI * 2, rr = 7.5 + R() * 2.5; clump(B, Math.cos(a2) * rr, 24 + R() * 1.6, Math.sin(a2) * rr, 3.9 + R() * 0.8, j % 3 === 0 ? 1 : 0, 50 + j, col, [1.25, 0.62, 1.25], CR); }
      clump(B, 0, 26.2, 0, 5.2, 1, 59, col, [1.35, 0.6, 1.35], CR); clump(B, 2.5, 27.4, 1, 2.8, 0, 60, col, [1.2, 0.5, 1.2], CR);
      out.ceiba = B.geometry();
    })();
    /* TREE FERN (Cyathea): a slim dark trunk, a crown of long lacy fronds arching out and down, pairs of leaflets down both sides (trees.js's fern, tall) */
    (function () {
      var B = new Bld(), H = 5.6, top = [0, H, 0], R = rng(1601), F0 = C3(0x5d9a38), F1 = C3(0x87b84c), FU = C3(0x2e5a24);
      trunk(B, H + 0.4, 0.2, 0.15, 6, 6, bark(0x4a3a2c, H), { flare: 0.9, flareH: 0.15 });
      var cf = function (t) { return function () { return [F0[0] + (F1[0] - F0[0]) * t, F0[1] + (F1[1] - F0[1]) * t, F0[2] + (F1[2] - F0[2]) * t]; }; };
      for (var f = 0; f < 10; f++) {
        var a = f / 10 * Math.PI * 2 + (R() - 0.5) * 0.4, ca = Math.cos(a), sa = Math.sin(a), len = 2.6 + R() * 0.8, lift = 0.5 + R() * 0.3, K = 8;
        var at = function (t) { var d = t * len; return [ca * d, top[1] + Math.sin(t * Math.PI * 0.7) * lift * len * 0.5 - t * t * len * 0.38, sa * d]; };
        for (var k = 1; k <= K; k++) { var t = k / K, p = at(t - 1 / K), q = at(t), w = (0.5 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1)) + 0.06) * len * 0.42;
          for (var sd = -1; sd <= 1; sd += 2) { var tip = [q[0] - sa * sd * w + ca * w * 0.3, q[1] - 0.12 - 0.1 * t, q[2] + ca * sd * w + sa * w * 0.3]; B.tri(p, q, tip, cf(t), 1); B.tri(p, tip, q, function () { return FU; }, -2); } }
      }
      out.treefern = B.geometry();
    })();
    /* MAPLE (sugar maple; beech, hickory): a straight trunk, a dense egg-shaped crown taller than wide */
    (function () {
      var B = new Bld(), col = canopy(0x386f2e, 6, 20, 0, 0, 4.5), bk = bark(0x6e6050, 8), R = rng(1701), CR = [0, 13, 0];
      trunk(B, 8, 0.42, 0.24, 7, 3, bk, { flare: 0.6 });
      [[1.8, 11, 0.6], [-1.6, 11.5, 1.2], [0.3, 12, -1.9]].forEach(function (L) { limb(B, [0, 6.5, 0], L, 0.24, 0.08, 5, bk); });
      clump(B, 0, 13.2, 0, 3.6, 1, 71, col, [1, 1.25, 1], CR);
      for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2, yy = 10 + (k % 2) * 3.4; clump(B, Math.cos(a) * 2.9, yy, Math.sin(a) * 2.9, 2.4 + R() * 0.5, k % 3 === 0 ? 1 : 0, 72 + k, col, [1, 1.1, 1], CR); }
      clump(B, 0.4, 17.2, -0.3, 2.3, 0, 79, col, [1, 1.2, 1], CR); clump(B, 0, 8.6, 0, 2.6, 0, 80, col, [1.2, 0.7, 1.2], CR);
      out.maple = B.geometry();
    })();
    /* OLIVE: a short gnarled trunk splitting into leaning limbs, a low, broad, open crown of small silver-green clumps */
    (function () {
      var B = new Bld(), col = canopy(0x7c8f5c, 2.4, 7, 0, 0, 3.2), bk = bark(0x7a6e5c, 3), R = rng(1801), CR = [0, 4.6, 0];
      trunk(B, 1.8, 0.48, 0.34, 7, 3, bk, { flare: 0.5, bend: 0.25 });
      var tips = [];
      for (var k = 0; k < 4; k++) { var a = k / 4 * Math.PI * 2 + 0.5, L = 1.9 + R() * 0.6, tp = [Math.cos(a) * L, 3.7 + R() * 0.7, Math.sin(a) * L]; limb(B, [0.15, 1.3, 0], tp, 0.22, 0.1, 5, bk); tips.push(tp); }
      tips.forEach(function (tp, k) { clump(B, tp[0] * 1.15, tp[1] + 0.7, tp[2] * 1.15, 1.05 + R() * 0.25, 1, 90 + k, col, [1.15, 0.78, 1.15], CR); clump(B, tp[0] * 0.75 + 0.5, tp[1] + 1.3, tp[2] * 0.75 - 0.3, 0.9, 0, 95 + k, col, [1.1, 0.8, 1.1], CR); clump(B, tp[0] * 0.6 - 0.4, tp[1] + 0.2, tp[2] * 0.6 + 0.4, 0.8, 0, 85 + k, col, [1.1, 0.8, 1.1], CR); });
      clump(B, 0, 5.3, 0, 1.25, 1, 99, col, [1.2, 0.75, 1.2], CR);
      out.olive = B.geometry();
    })();
    /* CYPRESS (Mediterranean): a narrow dark column to a point, its surface furrowed in vertical flames */
    (function () {
      var B = new Bld(), H = 16, col = canopy(0x2c4c2a, 1, H, 0, 0, 1.4), bk = bark(0x5e4a3a, 2), pts = [], ROWS = 12, SEG = 9;
      trunk(B, 1.6, 0.3, 0.24, 6, 1, bk, { flare: 0.4 });
      var g = new T.BufferGeometry(), P = [], idx = [];
      for (var r = 0; r <= ROWS; r++) { var f = r / ROWS, y = 0.9 + f * (H - 0.9), rad = 1.25 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + f * 0.95)), 0.75) * (1 - 0.35 * f) + (r === ROWS ? -1 : 0) * 0;
        if (r === ROWS) rad = 0; for (var s = 0; s <= SEG; s++) { var an = s / SEG * Math.PI * 2 + r * 0.33, fur = 1 + 0.16 * Math.sin(an * 4 + f * 3) + 0.1 * (hash(r, s % SEG, 7) - 0.5); P.push(Math.cos(an) * rad * fur, y, Math.sin(an) * rad * fur); } }
      for (var r2 = 0; r2 < ROWS; r2++) for (var s2 = 0; s2 < SEG; s2++) { var a0 = r2 * (SEG + 1) + s2, b0 = a0 + SEG + 1; idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
      g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(idx);
      B.add(g, null, col, [0, H * 0.45, 0, 0, H * 0.45, 0]);
      out.cypress = B.geometry();
    })();
    /* UMBRELLA (stone pine; live oak, wider): a tall bare trunk forking into upswept limbs, a FLAT dome of a crown */
    (function () {
      var B = new Bld(), col = canopy(0x335f2b, 9.5, 14.5, 0, 0, 6), bk = bark(0x8a6448, 9), R = rng(1901), CR = [0, 12, 0];
      trunk(B, 7.5, 0.45, 0.3, 7, 3, bk, { flare: 0.5, bend: 0.5 });
      var ends = []; for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2 + 0.2, L = 3.6 + R() * 1.2, e = [0.5 + Math.cos(a) * L, 11 + R() * 0.8, Math.sin(a) * L]; limb(B, [0.5, 7, 0], e, 0.26, 0.1, 5, bk); ends.push(e); }
      clump(B, 0.5, 12.8, 0, 4.0, 1, 111, col, [1.45, 0.6, 1.45], CR);
      ends.forEach(function (e, k) { clump(B, e[0] * 1.15, e[1] + 0.9, e[2] * 1.15, 2.6 + R() * 0.4, k % 2, 112 + k, col, [1.25, 0.62, 1.25], CR); });
      clump(B, 0.8, 14.0, 0.4, 2.6, 0, 119, col, [1.4, 0.6, 1.4], CR);
      out.umbrella = B.geometry();
    })();
    /* ACACIA (umbrella thorn, mulga; mesquite and paloverde): a low trunk splitting into a V, a thin, very flat, wide crown in layers */
    (function () {
      var B = new Bld(), col = canopy(0x6c8a3a, 4.6, 7, 0, 0, 4.5), bk = bark(0x5a4a3c, 3.5), R = rng(2001), CR = [0, 6, 0];
      trunk(B, 2.0, 0.3, 0.22, 6, 2, bk, { flare: 0.4, bend: 0.2 });
      var ends = []; for (var k = 0; k < 4; k++) { var a = k / 4 * Math.PI * 2 + 0.7, L = 2.4 + R() * 1.0, e = [Math.cos(a) * L, 5.2 + R() * 0.6, Math.sin(a) * L]; limb(B, [0.1, 1.6, 0], e, 0.18, 0.06, 4, bk); ends.push(e); }
      ends.forEach(function (e, k) { clump(B, e[0] * 1.2, e[1] + 0.5, e[2] * 1.2, 2.3 + R() * 0.4, 0, 120 + k, col, [1.5, 0.3, 1.5], CR); clump(B, e[0] * 1.55, e[1] - 0.5, e[2] * 1.55, 1.3, 0, 124 + k, col, [1.4, 0.32, 1.4], CR); });
      clump(B, 0, 6.2, 0, 3.4, 1, 129, col, [1.6, 0.24, 1.6], CR);
      out.acacia = B.geometry();
    })();
    /* PALM2 (an upright palm: coconut grown straight, the royal palm): a tall near-straight column, faint rings, a full round crown of 14 fronds */
    (function () {
      var B = new Bld(), H = 15, top = [0.35, H - 0.3, 0], FR = C3(0x3d7a2a), FT = C3(0x7e9c3c), FU = C3(0x2e5c24), R = rng(2101), SH = C3(0x5f8a3a);
      trunk(B, H, 0.26, 0.2, 7, 12, bark(0xb9b0a0, H), { flare: 0.55, flareH: 0.07, swell: 0.18, bend: 0.35, rings: true });
      B.add(new T.CylinderGeometry(0.2, 0.22, 1.2, 7, 1, true), M(top[0], top[1] - 0.6, 0, 1), function () { return SH; });   // the green crownshaft
      var col = function (c) { return function () { return c; }; };
      for (var f = 0; f < 14; f++) {
        var a = f / 14 * Math.PI * 2 + (R() - 0.5) * 0.3, ca = Math.cos(a), sa = Math.sin(a), up = f % 3 === 0, len = (up ? 4.6 : 5.8) + R() * 1.2, rise = up ? 1.5 : 0.7 + R() * 0.3, K = 6;
        var at = function (t) { var d = t * len * (up ? 0.75 : 1); return [top[0] + ca * d, top[1] + Math.sin(t * Math.PI * 0.6) * rise * len * 0.4 - t * t * len * (up ? 0.25 : 0.5), top[2] + sa * d]; };
        for (var k = 0; k < K; k++) { var t0 = k / K, t1 = (k + 1) / K, p0 = at(t0), p1 = at(t1), w = 0.3 + 0.9 * Math.sin(Math.PI * Math.min(1, t1 * 0.92 + 0.06)), dn = 0.4 + 0.4 * t1, cc = [FR[0] + (FT[0] - FR[0]) * t1 * t1, FR[1] + (FT[1] - FR[1]) * t1 * t1, FR[2] + (FT[2] - FR[2]) * t1 * t1];
          for (var sd = -1; sd <= 1; sd += 2) { var em = [(p0[0] + p1[0]) / 2 - sa * sd * w, (p0[1] + p1[1]) / 2 - dn * w, (p0[2] + p1[2]) / 2 + ca * sd * w]; B.tri(p0, p1, em, col(cc), 1); B.tri(p0, em, p1, col(FU), -2); } }
      }
      out.palm2 = B.geometry();
    })();
    /* FANPALM (the thatch palms, the palmetto): a slim trunk, a ball of round pleated fan leaves on stalks, a skirt of old brown fans */
    (function () {
      var B = new Bld(), H = 6.2, top = [0, H, 0], R = rng(2201), F0 = C3(0x5f9a40), F1 = C3(0x9cc062), FU = C3(0x547f3e), OLD = C3(0x9c8458);
      trunk(B, H + 0.3, 0.17, 0.13, 6, 6, bark(0x8a7c68, H), { flare: 0.5, flareH: 0.1, rings: true });
      var fan = function (cx, cy, cz, dir, tilt, r, c0, c1, cu) {   // a fan: 7 pleats round a half disc, its face toward dir and tilted
        var ux = Math.cos(dir), uz = Math.sin(dir), vx = -uz, vz = ux, ct = Math.cos(tilt), st = Math.sin(tilt), C0 = [cx, cy, cz];
        for (var k = 0; k < 7; k++) { var a0 = (k / 7 - 0.5) * Math.PI * 1.25, a1 = ((k + 1) / 7 - 0.5) * Math.PI * 1.25, am = (a0 + a1) / 2, pt = function (a, rr, lift) { var sx = Math.sin(a) * rr, fy = Math.cos(a) * rr; return [cx + ux * fy * ct + vx * sx, cy + fy * st + lift, cz + uz * fy * ct + vz * sx]; };
          var P0 = pt(a0, r, -0.22 * r), P1 = pt(a1, r, -0.22 * r), Pm = pt(am, r * 1.08, 0.18 * r); B.tri(C0, Pm, P0, function () { return c0; }, 1); B.tri(C0, P1, Pm, function () { return c1; }, 1); B.tri(C0, P0, P1, function () { return cu; }, -2); }
      };
      for (var f = 0; f < 16; f++) { var a = f * 2.39996, el = f < 5 ? 1.0 : f < 11 ? 0.3 : -0.55, d = 0.9 + R() * 0.4, cx = Math.cos(a) * d * Math.cos(el), cz = Math.sin(a) * d * Math.cos(el), cy = top[1] + 0.4 + Math.sin(el) * d, old = f >= 11, mixc = function (c) { return old ? [c[0] * 0.7 + OLD[0] * 0.3, c[1] * 0.7 + OLD[1] * 0.3, c[2] * 0.7 + OLD[2] * 0.3] : c; };
        limb(B, [0, top[1] - 0.2, 0], [cx, cy, cz], 0.035, 0.025, 3, function () { return FU; });
        fan(cx, cy, cz, a, old ? -0.75 : el * 0.8 + 0.25, 1.2 + R() * 0.3, mixc(F0), mixc(F1), mixc(FU)); }
      out.fanpalm = B.geometry();
    })();
    /* TROPIC2 (mahogany, cedar, blue mahoe, the wet limestone forest): a tall clean trunk, an OPEN crown of separate leaf masses in layers */
    (function () {
      var B = new Bld(), col = canopy(0x34692c, 9, 22, 0, 0, 5), bk = bark(0x6e5c4a, 10), R = rng(2301), CR = [0, 16.5, 0], ends = [];
      trunk(B, 10.5, 0.5, 0.32, 8, 3, bk, { flare: 0.8 });
      for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2 + 0.6, L = 3.2 + R() * 1.6, y = 14 + R() * 3.5, e = [Math.cos(a) * L, y, Math.sin(a) * L]; limb(B, [0, 9.5 + k * 0.4, 0], e, 0.24, 0.09, 5, bk); ends.push(e); }
      ends.forEach(function (e, k) { clump(B, e[0] * 1.15, e[1] + 0.6, e[2] * 1.15, 2.5 + R() * 0.6, k % 2, 130 + k, col, [1.15, 0.72, 1.15], CR); });
      clump(B, 0, 20.2, 0, 2.8, 1, 138, col, [1.1, 0.8, 1.1], CR); clump(B, -0.8, 17.5, 1.2, 2.2, 0, 139, col, [1.1, 0.75, 1.1], CR);
      out.tropic2 = B.geometry();
    })();
    /* BAMBOO (a clump of the bamboo brake): ten green-gold culms from one foot arching outward, feathered with leaf at their tops */
    (function () {
      var B = new Bld(), R = rng(2401), CU = C3(0x9aa64a), LF = canopy(0x6a9a3a, 4, 14, 0, 0, 4), CR = [0, 10, 0];
      for (var c = 0; c < 8; c++) { var a = c / 10 * Math.PI * 2 + R() * 0.4, r0 = 0.25 + R() * 0.35, L = 11 + R() * 3.5, lean = 0.18 + R() * 0.2, ca = Math.cos(a), sa = Math.sin(a), pts = [];
        for (var k = 0; k <= 5; k++) { var t = k / 5; pts.push([ca * (r0 + Math.pow(t, 1.6) * L * lean * 1.6), t * L * (1 - 0.18 * t * t), sa * (r0 + Math.pow(t, 1.6) * L * lean * 1.6)]); }
        for (var k2 = 0; k2 < 5; k2++) limb(B, pts[k2], pts[k2 + 1], 0.07 - k2 * 0.008, 0.06 - k2 * 0.008, 4, function (x, y) { var k3 = Math.sin(y * 3.1) > 0.92 ? 0.7 : 1; return [CU[0] * k3, CU[1] * k3, CU[2] * k3]; });
        for (var lq = 1; lq <= 5; lq++) { var pq = pts[lq], nl = lq < 3 ? 4 : 6;   // sprays of narrow leaves hanging from each node, out and down (a feathery fountain)
          for (var lj = 0; lj < nl; lj++) { var la = a + (lj / nl - 0.5) * 2.6 + (R() - 0.5) * 0.5, Ll = 1.3 + R() * 0.8 + lq * 0.12, dx = Math.cos(la), dz = Math.sin(la), wv = 0.16 + R() * 0.06, mid = [pq[0] + dx * Ll * 0.5, pq[1] - Ll * 0.12, pq[2] + dz * Ll * 0.5], tip = [pq[0] + dx * Ll, pq[1] - Ll * 0.62, pq[2] + dz * Ll];
            var w1 = [mid[0] - dz * wv, mid[1], mid[2] + dx * wv], w2 = [mid[0] + dz * wv, mid[1], mid[2] - dx * wv]; B.tri(pq, w1, tip, LF, 1); B.tri(pq, tip, w2, LF, 1); B.tri(pq, w2, w1, LF, -2); } } }
      out.bamboo = B.geometry();
    })();
    /* CACTUS (the saguaro, SAG): a ribbed green column with two or three upturned arms; no leaves (802 wiring, Nov 15) */
    (function () {
      var B = new Bld(), R = rng(2601), G0 = C3(0x5f7d3c), G1 = C3(0x7f9a52), rib = function (x, y, z) { var a = Math.atan2(z, x), k = 0.86 + 0.14 * Math.abs(Math.sin(a * 6)); return [ (y > 9 ? G1[0] : G0[0]) * k, (y > 9 ? G1[1] : G0[1]) * k, (y > 9 ? G1[2] : G0[2]) * k]; };
      limb(B, [0, 0, 0], [0, 10, 0], 0.34, 0.3, 10, rib); limb(B, [0, 10, 0], [0, 10.35, 0], 0.3, 0.06, 10, rib);   // the column and its rounded top
      [[1, 3.6, 2.2, 0.8], [-1, 4.8, 1.8, 2.4], [1, 6.2, 1.5, 4.1]].forEach(function (m, i) { var a = m[3] + (R() - 0.5) * 0.3, ca = Math.cos(a), sa = Math.sin(a), y0 = m[1], out = m[2], el = [ca * out * 0.55, y0 + 0.35, sa * out * 0.55], up = [ca * out * 0.62, y0 + 2.4 + i * 0.3, sa * out * 0.62];
        limb(B, [0, y0, 0], el, 0.2, 0.2, 8, rib); limb(B, el, up, 0.2, 0.18, 8, rib); limb(B, up, [up[0], up[1] + 0.25, up[2]], 0.18, 0.05, 8, rib); });   // out, then up
      out.cactus = B.geometry();
    })();
    /* SPRUCE (black, white, Norway, Engelmann, Sitka): a slim dark spire of many short drooping tiers, a narrow club at the top */
    (function () {
      var B = new Bld(), H = 17, col = canopy(0x24503a, 1, H, 0, 0, 1.2), N = 12;
      trunk(B, H * 0.92, 0.32, 0.06, 6, 3, bark(0x5e4636, H), { flare: 0.5 });
      for (var i = 0; i < N; i++) { var f = i / (N - 1), y = 1.6 + f * (H - 3.2), r = 2.3 * Math.pow(1 - f, 0.9) + 0.35, h2 = 1.6 - f * 0.4 + (i === N - 1 ? 1.4 : 0), sp = 10, rot = i * 0.7, tip = [0, y + h2, 0], und = [0, y + h2 * 0.25, 0], rim = [], mid = [];
        for (var k = 0; k < sp; k++) { var a = rot + k / sp * Math.PI * 2, lg = k % 2 === 0, rr = r * (lg ? 1 : 0.7); rim.push([Math.cos(a) * rr, y - (lg ? h2 * 0.3 : 0), Math.sin(a) * rr]); mid.push([Math.cos(a) * rr * 0.5, y + h2 * 0.52, Math.sin(a) * rr * 0.5]); }
        for (var k2 = 0; k2 < sp; k2++) { var q = (k2 + 1) % sp; B.tri(tip, mid[q], mid[k2], col, 1); B.tri(mid[k2], mid[q], rim[q], col, 1); B.tri(mid[k2], rim[q], rim[k2], col, 1); B.tri(und, rim[k2], rim[q], col, -1); } }
      out.spruce = B.geometry();
    })();
    return out;
  }
  /* the shapes, in GEOS order: { geos, tops, tris } */
  function build(T, lin) { var L = makeLook(T, lin), geos = GEOS.map(function (n) { return L[n]; }); return { geos: geos, tops: geos.map(function (g) { return g.boundingBox.max.y; }), tris: geos.map(function (g) { return g.attributes.position.count / 3; }) }; }
  /* the far shapes (MIDS): a palm as a thin stem and a star of drooping fronds; a flat wide crown on a stem. shaded(THREE, geo, y0, y1, lo, hi) and
     merge(THREE, parts) are the vegetation's own (passed in), so they light like its cone and crown */
  function buildMid(T, lin, shaded, merge) {
    var col = function (hex) { var c = new T.Color(hex); if (lin) c.convertSRGBToLinear(); return c; };
    var stem = shaded(T, new T.CylinderGeometry(0.16, 0.26, 12, 4, 1, true).translate(0.6, 6, 0), 0, 12, 0.6, 0.85), P = [], i;
    for (i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), w = 0.9;
      P.push(0.6, 12, 0, 0.6 + ca * 2.6 - sa * w, 12.4, sa * 2.6 + ca * w, 0.6 + ca * 2.6 + sa * w, 12.4, sa * 2.6 - ca * w);
      P.push(0.6 + ca * 2.6 - sa * w, 12.4, sa * 2.6 + ca * w, 0.6 + ca * 4.8, 10.9, sa * 4.8, 0.6 + ca * 2.6 + sa * w, 12.4, sa * 2.6 - ca * w); }
    var fr = new T.BufferGeometry(); fr.setAttribute('position', new T.Float32BufferAttribute(P, 3)); fr = shaded(T, fr, 10.8, 12.4, 0.62, 1.05);
    var dbl = fr.clone(), pp = dbl.attributes.position; for (i = 0; i < pp.count; i += 3) { var x1 = pp.getX(i + 1), y1 = pp.getY(i + 1), z1 = pp.getZ(i + 1); pp.setXYZ(i + 1, pp.getX(i + 2), pp.getY(i + 2), pp.getZ(i + 2)); pp.setXYZ(i + 2, x1, y1, z1); } dbl.computeVertexNormals();   // both faces (seen from below too)
    var g0 = merge(T, [[stem, col(0x8f8270)], [fr, col(0x4f8a30)], [dbl, col(0x3a6a28)]]);
    var dome = new T.IcosahedronGeometry(1, 0), dp = dome.attributes.position; for (i = 0; i < dp.count; i++) { var dy = dp.getY(i); dp.setY(i, dy < 0 ? dy * 0.35 : dy); }
    var flat = shaded(T, dome.scale(4.4, 2.0, 4.4).translate(0, 7.0, 0), 6.2, 9.0, 0.5, 1.05), st2 = shaded(T, new T.CylinderGeometry(0.22, 0.36, 6.2, 5, 1, true).translate(0, 3.1, 0), 0, 6.2, 0.6, 0.85);
    var g1 = merge(T, [[st2, col(0x6f5a46)], [flat, col(0x4a7a34)]]);
    return { geos: [g0, g1], tops: [g0.boundingBox.max.y, g1.boundingBox.max.y] };
  }
  var counts = new Float64Array(SP.length);   // the bench's read: the trees chosen per species since the last reset (counts.fill(0))
  function pickCounted(lat, lon, h, cls, sea, u, leaf) { var s = kindFor802(lat, lon, h, cls, sea, u, leaf); if (s >= 0) counts[s]++; return s; }
  return { version: 1, SP: SP, S: S, GEOS: GEOS, MIDS: MIDS, RK: RK, GEO: GEO, MID: MID, HT: HT, W: WF, KGN: KGN,
    kindFor802: kindFor802, pick: pickCounted, dens: dens, height: height, needsSea: needsSea, seaDist: seaDist, sea: SEA, colour: colour, climate: climate, last: last,
    build: build, buildMid: buildMid, counts: counts, nameOf: function (s) { return SP[s] ? SP[s][0] : String(s); } };
})();
