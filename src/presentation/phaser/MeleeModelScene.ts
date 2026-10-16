import Phaser from 'phaser';
import { MAPS } from '../../world/definitions';
import { applyCharacterTextureScale } from '../animations/characterTextures';
import { MELEE_JOBS, MELEE_MODELS, MELEE_FACINGS, MELEE_COMBAT_POSES, isMeleeJob, preloadMeleeModels,
  createMeleeModelTextures, type MeleeJob, type MeleeFacing, type MeleePose } from '../animations/meleeModel';
import './melee-model.css';
import { AssetLoadGuard } from './AssetLoadGuard';

interface ModelActor { job: MeleeJob; sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse; label: Phaser.GameObjects.Text }
const POSE_LABELS: Record<MeleePose, string> = { idle: 'Đứng', run: 'Chạy', ready: 'Thủ thế', windup: 'Vận lực', strike: 'Ra đòn', guard: 'Đỡ đòn' };
const FACING_LABELS: Record<MeleeFacing, string> = { down: 'Trước', right: 'Phải', up: 'Sau', left: 'Trái' };

/** Model rehearsal only. Combat progression stays in each playable job's run. */
export class MeleeModelScene extends Phaser.Scene {
  private actors: ModelActor[] = [];
  private selected: MeleeJob = 'warrior';
  private facing: MeleeFacing = 'down';
  private pose: MeleePose = 'idle';
  private panel!: HTMLElement;
  private status!: HTMLElement;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private attackAt?: number;
  private devOpen = false;
  private abort = new AbortController();
  private assets!: AssetLoadGuard;
  constructor() { super('MeleeModelScene'); }
  preload() { this.assets = new AssetLoadGuard(this, ['melee-model-map']);
    this.load.image('melee-model-map', MAPS.village.url); preloadMeleeModels(this); }
  create() {
    if (this.assets.failed) { this.assets.showRecovery(); return; }
    const requested = new URLSearchParams(location.search).get('character');
    if (isMeleeJob(requested)) this.selected = requested;
    for (const job of MELEE_JOBS) createMeleeModelTextures(this, job);
    const map = MAPS.village;
    if (this.textures.exists('melee-model-map')) this.add.image(0, 0, 'melee-model-map').setOrigin(0).setDisplaySize(map.width, map.height).setDepth(-100);
    else this.add.rectangle(map.width / 2, map.height / 2, map.width, map.height, 0x314d37).setDepth(-100);
    this.actors = MELEE_JOBS.map((job, i) => {
      const x = 850 + (i - 1) * 125, y = 740;
      const shadow = this.add.ellipse(x, y - 2, job === 'fighter' ? 47 : 40, 14, 0x07130f, .45);
      const sprite = this.add.sprite(x, y, `${job}-idle-down`); applyCharacterTextureScale(sprite);
      const label = this.add.text(x, y + 14, MELEE_MODELS[job].name, { fontFamily: 'Segoe UI', fontSize: '12px',
        color: MELEE_MODELS[job].color, backgroundColor: '#0b171ce6', padding: { x: 8, y: 5 } }).setOrigin(.5, 0);
      return { job, sprite, shadow, label };
    });
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.mountPanel(); this.layout(); this.scale.on('resize', this.layout, this);
    this.input.keyboard!.on('keydown-Q', (event: KeyboardEvent) => { if (!event.repeat && this.canInput()) this.attackAt = this.time.now; });
    this.input.keyboard!.on('keydown-SPACE', (event: KeyboardEvent) => { if (!event.repeat && this.canInput()) this.setPose('guard'); });
    const dev = (open: boolean) => { this.devOpen = open; this.releaseInput(); };
    this.game.events.on('dev-menu-open', dev);
    window.addEventListener('blur', () => this.releaseInput(), { signal: this.abort.signal });
    document.addEventListener('visibilitychange', () => this.releaseInput(), { signal: this.abort.signal });
    document.addEventListener('pointerdown', e => { if (!(e.target instanceof HTMLCanvasElement)) this.releaseInput(); }, { signal: this.abort.signal });
    this.events.once('shutdown', () => { this.abort.abort(); this.panel.remove(); this.scale.off('resize', this.layout, this);
      this.game.events.off('dev-menu-open', dev); });
    this.syncPanel();
  }
  private layout() {
    const { width, height } = this.scale;
    const top = width < 560 ? 154 : 118, bottom = width < 560 ? 190 : 168;
    const available = Math.max(150, height - top - bottom);
    const zoom = Math.max(.55, Math.min(2.35, width / 445, available / 155));
    this.cameras.main.setZoom(zoom).centerOn(850, 740 + ((top - bottom) / 2) / zoom);
  }
  private mountPanel() {
    const panel = document.createElement('section'); panel.className = 'melee-model-room'; this.panel = panel;
    panel.innerHTML = '<header><p class="eyebrow">TẠO HÌNH NHÂN VẬT</p><h1>Hỏa · Thổ · Kim</h1><p>Ba vóc dáng, ba vũ khí. Chọn nhân vật rồi thử chuyển động.</p></header>';
    const picker = document.createElement('div'); picker.className = 'model-picker'; picker.setAttribute('aria-label', 'Chọn nhân vật');
    for (const job of MELEE_JOBS) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.job = job;
      button.style.setProperty('--model-color', MELEE_MODELS[job].color);
      button.innerHTML = `<strong>${MELEE_MODELS[job].name}</strong><span>${MELEE_MODELS[job].description}</span>`;
      button.onclick = () => { this.selected = job; this.releaseInput(); this.attackAt = undefined;
        history.replaceState(null, '', `?character=${job}&model=1`); this.syncPanel(); button.blur(); };
      picker.append(button);
    }
    panel.querySelector('header')!.append(picker);
    const controls = document.createElement('footer');
    const directions = document.createElement('div'); directions.className = 'model-control-row';
    directions.setAttribute('aria-label', 'Hướng nhìn');
    for (const facing of MELEE_FACINGS) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = FACING_LABELS[facing]; b.dataset.facing = facing;
      b.onclick = () => { this.facing = facing; this.attackAt = undefined; this.syncPanel(); b.blur(); }; directions.append(b);
    }
    const poses = document.createElement('div'); poses.className = 'model-control-row'; poses.setAttribute('aria-label', 'Tư thế');
    for (const pose of ['idle', 'run', ...MELEE_COMBAT_POSES] as const) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = POSE_LABELS[pose]; b.dataset.pose = pose;
      b.onclick = () => { this.setPose(pose); b.blur(); }; poses.append(b);
    }
    const extra = document.createElement('div'); extra.className = 'model-room-extra';
    const attack = document.createElement('button'); attack.type = 'button'; attack.textContent = 'Thử đòn · Q';
    attack.onclick = () => { this.attackAt = this.time.now; attack.blur(); };
    const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Về vị trí';
    reset.onclick = () => { this.actors.forEach((a, i) => a.sprite.setPosition(850 + (i - 1) * 125, 740));
      this.releaseInput(); this.facing = 'down'; this.setPose('idle'); reset.blur(); };
    const gallery = document.createElement('a'); gallery.href = '/outputs/melee-models/review.html'; gallery.textContent = 'Xem đủ 72 tư thế';
    extra.append(attack, reset, gallery); this.status = document.createElement('p'); this.status.className = 'model-room-status';
    controls.append(directions, poses, extra, this.status); panel.append(controls); document.querySelector('#app')!.append(panel);
  }
  private syncPanel() {
    this.panel.querySelectorAll<HTMLButtonElement>('[data-job]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.job === this.selected)));
    this.panel.querySelectorAll<HTMLButtonElement>('[data-facing]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.facing === this.facing)));
    this.panel.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pose === this.pose)));
    this.status.textContent = `${MELEE_MODELS[this.selected].name} · ${POSE_LABELS[this.pose]} · WASD / phím mũi tên để di chuyển`;
  }
  private setPose(pose: MeleePose) { this.pose = pose; this.attackAt = undefined; this.releaseInput(); this.syncPanel(); }
  private releaseInput() { this.input.keyboard?.resetKeys(); }
  private canInput() { return !this.devOpen && !document.hidden && !(document.activeElement instanceof HTMLButtonElement); }
  update(time: number, delta: number) {
    if (!this.keys) return;
    const moving = { x: 0, y: 0 };
    if (this.canInput()) {
      moving.x = Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown);
      moving.y = Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown);
    }
    const distance = Math.hypot(moving.x, moving.y);
    if (distance) {
      this.attackAt = undefined;
      const actor = this.actors.find(a => a.job === this.selected)!;
      const step = 150 * Math.min(delta, 50) / 1000;
      const visible = this.cameras.main.worldView;
      actor.sprite.x = Phaser.Math.Clamp(actor.sprite.x + moving.x / distance * step, visible.x + 80, visible.right - 80);
      actor.sprite.y = Phaser.Math.Clamp(actor.sprite.y + moving.y / distance * step, 720, 780);
      const facing: MeleeFacing = Math.abs(moving.x) > Math.abs(moving.y) ? moving.x < 0 ? 'left' : 'right' : moving.y < 0 ? 'up' : 'down';
      if (facing !== this.facing) { this.facing = facing; this.syncPanel(); }
    }
    const attackElapsed = this.attackAt === undefined ? undefined : time - this.attackAt;
    if (attackElapsed !== undefined && attackElapsed > 800) this.attackAt = undefined;
    for (const a of this.actors) {
      let pose = distance && a.job === this.selected ? 'run' : this.pose;
      if (attackElapsed !== undefined && attackElapsed <= 800) pose = attackElapsed < 140 ? 'ready' : attackElapsed < 450 ? 'windup' : attackElapsed < 650 ? 'strike' : 'guard';
      const combat = pose !== 'run' && pose !== 'idle';
      const key = pose === 'idle' ? `${a.job}-idle-${this.facing}` : pose === 'run'
        ? `${a.job}-run-${this.facing}-${Math.floor(time / 120) % 4}` : `${a.job}-${pose}`;
      a.sprite.setTexture(key).setFlipX(combat && this.facing === 'left').setDepth(a.sprite.y);
      applyCharacterTextureScale(a.sprite);
      a.shadow.setPosition(a.sprite.x, a.sprite.y - 2).setDepth(a.sprite.y - 1);
      a.label.setPosition(a.sprite.x, a.sprite.y + 14).setDepth(a.sprite.y + 1);
      a.label.setAlpha(a.job === this.selected ? 1 : .8);
    }
  }
}
