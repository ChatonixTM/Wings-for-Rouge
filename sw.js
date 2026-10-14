/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-3e95e9c3c93c';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=3e95e9c3c93c","skeleton-utils.js?v=3e95e9c3c93c","meshopt-decoder.js?v=3e95e9c3c93c","models.js?v=3e95e9c3c93c","people.js?v=3e95e9c3c93c","villagers.js?v=3e95e9c3c93c","tex-photos.js?v=3e95e9c3c93c","textures.js?v=3e95e9c3c93c","birds.js?v=3e95e9c3c93c","humans.js?v=3e95e9c3c93c","folk.js?v=3e95e9c3c93c","trees.js?v=3e95e9c3c93c","treehouses.js?v=3e95e9c3c93c","cabins.js?v=3e95e9c3c93c","cave.js?v=3e95e9c3c93c","sounds.js?v=3e95e9c3c93c","music.js?v=3e95e9c3c93c","music-orchestra.js?v=3e95e9c3c93c","rhythm.js?v=3e95e9c3c93c","pictograms.js?v=3e95e9c3c93c","chick-wear.js?v=3e95e9c3c93c","hedgehogs.js?v=3e95e9c3c93c","opening.js?v=3e95e9c3c93c","skypiea.js?v=3e95e9c3c93c","atmo.js?v=3e95e9c3c93c","orch-samples.js?v=3e95e9c3c93c","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
