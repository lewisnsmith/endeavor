import type { Command } from 'commander';
import type { Endeavor } from '@endeavor/core';
import { formatAssignResult } from '../format.js';

export function registerAssign(program: Command, getEndeavor: () => Endeavor, getProjectId: () => string) {
  program
    .command('assign <description>')
    .description('Create a work item, optionally assign to an agent')
    .option('--to <assignee>', 'assign to agent/session')
    .option('--branch <branch>', 'git branch')
    .option('--worktree <path>', 'git worktree path')
    .option('--criteria <items...>', 'done criteria')
    .option('--json', 'output as JSON')
    .action((description: string, opts: { to?: string; branch?: string; worktree?: string; criteria?: string[]; json?: boolean }) => {
      const endeavor = getEndeavor();
      const projectId = getProjectId();
      const result = endeavor.assign(projectId, description, {
        assignee: opts.to,
        branch: opts.branch,
        worktree: opts.worktree,
        criteria: opts.criteria,
      });

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatAssignResult(result.item, result.criteriaCount));
      }
    });
}
