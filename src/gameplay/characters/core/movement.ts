import { movePlayer } from '../../../world/collision';
import { MAPS } from '../../../world/definitions';
import type { Point, Zone } from '../../../world/definitions';
import { validateBodyBox, type BodyBox, type BodyGeometry } from '../../../world/bodyGeometry';

export interface MovementSettings { speed: number; radius: number; hitbox?: BodyBox; blockingBodies?: readonly BodyGeometry[]; passWaterBarrier?: boolean }

export function moveCharacter(position: Point, direction: Point, seconds: number, zone: Zone, settings: MovementSettings): Point {
  if (![direction.x, direction.y, seconds, settings.speed, settings.radius].every(Number.isFinite)
      || seconds < 0 || settings.speed < 0 || settings.radius <= 0) {
    throw new Error('Invalid movement input.');
  }
  const mapSize = Math.min(MAPS[zone.mapId].width, MAPS[zone.mapId].height);
  if (settings.radius * 2 > mapSize) throw new Error('Character does not fit in map.');
  if(settings.hitbox){validateBodyBox(settings.hitbox);if(settings.hitbox.width>MAPS[zone.mapId].width || settings.hitbox.height>MAPS[zone.mapId].height)throw new Error('Character hitbox does not fit in map.');}
  const scale = settings.speed * seconds / Math.max(1, Math.hypot(direction.x, direction.y));
  return movePlayer(position, direction.x * scale, direction.y * scale, zone, settings.radius,{hitbox:settings.hitbox,blockers:settings.blockingBodies,passWaterBarrier:settings.passWaterBarrier});
}
