import { describe, it, expect } from 'vitest';
import { evaluateOfferedPerks } from '../src/planner/perk-picker';
import { getWeaponById, perkSlugMap, mechanics } from '../src/data/loader';
import type { OptimizerConstraints } from '../src/types';

describe('RNG Perk Picker Marginal Utility Evaluator', () => {
  const cleaver = getWeaponById(11)!;
  const headhunter = perkSlugMap.get('headhunter')!;
  const hitman = perkSlugMap.get('hitman')!;
  const athlete = perkSlugMap.get('athlete')!;
  const scavenger = perkSlugMap.get('scavenger')!;

  const constraints: OptimizerConstraints = {
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

  it('accurately evaluates 3 offered perks and ranks breakpoint gains highest', () => {
    const evaluated = evaluateOfferedPerks({
      weapon: cleaver,
      currentPerks: [athlete],
      offeredPerkIds: [headhunter.id, hitman.id, scavenger.id],
      mechanics,
      constraints,
      objective: 'fewest_attacks'
    });

    expect(evaluated.length).toBe(3);
    // Headhunter or Hitman should rank above pure Scavenger for melee combat
    expect(evaluated[0].perk.id).not.toBe(scavenger.id);
    expect(evaluated[0].score).toBeGreaterThanOrEqual(evaluated[2].score);
    expect(evaluated[0].deltas.length).toBeGreaterThan(0);
  });
});
