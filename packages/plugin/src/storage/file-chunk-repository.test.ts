import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EndeavorDatabase } from "./database.js";
import { FileChunkRepository } from "./file-chunk-repository.js";
import { ProjectRepository } from "./project-repository.js";
import { createLogger } from "../logger.js";
import { tmpdir } from "node:os";
import type { FileChunk } from "@endeavor/shared-types";

const logger = createLogger("test", { level: "error" });

describe("FileChunkRepository", () => {
  let db: EndeavorDatabase;
  let repo: FileChunkRepository;
  let projectId: string;

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ":memory:", logger });
    db.initialize();
    repo = new FileChunkRepository(db.getDb());

    const projectRepo = new ProjectRepository(db.getDb());
    const project = projectRepo.create({
      name: "Test",
      type: "software",
      path: tmpdir(),
    });
    projectId = project.id;
  });

  afterEach(() => {
    db.close();
  });

  function makeChunk(id: string, filePath: string): FileChunk {
    return {
      id,
      projectId,
      filePath,
      content: `content of ${id}`,
      tokens: 10,
      lastModified: Date.now(),
    };
  }

  it("should upsert a chunk", () => {
    repo.upsert(makeChunk("c1", "src/main.ts"));
    const found = repo.getById("c1");
    expect(found).not.toBeNull();
    expect(found!.content).toBe("content of c1");
  });

  it("should update on conflict", () => {
    repo.upsert(makeChunk("c1", "src/main.ts"));
    repo.upsert({
      ...makeChunk("c1", "src/main.ts"),
      content: "updated content",
      tokens: 20,
    });

    const found = repo.getById("c1");
    expect(found!.content).toBe("updated content");
    expect(found!.tokens).toBe(20);
  });

  it("should upsertMany in a transaction", () => {
    const chunks = [
      makeChunk("c1", "src/a.ts"),
      makeChunk("c2", "src/a.ts"),
      makeChunk("c3", "src/b.ts"),
    ];

    repo.upsertMany(chunks);
    const all = repo.listByProject(projectId);
    expect(all).toHaveLength(3);
  });

  it("should list chunks by file path", () => {
    repo.upsertMany([
      makeChunk("c1", "src/a.ts"),
      makeChunk("c2", "src/a.ts"),
      makeChunk("c3", "src/b.ts"),
    ]);

    const aChunks = repo.listByFilePath(projectId, "src/a.ts");
    expect(aChunks).toHaveLength(2);
  });

  it("should delete chunks by file path", () => {
    repo.upsertMany([
      makeChunk("c1", "src/a.ts"),
      makeChunk("c2", "src/a.ts"),
      makeChunk("c3", "src/b.ts"),
    ]);

    const deleted = repo.deleteByFilePath(projectId, "src/a.ts");
    expect(deleted).toBe(2);
    expect(repo.listByProject(projectId)).toHaveLength(1);
  });

  it("should delete stale chunks", () => {
    repo.upsertMany([
      makeChunk("c1", "src/a.ts"),
      makeChunk("c2", "src/a.ts"),
      makeChunk("c3", "src/a.ts"),
    ]);

    // Keep c1 and c3, delete c2
    const deleted = repo.deleteStaleChunks(projectId, "src/a.ts", ["c1", "c3"]);
    expect(deleted).toBe(1);

    const remaining = repo.listByFilePath(projectId, "src/a.ts");
    expect(remaining).toHaveLength(2);
    expect(remaining.map((c) => c.id).sort()).toEqual(["c1", "c3"]);
  });

  it("should delete all chunks when currentChunkIds is empty", () => {
    repo.upsertMany([
      makeChunk("c1", "src/a.ts"),
      makeChunk("c2", "src/a.ts"),
    ]);

    const deleted = repo.deleteStaleChunks(projectId, "src/a.ts", []);
    expect(deleted).toBe(2);
  });
});
