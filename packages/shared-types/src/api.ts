import type { Project, ProjectType, EventKind, TimelineEvent } from "./models.js";

export interface CreateProjectRequest {
  name: string;
  type: ProjectType;
  path: string;
}

export interface CreateProjectResponse {
  project: Project;
}

export interface ListProjectsResponse {
  projects: Project[];
}

export interface GetProjectResponse {
  project: Project;
}

export interface DeleteProjectResponse {
  deleted: boolean;
}

export interface ProjectStatsResponse {
  projectId: string;
  totalChunks: number;
  totalKnowledgeEntries: number;
  totalUsageLogs: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

// --- Events / Timeline ---

export interface LogEventRequest {
  projectId: string;
  tool?: string;
  kind?: EventKind;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface LogEventResponse {
  ok: boolean;
  eventId: number;
}

export interface GetTimelineRequest {
  projectId: string;
  limit?: number;
  since?: number;
}

export interface GetTimelineResponse {
  events: TimelineEvent[];
}

// --- Context ---

export interface GetContextRequest {
  projectId: string;
  query?: string;
  maxTokens?: number;
}

export interface GetContextResponse {
  context: string;
  tokens: number;
  sources: {
    files: string[];
    events: number[];
  };
}

// --- Search ---

export interface SearchRequest {
  projectId: string;
  query: string;
  limit?: number;
}

export interface SearchResult {
  type: "file" | "event";
  score: number;
  snippet: string;
  source: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

// --- Status ---

export interface StatusResponse {
  projectId: string;
  name: string;
  totalFiles: number;
  totalChunks: number;
  totalEvents: number;
  lastActivity: number | null;
}
