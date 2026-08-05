import { prisma } from "../prisma.js"
import { scheduleDailyDrops } from "./dailydrop.service.js"
import { scheduleDailyLiveNotifications } from "../notifications/notificationScheduler.js"

export { scheduleDailyDrops }

const DAY_MS = 24 * 60 * 60 * 1000

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
  const today = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
      0,
      0,
      0,
      0
    )
  )

  const dailyDrop = await prisma.dailyDrop.findUnique({
    where: { date: today },
    select: { id: true },
  })
  if (!dailyDrop) return

  const activeSince = new Date(Date.now() - 30 * DAY_MS)
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      lastActiveAt: { not: null, gte: activeSince },
    },
    select: { id: true, lastActiveAt: true },
  })

  const result = await scheduleDailyLiveNotifications(dailyDrop.id, users)
  console.log(`[dailydrop] scheduled ${result.created} daily-live notifications`)
}
