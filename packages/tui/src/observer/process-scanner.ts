import { execSync } from 'node:child_process';
import { readlinkSync } from 'node:fs';
import { platform } from 'node:os';

export interface DiscoveredProcess {
  pid: number;
  command: string;
  cwd: string | null;
}

export function parsePsOutput(output: string): { pid: number; command: string }[] {
  const lines = output.split('\n').slice(1);
  const results: { pid: number; command: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;

    const pid = parseInt(match[1], 10);
    const command = match[2];

    if (command.includes('claude') && !command.startsWith('grep') && !command.startsWith('ps')) {
      results.push({ pid, command });
    }
  }

  return results;
}

export function scanProcesses(): DiscoveredProcess[] {
  try {
    const psOutput = execSync('ps -eo pid,command', { encoding: 'utf-8', timeout: 5000 });
    const processes = parsePsOutput(psOutput);

    return processes.map((proc) => ({
      pid: proc.pid,
      command: proc.command,
      cwd: getCwd(proc.pid),
    }));
  } catch {
    return [];
  }
}

function getCwd(pid: number): string | null {
  try {
    if (platform() === 'linux') {
      return readlinkSync(`/proc/${pid}/cwd`);
    }

    const output = execSync(`lsof -a -d cwd -Fn -p ${pid}`, {
      encoding: 'utf-8',
      timeout: 5000,
    });

    for (const line of output.split('\n')) {
      if (line.startsWith('n') && line.length > 1) {
        return line.slice(1);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function getBranch(cwd: string): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      cwd,
      timeout: 3000,
    }).trim();
  } catch {
    return null;
  }
}
