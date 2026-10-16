import type { MageRuntime } from './MageRuntime';
import { WATER_EVOLUTION as B } from '../../../../config/balance/waterEvolution';
export function hasWaterHuman(mage:MageRuntime,level=5):boolean {
  return mage.progression.level>=level && mage.progression.evolutionChoices['5']==='core-ho'
    && (level===5 || mage.progression.evolutionChoices[String(level)]===`a1-${level}`);
}
export function waterUltimateKind(mage:MageRuntime):'descent'|'eight'|undefined {
  if(mage.waterSkills.encounterBuff)return;
  return hasWaterLong15(mage)?'descent':hasWaterHuman(mage,15)?'eight':undefined;
}
function hasWaterLong15(mage:MageRuntime){
  return mage.progression.level>=15 && mage.progression.evolutionChoices['5']==='core-long'
    && mage.progression.evolutionChoices['15']==='b1-15';
}
export const waterGroundE=(mage:MageRuntime)=>hasWaterHuman(mage,7)
  || mage.progression.evolutionChoices['7']==='b1-7';
export const waterGroundERadius=(mage:MageRuntime)=>hasWaterHuman(mage,7)?B.human.radius:undefined;
