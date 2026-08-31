import { describe, it, expect } from 'vitest';
import {
  encodeBuild,
  encodeResponder,
  encodeScenario,
  encodeFullBackup,
  decodeCode,
  encodePayload
} from '../src/serialization/codec';
import { createDefaultLoadout, createDefaultResponder, createInitialAppState } from '../src/storage';
import type { CombatScenario, Loadout, Responder } from '../src/types';

describe('Serialization and Compact Share Codes (N2B2, N2B1, N2C1, N2S1, N2A1)', () => {
  it('encodes and decodes Unified Build (N2B2) roundtrip losslessly', () => {
    const build = {
      name: 'Hatchet Hunter',
      level: 42,
      weaponId: 12,
      perkIds: [29, 30, 37], // Headhunter, Headhunter Expert, Hitman
      loadoutItemIds: [12, 1000, null] as [number | null, number | null, number | null]
    };

    const code = encodeBuild(build);
    expect(code.startsWith('N2B2-')).toBe(true);

    const decoded = decodeCode(code);
    expect(decoded.family).toBe('N2B2');
    expect(decoded.type).toBe('B');
    expect(decoded.version).toBe(2);
    expect(decoded.data.name).toBe('Hatchet Hunter');
    expect(decoded.data.level).toBe(42);
    expect(decoded.data.weaponId).toBe(12);
    expect(decoded.data.perkIds).toEqual([29, 30, 37]);
    expect(decoded.data.loadoutItemIds).toEqual([12, 1000, null]);
  });

  it('encodes and decodes legacy Responder (N2C1) and migrates to Unified Build', () => {
    const responder = createDefaultResponder('c-test', 'Anthony Specialist');
    responder.level = 42;
    responder.perkIds = [7, 8, 19, 29, 37];

    const legacyCode = encodePayload('C', responder, 1);
    expect(legacyCode.startsWith('N2C1-')).toBe(true);

    const decoded = decodeCode(legacyCode);
    expect(decoded.family).toBe('N2C1');
    expect(decoded.data.name).toBe('Anthony Specialist');
    expect(decoded.data.level).toBe(42);
    expect(decoded.data.perkIds).toEqual([7, 8, 19, 29, 37]);
    expect(decoded.data.loadoutItemIds).toEqual([null, null, null]);
  });

  it('encodes and decodes Scenario (N2S1) roundtrip losslessly', () => {
    const scenario: CombatScenario = {
      id: 'sc-1',
      name: 'Prime Runner Cleaver Test',
      weaponId: 11,
      enemyId: 5,
      difficulty: 'hard',
      perkIds: [29, 37],
      constraints: {
        requireFirstInterrupt: true,
        requireKnockdownBeforeKill: false,
        minStaminaReserve: 10,
        allowShove: true,
        allowKick: true,
        allowCharged: true,
        allowLimb: false,
        targetHitZone: 'head',
        difficulty: 'hard'
      },
      objective: 'fastest_kill',
      gameVersion: '1.0.4.0'
    };

    const code = encodeScenario(scenario);
    expect(code.startsWith('N2S1-')).toBe(true);

    const decoded = decodeCode(code);
    expect(decoded.family).toBe('N2S1');
    expect(decoded.type).toBe('S');
    expect(decoded.data.name).toBe('Prime Runner Cleaver Test');
    expect(decoded.data.enemyId).toBe(5);
    expect(decoded.data.constraints.requireFirstInterrupt).toBe(true);
  });

  it('encodes and decodes Full App Backup (N2A1) roundtrip', () => {
    const appState = createInitialAppState();
    const code = encodeFullBackup(appState);
    expect(code.startsWith('N2A1-')).toBe(true);

    const decoded = decodeCode(code);
    expect(decoded.family).toBe('N2A1');
    expect(decoded.type).toBe('A');
    expect(decoded.data.responders.length).toBe(1);
  });

  it('detects and rejects corrupted checksum safely', () => {
    const loadout = createDefaultLoadout();
    const code = encodeBuild(loadout);
    const lastDot = code.lastIndexOf('.');
    const corruptedCode = code.slice(0, lastDot + 1) + 'INVALID';

    expect(() => decodeCode(corruptedCode)).toThrow(/Checksum mismatch/);
  });

  it('rejects unknown code prefixes', () => {
    expect(() => decodeCode('UNKNOWN-XXXX.YYYY')).toThrow(/Unsupported or unknown code prefix/);
  });
});
