/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-e71ff8697063';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=e71ff8697063","skeleton-utils.js?v=e71ff8697063","meshopt-decoder.js?v=e71ff8697063","models.js?v=e71ff8697063","people.js?v=e71ff8697063","villagers.js?v=e71ff8697063","tex-photos.js?v=e71ff8697063","textures.js?v=e71ff8697063","birds.js?v=e71ff8697063","humans.js?v=e71ff8697063","folk.js?v=e71ff8697063","trees.js?v=e71ff8697063","treehouses.js?v=e71ff8697063","cabins.js?v=e71ff8697063","cave.js?v=e71ff8697063","sounds.js?v=e71ff8697063","music.js?v=e71ff8697063","music-orchestra.js?v=e71ff8697063","rhythm.js?v=e71ff8697063","pictograms.js?v=e71ff8697063","chick-wear.js?v=e71ff8697063","hedgehogs.js?v=e71ff8697063","opening.js?v=e71ff8697063","skypiea.js?v=e71ff8697063","atmo.js?v=e71ff8697063","weather.js?v=e71ff8697063","runes.js?v=e71ff8697063","orch-samples.js?v=e71ff8697063","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
