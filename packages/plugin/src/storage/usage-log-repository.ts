import type Database from "better-sqlite3";
import type { UsageLog } from "@endeavor/shared-types";

interface UsageLogRow {
  id: number;
  project_id: string | null;
  tool: string;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  timestamp: number;
}

function mapRow(row: UsageLogRow): UsageLog {
  return {
    id: row.id,
    projectId: row.project_id,
    tool: row.tool,
    model: row.model,
    tokensIn: row.tokens_in,
    tokensOut: row.tokens_out,
    costUsd: row.cost_usd,
    timestamp: row.timestamp,
  };
}

export class UsageLogRepository {
  constructor(private db: Database.Database) {}

  log(entry: Omit<UsageLog, "id">): UsageLog {
    const result = this.db
      .prepare(
        "INSERT INTO usage_logs (project_id, tool, model, tokens_in, tokens_out, cost_usd, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        entry.projectId,
        entry.tool,
        entry.model,
        entry.tokensIn,
        entry.tokensOut,
        entry.costUsd,
        entry.timestamp,
      );

    return { id: Number(result.lastInsertRowid), ...entry };
  }

  listByProject(
    projectId: string,
    options?: { since?: number; limit?: number },
  ): UsageLog[] {
    let sql = "SELECT * FROM usage_logs WHERE project_id = ?";
    const params: unknown[] = [projectId];

    if (options?.since) {
      sql += " AND timestamp >= ?";
      params.push(options.since);
    }

    sql += " ORDER BY timestamp DESC";

    if (options?.limit) {
      sql += " LIMIT ?";
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as UsageLogRow[];
    return rows.map(mapRow);
  }

  getProjectStats(projectId: string): {
    totalTokensIn: number;
    totalTokensOut: number;
    totalCostUsd: number;
  } {
    const row = this.db
      .prepare(
        `SELECT
           COALESCE(SUM(tokens_in), 0) as total_tokens_in,
           COALESCE(SUM(tokens_out), 0) as total_tokens_out,
           COALESCE(SUM(cost_usd), 0.0) as total_cost_usd
         FROM usage_logs WHERE project_id = ?`,
      )
      .get(projectId) as {
      total_tokens_in: number;
      total_tokens_out: number;
      total_cost_usd: number;
    };

    return {
      totalTokensIn: row.total_tokens_in,
      totalTokensOut: row.total_tokens_out,
      totalCostUsd: row.total_cost_usd,
    };
  }
}
