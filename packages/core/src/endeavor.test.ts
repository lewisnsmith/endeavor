import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Endeavor } from './endeavor.js';
import { tmpdir } from 'node:os';

describe('Endeavor integration', () => {
  let endeavor: Endeavor;

  beforeEach(() => {
    // Create Endeavor with in-memory-like setup
    endeavor = new Endeavor({ dataDir: tmpdir() + '/endeavor-test-' + Date.now(), logLevel: 'error' });
    endeavor.initialize();
  });

  afterEach(() => {
    endeavor?.close();
  });

  it('should init a project', () => {
    const project = endeavor.init(tmpdir(), 'test-project');
    expect(project.id).toMatch(/^p_/);
    expect(project.name).toBe('test-project');
  });

  it('should assign work and get status', () => {
    const project = endeavor.init(tmpdir(), 'test-project');
    const { item } = endeavor.assign(project.id, 'Build the thing', {
      assignee: '@agent-1',
      criteria: ['tests pass', 'no lint errors'],
    });

    expect(item.id).toMatch(/^w_/);
    expect(item.status).toBe('in_progress');

    const status = endeavor.status(project.id);
    expect(status.summary.total).toBe(1);
    expect(status.summary.inProgress).toBe(1);
  });

  it('should record decisions', () => {
    const project = endeavor.init(tmpdir(), 'test-project');
    const decision = endeavor.decide(project.id, 'Use approach A', {
      rationale: 'Simpler implementation',
    });

    expect(decision.id).toMatch(/^d_/);
    expect(decision.summary).toBe('Use approach A');
  });

  it('should handle dependencies and blocking', () => {
    const project = endeavor.init(tmpdir(), 'test-project');
    const { item: item1 } = endeavor.assign(project.id, 'First task');
    const { item: item2 } = endeavor.assign(project.id, 'Second task');

    endeavor.depend(item2.id, item1.id);

    const status = endeavor.status(project.id);
    const blocked = status.items.find((i) => i.id === item2.id);
    expect(blocked?.status).toBe('blocked');
  });

  it('should unblock items when dependency is done', () => {
    const project = endeavor.init(tmpdir(), 'test-project');
    const { item: item1 } = endeavor.assign(project.id, 'First task');
    const { item: item2 } = endeavor.assign(project.id, 'Second task');

    endeavor.depend(item2.id, item1.id);

    const result = endeavor.done(item1.id);
    expect(result.unblocked).toHaveLength(1);
    expect(result.unblocked[0].id).toBe(item2.id);
  });

  it('should create and transition handoffs', () => {
    const project = endeavor.init(tmpdir(), 'test-project');
    const handoff = endeavor.handoff(project.id, '@agent-2', 'Auth API shape');

    expect(handoff.id).toMatch(/^h_/);
    expect(handoff.status).toBe('pending');

    const accepted = endeavor.acceptHandoff(handoff.id);
    expect(accepted.status).toBe('accepted');

    const completed = endeavor.completeHandoff(handoff.id);
    expect(completed.status).toBe('completed');
  });

  it('should find next available work items', () => {
    const project = endeavor.init(tmpdir(), 'test-project');
    const { item: item1 } = endeavor.assign(project.id, 'First task');
    const { item: item2 } = endeavor.assign(project.id, 'Second task');
    endeavor.assign(project.id, 'Third task');

    endeavor.depend(item2.id, item1.id);

    const next = endeavor.next(project.id);
    // item1 is todo (no assignee here, but actually if no assignee it's todo)
    // item2 is blocked, item3 is todo
    expect(next.some((i) => i.id === item2.id)).toBe(false);
  });

  it('should warn on unmet criteria but still complete', () => {
    const project = endeavor.init(tmpdir(), 'test-project');
    const { item } = endeavor.assign(project.id, 'Task with criteria', {
      criteria: ['tests pass', 'lint clean'],
    });

    const result = endeavor.done(item.id);
    expect(result.unmetCount).toBe(2);
    expect(result.item.status).toBe('done');
  });

  it('should detect dependency cycles', () => {
    const project = endeavor.init(tmpdir(), 'test-project');
    const { item: item1 } = endeavor.assign(project.id, 'Task A');
    const { item: item2 } = endeavor.assign(project.id, 'Task B');

    endeavor.depend(item2.id, item1.id);

    expect(() => {
      endeavor.depend(item1.id, item2.id);
    }).toThrow('cycle');
  });
});
