import { jest } from "@jest/globals";

const mockPrisma: any = {
  review: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  guess: {
    upsert: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
};

jest.unstable_mockModule("../prisma.js", () => ({
  prisma: mockPrisma,
}));

jest.unstable_mockModule("../gamification/streaks.service.js", () => ({
  updateStreak: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

jest.unstable_mockModule("../gamification/achievements.service.js", () => ({
  checkAchievements: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

const { submitGuess, revealReview } = await import("./guesses.service.js");

describe("guess + reveal flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submitGuess creates a correct guess and reveal reflects it", async () => {
    const reviewId = "r1";
    const userId = "u2";
    const rating = 8;
    const guessedRating = 8;

    const review = {
      id: reviewId,
      userId: "u1",
      rating,
    };

    const guess = {
      id: "g1",
      userId,
      reviewId,
      guessedRating,
      score: 10,
      isCorrect: true,
    };

    mockPrisma.review.findUnique.mockResolvedValue(review);
    mockPrisma.guess.upsert.mockResolvedValue(guess);
    mockPrisma.guess.count.mockResolvedValue(1);
    mockPrisma.review.update.mockResolvedValue({ ...review });
    mockPrisma.user.update.mockResolvedValue({ id: userId });

    const result = await submitGuess(userId, reviewId, { guessedRating });

    expect(result.guess.isCorrect).toBe(true);
    expect(result.guess.score).toBe(10);
    expect(mockPrisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          guessCount: { increment: 1 },
          exactGuessCount: 1,
        }),
      })
    );
  });

  it("revealReview returns distribution and aggregates after guesses", async () => {
    const reviewId = "r1";
    const review = {
      id: reviewId,
      rating: 7,
      guesses: [
        {
          userId: "u2",
          user: { id: "u2", username: "alice", displayName: null, avatarUrl: null },
          guessedRating: 7,
          score: 10,
        },
        {
          userId: "u3",
          user: { id: "u3", username: "bob", displayName: null, avatarUrl: null },
          guessedRating: 5,
          score: 2,
        },
      ],
    };

    mockPrisma.review.findUnique.mockResolvedValue(review);
    mockPrisma.guess.findMany.mockResolvedValue([
      { guessedRating: 7, score: 10 },
      { guessedRating: 5, score: 2 },
    ]);

    const reveal = await revealReview(reviewId);

    expect(reveal.rating).toBe(7);
    expect(reveal.totalGuesses).toBe(2);
    expect(reveal.distribution[6]).toBe(1);
    expect(reveal.distribution[4]).toBe(1);
    expect(reveal.guesses).toHaveLength(2);
  });

  it("revealReview throws when review is not found", async () => {
    mockPrisma.review.findUnique.mockResolvedValue(null);
    await expect(revealReview("missing")).rejects.toThrow("Review not found");
  });

  it("submitGuess rejects guessing on own review", async () => {
    const review = { id: "r1", userId: "u1", rating: 5 };
    mockPrisma.review.findUnique.mockResolvedValue(review);

    await expect(submitGuess("u1", "r1", { guessedRating: 5 })).rejects.toThrow(
      "Cannot guess your own review"
    );
  });
});
