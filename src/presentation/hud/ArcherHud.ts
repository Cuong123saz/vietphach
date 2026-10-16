import type { ArcherRuntime } from '../../gameplay/characters/jobs/archer/ArcherRuntime';
import type { PotentialKey } from '../../gameplay/characters/core/Potential';
import { evolutionProgress, type EvolutionLevel } from '../../gameplay/progression/Evolution';
import { WOOD_ARCHER_EVOLUTION } from '../../gameplay/characters/jobs/archer/WoodArcherEvolution';
import { experienceRequired } from '../../gameplay/progression/Level';
import type { ArcherCastResult } from '../../gameplay/characters/jobs/archer/WoodArcherSkills';
import { WOOD_ARCHER_BALANCE as B } from '../../config/balance/woodArcher';
import './wood-hud.css';
const num=(n:number)=>n.toLocaleString('vi-VN',{maximumFractionDigits:1});
const labels:Record<PotentialKey,string>={strength:'Sức mạnh',dexterity:'Khéo léo',spirit:'Tinh thần',vitality:'Sức khỏe',luck:'May mắn'};
const effects:Record<PotentialKey,string>={strength:'+0,5 ATK',dexterity:'+0,3 ATK · tốc đánh · DEF',spirit:'+4 MP · hồi MP',vitality:'+6 HP',luck:'Tăng chí mạng'};
export const archerCastMessage=(r:ArcherCastResult)=>r.ok?'':({dead:'Bạn đã gục. Chọn chơi mới hoặc preset thử.',mp:'Chưa đủ MP.',cooldown:'Chiêu đang hồi.',busy:'Đang giương cung hoặc lùi bước.',sap:'Chưa đủ Sinh Tức.',target:'Chọn điểm hợp lệ trong tầm.',locked:'Nhánh này đang khóa.'}[r.reason]);
type Tab='overview'|'evolution'|'potential'|'skills';
export interface ArcherHudOptions {
  getArcher:()=>ArcherRuntime;getTime:()=>number;getUltimateStatus:()=>ArcherCastResult;
  onBlock:(value:boolean)=>void;onSkill:(skill:'basic'|'q'|'e'|'r'|'ultimate')=>void;
  onEvolution:(level:EvolutionLevel,id:string)=>void;onAllocate:(key:PotentialKey,amount:number)=>void;
  onTrial:(path:'a1'|'b1')=>void;onNew:()=>void;onTargets:()=>void;onRestore:()=>void;
  portrait:string;sandbox:boolean;stage?:boolean;canOpen?:()=>boolean;
}
/** Read-only HUD; gameplay changes are explicit callbacks into the job adapter. */
export class ArcherHud {
  private root:HTMLDivElement;private dialog:HTMLDialogElement;private content:HTMLElement;
  private options:ArcherHudOptions;private tab:Tab='overview';private last=-Infinity;private notice='';private noticeUntil=0;
  private priorFocus?:HTMLElement;private bound=new AbortController();
  constructor(parent:HTMLElement,options:ArcherHudOptions){
    this.options=options;this.root=document.createElement('div');this.root.className='wood-hud';
    this.root.innerHTML=`<section class="wood-vitals" aria-label="Cung Thủ và tài nguyên">
      <button class="wood-portrait" aria-label="Bảng nhân vật · C"><img src="${options.portrait}" alt="Cung Thủ Mộc"><kbd>C</kbd></button>
      <div><div class="wood-identity"><strong>Cung Thủ Mộc</strong><span>Hệ Mộc</span></div>
      <div class="wood-meter wood-hp" role="meter" aria-label="HP" aria-valuemin="0"><i></i><span></span></div>
      <div class="wood-meter wood-mp" role="meter" aria-label="MP" aria-valuemin="0"><i></i><span></span></div>
      <button class="wood-level" aria-label="Cấp và tiến hóa"></button></div></section>
      <section class="wood-title"><small>VIỆT PHÁCH · CUNG THỦ</small><strong></strong><span></span></section>
      <section class="wood-target" aria-label="Mục tiêu"><small>MỤC TIÊU</small><strong></strong><div class="wood-target-meter"><i></i><span></span></div></section>
      <div class="wood-notice" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="wood-instructions">WASD · Di chuyển<br>Giữ chuột · Bắn<br>Q / E · Chọn rồi click<br>C · Nhân vật</div>
      <nav class="wood-dock" aria-label="Kỹ năng Cung Thủ">
      <button class="wood-sap" data-wood-skill="ultimate" aria-label="Đại chiêu · Q cộng E"><div class="wood-sap-leaves">${Array.from({length:6},()=>'<i></i>').join('')}</div><strong></strong><span></span></button>
      ${(['basic','q','e','r'] as const).map(key=>`<button data-wood-skill="${key}" aria-label="${key==='basic'?'Mộc Tiễn':key==='q'?'Q · Xuyên Diệp':key==='e'?'E · Hạt Đằng':'R · Khai Cung'}"><span class="wood-skill-icon ${key}">${key==='r'?'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 49C8 18 35 5 53 10C57 35 36 59 12 49Z" fill="#83d491"/><path d="M12 49L48 16M26 35V19M26 35H44M37 25L37 13" stroke="#244e33" fill="none" stroke-width="3"/></svg>':`<img src="/assets/characters/archer/${key==='e'?'bramble':'jade-arrow'}-v1.png" alt="">`}<kbd>${key==='basic'?'Chuột':key.toUpperCase()}</kbd><i class="wood-cooldown"></i></span><strong>${key==='basic'?'Mộc Tiễn':key==='q'?'Xuyên Diệp':key==='e'?'Hạt Đằng':'Khai Cung'}</strong><span class="wood-skill-status"></span></button>`).join('')}</nav>
      <div class="wood-trial">${options.sandbox?'<button data-wood-trial="a1">Thử A1 · Xuyên Thiên</button><button data-wood-trial="b1">Thử B1 · Thành Lâm</button><button data-wood-targets>Đổi bia / quái</button>':''}<button data-wood-new>${options.stage?'Chơi lại stage':'Chơi mới · Lv1'}</button>${options.sandbox?'<button data-wood-restore>Hồi đầy · phòng thử</button>':options.stage?'<a href="?character=archer">Chơi thường</a>':'<a href="?character=archer&sandbox=1">Phòng thử A1 / B1</a>'}<a href="?stage=linh-moc&character=archer">Stage · Linh Mộc Trấn Ải</a></div>
      <dialog class="wood-panel" aria-labelledby="wood-panel-title"><header><div><small>VIỆT PHÁCH · NHÂN VẬT</small><h1 id="wood-panel-title">Cung Thủ Mộc</h1></div><button aria-label="Đóng bảng nhân vật">×</button></header>
      <nav role="tablist" aria-label="Bảng Cung Thủ">${([['overview','Thông tin'],['evolution','Tiến hóa'],['potential','Tiềm năng'],['skills','Kỹ năng']] as const).map(([id,label])=>`<button role="tab" id="wood-tab-${id}" data-wood-tab="${id}" aria-controls="wood-panel-content">${label}</button>`).join('')}</nav><section id="wood-panel-content" role="tabpanel" tabindex="0"></section></dialog>`;
    parent.append(this.root);this.dialog=this.root.querySelector('dialog')!;this.content=this.root.querySelector('#wood-panel-content')!;
    if(!options.stage)this.root.querySelector('.wood-trial')!.insertAdjacentHTML('beforeend','<a href="?character=mage">Pháp Sư Thủy</a><a href="?stage=kieu-ngao&character=archer">Stage · Kiêu Ngạo</a>');
    this.root.querySelector<HTMLButtonElement>('.wood-portrait')!.onclick=()=>this.open('overview');
    this.root.querySelector<HTMLButtonElement>('.wood-level')!.onclick=()=>this.open('evolution');
    this.root.querySelectorAll<HTMLButtonElement>('[data-wood-skill]').forEach(b=>b.onclick=()=>options.onSkill(b.dataset.woodSkill as Parameters<ArcherHudOptions['onSkill']>[0]));
    this.root.querySelectorAll<HTMLButtonElement>('[data-wood-trial]').forEach(b=>b.onclick=()=>options.onTrial(b.dataset.woodTrial as 'a1'|'b1'));
    this.root.querySelector<HTMLButtonElement>('[data-wood-new]')!.onclick=options.onNew;
    const targets=this.root.querySelector<HTMLButtonElement>('[data-wood-targets]');if(targets)targets.onclick=options.onTargets;
    const restore=this.root.querySelector<HTMLButtonElement>('[data-wood-restore]');if(restore)restore.onclick=options.onRestore;
    this.dialog.querySelector<HTMLButtonElement>('header button')!.onclick=()=>this.dialog.close();
    this.dialog.addEventListener('close',()=>{options.onBlock(false);this.priorFocus?.focus();},{signal:this.bound.signal});
    this.root.querySelectorAll<HTMLButtonElement>('[data-wood-tab]').forEach(b=>{b.onclick=()=>{this.tab=b.dataset.woodTab as Tab;this.renderPanel();};
      b.onkeydown=e=>{const buttons=[...this.root.querySelectorAll<HTMLButtonElement>('[data-wood-tab]')],i=buttons.indexOf(b);
        const next=e.key==='ArrowRight'?(i+1)%4:e.key==='ArrowLeft'?(i+3)%4:e.key==='Home'?0:e.key==='End'?3:-1;
        if(next>=0){e.preventDefault();buttons[next].click();buttons[next].focus();}};});
    window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='c'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!(e.target instanceof HTMLInputElement)){
      e.preventDefault();this.dialog.open?this.dialog.close():this.open('overview');}},{signal:this.bound.signal});this.update();
  }
  isOpen(){return this.dialog.open;}
  open(tab:Tab){if(this.options.canOpen&&!this.options.canOpen())return;this.tab=tab;this.renderPanel();if(!this.dialog.open){this.priorFocus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;
    this.options.onBlock(true);this.dialog.showModal();}}
  feedback(text:string){this.notice=text;this.noticeUntil=this.options.getTime()+3;this.root.querySelector('.wood-notice')!.textContent=text;}
  target(target?:{label:string;hp:number;maxHp:number;element:string}){
    const root=this.root.querySelector<HTMLElement>('.wood-target')!;root.hidden=!target;if(!target)return;
    root.querySelector('strong')!.textContent=`${target.label} · ${target.element}`;root.querySelector('span')!.textContent=`${num(target.hp)} / ${num(target.maxHp)} HP`;
    root.querySelector<HTMLElement>('i')!.style.width=`${Math.max(0,target.hp/target.maxHp)*100}%`;
  }
  update(force=false){
    const now=this.options.getTime();if(!force&&now-this.last<.08)return;this.last=now;
    const a=this.options.getArcher(),s=a.wood,path=a.progression.evolutionChoices['7']?.includes('b1')?'Độc Đằng Vực':a.progression.evolutionChoices['7']?.includes('a1')?'Truy Tâm Liệp':'Chưa chọn hướng';
    for(const [key,value,max] of [['hp',a.resources.currentHp,a.stats.maxHp],['mp',a.resources.currentMp,a.stats.maxMp]] as const){
      const meter=this.root.querySelector<HTMLElement>(`.wood-${key}`)!;meter.querySelector('span')!.textContent=`${key.toUpperCase()} ${num(value)} / ${num(max)}`;
      meter.querySelector<HTMLElement>('i')!.style.width=`${max?value/max*100:0}%`;meter.setAttribute('aria-valuenow',String(value));meter.setAttribute('aria-valuemax',String(max));}
    const ready=evolutionProgress(a.progression,WOOD_ARCHER_EVOLUTION).some(m=>m.status==='ready');
    this.root.querySelector('.wood-level')!.textContent=`Cấp ${a.progression.level}${ready?' · Có tiến hóa':` · ${a.progression.potential.unspent} điểm`}`;
    this.root.querySelector('.wood-title strong')!.textContent=path;
    const eligibility=this.options.getUltimateStatus(),u=s.ultimate;
    const dead=a.resources.currentHp<=0;
    const hint=dead?'Bạn đã gục · Chơi mới để bắt đầu lại':u?u.kind==='hunt'?'THẦN MỘC XUYÊN THIÊN':'VẠN TIỄN THÀNH LÂM':eligibility.ok?'Q+E → click · Đại chiêu sẵn sàng':s.cooldowns.ultimate>now?`Đại chiêu · ${Math.ceil(s.cooldowns.ultimate-now)}s`:s.sap<6?'Bắn trúng để nuôi Sinh Tức':a.progression.level<15?'Đại chiêu mở ở cấp 15':archerCastMessage(eligibility);
    this.root.querySelector('.wood-title span')!.textContent=hint;
    this.root.querySelector('.wood-sap strong')!.textContent=`${s.sap}/6`;this.root.querySelector('.wood-sap span')!.textContent=eligibility.ok?'Q+E · Sẵn sàng':u?'Đang thi triển':'Sinh Tức';
    this.root.querySelector('.wood-sap')!.classList.toggle('ready',eligibility.ok);this.root.querySelectorAll<HTMLElement>('.wood-sap-leaves i').forEach((leaf,i)=>leaf.classList.toggle('full',i<s.sap));
    this.root.querySelector<HTMLButtonElement>('.wood-sap')!.disabled=dead;
    for(const key of ['basic','q','e','r'] as const){const button=this.root.querySelector<HTMLButtonElement>(`[data-wood-skill="${key}"]`)!;
      button.disabled=dead;
      const cooldown=Math.max(0,(key==='basic'?s.nextBasicAt:s.cooldowns[key])-now);
      const text=key==='basic'?'0 MP':key==='r'&&s.r.charges>0?`${s.r.charges} lượt · ${Math.ceil(s.r.expiresAt-now)}s`:cooldown>0?`${cooldown.toFixed(1)}s`:key==='q'?`${B.q.mp} MP`:key==='e'?`${B.e.mp} MP`:`${B.r.mp} MP · 3 Sinh Tức`;
      button.querySelector('.wood-skill-status')!.textContent=text;button.classList.toggle('cooling',cooldown>0);button.classList.toggle('empowered',s.r.charges>0&&(key==='basic'||key==='q'));}
    if(this.notice&&now>this.noticeUntil){this.root.querySelector('.wood-notice')!.textContent='';this.notice='';}
    if(this.dialog.open&&force)this.renderPanel();
    this.root.dataset.woodState=JSON.stringify({level:a.progression.level,path,hp:a.resources.currentHp,mp:a.resources.currentMp,sap:s.sap,
      ultimate:u?{kind:u.kind,harvested:u.harvested,endsAt:u.endsAt}:null,fields:s.fields.map(f=>({kind:f.kind,x:f.position.x,y:f.position.y})),arrows:s.arrows.length,ready:eligibility.ok});
  }
  private renderPanel(){
    const a=this.options.getArcher();this.root.querySelectorAll('[data-wood-tab]').forEach(b=>b.setAttribute('aria-selected',String((b as HTMLElement).dataset.woodTab===this.tab)));
    this.content.setAttribute('aria-labelledby',`wood-tab-${this.tab}`);
    if(this.tab==='overview')this.content.innerHTML=`<h2>Cung Thủ hệ Mộc · Cấp ${a.progression.level}</h2><p>Bắn thật, chọn đường tên và nơi mọc rừng. A1/B1 mở đến Lv15; A2/B2 đang khóa.</p><dl class="wood-stats">${[
      ['HP',`${num(a.resources.currentHp)} / ${num(a.stats.maxHp)}`],['MP',`${num(a.resources.currentMp)} / ${num(a.stats.maxMp)}`],['ATK',num(a.stats.atk)],['DEF',num(a.stats.def)],['Nhịp bắn',`${a.stats.attackInterval.toFixed(2)}s`],['Hồi MP',`${num(a.stats.mpRegen)}/s`],['Chí mạng',`${num(a.stats.critChance*100)}%`],['Sinh Tức',`${a.wood.sap}/6`],['EXP',a.progression.level===15?'Cấp tối đa':`${a.progression.exp}/${experienceRequired(a.progression.level)}`]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><p>WASD di chuyển. Giữ chuột bắn. Q/E rồi click để chọn. R dùng Khai Cung. Đủ 6 Sinh Tức, Lv15 và Q/E hết hồi: Q+E hoặc E+Q rồi click.</p>`;
    else if(this.tab==='potential')this.content.innerHTML=`<h2>Tiềm năng · còn ${a.progression.potential.unspent} điểm</h2>${Object.entries(labels).map(([key,label])=>`<div class="wood-potential"><div><strong>${label} · ${a.progression.potential.allocation[key as PotentialKey]}</strong><small>${effects[key as PotentialKey]}</small></div>${[1,5].map(n=>`<button data-allocate="${key}" data-amount="${n}" ${a.progression.potential.unspent<n?'disabled':''}>+${n}</button>`).join('')}</div>`).join('')}<p>Phân bổ điểm giữ tỷ lệ HP/MP hiện có; không tự hồi đầy tài nguyên.</p>`;
    else if(this.tab==='evolution'){
      const progress=evolutionProgress(a.progression,WOOD_ARCHER_EVOLUTION);
      this.content.innerHTML=`<h2>Liệp Mộc / Linh Lâm</h2><p>Chọn theo thứ tự. A2 và B2 khóa ở mọi mốc.</p>${progress.map(m=>`<section class="wood-evolution"><h3>Cấp ${m.level} · ${m.title}</h3>${WOOD_ARCHER_EVOLUTION.find(x=>x.level===m.level)!.options.map(o=>{
        const compatible=Object.entries(o.requires??{}).every(([l,id])=>a.progression.evolutionChoices[l]===id),selected=m.choice===o.id;
        return `<button data-evolution="${o.id}" data-level="${m.level}" ${m.status!=='ready'||!compatible||o.locked||!o.implemented?'disabled':''} class="${selected?'selected':''}"><strong>${o.title}${o.locked?' · KHÓA':selected?' · Đã chọn':''}</strong><span>${o.description}</span></button>`;
      }).join('')}</section>`).join('')}`;
    }else this.content.innerHTML=`<h2>Kỹ năng Cung Thủ</h2><div class="wood-skill-detail"><h3>Mộc Tiễn / Sinh Tức</h3><p>Tên thường gây 1 ATK. Đòn gốc trúng +1 Sinh Tức, tối đa một lần/lệnh. Hụt, hạt, DoT, Vĩ Tiễn và đại chiêu không nuôi điểm.</p><h3>Q · Xuyên Diệp</h3><p>18 MP · 4s · tụ 0,35s · 3 ATK. Tên xuyên 3 body; A1 Lv11 tăng lên 5. Trượt không hoàn MP.</p><h3>E · Hạt Đằng</h3><p>20 MP · 7s (Linh Lâm 6s). Hạt chờ địch, root 0,75s. A1 Lv9 đặt tại chân rồi lùi. B1 mọc vườn, nối dây leo và gây DoT.</p><h3>R · Khai Cung</h3><p>30 MP + 3 Sinh Tức · 12s. Ba lệnh bắn/Q tăng 35% raw trong 8s. Đại chiêu không dùng lượt R.</p><h3>Đại chiêu · Q+E</h3><p>Lv15 · 6 Sinh Tức · 60% Max MP · 30s. A1 tụ 1,2s rồi bắn ba tên lớn theo một hướng. B1 tụ 1s, thu tối đa hai hạt/vườn trong vòng, ba loạt tên rồi rừng gai sáu giây. Có thể hụt hoặc bị địch rời vùng.</p><p>Damage qua DEF, Ngũ Hành và khiên chung. Mộc khắc Thổ, bị Kim khắc. Tên/vườn có thể bị vật cản che. Các hệ số là cân bằng thử.</p></div>`;
    this.content.querySelectorAll<HTMLButtonElement>('[data-allocate]').forEach(b=>b.onclick=()=>{this.options.onAllocate(b.dataset.allocate as PotentialKey,Number(b.dataset.amount));this.renderPanel();this.update(true);});
    this.content.querySelectorAll<HTMLButtonElement>('[data-evolution]').forEach(b=>b.onclick=()=>{this.options.onEvolution(Number(b.dataset.level) as EvolutionLevel,b.dataset.evolution!);this.renderPanel();this.update(true);});
  }
  destroy(){this.bound.abort();if(this.dialog.open)this.dialog.close();this.root.remove();}
}
