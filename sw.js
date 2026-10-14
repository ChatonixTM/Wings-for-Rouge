/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-50b4cee8eecb';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=50b4cee8eecb","skeleton-utils.js?v=50b4cee8eecb","meshopt-decoder.js?v=50b4cee8eecb","models.js?v=50b4cee8eecb","people.js?v=50b4cee8eecb","villagers.js?v=50b4cee8eecb","tex-photos.js?v=50b4cee8eecb","textures.js?v=50b4cee8eecb","birds.js?v=50b4cee8eecb","humans.js?v=50b4cee8eecb","folk.js?v=50b4cee8eecb","trees.js?v=50b4cee8eecb","treehouses.js?v=50b4cee8eecb","cabins.js?v=50b4cee8eecb","cave.js?v=50b4cee8eecb","sounds.js?v=50b4cee8eecb","music.js?v=50b4cee8eecb","music-orchestra.js?v=50b4cee8eecb","rhythm.js?v=50b4cee8eecb","pictograms.js?v=50b4cee8eecb","chick-wear.js?v=50b4cee8eecb","hedgehogs.js?v=50b4cee8eecb","opening.js?v=50b4cee8eecb","skypiea.js?v=50b4cee8eecb","atmo.js?v=50b4cee8eecb","orch-samples.js?v=50b4cee8eecb","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
