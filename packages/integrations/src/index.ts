export {
  getClaudeDesktopConfigPath,
  readClaudeDesktopConfig,
  isEndeavorConfigured as isClaudeDesktopConfigured,
  generateEndeavorMcpEntry as generateClaudeDesktopMcpEntry,
} from "./claude-desktop.js";
export type { ClaudeDesktopConfig, ClaudeDesktopMcpEntry } from "./claude-desktop.js";

export {
  getCursorConfigPath,
  readCursorConfig,
  isEndeavorConfigured as isCursorConfigured,
  generateEndeavorMcpEntry as generateCursorMcpEntry,
} from "./cursor.js";
export type { CursorMcpConfig, CursorMcpEntry } from "./cursor.js";

import { isEndeavorConfigured as checkClaude } from "./claude-desktop.js";
import { isEndeavorConfigured as checkCursor } from "./cursor.js";

export interface IntegrationStatus {
  tool: "claude-desktop" | "cursor";
  configured: boolean;
}

export function listIntegrationStatuses(): IntegrationStatus[] {
  return [
    { tool: "claude-desktop", configured: checkClaude() },
    { tool: "cursor", configured: checkCursor() },
  ];
}
