import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { EndeavorError, EndeavorErrorCode } from "@endeavor/shared-types";
import type { Logger } from "../logger.js";
import { migrations } from "./migrations.js";

export interface DatabaseOptions {
  dbPath: string;
  logger: Logger;
}

export class EndeavorDatabase {
  private db: Database.Database | null = null;
  private logger: Logger;
  private dbPath: string;

  constructor(private options: DatabaseOptions) {
    this.logger = options.logger.child("database");
    this.dbPath = options.dbPath;
  }

  initialize(): void {
    try {
      if (this.dbPath !== ":memory:") {
        mkdirSync(dirname(this.dbPath), { recursive: true });
      }

      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");

      this.migrate();
      this.logger.info("Database initialized", { path: this.dbPath });
    } catch (err) {
      throw new EndeavorError(
        EndeavorErrorCode.DB_INIT_FAILED,
        `Failed to initialize database at ${this.dbPath}`,
        err,
      );
    }
  }

  getDb(): Database.Database {
    if (!this.db) {
      throw new EndeavorError(
        EndeavorErrorCode.DB_INIT_FAILED,
        "Database not initialized. Call initialize() first.",
      );
    }
    return this.db;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.logger.info("Database closed");
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
        .prepare("SELECT version FROM _migrations")
        .all()
        .map((row) => (row as { version: number }).version),
    );

    const pending = migrations.filter((m) => !applied.has(m.version));

    if (pending.length === 0) {
      this.logger.debug("No pending migrations");
      return;
    }

    for (const migration of pending) {
      this.logger.info(`Applying migration v${migration.version}: ${migration.name}`);

      const runMigration = db.transaction(() => {
        db.exec(migration.up);
        db.prepare(
          "INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)",
        ).run(migration.version, migration.name, Date.now());
      });

      try {
        runMigration();
      } catch (err) {
        throw new EndeavorError(
          EndeavorErrorCode.MIGRATION_FAILED,
          `Migration v${migration.version} (${migration.name}) failed`,
          err,
        );
      }
    }

    this.logger.info(`Applied ${pending.length} migration(s)`);
  }
}
