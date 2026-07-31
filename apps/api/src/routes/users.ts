import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const usersRouter = Router();

const LimitSchema = z.coerce.number().int().min(1).max(50).default(10);

usersRouter.patch("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0, 50) : undefined;
    const bio = typeof req.body?.bio === "string" ? req.body.bio.trim().slice(0, 160) : undefined;
    if (displayName === undefined && bio === undefined) {
      res.status(400).json({ error: "Provide displayName and/or bio" });
      return;
    }
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(displayName !== undefined ? { displayName: displayName || null } : {}),
        ...(bio !== undefined ? { bio: bio || null } : {}),
      },
      select: { id: true, displayName: true, bio: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

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
        _count: { select: { reviews: { where: { deletedAt: null } }, followers: true, following: true } },
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
    const limit = LimitSchema.parse(req.query.limit);
    const isOwner = req.user?.id === req.params.id;
    const reviews = await prisma.review.findMany({
      where: {
        userId: req.params.id,
        deletedAt: null,
        // Others only see published reviews; the owner also sees pending ones.
        ...(isOwner ? {} : { status: "PUBLISHED" }),
      },
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

usersRouter.get("/:id/followers", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = LimitSchema.parse(req.query.limit);

    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const followers = await prisma.follow.findMany({
      where: { followingId: req.params.id },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        follower: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const nextCursor = followers.length === limit ? followers[followers.length - 1].id : undefined;

    const viewerId = req.user?.id;
    const users = await Promise.all(
      followers.map(async (f) => {
        const user = f.follower;
        let isFollowing = false;
        if (viewerId && viewerId !== user.id) {
          const follow = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
          });
          isFollowing = !!follow;
        }
        return { ...user, isFollowing };
      })
    );

    res.json({ users, nextCursor });
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id/following", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = LimitSchema.parse(req.query.limit);

    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const following = await prisma.follow.findMany({
      where: { followerId: req.params.id },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        following: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const nextCursor = following.length === limit ? following[following.length - 1].id : undefined;

    const viewerId = req.user?.id;
    const users = await Promise.all(
      following.map(async (f) => {
        const user = f.following;
        let isFollowing = false;
        if (viewerId && viewerId !== user.id) {
          const follow = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
          });
          isFollowing = !!follow;
        }
        return { ...user, isFollowing };
      })
    );

    res.json({ users, nextCursor });
  } catch (err) {
    next(err);
  }
});
