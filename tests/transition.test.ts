import { describe, it, expect } from 'vitest';
import { calculateAttackDamage } from '../src/engine/damage';
import { transition, createInitialCombatState } from '../src/engine/transition';
import { resolvePosture } from '../src/engine/stability';
import { getWeaponById, getEnemyById, perkSlugMap, mechanics, getUniversalUnarmed } from '../src/data/loader';
import type { CombatActionInput } from '../src/types';

describe('Pure Combat Transition Engine', () => {
  const cleaver = getWeaponById(11)!; // Cleaver
  const walker = getEnemyById(1)!;   // Walker (100 HP)
  const prime = getEnemyById(3)!;    // Prime (130 HP)
  const headhunter = perkSlugMap.get('headhunter')!; // Headhunter (+10% melee headshot)
  const hitman = perkSlugMap.get('hitman')!;         // Hitman (+15% 1H damage, +15% stamina)
  const foreman = perkSlugMap.get('foreman')!;       // Foreman (+10 kick damage)
  const unarmed = getUniversalUnarmed();

  it('calculates baseline Cleaver attacks correctly without perks', () => {
    const initialState = createInitialCombatState(walker, mechanics, 'normal');
    expect(initialState.targetHp).toBe(100);
    expect(initialState.playerStamina).toBe(100);

    const quickHead = cleaver.attacks.find(a => a.id === 'quick')!;
    const calc = calculateAttackDamage(cleaver, quickHead, 'head', [], walker, initialState, mechanics);
    expect(calc.baseDamage).toBe(28);
    expect(calc.finalDamage).toBe(28);
    expect(calc.staminaCost).toBe(5);
    expect(calc.stabilityDamage).toBe(5);
  });

  it('applies additive and multiplicative perks correctly', () => {
    const initialState = createInitialCombatState(walker, mechanics, 'normal');
    const chargedHead = cleaver.attacks.find(a => a.id === 'charged')!;

    // Base charged head = 50 damage
    // Headhunter (+10%) + Hitman (+15%) => +25% total multiplicative bonus
    // 50 * 1.25 = 62.5
    const calc = calculateAttackDamage(
      cleaver,
      chargedHead,
      'head',
      [headhunter, hitman],
      walker,
      initialState,
      mechanics
    );

    expect(calc.baseDamage).toBe(50);
    expect(calc.multiplicativeRatio).toBeCloseTo(0.25);
    expect(calc.finalDamage).toBe(62.5);
    // Hitman adds 15% stamina cost: 13 * 1.15 = 14.95 -> 15
    expect(calc.staminaCost).toBeCloseTo(15, 0);
  });

  it('applies Foreman flat damage to Kick control action', () => {
    const initialState = createInitialCombatState(walker, mechanics, 'normal');
    const kick = unarmed.attacks.find(a => a.id === 'kick')!;

    // Kick base damage is 0, Foreman adds +10 flat damage
    const calc = calculateAttackDamage(unarmed, kick, 'body', [foreman], walker, initialState, mechanics);
    expect(calc.baseDamage).toBe(0);
    expect(calc.additiveFlat).toBe(10);
    expect(calc.finalDamage).toBe(10);
    expect(calc.stabilityDamage).toBe(100); // Knockdown
  });

  it('applies 2x downed multiplier when enemy is in downed state', () => {
    const initialState = createInitialCombatState(walker, mechanics, 'normal');
    const downedState = { ...initialState, isDowned: true, posture: 'downed' as const };
    const quickHead = cleaver.attacks.find(a => a.id === 'quick')!;

    const calc = calculateAttackDamage(cleaver, quickHead, 'head', [], walker, downedState, mechanics);
    // Base 28 * 2.0 = 56
    expect(calc.finalDamage).toBe(56);
    expect(calc.isDownedHit).toBe(true);
  });

  it('transitions state and posture correctly through combo', () => {
    const state0 = createInitialCombatState(prime, mechanics, 'normal');
    expect(state0.targetHp).toBe(130);
    expect(state0.posture).toBe('standing');

    // Step 1: Kick -> 100 stability (Downed!)
    const step1 = transition(state0, {
      weapon: unarmed,
      input: { kind: 'kick' },
      resolvedAttack: unarmed.attacks.find(a => a.id === 'kick')!,
      hitZone: 'body'
    }, { perks: [foreman], enemy: prime, mechanics });

    expect(step1.nextState.posture).toBe('downed');
    expect(step1.nextState.isDowned).toBe(true);
    expect(step1.nextState.targetHp).toBe(120); // 130 - 10 from Foreman kick

    // Step 2: Charged Head on downed target -> 50 * 2.0 = 100 damage
    const step2 = transition(step1.nextState, {
      weapon: cleaver,
      input: { kind: 'hold', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks.find(a => a.id === 'charged')!,
      hitZone: 'head'
    }, { perks: [foreman], enemy: prime, mechanics });

    expect(step2.nextState.targetHp).toBe(20); // 120 - 100 = 20
    expect(step2.log.isDownedHit).toBe(true);
    expect(step2.log.finalDamage).toBe(100);
  });

  it('resolves stability posture thresholds correctly', () => {
    expect(resolvePosture(0, mechanics)).toBe('standing');
    expect(resolvePosture(10, mechanics)).toBe('flinched');
    expect(resolvePosture(20, mechanics)).toBe('interrupted');
    expect(resolvePosture(50, mechanics)).toBe('staggered');
    expect(resolvePosture(100, mechanics)).toBe('downed');
  });
});
