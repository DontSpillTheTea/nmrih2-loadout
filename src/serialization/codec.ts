import { deflateSync, inflateSync } from 'fflate';
import { z } from 'zod';
import type { Responder, Loadout, AppState } from '../types';
import { CURRENT_GAME_VERSION } from '../data/loader';

export type CodeFamily = 'N2B1' | 'N2C1' | 'N2S1' | 'N2A1';

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
  let h2 = 0x55555555;
  for (let i = 0; i < data.length; i++) {
    h1 ^= data[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (data[i] + i);
    h2 = Math.imul(h2, 0x01000193);
  }
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setUint32(0, h1 >>> 0, true);
  view.setUint32(4, h2 >>> 0, true);
  return uint8ArrayToBase64Url(buf);
}

// Zod schemas for runtime validation
const LoadoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  weaponId: z.number(),
  secondaryWeaponId: z.number().optional().nullable(),
  perkIds: z.array(z.number()),
  constraints: z.object({
    requireFirstInterrupt: z.boolean(),
    requireKnockdownBeforeKill: z.boolean(),
    minStaminaReserve: z.number(),
    allowShove: z.boolean(),
    allowKick: z.boolean(),
    allowCharged: z.boolean(),
    allowLimb: z.boolean(),
    targetHitZone: z.enum(['auto', 'head', 'body', 'limb']),
    difficulty: z.enum(['beginner', 'normal', 'hard', 'nightmare'])
  }),
  objective: z.enum(['fewest_attacks', 'fastest_kill', 'lowest_stamina', 'safest_kill', 'balanced'])
});

const ResponderSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number(),
  perkIds: z.array(z.number()),
  loadouts: z.array(LoadoutSchema),
  activeLoadoutId: z.string(),
  notes: z.string(),
  gameVersion: z.string(),
  updatedAt: z.string()
});

const EnvelopeSchema = z.object({
  t: z.enum(['B', 'C', 'S', 'A']),
  v: z.number(),
  g: z.string(),
  d: z.any()
});

export function encodePayload<T>(type: 'B' | 'C' | 'S' | 'A', data: T): string {
  const envelope = {
    t: type,
    v: 1,
    g: CURRENT_GAME_VERSION,
    d: data
  };

  const jsonStr = canonicalJsonStringify(envelope);
  const textEncoder = new TextEncoder();
  const rawBytes = textEncoder.encode(jsonStr);

  const compressed = deflateSync(rawBytes, { level: 9 });
  const payloadBase64 = uint8ArrayToBase64Url(compressed);
  const checksum = computeShortChecksum(compressed);

  const prefix = `N2${type}1`;
  return `${prefix}-${payloadBase64}.${checksum}`;
}

export function decodeCode(code: string): DecodedEnvelope {
  const trimmed = code.trim();
  const prefixMatch = trimmed.match(/^(N2[BCSA]1)-/);
  if (!prefixMatch) {
    throw new Error('Unsupported or unknown code prefix. Expected N2B1, N2C1, N2S1, or N2A1.');
  }

  const prefix = prefixMatch[1] as CodeFamily;
  const typeLetter = prefix.charAt(2) as 'B' | 'C' | 'S' | 'A';

  const dotIdx = trimmed.lastIndexOf('.');
  if (dotIdx <= 5) {
    throw new Error('Invalid code format. Expected Prefix-Payload.Checksum.');
  }

  const payloadB64 = trimmed.slice(5, dotIdx);
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

  if (typeLetter === 'B') {
    LoadoutSchema.parse(env.d);
  } else if (typeLetter === 'C') {
    ResponderSchema.parse(env.d);
  }

  return {
    family: prefix,
    type: typeLetter,
    version: env.v,
    gameVersion: env.g,
    data: env.d,
    isPatchMismatch: isMismatch,
    warning
  };
}

export function encodeBuild(loadout: Loadout): string {
  return encodePayload('B', loadout);
}

export function encodeResponder(responder: Responder): string {
  return encodePayload('C', responder);
}

export function encodeFullBackup(state: AppState): string {
  return encodePayload('A', state);
}
