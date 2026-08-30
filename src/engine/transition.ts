import type {
  CombatState,
  CombatActionInput,
  Perk,
  Enemy,
  MechanicsConfig,
  TransitionResult,
  TransitionLogStep,
  CombatPosture,
  PlayerInput,
  ArmorLayer
} from '../types';
import { calculateAttackDamage } from './damage';
import { resolvePosture, isControlPosture } from './stability';
import { resolvePlayerInput } from './combo';

export function createInitialCombatState(
  enemy: Enemy,
  mechanics: MechanicsConfig,
  difficulty: string = 'normal',
  isPreCharged: boolean = false
): CombatState {
  const diffMod = mechanics.difficultyModifiers[difficulty] ?? { enemyHpMultiplier: 1.0 };
  const effectiveHp = Math.round(enemy.baseHp * diffMod.enemyHpMultiplier);

  const limbHp: Record<string, number> = {};
  for (const [k, v] of Object.entries(enemy.limbHp)) {
    if (v !== undefined) {
      limbHp[k] = Math.round(v * diffMod.enemyHpMultiplier);
    }
  }

  const armorLayers: ArmorLayer[] = (enemy.armor || []).map(a => ({
    name: a.name,
    hitZone: a.hitZone,
    hp: a.hp ?? 80,
    maxHp: a.maxHp ?? a.hp ?? 80,
    penetrationThreshold: a.penetrationThreshold ?? (a.name.toLowerCase().includes('ng') ? 3 : 2),
    damageAbsorptionRatio: a.damageResistance ?? (a.hp ? 1.0 : 0.5),
    broken: false
  }));

  return {
    targetHp: effectiveHp,
    maxHp: effectiveHp,
    limbHp,
    armorLayers,
    posture: 'standing',
    accumulatedStability: 0,
    playerStamina: mechanics.basePlayerStamina,
    elapsedMs: 0,
    preparationMs: isPreCharged ? 1200 : 0,
    threatExposureMs: 0,
    isDowned: false,
    isStaminaStarved: false,
    actionCount: 0,
    controlAchievedAtMs: undefined,
    lastMeleeSide: null,
    lastAttackType: isPreCharged ? 'charged' : null,
    flags: {}
  };
}

export interface TransitionContext {
  perks: Perk[];
  enemy: Enemy;
  mechanics: MechanicsConfig;
  preChargedOpener?: boolean;
}

export function transition(
  state: CombatState,
  action: CombatActionInput | any,
  context: TransitionContext
): TransitionResult {
  const { weapon, hitZone } = action;
  let input: PlayerInput = action.input;

  // Fallback for direct attack objects or legacy test inputs
  if (!input) {
    const atk = action.resolvedAttack || action.attack;
    if (atk?.id === 'kick') {
      input = { kind: 'kick' };
    } else if (atk?.id === 'shove') {
      input = { kind: 'shove' };
    } else if (atk?.id === 'charged' || atk?.attackType === 'charged') {
      input = { kind: 'hold', side: 'left', hitZone };
    } else if (atk?.id === 'strong' || atk?.attackType === 'strong') {
      input = { kind: 'tap', side: state.lastMeleeSide || 'left', hitZone };
    } else {
      input = { kind: 'tap', side: 'left', hitZone };
    }
  }

  const { perks, enemy, mechanics, preChargedOpener } = context;

  // Resolve player input to deterministic attack profile based on combo state
  const resolution = resolvePlayerInput(weapon, input, state);
  const resolvingWeapon = resolution.resolvingWeapon;
  const resolvedAttack = resolution.resolvedAttack;

  // Calculate damage & effects with layered armor
  const calc = calculateAttackDamage(resolvingWeapon, resolvedAttack, hitZone, perks, enemy, state, mechanics);

  const hpBefore = state.targetHp;
  const hpAfter = Math.max(0, Math.round((hpBefore - calc.finalDamage) * 100) / 100);

  // Update Armor Layers
  const updatedArmorLayers = state.armorLayers.map(layer => {
    if (layer.hitZone === hitZone && !layer.broken) {
      return {
        ...layer,
        hp: calc.armorHpAfter,
        broken: calc.armorBrokenNow || calc.armorHpAfter <= 0
      };
    }
    return layer;
  });

  // Stability
  const newAccumulatedStability = state.accumulatedStability + calc.stabilityDamage;
  const postureBefore = state.posture;
  const postureAfter: CombatPosture = resolvePosture(newAccumulatedStability, mechanics);
  const nowDowned = postureAfter === 'downed';

  // Stamina
  const staminaBefore = state.playerStamina;
  const staminaAfter = Math.max(0, Math.round((staminaBefore - calc.staminaCost) * 10) / 10);
  const nowStaminaStarved = staminaAfter === 0;

  // Timing: Handle Pre-Charge Opener vs Standard Windup
  const isFirstAction = state.actionCount === 0;
  const isPreChargedFirstHit = isFirstAction && preChargedOpener && (input.kind === 'hold' || resolvedAttack.attackType === 'charged');

  let actionStartupMs = resolvedAttack.windupMs;
  let prepDeltaMs = 0;

  if (isPreChargedFirstHit) {
    prepDeltaMs = resolvedAttack.windupMs; // Windup happened during approach outside threat range
    actionStartupMs = 0; // Release directly into active hit window
  }

  const impactDurationMs = actionStartupMs + resolvedAttack.activeMs;
  const recoveryDurationMs = resolvedAttack.recoveryMs;
  const actionDurationMs = impactDurationMs + recoveryDurationMs;

  const impactElapsedMs = state.elapsedMs + impactDurationMs;
  const readyElapsedMs = state.elapsedMs + actionDurationMs;
  const newThreatExposureMs = state.threatExposureMs + impactDurationMs;
  const newPreparationMs = state.preparationMs + prepDeltaMs;

  let controlAchievedAtMs = state.controlAchievedAtMs;
  if (controlAchievedAtMs === undefined && isControlPosture(postureAfter)) {
    controlAchievedAtMs = state.elapsedMs + actionStartupMs;
  }

  const nextState: CombatState = {
    ...state,
    targetHp: hpAfter,
    armorLayers: updatedArmorLayers,
    posture: postureAfter,
    accumulatedStability: newAccumulatedStability,
    playerStamina: staminaAfter,
    elapsedMs: readyElapsedMs,
    preparationMs: newPreparationMs,
    threatExposureMs: newThreatExposureMs,
    isDowned: nowDowned,
    isStaminaStarved: nowStaminaStarved,
    actionCount: state.actionCount + 1,
    controlAchievedAtMs,
    lastMeleeSide: resolution.nextMeleeSide,
    lastAttackType: resolution.nextAttackType,
    flags: { ...state.flags }
  };

  const log: TransitionLogStep = {
    stepIndex: state.actionCount + 1,
    inputDescription: resolution.inputDescription,
    resolvedActionName: resolvedAttack.name,
    weaponName: resolvingWeapon.name,
    hitZone,
    baseDamage: calc.baseDamage,
    additiveFlat: calc.additiveFlat,
    multiplicativeBonus: calc.multiplicativeRatio,
    downedMultiplier: calc.downedMultiplier,
    resistanceRatio: calc.resistanceRatio,
    armorDamage: calc.armorDamage,
    armorHpAfter: calc.armorHpAfter,
    armorBrokenNow: calc.armorBrokenNow,
    penetratedArmor: calc.penetratedArmor,
    finalDamage: calc.finalDamage,
    stabilityDamageDealt: calc.stabilityDamage,
    postureBefore,
    postureAfter,
    hpBefore,
    hpAfter,
    staminaCost: calc.staminaCost,
    staminaBefore,
    staminaAfter,
    impactDurationMs,
    recoveryDurationMs,
    actionDurationMs,
    impactElapsedMs,
    readyElapsedMs,
    isDownedHit: calc.isDownedHit,
    notes: calc.notes
  };

  return {
    nextState,
    log
  };
}
