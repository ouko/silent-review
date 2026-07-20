import { Router } from "express";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { SubmitGuessSchema } from "./guesses.validation.js";
import { submitGuess, getGuessStats, revealReview } from "./guesses.service.js";

export const guessesRouter = Router();

guessesRouter.post("/:reviewId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = SubmitGuessSchema.parse(req.body);
    const { guess } = await submitGuess(req.user!.id, req.params.reviewId, data);
    res.json({ guess: { ...guess, createdAt: guess.createdAt.toISOString() } });
  } catch (err) {
    next(err);
  }
});

guessesRouter.get("/:reviewId/stats", optionalAuth, async (req, res, next) => {
  try {
    const stats = await getGuessStats(req.params.reviewId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

guessesRouter.get("/:reviewId/reveal", optionalAuth, async (req, res, next) => {
  try {
    const reveal = await revealReview(req.params.reviewId);
    res.json(reveal);
  } catch (err) {
    next(err);
  }
});
