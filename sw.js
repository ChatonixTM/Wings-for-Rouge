/* Wings for Rouge - offline worker. The cache name is the build's content hash: a new build replaces the old cache. */
const CACHE = 'wings-4cd6ddeb2fc7';
const SHELL = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","toon.js?v=4cd6ddeb2fc7","gltf-loader.js?v=4cd6ddeb2fc7","skeleton-utils.js?v=4cd6ddeb2fc7","meshopt-decoder.js?v=4cd6ddeb2fc7","models.js?v=4cd6ddeb2fc7","people.js?v=4cd6ddeb2fc7","villagers.js?v=4cd6ddeb2fc7","tex-photos.js?v=4cd6ddeb2fc7","textures.js?v=4cd6ddeb2fc7","birds.js?v=4cd6ddeb2fc7","humans.js?v=4cd6ddeb2fc7","folk.js?v=4cd6ddeb2fc7","trees.js?v=4cd6ddeb2fc7","treehouses.js?v=4cd6ddeb2fc7","cabins.js?v=4cd6ddeb2fc7","cave.js?v=4cd6ddeb2fc7","hermits.js?v=4cd6ddeb2fc7","sounds.js?v=4cd6ddeb2fc7","music.js?v=4cd6ddeb2fc7","music-orchestra.js?v=4cd6ddeb2fc7","rhythm.js?v=4cd6ddeb2fc7","pictograms.js?v=4cd6ddeb2fc7","chick-wear.js?v=4cd6ddeb2fc7","hedgehogs.js?v=4cd6ddeb2fc7","opening.js?v=4cd6ddeb2fc7","skypiea.js?v=4cd6ddeb2fc7","pirate.js?v=4cd6ddeb2fc7","atmo.js?v=4cd6ddeb2fc7","boat.js?v=4cd6ddeb2fc7","weather.js?v=4cd6ddeb2fc7","village-build.js?v=4cd6ddeb2fc7","runes.js?v=4cd6ddeb2fc7","orchard.js?v=4cd6ddeb2fc7","net678.js?v=4cd6ddeb2fc7","net678-config.js?v=4cd6ddeb2fc7","orch-samples.js?v=4cd6ddeb2fc7","https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];
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
