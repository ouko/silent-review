import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";

const mockPrisma = {
  review: { findMany: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>> },
  guess: {
    count: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>>,
    findMany: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>>,
  },
  like: { findMany: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>> },
  comment: { findMany: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>> },
  shareEvent: { groupBy: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>> },
  product: { findUnique: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>> },
};

jest.unstable_mockModule("../prisma.js", () => ({ prisma: mockPrisma }));
jest.unstable_mockModule("../middleware/auth.js", () => ({
  requireAuth: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: "user-1", email: "u@example.com", role: "USER" };
    next();
  },
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  signAccessToken: jest.fn(),
  findUserById: jest.fn(),
}));

const { analyticsRouter } = await import("./analytics.routes.js");
const { default: express } = await import("express");

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api/analytics", analyticsRouter);
  return a;
}

const sampleReview = {
  id: "r1",
  rating: 8,
  status: "PUBLISHED",
  likeCount: 4,
  guessCount: 10,
  commentCount: 2,
  shareCount: 3,
  createdAt: new Date("2026-07-01"),
  product: { id: "p1", name: "Widget" },
};

describe("analytics routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.review.findMany.mockResolvedValue([sampleReview]);
    mockPrisma.guess.count.mockResolvedValue(5);
    mockPrisma.shareEvent.groupBy.mockResolvedValue([{ provider: "tiktok", _count: { _all: 3 } }]);
    mockPrisma.like.findMany.mockResolvedValue([]);
    mockPrisma.comment.findMany.mockResolvedValue([]);
    mockPrisma.guess.findMany.mockResolvedValue([]);
  });

  it("creator analytics aggregates the user's own reviews", async () => {
    const res = await request(app()).get("/api/analytics/creator");
    expect(res.status).toBe(200);
    expect(res.body.totalReviews).toBe(1);
    expect(res.body.publishedReviews).toBe(1);
    expect(res.body.averageRating).toBe(8);
    expect(res.body.engagement).toEqual({ likes: 4, comments: 2, guesses: 10, shares: 3 });
    expect(res.body.guessAccuracy).toBe(0.5);
    expect(res.body.sharesByProvider).toEqual({ tiktok: 3 });
    expect(mockPrisma.guess.count).toHaveBeenCalledWith({
      where: { review: { userId: "user-1" }, isCorrect: true },
    });
  });

  it("product analytics computes distribution and aggregates", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", name: "Widget", category: "tools", brand: null });
    const res = await request(app()).get("/api/analytics/products/p1");
    expect(res.status).toBe(200);
    expect(res.body.totalReviews).toBe(1);
    expect(res.body.distribution[7]).toBe(1);
    expect(res.body.distribution.reduce((a: number, b: number) => a + b, 0)).toBe(1);
    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productId: "p1", deletedAt: null, status: "PUBLISHED" } })
    );
  });

  it("404s for unknown products", async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null);
    const res = await request(app()).get("/api/analytics/products/nope");
    expect(res.status).toBe(404);
  });
});
