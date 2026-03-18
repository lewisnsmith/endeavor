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
