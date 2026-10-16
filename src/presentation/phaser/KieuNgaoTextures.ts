import type Phaser from 'phaser';
import type { BodyBox } from '../../world/bodyGeometry';
export const FOREST_PERSON_REGIONS = [[0,530,0,520],[530,1050,0,520],[1050,1536,0,520],
  [0,600,540,1024],[600,1070,520,1024],[1070,1536,520,1024]] as const;

export function preloadKieuNgaoTextures(scene: Phaser.Scene) {
  scene.load.image('forest-moc-loc', '/assets/monsters/kieu-ngao/moc-loc-sheet-v1.png');
  scene.load.image('forest-people', '/assets/characters/archer/kieu-ngao-people-v1.png');
}
/** Extract only transparent padding; retain source pixels and use torso geometry without antlers. */
export function prepareKieuNgaoTextures(scene: Phaser.Scene) {
  for (const [key, columns, rows, names] of [
    ['forest-moc-loc', 2, 1, ['guard', 'charge']],
    ['forest-people', 3, 2, ['hunter-1', 'hunter-2', 'mentor-live', 'mentor-dead', 'mentor-bound', 'archer-sit']],
  ] as const) {
    const texture = scene.textures.get(key); if (texture.has(names[0])) continue;
    const source = texture.getSourceImage() as HTMLImageElement;
    const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(source, 0, 0);
    const data = ctx.getImageData(0, 0, source.width, source.height).data;
    names.forEach((name, i) => {
      // Explicit padded regions preserve the reclining figure's hand/feet and the first hunter's toes.
      const region = key === 'forest-people' ? FOREST_PERSON_REGIONS[i] : undefined;
      const x0 = region ? Math.floor(region[0] / 1536 * source.width) : Math.floor(i % columns * source.width / columns);
      const x1 = region ? Math.floor(region[1] / 1536 * source.width) : Math.floor((i % columns + 1) * source.width / columns);
      const y0 = region ? Math.floor(region[2] / 1024 * source.height) : Math.floor(Math.floor(i / columns) * source.height / rows);
      const y1 = region ? Math.floor(region[3] / 1024 * source.height) : Math.floor((Math.floor(i / columns) + 1) * source.height / rows);
      let left = x1, right = x0, top = y1, bottom = y0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (data[(y * source.width + x) * 4 + 3] >= 24) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (left > right) throw new Error(`Empty forest sprite: ${key}/${name}`);
      const frame = texture.add(name, 0, left, top, right - left + 1, bottom - top + 1)!;
      frame.customData = { body: { x: frame.width * .2, y: frame.height * .36, width: frame.width * .6, height: frame.height * .6 } satisfies BodyBox };
    });
  }
}
export function setMocLocPose(sprite: Phaser.GameObjects.Sprite, charging = false, flip = false) {
  const texture = sprite.scene.textures.get('forest-moc-loc'), extent = Math.max(...['guard', 'charge'].map(n => Math.max(texture.get(n).width, texture.get(n).height)));
  sprite.setTexture('forest-moc-loc', charging ? 'charge' : 'guard').setScale(230 / extent).setOrigin(.5, .96).setFlipX(flip);
}
export function setForestPerson(sprite: Phaser.GameObjects.Sprite, frame: string, height = 76) {
  sprite.setTexture('forest-people', frame).setScale(height / sprite.frame.height).setOrigin(.5, .94);
}
