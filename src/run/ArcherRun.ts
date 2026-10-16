import { MAPS, type Point, type Zone } from '../world/definitions';
import { parseStage } from '../world/parseStage';
import { moveCharacter } from '../gameplay/characters/core/movement';
import { regenerateMp } from '../gameplay/characters/core/CharacterResources';
import { createArcher, grantArcherExperience, allocateArcherPotential, chooseArcherEvolution, type ArcherRuntime } from '../gameplay/characters/jobs/archer/ArcherRuntime';
import { tickWoodArcher, clearWoodArcher, castArcherBasic, type WoodArcherContext } from '../gameplay/characters/jobs/archer/WoodArcherSkills';
import { validBody, bodyMoveMultiplier, type CombatBody, type ViewBounds } from '../gameplay/combat/CombatBody';
import { createEnemyCombat, tickEnemyCombat, clearEnemyHazards, type EnemyCombatRuntime } from '../gameplay/enemies/EnemyCombat';
import { movementBody } from '../world/bodyGeometry';
import { nonnegative } from '../gameplay/core/validation';
import type { CombatObjective } from '../gameplay/combat/CombatObjective';
import { WOOD_ARCHER_BALANCE as B } from '../config/balance/woodArcher';
/** Job adapter: shared stats, resources, movement, collision, damage, EXP and AI stay in Core. */
export interface ArcherRun {
  id:string;zone:Zone;character:ArcherRuntime;player:CombatBody;combatBodies:CombatBody[];
  enemyCombat:EnemyCombatRuntime;time:number;accumulator:number;status:'active'|'finished';rewarded:Set<string>;
  combatObjectives:CombatObjective[];
}
export function createArcherRun(id:string,zone:Zone):ArcherRun {
  const clean=parseStage({version:1,id:`archer:${id}`,name:'Cung Thủ',zones:[zone]}).zones[0],character=createArcher(`${id}:player`,'player');
  return {id,zone:clean,character,player:{id:character.id,actor:character,position:{...clean.spawn},radius:12,
    hitbox:{x:-14,y:-68,width:28,height:68},slows:[]},combatBodies:[],combatObjectives:[],enemyCombat:createEnemyCombat(),time:0,accumulator:0,status:'active',rewarded:new Set()};
}
export function archerRunContext(run:ArcherRun,view:ViewBounds={x:0,y:0,width:MAPS[run.zone.mapId].width,height:MAPS[run.zone.mapId].height},random= Math.random):WoodArcherContext {
  return {archer:run.character,position:run.player.position,bodies:run.combatBodies,zone:run.zone,view,now:run.time,random};
}
const STEP=1/120;
export function tickArcherRun(run:ArcherRun,seconds:number,input:{direction?:Point;aim?:Point;firing?:boolean}={},random=Math.random):void {
  nonnegative(seconds,'archer delta');if(run.status!=='active')return;
  run.accumulator+=seconds;
  while(run.accumulator+1e-10>=STEP){
    run.accumulator=Math.max(0,run.accumulator-STEP);run.time+=STEP;
    const a=run.character,s=a.wood,ctx=archerRunContext(run,undefined,random);
    if(a.resources.currentHp>0){
      const dash=s.dash&&s.dash.endsAt>=run.time-1e-9?s.dash:undefined;
      if(s.dash&&!dash)s.dash=undefined;
      const direction=dash?.direction??input.direction??{x:0,y:0};
      const pending=s.scheduled.find(p=>p.kind==='arrow');
      let multiplier=1;
      if(s.busyUntil>run.time)multiplier=s.ultimate&&run.time<s.ultimate.castEndsAt ? .5
        : pending?.kind==='arrow'&&pending.skill==='q' ? .7 : .8;
      const body=movementBody(run.player);
      run.player.position=moveCharacter(run.player.position,direction,STEP,run.zone,{speed:(dash?B.e.dashDistance/B.e.dashSeconds:a.stats.moveSpeed*multiplier)*bodyMoveMultiplier(run.player,run.time),
        radius:body.radius,hitbox:body.hitbox,blockingBodies:run.combatBodies.filter(validBody).map(movementBody)});
      ctx.position=run.player.position;
      if(input.firing&&input.aim)castArcherBasic(ctx,input.aim);
    }
    tickWoodArcher(ctx);if(a.resources.currentHp>0)regenerateMp(a,STEP);
    tickEnemyCombat(run.enemyCombat,{now:run.time,zone:run.zone,bodies:run.combatBodies,player:run.player,objectives:run.combatObjectives,random},STEP);
    if(a.resources.currentHp<=0)clearWoodArcher(ctx);
    for(const body of run.combatBodies)if(body.actor.resources.currentHp<=0&&!run.rewarded.has(body.id)){
      run.rewarded.add(body.id);if(body.id.startsWith('archer-enemy-'))grantArcherExperience(a,body.rank==='boss'?B.encounter.bossExperience:B.encounter.experience);
    }
  }
}
export function finishArcherRun(run:ArcherRun):void {
  if(run.status==='finished')return;
  run.status='finished';clearWoodArcher(archerRunContext(run));run.character.wood.events=[];
  clearEnemyHazards(run.enemyCombat);run.enemyCombat.controllers=[];run.enemyCombat.shots=[];run.enemyCombat.events=[];
}
/** Explicit Dev reset, never a normal revive or permanent-state mutation. */
export function prepareArcherTrial(run:ArcherRun,path:'a1'|'b1'):void {
  clearWoodArcher(archerRunContext(run));
  const next=createArcher(run.character.id,run.character.team);grantArcherExperience(next,B.trial.experience);
  const potential=path==='a1'?B.trial.huntPotential:B.trial.grovePotential;
  for(const [key,amount] of Object.entries(potential))allocateArcherPotential(next,key as Parameters<typeof allocateArcherPotential>[1],amount);
  chooseArcherEvolution(next,5,path==='a1'?'wood-hunt':'wood-grove');
  for(const level of [7,9,11,13,15] as const)chooseArcherEvolution(next,level,`wood-${path}-${level}`);
  next.wood.sap=6;next.wood.lastAt=run.time;Object.assign(run.character,next);run.player.slows=[];
}
