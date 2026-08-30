import type { AttackProfile, HitZone, Weapon, Perk, Enemy, CombatState, MechanicsConfig } from '../types';

export interface EvaluatedModifiers {
  additiveFlat: number;
  multiplicativeRatio: number;
  stabilityMultiplier: number;
  staminaMultiplier: number;
  notes: string[];
}

export function evaluatePerkModifiers(
  weapon: Weapon,
  attack: AttackProfile,
  hitZone: HitZone,
  perks: Perk[],
  currentState: CombatState
): EvaluatedModifiers {
  let additiveFlat = 0;
  let multiplicativeRatio = 0;
  let stabilityMultiplier = 1.0;
  let staminaMultiplier = 1.0;
  const notes: string[] = [];

  for (const perk of perks) {
    for (const effect of perk.effects) {
      const cond = effect.conditions;
      let matches = true;

      if (cond.source && cond.source !== attack.source) {
        matches = false;
      }
      if (cond.attackType) {
        const types = Array.isArray(cond.attackType) ? cond.attackType : [cond.attackType];
        if (!attack.attackType || !types.includes(attack.attackType)) {
          matches = false;
        }
      }
      if (cond.hitZone && cond.hitZone !== hitZone) {
        matches = false;
      }
      if (cond.handedness && cond.handedness !== weapon.handedness) {
        matches = false;
      }
      if (cond.gunCategory && cond.gunCategory !== weapon.gunCategory) {
        matches = false;
      }
      if (cond.isDowned !== undefined && cond.isDowned !== currentState.isDowned) {
        matches = false;
      }

      if (matches) {
        if (effect.stat === 'damage') {
          if (effect.operation === 'add') {
            additiveFlat += effect.value;
            notes.push(`${perk.name}: +${effect.value} flat damage`);
          } else if (effect.operation === 'multiply') {
            multiplicativeRatio += effect.value;
            notes.push(`${perk.name}: +${Math.round(effect.value * 100)}% damage`);
          }
        } else if (effect.stat === 'stability_damage' && effect.operation === 'multiply') {
          stabilityMultiplier += effect.value;
          notes.push(`${perk.name}: +${Math.round(effect.value * 100)}% stability`);
        } else if (effect.stat === 'stamina_cost' && effect.operation === 'multiply') {
          staminaMultiplier += effect.value;
          notes.push(`${perk.name}: ${effect.value >= 0 ? '+' : ''}${Math.round(effect.value * 100)}% stamina cost`);
        }
      }
    }
  }

  return {
    additiveFlat,
    multiplicativeRatio,
    stabilityMultiplier,
    staminaMultiplier,
    notes
  };
}

export interface DamageCalculationResult {
  baseDamage: number;
  additiveFlat: number;
  multiplicativeRatio: number;
  downedMultiplier: number;
  resistanceRatio: number;
  finalDamage: number;
  stabilityDamage: number;
  staminaCost: number;
  isDownedHit: boolean;
  notes: string[];
}

export function calculateAttackDamage(
  weapon: Weapon,
  attack: AttackProfile,
  hitZone: HitZone,
  perks: Perk[],
  enemy: Enemy,
  currentState: CombatState,
  mechanics: MechanicsConfig
): DamageCalculationResult {
  const baseDamage = attack.damageByHitZone[hitZone] ?? 0;
  const mods = evaluatePerkModifiers(weapon, attack, hitZone, perks, currentState);

  let stabilityMult = mods.stabilityMultiplier;
  let staminaStarvedPenalty = 1.0;

  if (currentState.isStaminaStarved) {
    staminaStarvedPenalty = 0.90; // 10% penalty
    stabilityMult *= 0.50; // 50% stability penalty
    mods.notes.push('Stamina Starved: 10% damage & 50% stability penalty');
  }

  const isDownedHit = currentState.isDowned;
  const downedMult = isDownedHit ? mechanics.downedDamageMultiplier : 1.0;
  if (isDownedHit) {
    mods.notes.push(`Target Downed: ${downedMult}x damage bonus`);
  }

  // Calculate armor resistance
  let resistanceRatio = 0.0;
  let stabilityResistance = 0.0;
  for (const armor of enemy.armor) {
    if (armor.hitZone === hitZone) {
      if (attack.source === 'firearm') {
        resistanceRatio = Math.max(resistanceRatio, armor.gunDamageResistance ?? 0);
        stabilityResistance = Math.max(stabilityResistance, armor.gunStabilityResistance ?? 0);
      } else {
        resistanceRatio = Math.max(resistanceRatio, armor.damageResistance ?? 0);
        stabilityResistance = Math.max(stabilityResistance, armor.stabilityResistance ?? 0);
      }
    }
  }

  // Exact game formula: (Base + Additive) * (1 + sum(Multiplicative)) * Downed * (1 - Resistance) * StaminaPenalty
  const rawDamage = (baseDamage + mods.additiveFlat) *
    (1 + mods.multiplicativeRatio) *
    downedMult *
    (1 - resistanceRatio) *
    staminaStarvedPenalty;

  const finalDamage = Math.max(0, Math.round(rawDamage * 100) / 100);

  // Stability Damage
  const baseStability = attack.stabilityDamage ?? 0;
  const stabilityDamage = Math.max(0, Math.round(baseStability * stabilityMult * (1 - stabilityResistance)));

  // Stamina cost
  const rawStamina = attack.staminaCost * Math.max(0.1, mods.staminaMultiplier);
  const finalStamina = Math.round(rawStamina * 10) / 10;

  return {
    baseDamage,
    additiveFlat: mods.additiveFlat,
    multiplicativeRatio: mods.multiplicativeRatio,
    downedMultiplier: downedMult,
    resistanceRatio,
    finalDamage,
    stabilityDamage,
    staminaCost: finalStamina,
    isDownedHit,
    notes: mods.notes
  };
}
