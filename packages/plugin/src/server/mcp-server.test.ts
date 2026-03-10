import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EndeavorPlugin } from "../index.js";
import { handleStatus } from "./actions/status.js";
import { handleLog } from "./actions/log.js";
import { handleContext } from "./actions/context.js";
import { handleSearch } from "./actions/search.js";
import { chunkFile } from "../chunker/chunker.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let testCounter = 0;

describe("MCP Server Action Handlers", () => {
  let plugin: EndeavorPlugin;
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), `endeavor-mcp-test-${testCounter++}-`));
    const dataDir = mkdtempSync(join(tmpdir(), `endeavor-mcp-data-${testCounter}-`));
    plugin = new EndeavorPlugin({ dataDir, logLevel: "error" });
    plugin.initialize();
  });

  afterEach(async () => {
    if (plugin) {
      await plugin.shutdown();
    }
  });

  describe("handleStatus", () => {
    it("should return all projects when no projectId", () => {
      plugin.projects.create({ name: "Project 1", type: "software", path: testDir });

      const result = handleStatus(plugin);

      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[]).length).toBeGreaterThanOrEqual(1);
    });

    it("should return single project status", () => {
      const project = plugin.projects.create({
        name: "Test Project",
        type: "software",
        path: testDir,
      });

      const result = handleStatus(plugin, project.id);

      expect(result).toMatchObject({
        projectId: project.id,
        name: "Test Project",
        totalFiles: expect.any(Number),
        totalChunks: expect.any(Number),
        totalEvents: expect.any(Number),
      });
    });

    it("should handle non-existent project", () => {
      const result = handleStatus(plugin, "nonexistent");

      expect(result).toMatchObject({
        name: "unknown",
        totalFiles: 0,
        totalChunks: 0,
        totalEvents: 0,
      });
    });
  });

  describe("handleLog", () => {
    it("should create an event", () => {
      const project = plugin.projects.create({
        name: "Test Project",
        type: "software",
        path: testDir,
      });

      const result = handleLog(plugin, {
        projectId: project.id,
        summary: "test event",
      });

      expect(result.ok).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event.summary).toBe("test event");
      expect(result.event.tool).toBe("mcp");
    });

    it("should throw for non-existent project", () => {
      expect(() => {
        handleLog(plugin, {
          projectId: "nonexistent",
          summary: "test",
        });
      }).toThrow("Project not found");
    });
  });

  describe("handleContext", () => {
    it("should return context", async () => {
      const project = plugin.projects.create({
        name: "Test Project",
        type: "software",
        path: testDir,
      });

      const result = await handleContext(plugin, {
        projectId: project.id,
      });

      expect(result).toHaveProperty("context");
      expect(result).toHaveProperty("tokens");
      expect(result).toHaveProperty("sources");
      expect(typeof result.context).toBe("string");
      expect(typeof result.tokens).toBe("number");
    });

    it("should throw for non-existent project", async () => {
      await expect(
        handleContext(plugin, { projectId: "nonexistent" }),
      ).rejects.toThrow("Project not found");
    });
  });

  describe("handleSearch", () => {
    it("should return results array", async () => {
      const project = plugin.projects.create({
        name: "Test Project",
        type: "software",
        path: testDir,
      });

      // Store some chunks
      const chunks = chunkFile(
        {
          projectId: project.id,
          filePath: "/test/file.ts",
          content: "function test() { return 'hello world'; }",
          lastModified: Date.now(),
        },
        { maxTokensPerChunk: 512, overlapTokens: 50 },
      );
      plugin.fileChunks.upsertMany(chunks);

      const result = await handleSearch(plugin, {
        projectId: project.id,
        query: "test",
      });

      expect(result).toHaveProperty("results");
      expect(Array.isArray(result.results)).toBe(true);
    });

    it("should throw for non-existent project", async () => {
      await expect(
        handleSearch(plugin, { projectId: "nonexistent", query: "test" }),
      ).rejects.toThrow("Project not found");
    });
  });
});
