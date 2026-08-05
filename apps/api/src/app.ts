import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/index.js";
import { errorHandler } from "./middleware/error.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { feedRouter } from "./feed/feed.routes.js";
import { productsRouter } from "./products/products.routes.js";
import { reviewsRouter } from "./reviews/reviews.routes.js";
import { guessesRouter } from "./guesses/guesses.routes.js";
import { invitesRouter } from "./invites/invites.routes.js";
import { challengesRouter } from "./challenges/challenges.routes.js";
import { uploadRouter, UPLOAD_BASE_URL } from "./routes/upload.js";
import { serveUpload } from "./upload/serveUploads.js";
import { usersRouter } from "./routes/users.js";
import { followsRouter } from "./follows/follows.routes.js";
import { commentsRouter } from "./comments/comments.routes.js";
import { likesRouter } from "./likes/likes.routes.js";
import { notificationsRouter } from "./notifications/notifications.routes.js";
import { gamificationRouter } from "./gamification/gamification.routes.js";
import { revenueRouter } from "./revenue/revenue.routes.js";
import { featuresRouter } from "./features/features.routes.js";
import { exportRouter } from "./export/export.routes.js";
import { sharesRouter } from "./routes/shares.js";
import { regionalMiddleware } from "./regional/regional.middleware.js";
import { featuresMiddleware } from "./features/features.middleware.js";
import { docsRouter } from "./docs/swagger.js";
import { adminRouter } from "./admin/admin.routes.js";
import { analyticsRouter } from "./analytics/analytics.routes.js";
import { viewsRouter } from "./views/views.routes.js";
import { dailyDropRouter } from "./dailydrop/dailydrop.routes.js";

export function createApp() {
  const app = express();

  // Trust proxies only when explicitly configured. In production this should
  // be a comma-separated list of trusted proxy IPs/CIDRs.
  app.set("trust proxy", env.TRUSTED_PROXIES ? env.TRUSTED_PROXIES.split(",") : 1);

  app.use(helmet());

  // In development, allow both the configured WEB_APP_URL (e.g. a LAN IP for
  // phone testing) and localhost so laptop/browser tests still work.
  const allowedOrigins =
    env.NODE_ENV === "development"
      ? [env.WEB_APP_URL, "http://localhost:5173", "https://localhost:5173"]
      : env.WEB_APP_URL;

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(regionalMiddleware);
  app.use(featuresMiddleware);

  // Serve uploaded videos locally, decrypting at-rest payloads and
  // supporting Range requests (required by iOS Safari video playback).
  app.get(`${UPLOAD_BASE_URL}/:filename`, serveUpload);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "silent-review-api",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/feed", feedRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/guesses", guessesRouter);
  app.use("/api/invites", invitesRouter);
  app.use("/api/challenges", challengesRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/follows", followsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/likes", likesRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/gamification", gamificationRouter);
  app.use("/api/revenue", revenueRouter);
  app.use("/api/features", featuresRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/shares", sharesRouter);
  app.use("/api/docs", docsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/views", viewsRouter);
  app.use("/api/dailydrop", dailyDropRouter);

  app.use(errorHandler);

  return app;
}
