import { Router } from "express";
import { z } from "zod";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  getForYouFeed,
  getFollowingFeed,
  getTrendingFeed,
  getCategoryFeed,
  warmUserProfileCache,
} from "./feed.service.js";

export const feedRouter = Router();

const LimitSchema = z.coerce.number().int().min(1).max(50).default(10);
const FEED_CACHE_CONTROL = "private, max-age=300";

feedRouter.get("/", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = LimitSchema.parse(req.query.limit);
    const feed = await getForYouFeed(req.user?.id, cursor, limit);
    res.setHeader("Cache-Control", FEED_CACHE_CONTROL);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

feedRouter.get("/following", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = LimitSchema.parse(req.query.limit);
    const feed = await getFollowingFeed(req.user!.id, cursor, limit);
    res.setHeader("Cache-Control", FEED_CACHE_CONTROL);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

feedRouter.get("/trending", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = LimitSchema.parse(req.query.limit);
    const feed = await getTrendingFeed(cursor, limit);
    res.setHeader("Cache-Control", FEED_CACHE_CONTROL);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

feedRouter.get("/category/:category", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = LimitSchema.parse(req.query.limit);
    const feed = await getCategoryFeed(req.params.category, cursor, limit);
    res.setHeader("Cache-Control", FEED_CACHE_CONTROL);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

feedRouter.post("/warm-profile", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await warmUserProfileCache(req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
