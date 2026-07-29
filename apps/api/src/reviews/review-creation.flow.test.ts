import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const mockPrisma: any = {
  review: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
  videoModeration: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

const mockEnqueueModeration = jest.fn<(videoPath: string, duration: number, reviewId?: string) => void>();

const mockEnv = {
  VIDEO_MODERATION_ENABLED: "true",
};

jest.unstable_mockModule("../prisma.js", () => ({
  prisma: mockPrisma,
}));
jest.unstable_mockModule("../upload/moderationQueue.js", () => ({
  enqueueModeration: mockEnqueueModeration,
}));
jest.unstable_mockModule("../upload/upload-helpers.js", () => ({
  UPLOAD_BASE_URL: "/uploads",
  UPLOAD_DIR: "/tmp/test-uploads",
}));
jest.unstable_mockModule("../config/index.js", () => ({
  env: mockEnv,
}));

const { createReview } = await import("./reviews.service.js");

describe("createReview flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnv.VIDEO_MODERATION_ENABLED = "true";
  });

  it("creates a new review as UNDER_REVIEW when moderation is enabled and no record exists", async () => {
    const input = {
      productId: "p1",
      videoUrl: "/uploads/v.mp4",
      duration: 5,
      format: "video/mp4",
      rating: 8,
      caption: "Great!",
    };
    const created = { id: "r1", ...input, userId: "u1", status: "UNDER_REVIEW" };
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.videoModeration.findFirst.mockResolvedValue(null);
    mockPrisma.review.create.mockResolvedValue(created);

    const result = await createReview("u1", input);
    expect(result.id).toBe("r1");
    expect(mockPrisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "UNDER_REVIEW" }),
      })
    );
    expect(mockPrisma.videoModeration.create).toHaveBeenCalledWith({
      data: { reviewId: "r1", status: "PENDING" },
    });
    expect(mockEnqueueModeration).toHaveBeenCalledWith("/tmp/test-uploads/v.mp4", 5, "r1");
  });

  it("creates a new review as UNDER_REVIEW when moderation is pending", async () => {
    const input = {
      productId: "p1",
      videoUrl: "/uploads/v.mp4",
      duration: 5,
      format: "video/mp4",
      rating: 8,
      caption: "Great!",
    };
    const created = { id: "r1", ...input, userId: "u1", status: "UNDER_REVIEW" };
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.videoModeration.findFirst.mockResolvedValue({
      id: "m1",
      reviewId: "r-other",
      status: "PENDING",
      score: null,
      reasons: [],
      frameScores: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.review.create.mockResolvedValue(created);

    const result = await createReview("u1", input);
    expect(result.status).toBe("UNDER_REVIEW");
    expect(mockPrisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "UNDER_REVIEW" }),
      })
    );
    expect(mockPrisma.videoModeration.create).not.toHaveBeenCalled();
    expect(mockEnqueueModeration).not.toHaveBeenCalled();
  });

  it("rejects review creation when moderation has rejected the video", async () => {
    const input = {
      productId: "p1",
      videoUrl: "/uploads/bad.mp4",
      duration: 5,
      format: "video/mp4",
      rating: 8,
      caption: "Great!",
    };
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.videoModeration.findFirst.mockResolvedValue({
      id: "m1",
      reviewId: "r-other",
      status: "REJECT",
      score: 0.9,
      reasons: ["Excessive skin tone"],
      frameScores: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(createReview("u1", input)).rejects.toThrow(
      "Video moderation failed: content violates community guidelines"
    );
    expect(mockPrisma.review.create).not.toHaveBeenCalled();
  });

  it("updates an existing review as UNDER_REVIEW when moderation is enabled and no record exists", async () => {
    const input = {
      productId: "p1",
      videoUrl: "/uploads/v2.mp4",
      duration: 5,
      format: "video/mp4",
      rating: 9,
      caption: "Updated",
    };
    const existing = { id: "r1", productId: "p1", userId: "u1" };
    mockPrisma.review.findFirst.mockResolvedValue(existing);
    mockPrisma.videoModeration.findFirst.mockResolvedValue(null);
    mockPrisma.review.update.mockResolvedValue({ id: "r1", ...input, userId: "u1", status: "UNDER_REVIEW" });

    await createReview("u1", input);
    expect(mockPrisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "UNDER_REVIEW" }),
      })
    );
    expect(mockPrisma.review.create).not.toHaveBeenCalled();
  });

  it("rejects updating an existing review when the new video is rejected", async () => {
    const input = {
      productId: "p1",
      videoUrl: "/uploads/bad.mp4",
      duration: 5,
      format: "video/mp4",
      rating: 9,
      caption: "Updated",
    };
    const existing = { id: "r1", productId: "p1", userId: "u1" };
    mockPrisma.review.findFirst.mockResolvedValue(existing);
    mockPrisma.videoModeration.findFirst.mockResolvedValue({
      id: "m1",
      reviewId: "r-other",
      status: "REJECT",
      score: 0.9,
      reasons: ["Excessive skin tone"],
      frameScores: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(createReview("u1", input)).rejects.toThrow(
      "Video moderation failed: content violates community guidelines"
    );
    expect(mockPrisma.review.update).not.toHaveBeenCalled();
  });

  it("does not enqueue moderation when moderation is disabled", async () => {
    mockEnv.VIDEO_MODERATION_ENABLED = "false";
    const input = {
      productId: "p1",
      videoUrl: "/uploads/v.mp4",
      duration: 5,
      format: "video/mp4",
      rating: 8,
      caption: "Great!",
    };
    const created = { id: "r1", ...input, userId: "u1", status: "PUBLISHED" };
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.videoModeration.findFirst.mockResolvedValue(null);
    mockPrisma.review.create.mockResolvedValue(created);

    await createReview("u1", input);
    expect(mockPrisma.videoModeration.create).not.toHaveBeenCalled();
    expect(mockEnqueueModeration).not.toHaveBeenCalled();
  });
});
