/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-18f53460d030';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=18f53460d030","skeleton-utils.js?v=18f53460d030","meshopt-decoder.js?v=18f53460d030","models.js?v=18f53460d030","people.js?v=18f53460d030","villagers.js?v=18f53460d030","tex-photos.js?v=18f53460d030","textures.js?v=18f53460d030","birds.js?v=18f53460d030","humans.js?v=18f53460d030","folk.js?v=18f53460d030","trees.js?v=18f53460d030","treehouses.js?v=18f53460d030","cabins.js?v=18f53460d030","cave.js?v=18f53460d030","sounds.js?v=18f53460d030","music.js?v=18f53460d030","music-orchestra.js?v=18f53460d030","rhythm.js?v=18f53460d030","pictograms.js?v=18f53460d030","chick-wear.js?v=18f53460d030","hedgehogs.js?v=18f53460d030","opening.js?v=18f53460d030","skypiea.js?v=18f53460d030","atmo.js?v=18f53460d030","weather.js?v=18f53460d030","orch-samples.js?v=18f53460d030","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
