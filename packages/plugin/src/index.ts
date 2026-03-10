// Storage
export {
  EndeavorDatabase,
  ProjectRepository,
  KnowledgeRepository,
  FileChunkRepository,
  UsageLogRepository,
  ToolRepository,
  ConfigStore,
  EventRepository,
} from "./storage/index.js";
export type { DatabaseOptions } from "./storage/index.js";

// Watcher
export { FileWatcher, buildIgnoreList, isBinaryFile } from "./watcher/index.js";
export type { FileWatchHandler, FileWatcherOptions } from "./watcher/index.js";

// Chunker
export { chunkFile, countTokens, generateChunkId } from "./chunker/index.js";
export type { ChunkerOptions, ChunkInput } from "./chunker/index.js";

// Embeddings
export { OpenAIEmbeddingProvider, cosineSimilarity, searchByEmbedding, embeddingToBuffer, bufferToEmbedding } from "./embeddings/index.js";
export type { EmbeddingProvider, OpenAIProviderOptions, VectorCandidate, VectorSearchResult } from "./embeddings/index.js";

// Context
export { buildContext } from "./context/index.js";
export type { ContextBuildOptions, ContextResult } from "./context/index.js";

// Server
export { createMcpServer } from "./server/index.js";
export type { McpServerOptions } from "./server/index.js";
export { handleSearch } from "./server/actions/search.js";
export type { SearchActionParams } from "./server/actions/search.js";
export { SessionTracker } from "./server/session-tracker.js";
export { classifyToolCall } from "./server/classifier.js";
export type { ClassifyInput } from "./server/classifier.js";

// CLI (stub)
export { handleCliCommand } from "./cli/index.js";

// Logger
export { createLogger } from "./logger.js";
export type { Logger, LogEntry } from "./logger.js";

// --- Plugin Orchestrator ---

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FileWatchEvent, EndeavorConfig, ToolCallRecord } from "@endeavor/shared-types";
import { EndeavorDatabase } from "./storage/database.js";
import { ProjectRepository } from "./storage/project-repository.js";
import { KnowledgeRepository } from "./storage/knowledge-repository.js";
import { FileChunkRepository } from "./storage/file-chunk-repository.js";
import { UsageLogRepository } from "./storage/usage-log-repository.js";
import { ToolRepository } from "./storage/tool-repository.js";
import { ConfigStore } from "./storage/config-store.js";
import { EventRepository } from "./storage/event-repository.js";
import { FileWatcher } from "./watcher/file-watcher.js";
import { chunkFile } from "./chunker/chunker.js";
import { createLogger } from "./logger.js";
import type { Logger } from "./logger.js";
import type { LogLevel } from "@endeavor/shared-types";
import type { EmbeddingProvider } from "./embeddings/types.js";
import { OpenAIEmbeddingProvider } from "./embeddings/openai-provider.js";
import { embeddingToBuffer } from "./embeddings/serialize.js";

export interface PluginOptions {
  dataDir: string;
  logLevel?: LogLevel;
  openaiApiKey?: string;
}

export class EndeavorPlugin {
  readonly db: EndeavorDatabase;
  readonly projects: ProjectRepository;
  readonly knowledge: KnowledgeRepository;
  readonly fileChunks: FileChunkRepository;
  readonly usageLogs: UsageLogRepository;
  readonly tools: ToolRepository;
  readonly config: ConfigStore;
  readonly events: EventRepository;
  readonly logger: Logger;
  readonly embeddingProvider: EmbeddingProvider | null;

  private watchers: Map<string, FileWatcher> = new Map();
  private pluginConfig: EndeavorConfig | null = null;
  private _recentToolCalls: ToolCallRecord[] = [];

  private static MAX_RECENT_CALLS = 100;

  constructor(private options: PluginOptions) {
    this.logger = createLogger("endeavor", { level: options.logLevel });
    const dbPath = resolve(options.dataDir, "endeavor.db");

    this.db = new EndeavorDatabase({ dbPath, logger: this.logger });

    // These will be usable after initialize()
    this.projects = null!;
    this.knowledge = null!;
    this.fileChunks = null!;
    this.usageLogs = null!;
    this.tools = null!;
    this.config = null!;
    this.events = null!;

    // Embedding provider is optional — works without OpenAI key
    if (options.openaiApiKey) {
      try {
        this.embeddingProvider = new OpenAIEmbeddingProvider({ apiKey: options.openaiApiKey });
      } catch {
        this.embeddingProvider = null;
      }
    } else {
      this.embeddingProvider = null;
    }
  }

  initialize(): void {
    this.db.initialize();
    const db = this.db.getDb();

    // Wire up repositories — reassign readonly fields via cast
    (this as { projects: ProjectRepository }).projects = new ProjectRepository(db);
    (this as { knowledge: KnowledgeRepository }).knowledge = new KnowledgeRepository(db);
    (this as { fileChunks: FileChunkRepository }).fileChunks = new FileChunkRepository(db);
    (this as { usageLogs: UsageLogRepository }).usageLogs = new UsageLogRepository(db);
    (this as { tools: ToolRepository }).tools = new ToolRepository(db);
    (this as { config: ConfigStore }).config = new ConfigStore(db);
    (this as { events: EventRepository }).events = new EventRepository(db);

    this.pluginConfig = this.config.getAll();
    this.logger.info("Plugin initialized", { dataDir: this.options.dataDir });
  }

  pushToolCall(record: ToolCallRecord): void {
    this._recentToolCalls.push(record);
    if (this._recentToolCalls.length > EndeavorPlugin.MAX_RECENT_CALLS) {
      this._recentToolCalls = this._recentToolCalls.slice(-EndeavorPlugin.MAX_RECENT_CALLS);
    }
  }

  getRecentToolCalls(withinMs: number): ToolCallRecord[] {
    const cutoff = Date.now() - withinMs;
    return this._recentToolCalls.filter((c) => c.timestamp >= cutoff);
  }

  startWatching(projectId: string): void {
    if (this.watchers.has(projectId)) {
      this.logger.warn("Already watching project", { projectId });
      return;
    }

    const project = this.projects.getById(projectId);
    if (!project) {
      this.logger.error("Cannot watch: project not found", undefined, { projectId });
      return;
    }

    const cfg = this.pluginConfig ?? this.config.getAll();

    const watcher = new FileWatcher({
      projectId,
      projectPath: project.path,
      ignoredPatterns: cfg.ignoredPatterns,
      logger: this.logger,
      maxFileSizeBytes: cfg.maxFileSizeBytes,
    });

    watcher.onFileEvent((event) => {
      this.handleFileEvent(event, cfg).catch((err) => {
        this.logger.error("Async file event handler failed", err as Error, {
          filePath: event.filePath,
        });
      });
    });
    watcher.start();
    this.watchers.set(projectId, watcher);
  }

  async stopWatching(projectId: string): Promise<void> {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      await watcher.stop();
      this.watchers.delete(projectId);
    }
  }

  async shutdown(): Promise<void> {
    const stopPromises = [...this.watchers.keys()].map((id) => this.stopWatching(id));
    await Promise.all(stopPromises);
    this.db.close();
    this.logger.info("Plugin shut down");
  }

  private async handleFileEvent(event: FileWatchEvent, cfg: EndeavorConfig): Promise<void> {
    if (event.type === "unlink") {
      const deleted = this.fileChunks.deleteByFilePath(event.projectId, event.filePath);
      this.logger.debug("Removed chunks for deleted file", {
        filePath: event.filePath,
        chunksDeleted: deleted,
      });
      return;
    }

    // add or change — read file and chunk it
    try {
      const content = readFileSync(event.filePath, "utf-8");
      const chunks = chunkFile(
        {
          projectId: event.projectId,
          filePath: event.filePath,
          content,
          lastModified: event.timestamp,
        },
        {
          maxTokensPerChunk: cfg.chunkMaxTokens,
          overlapTokens: cfg.chunkOverlapTokens,
        },
      );

      // Generate embeddings if provider is available
      if (this.embeddingProvider && chunks.length > 0) {
        try {
          const texts = chunks.map((c) => c.content);
          const embeddings = await this.embeddingProvider.embed(texts);
          for (let i = 0; i < chunks.length; i++) {
            chunks[i].embedding = embeddingToBuffer(embeddings[i]);
          }
          this.logger.debug("Generated embeddings", {
            filePath: event.filePath,
            count: embeddings.length,
          });
        } catch (embErr) {
          this.logger.warn("Failed to generate embeddings, storing chunks without them", {
            filePath: event.filePath,
            error: (embErr as Error).message,
          });
        }
      }

      if (chunks.length > 0) {
        const chunkIds = chunks.map((c) => c.id);
        this.fileChunks.upsertMany(chunks);
        this.fileChunks.deleteStaleChunks(event.projectId, event.filePath, chunkIds);
      }

      this.logger.debug("Indexed file", {
        filePath: event.filePath,
        chunks: chunks.length,
      });

      // Correlate file changes with recent tool calls
      const correlated = this.getRecentToolCalls(60_000).find(
        (call) => call.projectId === event.projectId,
      );
      if (correlated) {
        this.events.create({
          projectId: event.projectId,
          tool: "file-watcher",
          kind: "iteration",
          summary: `File changed: ${event.filePath}`,
          metadata: {
            filePath: event.filePath,
            correlatedToolCallId: correlated.id,
            correlatedAction: correlated.action,
          },
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      this.logger.error("Failed to index file", err as Error, {
        filePath: event.filePath,
      });
    }
  }
}
