import { describe, it, expect } from "vitest";
import { chunkFile } from "./chunker.js";

const defaultOptions = {
  maxTokensPerChunk: 50,
  overlapTokens: 10,
};

describe("chunkFile", () => {
  it("should return empty array for empty content", () => {
    const chunks = chunkFile(
      { projectId: "p1", filePath: "empty.ts", content: "", lastModified: Date.now() },
      defaultOptions,
    );
    expect(chunks).toHaveLength(0);
  });

  it("should return empty array for whitespace-only content", () => {
    const chunks = chunkFile(
      { projectId: "p1", filePath: "ws.ts", content: "   \n  \n  ", lastModified: Date.now() },
      defaultOptions,
    );
    expect(chunks).toHaveLength(0);
  });

  it("should return single chunk for small files", () => {
    const chunks = chunkFile(
      {
        projectId: "p1",
        filePath: "small.ts",
        content: "const x = 1;",
        lastModified: Date.now(),
      },
      { maxTokensPerChunk: 500, overlapTokens: 10 },
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("const x = 1;");
    expect(chunks[0].projectId).toBe("p1");
    expect(chunks[0].filePath).toBe("small.ts");
  });

  it("should split large files into multiple chunks", () => {
    // Generate content that exceeds maxTokensPerChunk
    const lines = Array.from({ length: 100 }, (_, i) =>
      `const variable_${i} = "some value for line ${i}";`,
    );
    const content = lines.join("\n");

    const chunks = chunkFile(
      { projectId: "p1", filePath: "large.ts", content, lastModified: Date.now() },
      { maxTokensPerChunk: 100, overlapTokens: 20 },
    );

    expect(chunks.length).toBeGreaterThan(1);

    // All chunks should have the correct projectId and filePath
    for (const chunk of chunks) {
      expect(chunk.projectId).toBe("p1");
      expect(chunk.filePath).toBe("large.ts");
      expect(chunk.tokens).toBeGreaterThan(0);
      expect(chunk.id).toMatch(/^chunk_/);
    }
  });

  it("should generate deterministic chunk IDs", () => {
    const input = {
      projectId: "p1",
      filePath: "det.ts",
      content: "const x = 1;\nconst y = 2;",
      lastModified: 1000,
    };
    const options = { maxTokensPerChunk: 500, overlapTokens: 10 };

    const chunks1 = chunkFile(input, options);
    const chunks2 = chunkFile(input, options);

    expect(chunks1.map((c) => c.id)).toEqual(chunks2.map((c) => c.id));
  });

  it("should set lastModified on all chunks", () => {
    const ts = 1708300000000;
    const chunks = chunkFile(
      { projectId: "p1", filePath: "t.ts", content: "hello", lastModified: ts },
      { maxTokensPerChunk: 500, overlapTokens: 0 },
    );

    expect(chunks[0].lastModified).toBe(ts);
  });
});
