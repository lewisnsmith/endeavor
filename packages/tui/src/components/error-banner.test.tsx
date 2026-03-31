import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ErrorBanner } from './error-banner.js';

describe('ErrorBanner', () => {
  it('renders the ERROR label', () => {
    const { lastFrame } = render(<ErrorBanner message="something went wrong" />);
    expect(lastFrame()).toContain('ERROR');
  });

  it('renders the provided message', () => {
    const { lastFrame } = render(<ErrorBanner message="database connection failed" />);
    expect(lastFrame()).toContain('database connection failed');
  });

  it('renders different messages correctly', () => {
    const { lastFrame } = render(<ErrorBanner message="session killed" />);
    expect(lastFrame()).toContain('session killed');
  });
});
