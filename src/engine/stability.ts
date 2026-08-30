import type { CombatPosture, MechanicsConfig } from '../types';

export function resolvePosture(
  accumulatedStability: number,
  mechanics: MechanicsConfig
): CombatPosture {
  const { flinch, interrupt, stagger, knockdown } = mechanics.stabilityThresholds;
  if (accumulatedStability >= knockdown) {
    return 'downed';
  }
  if (accumulatedStability >= stagger) {
    return 'staggered';
  }
  if (accumulatedStability >= interrupt) {
    return 'interrupted';
  }
  if (accumulatedStability > flinch) {
    return 'flinched';
  }
  return 'standing';
}

export function isControlPosture(posture: CombatPosture): boolean {
  return posture === 'interrupted' || posture === 'staggered' || posture === 'downed';
}
