# CLAUDE.md

## Project overview

Endeavor is a local-first AI tool coordination platform. It indexes your codebase, serves token-budgeted context to AI tools via MCP (Model Context Protocol), and tracks AI interactions in a unified timeline.

TypeScript monorepo using npm workspaces.

## Monorepo structure

```
packages/
  shared-types/      Shared DTOs and contracts used by all packages
  plugin/            Core orchestrator: DB, file watcher, indexing, embeddings, MCP server
  context-engine/    Context selection, compression, and token budgeting
  cli/               CLI commands (project, status, context, search, timeline)
  integrations/      Claude Desktop & Cursor config helpers

services/
  mcp-daemon/        Background daemon — MCP stdio server + Fastify REST API

apps/
  desktop/           Electron/React desktop app (planned)
```

## Common commands

```bash
npm install                   # install all deps
npm run build                 # compile all packages (tsc → dist/)
npm run typecheck             # type-check without emitting
npm run lint                  # ESLint across all packages
npm run test                  # Vitest across all packages
npm run clean                 # remove all dist/ directories
npm run dev:daemon            # start MCP daemon in dev mode (tsx)
npm run dev:cli               # start CLI in dev mode
npm run bootstrap             # first-time setup script
```

To run a command in a single workspace:

```bash
npm --workspace @endeavor/plugin run test
npm --workspace @endeavor/mcp-daemon run dev
```

## Code conventions

- TypeScript strict mode — `tsconfig.base.json` targets ES2022 with NodeNext modules
- ESLint 9 flat config with typescript-eslint recommended rules
- No Prettier configured — formatting via editor defaults
- Shared types go in `packages/shared-types`; never duplicate schemas across packages
- Barrel exports via `index.ts` in each package
- Repository pattern for database access (`packages/plugin/src/storage/`)
- Use the custom logger (`createLogger` / `.child()`), not `console.log`
- Tests live alongside source as `*.test.ts` files
- Vitest with `globals: true` — no need to import `describe`/`it`/`expect`

## Architecture notes

- `EndeavorPlugin` class is the central orchestrator — manages DB, repositories, file watcher, embeddings
- SQLite via `better-sqlite3` for all local storage
- MCP server exposes a single meta-tool `endeavor` with internal action routing (context, search, log, status)
- File watcher uses chokidar with configurable ignore patterns
- Token budgeting via `gpt-tokenizer` for context blocks
- Embeddings are optional — require `OPENAI_API_KEY` to be set

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ENDEAVOR_DATA_DIR` | `~/.endeavor` | SQLite database and config storage |
| `ENDEAVOR_LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `ENDEAVOR_REST_PORT` | `31415` | REST API port for the daemon |
| `OPENAI_API_KEY` | — | Optional; enables embedding-based search |

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR and push to main:

typecheck → lint → build → test
