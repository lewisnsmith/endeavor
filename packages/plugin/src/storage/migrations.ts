export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: `
      CREATE TABLE IF NOT EXISTS projects (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        type        TEXT NOT NULL CHECK(type IN ('research','software','hardware','general')),
        path        TEXT NOT NULL UNIQUE,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS knowledge (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL,
        type        TEXT NOT NULL CHECK(type IN ('decision','finding','error','hypothesis','requirement','reference','task','file')),
        content     TEXT NOT NULL,
        tags        TEXT DEFAULT '[]',
        created_by  TEXT,
        timestamp   INTEGER NOT NULL,
        embedding   BLOB,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS file_chunks (
        id            TEXT PRIMARY KEY,
        project_id    TEXT NOT NULL,
        file_path     TEXT NOT NULL,
        content       TEXT NOT NULL,
        tokens        INTEGER NOT NULL,
        embedding     BLOB,
        last_modified INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS usage_logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  TEXT,
        tool        TEXT NOT NULL,
        model       TEXT,
        tokens_in   INTEGER DEFAULT 0,
        tokens_out  INTEGER DEFAULT 0,
        cost_usd    REAL DEFAULT 0.0,
        timestamp   INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tools (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,
        type              TEXT CHECK(type IN ('mcp','api','custom')),
        config_path       TEXT,
        enabled           INTEGER DEFAULT 1,
        last_health_check INTEGER
      );

      CREATE TABLE IF NOT EXISTS config (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_knowledge_project ON knowledge(project_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge(project_id, type);
      CREATE INDEX IF NOT EXISTS idx_file_chunks_project ON file_chunks(project_id);
      CREATE INDEX IF NOT EXISTS idx_file_chunks_path ON file_chunks(project_id, file_path);
      CREATE INDEX IF NOT EXISTS idx_usage_logs_project ON usage_logs(project_id, timestamp);
    `,
    down: `
      DROP TABLE IF EXISTS config;
      DROP TABLE IF EXISTS tools;
      DROP TABLE IF EXISTS usage_logs;
      DROP TABLE IF EXISTS file_chunks;
      DROP TABLE IF EXISTS knowledge;
      DROP TABLE IF EXISTS projects;
    `,
  },
  {
    version: 2,
    name: "add_events_table",
    up: `
      CREATE TABLE IF NOT EXISTS events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  TEXT NOT NULL,
        tool        TEXT NOT NULL,
        kind        TEXT NOT NULL DEFAULT 'note',
        summary     TEXT NOT NULL,
        metadata    TEXT,
        timestamp   INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_kind ON events(project_id, kind);
    `,
    down: `
      DROP TABLE IF EXISTS events;
    `,
  },
];
