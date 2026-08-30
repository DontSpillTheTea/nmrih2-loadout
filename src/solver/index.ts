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
  HitZone
} from '../types';
import { createInitialCombatState, transition } from '../engine/transition';
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
  const availableActions: CombatActionInput[] = [];

  // Build legal action set
  const hitZones: HitZone[] = [];
  if (constraints.targetHitZone === 'head') {
    hitZones.push('head');
  } else if (constraints.targetHitZone === 'body') {
    hitZones.push('body');
  } else if (constraints.targetHitZone === 'limb') {
    hitZones.push('limb');
  } else {
    // 'auto'
    hitZones.push('head', 'body');
    if (constraints.allowLimb) {
      hitZones.push('limb');
    }
  }

  // Weapon attacks
  for (const attack of weapon.attacks) {
    if (attack.attackType === 'charged' && !constraints.allowCharged) {
      continue;
    }
    for (const hz of hitZones) {
      availableActions.push({
        weapon,
        attack,
        hitZone: hz
      });
    }
  }

  // Universal control actions
  if (constraints.allowShove) {
    const shoveAttack = unarmed.attacks.find(a => a.id === 'shove');
    if (shoveAttack) {
      availableActions.push({
        weapon: unarmed,
        attack: shoveAttack,
        hitZone: 'body'
      });
    }
  }

  if (constraints.allowKick) {
    const kickAttack = unarmed.attacks.find(a => a.id === 'kick');
    if (kickAttack) {
      availableActions.push({
        weapon: unarmed,
        attack: kickAttack,
        hitZone: 'body'
      });
    }
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

  // Pareto frontier tracking by discrete state key: targetHp -> list of non-dominated cost vectors
  // cost vector: [actions, elapsedMs, staminaSpent]
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

    // If target is killed, save recipe
    if (current.state.targetHp <= 0) {
      // Check constraints on finish
      if (constraints.requireKnockdownBeforeKill && !current.downedMultiplierUsed && current.state.posture !== 'downed') {
        continue;
      }

      finishedRecipes.push({
        id: `recipe-${finishedRecipes.length + 1}`,
        weapon,
        actions: current.actions,
        totalActions: current.actions.length,
        totalTimeMs: current.state.elapsedMs,
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

    // Stop exploring if max depth reached
    if (current.actions.length >= maxActions) {
      continue;
    }

    for (const action of availableActions) {
      const isFirstAction = current.actions.length === 0;

      // Apply transition
      const { nextState, log } = transition(current.state, action, context);

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

      // Update control timing
      let firstControlTime = current.timeToFirstControlMs;
      let firstControlIdx = current.firstControlActionIndex;
      if (firstControlTime === null && isControlPosture(nextState.posture)) {
        firstControlTime = current.state.elapsedMs + action.attack.windupMs;
        firstControlIdx = current.actions.length;
      }

      const downedUsed = current.downedMultiplierUsed || log.isDownedHit;
      const staminaSpent = current.totalStaminaSpent + log.staminaCost;

      // State Key for Pareto Pruning
      const stateKey = nextState.targetHp <= 0
        ? 'DEAD'
        : `${Math.round(nextState.targetHp)}:${nextState.posture}:${nextState.playerStamina <= 0 ? 0 : 1}`;

      if (isDominated(stateKey, nextState.actionCount, nextState.elapsedMs, staminaSpent)) {
        continue;
      }
      addToFrontier(stateKey, nextState.actionCount, nextState.elapsedMs, staminaSpent);

      queue.push({
        state: nextState,
        actions: [...current.actions, action],
        logs: [...current.logs, log],
        totalStaminaSpent: staminaSpent,
        timeToFirstControlMs: firstControlTime,
        firstControlActionIndex: firstControlIdx,
        downedMultiplierUsed: downedUsed
      });
    }
  }

  // Deduplicate and rank recipes by objective
  return rankRecipes(finishedRecipes, objective);
}

export function rankRecipes(recipes: CombatRecipe[], objective: OptimizerObjective): CombatRecipe[] {
  // Deduplicate exact same action sequence
  const uniqueMap = new Map<string, CombatRecipe>();
  for (const r of recipes) {
    const key = r.actions.map(a => `${a.weapon.id}-${a.attack.id}-${a.hitZone}`).join('->');
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r);
    }
  }
  const uniqueList = Array.from(uniqueMap.values());

  uniqueList.sort((a, b) => {
    switch (objective) {
      case 'fewest_attacks':
        if (a.totalActions !== b.totalActions) return a.totalActions - b.totalActions;
        if (a.totalTimeMs !== b.totalTimeMs) return a.totalTimeMs - b.totalTimeMs;
        return a.totalStaminaSpent - b.totalStaminaSpent;

      case 'fastest_kill':
        if (a.totalTimeMs !== b.totalTimeMs) return a.totalTimeMs - b.totalTimeMs;
        if (a.totalActions !== b.totalActions) return a.totalActions - b.totalActions;
        return a.totalStaminaSpent - b.totalStaminaSpent;

      case 'lowest_stamina':
        if (a.totalStaminaSpent !== b.totalStaminaSpent) return a.totalStaminaSpent - b.totalStaminaSpent;
        if (a.totalTimeMs !== b.totalTimeMs) return a.totalTimeMs - b.totalTimeMs;
        return a.totalActions - b.totalActions;

      case 'safest_kill': {
        const aCtrl = a.timeToFirstControlMs ?? 99999;
        const bCtrl = b.timeToFirstControlMs ?? 99999;
        if (aCtrl !== bCtrl) return aCtrl - bCtrl;
        if (a.totalTimeMs !== b.totalTimeMs) return a.totalTimeMs - b.totalTimeMs;
        return a.totalActions - b.totalActions;
      }

      case 'balanced':
      default: {
        // Balanced score based on normalized actions, time, and stamina
        const scoreA = a.totalActions * 1.5 + (a.totalTimeMs / 500) + (a.totalStaminaSpent / 25);
        const scoreB = b.totalActions * 1.5 + (b.totalTimeMs / 500) + (b.totalStaminaSpent / 25);
        return scoreA - scoreB;
      }
    }
  });

  return uniqueList.slice(0, 15);
}
