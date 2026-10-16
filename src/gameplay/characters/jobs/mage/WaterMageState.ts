import type { Point } from '../../../../world/definitions';
import type { DamageResult } from '../../../combat/Damage';

export type WaterSkill = 'q' | 'e' | 'r';
export type ExecutionType = 'original' | 'copy';
export interface WaterLink { targetId: string; expiresAt: number }
export interface ShieldGrant { targetId: string; amount: number }
/** Installed by the encounter director; absent in ordinary runs and Sandbox. */
export interface WaterMageEncounterBuff {
  stage:'khang-chien'; mapIndex:number; eRadiusMultiplier:number;
  prisonDuration:number; prisonEruptDelay:number; prisonDragonMpRatio?:number;
  qEmpowerAfter?:number;cannonSize?:number;cannonPush?:number;
  /** Multiplies Water Cannon raw damage in the encounter. */
  cannonDamage?:number;
  /** Casting E while READY (4 Mach) heals the mage by this share of max HP. */
  readyEHealRatio?:number;
  /** Each Q dragon that sets off the E swamp's Siet grants the mage an E shield of this share of max MP. */
  qSietShieldMpRatio?:number;
  /** R: for this many seconds the mage walks through enemies, sheds crowd control and cannot be targeted. */
  rPhaseSeconds?:number; rCooldown?:number;
  /** Knockback multiplier by enemy rank; bodies without a rank count as normal. A pushed group uses its heaviest member's value. */
  cannonPushScale?:{normal:number;elite:number;boss:number};
}
export interface DragonCast {
  id: number; execution: ExecutionType; position: Point; rawDamage: number; impactAt: number; machGranted: boolean;
  radius?: number; chargeMultiplier?: number;
  effectRate?: number;
  prison?:{duration:number;eruptDelay:number;dragonMpRatio?:number};
  flightSeconds?:number; ultimateId?:number; secondary?:boolean;
  humanPayload?:boolean;
}
export interface WaterPrison { cast:DragonCast; bornAt:number; expiresAt:number; erupted:boolean; hitTargetIds?:string[] }
export interface WaterSwamp {
  id: number; position: Point; radius: number; bornAt: number; expiresAt: number; extension: number;
  rawDamage: number; dotDamage: number; stackDamage: number; nextDotAt: number; controlledAt: number;
  execution: ExecutionType; pull: number; slow: number; roar: boolean;
  effectRate?:number;
  ultimateId?:number;
}
export interface WaterUltimate {
  id:number; kind:'descent'|'eight'; position:Point; radius:number; bornAt:number;
  opensAt:number; endsAt:number; impactAt:number; mpSpent:number; atk:number;
  qCount:number; delivered:number; accumulated:number; power:number; resourceRatio:number; execution:ExecutionType;
}
export type EvolutionWaterEffect =
  | {kind:'human-launch';dueAt:number;cast:DragonCast;clusters:boolean}
  | {kind:'human-impact';dueAt:number;cast:DragonCast;clusters:boolean}
  | {kind:'ultimate-open'|'ultimate-end'|'ultimate-impact';dueAt:number;ultimateId:number};
export type ScheduledWaterEffect =
  | EvolutionWaterEffect
  | { kind: 'q-impact'; dueAt: number; cast: DragonCast }
  | { kind: 'copy-q'; dueAt: number; position: Point; rawDamage: number; radius?: number; effectRate?:number; prison?:DragonCast['prison'] }
  | { kind: 'prison-erupt'; dueAt:number; cast:DragonCast }
  | { kind: 'copy-e'; dueAt: number; grants: ShieldGrant[] }
  | { kind: 'copy-swamp'; dueAt: number; swamp: WaterSwamp };
export type WaterEvent =
  | {kind:'ultimate-start'|'ultimate-impact';at:number;ultimate:WaterUltimate}
  | { kind: 'e-support'; at: number; targetId: string; mode: 'link' | 'solo' }
  | { kind: 'q-start'; at: number; cast: DragonCast }
  | { kind: 'prison-erupt'; at:number; cast:DragonCast }
  | { kind: 'damage'; at: number; targetId: string; damage: DamageResult; execution: ExecutionType }
  | { kind: 'shield'; at: number; grants: ShieldGrant[]; execution: ExecutionType }
  | { kind: 'fizzle'; at: number; skill: 'e'; targetId: string }
  | { kind: 'r'; at: number }
  | { kind: 'swamp-roar'; at: number; position: Point; radius: number }
  | { kind: 'swamp-start'; at: number; position: Point; execution: ExecutionType }
  | { kind: 'ready-heal'; at: number; amount: number };
export interface WaterMageState {
  nextCastId: number;
  cooldowns: Record<WaterSkill, number>;
  mirrors: { count: number; expiresAt: number };
  links: WaterLink[];
  soloBuffExpiresAt: number;
  scheduled: ScheduledWaterEffect[];
  events: WaterEvent[];
  swamp?: WaterSwamp;
  copiedSwamps: WaterSwamp[];
  pendingMachRestores: number[];
  encounterBuff?:WaterMageEncounterBuff;
  qCastsSinceEmpower:number;
  /** Stage R: phasing (untargetable, walks through bodies) until this time. */
  phaseUntil?:number;
  prisons:WaterPrison[];
  ultimate?:WaterUltimate; ultimateCooldown?:number;
}
export function createWaterMageState(): WaterMageState {
  return { nextCastId: 0, cooldowns: { q: 0, e: 0, r: 0 }, mirrors: { count: 0, expiresAt: 0 },
    links: [], soloBuffExpiresAt: 0, scheduled: [], events: [], copiedSwamps: [], pendingMachRestores: [], prisons:[],qCastsSinceEmpower:0 };
}
