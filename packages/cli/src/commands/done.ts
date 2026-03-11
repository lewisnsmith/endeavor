import type { Command } from 'commander';
import type { Endeavor } from '@endeavor/core';
import { formatDoneResult } from '../format.js';

export function registerDone(program: Command, getEndeavor: () => Endeavor) {
  program
    .command('done <itemId>')
    .description('Check criteria and mark complete')
    .option('--json', 'output as JSON')
    .action((itemId: string, opts: { json?: boolean }) => {
      const endeavor = getEndeavor();
      const result = endeavor.done(itemId);

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatDoneResult(result));
      }
    });
}
