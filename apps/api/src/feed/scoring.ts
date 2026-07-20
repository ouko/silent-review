export interface ReviewCandidate {
  id: string;
  userId: string;
  productId: string;
  productTag: string | null;
  createdAt: Date;
  viewCount: number;
  likeCount: number;
  guessCount: number;
  commentCount: number;
  shareCount: number;
  exactGuessCount: number;
}

export interface UserProfile {
  followingIds: Set<string>;
  interestCategories: Map<string, number>;
  seenReviewIds: Set<string>;
}

const WEIGHTS = {
  recency: 0.3,
  engagement: 0.25,
  interest: 0.2,
  following: 0.15,
  diversity: 0.1,
};

/**
 * Score a review for the For You feed.
 * Mix: 30% recency, 25% engagement, 20% interest, 15% following, 10% diversity.
 */
export function scoreReview(review: ReviewCandidate, user: UserProfile): number {
  const recencyScore = calculateRecencyScore(review.createdAt);
  const engagementScore = calculateEngagementScore(review);
  const interestScore = calculateInterestScore(review, user.interestCategories);
  const followingScore = user.followingIds.has(review.userId) ? 1 : 0;
  const diversityScore = calculateDiversityScore(review, user.interestCategories);

  return (
    recencyScore * WEIGHTS.recency +
    engagementScore * WEIGHTS.engagement +
    interestScore * WEIGHTS.interest +
    followingScore * WEIGHTS.following +
    diversityScore * WEIGHTS.diversity
  );
}

function calculateRecencyScore(createdAt: Date): number {
  const hoursAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  // Decay over 7 days.
  return Math.max(0, 1 - hoursAgo / (7 * 24));
}

function calculateEngagementScore(review: ReviewCandidate): number {
  // Normalize engagement by view count to avoid popularity bias.
  const views = Math.max(review.viewCount, 1);
  const likeRate = review.likeCount / views;
  const guessRate = review.guessCount / views;
  const commentRate = review.commentCount / views;
  const exactRate = review.guessCount > 0 ? review.exactGuessCount / review.guessCount : 0;

  return Math.min(1, likeRate * 2 + guessRate * 1.5 + commentRate * 3 + exactRate * 2);
}

function calculateInterestScore(
  review: ReviewCandidate,
  interests: Map<string, number>
): number {
  if (!review.productTag) return 0;
  const interest = interests.get(review.productTag.toLowerCase()) ?? 0;
  // Normalize by max assumed interest score.
  return Math.min(1, interest / 10);
}

function calculateDiversityScore(
  review: ReviewCandidate,
  interests: Map<string, number>
): number {
  // Reward content from categories the user has NOT interacted with heavily.
  if (!review.productTag) return 0.5;
  const interest = interests.get(review.productTag.toLowerCase()) ?? 0;
  return interest > 5 ? 0 : 0.8;
}
