import { applyHpDamage, validateResources, type ResourceTarget } from '../characters/core/CharacterResources';
import { validateStats } from '../characters/core/CharacterStats';
import { nonnegative, roll } from '../core/validation';
import { elementRelation, elementMultiplier, validateElement, type Element, type ElementRelation } from './Element';
import { actorTargetAllowed, type ActorIdentity, type ActorTargetPolicy } from './Targeting';
import { COMBAT_BALANCE } from '../../config/balance/core';
import { absorbShieldDamage } from './Shield';
import { clearThreat, recordDamageThreat, tickThreatRecovery, type CombatRole, type ThreatState } from '../enemies/EnemyThreat';

export interface CombatActor extends ActorIdentity, ResourceTarget {
  element: Element; combatRole: CombatRole; threat?: ThreatState;
}
// Supplied only by the hit/collision adapter; no targeting or RNG may manufacture a hit.
export interface ConfirmedHit { kind: 'projectile' | 'hitbox' | 'aoe'; sourceId: string; targetId: string }
export interface DamageRequest {
  source: CombatActor; target: CombatActor; element: Element; rawDamage: number;
  canCrit: boolean; targetPolicy: ActorTargetPolicy; hit: ConfirmedHit | null;
}
export function resolveDefense(damageBeforeDef: number, defense: number): { reduction: number; damageAfterDef: number } {
  nonnegative(damageBeforeDef, 'damage before DEF'); nonnegative(defense, 'DEF');
  const scale = COMBAT_BALANCE.DEF_SCALE;
  const denominator = defense + scale;
  return { reduction: defense / denominator,
    // Multiply by the retained fraction to avoid overflow or 1-reduction cancellation.
    damageAfterDef: damageBeforeDef * (scale / denominator) };
}
export interface DamageResult {
  hit: boolean; critical: boolean; rawDamage: number; afterCrit: number; afterDef: number;
  relation: ElementRelation; multiplier: number; finalDamage: number; absorbedDamage: number; appliedDamage: number; killed: boolean;
}
export function resolveDamage(request: DamageRequest, policy: { random: () => number; now?: number }): DamageResult {
  const { source, target, hit } = request;
  validateElement(request.element); validateElement(source.element); validateElement(target.element);
  nonnegative(request.rawDamage, 'raw damage'); validateStats(source.stats); validateStats(target.stats);
  validateResources(source); validateResources(target);
  if (typeof request.canCrit !== 'boolean') throw new Error('Missing crit policy.');
  if(target.threat && !['melee','ranged'].includes(source.combatRole))throw new Error('Missing actor combat role for threat.');
  if(target.threat)nonnegative(policy.now??0,'damage time');
  const relation = elementRelation(request.element, target.element), multiplier = elementMultiplier(relation);
  const result: DamageResult = { hit: false, critical: false, rawDamage: request.rawDamage,
    afterCrit: 0, afterDef: 0, relation, multiplier, finalDamage: 0, absorbedDamage: 0, appliedDamage: 0, killed: false };
  if (!hit) return result;
  if (!['projectile', 'hitbox', 'aoe'].includes(hit.kind) || hit.sourceId !== source.id || hit.targetId !== target.id) throw new Error('Hit identity mismatch.');
  if (!actorTargetAllowed(source, target, request.targetPolicy) || source.resources.currentHp <= 0 || target.resources.currentHp <= 0) return result;
  const critical = request.canCrit && roll(policy.random) < source.stats.critChance;
  const afterCrit = nonnegative(request.rawDamage * (critical ? source.stats.critDamage : 1), 'crit damage');
  const afterDef = resolveDefense(afterCrit, target.stats.def).damageAfterDef;
  const finalDamage = nonnegative(afterDef * multiplier, 'final damage');
  if(target.threat && finalDamage>0)tickThreatRecovery(target.threat,target,policy.now??0);
  const absorbedDamage = absorbShieldDamage(target, finalDamage, policy.now ?? 0);
  const appliedDamage = applyHpDamage(target, finalDamage - absorbedDamage);
  if(target.threat && finalDamage>0){
    if(target.resources.currentHp<=0)clearThreat(target.threat,policy.now??0);
    else recordDamageThreat(target.threat,source.id,source.combatRole,policy.now??0);
  }
  return { hit: true, critical, rawDamage: request.rawDamage, afterCrit, afterDef, relation, multiplier,
    finalDamage, absorbedDamage, appliedDamage, killed: target.resources.currentHp === 0 };
}
