import { z } from 'zod';
import type { AppState, Responder, Loadout } from '../types';
import { CURRENT_GAME_VERSION } from '../data/loader';

export const STORAGE_KEY = 'nmrih2-optimizer:state:v1';

export function createDefaultLoadout(id: string = 'loadout-1', name: string = 'Cleaver Build'): Loadout {
  return {
    id,
    name,
    weaponId: 11, // Cleaver
    secondaryWeaponId: undefined,
    perkIds: [31, 39], // Headhunter (31), Hitman (39)
    constraints: {
      requireFirstInterrupt: false,
      requireKnockdownBeforeKill: false,
      minStaminaReserve: 0,
      allowShove: true,
      allowKick: true,
      allowCharged: true,
      allowLimb: false,
      targetHitZone: 'head',
      difficulty: 'normal'
    },
    objective: 'fewest_attacks'
  };
}

export function createDefaultResponder(id: string = 'resp-1', name: string = 'Lead Responder'): Responder {
  const defaultLoadout = createDefaultLoadout();
  return {
    id,
    name,
    level: 25,
    perkIds: [31, 39, 7], // Headhunter, Hitman, Athlete
    loadouts: [defaultLoadout],
    activeLoadoutId: defaultLoadout.id,
    notes: 'Default Responder profile for general melee runs.',
    gameVersion: CURRENT_GAME_VERSION,
    updatedAt: new Date().toISOString()
  };
}

export function createInitialAppState(): AppState {
  const defaultResp = createDefaultResponder();
  return {
    version: 1,
    activeGameVersion: CURRENT_GAME_VERSION,
    activeResponderId: defaultResp.id,
    responders: [defaultResp],
    settings: {
      enableAnalytics: false,
      defaultObjective: 'fewest_attacks'
    }
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialAppState();
      saveAppState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.responders) || parsed.responders.length === 0) {
      const initial = createInitialAppState();
      saveAppState(initial);
      return initial;
    }
    return parsed as AppState;
  } catch (e) {
    console.warn('Failed to load state from localStorage, falling back to defaults:', e);
    const initial = createInitialAppState();
    return initial;
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

export function resetAppState(): AppState {
  const initial = createInitialAppState();
  saveAppState(initial);
  return initial;
}
