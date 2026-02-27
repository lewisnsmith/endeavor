export enum EndeavorErrorCode {
  // Storage
  DB_INIT_FAILED = "DB_INIT_FAILED",
  DB_QUERY_FAILED = "DB_QUERY_FAILED",
  MIGRATION_FAILED = "MIGRATION_FAILED",

  // Project
  PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND",
  PROJECT_PATH_NOT_FOUND = "PROJECT_PATH_NOT_FOUND",
  PROJECT_PATH_DUPLICATE = "PROJECT_PATH_DUPLICATE",
  PROJECT_INVALID_INPUT = "PROJECT_INVALID_INPUT",

  // Watcher
  WATCHER_START_FAILED = "WATCHER_START_FAILED",
  WATCHER_ALREADY_RUNNING = "WATCHER_ALREADY_RUNNING",

  // Config
  CONFIG_INVALID = "CONFIG_INVALID",
  CONFIG_WRITE_FAILED = "CONFIG_WRITE_FAILED",

  // Chunking
  CHUNK_PARSE_FAILED = "CHUNK_PARSE_FAILED",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  FILE_READ_FAILED = "FILE_READ_FAILED",
}

export class EndeavorError extends Error {
  constructor(
    public readonly code: EndeavorErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "EndeavorError";
  }
}
