import type { FileChunk } from "@endeavor/shared-types";
import type { EndeavorPlugin } from "../index.js";
import { countTokens } from "../chunker/token-counter.js";
import { searchByEmbedding } from "../embeddings/vector-search.js";
import type { VectorCandidate } from "../embeddings/vector-search.js";
import {
  formatProjectHeader,
  formatDecisionSection,
  formatTaskSection,
  formatEventSection,
  formatFileSection,
  formatReferencesSection,
} from "./formatter.js";

export interface ContextBuildOptions {
  projectId: string;
  query: string;
  maxTokens: number;
}

export interface ContextResult {
  context: string;
  tokens: number;
  sources: {
    files: string[];
    events: number[];
  };
}

export async function buildContext(
  plugin: EndeavorPlugin,
  options: ContextBuildOptions,
): Promise<ContextResult> {
  const { projectId, query, maxTokens } = options;

  const project = plugin.projects.getById(projectId);
  if (!project) {
    return { context: "Project not found.", tokens: 0, sources: { files: [], events: [] } };
  }

  // PRD 9.2 token budget allocation:
  // Header: ~7.5%, Decisions: ~20%, Files: ~45%, Tasks: ~15%, Events: ~12.5%
  const decisionBudget = Math.floor(maxTokens * 0.20);
  const fileBudget = Math.floor(maxTokens * 0.45);
  const taskBudget = Math.floor(maxTokens * 0.15);
  const eventBudget = Math.floor(maxTokens * 0.125);

  // 1. Build project header
  const header = formatProjectHeader(project);
  const headerTokens = countTokens(header);

  // 2. Get recent events (shared across sections)
  const recentEvents = plugin.events.listByProject(projectId, { limit: 50 });

  // 3. Key decisions section
  const { text: decisionText, eventIds: decisionIds } = formatDecisionSection(
    recentEvents,
    decisionBudget,
  );

  // 4. Active tasks section
  const { text: taskText, eventIds: taskIds } = formatTaskSection(
    recentEvents,
    taskBudget,
  );

  // 5. Recent events section (excluding decisions and tasks)
  const { text: eventText, eventIds } = formatEventSection(
    recentEvents,
    eventBudget,
  );

  // 6. Get chunks and rank them
  const allChunks = plugin.fileChunks.listByProject(projectId);
  const rankedChunks = await rankChunks(plugin, allChunks, query);

  // 7. Pack file content into budget
  const usedTokens = headerTokens + countTokens(decisionText) + countTokens(taskText) + countTokens(eventText);
  const remainingBudget = maxTokens - usedTokens;
  const { text: fileText, includedFiles, remainingFiles } = formatFileSection(
    rankedChunks,
    Math.min(fileBudget, remainingBudget),
  );

  // 8. Add references for files that didn't fit
  const refText = formatReferencesSection(remainingFiles.slice(0, 20));

  // 9. Assemble final context
  const context = [header, decisionText, fileText, taskText, eventText, refText].filter(Boolean).join("\n");
  const totalTokens = countTokens(context);

  const allEventIds = [...decisionIds, ...taskIds, ...eventIds];

  return {
    context,
    tokens: totalTokens,
    sources: {
      files: includedFiles,
      events: allEventIds,
    },
  };
}

async function rankChunks(
  plugin: EndeavorPlugin,
  chunks: FileChunk[],
  query: string,
): Promise<FileChunk[]> {
  if (chunks.length === 0) return [];

  // Try semantic ranking if embeddings are available
  if (query && plugin.embeddingProvider) {
    const candidates: VectorCandidate[] = chunks
      .filter((c) => c.embedding != null)
      .map((c) => ({ id: c.id, embedding: c.embedding! }));

    if (candidates.length > 0) {
      try {
        const [queryEmbedding] = await plugin.embeddingProvider.embed([query]);
        const results = searchByEmbedding(queryEmbedding, candidates, chunks.length);
        const idOrder = new Map(results.map((r, i) => [r.id, i]));

        return [...chunks].sort((a, b) => {
          const aIdx = idOrder.get(a.id) ?? Infinity;
          const bIdx = idOrder.get(b.id) ?? Infinity;
          return aIdx - bIdx;
        });
      } catch {
        // Fall through to text matching
      }
    }
  }

  // Fallback: text-based relevance + recency
  if (query) {
    const q = query.toLowerCase();
    return [...chunks].sort((a, b) => {
      const aMatch = a.content.toLowerCase().includes(q) ? 1 : 0;
      const bMatch = b.content.toLowerCase().includes(q) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.lastModified - a.lastModified;
    });
  }

  // No query: sort by recency
  return [...chunks].sort((a, b) => b.lastModified - a.lastModified);
}
