import Fastify from "fastify";
import type { EndeavorPlugin } from "@endeavor/plugin";
import type { Logger } from "@endeavor/plugin";
import { EndeavorError } from "@endeavor/shared-types";
import {
  registerProjectRoutes,
  registerContextRoutes,
  registerLogRoutes,
  registerTimelineRoutes,
  registerSearchRoutes,
} from "./routes/index.js";

export interface RestApiOptions {
  plugin: EndeavorPlugin;
  logger: Logger;
  port?: number;
  host?: string;
}

export async function createRestApi(options: RestApiOptions) {
  const { plugin, logger, port = 31415, host = "127.0.0.1" } = options;

  const app = Fastify({ logger: false });

  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof EndeavorError) {
      const statusMap: Record<string, number> = {
        PROJECT_NOT_FOUND: 404,
        PROJECT_INVALID_INPUT: 400,
        PROJECT_PATH_DUPLICATE: 400,
        PROJECT_PATH_NOT_FOUND: 400,
      };
      const status = statusMap[error.code] ?? 500;
      reply.code(status).send({
        error: error.message,
        code: error.code,
        details: error.details,
      });
    } else {
      logger.error("Unhandled REST error", error as Error);
      reply.code(500).send({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  });

  // Health check
  app.get("/health", async () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
  }));

  // Register route modules
  registerProjectRoutes(app, plugin);
  registerContextRoutes(app, plugin);
  registerLogRoutes(app, plugin);
  registerTimelineRoutes(app, plugin);
  registerSearchRoutes(app, plugin);

  await app.listen({ port, host });
  const boundAddress = app.server.address();
  const actualPort = typeof boundAddress === "object" && boundAddress ? boundAddress.port : port;
  logger.info("REST API started", { port: actualPort, host });

  return {
    address: `http://${host}:${actualPort}`,
    async close() {
      await app.close();
      logger.info("REST API stopped");
    },
  };
}
