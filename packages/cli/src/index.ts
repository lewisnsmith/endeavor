#!/usr/bin/env node

import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { Endeavor, EndeavorError } from '@endeavor/core';

import { registerInit } from './commands/init.js';
import { registerStatus } from './commands/status.js';
import { registerAssign } from './commands/assign.js';
import { registerDecide } from './commands/decide.js';
import { registerDepend } from './commands/depend.js';
import { registerHandoff } from './commands/handoff.js';
import { registerDone } from './commands/done.js';
import { registerNext } from './commands/next.js';

function findDataDir(): string | null {
  // Try to find .endeavor/ by walking up from cwd
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, '.endeavor');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  // Try git worktree: find the main repo root
  try {
    const gitCommonDir = execSync('git rev-parse --git-common-dir', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // git-common-dir is relative to the working tree or absolute
    const repoRoot = resolve(gitCommonDir, '..');
    const candidate = join(repoRoot, '.endeavor');
    if (existsSync(candidate)) return candidate;
  } catch {
    // Not a git repo, that's fine
  }

  return null;
}

function getOrCreateDataDir(): string {
  const existing = findDataDir();
  if (existing) return existing;
  // For init, we need to create the dir; for other commands, fail fast
  return join(process.cwd(), '.endeavor');
}

function requireDataDir(): string {
  const existing = findDataDir();
  if (existing) return existing;
  console.error('No project found. Run "endeavor init" first.');
  process.exit(1);
}

let _endeavor: Endeavor | null = null;

function createEndeavorInstance(dataDir: string): Endeavor {
  const logLevel = (process.env.ENDEAVOR_LOG_LEVEL ?? 'error') as 'debug' | 'info' | 'warn' | 'error';
  const endeavor = new Endeavor({ dataDir, logLevel });
  endeavor.initialize();
  _endeavor = endeavor;
  return endeavor;
}

function getEndeavorForInit(): Endeavor {
  if (!_endeavor) {
    return createEndeavorInstance(getOrCreateDataDir());
  }
  return _endeavor;
}

function getEndeavor(): Endeavor {
  if (!_endeavor) {
    return createEndeavorInstance(requireDataDir());
  }
  return _endeavor;
}

function getProjectId(): string {
  const endeavor = getEndeavor();
  const project = endeavor.projects.getByPath(process.cwd());

  if (!project) {
    // Try worktree root
    try {
      const toplevel = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      const worktreeProject = endeavor.projects.getByPath(toplevel);
      if (worktreeProject) return worktreeProject.id;
    } catch {
      // Not a git repo
    }

    console.error('No project found. Run "endeavor init" first.');
    process.exit(1);
  }

  return project.id;
}

const program = new Command();

program
  .name('endeavor')
  .version('0.2.0')
  .description('Terminal-native coordination for parallel Claude Code work');

registerInit(program, getEndeavorForInit);
registerStatus(program, getEndeavor, getProjectId);
registerAssign(program, getEndeavor, getProjectId);
registerDecide(program, getEndeavor, getProjectId);
registerDepend(program, getEndeavor);
registerHandoff(program, getEndeavor, getProjectId);
registerDone(program, getEndeavor);
registerNext(program, getEndeavor, getProjectId);

// Global error handler for clean error messages
process.on('uncaughtException', (err) => {
  if (err instanceof EndeavorError) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
  console.error(`unexpected error: ${err.message}`);
  process.exit(1);
});

program.parse();

// Cleanup
process.on('exit', () => {
  _endeavor?.close();
});
