import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole, optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { ingestEvents } from "./event.service.js";
import { getDashboardData, runDailyRollup } from "@silent-review/database";

export const analyticsRouter = Router();

const MAX_BATCH_EVENTS = 100;

const EventBatchSchema = z.object({
  events: z
    .array(
      z.object({
        type: z.string(),
        userId: z.string().nullable().optional(),
        sessionId: z.string().nullable().optional(),
        channel: z.string().optional(),
        properties: z.record(z.unknown()).optional(),
        timestamp: z.string().datetime().optional(),
      })
    )
    .max(MAX_BATCH_EVENTS),
});

const batchIngestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many analytics batch requests" },
});

analyticsRouter.post("/events/batch", batchIngestLimiter, optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = EventBatchSchema.parse(req.body);
    const enriched = body.events.map((e) => ({
      ...e,
      userId: e.userId ?? req.user?.id ?? null,
    }));
    const result = await ingestEvents(enriched);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/dashboard", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const rawDays = Number(req.query.days);
    const days = Number.isNaN(rawDays) ? 30 : Math.min(90, Math.max(1, rawDays));
    const data = await getDashboardData(days);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.post("/rollup", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const date = req.body.date ? new Date(req.body.date) : undefined;
    if (date && Number.isNaN(date.getTime())) {
      res.status(400).json({ error: "Invalid date" });
      return;
    }
    await runDailyRollup(date);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const REVIEW_SELECT = {
  id: true,
  rating: true,
  status: true,
  viewCount: true,
  completeCount: true,
  likeCount: true,
  guessCount: true,
  commentCount: true,
  shareCount: true,
  createdAt: true,
  product: { select: { id: true, name: true } },
} as const;

function engagement(r: { likeCount: number; guessCount: number; commentCount: number }) {
  return r.likeCount + r.guessCount + r.commentCount;
}

function rates(v: { views: number; completes: number; likes: number; comments: number; guesses: number }) {
  return {
    completionRate: v.views > 0 ? v.completes / v.views : null,
    engagementRate: v.views > 0 ? (v.likes + v.comments + v.guesses) / v.views : null,
  };
}

const TREND_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function trendDays(): string[] {
  const days: string[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    days.push(new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10));
  }
  return days;
}

function bucketByDay(days: string[], dates: Date[]): number[] {
  const counts = new Map(days.map((d) => [d, 0]));
  for (const dt of dates) {
    const key = dt.toISOString().slice(0, 10);
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  }
  return [...counts.values()];
}

async function buildTrend(scope: { userId?: string; productId?: string }) {
  const days = trendDays();
  const since = new Date(Date.now() - (TREND_DAYS - 1) * DAY_MS);
  since.setHours(0, 0, 0, 0);
  const reviewScope = scope.userId ? { userId: scope.userId } : { productId: scope.productId! };

  const [reviews, likes, comments, guesses] = await Promise.all([
    prisma.review.findMany({ where: { ...reviewScope, deletedAt: null, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.like.findMany({ where: { review: reviewScope, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.comment.findMany({ where: { review: reviewScope, createdAt: { gte: since }, deletedAt: null }, select: { createdAt: true } }),
    prisma.guess.findMany({ where: { review: reviewScope, createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  return {
    days,
    reviews: bucketByDay(days, reviews.map((r) => r.createdAt)),
    engagement: bucketByDay(days, [...likes, ...comments, ...guesses].map((r) => r.createdAt)),
  };
}

// Creator analytics: how the signed-in user's own content performs.
analyticsRouter.get("/creator", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const reviews = await prisma.review.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: REVIEW_SELECT,
    });

    const published = reviews.filter((r) => r.status === "PUBLISHED").length;
    const sum = (f: (r: (typeof reviews)[number]) => number) => reviews.reduce((t, r) => t + f(r), 0);
    const totalGuesses = sum((r) => r.guessCount);
    const exactGuesses = await prisma.guess.count({ where: { review: { userId }, isCorrect: true } });
    const sharesByProvider = await prisma.shareEvent.groupBy({
      by: ["provider"],
      where: { review: { userId } },
      _count: { _all: true },
    });

    res.json({
      totalReviews: reviews.length,
      publishedReviews: published,
      averageRating: reviews.length ? reviews.reduce((t, r) => t + r.rating, 0) / reviews.length : 0,
      engagement: {
        likes: sum((r) => r.likeCount),
        comments: sum((r) => r.commentCount),
        guesses: totalGuesses,
        shares: sum((r) => r.shareCount),
      },
      ...rates({
        views: sum((r) => r.viewCount),
        completes: sum((r) => r.completeCount),
        likes: sum((r) => r.likeCount),
        comments: sum((r) => r.commentCount),
        guesses: totalGuesses,
      }),
      guessAccuracy: totalGuesses > 0 ? exactGuesses / totalGuesses : null,
      trend: await buildTrend({ userId }),
      sharesByProvider: Object.fromEntries(sharesByProvider.map((s) => [s.provider, s._count._all])),
      topReviews: [...reviews]
        .sort((a, b) => engagement(b) - engagement(a))
        .slice(0, 5)
        .map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  } catch (err) {
    next(err);
  }
});

// Merchant analytics: how a product performs across all its reviews.
analyticsRouter.get("/my-products", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        brand: true,
        _count: { select: { reviews: { where: { deletedAt: null, status: "PUBLISHED" } } } },
      },
    });
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// Merchant analytics: how a product performs across all its reviews.
analyticsRouter.get("/products/:productId", optionalAuth, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      select: { id: true, name: true, category: true, brand: true },
    });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { productId: product.id, deletedAt: null, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: REVIEW_SELECT,
    });

    const distribution = new Array(10).fill(0) as number[];
    for (const r of reviews) distribution[r.rating - 1]++;

    const sum = (f: (r: (typeof reviews)[number]) => number) => reviews.reduce((t, r) => t + f(r), 0);
    const totalGuesses = sum((r) => r.guessCount);
    const exactGuesses = await prisma.guess.count({
      where: { review: { productId: product.id }, isCorrect: true },
    });
    const sharesByProvider = await prisma.shareEvent.groupBy({
      by: ["provider"],
      where: { review: { productId: product.id } },
      _count: { _all: true },
    });

    res.json({
      product,
      totalReviews: reviews.length,
      averageRating: reviews.length ? reviews.reduce((t, r) => t + r.rating, 0) / reviews.length : 0,
      distribution,
      engagement: {
        likes: sum((r) => r.likeCount),
        comments: sum((r) => r.commentCount),
        guesses: totalGuesses,
        shares: sum((r) => r.shareCount),
      },
      ...rates({
        views: sum((r) => r.viewCount),
        completes: sum((r) => r.completeCount),
        likes: sum((r) => r.likeCount),
        comments: sum((r) => r.commentCount),
        guesses: totalGuesses,
      }),
      guessAccuracy: totalGuesses > 0 ? exactGuesses / totalGuesses : null,
      trend: await buildTrend({ productId: product.id }),
      sharesByProvider: Object.fromEntries(sharesByProvider.map((s) => [s.provider, s._count._all])),
      topReviews: [...reviews]
        .sort((a, b) => engagement(b) - engagement(a))
        .slice(0, 5)
        .map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  } catch (err) {
    next(err);
  }
});
