import { EndeavorPlugin, createLogger, createMcpServer } from "@endeavor/plugin";
import { endeavorVersion, healthStatuses } from "@endeavor/shared-types";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { createRestApi } from "./rest-api.js";

const logger = createLogger("daemon");

const dataDir = process.env.ENDEAVOR_DATA_DIR
  ? resolve(process.env.ENDEAVOR_DATA_DIR)
  : resolve(homedir(), ".endeavor");

const logLevel = (process.env.ENDEAVOR_LOG_LEVEL ?? "info") as
  | "debug"
  | "info"
  | "warn"
  | "error";

const openaiApiKey = process.env.OPENAI_API_KEY;

const plugin = new EndeavorPlugin({ dataDir, logLevel, openaiApiKey });

let mcpServer: { close(): Promise<void> } | null = null;
let restApi: { close(): Promise<void> } | null = null;

async function startDaemon(): Promise<void> {
  logger.info(`Starting Endeavor MCP daemon (${endeavorVersion})`, { dataDir });

  plugin.initialize();

  // Start watchers for existing projects
  const projects = plugin.projects.list();
  for (const project of projects) {
    try {
      plugin.startWatching(project.id);
      logger.info(`Watching project: ${project.name}`, {
        projectId: project.id,
        path: project.path,
      });
    } catch (err) {
      logger.error(`Failed to start watcher for ${project.name}`, err as Error);
    }
  }

  // Start MCP server (stdio)
  const mcp = createMcpServer({ plugin, logger: logger.child("mcp") });
  mcpServer = mcp;
  await mcp.start();

  // Start REST API
  const restPort = Number(process.env.ENDEAVOR_REST_PORT ?? 31415);
  restApi = await createRestApi({
    plugin,
    logger: logger.child("rest"),
    port: restPort,
  });

  logger.info("Daemon started", {
    status: healthStatuses.healthy,
    projectCount: projects.length,
    restPort,
    embeddingsEnabled: !!openaiApiKey,
  });
}

async function shutdown(): Promise<void> {
  logger.info("Shutting down daemon...");
  if (restApi) await restApi.close();
  if (mcpServer) await mcpServer.close();
  await plugin.shutdown();
  logger.info("Daemon stopped");
}

process.on("SIGINT", () => {
  shutdown().then(() => process.exit(0));
});
process.on("SIGTERM", () => {
  shutdown().then(() => process.exit(0));
});

startDaemon().catch((err) => {
  logger.error("Fatal: daemon startup failed", err as Error);
  process.exit(1);
});
