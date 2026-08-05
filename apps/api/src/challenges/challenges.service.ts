import { prisma } from "../prisma.js";

const CHALLENGE_TTL_HOURS = 24;
const MAX_ACTIVE_PER_VIDEO_CHALLENGES = 10;

export async function createChallenge(creatorId: string, name: string, description?: string) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CHALLENGE_TTL_HOURS);

  return prisma.challenge.create({
    data: {
      creatorId,
      name,
      description,
      expiresAt,
      status: "ACTIVE",
      participants: {
        create: { userId: creatorId, score: 0 },
      },
    },
  });
}

export interface CreatePerVideoChallengeInput {
  challengerId: string;
  reviewId: string;
  challengedId?: string | null;
  message?: string | null;
}

export async function createPerVideoChallenge(input: CreatePerVideoChallengeInput) {
  const { challengerId, reviewId, challengedId, message } = input;

  const [review, existingGuess] = await Promise.all([
    prisma.review.findUnique({
      where: { id: reviewId, deletedAt: null, status: "PUBLISHED" },
      include: { product: { select: { name: true } } },
    }),
    prisma.guess.findUnique({
      where: { userId_reviewId: { userId: challengerId, reviewId } },
    }),
  ]);

  if (!review) {
    throw new Error("Review not found or not available");
  }
  if (!existingGuess) {
    throw new Error("Challenger must play the video before challenging a friend");
  }

  const activeCount = await prisma.challenge.count({
    where: {
      type: "PER_VIDEO",
      status: "ACTIVE",
      OR: [{ challengerId }, { challengedId: challengerId }],
    },
  });
  if (activeCount >= MAX_ACTIVE_PER_VIDEO_CHALLENGES) {
    throw new Error("Too many active challenges. Finish some first.");
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CHALLENGE_TTL_HOURS);

  const defaultName = review.product?.name ? `Challenge on ${review.product.name}` : "Head-to-head challenge";
  const defaultDescription = message ?? `I scored ${existingGuess.score}/10 guessing this review — bet you can't beat me`;

  const challenge = await prisma.challenge.create({
    data: {
      type: "PER_VIDEO",
      creatorId: challengerId,
      challengerId,
      challengedId: challengedId ?? null,
      reviewId,
      name: defaultName,
      description: defaultDescription,
      challengerScore: existingGuess.score,
      challengedScore: 0,
      expiresAt,
      status: "ACTIVE",
    },
    include: {
      review: { select: { id: true, thumbnailUrl: true, product: { select: { name: true } } } },
      challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      challenged: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  if (challengedId) {
    const challengerName = challenge.challenger?.displayName ?? challenge.challenger?.username ?? "Someone";
    await prisma.notification.create({
      data: {
        userId: challengedId,
        type: "CHALLENGE_RECEIVED",
        title: "You've been challenged",
        body: `${challengerName} challenged you to beat their ${existingGuess.score}/10 score`,
        data: { challengeId: challenge.id, reviewId },
      },
    });
  }

  return challenge;
}

export async function acceptPerVideoChallenge(challengeId: string, userId: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId, type: "PER_VIDEO" },
  });
  if (!challenge || challenge.expiresAt < new Date() || challenge.status !== "ACTIVE") {
    throw new Error("Challenge expired or not found");
  }
  if (challenge.challengedId && challenge.challengedId !== userId) {
    throw new Error("This challenge is for someone else");
  }

  // If the challenge was created without a specific challenged user, the first
  // authenticated visitor becomes the challenged player.
  if (!challenge.challengedId) {
    return prisma.challenge.update({
      where: { id: challengeId },
      data: { challengedId: userId },
      include: {
        review: { select: { id: true, thumbnailUrl: true, product: { select: { name: true } } } },
        challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        challenged: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  return prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      review: { select: { id: true, thumbnailUrl: true, product: { select: { name: true } } } },
      challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      challenged: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
}

export async function recordChallengeGuess(reviewId: string, userId: string, score: number) {
  const challenge = await prisma.challenge.findFirst({
    where: {
      type: "PER_VIDEO",
      reviewId,
      status: "ACTIVE",
      OR: [{ challengerId: userId }, { challengedId: userId }],
    },
  });
  if (!challenge) return null;

  const isChallenger = challenge.challengerId === userId;
  const scoreField = isChallenger ? "challengerScore" : "challengedScore";

  const updated = await prisma.challenge.update({
    where: { id: challenge.id },
    data: { [scoreField]: score },
    include: {
      challenger: { select: { id: true, displayName: true, username: true } },
      challenged: { select: { id: true, displayName: true, username: true } },
    },
  });

  // Only evaluate the result when both scores are present.
  if (updated.challengerScore > 0 && updated.challengedScore > 0) {
    const winnerId =
      updated.challengedScore > updated.challengerScore
        ? updated.challengedId
        : updated.challengerScore > updated.challengedScore
          ? updated.challengerId
          : null;

    if (winnerId === updated.challengedId && updated.challengedId) {
      const loserId = updated.challengerId;
      if (loserId) {
        const challengerName = updated.challenger?.displayName ?? updated.challenger?.username ?? "Someone";
        await prisma.notification.create({
          data: {
            userId: loserId,
            type: "CHALLENGE_BEAT",
            title: `${challengerName} beat your score`,
            body: `They scored ${updated.challengedScore}/10 vs your ${updated.challengerScore}/10. Tap for a rematch!`,
            data: { challengeId: challenge.id, reviewId },
          },
        });
      }
    }
  }

  return updated;
}

export async function getPerVideoChallenge(id: string, viewerId: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id, type: "PER_VIDEO" },
    include: {
      review: {
        select: {
          id: true,
          videoUrl: true,
          thumbnailUrl: true,
          caption: true,
          productTag: true,
          rating: true,
          duration: true,
          createdAt: true,
          product: { select: { id: true, name: true, category: true } },
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      },
      challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      challenged: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      rematchOf: { select: { id: true } },
    },
  });

  if (!challenge) return null;

  const isParticipant = challenge.challengerId === viewerId || challenge.challengedId === viewerId;
  const bothGuessed = challenge.challengerScore > 0 && challenge.challengedScore > 0;

  // Spectators cannot see scores until the result is finalized.
  if (!isParticipant && !bothGuessed) {
    return null;
  }

  return {
    ...challenge,
    canSeeResult: bothGuessed,
    isParticipant,
  };
}

export async function generateRematch(challengeId: string, userId: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId, type: "PER_VIDEO" },
  });
  if (!challenge || challenge.status !== "ACTIVE") {
    throw new Error("Challenge not found or not active");
  }
  if (challenge.challengerId !== userId && challenge.challengedId !== userId) {
    throw new Error("Only participants can start a rematch");
  }
  if (challenge.challengerScore === 0 || challenge.challengedScore === 0) {
    throw new Error("Both players must guess before a rematch");
  }

  const challengerId = challenge.challengerId!;
  const challengedId = challenge.challengedId;
  if (!challengedId) {
    throw new Error("Cannot rematch an anonymous challenge");
  }

  const playedReviewIds = await prisma.guess.findMany({
    where: { OR: [{ userId: challengerId }, { userId: challengedId }] },
    select: { reviewId: true },
    distinct: ["reviewId"],
  });
  const excludeIds = new Set(playedReviewIds.map((g) => g.reviewId));
  // Also exclude the current challenge's video.
  excludeIds.add(challenge.reviewId!);

  const nextReview = await prisma.review.findFirst({
    where: {
      id: { notIn: Array.from(excludeIds) },
      deletedAt: null,
      status: "PUBLISHED",
    },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true } } },
  });

  if (!nextReview) {
    throw new Error("No fresh videos available for a rematch");
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CHALLENGE_TTL_HOURS);

  const rematch = await prisma.challenge.create({
    data: {
      type: "PER_VIDEO",
      creatorId: challengerId,
      challengerId,
      challengedId,
      reviewId: nextReview.id,
      rematchOfId: challenge.id,
      name: nextReview.product?.name ? `Rematch on ${nextReview.product.name}` : "Rematch",
      description: "Round two — may the best guesser win!",
      challengerScore: 0,
      challengedScore: 0,
      expiresAt,
      status: "ACTIVE",
    },
    include: {
      review: { select: { id: true, thumbnailUrl: true, product: { select: { name: true } } } },
      challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      challenged: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  // Notify the opponent that a rematch has started.
  const opponentId = userId === challengerId ? challengedId : challengerId;
  await prisma.notification.create({
    data: {
      userId: opponentId,
      type: "CHALLENGE_RECEIVED",
      title: "Rematch started",
      body: `${rematch.challenger?.displayName ?? rematch.challenger?.username ?? "Someone"} sent you a rematch`,
      data: { challengeId: rematch.id, reviewId: rematch.reviewId },
    },
  });

  return rematch;
}

export async function joinChallenge(challengeId: string, userId: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.expiresAt < new Date()) {
    throw new Error("Challenge expired or not found");
  }

  return prisma.challengeParticipant.upsert({
    where: { challengeId_userId: { challengeId, userId } },
    update: {},
    create: { challengeId, userId, score: 0 },
  });
}

export async function updateChallengeScore(challengeId: string, userId: string, scoreDelta: number) {
  return prisma.challengeParticipant.updateMany({
    where: { challengeId, userId },
    data: { score: { increment: scoreDelta } },
  });
}

export async function getActiveChallengesForUser(userId: string) {
  return prisma.challenge.findMany({
    where: {
      OR: [{ creatorId: userId }, { participants: { some: { userId } } }, { challengerId: userId }, { challengedId: userId }],
      status: "ACTIVE",
      expiresAt: { gte: new Date() },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        orderBy: { score: "desc" },
      },
      creator: { select: { id: true, username: true, displayName: true } },
      review: { select: { id: true, thumbnailUrl: true, product: { select: { name: true } } } },
      challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      challenged: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllActiveChallenges() {
  return prisma.challenge.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { gte: new Date() },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        orderBy: { score: "desc" },
      },
      creator: { select: { id: true, username: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function expireOldChallenges() {
  return prisma.challenge.updateMany({
    where: { expiresAt: { lt: new Date() }, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  });
}
