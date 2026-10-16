import type { Point } from '../../../../world/definitions';
import type { Projectile } from '../../../combat/Projectile';
import type { DamageResult } from '../../../combat/Damage';
export type WoodSkill='basic'|'q'|'e'|'r'|'ultimate';
export interface WoodArrow {
  id:number;castId:number;projectile:Projectile;origin:Point;bornAt:number;lastAt:number;
  skill:'basic'|'q'|'ultimate'|'secondary';atk:number;multiplier:number;damage:number;
  fractions:readonly number[];hits:Set<string>;original:boolean;markTarget?:string;markBonus?:number;harvested?:boolean;
}
export interface WoodField {
  id:number;kind:'seed'|'garden'|'path';position:Point;end?:Point;radius:number;
  plantedAt:number;bornAt:number;armsAt:number;expiresAt:number;atk:number;projectile?:Projectile;
}
export interface WoodUltimate {
  id:number;kind:'hunt'|'grove';origin:Point;position:Point;direction:Point;
  bornAt:number;opensAt:number;castEndsAt:number;endsAt:number;atk:number;radius:number;harvested:number;markTarget?:string;
}
export type WoodScheduled=
  |{kind:'arrow';dueAt:number;castId:number;origin:Point;direction:Point;skill:WoodArrow['skill'];atk:number;multiplier:number;damage:number;fractions:readonly number[];range:number;speed:number;radius:number;original:boolean;markTarget?:string;markBonus?:number}
  |{kind:'volley';dueAt:number;ultimateId:number};
export type WoodEvent=
  |{kind:'cast';at:number;skill:WoodSkill;position:Point;direction?:Point}
  |{kind:'launch';at:number;arrow:WoodArrow}
  |{kind:'impact';at:number;position:Point;type:'arrow'|'bloom'|'harvest'|'volley'|'ultimate-end';radius:number;ultimate?:boolean}
  |{kind:'damage';at:number;targetId:string;position:Point;skill:WoodArrow['skill']|'e'|'dot'|'harvest'|'volley';damage:DamageResult};
export interface WoodArcherState {
  sap:number;nextId:number;nextBasicAt:number;busyUntil:number;lastAt:number;
  cooldowns:{q:number;e:number;r:number;ultimate:number};
  r:{charges:number;expiresAt:number};mark?:{targetId:string;expiresAt:number};
  dash?:{direction:Point;endsAt:number};rootUntil:Record<string,number>;
  arrows:WoodArrow[];fields:WoodField[];scheduled:WoodScheduled[];events:WoodEvent[];
  gained:Set<number>;nextDotAt?:number;ultimate?:WoodUltimate;
}
export function createWoodArcherState():WoodArcherState {
  return {sap:0,nextId:0,nextBasicAt:0,busyUntil:0,lastAt:0,
    cooldowns:{q:0,e:0,r:0,ultimate:0},r:{charges:0,expiresAt:0},rootUntil:{},
    arrows:[],fields:[],scheduled:[],events:[],gained:new Set()};
}
