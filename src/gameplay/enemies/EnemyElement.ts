import { randomElement, validateElement, type Element } from '../combat/Element';
export type EnemyDefinition = { rank: 'normal' | 'elite' } | { rank: 'boss'; element: Element };
export interface EnemyElementState { id: string; rank: EnemyDefinition['rank']; element: Element }
export function spawnEnemyElement(id: string, definition: EnemyDefinition, options: { random: () => number; authoritativeElement?: Element }): EnemyElementState {
  if (!id.trim()) throw new Error('Enemy ID required.');
  if (!['normal', 'elite', 'boss'].includes(definition.rank)) throw new Error('Invalid enemy rank.');
  const supplied = options.authoritativeElement;
  const element = definition.rank === 'boss' ? validateElement(definition.element)
    : supplied !== undefined ? validateElement(supplied) : randomElement(options.random);
  if (definition.rank === 'boss' && supplied !== undefined && supplied !== element) throw new Error('Boss element must match definition.');
  return { id, rank: definition.rank, element };
}
