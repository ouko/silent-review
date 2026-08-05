import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "./notificationPreferences.service.js";

export const notificationPreferencesRouter = Router();

const PreferencesSchema = z.object({
  dailyLive: z.boolean().optional(),
  streakAtRisk: z.boolean().optional(),
  challengeReceived: z.boolean().optional(),
  scoreBeaten: z.boolean().optional(),
});

notificationPreferencesRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const prefs = await getNotificationPreferences(req.user!.id);
    res.json({ preferences: prefs });
  } catch (err) {
    next(err);
  }
});

notificationPreferencesRouter.patch("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const updates = PreferencesSchema.parse(req.body);
    const prefs = await updateNotificationPreferences(req.user!.id, updates);
    res.json({ preferences: prefs });
  } catch (err) {
    next(err);
  }
});
