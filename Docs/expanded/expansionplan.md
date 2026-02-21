# Endeavor — expansionplan.md

> Rough plan for layering in the Project Management Agent, agent messaging, and notifications
> on top of the existing plugin + framework + (eventually) desktop app.
> Last updated: February 18, 2026

---

## Current baseline (what this builds on)

This plan assumes the following are **already working** and reasonably stable:

- `@endeavor/plugin` MCP + REST server
  - File watching, embeddings, semantic search
  - Token-optimized context building
  - Knowledge entries (decisions, findings, tasks, references, etc.)
  - Cost / usage logging per tool + project

- Project framework
  - Research / software / hardware templates
  - CONTEXT.md auto-generation
  - Basic task + decision + finding logging

- Desktop app (or at least a web UI)
  - Project dashboard (activity, cost, state)
  - Context preview
  - Basic settings

The agent is **not** required for the system to be useful. It is a layer on top that
tries to make the whole system feel more like a coordinator than a set of tools.

---

## Guiding principles for the agent layer

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

---

## Four expansion tracks

I'm thinking of this as four parallel but loosely ordered tracks:

1. **Project Management Agent (core loop)**
2. **Agent Messaging / Agent Inbox**
3. **Notification System ("Noti")**
4. **Teams / Multi-user later**

Everything below is written so I can pick pieces off as time and energy allow.

---

## 1. Project Management Agent (core loop)

### Goal

A background process that:
- Understands the rough state of a project
- Can generate a plan from a vague goal
- Can periodically summarize what's happening
- Can suggest next steps and highlight blockers

Early versions **do not** auto-edit anything. They only read and suggest.

### 1.1 Data model additions

Most of what the agent needs already exists:
- `projects` table (id, type, path, timestamps)
- `knowledge` table (decisions, findings, etc.)
- `file_chunks` (semantic view of code/docs)
- `usage_logs` (API usage and costs)

Possible additions:

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

Keep it minimal. Only add tables when there's a clear reason.

### 1.2 Agent entrypoints

Concretely, I want a small set of well-defined entrypoints:

- `endeavor agent plan` — take a project goal and produce a structured plan
- `endeavor agent weekly` — summarize the last 7 days of work
- `endeavor agent check-in` — given current state, suggest next actions
- `endeavor agent status` — human-readable project status report

In the desktop app, these show up as buttons:
- "Generate plan"
- "Weekly summary"
- "Suggest next steps"
- "Status report"

The underlying code should look roughly like:

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

The **readProjectState** call is the key: it should

- Pull in goals/vision from project docs
- Pull in current tasks (backlog / in-progress / done)
- Pull in recent knowledge entries (decisions, findings)
- Pull in usage data (have we hit budget?)
- Optionally pull in file info (changed files, test results)

### 1.3 Where the agent writes

I like the idea of the agent writing to explicit, human-readable files
under a dedicated folder, e.g.:

```
project/
  agent/
    plan.md
    weekly-2026-02-25.md
    status-2026-03-01.md
```

That way it's obvious what the agent has done, and easy to delete/ignore.
The desktop app can just render these.

No hidden magic state.

### 1.4 Safety / scope constraints (v1)

To keep this from doing weird stuff:

- v1 agent **never edits code**
- v1 agent **never makes tool calls on its own** (no automatic Claude requests)
- v1 agent has a hard per-run token budget
- Every run is triggered by an explicit user action (button or CLI)

This should keep costs bounded and behavior legible.

Later, I can loosen these constraints once I see how it behaves.

---

## 2. Agent messaging / "Agent inbox"

### Goal

Right now, all "messages" in the system are just:
- Files changing
- Knowledge entries being written
- Tools being called

I want a way for the agent to send/receive higher-level messages like:

- "I noticed you've run 3 experiments without logging variables."
- "You said the goal was X, but recent commits are all about Y."
- "You hit 80% of your API budget this week."

Instead of spamming the user randomly, these should land in an **Agent Inbox**
that the user can check and triage.

### 2.1 Minimal data model

Probably enough to repurpose `agent_alerts` for this. An "alert" is just a
message with severity. The inbox shows all unresolved alerts.

No need for a separate table at first.

### 2.2 Where messages show up

- In the desktop app: a small badge in the sidebar ("Agent: 3")
- In CLI: `endeavor agent inbox` to list, `endeavor agent resolve <id>` to clear

Example output:

```bash
$ endeavor agent inbox

[3] (warning) Experiments missing variables
    In the last 2 experiments, variables.md was not updated. This will make it
    harder to write a proper methodology section later.

[2] (info) Budget check
    You have used $12.40 of your $20.00 budget for this project.

[1] (error) Tests failing
    The last 3 runs of `npm test` failed. Consider fixing tests before adding
    more features.
```

The important part is that nothing is automatic. The agent just surfaces
things; the user decides what to do.

### 2.3 How messages are created

Three sources:

1. **Scheduled agent runs** (if I add scheduling later)  
   E.g., run a cheap check-in every morning, but still only write alerts.

2. **Hooks from existing events**  
   - When a new experiment log is created
   - When usage crosses a budget threshold
   - When certain file patterns change (e.g., tests failing)

3. **Manual triggers**  
   - `endeavor agent check-in` might generate inbox items instead of or in
     addition to a status report

For now I’ll probably start with manual triggers + a couple of simple hooks.

---

## 3. Notification system ("Noti")

Working name: **Noti** — a very small notification layer that listens for
certain events and surfaces them in a way that isn't annoying.

I see three levels of notification:

1. **Passive (default)** — shows up in the Agent Inbox only
2. **Local push** — desktop notification, badge, or in-app toast
3. **External** — email / Discord / etc. (probably later)

### 3.1 Event types worth notifying about

Trying to keep this small and meaningful:

- Budget thresholds crossed (75%, 90%, 100%)
- Long period of inactivity on a project (e.g., 7 days)
- Tests failing repeatedly
- Experiments logged without findings written
- CONTEXT.md out of date (significant changes since last regen)

Each of these can be turned on/off per project.

### 3.2 Implementation sketch

There are two parts:

- A small event emitter in the plugin layer that fires events like
  `usage:threshold-crossed`, `project:inactive`, `tests:failing`.
- A notifier module that decides what to do with each event based on
  per-project settings.

Pseudo-code:

```ts
// inside plugin

// when usage logged
if (newTotal > 0.75 * budget && oldTotal <= 0.75 * budget) {
  emit('usage:threshold-crossed', { projectId, level: 0.75 });
}

// notifier
on('usage:threshold-crossed', (evt) => {
  const prefs = getNotificationPrefs(evt.projectId);
  if (!prefs.budget) return;

  // always write to agent_alerts
  createAgentAlert({
    projectId: evt.projectId,
    severity: evt.level === 1 ? 'error' : 'warning',
    title: 'Budget threshold reached',
    description: `You have used ${evt.level*100}% of your budget.`,
  });

  // optionally: show OS-level notification via desktop app
});
```

The desktop app can subscribe to these events over WebSocket and show
local notifications.

### 3.3 Noti vs. Agent

Noti is basically the delivery mechanism. The agent is the one doing the
thinking about *what* matters. I want to avoid having two different subsystems
both trying to decide when to ping the user.

The division of labor in my head:
- Agent: decides “this is worth surfacing” → creates an alert
- Noti: decides “how/when to surface it” → inbox, toast, email, etc.

---

## 4. Rough implementation order

This is all expansion work, so it should only happen if the core is stable
and there’s still energy/interest.

### Stage A — Agent (read-only)

- Implement `agent_runs` and `agent_alerts` tables
- Implement `readProjectState(projectId)`
- Implement `runAgent(projectId, mode)` for:
  - `plan`
  - `weekly`
  - `check_in`
  - `status`
- CLI + minimal UI buttons for these
- Agent writes markdown files under `project/agent/`

### Stage B — Agent Inbox

- Reuse `agent_alerts` as the inbox
- CLI commands:
  - `endeavor agent inbox`
  - `endeavor agent resolve <id>`
- Desktop UI: simple list with filters

### Stage C — Noti v0

- Event emitter in plugin layer
- A couple of simple events:
  - budget thresholds
  - inactivity
- Write alerts for these events
- Desktop app listens and shows a small toast + increments inbox badge

### Stage D — Light automation (optional)

Only after using this myself for a while, and only if it feels safe:

- Allow the agent to propose actions in a structured way, e.g.:
  - "I suggest creating these 3 tasks"
  - "I suggest moving these tasks to 'done'"
- UI shows a diff / confirmation, user clicks to apply
- Actual file edits are made via the existing framework (tasks files, etc.)

No fully autonomous mode unless there’s a very good reason.

---

## Open questions

- Where to configure agent/Noti behavior?  
  Probably per-project config in `endeavor.json` plus a global default.

- How often should the agent run automatically, if at all?  
  Weekly summary might be worth scheduling, but it should be opt-in.

- Which LLM should power the agent?  
  Claude is good at long, structured output; GPT-4o is cheaper. Might
  need a pluggable interface and per-project choice.

- Is this overkill for solo users?  
  Need to design it so that everything still feels useful even if you're
  the only person on the project.

---

## What “done enough” looks like for this layer

For my purposes, I don’t need a perfect agent system. “Good enough” would be:

- I can run `endeavor agent plan` on a new project and get a useful first pass
  at a roadmap that I actually follow or edit.
- I can run `endeavor agent weekly` and get a summary that helps me remember
  what I did and what changed.
- The inbox occasionally surfaces things I would have otherwise forgotten
  (budget, unlogged experiments, stale tasks).
- None of this feels pushy or spammy. It’s there when I want it.

If I get there, the agent layer has earned its place.

---

*This is intentionally fuzzy. The core plugin and framework come first. The agent,
agent messaging, and Noti sit on top and should be fun to add, not stressful.*
