import { describe, it, expect } from "vitest";
import { cosineSimilarity } from "./cosine-similarity.js";

describe("cosineSimilarity", () => {
  it("should return 1 for identical vectors", () => {
    const a = new Float64Array([1, 2, 3]);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1.0);
  });

  it("should return 0 for orthogonal vectors", () => {
    const a = new Float64Array([1, 0, 0]);
    const b = new Float64Array([0, 1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it("should return -1 for opposite vectors", () => {
    const a = new Float64Array([1, 0, 0]);
    const b = new Float64Array([-1, 0, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0);
  });

  it("should handle zero vectors", () => {
    const a = new Float64Array([0, 0, 0]);
    const b = new Float64Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("should compute similarity for arbitrary vectors", () => {
    const a = new Float64Array([1, 2, 3]);
    const b = new Float64Array([4, 5, 6]);
    // dot = 32, |a| = sqrt(14), |b| = sqrt(77)
    const expected = 32 / (Math.sqrt(14) * Math.sqrt(77));
    expect(cosineSimilarity(a, b)).toBeCloseTo(expected);
  });
});
