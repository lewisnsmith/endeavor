# TODOS

## P1 — Blocks implementation

### Research spike: Claude Code stream-json format
Verify the exact JSON schema of `--output-format stream-json` events before building the launcher adapter.
5 specific unknowns documented in `Docs/superpowers/specs/2026-03-16-session-observatory-design.md` (Research Spike section):
1. Exact JSON schema of stream-json events
2. Whether `--input-format stream-json` supports multi-turn via stdin or requires `--resume`
3. What the `result` event looks like and whether it includes `session_id`
4. Whether `--resume` works with `--print` mode
5. Whether `--print` auto-approves all tools or emits permission events (`waiting_approval` status depends on this)
**Effort:** S (1-2 hours)
**Blocked by:** Nothing
**Blocks:** Launcher adapter implementation, stream parser, state machine design for `waiting_approval`

## P2 — Include in implementation

### DB indexes for dashboard performance
Add indexes in the initial migration:
- `sessions(status)` — dashboard sorts by status priority
- `session_events(session_id, created_at)` — focus mode scrollback queries
**Effort:** S
**Context:** Identified in CEO plan review, Section 7 (Performance)

### DB resilience: integrity check + disk full handling
- Run `PRAGMA integrity_check` on startup; if corrupt, backup and recreate
- Catch `SQLITE_FULL`, surface "Disk full" in TUI status bar, continue in degraded mode
- Set line-length limit (1MB) on stream parser to prevent OOM
**Effort:** S
**Context:** Identified in CEO plan review, Section 2 (Error & Rescue Map) — 3 critical gaps

## P3 — Future features

### Coordination layer for agent teams
Expand Endeavor from a passive observer into an active coordinator for teams of Claude agents working in parallel:
- Task assignment: route incoming work to idle or best-suited agents
- Shared context broadcast: push relevant state updates to all active agents
- Handoff protocol: structured inter-agent handoffs (maps to existing handoff model in `.endeavor/`)
- Conflict detection: warn when two agents are editing the same file or working on overlapping tasks
- Team-level cost and progress tracking in the dashboard
**Effort:** L
**Blocked by:** Core observer/launcher working end-to-end
**Builds on:** Current `SessionManager`, existing handoff/dependency tables from coordination-layer pivot

### Improved TUI graphics and activity visualization
Richer visual feedback so you can understand at a glance what a session or team of agents is doing:
- Activity timeline strip per session tile (sparkline of events over last N minutes)
- Tool-use breakdown: small icons or bars showing proportion of bash/read/write/search calls
- Cost burn rate indicator (per-session and total) with configurable alert threshold
- Session dependency graph: show which sessions share files or have explicit handoff links
- Diff preview: inline minimap of recent file changes without leaving the TUI
**Effort:** M
**Blocked by:** Stream parser producing structured events reliably
**Depends on:** Improved event schema from stream-json research spike (P1)
