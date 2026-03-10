import type { FastifyInstance } from "fastify";
import type { EndeavorPlugin } from "@endeavor/plugin";
import type { EventKind } from "@endeavor/shared-types";

export function registerTimelineRoutes(app: FastifyInstance, plugin: EndeavorPlugin): void {
  app.get<{
    Querystring: { projectId: string; limit?: string; since?: string; kind?: string };
  }>("/timeline", async (request, reply) => {
    const { projectId, limit, since, kind } = request.query;

    if (!projectId) {
      reply.code(400);
      return { error: "projectId query parameter is required", code: "PROJECT_INVALID_INPUT" };
    }

    const project = plugin.projects.getById(projectId);
    if (!project) {
      reply.code(404);
      return { error: "Project not found", code: "PROJECT_NOT_FOUND" };
    }

    const events = plugin.events.listByProject(projectId, {
      limit: limit ? Number(limit) : 50,
      since: since ? Number(since) : undefined,
      kind: kind as EventKind | undefined,
    });

    return { events };
  });
}
