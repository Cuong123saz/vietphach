import { nonnegative } from '../core/validation';
import type { Point } from '../../world/definitions';
export interface ActorIdentity { id: string; team: string }
export type ActorTargetPolicy = 'SELF' | 'ALLY' | 'ENEMY' | 'ALLY_OR_ENEMY';
export type TargetIntent = { mode: ActorTargetPolicy; target: ActorIdentity }
  | { mode: 'GROUND'; point: Point } | { mode: 'DIRECTION'; direction: Point };
export function actorTargetAllowed(source: ActorIdentity, target: ActorIdentity, policy: ActorTargetPolicy): boolean {
  if (!source.id || !target.id || !source.team || !target.team) throw new Error('Invalid actor identity.');
  const self = source.id === target.id, ally = source.team === target.team;
  switch (policy) {
    case 'SELF': return self;
    case 'ALLY': return !self && ally;
    case 'ENEMY': return !self && !ally;
    case 'ALLY_OR_ENEMY': return !self;
    default: throw new Error('Invalid targeting policy.');
  }
}
// Target eligibility never certifies a physical hit.
export function validateTarget(source: ActorIdentity, intent: TargetIntent): boolean {
  if (intent.mode === 'GROUND' || intent.mode === 'DIRECTION') {
    const p = intent.mode === 'GROUND' ? intent.point : intent.direction;
    nonnegative(Math.abs(p.x), 'target x'); nonnegative(Math.abs(p.y), 'target y');
    return intent.mode === 'GROUND' || Math.hypot(p.x, p.y) > 0;
  }
  return actorTargetAllowed(source, intent.target, intent.mode);
}
