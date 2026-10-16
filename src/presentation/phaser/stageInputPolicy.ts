import type { KhangChienPhase } from '../../run/KhangChienStage';

/** Cinematic commands remain available, but other open panels still block input. */
export function stageKeyboardEnabled(blocks:ReadonlySet<string>,phase?:KhangChienPhase):boolean {
  return blocks.size===0 || blocks.size===1 && blocks.has('stage') && (phase==='bomb' || phase==='sacrifice');
}
