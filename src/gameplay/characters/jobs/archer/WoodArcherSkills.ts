import type { Point, Zone } from '../../../../world/definitions';
import { WOOD_ARCHER_BALANCE as B } from '../../../../config/balance/woodArcher';
import { createProjectile, tickProjectile } from '../../../combat/Projectile';
import { resolveDamage } from '../../../combat/Damage';
import { validBody, type CombatBody, type ViewBounds } from '../../../combat/CombatBody';
import { actorTargetAllowed } from '../../../combat/Targeting';
import { nonnegative } from '../../../core/validation';
import { expireShields } from '../../../combat/Shield';
import { hasWoodCore, hasWoodPath, type ArcherRuntime } from './ArcherRuntime';
import type { WoodArrow, WoodScheduled } from './WoodArcherState';
import { clearWoodLine, validWoodPoint, woodCircleHit, woodCapsuleHit, woodDirection } from './WoodGeometry';
export interface WoodArcherContext {archer:ArcherRuntime;position:Point;bodies:readonly CombatBody[];zone:Zone;view:ViewBounds;now:number;random:()=>number}
export type ArcherCastResult={ok:true}|{ok:false;reason:'dead'|'mp'|'cooldown'|'busy'|'sap'|'target'|'locked'};
/** Bow height is gameplay geometry. Effects use the same anchor. */
export const woodMuzzle=(position:Point):Point=>({x:position.x,y:position.y-28});
const enemies=(ctx:WoodArcherContext)=>ctx.bodies.filter(b=>validBody(b)&&actorTargetAllowed(ctx.archer,b.actor,'ENEMY'))
  .sort((a,b)=>a.id.localeCompare(b.id));
const marked=(ctx:WoodArcherContext,id:string)=>ctx.archer.wood.mark?.targetId===id && ctx.archer.wood.mark.expiresAt>ctx.now;
const busy=(ctx:WoodArcherContext)=>ctx.archer.wood.busyUntil>ctx.now+1e-9;
function status(ctx:WoodArcherContext,skill:'basic'|'q'|'e'|'r'|'ultimate',cost=0):ArcherCastResult {
  const a=ctx.archer,s=a.wood;
  if(a.resources.currentHp<=0)return {ok:false,reason:'dead'};
  if(busy(ctx))return {ok:false,reason:'busy'};
  if((skill==='basic'?s.nextBasicAt:s.cooldowns[skill])>ctx.now+1e-9)return {ok:false,reason:'cooldown'};
  if(a.resources.currentMp<cost)return {ok:false,reason:'mp'};
  return {ok:true};
}
function useR(ctx:WoodArcherContext):number {
  const r=ctx.archer.wood.r;
  if(r.expiresAt>ctx.now && r.charges>0){r.charges--;return B.r.multiplier;}
  return 1;
}
function gain(ctx:WoodArcherContext,castId:number):void {
  const s=ctx.archer.wood;if(s.gained.has(castId))return;
  s.gained.add(castId);s.sap=Math.min(B.sapLimit,s.sap+1);
}
function damage(ctx:WoodArcherContext,body:CombatBody,raw:number,skill:WoodArrow['skill']|'e'|'dot'|'harvest'|'volley',canCrit=false,kind:'projectile'|'aoe'='aoe') {
  const result=resolveDamage({source:ctx.archer,target:body.actor,element:'wood',rawDamage:raw,canCrit,targetPolicy:'ENEMY',
    hit:{kind,sourceId:ctx.archer.id,targetId:body.id}}, {random:ctx.random,now:ctx.now});
  if(result.hit)ctx.archer.wood.events.push({kind:'damage',at:ctx.now,targetId:body.id,position:{...body.position},skill,damage:result});
  return result;
}
function aoe(ctx:WoodArcherContext,point:Point,radius:number,raw:number,skill:'e'|'harvest'|'volley',root=false):void {
  for(const body of enemies(ctx))if(woodCircleHit(body,point,radius,ctx.zone)){
    const hit=damage(ctx,body,raw,skill);if(root&&hit.hit&&validBody(body))applyRoot(ctx,body,skill==='e');
  }
}
function applyRoot(ctx:WoodArcherContext,body:CombatBody,tail=false):void {
  const s=ctx.archer.wood;if((s.rootUntil[body.id]??-Infinity)>ctx.now+1e-9)return;
  s.rootUntil[body.id]=ctx.now+B.rootGate;
  const sourceId=`wood:${ctx.archer.id}:root`;
  body.slows=body.slows?.filter(p=>p.sourceId!==sourceId)??[];
  body.slows.push({sourceId,multiplier:0,expiresAt:ctx.now+B.e.root});
  if(tail)body.slows.push({sourceId:`wood:${ctx.archer.id}:root-tail`,multiplier:B.e.slow,expiresAt:ctx.now+B.e.root+B.e.slowDuration});
}
function queueArrow(ctx:WoodArcherContext,options:Omit<Extract<WoodScheduled,{kind:'arrow'}>,'kind'>):void {
  ctx.archer.wood.scheduled.push({kind:'arrow',...options});
}
export function castArcherBasic(ctx:WoodArcherContext,point:Point):ArcherCastResult {
  const heading=woodDirection(woodMuzzle(ctx.position),point);if(!heading)return {ok:false,reason:'target'};
  const result=status(ctx,'basic');if(!result.ok)return result;
  const s=ctx.archer.wood,id=++s.nextId,multiplier=1;
  s.nextBasicAt=ctx.now+ctx.archer.stats.attackInterval;s.busyUntil=ctx.now+B.basic.windup;
  queueArrow(ctx,{dueAt:s.busyUntil,castId:id,origin:{...ctx.position},direction:heading,skill:'basic',atk:ctx.archer.stats.atk,
    multiplier,damage:B.basic.damage,fractions:[1],range:B.basic.range,speed:B.basic.speed,radius:B.basic.radius,original:true});
  s.events.push({kind:'cast',at:ctx.now,skill:'basic',position:{...ctx.position},direction:heading});return {ok:true};
}
export function castArcherQ(ctx:WoodArcherContext,point:Point):ArcherCastResult {
  const heading=woodDirection(woodMuzzle(ctx.position),point);
  if(!heading||!validWoodPoint(point,ctx.position,ctx.view,ctx.zone,B.q.range))return {ok:false,reason:'target'};
  const result=status(ctx,'q',B.q.mp);if(!result.ok)return result;
  const a=ctx.archer,s=a.wood,id=++s.nextId,multiplier=useR(ctx),atk=a.stats.atk;
  a.resources.currentMp-=B.q.mp;s.cooldowns.q=ctx.now+B.q.cooldown;s.busyUntil=ctx.now+B.q.windup;
  const fractions=hasWoodPath(a,'a1',11)?B.q.huntFractions:B.q.fractions;
  queueArrow(ctx,{dueAt:s.busyUntil,castId:id,origin:{...ctx.position},direction:heading,skill:'q',atk,multiplier,
    damage:B.q.damage,fractions,range:B.q.range,speed:B.q.speed,radius:B.q.radius,original:true});
  if(multiplier>1&&hasWoodPath(a,'a1',13))queueArrow(ctx,{dueAt:s.busyUntil+B.r.tailDelay,castId:id,origin:{...ctx.position},direction:heading,
    skill:'secondary',atk,multiplier,damage:B.r.tailDamage,fractions:[1],range:B.q.range,speed:B.q.speed,radius:4,original:false});
  s.events.push({kind:'cast',at:ctx.now,skill:'q',position:{...ctx.position},direction:heading});return {ok:true};
}
export function castArcherE(ctx:WoodArcherContext,point:Point):ArcherCastResult {
  const a=ctx.archer,s=a.wood,dash=hasWoodPath(a,'a1',9),heading=woodDirection(ctx.position,point);
  if(!validWoodPoint(point,ctx.position,ctx.view,ctx.zone,dash?B.q.range:B.e.range)||(dash&&!heading))return {ok:false,reason:'target'};
  const result=status(ctx,'e',B.e.mp);if(!result.ok)return result;
  const id=++s.nextId,position=dash?{...ctx.position}:{...point},distance=Math.hypot(position.x-ctx.position.x,position.y-ctx.position.y);
  const projectile=distance>1e-8?createProjectile(`wood-seed-${id}`,a.id,ctx.position,woodDirection(ctx.position,position)!,{speed:B.e.speed,radius:3,range:distance}):undefined;
  const armsAt=ctx.now+distance/B.e.speed+B.e.arm;
  a.resources.currentMp-=B.e.mp;s.cooldowns.e=ctx.now+(hasWoodCore(a,'grove')?B.e.groveCooldown:B.e.cooldown);
  const slots=s.fields.filter(f=>f.kind!=='path').sort((x,y)=>x.plantedAt-y.plantedAt||x.id-y.id),limit=hasWoodCore(a,'grove')?2:1;
  if(slots.length>=limit)s.fields=s.fields.filter(f=>f.id!==slots[0].id);
  s.fields.push({id,kind:'seed',position,projectile,plantedAt:ctx.now,bornAt:ctx.now,armsAt,expiresAt:armsAt+B.e.wait,radius:B.e.radius,atk:a.stats.atk});
  if(dash){s.dash={direction:{x:-heading!.x,y:-heading!.y},endsAt:ctx.now+B.e.dashSeconds};s.busyUntil=ctx.now+B.e.dashSeconds;}
  s.events.push({kind:'cast',at:ctx.now,skill:'e',position,direction:heading});return {ok:true};
}
export function castArcherR(ctx:WoodArcherContext):ArcherCastResult {
  const result=status(ctx,'r',B.r.mp);if(!result.ok)return result;
  const s=ctx.archer.wood;if(s.sap<B.r.sap)return {ok:false,reason:'sap'};
  if(s.r.charges>0&&s.r.expiresAt>ctx.now)return {ok:false,reason:'busy'};
  ctx.archer.resources.currentMp-=B.r.mp;s.sap-=B.r.sap;s.cooldowns.r=ctx.now+B.r.cooldown;
  s.r={charges:B.r.charges,expiresAt:ctx.now+B.r.duration};
  s.events.push({kind:'cast',at:ctx.now,skill:'r',position:{...ctx.position}});return {ok:true};
}
export function archerUltimateStatus(ctx:WoodArcherContext):ArcherCastResult {
  const a=ctx.archer,s=a.wood;
  if(!hasWoodPath(a,'a1',15)&&!hasWoodPath(a,'b1',15))return {ok:false,reason:'locked'};
  const result=status(ctx,'ultimate',a.stats.maxMp*B.ultimate.mpRatio);if(!result.ok)return result;
  if(s.sap!==B.sapLimit)return {ok:false,reason:'sap'};
  if(s.cooldowns.q>ctx.now+1e-9||s.cooldowns.e>ctx.now+1e-9)return {ok:false,reason:'cooldown'};
  return {ok:true};
}
export function castArcherUltimate(ctx:WoodArcherContext,point:Point):ArcherCastResult {
  const a=ctx.archer,s=a.wood,hunt=hasWoodPath(a,'a1',15),heading=woodDirection(woodMuzzle(ctx.position),point);
  if(!heading||!validWoodPoint(point,ctx.position,ctx.view,ctx.zone,hunt?B.ultimate.huntRange:B.ultimate.groveRange))return {ok:false,reason:'target'};
  const result=archerUltimateStatus(ctx);if(!result.ok)return result;
  const slots=!hunt?s.fields.filter(f=>f.kind!=='path'&&Math.hypot(f.position.x-point.x,f.position.y-point.y)<=B.ultimate.groveRadius):[];
  const id=++s.nextId,opensAt=ctx.now+(hunt?B.ultimate.huntCharge:B.ultimate.groveCharge),castEndsAt=opensAt+(hunt?2*B.ultimate.huntGap:0);
  a.resources.currentMp-=a.stats.maxMp*B.ultimate.mpRatio;s.sap=0;s.cooldowns.ultimate=ctx.now+B.ultimate.cooldown;s.busyUntil=castEndsAt;
  s.fields=s.fields.filter(f=>!slots.includes(f));
  s.ultimate={id,kind:hunt?'hunt':'grove',origin:{...ctx.position},position:{...point},direction:heading,bornAt:ctx.now,opensAt,castEndsAt,
    endsAt:hunt?castEndsAt+B.ultimate.huntRange/B.ultimate.huntSpeed:opensAt+B.ultimate.groveDuration,
    atk:a.stats.atk,radius:hunt?B.ultimate.huntRadius:B.ultimate.groveRadius,harvested:slots.length,markTarget:s.mark?.targetId};
  if(hunt)for(let i=0;i<3;i++)queueArrow(ctx,{dueAt:opensAt+i*B.ultimate.huntGap,castId:id,origin:{...ctx.position},direction:heading,
    skill:'ultimate',atk:a.stats.atk,multiplier:B.ultimate.power,damage:B.ultimate.huntDamage[i],fractions:B.ultimate.huntFractions,
    range:B.ultimate.huntRange,speed:B.ultimate.huntSpeed,radius:B.ultimate.huntRadius,original:false,
    markTarget:i===2?s.mark?.targetId:undefined,markBonus:i===2?B.ultimate.huntMark:undefined});
  else for(let i=0;i<3;i++)s.scheduled.push({kind:'volley',dueAt:opensAt+i,ultimateId:id});
  s.events.push({kind:'cast',at:ctx.now,skill:'ultimate',position:{...point},direction:heading});return {ok:true};
}
export function woodGroveConnection(ctx:WoodArcherContext):{from:Point;to:Point;atk:number}|undefined {
  if(!hasWoodPath(ctx.archer,'b1',9))return;
  const fields=ctx.archer.wood.fields.filter(f=>f.kind==='garden'&&f.expiresAt>=ctx.now);
  if(fields.length!==2 || Math.hypot(fields[0].position.x-fields[1].position.x,fields[0].position.y-fields[1].position.y)>B.grove.linkRange
    ||!clearWoodLine(ctx.zone,fields[0].position,fields[1].position))return;
  return {from:fields[0].position,to:fields[1].position,atk:Math.min(fields[0].atk,fields[1].atk)};
}
function arrowHit(ctx:WoodArcherContext,arrow:WoodArrow,body:CombatBody):void {
  const a=ctx.archer,s=a.wood,isMarked=marked(ctx,body.id),f=arrow.fractions[arrow.hits.size]??0;
  let raw=arrow.damage*arrow.atk;
  if(arrow.original&&hasWoodCore(a,'hunt')&&isMarked)raw*=1+B.markBonus;
  const detach=arrow.skill==='q'&&isMarked&&hasWoodPath(a,'a1',7);
  if(detach)raw+=B.q.markDamage*arrow.atk;
  const ultimateMark=arrow.markTarget===body.id && isMarked && arrow.markBonus!==undefined;
  if(ultimateMark)raw+=arrow.markBonus!*arrow.atk;
  const harvest=arrow.skill==='q'&&arrow.multiplier>1&&hasWoodPath(a,'b1',13)
    ?s.fields.filter(p=>p.kind==='garden'&&p.expiresAt>=ctx.now&&woodCircleHit(body,p.position,p.radius,ctx.zone))
      .sort((x,y)=>x.expiresAt-y.expiresAt||x.id-y.id)[0]:undefined;
  const hit=damage(ctx,body,raw*arrow.multiplier*f,arrow.skill,arrow.original,'projectile');arrow.hits.add(body.id);
  if(!hit.hit)return;
  if(detach||ultimateMark)s.mark=undefined;
  if(arrow.original&&hit.finalDamage>0){gain(ctx,arrow.castId);
    if(arrow.skill==='basic'&&hasWoodCore(a,'hunt')&&validBody(body))s.mark={targetId:body.id,expiresAt:ctx.now+B.markDuration};}
  if(harvest&&!arrow.harvested){
    arrow.harvested=true;
    const amount=B.grove.harvestDamage*arrow.atk*Math.min(B.grove.harvestSeconds,Math.max(0,harvest.expiresAt-ctx.now))*arrow.multiplier;
    aoe(ctx,harvest.position,harvest.radius,amount,'harvest');s.fields=s.fields.filter(p=>p.id!==harvest.id);
    s.events.push({kind:'impact',at:ctx.now,position:{...harvest.position},radius:harvest.radius,type:'harvest'});
  }
  s.events.push({kind:'impact',at:ctx.now,position:{...body.position},radius:arrow.skill==='ultimate'?65:18,type:'arrow',ultimate:arrow.skill==='ultimate'});
}
function endArrow(ctx:WoodArcherContext,arrow:WoodArrow):void {
  const s=ctx.archer.wood;
  if(arrow.skill!=='q'||!hasWoodPath(ctx.archer,'b1',11))return;
  const length=Math.min(B.grove.pathRange,Math.hypot(arrow.projectile.position.x-arrow.origin.x,arrow.projectile.position.y-arrow.origin.y));
  if(length<1)return;
  const paths=s.fields.filter(f=>f.kind==='path').sort((x,y)=>x.bornAt-y.bornAt||x.id-y.id);
  if(paths.length>=2)s.fields=s.fields.filter(f=>f.id!==paths[0].id);
  s.fields.push({id:++s.nextId,kind:'path',position:{...arrow.origin},end:{x:arrow.origin.x+arrow.projectile.direction.x*length,
    y:arrow.origin.y+arrow.projectile.direction.y*length},radius:B.grove.pathRadius,plantedAt:ctx.now,bornAt:ctx.now,armsAt:ctx.now,
    expiresAt:ctx.now+B.grove.pathDuration,atk:arrow.atk});
  s.nextDotAt??=ctx.now+1;
}
function tickArrows(ctx:WoodArcherContext):void {
  const s=ctx.archer.wood;
  for(const arrow of s.arrows){
    let remaining=Math.max(0,ctx.now-arrow.lastAt);arrow.lastAt=ctx.now;
    while(arrow.projectile.active && remaining>1e-9){
      const before=arrow.projectile.remainingRange;
      const targets=enemies(ctx).filter(b=>!arrow.hits.has(b.id));
      const hit=tickProjectile(arrow.projectile,remaining,targets,ctx.zone.objects);
      const travelled=before-arrow.projectile.remainingRange;remaining=Math.max(0,remaining-travelled/arrow.projectile.speed);
      if(!hit)break;
      if(hit.type==='obstacle'){s.events.push({kind:'impact',at:ctx.now,position:hit.position,radius:16,type:'arrow'});break;}
      const body=targets.find(b=>b.id===hit.hit.targetId);if(body)arrowHit(ctx,arrow,body);
      arrow.projectile.active=arrow.hits.size<arrow.fractions.length && arrow.projectile.remainingRange>1e-8;
    }
    if(!arrow.projectile.active)endArrow(ctx,arrow);
  }
  s.arrows=s.arrows.filter(a=>a.projectile.active);
}
function tickFields(ctx:WoodArcherContext,seconds:number):void {
  const s=ctx.archer.wood;
  for(const field of [...s.fields]){
    if(field.kind!=='seed')continue;
    if(field.projectile?.active){
      const impact=tickProjectile(field.projectile,Math.min(seconds,Math.max(0,ctx.now-field.bornAt)),[],ctx.zone.objects);
      if(impact){s.fields=s.fields.filter(f=>f!==field);s.events.push({kind:'impact',at:ctx.now,position:impact.position,radius:12,type:'arrow'});continue;}
    }
    if(ctx.now+1e-9<field.armsAt||ctx.now>field.expiresAt+1e-9)continue;
    if(!enemies(ctx).some(b=>woodCircleHit(b,field.position,field.radius,ctx.zone)))continue;
    aoe(ctx,field.position,field.radius,B.e.damage*field.atk,'e',true);
    s.events.push({kind:'impact',at:ctx.now,position:{...field.position},radius:hasWoodCore(ctx.archer,'grove')?B.e.gardenRadius:field.radius,type:'bloom'});
    if(hasWoodCore(ctx.archer,'grove')){field.kind='garden';field.projectile=undefined;field.radius=B.e.gardenRadius;
      field.bornAt=ctx.now;field.expiresAt=ctx.now+B.e.gardenDuration;s.nextDotAt??=ctx.now+1;}
    else s.fields=s.fields.filter(f=>f!==field);
  }
  const connection=woodGroveConnection(ctx),u=s.ultimate;
  for(const body of ctx.bodies){
    const sourceId=`wood:${ctx.archer.id}:zone`;body.slows=body.slows?.filter(p=>p.sourceId!==sourceId)??[];
    if(!validBody(body)||!actorTargetAllowed(ctx.archer,body.actor,'ENEMY'))continue;
    const inGarden=s.fields.some(f=>f.kind==='garden'&&f.expiresAt>=ctx.now&&woodCircleHit(body,f.position,f.radius,ctx.zone));
    const inForest=u?.kind==='grove'&&ctx.now>=u.opensAt&&ctx.now<=u.endsAt&&woodCircleHit(body,u.position,u.radius,ctx.zone);
    const inLink=connection&&woodCapsuleHit(body,connection.from,connection.to,B.grove.linkRadius,ctx.zone);
    if(inGarden||inForest||inLink)body.slows.push({sourceId,multiplier:inLink?B.grove.linkSlow:B.e.slow,expiresAt:ctx.now+.025});
  }
}
function dot(ctx:WoodArcherContext):void {
  const s=ctx.archer.wood,connection=woodGroveConnection(ctx),u=s.ultimate;
  if(!hasWoodPath(ctx.archer,'b1',7))return;
  for(const body of enemies(ctx)){
    let raw=0;
    for(const field of s.fields)if(field.kind==='garden'&&field.expiresAt+1e-9>=ctx.now&&woodCircleHit(body,field.position,field.radius,ctx.zone))raw=Math.max(raw,field.atk*B.grove.damage);
    else if(field.kind==='path'&&field.end&&field.expiresAt+1e-9>=ctx.now&&woodCapsuleHit(body,field.position,field.end,field.radius,ctx.zone))raw=Math.max(raw,field.atk*B.grove.pathDamage);
    if(connection&&woodCapsuleHit(body,connection.from,connection.to,B.grove.linkRadius,ctx.zone))raw=Math.max(raw,connection.atk*B.grove.linkDamage);
    if(u?.kind==='grove'&&ctx.now>=u.opensAt&&ctx.now<=u.endsAt+1e-9&&woodCircleHit(body,u.position,u.radius,ctx.zone))
      raw=Math.max(raw,(B.ultimate.forestDamage+u.harvested)*u.atk*B.ultimate.power);
    if(raw>0)damage(ctx,body,raw,'dot');
  }
}
export function clearWoodArcher(ctx:Pick<WoodArcherContext,'archer'|'bodies'>):void {
  const s=ctx.archer.wood;s.sap=0;s.mark=undefined;s.r={charges:0,expiresAt:0};s.dash=undefined;
  s.arrows=[];s.fields=[];s.scheduled=[];s.ultimate=undefined;s.nextDotAt=undefined;s.busyUntil=0;s.rootUntil={};s.gained.clear();
  for(const b of ctx.bodies)b.slows=b.slows?.filter(p=>!p.sourceId.startsWith(`wood:${ctx.archer.id}:`));
}
/** Run calls this on a shared fixed simulation clock; presentation cannot create hits. */
export function tickWoodArcher(ctx:WoodArcherContext):void {
  nonnegative(ctx.now,'wood time');const a=ctx.archer,s=a.wood,seconds=Math.max(0,ctx.now-s.lastAt);s.lastAt=ctx.now;
  if(a.resources.currentHp<=0){clearWoodArcher(ctx);return;}
  expireShields(a,ctx.now);
  if(s.mark && (s.mark.expiresAt<=ctx.now||!enemies(ctx).some(b=>b.id===s.mark!.targetId)))s.mark=undefined;
  if(s.r.expiresAt<=ctx.now)s.r.charges=0;
  s.scheduled.sort((x,y)=>x.dueAt-y.dueAt);
  while(s.scheduled[0]?.dueAt<=ctx.now+1e-9){
    const event=s.scheduled.shift()!,eventCtx={...ctx,now:event.dueAt};
    if(event.kind==='arrow'){
      const origin=event.skill==='secondary'?event.origin:woodMuzzle(ctx.position);
      // A tail follows its primary Q's launch point even if the archer moves afterwards.
      if(event.skill==='q')for(const tail of s.scheduled)if(tail.kind==='arrow'&&tail.castId===event.castId&&tail.skill==='secondary')tail.origin={...origin};
      const arrow:WoodArrow={id:++s.nextId,castId:event.castId,projectile:createProjectile(`wood-arrow-${s.nextId}`,a.id,origin,event.direction,
        {speed:event.speed,radius:event.radius,range:event.range}),origin:{...origin},bornAt:event.dueAt,lastAt:event.dueAt,
        skill:event.skill,atk:event.atk,multiplier:event.skill==='basic'?useR(eventCtx):event.multiplier,damage:event.damage,fractions:event.fractions,
        hits:new Set(),original:event.original,markTarget:event.markTarget,markBonus:event.markBonus};
      s.arrows.push(arrow);s.events.push({kind:'launch',at:event.dueAt,arrow});
    }else{
      const u=s.ultimate;if(!u||u.id!==event.ultimateId)continue;
      aoe(eventCtx,u.position,u.radius,u.atk*B.ultimate.volleyDamage*B.ultimate.power,'volley',event.dueAt===u.opensAt);
      if(Math.abs(event.dueAt-u.opensAt)<1e-8)s.nextDotAt=u.opensAt+1;
      s.events.push({kind:'impact',at:event.dueAt,position:{...u.position},radius:u.radius,type:'volley',ultimate:true});
    }
  }
  tickArrows(ctx);tickFields(ctx,seconds);
  while(s.nextDotAt!==undefined&&s.nextDotAt<=ctx.now+1e-9){const at=s.nextDotAt;s.nextDotAt=at+1;dot({...ctx,now:at});}
  s.fields=s.fields.filter(f=>f.expiresAt>ctx.now+1e-9);
  if(s.ultimate && s.ultimate.endsAt<=ctx.now+1e-9){s.events.push({kind:'impact',at:ctx.now,position:s.ultimate.position,
    radius:s.ultimate.radius,type:'ultimate-end',ultimate:true});s.ultimate=undefined;}
  if(!s.fields.some(f=>f.kind==='garden'||f.kind==='path')&&!s.ultimate)s.nextDotAt=undefined;
  for(const id of s.gained)if(id<s.nextId-100)s.gained.delete(id);
  for(const id of Object.keys(s.rootUntil))if(s.rootUntil[id]<ctx.now-1)delete s.rootUntil[id];
}
