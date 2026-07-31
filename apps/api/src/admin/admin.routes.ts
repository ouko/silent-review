import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { clearFeedCache } from "../upload/moderationQueue.js";

/**
 * Bare-minimum admin platform:
 * - stats overview
 * - moderation approval queue (reviews stuck UNDER_REVIEW)
 * - user management (ban/unban bad actors; banning soft-deletes the user,
 *   which requireAuth already blocks from using the app)
 */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const [users, bannedUsers, publishedReviews, pendingModeration] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: { not: null } } }),
      prisma.review.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
      prisma.review.count({ where: { deletedAt: null, status: "UNDER_REVIEW" } }),
    ]);
    res.json({ users, bannedUsers, publishedReviews, pendingModeration });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/moderation", async (_req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { deletedAt: null, status: "UNDER_REVIEW" },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        product: { select: { id: true, name: true } },
        videoModeration: { select: { status: true, reasons: true, score: true } },
      },
    });
    res.json({
      reviews: reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/moderation/:id/approve", async (req, res, next) => {
  try {
    const result = await prisma.review.updateMany({
      where: { id: req.params.id, deletedAt: null, status: "UNDER_REVIEW" },
      data: { status: "PUBLISHED" },
    });
    if (result.count === 0) {
      res.status(404).json({ error: "Pending review not found" });
      return;
    }
    await clearFeedCache();
    res.json({ status: "PUBLISHED" });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/moderation/:id/reject", async (req, res, next) => {
  try {
    const result = await prisma.review.updateMany({
      where: { id: req.params.id, deletedAt: null, status: "UNDER_REVIEW" },
      data: { status: "HIDDEN", deletedAt: new Date() },
    });
    if (result.count === 0) {
      res.status(404).json({ error: "Pending review not found" });
      return;
    }
    await clearFeedCache();
    res.json({ status: "REJECTED" });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/users", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 20,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        deletedAt: true,
        _count: { select: { reviews: { where: { deletedAt: null } }, followers: true } },
      },
    });
    const nextCursor = users.length === 20 ? users[users.length - 1].id : undefined;
    res.json({
      users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString(), banned: !!u.deletedAt })),
      nextCursor,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/users/:id/ban", async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: "You cannot ban yourself" });
      return;
    }
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { role: true },
    });
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.role === "ADMIN") {
      res.status(400).json({ error: "You cannot ban an admin" });
      return;
    }
    await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ status: "banned" });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/users/:id/unban", async (req, res, next) => {
  try {
    const result = await prisma.user.updateMany({
      where: { id: req.params.id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    if (result.count === 0) {
      res.status(404).json({ error: "Banned user not found" });
      return;
    }
    res.json({ status: "unbanned" });
  } catch (err) {
    next(err);
  }
});
