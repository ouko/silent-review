import type { Product, Review } from "@silent-review/database"

const DAY_MS = 24 * 60 * 60 * 1000
const TEN_DAYS_MS = 10 * DAY_MS

/**
 * Compute a 0-100 "guessability" score for a review.
 *
 * The goal is to surface reviews that are fun to guess: they have enough
 * engagement to prove they are interesting, a divisive/hard rating distribution
 * so the answer is not obvious, an ideal video length, and a broadly familiar
 * product category.
 *
 * Weight breakdown:
 * - Engagement: up to 30
 *   - guessCount contributes up to 25 (saturates around 20 guesses)
 *   - likeCount contributes up to 5 (saturates around 50 likes)
 * - Guessability / divisiveness: up to 40
 *   - Rating distribution standard deviation up to 30 (spread opinions)
 *   - Exact-guess ratio up to 10 (ideal ~25% correct; too easy or too hard
 *     both hurt)
 * - Duration: up to 15
 *   - Ideal range is 15-60 seconds; very short or very long clips lose points
 * - Category familiarity: up to 10
 *   - Common-looking category names score higher; overly long/niche names
 *     are penalised
 * - Freshness: up to 5
 *   - Reviews created in the last 10 days get a small boost
 */
export function computeGuessabilityScore(
  review: Review & { product: Product; _count: { guesses: number } },
  distribution?: number[]
): number {
  const guessCount = Math.max(review.guessCount, review._count?.guesses ?? 0)
  const likeCount = review.likeCount
  const exactRatio = guessCount > 0 ? review.exactGuessCount / guessCount : 0

  // Engagement
  const guessScore = Math.min(25, guessCount * 1.25)
  const likeScore = Math.min(5, likeCount * 0.1)
  const engagementScore = guessScore + likeScore

  // Distribution / divisiveness
  let distributionScore = 15
  if (distribution && distribution.length === 10) {
    const total = distribution.reduce((a, b) => a + b, 0)
    if (total > 0) {
      const mean =
        distribution.reduce((sum, count, idx) => sum + count * (idx + 1), 0) /
        total
      const variance =
        distribution.reduce(
          (sum, count, idx) => sum + count * Math.pow(idx + 1 - mean, 2),
          0
        ) / total
      const stdDev = Math.sqrt(variance)
      distributionScore = Math.min(30, stdDev * 10)
    }
  }

  const exactRatioScore = Math.max(0, 10 - Math.abs(exactRatio - 0.25) * 40)
  const guessabilityScore = distributionScore + exactRatioScore

  // Duration
  const duration = review.duration
  let durationScore = 0
  if (duration >= 15 && duration <= 60) {
    durationScore = 15
  } else if (duration < 15) {
    durationScore = Math.max(0, (duration / 15) * 15)
  } else {
    durationScore = Math.max(0, 15 - ((duration - 60) / 120) * 15)
  }

  // Category familiarity (proxy because we do not have category frequency data)
  const category = review.product.category ?? ""
  const categoryScore = Math.max(
    0,
    10 - Math.max(0, category.length - 10) * 0.4
  )

  // Freshness
  const ageMs = Date.now() - review.createdAt.getTime()
  const freshnessScore = ageMs <= TEN_DAYS_MS ? 5 * (1 - ageMs / TEN_DAYS_MS) : 0

  const raw =
    engagementScore +
    guessabilityScore +
    durationScore +
    categoryScore +
    freshnessScore

  return Math.max(0, Math.min(100, Math.round(raw)))
}
