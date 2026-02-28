import type Database from "better-sqlite3";
import type { FileChunk } from "@endeavor/shared-types";

interface FileChunkRow {
  id: string;
  project_id: string;
  file_path: string;
  content: string;
  tokens: number;
  embedding: Buffer | null;
  last_modified: number;
}

function mapRow(row: FileChunkRow): FileChunk {
  return {
    id: row.id,
    projectId: row.project_id,
    filePath: row.file_path,
    content: row.content,
    tokens: row.tokens,
    embedding: row.embedding ?? undefined,
    lastModified: row.last_modified,
  };
}

export class FileChunkRepository {
  constructor(private db: Database.Database) {}

  upsert(chunk: FileChunk): void {
    this.db
      .prepare(
        `INSERT INTO file_chunks (id, project_id, file_path, content, tokens, embedding, last_modified)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           content = excluded.content,
           tokens = excluded.tokens,
           embedding = excluded.embedding,
           last_modified = excluded.last_modified`,
      )
      .run(
        chunk.id,
        chunk.projectId,
        chunk.filePath,
        chunk.content,
        chunk.tokens,
        chunk.embedding ?? null,
        chunk.lastModified,
      );
  }

  upsertMany(chunks: FileChunk[]): void {
    const upsertStmt = this.db.prepare(
      `INSERT INTO file_chunks (id, project_id, file_path, content, tokens, embedding, last_modified)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         content = excluded.content,
         tokens = excluded.tokens,
         embedding = excluded.embedding,
         last_modified = excluded.last_modified`,
    );

    const runBatch = this.db.transaction((items: FileChunk[]) => {
      for (const chunk of items) {
        upsertStmt.run(
          chunk.id,
          chunk.projectId,
          chunk.filePath,
          chunk.content,
          chunk.tokens,
          chunk.embedding ?? null,
          chunk.lastModified,
        );
      }
    });

    runBatch(chunks);
  }

  getById(id: string): FileChunk | null {
    const row = this.db
      .prepare("SELECT * FROM file_chunks WHERE id = ?")
      .get(id) as FileChunkRow | undefined;
    return row ? mapRow(row) : null;
  }

  listByProject(projectId: string): FileChunk[] {
    const rows = this.db
      .prepare("SELECT * FROM file_chunks WHERE project_id = ? ORDER BY file_path, id")
      .all(projectId) as FileChunkRow[];
    return rows.map(mapRow);
  }

  listByFilePath(projectId: string, filePath: string): FileChunk[] {
    const rows = this.db
      .prepare("SELECT * FROM file_chunks WHERE project_id = ? AND file_path = ? ORDER BY id")
      .all(projectId, filePath) as FileChunkRow[];
    return rows.map(mapRow);
  }

  deleteByFilePath(projectId: string, filePath: string): number {
    const result = this.db
      .prepare("DELETE FROM file_chunks WHERE project_id = ? AND file_path = ?")
      .run(projectId, filePath);
    return result.changes;
  }

  deleteByProject(projectId: string): number {
    const result = this.db
      .prepare("DELETE FROM file_chunks WHERE project_id = ?")
      .run(projectId);
    return result.changes;
  }

  deleteStaleChunks(projectId: string, filePath: string, currentChunkIds: string[]): number {
    if (currentChunkIds.length === 0) {
      return this.deleteByFilePath(projectId, filePath);
    }

    const placeholders = currentChunkIds.map(() => "?").join(",");
    const result = this.db
      .prepare(
        `DELETE FROM file_chunks
         WHERE project_id = ? AND file_path = ? AND id NOT IN (${placeholders})`,
      )
      .run(projectId, filePath, ...currentChunkIds);
    return result.changes;
  }
}
