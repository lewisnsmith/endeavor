# ADR 002: Pivot from Coordination Layer to Session Observatory

## Status
Accepted

## Context
Endeavor v0.2 was a terminal-native coordination layer: 6 entity types (projects,
work items, decisions, dependencies, handoffs, done criteria) exposed via a CLI.
The model was sound but never exercised in real multi-agent work. The actual pain
point is not "track what agents decided" — it's "I have 5 Claude sessions running
and I can't see which ones need me."

The real problem is **observability and control across parallel Claude Code sessions**,
not coordination metadata.

## Decision
Pivot Endeavor to a session multiplexer and observatory: a TUI that shows all Claude
sessions as a grid of color-coded tiles, sorted by attention priority. Spawn new
sessions, observe existing ones, interact with spawned sessions directly.

### What we cut and why
- **6-table entity model** (projects, work_items, decisions, dependencies, handoffs,
  done_criteria) — over-modeled for a tool nobody used. Sessions are the only entity
  that matters.
- **Commander.js CLI** (8 commands) — replaced by an interactive TUI. No subcommands.
- **Daemon package** — observer runs in-process within the TUI. No separate process.
- **Unix socket IPC** — eliminated with the daemon.

### What we kept
- SQLite storage with WAL mode, busy_timeout, migration runner
- Repository pattern for DB access
- Structured logger
- Monorepo build infrastructure
- nanoid ID generation with entity prefixes

### New model
Two tables: `sessions` and `session_events`. Sessions are the primary entity.
Events are the activity log. Metrics (tokens, cost) are columns on sessions.

### Architecture
- `@endeavor/core` — session manager, data layer, adapter interface, launcher adapter
- `@endeavor/tui` — Ink-based terminal UI, observer adapter
- Launcher spawns Claude Code via `child_process.spawn` with `--print --output-format stream-json`
- Observer discovers existing sessions via process list scanning
- Adapter interface supports future API/cloud session sources

## Consequences
- All v0.2 data is incompatible; fresh DB with v0.2 backup
- Package count drops from 3 to 2
- Dependencies change: add `ink`, `react`; remove `commander`
- No native dependencies (node-pty eliminated in favor of child_process.spawn)
- Depends on Claude Code's `--output-format stream-json` flag (undocumented stability)
- Research spike needed before implementation to verify stream-json event format
