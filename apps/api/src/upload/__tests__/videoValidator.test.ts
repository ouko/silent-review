import { describe, it, expect, jest } from "@jest/globals";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile, unlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { validateVideoFile, stripAudioTrack, rectifyVideo } from "../videoValidator.js";

const execFileAsync = promisify(execFile);

// These tests assume ffmpeg/ffprobe are installed. In CI they are present.
// Use small fixture files committed under apps/api/src/upload/__tests__/fixtures.

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("validateVideoFile", () => {
  // Real ffmpeg/sharp frame analysis can take >5s on slower CI runners.
  jest.setTimeout(30000);

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

describe("stripAudioTrack", () => {
  jest.setTimeout(30000);

  it("removes the audio track so the video passes validation", async () => {
    const buffer = await fixtureBuffer("with-audio.mp4");
    const stripped = await stripAudioTrack(buffer, ".mp4");
    expect(stripped).not.toBeNull();

    const result = await validateVideoFile(stripped!, "video/mp4", "with-audio.mp4");
    expect(result.hasAudio).toBe(false);
    expect(result.errors.some((e) => e.includes("silent"))).toBe(false);
  });
});

describe("rectifyVideo", () => {
  jest.setTimeout(60000);

  it("trims an over-long video with audio to a valid 5s silent clip", async () => {
    // Realistic phone-style upload: 12s, 1080x1920, with an audio track.
    const srcPath = join(tmpdir(), `rectify-src-${randomUUID()}.mp4`);
    await execFileAsync("ffmpeg", [
      "-y", "-v", "error",
      "-f", "lavfi", "-i", "testsrc=duration=12:size=640x480:rate=30",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=12",
      "-c:v", "libx264", "-c:a", "aac", "-shortest",
      srcPath,
    ]);
    const buffer = await readFile(srcPath);
    await unlink(srcPath).catch(() => {});

    const rectified = await rectifyVideo(buffer, ".mp4", { trim: true });
    expect(rectified).not.toBeNull();

    const result = await validateVideoFile(rectified!, "video/mp4", "video.mp4");
    expect(result.valid).toBe(true);
    expect(result.hasAudio).toBe(false);
    expect(Math.abs(result.duration - 5)).toBeLessThanOrEqual(0.5);
  });
});

async function fixtureBuffer(name: string): Promise<Buffer> {
  return readFile(join(__dirname, "fixtures", name));
}
