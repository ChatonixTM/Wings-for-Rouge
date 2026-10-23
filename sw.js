/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-1a2732054bcd';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=1a2732054bcd","gltf-loader.js?v=1a2732054bcd","skeleton-utils.js?v=1a2732054bcd","meshopt-decoder.js?v=1a2732054bcd","models.js?v=1a2732054bcd","people.js?v=1a2732054bcd","villagers.js?v=1a2732054bcd","tex-photos.js?v=1a2732054bcd","textures.js?v=1a2732054bcd","birds.js?v=1a2732054bcd","humans.js?v=1a2732054bcd","folk.js?v=1a2732054bcd","trees.js?v=1a2732054bcd","treehouses.js?v=1a2732054bcd","cabins.js?v=1a2732054bcd","cave.js?v=1a2732054bcd","hermits.js?v=1a2732054bcd","sounds.js?v=1a2732054bcd","music.js?v=1a2732054bcd","music-orchestra.js?v=1a2732054bcd","rhythm.js?v=1a2732054bcd","pictograms.js?v=1a2732054bcd","chick-wear.js?v=1a2732054bcd","hedgehogs.js?v=1a2732054bcd","opening.js?v=1a2732054bcd","skypiea.js?v=1a2732054bcd","pirate.js?v=1a2732054bcd","atmo.js?v=1a2732054bcd","boat.js?v=1a2732054bcd","weather.js?v=1a2732054bcd","village-build.js?v=1a2732054bcd","runes.js?v=1a2732054bcd","orchard.js?v=1a2732054bcd","net678.js?v=1a2732054bcd","net678-config.js?v=1a2732054bcd","orch-samples.js?v=1a2732054bcd","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
