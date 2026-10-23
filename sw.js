/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-eb4d88c428f9';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=eb4d88c428f9","gltf-loader.js?v=eb4d88c428f9","skeleton-utils.js?v=eb4d88c428f9","meshopt-decoder.js?v=eb4d88c428f9","models.js?v=eb4d88c428f9","people.js?v=eb4d88c428f9","villagers.js?v=eb4d88c428f9","tex-photos.js?v=eb4d88c428f9","textures.js?v=eb4d88c428f9","birds.js?v=eb4d88c428f9","humans.js?v=eb4d88c428f9","folk.js?v=eb4d88c428f9","trees.js?v=eb4d88c428f9","treehouses.js?v=eb4d88c428f9","cabins.js?v=eb4d88c428f9","cave.js?v=eb4d88c428f9","hermits.js?v=eb4d88c428f9","sounds.js?v=eb4d88c428f9","music.js?v=eb4d88c428f9","music-orchestra.js?v=eb4d88c428f9","rhythm.js?v=eb4d88c428f9","pictograms.js?v=eb4d88c428f9","chick-wear.js?v=eb4d88c428f9","hedgehogs.js?v=eb4d88c428f9","opening.js?v=eb4d88c428f9","skypiea.js?v=eb4d88c428f9","pirate.js?v=eb4d88c428f9","atmo.js?v=eb4d88c428f9","boat.js?v=eb4d88c428f9","weather.js?v=eb4d88c428f9","village-build.js?v=eb4d88c428f9","runes.js?v=eb4d88c428f9","orchard.js?v=eb4d88c428f9","net678.js?v=eb4d88c428f9","net678-config.js?v=eb4d88c428f9","orch-samples.js?v=eb4d88c428f9","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
