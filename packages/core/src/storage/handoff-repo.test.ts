import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EndeavorDatabase } from './database.js';
import { ProjectRepository } from './project-repository.js';
import { WorkItemRepository } from './work-item-repo.js';
import { HandoffRepository } from './handoff-repo.js';
import { createLogger } from '../logger.js';
import { tmpdir } from 'node:os';

const logger = createLogger('test', { level: 'error' });

describe('HandoffRepository', () => {
  let db: EndeavorDatabase;
  let repo: HandoffRepository;
  let projectId: string;
  let workItemId: string;

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();
    const projects = new ProjectRepository(db.getDb());
    const workItems = new WorkItemRepository(db.getDb());
    repo = new HandoffRepository(db.getDb());
    const project = projects.create({ name: 'Test', path: tmpdir() });
    projectId = project.id;
    const item = workItems.create({ projectId, description: 'Task' });
    workItemId = item.id;
  });

  afterEach(() => {
    db.close();
  });

  it('should create a handoff with pending status', () => {
    const h = repo.create({ projectId, toAgent: '@agent-2', summary: 'Auth API shape' });

    expect(h.id).toMatch(/^h_/);
    expect(h.status).toBe('pending');
    expect(h.toAgent).toBe('@agent-2');
    expect(h.summary).toBe('Auth API shape');
    expect(h.fromAgent).toBeNull();
    expect(h.payload).toBeNull();
    expect(h.workItemId).toBeNull();
  });

  it('should create a handoff with all optional fields', () => {
    const h = repo.create({
      projectId,
      toAgent: '@agent-2',
      summary: 'Handoff',
      fromAgent: '@agent-1',
      payload: '{"context": "data"}',
      workItemId,
    });

    expect(h.fromAgent).toBe('@agent-1');
    expect(h.payload).toBe('{"context": "data"}');
    expect(h.workItemId).toBe(workItemId);
  });

  it('should retrieve a handoff by ID', () => {
    const created = repo.create({ projectId, toAgent: '@a', summary: 'Test' });
    const found = repo.getById(created.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it('should return null for non-existent ID', () => {
    expect(repo.getById('h_nonexistent')).toBeNull();
  });

  it('should list handoffs by project', () => {
    repo.create({ projectId, toAgent: '@a', summary: 'H1' });
    repo.create({ projectId, toAgent: '@b', summary: 'H2' });

    const all = repo.listByProject(projectId);
    expect(all).toHaveLength(2);
  });

  it('should filter handoffs by status', () => {
    const h1 = repo.create({ projectId, toAgent: '@a', summary: 'H1' });
    repo.create({ projectId, toAgent: '@b', summary: 'H2' });

    repo.updateStatus(h1.id, 'accepted');

    const pending = repo.listByProject(projectId, 'pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].summary).toBe('H2');

    const accepted = repo.listByProject(projectId, 'accepted');
    expect(accepted).toHaveLength(1);
    expect(accepted[0].summary).toBe('H1');
  });

  it('should transition pending → accepted', () => {
    const h = repo.create({ projectId, toAgent: '@a', summary: 'Test' });
    const updated = repo.updateStatus(h.id, 'accepted');

    expect(updated.status).toBe('accepted');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(h.updatedAt);
  });

  it('should transition accepted → completed', () => {
    const h = repo.create({ projectId, toAgent: '@a', summary: 'Test' });
    repo.updateStatus(h.id, 'accepted');
    const completed = repo.updateStatus(h.id, 'completed');

    expect(completed.status).toBe('completed');
  });

  it('should transition pending → expired', () => {
    const h = repo.create({ projectId, toAgent: '@a', summary: 'Test' });
    const expired = repo.updateStatus(h.id, 'expired');

    expect(expired.status).toBe('expired');
  });

  it('should reject invalid transition: pending → completed', () => {
    const h = repo.create({ projectId, toAgent: '@a', summary: 'Test' });

    expect(() => repo.updateStatus(h.id, 'completed'))
      .toThrow("Cannot transition handoff from 'pending' to 'completed'");
  });

  it('should reject invalid transition: completed → pending', () => {
    const h = repo.create({ projectId, toAgent: '@a', summary: 'Test' });
    repo.updateStatus(h.id, 'accepted');
    repo.updateStatus(h.id, 'completed');

    expect(() => repo.updateStatus(h.id, 'pending'))
      .toThrow("Cannot transition handoff from 'completed' to 'pending'");
  });

  it('should reject invalid transition: expired → accepted', () => {
    const h = repo.create({ projectId, toAgent: '@a', summary: 'Test' });
    repo.updateStatus(h.id, 'expired');

    expect(() => repo.updateStatus(h.id, 'accepted'))
      .toThrow("Cannot transition handoff from 'expired' to 'accepted'");
  });

  it('should throw when updating non-existent handoff', () => {
    expect(() => repo.updateStatus('h_nonexistent', 'accepted'))
      .toThrow('Handoff not found');
  });
});
