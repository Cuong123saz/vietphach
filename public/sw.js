const CACHE='vietphach-offline-v3';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('vietphach-offline-') && key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET' || new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(event.request.mode!=='navigate'){
      const local=await cache.match(event.request);if(local)return local;
    }
    try{
      const response=await fetch(event.request);
      if(response.ok && response.status===200)await cache.put(event.request,response.clone());
      return response;
    }catch(error){
      const saved=await cache.match(event.request);
      if(saved)return saved;
      if(event.request.mode==='navigate'){
        const page=await cache.match('/');if(page)return page;
      }
      throw error;
    }
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type!=='DOWNLOAD')return;
  const port=event.ports[0];
  event.waitUntil((async()=>{
    try{
      const response=await fetch('/offline-files.json',{cache:'no-store'});
      if(!response.ok)throw new Error('Không lấy được danh sách tài nguyên.');
      const files=await response.json(),cache=await caches.open(CACHE);
      port.postMessage({progress:0,completed:0,total:files.length});
      for(let i=0;i<files.length;i++){
        const file=files[i],controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
        let result;
        try{result=await fetch(file,{signal:controller.signal});}finally{clearTimeout(timeout);}
        if(!result.ok)throw new Error('Không tải được '+file);
        await cache.put(file,result);port.postMessage({progress:Math.round((i+1)/files.length*100),completed:i+1,total:files.length});
      }
      port.postMessage({done:true});
    }catch(error){port.postMessage({error:String(error)});}
  })());
});
