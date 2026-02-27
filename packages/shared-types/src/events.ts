export type WatcherEventType = "add" | "change" | "unlink";

export interface FileWatchEvent {
  type: WatcherEventType;
  filePath: string;
  projectId: string;
  timestamp: number;
}

export interface IndexingProgressEvent {
  projectId: string;
  filesProcessed: number;
  filesTotal: number;
  status: "running" | "complete" | "error";
}
