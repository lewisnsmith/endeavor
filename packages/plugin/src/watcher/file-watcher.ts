import { watch, type FSWatcher } from "chokidar";
import { statSync } from "node:fs";
import type { FileWatchEvent, WatcherEventType } from "@endeavor/shared-types";
import type { Logger } from "../logger.js";
import { buildIgnoreList, isBinaryFile } from "./ignore-patterns.js";

export type FileWatchHandler = (event: FileWatchEvent) => void;

export interface FileWatcherOptions {
  projectId: string;
  projectPath: string;
  ignoredPatterns: string[];
  logger: Logger;
  debounceMs?: number;
  maxFileSizeBytes?: number;
}

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private handlers: Set<FileWatchHandler> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private running = false;

  private readonly debounceMs: number;
  private readonly maxFileSizeBytes: number;
  private readonly logger: Logger;

  constructor(private options: FileWatcherOptions) {
    this.debounceMs = options.debounceMs ?? 300;
    this.maxFileSizeBytes = options.maxFileSizeBytes ?? 1_048_576;
    this.logger = options.logger.child("watcher");
  }

  start(): void {
    if (this.running) {
      this.logger.warn("Watcher already running", { projectId: this.options.projectId });
      return;
    }

    const ignored = buildIgnoreList(this.options.ignoredPatterns);

    this.watcher = watch(this.options.projectPath, {
      ignored,
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    this.watcher.on("add", (path) => this.handleRawEvent("add", path));
    this.watcher.on("change", (path) => this.handleRawEvent("change", path));
    this.watcher.on("unlink", (path) => this.handleRawEvent("unlink", path));
    this.watcher.on("error", (err) => {
      this.logger.error("Watcher error", err as Error, { projectId: this.options.projectId });
    });

    this.running = true;
    this.logger.info("Watcher started", {
      projectId: this.options.projectId,
      path: this.options.projectPath,
    });
  }

  async stop(): Promise<void> {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.running = false;
    this.logger.info("Watcher stopped", { projectId: this.options.projectId });
  }

  onFileEvent(handler: FileWatchHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  isRunning(): boolean {
    return this.running;
  }

  private handleRawEvent(type: WatcherEventType, filePath: string): void {
    if (isBinaryFile(filePath)) return;

    if (type !== "unlink" && !this.shouldProcess(filePath)) return;

    const existing = this.debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      const event: FileWatchEvent = {
        type,
        filePath,
        projectId: this.options.projectId,
        timestamp: Date.now(),
      };

      for (const handler of this.handlers) {
        try {
          handler(event);
        } catch (err) {
          this.logger.error("Handler error", err as Error, { filePath, type });
        }
      }
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  private shouldProcess(filePath: string): boolean {
    try {
      const stats = statSync(filePath);
      if (stats.size > this.maxFileSizeBytes) {
        this.logger.debug("Skipping large file", {
          filePath,
          size: stats.size,
          maxSize: this.maxFileSizeBytes,
        });
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}
