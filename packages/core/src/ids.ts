import { nanoid } from 'nanoid';

const PREFIXES = {
  session: 's_',
  sessionEvent: 'se_',
} as const;

type EntityType = keyof typeof PREFIXES;

export function generateId(type: EntityType): string {
  return `${PREFIXES[type]}${nanoid(12)}`;
}
