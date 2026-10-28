/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-0a3d1546b5a9';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=0a3d1546b5a9","gltf-loader.js?v=0a3d1546b5a9","skeleton-utils.js?v=0a3d1546b5a9","meshopt-decoder.js?v=0a3d1546b5a9","models.js?v=0a3d1546b5a9","people.js?v=0a3d1546b5a9","villagers.js?v=0a3d1546b5a9","tex-photos.js?v=0a3d1546b5a9","textures.js?v=0a3d1546b5a9","birds.js?v=0a3d1546b5a9","humans.js?v=0a3d1546b5a9","folk.js?v=0a3d1546b5a9","trees.js?v=0a3d1546b5a9","treehouses.js?v=0a3d1546b5a9","cabins.js?v=0a3d1546b5a9","cave.js?v=0a3d1546b5a9","hermits.js?v=0a3d1546b5a9","sounds.js?v=0a3d1546b5a9","music.js?v=0a3d1546b5a9","music-orchestra.js?v=0a3d1546b5a9","rhythm.js?v=0a3d1546b5a9","pictograms.js?v=0a3d1546b5a9","chick-wear.js?v=0a3d1546b5a9","hedgehogs.js?v=0a3d1546b5a9","opening.js?v=0a3d1546b5a9","skypiea.js?v=0a3d1546b5a9","pirate.js?v=0a3d1546b5a9","atmo.js?v=0a3d1546b5a9","boat.js?v=0a3d1546b5a9","weather.js?v=0a3d1546b5a9","village-build.js?v=0a3d1546b5a9","runes.js?v=0a3d1546b5a9","hawkwake.js?v=0a3d1546b5a9","hawkfight.js?v=0a3d1546b5a9","hawkarena.js?v=0a3d1546b5a9","orchard.js?v=0a3d1546b5a9","net678.js?v=0a3d1546b5a9","net678-config.js?v=0a3d1546b5a9","orch-samples.js?v=0a3d1546b5a9","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
