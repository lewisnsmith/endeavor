export type LogLevel = "debug" | "info" | "warn" | "error";

export interface EndeavorConfig {
  dataDir: string;
  logLevel: LogLevel;
  maxFileSizeBytes: number;
  ignoredPatterns: string[];
  chunkMaxTokens: number;
  chunkOverlapTokens: number;
}

export const DEFAULT_CONFIG: EndeavorConfig = {
  dataDir: "~/.endeavor",
  logLevel: "info",
  maxFileSizeBytes: 1_048_576,
  ignoredPatterns: [
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    "__pycache__",
    ".venv",
    "coverage",
    ".turbo",
    ".cache",
  ],
  chunkMaxTokens: 512,
  chunkOverlapTokens: 50,
};
