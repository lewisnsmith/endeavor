import type { Command } from 'commander';
import type { Endeavor } from '@endeavor/core';
import { formatDependency } from '../format.js';

export function registerDepend(program: Command, getEndeavor: () => Endeavor) {
  program
    .command('depend <blockedId> <blockerId>')
    .description('Declare a blocking dependency')
    .option('--json', 'output as JSON')
    .action((blockedId: string, blockerId: string, opts: { json?: boolean }) => {
      const endeavor = getEndeavor();
      const dep = endeavor.depend(blockedId, blockerId);

      if (opts.json) {
        console.log(JSON.stringify(dep, null, 2));
      } else {
        console.log(formatDependency(blockedId, blockerId));
      }
    });
}
