import { deflateSync, inflateSync } from 'fflate';
import { z } from 'zod';
import type { Responder, Loadout, CombatScenario, AppState, OptimizerConstraints, OptimizerObjective } from '../types';
import { CURRENT_GAME_VERSION } from '../data/loader';

export type CodeFamily = 'N2B1' | 'N2B2' | 'N2C1' | 'N2S1' | 'N2A1';

export interface DecodedEnvelope<T = any> {
  family: CodeFamily;
  type: 'B' | 'C' | 'S' | 'A';
  version: number;
  gameVersion: string;
  data: T;
  isPatchMismatch: boolean;
  warning?: string;
}

// Base64URL helpers (RFC 4648 §5)
export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Deterministic canonical JSON stringifier (omits undefined, sorts keys)
export function canonicalJsonStringify(obj: any): string {
  if (obj === undefined) {
    return 'null';
  }
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => (item === undefined ? 'null' : canonicalJsonStringify(item))).join(',') + ']';
  }
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort();
  const pairs = keys.map(k => JSON.stringify(k) + ':' + canonicalJsonStringify(obj[k]));
  return '{' + pairs.join(',') + '}';
}

// Synchronous fast checksum (8-byte hash -> 11 char base64url)
export function computeShortChecksum(data: Uint8Array): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x5f356495;
  const len = data.length;
  for (let i = 0; i < len; i++) {
    const byte = data[i];
    h1 = Math.imul(h1 ^ byte, 0x01000193);
    h2 = Math.imul(h2 ^ byte, 0x27d4eb2f);
  }
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, h1 >>> 0, true);
  view.setUint32(4, h2 >>> 0, true);
  return uint8ArrayToBase64Url(new Uint8Array(buffer));
}

// Zod schemas for runtime validation
const ConstraintsSchema = z.object({
  requireFirstInterrupt: z.boolean().default(true),
  safeOpener: z.boolean().optional(),
  preChargedOpener: z.boolean().optional(),
  requireKnockdownBeforeKill: z.boolean().default(false),
  minStaminaReserve: z.number().default(0),
  allowShove: z.boolean().default(true),
  allowKick: z.boolean().default(true),
  allowCharged: z.boolean().default(true),
  allowLimb: z.boolean().default(false),
  targetHitZone: z.enum(['auto', 'head', 'body', 'limb']).default('head'),
  difficulty: z.enum(['beginner', 'normal', 'hard', 'nightmare']).default('normal')
});

const ObjectiveSchema = z.enum([
  'fastest_kill',
  'lowest_stamina',
  'safest_kill',
  'efficient_control',
  'fewest_attacks',
  'balanced'
]);

export const UnifiedBuildSchema = z.object({
  name: z.string().default('Shared Build'),
  level: z.number().default(1),
  perkIds: z.array(z.number()).default([]),
  loadoutItemIds: z.tuple([
    z.number().nullable().default(null),
    z.number().nullable().default(null),
    z.number().nullable().default(null)
  ]).default([null, null, null]),
  weaponId: z.number().default(10),
  secondaryWeaponId: z.number().optional().nullable(),
  constraints: ConstraintsSchema.optional(),
  objective: ObjectiveSchema.optional()
});

export type UnifiedBuild = z.infer<typeof UnifiedBuildSchema>;

const LoadoutSchema = z.object({
  id: z.string().optional(),
  name: z.string().default('Shared Build'),
  weaponId: z.number().default(10),
  secondaryWeaponId: z.number().optional().nullable(),
  perkIds: z.array(z.number()).default([]),
  constraints: ConstraintsSchema.optional(),
  objective: ObjectiveSchema.optional()
});

const ScenarioSchema = z.object({
  id: z.string().optional(),
  name: z.string().default('Shared Scenario'),
  weaponId: z.number(),
  enemyId: z.number(),
  difficulty: z.enum(['beginner', 'normal', 'hard', 'nightmare']).default('normal'),
  perkIds: z.array(z.number()).default([]),
  constraints: ConstraintsSchema.default({
    requireFirstInterrupt: true,
    requireKnockdownBeforeKill: false,
    minStaminaReserve: 0,
    allowShove: true,
    allowKick: true,
    allowCharged: true,
    allowLimb: false,
    targetHitZone: 'head',
    difficulty: 'normal'
  }),
  objective: ObjectiveSchema.default('fastest_kill'),
  gameVersion: z.string().default(CURRENT_GAME_VERSION)
});

const ResponderSchema = z.object({
  id: z.string().optional(),
  name: z.string().default('Shared Responder'),
  level: z.number().default(1),
  perkIds: z.array(z.number()).default([]),
  loadouts: z.array(LoadoutSchema).optional().default([]),
  activeLoadoutId: z.string().optional(),
  notes: z.string().optional().default(''),
  gameVersion: z.string().optional().default(CURRENT_GAME_VERSION),
  updatedAt: z.string().optional()
});

const EnvelopeSchema = z.object({
  t: z.enum(['B', 'C', 'S', 'A']),
  v: z.number(),
  g: z.string(),
  d: z.any()
});

export function encodePayload<T>(type: 'B' | 'C' | 'S' | 'A', data: T, version: number = (type === 'B' ? 2 : 1)): string {
  const envelope = {
    t: type,
    v: version,
    g: CURRENT_GAME_VERSION,
    d: data
  };

  const jsonStr = canonicalJsonStringify(envelope);
  const textEncoder = new TextEncoder();
  const rawBytes = textEncoder.encode(jsonStr);

  const compressed = deflateSync(rawBytes, { level: 9 });
  const payloadBase64 = uint8ArrayToBase64Url(compressed);
  const checksum = computeShortChecksum(compressed);

  const prefix = `N2${type}${version}`;
  return `${prefix}-${payloadBase64}.${checksum}`;
}

export function decodeCode(code: string): DecodedEnvelope {
  const trimmed = code.trim();
  const prefixMatch = trimmed.match(/^(N2[BCSA][12])-/) || trimmed.match(/^(N2[BCSA]1)-/);
  if (!prefixMatch) {
    throw new Error('Unsupported or unknown code prefix. Expected N2B2, N2B1, N2C1, N2S1, or N2A1.');
  }

  const prefix = prefixMatch[1] as CodeFamily;
  const typeLetter = prefix.charAt(2) as 'B' | 'C' | 'S' | 'A';

  const dotIdx = trimmed.lastIndexOf('.');
  if (dotIdx <= prefix.length) {
    throw new Error('Invalid code format. Expected Prefix-Payload.Checksum.');
  }

  const payloadB64 = trimmed.slice(prefix.length + 1, dotIdx);
  const checksum = trimmed.slice(dotIdx + 1);

  if (!payloadB64 || !checksum) {
    throw new Error('Invalid code format. Payload or Checksum is empty.');
  }

  let compressedBytes: Uint8Array;
  try {
    compressedBytes = base64UrlToUint8Array(payloadB64);
  } catch (e) {
    throw new Error('Corrupt or malformed Base64URL code payload.');
  }

  const expectedChecksum = computeShortChecksum(compressedBytes);
  if (checksum !== expectedChecksum) {
    throw new Error('Checksum mismatch! Code may be corrupted or truncated.');
  }

  let decompressed: Uint8Array;
  try {
    decompressed = inflateSync(compressedBytes);
  } catch (e) {
    throw new Error('Failed to decompress share code payload.');
  }

  if (decompressed.length > 2 * 1024 * 1024) {
    throw new Error('Payload exceeds 2MB maximum safety limit.');
  }

  const textDecoder = new TextDecoder();
  const jsonStr = textDecoder.decode(decompressed);

  let rawObj: any;
  try {
    rawObj = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Invalid JSON content in decompressed payload.');
  }

  const env = EnvelopeSchema.parse(rawObj);
  const isMismatch = env.g !== CURRENT_GAME_VERSION;
  let warning: string | undefined;

  if (isMismatch) {
    warning = `Created for NMRiH2 patch ${env.g}. Current active version is ${CURRENT_GAME_VERSION}. Some balance numbers or weapon stats may differ.`;
  }

  let processedData = env.d;

  if (typeLetter === 'B') {
    if (env.v === 2) {
      processedData = UnifiedBuildSchema.parse(env.d);
    } else {
      // Legacy N2B1 (v1)
      const legacy = LoadoutSchema.parse(env.d);
      processedData = {
        name: legacy.name,
        level: 1,
        perkIds: legacy.perkIds || [],
        loadoutItemIds: [null, null, null],
        weaponId: legacy.weaponId || 10,
        secondaryWeaponId: legacy.secondaryWeaponId,
        constraints: legacy.constraints,
        objective: legacy.objective
      };
    }
  } else if (typeLetter === 'C') {
    // Legacy N2C1
    const legacyResp = ResponderSchema.parse(env.d);
    processedData = {
      name: legacyResp.name,
      level: legacyResp.level || 1,
      perkIds: legacyResp.perkIds || [],
      loadoutItemIds: [null, null, null],
      weaponId: legacyResp.loadouts?.[0]?.weaponId || 10
    };
  } else if (typeLetter === 'S') {
    processedData = ScenarioSchema.parse(env.d);
  }

  return {
    family: prefix,
    type: typeLetter,
    version: env.v,
    gameVersion: env.g,
    data: processedData,
    isPatchMismatch: isMismatch,
    warning
  };
}

export function encodeBuild(build: {
  name?: string;
  level?: number;
  perkIds?: number[];
  loadoutItemIds?: [number | null, number | null, number | null];
  weaponId?: number;
  secondaryWeaponId?: number | null;
  constraints?: OptimizerConstraints;
  objective?: OptimizerObjective;
}): string {
  const unifiedData: UnifiedBuild = {
    name: build.name || 'Shared Build',
    level: build.level ?? 1,
    perkIds: build.perkIds || [],
    loadoutItemIds: build.loadoutItemIds || [null, null, null],
    weaponId: build.weaponId ?? 10,
    secondaryWeaponId: build.secondaryWeaponId,
    constraints: build.constraints,
    objective: build.objective
  };
  return encodePayload('B', unifiedData, 2);
}

export function encodeResponder(responder: Responder): string {
  return encodeBuild({
    name: responder.name,
    level: responder.level,
    perkIds: responder.perkIds,
    loadoutItemIds: responder.loadoutItemIds,
    weaponId: responder.loadouts?.[0]?.weaponId
  });
}

export function encodeScenario(scenario: CombatScenario): string {
  return encodePayload('S', scenario, 1);
}

export function encodeFullBackup(state: AppState): string {
  return encodePayload('A', state, 1);
}

// Canonical Public Site URL
export const CANONICAL_SITE_ORIGIN = 'https://nmrih2-loadouts.site';

export function createShareUrl(code: string): string {
  const prefix = code.slice(0, 4);
  let path = 'build';
  if (prefix.startsWith('N2B')) path = 'build';
  else if (prefix.startsWith('N2S')) path = 'scenario';
  else if (prefix.startsWith('N2C')) path = 'character';
  else return `${CANONICAL_SITE_ORIGIN}/#${code}`;

  return `${CANONICAL_SITE_ORIGIN}/${path}/${encodeURIComponent(code)}`;
}

export function createShortBuildUrl(id: string): string {
  return `${CANONICAL_SITE_ORIGIN}/b/${id}`;
}

export function parseShareUrlOrPath(urlOrPath: string): {
  type: 'B' | 'C' | 'S' | 'short_build' | null;
  code: string | null;
  shortId?: string;
} {
  if (!urlOrPath) return { type: null, code: null };
  let input = urlOrPath.trim();

  // If it's a full URL, extract path
  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const url = new URL(input);
      input = url.pathname;
    } catch {
      // Fallback
    }
  }

  // Handle short build route /b/<shortId>
  const matchShort = input.match(/^\/?b\/([A-Za-z0-9_-]{8,32})/i);
  if (matchShort) {
    return { type: 'short_build', code: null, shortId: matchShort[1] };
  }

  // Handle /build/<codeOrPayload>, /scenario/<codeOrPayload>, /character/<codeOrPayload>
  const match = input.match(/^\/?(build|scenario|character)\/([^/?#]+)/i);
  if (match) {
    const route = match[1].toLowerCase();
    let rawPayload = '';
    try {
      rawPayload = decodeURIComponent(match[2].trim());
    } catch {
      return { type: null, code: null };
    }

    let typeLetter: 'B' | 'C' | 'S' = 'B';
    if (route === 'scenario') typeLetter = 'S';
    else if (route === 'character') typeLetter = 'C';

    return { type: typeLetter, code: rawPayload };
  }

  return { type: null, code: null };
}

export function extractShareCode(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const parsed = parseShareUrlOrPath(trimmed);
  if (parsed.code) {
    return parsed.code;
  }
  return trimmed;
}

export function generateBuildShareUrl(build: {
  name?: string;
  level?: number;
  perkIds?: number[];
  loadoutItemIds?: [number | null, number | null, number | null];
  weaponId?: number;
  secondaryWeaponId?: number | null;
  constraints?: OptimizerConstraints;
  objective?: OptimizerObjective;
}): string {
  return createShareUrl(encodeBuild(build));
}

export function generateScenarioShareUrl(scenario: CombatScenario): string {
  return createShareUrl(encodeScenario(scenario));
}

export function generateResponderShareUrl(responder: Responder): string {
  return createShareUrl(encodeResponder(responder));
}
