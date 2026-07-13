import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "../config/index.js";
import { prisma } from "../prisma.js";

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.WEB_APP_URL,
      credentials: true,
    },
  });

  try {
    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  } catch (err) {
    console.warn("Redis adapter not available; running in single-instance mode", err);
  }

  io.on("connection", (socket) => {
    socket.on("review:join", (reviewId: string) => {
      socket.join(`review:${reviewId}`);
    });

    socket.on("review:leave", (reviewId: string) => {
      socket.leave(`review:${reviewId}`);
    });

    socket.on("review:reveal", async (reviewId: string) => {
      try {
        const review = await prisma.review.findUnique({
          where: { id: reviewId },
          include: {
            guesses: {
              include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              },
            },
          },
        });
        if (!review) return;

        const totalGuesses = review.guesses.length;
        const viewerResults = review.guesses.map((g) => ({
          userId: g.userId,
          username: g.user.username,
          displayName: g.user.displayName,
          avatarUrl: g.user.avatarUrl,
          guessedRating: g.guessedRating,
          score: g.score,
        }));

        io.to(`review:${reviewId}`).emit("review:revealed", {
          reviewId,
          rating: review.rating,
          totalGuesses,
          viewerResults,
        });
      } catch (err) {
        console.error("Socket reveal error", err);
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}
