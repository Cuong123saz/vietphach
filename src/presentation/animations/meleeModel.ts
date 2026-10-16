import type Phaser from 'phaser';
import { splitSpriteSilhouettes, type SpriteSilhouette } from './spriteSilhouettes';

export const MELEE_JOBS = ['warrior', 'fighter', 'swordsman'] as const;
export type MeleeJob = typeof MELEE_JOBS[number];
export const MELEE_FACINGS = ['down', 'right', 'up', 'left'] as const;
export type MeleeFacing = typeof MELEE_FACINGS[number];
export const MELEE_COMBAT_POSES = ['ready', 'windup', 'strike', 'guard'] as const;
export type MeleePose = 'idle' | 'run' | typeof MELEE_COMBAT_POSES[number];
export const MELEE_MODEL_CANVAS = { width: 160, height: 112, anchor: { x: 80, y: 104 }, resolution: 3 } as const;
const RUN_FACINGS = ['right', 'down', 'up', 'left'] as const;

export const MELEE_MODELS = {
  warrior: { name: 'Chiến Binh Hỏa', element: 'Hỏa', color: '#ff9971', tint: 0xff9971,
    description: 'Vai rộng, tay chắc · đại đao khắc lửa',
    coreScale: 80 / 400, coreRoots: [260, 750, 288, 730, 245, 777, 236, 783], coreGrounds: [406, 817, 1204, 1533],
    runScale: .25, runRoots: [[161, 492, 785, 1112], [181, 497, 811, 1105], [184, 504, 818, 1120], [184, 486, 797, 1120]],
    runGrounds: [309, 619, 928, 1223] },
  fighter: { name: 'Đấu Sĩ Thổ', element: 'Thổ', color: '#edc675', tint: 0xedc675,
    description: 'Thân dày, giáp nặng · búa đá chấn địa',
    coreScale: 84 / 400, coreRoots: [272, 732, 289, 727, 292, 799, 249, 778], coreGrounds: [410, 810, 1200, 1523],
    runScale: .26, runRoots: [[166, 493, 795, 1116], [159, 486, 802, 1104], [172, 492, 803, 1114], [182, 484, 791, 1106]],
    runGrounds: [301, 618, 929, 1219] },
  swordsman: { name: 'Kiếm Khách Kim', element: 'Kim', color: '#e4e6eb', tint: 0xe4e6eb,
    description: 'Ngực nở, tay đô · kiếm thẳng, giáp gọn',
    coreScale: 80 / 400, coreRoots: [270, 730, 296, 724, 283, 757, 244, 781], coreGrounds: [402, 815, 1178, 1524],
    runScale: .245, runRoots: [[167, 479, 796, 1115], [155, 479, 803, 1103], [185, 490, 802, 1116], [184, 484, 788, 1104]],
    runGrounds: [309, 608, 938, 1232] },
} as const;

export function isMeleeJob(value: string | null): value is MeleeJob {
  return MELEE_JOBS.some(job => job === value);
}

export function meleePoseKeys(job: MeleeJob): string[] {
  return [...MELEE_FACINGS.map(f => `${job}-idle-${f}`), ...MELEE_COMBAT_POSES.map(p => `${job}-${p}`),
    ...RUN_FACINGS.flatMap(f => Array.from({ length: 4 }, (_, i) => `${job}-run-${f}-${i}`))];
}

export function preloadMeleeModels(scene: Phaser.Scene): void {
  for (const job of MELEE_JOBS) {
    scene.load.image(`${job}-model-core`, `/assets/characters/${job}/model-v1/poses-v2.png`);
    scene.load.image(`${job}-model-run`, `/assets/characters/${job}/model-v1/run.png`);
  }
}

/** Fixed body scale; raising a weapon must never shrink the character. */
export function meleePlacement(job: MeleeJob, mode: 'core' | 'run', index: number, width: number, height: number) {
  const profile = MELEE_MODELS[job];
  if (mode === 'core') return { scale: profile.coreScale * 1536 / height,
    root: profile.coreRoots[index] * width / 1024, ground: profile.coreGrounds[Math.floor(index / 2)] * height / 1536 };
  const row = Math.floor(index / 4), frame = index % 4;
  return { scale: profile.runScale * 1254 / height,
    root: profile.runRoots[row][frame] * width / 1254, ground: profile.runGrounds[row] * height / 1254 };
}

function readSheet(scene: Phaser.Scene, key: string, columns: number, rows: number) {
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(source, 0, 0);
  const poses = splitSpriteSilhouettes(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, columns, rows);
  if (poses.some(p => p.height < source.height / (rows * 2) || p.width < source.width / (columns * 5))) {
    throw new Error(`${key}: missing isolated full-body pose.`);
  }
  return { source, poses };
}

function poseCanvas(pose: SpriteSilhouette) {
  const canvas = document.createElement('canvas'); canvas.width = pose.width; canvas.height = pose.height;
  const ctx = canvas.getContext('2d')!, data = ctx.createImageData(pose.width, pose.height);
  data.data.set(pose.pixels); ctx.putImageData(data, 0, 0); return canvas;
}

function addPose(scene: Phaser.Scene, key: string, pose: SpriteSilhouette, placement: ReturnType<typeof meleePlacement>) {
  const { width, height, anchor, resolution } = MELEE_MODEL_CANVAS;
  const { scale, root, ground } = placement;
  const x = anchor.x - (root - pose.x) * scale, y = anchor.y - (ground - pose.y) * scale;
  if (x < 1 || y < 1 || x + pose.width * scale > width - 1 || y + pose.height * scale > height - 1) {
    throw new Error(`${key}: weapon or body would be clipped.`);
  }
  const canvas = document.createElement('canvas'); canvas.width = width * resolution; canvas.height = height * resolution;
  const ctx = canvas.getContext('2d')!; ctx.scale(resolution, resolution); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(poseCanvas(pose), x, y, pose.width * scale, pose.height * scale);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas)!.customData = { characterResolution: resolution,
    characterAnchor: { x: anchor.x / width, y: anchor.y / height } };
}

export function createMeleeModelTextures(scene: Phaser.Scene, job: MeleeJob): void {
  const keys = meleePoseKeys(job);
  if ([...keys, `${job}-portrait`].every(key => scene.textures.exists(key))) return;
  const core = readSheet(scene, `${job}-model-core`, 2, 4), run = readSheet(scene, `${job}-model-run`, 4, 4);
  core.poses.forEach((pose, i) => addPose(scene, keys[i], pose, meleePlacement(job, 'core', i, core.source.width, core.source.height)));
  run.poses.forEach((pose, i) => addPose(scene, keys[8 + i], pose, meleePlacement(job, 'run', i, run.source.width, run.source.height)));
  if (scene.textures.exists(`${job}-portrait`)) scene.textures.remove(`${job}-portrait`);
  scene.textures.addCanvas(`${job}-portrait`, poseCanvas(core.poses[0]));
}
