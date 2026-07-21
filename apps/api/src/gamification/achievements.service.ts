import { prisma } from "../prisma.js";

const DEFAULT_ACHIEVEMENTS = [
  { slug: "first_review", name: "First Review", description: "Published your first silent review", points: 10 },
  { slug: "first_guess", name: "First Guess", description: "Made your first rating guess", points: 5 },
  { slug: "streak_3", name: "On Fire", description: "Maintained a 3-day streak", points: 20 },
  { slug: "streak_7", name: "Week Warrior", description: "Maintained a 7-day streak", points: 50 },
  { slug: "points_100", name: "Century", description: "Earned 100 points", points: 25 },
  { slug: "points_1000", name: "Grand", description: "Earned 1,000 points", points: 100 },
  { slug: "exact_guess", name: "Bullseye", description: "Guessed the exact rating", points: 15 },
];

export async function ensureAchievements(): Promise<void> {
  for (const a of DEFAULT_ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      create: a,
      update: {},
    });
  }
}

export async function checkAchievements(userId: string): Promise<{ slug: string; name: string }[]> {
  await ensureAchievements();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalReviews: true,
      totalGuesses: true,
      totalPoints: true,
      streakDays: true,
    },
  });
  if (!user) throw new Error("User not found");

  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievement: { select: { slug: true } } },
  });
  const unlockedSlugs = new Set(unlocked.map((u) => u.achievement.slug));

  const toCheck: { slug: string; condition: boolean }[] = [
    { slug: "first_review", condition: user.totalReviews >= 1 },
    { slug: "first_guess", condition: user.totalGuesses >= 1 },
    { slug: "streak_3", condition: user.streakDays >= 3 },
    { slug: "streak_7", condition: user.streakDays >= 7 },
    { slug: "points_100", condition: user.totalPoints >= 100 },
    { slug: "points_1000", condition: user.totalPoints >= 1000 },
  ];

  const newlyUnlocked: { slug: string; name: string }[] = [];
  for (const item of toCheck) {
    if (item.condition && !unlockedSlugs.has(item.slug)) {
      const achievement = await prisma.achievement.findUnique({ where: { slug: item.slug } });
      if (achievement) {
        await prisma.userAchievement.create({
          data: { userId, achievementId: achievement.id },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { totalPoints: { increment: achievement.points } },
        });
        newlyUnlocked.push({ slug: achievement.slug, name: achievement.name });
      }
    }
  }

  return newlyUnlocked;
}
