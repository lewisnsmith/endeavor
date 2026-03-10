import type { FastifyInstance } from "fastify";
import type { EndeavorPlugin } from "@endeavor/plugin";
import type { LogEventRequest } from "@endeavor/shared-types";

export function registerLogRoutes(app: FastifyInstance, plugin: EndeavorPlugin): void {
  app.post<{ Body: LogEventRequest }>("/log", async (request, reply) => {
    const { projectId, tool, kind, summary, metadata } = request.body;

    const project = plugin.projects.getById(projectId);
    if (!project) {
      reply.code(404);
      return { error: "Project not found", code: "PROJECT_NOT_FOUND" };
    }

    const event = plugin.events.create({
      projectId,
      tool: tool ?? "rest-api",
      kind: kind ?? "note",
      summary,
      metadata,
      timestamp: Date.now(),
    });

    plugin.usageLogs.log({
      projectId,
      tool: "rest-api",
      model: null,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      timestamp: Date.now(),
    });

    reply.code(201);
    return { ok: true, eventId: event.id };
  });
}
