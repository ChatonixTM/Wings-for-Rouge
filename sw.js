/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-9af482651f10';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=9af482651f10","gltf-loader.js?v=9af482651f10","skeleton-utils.js?v=9af482651f10","meshopt-decoder.js?v=9af482651f10","models.js?v=9af482651f10","people.js?v=9af482651f10","villagers.js?v=9af482651f10","tex-photos.js?v=9af482651f10","textures.js?v=9af482651f10","birds.js?v=9af482651f10","humans.js?v=9af482651f10","folk.js?v=9af482651f10","trees.js?v=9af482651f10","treehouses.js?v=9af482651f10","cabins.js?v=9af482651f10","cave.js?v=9af482651f10","hermits.js?v=9af482651f10","sounds.js?v=9af482651f10","music.js?v=9af482651f10","music-orchestra.js?v=9af482651f10","rhythm.js?v=9af482651f10","pictograms.js?v=9af482651f10","chick-wear.js?v=9af482651f10","hedgehogs.js?v=9af482651f10","opening.js?v=9af482651f10","skypiea.js?v=9af482651f10","pirate.js?v=9af482651f10","atmo.js?v=9af482651f10","boat.js?v=9af482651f10","weather.js?v=9af482651f10","village-build.js?v=9af482651f10","runes.js?v=9af482651f10","orchard.js?v=9af482651f10","net678.js?v=9af482651f10","net678-config.js?v=9af482651f10","orch-samples.js?v=9af482651f10","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
