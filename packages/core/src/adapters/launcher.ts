import { spawn, type ChildProcess } from 'node:child_process';
import type { SessionAdapter, AdapterCapabilities } from './types.js';
import type { SessionSnapshot, SessionEvent, SpawnOpts, Unsubscribe } from '../types.js';
import type { SessionRepository } from '../storage/session-repo.js';
import type { SessionEventRepository } from '../storage/event-repo.js';
import type { Logger } from '../logger.js';
import { StreamJsonParser } from '../stream-parser.js';
import { EndeavorError, ErrorCode } from '../errors.js';

export interface LauncherDeps {
  sessions: SessionRepository;
  events: SessionEventRepository;
  logger: Logger;
}

interface ActiveProcess {
  sessionId: string;
  process: ChildProcess;
  parser: StreamJsonParser;
  listeners: ((event: SessionEvent) => void)[];
}

export class LauncherAdapter implements SessionAdapter {
  readonly source = 'launched';
  readonly capabilities: AdapterCapabilities = {
    canSpawn: true,
    canKill: true,
    canSendInput: true,
    canStreamOutput: true,
    canTrackCost: true,
  };

  private sessions: SessionRepository;
  private events: SessionEventRepository;
  private logger: Logger;
  private activeProcesses = new Map<string, ActiveProcess>();

  constructor(deps: LauncherDeps) {
    this.sessions = deps.sessions;
    this.events = deps.events;
    this.logger = deps.logger.child('launcher');
  }

  async discover(): Promise<SessionSnapshot[]> {
    return this.sessions.list().filter((s) => s.source === 'launched');
  }

  async spawn(opts: SpawnOpts): Promise<SessionSnapshot> {
    const args = ['--print', '--output-format', 'stream-json'];
    if (opts.resumeSessionId) {
      args.push('--resume', opts.resumeSessionId);
    }
    if (opts.initialPrompt && !opts.resumeSessionId) {
      args.push('-p', opts.initialPrompt);
    }

    let proc: ChildProcess;
    try {
      proc = spawn('claude', args, { cwd: opts.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      throw new EndeavorError(ErrorCode.SPAWN_FAILED, `Failed to spawn claude: ${err}`, err);
    }

    if (!proc.pid) {
      throw new EndeavorError(ErrorCode.SPAWN_FAILED, 'Failed to spawn claude: no PID');
    }

    const session = this.sessions.create({
      source: 'launched',
      label: opts.label ?? `session-${Date.now()}`,
      cwd: opts.cwd,
      pid: proc.pid,
      claudeSessionId: opts.resumeSessionId,
    });

    this.events.create({
      sessionId: session.id,
      type: 'status_change',
      payload: { from: null, to: 'active' },
    });

    const parser = new StreamJsonParser(proc.stdout!);
    const active: ActiveProcess = { sessionId: session.id, process: proc, parser, listeners: [] };
    this.activeProcesses.set(session.id, active);

    parser.onEvent((raw) => {
      this.handleStreamEvent(session.id, raw);
    });

    parser.onParseError(({ line, error }) => {
      this.logger.warn('Stream parse error', { sessionId: session.id, line, error: error.message });
    });

    proc.on('exit', (code) => {
      this.handleProcessExit(session.id, code);
    });

    proc.on('error', (err) => {
      this.logger.error('Process error', err, { sessionId: session.id });
      this.sessions.update(session.id, { status: 'error', pid: null });
      this.events.create({ sessionId: session.id, type: 'error', payload: { message: err.message } });
    });

    return session;
  }

  async kill(sessionId: string): Promise<void> {
    const active = this.activeProcesses.get(sessionId);
    if (active) {
      active.process.kill('SIGTERM');
    }
    const session = this.sessions.getById(sessionId);
    if (session && session.status !== 'completed' && session.status !== 'dead') {
      this.sessions.update(sessionId, { status: 'dead', pid: null });
    }
  }

  async sendInput(sessionId: string, input: string): Promise<void> {
    const session = this.sessions.getById(sessionId);
    if (!session) {
      throw new EndeavorError(ErrorCode.SESSION_NOT_FOUND, `Session not found: ${sessionId}`);
    }

    if (session.status !== 'waiting_input') {
      throw new EndeavorError(
        ErrorCode.SESSION_INVALID_STATE,
        `Cannot send input: session is ${session.status}, expected waiting_input`,
      );
    }

    const args = ['--print', '--output-format', 'stream-json'];
    if (session.claudeSessionId) {
      args.push('--resume', session.claudeSessionId);
    }
    args.push('-p', input);

    let proc: ChildProcess;
    try {
      proc = spawn('claude', args, { cwd: session.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      this.sessions.update(sessionId, { status: 'error' });
      this.events.create({ sessionId, type: 'error', payload: { message: `Resume failed: ${err}` } });
      throw new EndeavorError(ErrorCode.SPAWN_FAILED, `Failed to resume: ${err}`, err);
    }

    if (!proc.pid) {
      this.sessions.update(sessionId, { status: 'error' });
      throw new EndeavorError(ErrorCode.SPAWN_FAILED, 'Failed to resume: no PID');
    }

    this.sessions.update(sessionId, { status: 'active', pid: proc.pid });
    this.events.create({ sessionId, type: 'status_change', payload: { from: 'waiting_input', to: 'active' } });
    this.events.create({ sessionId, type: 'prompt', payload: { text: input } });

    const parser = new StreamJsonParser(proc.stdout!);
    const active: ActiveProcess = { sessionId, process: proc, parser, listeners: [] };
    this.activeProcesses.set(sessionId, active);

    parser.onEvent((raw) => this.handleStreamEvent(sessionId, raw));
    parser.onParseError(({ line, error }) => {
      this.logger.warn('Stream parse error', { sessionId, line, error: error.message });
    });
    proc.on('exit', (code) => this.handleProcessExit(sessionId, code));
    proc.on('error', (err) => {
      this.logger.error('Process error', err, { sessionId });
      this.sessions.update(sessionId, { status: 'error', pid: null });
      this.events.create({ sessionId, type: 'error', payload: { message: err.message } });
    });
  }

  onEvent(sessionId: string, cb: (event: SessionEvent) => void): Unsubscribe {
    const active = this.activeProcesses.get(sessionId);
    if (!active) return () => {};

    active.listeners.push(cb);

    return () => {
      const idx = active.listeners.indexOf(cb);
      if (idx >= 0) active.listeners.splice(idx, 1);
    };
  }

  dispose(): void {
    for (const active of this.activeProcesses.values()) {
      active.process.kill('SIGTERM');
    }
    this.activeProcesses.clear();
  }

  // ── Stream event mapping ──────────────────────────────────────────
  // All event-type → DB-event mapping lives here. When the stream-json
  // format is finalized after the research spike, update this single
  // switch to match the real event types.

  private handleStreamEvent(sessionId: string, raw: Record<string, unknown>): void {
    const now = new Date().toISOString();
    this.sessions.update(sessionId, { lastOutputAt: now });

    const type = raw.type as string;

    switch (type) {
      case 'assistant': {
        const event = this.events.create({ sessionId, type: 'response', payload: raw });
        this.notifyListeners(sessionId, event);
        const message = raw.message as Record<string, unknown> | undefined;
        const usage = message?.usage as { input_tokens?: number; output_tokens?: number } | undefined;
        if (usage) {
          const session = this.sessions.getById(sessionId);
          if (session) {
            this.sessions.update(sessionId, {
              inputTokens: session.inputTokens + (usage.input_tokens ?? 0),
              outputTokens: session.outputTokens + (usage.output_tokens ?? 0),
            });
          }
        }
        break;
      }
      case 'tool_use': {
        const event = this.events.create({ sessionId, type: 'tool_use', payload: raw });
        this.notifyListeners(sessionId, event);
        break;
      }
      case 'result': {
        const claudeSessionId = raw.session_id as string | undefined;
        const cost = raw.cost as number | undefined;
        const updates: Record<string, unknown> = {};
        if (claudeSessionId) updates.claudeSessionId = claudeSessionId;
        if (cost !== undefined) {
          const session = this.sessions.getById(sessionId);
          if (session) updates.totalCostUsd = session.totalCostUsd + cost;
        }
        if (Object.keys(updates).length > 0) {
          this.sessions.update(sessionId, updates);
        }
        const event = this.events.create({ sessionId, type: 'response', payload: raw });
        this.notifyListeners(sessionId, event);
        if (cost !== undefined) {
          this.events.create({ sessionId, type: 'cost_tick', payload: { cost } });
        }
        break;
      }
      default: {
        const event = this.events.create({ sessionId, type: 'response', payload: raw });
        this.notifyListeners(sessionId, event);
      }
    }
  }

  private handleProcessExit(sessionId: string, code: number | null): void {
    this.activeProcesses.delete(sessionId);

    const session = this.sessions.getById(sessionId);
    if (!session) return;

    const newStatus = code === 0
      ? (session.claudeSessionId ? 'waiting_input' : 'completed')
      : 'dead';

    this.sessions.update(sessionId, { status: newStatus, pid: null });

    this.events.create({
      sessionId,
      type: 'status_change',
      payload: { from: session.status, to: newStatus, exitCode: code },
    });

    this.logger.info('Process exited', { sessionId, exitCode: code, newStatus });
  }

  private notifyListeners(sessionId: string, event: SessionEvent): void {
    const active = this.activeProcesses.get(sessionId);
    if (!active) return;
    for (const cb of active.listeners) cb(event);
  }
}
