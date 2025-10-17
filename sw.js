/* Service Worker uitgeschakeld. Browser zal nu altijd de laatste versie van de server ophalen. */
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    caches.keys().then(keyList => {
        return Promise.all(keyList.map(key => caches.delete(key)));
    }).then(() => self.clients.claim());
});

self.addEventListener('fetch', event => {
    // Voorkom caching/interception. Laat browser de netwerkverzoeken direct doen.
    return;
});
