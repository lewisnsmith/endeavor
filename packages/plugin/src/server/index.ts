import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { EndeavorPlugin } from "../index.js";
import type { Logger } from "../logger.js";
import { handleStatus } from "./actions/status.js";
import { handleLog } from "./actions/log.js";
import { handleContext } from "./actions/context.js";
import { handleSearch } from "./actions/search.js";
import { SessionTracker } from "./session-tracker.js";
import { classifyToolCall } from "./classifier.js";
import type { EventKind, ToolCallRecord } from "@endeavor/shared-types";

export interface McpServerOptions {
  plugin: EndeavorPlugin;
  logger: Logger;
}

interface ActionResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

async function executeAction(
  plugin: EndeavorPlugin,
  action: string,
  args: Record<string, unknown>,
  session: SessionTracker,
): Promise<ActionResult> {
  switch (action) {
    case "status": {
      const result = handleStatus(plugin, args.projectId as string | undefined);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }

    case "log": {
      if (!args.projectId) throw new Error("projectId is required for log action");
      if (!args.summary) throw new Error("summary is required for log action");
      const result = handleLog(plugin, {
        projectId: args.projectId as string,
        tool: args.tool as string | undefined,
        kind: args.kind as EventKind | undefined,
        summary: args.summary as string,
        metadata: args.metadata as Record<string, unknown> | undefined,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }

    case "context": {
      if (!args.projectId) throw new Error("projectId is required for context action");
      const result = await handleContext(plugin, {
        projectId: args.projectId as string,
        query: args.query as string | undefined,
        maxTokens: args.maxTokens as number | undefined,
        session,
      });
      return {
        content: [{ type: "text" as const, text: result.context }],
      };
    }

    case "search": {
      if (!args.projectId) throw new Error("projectId is required for search action");
      if (!args.query) throw new Error("query is required for search action");
      const result = await handleSearch(plugin, {
        projectId: args.projectId as string,
        query: args.query as string,
        limit: args.limit as number | undefined,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }

    default:
      return {
        content: [{ type: "text" as const, text: `Unknown action: ${action}` }],
        isError: true,
      };
  }
}

export function createMcpServer(options: McpServerOptions): { start(): Promise<void>; close(): Promise<void> } {
  const { plugin, logger } = options;
  const session = new SessionTracker();

  const server = new Server(
    { name: "endeavor", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "endeavor",
        description:
          "Access project-aware context and log events. Actions: context (get context block), search (semantic search), log (record event), status (project stats).",
        inputSchema: {
          type: "object" as const,
          properties: {
            action: {
              type: "string",
              enum: ["context", "search", "log", "status"],
              description: "The action to perform",
            },
            projectId: {
              type: "string",
              description: "Project ID (required for context, search, log; optional for status)",
            },
            query: {
              type: "string",
              description: "Search query or context query string",
            },
            summary: {
              type: "string",
              description: "Event summary (required for log action)",
            },
            kind: {
              type: "string",
              enum: ["prompt", "response", "decision", "note", "error", "task", "custom", "iteration", "finding"],
              description: "Event kind (for log action, defaults to 'note')",
            },
            tool: {
              type: "string",
              description: "Tool name that generated the event (for log action)",
            },
            maxTokens: {
              type: "number",
              description: "Max tokens for context response (defaults to 4000)",
            },
            limit: {
              type: "number",
              description: "Max results for search (defaults to 10)",
            },
            metadata: {
              type: "object",
              description: "Arbitrary metadata (for log action)",
            },
          },
          required: ["action"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments as Record<string, unknown>;
    const action = args.action as string;
    const projectId = (args.projectId as string | undefined) ?? null;

    try {
      const result = await executeAction(plugin, action, args, session);

      // Auto-capture: skip for "log" to avoid double-logging
      if (action !== "log" && !result.isError) {
        const responseSummary = result.content[0]?.text.slice(0, 200) ?? "";

        const kind = classifyToolCall({
          action,
          projectId,
          summary: responseSummary,
          recentCalls: session.getRecentCalls(300_000), // 5 min window
        });

        const record: ToolCallRecord = {
          id: randomUUID(),
          action,
          projectId,
          args,
          responseSummary,
          timestamp: Date.now(),
          sessionId: session.sessionId,
        };

        session.recordCall(record);
        plugin.pushToolCall(record);

        // Create auto-captured timeline event if we have a projectId
        if (projectId) {
          try {
            plugin.events.create({
              projectId,
              tool: "mcp-auto",
              kind,
              summary: `Auto-captured ${action} action`,
              metadata: {
                toolCallId: record.id,
                sessionId: session.sessionId,
                action,
              },
              timestamp: record.timestamp,
            });
          } catch (evtErr) {
            logger.warn("Failed to auto-capture event", {
              action,
              error: (evtErr as Error).message,
            });
          }
        }
      }

      return result;
    } catch (err) {
      logger.error(`MCP action '${action}' failed`, err as Error);
      return {
        content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();

  return {
    async start() {
      await server.connect(transport);
      logger.info("MCP server started (stdio)", { sessionId: session.sessionId });
    },
    async close() {
      await server.close();
      logger.info("MCP server stopped", { sessionId: session.sessionId });
    },
  };
}
