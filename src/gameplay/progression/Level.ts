import { RUN_BALANCE as B } from '../../config/balance/core';
import { integer } from '../core/validation';
import { createPotential, grantPotential, validatePotential, type Potential } from '../characters/core/Potential';
export interface RunProgression {
  level: number; exp: number; skillPoints: number; potential: Potential;
  evolutionChoices: Record<string, string>;
}
// Default curve follows the old project; encounters supply their own EXP rewards.
export type ExpRequirement = (level: number) => number;
export const experienceRequired: ExpRequirement = level => {
  integer(level, 'level');
  if (level < B.initialLevel || level > B.maxLevel) throw new Error('Invalid level.');
  return level === B.maxLevel ? 0 : B.expBase + (level - B.initialLevel) * B.expStep;
};
export const createProgression = (): RunProgression => ({ level: B.initialLevel, exp: 0,
  skillPoints: 0, potential: grantPotential(createPotential(), B.initialPotential), evolutionChoices: {} });
export function gainExperience(state: RunProgression, amount: number, requirement: ExpRequirement = experienceRequired): RunProgression {
  integer(amount, 'EXP award'); integer(state.exp, 'EXP'); integer(state.skillPoints, 'skill points');
  integer(state.level, 'level'); validatePotential(state.potential);
  if (state.level < B.initialLevel || state.level > B.maxLevel) throw new Error('Invalid level.');
  const next = structuredClone(state);
  if (next.level === B.maxLevel) { next.exp = 0; return next; }
  next.exp = integer(next.exp + amount, 'total EXP');
  while (next.level < B.maxLevel) {
    const cost = integer(requirement(next.level), 'EXP requirement');
    if (cost === 0) throw new Error('EXP requirement must be positive.');
    if (next.exp < cost) break;
    next.exp -= cost; next.level++;
    next.potential = grantPotential(next.potential, B.potentialPerLevel);
    next.skillPoints = integer(next.skillPoints + B.skillPointsPerLevel, 'skill points');
  }
  if (next.level === B.maxLevel) next.exp = 0;
  return next;
}
