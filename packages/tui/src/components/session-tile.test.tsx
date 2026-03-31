import React from 'react';
import { describe, it, expect } from 'vitest';
import { homedir } from 'os';
import { join } from 'path';
import { render } from 'ink-testing-library';
import type { SessionSnapshot } from '@endeavor/core';
import { SessionTile } from './session-tile.js';

const GITHUB = join(homedir(), 'Documents', 'GitHub');

function makeSession(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    id: 's_1',
    source: 'launched',
    status: 'active',
    claudeSessionId: null,
    pid: 1234,
    label: 'My Session',
    cwd: `${GITHUB}/myrepo`,
    branch: 'main',
    inputTokens: 100,
    outputTokens: 200,
    totalCostUsd: 0.05,
    model: 'claude-3-5-sonnet',
    lastOutputAt: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

describe('SessionTile', () => {
  it('renders the session label', () => {
    const { lastFrame } = render(<SessionTile session={makeSession()} focused={false} />);
    expect(lastFrame()).toContain('My Session');
  });

  it('renders the status label', () => {
    const { lastFrame } = render(<SessionTile session={makeSession({ status: 'active' })} focused={false} />);
    expect(lastFrame()).toContain('ACTIVE');
  });

  it('renders the waiting_input status label', () => {
    const { lastFrame } = render(
      <SessionTile session={makeSession({ status: 'waiting_input' })} focused={false} />,
    );
    expect(lastFrame()).toContain('WAITING');
  });

  it('renders the error status label', () => {
    const { lastFrame } = render(
      <SessionTile session={makeSession({ status: 'error' })} focused={false} />,
    );
    expect(lastFrame()).toContain('ERROR');
  });

  it('renders the repo name extracted from cwd', () => {
    const { lastFrame } = render(<SessionTile session={makeSession()} focused={false} />);
    expect(lastFrame()).toContain('myrepo');
  });

  it('renders the branch name', () => {
    const { lastFrame } = render(<SessionTile session={makeSession({ branch: 'feature/foo' })} focused={false} />);
    expect(lastFrame()).toContain('feature/foo');
  });

  it('renders cost formatted with $ prefix', () => {
    const { lastFrame } = render(<SessionTile session={makeSession({ totalCostUsd: 0.05 })} focused={false} />);
    expect(lastFrame()).toContain('$0.05');
  });

  it('renders token counts when non-zero', () => {
    const { lastFrame } = render(
      <SessionTile session={makeSession({ inputTokens: 100, outputTokens: 200 })} focused={false} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('100');
    expect(frame).toContain('200');
  });

  it('renders token counts with k notation for large values', () => {
    const { lastFrame } = render(
      <SessionTile session={makeSession({ inputTokens: 1500, outputTokens: 2000 })} focused={false} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('1.5k');
    expect(frame).toContain('2.0k');
  });

  it('renders activity text', () => {
    const { lastFrame } = render(
      <SessionTile session={makeSession()} focused={false} activityText="working on task" />,
    );
    expect(lastFrame()).toContain('working on task');
  });

  it('renders without crash when no activity text provided', () => {
    expect(() =>
      render(<SessionTile session={makeSession()} focused={false} />),
    ).not.toThrow();
  });

  it('renders without crash when no branch', () => {
    expect(() =>
      render(<SessionTile session={makeSession({ branch: null })} focused={false} />),
    ).not.toThrow();
  });

  it('renders without crash when no model', () => {
    expect(() =>
      render(<SessionTile session={makeSession({ model: null })} focused={false} />),
    ).not.toThrow();
  });

  it('does not show token row when both are zero', () => {
    const { lastFrame } = render(
      <SessionTile session={makeSession({ inputTokens: 0, outputTokens: 0 })} focused={false} />,
    );
    // formatTokens returns '' when both are 0 — arrows should not appear
    expect(lastFrame()).not.toContain('↑');
    expect(lastFrame()).not.toContain('↓');
  });

  it('truncates a long label with ellipsis', () => {
    const longLabel = 'A'.repeat(40);
    const { lastFrame } = render(
      <SessionTile session={makeSession({ label: longLabel })} focused={false} />,
    );
    expect(lastFrame()).toContain('…');
  });
});
