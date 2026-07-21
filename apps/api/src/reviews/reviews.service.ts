import { prisma } from "../prisma.js";
import { notifyFollowersOfReview } from "../socket/index.js";
import { updateStreak } from "../gamification/streaks.service.js";
import { checkAchievements } from "../gamification/achievements.service.js";
import { addPoints } from "../gamification/points.service.js";
import type { CreateReviewInput } from "./reviews.validation.js";

export async function createReview(userId: string, input: CreateReviewInput) {
  // Duplicate detection: one review per user per product.
  const existing = await prisma.review.findFirst({
    where: { userId, productId: input.productId, deletedAt: null },
  });
  if (existing) {
    // Edit in place rather than creating a duplicate.
    return prisma.review.update({
      where: { id: existing.id },
      data: {
        videoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl ?? existing.thumbnailUrl,
        duration: input.duration,
        format: input.format,
        rating: input.rating,
        caption: input.caption,
        productTag: input.productTag,
        status: "PUBLISHED",
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        product: { select: { id: true, name: true, category: true } },
      },
    });
  }

  const review = await prisma.review.create({
    data: { ...input, userId },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      product: { select: { id: true, name: true, category: true } },
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { totalReviews: { increment: 1 } },
  });

  // Gamification updates (fire-and-forget)
  updateStreak(userId)
    .then(() => addPoints(userId, 10))
    .then(() => checkAchievements(userId))
    .catch(() => {});

  // Fire-and-forget real-time follower notifications.
  notifyFollowersOfReview({
    id: review.id,
    userId: review.userId,
    productId: review.productId,
    videoUrl: review.videoUrl,
    thumbnailUrl: review.thumbnailUrl,
    rating: review.rating,
    caption: review.caption,
  }).catch(() => {});

  return review;
}

export async function getReviewById(reviewId: string) {
  return prisma.review.findUnique({
    where: { id: reviewId, deletedAt: null },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      product: { select: { id: true, name: true, category: true } },
      _count: { select: { likes: true, comments: true, guesses: true } },
    },
  });
}
