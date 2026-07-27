import { Router } from "express";
import { recordShare, getShareAnalytics } from "../services/share.service.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const sharesRouter = Router();

sharesRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { reviewId, provider, utmCampaign, utmContent } = req.body;
    if (!reviewId || !provider) {
      res.status(400).json({ error: "reviewId and provider are required" });
      return;
    }

    const ip = req.ip ?? req.socket.remoteAddress ?? "";
    const ipHash = Buffer.from(ip).toString("base64");

    const event = await recordShare({
      userId: req.user!.id,
      reviewId,
      provider,
      utmCampaign,
      utmContent,
      ipHash,
    });

    // Increment denormalized counter.
    await prisma.review.update({
      where: { id: reviewId },
      data: { shareCount: { increment: 1 } },
    });

    res.status(201).json({ id: event.id });
  } catch (err) {
    next(err);
  }
});

sharesRouter.get("/analytics", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const reviewId = req.query.reviewId as string | undefined;
    const analytics = await getShareAnalytics(reviewId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});
