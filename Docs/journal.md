# Endeavor PM IDE — Development Journal

*A chronicle of how this project evolved over time.*

---

## The Origin: HARBOR and the Context Problem

The idea for Endeavor didn't start as a product idea — it started as a pain point I kept running into while building something else entirely.

I was deep in building HARBOR, a paper-trading algorithm. HARBOR was a complex, multi-file project: quantitative models, backtesting logic, risk metric calculators, statistical validation — the kind of codebase where you're constantly switching between different AI tools to get things done. I'd use Claude for reasoning through a tricky calculation, jump over to ChatGPT for a different angle, then switch to Cursor to actually write and debug the code.

Every single time I switched tools, I had to re-explain the project from scratch. "Here's what HARBOR does. Here's what the notebook looks like. Here's the cell that's broken. Here's the error." Over and over. Context got lost between tools. Each tool had its own version of what my project was, and none of them talked to each other. I was spending more time explaining the project to AI than I was spending building it.

That's when it clicked: the problem wasn't any individual tool — the problem was that **context doesn't travel between them**.

---

## The First Idea: The "Hangar"

My first attempt at solving this was ambitious — maybe too ambitious.

I called it the "Hangar." The concept was a centralized environment where all your AI tools lived under one roof. You'd open the Hangar, and Claude, ChatGPT, Cursor — all of them — would be right there. You could call multiple tools at the same time, orchestrate them in parallel, and everything would sync to a single shared workspace. One project, one place, all tools aware of each other simultaneously.

The vision was compelling: imagine kicking off a Claude analysis and a ChatGPT brainstorm at the same time, both pulling from the same project context, both writing back to the same shared state. A true command center for AI-assisted development.

But reality hit fast.

**The token problem was brutal.** Every tool needed full context on every call. Running multiple AI tools simultaneously meant multiplying that context overhead across all of them. Token costs stacked up exponentially — not linearly. A single work session could burn through hundreds of thousands of tokens just keeping all the tools in sync with each other. The "Hangar" approach wasn't just expensive — it was *exhaustively* expensive, to the point where the overhead of coordination outweighed the benefit of using the tools at all.

I was trying to solve a context problem by throwing more context at it. That doesn't work.

---

## The Pivot: From Orchestration to Coordination

The lesson from the Hangar failure was clear: you don't need all your tools running in the same place at the same time. What you need is for each tool to **already know** what your project is about when you open it. The problem isn't orchestration — it's context persistence.

That realization reshaped the entire project. Instead of a centralized hub that runs everything, Endeavor became a **coordination layer** — a lightweight plugin that sits underneath all your AI tools and keeps them quietly informed. No parallel execution. No token-heavy multi-tool sync. Just a shared context store that any tool can tap into when it needs to.

The new architecture is two things, built in sequence:

1. **A context sync plugin** — an MCP server + local REST API that connects to Claude, Cursor, ChatGPT, and any other tool. It watches your project files, builds semantic understanding via embeddings, and auto-injects relevant context before every query. One tool definition (~1,200 tokens) instead of the 40-80K that a naive multi-tool approach would require.

2. **A desktop app** — a unified interface that gives you visibility into what context is being shared, what it's costing you, and how your project is evolving. Built on top of the same plugin API.

The core insight: **make context ambient, not active.** The tool shouldn't require you to manage it. You just work, and every AI tool you talk to already knows what you're working on.

---

## Where Things Stand Now

The Hangar idea was a necessary wrong turn. Working through it — and watching real token costs spiral out of control while debugging HARBOR — gave me the clarity to land on something more sustainable. The current design is leaner, cheaper, and more useful. It solves the exact problem I kept hitting: re-explaining my project every time I switched tools.

HARBOR, ironically, became the proof case for why Endeavor needs to exist. Every frustrating context-switching session while debugging a notebook cell or tuning a risk model was another data point in favor of building a better way.

---

*More entries to follow as the project progresses.*
