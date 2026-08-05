import { prisma } from "../prisma.js"
import { updateStreak } from "../gamification/streaks.service.js"
import { calculateGuessScore } from "../guesses/guesses.service.js"
import { computeGuessabilityScore } from "./guessability.js"
import { getApprovedSchedule } from "../content-curation/contentCuration.service.js"
import { Prisma } from "@silent-review/database"
import type { Guess, Product, Review, User } from "@silent-review/database"

const DAY_MS = 24 * 60 * 60 * 1000

export interface DailyDrop {
  id: string
  date: Date
  reviewId: string
  isOverride: boolean
  createdAt: Date
}

type DailyDropUser = Pick<User, "id" | "username" | "displayName" | "avatarUrl">

export interface DailyDropWithReview extends DailyDrop {
  review: Review & { product: Product; user: DailyDropUser }
}

export interface ArchiveItem {
  id: string
  date: string
  reviewId: string
  thumbnailUrl: string | null
  productTag: string | null
  productName: string
  rating: number
  isOverride: boolean
  played: boolean
}

function toUTCDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  )
}

function formatDate(d: Date): string {
  return toUTCDate(d).toISOString().slice(0, 10)
}

export async function getTodaysDailyDrop(
  userId?: string
): Promise<{ dailyDrop: DailyDropWithReview; alreadyGuessed: boolean } | null> {
  const today = toUTCDate(new Date())

  const dailyDrop = await prisma.dailyDrop.findUnique({
    where: { date: today },
    include: {
      review: {
        include: {
          product: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })

  if (!dailyDrop) {
    return null
  }

  let alreadyGuessed = false
  if (userId) {
    const guess = await prisma.guess.findUnique({
      where: { userId_dailyDropId: { userId, dailyDropId: dailyDrop.id } },
    })
    alreadyGuessed = !!guess
  }

  return { dailyDrop, alreadyGuessed }
}

export async function getDailyDropArchive(opts?: {
  cursor?: string
  limit?: number
  userId?: string
  future?: boolean
}): Promise<{ items: ArchiveItem[]; nextCursor?: string }> {
  const { cursor, limit = 20, userId, future = false } = opts ?? {}
  const today = toUTCDate(new Date())

  const where = future
    ? { date: { gte: today } }
    : { date: { lt: today } }

  const dailyDrops = await prisma.dailyDrop.findMany({
    where,
    orderBy: { date: future ? "asc" : "desc" },
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      review: {
        select: {
          id: true,
          thumbnailUrl: true,
          productTag: true,
          rating: true,
          product: { select: { name: true } },
        },
      },
    },
  })

  let playedIds = new Set<string>()
  if (userId && dailyDrops.length > 0) {
    const userGuesses = await prisma.guess.findMany({
      where: {
        userId,
        dailyDropId: { in: dailyDrops.map((d) => d.id) },
      },
      select: { dailyDropId: true },
    })
    playedIds = new Set(
      userGuesses.map((g) => g.dailyDropId).filter((id): id is string => !!id)
    )
  }

  const hasMore = dailyDrops.length > limit
  const page = hasMore ? dailyDrops.slice(0, limit) : dailyDrops

  const items: ArchiveItem[] = page.map((d) => ({
    id: d.id,
    date: formatDate(d.date),
    reviewId: d.reviewId,
    thumbnailUrl: d.review.thumbnailUrl ?? null,
    productTag: d.review.productTag ?? null,
    productName: d.review.product.name,
    rating: d.review.rating,
    isOverride: d.isOverride,
    played: playedIds.has(d.id),
  }))

  return {
    items,
    nextCursor: hasMore ? page[page.length - 1].id : undefined,
  }
}

export async function submitDailyDropAttempt(
  userId: string,
  dailyDropId: string,
  guessedRating: number
): Promise<{ guess: Guess; score: number; review: Review; streakUpdated: boolean }> {
  const dailyDrop = await prisma.dailyDrop.findUnique({
    where: { id: dailyDropId },
    include: { review: true },
  })

  if (!dailyDrop) {
    throw new Error("Daily Drop not found")
  }

  const review = dailyDrop.review
  if (review.deletedAt) {
    throw new Error("Review unavailable")
  }

  const existingAttempt = await prisma.guess.findUnique({
    where: { userId_dailyDropId: { userId, dailyDropId } },
  })
  if (existingAttempt) {
    const err = new Error("Already played today's Daily Drop")
    ;(err as Error & { statusCode?: number }).statusCode = 409
    throw err
  }

  const existingReviewGuess = await prisma.guess.findUnique({
    where: { userId_reviewId: { userId, reviewId: review.id } },
  })
  if (existingReviewGuess) {
    const err = new Error("Already played this review")
    ;(err as Error & { statusCode?: number }).statusCode = 409
    throw err
  }

  const startOfToday = toUTCDate(new Date())
  const startOfTomorrow = new Date(startOfToday.getTime() + DAY_MS)
  const alreadyPlayedToday = await prisma.guess.findFirst({
    where: {
      userId,
      dailyDropId: { not: null },
      createdAt: { gte: startOfToday, lt: startOfTomorrow },
    },
  })
  const streakUpdated = !alreadyPlayedToday

  const score = calculateGuessScore(review.rating, guessedRating)
  const isCorrect = score === 10

  let guess: Guess
  try {
    guess = await prisma.guess.create({
      data: {
        userId,
        reviewId: review.id,
        dailyDropId,
        guessedRating,
        score,
        isCorrect,
      },
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const friendly = new Error("Already played today's Daily Drop")
      ;(friendly as Error & { statusCode?: number }).statusCode = 409
      throw friendly
    }
    throw err
  }

  const exactGuessCount = await prisma.guess.count({
    where: { reviewId: review.id, isCorrect: true },
  })

  await prisma.review.update({
    where: { id: review.id },
    data: {
      guessCount: { increment: 1 },
      exactGuessCount,
    },
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      totalGuesses: { increment: 1 },
      totalPoints: { increment: score },
    },
  })

  if (streakUpdated) {
    await updateStreak(userId)
  }

  return { guess, score, review, streakUpdated }
}

export async function scheduleDailyDrops(daysAhead = 90): Promise<{ scheduled: number }> {
  const start = toUTCDate(new Date())
  const existing = await prisma.dailyDrop.findMany({
    where: { date: { gte: start } },
    select: { date: true, reviewId: true },
  })

  const existingDates = new Set(existing.map((d) => formatDate(d.date)))
  const existingReviewIds = new Set(existing.map((d) => d.reviewId))

  const dates: Date[] = []
  for (let i = 0; i < daysAhead; i += 1) {
    const d = new Date(start.getTime() + i * DAY_MS)
    if (!existingDates.has(formatDate(d))) {
      dates.push(d)
    }
  }

  if (dates.length === 0) {
    return { scheduled: 0 }
  }

  const curated = await getApprovedSchedule(daysAhead)
  const curatedReviewIds = new Set(curated.map((c) => c.reviewId))

  const curatedAssignments = curated
    .slice(0, dates.length)
    .map((curation, idx) => ({ curation, date: dates[idx] }))

  const fallbackDates = dates.slice(curatedAssignments.length)
  const usedReviewIds = new Set([...existingReviewIds, ...curatedReviewIds])

  let fallbackAssignments: { review: Review & { product: Product; _count: { guesses: number } }; score: number; date: Date }[] = []

  if (fallbackDates.length > 0) {
    const candidateWhere: {
      status: "PUBLISHED"
      deletedAt: null
      id?: { notIn: string[] }
    } = { status: "PUBLISHED", deletedAt: null }

    if (usedReviewIds.size > 0) {
      candidateWhere.id = { notIn: [...usedReviewIds] }
    }

    const candidates = await prisma.review.findMany({
      where: candidateWhere,
      include: {
        product: true,
        _count: { select: { guesses: true } },
      },
    })

    if (candidates.length > 0) {
      const candidateIds = candidates.map((r) => r.id)
      const distributions = await buildGuessDistributions(candidateIds)

      const scored = candidates
        .map((review) => ({
          review,
          score: computeGuessabilityScore(review, distributions.get(review.id)),
        }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return (
            new Date(a.review.createdAt).getTime() -
            new Date(b.review.createdAt).getTime()
          )
        })

      fallbackAssignments = fallbackDates.slice(0, scored.length).map((date, idx) => ({
        date,
        review: scored[idx].review,
        score: scored[idx].score,
      }))
    }
  }

  const totalScheduled = curatedAssignments.length + fallbackAssignments.length
  if (totalScheduled === 0) {
    return { scheduled: 0 }
  }

  await prisma.$transaction(async (tx) => {
    for (const { curation, date } of curatedAssignments) {
      await tx.contentCuration.update({
        where: { id: curation.id },
        data: { status: "SCHEDULED", scheduledDate: date },
      })
      await tx.dailyDrop.create({
        data: { date, reviewId: curation.reviewId, isOverride: false },
      })
    }

    for (const { review, score, date } of fallbackAssignments) {
      await tx.dailyDrop.create({
        data: { date, reviewId: review.id, isOverride: false },
      })

      const existingCuration = await tx.contentCuration.findFirst({
        where: { reviewId: review.id },
      })

      if (existingCuration) {
        await tx.contentCuration.update({
          where: { id: existingCuration.id },
          data: { status: "SCHEDULED", scheduledDate: date },
        })
      } else {
        await tx.contentCuration.create({
          data: {
            reviewId: review.id,
            guessabilityScore: score,
            status: "SCHEDULED",
            scheduledDate: date,
          },
        })
      }
    }
  })

  return { scheduled: totalScheduled }
}

async function buildGuessDistributions(
  reviewIds: string[]
): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>()
  if (reviewIds.length === 0) return map

  const rows = await prisma.guess.groupBy({
    by: ["reviewId", "guessedRating"],
    where: { reviewId: { in: reviewIds }, guessedRating: { gte: 1, lte: 10 } },
    _count: true,
  })

  for (const row of rows) {
    const dist = map.get(row.reviewId) ?? new Array(10).fill(0)
    const idx = row.guessedRating - 1
    if (idx >= 0 && idx < 10) {
      dist[idx] = row._count
    }
    map.set(row.reviewId, dist)
  }

  return map
}

export async function setDailyDropOverride(
  date: Date,
  reviewId: string
): Promise<DailyDropWithReview> {
  const normalized = toUTCDate(date)

  const review = await prisma.review.findUnique({
    where: { id: reviewId, deletedAt: null },
  })
  if (!review) {
    throw new Error("Review not found")
  }

  const dailyDrop = await prisma.dailyDrop.upsert({
    where: { date: normalized },
    update: { reviewId, isOverride: true },
    create: { date: normalized, reviewId, isOverride: true },
    include: {
      review: {
        include: {
          product: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })

  return dailyDrop
}
