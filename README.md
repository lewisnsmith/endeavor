# Endeavor-PM-IDE

Monorepo for Endeavor's desktop app, MCP daemon, and shared packages.

## Workspace Layout

- `apps/desktop`: Electron app shell (initial bootstrap).
- `services/mcp-daemon`: background MCP daemon service.
- `packages/shared-types`: cross-package contracts and DTOs.
- `packages/context-engine`: context selection/compression logic.
- `packages/cli`: CLI package that will publish the `endeavor` binary.
- `packages/integrations`: external tool integration helpers.

## Bootstrap Commands

- `npm install`
- `npm run typecheck`
- `npm run build`

