import { ENEMY_THREAT as T } from '../../config/balance/enemyThreat';
import { heal, type ResourceTarget } from '../characters/core/CharacterResources';
import { nonnegative } from '../core/validation';

export type CombatRole = 'melee' | 'ranged';
/** Each enemy owns this state; points refer to the real attacking actor, never a mirror/VFX. */
export interface ThreatState {
  points: Map<string,number>; lastDamageAt: number; updatedAt: number; recovering: boolean;
  recoveryMaxHpPerSecond?: number;
}
export function createThreatState(now=0):ThreatState {
  nonnegative(now,'threat time');return {points:new Map(),lastDamageAt:now,updatedAt:now,recovering:false};
}
export function clearThreat(state:ThreatState,now:number):void {
  nonnegative(now,'threat time');state.points.clear();state.lastDamageAt=now;state.updatedAt=now;state.recovering=false;
}
/** Integrate the increasing decay rate exactly, including frames crossing the 7s boundary. */
function advance(state:ThreatState,now:number):number {
  nonnegative(now,'threat time');
  const time=Math.max(now,state.updatedAt),start=state.lastDamageAt+T.recoveryDelay;
  const a=Math.max(0,state.updatedAt-start),b=Math.max(0,time-start);
  const loss=T.decayPerSecond*(b-a)+T.decayAcceleration*(b*b-a*a)/2;
  if(loss>0)for(const [id,points] of state.points){
    const next=Math.max(0,points-loss);if(next>1e-8)state.points.set(id,next);else state.points.delete(id);
  }
  state.updatedAt=time;state.recovering=time>=start;
  return b-a;
}
export function recordDamageThreat(state:ThreatState,sourceId:string,role:CombatRole,now:number):void {
  if(!sourceId || !['melee','ranged'].includes(role))throw new Error('Invalid threat source/role.');
  advance(state,now);
  state.points.set(sourceId,(state.points.get(sourceId)??0)+T[role]);
  state.lastDamageAt=state.updatedAt;state.recovering=false;
}
export function tickThreatRecovery(state:ThreatState,target:ResourceTarget,now:number):void {
  const seconds=advance(state,now);
  const rate=state.recoveryMaxHpPerSecond??T.recoveryMaxHpPerSecond;nonnegative(rate,'encounter recovery');
  if(seconds>0 && target.resources.currentHp>0)heal(target,target.stats.maxHp*rate*seconds);
}
