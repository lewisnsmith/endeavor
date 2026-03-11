import { join } from 'node:path';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { Endeavor, type LogLevel } from '@endeavor/core';
import { DbWatcher } from './watcher.js';
import { SocketNotifier } from './notifier.js';

export interface DaemonOptions {
  dataDir: string;
  logLevel?: LogLevel;
}

export class EndeavorDaemon {
  private endeavor: Endeavor;
  private watcher: DbWatcher | null = null;
  private notifier: SocketNotifier | null = null;
  private dataDir: string;

  constructor(opts: DaemonOptions) {
    this.dataDir = opts.dataDir;
    this.endeavor = new Endeavor({ dataDir: opts.dataDir, logLevel: opts.logLevel });
  }

  async start(): Promise<void> {
    this.endeavor.initialize();

    const socketPath = join(this.dataDir, 'endeavor.sock');
    this.notifier = new SocketNotifier({ socketPath });
    await this.notifier.start();

    // Get the raw db handle for the watcher
    const db = (this.endeavor as unknown as { database: { getDb(): unknown } }).database;
    // Access the database through the public repositories' db
    // We need the raw db — use a workaround
    const rawDb = this.endeavor.projects['db'];

    this.watcher = new DbWatcher({
      db: rawDb,
      onNotification: (notification) => {
        this.notifier?.broadcast(notification);
      },
    });

    this.watcher.start();

    // Write PID file
    const pidPath = join(this.dataDir, 'daemon.pid');
    writeFileSync(pidPath, process.pid.toString());

    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());

    console.log(`Endeavor daemon running (PID ${process.pid})`);
    console.log(`Socket: ${socketPath}`);
  }

  async stop(): Promise<void> {
    this.watcher?.stop();
    await this.notifier?.stop();
    this.endeavor.close();

    const pidPath = join(this.dataDir, 'daemon.pid');
    if (existsSync(pidPath)) {
      try { unlinkSync(pidPath); } catch { /* ignore */ }
    }

    console.log('Endeavor daemon stopped');
    process.exit(0);
  }
}

// CLI entry point
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const dataDir = process.env.ENDEAVOR_DATA_DIR ?? join(process.cwd(), '.endeavor');
  const logLevel = (process.env.ENDEAVOR_LOG_LEVEL ?? 'info') as LogLevel;
  const daemon = new EndeavorDaemon({ dataDir, logLevel });
  daemon.start().catch((err) => {
    console.error('Failed to start daemon:', err);
    process.exit(1);
  });
}

export { DbWatcher } from './watcher.js';
export { SocketNotifier } from './notifier.js';
export type { Notification, NotificationKind } from './types.js';
