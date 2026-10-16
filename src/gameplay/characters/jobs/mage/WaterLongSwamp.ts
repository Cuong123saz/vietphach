import type { WaterMageContext } from './WaterMageSkills';
import type { WaterSwamp } from './WaterMageState';
import { WATER_LONG as B } from '../../../../config/balance/waterLong';
import { bodyIntersectsCircle, movementBody } from '../../../../world/bodyGeometry';
import { validBody, type CombatBody } from '../../../combat/CombatBody';
import { actorTargetAllowed } from '../../../combat/Targeting';
import { resolveDamage } from '../../../combat/Damage';
import { moveCharacter } from '../../core/movement';
import type { Zone } from '../../../../world/definitions';
import { WATER_MAGE_TUNING } from '../../../../config/balance/waterMage';

export function syncSwampCooldown(mage:WaterMageContext['mage']):void {
  for(const s of [mage.waterSkills.swamp,...mage.waterSkills.copiedSwamps])if(s)
    mage.waterSkills.cooldowns.e=Math.max(mage.waterSkills.cooldowns.e,s.expiresAt+WATER_MAGE_TUNING.e.cooldown);
}

const targets=(ctx:WaterMageContext,swamp:WaterSwamp)=>ctx.bodies.filter(b=>validBody(b)
  && actorTargetAllowed(ctx.mage,b.actor,'ENEMY') && bodyIntersectsCircle(b,swamp.position,swamp.radius));
export function swampDamage(ctx:WaterMageContext,swamp:WaterSwamp,amount:number,accumulate=false):number {
  let hits=0;
  const seen=new Set<string>();
  for(const body of targets(ctx,swamp)){
    if(seen.has(body.id))continue;seen.add(body.id);
    const damage=resolveDamage({source:ctx.mage,target:body.actor,element:'water',rawDamage:amount,canCrit:false,
      targetPolicy:'ENEMY',hit:{kind:'aoe',sourceId:ctx.mage.id,targetId:body.id}},{random:ctx.random,now:ctx.now});
    if(damage.hit){hits++;ctx.mage.waterSkills.events.push({kind:'damage',at:ctx.now,targetId:body.id,damage,execution:swamp.execution});}
  }
  const u=ctx.mage.waterSkills.ultimate;
  if(accumulate && hits>0 && swamp.ultimateId && u?.id===swamp.ultimateId)u.accumulated+=amount;
  return hits;
}
export function pullSwampTarget(ctx:WaterMageContext,swamp:WaterSwamp,body:CombatBody,distance:number,zone?:Zone):void {
  const dx=swamp.position.x-body.position.x,dy=swamp.position.y-body.position.y,length=Math.hypot(dx,dy);
  if(!length)return;
  const travel=Math.min(distance,length);
  if(zone){
    const foot=movementBody(body);
    body.position=moveCharacter(body.position,{x:dx/length,y:dy/length},1,zone,{speed:travel,radius:foot.radius,
      blockingBodies:[...ctx.bodies.filter(b=>b.id!==body.id && validBody(b)).map(movementBody),
        movementBody({position:ctx.position,radius:12})]});
  }else body.position={x:body.position.x+dx/length*travel,y:body.position.y+dy/length*travel};
}
export function tickSwamp(ctx:WaterMageContext,zone?:Zone):void {
  syncSwampCooldown(ctx.mage);
  const state=ctx.mage.waterSkills;
  for(const s of [...(state.swamp?[state.swamp]:[]),...state.copiedSwamps]){
  const sourceId=`water-swamp:${ctx.mage.id}:${s.id}`;
  const until=Math.min(ctx.now,s.expiresAt),dt=Math.max(0,until-s.controlledAt);
  for(const body of targets(ctx,s)){
    body.slows=body.slows?.filter(e=>e.sourceId!==sourceId)??[];
    if(s.expiresAt>ctx.now)body.slows.push({sourceId,multiplier:1-s.slow,expiresAt:Math.min(s.expiresAt,ctx.now+.1)});
    pullSwampTarget(ctx,s,body,s.pull*dt,zone);
  }
  s.controlledAt=until;
  while(s.dotDamage>0 && s.nextDotAt<=until){
    swampDamage({...ctx,now:s.nextDotAt},s,s.dotDamage+s.stackDamage,true);s.nextDotAt+=B.dotInterval;
  }
  if(ctx.now>=s.expiresAt){
    if(state.swamp===s)state.swamp=undefined;
    state.copiedSwamps=state.copiedSwamps.filter(old=>old!==s);
    for(const b of ctx.bodies)b.slows=b.slows?.filter(e=>e.sourceId!==sourceId);
  }
  }
}
