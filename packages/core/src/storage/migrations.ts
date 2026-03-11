export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'coordination_schema',
    up: `
      CREATE TABLE projects (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        path        TEXT NOT NULL UNIQUE,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE work_items (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'todo'
                    CHECK(status IN ('todo','in_progress','blocked','done','cancelled')),
        assignee    TEXT,
        branch      TEXT,
        worktree    TEXT,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE decisions (
        id            TEXT PRIMARY KEY,
        project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        work_item_id  TEXT REFERENCES work_items(id) ON DELETE SET NULL,
        summary       TEXT NOT NULL,
        rationale     TEXT,
        decided_by    TEXT,
        created_at    INTEGER NOT NULL
      );

      CREATE TABLE dependencies (
        id          TEXT PRIMARY KEY,
        blocker_id  TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
        blocked_id  TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
        created_at  INTEGER NOT NULL,
        UNIQUE(blocker_id, blocked_id)
      );

      CREATE TABLE handoffs (
        id            TEXT PRIMARY KEY,
        project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        from_agent    TEXT,
        to_agent      TEXT,
        summary       TEXT NOT NULL,
        payload       TEXT,
        status        TEXT NOT NULL DEFAULT 'pending'
                      CHECK(status IN ('pending','accepted','completed','expired')),
        work_item_id  TEXT REFERENCES work_items(id) ON DELETE SET NULL,
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL
      );

      CREATE TABLE done_criteria (
        id            TEXT PRIMARY KEY,
        work_item_id  TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
        description   TEXT NOT NULL,
        met           INTEGER NOT NULL DEFAULT 0,
        met_at        INTEGER,
        created_at    INTEGER NOT NULL
      );

      CREATE INDEX idx_work_items_project ON work_items(project_id);
      CREATE INDEX idx_work_items_status ON work_items(project_id, status);
      CREATE INDEX idx_decisions_project ON decisions(project_id);
      CREATE INDEX idx_dependencies_blocker ON dependencies(blocker_id);
      CREATE INDEX idx_dependencies_blocked ON dependencies(blocked_id);
      CREATE INDEX idx_handoffs_project ON handoffs(project_id);
      CREATE INDEX idx_handoffs_status ON handoffs(project_id, status);
      CREATE INDEX idx_done_criteria_item ON done_criteria(work_item_id);
    `,
    down: `
      DROP TABLE IF EXISTS done_criteria;
      DROP TABLE IF EXISTS handoffs;
      DROP TABLE IF EXISTS dependencies;
      DROP TABLE IF EXISTS decisions;
      DROP TABLE IF EXISTS work_items;
      DROP TABLE IF EXISTS projects;
    `,
  },
];
