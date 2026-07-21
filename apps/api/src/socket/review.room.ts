import type { Server, Socket } from "socket.io";
import { prisma } from "../prisma.js";

export function reviewRoomHandler(io: Server, socket: Socket) {
  socket.on("review:join", (reviewId: string) => {
    socket.join(`review:${reviewId}`);
    io.to(`review:${reviewId}`).emit("review:presence", {
      reviewId,
      viewers: getRoomViewerCount(io, reviewId),
    });
  });

  socket.on("review:leave", (reviewId: string) => {
    socket.leave(`review:${reviewId}`);
    io.to(`review:${reviewId}`).emit("review:presence", {
      reviewId,
      viewers: getRoomViewerCount(io, reviewId),
    });
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
}

function getRoomViewerCount(io: Server, reviewId: string): number {
  const room = io.sockets.adapter.rooms.get(`review:${reviewId}`);
  return room ? room.size : 0;
}
