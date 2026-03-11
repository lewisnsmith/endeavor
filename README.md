# Endeavor

Terminal-native coordination for parallel Claude Code work.

When you're running 2-4 Claude Code sessions or subagents in parallel, Endeavor tracks:
- **Who** is working on **what**
- **What** was decided and why
- **What** depends on what
- **What** handoff is pending
- **What** makes a task done

## Quick start

```bash
npm install -g @endeavor/cli    # or use npx

cd your-project
endeavor init
endeavor assign "Add auth middleware" --to @agent-1 --branch feature/auth
endeavor assign "Write API tests" --criteria "all endpoints covered"
endeavor depend w_002 w_001      # tests depend on auth
endeavor status                  # see the full picture
```

## Commands

| Command | What it does |
|---------|-------------|
| `endeavor init` | Initialize coordination in current project |
| `endeavor status` | Show all work items, handoffs, recent decisions |
| `endeavor assign <desc>` | Create a work item, optionally assign to an agent |
| `endeavor decide <summary>` | Record a decision with rationale |
| `endeavor depend <item> <on>` | Declare a blocking dependency |
| `endeavor handoff <to> <summary>` | Hand off context to another agent/session |
| `endeavor done <item>` | Check criteria and mark complete |
| `endeavor next` | Show what's unblocked and ready |

Every command supports `--json` for machine consumption.

## How it works

- **Local-first**: Single SQLite file at `.endeavor/endeavor.db` in your project root
- **Worktree-aware**: All git worktrees share one coordination database
- **Concurrent-safe**: WAL mode handles parallel agent access
- **No daemon required**: Each command opens the DB, does its work, exits

## Design philosophy

Endeavor is not a project manager, memory layer, or AI dashboard.
It's the lightest possible coordination layer that lets parallel Claude Code
sessions stay aware of each other without leaving the terminal.

## Development

```bash
npm install
npm run typecheck
npm run build
npm run test
```

## License

MIT License. See `LICENSE`.
