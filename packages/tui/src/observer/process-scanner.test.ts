import { describe, it, expect } from 'vitest';
import { parsePsOutput } from './process-scanner.js';

describe('parsePsOutput', () => {
  it('extracts claude processes from ps output', () => {
    const output = [
      '  PID COMMAND',
      '12345 /usr/local/bin/claude --print --output-format stream-json',
      '12346 node /some/other/thing',
      '12347 claude chat',
      '12348 grep claude',
    ].join('\n');

    const procs = parsePsOutput(output);
    expect(procs.length).toBeGreaterThanOrEqual(1);
    expect(procs.find((p) => p.pid === 12345)).toBeTruthy();
  });

  it('returns empty array for no claude processes', () => {
    const output = '  PID COMMAND\n12345 node app.js\n';
    expect(parsePsOutput(output)).toHaveLength(0);
  });

  it('handles empty ps output', () => {
    expect(parsePsOutput('')).toHaveLength(0);
  });
});
