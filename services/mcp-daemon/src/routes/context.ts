import type { FastifyInstance } from "fastify";
import type { EndeavorPlugin } from "@endeavor/plugin";
import type { GetContextRequest } from "@endeavor/shared-types";
import { buildContext } from "@endeavor/plugin";

export function registerContextRoutes(app: FastifyInstance, plugin: EndeavorPlugin): void {
  app.post<{ Body: GetContextRequest }>("/context", async (request, reply) => {
    const { projectId, query, maxTokens } = request.body;

    const project = plugin.projects.getById(projectId);
    if (!project) {
      reply.code(404);
      return { error: "Project not found", code: "PROJECT_NOT_FOUND" };
    }

    const result = await buildContext(plugin, {
      projectId,
      query: query ?? "",
      maxTokens: maxTokens ?? 4000,
    });

    plugin.usageLogs.log({
      projectId,
      tool: "rest-api",
      model: null,
      tokensIn: 0,
      tokensOut: result.tokens,
      costUsd: 0,
      timestamp: Date.now(),
    });

    return result;
  });
}
