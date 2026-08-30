import type { AttackProfile, HitZone, Weapon, Perk, Enemy, CombatState, MechanicsConfig, ArmorLayer } from '../types';

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
  armorDamage: number;
  armorHpAfter: number;
  armorBrokenNow: boolean;
  penetratedArmor: boolean;
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

  // Pre-armor unmitigated total damage
  const rawDamage = (baseDamage + mods.additiveFlat) * (1 + mods.multiplicativeRatio) * downedMult * staminaStarvedPenalty;

  // Layered Armor & Penetration Processing
  let finalDamage = rawDamage;
  let armorDamage = 0;
  let armorHpAfter = 0;
  let armorBrokenNow = false;
  let penetratedArmor = false;
  let resistanceRatio = 0;

  const activeArmorLayer = currentState.armorLayers.find(l => l.hitZone === hitZone && !l.broken);

  if (activeArmorLayer) {
    const weaponPenetration = weapon.penetration ?? 0;
    const reqPenetration = activeArmorLayer.penetrationThreshold;

    if (weapon.category === 'firearm' && weaponPenetration >= reqPenetration && reqPenetration > 0) {
      // Penetrates armor layer directly
      penetratedArmor = true;
      armorDamage = Math.round(rawDamage * 0.5);
      armorHpAfter = Math.max(0, activeArmorLayer.hp - armorDamage);
      if (armorHpAfter === 0) armorBrokenNow = true;
      finalDamage = rawDamage; // Full damage reaches underlying zombie
      mods.notes.push(`Penetrated ${activeArmorLayer.name} (Pen ${weaponPenetration} >= ${reqPenetration})`);
    } else {
      // Non-penetrating hit against armor layer
      // Helmet absorbs 100% until broken; Body vest absorbs according to damageAbsorptionRatio
      const isHelmet = activeArmorLayer.hitZone === 'head';
      resistanceRatio = isHelmet ? 1.0 : activeArmorLayer.damageAbsorptionRatio;

      if (rawDamage < activeArmorLayer.hp) {
        armorDamage = rawDamage;
        armorHpAfter = activeArmorLayer.hp - rawDamage;
        finalDamage = isHelmet ? 0 : (rawDamage * (1 - activeArmorLayer.damageAbsorptionRatio));
        mods.notes.push(`${activeArmorLayer.name} absorbed ${rawDamage.toFixed(1)} damage (Remaining: ${armorHpAfter.toFixed(1)} HP)`);
      } else {
        // Armor breaks, excess damage passes through
        armorDamage = activeArmorLayer.hp;
        armorHpAfter = 0;
        armorBrokenNow = true;
        const passThrough = rawDamage - activeArmorLayer.hp;
        finalDamage = passThrough;
        mods.notes.push(`${activeArmorLayer.name} BROKEN! ${passThrough.toFixed(1)} excess damage passed through to body`);
      }
    }
  }

  // Calculate final stability damage with armor mitigation
  let stabilityDamage = Math.round(attack.stabilityDamage * stabilityMult);
  if (activeArmorLayer && !penetratedArmor) {
    const stabResistance = activeArmorLayer.stabilityResistance > 0
      ? activeArmorLayer.stabilityResistance
      : (activeArmorLayer.hitZone === 'head' ? 0.50 : 0.30);
    stabilityDamage = Math.round(stabilityDamage * (1 - stabResistance));
    mods.notes.push(`${activeArmorLayer.name}: ${Math.round(stabResistance * 100)}% stability resistance applied`);
  }

  const staminaCost = Math.round(attack.staminaCost * mods.staminaMultiplier);

  return {
    baseDamage,
    additiveFlat: mods.additiveFlat,
    multiplicativeRatio: mods.multiplicativeRatio,
    downedMultiplier: downedMult,
    resistanceRatio,
    armorDamage,
    armorHpAfter,
    armorBrokenNow,
    penetratedArmor,
    finalDamage: Math.round(finalDamage * 100) / 100,
    stabilityDamage,
    staminaCost,
    isDownedHit,
    notes: mods.notes
  };
}
