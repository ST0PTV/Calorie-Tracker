/* Service Worker: macht die App offline nutzbar. Speichert nur die App-Dateien,
   keine Nutzerdaten. Bei jeder Änderung an den Dateien CACHE-Version erhöhen. */
const CACHE = 'ct-cache-v75';
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/caffeine.js',
  'js/supplements.js',
  'js/timeline.js',
  'js/alcohol.js',
  'js/weightgoal.js',
  'js/food.js',
  'vendor/zxing.min.js',
  'data/bls.json',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'fonts/sora-latin-300-normal.woff2',
  'fonts/sora-latin-400-normal.woff2',
  'fonts/sora-latin-600-normal.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // z. B. Open Food Facts: direkt ans Netz
  // Erst Netz (für Updates), bei Offline aus dem Cache
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
