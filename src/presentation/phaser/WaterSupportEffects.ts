import type Phaser from 'phaser';
import type { Point } from '../../world/definitions';
import type { ShieldTarget } from '../../gameplay/combat/Shield';
import type { MageRuntime } from '../../gameplay/characters/jobs/mage/MageRuntime';
import { validBody, type CombatBody } from '../../gameplay/combat/CombatBody';
import { WATER_MAGE_COPY_TIMING as COPY } from '../../config/balance/waterMage';
import { hasWaterLong } from '../../gameplay/characters/jobs/mage/WaterLongRules';
import type { BodyBox } from '../../world/bodyGeometry';

const ROOT = '/assets/characters/mage';
const FRAME = 'artwork';
const GUARD_WIDTH = 78;
// Stretch along the link only; distance must not inflate its thickness.
const LINK_WIDTH = 12;
// Ground-plane centre of the oval in the original artwork, excluding raised droplets/rune.
const GUARD_GROUND_ANCHOR = { x: 0.5, y: 590 / 774 };
const MIRROR_WIDTH = 60;
// Mirror stays opposite horizontal aim; all copied VFX share this anchor.
const MIRROR_OFFSET = { x: -52, y: -76 };
// Display timing only. Shield/link/mirror lifetimes come exclusively from gameplay.
const HIT_SECONDS = 0.35;
const SHIELD_COPY_FLIGHT_SECONDS = 0.4;

/** Local visual anchor at the receiving body's edge, facing the incoming attack. */
export function waterGuardHitAnchor(side: Point, box: BodyBox = { x: -18, y: -60, width: 36, height: 60 }): { offset: Point; rotation: number } {
  const length = Math.hypot(side.x, side.y);
  const dx = length > 1e-6 ? side.x / length : 1, dy = length > 1e-6 ? side.y / length : 0;
  const reach = Math.min(Math.abs(dx) > 1e-6 ? box.width / 2 / Math.abs(dx) : Infinity,
    Math.abs(dy) > 1e-6 ? box.height / 2 / Math.abs(dy) : Infinity);
  return { offset: { x: box.x + box.width / 2 + dx * reach, y: box.y + box.height / 2 + dy * reach }, rotation: Math.atan2(dy, dx) };
}

/** Shared portal anchor: rendered mirrors and copied spells must agree, including at zero charges. */
export function waterMirrorOrigin(position: Point, aimX = 1): Point {
  return { x: position.x + (aimX < 0 ? -MIRROR_OFFSET.x : MIRROR_OFFSET.x), y: position.y + MIRROR_OFFSET.y };
}

export function preloadWaterSupport(scene: Phaser.Scene): void {
  scene.load.image('water-guard-mark', `${ROOT}/water-guard/active-mark.png`);
  scene.load.image('water-guard-hit', `${ROOT}/water-guard/damage-response.png`);
  scene.load.image('water-vein-link', `${ROOT}/water-vein/active-link-transparent.png`);
  for (const count of [1, 2, 3]) {
    scene.load.image(`water-mirror-${count}`, `${ROOT}/water-mirror-three-aspects/charges-${count}.png`);
  }
}

export function prepareWaterSupport(scene: Phaser.Scene): void {
  if(['water-guard-mark','water-guard-hit','water-vein-link','water-mirror-1','water-mirror-2','water-mirror-3']
    .every(key=>scene.textures.get(key).has(FRAME)))return;
  for (const key of ['water-guard-mark', 'water-guard-hit', 'water-vein-link']) {
    const bounds = alphaBounds(scene, key);
    const texture = scene.textures.get(key);
    if (!texture.has(FRAME)) texture.add(FRAME, 0, bounds.x, bounds.y, bounds.width, bounds.height);
  }
  // All charge states use the same rectangle so switching cannot shift/resize the artwork.
  const keys = [1, 2, 3].map(count => `water-mirror-${count}`);
  const bounds = keys.map(key => alphaBounds(scene, key));
  const x = Math.min(...bounds.map(b => b.x)), y = Math.min(...bounds.map(b => b.y));
  const right = Math.max(...bounds.map(b => b.x + b.width));
  const bottom = Math.max(...bounds.map(b => b.y + b.height));
  for (const key of keys) {
    const texture = scene.textures.get(key);
    if (!texture.has(FRAME)) texture.add(FRAME, 0, x, y, right - x, bottom - y);
  }
}

function alphaBounds(scene: Phaser.Scene, key: string) {
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    if (pixels[(y * canvas.width + x) * 4 + 3] === 0) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error(`Empty water support asset: ${key}`);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export function hasWaterGuard(actor: ShieldTarget, now: number): boolean {
  return actor.shields?.some(layer => layer.skillId === 'water-e' && layer.amount > 0 && layer.expiresAt > now) ?? false;
}

/** Reads gameplay state; never grants, expires or consumes a gameplay effect. */
export class WaterSupportEffects {
  private guards = new Map<string, Phaser.GameObjects.Image>();
  private links = new Map<string, Phaser.GameObjects.Image>();
  private hits: { targetId: string; image: Phaser.GameObjects.Image; expiresAt: number; offset: Point }[] = [];
  private shieldCopies: { targetId: string; image: Phaser.GameObjects.Image; origin: Point; startedAt: number }[] = [];
  private flashes: { images: Phaser.GameObjects.Image[]; origin: Point; startedAt: number }[] = [];
  private mirror: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.mirror = scene.add.image(0, 0, 'water-mirror-3', FRAME).setVisible(false);
  }

  get shieldCopyFlightCount(): number { return this.shieldCopies.length; }
  get copyFlashing(): boolean { return this.flashes.length > 0; }

  flashCopy(origin: Point, now: number, charges: number): void {
    // The final consumed mirror may already be hidden: its pending copy still gets a portal flash.
    const silhouette = charges > 0
      ? this.scene.add.image(origin.x, origin.y, `water-mirror-${charges}`, FRAME)
      : this.scene.add.image(origin.x, origin.y, 'water-orb-3');
    silhouette.setScale(MIRROR_WIDTH / silhouette.width).setTintFill(0xe8fcff).setBlendMode('ADD');
    const halo = this.scene.add.image(origin.x, origin.y, 'water-orb-3')
      .setScale(MIRROR_WIDTH * 1.35 / this.scene.textures.get('water-orb-3').getSourceImage().width)
      .setTint(0xc8f8ff).setBlendMode('ADD');
    for(const image of [silhouette, halo])image.setDepth(origin.y - MIRROR_OFFSET.y + 4);
    this.flashes.push({ images: [silhouette, halo], origin: { ...origin }, startedAt: now });
  }

  damageResponse(targetId: string, position: Point, now: number, guarded: boolean, side: Point, box?: BodyBox): void {
    if (!guarded) return;
    const anchor = waterGuardHitAnchor(side, box);
    const image = this.scene.add.image(position.x + anchor.offset.x, position.y + anchor.offset.y, 'water-guard-hit', FRAME)
      .setScale(68 / this.scene.textures.get('water-guard-hit').get(FRAME).height)
      .setRotation(anchor.rotation)
      .setDepth(position.y + 2);
    // Original art faces right; anchor its bright contact point, respecting trimmed pixels.
    const source = image.texture.getSourceImage() as HTMLImageElement;
    image.setDisplayOrigin(source.width * 0.62 - image.frame.cutX, source.height * 0.5 - image.frame.cutY);
    this.hits.push({ targetId, image, offset: anchor.offset, expiresAt: now + HIT_SECONDS });
  }

  copyShield(origin: Point, targets: readonly { id: string; position: Point }[], now: number): void {
    // Presentation of confirmed grants only; no projectile collision or second shield application.
    for (const target of targets) {
      const image = this.scene.add.image(origin.x, origin.y, 'water-orb-3').setVisible(false);
      image.setScale(16 / image.width).setDepth(Math.max(origin.y, target.position.y) + 3);
      this.shieldCopies.push({ targetId: target.id, image, origin: { ...origin }, startedAt: now + COPY.flash });
    }
  }

  update(mage: MageRuntime, position: Point, bodies: readonly CombatBody[], now: number, aimX = 1): void {
    const recipients = [{ id: mage.id, actor: mage, position }, ...bodies.filter(validBody)];
    const liveGuards = new Set<string>();
    for (const body of recipients) {
      if (body.actor.resources.currentHp <= 0 || !hasWaterGuard(body.actor, now)) continue;
      liveGuards.add(body.id);
      let image = this.guards.get(body.id);
      if (!image) {
        image = this.scene.add.image(0, 0, 'water-guard-mark', FRAME);
        const source = image.texture.getSourceImage() as HTMLImageElement;
        image.setDisplayOrigin(source.width * GUARD_GROUND_ANCHOR.x - image.frame.cutX,
          source.height * GUARD_GROUND_ANCHOR.y - image.frame.cutY);
        image.setScale(GUARD_WIDTH / image.width);
        this.guards.set(body.id, image);
      }
      image.setPosition(body.position.x, body.position.y).setDepth(body.position.y - 1);
    }
    this.prune(this.guards, liveGuards);

    const liveLinks = new Set<string>();
    for (const link of mage.waterSkills.links) {
      const target = bodies.find(body => body.id === link.targetId && validBody(body));
      if (!target || link.expiresAt <= now) continue;
      liveLinks.add(target.id);
      let image = this.links.get(target.id);
      if (!image) {
        image = this.scene.add.image(0, 0, 'water-vein-link', FRAME);
        this.links.set(target.id, image);
      }
      const dx = target.position.x - position.x, dy = target.position.y - position.y;
      const distance = Math.hypot(dx, dy);
      image.setBlendMode(hasWaterLong(mage)?'ADD':'NORMAL').setAlpha(hasWaterLong(mage)?.85:1);
      image.setPosition((position.x + target.position.x) / 2, (position.y + target.position.y) / 2)
        .setRotation(Math.atan2(dy, dx)).setScale(distance / image.width, LINK_WIDTH / image.height)
        .setDepth(Math.min(position.y, target.position.y) - 2).setVisible(distance > 1);
    }
    this.prune(this.links, liveLinks);

    const count = mage.waterSkills.mirrors.count;
    this.mirror.setVisible(count > 0 && mage.waterSkills.mirrors.expiresAt > now);
    if (count > 0) {
      const origin = waterMirrorOrigin(position, aimX);
      this.mirror.setTexture(`water-mirror-${count}`, FRAME).setScale(MIRROR_WIDTH / this.mirror.width)
        .setPosition(origin.x, origin.y).setDepth(position.y - 0.5);
    }
    this.flashes = this.flashes.filter(flash => {
      const elapsed=now-flash.startedAt;
      if(mage.resources.currentHp<=0 || elapsed>=COPY.flash){for(const image of flash.images)image.destroy();return false;}
      const progress=Math.max(0,elapsed/COPY.flash);
      const intensity=progress<0.25?0.6+progress*1.6:Math.max(0,(1-progress)/0.75);
      flash.images[0].setAlpha(intensity);
      flash.images[1].setAlpha(intensity*0.65);
      return true;
    });
    this.shieldCopies = this.shieldCopies.filter(copy => {
      const target = recipients.find(body => body.id === copy.targetId);
      const elapsed = now - copy.startedAt;
      if (mage.resources.currentHp <= 0 || !target || target.actor.resources.currentHp <= 0 || elapsed >= SHIELD_COPY_FLIGHT_SECONDS) {
        copy.image.destroy(); return false;
      }
      if(elapsed<0){copy.image.setVisible(false);return true;}
      copy.image.setVisible(true);
      const progress = Math.max(0, elapsed / SHIELD_COPY_FLIGHT_SECONDS);
      const dx = target.position.x - copy.origin.x, dy = target.position.y - 18 - copy.origin.y;
      copy.image.setPosition(copy.origin.x + dx * progress, copy.origin.y + dy * progress - 12 * Math.sin(Math.PI * progress))
        .setRotation(Math.atan2(dy, dx)).setDepth(target.position.y + 3)
        .setAlpha(Math.min(1, (1 - progress) * 4));
      return true;
    });
    this.hits = this.hits.filter(hit => {
      const body = recipients.find(body => body.id === hit.targetId);
      if (now >= hit.expiresAt || !body || body.actor.resources.currentHp <= 0) { hit.image.destroy(); return false; }
      hit.image.setPosition(body.position.x + hit.offset.x, body.position.y + hit.offset.y).setDepth(body.position.y + 2)
        .setAlpha(Math.min(1, (hit.expiresAt - now) / 0.15));
      return true;
    });
  }

  private prune(images: Map<string, Phaser.GameObjects.Image>, live: Set<string>): void {
    for (const [id, image] of images) if (!live.has(id)) { image.destroy(); images.delete(id); }
  }

  destroy(): void {
    this.mirror.destroy();
    for (const image of this.guards.values()) image.destroy();
    for (const image of this.links.values()) image.destroy();
    for (const hit of this.hits) hit.image.destroy();
    for (const copy of this.shieldCopies) copy.image.destroy();
    for (const flash of this.flashes) for(const image of flash.images)image.destroy();
    this.guards.clear(); this.links.clear(); this.hits = []; this.shieldCopies = []; this.flashes = [];
  }
}
