import { Router } from "express";
import { prisma } from "../prisma.js";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const feedRouter = Router();

feedRouter.get("/", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 10), 50);

    const reviews = await prisma.review.findMany({
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { likes: true, comments: true, guesses: true } },
      },
    });

    const nextCursor = reviews.length === limit ? reviews[reviews.length - 1].id : undefined;

    const mapped = reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      user: { ...r.user },
      counts: r._count,
    }));

    res.json({ reviews: mapped, nextCursor });
  } catch (err) {
    next(err);
  }
});
