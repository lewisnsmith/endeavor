import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { homedir } from 'os';
import { mkdirSync } from 'fs';
import { join } from 'path';
import {
  EndeavorDatabase,
  SessionRepository,
  SessionEventRepository,
  SessionManager,
  LauncherAdapter,
  createLogger,
} from '@endeavor/core';
import type { SessionSnapshot, SessionEvent } from '@endeavor/core';
import { THEME } from './theme.js';
import { TopBar } from './components/top-bar.js';
import { BottomBar } from './components/bottom-bar.js';
import { Dashboard, sortByPriority } from './components/dashboard.js';
import { FocusView } from './components/focus-view.js';
import { SpawnDialog } from './components/spawn-dialog.js';
import { ErrorBanner } from './components/error-banner.js';
import { ObserverAdapter } from './observer/observer-adapter.js';

type ViewMode = 'dashboard' | 'focus' | 'spawn';

interface AppProps {
  cwd: string;
  attach: boolean;
}

export function App({ cwd, attach }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [mode, setMode] = useState<ViewMode>('dashboard');
  const [sessions, setSessions] = useState<SessionSnapshot[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activityMap, setActivityMap] = useState<Map<string, string>>(new Map());
  const managerRef = useRef<SessionManager | null>(null);
  const sessionsRepoRef = useRef<SessionRepository | null>(null);
  const eventsRepoRef = useRef<SessionEventRepository | null>(null);
  const dbRef = useRef<EndeavorDatabase | null>(null);
  const launcherRef = useRef<LauncherAdapter | null>(null);
  const unsubEventRef = useRef<(() => void) | null>(null);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }, []);

  // Initialize DB + manager — global DB at ~/.endeavor/
  useEffect(() => {
    const logger = createLogger('tui', { level: (process.env.ENDEAVOR_LOG_LEVEL ?? 'error') as any });
    const endeavorDir = join(homedir(), '.endeavor');
    mkdirSync(endeavorDir, { recursive: true });
    const dbPath = join(endeavorDir, 'endeavor.db');
    const db = new EndeavorDatabase({ dbPath, logger });
    db.initialize();
    dbRef.current = db;

    const sessionsRepo = new SessionRepository(db.getDb());
    const eventsRepo = new SessionEventRepository(db.getDb());
    sessionsRepoRef.current = sessionsRepo;
    eventsRepoRef.current = eventsRepo;

    const manager = new SessionManager({ sessions: sessionsRepo, events: eventsRepo, logger });

    const launcher = new LauncherAdapter({ sessions: sessionsRepo, events: eventsRepo, logger });
    launcherRef.current = launcher;
    manager.register(launcher);

    const observer = new ObserverAdapter({
      sessions: sessionsRepo,
      logger,
      getLaunchedPids: () => launcher.getActivePids(),
    });
    observer.startPolling(5000);
    manager.register(observer);

    managerRef.current = manager;

    if (attach) {
      const sorted = sortByPriority(sessionsRepo.list());
      if (sorted.length > 0 && (sorted[0].status === 'waiting_input' || sorted[0].status === 'waiting_approval')) {
        setMode('focus');
      }
    }

    return () => {
      manager.dispose();
      db.close();
    };
  }, [cwd, attach]);

  // Refresh sessions + activity map
  const refreshSessions = useCallback(() => {
    if (!sessionsRepoRef.current || !eventsRepoRef.current) return;
    const sorted = sortByPriority(sessionsRepoRef.current.list());
    setSessions(sorted);

    const ids = sorted.map((s) => s.id);
    const activity = eventsRepoRef.current.getLastResponseBySession(ids);
    setActivityMap(activity);
  }, []);

  // Poll sessions every 2s
  useEffect(() => {
    refreshSessions();
    const interval = setInterval(refreshSessions, 2000);
    return () => clearInterval(interval);
  }, [refreshSessions]);

  // Load events when focused session changes + subscribe to live events
  useEffect(() => {
    unsubEventRef.current?.();
    unsubEventRef.current = null;

    if (mode === 'focus' && sessions[focusedIndex] && eventsRepoRef.current && managerRef.current) {
      const session = sessions[focusedIndex];
      setEvents(eventsRepoRef.current.listBySession(session.id, { limit: 100 }));

      const unsub = managerRef.current.onEvent(session.source, session.id, (event) => {
        setEvents((prev) => [...prev, event]);
      });
      unsubEventRef.current = unsub;
    } else {
      setEvents([]);
    }

    return () => {
      unsubEventRef.current?.();
      unsubEventRef.current = null;
    };
  }, [mode, focusedIndex, sessions]);

  const handleSpawn = useCallback(async (spawnCwd: string, label: string, prompt: string) => {
    if (!managerRef.current) return;
    try {
      await managerRef.current.spawn('launched', { cwd: spawnCwd, label, initialPrompt: prompt });
      refreshSessions();
      setMode('dashboard');
    } catch (err) {
      showError(`Spawn failed: ${err instanceof Error ? err.message : String(err)}`);
      setMode('dashboard');
    }
  }, [refreshSessions, showError]);

  const handleSendInput = useCallback(async (input: string) => {
    const session = sessions[focusedIndex];
    if (!session || !managerRef.current) return;
    try {
      await managerRef.current.sendInput('launched', session.id, input);
      refreshSessions();
    } catch (err) {
      showError(`Send failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [sessions, focusedIndex, refreshSessions, showError]);

  const handleKill = useCallback(async () => {
    const session = sessions[focusedIndex];
    if (!session || !managerRef.current) return;
    try {
      await managerRef.current.kill(session.source, session.id);
      refreshSessions();
    } catch (err) {
      showError(`Kill failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [sessions, focusedIndex, refreshSessions, showError]);

  // Grid columns for 2D navigation
  const termWidth = stdout?.columns ?? 80;
  const tileWidth = 32;
  const cols = Math.max(1, Math.floor(termWidth / tileWidth));

  useInput((input, key) => {
    // === DASHBOARD MODE ===
    if (mode === 'dashboard') {
      if (input === 'q' || input === 'Q') { exit(); return; }
      if (input === 'n' || input === 'N') { setMode('spawn'); return; }
      if (input === 'K') { handleKill(); return; }
      if (key.return && sessions.length > 0) { setMode('focus'); return; }

      // Tab — jump to next waiting session
      if (key.tab) {
        const len = sessions.length;
        for (let offset = 1; offset <= len; offset++) {
          const idx = (focusedIndex + offset) % len;
          if (sessions[idx].status === 'waiting_input' || sessions[idx].status === 'waiting_approval') {
            setFocusedIndex(idx);
            return;
          }
        }
        return;
      }

      // 2D grid arrow navigation
      if (key.rightArrow) setFocusedIndex((i) => Math.min(i + 1, sessions.length - 1));
      if (key.leftArrow) setFocusedIndex((i) => Math.max(i - 1, 0));
      if (key.downArrow) setFocusedIndex((i) => Math.min(i + cols, sessions.length - 1));
      if (key.upArrow) setFocusedIndex((i) => Math.max(i - cols, 0));
    }

    // === FOCUS MODE ===
    // Arrow keys are handled by FocusView's own useInput (scroll up/down)
    // App only handles escape, tab, and kill here
    if (mode === 'focus') {
      if (key.escape) { setMode('dashboard'); return; }
      if (input === 'K') { handleKill(); return; }

      // Tab — jump to next waiting session
      if (key.tab) {
        const len = sessions.length;
        for (let offset = 1; offset <= len; offset++) {
          const idx = (focusedIndex + offset) % len;
          if (sessions[idx].status === 'waiting_input' || sessions[idx].status === 'waiting_approval') {
            setFocusedIndex(idx);
            return;
          }
        }
        return;
      }
    }

    // === SPAWN MODE ===
    // Arrow keys and enter handled by SpawnDialog's own useInput
    if (mode === 'spawn') {
      if (key.escape) { setMode('dashboard'); }
    }
  });

  // Clamp focusedIndex
  useEffect(() => {
    if (sessions.length > 0 && focusedIndex >= sessions.length) {
      setFocusedIndex(sessions.length - 1);
    }
  }, [sessions.length, focusedIndex]);

  return (
    <Box flexDirection="column" width="100%">
      {mode !== 'focus' && <TopBar sessions={sessions} />}

      {error && <ErrorBanner message={error} />}

      <Box flexDirection="column" flexGrow={1} padding={mode === 'focus' ? 0 : 1}>
        {mode === 'dashboard' && sessions.length === 0 && (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text color={THEME.textDim}>No sessions. Press N to start one.</Text>
          </Box>
        )}

        {mode === 'dashboard' && sessions.length > 0 && (
          <Dashboard sessions={sessions} focusedIndex={focusedIndex} activityMap={activityMap} />
        )}

        {mode === 'focus' && sessions[focusedIndex] && (
          <FocusView
            session={sessions[focusedIndex]}
            events={events}
            canSendInput={sessions[focusedIndex].source === 'launched'}
            onSendInput={handleSendInput}
            onBack={() => setMode('dashboard')}
          />
        )}

        {mode === 'spawn' && (
          <SpawnDialog
            defaultCwd={cwd}
            onSpawn={(spawnCwd, label, prompt) => handleSpawn(spawnCwd, label, prompt)}
            onCancel={() => setMode('dashboard')}
          />
        )}
      </Box>

      <BottomBar mode={mode} />
    </Box>
  );
}
