export interface IntegrationStatus {
  tool: "claude-desktop" | "cursor";
  configured: boolean;
}

export function listIntegrationStatuses(): IntegrationStatus[] {
  return [
    { tool: "claude-desktop", configured: false },
    { tool: "cursor", configured: false }
  ];
}

