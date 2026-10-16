import { integer } from '../../core/validation';

export const POTENTIAL_KEYS = ['strength', 'dexterity', 'spirit', 'vitality', 'luck'] as const;
export type PotentialKey = typeof POTENTIAL_KEYS[number];
export type Allocation = Record<PotentialKey, number>;
export interface Potential { earned: number; unspent: number; allocation: Allocation }
export function createPotential(): Potential {
  return { earned: 0, unspent: 0, allocation: { strength: 0, dexterity: 0, spirit: 0, vitality: 0, luck: 0 } };
}
export function validatePotential(state: Potential): void {
  integer(state.earned, 'earned points'); integer(state.unspent, 'unspent points');
  if (Object.keys(state.allocation).length !== POTENTIAL_KEYS.length) throw new Error('Invalid allocation keys.');
  const spent = POTENTIAL_KEYS.reduce((sum, key) => sum + integer(state.allocation[key], key), 0);
  if (!Number.isSafeInteger(spent) || spent + state.unspent !== state.earned) throw new Error('Potential budget mismatch.');
}
export function grantPotential(state: Potential, amount: number): Potential {
  validatePotential(state); integer(amount, 'grant');
  const next = { ...state, earned: state.earned + amount, unspent: state.unspent + amount, allocation: { ...state.allocation } };
  validatePotential(next); return next;
}
export function allocatePotential(state: Potential, key: PotentialKey, amount: number): Potential {
  validatePotential(state); integer(amount, 'allocation');
  if (!POTENTIAL_KEYS.includes(key) || amount === 0 || amount > state.unspent) throw new Error('Invalid potential allocation.');
  const next = { ...state, unspent: state.unspent - amount, allocation: { ...state.allocation, [key]: state.allocation[key] + amount } };
  validatePotential(next); return next;
}
