import { basename } from 'node:path';
import type { Project } from '../types.js';
import type { ProjectRepository } from '../storage/project-repository.js';

export function initProject(
  projects: ProjectRepository,
  projectPath: string,
  name?: string,
): Project {
  const existing = projects.getByPath(projectPath);
  if (existing) return existing;

  const projectName = name ?? basename(projectPath);
  return projects.create({ name: projectName, path: projectPath });
}
