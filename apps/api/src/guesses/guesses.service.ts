import { prisma } from "../prisma.js";
import { updateStreak } from "../gamification/streaks.service.js";
import { checkAchievements } from "../gamification/achievements.service.js";
import type { SubmitGuessInput } from "./guesses.validation.js";

export function calculateGuessScore(actual: number, guessed: number): number {
  const distance = Math.abs(actual - guessed);
  if (distance === 0) return 10;
  if (distance === 1) return 5;
  if (distance === 2) return 2;
  return 0;
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

  const score = calculateGuessScore(review.rating, input.guessedRating);
  const isCorrect = score === 10;

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
  const previousExactCount = await prisma.guess.count({
    where: { reviewId, isCorrect: true },
  });

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      guessCount: { increment: 1 },
      exactGuessCount: previousExactCount,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { totalGuesses: { increment: 1 }, totalPoints: { increment: score } },
  });

  // Gamification updates (fire-and-forget)
  updateStreak(userId)
    .then(() => checkAchievements(userId))
    .catch(() => {});

  return { guess, review };
}

export async function getGuessStats(reviewId: string) {
  const guesses = await prisma.guess.findMany({
    where: { reviewId },
    select: { guessedRating: true, score: true },
  });

  const distribution = new Array(10).fill(0);
  let totalScore = 0;
  for (const g of guesses) {
    distribution[g.guessedRating - 1]++;
    totalScore += g.score;
  }

  return {
    totalGuesses: guesses.length,
    averageScore: guesses.length > 0 ? totalScore / guesses.length : 0,
    exactGuesses: guesses.filter((g) => g.score === 10).length,
    distribution,
  };
}

export async function getUserGuess(userId: string, reviewId: string) {
  return prisma.guess.findUnique({
    where: { userId_reviewId: { userId, reviewId } },
  });
}

export async function revealReview(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId, deletedAt: null },
    include: {
      guesses: {
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  const stats = await getGuessStats(reviewId);

  return {
    reviewId: review.id,
    rating: review.rating,
    totalGuesses: stats.totalGuesses,
    distribution: stats.distribution,
    guesses: review.guesses.map((g) => ({
      userId: g.userId,
      username: g.user.username,
      displayName: g.user.displayName,
      avatarUrl: g.user.avatarUrl,
      guessedRating: g.guessedRating,
      score: g.score,
    })),
  };
}
