import { jest } from '@jest/globals';

const mockPrisma: any = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
  event: {
    create: jest.fn(),
    createMany: jest.fn(),
  },
  achievement: {
    findUnique: jest.fn(),
  },
  userAchievement: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

jest.unstable_mockModule('../prisma.js', () => ({ prisma: mockPrisma }));
jest.unstable_mockModule('./milestones.service.js', () => ({
  checkStreakMilestones: jest.fn<() => Promise<never[]>>().mockResolvedValue([]),
}));

let streaks: any;
beforeAll(async () => {
  streaks = await import('./streaks.service.js');
});

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('updateStreak', () => {
  it('increments streak on consecutive UTC days', async () => {
    const yesterday = new Date(Date.UTC(2026, 7, 3, 12, 0, 0));
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', streakDays: 3, longestStreak: 5, lastActiveAt: yesterday, freezeHeld: 0, lastFreezeEarnedAt: null });
    mockPrisma.user.update.mockResolvedValue({ id: 'u1', streakDays: 4, longestStreak: 5, freezeHeld: 0 });

    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 7, 4, 12, 0, 0)));
    const result = await streaks.updateStreak('u1');
    jest.useRealTimers();

    expect(result.streakDays).toBe(4);
  });

  it('resets streak when a day is missed and no freeze exists', async () => {
    const twoDaysAgo = new Date(Date.UTC(2026, 7, 2, 12, 0, 0));
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', streakDays: 5, longestStreak: 5, lastActiveAt: twoDaysAgo, freezeHeld: 0, lastFreezeEarnedAt: null });
    mockPrisma.user.update.mockResolvedValue({ id: 'u1', streakDays: 1, longestStreak: 5, freezeHeld: 0 });

    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 7, 4, 12, 0, 0)));
    const result = await streaks.updateStreak('u1');
    jest.useRealTimers();

    expect(result.streakDays).toBe(1);
  });

  it('awards a freeze every 5 streak days', async () => {
    const yesterday = new Date(Date.UTC(2026, 7, 3, 12, 0, 0));
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', streakDays: 4, longestStreak: 4, lastActiveAt: yesterday, freezeHeld: 0, lastFreezeEarnedAt: null });
    mockPrisma.user.update.mockResolvedValue({ id: 'u1', streakDays: 5, longestStreak: 5, freezeHeld: 1 });

    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 7, 4, 12, 0, 0)));
    const result = await streaks.updateStreak('u1');
    jest.useRealTimers();

    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ freezeHeld: { increment: 1 }, lastFreezeEarnedAt: expect.any(Date) }),
    }));
    expect(result.freezeHeld).toBe(1);
  });
});

describe('processMissedStreaks', () => {
  it('consumes a freeze instead of resetting', async () => {
    const twoDaysAgo = new Date(Date.UTC(2026, 7, 2, 12, 0, 0));
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', streakDays: 10, freezeHeld: 1, lastActiveAt: twoDaysAgo }]);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 7, 4, 0, 30, 0)));
    const result = await streaks.processMissedStreaks();
    jest.useRealTimers();

    expect(result.protected).toBe(1);
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ freezeHeld: { decrement: 1 }, lastActiveAt: startOfDayUTC(new Date(Date.UTC(2026, 7, 3))) }),
    }));
  });

  it('resets when no freeze is held', async () => {
    const twoDaysAgo = new Date(Date.UTC(2026, 7, 2, 12, 0, 0));
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', streakDays: 10, freezeHeld: 0, lastActiveAt: twoDaysAgo }]);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 7, 4, 0, 30, 0)));
    const result = await streaks.processMissedStreaks();
    jest.useRealTimers();

    expect(result.reset).toBe(1);
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ streakDays: 0 }),
    }));
  });
});
