# Endeavor Cockpit: Scaling the Claude Code Operating System

**Name**: Endeavor Cockpit — Post-MVP Scaling PRD
**Date**: March 18, 2026
**Depends on**: Endeavor MVP (TUI Workflow Dashboard)
**Status**: Draft

---

## 1. Vision

The MVP proves the model: a terminal-native coordination layer that owns the dependency graph and decision history for parallel Claude Code sessions. The Cockpit scaling layer makes Endeavor the **authoritative coordination substrate** for any team or individual running Claude Code at scale.

The MVP is the flywheel starter. Cockpit is the flywheel at speed.

---

## 2. Where MVP Leaves Off

After the MVP, Endeavor can:
- Show a live grid of sessions with color-coded status
- Surface the dependency DAG and critical path
- Route attention to a human-in-the-loop queue
- Record decisions and handoffs per session
- Seed new sessions with context from prior handoffs

What it **can't** do yet:
- Run across multiple repositories or projects simultaneously
- Provide analytics over session history ("what patterns cause most blocking?")
- Integrate with external signals (CI failures, GitHub PR status)
- Scale to teams with multiple human coordinators
- Replay historical sessions to understand what went wrong
- Generate structured plans that decompose goals into session-ready work items

---

## 3. Scaling Phases

### Phase A — Multi-Project and Cross-Repo View

**Goal**: Endeavor as your workspace-level OS, not just a per-project tool.

Features:
- Global session grid spanning multiple projects
- Project switcher with per-project session counts and attention badges
- Cross-project dependency support (rare but real: shared libraries, monorepos)
- `endeavor tui --global` flag that aggregates all `.endeavor/` DBs found under a workspace root

**Why it matters**: Power users run Claude Code sessions across 2–4 repos at once. A project-scoped view forces them back to tmux for the cross-repo picture.

---

### Phase B — Session Analytics and Pattern Detection

**Goal**: Turn accumulated session history into operational intelligence.

Features:

**Blocking pattern analysis**:
- Which work item types generate the most downstream blocks?
- Which decisions, once made, eliminate the longest blocking chains?
- Average time-to-unblock per category of dependency

**Session health metrics**:
- Idle ratio per session (time in `idle` / total wall time)
- Attention escalation frequency per session/work-item type
- Handoff quality score (completeness of handoff fields)

**Decision corpus analytics**:
- Most common decision categories (architecture, testing, auth, infra, etc.)
- Decisions that were revisited (flagged as reconsidered in a later session)
- Decision coverage: percentage of work items that have at least one logged decision

Dashboard view:
```
ANALYTICS: last 30 days

  Most blocking work item type: schema-migration (avg 2.3 downstream blocks)
  Longest blocking chain resolved: 5 sessions unblocked by auth decision #d_abc
  Average attention resolution time: 4.2 minutes
  Sessions with zero logged decisions: 12 (41%) ← coverage gap
```

---

### Phase C — External Signal Integration

**Goal**: Close the loop between Endeavor and the external systems sessions interact with.

Integrations:

**GitHub**:
- PR status per session/branch (open, review-requested, merged, failing CI)
- Auto-update session status to `waiting` when a PR has failing checks
- Surface PR review requests in the attention queue

**CI/CD**:
- Build/test failure events auto-escalate the relevant session to `attention-needed`
- Passing CI auto-transitions session from `waiting` to `working` (configurable)

**Shell hooks**:
- Sessions can emit structured events via a local webhook endpoint
- `endeavor emit --event test_failed --session s_abc --detail "3 tests failing"`

Data flow:
```
GitHub webhook → Endeavor daemon → DB update → TUI live refresh
CI signal       → Endeavor daemon → attention queue item
```

---

### Phase D — Plan-to-Session Decomposition

**Goal**: Go from a high-level goal to a ready-to-execute session plan with dependencies pre-wired.

Features:

**Goal decomposition**:
```
endeavor plan "Implement OAuth2 login with Google and GitHub providers"
```

Produces a structured work breakdown:
```
PLAN: OAuth2 Login

  Work Items (proposed):
  1. [w_001] Research OAuth2 library options (est: 1 session, 30min)
  2. [w_002] Implement OAuth2 core flow            depends on: w_001
  3. [w_003] Google provider integration           depends on: w_002
  4. [w_004] GitHub provider integration           depends on: w_002
  5. [w_005] Session management + token storage    depends on: w_002
  6. [w_006] Frontend login UI                     depends on: w_003, w_004
  7. [w_007] Integration tests                     depends on: w_003, w_004, w_005

  DAG critical path: w_001 → w_002 → w_003/w_004 → w_006 → w_007
  Parallelizable: w_003 and w_004 can run simultaneously after w_002

  Approve and spawn sessions? [y/n]
```

The plan is powered by a Claude API call with a structured prompt that takes the goal and current project context (existing decisions, in-progress work items) as input. The output is machine-readable JSON that feeds directly into the Endeavor DB.

**Plan templates**:
- REST API feature
- Auth system
- Database migration
- Test coverage push
- Refactor/cleanup

---

### Phase E — Multi-Human Coordination

**Goal**: Scale beyond single-human, many-sessions to multiple humans coordinating shared session pools.

This is explicitly post-MVP and post-Phase D. Multi-human coordination introduces:

- Attention queue ownership (who is handling which escalation?)
- Decision conflicts (two humans made contradicting decisions in parallel)
- Handoff directionality (human A hands off to human B, not just session-to-session)
- Session permission scoping (who can spawn sessions in this project?)

Requires:
- Identity model (minimal — user names/initials, not full auth system)
- Conflict detection in the decision log
- Shared DB with network access (SQLite → Postgres or Turso for multi-user)

---

## 4. Non-Goals (Permanent)

These are out of scope regardless of scaling phase:

- **Autonomous code modification** — Endeavor coordinates sessions; sessions write code. Endeavor never touches project files.
- **Replacing Claude Code** — Endeavor is the layer above Claude Code, not an alternative to it.
- **Generic multi-AI orchestration** — Endeavor is explicitly Claude Code-native. Supporting other agents dilutes the session model.
- **Cloud-first architecture** — Local-first is a feature, not a constraint. Remote sync is an opt-in addition, not the default.

---

## 5. Architecture Scaling Considerations

### Storage

SQLite with WAL mode handles concurrent single-machine use comfortably up to ~50 active sessions. Scaling beyond requires:

- For multi-repo: a lightweight aggregation layer that reads multiple `.endeavor/` DBs
- For multi-user: migration to a networked SQLite (Turso/LibSQL) or PostgreSQL, with the same schema

The repository pattern in `packages/core/src/storage/` abstracts the driver, making this migration contained.

### DAG Engine at Scale

The current DAG engine runs in-process and is re-computed on each view refresh. At scale (100s of work items):

- Cache topological order; invalidate on dependency edge writes
- Compute critical path lazily (only when DAG view is open)
- Index `dependencies` table on both `blocker_id` and `blocked_id`

### TUI at Scale

At 20+ sessions, the main grid needs:
- Pagination or virtual scrolling
- Filter/search by status, branch, or label
- Collapsed project sections in the global view

---

## 6. Integration Contracts

Any session agent (Claude Code running in a worktree) integrates with Endeavor through the CLI. The contract is stable from MVP onward:

```bash
# Status reporting
endeavor work update <id> --status <status>
endeavor work update <id> --status attention-needed --attention "<message>"

# Knowledge recording
endeavor decision add "<summary>" --rationale "<why>"
endeavor handoff create --summary "<context>" --next-actions "<what's next>"

# Graph management
endeavor dep add --blocker <item-id> --blocked <item-id>
endeavor dep resolve <dep-id>

# Query
endeavor decision list --search "<query>"
endeavor work list --status blocked
```

`--json` flag on every command for machine consumption by orchestration scripts.

---

## 7. Definition of Done (Per Phase)

### Phase A
- [ ] `endeavor tui --global` aggregates sessions from all projects under a root
- [ ] Project switcher with attention badges works via keystroke
- [ ] Cross-project dependency edges can be created and render in DAG view

### Phase B
- [ ] Blocking pattern report available via `endeavor analytics blocking`
- [ ] Session health metrics exported to `--json`
- [ ] Analytics dashboard tab in TUI (behind `a` keystroke)

### Phase C
- [ ] GitHub webhook registration via `endeavor integrations github add`
- [ ] PR status visible in session detail view
- [ ] CI failure auto-escalates session to `attention-needed`

### Phase D
- [ ] `endeavor plan "<goal>"` calls Claude API and proposes work item DAG
- [ ] Proposed plan displays in TUI for human approval before DB write
- [ ] Approved plan auto-creates work items and dependency edges

### Phase E
- [ ] Identity model supports named users in decision and handoff records
- [ ] Conflict detection surfaces contradicting decisions in attention queue
- [ ] Networked storage backend available as opt-in configuration
