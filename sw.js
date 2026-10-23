/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-10b086b7218e';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=10b086b7218e","gltf-loader.js?v=10b086b7218e","skeleton-utils.js?v=10b086b7218e","meshopt-decoder.js?v=10b086b7218e","models.js?v=10b086b7218e","people.js?v=10b086b7218e","villagers.js?v=10b086b7218e","tex-photos.js?v=10b086b7218e","textures.js?v=10b086b7218e","birds.js?v=10b086b7218e","humans.js?v=10b086b7218e","folk.js?v=10b086b7218e","trees.js?v=10b086b7218e","treehouses.js?v=10b086b7218e","cabins.js?v=10b086b7218e","cave.js?v=10b086b7218e","hermits.js?v=10b086b7218e","sounds.js?v=10b086b7218e","music.js?v=10b086b7218e","music-orchestra.js?v=10b086b7218e","rhythm.js?v=10b086b7218e","pictograms.js?v=10b086b7218e","chick-wear.js?v=10b086b7218e","hedgehogs.js?v=10b086b7218e","opening.js?v=10b086b7218e","skypiea.js?v=10b086b7218e","pirate.js?v=10b086b7218e","atmo.js?v=10b086b7218e","boat.js?v=10b086b7218e","weather.js?v=10b086b7218e","village-build.js?v=10b086b7218e","runes.js?v=10b086b7218e","orchard.js?v=10b086b7218e","net678.js?v=10b086b7218e","net678-config.js?v=10b086b7218e","orch-samples.js?v=10b086b7218e","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
