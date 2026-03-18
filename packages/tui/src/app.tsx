import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import {
  EndeavorDatabase,
  SessionRepository,
  SessionEventRepository,
  SessionManager,
  LauncherAdapter,
  createLogger,
} from '@endeavor/core';
import type { SessionSnapshot, SessionEvent } from '@endeavor/core';
import { TopBar } from './components/top-bar.js';
import { BottomBar } from './components/bottom-bar.js';
import { Dashboard } from './components/dashboard.js';
import { FocusView } from './components/focus-view.js';
import { SpawnDialog } from './components/spawn-dialog.js';
import { ObserverAdapter } from './observer/observer-adapter.js';

type ViewMode = 'dashboard' | 'focus' | 'spawn';

interface AppProps {
  cwd: string;
  attach: boolean;
}

export function App({ cwd, attach }: AppProps) {
  const { exit } = useApp();
  const [mode, setMode] = useState<ViewMode>('dashboard');
  const [sessions, setSessions] = useState<SessionSnapshot[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const managerRef = useRef<SessionManager | null>(null);
  const sessionsRepoRef = useRef<SessionRepository | null>(null);
  const eventsRepoRef = useRef<SessionEventRepository | null>(null);
  const dbRef = useRef<EndeavorDatabase | null>(null);

  // Initialize DB + manager on mount
  useEffect(() => {
    const logger = createLogger('tui', { level: (process.env.ENDEAVOR_LOG_LEVEL ?? 'error') as any });
    const dbPath = `${cwd}/.endeavor/endeavor.db`;
    const db = new EndeavorDatabase({ dbPath, logger });
    db.initialize();
    dbRef.current = db;

    const sessionsRepo = new SessionRepository(db.getDb());
    const eventsRepo = new SessionEventRepository(db.getDb());
    sessionsRepoRef.current = sessionsRepo;
    eventsRepoRef.current = eventsRepo;

    const manager = new SessionManager({ sessions: sessionsRepo, events: eventsRepo, logger });

    // Register adapters
    const launcher = new LauncherAdapter({ sessions: sessionsRepo, events: eventsRepo, logger });
    manager.register(launcher);

    const observer = new ObserverAdapter({
      sessions: sessionsRepo,
      logger,
      getLaunchedPids: () => new Set<number>(),
    });
    observer.startPolling(5000);
    manager.register(observer);

    managerRef.current = manager;

    // If --attach, auto-focus first waiting session
    if (attach) {
      const waiting = sessionsRepo.listByStatus('waiting_input');
      if (waiting.length > 0) {
        setMode('focus');
      }
    }

    return () => {
      manager.dispose();
      db.close();
    };
  }, [cwd, attach]);

  // Poll sessions every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionsRepoRef.current) {
        setSessions(sessionsRepoRef.current.list());
      }
    }, 2000);

    // Initial load
    if (sessionsRepoRef.current) {
      setSessions(sessionsRepoRef.current.list());
    }

    return () => clearInterval(interval);
  }, []);

  // Load events when focused session changes
  useEffect(() => {
    if (mode === 'focus' && sessions[focusedIndex] && eventsRepoRef.current) {
      setEvents(eventsRepoRef.current.listBySession(sessions[focusedIndex].id, { limit: 100 }));
    }
  }, [mode, focusedIndex, sessions]);

  const handleSpawn = useCallback(async (spawnCwd: string, label: string, prompt: string) => {
    if (!managerRef.current) return;
    await managerRef.current.spawn('launched', {
      cwd: spawnCwd,
      label: label,
      initialPrompt: prompt,
    });
    setMode('dashboard');
  }, []);

  const handleSendInput = useCallback(async (input: string) => {
    const session = sessions[focusedIndex];
    if (!session || !managerRef.current) return;
    await managerRef.current.sendInput('launched', session.id, input);
  }, [sessions, focusedIndex]);

  const handleKill = useCallback(async () => {
    const session = sessions[focusedIndex];
    if (!session || !managerRef.current) return;
    await managerRef.current.kill(session.source, session.id);
  }, [sessions, focusedIndex]);

  useInput((input, key) => {
    if (mode === 'dashboard') {
      if (input === 'q' || input === 'Q') { exit(); return; }
      if (input === 'n' || input === 'N') { setMode('spawn'); return; }
      if (input === 'K') { handleKill(); return; }
      if (key.return && sessions.length > 0) { setMode('focus'); return; }
      if (key.tab) {
        const waitIdx = sessions.findIndex((s, i) => i > focusedIndex && (s.status === 'waiting_input' || s.status === 'waiting_approval'));
        if (waitIdx >= 0) setFocusedIndex(waitIdx);
        return;
      }
      if (input === 'j' || key.downArrow) { setFocusedIndex((i) => Math.min(i + 1, sessions.length - 1)); }
      if (input === 'k' || key.upArrow) { setFocusedIndex((i) => Math.max(i - 1, 0)); }
    }
    if (mode === 'focus' || mode === 'spawn') {
      if (key.escape) { setMode('dashboard'); }
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      <TopBar sessions={sessions} />

      <Box flexDirection="column" flexGrow={1} padding={1}>
        {mode === 'dashboard' && sessions.length === 0 && (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text dimColor>No sessions. Press N to start one.</Text>
          </Box>
        )}

        {mode === 'dashboard' && sessions.length > 0 && (
          <Dashboard sessions={sessions} focusedIndex={focusedIndex} />
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
