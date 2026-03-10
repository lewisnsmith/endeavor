import { randomUUID } from "node:crypto";
import type { ToolCallRecord } from "@endeavor/shared-types";

export class SessionTracker {
  readonly sessionId: string;
  readonly startedAt: number;

  private _headerInjected = false;
  private _calls: ToolCallRecord[] = [];

  constructor() {
    this.sessionId = randomUUID();
    this.startedAt = Date.now();
  }

  get headerInjected(): boolean {
    return this._headerInjected;
  }

  markHeaderInjected(): void {
    this._headerInjected = true;
  }

  recordCall(record: ToolCallRecord): void {
    this._calls.push(record);
  }

  getRecentCalls(withinMs: number): ToolCallRecord[] {
    const cutoff = Date.now() - withinMs;
    return this._calls.filter((c) => c.timestamp >= cutoff);
  }

  get callCount(): number {
    return this._calls.length;
  }
}
