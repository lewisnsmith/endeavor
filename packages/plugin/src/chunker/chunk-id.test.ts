import { describe, it, expect } from "vitest";
import { generateChunkId } from "./chunk-id.js";

describe("generateChunkId", () => {
  it("should return a string starting with chunk_", () => {
    const id = generateChunkId("src/main.ts", "hello world", 0, 10);
    expect(id).toMatch(/^chunk_[a-f0-9]{16}$/);
  });

  it("should be deterministic", () => {
    const id1 = generateChunkId("src/main.ts", "content", 0, 5);
    const id2 = generateChunkId("src/main.ts", "content", 0, 5);
    expect(id1).toBe(id2);
  });

  it("should differ for different content", () => {
    const id1 = generateChunkId("src/main.ts", "content A", 0, 5);
    const id2 = generateChunkId("src/main.ts", "content B", 0, 5);
    expect(id1).not.toBe(id2);
  });

  it("should differ for different file paths", () => {
    const id1 = generateChunkId("src/a.ts", "same content", 0, 5);
    const id2 = generateChunkId("src/b.ts", "same content", 0, 5);
    expect(id1).not.toBe(id2);
  });

  it("should differ for different line ranges", () => {
    const id1 = generateChunkId("src/main.ts", "content", 0, 5);
    const id2 = generateChunkId("src/main.ts", "content", 5, 10);
    expect(id1).not.toBe(id2);
  });
});
