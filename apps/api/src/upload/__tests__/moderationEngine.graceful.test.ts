import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from "@jest/globals";
import { execFile } from "child_process";
import { unlink } from "fs/promises";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const mockEnv = {
  VIDEO_MODERATION_FRAME_COUNT: 2,
  VIDEO_MODERATION_SKIN_THRESHOLD: 0.35,
  VIDEO_MODERATION_FAIL_CLOSED: "false",
};

jest.unstable_mockModule("../../config/index.js", () => ({
  env: mockEnv,
  ACCESS_TOKEN_TTL_SECONDS: 15 * 60,
  REFRESH_TOKEN_TTL_DAYS: 30,
  REFRESH_COOKIE_NAME: "refreshToken",
}));

describe("runVideoModeration graceful degradation", () => {
  const originalFailClosed = process.env.VIDEO_MODERATION_FAIL_CLOSED;
  const originalFrameCount = mockEnv.VIDEO_MODERATION_FRAME_COUNT;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "false";
    mockEnv.VIDEO_MODERATION_FRAME_COUNT = originalFrameCount;
    process.env.VIDEO_MODERATION_FAIL_CLOSED = "false";
  });

  afterEach(() => {
    process.env.VIDEO_MODERATION_FAIL_CLOSED = originalFailClosed;
  });

  it("returns PASS when ffmpeg is missing and VIDEO_MODERATION_FAIL_CLOSED=false", async () => {
    jest.unstable_mockModule("child_process", () => ({
      execFile: jest.fn((_cmd: string, _args: readonly string[], callback: (error: Error | null) => void) => {
        callback(new Error("ENOENT: ffmpeg not found"));
      }),
    }));

    const { runVideoModeration } = await import("../moderationEngine.js");
    const result = await runVideoModeration("fake.mp4", 5);

    expect(result.status).toBe("PASS");
    expect(result.reasons.some((r) => r.includes("ffmpeg"))).toBe(true);
  });

  it("returns REJECT when ffmpeg is missing and VIDEO_MODERATION_FAIL_CLOSED=true", async () => {
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "true";

    jest.unstable_mockModule("child_process", () => ({
      execFile: jest.fn((_cmd: string, _args: readonly string[], callback: (error: Error | null) => void) => {
        callback(new Error("ENOENT: ffmpeg not found"));
      }),
    }));

    const { runVideoModeration } = await import("../moderationEngine.js");
    const result = await runVideoModeration("fake.mp4", 5);

    expect(result.status).toBe("REJECT");
    expect(result.reasons.some((r) => r.includes("ffmpeg"))).toBe(true);
  });

  describe("sharp unavailable", () => {
    let fixturePath: string;

    beforeAll(async () => {
      fixturePath = await createFixture("sharp-degrade", 2, "testsrc=duration=2:size=320x240:rate=30");
    });

    afterAll(async () => {
      await unlink(fixturePath).catch(() => {});
    });

    beforeEach(() => {
      // Restore real child_process so ffmpeg probing/frame extraction works.
      jest.unstable_mockModule("child_process", () => ({ execFile }));
    });

    it("returns PASS when sharp fails and VIDEO_MODERATION_FAIL_CLOSED=false", async () => {
      jest.unstable_mockModule("sharp", () => ({
        default: jest.fn(() => {
          throw new Error("Cannot find module 'sharp'");
        }),
      }));

      const { runVideoModeration } = await import("../moderationEngine.js");
      const result = await runVideoModeration(fixturePath, 2);

      expect(result.status).toBe("PASS");
      expect(result.reasons.some((r) => r.includes("Frame analysis failed"))).toBe(true);
    });

    it("returns REJECT when sharp fails and VIDEO_MODERATION_FAIL_CLOSED=true", async () => {
      mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "true";

      jest.unstable_mockModule("sharp", () => ({
        default: jest.fn(() => {
          throw new Error("Cannot find module 'sharp'");
        }),
      }));

      const { runVideoModeration } = await import("../moderationEngine.js");
      const result = await runVideoModeration(fixturePath, 2);

      expect(result.status).toBe("REJECT");
      expect(result.reasons.some((r) => r.includes("Frame analysis failed"))).toBe(true);
    });
  });

  it("returns PASS when frame count is zero", async () => {
    mockEnv.VIDEO_MODERATION_FRAME_COUNT = 0;

    const { runVideoModeration } = await import("../moderationEngine.js");
    const result = await runVideoModeration("fake.mp4", 5);

    expect(result.status).toBe("PASS");
    expect(result.frameScores).toHaveLength(0);
  });
});

async function createFixture(name: string, duration: number, filter: string): Promise<string> {
  const output = `/tmp/moderation-test-${name}-${Date.now()}.mp4`;
  await execFileAsync("ffmpeg", [
    "-f", "lavfi",
    "-i", filter,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-t", String(duration),
    "-an",
    "-y",
    output,
  ]);
  return output;
}
