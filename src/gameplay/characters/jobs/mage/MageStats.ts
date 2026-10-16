import { MAGE_BALANCE as B } from '../../../../config/balance/mage';
import { validateStats, type CharacterStats, type StatModifierPolicy } from '../../core/CharacterStats';
import { validatePotential, type Potential } from '../../core/Potential';

export function mageBaseStats(moveSpeed: number): CharacterStats {
  return validateStats({ maxHp: B.maxHp, maxMp: B.maxMp, atk: B.atk, def: B.def,
    mpRegen: B.mpRegen, attackSpeedRating: B.attackSpeedRating, attackInterval: B.attackInterval,
    critChance: B.critChance, critDamage: B.critDamage, moveSpeed });
}
export function deriveMageStats(base: Readonly<CharacterStats>, potential: Potential, modifier?: StatModifierPolicy): CharacterStats {
  validatePotential(potential); validateStats(base);
  const p = potential.allocation;
  let stats: CharacterStats = { ...base, maxHp: base.maxHp + p.vitality * B.vitalityHp,
    maxMp: base.maxMp + p.spirit * B.spiritMp, atk: base.atk + p.spirit * B.spiritAtk,
    def: base.def + p.dexterity * B.dexDef, mpRegen: base.mpRegen + p.spirit * B.spiritRegen,
    attackSpeedRating: base.attackSpeedRating + p.dexterity * B.dexAttackSpeed,
    critChance: base.critChance + B.luckBonus * p.luck / (p.luck + B.luckScale) };
  if (modifier) stats = modifier(Object.freeze(stats));
  validateStats(stats);
  stats = { ...stats, attackInterval: Math.max(B.minAttackInterval, base.attackInterval / (1 + stats.attackSpeedRating / B.attackSpeedScale)) };
  return validateStats(stats);
}
