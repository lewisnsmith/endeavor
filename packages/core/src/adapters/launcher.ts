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
    const args = ['--print', '--output-format', 'stream-json', '--verbose'];
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

    this.wireProcess(session.id, proc);
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

    const args = ['--print', '--output-format', 'stream-json', '--verbose'];
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

    this.wireProcess(sessionId, proc);
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

  getActivePids(): Set<number> {
    const pids = new Set<number>();
    for (const active of this.activeProcesses.values()) {
      if (active.process.pid) pids.add(active.process.pid);
    }
    return pids;
  }

  dispose(): void {
    for (const active of this.activeProcesses.values()) {
      active.process.kill('SIGTERM');
    }
    this.activeProcesses.clear();
  }

  // ── Shared wiring for spawn and sendInput ─────────────────────────

  private wireProcess(sessionId: string, proc: ChildProcess): void {
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

  // ── Auto-title & role detection helpers ────────────────────────────

  private extractAutoTitle(block: Record<string, unknown>): string | null {
    if (block.type === 'tool_use') {
      const name = block.name as string;
      const input = block.input as Record<string, unknown> | undefined;
      if (input) {
        const filePath = (input.file_path ?? input.path ?? input.command ?? '') as string;
        if (filePath) {
          const short = filePath.split('/').pop() ?? filePath;
          return `${name} ${short}`.slice(0, 40);
        }
      }
      return name.slice(0, 40);
    }
    if (block.type === 'text') {
      const text = (block.text as string).trim();
      if (!text) return null;
      // Take first sentence
      const match = text.match(/^[^.!?\n]+[.!?]?/);
      const sentence = match ? match[0].trim() : text;
      return sentence.slice(0, 40);
    }
    return null;
  }

  private static readonly ROLE_MAP: Record<string, string> = {
    Read: 'researcher', Grep: 'researcher', Glob: 'researcher', WebSearch: 'researcher',
    Edit: 'executor', Write: 'executor',
    Bash: 'general', // refined below for test/lint
  };

  private inferRole(sessionId: string, toolName: string, input?: Record<string, unknown>): void {
    const session = this.sessions.getById(sessionId);
    if (!session) return;
    const meta = { ...session.metadata } as Record<string, unknown>;
    const history = (meta._toolHistory as string[] | undefined) ?? [];

    let category = LauncherAdapter.ROLE_MAP[toolName] ?? 'general';
    if (toolName === 'Bash' && input) {
      const cmd = (input.command as string) ?? '';
      if (/\b(test|vitest|jest|pytest|lint|eslint|tsc)\b/.test(cmd)) {
        category = 'reviewer';
      }
    }

    history.push(category);
    if (history.length > 10) history.shift();
    meta._toolHistory = history;

    // Count categories in window
    const counts: Record<string, number> = {};
    for (const c of history) {
      counts[c] = (counts[c] ?? 0) + 1;
    }
    // If no tools yet (text-heavy), default architect
    let bestRole = 'general';
    let bestCount = 0;
    for (const [role, count] of Object.entries(counts)) {
      if (count > bestCount) { bestCount = count; bestRole = role; }
    }
    meta.agentRole = bestRole;
    this.sessions.update(sessionId, { metadata: meta });
  }

  private setAutoTitle(sessionId: string, title: string): void {
    const session = this.sessions.getById(sessionId);
    if (!session) return;
    const meta = { ...session.metadata } as Record<string, unknown>;
    if (meta.autoTitle) return; // only set once
    meta.autoTitle = title;
    this.sessions.update(sessionId, { metadata: meta });
  }

  // ── Stream event mapping ──────────────────────────────────────────
  //
  // Real stream-json event types (with --verbose):
  //   system       — init, hook_started, hook_response
  //   assistant    — contains message with content blocks (text, tool_use, tool_result)
  //   result       — final summary with session_id, total_cost_usd, usage
  //   rate_limit_event — rate limit status
  //
  // The assistant.message.content array contains the actual work:
  //   { type: "text", text: "..." }
  //   { type: "tool_use", id: "...", name: "...", input: {...} }
  //   { type: "tool_result", tool_use_id: "...", content: "..." }

  private handleStreamEvent(sessionId: string, raw: Record<string, unknown>): void {
    const now = new Date().toISOString();
    this.sessions.update(sessionId, { lastOutputAt: now });

    const type = raw.type as string;

    switch (type) {
      case 'system': {
        const subtype = raw.subtype as string;
        if (subtype === 'init') {
          // Capture model from init event
          const model = raw.model as string | undefined;
          if (model) {
            this.sessions.update(sessionId, { model });
          }
          // Capture session_id if available
          const claudeSessionId = raw.session_id as string | undefined;
          if (claudeSessionId) {
            this.sessions.update(sessionId, { claudeSessionId });
          }
        }
        // Don't create DB events for hook_started/hook_response noise
        break;
      }

      case 'assistant': {
        const message = raw.message as Record<string, unknown> | undefined;
        const content = (message?.content as Array<Record<string, unknown>>) ?? [];

        // Extract text and tool_use blocks from content
        for (const block of content) {
          // Auto-title: set from first meaningful block
          const title = this.extractAutoTitle(block);
          if (title) this.setAutoTitle(sessionId, title);

          if (block.type === 'text') {
            const event = this.events.create({
              sessionId,
              type: 'response',
              payload: { text: block.text },
            });
            this.notifyListeners(sessionId, event);
          } else if (block.type === 'tool_use') {
            // Agent role detection from tool usage
            this.inferRole(sessionId, block.name as string, block.input as Record<string, unknown> | undefined);
            const event = this.events.create({
              sessionId,
              type: 'tool_use',
              payload: { name: block.name, input: block.input, id: block.id },
            });
            this.notifyListeners(sessionId, event);
          } else if (block.type === 'tool_result') {
            const event = this.events.create({
              sessionId,
              type: 'response',
              payload: { text: `[tool_result] ${String(block.content ?? '').slice(0, 500)}`, tool_use_id: block.tool_use_id },
            });
            this.notifyListeners(sessionId, event);
          }
        }

        // Track token usage from message.usage
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

      case 'result': {
        const claudeSessionId = raw.session_id as string | undefined;
        const totalCost = raw.total_cost_usd as number | undefined;
        const updates: Record<string, unknown> = {};
        if (claudeSessionId) updates.claudeSessionId = claudeSessionId;
        if (totalCost !== undefined) updates.totalCostUsd = totalCost;

        // Extract model usage for token counts
        const usage = raw.usage as { input_tokens?: number; output_tokens?: number } | undefined;
        if (usage) {
          updates.inputTokens = usage.input_tokens ?? 0;
          updates.outputTokens = usage.output_tokens ?? 0;
        }

        if (Object.keys(updates).length > 0) {
          this.sessions.update(sessionId, updates);
        }

        const resultText = raw.result as string | undefined;
        if (resultText) {
          const event = this.events.create({
            sessionId,
            type: 'response',
            payload: { text: resultText, final: true },
          });
          this.notifyListeners(sessionId, event);
        }

        if (totalCost !== undefined) {
          const event = this.events.create({
            sessionId,
            type: 'cost_tick',
            payload: { cost: totalCost },
          });
          this.notifyListeners(sessionId, event);
        }
        break;
      }

      case 'rate_limit_event': {
        // Log but don't store — too noisy
        this.logger.debug('Rate limit event', { sessionId, info: raw.rate_limit_info });
        break;
      }

      default: {
        // Unknown event type — store for debugging
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
