import './lab.css';
import { EditorModel, MAPS, newStage, newZone, uid, listStages, saveStage, parseStage, loadZone, overlaps, type Point, type PlacedObject, type Zone } from './model';
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const names: Record<string, string> = { select: 'Chọn / kéo', spawn: 'Nhân vật', exit: 'Lối ra', enemy: 'Quái', npc: 'NPC', rect: 'Chữ nhật', circle: 'Hình tròn', polygon: 'Đa giác' };
export function openLab(root: HTMLElement) {
  document.body.classList.add('lab-open');
  let model = new EditorModel(newStage()), zoneId = model.stage.zones[0].id, selected = '', tool = 'select';
  let saved = JSON.stringify(model.stage), polygon: Point[] = [], drag: { point: Point; before: Zone; target: string } | undefined;
  let characterBase: 'basic' | 'mage' = sessionStorage.getItem('vietphach.lab.character') === 'mage' ? 'mage' : 'basic';
  const artwork = new Image(); artwork.src = MAPS.village.url;
  root.innerHTML = `<div class="lab-shell"><header><div><span class="lab-eyebrow">VIỆT PHÁCH / WORLD TOOLS</span><h1>Phòng Lab <small>Map & Ải</small></h1></div><nav><a href="/">Về game</a><button data-action="new">Tạo ải</button><button data-action="save" class="primary">Lưu ải</button><button data-action="export">Xuất JSON</button><button data-action="import">Nhập JSON</button><button data-action="play">Chạy thử khu</button></nav></header><div class="lab-workspace"><aside class="lab-left"><h2>Chạy thử</h2><label>Model nhân vật<select id="character-model"><option value="basic">Cơ bản</option><option value="mage">Pháp sư</option></select></label><h2>Thiết lập ải</h2><label>Kho ải<select id="stage-library"><option value="">Chọn ải đã lưu…</option></select></label><label>Tên ải<input id="stage-name" maxlength="120"></label><div class="section-title"><h2>Các khu</h2><button data-action="add-zone">+ Thêm</button></div><div id="zones"></div><div class="row"><button data-action="zone-up">Lên</button><button data-action="zone-down">Xuống</button><button data-action="remove-zone">Xóa khu</button></div><label>Tên khu<input id="zone-name" maxlength="120"></label><label>Loại khu<select id="zone-type"><option value="MONSTER">Khu quái</option><option value="EVENT">Khu sự kiện</option><option value="TRADE">Khu giao dịch</option></select></label><label>Map<select id="map"><option value="village">Làng và ruộng · 2200 × 1400</option></select></label><h2>Đối tượng <span id="object-count"></span></h2><div id="objects"></div></aside><main class="lab-center"><div class="lab-tools">${Object.entries(names).map(([id, name]) => `<button data-tool="${id}">${name}</button>`).join('')}<button data-action="undo">Hoàn tác</button><button data-action="redo">Làm lại</button></div><div class="canvas-wrap"><canvas id="lab-map" width="2200" height="1400" tabindex="0" aria-label="Map thiết kế: chọn công cụ rồi nhấp để đặt; dùng thuộc tính để nhập tọa độ"></canvas></div><div class="canvas-footer"><span id="pointer">World 2200 × 1400</span><label class="inline"><input type="checkbox" id="show-collision" checked> Hiện vật cản</label><button data-action="finish-polygon" hidden>Kết thúc đa giác</button><button data-action="cancel-polygon" hidden>Hủy nét vẽ</button></div><p id="hint"></p><p class="notice" id="status" role="status" aria-live="polite">Chưa có thay đổi.</p></main><aside class="lab-right"><h2>Thuộc tính</h2><div id="properties"></div><button data-action="apply" class="primary">Áp dụng thay đổi</button><div class="lab-note"><strong>Thiết kế dữ liệu, không thiết kế combat</strong><p>Quái và NPC là marker. HP chỉ là giá trị riêng khi đặt quái. Lab không quyết định damage, AI hoặc kỹ năng.</p><p>Đa giác: nhấp các đỉnh, rồi chọn Kết thúc. Esc hủy nét vẽ. Ctrl+Z hoàn tác.</p></div></aside></div><dialog id="export-dialog"><h2>Xuất dữ liệu ải</h2><p>Chọn tải file, hoặc sao chép nội dung bên dưới nếu browser không hỗ trợ tải.</p><textarea id="export-json" readonly aria-label="JSON xuất ra"></textarea><div class="row"><a id="download-json" download="vietphach-stage.json">Tải file JSON</a><button data-action="copy-json">Sao chép JSON</button><button data-action="close-export">Đóng</button></div></dialog><input id="import-file" type="file" accept="application/json,.json" hidden></div>`;
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const canvas = $<HTMLCanvasElement>('#lab-map'), ctx = canvas.getContext('2d')!;
  const zone = () => model.stage.zones.find(z => z.id === zoneId) ?? model.stage.zones[0];
  const notice = (text: string, error = false) => { $('#status').textContent = text; $('#status').classList.toggle('error', error); };
  const attempt = (work: () => void) => { try { work(); } catch (e) { render(); notice(e instanceof Error ? e.message : String(e), true); } };
  const dirty = () => JSON.stringify(model.stage) !== saved;
  function draw() {
    ctx.clearRect(0, 0, 2200, 1400);
    if (artwork.complete && artwork.naturalWidth) { const scale = Math.max(2200 / artwork.width, 1400 / artwork.height); ctx.drawImage(artwork, 0, 0, 2200 / scale, 1400 / scale, 0, 0, 2200, 1400); }
    else { ctx.fillStyle = '#49633b'; ctx.fillRect(0, 0, 2200, 1400); }
    const z = zone();
    for (const o of z.objects) {
      const active = selected === o.id;
      ctx.lineWidth = active ? 5 : 3; ctx.strokeStyle = active ? '#ffffff' : '#ff8585'; ctx.fillStyle = '#ff85853a';
      if (o.kind === 'obstacle' && $<HTMLInputElement>('#show-collision').checked) {
        ctx.beginPath(); const s = o.shape!;
        if (s.type === 'rect') ctx.rect(o.x, o.y, s.width, s.height);
        else if (s.type === 'circle') ctx.arc(o.x, o.y, s.radius, 0, Math.PI * 2);
        else { s.points.forEach((p, i) => { if (i === 0) ctx.moveTo(o.x + p.x, o.y + p.y); else ctx.lineTo(o.x + p.x, o.y + p.y); }); ctx.closePath(); }
        ctx.fill(); ctx.stroke();
      } else if (o.kind !== 'obstacle') marker(o, o.kind === 'enemy' ? '#f4b357' : '#cab1ff', o.name, active);
    }
    marker(z.spawn, '#79d9ff', 'Xuất hiện', selected === 'spawn'); if (z.exit) marker(z.exit, '#a7efb9', 'Lối ra', selected === 'exit');
    if (polygon.length) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); polygon.forEach((p, i) => { if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); ctx.stroke(); polygon.forEach(p => marker(p, '#ffffff', '', false)); }
  }
  function marker(p: Point, color: string, label: string, active: boolean) { ctx.beginPath(); ctx.fillStyle = color; ctx.arc(p.x, p.y, active ? 18 : 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#18222c'; ctx.lineWidth = 3; ctx.stroke(); if (label) { ctx.font = '22px sans-serif'; ctx.lineWidth = 5; ctx.strokeText(label, p.x + 22, p.y + 8); ctx.fillStyle = '#ffffff'; ctx.fillText(label, p.x + 22, p.y + 8); } }
  function library() { const select = $<HTMLSelectElement>('#stage-library'); select.innerHTML = '<option value="">Chọn ải đã lưu…</option>'; for (const s of listStages()) { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; select.append(o); } }
  function render() {
    const z = zone(); zoneId = z.id;
    $<HTMLSelectElement>('#character-model').value = characterBase;
    $<HTMLInputElement>('#stage-name').value = model.stage.name; $<HTMLInputElement>('#zone-name').value = z.name; $<HTMLSelectElement>('#zone-type').value = z.type;
    $('#zones').innerHTML = model.stage.zones.map((v, i) => `<button data-zone="${esc(v.id)}" class="${v.id === z.id ? 'active' : ''}"><span>${String(i + 1).padStart(2, '0')}</span> ${esc(v.name)}</button>`).join('');
    $('#objects').innerHTML = z.objects.map(o => `<button data-object="${esc(o.id)}" class="${selected === o.id ? 'active' : ''}">${o.kind === 'obstacle' ? 'Vật cản' : o.kind === 'enemy' ? 'Quái' : 'NPC'} · ${esc(o.name)}</button>`).join('');
    $('#object-count').textContent = `(${z.objects.length})`;
    root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b => { b.classList.toggle('active', b.dataset.tool === tool); b.setAttribute('aria-pressed', String(b.dataset.tool === tool)); });
    $<HTMLButtonElement>('[data-action="undo"]').disabled = !model.canUndo; $<HTMLButtonElement>('[data-action="redo"]').disabled = !model.canRedo;
    $<HTMLButtonElement>('[data-action="remove-zone"]').disabled = model.stage.zones.length === 1;
    $<HTMLButtonElement>('[data-action="finish-polygon"]').hidden = polygon.length === 0; $<HTMLButtonElement>('[data-action="cancel-polygon"]').hidden = polygon.length === 0;
    $('#hint').textContent = tool === 'polygon' ? 'Nhấp ít nhất 3 đỉnh trên map, rồi Kết thúc đa giác.' : tool === 'select' ? 'Chọn marker/vật cản để kéo, hoặc nhập tọa độ trong Thuộc tính.' : `Nhấp map để đặt: ${names[tool]}.`;
    properties(); draw();
  }
  function field(label: string, key: string, value: string | number, type = 'number') { return `<label>${label}<input data-field="${key}" type="${type}" value="${esc(String(value))}" ${type === 'number' ? 'step="1"' : 'maxlength="120"'}></label>`; }
  function properties() {
    const z = zone(), o = z.objects.find(o => o.id === selected), p = selected === 'spawn' ? z.spawn : selected === 'exit' ? z.exit : o;
    if (!p) { $('#properties').innerHTML = '<p class="muted">Chọn đối tượng trên map hoặc trong danh sách để chỉnh.</p>'; return; }
    let html = `<p class="selection-name">${o ? esc(o.name) : selected === 'spawn' ? 'Điểm xuất hiện' : 'Lối ra'}</p>`;
    if (o) html += field('Tên', 'name', o.name, 'text');
    html += field('World X', 'x', Math.round(p.x)) + field('World Y', 'y', Math.round(p.y));
    if (o?.kind === 'enemy') html += field('Loại quái / resource ID', 'resource', o.resource, 'text') + field('HP riêng (bỏ trống = mặc định)', 'hp', o.hp ?? '');
    if (o?.kind === 'npc') html += field('NPC / resource ID', 'resource', o.resource, 'text');
    if (o?.shape?.type === 'rect') html += field('Chiều rộng', 'width', o.shape.width) + field('Chiều cao', 'height', o.shape.height);
    if (o?.shape?.type === 'circle') html += field('Bán kính', 'radius', o.shape.radius);
    if (o?.shape?.type === 'polygon') html += `<label>Đỉnh tương đối (x,y; x,y…)<textarea data-field="points">${o.shape.points.map(p => `${p.x},${p.y}`).join('; ')}</textarea></label>`;
    if (selected !== 'spawn') html += '<button data-action="delete" class="danger">Xóa đối tượng</button>';
    $('#properties').innerHTML = html;
  }
  function edit(fn: (z: Zone) => void) { model.change(s => fn(s.zones.find(v => v.id === zoneId)!)); notice('Đã thay đổi · chưa lưu'); render(); }
  function applyFields() {
    const stageName = $<HTMLInputElement>('#stage-name').value;
    const zoneName = $<HTMLInputElement>('#zone-name').value;
    const zoneType = $<HTMLSelectElement>('#zone-type').value as Zone['type'];
    const values = [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]')].map(el => [el.dataset.field!, el.value]);
    model.change(stage => {
      stage.name = stageName;
      const z = stage.zones.find(z => z.id === zoneId)!; z.name = zoneName; z.type = zoneType;
      const p = selected === 'spawn' ? z.spawn : selected === 'exit' ? z.exit : z.objects.find(o => o.id === selected);
      if (!p) return;
      for (const [key, value] of values) {
        if (key === 'x' || key === 'y') p[key] = Number(value);
        else {
          const o = p as PlacedObject;
          if (key === 'name' || key === 'resource') o[key] = value;
          else if (key === 'hp') { if (!value.trim()) delete o.hp; else o.hp = Number(value); }
          else if (key === 'points' && o.shape?.type === 'polygon') o.shape.points = value.split(';').map(pair => { const [x, y] = pair.split(',').map(Number); return { x, y }; });
          else if (o.shape?.type === 'rect' && (key === 'width' || key === 'height')) o.shape[key] = Number(value);
          else if (o.shape?.type === 'circle' && key === 'radius') o.shape.radius = Number(value);
        }
      }
    });
    render(); notice('Đã áp dụng · chưa lưu');
  }
  function place(p: Point) {
    if (tool === 'spawn' || tool === 'exit') { const key = tool as 'spawn' | 'exit'; edit(z => { z[key] = p; }); selected = key; render(); return; }
    if (tool === 'polygon') { polygon.push(p); render(); return; }
    const o: PlacedObject = { ...p, id: uid(), name: names[tool], kind: tool === 'enemy' ? 'enemy' : tool === 'npc' ? 'npc' : 'obstacle', resource: tool === 'enemy' ? 'worm' : tool === 'npc' ? 'village-chief' : tool };
    if (tool === 'rect') o.shape = { type: 'rect', width: 100, height: 60 };
    if (tool === 'circle') o.shape = { type: 'circle', radius: 40 };
    edit(z => z.objects.push(o)); selected = o.id; tool = 'select'; render();
  }
  function finishPolygon() { if (polygon.length < 3) throw new Error('Cần ít nhất 3 đỉnh.'); const first = polygon[0]; const o: PlacedObject = { ...first, id: uid(), name: 'Vùng chặn', kind: 'obstacle', resource: 'polygon', shape: { type: 'polygon', points: polygon.map(p => ({ x: p.x - first.x, y: p.y - first.y })) } }; edit(z => z.objects.push(o)); polygon = []; selected = o.id; tool = 'select'; render(); }
  const point = (e: PointerEvent): Point => { const r = canvas.getBoundingClientRect(); return { x: Math.round((e.clientX - r.left) * 2200 / r.width), y: Math.round((e.clientY - r.top) * 1400 / r.height) }; };
  function hit(p: Point): string { const z = zone(); if (Math.hypot(p.x - z.spawn.x, p.y - z.spawn.y) < 30) return 'spawn'; if (z.exit && Math.hypot(p.x - z.exit.x, p.y - z.exit.y) < 30) return 'exit'; return [...z.objects].reverse().find(o => o.kind === 'obstacle' ? overlaps(p, 4, o) : Math.hypot(p.x - o.x, p.y - o.y) < 30)?.id ?? ''; }
  canvas.addEventListener('pointerdown', e => attempt(() => { const p = point(e); if (tool !== 'select') { place(p); return; } selected = hit(p); if (selected) { drag = { point: p, before: structuredClone(zone()), target: selected }; canvas.setPointerCapture(e.pointerId); } render(); }));
  canvas.addEventListener('pointermove', e => { const p = point(e); $('#pointer').textContent = `World X ${p.x} / Y ${p.y}`; if (!drag) return; const z = zone(), original = drag.target === 'spawn' ? drag.before.spawn : drag.target === 'exit' ? drag.before.exit : drag.before.objects.find(o => o.id === drag!.target); const target = drag.target === 'spawn' ? z.spawn : drag.target === 'exit' ? z.exit : z.objects.find(o => o.id === drag!.target); if (target && original) { target.x = original.x + p.x - drag.point.x; target.y = original.y + p.y - drag.point.y; draw(); } });
  function finishDrag() { if (!drag) return; const changed = structuredClone(zone()), previous = drag; drag = undefined; const index = model.stage.zones.findIndex(z => z.id === zoneId); model.stage.zones[index] = previous.before; attempt(() => model.change(s => { s.zones[index] = changed; })); render(); }
  canvas.addEventListener('pointerup', finishDrag); canvas.addEventListener('pointercancel', () => { if (drag) { model.stage.zones[model.stage.zones.findIndex(z => z.id === zoneId)] = drag.before; drag = undefined; render(); } });
  root.addEventListener('click', e => attempt(() => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return;
    if (b.dataset.tool) { tool = b.dataset.tool; polygon = []; render(); return; }
    if (b.dataset.zone) { zoneId = b.dataset.zone; selected = ''; polygon = []; render(); return; }
    if (b.dataset.object) { selected = b.dataset.object; tool = 'select'; render(); return; }
    const action = b.dataset.action;
    if (action === 'apply') applyFields();
    else if (action === 'save') { applyFields(); saveStage(model.stage); saved = JSON.stringify(model.stage); library(); notice('Đã lưu trên trình duyệt này. Xuất JSON để có bản sao độc lập.'); }
    else if (action === 'new') { if (dirty() && !confirm('Tạo ải mới và bỏ thay đổi chưa lưu?')) return; model = new EditorModel(newStage()); zoneId = model.stage.zones[0].id; saved = ''; selected = ''; render(); }
    else if (action === 'add-zone') { const z = newZone(); model.change(s => s.zones.push(z)); zoneId = z.id; selected = ''; render(); }
    else if (action === 'remove-zone') { model.change(s => { s.zones = s.zones.filter(z => z.id !== zoneId); }); selected = ''; render(); }
    else if (action === 'zone-up' || action === 'zone-down') { model.change(s => { const i = s.zones.findIndex(z => z.id === zoneId), j = i + (action === 'zone-up' ? -1 : 1); if (j >= 0 && j < s.zones.length) [s.zones[i], s.zones[j]] = [s.zones[j], s.zones[i]]; }); render(); }
    else if (action === 'undo' || action === 'redo') { model[action](); selected = ''; render(); }
    else if (action === 'delete') { edit(z => { if (selected === 'exit') delete z.exit; else z.objects = z.objects.filter(o => o.id !== selected); }); selected = ''; render(); }
    else if (action === 'finish-polygon') finishPolygon();
    else if (action === 'cancel-polygon') { polygon = []; render(); }
    else if (action === 'import') $<HTMLInputElement>('#import-file').click();
    else if (action === 'export') {
      applyFields();
      const json = JSON.stringify(parseStage(model.stage), null, 2);
      $<HTMLTextAreaElement>('#export-json').value = json;
      const link = $<HTMLAnchorElement>('#download-json');
      if (link.href.startsWith('blob:')) URL.revokeObjectURL(link.href);
      link.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      $<HTMLDialogElement>('#export-dialog').showModal(); notice('JSON đã sẵn sàng để tải hoặc sao chép.');
    }
    else if (action === 'close-export') $<HTMLDialogElement>('#export-dialog').close();
    else if (action === 'copy-json') { navigator.clipboard.writeText($<HTMLTextAreaElement>('#export-json').value).then(() => notice('Đã sao chép JSON.')).catch(() => { $<HTMLTextAreaElement>('#export-json').select(); notice('Chọn nội dung JSON rồi Ctrl+C để sao chép.'); }); }
    else if (action === 'play') { applyFields(); const z = loadZone(model.stage, zoneId); sessionStorage.setItem('vietphach.lab.playtest', JSON.stringify({ version: 1, id: uid(), name: model.stage.name, zones: [z] })); saveDraft(); window.location.href = '/?playtest=1&debug=1&character=' + characterBase; }
  }));
  root.addEventListener('change', e => attempt(() => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'character-model') { characterBase = el.value === 'mage' ? 'mage' : 'basic'; sessionStorage.setItem('vietphach.lab.character', characterBase); notice('Chạy thử sẽ dùng model ' + (characterBase === 'mage' ? 'Pháp sư.' : 'Cơ bản.')); }
    else if (el.id === 'stage-library') { if (!el.value) return; if (dirty() && !confirm('Mở ải đã lưu và bỏ thay đổi hiện tại?')) return; const stage = listStages().find(s => s.id === el.value)!; model = new EditorModel(stage); saved = JSON.stringify(stage); zoneId = stage.zones[0].id; selected = ''; render(); }
    else if (el.id === 'stage-name') { model.change(s => { s.name = el.value; }); render(); }
    else if (el.id === 'zone-name') edit(z => { z.name = el.value; });
    else if (el.id === 'zone-type') edit(z => { z.type = el.value as Zone['type']; });
    else if (el.id === 'show-collision') draw();
    else if (el.dataset.field) { const key = el.dataset.field; edit(z => { const p = selected === 'spawn' ? z.spawn : selected === 'exit' ? z.exit! : z.objects.find(o => o.id === selected)!; if (key === 'x' || key === 'y') p[key] = Number(el.value); else { const o = p as PlacedObject; if (key === 'name' || key === 'resource') o[key] = el.value; else if (key === 'hp') { if (!el.value.trim()) delete o.hp; else o.hp = Number(el.value); } else if (key === 'points' && o.shape?.type === 'polygon') o.shape.points = el.value.split(';').map(pair => { const [x, y] = pair.split(',').map(Number); return { x, y }; }); else if (o.shape?.type === 'rect' && (key === 'width' || key === 'height')) o.shape[key] = Number(el.value); else if (o.shape?.type === 'circle' && key === 'radius') o.shape.radius = Number(el.value); } }); }
  }));
  $<HTMLInputElement>('#import-file').addEventListener('change', async e => { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; try { if (file.size > 2000000) throw new Error('JSON vượt 2 MB.'); const stage = parseStage(JSON.parse(await file.text())); if (dirty() && !confirm('Nhập ải và bỏ thay đổi hiện tại?')) return; model = new EditorModel(stage); zoneId = stage.zones[0].id; selected = ''; saved = ''; render(); notice('Đã nhập và kiểm tra dữ liệu; hãy lưu ải.'); } catch (err) { notice(err instanceof Error ? err.message : String(err), true); } finally { $<HTMLInputElement>('#import-file').value = ''; } });
  function saveDraft() { sessionStorage.setItem('vietphach.lab.draft', JSON.stringify({ stage: model.stage, zoneId, saved })); }
  const draft = sessionStorage.getItem('vietphach.lab.draft'); if (draft) attempt(() => { const data = JSON.parse(draft); model = new EditorModel(data.stage); zoneId = data.zoneId; saved = data.saved; });
  // Recover the draft silently instead of blocking HMR/navigation with a native dialog.
  window.addEventListener('beforeunload', saveDraft);
  window.addEventListener('keydown', e => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? model.redo() : model.undo(); render(); } else if (e.key === 'Escape') { polygon = []; selected = ''; tool = 'select'; render(); } else if (e.key === 'Enter' && polygon.length) attempt(finishPolygon); });
  artwork.onload = draw; artwork.onerror = () => notice('Không tải được ảnh map.', true);
  attempt(library); render();
}


