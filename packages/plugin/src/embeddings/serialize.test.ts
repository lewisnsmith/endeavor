import { describe, it, expect } from "vitest";
import { embeddingToBuffer, bufferToEmbedding } from "./serialize.js";

describe("serialize", () => {
  it("should roundtrip Float64Array through Buffer", () => {
    const original = new Float64Array([0.1, 0.2, 0.3, -0.5, 1.0]);
    const buf = embeddingToBuffer(original);
    const restored = bufferToEmbedding(buf);

    expect(restored.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(restored[i]).toBeCloseTo(original[i]);
    }
  });

  it("should handle empty array", () => {
    const original = new Float64Array([]);
    const buf = embeddingToBuffer(original);
    const restored = bufferToEmbedding(buf);
    expect(restored.length).toBe(0);
  });

  it("should produce a buffer of correct byte length", () => {
    const original = new Float64Array([1.0, 2.0, 3.0]);
    const buf = embeddingToBuffer(original);
    // Float64 = 8 bytes each
    expect(buf.byteLength).toBe(24);
  });
});
