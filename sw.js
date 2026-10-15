/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-0166e5f8e31e';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=0166e5f8e31e","skeleton-utils.js?v=0166e5f8e31e","meshopt-decoder.js?v=0166e5f8e31e","models.js?v=0166e5f8e31e","people.js?v=0166e5f8e31e","villagers.js?v=0166e5f8e31e","tex-photos.js?v=0166e5f8e31e","textures.js?v=0166e5f8e31e","birds.js?v=0166e5f8e31e","humans.js?v=0166e5f8e31e","folk.js?v=0166e5f8e31e","trees.js?v=0166e5f8e31e","treehouses.js?v=0166e5f8e31e","cabins.js?v=0166e5f8e31e","cave.js?v=0166e5f8e31e","sounds.js?v=0166e5f8e31e","music.js?v=0166e5f8e31e","music-orchestra.js?v=0166e5f8e31e","rhythm.js?v=0166e5f8e31e","pictograms.js?v=0166e5f8e31e","chick-wear.js?v=0166e5f8e31e","hedgehogs.js?v=0166e5f8e31e","opening.js?v=0166e5f8e31e","skypiea.js?v=0166e5f8e31e","atmo.js?v=0166e5f8e31e","orch-samples.js?v=0166e5f8e31e","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
