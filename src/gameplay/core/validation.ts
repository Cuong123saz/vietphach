export function nonnegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}.`);
  return value;
}
export function integer(value: number, label: string): number {
  nonnegative(value, label);
  if (!Number.isSafeInteger(value)) throw new Error(`Invalid ${label}.`);
  return value;
}
export function probability(value: number): number {
  nonnegative(value, 'probability');
  if (value > 1) throw new Error('Probability exceeds one.');
  return value;
}
export function roll(random: () => number): number {
  const value = probability(random());
  if (value === 1) throw new Error('Random sample must be in [0, 1).');
  return value;
}
export const clamp = (value: number, max: number) => Math.max(0, Math.min(value, max));
