import React from 'react';
import { Box, Text } from 'ink';
import { THEME } from '../theme.js';

interface BottomBarProps {
  mode: 'dashboard' | 'focus' | 'spawn';
}

export function BottomBar({ mode }: BottomBarProps) {
  if (mode === 'focus') return null;

  return (
    <Box borderStyle="single" borderColor={THEME.border} paddingX={1}>
      {mode === 'dashboard' && (
        <>
          <Text color={THEME.textDim}>{'←→↑↓'}</Text><Text color={THEME.text}> navigate  </Text>
          <Text color={THEME.textDim}>Enter</Text><Text color={THEME.text}> focus  </Text>
          <Text color={THEME.textDim}>N</Text><Text color={THEME.text}> new  </Text>
          <Text color={THEME.textDim}>K</Text><Text color={THEME.text}> kill  </Text>
          <Text color={THEME.textDim}>Tab</Text><Text color={THEME.text}> next waiting  </Text>
          <Text color={THEME.textDim}>Q</Text><Text color={THEME.text}> quit</Text>
        </>
      )}
      {mode === 'spawn' && (
        <>
          <Text color={THEME.textDim}>ESC</Text><Text color={THEME.text}> cancel  </Text>
          <Text color={THEME.textDim}>Enter</Text><Text color={THEME.text}> confirm</Text>
        </>
      )}
    </Box>
  );
}
