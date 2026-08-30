import { z } from 'zod';

export type HitZone = 'head' | 'body' | 'limb';

export type MeleeAttackType = 'quick' | 'strong' | 'charged';

export type AttackSource = 'melee' | 'shove' | 'kick' | 'firearm';

export type CombatPosture = 'standing' | 'flinched' | 'interrupted' | 'staggered' | 'downed';

export type EffectOperation = 'add' | 'multiply' | 'set' | 'min' | 'max';

export interface EffectCondition {
  source?: AttackSource;
  attackType?: MeleeAttackType | MeleeAttackType[];
  hitZone?: HitZone;
  handedness?: 'one-handed' | 'two-handed' | 'none';
  gunCategory?: string;
  isDowned?: boolean;
}

export interface EffectRule {
  stat: string; // 'damage' | 'stability_damage' | 'stamina_cost' | 'max_stamina' | 'max_hp' | 'damage_taken'
  operation: EffectOperation;
  value: number;
  stage: number; // 1: base flat, 2: category mults, 3: conditional mults, 4: state mults
  conditions: EffectCondition;
}

export interface AttackProfile {
  id: string;
  name: string;
  source: AttackSource;
  attackType?: MeleeAttackType;
  damageByHitZone: Record<HitZone, number>;
  stabilityDamage: number;
  staminaCost: number;
  ammoCost?: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  totalMs: number;
  maxTargets: number;
  range: number;
  pellets?: number;
  tags: string[];
}

export interface Weapon {
  id: number;
  slug: string;
  name: string;
  category: 'melee' | 'firearm';
  meleeCategory?: string;
  gunCategory?: string;
  handedness?: 'one-handed' | 'two-handed' | 'none';
  weightKg: number;
  playRate: number;
  chargedPlayRate: number;
  range?: number;
  magazineCapacity?: number;
  ammoType?: string;
  penetration?: number;
  pellets?: number;
  attacks: AttackProfile[];
  provenanceRef: string;
}

export interface Perk {
  id: number;
  slug: string;
  name: string;
  tier: 'standard' | 'expert' | 'retired';
  unlockAccountLevel: number;
  description: string;
  notes: string;
  tags: string[];
  effects: EffectRule[];
  provenanceRef: string;
}

export interface ArmorProfile {
  name: string;
  hitZone: HitZone;
  hp?: number;
  damageResistance?: number;
  stabilityResistance?: number;
  gunDamageResistance?: number;
  gunStabilityResistance?: number;
}

export interface Enemy {
  id: number;
  slug: string;
  name: string;
  baseHp: number;
  movementSpeed: number;
  limbHp: Partial<Record<string, number>>;
  stability: number;
  stabilityThresholds: {
    flinch: number;
    interrupt: number;
    stagger: number;
    knockdown: number;
  };
  armor: ArmorProfile[];
  tags: string[];
  provenanceRef: string;
}

export interface MechanicsConfig {
  gameVersion: string;
  schemaVersion: number;
  maxPerkSlots: number;
  basePlayerStamina: number;
  basePlayerHp: number;
  downedDamageMultiplier: number;
  shoveStaminaCost: number;
  stabilityThresholds: {
    flinch: number;
    interrupt: number;
    stagger: number;
    knockdown: number;
  };
  staminaStarvedModifiers: {
    damageMultiplier: number;
    limbDamageMultiplier: number;
    stabilityDamageMultiplier: number;
    staminaRegenDelaySeconds: number;
  };
  difficultyModifiers: Record<string, {
    enemyHpMultiplier: number;
    creditMultiplier: number;
    xpMultiplier?: number;
  }>;
  damageFormula: string;
}

export interface CombatState {
  targetHp: number;
  maxHp: number;
  limbHp: Record<string, number>;
  posture: CombatPosture;
  accumulatedStability: number;
  playerStamina: number;
  elapsedMs: number;
  ammoRemaining?: number;
  isDowned: boolean;
  isStaminaStarved: boolean;
  actionCount: number;
  controlAchievedAtMs?: number;
  flags: Record<string, boolean | number | string>;
}

export interface CombatActionInput {
  weapon: Weapon;
  attack: AttackProfile;
  hitZone: HitZone;
}

export interface TransitionLogStep {
  stepIndex: number;
  actionName: string;
  weaponName: string;
  hitZone: HitZone;
  baseDamage: number;
  additiveFlat: number;
  multiplicativeBonus: number;
  downedMultiplier: number;
  resistanceRatio: number;
  finalDamage: number;
  stabilityDamageDealt: number;
  postureBefore: CombatPosture;
  postureAfter: CombatPosture;
  hpBefore: number;
  hpAfter: number;
  staminaCost: number;
  staminaBefore: number;
  staminaAfter: number;
  actionDurationMs: number;
  timeElapsedMs: number;
  isDownedHit: boolean;
  notes: string[];
}

export interface TransitionResult {
  nextState: CombatState;
  log: TransitionLogStep;
}

export type OptimizerObjective =
  | 'fewest_attacks'
  | 'fastest_kill'
  | 'lowest_stamina'
  | 'safest_kill'
  | 'balanced';

export interface OptimizerConstraints {
  requireFirstInterrupt: boolean;
  requireKnockdownBeforeKill: boolean;
  minStaminaReserve: number;
  allowShove: boolean;
  allowKick: boolean;
  allowCharged: boolean;
  allowLimb: boolean;
  targetHitZone: 'auto' | 'head' | 'body' | 'limb';
  difficulty: 'beginner' | 'normal' | 'hard' | 'nightmare';
}

export interface CombatRecipe {
  id: string;
  weapon: Weapon;
  actions: CombatActionInput[];
  totalActions: number;
  totalTimeMs: number;
  totalStaminaSpent: number;
  totalAmmoSpent: number;
  timeToFirstControlMs: number | null;
  firstControlActionIndex: number | null;
  targetKilled: boolean;
  downedMultiplierUsed: boolean;
  finalState: CombatState;
  logs: TransitionLogStep[];
  paretoRank?: number;
}

export interface Loadout {
  id: string;
  name: string;
  weaponId: number;
  secondaryWeaponId?: number;
  perkIds: number[];
  constraints: OptimizerConstraints;
  objective: OptimizerObjective;
}

export interface Responder {
  id: string;
  name: string;
  level: number;
  perkIds: number[];
  loadouts: Loadout[];
  activeLoadoutId: string;
  notes: string;
  gameVersion: string;
  updatedAt: string;
}

export interface AppState {
  version: number;
  activeGameVersion: string;
  activeResponderId: string;
  responders: Responder[];
  settings: {
    enableAnalytics: boolean;
    defaultObjective: OptimizerObjective;
  };
}
