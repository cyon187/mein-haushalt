// Netzwerk zuerst (immer aktuell), Cache als Offline-Fallback.
const CACHE = 'haushalt-rose-v1';
const FILES = ['./', 'index.html', 'styles.css', 'calc.js', 'app.js', 'strom.js', 'zahlungen.js', 'einkauf.js', 'sparen.js', 'bilanz.js', 'geburtstage.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
