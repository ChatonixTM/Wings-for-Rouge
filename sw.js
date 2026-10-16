/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-981d4618aa23';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=981d4618aa23","skeleton-utils.js?v=981d4618aa23","meshopt-decoder.js?v=981d4618aa23","models.js?v=981d4618aa23","people.js?v=981d4618aa23","villagers.js?v=981d4618aa23","tex-photos.js?v=981d4618aa23","textures.js?v=981d4618aa23","birds.js?v=981d4618aa23","humans.js?v=981d4618aa23","folk.js?v=981d4618aa23","trees.js?v=981d4618aa23","treehouses.js?v=981d4618aa23","cabins.js?v=981d4618aa23","cave.js?v=981d4618aa23","sounds.js?v=981d4618aa23","music.js?v=981d4618aa23","music-orchestra.js?v=981d4618aa23","rhythm.js?v=981d4618aa23","pictograms.js?v=981d4618aa23","chick-wear.js?v=981d4618aa23","hedgehogs.js?v=981d4618aa23","opening.js?v=981d4618aa23","skypiea.js?v=981d4618aa23","atmo.js?v=981d4618aa23","weather.js?v=981d4618aa23","runes.js?v=981d4618aa23","orch-samples.js?v=981d4618aa23","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
