/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-3558dd2d0a42';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=3558dd2d0a42","gltf-loader.js?v=3558dd2d0a42","skeleton-utils.js?v=3558dd2d0a42","meshopt-decoder.js?v=3558dd2d0a42","models.js?v=3558dd2d0a42","people.js?v=3558dd2d0a42","villagers.js?v=3558dd2d0a42","tex-photos.js?v=3558dd2d0a42","textures.js?v=3558dd2d0a42","birds.js?v=3558dd2d0a42","humans.js?v=3558dd2d0a42","folk.js?v=3558dd2d0a42","trees.js?v=3558dd2d0a42","treehouses.js?v=3558dd2d0a42","cabins.js?v=3558dd2d0a42","cave.js?v=3558dd2d0a42","hermits.js?v=3558dd2d0a42","sounds.js?v=3558dd2d0a42","music.js?v=3558dd2d0a42","music-orchestra.js?v=3558dd2d0a42","rhythm.js?v=3558dd2d0a42","pictograms.js?v=3558dd2d0a42","chick-wear.js?v=3558dd2d0a42","hedgehogs.js?v=3558dd2d0a42","opening.js?v=3558dd2d0a42","skypiea.js?v=3558dd2d0a42","pirate.js?v=3558dd2d0a42","atmo.js?v=3558dd2d0a42","boat.js?v=3558dd2d0a42","weather.js?v=3558dd2d0a42","village-build.js?v=3558dd2d0a42","runes.js?v=3558dd2d0a42","orchard.js?v=3558dd2d0a42","net678.js?v=3558dd2d0a42","net678-config.js?v=3558dd2d0a42","orch-samples.js?v=3558dd2d0a42","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
