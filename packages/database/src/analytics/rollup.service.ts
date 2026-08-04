import { prisma } from "../client.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DashboardData {
  cohorts: RetentionCohort[];
  kFactor: number | null;
  shareRate: number | null;
  streakEstablishment: number | null;
  funnel: FunnelData;
}

export interface RetentionCohort {
  date: string; // signup date
  signups: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

export interface FunnelData {
  dates: string[];
  opened: number[];
  firstRound: number[];
  d7Return: number[];
}

/**
 * Run the nightly rollup for a single calendar day (default yesterday so the
 * full day's events are available). Writes MetricSnapshot rows for retention,
 * K-factor, share rate, and streak establishment.
 */
export async function runDailyRollup(date?: Date): Promise<void> {
  const target = toDate(date ?? new Date(Date.now() - DAY_MS));

  const [
    retentionD1,
    retentionD7,
    retentionD30,
    kFactor,
    shareRate,
    streakEstablishment,
    funnelAppOpen,
    funnelFirstRound,
    funnelD7Return,
  ] = await Promise.all([
    computeRetention(target, 1),
    computeRetention(target, 7),
    computeRetention(target, 30),
    computeKFactor(target),
    computeShareRate(target),
    computeStreakEstablishment(target),
    computeFunnelAppOpen(target),
    computeFunnelFirstRound(target),
    computeFunnelD7Return(target),
  ]);

  await upsertSnapshot(target, "retention", "d1", retentionD1);
  await upsertSnapshot(target, "retention", "d7", retentionD7);
  await upsertSnapshot(target, "retention", "d30", retentionD30);
  await upsertSnapshot(target, "k_factor", "", kFactor);
  await upsertSnapshot(target, "share_rate", "", shareRate);
  await upsertSnapshot(target, "streak_establishment", "", streakEstablishment);
  await upsertSnapshot(target, "funnel_app_open", "", funnelAppOpen);
  await upsertSnapshot(target, "funnel_first_round", "", funnelFirstRound);
  await upsertSnapshot(target, "funnel_d7_return", "", funnelD7Return);
}

export async function getDashboardData(days = 30): Promise<DashboardData> {
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);

  const [cohorts, kFactor, shareRate, streakEstablishment, funnel] = await Promise.all([
    getRetentionCohorts(since),
    getLatestSnapshotValue("k_factor", since),
    getLatestSnapshotValue("share_rate", since),
    getLatestSnapshotValue("streak_establishment", since),
    getFunnelData(since),
  ]);

  return {
    cohorts,
    kFactor,
    shareRate,
    streakEstablishment,
    funnel,
  };
}

async function computeRetention(signupDate: Date, dayOffset: number): Promise<{ value: number; sampleSize: number }> {
  const start = new Date(signupDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS);

  const activityStart = new Date(start.getTime() + dayOffset * DAY_MS);
  const activityEnd = new Date(activityStart.getTime() + DAY_MS);

  const signups = await prisma.user.count({
    where: { createdAt: { gte: start, lt: end }, deletedAt: null },
  });

  if (signups === 0) return { value: 0, sampleSize: 0 };

  const cohortUserIds = await prisma.user
    .findMany({
      where: { createdAt: { gte: start, lt: end }, deletedAt: null },
      select: { id: true },
    })
    .then((rows) => rows.map((r) => r.id));

  const activeRows = await prisma.event.groupBy({
    by: ["userId"],
    where: {
      userId: { in: cohortUserIds },
      createdAt: { gte: activityStart, lt: activityEnd },
      type: { in: ["app_open", "guess_submitted", "daily_drop_played"] },
    },
    _count: true,
  });

  return { value: activeRows.length / signups, sampleSize: signups };
}

async function computeKFactor(date: Date): Promise<{ value: number; sampleSize: number }> {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS);

  const [invitesSent, installs] = await Promise.all([
    prisma.event.count({
      where: { type: "challenge_sent", createdAt: { gte: start, lt: end } },
    }),
    prisma.event.count({
      where: { type: "invite_install_attributed", createdAt: { gte: start, lt: end } },
    }),
  ]);

  // K-factor = installs attributed / invites sent. If no invites sent, report 0.
  const value = invitesSent > 0 ? installs / invitesSent : 0;
  return { value, sampleSize: invitesSent + installs };
}

async function computeShareRate(date: Date): Promise<{ value: number; sampleSize: number }> {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS);

  const [players, sharers] = await Promise.all([
    prisma.event.groupBy({
      by: ["userId"],
      where: {
        userId: { not: null },
        createdAt: { gte: start, lt: end },
        type: { in: ["app_open", "guess_submitted", "daily_drop_played"] },
      },
      _count: true,
    }),
    prisma.event.groupBy({
      by: ["userId"],
      where: { type: "share_card_created", createdAt: { gte: start, lt: end }, userId: { not: null } },
      _count: true,
    }),
  ]);

  return { value: players.length > 0 ? sharers.length / players.length : 0, sampleSize: players.length };
}

async function computeStreakEstablishment(date: Date): Promise<{ value: number; sampleSize: number }> {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS);
  const cutoff = new Date(start.getTime() + 14 * DAY_MS);

  const signups = await prisma.user.count({
    where: { createdAt: { gte: start, lt: end }, deletedAt: null },
  });

  if (signups === 0) return { value: 0, sampleSize: 0 };

  const cohortUserIds = await prisma.user
    .findMany({
      where: { createdAt: { gte: start, lt: end }, deletedAt: null },
      select: { id: true },
    })
    .then((rows) => rows.map((r) => r.id));

  const streakRows = await prisma.event.groupBy({
    by: ["userId"],
    where: {
      type: "streak_milestone",
      userId: { in: cohortUserIds },
      createdAt: { gte: start, lt: cutoff },
      properties: { path: ["milestone"], equals: 7 },
    },
    _count: true,
  });

  return { value: streakRows.length / signups, sampleSize: signups };
}

async function computeFunnelAppOpen(date: Date): Promise<{ value: number; sampleSize: number }> {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS);

  const rows = await prisma.event.groupBy({
    by: ["userId"],
    where: { type: "app_open", userId: { not: null }, createdAt: { gte: start, lt: end } },
    _count: true,
  });
  const value = rows.length;
  return { value, sampleSize: value };
}

async function computeFunnelFirstRound(date: Date): Promise<{ value: number; sampleSize: number }> {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS);

  const rows = await prisma.event.groupBy({
    by: ["userId"],
    where: { type: "first_round_complete", userId: { not: null }, createdAt: { gte: start, lt: end } },
    _count: true,
  });
  const value = rows.length;
  return { value, sampleSize: value };
}

async function computeFunnelD7Return(date: Date): Promise<{ value: number; sampleSize: number }> {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS);
  const priorStart = new Date(start.getTime() - 7 * DAY_MS);
  const priorEnd = new Date(priorStart.getTime() + DAY_MS);

  const currentRows = await prisma.event.groupBy({
    by: ["userId"],
    where: { type: "app_open", userId: { not: null }, createdAt: { gte: start, lt: end } },
    _count: true,
  });

  if (currentRows.length === 0) return { value: 0, sampleSize: 0 };

  const userIds = currentRows.map((r) => r.userId).filter(Boolean) as string[];
  const returningRows = await prisma.event.groupBy({
    by: ["userId"],
    where: {
      type: "app_open",
      userId: { in: userIds },
      createdAt: { gte: priorStart, lt: priorEnd },
    },
    _count: true,
  });

  const value = returningRows.length;
  return { value, sampleSize: value };
}

async function upsertSnapshot(
  date: Date,
  metric: string,
  dimension: string,
  data: { value: number; sampleSize: number }
): Promise<void> {
  await prisma.metricSnapshot.upsert({
    where: { date_metric_dimension: { date, metric, dimension } },
    update: { value: data.value, sampleSize: data.sampleSize },
    create: { date, metric, dimension, value: data.value, sampleSize: data.sampleSize },
  });
}

async function getRetentionCohorts(since: Date): Promise<RetentionCohort[]> {
  const rows = await prisma.metricSnapshot.findMany({
    where: { metric: "retention", date: { gte: since } },
    orderBy: { date: "desc" },
  });

  const byDate = new Map<string, { signups: number; d1?: number; d7?: number; d30?: number }>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    if (!byDate.has(key)) {
      byDate.set(key, { signups: row.sampleSize });
    }
    const entry = byDate.get(key)!;
    if (row.dimension === "d1") entry.d1 = row.value;
    if (row.dimension === "d7") entry.d7 = row.value;
    if (row.dimension === "d30") entry.d30 = row.value;
  }

  return Array.from(byDate.entries()).map(([date, entry]) => ({
    date,
    signups: entry.signups,
    d1: entry.d1 ?? null,
    d7: entry.d7 ?? null,
    d30: entry.d30 ?? null,
  }));
}

async function getLatestSnapshotValue(metric: string, since: Date): Promise<number | null> {
  const row = await prisma.metricSnapshot.findFirst({
    where: { metric, date: { gte: since } },
    orderBy: { date: "desc" },
  });
  return row?.value ?? null;
}

async function getFunnelData(since: Date): Promise<FunnelData> {
  const rows = await prisma.metricSnapshot.findMany({
    where: {
      metric: { in: ["funnel_app_open", "funnel_first_round", "funnel_d7_return"] },
      date: { gte: since },
    },
    orderBy: { date: "asc" },
  });

  const byDate = new Map<
    string,
    { opened?: number; firstRound?: number; d7Return?: number }
  >();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    if (!byDate.has(key)) {
      byDate.set(key, {});
    }
    const entry = byDate.get(key)!;
    if (row.metric === "funnel_app_open") entry.opened = row.value;
    if (row.metric === "funnel_first_round") entry.firstRound = row.value;
    if (row.metric === "funnel_d7_return") entry.d7Return = row.value;
  }

  const days: string[] = [];
  const opened: number[] = [];
  const firstRound: number[] = [];
  const d7Return: number[] = [];

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  for (let d = new Date(since); d <= now; d = new Date(d.getTime() + DAY_MS)) {
    const dayLabel = d.toISOString().slice(0, 10);
    const entry = byDate.get(dayLabel) ?? {};
    days.push(dayLabel);
    opened.push(entry.opened ?? 0);
    firstRound.push(entry.firstRound ?? 0);
    d7Return.push(entry.d7Return ?? 0);
  }

  return { dates: days, opened, firstRound, d7Return };
}

function toDate(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}
