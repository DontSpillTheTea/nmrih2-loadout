import type {
  CombatState,
  CombatActionInput,
  Perk,
  Enemy,
  MechanicsConfig,
  TransitionResult,
  TransitionLogStep,
  CombatPosture
} from '../types';
import { calculateAttackDamage } from './damage';
import { resolvePosture, isControlPosture } from './stability';

export function createInitialCombatState(
  enemy: Enemy,
  mechanics: MechanicsConfig,
  difficulty: string = 'normal'
): CombatState {
  const diffMod = mechanics.difficultyModifiers[difficulty] ?? { enemyHpMultiplier: 1.0 };
  const effectiveHp = Math.round(enemy.baseHp * diffMod.enemyHpMultiplier);

  const limbHp: Record<string, number> = {};
  for (const [k, v] of Object.entries(enemy.limbHp)) {
    if (v !== undefined) {
      limbHp[k] = Math.round(v * diffMod.enemyHpMultiplier);
    }
  }

  return {
    targetHp: effectiveHp,
    maxHp: effectiveHp,
    limbHp,
    posture: 'standing',
    accumulatedStability: 0,
    playerStamina: mechanics.basePlayerStamina,
    elapsedMs: 0,
    isDowned: false,
    isStaminaStarved: false,
    actionCount: 0,
    controlAchievedAtMs: undefined,
    flags: {}
  };
}

export interface TransitionContext {
  perks: Perk[];
  enemy: Enemy;
  mechanics: MechanicsConfig;
}

export function transition(
  state: CombatState,
  action: CombatActionInput,
  context: TransitionContext
): TransitionResult {
  const { weapon, attack, hitZone } = action;
  const { perks, enemy, mechanics } = context;

  // Calculate damage & effects
  const calc = calculateAttackDamage(weapon, attack, hitZone, perks, enemy, state, mechanics);

  const hpBefore = state.targetHp;
  const hpAfter = Math.max(0, Math.round((hpBefore - calc.finalDamage) * 100) / 100);

  // Stability
  const newAccumulatedStability = state.accumulatedStability + calc.stabilityDamage;
  const postureBefore = state.posture;
  const postureAfter: CombatPosture = resolvePosture(newAccumulatedStability, mechanics);
  const nowDowned = postureAfter === 'downed';

  // Stamina
  const staminaBefore = state.playerStamina;
  const staminaAfter = Math.max(0, Math.round((staminaBefore - calc.staminaCost) * 10) / 10);
  const nowStaminaStarved = staminaAfter === 0;

  // Timing
  const actionDurationMs = attack.totalMs;
  const timeElapsedMs = state.elapsedMs + actionDurationMs;

  let controlAchievedAtMs = state.controlAchievedAtMs;
  if (controlAchievedAtMs === undefined && isControlPosture(postureAfter)) {
    controlAchievedAtMs = state.elapsedMs + attack.windupMs;
  }

  const nextState: CombatState = {
    ...state,
    targetHp: hpAfter,
    posture: postureAfter,
    accumulatedStability: newAccumulatedStability,
    playerStamina: staminaAfter,
    elapsedMs: timeElapsedMs,
    isDowned: nowDowned,
    isStaminaStarved: nowStaminaStarved,
    actionCount: state.actionCount + 1,
    controlAchievedAtMs,
    flags: { ...state.flags }
  };

  const log: TransitionLogStep = {
    stepIndex: state.actionCount + 1,
    actionName: attack.name,
    weaponName: weapon.name,
    hitZone,
    baseDamage: calc.baseDamage,
    additiveFlat: calc.additiveFlat,
    multiplicativeBonus: calc.multiplicativeRatio,
    downedMultiplier: calc.downedMultiplier,
    resistanceRatio: calc.resistanceRatio,
    finalDamage: calc.finalDamage,
    stabilityDamageDealt: calc.stabilityDamage,
    postureBefore,
    postureAfter,
    hpBefore,
    hpAfter,
    staminaCost: calc.staminaCost,
    staminaBefore,
    staminaAfter,
    actionDurationMs,
    timeElapsedMs,
    isDownedHit: calc.isDownedHit,
    notes: calc.notes
  };

  return {
    nextState,
    log
  };
}
