import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";

const mockPrisma = {
  review: {
    findUnique: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>>,
    update: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>>,
  },
  comment: {
    create: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>>,
    findMany: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>>,
  },
  notification: { create: jest.fn() as jest.Mock<(...args: any[]) => Promise<any>> },
};

jest.unstable_mockModule("../prisma.js", () => ({ prisma: mockPrisma }));
jest.unstable_mockModule("../middleware/auth.js", () => ({
  requireAuth: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: "commenter-1", email: "c@example.com", role: "USER" };
    next();
  },
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  signAccessToken: jest.fn(),
  findUserById: jest.fn(),
}));

const { commentsRouter } = await import("./comments.routes.js");
const { default: express } = await import("express");

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api/comments", commentsRouter);
  return a;
}

describe("comment creation with allowComments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.comment.create.mockResolvedValue({
      id: "c1",
      text: "hi",
      user: { id: "commenter-1", username: "c", displayName: null, avatarUrl: null },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.review.update.mockResolvedValue({});
  });

  it("creates a comment when comments are allowed", async () => {
    mockPrisma.review.findUnique.mockResolvedValue({ userId: "owner-1", allowComments: true });
    const res = await request(app())
      .post("/api/comments/reviews/r1/comments")
      .send({ text: "hi" });
    expect(res.status).toBe(201);
    expect(mockPrisma.comment.create).toHaveBeenCalled();
  });

  it("rejects with 403 when the creator turned comments off", async () => {
    mockPrisma.review.findUnique.mockResolvedValue({ userId: "owner-1", allowComments: false });
    const res = await request(app())
      .post("/api/comments/reviews/r1/comments")
      .send({ text: "hi" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/turned off/i);
    expect(mockPrisma.comment.create).not.toHaveBeenCalled();
  });
});
