import React from 'react';
import { Box, useStdout } from 'ink';
import { SessionTile } from './session-tile.js';
import type { SessionSnapshot, SessionStatus } from '@endeavor/core';

interface DashboardProps {
  sessions: SessionSnapshot[];
  focusedIndex: number;
  activityMap: Map<string, string>;
}

export const STATUS_PRIORITY: Record<SessionStatus, number> = {
  waiting_input: 0,
  waiting_approval: 1,
  error: 2,
  active: 3,
  completed: 4,
  dead: 5,
};

export function sortByPriority(sessions: SessionSnapshot[]): SessionSnapshot[] {
  return [...sessions].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99;
    const pb = STATUS_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function Dashboard({ sessions, focusedIndex, activityMap }: DashboardProps) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;
  const tileWidth = 32; // 30 tile + 2 gap
  const cols = Math.max(1, Math.floor(termWidth / tileWidth));

  const rows: SessionSnapshot[][] = [];
  for (let i = 0; i < sessions.length; i += cols) {
    rows.push(sessions.slice(i, i + cols));
  }

  return (
    <Box flexDirection="column">
      {rows.map((row, rowIdx) => (
        <Box key={rowIdx} flexDirection="row" gap={1}>
          {row.map((session, colIdx) => {
            const idx = rowIdx * cols + colIdx;
            return (
              <SessionTile
                key={session.id}
                session={session}
                focused={idx === focusedIndex}
                activityText={activityMap.get(session.id)}
              />
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
