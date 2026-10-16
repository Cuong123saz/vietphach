import { moveCharacter, type MovementSettings } from '../gameplay/characters/core/movement';
import { MAPS, type Point, type Zone } from '../world/definitions';
import { parseStage } from '../world/parseStage';
import { createMage, type MageRuntime, allocateMagePotential, grantMageExperience, chooseMageEvolution } from '../gameplay/characters/jobs/mage/MageRuntime';
import type { EvolutionLevel } from '../gameplay/progression/Evolution';
import { regenerateMp } from '../gameplay/characters/core/CharacterResources';
import type { PotentialKey } from '../gameplay/characters/core/Potential';
import { createProgression, type ExpRequirement, type RunProgression } from '../gameplay/progression/Level';
import type { Element } from '../gameplay/combat/Element';
import { spawnEnemyElement, type EnemyDefinition, type EnemyElementState } from '../gameplay/enemies/EnemyElement';
import { nonnegative } from '../gameplay/core/validation';
import { chargeMoveMultiplier, stopWaterCannon } from '../gameplay/characters/jobs/mage/WaterCannon';
import { createProjectile, tickProjectile, type Projectile, type ProjectileTarget, type ProjectileImpact } from '../gameplay/combat/Projectile';
import { createWaterCannonAttack, resolveWaterCannonHit, type WaterCannonAttack } from '../gameplay/characters/jobs/mage/WaterCannonCombat';
import { actorTargetAllowed } from '../gameplay/combat/Targeting';
import { validBody, type CombatBody, type ViewBounds } from '../gameplay/combat/CombatBody';
import { validateResources } from '../gameplay/characters/core/CharacterResources';
import { castWaterQ, castWaterE, castWaterR, castWaterUltimate, tickWaterMage, flushMachRestores, type WaterMageContext } from '../gameplay/characters/jobs/mage/WaterMageSkills';
import { setMageTemporarySpirit } from '../gameplay/characters/jobs/mage/MageRuntime';
import { movementBody, bodyIntersectsCircle, validateBodyBox, type BodyBox } from '../world/bodyGeometry';
import { activeWaterSwamp } from '../gameplay/characters/jobs/mage/WaterLongRules';
import { swampDamage } from '../gameplay/characters/jobs/mage/WaterLongSwamp';
import { MOVEMENT_PREVIEW } from '../config/movement';
import { createEnemyCombat, createEnemyController, tickEnemyCombat, clearEnemyHazards, type EnemyAttackSettings, type EnemyCombatRuntime } from '../gameplay/enemies/EnemyCombat';
import { clearThreat } from '../gameplay/enemies/EnemyThreat';
import type { CombatObjective } from '../gameplay/combat/CombatObjective';

export interface RunState {
  readonly id: string;
  readonly mode: 'solo';
  readonly zone: Zone;
  readonly player: { position: Point; hitbox?:BodyBox; slows?:CombatBody['slows'] };
  readonly character?: MageRuntime;
  readonly progression: RunProgression;
  readonly enemies: EnemyElementState[];
  readonly projectiles: Projectile[];
  readonly waterCannonAttacks: Map<string, WaterCannonAttack>;
  readonly combatBodies: CombatBody[];
  readonly combatObjectives: CombatObjective[];
  readonly enemyCombat: EnemyCombatRuntime;
  time: number;
  status: 'active' | 'finished';
}

export interface RunResult {
  readonly runId: string;
  readonly mapId: keyof typeof MAPS;
  readonly zoneId: string;
  readonly outcome: 'abandoned';
}

// No account/cosmetic data is accepted by gameplay. Every call owns fresh state.
export function createRun(id: string, zone: Zone, mage?: { element: Element; moveSpeed: number }): RunState {
  if (!id.trim()) throw new Error('Run ID is required.');
  const clean = parseStage({ version: 1, id: `run-stage:${id}`, name: 'Run', zones: [zone] }).zones[0];
  const character = mage ? createMage(`${id}:player`, 'player', mage.element, mage.moveSpeed) : undefined;
  const progression = character?.progression ?? createProgression();
  return { id, mode: 'solo', zone: clean, player: { position: { ...clean.spawn }, slows: [] },
    character,
    get progression() { return character?.progression ?? progression; },
    enemies: [], projectiles: [], waterCannonAttacks: new Map(), combatBodies: [], combatObjectives:[], enemyCombat:createEnemyCombat(), time: 0, status: 'active' };
}

export function finishRun(run: RunState): RunResult {
  if (run.status !== 'active') throw new Error('Run has already finished.');
  run.status = 'finished';
  if (run.character) {
    const mage=run.character;stopWaterCannon(mage.basicAttack);
    mage.waterSkills.scheduled.length=0;mage.waterSkills.events.length=0;mage.waterSkills.links.length=0;
    mage.waterSkills.mirrors.count=0;mage.waterSkills.soloBuffExpiresAt=0;mage.mach=0;mage.shields=[];
    mage.waterSkills.swamp=undefined;mage.waterSkills.copiedSwamps=[];mage.waterSkills.pendingMachRestores=[];
    mage.waterSkills.prisons=[];mage.waterSkills.ultimate=undefined;mage.waterSkills.ultimateCooldown=0;mage.waterSkills.encounterBuff=undefined;mage.waterSkills.qCastsSinceEmpower=0;mage.basicAttack.instantFullRecovery=undefined;
    for(const body of run.combatBodies)body.slows=body.slows?.filter(s=>!s.sourceId.startsWith(`water-swamp:${mage.id}:`) && !s.sourceId.startsWith(`water-prison:${mage.id}:`));
    if(mage.temporarySpirit)setMageTemporarySpirit(mage,0);
  }
  run.projectiles.length = 0;
  run.waterCannonAttacks.clear();
  for(const state of run.enemyCombat.controllers){
    clearThreat(state.threat,run.time);
    const body=run.combatBodies.find(b=>b.id===state.id);if(body?.actor.threat===state.threat)body.actor.threat=undefined;
  }
  clearEnemyHazards(run.enemyCombat);run.enemyCombat.shots.length=0;run.enemyCombat.controllers.length=0;run.enemyCombat.events.length=0;
  run.combatObjectives.length=0;
  return { runId: run.id, mapId: run.zone.mapId, zoneId: run.zone.id, outcome: 'abandoned' };
}

export function createVillageZone(): Zone {
  return { id: 'village-outskirts', name: 'Ruộng ngoài làng', type: 'MONSTER', mapId: 'village', spawn: { x: 660, y: 800 }, objects: [] };
}

export function moveRunPlayer(run: RunState, direction: Point, seconds: number, settings: MovementSettings): void {
  if (run.status !== 'active') return;
  if (run.character && run.character.resources.currentHp <= 0) return;
  const footprint=movementBody({position:run.player.position,radius:settings.radius,hitbox:run.player.hitbox??settings.hitbox});
  run.player.position = moveCharacter(run.player.position, direction, seconds, run.zone,
    { ...settings, radius:footprint.radius, hitbox:undefined, passWaterBarrier:true,
      blockingBodies:playerPhasing(run)?[]:run.combatBodies.filter(validBody).map(movementBody),
      speed:(run.character?run.character.stats.moveSpeed * chargeMoveMultiplier(run.character.basicAttack):settings.speed)*playerSlowMultiplier(run) });
}
/** Enemy ground hazards slow the player; expired entries are pruned in place so the array identity survives. */
export function playerSlowMultiplier(run: RunState): number {
  const slows=run.player.slows;if(!slows)return 1;
  for(let i=slows.length-1;i>=0;i--)if(slows[i].expiresAt<=run.time)slows.splice(i,1);
  return Math.min(1,...slows.map(s=>s.multiplier));
}

export function tickRun(run: RunState, seconds: number): void {
  nonnegative(seconds, 'delta time');
  if(run.status!=='active')return;
  run.time+=seconds;
  if(run.character){tickWaterMage(waterContext(run));regenerateMp(run.character, seconds);}
  tickEnemyCombat(run.enemyCombat,{now:run.time,zone:run.zone,bodies:run.combatBodies,objectives:run.combatObjectives,
    player:run.character?{id:run.character.id,actor:run.character,position:run.player.position,
      radius:MOVEMENT_PREVIEW.radius,hitbox:run.player.hitbox,slows:run.player.slows,targetable:!playerPhasing(run)}:undefined,random:Math.random},seconds);
}
function activeMage(run: RunState): MageRuntime {
  if (run.status !== 'active' || !run.character) throw new Error('Active Mage run required.');
  return run.character;
}
export function registerRunCombatBody(run: RunState, body: CombatBody): void {
  if(run.status!=='active' || body.id!==body.actor.id || body.id===run.character?.id || run.combatBodies.some(old=>old.id===body.id))throw new Error('Invalid combat body identity.');
  nonnegative(body.radius,'combat radius');
  if(body.hitbox)validateBodyBox(body.hitbox);
  if(!['melee','ranged'].includes(body.actor.combatRole))throw new Error('Missing combat body role.');
  if(![body.position.x,body.position.y].every(Number.isFinite))throw new Error('Invalid combat position.');
  validateResources(body.actor);run.combatBodies.push(body);
}
function waterContext(run: RunState, view: ViewBounds={x:0,y:0,width:MAPS.village.width,height:MAPS.village.height}): WaterMageContext {
  return {mage:activeMage(run),position:run.player.position,bodies:run.combatBodies,view,now:run.time,random:Math.random,zone:run.zone};
}
export function registerRunEnemyController(run:RunState,id:string,settings:EnemyAttackSettings):void {
  const body=run.combatBodies.find(b=>b.id===id);
  if(run.status!=='active' || !body || !run.character || body.actor.team===run.character.team
    || run.enemyCombat.controllers.some(c=>c.id===id))throw new Error('Invalid enemy controller identity.');
  run.enemyCombat.controllers.push(createEnemyController(body,settings,run.time));
}
export const castRunQ=(run:RunState,point:Point)=>castWaterQ(waterContext(run),point);
export const castRunUltimate=(run:RunState,view:ViewBounds,point:Point)=>castWaterUltimate(waterContext(run,view),point);
export const castRunE=(run:RunState,view:ViewBounds,selectedId?:string,ground?:Point)=>castWaterE(waterContext(run,view),selectedId,ground);
export function castRunR(run:RunState){
  const result=castWaterR(waterContext(run));
  // Phasing sheds crowd control on the spot (slows and roots live on the run's player).
  if(result.ok && playerPhasing(run))run.player.slows?.splice(0);
  return result;
}
/** Stage R phase: the mage cannot be targeted and walks through bodies. */
export const playerPhasing=(run:RunState)=>(run.character?.waterSkills.phaseUntil??-Infinity)>run.time;
export function allocateRunPotential(run: RunState, key: PotentialKey, amount: number): void {
  allocateMagePotential(activeMage(run), key, amount);
}
export function awardRunExperience(run: RunState, amount: number, requirement?: ExpRequirement): void {
  grantMageExperience(activeMage(run), amount, requirement);
}
export function chooseRunEvolution(run:RunState,level:EvolutionLevel,id:string):void {
  chooseMageEvolution(activeMage(run),level,id);
}
// Encounter caller supplies rank/definition; Lab marker resources are not guessed to be enemy definitions.
export function spawnRunEnemy(run: RunState, id: string, definition: EnemyDefinition, options: { random: () => number; authoritativeElement?: Element }): EnemyElementState {
  if (run.status !== 'active' || run.enemies.some(enemy => enemy.id === id)) throw new Error('Invalid enemy spawn.');
  const enemy = spawnEnemyElement(id, definition, options); run.enemies.push(enemy); return enemy;
}

export function fireRunProjectile(run: RunState, id: string, origin: Point, direction: Point, settings: { speed: number; radius: number; range: number; chargeRatio?: number; isFullCharge?: boolean }): Projectile {
  const mage=activeMage(run);
  if (mage.resources.currentHp<=0 || mage.waterSkills.ultimate || run.projectiles.some(p=>p.id===id)) throw new Error('Invalid projectile spawn.');
  const projectile=createProjectile(id,mage.id,origin,direction,{...settings,radius:settings.radius*(mage.waterSkills.encounterBuff?.cannonSize??1)});
  const attack=createWaterCannonAttack(mage,projectile.chargeRatio??0);
  run.waterCannonAttacks.set(id,attack);
  run.projectiles.push(projectile);return projectile;
}
const MIN_CANNON_PUSH_SCALE=.01;
const cannonPushScale=(mage:MageRuntime,body:CombatBody)=>mage.waterSkills.encounterBuff?.cannonPushScale?.[body.rank??'normal']??1;
export function tickRunProjectiles(run: RunState, seconds: number, targets: readonly ProjectileTarget[], random: () => number = Math.random): ProjectileImpact[] {
  nonnegative(seconds,'projectile delta');
  if(run.status!=='active')return [];
  const impacts:ProjectileImpact[]=[];
  const mage=run.character;
  const eligible=targets.filter(target=>!target.actor || (validBody({...target,actor:target.actor}) && mage && actorTargetAllowed(mage,target.actor,'ENEMY')));
  // The mage's own water passes through the water barrier (enemy shots are still stopped by it).
  const obstacles=run.zone.objects.filter(o=>o.resource!=='water-barrier');
  for(const projectile of run.projectiles){
    const cannon=run.waterCannonAttacks.get(projectile.id);
    if(cannon && mage){
      // The pushed crowd travels glued to the cannon. Its heaviest member sets the push power:
      // the cannon slows and spends range faster, so total push = remaining range x scale.
      let remaining=seconds;
      const bodyOf=(id:string)=>run.combatBodies.find(b=>b.id===id);
      const group=new Set([...cannon.hitTargets].filter(id=>{const b=bodyOf(id);return !!b && validBody(b);}));
      const excluded=new Set(cannon.hitTargets);
      const crowd=!!mage.waterSkills.encounterBuff?.cannonPushScale;
      const groupScale=()=>Math.max(MIN_CANNON_PUSH_SCALE,Math.min(1,...[...group].map(id=>{const b=bodyOf(id);return b?cannonPushScale(mage,b):1;})));
      const join=(target:ProjectileTarget,hit:ProjectileImpact & {type:'enemy'})=>{
        hit.damage=resolveWaterCannonHit(mage,cannon,target.actor!,hit.hit,random,run.time);
        if(!hit.damage?.hit)return;
        const body=bodyOf(target.id);if(body && validBody(body))group.add(target.id);
        const swamp=activeWaterSwamp(mage,run.time);
        if(!cannon.sietTriggered && swamp?.roar && bodyIntersectsCircle(target,swamp.position,swamp.radius)){
          cannon.sietTriggered=true;swampDamage(waterContext(run),swamp,swamp.dotDamage+swamp.stackDamage);
          mage.waterSkills.events.push({kind:'swamp-roar',at:run.time,position:{...swamp.position},radius:swamp.radius});
        }
      };
      while(projectile.active && remaining>0){
        const scale=group.size?groupScale():1,baseSpeed=projectile.speed,from={...projectile.position};
        projectile.speed=baseSpeed*scale;projectile.remainingRange*=scale;
        const before=projectile.remainingRange;
        const hit=tickProjectile(projectile,remaining,eligible.filter(t=>!excluded.has(t.id) && (!t.actor || t.actor.resources.currentHp>0)),obstacles);
        remaining=Math.max(0,remaining-(before-projectile.remainingRange)/projectile.speed);
        projectile.remainingRange/=scale;projectile.speed=baseSpeed;
        const travel=Math.hypot(projectile.position.x-from.x,projectile.position.y-from.y);
        if(travel>0)for(const id of group){
          const body=bodyOf(id);if(!body || !validBody(body))continue;
          const footprint=movementBody(body);
          body.position=moveCharacter(body.position,projectile.direction,1,run.zone,{speed:travel,radius:footprint.radius,hitbox:footprint.hitbox});
        }
        if(hit){
          impacts.push(hit);
          if(hit.type==='enemy'){
            excluded.add(hit.hit.targetId);
            const target=eligible.find(t=>t.id===hit.hit.targetId);
            if(target?.actor)join(target,hit);
          }
        }
        // Stage only: enemies bumped by the pushed crowd take the cannon hit and join it.
        if(crowd && travel>0)for(const target of eligible){
          if(excluded.has(target.id) || !target.actor || target.actor.resources.currentHp<=0)continue;
          const bumper=[...group].map(bodyOf).find(b=>b && Math.hypot(b.position.x-target.position.x,b.position.y-target.position.y)<b.radius+target.radius);
          if(!bumper)continue;
          excluded.add(target.id);
          const contact:ProjectileImpact & {type:'enemy'}={type:'enemy',position:{...target.position},direction:{...projectile.direction},chargeRatio:projectile.chargeRatio,
            isFullCharge:projectile.isFullCharge,hit:{kind:'projectile',sourceId:projectile.sourceId,targetId:target.id}};
          join(target,contact);impacts.push(contact);
        }
        if(!hit || hit.type==='obstacle')break;
        projectile.active=projectile.remainingRange>0;
      }
      flushMachRestores(waterContext(run));
      continue;
    }
    const impact=tickProjectile(projectile,seconds,eligible.filter(target=>!target.actor || target.actor.resources.currentHp>0),obstacles);
    if(!impact)continue;
    if(impact.type==='enemy' && mage){
      const target=eligible.find(candidate=>candidate.id===impact.hit.targetId)?.actor;
      const attack=run.waterCannonAttacks.get(projectile.id);
      if(target && attack){impact.damage=resolveWaterCannonHit(mage,attack,target,impact.hit,random,run.time);flushMachRestores(waterContext(run));
        const body=run.combatBodies.find(b=>b.id===target.id),push=(mage.waterSkills.encounterBuff?.cannonPush??0)*(body?cannonPushScale(mage,body):1);
        if(push>0 && impact.damage?.hit && body && validBody(body))body.position=moveCharacter(body.position,impact.direction,1,run.zone,{speed:push,radius:movementBody(body).radius,hitbox:movementBody(body).hitbox});
      }
    }
    impacts.push(impact);
  }
  for(let i=run.projectiles.length-1;i>=0;i--)if(!run.projectiles[i].active){
    run.waterCannonAttacks.delete(run.projectiles[i].id);run.projectiles.splice(i,1);
  }
  return impacts;
}

