import { describe, it, expect } from 'vitest';
import { getWeaponById, getEnemyById, getPerkById, mechanics } from '../src/data/loader';
import { createInitialCombatState, transition } from '../src/engine/transition';
import type { CombatActionInput } from '../src/types';

describe('19 Required Verification Fixture Test Cases', () => {
  const pipeSmall = getWeaponById(18)!;  // Pipe (Small) - ID 18
  const cleaver = getWeaponById(11)!;    // Cleaver - ID 11
  const fireAxe = getWeaponById(15)!;    // Fire Axe - ID 15 (Two-Handed)
  const walker = getEnemyById(1)!;       // Walker (100 HP)
  const nationalGuard = getEnemyById(7)!;// National Guard (Armored)

  // Perks
  const headhunter = getPerkById(29)!;        // +10% melee headshot
  const hitman = getPerkById(37)!;            // +15% 1H weapon
  const hardBlow = getPerkById(25)!;          // +15% 2H stability damage
  const foreman = getPerkById(19)!;           // +10 kick flat damage

  it('1. Neutral melee opener resolves to Quick Attack', () => {
    const s = createInitialCombatState(walker, mechanics);
    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'head'
    };
    const { log } = transition(s, act, { perks: [], enemy: walker, mechanics });
    expect(log.resolvedActionName).toBe('Quick Attack');
  });

  it('2. Alternating Quick chain (Left -> Right -> Left)', () => {
    let s = createInitialCombatState(walker, mechanics);
    const sides: Array<'left' | 'right'> = ['left', 'right', 'left'];
    for (const side of sides) {
      const act: CombatActionInput = {
        weapon: cleaver,
        input: { kind: 'tap', side, hitZone: 'head' },
        resolvedAttack: cleaver.attacks[0],
        hitZone: 'head'
      };
      const res = transition(s, act, { perks: [], enemy: walker, mechanics });
      expect(res.log.resolvedActionName).toBe('Quick Attack');
      s = res.nextState;
    }
  });

  it('3. Same-direction Strong chain (Left -> Left)', () => {
    let s = createInitialCombatState(walker, mechanics);
    const act1: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'head'
    };
    const res1 = transition(s, act1, { perks: [], enemy: walker, mechanics });
    expect(res1.log.resolvedActionName).toBe('Quick Attack');

    const act2: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'head'
    };
    const res2 = transition(res1.nextState, act2, { perks: [], enemy: walker, mechanics });
    expect(res2.log.resolvedActionName).toBe('Strong Attack');
  });

  it('4. Charged opener from neutral', () => {
    const s = createInitialCombatState(walker, mechanics);
    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'hold', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[2],
      hitZone: 'head'
    };
    const { log } = transition(s, act, { perks: [], enemy: walker, mechanics });
    expect(log.resolvedActionName).toBe('Charged Attack');
  });

  it('5. Shove deals 20 stability damage and triggers Interrupt posture', () => {
    const s = createInitialCombatState(walker, mechanics);
    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'shove' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'body'
    };
    const { nextState, log } = transition(s, act, { perks: [], enemy: walker, mechanics });
    expect(log.staminaCost).toBe(15);
    expect(log.stabilityDamageDealt).toBe(20);
    expect(nextState.posture).toBe('interrupted');
  });

  it('6. Kick deals 100 stability and forces Downed posture (Knockdown)', () => {
    const s = createInitialCombatState(walker, mechanics);
    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'kick' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'body'
    };
    const { nextState, log } = transition(s, act, { perks: [], enemy: walker, mechanics });
    expect(log.staminaCost).toBe(50);
    expect(log.stabilityDamageDealt).toBe(100);
    expect(nextState.posture).toBe('downed');
    expect(nextState.isDowned).toBe(true);
  });

  it('7. Downed damage bonus doubles damage (2.0x)', () => {
    let s = createInitialCombatState(walker, mechanics);
    s.posture = 'downed';
    s.isDowned = true;

    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'head'
    };
    const { log } = transition(s, act, { perks: [], enemy: walker, mechanics });
    expect(log.isDownedHit).toBe(true);
    expect(log.downedMultiplier).toBe(2.0);
    expect(log.finalDamage).toBe(log.baseDamage * 2.0);
  });

  it('8. Hitman only applies 1H bonus', () => {
    const s = createInitialCombatState(walker, mechanics);
    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'body' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'body'
    };
    const { log } = transition(s, act, { perks: [hitman], enemy: walker, mechanics });
    expect(log.multiplicativeBonus).toBeCloseTo(0.15);
  });

  it('9. Headhunter only applies headshot bonus', () => {
    const s = createInitialCombatState(walker, mechanics);
    const actHead: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'head'
    };
    const resHead = transition(s, actHead, { perks: [headhunter], enemy: walker, mechanics });
    expect(resHead.log.multiplicativeBonus).toBeCloseTo(0.10);

    const actBody: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'body' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'body'
    };
    const resBody = transition(s, actBody, { perks: [headhunter], enemy: walker, mechanics });
    expect(resBody.log.multiplicativeBonus).toBe(0);
  });

  it('10. Hitman + Headhunter sums multiplicative percentage bonuses', () => {
    const s = createInitialCombatState(walker, mechanics);
    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'head'
    };
    const { log } = transition(s, act, { perks: [hitman, headhunter], enemy: walker, mechanics });
    // 0.15 + 0.10 = 0.25 (25% increase)
    expect(log.multiplicativeBonus).toBeCloseTo(0.25);
    expect(log.finalDamage).toBe(Math.round(log.baseDamage * 1.25 * 100) / 100);
  });

  it('11. Hard Blow applies stability bonus to two-handed weapons (Fire Axe)', () => {
    const s = createInitialCombatState(walker, mechanics);
    const act: CombatActionInput = {
      weapon: fireAxe,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: fireAxe.attacks[0],
      hitZone: 'head'
    };
    const { log } = transition(s, act, { perks: [hardBlow], enemy: walker, mechanics });
    // Fire Axe Quick stability is Math.round(10 * (1 + 0.15)) = 12
    expect(log.stabilityDamageDealt).toBe(12);
  });

  it('12. Foreman adds flat bonus to Kick', () => {
    const s = createInitialCombatState(walker, mechanics);
    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'kick' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'body'
    };
    const { log } = transition(s, act, { perks: [foreman], enemy: walker, mechanics });
    expect(log.additiveFlat).toBe(10);
    expect(log.finalDamage).toBe(10);
  });

  it('13. Stamina-starved state applies 10% damage and 50% stability penalty at 0 stamina', () => {
    let s = createInitialCombatState(walker, mechanics);
    s.playerStamina = 0;
    s.isStaminaStarved = true;

    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'body' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'body'
    };
    const { log } = transition(s, act, { perks: [], enemy: walker, mechanics });
    expect(log.finalDamage).toBe(Math.round(log.baseDamage * 0.90 * 100) / 100);
  });

  it('14. Armored zombie interaction respects damage resistance', () => {
    const s = createInitialCombatState(nationalGuard, mechanics);
    const act: CombatActionInput = {
      weapon: cleaver,
      input: { kind: 'tap', side: 'left', hitZone: 'head' },
      resolvedAttack: cleaver.attacks[0],
      hitZone: 'head'
    };
    const { log } = transition(s, act, { perks: [], enemy: nationalGuard, mechanics });
    expect(log.resistanceRatio).toBeGreaterThan(0);
    expect(log.finalDamage).toBeLessThan(log.baseDamage);
  });

  it('15. Difficulty scaling adjusts HP (Beginner 0.7x HP)', () => {
    const sNorm = createInitialCombatState(walker, mechanics, 'normal');
    const sBeg = createInitialCombatState(walker, mechanics, 'beginner');
    expect(sNorm.targetHp).toBe(100);
    expect(sBeg.targetHp).toBe(70);
  });

  it('16. Blunt weapon (Pipe Small) properties verified', () => {
    expect(pipeSmall.meleeCategory).toBe('blunt');
    expect(pipeSmall.handedness).toBe('one-handed');
  });

  it('17. Bladed 1H weapon (Cleaver) properties verified', () => {
    expect(cleaver.meleeCategory).toBe('bladed');
    expect(cleaver.handedness).toBe('one-handed');
  });

  it('18. Two-handed weapon (Fire Axe) properties verified', () => {
    expect(fireAxe.handedness).toBe('two-handed');
  });

  it('19. Small Pipe vs Walker analysis proves 4-5 quick hits with knockdown combo', () => {
    let s = createInitialCombatState(walker, mechanics);
    // Left Tap (Quick Head -> 20 dmg)
    let res = transition(s, { weapon: pipeSmall, input: { kind: 'tap', side: 'left', hitZone: 'head' }, resolvedAttack: pipeSmall.attacks[0], hitZone: 'head' }, { perks: [], enemy: walker, mechanics });
    expect(res.log.finalDamage).toBe(20);
    expect(res.nextState.posture).toBe('interrupted'); // 25 stab >= 20

    // Right Tap (Quick Head -> 20 dmg)
    res = transition(res.nextState, { weapon: pipeSmall, input: { kind: 'tap', side: 'right', hitZone: 'head' }, resolvedAttack: pipeSmall.attacks[0], hitZone: 'head' }, { perks: [], enemy: walker, mechanics });
    expect(res.log.finalDamage).toBe(20);
    expect(res.nextState.posture).toBe('staggered'); // 50 stab >= 50

    // Left Tap (Quick Head -> 20 dmg)
    res = transition(res.nextState, { weapon: pipeSmall, input: { kind: 'tap', side: 'left', hitZone: 'head' }, resolvedAttack: pipeSmall.attacks[0], hitZone: 'head' }, { perks: [], enemy: walker, mechanics });
    expect(res.log.finalDamage).toBe(20);

    // Right Tap (Quick Head -> 20 dmg -> 100 stability -> Knockdown!)
    res = transition(res.nextState, { weapon: pipeSmall, input: { kind: 'tap', side: 'right', hitZone: 'head' }, resolvedAttack: pipeSmall.attacks[0], hitZone: 'head' }, { perks: [], enemy: walker, mechanics });
    expect(res.nextState.posture).toBe('downed');

    // Finisher on Downed (2.0x = 40 dmg)
    res = transition(res.nextState, { weapon: pipeSmall, input: { kind: 'tap', side: 'left', hitZone: 'head' }, resolvedAttack: pipeSmall.attacks[0], hitZone: 'head' }, { perks: [], enemy: walker, mechanics });
    expect(res.log.finalDamage).toBe(40);
    expect(res.nextState.targetHp).toBe(0);
  });
});
