# endeavor-core — plan.md

> Working plan for Endeavor Core (AI Tool Bus) and the first layer of the Cockpit.
> This is a living document.

---

## High-level milestones

1. **Core server**: MCP + REST skeleton, no indexing
2. **Indexing & context**: file watcher, embeddings, context builder
3. **Events & usage**: logging timeline + basic usage tracking
4. **Personal integrations**: wire into your own Claude/Cursor/GPT setup
5. **Cockpit v0**: simple UI to read what Core knows

The idea: get something usable on your own projects quickly, then iterate.

---

## Milestone 1 — Core server (week 1-ish)

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

### When this milestone is done

- You can start the server.
- Claude Desktop (pointed at this MCP server) can call `endeavor` with `{"action":"status"}` and get a simple answer.
- You can register a project via REST and see it in the DB.

---

## Milestone 2 — Indexing & context (week 2-ish)

### Goals

- Watch project files, keep a semantic index.
- Build a context block for a project and optional query.

### Tasks

- Implement file watcher for a project path:
  - `add`/`change` → read file, chunk content, store chunks
  - ignore `node_modules`, `.git`, `dist`, etc.
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

### When this milestone is done

- You can point the server at one of your existing projects.
- Files are indexed as you work.
- You can ask for context for a query and get a reasonable block of text.
- Claude/Cursor can retrieve context via MCP instead of you pasting everything.

---

## Milestone 3 — Events & usage (week 3-ish)

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

### When this milestone is done

- You can record events from your own tools (even via simple curl or scripting).
- You can fetch a project timeline.
- You get a feel for how your AI usage distributes across projects.

---

## Milestone 4 — Personal integrations (week 4-ish)

### Goals

- Actually use Endeavor Core with your real tools.

### Tasks

- Configure Claude Desktop to talk to the MCP server.
- Configure Cursor (or other IDE) similarly.
- Write a small wrapper for GPT API calls that:
  - requests `context` from Endeavor Core first
  - prepends it to the prompt
  - logs the interaction and token usage via `/log`
- Try it on a real project you care about.
- Adjust context builder based on what does/doesn't feel useful.

### When this milestone is done

- You’re using Endeavor Core in your daily work.
- You see a real project timeline being populated.
- You’re starting to see where the cockpit UI would be useful.

---

## Milestone 5 — Cockpit v0 (visualization) (week 5+)

### Goals

- A simple UI (web or desktop) that reads from Endeavor Core and shows:
  - project list
  - per-project timeline
  - current context block
  - basic usage stats

### Tasks

- Pick UI stack: Electron app or web app.
- Build:
  - sidebar with projects
  - main view with timeline + context preview
  - simple usage chart (tokens per tool)
- Wire UI to REST API.
- Make it stable enough for daily use.

### When this milestone is done

- You can open the cockpit, pick a project, and see what Core knows.
- You don’t have to hit curl or CLI to inspect state.

---

## Notes

- Keep the core small and understandable.
- Use real projects as test cases, not synthetic ones.
- Write basic tests for anything that feels like infrastructure (DB init, context building).
- Iterate on context formatting based on what makes your own prompts work better.

