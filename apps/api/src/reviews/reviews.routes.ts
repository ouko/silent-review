import { Router } from "express";
import { CreateReviewSchema } from "./reviews.validation.js";
import { createReview, getReviewById } from "./reviews.service.js";
import { prisma } from "../prisma.js";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const reviewsRouter = Router();

reviewsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = CreateReviewSchema.parse(req.body);
    const review = await createReview(req.user!.id, data);
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
    const review = await getReviewById(req.params.id);
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
