import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";

const mockPrisma: any = {
  videoModeration: {
    findFirst: jest.fn(),
  },
};

jest.unstable_mockModule("../prisma.js", () => ({
  prisma: mockPrisma,
}));
jest.unstable_mockModule("../middleware/auth.js", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  signAccessToken: jest.fn(),
  findUserById: jest.fn(),
}));

const { createApp } = await import("../app.js");

describe("GET /api/reviews/moderation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns moderation status for a video URL", async () => {
    mockPrisma.videoModeration.findFirst.mockResolvedValue({
      status: "PASS",
      score: 0.1,
      reasons: [],
    });

    const app = createApp();
    const response = await request(app)
      .get("/api/reviews/moderation?videoUrl=%2Fuploads%2Ftest.mp4")
      .set("Authorization", "Bearer fake-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "PASS", score: 0.1, reasons: [] });
    expect(mockPrisma.videoModeration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          review: { videoUrl: "/uploads/test.mp4" },
        }),
      })
    );
  });

  it("returns PENDING when no moderation record exists", async () => {
    mockPrisma.videoModeration.findFirst.mockResolvedValue(null);

    const app = createApp();
    const response = await request(app)
      .get("/api/reviews/moderation?videoUrl=%2Fuploads%2Fnew.mp4")
      .set("Authorization", "Bearer fake-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "PENDING", reasons: [], score: null });
  });

  it("returns 400 when videoUrl is missing", async () => {
    const app = createApp();
    const response = await request(app)
      .get("/api/reviews/moderation")
      .set("Authorization", "Bearer fake-token");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing videoUrl");
  });
});
