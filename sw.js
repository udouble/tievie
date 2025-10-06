// v3.37-nocache SW
self.addEventListener('install',(e)=>self.skipWaiting());
self.addEventListener('activate',(e)=>{
  e.waitUntil((async()=>{
    try{const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k)));}catch(e){}
    try{await self.registration.unregister();}catch(e){}
    const cs=await self.clients.matchAll({includeUncontrolled:true});
    cs.forEach(c=>{try{c.navigate(c.url);}catch(e){}});
  })());
});
