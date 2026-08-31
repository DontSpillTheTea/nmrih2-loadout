import { uint8ArrayToBase64Url } from '../src/serialization/codec';

export interface D1Database {
  prepare(query: string): {
    bind(...args: any[]): {
      first<T = any>(): Promise<T | null>;
      all<T = any>(): Promise<{ results: T[] }>;
      run(): Promise<{ success: boolean; meta?: any }>;
    };
  };
}

export interface SharedBuildRecord {
  id: string;
  codec_version: string;
  payload: string;
  created_at: number;
  payload_hash?: string;
}

export async function computeSha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function computeShortId(code: string, attempt = 0): Promise<string> {
  const encoder = new TextEncoder();
  const dataToHash = attempt === 0 ? code : `${code}:salt:${attempt}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataToHash));
  const hashBytes = new Uint8Array(hashBuffer);

  // Take first 9 bytes (72 bits) -> exactly 12 Base64URL chars
  const slice = hashBytes.slice(0, 9);
  return uint8ArrayToBase64Url(slice);
}

export async function saveBuildToD1(
  db: D1Database,
  code: string,
  codecVersion = 'N2B2'
): Promise<{ id: string; isNew: boolean }> {
  const payloadHash = await computeSha256Hex(code);

  // 1. Deduplication lookup by payload hash
  const existing = await db
    .prepare('SELECT id, payload FROM shared_builds WHERE payload_hash = ? LIMIT 1')
    .bind(payloadHash)
    .first<SharedBuildRecord>();

  if (existing && existing.id) {
    return { id: existing.id, isNew: false };
  }

  // 2. Insert with collision resolution
  let attempt = 0;
  while (attempt < 5) {
    const candidateId = await computeShortId(code, attempt);

    // Check if ID is already occupied by a different build
    const idRow = await db
      .prepare('SELECT id, payload_hash FROM shared_builds WHERE id = ? LIMIT 1')
      .bind(candidateId)
      .first<SharedBuildRecord>();

    if (!idRow) {
      // Slot is free, insert
      await db
        .prepare(
          'INSERT INTO shared_builds (id, codec_version, payload, created_at, payload_hash) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(candidateId, codecVersion, code, Date.now(), payloadHash)
        .run();

      return { id: candidateId, isNew: true };
    } else if (idRow.payload_hash === payloadHash) {
      return { id: candidateId, isNew: false };
    }

    // Hash collision with a different build, retry with next salt
    attempt++;
  }

  throw new Error('Failed to allocate unique short ID after multiple attempts');
}

export async function getBuildFromD1(
  db: D1Database,
  id: string
): Promise<SharedBuildRecord | null> {
  // Validate ID format (8-32 URL-safe chars)
  if (!id || !/^[A-Za-z0-9_-]{8,32}$/.test(id)) {
    return null;
  }

  const row = await db
    .prepare('SELECT id, codec_version, payload, created_at FROM shared_builds WHERE id = ? LIMIT 1')
    .bind(id)
    .first<SharedBuildRecord>();

  return row || null;
}
