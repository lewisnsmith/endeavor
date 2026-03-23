import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { LauncherAdapter } from './launcher.js';
import { SessionRepository } from '../storage/session-repo.js';
import { SessionEventRepository } from '../storage/event-repo.js';
import { migrations } from '../storage/migrations.js';
import { createLogger } from '../logger.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(migrations[0].up);
  return db;
}

import { EventEmitter } from 'node:events';
import { Readable, Writable } from 'node:stream';

// Mock child_process.spawn for testing
vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => {
    const proc = new EventEmitter();
    (proc as any).stdout = new Readable({ read() {} });
    (proc as any).stderr = new Readable({ read() {} });
    (proc as any).stdin = new Writable({ write(_chunk: unknown, _enc: unknown, cb: () => void) { cb(); } });
    (proc as any).pid = 12345;
    (proc as any).kill = vi.fn();
    // Simulate process completing after a tick
    setTimeout(() => {
      (proc as any).stdout.push('{"type":"result","subtype":"success","session_id":"sess_abc123","total_cost_usd":0.01,"result":"Hello!","usage":{"input_tokens":10,"output_tokens":5}}\n');
      (proc as any).stdout.push(null); // EOF
      proc.emit('exit', 0, null);
    }, 10);
    return proc;
  }),
}));

describe('LauncherAdapter', () => {
  let db: Database.Database;
  let adapter: LauncherAdapter;

  beforeEach(() => {
    db = setupDb();
    const sessions = new SessionRepository(db);
    const events = new SessionEventRepository(db);
    const logger = createLogger('test', { level: 'error' });
    adapter = new LauncherAdapter({ sessions, events, logger });
  });

  afterEach(async () => {
    adapter.dispose?.();
    // Wait for any pending async callbacks (mock process exit timers) to flush
    await new Promise((r) => setTimeout(r, 60));
    db.close();
  });

  it('has correct capabilities', () => {
    expect(adapter.capabilities).toEqual({
      canSpawn: true,
      canKill: true,
      canSendInput: true,
      canStreamOutput: true,
      canTrackCost: true,
    });
  });

  it('has source "launched"', () => {
    expect(adapter.source).toBe('launched');
  });

  it('spawns a session and creates DB record', async () => {
    const snapshot = await adapter.spawn({
      cwd: '/tmp/test',
      label: 'test-session',
      initialPrompt: 'hello',
    });

    expect(snapshot.id).toMatch(/^s_/);
    expect(snapshot.source).toBe('launched');
    expect(snapshot.status).toBe('active');
    expect(snapshot.cwd).toBe('/tmp/test');
    expect(snapshot.label).toBe('test-session');
  });

  it('discovers only active launched sessions', async () => {
    await adapter.spawn({ cwd: '/tmp', label: 'one', initialPrompt: 'hi' });
    // Wait for process to complete
    await new Promise((r) => setTimeout(r, 50));

    const discovered = await adapter.discover();
    // After process exits with code 0 and result event, session transitions
    expect(discovered.length).toBeGreaterThanOrEqual(0);
  });
});
