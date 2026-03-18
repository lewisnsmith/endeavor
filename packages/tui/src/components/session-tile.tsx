import React from 'react';
import { Box, Text } from 'ink';
import type { SessionSnapshot } from '@endeavor/core';
import { IDLE_THRESHOLD_MS, ACTIVE_OUTPUT_THRESHOLD_MS } from '@endeavor/core';

interface SessionTileProps {
  session: SessionSnapshot;
  focused: boolean;
}

function getStatusColor(session: SessionSnapshot): string {
  if (['waiting_input', 'waiting_approval', 'error'].includes(session.status)) {
    return 'red';
  }
  if (session.status === 'active') {
    const lastOutput = session.lastOutputAt ? new Date(session.lastOutputAt).getTime() : 0;
    const elapsed = Date.now() - lastOutput;
    if (elapsed < ACTIVE_OUTPUT_THRESHOLD_MS) return 'green';
    if (elapsed < IDLE_THRESHOLD_MS) return 'yellow';
    return 'gray';
  }
  return 'gray';
}

function getStatusLabel(session: SessionSnapshot): string {
  switch (session.status) {
    case 'waiting_input': return 'WAITING FOR INPUT';
    case 'waiting_approval': return 'NEEDS APPROVAL';
    case 'active': return 'ACTIVE';
    case 'error': return 'ERROR';
    case 'completed': return 'COMPLETED';
    case 'dead': return 'DEAD';
    default: return (session.status as string).toUpperCase();
  }
}

function formatDuration(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h${mins % 60}m`;
}

export function SessionTile({ session, focused }: SessionTileProps) {
  const color = getStatusColor(session);
  const borderColor = focused ? 'cyan' : color;

  return (
    <Box
      width={30}
      height={6}
      borderStyle={focused ? 'double' : 'single'}
      borderColor={borderColor}
      flexDirection="column"
      paddingX={1}
    >
      <Box>
        <Text color={color} bold>{getStatusLabel(session)}</Text>
        {session.source === 'observed' && <Text dimColor> [obs]</Text>}
      </Box>
      <Text>{session.label}</Text>
      <Text dimColor>{session.branch ?? session.cwd}</Text>
      <Box>
        <Text color="green">${session.totalCostUsd.toFixed(2)}</Text>
        <Text dimColor> · {formatDuration(session.startedAt)}</Text>
      </Box>
    </Box>
  );
}
