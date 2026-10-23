/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-83815b22b962';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=83815b22b962","gltf-loader.js?v=83815b22b962","skeleton-utils.js?v=83815b22b962","meshopt-decoder.js?v=83815b22b962","models.js?v=83815b22b962","people.js?v=83815b22b962","villagers.js?v=83815b22b962","tex-photos.js?v=83815b22b962","textures.js?v=83815b22b962","birds.js?v=83815b22b962","humans.js?v=83815b22b962","folk.js?v=83815b22b962","trees.js?v=83815b22b962","treehouses.js?v=83815b22b962","cabins.js?v=83815b22b962","cave.js?v=83815b22b962","hermits.js?v=83815b22b962","sounds.js?v=83815b22b962","music.js?v=83815b22b962","music-orchestra.js?v=83815b22b962","rhythm.js?v=83815b22b962","pictograms.js?v=83815b22b962","chick-wear.js?v=83815b22b962","hedgehogs.js?v=83815b22b962","opening.js?v=83815b22b962","skypiea.js?v=83815b22b962","pirate.js?v=83815b22b962","atmo.js?v=83815b22b962","boat.js?v=83815b22b962","weather.js?v=83815b22b962","village-build.js?v=83815b22b962","runes.js?v=83815b22b962","orchard.js?v=83815b22b962","net678.js?v=83815b22b962","net678-config.js?v=83815b22b962","orch-samples.js?v=83815b22b962","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
