import { WATER_MAGE_RULES as R, WATER_MAGE_TUNING as T, WATER_MAGE_COPY_TIMING as COPY } from '../../../../config/balance/waterMage';
import type { Point, Zone } from '../../../../world/definitions';
import { bodyInView, validBody, type CombatBody, type ViewBounds } from '../../../combat/CombatBody';
import { resolveDamage } from '../../../combat/Damage';
import { addShield, expireShields } from '../../../combat/Shield';
import { actorTargetAllowed } from '../../../combat/Targeting';
import { nonnegative } from '../../../core/validation';
import { setMageTemporarySpirit, type MageRuntime } from './MageRuntime';
import { grantMach, machReady } from './WaterMagePassive';
import type { DragonCast, ExecutionType, ShieldGrant, WaterSkill, WaterEvent, WaterSwamp } from './WaterMageState';
import { bodyIntersectsCircle } from '../../../../world/bodyGeometry';
import { hasWaterLong, waterLongProfile, waterLongERadius, waterLongQRadius, activeWaterSwamp, waterMachDry } from './WaterLongRules';
import { restoreResource, heal } from '../../core/CharacterResources';
import { WATER_LONG as LONG } from '../../../../config/balance/waterLong';
import { tickSwamp, pullSwampTarget, swampDamage, syncSwampCooldown } from './WaterLongSwamp';
import { tickWaterPrisons } from './WaterPrison';
import { hasWaterHuman } from './WaterHumanRules';
import { WATER_EVOLUTION as EV } from '../../../../config/balance/waterEvolution';
import { castHumanE, castDescentQ, handleEvolutionEffect, scheduleHumanSmallDragons } from './WaterMageCapstones';
export { castWaterUltimate } from './WaterMageCapstones';

export interface WaterMageContext {
  mage: MageRuntime; position: Point; bodies: readonly CombatBody[];
  view: ViewBounds; now: number; random: () => number;
  zone?: Zone;
}
export type CastResult = { ok: true } | { ok: false; reason: 'dead' | 'cooldown' | 'mp' | 'target' | 'busy' };
export function copyRate(maxMp: number): number {
  nonnegative(maxMp,'Max MP'); return Math.min(R.copyMax,Math.max(R.copyBase,R.copyBase+maxMp/R.copyMpDivisor));
}
function selfBody(ctx: WaterMageContext): CombatBody {
  return { id: ctx.mage.id, actor: ctx.mage, position: ctx.position, radius: 12 };
}
function findBody(ctx: WaterMageContext, id: string): CombatBody | undefined {
  return id===ctx.mage.id ? selfBody(ctx) : ctx.bodies.find(body=>body.id===id);
}
function allies(ctx: WaterMageContext): CombatBody[] {
  return ctx.bodies.filter(body=>validBody(body) && actorTargetAllowed(ctx.mage,body.actor,'ALLY'));
}
function commit(ctx: WaterMageContext, skill: WaterSkill, cooldown=T[skill].cooldown): CastResult {
  nonnegative(ctx.now,'skill time');
  if(ctx.mage.resources.currentHp<=0)return {ok:false,reason:'dead'};
  if(ctx.mage.waterSkills.ultimate)return {ok:false,reason:'busy'};
  if(ctx.mage.waterSkills.cooldowns[skill]>ctx.now)return {ok:false,reason:'cooldown'};
  if(ctx.mage.resources.currentMp<T[skill].mpCost)return {ok:false,reason:'mp'};
  ctx.mage.resources.currentMp-=T[skill].mpCost;
  ctx.mage.waterSkills.cooldowns[skill]=ctx.now+cooldown;
  return {ok:true};
}
function takeMirror(ctx: WaterMageContext): boolean {
  const mirror=ctx.mage.waterSkills.mirrors;
  if(mirror.expiresAt<=ctx.now)mirror.count=0;
  if(mirror.count===0)return false;
  mirror.count--;return true;
}
function startDragon(ctx: WaterMageContext, position: Point, rawDamage: number, execution: ExecutionType, radius=T.q.radius, chargeMultiplier=1, effectRate=1, prison?:DragonCast['prison']): void {
  const state=ctx.mage.waterSkills;
  const impactDelay=execution==='copy'?COPY.flash+COPY.qFlight:(T.q.impactDelay-COPY.qFlight)*chargeMultiplier+COPY.qFlight;
  const cast:DragonCast={id:++state.nextCastId,position:{...position},rawDamage,execution,impactAt:ctx.now+impactDelay,machGranted:false,radius,chargeMultiplier,effectRate,prison:prison?{...prison}:undefined};
  state.scheduled.push({kind:'q-impact',dueAt:cast.impactAt,cast});
  state.events.push({kind:'q-start',at:ctx.now,cast});
}
export function castWaterQ(ctx: WaterMageContext, aim: Point): CastResult {
  if(![aim.x,aim.y].every(Number.isFinite))return {ok:false,reason:'target'};
  if(ctx.mage.waterSkills.ultimate)return castDescentQ(ctx);
  if(ctx.mage.waterSkills.scheduled.some(event=>event.kind==='q-impact' && event.cast.execution==='original'))return {ok:false,reason:'busy'};
  const profile=waterLongProfile(ctx.mage),swamp=activeWaterSwamp(ctx.mage,ctx.now);
  const buff=ctx.mage.waterSkills.encounterBuff;
  const autoCenter=!buff && hasWaterLong(ctx.mage,9) && swamp && swamp.expiresAt>ctx.now;
  const locked=autoCenter?swamp.position:aim;
  const dx=locked.x-ctx.position.x,dy=locked.y-ctx.position.y,distance=Math.hypot(dx,dy);
  const ratio=distance>T.q.castRange?T.q.castRange/distance:1;
  const point=autoCenter?{...swamp.position}:{x:ctx.position.x+dx*ratio,y:ctx.position.y+dy*ratio};
  const rawDamage=ctx.mage.stats.atk*R.qDamage*profile.qDamageMultiplier,rate=copyRate(ctx.mage.stats.maxMp);
  const radius=waterLongQRadius(ctx.mage);
  const empowered=buff && ctx.mage.waterSkills.qCastsSinceEmpower>=(buff.qEmpowerAfter??4);
  const prison=empowered?{duration:buff.prisonDuration,eruptDelay:buff.prisonEruptDelay,dragonMpRatio:buff.prisonDragonMpRatio}:undefined;
  const result=commit(ctx,'q',profile.qCooldown);if(!result.ok)return result;
  if(buff)ctx.mage.waterSkills.qCastsSinceEmpower=prison?0:ctx.mage.waterSkills.qCastsSinceEmpower+1;
  startDragon(ctx,point,rawDamage,'original',radius,profile.qChargeMultiplier,1,prison);
  if(takeMirror(ctx)){
    ctx.mage.waterSkills.scheduled.push({kind:'copy-q',dueAt:ctx.now+R.copyDelay,position:{...point},rawDamage:rawDamage*rate,radius,effectRate:rate,prison:prison?{...prison}:undefined});
    scheduleHumanSmallDragons(ctx,point,rate);
  }
  return result;
}
function applyGrants(ctx: WaterMageContext, grants: readonly ShieldGrant[], execution: ExecutionType): ShieldGrant[] {
  const state=ctx.mage.waterSkills,id=++state.nextCastId,applied:ShieldGrant[]=[];
  for(const grant of grants){
    const body=findBody(ctx,grant.targetId);
    if(!body || !validBody(body) || (body.id!==ctx.mage.id && !actorTargetAllowed(ctx.mage,body.actor,'ALLY'))){
      if(execution==='copy')state.events.push({kind:'fizzle',at:ctx.now,skill:'e',targetId:grant.targetId});
      continue;
    }
    if(addShield(body.actor,{id:`water-e:${ctx.mage.id}:${id}:${body.id}`,sourceId:ctx.mage.id,skillId:'water-e',amount:grant.amount,expiresAt:ctx.now+R.shieldDuration},ctx.now))applied.push({...grant});
  }
  if(applied.length)state.events.push({kind:'shield',at:ctx.now,grants:applied,execution});
  return applied;
}
export function castWaterE(ctx: WaterMageContext, selectedId?: string, ground?:Point): CastResult {
  if(ctx.mage.waterSkills.ultimate)return {ok:false,reason:'busy'};
  if(waterMachDry(ctx.mage,ctx.now))return {ok:false,reason:'cooldown'};
  syncSwampCooldown(ctx.mage);
  const state=ctx.mage.waterSkills;
  if(hasWaterHuman(ctx.mage,7) && machReady(ctx.mage)){
    if(!ground)return {ok:false,reason:'target'};
    return castHumanE(ctx,ground,copyRate(ctx.mage.stats.maxMp),state.mirrors.count>0 && state.mirrors.expiresAt>ctx.now);
  }
  const empowered=hasWaterLong(ctx.mage,7) && machReady(ctx.mage);
  const self=empowered || !selectedId || selectedId===ctx.mage.id;
  if(empowered && (!ground || ![ground.x,ground.y].every(Number.isFinite)
    || ground.x<ctx.view.x || ground.x>ctx.view.x+ctx.view.width || ground.y<ctx.view.y || ground.y>ctx.view.y+ctx.view.height))return {ok:false,reason:'target'};
  let selected=self?selfBody(ctx):findBody(ctx,selectedId!);
  if(!selected || !validBody(selected) || (!self && (!actorTargetAllowed(ctx.mage,selected.actor,'ALLY') || !bodyInView(selected,ctx.view))))return {ok:false,reason:'target'};
  const ready=machReady(ctx.mage),available=allies(ctx);
  if(ready && self){
    selected=available.filter(body=>bodyInView(body,ctx.view)).sort((a,b)=>
      a.actor.resources.currentHp/a.actor.stats.maxHp-b.actor.resources.currentHp/b.actor.stats.maxHp
      || a.actor.resources.currentHp-b.actor.resources.currentHp
      || a.id.localeCompare(b.id))[0] ?? selected;
  }
  // A team must complete a valid support action before the evolution payload.
  if(empowered && available.length>0 && selected.id===ctx.mage.id)return {ok:false,reason:'target'};
  const shield=ctx.mage.stats.maxMp*R.shieldRatio,rate=copyRate(ctx.mage.stats.maxMp);
  const linked=ready && selected.id!==ctx.mage.id;
  const grants:ShieldGrant[]=linked?[{targetId:ctx.mage.id,amount:shield/2},{targetId:selected.id,amount:shield/2}]:[{targetId:selected.id,amount:shield}];
  const result=commit(ctx,'e');if(!result.ok)return result;
  const healRatio=ctx.mage.waterSkills.encounterBuff?.readyEHealRatio;
  if(ready && healRatio){
    const before=ctx.mage.resources.currentHp;heal(ctx.mage,ctx.mage.stats.maxHp*healRatio);
    const amount=ctx.mage.resources.currentHp-before;if(amount>0)state.events.push({kind:'ready-heal',at:ctx.now,amount});
  }
  const applied=empowered?[]:applyGrants(ctx,grants,'original');
  if(ready){
    if(linked){
      // Base capacity is one; the refresh applies to the entire retained link set.
      if(!state.links.some(link=>link.targetId===selected.id))state.links.push({targetId:selected.id,expiresAt:ctx.now+R.linkDuration});
      while(state.links.length>(hasWaterHuman(ctx.mage)?EV.human.linkLimit:R.linkLimit))state.links.shift();
      for(const link of state.links)link.expiresAt=ctx.now+R.linkDuration;
      ctx.mage.mach=0;
      if(empowered)state.events.push({kind:'e-support',at:ctx.now,targetId:selected.id,mode:'link'});
    }else if(available.length===0){
      ctx.mage.mach=0;
      setMageTemporarySpirit(ctx.mage,R.soloSpiritPerLevel*ctx.mage.progression.level);
      state.soloBuffExpiresAt=ctx.now+R.soloDuration;
      if(empowered)state.events.push({kind:'e-support',at:ctx.now,targetId:ctx.mage.id,mode:'solo'});
    }
    // Allies outside the view: full self shield, READY remains, no solo buff.
  }else if(applied.length)grantMach(ctx.mage,'original',ctx.now);
  if(empowered){
    // Support has succeeded above. Only now create the evolution's water area.
    const p=waterLongProfile(ctx.mage);
    const swamp:WaterSwamp={id:++state.nextCastId,position:{...ground!},radius:waterLongERadius(ctx.mage),bornAt:ctx.now,expiresAt:ctx.now+LONG.duration,extension:0,
      rawDamage:shield,dotDamage:p.dot?shield/R.shieldRatio*LONG.dotMpRatio:0,stackDamage:0,nextDotAt:ctx.now+LONG.dotInterval,
      controlledAt:ctx.now,execution:'original',pull:p.pull,slow:p.slow,roar:p.roar,effectRate:1};
    state.swamp=swamp;syncSwampCooldown(ctx.mage);state.events.push({kind:'swamp-start',at:ctx.now,position:{...swamp.position},execution:'original'});swampDamage(ctx,swamp,swamp.rawDamage);
    if(takeMirror(ctx))state.scheduled.push({kind:'copy-swamp',dueAt:ctx.now+R.copyDelay,swamp:{...swamp,position:{...swamp.position},
      rawDamage:swamp.rawDamage*rate,dotDamage:swamp.dotDamage*rate,execution:'copy',effectRate:rate}});
  }else if(applied.length && takeMirror(ctx)){
    state.scheduled.push({kind:'copy-e',dueAt:ctx.now+R.copyDelay,grants:applied.map(grant=>({...grant,amount:grant.amount*rate}))});
    scheduleHumanSmallDragons(ctx,selected.position,rate);
  }
  flushMachRestores(ctx);
  return result;
}
export function castWaterR(ctx: WaterMageContext): CastResult {
  const buff=ctx.mage.waterSkills.encounterBuff;
  const result=commit(ctx,'r',buff?.rCooldown??T.r.cooldown);if(!result.ok)return result;
  if(buff?.rPhaseSeconds)ctx.mage.waterSkills.phaseUntil=ctx.now+buff.rPhaseSeconds;
  ctx.mage.waterSkills.mirrors={count:R.mirrorCount,expiresAt:ctx.now+R.mirrorDuration};
  ctx.mage.waterSkills.events.push({kind:'r',at:ctx.now});grantMach(ctx.mage,'original',ctx.now);
  flushMachRestores(ctx);
  return result;
}
function impactDragon(ctx: WaterMageContext, cast: DragonCast, prisonImpact=false, lockedTargets?:readonly string[]): string[] {
  const seen=new Set<string>();
  const hitIds=new Set<string>();
  for(const body of ctx.bodies){
    if(seen.has(body.id) || !validBody(body) || !actorTargetAllowed(ctx.mage,body.actor,'ENEMY'))continue;
    seen.add(body.id);
    // Physical circle overlap at impact time, never at cast/animation creation.
    if(lockedTargets ? !lockedTargets.includes(body.id) : !bodyIntersectsCircle(body,cast.position,cast.radius??T.q.radius))continue;
    const damage=resolveDamage({source:ctx.mage,target:body.actor,element:'water',rawDamage:cast.rawDamage,canCrit:true,targetPolicy:'ENEMY',
      hit:{kind:'aoe',sourceId:ctx.mage.id,targetId:body.id}},{random:ctx.random,now:ctx.now});
    if(!damage.hit)continue;
    hitIds.add(body.id);
    ctx.mage.waterSkills.events.push({kind:'damage',at:ctx.now,targetId:body.id,damage,execution:cast.execution});
    if(!prisonImpact && !cast.secondary && !cast.ultimateId && !cast.humanPayload && !cast.machGranted){grantMach(ctx.mage,cast.execution,ctx.now);cast.machGranted=true;}
  }
  if(prisonImpact)return [...hitIds];
  const ultimate=ctx.mage.waterSkills.ultimate;
  if(cast.ultimateId && ultimate?.id!==cast.ultimateId)return [...hitIds];
  if(cast.ultimateId && ultimate)ultimate.delivered++;
  const s=activeWaterSwamp(ctx.mage,ctx.now);
  if(!cast.secondary && (!s?.ultimateId || cast.ultimateId===s.ultimateId) && hasWaterLong(ctx.mage,9) && s && s.expiresAt>ctx.now && [...hitIds].some(id=>{
    const body=ctx.bodies.find(b=>b.id===id)!;return bodyIntersectsCircle(body,s.position,s.radius);
  })){
    const extension=s.ultimateId?0:Math.min(LONG.extension,LONG.maxExtension-s.extension);s.extension+=extension;s.expiresAt+=extension;syncSwampCooldown(ctx.mage);
    for(const body of ctx.bodies)if(hitIds.has(body.id) && validBody(body) && bodyIntersectsCircle(body,s.position,s.radius))
      pullSwampTarget(ctx,s,body,hasWaterLong(ctx.mage,11)?LONG.tightenedQPullDistance:LONG.qPullDistance,ctx.zone);
    if(s.roar){
      // Copied swamps already store scaled Siet; use their captured rate only.
      const triggerRate=s.execution==='copy'?1:(cast.effectRate??1);
      swampDamage(ctx,s,(s.dotDamage+s.stackDamage)*triggerRate,true);
      s.stackDamage+=ctx.mage.stats.atk*LONG.stackAtkRatio*triggerRate*(s.effectRate??1)*(s.ultimateId && ultimate?ultimate.power*ultimate.resourceRatio:1);
      ctx.mage.waterSkills.events.push({kind:'swamp-roar',at:ctx.now,position:{...s.position},radius:s.radius});
      const shieldRatio=ctx.mage.waterSkills.encounterBuff?.qSietShieldMpRatio;
      if(shieldRatio)applyGrants(ctx,[{targetId:ctx.mage.id,amount:ctx.mage.stats.maxMp*shieldRatio*triggerRate}],'original');
    }
  }
  flushMachRestores(ctx);
  return [...hitIds];
}
export function flushMachRestores(ctx:WaterMageContext):void {
  for(const amount of ctx.mage.waterSkills.pendingMachRestores.splice(0)){
    restoreResource(ctx.mage,'mp',amount);
    const seen=new Set<string>();
    for(const link of ctx.mage.waterSkills.links){
      const body=findBody(ctx,link.targetId);
      if(link.expiresAt>ctx.now && body && validBody(body) && actorTargetAllowed(ctx.mage,body.actor,'ALLY') && !seen.has(body.id)){
        seen.add(body.id);restoreResource(body.actor,'mp',amount);
      }
    }
  }
}
function expireState(ctx: WaterMageContext): void {
  const state=ctx.mage.waterSkills;
  expireShields(ctx.mage,ctx.now);
  for(const body of ctx.bodies)expireShields(body.actor,ctx.now);
  if(state.mirrors.expiresAt<=ctx.now)state.mirrors.count=0;
  state.links=state.links.filter(link=>{
    const target=findBody(ctx,link.targetId);
    return link.expiresAt>ctx.now && target && validBody(target) && actorTargetAllowed(ctx.mage,target.actor,'ALLY');
  });
  if(state.soloBuffExpiresAt && state.soloBuffExpiresAt<=ctx.now){setMageTemporarySpirit(ctx.mage,0);state.soloBuffExpiresAt=0;}
}
export function tickWaterMage(ctx: WaterMageContext): void {
  const state=ctx.mage.waterSkills;
  if(ctx.mage.resources.currentHp<=0){
    state.scheduled.length=0;state.links.length=0;state.mirrors.count=0;
    state.swamp=undefined;state.copiedSwamps=[];state.pendingMachRestores=[];state.prisons=[];state.ultimate=undefined;
    tickWaterPrisons(ctx);
    for(const b of ctx.bodies)b.slows=b.slows?.filter(s=>!s.sourceId.startsWith(`water-swamp:${ctx.mage.id}:`));
    if(ctx.mage.temporarySpirit)setMageTemporarySpirit(ctx.mage,0);
    state.soloBuffExpiresAt=0;expireState(ctx);return;
  }
  // Execute in chronological order, including events generated during this tick.
  // Each shield starts its own 8s lifetime at the scheduled application time.
  while(true){
    state.scheduled.sort((a,b)=>a.dueAt-b.dueAt || Number(a.kind==='ultimate-impact')-Number(b.kind==='ultimate-impact'));
    const event=state.scheduled[0];if(!event || event.dueAt>ctx.now)break;
    state.scheduled.shift();const at={...ctx,now:event.dueAt};tickSwamp(at,ctx.zone);tickWaterPrisons(at);expireState(at);
    if(event.kind==='human-launch' || event.kind==='human-impact' || event.kind==='ultimate-open' || event.kind==='ultimate-end' || event.kind==='ultimate-impact'){
      handleEvolutionEffect(at,event);
    }else if(event.kind==='q-impact'){
      if(event.cast.prison){
        state.prisons.push({cast:event.cast,bornAt:at.now,expiresAt:at.now+event.cast.prison.duration,erupted:false});
        state.scheduled.push({kind:'prison-erupt',dueAt:at.now+event.cast.prison.eruptDelay,cast:event.cast});
        tickWaterPrisons(at);
        state.prisons[state.prisons.length-1].hitTargetIds=impactDragon(at,event.cast,true);
      }else impactDragon(at,event.cast);
    }else if(event.kind==='prison-erupt'){
      const prison=state.prisons.find(p=>p.cast.id===event.cast.id);
      if(prison){
        prison.erupted=true;
        const spent=event.cast.execution==='original'?ctx.mage.resources.currentMp*(event.cast.prison?.dragonMpRatio??0):0;
        ctx.mage.resources.currentMp-=spent;
        impactDragon(at,{...event.cast,secondary:event.cast.humanPayload || event.cast.secondary,rawDamage:event.cast.rawDamage+spent},false,event.cast.humanPayload?undefined:prison.hitTargetIds??[]);
        state.events.push({kind:'prison-erupt',at:at.now,cast:event.cast});
      }
    }else if(event.kind==='copy-q')startDragon(at,event.position,event.rawDamage,'copy',event.radius,1,event.effectRate??copyRate(ctx.mage.stats.maxMp),event.prison);
    else if(event.kind==='copy-swamp'){
      const s={...event.swamp,id:++state.nextCastId,bornAt:at.now,expiresAt:at.now+LONG.duration,extension:0,nextDotAt:at.now+LONG.dotInterval,controlledAt:at.now};
      state.copiedSwamps.push(s);syncSwampCooldown(ctx.mage);swampDamage(at,s,s.rawDamage);
      state.events.push({kind:'swamp-start',at:at.now,position:{...s.position},execution:'copy'});
    }else if(event.kind==='copy-e')applyGrants(at,event.grants,'copy');
  }
  tickSwamp(ctx,ctx.zone);tickWaterPrisons(ctx);flushMachRestores(ctx);expireState(ctx);
}
export function drainWaterEvents(mage: MageRuntime): WaterEvent[] {
  return mage.waterSkills.events.splice(0);
}
