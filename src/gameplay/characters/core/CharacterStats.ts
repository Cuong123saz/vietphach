import { nonnegative, probability } from '../../core/validation';

export interface CharacterStats {
  maxHp: number; maxMp: number; atk: number; def: number; mpRegen: number;
  attackSpeedRating: number; attackInterval: number; critChance: number;
  critDamage: number; moveSpeed: number;
}
// A caller supplies its approved modifier policy. Core does not invent stacking order.
export type StatModifierPolicy = (derived: Readonly<CharacterStats>) => CharacterStats;
export function validateStats(stats: CharacterStats): CharacterStats {
  const keys: (keyof CharacterStats)[] = ['maxHp', 'maxMp', 'atk', 'def', 'mpRegen', 'attackSpeedRating', 'attackInterval', 'critChance', 'critDamage', 'moveSpeed'];
  if (Object.keys(stats).length !== keys.length) throw new Error('Unexpected stat fields.');
  for (const key of keys) nonnegative(stats[key], key);
  probability(stats.critChance);
  if (stats.maxHp <= 0 || stats.attackInterval <= 0 || stats.critDamage < 1) throw new Error('Invalid character stats.');
  return { ...stats };
}
