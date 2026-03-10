import type { FastifyInstance } from "fastify";
import type { EndeavorPlugin } from "@endeavor/plugin";
import type { SearchRequest } from "@endeavor/shared-types";
import { handleSearch } from "@endeavor/plugin";

export function registerSearchRoutes(app: FastifyInstance, plugin: EndeavorPlugin): void {
  app.post<{ Body: SearchRequest }>("/search", async (request, reply) => {
    const { projectId, query, limit } = request.body;

    const project = plugin.projects.getById(projectId);
    if (!project) {
      reply.code(404);
      return { error: "Project not found", code: "PROJECT_NOT_FOUND" };
    }

    const result = await handleSearch(plugin, {
      projectId,
      query,
      limit,
    });

    return result;
  });
}
