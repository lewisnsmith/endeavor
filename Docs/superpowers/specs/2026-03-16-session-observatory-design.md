# Endeavor v0.3: Session Observatory & Multiplexer

## Overview

Endeavor pivots from a coordination layer (work items, decisions, handoffs) to a **Claude session multiplexer and observatory**. A TUI that shows all Claude sessions as a grid of color-coded tiles, sorted by attention priority. You can spawn new sessions, observe existing ones, and interact with spawned sessions directly from the TUI.

## Architecture

Three layers:

```
┌─────────────────────────────────────────────┐
│                TUI (Ink)                     │
│  Grid dashboard + focused session view       │
├─────────────────────────────────────────────┤
│             Session Manager                  │
│  ┌────────────────┐  ┌───────────┐  ┌──────┐│
│  │ Launcher        │  │ Observer  │  │Future││
│  │ (child_process) │  │ (polling) │  │      ││
│  └────────────────┘  └───────────┘  └──────┘│
├─────────────────────────────────────────────┤
│              Data Layer                      │
│  SQLite: sessions, events                    │
└─────────────────────────────────────────────┘
```

- **Launcher** — Spawns Claude Code as a child process using `child_process.spawn()` with `--print --output-format stream-json`. Communicates via stdin/stdout JSON streams. No PTY or native dependencies needed. Lives in core alongside the session manager.
- **Observer** — Discovers existing Claude Code sessions by scanning process list and `~/.claude/` state. Read-only polling every 2s. Runs in-process within the TUI.
- **Adapter (future)** — Plugin interface for API sessions, cloud sessions. Same `Session` interface, different data source.
- **Session Manager** — Lives in core. Unifies all adapters behind a single abstraction so the TUI is source-agnostic.

## Spawn Strategy: Bidirectional JSON Streams

This is the central technical decision. Claude Code supports a programmatic mode:

```bash
claude --print --output-format stream-json --input-format stream-json
```

- `--print` — non-interactive pipe mode (no terminal UI rendered)
- `--output-format stream-json` — structured JSON events on stdout (one per line)
- `--input-format stream-json` — accepts JSON messages on stdin

This gives us a **fully programmatic bidirectional protocol** over stdin/stdout. No PTY allocation needed, no ANSI parsing, no native `node-pty` dependency. Plain `child_process.spawn()` suffices.

### Output stream (stdout)

Each line is a JSON object. Expected event types:

```jsonl
{"type":"assistant","message":{"content":[{"type":"text","text":"I'll help..."}],"usage":{"input_tokens":150,"output_tokens":42}}}
{"type":"tool_use","name":"Read","input":{"file_path":"/foo/bar.ts"}}
{"type":"tool_result","output":"file contents..."}
{"type":"result","text":"Done!","cost":0.042,"duration_ms":12000,"session_id":"..."}
```

### Input stream (stdin)

Messages sent as JSON lines:

```jsonl
{"type":"user","message":"Which auth library should we use?"}
```

### Multi-turn conversations

Each `claude --print` invocation is a single turn by default. For multi-turn conversations, we use the `--resume` flag with a session ID from the previous turn's result, or use `--conversation` mode if available. The launcher manages this: when the user sends input from the TUI, the launcher starts a new `claude --print --resume <session-id>` process with the user's message.

**Important:** This means a "session" from Endeavor's perspective may span multiple OS processes (one per turn). The `pid` column tracks the currently-running process. Between turns, `pid` is null and status is `waiting_input`.

### Why not node-pty?

`node-pty` allocates a pseudo-terminal, which is needed for programs that render ANSI terminal UI. In `--print --output-format stream-json` mode, Claude Code emits structured JSON — no terminal rendering occurs. Using `child_process.spawn()` is simpler, has no native compilation step, and works reliably across platforms.

## Data Model

Two tables replace the current six. The old v0.2 database is incompatible — Endeavor v0.3 creates a fresh `.endeavor/endeavor.db` and ignores any existing v0.2 schema (the old DB will be backed up to `.endeavor/endeavor.v2.db` on first run if it exists).

### sessions

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | `s_` prefixed nanoid |
| source | TEXT | `'launched'` \| `'observed'` \| `'api'` \| `'cloud'` |
| status | TEXT | `'active'` \| `'waiting_input'` \| `'waiting_approval'` \| `'error'` \| `'completed'` \| `'dead'` |
| claude_session_id | TEXT | Claude Code's own session ID for `--resume` (nullable) |
| pid | INTEGER | OS process ID of current turn (nullable — null between turns) |
| label | TEXT | User-assigned name or auto-generated |
| cwd | TEXT | Working directory |
| branch | TEXT | Git branch (nullable) |
| input_tokens | INTEGER | Cumulative input tokens (default 0) |
| output_tokens | INTEGER | Cumulative output tokens (default 0) |
| total_cost_usd | REAL | Cumulative cost in USD (default 0) |
| model | TEXT | Model identifier (nullable) |
| last_output_at | TEXT | ISO timestamp of last output event (nullable, for idle detection) |
| started_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |
| metadata | TEXT | JSON blob for source-specific extras |

### session_events

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | `se_` prefixed nanoid |
| session_id | TEXT FK | References sessions.id |
| type | TEXT | `'status_change'` \| `'prompt'` \| `'response'` \| `'error'` \| `'cost_tick'` \| `'tool_use'` |
| payload | TEXT | JSON (prompt text, error message, cost delta, etc.) |
| created_at | TEXT | ISO timestamp |

**Note:** Metrics (tokens, cost, model) are columns on `sessions` rather than a separate table, since there's a 1:1 relationship. `session_events` with `type: 'cost_tick'` provides the historical delta log if needed.

## Session Lifecycle

### State Machine

```
     ╔═══════════════════════════════════════════════════════════╗
     ║  GLOBAL: Process termination can occur from ANY state.   ║
     ║  exit(0) → completed    exit(non-zero) → dead            ║
     ║  Between turns (no running process): pid = null           ║
     ╚═══════════════════════════════════════════════════════════╝

                              ┌──────────────┐
              spawn/          │              │
            discover ────────►│    active    │
                              │              │
                              └──┬───────┬───┘
                                 │       │
                no output for    │       │  Claude asks
                2min (display    │       │  question / needs
                only, not a      │       │  permission
                DB status)       │       │
                                 │       ├────────────────────┐
                  ┌──────────────┤       │                    │
                  │  "idle"      │       ▼                    ▼
                  │  (computed)  │  ┌──────────────┐  ┌──────────────────┐
                  └──────────────┘  │   waiting_   │  │    waiting_      │
                                    │    input     │  │    approval      │
                                    └──────┬───────┘  └──────┬───────────┘
                                           │                 │
                                    user   │          user   │
                                    types  │          approves│
                                           ▼                 ▼
                                    ┌──────────────┐  ┌──────────────┐
                                    │    active    │  │    active    │
                                    │  (new turn)  │  │  (continues) │
                                    └──────────────┘  └──────────────┘

                              On error event from stream:
                              any state ──────────► error
                              error + recovery ───► active
```

**Key design decisions:**
- `idle` is **not** a DB status. It's computed at display time by checking `last_output_at` against a 2-minute threshold. This avoids a polling loop just to flip a status flag.
- `waiting_input` and `waiting_approval` are **separate DB statuses** with distinct transitions. `waiting_approval` specifically means Claude is requesting tool/permission approval, which is a higher-priority attention signal.
- **Process termination is a global transition** — any status can move to `completed` (exit 0) or `dead` (exit non-zero) when the child process exits. This is handled by the process exit handler, not the state machine.
- Between conversation turns, `pid` is null and status is `waiting_input`. The session is alive but no OS process is running.

### Launched Sessions

1. User presses `N` in TUI → prompted for cwd + label
2. Claude Code spawned via `child_process.spawn('claude', ['--print', '--output-format', 'stream-json'])` with initial prompt on stdin
3. Session created in DB (status: `active`)
4. Structured JSON output parsed line by line from stdout (see Spawn Strategy)
5. Status updated as events arrive
6. On process exit: if turn completed normally, status → `waiting_input` (ready for next user message). If process errors, status → `error` or `dead`.
7. User sends follow-up → new `claude --print --resume <claude_session_id>` process spawned with user's message

### Observed Sessions

1. Observer polls every 2s
2. Lists running `claude` processes via `ps -eo pid,command` and filters for Claude Code processes
3. For each discovered PID, extracts the working directory from `/proc/<pid>/cwd` (Linux) or `lsof -a -d cwd -Fn -p <pid>` (macOS — the `-Fn` flag gives machine-parseable output, `-a -d cwd` restricts to just the cwd entry). To avoid performance issues, all PIDs are batched into a single `lsof` call rather than one per process.
4. Cross-references with known sessions in DB to avoid duplicates
5. New process found → inserted as `source: 'observed'`
6. Process gone → marked `dead` or `completed`
7. **Available data from observation:** pid, cwd (from process info), branch (inferred via `git rev-parse --abbrev-ref HEAD` against cwd)
8. **Not available from observation:** token counts, conversation stream, cost, current activity, whether it's waiting for input. These fields remain null/zero.
9. Tiles display an "observed" badge to make the limitation clear

**Deduplication:** Launched sessions track their `pid`. If the observer discovers a process that matches a launched session's PID, it skips it. Sessions spawned by Endeavor are never double-counted.

**Risk:** The observer's process-discovery approach is best-effort. Claude Code's process name/arguments may change between versions. The observer should match conservatively (e.g., process name contains `claude`) and fail gracefully if discovery breaks.

**Note on `~/.claude/` state files:** The internal structure of `~/.claude/` is undocumented and may change. Rather than relying on file parsing, the observer primarily uses process-level discovery (PID + cwd). If future Claude Code versions expose a stable session state API, the observer can be upgraded to use it.

### Session Persistence

Spawned sessions use `--print` mode, which by default persists session state to `~/.claude/`. This is intentional:
- If the TUI crashes and restarts, the observer can discover the still-running Claude processes.
- To resume a conversation, the launcher needs the `claude_session_id` which is stored in Endeavor's DB, not dependent on `~/.claude/` files.
- Endeavor-spawned sessions appear in `~/.claude/` but the observer skips them (dedup by PID). No double-counting.

## TUI Design

### Dashboard Mode (default)

Grid of session tiles, auto-arranged to fit terminal width.

**Minimum terminal size:** 80x24. Below this, the TUI shows a single-column list instead of a grid.

**Tile sizing:** Each tile is 30 chars wide x 6 lines tall. Tiles reflow as terminal resizes (SIGWINCH). When sessions exceed available screen space, the grid scrolls vertically with the cursor position kept visible.

**Tile contents:** status badge, label, current activity snippet, branch, cost, duration.

**Color coding:**
- Red — needs attention (`waiting_input`, `waiting_approval`, `error`)
- Yellow — `active` with no output in last 10 seconds (working, no visible progress)
- Green — `active` with output in last 10 seconds (visibly working)
- Grey — idle (no output for 2+ min), `completed`, `dead`

**Sort order (attention priority):** `waiting_input` > `waiting_approval` > `error` > `active` > idle > `completed` > `dead`

**Top bar:** aggregate stats — active count, waiting count, total cost across all sessions.

**Bottom bar:** keybindings.

### Focus Mode (Enter on a tile)

For **launched sessions**, focus mode renders a **formatted conversation view** built from the stream-json events:

- Assistant messages displayed as formatted text (markdown rendered to terminal)
- Tool use events shown as collapsible blocks (tool name + summary)
- User messages shown inline
- Input bar at bottom for typing the next message
- Token/cost counter in the header

This is not raw terminal output — it's a purpose-built conversation renderer that reads from `session_events` and the live stdout stream. The TUI owns the presentation, which means it can style, truncate, and paginate freely.

For **observed sessions**, focus mode shows available metadata (status, cwd, branch, event log) but no conversation view or input bar.

### Key Bindings

| Key | Action |
|-----|--------|
| Arrow keys / `hjkl` | Navigate tiles |
| `Enter` | Focus session |
| `ESC` | Back to dashboard |
| `N` | New session (prompt for cwd + label) |
| `K` | Kill session (with confirmation) |
| `Q` | Quit Endeavor (see below) |
| `Tab` | Cycle through waiting-for-input sessions |
| `/` | Filter/search sessions |

### Quit Behavior

When the user presses `Q`:
- Any currently-running Claude child processes (mid-turn) continue running detached.
- Sessions in `waiting_input` state have no running process — they're just DB records.
- On restart, Endeavor reads its DB to restore session state. Sessions that were `waiting_input` can be resumed normally (the launcher spawns a new `claude --print --resume` process). Sessions that were `active` (mid-turn) when the TUI quit will have their process discovered by the observer (observe-only) or will have already exited.
- **Key benefit:** because multi-turn works via `--resume` with a session ID stored in the DB, most sessions can be fully re-attached on TUI restart. Only sessions that were mid-turn at quit time lose interactivity.

## Core Type Definitions

```typescript
interface SessionSnapshot {
  id: string;
  source: 'launched' | 'observed' | 'api' | 'cloud';
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

type SessionStatus = 'active' | 'waiting_input' | 'waiting_approval' | 'error' | 'completed' | 'dead';

interface SpawnOpts {
  cwd: string;
  label?: string;
  initialPrompt?: string;   // first message to send after spawn
  resumeSessionId?: string; // claude_session_id for continuing a conversation
}

interface SessionEvent {
  id: string;
  sessionId: string;
  type: 'status_change' | 'prompt' | 'response' | 'error' | 'cost_tick' | 'tool_use';
  payload: Record<string, unknown>;
  createdAt: string;
}

type Unsubscribe = () => void;
```

## Adapter Interface

```typescript
interface SessionAdapter {
  readonly source: string;

  discover(): Promise<SessionSnapshot[]>;

  spawn?(opts: SpawnOpts): Promise<SessionSnapshot>;
  kill?(sessionId: string): Promise<void>;
  /**
   * Send user input to a session. Rules:
   * - MUST reject if session status is not 'waiting_input'. Input while 'active' is not queued.
   * - On success: spawns a new claude --print --resume process, transitions to 'active'.
   * - On spawn failure: transitions session to 'error' with descriptive event, never leaves
   *   the session in a limbo state.
   */
  sendInput?(sessionId: string, input: string): Promise<void>;

  onEvent?(sessionId: string, cb: (event: SessionEvent) => void): Unsubscribe;

  capabilities: {
    canSpawn: boolean;
    canKill: boolean;
    canSendInput: boolean;
    canStreamOutput: boolean;
    canTrackCost: boolean;
  };
}
```

The TUI reads `capabilities` to decide what to render per tile. No input bar for observed sessions. No cost display for adapters that can't track cost. Tiles gracefully degrade based on available data.

**Day 1 adapters:**
- `LauncherAdapter` — full capabilities via child_process.spawn + stream-json
- `ObserverAdapter` — `discover()` only, via process list scanning

**Future adapters (same interface):**
- `ApiAdapter` — Anthropic usage API
- `CloudAdapter` — claude.ai session API (when available)

Registration:
```typescript
const manager = new SessionManager(db);
manager.register(new LauncherAdapter());
manager.register(new ObserverAdapter());
```

## Package Structure

```
packages/
  core/     Session manager, data layer, adapter interface, state machine, launcher adapter
  tui/      Ink-based terminal UI + observer adapter (new, replaces cli/)
```

Two packages, not three. The launcher adapter lives in core because there's no longer a native dependency to isolate — `child_process.spawn()` is built into Node.js. The `daemon/` and `cli/` packages are removed.

### Dependency changes

| Package | Add | Remove |
|---------|-----|--------|
| `tui` | `ink`, `react`, `ink-text-input` | — |
| `core` | — | current operations, 6-table model |
| `cli` | — | **entire package removed** |
| `daemon` | — | **entire package removed** |

**No new native dependencies.** The `node-pty` dependency that was in the earlier design is eliminated entirely.

### What survives from v0.2

- SQLite + WAL mode + busy_timeout
- Repository pattern for DB access
- Structured logger (`createLogger` / `.child()`)
- Monorepo build infra (workspaces, tsconfig, vitest)
- nanoid with entity prefixes (new: `s_`, `se_`)
- `better-sqlite3`, `nanoid` dependencies

### What gets removed

- Commander.js CLI (all 8 commands)
- 6-table entity model (projects, work_items, decisions, dependencies, handoffs, done_criteria)
- Format functions
- All current operations (init, assign, decide, depend, handoff, done, next)
- Daemon package and Unix socket notifier

## Entry Point

`endeavor` launches the TUI directly. No subcommands.

Optional flags:
- `--cwd <path>` — set working directory for new sessions
- `--attach` — skip dashboard, focus first waiting-for-input session

## Error Handling

- Child process spawn failure → session created with status `error`, event logged with spawn error details
- Observer can't list processes → warning in TUI status bar, observer adapter disabled gracefully
- DB locked → existing busy_timeout(5000) handles concurrent access
- Session process killed externally → observer detects missing PID on next poll, marks `dead`
- Claude Code `--output-format stream-json` not supported (old version) → error on spawn, surface message to user suggesting Claude Code update
- Malformed JSON line from stdout → skip line, log warning, continue parsing
- TUI crash → spawned sessions that were mid-turn continue running; sessions between turns are fully recoverable via `--resume` on restart

## Testing Strategy

- **Core:** Unit tests for session manager, state machine transitions, adapter interface compliance, JSON stream parser
- **Launcher:** Integration tests with mock child processes that emit canned stream-json output
- **Observer:** Unit tests with mock `ps` output and mock process info
- **TUI:** `ink-testing-library` for component tests (tile rendering, navigation, focus mode transitions)
- **E2E:** Manual/local only — requires a valid Anthropic API key and running Claude Code. Not suitable for CI. Document manual test script in `docs/testing.md`.

## Research Spike: Claude Code Stream-JSON Format

Before implementation begins, a research spike is needed to verify:

1. The exact JSON schema of `--output-format stream-json` events (the examples in this spec are illustrative, not verified)
2. Whether `--input-format stream-json` supports multi-turn via stdin or requires `--resume`
3. What the `result` event looks like and whether it includes `session_id` for resumption
4. Whether `--resume` works with `--print` mode for continuing conversations

5. Does `--print --output-format stream-json` emit a distinct event when tool approval is needed, or are all tools auto-approved in `--print` mode? If auto-approved, `waiting_approval` should be removed from the status enum since it's unreachable.

This spike should produce a documented event catalog that the launcher adapter's parser is built against. Estimated effort: 1-2 hours of experimentation with a live Claude Code instance.
