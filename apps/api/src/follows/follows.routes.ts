import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const followsRouter = Router();

followsRouter.post("/:userId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const followerId = req.user!.id;
    const followingId = req.params.userId;
    if (followerId === followingId) {
      res.status(400).json({ error: "Cannot follow yourself" });
      return;
    }

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    });

    await prisma.notification.create({
      data: {
        userId: followingId,
        type: "FOLLOW",
        title: "New follower",
        body: `${req.user!.email} started following you`,
        data: { followerId },
      },
    });

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

    res.json({ following: false });
  } catch (err) {
    next(err);
  }
});
