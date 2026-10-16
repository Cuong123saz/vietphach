import type { MageRuntime } from './MageRuntime';
import { WATER_LONG as B } from '../../../../config/balance/waterLong';
import { WATER_MAGE_TUNING as T } from '../../../../config/balance/waterMage';
export function hasWaterLong(mage: MageRuntime, level=5): boolean {
  return mage.progression.level>=level && mage.progression.evolutionChoices['5']==='core-long'
    && (level===5 || mage.progression.evolutionChoices[String(level)]===`b1-${level}`);
}
export function activeWaterSwamp(mage:MageRuntime,now:number){
  return [mage.waterSkills.swamp,...mage.waterSkills.copiedSwamps].find(s=>s && s.expiresAt>now);
}
export function waterMachDry(mage:MageRuntime,now=0):boolean {
  return mage.resources.currentHp>0 && (!!mage.waterSkills.ultimate || !!activeWaterSwamp(mage,now));
}
export function waterLongProfile(mage: MageRuntime) {
  const lv9=hasWaterLong(mage,9),lv11=hasWaterLong(mage,11),lv13=hasWaterLong(mage,13);
  return { radius:B.radius*(lv9?1.3:1)*(lv11?1.2:1)*(lv13?1.1:1),
    pull:lv11?B.tightenedPull:B.pull,slow:lv11?B.tightenedSlow:B.slow,
    qDamageMultiplier:(lv9?.5:1)*(lv11?.5:1)*(lv13?.5:1),
    qChargeMultiplier:(lv9?.5:1)*(lv11?.5:1)*(lv13?.5:1),
    qCooldown:T.q.cooldown*(lv11?.5:1)*(lv13?.5:1),
    dot:lv11,roar:lv13 };
}
/** Stage Q and E share this ground-area radius, including the per-map bonus. */
export function waterLongERadius(mage:MageRuntime):number {
  return waterLongProfile(mage).radius*(mage.waterSkills.encounterBuff?.eRadiusMultiplier??1);
}
export function waterLongQRadius(mage:MageRuntime):number {
  return mage.waterSkills.encounterBuff?waterLongERadius(mage):hasWaterLong(mage,11)?waterLongProfile(mage).radius:T.q.radius;
}
