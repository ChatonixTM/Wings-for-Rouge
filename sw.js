/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-b4de9b6918a6';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=b4de9b6918a6","gltf-loader.js?v=b4de9b6918a6","skeleton-utils.js?v=b4de9b6918a6","meshopt-decoder.js?v=b4de9b6918a6","models.js?v=b4de9b6918a6","people.js?v=b4de9b6918a6","villagers.js?v=b4de9b6918a6","tex-photos.js?v=b4de9b6918a6","textures.js?v=b4de9b6918a6","birds.js?v=b4de9b6918a6","humans.js?v=b4de9b6918a6","folk.js?v=b4de9b6918a6","trees.js?v=b4de9b6918a6","treehouses.js?v=b4de9b6918a6","cabins.js?v=b4de9b6918a6","cave.js?v=b4de9b6918a6","hermits.js?v=b4de9b6918a6","sounds.js?v=b4de9b6918a6","music.js?v=b4de9b6918a6","music-orchestra.js?v=b4de9b6918a6","rhythm.js?v=b4de9b6918a6","pictograms.js?v=b4de9b6918a6","chick-wear.js?v=b4de9b6918a6","hedgehogs.js?v=b4de9b6918a6","opening.js?v=b4de9b6918a6","skypiea.js?v=b4de9b6918a6","pirate.js?v=b4de9b6918a6","atmo.js?v=b4de9b6918a6","boat.js?v=b4de9b6918a6","weather.js?v=b4de9b6918a6","village-build.js?v=b4de9b6918a6","runes.js?v=b4de9b6918a6","orchard.js?v=b4de9b6918a6","net678.js?v=b4de9b6918a6","net678-config.js?v=b4de9b6918a6","orch-samples.js?v=b4de9b6918a6","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
