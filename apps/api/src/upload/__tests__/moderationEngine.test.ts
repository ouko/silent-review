import { describe, it, expect } from "@jest/globals";
import { runVideoModeration } from "../moderationEngine.js";
import { unlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Frame extraction + sharp analysis is slow under parallel test load, so these
// tests get a longer timeout than Jest's default 5s.
const TEST_TIMEOUT_MS = 60_000;

describe("runVideoModeration", () => {
  it(
    "passes a video with motion and edges",
    async () => {
      // The brief specified a solid-color fixture (`color=c=#336699`) for the
      // "valid" case, but that fixture has near-zero entropy and no edges, so it
      // is rejected by the heuristics. We use `testsrc` instead because it
      // produces motion, texture, and edges and therefore passes as PASS.
      const path = await createFixture("valid", 5, "testsrc=duration=5:size=640x480:rate=30");
      try {
        const result = await runVideoModeration(path, 5);
        expect(result.status).toBe("PASS");
      } finally {
        await unlink(path).catch(() => {});
      }
    },
    TEST_TIMEOUT_MS
  );

  it(
    "rejects a video that is mostly skin-toned",
    async () => {
      const path = await createFixture("skin", 5, "color=c=#e0ac69:s=640x480:d=5");
      try {
        const result = await runVideoModeration(path, 5);
        expect(result.status).toBe("REJECT");
        expect(result.reasons.some((r) => r.includes("skin"))).toBe(true);
      } finally {
        await unlink(path).catch(() => {});
      }
    },
    TEST_TIMEOUT_MS
  );

  it(
    "rejects a completely black video",
    async () => {
      const path = await createFixture("black", 5, "color=c=black:s=640x480:d=5");
      try {
        const result = await runVideoModeration(path, 5);
        expect(result.status).toBe("REJECT");
      } finally {
        await unlink(path).catch(() => {});
      }
    },
    TEST_TIMEOUT_MS
  );

  it(
    "flags a static image video for review",
    async () => {
      const path = await createFixture("static", 5, "color=c=#448844:s=640x480:d=5");
      try {
        const result = await runVideoModeration(path, 5);
        expect(["REJECT", "REVIEW"]).toContain(result.status);
      } finally {
        await unlink(path).catch(() => {});
      }
    },
    TEST_TIMEOUT_MS
  );

  it("rejects a video with a non-positive duration", async () => {
    const result = await runVideoModeration("nonexistent.mp4", 0);
    expect(result.status).toBe("REJECT");
    expect(result.reasons).toContain("Invalid video duration");
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
