/** Ending artwork only; it is not a fifth playable map. */
export const KHANG_CHIEN_CLEANSED_MAP_URL='/assets/maps/village-area-1-cleansed-dusk-realistic-v1.png';
export const MAPS = {
  'kieu-ngao-1': { name: 'Kiêu Ngạo · Bìa Rừng', url: '/assets/maps/kieu-ngao/forest-edge-v1.png', width: 1800, height: 1200 },
  'kieu-ngao-2': { name: 'Kiêu Ngạo · Cầu Câm', url: '/assets/maps/kieu-ngao/silent-bridge-v1.png', width: 1800, height: 1200 },
  'kieu-ngao-3': { name: 'Kiêu Ngạo · Vòng Đá Cổ', url: '/assets/maps/kieu-ngao/stone-boundary-v1.png', width: 1800, height: 1200 },
  'kieu-ngao-4': { name: 'Kiêu Ngạo · Tim Rừng', url: '/assets/maps/kieu-ngao/sealed-heart-v1.png', width: 1800, height: 1200 },
  'linh-moc': { name: 'Linh Mộc Trấn Ải', url: '/assets/maps/linh-moc/sanctuary-v1.png', width: 1800, height: 1200 },
  village: { name: 'Khu 1 · Làng và ruộng', url: '/assets/maps/village-area-1-realistic-v4.png', width: 2200, height: 1400 },
  'khang-chien-1': { name: 'Kháng Chiến · Map 1', url: '/assets/maps/village-area-1-realistic-v4.png', width: 2200, height: 1400 },
  'khang-chien-2': { name: 'Kháng Chiến · Map 2', url: '/assets/maps/village-area-1-ruined-realistic-v3.png', width: 2200, height: 1400 },
  'khang-chien-3': { name: 'Kháng Chiến · Map 3', url: '/assets/maps/village-area-1-apocalypse-realistic-v3.png', width: 2200, height: 1400 },
  'khang-chien-4': { name: 'Kháng Chiến · Map 4', url: '/assets/maps/village-area-1-final-dusk-realistic-v3.png', width: 2200, height: 1400 },
} as const;
export type Point = { x: number; y: number };
export type Shape = { type: 'rect'; width: number; height: number } | { type: 'circle'; radius: number } | { type: 'polygon'; points: Point[] };
export type PlacedObject = Point & { id: string; name: string; kind: 'enemy' | 'npc' | 'obstacle'; resource: string; hp?: number; shape?: Shape;
  /** Blocks movement only; projectiles fly through (e.g. enemy bristle walls). */
  passProjectiles?: boolean };
export type Zone = { id: string; name: string; type: 'MONSTER' | 'EVENT' | 'TRADE'; mapId: keyof typeof MAPS; spawn: Point; exit?: Point; objects: PlacedObject[] };
export type Stage = { version: 1; id: string; name: string; zones: Zone[] };
