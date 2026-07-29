import { describe, it, expect, jest } from "@jest/globals";
import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { UPLOAD_DIR, extensionForContentType, isFFprobeAvailable } from "../upload-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixtureBuffer(name: string): Promise<Buffer> {
  return readFile(join(__dirname, "fixtures", name));
}

const mockEnv = {
  VIDEO_MODERATION_FAIL_CLOSED: "false",
  VIDEO_MIN_RESOLUTION: 480,
  VIDEO_MIN_FPS: 24,
};

jest.unstable_mockModule("../../config/index.js", () => ({
  env: mockEnv,
  ACCESS_TOKEN_TTL_SECONDS: 15 * 60,
  REFRESH_TOKEN_TTL_DAYS: 30,
  REFRESH_COOKIE_NAME: "refreshToken",
}));

describe("validateVideoFile graceful degradation", () => {
  const originalFailClosed = process.env.VIDEO_MODERATION_FAIL_CLOSED;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "false";
    process.env.VIDEO_MODERATION_FAIL_CLOSED = "false";
  });

  afterEach(() => {
    process.env.VIDEO_MODERATION_FAIL_CLOSED = originalFailClosed;
  });

  it("allows upload when ffprobe is missing and VIDEO_MODERATION_FAIL_CLOSED=false", async () => {
    jest.unstable_mockModule("child_process", () => ({
      execFile: jest.fn((_cmd: string, _args: readonly string[], callback: (error: Error | null) => void) => {
        callback(new Error("ENOENT: ffprobe not found"));
      }),
    }));

    const { validateVideoFile } = await import("../videoValidator.js");
    const result = await validateVideoFile(Buffer.from("fake"), "video/mp4", "fake.mp4");

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects upload when ffprobe is missing and VIDEO_MODERATION_FAIL_CLOSED=true", async () => {
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "true";

    jest.unstable_mockModule("child_process", () => ({
      execFile: jest.fn((_cmd: string, _args: readonly string[], callback: (error: Error | null) => void) => {
        callback(new Error("ENOENT: ffprobe not found"));
      }),
    }));

    const { validateVideoFile } = await import("../videoValidator.js");
    const result = await validateVideoFile(Buffer.from("fake"), "video/mp4", "fake.mp4");

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("unavailable"))).toBe(true);
  });

  it("allows upload when ffmpeg is missing but ffprobe works and VIDEO_MODERATION_FAIL_CLOSED=false", async () => {
    const mockIsFFmpegAvailable = jest.fn(() => Promise.resolve(false));

    // Restore real child_process so ffprobe probing works.
    jest.unstable_mockModule("child_process", () => ({ execFile }));

    jest.unstable_mockModule("../upload-helpers.js", () => ({
      UPLOAD_DIR,
      extensionForContentType,
      isFFprobeAvailable,
      isFFmpegAvailable: mockIsFFmpegAvailable,
    }));

    const { validateVideoFile } = await import("../videoValidator.js");
    const buffer = await fixtureBuffer("valid-720p.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "valid-720p.mp4");

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects upload when ffmpeg is missing but ffprobe works and VIDEO_MODERATION_FAIL_CLOSED=true", async () => {
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "true";
    const mockIsFFmpegAvailable = jest.fn(() => Promise.resolve(false));

    // Restore real child_process so ffprobe probing works.
    jest.unstable_mockModule("child_process", () => ({ execFile }));

    jest.unstable_mockModule("../upload-helpers.js", () => ({
      UPLOAD_DIR,
      extensionForContentType,
      isFFprobeAvailable,
      isFFmpegAvailable: mockIsFFmpegAvailable,
    }));

    const { validateVideoFile } = await import("../videoValidator.js");
    const buffer = await fixtureBuffer("valid-720p.mp4");
    const result = await validateVideoFile(buffer, "video/mp4", "valid-720p.mp4");

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("unavailable"))).toBe(true);
  });
});
