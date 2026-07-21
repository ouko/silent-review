import { Router } from "express";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { z } from "zod";

const MAX_COMMENT_LENGTH = 280;

const CreateCommentSchema = z.object({
  text: z.string().min(1).max(MAX_COMMENT_LENGTH),
  parentId: z.string().uuid().optional(),
});

export const commentsRouter = Router();

commentsRouter.get("/reviews/:reviewId/comments", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const reviewId = req.params.reviewId;
    const limit = Math.min(Number(req.query.limit ?? 50), 100);

    const comments = await prisma.comment.findMany({
      where: { reviewId, parentId: null, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    res.json({
      comments: comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        replies: c.replies.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      })),
    });
  } catch (err) {
    next(err);
  }
});

commentsRouter.post("/reviews/:reviewId/comments", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const reviewId = req.params.reviewId;
    const { text, parentId } = CreateCommentSchema.parse(req.body);

    const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { userId: true } });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    const comment = await prisma.comment.create({
      data: { reviewId, userId: req.user!.id, text, parentId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await prisma.review.update({ where: { id: reviewId }, data: { commentCount: { increment: 1 } } });

    if (review.userId !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId: review.userId,
          type: "COMMENT",
          title: "New comment",
          body: `${req.user!.email} commented on your review`,
          data: { reviewId, commentId: comment.id },
        },
      });
    }

    res.status(201).json({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

commentsRouter.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    if (comment.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await prisma.comment.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), text: "[deleted]" },
    });

    await prisma.review.update({
      where: { id: comment.reviewId },
      data: { commentCount: { decrement: 1 } },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
