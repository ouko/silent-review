import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { ModerationResult } from "./moderationEngine.js";

const mockPrisma = {
  videoModeration: {
    upsert: jest.fn() as jest.Mock,
  },
  review: {
    update: jest.fn() as jest.Mock,
  },
};

const mockRunVideoModeration: jest.Mock<(videoPath: string, duration: number) => Promise<ModerationResult>> = jest.fn();

const mockEnv = {
  VIDEO_MODERATION_ENABLED: "true",
  VIDEO_MODERATION_FAIL_CLOSED: "false",
};

jest.unstable_mockModule("../prisma.js", () => ({ prisma: mockPrisma }));
jest.unstable_mockModule("../config/index.js", () => ({ env: mockEnv }));
jest.unstable_mockModule("./moderationEngine.js", () => ({
  runVideoModeration: mockRunVideoModeration,
}));
// Pass paths straight through: these tests use fake video paths, so the
// at-rest decryption file read would fail on them.
jest.unstable_mockModule("./storageCrypto.js", () => ({
  withPlaintextCopy: (path: string, fn: (p: string) => Promise<unknown>) => fn(path),
}));
// No redis in unit tests: feed-cache clearing becomes a no-op.
jest.unstable_mockModule("../redis.js", () => ({ getRedis: () => null }));

const {
  enqueueModeration,
  processQueue,
  __testOnlyResetQueue,
  __testOnlyPushQueue,
} = await import("./moderationQueue.js");

if (!__testOnlyResetQueue || !__testOnlyPushQueue) {
  throw new Error("Test-only helpers are not available in this environment");
}
const resetQueue = __testOnlyResetQueue;
const pushQueue = __testOnlyPushQueue;

const passResult: ModerationResult = {
  status: "PASS",
  score: 0.1,
  reasons: [],
  frameScores: [],
};

const rejectResult: ModerationResult = {
  status: "REJECT",
  score: 0.9,
  reasons: ["Excessive skin tone detected at 1.00s"],
  frameScores: [{ time: 1, skinRatio: 0.9, entropy: 5, edgeDensity: 0.05, hash: "abc" }],
};

describe("enqueueModeration", () => {
  beforeEach(() => {
    resetQueue();
    jest.clearAllMocks();
    mockEnv.VIDEO_MODERATION_ENABLED = "true";
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "false";
  });

  it("does nothing when moderation is disabled", async () => {
    mockEnv.VIDEO_MODERATION_ENABLED = "false";
    enqueueModeration("/uploads/video.mp4", 5, "review-1");
    await processQueue();
    expect(mockRunVideoModeration).not.toHaveBeenCalled();
  });

  it("triggers async processing when moderation is enabled", async () => {
    mockRunVideoModeration.mockResolvedValue(passResult);
    pushQueue({ videoPath: "/uploads/video.mp4", duration: 5, reviewId: "review-1" });
    await processQueue();
    expect(mockRunVideoModeration).toHaveBeenCalledWith("/uploads/video.mp4", 5);
    expect(mockPrisma.videoModeration.upsert).toHaveBeenCalled();
  });

  it("publishes the review when moderation passes", async () => {
    mockRunVideoModeration.mockResolvedValue(passResult);
    pushQueue({ videoPath: "/uploads/video.mp4", duration: 5, reviewId: "review-1" });
    await processQueue();

    expect(mockPrisma.review.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: { status: "PUBLISHED" },
    });
  });
});

describe("processQueue", () => {
  beforeEach(() => {
    resetQueue();
    jest.clearAllMocks();
    mockEnv.VIDEO_MODERATION_ENABLED = "true";
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "false";
  });

  it("upserts a VideoModeration record with the engine result", async () => {
    mockRunVideoModeration.mockResolvedValue(passResult);
    pushQueue({ videoPath: "/uploads/video.mp4", duration: 5, reviewId: "review-1" });
    await processQueue();

    expect(mockRunVideoModeration).toHaveBeenCalledWith("/uploads/video.mp4", 5);
    expect(mockPrisma.videoModeration.upsert).toHaveBeenCalledWith({
      where: { reviewId: "review-1" },
      update: {
        status: "PASS",
        score: 0.1,
        reasons: [],
        frameScores: [],
      },
      create: {
        reviewId: "review-1",
        status: "PASS",
        score: 0.1,
        reasons: [],
        frameScores: [],
      },
    });
    expect(mockPrisma.review.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: { status: "PUBLISHED" },
    });
  });

  it("hides the review when moderation rejects", async () => {
    mockRunVideoModeration.mockResolvedValue(rejectResult);
    pushQueue({ videoPath: "/uploads/video.mp4", duration: 5, reviewId: "review-1" });
    await processQueue();

    expect(mockPrisma.videoModeration.upsert).toHaveBeenCalledWith({
      where: { reviewId: "review-1" },
      update: {
        status: "REJECT",
        score: 0.9,
        reasons: ["Excessive skin tone detected at 1.00s"],
        frameScores: rejectResult.frameScores,
      },
      create: {
        reviewId: "review-1",
        status: "REJECT",
        score: 0.9,
        reasons: ["Excessive skin tone detected at 1.00s"],
        frameScores: rejectResult.frameScores,
      },
    });
    expect(mockPrisma.review.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: { status: "HIDDEN" },
    });
  });

  it("does not persist results when no reviewId is provided", async () => {
    mockRunVideoModeration.mockResolvedValue(passResult);
    pushQueue({ videoPath: "/uploads/video.mp4", duration: 5 });
    await processQueue();

    expect(mockRunVideoModeration).toHaveBeenCalledWith("/uploads/video.mp4", 5);
    expect(mockPrisma.videoModeration.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.review.update).not.toHaveBeenCalled();
  });

  it("processes multiple items sequentially", async () => {
    mockRunVideoModeration.mockResolvedValue(passResult);
    pushQueue({ videoPath: "/uploads/a.mp4", duration: 5, reviewId: "r1" });
    pushQueue({ videoPath: "/uploads/b.mp4", duration: 10, reviewId: "r2" });
    await processQueue();

    expect(mockRunVideoModeration).toHaveBeenCalledTimes(2);
    expect(mockPrisma.videoModeration.upsert).toHaveBeenCalledTimes(2);
  });

  it("logs the error and takes no action when fail-closed is false", async () => {
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "false";
    const error = new Error("ffmpeg crashed");
    mockRunVideoModeration.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    pushQueue({ videoPath: "/uploads/video.mp4", duration: 5, reviewId: "review-1" });
    await processQueue();

    expect(consoleSpy).toHaveBeenCalledWith("Moderation failed", error);
    expect(mockPrisma.videoModeration.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.review.update).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("upserts a REJECT record and hides the review when fail-closed is true", async () => {
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "true";
    const error = new Error("ffmpeg crashed");
    mockRunVideoModeration.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    pushQueue({ videoPath: "/uploads/video.mp4", duration: 5, reviewId: "review-1" });
    await processQueue();

    expect(mockPrisma.videoModeration.upsert).toHaveBeenCalledWith({
      where: { reviewId: "review-1" },
      update: {
        status: "REJECT",
        reasons: ["Moderation could not be completed"],
      },
      create: {
        reviewId: "review-1",
        status: "REJECT",
        reasons: ["Moderation could not be completed"],
      },
    });
    expect(mockPrisma.review.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: { status: "HIDDEN" },
    });
    expect(consoleSpy).toHaveBeenCalledWith("Moderation failed", error);

    consoleSpy.mockRestore();
  });

  it("does not deadlock when the fail-closed DB write throws", async () => {
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "true";
    const engineError = new Error("ffmpeg crashed");
    const dbError = new Error("database unavailable");

    mockRunVideoModeration.mockRejectedValueOnce(engineError);
    mockPrisma.videoModeration.upsert.mockImplementationOnce(() => Promise.reject(dbError));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    pushQueue({ videoPath: "/uploads/failing.mp4", duration: 5, reviewId: "review-fail" });
    pushQueue({ videoPath: "/uploads/next.mp4", duration: 5, reviewId: "review-next" });
    await processQueue();

    expect(consoleSpy).toHaveBeenCalledWith("Failed to persist fail-closed moderation state", dbError);
    expect(consoleSpy).toHaveBeenCalledWith("Moderation failed", engineError);
    // The second item must still be processed despite the DB failure on the first.
    expect(mockRunVideoModeration).toHaveBeenCalledTimes(2);
    expect(mockPrisma.videoModeration.upsert).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });
});
