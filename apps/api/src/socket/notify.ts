import { prisma } from "../prisma.js";
import { getSocketServer } from "./socket.server.js";

export async function notifyFollowersOfReview(review: {
  id: string;
  userId: string;
  productId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  rating: number;
  caption: string | null;
}): Promise<void> {
  const io = getSocketServer();
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
