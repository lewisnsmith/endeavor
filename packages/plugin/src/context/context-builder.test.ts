import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { EndeavorDatabase } from "../storage/database.js";
import { ProjectRepository } from "../storage/project-repository.js";
import { FileChunkRepository } from "../storage/file-chunk-repository.js";
import { EventRepository } from "../storage/event-repository.js";
import { createLogger } from "../logger.js";
import { buildContext } from "./context-builder.js";
import type { EndeavorPlugin } from "../index.js";
import { tmpdir } from "node:os";
import { join } from "node:path";

const logger = createLogger("test", { level: "error" });

function createTestPlugin(): { plugin: Partial<EndeavorPlugin>; db: EndeavorDatabase } {
  const dataDir = mkdtempSync(join(tmpdir(), "endeavor-ctx-test-"));
  const db = new EndeavorDatabase({ dbPath: join(dataDir, "test.db"), logger });
  db.initialize();
  const rawDb = db.getDb();

  return {
    db,
    plugin: {
      projects: new ProjectRepository(rawDb),
      fileChunks: new FileChunkRepository(rawDb),
      events: new EventRepository(rawDb),
      embeddingProvider: null,
      logger,
    },
  };
}

describe("buildContext", () => {
  let db: EndeavorDatabase;
  let plugin: Partial<EndeavorPlugin>;
  let projectId: string;

  beforeEach(() => {
    const test = createTestPlugin();
    db = test.db;
    plugin = test.plugin;

    const projectDir = mkdtempSync(join(tmpdir(), "endeavor-ctx-proj-"));
    const project = plugin.projects!.create({
      name: "Test Project",
      type: "software",
      path: projectDir,
    });
    projectId = project.id;
  });

  afterEach(() => {
    db.close();
  });

  it("should return empty context for non-existent project", async () => {
    const result = await buildContext(plugin as EndeavorPlugin, {
      projectId: "non-existent",
      query: "",
      maxTokens: 4000,
    });
    expect(result.context).toBe("Project not found.");
    expect(result.tokens).toBe(0);
  });

  it("should build context with project header", async () => {
    const result = await buildContext(plugin as EndeavorPlugin, {
      projectId,
      query: "",
      maxTokens: 4000,
    });

    expect(result.context).toContain("# Project: Test Project");
    expect(result.context).toContain("software");
    expect(result.tokens).toBeGreaterThan(0);
  });

  it("should include file chunks in context", async () => {
    plugin.fileChunks!.upsert({
      id: "chunk_test1",
      projectId,
      filePath: "src/main.ts",
      content: "console.log('hello world');",
      tokens: 5,
      lastModified: Date.now(),
    });

    const result = await buildContext(plugin as EndeavorPlugin, {
      projectId,
      query: "",
      maxTokens: 4000,
    });

    expect(result.context).toContain("src/main.ts");
    expect(result.context).toContain("hello world");
    expect(result.sources.files).toContain("src/main.ts");
  });

  it("should include recent events in context", async () => {
    plugin.events!.create({
      projectId,
      tool: "claude",
      kind: "decision",
      summary: "Chose TypeScript over JavaScript",
      timestamp: Date.now(),
    });

    const result = await buildContext(plugin as EndeavorPlugin, {
      projectId,
      query: "",
      maxTokens: 4000,
    });

    expect(result.context).toContain("Chose TypeScript over JavaScript");
    expect(result.sources.events.length).toBe(1);
  });

  it("should respect token budget", async () => {
    // Insert many chunks to exceed budget
    for (let i = 0; i < 50; i++) {
      plugin.fileChunks!.upsert({
        id: `chunk_${i}`,
        projectId,
        filePath: `src/file${i}.ts`,
        content: `// File ${i}\n${"const x = 1;\n".repeat(20)}`,
        tokens: 100,
        lastModified: Date.now() - i * 1000,
      });
    }

    const result = await buildContext(plugin as EndeavorPlugin, {
      projectId,
      query: "",
      maxTokens: 500,
    });

    expect(result.tokens).toBeLessThanOrEqual(600); // Some slack for formatting
  });

  it("should prioritize matching chunks when query is provided", async () => {
    plugin.fileChunks!.upsert({
      id: "chunk_irrelevant",
      projectId,
      filePath: "src/utils.ts",
      content: "function add(a, b) { return a + b; }",
      tokens: 10,
      lastModified: Date.now(),
    });

    plugin.fileChunks!.upsert({
      id: "chunk_relevant",
      projectId,
      filePath: "src/auth.ts",
      content: "function authenticateUser(token) { /* auth logic */ }",
      tokens: 10,
      lastModified: Date.now() - 10000, // older
    });

    const result = await buildContext(plugin as EndeavorPlugin, {
      projectId,
      query: "authenticate",
      maxTokens: 4000,
    });

    // The auth file should appear before utils
    const authIdx = result.context.indexOf("auth.ts");
    const utilsIdx = result.context.indexOf("utils.ts");
    expect(authIdx).toBeLessThan(utilsIdx);
  });
});
