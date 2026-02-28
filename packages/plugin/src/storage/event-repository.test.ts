import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EndeavorDatabase } from "./database.js";
import { ProjectRepository } from "./project-repository.js";
import { EventRepository } from "./event-repository.js";
import { createLogger } from "../logger.js";
import { tmpdir } from "node:os";

const logger = createLogger("test", { level: "error" });

describe("EventRepository", () => {
  let db: EndeavorDatabase;
  let projects: ProjectRepository;
  let events: EventRepository;
  let projectId: string;

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ":memory:", logger });
    db.initialize();
    projects = new ProjectRepository(db.getDb());
    events = new EventRepository(db.getDb());

    const project = projects.create({
      name: "Test Project",
      type: "software",
      path: tmpdir(),
    });
    projectId = project.id;
  });

  afterEach(() => {
    db.close();
  });

  it("should create an event", () => {
    const event = events.create({
      projectId,
      tool: "claude_desktop",
      kind: "prompt",
      summary: "Asked about file structure",
      timestamp: Date.now(),
    });

    expect(event.id).toBeGreaterThan(0);
    expect(event.summary).toBe("Asked about file structure");
    expect(event.kind).toBe("prompt");
  });

  it("should create an event with metadata", () => {
    const event = events.create({
      projectId,
      tool: "cursor",
      kind: "decision",
      summary: "Chose React over Vue",
      metadata: { reason: "team familiarity", alternatives: ["Vue", "Svelte"] },
      timestamp: Date.now(),
    });

    expect(event.metadata).toEqual({
      reason: "team familiarity",
      alternatives: ["Vue", "Svelte"],
    });
  });

  it("should retrieve an event by ID", () => {
    const created = events.create({
      projectId,
      tool: "gpt_api",
      kind: "response",
      summary: "Generated test cases",
      timestamp: Date.now(),
    });

    const found = events.getById(created.id);
    expect(found).not.toBeNull();
    expect(found!.summary).toBe("Generated test cases");
  });

  it("should return null for non-existent event", () => {
    const found = events.getById(999999);
    expect(found).toBeNull();
  });

  it("should list events by project", () => {
    events.create({ projectId, tool: "claude", kind: "prompt", summary: "First", timestamp: 1000 });
    events.create({ projectId, tool: "cursor", kind: "note", summary: "Second", timestamp: 2000 });
    events.create({ projectId, tool: "claude", kind: "response", summary: "Third", timestamp: 3000 });

    const list = events.listByProject(projectId);
    expect(list).toHaveLength(3);
    // Should be ordered by timestamp DESC
    expect(list[0].summary).toBe("Third");
    expect(list[2].summary).toBe("First");
  });

  it("should filter by kind", () => {
    events.create({ projectId, tool: "claude", kind: "prompt", summary: "Q1", timestamp: 1000 });
    events.create({ projectId, tool: "claude", kind: "response", summary: "A1", timestamp: 2000 });
    events.create({ projectId, tool: "claude", kind: "prompt", summary: "Q2", timestamp: 3000 });

    const prompts = events.listByProject(projectId, { kind: "prompt" });
    expect(prompts).toHaveLength(2);
    expect(prompts.every((e) => e.kind === "prompt")).toBe(true);
  });

  it("should filter by since timestamp", () => {
    events.create({ projectId, tool: "claude", kind: "note", summary: "Old", timestamp: 1000 });
    events.create({ projectId, tool: "claude", kind: "note", summary: "New", timestamp: 5000 });

    const recent = events.listByProject(projectId, { since: 3000 });
    expect(recent).toHaveLength(1);
    expect(recent[0].summary).toBe("New");
  });

  it("should respect limit", () => {
    for (let i = 0; i < 10; i++) {
      events.create({ projectId, tool: "claude", kind: "note", summary: `Event ${i}`, timestamp: i * 1000 });
    }

    const limited = events.listByProject(projectId, { limit: 3 });
    expect(limited).toHaveLength(3);
  });

  it("should count events by project", () => {
    events.create({ projectId, tool: "claude", kind: "note", summary: "A", timestamp: 1000 });
    events.create({ projectId, tool: "claude", kind: "note", summary: "B", timestamp: 2000 });

    expect(events.countByProject(projectId)).toBe(2);
  });

  it("should delete events by project", () => {
    events.create({ projectId, tool: "claude", kind: "note", summary: "A", timestamp: 1000 });
    events.create({ projectId, tool: "claude", kind: "note", summary: "B", timestamp: 2000 });

    const deleted = events.deleteByProject(projectId);
    expect(deleted).toBe(2);
    expect(events.countByProject(projectId)).toBe(0);
  });
});
