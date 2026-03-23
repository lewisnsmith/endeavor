import React from 'react';
import { Box, Text } from 'ink';
import type { SessionSnapshot } from '@endeavor/core';
import { THEME } from '../theme.js';

interface TopBarProps {
  sessions: SessionSnapshot[];
}

export function TopBar({ sessions }: TopBarProps) {
  const active = sessions.filter((s) => s.status === 'active').length;
  const waiting = sessions.filter((s) => s.status === 'waiting_input' || s.status === 'waiting_approval').length;
  const totalCost = sessions.reduce((sum, s) => sum + s.totalCostUsd, 0);

  return (
    <Box borderStyle="single" borderColor={THEME.border} paddingX={1}>
      <Text bold color={THEME.accent}>{THEME.sparkle} </Text>
      <Text bold color={THEME.text}>ENDEAVOR</Text>
      <Box flexGrow={1} />
      <Text color={THEME.active}>▪ {active} active</Text>
      <Text color={THEME.textMuted}>  </Text>
      {waiting > 0 && <Text color={THEME.waiting}>▪ {waiting} waiting</Text>}
      {waiting > 0 && <Text color={THEME.textMuted}>  </Text>}
      <Text color={THEME.cost}>${totalCost.toFixed(2)}</Text>
    </Box>
  );
}
