import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { SessionSnapshot, SessionEvent } from '@endeavor/core';
import { THEME, statusColor, statusLabel, repoName } from '../theme.js';

interface FocusViewProps {
  session: SessionSnapshot;
  events: SessionEvent[];
  canSendInput: boolean;
  onSendInput: (input: string) => void;
  onBack: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatTokens(input: number, output: number): string {
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  return `${fmt(input)} in / ${fmt(output)} out`;
}

const VISIBLE_EVENTS = 20;

export function FocusView({ session, events, canSendInput, onSendInput, onBack }: FocusViewProps) {
  const [inputValue, setInputValue] = useState('');
  const [scrollOffset, setScrollOffset] = useState(0);
  const isInputMode = canSendInput && session.status === 'waiting_input';

  const maxOffset = Math.max(0, events.length - VISIBLE_EVENTS);
  const effectiveOffset = Math.min(scrollOffset, maxOffset);

  const visibleEvents = useMemo(() => {
    const start = Math.max(0, events.length - VISIBLE_EVENTS - effectiveOffset);
    const end = events.length - effectiveOffset;
    return events.slice(start, end);
  }, [events, effectiveOffset]);

  useInput((_input, key) => {
    if (key.escape) { onBack(); return; }
    if (!isInputMode) {
      if (key.downArrow) setScrollOffset((o) => Math.max(0, o - 1));
      if (key.upArrow) setScrollOffset((o) => Math.min(maxOffset, o + 1));
    }
  });

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      onSendInput(value.trim());
      setInputValue('');
      setScrollOffset(0);
    }
  };

  const color = statusColor(session.status);
  const project = repoName(session.cwd);

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <Box borderStyle="single" borderColor={THEME.border} paddingX={1} justifyContent="space-between">
        <Box>
          <Text color={THEME.accent} bold>{THEME.sparkle} </Text>
          <Text color={THEME.text} bold>{session.label}</Text>
        </Box>
        <Box>
          <Text color={color} bold>{statusLabel(session.status)}</Text>
          <Text color={THEME.textMuted}>  </Text>
          <Text color={THEME.accent}>{project}</Text>
          <Text color={THEME.textMuted}>  </Text>
          <Text color={THEME.cost}>${session.totalCostUsd.toFixed(3)}</Text>
        </Box>
      </Box>

      {/* Details bar */}
      <Box paddingX={1}>
        {session.branch && <Text color={THEME.textDim}>{session.branch}  </Text>}
        {session.model && <Text color={THEME.textMuted}>{session.model}  </Text>}
        <Text color={THEME.textMuted}>{formatTokens(session.inputTokens, session.outputTokens)}</Text>
      </Box>

      {/* Event log */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} marginTop={1}>
        {events.length === 0 && (
          <Text color={THEME.textDim}>No events yet...</Text>
        )}
        {effectiveOffset > 0 && (
          <Text color={THEME.textMuted}>  ↑ {effectiveOffset} more events</Text>
        )}
        {visibleEvents.map((event) => (
          <Box key={event.id} marginBottom={0}>
            <Text color={THEME.textMuted}>{formatTime(event.createdAt)} </Text>
            <EventContent event={event} />
          </Box>
        ))}
      </Box>

      {/* Input area */}
      {isInputMode && (
        <Box borderStyle="single" borderColor={THEME.accent} paddingX={1}>
          <Text color={THEME.accent}>{'❯ '}</Text>
          <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} />
        </Box>
      )}

      {canSendInput && session.status === 'active' && (
        <Box paddingX={1}>
          <Text color={THEME.textDim}>{THEME.sparkle} Working...</Text>
        </Box>
      )}

      {!canSendInput && (
        <Box paddingX={1}>
          <Text color={THEME.textDim}>Observed session — input not available</Text>
        </Box>
      )}

      {/* Hint line */}
      <Box paddingX={1} marginTop={0}>
        <Text color={THEME.textMuted}>ESC</Text><Text color={THEME.textDim}> back  </Text>
        <Text color={THEME.textMuted}>Tab</Text><Text color={THEME.textDim}> next waiting  </Text>
        <Text color={THEME.textMuted}>K</Text><Text color={THEME.textDim}> kill</Text>
      </Box>
    </Box>
  );
}

function EventContent({ event }: { event: SessionEvent }) {
  const p = event.payload as Record<string, any>;

  switch (event.type) {
    case 'response': {
      const text = p.text ?? p.message?.content?.[0]?.text ?? p.result ?? '';
      const display = typeof text === 'string' ? text : JSON.stringify(text);
      const maxLen = 500;
      return <Text color={THEME.text} wrap="wrap">{display.length > maxLen ? display.slice(0, maxLen) + '…' : display}</Text>;
    }
    case 'tool_use': {
      const name = p.name ?? 'unknown';
      const args = p.input ? JSON.stringify(p.input) : '';
      const display = args.length > 100 ? args.slice(0, 100) + '…' : args;
      return <Text color={THEME.accent}>❯ {name} <Text color={THEME.textDim}>{display}</Text></Text>;
    }
    case 'error':
      return <Text color={THEME.error}>Error: {p.message ?? JSON.stringify(p)}</Text>;
    case 'status_change':
      return <Text color={THEME.textDim}>Status: {p.from ?? '?'} → {p.to ?? '?'}</Text>;
    case 'cost_tick':
      return null;
    case 'prompt':
      return <Text color={THEME.accent}>You: {(p.text as string)?.slice(0, 200) ?? '?'}</Text>;
    default:
      return <Text color={THEME.textDim}>{event.type}: {JSON.stringify(p).slice(0, 200)}</Text>;
  }
}
