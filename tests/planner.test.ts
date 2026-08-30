import { describe, it, expect } from 'vitest';
import { evaluateOfferedPerks } from '../src/planner/perk-picker';
import { getWeaponById, getPerkById, mechanics } from '../src/data/loader';

describe('Marginal RNG Perk Picker & Breakpoint Evaluator', () => {
  const cleaver = getWeaponById(11)!;
  const headhunter = getPerkById(29)!; // Headhunter
  const hitman = getPerkById(37)!;     // Hitman
  const athlete = getPerkById(7)!;     // Athlete (+Stamina)

  it('evaluates 3 offered perks against baseline and ranks them with delta metrics', () => {
    const choices = evaluateOfferedPerks({
      weapon: cleaver,
      currentPerks: [],
      offeredPerkIds: [headhunter.id, hitman.id, athlete.id],
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
      objective: 'fewest_attacks'
    });

    expect(choices.length).toBe(3);
    for (const c of choices) {
      expect(c.perk).toBeDefined();
      expect(c.deltas.length).toBeGreaterThan(0);
      expect(c.recommendationReason).toBeDefined();
    }
  });
});
