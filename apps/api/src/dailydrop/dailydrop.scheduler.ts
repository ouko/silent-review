import { prisma } from "../prisma.js"
import { scheduleDailyDrops } from "./dailydrop.service.js"

export { scheduleDailyDrops }

const DAY_MS = 24 * 60 * 60 * 1000

function toUTCDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  )
}

function msUntilNextMidnightUTC(): number {
  const now = new Date()
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  )
  return next.getTime() - now.getTime()
}

/**
 * Start the Daily Drop scheduler.
 *
 * On startup we immediately backfill future dates so the game never runs empty
 * after a deploy. At midnight UTC each day we schedule 90 days ahead and notify
 * active users that a new drop is live.
 */
export function startDailyDropScheduler(): void {
  // Backfill silently; notifications are only sent at the true midnight flip.
  void scheduleDailyDrops(90).catch((err) => {
    console.error("[dailydrop] initial scheduling failed", err)
  })

  setTimeout(() => {
    void runOnce()
    setInterval(() => void runOnce(), DAY_MS)
  }, msUntilNextMidnightUTC())
}

async function runOnce(): Promise<void> {
  try {
    await scheduleDailyDrops(90)
    console.log("[dailydrop] scheduled 90 days ahead")
  } catch (err) {
    console.error("[dailydrop] scheduling failed", err)
  }

  try {
    await notifyDailyDropActive()
  } catch (err) {
    console.error("[dailydrop] notification failed", err)
  }
}

async function notifyDailyDropActive(): Promise<void> {
  const today = toUTCDate(new Date())
  const dailyDrop = await prisma.dailyDrop.findUnique({
    where: { date: today },
    select: { id: true },
  })
  if (!dailyDrop) return

  const startOfToday = today
  const startOfTomorrow = new Date(today.getTime() + DAY_MS)

  const alreadyNotified = await prisma.notification.findMany({
    where: {
      type: "SYSTEM",
      title: "Your daily guess is live",
      createdAt: { gte: startOfToday, lt: startOfTomorrow },
    },
    select: { userId: true },
  })
  const notifiedSet = new Set(alreadyNotified.map((n) => n.userId))

  const activeSince = new Date(Date.now() - 30 * DAY_MS)
  const where: {
    deletedAt: null
    lastActiveAt: { not: null; gte: Date }
    id?: { notIn: string[] }
  } = { deletedAt: null, lastActiveAt: { not: null, gte: activeSince } }

  if (notifiedSet.size > 0) {
    where.id = { notIn: [...notifiedSet] }
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, lastActiveAt: true },
  })

  if (users.length === 0) return

  const data = { dailyDropId: dailyDrop.id }

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: "SYSTEM" as const,
      title: "Your daily guess is live",
      body: "A new Daily Drop is ready for you.",
      data,
    })),
  })

  schedulePushNotifications(users, dailyDrop.id)
}

function schedulePushNotifications(
  users: { id: string; lastActiveAt: Date | null }[],
  dailyDropId: string
): void {
  const now = new Date()
  const groups = new Map<number, string[]>()

  for (const user of users) {
    if (!user.lastActiveAt) continue
    const hour = user.lastActiveAt.getUTCHours()
    const list = groups.get(hour) ?? []
    list.push(user.id)
    groups.set(hour, list)
  }

  for (const [hour, userIds] of groups) {
    const sendAt = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hour,
        0,
        0,
        0
      )
    )
    if (sendAt.getTime() <= now.getTime()) continue

    const ms = sendAt.getTime() - now.getTime()
    setTimeout(() => {
      console.log(
        `[dailydrop] push placeholder for ${userIds.length} users at UTC ${hour}:00 (dailyDrop=${dailyDropId})`
      )
      // OneSignal integration would go here; see apps/web/src/lib/push.ts
    }, ms)
  }
}
