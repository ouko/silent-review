import { prisma } from "../prisma.js";
import { notificationCopy } from "@silent-review/shared/copy.js";
import { getNotificationPreferences } from "./notificationPreferences.service.js";
import type { NotificationType } from "@silent-review/database";

const DAY_MS = 24 * 60 * 60 * 1000;

interface UserWithActiveHour {
  id: string;
  lastActiveAt: Date | null;
}

export interface NotificationJob {
  userIds: string[];
  sendAt: Date;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, unknown>;
}

/**
 * Core scheduler: persists in-app notifications, then groups push delivery by
 * the user's historical active hour. Callers decide which users are eligible
 * and what the copy is; this function handles timing, deduplication, and
 * preference enforcement.
 */
export async function scheduleNotifications(opts: {
  type: NotificationType;
  dedupeKey: string;
  dedupeWindow: { gte: Date; lt: Date };
  candidates: UserWithActiveHour[];
  buildCopy: (userId: string) => { title: string; body: string } | null;
  data: Record<string, unknown>;
  respectPreference?: (prefs: Awaited<ReturnType<typeof getNotificationPreferences>>) => boolean;
}): Promise<{ created: number; scheduled: number }> {
  if (opts.candidates.length === 0) return { created: 0, scheduled: 0 };

  // Find users already notified in this window.
  const alreadyNotified = await prisma.notification.findMany({
    where: {
      type: opts.type,
      createdAt: { gte: opts.dedupeWindow.gte, lt: opts.dedupeWindow.lt },
      data: { path: ["dedupeKey"], equals: opts.dedupeKey },
    },
    select: { userId: true },
  });
  const notifiedSet = new Set(alreadyNotified.map((n) => n.userId));

  const eligible: { user: UserWithActiveHour; copy: { title: string; body: string } }[] = [];
  for (const user of opts.candidates) {
    if (notifiedSet.has(user.id)) continue;
    const copy = opts.buildCopy(user.id);
    if (!copy) continue;

    if (opts.respectPreference) {
      const prefs = await getNotificationPreferences(user.id);
      if (!opts.respectPreference(prefs)) continue;
    }

    eligible.push({ user, copy });
  }

  if (eligible.length === 0) return { created: 0, scheduled: 0 };

  // Persist in-app notifications.
  await prisma.notification.createMany({
    data: eligible.map(({ user, copy }) => ({
      userId: user.id,
      type: opts.type,
      title: copy.title,
      body: copy.body,
      data: { ...opts.data, dedupeKey: opts.dedupeKey },
    })),
  });

  // Group push delivery by historical active hour.
  const jobs = groupPushJobs(eligible, opts.type, opts.data);
  for (const job of jobs) {
    schedulePushJob(job);
  }

  return { created: eligible.length, scheduled: jobs.length };
}

function groupPushJobs(
  eligible: { user: UserWithActiveHour; copy: { title: string; body: string } }[],
  type: NotificationType,
  data: Record<string, unknown>
): NotificationJob[] {
  const groups = new Map<number, string[]>();
  const now = new Date();

  for (const { user } of eligible) {
    if (!user.lastActiveAt) continue;
    const hour = user.lastActiveAt.getUTCHours();
    const list = groups.get(hour) ?? [];
    list.push(user.id);
    groups.set(hour, list);
  }

  const jobs: NotificationJob[] = [];
  for (const [hour, userIds] of groups) {
    const sendAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0)
    );
    if (sendAt.getTime() <= now.getTime()) continue;

    // Use the copy of the first user in the hour group for the push payload.
    // In practice, personalized copy is mostly in the in-app notification; push
    // copy can be the generic variant for the group.
    const sample = eligible.find((e) => e.user.id === userIds[0])!;
    jobs.push({
      userIds,
      sendAt,
      title: sample.copy.title,
      body: sample.copy.body,
      type,
      data,
    });
  }
  return jobs;
}

function schedulePushJob(job: NotificationJob): void {
  const ms = job.sendAt.getTime() - Date.now();
  if (ms <= 0) return;

  setTimeout(() => {
    console.log(
      `[notifications] push placeholder: ${job.type} for ${job.userIds.length} users at ${job.sendAt.toISOString()}`
    );
    // OneSignal / web-push integration replaces this log in production.
  }, ms);
}

/**
 * Schedule the daily-live notification for a new Daily Drop.
 */
export async function scheduleDailyLiveNotifications(
  dailyDropId: string,
  candidates: UserWithActiveHour[]
): Promise<{ created: number; scheduled: number }> {
  const today = toUTCDate(new Date());
  const tomorrow = new Date(today.getTime() + DAY_MS);

  return scheduleNotifications({
    type: "DAILY_DROP",
    dedupeKey: `daily-drop-${dailyDropId}`,
    dedupeWindow: { gte: today, lt: tomorrow },
    candidates,
    buildCopy: () => ({
      title: notificationCopy.dailyDrop.title,
      body: notificationCopy.dailyDrop.body,
    }),
    data: { dailyDropId },
    respectPreference: (prefs) => prefs.dailyLive,
  });
}

/**
 * Schedule streak-at-risk notifications for users who have not completed
 * today's Daily Drop by their historical active hour.
 */
export async function scheduleStreakAtRiskNotifications(): Promise<{
  created: number;
  scheduled: number;
}> {
  const today = toUTCDate(new Date());
  const tomorrow = new Date(today.getTime() + DAY_MS);

  // Active users with a streak > 0 who have not guessed today's Daily Drop.
  const usersWithStreak = await prisma.user.findMany({
    where: {
      deletedAt: null,
      streakDays: { gt: 0 },
      lastActiveAt: { not: null, gte: new Date(Date.now() - 30 * DAY_MS) },
    },
    select: { id: true, streakDays: true, lastActiveAt: true },
  });

  const dailyDrop = await prisma.dailyDrop.findUnique({
    where: { date: today },
    select: { id: true },
  });

  const candidates: UserWithActiveHour[] = [];
  if (dailyDrop) {
    const guessesToday = await prisma.guess.findMany({
      where: { dailyDropId: dailyDrop.id, createdAt: { gte: today, lt: tomorrow } },
      select: { userId: true },
    });
    const guessedSet = new Set(guessesToday.map((g) => g.userId));

    for (const user of usersWithStreak) {
      if (!guessedSet.has(user.id)) {
        candidates.push(user);
      }
    }
  } else {
    candidates.push(...usersWithStreak);
  }

  return scheduleNotifications({
    type: "STREAK_AT_RISK",
    dedupeKey: `streak-risk-${today.toISOString().slice(0, 10)}`,
    dedupeWindow: { gte: today, lt: tomorrow },
    candidates,
    buildCopy: (userId) => {
      const user = usersWithStreak.find((u) => u.id === userId);
      if (!user) return null;
      return {
        title: notificationCopy.streakAtRisk.title(user.streakDays),
        body: notificationCopy.streakAtRisk.body(user.streakDays),
      };
    },
    data: {},
    respectPreference: (prefs) => prefs.streakAtRisk,
  });
}

/**
 * Notify a user that they have been challenged on a specific review.
 */
export async function scheduleChallengeReceivedNotification(
  challenge: {
    id: string;
    challengerId: string;
    challengedId: string | null;
    reviewId: string | null;
  },
  challengerName: string
): Promise<void> {
  if (!challenge.challengedId) return;

  const user = await prisma.user.findUnique({
    where: { id: challenge.challengedId },
    select: { id: true, lastActiveAt: true },
  });
  if (!user) return;

  await scheduleNotifications({
    type: "CHALLENGE_RECEIVED",
    dedupeKey: `challenge-received-${challenge.id}`,
    dedupeWindow: { gte: new Date(Date.now() - DAY_MS), lt: new Date(Date.now() + DAY_MS) },
    candidates: [user],
    buildCopy: () => ({
      title: notificationCopy.challengeReceived.title(challengerName),
      body: notificationCopy.challengeReceived.body,
    }),
    data: { challengeId: challenge.id, reviewId: challenge.reviewId },
    respectPreference: (prefs) => prefs.challengeReceived,
  });
}

/**
 * Notify a user that their score was beaten in a head-to-head challenge.
 */
export async function scheduleScoreBeatenNotification(
  challenge: {
    id: string;
    challengerId: string;
    challengedId: string | null;
    challengerScore: number;
    challengedScore: number;
  },
  beaterName: string
): Promise<void> {
  const beatenUserId = challenge.challengerScore > challenge.challengedScore ? challenge.challengedId : challenge.challengerId;
  if (!beatenUserId) return;

  const user = await prisma.user.findUnique({
    where: { id: beatenUserId },
    select: { id: true, lastActiveAt: true },
  });
  if (!user) return;

  const scoreDiff = Math.abs(challenge.challengerScore - challenge.challengedScore);

  await scheduleNotifications({
    type: "CHALLENGE_BEAT",
    dedupeKey: `score-beaten-${challenge.id}`,
    dedupeWindow: { gte: new Date(Date.now() - DAY_MS), lt: new Date(Date.now() + DAY_MS) },
    candidates: [user],
    buildCopy: () => ({
      title: notificationCopy.scoreBeaten.title(beaterName),
      body: notificationCopy.scoreBeaten.body(scoreDiff),
    }),
    data: { challengeId: challenge.id, scoreDiff },
    respectPreference: (prefs) => prefs.scoreBeaten,
  });
}

function toUTCDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
