import type { Weapon, PlayerInput, CombatState, AttackProfile } from '../types';
import { getUniversalUnarmed } from '../data/loader';

export interface ResolvedInputResult {
  resolvedAttack: AttackProfile;
  resolvingWeapon: Weapon;
  resolvedAttackType: 'quick' | 'strong' | 'charged' | 'shove' | 'kick' | 'firearm';
  inputDescription: string;
  nextMeleeSide: 'left' | 'right' | null;
  nextAttackType: 'quick' | 'strong' | 'charged' | 'shove' | 'kick' | 'firearm' | null;
}

export function resolvePlayerInput(
  weapon: Weapon,
  input: PlayerInput,
  currentState: CombatState
): ResolvedInputResult {
  const unarmed = getUniversalUnarmed();

  if (input.kind === 'shove') {
    const shoveAttack = unarmed.attacks.find(a => a.id === 'shove') || unarmed.attacks[0];
    return {
      resolvedAttack: shoveAttack,
      resolvingWeapon: unarmed,
      resolvedAttackType: 'shove',
      inputDescription: 'Shove (Interrupt)',
      nextMeleeSide: currentState.lastMeleeSide ?? null,
      nextAttackType: 'shove'
    };
  }

  if (input.kind === 'kick') {
    const kickAttack = unarmed.attacks.find(a => a.id === 'kick') || unarmed.attacks[1];
    return {
      resolvedAttack: kickAttack,
      resolvingWeapon: unarmed,
      resolvedAttackType: 'kick',
      inputDescription: 'Kick (Knockdown)',
      nextMeleeSide: null,
      nextAttackType: 'kick'
    };
  }

  if (weapon.category === 'firearm') {
    const shotAttack = weapon.attacks.find(a => a.id === 'single_shot') || weapon.attacks[0];
    return {
      resolvedAttack: shotAttack,
      resolvingWeapon: weapon,
      resolvedAttackType: 'firearm',
      inputDescription: 'Fire Shot',
      nextMeleeSide: null,
      nextAttackType: 'firearm'
    };
  }

  const side = input.side || 'left';
  const sideLabel = side === 'left' ? 'Left' : 'Right';

  if (input.kind === 'hold') {
    const chargedAttack = weapon.attacks.find(a => a.attackType === 'charged') || weapon.attacks[0];
    return {
      resolvedAttack: chargedAttack,
      resolvingWeapon: weapon,
      resolvedAttackType: 'charged',
      inputDescription: `Hold ${sideLabel} (Charged ${sideLabel})`,
      nextMeleeSide: side,
      nextAttackType: 'charged'
    };
  }

  // Tap input: Directional combo state resolution
  if (currentState.lastMeleeSide === null || currentState.lastMeleeSide === undefined) {
    // Neutral opener -> Always Quick attack
    const quickAttack = weapon.attacks.find(a => a.attackType === 'quick') || weapon.attacks[0];
    return {
      resolvedAttack: quickAttack,
      resolvingWeapon: weapon,
      resolvedAttackType: 'quick',
      inputDescription: `Tap ${sideLabel} from Neutral (Quick ${sideLabel})`,
      nextMeleeSide: side,
      nextAttackType: 'quick'
    };
  }

  if (currentState.lastMeleeSide === side) {
    // Same-direction repeat -> Strong attack
    const strongAttack = weapon.attacks.find(a => a.attackType === 'strong') || weapon.attacks[0];
    return {
      resolvedAttack: strongAttack,
      resolvingWeapon: weapon,
      resolvedAttackType: 'strong',
      inputDescription: `Tap ${sideLabel} repeated (Strong ${sideLabel})`,
      nextMeleeSide: side,
      nextAttackType: 'strong'
    };
  }

  // Alternating direction -> Quick attack
  const quickAttack = weapon.attacks.find(a => a.attackType === 'quick') || weapon.attacks[0];
  return {
    resolvedAttack: quickAttack,
    resolvingWeapon: weapon,
    resolvedAttackType: 'quick',
    inputDescription: `Tap ${sideLabel} alternating (Quick ${sideLabel})`,
    nextMeleeSide: side,
    nextAttackType: 'quick'
  };
}
