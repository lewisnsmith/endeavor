# Endeavor v1.0 Execution Backlog

Version: 1.0  
Date: February 17, 2026  
Source: PRD v2 (`Docs/Endeavor_PRD_v2.md`)  
Target Launch Window: April 23-25, 2026

## 1) Scope Lock

### In Scope for v1.0
- Universal MCP daemon with project watch/index/search.
- Desktop app with ChatGPT and Claude interfaces, dashboard, context management.
- Claude Desktop and Cursor MCP integrations.
- CLI for daemon/project operations.
- Cost and token tracking with budget alerts.
- Distribution: npm package + desktop installers (macOS/Windows/Linux).

### Out of Scope for v1.0 (Defer to v1.1+)
- Team collaboration and shared workspaces.
- Agent marketplace.
- Mobile companion app.
- Deep plugin ecosystem.

## 2) Global Definition of Done

- Feature merged with unit tests for core logic.
- Integration tests for storage/API boundaries.
- E2E coverage for primary user path if UI-facing.
- Telemetry/privacy behavior matches documented defaults.
- No open P0/P1 bugs in related scope.
- Docs updated for setup and usage.

## 3) Epic Dependency Order

1. E0 Program Foundation
2. E1 Daemon Core Data Layer
3. E2 Indexing and Embeddings Pipeline
4. E3 Context Retrieval and Compression Engine
5. E4 MCP Server and Internal API
6. E5 CLI
7. E6 Desktop Shell and Shared Infrastructure
8. E7 LLM Interfaces (ChatGPT + Claude)
9. E8 Dashboard, Usage, Budgeting
10. E9 External Integrations (Claude Desktop + Cursor)
11. E10 Packaging and Distribution
12. E11 Quality Hardening and Security
13. E12 Beta, Launch Readiness, Release

## 4) Sprint Plan (2-week cadence)

- Sprint 1 (Week 1-2): E0, E1, E2 baseline, E3 baseline.
- Sprint 2 (Week 3-4): E4, E5, E6 skeleton.
- Sprint 3 (Week 5-6): E7, E8, E6 completion.
- Sprint 4 (Week 7-8): E9, E10, E11 performance/security pass.
- Sprint 5 (Week 9-10): E12 beta feedback loop, bug burn-down, launch.

## 5) Backlog by Epic

## E0 Program Foundation
Goal: Establish repository, tooling, CI/CD, coding standards, and shared contracts.

### E0-T1 Monorepo bootstrap
Description: Create workspace layout (`apps/desktop`, `services/mcp-daemon`, `packages/*`), shared tsconfig, linting, formatting.
Acceptance Criteria:
- All packages build from repo root.
- Type-check and lint run successfully in CI.
Depends On: None.

### E0-T2 Shared type contracts package
Description: Define versioned TypeScript interfaces for REST, WebSocket events, MCP payloads.
Acceptance Criteria:
- Contracts published/consumed by daemon and desktop with no duplicated schemas.
- Contract change requires version bump/changelog note.
Depends On: E0-T1.

### E0-T3 CI pipeline and branch protection checks
Description: Add CI jobs for lint, typecheck, tests, and build artifacts.
Acceptance Criteria:
- Pull requests blocked when checks fail.
- CI runtime stays under 12 minutes for standard PR.
Depends On: E0-T1, E0-T2.

### E0-T4 Error handling and logging standard
Description: Add structured logging format, error taxonomy, and correlation IDs.
Acceptance Criteria:
- Logs include timestamp, component, severity, request/job ID.
- Fatal errors produce actionable message and stack trace in dev mode.
Depends On: E0-T1.

### E0-T5 Local dev environment bootstrap scripts
Description: Create one-command setup for dependencies, env templates, and local startup.
Acceptance Criteria:
- New contributor can run daemon + desktop in under 15 minutes.
- Setup instructions pass in clean environment test.
Depends On: E0-T1.

## E1 Daemon Core Data Layer
Goal: Implement project management and durable metadata storage.

### E1-T1 SQLite schema + migrations
Description: Create migration system and initial tables (`projects`, `context_chunks`, `usage_logs`).
Acceptance Criteria:
- Schema is auto-created on first run.
- Migrations are reversible in dev.
Depends On: E0-T1.

### E1-T2 Project CRUD service
Description: Implement add/list/get/delete project operations in daemon service layer.
Acceptance Criteria:
- CRUD operations validated (path exists, dedupe by canonical path).
- Deleting project removes active watch and associated metadata safely.
Depends On: E1-T1.

### E1-T3 File watch manager
Description: Implement watcher lifecycle per project with ignore rules and debounced events.
Acceptance Criteria:
- Supports add/change/delete events.
- Ignores configured folders (`node_modules`, `.git`, `dist`, build outputs).
- Event latency under 1 second median after debounce.
Depends On: E1-T2.

### E1-T4 Configuration store
Description: Persist user settings: ignore patterns, max file size, sync toggles.
Acceptance Criteria:
- Config survives daemon restart.
- Invalid config entries are rejected with explicit error.
Depends On: E1-T1.

## E2 Indexing and Embeddings Pipeline
Goal: Build deterministic indexing pipeline from file changes to searchable vectors.

### E2-T1 File parsing and chunking
Description: Build language-agnostic chunker for code and text files.
Acceptance Criteria:
- Chunk IDs deterministic by file path + content hash + range.
- Large files are split safely within token-aware limits.
Depends On: E1-T3.

### E2-T2 Embedding provider abstraction
Description: Add provider interface and OpenAI `text-embedding-3-small` implementation.
Acceptance Criteria:
- Provider can be swapped without changing indexing logic.
- Embedding failures surfaced with retry classification.
Depends On: E2-T1.

### E2-T3 Background embedding queue
Description: Add work queue with retry/backoff, dead-letter tracking, concurrency control.
Acceptance Criteria:
- Queue survives daemon restart.
- Failed items are retried with capped attempts and visible error status.
Depends On: E2-T2.

### E2-T4 Vector store adapter (Pinecone default)
Description: Implement vector write/update/delete/query adapter and metadata mapping.
Acceptance Criteria:
- Upsert and delete keep SQLite and vector state consistent.
- Query returns top-K results with score + metadata.
Depends On: E2-T3.

### E2-T5 Incremental re-indexing
Description: Ensure changed/deleted files only update impacted chunks.
Acceptance Criteria:
- Re-index does not re-embed unchanged chunks.
- Delete event removes stale chunks/vectors.
Depends On: E2-T1, E2-T4.

## E3 Context Retrieval and Compression Engine
Goal: Return high-quality context packages within model token constraints.

### E3-T1 Ranking algorithm v1
Description: Combine semantic similarity with recency weighting and file-level heuristics.
Acceptance Criteria:
- Top-K relevance stable across repeated runs.
- Recency bias influences ranking when semantic scores are close.
Depends On: E2-T4.

### E3-T2 Token budgeting engine
Description: Enforce model-specific token caps and reserved response budget.
Acceptance Criteria:
- Supports baseline caps for ChatGPT and Claude.
- Never returns context above configured max budget.
Depends On: E3-T1.

### E3-T3 Compression strategy v1
Description: Include full content for top files and summaries for lower-ranked files.
Acceptance Criteria:
- Output follows PRD context format with source file markers.
- Summaries preserve exports/functions/classes at minimum.
Depends On: E3-T2.

### E3-T4 Query-time context builder API
Description: Expose single method for context generation by `projectId + query`.
Acceptance Criteria:
- Returns deterministic envelope with file list, tokens, and content blocks.
- p95 response time under 500ms on warmed index for medium projects.
Depends On: E3-T3.

## E4 MCP Server and Internal API
Goal: Expose daemon capabilities through MCP, REST, and WebSocket channels.

### E4-T1 MCP stdio server skeleton
Description: Implement MCP lifecycle, health check, tool registration.
Acceptance Criteria:
- `ping()` returns healthy response.
- MCP server starts/stops cleanly.
Depends On: E3-T4.

### E4-T2 MCP tools implementation
Description: Implement `getContext`, `logUsage`, `listProjects`.
Acceptance Criteria:
- Tool contracts exactly match shared types.
- Tool calls validated and errors standardized.
Depends On: E4-T1.

### E4-T3 Internal REST endpoints
Description: Build `/api/projects`, `/api/projects/:id`, `/api/projects/:id/search`, `/api/stats`.
Acceptance Criteria:
- Endpoints pass contract tests.
- Invalid payloads return actionable 4xx errors.
Depends On: E1-T2, E3-T4.

### E4-T4 WebSocket event stream
Description: Emit daemon events for indexing progress, usage logs, sync status.
Acceptance Criteria:
- Desktop can subscribe and receive ordered event stream.
- Disconnect/reconnect resumes stream without process crash.
Depends On: E4-T3.

## E5 CLI
Goal: Provide reliable operational interface for daemon and project management.

### E5-T1 Command scaffolding
Description: Implement command parser and help output.
Acceptance Criteria:
- Commands: `add`, `remove`, `list`, `search`, `stats`, `start`, `stop`, `status`.
- Help text includes examples and exit codes.
Depends On: E4-T3.

### E5-T2 Daemon process management
Description: Implement start/stop/status semantics and PID tracking.
Acceptance Criteria:
- Start is idempotent.
- Stop handles stale PID state safely.
Depends On: E5-T1.

### E5-T3 CLI output modes
Description: Support human-readable and JSON output for scripting.
Acceptance Criteria:
- `--json` produces stable machine-readable schema.
- Non-zero exit codes on command failures.
Depends On: E5-T1.

## E6 Desktop Shell and Shared Infrastructure
Goal: Ship functional desktop framework wired to daemon APIs.

### E6-T1 Electron app shell + routing
Description: Build window, navigation layout, tab framework, persistent settings store.
Acceptance Criteria:
- App launches under 3 seconds on reference machine.
- Layout supports project selector + tool tabs + dashboard sections.
Depends On: E0-T1.

### E6-T2 API client layer
Description: Typed clients for REST/WebSocket with reconnect and auth/key handling.
Acceptance Criteria:
- API failures surface user-readable messages.
- Client schemas are generated/validated from shared contracts.
Depends On: E0-T2, E4-T4.

### E6-T3 Project and settings screens
Description: Add project list/create/remove and settings panels (API keys, privacy, limits).
Acceptance Criteria:
- User can manage project lifecycle from UI without CLI.
- API keys stored securely via OS keychain integration.
Depends On: E6-T2, E1-T2.

### E6-T4 Onboarding flow
Description: First-run wizard for API keys, first project, daemon status check.
Acceptance Criteria:
- First meaningful query can be executed in under 5 steps.
- Onboarding state can be resumed after app restart.
Depends On: E6-T3, E7-T1.

## E7 LLM Interfaces (ChatGPT + Claude)
Goal: Deliver production-ready query experience with context injection and history.

### E7-T1 Provider client wrappers
Description: Implement OpenAI and Anthropic wrapper modules with common interface.
Acceptance Criteria:
- Provider selection and model selection are runtime-configurable.
- Rate limit and auth errors normalized.
Depends On: E6-T2.

### E7-T2 Chat workspace UI
Description: Build unified chat components (message list, composer, code blocks, copy actions).
Acceptance Criteria:
- Markdown/code rendering works with syntax highlighting.
- Long conversations remain performant.
Depends On: E6-T1.

### E7-T3 Auto-context injection pipeline
Description: Query daemon for context and attach to outbound model requests.
Acceptance Criteria:
- Context preview shows files/tokens before send.
- Sent payload includes context envelope and query text in deterministic format.
Depends On: E3-T4, E7-T1, E7-T2.

### E7-T4 Conversation persistence
Description: Store conversation history by tool and project with retrieval on tab switch.
Acceptance Criteria:
- Switching projects or tools restores relevant history.
- History clear/export controls available.
Depends On: E7-T2.

## E8 Dashboard, Usage, Budgeting
Goal: Provide project-level visibility into activity, tokens, and spend.

### E8-T1 Usage ingestion pipeline
Description: Wire `logUsage` events from daemon and in-app interfaces to unified usage store.
Acceptance Criteria:
- Usage entries include tool, model, project, tokens, cost, timestamp.
- Duplicate event protection in ingestion path.
Depends On: E4-T2, E7-T1.

### E8-T2 Activity timeline UI
Description: Build chronological feed of cross-tool activity per project.
Acceptance Criteria:
- Feed updates in near real time from WebSocket stream.
- Each item shows query summary, context stats, and cost.
Depends On: E6-T2, E8-T1.

### E8-T3 Cost analytics widgets
Description: Build monthly spend bar, tool breakdown, token trend chart.
Acceptance Criteria:
- Aggregates match usage logs within 1% tolerance.
- Budget progress and projected spend visible.
Depends On: E8-T1.

### E8-T4 Budget and alerting
Description: Implement budget limits and threshold alerts (75/90/100%).
Acceptance Criteria:
- Alerts trigger once per threshold crossing per month.
- User can configure budget and thresholds.
Depends On: E8-T3.

## E9 External Integrations (Claude Desktop + Cursor)
Goal: Enable shared context with external MCP-compatible tools.

### E9-T1 Integration detector and status checks
Description: Detect installed clients and surface current integration status.
Acceptance Criteria:
- Desktop UI shows installed/not installed and configured/not configured states.
- Validation confirms MCP endpoint is reachable.
Depends On: E4-T1, E6-T3.

### E9-T2 Claude Desktop config automation
Description: Read/write Claude Desktop MCP config with backup and rollback.
Acceptance Criteria:
- Existing config is backed up before modification.
- Integration can be toggled off and restored safely.
Depends On: E9-T1.

### E9-T3 Cursor integration automation
Description: Configure Cursor MCP settings and verify daemon connectivity.
Acceptance Criteria:
- One-click setup for default install paths with manual path fallback.
- Connectivity check passes before marking configured.
Depends On: E9-T1.

### E9-T4 Integration troubleshooting UX
Description: Build actionable error states and fix steps for failed setup.
Acceptance Criteria:
- Errors include path, permission, and remediation guidance.
- Retry action available without restarting app.
Depends On: E9-T2, E9-T3.

## E10 Packaging and Distribution
Goal: Produce stable installable artifacts for CLI and desktop.

### E10-T1 npm package for CLI/daemon
Description: Package and publish `endeavor-ai` with semantic versioning.
Acceptance Criteria:
- Global install works on clean macOS/Windows/Linux environments.
- `endeavor --help` and daemon startup validated post-install.
Depends On: E5-T3, E4-T2.

### E10-T2 Desktop build pipeline
Description: Build signed installers for macOS, Windows, Linux (AppImage).
Acceptance Criteria:
- Installers generated in CI release workflow.
- Installer smoke tests pass on each platform.
Depends On: E6-T4, E7-T4, E8-T4.

### E10-T3 Auto-update integration
Description: Add update checks and safe background download/install flow.
Acceptance Criteria:
- Update prompt appears on new version.
- Rollback plan documented for failed update.
Depends On: E10-T2.

### E10-T4 Release channel management
Description: Configure prerelease, beta, and stable channels.
Acceptance Criteria:
- Beta users receive prerelease updates only.
- Stable channel excluded from prerelease artifacts.
Depends On: E10-T2.

## E11 Quality Hardening and Security
Goal: Meet reliability/performance/privacy targets before launch.

### E11-T1 Unit and integration coverage targets
Description: Raise automated coverage on core modules and critical paths.
Acceptance Criteria:
- Core packages maintain agreed coverage threshold.
- Failing regression tests block merge.
Depends On: E0-T3 and all prior epics as implemented.

### E11-T2 E2E golden path tests
Description: Automate full journey: add project, index, query, cost log, dashboard display.
Acceptance Criteria:
- Green on CI for at least one OS runner.
- Test artifacts include screenshots/log bundles for failures.
Depends On: E6-T4, E7-T4, E8-T4.

### E11-T3 Performance budget validation
Description: Validate startup/memory/index/search against PRD thresholds.
Acceptance Criteria:
- Daemon startup <2s; Desktop launch <3s on reference hardware.
- Search p95 <500ms on warmed index medium repo.
- Idle memory within PRD limits or documented exception.
Depends On: E2-T5, E3-T4, E10-T2.

### E11-T4 Security and privacy review
Description: Validate key storage, log redaction, local-data defaults, opt-in telemetry.
Acceptance Criteria:
- API keys never written to plaintext logs/config.
- Privacy settings verified with integration tests.
Depends On: E6-T3, E8-T1.

### E11-T5 Documentation completion
Description: Publish user docs (install, setup, troubleshooting) and developer docs (architecture/API/contributing).
Acceptance Criteria:
- New user can reach first successful query following docs only.
- Docs include explicit privacy and data-flow statement.
Depends On: E10-T1, E10-T2.

## E12 Beta, Launch Readiness, Release
Goal: Validate product with external users and execute launch with low risk.

### E12-T1 Beta cohort onboarding
Description: Recruit and onboard 20-50 testers with structured scenarios.
Acceptance Criteria:
- At least 20 active testers complete core workflow.
- Feedback and bug reports centralized in issue tracker.
Depends On: E11-T2, E10-T2.

### E12-T2 Beta triage and fix sprints
Description: Daily triage; fix P0/P1; defer non-blocking requests.
Acceptance Criteria:
- Zero open P0/P1 by RC freeze.
- Crash rate under 1% in beta usage window.
Depends On: E12-T1.

### E12-T3 Launch asset prep
Description: Finalize website copy, demo video, screenshots, release notes, FAQs.
Acceptance Criteria:
- Launch assets reviewed and versioned before launch day.
- Release notes include known issues/workarounds.
Depends On: E12-T2.

### E12-T4 Release candidate and go-live
Description: Build RC, run final smoke tests, publish installers/npm package, launch comms.
Acceptance Criteria:
- Signed artifacts published and downloadable.
- Launch checklist completed with owner sign-off.
Depends On: E12-T3, E10-T1, E10-T2.

## 6) Critical Path (Must Stay Green)

- E0 -> E1 -> E2 -> E3 -> E4 -> E6/E7 -> E8 -> E10 -> E11 -> E12.
- Any slip in E2/E3/E4 or E7 directly threatens launch viability.

## 7) Backlog Management Rules

- Freeze v1.0 feature scope at end of Sprint 3.
- After freeze, only bug fixes, performance, security, docs.
- Any new feature request requires explicit trade: one v1.0 item out.
- Weekly demo and milestone checkpoint every Friday.

