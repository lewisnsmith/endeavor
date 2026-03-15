import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EndeavorDatabase } from './database.js';
import { ProjectRepository } from './project-repository.js';
import { WorkItemRepository } from './work-item-repo.js';
import { createLogger } from '../logger.js';
import { tmpdir } from 'node:os';

const logger = createLogger('test', { level: 'error' });

describe('WorkItemRepository', () => {
  let db: EndeavorDatabase;
  let projects: ProjectRepository;
  let repo: WorkItemRepository;
  let projectId: string;

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();
    projects = new ProjectRepository(db.getDb());
    repo = new WorkItemRepository(db.getDb());
    const project = projects.create({ name: 'Test', path: tmpdir() });
    projectId = project.id;
  });

  afterEach(() => {
    db.close();
  });

  it('should create a work item with todo status when no assignee', () => {
    const item = repo.create({ projectId, description: 'Build feature' });

    expect(item.id).toMatch(/^w_/);
    expect(item.description).toBe('Build feature');
    expect(item.status).toBe('todo');
    expect(item.assignee).toBeNull();
    expect(item.branch).toBeNull();
    expect(item.worktree).toBeNull();
  });

  it('should create a work item with in_progress status when assignee is set', () => {
    const item = repo.create({ projectId, description: 'Fix bug', assignee: '@agent-1' });

    expect(item.status).toBe('in_progress');
    expect(item.assignee).toBe('@agent-1');
  });

  it('should store branch and worktree', () => {
    const item = repo.create({
      projectId,
      description: 'Refactor',
      branch: 'feature/refactor',
      worktree: '/tmp/wt',
    });

    expect(item.branch).toBe('feature/refactor');
    expect(item.worktree).toBe('/tmp/wt');
  });

  it('should retrieve a work item by ID', () => {
    const created = repo.create({ projectId, description: 'Task' });
    const found = repo.getById(created.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.description).toBe('Task');
  });

  it('should return null for non-existent ID', () => {
    expect(repo.getById('w_nonexistent')).toBeNull();
  });

  it('should list items by project', () => {
    repo.create({ projectId, description: 'Task 1' });
    repo.create({ projectId, description: 'Task 2' });

    const items = repo.listByProject(projectId);
    expect(items).toHaveLength(2);
    expect(items[0].description).toBe('Task 1');
    expect(items[1].description).toBe('Task 2');
  });

  it('should list items by status', () => {
    repo.create({ projectId, description: 'Unassigned' });
    repo.create({ projectId, description: 'Assigned', assignee: '@a' });

    const todoItems = repo.listByStatus(projectId, 'todo');
    expect(todoItems).toHaveLength(1);
    expect(todoItems[0].description).toBe('Unassigned');

    const inProgress = repo.listByStatus(projectId, 'in_progress');
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].description).toBe('Assigned');
  });

  it('should update status', () => {
    const item = repo.create({ projectId, description: 'Task' });
    const updated = repo.updateStatus(item.id, 'done');

    expect(updated.status).toBe('done');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(item.updatedAt);
  });

  it('should throw when updating status of non-existent item', () => {
    expect(() => repo.updateStatus('w_nonexistent', 'done')).toThrow('Work item not found');
  });

  it('should update multiple fields', () => {
    const item = repo.create({ projectId, description: 'Original' });
    const updated = repo.update(item.id, {
      description: 'Updated',
      assignee: '@agent-2',
      branch: 'fix/bug',
    });

    expect(updated.description).toBe('Updated');
    expect(updated.assignee).toBe('@agent-2');
    expect(updated.branch).toBe('fix/bug');
  });

  it('should throw when updating non-existent item', () => {
    expect(() => repo.update('w_nonexistent', { description: 'X' })).toThrow('Work item not found');
  });
});
