// tievie Service Worker — v3.24d
const CACHE = 'tievie-v3.24d-2025-10-04';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept file input / blob / POST
  if (req.method !== 'GET') return;

  // App shell: serve cached index for navigations (offline-ready SPA)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(hit => hit || fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', clone));
        return res;
      }))
    );
    return;
  }

  // Same-origin: stale-while-revalidate
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
          return res;
        }).catch(() => hit || caches.match('./index.html'));
        return hit || net;
      })
    );
    return;
  }

  // External (OMDb, wsrv): network with cache fallback
  if (/omdbapi\.com|wsrv\.nl/.test(url.hostname)) {
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return res;
      }).catch(() => caches.match(req))
    );
  }
});