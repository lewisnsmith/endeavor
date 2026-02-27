export type ProjectType = "research" | "software" | "hardware" | "general";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  path: string;
  createdAt: number;
  updatedAt: number;
}

export type KnowledgeEntryType =
  | "decision"
  | "finding"
  | "error"
  | "hypothesis"
  | "requirement"
  | "reference"
  | "task"
  | "file";

export interface KnowledgeEntry {
  id: string;
  projectId: string;
  type: KnowledgeEntryType;
  content: string;
  tags: string[];
  createdBy: string;
  timestamp: number;
  embedding?: Buffer;
}

export interface FileChunk {
  id: string;
  projectId: string;
  filePath: string;
  content: string;
  tokens: number;
  embedding?: Buffer;
  lastModified: number;
}

export interface UsageLog {
  id?: number;
  projectId: string | null;
  tool: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  timestamp: number;
}

export type EventKind = "prompt" | "response" | "decision" | "note" | "error" | "task" | "custom" | "iteration" | "finding";

export interface ToolCallRecord {
  id: string;
  action: string;
  projectId: string | null;
  args: Record<string, unknown>;
  responseSummary: string;
  timestamp: number;
  sessionId: string;
}

export interface TimelineEvent {
  id: number;
  projectId: string;
  tool: string;
  kind: EventKind;
  summary: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export type ToolType = "mcp" | "api" | "custom";

export interface Tool {
  id: string;
  name: string;
  type: ToolType | null;
  configPath: string | null;
  enabled: boolean;
  lastHealthCheck: number | null;
}
