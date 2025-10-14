const CACHE_NAME='tievie-v3.31g';
const CACHE='tievie-v3.31g-1759900000';
const CORE=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./data/films.json','./data/series.json','./data/herman-film.json','./data/herman-serie.json','./data/aanhetkijken.json','./data/bekeken.json'];
const SYNC_URL='./__mfs_sync__.json';

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)));self.clients.claim();})())});

self.addEventListener('message',async ev=>{
  const msg=ev.data||{};
  if(msg.type==='MFS_SYNC_WRITE'&&msg.payload){
    const blob=new Blob([JSON.stringify(msg.payload)],{type:'application/json'});
    const cache=await caches.open(CACHE);
    const res=new Response(blob,{headers:{'Content-Type':'application/json'}});
    await cache.put(SYNC_URL,res);
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of clients){ try{ c.postMessage({type:'MFS_SYNC_AVAILABLE',ts:Date.now()}); }catch(e){} }
  }
});

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  try{ if(event.request.destination==='image' && url.origin!==location.origin){ return; } }catch(_){}

  if(event.request.method!=='GET')return;
  if(url.pathname.endsWith('__mfs_sync__.json')){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const hit=await cache.match(SYNC_URL);
      if(hit) return hit;
      return new Response(JSON.stringify({items:[],ts:0}),{headers:{'Content-Type':'application/json'}});
    })());
    return;
  }
  if(url.origin===location.origin){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const hit=await cache.match(event.request);
      const net=fetch(event.request).then(res=>{cache.put(event.request,res.clone());return res}).catch(()=>hit);
      return hit||net;
    })());
    return;
  }
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
