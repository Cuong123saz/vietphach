import type Phaser from 'phaser';

/** A required texture failure must not produce a playable scene with missing sprites. */
export class AssetLoadGuard {
  private scene: Phaser.Scene;
  private failures = new Map<string, string>();
  private panel?: HTMLElement;
  private onError: (file: Phaser.Loader.File) => void;
  private onComplete: () => void;

  constructor(scene: Phaser.Scene, optionalKeys: readonly string[] = []) {
    this.scene = scene;
    this.onError = file => {
      if (!optionalKeys.includes(file.key)) this.failures.set(file.key, String(file.url));
    };
    this.onComplete=()=>scene.load.off('loaderror',this.onError);
    scene.load.on('loaderror', this.onError);
    scene.load.once('complete', this.onComplete);
    scene.events.once('shutdown', () => this.destroy());
  }

  get failed() { return this.failures.size > 0; }

  showRecovery(): void {
    if (!this.failed) return;
    const panel = document.createElement('section'); panel.className = 'asset-load-error';
    panel.setAttribute('role', 'alert');
    const title = document.createElement('h1'); title.textContent = 'Chưa tải đủ tài nguyên';
    const message = document.createElement('p');
    message.textContent = 'Ảnh nhân vật hoặc hiệu ứng chưa tải được. Hãy tải lại để vào game với đầy đủ tài nguyên.';
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Xem tài nguyên bị lỗi';
    const list = document.createElement('ul');
    for (const url of this.failures.values()) { const item = document.createElement('li'); item.textContent = url; list.append(item); }
    details.append(summary, list);
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Tải lại game';
    retry.onclick = () => location.reload();
    panel.append(title, message, retry, details);
    this.scene.game.canvas.parentElement!.append(panel); this.panel = panel;
    this.scene.game.canvas.dataset.assetLoad = 'failed';
  }

  destroy() {
    this.scene.load.off('loaderror', this.onError);
    this.scene.load.off('complete', this.onComplete);
    this.panel?.remove(); this.panel = undefined;
  }
}
