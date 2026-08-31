import type { Weapon, Perk, Enemy, MechanicsConfig, LoadoutItem } from '../types';
import weaponsData from './snapshots/1.0.4.0/weapons.json';
import perksData from './snapshots/1.0.4.0/perks.json';
import enemiesData from './snapshots/1.0.4.0/enemies.json';
import mechanicsData from './snapshots/1.0.4.0/mechanics.json';
import itemsData from './snapshots/1.0.4.0/items.json';
import manifestData from './snapshots/1.0.4.0/manifest.json';
import provenanceData from './snapshots/1.0.4.0/provenance.json';

export const CURRENT_GAME_VERSION = '1.0.4.0';
export const APP_VERSION = 'v0.1.0-alpha';
export const APP_BUILD_NAME = 'Early Preview';

export const weapons: Weapon[] = weaponsData as unknown as Weapon[];
export const perks: Perk[] = perksData as unknown as Perk[];
export const enemies: Enemy[] = enemiesData as unknown as Enemy[];
export const mechanics: MechanicsConfig = mechanicsData as unknown as MechanicsConfig;
export const loadoutItems: LoadoutItem[] = itemsData as unknown as LoadoutItem[];
export const manifest = manifestData;
export const provenance = provenanceData;

export const weaponMap = new Map<number, Weapon>(weapons.map(w => [w.id, w]));
export const perkMap = new Map<number, Perk>(perks.map(p => [p.id, p]));
export const enemyMap = new Map<number, Enemy>(enemies.map(e => [e.id, e]));
export const loadoutItemMap = new Map<number, LoadoutItem>(loadoutItems.map(it => [it.id, it]));

export const weaponSlugMap = new Map<string, Weapon>(weapons.map(w => [w.slug, w]));
export const perkSlugMap = new Map<string, Perk>(perks.map(p => [p.slug, p]));
export const enemySlugMap = new Map<string, Enemy>(enemies.map(e => [e.slug, e]));
export const loadoutItemSlugMap = new Map<string, LoadoutItem>(loadoutItems.map(it => [it.slug, it]));

export function getWeaponById(id: number): Weapon | undefined {
  return weaponMap.get(id);
}

export function getPerkById(id: number): Perk | undefined {
  return perkMap.get(id);
}

export function getEnemyById(id: number): Enemy | undefined {
  return enemyMap.get(id);
}

export function getLoadoutItemById(id: number): LoadoutItem | undefined {
  return loadoutItemMap.get(id);
}

export function getMeleeWeapons(): Weapon[] {
  return weapons.filter(w => w.category === 'melee' && w.id !== 1);
}

export function getFirearms(): Weapon[] {
  return weapons.filter(w => w.category === 'firearm');
}

export function getMeleeBySubcategory() {
  return {
    bladed: weapons.filter(w => w.category === 'melee' && w.meleeCategory === 'bladed' && w.id !== 1),
    blunt: weapons.filter(w => w.category === 'melee' && w.meleeCategory === 'blunt' && w.id !== 1)
  };
}

export function getFirearmsBySubcategory() {
  return {
    handguns: weapons.filter(w => w.category === 'firearm' && w.gunCategory === 'handgun'),
    smgs: weapons.filter(w => w.category === 'firearm' && w.gunCategory === 'smg'),
    shotguns: weapons.filter(w => w.category === 'firearm' && w.gunCategory === 'shotgun'),
    rifles: weapons.filter(w => w.category === 'firearm' && (w.gunCategory === 'rifle' || w.gunCategory === 'heavy rifle'))
  };
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
