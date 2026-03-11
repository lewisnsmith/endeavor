import type { DoneResult } from '../types.js';
import type { WorkItemRepository } from '../storage/work-item-repo.js';
import type { DependencyRepository } from '../storage/dependency-repo.js';
import type { DoneCriteriaRepository } from '../storage/done-criteria-repo.js';
import { EndeavorError, ErrorCode } from '../errors.js';

export function markDone(
  workItems: WorkItemRepository,
  dependencies: DependencyRepository,
  doneCriteria: DoneCriteriaRepository,
  itemId: string,
): DoneResult {
  const item = workItems.getById(itemId);
  if (!item) {
    throw new EndeavorError(ErrorCode.WORK_ITEM_NOT_FOUND, `Work item not found: ${itemId}`);
  }

  const criteria = doneCriteria.listByWorkItem(itemId);
  const unmetCount = criteria.filter((c) => !c.met).length;

  // Mark as done regardless of unmet criteria (warn only)
  const updatedItem = workItems.updateStatus(itemId, 'done');

  // Find items that were blocked by this one and unblock them if all blockers are done
  const blockedDeps = dependencies.getBlockedBy(itemId);
  const unblocked = [];

  for (const dep of blockedDeps) {
    const blockedItem = workItems.getById(dep.blockedId);
    if (!blockedItem || blockedItem.status !== 'blocked') continue;

    const allBlockers = dependencies.getBlockersOf(dep.blockedId);
    const allBlockersDone = allBlockers.every((b) => {
      const blockerItem = workItems.getById(b.blockerId);
      return blockerItem?.status === 'done';
    });

    if (allBlockersDone) {
      const unblockedItem = workItems.updateStatus(dep.blockedId, 'todo');
      unblocked.push(unblockedItem);
    }
  }

  return { item: updatedItem, criteria, unmetCount, unblocked };
}
