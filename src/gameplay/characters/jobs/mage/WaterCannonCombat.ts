import { WATER_CANNON_DAMAGE } from '../../../../config/balance/waterCannon';
import { grantMach } from './WaterMagePassive';
import { resolveDamage, type CombatActor, type ConfirmedHit, type DamageResult } from '../../../combat/Damage';
import { nonnegative } from '../../../core/validation';
import type { MageRuntime } from './MageRuntime';

/** One attack owns the charge/damage snapshot and its grant-once guard. */
export interface WaterCannonAttack {
  readonly sourceId: string;
  readonly chargeRatio: number;
  readonly rawDamage: number;
  readonly hitTargets: Set<string>;
  machGranted: boolean;
  sietTriggered?:boolean;
}

export function waterCannonDamage(atk: number, chargeRatio: number): number {
  nonnegative(atk, 'ATK'); nonnegative(chargeRatio, 'charge ratio');
  if (chargeRatio > 1) throw new Error('Charge ratio exceeds 1.');
  return nonnegative(atk * (WATER_CANNON_DAMAGE.base + WATER_CANNON_DAMAGE.charge * chargeRatio), 'Water Cannon damage');
}

export function createWaterCannonAttack(mage: MageRuntime, chargeRatio: number): WaterCannonAttack {
  return { sourceId: mage.id, chargeRatio, rawDamage: waterCannonDamage(mage.stats.atk, chargeRatio)*(mage.waterSkills.encounterBuff?.cannonDamage??1),
    hitTargets: new Set(), machGranted: false };
}

export function resolveWaterCannonHit(mage: MageRuntime, attack: WaterCannonAttack,
  target: CombatActor, hit: ConfirmedHit, random: () => number, now = 0): DamageResult | undefined {
  if (attack.sourceId !== mage.id || hit.kind !== 'projectile' || hit.sourceId !== mage.id || hit.targetId !== target.id) {
    throw new Error('Water Cannon hit identity mismatch.');
  }
  if (attack.hitTargets.has(target.id)) return undefined;
  const result = resolveDamage({ source: mage, target, element: 'water', rawDamage: attack.rawDamage,
    canCrit: true, targetPolicy: 'ENEMY', hit }, { random, now });
  if (!result.hit) return result;
  attack.hitTargets.add(target.id);
  if (attack.chargeRatio === 1 && !attack.machGranted) {
    grantMach(mage,'original',now);
    attack.machGranted = true;
  }
  return result;
}
