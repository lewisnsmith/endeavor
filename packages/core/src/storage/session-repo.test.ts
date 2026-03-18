import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SessionRepository } from './session-repo.js';
import { migrations } from './migrations.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(migrations[0].up);
  return db;
}

describe('SessionRepository', () => {
  let db: Database.Database;
  let repo: SessionRepository;

  beforeEach(() => {
    db = setupDb();
    repo = new SessionRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates and retrieves a session', () => {
    const session = repo.create({
      source: 'launched',
      label: 'test-session',
      cwd: '/tmp/project',
    });

    expect(session.id).toMatch(/^s_/);
    expect(session.source).toBe('launched');
    expect(session.status).toBe('active');
    expect(session.label).toBe('test-session');
    expect(session.cwd).toBe('/tmp/project');
    expect(session.inputTokens).toBe(0);
    expect(session.totalCostUsd).toBe(0);

    const found = repo.getById(session.id);
    expect(found).toEqual(session);
  });

  it('lists sessions ordered by updated_at DESC', () => {
    const s1 = repo.create({ source: 'launched', label: 'first', cwd: '/tmp' });
    const s2 = repo.create({ source: 'observed', label: 'second', cwd: '/tmp' });

    const all = repo.list();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(s2.id);
  });

  it('updates session status', () => {
    const session = repo.create({ source: 'launched', label: 'test', cwd: '/tmp' });
    const updated = repo.update(session.id, { status: 'waiting_input' });

    expect(updated.status).toBe('waiting_input');
    expect(updated.updatedAt).not.toBe(session.updatedAt);
  });

  it('updates session metrics', () => {
    const session = repo.create({ source: 'launched', label: 'test', cwd: '/tmp' });
    const updated = repo.update(session.id, {
      inputTokens: 500,
      outputTokens: 200,
      totalCostUsd: 0.042,
      model: 'claude-sonnet-4-6',
    });

    expect(updated.inputTokens).toBe(500);
    expect(updated.outputTokens).toBe(200);
    expect(updated.totalCostUsd).toBe(0.042);
    expect(updated.model).toBe('claude-sonnet-4-6');
  });

  it('updates pid and claudeSessionId', () => {
    const session = repo.create({ source: 'launched', label: 'test', cwd: '/tmp' });
    const updated = repo.update(session.id, { pid: 12345, claudeSessionId: 'abc-123' });

    expect(updated.pid).toBe(12345);
    expect(updated.claudeSessionId).toBe('abc-123');
  });

  it('returns null for nonexistent session', () => {
    expect(repo.getById('s_nonexistent')).toBeNull();
  });

  it('lists by status', () => {
    repo.create({ source: 'launched', label: 'a', cwd: '/tmp' });
    const s2 = repo.create({ source: 'launched', label: 'b', cwd: '/tmp' });
    repo.update(s2.id, { status: 'waiting_input' });

    const waiting = repo.listByStatus('waiting_input');
    expect(waiting).toHaveLength(1);
    expect(waiting[0].id).toBe(s2.id);
  });

  it('deletes a session', () => {
    const session = repo.create({ source: 'launched', label: 'test', cwd: '/tmp' });
    expect(repo.delete(session.id)).toBe(true);
    expect(repo.getById(session.id)).toBeNull();
  });
});
