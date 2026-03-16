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
│  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Launcher   │  │ Observer  │  │ Adapter  │ │
│  │ (node-pty) │  │ (local)   │  │ (future) │ │
│  └───────────┘  └───────────┘  └──────────┘ │
├─────────────────────────────────────────────┤
│              Data Layer                      │
│  SQLite: sessions, events, metrics           │
└─────────────────────────────────────────────┘
```

- **Launcher** — Spawns Claude Code processes via `node-pty`. Full lifecycle ownership and I/O control.
- **Observer** — Discovers existing Claude Code sessions by scanning `~/.claude/` state files and process list. Read-only polling every 2s.
- **Adapter (future)** — Plugin interface for API sessions, cloud sessions. Same `Session` interface, different data source.
- **Session Manager** — Unifies all adapters behind a single abstraction so the TUI is source-agnostic.

## Data Model

Three tables replace the current six:

### sessions

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | `s_` prefixed nanoid |
| source | TEXT | `'launched'` \| `'observed'` \| `'api'` \| `'cloud'` |
| status | TEXT | `'active'` \| `'waiting_input'` \| `'waiting_approval'` \| `'error'` \| `'idle'` \| `'completed'` \| `'dead'` |
| pid | INTEGER | OS process ID (nullable, local only) |
| label | TEXT | User-assigned name or auto-generated |
| cwd | TEXT | Working directory |
| branch | TEXT | Git branch (nullable) |
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

### session_metrics

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | `sm_` prefixed nanoid |
| session_id | TEXT FK | References sessions.id |
| input_tokens | INTEGER | Cumulative input tokens |
| output_tokens | INTEGER | Cumulative output tokens |
| total_cost_usd | REAL | Cumulative cost |
| model | TEXT | Model identifier |
| updated_at | TEXT | ISO timestamp |

## Session Lifecycle

### State Machine

```
                    ┌──────────────┐
        spawn/      │              │    exit(0)
      discover ───► │    active    │──────────► completed
                    │              │
                    └──────┬───────┘
                           │ ▲
              prompt/      │ │  user responds /
              permission   │ │  approval given
                           ▼ │
                    ┌──────────────┐
                    │   waiting_   │
                    │    input     │
                    └──────────────┘
                           │ ▲
                    error  │ │  resolved
                           ▼ │
                    ┌──────────────┐
                    │    error     │     exit(1)
                    │              │──────────► dead
                    └──────────────┘
```

- `idle` is derived: an `active` session with no output for a configurable threshold (default 2 min).
- `waiting_approval` is a subtype of waiting — Claude is asking for tool permission.

### Launched Sessions

1. User presses `N` in TUI → prompted for cwd + label
2. Claude Code spawned via `node-pty`
3. Session created in DB (status: `active`)
4. PTY output parsed in real-time for state signals (prompts, errors, cost)
5. Status updated as state changes
6. On process exit: status → `completed` (exit 0) or `dead` (exit non-zero)

### Observed Sessions

1. Observer polls every 2s
2. Scans `~/.claude/` for active session state files
3. Cross-references with running processes
4. New session found → inserted as `source: 'observed'`
5. Session gone → marked `dead` or `completed`
6. Observed sessions show: status, cwd, branch, duration, last activity
7. Observed sessions cannot show: token counts, conversation stream, cost
8. Tiles display an "observed" badge to make the distinction clear

## TUI Design

### Dashboard Mode (default)

Grid of session tiles, auto-arranged to fit terminal width.

**Tile contents:** status badge, label, current activity snippet, branch, cost, duration.

**Color coding:**
- Red — needs attention (`waiting_input`, `waiting_approval`, `error`)
- Yellow — `active`, doing work
- Green — `active`, recently produced output
- Grey — `idle`, `completed`, `dead`

**Sort order (attention priority):** `waiting_input` > `waiting_approval` > `error` > `active` > `idle` > `completed` > `dead`

**Top bar:** aggregate stats — active count, waiting count, total cost across all sessions.

**Bottom bar:** keybindings.

### Focus Mode (Enter on a tile)

Full PTY view for launched sessions. Shows Claude's output stream, input bar at bottom. ESC returns to dashboard.

For observed sessions, focus mode shows available metadata (status, cwd, branch, event log) but no interactive terminal.

### Key Bindings

| Key | Action |
|-----|--------|
| Arrow keys / `hjkl` | Navigate tiles |
| `Enter` | Focus session |
| `ESC` | Back to dashboard |
| `N` | New session (prompt for cwd + label) |
| `K` | Kill session (with confirmation) |
| `Q` | Quit Endeavor (sessions spawned by Endeavor keep running) |
| `Tab` | Cycle through waiting-for-input sessions |
| `/` | Filter/search sessions |

## Adapter Interface

```typescript
interface SessionAdapter {
  readonly source: string;

  discover(): Promise<SessionSnapshot[]>;

  spawn?(opts: SpawnOpts): Promise<Session>;
  kill?(sessionId: string): Promise<void>;
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
- `LauncherAdapter` — full capabilities via node-pty
- `ObserverAdapter` — `discover()` + limited `onEvent()` via polling

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
  core/     Session manager, data layer, adapters, state machine
  tui/      Ink-based terminal UI (new, replaces cli/)
  daemon/   Observer polling loop (repurposed)
```

### Dependency changes

| Package | Add | Remove |
|---------|-----|--------|
| `tui` | `ink`, `react`, `ink-text-input` | — |
| `core` | `node-pty` | — |
| `core` | — | current operations, 6-table model |
| `cli` | — | **entire package removed** |

### What survives from v0.2

- SQLite + WAL mode + busy_timeout
- Repository pattern for DB access
- Structured logger (`createLogger` / `.child()`)
- Monorepo build infra (workspaces, tsconfig, vitest)
- nanoid with entity prefixes (new: `s_`, `se_`, `sm_`)
- Unix socket for daemon ↔ TUI communication
- `better-sqlite3`, `nanoid` dependencies

### What gets removed

- Commander.js CLI (all 8 commands)
- 6-table entity model (projects, work_items, decisions, dependencies, handoffs, done_criteria)
- Format functions
- All current operations (init, assign, decide, depend, handoff, done, next)

## Entry Point

`endeavor` launches the TUI directly. No subcommands.

Optional flags:
- `--cwd <path>` — set working directory for new sessions
- `--attach` — skip dashboard, focus first waiting-for-input session

## Error Handling

- PTY spawn failure → session created with status `error`, event logged with spawn error details
- Observer can't read `~/.claude/` → warning in TUI status bar, observer adapter disabled
- DB locked → existing busy_timeout(5000) handles concurrent access
- Session process killed externally → observer detects missing PID, marks `dead`
- TUI crash → spawned sessions continue running (they're separate processes); on restart, observer rediscovers them

## Testing Strategy

- **Core:** Unit tests for session manager, state machine transitions, adapter interface compliance
- **Adapters:** Integration tests with mock PTY (node-pty has test utilities), mock filesystem for observer
- **TUI:** Ink provides `ink-testing-library` for component testing
- **E2E:** Spawn a real Claude Code session, verify it appears in dashboard, send input, verify response
