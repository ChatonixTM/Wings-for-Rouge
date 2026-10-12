/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-d0c0664df6f2';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=d0c0664df6f2","skeleton-utils.js?v=d0c0664df6f2","meshopt-decoder.js?v=d0c0664df6f2","models.js?v=d0c0664df6f2","people.js?v=d0c0664df6f2","villagers.js?v=d0c0664df6f2","tex-photos.js?v=d0c0664df6f2","textures.js?v=d0c0664df6f2","birds.js?v=d0c0664df6f2","humans.js?v=d0c0664df6f2","folk.js?v=d0c0664df6f2","trees.js?v=d0c0664df6f2","treehouses.js?v=d0c0664df6f2","cabins.js?v=d0c0664df6f2","cave.js?v=d0c0664df6f2","sounds.js?v=d0c0664df6f2","music.js?v=d0c0664df6f2","music-orchestra.js?v=d0c0664df6f2","rhythm.js?v=d0c0664df6f2","pictograms.js?v=d0c0664df6f2","chick-wear.js?v=d0c0664df6f2","hedgehogs.js?v=d0c0664df6f2","opening.js?v=d0c0664df6f2","skypiea.js?v=d0c0664df6f2","atmo.js?v=d0c0664df6f2","orch-samples.js?v=d0c0664df6f2","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
