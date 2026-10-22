/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-326a22d25ce0';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","gltf-loader.js?v=326a22d25ce0","skeleton-utils.js?v=326a22d25ce0","meshopt-decoder.js?v=326a22d25ce0","models.js?v=326a22d25ce0","people.js?v=326a22d25ce0","villagers.js?v=326a22d25ce0","tex-photos.js?v=326a22d25ce0","textures.js?v=326a22d25ce0","birds.js?v=326a22d25ce0","humans.js?v=326a22d25ce0","folk.js?v=326a22d25ce0","trees.js?v=326a22d25ce0","treehouses.js?v=326a22d25ce0","cabins.js?v=326a22d25ce0","cave.js?v=326a22d25ce0","sounds.js?v=326a22d25ce0","music.js?v=326a22d25ce0","music-orchestra.js?v=326a22d25ce0","rhythm.js?v=326a22d25ce0","pictograms.js?v=326a22d25ce0","chick-wear.js?v=326a22d25ce0","hedgehogs.js?v=326a22d25ce0","opening.js?v=326a22d25ce0","skypiea.js?v=326a22d25ce0","pirate.js?v=326a22d25ce0","atmo.js?v=326a22d25ce0","boat.js?v=326a22d25ce0","weather.js?v=326a22d25ce0","village-build.js?v=326a22d25ce0","runes.js?v=326a22d25ce0","orchard.js?v=326a22d25ce0","net678.js?v=326a22d25ce0","net678-config.js?v=326a22d25ce0","orch-samples.js?v=326a22d25ce0","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
