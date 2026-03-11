import { describe, it, expect, afterEach } from 'vitest';
import { EndeavorDatabase } from './database.js';
import { createLogger } from '../logger.js';

const logger = createLogger('test', { level: 'error' });

describe('EndeavorDatabase', () => {
  let db: EndeavorDatabase;

  afterEach(() => {
    db?.close();
  });

  it('should initialize with in-memory database', () => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();

    const raw = db.getDb();
    expect(raw).toBeDefined();
  });

  it('should create all tables on initialization', () => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();

    const raw = db.getDb();
    const tables = raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('work_items');
    expect(tableNames).toContain('decisions');
    expect(tableNames).toContain('dependencies');
    expect(tableNames).toContain('handoffs');
    expect(tableNames).toContain('done_criteria');
    expect(tableNames).toContain('_migrations');
  });

  it('should enable WAL mode', () => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();

    const raw = db.getDb();
    const result = raw.pragma('journal_mode') as Array<{ journal_mode: string }>;
    expect(['wal', 'memory']).toContain(result[0].journal_mode);
  });

  it('should enable foreign keys', () => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();

    const raw = db.getDb();
    const result = raw.pragma('foreign_keys') as Array<{ foreign_keys: number }>;
    expect(result[0].foreign_keys).toBe(1);
  });

  it('should set busy_timeout', () => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();

    const raw = db.getDb();
    const result = raw.pragma('busy_timeout') as Array<Record<string, number>>;
    const value = Object.values(result[0])[0];
    expect(value).toBe(5000);
  });

  it('should run migrations idempotently', () => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();

    const raw = db.getDb();
    const migrationCount = raw
      .prepare('SELECT COUNT(*) as count FROM _migrations')
      .get() as { count: number };
    expect(migrationCount.count).toBe(1);
  });

  it('should throw when getDb called before initialize', () => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    expect(() => db.getDb()).toThrow('Database not initialized');
  });
});
