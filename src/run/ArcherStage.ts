import type { ArcherRun } from './ArcherRun';
import { prepareArcherTrial, tickArcherRun, archerRunContext, finishArcherRun } from './ArcherRun';
import type { ArcherEnemy } from './ArcherEncounter';
import { archerBaseStats } from '../gameplay/characters/jobs/archer/ArcherRuntime';
import { createResources } from '../gameplay/characters/core/CharacterResources';
import { clearWoodArcher } from '../gameplay/characters/jobs/archer/WoodArcherSkills';
import { clearEnemyHazards, createEnemyController, type EnemyAttackSettings } from '../gameplay/enemies/EnemyCombat';
import type { CombatObjective } from '../gameplay/combat/CombatObjective';
import type { Point } from '../world/definitions';
import { LINH_MOC_HEART, LINH_MOC_LANES } from '../world/linhMoc';
import { ELITE_ENEMIES } from '../config/balance/eliteEnemies';
import { nonnegative } from '../gameplay/core/validation';

export type ArcherStagePath = 'a1' | 'b1';
export type ArcherStagePhase = 'intro' | 'combat' | 'intermission' | 'won' | 'lost';
type Foe = { artId: string; label: string; kind: 'melee' | 'ranged'; hp: number; rank: 'normal' | 'elite' | 'boss' };
const rat = (hp: number): Foe => ({ artId: 'flat-fur-rat', label: 'Chuột phá rễ', kind: 'melee', hp, rank: 'normal' });
const hopper = (hp: number): Foe => ({ artId: 'grasshopper', label: 'Châu Chấu', kind: 'melee', hp, rank: 'normal' });
const snail = (hp: number): Foe => ({ artId: 'crop-snail', label: 'Ốc Sên Độc', kind: 'ranged', hp, rank: 'normal' });
const caterpillar = (hp: number): Foe => ({ artId: 'caterpillar', label: 'Sâu Gai', kind: 'ranged', hp, rank: 'normal' });
export const ARCHER_STAGE_WAVES: readonly { name: string; hint: string; foes: readonly Foe[] }[] = [
  { name: 'Rễ Thức Tỉnh', hint: 'Chặn quái từ hai cổng. Bắn trúng để nuôi Sinh Tức.', foes: [rat(220), rat(220), hopper(220), rat(220), hopper(220), rat(220)] },
  { name: 'Độc Tràn Lối', hint: 'Sâu và ốc bắn từ xa. Lùi bước, đặt hạt ở đường tiến quân.', foes: [snail(280), rat(260), caterpillar(280), hopper(260), snail(280), caterpillar(280), rat(260), hopper(260)] },
  { name: 'Gai Vây Cổ Thụ', hint: 'Quái tinh anh dẫn đàn. A1 chọn đường xuyên; B1 nối hai vườn gai.', foes: [
    { artId: 'elite-flat-fur-rat', label: 'Nanh Xé', kind: 'melee', hp: 900, rank: 'elite' }, rat(320), caterpillar(320), hopper(320),
    { artId: 'elite-crop-snail', label: 'Nhầy Độc', kind: 'ranged', hp: 1100, rank: 'elite' }, rat(320), snail(320), caterpillar(320), hopper(320), rat(320),
  ] },
  { name: 'Kẻ Nuốt Mầm', hint: 'Boss đổi nhịp khi còn nửa máu. Đọc dấu báo đòn, tích Sinh Tức rồi tung đại chiêu.', foes: [
    { artId: 'boss-spiked-shell-beast', label: 'Kẻ Nuốt Mầm', kind: 'ranged', hp: 260000, rank: 'boss' },
  ] },
];
interface PendingFoe { foe: Foe; lane: number; dueAt: number; offset: number }
export interface ArcherStage {
  run: ArcherRun; path: ArcherStagePath; phase: ArcherStagePhase; wave: number; heart: CombatObjective;
  pending: PendingFoe[]; serial: number; spawned: number; defeated: number; waveDefeated: number;
  startedAt: number; endedAt?: number; accumulator: number; enraged: boolean; reason?: 'player' | 'heart';
}

/** Stage blessing is local; the ordinary class and sandbox keep their own balance. */
export function createArcherStage(run: ArcherRun, path: ArcherStagePath): ArcherStage {
  if (run.status !== 'active' || run.zone.mapId !== 'linh-moc' || run.combatBodies.length) throw new Error('Fresh Linh Mộc run required.');
  prepareArcherTrial(run, path);
  run.character.stats.maxHp += 120; run.character.resources.currentHp = run.character.stats.maxHp;
  run.character.stats.mpRegen = 8;
  const stats = { ...archerBaseStats(), maxHp: 900, maxMp: 0, atk: 0, def: 20, mpRegen: 0 };
  const body = { id: 'linh-moc-heart', position: { x: LINH_MOC_HEART.x, y: LINH_MOC_HEART.y }, radius: 0,
    actor: { id: 'linh-moc-heart', team: 'player', combatRole: 'melee' as const, element: 'wood' as const, stats, resources: createResources(stats) } };
  const heart: CombatObjective = { body, obstacleIds: ['linh-moc-heart'] }; run.combatObjectives = [heart];
  run.enemyCombat.enabled = false;
  return { run, path, phase: 'intro', wave: 0, heart, pending: [], serial: 0, spawned: 0, defeated: 0, waveDefeated: 0,
    startedAt: run.time, accumulator: 0, enraged: false };
}

function spawn(stage: ArcherStage, pending: PendingFoe): void {
  const { run } = stage, { foe, lane, offset } = pending, entry = LINH_MOC_LANES[lane];
  const id = `archer-stage-${++stage.serial}`, definition = ELITE_ENEMIES[foe.artId];
  const stats = { ...archerBaseStats(), maxHp: foe.hp, maxMp: 0, mpRegen: 0, def: foe.rank === 'boss' ? 20 : foe.rank === 'elite' ? 8 : 0,
    atk: foe.rank === 'boss' ? 13 : foe.rank === 'elite' ? 10 : 7 + stage.wave, critChance: 0,
    moveSpeed: foe.rank === 'boss' ? 65 : foe.rank === 'elite' ? 72 : 62, attackInterval: foe.rank === 'boss' ? 4.5 : 3.4 };
  const body: ArcherEnemy = { id, artId: foe.artId, label: foe.label, rank: foe.rank,
    position: { x: entry.spawn.x + offset, y: entry.spawn.y + offset * .35 }, radius: foe.rank === 'boss' ? 50 : 22, slows: [],
    actor: { id, team: 'enemy', element: 'earth', combatRole: foe.kind, stats, resources: createResources(stats) } };
  const settings: EnemyAttackSettings = definition ? { ...definition.attack } : { kind: foe.kind, visual: foe.artId === 'crop-snail' ? 'slime' : 'thorn',
    detectionRange: 1200, leashRange: 1500, attackRange: foe.kind === 'melee' ? 52 : 230, windup: .9, recovery: .8,
    meleeHitRadius: 22, projectileSpeed: 220, projectileRadius: 5, projectileRange: 520 };
  Object.assign(settings, { detectionRange: 1200, leashRange: 1500, pursuit: 'relentless', objectiveAggroRange: 130 });
  const controller = createEnemyController(body, settings, run.time);
  // A siege boss must retain damage while the archer defends other lanes or waits for the ultimate.
  if (foe.rank === 'boss') controller.threat.recoveryMaxHpPerSecond = 0;
  controller.approach = { waypoints: entry.approach, index: 0 };
  run.combatBodies.push(body); run.enemyCombat.controllers.push(controller); stage.spawned++;
}

function beginWave(stage: ArcherStage): void {
  const { run } = stage;
  run.combatBodies = []; run.enemyCombat.controllers = []; run.enemyCombat.events = []; run.rewarded.clear();
  stage.phase = 'combat'; stage.waveDefeated = 0; stage.enraged = false; run.enemyCombat.enabled = true;
  const foes = ARCHER_STAGE_WAVES[stage.wave].foes;
  stage.pending = foes.map((foe, i) => ({ foe, lane: stage.wave === 3 ? 1 : Math.floor(i / 2) % (stage.wave === 0 ? 2 : 3),
    dueAt: run.time + 1.8 + Math.floor(i / 2) * 2.2, offset: i % 2 ? 42 : -18 }));
}
export function startArcherStage(stage: ArcherStage): boolean {
  if (stage.phase !== 'intro') return false; stage.startedAt = stage.run.time; beginWave(stage); return true;
}
export function continueArcherStage(stage: ArcherStage): boolean {
  if (stage.phase !== 'intermission' || stage.wave >= 3) return false;
  const a = stage.run.character;
  a.resources.currentHp = Math.min(a.stats.maxHp, a.resources.currentHp + a.stats.maxHp * .3);
  a.resources.currentMp = a.stats.maxMp;
  stage.heart.body.actor.resources.currentHp = Math.min(900, stage.heart.body.actor.resources.currentHp + 135);
  stage.wave++; beginWave(stage); return true;
}
function stopCombat(stage: ArcherStage) {
  const sap = stage.run.character.wood.sap;
  clearWoodArcher(archerRunContext(stage.run)); stage.run.character.wood.sap = sap; clearEnemyHazards(stage.run.enemyCombat);
  stage.run.enemyCombat.enabled = false; stage.run.enemyCombat.events = []; stage.run.enemyCombat.shots = [];
}
function finish(stage: ArcherStage, phase: 'won' | 'lost') {
  stage.phase = phase; stage.endedAt = stage.run.time; stage.pending = [];
  stopCombat(stage); finishArcherRun(stage.run); stage.run.combatBodies = [];
}
function checkStage(stage: ArcherStage) {
  const { run } = stage;
  if (run.character.resources.currentHp <= 0 || stage.heart.body.actor.resources.currentHp <= 0) {
    stage.reason = run.character.resources.currentHp <= 0 ? 'player' : 'heart'; finish(stage, 'lost'); return;
  }
  const dead = run.combatBodies.filter(b => b.actor.resources.currentHp <= 0).length;
  stage.defeated += dead - stage.waveDefeated; stage.waveDefeated = dead;
  const boss = run.combatBodies.find(b => b.rank === 'boss');
  if (stage.wave === 3 && boss && boss.actor.resources.currentHp <= 0) { finish(stage, 'won'); return; }
  if (boss && !stage.enraged && boss.actor.resources.currentHp <= boss.actor.stats.maxHp * .5) {
    stage.enraged = true; boss.actor.stats.atk *= 1.25;
    const controller = run.enemyCombat.controllers.find(c => c.id === boss.id); if (controller) controller.settings.windup *= .8;
    stage.pending.push(...[0, 1, 2, 3].map(i => ({ foe: rat(320), lane: i % 2, dueAt: run.time + 2 + Math.floor(i / 2) * 2, offset: i % 2 * 42 })));
  }
  if (!stage.pending.length && run.combatBodies.length && !run.combatBodies.some(b => b.actor.resources.currentHp > 0)) {
    stopCombat(stage); stage.phase = 'intermission';
  }
}
/** All combat, objective damage and the director advance on the same 120 Hz clock. */
export function tickArcherStage(stage: ArcherStage, seconds: number, input: { direction?: Point; aim?: Point; firing?: boolean } = {}, random = Math.random): void {
  nonnegative(seconds, 'archer stage delta'); if (stage.phase !== 'combat') return;
  const step = 1 / 120; stage.accumulator += seconds;
  while (stage.accumulator + 1e-10 >= step && stage.phase === 'combat') {
    stage.accumulator = Math.max(0, stage.accumulator - step);
    for (const pending of stage.pending.filter(p => p.dueAt <= stage.run.time + step + 1e-9)) spawn(stage, pending);
    stage.pending = stage.pending.filter(p => p.dueAt > stage.run.time + step + 1e-9);
    tickArcherRun(stage.run, step, input, random); checkStage(stage);
  }
  if (stage.phase !== 'combat') stage.accumulator = 0;
}
/** Explicit developer tools, never normal stage rewards or auto-success. */
export function debugArcherStage(stage: ArcherStage, action: 'clear' | 'ready' | 'restore'): void {
  if (stage.phase !== 'combat') return;
  if (action === 'clear') {
    for (const pending of stage.pending) spawn(stage, pending); stage.pending = [];
    for (const body of stage.run.combatBodies) body.actor.resources.currentHp = 0; checkStage(stage);
  } else {
    const a = stage.run.character; a.resources.currentHp = a.stats.maxHp; a.resources.currentMp = a.stats.maxMp;
    stage.heart.body.actor.resources.currentHp = 900;
    if (action === 'ready') { a.wood.sap = 6; for (const key of ['q', 'e', 'r', 'ultimate'] as const) a.wood.cooldowns[key] = stage.run.time; }
  }
}
