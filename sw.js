/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-71c16ae40f67';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=71c16ae40f67","skeleton-utils.js?v=71c16ae40f67","meshopt-decoder.js?v=71c16ae40f67","models.js?v=71c16ae40f67","people.js?v=71c16ae40f67","villagers.js?v=71c16ae40f67","tex-photos.js?v=71c16ae40f67","textures.js?v=71c16ae40f67","birds.js?v=71c16ae40f67","humans.js?v=71c16ae40f67","folk.js?v=71c16ae40f67","trees.js?v=71c16ae40f67","treehouses.js?v=71c16ae40f67","cabins.js?v=71c16ae40f67","cave.js?v=71c16ae40f67","sounds.js?v=71c16ae40f67","music.js?v=71c16ae40f67","music-orchestra.js?v=71c16ae40f67","rhythm.js?v=71c16ae40f67","pictograms.js?v=71c16ae40f67","chick-wear.js?v=71c16ae40f67","hedgehogs.js?v=71c16ae40f67","opening.js?v=71c16ae40f67","skypiea.js?v=71c16ae40f67","pirate.js?v=71c16ae40f67","atmo.js?v=71c16ae40f67","boat.js?v=71c16ae40f67","weather.js?v=71c16ae40f67","village-build.js?v=71c16ae40f67","runes.js?v=71c16ae40f67","orchard.js?v=71c16ae40f67","orch-samples.js?v=71c16ae40f67","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
/* install fetches past the HTTP cache (GitHub Pages keeps files 10 minutes): an asset under an unchanged name still arrives fresh */
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const page = r.mode === 'navigate';
  e.respondWith(page
    ? fetch(r.url, { cache: 'no-cache' }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); return res; }).catch(() => caches.match('index.html'))
    : caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); } return res; })));
});
