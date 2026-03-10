import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EndeavorPlugin, createLogger } from "@endeavor/plugin";
import { createRestApi } from "./rest-api.js";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";

describe("REST API", () => {
  let plugin: EndeavorPlugin;
  let api: { address: string; close(): Promise<void> };
  let logger: ReturnType<typeof createLogger>;

  beforeEach(async () => {
    logger = createLogger("test-rest-api", { level: "error" });
    plugin = new EndeavorPlugin({
      dataDir: ":memory:",
      logLevel: "error",
    });
    plugin.initialize();

    api = await createRestApi({
      plugin,
      logger,
      port: 0, // Use random available port
    });
  });

  afterEach(async () => {
    await api.close();
    await plugin.shutdown();
  });

  it("GET /health should return healthy status", async () => {
    const response = await fetch(`${api.address}/health`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("status", "healthy");
    expect(data).toHaveProperty("timestamp");
    expect(typeof data.timestamp).toBe("string");
  });

  it("POST /projects should create a project", async () => {
    const projectPath = mkdtempSync(join(tmpdir(), "endeavor-test-"));
    const response = await fetch(`${api.address}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "test",
        type: "software",
        path: projectPath,
      }),
    });

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty("project");
    expect(data.project).toHaveProperty("id");
    expect(data.project).toHaveProperty("name", "test");
    expect(data.project).toHaveProperty("type", "software");
    expect(data.project).toHaveProperty("path", projectPath);
  });

  it("GET /projects should list projects", async () => {
    // Create a project first
    const projectPath = mkdtempSync(join(tmpdir(), "endeavor-test-"));
    await fetch(`${api.address}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "test",
        type: "software",
        path: projectPath,
      }),
    });

    // Get projects list
    const response = await fetch(`${api.address}/projects`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("projects");
    expect(Array.isArray(data.projects)).toBe(true);
    expect(data.projects.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /context should return context", async () => {
    // Create a project first
    const projectPath = mkdtempSync(join(tmpdir(), "endeavor-test-"));
    const createResponse = await fetch(`${api.address}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "test",
        type: "software",
        path: projectPath,
      }),
    });
    const { project } = await createResponse.json();

    // Request context
    const response = await fetch(`${api.address}/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        query: "",
        maxTokens: 1000,
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("context");
    expect(data).toHaveProperty("tokens");
    expect(data).toHaveProperty("sources");
    expect(typeof data.context).toBe("string");
    expect(typeof data.tokens).toBe("number");
    expect(data.sources).toHaveProperty("files");
    expect(data.sources).toHaveProperty("events");
  });

  it("POST /log should create an event", async () => {
    // Create a project first
    const projectPath = mkdtempSync(join(tmpdir(), "endeavor-test-"));
    const createResponse = await fetch(`${api.address}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "test",
        type: "software",
        path: projectPath,
      }),
    });
    const { project } = await createResponse.json();

    // Log an event
    const response = await fetch(`${api.address}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        summary: "test event",
      }),
    });

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("eventId");
    expect(typeof data.eventId).toBe("number");
  });

  it("GET /timeline should return events", async () => {
    // Create a project first
    const projectPath = mkdtempSync(join(tmpdir(), "endeavor-test-"));
    const createResponse = await fetch(`${api.address}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "test",
        type: "software",
        path: projectPath,
      }),
    });
    const { project } = await createResponse.json();

    // Log an event
    await fetch(`${api.address}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        summary: "test event",
      }),
    });

    // Get timeline
    const response = await fetch(
      `${api.address}/timeline?projectId=${project.id}`
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("events");
    expect(Array.isArray(data.events)).toBe(true);
    expect(data.events.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /search should return results", async () => {
    // Create a project first
    const projectPath = mkdtempSync(join(tmpdir(), "endeavor-test-"));
    const createResponse = await fetch(`${api.address}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "test",
        type: "software",
        path: projectPath,
      }),
    });
    const { project } = await createResponse.json();

    // Search
    const response = await fetch(`${api.address}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        query: "test",
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("results");
    expect(Array.isArray(data.results)).toBe(true);
  });
});
