import type Database from 'better-sqlite3';
import type { SessionEvent, SessionEventType } from '../types.js';
import { generateId } from '../ids.js';

interface EventRow {
  id: string;
  session_id: string;
  type: string;
  payload: string;
  created_at: string;
}

function mapRow(row: EventRow): SessionEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type as SessionEventType,
    payload: JSON.parse(row.payload),
    createdAt: row.created_at,
  };
}

export interface CreateEventParams {
  sessionId: string;
  type: SessionEventType;
  payload: Record<string, unknown>;
}

export class SessionEventRepository {
  constructor(private db: Database.Database) {}

  create(params: CreateEventParams): SessionEvent {
    const now = new Date().toISOString();
    const id = generateId('sessionEvent');

    this.db.prepare(
      `INSERT INTO session_events (id, session_id, type, payload, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, params.sessionId, params.type, JSON.stringify(params.payload), now);

    return { id, sessionId: params.sessionId, type: params.type, payload: params.payload, createdAt: now };
  }

  getLastResponseBySession(sessionIds: string[]): Map<string, string> {
    if (sessionIds.length === 0) return new Map();
    const placeholders = sessionIds.map(() => '?').join(',');
    const rows = this.db.prepare(
      `SELECT e.session_id, e.payload FROM session_events e
       INNER JOIN (
         SELECT session_id, MAX(created_at) as max_created
         FROM session_events
         WHERE session_id IN (${placeholders}) AND type = 'response'
         GROUP BY session_id
       ) latest ON e.session_id = latest.session_id AND e.created_at = latest.max_created
       WHERE e.type = 'response'`
    ).all(...sessionIds) as { session_id: string; payload: string }[];

    const result = new Map<string, string>();
    for (const row of rows) {
      try {
        const p = JSON.parse(row.payload);
        const text = p.text ?? p.message?.content?.[0]?.text ?? p.result ?? '';
        result.set(row.session_id, typeof text === 'string' ? text : JSON.stringify(text));
      } catch {
        result.set(row.session_id, '');
      }
    }
    return result;
  }

  listBySession(sessionId: string, opts?: { limit?: number }): SessionEvent[] {
    const limit = opts?.limit;
    const query = limit
      ? 'SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at ASC LIMIT ?'
      : 'SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at ASC';

    const rows = (limit
      ? this.db.prepare(query).all(sessionId, limit)
      : this.db.prepare(query).all(sessionId)) as EventRow[];

    return rows.map(mapRow);
  }
}
