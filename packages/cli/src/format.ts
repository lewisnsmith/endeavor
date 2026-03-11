import type { ProjectStatus, WorkItem, Handoff, Decision, DoneCriterion, DoneResult } from '@endeavor/core';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatStatus(s: ProjectStatus): string {
  const lines: string[] = [];
  const { summary } = s;

  const parts = [];
  if (summary.inProgress > 0) parts.push(`${summary.inProgress} in progress`);
  if (summary.blocked > 0) parts.push(`${summary.blocked} blocked`);
  if (summary.todo > 0) parts.push(`${summary.todo} todo`);
  if (summary.done > 0) parts.push(`${summary.done} done`);

  lines.push(`${s.project.name} — ${summary.total} items (${parts.join(', ')})`);

  const inProgress = s.items.filter((i) => i.status === 'in_progress');
  if (inProgress.length > 0) {
    lines.push('');
    lines.push('IN PROGRESS');
    for (const item of inProgress) {
      lines.push(formatItemLine(item));
    }
  }

  const blocked = s.items.filter((i) => i.status === 'blocked');
  if (blocked.length > 0) {
    lines.push('');
    lines.push('BLOCKED');
    for (const item of blocked) {
      lines.push(formatItemLine(item));
    }
  }

  const todo = s.items.filter((i) => i.status === 'todo');
  if (todo.length > 0) {
    lines.push('');
    lines.push('TODO');
    for (const item of todo) {
      lines.push(formatItemLine(item));
    }
  }

  if (s.handoffs.length > 0) {
    lines.push('');
    lines.push('PENDING HANDOFFS');
    for (const h of s.handoffs) {
      const to = h.toAgent ? ` → ${h.toAgent}` : '';
      lines.push(`  ${h.id}  "${h.summary}"${to}`);
    }
  }

  if (s.decisions.length > 0) {
    lines.push('');
    lines.push('RECENT DECISIONS');
    for (const d of s.decisions) {
      lines.push(`  ${d.id}  ${d.summary} (${timeAgo(d.createdAt)})`);
    }
  }

  return lines.join('\n');
}

function formatItemLine(item: WorkItem): string {
  const parts = [`  ${item.id}  ${item.description}`];
  if (item.assignee) parts.push(`  ${item.assignee}`);
  if (item.branch) parts.push(`  ${item.branch}`);
  return parts.join('');
}

export function formatAssignResult(item: WorkItem, criteriaCount: number): string {
  const lines = [`Created ${item.id}: ${item.description}`];
  if (item.assignee) lines.push(`  Assigned to: ${item.assignee}`);
  if (item.branch) lines.push(`  Branch: ${item.branch}`);
  if (criteriaCount > 0) lines.push(`  Criteria: ${criteriaCount} items`);
  return lines.join('\n');
}

export function formatDecision(d: Decision): string {
  return `Recorded ${d.id}: ${d.summary}`;
}

export function formatDependency(blockedId: string, blockerId: string): string {
  return `${blockedId} now depends on ${blockerId}`;
}

export function formatHandoff(h: Handoff): string {
  const to = h.toAgent ? ` → ${h.toAgent}` : '';
  return `Created ${h.id}: ${h.summary}${to}`;
}

export function formatDoneResult(result: DoneResult): string {
  const lines: string[] = [];

  if (result.criteria.length > 0) {
    lines.push(`Checking criteria for ${result.item.id}...`);
    for (const c of result.criteria) {
      const mark = c.met ? '\u2713' : '\u2717';
      const suffix = c.met ? '' : ' (unmet)';
      lines.push(`  ${mark} ${c.description}${suffix}`);
    }
  }

  const unmetSuffix = result.unmetCount > 0
    ? ` (${result.unmetCount} criterion unmet)`
    : '';
  lines.push(`Completed ${result.item.id}: ${result.item.description}${unmetSuffix}`);

  if (result.unblocked.length > 0) {
    for (const item of result.unblocked) {
      lines.push(`Unblocked: ${item.id}`);
    }
  }

  return lines.join('\n');
}

export function formatNext(items: WorkItem[]): string {
  if (items.length === 0) return 'No items ready to work on.';

  const lines = ['Ready to work on:'];
  for (const item of items) {
    lines.push(`  ${item.id}  ${item.description}`);
  }
  return lines.join('\n');
}
