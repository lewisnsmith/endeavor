import type { WorkItem } from '../types.js';
import type { WorkItemRepository } from '../storage/work-item-repo.js';
import type { DependencyRepository } from '../storage/dependency-repo.js';

export function findNext(
  workItems: WorkItemRepository,
  dependencies: DependencyRepository,
  projectId: string,
): WorkItem[] {
  const todoItems = workItems.listByStatus(projectId, 'todo');

  return todoItems.filter((item) => {
    const blockers = dependencies.getBlockersOf(item.id);
    if (blockers.length === 0) return true;

    return blockers.every((b) => {
      const blockerItem = workItems.getById(b.blockerId);
      return blockerItem?.status === 'done';
    });
  });
}
