/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-a2dd0ec234b4';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=a2dd0ec234b4","skeleton-utils.js?v=a2dd0ec234b4","meshopt-decoder.js?v=a2dd0ec234b4","models.js?v=a2dd0ec234b4","people.js?v=a2dd0ec234b4","villagers.js?v=a2dd0ec234b4","tex-photos.js?v=a2dd0ec234b4","textures.js?v=a2dd0ec234b4","birds.js?v=a2dd0ec234b4","humans.js?v=a2dd0ec234b4","folk.js?v=a2dd0ec234b4","trees.js?v=a2dd0ec234b4","treehouses.js?v=a2dd0ec234b4","cabins.js?v=a2dd0ec234b4","cave.js?v=a2dd0ec234b4","sounds.js?v=a2dd0ec234b4","music.js?v=a2dd0ec234b4","music-orchestra.js?v=a2dd0ec234b4","rhythm.js?v=a2dd0ec234b4","pictograms.js?v=a2dd0ec234b4","chick-wear.js?v=a2dd0ec234b4","hedgehogs.js?v=a2dd0ec234b4","opening.js?v=a2dd0ec234b4","skypiea.js?v=a2dd0ec234b4","atmo.js?v=a2dd0ec234b4","orch-samples.js?v=a2dd0ec234b4","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
