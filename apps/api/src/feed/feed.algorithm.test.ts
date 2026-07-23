import { scoreReview, type ReviewCandidate, type UserProfile } from "./scoring.js";

describe("scoreReview", () => {
  const baseUser: UserProfile = {
    followingIds: new Set(),
    interestCategories: new Map(),
    seenReviewIds: new Set(),
  };

  function makeReview(overrides: Partial<ReviewCandidate> = {}): ReviewCandidate {
    return {
      id: "r1",
      userId: "u1",
      productId: "p1",
      productTag: "electronics",
      createdAt: new Date(),
      viewCount: 100,
      likeCount: 10,
      guessCount: 20,
      commentCount: 5,
      shareCount: 2,
      exactGuessCount: 3,
      ...overrides,
    };
  }

  it("scores a followed user's review higher", () => {
    const review = makeReview();
    const followingUser: UserProfile = {
      ...baseUser,
      followingIds: new Set(["u1"]),
    };
    expect(scoreReview(review, followingUser)).toBeGreaterThan(scoreReview(review, baseUser));
  });

  it("scores recent content higher than old content", () => {
    const recent = makeReview({ createdAt: new Date() });
    const old = makeReview({ createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) });
    expect(scoreReview(recent, baseUser)).toBeGreaterThan(scoreReview(old, baseUser));
  });

  it("scores high-engagement content higher", () => {
    const low = makeReview({ viewCount: 1000, likeCount: 0, guessCount: 0, commentCount: 0 });
    const high = makeReview({ viewCount: 100, likeCount: 50, guessCount: 80, commentCount: 30 });
    expect(scoreReview(high, baseUser)).toBeGreaterThan(scoreReview(low, baseUser));
  });

  it("boosts content matching user interests", () => {
    const review = makeReview({ productTag: "skincare" });
    const interestedUser: UserProfile = {
      ...baseUser,
      interestCategories: new Map([["skincare", 8]]),
    };
    expect(scoreReview(review, interestedUser)).toBeGreaterThan(scoreReview(review, baseUser));
  });
});
