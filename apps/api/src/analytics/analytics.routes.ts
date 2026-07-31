import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const analyticsRouter = Router();

const REVIEW_SELECT = {
  id: true,
  rating: true,
  status: true,
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
      guessAccuracy: totalGuesses > 0 ? exactGuesses / totalGuesses : null,
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
      guessAccuracy: totalGuesses > 0 ? exactGuesses / totalGuesses : null,
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
