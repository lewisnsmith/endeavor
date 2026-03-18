import Database from 'better-sqlite3';
import { mkdirSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { EndeavorError, ErrorCode } from '../errors.js';
import type { Logger } from '../logger.js';
import { migrations } from './migrations.js';

export interface DatabaseOptions {
  dbPath: string;
  logger: Logger;
}

export class EndeavorDatabase {
  private db: Database.Database | null = null;
  private logger: Logger;
  private dbPath: string;

  constructor(private options: DatabaseOptions) {
    this.logger = options.logger.child('database');
    this.dbPath = options.dbPath;
  }

  initialize(): void {
    try {
      if (this.dbPath !== ':memory:') {
        mkdirSync(dirname(this.dbPath), { recursive: true });
      }

      // Before opening, backup v0.2 DB if it has old schema
      if (this.dbPath !== ':memory:') {
        this.backupV2IfNeeded();
      }

      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('busy_timeout = 5000');

      this.migrate();
      this.logger.info('Database initialized', { path: this.dbPath });
    } catch (err) {
      if (err instanceof EndeavorError) throw err;
      throw new EndeavorError(
        ErrorCode.DB_INIT_FAILED,
        `Failed to initialize database at ${this.dbPath}`,
        err,
      );
    }
  }

  getDb(): Database.Database {
    if (!this.db) {
      throw new EndeavorError(
        ErrorCode.DB_INIT_FAILED,
        'Database not initialized. Call initialize() first.',
      );
    }
    return this.db;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.logger.info('Database closed');
    }
  }

  private migrate(): void {
    const db = this.getDb();

    db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version   INTEGER PRIMARY KEY,
        name      TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);

    const applied = new Set(
      db
        .prepare('SELECT version FROM _migrations')
        .all()
        .map((row) => (row as { version: number }).version),
    );

    const pending = migrations.filter((m) => !applied.has(m.version));

    if (pending.length === 0) {
      this.logger.debug('No pending migrations');
      return;
    }

    for (const migration of pending) {
      this.logger.info(`Applying migration v${migration.version}: ${migration.name}`);

      const runMigration = db.transaction(() => {
        db.exec(migration.up);
        db.prepare(
          'INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)',
        ).run(migration.version, migration.name, Date.now());
      });

      try {
        runMigration();
      } catch (err) {
        throw new EndeavorError(
          ErrorCode.MIGRATION_FAILED,
          `Migration v${migration.version} (${migration.name}) failed`,
          err,
        );
      }
    }

    this.logger.info(`Applied ${pending.length} migration(s)`);
  }

  private backupV2IfNeeded(): void {
    if (!existsSync(this.dbPath)) return;

    try {
      const testDb = new Database(this.dbPath, { readonly: true });
      const tables = testDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((r) => (r as { name: string }).name);
      testDb.close();

      if (tables.includes('work_items') && !tables.includes('sessions')) {
        const backupPath = this.dbPath.replace(/\.db$/, '.v2.db');
        this.logger.info('Backing up v0.2 database', { from: this.dbPath, to: backupPath });
        copyFileSync(this.dbPath, backupPath);
        if (existsSync(this.dbPath + '-wal')) {
          copyFileSync(this.dbPath + '-wal', backupPath + '-wal');
        }
        if (existsSync(this.dbPath + '-shm')) {
          copyFileSync(this.dbPath + '-shm', backupPath + '-shm');
        }
        unlinkSync(this.dbPath);
        if (existsSync(this.dbPath + '-wal')) unlinkSync(this.dbPath + '-wal');
        if (existsSync(this.dbPath + '-shm')) unlinkSync(this.dbPath + '-shm');
      }
    } catch {
      this.logger.warn('Could not check existing database, will create fresh');
    }
  }
}
