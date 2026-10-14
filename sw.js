/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-64a4db7f6f6c';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=64a4db7f6f6c","skeleton-utils.js?v=64a4db7f6f6c","meshopt-decoder.js?v=64a4db7f6f6c","models.js?v=64a4db7f6f6c","people.js?v=64a4db7f6f6c","villagers.js?v=64a4db7f6f6c","tex-photos.js?v=64a4db7f6f6c","textures.js?v=64a4db7f6f6c","birds.js?v=64a4db7f6f6c","humans.js?v=64a4db7f6f6c","folk.js?v=64a4db7f6f6c","trees.js?v=64a4db7f6f6c","treehouses.js?v=64a4db7f6f6c","cabins.js?v=64a4db7f6f6c","cave.js?v=64a4db7f6f6c","sounds.js?v=64a4db7f6f6c","music.js?v=64a4db7f6f6c","music-orchestra.js?v=64a4db7f6f6c","rhythm.js?v=64a4db7f6f6c","pictograms.js?v=64a4db7f6f6c","chick-wear.js?v=64a4db7f6f6c","hedgehogs.js?v=64a4db7f6f6c","opening.js?v=64a4db7f6f6c","skypiea.js?v=64a4db7f6f6c","atmo.js?v=64a4db7f6f6c","orch-samples.js?v=64a4db7f6f6c","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
