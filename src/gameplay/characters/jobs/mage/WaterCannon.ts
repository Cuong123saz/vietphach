import { nonnegative } from '../../../core/validation';
import { WATER_CANNON } from '../../../../config/waterCannon';
import { WATER_CANNON_TIMING as T } from '../../../../config/balance/waterCannon';
import type { Point } from '../../../../world/definitions';

export interface WaterCannonState {
  instantFullRecovery?:number;
  phase: 'idle' | 'charging' | 'full_charge' | 'firing' | 'recovery'; progress: number; held: boolean; shots: number; pendingShot: boolean; recoveryRemaining: number;
}
export const createWaterCannon = (): WaterCannonState => ({ phase: 'idle', progress: 0, held: false, shots: 0, pendingShot: false, recoveryRemaining: 0 });
export function fullChargeDuration(attackSpeed: number): number {
  nonnegative(attackSpeed, 'attack speed');
  return Math.max(T.MIN_FULL_CHARGE_DURATION, T.BASE_FULL_CHARGE_DURATION / (1 + attackSpeed / 100));
}
export function pressWaterCannon(state: WaterCannonState): void {
  if (state.phase !== 'idle') return;
  if(state.instantFullRecovery!==undefined){state.held=false;state.phase='firing';state.progress=1;state.pendingShot=true;return;}
  state.held = true; state.phase = 'charging'; state.progress = 0; state.pendingShot = false;
}
export function releaseWaterCannon(state: WaterCannonState): void {
  state.held = false;
  if (state.phase === 'charging' || state.phase === 'full_charge') {
    state.phase = 'firing'; state.pendingShot = true;
  }
}
export function stopWaterCannon(state: WaterCannonState): void {
  if(state.instantFullRecovery!==undefined && state.phase==='recovery' && state.recoveryRemaining>0){state.held=false;state.pendingShot=false;return;}
  state.held = false; state.phase = 'idle'; state.progress = 0; state.pendingShot = false; state.recoveryRemaining = 0;
}
export function chargeMoveMultiplier(state: WaterCannonState): number {
  const progress=Math.max(0,Math.min(1,state.progress));
  return (state.phase === 'charging' || state.phase === 'full_charge')
    ? 1 - WATER_CANNON.chargeMovePenalty * (1 - (1-progress)**3) : 1;
}
export interface WaterShot { direction: Point; chargeRatio: number; isFullCharge: boolean }
// Attack speed controls full charge only. Recovery starts when the shot is emitted.
export function tickWaterCannon(state: WaterCannonState, seconds: number, attackSpeed: number, aim: Point): WaterShot[] {
  nonnegative(seconds, 'attack delta'); const duration = fullChargeDuration(attackSpeed);
  if (!Number.isFinite(aim.x) || !Number.isFinite(aim.y)) throw new Error('Invalid attack input.');
  const length = Math.hypot(aim.x, aim.y);
  if (!Number.isFinite(length) || length === 0) throw new Error('Aim direction required.');
  if (state.phase === 'firing') {
    if (state.pendingShot) {
      state.pendingShot = false; state.shots++;
      state.phase = 'recovery'; state.recoveryRemaining = state.instantFullRecovery??T.ATTACK_RECOVERY;
      return [{ direction: { x: aim.x / length, y: aim.y / length }, chargeRatio: state.progress, isFullCharge: state.progress === 1 }];
    }
    state.phase = 'idle'; state.progress = 0;
  }
  if (state.phase === 'recovery') {
    state.recoveryRemaining = Math.max(0, state.recoveryRemaining - seconds);
    if (state.recoveryRemaining <= Number.EPSILON) { state.phase = 'idle'; state.progress = 0; state.recoveryRemaining = 0; }
    return [];
  }
  if (state.phase === 'charging') {
    state.progress = Math.min(1, state.progress + seconds / duration);
    if (state.progress >= 1 - Number.EPSILON) { state.progress = 1; state.phase = 'full_charge'; }
  }
  return [];
}
