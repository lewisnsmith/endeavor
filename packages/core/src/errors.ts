export enum ErrorCode {
  DB_INIT_FAILED = 'DB_INIT_FAILED',
  DB_CORRUPT = 'DB_CORRUPT',
  DB_FULL = 'DB_FULL',
  MIGRATION_FAILED = 'MIGRATION_FAILED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_INVALID_STATE = 'SESSION_INVALID_STATE',
  SPAWN_FAILED = 'SPAWN_FAILED',
  ADAPTER_ERROR = 'ADAPTER_ERROR',
  ADAPTER_DUPLICATE = 'ADAPTER_DUPLICATE',
}

export class EndeavorError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EndeavorError';
  }
}
