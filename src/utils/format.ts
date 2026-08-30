import type { CombatRecipe, PlayerInput, HitZone } from '../types';

export function getActionLabel(input: PlayerInput, resolvedName?: string): string {
  if (input.kind === 'firearm_shot') {
    return 'Shoot';
  }
  if (input.kind === 'shove') {
    return 'Shove';
  }
  if (input.kind === 'kick') {
    return 'Kick';
  }
  const side = input.side === 'right' ? 'R' : 'L';
  if (input.kind === 'hold') {
    return `Charged ${side}`;
  }
  if (resolvedName && resolvedName.toLowerCase().includes('strong')) {
    return `Strong ${side}`;
  }
  return `Quick ${side}`;
}

export function formatActionSequence(recipe: CombatRecipe): string {
  return recipe.actions
    .map(act => getActionLabel(act.input, act.resolvedAttack?.name))
    .join(' → ');
}

export function formatActionPill(input: PlayerInput, hitZone: HitZone, resolvedName?: string): {
  label: string;
  icon: string;
  isCharged: boolean;
  isControl: boolean;
  isShot: boolean;
} {
  const isCharged = input.kind === 'hold';
  const isControl = input.kind === 'shove' || input.kind === 'kick';
  const isShot = input.kind === 'firearm_shot';
  const label = getActionLabel(input, resolvedName);
  const icon = hitZone === 'head' ? '🎯' : isCharged ? '⚡' : isControl ? '🛡️' : isShot ? '💥' : '';

  return {
    label,
    icon,
    isCharged,
    isControl,
    isShot
  };
}
