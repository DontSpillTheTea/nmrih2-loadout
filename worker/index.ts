import { decodeCode, CANONICAL_SITE_ORIGIN } from '../src/serialization/codec';
import { saveBuildToD1, getBuildFromD1, type D1Database } from './d1';

export interface Env {
  DB?: D1Database;
  ASSETS: {
    fetch(request: Request | string): Promise<Response>;
  };
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...headers
    }
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Handle CORS preflight for API requests
    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // 2. POST /api/builds - Create or deduplicate short build link
    if (request.method === 'POST' && pathname === '/api/builds') {
      // Body size safety check (16 KiB limit)
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 16384) {
        return jsonResponse({ error: 'Payload too large. Maximum body size is 16 KiB.' }, 413);
      }

      let body: any;
      try {
        const text = await request.text();
        if (text.length > 16384) {
          return jsonResponse({ error: 'Payload too large. Maximum body size is 16 KiB.' }, 413);
        }
        body = JSON.parse(text);
      } catch {
        return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
      }

      const rawCode = body?.code;
      if (!rawCode || typeof rawCode !== 'string') {
        return jsonResponse({ error: 'Missing or invalid "code" field in request body.' }, 400);
      }

      const trimmedCode = rawCode.trim();
      if (trimmedCode.length > 8192) {
        return jsonResponse({ error: 'Code exceeds maximum size limit.' }, 413);
      }

      // Strict validation: must decode using existing production decoder
      let decoded: any;
      try {
        decoded = decodeCode(trimmedCode);
      } catch (err: any) {
        return jsonResponse({ error: `Invalid build code: ${err.message || 'Validation failed'}` }, 400);
      }

      // Must be a Build code (B) or legacy Character code (C)
      if (decoded.type !== 'B' && decoded.type !== 'C') {
        return jsonResponse({ error: 'Only Build configurations can be shared via short links.' }, 400);
      }

      if (!env.DB) {
        return jsonResponse({ error: 'D1 Database binding is not configured.' }, 503);
      }

      try {
        const { id, isNew } = await saveBuildToD1(env.DB, trimmedCode, decoded.family);
        const canonicalUrl = `${CANONICAL_SITE_ORIGIN}/b/${id}`;

        return jsonResponse(
          {
            id,
            url: canonicalUrl,
            deduplicated: !isNew
          },
          isNew ? 201 : 200
        );
      } catch (dbErr: any) {
        console.error('Failed to save build to D1:', dbErr);
        return jsonResponse({ error: 'Database persistence error.' }, 500);
      }
    }

    // 3. GET /api/builds/:id - Retrieve canonical build code by short ID
    if (request.method === 'GET' && pathname.startsWith('/api/builds/')) {
      const id = pathname.slice('/api/builds/'.length);

      // Validate ID format (8-32 URL-safe chars)
      if (!id || !/^[A-Za-z0-9_-]{8,32}$/.test(id)) {
        return jsonResponse({ error: 'Invalid build ID format.' }, 400);
      }

      if (!env.DB) {
        return jsonResponse({ error: 'D1 Database binding is not configured.' }, 503);
      }

      try {
        const record = await getBuildFromD1(env.DB, id);
        if (!record) {
          return jsonResponse({ error: 'Build not found.' }, 404);
        }

        return jsonResponse(
          {
            id: record.id,
            code: record.payload,
            codec_version: record.codec_version,
            created_at: record.created_at
          },
          200,
          {
            'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable'
          }
        );
      } catch (dbErr: any) {
        console.error('Failed to query build from D1:', dbErr);
        return jsonResponse({ error: 'Database lookup error.' }, 500);
      }
    }

    // 4. Delegate all other requests (static assets, HTML SPA fallback) to Cloudflare Static Assets
    return env.ASSETS.fetch(request);
  }
};
