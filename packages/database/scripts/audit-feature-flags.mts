import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REQUIRED_PHASE2_3_FLAGS = [
  "streak_freeze_ad_reward",
  "streak_freeze_purchase",
  "leagues",
  "rewarded_ads",
  "battle_pass",
];

async function main() {
  const flags = await prisma.featureFlag.findMany({
    where: { key: { in: REQUIRED_PHASE2_3_FLAGS } },
  });

  const found = new Map(flags.map((f) => [f.key, f]));
  const missing: string[] = [];
  const enabled: string[] = [];

  for (const key of REQUIRED_PHASE2_3_FLAGS) {
    const flag = found.get(key);
    if (!flag) {
      missing.push(key);
    } else if (flag.enabled) {
      enabled.push(key);
    }
  }

  if (missing.length > 0) {
    console.error("❌ Missing Phase 2/3 feature flags:", missing.join(", "));
  }
  if (enabled.length > 0) {
    console.error("❌ Phase 2/3 flags are enabled (must default OFF):", enabled.join(", "));
  }

  if (missing.length === 0 && enabled.length === 0) {
    console.log("✅ All Phase 2/3 feature flags exist and are disabled.");
    await prisma.$disconnect();
    process.exit(0);
  }

  await prisma.$disconnect();
  process.exit(1);
}

main().catch(async (err) => {
  console.error("Audit failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
