import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SessionManager } from './session-manager.js';
import type { SessionAdapter } from './adapters/types.js';
import { migrations } from './storage/migrations.js';
import { SessionRepository } from './storage/session-repo.js';
import { SessionEventRepository } from './storage/event-repo.js';
import { createLogger } from './logger.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(migrations[0].up);
  return db;
}

function mockAdapter(source: string, sessions: { label: string; cwd: string }[] = []): SessionAdapter {
  return {
    source,
    capabilities: { canSpawn: false, canKill: false, canSendInput: false, canStreamOutput: false, canTrackCost: false },
    discover: vi.fn().mockResolvedValue(
      sessions.map((s) => ({
        id: `s_mock_${s.label}`,
        source,
        status: 'active',
        claudeSessionId: null,
        pid: null,
        label: s.label,
        cwd: s.cwd,
        branch: null,
        inputTokens: 0,
        outputTokens: 0,
        totalCostUsd: 0,
        model: null,
        lastOutputAt: null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      })),
    ),
  };
}

describe('SessionManager', () => {
  let db: Database.Database;
  let manager: SessionManager;

  beforeEach(() => {
    db = setupDb();
    const logger = createLogger('test', { level: 'error' });
    const sessions = new SessionRepository(db);
    const events = new SessionEventRepository(db);
    manager = new SessionManager({ sessions, events, logger });
  });

  afterEach(() => {
    manager.dispose();
    db.close();
  });

  it('registers adapters', () => {
    const adapter = mockAdapter('observed');
    manager.register(adapter);
    expect(manager.getCapabilities('observed')).toBeTruthy();
  });

  it('rejects duplicate adapter sources', () => {
    manager.register(mockAdapter('observed'));
    expect(() => manager.register(mockAdapter('observed'))).toThrow(/duplicate/i);
  });

  it('discovers sessions from all adapters', async () => {
    manager.register(mockAdapter('observed', [{ label: 'ext-1', cwd: '/tmp' }]));
    const all = await manager.discoverAll();
    expect(all).toHaveLength(1);
  });

  it('returns capabilities for registered adapters', () => {
    const adapter = mockAdapter('launched');
    manager.register(adapter);
    expect(manager.getCapabilities('launched')).toEqual(adapter.capabilities);
  });

  it('returns null capabilities for unknown source', () => {
    expect(manager.getCapabilities('unknown')).toBeNull();
  });
});
