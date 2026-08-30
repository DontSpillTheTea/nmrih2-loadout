import { describe, it, expect } from 'vitest';
import { getWeaponById, getEnemyById, mechanics } from '../src/data/loader';
import { createInitialCombatState, transition } from '../src/engine/transition';
import { solveCombat } from '../src/solver';
import type { CombatActionInput } from '../src/types';

describe('Melee Directional Combo & Action Legality Engine', () => {
  const pipe = getWeaponById(18)!; // Pipe (Small) - ID 18
  const walker = getEnemyById(1)!; // Walker 100 HP

  it('proves Strong attack cannot be selected from neutral: neutral Left Tap resolves to Quick Attack', () => {
    const state = createInitialCombatState(walker, mechanics);
    expect(state.lastMeleeSide).toBeNull();

    const action: CombatActionInput = {
      weapon: pipe,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: pipe.attacks[0],
      hitZone: 'head'
    };

    const { nextState, log } = transition(state, action, { perks: [], enemy: walker, mechanics });
    expect(log.resolvedActionName).toBe('Quick Attack');
    expect(nextState.lastMeleeSide).toBe('left');
    expect(nextState.lastAttackType).toBe('quick');
  });

  it('proves neutral Right Tap resolves to Quick Right', () => {
    const state = createInitialCombatState(walker, mechanics);
    const action: CombatActionInput = {
      weapon: pipe,
      input: { kind: 'tap', side: 'right', hitZone: 'head' },
      resolvedAttack: pipe.attacks[0],
      hitZone: 'head'
    };

    const { nextState, log } = transition(state, action, { perks: [], enemy: walker, mechanics });
    expect(log.resolvedActionName).toBe('Quick Attack');
    expect(nextState.lastMeleeSide).toBe('right');
    expect(nextState.lastAttackType).toBe('quick');
  });

  it('proves alternating direction (Left Tap -> Right Tap) resolves to Quick -> Quick', () => {
    const state0 = createInitialCombatState(walker, mechanics);
    const act1: CombatActionInput = {
      weapon: pipe,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: pipe.attacks[0],
      hitZone: 'head'
    };
    const res1 = transition(state0, act1, { perks: [], enemy: walker, mechanics });
    expect(res1.log.resolvedActionName).toBe('Quick Attack');

    const act2: CombatActionInput = {
      weapon: pipe,
      input: { kind: 'tap', side: 'right', hitZone: 'head' },
      resolvedAttack: pipe.attacks[0],
      hitZone: 'head'
    };
    const res2 = transition(res1.nextState, act2, { perks: [], enemy: walker, mechanics });
    expect(res2.log.resolvedActionName).toBe('Quick Attack');
    expect(res2.nextState.lastMeleeSide).toBe('right');
  });

  it('proves same-direction repeat (Left Tap -> Left Tap) resolves to Quick -> Strong', () => {
    const state0 = createInitialCombatState(walker, mechanics);
    const act1: CombatActionInput = {
      weapon: pipe,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: pipe.attacks[0],
      hitZone: 'head'
    };
    const res1 = transition(state0, act1, { perks: [], enemy: walker, mechanics });
    expect(res1.log.resolvedActionName).toBe('Quick Attack');

    const act2: CombatActionInput = {
      weapon: pipe,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: pipe.attacks[0],
      hitZone: 'head'
    };
    const res2 = transition(res1.nextState, act2, { perks: [], enemy: walker, mechanics });
    expect(res2.log.resolvedActionName).toBe('Strong Attack');
    expect(res2.nextState.lastMeleeSide).toBe('left');
    expect(res2.nextState.lastAttackType).toBe('strong');
  });

  it('proves solver never emits an illegal Strong opener from neutral', () => {
    const recipes = solveCombat({
      weapon: pipe,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: {
        requireFirstInterrupt: false,
        requireKnockdownBeforeKill: false,
        minStaminaReserve: 0,
        allowShove: true,
        allowKick: true,
        allowCharged: true,
        allowLimb: false,
        targetHitZone: 'head',
        difficulty: 'normal'
      },
      objective: 'fastest_kill',
      maxActions: 5
    });

    expect(recipes.length).toBeGreaterThan(0);

    for (const recipe of recipes) {
      const firstLog = recipe.logs[0];
      // First action can be Quick, Charged, Shove, or Kick, but NEVER Strong!
      expect(firstLog.resolvedActionName).not.toBe('Strong Attack');
    }
  });

  it('validates sequence legality helper on all solver results', () => {
    const recipes = solveCombat({
      weapon: pipe,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: {
        requireFirstInterrupt: false,
        requireKnockdownBeforeKill: false,
        minStaminaReserve: 0,
        allowShove: true,
        allowKick: true,
        allowCharged: true,
        allowLimb: false,
        targetHitZone: 'head',
        difficulty: 'normal'
      },
      objective: 'fewest_attacks',
      maxActions: 5
    });

    for (const r of recipes) {
      let currentState = createInitialCombatState(walker, mechanics);
      for (const act of r.actions) {
        const { nextState, log } = transition(currentState, act, { perks: [], enemy: walker, mechanics });
        expect(log.resolvedActionName).toBeDefined();
        currentState = nextState;
      }
      expect(currentState.targetHp).toBe(0);
    }
  });
});
