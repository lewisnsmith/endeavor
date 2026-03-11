import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EndeavorDatabase } from './database.js';
import { ProjectRepository } from './project-repository.js';
import { createLogger } from '../logger.js';
import { tmpdir } from 'node:os';

const logger = createLogger('test', { level: 'error' });

describe('ProjectRepository', () => {
  let db: EndeavorDatabase;
  let repo: ProjectRepository;

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
    db.initialize();
    repo = new ProjectRepository(db.getDb());
  });

  afterEach(() => {
    db.close();
  });

  it('should create a project', () => {
    const project = repo.create({ name: 'Test Project', path: tmpdir() });

    expect(project.id).toMatch(/^p_/);
    expect(project.name).toBe('Test Project');
    expect(project.createdAt).toBeGreaterThan(0);
  });

  it('should retrieve a project by ID', () => {
    const created = repo.create({ name: 'Test', path: tmpdir() });

    const found = repo.getById(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Test');
  });

  it('should return null for non-existent project', () => {
    const found = repo.getById('non-existent-id');
    expect(found).toBeNull();
  });

  it('should list all projects', () => {
    repo.create({ name: 'Project 1', path: tmpdir() });

    const projects = repo.list();
    expect(projects.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject duplicate paths', () => {
    const dir = tmpdir();
    repo.create({ name: 'First', path: dir });

    expect(() => {
      repo.create({ name: 'Second', path: dir });
    }).toThrow('already exists');
  });

  it('should reject non-existent paths', () => {
    expect(() => {
      repo.create({ name: 'Bad Path', path: '/this/path/does/not/exist/at/all' });
    }).toThrow('does not exist');
  });

  it('should update a project', () => {
    const created = repo.create({ name: 'Original', path: tmpdir() });

    const updated = repo.update(created.id, { name: 'Updated' });
    expect(updated.name).toBe('Updated');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
  });

  it('should delete a project', () => {
    const created = repo.create({ name: 'ToDelete', path: tmpdir() });

    const deleted = repo.delete(created.id);
    expect(deleted).toBe(true);

    const found = repo.getById(created.id);
    expect(found).toBeNull();
  });
});
