import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "./logger.js";

describe("Logger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  function getLastLog(): Record<string, unknown> {
    const lastCall = stderrSpy.mock.calls.at(-1);
    return JSON.parse(lastCall![0] as string);
  }

  it("should output structured JSON to stderr", () => {
    const logger = createLogger("test", { level: "info" });
    logger.info("hello world");

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = getLastLog();
    expect(entry.level).toBe("info");
    expect(entry.component).toBe("test");
    expect(entry.message).toBe("hello world");
    expect(entry.timestamp).toBeDefined();
  });

  it("should filter messages below configured level", () => {
    const logger = createLogger("test", { level: "warn" });
    logger.debug("hidden");
    logger.info("also hidden");
    logger.warn("visible");

    expect(stderrSpy).toHaveBeenCalledOnce();
    expect(getLastLog().level).toBe("warn");
  });

  it("should include data when provided", () => {
    const logger = createLogger("test", { level: "info" });
    logger.info("with data", { key: "value" });

    const entry = getLastLog();
    expect(entry.data).toEqual({ key: "value" });
  });

  it("should include error details", () => {
    const logger = createLogger("test", { level: "info" });
    logger.error("failure", new Error("boom"));

    const entry = getLastLog();
    expect(entry.level).toBe("error");
    const err = entry.error as { message: string; stack: string };
    expect(err.message).toBe("boom");
    expect(err.stack).toBeDefined();
  });

  it("should support child loggers with component path", () => {
    const logger = createLogger("parent", { level: "info" });
    const child = logger.child("child");
    child.info("from child");

    const entry = getLastLog();
    expect(entry.component).toBe("parent:child");
  });

  it("should preserve correlationId in child loggers", () => {
    const logger = createLogger("parent", { level: "info", correlationId: "req-123" });
    const child = logger.child("child");
    child.info("correlated");

    const entry = getLastLog();
    expect(entry.correlationId).toBe("req-123");
  });

  it("should allow child to override correlationId", () => {
    const logger = createLogger("parent", { level: "info", correlationId: "req-123" });
    const child = logger.child("child", "req-456");
    child.info("new id");

    const entry = getLastLog();
    expect(entry.correlationId).toBe("req-456");
  });
});
