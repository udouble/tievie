// tievie Service Worker — offline caching for GitHub Pages submap
const CACHE_NAME = 'tievie-cache-v1-2025-10-04';
const BASE = self.registration.scope; // e.g., https://udouble.github.io/tievie/

const CORE = [
  '', 'index.html', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png'
].map(p => new URL(p, BASE).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const baseURL = new URL(BASE);

  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(new URL('index.html', BASE).toString()).then(cached => cached || fetch(req))
    );
    return;
  }

  if (url.origin === baseURL.origin && url.href.startsWith(BASE)) {
    event.respondWith(
      caches.match(req).then(hit => {
        if (hit) return hit;
        return fetch(req).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return resp;
        }).catch(() => caches.match(new URL('index.html', BASE).toString()));
      })
    );
    return;
  }

  if (/wsrv\.nl|omdbapi\.com/.test(url.host)) {
    event.respondWith(
      fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return resp;
      }).catch(() => caches.match(req))
    );
  }
});