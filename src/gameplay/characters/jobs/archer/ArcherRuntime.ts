import type { CombatActor } from '../../../combat/Damage';
import { createResources, reconcileResources } from '../../core/CharacterResources';
import { validateStats, type CharacterStats } from '../../core/CharacterStats';
import { allocatePotential, validatePotential, type Potential, type PotentialKey } from '../../core/Potential';
import { createProgression, gainExperience, type RunProgression } from '../../../progression/Level';
import { chooseEvolution, type EvolutionLevel } from '../../../progression/Evolution';
import { WOOD_ARCHER_BALANCE as B } from '../../../../config/balance/woodArcher';
import { WOOD_ARCHER_EVOLUTION } from './WoodArcherEvolution';
import { createWoodArcherState, type WoodArcherState } from './WoodArcherState';
export interface ArcherRuntime extends CombatActor {
  readonly job:'archer';readonly baseStats:Readonly<CharacterStats>;progression:RunProgression;
  readonly wood:WoodArcherState;
}
export function archerBaseStats():CharacterStats {
  return validateStats({maxHp:B.maxHp,maxMp:B.maxMp,atk:B.atk,def:B.def,mpRegen:B.mpRegen,
    attackSpeedRating:0,attackInterval:B.interval,critChance:B.critChance,critDamage:B.critDamage,moveSpeed:B.moveSpeed});
}
export function deriveArcherStats(base:Readonly<CharacterStats>,potential:Potential):CharacterStats {
  validatePotential(potential);const p=potential.allocation;
  const rating=p.dexterity*B.dexterityRating;
  return validateStats({...base,maxHp:base.maxHp+p.vitality*B.vitalityHp,
    maxMp:base.maxMp+p.spirit*B.spiritMp,mpRegen:base.mpRegen+p.spirit*B.spiritRegen,
    atk:base.atk+p.strength*B.strengthAtk+p.dexterity*B.dexterityAtk,
    def:base.def+p.dexterity*B.dexterityDef,attackSpeedRating:rating,
    attackInterval:Math.max(B.minInterval,base.attackInterval/(1+rating/100)),
    critChance:base.critChance+B.luckBonus*p.luck/(p.luck+B.luckScale)});
}
export function createArcher(id:string,team:string):ArcherRuntime {
  if(!id.trim()||!team.trim())throw new Error('Archer identity required.');
  const baseStats=Object.freeze(archerBaseStats()),progression=createProgression(),stats=deriveArcherStats(baseStats,progression.potential);
  return {id,team,job:'archer',element:'wood',combatRole:'ranged',baseStats,progression,stats,
    resources:createResources(stats),wood:createWoodArcherState(),shields:[]};
}
function commit(actor:ArcherRuntime,progression:RunProgression):void {
  const stats=deriveArcherStats(actor.baseStats,progression.potential);
  actor.resources=reconcileResources(actor.resources,actor.stats,stats);actor.stats=stats;actor.progression=progression;
}
export const allocateArcherPotential=(a:ArcherRuntime,k:PotentialKey,n:number)=>commit(a,{...a.progression,potential:allocatePotential(a.progression.potential,k,n)});
export const grantArcherExperience=(a:ArcherRuntime,n:number)=>commit(a,gainExperience(a.progression,n));
export const chooseArcherEvolution=(a:ArcherRuntime,l:EvolutionLevel,id:string)=>commit(a,chooseEvolution(a.progression,WOOD_ARCHER_EVOLUTION,l,id));
export const hasWoodPath=(a:ArcherRuntime,path:'a1'|'b1',level:number)=>a.progression.evolutionChoices[String(level)]===`wood-${path}-${level}`;
export const hasWoodCore=(a:ArcherRuntime,core:'hunt'|'grove')=>a.progression.evolutionChoices['5']===`wood-${core}`;
