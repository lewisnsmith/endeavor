import type { Dependency } from '../types.js';
import type { WorkItemRepository } from '../storage/work-item-repo.js';
import type { DependencyRepository } from '../storage/dependency-repo.js';
import { EndeavorError, ErrorCode } from '../errors.js';

export function declareDependency(
  workItems: WorkItemRepository,
  dependencies: DependencyRepository,
  blockedId: string,
  blockerId: string,
): Dependency {
  // Verify both items exist
  const blocked = workItems.getById(blockedId);
  if (!blocked) {
    throw new EndeavorError(ErrorCode.WORK_ITEM_NOT_FOUND, `Work item not found: ${blockedId}`);
  }
  const blocker = workItems.getById(blockerId);
  if (!blocker) {
    throw new EndeavorError(ErrorCode.WORK_ITEM_NOT_FOUND, `Work item not found: ${blockerId}`);
  }

  // Check for cycles
  if (dependencies.hasCycle(blockerId, blockedId)) {
    throw new EndeavorError(ErrorCode.DEPENDENCY_CYCLE, `Adding this dependency would create a cycle`);
  }

  const dep = dependencies.create({ blockerId, blockedId });

  // If the blocker is not done, mark the blocked item as blocked
  if (blocker.status !== 'done') {
    workItems.updateStatus(blockedId, 'blocked');
  }

  return dep;
}
