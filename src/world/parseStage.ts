import { MAPS, type Point, type Stage } from './definitions';
import { overlaps } from './collision';

export function parseStage(input: unknown): Stage {
  const data = structuredClone(input) as Stage;
  const fail = (message: string): never => { throw new Error(message); };
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  const label = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 120;
  const fields = (value: object, allowed: string[]) => { if (Object.keys(value).some(k => !allowed.includes(k))) fail('Dữ liệu có trường không được hỗ trợ; không nhập AI, damage hoặc skill vào Lab.'); };
  const ids = new Set<string>();
  const id = (v: unknown) => { if (!label(v) || ids.has(v as string)) fail('ID thiếu hoặc bị trùng.'); ids.add(v as string); };
  const point = (p: unknown, w: number, h: number, margin = 0) => {
    if (!record(p) || !finite(p.x) || !finite(p.y) || p.x < margin || p.y < margin || p.x > w - margin || p.y > h - margin) fail('Tọa độ nằm ngoài map hoặc không hợp lệ.');
  };
  if (!record(data) || data.version !== 1 || !label(data.name) || !Array.isArray(data.zones) || data.zones.length < 1 || data.zones.length > 50) fail('Ải cần tên, version 1 và 1–50 khu.');
  id(data.id);
  fields(data, ['version', 'id', 'name', 'zones']);
  for (const z of data.zones) {
    if (!record(z) || !label(z.name) || !Object.hasOwn(MAPS, z.mapId) || !['MONSTER', 'EVENT', 'TRADE'].includes(z.type) || !Array.isArray(z.objects) || z.objects.length > 500) fail('Khu không hợp lệ.');
    fields(z, ['id', 'name', 'type', 'mapId', 'spawn', 'exit', 'objects']);
    id(z.id); const map = MAPS[z.mapId]; point(z.spawn, map.width, map.height, 12);
    if (z.exit) point(z.exit, map.width, map.height, 12);
    for (const o of z.objects) {
      if (!record(o) || !label(o.name) || !['enemy', 'npc', 'obstacle'].includes(o.kind) || !label(o.resource)) fail('Đối tượng không hợp lệ.');
      id(o.id); point(o, map.width, map.height, o.kind === 'obstacle' ? 0 : 12);
      fields(o, ['id', 'name', 'kind', 'resource', 'x', 'y', ...(o.kind === 'enemy' ? ['hp'] : []), ...(o.kind === 'obstacle' ? ['shape'] : [])]);
      if (o.hp !== undefined && (o.kind !== 'enemy' || !Number.isSafeInteger(o.hp) || o.hp < 1 || o.hp > 10000000)) fail('HP quái phải là số nguyên 1–10.000.000.');
      if (o.kind === 'obstacle') {
        if (!record(o.shape)) throw new Error('Vật cản thiếu hình dạng.');
        const s = o.shape!;
        fields(s, s.type === 'rect' ? ['type', 'width', 'height'] : s.type === 'circle' ? ['type', 'radius'] : ['type', 'points']);
        if (s.type === 'rect') { if (!finite(s.width) || !finite(s.height) || s.width <= 0 || s.height <= 0 || o.x + s.width > map.width || o.y + s.height > map.height) fail('Chữ nhật vượt map hoặc có kích thước sai.'); }
        else if (s.type === 'circle') { if (!finite(s.radius) || s.radius <= 0) fail('Bán kính không hợp lệ.'); point(o, map.width, map.height, s.radius); }
        else if (s.type === 'polygon') {
          if (!Array.isArray(s.points) || s.points.length < 3 || s.points.length > 100) fail('Đa giác cần 3–100 đỉnh.');
          for (const p of s.points) { if (!record(p) || !finite(p.x) || !finite(p.y)) fail('Đỉnh đa giác không hợp lệ.'); fields(p, ['x', 'y']); point({ x: o.x + p.x, y: o.y + p.y }, map.width, map.height); }
          let area = 0;
          const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
          s.points.forEach((p, i) => {
            const q = s.points[(i + 1) % s.points.length];
            if (Math.hypot(p.x - q.x, p.y - q.y) < 1) fail('Đỉnh liền nhau bị trùng.');
            area += p.x * q.y - q.x * p.y;
            for (let j = i + 2; j < s.points.length; j++) {
              if (i === 0 && j === s.points.length - 1) continue;
              const a = s.points[j], b = s.points[(j + 1) % s.points.length];
              const bounded = Math.max(Math.min(p.x, q.x), Math.min(a.x, b.x)) <= Math.min(Math.max(p.x, q.x), Math.max(a.x, b.x)) && Math.max(Math.min(p.y, q.y), Math.min(a.y, b.y)) <= Math.min(Math.max(p.y, q.y), Math.max(a.y, b.y));
              if (bounded && cross(p, q, a) * cross(p, q, b) <= 0 && cross(a, b, p) * cross(a, b, q) <= 0) fail('Các cạnh đa giác không được tự cắt nhau.');
            }
          });
          if (Math.abs(area) < 1) fail('Đa giác phải có diện tích.');
        }
        else fail('Hình dạng vật cản không được hỗ trợ.');
      }
    }
    if (z.objects.some(o => overlaps(z.spawn, 12, o))) fail('Điểm xuất hiện bị vật cản che.');
    if (z.exit && z.objects.some(o => overlaps(z.exit!, 12, o))) fail('Lối ra bị vật cản che.');
    if (z.objects.some(o => o.kind !== 'obstacle' && z.objects.some(b => overlaps(o, 12, b)))) fail('Quái hoặc NPC nằm trong vật cản.');
  }
  return data;
}
