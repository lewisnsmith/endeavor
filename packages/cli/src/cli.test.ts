import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Endeavor } from '@endeavor/core';
import { formatStatus, formatAssignResult, formatDecision, formatDependency, formatHandoff, formatDoneResult, formatNext } from './format.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('CLI format functions', () => {
  let endeavor: Endeavor;
  let dataDir: string;
  let projectId: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'endeavor-cli-test-'));
    endeavor = new Endeavor({ dataDir, logLevel: 'error' });
    endeavor.initialize();
    const project = endeavor.init(dataDir, 'test-project');
    projectId = project.id;
  });

  afterEach(() => {
    endeavor?.close();
    try { rmSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  });

  it('should format empty status', () => {
    const status = endeavor.status(projectId);
    const output = formatStatus(status);

    expect(output).toContain('test-project');
    expect(output).toContain('0 items');
  });

  it('should format status with items in all states', () => {
    endeavor.assign(projectId, 'Task A', { assignee: '@a' });
    endeavor.assign(projectId, 'Task B');

    const status = endeavor.status(projectId);
    const output = formatStatus(status);

    expect(output).toContain('2 items');
    expect(output).toContain('IN PROGRESS');
    expect(output).toContain('TODO');
    expect(output).toContain('Task A');
    expect(output).toContain('Task B');
  });

  it('should format assign result', () => {
    const result = endeavor.assign(projectId, 'Build auth', {
      assignee: '@agent-1',
      branch: 'feature/auth',
      criteria: ['tests pass'],
    });

    const output = formatAssignResult(result.item, result.criteriaCount);
    expect(output).toContain(result.item.id);
    expect(output).toContain('Build auth');
    expect(output).toContain('@agent-1');
    expect(output).toContain('feature/auth');
    expect(output).toContain('1 items');
  });

  it('should format decision', () => {
    const decision = endeavor.decide(projectId, 'Use JWT');
    const output = formatDecision(decision);

    expect(output).toContain(decision.id);
    expect(output).toContain('Use JWT');
  });

  it('should format dependency', () => {
    const output = formatDependency('w_002', 'w_001');
    expect(output).toContain('w_002');
    expect(output).toContain('w_001');
    expect(output).toContain('depends on');
  });

  it('should format handoff', () => {
    const handoff = endeavor.handoff(projectId, '@agent-2', 'Auth shape');
    const output = formatHandoff(handoff);

    expect(output).toContain(handoff.id);
    expect(output).toContain('Auth shape');
    expect(output).toContain('@agent-2');
  });

  it('should format done result with unmet criteria', () => {
    const { item } = endeavor.assign(projectId, 'Task with criteria', {
      criteria: ['tests pass', 'lint clean'],
    });
    const result = endeavor.done(item.id);
    const output = formatDoneResult(result);

    expect(output).toContain('Checking criteria');
    expect(output).toContain('tests pass');
    expect(output).toContain('unmet');
    expect(output).toContain('Marked done');
  });

  it('should format next with no items', () => {
    const items = endeavor.next(projectId);
    const output = formatNext(items);
    expect(output).toContain('No items ready');
  });

  it('should format next with available items', () => {
    endeavor.assign(projectId, 'Ready task');
    const items = endeavor.next(projectId);
    const output = formatNext(items);

    expect(output).toContain('Ready to work on');
    expect(output).toContain('Ready task');
  });
});
