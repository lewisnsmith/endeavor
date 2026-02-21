# Endeavor — plan.md

> A personal working document. Updated as the project evolves.
> Last updated: February 18, 2026

---

## What I'm building

A project coordination layer for developers and researchers who use multiple AI tools.
The core problem: every time you switch between Claude, ChatGPT, and Cursor, you
re-explain your project. Context gets lost. Costs stack up. Work fragments.

The solution is two things built in sequence:

1. A context sync plugin that plugs into AI tools and keeps them aware of your project
2. A desktop app that unifies the tools and gives you visibility into what's happening

Starting with the plugin because it's the foundation everything else sits on.

---

## Why not just use the API directly instead of MCP?

Thought about this seriously. Here's where I landed:

**The case for direct API:**
- Simpler — just POST to an endpoint
- No dependency on MCP being adopted
- Works with any tool that has an API
- You control exactly what gets sent

**The case for MCP:**
- It's an open standard — once you build one MCP server, any compatible tool
  can connect to it without custom integration code per tool
- Claude Desktop, Cursor, Windsurf, Zed, Continue.dev already support it
- 6,000+ MCP servers already exist, adoption is growing
- Two-way communication — the AI can push back, not just receive

**The real answer: both.**

MCP for tools that support it (Claude Desktop, Cursor) — because you get
compatibility for free. Direct API calls for tools that don't have MCP support
(ChatGPT in the browser, custom agents). The plugin should handle both.

The architecture I'm going with:

```
Endeavor Plugin
├── MCP Server (stdio)     → Claude Desktop, Cursor, Windsurf, etc.
└── Local REST API         → Desktop app, ChatGPT API, any custom tool
```

The local REST API also makes it easy to build the desktop app later —
it just talks to the same server the MCP tools use.

One important caveat on MCP: the token overhead problem is real. ContextSync
exposes 8 tools and eats 40-80K tokens just in tool definitions. I'll fix this
by exposing a single unified tool. The AI calls `endeavor` with an action param
instead of 8 separate tools. Should bring overhead down to ~1,200 tokens.

---

## What's wrong with ContextSync (and why fork vs. build from scratch)

ContextSync (github.com/Intina47/context-sync) is the closest thing to what I want.
113 stars, ~1,500 downloads, been around ~4 months. It works but has real problems:

- Token bloat: 8 exposed tools = 40-80K token overhead before you start
- Fully manual: you have to call recall() yourself every time
- Keyword search only: no semantic understanding
- No GUI: you have no idea what it's storing or whether it's working
- Setup is brittle: auto-config often fails silently

I'm going to start from scratch rather than fork. Forking makes sense if you
want to contribute upstream or if the codebase is good enough to build on.
ContextSync's core is simple enough that I'll write cleaner code starting fresh,
and I want a different architecture (single tool, local vector DB, auto-injection).

I'll attribute ContextSync clearly in the README as prior art and inspiration.
If I end up solving something cleanly that would help their users too, I'll open
a PR or at least write up the approach.

---

## Architecture decisions

**Language**: TypeScript + Node.js
- MCP SDK is Node-native
- I know it well
- Good for the desktop app later (Electron)

**Local database**: SQLite via better-sqlite3
- Zero config, single file, portable
- Fast enough for this use case
- No external service needed

**Vector storage**: Vectra (local) to start
- Pure Node.js, no server needed, data stays local
- If performance becomes an issue at scale, can swap for Pinecone
- The local-first constraint matters for the accessibility angle

**Embeddings**: OpenAI text-embedding-3-small
- Cheap: $0.02 per million tokens
- Good quality for code search
- Will add a local fallback (transformers.js) later for zero-cost operation

**MCP transport**: stdio (not HTTP) for now
- All the major desktop tools use stdio
- Simpler to implement and debug
- Can add HTTP transport later for remote use cases

**Desktop app (later)**: Electron + React + Tailwind
- Cross-platform
- Can reuse the same TypeScript codebase
- Familiar enough to ship fast

---

## Project structure

```
endeavor/
├── packages/
│   ├── plugin/          # The MCP + REST server (Phase 1)
│   ├── framework/       # Project templates + CONTEXT.md generation (Phase 2)
│   └── desktop/         # Electron app (Phase 3)
├── docs/
│   ├── rfcs/            # Design decisions written before implementation
│   └── benchmarks.md    # Token overhead comparison vs. ContextSync
├── examples/
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```

Monorepo with npm workspaces. Keeps things organized but each package can be
published independently (e.g., `@endeavor/plugin` on npm).

---

## Phase 1: The Plugin

**Goal**: A working MCP server + REST API that other tools can connect to.
Context syncs automatically. Token overhead under 1,500 tokens.

**The core loop:**
1. You add a project directory
2. File watcher picks up changes and generates embeddings
3. When an AI tool asks for context, semantic search finds relevant files
4. Context is built intelligently (full content → summary → path-only based on token budget)
5. Auto-injected before every query — no manual tool calls needed

**What I'm shipping at the end of Phase 1:**
- `@endeavor/plugin` on npm
- Works with Claude Desktop and Antigravity and Web Browser LLMs out of the box
- `endeavor` CLI with setup wizard
- Benchmarks published showing token reduction
- Tests that actually cover the important paths

**Rough week breakdown:**

Week 1 (Feb 18-24):
- Repo setup, monorepo, TypeScript config
- SQLite schema and storage layer
- File watcher with smart ignore patterns
- Vector embedding pipeline (Vectra)
- Token counting and optimization engine
- MCP server skeleton

Week 2 (Feb 25 - Mar 3):
- Auto-context injection (the hard part)
- Knowledge graph (typed entries: decision, finding, error, etc.)
- Cost/token tracking per tool per project
- Setup wizard with detection + verification
- Integration tests

Week 3 (Mar 4-10):
- Cursor integration tested end-to-end
- CLI polished
- Benchmarks written and published
- npm publish
- Bug fixes from real usage

**Daily rhythm**: work session in the evening, commit before sleeping.
Meaningful commit messages. Open issues for things I notice but can't fix yet.

---

## Phase 2: Project Framework

**Goal**: Project templates with methodology baked in. The CONTEXT.md file
as the universal source of truth for any AI tool.

The insight here is that most people don't fail at research or building because
they're not smart enough — they fail because no one ever told them how to structure
the work. What does a good experiment log look like? How do you track decisions?
What should you write down when you're stuck?

I want to encode that scaffolding in the tool.

**Three templates to start:**
- Research (hypothesis → experiments → findings → analysis)
- Software (vision → architecture → tasks → testing)
- Hardware/maker (requirements → build log → testing → documentation)

**The CONTEXT.md file:**
Auto-generated from the project. Contains: project summary, recent decisions,
key findings, active tasks, relevant files. Gets injected into any AI tool.
~2,000 tokens instead of pasting entire codebases.

This is also where the accessibility angle becomes concrete. A student without
a mentor can open Endeavor, pick "research project," and get the same structure
that a PI would walk them through. Then AI tools that connect to it can give
advice that's actually grounded in what they're working on.

Week 4-6 breakdown (rough):
- Week 4: Three templates, `endeavor init`, CONTEXT.md auto-generation
- Week 5: Decision/finding logging, task tracking, reference management
- Week 6: Polish from real usage, pilot recruitment starts

---

## Phase 3: Desktop App

**Goal**: Unified place to use all your AI tools, with a dashboard showing
project state and costs.

The app talks to the plugin's REST API. Each AI tool gets a tab with an embedded
chat interface. Context preview panel shows what the AI currently knows before
you send a message. Dashboard shows activity timeline and cost breakdown.

This is the most visible part of the product but actually the least technically
interesting. Most of the real work happens in the plugin layer.

Week 7-9 rough breakdown:
- Week 7: Electron skeleton, sidebar nav, embedded AI interfaces (Claude + GPT)
- Week 8: Dashboard, cost tracker, settings, onboarding
- Week 9: Polish, packaging, testing on real hardware

---

## Phase 4: Project Management Agent, Messaging & Notifications (post-launch, Pro tier)

After the core product ships and has real users, I want to add an active
orchestration layer. Instead of passively making context available, this agent
helps you structure projects, surfaces blockers, and generates reports from
accumulated project knowledge.

This is the feature that could support a paid tier. It requires ongoing LLM
calls (compute cost), creates real lock-in through accumulated project history,
and delivers genuinely different value from the free layer.

Won't build this until there are real users with real feedback. The design
should come from watching how people actually use the free version.

### Guiding principles for the agent layer

1. **Read-only first, write later**
   Start with an agent that *observes* and *suggests* rather than automatically
   editing files or firing off expensive API calls. Earn trust before taking actions.

2. **Use the same datastore**
   The agent should not introduce a separate state store. It reads/writes from the
   existing SQLite + knowledge graph. This keeps mental models simpler.

3. **No surprise costs**
   Agent reasoning will hit an LLM. That costs money. Make its calls explicit,
   visible, and ideally configurable (budget caps, frequency).

4. **Composable, not magical**
   The agent should be a set of well-defined abilities ("structure project",
   "summarize week", "suggest next steps", "sync docs"), not a black box that
   claims to "manage everything". This keeps behavior debuggable.

5. **Stay local as long as possible**
   Orchestration logic runs locally. Only LLM calls go out. No central server.

### 4.1 PM Agent (core loop)

A background process that:
- Understands the rough state of a project
- Can generate a plan from a vague goal
- Can periodically summarize what's happening
- Can suggest next steps and highlight blockers

Early versions **do not** auto-edit anything. They only read and suggest.

#### Data model additions

Most of what the agent needs already exists (`projects`, `knowledge`,
`file_chunks`, `usage_logs`). Possible additions:

```sql
-- Agent runs (log of each invocation)
CREATE TABLE agent_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   TEXT NOT NULL,
  type         TEXT NOT NULL,  -- "weekly_summary" | "plan" | "check_in" | ...
  result_path  TEXT,           -- where the agent wrote its output (if any)
  tokens_in    INTEGER,
  tokens_out   INTEGER,
  cost_usd     REAL,
  timestamp    INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Blockers or alerts the agent has surfaced
CREATE TABLE agent_alerts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   TEXT NOT NULL,
  severity     TEXT NOT NULL,  -- "info" | "warning" | "error"
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  resolved     INTEGER DEFAULT 0,
  created_at   INTEGER,
  resolved_at  INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

#### Agent entrypoints

- `endeavor agent plan` — take a project goal and produce a structured plan
- `endeavor agent weekly` — summarize the last 7 days of work
- `endeavor agent check-in` — given current state, suggest next actions
- `endeavor agent status` — human-readable project status report

In the desktop app, these show up as buttons ("Generate plan", "Weekly summary",
"Suggest next steps", "Status report").

Underlying code:

```ts
// pseudo-code
async function runAgent(
  projectId: string,
  mode: 'plan' | 'weekly' | 'check_in' | 'status',
  options?: AgentOptions
): Promise<AgentResult> {
  const state = await readProjectState(projectId);
  const prompt = buildPrompt(state, mode, options);
  const llmResult = await callLLM(prompt, options?.model);
  const parsed = parseAgentOutput(llmResult, mode);

  await logAgentRun({ projectId, mode, llmResult, cost: estimateCost(llmResult) });

  if (mode === 'plan') {
    await writePlanToProject(projectId, parsed.plan);
  }

  return parsed;
}
```

The **readProjectState** call pulls in goals/vision from project docs, current
tasks, recent knowledge entries, usage data, and optionally file info (changed
files, test results).

#### Where the agent writes

The agent writes to explicit, human-readable files under a dedicated folder:

```
project/
  agent/
    plan.md
    weekly-2026-02-25.md
    status-2026-03-01.md
```

No hidden magic state. The desktop app just renders these.

#### Safety / scope constraints (v1)

- v1 agent **never edits code**
- v1 agent **never makes tool calls on its own** (no automatic Claude requests)
- v1 agent has a hard per-run token budget
- Every run is triggered by an explicit user action (button or CLI)

### 4.2 Agent Messaging / "Agent Inbox"

A way for the agent to send/receive higher-level messages:

- "I noticed you've run 3 experiments without logging variables."
- "You said the goal was X, but recent commits are all about Y."
- "You hit 80% of your API budget this week."

These land in an **Agent Inbox** the user can check and triage (reuses
`agent_alerts` — no separate table needed).

**Surfaces:**
- Desktop app: small badge in sidebar ("Agent: 3")
- CLI: `endeavor agent inbox` to list, `endeavor agent resolve <id>` to clear

**Message sources:**
1. Scheduled agent runs (if scheduling is added later)
2. Hooks from existing events (experiment logs, budget thresholds, failing tests)
3. Manual triggers (`endeavor agent check-in` may generate inbox items)

### 4.3 Notification System ("Noti")

A small notification layer that listens for events and surfaces them without
being annoying. Three levels:

1. **Passive (default)** — shows up in the Agent Inbox only
2. **Local push** — desktop notification, badge, or in-app toast
3. **External** — email / Discord / etc. (later)

**Events worth notifying about:**
- Budget thresholds crossed (75%, 90%, 100%)
- Long period of inactivity on a project (e.g., 7 days)
- Tests failing repeatedly
- Experiments logged without findings written
- CONTEXT.md out of date (significant changes since last regen)

Each can be toggled per project. The agent decides *what* matters and creates
alerts; Noti decides *how/when* to surface them (inbox, toast, email, etc.).

### 4.4 Implementation order

#### Stage A — Agent (read-only)
- Implement `agent_runs` and `agent_alerts` tables
- Implement `readProjectState(projectId)`
- Implement `runAgent(projectId, mode)` for: plan, weekly, check_in, status
- CLI + minimal UI buttons
- Agent writes markdown files under `project/agent/`

#### Stage B — Agent Inbox
- Reuse `agent_alerts` as the inbox
- CLI: `endeavor agent inbox`, `endeavor agent resolve <id>`
- Desktop UI: simple list with filters

#### Stage C — Noti v0
- Event emitter in plugin layer
- Simple events: budget thresholds, inactivity
- Write alerts for these events
- Desktop app listens and shows toast + increments inbox badge

#### Stage D — Light automation (optional)
Only after using this myself for a while, and only if it feels safe:
- Allow the agent to propose actions with structured diff/confirmation
- User clicks to apply; actual edits via existing framework
- No fully autonomous mode unless there's a very good reason

### Phase 4 open questions

- Where to configure agent/Noti behavior? Probably per-project in `endeavor.json` + global default.
- How often should the agent run automatically? Weekly summary might be worth scheduling (opt-in).
- Which LLM should power the agent? Claude for long structured output; GPT-4o is cheaper. Pluggable interface.
- Is this overkill for solo users? Design so everything feels useful even for single-person projects.

### What "done enough" looks like for Phase 4

- `endeavor agent plan` on a new project produces a useful first-pass roadmap
- `endeavor agent weekly` generates a summary that helps remember what changed
- The inbox occasionally surfaces forgotten items (budget, unlogged experiments, stale tasks)
- None of this feels pushy or spammy — it's there when you want it

---

## Pilot plan

Want to get 10-15 people using this on real projects before launching publicly.
Target: students working on science fair projects, ML experiments, app builds —
ideally people who don't have easy access to mentors or lab infrastructure.

Where to find them:
- People I already know doing projects
- r/learnmachinelearning (post once plugin is working)
- FIRST Robotics Discord
- AI/ML Discord servers
- DM people who comment on relevant threads

What I want to learn from the pilot:
- Does the context injection actually help? (ask them to compare before/after)
- Is the setup painful? (watch them set it up, don't help unless stuck)
- What project types am I missing?
- What's the first thing that breaks?

I'll document what people build. If the tool genuinely helped someone do
something they couldn't have done otherwise, that's worth capturing.

---

## What I'm not building (scope control)

Things that sound good but will kill the timeline:

- Real-time collaboration / shared projects (complex, not needed for v1)
- Cloud sync (local-first is a feature, not a limitation)
- Mobile app
- Custom LLM hosting
- A marketplace

The Project Management Agent is explicitly post-launch. I'm not building it
until I know what real users actually need.

If I fall behind on time:
1. Cut the desktop app, replace with simple web UI
2. Cut hardware template (ship 2 of 3)
3. Cut artifact export commands
4. Never cut: plugin core, token optimization, CONTEXT.md generation

---

## Open questions I haven't resolved yet

- **Local embedding model**: transformers.js works but is it fast enough on
  older hardware? Need to benchmark. Matters a lot for accessibility.

- **Token budget per tool**: I'm guessing at reasonable defaults (Claude=190K,
  GPT-4o=120K, Cursor=60K). Need to validate these with actual usage.

- **CONTEXT.md regeneration frequency**: Continuous (debounced) is ideal but
  could be slow on large projects. Might need a manual refresh option too.

- **How to handle secrets in project files**: File watcher should not embed
  .env files or anything that looks like credentials. Need a smart filter.

- **MCP security**: Over 40% of tested MCP implementations have injection
  vulnerabilities. Need to think through this before publishing.

---

## Honest assessment

The core plugin is technically straightforward. The interesting engineering
problems are: getting token compression right, making auto-injection feel
seamless rather than intrusive, and handling edge cases (huge files, binary
files, projects with no clear structure).

The framework layer is more about product thinking than engineering.
What templates actually help people? What's the right level of structure
without being prescriptive?

The desktop app is mostly UI work. Fine, not exciting.

The agent is the interesting research problem and I'm deliberately leaving
it for later when I have more information.

The real risk is spending too much time making things perfect and not enough
time getting feedback from actual users. Going to try to resist that.

---

*This document is for me, not for anyone else. I'll update it when things change.*
