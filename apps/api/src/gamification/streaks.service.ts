import { prisma } from "../prisma.js";
import { checkStreakMilestones, type MilestoneAward } from "./milestones.service.js";

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function dayDiffUTC(a: Date, b: Date): number {
  return Math.floor((startOfDayUTC(a).getTime() - startOfDayUTC(b).getTime()) / (1000 * 60 * 60 * 24));
}

export interface StreakUpdate {
  streakDays: number;
  longestStreak: number;
  freezeHeld: number;
  newlyUnlocked: MilestoneAward[];
}

export async function updateStreak(userId: string): Promise<StreakUpdate> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakDays: true, longestStreak: true, lastActiveAt: true, freezeHeld: true, lastFreezeEarnedAt: true },
  });
  if (!user) throw new Error("User not found");

  const now = new Date();
  let streakDays = user.streakDays;
  let longestStreak = user.longestStreak;

  if (!user.lastActiveAt) {
    streakDays = 1;
  } else {
    const diff = dayDiffUTC(now, user.lastActiveAt);
    if (diff === 0) {
      // already counted today
    } else if (diff === 1) {
      streakDays += 1;
    } else {
      streakDays = 1;
    }
  }

  if (streakDays > longestStreak) longestStreak = streakDays;

  const freezeAward = await buildFreezeAward(user, streakDays, now);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      streakDays,
      longestStreak,
      lastActiveAt: now,
      ...(freezeAward ? { freezeHeld: { increment: 1 }, lastFreezeEarnedAt: now } : {}),
    },
    select: { streakDays: true, longestStreak: true, freezeHeld: true },
  });

  const newlyUnlocked = await checkStreakMilestones(userId, updated.streakDays);

  return { ...updated, newlyUnlocked };
}

async function buildFreezeAward(
  user: { freezeHeld: number; lastFreezeEarnedAt: Date | null },
  streakDays: number,
  now: Date
): Promise<boolean> {
  if (user.freezeHeld >= 1) return false;
  if (streakDays <= 0 || streakDays % 5 !== 0) return false;
  if (!user.lastFreezeEarnedAt) return true;
  return startOfDayUTC(user.lastFreezeEarnedAt).getTime() < startOfDayUTC(now).getTime();
}

export async function maybeAwardFreeze(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakDays: true, freezeHeld: true, lastFreezeEarnedAt: true },
  });
  if (!user) return;
  const now = new Date();
  if (await buildFreezeAward(user, user.streakDays, now)) {
    await prisma.user.update({
      where: { id: userId },
      data: { freezeHeld: { increment: 1 }, lastFreezeEarnedAt: now },
    });
  }
}

export async function processMissedStreaks(): Promise<{ protected: number; reset: number }> {
  const now = new Date();
  const startOfToday = startOfDayUTC(now);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  const missedUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      streakDays: { gt: 0 },
      lastActiveAt: { lt: startOfYesterday },
    },
    select: { id: true, streakDays: true, freezeHeld: true },
  });

  const protectedIds: string[] = [];
  const resetIds: string[] = [];

  for (const u of missedUsers) {
    if (u.freezeHeld > 0) protectedIds.push(u.id);
    else resetIds.push(u.id);
  }

  if (protectedIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: protectedIds } },
      data: { freezeHeld: { decrement: 1 }, lastActiveAt: startOfYesterday },
    });
  }
  if (resetIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: resetIds } },
      data: { streakDays: 0 },
    });
  }

  return { protected: protectedIds.length, reset: resetIds.length };
}

export async function notifyStreakAtRisk(): Promise<{ notified: number }> {
  const now = new Date();
  const startOfToday = startOfDayUTC(now);
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const alreadyNotified = await prisma.notification.findMany({
    where: {
      type: "STREAK_AT_RISK",
      createdAt: { gte: startOfToday, lt: startOfTomorrow },
    },
    select: { userId: true },
  });
  const notifiedSet = new Set(alreadyNotified.map((n) => n.userId));

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      streakDays: { gt: 0 },
      lastActiveAt: { lt: startOfToday },
      ...(notifiedSet.size > 0 ? { id: { notIn: [...notifiedSet] } } : {}),
    },
    select: { id: true, streakDays: true },
  });

  if (users.length === 0) return { notified: 0 };

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: "STREAK_AT_RISK" as const,
      title: `Your ${u.streakDays}-day streak ends tonight`,
      body: "Play today's Daily Drop before midnight to keep it alive.",
      data: { streakDays: u.streakDays },
    })),
  });

  return { notified: users.length };
}

function msUntilNextUTC(hour: number): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function scheduleStreakJobs(): void {
  // Nightly job: 00:00 UTC
  setTimeout(() => {
    void runNightlyStreakJob();
    setInterval(() => void runNightlyStreakJob(), DAY_MS);
  }, msUntilNextUTC(0));

  // Evening at-risk job: 18:00 UTC
  setTimeout(() => {
    void runAtRiskJob();
    setInterval(() => void runAtRiskJob(), DAY_MS);
  }, msUntilNextUTC(18));
}

async function runNightlyStreakJob(): Promise<void> {
  try {
    const result = await processMissedStreaks();
    console.log(`[streaks] nightly: ${result.protected} protected, ${result.reset} reset`);
  } catch (err) {
    console.error("[streaks] nightly job failed", err);
  }
}

async function runAtRiskJob(): Promise<void> {
  try {
    const result = await notifyStreakAtRisk();
    console.log(`[streaks] at-risk notifications: ${result.notified}`);
  } catch (err) {
    console.error("[streaks] at-risk job failed", err);
  }
}
