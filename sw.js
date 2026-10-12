/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-d9e814e9c4bf';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=d9e814e9c4bf","skeleton-utils.js?v=d9e814e9c4bf","meshopt-decoder.js?v=d9e814e9c4bf","models.js?v=d9e814e9c4bf","people.js?v=d9e814e9c4bf","villagers.js?v=d9e814e9c4bf","tex-photos.js?v=d9e814e9c4bf","textures.js?v=d9e814e9c4bf","birds.js?v=d9e814e9c4bf","humans.js?v=d9e814e9c4bf","folk.js?v=d9e814e9c4bf","trees.js?v=d9e814e9c4bf","treehouses.js?v=d9e814e9c4bf","cabins.js?v=d9e814e9c4bf","cave.js?v=d9e814e9c4bf","sounds.js?v=d9e814e9c4bf","music.js?v=d9e814e9c4bf","music-orchestra.js?v=d9e814e9c4bf","rhythm.js?v=d9e814e9c4bf","pictograms.js?v=d9e814e9c4bf","chick-wear.js?v=d9e814e9c4bf","hedgehogs.js?v=d9e814e9c4bf","opening.js?v=d9e814e9c4bf","skypiea.js?v=d9e814e9c4bf","atmo.js?v=d9e814e9c4bf","orch-samples.js?v=d9e814e9c4bf","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
