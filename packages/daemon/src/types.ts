export type NotificationKind = 'handoff_created' | 'item_unblocked' | 'item_completed';

export interface Notification {
  kind: NotificationKind;
  timestamp: number;
  data: Record<string, unknown>;
}
