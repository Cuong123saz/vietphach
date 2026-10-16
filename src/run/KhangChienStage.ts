import { createKhangChienZone, KHANG_CHIEN_REFUGE as R, KHANG_CHIEN_ROADS } from '../world/khangChien';
import type { Point } from '../world/definitions';
import { KHANG_CHIEN_BALANCE as B } from '../config/balance/khangChien';
import { ELITE_ENEMIES } from '../config/balance/eliteEnemies';
import { allocateRunPotential, awardRunExperience, chooseRunEvolution, registerRunCombatBody, registerRunEnemyController, type RunState } from './Run';
import { experienceRequired } from '../gameplay/progression/Level';
import { setMageModifierPolicy } from '../gameplay/characters/jobs/mage/MageRuntime';
import { createResources, applyHpDamage, heal, restoreResource } from '../gameplay/characters/core/CharacterResources';
import { validateStats } from '../gameplay/characters/core/CharacterStats';
import { spawnEnemyElement } from '../gameplay/enemies/EnemyElement';
import { setEnemyCombatEnabled } from '../gameplay/enemies/EnemyCombat';
import type { CombatBody } from '../gameplay/combat/CombatBody';
import { resolveDamage } from '../gameplay/combat/Damage';
import { stopWaterCannon } from '../gameplay/characters/jobs/mage/WaterCannon';
import { WATER_LONG } from '../config/balance/waterLong';
import type { CombatObjective } from '../gameplay/combat/CombatObjective';
import type { EnemyAttackSettings } from '../gameplay/enemies/EnemyCombat';

export type KhangChienPhase='ready'|'arrival'|'barrier'|'sortie'|'briefing'|'rally'|'combat'|'transition'|'boss'|'bomb'|'sacrifice'|'purification'|'complete'|'failed';
export interface StageEnemy extends CombatBody { label:string; monsterArtId:string;roadId?:string }
export type StageEvent={kind:'map';index:number}|{kind:'summon';positions:Point[]}|{kind:'first-impact'|'eight-impact'|'finale-q-impact';position:Point;damage:number};
export interface FinaleDragonShot {launchedAt:number;impactAt:number;origin:Point;dotDamage:number;stackGain:number;landed:boolean}
export interface KhangChienRuntime {
  run:RunState;phase:KhangChienPhase;mapIndex:number;clock:number;phaseAt:number;
  kills:number;spawned:number;serial:number;nextSpawnAt:number;enemies:StageEnemy[];
  barrierActive:boolean;bossId?:string;finaleTarget?:Point;firstImpact:boolean;eightImpact:boolean;events:StageEvent[];
  barrier:CombatObjective;failureReason?:'player'|'barrier';
  barrierAttackAt?:number;
  /** Barrier HP seen last tick: damage is a drop from it (the barrier starts below max). */
  barrierLastHp?:number;
  renewal?:{origin:Point;missingMp:number;missingHp:number};
  finaleShots:FinaleDragonShot[];finaleStackDamage:number;
  finaleEightTargets?:Point[];
  finaleReleaseAt?:number;
  ritualLastKey?:{key:'q'|'e';at:number};
}
const TYPES=[['flat-fur-rat','Chuột Bùn','melee','thorn'],['grasshopper','Châu Chấu Giáp Rạ','melee','thorn'],
  ['crop-snail','Ốc Nhựa Uế','ranged','slime'],['caterpillar','Sâu Gai Rễ','ranged','thorn'],
  ['black-caterpillar','Sâu Hắc Châm','ranged','thorn'],['mutant-caterpillar','Sâu Túi Uế','ranged','slime']] as const;
export const stageInteractive=(s:KhangChienRuntime)=>s.phase==='combat'||s.phase==='boss';
export const stageAge=(s:KhangChienRuntime)=>s.clock-s.phaseAt;
export const finaleQRemaining=(s:KhangChienRuntime)=>s.phase==='sacrifice' && s.finaleReleaseAt===undefined?Infinity:0;
export function finaleTiming(s:KhangChienRuntime){
  const release=s.finaleReleaseAt??Infinity;
  // After the eight dragons: 2.5s of silence (the boss seems gone), friends run in and the shrunken boss is seen
  // still twitching, they jump for joy, then it suddenly explodes and a claw flies into the mage (slow motion).
  return {...B.finale,firstImpactAt:release+.5,eightChargeAt:0,eightLaunchAt:release+1,eightImpactAt:release+1.9,
    celebrateAt:release+4.4,revealAt:release+5,jumpAt:release+6,beamAt:release+7.2,clawHitAt:release+7.5,
    offeringAt:release+8.1,collapseAt:release+12.1};
}
export const purificationDuration=()=>B.purification.riseSeconds+B.purification.waveSeconds+B.purification.quietSeconds;
export function purificationProgress(s:KhangChienRuntime):number{
  if(s.phase==='complete')return 1;
  if(s.phase!=='purification')return 0;
  return Math.max(0,Math.min(1,(stageAge(s)-B.purification.riseSeconds)/B.purification.waveSeconds));
}
export function khangChienTimeScale(s:KhangChienRuntime):number {
  const timing=finaleTiming(s),age=stageAge(s);
  return s.phase==='sacrifice' && age>=timing.beamAt && age<timing.offeringAt? .2:1;
}
export function beginKhangChienSacrifice(s:KhangChienRuntime):boolean {
  if(s.phase!=='bomb' || s.run.character!.resources.currentHp<=0)return false;
  const mage=s.run.character!;applyHpDamage(mage,Math.max(0,mage.resources.currentHp-1));mage.resources.currentMp=0;
  mage.shields=[];phase(s,'sacrifice');s.finaleShots=[];s.finaleStackDamage=0;s.finaleReleaseAt=undefined;s.finaleEightTargets=undefined;
  const boss=s.enemies.find(e=>e.id===s.bossId)!;boss.actor.minimumHp=1;
  s.run.player.position={x:boss.position.x,y:Math.min(1270,boss.position.y+240)};return true;
}
/** Forgiving Q/E chord, accepts either order; time follows the paused stage clock. */
export function inputKhangChienRitual(s:KhangChienRuntime,key:'q'|'e'):boolean {
  if(s.phase!=='bomb')return false;
  const previous=s.ritualLastKey;
  s.ritualLastKey={key,at:s.clock};
  if(previous && previous.key!==key && s.clock-previous.at<=B.ritualComboWindow){
    s.ritualLastKey=undefined;return beginKhangChienSacrifice(s);
  }
  return false;
}
/** Stage-only Q command; normal Q cooldown, MP, Mach and mirrors are not touched. */
export function castKhangChienFinaleQ(s:KhangChienRuntime,origin:Point):boolean {
  const mage=s.run.character,age=stageAge(s);
  if(s.run.status!=='active' || s.phase!=='sacrifice' || !mage || mage.resources.currentHp<=0
    || !Number.isFinite(origin.x) || !Number.isFinite(origin.y) || age<B.finale.chargeSeconds
    || finaleQRemaining(s)<=0 || s.finaleShots.length>=B.finale.maxQ)return false;
  s.finaleShots.push({launchedAt:age,impactAt:age+B.finale.qFlightSeconds,origin:{...origin},
    dotDamage:mage.stats.maxMp*WATER_LONG.dotMpRatio,stackGain:mage.stats.atk*WATER_LONG.stackAtkRatio,landed:false});
  if(s.finaleShots.length===B.finale.maxQ)s.finaleReleaseAt=age;
  return true;
}
export const KHANG_CHIEN_RENEWAL_POINT:Point={x:1420,y:410};
export const renewalDuration=()=>B.renewal.returnSeconds+B.renewal.prayerSeconds+B.renewal.drawSeconds+B.renewal.sortieSeconds;
export function renewalStep(s:KhangChienRuntime):'return'|'prayer'|'draw'|'sortie'|undefined {
  if(s.phase!=='transition')return;
  const age=stageAge(s),b=B.renewal;
  return age<b.returnSeconds?'return':age<b.returnSeconds+b.prayerSeconds?'prayer':age<b.returnSeconds+b.prayerSeconds+b.drawSeconds?'draw':'sortie';
}
function beginRenewal(s:KhangChienRuntime){
  clearAttacks(s);const mage=s.run.character!;
  mage.resources.currentMp=Math.min(mage.resources.currentMp,mage.stats.maxMp*B.renewal.remainingMpRatio);
  s.renewal={origin:{...s.run.player.position},missingMp:mage.stats.maxMp-mage.resources.currentMp,missingHp:mage.stats.maxHp-mage.resources.currentHp};phase(s,'transition');
}
function tickRenewal(s:KhangChienRuntime,age:number,dt:number){
  const b=B.renewal,p=KHANG_CHIEN_RENEWAL_POINT,start=b.returnSeconds+b.prayerSeconds,end=start+b.drawSeconds;
  const returning=Math.min(1,age/b.returnSeconds),out=Math.max(0,Math.min(1,(age-end)/b.sortieSeconds));
  const from=s.renewal!.origin;
  s.run.player.position={x:from.x+(p.x-from.x)*returning+(1350-p.x)*out,y:from.y+(p.y-from.y)*returning+(650-p.y)*out};
  const fraction=(time:number)=>Math.max(0,Math.min(1,(time-start)/b.drawSeconds));
  const restored=fraction(age)-fraction(age-dt);
  if(restored>0){restoreResource(s.run.character!,'mp',s.renewal!.missingMp*restored);heal(s.run.character!,s.renewal!.missingHp*restored);
    heal(s.barrier.body.actor,s.barrier.body.actor.stats.maxHp*b.barrierHealRatio*restored);}
  if(age>=renewalDuration()){s.renewal=undefined;nextMap(s);}
}
function phase(s:KhangChienRuntime,value:KhangChienPhase){s.phase=value;s.phaseAt=s.clock;}
function createBarrier(run:RunState):CombatObjective {
  const id=`${run.id}:barrier`,stats=validateStats({maxHp:B.barrier.hp,maxMp:0,atk:0,def:0,mpRegen:0,attackSpeedRating:0,
    attackInterval:1,critChance:0,critDamage:1,moveSpeed:0});
  const resources=createResources(stats);resources.currentHp=stats.maxHp*B.barrier.initialRatio;
  return {body:{id,position:{x:R.x,y:R.y},radius:0,actor:{id,team:'player',combatRole:'melee',element:'water',stats,resources}},obstacleIds:[],
    protectedArea:{center:{x:R.x,y:R.y},radiusX:R.radiusX,radiusY:R.radiusY}};
}
function activateBarrier(s:KhangChienRuntime){
  s.barrierActive=true;s.barrier.obstacleIds=s.run.zone.objects.filter(o=>o.resource==='water-barrier').map(o=>o.id);
  if(!s.run.combatObjectives.includes(s.barrier))s.run.combatObjectives.push(s.barrier);
}
function syncStageSkillBuff(s:KhangChienRuntime){
  s.run.character!.waterSkills.encounterBuff={stage:'khang-chien',mapIndex:s.mapIndex,
    eRadiusMultiplier:(1+(s.mapIndex-1)*B.skills.eRadiusPerMap)*(s.mapIndex===4?B.skills.finalMapERadius:1),
    prisonDuration:B.skills.prisonDuration,prisonEruptDelay:B.skills.prisonEruptDelay,prisonDragonMpRatio:B.skills.prisonDragonMpRatio};
  Object.assign(s.run.character!.waterSkills.encounterBuff!,{qEmpowerAfter:B.skills.qEmpowerAfter,cannonSize:B.skills.cannonSize,cannonPush:B.skills.cannonPush,cannonPushScale:B.skills.cannonPushScale,cannonDamage:B.skills.cannonDamage,readyEHealRatio:B.skills.readyEHealRatio,qSietShieldMpRatio:B.skills.qSietShieldMpRatio,rPhaseSeconds:B.skills.rPhaseSeconds,rCooldown:B.skills.rCooldown});
  s.run.character!.basicAttack.instantFullRecovery=B.skills.cannonInterval;
}
export function createKhangChienRuntime(run:RunState):KhangChienRuntime {
  const mage=run.character;if(!mage || run.progression.level!==1 || run.combatBodies.length)throw new Error('Fresh Mage Run required.');
  while(run.progression.level<15)awardRunExperience(run,experienceRequired(run.progression.level)-run.progression.exp);
  allocateRunPotential(run,'spirit',60);allocateRunPotential(run,'vitality',10);allocateRunPotential(run,'dexterity',5);
  chooseRunEvolution(run,5,'core-long');for(const level of [7,9,11,13] as const)chooseRunEvolution(run,level,`b1-${level}`);
  const base={...mage.stats};setMageModifierPolicy(mage,stats=>({...stats,
    ...Object.fromEntries(Object.entries(B.mentor).map(([key,value])=>[key,stats[key as keyof typeof stats]+value-base[key as keyof typeof base]]))}));
  mage.resources=createResources(mage.stats);
  const s:KhangChienRuntime={run,phase:'arrival',mapIndex:1,clock:0,phaseAt:0,kills:0,spawned:0,serial:0,nextSpawnAt:0,
    enemies:[],barrierActive:false,barrier:createBarrier(run),firstImpact:false,eightImpact:false,events:[],finaleShots:[],finaleStackDamage:0};
  syncStageSkillBuff(s);
  Object.assign(run.zone,createKhangChienZone(1));run.zone.objects=run.zone.objects.filter(o=>o.resource!=='water-barrier');
  run.player.position={x:650,y:1320};setEnemyCombatEnabled(run.enemyCombat,false);
  for(let i=0;i<B.openingEnemies;i++)spawn(s,{x:650+(i%5-2)*60,y:1390+Math.floor(i/5)*35});
  return s;
}
function roadSpawn(serial:number){
  const road=KHANG_CHIEN_ROADS[Math.floor((serial-1)/B.spawnBatch)%KHANG_CHIEN_ROADS.length],a=road.points[0],b=road.points[1];
  const length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
  const rank=(serial-1)%B.spawnBatch,side=rank%2?18:-18;
  return {road,position:{x:a.x-dx*rank*64-dy*side,y:a.y-dy*rank*64+dx*side}};
}
function spawn(s:KhangChienRuntime,point?:Point,boss=false,forcedEliteType?:number):StageEnemy {
  const serial=++s.serial,type=TYPES[forcedEliteType??serial%TYPES.length],elite=!boss&&(forcedEliteType!==undefined||serial%B.eliteEvery===0);
  const art=boss?'boss-spiked-shell-beast':`${elite?'elite-':''}${type[0]}`,id=`${s.run.id}:stage:${serial}`;
  const tuning=boss?B.boss:elite?B.elite:B.normal;
  const entry=point?undefined:roadSpawn(serial);
  const stats=validateStats({maxHp:tuning.hp,maxMp:0,atk:tuning.atk,def:boss?B.boss.def:elite?15:5,mpRegen:0,
    attackSpeedRating:0,attackInterval:tuning.interval,critChance:0,critDamage:1,moveSpeed:tuning.speed});
  const element=spawnEnemyElement(id,boss?{rank:'boss',element:'earth'}:{rank:elite?'elite':'normal'},{random:Math.random}).element;
  const body:StageEnemy={id,label:boss?'Giáp Tai Ương':`${elite?'Tinh anh · ':''}${type[1]}`,monsterArtId:art,
    position:point??entry!.position,roadId:entry?.road.id,radius:tuning.radius,rank:boss?'boss':elite?'elite':'normal',actor:{id,team:'enemy',element,combatRole:boss?'melee':type[2],stats,resources:createResources(stats)}};
  if(boss){body.actor.minimumHp=B.boss.hp*.4;s.bossId=id;}
  registerRunCombatBody(s.run,body);
  const attack=ELITE_ENEMIES[art]?.attack??{kind:type[2],visual:type[3],attackRange:type[2]==='melee'?55:220,
    windup:.8,recovery:.6,meleeHitRadius:18,projectileSpeed:210,projectileRadius:4,projectileRange:500,detectionRange:3000,leashRange:3000};
  registerRunEnemyController(s.run,id,{...attack,detectionRange:3000,leashRange:3000,pursuit:'relentless',...stageTraits(art),
    ...(boss?{emergeSummon:B.boss.emergeSummon}:{})});
  // Reinforcements still arrive on the roads, but hunt the mage directly like the boss.
  if(boss)s.run.enemyCombat.controllers.find(c=>c.id===id)!.threat.recoveryMaxHpPerSecond=0;
  s.enemies.push(body);if(!boss)s.spawned++;return body;
}
/** Stage mechanics layered on top of the shared Sandbox/elite attack definitions. */
export function stageTraits(art:string):Partial<EnemyAttackSettings> {
  const t=B.traits,species=art.replace(/^elite-/,'');
  if(art==='boss-spiked-shell-beast')return {bossCycle:{...B.bossCycle},windup:1.2,recovery:1.15};
  if(art==='elite-crop-snail')return {...t.snailResin,shotSlow:{...t.snailResin.shotSlow},pattern:undefined,spread:undefined,visual:'resin'};
  if(species==='mutant-caterpillar')return {pattern:'fan',visual:'slime',projectileCount:art.startsWith('elite-')?3:1,spread:.7,
    projectileSpeed:150,projectileRadius:7,projectileRange:420,windup:1,recovery:1.05,trail:{...t.mireTrail}};
  if(art==='elite-black-caterpillar')return {pattern:'zone',windup:1.2,recovery:1.1,zoneShot:{...t.bristleZone}};
  if(art==='elite-caterpillar')return {pattern:'wall',windup:1.1,recovery:1.1,wallShot:{...t.bristleWall}};
  if(art==='elite-grasshopper')return {pattern:'dive',windup:1.1,recovery:1.15,dive:{...t.grasshopperDive},displacedCounter:{...t.displacedCounter}};
  if(art==='elite-flat-fur-rat')return {pattern:'charge',attackRange:200,chargeSpeed:320,windup:.9,recovery:1,
    dragOnHit:{...t.ratDrag},displacedCounter:{...t.displacedCounter}};
  if(species==='flat-fur-rat')return {pattern:'charge',attackRange:155,chargeSpeed:270,windup:.75,recovery:.8,displacedCounter:{...t.displacedCounter}};
  if(species==='grasshopper')return {pattern:'dive',windup:.8,recovery:1,dive:{...t.grasshopperDive,count:1,radius:32,range:220},displacedCounter:{...t.displacedCounter}};
  if(species==='crop-snail')return {pattern:undefined,visual:'resin',projectileCount:1,projectileSpeed:125,projectileRadius:10,projectileRange:400,
    shotSlow:{multiplier:.75,seconds:.8},leadShots:true,aimLockSeconds:.3,windup:.9,recovery:.85};
  if(species==='caterpillar')return {pattern:'fan',projectileCount:3,spread:.45,projectileSpeed:185,projectileRadius:4,windup:.9,recovery:.8};
  if(species==='black-caterpillar')return {pattern:undefined,projectileCount:1,projectileSpeed:170,projectileRadius:6,windup:1,recovery:.95};
  return {};
}
/** The boss surfaced: random elites burst out of the ground in a ring around it (alive count capped). */
function drainSummons(s:KhangChienRuntime){
  for(const request of s.run.enemyCombat.summons.splice(0)){
    const positions:Point[]=[];
    for(let i=0;i<request.count && s.enemies.length<B.boss.summonAliveCap;i++){
      const a=i*Math.PI*2/request.count+Math.random()*.4,r=B.boss.summonRadius;
      const p={x:request.position.x+Math.cos(a)*r,y:request.position.y+Math.sin(a)*r*.6};
      spawn(s,p,false,Math.floor(Math.random()*TYPES.length));positions.push(p);
    }
    if(positions.length)s.events.push({kind:'summon',positions});
  }
}
function purgeDead(s:KhangChienRuntime){
  const dead=new Set(s.enemies.filter(e=>e.actor.resources.currentHp<=0).map(e=>e.id));
  if(!dead.size)return;
  if(s.mapIndex<4)s.kills+=dead.size;
  s.enemies=s.enemies.filter(e=>!dead.has(e.id));
  s.run.combatBodies.splice(0,s.run.combatBodies.length,...s.run.combatBodies.filter(e=>!dead.has(e.id)));
  s.run.enemyCombat.controllers=s.run.enemyCombat.controllers.filter(c=>!dead.has(c.id));
  s.run.enemyCombat.shots=s.run.enemyCombat.shots.filter(c=>!dead.has(c.ownerId));
}
function clearAttacks(s:KhangChienRuntime){
  const run=s.run,mage=run.character!;stopWaterCannon(mage.basicAttack);run.projectiles.length=0;run.waterCannonAttacks.clear();
  mage.waterSkills.scheduled.length=0;mage.waterSkills.events.length=0;mage.waterSkills.swamp=undefined;mage.waterSkills.copiedSwamps=[];
  mage.waterSkills.mirrors.count=0;mage.waterSkills.pendingMachRestores=[];
  mage.waterSkills.prisons=[];run.player.slows?.splice(0);
  for(const body of run.combatBodies)body.slows=[];
  setEnemyCombatEnabled(run.enemyCombat,false);
}
export function beginKhangChienCombat(s:KhangChienRuntime){
  if(s.phase!=='briefing' && s.phase!=='rally')return;phase(s,'combat');s.nextSpawnAt=s.clock+1;setEnemyCombatEnabled(s.run.enemyCombat,true);
}
export function prepareKhangChienCombat(s:KhangChienRuntime){if(s.phase==='briefing')phase(s,'rally');}
/** Map 1 dirt-road waypoints: scout up the southeast road, return along the road south of the lotus pond. */
const OPENING_SCOUT:readonly Point[]=[{x:1800,y:1220},{x:1700,y:1215},{x:1640,y:1150},{x:1680,y:1080},{x:1760,y:1030},{x:1880,y:930},{x:1950,y:835}];
const OPENING_RETURN:readonly Point[]=[{x:1950,y:835},{x:1870,y:862},{x:1720,y:852},{x:1560,y:840},{x:1460,y:815},{x:1400,y:790},
  {x:1330,y:745},{x:1295,y:680},{x:1290,y:600},{x:1340,y:520},{x:1420,y:410}];
function alongPath(points:readonly Point[],t:number):Point {
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  let left=Math.max(0,Math.min(1,t))*lengths.reduce((a,b)=>a+b,0);
  for(let i=0;i<lengths.length;i++){
    if(left<=lengths[i]){const k=lengths[i]?left/lengths[i]:0,a=points[i],b=points[i+1];return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k};}
    left-=lengths[i];
  }
  return {...points[points.length-1]};
}
/** Return run beat: the pack runs up the south road onto the plaza at the mage's back; the mage turns,
 * raises an E water shield that holds them, runs on to the refuge, and the shield breaks. */
/** The shield is shoved back steadily by the pack until the barrier is half raised (22s), then breaks;
 * the pack spreads to its attack spots and stands ready until combat at 24s. */
export const OPENING_SHIELD={at:16.5,castEnd:17,until:22,fadeSeconds:.4,pushDistance:90,readyBy:23.4,progress:.74,
  /** Arc as sketched by the designer: centre up-left of the mage, sweeping from above the pack's front,
   * down past it and under the mage, hooking up on the mage's right. Angles in degrees, y down. */
  arcOffset:{x:-87,y:-75},radius:127,fromAngle:22,toAngle:185,
  /** Mana: the shield costs 10% of max MP; summoning the barrier drains the rest; regen only resumes in combat. */
  mpCost:.1,mpCostSeconds:.25,barrierDrainSeconds:1} as const;
const SOUTH_ROAD=KHANG_CHIEN_ROADS.find(road=>road.id==='south')!.points;
const smooth=(k:number)=>{const t=Math.max(0,Math.min(1,k));return t*t*(3-2*t);};
const landingAt=(i:number,t:number):Point=>({x:340+(i%5)*45,y:1190+Math.floor(i/5)*42-Math.min(t,10)*12});
const farOffset=(i:number):Point=>({x:-100-(i%5)*35,y:200+Math.floor(i/5)*42});
function openingReturnProgress(t:number):number {
  const shield=OPENING_SHIELD;
  if(t<=10)return 0;
  if(t<shield.at)return shield.progress*(t-10)/(shield.at-10);
  if(t<shield.castEnd)return shield.progress;
  return Math.min(1,shield.progress+(1-shield.progress)*(t-shield.castEnd)/(20-shield.castEnd));
}
function openingLeader(t:number):Point {
  return t>10?alongPath(OPENING_RETURN,openingReturnProgress(t)):alongPath(OPENING_SCOUT,Math.min(1,t/6));
}
/** How far the pack has shoved the shield back by time t, along the line from the pack toward the refuge. */
function shieldPush(t:number):Point {
  const s=OPENING_SHIELD,mage=alongPath(OPENING_RETURN,s.progress),arc={x:mage.x+s.arcOffset.x,y:mage.y+s.arcOffset.y};
  const count=B.openingEnemies,hold=Array.from({length:count},(_,i)=>packSlot(i)).reduce((a,b)=>({x:a.x+b.x/count,y:a.y+b.y/count}),{x:0,y:0});
  const dx=arc.x-hold.x,dy=arc.y-hold.y,len=Math.hypot(dx,dy)||1,u=Math.max(0,Math.min(1,(t-s.at)/(s.until-s.at)));
  return {x:dx/len*s.pushDistance*u,y:dy/len*s.pushDistance*u};
}
export function openingShieldPlacement(t:number=OPENING_SHIELD.at):{center:Point;position:Point;facing:Point;radius:number;halfAngle:number} {
  const s=OPENING_SHIELD,mage=alongPath(OPENING_RETURN,s.progress),push=t>s.at?shieldPush(t):{x:0,y:0};
  const center={x:mage.x+s.arcOffset.x+push.x,y:mage.y+s.arcOffset.y+push.y};
  const mid=(s.fromAngle+s.toAngle)/2*Math.PI/180,facing={x:Math.cos(mid),y:Math.sin(mid)};
  return {center,position:{x:center.x+facing.x*s.radius,y:center.y+facing.y*s.radius},facing,radius:s.radius,
    halfAngle:(s.toAngle-s.fromAngle)/2*Math.PI/180};
}
/** Where each enemy ends up pressed against the outside of the shield: two rows along its left/lower part. */
function packSlot(i:number):Point {
  const s=OPENING_SHIELD,mage=alongPath(OPENING_RETURN,s.progress),center={x:mage.x+s.arcOffset.x,y:mage.y+s.arcOffset.y},radius=s.radius;
  const count=B.openingEnemies,front=Math.ceil(count/2);
  const row=i<front?0:1,index=row?i-front:i,inRow=row?count-front:front;
  const angle=(112+(178-112)*(inRow>1?index/(inRow-1):.5)+(row?3:0))*Math.PI/180,r=radius+36+row*28;
  return {x:center.x+Math.cos(angle)*r,y:center.y+Math.sin(angle)*r};
}
function openingMp(s:KhangChienRuntime,t:number){
  const mage=s.run.character!,max=mage.stats.maxMp,shield=OPENING_SHIELD;
  const afterShield=max*(1-shield.mpCost*smooth((t-shield.at)/shield.mpCostSeconds));
  mage.resources.currentMp=t<20?afterShield:afterShield*(1-smooth((t-20)/shield.barrierDrainSeconds));
}
function openingEnemyPosition(i:number,t:number):Point {
  const shield=OPENING_SHIELD;
  if(t<=10)return landingAt(i,t);
  const count=B.openingEnemies,landing=Array.from({length:count},(_,j)=>landingAt(j,10)),slots=Array.from({length:count},(_,j)=>packSlot(j));
  const mean=(points:Point[])=>points.reduce((a,b)=>({x:a.x+b.x/count,y:a.y+b.y/count}),{x:0,y:0});
  const center=mean(landing),hold=mean(slots),route=[center,...SOUTH_ROAD.slice(1,-1),hold];
  const closing=(time:number)=>{
    const k=smooth((time-10)/(shield.at-10)),anchor=alongPath(route,k),blend=smooth(k*2);
    const own={x:landing[i].x-center.x,y:landing[i].y-center.y},slot={x:slots[i].x-hold.x,y:slots[i].y-hold.y};
    return {x:anchor.x+own.x+(slot.x-own.x)*blend,y:anchor.y+own.y+(slot.y-own.y)*blend};
  };
  if(t<shield.at)return closing(t);
  // Bounce straight back off the curved wall.
  const held=closing(shield.at),arc=openingShieldPlacement().center,dx=held.x-arc.x,dy=held.y-arc.y,len=Math.hypot(dx,dy)||1;
  // Bounce off, then keep shoving: the pack advances with the shield it is pushing back.
  const recoil=10*smooth((t-shield.at)/.3),push=shieldPush(Math.min(t,shield.until));
  const blocked={x:held.x+dx/len*recoil+push.x,y:held.y+dy/len*recoil+push.y};
  if(t<shield.until)return blocked;
  const leader=openingLeader(Math.min(t,20)),far=farOffset(i),final={x:leader.x+far.x,y:Math.min(1370,leader.y+far.y)};
  const k=smooth((t-shield.until)/(shield.readyBy-shield.until));
  return {x:blocked.x+(final.x-blocked.x)*k,y:blocked.y+(final.y-blocked.y)*k};
}
/** Opening positions and barrier creation are driven by media time, supplied by Presentation. */
export function syncKhangChienOpening(s:KhangChienRuntime,playbackTime:number){
  if(!Number.isFinite(playbackTime)||playbackTime<0)throw new Error('Invalid opening time.');
  if(!['ready','arrival','barrier'].includes(s.phase))return;
  s.clock=playbackTime;
  s.run.player.position=openingLeader(playbackTime);
  s.enemies.forEach((e,i)=>{e.position=openingEnemyPosition(i,playbackTime);});
  openingMp(s,playbackTime);
  if(playbackTime<20){s.phase='arrival';s.phaseAt=0;return;}
  if(!s.barrierActive){s.run.zone.objects=createKhangChienZone(1).objects;activateBarrier(s);}
  s.phase='barrier';s.phaseAt=20;
  if(playbackTime>=24){phase(s,'briefing');beginKhangChienCombat(s);openingAssault(s);}
}
/** Closest point on the barrier ellipse along the line from a body toward its centre. */
function barrierEdge(from:Point):Point {
  const dx=R.x-from.x,dy=R.y-from.y,a=(dx/R.radiusX)**2+(dy/R.radiusY)**2;
  const fx=(from.x-R.x)/R.radiusX,fy=(from.y-R.y)/R.radiusY,b=2*(fx*dx/R.radiusX+fy*dy/R.radiusY),c=fx*fx+fy*fy-1;
  const t=Math.max(0,(-b-Math.sqrt(Math.max(0,b*b-4*a*c)))/(2*a));
  return {x:from.x+dx*t,y:from.y+dy*t};
}
function openingAssault(s:KhangChienRuntime){
  const a=B.openingAssault,now=s.run.time;
  s.enemies.forEach((e,i)=>{
    const c=s.run.enemyCombat.controllers.find(c=>c.id===e.id);if(!c)return;
    const species=e.monsterArtId.replace(/^elite-/,''),leap=species==='flat-fur-rat' || species==='grasshopper';
    const origin={x:e.position.x,y:e.position.y-e.radius},aim=barrierEdge(e.position);
    c.targetId=s.barrier.body.id;c.lockedTarget=true;c.phase='windup';c.origin=origin;c.aim=aim;
    c.rawDamage=e.actor.stats.atk*a.damageRatio;c.element=e.actor.element;c.approach=undefined;
    c.ability=leap?'charge':c.settings.pattern==='radial'?'radial':c.settings.pattern?'fan':undefined;
    c.volleyCount=c.settings.projectileCount??1;c.wallVolleyLeft=undefined;
    if(leap){c.lungeRange=Math.hypot(aim.x-origin.x,aim.y-origin.y)+24;c.lungeSpeed=a.leapSpeed;}
    c.phaseEndsAt=now+a.windup+(i%8)*a.stagger;c.nextAttackAt=c.phaseEndsAt+e.actor.stats.attackInterval;
  });
}
function nextMap(s:KhangChienRuntime){
  s.mapIndex++;Object.assign(s.run.zone,createKhangChienZone(s.mapIndex));s.run.player.position={x:1350,y:650};
  syncStageSkillBuff(s);
  activateBarrier(s);
  s.enemies=[];s.run.combatBodies.length=0;s.run.enemyCombat.controllers.length=0;s.kills=0;s.spawned=0;
  s.events.push({kind:'map',index:s.mapIndex});phase(s,s.mapIndex===4?'boss':'combat');
  setEnemyCombatEnabled(s.run.enemyCombat,true);s.nextSpawnAt=s.clock+1;
  if(s.mapIndex===4){spawn(s,undefined,true);for(let i=0;i<16;i++)spawn(s);}
}
function impact(s:KhangChienRuntime,rawDamage:number,all:boolean):number {
  let total=0;const from=s.run.character!,center=s.finaleTarget!;
  for(const body of s.enemies){
    if(!all && Math.hypot(body.position.x-center.x,body.position.y-center.y)>B.finale.radius+body.radius)continue;
    total+=resolveDamage({source:from,target:body.actor,element:'water',rawDamage,canCrit:false,targetPolicy:'ENEMY',
      hit:{kind:'aoe',sourceId:from.id,targetId:body.id}},{random:()=>1,now:s.run.time}).appliedDamage;
  }
  return total;
}
export function tickKhangChien(s:KhangChienRuntime,dt:number){
  if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid stage delta.');
  if(s.run.status!=='active' || ['briefing','complete','failed'].includes(s.phase))return;
  s.clock+=dt;const age=stageAge(s);
  if(stageInteractive(s)){
    if(s.barrierAttackAt===undefined && (s.run.enemyCombat.controllers.some(c=>c.targetId===s.barrier.body.id && ['windup','lunge'].includes(c.phase))
      || s.run.enemyCombat.shots.some(shot=>shot.targetId===s.barrier.body.id)
      || s.barrier.body.actor.resources.currentHp<(s.barrierLastHp??s.barrier.body.actor.resources.currentHp)))s.barrierAttackAt=s.clock;
    s.barrierLastHp=s.barrier.body.actor.resources.currentHp;
    if(s.barrier.body.actor.resources.currentHp<=0){
      s.failureReason='barrier';s.barrierActive=false;s.run.zone.objects=s.run.zone.objects.filter(o=>o.resource!=='water-barrier');
      s.run.combatObjectives.length=0;clearAttacks(s);phase(s,'failed');return;
    }
    if(s.run.character!.resources.currentHp<=0){s.failureReason='player';clearAttacks(s);phase(s,'failed');return;}
    const boss=s.enemies.find(e=>e.id===s.bossId);
    if(s.phase==='boss' && boss && boss.actor.resources.currentHp<=B.boss.hp*.4){
      clearAttacks(s);phase(s,'bomb');s.finaleTarget={...boss.position};return;
    }
    purgeDead(s);
    drainSummons(s);
    if(s.mapIndex<4 && s.kills>=B.quotas[s.mapIndex-1]){beginRenewal(s);return;}
    if(s.clock>=s.nextSpawnAt){
      const cap=s.mapIndex<4?B.aliveCaps[s.mapIndex-1]:32,remaining=s.mapIndex<4?B.quotas[s.mapIndex-1]-s.spawned:5;
      for(let i=0;i<Math.min(B.spawnBatch,remaining,cap-s.enemies.length);i++)spawn(s);
      s.nextSpawnAt=s.clock+(s.mapIndex===4?8:B.spawnInterval);
    }return;
  }
  if(s.phase==='arrival'){
    const t=Math.min(1,age/4);s.run.player.position={x:650+770*t,y:1320-910*t};
    s.enemies.forEach((e,i)=>{e.position={x:s.run.player.position.x-100-(i%5)*35,y:Math.min(1370,s.run.player.position.y+200+Math.floor(i/5)*42)};});
    if(age>=4){s.run.zone.objects=createKhangChienZone(1).objects;activateBarrier(s);phase(s,'barrier');}
  }else if(s.phase==='barrier' && age>=1.2)phase(s,'sortie');
  else if(s.phase==='sortie'){
    const t=Math.min(1,age/1.2);s.run.player.position={x:1420-70*t,y:410+240*t};
    if(age>=1.2)phase(s,'briefing');
  }else if(s.phase==='transition')tickRenewal(s,age,dt);
  else if(s.phase==='sacrifice'){
    const timing=finaleTiming(s);s.run.character!.resources.currentMp=0;
    const pullSeconds=Math.max(0,Math.min(age,timing.firstImpactAt)-Math.max(age-dt,B.finale.chargeSeconds));
    if(pullSeconds>0)for(const body of s.enemies){
      const dx=s.finaleTarget!.x-body.position.x,dy=s.finaleTarget!.y-body.position.y,d=Math.hypot(dx,dy);
      if(d>0 && d<=B.finale.radius+body.radius){const step=Math.min(d,28*pullSeconds);body.position.x+=dx/d*step;body.position.y+=dy/d*step;}
    }
    for(const shot of s.finaleShots)if(!shot.landed && shot.impactAt<=age){
      shot.landed=true;
      s.events.push({kind:'finale-q-impact',position:{...s.finaleTarget!},damage:impact(s,shot.dotDamage+s.finaleStackDamage,false)});
      s.finaleStackDamage+=shot.stackGain;
    }
    // This is the Stage ending sequence, not a global unlock of either Lv15 evolution.
    if(age>=timing.eightLaunchAt && !s.finaleEightTargets){
      const boss=s.enemies.find(e=>e.id===s.bossId && e.actor.resources.currentHp>0);
      const point=boss?.position??s.finaleTarget!;
      s.finaleEightTargets=Array.from({length:8},()=>({...point}));
    }
    if(age>=timing.firstImpactAt && !s.firstImpact){s.firstImpact=true;s.events.push({kind:'first-impact',position:s.finaleTarget!,damage:impact(s,B.finale.firstRawDamage,false)});}
    if(age>=timing.eightImpactAt && !s.eightImpact){s.eightImpact=true;s.events.push({kind:'eight-impact',position:s.finaleTarget!,damage:impact(s,B.finale.eightRawDamage,true)});}
    if(age>=timing.collapseAt){
      const boss=s.enemies.find(e=>e.id===s.bossId);if(boss){boss.actor.minimumHp=undefined;applyHpDamage(boss.actor,boss.actor.resources.currentHp);}
      applyHpDamage(s.run.character!,s.run.character!.resources.currentHp);purgeDead(s);phase(s,'purification');
      // Preserve elapsed cinematic time even when one tick crosses both milestones.
      s.phaseAt-=age-timing.collapseAt;
      if(stageAge(s)>=purificationDuration())phase(s,'complete');
    }
  }else if(s.phase==='purification'){
    s.run.character!.resources.currentMp=0;
    if(age>=purificationDuration())phase(s,'complete');
  }
}
/** Explicit Dev shortcuts exercise actual deaths and the same director; never fake a kill counter. */
export function khangChienDev(s:KhangChienRuntime,action:'stage-skip-intro'|'stage-clear-wave'|'stage-boss-finale'|'stage-test-ultimate'|'stage-enter-refuge'|'stage-exit-refuge'){
  if(action==='stage-test-ultimate' && s.run.status==='active' && !['failed','complete','sacrifice','purification'].includes(s.phase)){
    if(['ready','arrival','barrier','sortie','briefing','rally'].includes(s.phase)){
      khangChienDev(s,'stage-skip-intro');beginKhangChienCombat(s);
    }
    while(s.mapIndex<4){
      if(s.phase==='combat')khangChienDev(s,'stage-clear-wave');
      if(s.phase!=='transition')return;
      tickKhangChien(s,Math.max(0,renewalDuration()-stageAge(s))+.01);
    }
    khangChienDev(s,'stage-boss-finale');return;
  }
  if(stageInteractive(s) && (action==='stage-enter-refuge' || action==='stage-exit-refuge')){
    s.run.player.position=action==='stage-enter-refuge'?{...KHANG_CHIEN_RENEWAL_POINT}:{x:1350,y:650};return;
  }
  if(action==='stage-skip-intro' && ['ready','arrival','barrier','sortie','briefing','rally'].includes(s.phase)){
    const skipBriefing=['ready','briefing','rally'].includes(s.phase);
    s.run.zone.objects=createKhangChienZone(1).objects;activateBarrier(s);s.run.player.position={x:1350,y:650};phase(s,'briefing');
    if(skipBriefing)beginKhangChienCombat(s);
  }
  if(action==='stage-clear-wave' && s.phase==='combat'){
    const total=B.quotas[s.mapIndex-1];
    while(s.spawned<total){for(const e of s.enemies)applyHpDamage(e.actor,e.actor.resources.currentHp);purgeDead(s);
      for(let i=0;i<Math.min(20,total-s.spawned);i++)spawn(s);}
    for(const e of s.enemies)applyHpDamage(e.actor,e.actor.resources.currentHp);tickKhangChien(s,0);
  }
  if(action==='stage-boss-finale' && s.phase==='boss'){
    const boss=s.enemies.find(e=>e.id===s.bossId);if(boss)applyHpDamage(boss.actor,boss.actor.stats.maxHp);tickKhangChien(s,0);
  }
}
