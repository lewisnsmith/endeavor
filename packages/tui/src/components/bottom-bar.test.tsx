import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { BottomBar } from './bottom-bar.js';

describe('BottomBar', () => {
  describe('dashboard mode', () => {
    it('shows navigation hints', () => {
      const { lastFrame } = render(<BottomBar mode="dashboard" />);
      const frame = lastFrame() ?? '';
      expect(frame).toContain('navigate');
      expect(frame).toContain('focus');
      expect(frame).toContain('new');
      expect(frame).toContain('kill');
      expect(frame).toContain('quit');
    });

    it('shows Tab / next waiting hint', () => {
      const { lastFrame } = render(<BottomBar mode="dashboard" />);
      expect(lastFrame()).toContain('Tab');
    });
  });

  describe('spawn mode', () => {
    it('shows cancel and confirm hints', () => {
      const { lastFrame } = render(<BottomBar mode="spawn" />);
      const frame = lastFrame() ?? '';
      expect(frame).toContain('cancel');
      expect(frame).toContain('confirm');
    });

    it('shows ESC hint', () => {
      const { lastFrame } = render(<BottomBar mode="spawn" />);
      expect(lastFrame()).toContain('ESC');
    });
  });

  describe('focus mode', () => {
    it('renders nothing (returns null)', () => {
      const { lastFrame } = render(<BottomBar mode="focus" />);
      // Component returns null for focus mode — frame is empty or blank
      expect(lastFrame() ?? '').toBe('');
    });
  });
});
