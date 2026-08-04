import { prisma } from "../src/client.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = 90;
const USERS = 300;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(p: number): boolean {
  return Math.random() < p;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toDate(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

async function main() {
  console.log("Cleaning previous analytics seed data...");
  await prisma.event.deleteMany({});
  await prisma.metricSnapshot.deleteMany({});

  const now = new Date();
  const start = new Date(now.getTime() - DAYS * DAY_MS);

  console.log(`Creating ${USERS} synthetic users...`);
  const users: { id: string; createdAt: Date }[] = [];
  for (let i = 0; i < USERS; i++) {
    const createdAt = randomDate(start, now);
    const user = await prisma.user.create({
      data: {
        email: `analytics-${Date.now()}-${i}@silentreview.app`,
        username: `analyticuser${Date.now()}${i}`,
        passwordHash: "sealed",
        createdAt,
        lastActiveAt: createdAt,
      },
    });
    users.push({ id: user.id, createdAt });
  }

  const channels = ["organic", "challenge_link", "result_card", "creator_link"] as const;
  const events: {
    type: string;
    userId: string;
    sessionId: string;
    channel: string;
    properties: Record<string, unknown>;
    createdAt: Date;
  }[] = [];

  console.log("Simulating events...");
  for (const user of users) {
    const channel = sample(channels);
    const signupDay = toDate(user.createdAt);
    const sessionId = `sess-${user.id.slice(0, 8)}`;

    // Attributed installs for users who came through a share or challenge link.
    if (channel !== "organic" && chance(0.6)) {
      events.push({
        type: "invite_install_attributed",
        userId: user.id,
        sessionId,
        channel,
        properties: { source: channel },
        createdAt: new Date(user.createdAt.getTime() + randomInt(0, 60_000)),
      });
    }

    // Simulate daily activity with decaying retention.
    let firstRoundDone = false;
    let activeDays = 0;
    let streak = 0;
    let maxStreak = 0;

    for (let dayOffset = 0; dayOffset <= DAYS; dayOffset++) {
      const dayStart = new Date(signupDay.getTime() + dayOffset * DAY_MS);
      if (dayStart > now) break;

      // Retention probability: high D1, then decay.
      let activeProbability = dayOffset === 0 ? 1 : 0.35 * Math.pow(0.85, dayOffset);
      if (streak > 0) activeProbability += 0.15; // streak users return more
      if (activeProbability > 1) activeProbability = 1;

      if (!chance(activeProbability)) {
        streak = 0;
        continue;
      }

      activeDays++;
      streak++;
      if (streak > maxStreak) maxStreak = streak;

      const sessionEvents = randomInt(1, 4);
      for (let s = 0; s < sessionEvents; s++) {
        const eventTime = new Date(dayStart.getTime() + randomInt(0, DAY_MS - 1));
        events.push({
          type: "app_open",
          userId: user.id,
          sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
          channel,
          properties: { dayOffset },
          createdAt: eventTime,
        });

        if (!firstRoundDone) {
          events.push({
            type: "first_round_complete",
            userId: user.id,
            sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
            channel,
            properties: { dayOffset },
            createdAt: new Date(eventTime.getTime() + randomInt(5_000, 30_000)),
          });
          firstRoundDone = true;
        }

        // 1-3 guesses per session.
        const guesses = randomInt(1, 3);
        for (let g = 0; g < guesses; g++) {
          events.push({
            type: "guess_submitted",
            userId: user.id,
            sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
            channel,
            properties: { score: sample([10, 5, 5, 2, 2, 0]) },
            createdAt: new Date(eventTime.getTime() + randomInt(30_000, 120_000) + g * 10_000),
          });
        }

        // Daily drop is less frequent.
        if (chance(0.3)) {
          events.push({
            type: "daily_drop_played",
            userId: user.id,
            sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
            channel,
            properties: {},
            createdAt: new Date(eventTime.getTime() + randomInt(60_000, 180_000)),
          });
        }

        // Shares are infrequent.
        if (chance(0.08)) {
          events.push({
            type: "share_card_created",
            userId: user.id,
            sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
            channel,
            properties: { platform: sample(["tiktok", "copy", "native", "download"]) },
            createdAt: new Date(eventTime.getTime() + randomInt(60_000, 180_000)),
          });
          if (chance(0.7)) {
            events.push({
              type: "share_card_clicked",
              userId: user.id,
              sessionId: `${sessionId}-${dateKey(dayStart)}-${s}`,
              channel,
              properties: { platform: sample(["copy", "native"]) },
              createdAt: new Date(eventTime.getTime() + randomInt(60_000, 180_000) + 5_000),
            });
          }
        }
      }

      // Streak milestone at 7 days (within 14 days of signup target).
      if (streak === 7 && dayOffset <= 13) {
        events.push({
          type: "streak_milestone",
          userId: user.id,
          sessionId,
          channel,
          properties: { milestone: 7, streakDays: streak },
          createdAt: new Date(dayStart.getTime() + randomInt(0, DAY_MS - 1)),
        });
      }
    }

    // Challenge activity for a subset of users.
    if (chance(0.25)) {
      events.push({
        type: "challenge_sent",
        userId: user.id,
        sessionId,
        channel,
        properties: {},
        createdAt: new Date(user.createdAt.getTime() + randomInt(1 * DAY_MS, 7 * DAY_MS)),
      });
    }
    if (chance(0.15)) {
      events.push({
        type: "challenge_accepted",
        userId: user.id,
        sessionId,
        channel,
        properties: {},
        createdAt: new Date(user.createdAt.getTime() + randomInt(1 * DAY_MS, 14 * DAY_MS)),
      });
    }

    // Update denormalized stats.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        streakDays: maxStreak,
        longestStreak: maxStreak,
        lastActiveAt: new Date(user.createdAt.getTime() + activeDays * DAY_MS),
      },
    });
  }

  console.log(`Inserting ${events.length} events...`);
  // Batch insert in chunks to avoid parameter limits.
  const chunkSize = 1000;
  for (let i = 0; i < events.length; i += chunkSize) {
    const chunk = events.slice(i, i + chunkSize);
    await prisma.event.createMany({ data: chunk });
  }

  console.log("Running nightly rollup for last 90 days...");
  const { runDailyRollup } = await import("../../../apps/api/src/analytics/rollup.service.js");
  for (let d = 0; d < DAYS; d++) {
    const date = new Date(start.getTime() + d * DAY_MS);
    await runDailyRollup(date);
  }

  console.log("Done. Dashboard should now show cohorts and metrics.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
