import { Router } from "express";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { z } from "zod";

const MAX_COMMENT_LENGTH = 280;

const LimitSchema = z.coerce.number().int().min(1).max(50).default(10);

const CreateCommentSchema = z.object({
  text: z.string().min(1).max(MAX_COMMENT_LENGTH),
  parentId: z.string().uuid().optional(),
});

export const commentsRouter = Router();

commentsRouter.get("/reviews/:reviewId/comments", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const reviewId = req.params.reviewId;
    const limit = LimitSchema.parse(req.query.limit);

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

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { userId: true, allowComments: true },
    });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    if (!review.allowComments) {
      res.status(403).json({ error: "Comments are turned off for this review" });
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
      const actorName = req.user!.displayName || req.user!.username || "Someone";
      await prisma.notification.create({
        data: {
          userId: review.userId,
          type: "COMMENT",
          title: "New comment",
          body: `${actorName} commented on your review`,
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
    const result = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({ where: { id: req.params.id } });
      if (!comment) {
        return { status: 404, body: { error: "Comment not found" } };
      }
      if (comment.userId !== req.user!.id) {
        return { status: 403, body: { error: "Forbidden" } };
      }
      if (comment.deletedAt) {
        return { status: 204, body: null };
      }

      await tx.comment.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date(), text: "[deleted]" },
      });

      // Soft-delete nested replies so they no longer appear.
      await tx.comment.updateMany({
        where: { parentId: comment.id, deletedAt: null },
        data: { deletedAt: new Date(), text: "[deleted]" },
      });

      const replyCount = await tx.comment.count({
        where: { parentId: comment.id },
      });

      await tx.review.update({
        where: { id: comment.reviewId },
        data: { commentCount: { decrement: 1 + replyCount } },
      });

      return { status: 204, body: null };
    });

    res.status(result.status).send(result.body);
  } catch (err) {
    next(err);
  }
});
