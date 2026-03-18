import React from 'react';
import { Box, Text } from 'ink';

interface BottomBarProps {
  mode: 'dashboard' | 'focus' | 'spawn';
}

export function BottomBar({ mode }: BottomBarProps) {
  return (
    <Box borderStyle="single" paddingX={1}>
      {mode === 'dashboard' && (
        <>
          <Text dimColor>{'↑↓/jk'}</Text><Text> navigate  </Text>
          <Text dimColor>Enter</Text><Text> focus  </Text>
          <Text dimColor>N</Text><Text> new  </Text>
          <Text dimColor>K</Text><Text> kill  </Text>
          <Text dimColor>Tab</Text><Text> next waiting  </Text>
          <Text dimColor>Q</Text><Text> quit</Text>
        </>
      )}
      {mode === 'focus' && (
        <>
          <Text dimColor>ESC</Text><Text> back to dashboard  </Text>
          <Text dimColor>Type</Text><Text> to respond</Text>
        </>
      )}
      {mode === 'spawn' && (
        <>
          <Text dimColor>ESC</Text><Text> cancel  </Text>
          <Text dimColor>Enter</Text><Text> confirm</Text>
        </>
      )}
    </Box>
  );
}
