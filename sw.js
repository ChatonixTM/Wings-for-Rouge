/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-480faf0ed656';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","tex-photos.js?v=480faf0ed656","textures.js?v=480faf0ed656","birds.js?v=480faf0ed656","humans.js?v=480faf0ed656","folk.js?v=480faf0ed656","trees.js?v=480faf0ed656","treehouses.js?v=480faf0ed656","cabins.js?v=480faf0ed656","cave.js?v=480faf0ed656","sounds.js?v=480faf0ed656","music.js?v=480faf0ed656","rhythm.js?v=480faf0ed656","pictograms.js?v=480faf0ed656","hedgehogs.js?v=480faf0ed656","opening.js?v=480faf0ed656","skypiea.js?v=480faf0ed656","atmo.js?v=480faf0ed656","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
