import { prisma } from "../prisma.js"
import { computeGuessabilityScore } from "../dailydrop/guessability.js"
import type { CurationStatus, Product, Review, User, ContentCuration } from "@silent-review/database"

function toUTCDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  )
}

export interface CurateResult {
  created: number
}

export async function curateNextCandidates(limit: number): Promise<CurateResult> {
  const curatedReviewIds = await prisma.contentCuration.findMany({
    select: { reviewId: true },
  })
  const excludedIds = curatedReviewIds.map((c) => c.reviewId)

  const where: {
    status: "PUBLISHED"
    deletedAt: null
    id?: { notIn: string[] }
  } = { status: "PUBLISHED", deletedAt: null }

  if (excludedIds.length > 0) {
    where.id = { notIn: excludedIds }
  }

  const candidates = await prisma.review.findMany({
    where,
    include: {
      product: true,
      _count: { select: { guesses: true } },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  })

  if (candidates.length === 0) {
    return { created: 0 }
  }

  const distributions = await buildGuessDistributions(candidates.map((r) => r.id))

  const data = candidates.map((review) => ({
    reviewId: review.id,
    guessabilityScore: computeGuessabilityScore(review, distributions.get(review.id)),
    status: "CANDIDATE" as const,
  }))

  await prisma.contentCuration.createMany({ data })
  return { created: data.length }
}

export interface ContentQueueReview
  extends Pick<Review, "id" | "thumbnailUrl" | "caption" | "rating"> {
  product: Pick<Product, "name" | "category">
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl">
}

export interface ContentQueueItem extends ContentCuration {
  review: ContentQueueReview
}

export interface ListContentQueueResult {
  curations: ContentQueueItem[]
  nextCursor?: string
}

export async function listContentQueue(opts?: {
  status?: CurationStatus
  cursor?: string
  limit?: number
}): Promise<ListContentQueueResult> {
  const { status, cursor, limit = 20 } = opts ?? {}

  const curations = await prisma.contentCuration.findMany({
    where: status ? { status } : {},
    orderBy: [{ guessabilityScore: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      review: {
        select: {
          id: true,
          thumbnailUrl: true,
          caption: true,
          rating: true,
          product: { select: { name: true, category: true } },
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

  const hasMore = curations.length > limit
  const page = hasMore ? curations.slice(0, limit) : curations

  return {
    curations: page,
    nextCursor: hasMore ? page[page.length - 1].id : undefined,
  }
}

const VALID_STATUSES: CurationStatus[] = ["CANDIDATE", "APPROVED", "REJECTED", "SCHEDULED"]

export async function updateCurationStatus(
  id: string,
  status: CurationStatus,
  scheduledDate?: Date | string | null
): Promise<ContentCuration> {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid curation status: ${status}`)
  }

  const updateData: {
    status: CurationStatus
    scheduledDate?: Date | null
  } = { status }

  if (status === "SCHEDULED") {
    if (!scheduledDate) {
      throw new Error("scheduledDate is required when status is SCHEDULED")
    }
    updateData.scheduledDate = toUTCDate(
      typeof scheduledDate === "string" ? new Date(scheduledDate) : scheduledDate
    )
  } else if (status === "APPROVED") {
    updateData.scheduledDate = scheduledDate
      ? toUTCDate(typeof scheduledDate === "string" ? new Date(scheduledDate) : scheduledDate)
      : null
  } else if (scheduledDate) {
    updateData.scheduledDate = toUTCDate(
      typeof scheduledDate === "string" ? new Date(scheduledDate) : scheduledDate
    )
  }

  return prisma.contentCuration.update({
    where: { id },
    data: updateData,
  })
}

export async function getApprovedSchedule(_daysAhead = 90): Promise<ContentCuration[]> {
  const scheduledReviewIds = await prisma.dailyDrop.findMany({
    select: { reviewId: true },
    distinct: ["reviewId"],
  })
  const excludedIds = scheduledReviewIds.map((d) => d.reviewId)

  const where: {
    status: { in: ["APPROVED", "SCHEDULED"] }
    reviewId?: { notIn: string[] }
  } = { status: { in: ["APPROVED", "SCHEDULED"] } }

  if (excludedIds.length > 0) {
    where.reviewId = { notIn: excludedIds }
  }

  return prisma.contentCuration.findMany({
    where,
    orderBy: { guessabilityScore: "desc" },
  })
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
