/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-83cc1c2fc9c0';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=83cc1c2fc9c0","skeleton-utils.js?v=83cc1c2fc9c0","meshopt-decoder.js?v=83cc1c2fc9c0","models.js?v=83cc1c2fc9c0","people.js?v=83cc1c2fc9c0","villagers.js?v=83cc1c2fc9c0","tex-photos.js?v=83cc1c2fc9c0","textures.js?v=83cc1c2fc9c0","birds.js?v=83cc1c2fc9c0","humans.js?v=83cc1c2fc9c0","folk.js?v=83cc1c2fc9c0","trees.js?v=83cc1c2fc9c0","treehouses.js?v=83cc1c2fc9c0","cabins.js?v=83cc1c2fc9c0","cave.js?v=83cc1c2fc9c0","sounds.js?v=83cc1c2fc9c0","music.js?v=83cc1c2fc9c0","music-orchestra.js?v=83cc1c2fc9c0","rhythm.js?v=83cc1c2fc9c0","pictograms.js?v=83cc1c2fc9c0","chick-wear.js?v=83cc1c2fc9c0","hedgehogs.js?v=83cc1c2fc9c0","opening.js?v=83cc1c2fc9c0","skypiea.js?v=83cc1c2fc9c0","atmo.js?v=83cc1c2fc9c0","orch-samples.js?v=83cc1c2fc9c0","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
