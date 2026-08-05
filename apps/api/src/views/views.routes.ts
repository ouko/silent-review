import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { optionalAuth } from "../middleware/auth.js";

export const viewsRouter = Router();

const ViewEventSchema = z.object({
  reviewId: z.string().uuid(),
  type: z.enum(["view", "complete"]),
});

/**
 * Record a video view or completion. Clients dedupe (one view and one
 * completion per review per session); completion means >=90% watched.
 * Counters are denormalized on Review for cheap analytics reads.
 */
viewsRouter.post("/", optionalAuth, async (req, res, next) => {
  try {
    const { reviewId, type } = ViewEventSchema.parse(req.body);
    const result = await prisma.review.updateMany({
      where: { id: reviewId, deletedAt: null },
      data: type === "view" ? { viewCount: { increment: 1 } } : { completeCount: { increment: 1 } },
    });
    if (result.count === 0) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
