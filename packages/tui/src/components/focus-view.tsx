import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { SessionSnapshot, SessionEvent } from '@endeavor/core';

interface FocusViewProps {
  session: SessionSnapshot;
  events: SessionEvent[];
  canSendInput: boolean;
  onSendInput: (input: string) => void;
  onBack: () => void;
}

export function FocusView({ session, events, canSendInput, onSendInput, onBack }: FocusViewProps) {
  const [inputValue, setInputValue] = useState('');

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
    }
  });

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      onSendInput(value.trim());
      setInputValue('');
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="single" paddingX={1}>
        <Text dimColor>{'← ESC'}</Text>
        <Text>  </Text>
        <Text bold>{session.label}</Text>
        <Text>  </Text>
        <Text color={session.status === 'waiting_input' ? 'red' : 'green'}>
          {session.status.toUpperCase()}
        </Text>
        <Box flexGrow={1} />
        <Text color="green">${session.totalCostUsd.toFixed(2)}</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {events.length === 0 && (
          <Text dimColor>No events yet...</Text>
        )}
        {events.map((event) => (
          <Box key={event.id} marginBottom={1}>
            {event.type === 'response' && (
              <Text>{(event.payload as { text?: string }).text ?? JSON.stringify(event.payload).slice(0, 200)}</Text>
            )}
            {event.type === 'tool_use' && (
              <Text dimColor>[tool: {(event.payload as { name?: string }).name ?? 'unknown'}]</Text>
            )}
            {event.type === 'error' && (
              <Text color="red">Error: {(event.payload as { message?: string }).message ?? 'unknown'}</Text>
            )}
            {event.type === 'status_change' && (
              <Text dimColor>
                Status: {(event.payload as { from?: string }).from} → {(event.payload as { to?: string }).to}
              </Text>
            )}
          </Box>
        ))}
      </Box>

      {canSendInput && session.status === 'waiting_input' && (
        <Box borderStyle="single" paddingX={1}>
          <Text color="cyan">{'> '}</Text>
          <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} />
        </Box>
      )}

      {!canSendInput && (
        <Box borderStyle="single" paddingX={1}>
          <Text dimColor>Observed session — input not available</Text>
        </Box>
      )}
    </Box>
  );
}
