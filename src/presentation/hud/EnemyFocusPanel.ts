import { ELEMENT_PRESENTATION, type EnemyHudModel } from './enemyHudModel';

export class EnemyFocusPanel {
  private root: HTMLElement;
  private name: HTMLElement;
  private element: HTMLElement;
  private health: HTMLElement;
  private fill: HTMLElement;
  private amount: HTMLElement;
  private status: HTMLElement;
  private meta: HTMLElement;
  private portrait: HTMLImageElement;
  constructor(parent: HTMLElement) {
    this.root = document.createElement('section');
    this.root.className = 'enemy-focus'; this.root.hidden = true;
    this.root.setAttribute('aria-label', 'Mục tiêu quái');
    this.root.innerHTML = `<div class="enemy-focus-heading"><span class="hud-eyebrow"><span aria-hidden="true">⌖</span> MỤC TIÊU</span><span class="enemy-focus-element"></span></div>
      <div class="enemy-focus-body"><div class="enemy-focus-avatar"><img alt="" hidden><span aria-hidden="true">⌖</span></div><div class="enemy-focus-data"><strong class="enemy-focus-name"></strong><div class="enemy-focus-health" role="meter" aria-label="HP quái" aria-valuemin="0"><i></i><span></span></div></div></div>
      <div class="enemy-focus-meta"></div><div class="enemy-focus-status"></div>`;
    parent.append(this.root);
    this.name = this.root.querySelector('.enemy-focus-name')!;
    this.element = this.root.querySelector('.enemy-focus-element')!;
    this.health = this.root.querySelector('.enemy-focus-health')!;
    this.fill = this.health.querySelector('i')!; this.amount = this.health.querySelector('span')!;
    this.status = this.root.querySelector('.enemy-focus-status')!;
    this.meta = this.root.querySelector('.enemy-focus-meta')!;
    this.portrait = this.root.querySelector('.enemy-focus-avatar img')!;
  }
  update(model?: EnemyHudModel): void {
    this.root.hidden = !model; if (!model) return;
    this.root.dataset.enemyId = model.id;
    const element = ELEMENT_PRESENTATION[model.element];
    this.root.style.setProperty('--enemy-element', element.color);
    this.name.textContent = model.name; this.element.textContent = `Hệ ${element.name}`;
    this.portrait.hidden = !model.portrait;
    this.root.querySelector<HTMLElement>('.enemy-focus-avatar span')!.hidden = !!model.portrait;
    if (model.portrait && this.portrait.getAttribute('src') !== model.portrait) this.portrait.src = model.portrait;
    this.fill.style.transform = `scaleX(${model.ratio})`;
    const amount = `${Math.ceil(model.hp)} / ${Math.ceil(model.maxHp)} HP`;
    this.amount.textContent = amount;
    this.health.setAttribute('aria-valuenow', String(model.hp));
    this.health.setAttribute('aria-valuemax', String(model.maxHp));
    this.health.setAttribute('aria-valuetext', amount);
    this.meta.textContent = `${model.role}${model.playerThreat > 0 ? ` · Thù hận với bạn: ${Math.ceil(model.playerThreat)}` : ''}`;
    this.status.textContent = model.status;
  }
}
