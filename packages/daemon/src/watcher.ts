import type Database from 'better-sqlite3';
import type { Notification } from './types.js';

export interface WatcherOptions {
  db: Database.Database;
  pollIntervalMs?: number;
  onNotification: (notification: Notification) => void;
}

export class DbWatcher {
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastCheck: number;
  private db: Database.Database;
  private pollIntervalMs: number;
  private onNotification: (notification: Notification) => void;

  constructor(opts: WatcherOptions) {
    this.db = opts.db;
    this.pollIntervalMs = opts.pollIntervalMs ?? 2000;
    this.onNotification = opts.onNotification;
    this.lastCheck = Date.now();
  }

  start(): void {
    this.lastCheck = Date.now();
    this.interval = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private poll(): void {
    const since = this.lastCheck;
    this.lastCheck = Date.now();

    // Check for new pending handoffs
    const newHandoffs = this.db
      .prepare('SELECT * FROM handoffs WHERE status = ? AND created_at > ?')
      .all('pending', since) as Array<Record<string, unknown>>;

    for (const h of newHandoffs) {
      this.onNotification({
        kind: 'handoff_created',
        timestamp: Date.now(),
        data: { handoffId: h.id, toAgent: h.to_agent, summary: h.summary },
      });
    }

    // Check for items that became unblocked (status changed from blocked to todo)
    const unblockedItems = this.db
      .prepare('SELECT * FROM work_items WHERE status = ? AND updated_at > ?')
      .all('todo', since) as Array<Record<string, unknown>>;

    for (const item of unblockedItems) {
      // Only notify if it was recently updated (potential unblock)
      if ((item.updated_at as number) > since && (item.created_at as number) < since) {
        this.onNotification({
          kind: 'item_unblocked',
          timestamp: Date.now(),
          data: { itemId: item.id, description: item.description },
        });
      }
    }

    // Check for completed items
    const completedItems = this.db
      .prepare('SELECT * FROM work_items WHERE status = ? AND updated_at > ?')
      .all('done', since) as Array<Record<string, unknown>>;

    for (const item of completedItems) {
      if ((item.updated_at as number) > since) {
        this.onNotification({
          kind: 'item_completed',
          timestamp: Date.now(),
          data: { itemId: item.id, description: item.description },
        });
      }
    }
  }
}
