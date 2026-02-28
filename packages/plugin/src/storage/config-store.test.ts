import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EndeavorDatabase } from "./database.js";
import { ConfigStore } from "./config-store.js";
import { createLogger } from "../logger.js";
import { DEFAULT_CONFIG } from "@endeavor/shared-types";

const logger = createLogger("test", { level: "error" });

describe("ConfigStore", () => {
  let db: EndeavorDatabase;
  let store: ConfigStore;

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ":memory:", logger });
    db.initialize();
    store = new ConfigStore(db.getDb());
  });

  afterEach(() => {
    db.close();
  });

  it("should return default value when key is not set", () => {
    const logLevel = store.get("logLevel");
    expect(logLevel).toBe(DEFAULT_CONFIG.logLevel);
  });

  it("should set and retrieve a value", () => {
    store.set("logLevel", "debug");
    expect(store.get("logLevel")).toBe("debug");
  });

  it("should overwrite an existing value", () => {
    store.set("maxFileSizeBytes", 500_000);
    store.set("maxFileSizeBytes", 2_000_000);
    expect(store.get("maxFileSizeBytes")).toBe(2_000_000);
  });

  it("should return all config merged with defaults", () => {
    store.set("logLevel", "error");
    store.set("chunkMaxTokens", 1024);

    const all = store.getAll();
    expect(all.logLevel).toBe("error");
    expect(all.chunkMaxTokens).toBe(1024);
    expect(all.dataDir).toBe(DEFAULT_CONFIG.dataDir);
  });

  it("should reset a key to default", () => {
    store.set("logLevel", "error");
    store.reset("logLevel");
    expect(store.get("logLevel")).toBe(DEFAULT_CONFIG.logLevel);
  });

  it("should reject invalid logLevel", () => {
    expect(() => {
      store.set("logLevel", "invalid" as never);
    }).toThrow("Invalid value");
  });

  it("should reject negative maxFileSizeBytes", () => {
    expect(() => {
      store.set("maxFileSizeBytes", -1);
    }).toThrow("Invalid value");
  });

  it("should accept valid ignoredPatterns", () => {
    store.set("ignoredPatterns", ["node_modules", ".git"]);
    expect(store.get("ignoredPatterns")).toEqual(["node_modules", ".git"]);
  });
});
