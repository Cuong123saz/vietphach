import { RUN_BALANCE } from '../../config/balance/core';
import { ELITE_ENEMIES } from '../../config/balance/eliteEnemies';
import { MELEE_JOBS, MELEE_MODELS, isMeleeJob } from '../../presentation/animations/meleeModel';
export type SandboxDevAction = 'forest-marker' | 'archer-stage-clear' | 'archer-stage-ready' | 'toggle-archer-slow' | 'trial-archer-a1' | 'trial-archer-b1' | 'trial-human-15' | 'trial-long-15' | 'restore' | 'toggle-allies' | 'hit-player' | 'hit-ally' | 'toggle-monster-ai' | 'grant-exp' | 'level-up' | 'stage-skip-intro' | 'stage-clear-wave' | 'stage-boss-finale' | 'stage-test-ultimate' | 'stage-enter-refuge' | 'stage-exit-refuge';

/** Browser tools only; actions are handled by the current sandbox, not a second runtime. */
export function mountDevMenu(onAction: (action: SandboxDevAction) => void, options: {
  onOpenChange?: (open: boolean) => void;
  subscribeStatus?: (receive: (status: string) => void) => () => void;
} = {}): () => void {
  const params = new URLSearchParams(location.search);
  const menu = document.createElement('details');
  menu.className = 'dev-menu';
  const summary = document.createElement('summary');
  summary.textContent = 'Dev';
  const panel = document.createElement('nav');
  panel.setAttribute('aria-label', 'Công cụ phát triển');
  menu.append(summary, panel);
  const releaseInput = (closeMenu = true) => {
    if (closeMenu) menu.open = false;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && menu.contains(focused)) focused.blur();
    // Release synchronously: the native details toggle event is deferred/coalesced.
    options.onOpenChange?.(false);
  };
  const link = (label: string, change: (url: URL) => void) => {
    const url = new URL(location.href);url.searchParams.delete('stage');change(url);
    const item = document.createElement('a'); item.href = url.href; item.textContent = label; panel.append(item);
  };
  link(params.has('sandbox') ? 'Về bản đồ' : 'Phòng thử kỹ năng', url => {
    url.searchParams.delete('playtest'); url.searchParams.delete('lab');
    if (params.has('sandbox')) url.searchParams.delete('sandbox'); else url.searchParams.set('sandbox', '1');
    url.searchParams.set('character', params.get('character')==='archer'?'archer':'mage');
  });
  link('Cung Thủ Mộc · A1 / B1',url=>{url.search='?character=archer&sandbox=1';});
  link('Cung Thủ · Chơi từ Lv1',url=>{url.search='?character=archer';});
  link('Stage Cung Thủ · Linh Mộc Trấn Ải',url=>{url.search='?stage=linh-moc&character=archer';});
  link('Stage Cung Thủ · Kiêu Ngạo',url=>{url.search='?stage=kieu-ngao&character=archer';});
  link('Pháp Sư Thủy',url=>{url.search='?character=mage&sandbox=1';});
  for (const job of MELEE_JOBS) link(`${MELEE_MODELS[job].name} · Model`, url => { url.search = `?character=${job}&model=1`; });
  link('Lab map / khu', url => { url.search = '?lab=1'; });
  link('Stage · Kháng Chiến',url=>{url.search='?stage=khang-chien&character=mage';});
  for(const [id,label] of Object.entries({'elite-flat-fur-rat':'Nanh Xé','elite-grasshopper':'Liêm Phong','elite-crop-snail':'Nhầy Độc',
    'elite-caterpillar':'Tiễn Gai','elite-black-caterpillar':'Hắc Châm','elite-mutant-caterpillar':'Gai Bạo','boss-spiked-shell-beast':'Giáp Tai Ương'})){
    if(ELITE_ENEMIES[id])link(`Thử ${label}`,url=>{url.searchParams.delete('lab');url.searchParams.delete('playtest');
      url.searchParams.set('sandbox','1');url.searchParams.set('character','mage');url.searchParams.set('encounter',id);});
  }
  link('Thử quái thường',url=>{url.searchParams.delete('encounter');url.searchParams.delete('lab');url.searchParams.set('sandbox','1');url.searchParams.set('character','mage');});
  for(let index=1;index<=4;index++)link(`Kháng Chiến · Map ${index}`,url=>{
    url.searchParams.delete('lab');url.searchParams.delete('playtest');
    url.searchParams.set('map',`khang-chien-${index}`);url.searchParams.set('character','mage');
  });
  link(params.get('capture') === 'portrait' ? 'Khung ngang' : 'Quay dọc 9:16', url => {
    if (params.get('capture') === 'portrait') url.searchParams.delete('capture'); else url.searchParams.set('capture', 'portrait');
  });
  if(params.get('stage')==='khang-chien'){
    for(const [action,label] of [['stage-skip-intro','Bỏ qua mở đầu'],['stage-clear-wave','Hoàn thành đợt hiện tại'],['stage-boss-finale','Đưa boss về 40%'],['stage-test-ultimate','Thử Thủy Long Giáng Thế'],['stage-enter-refuge','Thử đứng trong kết giới'],['stage-exit-refuge','Thử đứng ngoài kết giới'],['restore','Hồi đầy HP / MP'],['toggle-monster-ai','Dừng / chạy AI quái']] as const){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>{try{onAction(action);}finally{releaseInput(false);if(action==='stage-test-ultimate')options.onOpenChange?.(true);}};panel.append(button);
    }
  }
  if(params.get('stage')==='kieu-ngao'){
    for(const [action,label] of [['archer-stage-clear','Hoàn thành trận hiện tại (thử)'],['forest-marker','Tới dấu chỉ dẫn (thử)'],['archer-stage-ready','Chuẩn bị đại chiêu Cung Thủ'],['restore','Hồi đầy HP / MP'],['toggle-monster-ai','Dừng / chạy AI quái']] as const){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>{try{onAction(action);}finally{releaseInput();}};panel.append(button);
    }
  }
  if(params.get('stage')==='linh-moc'){
    for(const [action,label] of [['archer-stage-clear','Hoàn thành đợt hiện tại'],['archer-stage-ready','Chuẩn bị đại chiêu Cung Thủ'],['restore','Hồi đầy người / Linh Mộc'],['toggle-monster-ai','Dừng / chạy AI quái']] as const){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>{try{onAction(action);}finally{releaseInput();}};panel.append(button);
    }
  }
  if (params.has('sandbox') && !params.has('stage') && !isMeleeJob(params.get('character'))) {
    const actions:readonly (readonly [SandboxDevAction,string])[]=params.get('character')==='archer'?[
      ['trial-archer-a1','Thử A1 cấp 15 · Thần Mộc Xuyên Thiên'],['trial-archer-b1','Thử B1 cấp 15 · Vạn Tiễn Thành Lâm'],
      ['toggle-archer-slow','Xem chậm hiệu ứng / tốc độ thường'],
      ['restore','Hồi đầy HP / MP'],['toggle-monster-ai','Dừng / chạy AI quái'],['grant-exp','+100 EXP'],['level-up','+200 EXP'],
    ]:[
      ['restore', 'Hồi đầy HP / MP'], ['toggle-allies', 'Bật / tắt đồng đội'],
      ['toggle-monster-ai', 'Dừng / chạy AI quái'],
      ['grant-exp', `+${RUN_BALANCE.debugExp} EXP`], ['level-up', '+1 cấp qua EXP'],
      ['trial-human-15', 'Thử A1 cấp 15 · Bát Đại Hải Long'], ['trial-long-15', 'Thử B1 cấp 15 · Thủy Long Giáng Thế'],
      ['hit-player', 'Thử hit người chơi'], ['hit-ally', 'Thử hit đồng đội'],
    ];
    for (const [action, label] of actions) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.addEventListener('click', () => { try { onAction(action); } finally { releaseInput(false); } }); panel.append(button);
    }
  }
  const status = document.createElement('pre');
  panel.append(status);
  const unsubscribe = options.subscribeStatus?.(value => { if(menu.open && status.textContent !== value)status.textContent=value; });
  menu.addEventListener('toggle', () => { if (menu.open) options.onOpenChange?.(true); else releaseInput(); });
  menu.addEventListener('keydown', event => {
    if (!menu.open) return;
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); releaseInput(); }
  });
  document.body.append(menu);
  return () => { unsubscribe?.(); options.onOpenChange?.(false); menu.remove(); };
}
