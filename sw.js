/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-6b85f336b67f';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=6b85f336b67f","skeleton-utils.js?v=6b85f336b67f","meshopt-decoder.js?v=6b85f336b67f","models.js?v=6b85f336b67f","people.js?v=6b85f336b67f","villagers.js?v=6b85f336b67f","tex-photos.js?v=6b85f336b67f","textures.js?v=6b85f336b67f","birds.js?v=6b85f336b67f","humans.js?v=6b85f336b67f","folk.js?v=6b85f336b67f","trees.js?v=6b85f336b67f","treehouses.js?v=6b85f336b67f","cabins.js?v=6b85f336b67f","cave.js?v=6b85f336b67f","sounds.js?v=6b85f336b67f","music.js?v=6b85f336b67f","music-orchestra.js?v=6b85f336b67f","rhythm.js?v=6b85f336b67f","pictograms.js?v=6b85f336b67f","chick-wear.js?v=6b85f336b67f","hedgehogs.js?v=6b85f336b67f","opening.js?v=6b85f336b67f","skypiea.js?v=6b85f336b67f","atmo.js?v=6b85f336b67f","weather.js?v=6b85f336b67f","orch-samples.js?v=6b85f336b67f","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
