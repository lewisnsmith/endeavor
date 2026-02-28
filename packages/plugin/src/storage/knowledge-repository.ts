import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { KnowledgeEntry, KnowledgeEntryType } from "@endeavor/shared-types";

interface KnowledgeRow {
  id: string;
  project_id: string;
  type: string;
  content: string;
  tags: string;
  created_by: string | null;
  timestamp: number;
  embedding: Buffer | null;
}

function mapRow(row: KnowledgeRow): KnowledgeEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type as KnowledgeEntryType,
    content: row.content,
    tags: JSON.parse(row.tags || "[]") as string[],
    createdBy: row.created_by ?? "",
    timestamp: row.timestamp,
    embedding: row.embedding ?? undefined,
  };
}

export class KnowledgeRepository {
  constructor(private db: Database.Database) {}

  create(entry: Omit<KnowledgeEntry, "id">): KnowledgeEntry {
    const id = uuidv4();

    this.db
      .prepare(
        "INSERT INTO knowledge (id, project_id, type, content, tags, created_by, timestamp, embedding) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        id,
        entry.projectId,
        entry.type,
        entry.content,
        JSON.stringify(entry.tags),
        entry.createdBy || null,
        entry.timestamp,
        entry.embedding ?? null,
      );

    return { id, ...entry };
  }

  getById(id: string): KnowledgeEntry | null {
    const row = this.db
      .prepare("SELECT * FROM knowledge WHERE id = ?")
      .get(id) as KnowledgeRow | undefined;
    return row ? mapRow(row) : null;
  }

  listByProject(
    projectId: string,
    options?: { type?: KnowledgeEntryType; limit?: number },
  ): KnowledgeEntry[] {
    let sql = "SELECT * FROM knowledge WHERE project_id = ?";
    const params: unknown[] = [projectId];

    if (options?.type) {
      sql += " AND type = ?";
      params.push(options.type);
    }

    sql += " ORDER BY timestamp DESC";

    if (options?.limit) {
      sql += " LIMIT ?";
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as KnowledgeRow[];
    return rows.map(mapRow);
  }

  update(id: string, params: Partial<Pick<KnowledgeEntry, "content" | "tags">>): KnowledgeEntry | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const content = params.content ?? existing.content;
    const tags = params.tags ?? existing.tags;

    this.db
      .prepare("UPDATE knowledge SET content = ?, tags = ? WHERE id = ?")
      .run(content, JSON.stringify(tags), id);

    return { ...existing, content, tags };
  }

  delete(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM knowledge WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  deleteByProject(projectId: string): number {
    const result = this.db
      .prepare("DELETE FROM knowledge WHERE project_id = ?")
      .run(projectId);
    return result.changes;
  }
}
