import { describe, it, expect } from "@jest/globals";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile } from "fs/promises";
import { validateVideoFile } from "../videoValidator.js";

// These tests assume ffmpeg/ffprobe are installed. In CI they are present.
// Use small fixture files committed under apps/api/src/upload/__tests__/fixtures.

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("validateVideoFile", () => {
  it("accepts a valid 5s silent 720p mp4", async () => {
    const buffer = await fixtureBuffer("valid-720p.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "valid-720p.mp4");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects a video below min resolution", async () => {
    const buffer = await fixtureBuffer("240p.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "240p.mp4");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("480"))).toBe(true);
  });

  it("rejects a video with audio", async () => {
    const buffer = await fixtureBuffer("with-audio.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "with-audio.mp4");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("silent"))).toBe(true);
  });

  it("rejects a static image", async () => {
    const buffer = await fixtureBuffer("static-frame.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "static-frame.mp4");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("still"))).toBe(true);
  });

  it("rejects a video that is too dark", async () => {
    const buffer = await fixtureBuffer("black.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "black.mp4");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("dark"))).toBe(true);
  });
});

async function fixtureBuffer(name: string): Promise<Buffer> {
  return readFile(join(__dirname, "fixtures", name));
}
