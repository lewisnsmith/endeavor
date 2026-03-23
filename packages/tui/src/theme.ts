import { homedir } from 'os';
import { join } from 'path';

export const THEME = {
  accent:      '#D97757',  // salmon/coral — sparkle, accents, focused borders
  text:        '#C4A882',  // warm beige — primary text
  textDim:     '#7A6F5E',  // muted tan — secondary text
  textMuted:   '#574D3F',  // dark tan — very dim text
  border:      '#4A4235',  // dark warm gray — all borders
  active:      '#6BAF7A',  // muted green — active status
  waiting:     '#D97757',  // salmon — waiting status
  error:       '#D9534F',  // muted red — errors
  done:        '#574D3F',  // very dim — completed/dead
  cost:        '#6BAF7A',  // green — cost display
  sparkle:     '✻',
} as const;

export function statusColor(status: string): string {
  switch (status) {
    case 'active':           return THEME.active;
    case 'waiting_input':
    case 'waiting_approval': return THEME.waiting;
    case 'error':            return THEME.error;
    case 'completed':
    case 'dead':             return THEME.done;
    default:                 return THEME.textDim;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'waiting_input':    return '▪ WAITING';
    case 'waiting_approval': return '▪ APPROVAL';
    case 'active':           return '▪ ACTIVE';
    case 'error':            return '▪ ERROR';
    case 'completed':        return '□ DONE';
    case 'dead':             return '□ DEAD';
    default:                 return status.toUpperCase();
  }
}

/** Common GitHub directory prefix to strip from paths */
const GITHUB_PREFIX = join(homedir(), 'Documents', 'GitHub') + '/';

/**
 * Extract a short project name from a full path.
 * /Users/lewis/Documents/GitHub/endeavor -> endeavor
 * /Users/lewis/Documents/GitHub/foo/packages/bar -> foo
 * /other/path -> ~/other/path
 */
export function repoName(cwd: string): string {
  if (cwd.startsWith(GITHUB_PREFIX)) {
    const rest = cwd.slice(GITHUB_PREFIX.length);
    const slash = rest.indexOf('/');
    return slash === -1 ? rest : rest.slice(0, slash);
  }
  const home = homedir();
  if (cwd.startsWith(home)) return '~' + cwd.slice(home.length);
  return cwd;
}

/**
 * Get the sub-path within a repo (for showing context).
 * /Users/lewis/Documents/GitHub/endeavor/packages/tui -> packages/tui
 */
export function repoSubPath(cwd: string): string {
  if (cwd.startsWith(GITHUB_PREFIX)) {
    const rest = cwd.slice(GITHUB_PREFIX.length);
    const slash = rest.indexOf('/');
    return slash === -1 ? '' : rest.slice(slash + 1);
  }
  return '';
}
