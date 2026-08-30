import type { Weapon, Perk, Enemy, MechanicsConfig } from '../types';
import weaponsData from './snapshots/1.0.4.0/weapons.json';
import perksData from './snapshots/1.0.4.0/perks.json';
import enemiesData from './snapshots/1.0.4.0/enemies.json';
import mechanicsData from './snapshots/1.0.4.0/mechanics.json';
import manifestData from './snapshots/1.0.4.0/manifest.json';
import provenanceData from './snapshots/1.0.4.0/provenance.json';

export const CURRENT_GAME_VERSION = '1.0.4.0';

export const weapons: Weapon[] = weaponsData as unknown as Weapon[];
export const perks: Perk[] = perksData as unknown as Perk[];
export const enemies: Enemy[] = enemiesData as unknown as Enemy[];
export const mechanics: MechanicsConfig = mechanicsData as unknown as MechanicsConfig;
export const manifest = manifestData;
export const provenance = provenanceData;

export const weaponMap = new Map<number, Weapon>(weapons.map(w => [w.id, w]));
export const perkMap = new Map<number, Perk>(perks.map(p => [p.id, p]));
export const enemyMap = new Map<number, Enemy>(enemies.map(e => [e.id, e]));

export const weaponSlugMap = new Map<string, Weapon>(weapons.map(w => [w.slug, w]));
export const perkSlugMap = new Map<string, Perk>(perks.map(p => [p.slug, p]));
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

export function getMeleeWeapons(): Weapon[] {
  return weapons.filter(w => w.category === 'melee' && w.id !== 1);
}

export function getFirearms(): Weapon[] {
  return weapons.filter(w => w.category === 'firearm');
}

export function getUniversalUnarmed(): Weapon {
  return weapons.find(w => w.id === 1) || weapons[0];
}

export interface LogicalPerkGroup {
  baseSlug: string;
  name: string;
  description: string;
  tags: string[];
  standardPerk?: Perk;
  expertPerk?: Perk;
}

export function getLogicalPerkGroups(): LogicalPerkGroup[] {
  const map = new Map<string, LogicalPerkGroup>();

  for (const p of perks) {
    if (p.tier === 'retired') continue;
    const base = p.baseSlug || p.slug.replace('-expert', '');
    if (!map.has(base)) {
      map.set(base, {
        baseSlug: base,
        name: p.name.replace(' - Expert', '').replace(' Expert', ''),
        description: p.description,
        tags: p.tags
      });
    }
    const group = map.get(base)!;
    if (p.tier === 'expert') {
      group.expertPerk = p;
    } else {
      group.standardPerk = p;
    }
  }

  return Array.from(map.values());
}
