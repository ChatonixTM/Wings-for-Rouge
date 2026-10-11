/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-c8417874b8f3';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=c8417874b8f3","skeleton-utils.js?v=c8417874b8f3","meshopt-decoder.js?v=c8417874b8f3","models.js?v=c8417874b8f3","people.js?v=c8417874b8f3","villagers.js?v=c8417874b8f3","tex-photos.js?v=c8417874b8f3","textures.js?v=c8417874b8f3","birds.js?v=c8417874b8f3","humans.js?v=c8417874b8f3","folk.js?v=c8417874b8f3","trees.js?v=c8417874b8f3","treehouses.js?v=c8417874b8f3","cabins.js?v=c8417874b8f3","cave.js?v=c8417874b8f3","sounds.js?v=c8417874b8f3","music.js?v=c8417874b8f3","music-orchestra.js?v=c8417874b8f3","rhythm.js?v=c8417874b8f3","pictograms.js?v=c8417874b8f3","hedgehogs.js?v=c8417874b8f3","opening.js?v=c8417874b8f3","skypiea.js?v=c8417874b8f3","atmo.js?v=c8417874b8f3","orch-samples.js?v=c8417874b8f3","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
