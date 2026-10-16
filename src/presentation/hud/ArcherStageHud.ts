import { ARCHER_STAGE_WAVES, type ArcherStage, type ArcherStagePath } from '../../run/ArcherStage';
import './archer-stage.css';

interface StageHudOptions {
  getStage: () => ArcherStage;
  onStart: (path: ArcherStagePath) => void;
  onContinue: () => void;
  onRestart: () => void;
  portrait: string;
  touch?: boolean;
}
const pathName = (path: ArcherStagePath) => path === 'a1' ? 'A1 · Truy Tâm Liệp' : 'B1 · Độc Đằng Vực';
export class ArcherStageHud {
  private root = document.createElement('section');
  private dialog = document.createElement('dialog');
  private options: StageHudOptions;
  private path: ArcherStagePath;
  private phase = '';
  private last = -Infinity;
  constructor(parent: HTMLElement, options: StageHudOptions) {
    this.options = options; this.path = options.getStage().path;
    this.root.className = 'archer-stage-hud';
    this.root.innerHTML = `<header class="archer-stage-objective"><small>LINH MỘC TRẤN ẢI</small><strong class="archer-stage-wave"></strong>
      <ol aria-label="Tiến trình stage">${['I', 'II', 'III', 'IV'].map((name, i) => `<li data-stage-wave="${i}">${name}</li>`).join('')}</ol>
      <div class="archer-stage-heart" role="meter" aria-label="Sinh lực Linh Mộc" aria-valuemin="0" aria-valuemax="900"><i></i><span></span></div>
      <div class="archer-stage-boss" role="meter" aria-label="HP Kẻ Nuốt Mầm" aria-valuemin="0"><i></i><span></span></div>
      <p class="archer-stage-objective-hint" role="status" aria-atomic="true"></p></header>`;
    this.dialog.className = 'archer-stage-panel'; this.dialog.setAttribute('aria-labelledby', 'archer-stage-dialog-title');
    this.dialog.addEventListener('cancel', e => e.preventDefault()); this.root.append(this.dialog); parent.append(this.root);
    document.body.classList.add('wood-stage-playing'); this.update(true);
  }
  update(force = false) {
    const s = this.options.getStage(), now = s.run.time;
    if (!force && s.phase === this.phase && now - this.last < .1) return; this.last = now;
    const wave = ARCHER_STAGE_WAVES[s.wave];
    this.root.querySelector('.archer-stage-wave')!.textContent = `${s.wave === 3 ? 'Boss' : `Đợt ${s.wave + 1} / 4`} · ${wave.name}`;
    this.root.querySelectorAll<HTMLElement>('[data-stage-wave]').forEach((li, i) => { li.classList.toggle('active', i === s.wave); li.classList.toggle('done', i < s.wave || s.phase === 'won');
      li.setAttribute('aria-label', `${ARCHER_STAGE_WAVES[i].name}${i === s.wave ? ' · hiện tại' : i < s.wave ? ' · hoàn thành' : ''}`); });
    const hp = s.heart.body.actor.resources.currentHp, meter = this.root.querySelector<HTMLElement>('.archer-stage-heart')!;
    meter.querySelector<HTMLElement>('i')!.style.width = `${Math.max(0, hp) / 9}%`;
    meter.querySelector('span')!.textContent = `Linh Mộc · ${Math.ceil(hp)} / 900`; meter.setAttribute('aria-valuenow', String(hp));
    meter.classList.toggle('danger', hp < 270);
    const boss = s.run.combatBodies.find(b => b.rank === 'boss'), bossMeter = this.root.querySelector<HTMLElement>('.archer-stage-boss')!;
    bossMeter.hidden = !boss; if (boss) { const current = boss.actor.resources.currentHp, max = boss.actor.stats.maxHp;
      bossMeter.querySelector<HTMLElement>('i')!.style.width = `${current / max * 100}%`;
      bossMeter.querySelector('span')!.textContent = `Kẻ Nuốt Mầm · ${Math.ceil(current).toLocaleString('vi-VN')} / ${max.toLocaleString('vi-VN')}`;
      bossMeter.setAttribute('aria-valuenow', String(current)); bossMeter.setAttribute('aria-valuemax', String(max)); }
    const hint = s.phase === 'combat' ? s.enraged ? 'Boss cuồng nộ · né dấu báo đòn, giữ cây sống!' : `Bảo vệ cổ thụ · ${s.waveDefeated}/${wave.foes.length} quái đã hạ`
      : s.phase === 'won' ? 'Cổ thụ đã được bảo vệ' : s.phase === 'lost' ? 'Stage kết thúc' : pathName(s.path);
    const message = this.root.querySelector('.archer-stage-objective-hint')!; if (message.textContent !== hint) message.textContent = hint;
    if (s.phase !== this.phase) { this.phase = s.phase; this.renderDialog(s); }
  }
  private renderDialog(s: ArcherStage) {
    if (s.phase === 'combat') { if (this.dialog.open) this.dialog.close(); return; }
    if (s.phase === 'intro') {
      this.path = s.path;
      this.dialog.innerHTML = `<div class="archer-stage-intro-art"><img src="${this.options.portrait}" alt="Cung Thủ Mộc"></div>
        <div class="archer-stage-intro-copy"><small>STAGE RIÊNG · CUNG THỦ MỘC</small><h1 id="archer-stage-dialog-title">Linh Mộc<br>Trấn Ải</h1>
        <p>Đàn quái đang phá rễ cổ thụ. Giữ Linh Mộc sống qua ba đợt tiến quân, rồi hạ Kẻ Nuốt Mầm.</p></div>
        <div class="archer-stage-paths" aria-label="Chọn nhánh Cung Thủ">
        <button data-stage-path="a1"><small>A1 · LIỆP MỘC</small><strong>Truy Tâm Liệp</strong><span>Đánh dấu mục tiêu, lùi bước và chọn đường tên xuyên đàn.</span><em>Thần Mộc Xuyên Thiên</em></button>
        <button data-stage-path="b1"><small>B1 · LINH LÂM</small><strong>Độc Đằng Vực</strong><span>Trồng hai vườn gai, nối dây leo và khóa đường tiến quân.</span><em>Vạn Tiễn Thành Lâm</em></button></div>
        <p class="archer-stage-rules">Cấp 15 · 6 Sinh Tức mở màn · Linh khí hồi 8 MP/s trong stage · A2/B2 khóa</p>
        <div class="archer-stage-actions"><button data-stage-start>Vào trận</button><a href="?character=archer">Chơi thường từ cấp 1</a></div>
        <p class="archer-stage-help">${this.options.touch?'Cần trái di chuyển · Chạm nút để nhắm quái gần nhất · Vuốt từ nút chiêu để chọn hướng':'WASD di chuyển · Giữ chuột bắn · Q/E rồi click chọn điểm · R Khai Cung · Q+E đại chiêu'}</p>`;
      const select = (path: ArcherStagePath) => { this.path = path; this.dialog.querySelectorAll<HTMLElement>('[data-stage-path]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.stagePath === path))); };
      this.dialog.querySelectorAll<HTMLButtonElement>('[data-stage-path]').forEach(b => b.onclick = () => select(b.dataset.stagePath as ArcherStagePath));
      select(s.path); this.dialog.querySelector<HTMLButtonElement>('[data-stage-start]')!.onclick = () => this.options.onStart(this.path);
    } else if (s.phase === 'intermission') {
      this.dialog.innerHTML = `<small>ĐÃ ĐẨY LUI ĐỢT ${s.wave + 1}</small><h1 id="archer-stage-dialog-title">Rễ vẫn còn xanh</h1>
        <p>${ARCHER_STAGE_WAVES[s.wave + 1].hint}</p><div class="archer-stage-result-stats"><div><small>Quái đã hạ</small><strong>${s.defeated}</strong></div>
        <div><small>Linh Mộc còn</small><strong>${Math.ceil(s.heart.body.actor.resources.currentHp / 9)}%</strong></div></div>
        <p class="archer-stage-rules">Sang đợt tiếp: hồi 30% HP, đầy MP và 15% sinh lực Linh Mộc. Sinh Tức và thời gian hồi đại chiêu được giữ.</p>
        <div class="archer-stage-actions"><button data-stage-continue>${s.wave === 2 ? 'Đối đầu Kẻ Nuốt Mầm' : `Vào đợt ${s.wave + 2}`}</button></div>`;
      this.dialog.querySelector<HTMLButtonElement>('[data-stage-continue]')!.onclick = this.options.onContinue;
    } else {
      const won = s.phase === 'won', seconds = Math.floor((s.endedAt ?? s.run.time) - s.startedAt);
      this.dialog.innerHTML = `<small>${won ? 'HOÀN THÀNH STAGE' : 'THẤT BẠI'}</small><h1 id="archer-stage-dialog-title">${won ? 'Linh Mộc hồi sinh' : s.reason === 'heart' ? 'Cổ thụ đã gục' : 'Cung Thủ đã gục'}</h1>
        <p>${won ? 'Kẻ Nuốt Mầm bị hạ. Rễ cổ thụ lại nuôi ánh sáng trong rừng.' : 'Giữ khoảng cách, chặn quái ở đường tiến quân và dành đại chiêu cho thời điểm quyết định.'}</p>
        <div class="archer-stage-result-stats"><div><small>Nhánh</small><strong>${s.path.toUpperCase()}</strong></div><div><small>Quái đã hạ</small><strong>${s.defeated}</strong></div>
        <div><small>Thời gian chiến đấu</small><strong>${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}</strong></div><div><small>Linh Mộc còn</small><strong>${Math.max(0, Math.ceil(s.heart.body.actor.resources.currentHp / 9))}%</strong></div></div>
        <div class="archer-stage-actions"><button data-stage-restart>Chơi lại · chọn nhánh</button><a href="?character=archer">Chơi thường</a></div>`;
      this.dialog.querySelector<HTMLButtonElement>('[data-stage-restart]')!.onclick = this.options.onRestart;
    }
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.querySelector<HTMLButtonElement>('[data-stage-start],[data-stage-continue],[data-stage-restart]')?.focus();
  }
  destroy() { if (this.dialog.open) this.dialog.close(); this.root.remove(); document.body.classList.remove('wood-stage-playing', 'wood-stage-touch'); }
}
