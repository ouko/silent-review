import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { ModerationResult } from "./moderationEngine.js";

const mockPrisma = {
  videoModeration: {
    create: jest.fn(),
  },
  review: {
    update: jest.fn(),
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

const {
  enqueueModeration,
  processQueue,
  __testOnlyResetQueue,
  __testOnlyPushQueue,
} = await import("./moderationQueue.js");

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
    __testOnlyResetQueue();
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
    enqueueModeration("/uploads/video.mp4", 5, "review-1");
    // Allow the fire-and-forget processQueue() call to complete.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockRunVideoModeration).toHaveBeenCalledWith("/uploads/video.mp4", 5);
    expect(mockPrisma.videoModeration.create).toHaveBeenCalled();
  });
});

describe("processQueue", () => {
  beforeEach(() => {
    __testOnlyResetQueue();
    jest.clearAllMocks();
    mockEnv.VIDEO_MODERATION_ENABLED = "true";
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "false";
  });

  it("creates a VideoModeration record with the engine result", async () => {
    mockRunVideoModeration.mockResolvedValue(passResult);
    __testOnlyPushQueue({ videoPath: "/uploads/video.mp4", duration: 5, reviewId: "review-1" });
    await processQueue();

    expect(mockRunVideoModeration).toHaveBeenCalledWith("/uploads/video.mp4", 5);
    expect(mockPrisma.videoModeration.create).toHaveBeenCalledWith({
      data: {
        reviewId: "review-1",
        status: "PASS",
        score: 0.1,
        reasons: [],
        frameScores: [],
      },
    });
    expect(mockPrisma.review.update).not.toHaveBeenCalled();
  });

  it("hides the review when moderation rejects", async () => {
    mockRunVideoModeration.mockResolvedValue(rejectResult);
    __testOnlyPushQueue({ videoPath: "/uploads/video.mp4", duration: 5, reviewId: "review-1" });
    await processQueue();

    expect(mockPrisma.videoModeration.create).toHaveBeenCalledWith({
      data: {
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
    __testOnlyPushQueue({ videoPath: "/uploads/video.mp4", duration: 5 });
    await processQueue();

    expect(mockRunVideoModeration).toHaveBeenCalledWith("/uploads/video.mp4", 5);
    expect(mockPrisma.videoModeration.create).not.toHaveBeenCalled();
    expect(mockPrisma.review.update).not.toHaveBeenCalled();
  });

  it("processes multiple items sequentially", async () => {
    mockRunVideoModeration.mockResolvedValue(passResult);
    __testOnlyPushQueue({ videoPath: "/uploads/a.mp4", duration: 5, reviewId: "r1" });
    __testOnlyPushQueue({ videoPath: "/uploads/b.mp4", duration: 10, reviewId: "r2" });
    await processQueue();

    expect(mockRunVideoModeration).toHaveBeenCalledTimes(2);
    expect(mockPrisma.videoModeration.create).toHaveBeenCalledTimes(2);
  });

  it("logs the error and takes no action when fail-closed is false", async () => {
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "false";
    const error = new Error("ffmpeg crashed");
    mockRunVideoModeration.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    __testOnlyPushQueue({ videoPath: "/uploads/video.mp4", duration: 5, reviewId: "review-1" });
    await processQueue();

    expect(consoleSpy).toHaveBeenCalledWith("Moderation failed", error);
    expect(mockPrisma.videoModeration.create).not.toHaveBeenCalled();
    expect(mockPrisma.review.update).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("creates a REJECT record and hides the review when fail-closed is true", async () => {
    mockEnv.VIDEO_MODERATION_FAIL_CLOSED = "true";
    const error = new Error("ffmpeg crashed");
    mockRunVideoModeration.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    __testOnlyPushQueue({ videoPath: "/uploads/video.mp4", duration: 5, reviewId: "review-1" });
    await processQueue();

    expect(mockPrisma.videoModeration.create).toHaveBeenCalledWith({
      data: {
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
});
