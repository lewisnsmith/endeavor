import type { Command } from 'commander';
import type { Endeavor } from '@endeavor/core';
import { formatHandoff } from '../format.js';

export function registerHandoff(program: Command, getEndeavor: () => Endeavor, getProjectId: () => string) {
  program
    .command('handoff <toAgent> <summary>')
    .description('Hand off context to another agent/session')
    .option('--from <agent>', 'sending agent')
    .option('--payload <text>', 'additional payload')
    .option('--item <itemId>', 'related work item')
    .option('--json', 'output as JSON')
    .action((toAgent: string, summary: string, opts: { from?: string; payload?: string; item?: string; json?: boolean }) => {
      const endeavor = getEndeavor();
      const projectId = getProjectId();
      const handoff = endeavor.handoff(projectId, toAgent, summary, {
        fromAgent: opts.from,
        payload: opts.payload,
        workItemId: opts.item,
      });

      if (opts.json) {
        console.log(JSON.stringify(handoff, null, 2));
      } else {
        console.log(formatHandoff(handoff));
      }
    });

  program
    .command('accept <handoffId>')
    .description('Accept a pending handoff')
    .option('--json', 'output as JSON')
    .action((handoffId: string, opts: { json?: boolean }) => {
      const endeavor = getEndeavor();
      const handoff = endeavor.acceptHandoff(handoffId);

      if (opts.json) {
        console.log(JSON.stringify(handoff, null, 2));
      } else {
        console.log(`Accepted ${handoff.id}: ${handoff.summary}`);
      }
    });

  program
    .command('complete-handoff <handoffId>')
    .description('Complete an accepted handoff')
    .option('--json', 'output as JSON')
    .action((handoffId: string, opts: { json?: boolean }) => {
      const endeavor = getEndeavor();
      const handoff = endeavor.completeHandoff(handoffId);

      if (opts.json) {
        console.log(JSON.stringify(handoff, null, 2));
      } else {
        console.log(`Completed ${handoff.id}: ${handoff.summary}`);
      }
    });
}
