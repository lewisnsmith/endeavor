export interface ContextSelectionInput {
  projectId: string;
  query: string;
}

export interface ContextSelectionResult {
  projectId: string;
  query: string;
  selectedFiles: string[];
}

export function selectContext(input: ContextSelectionInput): ContextSelectionResult {
  return {
    projectId: input.projectId,
    query: input.query,
    selectedFiles: []
  };
}

