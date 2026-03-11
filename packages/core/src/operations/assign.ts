import type { WorkItem, AssignOptions } from '../types.js';
import type { WorkItemRepository } from '../storage/work-item-repo.js';
import type { DoneCriteriaRepository } from '../storage/done-criteria-repo.js';

export interface AssignResult {
  item: WorkItem;
  criteriaCount: number;
}

export function assignWork(
  workItems: WorkItemRepository,
  doneCriteria: DoneCriteriaRepository,
  projectId: string,
  description: string,
  opts?: AssignOptions,
): AssignResult {
  const item = workItems.create({
    projectId,
    description,
    assignee: opts?.assignee,
    branch: opts?.branch,
    worktree: opts?.worktree,
  });

  let criteriaCount = 0;
  if (opts?.criteria) {
    for (const desc of opts.criteria) {
      doneCriteria.create({ workItemId: item.id, description: desc });
      criteriaCount++;
    }
  }

  return { item, criteriaCount };
}
