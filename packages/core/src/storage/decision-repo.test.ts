import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EndeavorDatabase } from './database.js';
import { ProjectRepository } from './project-repository.js';
import { WorkItemRepository } from './work-item-repo.js';
import { DecisionRepository } from './decision-repo.js';
import { createLogger } from '../logger.js';
import { tmpdir } from 'node:os';

const logger = createLogger('test', { level: 'error' });

describe('DecisionRepository', () => {
  let db: EndeavorDatabase;
  let repo: DecisionRepository;
  let projectId: string;
  let workItemId: string;

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();
    const projects = new ProjectRepository(db.getDb());
    const workItems = new WorkItemRepository(db.getDb());
    repo = new DecisionRepository(db.getDb());
    const project = projects.create({ name: 'Test', path: tmpdir() });
    projectId = project.id;
    const item = workItems.create({ projectId, description: 'Task' });
    workItemId = item.id;
  });

  afterEach(() => {
    db.close();
  });

  it('should create a decision with required fields only', () => {
    const d = repo.create({ projectId, summary: 'Use JWT auth' });

    expect(d.id).toMatch(/^d_/);
    expect(d.projectId).toBe(projectId);
    expect(d.summary).toBe('Use JWT auth');
    expect(d.rationale).toBeNull();
    expect(d.decidedBy).toBeNull();
    expect(d.workItemId).toBeNull();
    expect(d.createdAt).toBeGreaterThan(0);
  });

  it('should create a decision with all optional fields', () => {
    const d = repo.create({
      projectId,
      summary: 'Use JWT auth',
      rationale: 'Stateless, easier scaling',
      decidedBy: '@lead',
      workItemId,
    });

    expect(d.rationale).toBe('Stateless, easier scaling');
    expect(d.decidedBy).toBe('@lead');
    expect(d.workItemId).toBe(workItemId);
  });

  it('should retrieve a decision by ID', () => {
    const created = repo.create({ projectId, summary: 'Decision A' });
    const found = repo.getById(created.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.summary).toBe('Decision A');
  });

  it('should return null for non-existent ID', () => {
    expect(repo.getById('d_nonexistent')).toBeNull();
  });

  it('should list all decisions by project', () => {
    repo.create({ projectId, summary: 'First' });
    repo.create({ projectId, summary: 'Second' });
    repo.create({ projectId, summary: 'Third' });

    const decisions = repo.listByProject(projectId);
    expect(decisions).toHaveLength(3);
    const summaries = decisions.map((d) => d.summary);
    expect(summaries).toContain('First');
    expect(summaries).toContain('Second');
    expect(summaries).toContain('Third');
  });

  it('should respect limit parameter', () => {
    repo.create({ projectId, summary: 'D1' });
    repo.create({ projectId, summary: 'D2' });
    repo.create({ projectId, summary: 'D3' });

    const limited = repo.listByProject(projectId, 2);
    expect(limited).toHaveLength(2);
  });

  it('should default limit to 10', () => {
    for (let i = 0; i < 15; i++) {
      repo.create({ projectId, summary: `Decision ${i}` });
    }

    const decisions = repo.listByProject(projectId);
    expect(decisions).toHaveLength(10);
  });
});
