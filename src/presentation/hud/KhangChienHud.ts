import { KHANG_CHIEN_STORY as STORY, khangChienOpeningCaption } from '../../config/stages/khangChienStory';
import { KHANG_CHIEN_BALANCE as B } from '../../config/balance/khangChien';
import { stageAge, renewalStep, finaleQRemaining, finaleTiming, stageInteractive, type KhangChienRuntime } from '../../run/KhangChienStage';
import { objectiveProtects } from '../../gameplay/combat/CombatObjective';
import './khangChien.css';

const DEFEND_WARNING_SECONDS=5;

export class KhangChienHud {
  private root=document.createElement('section');
  private progress=document.createElement('div');
  private headline=document.createElement('div');
  private barrierLabel=document.createElement('div');
  private barrierMeter=document.createElement('div');
  private barrierFill=document.createElement('div');
  private caption=document.createElement('div');
  private announce=document.createElement('div');private announcing=false;
  private panel=document.createElement('div');
  private lastPhase='';private lastProgress='';private lastCaption='';
  private start:()=>void;private retry:()=>void;
  private parent:HTMLElement;
  constructor(parent:HTMLElement,start:()=>void,retry:()=>void){
    this.parent=parent;parent.classList.add('khang-stage-active');
    this.start=start;this.retry=retry;
    this.root.className='khang-stage';this.root.setAttribute('aria-label','Stage Kháng Chiến');
    this.progress.className='khang-stage-progress';this.caption.className='khang-stage-caption';
    this.barrierLabel.className='khang-barrier-label';this.barrierMeter.className='khang-barrier-meter';this.barrierFill.className='khang-barrier-fill';
    this.barrierMeter.setAttribute('role','meter');this.barrierMeter.setAttribute('aria-label','Máu kết giới');
    this.barrierMeter.setAttribute('aria-valuemin','0');this.barrierMeter.append(this.barrierFill);
    this.progress.append(this.headline,this.barrierLabel,this.barrierMeter);
    this.announce.className='khang-announce';this.announce.setAttribute('role','alert');this.announce.hidden=true;
    const title=document.createElement('strong');title.textContent=STORY.announceTitle;this.announce.append(title);
    for(const line of STORY.announceLines){const p=document.createElement('p');p.textContent=line;this.announce.append(p);}
    this.panel.className='khang-stage-overlay';this.root.append(this.progress,this.caption,this.announce,this.panel);parent.append(this.root);
    this.panel.addEventListener('keydown',event=>{
      if(!['ready','briefing','failed','complete'].includes(this.lastPhase))return;event.stopPropagation();
      if(event.key!=='Tab')return;
      const controls=Array.from(this.panel.querySelectorAll<HTMLElement>('button,a,summary'));
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
    });
  }
  update(s:KhangChienRuntime,paused=false){
    this.root.classList.toggle('is-finale',s.phase==='sacrifice'||s.phase==='purification');
    const boss=s.enemies.find(e=>e.id===s.bossId),quota=B.quotas[s.mapIndex-1];
    const count=s.mapIndex===4?boss?`Boss ${Math.ceil(boss.actor.resources.currentHp).toLocaleString('vi-VN')} / 1.000.000 HP`:'Trận cuối':`${s.kills} / ${quota} quái đã hạ`;
    const qCount=s.run.character!.waterSkills.qCastsSinceEmpower;
    const progress=`KHÁNG CHIẾN · ${s.mapIndex}/4\n${STORY.maps[s.mapIndex-1]} · ${count}\n${qCount>=4?'Q CƯỜNG HÓA SẴN SÀNG':`Q · ${qCount}/4`} · READY dành cho E`;
    if(progress!==this.lastProgress){this.headline.textContent=progress;this.lastProgress=progress;}
    const hp=Math.max(0,s.barrier.body.actor.resources.currentHp),max=s.barrier.body.actor.stats.maxHp;
    const warning=hp/max<=B.barrier.warningRatio;
    this.progress.classList.toggle('is-danger',warning);
    this.barrierLabel.textContent=`${hp===0?'Kết giới đã vỡ':!s.barrierActive?'Kết giới chưa dựng':warning?'Kết giới nguy cấp':'Kết giới'} · ${Math.ceil(hp).toLocaleString('vi-VN')} / ${max.toLocaleString('vi-VN')}`;
    this.barrierMeter.setAttribute('aria-valuemax',String(max));this.barrierMeter.setAttribute('aria-valuenow',String(hp));
    this.barrierFill.style.width=`${Math.min(100,hp/max*100)}%`;
    const age=stageAge(s),remaining=finaleQRemaining(s),shots=s.finaleShots.length;
    const timing=finaleTiming(s);
    const finale=age<B.finale.chargeSeconds?'Thủy Long Giáng Thế · Quả cầu E đang bay!'
      :remaining>0?`${paused?'Tạm dừng':'BẤM Q ĐỂ BỒI SỨC MẠNH CHO E'}\n${shots} / 10 Mạch hợp lực · Đủ 10 để phóng hai đại chiêu`
      :age<timing.firstImpactAt?'ĐỦ 10 MẠCH · THỦY LONG GIÁNG THẾ!'
      :age<timing.eightImpactAt+.6?STORY.eight:age<timing.celebrateAt?'':age<timing.beamAt?'Đã hạ được nó? Bà con đang chạy tới…':age<timing.offeringAt?'Mảnh giáp phản nổ! Uế trong đất vẫn chưa tan…':STORY.offering;
    const attacking=stageInteractive(s) && s.barrierAttackAt!==undefined && s.clock-s.barrierAttackAt<8;
    const sheltered=stageInteractive(s) && s.barrierActive && objectiveProtects(s.barrier,s.run.player.position);
    // Full warning while the opening assault lands, then a small pill that stays out of the way.
    const defendWarning=stageInteractive(s) && s.mapIndex===1 && age<DEFEND_WARNING_SECONDS;
    // The big announcement owns the opening seconds; the small pill takes over afterwards.
    const combatHint=defendWarning?'':attacking||sheltered?STORY.defendHint:'';
    if(defendWarning!==this.announcing){
      this.announcing=defendWarning;
      if(defendWarning){this.announce.hidden=false;this.announce.classList.remove('is-leaving');}
      else if(!this.announce.hidden){this.announce.classList.add('is-leaving');setTimeout(()=>{if(!this.announcing)this.announce.hidden=true;},450);}
    }
    const renewalIndex=Math.min(2,s.mapIndex-1);
    const caption=['arrival','barrier'].includes(s.phase)?khangChienOpeningCaption(s.clock):s.phase==='sortie'?STORY.sortie:
      s.phase==='rally'?'Tiếng trống đang vang… Chuẩn bị ra trận.':s.phase==='transition'?({return:STORY.renewalReturn,prayer:STORY.renewalPrayer[renewalIndex],draw:STORY.renewalDraw[renewalIndex],sortie:STORY.renewalSortie}[renewalStep(s)!]):s.phase==='sacrifice'?finale:
      s.phase==='purification'?(age<B.purification.riseSeconds?STORY.soulRise:age<B.purification.riseSeconds+B.purification.waveSeconds?STORY.cleansing:STORY.farewell):combatHint;
    if(caption!==this.lastCaption){this.caption.textContent=caption;this.caption.hidden=!caption;this.lastCaption=caption;
      this.caption.classList.toggle('is-compact',caption===STORY.defendHint);}
    if(this.lastPhase===s.phase)return;this.lastPhase=s.phase;this.panel.replaceChildren();
    this.panel.classList.toggle('is-result',s.phase==='complete'||s.phase==='failed');
    this.panel.setAttribute('role',['ready','briefing'].includes(s.phase)?'dialog':'region');
    this.panel.setAttribute('aria-label',['ready','briefing'].includes(s.phase)?'Thông tin trước trận':'Kết quả Stage');
    if(['ready','briefing'].includes(s.phase))this.panel.setAttribute('aria-modal','true');else this.panel.removeAttribute('aria-modal');
    this.panel.hidden=!['ready','briefing','bomb','complete','failed'].includes(s.phase);
    if(this.panel.hidden)return;
    const card=document.createElement('article');card.className='khang-stage-card';
    if(s.phase==='bomb'){
      this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-modal','true');this.panel.setAttribute('aria-label','Cảnh báo tự bạo');
      const title=document.createElement('h1');title.textContent='KHÔNG XONG! QUÁI THỰC HIỆN TỰ BẠO!';
      const text=document.createElement('p');text.textContent='Hi sinh toàn bộ MP và gần toàn bộ HP để thực hiện đòn tất sát. Sau khi kích hoạt: 1 HP / 0 MP, không hồi MP.';
      const icons=document.createElement('div');icons.className='khang-ritual-icons';
      for(const [file,name] of [['giang-the-icon','Thủy Long Giáng Thế'],['bat-dai-icon','Bát Đại Hải Long']]){
        const image=document.createElement('img');image.src=`/assets/characters/mage/khang-chien-finale/${file}.png`;image.alt=name;icons.append(image);
      }
      const keys=document.createElement('strong');keys.textContent='BẤM Q + E · ĐỒNG THỜI HOẶC LIÊN TIẾP TRONG 0,6 GIÂY';
      card.append(title,text,icons,keys);this.panel.append(card);return;
    }
    const heading=document.createElement('h1');heading.textContent=['ready','briefing'].includes(s.phase)?'PHÁP SƯ · CẤP 15':s.phase==='complete'?'GIỌT NƯỚC CUỐI LÀNG':s.failureReason==='barrier'?'KẾT GIỚI ĐÃ VỠ':'TRẬN CHIẾN DANG DỞ';
    const description=document.createElement('p');description.textContent=['ready','briefing'].includes(s.phase)?STORY.briefing:s.phase==='complete'?STORY.complete:s.failureReason==='barrier'?STORY.barrierFailed:STORY.failed;
    card.append(heading,description);
    if(['ready','briefing'].includes(s.phase)){
      for(const line of [STORY.prelude,STORY.vow]){const p=document.createElement('p');p.className='khang-stage-controls';p.textContent=line;card.append(p);}
      const details=document.createElement('details');details.className='khang-stage-details';
      const summary=document.createElement('summary');summary.textContent='Thông số và quy tắc chiến đấu';details.append(summary);
      const stats=s.run.character!.stats,grid=document.createElement('dl');
      for(const [name,value] of [['HP',stats.maxHp],['MP',stats.maxMp],['Công kích',stats.atk],['Phòng thủ',stats.def],['Hồi MP / giây',stats.mpRegen],['Bạo kích',`${stats.critChance*100}%`]] as const){
        const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=typeof value==='number'?value.toLocaleString('vi-VN'):value;grid.append(dt,dd);
      }details.append(grid);
      const controls=document.createElement('p');controls.className='khang-stage-controls';controls.textContent=matchMedia('(pointer:coarse)').matches
        ?'Chơi màn ngang · Joystick trái: di chuyển · Đánh/Q/E/R ở bên phải\nChạm kỹ năng: chọn quái gần nhất · Kéo từ nút để ngắm\nKhi boss tự bạo: chạm Q + E, rồi chạm Q đủ 10 lần'
        :'WASD: di chuyển · Giữ / thả chuột: Thủy Pháo\nQ: rồng nước · E READY: click đặt đầm · R: sao chép\nC: xem nhân vật · Bảo vệ kết giới và hạ 100 quái';card.append(controls);
      const skillBuff=document.createElement('p');skillBuff.className='khang-stage-controls';skillBuff.textContent='Buff Kháng Chiến: click bắn Thủy Pháo vận tối đa, mỗi 1,5s, đẩy lùi nhẹ. Dùng 4 Q thành công để cường hóa Q thứ 5 thành Thủy Ngục. READY chỉ dành cho E. Đầm E tăng 30% bán kính gốc mỗi ải sau ải 1.';details.append(skillBuff);
      const finaleHint=document.createElement('p');finaleHint.className='khang-stage-controls';finaleHint.textContent='Boss còn 40% HP sẽ cuộn lại chuẩn bị tự bạo. Giữ Q+E để hi sinh còn 1 HP / 0 MP. Bấm Q đủ 10 lần bồi sức mạnh cho quả cầu E, phóng Thủy Long Giáng Thế rồi Bát Đại Hải Long.';details.append(finaleHint);
      const warning=document.createElement('p');warning.className='khang-stage-controls';warning.textContent=`Kết giới chỉ có ${B.barrier.hp.toLocaleString('vi-VN')} HP, không tự hồi. Ra ngoài để quái đuổi theo bạn; nấp bên trong sẽ khiến chúng đánh kết giới.`;details.append(warning);card.append(details);
    }
    const button=document.createElement('button');button.type='button';button.textContent=['ready','briefing'].includes(s.phase)?'Bắt đầu Kháng Chiến':'Chơi lại từ kết giới';
    button.onclick=['ready','briefing'].includes(s.phase)?this.start:this.retry;card.append(button);
    if(import.meta.env.VITE_STAGE_ONLY!=='1'){
      const back=document.createElement('a');back.href='/?sandbox=1&character=mage';back.textContent='Về Sandbox';card.append(back);
    }
    this.panel.append(card);button.focus({preventScroll:true});
  }
  destroy(){this.root.remove();this.parent.classList.remove('khang-stage-active');}
}
