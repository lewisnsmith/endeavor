import type { EndeavorPlugin } from "../../index.js";
import type { GetContextResponse } from "@endeavor/shared-types";
import { buildContext } from "../../context/index.js";
import { countTokens } from "../../chunker/token-counter.js";
import type { SessionTracker } from "../session-tracker.js";

export interface ContextActionParams {
  projectId: string;
  query?: string;
  maxTokens?: number;
  session?: SessionTracker;
}

// PRD 9.3: thin ~150-token session header, injected once per session
const SESSION_HEADER_MAX_TOKENS = 150;

function buildSessionHeader(
  projectName: string,
  projectPath: string,
  session: SessionTracker,
  eventCount: number,
): string {
  // Truncate path if it would blow the budget
  const maxPathLen = 60;
  const displayPath = projectPath.length > maxPathLen
    ? "..." + projectPath.slice(-maxPathLen)
    : projectPath;

  const lines = [
    `[Session ${session.sessionId.slice(0, 8)}]`,
    `Project: ${projectName} (${displayPath})`,
    `Started: ${new Date(session.startedAt).toISOString()}`,
    `Tool calls: ${session.callCount} | Events: ${eventCount}`,
    "---",
  ];
  return lines.join("\n");
}

export async function handleContext(plugin: EndeavorPlugin, params: ContextActionParams): Promise<GetContextResponse> {
  const project = plugin.projects.getById(params.projectId);
  if (!project) {
    throw new Error(`Project not found: ${params.projectId}`);
  }

  const result = await buildContext(plugin, {
    projectId: params.projectId,
    query: params.query ?? "",
    maxTokens: params.maxTokens ?? 2000,
  });

  // Session-aware header injection: only on first context call per session
  if (params.session && !params.session.headerInjected) {
    const eventCount = plugin.events.countByProject(params.projectId);
    const header = buildSessionHeader(project.name, project.path, params.session, eventCount);
    result.context = header + "\n" + result.context;
    result.tokens = countTokens(result.context);
    params.session.markHeaderInjected();
  }

  plugin.usageLogs.log({
    projectId: params.projectId,
    tool: "mcp",
    model: null,
    tokensIn: 0,
    tokensOut: result.tokens,
    costUsd: 0,
    timestamp: Date.now(),
  });

  return result;
}
