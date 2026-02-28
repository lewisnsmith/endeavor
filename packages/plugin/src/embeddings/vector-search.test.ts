import { describe, it, expect } from "vitest";
import { searchByEmbedding } from "./vector-search.js";
import { embeddingToBuffer } from "./serialize.js";

describe("searchByEmbedding", () => {
  it("should rank candidates by similarity", () => {
    const query = new Float64Array([1, 0, 0]);

    const candidates = [
      { id: "a", embedding: embeddingToBuffer(new Float64Array([0, 1, 0])) },   // orthogonal
      { id: "b", embedding: embeddingToBuffer(new Float64Array([1, 0, 0])) },   // identical
      { id: "c", embedding: embeddingToBuffer(new Float64Array([0.9, 0.1, 0])) }, // similar
    ];

    const results = searchByEmbedding(query, candidates, 3);
    expect(results[0].id).toBe("b");
    expect(results[0].score).toBeCloseTo(1.0);
    expect(results[1].id).toBe("c");
    expect(results[2].id).toBe("a");
  });

  it("should respect topK limit", () => {
    const query = new Float64Array([1, 0]);
    const candidates = [
      { id: "a", embedding: embeddingToBuffer(new Float64Array([1, 0])) },
      { id: "b", embedding: embeddingToBuffer(new Float64Array([0, 1])) },
      { id: "c", embedding: embeddingToBuffer(new Float64Array([0.5, 0.5])) },
    ];

    const results = searchByEmbedding(query, candidates, 2);
    expect(results).toHaveLength(2);
  });

  it("should handle empty candidates", () => {
    const query = new Float64Array([1, 0]);
    const results = searchByEmbedding(query, [], 5);
    expect(results).toHaveLength(0);
  });
});
