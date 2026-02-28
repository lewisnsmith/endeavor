import { createHash } from "node:crypto";

export function generateChunkId(
  filePath: string,
  content: string,
  startLine: number,
  endLine: number,
): string {
  const hash = createHash("sha256")
    .update(`${filePath}:${startLine}:${endLine}:${content}`)
    .digest("hex")
    .slice(0, 16);
  return `chunk_${hash}`;
}
