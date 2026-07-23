import { prisma } from "../prisma.js";

export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      oauthAccounts: true,
      reviews: {
        include: {
          guesses: true,
          likes: true,
          comments: true,
        },
      },
      guesses: true,
      comments: true,
      followers: true,
      following: true,
      achievements: {
        include: { achievement: true },
      },
      notifications: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user as Record<string, unknown> & {
    passwordHash: unknown;
  };

  return {
    exportedAt: new Date().toISOString(),
    user: safeUser,
  };
}
