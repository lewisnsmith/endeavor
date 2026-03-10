#!/usr/bin/env node

import { Command } from "commander";
import { apiGet, apiPost, apiDelete } from "./api-client.js";
import type {
  CreateProjectResponse,
  ListProjectsResponse,
  GetProjectResponse,
  DeleteProjectResponse,
  LogEventResponse,
  GetTimelineResponse,
  GetContextResponse,
  SearchResponse,
} from "@endeavor/shared-types";

const program = new Command();

program
  .name("endeavor")
  .version("0.1.0")
  .description("Endeavor CLI — AI Tool Bus");

// --- Project commands ---

program
  .command("add <path>")
  .description("Register a project directory")
  .option("-n, --name <name>", "project name")
  .option("-t, --type <type>", "project type (software|research|hardware|general)", "software")
  .action(async (path: string, opts: { name?: string; type?: string }) => {
    try {
      const { resolve } = await import("node:path");
      const fullPath = resolve(path);
      const name = opts.name ?? fullPath.split("/").pop() ?? "unnamed";
      const result = await apiPost<CreateProjectResponse>("/projects", {
        name,
        type: opts.type,
        path: fullPath,
      });
      console.log(`Project created: ${result.project.name} (${result.project.id})`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("list")
  .description("List registered projects")
  .option("--json", "Output as JSON")
  .action(async (opts: { json?: boolean }) => {
    try {
      const result = await apiGet<ListProjectsResponse>("/projects");
      if (opts.json) {
        console.log(JSON.stringify(result.projects, null, 2));
      } else if (result.projects.length === 0) {
        console.log("No projects registered. Use 'endeavor add <path>' to add one.");
      } else {
        for (const p of result.projects) {
          console.log(`  ${p.name} (${p.type}) — ${p.path}`);
          console.log(`    ID: ${p.id}`);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("remove <projectId>")
  .description("Remove a project")
  .action(async (projectId: string) => {
    try {
      await apiDelete<DeleteProjectResponse>(`/projects/${projectId}`);
      console.log("Project removed.");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("status [projectId]")
  .description("Show project status")
  .action(async (projectId?: string) => {
    try {
      if (projectId) {
        const result = await apiGet<GetProjectResponse>(`/projects/${projectId}`);
        console.log(`Project: ${result.project.name}`);
        console.log(`  Type: ${result.project.type}`);
        console.log(`  Path: ${result.project.path}`);
      } else {
        const result = await apiGet<ListProjectsResponse>("/projects");
        console.log(`${result.projects.length} project(s) registered`);
        for (const p of result.projects) {
          console.log(`  ${p.name} — ${p.path}`);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

// --- Context command ---

program
  .command("context <projectId>")
  .description("Get context block for a project")
  .option("-q, --query <query>", "search query to focus context")
  .option("-m, --max-tokens <n>", "max tokens", "4000")
  .action(async (projectId: string, opts: { query?: string; maxTokens?: string }) => {
    try {
      const result = await apiPost<GetContextResponse>("/context", {
        projectId,
        query: opts.query,
        maxTokens: Number(opts.maxTokens),
      });
      console.log(result.context);
      console.error(`\n--- ${result.tokens} tokens | ${result.sources.files.length} files | ${result.sources.events.length} events ---`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

// --- Log command ---

program
  .command("log <summary>")
  .description("Log an event to the timeline")
  .requiredOption("-p, --project <id>", "project ID")
  .option("-k, --kind <kind>", "event kind (prompt|response|decision|note|error|task|custom)", "note")
  .option("-t, --tool <tool>", "tool name", "cli")
  .action(async (summary: string, opts: { project: string; kind?: string; tool?: string }) => {
    try {
      const result = await apiPost<LogEventResponse>("/log", {
        projectId: opts.project,
        tool: opts.tool,
        kind: opts.kind,
        summary,
      });
      console.log(`Event logged (ID: ${result.eventId})`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

// --- Timeline command ---

program
  .command("timeline <projectId>")
  .description("Show project timeline")
  .option("-l, --limit <n>", "max events", "20")
  .option("--json", "Output as JSON")
  .action(async (projectId: string, opts: { limit?: string; json?: boolean }) => {
    try {
      const result = await apiGet<GetTimelineResponse>(
        `/timeline?projectId=${projectId}&limit=${opts.limit}`,
      );
      if (opts.json) {
        console.log(JSON.stringify(result.events, null, 2));
      } else if (result.events.length === 0) {
        console.log("No events yet.");
      } else {
        for (const e of result.events) {
          const date = new Date(e.timestamp).toLocaleString();
          console.log(`  [${e.kind}] ${e.summary}`);
          console.log(`    Tool: ${e.tool} | ${date}`);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

// --- Health command ---

program
  .command("health")
  .description("Check daemon health")
  .action(async () => {
    try {
      const result = await apiGet<{ status: string; timestamp: string }>("/health");
      console.log(`Daemon: ${result.status} (${result.timestamp})`);
    } catch (err) {
      console.error("Daemon is not running or not reachable.");
      console.error(`  ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

// --- Search command ---

program
  .command("search <projectId> <query>")
  .description("Search project files and events")
  .option("-l, --limit <n>", "max results", "10")
  .option("--json", "Output as JSON")
  .action(async (projectId: string, query: string, opts: { limit?: string; json?: boolean }) => {
    try {
      const result = await apiPost<SearchResponse>("/search", {
        projectId,
        query,
        limit: Number(opts.limit),
      });
      if (opts.json) {
        console.log(JSON.stringify(result.results, null, 2));
      } else if (result.results.length === 0) {
        console.log("No results found.");
      } else {
        for (const r of result.results) {
          console.log(`  [${r.type}] ${r.source} (score: ${r.score.toFixed(2)})`);
          console.log(`    ${r.snippet.slice(0, 120)}`);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

// --- Setup commands ---

const setup = program.command("setup").description("Configure AI tool integrations");

setup
  .command("claude-desktop")
  .description("Show Claude Desktop MCP configuration")
  .action(async () => {
    try {
      const { getClaudeDesktopConfigPath, isClaudeDesktopConfigured, generateClaudeDesktopMcpEntry } = await import("@endeavor/integrations");
      const configPath = getClaudeDesktopConfigPath();
      const configured = isClaudeDesktopConfigured();
      const entry = generateClaudeDesktopMcpEntry();

      if (configured) {
        console.log("Endeavor is already configured in Claude Desktop.");
      } else {
        console.log("Add this to your Claude Desktop config:");
      }
      console.log(`\nConfig path: ${configPath}`);
      console.log("\nMCP server entry:");
      console.log(JSON.stringify({ mcpServers: { endeavor: entry } }, null, 2));
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

setup
  .command("cursor")
  .description("Show Cursor MCP configuration")
  .action(async () => {
    try {
      const { getCursorConfigPath, isCursorConfigured, generateCursorMcpEntry } = await import("@endeavor/integrations");
      const configPath = getCursorConfigPath();
      const configured = isCursorConfigured();
      const entry = generateCursorMcpEntry();

      if (configured) {
        console.log("Endeavor is already configured in Cursor.");
      } else {
        console.log("Add this to your Cursor MCP config:");
      }
      console.log(`\nConfig path: ${configPath}`);
      console.log("\nMCP server entry:");
      console.log(JSON.stringify({ mcpServers: { endeavor: entry } }, null, 2));
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program.parse();
