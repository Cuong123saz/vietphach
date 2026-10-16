import { createMage, grantMageExperience, allocateMagePotential, chooseMageEvolution, type MageRuntime } from '../../gameplay/characters/jobs/mage/MageRuntime';
import { validBody, type CombatBody } from '../../gameplay/combat/CombatBody';
import { actorTargetAllowed } from '../../gameplay/combat/Targeting';
import { WATER_MAGE_RULES } from '../../config/balance/waterMage';
/** Explicit Sandbox reset through the real progression API; no Stage modifiers. */
export function prepareWaterEvolutionTrial(mage:MageRuntime,path:'a1'|'b1',bodies:readonly CombatBody[],now:number):void {
  const next=createMage(mage.id,mage.team,mage.element,mage.baseStats.moveSpeed);
  grantMageExperience(next,1190);allocateMagePotential(next,'spirit',75);
  chooseMageEvolution(next,5,path==='a1'?'core-ho':'core-long');
  for(const level of [7,9,11,13,15] as const)chooseMageEvolution(next,level,`${path}-${level}`);
  next.mach=4;
  if(path==='a1')next.waterSkills.links=bodies.filter(b=>validBody(b) && actorTargetAllowed(next,b.actor,'ALLY')).slice(0,3)
    .map(b=>({targetId:b.id,expiresAt:now+WATER_MAGE_RULES.linkDuration}));
  Object.assign(mage,next);
  for(const body of bodies){
    body.slows=body.slows?.filter(s=>!s.sourceId.startsWith(`water-prison:${mage.id}:`) && !s.sourceId.startsWith(`water-swamp:${mage.id}:`));
    body.actor.shields=body.actor.shields?.filter(s=>s.sourceId!==mage.id);
    if(body.id==='sandbox-enemy'){
      body.actor.stats={...body.actor.stats,maxHp:1000000,def:50};body.actor.resources.currentHp=1000000;
    }
  }
}
