import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObserverAdapter } from './observer-adapter.js';
import * as processScanner from './process-scanner.js';
import type { SessionSnapshot, Logger } from '@endeavor/core';
import type { SessionRepository } from '@endeavor/core';

vi.mock('./process-scanner.js', () => ({
  scanProcesses: vi.fn(() => []),
  getBranch: vi.fn(() => null),
}));

vi.mock('../theme.js', () => ({
  repoName: (cwd: string) => cwd.split('/').pop() ?? 'unknown',
  THEME: {},
  statusColor: vi.fn(),
  statusLabel: vi.fn(),
  repoSubPath: vi.fn(),
}));

function makeSession(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    id: 's_test1',
    source: 'observed',
    status: 'active',
    claudeSessionId: null,
    pid: 1234,
    label: 'Test Session',
    cwd: '/some/path',
    branch: null,
    inputTokens: 0,
    outputTokens: 0,
    totalCostUsd: 0,
    model: null,
    lastOutputAt: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

function makeLogger(): Logger {
  const logger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  };
  (logger.child as ReturnType<typeof vi.fn>).mockReturnValue(logger);
  return logger;
}

function makeRepo(): SessionRepository {
  return {
    list: vi.fn().mockReturnValue([]),
    getById: vi.fn().mockReturnValue(null),
    create: vi.fn().mockReturnValue(makeSession()),
    update: vi.fn(),
    delete: vi.fn(),
    listByStatus: vi.fn().mockReturnValue([]),
  } as unknown as SessionRepository;
}

describe('ObserverAdapter', () => {
  let adapter: ObserverAdapter;
  let sessions: ReturnType<typeof makeRepo>;
  let logger: ReturnType<typeof makeLogger>;
  let getLaunchedPids: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessions = makeRepo();
    logger = makeLogger();
    getLaunchedPids = vi.fn().mockReturnValue(new Set<number>());
    adapter = new ObserverAdapter({ sessions, logger, getLaunchedPids });
  });

  afterEach(() => {
    adapter.dispose();
    vi.clearAllMocks();
  });

  describe('source and capabilities', () => {
    it('has source = observed', () => {
      expect(adapter.source).toBe('observed');
    });

    it('can kill but not spawn, send input, or stream output', () => {
      expect(adapter.capabilities.canKill).toBe(true);
      expect(adapter.capabilities.canSpawn).toBe(false);
      expect(adapter.capabilities.canSendInput).toBe(false);
      expect(adapter.capabilities.canStreamOutput).toBe(false);
      expect(adapter.capabilities.canTrackCost).toBe(false);
    });
  });

  describe('discover()', () => {
    it('creates a session for a newly seen process', async () => {
      vi.mocked(processScanner.scanProcesses).mockReturnValue([{ pid: 9999, cwd: '/some/repo' }]);
      vi.mocked(processScanner.getBranch).mockReturnValue('main');
      (sessions.list as ReturnType<typeof vi.fn>).mockReturnValue([]);

      await adapter.discover();

      expect(sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ pid: 9999, source: 'observed', branch: 'main' }),
      );
    });

    it('skips processes already tracked by the launcher', async () => {
      getLaunchedPids.mockReturnValue(new Set([9999]));
      vi.mocked(processScanner.scanProcesses).mockReturnValue([{ pid: 9999, cwd: '/some/repo' }]);
      (sessions.list as ReturnType<typeof vi.fn>).mockReturnValue([]);

      await adapter.discover();

      expect(sessions.create).not.toHaveBeenCalled();
    });

    it('skips processes already known as observed sessions', async () => {
      vi.mocked(processScanner.scanProcesses).mockReturnValue([{ pid: 9999, cwd: '/some/repo' }]);
      (sessions.list as ReturnType<typeof vi.fn>).mockReturnValue([
        makeSession({ pid: 9999, source: 'observed' }),
      ]);

      await adapter.discover();

      expect(sessions.create).not.toHaveBeenCalled();
    });

    it('marks gone sessions as dead', async () => {
      vi.mocked(processScanner.scanProcesses).mockReturnValue([]);
      (sessions.list as ReturnType<typeof vi.fn>).mockReturnValue([
        makeSession({ id: 's_gone', pid: 8888, status: 'active', source: 'observed' }),
      ]);

      await adapter.discover();

      expect(sessions.update).toHaveBeenCalledWith('s_gone', { status: 'dead', pid: null });
    });

    it('does not re-mark already-dead sessions', async () => {
      vi.mocked(processScanner.scanProcesses).mockReturnValue([]);
      (sessions.list as ReturnType<typeof vi.fn>).mockReturnValue([
        makeSession({ id: 's_dead', pid: 8888, status: 'dead', source: 'observed' }),
      ]);

      await adapter.discover();

      expect(sessions.update).not.toHaveBeenCalled();
    });

    it('does not re-mark completed sessions', async () => {
      vi.mocked(processScanner.scanProcesses).mockReturnValue([]);
      (sessions.list as ReturnType<typeof vi.fn>).mockReturnValue([
        makeSession({ id: 's_done', pid: 8888, status: 'completed', source: 'observed' }),
      ]);

      await adapter.discover();

      expect(sessions.update).not.toHaveBeenCalled();
    });

    it('uses unknown label when process has no cwd', async () => {
      vi.mocked(processScanner.scanProcesses).mockReturnValue([{ pid: 7777, cwd: null }]);
      (sessions.list as ReturnType<typeof vi.fn>).mockReturnValue([]);

      await adapter.discover();

      expect(sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ cwd: 'unknown' }),
      );
    });
  });

  describe('kill()', () => {
    it('sends SIGTERM to the process and marks it dead', async () => {
      (sessions.getById as ReturnType<typeof vi.fn>).mockReturnValue(makeSession({ pid: 5555 }));
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

      await adapter.kill('s_test1');

      expect(killSpy).toHaveBeenCalledWith(5555, 'SIGTERM');
      expect(sessions.update).toHaveBeenCalledWith('s_test1', { status: 'dead', pid: null });
      killSpy.mockRestore();
    });

    it('no-ops when the session has no pid', async () => {
      (sessions.getById as ReturnType<typeof vi.fn>).mockReturnValue(makeSession({ pid: null }));
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

      await adapter.kill('s_test1');

      expect(killSpy).not.toHaveBeenCalled();
      killSpy.mockRestore();
    });

    it('no-ops when the session is not found', async () => {
      (sessions.getById as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

      await adapter.kill('s_missing');

      expect(killSpy).not.toHaveBeenCalled();
      killSpy.mockRestore();
    });

    it('does not throw when the process is already dead', async () => {
      (sessions.getById as ReturnType<typeof vi.fn>).mockReturnValue(makeSession({ pid: 5555 }));
      vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('No such process');
      });

      await expect(adapter.kill('s_test1')).resolves.not.toThrow();
    });
  });

  describe('startPolling()', () => {
    it('calls discover on each interval tick', async () => {
      vi.useFakeTimers();
      const discoverSpy = vi.spyOn(adapter, 'discover').mockResolvedValue([]);

      adapter.startPolling(100);
      await vi.advanceTimersByTimeAsync(350);

      expect(discoverSpy).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });

    it('is idempotent — a second call does not start another interval', async () => {
      vi.useFakeTimers();
      const discoverSpy = vi.spyOn(adapter, 'discover').mockResolvedValue([]);

      adapter.startPolling(100);
      adapter.startPolling(100);
      await vi.advanceTimersByTimeAsync(100);

      expect(discoverSpy).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  describe('dispose()', () => {
    it('stops the polling interval', async () => {
      vi.useFakeTimers();
      const discoverSpy = vi.spyOn(adapter, 'discover').mockResolvedValue([]);

      adapter.startPolling(100);
      adapter.dispose();
      await vi.advanceTimersByTimeAsync(500);

      expect(discoverSpy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
