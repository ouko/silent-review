import { prisma } from "../../packages/database/src/client.js";

interface RunnerArgs {
  userId: string;
  streakDays?: number;
  freezeHeld?: number;
  lastActiveAt?: string;
  lastFreezeEarnedAt?: string;
}

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    throw new Error("No arguments provided to db-runner");
  }
  const args = JSON.parse(raw) as RunnerArgs;

  const data: Record<string, unknown> = {};
  if (typeof args.streakDays === "number") data.streakDays = args.streakDays;
  if (typeof args.freezeHeld === "number") data.freezeHeld = args.freezeHeld;
  if (args.lastActiveAt) data.lastActiveAt = new Date(args.lastActiveAt);
  if (args.lastFreezeEarnedAt) data.lastFreezeEarnedAt = new Date(args.lastFreezeEarnedAt);

  await prisma.user.update({
    where: { id: args.userId },
    data,
  });

  console.log(JSON.stringify({ ok: true }));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
