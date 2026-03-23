# Endeavor

A TUI for monitoring and managing Claude Code sessions.

When you're running multiple Claude Code sessions in parallel, Endeavor gives you a single terminal view showing every session sorted by what needs your attention first.

## What it looks like

A grid of session tiles, each showing:
- Status (waiting for input, waiting approval, active, error, done)
- Label and working directory
- Git branch
- Cost, model, token counts
- Last activity preview

Sessions are sorted by priority: **waiting for input** surfaces first, then waiting approval, errors, active, and done.

## Quick start

```bash
git clone https://github.com/lewisnsmith/endeavor
cd endeavor
npm install
npm run dev
```

## Keybindings

| Key | Action |
|-----|--------|
| `←→↑↓` | Navigate tiles |
| `Enter` | Focus session (event stream view) |
| `Tab` | Jump to next session waiting for input |
| `N` | Spawn a new Claude session |
| `K` | Kill focused session |
| `Esc` | Back to dashboard |
| `Q` | Quit |

## Flags

```bash
npm run dev -- --attach    # auto-focus the highest-priority waiting session on launch
```

## How it works

- **ObserverAdapter** scans for already-running Claude processes every 5 seconds and surfaces them as tiles automatically — no manual registration needed
- **LauncherAdapter** spawns new Claude sessions with a working directory, label, and optional initial prompt
- **SessionManager** coordinates both adapters and emits a live event stream per session
- Storage is a single SQLite file at `~/.endeavor/endeavor.db` (global, not project-local)
- WAL mode handles concurrent access from multiple sessions safely

## Packages

| Package | Description |
|---------|-------------|
| `packages/core` | Domain logic: types, storage, session manager, adapters, stream parser |
| `packages/tui` | Ink-based terminal UI: dashboard, tiles, focus view, spawn dialog |

## Development

```bash
npm install
npm run typecheck
npm run build
npm run test
```

## License

MIT License. See `LICENSE`.
