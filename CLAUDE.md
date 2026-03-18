# CLAUDE.md

## Project overview

Endeavor is a Claude session observatory and multiplexer — a TUI that shows all Claude Code sessions as color-coded tiles sorted by attention priority.

TypeScript monorepo using npm workspaces.

## Monorepo structure

```
packages/
  core/          Domain logic: types, storage, session manager, adapters, stream parser
  tui/           Ink-based terminal UI: dashboard, session tiles, focus view, observer
```

## Common commands

```bash
npm install                   # install all deps
npm run build                 # compile all packages (tsc -> dist/)
npm run typecheck             # type-check without emitting
npm run lint                  # ESLint across all packages
npm run test                  # Vitest across all packages
npm run clean                 # remove all dist/ directories
npm run dev                   # start the TUI in dev mode (tsx)
```

To run a command in a single workspace:

```bash
npm --workspace @endeavor/core run test
npm --workspace @endeavor/tui run dev
```

## Code conventions

- TypeScript strict mode — `tsconfig.base.json` targets ES2022 with NodeNext modules
- ESLint 9 flat config with typescript-eslint recommended rules
- No Prettier configured — formatting via editor defaults
- Shared types go in `packages/core/src/types.ts`; never duplicate schemas across packages
- Barrel exports via `index.ts` in each package
- Repository pattern for database access (`packages/core/src/storage/`)
- Use the custom logger (`createLogger` / `.child()`), not `console.log`
- Tests live alongside source as `*.test.ts` files
- Vitest with `globals: true` — no need to import `describe`/`it`/`expect`
- IDs use nanoid with entity prefixes: `s_`, `se_`

## Architecture notes

- `SessionManager` class is the central facade — manages DB, repositories, adapters, and exposes operations
- Adapter pattern: `SessionAdapter` interface abstracts session lifecycle (spawn, kill, list, stream)
- `LauncherAdapter` spawns new Claude sessions via `child_process.spawn`
- `ObserverAdapter` discovers already-running Claude processes via process scanning
- `StreamJsonParser` parses Claude's `--output-format stream-json` into typed events
- SQLite via `better-sqlite3` for all local storage
- Storage at `.endeavor/endeavor.db` in project root (project-local, not global)
- Concurrency: WAL mode + `busy_timeout(5000)` — parallel sessions serialize naturally
- TUI built with Ink (React for the terminal) — renders dashboard of session tiles

## Entity model (2 tables)

- **sessions** — spawned/observed Claude sessions with status, metrics, cost
- **session_events** — activity log (status changes, responses, tool use, errors, cost ticks)

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ENDEAVOR_LOG_LEVEL` | `error` | Log level (debug, info, warn, error) |

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR and push to main:

typecheck -> lint -> build -> test
