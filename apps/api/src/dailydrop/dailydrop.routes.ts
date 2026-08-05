import { Router } from "express"
import { z } from "zod"
import { Prisma } from "@silent-review/database"
import { requireAuth, optionalAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js"
import {
  getTodaysDailyDrop,
  getDailyDropArchive,
  submitDailyDropAttempt,
  scheduleDailyDrops,
  setDailyDropOverride,
} from "../dailydrop/dailydrop.service.js"

export const dailyDropRouter = Router()

const DEFAULT_ARCHIVE_LIMIT = 20
const MAX_ARCHIVE_LIMIT = 50

const AttemptSchema = z.object({
  guessedRating: z.number().int().min(1).max(10),
})

const OverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  reviewId: z.string().uuid(),
})

function serializeForJson(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (Array.isArray(value)) {
    return value.map(serializeForJson)
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializeForJson(val)
    }
    return out
  }
  return value
}

dailyDropRouter.get("/today", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await getTodaysDailyDrop(req.user?.id)
    if (!result) {
      res.status(404).json({ error: "No Daily Drop scheduled for today" })
      return
    }
    res.json(serializeForJson(result))
  } catch (err) {
    next(err)
  }
})

dailyDropRouter.get("/archive", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawLimit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : DEFAULT_ARCHIVE_LIMIT
    const limit = Number.isNaN(rawLimit) ? DEFAULT_ARCHIVE_LIMIT : Math.min(Math.max(1, rawLimit), MAX_ARCHIVE_LIMIT)
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined
    const archive = await getDailyDropArchive({ cursor, limit })
    res.json(serializeForJson(archive))
  } catch (err) {
    next(err)
  }
})

dailyDropRouter.post("/:id/attempt", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { guessedRating } = AttemptSchema.parse(req.body)
    const result = await submitDailyDropAttempt(req.user!.id, req.params.id, guessedRating)
    res.json(serializeForJson(result))
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({ error: "Already played today's Daily Drop" })
      return
    }
    next(err)
  }
})

dailyDropRouter.post("/schedule", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const result = await scheduleDailyDrops()
    res.json(serializeForJson(result))
  } catch (err) {
    next(err)
  }
})

dailyDropRouter.post("/override", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { date, reviewId } = OverrideSchema.parse(req.body)
    const utcDate = new Date(`${date}T00:00:00.000Z`)
    const dailyDrop = await setDailyDropOverride(utcDate, reviewId)
    res.json(serializeForJson(dailyDrop))
  } catch (err) {
    next(err)
  }
})
