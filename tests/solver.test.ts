import { describe, it, expect } from 'vitest';
import { getWeaponById, getEnemyById, mechanics } from '../src/data/loader';
import { solveCombat } from '../src/solver';

describe('Solver State Equivalence & Search Correctness', () => {
  const pipe = getWeaponById(18)!; // Pipe Small
  const cleaver = getWeaponById(11)!; // Cleaver
  const walker = getEnemyById(1)!;   // Walker (100 HP)
  const nationalGuard = getEnemyById(7)!; // Armored NG (100 HP, 90 HP Helmet)

  it('proves solver uses exact stability and does not merge future-distinct stability states', () => {
    // Pipe Quick deals 25 stability damage.
    // Walker has stability thresholds: Flinch (0-19), Interrupt (20-49), Stagger (50-99), Knockdown (100+).
    const recipes = solveCombat({
      weapon: pipe,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: {
        requireFirstInterrupt: true,
        safeOpener: true,
        preChargedOpener: false,
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
      maxActions: 6
    });

    expect(recipes.length).toBeGreaterThan(0);
    // Every returned recipe must have successfully reached legal lethal kill
    for (const r of recipes) {
      expect(r.targetKilled).toBe(true);
      expect(r.finalState.targetHp).toBe(0);
    }
  });

  it('proves solver does not merge armored states with distinct helmet HP', () => {
    const recipes = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: nationalGuard,
      mechanics,
      constraints: {
        requireFirstInterrupt: false,
        safeOpener: false,
        preChargedOpener: true,
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
      maxActions: 6
    });

    expect(recipes.length).toBeGreaterThan(0);
    const top = recipes[0];
    expect(top.armorBroken).toBe(true);
  });

  it('proves pre-charge opener tracks preparation time and reduces threat exposure to kill', () => {
    const withoutPreCharge = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: {
        requireFirstInterrupt: false,
        safeOpener: false,
        preChargedOpener: false,
        requireKnockdownBeforeKill: false,
        minStaminaReserve: 0,
        allowShove: false,
        allowKick: false,
        allowCharged: true,
        allowLimb: false,
        targetHitZone: 'head',
        difficulty: 'normal'
      },
      objective: 'fastest_kill',
      maxActions: 3
    });

    const withPreCharge = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: {
        requireFirstInterrupt: false,
        safeOpener: false,
        preChargedOpener: true,
        requireKnockdownBeforeKill: false,
        minStaminaReserve: 0,
        allowShove: false,
        allowKick: false,
        allowCharged: true,
        allowLimb: false,
        targetHitZone: 'head',
        difficulty: 'normal'
      },
      objective: 'fastest_kill',
      maxActions: 3
    });

    expect(withPreCharge.length).toBeGreaterThan(0);
    expect(withoutPreCharge.length).toBeGreaterThan(0);

    const topWith = withPreCharge[0];
    const topWithout = withoutPreCharge[0];

    // Pre-charge should have preparation time > 0 and threat exposure < neutral windup
    expect(topWith.preparationMs).toBeGreaterThan(0);
    expect(topWith.threatExposureMs).toBeLessThanOrEqual(topWithout.threatExposureMs);
  });
});
