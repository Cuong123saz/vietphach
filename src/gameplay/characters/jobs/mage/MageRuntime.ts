import type { CombatActor } from '../../../combat/Damage';
import { validateElement, type Element } from '../../../combat/Element';
import { createResources, reconcileResources } from '../../core/CharacterResources';
import { allocatePotential, type PotentialKey } from '../../core/Potential';
import type { CharacterStats, StatModifierPolicy } from '../../core/CharacterStats';
import { createProgression, gainExperience, type RunProgression, type ExpRequirement } from '../../../progression/Level';
import { deriveMageStats, mageBaseStats } from './MageStats';
import { createWaterCannon, type WaterCannonState } from './WaterCannon';
import { createWaterMageState, type WaterMageState } from './WaterMageState';
import { MAGE_BALANCE } from '../../../../config/balance/mage';
import { integer } from '../../../core/validation';
import { chooseEvolution, type EvolutionLevel } from '../../../progression/Evolution';
import { WATER_MAGE_EVOLUTION } from './WaterMageEvolution';

export interface MageRuntime extends CombatActor {
  readonly job: 'mage'; readonly baseStats: Readonly<CharacterStats>;
  progression: RunProgression; modifierPolicy?: StatModifierPolicy;
  readonly basicAttack: WaterCannonState;
  mach: number;
  readonly waterSkills: WaterMageState;
  temporarySpirit: number;
}
export function createMage(id: string, team: string, element: Element, moveSpeed: number): MageRuntime {
  if (!id.trim() || !team.trim()) throw new Error('Mage identity required.');
  validateElement(element);
  const baseStats = Object.freeze(mageBaseStats(moveSpeed)), progression = createProgression();
  const stats = deriveMageStats(baseStats, progression.potential);
  return { id, team, element, combatRole:'ranged', job: 'mage', baseStats, progression, stats, resources: createResources(stats), basicAttack: createWaterCannon(), mach: 0,
    waterSkills: createWaterMageState(), temporarySpirit: 0, shields: [] };
}
function spiritModifier(amount: number, modifier?: StatModifierPolicy): StatModifierPolicy {
  return stats => {
    const next={...stats,atk:stats.atk+amount*MAGE_BALANCE.spiritAtk,
      maxMp:stats.maxMp+amount*MAGE_BALANCE.spiritMp,mpRegen:stats.mpRegen+amount*MAGE_BALANCE.spiritRegen};
    return modifier ? modifier(Object.freeze(next)) : next;
  };
}
export function setMageTemporarySpirit(mage: MageRuntime, amount: number): void {
  integer(amount,'temporary Spirit');
  const stats=deriveMageStats(mage.baseStats,mage.progression.potential,spiritModifier(amount,mage.modifierPolicy));
  const resources=reconcileResources(mage.resources,mage.stats,stats);
  mage.temporarySpirit=amount;mage.stats=stats;mage.resources=resources;
}
function commitProgression(mage: MageRuntime, progression: RunProgression): void {
  const stats = deriveMageStats(mage.baseStats, progression.potential, spiritModifier(mage.temporarySpirit,mage.modifierPolicy));
  const resources = reconcileResources(mage.resources, mage.stats, stats);
  mage.progression = progression; mage.stats = stats; mage.resources = resources;
}
export function chooseMageEvolution(mage: MageRuntime, level: EvolutionLevel, id: string): void {
  commitProgression(mage,chooseEvolution(mage.progression,WATER_MAGE_EVOLUTION,level,id));
}
export function allocateMagePotential(mage: MageRuntime, key: PotentialKey, amount: number): void {
  commitProgression(mage, { ...mage.progression, potential: allocatePotential(mage.progression.potential, key, amount) });
}
export function grantMageExperience(mage: MageRuntime, amount: number, requirement?: ExpRequirement): void {
  commitProgression(mage, gainExperience(mage.progression, amount, requirement));
}
export function setMageModifierPolicy(mage: MageRuntime, modifier?: StatModifierPolicy): void {
  const stats = deriveMageStats(mage.baseStats, mage.progression.potential, spiritModifier(mage.temporarySpirit,modifier));
  const resources = reconcileResources(mage.resources, mage.stats, stats);
  mage.modifierPolicy = modifier; mage.stats = stats; mage.resources = resources;
}
