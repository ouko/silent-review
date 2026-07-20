import { prisma } from "../prisma.js";
import { getRedis } from "../redis.js";
import { scoreReview, type ReviewCandidate, type UserProfile } from "./scoring.js";

const CACHE_TTL_SECONDS = 5 * 60;
const CANDIDATE_POOL_SIZE = 200;

export interface FeedResult {
  reviews: Array<{
    id: string;
    videoUrl: string;
    thumbnailUrl: string | null;
    caption: string | null;
    productTag: string | null;
    rating: number;
    duration: number;
    createdAt: string;
    updatedAt: string;
    viewCount: number;
    likeCount: number;
    guessCount: number;
    commentCount: number;
    shareCount: number;
    user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
    product: { id: string; name: string; category: string };
  }>;
  nextCursor?: string;
}

export async function getForYouFeed(
  userId: string | undefined,
  cursor: string | undefined,
  limit: number
): Promise<FeedResult> {
  const cacheKey = userId ? `feed:fyp:${userId}:${cursor ?? "head"}` : `feed:fyp:anonymous:${cursor ?? "head"}`;
  const redis = getRedis();

  const cached = redis ? await redis.get(cacheKey).catch(() => null) : null;
  if (cached) {
    return JSON.parse(cached) as FeedResult;
  }

  const userProfile = userId ? await buildUserProfile(userId) : emptyProfile();
  const candidates = await fetchCandidates(userProfile.seenReviewIds, cursor);

  const scored = candidates.map((review) => ({
    review,
    score: scoreReview(review, userProfile),
  }));

  // 20% diversity injection: reserve slots for outside-interest content.
  const sortedByScore = scored.sort((a, b) => b.score - a.score);
  const diverse = scored
    .filter((s) => calculateDiversityFlag(s.review, userProfile.interestCategories))
    .sort((a, b) => b.score - a.score);

  const result: typeof sortedByScore = [];
  let diversityIndex = 0;
  for (let i = 0; i < sortedByScore.length; i++) {
    if ((i + 1) % 5 === 0 && diverse[diversityIndex]) {
      result.push(diverse[diversityIndex++]);
    } else {
      result.push(sortedByScore[i]);
    }
  }

  const paginated = result.slice(0, limit);
  const nextCursor = candidates.length === CANDIDATE_POOL_SIZE
    ? paginated[paginated.length - 1]?.review.id
    : undefined;

  const feed: FeedResult = {
    reviews: paginated.map((s) => formatReview(s.review)),
    nextCursor,
  };

  if (redis) {
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(feed)).catch(() => {});
  }

  return feed;
}

export async function getFollowingFeed(
  userId: string,
  cursor: string | undefined,
  limit: number
): Promise<FeedResult> {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const reviews = await prisma.review.findMany({
    where: {
      userId: { in: followingIds },
      status: "PUBLISHED",
      deletedAt: null,
      ...(cursor ? { createdAt: { lt: await getCursorDate(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      product: { select: { id: true, name: true, category: true } },
    },
  });

  const nextCursor = reviews.length === limit ? reviews[reviews.length - 1].id : undefined;
  return { reviews: reviews.map(formatReview), nextCursor };
}

export async function getTrendingFeed(cursor: string | undefined, limit: number): Promise<FeedResult> {
  const reviews = await prisma.review.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      ...(cursor ? { createdAt: { lt: await getCursorDate(cursor) } } : {}),
    },
    orderBy: [{ guessCount: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      product: { select: { id: true, name: true, category: true } },
    },
  });

  const nextCursor = reviews.length === limit ? reviews[reviews.length - 1].id : undefined;
  return { reviews: reviews.map(formatReview), nextCursor };
}

export async function getCategoryFeed(
  category: string,
  cursor: string | undefined,
  limit: number
): Promise<FeedResult> {
  const reviews = await prisma.review.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      product: { category },
      ...(cursor ? { createdAt: { lt: await getCursorDate(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      product: { select: { id: true, name: true, category: true } },
    },
  });

  const nextCursor = reviews.length === limit ? reviews[reviews.length - 1].id : undefined;
  return { reviews: reviews.map(formatReview), nextCursor };
}

async function buildUserProfile(userId: string): Promise<UserProfile> {
  const [following, guesses, likes, reviews] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    prisma.guess.findMany({
      where: { userId },
      include: { review: { select: { productTag: true } } },
    }),
    prisma.like.findMany({
      where: { userId },
      include: { review: { select: { productTag: true } } },
    }),
    prisma.review.findMany({
      where: { userId, deletedAt: null },
      select: { productTag: true },
    }),
  ]);

  const interests = new Map<string, number>();
  const addInterest = (tag: string | null) => {
    if (!tag) return;
    const key = tag.toLowerCase();
    interests.set(key, (interests.get(key) ?? 0) + 1);
  };

  guesses.forEach((g) => addInterest(g.review.productTag));
  likes.forEach((l) => addInterest(l.review.productTag));
  reviews.forEach((r) => addInterest(r.productTag));

  const seenReviewIds = new Set<string>(guesses.map((g) => g.reviewId));

  return {
    followingIds: new Set(following.map((f) => f.followingId)),
    interestCategories: interests,
    seenReviewIds,
  };
}

function emptyProfile(): UserProfile {
  return {
    followingIds: new Set(),
    interestCategories: new Map(),
    seenReviewIds: new Set(),
  };
}

async function fetchCandidates(seenReviewIds: Set<string>, cursor: string | undefined): Promise<FormattableReview[]> {
  const reviews = await prisma.review.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      id: { notIn: Array.from(seenReviewIds) },
      ...(cursor ? { createdAt: { lt: await getCursorDate(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: CANDIDATE_POOL_SIZE,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      product: { select: { id: true, name: true, category: true } },
    },
  });
  return reviews as FormattableReview[];
}

async function getCursorDate(cursor: string): Promise<Date> {
  const review = await prisma.review.findUnique({
    where: { id: cursor },
    select: { createdAt: true },
  });
  return review?.createdAt ?? new Date();
}

function calculateDiversityFlag(review: ReviewCandidate, interests: Map<string, number>): boolean {
  const tag = review.productTag?.toLowerCase();
  if (!tag) return true;
  return (interests.get(tag) ?? 0) <= 3;
}

interface FormattableReview extends ReviewCandidate {
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  rating: number;
  duration: number;
  updatedAt: Date;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  product: { id: string; name: string; category: string };
}

function formatReview(review: FormattableReview): FeedResult["reviews"][number] {
  return {
    id: review.id,
    videoUrl: review.videoUrl,
    thumbnailUrl: review.thumbnailUrl,
    caption: review.caption,
    productTag: review.productTag,
    rating: review.rating,
    duration: review.duration,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    viewCount: review.viewCount,
    likeCount: review.likeCount,
    guessCount: review.guessCount,
    commentCount: review.commentCount,
    shareCount: review.shareCount,
    user: review.user,
    product: review.product,
  };
}
