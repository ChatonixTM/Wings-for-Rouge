/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-f80e3df14951';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=f80e3df14951","skeleton-utils.js?v=f80e3df14951","meshopt-decoder.js?v=f80e3df14951","models.js?v=f80e3df14951","people.js?v=f80e3df14951","villagers.js?v=f80e3df14951","tex-photos.js?v=f80e3df14951","textures.js?v=f80e3df14951","birds.js?v=f80e3df14951","humans.js?v=f80e3df14951","folk.js?v=f80e3df14951","trees.js?v=f80e3df14951","treehouses.js?v=f80e3df14951","cabins.js?v=f80e3df14951","cave.js?v=f80e3df14951","sounds.js?v=f80e3df14951","music.js?v=f80e3df14951","music-orchestra.js?v=f80e3df14951","rhythm.js?v=f80e3df14951","pictograms.js?v=f80e3df14951","chick-wear.js?v=f80e3df14951","hedgehogs.js?v=f80e3df14951","opening.js?v=f80e3df14951","skypiea.js?v=f80e3df14951","atmo.js?v=f80e3df14951","orch-samples.js?v=f80e3df14951","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
