const CACHE_NAME='mfs-v5';
const CORE=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))) , self.clients.claim()]))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.mode==='navigate'){e.respondWith(fetch(r).then(resp=>{const cp=resp.clone();caches.open(CACHE_NAME).then(c=>c.put(r,cp));return resp;}).catch(()=>caches.match('./index.html')));return;}
e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(resp=>{const cp=resp.clone();caches.open(CACHE_NAME).then(c=>c.put(r,cp));return resp;})))});
