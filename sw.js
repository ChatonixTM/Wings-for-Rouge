/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-77e39aba19db';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=77e39aba19db","skeleton-utils.js?v=77e39aba19db","meshopt-decoder.js?v=77e39aba19db","models.js?v=77e39aba19db","people.js?v=77e39aba19db","villagers.js?v=77e39aba19db","tex-photos.js?v=77e39aba19db","textures.js?v=77e39aba19db","birds.js?v=77e39aba19db","humans.js?v=77e39aba19db","folk.js?v=77e39aba19db","trees.js?v=77e39aba19db","treehouses.js?v=77e39aba19db","cabins.js?v=77e39aba19db","cave.js?v=77e39aba19db","sounds.js?v=77e39aba19db","music.js?v=77e39aba19db","music-orchestra.js?v=77e39aba19db","rhythm.js?v=77e39aba19db","pictograms.js?v=77e39aba19db","chick-wear.js?v=77e39aba19db","hedgehogs.js?v=77e39aba19db","opening.js?v=77e39aba19db","skypiea.js?v=77e39aba19db","atmo.js?v=77e39aba19db","orch-samples.js?v=77e39aba19db","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
