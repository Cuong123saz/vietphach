// MP/CD/range/AoE are provisional sandbox tuning, not approved final balance.
// Shared gameplay/VFX timing for direct mirror launches; no original charge/summon phase.
export const WATER_MAGE_COPY_TIMING = Object.freeze({ flash: 0.18, qFlight: 0.65 });
export const WATER_MAGE_TUNING = Object.freeze({
  q: { mpCost: 20, cooldown: 4, castRange: 600, radius: 37.5, impactDelay: 2.31 },
  e: { mpCost: 15, cooldown: 3 },
  r: { mpCost: 30, cooldown: 12 },
});
// Approved V0.1 mechanics.
export const WATER_MAGE_RULES = Object.freeze({
  qDamage: 2, shieldRatio: .20, shieldDuration: 8, linkDuration: 10, linkLimit: 1,
  soloSpiritPerLevel: 5, soloDuration: 10, mirrorCount: 3, mirrorDuration: 12,
  copyDelay: 1.5, copyBase: .30, copyMpDivisor: 10000, copyMax: .50,
});
