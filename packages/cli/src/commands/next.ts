import type { Command } from 'commander';
import type { Endeavor } from '@endeavor/core';
import { formatNext } from '../format.js';

export function registerNext(program: Command, getEndeavor: () => Endeavor, getProjectId: () => string) {
  program
    .command('next')
    .description('Show what\'s unblocked and ready')
    .option('--json', 'output as JSON')
    .action((opts: { json?: boolean }) => {
      const endeavor = getEndeavor();
      const projectId = getProjectId();
      const items = endeavor.next(projectId);

      if (opts.json) {
        console.log(JSON.stringify(items, null, 2));
      } else {
        console.log(formatNext(items));
      }
    });
}
