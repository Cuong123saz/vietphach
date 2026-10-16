import { ELEMENT_BALANCE } from '../../config/balance/core';
import { roll } from '../core/validation';

export const ELEMENTS = ['metal', 'wood', 'water', 'fire', 'earth'] as const;
export type Element = typeof ELEMENTS[number];
export type ElementRelation = 'same' | 'generates' | 'generatedBy' | 'overcomes' | 'overcomeBy' | 'unrelated';
const overcomes: Record<Element, Element> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
const generates: Record<Element, Element> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
export function validateElement(element: Element): Element {
  if (!ELEMENTS.includes(element)) throw new Error('Invalid element.');
  return element;
}
export function elementRelation(source: Element, target: Element): ElementRelation {
  validateElement(source); validateElement(target);
  if (source === target) return 'same';
  if (overcomes[source] === target) return 'overcomes';
  if (overcomes[target] === source) return 'overcomeBy';
  if (generates[source] === target) return 'generates';
  if (generates[target] === source) return 'generatedBy';
  return 'unrelated';
}
export function elementMultiplier(relation: ElementRelation): number {
  return relation === 'overcomes' ? ELEMENT_BALANCE.advantage
    : relation === 'overcomeBy' ? ELEMENT_BALANCE.disadvantage : ELEMENT_BALANCE.normal;
}
export const randomElement = (random: () => number): Element => ELEMENTS[Math.floor(roll(random) * ELEMENTS.length)];
