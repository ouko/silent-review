import { Router } from "express";
import { getFeatureFlags } from "./features.service.js";

export const featuresRouter = Router();

featuresRouter.get("/", async (_req, res, next) => {
  try {
    const flags = await getFeatureFlags();
    const features: Record<string, boolean> = {};
    for (const flag of flags) {
      features[flag.key] = flag.enabled;
    }
    res.json({ features });
  } catch (err) {
    next(err);
  }
});
