import bcrypt from "bcryptjs";
import { prisma } from "../src/client.js";

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  const demoPassword = await hashPassword("DemoPass123!");

  const demo = await prisma.user.upsert({
    where: { email: "demo@silentreview.app" },
    update: {},
    create: {
      email: "demo@silentreview.app",
      username: "demouser",
      displayName: "Demo User",
      passwordHash: demoPassword,
      emailVerified: true,
    },
  });

  const alicePassword = await hashPassword("AlicePass123!");
  const alice = await prisma.user.upsert({
    where: { email: "alice@silentreview.app" },
    update: {},
    create: {
      email: "alice@silentreview.app",
      username: "alice",
      displayName: "Alice",
      passwordHash: alicePassword,
      emailVerified: true,
    },
  });

  const bobPassword = await hashPassword("BobPass123!");
  const bob = await prisma.user.upsert({
    where: { email: "bob@silentreview.app" },
    update: {},
    create: {
      email: "bob@silentreview.app",
      username: "bob",
      displayName: "Bob",
      passwordHash: bobPassword,
      emailVerified: true,
    },
  });

  console.log(`Seeded users:`);
  console.log(`  - ${demo.email} / DemoPass123!`);
  console.log(`  - ${alice.email} / AlicePass123!`);
  console.log(`  - ${bob.email} / BobPass123!`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
