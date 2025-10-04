
// Service Worker — MFS v3.25 sync sharedata
const CACHE = 'tievie-v3.25-sync-2025-10-04';
const CORE = ['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
const SYNC_URL = '/__mfs_sync__.json'; // virtueel endpoint
const SYNC_CACHE_KEY = 'mfs-sync-latest';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    self.clients.claim();
  })());
});

// Ontvang dataset-updates van de pagina's (PWA of Safari)
self.addEventListener('message', async (ev)=>{
  const msg = ev.data || {};
  if(msg.type === 'MFS_SYNC_WRITE' && msg.payload){
    const payload = msg.payload;
    const blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
    const cache = await caches.open(CACHE);
    const res = new Response(blob, {headers:{'Content-Type':'application/json'}});
    await cache.put(SYNC_URL, res);
    // Ping alle clients om desgewenst te pullen
    const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    for(const c of clients){
      try{ c.postMessage({type:'MFS_SYNC_AVAILABLE', ts: Date.now()}); }catch(e){}
    }
  }else if(msg.type === 'MFS_SYNC_PING'){
    // antwoord niet nodig; pagina zal zelf pullen via fetch
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if(event.request.method!=='GET') return;

  // Virtueel sync-endpoint
  if(url.pathname===SYNC_URL){
    event.respondWith((async()=>{
      const cache = await caches.open(CACHE);
      const hit = await cache.match(SYNC_URL);
      if(hit) return hit;
      return new Response(JSON.stringify({items:[], ts:0}), {headers:{'Content-Type':'application/json'}});
    })());
    return;
  }

  // App shell: stale-while-revalidate
  if(url.origin===location.origin){
    event.respondWith((async()=>{
      const cache = await caches.open(CACHE);
      const hit = await cache.match(event.request);
      const net = fetch(event.request).then(res=>{
        cache.put(event.request, res.clone());
        return res;
      }).catch(()=>hit);
      return hit || net;
    })());
    return;
  }

  // Default network falling back to cache
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
