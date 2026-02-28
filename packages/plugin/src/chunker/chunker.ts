import type { FileChunk } from "@endeavor/shared-types";
import { countTokens } from "./token-counter.js";
import { generateChunkId } from "./chunk-id.js";

export interface ChunkerOptions {
  maxTokensPerChunk: number;
  overlapTokens: number;
}

export interface ChunkInput {
  projectId: string;
  filePath: string;
  content: string;
  lastModified: number;
}

export function chunkFile(input: ChunkInput, options: ChunkerOptions): FileChunk[] {
  const { projectId, filePath, content, lastModified } = input;

  if (!content.trim()) return [];

  const totalTokens = countTokens(content);

  if (totalTokens <= options.maxTokensPerChunk) {
    const id = generateChunkId(filePath, content, 0, 0);
    return [
      {
        id,
        projectId,
        filePath,
        content,
        tokens: totalTokens,
        lastModified,
      },
    ];
  }

  const lines = content.split("\n");
  const chunks: FileChunk[] = [];

  let startLine = 0;
  let buffer: string[] = [];
  let bufferTokens = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTokens = countTokens(line + "\n");

    if (bufferTokens + lineTokens > options.maxTokensPerChunk && buffer.length > 0) {
      const chunkContent = buffer.join("\n");
      const endLine = startLine + buffer.length - 1;
      const id = generateChunkId(filePath, chunkContent, startLine, endLine);

      chunks.push({
        id,
        projectId,
        filePath,
        content: chunkContent,
        tokens: countTokens(chunkContent),
        lastModified,
      });

      // Calculate overlap: take trailing lines from the buffer
      const overlapLines: string[] = [];
      let overlapTokenCount = 0;
      for (let j = buffer.length - 1; j >= 0; j--) {
        const lt = countTokens(buffer[j] + "\n");
        if (overlapTokenCount + lt > options.overlapTokens) break;
        overlapLines.unshift(buffer[j]);
        overlapTokenCount += lt;
      }

      startLine = startLine + buffer.length - overlapLines.length;
      buffer = [...overlapLines];
      bufferTokens = overlapTokenCount;
    }

    buffer.push(line);
    bufferTokens += lineTokens;
  }

  // Flush remaining buffer
  if (buffer.length > 0) {
    const chunkContent = buffer.join("\n");
    const endLine = startLine + buffer.length - 1;
    const id = generateChunkId(filePath, chunkContent, startLine, endLine);

    chunks.push({
      id,
      projectId,
      filePath,
      content: chunkContent,
      tokens: countTokens(chunkContent),
      lastModified,
    });
  }

  return chunks;
}
