import { nonnegative } from '../core/validation';
import { overlaps } from '../../world/collision';
import type { Point, PlacedObject } from '../../world/definitions';
import type { CombatActor, ConfirmedHit, DamageResult } from './Damage';
import { worldBodyBox, sweptCircleContact, sweptCircleBoxContact, type BodyBox } from '../../world/bodyGeometry';

export interface Projectile {
  id: string; sourceId: string; position: Point; direction: Point;
  speed: number; radius: number; remainingRange: number; active: boolean; chargeRatio?: number; isFullCharge?: boolean;
}
export interface ProjectileTarget { id: string; position: Point; radius: number; hitbox?: BodyBox; actor?: CombatActor; targetable?: boolean }
export type ProjectileImpact = { type: 'enemy'; position: Point; direction: Point; chargeRatio?: number; isFullCharge?: boolean; hit: ConfirmedHit; damage?: DamageResult }
  | { type: 'obstacle'; position: Point; direction: Point; chargeRatio?: number; isFullCharge?: boolean; obstacleId: string };
export function createProjectile(id: string, sourceId: string, position: Point, direction: Point,
  settings: { speed: number; radius: number; range: number; chargeRatio?: number; isFullCharge?: boolean }): Projectile {
  if (settings.chargeRatio !== undefined && (!Number.isFinite(settings.chargeRatio) || settings.chargeRatio < 0 || settings.chargeRatio > 1)) throw new Error('Invalid charge ratio.');
  const length = Math.hypot(direction.x, direction.y);
  if (!id || !sourceId || ![position.x, position.y, length].every(Number.isFinite) || length <= 0) throw new Error('Invalid projectile origin/direction.');
  nonnegative(settings.speed, 'projectile speed'); nonnegative(settings.radius, 'projectile radius'); nonnegative(settings.range, 'projectile range');
  if (!settings.speed || !settings.radius || !settings.range) throw new Error('Projectile settings must be positive.');
  return { id, sourceId, position: { ...position }, direction: { x: direction.x / length, y: direction.y / length },
    speed: settings.speed, radius: settings.radius, remainingRange: settings.range, active: true, chargeRatio: settings.chargeRatio, isFullCharge: settings.isFullCharge };
}
// Reuse the current obstacle geometry. Small samples prevent crossing thin fences;
// refine the first occupied interval without changing player collision/sliding.
function obstacleContact(from: Point, delta: Point, radius: number, object: PlacedObject): number | undefined {
  if (overlaps(from, radius, object)) return 0;
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x,delta.y)/(radius/2)));
  const at = (t: number) => ({ x: from.x+delta.x*t, y: from.y+delta.y*t });
  for (let i=1; i<=steps; i++) {
    if (!overlaps(at(i/steps),radius,object)) continue;
    let low=(i-1)/steps, high=i/steps;
    for (let j=0;j<16;j++) { const mid=(low+high)/2; if(overlaps(at(mid),radius,object)) high=mid; else low=mid; }
    return high;
  }
  return undefined;
}
export function tickProjectile(projectile: Projectile, seconds: number, targets: readonly ProjectileTarget[], obstacles: readonly PlacedObject[]): ProjectileImpact | undefined {
  nonnegative(seconds, 'projectile delta');
  if (!projectile.active) return undefined;
  const distance = Math.min(projectile.speed*seconds, projectile.remainingRange);
  const from=projectile.position, delta={x:projectile.direction.x*distance,y:projectile.direction.y*distance};
  let first: { t: number; target?: ProjectileTarget; obstacle?: PlacedObject } | undefined;
  for (const target of targets) {
    if (target.id===projectile.sourceId) continue;
    nonnegative(target.radius,'target radius');
    if (![target.position.x,target.position.y].every(Number.isFinite)) throw new Error('Invalid projectile target.');
    const box=worldBodyBox(target);
    const t=box?sweptCircleBoxContact(from,delta,box,projectile.radius):sweptCircleContact(from,delta,target.position,projectile.radius+target.radius);
    if (t!==undefined && (!first || t<first.t)) first={t,target};
  }
  for (const obstacle of obstacles) {
    if (obstacle.kind!=='obstacle' || obstacle.passProjectiles) continue;
    const t=obstacleContact(from,delta,projectile.radius,obstacle);
    if(t!==undefined && (!first || t<=first.t)) first={t,obstacle};
  }
  const t=first?.t??1;
  projectile.position={x:from.x+delta.x*t,y:from.y+delta.y*t};
  projectile.remainingRange=Math.max(0,projectile.remainingRange-distance*t);
  if (first) {
    projectile.active=false;
    return first.target ? {type:'enemy',position:{...projectile.position},direction:{...projectile.direction},chargeRatio:projectile.chargeRatio,isFullCharge:projectile.isFullCharge,hit:{kind:'projectile',sourceId:projectile.sourceId,targetId:first.target.id}}
      : {type:'obstacle',position:{...projectile.position},direction:{...projectile.direction},chargeRatio:projectile.chargeRatio,isFullCharge:projectile.isFullCharge,obstacleId:first.obstacle!.id};
  }
  if (projectile.remainingRange===0) projectile.active=false;
  return undefined;
}

