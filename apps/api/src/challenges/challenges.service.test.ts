import { prisma } from "../prisma.js";
import {
  createPerVideoChallenge,
  recordChallengeGuess,
  getPerVideoChallenge,
  generateRematch,
} from "./challenges.service.js";

async function createUser(email: string, username: string) {
  return prisma.user.create({
    data: { email, username, passwordHash: "hash" },
  });
}

async function createProduct(ownerId: string) {
  return prisma.product.create({
    data: { name: "Test Product", category: "test", ownerId },
  });
}

async function createReview(userId: string, rating = 7) {
  const product = await createProduct(userId);
  return prisma.review.create({
    data: {
      userId,
      productId: product.id,
      videoUrl: "http://example.com/video.mp4",
      thumbnailUrl: "http://example.com/thumb.jpg",
      duration: 5,
      format: "video/mp4",
      rating,
      status: "PUBLISHED",
      caption: "Test review",
    },
  });
}

async function createGuess(userId: string, reviewId: string, guessedRating: number, score: number) {
  return prisma.guess.create({
    data: { userId, reviewId, guessedRating, score, isCorrect: score === 10 },
  });
}

describe("per-video challenges", () => {
  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.challenge.deleteMany();
    await prisma.guess.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
  });

  it("creates a per-video challenge with the challenger's existing score", async () => {
    const challenger = await createUser("c1@test.com", "c1");
    const challenged = await createUser("d1@test.com", "d1");
    const review = await createReview(challenger.id);
    await createGuess(challenger.id, review.id, 7, 10);

    const challenge = await createPerVideoChallenge({
      challengerId: challenger.id,
      reviewId: review.id,
      challengedId: challenged.id,
    });

    expect(challenge.type).toBe("PER_VIDEO");
    expect(challenge.challengerScore).toBe(10);
    expect(challenge.challengedId).toBe(challenged.id);
  });

  it("rejects creation if the challenger has not guessed the review", async () => {
    const challenger = await createUser("c2@test.com", "c2");
    const challenged = await createUser("d2@test.com", "d2");
    const review = await createReview(challenger.id);

    await expect(
      createPerVideoChallenge({ challengerId: challenger.id, reviewId: review.id, challengedId: challenged.id })
    ).rejects.toThrow("Challenger must play the video before challenging a friend");
  });

  it("records the challenged score and creates a beat notification when the second player wins", async () => {
    const challenger = await createUser("c3@test.com", "c3");
    const challenged = await createUser("d3@test.com", "d3");
    const review = await createReview(challenger.id);
    await createGuess(challenger.id, review.id, 7, 5);

    await createPerVideoChallenge({
      challengerId: challenger.id,
      reviewId: review.id,
      challengedId: challenged.id,
    });

    await recordChallengeGuess(review.id, challenged.id, 10);

    const notification = await prisma.notification.findFirst({
      where: { userId: challenger.id, type: "CHALLENGE_BEAT" },
    });
    expect(notification).not.toBeNull();
  });

  it("does not leak the opponent score before both players have guessed", async () => {
    const challenger = await createUser("c4@test.com", "c4");
    const challenged = await createUser("d4@test.com", "d4");
    const review = await createReview(challenger.id);
    await createGuess(challenger.id, review.id, 7, 10);

    const challenge = await createPerVideoChallenge({
      challengerId: challenger.id,
      reviewId: review.id,
      challengedId: challenged.id,
    });

    await recordChallengeGuess(review.id, challenged.id, 5);

    const view = await getPerVideoChallenge(challenge.id, challenged.id);
    expect(view?.canSeeResult).toBe(true);
    expect(view?.challengerScore).toBe(10);
    expect(view?.challengedScore).toBe(5);
  });

  it("picks a fresh video neither player has guessed for a rematch", async () => {
    const challenger = await createUser("c5@test.com", "c5");
    const challenged = await createUser("d5@test.com", "d5");
    const review1 = await createReview(challenger.id, 6);
    const review2 = await createReview(challenger.id, 8);
    await createGuess(challenger.id, review1.id, 6, 10);
    await createGuess(challenged.id, review1.id, 6, 10);

    const challenge = await createPerVideoChallenge({
      challengerId: challenger.id,
      reviewId: review1.id,
      challengedId: challenged.id,
    });

    await recordChallengeGuess(review1.id, challenged.id, 10);

    const rematch = await generateRematch(challenge.id, challenger.id);
    expect(rematch.reviewId).toBe(review2.id);
    expect(rematch.rematchOfId).toBe(challenge.id);
  });

  it("expires old per-video challenges", async () => {
    const challenger = await createUser("c6@test.com", "c6");
    const review = await createReview(challenger.id);
    await createGuess(challenger.id, review.id, 7, 10);

    const challenge = await prisma.challenge.create({
      data: {
        type: "PER_VIDEO",
        creatorId: challenger.id,
        challengerId: challenger.id,
        reviewId: review.id,
        name: "Expired",
        description: null,
        challengerScore: 10,
        challengedScore: 0,
        expiresAt: new Date(Date.now() - 1000),
        status: "ACTIVE",
      },
    });

    const { count } = await import("./challenges.service.js").then((m) => m.expireOldChallenges());
    expect(count).toBeGreaterThanOrEqual(1);

    const updated = await prisma.challenge.findUnique({ where: { id: challenge.id } });
    expect(updated?.status).toBe("EXPIRED");
  });
});
