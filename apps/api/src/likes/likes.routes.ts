import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

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

    const existing = await prisma.like.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      await prisma.review.update({ where: { id: reviewId }, data: { likeCount: { decrement: 1 } } });
      res.json({ liked: false, count: await prisma.like.count({ where: { reviewId } }) });
      return;
    }

    await prisma.like.create({ data: { userId, reviewId } });
    await prisma.review.update({ where: { id: reviewId }, data: { likeCount: { increment: 1 } } });

    if (review.userId !== userId) {
      await prisma.notification.create({
        data: {
          userId: review.userId,
          type: "LIKE",
          title: "New like",
          body: `${req.user!.email} liked your review`,
          data: { reviewId, userId },
        },
      });
    }

    res.status(201).json({ liked: true, count: await prisma.like.count({ where: { reviewId } }) });
  } catch (err) {
    next(err);
  }
});
