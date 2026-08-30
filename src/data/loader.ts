import weaponsData from './snapshots/1.0.4.0/weapons.json';
import perksData from './snapshots/1.0.4.0/perks.json';
import enemiesData from './snapshots/1.0.4.0/enemies.json';
import mechanicsData from './snapshots/1.0.4.0/mechanics.json';
import provenanceData from './snapshots/1.0.4.0/provenance.json';
import manifestData from './snapshots/1.0.4.0/manifest.json';

import type { Weapon, Perk, Enemy, MechanicsConfig } from '../types';

export const CURRENT_GAME_VERSION = '1.0.4.0';

export const weapons: Weapon[] = weaponsData as unknown as Weapon[];
export const perks: Perk[] = perksData as unknown as Perk[];
export const enemies: Enemy[] = enemiesData as unknown as Enemy[];
export const mechanics: MechanicsConfig = mechanicsData as unknown as MechanicsConfig;
export const provenance = provenanceData as Record<string, any>;
export const manifest = manifestData;

// Lookup maps for O(1) retrieval
export const weaponMap = new Map<number, Weapon>(weapons.map(w => [w.id, w]));
export const weaponSlugMap = new Map<string, Weapon>(weapons.map(w => [w.slug, w]));

export const perkMap = new Map<number, Perk>(perks.map(p => [p.id, p]));
export const perkSlugMap = new Map<string, Perk>(perks.map(p => [p.slug, p]));

export const enemyMap = new Map<number, Enemy>(enemies.map(e => [e.id, e]));
export const enemySlugMap = new Map<string, Enemy>(enemies.map(e => [e.slug, e]));

export function getWeaponById(id: number): Weapon | undefined {
  return weaponMap.get(id);
}

export function getPerkById(id: number): Perk | undefined {
  return perkMap.get(id);
}

export function getEnemyById(id: number): Enemy | undefined {
  return enemyMap.get(id);
}

export function getUniversalUnarmed(): Weapon {
  return weaponMap.get(1) || weapons[0];
}

export function getMeleeWeapons(): Weapon[] {
  return weapons.filter(w => w.category === 'melee' && w.id !== 1);
}

export function getFirearms(): Weapon[] {
  return weapons.filter(w => w.category === 'firearm');
}

export function getAvailablePerks(includeRetired = false): Perk[] {
  if (includeRetired) return perks;
  return perks.filter(p => p.tier !== 'retired');
}
