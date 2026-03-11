export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  updatedAt: number;
}

export type WorkItemStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

export interface WorkItem {
  id: string;
  projectId: string;
  description: string;
  status: WorkItemStatus;
  assignee: string | null;
  branch: string | null;
  worktree: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Decision {
  id: string;
  projectId: string;
  workItemId: string | null;
  summary: string;
  rationale: string | null;
  decidedBy: string | null;
  createdAt: number;
}

export interface Dependency {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: number;
}

export type HandoffStatus = 'pending' | 'accepted' | 'completed' | 'expired';

export interface Handoff {
  id: string;
  projectId: string;
  fromAgent: string | null;
  toAgent: string | null;
  summary: string;
  payload: string | null;
  status: HandoffStatus;
  workItemId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DoneCriterion {
  id: string;
  workItemId: string;
  description: string;
  met: boolean;
  metAt: number | null;
  createdAt: number;
}

export interface AssignOptions {
  assignee?: string;
  branch?: string;
  worktree?: string;
  criteria?: string[];
}

export interface DecideOptions {
  rationale?: string;
  decidedBy?: string;
  workItemId?: string;
}

export interface HandoffOptions {
  fromAgent?: string;
  payload?: string;
  workItemId?: string;
}

export interface ProjectStatus {
  project: Project;
  items: WorkItem[];
  handoffs: Handoff[];
  decisions: Decision[];
  summary: {
    total: number;
    todo: number;
    inProgress: number;
    blocked: number;
    done: number;
    cancelled: number;
  };
}

export interface DoneResult {
  item: WorkItem;
  criteria: DoneCriterion[];
  unmetCount: number;
  unblocked: WorkItem[];
}
