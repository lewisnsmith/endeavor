# Endeavor
### Open-Source Mission Control for Ambitious Projects

**Version**: 3.0  
**Date**: February 17, 2026  
**Author**: [Your Name]  
**License**: MIT  
**Repository**: github.com/[yourusername]/endeavor  
**Status**: Pre-Development — Active RFC (Request for Comments)

---

> "Serious projects—whether ML research, app development, hardware builds, or entrepreneurial ventures—now require coordinating multiple AI tools. This creates fragmentation, wasted tokens, lost context, and high barriers to entry. Endeavor makes ambitious project work accessible to anyone with a laptop and internet."

---

# TABLE OF CONTENTS

1. Problem
2. Solution & Vision
3. Who This Is For
4. Architecture Overview
5. Component 1: Universal MCP Plugin (Phase 1)
6. Component 2: Project Management Framework (Phase 2)
7. Component 3: Endeavor Desktop App (Phase 3)
8. Component 4: Project Management Agent (Phase 4 — Business Capstone)
9. Technical Specifications
10. Open Source Strategy
11. Accessibility & Impact
12. Monetization (Long-Term)
13. Risks & Mitigations
14. Success Metrics
15. Glossary

---

# 1. PROBLEM

## 1.1 The Core Fragmentation Problem

Modern ambitious projects — ML research, app development, hardware prototyping, scientific experiments — increasingly require multiple specialized AI tools working together:

- **ChatGPT**: Broad reasoning, ideation, writing
- **Claude**: Long-context code, analysis, careful logic
- **Cursor / Copilot**: Real-time code completion in IDE
- **Perplexity**: Live research and citations
- **Custom Agents**: Domain-specific tasks

The problem: **these tools don't talk to each other.**

Every time you switch tools, you:
- Re-explain your project from scratch
- Hit context window limits because you paste too much
- Waste money re-sending the same files and documents
- Lose the thread of decisions you made 3 days ago
- Have no record of what each tool contributed

## 1.2 The Access Problem

Beyond fragmentation, there is a deeper inequality:

Students and researchers at elite institutions have:
- Research mentors who provide scaffolding
- Lab infrastructure and institutional tools
- Peers who've "done this before"
- Funding to pay for compute and subscriptions

Everyone else has a laptop, an AI API key, and no structure.

**The gap isn't intelligence or motivation — it's infrastructure.**

A student in rural Texas running ML experiments for a science fair and a student at a well-resourced school both have access to GPT-4. But one has a PI who says "here's how you structure an experiment." The other has a blank page.

Endeavor closes that gap.

## 1.3 The Token Cost Problem

Without coordination:
- Developer pastes entire codebase into each tool
- Each tool re-processes the same 50K tokens
- Cost: 4 tools × 50K tokens × 10 queries/day = $15–30/day
- Across a project: hundreds of dollars of waste

Most students can't afford this. Endeavor's context optimization makes AI-powered project work feasible on a $10–20/month budget.

---

# 2. SOLUTION & VISION

## 2.1 What Endeavor Is

Endeavor is a **three-layer open-source platform**:

**Layer 1 — Universal MCP Plugin**  
A lightweight background service that connects to any MCP-compatible AI tool and maintains a shared, intelligent project context across all of them. Significantly improves on existing implementations (e.g., ContextSync) by reducing token overhead, adding semantic search, and enabling auto-context injection.

**Layer 2 — Project Management Framework**  
Structured project templates (research, software, hardware, entrepreneurship) with auto-generated artifacts, decision logging, experiment tracking, and methodology scaffolding. Gives users the same structure that a mentor or PI provides.

**Layer 3 — Endeavor Desktop App**  
A unified mission-control application that houses AI tool interfaces, visualizes project state, tracks costs across all tools, and provides a dashboard showing what each AI agent has contributed.

**Layer 4 (Business Capstone) — Project Management Agent**  
An orchestration agent that actively facilitates your AI tools: structures your project, routes tasks to the right tools, syncs updated context documents to each tool, and keeps the project moving. This is where Endeavor becomes a true AI-native project manager.

## 2.2 What Endeavor Is NOT

- Not a new LLM or AI model
- Not a cloud SaaS platform (local-first, privacy by default)
- Not just a developer tool (designed for researchers, students, makers)
- Not a replacement for AI tools (it coordinates them)

## 2.3 Design Principles

1. **Local-first**: All project data stays on your machine by default
2. **Open source**: Full transparency, community-driven, MIT licensed
3. **Tool-agnostic**: Works with any AI tool, not just the big three
4. **Accessible**: Designed for users without mentors, labs, or elite resources
5. **Authentic**: Built in public, RFC-driven, contributor-friendly
6. **Minimal overhead**: Context sync should save tokens, not cost them

---

# 3. WHO THIS IS FOR

## Primary Users

### The Self-Directed Student
- **Age**: 15–22
- **Situation**: Motivated, technically curious, no lab or mentor access
- **Pain**: Blank-page problem. Knows AI tools exist but doesn't know how to structure serious work
- **Goal**: Run a real experiment, build a real product, do something that matters
- **How Endeavor helps**: Provides structure, routes to right tools, tracks progress

### The Indie Researcher / Solo Builder
- **Age**: 20–35
- **Situation**: Doing real work outside academia or big company
- **Pain**: AI tool juggling is expensive and disorganized
- **Goal**: Ship research or products efficiently
- **How Endeavor helps**: Coordinates tools, reduces costs, maintains project history

### The Hackathon / Project Team
- **Age**: 16–25
- **Situation**: 24–72 hours to build something real, multiple people, multiple tools
- **Pain**: No shared context, everyone using AI differently, diverging approaches
- **Goal**: Coherent, working output in limited time
- **How Endeavor helps**: Shared project state, coordinated AI usage, unified dashboard

## Secondary Users

- Small research labs without enterprise tooling
- Teachers running project-based learning curricula
- Early-stage startups that can't afford dedicated tooling

---

# 4. ARCHITECTURE OVERVIEW

```
┌──────────────────────────────────────────────────────────────────┐
│                    ENDEAVOR DESKTOP APP                          │
│         (Mission Control — Electron + React + Tailwind)          │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│   │  ChatGPT Tab │  │  Claude Tab  │  │  Perplexity / Custom │ │
│   └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │               PROJECT DASHBOARD                          │  │
│   │  Activity Timeline | Cost Tracker | Context Viewer       │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │          PROJECT MANAGEMENT AGENT (Phase 4)              │  │
│   │  Orchestrates tools | Routes tasks | Syncs context docs  │  │
│   └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
              communicates via local REST + WebSocket
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│               UNIVERSAL MCP PLUGIN (Core Engine)                 │
│                                                                  │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ File Watcher│  │  Context Manager│  │   MCP Server        │ │
│  │ (Chokidar)  │→ │  (Embeddings +  │→ │   (stdio / HTTP)    │ │
│  │             │  │   SQLite +      │  │                     │ │
│  │             │  │   Vector DB)    │  │                     │ │
│  └─────────────┘  └─────────────────┘  └─────────────────────┘ │
│                                                                  │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  Token Opt. │  │  Smart Router   │  │   Usage Logger      │ │
│  │  Engine     │  │  (which tool    │  │   (cost tracking)   │ │
│  │             │  │   gets what)    │  │                     │ │
│  └─────────────┘  └─────────────────┘  └─────────────────────┘ │
└───────────────────────────┬──────────────────────────────────────┘
                            │
              MCP protocol / local API calls
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
  Claude Desktop       Cursor IDE         Custom MCP Clients
  ChatGPT (API)        VS Code            Any MCP-compatible tool
```

---

# 5. COMPONENT 1: UNIVERSAL MCP PLUGIN
## Phase 1 — Weeks 1–3

### 5.1 Overview

The MCP Plugin is the **engine of Endeavor**. It runs as a background service and exposes a unified MCP interface to any connected AI tool. Every connected tool shares the same project context without duplicating token usage.

This is a **significant improvement** on ContextSync (113 stars, ~1,500 downloads), which suffers from:
- Token bloat (40–80K tokens consumed just loading tools)
- Manual-only workflow (no automatic context injection)
- No semantic intelligence (keyword matching only)
- No GUI or feedback mechanism
- Complex multi-tool setup

### 5.2 Core Improvements Over ContextSync

| Issue in ContextSync | Endeavor's Solution |
|----------------------|---------------------|
| 8 tools = 40–80K token overhead | Single unified tool with lazy loading (~2–5K overhead) |
| Manual recall() calls required | Auto-context injection on every query |
| Keyword search only | Vector embeddings + semantic search |
| No visual feedback | Dashboard showing stored context |
| Brittle setup, often fails | Guided setup wizard + health checks |
| No cost tracking | Full token + cost logging per tool |
| No compression | Smart chunking + summary fallback |

### 5.3 Token Optimization (The Core Innovation)

**Problem**: ContextSync and naive MCP implementations load all tools into every conversation, eating 40K+ tokens before you start.

**Solution**: Unified tool interface with smart lazy loading.

```typescript
// BEFORE (ContextSync approach — exposes 8 separate tools):
tools: [
  set_project, recall, remember, read_file,
  search, list_context, update_entry, delete_entry
]
// Token cost: ~40,000–80,000 tokens in tool definitions alone

// AFTER (Endeavor approach — one unified tool):
tools: [
  {
    name: "endeavor",
    description: "Intelligent project context for your current project.",
    inputSchema: {
      action: "auto" | "search" | "save" | "list",
      query: string,       // optional
      content: string,     // optional, for save
      type: string         // optional: decision|finding|file|note
    }
  }
]
// Token cost: ~1,200 tokens total
// Reduction: ~97%
```

**Auto-injection flow**:
```
User asks: "How does the auth middleware work?"

Endeavor intercepts → analyzes query → semantic search →
finds: auth.ts, middleware/auth.ts, past decision on JWT →
injects as prefix context → AI responds with full knowledge

User sees: AI that "just knows" their project.
Token cost: 3,000 tokens (relevant files only)
vs. naive: 50,000 tokens (entire codebase)
Savings: 94%
```

### 5.4 Semantic Context Engine

```typescript
// src/context/engine.ts

interface ContextQuery {
  query: string;
  projectId: string;
  maxTokens: number;       // hard limit
  tool: string;            // which AI is asking
}

interface ContextResult {
  context: string;         // formatted context to inject
  files: string[];         // which files were included
  tokens: number;          // actual token count
  compressionRatio: number; // how much was compressed
}

async function buildContext(q: ContextQuery): Promise<ContextResult> {
  // 1. Semantic search — find relevant files by meaning
  const relevant = await semanticSearch(q.query, q.projectId, topK=8);

  // 2. Recall decisions — find related past decisions/notes
  const memory = await recallRelated(q.query, q.projectId);

  // 3. Pack greedily into token budget
  //    Full content for top files, summaries for the rest
  const packed = await packContext(relevant, memory, q.maxTokens);

  // 4. Format with clear delimiters
  return formatContext(packed);
}
```

### 5.5 File: `src/context/compression.ts`

```typescript
// Smart compression: full content → summary → path only
// depending on relevance score and remaining token budget

async function packContext(
  files: ScoredFile[],
  memory: MemoryEntry[],
  maxTokens: number
): Promise<PackedContext> {
  let remaining = maxTokens;
  const included: ContextChunk[] = [];

  for (const file of files) {
    const fullTokens = countTokens(file.content);

    if (fullTokens <= remaining * 0.4) {
      // Include full content
      included.push({ type: "full", ...file });
      remaining -= fullTokens;
    } else if (remaining > 500) {
      // Include AI-generated summary
      const summary = await summarizeFile(file.content, 300);
      included.push({ type: "summary", summary, path: file.path });
      remaining -= countTokens(summary);
    } else {
      // Include path reference only
      included.push({ type: "reference", path: file.path });
      remaining -= 20;
    }

    if (remaining < 200) break;
  }

  // Always append relevant memory entries (decisions, findings)
  for (const entry of memory) {
    if (remaining > countTokens(entry.content)) {
      included.push({ type: "memory", ...entry });
      remaining -= countTokens(entry.content);
    }
  }

  return { chunks: included, totalTokens: maxTokens - remaining };
}
```

### 5.6 Project-Aware Context (What ContextSync Lacks)

ContextSync stores flat key-value memory. Endeavor stores a **typed knowledge graph**:

```typescript
type EntryType =
  | "decision"      // "We chose PostgreSQL because..."
  | "finding"       // "Experiment 3 showed 94% accuracy"
  | "error"         // "Bug: race condition in auth middleware"
  | "hypothesis"    // "We believe X will improve Y by Z"
  | "requirement"   // "Must support offline mode"
  | "reference"     // "Related paper: Attention Is All You Need"
  | "task"          // "TODO: implement pagination"
  | "file"          // actual code/doc file

interface KnowledgeEntry {
  id: string;
  projectId: string;
  type: EntryType;
  content: string;
  tags: string[];
  createdBy: string;     // which AI tool contributed this
  timestamp: number;
  embedding: number[];   // for semantic search
}
```

This lets the AI answer questions like:
- "What decisions have we made about the database?"
- "What did we find in the last 3 experiments?"
- "What's still on the TODO list?"

### 5.7 Setup Wizard (Solves ContextSync's #1 Pain)

```bash
$ npx endeavor setup

  ╔═══════════════════════════════════════╗
  ║       Endeavor Setup Wizard           ║
  ╚═══════════════════════════════════════╝

  Detected AI tools installed on your system:
  ✓ Claude Desktop (found config at ~/Library/...)
  ✓ Cursor IDE (found at /Applications/Cursor.app)
  ✗ VS Code Copilot (not detected)

  ? Which tools do you want to connect? (Space to select)
  ❯ ◉ Claude Desktop
    ◉ Cursor
    ○ VS Code Copilot
    ○ Add custom tool manually

  Configuring Claude Desktop... ✓
  Configuring Cursor...         ✓

  Running health checks...
  ✓ Claude Desktop: Connected (test query successful)
  ✓ Cursor: Connected (test query successful)

  Token overhead: 1,247 tokens (↓97% vs. naive MCP)

  Setup complete! Start your first project:
  $ endeavor init "My Research Project"
```

### 5.8 CLI Reference

```bash
# Project management
endeavor init <name> [--type research|software|hardware|general]
endeavor list
endeavor switch <project-id>
endeavor status

# Context management
endeavor remember "<content>" [--type decision|finding|note]
endeavor search "<query>"
endeavor context show          # What will AI tools see?
endeavor context stats         # Token usage breakdown

# Tool management
endeavor tools list
endeavor tools add <name> [--config path]
endeavor tools test

# Diagnostics
endeavor doctor                # Full health check
endeavor logs                  # Recent activity
endeavor usage                 # Cost/token report
```

### 5.9 Phase 1 Deliverables

- [ ] Core MCP server (stdio + HTTP modes)
- [ ] File watcher (Chokidar, smart ignore patterns)
- [ ] SQLite schema (projects, chunks, knowledge graph, usage)
- [ ] Vector embedding pipeline (OpenAI text-embedding-3-small)
- [ ] Semantic search (local vector DB via Vectra, or Pinecone)
- [ ] Smart context packing (full → summary → reference)
- [ ] Auto-context injection
- [ ] Token + cost tracking
- [ ] Setup wizard
- [ ] CLI (`endeavor` command)
- [ ] Health check (`endeavor doctor`)
- [ ] Full test suite (unit + integration)
- [ ] README, CONTRIBUTING, and API docs

---

# 6. COMPONENT 2: PROJECT MANAGEMENT FRAMEWORK
## Phase 2 — Weeks 4–6

### 6.1 Overview

Structure is what separates a serious project from a chat session. The Project Management Framework provides opinionated, methodology-grounded templates for different project types — encoding the scaffolding that mentors and PIs provide, making it accessible to anyone.

### 6.2 Project Templates

**A. Research Project Template**
```
my-research-project/
├── endeavor.json               # Project config (type, tools, settings)
├── README.md                   # Auto-generated overview
│
├── research/
│   ├── question.md             # Research question + hypothesis
│   ├── background.md           # Related work (AI-assisted search)
│   ├── methodology.md          # Experimental design
│   ├── variables.md            # Independent, dependent, controls
│   │
│   ├── experiments/
│   │   ├── _template.md        # Standard experiment log format
│   │   ├── exp-001.md          # Experiment 1 log
│   │   └── exp-002.md          # Experiment 2 log
│   │
│   ├── data/                   # Raw data, CSVs, plots
│   │
│   ├── results.md              # Aggregated findings
│   └── analysis.md             # Interpretation, limitations, future work
│
├── context/
│   ├── decisions.md            # Key decisions + rationale (auto-updated)
│   ├── findings.md             # Accumulated findings (auto-updated)
│   ├── ai-log.jsonl            # All AI interactions, timestamped
│   └── CONTEXT.md              # What AI tools currently know (auto-generated)
│
└── outputs/
    ├── draft-paper.md          # Auto-assembled draft
    ├── poster-template.md      # Science fair / conference poster
    └── presentation-outline.md
```

**Experiment Log Template** (`experiments/_template.md`):
```markdown
# Experiment [N]: [Short Title]

**Date**: [YYYY-MM-DD]
**Hypothesis**: [What do you expect to happen and why?]
**Variables**:
  - Independent: [What you're changing]
  - Dependent: [What you're measuring]
  - Controlled: [What you're keeping constant]

## Setup
[Describe exact setup / code / environment]

## Results
[Data, observations, plots]

## Analysis
[What do results mean? Surprising findings?]

## Conclusion
[Did this support or refute the hypothesis?]

## Next Steps
[What experiment should follow from this?]

---
*AI tools used: [list]*
*Token cost: [auto-filled by Endeavor]*
```

**B. Software Project Template**
```
my-app/
├── endeavor.json
├── README.md
│
├── planning/
│   ├── vision.md               # What are you building and why?
│   ├── users.md                # Who is this for? What's their pain?
│   ├── features.md             # Feature list + priorities
│   ├── architecture.md         # System design
│   └── technical-decisions.md  # Why X over Y?
│
├── development/
│   ├── tasks/
│   │   ├── backlog.md
│   │   ├── in-progress.md
│   │   └── done.md
│   ├── code-review-log.md      # AI review feedback on code
│   └── testing-log.md          # What was tested, results
│
├── context/
│   ├── CONTEXT.md              # Auto-generated codebase summary
│   ├── decisions.md
│   └── ai-log.jsonl
│
└── outputs/
    ├── demo-script.md
    └── launch-checklist.md
```

**C. Hardware / Maker Project Template**
```
my-hardware-project/
├── endeavor.json
├── README.md
│
├── design/
│   ├── requirements.md         # What must it do?
│   ├── constraints.md          # Budget, materials, time
│   ├── concepts/               # Early sketches, brainstorms
│   └── final-design.md
│
├── fabrication/
│   ├── build-log.md            # Day-by-day progress
│   ├── parts-list.md           # BOM (bill of materials)
│   └── issues-log.md           # Problems encountered + solutions
│
├── testing/
│   ├── protocols.md
│   └── results.md
│
├── context/
│   ├── CONTEXT.md
│   └── decisions.md
│
└── outputs/
    ├── documentation.md
    └── presentation.md
```

### 6.3 CONTEXT.md Auto-Generation

The crown jewel of the framework. Endeavor auto-generates a `CONTEXT.md` for your project that any AI tool can immediately use:

```markdown
# Project Context — [Project Name]
> Auto-generated by Endeavor | Last updated: [timestamp]
> Do not edit manually — update via `endeavor context update`

## What This Project Is
[1–2 sentence description from vision.md]

## Current Status
Phase: [Development | Experimentation | Testing | ...]
Active task: [most recent in-progress task]
Last activity: [timestamp of last file change]

## Architecture / Structure
[Auto-extracted from architecture.md or codebase analysis]

## Key Decisions Made
- [Date] Chose PostgreSQL over MongoDB because [reason]
- [Date] Using JWT for auth because [reason]
[auto-populated from decisions.md]

## Recent Findings (Research Projects)
- [Date] Experiment 3: 94% accuracy with batch norm
- [Date] Hypothesis 2 refuted: batch size had no effect
[auto-populated from findings.md]

## Files Most Relevant to Current Task
[Auto-identified by semantic similarity to active task]
- src/auth/middleware.ts (most recent change)
- src/auth/jwt.ts
- tests/auth.test.ts

## What Still Needs Work
[Pulled from backlog.md / tasks]

## Don't Repeat These Mistakes
[Pulled from issues-log.md or error entries]
```

**This is the document that gets injected into every AI tool.** It costs ~2,000 tokens instead of 50,000. It's always current.

### 6.4 Artifact Auto-Generation

Endeavor can assemble final outputs from your project files:

```bash
endeavor export paper          # Assembles research paper from project files
endeavor export poster         # Science fair / conference poster template
endeavor export readme         # GitHub README from project docs
endeavor export report         # Progress report
endeavor export presentation   # Slide outline
```

These aren't just copy-paste exports — Endeavor uses AI to assemble, clean, and format them coherently from your accumulated work.

### 6.5 Phase 2 Deliverables

- [ ] 3 project templates (research, software, hardware)
- [ ] `endeavor init` with template selection
- [ ] Experiment log system with standard format
- [ ] CONTEXT.md auto-generation pipeline
- [ ] Task tracking (backlog / in-progress / done)
- [ ] Decision + finding auto-population
- [ ] Artifact export commands
- [ ] AI interaction logging (full JSONL log per project)

---

# 7. COMPONENT 3: ENDEAVOR DESKTOP APP
## Phase 3 — Weeks 7–9

### 7.1 Overview

The desktop app is the **visual layer** — a mission-control center that unifies all your AI tools, shows project state, tracks costs, and makes the project's knowledge graph browsable.

### 7.2 Core UI

```
┌────────────────────────────────────────────────────────────────────┐
│  endeavor  ▸ my-research-project     Budget: $8.20 / $30.00 ██░  │
├────────────┬───────────────────────────────────────────────────────┤
│            │  ┌─────────────────────────────────────────────────┐ │
│ Projects   │  │ [Claude]  [ChatGPT]  [Perplexity]  [+ Add Tool] │ │
│ ─────────  │  ├─────────────────────────────────────────────────┤ │
│ ● ml-proj  │  │                                                   │ │
│ ○ app-v2   │  │  You: How does batch normalization affect        │ │
│ ○ thesis   │  │  training stability in my current architecture?  │ │
│            │  │                                                   │ │
│ Context    │  │  Claude: Based on your experiment logs and       │ │
│ ─────────  │  │  current architecture (context/CONTEXT.md):     │ │
│ 📄 4 files │  │  Experiment 4 showed instability at LR > 0.01.  │ │
│ 🧠 12 mem  │  │  Batch norm should help because...              │ │
│ 🔢 2.1K tk │  │                                                   │ │
│            │  │  [Input]                          ↑ Send         │ │
│ Activity   │  └─────────────────────────────────────────────────┘ │
│ ─────────  │                                                       │
│ 3:22 Claude│  ┌─────────────────────────────────────────────────┐ │
│ 3:15 GPT   │  │  📊 Context Preview                   [Refresh] │ │
│ 2:50 Perp  │  │  Active: CONTEXT.md (1,847 tokens)              │ │
│            │  │  Files: arch.py, exp-004.md, decisions.md       │ │
│ [Dashboard]│  │  Last updated: 3 minutes ago                    │ │
│ [Costs]    │  └─────────────────────────────────────────────────┘ │
│ [Settings] │                                                       │
└────────────┴───────────────────────────────────────────────────────┘
```

### 7.3 Project Dashboard View

The dashboard answers: "What is happening in this project?"

```
Project: ml-research-proj        Week of Feb 17, 2026
─────────────────────────────────────────────────────────

Activity Timeline
─────────────────
11:55 PM  Claude (Sonnet 3.5)   Reviewed batch norm approach
          Context: 1,847 tokens | Cost: $0.018
          Finding logged: "Claude suggested layer norm instead"

10:30 PM  ChatGPT (GPT-4o)      Helped design Exp-005 protocol
          Context: 2,100 tokens | Cost: $0.021
          Decision logged: "Run 5 epochs with lr=0.001"

08:15 PM  Perplexity            Research: batch norm papers
          Context: 800 tokens   | Cost: $0.008
          References added: 4 papers

─────────────────────────────────────────────────────────

Knowledge Graph Summary
───────────────────────
Decisions made:   8
Experiments run:  4
Findings logged:  12
References saved: 23
Active tasks:     3

─────────────────────────────────────────────────────────

Cost Breakdown (This Month)
────────────────────────────
Claude:       $4.20  ████████░░  56%
ChatGPT:      $2.10  ████░░░░░░  28%
Perplexity:   $1.20  ██░░░░░░░░  16%
─────────────────────────────────────
Total:        $7.50  / $30.00 budget
Projected:    $18.75 / month (on track)

Token savings via Endeavor: ~340K tokens (~$3.40 saved)
```

### 7.4 Phase 3 Deliverables

- [ ] Electron app (macOS + Windows + Linux)
- [ ] Tabbed AI interfaces (Claude, ChatGPT, Perplexity)
- [ ] Context preview panel (what AI tools currently see)
- [ ] Project dashboard (activity timeline, knowledge graph summary)
- [ ] Cost tracking + budget management
- [ ] Settings (API keys, project config, tool setup)
- [ ] Auto-updater (electron-updater)
- [ ] Installers for all platforms

---

# 8. COMPONENT 4: PROJECT MANAGEMENT AGENT
## Phase 4 — Business Capstone (Post-Launch)

> This is the feature that turns Endeavor from an open-source tool into a business.

### 8.1 Overview

The Project Management Agent is an **active orchestrator** — not just a passive context layer, but an agent that:

- Understands your project state
- Helps you structure and plan your work
- Actively routes tasks to the right AI tools
- Keeps all tools in sync with updated context documents
- Surfaces what needs attention
- Generates progress reports
- Flags when things go off-track

Think of it as a **proactive project PI** that sits above your other AI tools and coordinates them.

### 8.2 Core Capabilities

**A. Project Structuring**

When you start a new project, the agent runs an intake:
```
Agent: "Let's structure your project. What are you trying to build or discover?"

User: "I want to build an RL agent that can play chess better than stockfish at ELO 2000"

Agent: "Great. This is a research + software project. Here's how I'd suggest structuring it:

Phase 1 (Weeks 1–2): Literature review + baseline
  - Review AlphaZero, MuZero, Leela Chess Zero
  - Implement minimax baseline
  - Set up evaluation framework against Stockfish

Phase 2 (Weeks 3–5): Core RL implementation
  - Implement MCTS + neural network policy
  - Design reward shaping strategy
  - First training run experiments

Phase 3 (Weeks 6–8): Optimization + evaluation
  - Hyperparameter search
  - ELO benchmarking
  - Ablation studies

Shall I create this structure and configure your AI tools for each phase?"
```

**B. Active Task Routing**

```
Agent monitors: you open a chess engine file in Cursor

Agent (automatic): "I see you're working on the MCTS implementation.
I've updated the context for Claude and Cursor with:
  - Your current MCTS pseudocode
  - AlphaZero paper section on MCTS
  - Your experiment logs from exp-003
  - Decision: You're using PUCT selection formula

Claude now has this context. Want me to open a Claude session
focused on the MCTS implementation?"
```

**C. Cross-Tool Context Sync**

The agent ensures every tool is up to date:

```bash
# Manual invocation:
$ endeavor agent sync --all

Syncing project context to all connected tools...

Generating updated CONTEXT.md... done (2,100 tokens)
Pushing to Claude Desktop...     done
Pushing to Cursor...             done
Pushing to ChatGPT...            done

All tools synchronized. Key changes since last sync:
  + Experiment 5 results (94.2% win rate at ELO 1800)
  + Decision: switch to transformer-based evaluation network
  + 3 new reference papers added
```

```bash
# Targeted sync with custom message:
$ endeavor agent sync --tool claude --message "Focus on the new transformer architecture"

Updated Claude's context with:
  - Full transformer implementation (arch.py)
  - Decision rationale for switching from CNN
  - Relevant papers on chess transformers
  - Custom focus note: "transformer architecture review"
```

**D. Progress Monitoring**

```
Agent: "Weekly check-in for ml-research-proj:

✅ Completed this week:
   - Experiment 3, 4, 5 (all logged)
   - Literature review section in research/background.md
   - Baseline Stockfish evaluation framework

⚠️  Off-track:
   - Phase 1 deadline was yesterday (minimax baseline not complete)
   - 0 entries in variables.md (critical for methodology)

📋 Suggested priorities for next 3 days:
   1. Complete minimax baseline (est. 4 hrs)
   2. Fill in variables.md (est. 30 min)
   3. Begin Phase 2 RL implementation

💰 Budget check:
   $12.40 used of $30 — on track
   Claude is 70% of spend — consider routing simpler tasks to Haiku"
```

**E. Report Generation**

```bash
$ endeavor agent report --type progress --audience "science-fair-judge"

Generating progress report for: science-fair-judge audience...

────────────────────────────────────────
PROJECT PROGRESS REPORT
Chess RL Agent | Feb 17, 2026
────────────────────────────────────────
Summary: Built reinforcement learning agent to play chess...
[Auto-assembled from experiment logs, findings, decisions]
────────────────────────────────────────

Saved to: outputs/progress-report-20260217.md
```

### 8.3 Technical Architecture (Agent)

```typescript
// src/agent/projectAgent.ts

class ProjectManagementAgent {
  // Core agent loop
  async observe(): Promise<ProjectState>     // Read current project state
  async plan(state): Promise<AgentPlan>      // Decide what to do
  async act(plan): Promise<ActionResult>     // Execute actions

  // Actions the agent can take
  async syncContextToTool(tool: string, focus?: string): Promise<void>
  async generateContextDoc(project: Project): Promise<string>
  async routeTaskToTool(task: Task): Promise<string>
  async generateReport(type: ReportType): Promise<string>
  async flagBlockers(state: ProjectState): Promise<Blocker[]>
  async suggestNextSteps(state: ProjectState): Promise<Step[]>
  async structureNewProject(description: string): Promise<ProjectPlan>
}
```

The agent uses your **best available LLM** (configurable) as its reasoning engine, with access to the full project knowledge graph.

### 8.4 Why This Is a Business

The free open-source Endeavor (Phases 1–3) gives you:
- MCP plugin (better than ContextSync)
- Project management framework
- Desktop app with dashboard

The **Project Management Agent** is the **Pro tier** ($10–15/month) because:
- It requires ongoing LLM API calls (compute cost)
- It's the most valuable feature (proactive, not just reactive)
- It's the hardest to replicate (accumulates project knowledge over time)
- It creates lock-in through project history and familiarity

**Pricing model**:

| Tier | Price | What You Get |
|------|-------|--------------|
| Open Source | Free | MCP plugin + project framework + basic dashboard |
| Endeavor Pro | $12/month | + Project Management Agent, advanced analytics, priority sync |
| Endeavor Teams | $30/user/month | + Shared projects, team dashboard, admin controls |

---

# 9. TECHNICAL SPECIFICATIONS

## 9.1 Technology Stack

| Component | Technology | Why |
|-----------|------------|-----|
| MCP Plugin | Node.js + TypeScript | MCP SDK is Node-native |
| File Watching | Chokidar | Battle-tested, cross-platform |
| Local DB | SQLite via better-sqlite3 | Zero-config, portable |
| Vector DB | Vectra (local) or Pinecone | Vectra = no API key needed |
| Embeddings | OpenAI text-embedding-3-small | 1536-dim, cheap ($0.02/1M tokens) |
| Desktop App | Electron + React + Tailwind | Cross-platform, web tech |
| Charts | Recharts | React-native, simple |
| Agent | Claude API (configurable) | Best instruction-following |
| Testing | Jest + Vitest | Fast, TypeScript-native |
| Packaging | electron-builder + npm | Standard tooling |

## 9.2 Data Models (SQLite Schema)

```sql
-- Projects
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,  -- research|software|hardware|general
  path        TEXT NOT NULL,
  created_at  INTEGER,
  updated_at  INTEGER
);

-- Knowledge graph entries
CREATE TABLE knowledge (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  type        TEXT NOT NULL,  -- decision|finding|error|hypothesis|file|task|reference
  content     TEXT NOT NULL,
  tags        TEXT,           -- JSON array
  created_by  TEXT,           -- which tool contributed this
  timestamp   INTEGER,
  embedding   BLOB,           -- serialized float32 array
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- File chunks (for semantic search over codebase)
CREATE TABLE file_chunks (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  content     TEXT NOT NULL,
  tokens      INTEGER,
  embedding   BLOB,
  last_modified INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Usage logs (cost tracking)
CREATE TABLE usage_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  TEXT,
  tool        TEXT NOT NULL,
  model       TEXT,
  tokens_in   INTEGER,
  tokens_out  INTEGER,
  cost_usd    REAL,
  timestamp   INTEGER
);

-- Tool registry
CREATE TABLE tools (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT,           -- mcp|api|custom
  config_path TEXT,
  enabled     INTEGER DEFAULT 1,
  last_health_check INTEGER
);
```

## 9.3 Performance Requirements

| Metric | Target |
|--------|--------|
| MCP server startup | < 1 second |
| Context build time | < 500ms |
| Semantic search | < 300ms |
| File index on change | < 3 seconds |
| Desktop app launch | < 3 seconds |
| Memory (plugin idle) | < 80MB |
| Memory (desktop app) | < 250MB |
| Token overhead (MCP tools) | < 1,500 tokens |

## 9.4 Security & Privacy

- **Local-first**: All project data stored locally by default
- **API keys**: Stored in OS keychain (keytar), never in files
- **No telemetry**: Zero data collection without explicit opt-in
- **Open source**: Full code auditable by users
- **Embeddings**: Option to use local embedding model (no API)
- **Agent calls**: User controls which LLM the agent uses

---

# 10. OPEN SOURCE STRATEGY

## 10.1 Why Open Source

Endeavor is open source because:
1. Privacy-first tools should be auditable
2. Open source builds developer trust faster than any marketing
3. Community contributions accelerate features
4. Forking ContextSync ethically requires giving back

## 10.2 Repository Structure

```
endeavor/
├── packages/
│   ├── plugin/              # Universal MCP Plugin (npm: @endeavor/plugin)
│   ├── framework/           # Project templates + scaffolding
│   ├── desktop/             # Electron app
│   └── agent/               # Project Management Agent (Pro)
├── docs/
│   ├── getting-started.md
│   ├── api-reference.md
│   ├── contributing.md
│   └── rfcs/                # Request for Comments (design decisions)
├── examples/
│   ├── research-project/
│   ├── software-project/
│   └── hardware-project/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/           # CI/CD
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── LICENSE (MIT)
```

## 10.3 Contributing Philosophy

Build in public from day one:
- **RFC process** for significant design decisions (see `docs/rfcs/`)
- **Transparent roadmap** in GitHub Projects
- **Weekly dev log** on GitHub Discussions
- **Good first issue** labels for community contributors
- **Acknowledge ContextSync** in README and CHANGELOG

## 10.4 Authentic Open Source Practices

Things that make Endeavor look authentic vs. rushed:
- Meaningful commit messages that tell a story
- RFCs written *before* major implementations
- Issues opened for things you know need fixing
- External contributors credited prominently
- Limitations documented honestly
- Performance benchmarks published (especially vs. ContextSync)

---

# 11. ACCESSIBILITY & IMPACT

## 11.1 Design for Access

Every feature decision is filtered through: "Can a motivated student with no mentor use this?"

Specific accessibility commitments:
- **Free tier is genuinely useful** (not crippled)
- **Works on $10/month AI budget** (token optimization is a core feature, not a bonus)
- **No assumed knowledge**: onboarding teaches research/engineering methodology
- **Multiple project types**: not just coding, supports science, hardware, general research
- **Offline mode**: basic functionality works without internet

## 11.2 Pilot Program

During development, recruit 10–20 students to use Endeavor on real projects:
- Students at your school
- Science fair participants
- Students from underserved districts (reach out to teachers / FIRST Robotics teams)
- Online communities (r/learnmachinelearning, AI Discord servers)

Document:
- What they built
- Whether they would have attempted it without Endeavor
- Cost savings
- Testimonials

This becomes the impact evidence for college applications.

---

# 12. MONETIZATION (LONG-TERM)

| Phase | Timeline | Revenue Model |
|-------|----------|--------------|
| Open Source Launch | Months 1–3 | Free, build user base |
| Endeavor Pro | Month 4+ | $12/month — Project Management Agent |
| Endeavor Teams | Month 6+ | $30/user/month — shared projects, admin |
| Endeavor Cloud | Year 2 | Hosted sync for teams, enterprise |

**Not planned**: Ads, data monetization, forced upgrades

---

# 13. RISKS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MCP protocol changes | Medium | High | Modular design, fallback API mode |
| OpenAI/Anthropic adds native context sync | Medium | High | Move fast, focus on multi-tool (they won't coordinate competitors) |
| Low adoption (project too niche) | Medium | Medium | Pilot program validates demand before full build |
| Token optimization doesn't work at scale | Low | High | Benchmark early, publish results |
| ContextSync community hostile to fork | Low | Low | Attribute clearly, improve substantially, contribute upstream |
| Solo dev burnout in 10 weeks | High | High | Strict scope per phase, cut desktop app to web if needed |

---

# 14. SUCCESS METRICS

## Development Milestones

| Phase | Week | Key Metric |
|-------|------|-----------|
| Plugin v1 | Week 3 | < 1,500 token overhead, 3 tools connected |
| Framework v1 | Week 6 | 3 templates working, CONTEXT.md auto-gen |
| Desktop v1 | Week 9 | App launches, dashboard shows real data |
| Pilot complete | Week 10 | 10+ students used it, impact documented |

## Post-Launch Metrics (Month 1)

- 500+ npm installs of `@endeavor/plugin`
- 50+ GitHub stars
- 10+ pilot users with documented projects
- Average token reduction: > 80% vs. naive approach
- $0 average monthly cost for free-tier users (token optimization works)

---

# 15. GLOSSARY

**MCP (Model Context Protocol)**: Anthropic's open protocol for connecting AI models to external tools and data sources via a standardized interface.

**Context window**: The maximum number of tokens an LLM can process in a single request. Typically 128K (GPT-4o) to 200K (Claude 3.5).

**Token**: Unit of text used for LLM billing. Roughly 4 characters or ¾ of a word.

**Vector embedding**: Dense numerical representation of text that encodes semantic meaning, enabling similarity search.

**Knowledge graph**: Structured store of typed relationships between entities (in Endeavor: decisions, findings, files, tasks, references within a project).

**Context routing**: Deciding which parts of a project's knowledge are relevant to a given AI tool's current task, and sending only those parts.

**CONTEXT.md**: Endeavor's auto-generated project context document — the single source of truth that all AI tools receive.

---

*Endeavor is built with the belief that ambitious work should not require elite access. A motivated student with a laptop and an internet connection should be able to conduct real research, build real products, and create real things — with AI as their collaborator, and Endeavor as their coordinator.*

---

**Document**: PRD v3.0  
**Updated**: February 17, 2026  
**Next**: See PLAN.md for week-by-week execution
