/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-50cf91218bb4';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=50cf91218bb4","skeleton-utils.js?v=50cf91218bb4","meshopt-decoder.js?v=50cf91218bb4","models.js?v=50cf91218bb4","people.js?v=50cf91218bb4","villagers.js?v=50cf91218bb4","tex-photos.js?v=50cf91218bb4","textures.js?v=50cf91218bb4","birds.js?v=50cf91218bb4","humans.js?v=50cf91218bb4","folk.js?v=50cf91218bb4","trees.js?v=50cf91218bb4","treehouses.js?v=50cf91218bb4","cabins.js?v=50cf91218bb4","cave.js?v=50cf91218bb4","sounds.js?v=50cf91218bb4","music.js?v=50cf91218bb4","music-orchestra.js?v=50cf91218bb4","rhythm.js?v=50cf91218bb4","pictograms.js?v=50cf91218bb4","hedgehogs.js?v=50cf91218bb4","opening.js?v=50cf91218bb4","skypiea.js?v=50cf91218bb4","atmo.js?v=50cf91218bb4","orch-samples.js?v=50cf91218bb4","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
