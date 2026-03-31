import { describe, it, expect } from 'vitest';
import { homedir } from 'os';
import { join } from 'path';
import { THEME, statusColor, statusLabel, repoName, repoSubPath } from './theme.js';

const GITHUB = join(homedir(), 'Documents', 'GitHub');

describe('statusColor', () => {
  it('returns active color for active', () => {
    expect(statusColor('active')).toBe(THEME.active);
  });

  it('returns waiting color for waiting_input', () => {
    expect(statusColor('waiting_input')).toBe(THEME.waiting);
  });

  it('returns waiting color for waiting_approval', () => {
    expect(statusColor('waiting_approval')).toBe(THEME.waiting);
  });

  it('returns error color for error', () => {
    expect(statusColor('error')).toBe(THEME.error);
  });

  it('returns done color for completed', () => {
    expect(statusColor('completed')).toBe(THEME.done);
  });

  it('returns done color for dead', () => {
    expect(statusColor('dead')).toBe(THEME.done);
  });

  it('returns textDim for unknown status', () => {
    expect(statusColor('unknown_status')).toBe(THEME.textDim);
  });
});

describe('statusLabel', () => {
  it('returns correct labels for all known statuses', () => {
    expect(statusLabel('waiting_input')).toBe('▪ WAITING');
    expect(statusLabel('waiting_approval')).toBe('▪ APPROVAL');
    expect(statusLabel('active')).toBe('▪ ACTIVE');
    expect(statusLabel('error')).toBe('▪ ERROR');
    expect(statusLabel('completed')).toBe('□ DONE');
    expect(statusLabel('dead')).toBe('□ DEAD');
  });

  it('uppercases unknown statuses', () => {
    expect(statusLabel('custom')).toBe('CUSTOM');
    expect(statusLabel('pending')).toBe('PENDING');
  });
});

describe('repoName', () => {
  it('extracts repo name from a direct GitHub path', () => {
    expect(repoName(`${GITHUB}/myrepo`)).toBe('myrepo');
  });

  it('extracts top-level repo name from nested path', () => {
    expect(repoName(`${GITHUB}/myrepo/packages/core`)).toBe('myrepo');
  });

  it('returns ~ path for paths under the home directory', () => {
    expect(repoName(`${homedir()}/projects/foo`)).toBe(`~/projects/foo`);
  });

  it('returns path unchanged for non-home paths', () => {
    expect(repoName('/etc/nginx/nginx.conf')).toBe('/etc/nginx/nginx.conf');
  });
});

describe('repoSubPath', () => {
  it('returns empty string for the root of a repo', () => {
    expect(repoSubPath(`${GITHUB}/myrepo`)).toBe('');
  });

  it('returns the sub-path within a repo', () => {
    expect(repoSubPath(`${GITHUB}/myrepo/packages/core`)).toBe('packages/core');
  });

  it('returns a single-level sub-path', () => {
    expect(repoSubPath(`${GITHUB}/myrepo/src`)).toBe('src');
  });

  it('returns empty string for non-GitHub paths', () => {
    expect(repoSubPath('/etc/nginx')).toBe('');
    expect(repoSubPath(`${homedir()}/projects/foo`)).toBe('');
  });
});
