import { clamp, nonnegative } from '../../core/validation';
import { validateStats, type CharacterStats } from './CharacterStats';
import type { ShieldTarget } from '../../combat/Shield';

export interface ResourcePool { current: number; max: number }
export interface CharacterResources {
  currentHp: number; currentMp: number;
  additional: Record<string, ResourcePool>;
}
/** Optional encounter gate. Damage cannot cross it or raise an actor already below it. */
export interface ResourceTarget extends ShieldTarget { stats: CharacterStats; resources: CharacterResources; minimumHp?: number }
export function validateResources(target: ResourceTarget): void {
  validateStats(target.stats);
  if(target.minimumHp!==undefined && (!Number.isFinite(target.minimumHp) || target.minimumHp<0 || target.minimumHp>target.stats.maxHp))throw new Error('Invalid encounter HP floor.');
  nonnegative(target.resources.currentHp, 'current HP'); nonnegative(target.resources.currentMp, 'current MP');
  if (target.resources.currentHp > target.stats.maxHp || target.resources.currentMp > target.stats.maxMp) throw new Error('Current resource exceeds max.');
}
export const createResources = (stats: CharacterStats): CharacterResources => {
  validateStats(stats);
  return { currentHp: stats.maxHp, currentMp: stats.maxMp, additional: {} };
};
export function preserveRatio(current: number, oldMax: number, newMax: number): number {
  nonnegative(current, 'current'); nonnegative(oldMax, 'old max'); nonnegative(newMax, 'new max');
  return clamp(oldMax > 0 ? newMax * (current / oldMax) : newMax, newMax);
}
export function reconcileResources(resources: CharacterResources, before: CharacterStats, after: CharacterStats): CharacterResources {
  validateResources({ stats: before, resources }); validateStats(after);
  return { currentHp: preserveRatio(resources.currentHp, before.maxHp, after.maxHp),
    currentMp: preserveRatio(resources.currentMp, before.maxMp, after.maxMp), additional: structuredClone(resources.additional) };
}
export function heal(target: ResourceTarget, amount: number): number {
  validateResources(target); nonnegative(amount, 'healing');
  const before = target.resources.currentHp;
  if (before <= 0) return 0; // Death is not revived by healing.
  target.resources.currentHp = clamp(before + amount, target.stats.maxHp);
  return target.resources.currentHp - before;
}
export function applyHpDamage(target: ResourceTarget, amount: number): number {
  validateResources(target); nonnegative(amount, 'damage');
  const before = target.resources.currentHp;
  target.resources.currentHp = Math.max(Math.min(before,target.minimumHp??0),clamp(before - amount, target.stats.maxHp));
  return before - target.resources.currentHp;
}
export function restoreResource(target: ResourceTarget, type: string, amount: number): number {
  validateResources(target); nonnegative(amount, 'resource restore');
  if (type === 'hp' || type === 'currentHp') throw new Error('Use healing for HP.');
  if (type === 'mp') {
    const before = target.resources.currentMp;
    target.resources.currentMp = clamp(before + amount, target.stats.maxMp);
    return target.resources.currentMp - before;
  }
  const pool = Object.hasOwn(target.resources.additional, type) ? target.resources.additional[type] : undefined;
  if (!pool) throw new Error('Unsupported resource.');
  nonnegative(pool.current, 'resource current'); nonnegative(pool.max, 'resource max');
  if (pool.current > pool.max) throw new Error('Resource pool exceeds max.');
  const before = pool.current; pool.current = clamp(before + amount, pool.max); return pool.current - before;
}
export function regenerateMp(target: ResourceTarget, seconds: number): number {
  nonnegative(seconds, 'delta time');
  return restoreResource(target, 'mp', target.stats.mpRegen * seconds);
}
