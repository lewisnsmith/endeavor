import type { Decision, DecideOptions } from '../types.js';
import type { DecisionRepository } from '../storage/decision-repo.js';

export function recordDecision(
  decisions: DecisionRepository,
  projectId: string,
  summary: string,
  opts?: DecideOptions,
): Decision {
  return decisions.create({
    projectId,
    summary,
    rationale: opts?.rationale,
    decidedBy: opts?.decidedBy,
    workItemId: opts?.workItemId,
  });
}
