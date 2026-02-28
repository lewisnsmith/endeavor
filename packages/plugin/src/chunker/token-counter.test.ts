import { describe, it, expect } from "vitest";
import { countTokens } from "./token-counter.js";

describe("countTokens", () => {
  it("should return a positive number for non-empty strings", () => {
    const count = countTokens("Hello, world!");
    expect(count).toBeGreaterThan(0);
  });

  it("should return 0 for empty string", () => {
    expect(countTokens("")).toBe(0);
  });

  it("should count more tokens for longer text", () => {
    const short = countTokens("hello");
    const long = countTokens("hello world, this is a longer sentence with more tokens");
    expect(long).toBeGreaterThan(short);
  });

  it("should be deterministic", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    expect(countTokens(text)).toBe(countTokens(text));
  });
});
