import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EndeavorDatabase } from "./database.js";
import { ProjectRepository } from "./project-repository.js";
import { createLogger } from "../logger.js";
import { tmpdir } from "node:os";

const logger = createLogger("test", { level: "error" });

describe("ProjectRepository", () => {
  let db: EndeavorDatabase;
  let repo: ProjectRepository;

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ":memory:", logger });
    db.initialize();
    repo = new ProjectRepository(db.getDb());
  });

  afterEach(() => {
    db.close();
  });

  it("should create a project", () => {
    const project = repo.create({
      name: "Test Project",
      type: "software",
      path: tmpdir(),
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe("Test Project");
    expect(project.type).toBe("software");
    expect(project.createdAt).toBeGreaterThan(0);
  });

  it("should retrieve a project by ID", () => {
    const created = repo.create({
      name: "Test",
      type: "research",
      path: tmpdir(),
    });

    const found = repo.getById(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Test");
  });

  it("should return null for non-existent project", () => {
    const found = repo.getById("non-existent-id");
    expect(found).toBeNull();
  });

  it("should list all projects", () => {
    // Use different paths to avoid duplicate constraint
    const dir1 = tmpdir();
    repo.create({ name: "Project 1", type: "software", path: dir1 });

    const projects = repo.list();
    expect(projects.length).toBeGreaterThanOrEqual(1);
  });

  it("should reject duplicate paths", () => {
    const dir = tmpdir();
    repo.create({ name: "First", type: "software", path: dir });

    expect(() => {
      repo.create({ name: "Second", type: "research", path: dir });
    }).toThrow("already exists");
  });

  it("should reject non-existent paths", () => {
    expect(() => {
      repo.create({
        name: "Bad Path",
        type: "software",
        path: "/this/path/does/not/exist/at/all",
      });
    }).toThrow("does not exist");
  });

  it("should update a project", () => {
    const created = repo.create({
      name: "Original",
      type: "software",
      path: tmpdir(),
    });

    const updated = repo.update(created.id, { name: "Updated" });
    expect(updated.name).toBe("Updated");
    expect(updated.type).toBe("software");
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
  });

  it("should delete a project", () => {
    const created = repo.create({
      name: "ToDelete",
      type: "general",
      path: tmpdir(),
    });

    const deleted = repo.delete(created.id);
    expect(deleted).toBe(true);

    const found = repo.getById(created.id);
    expect(found).toBeNull();
  });

  it("should return false when deleting non-existent project", () => {
    const deleted = repo.delete("non-existent-id");
    expect(deleted).toBe(false);
  });
});
