import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EndeavorPlugin } from "./index.js";
import { buildContext } from "./context/index.js";
import { chunkFile } from "./chunker/chunker.js";


describe("EndeavorPlugin Integration", () => {
  let plugin: EndeavorPlugin;
  let testDir: string;
  let dataDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "endeavor-test-"));
    dataDir = mkdtempSync(join(tmpdir(), "endeavor-data-"));
    plugin = new EndeavorPlugin({
      dataDir,
      logLevel: "error",
    });
  });

  afterEach(async () => {
    if (plugin) {
      await plugin.shutdown();
    }
  });

  it("should initialize plugin and create repositories", () => {
    plugin.initialize();

    expect(plugin.projects).toBeTruthy();
    expect(plugin.events).toBeTruthy();
    expect(plugin.fileChunks).toBeTruthy();
  });

  it("should create a project and retrieve it", () => {
    plugin.initialize();

    const project = plugin.projects.create({
      name: "test",
      type: "software",
      path: testDir,
    });

    expect(project.id).toBeTruthy();

    const retrieved = plugin.projects.getById(project.id);
    expect(retrieved).toBeTruthy();
    expect(retrieved?.id).toBe(project.id);
    expect(retrieved?.name).toBe("test");
    expect(retrieved?.type).toBe("software");
  });

  it("should store chunks and retrieve them", () => {
    plugin.initialize();

    const project = plugin.projects.create({
      name: "test",
      type: "software",
      path: testDir,
    });

    const sampleContent = "This is a test file content with some code and documentation.";
    const chunks = chunkFile(
      {
        projectId: project.id,
        filePath: "/test/file.ts",
        content: sampleContent,
        lastModified: Date.now(),
      },
      { maxTokensPerChunk: 512, overlapTokens: 50 },
    );

    plugin.fileChunks.upsertMany(chunks);

    const retrieved = plugin.fileChunks.listByProject(project.id);
    expect(retrieved).toHaveLength(chunks.length);
    expect(retrieved[0].content).toBe(sampleContent);
    expect(retrieved[0].filePath).toBe("/test/file.ts");
  });

  it("should log events and query timeline", () => {
    plugin.initialize();

    const project = plugin.projects.create({
      name: "test",
      type: "software",
      path: testDir,
    });

    const event = plugin.events.create({
      projectId: project.id,
      tool: "test-tool",
      kind: "note",
      summary: "Test event summary",
      metadata: { test: "data" },
      timestamp: Date.now(),
    });

    expect(event.id).toBeTruthy();

    const events = plugin.events.listByProject(project.id);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("Test event summary");
    expect(events[0].tool).toBe("test-tool");

    const count = plugin.events.countByProject(project.id);
    expect(count).toBe(1);
  });

  it("should build context within token budget", async () => {
    plugin.initialize();

    const project = plugin.projects.create({
      name: "test",
      type: "software",
      path: testDir,
    });

    // Store some chunks
    const chunks = chunkFile(
      {
        projectId: project.id,
        filePath: "/test/file.ts",
        content: "This is a test file with some content that will be chunked and stored.",
        lastModified: Date.now(),
      },
      { maxTokensPerChunk: 512, overlapTokens: 50 },
    );
    plugin.fileChunks.upsertMany(chunks);

    // Create some events
    plugin.events.create({
      projectId: project.id,
      tool: "test-tool",
      kind: "note",
      summary: "Test event for context building",
      metadata: {},
      timestamp: Date.now(),
    });

    // Build context
    const result = await buildContext(plugin, {
      projectId: project.id,
      query: "",
      maxTokens: 2000,
    });

    expect(result.context).toBeTruthy();
    expect(typeof result.context).toBe("string");
    expect(result.tokens).toBeLessThanOrEqual(2000);
    expect(result.sources).toBeTruthy();
    expect(Array.isArray(result.sources.files)).toBe(true);
    expect(Array.isArray(result.sources.events)).toBe(true);
  });

  it("should track usage logs", () => {
    plugin.initialize();

    const project = plugin.projects.create({
      name: "test",
      type: "software",
      path: testDir,
    });

    plugin.usageLogs.log({
      projectId: project.id,
      tool: "test-tool",
      model: "gpt-4",
      tokensIn: 100,
      tokensOut: 50,
      costUsd: 0.005,
      timestamp: Date.now(),
    });

    const logs = plugin.usageLogs.listByProject(project.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].tool).toBe("test-tool");
    expect(logs[0].model).toBe("gpt-4");
    expect(logs[0].tokensIn).toBe(100);
    expect(logs[0].tokensOut).toBe(50);
    expect(logs[0].costUsd).toBe(0.005);
  });
});
