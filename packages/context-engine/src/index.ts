export {
  buildContext,
} from "@endeavor/plugin";

export type {
  ContextBuildOptions,
  ContextResult,
} from "@endeavor/plugin";

export type { GetContextResponse } from "@endeavor/shared-types";

// Re-export the legacy interface for backwards compat
export interface ContextSelectionInput {
  projectId: string;
  query: string;
  maxTokens?: number;
}
