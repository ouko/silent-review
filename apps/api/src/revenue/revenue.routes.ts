import { Router } from "express";
import { requireAuth, requireRole, optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { generateAffiliateLink } from "./affiliate.service.js";
import { createTipIntent, confirmTip } from "./tipping.service.js";
import { getSubscriptionStatus, createPremiumSubscription, cancelPremiumSubscription } from "./subscriptions.service.js";
import { createCampaign, listCampaigns } from "./brands.service.js";
import { createApiKey, listApiKeys, revokeApiKey } from "./api-access.service.js";

export const revenueRouter = Router();

function getClientIp(req: AuthenticatedRequest): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim();
  }
  return req.socket?.remoteAddress ?? req.ip ?? undefined;
}

revenueRouter.post("/affiliate/:productId/click", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const reviewId = typeof req.body?.reviewId === "string" ? req.body.reviewId : undefined;
    const referrer = typeof req.body?.referrer === "string" ? req.body.referrer : (req.headers.referer as string | undefined);

    await prisma.$transaction([
      prisma.affiliateClick.create({
        data: {
          productId: product.id,
          reviewId,
          userId: req.user?.id,
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] as string | undefined,
          referrer,
        },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: { clickCount: { increment: 1 } },
      }),
    ]);

    const { url, partner } = generateAffiliateLink(product);

    if (req.query.redirect === "1") {
      res.redirect(url);
      return;
    }
    res.json({ url, partner });
  } catch (err) {
    next(err);
  }
});

revenueRouter.get("/affiliate/clicks", requireAuth, requireRole("ADMIN"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
    const rawLimit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 50;
    const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(1, rawLimit), 200);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    const clicks = await prisma.affiliateClick.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        product: { select: { id: true, name: true } },
        review: { select: { id: true } },
        user: { select: { id: true, username: true } },
      },
    });

    const nextCursor = clicks.length === limit ? clicks[clicks.length - 1].id : undefined;
    res.json({
      clicks: clicks.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      nextCursor,
    });
  } catch (err) {
    next(err);
  }
});

revenueRouter.post("/tips", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { creatorId, amountCents } = req.body;
    const intent = await createTipIntent(creatorId, Number(amountCents));
    res.status(201).json(intent);
  } catch (err) {
    next(err);
  }
});

revenueRouter.post("/tips/:id/confirm", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await confirmTip(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

revenueRouter.get("/subscription", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(getSubscriptionStatus(req.user!.id));
  } catch (err) {
    next(err);
  }
});

revenueRouter.post("/subscription", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const status = await createPremiumSubscription(req.user!.id);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

revenueRouter.delete("/subscription", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const status = await cancelPremiumSubscription(req.user!.id);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

revenueRouter.post("/campaigns", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const campaign = await createCampaign(req.body);
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

revenueRouter.get("/campaigns", requireAuth, async (_req: AuthenticatedRequest, res, next) => {
  try {
    res.json({ campaigns: await listCampaigns() });
  } catch (err) {
    next(err);
  }
});

revenueRouter.post("/api-keys", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name } = req.body;
    const { record, plainKey } = await createApiKey(req.user!.id, name);
    res.status(201).json({ ...record, plainKey });
  } catch (err) {
    next(err);
  }
});

revenueRouter.get("/api-keys", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json({ keys: await listApiKeys(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

revenueRouter.delete("/api-keys/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await revokeApiKey(req.user!.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
