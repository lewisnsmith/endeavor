# CLAUDE.md

## Project overview

Endeavor is a terminal-native coordination layer for parallel Claude Code work. It tracks which agent is working on what, what decisions were made, what depends on what, and what handoffs are pending.

TypeScript monorepo using npm workspaces.

## Monorepo structure

```
packages/
  core/          Domain logic: types, storage, operations, logger
  cli/           Commander.js CLI — calls core directly for reads/writes
  daemon/        Thin background process — watches DB, pushes notifications
```

## Common commands

```bash
npm install                   # install all deps
npm run build                 # compile all packages (tsc -> dist/)
npm run typecheck             # type-check without emitting
npm run lint                  # ESLint across all packages
npm run test                  # Vitest across all packages
npm run clean                 # remove all dist/ directories
npm run dev:cli               # start CLI in dev mode (tsx)
npm run dev:daemon            # start daemon in dev mode
```

To run a command in a single workspace:

```bash
npm --workspace @endeavor/core run test
npm --workspace @endeavor/cli run dev
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
- IDs use nanoid with entity prefixes: `p_`, `w_`, `d_`, `dep_`, `h_`, `dc_`

## Architecture notes

- `Endeavor` class is the central facade — manages DB, repositories, and exposes operations
- SQLite via `better-sqlite3` for all local storage
- Storage at `.endeavor/endeavor.db` in project root (project-local, not global)
- Discovery: walks up from cwd looking for `.endeavor/`, like git finds `.git/`
- Worktrees: detects main repo root via `git rev-parse --git-common-dir`, shares one `.endeavor/`
- Concurrency: WAL mode + `busy_timeout(5000)` — parallel sessions serialize naturally
- Operations return typed objects; CLI formats them for terminal display
- Every CLI command supports `--json` for machine consumption

## Entity model (6 tables)

- **projects** — project root paths
- **work_items** — tasks with status (todo/in_progress/blocked/done/cancelled)
- **decisions** — recorded decisions with rationale
- **dependencies** — blocker/blocked relationships between work items
- **handoffs** — context handoffs between agents/sessions
- **done_criteria** — completion criteria for work items

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ENDEAVOR_LOG_LEVEL` | `error` | Log level (debug, info, warn, error) |

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR and push to main:

typecheck -> lint -> build -> test
