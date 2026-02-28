import type Database from "better-sqlite3";
import type { TimelineEvent, EventKind } from "@endeavor/shared-types";

interface EventRow {
  id: number;
  project_id: string;
  tool: string;
  kind: string;
  summary: string;
  metadata: string | null;
  timestamp: number;
}

function mapRow(row: EventRow): TimelineEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    tool: row.tool,
    kind: row.kind as EventKind,
    summary: row.summary,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
    timestamp: row.timestamp,
  };
}

export class EventRepository {
  constructor(private db: Database.Database) {}

  create(entry: Omit<TimelineEvent, "id">): TimelineEvent {
    const result = this.db
      .prepare(
        "INSERT INTO events (project_id, tool, kind, summary, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        entry.projectId,
        entry.tool,
        entry.kind,
        entry.summary,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.timestamp,
      );

    return { id: Number(result.lastInsertRowid), ...entry };
  }

  getById(id: number): TimelineEvent | null {
    const row = this.db
      .prepare("SELECT * FROM events WHERE id = ?")
      .get(id) as EventRow | undefined;
    return row ? mapRow(row) : null;
  }

  listByProject(
    projectId: string,
    options?: { since?: number; limit?: number; kind?: EventKind },
  ): TimelineEvent[] {
    let sql = "SELECT * FROM events WHERE project_id = ?";
    const params: unknown[] = [projectId];

    if (options?.since) {
      sql += " AND timestamp >= ?";
      params.push(options.since);
    }

    if (options?.kind) {
      sql += " AND kind = ?";
      params.push(options.kind);
    }

    sql += " ORDER BY timestamp DESC";

    if (options?.limit) {
      sql += " LIMIT ?";
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as EventRow[];
    return rows.map(mapRow);
  }

  countByProject(projectId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM events WHERE project_id = ?")
      .get(projectId) as { count: number };
    return row.count;
  }

  deleteByProject(projectId: string): number {
    const result = this.db
      .prepare("DELETE FROM events WHERE project_id = ?")
      .run(projectId);
    return result.changes;
  }
}
