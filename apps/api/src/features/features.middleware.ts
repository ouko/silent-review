import type { Request, Response, NextFunction } from "express";
import { getFeatureFlags, isFeatureEnabled } from "./features.service.js";

declare global {
  namespace Express {
    interface Request {
      features?: Record<string, boolean>;
    }
  }
}

export function requireFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const region = (req.headers["x-client-region"] as string | undefined) ?? undefined;
    const enabled = await isFeatureEnabled(featureKey, region ? { region } : undefined);
    if (!enabled) {
      res.status(503).json({
        error: "Feature unavailable",
        feature: featureKey,
        degraded: true,
      });
      return;
    }
    next();
  };
}

export async function featuresMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const region = (req.headers["x-client-region"] as string | undefined) ?? undefined;
    const flags = await getFeatureFlags();
    req.features = {};
    for (const flag of flags) {
      req.features[flag.key] = await isFeatureEnabled(flag.key, region ? { region } : undefined);
    }
  } catch {
    // Fail open: don't block requests if feature flag lookup fails.
    req.features = {};
  }
  next();
}
