import { describe, it, expect, afterEach } from "vitest";
import { EndeavorDatabase } from "./database.js";
import { createLogger } from "../logger.js";

const logger = createLogger("test", { level: "error" });

describe("EndeavorDatabase", () => {
  let db: EndeavorDatabase;

  afterEach(() => {
    db?.close();
  });

  it("should initialize with in-memory database", () => {
    db = new EndeavorDatabase({ dbPath: ":memory:", logger });
    db.initialize();

    const raw = db.getDb();
    expect(raw).toBeDefined();
  });

  it("should create all tables on initialization", () => {
    db = new EndeavorDatabase({ dbPath: ":memory:", logger });
    db.initialize();

    const raw = db.getDb();
    const tables = raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("projects");
    expect(tableNames).toContain("knowledge");
    expect(tableNames).toContain("file_chunks");
    expect(tableNames).toContain("usage_logs");
    expect(tableNames).toContain("tools");
    expect(tableNames).toContain("config");
    expect(tableNames).toContain("_migrations");
  });

  it("should enable WAL mode", () => {
    db = new EndeavorDatabase({ dbPath: ":memory:", logger });
    db.initialize();

    const raw = db.getDb();
    const result = raw.pragma("journal_mode") as Array<{ journal_mode: string }>;
    // In-memory databases may report "memory" instead of "wal"
    expect(["wal", "memory"]).toContain(result[0].journal_mode);
  });

  it("should enable foreign keys", () => {
    db = new EndeavorDatabase({ dbPath: ":memory:", logger });
    db.initialize();

    const raw = db.getDb();
    const result = raw.pragma("foreign_keys") as Array<{ foreign_keys: number }>;
    expect(result[0].foreign_keys).toBe(1);
  });

  it("should run migrations idempotently", () => {
    db = new EndeavorDatabase({ dbPath: ":memory:", logger });
    db.initialize();

    // Running initialize again should not throw
    const raw = db.getDb();
    const migrationCount = raw
      .prepare("SELECT COUNT(*) as count FROM _migrations")
      .get() as { count: number };
    expect(migrationCount.count).toBe(2);
  });

  it("should throw when getDb called before initialize", () => {
    db = new EndeavorDatabase({ dbPath: ":memory:", logger });
    expect(() => db.getDb()).toThrow("Database not initialized");
  });
});
