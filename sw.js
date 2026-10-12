/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-90e3b364baf1';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=90e3b364baf1","skeleton-utils.js?v=90e3b364baf1","meshopt-decoder.js?v=90e3b364baf1","models.js?v=90e3b364baf1","people.js?v=90e3b364baf1","villagers.js?v=90e3b364baf1","tex-photos.js?v=90e3b364baf1","textures.js?v=90e3b364baf1","birds.js?v=90e3b364baf1","humans.js?v=90e3b364baf1","folk.js?v=90e3b364baf1","trees.js?v=90e3b364baf1","treehouses.js?v=90e3b364baf1","cabins.js?v=90e3b364baf1","cave.js?v=90e3b364baf1","sounds.js?v=90e3b364baf1","music.js?v=90e3b364baf1","music-orchestra.js?v=90e3b364baf1","rhythm.js?v=90e3b364baf1","pictograms.js?v=90e3b364baf1","hedgehogs.js?v=90e3b364baf1","opening.js?v=90e3b364baf1","skypiea.js?v=90e3b364baf1","atmo.js?v=90e3b364baf1","orch-samples.js?v=90e3b364baf1","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
