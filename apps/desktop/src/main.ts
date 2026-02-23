import { endeavorVersion } from "@endeavor/shared-types";
import { resolve } from "node:path";
import { homedir } from "node:os";

const DEFAULT_REST_PORT = 31415;
const DEFAULT_HOST = "127.0.0.1";

interface DaemonHealthResponse {
  status: string;
  timestamp: string;
}

async function checkDaemonHealth(host: string, port: number): Promise<DaemonHealthResponse | null> {
  try {
    const res = await fetch(`http://${host}:${port}/health`);
    if (!res.ok) return null;
    return (await res.json()) as DaemonHealthResponse;
  } catch {
    return null;
  }
}

async function bootstrapDesktopApp(): Promise<void> {
  const dataDir = process.env.ENDEAVOR_DATA_DIR
    ? resolve(process.env.ENDEAVOR_DATA_DIR)
    : resolve(homedir(), ".endeavor");

  const restPort = Number(process.env.ENDEAVOR_REST_PORT ?? DEFAULT_REST_PORT);

  console.log(`[desktop] Endeavor ${endeavorVersion}`);
  console.log(`[desktop] Data directory: ${dataDir}`);
  console.log(`[desktop] Daemon expected at: http://${DEFAULT_HOST}:${restPort}`);

  const health = await checkDaemonHealth(DEFAULT_HOST, restPort);
  if (health) {
    console.log(`[desktop] Daemon is ${health.status} (${health.timestamp})`);
  } else {
    console.warn("[desktop] Daemon is not reachable. Start it with: npm run dev:daemon");
  }
}

bootstrapDesktopApp().catch((err) => {
  console.error("[desktop] Bootstrap failed:", err);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("[desktop] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[desktop] Shutting down...");
  process.exit(0);
});
