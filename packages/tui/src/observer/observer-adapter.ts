import type { SessionAdapter, AdapterCapabilities, SessionSnapshot } from '@endeavor/core';
import type { SessionRepository } from '@endeavor/core';
import type { Logger } from '@endeavor/core';
import { scanProcesses, getBranch } from './process-scanner.js';

export interface ObserverDeps {
  sessions: SessionRepository;
  logger: Logger;
  getLaunchedPids: () => Set<number>;
}

export class ObserverAdapter implements SessionAdapter {
  readonly source = 'observed';
  readonly capabilities: AdapterCapabilities = {
    canSpawn: false,
    canKill: true,
    canSendInput: false,
    canStreamOutput: false,
    canTrackCost: false,
  };

  private sessions: SessionRepository;
  private logger: Logger;
  private getLaunchedPids: () => Set<number>;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(deps: ObserverDeps) {
    this.sessions = deps.sessions;
    this.logger = deps.logger.child('observer');
    this.getLaunchedPids = deps.getLaunchedPids;
  }

  async discover(): Promise<SessionSnapshot[]> {
    const launchedPids = this.getLaunchedPids();
    const processes = scanProcesses();

    const knownObserved = this.sessions.list().filter((s) => s.source === 'observed');
    const knownPids = new Set(knownObserved.map((s) => s.pid).filter(Boolean));

    for (const proc of processes) {
      if (launchedPids.has(proc.pid)) continue;
      if (knownPids.has(proc.pid)) continue;

      const branch = proc.cwd ? getBranch(proc.cwd) : null;
      this.sessions.create({
        source: 'observed',
        label: `observed-${proc.pid}`,
        cwd: proc.cwd ?? 'unknown',
        pid: proc.pid,
        branch: branch ?? undefined,
      });

      this.logger.info('Discovered Claude process', { pid: proc.pid, cwd: proc.cwd ?? undefined });
    }

    const activePids = new Set(processes.map((p) => p.pid));
    for (const session of knownObserved) {
      if (session.pid && !activePids.has(session.pid) && session.status !== 'dead' && session.status !== 'completed') {
        this.sessions.update(session.id, { status: 'dead', pid: null });
        this.logger.info('Observed session gone', { id: session.id, pid: session.pid });
      }
    }

    return this.sessions.list().filter((s) => s.source === 'observed');
  }

  startPolling(intervalMs = 2000): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => {
      this.discover().catch((err) => {
        this.logger.error('Observer poll failed', err instanceof Error ? err : new Error(String(err)));
      });
    }, intervalMs);
  }

  async kill(sessionId: string): Promise<void> {
    const session = this.sessions.getById(sessionId);
    if (!session?.pid) return;

    try {
      process.kill(session.pid, 'SIGTERM');
    } catch {
      // Process may already be dead
    }
    this.sessions.update(sessionId, { status: 'dead', pid: null });
  }

  dispose(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
