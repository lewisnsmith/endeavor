import type Database from "better-sqlite3";
import {
  type EndeavorConfig,
  DEFAULT_CONFIG,
  EndeavorError,
  EndeavorErrorCode,
} from "@endeavor/shared-types";

export class ConfigStore {
  constructor(private db: Database.Database) {}

  get<K extends keyof EndeavorConfig>(key: K): EndeavorConfig[K] {
    const row = this.db
      .prepare("SELECT value FROM config WHERE key = ?")
      .get(key) as { value: string } | undefined;

    if (!row) {
      return DEFAULT_CONFIG[key];
    }

    return JSON.parse(row.value) as EndeavorConfig[K];
  }

  set<K extends keyof EndeavorConfig>(key: K, value: EndeavorConfig[K]): void {
    this.validate(key, value);

    const serialized = JSON.stringify(value);
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO config (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
      )
      .run(key, serialized, now);
  }

  getAll(): EndeavorConfig {
    const rows = this.db
      .prepare("SELECT key, value FROM config")
      .all() as Array<{ key: string; value: string }>;

    const config = { ...DEFAULT_CONFIG };

    for (const row of rows) {
      const key = row.key as keyof EndeavorConfig;
      if (key in DEFAULT_CONFIG) {
        (config as Record<string, unknown>)[key] = JSON.parse(row.value);
      }
    }

    return config;
  }

  reset(key: keyof EndeavorConfig): void {
    this.db
      .prepare("DELETE FROM config WHERE key = ?")
      .run(key);
  }

  private validate<K extends keyof EndeavorConfig>(key: K, value: unknown): void {
    const validators: Partial<Record<keyof EndeavorConfig, (v: unknown) => boolean>> = {
      logLevel: (v) => typeof v === "string" && ["debug", "info", "warn", "error"].includes(v),
      maxFileSizeBytes: (v) => typeof v === "number" && v > 0,
      chunkMaxTokens: (v) => typeof v === "number" && v > 0,
      chunkOverlapTokens: (v) => typeof v === "number" && v >= 0,
      dataDir: (v) => typeof v === "string" && v.length > 0,
      ignoredPatterns: (v) => Array.isArray(v) && v.every((p) => typeof p === "string"),
    };

    const validator = validators[key];
    if (validator && !validator(value)) {
      throw new EndeavorError(
        EndeavorErrorCode.CONFIG_INVALID,
        `Invalid value for config key "${key}"`,
        { key, value },
      );
    }
  }
}
