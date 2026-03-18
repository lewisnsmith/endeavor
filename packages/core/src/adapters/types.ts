import type { SessionSnapshot, SessionEvent, SpawnOpts, Unsubscribe } from '../types.js';

export interface AdapterCapabilities {
  canSpawn: boolean;
  canKill: boolean;
  canSendInput: boolean;
  canStreamOutput: boolean;
  canTrackCost: boolean;
}

export interface SessionAdapter {
  readonly source: string;
  readonly capabilities: AdapterCapabilities;

  discover(): Promise<SessionSnapshot[]>;
  spawn?(opts: SpawnOpts): Promise<SessionSnapshot>;
  kill?(sessionId: string): Promise<void>;
  sendInput?(sessionId: string, input: string): Promise<void>;
  onEvent?(sessionId: string, cb: (event: SessionEvent) => void): Unsubscribe;
  dispose?(): void;
}
