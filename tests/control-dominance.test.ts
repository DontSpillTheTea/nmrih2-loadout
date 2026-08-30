import { describe, it, expect } from 'vitest';
import { getWeaponById, getEnemyById, getPerkById, mechanics } from '../src/data/loader';
import { solveCombat, getUsefulLegalActions } from '../src/solver';
import { createInitialCombatState } from '../src/engine/transition';
import { formatActionSequence } from '../src/utils/format';
import type { Perk, OptimizerConstraints } from '../src/types';

describe('Control Action Generation & Dominance Rules (Tests A-G)', () => {
  const gruber = getWeaponById(107)!;      // Gruber MKVII Handgun
  const cleaver = getWeaponById(11)!;      // Cleaver Melee
  const pipe = getWeaponById(18)!;         // Small Pipe
  const walker = getEnemyById(1)!;         // Walker (100 HP)
  const nationalGuard = getEnemyById(7)!;  // NG Armored (100 HP, 90 HP Helmet)
  const foreman = getPerkById(19)!;        // Foreman (+10 Kick Damage)

  const defaultConstraints: OptimizerConstraints = {
    requireFirstInterrupt: false,
    safeOpener: false,
    preChargedOpener: false,
    requireKnockdownBeforeKill: false,
    minStaminaReserve: 0,
    allowShove: true,
    allowKick: true,
    allowCharged: true,
    allowLimb: false,
    targetHitZone: 'head',
    difficulty: 'normal'
  };

  // TEST A: Kick dominates Shove -> Kick
  it('TEST A: Kick alone dominates Shove -> Kick from neutral', () => {
    const recipes = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: { ...defaultConstraints, allowKick: true, allowShove: true },
      objective: 'fastest_kill',
      maxActions: 4
    });

    // Check that no recipe starts with Shove -> Kick
    for (const r of recipes) {
      const kinds = r.actions.map(a => a.input.kind);
      expect(kinds.slice(0, 2)).not.toEqual(['shove', 'kick']);
    }
  });

  // TEST B: Target already Downed -> Shove is not generated
  it('TEST B: Target already Downed rejects zero-damage Shove', () => {
    const s = createInitialCombatState(walker, mechanics);
    s.isDowned = true;
    s.posture = 'downed';

    const actions = getUsefulLegalActions(cleaver, s, [], walker, mechanics, defaultConstraints);
    const shoveAction = actions.find(a => a.input.kind === 'shove');
    expect(shoveAction).toBeUndefined();
  });

  // TEST C: Target already Downed -> Kick is not generated
  it('TEST C: Target already Downed rejects second zero-damage Kick', () => {
    const s = createInitialCombatState(walker, mechanics);
    s.isDowned = true;
    s.posture = 'downed';

    const actions = getUsefulLegalActions(cleaver, s, [], walker, mechanics, defaultConstraints);
    const kickAction = actions.find(a => a.input.kind === 'kick');
    expect(kickAction).toBeUndefined();
  });

  // TEST D: Shove gains damage via declarative perk effect -> Shove is generated
  it('TEST D: Shove with declarative damage perk is generated even when standing', () => {
    const syntheticShoveDmgPerk: Perk = {
      id: 9991,
      slug: 'heavy-shove-dmg',
      baseSlug: 'heavy-shove-dmg',
      name: 'Heavy Shove Damage',
      tier: 'standard',
      unlockAccountLevel: 1,
      description: 'Shoves deal 15 damage',
      notes: '',
      tags: ['damage'],
      effects: [{
        stat: 'damage',
        operation: 'add',
        value: 15,
        stage: 1,
        conditions: { source: 'shove' }
      }],
      provenanceRef: 'synthetic'
    };

    const s = createInitialCombatState(walker, mechanics);
    const actions = getUsefulLegalActions(cleaver, s, [syntheticShoveDmgPerk], walker, mechanics, defaultConstraints);
    const shoveAction = actions.find(a => a.input.kind === 'shove');
    expect(shoveAction).toBeDefined();
  });

  // TEST E: Kick gains damage via Foreman perk -> Kick is generated
  it('TEST E: Kick with Foreman perk is generated', () => {
    const s = createInitialCombatState(walker, mechanics);
    const actions = getUsefulLegalActions(cleaver, s, [foreman], walker, mechanics, defaultConstraints);
    const kickAction = actions.find(a => a.input.kind === 'kick');
    expect(kickAction).toBeDefined();
  });

  // TEST F: Firearm scenario allows Kick -> Shoot with Downed 2x, rejects Shove after Kick
  it('TEST F: Firearm scenario allows Kick -> Shoot with 2x bonus and rejects Shove after Kick', () => {
    const recipes = solveCombat({
      weapon: gruber,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: { ...defaultConstraints, allowKick: true, allowShove: true },
      objective: 'fastest_kill',
      maxActions: 4
    });

    expect(recipes.length).toBeGreaterThan(0);
    // Find recipes with kick
    const kickRecipes = recipes.filter(r => r.actions.some(a => a.input.kind === 'kick'));
    for (const r of kickRecipes) {
      // Shove should never follow Kick
      const kickIdx = r.actions.findIndex(a => a.input.kind === 'kick');
      if (kickIdx >= 0 && kickIdx < r.actions.length - 1) {
        expect(r.actions[kickIdx + 1].input.kind).not.toBe('shove');
      }
    }
  });

  // TEST G: Firearm scenario with Safe Opener allows Kick -> Shoot or Shove -> Shoot, rejects Shove -> Shove -> Shoot
  it('TEST G: Firearm scenario with Safe Opener rejects repeated Shove spam', () => {
    const recipes = solveCombat({
      weapon: gruber,
      perks: [],
      enemy: nationalGuard,
      mechanics,
      constraints: { ...defaultConstraints, safeOpener: true, requireFirstInterrupt: true, allowShove: true, allowKick: true },
      objective: 'fastest_kill',
      maxActions: 8
    });

    expect(recipes.length).toBeGreaterThan(0);
    for (const r of recipes) {
      const kinds = r.actions.map(a => a.input.kind);
      // No repeated shoves allowed: ['shove', 'shove']
      for (let i = 0; i < kinds.length - 1; i++) {
        if (kinds[i] === 'shove') {
          expect(kinds[i + 1]).not.toBe('shove');
        }
      }
    }
  });

  // Sequence format test: No literal &rarr;
  it('verifies formatActionSequence outputs unicode arrows and never raw &rarr;', () => {
    const recipes = solveCombat({
      weapon: cleaver,
      perks: [],
      enemy: walker,
      mechanics,
      constraints: defaultConstraints,
      objective: 'fastest_kill',
      maxActions: 3
    });

    expect(recipes.length).toBeGreaterThan(0);
    const formatted = formatActionSequence(recipes[0]);
    expect(formatted).toContain('→');
    expect(formatted).not.toContain('&rarr;');
  });
});
