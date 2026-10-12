/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-f1632b3b9d81';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=f1632b3b9d81","skeleton-utils.js?v=f1632b3b9d81","meshopt-decoder.js?v=f1632b3b9d81","models.js?v=f1632b3b9d81","people.js?v=f1632b3b9d81","villagers.js?v=f1632b3b9d81","tex-photos.js?v=f1632b3b9d81","textures.js?v=f1632b3b9d81","birds.js?v=f1632b3b9d81","humans.js?v=f1632b3b9d81","folk.js?v=f1632b3b9d81","trees.js?v=f1632b3b9d81","treehouses.js?v=f1632b3b9d81","cabins.js?v=f1632b3b9d81","cave.js?v=f1632b3b9d81","sounds.js?v=f1632b3b9d81","music.js?v=f1632b3b9d81","music-orchestra.js?v=f1632b3b9d81","rhythm.js?v=f1632b3b9d81","pictograms.js?v=f1632b3b9d81","hedgehogs.js?v=f1632b3b9d81","opening.js?v=f1632b3b9d81","skypiea.js?v=f1632b3b9d81","atmo.js?v=f1632b3b9d81","orch-samples.js?v=f1632b3b9d81","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
