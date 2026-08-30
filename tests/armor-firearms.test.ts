import { describe, it, expect } from 'vitest';
import { getWeaponById, getEnemyById, mechanics } from '../src/data/loader';
import { createInitialCombatState, transition } from '../src/engine/transition';
import { solveCombat } from '../src/solver';
import type { CombatActionInput } from '../src/types';

describe('Layered Armor & Firearms Mechanics Engine', () => {
  const nationalGuard = getEnemyById(7)!; // NG (100 HP, 90 HP NG Helmet, Body Armor)
  const riotPolice = getEnemyById(8)!;    // Riot Police (100 HP, 60 HP Riot Helmet, Vest)
  const m9a3 = getWeaponById(104)!;       // Handgun (Low Pen = 1)
  const m14 = getWeaponById(115)!;        // Battle Rifle (High Pen = 4)
  const cleaver = getWeaponById(11)!;     // Cleaver (Melee, 0 Pen)

  it('proves low-penetration firearm shot absorbs into helmet HP', () => {
    const s = createInitialCombatState(nationalGuard, mechanics);
    const helmetBefore = s.armorLayers.find(l => l.hitZone === 'head')!;
    expect(helmetBefore.hp).toBe(90);
    expect(helmetBefore.broken).toBe(false);

    const act: CombatActionInput = {
      weapon: m9a3,
      input: { kind: 'firearm_shot', hitZone: 'head' },
      resolvedAttack: m9a3.attacks[0],
      hitZone: 'head'
    };

    const { nextState, log } = transition(s, act, { perks: [], enemy: nationalGuard, mechanics });
    const helmetAfter = nextState.armorLayers.find(l => l.hitZone === 'head')!;

    expect(log.penetratedArmor).toBe(false);
    expect(log.armorDamage).toBeGreaterThan(0);
    expect(helmetAfter.hp).toBeLessThan(90);
    expect(nextState.targetHp).toBe(100); // Zombie took 0 damage because helmet absorbed it!
  });

  it('proves high-penetration firearm shot penetrates helmet and damages underlying zombie', () => {
    const s = createInitialCombatState(nationalGuard, mechanics);

    const act: CombatActionInput = {
      weapon: m14,
      input: { kind: 'firearm_shot', hitZone: 'head' },
      resolvedAttack: m14.attacks[0],
      hitZone: 'head'
    };

    const { nextState, log } = transition(s, act, { perks: [], enemy: nationalGuard, mechanics });

    expect(log.penetratedArmor).toBe(true);
    expect(log.finalDamage).toBeGreaterThan(50);
    expect(nextState.targetHp).toBeLessThan(100); // Bullet penetrated and damaged zombie!
  });

  it('proves helmet breaks when HP is depleted and excess damage passes through', () => {
    let s = createInitialCombatState(riotPolice, mechanics);
    const riotHelmet = s.armorLayers.find(l => l.hitZone === 'head')!;
    expect(riotHelmet.hp).toBe(60);

    // Cleaver Charged Headshot (50 damage)
    const act1: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'hold', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[2],
      hitZone: 'head'
    };
    const res1 = transition(s, act1, { perks: [], enemy: riotPolice, mechanics });
    expect(res1.log.armorDamage).toBe(50);
    expect(res1.log.armorHpAfter).toBe(10);
    expect(res1.log.armorBrokenNow).toBe(false);
    expect(res1.nextState.targetHp).toBe(100); // Helmet absorbed all 50 damage!

    // Second Cleaver Quick Headshot (28 damage vs 10 remaining helmet HP)
    const act2: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'right', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'head'
    };
    const res2 = transition(res1.nextState, act2, { perks: [], enemy: riotPolice, mechanics });

    expect(res2.log.armorBrokenNow).toBe(true);
    expect(res2.log.armorHpAfter).toBe(0);
    expect(res2.log.finalDamage).toBe(18); // 28 - 10 = 18 excess passed through!
    expect(res2.nextState.targetHp).toBe(82); // 100 - 18 = 82 HP!
  });

  it('proves solver tracks armor state and finds firearm kill recipes', () => {
    const recipes = solveCombat({
      weapon: m14,
      perks: [],
      enemy: nationalGuard,
      mechanics,
      constraints: {
        requireFirstInterrupt: false,
        safeOpener: false,
        preChargedOpener: false,
        requireKnockdownBeforeKill: false,
        minStaminaReserve: 0,
        allowShove: false,
        allowKick: false,
        allowCharged: false,
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
    expect(top.totalAmmoSpent).toBeGreaterThan(0);
  });
});
