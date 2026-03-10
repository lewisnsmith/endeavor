import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir, platform } from "node:os";

export interface CursorMcpEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface CursorMcpConfig {
  mcpServers?: Record<string, CursorMcpEntry>;
  [key: string]: unknown;
}

export function getCursorConfigPath(): string {
  const home = homedir();
  switch (platform()) {
    case "darwin":
      return join(home, ".cursor", "mcp.json");
    case "win32":
      return join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "Cursor", "mcp.json");
    case "linux":
      return join(home, ".cursor", "mcp.json");
    default:
      return join(home, ".cursor", "mcp.json");
  }
}

export function readCursorConfig(): CursorMcpConfig | null {
  const configPath = getCursorConfigPath();
  if (!existsSync(configPath)) return null;
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as CursorMcpConfig;
  } catch {
    return null;
  }
}

export function isEndeavorConfigured(): boolean {
  const config = readCursorConfig();
  if (!config?.mcpServers) return false;
  return "endeavor" in config.mcpServers;
}

export function generateEndeavorMcpEntry(options?: {
  daemonPath?: string;
  dataDir?: string;
}): CursorMcpEntry {
  const daemonPath = options?.daemonPath ?? resolve("services/mcp-daemon/src/index.ts");
  const env: Record<string, string> = {};
  if (options?.dataDir) {
    env.ENDEAVOR_DATA_DIR = options.dataDir;
  }

  return {
    command: "npx",
    args: ["tsx", daemonPath],
    ...(Object.keys(env).length > 0 ? { env } : {}),
  };
}
