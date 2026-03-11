import type Database from 'better-sqlite3';
import type { Handoff, HandoffStatus } from '../types.js';
import { EndeavorError, ErrorCode } from '../errors.js';
import { generateId } from '../ids.js';

interface HandoffRow {
  id: string;
  project_id: string;
  from_agent: string | null;
  to_agent: string | null;
  summary: string;
  payload: string | null;
  status: string;
  work_item_id: string | null;
  created_at: number;
  updated_at: number;
}

function mapRow(row: HandoffRow): Handoff {
  return {
    id: row.id,
    projectId: row.project_id,
    fromAgent: row.from_agent,
    toAgent: row.to_agent,
    summary: row.summary,
    payload: row.payload,
    status: row.status as HandoffStatus,
    workItemId: row.work_item_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class HandoffRepository {
  constructor(private db: Database.Database) {}

  create(params: {
    projectId: string;
    toAgent: string;
    summary: string;
    fromAgent?: string;
    payload?: string;
    workItemId?: string;
  }): Handoff {
    const now = Date.now();
    const id = generateId('handoff');

    this.db
      .prepare(
        `INSERT INTO handoffs (id, project_id, from_agent, to_agent, summary, payload, status, work_item_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      )
      .run(id, params.projectId, params.fromAgent ?? null, params.toAgent, params.summary, params.payload ?? null, params.workItemId ?? null, now, now);

    return {
      id, projectId: params.projectId, fromAgent: params.fromAgent ?? null,
      toAgent: params.toAgent, summary: params.summary, payload: params.payload ?? null,
      status: 'pending', workItemId: params.workItemId ?? null, createdAt: now, updatedAt: now,
    };
  }

  getById(id: string): Handoff | null {
    const row = this.db
      .prepare('SELECT * FROM handoffs WHERE id = ?')
      .get(id) as HandoffRow | undefined;
    return row ? mapRow(row) : null;
  }

  listByProject(projectId: string, status?: HandoffStatus): Handoff[] {
    if (status) {
      const rows = this.db
        .prepare('SELECT * FROM handoffs WHERE project_id = ? AND status = ? ORDER BY created_at DESC')
        .all(projectId, status) as HandoffRow[];
      return rows.map(mapRow);
    }
    const rows = this.db
      .prepare('SELECT * FROM handoffs WHERE project_id = ? ORDER BY created_at DESC')
      .all(projectId) as HandoffRow[];
    return rows.map(mapRow);
  }

  updateStatus(id: string, status: HandoffStatus): Handoff {
    const existing = this.getById(id);
    if (!existing) {
      throw new EndeavorError(ErrorCode.HANDOFF_NOT_FOUND, `Handoff not found: ${id}`);
    }

    const validTransitions: Record<HandoffStatus, HandoffStatus[]> = {
      pending: ['accepted', 'expired'],
      accepted: ['completed'],
      completed: [],
      expired: [],
    };

    if (!validTransitions[existing.status].includes(status)) {
      throw new EndeavorError(
        ErrorCode.HANDOFF_INVALID_TRANSITION,
        `Cannot transition handoff from '${existing.status}' to '${status}'`,
      );
    }

    const now = Date.now();
    this.db
      .prepare('UPDATE handoffs SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, now, id);

    return { ...existing, status, updatedAt: now };
  }
}
