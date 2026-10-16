import './touch-controls.css';
import type { MageRuntime } from '../../gameplay/characters/jobs/mage/MageRuntime';
import { waterMageHudModel } from './waterMageHudModel';

export type TouchAction='attack'|'q'|'e'|'r'|'combo';
/** Browsers may reject either request; touch controls remain usable in that case. */
export async function enterTouchLandscape(parent:HTMLElement):Promise<void>{
  try{if(!document.fullscreenElement)await parent.requestFullscreen?.();}catch{}
  const orientation=screen.orientation as ScreenOrientation & {lock?:(mode:string)=>Promise<void>};
  try{await orientation?.lock?.('landscape');}catch{}
}
/** Pointer capture keeps movement and skill fingers independent. */
export class TouchControls {
  readonly root=document.createElement('section');
  move={x:0,y:0};
  private stick=document.createElement('div');
  private knob=document.createElement('span');
  private combo:HTMLButtonElement;
  private buttons:HTMLButtonElement[]=[];
  private actionDock=document.createElement('div');
  private states:HTMLSpanElement[]=[];
  private lastStatusAt=-Infinity;
  private reset=()=>{this.move={x:0,y:0};this.knob.style.transform='translate(0,0)';};
  constructor(parent:HTMLElement,action:(key:TouchAction,aim?:{x:number;y:number})=>void){
    this.root.className='touch-controls';this.root.setAttribute('aria-label','Điều khiển cảm ứng');
    parent.classList.add('has-touch-controls');
    const rotate=document.createElement('p');rotate.className='touch-rotate-hint';
    rotate.textContent='Xoay máy ngang để chơi · Tắt khóa xoay nếu cần';this.root.append(rotate);
    this.stick.className='touch-stick';this.stick.setAttribute('aria-label','Di chuyển');
    this.stick.append(this.knob);this.root.append(this.stick);
    let movementId:number|undefined;
    const move=(event:PointerEvent)=>{
      if(event.pointerId!==movementId)return;
      const r=this.stick.getBoundingClientRect(),dx=event.clientX-r.left-r.width/2,dy=event.clientY-r.top-r.height/2;
      const length=Math.hypot(dx,dy),scale=Math.min(1,40/Math.max(1,length));
      this.move={x:dx*scale/40,y:dy*scale/40};
      this.knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
    };
    this.stick.onpointerdown=e=>{if(movementId!==undefined)return;e.preventDefault();movementId=e.pointerId;this.stick.setPointerCapture(e.pointerId);move(e);};
    this.stick.onpointermove=move;
    const end=(e:PointerEvent)=>{if(e.pointerId===movementId){movementId=undefined;this.reset();}};
    this.stick.onpointerup=end;this.stick.onpointercancel=end;this.stick.onlostpointercapture=end;
    const dock=this.actionDock;dock.className='touch-actions';
    for(const [key,label] of [['attack','Đánh'],['q','Q'],['e','E'],['r','R'],['combo','Q + E']] as const){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.setAttribute('aria-label',key==='combo'?'Thi triển tất sát Q và E':label);
      const state=document.createElement('span');state.className='touch-skill-status';button.append(state);this.states.push(state);
      let press:{id:number;x:number;y:number}|undefined;
      button.onpointerdown=e=>{e.preventDefault();press={id:e.pointerId,x:e.clientX,y:e.clientY};button.setPointerCapture(e.pointerId);button.classList.add('pressed');};
      button.onpointerup=e=>{
        if(!press || press.id!==e.pointerId)return;
        const dx=e.clientX-press.x,dy=e.clientY-press.y,length=Math.hypot(dx,dy);
        press=undefined;button.classList.remove('pressed');action(key,length>12?{x:dx/length,y:dy/length}:undefined);
      };
      const cancel=()=>{press=undefined;button.classList.remove('pressed');};
      button.onpointercancel=cancel;button.onlostpointercapture=cancel;
      this.buttons.push(button);dock.append(button);
    }
    this.combo=this.buttons[4];this.root.append(dock);parent.append(this.root);
    this.root.addEventListener('pointerdown',e=>e.stopPropagation());
    window.addEventListener('blur',this.reset);
  }
  update(phase:string,blocked:boolean,mage?:MageRuntime,now=0,options?:{combo?:boolean;movementOnly?:boolean;basicOnly?:boolean;statuses?:Partial<Record<TouchAction,string>>}){
    const combat=phase==='combat'||phase==='boss',finale=phase==='sacrifice',bomb=phase==='bomb';
    this.root.hidden=blocked || !(combat||finale||bomb);
    this.combo.hidden=options?.combo===undefined?!bomb:!options.combo;
    this.buttons.forEach((b,i)=>{b.disabled=i===4?!combat&&!bomb:!combat && !(finale && i===1);});
    this.buttons.forEach((b,i)=>{if(options?.movementOnly||options?.basicOnly&&i>0)b.disabled=true;});
    this.actionDock.hidden=!!options?.movementOnly;
    this.stick.hidden=!combat;
    if(mage && (now-this.lastStatusAt>=.1 || now<this.lastStatusAt || !combat)){
      this.lastStatusAt=now;
      const model=waterMageHudModel(mage,now);
      for(const [i,key] of (['basic','q','e','r'] as const).entries()){
        const status=finale?'':model.skillStatus(key);
        const text=['Sẵn sàng','Giữ / thả','ĐỦ LỰC','Thủy Ngục'].includes(status)?'':status;
        if(this.states[i].textContent!==text)this.states[i].textContent=text;
        this.buttons[i].classList.toggle('is-cooling',/s$/.test(text));
        this.buttons[i].setAttribute('aria-label',`${['Đánh','Q','E','R'][i]}${text?` · ${text}`:''}`);
      }
    }
    if(this.root.hidden || !combat)this.reset();
    if(options?.statuses&&(now-this.lastStatusAt>=.1||now<this.lastStatusAt)){
      this.lastStatusAt=now;
      for(const [i,key] of (['attack','q','e','r','combo'] as const).entries()){
        const text=options.statuses[key]??'';this.states[i].textContent=text;
        this.buttons[i].setAttribute('aria-label',`${key==='combo'?'Đại chiêu Q và E':key==='attack'?'Bắn tên':key.toUpperCase()}${text?` · ${text}`:''}`);
        this.buttons[i].classList.toggle('is-cooling',/s$/.test(text));
      }
    }
  }
  destroy(){window.removeEventListener('blur',this.reset);this.reset();this.root.parentElement?.classList.remove('has-touch-controls');this.root.remove();}
}
