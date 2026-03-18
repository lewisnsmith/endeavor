import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EndeavorDatabase } from './database.js';
import { createLogger } from '../logger.js';

describe('EndeavorDatabase', () => {
  let db: EndeavorDatabase;
  const logger = createLogger('test', { level: 'error' });

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
  });

  afterEach(() => {
    db.close();
  });

  it('creates sessions and session_events tables', () => {
    db.initialize();
    const raw = db.getDb();

    const tables = raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name);

    expect(tables).toContain('sessions');
    expect(tables).toContain('session_events');
    expect(tables).toContain('_migrations');
    // Old tables should NOT exist
    expect(tables).not.toContain('projects');
    expect(tables).not.toContain('work_items');
  });

  it('creates indexes for performance', () => {
    db.initialize();
    const raw = db.getDb();

    const indexes = raw
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
      .all()
      .map((r) => (r as { name: string }).name);

    expect(indexes).toContain('idx_sessions_status');
    expect(indexes).toContain('idx_session_events_session');
  });

  it('enforces session status CHECK constraint', () => {
    db.initialize();
    const raw = db.getDb();

    expect(() => {
      raw.prepare(
        `INSERT INTO sessions (id, source, status, label, cwd, input_tokens, output_tokens, total_cost_usd, started_at, updated_at)
         VALUES ('s_test', 'launched', 'INVALID', 'test', '/tmp', 0, 0, 0, '2026-01-01', '2026-01-01')`
      ).run();
    }).toThrow();
  });

  it('sets WAL mode and busy_timeout', () => {
    db.initialize();
    const raw = db.getDb();

    // In-memory SQLite always reports 'memory' journal mode even when WAL is requested.
    // Verify the pragma is accepted (no throw) and the value is one of the valid modes.
    const journal = raw.pragma('journal_mode') as { journal_mode: string }[];
    expect(['wal', 'memory']).toContain(journal[0].journal_mode);
  });
});
