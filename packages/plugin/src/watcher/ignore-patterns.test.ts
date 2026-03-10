import { describe, it, expect } from "vitest";
import {
  buildIgnoreList,
  isBinaryFile,
  ALWAYS_IGNORED,
} from "./ignore-patterns.js";

describe("ignore-patterns", () => {
  describe("buildIgnoreList", () => {
    it("should include all default patterns", () => {
      const result = buildIgnoreList([]);
      for (const pattern of ALWAYS_IGNORED) {
        expect(result).toContain(pattern);
      }
    });

    it("should merge user patterns", () => {
      const result = buildIgnoreList(["vendor", "tmp"]);
      expect(result).toContain("**/vendor/**");
      expect(result).toContain("**/tmp/**");
    });

    it("should not duplicate already-globbed patterns", () => {
      const result = buildIgnoreList(["**/.mydir/**"]);
      expect(result).toContain("**/.mydir/**");
    });

    it("should pass through glob-style user patterns", () => {
      const result = buildIgnoreList(["*.log"]);
      expect(result).toContain("*.log");
    });
  });

  describe("isBinaryFile", () => {
    it("should detect binary image files", () => {
      expect(isBinaryFile("photo.png")).toBe(true);
      expect(isBinaryFile("image.jpg")).toBe(true);
      expect(isBinaryFile("icon.ico")).toBe(true);
    });

    it("should detect binary archive files", () => {
      expect(isBinaryFile("data.zip")).toBe(true);
      expect(isBinaryFile("backup.tar")).toBe(true);
    });

    it("should not flag text files as binary", () => {
      expect(isBinaryFile("code.ts")).toBe(false);
      expect(isBinaryFile("readme.md")).toBe(false);
      expect(isBinaryFile("config.json")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(isBinaryFile("IMAGE.PNG")).toBe(true);
      expect(isBinaryFile("Photo.JPG")).toBe(true);
    });
  });
});
