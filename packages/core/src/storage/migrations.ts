export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'session_observatory_schema',
    up: `
      CREATE TABLE sessions (
        id                TEXT PRIMARY KEY,
        source            TEXT NOT NULL CHECK(source IN ('launched','observed','api','cloud')),
        status            TEXT NOT NULL DEFAULT 'active'
                          CHECK(status IN ('active','waiting_input','waiting_approval','error','completed','dead')),
        claude_session_id TEXT,
        pid               INTEGER,
        label             TEXT NOT NULL,
        cwd               TEXT NOT NULL,
        branch            TEXT,
        input_tokens      INTEGER NOT NULL DEFAULT 0,
        output_tokens     INTEGER NOT NULL DEFAULT 0,
        total_cost_usd    REAL NOT NULL DEFAULT 0,
        model             TEXT,
        last_output_at    TEXT,
        started_at        TEXT NOT NULL,
        updated_at        TEXT NOT NULL,
        metadata          TEXT DEFAULT '{}'
      );

      CREATE TABLE session_events (
        id          TEXT PRIMARY KEY,
        session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        type        TEXT NOT NULL CHECK(type IN ('status_change','prompt','response','error','cost_tick','tool_use')),
        payload     TEXT NOT NULL DEFAULT '{}',
        created_at  TEXT NOT NULL
      );

      CREATE INDEX idx_sessions_status ON sessions(status);
      CREATE INDEX idx_session_events_session ON session_events(session_id, created_at);
    `,
    down: `
      DROP TABLE IF EXISTS session_events;
      DROP TABLE IF EXISTS sessions;
    `,
  },
];
