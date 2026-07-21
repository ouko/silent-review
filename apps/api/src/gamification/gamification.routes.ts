import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { updateStreak } from "./streaks.service.js";
import { checkAchievements } from "./achievements.service.js";
import { getLeaderboard, type LeaderboardType } from "./leaderboards.service.js";
import { prisma } from "../prisma.js";

export const gamificationRouter = Router();

gamificationRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const [user, achievements, rank] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { streakDays: true, longestStreak: true, totalPoints: true, totalReviews: true, totalGuesses: true },
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
    const streak = await updateStreak(req.user!.id);
    const newlyUnlocked = await checkAchievements(req.user!.id);
    res.json({ ...streak, newlyUnlocked });
  } catch (err) {
    next(err);
  }
});

gamificationRouter.get("/leaderboard", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const type = (req.query.type as LeaderboardType) || "global";
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const board = await getLeaderboard(type, req.user!.id, limit);
    res.json({ leaderboard: board });
  } catch (err) {
    next(err);
  }
});
