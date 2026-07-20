import { prisma } from "../prisma.js";
import { notifyFollowersOfReview } from "../socket/index.js";
import type { CreateReviewInput, SubmitGuessInput } from "./reviews.validation.js";

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

export async function submitGuess(userId: string, reviewId: string, input: SubmitGuessInput) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId, deletedAt: null },
  });
  if (!review) {
    throw new Error("Review not found");
  }
  if (review.userId === userId) {
    throw new Error("Cannot guess your own review");
  }

  const distance = Math.abs(review.rating - input.guessedRating);
  const score = distance === 0 ? 10 : distance === 1 ? 5 : distance === 2 ? 2 : 0;
  const isCorrect = distance === 0;

  const guess = await prisma.guess.upsert({
    where: { userId_reviewId: { userId, reviewId } },
    update: { guessedRating: input.guessedRating, score, isCorrect },
    create: {
      userId,
      reviewId,
      guessedRating: input.guessedRating,
      score,
      isCorrect,
    },
  });

  // Update denormalized review engagement metrics.
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      guessCount: { increment: 1 },
      exactGuessCount: isCorrect ? { increment: 1 } : undefined,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { totalGuesses: { increment: 1 }, totalPoints: { increment: score } },
  });

  return { guess, review };
}
