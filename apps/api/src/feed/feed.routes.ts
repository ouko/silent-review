import { Router } from "express";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  getForYouFeed,
  getFollowingFeed,
  getTrendingFeed,
  getCategoryFeed,
} from "./feed.service.js";

export const feedRouter = Router();

feedRouter.get("/", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const feed = await getForYouFeed(req.user?.id, cursor, limit);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

feedRouter.get("/following", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const feed = await getFollowingFeed(req.user!.id, cursor, limit);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

feedRouter.get("/trending", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const feed = await getTrendingFeed(cursor, limit);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

feedRouter.get("/category/:category", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const feed = await getCategoryFeed(req.params.category, cursor, limit);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});
