import { Router } from "express";
import { prisma } from "../prisma.js";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        streakDays: true,
        createdAt: true,
        _count: { select: { reviews: true, followers: true, following: true } },
      },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let isFollowing = false;
    if (req.user && req.user.id !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.user.id, followingId: user.id } },
      });
      isFollowing = !!follow;
    }

    res.json({
      ...user,
      createdAt: user.createdAt.toISOString(),
      reviewCount: user._count.reviews,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing,
    });
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id/achievements", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: req.params.id },
      orderBy: { unlockedAt: "desc" },
      include: {
        achievement: { select: { slug: true, name: true, description: true, iconUrl: true, points: true } },
      },
    });
    res.json({
      achievements: achievements.map((a) => ({
        ...a,
        unlockedAt: a.unlockedAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id/reviews", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const reviews = await prisma.review.findMany({
      where: { userId: req.params.id },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true, guesses: true } },
      },
    });
    const nextCursor = reviews.length === limit ? reviews[reviews.length - 1].id : undefined;
    res.json({
      reviews: reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        counts: r._count,
      })),
      nextCursor,
    });
  } catch (err) {
    next(err);
  }
});
