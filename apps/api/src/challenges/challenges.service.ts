import { prisma } from "../prisma.js";

const CHALLENGE_TTL_HOURS = 24;

export async function createChallenge(creatorId: string, name: string, description?: string) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CHALLENGE_TTL_HOURS);

  return prisma.challenge.create({
    data: {
      creatorId,
      name,
      description,
      expiresAt,
      participants: {
        create: { userId: creatorId, score: 0 },
      },
    },
  });
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
      OR: [{ creatorId: userId }, { participants: { some: { userId } } }],
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
