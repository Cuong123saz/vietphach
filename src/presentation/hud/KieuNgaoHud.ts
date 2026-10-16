import { KIEU_NGAO_NAMES } from '../../world/kieuNgao';
import { KIEU_NGAO_BRIEFINGS, KIEU_NGAO_CLUES, KIEU_NGAO_REVEAL, KIEU_NGAO_RETURN, type ForestStoryBeat } from '../../config/stages/kieuNgaoStory';
import { kieuNgaoInteraction, kieuNgaoRootsLeft, type KieuNgaoStage } from '../../run/KieuNgaoStage';
import type { ArcherStagePath } from '../../run/ArcherStage';
import { bodyCenter } from '../../world/bodyGeometry';
import './archer-stage.css';
import './kieu-ngao.css';

interface Options { getStage: () => KieuNgaoStage; onStart: (path: ArcherStagePath) => void; onAdvance: () => void;
  onInteract: () => void; onLastArrow: () => void; onRestart: () => void; onSound: () => boolean; portrait: string; touch: boolean }
export class KieuNgaoHud {
  private root = document.createElement('section');
  private dialog = document.createElement('dialog');
  private options: Options;
  private key = '';
  private last = -Infinity;
  private path: ArcherStagePath;
  constructor(parent: HTMLElement, options: Options) {
    this.options = options; this.path = options.getStage().path;
    this.root.className = 'archer-stage-hud kieu-ngao-hud'; this.root.setAttribute('aria-label', 'Stage Kiêu Ngạo');
    this.root.innerHTML = `<header class="archer-stage-objective"><small>KIÊU NGẠO · MŨI TÊN CUỐI RỪNG</small><strong class="archer-stage-wave"></strong>
      <ol aria-label="Hành trình bốn map">${['I', 'II', 'III', 'IV'].map((v, i) => `<li data-forest-map="${i}">${v}</li>`).join('')}</ol>
      <p class="archer-stage-objective-hint" role="status" aria-live="polite"></p></header>
      <div class="kieu-interaction"><p></p><button data-forest-interact></button></div>
      <button class="kieu-sound" aria-pressed="true">Âm thanh: bật</button>`;
    this.dialog.className = 'archer-stage-panel kieu-story'; this.dialog.setAttribute('aria-labelledby', 'kieu-story-title');
    this.dialog.addEventListener('cancel', e => e.preventDefault()); this.root.append(this.dialog); parent.append(this.root);
    this.root.querySelector<HTMLButtonElement>('[data-forest-interact]')!.onclick = () => {
      if (options.getStage().phase === 'final-shot') options.onLastArrow(); else options.onInteract();
    };
    const sound = this.root.querySelector<HTMLButtonElement>('.kieu-sound')!;
    sound.onclick = () => { const enabled = options.onSound(); sound.textContent = `Âm thanh: ${enabled ? 'bật' : 'tắt'}`; sound.setAttribute('aria-pressed', String(enabled)); };
    document.body.classList.add('wood-stage-playing', 'kieu-ngao-playing'); this.update(true);
  }
  update(force = false) {
    const s = this.options.getStage(), key = `${s.phase}:${s.mapIndex}:${s.revealIndex}`, now = s.run.time;
    if (!force && key === this.key && now - this.last < .1) return; this.last = now;
    document.body.dataset.forestPhase = s.phase;
    this.root.querySelector('.archer-stage-wave')!.textContent = `${s.phase === 'return' ? 'Đường về' : `Map ${s.mapIndex + 1} / 4`} · ${KIEU_NGAO_NAMES[s.mapIndex]}`;
    this.root.querySelectorAll<HTMLElement>('[data-forest-map]').forEach((li, i) => { li.classList.toggle('active', i === s.mapIndex);
      li.classList.toggle('done', s.combatWon || i < s.mapIndex); li.setAttribute('aria-label', `${KIEU_NGAO_NAMES[i]}${i === s.mapIndex ? ' · hiện tại' : ''}`); });
    const hint = s.phase === 'return' ? KIEU_NGAO_RETURN[s.mapIndex] : s.phase === 'final-shot' ? 'Đường tên đã mở · Bắn Mộc Tiễn vào lõi trong ngực Mộc Lộc'
      : s.phase === 'combat' ? s.mapIndex === 3 ? `Phá rễ phụ · ${3 - kieuNgaoRootsLeft(s)} / 3 · Né dấu báo trên đất`
      : `Giải vây · ${s.run.combatBodies.filter(b => b.actor.resources.currentHp > 0).length} thú rừng còn lại`
      : s.phase === 'explore' ? 'Đã giải vây · Đi tới dấu chỉ dẫn để tìm thầy' : s.phase === 'reveal' ? 'Đã hạ Mộc Lộc · Chiến thắng được ghi nhận'
      : s.phase === 'ending' ? 'Thắng trận · Phong ấn đã vỡ' : s.phase === 'lost' ? 'Cung thủ đã gục' : 'Cung Thủ Mộc · Hành trình tìm thầy';
    const status = this.root.querySelector('.archer-stage-objective-hint')!; if (status.textContent !== hint) status.textContent = hint;
    const interaction = kieuNgaoInteraction(s), dock = this.root.querySelector<HTMLElement>('.kieu-interaction')!, button = dock.querySelector('button')!;
    dock.hidden = !interaction && s.phase !== 'final-shot';
    const core = s.boss && bodyCenter(s.boss), inRange = !core || Math.hypot(core.x - s.run.player.position.x, core.y - (s.run.player.position.y - 28)) < 520;
    button.disabled = !!interaction && !interaction.near || s.phase === 'final-shot' && !inRange;
    button.textContent = s.phase === 'final-shot' ? 'Bắn phát tên cuối' : interaction ? `${this.options.touch ? '' : 'F · '}${interaction.label}` : '';
    dock.querySelector('p')!.textContent = interaction && !interaction.near ? `${interaction.label} · Đi theo dấu chỉ dẫn` : s.phase === 'final-shot' ? inRange ? 'Bắn trúng lõi để cứu thầy.' : 'Đến gần Mộc Lộc để mở góc bắn.' : '';
    if (key !== this.key) { this.key = key; this.renderDialog(s); }
  }
  private story(beat: ForestStoryBeat, s: KieuNgaoStage) {
    this.dialog.innerHTML = `<small>${s.phase === 'reveal' ? 'SAU CHIẾN THẮNG' : `MAP ${s.mapIndex + 1} · ${KIEU_NGAO_NAMES[s.mapIndex]}`}</small>
      <h1 id="kieu-story-title"></h1><span class="kieu-speaker"></span><div class="kieu-lines"></div>
      <div class="archer-stage-actions"><button data-forest-next></button></div>`;
    this.dialog.querySelector('h1')!.textContent = beat.title; this.dialog.querySelector('.kieu-speaker')!.textContent = beat.speaker;
    for (const line of beat.lines) { const p = document.createElement('p'); p.textContent = line; this.dialog.querySelector('.kieu-lines')!.append(p); }
    const next = this.dialog.querySelector<HTMLButtonElement>('[data-forest-next]')!; next.textContent = beat.action; next.onclick = this.options.onAdvance;
  }
  private renderDialog(s: KieuNgaoStage) {
    if (['combat', 'explore', 'final-shot', 'return'].includes(s.phase)) { if (this.dialog.open) this.dialog.close(); return; }
    if (s.phase === 'intro') {
      this.dialog.innerHTML = `<small>STAGE RIÊNG · CUNG THỦ MỘC</small><h1 id="kieu-story-title">Kiêu Ngạo</h1><h2>Mũi Tên Cuối Rừng</h2>
        <p>Thầy và đội săn đã mất tích sau tiếng tù và. Bạn mang cây cung ông trao, lần theo dấu tên vào rừng.</p>
        <blockquote>“Trong rừng này, đừng tin điều con chỉ nghe thấy.”</blockquote>
        <div class="archer-stage-paths"><button data-forest-path="a1"><small>A1 · LIỆP MỘC</small><strong>Truy Tâm Liệp</strong><span>Chọn đường tên xuyên, đánh dấu và dồn sát thương.</span></button>
        <button data-forest-path="b1"><small>B1 · LINH LÂM</small><strong>Độc Đằng Vực</strong><span>Trồng vườn gai, nối dây leo và giữ khoảng cách.</span></button></div>
        <p class="archer-stage-rules">Cấp 15 · Bốn khu rừng · Hồi 8 MP/s trong stage</p><div class="archer-stage-actions"><button data-forest-start>Vào rừng tìm thầy</button><a href="?character=archer">Chơi thường</a></div>
        <p class="archer-stage-help">${this.options.touch ? 'Cần trái di chuyển · Chạm hoặc vuốt nút chiêu để nhắm · Nút tương tác hiện khi đến gần' : 'WASD di chuyển · Giữ chuột bắn · Q/E rồi click · R Khai Cung · Q+E đại chiêu · F tương tác'}</p>`;
      const select = (path: ArcherStagePath) => { this.path = path; this.dialog.querySelectorAll<HTMLElement>('[data-forest-path]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.forestPath === path))); };
      this.dialog.querySelectorAll<HTMLButtonElement>('[data-forest-path]').forEach(b => b.onclick = () => select(b.dataset.forestPath as ArcherStagePath));
      select(s.path); this.dialog.querySelector<HTMLButtonElement>('[data-forest-start]')!.onclick = () => this.options.onStart(this.path);
    } else if (s.phase === 'briefing') this.story(KIEU_NGAO_BRIEFINGS[s.mapIndex], s);
    else if (s.phase === 'dialogue') this.story(KIEU_NGAO_CLUES[s.mapIndex], s);
    else if (s.phase === 'reveal') this.story(KIEU_NGAO_REVEAL[s.revealIndex], s);
    else {
      const ending = s.phase === 'ending';
      this.dialog.innerHTML = `<small>${ending ? 'THẮNG TRẬN · KẾT THÚC BI KỊCH' : 'CHƯA HOÀN THÀNH TRẬN ĐẤU'}</small>
        <h1 id="kieu-story-title">${ending ? 'Mũi Tên Cuối Rừng' : 'Cung thủ đã gục'}</h1>
        <p>${ending ? 'Ta rút mũi tên cảnh báo đầu tiên của thầy khỏi thân cây, rồi ngồi xuống.' : 'Đọc dấu báo đòn, đổi hướng sau khi đạn chốt mục tiêu và giữ khoảng cách khi phá rễ.'}</p>
        ${ending ? '<blockquote>Xa xa, tiếng chuông làng vang lên một lần và tắt.</blockquote><p>Ta bắn trúng. Ta đã đưa thầy khỏi bộ rễ.<br>Và chính phát tên ấy mở đường cho tai họa.</p>' : ''}
        <div class="archer-stage-result-stats"><div><small>Trận Mộc Lộc</small><strong>${s.combatWon ? 'Đã thắng' : 'Chưa thắng'}</strong></div><div><small>Dấu hiệu đã gặp</small><strong>${s.cluesSeen.length} / 3</strong></div></div>
        <div class="archer-stage-actions"><button data-forest-restart>Chơi lại Kiêu Ngạo</button><a href="?character=archer">Chơi thường</a></div>`;
      this.dialog.querySelector<HTMLButtonElement>('[data-forest-restart]')!.onclick = this.options.onRestart;
    }
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.querySelector<HTMLButtonElement>('[data-forest-start],[data-forest-next],[data-forest-restart]')?.focus();
  }
  destroy() { if (this.dialog.open) this.dialog.close(); this.root.remove(); document.body.classList.remove('wood-stage-playing', 'wood-stage-touch', 'kieu-ngao-playing'); delete document.body.dataset.forestPhase; }
}
