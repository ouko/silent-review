import { Prisma } from "@silent-review/database";
import { prisma } from "../prisma.js";

export const STREAK_MILESTONES = [
  { days: 7, slug: "streak_7", name: "Week Warrior" },
  { days: 30, slug: "streak_30", name: "Month Master" },
  { days: 100, slug: "streak_100", name: "Century Streak" },
  { days: 365, slug: "streak_365", name: "Year Legend" },
] as const;

const STREAK_MILESTONE_POINTS: Record<number, number> = {
  7: 50,
  30: 100,
  100: 250,
  365: 1000,
};

export interface MilestoneAward {
  slug: string;
  name: string;
  streakDays: number;
}

export async function ensureAchievements(): Promise<void> {
  for (const m of STREAK_MILESTONES) {
    await prisma.achievement.upsert({
      where: { slug: m.slug },
      create: {
        slug: m.slug,
        name: m.name,
        description: `Maintained a ${m.days}-day streak`,
        points: STREAK_MILESTONE_POINTS[m.days],
      },
      update: {},
    });
  }
}

export async function checkStreakMilestones(
  userId: string,
  streakDays: number
): Promise<MilestoneAward[]> {
  await ensureAchievements();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalPoints: true },
  });
  if (!user) throw new Error("User not found");

  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievement: { select: { slug: true } } },
  });
  const unlockedSlugs = new Set(unlocked.map((u) => u.achievement.slug));

  return prisma.$transaction(async (tx) => {
    const newlyUnlocked: MilestoneAward[] = [];
    const notifications: {
      userId: string;
      type: "ACHIEVEMENT";
      title: string;
      body: string;
      data: any;
    }[] = [];

    for (const m of STREAK_MILESTONES) {
      if (streakDays >= m.days && !unlockedSlugs.has(m.slug)) {
        const achievement = await tx.achievement.findUnique({
          where: { slug: m.slug },
        });
        if (!achievement) continue;
        try {
          await tx.userAchievement.create({
            data: { userId, achievementId: achievement.id },
          });
          await tx.user.update({
            where: { id: userId },
            data: { totalPoints: { increment: achievement.points } },
          });
          newlyUnlocked.push({
            slug: achievement.slug,
            name: achievement.name,
            streakDays: m.days,
          });
          notifications.push({
            userId,
            type: "ACHIEVEMENT",
            title: `🔥 ${m.days}-day streak!`,
            body: `You earned the ${achievement.name} badge.`,
            data: { achievementSlug: achievement.slug, streakDays: m.days },
          });
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            // idempotent race
            continue;
          }
          throw err;
        }
      }
    }

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    return newlyUnlocked;
  });
}
