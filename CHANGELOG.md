# Changelog

## [2.4.0] - 2026-03-23

### Changed
- Complete rewrite as a TUI session observatory
- Replaced CLI coordination layer with Ink-based terminal dashboard
- Sessions displayed as color-coded tiles sorted by attention priority
- Added ObserverAdapter: auto-discovers running Claude processes via process scanning
- Added LauncherAdapter: spawn new Claude sessions with label and initial prompt
- Added FocusView: live event stream for a selected session
- Added SpawnDialog: interactive form to launch sessions
- Added Tab navigation to jump to next session waiting for input
- `--attach` flag auto-focuses highest-priority waiting session on launch
- Moved storage from project-local (`.endeavor/`) to global (`~/.endeavor/`)
- Entity model simplified to `sessions` + `session_events` (2 tables)

### Removed
- `packages/cli` and all `endeavor` CLI commands (init, assign, decide, depend, handoff, done, next)
- `packages/daemon`
- Work items, decisions, dependencies, handoffs, done-criteria entity model

## [0.2.0]

Terminal-native coordination layer for parallel Claude Code sessions.
CLI with work item tracking, decisions, dependencies, and handoffs.

## [0.1.0]

Initial monorepo scaffolding.
