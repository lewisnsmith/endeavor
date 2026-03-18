import type { SessionAdapter, AdapterCapabilities } from './adapters/types.js';
import type { SessionSnapshot, SessionEvent, SpawnOpts, Unsubscribe } from './types.js';
import type { SessionRepository } from './storage/session-repo.js';
import type { SessionEventRepository } from './storage/event-repo.js';
import type { Logger } from './logger.js';
import { EndeavorError, ErrorCode } from './errors.js';

export interface SessionManagerDeps {
  sessions: SessionRepository;
  events: SessionEventRepository;
  logger: Logger;
}

export class SessionManager {
  private adapters = new Map<string, SessionAdapter>();
  private sessions: SessionRepository;
  private events: SessionEventRepository;
  private logger: Logger;

  constructor(deps: SessionManagerDeps) {
    this.sessions = deps.sessions;
    this.events = deps.events;
    this.logger = deps.logger.child('session-manager');
  }

  register(adapter: SessionAdapter): void {
    if (this.adapters.has(adapter.source)) {
      throw new EndeavorError(
        ErrorCode.ADAPTER_DUPLICATE,
        `Duplicate adapter source: ${adapter.source}`,
      );
    }
    this.adapters.set(adapter.source, adapter);
    this.logger.info('Adapter registered', { source: adapter.source });
  }

  getCapabilities(source: string): AdapterCapabilities | null {
    return this.adapters.get(source)?.capabilities ?? null;
  }

  async discoverAll(): Promise<SessionSnapshot[]> {
    const results: SessionSnapshot[] = [];

    for (const [source, adapter] of this.adapters) {
      try {
        const discovered = await adapter.discover();
        results.push(...discovered);
      } catch (err) {
        this.logger.error(`Adapter discover failed`, err instanceof Error ? err : new Error(String(err)), { source });
      }
    }

    return results;
  }

  async spawn(source: string, opts: SpawnOpts): Promise<SessionSnapshot> {
    const adapter = this.adapters.get(source);
    if (!adapter?.spawn) {
      throw new EndeavorError(ErrorCode.ADAPTER_ERROR, `Adapter ${source} does not support spawn`);
    }

    try {
      const snapshot = await adapter.spawn(opts);
      this.logger.info('Session spawned', { id: snapshot.id, source, cwd: opts.cwd });
      return snapshot;
    } catch (err) {
      this.logger.error('Spawn failed', err instanceof Error ? err : new Error(String(err)), { source, cwd: opts.cwd });
      throw err;
    }
  }

  async kill(source: string, sessionId: string): Promise<void> {
    const adapter = this.adapters.get(source);
    if (!adapter?.kill) {
      throw new EndeavorError(ErrorCode.ADAPTER_ERROR, `Adapter ${source} does not support kill`);
    }

    await adapter.kill(sessionId);
    this.logger.info('Session killed', { id: sessionId, source });
  }

  async sendInput(source: string, sessionId: string, input: string): Promise<void> {
    const adapter = this.adapters.get(source);
    if (!adapter?.sendInput) {
      throw new EndeavorError(ErrorCode.ADAPTER_ERROR, `Adapter ${source} does not support sendInput`);
    }

    await adapter.sendInput(sessionId, input);
  }

  onEvent(source: string, sessionId: string, cb: (event: SessionEvent) => void): Unsubscribe {
    const adapter = this.adapters.get(source);
    if (!adapter?.onEvent) {
      return () => {};
    }
    return adapter.onEvent(sessionId, cb);
  }

  listSessions(): SessionSnapshot[] {
    return this.sessions.list();
  }

  logEvent(params: { sessionId: string; type: SessionEvent['type']; payload: Record<string, unknown> }): SessionEvent {
    return this.events.create(params);
  }

  dispose(): void {
    for (const adapter of this.adapters.values()) {
      adapter.dispose?.();
    }
    this.adapters.clear();
  }
}
