import { describe, it, expect } from "@jest/globals"
import { computeGuessabilityScore } from "./guessability.js"
import type { Product, Review } from "@silent-review/database"

function makeReview(
  overrides: Partial<Review> & { product?: Partial<Product> } = {}
): Review & { product: Product; _count: { guesses: number } } {
  const now = new Date()
  const product: Product = {
    id: "p1",
    name: "Widget",
    category: overrides.product?.category ?? "Electronics",
    brand: null,
    description: null,
    imageUrl: null,
    affiliateUrl: null,
    clickCount: 0,
    tags: [],
    metadata: {},
    ownerId: null,
    searchVector: null,
    moderationStatus: "APPROVED",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides.product,
  }

  return {
    id: "r1",
    userId: "u1",
    productId: product.id,
    videoUrl: "https://example.com/video.mp4",
    thumbnailUrl: null,
    duration: 30,
    format: "video/mp4",
    rating: 7,
    caption: null,
    productTag: null,
    allowComments: true,
    viewCount: 0,
    completeCount: 0,
    likeCount: 0,
    guessCount: 0,
    commentCount: 0,
    shareCount: 0,
    exactGuessCount: 0,
    duetOfId: null,
    status: "PUBLISHED",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    product,
    _count: { guesses: 0 },
    ...overrides,
  } as unknown as Review & { product: Product; _count: { guesses: number } }
}

function flatDistribution(): number[] {
  // 1 guess per rating -> high spread
  return Array.from({ length: 10 }, () => 1)
}

function polarizedDistribution(): number[] {
  // Half 1s, half 10s -> very divisive
  return [5, 0, 0, 0, 0, 0, 0, 0, 0, 5]
}

function unanimousDistribution(): number[] {
  // Everyone guessed the same rating -> low divisiveness
  return [0, 0, 0, 0, 0, 10, 0, 0, 0, 0]
}

describe("computeGuessabilityScore", () => {
  it("returns a score between 0 and 100", () => {
    const score = computeGuessabilityScore(makeReview())
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it("prefers reviews with high engagement", () => {
    const base = computeGuessabilityScore(makeReview())
    const engaged = computeGuessabilityScore(
      makeReview({ guessCount: 30, likeCount: 80 })
    )
    expect(engaged).toBeGreaterThan(base)
  })

  it("prefers divisive rating distributions over unanimous ones", () => {
    const review = makeReview({ guessCount: 10, exactGuessCount: 2 })
    const flat = computeGuessabilityScore(review, flatDistribution())
    const polarized = computeGuessabilityScore(review, polarizedDistribution())
    const unanimous = computeGuessabilityScore(review, unanimousDistribution())

    expect(polarized).toBeGreaterThan(unanimous)
    expect(flat).toBeGreaterThan(unanimous)
  })

  it("penalises very short and very long videos", () => {
    const ideal = computeGuessabilityScore(makeReview({ duration: 30 }))
    const short = computeGuessabilityScore(makeReview({ duration: 5 }))
    const long = computeGuessabilityScore(makeReview({ duration: 300 }))

    expect(ideal).toBeGreaterThan(short)
    expect(ideal).toBeGreaterThan(long)
  })

  it("rewards an exact-guess ratio near 25%", () => {
    const lowExact = computeGuessabilityScore(
      makeReview({ guessCount: 20, exactGuessCount: 0 })
    )
    const idealExact = computeGuessabilityScore(
      makeReview({ guessCount: 20, exactGuessCount: 5 })
    )
    const highExact = computeGuessabilityScore(
      makeReview({ guessCount: 20, exactGuessCount: 18 })
    )

    expect(idealExact).toBeGreaterThan(lowExact)
    expect(idealExact).toBeGreaterThan(highExact)
  })
})
