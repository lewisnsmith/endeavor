import type { Handoff, HandoffOptions, HandoffStatus } from '../types.js';
import type { HandoffRepository } from '../storage/handoff-repo.js';
import { EndeavorError, ErrorCode } from '../errors.js';

export function createHandoff(
  handoffs: HandoffRepository,
  projectId: string,
  toAgent: string,
  summary: string,
  opts?: HandoffOptions,
): Handoff {
  return handoffs.create({
    projectId,
    toAgent,
    summary,
    fromAgent: opts?.fromAgent,
    payload: opts?.payload,
    workItemId: opts?.workItemId,
  });
}

export function transitionHandoff(
  handoffs: HandoffRepository,
  handoffId: string,
  status: HandoffStatus,
): Handoff {
  const existing = handoffs.getById(handoffId);
  if (!existing) {
    throw new EndeavorError(ErrorCode.HANDOFF_NOT_FOUND, `Handoff not found: ${handoffId}`);
  }
  return handoffs.updateStatus(handoffId, status);
}
