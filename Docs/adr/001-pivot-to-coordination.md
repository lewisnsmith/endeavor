# ADR 001: Pivot from Context Platform to Coordination Layer

## Status
Accepted

## Context
Endeavor v0.1 was built as a local-first AI context/memory platform: file indexing,
token-budgeted context serving, embeddings, and a unified timeline. After evaluating
how developers actually use Claude Code, the core problem is not context delivery
(Claude Code handles that) but **coordination across parallel sessions and subagents**.

## Decision
Pivot Endeavor to a terminal-native coordination layer for parallel Claude Code work.

### What we cut and why
- **File chunker, embeddings, vector search** — token optimization and semantic search
  are non-goals. Claude Code already handles context.
- **File watcher** — indexing files is not coordination.
- **Context engine** — token budgeting is not coordination.
- **MCP daemon + REST API** — daemon architecture adds complexity for no V1 benefit.
  The CLI calls core directly in-process.
- **Desktop app** — terminal-native means no GUI.
- **Integrations package** — Claude Desktop/Cursor config helpers are a future surface.

### What we kept
- SQLite storage with repository pattern and migration runner
- Structured logger
- Commander.js CLI framework
- Monorepo build infrastructure (TypeScript, ESLint, Vitest, CI)

### New entity model
Six entities: Project, Work Item, Decision, Dependency, Handoff, Done Criteria.
These directly answer the five coordination questions.

### Architecture: CLI core, surfaces on top
The core library (`@endeavor/core`) contains all domain logic and storage.
The CLI (`@endeavor/cli`) is the first surface. MCP server and Claude Code hooks
will be added as additional surfaces that call the same core operations.

## Consequences
- All existing data (if any) is incompatible; fresh migration
- Package count drops from 6+1+1 to 3
- Dependency count drops significantly (no chokidar, fastify, openai, gpt-tokenizer)
- Future MCP/hooks integration requires only adding new packages, not refactoring core
