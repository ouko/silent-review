import { prisma } from "../prisma.js";

export async function addPoints(userId: string, amount: number): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { totalPoints: { increment: amount } },
    select: { totalPoints: true },
  });
  return user.totalPoints;
}
