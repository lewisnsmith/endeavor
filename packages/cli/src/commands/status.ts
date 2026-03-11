import type { Command } from 'commander';
import type { Endeavor } from '@endeavor/core';
import { formatStatus } from '../format.js';

export function registerStatus(program: Command, getEndeavor: () => Endeavor, getProjectId: () => string) {
  program
    .command('status')
    .description('Show all work items, handoffs, recent decisions')
    .option('--json', 'output as JSON')
    .action((opts: { json?: boolean }) => {
      const endeavor = getEndeavor();
      const projectId = getProjectId();
      const status = endeavor.status(projectId);

      if (opts.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(formatStatus(status));
      }
    });
}
