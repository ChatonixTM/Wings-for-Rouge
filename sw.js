/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-2ea30f801bff';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=2ea30f801bff","gltf-loader.js?v=2ea30f801bff","skeleton-utils.js?v=2ea30f801bff","meshopt-decoder.js?v=2ea30f801bff","models.js?v=2ea30f801bff","people.js?v=2ea30f801bff","villagers.js?v=2ea30f801bff","tex-photos.js?v=2ea30f801bff","textures.js?v=2ea30f801bff","birds.js?v=2ea30f801bff","humans.js?v=2ea30f801bff","folk.js?v=2ea30f801bff","trees.js?v=2ea30f801bff","treehouses.js?v=2ea30f801bff","cabins.js?v=2ea30f801bff","cave.js?v=2ea30f801bff","hermits.js?v=2ea30f801bff","sounds.js?v=2ea30f801bff","music.js?v=2ea30f801bff","music-orchestra.js?v=2ea30f801bff","rhythm.js?v=2ea30f801bff","pictograms.js?v=2ea30f801bff","chick-wear.js?v=2ea30f801bff","hedgehogs.js?v=2ea30f801bff","opening.js?v=2ea30f801bff","skypiea.js?v=2ea30f801bff","pirate.js?v=2ea30f801bff","atmo.js?v=2ea30f801bff","boat.js?v=2ea30f801bff","weather.js?v=2ea30f801bff","village-build.js?v=2ea30f801bff","runes.js?v=2ea30f801bff","orchard.js?v=2ea30f801bff","net678.js?v=2ea30f801bff","net678-config.js?v=2ea30f801bff","orch-samples.js?v=2ea30f801bff","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
