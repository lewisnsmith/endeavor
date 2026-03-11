import type Database from 'better-sqlite3';
import type { Decision } from '../types.js';
import { generateId } from '../ids.js';

interface DecisionRow {
  id: string;
  project_id: string;
  work_item_id: string | null;
  summary: string;
  rationale: string | null;
  decided_by: string | null;
  created_at: number;
}

function mapRow(row: DecisionRow): Decision {
  return {
    id: row.id,
    projectId: row.project_id,
    workItemId: row.work_item_id,
    summary: row.summary,
    rationale: row.rationale,
    decidedBy: row.decided_by,
    createdAt: row.created_at,
  };
}

export class DecisionRepository {
  constructor(private db: Database.Database) {}

  create(params: {
    projectId: string;
    summary: string;
    rationale?: string;
    decidedBy?: string;
    workItemId?: string;
  }): Decision {
    const now = Date.now();
    const id = generateId('decision');

    this.db
      .prepare(
        `INSERT INTO decisions (id, project_id, work_item_id, summary, rationale, decided_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, params.projectId, params.workItemId ?? null, params.summary, params.rationale ?? null, params.decidedBy ?? null, now);

    return {
      id, projectId: params.projectId, workItemId: params.workItemId ?? null,
      summary: params.summary, rationale: params.rationale ?? null,
      decidedBy: params.decidedBy ?? null, createdAt: now,
    };
  }

  getById(id: string): Decision | null {
    const row = this.db
      .prepare('SELECT * FROM decisions WHERE id = ?')
      .get(id) as DecisionRow | undefined;
    return row ? mapRow(row) : null;
  }

  listByProject(projectId: string, limit = 10): Decision[] {
    const rows = this.db
      .prepare('SELECT * FROM decisions WHERE project_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(projectId, limit) as DecisionRow[];
    return rows.map(mapRow);
  }
}
