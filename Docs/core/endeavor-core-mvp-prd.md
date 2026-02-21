# Endeavor Core: AI Tool Bus (MVP PRD)

**Name**: Endeavor Core — AI Tool Bus (MVP)
**Date**: Feb 20, 2026
**Scope**: First component only — custom MCP/API server you can use on real projects
**Status**: Draft

---

## 1. Problem

You use multiple AI tools (Claude Desktop, Cursor, GPT API, etc.) in the same project.
Today, each tool:
- Knows nothing about what the others did.
- Requires you to re-explain the project context.
- Re-ingests the same files and notes repeatedly, wasting tokens.

Naive MCP setups make this worse:
- Exposing many tools at once can "burn" tens of thousands of tokens just on tool definitions.
- Context and history are fragmented across tools and logs.

You want a **single local component** that:
- Connects your tools to your projects.
- Manages context once.
- Routes requests efficiently.
- Records a unified timeline of AI interactions per project.

This is the **spine** everything else will build on.

---

## 2. Solution Overview

**Endeavor Core** is a local "AI tool bus" with two faces:

1. **MCP meta-tool (stdio)**
   - Exposed as a single tool (e.g., `endeavor`) to MCP-capable clients (Claude Desktop, Cursor, Windsurf).
   - Internally routes `action`s like `context`, `search`, `log`, `status`.

2. **REST API**
   - Local HTTP API other clients can call (custom agents, scripts, future cockpit UI).
   - Provides context blocks, logging, and project timelines.

Everything runs on your machine, backed by a local SQLite + vector index. No cloud dependencies except the embedding/model APIs you choose.

---

## 3. Objectives

**Primary:**
- Make it easy for you to plug your own AI tools into a shared, efficient context layer.
- Avoid MCP token overhead by using a single meta-tool.
- Provide a clean, understandable codebase.

**Secondary:**
- Be useful as a standalone open-source component.
- Provide solid benchmarks and diagrams.

---

## 4. Core Concepts

### 4.1 Project

A project is a folder on disk (e.g. a repo, research notebook, or app). Endeavor Core tracks:
- Path
- Type (optional: `software`, `research`, `other`)
- Created/updated timestamps

### 4.2 Tools

Logical names and configs for AI tools you use, e.g.:
- `claude_desktop`
- `cursor`
- `gpt_api`

They are **callers** of Endeavor Core, not something Core calls out to.

### 4.3 Events

Atomic units in a project timeline, e.g.:
- "Claude answered a question about auth at 14:32"
- "You accepted a refactor suggestion and committed it"

Stored with:
- project_id
- tool
- kind (`prompt`, `response`, `decision`, `note`, etc.)
- summary text
- timestamp
- optional metadata (e.g. link to full convo)

### 4.4 Context

A formatted text block Endeavor Core builds per-request, including:
- Short project summary
- Recent relevant events
- Most relevant file snippets
- Key decisions

Returned as plaintext; callers can prepend it to prompts.

---

## 5. Architecture

### 5.1 High-Level Diagram

```
                ┌─────────────────────────────┐
                │   Claude Desktop / Cursor  │
                │   (MCP clients)            │
                └────────────┬───────────────┘
                             │ MCP (stdio)
                             ▼
                   ┌───────────────────┐
                   │  Endeavor Core   │
                   │   (Node server)  │
                   └───────────────────┘
                             ▲
       REST (localhost)      │
┌──────────────────────┐     │   ┌──────────────────────┐
│  Custom agents/CLIs  │─────┘   │  Future cockpit UI   │
└──────────────────────┘         └──────────────────────┘

Internals of Endeavor Core:

┌───────────────────────────────────────────────────────────┐
│ Endeavor Core                                             │
│                                                           │
│  ┌───────────────┐   ┌────────────────┐   ┌────────────┐ │
│  │ MCP Server    │   │ REST API       │   │ Event Bus  │ │
│  └──────┬────────┘   └──────┬─────────┘   └────┬───────┘ │
│         │                   │                  │         │
│         ▼                   ▼                  ▼         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │          Context & Timeline Engine                  │ │
│  │  - project registry                                 │ │
│  │  - file index + embeddings                          │ │
│  │  - event log                                        │ │
│  │  - context builder (token limits aware)             │ │
│  └─────────────────────┬───────────────────────────────┘ │
│                        │                                 │
│      ┌─────────────────▼────────────────────┐            │
│      │        SQLite + Vector Index        │            │
│      └──────────────────────────────────────┘            │
└───────────────────────────────────────────────────────────┘
```

### 5.2 Tech Stack

- Language: TypeScript (Node.js)
- DB: SQLite via `better-sqlite3`
- Vector index: local (e.g. Vectra) with optional OpenAI embeddings
- HTTP: Fastify or Express
- MCP: stdio server following MCP best practices

---

## 6. MCP Meta-tool Design

### 6.1 Single Tool Schema

Expose exactly one tool over MCP:

```jsonc
{
  "name": "endeavor",
  "description": "Access project-aware context and log events for this workspace.",
  "input_schema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["context", "search", "log", "status"]
      },
      "query": { "type": "string" },
      "summary": { "type": "string" },
      "kind": { "type": "string" },
      "metadata": { "type": "object" }
    },
    "required": ["action"],
    "additionalProperties": false
  }
}
```

This follows the "meta-tool" / "bounded context" pattern recommended for token-efficient MCP: one tool, internal routing. 

### 6.2 Actions

- `action: "context"`
  - Input: `{ query?: string }`
  - Behavior: build context block for current project and query
  - Output: `{ context: string, tokens: number, sources: { files: string[], events: number[] } }`

- `action: "search"`
  - Input: `{ query: string }`
  - Behavior: semantic search over indexed files + events
  - Output: `{ results: Array<{ type: "file"|"event", score: number, snippet: string }> }`

- `action: "log"`
  - Input: `{ summary: string, kind?: string, metadata?: object }`
  - Behavior: append an event to project timeline
  - Output: `{ ok: true, eventId: number }`

- `action: "status"`
  - Input: none
  - Output: basic project stats (num events, tracked files, last updated)

### 6.3 Project Detection

For MCP clients, project identity is inferred from:
- The working directory path provided by the client (if available), or
- A configured root path per client session.

Endeavor Core normalizes this to its internal `project_id`.

---

## 7. REST API Design

Base URL: `http://127.0.0.1:31415` (for example)

### 7.1 `POST /projects`

Create or register a project.

Request:
```json
{ "path": "/absolute/path", "type": "software" }
```

Response:
```json
{ "id": "proj_123", "path": "/absolute/path", "type": "software" }
```

### 7.2 `GET /projects`

List known projects.

Response:
```json
[{ "id": "proj_123", "path": "...", "type": "software" }]
```

### 7.3 `POST /context`

Get a context block for a project.

Request:
```json
{ "projectId": "proj_123", "query": "auth middleware" }
```

Response:
```json
{
  "context": "# Project: ...
...",
  "tokens": 1875,
  "sources": {
    "files": ["src/auth.ts", "src/middleware/auth.ts"],
    "events": [12, 19]
  }
}
```

### 7.4 `POST /log`

Append an event to the timeline.

Request:
```json
{
  "projectId": "proj_123",
  "tool": "claude_desktop",
  "kind": "decision",
  "summary": "Chose JWT auth over sessions for API clients.",
  "metadata": { "why": "stateless, easier scaling" }
}
```

Response:
```json
{ "ok": true, "eventId": 42 }
```

### 7.5 `GET /timeline`

Get recent events for a project.

Query params: `?projectId=proj_123&limit=50`

Response:
```json
{
  "events": [
    {
      "id": 42,
      "tool": "claude_desktop",
      "kind": "decision",
      "summary": "Chose JWT auth over sessions for API clients.",
      "timestamp": 1740000000
    }
  ]
}
```

---

## 8. Data Model

SQLite tables (simplified):

```sql
CREATE TABLE projects (
  id         TEXT PRIMARY KEY,
  path       TEXT NOT NULL,
  type       TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE files (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path       TEXT NOT NULL,
  mtime      INTEGER,
  size       INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE file_chunks (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_id    TEXT NOT NULL,
  content    TEXT NOT NULL,
  embedding  BLOB,
  tokens     INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (file_id) REFERENCES files(id)
);

CREATE TABLE events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  tool       TEXT,
  kind       TEXT,
  summary    TEXT NOT NULL,
  metadata   TEXT,
  timestamp  INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE usage_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  tool       TEXT,
  model      TEXT,
  tokens_in  INTEGER,
  tokens_out INTEGER,
  cost_usd   REAL,
  timestamp  INTEGER
);
```

---

## 9. Context Engine Behavior

### 9.1 Inputs

- `projectId`
- Optional `query`
- Model info (to set token budgets)

### 9.2 Steps

1. Identify relevant file chunks via semantic search.
2. Identify recent relevant events (decisions, notes) using embeddings.
3. Build a context skeleton:
   - 1–3 lines: project summary
   - Short section: recent relevant events
   - Short section: file snippets
4. Pack into token budget using greedy strategy:
   - include most relevant chunks fully until ~60–70% of budget
   - include summarized versions next
   - include references (paths only) for the rest
5. Return formatted markdown/plaintext.

---

## 10. Non-goals for MVP

- No UI
- No automatic modification of project files
- No background agents
- No complex scheduling

Just: **a clean MCP + REST core you can plug your existing tools into.**

---

## 11. Definition of Done

- MCP server runnable locally, exposes `endeavor` tool.
- REST API with `/projects`, `/context`, `/log`, `/timeline` working.
- File indexing and embedding working for at least one project folder.
- Context builder respects token budgets.
- You can point Claude Desktop and/or Cursor to this server and:
  - get context via `endeavor` without manual copy-paste
  - log decisions with `endeavor`.
- Minimal tests for core pieces (DB init, embeddings, context building).
- Clear README with setup instructions.
