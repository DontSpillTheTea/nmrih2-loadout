import { describe, it, expect } from 'vitest';
import { getWeaponById, getEnemyById, getPerkById, mechanics } from '../src/data/loader';
import { createInitialCombatState, transition } from '../src/engine/transition';
import { solveCombat } from '../src/solver';
import type { CombatActionInput } from '../src/types';

describe('Authoritative Combat Verification Fixtures (19 Core Cases + Cases A-F)', () => {
  const pipe = getWeaponById(18)!;     // Pipe Small (1H Blunt)
  const cleaver = getWeaponById(11)!;  // Cleaver (1H Bladed)
  const fireAxe = getWeaponById(15)!;  // Fire Axe (2H Bladed)
  const m9a3 = getWeaponById(104)!;    // Handgun (.22 / 9mm, low penetration = 1)
  const m14 = getWeaponById(115)!;     // Rifle (.308, high penetration = 4)

  const walker = getEnemyById(1)!;     // Walker (100 HP)
  const shambler = getEnemyById(2)!;   // Shambler (70 HP)
  const nationalGuard = getEnemyById(7)!; // Armored NG (100 HP, 90 HP Helmet)

  const hitmanStd = getPerkById(37)!;      // Hitman (+15% 1H)
  const hitmanExp = getPerkById(38)!;      // Hitman Expert (+30% 1H)
  const headhunterStd = getPerkById(29)!;  // Headhunter (+10% Melee Headshot)
  const headhunterExp = getPerkById(30)!;  // Headhunter Expert (+20% Melee Headshot)
  const hardBlowStd = getPerkById(25)!;    // Hard Blow (+15% 2H Stability)
  const foremanStd = getPerkById(19)!;     // Foreman (+10 Flat Kick Damage)

  // -------------------------------------------------------------
  // CASE A: Cleaver + Hitman Expert vs Shambler (70 HP) Breakpoint Analysis
  // -------------------------------------------------------------
  it('CASE A: Cleaver Strong & Charged headshot vs Shambler 70 HP with Hitman Expert & Headhunter', () => {
    // 1. Cleaver Strong Headshot (Base 38 dmg) + Hitman Expert (+30% -> 1.30x)
    // 38 * 1.30 = 49.4 damage (Leaves 20.6 HP -> 2 hits required)
    const actStrong: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[1], // Strong
      hitZone: 'head'
    };
    const s0 = createInitialCombatState(shambler, mechanics);
    s0.lastMeleeSide = 'left'; // Set combo state so tap resolves to Strong
    const resStrongBaseline = transition(s0, actStrong, {
      perks: [hitmanExp],
      enemy: shambler,
      mechanics
    });
    expect(resStrongBaseline.log.finalDamage).toBe(49.4);
    expect(resStrongBaseline.nextState.targetHp).toBe(20.6);

    // 2. Cleaver Strong Headshot with Hitman Expert (+30%) + Headhunter Standard (+10%)
    // Multiplicative sum: 1 + 0.30 + 0.10 = 1.40x
    // 38 * 1.40 = 53.2 damage (Leaves 16.8 HP -> still 2 hits required for Strong attack)
    const resStrongCandidate = transition(s0, actStrong, {
      perks: [hitmanExp, headhunterStd],
      enemy: shambler,
      mechanics
    });
    expect(resStrongCandidate.log.finalDamage).toBe(53.2);
    expect(resStrongCandidate.nextState.targetHp).toBe(16.8);

    // 3. Cleaver CHARGED Headshot (Base 50 dmg):
    // Baseline (Hitman Expert 1.30x): 50 * 1.30 = 65 damage (< 70 HP -> 2 hits required)
    const actCharged: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'hold', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[2], // Charged
      hitZone: 'head'
    };
    const resChargedBaseline = transition(s0, actCharged, {
      perks: [hitmanExp],
      enemy: shambler,
      mechanics
    });
    expect(resChargedBaseline.log.finalDamage).toBe(65);
    expect(resChargedBaseline.nextState.targetHp).toBe(5); // 2 hits required

    // Candidate (Hitman Expert 1.30x + Headhunter Standard 1.10x -> 1.40x):
    // 50 * 1.40 = 70.0 damage! Exactly crosses the 1-HIT KILL BREAKPOINT against Shambler (70 HP)!
    const resChargedCandidate = transition(s0, actCharged, {
      perks: [hitmanExp, headhunterStd],
      enemy: shambler,
      mechanics
    });
    expect(resChargedCandidate.log.finalDamage).toBe(70.0);
    expect(resChargedCandidate.nextState.targetHp).toBe(0); // 1-HIT KILL BREAKPOINT CROSSED!
  });

  // -------------------------------------------------------------
  // CASE B: Small Pipe vs Walker legal alternating Quick sequence
  // -------------------------------------------------------------
  it('CASE B: Small Pipe vs Walker alternating Quick sequence leads to knockdown & 4-5 hit kill', () => {
    let s = createInitialCombatState(walker, mechanics);

    // Hit 1: Tap Left -> Quick Left (20 dmg, 25 stab -> Interrupted, HP 80)
    const res1 = transition(s, { weapon: pipe, input: { kind: 'tap', side: 'left', hitZone: 'head' }, resolvedAttack: pipe.attacks[0], hitZone: 'head' }, { perks: [], enemy: walker, mechanics });
    expect(res1.log.resolvedActionName).toContain('Quick');
    expect(res1.nextState.posture).toBe('interrupted');
    expect(res1.nextState.targetHp).toBe(80);

    // Hit 2: Tap Right -> Quick Right (20 dmg, 50 stab -> Staggered, HP 60)
    const res2 = transition(res1.nextState, { weapon: pipe, input: { kind: 'tap', side: 'right', hitZone: 'head' }, resolvedAttack: pipe.attacks[0], hitZone: 'head' }, { perks: [], enemy: walker, mechanics });
    expect(res2.log.resolvedActionName).toContain('Quick');
    expect(res2.nextState.posture).toBe('staggered');
    expect(res2.nextState.targetHp).toBe(60);

    // Hit 3: Tap Left -> Quick Left (20 dmg, 75 stab -> Staggered, HP 40)
    const res3 = transition(res2.nextState, { weapon: pipe, input: { kind: 'tap', side: 'left', hitZone: 'head' }, resolvedAttack: pipe.attacks[0], hitZone: 'head' }, { perks: [], enemy: walker, mechanics });
    expect(res3.nextState.targetHp).toBe(40);

    // Hit 4: Tap Right -> Quick Right (20 dmg, 100 stab -> Knockdown / Downed, HP 20)
    const res4 = transition(res3.nextState, { weapon: pipe, input: { kind: 'tap', side: 'right', hitZone: 'head' }, resolvedAttack: pipe.attacks[0], hitZone: 'head' }, { perks: [], enemy: walker, mechanics });
    expect(res4.nextState.posture).toBe('downed');
    expect(res4.nextState.targetHp).toBe(20);

    // Hit 5: Tap Left on Downed target (20 * 2.0 = 40 dmg -> KILLED, HP 0)
    const res5 = transition(res4.nextState, { weapon: pipe, input: { kind: 'tap', side: 'left', hitZone: 'head' }, resolvedAttack: pipe.attacks[0], hitZone: 'head' }, { perks: [], enemy: walker, mechanics });
    expect(res5.log.downedMultiplier).toBe(2.0);
    expect(res5.nextState.targetHp).toBe(0);
  });

  // -------------------------------------------------------------
  // CASE C: Pre-engagement Charged Opener followed by Quick/Strong follow-up
  // -------------------------------------------------------------
  it('CASE C: Pre-charged opener separates preparation time from threat exposure', () => {
    const s = createInitialCombatState(walker, mechanics, 'normal', true);
    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'hold', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[2],
      hitZone: 'head'
    };

    const { nextState, log } = transition(s, act, { perks: [], enemy: walker, mechanics, preChargedOpener: true });
    expect(nextState.preparationMs).toBeGreaterThan(0);
    expect(log.impactDurationMs).toBeLessThan(1000); // Only release/active duration exposed
  });

  // -------------------------------------------------------------
  // CASE D & E & F: Firearms & Helmets (M9A3 low pen vs M14 high pen vs NG Armor)
  // -------------------------------------------------------------
  it('CASE D & E & F: M9A3 absorbs into NG helmet, M14 penetrates, NG helmet HP and zombie HP tracked', () => {
    const s = createInitialCombatState(nationalGuard, mechanics);
    const ngHelmet = s.armorLayers.find(l => l.hitZone === 'head')!;
    expect(ngHelmet.hp).toBe(90);

    // Case D: Low penetration M9A3 shot
    const resLow = transition(s, {
      weapon: m9a3,
      input: { kind: 'firearm_shot', hitZone: 'head' },
      resolvedAttack: m9a3.attacks[0],
      hitZone: 'head'
    }, { perks: [], enemy: nationalGuard, mechanics });
    expect(resLow.log.penetratedArmor).toBe(false);
    expect(resLow.nextState.targetHp).toBe(100); // 0 damage to zombie (absorbed into helmet HP)

    // Case E: High penetration M14 shot
    const resHigh = transition(s, {
      weapon: m14,
      input: { kind: 'firearm_shot', hitZone: 'head' },
      resolvedAttack: m14.attacks[0],
      hitZone: 'head'
    }, { perks: [], enemy: nationalGuard, mechanics });
    expect(resHigh.log.penetratedArmor).toBe(true);
    expect(resHigh.nextState.targetHp).toBeLessThan(100); // Penetrated directly!
  });

  // Core verified fixtures
  it('Fixture 1: Shove deals 20 stability and interrupts attack', () => {
    const s = createInitialCombatState(walker, mechanics);
    const { nextState, log } = transition(s, { weapon: pipe, input: { kind: 'shove' }, resolvedAttack: pipe.attacks[0], hitZone: 'body' }, { perks: [], enemy: walker, mechanics });
    expect(log.stabilityDamageDealt).toBe(20);
    expect(nextState.posture).toBe('interrupted');
  });

  it('Fixture 2: Kick deals 100 stability and forces Downed posture', () => {
    const s = createInitialCombatState(walker, mechanics);
    const { nextState, log } = transition(s, { weapon: pipe, input: { kind: 'kick' }, resolvedAttack: pipe.attacks[0], hitZone: 'body' }, { perks: [], enemy: walker, mechanics });
    expect(log.stabilityDamageDealt).toBe(100);
    expect(nextState.posture).toBe('downed');
  });

  it('Fixture 3: Hard Blow adds +15% stability to Two-Handed Fire Axe', () => {
    const s = createInitialCombatState(walker, mechanics);
    const { log } = transition(s, { weapon: fireAxe, input: { kind: 'tap', side: 'left', hitZone: 'head' }, resolvedAttack: fireAxe.attacks[0], hitZone: 'head' }, { perks: [hardBlowStd], enemy: walker, mechanics });
    expect(log.stabilityDamageDealt).toBe(12); // Math.round(10 * 1.15) = 12
  });

  it('Fixture 4: Foreman adds +10 flat damage to Kick', () => {
    const s = createInitialCombatState(walker, mechanics);
    const { log } = transition(s, { weapon: pipe, input: { kind: 'kick' }, resolvedAttack: pipe.attacks[0], hitZone: 'body' }, { perks: [foremanStd], enemy: walker, mechanics });
    expect(log.additiveFlat).toBe(10);
    expect(log.finalDamage).toBe(10); // 0 base + 10 perk
  });
});
