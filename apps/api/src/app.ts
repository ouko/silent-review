import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/index.js";
import { errorHandler } from "./middleware/error.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { feedRouter } from "./routes/feed.js";
import { productsRouter } from "./routes/products.js";
import { reviewsRouter } from "./routes/reviews.js";
import { uploadRouter, UPLOAD_BASE_URL, UPLOAD_DIR } from "./routes/upload.js";
import { usersRouter } from "./routes/users.js";

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

  // Serve uploaded videos locally
  app.use(UPLOAD_BASE_URL, express.static(UPLOAD_DIR));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "silent-review-api" });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/feed", feedRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/users", usersRouter);

  app.use(errorHandler);

  return app;
}
