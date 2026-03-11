import type { Command } from 'commander';
import type { Endeavor } from '@endeavor/core';

export function registerInit(program: Command, getEndeavor: () => Endeavor) {
  program
    .command('init')
    .description('Initialize coordination in current project')
    .option('-n, --name <name>', 'project name')
    .option('--json', 'output as JSON')
    .action((opts: { name?: string; json?: boolean }) => {
      const endeavor = getEndeavor();
      const project = endeavor.init(process.cwd(), opts.name);

      if (opts.json) {
        console.log(JSON.stringify(project, null, 2));
      } else {
        console.log(`Initialized project "${project.name}" at ${project.path}`);
        console.log(`Created .endeavor/endeavor.db`);
      }
    });
}
