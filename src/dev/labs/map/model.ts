import { type Stage, type Zone } from '../../../world/definitions';
import { parseStage } from '../../../world/parseStage';
export { MAPS, type Point, type Shape, type PlacedObject, type Zone, type Stage } from '../../../world/definitions';
export { overlaps, movePlayer } from '../../../world/collision';
export { parseStage } from '../../../world/parseStage';

export const uid = () => crypto.randomUUID();
export const newZone = (): Zone => ({ id: uid(), name: 'Khu mới', type: 'MONSTER', mapId: 'village', spawn: { x: 660, y: 800 }, objects: [] });
export const newStage = (): Stage => ({ version: 1, id: uid(), name: 'Ải 1 · Dấu lạ trên đồng', zones: [{ ...newZone(), name: 'Ruộng ngoài làng' }] });
export class EditorModel {
  stage: Stage;
  private past: Stage[] = [];
  private future: Stage[] = [];
  constructor(stage: Stage) { this.stage = parseStage(stage); }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  change(edit: (draft: Stage) => void) { const draft = structuredClone(this.stage); edit(draft); const clean = parseStage(draft); if (JSON.stringify(clean) === JSON.stringify(this.stage)) return; this.past.push(this.stage); if (this.past.length > 80) this.past.shift(); this.stage = clean; this.future = []; }
  undo() { const s = this.past.pop(); if (s) { this.future.push(this.stage); this.stage = s; } }
  redo() { const s = this.future.pop(); if (s) { this.past.push(this.stage); this.stage = s; } }
}
const STORAGE_KEY = 'vietphach.lab.stages.v1';
export function listStages(): Stage[] {
  const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return [];
  const list: unknown = JSON.parse(raw); if (!Array.isArray(list)) throw new Error('Kho ải bị lỗi; dữ liệu gốc được giữ nguyên.');
  const stages = list.map(parseStage); if (new Set(stages.map(s => s.id)).size !== stages.length) throw new Error('Kho ải có ID trùng.'); return stages;
}
export function saveStage(stage: Stage) { const clean = parseStage(stage), all = listStages(), i = all.findIndex(s => s.id === clean.id); if (i < 0) all.push(clean); else all[i] = clean; localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); }
export function loadZone(stage: Stage, zoneId: string): Zone { const zone = parseStage(stage).zones.find(z => z.id === zoneId); if (!zone) throw new Error('Khu không tồn tại.'); return structuredClone(zone); }
