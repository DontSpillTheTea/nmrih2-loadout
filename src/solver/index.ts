import type {
  Weapon,
  Perk,
  Enemy,
  MechanicsConfig,
  CombatActionInput,
  OptimizerConstraints,
  OptimizerObjective,
  CombatRecipe,
  CombatState,
  TransitionLogStep,
  HitZone,
  PlayerInput
} from '../types';
import { createInitialCombatState, transition } from '../engine/transition';
import { resolvePlayerInput } from '../engine/combo';
import { isControlPosture } from '../engine/stability';
import { calculateAttackDamage } from '../engine/damage';
import { getUniversalUnarmed } from '../data/loader';

export interface SolverOptions {
  weapon: Weapon;
  perks: Perk[];
  enemy: Enemy;
  mechanics: MechanicsConfig;
  constraints: OptimizerConstraints;
  objective: OptimizerObjective;
  maxActions?: number;
}

interface SearchNode {
  state: CombatState;
  actions: CombatActionInput[];
  logs: TransitionLogStep[];
  totalStaminaSpent: number;
  totalAmmoSpent: number;
  timeToFirstControlMs: number | null;
  firstControlActionIndex: number | null;
  downedMultiplierUsed: boolean;
  armorBroken: boolean;
}

export function getUsefulLegalActions(
  weapon: Weapon,
  state: CombatState,
  perks: Perk[],
  enemy: Enemy,
  mechanics: MechanicsConfig,
  constraints: OptimizerConstraints
): Array<{ input: PlayerInput; hitZone: HitZone }> {
  const actions: Array<{ input: PlayerInput; hitZone: HitZone }> = [];

  // Hit Zones
  const hitZones: HitZone[] = [];
  if (constraints.targetHitZone === 'head') {
    hitZones.push('head');
  } else if (constraints.targetHitZone === 'body') {
    hitZones.push('body');
  } else if (constraints.targetHitZone === 'limb') {
    hitZones.push('limb');
  } else {
    hitZones.push('head', 'body');
    if (constraints.allowLimb) {
      hitZones.push('limb');
    }
  }

  // 1. Primary Weapon Damaging Actions
  if (weapon.category === 'firearm') {
    for (const hz of hitZones) {
      actions.push({
        input: { kind: 'firearm_shot', hitZone: hz },
        hitZone: hz
      });
    }
  } else {
    // Melee directional inputs
    for (const hz of hitZones) {
      actions.push({ input: { kind: 'tap', side: 'left', hitZone: hz }, hitZone: hz });
      actions.push({ input: { kind: 'tap', side: 'right', hitZone: hz }, hitZone: hz });
      if (constraints.allowCharged) {
        actions.push({ input: { kind: 'hold', side: 'right', hitZone: hz }, hitZone: hz });
        actions.push({ input: { kind: 'hold', side: 'left', hitZone: hz }, hitZone: hz });
      }
    }
  }

  const unarmed = getUniversalUnarmed();
  const shoveAttack = unarmed.attacks.find(a => a.id === 'shove') || unarmed.attacks[0];
  const kickAttack = unarmed.attacks.find(a => a.id === 'kick') || unarmed.attacks[1];

  // Evaluate if Shove or Kick deal damage with active perks
  const shoveDmgCalc = calculateAttackDamage(unarmed, shoveAttack, 'body', perks, enemy, state, mechanics);
  const kickDmgCalc = calculateAttackDamage(unarmed, kickAttack, 'body', perks, enemy, state, mechanics);

  const shoveDealsDamage = shoveDmgCalc.finalDamage > 0;
  const kickDealsDamage = kickDmgCalc.finalDamage > 0;

  // 2. Shove Generation Policy
  if (constraints.allowShove) {
    if (shoveDealsDamage) {
      // Damaging shove (e.g. perk active) is always eligible
      actions.push({ input: { kind: 'shove' }, hitZone: 'body' });
    } else {
      // Non-damaging shove:
      // - NEVER allowed if target is already Downed (cannot improve Downed)
      // - NEVER allowed if previous action was already a non-damaging control action
      const canShove = !state.isDowned && state.lastAttackType !== 'shove' && state.lastAttackType !== 'kick';
      if (canShove) {
        actions.push({ input: { kind: 'shove' }, hitZone: 'body' });
      }
    }
  }

  // 3. Kick Generation Policy
  if (constraints.allowKick) {
    if (kickDealsDamage) {
      // Damaging kick (e.g. Foreman perk active) is always eligible
      actions.push({ input: { kind: 'kick' }, hitZone: 'body' });
    } else {
      // Non-damaging kick:
      // - NEVER allowed if target is already Downed (cannot improve Downed)
      // - NEVER allowed after an initial Shove (Shove -> Kick is strictly dominated by Kick directly)
      const canKick = !state.isDowned && state.lastAttackType !== 'shove' && state.lastAttackType !== 'kick';
      if (canKick) {
        actions.push({ input: { kind: 'kick' }, hitZone: 'body' });
      }
    }
  }

  return actions;
}

export function solveCombat(options: SolverOptions): CombatRecipe[] {
  const {
    weapon,
    perks,
    enemy,
    mechanics,
    constraints,
    objective,
    maxActions = 6
  } = options;

  const initialState = createInitialCombatState(enemy, mechanics, constraints.difficulty);
  const context = {
    perks,
    enemy,
    mechanics,
    preChargedOpener: constraints.preChargedOpener ?? true
  };

  const startNode: SearchNode = {
    state: initialState,
    actions: [],
    logs: [],
    totalStaminaSpent: 0,
    totalAmmoSpent: 0,
    timeToFirstControlMs: null,
    firstControlActionIndex: null,
    downedMultiplierUsed: false,
    armorBroken: false
  };

  const queue: SearchNode[] = [startNode];
  const finishedRecipes: CombatRecipe[] = [];

  // Pareto frontier tracking by exact discrete state key: [actions, lethalTimeMs, staminaSpent, ammoSpent]
  const visitedFrontiers = new Map<string, Array<[number, number, number, number]>>();

  function isDominated(stateKey: string, actions: number, timeMs: number, stamina: number, ammo: number): boolean {
    const frontier = visitedFrontiers.get(stateKey);
    if (!frontier) return false;
    for (const [fAct, fTime, fStam, fAmmo] of frontier) {
      if (fAct <= actions && fTime <= timeMs && fStam <= stamina && fAmmo <= ammo) {
        return true;
      }
    }
    return false;
  }

  function addToFrontier(stateKey: string, actions: number, timeMs: number, stamina: number, ammo: number) {
    let frontier = visitedFrontiers.get(stateKey);
    if (!frontier) {
      frontier = [];
      visitedFrontiers.set(stateKey, frontier);
    }
    frontier.push([actions, timeMs, stamina, ammo]);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Target killed
    if (current.state.targetHp <= 0) {
      if (constraints.requireKnockdownBeforeKill && !current.downedMultiplierUsed && current.state.posture !== 'downed') {
        continue;
      }

      const lastLog = current.logs[current.logs.length - 1];
      const lethalImpactTimeMs = lastLog ? lastLog.impactElapsedMs : current.state.elapsedMs;
      const readyAfterKillMs = current.state.elapsedMs;

      finishedRecipes.push({
        id: `recipe-${finishedRecipes.length + 1}`,
        weapon,
        actions: current.actions,
        totalActions: current.actions.length,
        lethalImpactTimeMs,
        threatExposureMs: current.state.threatExposureMs,
        preparationMs: current.state.preparationMs,
        readyAfterKillMs,
        totalStaminaSpent: Math.round(current.totalStaminaSpent * 10) / 10,
        totalAmmoSpent: current.totalAmmoSpent,
        timeToFirstControlMs: current.timeToFirstControlMs,
        firstControlActionIndex: current.firstControlActionIndex,
        targetKilled: true,
        downedMultiplierUsed: current.downedMultiplierUsed,
        armorBroken: current.armorBroken,
        finalState: current.state,
        logs: current.logs
      });
      continue;
    }

    if (current.actions.length >= maxActions) {
      continue;
    }

    // Get goal-directed useful actions for this state
    const usefulCandidates = getUsefulLegalActions(weapon, current.state, perks, enemy, mechanics, constraints);

    for (const candidate of usefulCandidates) {
      const isFirstAction = current.actions.length === 0;

      // Determine resolving attack
      const resolution = resolvePlayerInput(weapon, candidate.input, current.state);

      const actionInput: CombatActionInput = {
        weapon,
        input: candidate.input,
        resolvedAttack: resolution.resolvedAttack,
        hitZone: candidate.hitZone
      };

      const { nextState, log } = transition(current.state, actionInput, context);

      // Check constraint: minimum stamina reserve
      if (nextState.playerStamina < constraints.minStaminaReserve) {
        continue;
      }

      // Check constraint: Safe Opener / Require First Interrupt (default ON)
      const requireSafe = constraints.safeOpener ?? constraints.requireFirstInterrupt;
      if (isFirstAction && requireSafe) {
        const isSafe = nextState.targetHp <= 0 || isControlPosture(nextState.posture);
        if (!isSafe) {
          continue;
        }
      }

      // Track control timing
      let firstControlTime = current.timeToFirstControlMs;
      let firstControlIdx = current.firstControlActionIndex;
      if (firstControlTime === null && isControlPosture(nextState.posture)) {
        firstControlTime = current.state.elapsedMs + resolution.resolvedAttack.windupMs;
        firstControlIdx = current.actions.length;
      }

      const downedUsed = current.downedMultiplierUsed || log.isDownedHit;
      const armorBrokenNow = current.armorBroken || log.armorBrokenNow;
      const staminaSpent = current.totalStaminaSpent + log.staminaCost;
      const ammoSpent = current.totalAmmoSpent + (candidate.input.kind === 'firearm_shot' ? 1 : 0);

      // Exact State Equivalence Key
      const armorKey = nextState.armorLayers.map(l => (l.broken ? '0' : Math.round(l.hp))).join(',');
      const stateKey = nextState.targetHp <= 0
        ? 'DEAD'
        : `${Math.round(nextState.targetHp)}:${Math.round(nextState.accumulatedStability)}:${nextState.posture}:${nextState.lastMeleeSide || 'neutral'}:${armorKey}`;

      if (isDominated(stateKey, nextState.actionCount, nextState.elapsedMs, staminaSpent, ammoSpent)) {
        continue;
      }
      addToFrontier(stateKey, nextState.actionCount, nextState.elapsedMs, staminaSpent, ammoSpent);

      queue.push({
        state: nextState,
        actions: [...current.actions, actionInput],
        logs: [...current.logs, log],
        totalStaminaSpent: staminaSpent,
        totalAmmoSpent: ammoSpent,
        timeToFirstControlMs: firstControlTime,
        firstControlActionIndex: firstControlIdx,
        downedMultiplierUsed: downedUsed,
        armorBroken: armorBrokenNow
      });
    }
  }

  return rankRecipes(finishedRecipes, objective);
}

export function rankRecipes(recipes: CombatRecipe[], objective: OptimizerObjective): CombatRecipe[] {
  const uniqueMap = new Map<string, CombatRecipe>();
  for (const r of recipes) {
    const key = r.actions.map(a => `${a.input.kind}-${a.input.side || ''}-${a.hitZone}`).join('->');
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r);
    }
  }
  const uniqueList = Array.from(uniqueMap.values());

  uniqueList.sort((a, b) => {
    const isFirearm = a.weapon.category === 'firearm';

    switch (objective) {
      case 'fastest_kill':
        if (a.lethalImpactTimeMs !== b.lethalImpactTimeMs) return a.lethalImpactTimeMs - b.lethalImpactTimeMs;
        if (isFirearm && a.totalAmmoSpent !== b.totalAmmoSpent) return a.totalAmmoSpent - b.totalAmmoSpent;
        if (a.totalActions !== b.totalActions) return a.totalActions - b.totalActions;
        return a.totalStaminaSpent - b.totalStaminaSpent;

      case 'lowest_stamina': // "Efficient Kill"
        if (isFirearm) {
          // For firearms, lowest ammo (rounds) spent is the primary efficiency dimension!
          if (a.totalAmmoSpent !== b.totalAmmoSpent) return a.totalAmmoSpent - b.totalAmmoSpent;
          if (a.totalActions !== b.totalActions) return a.totalActions - b.totalActions;
          if (a.lethalImpactTimeMs !== b.lethalImpactTimeMs) return a.lethalImpactTimeMs - b.lethalImpactTimeMs;
          return a.totalStaminaSpent - b.totalStaminaSpent;
        } else {
          if (a.totalStaminaSpent !== b.totalStaminaSpent) return a.totalStaminaSpent - b.totalStaminaSpent;
          if (a.lethalImpactTimeMs !== b.lethalImpactTimeMs) return a.lethalImpactTimeMs - b.lethalImpactTimeMs;
          return a.totalActions - b.totalActions;
        }

      case 'safest_kill': {
        const aCtrl = a.timeToFirstControlMs ?? 99999;
        const bCtrl = b.timeToFirstControlMs ?? 99999;
        if (aCtrl !== bCtrl) return aCtrl - bCtrl;
        if (isFirearm && a.totalAmmoSpent !== b.totalAmmoSpent) return a.totalAmmoSpent - b.totalAmmoSpent;
        if (a.lethalImpactTimeMs !== b.lethalImpactTimeMs) return a.lethalImpactTimeMs - b.lethalImpactTimeMs;
        return a.totalActions - b.totalActions;
      }

      case 'efficient_control': {
        const aCtrl = a.timeToFirstControlMs ?? 99999;
        const bCtrl = b.timeToFirstControlMs ?? 99999;
        if (aCtrl !== bCtrl) return aCtrl - bCtrl;
        if (isFirearm && a.totalAmmoSpent !== b.totalAmmoSpent) return a.totalAmmoSpent - b.totalAmmoSpent;
        return a.totalStaminaSpent - b.totalStaminaSpent;
      }

      case 'fewest_attacks':
        if (isFirearm && a.totalAmmoSpent !== b.totalAmmoSpent) return a.totalAmmoSpent - b.totalAmmoSpent;
        if (a.totalActions !== b.totalActions) return a.totalActions - b.totalActions;
        if (a.lethalImpactTimeMs !== b.lethalImpactTimeMs) return a.lethalImpactTimeMs - b.lethalImpactTimeMs;
        return a.totalStaminaSpent - b.totalStaminaSpent;

      case 'balanced':
      default: {
        if (isFirearm) {
          const scoreA = a.totalAmmoSpent * 20 + a.totalActions * 2 + (a.lethalImpactTimeMs / 500) + (a.totalStaminaSpent / 100);
          const scoreB = b.totalAmmoSpent * 20 + b.totalActions * 2 + (b.lethalImpactTimeMs / 500) + (b.totalStaminaSpent / 100);
          return scoreA - scoreB;
        } else {
          const scoreA = a.totalActions * 1.5 + (a.lethalImpactTimeMs / 500) + (a.totalStaminaSpent / 25);
          const scoreB = b.totalActions * 1.5 + (b.lethalImpactTimeMs / 500) + (b.totalStaminaSpent / 25);
          return scoreA - scoreB;
        }
      }
    }
  });

  return uniqueList.slice(0, 15);
}
