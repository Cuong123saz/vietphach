import type { MageRuntime } from '../../gameplay/characters/jobs/mage/MageRuntime';
import type { PotentialKey } from '../../gameplay/characters/core/Potential';
import { WATER_MAGE_TUNING as T, WATER_MAGE_RULES as R } from '../../config/balance/waterMage';
import { WATER_MAGE_PASSIVE } from '../../config/balance/waterCannon';
import { MAGE_BALANCE as B } from '../../config/balance/mage';
import { HUD_SKILLS, SKILL_ART, SKILL_INFO, SPECIAL_STATE_FRAME, EVOLUTION_ART, waterMageHudVisuals, numberText as num, secondsText as seconds, waterMageHudModel, waterMageSkillInfo, type HudSkill, type StageFinaleQView } from './waterMageHudModel';
import { waterLongProfile, activeWaterSwamp } from '../../gameplay/characters/jobs/mage/WaterLongRules';
import './hud.css';
import './hud-compact.css';
import { bindHudImageRecovery } from './imageRecovery';
import { RUN_BALANCE } from '../../config/balance/core';
import { experienceRequired } from '../../gameplay/progression/Level';
import { evolutionProgress, type EvolutionLevel } from '../../gameplay/progression/Evolution';
import { WATER_MAGE_EVOLUTION } from '../../gameplay/characters/jobs/mage/WaterMageEvolution';
import { EnemyFocusPanel } from './EnemyFocusPanel';
import type { EnemyHudModel } from './enemyHudModel';
import type { CastResult } from '../../gameplay/characters/jobs/mage/WaterMageSkills';
import { waterUltimateKind } from '../../gameplay/characters/jobs/mage/WaterHumanRules';

type PanelTab = 'overview' | 'skills' | 'potential' | 'evolution';
const PORTRAIT = '/assets/characters/mage/idle-down.png';
const potentialLabels: Record<PotentialKey, string> = {
  strength: 'Sức mạnh', dexterity: 'Khéo léo', spirit: 'Tinh thần', vitality: 'Sức khỏe', luck: 'May mắn',
};
const potentialEffects: Record<PotentialKey, string> = {
  strength: 'Hiện chưa thay đổi chỉ số Pháp Sư.',
  dexterity: `Mỗi điểm: +${num(B.dexDef)} DEF, +${B.dexAttackSpeed} điểm tốc đánh.`,
  spirit: `Mỗi điểm: +${num(B.spiritAtk)} ATK, +${B.spiritMp} Max MP, +${num(B.spiritRegen)} MP/s.`,
  vitality: `Mỗi điểm: +${B.vitalityHp} Max HP.`,
  luck: 'Tăng tỷ lệ chí mạng với hiệu quả giảm dần.',
};
const fields = (name: string, tag = 'span') => `<${tag} data-hud-field="${name}"></${tag}>`;
const statRow = (name: string, field: string) => `<div><dt>${name}</dt><dd>${fields(field)}</dd></div>`;

/** DOM UI reads the active Mage; the caller owns all input and gameplay mutations. */
export class CombatHud {
  private root: HTMLDivElement;
  private enemyFocus: EnemyFocusPanel;
  private lastEnemyUpdate = -Infinity;
  private dialog: HTMLDialogElement;
  private content: HTMLElement;
  private tab: PanelTab = 'overview';
  private skill: HudSkill = 'q';
  private lastUpdate = -Infinity;
  private feedbackUntil = 0;
  private lastFeedback = '';
  private priorFocus?: HTMLElement;
  private onInputBlock: (blocked: boolean) => void;
  private onAllocate: (key: PotentialKey, amount: number) => void;
  private onEvolution: (level:EvolutionLevel,id:string)=>void;
  private getMage: () => MageRuntime;
  private getTime: () => number;
  private getFinaleQ?:()=>StageFinaleQView|undefined;
  private getUltimateStatus?:()=>CastResult;
  private dockButtons = new Map<HudSkill, HTMLButtonElement>();
  private keyHandler: (event: KeyboardEvent) => void;
  private fieldNodes = new Map<string, HTMLElement[]>();
  private removeImageRecovery: () => void;

  constructor(parent: HTMLElement, options: { getMage: () => MageRuntime; getTime: () => number;
    onInputBlock: (blocked: boolean) => void; onAllocate: (key: PotentialKey, amount: number) => void;
    onEvolution: (level:EvolutionLevel,id:string)=>void; getFinaleQ?:()=>StageFinaleQView|undefined; getUltimateStatus?:()=>CastResult; portrait?: string }) {
    this.getMage = options.getMage; this.getTime = options.getTime;
    this.getFinaleQ=options.getFinaleQ;
    this.getUltimateStatus=options.getUltimateStatus;
    this.onInputBlock = options.onInputBlock; this.onAllocate = options.onAllocate;
    this.onEvolution=options.onEvolution;
    const portrait = options.portrait ?? PORTRAIT;
    this.root = document.createElement('div'); this.root.className = `combat-hud${options.portrait ? ' mage-model-v2' : ''}`;
    this.removeImageRecovery=bindHudImageRecovery(this.root);
    this.root.innerHTML = `
      <section class="hud-vitals" aria-label="Nhân vật và tài nguyên">
        <div class="hud-portrait-wrap"><button type="button" class="hud-avatar" aria-label="Mở bảng nhân vật (C)" title="Nhân vật · C"><img src="${portrait}" alt=""><kbd>C</kbd></button><span class="hud-level" aria-label="Cấp nhân vật">${fields('level')}</span></div>
        <div class="hud-resources"><div class="hud-identity"><strong>Pháp Sư Thủy</strong><span class="hud-element">Hệ Thủy</span></div>
          <div class="hud-meter hp" role="meter" aria-label="HP" aria-valuemin="0"><i></i><span>HP ${fields('hp')}</span></div>
          <div class="hud-meter mp" role="meter" aria-label="MP" aria-valuemin="0"><i></i><span>MP ${fields('mp')}</span></div>
          <div class="hud-shield">Khiên +${fields('shield')}</div>
          <button type="button" class="hud-progression" aria-label="Xem cấp và điểm tiềm năng"><span>${fields('experience')}</span><strong>${fields('unspent')} điểm</strong><i class="hud-exp-track"><i></i></i></button></div>
      </section>
      <div class="hud-effects" aria-label="Hiệu ứng đang tồn tại"></div>
      <div class="hud-feedback" role="status" aria-live="polite"></div>
      <nav class="hud-dock" aria-label="Kỹ năng — nhấn icon để xem chi tiết">
        <button type="button" class="hud-mach" data-skill="passive" aria-label="Chi tiết Thủy Mạch">
          <span class="hud-skill-art"><img class="hud-skill-icon" src="${SKILL_ART('passive')}" alt=""><img class="hud-special-frame" src="${SPECIAL_STATE_FRAME}" alt="" aria-hidden="true"></span><span class="hud-skill-name">Thủy Mạch</span><strong>${fields('mach')}</strong><span class="hud-passive-status"></span>
        </button>
        ${HUD_SKILLS.filter(key => key !== 'passive').map(key => `<button type="button" class="hud-skill" data-skill="${key}" aria-label="Chi tiết ${SKILL_INFO[key].name}" title="${SKILL_INFO[key].name} · Xem chi tiết">
          <span class="hud-skill-art"><img class="hud-skill-icon" src="${SKILL_ART(key)}" alt=""><i class="hud-cooldown"></i>${key === 'basic' ? `<img class="hud-special-frame" src="${SPECIAL_STATE_FRAME}" alt="" aria-hidden="true">` : ''}<kbd>${key === 'basic' ? 'Chuột' : key.toUpperCase()}</kbd></span><span class="hud-skill-name">${key === 'basic' ? 'Thủy Pháo' : key === 'q' ? 'Thần Long' : key === 'e' ? 'Thủy Hộ' : 'Thủy Kính'}</span>
          <span class="hud-cost">${key === 'basic' ? '0 MP' : `${T[key].mpCost} MP`}</span><span class="hud-skill-state"></span>
        </button>`).join('')}
      </nav>
      <dialog class="character-panel" aria-labelledby="character-title">
        <header><div><span class="hud-eyebrow">VIỆT PHÁCH · NHÂN VẬT</span><h1 id="character-title">Pháp Sư Thủy</h1></div><button type="button" class="hud-close" aria-label="Đóng bảng nhân vật">×</button></header>
        <nav class="character-tabs" role="tablist" aria-label="Bảng nhân vật">
          ${([['overview', 'Thông tin'], ['skills', 'Kỹ năng'], ['potential', 'Tiềm năng'], ['evolution', 'Tiến hóa']] as const).map(([key, label]) => `<button type="button" role="tab" id="character-tab-${key}" aria-controls="character-content" data-tab="${key}">${label}</button>`).join('')}
        </nav>
        <div class="character-body"><aside class="character-portrait"><div class="portrait-crop"><img src="${portrait}" alt="Pháp Sư Thủy cầm trượng"></div><strong>Pháp Sư Thủy</strong><span>Hệ Thủy · Cấp ${fields('level')}</span><dl>${statRow('HP', 'hp')}${statRow('MP', 'mp')}${statRow('Khiên', 'shield')}${statRow('Mạch', 'mach')}</dl></aside><section id="character-content" class="character-content" role="tabpanel"></section></div>
      </dialog>`;
    parent.append(this.root);
    const targetGroup = document.createElement('div'); targetGroup.className = 'hud-target-group';
    this.root.append(targetGroup);
    this.enemyFocus = new EnemyFocusPanel(targetGroup);
    targetGroup.append(this.root.querySelector('.hud-effects')!);
    this.dialog = this.root.querySelector('dialog')!;
    this.content = this.root.querySelector('#character-content')!;
    this.root.querySelector<HTMLButtonElement>('.hud-avatar')!.onclick = () => this.open('overview');
    this.root.querySelector<HTMLButtonElement>('.hud-progression')!.onclick = () => this.open('potential');
    this.root.querySelector<HTMLButtonElement>('.hud-close')!.onclick = () => this.dialog.close();
    this.root.querySelectorAll<HTMLButtonElement>('[data-skill]').forEach(button => {
      const key = button.dataset.skill as HudSkill; this.dockButtons.set(key, button);
      button.onclick = () => { this.skill = key; this.open('skills'); };
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => {
      button.onclick = () => this.selectTab(button.dataset.tab as PanelTab);
      button.onkeydown = event => {
        const tabs = [...this.root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
        const index = tabs.indexOf(button);
        const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
        if (next >= 0) { event.preventDefault(); tabs[next].click(); tabs[next].focus(); }
      };
    });
    this.dialog.addEventListener('click', event => { if (event.target === this.dialog) {
      const rect = this.dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.dialog.close();
    } });
    this.dialog.addEventListener('close', () => { this.onInputBlock(false); this.priorFocus?.focus(); });
    this.dialog.addEventListener('keydown', event => event.stopPropagation());
    this.keyHandler = event => {
      if (event.key.toLowerCase() !== 'c' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable],.dev-menu')) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (this.dialog.open) this.dialog.close(); else this.open('overview');
    };
    window.addEventListener('keydown', this.keyHandler, true);
    this.selectTab('overview');
    this.update('', true);
  }

  private open(tab: PanelTab) {
    if (!this.dialog.open) {
      this.priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      this.onInputBlock(true); this.dialog.showModal();
    }
    this.selectTab(tab);
    this.root.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`)!.focus();
  }
  private selectTab(tab: PanelTab) {
    this.tab = tab;
    this.root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === tab;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    });
    this.content.setAttribute('aria-labelledby', `character-tab-${tab}`);
    if (tab === 'overview') {
      this.content.innerHTML = `<span class="hud-eyebrow">CHỈ SỐ HIỆN TẠI</span><h2>Sức mạnh nhân vật</h2><dl class="character-stats">
        ${statRow('Tấn công · ATK', 'atk')}${statRow('Phòng thủ · DEF', 'def')}${statRow('Hồi MP / giây', 'regen')}${statRow('Tỷ lệ chí mạng', 'crit')}${statRow('Sát thương chí mạng', 'critDamage')}${statRow('Điểm tốc đánh', 'speedRating')}${statRow('Khoảng đánh', 'interval')}${statRow('Tốc chạy', 'moveSpeed')}
        </dl><div class="character-note"><strong>Hiệu ứng hiện tại</strong><p>${fields('effects')}</p><p>${fields('shieldDetails')}</p></div><p class="hud-muted">Chỉ số đã bao gồm tiềm năng và buff đang tồn tại. HP/MP giữ tỷ lệ khi chỉ số tối đa thay đổi.</p>`;
    } else if (tab === 'skills') {
      this.content.innerHTML = `<div class="character-skills"><nav class="character-skill-list" aria-label="Chọn kỹ năng">${HUD_SKILLS.map(key => `<button type="button" data-detail-skill="${key}"><img src="${SKILL_ART(key)}" alt=""><span><small>${SKILL_INFO[key].key}</small>${SKILL_INFO[key].name}</span></button>`).join('')}</nav><article class="skill-detail"></article></div>`;
      this.content.querySelectorAll<HTMLButtonElement>('[data-detail-skill]').forEach(button => {
        button.onclick = () => { this.skill = button.dataset.detailSkill as HudSkill; this.renderSkill(); this.refreshFields(); this.update('', true); };
      });
      this.renderSkill();
    } else if (tab === 'evolution') {
      this.content.innerHTML = `<span class="hud-eyebrow">MỐC PHÁT TRIỂN</span><h2>Tiến hóa Pháp Sư Thủy</h2><p class="hud-muted">A1 · Thủy Nhân Mạch → Bát Đại Hải Long. B1 · Thủy Long Mạch → Thủy Long Giáng Thế. A2 và B2 đang khóa.</p><p class="hud-muted">Chọn từng mốc theo thứ tự khi đủ cấp. Cấp 15: READY + Q+E rồi click chọn tâm để dùng đại chiêu.</p><ol class="evolution-milestones">${WATER_MAGE_EVOLUTION.map(m => `
        <li data-evolution-level="${m.level}"><div class="evolution-heading"><strong>Cấp ${m.level} · ${m.title}</strong><span data-evolution-status></span></div>
          <ul class="evolution-options">${m.options.map(o => `<li class="${o.locked?'evolution-option-locked':''}" data-evolution-option="${o.id}">
            <span class="evolution-option-title">${EVOLUTION_ART[o.id] ? `<img src="${EVOLUTION_ART[o.id]}" alt="">` : ''}<span>${o.title}${o.locked?' <strong>· Khóa</strong>':!o.implemented?' · Đang chuẩn bị':''}${o.description?`<small class="evolution-description">${o.description}</small>`:''}</span></span>
            ${o.implemented && !o.locked?`<button type="button" data-evolution-choice="${o.id}" data-level="${m.level}" aria-label="Chọn ${o.title} cấp ${m.level}">Chọn</button>`:''}
          </li>`).join('')}</ul>
        </li>`).join('')}</ol>`;
      this.content.querySelectorAll<HTMLButtonElement>('[data-evolution-choice]').forEach(button=>{
        button.onclick=()=>{this.onEvolution(Number(button.dataset.level) as EvolutionLevel,button.dataset.evolutionChoice!);this.selectTab('evolution');this.root.querySelector<HTMLButtonElement>('[data-tab="evolution"]')!.focus();};
      });
    } else {
      this.content.innerHTML = `<span class="hud-eyebrow">PHÂN BỔ TRONG RUN</span><h2>Tiềm năng</h2><p>${fields('experience')} · Cấp ${fields('level')}/${RUN_BALANCE.maxLevel}</p><p class="potential-budget">Còn ${fields('unspent', 'strong')} điểm · Đã nhận ${fields('earned')}</p><div class="potential-rows">${(Object.keys(potentialLabels) as PotentialKey[]).map(key => `<div class="potential-row"><div><strong>${potentialLabels[key]}</strong><p>${potentialEffects[key]}</p></div><span>${fields(key)}</span><div class="potential-actions"><button type="button" data-allocate="${key}" aria-label="Cộng 1 ${potentialLabels[key]}">+1</button><button type="button" data-potential-toggle="${key}" aria-label="Nhập điểm ${potentialLabels[key]}" aria-expanded="false" aria-controls="potential-form-${key}">Nhập điểm</button></div><form id="potential-form-${key}" class="potential-form" data-potential-form="${key}" hidden novalidate><label for="potential-input-${key}">Số điểm ${potentialLabels[key]}<input id="potential-input-${key}" type="number" inputmode="numeric" min="1" step="1" value="1" aria-describedby="potential-message-${key}"></label><button type="submit" data-allocate-submit aria-label="Cộng điểm ${potentialLabels[key]}">Cộng điểm</button><p id="potential-message-${key}" class="potential-message" role="status" aria-live="polite"></p></form></div>`).join('')}</div><p class="hud-muted">Cấp 1: ${RUN_BALANCE.initialPotential} điểm. Mỗi lần lên cấp: +${RUN_BALANCE.potentialPerLevel} điểm tiềm năng. Cấp ${RUN_BALANCE.maxLevel}: tổng ${RUN_BALANCE.initialPotential+(RUN_BALANCE.maxLevel-1)*RUN_BALANCE.potentialPerLevel} điểm. Cộng điểm dùng ngân sách của run hiện tại.</p>`;
      this.content.querySelectorAll<HTMLButtonElement>('[data-allocate]').forEach(button => {
        button.onclick = () => { if (this.getMage().progression.potential.unspent > 0) { this.onAllocate(button.dataset.allocate as PotentialKey, 1); this.update('', true); } };
      });
      this.content.querySelectorAll<HTMLFormElement>('[data-potential-form]').forEach(form => {
        const key = form.dataset.potentialForm as PotentialKey;
        const input = form.querySelector<HTMLInputElement>('input')!;
        const message = form.querySelector<HTMLElement>('.potential-message')!;
        const toggle = this.content.querySelector<HTMLButtonElement>(`[data-potential-toggle="${key}"]`)!;
        toggle.onclick = () => {
          form.hidden = !form.hidden;
          toggle.setAttribute('aria-expanded', String(!form.hidden));
          toggle.textContent = form.hidden ? 'Nhập điểm' : 'Đóng nhập';
          if (!form.hidden) { input.focus(); input.select(); }
        };
        input.oninput = () => { input.removeAttribute('aria-invalid'); message.textContent = ''; };
        form.onsubmit = event => {
          event.preventDefault();
          const amount = input.valueAsNumber, remaining = this.getMage().progression.potential.unspent;
          if (!Number.isSafeInteger(amount) || amount < 1 || amount > remaining) {
            input.setAttribute('aria-invalid', 'true');
            message.textContent = remaining === 0 ? 'Không còn điểm tiềm năng.' : `Nhập số nguyên từ 1 đến ${remaining}.`;
            input.focus(); return;
          }
          this.onAllocate(key, amount);
          input.removeAttribute('aria-invalid');
          message.textContent = `Đã cộng ${amount} điểm ${potentialLabels[key]}.`;
          this.update('', true);
        };
      });
    }
    this.root.querySelector('.character-body')!.scrollTop=0;
    this.refreshFields(); this.update('', true);
  }
  private renderSkill() {
    const key = this.skill,finale=key==='q'?this.getFinaleQ?.():undefined, info = waterMageSkillInfo(this.getMage(),key,finale),profile=waterLongProfile(this.getMage());
    this.content.querySelectorAll<HTMLButtonElement>('[data-detail-skill]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.detailSkill === key)));
    this.content.querySelector('.skill-detail')!.innerHTML = `<span class="hud-eyebrow">${info.key} · ${info.role}</span><h2>${info.name}</h2><p>${info.description}</p>
      <div class="skill-current"><span>Với chỉ số hiện tại</span><strong>${fields('skillCurrent')}</strong>${finale?'<small>0 MP · không hồi chiêu · tâm quả cầu đã khóa</small>':key === 'q' || key === 'e' || key === 'r' ? `<small>${T[key].mpCost} MP · hồi ${key==='q'?profile.qCooldown:T[key].cooldown}s${key === 'q' ? ` · tầm ${T.q.castRange}` : ''}</small>` : ''}</div>
      <ul>${info.rules.map(rule => `<li>${rule}</li>`).join('')}</ul><h3>Sao chép</h3><p>${info.copy}</p>
      <details class="skill-formula"><summary>Công thức & cách tính</summary><p>${info.formula}</p>${key === 'q' || key === 'basic' ? '<p>Sát thương nền chưa qua chí mạng, DEF, Ngũ Hành và khiên. Sát thương thực tế phụ thuộc địch trúng đòn.</p>' : ''}${key === 'r' ? '<p>Lượng được chụp từ chiêu gốc và CopyRate tại lúc dùng chiêu gốc. Hiệu ứng được phép sao chép giữ nguyên cơ chế.</p>' : ''}</details>
      ${key === 'q' || key === 'e' || key === 'r' ? '<p class="hud-muted">MP, hồi chiêu, tầm Q và bán kính hiện là thông số thử nghiệm V0.1.</p>' : ''}`;
  }
  private refreshFields() {
    this.fieldNodes.clear();
    this.root.querySelectorAll<HTMLElement>('[data-hud-field]').forEach(el => {
      const key = el.dataset.hudField!; this.fieldNodes.set(key, [...this.fieldNodes.get(key) ?? [], el]);
    });
  }
  private setField(key: string, value: string) {
    for (const el of this.fieldNodes.get(key) ?? []) if (el.textContent !== value) el.textContent = value;
  }
  showFeedback(message:string){
    this.lastFeedback=message;this.feedbackUntil=this.getTime()+3;this.update(message,true);
  }
  updateEnemyFocus(model?: EnemyHudModel,force=false) {
    const now = this.getTime(); if (!force && model && now-this.lastEnemyUpdate < .1) return;
    this.lastEnemyUpdate = now; this.enemyFocus.update(model);
  }
  update(feedback: string, force = false) {
    const now = this.getTime(),finale=this.getFinaleQ?.();
    if (!force && !finale && now - this.lastUpdate < .1) return;
    this.lastUpdate = now;
    const mage = this.getMage(), model = waterMageHudModel(mage, now,finale,this.getUltimateStatus?.()), s = mage.stats;
    const visual = waterMageHudVisuals(mage, now);
    const swamp=activeWaterSwamp(mage,now);
    const nextExp=experienceRequired(mage.progression.level);
    const effects = [model.ultimateHint,model.mirrors ? `Kính ${model.mirrors}/${R.mirrorCount} · ${seconds(model.mirrorRemaining)}` : '',
      ...model.links.map((link, i) => `Dây ${i + 1} · ${seconds(link.expiresAt - now)}`),
      mage.temporarySpirit ? `Tinh Thần +${mage.temporarySpirit} · ${seconds(model.spiritRemaining)}` : '',
      model.pendingCopies ? `${model.pendingCopies} bản sao đang chờ` : '',
      swamp?`Khô Mạch · Đầm ${seconds(swamp.expiresAt-now)} · gia hạn ${num(swamp.extension)}/2s`:''].filter(Boolean);
    const values: Record<string, string> = {
      level: String(mage.progression.level), hp: `${num(mage.resources.currentHp)} / ${num(s.maxHp)}`, mp: `${num(mage.resources.currentMp)} / ${num(s.maxMp)}`,
      shield: num(model.shield), mach: `${mage.mach}/${WATER_MAGE_PASSIVE.maxMach}${mage.mach === WATER_MAGE_PASSIVE.maxMach ? ' READY' : ''}`,
      atk: num(s.atk), def: num(s.def), regen: num(s.mpRegen), crit: `${num(s.critChance * 100)}%`, critDamage: `×${num(s.critDamage)}`,
      speedRating: num(s.attackSpeedRating), interval: seconds(s.attackInterval), moveSpeed: num(s.moveSpeed),
      unspent: String(mage.progression.potential.unspent), earned: String(mage.progression.potential.earned),
      experience: nextExp ? `EXP ${mage.progression.exp} / ${nextExp}` : `Cấp tối đa ${RUN_BALANCE.maxLevel}`,
      effects: effects.join(' · ') || 'Chưa có hiệu ứng tạm thời.', skillCurrent: model.details[this.skill],
      shieldDetails: model.shieldLayers.length ? `Lớp khiên: ${model.shieldLayers.map(layer => `${layer.skillId === 'water-e' ? 'Thủy Hộ' : 'Khiên'} ${num(layer.amount)} · ${seconds(layer.expiresAt-now)}`).join(' / ')}` : 'Không có lớp khiên đang tồn tại.',
      ...Object.fromEntries(Object.entries(mage.progression.potential.allocation).map(([key, value]) => [key, String(value)])),
    };
    for (const [key, value] of Object.entries(values)) this.setField(key, value);
    this.root.querySelector<HTMLElement>('.hud-exp-track')!.style.setProperty('--fill',String(nextExp?Math.min(1,mage.progression.exp/nextExp):1));
    if(this.tab==='evolution')for(const m of evolutionProgress(mage.progression,WATER_MAGE_EVOLUTION)){
      const row=this.content.querySelector<HTMLElement>(`[data-evolution-level="${m.level}"]`)!;
      row.classList.toggle('reached',mage.progression.level>=m.level);
      row.querySelector('[data-evolution-status]')!.textContent=m.choice?'Đã chọn':m.status==='locked'?`Chưa đạt cấp ${m.level}`:m.status==='waiting'?'Cần chọn mốc trước':m.status==='ready'?'Có thể chọn':'Đang chuẩn bị';
      row.querySelectorAll<HTMLButtonElement>('[data-evolution-choice]').forEach(button=>{
        button.disabled=m.status!=='ready' || !m.options.some(o=>o.id===button.dataset.evolutionChoice && o.implemented);
      });
    }
    for (const key of ['hp', 'mp'] as const) {
      const bar = this.root.querySelector<HTMLElement>(`.hud-meter.${key}`)!;
      const current = key === 'hp' ? mage.resources.currentHp : mage.resources.currentMp, max = key === 'hp' ? s.maxHp : s.maxMp;
      bar.style.setProperty('--fill', String(max > 0 ? Math.max(0, Math.min(1, current / max)) : 0));
      bar.setAttribute('aria-valuenow', String(current)); bar.setAttribute('aria-valuemax', String(max));
      bar.setAttribute('aria-valuetext', values[key]);
    }
    this.root.querySelector('.hud-shield')!.classList.toggle('active', model.shield > 0);
    const passive = this.dockButtons.get('passive')!;
    passive.dataset.machStage = String(visual.machStage);
    passive.classList.toggle('ready', visual.machReady);
    passive.classList.toggle('special', visual.machReady);
    passive.setAttribute('aria-label', `Chi tiết Thủy Mạch · ${values.mach}${model.skillStatus('passive') === 'Khô Mạch' ? ' · Khô Mạch' : ''}`);
    const dry=model.skillStatus('passive')==='Khô Mạch';
    passive.querySelector('strong')!.textContent=`${mage.mach}/${WATER_MAGE_PASSIVE.maxMach}`;
    passive.querySelector('.hud-passive-status')!.textContent=dry?'Khô Mạch':visual.machReady?'READY':'';
    passive.classList.toggle('dry',dry);
    if(dry){passive.classList.remove('ready','special');}
    const eButton = this.dockButtons.get('e')!;
    eButton.classList.toggle('empowered', visual.empoweredE);
    const eName=visual.empoweredE?'Thủy Hãm':waterMageSkillInfo(mage,'e',finale).name;
    eButton.title = `${eName} · Xem chi tiết`;
    eButton.querySelector('.hud-skill-name')!.textContent = eName;
    const eArt = SKILL_ART('e', visual.empoweredE);
    for (const img of this.root.querySelectorAll<HTMLImageElement>('[data-skill="e"] .hud-skill-icon, [data-detail-skill="e"] img')) {
      if (img.getAttribute('src') !== eArt) img.setAttribute('src', eArt);
    }
    for (const key of HUD_SKILLS.filter(key => key !== 'passive')) {
      const button = this.dockButtons.get(key)!, state = model.skillStatus(key);
      button.dataset.skillState = state;
      const stateEl = button.querySelector('.hud-skill-state')!; if (stateEl.textContent !== state) stateEl.textContent = state;
      const cd = key === 'basic' || key==='q' && (finale || mage.waterSkills.ultimate) ? 0 : Math.max(0, mage.waterSkills.cooldowns[key] - now) / (key === 'q' ? waterLongProfile(mage).qCooldown : T[key].cooldown);
      button.style.setProperty('--cooldown', String(Math.min(1, cd)));
      button.classList.toggle('unavailable', state === 'Thiếu MP' || state === 'Đã gục' || state === 'Khóa hồi chiêu');
      button.classList.toggle('charging', key === 'basic' && visual.fullCharge);
      button.classList.toggle('special', key === 'basic' && visual.fullCharge);
      const kind=waterUltimateKind(mage);
      const name=key==='q' && (finale || mage.waterSkills.ultimate)?kind==='eight'?'Bát Đại Hải Long':'Thủy Long Giáng Thế':key === 'e' && visual.empoweredE ? 'Thủy Hãm' : waterMageSkillInfo(mage,key,finale).name;
      button.setAttribute('aria-label', `Chi tiết ${name} · ${state}`);
      if(key==='q'){
        button.title=`${name} · Xem chi tiết`;button.querySelector('.hud-skill-name')!.textContent=name;
        const art=finale || mage.waterSkills.ultimate?(EVOLUTION_ART[kind==='eight'?'a1-15':'b1-15']??SKILL_ART('q')):SKILL_ART('q');
        for(const img of this.root.querySelectorAll<HTMLImageElement>('[data-skill="q"] .hud-skill-icon, [data-detail-skill="q"] img'))
          if(img.getAttribute('src')!==art)img.setAttribute('src',art);
      }
    }
    const effectEl = this.root.querySelector('.hud-effects')!, effectText = effects.join('  |  ');
    if (effectEl.textContent !== effectText) effectEl.textContent = effectText;
    const feedbackEl = this.root.querySelector('.hud-feedback')!;
    if(feedback && feedback !== this.lastFeedback){this.lastFeedback=feedback;this.feedbackUntil=now+3;}
    const message=now<this.feedbackUntil?this.lastFeedback:'';
    if(feedbackEl.textContent!==message)feedbackEl.textContent=message;
    if (this.tab === 'potential') {
      const remaining = mage.progression.potential.unspent;
      this.content.querySelectorAll<HTMLButtonElement>('[data-allocate], [data-allocate-submit]').forEach(button => { button.disabled = remaining === 0; });
      this.content.querySelectorAll<HTMLInputElement>('.potential-form input').forEach(input => { input.max = String(remaining); input.disabled = remaining === 0; });
    }
  }
  destroy() {
    this.removeImageRecovery();
    window.removeEventListener('keydown', this.keyHandler, true);
    if (this.dialog.open) this.dialog.close(); this.root.remove();
  }
}
