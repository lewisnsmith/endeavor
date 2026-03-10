import type { EndeavorPlugin } from "../../index.js";
import type { SearchResponse, SearchResult } from "@endeavor/shared-types";
import { searchByEmbedding } from "../../embeddings/vector-search.js";
import type { VectorCandidate } from "../../embeddings/vector-search.js";

export interface SearchActionParams {
  projectId: string;
  query: string;
  limit?: number;
}

export async function handleSearch(plugin: EndeavorPlugin, params: SearchActionParams): Promise<SearchResponse> {
  const project = plugin.projects.getById(params.projectId);
  if (!project) {
    throw new Error(`Project not found: ${params.projectId}`);
  }

  const topK = params.limit ?? 10;
  const results: SearchResult[] = [];

  // Try semantic search if embedding provider is available
  if (plugin.embeddingProvider) {
    const chunks = plugin.fileChunks.listByProject(params.projectId);
    const candidates: VectorCandidate[] = chunks
      .filter((c) => c.embedding != null)
      .map((c) => ({ id: c.id, embedding: c.embedding! }));

    if (candidates.length > 0) {
      const [queryEmbedding] = await plugin.embeddingProvider.embed([params.query]);
      const vectorResults = searchByEmbedding(queryEmbedding, candidates, topK);

      for (const vr of vectorResults) {
        const chunk = chunks.find((c) => c.id === vr.id);
        if (chunk) {
          results.push({
            type: "file",
            score: vr.score,
            snippet: chunk.content.slice(0, 200),
            source: chunk.filePath,
          });
        }
      }

      return { results };
    }
  }

  // Fallback: substring matching on chunk content
  const query = params.query.toLowerCase();
  const chunks = plugin.fileChunks.listByProject(params.projectId);

  for (const chunk of chunks) {
    const content = chunk.content.toLowerCase();
    if (content.includes(query)) {
      const idx = content.indexOf(query);
      const start = Math.max(0, idx - 50);
      const end = Math.min(chunk.content.length, idx + query.length + 150);
      results.push({
        type: "file",
        score: 1.0,
        snippet: chunk.content.slice(start, end),
        source: chunk.filePath,
      });
    }
  }

  // Also search events
  const events = plugin.events.listByProject(params.projectId, { limit: 100 });
  for (const event of events) {
    if (event.summary.toLowerCase().includes(query)) {
      results.push({
        type: "event",
        score: 0.8,
        snippet: event.summary,
        source: `event:${event.id}`,
      });
    }
  }

  const finalResults = results.slice(0, topK);

  plugin.usageLogs.log({
    projectId: params.projectId,
    tool: "mcp",
    model: null,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    timestamp: Date.now(),
  });

  return { results: finalResults };
}
