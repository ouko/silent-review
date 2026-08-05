import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { getLeaderboard, type LeaderboardType } from "./leaderboards.service.js";
import { prisma } from "../prisma.js";

export const gamificationRouter = Router();

const LeaderboardLimitSchema = z.coerce.number().int().min(1).max(100).default(50);
const LeaderboardTypeSchema = z.enum(["global", "weekly", "friends"]).default("global");

gamificationRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const [user, achievements, rank] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { streakDays: true, longestStreak: true, totalPoints: true, totalReviews: true, totalGuesses: true, freezeHeld: true },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: { select: { slug: true, name: true, description: true, iconUrl: true, points: true } } },
        orderBy: { unlockedAt: "desc" },
      }),
      prisma.user.count({ where: { totalPoints: { gt: 0 } } }),
    ]);

    const usersAbove = await prisma.user.count({ where: { totalPoints: { gt: user?.totalPoints ?? 0 } } });

    res.json({
      streakDays: user?.streakDays ?? 0,
      longestStreak: user?.longestStreak ?? 0,
      freezeHeld: user?.freezeHeld ?? 0,
      totalPoints: user?.totalPoints ?? 0,
      totalReviews: user?.totalReviews ?? 0,
      totalGuesses: user?.totalGuesses ?? 0,
      rank: usersAbove + 1,
      totalRanked: rank,
      achievements: achievements.map((a) => ({
        ...a,
        unlockedAt: a.unlockedAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

gamificationRouter.post("/activity", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
      select: { streakDays: true, longestStreak: true, freezeHeld: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

gamificationRouter.get("/leaderboard", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const type = LeaderboardTypeSchema.parse(req.query.type) as LeaderboardType;
    const limit = LeaderboardLimitSchema.parse(req.query.limit);
    const board = await getLeaderboard(type, req.user!.id, limit);
    res.json({ leaderboard: board });
  } catch (err) {
    next(err);
  }
});
