/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-e7ef6a3cd994';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=e7ef6a3cd994","skeleton-utils.js?v=e7ef6a3cd994","meshopt-decoder.js?v=e7ef6a3cd994","models.js?v=e7ef6a3cd994","people.js?v=e7ef6a3cd994","villagers.js?v=e7ef6a3cd994","tex-photos.js?v=e7ef6a3cd994","textures.js?v=e7ef6a3cd994","birds.js?v=e7ef6a3cd994","humans.js?v=e7ef6a3cd994","folk.js?v=e7ef6a3cd994","trees.js?v=e7ef6a3cd994","treehouses.js?v=e7ef6a3cd994","cabins.js?v=e7ef6a3cd994","cave.js?v=e7ef6a3cd994","sounds.js?v=e7ef6a3cd994","music.js?v=e7ef6a3cd994","music-orchestra.js?v=e7ef6a3cd994","rhythm.js?v=e7ef6a3cd994","pictograms.js?v=e7ef6a3cd994","hedgehogs.js?v=e7ef6a3cd994","opening.js?v=e7ef6a3cd994","skypiea.js?v=e7ef6a3cd994","atmo.js?v=e7ef6a3cd994","orch-samples.js?v=e7ef6a3cd994","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
