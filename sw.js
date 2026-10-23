/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-4846577773ce';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=4846577773ce","gltf-loader.js?v=4846577773ce","skeleton-utils.js?v=4846577773ce","meshopt-decoder.js?v=4846577773ce","models.js?v=4846577773ce","people.js?v=4846577773ce","villagers.js?v=4846577773ce","tex-photos.js?v=4846577773ce","textures.js?v=4846577773ce","birds.js?v=4846577773ce","humans.js?v=4846577773ce","folk.js?v=4846577773ce","trees.js?v=4846577773ce","treehouses.js?v=4846577773ce","cabins.js?v=4846577773ce","cave.js?v=4846577773ce","hermits.js?v=4846577773ce","sounds.js?v=4846577773ce","music.js?v=4846577773ce","music-orchestra.js?v=4846577773ce","rhythm.js?v=4846577773ce","pictograms.js?v=4846577773ce","chick-wear.js?v=4846577773ce","hedgehogs.js?v=4846577773ce","opening.js?v=4846577773ce","skypiea.js?v=4846577773ce","pirate.js?v=4846577773ce","atmo.js?v=4846577773ce","boat.js?v=4846577773ce","weather.js?v=4846577773ce","village-build.js?v=4846577773ce","runes.js?v=4846577773ce","orchard.js?v=4846577773ce","net678.js?v=4846577773ce","net678-config.js?v=4846577773ce","orch-samples.js?v=4846577773ce","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
