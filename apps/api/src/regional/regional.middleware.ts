import type { Request, Response, NextFunction } from "express";
import { getRegionalConfig } from "./regional.config.js";

declare global {
  namespace Express {
    interface Request {
      region?: string;
      regionalConfig?: ReturnType<typeof getRegionalConfig>;
    }
  }
}

function detectRegionFromIp(_ip: string): string | undefined {
  // Placeholder for GeoIP lookup. In production, use a service such as
  // MaxMind GeoIP2 or a cloud load balancer header (e.g., CloudFront-Viewer-Country).
  return undefined;
}

export function regionalMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "";

  const region =
    (req.headers["x-client-region"] as string | undefined) || detectRegionFromIp(ip);

  req.region = region;
  req.regionalConfig = getRegionalConfig(region);

  // Expose region info to the client for UI adaptation.
  res.setHeader("X-SilentReview-Region", req.regionalConfig.region);

  next();
}
