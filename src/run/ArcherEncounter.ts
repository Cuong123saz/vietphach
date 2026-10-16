import { createResources } from '../gameplay/characters/core/CharacterResources';
import { archerBaseStats } from '../gameplay/characters/jobs/archer/ArcherRuntime';
import { createEnemyController, clearEnemyHazards } from '../gameplay/enemies/EnemyCombat';
import { spawnEnemyElement } from '../gameplay/enemies/EnemyElement';
import type { CombatBody } from '../gameplay/combat/CombatBody';
import { MONSTER_AI_TUNING } from '../config/balance/enemyPreview';
import { WOOD_ARCHER_BALANCE as B } from '../config/balance/woodArcher';
import type { ArcherRun } from './ArcherRun';

export interface ArcherEnemy extends CombatBody {artId:string;label:string}
const types=[['flat-fur-rat','Chuột lông bết','melee'],['crop-snail','Ốc sên hại mùa','ranged'],
  ['caterpillar','Sâu róm','ranged'],['grasshopper','Châu chấu','melee'],
  ['black-caterpillar','Sâu róm đen','ranged'],['mutant-caterpillar','Sâu róm đột biến','ranged']] as const;
/** Explicit prototype encounter tuning. A trial dummy never awards experience. */
export function spawnArcherEncounter(run:ArcherRun,trial:boolean,wave=1,random=Math.random):ArcherEnemy[]{
  clearEnemyHazards(run.enemyCombat);run.enemyCombat.controllers=[];run.enemyCombat.shots=[];run.enemyCombat.events=[];
  run.rewarded.clear();
  const origin=run.player.position;
  const enemies:ArcherEnemy[]=trial?[{
    id:'wood-trial-boss',artId:'boss-spiked-shell-beast',label:'Bia Boss',rank:'boss',radius:38,
    position:{x:origin.x+220,y:origin.y-35},actor:{id:'wood-trial-boss',team:'enemy',element:'wood',combatRole:'melee',
      stats:{...archerBaseStats(),maxHp:B.trial.bossHp,maxMp:0,def:B.trial.bossDef,atk:0,mpRegen:0,critChance:0},
      resources:{currentHp:B.trial.bossHp,currentMp:0,additional:{}}},slows:[],
  }]:types.slice(0,B.encounter.maxEnemies).map(([artId,label,kind],i)=>{
    const id=`archer-enemy-${wave}-${i}`,stats={...archerBaseStats(),maxHp:B.encounter.hp+(wave-1)*B.encounter.hpPerWave,
      maxMp:0,atk:B.encounter.atk+(wave-1)*B.encounter.atkPerWave,def:0,mpRegen:0,critChance:0,
      moveSpeed:B.encounter.speed,attackInterval:B.encounter.interval};
    return {id,artId,label,rank:'normal',position:{x:origin.x+(i%3-1)*110,y:origin.y-190-Math.floor(i/3)*100},radius:22,slows:[],
      actor:{id,team:'enemy',element:spawnEnemyElement(id,{rank:'normal'},{random}).element,combatRole:kind,stats,resources:createResources(stats)}};
  });
  run.combatBodies=enemies;run.enemyCombat.enabled=!trial;
  if(!trial)for(const body of enemies){const kind=body.actor.combatRole as 'melee'|'ranged';
    run.enemyCombat.controllers.push(createEnemyController(body,{...MONSTER_AI_TUNING,kind,visual:body.artId==='crop-snail'?'slime':'thorn',
      attackRange:kind==='melee'?MONSTER_AI_TUNING.meleeRange:MONSTER_AI_TUNING.rangedRange},run.time));}
  return enemies;
}
