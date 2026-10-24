/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-7294ad7113c8';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=7294ad7113c8","gltf-loader.js?v=7294ad7113c8","skeleton-utils.js?v=7294ad7113c8","meshopt-decoder.js?v=7294ad7113c8","models.js?v=7294ad7113c8","people.js?v=7294ad7113c8","villagers.js?v=7294ad7113c8","tex-photos.js?v=7294ad7113c8","textures.js?v=7294ad7113c8","birds.js?v=7294ad7113c8","humans.js?v=7294ad7113c8","folk.js?v=7294ad7113c8","trees.js?v=7294ad7113c8","treehouses.js?v=7294ad7113c8","cabins.js?v=7294ad7113c8","cave.js?v=7294ad7113c8","hermits.js?v=7294ad7113c8","sounds.js?v=7294ad7113c8","music.js?v=7294ad7113c8","music-orchestra.js?v=7294ad7113c8","rhythm.js?v=7294ad7113c8","pictograms.js?v=7294ad7113c8","chick-wear.js?v=7294ad7113c8","hedgehogs.js?v=7294ad7113c8","opening.js?v=7294ad7113c8","skypiea.js?v=7294ad7113c8","pirate.js?v=7294ad7113c8","atmo.js?v=7294ad7113c8","boat.js?v=7294ad7113c8","weather.js?v=7294ad7113c8","village-build.js?v=7294ad7113c8","runes.js?v=7294ad7113c8","orchard.js?v=7294ad7113c8","net678.js?v=7294ad7113c8","net678-config.js?v=7294ad7113c8","orch-samples.js?v=7294ad7113c8","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
