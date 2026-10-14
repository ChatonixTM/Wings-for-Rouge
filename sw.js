/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-ae4fd6bae8c4';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=ae4fd6bae8c4","skeleton-utils.js?v=ae4fd6bae8c4","meshopt-decoder.js?v=ae4fd6bae8c4","models.js?v=ae4fd6bae8c4","people.js?v=ae4fd6bae8c4","villagers.js?v=ae4fd6bae8c4","tex-photos.js?v=ae4fd6bae8c4","textures.js?v=ae4fd6bae8c4","birds.js?v=ae4fd6bae8c4","humans.js?v=ae4fd6bae8c4","folk.js?v=ae4fd6bae8c4","trees.js?v=ae4fd6bae8c4","treehouses.js?v=ae4fd6bae8c4","cabins.js?v=ae4fd6bae8c4","cave.js?v=ae4fd6bae8c4","sounds.js?v=ae4fd6bae8c4","music.js?v=ae4fd6bae8c4","music-orchestra.js?v=ae4fd6bae8c4","rhythm.js?v=ae4fd6bae8c4","pictograms.js?v=ae4fd6bae8c4","chick-wear.js?v=ae4fd6bae8c4","hedgehogs.js?v=ae4fd6bae8c4","opening.js?v=ae4fd6bae8c4","skypiea.js?v=ae4fd6bae8c4","atmo.js?v=ae4fd6bae8c4","orch-samples.js?v=ae4fd6bae8c4","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
