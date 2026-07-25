import { Router } from "express";

export const healthRouter = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 service:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 region:
 *                   type: string
 *                 features:
 *                   type: object
 */
healthRouter.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "silent-review-api",
    timestamp: new Date().toISOString(),
    region: req.region ?? "DEFAULT",
    features: req.features ?? {},
  });
});
