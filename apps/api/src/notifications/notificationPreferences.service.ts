import { prisma } from "../prisma.js";

export interface NotificationPreferencesDto {
  dailyLive: boolean;
  streakAtRisk: boolean;
  challengeReceived: boolean;
  scoreBeaten: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferencesDto = {
  dailyLive: true,
  streakAtRisk: true,
  challengeReceived: true,
  scoreBeaten: true,
};

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferencesDto> {
  const pref = await prisma.userNotificationPreference.findUnique({
    where: { userId },
  });
  if (!pref) return DEFAULT_PREFERENCES;
  return {
    dailyLive: pref.dailyLive,
    streakAtRisk: pref.streakAtRisk,
    challengeReceived: pref.challengeReceived,
    scoreBeaten: pref.scoreBeaten,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferencesDto>
): Promise<NotificationPreferencesDto> {
  const existing = await prisma.userNotificationPreference.findUnique({
    where: { userId },
  });

  const data = existing
    ? { ...updates, updatedAt: new Date() }
    : { ...DEFAULT_PREFERENCES, ...updates, userId, updatedAt: new Date() };

  const pref = await prisma.userNotificationPreference.upsert({
    where: { userId },
    create: { ...data, userId } as any,
    update: data,
  });

  return {
    dailyLive: pref.dailyLive,
    streakAtRisk: pref.streakAtRisk,
    challengeReceived: pref.challengeReceived,
    scoreBeaten: pref.scoreBeaten,
  };
}
