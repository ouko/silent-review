import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";

const mockRole = { value: "ADMIN" };

type AnyMock = jest.Mock<(...args: any[]) => Promise<any>>;

const mockPrisma = {
  user: {
    count: jest.fn() as AnyMock,
    findMany: jest.fn() as AnyMock,
    findUnique: jest.fn() as AnyMock,
    update: jest.fn() as AnyMock,
    updateMany: jest.fn() as AnyMock,
  },
  review: {
    count: jest.fn() as AnyMock,
    findMany: jest.fn() as AnyMock,
    updateMany: jest.fn() as AnyMock,
  },
};
const mockClearFeedCache = jest.fn<() => Promise<void>>();

jest.unstable_mockModule("../prisma.js", () => ({ prisma: mockPrisma }));
jest.unstable_mockModule("../middleware/auth.js", () => ({
  requireAuth: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: "admin-1", email: "admin@example.com", role: mockRole.value };
    next();
  },
  requireRole:
    (...roles: string[]) =>
    (req: { user?: { role: string } }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    },
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  signAccessToken: jest.fn(),
  findUserById: jest.fn(),
}));
jest.unstable_mockModule("../upload/moderationQueue.js", () => ({
  clearFeedCache: mockClearFeedCache,
}));

const { adminRouter } = await import("./admin.routes.js");
const { default: express } = await import("express");

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api/admin", adminRouter);
  return a;
}

describe("admin routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole.value = "ADMIN";
    mockPrisma.user.count.mockResolvedValue(10);
    mockPrisma.review.count.mockResolvedValue(5);
    mockClearFeedCache.mockResolvedValue(undefined);
  });

  it("rejects non-admin callers with 403", async () => {
    mockRole.value = "USER";
    const res = await request(app()).get("/api/admin/stats");
    expect(res.status).toBe(403);
  });

  it("returns stats", async () => {
    const res = await request(app()).get("/api/admin/stats");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ users: 10, bannedUsers: 10, publishedReviews: 5, pendingModeration: 5 });
  });

  it("lists pending moderation reviews", async () => {
    const createdAt = new Date();
    mockPrisma.review.findMany.mockResolvedValue([
      { id: "r1", videoUrl: "/uploads/a.mp4", caption: "c", createdAt, updatedAt: createdAt, user: {}, product: {}, videoModeration: { status: "REVIEW", reasons: ["x"], score: 0.7 } },
    ]);
    const res = await request(app()).get("/api/admin/moderation");
    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, status: "UNDER_REVIEW" } })
    );
  });

  it("approves a pending review and clears the feed cache", async () => {
    mockPrisma.review.updateMany.mockResolvedValue({ count: 1 });
    const res = await request(app()).post("/api/admin/moderation/r1/approve");
    expect(res.status).toBe(200);
    expect(mockPrisma.review.updateMany).toHaveBeenCalledWith({
      where: { id: "r1", deletedAt: null, status: "UNDER_REVIEW" },
      data: { status: "PUBLISHED" },
    });
    expect(mockClearFeedCache).toHaveBeenCalled();
  });

  it("404s approving a review that is not pending", async () => {
    mockPrisma.review.updateMany.mockResolvedValue({ count: 0 });
    const res = await request(app()).post("/api/admin/moderation/r1/approve");
    expect(res.status).toBe(404);
  });

  it("rejects a pending review (soft delete)", async () => {
    mockPrisma.review.updateMany.mockResolvedValue({ count: 1 });
    const res = await request(app()).post("/api/admin/moderation/r1/reject");
    expect(res.status).toBe(200);
    expect(mockPrisma.review.updateMany).toHaveBeenCalledWith({
      where: { id: "r1", deletedAt: null, status: "UNDER_REVIEW" },
      data: { status: "HIDDEN", deletedAt: expect.any(Date) },
    });
  });

  it("lists users with banned flag", async () => {
    const createdAt = new Date();
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "u1", email: "a@b.c", username: "a", displayName: null, avatarUrl: null, role: "USER", createdAt, deletedAt: createdAt, _count: { reviews: 2, followers: 1 } },
    ]);
    const res = await request(app()).get("/api/admin/users?q=a");
    expect(res.status).toBe(200);
    expect(res.body.users[0].banned).toBe(true);
  });

  it("bans a user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "USER" });
    mockPrisma.user.update.mockResolvedValue({});
    const res = await request(app()).post("/api/admin/users/u1/ban");
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("refuses to ban yourself", async () => {
    const res = await request(app()).post("/api/admin/users/admin-1/ban");
    expect(res.status).toBe(400);
  });

  it("refuses to ban another admin", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    const res = await request(app()).post("/api/admin/users/u2/ban");
    expect(res.status).toBe(400);
  });

  it("unbans a banned user", async () => {
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
    const res = await request(app()).post("/api/admin/users/u1/unban");
    expect(res.status).toBe(200);
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  });
});
