import { cosineSimilarity } from "./cosine-similarity.js";
import { bufferToEmbedding } from "./serialize.js";

export interface VectorCandidate {
  id: string;
  embedding: Buffer;
}

export interface VectorSearchResult {
  id: string;
  score: number;
}

export function searchByEmbedding(
  query: Float64Array,
  candidates: VectorCandidate[],
  topK: number,
): VectorSearchResult[] {
  const scored = candidates
    .map((c) => ({
      id: c.id,
      score: cosineSimilarity(query, bufferToEmbedding(c.embedding)),
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}
