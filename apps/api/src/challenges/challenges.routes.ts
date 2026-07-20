import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  createChallenge,
  joinChallenge,
  getActiveChallengesForUser,
} from "./challenges.service.js";

const CreateChallengeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(280).optional(),
});

export const challengesRouter = Router();

challengesRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = CreateChallengeSchema.parse(req.body);
    const challenge = await createChallenge(req.user!.id, data.name, data.description);
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
