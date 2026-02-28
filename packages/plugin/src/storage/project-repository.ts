import type Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { v4 as uuidv4 } from "uuid";
import {
  type Project,
  type ProjectType,
  EndeavorError,
  EndeavorErrorCode,
} from "@endeavor/shared-types";

interface ProjectRow {
  id: string;
  name: string;
  type: string;
  path: string;
  created_at: number;
  updated_at: number;
}

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ProjectType,
    path: row.path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProjectRepository {
  constructor(private db: Database.Database) {}

  create(params: { name: string; type: ProjectType; path: string }): Project {
    if (!params.name || !params.path) {
      throw new EndeavorError(
        EndeavorErrorCode.PROJECT_INVALID_INPUT,
        "Project name and path are required",
      );
    }

    const canonicalPath = resolve(params.path);

    if (!existsSync(canonicalPath)) {
      throw new EndeavorError(
        EndeavorErrorCode.PROJECT_PATH_NOT_FOUND,
        `Path does not exist: ${canonicalPath}`,
      );
    }

    const existing = this.getByPath(canonicalPath);
    if (existing) {
      throw new EndeavorError(
        EndeavorErrorCode.PROJECT_PATH_DUPLICATE,
        `A project already exists at ${canonicalPath}: ${existing.name}`,
      );
    }

    const now = Date.now();
    const id = uuidv4();

    this.db
      .prepare(
        "INSERT INTO projects (id, name, type, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(id, params.name, params.type, canonicalPath, now, now);

    return { id, name: params.name, type: params.type, path: canonicalPath, createdAt: now, updatedAt: now };
  }

  getById(id: string): Project | null {
    const row = this.db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(id) as ProjectRow | undefined;
    return row ? mapRow(row) : null;
  }

  getByPath(path: string): Project | null {
    const canonicalPath = resolve(path);
    const row = this.db
      .prepare("SELECT * FROM projects WHERE path = ?")
      .get(canonicalPath) as ProjectRow | undefined;
    return row ? mapRow(row) : null;
  }

  list(): Project[] {
    const rows = this.db
      .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
      .all() as ProjectRow[];
    return rows.map(mapRow);
  }

  update(id: string, params: Partial<{ name: string; type: ProjectType }>): Project {
    const existing = this.getById(id);
    if (!existing) {
      throw new EndeavorError(
        EndeavorErrorCode.PROJECT_NOT_FOUND,
        `Project not found: ${id}`,
      );
    }

    const name = params.name ?? existing.name;
    const type = params.type ?? existing.type;
    const now = Date.now();

    this.db
      .prepare("UPDATE projects SET name = ?, type = ?, updated_at = ? WHERE id = ?")
      .run(name, type, now, id);

    return { ...existing, name, type, updatedAt: now };
  }

  delete(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM projects WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }
}
