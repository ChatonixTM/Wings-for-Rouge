/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-32c77372fb7b';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","tex-photos.js?v=32c77372fb7b","textures.js?v=32c77372fb7b","birds.js?v=32c77372fb7b","humans.js?v=32c77372fb7b","folk.js?v=32c77372fb7b","trees.js?v=32c77372fb7b","treehouses.js?v=32c77372fb7b","cabins.js?v=32c77372fb7b","cave.js?v=32c77372fb7b","sounds.js?v=32c77372fb7b","music.js?v=32c77372fb7b","music-orchestra.js?v=32c77372fb7b","rhythm.js?v=32c77372fb7b","pictograms.js?v=32c77372fb7b","hedgehogs.js?v=32c77372fb7b","opening.js?v=32c77372fb7b","skypiea.js?v=32c77372fb7b","atmo.js?v=32c77372fb7b","orch-samples.js?v=32c77372fb7b","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
