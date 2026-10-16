import type { CombatBody, ViewBounds } from '../../gameplay/combat/CombatBody';
import { bodyInView } from '../../gameplay/combat/CombatBody';
import type { Element } from '../../gameplay/combat/Element';
import type { EnemyController } from '../../gameplay/enemies/EnemyCombat';
import type { Point } from '../../world/definitions';
import { bodyCenter } from '../../world/bodyGeometry';

export const ELEMENT_PRESENTATION: Record<Element, { name: string; color: string }> = {
  metal: { name: 'Kim', color: '#f4d57c' }, wood: { name: 'Mộc', color: '#95df97' },
  water: { name: 'Thủy', color: '#7fdaff' }, fire: { name: 'Hỏa', color: '#ffaaa0' },
  earth: { name: 'Thổ', color: '#deb899' },
};
export type NamedEnemyBody = CombatBody & { label: string; monsterArtId?: string };
export interface EnemyHudModel {
  id: string; name: string; element: Element; hp: number; maxHp: number; ratio: number;
  role: string; status: string; playerThreat: number; portrait?: string;
}

/** Focus is presentation only; it never chooses a gameplay attack target. */
export function enemyHudTarget(bodies: readonly NamedEnemyBody[], team: string, view: ViewBounds,
  origin: Point, focusId?: string, lastHitId?: string): NamedEnemyBody | undefined {
  const visible = bodies.filter(body => body.id === body.actor.id && body.actor.team !== team
    && body.targetable !== false && bodyInView(body, view));
  return visible.find(body => body.id === focusId) ?? visible.find(body => body.id === lastHitId)
    ?? visible.filter(body => body.actor.resources.currentHp > 0).sort((a, b) => {
      const ac = bodyCenter(a), bc = bodyCenter(b);
      return Math.hypot(ac.x-origin.x, ac.y-origin.y)-Math.hypot(bc.x-origin.x, bc.y-origin.y) || a.id.localeCompare(b.id);
    })[0];
}

/** Read active effects without expiring or mutating combat state. */
export function enemyHudModel(body: NamedEnemyBody, now: number, playerId: string,
  controller?: EnemyController, targetName?: string): EnemyHudModel {
  const maxHp = body.actor.stats.maxHp, hp = Math.max(0, Math.min(maxHp, body.actor.resources.currentHp));
  const status: string[] = [];
  if (hp <= 0) status.push('Đã hạ gục');
  else {
    const phase = controller?.phase;
    status.push(phase === 'windup' ? 'Đang ra đòn' : phase === 'chase' ? 'Đang truy đuổi'
      : phase === 'return' ? 'Đang trở về' : phase === 'recover' ? 'Hồi đòn' : 'Bình thường');
    if (controller?.targetId && targetName) status.push(`Nhắm ${targetName}`);
    if (body.actor.threat?.recovering && (body.actor.threat.recoveryMaxHpPerSecond??1)>0 && hp < maxHp) status.push('Đang hồi máu');
    const slow = Math.min(1, ...(body.slows ?? []).filter(effect => effect.expiresAt > now).map(effect => effect.multiplier));
    if (slow < 1) status.push(`Chậm ${Math.round((1-slow)*100)}%`);
    const shield = (body.actor.shields ?? []).filter(layer => layer.expiresAt > now && layer.amount > 0)
      .reduce((sum, layer) => sum+layer.amount, 0);
    if (shield > 0) status.push(`Khiên ${Math.ceil(shield)}`);
  }
  return { id: body.id, name: body.label, element: body.actor.element, hp, maxHp,
    ratio: maxHp > 0 ? hp/maxHp : 0, role: body.actor.combatRole === 'ranged' ? 'Đánh xa' : 'Cận chiến',
    status: status.join(' · '), playerThreat: body.actor.threat?.points.get(playerId) ?? 0,
    portrait: body.monsterArtId ? `/assets/monsters/${body.monsterArtId}/normal.png` : undefined };
}
