import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { SessionTile } from './session-tile.js';
import { repoName, THEME } from '../theme.js';
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

interface SessionGroup {
  name: string;
  sessions: SessionSnapshot[];
  startIndex: number; // flat index of first session in this group
}

function groupByProject(sessions: SessionSnapshot[]): SessionGroup[] {
  const map = new Map<string, SessionSnapshot[]>();
  for (const s of sessions) {
    const name = repoName(s.cwd);
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(s);
  }

  const groups: SessionGroup[] = [];
  let idx = 0;
  // Sort groups alphabetically
  const sortedNames = [...map.keys()].sort();
  for (const name of sortedNames) {
    const groupSessions = map.get(name)!;
    groups.push({ name, sessions: groupSessions, startIndex: idx });
    idx += groupSessions.length;
  }
  return groups;
}

export function Dashboard({ sessions, focusedIndex, activityMap }: DashboardProps) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;
  const tileWidth = 32; // 30 tile + 2 gap
  const cols = Math.max(1, Math.floor(termWidth / tileWidth));

  const groups = groupByProject(sessions);

  return (
    <Box flexDirection="column">
      {groups.map((group, groupIdx) => {
        // Build rows for this group
        const rows: SessionSnapshot[][] = [];
        for (let i = 0; i < group.sessions.length; i += cols) {
          rows.push(group.sessions.slice(i, i + cols));
        }

        // Separator line width
        const lineWidth = Math.min(termWidth - 2, cols * tileWidth);
        const labelPad = Math.max(0, lineWidth - group.name.length - 6);

        return (
          <Box key={group.name} flexDirection="column">
            {/* Separator + repo header */}
            {groupIdx > 0 && <Box marginTop={1} />}
            <Box>
              <Text color={THEME.border}>{'\u2500\u2500\u2500 '}</Text>
              <Text color={THEME.textDim} bold>{group.name}</Text>
              <Text color={THEME.border}>{' ' + '\u2500'.repeat(labelPad)}</Text>
            </Box>

            {/* Tile grid for this group */}
            {rows.map((row, rowIdx) => (
              <Box key={rowIdx} flexDirection="row" gap={1}>
                {row.map((session, colIdx) => {
                  const flatIdx = group.startIndex + rowIdx * cols + colIdx;
                  return (
                    <SessionTile
                      key={session.id}
                      session={session}
                      focused={flatIdx === focusedIndex}
                      activityText={activityMap.get(session.id)}
                    />
                  );
                })}
              </Box>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
