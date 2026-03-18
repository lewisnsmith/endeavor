import type Database from 'better-sqlite3';
import type { SessionSnapshot, SessionSource, SessionStatus } from '../types.js';
import { generateId } from '../ids.js';

interface SessionRow {
  id: string;
  source: string;
  status: string;
  claude_session_id: string | null;
  pid: number | null;
  label: string;
  cwd: string;
  branch: string | null;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  model: string | null;
  last_output_at: string | null;
  started_at: string;
  updated_at: string;
  metadata: string;
}

function mapRow(row: SessionRow): SessionSnapshot {
  return {
    id: row.id,
    source: row.source as SessionSource,
    status: row.status as SessionStatus,
    claudeSessionId: row.claude_session_id,
    pid: row.pid,
    label: row.label,
    cwd: row.cwd,
    branch: row.branch,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalCostUsd: row.total_cost_usd,
    model: row.model,
    lastOutputAt: row.last_output_at,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    metadata: JSON.parse(row.metadata),
  };
}

export interface CreateSessionParams {
  source: SessionSource;
  label: string;
  cwd: string;
  branch?: string;
  pid?: number;
  claudeSessionId?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateSessionParams = Partial<{
  status: SessionStatus;
  claudeSessionId: string | null;
  pid: number | null;
  label: string;
  branch: string | null;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  model: string | null;
  lastOutputAt: string | null;
  metadata: Record<string, unknown>;
}>;

export class SessionRepository {
  constructor(private db: Database.Database) {}

  create(params: CreateSessionParams): SessionSnapshot {
    const now = new Date().toISOString();
    const id = generateId('session');

    this.db.prepare(
      `INSERT INTO sessions (id, source, status, label, cwd, branch, pid, claude_session_id, input_tokens, output_tokens, total_cost_usd, started_at, updated_at, metadata)
       VALUES (?, ?, 'active', ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?)`
    ).run(
      id,
      params.source,
      params.label,
      params.cwd,
      params.branch ?? null,
      params.pid ?? null,
      params.claudeSessionId ?? null,
      now,
      now,
      JSON.stringify(params.metadata ?? {}),
    );

    return this.getById(id)!;
  }

  getById(id: string): SessionSnapshot | null {
    const row = this.db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(id) as SessionRow | undefined;
    return row ? mapRow(row) : null;
  }

  list(): SessionSnapshot[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions ORDER BY updated_at DESC, rowid DESC')
      .all() as SessionRow[];
    return rows.map(mapRow);
  }

  listByStatus(status: SessionStatus): SessionSnapshot[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions WHERE status = ? ORDER BY updated_at DESC, rowid DESC')
      .all(status) as SessionRow[];
    return rows.map(mapRow);
  }

  update(id: string, params: UpdateSessionParams): SessionSnapshot {
    const existing = this.getById(id);
    const nowMs = Date.now();
    const existingMs = existing ? new Date(existing.updatedAt).getTime() : 0;
    const now = new Date(nowMs > existingMs ? nowMs : existingMs + 1).toISOString();
    const sets: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (params.status !== undefined) { sets.push('status = ?'); values.push(params.status); }
    if (params.claudeSessionId !== undefined) { sets.push('claude_session_id = ?'); values.push(params.claudeSessionId); }
    if (params.pid !== undefined) { sets.push('pid = ?'); values.push(params.pid); }
    if (params.label !== undefined) { sets.push('label = ?'); values.push(params.label); }
    if (params.branch !== undefined) { sets.push('branch = ?'); values.push(params.branch); }
    if (params.inputTokens !== undefined) { sets.push('input_tokens = ?'); values.push(params.inputTokens); }
    if (params.outputTokens !== undefined) { sets.push('output_tokens = ?'); values.push(params.outputTokens); }
    if (params.totalCostUsd !== undefined) { sets.push('total_cost_usd = ?'); values.push(params.totalCostUsd); }
    if (params.model !== undefined) { sets.push('model = ?'); values.push(params.model); }
    if (params.lastOutputAt !== undefined) { sets.push('last_output_at = ?'); values.push(params.lastOutputAt); }
    if (params.metadata !== undefined) { sets.push('metadata = ?'); values.push(JSON.stringify(params.metadata)); }

    values.push(id);
    this.db.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    return this.getById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
