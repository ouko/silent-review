import { prisma } from "../prisma.js";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayDiff(a: Date, b: Date): number {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / (1000 * 60 * 60 * 24));
}

export async function updateStreak(userId: string): Promise<{ streakDays: number; longestStreak: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakDays: true, longestStreak: true, lastActiveAt: true },
  });
  if (!user) throw new Error("User not found");

  const now = new Date();
  let streakDays = user.streakDays;
  let longestStreak = user.longestStreak;

  if (!user.lastActiveAt) {
    streakDays = 1;
  } else {
    const diff = dayDiff(now, user.lastActiveAt);
    if (diff === 0) {
      // already active today
    } else if (diff === 1) {
      streakDays += 1;
    } else {
      streakDays = 1;
    }
  }

  if (streakDays > longestStreak) longestStreak = streakDays;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { streakDays, longestStreak, lastActiveAt: now },
    select: { streakDays: true, longestStreak: true },
  });

  return updated;
}
