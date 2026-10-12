/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-22cf924c197c';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=22cf924c197c","skeleton-utils.js?v=22cf924c197c","meshopt-decoder.js?v=22cf924c197c","models.js?v=22cf924c197c","people.js?v=22cf924c197c","villagers.js?v=22cf924c197c","tex-photos.js?v=22cf924c197c","textures.js?v=22cf924c197c","birds.js?v=22cf924c197c","humans.js?v=22cf924c197c","folk.js?v=22cf924c197c","trees.js?v=22cf924c197c","treehouses.js?v=22cf924c197c","cabins.js?v=22cf924c197c","cave.js?v=22cf924c197c","sounds.js?v=22cf924c197c","music.js?v=22cf924c197c","music-orchestra.js?v=22cf924c197c","rhythm.js?v=22cf924c197c","pictograms.js?v=22cf924c197c","chick-wear.js?v=22cf924c197c","hedgehogs.js?v=22cf924c197c","opening.js?v=22cf924c197c","skypiea.js?v=22cf924c197c","atmo.js?v=22cf924c197c","orch-samples.js?v=22cf924c197c","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
