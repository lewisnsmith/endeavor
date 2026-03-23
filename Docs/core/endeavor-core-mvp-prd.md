# Endeavor: The Claude Code Operating System (MVP PRD)

**Name**: Endeavor — TUI Workflow Dashboard for Claude Code
**Date**: March 18, 2026
**Scope**: MVP — terminal-native coordination layer for parallel Claude Code sessions
**Status**: Draft

---

## 1. Product Vision

Endeavor is the **Claude Code operating system**: a single-terminal flywheel that turns parallel agent chaos into coordinated, human-directed work.

Where generic multiplexers (tmux, Zellij) give you panes and where broad multi-AI orchestrators (CodeAgentSwarm, aider) give you automation, Endeavor gives you **control**. It owns the graph of what each session is doing, what decisions were made, what depends on what, and when a human needs to step in — information that no pane layout or code agent tracks.

### The Core Insight

Multi-session Claude Code work has a structural problem that panes can't solve: the dependency graph. When Session 2 is blocked by Session 5's interface contract, and Session 7 is waiting for Session 2's output, you need topological awareness, not more terminal windows. Endeavor models this as a DAG, surfaces the critical path, and routes human attention exactly where it matters.

### Competitive Differentiation

| Dimension | tmux / Zellij | CodeAgentSwarm | **Endeavor** |
|---|---|---|---|
| Session visibility | Pane grid (dumb) | Agent list | Live status grid with color-coded state |
| Dependencies | None | None | **First-class DAG — blocks/is-blocked-by** |
| Decision history | None | None | **Queryable per-session handoff log** |
| Human routing | None | Notifications | **Attention queue with keystroke triage** |
| Spawn model | Manual tmux splits | Automated | **One-keystroke spawn with context seeding** |
| Scope | Any terminal app | Any AI agent | **Claude Code session model — native fit** |

The math/research edge: dependency graphs with topological sort for ready queues, critical-path detection for blocking chains, and priority scoring that mixes session urgency with human attention cost.

---

## 2. Problem

You're running 4–8 parallel Claude Code sessions on a project. Right now:

- **No session has awareness of others.** Session 3 duplicates work Session 1 already finished. Session 6 waits on an interface that Session 2 changed an hour ago but never announced.
- **You have no single view.** You switch between tmux panes, mentally tracking state that should be tracked by a tool.
- **Handoffs are lossy.** When you stop a session and hand off to a new one, the decision context ("why we rejected approach B") lives in your head or in a chat scroll nobody re-reads.
- **Attention is unrouted.** Sessions that need human input (unblock decisions, conflicting proposals, test failures requiring judgment) have no way to escalate. They either stall or proceed with wrong assumptions.
- **Dependencies are invisible.** You don't know that 3 sessions are blocked on one upstream decision until you've wasted cycles.

---

## 3. Solution Overview

Endeavor is a **terminal-native TUI dashboard** that runs alongside your Claude Code sessions. It does four things:

1. **Observes** — reads the Endeavor DB to display a live grid of all sessions and their current status.
2. **Routes** — surfaces sessions that need human attention to an attention queue you triage with single keystrokes.
3. **Connects** — models the dependency graph between sessions, highlighting blocked chains and surfacing the critical path.
4. **Records** — keeps a queryable log of decisions, handoffs, and cross-session context so nothing is lost between sessions.

This is **not** a coding agent. Endeavor does not write code. It coordinates the agents that do.

---

## 4. Core Concepts

### 4.1 Sessions

A session is one running `claude` process in a worktree. Endeavor tracks:

- Session ID and human label (e.g., "auth-refactor", "database-migration")
- Current status: `idle` | `working` | `waiting` | `error` | `attention-needed`
- Work item(s) assigned
- Worktree path and git branch
- Last activity timestamp

Status is color-coded in the dashboard:

| Status | Color | Meaning |
|---|---|---|
| `idle` | Gray | Session paused or finished its current task |
| `working` | Green | Active, making progress |
| `waiting` | Yellow | Blocked on a dependency or external signal |
| `error` | Red | Encountered an unrecoverable error state |
| `attention-needed` | Magenta (blinking) | Requires human judgment to proceed |

### 4.2 Work Items

A unit of work assigned to a session. Statuses: `todo` → `in_progress` → `blocked` → `done` / `cancelled`. Each work item has done criteria, an optional assignee session, and can carry dependencies on other items.

### 4.3 Dependency Graph

The central data structure. Directed edges between work items encode blocking relationships:

- `A blocks B`: B cannot start or complete until A is done.
- Displayed in the dashboard as a DAG view and surfaced in session detail.
- Topological sort of the DAG produces the **ready queue**: work items with no unsatisfied blockers.
- Critical path (longest chain from source to sink) is highlighted to show where schedule risk lives.

### 4.4 Decisions

A timestamped, searchable log of choices made during the session, with rationale. Format:

```
[session-id] [timestamp] DECISION: <what was decided>
RATIONALE: <why>
ALTERNATIVES_CONSIDERED: <what was rejected and why>
```

Queryable with `?` in the dashboard. "What did Session 3 decide about the auth approach?" returns the relevant decision log.

### 4.5 Handoffs

A structured context transfer between sessions (or between a session and a future session). Includes:

- Work completed
- Decisions made
- Open questions
- Next suggested actions

Handoffs are stored in the DB and surfaced when spawning a new session, so the incoming session starts with full context.

### 4.6 Attention Queue

Sessions in `attention-needed` state push a message to the attention queue. The queue is the canonical list of things that require human judgment, ordered by urgency. You triage it from the dashboard without switching terminal panes.

---

## 5. TUI Dashboard — UX Design

### 5.1 Main Grid View

The default view. A table of all active and recent sessions:

```
┌─ ENDEAVOR ──────────────────────────────── project: my-app ──── 08:42:31 ─┐
│                                                                             │
│  #   SESSION           STATUS           WORK ITEM              UPDATED      │
│  ─── ──────────────── ──────────────── ────────────────────── ──────────── │
│  1   auth-refactor    ● WORKING        Implement JWT refresh  2m ago       │
│  2   db-migration     ◐ WAITING        Schema v3 migration    8m ago       │
│  3   api-gateway      ✓ IDLE           Gateway routing done   14m ago      │
│  4   frontend-auth    ✗ ERROR          Build failed           1m ago       │
│  5   test-suite       ▲ ATTENTION      Needs test strategy    just now     │
│  6   docs             ● WORKING        API reference          5m ago       │
│                                                                             │
│  ATTENTION QUEUE  [1 item]                                                  │
│  ▲ Session 5: Conflicting test frameworks — choose Jest or Vitest? [Enter] │
│                                                                             │
│  BLOCKED CHAIN: Session 2 → Session 1 → Session 5 (critical path)          │
│                                                                             │
│  [↑↓] navigate  [Enter] dive in  [n] new session  [d] decisions            │
│  [h] handoff    [q] quit         [?] search        [g] dep graph           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Session Detail View

One-keystroke drill-down (`Enter` on a session row) opens the session detail:

```
┌─ SESSION 5: test-suite ─────────────────────────────── [Esc] back ─────────┐
│                                                                             │
│  STATUS:  ▲ ATTENTION NEEDED                                                │
│  BRANCH:  feat/test-suite                                                   │
│  ITEM:    Set up integration test framework                                 │
│                                                                             │
│  ATTENTION REQUEST:                                                         │
│  "Two testing frameworks are viable: Jest (familiar, heavier) vs Vitest    │
│   (faster, native ESM). Architecture decision affects Sessions 1, 2, 4.    │
│   Please choose."                                                           │
│                                                                             │
│  DECISIONS:                                                                 │
│  [1] 09:12 — Used Zod for validation over Joi (simpler types)              │
│  [2] 08:45 — Chose REST over GraphQL for external API surface              │
│                                                                             │
│  DEPENDENCIES:                                                              │
│  Blocks: Session 1 (auth), Session 2 (db), Session 4 (frontend)            │
│  Blocked by: none                                                           │
│                                                                             │
│  [r] respond/unblock  [d] log decision  [h] create handoff  [↑↓] scroll   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Dependency Graph View (`g`)

```
┌─ DEPENDENCY GRAPH ──────────────────────────────────────────────────────────┐
│                                                                             │
│  READY (no blockers):                                                       │
│    Session 3 — api-gateway (IDLE)                                          │
│    Session 6 — docs (WORKING)                                              │
│                                                                             │
│  BLOCKED CHAIN [CRITICAL PATH]:                                             │
│    Session 5 (test-suite) ──blocks──► Session 1 (auth-refactor)            │
│                            ──blocks──► Session 2 (db-migration)            │
│                            ──blocks──► Session 4 (frontend-auth)           │
│                                                                             │
│  TOPOLOGICAL ORDER (ready queue):                                           │
│    [1] Session 5  [2] Sessions 1,2,4  [3] Session 3,6                     │
│                                                                             │
│  Longest blocking chain: 3 sessions deep. Resolving Session 5 unblocks 3. │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Decision Search (`?`)

Fuzzy-search across all session decision logs:

```
Search decisions > auth

  [Session 1 · 09:41] JWT refresh token strategy — used httpOnly cookies
  [Session 2 · 08:45] PostgreSQL over MongoDB — schema migrations cleaner
  [Session 5 · 08:12] Rejected session-based auth — stateless API requirement
```

### 5.5 Spawn Session (`n`)

One-keystroke session spawning with context seeding from the DB:

```
┌─ NEW SESSION ────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Label:      [payment-integration            ]                               │
│  Work item:  [Integrate Stripe webhook handling]                             │
│  Branch:     [feat/payment-integration       ]  (auto from label)            │
│  Seed from:  [Session 3 (api-gateway) handoff] ↓                            │
│                                                                              │
│  Context preview (will be injected into new session):                        │
│  • API uses REST with Zod validation                                         │
│  • Auth uses JWT with httpOnly refresh cookies                               │
│  • Session 3 handoff: routing layer complete, webhook endpoint stubbed       │
│                                                                              │
│  [Enter] spawn  [Esc] cancel                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Architecture

### 6.1 Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Endeavor TUI (packages/tui/)                                               │
│  ─ blessed / ink terminal rendering                                         │
│  ─ Key bindings and view state machine                                      │
│  ─ Real-time DB polling (100ms) for session status updates                  │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │ reads/writes
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Endeavor Core (packages/core/)                                             │
│  ─ Endeavor facade: central API surface                                     │
│  ─ Repositories: sessions, work_items, decisions, handoffs, dependencies    │
│  ─ DAG engine: topological sort, critical path, ready queue                 │
│  ─ SQLite via better-sqlite3, WAL mode                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────────────────┐
│  Endeavor CLI (packages/cli/)                                               │
│  ─ Commander.js CLI for scripted access                                     │
│  ─ All commands available as --json for machine consumption                  │
│  ─ Session agents call CLI to log decisions, request handoffs, flag attention│
└─────────────────────────────────────────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────────────────┐
│  Endeavor Daemon (packages/daemon/)                                         │
│  ─ Watches DB for session status changes                                    │
│  ─ Pushes attention-needed alerts to TUI event stream                       │
│  ─ Detects stale sessions (no activity > threshold)                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 How Sessions Report State

Sessions are Claude Code agents running in worktrees. They communicate with Endeavor through the CLI:

```bash
# A session reports it's working
endeavor work update w_abc123 --status in_progress

# A session logs a decision
endeavor decision add "Chose Vitest over Jest — faster, native ESM" \
  --work-item w_abc123 --rationale "Build times 40% faster in benchmark"

# A session flags it needs human input
endeavor work update w_abc123 --status blocked \
  --attention "Conflicting test frameworks detected, need human choice"

# A session creates a handoff before terminating
endeavor handoff create \
  --from-session s_abc123 \
  --summary "Auth layer complete. JWT refresh implemented via httpOnly cookies." \
  --next-actions "Wire auth middleware into API gateway routes"
```

### 6.3 DAG Engine

Core logic for dependency graph traversal:

```typescript
// Topological sort → ready queue
function readyQueue(items: WorkItem[], edges: Dependency[]): WorkItem[] {
  // Kahn's algorithm on the dependency DAG
  // Returns items with in-degree 0 (no unsatisfied blockers)
}

// Critical path (longest chain)
function criticalPath(items: WorkItem[], edges: Dependency[]): WorkItem[] {
  // Longest path in DAG via dynamic programming
  // Highlights the chain where resolving the head unblocks the most work
}

// Cycle detection (prevent circular dependencies)
function detectCycles(edges: Dependency[]): Dependency[] | null {
  // DFS-based cycle detection
}
```

### 6.4 Monorepo Structure

```
packages/
  core/      Domain logic: sessions, work items, decisions, handoffs,
             dependencies, DAG engine, logger, SQLite storage
  cli/       Commander.js CLI — reads/writes core for session agent use
  daemon/    Background process — watches DB, pushes status change events
  tui/       Terminal UI — blessed/ink rendering, key bindings, view state
```

### 6.5 Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript strict | Type-safe graph operations, NodeNext modules |
| Storage | SQLite via better-sqlite3 | Zero-config, WAL mode for parallel session writes |
| TUI | Blessed or Ink | Full terminal control, box-drawing chars, color |
| IDs | nanoid with prefixes | `s_`, `w_`, `d_`, `dep_`, `h_`, `dc_` |
| Tests | Vitest | Co-located `*.test.ts`, globals: true |

---

## 7. Data Model

### 7.1 Schema

```sql
-- Active and historical sessions
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,         -- s_nanoid
  label       TEXT NOT NULL,            -- human name e.g. "auth-refactor"
  status      TEXT NOT NULL DEFAULT 'idle',  -- idle|working|waiting|error|attention-needed
  branch      TEXT,
  worktree    TEXT,
  project_id  TEXT NOT NULL,
  attention_msg TEXT,                   -- set when status = attention-needed
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Units of work
CREATE TABLE work_items (
  id          TEXT PRIMARY KEY,         -- w_nanoid
  project_id  TEXT NOT NULL,
  session_id  TEXT,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'todo',  -- todo|in_progress|blocked|done|cancelled
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Decisions made by sessions
CREATE TABLE decisions (
  id          TEXT PRIMARY KEY,         -- d_nanoid
  project_id  TEXT NOT NULL,
  session_id  TEXT,
  work_item_id TEXT,
  summary     TEXT NOT NULL,
  rationale   TEXT,
  alternatives_considered TEXT,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Blocking relationships between work items (the DAG edges)
CREATE TABLE dependencies (
  id          TEXT PRIMARY KEY,         -- dep_nanoid
  blocker_id  TEXT NOT NULL,            -- work item that blocks
  blocked_id  TEXT NOT NULL,            -- work item that is blocked
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (blocker_id) REFERENCES work_items(id),
  FOREIGN KEY (blocked_id) REFERENCES work_items(id)
);

-- Context handoffs between sessions
CREATE TABLE handoffs (
  id              TEXT PRIMARY KEY,     -- h_nanoid
  project_id      TEXT NOT NULL,
  from_session_id TEXT NOT NULL,
  to_session_id   TEXT,                 -- null until a new session claims it
  summary         TEXT NOT NULL,
  decisions_made  TEXT,                 -- JSON array of decision IDs
  open_questions  TEXT,
  next_actions    TEXT,
  created_at      INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (from_session_id) REFERENCES sessions(id)
);

-- Completion criteria for work items
CREATE TABLE done_criteria (
  id          TEXT PRIMARY KEY,         -- dc_nanoid
  work_item_id TEXT NOT NULL,
  criterion   TEXT NOT NULL,
  met         INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (work_item_id) REFERENCES work_items(id)
);

-- Projects (repo roots)
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,         -- p_nanoid
  path        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
```

### 7.2 Key Invariants

- A session may only be in `attention-needed` if `attention_msg` is set.
- A work item in `blocked` must have at least one unsatisfied dependency row.
- Dependency edges must form a DAG — the DAG engine validates on every edge insertion.
- Handoffs are immutable once created; new context goes in a new handoff.

---

## 8. MVP Feature Set

### Must-have for MVP

| Feature | Description |
|---|---|
| Live session grid | Color-coded status table, auto-refreshing every 100ms |
| Session drill-down | Single-keystroke detail view with decisions and deps |
| Attention queue | Surfaced in main view, triage with Enter |
| Dependency graph view | DAG rendered as text, topological sort, critical path |
| Decision log | Per-session, searchable with `?` |
| Session spawning | `n` to spawn with handoff context seeding |
| Handoff creation | `h` from session detail to record context transfer |
| CLI reporting | Sessions call CLI to update status, log decisions, flag attention |
| SQLite storage | WAL mode for concurrent session writes |
| Worktree detection | Shares one `.endeavor/` DB across all worktrees of a repo |

### Out of scope for MVP

- Web UI or Electron app (TUI is the product)
- AI-driven orchestration or autonomous session management
- Cloud sync or multi-machine support
- Integration with non-Claude-Code AI tools (that's a post-MVP expansion)
- GitHub/Linear/Jira integration
- Cost/token tracking (post-MVP)

---

## 9. Definition of Done

MVP is complete when:

- [ ] TUI launches with `endeavor tui` and shows the session grid
- [ ] Sessions can report status via `endeavor work update` CLI
- [ ] Sessions can log decisions via `endeavor decision add` CLI
- [ ] Sessions can flag attention with a message
- [ ] Main grid color-codes all 5 status states correctly
- [ ] `Enter` opens session detail with decisions and dependency info
- [ ] `g` opens the DAG view with topological order and critical path highlighted
- [ ] `?` searches across all decisions
- [ ] `n` spawns a session prompt pre-seeded with latest relevant handoff context
- [ ] `h` creates a handoff from the current session
- [ ] Dependencies can be added between work items and cycle detection runs
- [ ] All data persists in `.endeavor/endeavor.db` (project-local)
- [ ] Concurrent session writes don't corrupt the DB (WAL mode tested)
- [ ] Core, CLI, daemon, and TUI packages all build and pass CI
- [ ] README explains the model and has a 5-minute setup guide

---

## 10. Why This Wins: The Portfolio Angle

The pitch is crisp: **no one else ships a Claude Code operating system**.

tmux solves pane layout. CodeAgentSwarm solves automation. Nothing models the *graph of decisions that makes multi-session work scale* — the DAGs, the queryable handoffs, the attention routing. That's the math/research edge that makes this a standout portfolio piece (Stanford/MIT apps): you're not just building a dashboard, you're building a coordination layer with computer-science-grounded primitives (DAGs, topological sort, critical path) applied to a new domain (human-in-the-loop AI workflow management).

The moat is the session model, not the UI. Once sessions are logging decisions and handoffs into a structured DB, you can answer questions no other tool can answer: "What did the auth session decide last Tuesday?", "Which sessions are blocked on the database session?", "What's the fastest path to unblocking the frontend?"

That's the flywheel: the more sessions log, the more valuable the graph becomes.
