import type { Point, Zone } from './definitions';

export const KIEU_NGAO_NAMES = ['Bìa Rừng', 'Cầu Câm', 'Vòng Đá Cổ', 'Tim Rừng'] as const;
export const FOREST_RETURN_EXIT: Point = { x: 240, y: 820 };
export const FOREST_FORWARD_CLUES: readonly Point[] = [{ x: 1400, y: 800 }, { x: 1320, y: 670 }, { x: 1310, y: 740 }];
export const MOC_LOC_SEAL = { x: 1100, y: 610, radiusX: 380, radiusY: 260 } as const;
export const MOC_LOC_ROOTS: readonly Point[] = [{ x: 760, y: 620 }, { x: 1280, y: 780 }, { x: 1220, y: 410 }];

export function createKieuNgaoZone(index = 0, returning = false): Zone {
  if (!Number.isInteger(index) || index < 0 || index > 3) throw new Error('Kiêu Ngạo requires Map 1–4.');
  const mapId = `kieu-ngao-${index + 1}` as Zone['mapId'];
  const trailY = index === 1 ? 670 : 820;
  return { id: mapId, name: KIEU_NGAO_NAMES[index], type: 'MONSTER', mapId,
    spawn: { x: returning ? 1450 : 390, y: trailY }, exit: returning && index === 0 ? { x: 470, y: 550 } : { x: returning ? FOREST_RETURN_EXIT.x : 1480, y: trailY },
    // Keep the entire left/right story route and every root reachable. Trees at the margins form its boundary.
    objects: [[0, 0, 1800, 230], [0, 1060, 1800, 140], [0, 230, 110, 830], [1690, 230, 110, 830]].map(([x, y, width, height], i) => ({
      id: `${mapId}-edge-${i}`, name: 'Rừng rậm', kind: 'obstacle' as const, resource: 'forest-edge', x, y, shape: { type: 'rect' as const, width, height },
    })).concat(index === 1 ? [230, 750].map((y, i) => ({ id: `${mapId}-water-${i}`, name: 'Lòng suối', kind: 'obstacle' as const,
      resource: 'stream', x: 825, y, shape: { type: 'rect' as const, width: 200, height: i === 0 ? 300 : 310 } })) : []),
  };
}

/** The guardian's feet stay inside the stone seal, including its committed charge. */
export function insideMocLocSeal(point: Point): Point {
  const s = MOC_LOC_SEAL, dx = point.x - s.x, dy = point.y - s.y;
  const length = Math.hypot(dx / (s.radiusX - 45), dy / (s.radiusY - 45));
  return length <= 1 ? { ...point } : { x: s.x + dx / length, y: s.y + dy / length };
}
