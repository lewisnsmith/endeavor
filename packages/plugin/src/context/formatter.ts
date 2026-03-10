import type { Project, FileChunk, TimelineEvent } from "@endeavor/shared-types";
import { countTokens } from "../chunker/token-counter.js";

export function formatProjectHeader(project: Project): string {
  const lines = [
    `# Project: ${project.name}`,
    `Type: ${project.type} | Path: ${project.path}`,
    "",
  ];
  return lines.join("\n");
}

export function formatDecisionSection(events: TimelineEvent[], maxTokens: number): { text: string; eventIds: number[] } {
  const decisions = events.filter((e) => e.kind === "decision");
  if (decisions.length === 0) {
    return { text: "", eventIds: [] };
  }

  const lines: string[] = ["## Key Decisions", ""];
  const eventIds: number[] = [];
  let tokens = countTokens(lines.join("\n"));

  for (const event of decisions) {
    const line = `- ${event.summary} (${event.tool}, ${formatTimestamp(event.timestamp)})`;
    const lineTokens = countTokens(line);

    if (tokens + lineTokens > maxTokens) break;

    lines.push(line);
    eventIds.push(event.id);
    tokens += lineTokens;
  }

  lines.push("");
  return { text: lines.join("\n"), eventIds };
}

export function formatTaskSection(events: TimelineEvent[], maxTokens: number): { text: string; eventIds: number[] } {
  const tasks = events.filter((e) => e.kind === "task");
  if (tasks.length === 0) {
    return { text: "", eventIds: [] };
  }

  const lines: string[] = ["## Active Tasks", ""];
  const eventIds: number[] = [];
  let tokens = countTokens(lines.join("\n"));

  for (const event of tasks) {
    const line = `- ${event.summary} (${formatTimestamp(event.timestamp)})`;
    const lineTokens = countTokens(line);

    if (tokens + lineTokens > maxTokens) break;

    lines.push(line);
    eventIds.push(event.id);
    tokens += lineTokens;
  }

  lines.push("");
  return { text: lines.join("\n"), eventIds };
}

export function formatEventSection(events: TimelineEvent[], maxTokens: number): { text: string; eventIds: number[] } {
  // Exclude decisions and tasks — they have their own sections
  const filtered = events.filter((e) => e.kind !== "decision" && e.kind !== "task");
  if (filtered.length === 0) {
    return { text: "", eventIds: [] };
  }

  const lines: string[] = ["## Recent Activity", ""];
  const eventIds: number[] = [];
  let tokens = countTokens(lines.join("\n"));

  for (const event of filtered) {
    const line = `- [${event.kind}] ${event.summary} (${event.tool}, ${formatTimestamp(event.timestamp)})`;
    const lineTokens = countTokens(line);

    if (tokens + lineTokens > maxTokens) break;

    lines.push(line);
    eventIds.push(event.id);
    tokens += lineTokens;
  }

  lines.push("");
  return { text: lines.join("\n"), eventIds };
}

export function formatFileSection(
  chunks: FileChunk[],
  maxTokens: number,
): { text: string; includedFiles: string[]; remainingFiles: string[] } {
  if (chunks.length === 0) {
    return { text: "", includedFiles: [], remainingFiles: [] };
  }

  const lines: string[] = ["## Relevant Files", ""];
  const includedFiles = new Set<string>();
  const allFiles = new Set(chunks.map((c) => c.filePath));
  let tokens = countTokens(lines.join("\n"));

  for (const chunk of chunks) {
    const header = `--- ${chunk.filePath} ---`;
    const block = `${header}\n${chunk.content}\n`;
    const blockTokens = countTokens(block);

    if (tokens + blockTokens > maxTokens) break;

    lines.push(block);
    includedFiles.add(chunk.filePath);
    tokens += blockTokens;
  }

  const remainingFiles = [...allFiles].filter((f) => !includedFiles.has(f));
  return { text: lines.join("\n"), includedFiles: [...includedFiles], remainingFiles };
}

export function formatReferencesSection(files: string[]): string {
  if (files.length === 0) return "";
  const lines = ["## Other Relevant Files", "", ...files.map((f) => `- ${f}`), ""];
  return lines.join("\n");
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diffMs = now - ts;

  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return d.toISOString().slice(0, 10);
}
