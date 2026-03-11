import type Database from 'better-sqlite3';
import type { WorkItem, WorkItemStatus } from '../types.js';
import { EndeavorError, ErrorCode } from '../errors.js';
import { generateId } from '../ids.js';

interface WorkItemRow {
  id: string;
  project_id: string;
  description: string;
  status: string;
  assignee: string | null;
  branch: string | null;
  worktree: string | null;
  created_at: number;
  updated_at: number;
}

function mapRow(row: WorkItemRow): WorkItem {
  return {
    id: row.id,
    projectId: row.project_id,
    description: row.description,
    status: row.status as WorkItemStatus,
    assignee: row.assignee,
    branch: row.branch,
    worktree: row.worktree,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class WorkItemRepository {
  constructor(private db: Database.Database) {}

  create(params: {
    projectId: string;
    description: string;
    assignee?: string;
    branch?: string;
    worktree?: string;
  }): WorkItem {
    const now = Date.now();
    const id = generateId('workItem');
    const status: WorkItemStatus = params.assignee ? 'in_progress' : 'todo';

    this.db
      .prepare(
        `INSERT INTO work_items (id, project_id, description, status, assignee, branch, worktree, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, params.projectId, params.description, status, params.assignee ?? null, params.branch ?? null, params.worktree ?? null, now, now);

    return {
      id, projectId: params.projectId, description: params.description,
      status, assignee: params.assignee ?? null, branch: params.branch ?? null,
      worktree: params.worktree ?? null, createdAt: now, updatedAt: now,
    };
  }

  getById(id: string): WorkItem | null {
    const row = this.db
      .prepare('SELECT * FROM work_items WHERE id = ?')
      .get(id) as WorkItemRow | undefined;
    return row ? mapRow(row) : null;
  }

  listByProject(projectId: string): WorkItem[] {
    const rows = this.db
      .prepare('SELECT * FROM work_items WHERE project_id = ? ORDER BY created_at ASC')
      .all(projectId) as WorkItemRow[];
    return rows.map(mapRow);
  }

  listByStatus(projectId: string, status: WorkItemStatus): WorkItem[] {
    const rows = this.db
      .prepare('SELECT * FROM work_items WHERE project_id = ? AND status = ? ORDER BY created_at ASC')
      .all(projectId, status) as WorkItemRow[];
    return rows.map(mapRow);
  }

  updateStatus(id: string, status: WorkItemStatus): WorkItem {
    const existing = this.getById(id);
    if (!existing) {
      throw new EndeavorError(ErrorCode.WORK_ITEM_NOT_FOUND, `Work item not found: ${id}`);
    }

    const now = Date.now();
    this.db
      .prepare('UPDATE work_items SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, now, id);

    return { ...existing, status, updatedAt: now };
  }

  update(id: string, params: Partial<{ description: string; assignee: string; branch: string; worktree: string; status: WorkItemStatus }>): WorkItem {
    const existing = this.getById(id);
    if (!existing) {
      throw new EndeavorError(ErrorCode.WORK_ITEM_NOT_FOUND, `Work item not found: ${id}`);
    }

    const now = Date.now();
    const description = params.description ?? existing.description;
    const assignee = params.assignee !== undefined ? params.assignee : existing.assignee;
    const branch = params.branch !== undefined ? params.branch : existing.branch;
    const worktree = params.worktree !== undefined ? params.worktree : existing.worktree;
    const status = params.status ?? existing.status;

    this.db
      .prepare(
        'UPDATE work_items SET description = ?, assignee = ?, branch = ?, worktree = ?, status = ?, updated_at = ? WHERE id = ?',
      )
      .run(description, assignee, branch, worktree, status, now, id);

    return { ...existing, description, assignee, branch, worktree, status, updatedAt: now };
  }
}
