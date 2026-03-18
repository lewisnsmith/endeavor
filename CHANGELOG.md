# Changelog

All notable changes to Endeavor PM IDE will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- MCP daemon with file watching, chunking, and indexing
- Semantic search via vector embeddings (OpenAI text-embedding-3-small)
- Token-optimized context packing (`getContext`, `logUsage`, `listProjects`, `ping` tools)
- Setup wizard for Claude Desktop and Cursor configuration
- Project templates: Research, Software, Hardware, General
- Auto-generated `CONTEXT.md` per project
- Task tracking (backlog / in-progress / done)
- Electron desktop app with tabbed AI interfaces (Claude, ChatGPT, Perplexity)
- Cost tracking and budget management dashboard
- REST + WebSocket internal API

---

## [0.1.0] - 2026-02-18

### Added
- Monorepo scaffolding with npm workspaces
- TypeScript configuration across all packages (ES2022, NodeNext modules)
- Package structure:
  - `apps/desktop` — Electron + React desktop application shell
  - `services/mcp-daemon` — background daemon skeleton (MCP server, file indexer, context engine)
  - `packages/shared-types` — shared TypeScript contracts and DTOs (`HealthStatus`, `DaemonHealthResponse`, `ProjectSummary`)
  - `packages/context-engine` — context selection, compression, and token budgeting skeleton
  - `packages/cli` — `endeavor` CLI entrypoint
  - `packages/integrations` — Claude Desktop and Cursor configuration helpers
- Root-level npm scripts: `build`, `typecheck`, `clean`, `dev:daemon`, `dev:desktop`, `dev:cli`
- Product Requirements Document (PRD v3) with 4-phase roadmap
- Execution Backlog v1.0 with 10-sprint release schedule

[Unreleased]: https://github.com/lewisgoing/Endeavor-PM-IDE/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/lewisgoing/Endeavor-PM-IDE/releases/tag/v0.1.0
