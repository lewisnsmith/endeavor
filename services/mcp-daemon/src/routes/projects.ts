import type { FastifyInstance } from "fastify";
import type { EndeavorPlugin } from "@endeavor/plugin";
import type { CreateProjectRequest } from "@endeavor/shared-types";

export function registerProjectRoutes(app: FastifyInstance, plugin: EndeavorPlugin): void {
  app.post<{ Body: CreateProjectRequest }>("/projects", async (request, reply) => {
    const { name, type, path } = request.body;
    const project = plugin.projects.create({ name, type, path });

    // Auto-start watching the new project
    plugin.startWatching(project.id);

    reply.code(201);
    return { project };
  });

  app.get("/projects", async () => {
    const projects = plugin.projects.list();
    return { projects };
  });

  app.get<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    const project = plugin.projects.getById(request.params.id);
    if (!project) {
      reply.code(404);
      return { error: "Project not found", code: "PROJECT_NOT_FOUND" };
    }
    return { project };
  });

  app.delete<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    await plugin.stopWatching(request.params.id);
    const deleted = plugin.projects.delete(request.params.id);
    if (!deleted) {
      reply.code(404);
      return { error: "Project not found", code: "PROJECT_NOT_FOUND" };
    }
    return { deleted: true };
  });
}
