/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-f8325e89c76f';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=f8325e89c76f","gltf-loader.js?v=f8325e89c76f","skeleton-utils.js?v=f8325e89c76f","meshopt-decoder.js?v=f8325e89c76f","models.js?v=f8325e89c76f","people.js?v=f8325e89c76f","villagers.js?v=f8325e89c76f","tex-photos.js?v=f8325e89c76f","textures.js?v=f8325e89c76f","birds.js?v=f8325e89c76f","humans.js?v=f8325e89c76f","folk.js?v=f8325e89c76f","trees.js?v=f8325e89c76f","treehouses.js?v=f8325e89c76f","cabins.js?v=f8325e89c76f","cave.js?v=f8325e89c76f","hermits.js?v=f8325e89c76f","sounds.js?v=f8325e89c76f","music.js?v=f8325e89c76f","music-orchestra.js?v=f8325e89c76f","rhythm.js?v=f8325e89c76f","pictograms.js?v=f8325e89c76f","chick-wear.js?v=f8325e89c76f","hedgehogs.js?v=f8325e89c76f","opening.js?v=f8325e89c76f","skypiea.js?v=f8325e89c76f","pirate.js?v=f8325e89c76f","atmo.js?v=f8325e89c76f","boat.js?v=f8325e89c76f","weather.js?v=f8325e89c76f","village-build.js?v=f8325e89c76f","runes.js?v=f8325e89c76f","world712-frame.js?v=f8325e89c76f","hawkwake.js?v=f8325e89c76f","hawkfight.js?v=f8325e89c76f","hawkarena.js?v=f8325e89c76f","orchard.js?v=f8325e89c76f","net678.js?v=f8325e89c76f","net678-config.js?v=f8325e89c76f","orch-samples.js?v=f8325e89c76f","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
