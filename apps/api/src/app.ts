import express from "express";
import cors from "cors";
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
import { uploadRouter, UPLOAD_BASE_URL, UPLOAD_DIR } from "./routes/upload.js";
import { usersRouter } from "./routes/users.js";
import { followsRouter } from "./follows/follows.routes.js";
import { commentsRouter } from "./comments/comments.routes.js";
import { notificationsRouter } from "./notifications/notifications.routes.js";
import { gamificationRouter } from "./gamification/gamification.routes.js";
import { revenueRouter } from "./revenue/revenue.routes.js";
import { featuresRouter } from "./features/features.routes.js";
import { exportRouter } from "./export/export.routes.js";
import { regionalMiddleware } from "./regional/regional.middleware.js";
import { featuresMiddleware } from "./features/features.middleware.js";
import { docsRouter } from "./docs/swagger.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.WEB_APP_URL,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(regionalMiddleware);
  app.use(featuresMiddleware);

  // Serve uploaded videos locally
  app.use(UPLOAD_BASE_URL, express.static(UPLOAD_DIR));

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
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/gamification", gamificationRouter);
  app.use("/api/revenue", revenueRouter);
  app.use("/api/features", featuresRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/docs", docsRouter);

  app.use(errorHandler);

  return app;
}
