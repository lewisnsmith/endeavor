import {
  type HealthStatus,
  endeavorVersion,
  healthStatuses
} from "@endeavor/shared-types";

function startDaemon(): HealthStatus {
  console.log(`[daemon] Starting Endeavor MCP daemon (${endeavorVersion})`);
  return healthStatuses.healthy;
}

const status = startDaemon();
console.log(`[daemon] Health status: ${status}`);

