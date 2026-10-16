export const COMBAT_BALANCE = Object.freeze({ DEF_SCALE: 50 });
export const ELEMENT_BALANCE = Object.freeze({ advantage: 1.25, disadvantage: 0.80, normal: 1 });
export const RUN_BALANCE = Object.freeze({ initialLevel: 1, maxLevel: 15, initialPotential: 5, potentialPerLevel: 5, skillPointsPerLevel: 1,
  expBase: 20, expStep: 10, debugExp: 50 });
export const EVOLUTION_LEVELS = [5, 7, 9, 11, 13, 15] as const;
