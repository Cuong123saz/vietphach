import type { CombatActor } from '../../gameplay/combat/Damage';
import { createResources } from '../../gameplay/characters/core/CharacterResources';
import { mageBaseStats } from '../../gameplay/characters/jobs/mage/MageStats';
import type { Point } from '../../world/definitions';
import type { CombatBody } from '../../gameplay/combat/CombatBody';

// Sandbox-only numbers. These are not enemy definitions or playable ally jobs.
const FIXTURE = Object.freeze({ enemyHp: 10000, allyHp: 120, enemyRadius: 32, allyRadius: 14 });
export interface SandboxDummy extends CombatBody {
  monsterArtId?: string;
  actor: CombatActor;
  label: string;
}

export function createSandboxDummies(origin: Point): SandboxDummy[] {
  const dummy=(id:string,label:string,team:string,x:number,y:number,hp:number,ratio=1):SandboxDummy=>{
    const stats={...mageBaseStats(0),maxHp:hp,maxMp:0,atk:0,def:0,mpRegen:0,critChance:0};
    const resources=createResources(stats);resources.currentHp=hp*ratio;
    return {id,label,position:{x:origin.x+x,y:origin.y+y},radius:team==='enemy'?FIXTURE.enemyRadius:FIXTURE.allyRadius,
      actor:{id,team,element:'water',combatRole:id==='sandbox-ally-b'?'ranged':'melee',stats,resources}};
  };
  return [dummy('sandbox-enemy','Bia tập','enemy',180,-30,FIXTURE.enemyHp),
    dummy('sandbox-ally-a','Đồng đội A','player',-90,-65,FIXTURE.allyHp,.25),
    dummy('sandbox-ally-b','Đồng đội B','player',70,65,FIXTURE.allyHp,.75)];
}
