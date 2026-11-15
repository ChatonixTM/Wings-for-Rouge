/* arrive821.js - BOARD 821, EVERY COUNTRY GETS ITS ARRIVAL (Wings for Rouge). Nov 14 2026.
   Marth, Nov 14 2026, verbatim: "no cinematic for fucking Miami? This gotta be a crime. America got none? Make sure this doesn't happen again. There should be
   a mini cinematic every time you visit the country and the full 'new discovery' when it's the first time"; then "Make sure Canada as a whole has one"; then
   "You thought I'd only venture around the Caribbean??".
   WHAT WAS WRONG: arrive783.js's PLACES held six hand-written countries; the United States and every other country had nothing, and nothing checked it.
   WHAT THIS DOES (Standard only, the travel zone only, never Classic):
     - THE COUNTRIES are the game's own world data (world712-map.js, Natural Earth, already shipped: 220 countries and the 5,527 cities that carry them). The
       land under her is the streamed ground's own reading (the top line's "Over land" test); its country is the country of the nearest city in that data (no
       borders are shipped: a border is where one country's cities stop being the nearest; the six hand-made islands use their own coastlines).
     - EVERY country has an arrival: the six hand-made rows of arrive783 (Jamaica, Cuba, Hispaniola for Haiti and the Dominican Republic, the Caymans, Puerto
       Rico, the Yucatan for Mexico when she comes to it there), kept exactly; every other country a row made from its data: its name, a short true line
       (written below for all of them; a region's own line for the big two: Florida, New York, Ontario, ...), and a shot at the coast or border she crossed.
     - FIRST VISIT: the full new discovery, the 783 arrival itself (bars, round and ahead, the dip to the coast she crossed, the name rising with its line,
       back on her). LATER VISITS: a mini cinematic, 3.2 s, the bars, a sweep round her and out over the land, the name card; any tap ends it.
     - A VISIT: she comes onto a country's land after at least VISIT seconds (3 minutes) off it. Crossing a border back and forth, or a coast in and out,
       inside that time never plays again. The first reading after the page opens never plays a mini (she was already there).
     - SAVES: S.seen.arrive783 keeps its meaning (the six rows; Jamaica and Cuba stay discovered); a made row's discovery goes in S.seen.arrive821 (new key).
   Every word a DRAFT for his pen. */
window.WFR_ARRIVE821 = (function () {
  'use strict';
  /* THE HAND-MADE ROWS (arrive783.js), by the world data's country names */
  var HAND = { 'Jamaica': 'jamaica', 'Cuba': 'cuba', 'Haiti': 'hispaniola', 'Dominican Republic': 'hispaniola', 'Cayman Islands': 'cayman', 'Puerto Rico': 'puertorico' };
  var PART = { 'Mexico': 'yucatan' };   /* a hand row for part of a country: within its sight line the hand row owns the discovery; elsewhere the made row does */
  /* THE NAMES on the card where the data's own spelling would read oddly */
  var NAME = { 'United States of America': 'The United States', 'United Kingdom': 'The United Kingdom', 'Congo (Kinshasa)': 'DR Congo', 'Congo (Brazzaville)': 'Republic of the Congo',
    'Guinea Bissau': 'Guinea-Bissau', 'eSwatini': 'Eswatini', 'Macau S.A.R': 'Macau', 'Hong Kong S.A.R.': 'Hong Kong', 'Svalbard and Jan Mayen Islands': 'Svalbard',
    'Federated States of Micronesia': 'Micronesia', 'United States Virgin Islands': 'The U.S. Virgin Islands', 'Turks and Caicos Islands': 'Turks and Caicos', 'Curacao': 'Curaçao',
    'Netherlands': 'The Netherlands', 'Philippines': 'The Philippines', 'United Arab Emirates': 'The United Arab Emirates', 'Maldives': 'The Maldives', 'Central African Republic': 'The Central African Republic',
    'Solomon Islands': 'The Solomon Islands', 'Marshall Islands': 'The Marshall Islands', 'Falkland Islands': 'The Falkland Islands', 'Faroe Islands': 'The Faroe Islands', 'Cook Islands': 'The Cook Islands',
    'Northern Mariana Islands': 'The Northern Mariana Islands', 'South Georgia and the Islands': 'South Georgia', 'Cape Verde': 'Cabo Verde', 'East Timor': 'Timor-Leste', 'Sao Tome and Principe': 'São Tomé and Príncipe' };
  /* THE LINES: short, true, kind (public knowledge; Izumi's check). The nearest to her first (the Americas), then the world */
  var LINE = {
    'United States of America': 'Fifty states between two oceans', 'Canada': 'From sea to sea to sea, the second-largest country on Earth',
    'The Bahamas': 'Some seven hundred islands on the clearest water', 'Turks and Caicos Islands': 'Forty low islands, and Grace Bay\'s long white beach',
    'Mexico': 'Volcanoes, deserts and jungle, and the great Pyramid of the Sun', 'Belize': 'The Great Blue Hole, and the biggest barrier reef north of the equator',
    'Guatemala': 'Tikal\'s temples above the forest, and volcanoes round a lake', 'El Salvador': 'The land of volcanoes, and the home of the pupusa',
    'Honduras': 'Copán\'s carved stones in the hills, and the Bay Islands on the reef', 'Nicaragua': 'The land of lakes and volcanoes',
    'Costa Rica': 'Cloud forests, sloths in the trees, and pura vida', 'Panama': 'Where two oceans nearly meet, and ships are lifted across the land',
    'Colombia': 'More kinds of birds than any other country on Earth', 'Venezuela': 'Angel Falls, the highest waterfall in the world',
    'Trinidad and Tobago': 'The land of the hummingbird, where the steelpan was born', 'Barbados': 'A coral island, home of the flying fish',
    'Saint Lucia': 'The two Pitons, green peaks straight up from the sea', 'Saint Vincent and the Grenadines': 'A volcano island and a string of little Grenadines',
    'Grenada': 'The Spice Isle, with a nutmeg on its flag', 'Dominica': 'The Nature Island, with a lake that boils', 'Antigua and Barbuda': 'They say a beach for every day of the year',
    'Saint Kitts and Nevis': 'Two green volcano islands, side by side', 'United States Virgin Islands': 'St. Thomas, St. John and St. Croix, white sand and turquoise bays',
    'Curacao': 'Willemstad\'s painted houses along the harbour', 'Aruba': 'Sunny and dry, with divi-divi trees bent by the wind', 'Bermuda': 'Pink sand beaches out in the Atlantic',
    'Guyana': 'Kaieteur Falls, one great drop in the rainforest', 'Suriname': 'Almost all rainforest, one of the greenest countries on Earth',
    'Ecuador': 'On the equator, with the Galápagos out at sea', 'Peru': 'Machu Picchu, high in the Andes', 'Bolivia': 'Salar de Uyuni, the largest salt flat on Earth',
    'Brazil': 'The Amazon, and Rio\'s carnival by the sea', 'Paraguay': 'The heart of South America, where most people speak Guaraní',
    'Uruguay': 'Long beaches on the River Plate, and the gaucho\'s grasslands', 'Argentina': 'The tango, the Andes, and Iguazú Falls',
    'Chile': 'A ribbon of land between the Andes and the Pacific', 'Falkland Islands': 'Windy islands of sheep and penguins in the South Atlantic',
    'South Georgia and the Islands': 'Wild southern islands, crowded with king penguins', 'Greenland': 'The world\'s largest island, mostly under ice',
    'Antarctica': 'The great ice, colder than anywhere else on Earth',
    'United Kingdom': 'England, Scotland, Wales and Northern Ireland, and a good cup of tea', 'Ireland': 'The Emerald Isle: green fields and old stone walls',
    'Isle of Man': 'An island in the Irish Sea, home of the tailless Manx cat', 'Iceland': 'Fire and ice: volcanoes, glaciers and the northern lights',
    'Faroe Islands': 'Eighteen green islands of cliffs, sheep and seabirds', 'Norway': 'Deep fjords, and the midnight sun', 'Sweden': 'Forests, lakes, and summer nights that hardly get dark',
    'Finland': 'The land of a thousand lakes, and the sauna', 'Denmark': 'Copenhagen\'s colourful harbour, and the home of Lego',
    'Svalbard and Jan Mayen Islands': 'Arctic islands of polar bears and the midnight sun', 'Estonia': 'Tallinn\'s old town, and more than two thousand islands',
    'Latvia': 'Riga\'s old town, and pine forests by the Baltic', 'Lithuania': 'Amber on the Baltic shore, and the tall dunes of the Curonian Spit',
    'France': 'The Eiffel Tower, lavender fields, and fresh bread', 'Spain': 'Flamenco, the Alhambra, and sunshine on old stone towns',
    'Portugal': 'A sailors\' coast, yellow trams, and sweet custard tarts', 'Andorra': 'A small country high in the Pyrenees', 'Monaco': 'A tiny city-state on the Riviera, and its famous Grand Prix',
    'Gibraltar': 'The Rock, with its wild Barbary macaques', 'Italy': 'Rome\'s old wonders, Venice\'s canals, and the home of pizza', 'San Marino': 'One of the oldest republics, on top of Monte Titano',
    'Malta': 'Golden stone, and temples older than the pyramids', 'Switzerland': 'The Alps, clear lakes, and cheese full of holes', 'Liechtenstein': 'A tiny country in the Alps, between Switzerland and Austria',
    'Austria': 'The Alps, and Vienna\'s music', 'Germany': 'Castles on the Rhine, deep forests, and Christmas markets', 'Luxembourg': 'A small grand duchy of castles and green valleys',
    'Belgium': 'Chocolate, waffles, and Brussels\' grand square', 'Netherlands': 'Tulips, windmills, and land won back from the sea', 'Czechia': 'Prague, the city of a hundred spires',
    'Slovakia': 'The High Tatras, and castles on the hills', 'Poland': 'Kraków\'s old square, and bison in the forest of Białowieża', 'Hungary': 'Budapest on the Danube, and warm thermal baths',
    'Slovenia': 'Lake Bled, with a little church on its island', 'Croatia': 'Over a thousand islands, and the walls of Dubrovnik', 'Bosnia and Herzegovina': 'The old bridge of Mostar over a green river',
    'Serbia': 'Belgrade, where the Sava meets the Danube', 'Montenegro': 'Black mountains over the Bay of Kotor', 'Kosovo': 'Mountain villages and Prizren\'s old stone bridge',
    'Albania': 'Mountains, and a clear blue coast on the Ionian Sea', 'North Macedonia': 'Lake Ohrid, one of the oldest lakes in Europe', 'Greece': 'White villages, blue sea, and the Acropolis in Athens',
    'Bulgaria': 'The Valley of Roses, and the Black Sea coast', 'Romania': 'The Carpathian Mountains and their old castles', 'Moldova': 'Rolling vineyards, and wine cellars with miles of tunnels',
    'Ukraine': 'Golden wheat fields under a wide blue sky', 'Belarus': 'Wide forests and many lakes, home of the European bison', 'Russia': 'The largest country on Earth, across eleven time zones',
    'Cyprus': 'A sunny island in the eastern Mediterranean, full of old ruins', 'Turkey': 'Where Europe meets Asia, across the Bosphorus in Istanbul',
    'Georgia': 'The Caucasus Mountains, and one of the oldest homes of wine', 'Armenia': 'Mount Ararat on the skyline, and very old stone churches', 'Azerbaijan': 'The Land of Fire, by the Caspian Sea',
    'Egypt': 'The pyramids of Giza and the River Nile', 'Libya': 'Roman ruins at Leptis Magna, by the Mediterranean', 'Tunisia': 'Olive groves, white-and-blue Sidi Bou Said, and the edge of the Sahara',
    'Algeria': 'The largest country in Africa, most of it Sahara', 'Morocco': 'The Atlas Mountains, and the blue streets of Chefchaouen', 'Western Sahara': 'Desert that runs down to the Atlantic',
    'Mauritania': 'Where the Sahara meets the Atlantic, and the Eye of the Sahara', 'Mali': 'Timbuktu, and the great mud-brick mosque of Djenné', 'Niger': 'The Sahara and the Niger River, with giraffes in the bush',
    'Chad': 'Lake Chad, and the stone arches of the Ennedi', 'Sudan': 'Where the Blue and White Nile meet, and more pyramids than Egypt', 'South Sudan': 'The Sudd, one of the largest wetlands on Earth',
    'Eritrea': 'Asmara\'s old cafés, and the Red Sea coast', 'Ethiopia': 'The highlands where coffee was first found, and Lalibela\'s rock-cut churches', 'Djibouti': 'Lake Assal, the lowest point in Africa, white with salt',
    'Somalia': 'The longest coastline of mainland Africa', 'Somaliland': 'The ancient cave paintings of Laas Geel', 'Kenya': 'Wide savannah, the great migration, and the Rift Valley',
    'Uganda': 'The Pearl of Africa, home of mountain gorillas', 'Rwanda': 'The land of a thousand hills', 'Burundi': 'Green hills by Lake Tanganyika, one of the deepest lakes on Earth',
    'Tanzania': 'Kilimanjaro, Africa\'s highest mountain, and the Serengeti', 'Senegal': 'Dakar on Africa\'s western tip, and the pink lake', 'The Gambia': 'The smallest country on mainland Africa, along its river',
    'Guinea Bissau': 'The Bijagós Islands, with hippos that swim in the sea', 'Guinea': 'The water tower of West Africa, where great rivers begin', 'Sierra Leone': 'Lion Mountains, and white beaches on the Atlantic',
    'Liberia': 'Africa\'s oldest republic, green with rainforest', 'Ivory Coast': 'The world\'s biggest grower of cocoa, and lagoons along the coast', 'Ghana': 'The Gold Coast, cocoa farms, and a warm Akwaaba welcome',
    'Togo': 'A narrow land from palm beaches up to green hills', 'Benin': 'Ganvié, a whole village on stilts over a lake', 'Burkina Faso': 'The land of upright people',
    'Nigeria': 'More people than any other country in Africa, and Lagos bright on the coast', 'Cameroon': 'Africa in miniature: mountains, rainforest, savannah and sea',
    'Central African Republic': 'Rainforest and savannah in the very heart of Africa', 'Equatorial Guinea': 'Volcanic Bioko island, and rainforest on the mainland',
    'Gabon': 'Rainforest down to the beach, where elephants walk the sand', 'Congo (Brazzaville)': 'Rainforest along the Congo River, home of lowland gorillas',
    'Congo (Kinshasa)': 'The great Congo River, and the second-largest rainforest on Earth', 'Angola': 'Kalandula Falls, and a long Atlantic coast', 'Zambia': 'Victoria Falls, the smoke that thunders',
    'Zimbabwe': 'Victoria Falls, and the stone walls of Great Zimbabwe', 'Malawi': 'The warm heart of Africa, and its great lake', 'Mozambique': 'A long Indian Ocean coast of coral islands',
    'Namibia': 'The red dunes of the Namib, the oldest desert on Earth', 'Botswana': 'The Okavango Delta, a river that ends in the desert, and many elephants',
    'South Africa': 'Table Mountain over Cape Town, and lions in the Kruger', 'Lesotho': 'The Kingdom in the Sky, all of it high in the mountains', 'eSwatini': 'A small mountain kingdom, known for its Reed Dance',
    'Madagascar': 'Lemurs, found in the wild nowhere else, and the Avenue of the Baobabs', 'Comoros': 'The Perfume Islands, where ylang-ylang grows', 'Mauritius': 'Once the home of the dodo, ringed by coral lagoons',
    'Seychelles': 'Granite islands, and the giant coco de mer nut', 'Cape Verde': 'Ten volcanic islands out in the Atlantic, and morna music', 'Sao Tome and Principe': 'Two green volcanic islands on the equator, rich in cocoa',
    'Israel': 'Jerusalem in the hills, the Sea of Galilee, and the Dead Sea', 'Palestine': 'Olive groves, and Bethlehem in the hills', 'Lebanon': 'Cedars on the mountains, and the old port of Byblos',
    'Syria': 'Damascus, one of the oldest cities still lived in', 'Jordan': 'Petra, a city carved into rose-red rock', 'Iraq': 'Between the Tigris and the Euphrates, an ancient land of rivers',
    'Saudi Arabia': 'The great sand seas of Arabia, and the Empty Quarter', 'Yemen': 'The mud-brick towers of Shibam, the old Manhattan of the desert', 'Oman': 'Mountains, desert and sea, and the scent of frankincense',
    'United Arab Emirates': 'Desert dunes, and the tallest building in the world', 'Qatar': 'A desert peninsula, and the inland sea of Khor Al Adaid', 'Bahrain': 'An island kingdom in the Gulf, once famous for its pearls',
    'Kuwait': 'The Kuwait Towers, by the Gulf', 'Iran': 'Persian gardens, and the blue tiles of Isfahan', 'Afghanistan': 'The Hindu Kush, and the blue lakes of Band-e-Amir',
    'Pakistan': 'K2 and the great mountains of the Karakoram', 'India': 'The Taj Mahal, the Himalayas, and a festival of lights', 'Nepal': 'Mount Everest, the highest peak on Earth',
    'Bhutan': 'A Himalayan kingdom that measures its happiness', 'Bangladesh': 'Rivers everywhere, and the Sundarbans, home of the Bengal tiger', 'Sri Lanka': 'Tea hills, elephants, and golden beaches all round',
    'Maldives': 'Over a thousand coral islands, barely above the sea', 'Kazakhstan': 'The great steppe, where apples first grew wild', 'Uzbekistan': 'Samarkand\'s blue domes on the old Silk Road',
    'Turkmenistan': 'The Darvaza crater, a gas fire burning in the desert for decades', 'Kyrgyzstan': 'Mountains, yurts, and the clear blue lake of Issyk-Kul', 'Tajikistan': 'The Pamirs, the Roof of the World',
    'China': 'The Great Wall, and giant pandas in the bamboo', 'Mongolia': 'Endless steppe, wild horses, and the Gobi', 'North Korea': 'Mountains and rivers, with Mount Paektu in the north',
    'South Korea': 'Mountains, palaces, and Seoul lit up at night', 'Japan': 'Mount Fuji, cherry blossoms, and the bullet trains', 'Taiwan': 'Night markets, and mountains rising straight from the sea',
    'Hong Kong S.A.R.': 'Skyscrapers between green peaks and the harbour', 'Macau S.A.R': 'Old Portuguese streets, and bright lights by the sea', 'Vietnam': 'Ha Long Bay\'s limestone islands, and green rice terraces',
    'Laos': 'The Mekong, and monks in saffron at dawn in Luang Prabang', 'Cambodia': 'Angkor Wat, rising out of the forest', 'Thailand': 'Golden temples, floating markets, and the Land of Smiles',
    'Myanmar': 'Thousands of old temples across the plain of Bagan', 'Malaysia': 'Old rainforest, orangutans, and the Petronas Towers', 'Singapore': 'A garden city, with supertrees that light up at night',
    'Brunei': 'Rainforest, and a whole village on stilts over the water', 'Indonesia': 'Seventeen thousand islands, and volcanoes along the Ring of Fire', 'East Timor': 'Mountains, coffee and coral reefs on the island of Timor',
    'Philippines': 'Over seven thousand islands, and the Chocolate Hills', 'Papua New Guinea': 'Birds of paradise, and over eight hundred languages',
    'Australia': 'Kangaroos, the Great Barrier Reef, and the red heart of the outback', 'New Zealand': 'Mountains, green valleys, and the kiwi bird', 'New Caledonia': 'One of the largest lagoons in the world',
    'Vanuatu': 'Some eighty islands, and a volcano you can look into', 'Solomon Islands': 'Nearly a thousand islands in the South Pacific', 'Fiji': 'Over three hundred islands, and a warm Bula welcome',
    'Tonga': 'A Pacific kingdom where humpback whales come to have their calves', 'Samoa': 'Waterfalls, and the To Sua ocean trench', 'American Samoa': 'Steep green volcanic islands in the South Pacific',
    'Cook Islands': 'Fifteen islands, and Aitutaki\'s turquoise lagoon', 'French Polynesia': 'Tahiti, Bora Bora, and more than a hundred islands', 'Kiribati': 'The first place on Earth to see each new day',
    'Tuvalu': 'Nine small islands, among the smallest countries on Earth', 'Marshall Islands': 'Coral atolls in the middle of the Pacific', 'Federated States of Micronesia': 'Nan Madol, an old city built on the reef',
    'Palau': 'The Rock Islands, and a lake full of golden jellyfish', 'Guam': 'A tropical island in the western Pacific, home of the Chamorro people', 'Northern Mariana Islands': 'Saipan and its neighbours in the western Pacific'
  };
  /* A REGION'S OWN LINE for the big two (lat0, lat1, lon0, lon1, line; the first that holds the crossing wins) */
  var AT = {
    'United States of America': [[24.3, 31.1, -87.7, -79.8, 'Florida: the Everglades, a river of grass, and Miami bright on the water'], [40.4, 45.1, -79.8, -71.8, 'New York: the Statue of Liberty, and a city that never sleeps'],
      [32.5, 42.0, -124.6, -114.1, 'California: redwoods, the Golden Gate, and the long Pacific coast'], [25.8, 36.5, -106.7, -93.5, 'Texas: wide open plains and big skies'],
      [18.8, 22.4, -160.4, -154.6, 'Hawaii: volcano islands in the middle of the Pacific'], [51.0, 72.0, -180, -129.9, 'Alaska: Denali, glaciers, and bears fishing for salmon']],
    'Canada': [[41.6, 57.0, -95.2, -79.5, 'Ontario: the Great Lakes, Niagara Falls, and Toronto\'s tower by the water'], [43.5, 45.5, -79.5, -74.3, 'Ontario: the Great Lakes, Niagara Falls, and Toronto\'s tower by the water'],
      [45.0, 62.6, -79.5, -57.0, 'Québec: old stone streets, maple syrup, and the St. Lawrence'], [48.3, 60.0, -139.1, -114.0, 'British Columbia: mountains, rainforest, and orcas off the coast']]
  };
  /* U3 · CITY MINIS (Marth, Nov 14 2026: "Gotta make sure prominent cities - I'm glad a lot of them are already labeled, we gotta make the mini cinematics for sum
     cities tho"). The prominent cities of the same world data: every capital and every great city (its population class 12 and up: 584), and the ones he
     named first, each with a short true line (written for those; the capital's or the great city's own line for the rest). When she first comes within a
     few km of one in a visit (5 km; 8 km for the very biggest): a mini over the city, its name card, any tap ends it. Once a visit (the country's rule: back
     after 3 minutes away). Never on top of a country's arrival: the country first, the city after it. */
  var CITYLINE = {
    'Toronto|Canada': 'The CN Tower over Lake Ontario, and neighbourhoods from all over the world', 'Kingston|Canada': 'The Limestone City, where Lake Ontario meets the St. Lawrence',
    'Montréal|Canada': 'An island city on the St. Lawrence, and the old stone streets of Old Montréal', 'Ottawa|Canada': 'Canada\'s capital, where the Rideau Canal freezes into a skating rink',
    'Vancouver|Canada': 'Mountains behind, the sea in front, and Stanley Park between', 'New York|United States of America': 'The Statue of Liberty, Central Park, and the lights of Times Square',
    'Miami|United States of America': 'Art Deco by the beach, and warm nights on Biscayne Bay', 'Havana|Cuba': 'Old cars on the Malecón, and painted streets in Old Havana',
    'Kingston|Jamaica': 'Jamaica\'s capital, under the Blue Mountains, where reggae grew up', 'Montego Bay|Jamaica': 'White beaches and clear water on Jamaica\'s north coast',
    'Mexico City|Mexico': 'Built on an old lake, where the Aztecs\' great city stood', 'Cancún|Mexico': 'A long white beach between a lagoon and the turquoise sea',
    'London|United Kingdom': 'Big Ben, the River Thames, and red double-decker buses', 'Paris|France': 'The Eiffel Tower, the Seine, and cafés on every corner',
    'Rome|Italy': 'The Colosseum, and more than two thousand years of stories', 'Cairo|Egypt': 'The pyramids at the edge of the city, and the Nile running through it',
    'Lagos|Nigeria': 'One of Africa\'s biggest cities, bright and busy by its lagoon', 'Jerusalem|Israel': 'An old walled city in the hills, holy to many',
    'Tokyo|Japan': 'The biggest city on Earth, with Mount Fuji far off on a clear day', 'Sydney|Australia': 'The Opera House and the Harbour Bridge on a sparkling harbour',
    'Rio de Janeiro|Brazil': 'Sugarloaf Mountain, Copacabana beach, and the great statue on Corcovado'
  };
  function the(n) { return n.replace(/^The /, 'the '); }
  function cities(M) {   /* the prominent cities: { key, name, country, lat, lon, cap, r (km), line } */
    var q = M.q || 100, out = [];
    M.cities.forEach(function (c) { var country = M.countries[c[1]] || '', key = c[0] + '|' + country, w = CITYLINE[key]; if (!w && !c[6] && !(c[5] >= 12)) return;
      var cn = the(NAME[country] || country); out.push({ key: key, name: c[0], country: country, lat: c[2] / q, lon: c[3] / q, cap: !!c[6], r: c[5] >= 13 ? 8 : 5, written: !!w, line: w || (c[6] ? 'The capital of ' + cn : 'One of the great cities of ' + cn) }); });
    return out; }
  var K = { VISIT: 180, CHECK: 0.25, MINI: 3.2, CARD: 0.45, PEND: 30, PRE_MAX: 8, GAP: 8, CAM0: 3200, CAM1: 1800, CAMY0: 380, CAMY1: 520, IN: 20000, INY: 500 };
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function up(s) { return String(s).toUpperCase(); }
  /* every country's arrival, from the world data's own list (M.countries) and arrive783's rows: { country, kind: hand | written | plain, row, name, line, at } */
  function build(countries, places) {
    var rows = {}, out = {}; (places || []).forEach(function (p) { rows[p.id] = p; });
    (countries || []).forEach(function (c) {
      if (HAND[c]) { var r = rows[HAND[c]]; if (r) out[c] = { country: c, kind: 'hand', row: r.id, name: NAME[c] || c, line: r.under || '', at: null }; return; }
      out[c] = { country: c, kind: LINE[c] ? 'written' : 'plain', row: PART[c] && rows[PART[c]] ? PART[c] : null, name: NAME[c] || c, line: LINE[c] || '', at: AT[c] || null };
    });
    return out;
  }
  /* THE NEVER-AGAIN AUDIT: every country in the world data has an arrival with a name, and every country can be found (it has a city); the written lines'
     names all exist in the data (a misspelt name would silently fall back) */
  function audit(M, places) {
    var A = build(M.countries, places), has = {}, r = { countries: M.countries.length, missing: [], noCity: [], unknownLines: [], plain: [], hand: [], written: 0 };
    M.cities.forEach(function (c) { has[c[1]] = 1; });
    M.countries.forEach(function (c, i) { var a = A[c]; if (!a || !a.name) r.missing.push(c); else if (a.kind === 'plain') r.plain.push(c); else if (a.kind === 'hand') r.hand.push(c); else r.written++; if (!has[i]) r.noCity.push(c); });
    Object.keys(LINE).concat(Object.keys(HAND), Object.keys(NAME), Object.keys(AT)).forEach(function (c) { if (M.countries.indexOf(c) < 0 && r.unknownLines.indexOf(c) < 0) r.unknownLines.push(c); });
    return r;
  }
  /* WHERE SHE IS: the nearest city's country (equirectangular km; 5,527 cities, four times a second at most), the hand rows' own coastlines first */
  function index(M) {
    var n = M.cities.length, q = M.q || 100, I = { lat: new Float32Array(n), lon: new Float32Array(n), c: new Uint16Array(n), names: M.countries };
    for (var i = 0; i < n; i++) { var x = M.cities[i]; I.lat[i] = x[2] / q; I.lon[i] = x[3] / q; I.c[i] = x[1]; }
    return I;
  }
  function nearestCity(I, lat, lon, only) {
    var best = 1e18, bi = -1, cl = Math.cos(lat * Math.PI / 180);
    for (var i = 0; i < I.c.length; i++) { if (only && !only[I.c[i]]) continue; var dy = I.lat[i] - lat, dx = I.lon[i] - lon; if (dx > 180) dx -= 360; else if (dx < -180) dx += 360; dx *= cl; var d = dx * dx + dy * dy; if (d < best) { best = d; bi = i; } }
    return bi < 0 ? null : { i: bi, km: Math.sqrt(best) * 111.2, country: I.names[I.c[bi]] };
  }
  function countryAt(I, places, A, lat, lon) {
    for (var j = 0; j < places.length; j++) { var P = places[j]; if (P.id === 'yucatan' || !P.coast || P.coast.length < 3 || !inside(P.coast, lat, lon)) continue;
      var cs = Object.keys(HAND).filter(function (c) { return HAND[c] === P.id && A[c]; }); if (cs.length === 1) return cs[0];
      if (cs.length > 1) { var only = {}; cs.forEach(function (c) { only[I.names.indexOf(c)] = 1; }); var h = nearestCity(I, lat, lon, only); if (h) return h.country; } }
    var n = nearestCity(I, lat, lon); return n ? n.country : null;
  }
  function inside(poly, lat, lon) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], b = poly[j]; if ((a[0] > lat) !== (b[0] > lat) && lon < (b[1] - a[1]) * (lat - a[0]) / (b[0] - a[0]) + a[1]) c = !c; } return c; }
  function lineAt(a, lat, lon) { if (a.at) for (var i = 0; i < a.at.length; i++) { var b = a.at[i]; if (lat >= b[0] && lat <= b[1] && lon >= b[2] && lon <= b[3]) return b[4]; } return a.line; }

  /* U2 · UNDISCOVERED LAND IS GREY: the country under every half degree of the world (the same nearest-city rule), worked out a few rows a frame after the
     data is in (2-degree buckets of the cities), then painted into the far ground's one mask (world712-travel.js grey821: 255 grey, 0 colour) */
  var MW = 720, MH = 360, BK = 2;
  function bkey(lat, lon) { var NC = 360 / BK; return Math.min(180 / BK - 1, Math.floor((lat + 90) / BK)) * NC + Math.floor((((lon + 180) % 360) + 360) % 360 / BK) % NC; }
  function buckets(I) { var NB = (180 / BK) * (360 / BK), n = I.c.length, s0 = new Uint32Array(NB + 1), it = new Uint32Array(n), k, i; for (i = 0; i < n; i++) s0[bkey(I.lat[i], I.lon[i]) + 1]++; for (k = 1; k <= NB; k++) s0[k] += s0[k - 1]; var fill = s0.slice(0, NB); for (i = 0; i < n; i++) it[fill[bkey(I.lat[i], I.lon[i])]++] = i; return { s: s0, it: it }; }   /* the cities in 2-degree buckets, flat arrays */
  function idAt(I, B, lat, lon) {
    var bi = -1, best = 1e18, cl = Math.cos(lat * Math.PI / 180), r0 = Math.floor((lat + 90) / BK), c0 = Math.floor((lon + 180) / BK), NC = 360 / BK;
    for (var r = 0; r <= 3; r++) {
      for (var a = r0 - r; a <= r0 + r; a++) { if (a < 0 || a >= 180 / BK) continue; for (var b = c0 - r; b <= c0 + r; b++) { if (Math.max(Math.abs(a - r0), Math.abs(b - c0)) !== r) continue; var q = a * NC + (((b % NC) + NC) % NC), j1 = B.s[q + 1];
        for (var j = B.s[q]; j < j1; j++) { var i = B.it[j], dy = I.lat[i] - lat, dx = I.lon[i] - lon; if (dx > 180) dx -= 360; else if (dx < -180) dx += 360; dx *= cl; var d = dx * dx + dy * dy; if (d < best) { best = d; bi = i; } } } }
      if (bi >= 0 && Math.sqrt(best) <= r * BK * Math.max(0.2, cl)) break; }
    return bi < 0 ? 255 : I.c[bi]; }
  function create(o) {
    var W = o.W, T = o.T, cine = o.cine, a783 = o.a783, THREE = o.THREE;
    var st = { cityT: {}, cityBoot: true, cityMinis: 0, made: true, data: false, asked: 0, acc: 0, cur: null, prevLL: null, cross: null, enterT: 0, handled: false, boot: true, lastT: {}, plays: 0, minis: 0, skips: 0, ends: 0, why: '', pre: 0,
      since: 1e9, last: null, mini: null, err: '', beats: [], log: [] };
    var CT = null, A = null, I = null, PL = (window.WFR_ARRIVE783 && WFR_ARRIVE783.PLACES) || [];
    var TA = new THREE.Vector3(), TB = new THREE.Vector3();
    var G = null, gr = { id: null, B: null, row: 0, done: false, off: null, cells: null, grey: null, fade: null, sync: 0, paints: 0, cleared: true };   /* U2 */
    function mask() { if (!G) { try { G = o.grey ? o.grey() : null; } catch (e) { G = null; } } return G && G.tex && G.tex.value && G.tex.value.image ? G : null; }
    function frameSync() { var M = mask(), f = T.f; if (!M || !f) return; M.frame.value.set(f.ox, f.g ? f.oz : f.oy, f.k || 1, f.g ? 1 : 0); }   /* every frame, after the travel zone's recentre */
    function gridStep(rows) {
      if (!gr.id) { gr.id = new Uint8Array(MW * MH); gr.B = buckets(I); }
      for (var n = 0; n < rows && gr.row < MH; n++, gr.row++) { var lat = -90 + (gr.row + 0.5) * 180 / MH; for (var i = 0; i < MW; i++) gr.id[gr.row * MW + i] = idAt(I, gr.B, lat, -180 + (i + 0.5) * 360 / MW); }
      if (gr.row < MH) return false;
      var H0 = W.HOME, hr = Math.floor((H0.lat + 90) * MH / 180), hc = Math.floor((H0.lon + 180) * MW / 360);   /* the home island and its sea are never grey: no country there */
      for (var y = hr - 1; y <= hr + 1; y++) for (var x = hc - 1; x <= hc + 1; x++) gr.id[y * MW + x] = 255;
      var n2 = I.names.length, cnt = new Uint32Array(n2 + 1); for (var k = 0; k < gr.id.length; k++) if (gr.id[k] < n2) cnt[gr.id[k] + 1]++;
      for (var c = 1; c <= n2; c++) cnt[c] += cnt[c - 1]; gr.off = cnt; gr.cells = new Uint32Array(cnt[n2]); var fill = cnt.slice(0, n2);
      for (var k2 = 0; k2 < gr.id.length; k2++) if (gr.id[k2] < n2) gr.cells[fill[gr.id[k2]]++] = k2;
      gr.grey = new Uint8Array(n2); gr.done = true; return true; }
    function paint(id, v) { var M = mask(); if (!M) return; var d = M.tex.value.image.data; for (var k = gr.off[id]; k < gr.off[id + 1]; k++) d[gr.cells[k]] = v; M.tex.value.needsUpdate = true; gr.paints++; }
    function greySync() {   /* each country grey while she has not discovered it, unless its colour is fading in now */
      var n2 = I.names.length, ch = false; for (var id = 0; id < n2; id++) { if (gr.fade && gr.fade.ids.indexOf(id) >= 0) continue; var want = discovered(I.names[id]) ? 0 : 255; if (gr.grey[id] !== want) { gr.grey[id] = want; paint(id, want); ch = true; } }
      gr.cleared = false; return ch; }
    function greyClear() { var M = mask(); if (!M || gr.cleared) return; M.tex.value.image.data.fill(0); M.tex.value.needsUpdate = true; if (gr.grey) gr.grey.fill(0); gr.fade = null; gr.cleared = true; }   /* Classic: never grey */
    function greyFade(countries) {   /* a discovery scene began: its land colours in from the moment the name rises (4.4 s) over 3 s, or at once if the scene ends first */
      if (!gr.done || gr.fade) return; var ids = []; countries.forEach(function (c) { var id = I.names.indexOf(c); if (id >= 0 && gr.grey[id]) ids.push(id); }); if (ids.length) gr.fade = { ids: ids, t: 0, v: 255 }; }
    function greyTick(real) {
      var F = gr.fade; if (!F) return; F.t += real || 0; var on = a783 && a783.on && a783.on(), v = on ? Math.round(255 * (1 - sm((F.t - 4.4) / 3.0))) : 0;
      if (Math.abs(v - F.v) >= 20 || (v === 0 && F.v !== 0)) { F.v = v; F.ids.forEach(function (id) { paint(id, v); gr.grey[id] = v; }); }
      if (v === 0) gr.fade = null; }
    function now() { return (o.now ? o.now() : performance.now()) / 1000; }
    function seen783() { var S = o.S; S.seen = S.seen || {}; return S.seen.arrive783 || {}; }
    function seen821() { var S = o.S; S.seen = S.seen || {}; return S.seen.arrive821 || (S.seen.arrive821 = {}); }
    function ready() {
      if (A) return true; var M = window.WFR_WORLDMAP712;
      if (!M) { if (!st.asked && o.loadMap) { st.asked = 1; try { o.loadMap(); } catch (e) { st.err = 'load: ' + (e && e.message); } } return false; }
      I = index(M); A = build(M.countries, PL); CT = cities(M); st.data = true; return true;
    }
    function owner(a, lat, lon) {   /* the hand row that owns this country's discovery here, or null */
      if (a.kind === 'hand') return a.row;
      if (a.row) { var P = PL.filter(function (p) { return p.id === a.row; })[0]; if (P && WFR_ARRIVE783.nearest(P, lat, lon).km <= P.sight) return a.row; }
      return null;
    }
    function discovered(c) { var a = A && A[c]; if (!a) return false; var s7 = seen783(); if (a.row && s7[a.row]) return true; return !!seen821()[c]; }
    function log(s) { st.log.push(s); if (st.log.length > 40) st.log.shift(); }
    function why() { var w = a783 && a783.why ? a783.why() : ''; if (w) return w; if (cine.on()) return 'scene'; if (st.since < K.GAP) return 'gap'; return ''; }
    function loading(x, z) { try { return !!(T.st && T.st.loadingUnder(x, z)); } catch (e) { return false; } }
    /* THE FULL NEW DISCOVERY: arrive783's own scene, with a row made here: the shot off the coast or border she crossed, looking inland */
    function full(a, ll) {
      var S = o.S, c = st.cross && W.distance(st.cross, ll) < 30000 ? st.cross : ll, p0 = W.toLocal(T.f, c.lat, c.lon), p1 = W.toLocal(T.f, ll.lat, ll.lon), dx = p1.x - p0.x, dz = p1.z - p0.z, d = Math.hypot(dx, dz);
      if (d < 50) { dx = Math.sin(S.yaw); dz = Math.cos(S.yaw); d = 1; } dx /= d; dz /= d;
      function at(k, y) { var q = W.toLatLon(T.f, p0.x + dx * k, p0.z + dz * k); return [q.lat, q.lon, y]; }
      var in1 = at(K.IN, K.INY), line = lineAt(a, c.lat, c.lon);
      var P = { id: 'c821:' + a.country, data: true, country: a.country, name: up(a.name), under: line, coast: [[c.lat, c.lon]], sight: 0, yaw: S.yaw,
        peak: { lat: in1[0], lon: in1[1], h: K.INY, name: '' },
        shot: { cam0: at(-K.CAM0, K.CAMY0), cam1: at(-K.CAM1, K.CAMY1), look0: [c.lat, c.lon, 30], look1: in1, fov: [42, 36] },
        onSeen: function () { seen821()[a.country] = 1; } };
      var ok = a783.playRow(P, ll); if (!ok) return false;
      st.plays++; st.last = { kind: 'full', country: a.country, name: P.name, line: line, at: [+c.lat.toFixed(3), +c.lon.toFixed(3)] }; log('full ' + a.country);
      return true;
    }
    /* THE MINI: the bars, a sweep round her and out over the land ahead, the name card; any tap ends it */
    function mini(a, ll, cc) {   /* cc: a city (U3): its own card, and the look drawn over the city */
      var S = o.S, s = Math.max(0.25, o.size ? o.size() : 0.4), d0 = 6 + 8 * s, h0 = 2 + 3 * s, side = st.minis % 2 ? -1 : 1, said = false, line = cc ? cc.line : lineAt(a, ll.lat, ll.lon), M = { country: a.country, t: 0 };
      var ok = cine.play({ name: cc ? 'city821' : 'mini821', dur: K.MINI, skip: 0, freeze: false, bars: true,
        tick: function (t) { M.t = t; if (!said && t >= K.CARD) { said = true; try { cine.card(cc ? (cc.cap ? 'Capital' : 'City') : 'Back in', cc ? cc.name : a.name, line); } catch (e) { st.err = 'card: ' + (e && e.message); } } },
        shot: function (t, u, P, L) {
          var B = o.S.pos, yaw = o.S.yaw, e = sm(u), ang = yaw + Math.PI + side * lerp(-0.7, 0.55, e), r = d0 * lerp(1.0, 2.6, e), fx = Math.sin(yaw), fz = Math.cos(yaw);
          P.set(B.x + Math.sin(ang) * r, B.y + h0 * lerp(0.9, 3.2, e), B.z + Math.cos(ang) * r);
          try { var g = Math.max(0, o.H(P.x, P.z)); if (P.y < g + 1.5) P.y = g + 1.5; } catch (er) { /* fine */ }
          var ahead = lerp(1, 22, e); L.set(B.x + fx * ahead, B.y - lerp(0, 2.5, e) * s, B.z + fz * ahead);
          if (cc && T.f) { var cp = W.toLocal(T.f, cc.lat, cc.lon); P.y += h0 * 2 * e; L.lerp(TB.set(cp.x, Math.max(0, B.y * 0.4), cp.z), 0.08 * e); }   /* a city: higher, the look drawn toward its centre */
          return lerp(50, 58, e); },   /* she stays in the frame; the land opens out ahead of her */
        end: function (how) { st.ends++; if (how === 'tap') st.skips++; st.since = 0; var e2 = { country: a.country, city: cc ? cc.name : null, how: how, t: +M.t.toFixed(2) }; if (cc) st.cityEnd = e2; else st.mini = e2; log((cc ? 'city' : 'mini') + ' end ' + how); } });
      if (!ok) return false;
      if (cc) { st.cityMinis++; st.since = 0; st.cityLast = { name: cc.name, country: cc.country, line: line, over: cc.cap ? 'Capital' : 'City' }; log('city ' + cc.name); if (o.said) try { o.said(cc.name, cc.cap ? 'Capital' : 'City', cc.lat, cc.lon, cc.country); } catch (e) { /* 817: the ledger notes it */ } return true; }
      st.minis++; st.since = 0; st.last = { kind: 'mini', country: a.country, name: a.name, line: line }; log('mini ' + a.country); return true;
    }
    var off = false; try { off = !!(o.bench && o.bench()); } catch (e) { off = false; } st.off = off;   /* the other benches run without it (board 606's rule for the title: wfr.debug, unless wfr.arr821 = 1); her game never is a bench */
    function tick(real) {
      if (off) { st.why = 'bench'; return; }
      st.since += real || 0; st.acc += real || 0;
      if (A && a783 && a783.on && a783.on()) { var id = a783.row && a783.row(), fc = []; if (id) { var t0 = now(); for (var c in A) if (A[c].row === id || id === 'c821:' + c) { st.lastT[c] = t0; fc.push(c); } if (gr.done && !gr.fade && !o.classic()) greyFade(fc); } }   /* a country's arrival playing is a visit to it: no mini when she then reaches its land; U2: its land colours in */
      if (T.on) frameSync(); greyTick(real); if (A && !gr.done && T.on && !o.classic() && mask()) gridStep(2);   /* U2: two rows a frame (180 frames, about 3 s; a few ms each) */
      if (st.acc < K.CHECK) return; var dt = st.acc; st.acc = 0; try { countryCheck(dt); } catch (e) { st.err = 'country: ' + (e && e.message); } try { cityCheck(); } catch (e) { st.err = 'city: ' + (e && e.message); } }   /* a fault here never stops the game's frame */
    function cityCheck() {   /* U3: after the country's own check, never on top of it */
      if (!CT || !A || !T.on || !T.f || o.classic()) return;
      var S = o.S, ll = W.toLatLon(T.f, S.pos.x, S.pos.z), t = now(), near = null, nd = 1e9, cl = Math.cos(ll.lat * Math.PI / 180), bootC = st.cityBoot; st.cityBoot = false;
      for (var i = 0; i < CT.length; i++) { var c = CT[i], dy = (c.lat - ll.lat) * 110.57; if (dy > 9 || dy < -9) continue; var dx = (c.lon - ll.lon) * 111.32 * cl, d = Math.sqrt(dx * dx + dy * dy); if (d <= c.r && d < nd) { nd = d; near = c; } }
      if (near !== st.city) { st.city = near; st.cityIn = t; st.cityDone = false; }
      if (!near) return; var key = near.key;
      if (st.cityDone) { st.cityT[key] = t; return; }
      var last = st.cityT[key]; if (bootC || (last != null && t - last < K.VISIT)) { st.cityDone = true; st.cityT[key] = t; st.cityWhy = bootC ? 'boot' : 'visit'; return; }
      if (st.cur !== near.country || !st.handled) { st.cityWhy = 'country'; return; }   /* the city waits until she is over its country's land and that country's own arrival or mini is settled: the country goes first (a city's circle reaches out over the sea: Miami's played 10 km offshore and took the country's turn) */
      var w = why(); if (w) { st.cityWhy = w; if (t - st.cityIn > 90) { st.cityDone = true; st.cityT[key] = t; } return; }
      if (mini(A[near.country] || { country: near.country, name: near.country }, ll, near)) { st.cityDone = true; st.cityT[key] = t; st.cityWhy = ''; } }
    function countryCheck(dt) {
      if (!T.on || !T.f) { st.prevLL = null; st.cur = null; return; }
      if (!ready()) { st.why = 'data'; return; }
      if (o.classic()) { st.why = 'classic'; greyClear(); return; }
      if (mask() && gr.done && ((gr.sync += dt) >= 1 || gr.cleared)) { gr.sync = 0; greySync(); }   /* U2: kept in step once a second */
      var S = o.S, ll = W.toLatLon(T.f, S.pos.x, S.pos.z), land = o.land(S.pos.x, S.pos.z);
      if (land == null) { st.why = 'ground'; return; }
      var here = land ? countryAt(I, PL, A, ll.lat, ll.lon) : null, t = now(), boot = st.boot; st.boot = false;
      if (here !== st.cur) { st.cross = st.prevLL || ll; st.cur = here; st.enterT = t; st.handled = false; st.pre = 0; if (here) log('enter ' + here); }
      st.prevLL = { lat: ll.lat, lon: ll.lon };
      if (!here) { st.why = 'sea'; return; }
      var a = A[here]; if (!a) { st.why = 'none ' + here; st.handled = true; return; }
      if (st.handled) { st.lastT[here] = t; return; }
      if (!discovered(here)) {
        if (owner(a, ll.lat, ll.lon)) { st.why = 'hand ' + a.row; return; }   /* arrive783's own row plays it (and marks it); nothing here */
        var w = why(); if (w) { st.why = w; return; }
        if (loading(S.pos.x, S.pos.z) && (st.pre += dt) < K.PRE_MAX) { st.why = 'ground'; return; }
        if (full(a, ll)) { st.handled = true; st.lastT[here] = t; st.why = ''; }
        return;
      }
      var last = st.lastT[here], due = !boot && (last == null || t - last >= K.VISIT);
      if (!due) { st.handled = true; st.lastT[here] = t; st.why = boot ? 'boot' : 'visit'; return; }
      var w2 = why(); if (w2) { st.why = w2; if (t - st.enterT > K.PEND) { st.handled = true; st.lastT[here] = t; } return; }
      if (mini(a, ll)) { st.handled = true; st.lastT[here] = t; st.why = ''; }
    }
    function peek() { return { city: st.city ? st.city.name : null, cityWhy: st.cityWhy || '', cityMinis: st.cityMinis || 0, cityLast: st.cityLast || null, cityEnd: st.cityEnd || null, cities: CT ? CT.length : 0, made: st.made, off: st.off, data: st.data, cur: st.cur, why: st.why, plays: st.plays, minis: st.minis, skips: st.skips, ends: st.ends, last: st.last, mini: st.mini, err: st.err,
      on: !!(cine.current() && cine.current().name === 'mini821'), seen: Object.assign({}, seen821()), log: st.log.slice(), count: A ? Object.keys(A).length : 0 }; }
    return { tick: tick, peek: peek, discovered: function (c) { return ready() && discovered(c); }, here: function (lat, lon) { return ready() ? countryAt(I, PL, A, lat, lon) : null; },
      arrival: function (c) { return ready() && A[c] ? Object.assign({}, A[c]) : null; }, all: function () { return ready() ? A : null; },
      age: function (c, s) { if (st.lastT[c] != null) st.lastT[c] -= s; }, K: K, mini: mini, ready: ready,
      grey: function () { var M = mask(); return { made: !!M, done: gr.done, rows: gr.row, paints: gr.paints, fade: gr.fade ? { ids: gr.fade.ids.length, v: gr.fade.v } : null, greyN: gr.grey ? Array.prototype.filter.call(gr.grey, function (x) { return x; }).length : 0 }; },
      greyAt: function (lat, lon) { var M = mask(); if (!M) return null; var r = Math.floor((lat + 90) * MH / 180), c = Math.floor((lon + 180) * MW / 360); return M.tex.value.image.data[r * MW + c]; },
      forget: function (c) { delete seen821()[c]; gr.sync = 1; } };   /* the bench's: a discovery forgotten (debug only; never saved by itself) */
  }
  return { cities: cities, CITYLINE: CITYLINE, create: create, build: build, audit: audit, index: index, nearestCity: nearestCity, countryAt: countryAt, lineAt: lineAt, HAND: HAND, PART: PART, NAME: NAME, LINE: LINE, AT: AT, K: K };
})();
