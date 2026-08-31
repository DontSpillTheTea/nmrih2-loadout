-- Cloudflare D1 Migration: Initial Shared Builds Table
CREATE TABLE IF NOT EXISTS shared_builds (
  id TEXT PRIMARY KEY,
  codec_version TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  payload_hash TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_shared_builds_payload_hash ON shared_builds(payload_hash);
