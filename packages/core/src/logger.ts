export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  correlationId?: string;
  data?: Record<string, unknown>;
  error?: { message: string; stack?: string };
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, err?: Error, data?: Record<string, unknown>): void;
  child(component: string, correlationId?: string): Logger;
}

export function createLogger(
  component: string,
  options?: { level?: LogLevel; correlationId?: string },
): Logger {
  const minLevel = LOG_LEVELS[options?.level ?? 'info'];
  const corrId = options?.correlationId;

  function emit(level: LogLevel, message: string, data?: Record<string, unknown>, err?: Error): void {
    if (LOG_LEVELS[level] < minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
    };

    if (corrId) entry.correlationId = corrId;
    if (data && Object.keys(data).length > 0) entry.data = data;
    if (err) {
      entry.error = { message: err.message, stack: err.stack };
    }

    process.stderr.write(JSON.stringify(entry) + '\n');
  }

  return {
    debug(message, data) {
      emit('debug', message, data);
    },
    info(message, data) {
      emit('info', message, data);
    },
    warn(message, data) {
      emit('warn', message, data);
    },
    error(message, err?, data?) {
      emit('error', message, data, err);
    },
    child(childComponent, childCorrelationId?) {
      return createLogger(`${component}:${childComponent}`, {
        level: options?.level,
        correlationId: childCorrelationId ?? corrId,
      });
    },
  };
}
