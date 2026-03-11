import type { Command } from 'commander';
import type { Endeavor } from '@endeavor/core';
import { formatDecision } from '../format.js';

export function registerDecide(program: Command, getEndeavor: () => Endeavor, getProjectId: () => string) {
  program
    .command('decide <summary>')
    .description('Record a decision with rationale')
    .option('--rationale <text>', 'why this decision was made')
    .option('--by <agent>', 'who made the decision')
    .option('--item <itemId>', 'related work item')
    .option('--json', 'output as JSON')
    .action((summary: string, opts: { rationale?: string; by?: string; item?: string; json?: boolean }) => {
      const endeavor = getEndeavor();
      const projectId = getProjectId();
      const decision = endeavor.decide(projectId, summary, {
        rationale: opts.rationale,
        decidedBy: opts.by,
        workItemId: opts.item,
      });

      if (opts.json) {
        console.log(JSON.stringify(decision, null, 2));
      } else {
        console.log(formatDecision(decision));
      }
    });
}
