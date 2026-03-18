export type SessionSource = 'launched' | 'observed' | 'api' | 'cloud';

export type SessionStatus =
  | 'active'
  | 'waiting_input'
  | 'waiting_approval'
  | 'error'
  | 'completed'
  | 'dead';

export interface SessionSnapshot {
  id: string;
  source: SessionSource;
  status: SessionStatus;
  claudeSessionId: string | null;
  pid: number | null;
  label: string;
  cwd: string;
  branch: string | null;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  model: string | null;
  lastOutputAt: string | null;
  startedAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface SpawnOpts {
  cwd: string;
  label?: string;
  initialPrompt?: string;
  resumeSessionId?: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: SessionEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type SessionEventType =
  | 'status_change'
  | 'prompt'
  | 'response'
  | 'error'
  | 'cost_tick'
  | 'tool_use';

export type Unsubscribe = () => void;

/** Idle threshold: session is "idle" if no output for this many ms */
export const IDLE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/** Color thresholds for tile display */
export const ACTIVE_OUTPUT_THRESHOLD_MS = 10 * 1000; // 10 seconds
