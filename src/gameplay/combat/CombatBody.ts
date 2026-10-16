import type { CombatActor } from './Damage';
import type { ProjectileTarget } from './Projectile';
import { worldBodyBox } from '../../world/bodyGeometry';

export interface CombatBody extends ProjectileTarget {
  actor: CombatActor;
  targetable?: boolean;
  burrowed?: boolean;
  /** Encounter-supplied enemy rank, used by rank-sensitive effects such as knockback. */
  rank?: 'normal' | 'elite' | 'boss';
  slows?: { sourceId: string; multiplier: number; expiresAt: number }[];
}
export function bodyMoveMultiplier(body: CombatBody, now: number): number {
  body.slows=body.slows?.filter(s=>s.expiresAt>now);
  return Math.min(1,...(body.slows??[]).map(s=>s.multiplier));
}
export interface ViewBounds { x: number; y: number; width: number; height: number }
export function bodyInView(body: CombatBody, view: ViewBounds): boolean {
  const box=worldBodyBox(body);
  if(box)return box.x+box.width>=view.x && box.x<=view.x+view.width && box.y+box.height>=view.y && box.y<=view.y+view.height;
  return body.position.x >= view.x && body.position.x <= view.x + view.width
    && body.position.y >= view.y && body.position.y <= view.y + view.height;
}
export function validBody(body: CombatBody): boolean {
  return body.id === body.actor.id && body.targetable !== false && !body.burrowed && body.actor.resources.currentHp > 0;
}
