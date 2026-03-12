import { join } from 'node:path';
import { EndeavorDatabase } from './storage/database.js';
import { ProjectRepository } from './storage/project-repository.js';
import { WorkItemRepository } from './storage/work-item-repo.js';
import { DecisionRepository } from './storage/decision-repo.js';
import { DependencyRepository } from './storage/dependency-repo.js';
import { HandoffRepository } from './storage/handoff-repo.js';
import { DoneCriteriaRepository } from './storage/done-criteria-repo.js';
import { createLogger } from './logger.js';
import type { LogLevel, Logger } from './logger.js';
import type {
  Project, WorkItem, Decision, Dependency, Handoff,
  ProjectStatus, DoneResult, AssignOptions, DecideOptions, HandoffOptions,
} from './types.js';
import { initProject } from './operations/init.js';
import { getStatus } from './operations/status.js';
import { assignWork, type AssignResult } from './operations/assign.js';
import { recordDecision } from './operations/decide.js';
import { declareDependency } from './operations/depend.js';
import { createHandoff, transitionHandoff } from './operations/handoff.js';
import { markDone } from './operations/done.js';
import { findNext } from './operations/next.js';

export interface EndeavorOptions {
  dataDir: string;
  logLevel?: LogLevel;
}

export class Endeavor {
  private database: EndeavorDatabase;
  private logger: Logger;

  readonly projects: ProjectRepository;
  readonly workItems: WorkItemRepository;
  readonly decisions: DecisionRepository;
  readonly dependencies: DependencyRepository;
  readonly handoffs: HandoffRepository;
  readonly doneCriteria: DoneCriteriaRepository;

  constructor(opts: EndeavorOptions) {
    this.logger = createLogger('endeavor', { level: opts.logLevel });
    const dbPath = join(opts.dataDir, 'endeavor.db');
    this.database = new EndeavorDatabase({ dbPath, logger: this.logger });

    // Placeholders — will be initialized in initialize()
    this.projects = null!;
    this.workItems = null!;
    this.decisions = null!;
    this.dependencies = null!;
    this.handoffs = null!;
    this.doneCriteria = null!;
  }

  initialize(): void {
    this.database.initialize();
    const db = this.database.getDb();

    (this as { projects: ProjectRepository }).projects = new ProjectRepository(db);
    (this as { workItems: WorkItemRepository }).workItems = new WorkItemRepository(db);
    (this as { decisions: DecisionRepository }).decisions = new DecisionRepository(db);
    (this as { dependencies: DependencyRepository }).dependencies = new DependencyRepository(db);
    (this as { handoffs: HandoffRepository }).handoffs = new HandoffRepository(db);
    (this as { doneCriteria: DoneCriteriaRepository }).doneCriteria = new DoneCriteriaRepository(db);
  }

  close(): void {
    this.database.close();
  }

  init(projectPath: string, name?: string): Project {
    return initProject(this.projects, projectPath, name);
  }

  status(projectId: string): ProjectStatus {
    return getStatus(this.projects, this.workItems, this.handoffs, this.decisions, projectId);
  }

  assign(projectId: string, description: string, opts?: AssignOptions): AssignResult {
    return assignWork(this.workItems, this.doneCriteria, projectId, description, opts);
  }

  decide(projectId: string, summary: string, opts?: DecideOptions): Decision {
    return recordDecision(this.decisions, projectId, summary, opts);
  }

  depend(blockedId: string, blockerId: string): Dependency {
    return declareDependency(this.workItems, this.dependencies, blockedId, blockerId);
  }

  handoff(projectId: string, toAgent: string, summary: string, opts?: HandoffOptions): Handoff {
    return createHandoff(this.handoffs, projectId, toAgent, summary, opts);
  }

  acceptHandoff(handoffId: string): Handoff {
    return transitionHandoff(this.handoffs, handoffId, 'accepted');
  }

  completeHandoff(handoffId: string): Handoff {
    return transitionHandoff(this.handoffs, handoffId, 'completed');
  }

  done(itemId: string): DoneResult {
    return markDone(this.workItems, this.dependencies, this.doneCriteria, itemId);
  }

  next(projectId: string): WorkItem[] {
    return findNext(this.workItems, this.dependencies, projectId);
  }
}
