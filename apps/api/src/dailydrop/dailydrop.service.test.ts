import { jest } from '@jest/globals'
import { Prisma } from '@silent-review/database'
import { computeGuessabilityScore } from './guessability.js'

const mockPrisma: any = {
  $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
  dailyDrop: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
  guess: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  review: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
  contentCuration: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

jest.unstable_mockModule('../prisma.js', () => ({ prisma: mockPrisma }))
jest.unstable_mockModule('../guesses/guesses.service.js', () => ({
  calculateGuessScore: jest.fn((actual: number, guessed: number) => {
    const distance = Math.abs(actual - guessed)
    if (distance === 0) return 10
    if (distance === 1) return 5
    if (distance === 2) return 2
    return 0
  }),
}))
jest.unstable_mockModule('../gamification/streaks.service.js', () => ({
  updateStreak: jest.fn<() => Promise<{ streakDays: number; longestStreak: number }>>().mockResolvedValue({ streakDays: 1, longestStreak: 1 }),
}))

let service: any
beforeAll(async () => {
  service = await import('./dailydrop.service.js')
})

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`userId`,`dailyDropId`)',
    { code: 'P2002', clientVersion: '0.0.0', meta: { target: ['userId', 'dailyDropId'] } }
  )
}

function totalCreatedDailyDrops() {
  return mockPrisma.dailyDrop.create.mock.calls.length
}

describe('dailydrop service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('submitDailyDropAttempt', () => {
    it('rejects a double attempt with an already-played error', async () => {
      const userId = 'u1'
      const dailyDropId = 'dd1'
      const reviewId = 'r1'
      const guessedRating = 7

      mockPrisma.dailyDrop.findUnique.mockResolvedValue({
        id: dailyDropId,
        date: new Date(),
        reviewId,
        review: { id: reviewId, rating: 7 },
      })
      mockPrisma.guess.findUnique.mockResolvedValue(null)
      mockPrisma.guess.create.mockRejectedValue(uniqueConstraintError())

      await expect(
        service.submitDailyDropAttempt(userId, dailyDropId, guessedRating)
      ).rejects.toThrow(/already played|Already played|duplicate/i)
    })

    it('increments the streak only once and returns streakUpdated true on the first attempt', async () => {
      const userId = 'u1'
      const dailyDropId = 'dd1'
      const reviewId = 'r1'
      const guessedRating = 7

      mockPrisma.dailyDrop.findUnique.mockResolvedValue({
        id: dailyDropId,
        date: new Date(),
        reviewId,
        review: { id: reviewId, rating: 7, userId: 'u2' },
      })
      mockPrisma.guess.findUnique.mockResolvedValue(null)
      mockPrisma.guess.findFirst.mockResolvedValue(null)
      mockPrisma.guess.create.mockResolvedValue({
        id: 'g1',
        userId,
        dailyDropId,
        reviewId,
        guessedRating,
        score: 10,
        isCorrect: true,
      })
      mockPrisma.guess.count.mockResolvedValue(1)
      mockPrisma.review.update.mockResolvedValue({ id: reviewId })
      mockPrisma.user.update.mockResolvedValue({ id: userId })

      const result = await service.submitDailyDropAttempt(userId, dailyDropId, guessedRating)

      expect(result.score).toBe(10)
      expect(result.streakUpdated).toBe(true)
    })

    it('does not increment streak on a second daily drop attempt the same UTC day', async () => {
      const userId = 'u1'
      const dailyDropId = 'dd1'
      const reviewId = 'r1'
      const guessedRating = 7

      mockPrisma.dailyDrop.findUnique.mockResolvedValue({
        id: dailyDropId,
        date: new Date(),
        reviewId,
        review: { id: reviewId, rating: 7, userId: 'u2' },
      })
      mockPrisma.guess.findUnique.mockResolvedValue(null)
      mockPrisma.guess.findFirst.mockResolvedValue({ id: 'previous-guess' })
      mockPrisma.guess.create.mockResolvedValue({
        id: 'g1',
        userId,
        dailyDropId,
        reviewId,
        guessedRating,
        score: 10,
        isCorrect: true,
      })
      mockPrisma.guess.count.mockResolvedValue(1)
      mockPrisma.review.update.mockResolvedValue({ id: reviewId })
      mockPrisma.user.update.mockResolvedValue({ id: userId })

      const result = await service.submitDailyDropAttempt(userId, dailyDropId, guessedRating)

      expect(result.streakUpdated).toBe(false)
    })
  })

  describe('scheduleDailyDrops', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-04T00:00:00.000Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('fills the next 90 UTC days that are not already scheduled', async () => {
      mockPrisma.dailyDrop.findMany.mockResolvedValue([
        { id: 'dd1', date: new Date('2026-08-04T00:00:00.000Z'), reviewId: 'r1' },
        { id: 'dd2', date: new Date('2026-08-05T00:00:00.000Z'), reviewId: 'r2' },
      ])

      const candidates = Array.from({ length: 100 }, (_, i) => ({
        id: `r${i}`,
        rating: 5 + (i % 6),
        duration: 10,
        guessCount: i,
        exactGuessCount: Math.floor(i / 10),
        likeCount: i * 2,
        product: { id: `p${i}`, category: 'audio' },
        _count: { guesses: i },
        createdAt: new Date('2026-08-03T00:00:00.000Z'),
      }))
      mockPrisma.review.findMany.mockResolvedValue(candidates)
      mockPrisma.guess.groupBy.mockResolvedValue([])
      mockPrisma.contentCuration.findMany.mockResolvedValue([])
      mockPrisma.contentCuration.findFirst.mockResolvedValue(null)
      mockPrisma.contentCuration.create.mockResolvedValue({})
      mockPrisma.dailyDrop.create.mockResolvedValue({})

      const result = await service.scheduleDailyDrops()

      expect(result.scheduled).toBe(88)
      expect(totalCreatedDailyDrops()).toBe(88)
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED', deletedAt: null }),
        })
      )
    })
  })

  describe('computeGuessabilityScore', () => {
    it('returns a score between 0 and 100', () => {
      const review = {
        id: 'r1',
        rating: 7,
        guessCount: 20,
        exactGuessCount: 2,
        likeCount: 15,
        duration: 12,
        product: { category: 'audio' },
        _count: { guesses: 20 },
        createdAt: new Date(),
      } as any

      const score = computeGuessabilityScore(review)

      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('prefers divisive, high-engagement reviews', () => {
      const boring = {
        id: 'r1',
        rating: 5,
        guessCount: 2,
        exactGuessCount: 2,
        likeCount: 0,
        duration: 5,
        product: { category: 'audio' },
        _count: { guesses: 2 },
        createdAt: new Date(),
      } as any

      const divisive = {
        id: 'r2',
        rating: 5,
        guessCount: 100,
        exactGuessCount: 10,
        likeCount: 80,
        duration: 20,
        product: { category: 'audio' },
        _count: { guesses: 100 },
        createdAt: new Date(),
      } as any

      expect(computeGuessabilityScore(divisive))
        .toBeGreaterThan(computeGuessabilityScore(boring))
    })
  })
})
