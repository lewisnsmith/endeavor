import type Database from 'better-sqlite3';
import type { DoneCriterion } from '../types.js';
import { generateId } from '../ids.js';

interface DoneCriterionRow {
  id: string;
  work_item_id: string;
  description: string;
  met: number;
  met_at: number | null;
  created_at: number;
}

function mapRow(row: DoneCriterionRow): DoneCriterion {
  return {
    id: row.id,
    workItemId: row.work_item_id,
    description: row.description,
    met: row.met === 1,
    metAt: row.met_at,
    createdAt: row.created_at,
  };
}

export class DoneCriteriaRepository {
  constructor(private db: Database.Database) {}

  create(params: { workItemId: string; description: string }): DoneCriterion {
    const now = Date.now();
    const id = generateId('doneCriterion');

    this.db
      .prepare(
        'INSERT INTO done_criteria (id, work_item_id, description, met, met_at, created_at) VALUES (?, ?, ?, 0, NULL, ?)',
      )
      .run(id, params.workItemId, params.description, now);

    return {
      id, workItemId: params.workItemId, description: params.description,
      met: false, metAt: null, createdAt: now,
    };
  }

  listByWorkItem(workItemId: string): DoneCriterion[] {
    const rows = this.db
      .prepare('SELECT * FROM done_criteria WHERE work_item_id = ? ORDER BY created_at ASC')
      .all(workItemId) as DoneCriterionRow[];
    return rows.map(mapRow);
  }

  markMet(id: string): DoneCriterion {
    const now = Date.now();
    this.db
      .prepare('UPDATE done_criteria SET met = 1, met_at = ? WHERE id = ?')
      .run(now, id);

    const row = this.db
      .prepare('SELECT * FROM done_criteria WHERE id = ?')
      .get(id) as DoneCriterionRow;
    return mapRow(row);
  }
}
