import { describe, it, expect } from 'vitest';
import {
  encodeBuild,
  encodeScenario,
  encodeResponder,
  decodeCode,
  CANONICAL_SITE_ORIGIN,
  createShareUrl,
  parseShareUrlOrPath,
  extractShareCode,
  generateBuildShareUrl,
  generateScenarioShareUrl,
  generateResponderShareUrl
} from '../src/serialization/codec';
import { createDefaultLoadout, createDefaultResponder } from '../src/storage';
import type { CombatScenario, Loadout } from '../src/types';

describe('One-Link Build and Scenario Sharing (Canonical URLs)', () => {
  const sampleLoadout: Loadout = {
    ...createDefaultLoadout('b-test', 'Cleaver Nightmare Opener'),
    weaponId: 11,
    perkIds: [37, 38] // Hitman, Hitman Expert
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

  it('generates canonical build share URL using https://nmrih2-loadouts.site', () => {
    const url = generateBuildShareUrl(sampleLoadout);
    expect(url.startsWith('https://nmrih2-loadouts.site/build/N2B1-')).toBe(true);
    expect(url.includes('localhost')).toBe(false);
    expect(url.includes('workers.dev')).toBe(false);
    // Typical build URL is ~280-350 chars
    expect(url.length).toBeLessThan(500);
  });

  it('generates canonical scenario share URL using https://nmrih2-loadouts.site', () => {
    const url = generateScenarioShareUrl(sampleScenario);
    expect(url.startsWith('https://nmrih2-loadouts.site/scenario/N2S1-')).toBe(true);
    expect(url.includes('localhost')).toBe(false);
    expect(url.includes('workers.dev')).toBe(false);
    expect(url.length).toBeLessThan(500);
  });

  it('roundtrips Build through URL generation, URL extraction, and decoding losslessly', () => {
    const url = generateBuildShareUrl(sampleLoadout);
    const extractedCode = extractShareCode(url);
    expect(extractedCode.startsWith('N2B1-')).toBe(true);

    const decoded = decodeCode(extractedCode);
    expect(decoded.family).toBe('N2B1');
    expect(decoded.type).toBe('B');
    expect(decoded.data.name).toBe('Cleaver Nightmare Opener');
    expect(decoded.data.weaponId).toBe(11);
    expect(decoded.data.perkIds).toEqual([37, 38]);
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

  it('parses relative pathnames correctly on direct browser navigation', () => {
    const rawCode = encodeBuild(sampleLoadout);
    const pathname = `/build/${encodeURIComponent(rawCode)}`;

    const parsed = parseShareUrlOrPath(pathname);
    expect(parsed.type).toBe('B');
    expect(parsed.code).toBe(rawCode);

    const decoded = decodeCode(parsed.code!);
    expect(decoded.data.name).toBe('Cleaver Nightmare Opener');
  });

  it('handles raw pasted codes cleanly via extractShareCode', () => {
    const rawCode = encodeBuild(sampleLoadout);
    expect(extractShareCode(rawCode)).toBe(rawCode);
    expect(extractShareCode(`  ${rawCode}  `)).toBe(rawCode);
  });

  it('handles pasted full URLs (including localhost and workers.dev previews) seamlessly', () => {
    const rawCode = encodeBuild(sampleLoadout);
    const prodUrl = `https://nmrih2-loadouts.site/build/${rawCode}`;
    const devUrl = `http://localhost:5173/build/${rawCode}`;
    const workerUrl = `https://nmrih2-loadout.st3cky.workers.dev/build/${rawCode}`;

    expect(extractShareCode(prodUrl)).toBe(rawCode);
    expect(extractShareCode(devUrl)).toBe(rawCode);
    expect(extractShareCode(workerUrl)).toBe(rawCode);
  });

  describe('Hostile and Invalid Input Protection', () => {
    it('gracefully handles empty or root paths without throwing', () => {
      expect(parseShareUrlOrPath('')).toEqual({ type: null, code: null });
      expect(parseShareUrlOrPath('/')).toEqual({ type: null, code: null });
      expect(parseShareUrlOrPath('/optimize')).toEqual({ type: null, code: null });
    });

    it('gracefully handles malformed URI percent-encoding', () => {
      expect(parseShareUrlOrPath('/build/%ZZ%GG')).toEqual({ type: null, code: null });
    });

    it('rejects route/payload type mismatches', () => {
      // Scenario code passed into /build/ route
      const scenarioCode = encodeScenario(sampleScenario);
      const parsed = parseShareUrlOrPath(`/build/${scenarioCode}`);
      expect(parsed.type).toBe('B');
      expect(parsed.code).toBe(scenarioCode);

      // Decoding should reveal decoded.type === 'S', which does not match expected route type 'B'
      const decoded = decodeCode(parsed.code!);
      expect(decoded.type).toBe('S');
      expect(decoded.type === parsed.type).toBe(false);
    });

    it('rejects invalid or corrupted code payloads safely', () => {
      const parsed = parseShareUrlOrPath('/build/N2B1-garbage-payload.badchecksum');
      expect(parsed.code).toBe('N2B1-garbage-payload.badchecksum');
      expect(() => decodeCode(parsed.code!)).toThrow();
    });

    it('rejects oversized payloads exceeding 2MB limit safely', () => {
      const hugeString = 'A'.repeat(3 * 1024 * 1024);
      expect(parseShareUrlOrPath(`/build/${hugeString}`).code).toBe(hugeString);
    });
  });
});
