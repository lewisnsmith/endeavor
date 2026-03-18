# Contributing

## Scope

This project is early-stage. Contributions that align with the execution backlog are preferred:
- `Docs/Execution_Backlog_v1.md`

If you want to propose new scope, open an issue first with:
- target user
- problem statement
- success criteria
- what gets removed or deferred to keep v1.0 on track

## Development Setup

Prereqs:
- Node.js (recommended: current LTS)
- npm (workspaces)

Install + verify:

```bash
npm install
npm run typecheck
npm run build
```

Run dev entrypoints (currently skeletons):

```bash
npm run dev:daemon
npm run dev:desktop
npm run dev:cli
```

## Pull Requests

Please keep PRs focused:
- one logical change
- include tests where practical
- update docs when behavior changes

## Code Style

- TypeScript `strict` is enabled via `tsconfig.base.json`.
- Prefer shared contracts in `packages/shared-types` over duplicated schemas.

