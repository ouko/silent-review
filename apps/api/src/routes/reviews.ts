import { Router } from "express";
import { CreateReviewSchema, SubmitGuessSchema } from "@silent-review/shared";
import { prisma } from "../prisma.js";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const reviewsRouter = Router();

reviewsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = CreateReviewSchema.parse(req.body);
    const review = await prisma.review.create({
      data: { ...data, userId: req.user!.id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
    res.status(201).json({
      ...review,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

reviewsRouter.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { likes: true, comments: true, guesses: true } },
      },
    });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    let viewerGuess: { guessedRating: number } | null = null;
    if (req.user) {
      viewerGuess = await prisma.guess.findUnique({
        where: { userId_reviewId: { userId: req.user.id, reviewId: review.id } },
        select: { guessedRating: true },
      });
    }

    res.json({
      ...review,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      counts: review._count,
      viewerGuess,
    });
  } catch (err) {
    next(err);
  }
});

reviewsRouter.post("/:id/guess", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = SubmitGuessSchema.parse(req.body);
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    if (review.userId === req.user!.id) {
      res.status(400).json({ error: "Cannot guess your own review" });
      return;
    }

    const distance = Math.abs(review.rating - data.guessedRating);
    const score = Math.max(0, 100 - distance * 10);
    const isCorrect = distance === 0;

    const guess = await prisma.guess.upsert({
      where: { userId_reviewId: { userId: req.user!.id, reviewId: review.id } },
      update: { guessedRating: data.guessedRating, score, isCorrect },
      create: {
        userId: req.user!.id,
        reviewId: review.id,
        guessedRating: data.guessedRating,
        score,
        isCorrect,
      },
    });

    res.json({ guess: { ...guess, createdAt: guess.createdAt.toISOString() } });
  } catch (err) {
    next(err);
  }
});
