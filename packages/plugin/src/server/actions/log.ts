import type { EndeavorPlugin } from "../../index.js";
import type { EventKind, TimelineEvent } from "@endeavor/shared-types";

export interface LogActionParams {
  projectId: string;
  tool?: string;
  kind?: EventKind;
  summary: string;
  metadata?: Record<string, unknown>;
}

export function handleLog(plugin: EndeavorPlugin, params: LogActionParams): { ok: boolean; event: TimelineEvent } {
  const project = plugin.projects.getById(params.projectId);
  if (!project) {
    throw new Error(`Project not found: ${params.projectId}`);
  }

  const event = plugin.events.create({
    projectId: params.projectId,
    tool: params.tool ?? "mcp",
    kind: params.kind ?? "note",
    summary: params.summary,
    metadata: params.metadata,
    timestamp: Date.now(),
  });

  return { ok: true, event };
}
