# Endeavor Cockpit: AI Project Orchestration (Scaling PRD)

**Name**: Endeavor Cockpit — AI-Native Project Orchestration
**Date**: Feb 20, 2026
**Depends on**: Endeavor Core (MVP AI Tool Bus)
**Status**: Draft

---

## 1. Vision — The AI Project Cockpit / Hangar

Endeavor Cockpit is the **AI project cockpit / hangar**: the single application to house, manage, run, examine, modify, amend, fix, and track **all** AI tools, agents, and automations pertaining to a project.

Core idea:
- **One cockpit per project**, containing:
  - **Registered tools / agents** — every AI tool and agent active on the project, visible and manageable in one place.
  - **Timeline** — an ordered stream of all AI interactions, commits, and key decisions.
  - **Context** — the shared, token-efficient context block injected into every tool.
  - **Token / cost usage** — per-tool, per-model spend and forecasting.
- All AI tools that touch the project share context and contribute to the unified timeline.
- You see what each tool did, when, and why.
- You manage tasks, decisions, and AI usage in one place.

It builds directly on Endeavor Core, which handles the MCP/REST plumbing, indexing, and token-efficient context.

---

## 2. User Story

> "I’m building an app and an ML model at the same time. I use Claude for architecture discussions, Cursor for coding, GPT for quick sanity checks, and a custom agent for data cleaning. Right now, everything is scattered. I want a single place per project where I can see the story of what happened, push context into any tool, and avoid repeating myself."

---

## 3. Core Capabilities

### 3.1 Cockpit per project

For each tracked project, the cockpit shows:

- **Timeline**: ordered events (AI interactions, commits, key decisions).
- **Shared context**: the current context block Endeavor Core would return.
- **Tools**: which AI tools are in play and how much each is used.
- **Tasks**: light backlog/doing/done board.

### 3.2 Unified timeline of AI interactions

- Stream of events from Endeavor Core's `events` table.
- Each event shows:
  - tool (Claude, Cursor, GPT, custom)
  - kind (`prompt`, `response`, `decision`, `note`)
  - summary
  - time
- Ability to filter by tool or kind.

### 3.3 Context preview and manual send

- A panel that shows the current `context` for a given project (as returned by `/context`).
- One-click copy.
- For tools where programmatic injection is possible, buttons like "Open Claude with this context" (later integration step).

### 3.4 Token and cost analytics

- Per project: total tokens + cost, broken down by tool and model.
- Per time period: simple bar charts.
- Basic forecasts (linear extrapolation) for the month.

### 3.5 Lightweight task + decision tracking

- Tasks:
  - Backlog / In progress / Done columns.
  - Editable inline.
  - Stored as structured entries in DB.
- Decisions:
  - Short log of "we chose X because Y" entries.
  - Linked back to events when possible.

---

## 4. Architecture (Scaling Layer)

### 4.1 Components

- **Endeavor Core** (already built)
  - MCP meta-tool
  - REST API
  - Context engine + DB

- **Cockpit UI**
  - Desktop app (Electron) or Web app (Next.js) consuming REST API
  - Real-time-ish updates via WebSocket or polling

- **Sync hooks**
  - Optional integrations for automatically logging commits or other events.

### 4.2 Data Flow

- MCP clients and custom tools send `log` and `context` requests to Core.
- Core writes events and index data into SQLite + vector index.
- Cockpit UI reads timeline, tasks, decisions, and usage via REST.
- Cockpit UI calls `/context` to show current context block.

---

## 5. Feature Phases (Scaling)

### Phase A — Visualize what Core already knows

**Goal**: A UI that makes Endeavor Core's data visible.

Features:
- Project list view
- Single-project dashboard with:
  - timeline
  - context preview
  - basic usage stats

No editing or tasks yet; just visualization and navigation.

### Phase B — Add tasks and decisions

**Goal**: Give each project a minimal task board and decisions log.

Features:
- CRUD for tasks (backlog/doing/done)
- CRUD for decisions
- Link tasks/decisions to events when possible

No agents or automation yet.

### Phase C — Tool-focused analytics

**Goal**: Make it clear how AI tools are being used on real projects.

Features:
- Usage per tool & model per project
- Timeline highlighting AI-heavy periods
- Simple charts

This leverages the usage_logs table and helps refine how you use your own stack.

### Phase D — Orchestration affordances

**Goal**: Make the cockpit a control center, not just a viewer.

Features:
- Buttons to quickly open AI tools with pre-baked context
- Shortcuts for logging key events ("log this as a decision")
- Optional small automations (e.g., mark tasks as done from event context)

At this stage, you have an AI-centric PM cockpit usable daily.

---

## 6. Out of Scope (for this PRD)

- Full-blown multi-user/team collaboration
- Agents that autonomously modify your code or tasks
- Deep integrations with external PM tools (Jira, Asana, etc.)

Those can be separate future documents.

---

## 7. Integration Strategy

Endeavor Cockpit supports a tiered integration model so tools and agents of any maturity level can plug in:

| Tier | What it covers | How it connects |
|------|---------------|----------------|
| **First-class** | MCP tools + your own GPT wrappers | Native MCP protocol and REST API — full context, logging, and orchestration out of the box. |
| **Second tier** | Automation platforms (n8n, Zapier, Make) | Lightweight adapters that translate platform webhooks/actions into Endeavor Core events. |
| **Community** | Specific SaaS tools (Notion, Linear, Slack, etc.) | Community-contributed adapters that map SaaS-specific APIs onto Endeavor's event and context model. |

First-class integrations are the priority; second-tier and community adapters follow once the adapter interface is stable.

---

## 8. Definition of Done (Scaling Layer)

- You can open the Cockpit, pick a project, and see:
  - A timeline of AI interactions from Endeavor Core.
  - The current context block that would be injected into AI tools.
  - Simple stats on which tools you've used most for this project.
  - A handful of tasks and decisions.
- It's stable enough to use on your own active projects.
