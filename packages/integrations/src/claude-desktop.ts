import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir, platform } from "node:os";

export interface ClaudeDesktopMcpEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface ClaudeDesktopConfig {
  mcpServers?: Record<string, ClaudeDesktopMcpEntry>;
  [key: string]: unknown;
}

export function getClaudeDesktopConfigPath(): string {
  const home = homedir();
  switch (platform()) {
    case "darwin":
      return join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
    case "win32":
      return join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "Claude", "claude_desktop_config.json");
    case "linux":
      return join(home, ".config", "claude", "claude_desktop_config.json");
    default:
      return join(home, ".config", "claude", "claude_desktop_config.json");
  }
}

export function readClaudeDesktopConfig(): ClaudeDesktopConfig | null {
  const configPath = getClaudeDesktopConfigPath();
  if (!existsSync(configPath)) return null;
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as ClaudeDesktopConfig;
  } catch {
    return null;
  }
}

export function isEndeavorConfigured(): boolean {
  const config = readClaudeDesktopConfig();
  if (!config?.mcpServers) return false;
  return "endeavor" in config.mcpServers;
}

export function generateEndeavorMcpEntry(options?: {
  daemonPath?: string;
  dataDir?: string;
}): ClaudeDesktopMcpEntry {
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
