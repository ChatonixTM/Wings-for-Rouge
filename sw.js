/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-5253dc37e634';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=5253dc37e634","skeleton-utils.js?v=5253dc37e634","meshopt-decoder.js?v=5253dc37e634","models.js?v=5253dc37e634","people.js?v=5253dc37e634","villagers.js?v=5253dc37e634","tex-photos.js?v=5253dc37e634","textures.js?v=5253dc37e634","birds.js?v=5253dc37e634","humans.js?v=5253dc37e634","folk.js?v=5253dc37e634","trees.js?v=5253dc37e634","treehouses.js?v=5253dc37e634","cabins.js?v=5253dc37e634","cave.js?v=5253dc37e634","sounds.js?v=5253dc37e634","music.js?v=5253dc37e634","music-orchestra.js?v=5253dc37e634","rhythm.js?v=5253dc37e634","pictograms.js?v=5253dc37e634","chick-wear.js?v=5253dc37e634","hedgehogs.js?v=5253dc37e634","opening.js?v=5253dc37e634","skypiea.js?v=5253dc37e634","atmo.js?v=5253dc37e634","weather.js?v=5253dc37e634","runes.js?v=5253dc37e634","orch-samples.js?v=5253dc37e634","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
