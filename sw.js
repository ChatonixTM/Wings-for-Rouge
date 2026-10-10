/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-1ab23f4f8b14';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","textures.js?v=1ab23f4f8b14","birds.js?v=1ab23f4f8b14","humans.js?v=1ab23f4f8b14","folk.js?v=1ab23f4f8b14","trees.js?v=1ab23f4f8b14","treehouses.js?v=1ab23f4f8b14","cabins.js?v=1ab23f4f8b14","cave.js?v=1ab23f4f8b14","sounds.js?v=1ab23f4f8b14","music.js?v=1ab23f4f8b14","rhythm.js?v=1ab23f4f8b14","pictograms.js?v=1ab23f4f8b14","hedgehogs.js?v=1ab23f4f8b14","opening.js?v=1ab23f4f8b14","skypiea.js?v=1ab23f4f8b14","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const page = r.mode === 'navigate';
  e.respondWith(page
    ? fetch(r.url, { cache: 'no-cache' }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); return res; }).catch(() => caches.match('index.html'))
    : caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); } return res; })));
});
