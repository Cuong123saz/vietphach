import { WATER_MAGE_PASSIVE } from '../../../../config/balance/waterCannon';
import type { ExecutionType } from './WaterMageState';
import type { MageRuntime } from './MageRuntime';
import { hasWaterLong, waterMachDry } from './WaterLongRules';
import { WATER_LONG } from '../../../../config/balance/waterLong';
import { hasWaterHuman } from './WaterHumanRules';

export const UNIQUE_EFFECT = WATER_MAGE_PASSIVE.tag;
/** All original sources share one capped counter; copies cannot grant a Unique effect. */
export function grantMach(target: { mach: number } | MageRuntime, execution: ExecutionType, now=0): void {
  if('waterSkills' in target && waterMachDry(target,now))return;
  if(execution!=='original' || target.mach>=WATER_MAGE_PASSIVE.maxMach)return;
  target.mach++;
  if('waterSkills' in target && (hasWaterLong(target) || hasWaterHuman(target)))target.waterSkills.pendingMachRestores.push(target.stats.maxMp*WATER_LONG.linkMpRatio);
}
export const machReady = (target: { mach: number }): boolean => target.mach === WATER_MAGE_PASSIVE.maxMach;
