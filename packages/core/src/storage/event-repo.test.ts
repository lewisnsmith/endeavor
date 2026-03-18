import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SessionRepository } from './session-repo.js';
import { SessionEventRepository } from './event-repo.js';
import { migrations } from './migrations.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(migrations[0].up);
  return db;
}

describe('SessionEventRepository', () => {
  let db: Database.Database;
  let sessions: SessionRepository;
  let events: SessionEventRepository;
  let sessionId: string;

  beforeEach(() => {
    db = setupDb();
    sessions = new SessionRepository(db);
    events = new SessionEventRepository(db);
    const session = sessions.create({ source: 'launched', label: 'test', cwd: '/tmp' });
    sessionId = session.id;
  });

  afterEach(() => {
    db.close();
  });

  it('creates and retrieves an event', () => {
    const event = events.create({
      sessionId,
      type: 'status_change',
      payload: { from: 'active', to: 'waiting_input' },
    });

    expect(event.id).toMatch(/^se_/);
    expect(event.sessionId).toBe(sessionId);
    expect(event.type).toBe('status_change');
    expect(event.payload).toEqual({ from: 'active', to: 'waiting_input' });
  });

  it('lists events for a session in chronological order', () => {
    events.create({ sessionId, type: 'response', payload: { text: 'first' } });
    events.create({ sessionId, type: 'tool_use', payload: { name: 'Read' } });
    events.create({ sessionId, type: 'response', payload: { text: 'second' } });

    const all = events.listBySession(sessionId);
    expect(all).toHaveLength(3);
    expect(all[0].type).toBe('response');
    expect(all[2].type).toBe('response');
  });

  it('limits results with limit parameter', () => {
    events.create({ sessionId, type: 'response', payload: {} });
    events.create({ sessionId, type: 'response', payload: {} });
    events.create({ sessionId, type: 'response', payload: {} });

    const limited = events.listBySession(sessionId, { limit: 2 });
    expect(limited).toHaveLength(2);
  });

  it('cascades delete when session is deleted', () => {
    events.create({ sessionId, type: 'response', payload: {} });
    sessions.delete(sessionId);

    const remaining = events.listBySession(sessionId);
    expect(remaining).toHaveLength(0);
  });
});
