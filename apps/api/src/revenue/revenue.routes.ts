import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { generateAffiliateLink } from "./affiliate.service.js";
import { createTipIntent, confirmTip } from "./tipping.service.js";
import { getSubscriptionStatus, createPremiumSubscription, cancelPremiumSubscription } from "./subscriptions.service.js";
import { createCampaign, listCampaigns } from "./brands.service.js";
import { createApiKey, listApiKeys, revokeApiKey } from "./api-access.service.js";

export const revenueRouter = Router();

revenueRouter.get("/affiliate/:productId", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(generateAffiliateLink(product));
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
