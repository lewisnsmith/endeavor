import type { ProjectStatus } from '../types.js';
import type { ProjectRepository } from '../storage/project-repository.js';
import type { WorkItemRepository } from '../storage/work-item-repo.js';
import type { HandoffRepository } from '../storage/handoff-repo.js';
import type { DecisionRepository } from '../storage/decision-repo.js';
import { EndeavorError, ErrorCode } from '../errors.js';

export function getStatus(
  projects: ProjectRepository,
  workItems: WorkItemRepository,
  handoffs: HandoffRepository,
  decisions: DecisionRepository,
  projectId: string,
): ProjectStatus {
  const project = projects.getById(projectId);
  if (!project) {
    throw new EndeavorError(ErrorCode.PROJECT_NOT_FOUND, `Project not found: ${projectId}`);
  }

  const items = workItems.listByProject(projectId);
  const pendingHandoffs = handoffs.listByProject(projectId, 'pending');
  const recentDecisions = decisions.listByProject(projectId, 5);

  const summary = {
    total: items.length,
    todo: 0,
    inProgress: 0,
    blocked: 0,
    done: 0,
    cancelled: 0,
  };

  for (const item of items) {
    switch (item.status) {
      case 'todo': summary.todo++; break;
      case 'in_progress': summary.inProgress++; break;
      case 'blocked': summary.blocked++; break;
      case 'done': summary.done++; break;
      case 'cancelled': summary.cancelled++; break;
    }
  }

  return { project, items, handoffs: pendingHandoffs, decisions: recentDecisions, summary };
}
