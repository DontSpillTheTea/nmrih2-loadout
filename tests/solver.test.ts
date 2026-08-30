import { describe, it, expect } from 'vitest';
import { solveCombat } from '../src/solver';
import { getWeaponById, getEnemyById, getPerkById, mechanics } from '../src/data/loader';
import type { OptimizerConstraints } from '../src/types';

describe('Exact Combat Solver & Pareto Pruning', () => {
  const cleaver = getWeaponById(11)!;
  const fireAxe = getWeaponById(15)!;
  const walker = getEnemyById(1)!; // 100 HP
  const prime = getEnemyById(3)!;  // 130 HP

  const baseConstraints: OptimizerConstraints = {
    requireFirstInterrupt: false,
    requireKnockdownBeforeKill: false,
    minStaminaReserve: 0,
    allowShove: true,
    allowKick: true,
    allowCharged: true,
    allowLimb: false,
    targetHitZone: 'head',
    difficulty: 'normal'
  };

  it('finds optimal attack sequences against Walker', () => {
    const recipes = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: baseConstraints,
      objective: 'fewest_attacks',
      maxActions: 5
    });

    expect(recipes.length).toBeGreaterThan(0);
    const best = recipes[0];
    expect(best.targetKilled).toBe(true);
    // Cleaver charged head = 50 dmg -> 2 charged heads kill 100 HP Walker in 2 actions!
    expect(best.totalActions).toBe(2);
  });

  it('finds faster and cheaper sequences under different objectives', () => {
    const staminaRecipes = solveCombat({
      weapon: fireAxe,
      perks: [],
      enemy: prime,
      mechanics,
      constraints: baseConstraints,
      objective: 'lowest_stamina',
      maxActions: 5
    });

    const fastRecipes = solveCombat({
      weapon: fireAxe,
      perks: [],
      enemy: prime,
      mechanics,
      constraints: baseConstraints,
      objective: 'fastest_kill',
      maxActions: 5
    });

    expect(staminaRecipes.length).toBeGreaterThan(0);
    expect(fastRecipes.length).toBeGreaterThan(0);
    expect(staminaRecipes[0].totalStaminaSpent).toBeLessThanOrEqual(fastRecipes[0].totalStaminaSpent + 10);
  });

  it('strictly honors requireFirstInterrupt constraint', () => {
    const interruptConstraints: OptimizerConstraints = {
      ...baseConstraints,
      requireFirstInterrupt: true
    };

    const recipes = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: prime,
      mechanics,
      constraints: interruptConstraints,
      objective: 'safest_kill',
      maxActions: 5
    });

    expect(recipes.length).toBeGreaterThan(0);
    for (const r of recipes) {
      // First action must have stability >= 20 (e.g. Shove or Kick or Strong/Charged stability)
      const firstLog = r.logs[0];
      expect(firstLog.stabilityDamageDealt).toBeGreaterThanOrEqual(20);
    }
  });

  it('discovers Kick -> Downed 2x damage combo when knockdown is required', () => {
    const knockdownConstraints: OptimizerConstraints = {
      ...baseConstraints,
      requireKnockdownBeforeKill: true
    };

    const recipes = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: knockdownConstraints,
      objective: 'fewest_attacks',
      maxActions: 5
    });

    expect(recipes.length).toBeGreaterThan(0);
    const best = recipes[0];
    // Kick (knockdown) -> Charged Head (50 * 2 = 100 dmg kill)
    expect(best.actions[0].attack.id).toBe('kick');
    expect(best.downedMultiplierUsed).toBe(true);
    expect(best.totalActions).toBe(2);
  });
});
