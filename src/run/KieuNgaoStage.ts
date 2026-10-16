import type { Point } from '../world/definitions';
import { createKieuNgaoZone, FOREST_FORWARD_CLUES, MOC_LOC_ROOTS, MOC_LOC_SEAL, insideMocLocSeal } from '../world/kieuNgao';
import { archerBaseStats } from '../gameplay/characters/jobs/archer/ArcherRuntime';
import { createResources } from '../gameplay/characters/core/CharacterResources';
import { moveCharacter } from '../gameplay/characters/core/movement';
import { nonnegative } from '../gameplay/core/validation';
import { clearEnemyHazards, createEnemyController, type EnemyAttackSettings } from '../gameplay/enemies/EnemyCombat';
import { resolveDamage } from '../gameplay/combat/Damage';
import { bodyCenter, bodyIntersectsCircle, movementBody } from '../world/bodyGeometry';
import { clearWoodArcher } from '../gameplay/characters/jobs/archer/WoodArcherSkills';
import { archerRunContext, finishArcherRun, prepareArcherTrial, tickArcherRun, type ArcherRun } from './ArcherRun';
import type { ArcherEnemy } from './ArcherEncounter';
import type { ArcherStagePath } from './ArcherStage';

export type KieuNgaoPhase = 'intro' | 'briefing' | 'combat' | 'explore' | 'dialogue' | 'final-shot' | 'reveal' | 'return' | 'ending' | 'lost';
export interface MocLocAttack { kind: 'charge' | 'roots' | 'stomp'; phase: 'windup' | 'active' | 'recover'; from: Point; to: Point;
  startedAt: number; endsAt: number; radius: number; hit: boolean; spots: Point[] }
export interface KieuNgaoStage {
  run: ArcherRun; path: ArcherStagePath; phase: KieuNgaoPhase; mapIndex: number; accumulator: number;
  defeated: number; cluesSeen: number[]; combatWon: boolean; mentorAlive: boolean; sealBroken: boolean;
  revealIndex: number; startedAt: number; wonAt?: number; endedAt?: number; walkSeconds: number;
  boss?: ArcherEnemy; bossAttack?: MocLocAttack; nextBossAt: number; bossCycle: number;
}
export const kieuNgaoCanMove = (s: KieuNgaoStage) => ['combat', 'explore', 'final-shot', 'return'].includes(s.phase);
export const kieuNgaoCanShoot = (s: KieuNgaoStage) => s.phase === 'combat' || s.phase === 'final-shot';
export const kieuNgaoRootsLeft = (s: KieuNgaoStage) => s.run.combatBodies.filter(b => b.id.startsWith('seal-root-') && b.actor.resources.currentHp > 0).length;
export function kieuNgaoInteraction(s: KieuNgaoStage): { point: Point; label: string; near: boolean } | undefined {
  const point = s.phase === 'explore' ? FOREST_FORWARD_CLUES[s.mapIndex] : s.phase === 'return' ? s.run.zone.exit : undefined;
  if (!point) return;
  return { point, label: s.phase === 'return' ? s.mapIndex === 0 ? 'Rút mũi tên cảnh báo' : 'Đi về bìa rừng'
    : ['Xem mũi tên của thầy', 'Nói với thợ săn', 'Quan sát vòng đá'][s.mapIndex], near: Math.hypot(s.run.player.position.x - point.x, s.run.player.position.y - point.y) <= 115 };
}

export function createKieuNgaoStage(run: ArcherRun, path: ArcherStagePath): KieuNgaoStage {
  if (run.status !== 'active' || run.zone.mapId !== 'kieu-ngao-1' || run.combatBodies.length) throw new Error('Fresh Kiêu Ngạo run required.');
  prepareArcherTrial(run, path); run.character.stats.maxHp += 120; run.character.stats.mpRegen = 8;
  run.character.resources.currentHp = run.character.stats.maxHp; run.enemyCombat.enabled = false;
  return { run, path, phase: 'intro', mapIndex: 0, accumulator: 0, defeated: 0, cluesSeen: [], combatWon: false,
    mentorAlive: false, sealBroken: false, revealIndex: 0, startedAt: run.time, walkSeconds: 0, nextBossAt: 0, bossCycle: 0 };
}
function clearCombat(s: KieuNgaoStage) {
  const sap = s.run.character.wood.sap; clearWoodArcher(archerRunContext(s.run)); s.run.character.wood.sap = sap;
  clearEnemyHazards(s.run.enemyCombat); s.run.enemyCombat.controllers = []; s.run.enemyCombat.shots = []; s.run.enemyCombat.events = [];
  s.run.enemyCombat.summons = []; s.run.enemyCombat.playerTrack = undefined; s.run.enemyCombat.enabled = false; s.bossAttack = undefined;
}
function enemy(s: KieuNgaoStage, id: string, artId: string, label: string, point: Point, hp: number, rank: 'normal' | 'elite' | 'boss' = 'normal'): ArcherEnemy {
  const stats = { ...archerBaseStats(), maxHp: hp, maxMp: 0, atk: rank === 'boss' ? 24 : 9 + s.mapIndex * 2,
    def: rank === 'boss' ? 0 : 4, mpRegen: 0, critChance: 0, moveSpeed: 72, attackInterval: 3.2 };
  const body: ArcherEnemy = { id, artId, label, rank, position: { ...point }, radius: rank === 'boss' ? 48 : 22,
    hitbox: rank === 'boss' ? { x: -63, y: -148, width: 126, height: 148 } : { x: -23, y: -45, width: 46, height: 45 },
    slows: [], actor: { id, team: 'enemy', element: 'wood', combatRole: 'melee', stats, resources: createResources(stats) } };
  s.run.combatBodies.push(body); return body;
}
function enterMap(s: KieuNgaoStage, index: number, returning = false) {
  clearCombat(s); s.run.combatBodies = []; s.run.rewarded.clear(); s.run.combatObjectives = [];
  s.run.player.slows = []; s.run.accumulator = 0; s.accumulator = 0; s.boss = undefined;
  s.mapIndex = index; s.run.zone = createKieuNgaoZone(index, returning); s.run.player.position = { ...s.run.zone.spawn };
  s.phase = returning ? 'return' : 'briefing';
  if (!returning) { const a = s.run.character; a.resources.currentHp = Math.min(a.stats.maxHp, a.resources.currentHp + a.stats.maxHp * .3); a.resources.currentMp = a.stats.maxMp; }
}
function beginCombat(s: KieuNgaoStage) {
  s.phase = 'combat'; s.run.enemyCombat.enabled = true;
  if (s.mapIndex === 3) {
    s.boss = enemy(s, 'moc-loc', 'moc-loc', 'Mộc Lộc', { x: MOC_LOC_SEAL.x, y: MOC_LOC_SEAL.y }, 1, 'boss');
    s.boss.targetable = false;
    MOC_LOC_ROOTS.forEach((p, i) => { const b = enemy(s, `seal-root-${i}`, 'seal-root', `Rễ phụ ${i + 1}`, p, 1600, 'elite'); b.radius = 20; b.hitbox = { x: -28, y: -64, width: 56, height: 64 }; });
    s.nextBossAt = s.run.time + 1.5; s.bossCycle = 0; return;
  }
  const kinds = ['flat-fur-rat', 'grasshopper', 'black-caterpillar', 'crop-snail', 'caterpillar'];
  const positions = [{ x: 770, y: 790 }, { x: 1020, y: 620 }, { x: 1300, y: 830 }, { x: 1190, y: 470 }, { x: 680, y: 500 }];
  for (let i = 0; i < 3 + s.mapIndex; i++) {
    const art = kinds[i], ranged = i >= 2, b = enemy(s, `forest-${s.mapIndex}-${i}`, art, ranged ? 'Thú gai nhiễm uế' : 'Thú rừng nhiễm uế', positions[i], 190 + s.mapIndex * 70);
    b.actor.combatRole = ranged ? 'ranged' : 'melee';
    const settings: EnemyAttackSettings = { kind: ranged ? 'ranged' : 'melee', visual: art === 'crop-snail' ? 'resin' : 'thorn',
      detectionRange: 1400, leashRange: 1700, pursuit: 'relentless', attackRange: ranged ? 320 : 120, windup: 1, recovery: .9,
      meleeHitRadius: 26, projectileSpeed: 160, projectileRadius: 5, projectileRange: 500,
      ...(ranged ? { aimLockSeconds: .35, leadShots: true } : { pattern: 'charge' as const, chargeSpeed: 220 }),
    };
    const controller = createEnemyController(b, settings, s.run.time); controller.threat.recoveryMaxHpPerSecond = 0;
    s.run.enemyCombat.controllers.push(controller);
  }
}
export function advanceKieuNgaoStory(s: KieuNgaoStage): boolean {
  if (s.phase === 'intro') { s.startedAt = s.run.time; s.phase = 'briefing'; return true; }
  if (s.phase === 'briefing') { beginCombat(s); return true; }
  if (s.phase === 'dialogue') { enterMap(s, s.mapIndex + 1); return true; }
  if (s.phase === 'reveal') {
    if (s.revealIndex < 3) { s.revealIndex++; if (s.revealIndex === 2) s.mentorAlive = false; }
    else enterMap(s, 2, true);
    return true;
  }
  return false;
}
export function interactKieuNgao(s: KieuNgaoStage): boolean {
  if (!kieuNgaoInteraction(s)?.near) return false;
  if (s.phase === 'explore') { s.cluesSeen.push(s.mapIndex); s.phase = 'dialogue'; }
  else if (s.mapIndex > 0) enterMap(s, s.mapIndex - 1, true);
  else { s.run.player.position = { x: s.run.zone.exit!.x + 20, y: s.run.zone.exit!.y + 18 }; s.phase = 'ending'; s.endedAt = s.run.time; finishArcherRun(s.run); }
  s.accumulator = 0; return true;
}
function damagePlayer(s: KieuNgaoStage, random: () => number) {
  const boss = s.boss!, player = s.run.player;
  const damage = resolveDamage({ source: boss.actor, target: player.actor, element: 'wood', rawDamage: boss.actor.stats.atk,
    canCrit: false, targetPolicy: 'ENEMY', hit: { kind: 'aoe', sourceId: boss.id, targetId: player.id } }, { random, now: s.run.time });
  s.run.enemyCombat.events.push({ kind: 'damage', sourceId: boss.id, targetId: player.id, position: { ...player.position }, incomingSide: { x: boss.position.x - player.position.x, y: boss.position.y - player.position.y }, damage });
}
function tickMocLoc(s: KieuNgaoStage, random: () => number) {
  if (!s.boss || !s.run.enemyCombat.enabled) return;
  const now = s.run.time;
  if (!s.bossAttack && now >= s.nextBossAt) {
    const kind = (['charge', 'roots', 'stomp'] as const)[s.bossCycle++ % 3], from = { ...s.boss.position }, target = { ...s.run.player.position };
    const dx = target.x - from.x, dy = target.y - from.y, length = Math.hypot(dx, dy) || 1, reach = Math.min(320, length);
    const to = kind === 'charge' ? insideMocLocSeal({ x: from.x + dx / length * reach, y: from.y + dy / length * reach }) : bodyCenter(s.run.player);
    s.bossAttack = { kind, phase: 'windup', from, to, startedAt: now, endsAt: now + (kind === 'roots' ? 1.4 : 1.15), radius: kind === 'charge' ? 52 : kind === 'stomp' ? 92 : 48,
      hit: false, spots: kind === 'roots' ? [to, { x: to.x - 100, y: to.y + 18 }, { x: to.x + 100, y: to.y - 18 }] : [to] };
  }
  const a = s.bossAttack; if (!a) return;
  if (a.phase === 'windup' && now >= a.endsAt) { a.phase = 'active'; a.startedAt = now; a.endsAt = now + (a.kind === 'charge' ? .65 : .15); }
  if (a.phase === 'active') {
    if (a.kind === 'charge') { const t = Math.min(1, (now - a.startedAt) / .65); s.boss.position = { x: a.from.x + (a.to.x - a.from.x) * t, y: a.from.y + (a.to.y - a.from.y) * t }; }
    const hits = a.kind === 'charge' ? bodyIntersectsCircle(s.run.player, s.boss.position, a.radius) : a.spots.some(p => bodyIntersectsCircle(s.run.player, p, a.radius));
    if (!a.hit && hits) { damagePlayer(s, random); a.hit = true; }
    if (now >= a.endsAt) { a.phase = 'recover'; a.startedAt = now; a.endsAt = now + 1.1; }
  }
  if (a.phase === 'recover' && now >= a.endsAt) { s.bossAttack = undefined; s.nextBossAt = now + .8; }
}
function checkCombat(s: KieuNgaoStage) {
  if (s.run.character.resources.currentHp <= 0) { s.phase = 'lost'; s.endedAt = s.run.time; clearCombat(s); finishArcherRun(s.run); return; }
  if (s.phase === 'final-shot') {
    if (s.boss!.actor.resources.currentHp <= 0) {
      s.combatWon = true; s.wonAt = s.run.time; s.defeated++; s.mentorAlive = true; s.sealBroken = true;
      clearCombat(s); s.phase = 'reveal'; s.revealIndex = 0;
    } return;
  }
  if (s.mapIndex === 3) {
    if (!kieuNgaoRootsLeft(s)) { s.defeated += 3; clearCombat(s); s.boss!.targetable = true; s.phase = 'final-shot'; }
  } else if (s.run.combatBodies.every(b => b.actor.resources.currentHp <= 0)) {
    s.defeated += s.run.combatBodies.length; clearCombat(s); s.run.combatBodies = []; s.phase = 'explore';
  }
}
/** Director and combat use the same fixed clock. Return journey has movement but no attacks, hazards or rewards. */
export function tickKieuNgaoStage(s: KieuNgaoStage, seconds: number, input: { direction?: Point; aim?: Point; firing?: boolean } = {}, random = Math.random): void {
  nonnegative(seconds, 'Kiêu Ngạo delta'); if (!kieuNgaoCanMove(s)) return;
  const step = 1 / 120; s.accumulator += seconds;
  while (s.accumulator + 1e-10 >= step && kieuNgaoCanMove(s)) {
    s.accumulator = Math.max(0, s.accumulator - step);
    if (kieuNgaoCanShoot(s)) {
      const phase = s.phase;
      tickArcherRun(s.run, step, input, random); if (s.phase === 'combat') tickMocLoc(s, random); checkCombat(s);
      // Crossing a story boundary releases the old held shot; the last arrow needs fresh player input.
      if (s.phase !== phase) { s.accumulator = 0; break; }
    } else {
      s.run.time += step; s.walkSeconds += s.phase === 'return' ? step : 0;
      const body = movementBody(s.run.player); s.run.player.position = moveCharacter(s.run.player.position, input.direction ?? { x: 0, y: 0 }, step, s.run.zone,
        { speed: s.run.character.stats.moveSpeed, radius: body.radius, hitbox: body.hitbox });
    }
  }
  if (!kieuNgaoCanMove(s)) s.accumulator = 0;
}
/** Explicit QA shortcut. Normal play still requires actual hits, proximity interactions and the final arrow. */
export function debugKieuNgao(s: KieuNgaoStage, action: 'clear' | 'ready' | 'restore') {
  if (action === 'clear' && s.phase === 'combat') { for (const b of s.run.combatBodies) if (b.id !== 'moc-loc') b.actor.resources.currentHp = 0; checkCombat(s); }
  else if (action === 'ready' || action === 'restore') {
    const a = s.run.character; a.resources.currentHp = a.stats.maxHp; a.resources.currentMp = a.stats.maxMp;
    if (action === 'ready') { a.wood.sap = 6; for (const key of ['q', 'e', 'r', 'ultimate'] as const) a.wood.cooldowns[key] = s.run.time; }
  }
}
