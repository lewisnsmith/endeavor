import { classifyToolCall } from "./classifier.js";
import type { ToolCallRecord } from "@endeavor/shared-types";

function makeRecord(overrides: Partial<ToolCallRecord> = {}): ToolCallRecord {
  return {
    id: "call-1",
    action: "context",
    projectId: "proj-1",
    args: {},
    responseSummary: "",
    timestamp: Date.now(),
    sessionId: "sess-1",
    ...overrides,
  };
}

describe("classifyToolCall", () => {
  it("returns 'decision' for log action with kind=decision", () => {
    expect(
      classifyToolCall({
        action: "log",
        projectId: "proj-1",
        kind: "decision",
        recentCalls: [],
      }),
    ).toBe("decision");
  });

  it("returns 'decision' when summary contains decision keywords", () => {
    expect(
      classifyToolCall({
        action: "status",
        projectId: "proj-1",
        summary: "User approved the config change",
        recentCalls: [],
      }),
    ).toBe("decision");
  });

  it("returns 'iteration' when same action+projectId seen in recent calls", () => {
    const recent = [makeRecord({ action: "search", projectId: "proj-1" })];
    expect(
      classifyToolCall({
        action: "search",
        projectId: "proj-1",
        recentCalls: recent,
      }),
    ).toBe("iteration");
  });

  it("returns 'finding' for search action", () => {
    expect(
      classifyToolCall({
        action: "search",
        projectId: "proj-1",
        recentCalls: [],
      }),
    ).toBe("finding");
  });

  it("returns 'finding' for context action", () => {
    expect(
      classifyToolCall({
        action: "context",
        projectId: "proj-1",
        recentCalls: [],
      }),
    ).toBe("finding");
  });

  it("returns 'note' for unmatched actions", () => {
    expect(
      classifyToolCall({
        action: "status",
        projectId: "proj-1",
        recentCalls: [],
      }),
    ).toBe("note");
  });

  it("returns 'note' when projectId is null and action is not search/context", () => {
    expect(
      classifyToolCall({
        action: "status",
        projectId: null,
        recentCalls: [],
      }),
    ).toBe("note");
  });
});
