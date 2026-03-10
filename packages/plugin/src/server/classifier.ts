import type { EventKind, ToolCallRecord } from "@endeavor/shared-types";

const DECISION_KEYWORDS = ["accept", "reject", "approve", "config", "configure", "decide", "chosen", "selected"];

export interface ClassifyInput {
  action: string;
  projectId: string | null;
  kind?: string;
  summary?: string;
  recentCalls: ToolCallRecord[];
}

export function classifyToolCall(input: ClassifyInput): EventKind {
  // Explicit decision via log action
  if (input.action === "log" && input.kind === "decision") {
    return "decision";
  }

  // Decision keywords in summary
  if (input.summary) {
    const lower = input.summary.toLowerCase();
    if (DECISION_KEYWORDS.some((kw) => lower.includes(kw))) {
      return "decision";
    }
  }

  // Repeated action+projectId in recent calls → iteration
  if (input.projectId) {
    const duplicate = input.recentCalls.some(
      (call) => call.action === input.action && call.projectId === input.projectId,
    );
    if (duplicate) {
      return "iteration";
    }
  }

  // Search or context → finding
  if (input.action === "search" || input.action === "context") {
    return "finding";
  }

  return "note";
}
