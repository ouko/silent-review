import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "../config/index.js";
import { prisma } from "../prisma.js";

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
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

        io?.to(`review:${reviewId}`).emit("review:revealed", {
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

export function getSocketServer(): Server | null {
  return io;
}

export async function notifyFollowersOfReview(review: {
  id: string;
  userId: string;
  productId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  rating: number;
  caption: string | null;
}): Promise<void> {
  if (!io) return;

  const followers = await prisma.follow.findMany({
    where: { followingId: review.userId },
    select: { followerId: true },
  });

  const author = await prisma.user.findUnique({
    where: { id: review.userId },
    select: { username: true, displayName: true, avatarUrl: true },
  });

  const product = await prisma.product.findUnique({
    where: { id: review.productId },
    select: { name: true },
  });

  const payload = {
    type: "NEW_REVIEW",
    reviewId: review.id,
    authorId: review.userId,
    authorName: author?.displayName ?? author?.username ?? "Someone",
    authorAvatar: author?.avatarUrl,
    productName: product?.name ?? "a product",
    thumbnailUrl: review.thumbnailUrl,
    createdAt: new Date().toISOString(),
  };

  for (const follower of followers) {
    io.to(`user:${follower.followerId}`).emit("notification", payload);
  }
}
