import { EVOLUTION_LEVELS } from '../../config/balance/core';
import type { RunProgression } from './Level';

export type EvolutionLevel = typeof EVOLUTION_LEVELS[number];
export interface EvolutionOption {
  id: string; title: string;
  description?:string;
  /** A planned option cannot be selected before its gameplay exists. */
  implemented: boolean;
  /** Product lock is independent of whether the effect has been implemented. */
  locked?: boolean;
  requires?: Readonly<Record<string, string>>;
}
export interface EvolutionMilestone { level: EvolutionLevel; title: string; options: readonly EvolutionOption[] }

export function evolutionProgress(state: RunProgression, milestones: readonly EvolutionMilestone[]) {
  return milestones.map((milestone, index) => {
    const choice = state.evolutionChoices[String(milestone.level)];
    const priorComplete = milestones.slice(0, index).every(m => !!state.evolutionChoices[String(m.level)]);
    const options = milestone.options.filter(o => !o.locked && Object.entries(o.requires ?? {}).every(([level, id]) => state.evolutionChoices[level] === id));
    const status = choice ? 'selected' : state.level < milestone.level ? 'locked' : !priorComplete ? 'waiting'
      : options.some(o => o.implemented) ? 'ready' : 'planned';
    return { ...milestone, choice, options, status };
  });
}

/** Validates first; never mutates the current run on failure. No implicit stat/skill effect. */
export function chooseEvolution(state: RunProgression, milestones: readonly EvolutionMilestone[], level: EvolutionLevel, id: string): RunProgression {
  const milestone = evolutionProgress(state, milestones).find(m => m.level === level);
  if (milestone?.status !== 'ready' || !milestone.options.some(o => o.id === id && o.implemented)) {
    throw new Error('Evolution choice is locked, planned, incompatible or already selected.');
  }
  return { ...state, evolutionChoices: { ...state.evolutionChoices, [String(level)]: id } };
}
