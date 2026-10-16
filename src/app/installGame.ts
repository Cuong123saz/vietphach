interface InstallPrompt extends Event {prompt():Promise<void>;userChoice:Promise<{outcome:string}>}
export function mountGameInstall(parent:HTMLElement){
  if(!('serviceWorker' in navigator))return;
  // Inside the Android app (Capacitor) the game is already installed and offline: no install UI or service worker.
  if((window as {Capacitor?:{isNativePlatform?():boolean}}).Capacitor?.isNativePlatform?.())return;
  const box=document.createElement('div');box.className='game-install';
  const download=document.createElement('button'),install=document.createElement('button'),full=document.createElement('button');
  download.textContent='Tải chơi offline';install.textContent='Cài ứng dụng';full.textContent='Toàn màn hình';
  box.append(download,install,full);parent.append(box);
  let prompt:InstallPrompt|undefined;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event as InstallPrompt;});
  const registration=navigator.serviceWorker.register('/sw.js');
  // Observe startup rejection immediately; show it again when the user downloads.
  void registration.catch(()=>{});
  install.onclick=async()=>{
    if(prompt){await prompt.prompt();await prompt.userChoice;prompt=undefined;}
    else alert(/iPhone|iPad|iPod/.test(navigator.userAgent)
      ? 'Trên iPhone/iPad: mở game bằng Safari → Chia sẻ → Thêm vào Màn hình chính. Bật Mở dưới dạng ứng dụng web nếu có. Sau đó mở Việt Phách từ biểu tượng mới và xoay máy ngang.'
      : 'Trong Chrome: mở menu ⋮ → Cài ứng dụng hoặc Thêm vào màn hình chính. Sau đó mở Việt Phách từ biểu tượng mới.');
  };
  full.onclick=()=>{void parent.requestFullscreen?.().catch(()=>{full.textContent='Hãy mở từ biểu tượng ứng dụng';});};
  download.onclick=async()=>{
    download.disabled=true;download.textContent='Đang chuẩn bị…';
    const panel=document.createElement('section');panel.className='offline-download';
    panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Tải game offline');panel.setAttribute('aria-modal','true');
    const card=document.createElement('div'),heading=document.createElement('h2'),status=document.createElement('p'),meter=document.createElement('progress'),hint=document.createElement('p'),close=document.createElement('button');
    heading.textContent='Tải Kháng Chiến về thiết bị';status.textContent='Đang kết nối bộ tải…';
    status.setAttribute('role','status');meter.max=100;meter.value=0;
    hint.textContent='Game được lưu trong trình duyệt, không tạo file APK trong Downloads. Giữ màn hình này mở đến khi tải xong.';
    close.textContent='Đóng';close.onclick=()=>{panel.remove();download.focus();};
    card.append(heading,status,meter,hint,close);panel.append(card);parent.append(panel);close.focus();
    let channel:MessageChannel|undefined,timer:ReturnType<typeof setTimeout>|undefined;
    const fail=(message:string)=>{
      clearTimeout(timer);channel?.port1.close();download.textContent='Tải lỗi · Thử lại';download.disabled=false;
      status.textContent=message;hint.textContent='Mở game bằng Chrome, giữ mạng ổn định và kiểm tra dung lượng trống rồi thử lại.';
    };
    const armTimeout=()=>{clearTimeout(timer);timer=setTimeout(()=>fail('Không nhận được phản hồi trong 60 giây. Quá trình tải chưa được xác nhận hoàn tất.'),60000);};
    try{
      armTimeout();await registration;
      const ready=await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Trình duyệt chưa bật được bộ tải offline.')),15000))]);
      channel=new MessageChannel();
      channel.port1.onmessage=event=>{
        armTimeout();
        if(event.data.done){
          clearTimeout(timer);download.textContent='Đã tải · Tải lại';download.disabled=false;channel!.port1.close();meter.value=100;
          status.textContent='Đã tải xong 100% — game đã lưu trên thiết bị.';
          hint.textContent='Bấm Cài ứng dụng hoặc menu trình duyệt → Thêm vào màn hình chính. Lần sau mở từ biểu tượng Việt Phách để chơi offline.';
        }
        else if(event.data.error)fail(event.data.error);
        else {meter.value=event.data.progress;download.textContent=`Đang tải ${event.data.progress}%`;status.textContent=`Đang tải ${event.data.progress}%${event.data.total?` · ${event.data.completed}/${event.data.total} tài nguyên`:''}`;}
      };
      ready.active!.postMessage({type:'DOWNLOAD'},[channel.port2]);
    }catch(error){fail(error instanceof Error?error.message:String(error));}
  };
}
