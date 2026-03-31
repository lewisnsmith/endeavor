import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import type { SessionSnapshot } from '@endeavor/core';
import { Dashboard, STATUS_PRIORITY, sortByPriority } from './dashboard.js';

function makeSession(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    id: 's_1',
    source: 'launched',
    status: 'active',
    claudeSessionId: null,
    pid: 1234,
    label: 'Test Session',
    cwd: '/home/user/projects/myrepo',
    branch: 'main',
    inputTokens: 0,
    outputTokens: 0,
    totalCostUsd: 0,
    model: null,
    lastOutputAt: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

describe('STATUS_PRIORITY', () => {
  it('waiting_input is highest priority (lowest number)', () => {
    expect(STATUS_PRIORITY.waiting_input).toBe(0);
  });

  it('waiting_approval comes after waiting_input', () => {
    expect(STATUS_PRIORITY.waiting_approval).toBe(1);
  });

  it('error comes before active', () => {
    expect(STATUS_PRIORITY.error).toBeLessThan(STATUS_PRIORITY.active);
  });

  it('active comes before completed and dead', () => {
    expect(STATUS_PRIORITY.active).toBeLessThan(STATUS_PRIORITY.completed);
    expect(STATUS_PRIORITY.active).toBeLessThan(STATUS_PRIORITY.dead);
  });

  it('dead is lowest priority', () => {
    expect(STATUS_PRIORITY.dead).toBe(5);
  });
});

describe('sortByPriority', () => {
  it('sorts waiting_input sessions before active', () => {
    const sessions = [
      makeSession({ id: 's_a', status: 'active', updatedAt: '2024-01-01T00:00:00Z' }),
      makeSession({ id: 's_w', status: 'waiting_input', updatedAt: '2024-01-01T00:00:00Z' }),
    ];
    const sorted = sortByPriority(sessions);
    expect(sorted[0].id).toBe('s_w');
    expect(sorted[1].id).toBe('s_a');
  });

  it('sorts error sessions before active', () => {
    const sessions = [
      makeSession({ id: 's_a', status: 'active' }),
      makeSession({ id: 's_e', status: 'error' }),
    ];
    const sorted = sortByPriority(sessions);
    expect(sorted[0].id).toBe('s_e');
  });

  it('within same priority, more recently updated comes first', () => {
    const sessions = [
      makeSession({ id: 's_old', status: 'active', updatedAt: '2024-01-01T00:00:00Z' }),
      makeSession({ id: 's_new', status: 'active', updatedAt: '2024-06-01T00:00:00Z' }),
    ];
    const sorted = sortByPriority(sessions);
    expect(sorted[0].id).toBe('s_new');
  });

  it('does not mutate the original array', () => {
    const sessions = [
      makeSession({ id: 's_a', status: 'active' }),
      makeSession({ id: 's_w', status: 'waiting_input' }),
    ];
    sortByPriority(sessions);
    expect(sessions[0].id).toBe('s_a');
  });
});

describe('Dashboard', () => {
  it('renders all session labels', () => {
    const sessions = [
      makeSession({ id: 's_1', label: 'Session Alpha' }),
      makeSession({ id: 's_2', label: 'Session Beta' }),
    ];
    const { lastFrame } = render(
      <Dashboard sessions={sessions} focusedIndex={0} activityMap={new Map()} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Session Alpha');
    expect(frame).toContain('Session Beta');
  });

  it('renders nothing when sessions array is empty', () => {
    const { lastFrame } = render(
      <Dashboard sessions={[]} focusedIndex={0} activityMap={new Map()} />,
    );
    // Should not crash; may render empty
    expect(lastFrame).not.toThrow();
  });

  it('passes activityText through to session tiles', () => {
    const sessions = [makeSession({ id: 's_1', label: 'My Session' })];
    const activityMap = new Map([['s_1', 'hello world response']]);
    const { lastFrame } = render(
      <Dashboard sessions={sessions} focusedIndex={0} activityMap={activityMap} />,
    );
    expect(lastFrame()).toContain('hello world response');
  });
});
