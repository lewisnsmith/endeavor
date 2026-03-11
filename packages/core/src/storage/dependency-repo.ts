import type Database from 'better-sqlite3';
import type { Dependency } from '../types.js';
import { EndeavorError, ErrorCode } from '../errors.js';
import { generateId } from '../ids.js';

interface DependencyRow {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: number;
}

function mapRow(row: DependencyRow): Dependency {
  return {
    id: row.id,
    blockerId: row.blocker_id,
    blockedId: row.blocked_id,
    createdAt: row.created_at,
  };
}

export class DependencyRepository {
  constructor(private db: Database.Database) {}

  create(params: { blockerId: string; blockedId: string }): Dependency {
    if (params.blockerId === params.blockedId) {
      throw new EndeavorError(ErrorCode.DEPENDENCY_SELF, 'A work item cannot depend on itself');
    }

    const now = Date.now();
    const id = generateId('dependency');

    try {
      this.db
        .prepare(
          'INSERT INTO dependencies (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)',
        )
        .run(id, params.blockerId, params.blockedId, now);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('UNIQUE')) {
        throw new EndeavorError(ErrorCode.DEPENDENCY_DUPLICATE, 'This dependency already exists');
      }
      throw err;
    }

    return { id, blockerId: params.blockerId, blockedId: params.blockedId, createdAt: now };
  }

  getBlockersOf(itemId: string): Dependency[] {
    const rows = this.db
      .prepare('SELECT * FROM dependencies WHERE blocked_id = ?')
      .all(itemId) as DependencyRow[];
    return rows.map(mapRow);
  }

  getBlockedBy(itemId: string): Dependency[] {
    const rows = this.db
      .prepare('SELECT * FROM dependencies WHERE blocker_id = ?')
      .all(itemId) as DependencyRow[];
    return rows.map(mapRow);
  }

  hasCycle(blockerId: string, blockedId: string): boolean {
    // Check if adding blockerId -> blockedId would create a cycle
    // i.e., can we reach blockerId starting from blockedId via existing dependencies?
    const visited = new Set<string>();
    const queue = [blockerId];

    while (queue.length > 0) {
      const current = queue.pop()!;
      if (current === blockedId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const blockers = this.db
        .prepare('SELECT blocker_id FROM dependencies WHERE blocked_id = ?')
        .all(current) as Array<{ blocker_id: string }>;

      for (const b of blockers) {
        queue.push(b.blocker_id);
      }
    }

    return false;
  }

  deleteByBlocker(blockerId: string): number {
    const result = this.db
      .prepare('DELETE FROM dependencies WHERE blocker_id = ?')
      .run(blockerId);
    return result.changes;
  }
}
