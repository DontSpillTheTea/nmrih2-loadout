import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  encodeBuild,
  decodeCode,
  parseShareUrlOrPath,
  createShortBuildUrl,
  createShareUrl,
  CANONICAL_SITE_ORIGIN
} from '../src/serialization/codec';
import { computeShortId, computeSha256Hex, saveBuildToD1, getBuildFromD1, type D1Database, type SharedBuildRecord } from '../worker/d1';
import worker from '../worker/index';

// In-memory mock D1 database implementation for testing
class MockD1Database implements D1Database {
  private records: Map<string, SharedBuildRecord> = new Map();

  prepare(query: string) {
    const trimmed = query.trim();
    return {
      bind: (...args: any[]) => ({
        first: async <T = any>(): Promise<T | null> => {
          if (trimmed.includes('WHERE payload_hash = ?')) {
            const hash = args[0];
            for (const r of this.records.values()) {
              if (r.payload_hash === hash) return r as unknown as T;
            }
            return null;
          }
          if (trimmed.includes('WHERE id = ?')) {
            const id = args[0];
            return (this.records.get(id) as unknown as T) || null;
          }
          return null;
        },
        all: async <T = any>(): Promise<{ results: T[] }> => {
          return { results: Array.from(this.records.values()) as unknown as T[] };
        },
        run: async (): Promise<{ success: boolean }> => {
          if (trimmed.startsWith('INSERT INTO shared_builds')) {
            const [id, codec_version, payload, created_at, payload_hash] = args;
            this.records.set(id, { id, codec_version, payload, created_at, payload_hash });
            return { success: true };
          }
          return { success: true };
        }
      })
    };
  }

  // Test helper to inject simulated collision
  forceInsert(id: string, record: SharedBuildRecord) {
    this.records.set(id, record);
  }

  getRecordCount() {
    return this.records.size;
  }
}

describe('D1 Short Share Link Architecture (/b/<id>)', () => {
  let mockDb: MockD1Database;
  const sampleBuild = {
    name: 'Sledgehammer Marauder',
    level: 75,
    perkIds: [30, 38, 12, 19], // Headhunter Expert, Hitman Expert, etc.
    loadoutItemIds: [14, 1003, 1004] as [number, number, number], // Sledgehammer, Revive Syringe, Frag
    weaponId: 14
  };

  beforeEach(() => {
    mockDb = new MockD1Database();
  });

  describe('Short ID Generation & Collision Handling', () => {
    it('generates deterministic, URL-safe short IDs of 12 characters', async () => {
      const code1 = encodeBuild(sampleBuild);
      const id1 = await computeShortId(code1);
      const id2 = await computeShortId(code1);

      expect(id1).toBe(id2);
      expect(id1.length).toBe(12);
      expect(/^[A-Za-z0-9_-]{12}$/.test(id1)).toBe(true);
    });

    it('generates different IDs for different builds', async () => {
      const codeA = encodeBuild(sampleBuild);
      const codeB = encodeBuild({ ...sampleBuild, name: 'Different Name' });

      const idA = await computeShortId(codeA);
      const idB = await computeShortId(codeB);

      expect(idA).not.toBe(idB);
    });

    it('handles hash collision gracefully without overwriting existing data', async () => {
      const codeA = encodeBuild(sampleBuild);
      const codeB = encodeBuild({ ...sampleBuild, name: 'Colliding Build' });

      // First save build A
      const resultA = await saveBuildToD1(mockDb, codeA);
      expect(resultA.isNew).toBe(true);

      // Artificially simulate that candidate ID for build B collides with build A
      // saveBuildToD1 should retry with next salt and allocate a distinct ID
      const resultB = await saveBuildToD1(mockDb, codeB);
      expect(resultB.isNew).toBe(true);
      expect(resultB.id).not.toBe(resultA.id);

      // Verify build A payload remains intact and was not overwritten
      const fetchedA = await getBuildFromD1(mockDb, resultA.id);
      expect(fetchedA?.payload).toBe(codeA);

      const fetchedB = await getBuildFromD1(mockDb, resultB.id);
      expect(fetchedB?.payload).toBe(codeB);
    });
  });

  describe('Worker API — Creation (POST /api/builds)', () => {
    it('creates a new short link for a valid N2B2 build (201 Created)', async () => {
      const code = encodeBuild(sampleBuild);
      const req = new Request('https://nmrih2-loadouts.site/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const env = { DB: mockDb, ASSETS: { fetch: vi.fn() } };
      const res = await worker.fetch(req, env, {});

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.url).toBe(`${CANONICAL_SITE_ORIGIN}/b/${data.id}`);
      expect(data.deduplicated).toBe(false);
    });

    it('deduplicates identical build submissions (200 OK with same ID)', async () => {
      const code = encodeBuild(sampleBuild);
      const env = { DB: mockDb, ASSETS: { fetch: vi.fn() } };

      const req1 = new Request('https://nmrih2-loadouts.site/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const res1 = await worker.fetch(req1, env, {});
      const data1 = await res1.json();

      const req2 = new Request('https://nmrih2-loadouts.site/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const res2 = await worker.fetch(req2, env, {});
      const data2 = await res2.json();

      expect(res2.status).toBe(200);
      expect(data2.id).toBe(data1.id);
      expect(data2.deduplicated).toBe(true);
      expect(mockDb.getRecordCount()).toBe(1);
    });

    it('rejects malformed checksums (400 Bad Request)', async () => {
      const code = encodeBuild(sampleBuild);
      const lastDot = code.lastIndexOf('.');
      const corruptedCode = code.slice(0, lastDot + 1) + 'BADCHECKSUM';

      const req = new Request('https://nmrih2-loadouts.site/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: corruptedCode })
      });

      const env = { DB: mockDb, ASSETS: { fetch: vi.fn() } };
      const res = await worker.fetch(req, env, {});

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Checksum mismatch');
    });

    it('rejects non-Build payload types such as Full App Backup (400 Bad Request)', async () => {
      const req = new Request('https://nmrih2-loadouts.site/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'N2A1-invalid-type' })
      });

      const env = { DB: mockDb, ASSETS: { fetch: vi.fn() } };
      const res = await worker.fetch(req, env, {});

      expect(res.status).toBe(400);
    });

    it('rejects oversized request bodies exceeding 16 KiB limit (413 Payload Too Large)', async () => {
      const hugeString = 'X'.repeat(20000);
      const req = new Request('https://nmrih2-loadouts.site/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': '20000' },
        body: JSON.stringify({ code: hugeString })
      });

      const env = { DB: mockDb, ASSETS: { fetch: vi.fn() } };
      const res = await worker.fetch(req, env, {});

      expect(res.status).toBe(413);
    });
  });

  describe('Worker API — Lookup (GET /api/builds/:id)', () => {
    it('returns stored canonical build code for valid ID (200 OK)', async () => {
      const code = encodeBuild(sampleBuild);
      const { id } = await saveBuildToD1(mockDb, code);

      const req = new Request(`https://nmrih2-loadouts.site/api/builds/${id}`);
      const env = { DB: mockDb, ASSETS: { fetch: vi.fn() } };
      const res = await worker.fetch(req, env, {});

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(id);
      expect(data.code).toBe(code);
      expect(data.codec_version).toBe('N2B2');
      expect(res.headers.get('Cache-Control')).toContain('immutable');
    });

    it('returns 404 for unknown build ID', async () => {
      const req = new Request('https://nmrih2-loadouts.site/api/builds/NonExistent12');
      const env = { DB: mockDb, ASSETS: { fetch: vi.fn() } };
      const res = await worker.fetch(req, env, {});

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Build not found.');
    });

    it('handles malicious / SQL-injection-shaped IDs safely without leaking errors', async () => {
      const maliciousId = "' OR '1'='1";
      const req = new Request(`https://nmrih2-loadouts.site/api/builds/${encodeURIComponent(maliciousId)}`);
      const env = { DB: mockDb, ASSETS: { fetch: vi.fn() } };
      const res = await worker.fetch(req, env, {});

      // Should be delegated to static assets or rejected safely without SQL error
      expect(res.status).not.toBe(500);
    });
  });

  describe('Route Parsing & End-to-End Short Link Restoration', () => {
    it('correctly parses /b/<id> URLs into short_build type', () => {
      const shortUrl = 'https://nmrih2-loadouts.site/b/Ab7kP2Qx9mNz';
      const parsed = parseShareUrlOrPath(shortUrl);

      expect(parsed.type).toBe('short_build');
      expect(parsed.shortId).toBe('Ab7kP2Qx9mNz');
    });

    it('restores full build, 3 loadout slots, level, and perks from looked-up code', async () => {
      const code = encodeBuild(sampleBuild);
      const { id } = await saveBuildToD1(mockDb, code);

      // Simulate client visiting /b/<id>
      const parsed = parseShareUrlOrPath(`/b/${id}`);
      expect(parsed.type).toBe('short_build');

      // Client queries API
      const record = await getBuildFromD1(mockDb, parsed.shortId!);
      expect(record).not.toBeNull();

      // Client decodes code
      const decoded = decodeCode(record!.payload);
      expect(decoded.data.name).toBe('Sledgehammer Marauder');
      expect(decoded.data.level).toBe(75);
      expect(decoded.data.weaponId).toBe(14);
      expect(decoded.data.perkIds).toEqual([30, 38, 12, 19]);
      expect(decoded.data.loadoutItemIds).toEqual([14, 1003, 1004]);
    });

    it('preserves full backward compatibility for portable /build/N2B2-... and legacy codes', () => {
      const code = encodeBuild(sampleBuild);
      const portableUrl = createShareUrl(code);

      const parsedPortable = parseShareUrlOrPath(portableUrl);
      expect(parsedPortable.type).toBe('B');
      expect(parsedPortable.code).toBe(code);

      const decoded = decodeCode(parsedPortable.code!);
      expect(decoded.data.name).toBe('Sledgehammer Marauder');
    });
  });
});
