import type Database from "better-sqlite3";
import type { Tool, ToolType } from "@endeavor/shared-types";

interface ToolRow {
  id: string;
  name: string;
  type: string | null;
  config_path: string | null;
  enabled: number;
  last_health_check: number | null;
}

function mapRow(row: ToolRow): Tool {
  return {
    id: row.id,
    name: row.name,
    type: (row.type as ToolType) ?? null,
    configPath: row.config_path,
    enabled: row.enabled === 1,
    lastHealthCheck: row.last_health_check,
  };
}

export class ToolRepository {
  constructor(private db: Database.Database) {}

  register(tool: Tool): Tool {
    this.db
      .prepare(
        `INSERT INTO tools (id, name, type, config_path, enabled, last_health_check)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           type = excluded.type,
           config_path = excluded.config_path,
           enabled = excluded.enabled,
           last_health_check = excluded.last_health_check`,
      )
      .run(
        tool.id,
        tool.name,
        tool.type,
        tool.configPath,
        tool.enabled ? 1 : 0,
        tool.lastHealthCheck,
      );

    return tool;
  }

  getById(id: string): Tool | null {
    const row = this.db
      .prepare("SELECT * FROM tools WHERE id = ?")
      .get(id) as ToolRow | undefined;
    return row ? mapRow(row) : null;
  }

  list(): Tool[] {
    const rows = this.db
      .prepare("SELECT * FROM tools ORDER BY name")
      .all() as ToolRow[];
    return rows.map(mapRow);
  }

  updateHealthCheck(id: string, timestamp: number): void {
    this.db
      .prepare("UPDATE tools SET last_health_check = ? WHERE id = ?")
      .run(timestamp, id);
  }

  setEnabled(id: string, enabled: boolean): void {
    this.db
      .prepare("UPDATE tools SET enabled = ? WHERE id = ?")
      .run(enabled ? 1 : 0, id);
  }

  delete(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM tools WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }
}
