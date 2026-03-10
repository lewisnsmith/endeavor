import type { EndeavorPlugin } from "../../index.js";
import type { StatusResponse } from "@endeavor/shared-types";

export function handleStatus(plugin: EndeavorPlugin, projectId?: string): StatusResponse | StatusResponse[] {
  if (projectId) {
    return getProjectStatus(plugin, projectId);
  }

  // No projectId — return status for all projects
  const projects = plugin.projects.list();
  return projects.map((p) => getProjectStatus(plugin, p.id));
}

function getProjectStatus(plugin: EndeavorPlugin, projectId: string): StatusResponse {
  const project = plugin.projects.getById(projectId);
  if (!project) {
    return {
      projectId,
      name: "unknown",
      totalFiles: 0,
      totalChunks: 0,
      totalEvents: 0,
      lastActivity: null,
    };
  }

  const chunks = plugin.fileChunks.listByProject(projectId);
  const eventCount = plugin.events.countByProject(projectId);
  const recentEvents = plugin.events.listByProject(projectId, { limit: 1 });

  // Count unique files from chunks
  const uniqueFiles = new Set(chunks.map((c) => c.filePath));

  return {
    projectId,
    name: project.name,
    totalFiles: uniqueFiles.size,
    totalChunks: chunks.length,
    totalEvents: eventCount,
    lastActivity: recentEvents.length > 0 ? recentEvents[0].timestamp : project.updatedAt,
  };
}
