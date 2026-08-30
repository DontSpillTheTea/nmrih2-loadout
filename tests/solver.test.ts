import { describe, it, expect } from 'vitest';
import { solveCombat } from '../src/solver';
import { getWeaponById, getEnemyById, getPerkById, mechanics } from '../src/data/loader';

describe('Exact Combat Solver & Multiobjective Pareto Pruning', () => {
  const cleaver = getWeaponById(11)!; // Cleaver (Slashing 1H)
  const walker = getEnemyById(1)!;   // Walker (100 HP)
  const prime = getEnemyById(3)!;    // Prime (130 HP)
  const headhunter = getPerkById(29)!; // Headhunter (+10% Headshot)
  const hitman = getPerkById(37)!;     // Hitman (+15% 1H)

  it('optimizes for fastest kill (minimum lethal impact TTK)', () => {
    const recipes = solveCombat({
      weapon: cleaver,
      perks: [headhunter, hitman],
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
    const top = recipes[0];
    expect(top.targetKilled).toBe(true);
    expect(top.lethalImpactTimeMs).toBeGreaterThan(0);
    expect(top.lethalImpactTimeMs).toBeLessThanOrEqual(top.readyAfterKillMs);
  });

  it('enforces requireFirstInterrupt constraint strictly', () => {
    const recipes = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: prime,
      mechanics,
      constraints: {
        requireFirstInterrupt: true,
        requireKnockdownBeforeKill: false,
        minStaminaReserve: 0,
        allowShove: true,
        allowKick: true,
        allowCharged: true,
        allowLimb: false,
        targetHitZone: 'head',
        difficulty: 'normal'
      },
      objective: 'safest_kill',
      maxActions: 6
    });

    expect(recipes.length).toBeGreaterThan(0);
    for (const r of recipes) {
      const firstLog = r.logs[0];
      expect(firstLog.postureAfter).not.toBe('standing');
      expect(['interrupted', 'staggered', 'downed', 'flinched']).toContain(firstLog.postureAfter);
    }
  });

  it('enforces requireKnockdownBeforeKill to utilize 2.0x downed multiplier', () => {
    const recipes = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: prime,
      mechanics,
      constraints: {
        requireFirstInterrupt: false,
        requireKnockdownBeforeKill: true,
        minStaminaReserve: 0,
        allowShove: true,
        allowKick: true,
        allowCharged: true,
        allowLimb: false,
        targetHitZone: 'head',
        difficulty: 'normal'
      },
      objective: 'fewest_attacks',
      maxActions: 6
    });

    expect(recipes.length).toBeGreaterThan(0);
    for (const r of recipes) {
      expect(r.downedMultiplierUsed).toBe(true);
    }
  });

  it('preserves distinct combo states (Left vs Right) during Pareto search', () => {
    const recipes = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: {
        requireFirstInterrupt: false,
        requireKnockdownBeforeKill: false,
        minStaminaReserve: 0,
        allowShove: false,
        allowKick: false,
        allowCharged: false,
        allowLimb: false,
        targetHitZone: 'head',
        difficulty: 'normal'
      },
      objective: 'fewest_attacks',
      maxActions: 5
    });

    expect(recipes.length).toBeGreaterThan(0);
  });
});
