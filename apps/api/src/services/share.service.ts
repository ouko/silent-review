import { prisma } from "../prisma.js";

export interface RecordShareInput {
  userId: string;
  reviewId: string;
  provider: string;
  utmCampaign?: string;
  utmContent?: string;
  ipHash?: string;
}

export async function recordShare(input: RecordShareInput) {
  // Debounce: ignore duplicate shares from same user/review/provider within 5 seconds.
  const cutoff = new Date(Date.now() - 5000);
  const existing = await prisma.shareEvent.findFirst({
    where: {
      userId: input.userId,
      reviewId: input.reviewId,
      provider: input.provider,
      createdAt: { gte: cutoff },
    },
  });
  if (existing) return existing;

  return prisma.shareEvent.create({ data: input });
}

export async function getShareAnalytics(reviewId?: string) {
  const where = reviewId ? { reviewId } : {};
  const [total, byProvider] = await Promise.all([
    prisma.shareEvent.count({ where }),
    prisma.shareEvent.groupBy({
      by: ["provider"],
      where,
      _count: { provider: true },
    }),
  ]);
  return {
    total,
    byProvider: byProvider.map((g) => ({ provider: g.provider, count: g._count.provider })),
  };
}
