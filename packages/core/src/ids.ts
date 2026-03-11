import { nanoid } from 'nanoid';

const PREFIXES = {
  project: 'p_',
  workItem: 'w_',
  decision: 'd_',
  dependency: 'dep_',
  handoff: 'h_',
  doneCriterion: 'dc_',
} as const;

type EntityType = keyof typeof PREFIXES;

export function generateId(type: EntityType): string {
  return `${PREFIXES[type]}${nanoid(12)}`;
}
