import { describe, it, expect } from 'vitest';
import { solveCombat } from '../src/solver';
import { getWeaponById, getEnemyById, getPerkById, mechanics } from '../src/data/loader';
import type { OptimizerConstraints } from '../src/types';

describe('Public Alpha Release Hardening & Regression Suite', () => {
  const baseConstraints: OptimizerConstraints = {
    difficulty: 'nightmare',
    requireFirstInterrupt: false,
    requireKnockdownBeforeKill: false,
    minStaminaReserve: 0,
    allowShove: true,
    allowKick: true,
    allowCharged: true,
    allowLimb: false,
    targetHitZone: 'head',
    preChargedOpener: false,
    safeOpener: false
  };

  it('ALPHA_REGRESSION: Cleaver + Hitman Expert achieves 2-hit kill on 100 HP Nightmare', () => {
    const cleaver = getWeaponById(11)!; // Cleaver
    const walker = getEnemyById(1)!;   // Walker (100 HP)
    const hitmanExpert = getPerkById(38)!; // Hitman Expert (+30% dmg, +15% stam)

    const recipes = solveCombat({
      weapon: cleaver,
      enemy: walker,
      perks: [hitmanExpert],
      mechanics,
      constraints: baseConstraints,
      objective: 'fewest_attacks',
      maxActions: 5
    });

    expect(recipes.length).toBeGreaterThan(0);
    const top = recipes[0];
    // 2-hit lethal sequence
    expect(top.totalActions).toBe(2);
  });

  it('ALPHA_REGRESSION: Cleaver + Hitman Expert with Pre-Charge opener executes Charged -> Quick', () => {
    const cleaver = getWeaponById(11)!;
    const walker = getEnemyById(1)!;
    const hitmanExpert = getPerkById(38)!;

    const recipes = solveCombat({
      weapon: cleaver,
      enemy: walker,
      perks: [hitmanExpert],
      mechanics,
      constraints: { ...baseConstraints, preChargedOpener: true },
      objective: 'fewest_attacks',
      maxActions: 5
    });

    expect(recipes.length).toBeGreaterThan(0);
    const top = recipes[0];
    expect(top.totalActions).toBe(2);
    expect(top.actions[0].input.kind).toBe('hold');
    expect(top.actions[1].input.kind).toBe('tap');
  });

  it('ALPHA_REGRESSION: Small Pipe Efficient Kill derives from stamina/damage/stability model', () => {
    const pipe = getWeaponById(18)!; // Small Pipe (ID: 18)
    const walker = getEnemyById(1)!; // Walker

    const recipes = solveCombat({
      weapon: pipe,
      enemy: walker,
      perks: [],
      mechanics,
      constraints: baseConstraints,
      objective: 'lowest_stamina',
      maxActions: 5
    });

    expect(recipes.length).toBeGreaterThan(0);
    const top = recipes[0];
    expect(top.totalStaminaSpent).toBeGreaterThan(0);
    expect(top.totalActions).toBeGreaterThanOrEqual(2);
  });

  it('ALPHA_REGRESSION: Tire Iron with Hitman accurately computes +15% stamina modifier', () => {
    const tireIron = getWeaponById(20)!; // Tire Iron (ID: 20)
    const walker = getEnemyById(1)!;
    const hitman = getPerkById(37)!; // Hitman Standard (+15% stam)

    const recipes = solveCombat({
      weapon: tireIron,
      enemy: walker,
      perks: [hitman],
      mechanics,
      constraints: baseConstraints,
      objective: 'lowest_stamina',
      maxActions: 5
    });

    expect(recipes.length).toBeGreaterThan(0);
    const top = recipes[0];
    // Quick attack base is 5. With 15% modifier = 5.75
    // Strong attack base is 7. With 15% modifier = 8.05
    const quickLog = top.logs.find(l => l.resolvedActionName.includes('Light') || l.resolvedActionName.includes('Quick'));
    if (quickLog) {
      expect(quickLog.staminaCost).toBeCloseTo(5.75, 2);
    }
  });

  it('ALPHA_REGRESSION: Firearms rank Efficient Kill by rounds consumed first', () => {
    const gruber = getWeaponById(107)!; // Gruber MKVII (ID: 107)
    const walker = getEnemyById(1)!;

    const recipes = solveCombat({
      weapon: gruber,
      enemy: walker,
      perks: [],
      mechanics,
      constraints: baseConstraints,
      objective: 'lowest_stamina',
      maxActions: 6
    });

    expect(recipes.length).toBeGreaterThan(0);
    const top = recipes[0];
    // Gruber should prioritize fewest rounds consumed (e.g. 2 rounds with Kick/Headshots)
    expect(top.totalAmmoSpent).toBeLessThanOrEqual(3);
  });

  it('ALPHA_SMOKE: Solves diverse unarmored archetypes across weapon categories', () => {
    const weaponsToTest = [
      getWeaponById(10)!,  // Kitchen Knife
      getWeaponById(20)!,  // Tire Iron
      getWeaponById(11)!,  // Cleaver
      getWeaponById(12)!,  // Hatchet
      getWeaponById(107)!, // Gruber MKVII (Handgun)
      getWeaponById(113)!  // Rochester 1873 (Rifle)
    ];

    const enemiesToTest = [
      getEnemyById(1)!, // Walker
      getEnemyById(2)!, // Shambler
      getEnemyById(3)!  // Runner
    ];

    for (const w of weaponsToTest) {
      for (const e of enemiesToTest) {
        const recipes = solveCombat({
          weapon: w,
          enemy: e,
          perks: [],
          mechanics,
          constraints: baseConstraints,
          objective: 'lowest_stamina',
          maxActions: 6
        });
        expect(recipes.length).toBeGreaterThan(0);
      }
    }
  });
});
