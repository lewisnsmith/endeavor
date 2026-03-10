import { SessionTracker } from "./session-tracker.js";
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

describe("SessionTracker", () => {
  it("generates a unique session ID", () => {
    const s1 = new SessionTracker();
    const s2 = new SessionTracker();
    expect(s1.sessionId).toBeTruthy();
    expect(s1.sessionId).not.toBe(s2.sessionId);
  });

  it("tracks header injection state", () => {
    const session = new SessionTracker();
    expect(session.headerInjected).toBe(false);
    session.markHeaderInjected();
    expect(session.headerInjected).toBe(true);
  });

  it("records and retrieves calls", () => {
    const session = new SessionTracker();
    expect(session.callCount).toBe(0);

    session.recordCall(makeRecord());
    expect(session.callCount).toBe(1);

    const recent = session.getRecentCalls(60_000);
    expect(recent).toHaveLength(1);
  });

  it("filters calls by time window", () => {
    const session = new SessionTracker();
    const oldRecord = makeRecord({ timestamp: Date.now() - 120_000 });
    const newRecord = makeRecord({ id: "call-2", timestamp: Date.now() });

    session.recordCall(oldRecord);
    session.recordCall(newRecord);

    expect(session.callCount).toBe(2);
    const recent = session.getRecentCalls(60_000);
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe("call-2");
  });
});
