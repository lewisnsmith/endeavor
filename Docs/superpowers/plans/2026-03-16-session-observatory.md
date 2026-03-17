# Session Observatory Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Endeavor's coordination layer with a TUI-based Claude session multiplexer and observatory.

**Architecture:** Two packages (`core` + `tui`). Core owns the data layer (SQLite), session manager, adapter interface, and launcher adapter. TUI owns the Ink-based terminal UI and observer adapter. Sessions are spawned via `child_process.spawn('claude', ['--print', '--output-format', 'stream-json'])` and observed via process list scanning.

**Tech Stack:** TypeScript, better-sqlite3, nanoid, Ink (React for terminals), child_process.spawn

**Spec:** `Docs/superpowers/specs/2026-03-16-session-observatory-design.md`

---

## File Structure

### packages/core/src/ (modify existing package)

| File | Action | Responsibility |
|------|--------|---------------|
| `types.ts` | **Replace** | New session types: `SessionSnapshot`, `SessionStatus`, `SpawnOpts`, `SessionEvent`, `Unsubscribe` |
| `errors.ts` | **Modify** | Remove old error codes, add: `SESSION_NOT_FOUND`, `SESSION_INVALID_STATE`, `SPAWN_FAILED`, `ADAPTER_ERROR` |
| `ids.ts` | **Replace** | New prefixes: `session` → `s_`, `sessionEvent` → `se_` |
| `logger.ts` | **Keep** | No changes |
| `storage/database.ts` | **Modify** | Add `PRAGMA integrity_check` on startup, v2 DB backup logic |
| `storage/migrations.ts` | **Replace** | New v0.3 schema: `sessions` + `session_events` tables with indexes |
| `storage/session-repo.ts` | **Create** | CRUD for sessions table, Row/mapRow pattern |
| `storage/event-repo.ts` | **Create** | CRUD for session_events table, Row/mapRow pattern |
| `storage/index.ts` | **Replace** | Export new repos |
| `adapters/types.ts` | **Create** | `SessionAdapter` interface + `AdapterCapabilities` |
| `adapters/launcher.ts` | **Create** | `LauncherAdapter`: spawn, kill, sendInput via child_process |
| `adapters/index.ts` | **Create** | Barrel exports |
| `stream-parser.ts` | **Create** | Line-delimited JSON parser for Claude's stream-json stdout |
| `session-manager.ts` | **Create** | Facade: adapter registration, unified discover/spawn/kill/sendInput |
| `index.ts` | **Replace** | Export new public API |

### packages/core/src/ (delete)

| File | Action |
|------|--------|
| `storage/project-repository.ts` | **Delete** |
| `storage/work-item-repo.ts` | **Delete** |
| `storage/decision-repo.ts` | **Delete** |
| `storage/dependency-repo.ts` | **Delete** |
| `storage/handoff-repo.ts` | **Delete** |
| `storage/done-criteria-repo.ts` | **Delete** |
| `storage/*.test.ts` (all 6 old repo tests) | **Delete** |
| `operations/` (entire directory) | **Delete** |
| `endeavor.ts` | **Delete** |
| `endeavor.test.ts` | **Delete** |

### packages/tui/ (new package)

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | **Create** | Deps: ink, react, ink-text-input, @endeavor/core |
| `tsconfig.json` | **Create** | Extends base, adds JSX support for Ink |
| `vitest.config.ts` | **Create** | Test config |
| `src/index.tsx` | **Create** | Entry point: parse CLI flags, create SessionManager, render App |
| `src/app.tsx` | **Create** | Root Ink component: Dashboard ↔ FocusView routing |
| `src/observer/process-scanner.ts` | **Create** | `ps` parsing + `lsof` cwd extraction (platform-aware) |
| `src/observer/observer-adapter.ts` | **Create** | `ObserverAdapter`: polls process-scanner, deduplicates |
| `src/components/dashboard.tsx` | **Create** | Grid layout: tile arrangement, scrolling, resize |
| `src/components/session-tile.tsx` | **Create** | Single tile: color, status badge, label, cost, duration |
| `src/components/focus-view.tsx` | **Create** | Conversation renderer + input bar |
| `src/components/top-bar.tsx` | **Create** | Aggregate stats bar |
| `src/components/bottom-bar.tsx` | **Create** | Keybinding hints |
| `src/components/spawn-dialog.tsx` | **Create** | New session prompt (cwd + label) |

### packages/cli/ and packages/daemon/ (delete entire packages)

### Root files (modify)

| File | Action | Change |
|------|--------|--------|
| `package.json` | **Modify** | Update workspaces, build scripts, version to 0.3.0 |
| `CLAUDE.md` | **Modify** | Update project description, package list, entity model |

---

## Chunk 1: Core Data Layer

### Task 1: Clean up old code

**Files:**
- Delete: `packages/core/src/storage/project-repository.ts`
- Delete: `packages/core/src/storage/work-item-repo.ts`
- Delete: `packages/core/src/storage/decision-repo.ts`
- Delete: `packages/core/src/storage/dependency-repo.ts`
- Delete: `packages/core/src/storage/handoff-repo.ts`
- Delete: `packages/core/src/storage/done-criteria-repo.ts`
- Delete: `packages/core/src/storage/project-repository.test.ts`
- Delete: `packages/core/src/storage/database.test.ts`
- Delete: `packages/core/src/storage/work-item-repo.test.ts`
- Delete: `packages/core/src/storage/dependency-repo.test.ts`
- Delete: `packages/core/src/storage/done-criteria-repo.test.ts`
- Delete: `packages/core/src/storage/decision-repo.test.ts`
- Delete: `packages/core/src/storage/handoff-repo.test.ts`
- Delete: `packages/core/src/operations/` (entire directory: init.ts, status.ts, assign.ts, decide.ts, depend.ts, handoff.ts, done.ts, next.ts, index.ts)
- Delete: `packages/core/src/endeavor.ts`
- Delete: `packages/core/src/endeavor.test.ts`
- Delete: `packages/cli/` (entire package)
- Delete: `packages/daemon/` (entire package)

- [ ] **Step 1: Delete old repo files, operations, facade, and tests**

```bash
rm packages/core/src/storage/project-repository.ts
rm packages/core/src/storage/work-item-repo.ts
rm packages/core/src/storage/decision-repo.ts
rm packages/core/src/storage/dependency-repo.ts
rm packages/core/src/storage/handoff-repo.ts
rm packages/core/src/storage/done-criteria-repo.ts
rm packages/core/src/storage/project-repository.test.ts
rm packages/core/src/storage/database.test.ts
rm packages/core/src/storage/work-item-repo.test.ts
rm packages/core/src/storage/dependency-repo.test.ts
rm packages/core/src/storage/done-criteria-repo.test.ts
rm packages/core/src/storage/decision-repo.test.ts
rm packages/core/src/storage/handoff-repo.test.ts
rm -rf packages/core/src/operations
rm packages/core/src/endeavor.ts
rm packages/core/src/endeavor.test.ts
```

- [ ] **Step 2: Delete cli and daemon packages**

```bash
rm -rf packages/cli
rm -rf packages/daemon
```

- [ ] **Step 3: Commit the cleanup**

```bash
git add -A
git commit -m "chore: remove v0.2 coordination layer code

Remove old entity model (6 tables), operations, CLI, and daemon
packages. Keeping: database.ts, logger.ts, ids.ts, errors.ts,
migrations.ts (to be replaced), and build infrastructure."
```

### Task 2: New types and IDs

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/ids.ts`
- Modify: `packages/core/src/errors.ts`

- [ ] **Step 1: Replace types.ts with session types**

Write `packages/core/src/types.ts`:

```typescript
export type SessionSource = 'launched' | 'observed' | 'api' | 'cloud';

export type SessionStatus =
  | 'active'
  | 'waiting_input'
  | 'waiting_approval'
  | 'error'
  | 'completed'
  | 'dead';

export interface SessionSnapshot {
  id: string;
  source: SessionSource;
  status: SessionStatus;
  claudeSessionId: string | null;
  pid: number | null;
  label: string;
  cwd: string;
  branch: string | null;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  model: string | null;
  lastOutputAt: string | null;
  startedAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface SpawnOpts {
  cwd: string;
  label?: string;
  initialPrompt?: string;
  resumeSessionId?: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: SessionEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type SessionEventType =
  | 'status_change'
  | 'prompt'
  | 'response'
  | 'error'
  | 'cost_tick'
  | 'tool_use';

export type Unsubscribe = () => void;

/** Idle threshold: session is "idle" if no output for this many ms */
export const IDLE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/** Color thresholds for tile display */
export const ACTIVE_OUTPUT_THRESHOLD_MS = 10 * 1000; // 10 seconds
```

- [ ] **Step 2: Replace ids.ts with new prefixes**

Write `packages/core/src/ids.ts`:

```typescript
import { nanoid } from 'nanoid';

const PREFIXES = {
  session: 's_',
  sessionEvent: 'se_',
} as const;

type EntityType = keyof typeof PREFIXES;

export function generateId(type: EntityType): string {
  return `${PREFIXES[type]}${nanoid(12)}`;
}
```

- [ ] **Step 3: Replace errors.ts with new error codes**

Write `packages/core/src/errors.ts`:

```typescript
export enum ErrorCode {
  DB_INIT_FAILED = 'DB_INIT_FAILED',
  DB_CORRUPT = 'DB_CORRUPT',
  DB_FULL = 'DB_FULL',
  MIGRATION_FAILED = 'MIGRATION_FAILED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_INVALID_STATE = 'SESSION_INVALID_STATE',
  SPAWN_FAILED = 'SPAWN_FAILED',
  ADAPTER_ERROR = 'ADAPTER_ERROR',
  ADAPTER_DUPLICATE = 'ADAPTER_DUPLICATE',
}

export class EndeavorError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EndeavorError';
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/ids.ts packages/core/src/errors.ts
git commit -m "feat: replace entity model with session types

New types: SessionSnapshot, SessionStatus, SessionEvent, SpawnOpts.
New ID prefixes: s_, se_. New error codes for session operations."
```

### Task 3: New migration and database hardening

**Files:**
- Modify: `packages/core/src/storage/migrations.ts`
- Modify: `packages/core/src/storage/database.ts`
- Test: `packages/core/src/storage/database.test.ts`

- [ ] **Step 1: Write the database test**

Create `packages/core/src/storage/database.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EndeavorDatabase } from './database.js';
import { createLogger } from '../logger.js';

describe('EndeavorDatabase', () => {
  let db: EndeavorDatabase;
  const logger = createLogger('test', { level: 'error' });

  beforeEach(() => {
    db = new EndeavorDatabase({ dbPath: ':memory:', logger });
  });

  afterEach(() => {
    db.close();
  });

  it('creates sessions and session_events tables', () => {
    db.initialize();
    const raw = db.getDb();

    const tables = raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name);

    expect(tables).toContain('sessions');
    expect(tables).toContain('session_events');
    expect(tables).toContain('_migrations');
    // Old tables should NOT exist
    expect(tables).not.toContain('projects');
    expect(tables).not.toContain('work_items');
  });

  it('creates indexes for performance', () => {
    db.initialize();
    const raw = db.getDb();

    const indexes = raw
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
      .all()
      .map((r) => (r as { name: string }).name);

    expect(indexes).toContain('idx_sessions_status');
    expect(indexes).toContain('idx_session_events_session');
  });

  it('enforces session status CHECK constraint', () => {
    db.initialize();
    const raw = db.getDb();

    expect(() => {
      raw.prepare(
        `INSERT INTO sessions (id, source, status, label, cwd, input_tokens, output_tokens, total_cost_usd, started_at, updated_at)
         VALUES ('s_test', 'launched', 'INVALID', 'test', '/tmp', 0, 0, 0, '2026-01-01', '2026-01-01')`
      ).run();
    }).toThrow();
  });

  it('sets WAL mode and busy_timeout', () => {
    db.initialize();
    const raw = db.getDb();

    const journal = raw.pragma('journal_mode') as { journal_mode: string }[];
    expect(journal[0].journal_mode).toBe('wal');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: FAIL — old migration creates old tables, new tables don't exist

- [ ] **Step 3: Replace migrations.ts with v0.3 schema**

Write `packages/core/src/storage/migrations.ts`:

```typescript
export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'session_observatory_schema',
    up: `
      CREATE TABLE sessions (
        id                TEXT PRIMARY KEY,
        source            TEXT NOT NULL CHECK(source IN ('launched','observed','api','cloud')),
        status            TEXT NOT NULL DEFAULT 'active'
                          CHECK(status IN ('active','waiting_input','waiting_approval','error','completed','dead')),
        claude_session_id TEXT,
        pid               INTEGER,
        label             TEXT NOT NULL,
        cwd               TEXT NOT NULL,
        branch            TEXT,
        input_tokens      INTEGER NOT NULL DEFAULT 0,
        output_tokens     INTEGER NOT NULL DEFAULT 0,
        total_cost_usd    REAL NOT NULL DEFAULT 0,
        model             TEXT,
        last_output_at    TEXT,
        started_at        TEXT NOT NULL,
        updated_at        TEXT NOT NULL,
        metadata          TEXT DEFAULT '{}'
      );

      CREATE TABLE session_events (
        id          TEXT PRIMARY KEY,
        session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        type        TEXT NOT NULL CHECK(type IN ('status_change','prompt','response','error','cost_tick','tool_use')),
        payload     TEXT NOT NULL DEFAULT '{}',
        created_at  TEXT NOT NULL
      );

      CREATE INDEX idx_sessions_status ON sessions(status);
      CREATE INDEX idx_session_events_session ON session_events(session_id, created_at);
    `,
    down: `
      DROP TABLE IF EXISTS session_events;
      DROP TABLE IF EXISTS sessions;
    `,
  },
];
```

- [ ] **Step 4: Modify database.ts to add integrity check and v2 backup**

Add to `packages/core/src/storage/database.ts`, at the top of the `initialize()` method, before `this.db = new Database(...)`:

```typescript
// Before opening, backup v0.2 DB if it has old schema
if (this.dbPath !== ':memory:') {
  this.backupV2IfNeeded();
}
```

Add the private method to `EndeavorDatabase`:

First, extend the `import { mkdirSync } from 'node:fs'` at the top of `database.ts` to:

```typescript
import { mkdirSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
```

Then add the private method to `EndeavorDatabase`:

```typescript
private backupV2IfNeeded(): void {
  // If DB exists, check if it has old schema
  if (!existsSync(this.dbPath)) return;

  try {
    const testDb = new Database(this.dbPath, { readonly: true });
    const tables = testDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => (r as { name: string }).name);
    testDb.close();

    if (tables.includes('work_items') && !tables.includes('sessions')) {
      const backupPath = this.dbPath.replace(/\.db$/, '.v2.db');
      this.logger.info('Backing up v0.2 database', { from: this.dbPath, to: backupPath });
      copyFileSync(this.dbPath, backupPath);
      // Also copy WAL and SHM if they exist
      if (existsSync(this.dbPath + '-wal')) {
        copyFileSync(this.dbPath + '-wal', backupPath + '-wal');
      }
      if (existsSync(this.dbPath + '-shm')) {
        copyFileSync(this.dbPath + '-shm', backupPath + '-shm');
      }
      // Remove old DB so fresh migration runs
      unlinkSync(this.dbPath);
      if (existsSync(this.dbPath + '-wal')) unlinkSync(this.dbPath + '-wal');
      if (existsSync(this.dbPath + '-shm')) unlinkSync(this.dbPath + '-shm');
    }
  } catch {
    // If we can't read the old DB, just proceed — migration will create fresh
    this.logger.warn('Could not check existing database, will create fresh');
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/storage/database.ts packages/core/src/storage/database.test.ts packages/core/src/storage/migrations.ts
git commit -m "feat: v0.3 session schema with DB hardening

New migration creates sessions + session_events tables with indexes.
Database backs up v0.2 DB before creating fresh schema.
Includes integrity check support."
```

### Task 4: Session repository

**Files:**
- Create: `packages/core/src/storage/session-repo.ts`
- Test: `packages/core/src/storage/session-repo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/storage/session-repo.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SessionRepository } from './session-repo.js';
import { migrations } from './migrations.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(migrations[0].up);
  return db;
}

describe('SessionRepository', () => {
  let db: Database.Database;
  let repo: SessionRepository;

  beforeEach(() => {
    db = setupDb();
    repo = new SessionRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates and retrieves a session', () => {
    const session = repo.create({
      source: 'launched',
      label: 'test-session',
      cwd: '/tmp/project',
    });

    expect(session.id).toMatch(/^s_/);
    expect(session.source).toBe('launched');
    expect(session.status).toBe('active');
    expect(session.label).toBe('test-session');
    expect(session.cwd).toBe('/tmp/project');
    expect(session.inputTokens).toBe(0);
    expect(session.totalCostUsd).toBe(0);

    const found = repo.getById(session.id);
    expect(found).toEqual(session);
  });

  it('lists sessions ordered by updated_at DESC', () => {
    const s1 = repo.create({ source: 'launched', label: 'first', cwd: '/tmp' });
    const s2 = repo.create({ source: 'observed', label: 'second', cwd: '/tmp' });

    const all = repo.list();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(s2.id); // most recently created
  });

  it('updates session status', () => {
    const session = repo.create({ source: 'launched', label: 'test', cwd: '/tmp' });
    const updated = repo.update(session.id, { status: 'waiting_input' });

    expect(updated.status).toBe('waiting_input');
    expect(updated.updatedAt).not.toBe(session.updatedAt);
  });

  it('updates session metrics', () => {
    const session = repo.create({ source: 'launched', label: 'test', cwd: '/tmp' });
    const updated = repo.update(session.id, {
      inputTokens: 500,
      outputTokens: 200,
      totalCostUsd: 0.042,
      model: 'claude-sonnet-4-6',
    });

    expect(updated.inputTokens).toBe(500);
    expect(updated.outputTokens).toBe(200);
    expect(updated.totalCostUsd).toBe(0.042);
    expect(updated.model).toBe('claude-sonnet-4-6');
  });

  it('updates pid and claudeSessionId', () => {
    const session = repo.create({ source: 'launched', label: 'test', cwd: '/tmp' });
    const updated = repo.update(session.id, { pid: 12345, claudeSessionId: 'abc-123' });

    expect(updated.pid).toBe(12345);
    expect(updated.claudeSessionId).toBe('abc-123');
  });

  it('returns null for nonexistent session', () => {
    expect(repo.getById('s_nonexistent')).toBeNull();
  });

  it('lists by status', () => {
    repo.create({ source: 'launched', label: 'a', cwd: '/tmp' });
    const s2 = repo.create({ source: 'launched', label: 'b', cwd: '/tmp' });
    repo.update(s2.id, { status: 'waiting_input' });

    const waiting = repo.listByStatus('waiting_input');
    expect(waiting).toHaveLength(1);
    expect(waiting[0].id).toBe(s2.id);
  });

  it('deletes a session', () => {
    const session = repo.create({ source: 'launched', label: 'test', cwd: '/tmp' });
    expect(repo.delete(session.id)).toBe(true);
    expect(repo.getById(session.id)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: FAIL — `SessionRepository` does not exist

- [ ] **Step 3: Implement session-repo.ts**

Create `packages/core/src/storage/session-repo.ts`:

```typescript
import type Database from 'better-sqlite3';
import type { SessionSnapshot, SessionSource, SessionStatus } from '../types.js';
import { generateId } from '../ids.js';

interface SessionRow {
  id: string;
  source: string;
  status: string;
  claude_session_id: string | null;
  pid: number | null;
  label: string;
  cwd: string;
  branch: string | null;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  model: string | null;
  last_output_at: string | null;
  started_at: string;
  updated_at: string;
  metadata: string;
}

function mapRow(row: SessionRow): SessionSnapshot {
  return {
    id: row.id,
    source: row.source as SessionSource,
    status: row.status as SessionStatus,
    claudeSessionId: row.claude_session_id,
    pid: row.pid,
    label: row.label,
    cwd: row.cwd,
    branch: row.branch,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalCostUsd: row.total_cost_usd,
    model: row.model,
    lastOutputAt: row.last_output_at,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    metadata: JSON.parse(row.metadata),
  };
}

export interface CreateSessionParams {
  source: SessionSource;
  label: string;
  cwd: string;
  branch?: string;
  pid?: number;
  claudeSessionId?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateSessionParams = Partial<{
  status: SessionStatus;
  claudeSessionId: string | null;
  pid: number | null;
  label: string;
  branch: string | null;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  model: string | null;
  lastOutputAt: string | null;
  metadata: Record<string, unknown>;
}>;

export class SessionRepository {
  constructor(private db: Database.Database) {}

  create(params: CreateSessionParams): SessionSnapshot {
    const now = new Date().toISOString();
    const id = generateId('session');

    this.db.prepare(
      `INSERT INTO sessions (id, source, status, label, cwd, branch, pid, claude_session_id, input_tokens, output_tokens, total_cost_usd, started_at, updated_at, metadata)
       VALUES (?, ?, 'active', ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?)`
    ).run(
      id,
      params.source,
      params.label,
      params.cwd,
      params.branch ?? null,
      params.pid ?? null,
      params.claudeSessionId ?? null,
      now,
      now,
      JSON.stringify(params.metadata ?? {}),
    );

    return this.getById(id)!;
  }

  getById(id: string): SessionSnapshot | null {
    const row = this.db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(id) as SessionRow | undefined;
    return row ? mapRow(row) : null;
  }

  list(): SessionSnapshot[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions ORDER BY updated_at DESC')
      .all() as SessionRow[];
    return rows.map(mapRow);
  }

  listByStatus(status: SessionStatus): SessionSnapshot[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions WHERE status = ? ORDER BY updated_at DESC')
      .all(status) as SessionRow[];
    return rows.map(mapRow);
  }

  update(id: string, params: UpdateSessionParams): SessionSnapshot {
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (params.status !== undefined) { sets.push('status = ?'); values.push(params.status); }
    if (params.claudeSessionId !== undefined) { sets.push('claude_session_id = ?'); values.push(params.claudeSessionId); }
    if (params.pid !== undefined) { sets.push('pid = ?'); values.push(params.pid); }
    if (params.label !== undefined) { sets.push('label = ?'); values.push(params.label); }
    if (params.branch !== undefined) { sets.push('branch = ?'); values.push(params.branch); }
    if (params.inputTokens !== undefined) { sets.push('input_tokens = ?'); values.push(params.inputTokens); }
    if (params.outputTokens !== undefined) { sets.push('output_tokens = ?'); values.push(params.outputTokens); }
    if (params.totalCostUsd !== undefined) { sets.push('total_cost_usd = ?'); values.push(params.totalCostUsd); }
    if (params.model !== undefined) { sets.push('model = ?'); values.push(params.model); }
    if (params.lastOutputAt !== undefined) { sets.push('last_output_at = ?'); values.push(params.lastOutputAt); }
    if (params.metadata !== undefined) { sets.push('metadata = ?'); values.push(JSON.stringify(params.metadata)); }

    values.push(id);
    this.db.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    return this.getById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/storage/session-repo.ts packages/core/src/storage/session-repo.test.ts
git commit -m "feat: add SessionRepository with CRUD operations

Row/mapRow pattern matching existing codebase conventions.
Supports create, getById, list, listByStatus, update, delete."
```

### Task 5: Session event repository

**Files:**
- Create: `packages/core/src/storage/event-repo.ts`
- Test: `packages/core/src/storage/event-repo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/storage/event-repo.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SessionRepository } from './session-repo.js';
import { SessionEventRepository } from './event-repo.js';
import { migrations } from './migrations.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(migrations[0].up);
  return db;
}

describe('SessionEventRepository', () => {
  let db: Database.Database;
  let sessions: SessionRepository;
  let events: SessionEventRepository;
  let sessionId: string;

  beforeEach(() => {
    db = setupDb();
    sessions = new SessionRepository(db);
    events = new SessionEventRepository(db);
    const session = sessions.create({ source: 'launched', label: 'test', cwd: '/tmp' });
    sessionId = session.id;
  });

  afterEach(() => {
    db.close();
  });

  it('creates and retrieves an event', () => {
    const event = events.create({
      sessionId,
      type: 'status_change',
      payload: { from: 'active', to: 'waiting_input' },
    });

    expect(event.id).toMatch(/^se_/);
    expect(event.sessionId).toBe(sessionId);
    expect(event.type).toBe('status_change');
    expect(event.payload).toEqual({ from: 'active', to: 'waiting_input' });
  });

  it('lists events for a session in chronological order', () => {
    events.create({ sessionId, type: 'response', payload: { text: 'first' } });
    events.create({ sessionId, type: 'tool_use', payload: { name: 'Read' } });
    events.create({ sessionId, type: 'response', payload: { text: 'second' } });

    const all = events.listBySession(sessionId);
    expect(all).toHaveLength(3);
    expect(all[0].type).toBe('response');
    expect(all[2].type).toBe('response');
  });

  it('limits results with limit parameter', () => {
    events.create({ sessionId, type: 'response', payload: {} });
    events.create({ sessionId, type: 'response', payload: {} });
    events.create({ sessionId, type: 'response', payload: {} });

    const limited = events.listBySession(sessionId, { limit: 2 });
    expect(limited).toHaveLength(2);
  });

  it('cascades delete when session is deleted', () => {
    events.create({ sessionId, type: 'response', payload: {} });
    sessions.delete(sessionId);

    const remaining = events.listBySession(sessionId);
    expect(remaining).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: FAIL — `SessionEventRepository` does not exist

- [ ] **Step 3: Implement event-repo.ts**

Create `packages/core/src/storage/event-repo.ts`:

```typescript
import type Database from 'better-sqlite3';
import type { SessionEvent, SessionEventType } from '../types.js';
import { generateId } from '../ids.js';

interface EventRow {
  id: string;
  session_id: string;
  type: string;
  payload: string;
  created_at: string;
}

function mapRow(row: EventRow): SessionEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type as SessionEventType,
    payload: JSON.parse(row.payload),
    createdAt: row.created_at,
  };
}

export interface CreateEventParams {
  sessionId: string;
  type: SessionEventType;
  payload: Record<string, unknown>;
}

export class SessionEventRepository {
  constructor(private db: Database.Database) {}

  create(params: CreateEventParams): SessionEvent {
    const now = new Date().toISOString();
    const id = generateId('sessionEvent');

    this.db.prepare(
      `INSERT INTO session_events (id, session_id, type, payload, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, params.sessionId, params.type, JSON.stringify(params.payload), now);

    return { id, sessionId: params.sessionId, type: params.type, payload: params.payload, createdAt: now };
  }

  listBySession(sessionId: string, opts?: { limit?: number }): SessionEvent[] {
    const limit = opts?.limit;
    const query = limit
      ? 'SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at ASC LIMIT ?'
      : 'SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at ASC';

    const rows = (limit
      ? this.db.prepare(query).all(sessionId, limit)
      : this.db.prepare(query).all(sessionId)) as EventRow[];

    return rows.map(mapRow);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/storage/event-repo.ts packages/core/src/storage/event-repo.test.ts
git commit -m "feat: add SessionEventRepository

CRUD for session_events table. Supports create, listBySession
with optional limit. Cascade deletes with parent session."
```

### Task 6: Update storage barrel and core index

**Files:**
- Modify: `packages/core/src/storage/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Replace storage/index.ts**

Write `packages/core/src/storage/index.ts`:

```typescript
export { EndeavorDatabase } from './database.js';
export type { DatabaseOptions } from './database.js';
export { SessionRepository } from './session-repo.js';
export type { CreateSessionParams, UpdateSessionParams } from './session-repo.js';
export { SessionEventRepository } from './event-repo.js';
export type { CreateEventParams } from './event-repo.js';
```

- [ ] **Step 2: Replace core index.ts** (temporary — will be updated again when session manager is added)

Write `packages/core/src/index.ts`:

```typescript
export { EndeavorError, ErrorCode } from './errors.js';
export { createLogger } from './logger.js';
export type { LogLevel, Logger } from './logger.js';
export { generateId } from './ids.js';
export * from './types.js';
export {
  EndeavorDatabase,
  SessionRepository,
  SessionEventRepository,
} from './storage/index.js';
export type {
  DatabaseOptions,
  CreateSessionParams,
  UpdateSessionParams,
  CreateEventParams,
} from './storage/index.js';
```

- [ ] **Step 3: Verify build**

Run: `npm --workspace @endeavor/core run build`
Expected: SUCCESS — no type errors

- [ ] **Step 4: Run all tests**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/storage/index.ts packages/core/src/index.ts
git commit -m "feat: update barrel exports for v0.3 data layer

Export new repos and types. Remove old entity exports."
```

---

## Chunk 2: Stream Parser + Adapter Interface + Session Manager

### Task 7: Stream JSON parser

**Files:**
- Create: `packages/core/src/stream-parser.ts`
- Test: `packages/core/src/stream-parser.test.ts`

**Context:** This parses the line-delimited JSON output from `claude --print --output-format stream-json`. Each stdout line is a JSON object. The parser must handle: valid JSON, empty lines, malformed JSON (skip + log), and very long lines (truncate at 1MB).

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/stream-parser.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Readable } from 'node:stream';
import { StreamJsonParser } from './stream-parser.js';

function makeStream(lines: string[]): Readable {
  return Readable.from(lines.map((l) => l + '\n'));
}

describe('StreamJsonParser', () => {
  it('parses valid JSON lines', async () => {
    const events: unknown[] = [];
    const stream = makeStream([
      '{"type":"assistant","message":{"content":[{"type":"text","text":"hello"}]}}',
      '{"type":"tool_use","name":"Read","input":{}}',
    ]);

    const parser = new StreamJsonParser(stream);
    parser.onEvent((event) => events.push(event));

    await parser.done();

    expect(events).toHaveLength(2);
    expect((events[0] as { type: string }).type).toBe('assistant');
    expect((events[1] as { type: string }).type).toBe('tool_use');
  });

  it('skips empty lines', async () => {
    const events: unknown[] = [];
    const stream = makeStream(['', '{"type":"assistant","message":{}}', '', '']);

    const parser = new StreamJsonParser(stream);
    parser.onEvent((event) => events.push(event));
    await parser.done();

    expect(events).toHaveLength(1);
  });

  it('skips malformed JSON lines and calls onError', async () => {
    const events: unknown[] = [];
    const errors: unknown[] = [];
    const stream = makeStream([
      '{"type":"assistant","message":{}}',
      'this is not json',
      '{"type":"tool_use","name":"Read"}',
    ]);

    const parser = new StreamJsonParser(stream);
    parser.onEvent((event) => events.push(event));
    parser.onParseError((err) => errors.push(err));
    await parser.done();

    expect(events).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });

  it('truncates lines exceeding max length', async () => {
    const events: unknown[] = [];
    const errors: unknown[] = [];
    const longLine = '{"type":"x","data":"' + 'a'.repeat(2 * 1024 * 1024) + '"}';
    const stream = makeStream([longLine]);

    const parser = new StreamJsonParser(stream, { maxLineLength: 1024 * 1024 });
    parser.onEvent((event) => events.push(event));
    parser.onParseError((err) => errors.push(err));
    await parser.done();

    // Long line should be skipped (truncated line is invalid JSON)
    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: FAIL — `StreamJsonParser` does not exist

- [ ] **Step 3: Implement stream-parser.ts**

Create `packages/core/src/stream-parser.ts`:

```typescript
import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';

export interface StreamParserOptions {
  maxLineLength?: number; // default 1MB
}

type EventCallback = (event: Record<string, unknown>) => void;
type ErrorCallback = (error: { line: string; error: Error }) => void;

export class StreamJsonParser {
  private eventCallbacks: EventCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private donePromise: Promise<void>;
  private maxLineLength: number;

  constructor(stream: Readable, options?: StreamParserOptions) {
    this.maxLineLength = options?.maxLineLength ?? 1024 * 1024; // 1MB default

    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    this.donePromise = new Promise<void>((resolve) => {
      rl.on('line', (line: string) => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return;

        if (trimmed.length > this.maxLineLength) {
          const err = new Error(`Line exceeds max length (${trimmed.length} > ${this.maxLineLength})`);
          for (const cb of this.errorCallbacks) cb({ line: trimmed.slice(0, 200) + '...', error: err });
          return;
        }

        try {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>;
          for (const cb of this.eventCallbacks) cb(parsed);
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e));
          for (const cb of this.errorCallbacks) cb({ line: trimmed.slice(0, 200), error: err });
        }
      });

      rl.on('close', resolve);
    });
  }

  onEvent(cb: EventCallback): void {
    this.eventCallbacks.push(cb);
  }

  onParseError(cb: ErrorCallback): void {
    this.errorCallbacks.push(cb);
  }

  done(): Promise<void> {
    return this.donePromise;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: All 4 parser tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/stream-parser.ts packages/core/src/stream-parser.test.ts
git commit -m "feat: add StreamJsonParser for Claude stream-json output

Line-delimited JSON parser with max line length protection (1MB),
empty line skipping, and malformed JSON error callbacks."
```

### Task 8: Adapter interface

**Files:**
- Create: `packages/core/src/adapters/types.ts`
- Create: `packages/core/src/adapters/index.ts`

- [ ] **Step 1: Create adapter types**

Create `packages/core/src/adapters/types.ts`:

```typescript
import type { SessionSnapshot, SessionEvent, SpawnOpts, Unsubscribe } from '../types.js';

export interface AdapterCapabilities {
  canSpawn: boolean;
  canKill: boolean;
  canSendInput: boolean;
  canStreamOutput: boolean;
  canTrackCost: boolean;
}

export interface SessionAdapter {
  readonly source: string;
  readonly capabilities: AdapterCapabilities;

  /** Discover sessions managed by this adapter */
  discover(): Promise<SessionSnapshot[]>;

  /** Spawn a new session. Only available if capabilities.canSpawn is true. */
  spawn?(opts: SpawnOpts): Promise<SessionSnapshot>;

  /** Kill a session. Only available if capabilities.canKill is true. */
  kill?(sessionId: string): Promise<void>;

  /**
   * Send user input to a session. Rules:
   * - MUST reject if session status is not 'waiting_input'. Input while 'active' is not queued.
   * - On success: spawns a new claude --print --resume process, transitions to 'active'.
   * - On spawn failure: transitions session to 'error' with descriptive event.
   */
  sendInput?(sessionId: string, input: string): Promise<void>;

  /** Subscribe to live events for a session */
  onEvent?(sessionId: string, cb: (event: SessionEvent) => void): Unsubscribe;

  /** Clean up resources (stop polling, kill watchers, etc.) */
  dispose?(): void;
}
```

- [ ] **Step 2: Create barrel export**

Create `packages/core/src/adapters/index.ts`:

```typescript
export type { SessionAdapter, AdapterCapabilities } from './types.js';
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/adapters/
git commit -m "feat: define SessionAdapter interface

Adapter interface with capabilities for conditional feature support.
Methods: discover, spawn, kill, sendInput, onEvent, dispose."
```

### Task 9: Session Manager

**Files:**
- Create: `packages/core/src/session-manager.ts`
- Test: `packages/core/src/session-manager.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/session-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SessionManager } from './session-manager.js';
import type { SessionAdapter } from './adapters/types.js';
import { migrations } from './storage/migrations.js';
import { SessionRepository } from './storage/session-repo.js';
import { SessionEventRepository } from './storage/event-repo.js';
import { createLogger } from './logger.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(migrations[0].up);
  return db;
}

function mockAdapter(source: string, sessions: { label: string; cwd: string }[] = []): SessionAdapter {
  return {
    source,
    capabilities: { canSpawn: false, canKill: false, canSendInput: false, canStreamOutput: false, canTrackCost: false },
    discover: vi.fn().mockResolvedValue(
      sessions.map((s) => ({
        id: `s_mock_${s.label}`,
        source,
        status: 'active',
        claudeSessionId: null,
        pid: null,
        label: s.label,
        cwd: s.cwd,
        branch: null,
        inputTokens: 0,
        outputTokens: 0,
        totalCostUsd: 0,
        model: null,
        lastOutputAt: null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      })),
    ),
  };
}

describe('SessionManager', () => {
  let db: Database.Database;
  let manager: SessionManager;

  beforeEach(() => {
    db = setupDb();
    const logger = createLogger('test', { level: 'error' });
    const sessions = new SessionRepository(db);
    const events = new SessionEventRepository(db);
    manager = new SessionManager({ sessions, events, logger });
  });

  afterEach(() => {
    manager.dispose();
    db.close();
  });

  it('registers adapters', () => {
    const adapter = mockAdapter('observed');
    manager.register(adapter);
    expect(manager.getCapabilities('observed')).toBeTruthy();
  });

  it('rejects duplicate adapter sources', () => {
    manager.register(mockAdapter('observed'));
    expect(() => manager.register(mockAdapter('observed'))).toThrow(/duplicate/i);
  });

  it('discovers sessions from all adapters', async () => {
    manager.register(mockAdapter('observed', [{ label: 'ext-1', cwd: '/tmp' }]));
    const all = await manager.discoverAll();
    expect(all).toHaveLength(1);
  });

  it('returns capabilities for registered adapters', () => {
    const adapter = mockAdapter('launched');
    manager.register(adapter);
    expect(manager.getCapabilities('launched')).toEqual(adapter.capabilities);
  });

  it('returns null capabilities for unknown source', () => {
    expect(manager.getCapabilities('unknown')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: FAIL — `SessionManager` does not exist

- [ ] **Step 3: Implement session-manager.ts**

Create `packages/core/src/session-manager.ts`:

```typescript
import type { SessionAdapter, AdapterCapabilities } from './adapters/types.js';
import type { SessionSnapshot, SessionEvent, SpawnOpts, Unsubscribe } from './types.js';
import type { SessionRepository } from './storage/session-repo.js';
import type { SessionEventRepository } from './storage/event-repo.js';
import type { Logger } from './logger.js';
import { EndeavorError, ErrorCode } from './errors.js';

export interface SessionManagerDeps {
  sessions: SessionRepository;
  events: SessionEventRepository;
  logger: Logger;
}

export class SessionManager {
  private adapters = new Map<string, SessionAdapter>();
  private sessions: SessionRepository;
  private events: SessionEventRepository;
  private logger: Logger;

  constructor(deps: SessionManagerDeps) {
    this.sessions = deps.sessions;
    this.events = deps.events;
    this.logger = deps.logger.child('session-manager');
  }

  register(adapter: SessionAdapter): void {
    if (this.adapters.has(adapter.source)) {
      throw new EndeavorError(
        ErrorCode.ADAPTER_DUPLICATE,
        `Duplicate adapter source: ${adapter.source}`,
      );
    }
    this.adapters.set(adapter.source, adapter);
    this.logger.info('Adapter registered', { source: adapter.source });
  }

  getCapabilities(source: string): AdapterCapabilities | null {
    return this.adapters.get(source)?.capabilities ?? null;
  }

  async discoverAll(): Promise<SessionSnapshot[]> {
    const results: SessionSnapshot[] = [];

    for (const [source, adapter] of this.adapters) {
      try {
        const discovered = await adapter.discover();
        results.push(...discovered);
      } catch (err) {
        this.logger.error(`Adapter discover failed`, err instanceof Error ? err : new Error(String(err)), { source });
      }
    }

    return results;
  }

  async spawn(source: string, opts: SpawnOpts): Promise<SessionSnapshot> {
    const adapter = this.adapters.get(source);
    if (!adapter?.spawn) {
      throw new EndeavorError(ErrorCode.ADAPTER_ERROR, `Adapter ${source} does not support spawn`);
    }

    try {
      const snapshot = await adapter.spawn(opts);
      this.logger.info('Session spawned', { id: snapshot.id, source, cwd: opts.cwd });
      return snapshot;
    } catch (err) {
      this.logger.error('Spawn failed', err instanceof Error ? err : new Error(String(err)), { source, cwd: opts.cwd });
      throw err;
    }
  }

  async kill(source: string, sessionId: string): Promise<void> {
    const adapter = this.adapters.get(source);
    if (!adapter?.kill) {
      throw new EndeavorError(ErrorCode.ADAPTER_ERROR, `Adapter ${source} does not support kill`);
    }

    await adapter.kill(sessionId);
    this.logger.info('Session killed', { id: sessionId, source });
  }

  async sendInput(source: string, sessionId: string, input: string): Promise<void> {
    const adapter = this.adapters.get(source);
    if (!adapter?.sendInput) {
      throw new EndeavorError(ErrorCode.ADAPTER_ERROR, `Adapter ${source} does not support sendInput`);
    }

    await adapter.sendInput(sessionId, input);
  }

  onEvent(source: string, sessionId: string, cb: (event: SessionEvent) => void): Unsubscribe {
    const adapter = this.adapters.get(source);
    if (!adapter?.onEvent) {
      return () => {};
    }
    return adapter.onEvent(sessionId, cb);
  }

  /** Get all sessions from DB (not discovery — returns persisted state) */
  listSessions(): SessionSnapshot[] {
    return this.sessions.list();
  }

  /** Log a session event to DB */
  logEvent(params: { sessionId: string; type: SessionEvent['type']; payload: Record<string, unknown> }): SessionEvent {
    return this.events.create(params);
  }

  dispose(): void {
    for (const adapter of this.adapters.values()) {
      adapter.dispose?.();
    }
    this.adapters.clear();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: All 5 manager tests PASS

- [ ] **Step 5: Update core index.ts with new exports**

Add to `packages/core/src/index.ts`:

```typescript
export { SessionManager } from './session-manager.js';
export type { SessionManagerDeps } from './session-manager.js';
export { StreamJsonParser } from './stream-parser.js';
export type { StreamParserOptions } from './stream-parser.js';
export type { SessionAdapter, AdapterCapabilities } from './adapters/index.js';
```

- [ ] **Step 6: Build and verify**

Run: `npm --workspace @endeavor/core run build && npm --workspace @endeavor/core run test -- --run`
Expected: Build SUCCESS, all tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/session-manager.ts packages/core/src/session-manager.test.ts packages/core/src/index.ts packages/core/src/adapters/
git commit -m "feat: add SessionManager facade

Unified interface over adapters. Supports register, discoverAll,
spawn, kill, sendInput, onEvent. Rejects duplicate sources."
```

---

## Chunk 3: Launcher Adapter

### Task 10: Launcher adapter

**Files:**
- Create: `packages/core/src/adapters/launcher.ts`
- Test: `packages/core/src/adapters/launcher.test.ts`

**Context:** The launcher adapter spawns `claude --print --output-format stream-json` as a child process. It manages the session lifecycle: spawn → parse stdout → detect status changes → handle process exit. Multi-turn conversations use `--resume <session-id>`.

**Important:** The exact stream-json format is subject to the research spike (TODOS.md P1). The implementation should use the illustrative format from the spec. After the research spike completes, update the parser logic to match the real format. Design the adapter so the event-type mapping is in one place and easy to update.

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/adapters/launcher.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { LauncherAdapter } from './launcher.js';
import { SessionRepository } from '../storage/session-repo.js';
import { SessionEventRepository } from '../storage/event-repo.js';
import { migrations } from '../storage/migrations.js';
import { createLogger } from '../logger.js';

function setupDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(migrations[0].up);
  return db;
}

import { EventEmitter } from 'node:events';
import { Readable, Writable } from 'node:stream';

// Mock child_process.spawn for testing
vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => {
    const proc = new EventEmitter();
    (proc as any).stdout = new Readable({ read() {} });
    (proc as any).stderr = new Readable({ read() {} });
    (proc as any).stdin = new Writable({ write(_chunk: unknown, _enc: unknown, cb: () => void) { cb(); } });
    (proc as any).pid = 12345;
    (proc as any).kill = vi.fn();
    // Simulate process completing after a tick
    setTimeout(() => {
      (proc as any).stdout.push('{"type":"result","session_id":"sess_abc123","cost":0.01}\n');
      (proc as any).stdout.push(null); // EOF
      proc.emit('exit', 0, null);
    }, 10);
    return proc;
  }),
}));

describe('LauncherAdapter', () => {
  let db: Database.Database;
  let adapter: LauncherAdapter;

  beforeEach(() => {
    db = setupDb();
    const sessions = new SessionRepository(db);
    const events = new SessionEventRepository(db);
    const logger = createLogger('test', { level: 'error' });
    adapter = new LauncherAdapter({ sessions, events, logger });
  });

  afterEach(() => {
    adapter.dispose?.();
    db.close();
  });

  it('has correct capabilities', () => {
    expect(adapter.capabilities).toEqual({
      canSpawn: true,
      canKill: true,
      canSendInput: true,
      canStreamOutput: true,
      canTrackCost: true,
    });
  });

  it('has source "launched"', () => {
    expect(adapter.source).toBe('launched');
  });

  it('spawns a session and creates DB record', async () => {
    const snapshot = await adapter.spawn({
      cwd: '/tmp/test',
      label: 'test-session',
      initialPrompt: 'hello',
    });

    expect(snapshot.id).toMatch(/^s_/);
    expect(snapshot.source).toBe('launched');
    expect(snapshot.status).toBe('active');
    expect(snapshot.cwd).toBe('/tmp/test');
    expect(snapshot.label).toBe('test-session');
  });

  it('discovers only active launched sessions', async () => {
    await adapter.spawn({ cwd: '/tmp', label: 'one', initialPrompt: 'hi' });
    // Wait for process to complete (status changes to waiting_input or completed)
    await new Promise((r) => setTimeout(r, 50));

    const discovered = await adapter.discover();
    // After process exits with code 0 and result event, session transitions
    expect(discovered.length).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: FAIL — `LauncherAdapter` does not exist

- [ ] **Step 3: Implement launcher.ts**

Create `packages/core/src/adapters/launcher.ts`:

```typescript
import { spawn, type ChildProcess } from 'node:child_process';
import type { SessionAdapter, AdapterCapabilities } from './types.js';
import type { SessionSnapshot, SessionEvent, SpawnOpts, Unsubscribe } from '../types.js';
import type { SessionRepository } from '../storage/session-repo.js';
import type { SessionEventRepository } from '../storage/event-repo.js';
import type { Logger } from '../logger.js';
import { StreamJsonParser } from '../stream-parser.js';
import { EndeavorError, ErrorCode } from '../errors.js';

export interface LauncherDeps {
  sessions: SessionRepository;
  events: SessionEventRepository;
  logger: Logger;
}

interface ActiveProcess {
  sessionId: string;
  process: ChildProcess;
  parser: StreamJsonParser;
  listeners: ((event: SessionEvent) => void)[];
}

export class LauncherAdapter implements SessionAdapter {
  readonly source = 'launched';
  readonly capabilities: AdapterCapabilities = {
    canSpawn: true,
    canKill: true,
    canSendInput: true,
    canStreamOutput: true,
    canTrackCost: true,
  };

  private sessions: SessionRepository;
  private events: SessionEventRepository;
  private logger: Logger;
  private activeProcesses = new Map<string, ActiveProcess>();

  constructor(deps: LauncherDeps) {
    this.sessions = deps.sessions;
    this.events = deps.events;
    this.logger = deps.logger.child('launcher');
  }

  async discover(): Promise<SessionSnapshot[]> {
    // Return launched sessions from DB that are still alive
    return this.sessions.list().filter((s) => s.source === 'launched');
  }

  async spawn(opts: SpawnOpts): Promise<SessionSnapshot> {
    const args = ['--print', '--output-format', 'stream-json'];
    if (opts.resumeSessionId) {
      args.push('--resume', opts.resumeSessionId);
    }
    if (opts.initialPrompt && !opts.resumeSessionId) {
      args.push('-p', opts.initialPrompt);
    }

    let proc: ChildProcess;
    try {
      proc = spawn('claude', args, { cwd: opts.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      throw new EndeavorError(ErrorCode.SPAWN_FAILED, `Failed to spawn claude: ${err}`, err);
    }

    if (!proc.pid) {
      throw new EndeavorError(ErrorCode.SPAWN_FAILED, 'Failed to spawn claude: no PID');
    }

    // Create DB record
    const session = this.sessions.create({
      source: 'launched',
      label: opts.label ?? `session-${Date.now()}`,
      cwd: opts.cwd,
      pid: proc.pid,
      claudeSessionId: opts.resumeSessionId,
    });

    this.events.create({
      sessionId: session.id,
      type: 'status_change',
      payload: { from: null, to: 'active' },
    });

    // Set up stdout parsing
    const parser = new StreamJsonParser(proc.stdout!);
    const active: ActiveProcess = { sessionId: session.id, process: proc, parser, listeners: [] };
    this.activeProcesses.set(session.id, active);

    parser.onEvent((raw) => {
      this.handleStreamEvent(session.id, raw);
    });

    parser.onParseError(({ line, error }) => {
      this.logger.warn('Stream parse error', { sessionId: session.id, line, error: error.message });
    });

    // Handle process exit
    proc.on('exit', (code) => {
      this.handleProcessExit(session.id, code);
    });

    proc.on('error', (err) => {
      this.logger.error('Process error', err, { sessionId: session.id });
      this.sessions.update(session.id, { status: 'error', pid: null });
      this.events.create({ sessionId: session.id, type: 'error', payload: { message: err.message } });
    });

    return session;
  }

  async kill(sessionId: string): Promise<void> {
    const active = this.activeProcesses.get(sessionId);
    if (active) {
      active.process.kill('SIGTERM');
    }
    // Also update DB status — the exit handler will run, but in case it doesn't:
    const session = this.sessions.getById(sessionId);
    if (session && session.status !== 'completed' && session.status !== 'dead') {
      this.sessions.update(sessionId, { status: 'dead', pid: null });
    }
  }

  async sendInput(sessionId: string, input: string): Promise<void> {
    const session = this.sessions.getById(sessionId);
    if (!session) {
      throw new EndeavorError(ErrorCode.SESSION_NOT_FOUND, `Session not found: ${sessionId}`);
    }

    if (session.status !== 'waiting_input') {
      throw new EndeavorError(
        ErrorCode.SESSION_INVALID_STATE,
        `Cannot send input: session is ${session.status}, expected waiting_input`,
      );
    }

    // Spawn new process with --resume, updating the existing session
    const args = ['--print', '--output-format', 'stream-json'];
    if (session.claudeSessionId) {
      args.push('--resume', session.claudeSessionId);
    }
    args.push('-p', input);

    let proc: ChildProcess;
    try {
      proc = spawn('claude', args, { cwd: session.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      this.sessions.update(sessionId, { status: 'error' });
      this.events.create({ sessionId, type: 'error', payload: { message: `Resume failed: ${err}` } });
      throw new EndeavorError(ErrorCode.SPAWN_FAILED, `Failed to resume: ${err}`, err);
    }

    if (!proc.pid) {
      this.sessions.update(sessionId, { status: 'error' });
      throw new EndeavorError(ErrorCode.SPAWN_FAILED, 'Failed to resume: no PID');
    }

    // Update existing session record (not a new row)
    this.sessions.update(sessionId, { status: 'active', pid: proc.pid });
    this.events.create({ sessionId, type: 'status_change', payload: { from: 'waiting_input', to: 'active' } });
    this.events.create({ sessionId, type: 'prompt', payload: { text: input } });

    // Set up parsing for the new process
    const parser = new StreamJsonParser(proc.stdout!);
    const active: ActiveProcess = { sessionId, process: proc, parser, listeners: [] };
    this.activeProcesses.set(sessionId, active);

    parser.onEvent((raw) => this.handleStreamEvent(sessionId, raw));
    parser.onParseError(({ line, error }) => {
      this.logger.warn('Stream parse error', { sessionId, line, error: error.message });
    });
    proc.on('exit', (code) => this.handleProcessExit(sessionId, code));
    proc.on('error', (err) => {
      this.logger.error('Process error', err, { sessionId });
      this.sessions.update(sessionId, { status: 'error', pid: null });
      this.events.create({ sessionId, type: 'error', payload: { message: err.message } });
    });
  }

  onEvent(sessionId: string, cb: (event: SessionEvent) => void): Unsubscribe {
    const active = this.activeProcesses.get(sessionId);
    if (!active) return () => {};

    active.listeners.push(cb);

    return () => {
      const idx = active.listeners.indexOf(cb);
      if (idx >= 0) active.listeners.splice(idx, 1);
    };
  }

  dispose(): void {
    for (const active of this.activeProcesses.values()) {
      active.process.kill('SIGTERM');
    }
    this.activeProcesses.clear();
  }

  private handleStreamEvent(sessionId: string, raw: Record<string, unknown>): void {
    const now = new Date().toISOString();
    this.sessions.update(sessionId, { lastOutputAt: now });

    const type = raw.type as string;

    // Map stream events to session events and status changes
    switch (type) {
      case 'assistant': {
        const event = this.events.create({ sessionId, type: 'response', payload: raw });
        this.notifyListeners(sessionId, event);
        // Extract usage if present
        const message = raw.message as Record<string, unknown> | undefined;
        const usage = message?.usage as { input_tokens?: number; output_tokens?: number } | undefined;
        if (usage) {
          const session = this.sessions.getById(sessionId);
          if (session) {
            this.sessions.update(sessionId, {
              inputTokens: session.inputTokens + (usage.input_tokens ?? 0),
              outputTokens: session.outputTokens + (usage.output_tokens ?? 0),
            });
          }
        }
        break;
      }
      case 'tool_use': {
        const event = this.events.create({ sessionId, type: 'tool_use', payload: raw });
        this.notifyListeners(sessionId, event);
        break;
      }
      case 'result': {
        // Process completed this turn. Extract session_id for resume.
        const claudeSessionId = raw.session_id as string | undefined;
        const cost = raw.cost as number | undefined;
        const updates: Record<string, unknown> = {};
        if (claudeSessionId) updates.claudeSessionId = claudeSessionId;
        if (cost !== undefined) {
          const session = this.sessions.getById(sessionId);
          if (session) updates.totalCostUsd = session.totalCostUsd + cost;
        }
        if (Object.keys(updates).length > 0) {
          this.sessions.update(sessionId, updates);
        }
        // Store result as response event (it's the turn-completion signal)
        const event = this.events.create({ sessionId, type: 'response', payload: raw });
        this.notifyListeners(sessionId, event);
        // Also log cost delta separately if present
        if (cost !== undefined) {
          this.events.create({ sessionId, type: 'cost_tick', payload: { cost } });
        }
        break;
      }
      default: {
        // Unknown event type — log and store
        const event = this.events.create({ sessionId, type: 'response', payload: raw });
        this.notifyListeners(sessionId, event);
      }
    }
  }

  private handleProcessExit(sessionId: string, code: number | null): void {
    this.activeProcesses.delete(sessionId);

    const session = this.sessions.getById(sessionId);
    if (!session) return;

    const newStatus = code === 0
      ? (session.claudeSessionId ? 'waiting_input' : 'completed')
      : 'dead';

    this.sessions.update(sessionId, { status: newStatus, pid: null });

    this.events.create({
      sessionId,
      type: 'status_change',
      payload: { from: session.status, to: newStatus, exitCode: code },
    });

    this.logger.info('Process exited', { sessionId, exitCode: code, newStatus });
  }

  private notifyListeners(sessionId: string, event: SessionEvent): void {
    const active = this.activeProcesses.get(sessionId);
    if (!active) return;
    for (const cb of active.listeners) cb(event);
  }
}
```

- [ ] **Step 4: Add launcher to adapter barrel**

Update `packages/core/src/adapters/index.ts`:

```typescript
export type { SessionAdapter, AdapterCapabilities } from './types.js';
export { LauncherAdapter } from './launcher.js';
export type { LauncherDeps } from './launcher.js';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --workspace @endeavor/core run test -- --run`
Expected: All launcher tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/adapters/
git commit -m "feat: add LauncherAdapter for spawning Claude sessions

Spawns claude --print --output-format stream-json as child process.
Parses stdout events, tracks session state, handles process exit.
Supports multi-turn via --resume. Full capabilities."
```

---

## Chunk 4: TUI Package Setup + Dashboard

### Task 11: TUI package scaffolding

**Files:**
- Create: `packages/tui/package.json`
- Create: `packages/tui/tsconfig.json`
- Create: `packages/tui/vitest.config.ts`
- Modify: root `package.json`

- [ ] **Step 1: Create packages/tui/package.json**

```json
{
  "name": "@endeavor/tui",
  "version": "0.3.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "endeavor": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/index.tsx",
    "lint": "eslint src",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@endeavor/core": "*",
    "ink": "^5.1.0",
    "ink-text-input": "^6.0.0",
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "ink-testing-library": "^4.0.0",
    "typescript": "*",
    "vitest": "*"
  }
}
```

- [ ] **Step 2: Create packages/tui/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/tui/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 4: Update root package.json**

Update the `scripts` section in root `package.json`:

Update these fields in root `package.json` (keep the rest unchanged):

```json
{
  "version": "0.3.0",
  "description": "Claude session observatory and multiplexer.",
  "workspaces": [
    "packages/core",
    "packages/tui"
  ],
  "scripts": {
    "build": "npm --workspace @endeavor/core run build && npm --workspace @endeavor/tui run build",
    "lint": "npm run -ws --if-present lint",
    "test": "npm run -ws --if-present test",
    "typecheck": "npm run -ws --if-present typecheck",
    "clean": "npm run -ws --if-present clean",
    "dev": "npm --workspace @endeavor/tui run dev"
  }
}
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: SUCCESS — ink, react, ink-text-input installed

- [ ] **Step 6: Commit**

```bash
git add packages/tui/package.json packages/tui/tsconfig.json packages/tui/vitest.config.ts package.json package-lock.json
git commit -m "feat: scaffold TUI package with Ink + React

New @endeavor/tui package replaces @endeavor/cli. JSX support
for Ink terminal UI components. Updated root build scripts."
```

### Task 12: TUI entry point and App shell

**Files:**
- Create: `packages/tui/src/index.tsx`
- Create: `packages/tui/src/app.tsx`
- Create: `packages/tui/src/components/top-bar.tsx`
- Create: `packages/tui/src/components/bottom-bar.tsx`

- [ ] **Step 1: Create the entry point**

Create `packages/tui/src/index.tsx`:

```tsx
#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './app.js';

const args = process.argv.slice(2);
const cwdFlag = args.indexOf('--cwd');
const cwd = cwdFlag >= 0 ? args[cwdFlag + 1] : process.cwd();
const attach = args.includes('--attach');

render(<App cwd={cwd} attach={attach} />);
```

- [ ] **Step 2: Create the App shell**

Create `packages/tui/src/app.tsx`:

```tsx
import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TopBar } from './components/top-bar.js';
import { BottomBar } from './components/bottom-bar.js';
import type { SessionSnapshot } from '@endeavor/core';

type ViewMode = 'dashboard' | 'focus' | 'spawn';

interface AppProps {
  cwd: string;
  attach: boolean;
}

export function App({ cwd }: AppProps) {
  const { exit } = useApp();
  const [mode, setMode] = useState<ViewMode>('dashboard');
  const [sessions] = useState<SessionSnapshot[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useInput((input, key) => {
    if (mode === 'dashboard') {
      if (input === 'q' || input === 'Q') {
        exit();
        return;
      }
      if (input === 'n' || input === 'N') {
        setMode('spawn');
        return;
      }
      if (key.return && sessions.length > 0) {
        setMode('focus');
        return;
      }
      if (key.escape) {
        return; // already on dashboard
      }
      // Navigation
      if (input === 'j' || key.downArrow) {
        setFocusedIndex((i) => Math.min(i + 1, sessions.length - 1));
      }
      if (input === 'k' || key.upArrow) {
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }
    }

    if (mode === 'focus' || mode === 'spawn') {
      if (key.escape) {
        setMode('dashboard');
      }
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      <TopBar sessions={sessions} />

      <Box flexDirection="column" flexGrow={1} padding={1}>
        {mode === 'dashboard' && sessions.length === 0 && (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text dimColor>No sessions. Press N to start one.</Text>
          </Box>
        )}

        {mode === 'dashboard' && sessions.length > 0 && (
          <Text>Dashboard with {sessions.length} sessions (tiles coming in Task 13)</Text>
        )}

        {mode === 'focus' && (
          <Text>Focus view (coming in Task 14)</Text>
        )}

        {mode === 'spawn' && (
          <Text>Spawn dialog (coming in Task 15)</Text>
        )}
      </Box>

      <BottomBar mode={mode} />
    </Box>
  );
}
```

- [ ] **Step 3: Create TopBar**

Create `packages/tui/src/components/top-bar.tsx`:

```tsx
import React from 'react';
import { Box, Text } from 'ink';
import type { SessionSnapshot } from '@endeavor/core';

interface TopBarProps {
  sessions: SessionSnapshot[];
}

export function TopBar({ sessions }: TopBarProps) {
  const active = sessions.filter((s) => s.status === 'active').length;
  const waiting = sessions.filter((s) => s.status === 'waiting_input' || s.status === 'waiting_approval').length;
  const totalCost = sessions.reduce((sum, s) => sum + s.totalCostUsd, 0);

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text bold color="cyan">ENDEAVOR</Text>
      <Box flexGrow={1} />
      <Text>{active} active</Text>
      <Text>  </Text>
      {waiting > 0 && <Text color="red">{waiting} waiting</Text>}
      {waiting > 0 && <Text>  </Text>}
      <Text color="green">${totalCost.toFixed(2)}</Text>
    </Box>
  );
}
```

- [ ] **Step 4: Create BottomBar**

Create `packages/tui/src/components/bottom-bar.tsx`:

```tsx
import React from 'react';
import { Box, Text } from 'ink';

interface BottomBarProps {
  mode: 'dashboard' | 'focus' | 'spawn';
}

export function BottomBar({ mode }: BottomBarProps) {
  return (
    <Box borderStyle="single" paddingX={1}>
      {mode === 'dashboard' && (
        <>
          <Text dimColor>{'↑↓/jk'}</Text><Text> navigate  </Text>
          <Text dimColor>Enter</Text><Text> focus  </Text>
          <Text dimColor>N</Text><Text> new  </Text>
          <Text dimColor>K</Text><Text> kill  </Text>
          <Text dimColor>Tab</Text><Text> next waiting  </Text>
          <Text dimColor>Q</Text><Text> quit</Text>
        </>
      )}
      {mode === 'focus' && (
        <>
          <Text dimColor>ESC</Text><Text> back to dashboard  </Text>
          <Text dimColor>Type</Text><Text> to respond</Text>
        </>
      )}
      {mode === 'spawn' && (
        <>
          <Text dimColor>ESC</Text><Text> cancel  </Text>
          <Text dimColor>Enter</Text><Text> confirm</Text>
        </>
      )}
    </Box>
  );
}
```

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: SUCCESS — both core and tui build without errors

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/
git commit -m "feat: add TUI app shell with top/bottom bars

Entry point parses --cwd and --attach flags. App component
handles view mode routing (dashboard/focus/spawn). TopBar
shows aggregate stats. BottomBar shows context-aware keybindings."
```

### Task 13: Session tile component

**Files:**
- Create: `packages/tui/src/components/session-tile.tsx`
- Create: `packages/tui/src/components/dashboard.tsx`

- [ ] **Step 1: Create SessionTile**

Create `packages/tui/src/components/session-tile.tsx`:

```tsx
import React from 'react';
import { Box, Text } from 'ink';
import type { SessionSnapshot } from '@endeavor/core';
import { IDLE_THRESHOLD_MS, ACTIVE_OUTPUT_THRESHOLD_MS } from '@endeavor/core';

interface SessionTileProps {
  session: SessionSnapshot;
  focused: boolean;
}

function getStatusColor(session: SessionSnapshot): string {
  if (['waiting_input', 'waiting_approval', 'error'].includes(session.status)) {
    return 'red';
  }
  if (session.status === 'active') {
    const lastOutput = session.lastOutputAt ? new Date(session.lastOutputAt).getTime() : 0;
    const elapsed = Date.now() - lastOutput;
    if (elapsed < ACTIVE_OUTPUT_THRESHOLD_MS) return 'green';
    if (elapsed < IDLE_THRESHOLD_MS) return 'yellow';
    return 'gray';
  }
  return 'gray';
}

function getStatusLabel(session: SessionSnapshot): string {
  switch (session.status) {
    case 'waiting_input': return 'WAITING FOR INPUT';
    case 'waiting_approval': return 'NEEDS APPROVAL';
    case 'active': return 'ACTIVE';
    case 'error': return 'ERROR';
    case 'completed': return 'COMPLETED';
    case 'dead': return 'DEAD';
    default: return session.status.toUpperCase();
  }
}

function formatDuration(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h${mins % 60}m`;
}

export function SessionTile({ session, focused }: SessionTileProps) {
  const color = getStatusColor(session);
  const borderColor = focused ? 'cyan' : color;

  return (
    <Box
      width={30}
      height={6}
      borderStyle={focused ? 'double' : 'single'}
      borderColor={borderColor}
      flexDirection="column"
      paddingX={1}
    >
      <Box>
        <Text color={color} bold>{getStatusLabel(session)}</Text>
        {session.source === 'observed' && <Text dimColor> [obs]</Text>}
      </Box>
      <Text>{session.label}</Text>
      <Text dimColor>{session.branch ?? session.cwd}</Text>
      <Box>
        <Text color="green">${session.totalCostUsd.toFixed(2)}</Text>
        <Text dimColor> · {formatDuration(session.startedAt)}</Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Create Dashboard**

Create `packages/tui/src/components/dashboard.tsx`:

```tsx
import React from 'react';
import { Box, useStdout } from 'ink';
import { SessionTile } from './session-tile.js';
import type { SessionSnapshot, SessionStatus } from '@endeavor/core';

interface DashboardProps {
  sessions: SessionSnapshot[];
  focusedIndex: number;
}

const STATUS_PRIORITY: Record<SessionStatus, number> = {
  waiting_input: 0,
  waiting_approval: 1,
  error: 2,
  active: 3,
  completed: 4,
  dead: 5,
};

function sortByPriority(sessions: SessionSnapshot[]): SessionSnapshot[] {
  return [...sessions].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99;
    const pb = STATUS_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    // Same priority: sort by updated_at DESC
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function Dashboard({ sessions, focusedIndex }: DashboardProps) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;
  const tileWidth = 32; // 30 + 2 for margin
  const cols = Math.max(1, Math.floor(termWidth / tileWidth));

  const sorted = sortByPriority(sessions);

  // Arrange into rows
  const rows: SessionSnapshot[][] = [];
  for (let i = 0; i < sorted.length; i += cols) {
    rows.push(sorted.slice(i, i + cols));
  }

  return (
    <Box flexDirection="column">
      {rows.map((row, rowIdx) => (
        <Box key={rowIdx} flexDirection="row" gap={1}>
          {row.map((session, colIdx) => {
            const idx = rowIdx * cols + colIdx;
            return (
              <SessionTile
                key={session.id}
                session={session}
                focused={idx === focusedIndex}
              />
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/components/session-tile.tsx packages/tui/src/components/dashboard.tsx
git commit -m "feat: add SessionTile and Dashboard components

Color-coded tiles showing status, label, branch, cost, duration.
Dashboard arranges tiles in responsive grid with priority sorting."
```

---

## Chunk 5: Observer Adapter + Focus View + Integration

### Task 14: Observer adapter (process scanner)

**Files:**
- Create: `packages/tui/src/observer/process-scanner.ts`
- Create: `packages/tui/src/observer/observer-adapter.ts`
- Test: `packages/tui/src/observer/process-scanner.test.ts`

- [ ] **Step 1: Write the process scanner test**

Create `packages/tui/src/observer/process-scanner.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parsePsOutput } from './process-scanner.js';

describe('parsePsOutput', () => {
  it('extracts claude processes from ps output', () => {
    const output = [
      '  PID COMMAND',
      '12345 /usr/local/bin/claude --print --output-format stream-json',
      '12346 node /some/other/thing',
      '12347 claude chat',
      '12348 grep claude',
    ].join('\n');

    const procs = parsePsOutput(output);
    // Should match 12345 and 12347 (contain 'claude' in command, not grep)
    expect(procs.length).toBeGreaterThanOrEqual(1);
    expect(procs.find((p) => p.pid === 12345)).toBeTruthy();
  });

  it('returns empty array for no claude processes', () => {
    const output = '  PID COMMAND\n12345 node app.js\n';
    expect(parsePsOutput(output)).toHaveLength(0);
  });

  it('handles empty ps output', () => {
    expect(parsePsOutput('')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace @endeavor/tui run test -- --run`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement process-scanner.ts**

Create `packages/tui/src/observer/process-scanner.ts`:

```typescript
import { execSync } from 'node:child_process';
import { readlinkSync } from 'node:fs';
import { platform } from 'node:os';

export interface DiscoveredProcess {
  pid: number;
  command: string;
  cwd: string | null;
}

export function parsePsOutput(output: string): { pid: number; command: string }[] {
  const lines = output.split('\n').slice(1); // skip header
  const results: { pid: number; command: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;

    const pid = parseInt(match[1], 10);
    const command = match[2];

    // Match claude processes, but not grep/ps itself
    if (command.includes('claude') && !command.startsWith('grep') && !command.startsWith('ps')) {
      results.push({ pid, command });
    }
  }

  return results;
}

export function scanProcesses(): DiscoveredProcess[] {
  try {
    const psOutput = execSync('ps -eo pid,command', { encoding: 'utf-8', timeout: 5000 });
    const processes = parsePsOutput(psOutput);

    return processes.map((proc) => ({
      pid: proc.pid,
      command: proc.command,
      cwd: getCwd(proc.pid),
    }));
  } catch {
    return [];
  }
}

function getCwd(pid: number): string | null {
  try {
    if (platform() === 'linux') {
      return readlinkSync(`/proc/${pid}/cwd`);
    }

    // macOS: use lsof
    const output = execSync(`lsof -a -d cwd -Fn -p ${pid}`, {
      encoding: 'utf-8',
      timeout: 5000,
    });

    // lsof -Fn output: lines starting with 'n' contain the path
    for (const line of output.split('\n')) {
      if (line.startsWith('n') && line.length > 1) {
        return line.slice(1);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function getBranch(cwd: string): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      cwd,
      timeout: 3000,
    }).trim();
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Implement observer-adapter.ts**

Create `packages/tui/src/observer/observer-adapter.ts`:

```typescript
import type { SessionAdapter, AdapterCapabilities, SessionSnapshot } from '@endeavor/core';
import type { SessionRepository } from '@endeavor/core';
import type { Logger } from '@endeavor/core';
import { scanProcesses, getBranch } from './process-scanner.js';

export interface ObserverDeps {
  sessions: SessionRepository;
  logger: Logger;
  /** PIDs of sessions launched by Endeavor — skip these */
  getLaunchedPids: () => Set<number>;
}

export class ObserverAdapter implements SessionAdapter {
  readonly source = 'observed';
  readonly capabilities: AdapterCapabilities = {
    canSpawn: false,
    canKill: true, // allow kill with extra warning (decided in CEO review)
    canSendInput: false,
    canStreamOutput: false,
    canTrackCost: false,
  };

  private sessions: SessionRepository;
  private logger: Logger;
  private getLaunchedPids: () => Set<number>;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(deps: ObserverDeps) {
    this.sessions = deps.sessions;
    this.logger = deps.logger.child('observer');
    this.getLaunchedPids = deps.getLaunchedPids;
  }

  async discover(): Promise<SessionSnapshot[]> {
    const launchedPids = this.getLaunchedPids();
    const processes = scanProcesses();

    const knownObserved = this.sessions.list().filter((s) => s.source === 'observed');
    const knownPids = new Set(knownObserved.map((s) => s.pid).filter(Boolean));

    for (const proc of processes) {
      // Skip processes owned by the launcher
      if (launchedPids.has(proc.pid)) continue;

      // Skip already-known processes
      if (knownPids.has(proc.pid)) continue;

      // New process found — create observed session
      const branch = proc.cwd ? getBranch(proc.cwd) : null;
      this.sessions.create({
        source: 'observed',
        label: `observed-${proc.pid}`,
        cwd: proc.cwd ?? 'unknown',
        pid: proc.pid,
        branch: branch ?? undefined,
      });

      this.logger.info('Discovered Claude process', { pid: proc.pid, cwd: proc.cwd });
    }

    // Mark dead: observed sessions whose PID is no longer running
    const activePids = new Set(processes.map((p) => p.pid));
    for (const session of knownObserved) {
      if (session.pid && !activePids.has(session.pid) && session.status !== 'dead' && session.status !== 'completed') {
        this.sessions.update(session.id, { status: 'dead', pid: null });
        this.logger.info('Observed session gone', { id: session.id, pid: session.pid });
      }
    }

    return this.sessions.list().filter((s) => s.source === 'observed');
  }

  startPolling(intervalMs = 2000): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => {
      this.discover().catch((err) => {
        this.logger.error('Observer poll failed', err instanceof Error ? err : new Error(String(err)));
      });
    }, intervalMs);
  }

  async kill(sessionId: string): Promise<void> {
    const session = this.sessions.getById(sessionId);
    if (!session?.pid) return;

    try {
      process.kill(session.pid, 'SIGTERM');
    } catch {
      // Process may already be dead
    }
    this.sessions.update(sessionId, { status: 'dead', pid: null });
  }

  dispose(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --workspace @endeavor/tui run test -- --run`
Expected: All 3 process scanner tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/observer/
git commit -m "feat: add ObserverAdapter with process scanner

Discovers Claude processes via ps, extracts cwd via lsof (macOS)
or /proc (Linux). Polls every 2s, deduplicates against launched
sessions, marks dead sessions when processes disappear."
```

### Task 15: Focus view and spawn dialog

**Files:**
- Create: `packages/tui/src/components/focus-view.tsx`
- Create: `packages/tui/src/components/spawn-dialog.tsx`

- [ ] **Step 1: Create FocusView**

Create `packages/tui/src/components/focus-view.tsx`:

```tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { SessionSnapshot, SessionEvent } from '@endeavor/core';

interface FocusViewProps {
  session: SessionSnapshot;
  events: SessionEvent[];
  canSendInput: boolean;
  onSendInput: (input: string) => void;
  onBack: () => void;
}

export function FocusView({ session, events, canSendInput, onSendInput, onBack }: FocusViewProps) {
  const [inputValue, setInputValue] = useState('');

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
    }
  });

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      onSendInput(value.trim());
      setInputValue('');
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <Box borderStyle="single" paddingX={1}>
        <Text dimColor>{'← ESC'}</Text>
        <Text>  </Text>
        <Text bold>{session.label}</Text>
        <Text>  </Text>
        <Text color={session.status === 'waiting_input' ? 'red' : 'green'}>
          {session.status.toUpperCase()}
        </Text>
        <Box flexGrow={1} />
        <Text color="green">${session.totalCostUsd.toFixed(2)}</Text>
      </Box>

      {/* Conversation log */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {events.length === 0 && (
          <Text dimColor>No events yet...</Text>
        )}
        {events.map((event) => (
          <Box key={event.id} marginBottom={1}>
            {event.type === 'response' && (
              <Text>{(event.payload as { text?: string }).text ?? JSON.stringify(event.payload).slice(0, 200)}</Text>
            )}
            {event.type === 'tool_use' && (
              <Text dimColor>[tool: {(event.payload as { name?: string }).name ?? 'unknown'}]</Text>
            )}
            {event.type === 'error' && (
              <Text color="red">Error: {(event.payload as { message?: string }).message ?? 'unknown'}</Text>
            )}
            {event.type === 'status_change' && (
              <Text dimColor>
                Status: {(event.payload as { from?: string }).from} → {(event.payload as { to?: string }).to}
              </Text>
            )}
          </Box>
        ))}
      </Box>

      {/* Input bar */}
      {canSendInput && session.status === 'waiting_input' && (
        <Box borderStyle="single" paddingX={1}>
          <Text color="cyan">{'> '}</Text>
          <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} />
        </Box>
      )}

      {!canSendInput && (
        <Box borderStyle="single" paddingX={1}>
          <Text dimColor>Observed session — input not available</Text>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Create SpawnDialog**

Create `packages/tui/src/components/spawn-dialog.tsx`:

```tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface SpawnDialogProps {
  defaultCwd: string;
  onSpawn: (cwd: string, label: string, prompt: string) => void;
  onCancel: () => void;
}

type Field = 'cwd' | 'label' | 'prompt';

export function SpawnDialog({ defaultCwd, onSpawn, onCancel }: SpawnDialogProps) {
  const [field, setField] = useState<Field>('label');
  const [cwd, setCwd] = useState(defaultCwd);
  const [label, setLabel] = useState('');
  const [prompt, setPrompt] = useState('');

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleSubmit = () => {
    if (field === 'label') {
      setField('prompt');
    } else if (field === 'prompt') {
      if (prompt.trim()) {
        onSpawn(cwd, label || `session-${Date.now()}`, prompt.trim());
      }
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>New Session</Text>
      <Text dimColor>ESC to cancel</Text>
      <Box marginTop={1} />

      <Box>
        <Text>Directory: </Text>
        {field === 'cwd' ? (
          <TextInput value={cwd} onChange={setCwd} onSubmit={() => setField('label')} />
        ) : (
          <Text dimColor>{cwd}</Text>
        )}
      </Box>

      <Box>
        <Text>Label: </Text>
        {field === 'label' ? (
          <TextInput value={label} onChange={setLabel} onSubmit={handleSubmit} placeholder="(auto-generated)" />
        ) : (
          <Text dimColor>{label || '(auto)'}</Text>
        )}
      </Box>

      {(field === 'prompt') && (
        <Box>
          <Text>Task: </Text>
          <TextInput value={prompt} onChange={setPrompt} onSubmit={handleSubmit} />
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/components/focus-view.tsx packages/tui/src/components/spawn-dialog.tsx
git commit -m "feat: add FocusView and SpawnDialog components

FocusView shows conversation log with input bar for launched sessions.
SpawnDialog prompts for label and initial task to create new sessions."
```

### Task 16: Wire everything together in App

**Files:**
- Modify: `packages/tui/src/app.tsx`
- Modify: `packages/tui/src/index.tsx`

- [ ] **Step 1: Rewrite app.tsx to integrate all components with SessionManager**

Write `packages/tui/src/app.tsx`:

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import {
  EndeavorDatabase,
  SessionRepository,
  SessionEventRepository,
  SessionManager,
  createLogger,
} from '@endeavor/core';
import type { SessionSnapshot, SessionEvent } from '@endeavor/core';
import { LauncherAdapter } from '@endeavor/core';
import { TopBar } from './components/top-bar.js';
import { BottomBar } from './components/bottom-bar.js';
import { Dashboard } from './components/dashboard.js';
import { FocusView } from './components/focus-view.js';
import { SpawnDialog } from './components/spawn-dialog.js';
import { ObserverAdapter } from './observer/observer-adapter.js';

type ViewMode = 'dashboard' | 'focus' | 'spawn';

interface AppProps {
  cwd: string;
  attach: boolean;
}

export function App({ cwd, attach }: AppProps) {
  const { exit } = useApp();
  const [mode, setMode] = useState<ViewMode>('dashboard');
  const [sessions, setSessions] = useState<SessionSnapshot[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const managerRef = useRef<SessionManager | null>(null);
  const sessionsRepoRef = useRef<SessionRepository | null>(null);
  const eventsRepoRef = useRef<SessionEventRepository | null>(null);
  const dbRef = useRef<EndeavorDatabase | null>(null);

  // Initialize DB + manager on mount
  useEffect(() => {
    const logger = createLogger('tui', { level: (process.env.ENDEAVOR_LOG_LEVEL ?? 'error') as any });
    const dbPath = `${cwd}/.endeavor/endeavor.db`;
    const db = new EndeavorDatabase({ dbPath, logger });
    db.initialize();
    dbRef.current = db;

    const sessionsRepo = new SessionRepository(db.getDb());
    const eventsRepo = new SessionEventRepository(db.getDb());
    sessionsRepoRef.current = sessionsRepo;
    eventsRepoRef.current = eventsRepo;

    const manager = new SessionManager({ sessions: sessionsRepo, events: eventsRepo, logger });

    // Register adapters
    const launcher = new LauncherAdapter({ sessions: sessionsRepo, events: eventsRepo, logger });
    manager.register(launcher);

    const observer = new ObserverAdapter({ sessions: sessionsRepo, events: eventsRepo, logger });
    observer.startPolling(5000);
    manager.register(observer);

    managerRef.current = manager;

    // If --attach, auto-focus first waiting session
    if (attach) {
      const waiting = sessionsRepo.listByStatus('waiting_input');
      if (waiting.length > 0) {
        setMode('focus');
      }
    }

    return () => {
      manager.dispose();
      db.close();
    };
  }, [cwd, attach]);

  // Poll sessions every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionsRepoRef.current) {
        setSessions(sessionsRepoRef.current.list());
      }
    }, 2000);

    // Initial load
    if (sessionsRepoRef.current) {
      setSessions(sessionsRepoRef.current.list());
    }

    return () => clearInterval(interval);
  }, []);

  // Load events when focused session changes
  useEffect(() => {
    if (mode === 'focus' && sessions[focusedIndex] && eventsRepoRef.current) {
      setEvents(eventsRepoRef.current.listBySession(sessions[focusedIndex].id, { limit: 100 }));
    }
  }, [mode, focusedIndex, sessions]);

  const handleSpawn = useCallback(async (opts: { cwd: string; label: string; prompt: string }) => {
    if (!managerRef.current) return;
    await managerRef.current.spawn('launched', {
      cwd: opts.cwd,
      label: opts.label,
      initialPrompt: opts.prompt,
    });
    setMode('dashboard');
  }, []);

  const handleSendInput = useCallback(async (input: string) => {
    const session = sessions[focusedIndex];
    if (!session || !managerRef.current) return;
    await managerRef.current.sendInput('launched', session.id, input);
  }, [sessions, focusedIndex]);

  const handleKill = useCallback(async () => {
    const session = sessions[focusedIndex];
    if (!session || !managerRef.current) return;
    await managerRef.current.kill(session.source, session.id);
  }, [sessions, focusedIndex]);

  useInput((input, key) => {
    if (mode === 'dashboard') {
      if (input === 'q' || input === 'Q') { exit(); return; }
      if (input === 'n' || input === 'N') { setMode('spawn'); return; }
      if (input === 'k' || input === 'K') { handleKill(); return; }
      if (key.return && sessions.length > 0) { setMode('focus'); return; }
      if (key.tab) {
        // Cycle to next waiting session
        const waitIdx = sessions.findIndex((s, i) => i > focusedIndex && (s.status === 'waiting_input' || s.status === 'waiting_approval'));
        if (waitIdx >= 0) setFocusedIndex(waitIdx);
        return;
      }
      if (input === 'j' || key.downArrow) { setFocusedIndex((i) => Math.min(i + 1, sessions.length - 1)); }
      if (input === 'k' || key.upArrow) { setFocusedIndex((i) => Math.max(i - 1, 0)); }
    }
    if (mode === 'focus' || mode === 'spawn') {
      if (key.escape) { setMode('dashboard'); }
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      <TopBar sessions={sessions} />

      <Box flexDirection="column" flexGrow={1} padding={1}>
        {mode === 'dashboard' && sessions.length === 0 && (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text dimColor>No sessions. Press N to start one.</Text>
          </Box>
        )}

        {mode === 'dashboard' && sessions.length > 0 && (
          <Dashboard sessions={sessions} focusedIndex={focusedIndex} />
        )}

        {mode === 'focus' && sessions[focusedIndex] && (
          <FocusView
            session={sessions[focusedIndex]}
            events={events}
            onSendInput={handleSendInput}
          />
        )}

        {mode === 'spawn' && (
          <SpawnDialog
            defaultCwd={cwd}
            onSpawn={handleSpawn}
            onCancel={() => setMode('dashboard')}
          />
        )}
      </Box>

      <BottomBar mode={mode} />
    </Box>
  );
}
```

- [ ] **Step 2: Update index.tsx to ensure shebang and proper init**

Ensure the `#!/usr/bin/env node` shebang is present and the `bin` field in `package.json` points to `dist/index.js`.

- [ ] **Step 3: Build and test manually**

Run: `npm run build && node packages/tui/dist/index.js`
Expected: TUI launches showing empty dashboard with "No sessions. Press N to start one."

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/
git commit -m "feat: wire TUI components to SessionManager

Full integration: dashboard shows real sessions, spawn dialog
creates sessions via LauncherAdapter, focus view shows conversation
events, observer discovers external Claude processes."
```

### Task 17: Update CLAUDE.md and root package.json

**Files:**
- Modify: `CLAUDE.md`
- Modify: `package.json`

- [ ] **Step 1: Update CLAUDE.md**

Update the following sections:
- Project overview: "Claude session observatory and multiplexer" instead of "coordination layer"
- Monorepo structure: `core/` and `tui/` packages only
- Common commands: update build, dev commands
- Entity model: 2 tables (sessions, session_events)
- Architecture notes: SessionManager facade, adapter pattern, child_process.spawn

- [ ] **Step 2: Update root package.json version to 0.3.0**

Ensure version is `0.3.0`, description is updated, dev scripts point to tui.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md package.json
git commit -m "docs: update CLAUDE.md and package.json for v0.3

Reflect pivot to session observatory. Update package structure,
entity model, commands, and architecture notes."
```

### Task 18: Final build + test verification

- [ ] **Step 1: Clean build**

Run: `npm run clean && npm run build`
Expected: SUCCESS

- [ ] **Step 2: Run all tests**

Run: `npm run test`
Expected: All tests PASS across both packages

- [ ] **Step 3: Type check**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit any fixes**

If any issues found, fix and commit with descriptive message.

- [ ] **Step 5: Tag the release**

```bash
git tag v0.3.0
```
