import type { PlacedObject, Point, Zone } from '../../world/definitions';
import { overlaps, boxOverlapsObstacle } from '../../world/collision';
import { bodyCenter, bodyIntersectsCircle, movementBody, worldBodyBox } from '../../world/bodyGeometry';
import { moveCharacter } from '../characters/core/movement';
import { validBody, bodyMoveMultiplier, type CombatBody } from '../combat/CombatBody';
import { actorTargetAllowed } from '../combat/Targeting';
import { resolveDamage, type DamageResult } from '../combat/Damage';
import { createProjectile, tickProjectile, type Projectile } from '../combat/Projectile';
import type { Element } from '../combat/Element';
import { nonnegative } from '../core/validation';
import { createThreatState, clearThreat, tickThreatRecovery, type ThreatState } from './EnemyThreat';
import { createBossSequence, tickBossSequence, type BossSequence, type BossCycleSettings } from './SpikedShellBoss';
import { objectiveSurface, objectiveAtObstacle, objectiveProtects, type CombatObjective } from '../combat/CombatObjective';

export interface EnemyAttackSettings {
  kind: 'melee' | 'ranged'; visual: 'slime' | 'thorn' | 'resin';
  /** Ranged shots that stick: a hit also slows the target. */
  shotSlow?: { multiplier: number; seconds: number };
  /** Ranged: aim where the player will be when the shot arrives, and fire burstCount shots burstGap apart. */
  leadShots?: boolean; burstCount?: number; burstGap?: number;
  /** Freeze a predictive shot's aim this many seconds before release, giving a readable dodge window. */
  aimLockSeconds?:number;
  detectionRange: number; leashRange: number; attackRange: number;
  windup: number; recovery: number; meleeHitRadius: number;
  projectileSpeed: number; projectileRadius: number; projectileRange: number;
  pattern?: 'charge' | 'fan' | 'radial' | 'boss' | 'zone' | 'wall' | 'dive'; projectileCount?: number; spread?: number;
  chargeSpeed?: number;
  /** Ground hazard left behind while moving. */
  trail?: EnemyGroundSettings & { kind: 'slime' | 'fire'; spacing: number };
  /** pattern 'zone': bristles land where the target is heading, leaving a damage area. */
  /** dodgeSeconds: extra warning after the predicted landing before anything hurts (lead still uses flightSeconds). */
  zoneShot?: EnemyGroundSettings & { flightSeconds: number; impactRatio: number; rootSeconds?: number; dodgeSeconds?: number };
  /** Being pushed or pulled arms a lunge at the player after delay; another push/pull interrupts it. */
  displacedCounter?: { delay: number; chargeSpeed: number; range: number; lockSeconds?:number; /** rad/s; set = the lunge homes on the player */ turnRate?: number };
  /** Boss: each time it surfaces, request this many reinforcements (the encounter spawns them) instead of shooting. */
  emergeSummon?: number;
  /** pattern 'wall': a volley of bristle arcs that land across the player's path and block movement. */
  wallShot?: { count: number; gap: number; flightSeconds: number; dodgeSeconds?: number; duration: number; radius: number; halfAngle: number; thickness: number; impactRatio: number; cooldown: number;
    /** Touching a solid arc hurts, every touchInterval seconds. */
    touchRatio: number; touchInterval: number };
  /** pattern 'dive': leap high and crash down on the target's spot, count times in a row. */
  dive?: { count: number; airSeconds: number; pause: number; radius: number; range: number; impactRatio: number };
  /** A charge that connects with the player drags them along. */
  dragOnHit?: { distance: number; speed: number };
  pursuit?: 'territorial' | 'relentless';
  objectiveAggroRange?:number;
  bossCycle?:BossCycleSettings;
}
export interface EnemyGroundSettings { radius: number; duration: number; damageRatio: number; tickInterval: number; armingSeconds?:number; slow?: { multiplier: number; seconds: number } }
export interface EnemyZone {
  id: string; ownerId: string; kind: 'slime' | 'fire' | 'bristle'; position: Point; origin?: Point; radius: number;
  bornAt: number; activeAt: number; expiresAt: number; rawDamage: number; impactDamage?: number; impacted?: boolean;
  element: Element; tickInterval: number; slow?: { multiplier: number; seconds: number }; nextHitAt: Record<string, number>;
  /** Landing hit pins its victims in place for this long. */
  rootSeconds?: number;
}
export interface EnemyWall {
  id: string; ownerId: string; origin: Point; center: Point; facing: Point; radius: number; halfAngle: number; thickness: number;
  bornAt: number; activeAt: number; expiresAt: number; impactDamage: number; element: Element; impacted?: boolean;
  touchDamage: number; touchInterval: number; nextTouchAt: Record<string, number>;
  /** Present once solid; host is the objects array it was inserted into. */
  object?: PlacedObject; host?: PlacedObject[];
}
export type EnemyPhase = 'idle' | 'chase' | 'windup' | 'lunge' | 'recover' | 'return' | 'dead';
export interface EnemyController {
  id: string; home: Point; settings: EnemyAttackSettings; phase: EnemyPhase;
  phaseEndsAt: number; nextAttackAt: number; facingLeft: boolean; serial: number;
  aim?: Point; origin?: Point; rawDamage: number; element: Element;
  aimLocked?:boolean;
  threat: ThreatState; targetId?: string;
  ability?: 'charge'|'fan'|'radial'|'zone'|'wall'|'dive'; volleyCount?:number; attacksMade?:number;
  wallVolleyLeft?:number;burstLeft?:number;
  dive?:{from:Point;to:Point;startedAt:number;landsAt:number;left:number;pauseUntil?:number};
  drag?:{targetId:string;direction:Point;left:number};
  /** Position after this controller's own movement; any later change came from outside (push/pull). */
  anchor?:Point; displacedAt?:number; counter?:{firesAt:number;fired:boolean};
  lungeRange?:number; lungeSpeed?:number; trailFrom?:Point;
  /** A scripted attack keeps its target even if a better one appears; cleared once it resolves. */
  lockedTarget?:boolean;
  boss?:BossSequence;
  approach?:{waypoints:readonly Point[];index:number};
}
export interface EnemyShot {
  projectile: Projectile; ownerId: string; rawDamage: number; element: Element;
  visual: EnemyAttackSettings['visual'];
  targetId?:string;
  slow?: { multiplier: number; seconds: number };
}
export type EnemyCombatEvent = { kind: 'damage'; sourceId: string; targetId: string; position: Point; incomingSide: Point; damage: DamageResult }
  | {kind: 'impact'; position: Point; visual: EnemyAttackSettings['visual']}
  | {kind: 'interrupt'; ownerId: string; position: Point};
export interface EnemyCombatRuntime {
  enabled: boolean; controllers: EnemyController[]; shots: EnemyShot[];
  events: EnemyCombatEvent[]; attacks: number;
  zones: EnemyZone[]; zoneSerial: number; walls: EnemyWall[];
  /** Reinforcement requests raised by enemies (boss surfacing); the encounter director drains them. */
  summons: { ownerId: string; position: Point; count: number }[];
  /** Smoothed player movement, used to lead predictive attacks. */
  playerTrack?: { position: Point; velocity: Point };
}
interface EnemyContext {
  objectives?:readonly CombatObjective[];
  now: number; zone: Zone; bodies: readonly CombatBody[]; player?: CombatBody; random: () => number;
}
export const createEnemyCombat = ():EnemyCombatRuntime=>({enabled:true,controllers:[],shots:[],events:[],attacks:0,zones:[],zoneSerial:0,walls:[],summons:[]});
const WALL_TOUCH_MARGIN=6,PLAYER_TRACK_MAX_SPEED=600,COUNTER_EPISODE_GAP=.2,COUNTER_INTERRUPT_STAGGER=.5,DISPLACEMENT_EPSILON=.5,DISPLACEMENT_MIN_SPEED=8;
function validGround(g:EnemyGroundSettings){
  return [g.radius,g.duration,g.tickInterval].every(n=>Number.isFinite(n)&&n>0) && Number.isFinite(g.damageRatio) && g.damageRatio>=0
    && (g.armingSeconds===undefined || Number.isFinite(g.armingSeconds)&&g.armingSeconds>=0)
    && (!g.slow || (Number.isFinite(g.slow.multiplier) && g.slow.multiplier>0 && g.slow.multiplier<=1 && Number.isFinite(g.slow.seconds) && g.slow.seconds>0));
}

export function createEnemyController(body: CombatBody, settings: EnemyAttackSettings,now=0): EnemyController {
  const numbers=[settings.detectionRange,settings.leashRange,settings.attackRange,settings.windup,
    settings.recovery,settings.meleeHitRadius,settings.projectileSpeed,settings.projectileRadius,settings.projectileRange];
  if(!numbers.every(n=>Number.isFinite(n) && n>0) || settings.leashRange<settings.detectionRange
    || !['melee','ranged'].includes(settings.kind) || !['slime','thorn','resin'].includes(settings.visual))throw new Error('Invalid enemy attack settings.');
  if(settings.shotSlow && !(settings.shotSlow.multiplier>0 && settings.shotSlow.multiplier<=1 && settings.shotSlow.seconds>0))throw new Error('Invalid shot slow.');
  if((settings.burstCount!==undefined && !(Number.isInteger(settings.burstCount) && settings.burstCount>=1)) || (settings.burstGap!==undefined && !(settings.burstGap>0)))throw new Error('Invalid burst.');
  if(settings.aimLockSeconds!==undefined && (!Number.isFinite(settings.aimLockSeconds)||settings.aimLockSeconds<0||settings.aimLockSeconds>settings.windup))throw new Error('Invalid aim lock.');
  if(settings.pattern && !['charge','fan','radial','boss','zone','wall','dive'].includes(settings.pattern))throw new Error('Invalid attack pattern.');
  if(settings.trail && (!validGround(settings.trail) || !['slime','fire'].includes(settings.trail.kind) || !(settings.trail.spacing>0)))throw new Error('Invalid enemy trail.');
  if((settings.pattern==='zone')!==!!settings.zoneShot || (settings.zoneShot && (!validGround(settings.zoneShot) || !(settings.zoneShot.flightSeconds>0) || !(settings.zoneShot.impactRatio>=0))))throw new Error('Invalid zone shot.');
  const positive=(o:object|undefined)=>!o || Object.values(o).every(n=>typeof n==='number' && Number.isFinite(n) && n>0);
  if((settings.pattern==='wall')!==!!settings.wallShot || !positive(settings.wallShot) || (settings.wallShot && !Number.isInteger(settings.wallShot.count)))throw new Error('Invalid wall shot.');
  if((settings.pattern==='dive')!==!!settings.dive || !positive(settings.dive) || (settings.dive && !Number.isInteger(settings.dive.count)))throw new Error('Invalid dive.');
  if(!positive(settings.dragOnHit))throw new Error('Invalid drag.');
  if(settings.displacedCounter && ![settings.displacedCounter.delay,settings.displacedCounter.chargeSpeed,settings.displacedCounter.range].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid displaced counter.');
  if(settings.displacedCounter?.lockSeconds!==undefined && (!Number.isFinite(settings.displacedCounter.lockSeconds)||settings.displacedCounter.lockSeconds<0||settings.displacedCounter.lockSeconds>settings.displacedCounter.delay))throw new Error('Invalid counter aim lock.');
  if(settings.pursuit && !['territorial','relentless'].includes(settings.pursuit))throw new Error('Invalid pursuit policy.');
  if(settings.objectiveAggroRange!==undefined && (!Number.isFinite(settings.objectiveAggroRange)||settings.objectiveAggroRange<=0))throw new Error('Invalid objective aggro range.');
  if(settings.projectileCount!==undefined && (!Number.isInteger(settings.projectileCount)||settings.projectileCount<1||settings.projectileCount>32))throw new Error('Invalid volley count.');
  if(settings.spread!==undefined && (!Number.isFinite(settings.spread)||settings.spread<0||settings.spread>Math.PI*2))throw new Error('Invalid spread.');
  if(settings.chargeSpeed!==undefined && (!Number.isFinite(settings.chargeSpeed)||settings.chargeSpeed<=0))throw new Error('Invalid charge speed.');
  if(settings.bossCycle && !(['burrowSeconds','undergroundSeconds','emergeSeconds','volleyGap','jumpSeconds','jumpRange','jumpDelay','dashSeconds','dashSpeed','rollWarningSeconds','rollSeconds','rollSpeed','actionPause'] as const)
    .every(key=>Number.isFinite(settings.bossCycle![key])&&settings.bossCycle![key]>0))throw new Error('Invalid boss cycle.');
  const threat=createThreatState(now);body.actor.threat=threat;body.actor.combatRole=settings.kind;
  return {id:body.id,home:{...body.position},settings:{...settings},phase:'idle',phaseEndsAt:0,
    nextAttackAt:0,facingLeft:false,serial:0,rawDamage:0,element:body.actor.element,threat};
}

export function resetEnemyCombat(runtime: EnemyCombatRuntime, bodies: readonly CombatBody[],now=0): void {
  runtime.shots.length=0;runtime.events.length=0;runtime.attacks=0;clearEnemyHazards(runtime);
  for(const state of runtime.controllers){
    clearCounter(state);state.trailFrom=undefined;
    const body=bodies.find(b=>b.id===state.id);if(body){body.position={...state.home};body.burrowed=false;}
    state.boss=undefined;
    state.phase='idle';state.nextAttackAt=0;state.phaseEndsAt=0;state.aim=undefined;state.origin=undefined;state.aimLocked=undefined;
    state.targetId=undefined;state.ability=undefined;state.attacksMade=0;clearThreat(state.threat,now);
  }
}

/** Stopping cancels pending attacks; resuming cannot release a stored burst. */
export function setEnemyCombatEnabled(runtime: EnemyCombatRuntime, enabled: boolean): void {
  runtime.enabled=enabled;runtime.shots.length=0;clearEnemyHazards(runtime);
  for(const state of runtime.controllers){clearCounter(state);state.trailFrom=undefined;}
  for(const state of runtime.controllers)if(state.phase!=='dead'){
    state.phase='idle';state.aim=undefined;state.origin=undefined;state.aimLocked=undefined;state.ability=undefined;state.boss=undefined;
  }
}

const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
/** Removes ground zones and bristle walls, including wall obstacles already placed in the zone. */
export function clearEnemyHazards(runtime:EnemyCombatRuntime){
  for(const wall of runtime.walls)removeWallObject(wall);
  runtime.walls.length=0;runtime.zones.length=0;runtime.summons.length=0;runtime.playerTrack=undefined;
}
function removeWallObject(wall:EnemyWall){
  const index=wall.object && wall.host?wall.host.indexOf(wall.object):-1;
  if(index>=0)wall.host!.splice(index,1);
  wall.object=undefined;wall.host=undefined;
}
export function wallObject(wall:EnemyWall):PlacedObject {
  const base=Math.atan2(wall.facing.y,wall.facing.x),steps=8,outer:Point[]=[],inner:Point[]=[];
  for(let i=0;i<=steps;i++){
    const a=base-wall.halfAngle+2*wall.halfAngle*i/steps,c=Math.cos(a),s=Math.sin(a);
    outer.push({x:c*(wall.radius+wall.thickness/2),y:s*(wall.radius+wall.thickness/2)});
    inner.push({x:c*(wall.radius-wall.thickness/2),y:s*(wall.radius-wall.thickness/2)});
  }
  return {id:wall.id,name:'Lông gai',kind:'obstacle',resource:'bristle-wall',passProjectiles:true,x:wall.center.x,y:wall.center.y,
    shape:{type:'polygon',points:[...outer,...inner.reverse()]}};
}
function clearCounter(state:EnemyController){
  state.aimLocked=false;
  state.dive=undefined;state.drag=undefined;state.wallVolleyLeft=undefined;state.lockedTarget=undefined;
  state.anchor=undefined;state.displacedAt=undefined;state.counter=undefined;state.lungeRange=undefined;state.lungeSpeed=undefined;
}
/** Refreshes one source's slow in place, so a caller-owned slows array keeps it across ticks. */
function applySlow(target:CombatBody,sourceId:string,multiplier:number,expiresAt:number){
  target.slows??=[];
  const old=target.slows.find(s=>s.sourceId===sourceId);
  if(old){old.multiplier=Math.min(old.multiplier,multiplier);old.expiresAt=Math.max(old.expiresAt,expiresAt);}
  else target.slows.push({sourceId,multiplier,expiresAt});
}
function addZone(runtime:EnemyCombatRuntime,owner:CombatBody,kind:EnemyZone['kind'],ground:EnemyGroundSettings,position:Point,now:number,
  extra:{activeAt?:number;origin?:Point;impactDamage?:number;rootSeconds?:number}={}){
  const activeAt=extra.activeAt??now;
  runtime.zones.push({id:`${owner.id}:zone:${++runtime.zoneSerial}`,ownerId:owner.id,kind,position:{...position},origin:extra.origin && {...extra.origin},
    radius:ground.radius,bornAt:now,activeAt,expiresAt:activeAt+ground.duration,rawDamage:owner.actor.stats.atk*ground.damageRatio,
    impactDamage:extra.impactDamage,rootSeconds:extra.rootSeconds,element:owner.actor.element,tickInterval:ground.tickInterval,slow:ground.slow && {...ground.slow},nextHitAt:{}});
}
const alive=(body:CombatBody)=>body.id===body.actor.id && body.targetable!==false && body.actor.resources.currentHp>0;
function sheltered(context:EnemyContext,body:CombatBody):boolean {
  return (context.objectives??[]).some(o=>objectiveProtects(o,body.position));
}
function candidates(context:EnemyContext,body:CombatBody,includeSheltered=false):CombatBody[]{
  const objectives=(context.objectives??[]).map(o=>objectiveSurface(o,context.zone,bodyCenter(body))).filter((o):o is CombatBody=>!!o);
  const actors=[...context.bodies,...(context.player?[context.player]:[])].filter(b=>includeSheltered || !sheltered(context,b));
  return [...actors,...objectives].filter(b=>validBody(b) && actorTargetAllowed(body.actor,b.actor,'ENEMY'));
}
function attackCandidates(context:EnemyContext,body:CombatBody,targetId?:string):CombatBody[]{
  return candidates(context,body).filter(b=>!(context.objectives??[]).some(o=>o.protectedArea && o.body.id===b.id && b.id!==targetId));
}
function chooseTarget(context:EnemyContext,state:EnemyController,body:CombatBody):CombatBody|undefined {
  const objectiveIds=new Set((context.objectives??[]).filter(o=>validBody(o.body)).map(o=>o.body.id));
  const ward=(context.objectives??[]).some(o=>o.protectedArea && validBody(o.body));
  const usesObjective=objectiveIds.size>0 && (ward || state.settings.objectiveAggroRange!==undefined);
  return candidates(context,body).filter(b=>ward || !usesObjective || objectiveIds.has(b.id) || (state.threat.points.get(b.id)??0)>0 || distance(b.position,body.position)<=state.settings.objectiveAggroRange!)
    .filter(b=>state.settings.pursuit==='relentless' || distance(b.position,state.home)<=state.settings.leashRange
    && ((state.threat.points.get(b.id)??0)>0 || distance(b.position,body.position)<=state.settings.detectionRange))
    .sort((a,b)=>(state.threat.points.get(b.id)??0)-(state.threat.points.get(a.id)??0)
      || (usesObjective?Number(objectiveIds.has(a.id))-Number(objectiveIds.has(b.id)):0)
      || Number(b.id===state.targetId)-Number(a.id===state.targetId)
      || distance(a.position,body.position)-distance(b.position,body.position)
      || a.id.localeCompare(b.id))[0];
}
function hitObjective(runtime:EnemyCombatRuntime,context:EnemyContext,source:CombatBody,obstacleId:string,kind:'hitbox'|'projectile',rawDamage:number,element:Element,side:Point,targetId?:string){
  const objective=objectiveAtObstacle(context.objectives,obstacleId);
  // A stray shot at an outside actor is blocked by the ward, not an attack on its HP.
  if(objective?.protectedArea && targetId!==objective.body.id)return;
  const target=objective && objectiveSurface(objective,context.zone,bodyCenter(source));
  if(target)damage(runtime,context,source,target,kind,rawDamage,element,side);
}
function damage(runtime: EnemyCombatRuntime, context: EnemyContext, source:CombatBody, target:CombatBody,
  kind:'hitbox'|'projectile',rawDamage:number,element:Element, incomingSide: Point){
  const result=resolveDamage({source:source.actor,target:target.actor,rawDamage,element,canCrit:true,targetPolicy:'ENEMY',
    hit:{kind,sourceId:source.id,targetId:target.id}},{random:context.random,now:context.now});
  if(result.hit)runtime.events.push({kind:'damage',sourceId:source.id,targetId:target.id,position:{...bodyCenter(target)},incomingSide:{...incomingSide},damage:result});
}
function move(body:CombatBody, point:Point, seconds:number, context:EnemyContext){
  const footprint=movementBody(body),speed=body.actor.stats.moveSpeed*bodyMoveMultiplier(body,context.now);
  if(!speed)return;
  const others=[...context.bodies,...(context.player?[context.player]:[])].filter(b=>b.id!==body.id && validBody(b));
  const length=distance(body.position,point);if(length===0)return;
  body.position=moveCharacter(body.position,{x:(point.x-body.position.x)/length,y:(point.y-body.position.y)/length},
    Math.min(seconds,length/speed),context.zone,
    {speed,radius:footprint.radius,blockingBodies:others.map(movementBody)});
}
function release(runtime:EnemyCombatRuntime,context:EnemyContext,state:EnemyController,body:CombatBody){
  if(state.settings.leadShots && state.settings.kind==='ranged' && !state.ability && !state.aimLocked)leadAim(runtime,context,state,body);
  const origin=state.origin!,aim=state.aim!,dx=aim.x-origin.x,dy=aim.y-origin.y,length=Math.hypot(dx,dy);
  const direction=length>1e-6?{x:dx/length,y:dy/length}:{x:state.facingLeft?-1:1,y:0};
  const settings=state.settings;
  if(state.ability==='wall' && settings.wallShot){
    fireWall(runtime,context,state,body);
    if((state.wallVolleyLeft??0)>0){state.wallVolleyLeft!--;state.phase='windup';state.phaseEndsAt=context.now+settings.wallShot.gap;return;}
    state.nextAttackAt=context.now+settings.wallShot.cooldown;
  }else if(state.ability==='zone' && settings.zoneShot){
    const zone=settings.zoneShot,target=[...context.bodies,...(context.player?[context.player]:[])].find(b=>b.id===state.targetId);
    const lead=target && target.id===context.player?.id && runtime.playerTrack?runtime.playerTrack.velocity:{x:0,y:0};
    const base=target?target.position:aim,predicted={x:base.x+lead.x*zone.flightSeconds,y:base.y+lead.y*zone.flightSeconds};
    const reach=distance(origin,predicted),limit=settings.projectileRange;
    const point=reach>limit?{x:origin.x+(predicted.x-origin.x)/reach*limit,y:origin.y+(predicted.y-origin.y)/reach*limit}:predicted;
    addZone(runtime,body,'bristle',zone,point,context.now,{activeAt:context.now+zone.flightSeconds+(zone.dodgeSeconds??0),origin,impactDamage:state.rawDamage*zone.impactRatio,rootSeconds:zone.rootSeconds});
  }else if(settings.kind==='ranged' || state.ability==='radial'){
    const count=state.volleyCount??1,angle=Math.atan2(direction.y,direction.x);
    for(let i=0;i<count;i++){
      const offset=state.ability==='radial'?i*Math.PI*2/count:count===1?0:(i/(count-1)-.5)*(settings.spread??0);
      const shotDirection={x:Math.cos(angle+offset),y:Math.sin(angle+offset)};
    runtime.shots.push({ownerId:body.id,targetId:state.targetId,element:state.element,rawDamage:state.rawDamage,visual:settings.visual,slow:settings.shotSlow && {...settings.shotSlow},
      projectile:createProjectile(`${body.id}:shot:${++state.serial}`,body.id,origin,shotDirection,
        {speed:settings.projectileSpeed,radius:settings.projectileRadius,range:settings.projectileRange})});
    }
    if(settings.kind==='ranged' && (state.burstLeft??0)>0){state.burstLeft!--;state.phase='windup';state.phaseEndsAt=context.now+(settings.burstGap??.35);state.aimLocked=false;return;}
  }else{
    const reach=Math.min(length,settings.attackRange),point={x:origin.x+direction.x*reach,y:origin.y+direction.y*reach};
    // Physical obstructions also stop a melee strike; targeting alone never proves a hit.
    const obstruction=reach>1e-6?tickProjectile(createProjectile(`${body.id}:probe`,body.id,origin,direction,
      {speed:reach,radius:settings.projectileRadius,range:reach}),1,[],context.zone.objects):undefined;
    if(obstruction?.type==='obstacle')hitObjective(runtime,context,body,obstruction.obstacleId,'hitbox',state.rawDamage,state.element,{x:-direction.x,y:-direction.y},state.targetId);
    if(!obstruction)for(const target of [...context.bodies,...(context.player?[context.player]:[])]){
      if(validBody(target) && !sheltered(context,target) && actorTargetAllowed(body.actor,target.actor,'ENEMY') && bodyIntersectsCircle(target,point,settings.meleeHitRadius)){
        const center=bodyCenter(target);
        damage(runtime,context,body,target,'hitbox',state.rawDamage,state.element,{x:origin.x-center.x,y:origin.y-center.y});
      }
    }
  }
  runtime.attacks++;state.attacksMade=(state.attacksMade??0)+1;state.phase='recover';state.phaseEndsAt=context.now+settings.recovery;
  releaseLock(state);
}
function releaseLock(state:EnemyController){
  if(!state.lockedTarget)return;
  state.lockedTarget=undefined;if(!state.counter){state.lungeRange=undefined;state.lungeSpeed=undefined;}
}

export function tickEnemyCombat(runtime:EnemyCombatRuntime, context:EnemyContext, seconds:number): void {
  nonnegative(seconds,'enemy delta');nonnegative(context.now,'enemy time');
  // Threat/recovery are combat timers, independent of the DEV movement/attack switch.
  for(const state of runtime.controllers){
    const body=context.bodies.find(b=>b.id===state.id);if(!body)continue;
    if(!runtime.enabled && state.settings.bossCycle)body.burrowed=false;
    if(!alive(body)){
      body.burrowed=false;state.boss=undefined;
      state.phase='dead';state.targetId=undefined;state.aim=undefined;state.origin=undefined;
      clearThreat(state.threat,context.now);continue;
    }
    const allowed=new Set(candidates(context,body,true).map(b=>b.id));
    for(const id of state.threat.points.keys())if(!allowed.has(id))state.threat.points.delete(id);
    tickThreatRecovery(state.threat,body.actor,context.now);
  }
  if(!runtime.enabled)return;
  // Tick previously launched shots first so a new projectile does not travel an extra frame.
  for(let i=runtime.shots.length-1;i>=0;i--){
    const shot=runtime.shots[i],source=context.bodies.find(b=>b.id===shot.ownerId);
    if(!source || !alive(source)){runtime.shots.splice(i,1);continue;}
    const targets=[...context.bodies,...(context.player?[context.player]:[])].filter(b=>validBody(b) && !sheltered(context,b) && actorTargetAllowed(source.actor,b.actor,'ENEMY'));
    const impact=tickProjectile(shot.projectile,seconds,targets,context.zone.objects);
    if(impact){
      runtime.events.push({kind:'impact',position:{...impact.position},visual:shot.visual});
      if(impact.type==='enemy'){
        const target=targets.find(t=>t.id===impact.hit.targetId)!;
        damage(runtime,context,source,target,'projectile',shot.rawDamage,shot.element,{x:-impact.direction.x,y:-impact.direction.y});
        if(shot.slow)applySlow(target,`enemy-shot:${shot.visual}:${shot.ownerId}`,shot.slow.multiplier,context.now+shot.slow.seconds);
      }else hitObjective(runtime,context,source,impact.obstacleId,'projectile',shot.rawDamage,shot.element,{x:-impact.direction.x,y:-impact.direction.y},shot.targetId);
    }
    if(!shot.projectile.active)runtime.shots.splice(i,1);
  }
  if(context.player){
    const p=context.player.position,old=runtime.playerTrack;
    if(old && seconds>0){
      let k=Math.min(1,seconds*8),vx=(p.x-old.position.x)/seconds,vy=(p.y-old.position.y)/seconds;
      // A teleport (map change, Dev shortcut) is not movement to lead.
      if(Math.hypot(vx,vy)>PLAYER_TRACK_MAX_SPEED){vx=0;vy=0;k=1;}
      runtime.playerTrack={position:{...p},velocity:{x:old.velocity.x+(vx-old.velocity.x)*k,y:old.velocity.y+(vy-old.velocity.y)*k}};
    }else runtime.playerTrack={position:{...p},velocity:old?.velocity??{x:0,y:0}};
  }
  tickZones(runtime,context);
  tickWalls(runtime,context);
  for(const state of runtime.controllers){
    const body=context.bodies.find(b=>b.id===state.id);if(!body)continue;
    if(!alive(body))continue;
    if(state.phase==='dead')state.phase='idle';
    const settings=state.settings;
    if(settings.trail){
      if(!state.trailFrom)state.trailFrom={...body.position};
      else if(distance(state.trailFrom,body.position)>=settings.trail.spacing){
        addZone(runtime,body,settings.trail.kind,settings.trail,body.position,context.now,{activeAt:context.now+(settings.trail.armingSeconds??0)});state.trailFrom={...body.position};
      }
    }
    if(settings.displacedCounter && tickDisplacedCounter(runtime,context,state,body,seconds))continue;
    if(state.dive){tickDive(runtime,context,state,body);continue;}
    const target=chooseTarget(context,state,body);
    if(!target && settings.pursuit==='relentless'){
      body.burrowed=false;state.boss=undefined;
        clearCounter(state);state.ability=undefined;
        state.phase='idle';state.aim=undefined;state.origin=undefined;state.targetId=undefined;
      continue;
    }
    if(!target || (settings.pursuit!=='relentless' && distance(body.position,state.home)>settings.leashRange)){
        clearCounter(state);state.ability=undefined;
      state.phase='return';state.aim=undefined;state.origin=undefined;
      state.targetId=undefined;
    }
    if(state.phase==='return'){
      state.facingLeft=state.home.x<body.position.x;
      move(body,state.home,seconds,context);
      if(distance(body.position,state.home)<.01)state.phase='idle';
      continue;
    }
    if(!target)continue;
    if(state.approach && !state.counter){
      if((state.threat.points.get(target.id)??0)>0 || distance(body.position,target.position)<=settings.attackRange)state.approach=undefined;
      else {
        const route=state.approach;
        while(route.index<route.waypoints.length && distance(body.position,route.waypoints[route.index])<=18)route.index++;
        if(route.index>=route.waypoints.length)state.approach=undefined;
        else {state.targetId=target.id;state.phase='chase';state.facingLeft=route.waypoints[route.index].x<body.position.x;move(body,route.waypoints[route.index],seconds,context);continue;}
      }
    }
    if(settings.bossCycle){
      state.targetId=target.id;state.phase='chase';
      state.boss??=createBossSequence(context.now,settings.bossCycle);
      tickBossSequence(state.boss,{now:context.now,seconds,body,target,targets:attackCandidates(context,body,state.targetId),zone:context.zone,
        targetVelocity:target.id===context.player?.id?runtime.playerTrack?.velocity:undefined,
        emerged:settings.emergeSummon?at=>{runtime.summons.push({ownerId:body.id,position:at,count:settings.emergeSummon!});}:undefined,
        settings:settings.bossCycle,hitRadius:settings.meleeHitRadius,
        shoot:()=>{
          state.origin={...bodyCenter(body)};state.aim={...bodyCenter(target)};state.rawDamage=body.actor.stats.atk;state.element=body.actor.element;
          state.ability='fan';state.volleyCount=settings.projectileCount??7;release(runtime,context,state,body);
        },
        hit:(victim,dir)=>damage(runtime,context,body,victim,'hitbox',body.actor.stats.atk,body.actor.element,{x:-dir.x,y:-dir.y}),
        obstacleTarget:id=>{const objective=objectiveAtObstacle(context.objectives,id);return objective && (!objective.protectedArea || state.targetId===objective.body.id)?objectiveSurface(objective,context.zone,bodyCenter(body)):undefined;}});
      state.facingLeft=state.boss.direction.x<0;
      continue;
    }
    if(state.targetId!==target.id && !state.counter && !state.lockedTarget && (state.phase==='windup' || state.phase==='lunge')){
      state.phase='chase';state.aim=undefined;state.origin=undefined;
    }
    if(!state.counter && !state.lockedTarget)state.targetId=target.id;
    const isObjective=context.objectives?.some(o=>o.body.id===target.id);
    const gap=distance(isObjective?bodyCenter(body):body.position,target.position);
    if(state.phase==='windup'){
      if(settings.aimLockSeconds!==undefined && settings.leadShots && !state.ability && !state.aimLocked){
        leadAim(runtime,context,state,body);
        if(context.now>=state.phaseEndsAt-settings.aimLockSeconds)state.aimLocked=true;
      }
      if(context.now>=state.phaseEndsAt){
        if(state.ability==='dive'){startDive(context,state,body,target,settings.dive!.count-1);continue;}
        if(state.ability==='charge'){
          state.phase='lunge';state.phaseEndsAt=context.now+(state.lungeRange??settings.attackRange)/(state.lungeSpeed??settings.chargeSpeed??450);
        }else release(runtime,context,state,body);
      }
      continue;
    }
    if(state.phase==='lunge' && state.drag){tickDrag(context,state,body,seconds);continue;}
    if(state.phase==='lunge' && state.counter?.fired && settings.displacedCounter?.turnRate && context.player && validBody(context.player)){
      // Homing counter lunge: turn toward the player at a capped rate, so only a sharp late sidestep can slip it.
      const from=bodyCenter(body),to=bodyCenter(context.player),turn=settings.displacedCounter.turnRate*seconds;
      const want=Math.atan2(to.y-from.y,to.x-from.x),current=Math.atan2(state.aim!.y-state.origin!.y,state.aim!.x-state.origin!.x);
      const delta=Math.atan2(Math.sin(want-current),Math.cos(want-current)),heading=current+Math.max(-turn,Math.min(turn,delta));
      state.origin={...from};state.aim={x:from.x+Math.cos(heading)*100,y:from.y+Math.sin(heading)*100};state.facingLeft=Math.cos(heading)<0;
    }
    if(state.phase==='lunge'){
      const aim=state.aim!,origin=state.origin!,length=distance(origin,aim);
      const dir=length>1e-6?{x:(aim.x-origin.x)/length,y:(aim.y-origin.y)/length}:{x:state.facingLeft?-1:1,y:0};
      const before={...body.position},beforeCenter={...bodyCenter(body)},footprint=movementBody(body);
      const dt=Math.min(seconds,Math.max(0,state.phaseEndsAt-(context.now-seconds)));
      body.position=moveCharacter(body.position,dir,dt,context.zone,{speed:(state.lungeSpeed??settings.chargeSpeed??450)*bodyMoveMultiplier(body,context.now),radius:footprint.radius,
        blockingBodies:[...context.bodies,...(context.player?[context.player]:[])].filter(b=>b.id!==body.id&&validBody(b)).map(movementBody)});
      const afterCenter=bodyCenter(body),travel=distance(beforeCenter,afterCenter);
      const targets=attackCandidates(context,body,state.targetId);
      const contact=travel>1e-6?tickProjectile(createProjectile(`${body.id}:charge-probe`,body.id,beforeCenter,
        {x:(afterCenter.x-beforeCenter.x)/travel,y:(afterCenter.y-beforeCenter.y)/travel},
        {speed:travel,radius:settings.meleeHitRadius,range:travel}),1,targets,context.zone.objects):undefined;
      if(contact?.type==='enemy'){
        const victim=targets.find(t=>t.id===contact.hit.targetId)!;
        damage(runtime,context,body,victim,'hitbox',state.rawDamage,state.element,{x:-dir.x,y:-dir.y});
        runtime.attacks++;state.attacksMade=(state.attacksMade??0)+1;releaseLock(state);
        if(settings.dragOnHit && victim.id===context.player?.id){state.drag={targetId:victim.id,direction:dir,left:settings.dragOnHit.distance};continue;}
        state.phase='recover';state.phaseEndsAt=context.now+settings.recovery;
        endCounterLunge(state);continue;
      }
      if(context.now>=state.phaseEndsAt || (dt>0 && distance(before,body.position)<.01)){
        state.origin={...bodyCenter(body)};state.aim={x:state.origin.x+dir.x*settings.meleeHitRadius,y:state.origin.y+dir.y*settings.meleeHitRadius};
        release(runtime,context,state,body);endCounterLunge(state);
      }
      continue;
    }
    if(state.phase==='recover' && context.now<state.phaseEndsAt)continue;
    state.facingLeft=target.position.x<body.position.x;
    if(gap<=settings.attackRange){
      state.phase='chase';
      if(context.now>=state.nextAttackAt){
        state.phase='windup';state.origin={...bodyCenter(body)};state.aim={...bodyCenter(target)};state.aimLocked=false;
        state.ability=settings.pattern==='boss' || (settings.pattern==='dive' && isObjective)?'charge':settings.pattern;
        // Walls and ground zones only hurt actors; against the barrier they fall back to a plain fan volley.
        if((state.ability==='wall' || state.ability==='zone') && isObjective)state.ability='fan';
        state.wallVolleyLeft=state.ability==='wall'?settings.wallShot!.count-1:undefined;
        state.burstLeft=!state.ability && settings.kind==='ranged' && settings.burstCount?settings.burstCount-1:undefined;
        state.volleyCount=settings.projectileCount??1;
        state.rawDamage=body.actor.stats.atk;state.element=body.actor.element;
        state.phaseEndsAt=context.now+settings.windup;state.nextAttackAt=context.now+body.actor.stats.attackInterval;
      }
    }else{
      state.phase='chase';move(body,target.position,seconds,context);
    }
  }
  for(const state of runtime.controllers){
    const body=context.bodies.find(b=>b.id===state.id);
    if(body && state.settings.displacedCounter)state.anchor={...body.position};
  }
}
function endCounterLunge(state:EnemyController){
  if(state.counter?.fired){state.counter=undefined;state.lungeRange=undefined;state.lungeSpeed=undefined;}
}
/** Returns true when the counter owns this tick (staggering in place or interrupted). */
function tickDisplacedCounter(runtime:EnemyCombatRuntime,context:EnemyContext,state:EnemyController,body:CombatBody,seconds:number):boolean {
  const counter=state.settings.displacedCounter!;
  // Judge by drift speed, so E's slow continuous pull (~20 px/s, well under 1 px per frame) still counts.
  const drift=state.anchor?distance(state.anchor,body.position):0;
  const displaced=drift>1e-3 && (seconds>0?drift/seconds>DISPLACEMENT_MIN_SPEED:drift>DISPLACEMENT_EPSILON);
  if(displaced){
    const newEpisode=state.displacedAt===undefined || context.now-state.displacedAt>Math.max(COUNTER_EPISODE_GAP,seconds*1.5);
    state.displacedAt=context.now;
    // A fresh push/pull breaks an armed or travelling counter, and also any leap/dive already under way
    // (e.g. E's pull yanking a rat or grasshopper out of its jump).
    const leaping=!!state.dive || !!state.drag || state.phase==='lunge' || (state.phase==='windup' && (state.ability==='charge' || state.ability==='dive'));
    if(newEpisode && (state.counter || leaping)){
      state.dive=undefined;state.drag=undefined;state.lockedTarget=undefined;
      state.counter=undefined;state.lungeRange=undefined;state.lungeSpeed=undefined;
      state.phase='recover';state.phaseEndsAt=context.now+COUNTER_INTERRUPT_STAGGER;state.aim=undefined;state.origin=undefined;state.ability=undefined;
      runtime.events.push({kind:'interrupt',ownerId:body.id,position:{...bodyCenter(body)}});
      return true;
    }
      if(newEpisode){state.aimLocked=false;state.counter={firesAt:context.now+counter.delay,fired:false};state.dive=undefined;state.drag=undefined;state.lockedTarget=undefined;}
    else if(state.counter && !state.counter.fired)state.counter.firesAt=context.now+counter.delay;
  }
  if(!state.counter || state.counter.fired)return false;
  const player=context.player && validBody(context.player) && !sheltered(context,context.player)?context.player:undefined;
  if(!player){state.counter=undefined;return false;}
  // Stagger toward the player: stand still, keep aiming, then lunge.
  state.targetId=player.id;state.origin={...bodyCenter(body)};
  if(displaced)state.aimLocked=false;
    if(!state.aimLocked || !state.aim){
    state.aim={...bodyCenter(player)};
    if(counter.lockSeconds!==undefined && context.now>=state.counter.firesAt-counter.lockSeconds)state.aimLocked=true;
  }
    state.facingLeft=state.aim!.x<state.origin.x;state.ability='charge';state.lungeRange=counter.range;state.lungeSpeed=counter.chargeSpeed;
  state.rawDamage=body.actor.stats.atk;state.element=body.actor.element;
  if(context.now<state.counter.firesAt || displaced){state.phase='windup';state.phaseEndsAt=state.counter.firesAt;return true;}
  state.counter.fired=true;state.phase='lunge';state.phaseEndsAt=context.now+counter.range/counter.chargeSpeed;
  state.nextAttackAt=Math.max(state.nextAttackAt,context.now+body.actor.stats.attackInterval);
  return false;
}
function tickZones(runtime:EnemyCombatRuntime,context:EnemyContext){
  for(let i=runtime.zones.length-1;i>=0;i--){
    const zone=runtime.zones[i],owner=context.bodies.find(b=>b.id===zone.ownerId);
    if(context.now>=zone.expiresAt || !owner || !alive(owner)){runtime.zones.splice(i,1);continue;}
    if(context.now<zone.activeAt)continue;
    const victims=[...context.bodies,...(context.player?[context.player]:[])].filter(b=>validBody(b) && !sheltered(context,b)
      && actorTargetAllowed(owner.actor,b.actor,'ENEMY') && bodyIntersectsCircle(b,zone.position,zone.radius));
    const impact=zone.impactDamage!==undefined && !zone.impacted;
    if(impact)zone.impacted=true;
    for(const victim of victims){
      const center=bodyCenter(victim),side={x:zone.position.x-center.x,y:zone.position.y-center.y};
      if(impact){
        damage(runtime,context,owner,victim,'hitbox',zone.impactDamage!,zone.element,side);zone.nextHitAt[victim.id]=context.now+zone.tickInterval;
        if(zone.rootSeconds)applySlow(victim,`enemy-root:${zone.ownerId}`,0,context.now+zone.rootSeconds);
      }
      else if(context.now>=(zone.nextHitAt[victim.id]??0)){
        if(zone.rawDamage>0)damage(runtime,context,owner,victim,'hitbox',zone.rawDamage,zone.element,side);
        zone.nextHitAt[victim.id]=context.now+zone.tickInterval;
      }
      if(zone.slow)applySlow(victim,`enemy-zone:${zone.kind}:${zone.ownerId}`,zone.slow.multiplier,context.now+zone.slow.seconds);
    }
  }
}
function actorTargets(context:EnemyContext,owner:CombatBody):CombatBody[]{
  return [...context.bodies,...(context.player?[context.player]:[])].filter(b=>validBody(b) && !sheltered(context,b) && actorTargetAllowed(owner.actor,b.actor,'ENEMY'));
}
function bodyHitsObject(body:CombatBody,object:PlacedObject):boolean {
  const box=worldBodyBox(body);return box?boxOverlapsObstacle(box,object):overlaps(body.position,body.radius,object);
}
/** Lands across where the player is heading; a still player gets the arc dropped right on them. */
function fireWall(runtime:EnemyCombatRuntime,context:EnemyContext,state:EnemyController,body:CombatBody){
  const w=state.settings.wallShot!,target=actorTargets(context,body).find(b=>b.id===state.targetId);
  if(!target)return;
  const v=target.id===context.player?.id && runtime.playerTrack?runtime.playerTrack.velocity:{x:0,y:0},speed=Math.hypot(v.x,v.y);
  let facing:Point,center:Point;
  if(speed>30){facing={x:v.x/speed,y:v.y/speed};center={x:target.position.x+v.x*w.flightSeconds,y:target.position.y+v.y*w.flightSeconds};}
  else {
    const dx=target.position.x-body.position.x,dy=target.position.y-body.position.y,len=Math.hypot(dx,dy)||1;
    facing={x:dx/len,y:dy/len};center={x:target.position.x-facing.x*w.radius,y:target.position.y-facing.y*w.radius};
  }
  runtime.walls.push({id:`${body.id}:wall:${++runtime.zoneSerial}`,ownerId:body.id,origin:{...bodyCenter(body)},center,facing,radius:w.radius,halfAngle:w.halfAngle,
    thickness:w.thickness,bornAt:context.now,activeAt:context.now+w.flightSeconds+(w.dodgeSeconds??0),expiresAt:context.now+w.flightSeconds+(w.dodgeSeconds??0)+w.duration,
    impactDamage:body.actor.stats.atk*w.impactRatio,element:body.actor.element,touchDamage:body.actor.stats.atk*w.touchRatio,touchInterval:w.touchInterval,nextTouchAt:{}});
}
function tickWalls(runtime:EnemyCombatRuntime,context:EnemyContext){
  for(let i=runtime.walls.length-1;i>=0;i--){
    const wall=runtime.walls[i];
    if(context.now>=wall.expiresAt){removeWallObject(wall);runtime.walls.splice(i,1);continue;}
    if(context.now<wall.activeAt)continue;
    const shape=wallObject(wall);
    if(!wall.impacted){
      wall.impacted=true;
      const owner=context.bodies.find(b=>b.id===wall.ownerId);
      if(owner && alive(owner))for(const victim of actorTargets(context,owner))if(bodyHitsObject(victim,shape)){
        const center=bodyCenter(victim);damage(runtime,context,owner,victim,'hitbox',wall.impactDamage,wall.element,{x:wall.center.x-center.x,y:wall.center.y-center.y});
      }
    }
    // Turns solid only once nobody stands inside it, so it can never trap a body.
    if(!wall.object){
      const occupied=[...context.bodies,...(context.player?[context.player]:[])].some(b=>b.actor.resources.currentHp>0 && overlaps(b.position,movementBody(b).radius,shape));
      if(!occupied){context.zone.objects.push(shape);wall.object=shape;wall.host=context.zone.objects;}
    }
    // Brushing against a solid arc stings; movement stops at its edge, so test with a small margin.
    const owner=context.bodies.find(b=>b.id===wall.ownerId);
    if(wall.object && owner && alive(owner))for(const victim of actorTargets(context,owner)){
      if(context.now<(wall.nextTouchAt[victim.id]??0) || !overlaps(victim.position,movementBody(victim).radius+WALL_TOUCH_MARGIN,shape))continue;
      wall.nextTouchAt[victim.id]=context.now+wall.touchInterval;
      const center=bodyCenter(victim);damage(runtime,context,owner,victim,'hitbox',wall.touchDamage,wall.element,{x:wall.center.x-center.x,y:wall.center.y-center.y});
    }
  }
}
function startDive(context:EnemyContext,state:EnemyController,body:CombatBody,target:CombatBody,left:number){
  const d=state.settings.dive!,from={...body.position},dx=target.position.x-from.x,dy=target.position.y-from.y,len=Math.hypot(dx,dy);
  // The landing spot is locked at take-off and clamped by walls/barrier, so it can be dodged.
  const to=len>1e-6?moveCharacter(from,{x:dx/len,y:dy/len},1,context.zone,{speed:Math.min(len,d.range),radius:movementBody(body).radius}):from;
  state.dive={from,to,startedAt:context.now,landsAt:context.now+d.airSeconds,left};
  state.phase='lunge';state.facingLeft=to.x<from.x;state.targetId=target.id;state.rawDamage=body.actor.stats.atk;state.element=body.actor.element;
}
function tickDive(runtime:EnemyCombatRuntime,context:EnemyContext,state:EnemyController,body:CombatBody){
  const dive=state.dive!,d=state.settings.dive!;
  if(dive.pauseUntil!==undefined){
    state.phase='windup';
    if(context.now<dive.pauseUntil)return;
    const target=actorTargets(context,body).find(b=>b.id===state.targetId);
    if(!target){state.dive=undefined;state.phase='recover';state.phaseEndsAt=context.now+state.settings.recovery;return;}
    startDive(context,state,body,target,dive.left);return;
  }
  const k=Math.min(1,(context.now-dive.startedAt)/(dive.landsAt-dive.startedAt));
  body.position={x:dive.from.x+(dive.to.x-dive.from.x)*k,y:dive.from.y+(dive.to.y-dive.from.y)*k};
  if(k<1)return;
  for(const victim of actorTargets(context,body))if(bodyIntersectsCircle(victim,dive.to,d.radius)){
    const center=bodyCenter(victim);damage(runtime,context,body,victim,'hitbox',state.rawDamage*d.impactRatio,state.element,{x:dive.to.x-center.x,y:dive.to.y-center.y});
  }
  runtime.events.push({kind:'impact',position:{...dive.to},visual:'thorn'});
  runtime.attacks++;state.attacksMade=(state.attacksMade??0)+1;
  if(dive.left>0){dive.left--;dive.pauseUntil=context.now+d.pause;state.phase='windup';}
  else {state.dive=undefined;state.phase='recover';state.phaseEndsAt=context.now+state.settings.recovery;}
}
function tickDrag(context:EnemyContext,state:EnemyController,body:CombatBody,seconds:number){
  const drag=state.drag!,settings=state.settings.dragOnHit!,player=context.player;
  const end=()=>{state.drag=undefined;state.phase='recover';state.phaseEndsAt=context.now+state.settings.recovery;endCounterLunge(state);};
  if(!player || player.id!==drag.targetId || !validBody(player)){end();return;}
  const step=Math.min(drag.left,settings.speed*seconds),before={...body.position};
  body.position=moveCharacter(body.position,drag.direction,1,context.zone,{speed:step,radius:movementBody(body).radius});
  const moved=distance(before,body.position);
  // Mutated in place: the context player shares its position object with the Run.
  const next=moveCharacter(player.position,drag.direction,1,context.zone,{speed:moved,radius:movementBody(player).radius,passWaterBarrier:true});
  player.position.x=next.x;player.position.y=next.y;
  drag.left-=step;
  if(drag.left<=1e-6 || (step>0 && moved<.01))end();
}
/** Re-aims at where the player will be when a shot of this speed reaches them (two refinement passes). */
function leadAim(runtime:EnemyCombatRuntime,context:EnemyContext,state:EnemyController,body:CombatBody){
  const target=[...context.bodies,...(context.player?[context.player]:[])].find(b=>b.id===state.targetId);
  if(!target)return;
  const origin=bodyCenter(body),base=bodyCenter(target),v=target.id===context.player?.id && runtime.playerTrack?runtime.playerTrack.velocity:{x:0,y:0};
  let aim={...base};
  for(let pass=0;pass<2;pass++){
    const time=Math.min(1.5,distance(origin,aim)/state.settings.projectileSpeed);
    aim={x:base.x+v.x*time,y:base.y+v.y*time};
  }
  state.origin={...origin};state.aim=aim;state.facingLeft=aim.x<origin.x;
}
