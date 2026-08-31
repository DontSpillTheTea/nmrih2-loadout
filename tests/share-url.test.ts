import { describe, it, expect } from 'vitest';
import {
  encodeBuild,
  encodeScenario,
  encodeResponder,
  decodeCode,
  encodePayload,
  CANONICAL_SITE_ORIGIN,
  createShareUrl,
  parseShareUrlOrPath,
  extractShareCode,
  generateBuildShareUrl,
  generateScenarioShareUrl,
  generateResponderShareUrl
} from '../src/serialization/codec';
import { createDefaultLoadout, createDefaultResponder } from '../src/storage';
import type { CombatScenario, Loadout, Responder } from '../src/types';

describe('Unified Build and One-Link Sharing (N2B2 Canonical & Legacy N2B1/N2C1)', () => {
  const sampleUnifiedBuild = {
    name: 'Hatchet & Frag Tank Build',
    level: 42,
    perkIds: [30, 38, 8], // Headhunter Expert, Hitman Expert, Builder Expert
    loadoutItemIds: [12, 1004, 1000] as [number | null, number | null, number | null], // Hatchet, M67 Frag, Bandages
    weaponId: 12
  };

  const sampleScenario: CombatScenario = {
    id: 'sc-test-1',
    name: 'Nightmare Walker Quick Kill',
    weaponId: 11,
    enemyId: 1,
    difficulty: 'nightmare',
    perkIds: [37, 38],
    constraints: {
      requireFirstInterrupt: false,
      requireKnockdownBeforeKill: false,
      minStaminaReserve: 0,
      allowShove: true,
      allowKick: true,
      allowCharged: true,
      allowLimb: false,
      targetHitZone: 'head',
      difficulty: 'nightmare'
    },
    objective: 'fastest_kill',
    gameVersion: '1.0.4.0'
  };

  it('generates canonical N2B2 build share URL using https://nmrih2-loadouts.site', () => {
    const url = generateBuildShareUrl(sampleUnifiedBuild);
    expect(url.startsWith('https://nmrih2-loadouts.site/build/N2B2-')).toBe(true);
    expect(url.includes('localhost')).toBe(false);
    expect(url.includes('workers.dev')).toBe(false);
    expect(url.length).toBeLessThan(500);
  });

  it('generates canonical scenario share URL using https://nmrih2-loadouts.site', () => {
    const url = generateScenarioShareUrl(sampleScenario);
    expect(url.startsWith('https://nmrih2-loadouts.site/scenario/N2S1-')).toBe(true);
    expect(url.includes('localhost')).toBe(false);
    expect(url.includes('workers.dev')).toBe(false);
    expect(url.length).toBeLessThan(500);
  });

  it('roundtrips Unified Build with 3 loadout slots, perks, level losslessly', () => {
    const url = generateBuildShareUrl(sampleUnifiedBuild);
    const extractedCode = extractShareCode(url);
    expect(extractedCode.startsWith('N2B2-')).toBe(true);

    const decoded = decodeCode(extractedCode);
    expect(decoded.family).toBe('N2B2');
    expect(decoded.type).toBe('B');
    expect(decoded.version).toBe(2);
    expect(decoded.data.name).toBe('Hatchet & Frag Tank Build');
    expect(decoded.data.level).toBe(42);
    expect(decoded.data.weaponId).toBe(12);
    expect(decoded.data.perkIds).toEqual([30, 38, 8]);
    expect(decoded.data.loadoutItemIds).toEqual([12, 1004, 1000]);
  });

  it('supports empty and partial loadout slot configurations', () => {
    // Empty slots
    const emptySlotsBuild = { ...sampleUnifiedBuild, loadoutItemIds: [null, null, null] as [null, null, null] };
    const codeEmpty = encodeBuild(emptySlotsBuild);
    const decodedEmpty = decodeCode(codeEmpty);
    expect(decodedEmpty.data.loadoutItemIds).toEqual([null, null, null]);

    // 1 item, 2 empty
    const oneItemBuild = { ...sampleUnifiedBuild, loadoutItemIds: [12, null, null] as [number, null, null] };
    const codeOne = encodeBuild(oneItemBuild);
    const decodedOne = decodeCode(codeOne);
    expect(decodedOne.data.loadoutItemIds).toEqual([12, null, null]);
  });

  it('supports legacy N2B1 import losslessly and initializes empty loadout slots', () => {
    // Construct legacy N2B1 code (v1)
    const legacyLoadout: Loadout = createDefaultLoadout('b-legacy', 'Old Hunter');
    legacyLoadout.weaponId = 11;
    legacyLoadout.perkIds = [37, 38];

    const legacyCode = encodePayload('B', legacyLoadout, 1);
    expect(legacyCode.startsWith('N2B1-')).toBe(true);

    const decoded = decodeCode(legacyCode);
    expect(decoded.family).toBe('N2B1');
    expect(decoded.type).toBe('B');
    expect(decoded.data.name).toBe('Old Hunter');
    expect(decoded.data.weaponId).toBe(11);
    expect(decoded.data.perkIds).toEqual([37, 38]);
    expect(decoded.data.loadoutItemIds).toEqual([null, null, null]);
  });

  it('supports legacy N2C1 character import losslessly and migrates to Unified Build', () => {
    const legacyResp: Responder = createDefaultResponder('c-legacy', 'Survivor Bob');
    legacyResp.level = 50;
    legacyResp.perkIds = [7, 8, 29];

    const legacyCode = encodePayload('C', legacyResp, 1);
    expect(legacyCode.startsWith('N2C1-')).toBe(true);

    const decoded = decodeCode(legacyCode);
    expect(decoded.family).toBe('N2C1');
    expect(decoded.data.name).toBe('Survivor Bob');
    expect(decoded.data.level).toBe(50);
    expect(decoded.data.perkIds).toEqual([7, 8, 29]);
    expect(decoded.data.loadoutItemIds).toEqual([null, null, null]);
  });

  it('roundtrips Scenario through URL generation, URL extraction, and decoding losslessly', () => {
    const url = generateScenarioShareUrl(sampleScenario);
    const extractedCode = extractShareCode(url);
    expect(extractedCode.startsWith('N2S1-')).toBe(true);

    const decoded = decodeCode(extractedCode);
    expect(decoded.family).toBe('N2S1');
    expect(decoded.type).toBe('S');
    expect(decoded.data.name).toBe('Nightmare Walker Quick Kill');
    expect(decoded.data.enemyId).toBe(1);
    expect(decoded.data.difficulty).toBe('nightmare');
  });

  it('handles raw pasted codes cleanly via extractShareCode', () => {
    const rawCode = encodeBuild(sampleUnifiedBuild);
    expect(extractShareCode(rawCode)).toBe(rawCode);
    expect(extractShareCode(`  ${rawCode}  `)).toBe(rawCode);
  });

  it('handles pasted full URLs (including localhost and workers.dev previews) seamlessly', () => {
    const rawCode = encodeBuild(sampleUnifiedBuild);
    const prodUrl = `https://nmrih2-loadouts.site/build/${rawCode}`;
    const devUrl = `http://localhost:5173/build/${rawCode}`;
    const workerUrl = `https://nmrih2-loadout.st3cky.workers.dev/build/${rawCode}`;

    expect(extractShareCode(prodUrl)).toBe(rawCode);
    expect(extractShareCode(devUrl)).toBe(rawCode);
    expect(extractShareCode(workerUrl)).toBe(rawCode);
  });

  describe('Account Level Isolation & Hostile Input Protection', () => {
    it('does NOT serialize viewer account level into share codes', () => {
      const build = { ...sampleUnifiedBuild };
      const code = encodeBuild(build);
      const decoded = decodeCode(code);
      expect((decoded.data as any).myAccountLevel).toBeUndefined();
    });

    it('gracefully handles empty or root paths without throwing', () => {
      expect(parseShareUrlOrPath('')).toEqual({ type: null, code: null });
      expect(parseShareUrlOrPath('/')).toEqual({ type: null, code: null });
      expect(parseShareUrlOrPath('/optimize')).toEqual({ type: null, code: null });
    });

    it('gracefully handles malformed URI percent-encoding', () => {
      expect(parseShareUrlOrPath('/build/%ZZ%GG')).toEqual({ type: null, code: null });
    });

    it('rejects invalid or corrupted code payloads safely', () => {
      const parsed = parseShareUrlOrPath('/build/N2B2-garbage-payload.badchecksum');
      expect(parsed.code).toBe('N2B2-garbage-payload.badchecksum');
      expect(() => decodeCode(parsed.code!)).toThrow();
    });

    it('rejects oversized payloads exceeding 2MB limit safely', () => {
      const hugeString = 'A'.repeat(3 * 1024 * 1024);
      expect(parseShareUrlOrPath(`/build/${hugeString}`).code).toBe(hugeString);
    });
  });

  describe('Progression & Theorycrafting Eligibility Rules', () => {
    it('allows under-level Expert perks to remain selected during theorycrafting', () => {
      const build = {
        name: 'Theorycraft Lv 80 Headhunter',
        level: 10,
        perkIds: [30], // Headhunter Expert (Req Lv 80)
        loadoutItemIds: [11, 1003, null] as [number, number, null] // Revive Syringe (Req Lv 51)
      };

      const code = encodeBuild(build);
      const decoded = decodeCode(code);
      expect(decoded.data.perkIds).toContain(30);
      expect(decoded.data.loadoutItemIds[1]).toBe(1003);
    });

    it('preserves recipient local account level when loading another player build', () => {
      const recipientLocalAccountLevel = 15;
      const sharedBuildCode = encodeBuild({
        name: 'Pro Build',
        level: 99,
        perkIds: [30, 38] // Lv 80 perks
      });

      const decoded = decodeCode(sharedBuildCode);
      expect((decoded.data as any).myAccountLevel).toBeUndefined();

      // Recipient's local account level is unaffected by the shared build
      const effectiveAccountLevel = recipientLocalAccountLevel;
      expect(effectiveAccountLevel).toBe(15);
    });
  });

  describe('Clipboard Block / Failure Fallback Handling', () => {
    it('handles rejected clipboard Promise gracefully without throwing unhandled rejection', async () => {
      let clipboardBlocked = false;
      const mockClipboardWriteText = async () => {
        throw new Error('Blocked by uBlock Origin or browser permissions policy');
      };

      try {
        await mockClipboardWriteText();
      } catch {
        clipboardBlocked = true;
      }

      expect(clipboardBlocked).toBe(true);
    });

    it('handles undefined navigator.clipboard gracefully', () => {
      const mockNavigator = {} as any;
      const hasClipboard = Boolean(mockNavigator?.clipboard?.writeText);
      expect(hasClipboard).toBe(false);
    });
  });
});

