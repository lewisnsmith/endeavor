# endeavor-core — plan.md

> Working plan for Endeavor Core (AI Tool Bus) and the first layer of the Cockpit.
> This is a living document.

---

## High-level milestones

1. **M1 — Core server**: MCP + REST skeleton, no indexing
2. **M2 — Indexing & context**: file watcher, embeddings, context builder
3. **M3 — Events & usage**: logging timeline + basic usage tracking
4. **M4 — Auto-capture pipeline**: interceptor + classifier + file event linker
5. **M5 — MCP server**: single-tool interface with session-level auto-injection
6. **M6 — Personal integrations**: wire into your own Claude/Cursor/GPT setup
7. **M7 — Cockpit v0**: simple UI to read what Core knows
8. **M8 — Polish & publish**: npm publish, benchmarks, bug fixes from real usage

The idea: get something usable on your own projects quickly, then iterate.

---

## M1 — Core server (week 1-ish)

### Goals

- Have a Node/TS project that starts a process with:
  - an MCP server exposing one `endeavor` tool
  - a REST API with `/health`
- Have a basic project registry in SQLite.

### Tasks

- Set up repo structure (monorepo optional) and TypeScript config.
- Implement SQLite init with `projects` and `events` tables.
- Implement minimal REST API:
  - `GET /health` → `{ ok: true }`
  - `POST /projects` → register project by path
  - `GET /projects` → list
- Implement minimal MCP server:
  - one tool: `endeavor`
  - supports `action: "status"` only at first
  - returns project stats for current working directory

### Done when

- You can start the server.
- Claude Desktop (pointed at this MCP server) can call `endeavor` with `{"action":"status"}` and get a simple answer.
- You can register a project via REST and see it in the DB.

---

## M2 — Indexing & context (week 2-ish)

### Goals

- Watch project files, keep a semantic index.
- Build a context block for a project and optional query.

### Supported file types

Include by default:
`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.rs`, `.go`, `.java`, `.c`, `.cpp`, `.h`,
`.md`, `.mdx`, `.txt`, `.json`, `.yaml`, `.yml`, `.toml`, `.csv`, `.html`, `.css`,
`.scss`, `.sql`, `.sh`, `.bash`, `.zsh`, `.dockerfile`, `.env.example`, `.gitignore`

### Ignore patterns

Always skip:
`node_modules/`, `.git/`, `dist/`, `build/`, `out/`, `.next/`, `__pycache__/`,
`*.pyc`, `.venv/`, `venv/`, `.env`, `*.lock`, `package-lock.json`, `yarn.lock`,
`*.min.js`, `*.min.css`, `*.map`, `*.wasm`, `*.bin`, `*.exe`, `*.dll`, `*.so`,
`*.dylib`, `*.jpg`, `*.jpeg`, `*.png`, `*.gif`, `*.svg`, `*.ico`, `*.mp4`,
`*.mp3`, `*.wav`, `*.zip`, `*.tar`, `*.gz`, `.DS_Store`, `Thumbs.db`

### Tasks

- Implement file watcher for a project path:
  - `add`/`change` → read file, chunk content, store chunks
  - apply ignore patterns from above
- Wire in embeddings + vector index:
  - first version can call OpenAI embeddings
  - store embedding vectors in `file_chunks`
- Implement context builder:
  - `buildContext(projectId, query, model)`
  - semantic search over chunks
  - pack into token budget
  - return markdown/plaintext
- Expose via:
  - REST: `POST /context`
  - MCP: `{"action":"context","query":"..."}`

### Done when

- You can point the server at one of your existing projects.
- Files are indexed as you work.
- You can ask for context for a query and get a reasonable block of text.
- Claude/Cursor can retrieve context via MCP instead of you pasting everything.

---

## M3 — Events & usage (week 3-ish)

### Goals

- Start building timelines: who did what, when.
- Track basic token/cost usage.

### Tasks

- Add logging endpoints:
  - REST: `POST /log`
  - MCP: `{"action":"log", ...}`
- Extend DB schema with `usage_logs`.
- Add helpers to record usage per call (you can manually send token counts initially).
- Implement `GET /timeline` to return recent events.
- Implement `action: "status"` to show counts and last activity.

### Done when

- You can record events from your own tools (even via simple curl or scripting).
- You can fetch a project timeline.
- You get a feel for how your AI usage distributes across projects.

---

## M4 — Auto-capture pipeline (week 4-ish)

### Goals

- Automatically capture AI interactions and link them to project files without user effort.

### Components

- **Interceptor**: proxy / hook layer that sits between the user and AI tools, capturing request–response pairs (prompts, completions, token counts).
- **Classifier**: tags each captured event by type (code generation, debugging, research, refactor, etc.) using lightweight heuristics or a small LLM call.
- **File event linker**: correlates captured AI interactions with file system events (file creates, edits, deletes) within a configurable time window (~60 seconds default) to build a causal timeline of "AI said X → user changed file Y."

### Tasks

- Build interceptor for REST-based AI calls (GPT wrapper, fetch hooks).
- Build MCP-level interceptor for tool calls going through Endeavor.
- Implement classifier with rule-based first pass (keyword matching on prompt content), optional LLM-based classification behind a flag.
- Implement file event linker: correlate file watcher events with recent AI interactions using timestamp proximity.
- Store linked events in the `events` table with foreign keys to both the AI interaction and the file change.
- Expose via REST: `GET /timeline` (already exists, enrich with linked data).

### Done when

- AI interactions are captured without the user calling `/log` manually.
- Each captured interaction is tagged with a type.
- File changes that happen shortly after an AI response are linked to that interaction in the timeline.

---

## M5 — MCP server (week 5-ish)

### Goals

- A polished single-tool MCP interface that any compatible client can use.

### Session-level auto-injection (main token trick)

The primary token optimization strategy is **session-level auto-injection**: when an MCP session starts, Endeavor injects a compact context block once at the beginning of the conversation rather than on every tool call. This keeps per-turn overhead near zero while still giving the AI full project awareness. The injected block is refreshed only when the project state changes meaningfully (new files indexed, significant events logged), not on every interaction.

### Tasks

- Finalize the `endeavor` tool schema (actions: `status`, `context`, `log`, `search`, `timeline`).
- Implement session-level context injection on MCP session init.
- Add a lightweight diff check so re-injection only happens on meaningful state changes.
- Test with Claude Desktop, Cursor, and Antigravity.

### Done when

- An MCP client connects and immediately has project context without explicit tool calls.
- Per-turn token overhead is under 200 tokens (excluding the initial injection).
- The single-tool interface works cleanly across at least two MCP clients.

---

## M6 — Personal integrations (week 6-ish)

### Goals

- Actually use Endeavor Core with your real tools.

### Tasks

- Define a simple integration contract (JSON payloads, endpoints) so any tool or adapter knows how to talk to Endeavor Core.
- Build 1–2 example adapters (e.g., GPT wrapper, n8n node) as reference implementations.
- Configure Claude Desktop to talk to the MCP server.
- Configure Cursor (or other IDE) similarly.
- Write a small wrapper for GPT API calls that:
  - requests `context` from Endeavor Core first
  - prepends it to the prompt
  - logs the interaction and token usage via `/log`
- Try it on a real project you care about.
- Adjust context builder based on what does/doesn't feel useful.

### Done when

- You're using Endeavor Core in your daily work.
- You see a real project timeline being populated.
- You're starting to see where the cockpit UI would be useful.

---

## M7 — Cockpit v0 (visualization) (week 7+)

### Goals

- A simple web UI that reads from Endeavor Core and shows:
  - project list
  - per-project timeline
  - current context block
  - basic usage stats

### Tasks

- Build web app:
  - sidebar with projects
  - main view with timeline + context preview
  - simple usage chart (tokens per tool)
- Wire UI to REST API.
- Make it stable enough for daily use.

### Done when

- You can open the cockpit, pick a project, and see what Core knows.
- You don't have to hit curl or CLI to inspect state.

---

## M8 — Polish & publish

### Goals

- Ship a usable, tested, documented package.

### Tasks

- Benchmarks written and published (token overhead vs. alternatives).
- npm publish `@endeavor/plugin`.
- CLI polished.
- Integration tests passing.
- README + setup docs complete.
- Bug fixes from real usage.

### Done when

- Someone can `npm install @endeavor/plugin`, follow the README, and have it working in under 10 minutes.

---

## After M8 — post-core work (priority order)

Once the core is stable and in daily use, the following are next in priority order:

1. **Web UI improvements** — richer cockpit with filtering, search, and drill-down on timeline events
2. **Cost dashboard** — per-project, per-tool, per-day cost breakdowns with budget alerts
3. **CONTEXT.md generator** — auto-generate a portable project summary file that any AI tool can ingest without Endeavor installed
4. **Local embedding fallback** — transformers.js-based embeddings for zero-cost, fully offline operation
5. **Session replay** — replayable view of an AI-assisted work session (prompts, responses, file changes, timeline)

### Lower priority (post-core)

- **Desktop Electron app** — unified place to use all your AI tools with a dashboard; deferred because the web UI covers the critical visibility needs first
- **Project management agent** — active orchestration layer that structures projects, surfaces blockers, and generates reports; out of scope for now, will design based on real user feedback

---

## Open questions

- **60-second window tuning**: the file event linker uses a ~60s window to correlate AI responses with file changes. Is this too tight for slow workflows (thinking, reading docs) or too loose (capturing unrelated edits)? Needs real-world data to tune. May need per-user or per-project configurability.

- **Large project indexing performance**: projects with 10K+ files could cause slow initial indexing and high memory usage. Need to benchmark and consider: incremental indexing, file-size caps, prioritizing recently-changed files, and lazy embedding (only embed on first query that needs a file).

- **Default file selection heuristic**: when building context, how should we pick which files to include by default (before the user asks a specific query)? Options: most recently modified, most frequently referenced in AI conversations, closest to the current working file, or a weighted combination. Also: how aggressively should we summarize vs. include full content for the default context block?

---

## Notes

- Keep the core small and understandable.
- Use real projects as test cases, not synthetic ones.
- Write basic tests for anything that feels like infrastructure (DB init, context building).
- Iterate on context formatting based on what makes your own prompts work better.
