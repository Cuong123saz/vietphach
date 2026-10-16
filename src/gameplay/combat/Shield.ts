import { nonnegative } from '../core/validation';

export interface ShieldLayer {
  readonly id: string;
  readonly sourceId: string;
  readonly skillId: string;
  amount: number;
  readonly expiresAt: number;
}
export interface ShieldTarget { shields?: ShieldLayer[] }

export function expireShields(target: ShieldTarget, now: number): void {
  nonnegative(now, 'shield time');
  if (target.shields) target.shields = target.shields.filter(layer => layer.amount > 0 && layer.expiresAt > now);
}
export function addShield(target: ShieldTarget, layer: ShieldLayer, now: number): boolean {
  nonnegative(layer.amount, 'shield amount'); nonnegative(layer.expiresAt, 'shield expiration');
  if (!layer.id || !layer.sourceId || !layer.skillId) throw new Error('Shield identity required.');
  expireShields(target, now);
  if (layer.amount === 0 || layer.expiresAt <= now) return false;
  const layers = target.shields ??= [];
  if (layers.some(old => old.id === layer.id)) throw new Error('Duplicate shield application.');
  layers.push({ ...layer }); return true;
}
export function totalShield(target: ShieldTarget, now: number): number {
  expireShields(target, now);
  return target.shields?.reduce((sum, layer) => sum + layer.amount, 0) ?? 0;
}
export function absorbShieldDamage(target: ShieldTarget, damage: number, now: number): number {
  nonnegative(damage, 'shield damage'); expireShields(target, now);
  let remaining = damage;
  // Stable sort preserves application order when expirations match.
  for (const layer of [...target.shields ?? []].sort((a,b) => a.expiresAt - b.expiresAt)) {
    const absorbed = Math.min(remaining, layer.amount);
    layer.amount -= absorbed; remaining -= absorbed;
    if (remaining === 0) break;
  }
  expireShields(target, now);
  return damage - remaining;
}
