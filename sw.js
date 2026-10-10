/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-755ac0e8b3ba';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","textures.js?v=755ac0e8b3ba","birds.js?v=755ac0e8b3ba","humans.js?v=755ac0e8b3ba","folk.js?v=755ac0e8b3ba","trees.js?v=755ac0e8b3ba","treehouses.js?v=755ac0e8b3ba","cabins.js?v=755ac0e8b3ba","cave.js?v=755ac0e8b3ba","sounds.js?v=755ac0e8b3ba","music.js?v=755ac0e8b3ba","rhythm.js?v=755ac0e8b3ba","pictograms.js?v=755ac0e8b3ba","hedgehogs.js?v=755ac0e8b3ba","opening.js?v=755ac0e8b3ba","skypiea.js?v=755ac0e8b3ba","atmo.js?v=755ac0e8b3ba","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const page = r.mode === 'navigate';
  e.respondWith(page
    ? fetch(r.url, { cache: 'no-cache' }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); return res; }).catch(() => caches.match('index.html'))
    : caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); } return res; })));
});
