import React from 'react';
import { Box, Text } from 'ink';
import type { SessionSnapshot } from '@endeavor/core';
import { THEME, statusColor, statusLabel, repoName } from '../theme.js';

interface SessionTileProps {
  session: SessionSnapshot;
  focused: boolean;
  activityText?: string;
}

function relativeTime(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h${mins % 60}m`;
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.slice(0, len - 1) + '…';
}

function formatTokens(input: number, output: number): string {
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  if (input === 0 && output === 0) return '';
  return `${fmt(input)}↑ ${fmt(output)}↓`;
}

const isDone = (s: SessionSnapshot) => s.status === 'completed' || s.status === 'dead';

export function SessionTile({ session, focused, activityText }: SessionTileProps) {
  const color = statusColor(session.status);
  const dim = isDone(session) && !focused;
  const W = 30;
  const innerW = W - 4; // 26 chars inner width

  const borderColor = focused ? THEME.accent : THEME.border;

  const project = repoName(session.cwd);
  const branch = session.branch;

  // Activity preview — up to 3 lines
  const activityLines: string[] = [];
  if (activityText) {
    const cleaned = activityText.replace(/\n+/g, ' ').trim();
    if (cleaned) {
      for (let i = 0; i < 3 && i * innerW < cleaned.length; i++) {
        activityLines.push(truncate(cleaned.slice(i * innerW, (i + 1) * innerW), innerW));
      }
    }
  }

  // Pad activity to always have 3 lines for consistent height
  while (activityLines.length < 3) {
    activityLines.push('');
  }

  return (
    <Box
      width={W}
      height={12}
      borderStyle="single"
      borderColor={borderColor}
      flexDirection="column"
      paddingX={1}
    >
      {/* Row 1: status + time */}
      <Box justifyContent="space-between">
        <Text color={color} bold dimColor={dim}>{statusLabel(session.status)}</Text>
        <Text color={THEME.textMuted}>{relativeTime(session.startedAt)}</Text>
      </Box>

      {/* Row 2: label */}
      <Text color={focused ? THEME.text : THEME.textDim} bold={focused} dimColor={dim}>
        {truncate(session.label, innerW)}
      </Text>

      {/* Row 3: repo name */}
      <Text color={THEME.accent}>{truncate(project, innerW)}</Text>

      {/* Row 4: branch */}
      <Text color={THEME.textDim}>
        {branch ? truncate(branch, innerW) : ''}
      </Text>

      {/* Row 5: cost + model */}
      <Box justifyContent="space-between">
        <Text color={THEME.cost} dimColor={dim}>${session.totalCostUsd.toFixed(2)}</Text>
        <Text color={THEME.textMuted}>{session.model ? truncate(session.model, 14) : ''}</Text>
      </Box>

      {/* Row 6: tokens */}
      <Text color={THEME.textMuted}>
        {formatTokens(session.inputTokens, session.outputTokens)}
      </Text>

      {/* Rows 7-9: activity preview */}
      {activityLines.map((line, i) => (
        <Text key={i} color={THEME.textDim}>{line}</Text>
      ))}
    </Box>
  );
}
