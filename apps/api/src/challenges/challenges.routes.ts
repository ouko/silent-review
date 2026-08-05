import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  createChallenge,
  createPerVideoChallenge,
  acceptPerVideoChallenge,
  getPerVideoChallenge,
  generateRematch,
  joinChallenge,
  getActiveChallengesForUser,
  getAllActiveChallenges,
} from "./challenges.service.js";

const CreateChallengeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(280).optional(),
});

const CreatePerVideoChallengeSchema = z.object({
  reviewId: z.string().uuid(),
  challengedId: z.string().uuid().optional().nullable(),
  message: z.string().max(280).optional().nullable(),
});

const challengeCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many challenges created. Try again later." },
});

export const challengesRouter = Router();

challengesRouter.post("/", requireAuth, challengeCreateLimiter, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = CreateChallengeSchema.parse(req.body);
    const challenge = await createChallenge(req.user!.id, data.name, data.description);
    res.status(201).json({ challenge });
  } catch (err) {
    next(err);
  }
});

challengesRouter.post("/per-video", requireAuth, challengeCreateLimiter, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = CreatePerVideoChallengeSchema.parse(req.body);
    const challenge = await createPerVideoChallenge({
      challengerId: req.user!.id,
      reviewId: data.reviewId,
      challengedId: data.challengedId,
      message: data.message,
    });
    res.status(201).json({ challenge });
  } catch (err) {
    next(err);
  }
});

challengesRouter.get("/per-video/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const challenge = await getPerVideoChallenge(req.params.id, req.user!.id);
    if (!challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }
    res.json({ challenge });
  } catch (err) {
    next(err);
  }
});

challengesRouter.post("/per-video/:id/accept", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const challenge = await acceptPerVideoChallenge(req.params.id, req.user!.id);
    res.json({ challenge });
  } catch (err) {
    next(err);
  }
});

challengesRouter.post("/per-video/:id/rematch", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const challenge = await generateRematch(req.params.id, req.user!.id);
    res.status(201).json({ challenge });
  } catch (err) {
    next(err);
  }
});

challengesRouter.post("/:id/join", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const participant = await joinChallenge(req.params.id, req.user!.id);
    res.json({ participant });
  } catch (err) {
    next(err);
  }
});

challengesRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const challenges = await getActiveChallengesForUser(req.user!.id);
    res.json({ challenges });
  } catch (err) {
    next(err);
  }
});

challengesRouter.get("/", requireAuth, async (_req: AuthenticatedRequest, res, next) => {
  try {
    const challenges = await getAllActiveChallenges();
    res.json({ challenges });
  } catch (err) {
    next(err);
  }
});
