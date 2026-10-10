/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-9e6e378119ad';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","textures.js?v=9e6e378119ad","birds.js?v=9e6e378119ad","humans.js?v=9e6e378119ad","folk.js?v=9e6e378119ad","trees.js?v=9e6e378119ad","treehouses.js?v=9e6e378119ad","cabins.js?v=9e6e378119ad","cave.js?v=9e6e378119ad","sounds.js?v=9e6e378119ad","music.js?v=9e6e378119ad","rhythm.js?v=9e6e378119ad","pictograms.js?v=9e6e378119ad","hedgehogs.js?v=9e6e378119ad","opening.js?v=9e6e378119ad","skypiea.js?v=9e6e378119ad","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const page = r.mode === 'navigate';
  e.respondWith(page
    ? fetch(r.url, { cache: 'no-cache' }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); return res; }).catch(() => caches.match('index.html'))
    : caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); } return res; })));
});
