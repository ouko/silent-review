import { prisma } from "../prisma.js";

export type LeaderboardType = "global" | "weekly" | "friends";

export async function getLeaderboard(
  type: LeaderboardType,
  userId: string,
  limit: number
): Promise<{ id: string; username: string; displayName: string | null; avatarUrl: string | null; points: number }[]> {
  let users: { id: string; username: string; displayName: string | null; avatarUrl: string | null; totalPoints: number }[];

  if (type === "friends") {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const ids = [userId, ...following.map((f) => f.followingId)];
    users = await prisma.user.findMany({
      where: { id: { in: ids } },
      orderBy: { totalPoints: "desc" },
      take: limit,
      select: { id: true, username: true, displayName: true, avatarUrl: true, totalPoints: true },
    });
  } else {
    // Weekly falls back to global since we don't store time-bucketed points yet
    users = await prisma.user.findMany({
      orderBy: { totalPoints: "desc" },
      take: limit,
      select: { id: true, username: true, displayName: true, avatarUrl: true, totalPoints: true },
    });
  }

  return users.map((u) => ({ ...u, points: u.totalPoints }));
}
