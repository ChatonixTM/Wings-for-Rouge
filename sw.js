/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-a3df8a8a9113';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","tex-photos.js?v=a3df8a8a9113","textures.js?v=a3df8a8a9113","birds.js?v=a3df8a8a9113","humans.js?v=a3df8a8a9113","folk.js?v=a3df8a8a9113","trees.js?v=a3df8a8a9113","treehouses.js?v=a3df8a8a9113","cabins.js?v=a3df8a8a9113","cave.js?v=a3df8a8a9113","sounds.js?v=a3df8a8a9113","music.js?v=a3df8a8a9113","rhythm.js?v=a3df8a8a9113","pictograms.js?v=a3df8a8a9113","hedgehogs.js?v=a3df8a8a9113","opening.js?v=a3df8a8a9113","skypiea.js?v=a3df8a8a9113","atmo.js?v=a3df8a8a9113","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
