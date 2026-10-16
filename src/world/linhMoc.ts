import type { Zone, Point } from './definitions';

export const LINH_MOC_HEART = { x: 940, y: 420, radius: 46 } as const;
export const LINH_MOC_LANES: readonly { name: string; spawn: Point; approach: readonly Point[] }[] = [
  { name: 'Cổng Tây', spawn: { x: 420, y: 780 }, approach: [{ x: 650, y: 650 }, { x: 840, y: 500 }] },
  { name: 'Cổng Đông', spawn: { x: 1370, y: 760 }, approach: [{ x: 1190, y: 650 }, { x: 1030, y: 500 }] },
  { name: 'Lối Bắc', spawn: { x: 1310, y: 350 }, approach: [{ x: 1160, y: 390 }, { x: 1030, y: 420 }] },
];

export function createLinhMocZone(): Zone {
  const heart = LINH_MOC_HEART;
  return { id: 'linh-moc', name: 'Linh Mộc Trấn Ải', type: 'MONSTER', mapId: 'linh-moc', spawn: { x: 940, y: 640 }, objects: [
    { id: 'linh-moc-heart', name: 'Linh Mộc', kind: 'obstacle', resource: 'wood-heart', x: heart.x, y: heart.y,
      shape: { type: 'polygon', points: Array.from({ length: 12 }, (_, i) => ({ x: Math.cos(i * Math.PI / 6) * heart.radius, y: Math.sin(i * Math.PI / 6) * heart.radius * .7 })) } },
    ...[
      [0, 0, 310, 400], [750, 0, 370, 315], [1570, 0, 230, 790], [0, 900, 230, 300], [810, 950, 420, 250], [1530, 1040, 270, 160],
    ].map(([x, y, width, height], i) => ({ id: `linh-moc-edge-${i}`, name: 'Tre và rễ cổ thụ', kind: 'obstacle' as const,
      resource: 'forest-edge', x, y, shape: { type: 'rect' as const, width, height } })),
  ] };
}
