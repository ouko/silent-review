import crypto from "crypto";

export function createUser(overrides: Partial<{ id: string; email: string; username: string }> = {}) {
  const id = overrides.id ?? crypto.randomUUID();
  return {
    id,
    email: overrides.email ?? `user-${id.slice(0, 6)}@example.com`,
    username: overrides.username ?? `user-${id.slice(0, 6)}`,
    displayName: null,
    avatarUrl: null,
    passwordHash: null,
    role: "USER",
    totalReviews: 0,
    totalGuesses: 0,
    totalPoints: 0,
    streakDays: 0,
    longestStreak: 0,
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

export function createProduct(overrides: Partial<{ id: string; name: string; category: string }> = {}) {
  const id = overrides.id ?? crypto.randomUUID();
  return {
    id,
    name: overrides.name ?? `Product ${id.slice(0, 6)}`,
    brand: "Test Brand",
    category: overrides.category ?? "electronics",
    description: "A test product",
    imageUrl: null,
    affiliateUrl: null,
    tags: [],
    metadata: {},
    searchVector: null,
    moderationStatus: "APPROVED",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

export function createReview(overrides: Partial<{ id: string; userId: string; productId: string; rating: number }> = {}) {
  const id = overrides.id ?? crypto.randomUUID();
  return {
    id,
    userId: overrides.userId ?? crypto.randomUUID(),
    productId: overrides.productId ?? crypto.randomUUID(),
    videoUrl: `https://example.com/video-${id}.mp4`,
    thumbnailUrl: null,
    duration: 5.0,
    format: "video/mp4",
    rating: overrides.rating ?? 7,
    caption: "Test review",
    productTag: null,
    viewCount: 0,
    likeCount: 0,
    guessCount: 0,
    commentCount: 0,
    shareCount: 0,
    exactGuessCount: 0,
    duetOfId: null,
    status: "PUBLISHED",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

export function createGuess(overrides: Partial<{ userId: string; reviewId: string; guessedRating: number }> = {}) {
  return {
    id: crypto.randomUUID(),
    userId: overrides.userId ?? crypto.randomUUID(),
    reviewId: overrides.reviewId ?? crypto.randomUUID(),
    guessedRating: overrides.guessedRating ?? 5,
    isCorrect: false,
    score: 0,
    createdAt: new Date(),
  };
}
