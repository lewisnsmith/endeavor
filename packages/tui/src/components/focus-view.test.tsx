import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import type { SessionSnapshot, SessionEvent } from '@endeavor/core';
import { FocusView } from './focus-view.js';

function makeSession(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    id: 's_1',
    source: 'launched',
    status: 'active',
    claudeSessionId: null,
    pid: 1234,
    label: 'My Session',
    cwd: '/home/user/Documents/GitHub/myrepo',
    branch: 'main',
    inputTokens: 500,
    outputTokens: 1200,
    totalCostUsd: 0.123,
    model: 'claude-3-5-sonnet',
    lastOutputAt: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

function makeEvent(overrides: Partial<SessionEvent> = {}): SessionEvent {
  return {
    id: 'se_1',
    sessionId: 's_1',
    type: 'response',
    payload: { text: 'Hello from Claude' },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('FocusView', () => {
  const noop = vi.fn();

  it('renders the session label in the header', () => {
    const { lastFrame } = render(
      <FocusView session={makeSession()} events={[]} canSendInput={true} onSendInput={noop} onBack={noop} />,
    );
    expect(lastFrame()).toContain('My Session');
  });

  it('renders the project name in the header', () => {
    const { lastFrame } = render(
      <FocusView session={makeSession()} events={[]} canSendInput={true} onSendInput={noop} onBack={noop} />,
    );
    expect(lastFrame()).toContain('myrepo');
  });

  it('shows "No events yet..." when events array is empty', () => {
    const { lastFrame } = render(
      <FocusView session={makeSession()} events={[]} canSendInput={true} onSendInput={noop} onBack={noop} />,
    );
    expect(lastFrame()).toContain('No events yet');
  });

  it('renders response event text', () => {
    const events = [makeEvent({ type: 'response', payload: { text: 'Task complete!' } })];
    const { lastFrame } = render(
      <FocusView session={makeSession()} events={events} canSendInput={true} onSendInput={noop} onBack={noop} />,
    );
    expect(lastFrame()).toContain('Task complete!');
  });

  it('renders tool_use event name', () => {
    const events = [makeEvent({ type: 'tool_use', payload: { name: 'bash', input: { command: 'ls' } } })];
    const { lastFrame } = render(
      <FocusView session={makeSession()} events={events} canSendInput={true} onSendInput={noop} onBack={noop} />,
    );
    expect(lastFrame()).toContain('bash');
  });

  it('renders error event message', () => {
    const events = [makeEvent({ type: 'error', payload: { message: 'something broke' } })];
    const { lastFrame } = render(
      <FocusView session={makeSession()} events={events} canSendInput={true} onSendInput={noop} onBack={noop} />,
    );
    expect(lastFrame()).toContain('something broke');
  });

  it('renders status_change event with from→to', () => {
    const events = [makeEvent({ type: 'status_change', payload: { from: 'active', to: 'waiting_input' } })];
    const { lastFrame } = render(
      <FocusView session={makeSession()} events={events} canSendInput={true} onSendInput={noop} onBack={noop} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('active');
    expect(frame).toContain('waiting_input');
  });

  it('renders prompt event text', () => {
    const events = [makeEvent({ type: 'prompt', payload: { text: 'Please do this task' } })];
    const { lastFrame } = render(
      <FocusView session={makeSession()} events={events} canSendInput={true} onSendInput={noop} onBack={noop} />,
    );
    expect(lastFrame()).toContain('Please do this task');
  });

  it('renders input area when canSendInput=true and status=waiting_input', () => {
    const { lastFrame } = render(
      <FocusView
        session={makeSession({ status: 'waiting_input' })}
        events={[]}
        canSendInput={true}
        onSendInput={noop}
        onBack={noop}
      />,
    );
    // TextInput prompt indicator
    expect(lastFrame()).toContain('❯');
  });

  it('does not render input area when status is active', () => {
    const { lastFrame } = render(
      <FocusView
        session={makeSession({ status: 'active' })}
        events={[]}
        canSendInput={true}
        onSendInput={noop}
        onBack={noop}
      />,
    );
    expect(lastFrame()).not.toContain('❯');
  });

  it('shows "Observed session" message when canSendInput=false', () => {
    const { lastFrame } = render(
      <FocusView session={makeSession()} events={[]} canSendInput={false} onSendInput={noop} onBack={noop} />,
    );
    expect(lastFrame()).toContain('Observed session');
  });

  it('shows cost in the header', () => {
    const { lastFrame } = render(
      <FocusView
        session={makeSession({ totalCostUsd: 0.123 })}
        events={[]}
        canSendInput={true}
        onSendInput={noop}
        onBack={noop}
      />,
    );
    expect(lastFrame()).toContain('$0.123');
  });

  it('shows branch when set', () => {
    const { lastFrame } = render(
      <FocusView
        session={makeSession({ branch: 'feature/test-branch' })}
        events={[]}
        canSendInput={true}
        onSendInput={noop}
        onBack={noop}
      />,
    );
    expect(lastFrame()).toContain('feature/test-branch');
  });
});
