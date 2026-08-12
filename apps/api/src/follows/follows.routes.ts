import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { warmUserProfileCache } from "../feed/feed.service.js";

export const followsRouter = Router();

followsRouter.post("/:userId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const followerId = req.user!.id;
    const followingId = req.params.userId;
    if (followerId === followingId) {
      res.status(400).json({ error: "Cannot follow yourself" });
      return;
    }

    const { isNewFollow } = await prisma.$transaction(async (tx) => {
      const existing = await tx.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
      });

      if (existing) {
        return { isNewFollow: false };
      }

      await tx.follow.create({ data: { followerId, followingId } });
      return { isNewFollow: true };
    });

    if (isNewFollow) {
      const actorName = req.user!.displayName || req.user!.username || "Someone";
      await prisma.notification.create({
        data: {
          userId: followingId,
          type: "FOLLOW",
          title: "New follower",
          body: `${actorName} started following you`,
          data: { followerId },
        },
      });
    }

    warmUserProfileCache(followerId).catch(() => {});
    res.status(201).json({ following: true });
  } catch (err) {
    next(err);
  }
});

followsRouter.delete("/:userId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const followerId = req.user!.id;
    const followingId = req.params.userId;

    await prisma.follow.deleteMany({
      where: { followerId, followingId },
    });

    warmUserProfileCache(followerId).catch(() => {});
    res.json({ following: false });
  } catch (err) {
    next(err);
  }
});
