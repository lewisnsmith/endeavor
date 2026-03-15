import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EndeavorDatabase } from './database.js';
import { ProjectRepository } from './project-repository.js';
import { WorkItemRepository } from './work-item-repo.js';
import { DoneCriteriaRepository } from './done-criteria-repo.js';
import { createLogger } from '../logger.js';
import { tmpdir } from 'node:os';

const logger = createLogger('test', { level: 'error' });

describe('DoneCriteriaRepository', () => {
  let db: EndeavorDatabase;
  let repo: DoneCriteriaRepository;
  let workItemId: string;

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();
    const projects = new ProjectRepository(db.getDb());
    const workItems = new WorkItemRepository(db.getDb());
    repo = new DoneCriteriaRepository(db.getDb());

    const project = projects.create({ name: 'Test', path: tmpdir() });
    const item = workItems.create({ projectId: project.id, description: 'Task' });
    workItemId = item.id;
  });

  afterEach(() => {
    db.close();
  });

  it('should create a criterion as unmet', () => {
    const c = repo.create({ workItemId, description: 'Tests pass' });

    expect(c.id).toMatch(/^dc_/);
    expect(c.workItemId).toBe(workItemId);
    expect(c.description).toBe('Tests pass');
    expect(c.met).toBe(false);
    expect(c.metAt).toBeNull();
    expect(c.createdAt).toBeGreaterThan(0);
  });

  it('should list criteria by work item in creation order', () => {
    repo.create({ workItemId, description: 'Tests pass' });
    repo.create({ workItemId, description: 'No lint errors' });
    repo.create({ workItemId, description: 'Docs updated' });

    const criteria = repo.listByWorkItem(workItemId);
    expect(criteria).toHaveLength(3);
    expect(criteria[0].description).toBe('Tests pass');
    expect(criteria[1].description).toBe('No lint errors');
    expect(criteria[2].description).toBe('Docs updated');
  });

  it('should return empty list for item with no criteria', () => {
    const criteria = repo.listByWorkItem('w_no_criteria');
    expect(criteria).toHaveLength(0);
  });

  it('should mark a criterion as met', () => {
    const c = repo.create({ workItemId, description: 'Tests pass' });
    const met = repo.markMet(c.id);

    expect(met.met).toBe(true);
    expect(met.metAt).toBeGreaterThan(0);
  });

  it('should preserve unmet criteria when marking one as met', () => {
    const c1 = repo.create({ workItemId, description: 'Tests pass' });
    repo.create({ workItemId, description: 'Lint clean' });

    repo.markMet(c1.id);

    const criteria = repo.listByWorkItem(workItemId);
    const metCount = criteria.filter((c) => c.met).length;
    const unmetCount = criteria.filter((c) => !c.met).length;

    expect(metCount).toBe(1);
    expect(unmetCount).toBe(1);
  });
});
