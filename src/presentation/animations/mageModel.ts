import type Phaser from 'phaser';
import { splitSpriteSilhouettes, type SpriteSilhouette } from './spriteSilhouettes';

export const MAGE_MODEL_CANVAS = { width: 128, height: 96, anchor: { x: 64, y: 88 } } as const;
const RESOLUTION = 4;
const CORE_ROOTS = [204, 570, 922, 1306, 194, 573, 931, 1284];
const RUN_ROOTS = [[195, 516, 827, 1143], [178, 495, 810, 1118], [178, 503, 815, 1129], [165, 466, 794, 1113]];
const RUN_GROUNDS = [323, 628, 938, 1246];
const RUN_FACINGS = ['right', 'down', 'up', 'left'] as const;

export function preloadMageModel(scene: Phaser.Scene): void {
  scene.load.image('mage-model-poses', '/assets/characters/mage/model-v2/poses.png');
  scene.load.image('mage-model-run', '/assets/characters/mage/model-v2/run.png');
}

function readSheet(scene: Phaser.Scene, key: string, rows: number) {
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(source, 0, 0);
  const poses = splitSpriteSilhouettes(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, 4, rows);
  return { source, poses };
}

function poseCanvas(pose: SpriteSilhouette) {
  const canvas = document.createElement('canvas'); canvas.width = pose.width; canvas.height = pose.height;
  const ctx = canvas.getContext('2d')!;
  const data = ctx.createImageData(pose.width, pose.height); data.data.set(pose.pixels); ctx.putImageData(data, 0, 0);
  return canvas;
}

function addPose(scene: Phaser.Scene, key: string, pose: SpriteSilhouette, scale: number, root: number, ground: number) {
  const { width, height, anchor } = MAGE_MODEL_CANVAS;
  const canvas = document.createElement('canvas'); canvas.width = width * RESOLUTION; canvas.height = height * RESOLUTION;
  const ctx = canvas.getContext('2d')!; ctx.scale(RESOLUTION, RESOLUTION); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(poseCanvas(pose), anchor.x - (root - pose.x) * scale, anchor.y - (ground - pose.y) * scale,
    pose.width * scale, pose.height * scale);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas)!.customData = { characterResolution: RESOLUTION,
    characterAnchor: { x: anchor.x / width, y: anchor.y / height } };
}

/** Archer-matched painted Mage, with one identity across movement and casting. */
export function createMageModelTextures(scene: Phaser.Scene): void {
  const keys = ['mage-portrait', 'water-charge', 'water-full', 'water-cast-start', 'water-q-ready', 'water-q-command', 'mage-claw-hit',
    ...RUN_FACINGS.flatMap(facing => [`mage-idle-${facing}-0`, ...Array.from({ length: 4 }, (_, i) => `mage-run-${facing}-${i}`)])];
  if (keys.every(key => scene.textures.exists(key))) return;
  const core = readSheet(scene, 'mage-model-poses', 2);
  const coreScale = 74 / (500 * core.source.height / 1024);
  const names = ['mage-idle-down-0', 'mage-idle-right-0', 'mage-idle-up-0', 'mage-idle-left-0',
    'water-charge', 'water-cast-start', 'water-q-ready', 'water-q-command'];
  core.poses.forEach((pose, i) => addPose(scene, names[i], pose, coreScale,
    CORE_ROOTS[i] * core.source.width / 1536, (i < 4 ? 514 : 988) * core.source.height / 1024));
  addPose(scene, 'water-full', core.poses[4], coreScale, CORE_ROOTS[4] * core.source.width / 1536, 988 * core.source.height / 1024);
  addPose(scene, 'mage-claw-hit', core.poses[7], coreScale, CORE_ROOTS[7] * core.source.width / 1536, 988 * core.source.height / 1024);
  // Bent knees and a forward lean shorten the run silhouette; calibrate its
  // head/torso to standing art rather than stretching every stride to 74px.
  const run = readSheet(scene, 'mage-model-run', 4), runScale = 66 / (311 * run.source.height / 1254);
  run.poses.forEach((pose, i) => {
    const row = Math.floor(i / 4), frame = i % 4;
    addPose(scene, `mage-run-${RUN_FACINGS[row]}-${frame}`, pose, runScale,
      RUN_ROOTS[row][frame] * run.source.width / 1254, RUN_GROUNDS[row] * run.source.height / 1254);
  });
  if (scene.textures.exists('mage-portrait')) scene.textures.remove('mage-portrait');
  scene.textures.addCanvas('mage-portrait', poseCanvas(core.poses[0]));
}
