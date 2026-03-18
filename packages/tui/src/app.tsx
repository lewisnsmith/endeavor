import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TopBar } from './components/top-bar.js';
import { BottomBar } from './components/bottom-bar.js';
import type { SessionSnapshot } from '@endeavor/core';

type ViewMode = 'dashboard' | 'focus' | 'spawn';

interface AppProps {
  cwd: string;
  attach: boolean;
}

export function App({ cwd }: AppProps) {
  const { exit } = useApp();
  const [mode, setMode] = useState<ViewMode>('dashboard');
  const [sessions] = useState<SessionSnapshot[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useInput((input, key) => {
    if (mode === 'dashboard') {
      if (input === 'q' || input === 'Q') {
        exit();
        return;
      }
      if (input === 'n' || input === 'N') {
        setMode('spawn');
        return;
      }
      if (key.return && sessions.length > 0) {
        setMode('focus');
        return;
      }
      if (key.escape) {
        return;
      }
      if (input === 'j' || key.downArrow) {
        setFocusedIndex((i) => Math.min(i + 1, sessions.length - 1));
      }
      if (input === 'k' || key.upArrow) {
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }
    }

    if (mode === 'focus' || mode === 'spawn') {
      if (key.escape) {
        setMode('dashboard');
      }
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
          <Text>Dashboard with {sessions.length} sessions (tiles coming in Task 13)</Text>
        )}

        {mode === 'focus' && (
          <Text>Focus view (coming in Task 14)</Text>
        )}

        {mode === 'spawn' && (
          <Text>Spawn dialog (coming in Task 15)</Text>
        )}
      </Box>

      <BottomBar mode={mode} />
    </Box>
  );
}
