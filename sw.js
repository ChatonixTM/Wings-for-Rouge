/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-bf677aafe91c';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","textures.js?v=bf677aafe91c","birds.js?v=bf677aafe91c","humans.js?v=bf677aafe91c","folk.js?v=bf677aafe91c","trees.js?v=bf677aafe91c","treehouses.js?v=bf677aafe91c","cabins.js?v=bf677aafe91c","cave.js?v=bf677aafe91c","sounds.js?v=bf677aafe91c","music.js?v=bf677aafe91c","rhythm.js?v=bf677aafe91c","pictograms.js?v=bf677aafe91c","hedgehogs.js?v=bf677aafe91c","opening.js?v=bf677aafe91c","skypiea.js?v=bf677aafe91c","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const page = r.mode === 'navigate';
  e.respondWith(page
    ? fetch(r.url, { cache: 'no-cache' }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); return res; }).catch(() => caches.match('index.html'))
    : caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); } return res; })));
});
