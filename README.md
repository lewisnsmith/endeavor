# Endeavor

Endeavor is a **local-first AI tool coordination platform**:
- A background daemon indexes your codebase and serves **relevant project context** via MCP.
- A desktop app provides a **single mission-control UI** for multiple AI tools (ChatGPT, Claude, etc.).
- A unified usage ledger tracks **tokens + cost** across tools and projects.

This repo is the monorepo for the daemon, desktop app, CLI, and shared packages.

## Status

Pre-development / scaffolded workspace. Product requirements and execution backlog live in `Docs/`.

## Docs

- PRD: `Docs/Endeavor_PRD_v2.md`
- Execution backlog: `Docs/Execution_Backlog_v1.md`

## Architecture (High Level)

**Core facilitator:** `services/mcp-daemon` is the system of record.

- Watches selected projects (file events)
- Chunks/indexes content
- Generates embeddings + vector search
- Builds token-budgeted context packs
- Exposes:
  - MCP stdio server (`getContext`, `logUsage`, `listProjects`, `ping`)
  - Internal REST + WebSocket APIs for the desktop app

## Monorepo Layout

- `apps/desktop`: desktop application (Electron/React target).
- `services/mcp-daemon`: background daemon (watch/index/search + MCP/REST/WS).
- `packages/shared-types`: shared DTOs/contracts used everywhere.
- `packages/context-engine`: context selection/compression/token budgeting logic.
- `packages/cli`: `endeavor` CLI entrypoint.
- `packages/integrations`: helpers for Claude Desktop / Cursor configuration.

## Prerequisites

- Node.js (recommended: current LTS)
- npm (workspaces enabled)

## Quick Start

```bash
npm install
npm run typecheck
npm run build
```

Run the current skeleton entrypoints:

```bash
npm run dev:daemon
npm run dev:desktop
npm run dev:cli
```

## Environment Variables (Planned)

The PRD expects these to exist (exact wiring will be implemented during development):

- `OPENAI_API_KEY` (embeddings + ChatGPT API)
- `ANTHROPIC_API_KEY` (Claude API)
- `PINECONE_API_KEY` + index/env settings (vector search; opt-in)

## Development Principles

- Local-first by default (projects + metadata stored locally).
- Shared contracts in `packages/shared-types` to keep daemon/desktop/CLI aligned.
- Provider integrations behind adapters so dependencies can change without rewriting the app.

## Contributing

At this stage, issues/PRs should focus on the execution backlog in `Docs/Execution_Backlog_v1.md`.

## License

MIT License. See `LICENSE`.
