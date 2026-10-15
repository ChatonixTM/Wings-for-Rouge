/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-4233bd99f905';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=4233bd99f905","skeleton-utils.js?v=4233bd99f905","meshopt-decoder.js?v=4233bd99f905","models.js?v=4233bd99f905","people.js?v=4233bd99f905","villagers.js?v=4233bd99f905","tex-photos.js?v=4233bd99f905","textures.js?v=4233bd99f905","birds.js?v=4233bd99f905","humans.js?v=4233bd99f905","folk.js?v=4233bd99f905","trees.js?v=4233bd99f905","treehouses.js?v=4233bd99f905","cabins.js?v=4233bd99f905","cave.js?v=4233bd99f905","sounds.js?v=4233bd99f905","music.js?v=4233bd99f905","music-orchestra.js?v=4233bd99f905","rhythm.js?v=4233bd99f905","pictograms.js?v=4233bd99f905","chick-wear.js?v=4233bd99f905","hedgehogs.js?v=4233bd99f905","opening.js?v=4233bd99f905","skypiea.js?v=4233bd99f905","atmo.js?v=4233bd99f905","orch-samples.js?v=4233bd99f905","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
