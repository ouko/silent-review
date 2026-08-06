import { join } from "path";
import { prisma } from "../prisma.js";
import { getRedis } from "../redis.js";
import { notifyFollowersOfReview } from "../socket/index.js";
import { checkAchievements } from "../gamification/achievements.service.js";
import { addPoints } from "../gamification/points.service.js";
import { enqueueModeration } from "../upload/moderationQueue.js";
import { UPLOAD_BASE_URL, UPLOAD_DIR } from "../upload/upload-helpers.js";
import { env } from "../config/index.js";
import type { CreateReviewInput } from "./reviews.validation.js";

export async function createReview(userId: string, input: CreateReviewInput) {
  // Duplicate detection: one review per user per product.
  const existing = await prisma.review.findFirst({
    where: { userId, productId: input.productId, deletedAt: null },
  });

  // Check moderation status for this video before publishing.
  const moderation = await prisma.videoModeration.findFirst({
    where: { review: { videoUrl: input.videoUrl } },
    orderBy: { createdAt: "desc" },
  });

  if (moderation?.status === "REJECT") {
    throw new Error("Video moderation failed: content violates community guidelines");
  }

  const isModerationEnabled = env.VIDEO_MODERATION_ENABLED === "true";
  const moderationPending =
    moderation?.status === "PENDING" || (isModerationEnabled && !moderation);

  if (existing) {
    // Edit in place rather than creating a duplicate.
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: {
        videoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl ?? existing.thumbnailUrl,
        duration: input.duration,
        format: input.format,
        rating: input.rating,
        caption: input.caption,
        productTag: input.productTag,
        status: moderationPending ? "UNDER_REVIEW" : "PUBLISHED",
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        product: { select: { id: true, name: true, category: true, affiliateUrl: true } },
      },
    });
    clearFeedCache().catch(() => {});
    return updated;
  }

  const initialStatus = moderationPending ? "UNDER_REVIEW" : "PUBLISHED";

  const review = await prisma.review.create({
    data: { ...input, userId, status: initialStatus },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      product: { select: { id: true, name: true, category: true, affiliateUrl: true } },
    },
  });

  // If moderation is enabled and no moderation record exists yet for this
  // video, create a pending record and enqueue async moderation now that we
  // have a reviewId to link it to.
  if (env.VIDEO_MODERATION_ENABLED === "true" && !moderation) {
    await prisma.videoModeration.create({
      data: {
        reviewId: review.id,
        status: "PENDING",
      },
    });
    const absolutePath = videoUrlToAbsolutePath(input.videoUrl);
    if (absolutePath) {
      enqueueModeration(absolutePath, input.duration, review.id);
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totalReviews: { increment: 1 } },
  });

  // Gamification updates (fire-and-forget)
  addPoints(userId, 10)
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

  // Ensure newly created reviews are visible in the feed immediately.
  clearFeedCache().catch(() => {});

  return review;
}

function videoUrlToAbsolutePath(videoUrl: string): string | null {
  const uploadPrefix = `${UPLOAD_BASE_URL}/`;
  if (!videoUrl.startsWith(uploadPrefix)) {
    return null;
  }
  return join(UPLOAD_DIR, videoUrl.slice(uploadPrefix.length));
}

async function clearFeedCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const stream = redis.scanStream({ match: "feed:*", count: 100 });
  const keysToDelete: string[] = [];

  stream.on("data", (keys: string[]) => {
    if (keys.length) keysToDelete.push(...keys);
  });

  await new Promise<void>((resolve, reject) => {
    stream.on("end", () => resolve());
    stream.on("error", reject);
  });

  if (keysToDelete.length) {
    await redis.del(...keysToDelete);
  }
}

export async function getReviewById(reviewId: string) {
  return prisma.review.findUnique({
    where: { id: reviewId, deletedAt: null },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      product: { select: { id: true, name: true, category: true, affiliateUrl: true } },
      _count: { select: { likes: true, comments: true, guesses: true } },
    },
  });
}
