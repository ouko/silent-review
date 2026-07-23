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
 */
healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", service: "silent-review-api" });
});
