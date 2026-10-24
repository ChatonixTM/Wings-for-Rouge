/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-529949f8d266';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=529949f8d266","gltf-loader.js?v=529949f8d266","skeleton-utils.js?v=529949f8d266","meshopt-decoder.js?v=529949f8d266","models.js?v=529949f8d266","people.js?v=529949f8d266","villagers.js?v=529949f8d266","tex-photos.js?v=529949f8d266","textures.js?v=529949f8d266","birds.js?v=529949f8d266","humans.js?v=529949f8d266","folk.js?v=529949f8d266","trees.js?v=529949f8d266","treehouses.js?v=529949f8d266","cabins.js?v=529949f8d266","cave.js?v=529949f8d266","hermits.js?v=529949f8d266","sounds.js?v=529949f8d266","music.js?v=529949f8d266","music-orchestra.js?v=529949f8d266","rhythm.js?v=529949f8d266","pictograms.js?v=529949f8d266","chick-wear.js?v=529949f8d266","hedgehogs.js?v=529949f8d266","opening.js?v=529949f8d266","skypiea.js?v=529949f8d266","pirate.js?v=529949f8d266","atmo.js?v=529949f8d266","boat.js?v=529949f8d266","weather.js?v=529949f8d266","village-build.js?v=529949f8d266","runes.js?v=529949f8d266","orchard.js?v=529949f8d266","net678.js?v=529949f8d266","net678-config.js?v=529949f8d266","orch-samples.js?v=529949f8d266","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
