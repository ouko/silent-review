import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { warmUserProfileCache } from "../feed/feed.service.js";

export const likesRouter = Router();

likesRouter.get("/reviews/:reviewId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const reviewId = req.params.reviewId;
    const userId = req.user!.id;
    const like = await prisma.like.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    });
    const count = await prisma.like.count({ where: { reviewId } });
    res.json({ liked: !!like, count });
  } catch (err) {
    next(err);
  }
});

likesRouter.post("/reviews/:reviewId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const reviewId = req.params.reviewId;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { userId: true } });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { userId_reviewId: { userId, reviewId } },
      });

      if (existing) {
        await tx.like.delete({ where: { id: existing.id } });
        await tx.review.update({ where: { id: reviewId }, data: { likeCount: { decrement: 1 } } });
        const count = await tx.like.count({ where: { reviewId } });
        return { liked: false, count, createdNotification: false };
      }

      await tx.like.create({ data: { userId, reviewId } });
      await tx.review.update({ where: { id: reviewId }, data: { likeCount: { increment: 1 } } });
      const count = await tx.like.count({ where: { reviewId } });
      return { liked: true, count, createdNotification: true };
    });

    if (result.liked && review.userId !== userId) {
      const actorName = req.user!.displayName || req.user!.username || "Someone";
      await prisma.notification.create({
        data: {
          userId: review.userId,
          type: "LIKE",
          title: "New like",
          body: `${actorName} liked your review`,
          data: { reviewId, userId },
        },
      });
    }

    warmUserProfileCache(userId).catch(() => {});
    const status = result.liked ? 201 : 200;
    res.status(status).json({ liked: result.liked, count: result.count });
  } catch (err) {
    next(err);
  }
});
