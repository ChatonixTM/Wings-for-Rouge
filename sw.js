/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-0ae7cbe867ff';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=0ae7cbe867ff","skeleton-utils.js?v=0ae7cbe867ff","meshopt-decoder.js?v=0ae7cbe867ff","models.js?v=0ae7cbe867ff","people.js?v=0ae7cbe867ff","villagers.js?v=0ae7cbe867ff","tex-photos.js?v=0ae7cbe867ff","textures.js?v=0ae7cbe867ff","birds.js?v=0ae7cbe867ff","humans.js?v=0ae7cbe867ff","folk.js?v=0ae7cbe867ff","trees.js?v=0ae7cbe867ff","treehouses.js?v=0ae7cbe867ff","cabins.js?v=0ae7cbe867ff","cave.js?v=0ae7cbe867ff","sounds.js?v=0ae7cbe867ff","music.js?v=0ae7cbe867ff","music-orchestra.js?v=0ae7cbe867ff","rhythm.js?v=0ae7cbe867ff","pictograms.js?v=0ae7cbe867ff","chick-wear.js?v=0ae7cbe867ff","hedgehogs.js?v=0ae7cbe867ff","opening.js?v=0ae7cbe867ff","skypiea.js?v=0ae7cbe867ff","atmo.js?v=0ae7cbe867ff","orch-samples.js?v=0ae7cbe867ff","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
