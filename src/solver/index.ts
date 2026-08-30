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
  timeToFirstControlMs: number | null;
  firstControlActionIndex: number | null;
  downedMultiplierUsed: boolean;
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

  const unarmed = getUniversalUnarmed();

  // Legal Hit Zones
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

  // Legal input candidates
  const legalInputs: Array<{ input: PlayerInput; hitZone: HitZone }> = [];

  if (weapon.category === 'firearm') {
    for (const hz of hitZones) {
      legalInputs.push({
        input: { kind: 'firearm_shot', hitZone: hz },
        hitZone: hz
      });
    }
  } else {
    // Melee: directional inputs
    for (const hz of hitZones) {
      legalInputs.push({ input: { kind: 'tap', side: 'left', hitZone: hz }, hitZone: hz });
      legalInputs.push({ input: { kind: 'tap', side: 'right', hitZone: hz }, hitZone: hz });
      if (constraints.allowCharged) {
        legalInputs.push({ input: { kind: 'hold', side: 'left', hitZone: hz }, hitZone: hz });
        legalInputs.push({ input: { kind: 'hold', side: 'right', hitZone: hz }, hitZone: hz });
      }
    }
  }

  if (constraints.allowShove) {
    legalInputs.push({ input: { kind: 'shove' }, hitZone: 'body' });
  }

  if (constraints.allowKick) {
    legalInputs.push({ input: { kind: 'kick' }, hitZone: 'body' });
  }

  const initialState = createInitialCombatState(enemy, mechanics, constraints.difficulty);
  const context = { perks, enemy, mechanics };

  const startNode: SearchNode = {
    state: initialState,
    actions: [],
    logs: [],
    totalStaminaSpent: 0,
    timeToFirstControlMs: null,
    firstControlActionIndex: null,
    downedMultiplierUsed: false
  };

  const queue: SearchNode[] = [startNode];
  const finishedRecipes: CombatRecipe[] = [];

  // Pareto frontier tracking by discrete state key: [actions, lethalTimeMs, staminaSpent]
  const visitedFrontiers = new Map<string, Array<[number, number, number]>>();

  function isDominated(stateKey: string, actions: number, timeMs: number, stamina: number): boolean {
    const frontier = visitedFrontiers.get(stateKey);
    if (!frontier) return false;
    for (const [fAct, fTime, fStam] of frontier) {
      if (fAct <= actions && fTime <= timeMs && fStam <= stamina) {
        return true;
      }
    }
    return false;
  }

  function addToFrontier(stateKey: string, actions: number, timeMs: number, stamina: number) {
    let frontier = visitedFrontiers.get(stateKey);
    if (!frontier) {
      frontier = [];
      visitedFrontiers.set(stateKey, frontier);
    }
    frontier.push([actions, timeMs, stamina]);
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
        readyAfterKillMs,
        totalStaminaSpent: Math.round(current.totalStaminaSpent * 10) / 10,
        totalAmmoSpent: 0,
        timeToFirstControlMs: current.timeToFirstControlMs,
        firstControlActionIndex: current.firstControlActionIndex,
        targetKilled: true,
        downedMultiplierUsed: current.downedMultiplierUsed,
        finalState: current.state,
        logs: current.logs
      });
      continue;
    }

    if (current.actions.length >= maxActions) {
      continue;
    }

    for (const candidate of legalInputs) {
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

      // Check constraint: require first interrupt
      if (isFirstAction && constraints.requireFirstInterrupt) {
        if (!isControlPosture(nextState.posture)) {
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
      const staminaSpent = current.totalStaminaSpent + log.staminaCost;

      // State Key for Pareto Pruning MUST include combo state (lastMeleeSide)
      const stateKey = nextState.targetHp <= 0
        ? 'DEAD'
        : `${Math.round(nextState.targetHp)}:${nextState.posture}:${nextState.lastMeleeSide || 'neutral'}:${nextState.playerStamina <= 0 ? 0 : 1}`;

      if (isDominated(stateKey, nextState.actionCount, nextState.elapsedMs, staminaSpent)) {
        continue;
      }
      addToFrontier(stateKey, nextState.actionCount, nextState.elapsedMs, staminaSpent);

      queue.push({
        state: nextState,
        actions: [...current.actions, actionInput],
        logs: [...current.logs, log],
        totalStaminaSpent: staminaSpent,
        timeToFirstControlMs: firstControlTime,
        firstControlActionIndex: firstControlIdx,
        downedMultiplierUsed: downedUsed
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
    switch (objective) {
      case 'fastest_kill':
        if (a.lethalImpactTimeMs !== b.lethalImpactTimeMs) return a.lethalImpactTimeMs - b.lethalImpactTimeMs;
        if (a.totalActions !== b.totalActions) return a.totalActions - b.totalActions;
        return a.totalStaminaSpent - b.totalStaminaSpent;

      case 'lowest_stamina':
        if (a.totalStaminaSpent !== b.totalStaminaSpent) return a.totalStaminaSpent - b.totalStaminaSpent;
        if (a.lethalImpactTimeMs !== b.lethalImpactTimeMs) return a.lethalImpactTimeMs - b.lethalImpactTimeMs;
        return a.totalActions - b.totalActions;

      case 'safest_kill': {
        const aCtrl = a.timeToFirstControlMs ?? 99999;
        const bCtrl = b.timeToFirstControlMs ?? 99999;
        if (aCtrl !== bCtrl) return aCtrl - bCtrl;
        if (a.lethalImpactTimeMs !== b.lethalImpactTimeMs) return a.lethalImpactTimeMs - b.lethalImpactTimeMs;
        return a.totalActions - b.totalActions;
      }

      case 'efficient_control': {
        const aCtrl = a.timeToFirstControlMs ?? 99999;
        const bCtrl = b.timeToFirstControlMs ?? 99999;
        if (aCtrl !== bCtrl) return aCtrl - bCtrl;
        return a.totalStaminaSpent - b.totalStaminaSpent;
      }

      case 'fewest_attacks':
        if (a.totalActions !== b.totalActions) return a.totalActions - b.totalActions;
        if (a.lethalImpactTimeMs !== b.lethalImpactTimeMs) return a.lethalImpactTimeMs - b.lethalImpactTimeMs;
        return a.totalStaminaSpent - b.totalStaminaSpent;

      case 'balanced':
      default: {
        const scoreA = a.totalActions * 1.5 + (a.lethalImpactTimeMs / 500) + (a.totalStaminaSpent / 25);
        const scoreB = b.totalActions * 1.5 + (b.lethalImpactTimeMs / 500) + (b.totalStaminaSpent / 25);
        return scoreA - scoreB;
      }
    }
  });

  return uniqueList.slice(0, 15);
}
