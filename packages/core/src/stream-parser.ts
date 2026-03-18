import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';

export interface StreamParserOptions {
  maxLineLength?: number;
}

type EventCallback = (event: Record<string, unknown>) => void;
type ErrorCallback = (error: { line: string; error: Error }) => void;

export class StreamJsonParser {
  private eventCallbacks: EventCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private donePromise: Promise<void>;
  private maxLineLength: number;

  constructor(stream: Readable, options?: StreamParserOptions) {
    this.maxLineLength = options?.maxLineLength ?? 1024 * 1024;

    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    this.donePromise = new Promise<void>((resolve) => {
      rl.on('line', (line: string) => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return;

        if (trimmed.length > this.maxLineLength) {
          const err = new Error(`Line exceeds max length (${trimmed.length} > ${this.maxLineLength})`);
          for (const cb of this.errorCallbacks) cb({ line: trimmed.slice(0, 200) + '...', error: err });
          return;
        }

        try {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>;
          for (const cb of this.eventCallbacks) cb(parsed);
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e));
          for (const cb of this.errorCallbacks) cb({ line: trimmed.slice(0, 200), error: err });
        }
      });

      rl.on('close', resolve);
    });
  }

  onEvent(cb: EventCallback): void {
    this.eventCallbacks.push(cb);
  }

  onParseError(cb: ErrorCallback): void {
    this.errorCallbacks.push(cb);
  }

  done(): Promise<void> {
    return this.donePromise;
  }
}
