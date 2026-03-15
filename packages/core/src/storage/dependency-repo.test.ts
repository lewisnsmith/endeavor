import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EndeavorDatabase } from './database.js';
import { ProjectRepository } from './project-repository.js';
import { WorkItemRepository } from './work-item-repo.js';
import { DependencyRepository } from './dependency-repo.js';
import { createLogger } from '../logger.js';
import { tmpdir } from 'node:os';

const logger = createLogger('test', { level: 'error' });

describe('DependencyRepository', () => {
  let db: EndeavorDatabase;
  let workItems: WorkItemRepository;
  let repo: DependencyRepository;
  let projectId: string;

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();
    const projects = new ProjectRepository(db.getDb());
    workItems = new WorkItemRepository(db.getDb());
    repo = new DependencyRepository(db.getDb());
    const project = projects.create({ name: 'Test', path: tmpdir() });
    projectId = project.id;
  });

  afterEach(() => {
    db.close();
  });

  it('should create a dependency', () => {
    const item1 = workItems.create({ projectId, description: 'Blocker' });
    const item2 = workItems.create({ projectId, description: 'Blocked' });

    const dep = repo.create({ blockerId: item1.id, blockedId: item2.id });

    expect(dep.id).toMatch(/^dep_/);
    expect(dep.blockerId).toBe(item1.id);
    expect(dep.blockedId).toBe(item2.id);
  });

  it('should reject self-dependency', () => {
    const item = workItems.create({ projectId, description: 'Task' });

    expect(() => repo.create({ blockerId: item.id, blockedId: item.id }))
      .toThrow('cannot depend on itself');
  });

  it('should reject duplicate dependency', () => {
    const item1 = workItems.create({ projectId, description: 'A' });
    const item2 = workItems.create({ projectId, description: 'B' });

    repo.create({ blockerId: item1.id, blockedId: item2.id });

    expect(() => repo.create({ blockerId: item1.id, blockedId: item2.id }))
      .toThrow('already exists');
  });

  it('should get blockers of an item', () => {
    const item1 = workItems.create({ projectId, description: 'Blocker 1' });
    const item2 = workItems.create({ projectId, description: 'Blocker 2' });
    const item3 = workItems.create({ projectId, description: 'Blocked' });

    repo.create({ blockerId: item1.id, blockedId: item3.id });
    repo.create({ blockerId: item2.id, blockedId: item3.id });

    const blockers = repo.getBlockersOf(item3.id);
    expect(blockers).toHaveLength(2);
  });

  it('should get items blocked by an item', () => {
    const item1 = workItems.create({ projectId, description: 'Blocker' });
    const item2 = workItems.create({ projectId, description: 'Blocked 1' });
    const item3 = workItems.create({ projectId, description: 'Blocked 2' });

    repo.create({ blockerId: item1.id, blockedId: item2.id });
    repo.create({ blockerId: item1.id, blockedId: item3.id });

    const blocked = repo.getBlockedBy(item1.id);
    expect(blocked).toHaveLength(2);
  });

  it('should detect direct cycles', () => {
    const item1 = workItems.create({ projectId, description: 'A' });
    const item2 = workItems.create({ projectId, description: 'B' });

    repo.create({ blockerId: item1.id, blockedId: item2.id });

    // Adding B blocks A would create A→B→A cycle
    expect(repo.hasCycle(item2.id, item1.id)).toBe(true);
  });

  it('should detect transitive cycles', () => {
    const item1 = workItems.create({ projectId, description: 'A' });
    const item2 = workItems.create({ projectId, description: 'B' });
    const item3 = workItems.create({ projectId, description: 'C' });

    repo.create({ blockerId: item1.id, blockedId: item2.id }); // A blocks B
    repo.create({ blockerId: item2.id, blockedId: item3.id }); // B blocks C

    // Adding C blocks A would create A→B→C→A cycle
    expect(repo.hasCycle(item3.id, item1.id)).toBe(true);
  });

  it('should allow valid non-cyclic dependencies', () => {
    const item1 = workItems.create({ projectId, description: 'A' });
    const item2 = workItems.create({ projectId, description: 'B' });
    const item3 = workItems.create({ projectId, description: 'C' });

    repo.create({ blockerId: item1.id, blockedId: item2.id });

    // C blocks B is fine (no cycle)
    expect(repo.hasCycle(item3.id, item2.id)).toBe(false);
  });

  it('should delete by blocker', () => {
    const item1 = workItems.create({ projectId, description: 'Blocker' });
    const item2 = workItems.create({ projectId, description: 'Blocked 1' });
    const item3 = workItems.create({ projectId, description: 'Blocked 2' });

    repo.create({ blockerId: item1.id, blockedId: item2.id });
    repo.create({ blockerId: item1.id, blockedId: item3.id });

    const deleted = repo.deleteByBlocker(item1.id);
    expect(deleted).toBe(2);
    expect(repo.getBlockedBy(item1.id)).toHaveLength(0);
  });
});
