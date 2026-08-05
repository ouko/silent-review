import { jest } from '@jest/globals';
import { Prisma } from '@silent-review/database';

const mockPrisma: any = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  achievement: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  userAchievement: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  notification: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn((cb: any) => cb(mockPrisma)),
};

jest.unstable_mockModule('../prisma.js', () => ({ prisma: mockPrisma }));

let milestones: any;
beforeAll(async () => {
  milestones = await import('./milestones.service.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

it('awards a 7-day milestone once', async () => {
  mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', totalPoints: 0 });
  mockPrisma.userAchievement.findMany.mockResolvedValue([]);
  mockPrisma.achievement.findUnique.mockResolvedValue({ id: 'a1', slug: 'streak_7', name: 'Week Warrior', points: 50 });
  mockPrisma.userAchievement.create.mockResolvedValue({});
  mockPrisma.user.update.mockResolvedValue({});
  mockPrisma.notification.createMany.mockResolvedValue({});

  const result = await milestones.checkStreakMilestones('u1', 7);

  expect(result).toHaveLength(1);
  expect(result[0].slug).toBe('streak_7');
  expect(mockPrisma.userAchievement.create).toHaveBeenCalledTimes(1);
});

it('is idempotent when milestones already unlocked', async () => {
  mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', totalPoints: 0 });
  mockPrisma.userAchievement.findMany.mockResolvedValue([
    { achievement: { slug: 'streak_7' } },
  ]);

  const result = await milestones.checkStreakMilestones('u1', 10);

  expect(result).toHaveLength(0);
  expect(mockPrisma.userAchievement.create).not.toHaveBeenCalled();
});

it('awards multiple milestones together for a 100-day streak', async () => {
  mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', totalPoints: 0 });
  mockPrisma.userAchievement.findMany.mockResolvedValue([]);
  mockPrisma.achievement.findUnique.mockImplementation((args: any) => {
    const bySlug: Record<string, { id: string; slug: string; name: string; points: number }> = {
      streak_7: { id: 'a7', slug: 'streak_7', name: 'Week Warrior', points: 50 },
      streak_30: { id: 'a30', slug: 'streak_30', name: 'Month Master', points: 100 },
      streak_100: { id: 'a100', slug: 'streak_100', name: 'Century Streak', points: 250 },
    };
    return bySlug[args.where.slug] ?? null;
  });
  mockPrisma.userAchievement.create.mockResolvedValue({});
  mockPrisma.user.update.mockResolvedValue({});
  mockPrisma.notification.createMany.mockResolvedValue({});

  const result = await milestones.checkStreakMilestones('u1', 100);

  expect(result).toHaveLength(3);
  expect(result.map((r: any) => r.slug)).toEqual(['streak_7', 'streak_30', 'streak_100']);
  expect(mockPrisma.userAchievement.create).toHaveBeenCalledTimes(3);
});

it('increments totalPoints by the correct amount for each milestone', async () => {
  mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', totalPoints: 0 });
  mockPrisma.userAchievement.findMany.mockResolvedValue([]);
  mockPrisma.achievement.findUnique.mockImplementation((args: any) => {
    const bySlug: Record<string, { id: string; slug: string; name: string; points: number }> = {
      streak_7: { id: 'a7', slug: 'streak_7', name: 'Week Warrior', points: 50 },
      streak_30: { id: 'a30', slug: 'streak_30', name: 'Month Master', points: 100 },
      streak_100: { id: 'a100', slug: 'streak_100', name: 'Century Streak', points: 250 },
    };
    return bySlug[args.where.slug] ?? null;
  });
  mockPrisma.userAchievement.create.mockResolvedValue({});
  mockPrisma.user.update.mockResolvedValue({});
  mockPrisma.notification.createMany.mockResolvedValue({});

  await milestones.checkStreakMilestones('u1', 100);

  const increments = mockPrisma.user.update.mock.calls.map((call: any) => call[0].data.totalPoints.increment);
  expect(increments).toEqual([50, 100, 250]);
});

it('creates notifications with the correct payload', async () => {
  mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', totalPoints: 0 });
  mockPrisma.userAchievement.findMany.mockResolvedValue([]);
  mockPrisma.achievement.findUnique.mockImplementation((args: any) => {
    const bySlug: Record<string, { id: string; slug: string; name: string; points: number }> = {
      streak_7: { id: 'a7', slug: 'streak_7', name: 'Week Warrior', points: 50 },
      streak_30: { id: 'a30', slug: 'streak_30', name: 'Month Master', points: 100 },
      streak_100: { id: 'a100', slug: 'streak_100', name: 'Century Streak', points: 250 },
    };
    return bySlug[args.where.slug] ?? null;
  });
  mockPrisma.userAchievement.create.mockResolvedValue({});
  mockPrisma.user.update.mockResolvedValue({});
  mockPrisma.notification.createMany.mockResolvedValue({});

  await milestones.checkStreakMilestones('u1', 100);

  expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
  expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
    data: [
      {
        userId: 'u1',
        type: 'ACHIEVEMENT',
        title: '🔥 7-day streak!',
        body: 'You earned the Week Warrior badge.',
        data: { achievementSlug: 'streak_7', streakDays: 7 },
      },
      {
        userId: 'u1',
        type: 'ACHIEVEMENT',
        title: '🔥 30-day streak!',
        body: 'You earned the Month Master badge.',
        data: { achievementSlug: 'streak_30', streakDays: 30 },
      },
      {
        userId: 'u1',
        type: 'ACHIEVEMENT',
        title: '🔥 100-day streak!',
        body: 'You earned the Century Streak badge.',
        data: { achievementSlug: 'streak_100', streakDays: 100 },
      },
    ],
  });
});

it('seeds milestone achievements via ensureAchievements', async () => {
  mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', totalPoints: 0 });
  mockPrisma.userAchievement.findMany.mockResolvedValue([
    { achievement: { slug: 'streak_7' } },
    { achievement: { slug: 'streak_30' } },
    { achievement: { slug: 'streak_100' } },
    { achievement: { slug: 'streak_365' } },
  ]);

  await milestones.checkStreakMilestones('u1', 365);

  expect(mockPrisma.achievement.upsert).toHaveBeenCalledTimes(4);
  expect(mockPrisma.achievement.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { slug: 'streak_7' },
      create: expect.objectContaining({ points: 50 }),
    })
  );
  expect(mockPrisma.achievement.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { slug: 'streak_365' },
      create: expect.objectContaining({ points: 1000 }),
    })
  );
});

it('handles a P2002 race gracefully', async () => {
  mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', totalPoints: 0 });
  mockPrisma.userAchievement.findMany.mockResolvedValue([]);
  mockPrisma.achievement.findUnique.mockImplementation((args: any) => {
    const bySlug: Record<string, { id: string; slug: string; name: string; points: number }> = {
      streak_7: { id: 'a7', slug: 'streak_7', name: 'Week Warrior', points: 50 },
      streak_30: { id: 'a30', slug: 'streak_30', name: 'Month Master', points: 100 },
      streak_100: { id: 'a100', slug: 'streak_100', name: 'Century Streak', points: 250 },
    };
    return bySlug[args.where.slug] ?? null;
  });

  const raceError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '0.0.0',
  });
  mockPrisma.userAchievement.create
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(raceError)
    .mockResolvedValueOnce({});
  mockPrisma.user.update.mockResolvedValue({});
  mockPrisma.notification.createMany.mockResolvedValue({});

  const result = await milestones.checkStreakMilestones('u1', 100);

  expect(result.map((r: any) => r.slug)).toEqual(['streak_7', 'streak_100']);
  expect(mockPrisma.userAchievement.create).toHaveBeenCalledTimes(3);
  expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
});
