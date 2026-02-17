export const endeavorVersion = "v0-contracts";

export const healthStatuses = {
  healthy: "healthy",
  degraded: "degraded",
  unhealthy: "unhealthy"
} as const;

export type HealthStatus = (typeof healthStatuses)[keyof typeof healthStatuses];

export interface DaemonHealthResponse {
  status: HealthStatus;
  uptimeSeconds: number;
  timestamp: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
}

