import type { Point } from '../../../../world/definitions';
import type { WaterMageContext, CastResult } from './WaterMageSkills';
import type { DragonCast, EvolutionWaterEffect } from './WaterMageState';
import type { MageRuntime } from './MageRuntime';
import { WATER_EVOLUTION as B } from '../../../../config/balance/waterEvolution';
import { WATER_LONG as LONG } from '../../../../config/balance/waterLong';
import { WATER_MAGE_RULES as R, WATER_MAGE_TUNING as T } from '../../../../config/balance/waterMage';
import { hasWaterHuman, waterUltimateKind } from './WaterHumanRules';
import { waterMachDry } from './WaterLongRules';
import { validBody } from '../../../combat/CombatBody';
import { actorTargetAllowed } from '../../../combat/Targeting';
import { swampDamage, syncSwampCooldown } from './WaterLongSwamp';
import { planReadySupport, applyReadySupport } from './WaterMageSupport';
import { stopWaterCannon } from './WaterCannon';
import { nonnegative } from '../../../core/validation';

const liveLinks=(ctx:WaterMageContext)=>[...new Map(ctx.mage.waterSkills.links.filter(l=>l.expiresAt>ctx.now
  && ctx.bodies.some(b=>b.id===l.targetId && validBody(b) && actorTargetAllowed(ctx.mage,b.actor,'ALLY'))).map(l=>[l.targetId,l])).values()];
function ownedShield(ctx:WaterMageContext,consume:boolean):number {
  const ids=new Set([ctx.mage.id,...liveLinks(ctx).map(l=>l.targetId)]);
  const actors=[ctx.mage,...ctx.bodies.filter(b=>ids.has(b.id)).map(b=>b.actor)];
  const seen=new Set<string>();let amount=0;
  for(const actor of actors){
    if(seen.has(actor.id))continue;seen.add(actor.id);
    for(const layer of actor.shields??[])if(layer.sourceId===ctx.mage.id && layer.skillId==='water-e' && layer.expiresAt>ctx.now && layer.amount>0){
      amount+=layer.amount;if(consume)layer.amount=0;
    }
  }return amount;
}
function validGround(ctx:WaterMageContext,point:Point):boolean {
  return [point.x,point.y].every(Number.isFinite) && point.x>=ctx.view.x && point.y>=ctx.view.y
    && point.x<=ctx.view.x+ctx.view.width && point.y<=ctx.view.y+ctx.view.height
    && Math.hypot(point.x-ctx.position.x,point.y-ctx.position.y)<=T.q.castRange;
}
function busy(mage:MageRuntime):boolean {
  return !!mage.waterSkills.ultimate || mage.waterSkills.scheduled.some(e=>
    (e.kind==='q-impact' || e.kind==='human-impact' || e.kind==='human-launch') && e.cast.execution==='original');
}
export function humanDragon(ctx:WaterMageContext,point:Point,rawDamage:number,execution:'original'|'copy',radius:number,flight:number,secondary=false,ultimateId?:number):DragonCast {
  const state=ctx.mage.waterSkills;
  const cast:DragonCast={id:++state.nextCastId,position:{...point},rawDamage,execution,radius,
    impactAt:ctx.now+flight,machGranted:false,flightSeconds:flight,secondary,ultimateId};
  state.scheduled.push({kind:'q-impact',dueAt:cast.impactAt,cast});state.events.push({kind:'q-start',at:ctx.now,cast});return cast;
}
function humanPayload(ctx:WaterMageContext,point:Point,rawDamage:number,execution:'original'|'copy',delay:number,clusters:boolean,launchAt=ctx.now){
  const state=ctx.mage.waterSkills,cast:DragonCast={id:++state.nextCastId,position:{...point},rawDamage,execution,
    impactAt:launchAt+delay,radius:B.human.radius,machGranted:false,humanPayload:true,
    prison:hasWaterHuman(ctx.mage,9)?{duration:B.human.prisonDuration,eruptDelay:B.human.eruptDelay}:undefined};
  state.scheduled.push({kind:'human-launch',dueAt:launchAt,cast,clusters});
}
export function castHumanE(ctx:WaterMageContext,point:Point,rate:number,mirror:boolean):CastResult {
  const mage=ctx.mage,state=mage.waterSkills;
  if(mage.resources.currentHp<=0)return {ok:false,reason:'dead'};
  if(!validGround(ctx,point))return {ok:false,reason:'target'};
  if(busy(mage))return {ok:false,reason:'busy'};
  if(state.cooldowns.e>ctx.now)return {ok:false,reason:'cooldown'};
  if(mage.resources.currentMp<T.e.mpCost)return {ok:false,reason:'mp'};
  const support=planReadySupport(ctx,true);if(!support)return {ok:false,reason:'target'};
  const rawDamage=T.e.mpCost+ownedShield(ctx,false)*B.human.shieldConversion;
  mage.resources.currentMp-=T.e.mpCost;ownedShield(ctx,true);state.cooldowns.e=ctx.now+T.e.cooldown;
  applyReadySupport(ctx,support,B.human.linkLimit);
  humanPayload(ctx,point,rawDamage,'original',B.human.charge+B.human.flight,hasWaterHuman(mage,11));
  if(mirror){state.mirrors.count--;
    // Schedule the accepted payload, with no repeat shield absorption, cost or support.
    humanPayload(ctx,point,rawDamage*rate,'copy',B.human.flight,hasWaterHuman(mage,11),ctx.now+R.copyDelay);
    scheduleHumanSmallDragons(ctx,point,rate);
  }return {ok:true};
}
export function scheduleHumanSmallDragons(ctx:WaterMageContext,point:Point,rate:number):void {
  if(!hasWaterHuman(ctx.mage,13))return;
  const damage=ctx.mage.stats.atk*R.qDamage*B.human.smallDragonRatio*rate;
  for(const _link of liveLinks(ctx))humanDragon({...ctx,now:ctx.now+R.copyDelay},point,damage,'copy',T.q.radius,B.human.smallDragonFlight,true);
}
/** Eligibility is a read-only snapshot shared by input and HUD. */
export function waterUltimateStatus(ctx:WaterMageContext):CastResult {
  const mage=ctx.mage,state=mage.waterSkills,kind=waterUltimateKind(mage);
  if(mage.resources.currentHp<=0)return {ok:false,reason:'dead'};
  if(!kind || mage.mach!==4)return {ok:false,reason:'target'};
  if(mage.stats.maxMp<=0)return {ok:false,reason:'mp'};
  if(busy(mage) || waterMachDry(mage,ctx.now))return {ok:false,reason:'busy'};
  if((state.ultimateCooldown??0)>ctx.now || state.cooldowns.q>ctx.now || state.cooldowns.e>ctx.now)return {ok:false,reason:'cooldown'};
  const links=new Set(liveLinks(ctx).map(l=>l.targetId));
  const allies=new Set(ctx.bodies.filter(b=>validBody(b) && actorTargetAllowed(mage,b.actor,'ALLY')).map(b=>b.id));
  if(kind==='eight' && (allies.size>B.human.linkLimit || links.size!==allies.size))return {ok:false,reason:'target'};
  if(kind==='descent' && !planReadySupport(ctx))return {ok:false,reason:'target'};
  const cost=kind==='eight'?mage.stats.maxMp*B.eight.manaByLinks[links.size]:mage.stats.maxMp*B.descent.minimumMpRatio;
  if(mage.resources.currentMp<cost)return {ok:false,reason:'mp'};
  return {ok:true};
}
export function castWaterUltimate(ctx:WaterMageContext,point:Point):CastResult {
  nonnegative(ctx.now,'ultimate time');
  if(!validGround(ctx,point))return {ok:false,reason:'target'};
  const result=waterUltimateStatus(ctx);if(!result.ok)return result;
  const mage=ctx.mage,state=mage.waterSkills,kind=waterUltimateKind(mage)!;
  const links=liveLinks(ctx).length,atk=mage.stats.atk;
  const spent=kind==='descent'?mage.resources.currentMp:mage.stats.maxMp*B.eight.manaByLinks[links];
  const shield=kind==='eight'?ownedShield(ctx,false):0;
  if(kind==='eight')ownedShield(ctx,true);
  mage.resources.currentMp-=spent;mage.mach=0;stopWaterCannon(mage.basicAttack);
  state.pendingMachRestores=[];
  state.ultimateCooldown=ctx.now+B.ultimate.cooldown;
  const opensAt=ctx.now+B.ultimate.charge,endsAt=opensAt+(kind==='descent'?B.descent.duration:0);
  const u={id:++state.nextCastId,kind,position:{...point},radius:kind==='descent'?B.descent.radius:B.eight.radius,
    bornAt:ctx.now,opensAt,endsAt,impactAt:endsAt+(kind==='descent'?B.descent.qFlight+B.descent.dive:B.eight.flight),
    mpSpent:spent,atk,qCount:0,delivered:0,accumulated:0,power:B.ultimate.power,
    resourceRatio:kind==='descent'?spent/mage.stats.maxMp:1,execution:'original' as const};
  state.ultimate=u;state.events.push({kind:'ultimate-start',at:ctx.now,ultimate:{...u}});
  state.scheduled.push({kind:'ultimate-open',dueAt:opensAt,ultimateId:u.id});
  state.scheduled.push({kind:'ultimate-impact',dueAt:u.impactAt,ultimateId:u.id});
  if(kind==='descent'){
    applyReadySupport(ctx,planReadySupport(ctx)!,1);
    state.scheduled.push({kind:'ultimate-end',dueAt:endsAt,ultimateId:u.id});
  }else{
    // Capture the complete E payload before the network is discharged.
    humanPayload(ctx,point,(spent+shield*B.human.shieldConversion)*u.power,'original',B.human.flight,hasWaterHuman(mage,11),opensAt-B.human.flight);
    state.links=[];
  }return {ok:true};
}
export function castDescentQ(ctx:WaterMageContext):CastResult {
  const u=ctx.mage.waterSkills.ultimate;
  if(ctx.mage.resources.currentHp<=0)return {ok:false,reason:'dead'};
  if(!u || u.kind!=='descent' || ctx.now<u.opensAt || ctx.now>=u.endsAt || u.qCount>=B.descent.maxQ)return {ok:false,reason:'busy'};
  u.qCount++;
  humanDragon(ctx,u.position,u.atk*R.qDamage*.125*u.power*u.resourceRatio,'original',u.radius,B.descent.qFlight,false,u.id);
  return {ok:true};
}
export function handleEvolutionEffect(ctx:WaterMageContext,event:EvolutionWaterEffect):void {
  const state=ctx.mage.waterSkills;
  if(event.kind==='human-launch'){
    state.scheduled.push({...event,kind:'human-impact',dueAt:event.cast.impactAt});
    state.events.push({kind:'q-start',at:ctx.now,cast:event.cast});return;
  }
  if(event.kind==='human-impact'){
    const c=event.cast,positions=[c.position];
    if(event.clusters)for(let i=0;i<3;i++){const angle=i*Math.PI*2/3-Math.PI/2;
      positions.push({x:c.position.x+Math.cos(angle)*B.human.clusterOffset,y:c.position.y+Math.sin(angle)*B.human.clusterOffset});}
    for(const position of positions){
      const cast={...c,id:++state.nextCastId,position:{...position}};
      swampDamage(ctx,{...area(ctx,position,cast.radius!,cast.execution),rawDamage:cast.rawDamage},cast.rawDamage);
      if(cast.prison){
        state.prisons.push({cast,bornAt:ctx.now,expiresAt:ctx.now+cast.prison.duration,erupted:false});
        state.scheduled.push({kind:'prison-erupt',dueAt:ctx.now+cast.prison.eruptDelay,cast});
      }
    }
    // READY E already consumed Mach; eruption never regrants it.
    return;
  }
  const u=state.ultimate;if(!u || u.id!==event.ultimateId)return;
  if(event.kind==='ultimate-open'){
    if(u.kind==='descent'){
      state.swamp={...area(ctx,u.position,u.radius,'original'),id:u.id,expiresAt:u.impactAt,
        rawDamage:u.mpSpent*R.shieldRatio*u.power,dotDamage:u.mpSpent*LONG.dotMpRatio*u.power,
        pull:LONG.tightenedPull,slow:LONG.tightenedSlow,roar:true,ultimateId:u.id};
      syncSwampCooldown(ctx.mage);swampDamage(ctx,state.swamp,state.swamp.rawDamage);
      swampDamage(ctx,state.swamp,u.atk*R.qDamage*u.power*u.resourceRatio);
      state.events.push({kind:'swamp-roar',at:ctx.now,position:{...u.position},radius:u.radius});
    }else{
      for(let i=0;i<B.eight.count;i++)humanDragon(ctx,u.position,u.atk*R.qDamage*B.eight.dragonMultiplier*u.power,'original',u.radius,B.eight.flight,true,u.id);
    }
  }else if(event.kind==='ultimate-end'){
    // Stop periodic Siet at 5s; already accepted Q may arrive during the final flight.
    if(state.swamp?.ultimateId===u.id)state.swamp.nextDotAt=u.impactAt+1;
  }else{
    if(u.kind==='descent')swampDamage(ctx,area(ctx,u.position,u.radius,'original'),u.accumulated*B.descent.explosionRatio);
    state.events.push({kind:'ultimate-impact',at:ctx.now,ultimate:{...u}});
    if(state.swamp?.ultimateId===u.id)state.swamp=undefined;
    state.links=[];state.ultimate=undefined;
  }
}
function area(ctx:WaterMageContext,position:Point,radius:number,execution:'original'|'copy'){
  return {id:0,position:{...position},radius,bornAt:ctx.now,expiresAt:ctx.now,extension:0,rawDamage:0,
    dotDamage:0,stackDamage:0,nextDotAt:ctx.now+1,controlledAt:ctx.now,execution,pull:0,slow:0,roar:false,effectRate:1};
}
