import { extname } from "node:path";

export const ALWAYS_IGNORED: string[] = [
  "**/.git/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/__pycache__/**",
  "**/.venv/**",
  "**/coverage/**",
  "**/.turbo/**",
  "**/.cache/**",
  "**/.DS_Store",
  "**/*.lock",
  "**/package-lock.json",
];

export const BINARY_EXTENSIONS: Set<string> = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".bmp", ".webp",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp3", ".mp4", ".avi", ".mov", ".webm", ".flac", ".wav",
  ".zip", ".tar", ".gz", ".7z", ".rar", ".bz2",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".sqlite", ".db",
]);

export function buildIgnoreList(userPatterns: string[]): string[] {
  const combined = new Set<string>(ALWAYS_IGNORED);
  for (const pattern of userPatterns) {
    if (pattern.startsWith("**/") || pattern.startsWith("*.")) {
      combined.add(pattern);
    } else {
      combined.add(`**/${pattern}/**`);
    }
  }
  return [...combined];
}

export function isBinaryFile(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(extname(filePath).toLowerCase());
}
