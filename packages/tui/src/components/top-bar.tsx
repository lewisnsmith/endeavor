import React from 'react';
import { Box, Text } from 'ink';
import type { SessionSnapshot } from '@endeavor/core';

interface TopBarProps {
  sessions: SessionSnapshot[];
}

export function TopBar({ sessions }: TopBarProps) {
  const active = sessions.filter((s) => s.status === 'active').length;
  const waiting = sessions.filter((s) => s.status === 'waiting_input' || s.status === 'waiting_approval').length;
  const totalCost = sessions.reduce((sum, s) => sum + s.totalCostUsd, 0);

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text bold color="cyan">ENDEAVOR</Text>
      <Box flexGrow={1} />
      <Text>{active} active</Text>
      <Text>  </Text>
      {waiting > 0 && <Text color="red">{waiting} waiting</Text>}
      {waiting > 0 && <Text>  </Text>}
      <Text color="green">${totalCost.toFixed(2)}</Text>
    </Box>
  );
}
